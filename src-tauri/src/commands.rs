use crate::model::{BackupInfo, Config, CssContent, CssFile, DiagnosticRow, Install, Module, Overview, Report, ThemeInfo};
use crate::{apply, backup, config, detect, paths, process, store, themes, util};
use std::path::PathBuf;

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
pub fn apply(install_id: String, force: bool) -> Report {
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
    if !force && process::running() {
        return Report::coded("spotify-running", "Close Spotify before applying.");
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
pub fn restore(install_id: String, force: bool) -> Report {
    let Some(install) = find_install(&install_id) else {
        return Report::coded("not-found", "Spotify install not found.");
    };
    if !force && process::running() {
        return Report::coded("spotify-running", "Close Spotify before restoring.");
    }

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
pub fn remove_module(id: String, confirm: bool) -> Report {
    if !confirm {
        return Report::coded("confirm-required", "Confirmation required.");
    }
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

/* ---------- User CSS ---------- */

/// Resolves "user" to user.css and any other id to snippets/<id>.css.
fn css_path(id: &str) -> Option<PathBuf> {
    if id == "user" {
        return Some(paths::custom_css());
    }
    if id.is_empty() || id.contains("..") {
        return None;
    }
    let safe = id
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_');
    if !safe {
        return None;
    }
    Some(paths::user_snippets().join(format!("{}.css", id)))
}

fn css_size(path: &std::path::Path) -> usize {
    std::fs::metadata(path)
        .map(|meta| meta.len() as usize)
        .unwrap_or(0)
}

#[tauri::command(async)]
pub fn list_css_files() -> Vec<CssFile> {
    let config = config::load();
    let mut files = vec![CssFile {
        id: "user".into(),
        kind: "user".into(),
        size: css_size(&paths::custom_css()),
        enabled: true,
    }];

    if let Ok(entries) = std::fs::read_dir(paths::user_snippets()) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.to_lowercase().ends_with(".css") || name.len() <= 4 {
                continue;
            }
            let id = name[..name.len() - 4].to_string();
            let usable = !id.is_empty()
                && id
                    .chars()
                    .all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_');
            if !usable {
                continue;
            }
            let enabled = config.snippets.iter().any(|value| value == &id);
            files.push(CssFile {
                id,
                kind: "snippet".into(),
                size: css_size(&entry.path()),
                enabled,
            });
        }
    }

    files.sort_by(|left, right| left.id.cmp(&right.id));
    files
}

#[tauri::command(async)]
pub fn read_css_file(id: String) -> CssContent {
    let Some(path) = css_path(&id) else {
        return CssContent {
            ok: false,
            content: String::new(),
            message: "Invalid file name.".into(),
        };
    };

    CssContent {
        ok: true,
        content: std::fs::read_to_string(&path).unwrap_or_default(),
        message: String::new(),
    }
}

#[tauri::command(async)]
pub fn save_css_file(id: String, content: String) -> Report {
    let Some(path) = css_path(&id) else {
        return Report::coded("bad-name", "Invalid file name.");
    };

    if let Some(parent) = path.parent() {
        if let Err(error) = std::fs::create_dir_all(parent) {
            return Report::error(error.to_string());
        }
    }

    match util::write_atomic(&path, content.as_bytes()) {
        Ok(()) => Report::ok(""),
        Err(error) => Report::error(error),
    }
}

#[tauri::command(async)]
pub fn delete_css_file(id: String, confirm: bool) -> Report {
    if !confirm {
        return Report::coded("confirm-required", "Confirmation required.");
    }
    if id == "user" {
        return Report::coded("protected", "The main user.css cannot be deleted.");
    }
    let Some(path) = css_path(&id) else {
        return Report::coded("bad-name", "Invalid file name.");
    };

    if let Err(error) = std::fs::remove_file(&path) {
        if error.kind() != std::io::ErrorKind::NotFound {
            return Report::error(error.to_string());
        }
    }

    let mut config = config::load();
    config.snippets.retain(|value| value != &id);
    save_report(crate::config::save(&config))
}

#[tauri::command(async)]
pub fn set_snippet_enabled(id: String, enabled: bool) -> Report {
    let mut config = config::load();
    if enabled {
        if !config.snippets.iter().any(|value| value == &id) {
            config.snippets.push(id);
        }
    } else {
        config.snippets.retain(|value| value != &id);
    }
    save_report(crate::config::save(&config))
}

#[tauri::command(async)]
pub fn import_spicetify_theme(path: String) -> Report {
    let mut config = config::load();
    match themes::import_spicetify(&path, &mut config) {
        Ok(id) => match crate::config::save(&config) {
            Ok(()) => Report::ok(id),
            Err(error) => Report::error(error),
        },
        Err(error) => Report::error(error),
    }
}

/* ---------- Backups ---------- */

#[tauri::command(async)]
pub fn list_backups(install_id: String) -> Vec<BackupInfo> {
    match find_install(&install_id) {
        Some(install) => backup::list_backups(&install),
        None => Vec::new(),
    }
}

#[tauri::command(async)]
pub fn delete_backup(install_id: String, version: String) -> Report {
    let Some(install) = find_install(&install_id) else {
        return Report::coded("not-found", "Spotify install not found.");
    };
    match backup::delete_backup(&install, &version) {
        Ok(()) => Report::ok(""),
        Err(error) => Report::error(error),
    }
}

#[tauri::command(async)]
pub fn restore_backup(install_id: String, version: String, force: bool) -> Report {
    let Some(install) = find_install(&install_id) else {
        return Report::coded("not-found", "Spotify install not found.");
    };
    if !force && process::running() {
        return Report::coded("spotify-running", "Close Spotify before restoring.");
    }
    match backup::restore_version(&install, &version) {
        Ok(true) => {
            apply::remove_payload(&install);
            let _ = apply::unpatch_html(&install);
            Report::ok("")
        }
        Ok(false) => Report::coded("no-backup", "Backup not found."),
        Err(error) => Report::error(error),
    }
}
