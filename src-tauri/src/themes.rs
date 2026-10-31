use crate::model::{Config, ThemeInfo};
use crate::{paths, util};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

/// Lists every theme folder carrying a user.css or theme.css. The user folder
/// is scanned first so a downloaded theme wins over the bundled one.
pub fn list(config: &Config) -> Vec<ThemeInfo> {
    let mut found: BTreeMap<String, ThemeInfo> = BTreeMap::new();

    for (dir, bundled) in [
        (paths::user_themes(), false),
        (paths::bundled_themes(), true),
    ] {
        let entries = match fs::read_dir(&dir) {
            Ok(value) => value,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let is_dir = entry
                .file_type()
                .map(|kind| kind.is_dir())
                .unwrap_or(false);
            if !is_dir {
                continue;
            }

            let id = entry.file_name().to_string_lossy().to_string();
            if found.contains_key(&id) {
                continue;
            }
            if !has_css(&dir.join(&id)) {
                continue;
            }

            let active = id == config.theme;
            found.insert(
                id.clone(),
                ThemeInfo {
                    id,
                    bundled,
                    active,
                },
            );
        }
    }

    let mut list: Vec<ThemeInfo> = found.into_values().collect();
    list.sort_by(|left, right| {
        left.id
            .to_lowercase()
            .cmp(&right.id.to_lowercase())
            .then_with(|| left.id.cmp(&right.id))
    });
    list
}

fn has_css(folder: &Path) -> bool {
    util::is_file(&folder.join("user.css")) || util::is_file(&folder.join("theme.css"))
}

/// Imports a Spicetify theme folder: copies its user.css and maps the Base
/// colour scheme of color.ini onto the six app colours.
pub fn import_spicetify(folder: &str, config: &mut Config) -> Result<String, String> {
    let source = Path::new(folder);
    if !util::is_dir(source) {
        return Err("That folder does not exist.".into());
    }

    let css_source = ["user.css", "theme.css"]
        .iter()
        .map(|name| source.join(name))
        .find(|path| util::is_file(path));

    let ini = source.join("color.ini");
    let mut palette = BTreeMap::new();
    if let Some(text) = util::read_optional(&ini) {
        palette = parse_color_ini(&text);
    }

    if css_source.is_none() && palette.is_empty() {
        return Err("No color.ini or user.css found in that folder.".into());
    }

    let id = theme_id(source);
    let target = paths::user_themes().join(&id);
    fs::create_dir_all(&target)
        .map_err(|error| format!("Could not create {}: {}", target.display(), error))?;

    if let Some(css) = css_source {
        let data = fs::read(&css)
            .map_err(|error| format!("Could not read {}: {}", css.display(), error))?;
        util::write_atomic(&target.join("user.css"), &data)?;
    }

    for (key, value) in palette {
        config.colors.insert(key, value);
    }
    config.theme = id.clone();
    Ok(id)
}

fn theme_id(source: &Path) -> String {
    let raw = source
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    let cleaned: String = raw
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-' || *character == '_')
        .collect();
    if cleaned.is_empty() {
        "spicetify-theme".to_string()
    } else {
        cleaned
    }
}

/// Reads the first scheme (preferring "Base") of a Spicetify color.ini.
fn parse_color_ini(text: &str) -> BTreeMap<String, String> {
    let mut sections: Vec<(String, BTreeMap<String, String>)> = Vec::new();
    let mut current: Option<(String, BTreeMap<String, String>)> = None;

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            if let Some(section) = current.take() {
                sections.push(section);
            }
            let name = line[1..line.len() - 1].trim().to_lowercase();
            current = Some((name, BTreeMap::new()));
            continue;
        }
        if let Some((_, values)) = current.as_mut() {
            if let Some((key, value)) = line.split_once('=') {
                values.insert(key.trim().to_lowercase(), value.trim().to_string());
            }
        }
    }
    if let Some(section) = current.take() {
        sections.push(section);
    }

    let chosen = sections
        .iter()
        .find(|(name, _)| name == "base")
        .or_else(|| sections.first());

    let mut palette = BTreeMap::new();
    if let Some((_, values)) = chosen {
        let mut pick = |target: &str, keys: &[&str]| {
            for key in keys {
                if let Some(value) = values.get(*key).and_then(|raw| util::normalize_hex(raw)) {
                    palette.insert(target.to_string(), value);
                    return;
                }
            }
        };
        pick("text", &["text"]);
        pick("subtext", &["subtext"]);
        pick("background", &["main"]);
        pick("sidebar", &["sidebar"]);
        pick("card", &["card"]);
        pick("accent", &["button", "button-active"]);
    }
    palette
}
