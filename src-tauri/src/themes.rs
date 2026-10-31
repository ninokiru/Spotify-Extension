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
