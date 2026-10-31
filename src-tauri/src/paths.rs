use std::path::{Path, PathBuf};

pub const SXE_DIR: &str = "sxe";
pub const MARKER_START: &str = "<!-- sxe:start -->";
pub const MARKER_END: &str = "<!-- sxe:end -->";
pub const BACKUP_MANIFEST: &str = "manifest.json";
/// Marker written into Apps/xpui after extracting a packed client. It records
/// which Spotify version the folder came from.
pub const SPA_MARKER: &str = ".sxe-spa";
pub const REPO_URL: &str = "https://github.com/ninokiru/Spotify-Extension";

fn env_path(name: &str) -> Option<PathBuf> {
    std::env::var_os(name)
        .map(PathBuf::from)
        .filter(|path| !path.as_os_str().is_empty())
}

/// Data folder shared with the previous releases (%APPDATA%\spotify-extension).
pub fn data_dir() -> PathBuf {
    if let Some(appdata) = env_path("APPDATA") {
        return appdata.join("spotify-extension");
    }
    if let Some(profile) = env_path("USERPROFILE") {
        return profile.join("AppData").join("Roaming").join("spotify-extension");
    }
    PathBuf::from("spotify-extension")
}

pub fn config_file() -> PathBuf {
    data_dir().join("config.ini")
}

pub fn custom_css() -> PathBuf {
    data_dir().join("user.css")
}

pub fn backups_dir() -> PathBuf {
    data_dir().join("backups")
}

pub fn user_extensions() -> PathBuf {
    data_dir().join("extensions")
}

pub fn user_themes() -> PathBuf {
    data_dir().join("themes")
}

pub fn user_snippets() -> PathBuf {
    data_dir().join("snippets")
}

/// The folder holding the app; bundled assets live next to it.
pub fn exe_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."))
}

pub fn bundled_extensions() -> PathBuf {
    exe_dir().join("extensions")
}

pub fn bundled_themes() -> PathBuf {
    exe_dir().join("themes")
}

pub fn bundled_snippets() -> PathBuf {
    exe_dir().join("snippets")
}

pub fn runtime_file() -> PathBuf {
    exe_dir().join("runtime").join("runtime.js")
}
