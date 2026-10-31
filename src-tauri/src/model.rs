use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub language: String,
    pub spotify_path: String,
    pub theme: String,
    pub check_update: bool,
    pub safe_mode: bool,
    pub extensions: Vec<String>,
    pub snippets: Vec<String>,
    pub colors: BTreeMap<String, String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Install {
    pub id: String,
    pub name: String,
    pub root: String,
    pub xpui_path: String,
    pub variant: String,
    pub version: String,
    pub arch: String,
    pub state: String,
    pub patched_by: String,
    /// True when the client ships as a packed Apps/xpui.spa archive.
    pub spa: bool,
    pub has_backup: bool,
    pub backup_at: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub enabled: bool,
    pub bundled: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeInfo {
    pub id: String,
    pub bundled: bool,
    pub active: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleFile {
    pub name: String,
    pub url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Module {
    pub id: String,
    pub name: String,
    pub author: String,
    pub description: String,
    pub description_vi: String,
    pub version: String,
    pub kind: String,
    pub glyph: String,
    pub accent: Vec<String>,
    pub files: Vec<ModuleFile>,
    pub bundled: bool,
    pub installed: bool,
    pub enabled: bool,
    pub update_available: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticRow {
    pub label: String,
    pub value: String,
    pub ok: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CssFile {
    pub id: String,
    /// "user" for the main user.css, "snippet" for a file the user created.
    pub kind: String,
    pub size: usize,
    pub enabled: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CssContent {
    pub ok: bool,
    pub content: String,
    pub message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub version: String,
    pub data_dir: String,
    pub config: Config,
    pub installs: Vec<Install>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub ok: bool,
    pub code: String,
    pub message: String,
}

impl Report {
    pub fn ok(message: impl Into<String>) -> Self {
        Self { ok: true, code: "ok".into(), message: message.into() }
    }

    pub fn coded(code: &str, message: impl Into<String>) -> Self {
        Self { ok: false, code: code.into(), message: message.into() }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self { ok: false, code: "error".into(), message: message.into() }
    }
}
