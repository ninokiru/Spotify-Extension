use crate::model::{Config, DiagnosticRow, Install, Module, Overview, Report, ThemeInfo};
use crate::{apply, backup, config, detect, paths, process, store, themes, util};

fn extra_roots(config: &Config) -> Vec<String> {
    if config.spotify_path.is_empty() {
        Vec::new()
    } else {
        vec![config.spotify_path.clone()]
    }
}

fn find_install(install_id: &str) -> Option<Install> {
    let config = config::load();
    detect::find(&detect::all(&extra_roots(&config)), install_id)
}

fn save_report(result: Result<(), String>) -> Report {
    match result {
        Ok(()) => Report::ok(""),
        Err(error) => Report::error(error),
    }
}

#[tauri::command(async)]
pub fn get_overview() -> Overview {
    let config = config::load();
    let installs = detect::all(&extra_roots(&config));
    Overview {
        version: env!("CARGO_PKG_VERSION").to_string(),
        data_dir: paths::data_dir().to_string_lossy().to_string(),
        config,
        installs,
    }
}

#[tauri::command(async)]
pub fn apply(install_id: String) -> Report {
    let Some(install) = find_install(&install_id) else {
        return Report::coded("not-found", "Spotify install not found.");
    };

    if install.state == "unsupported" {
        return Report::coded("unsupported", "This Spotify build ships xpui.spa.");
    }
    if install.state == "foreign" {
        return Report::coded("foreign", "The client is patched by another tool.");
    }
    if !util::is_file(&paths::runtime_file()) {
        return Report::coded("no-asset", "runtime/runtime.js is missing next to the app.");
    }

    let config = config::load();
    let result = backup::ensure(&install)
        .and_then(|_| apply::write_payload(&install, &config, env!("CARGO_PKG_VERSION")))
        .and_then(|_| apply::patch_html(&install));

    match result {
        Ok(()) => Report::ok(""),
        Err(error) => Report::error(error),
    }
}

#[tauri::command(async)]
pub fn restore(install_id: String) -> Report {
    let Some(install) = find_install(&install_id) else {
        return Report::coded("not-found", "Spotify install not found.");
    };

    match backup::restore(&install) {
        Ok(found) => {
            apply::remove_payload(&install);
            let _ = apply::unpatch_html(&install);
            if found {
                Report::ok("")
            } else {
                Report::coded("no-backup", "No backup for this Spotify version.")
            }
        }
        Err(error) => Report::error(error),
    }
}

#[tauri::command(async)]
pub fn backup(install_id: String) -> Report {
    let Some(install) = find_install(&install_id) else {
        return Report::coded("not-found", "Spotify install not found.");
    };

    match backup::ensure(&install) {
        Ok(manifest) => Report::ok(manifest.files.to_string()),
        Err(error) => Report::error(error),
    }
}

#[tauri::command(async)]
pub fn restart(install_id: String) -> Report {
    let Some(install) = find_install(&install_id) else {
        return Report::coded("not-found", "Spotify install not found.");
    };

    if process::restart(&install.root) {
        Report::ok("")
    } else {
        Report::coded("restart-failed", "Could not restart Spotify.")
    }
}

#[tauri::command(async)]
pub fn open_folder(path: String) -> Report {
    if process::open_folder(&path) {
        Report::ok("")
    } else {
        Report::coded("open-failed", "Could not open the folder.")
    }
}

#[tauri::command(async)]
pub fn list_themes() -> Vec<ThemeInfo> {
    themes::list(&config::load())
}

#[tauri::command(async)]
pub fn set_theme(id: String) -> Report {
    let mut config = config::load();
    config.theme = if id == "default" || id == "none" {
        String::new()
    } else {
        id
    };
    save_report(crate::config::save(&config))
}

#[tauri::command(async)]
pub fn set_extension(id: String, enabled: bool) -> Report {
    let mut config = config::load();
    if enabled {
        if !config.extensions.iter().any(|value| value == &id) {
            config.extensions.push(id);
        }
    } else {
        config.extensions.retain(|value| value != &id);
    }
    save_report(crate::config::save(&config))
}

#[tauri::command(async)]
pub fn list_modules() -> Vec<Module> {
    store::list(&config::load())
}

#[tauri::command(async)]
pub fn install_module(id: String) -> Report {
    let mut config = config::load();
    if let Err(error) = store::install(&id, &mut config) {
        return Report::error(error);
    }
    save_report(crate::config::save(&config))
}

#[tauri::command(async)]
pub fn remove_module(id: String) -> Report {
    let mut config = config::load();
    if let Err(error) = store::remove(&id, &mut config) {
        return Report::error(error);
    }
    save_report(crate::config::save(&config))
}

/// Saves the whole config object the UI edited.
#[tauri::command(async)]
pub fn save_config(config: Config) -> Report {
    save_report(crate::config::save(&config))
}

#[tauri::command(async)]
pub fn doctor(install_id: String) -> Vec<DiagnosticRow> {
    let config = config::load();
    let mut rows = Vec::new();

    match find_install(&install_id) {
        Some(install) => {
            rows.push(DiagnosticRow {
                label: "install".into(),
                value: format!("{} · {}", install.version, install.state),
                ok: install.state != "unsupported",
            });
            rows.push(DiagnosticRow {
                label: "backup".into(),
                value: if install.has_backup {
                    install.backup_at.clone()
                } else {
                    "none".into()
                },
                ok: install.has_backup,
            });
            rows.push(DiagnosticRow {
                label: "spotify".into(),
                value: if process::running() {
                    "running".into()
                } else {
                    "closed".into()
                },
                ok: true,
            });
        }
        None => rows.push(DiagnosticRow {
            label: "install".into(),
            value: "missing".into(),
            ok: false,
        }),
    }

    rows.push(DiagnosticRow {
        label: "config".into(),
        value: paths::config_file().to_string_lossy().to_string(),
        ok: util::is_file(&paths::config_file()),
    });
    rows.push(DiagnosticRow {
        label: "runtime".into(),
        value: paths::runtime_file().to_string_lossy().to_string(),
        ok: util::is_file(&paths::runtime_file()),
    });
    rows.push(DiagnosticRow {
        label: "extensions".into(),
        value: apply::list_extensions().len().to_string(),
        ok: true,
    });
    rows.push(DiagnosticRow {
        label: "themes".into(),
        value: themes::list(&config).len().to_string(),
        ok: true,
    });
    rows.push(DiagnosticRow {
        label: "language".into(),
        value: config.language.clone(),
        ok: true,
    });

    rows
}
