use crate::model::Config;
use crate::{paths, util};
use std::collections::BTreeMap;
use std::fs;

pub const COLOR_KEYS: [&str; 6] = ["accent", "background", "sidebar", "card", "text", "subtext"];

fn default_color(key: &str) -> &'static str {
    match key {
        "accent" => "#1ed760",
        "background" => "#121212",
        "sidebar" => "#000000",
        "card" => "#1f1f1f",
        "text" => "#ffffff",
        "subtext" => "#b3b3b3",
        _ => "",
    }
}

pub fn default_colors() -> BTreeMap<String, String> {
    let mut colors = BTreeMap::new();
    for key in COLOR_KEYS {
        colors.insert(key.to_string(), default_color(key).to_string());
    }
    colors
}

impl Config {
    pub fn defaults() -> Config {
        Config {
            language: "vi".to_string(),
            spotify_path: String::new(),
            theme: String::new(),
            check_update: true,
            safe_mode: false,
            extensions: Vec::new(),
            snippets: Vec::new(),
            colors: default_colors(),
        }
    }
}

/// Reads config.ini the same way the Go build does. A missing or unreadable
/// file falls back to the defaults; there is no legacy settings.json import
/// because serde_json is not a dependency of this crate.
pub fn load() -> Config {
    let mut config = Config::defaults();

    let raw = match fs::read_to_string(paths::config_file()) {
        Ok(value) => value,
        Err(_) => return config,
    };

    let mut section = String::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }
        if let Some(name) = line
            .strip_prefix('[')
            .and_then(|value| value.strip_suffix(']'))
        {
            section = name.trim().to_string();
            continue;
        }
        let (key, value) = match line.split_once('=') {
            Some(pair) => pair,
            None => continue,
        };
        let key = key.trim();
        let value = value.trim();

        match (section.as_str(), key) {
            ("Setting", "language") => {
                if value == "en" || value == "vi" {
                    config.language = value.to_string();
                }
            }
            ("Setting", "spotify_path") => config.spotify_path = value.to_string(),
            ("Setting", "theme") => config.theme = value.to_string(),
            ("Setting", "check_update") => config.check_update = value != "0",
            ("Feature", "safe_mode") => {
                config.safe_mode = value == "1" || value.eq_ignore_ascii_case("true")
            }
            ("AdditionalOptions", "extensions") => config.extensions = split_list(value),
            ("AdditionalOptions", "snippets") => config.snippets = split_list(value),
            ("Colors", name) if COLOR_KEYS.contains(&name) => {
                config
                    .colors
                    .insert(name.to_string(), util::normalize_hex(value).unwrap_or_default());
            }
            _ => {}
        }
    }

    config
}

fn split_list(value: &str) -> Vec<String> {
    value
        .split(|character: char| matches!(character, '|' | ',' | ';' | ' ' | '\t'))
        .filter(|part| !part.is_empty())
        .map(|part| part.to_string())
        .collect()
}

/// Writes config.ini with the section order of the Go build, so the same file
/// can be read by both versions.
pub fn save(config: &Config) -> Result<(), String> {
    let mut lines: Vec<String> = vec![
        "[Setting]".to_string(),
        format!("language = {}", config.language),
        format!("spotify_path = {}", config.spotify_path),
        format!("theme = {}", config.theme),
        format!("check_update = {}", flag(config.check_update)),
        String::new(),
        "[AdditionalOptions]".to_string(),
        format!("extensions = {}", config.extensions.join(" | ")),
        format!("snippets = {}", config.snippets.join(" | ")),
        String::new(),
        "[Colors]".to_string(),
    ];

    for key in COLOR_KEYS {
        let value = match config.colors.get(key) {
            Some(value) if !value.is_empty() => value.clone(),
            _ => default_color(key).to_string(),
        };
        lines.push(format!("{} = {}", key, value));
    }

    lines.push(String::new());
    lines.push("[Feature]".to_string());
    lines.push(format!("safe_mode = {}", flag(config.safe_mode)));
    lines.push(String::new());

    let path = paths::config_file();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    util::write_atomic(&path, lines.join("\n").as_bytes())
}

fn flag(value: bool) -> &'static str {
    if value {
        "1"
    } else {
        "0"
    }
}

/// Returns one colour, normalised to #rrggbb, falling back to the default for
/// that key when it is missing or invalid.
pub fn color(config: &Config, key: &str) -> String {
    if let Some(value) = config.colors.get(key) {
        if let Some(hex) = util::normalize_hex(value) {
            return hex;
        }
    }
    default_color(key).to_string()
}

/// Renders colors.css exactly like internal/config/config.go::BuildColorsCss.
pub fn build_colors_css(config: &Config) -> String {
    let accent = color(config, "accent");
    let background = color(config, "background");
    let sidebar = color(config, "sidebar");
    let card = color(config, "card");
    let text = color(config, "text");
    let subtext = color(config, "subtext");

    let (tr, tg, tb) = util::hex_to_rgb(&text);
    let (br, bg, bb) = util::hex_to_rgb(&background);

    let lines = vec![
        "  color-scheme: dark;".to_string(),
        String::new(),
        format!("  --background-base: {};", background),
        format!("  --background-elevated-base: {};", sidebar),
        format!(
            "  --background-elevated-highlight: {};",
            util::mix(&sidebar, &text, 0.08)
        ),
        format!(
            "  --background-elevated-press: {};",
            util::mix(&sidebar, "#000000", 0.2)
        ),
        format!("  --background-highlight: {};", card),
        format!(
            "  --background-press: {};",
            util::mix(&background, "#000000", 0.25)
        ),
        format!(
            "  --background-tinted-base: rgba({}, {}, {}, 0.07);",
            tr, tg, tb
        ),
        format!(
            "  --background-tinted-highlight: rgba({}, {}, {}, 0.12);",
            tr, tg, tb
        ),
        format!(
            "  --background-tinted-press: rgba({}, {}, {}, 0.04);",
            tr, tg, tb
        ),
        String::new(),
        format!("  --text-base: {};", text),
        format!("  --text-subdued: {};", subtext),
        format!("  --text-bright-accent: {};", accent),
        String::new(),
        format!("  --essential-base: {};", text),
        format!("  --essential-subdued: {};", subtext),
        format!("  --essential-bright-accent: {};", accent),
        format!("  --decorative-base: {};", text),
        format!(
            "  --decorative-subdued: {};",
            util::mix(&text, &background, 0.5)
        ),
        String::new(),
        "  /* Spicetify-compatible aliases, so existing colour schemes still apply */".to_string(),
        format!("  --spice-text: {};", text),
        format!("  --spice-subtext: {};", subtext),
        format!("  --spice-main: {};", background),
        format!("  --spice-sidebar: {};", sidebar),
        format!("  --spice-player: {};", background),
        format!("  --spice-card: {};", card),
        format!("  --spice-button: {};", accent),
        format!("  --spice-button-active: {};", accent),
        format!("  --spice-button-disabled: {};", subtext),
        format!("  --spice-tab-active: {};", card),
        format!("  --spice-rgb-text: {}, {}, {};", tr, tg, tb),
        format!("  --spice-rgb-main: {}, {}, {};", br, bg, bb),
        format!("  --spice-rgb-selected-row: {}, {}, {};", tr, tg, tb),
        "  --spice-rgb-shadow: 0, 0, 0;".to_string(),
    ];

    format!(":root {{\n{}\n}}\n", lines.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_complete() {
        let config = Config::defaults();
        assert_eq!(config.language, "vi");
        assert_eq!(config.spotify_path, "");
        assert_eq!(config.theme, "");
        assert!(config.check_update);
        assert!(!config.safe_mode);
        assert!(config.extensions.is_empty());
        assert!(config.snippets.is_empty());
        assert_eq!(config.colors.len(), COLOR_KEYS.len());
        assert_eq!(color(&config, "accent"), "#1ed760");
        assert_eq!(color(&config, "background"), "#121212");
        assert_eq!(color(&config, "sidebar"), "#000000");
        assert_eq!(color(&config, "card"), "#1f1f1f");
        assert_eq!(color(&config, "text"), "#ffffff");
        assert_eq!(color(&config, "subtext"), "#b3b3b3");
    }

    #[test]
    fn builds_the_colours_stylesheet() {
        let css = build_colors_css(&Config::defaults());
        // The Go build exposes the accent through --text-bright-accent (there
        // is no bare --accent variable), so that is the token checked here.
        assert!(css.contains("--text-bright-accent: #1ed760;"));
        assert!(css.contains("--spice-button: #1ed760;"));
        assert!(css.contains("--spice-rgb-main: 18, 18, 18;"));
        assert!(css.contains("--background-press: #0d0d0d;"));
    }

    #[test]
    fn normalises_explicit_colours() {
        let mut config = Config::defaults();
        config.colors.insert("accent".to_string(), "ABC".to_string());
        assert_eq!(color(&config, "accent"), "#aabbcc");
        config
            .colors
            .insert("accent".to_string(), "not-a-colour".to_string());
        assert_eq!(color(&config, "accent"), "#1ed760");
    }
}
