#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod apply;
mod backup;
mod commands;
mod config;
mod detect;
mod model;
mod paths;
mod process;
mod store;
mod themes;
mod util;

fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let directory = paths::data_dir();
        let _ = std::fs::create_dir_all(&directory);
        let _ = std::fs::write(directory.join("panic.log"), format!("{}\n", info));
    }));
}

fn main() {
    install_panic_hook();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_overview,
            commands::apply,
            commands::restore,
            commands::backup,
            commands::restart,
            commands::open_folder,
            commands::list_themes,
            commands::set_theme,
            commands::set_extension,
            commands::list_modules,
            commands::install_module,
            commands::remove_module,
            commands::save_config,
            commands::doctor,
            commands::list_css_files,
            commands::read_css_file,
            commands::save_css_file,
            commands::delete_css_file,
            commands::set_snippet_enabled,
            commands::import_spicetify_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Spotify Extension");
}
