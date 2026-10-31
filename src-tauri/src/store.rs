use crate::model::{Config, Module, ModuleFile};
use crate::paths;
use crate::util;
use std::path::{Path, PathBuf};

struct Seed {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    description_vi: &'static str,
    version: &'static str,
    kind: &'static str,
    glyph: &'static str,
    accent: [&'static str; 2],
    file: &'static str,
}

const EXTENSION: &str = "extension";
const THEME: &str = "theme";
const SNIPPET: &str = "snippet";

static SEEDS: &[Seed] = &[
    Seed { id: "adblock", name: "Adblock", description: "Removes ad slots and upgrade banners from the client.", description_vi: "Ẩn quảng cáo và các bảng nâng cấp trong giao diện Spotify.", version: "1.0.0", kind: EXTENSION, glyph: "shield", accent: ["#123a24", "#0d1f16"], file: "adblock.js" },
    Seed { id: "auto-skip-explicit", name: "Auto skip explicit", description: "Skips tracks marked explicit while playing.", description_vi: "Tự nhảy qua các bài hát có nhãn explicit khi đang phát.", version: "1.0.0", kind: EXTENSION, glyph: "skip", accent: ["#3a2a12", "#1f160a"], file: "auto-skip-explicit.js" },
    Seed { id: "quick-keys", name: "Quick keys", description: "Alt+←/→ seek 10s, Alt+↑/↓ volume, Alt+M mute.", description_vi: "Alt+←/→ tua 10 giây, Alt+↑/↓ chỉnh âm lượng, Alt+M tắt tiếng.", version: "1.0.0", kind: EXTENSION, glyph: "keys", accent: ["#123040", "#0d1a22"], file: "quick-keys.js" },
    Seed { id: "track-copy", name: "Track copy", description: "Alt+C copies the current track as Song — Artist.", description_vi: "Alt+C chép tên bài hiện tại theo dạng Tên bài — Ca sĩ.", version: "1.1.0", kind: EXTENSION, glyph: "copy", accent: ["#2c2440", "#161222"], file: "track-copy.js" },
    Seed { id: "volume-memory", name: "Volume memory", description: "Restores the last volume level when Spotify starts.", description_vi: "Khôi phục mức âm lượng cũ mỗi khi mở Spotify.", version: "1.0.0", kind: EXTENSION, glyph: "wave", accent: ["#123040", "#0d1a22"], file: "volume-memory.js" },
    Seed { id: "skip-short-tracks", name: "Skip short tracks", description: "Skips tracks shorter than 45 seconds while they are playing.", description_vi: "Tự nhảy qua các bài ngắn hơn 45 giây khi đang phát.", version: "1.0.0", kind: EXTENSION, glyph: "skip", accent: ["#3a2a12", "#1f160a"], file: "skip-short-tracks.js" },
    Seed { id: "playback-speed", name: "Playback speed", description: "Switches the playback speed with Alt+1.", description_vi: "Đổi tốc độ phát bằng Alt+1.", version: "1.0.0", kind: EXTENSION, glyph: "wave", accent: ["#20242b", "#12151a"], file: "playback-speed.js" },
    Seed { id: "like-hotkey", name: "Like hotkey", description: "Presses the like button of the current track with Alt+L.", description_vi: "Bấm nút thích của bài đang phát bằng Alt+L.", version: "1.0.0", kind: EXTENSION, glyph: "sparkle", accent: ["#2c2440", "#161222"], file: "like-hotkey.js" },
    Seed { id: "hide-sidebar", name: "Hide sidebar", description: "Hides the left sidebar of the client with Alt+B.", description_vi: "Ẩn thanh bên trái bằng Alt+B.", version: "1.0.0", kind: EXTENSION, glyph: "window", accent: ["#20242b", "#12151a"], file: "hide-sidebar.js" },
    Seed { id: "focus-mode", name: "Focus mode", description: "Dims the sidebar and main view so the player stands out.", description_vi: "Làm mờ sidebar và nội dung để nổi bật thanh phát.", version: "1.0.0", kind: EXTENSION, glyph: "sparkle", accent: ["#123040", "#0d1a22"], file: "focus-mode.js" },
    Seed { id: "volume-wheel", name: "Volume wheel", description: "Changes the volume by five percent when the wheel turns over the player bar.", description_vi: "Lăn chuột trên thanh phát để đổi âm lượng 5%.", version: "1.0.0", kind: EXTENSION, glyph: "wave", accent: ["#3a2f18", "#1b1710"], file: "volume-wheel.js" },
    Seed { id: "Soft", name: "Soft", description: "Digital clock, larger play button, rounded progress bar.", description_vi: "Đồng hồ dạng số, nút phát to hơn, thanh tiến trình bo tròn.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#3a2f18", "#1b1710"], file: "user.css" },
    Seed { id: "Nord", name: "Nord", description: "Cool arctic blues with soft grey surfaces.", description_vi: "Xanh Bắc cực dịu mắt, nền xám nhạt.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#2e3440", "#1c212b"], file: "user.css" },
    Seed { id: "Dracula", name: "Dracula", description: "Purple and pink on a dark violet base.", description_vi: "Tím hồng trên nền tím than.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#282a36", "#1a1b26"], file: "user.css" },
    Seed { id: "Amoled", name: "Amoled", description: "True black surfaces for OLED screens.", description_vi: "Nền đen tuyệt đối cho màn hình OLED.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#000000", "#0b0b0b"], file: "user.css" },
    Seed { id: "Catppuccin", name: "Catppuccin", description: "Pastel lavender and blue Mocha palette.", description_vi: "Bảng màu Mocha pastel tím xanh.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#1e1e2e", "#141420"], file: "user.css" },
    Seed { id: "Gruvbox", name: "Gruvbox", description: "Warm retro earth tones with amber accents.", description_vi: "Tông đất ấm retro với điểm nhấn hổ phách.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#282828", "#1d2021"], file: "user.css" },
    Seed { id: "TokyoNight", name: "Tokyo Night", description: "Deep blue night with a bright blue accent.", description_vi: "Màu đêm xanh sâu với điểm nhấn xanh sáng.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#1a1b26", "#12131c"], file: "user.css" },
    Seed { id: "RosePine", name: "Rosé Pine", description: "Soft rose and lilac on a pine background.", description_vi: "Hồng dây và tím nhạt trên nền xanh thông.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#191724", "#12101c"], file: "user.css" },
    Seed { id: "Solarized", name: "Solarized", description: "Low contrast teal and sand, easy on the eyes.", description_vi: "Xanh lam và cát tương phản thấp, dịu mắt.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#002b36", "#073642"], file: "user.css" },
    Seed { id: "Aurora", name: "Aurora", description: "Deep night blue with a mint accent, floating panels and lifted cards.", description_vi: "Xanh đêm sâu, accent mint, panel nổi bo góc và card nhấc nhẹ khi hover.", version: "1.0.0", kind: THEME, glyph: "palette", accent: ["#0b0f14", "#58e1a8"], file: "user.css" },
    Seed { id: "hide-window-controls", name: "Hide window controls", description: "Hides the Windows window buttons so Spotify fills the screen.", description_vi: "Ẩn nút cửa sổ Windows để Spotify chiếm hết màn hình.", version: "1.0.0", kind: SNIPPET, glyph: "window", accent: ["#20242b", "#12151a"], file: "hide-window-controls.css" },
];

fn theme_dirs() -> [PathBuf; 2] {
    [paths::user_themes(), paths::bundled_themes()]
}

fn extension_dirs() -> [PathBuf; 2] {
    [paths::user_extensions(), paths::bundled_extensions()]
}

fn snippet_dirs() -> [PathBuf; 2] {
    [paths::user_snippets(), paths::bundled_snippets()]
}

fn installed_file_path(seed: &Seed) -> Option<PathBuf> {
    match seed.kind {
        EXTENSION => {
            for dir in extension_dirs() {
                let path = dir.join(seed.file);
                if util::is_file(&path) {
                    return Some(path);
                }
            }
            None
        }
        SNIPPET => {
            for dir in snippet_dirs() {
                let path = dir.join(seed.file);
                if util::is_file(&path) {
                    return Some(path);
                }
            }
            None
        }
        _ => {
            for dir in theme_dirs() {
                let base = dir.join(seed.id);
                for name in ["user.css", "theme.css"] {
                    let path = base.join(name);
                    if util::is_file(&path) {
                        return Some(path);
                    }
                }
            }
            None
        }
    }
}

fn header_version(path: &Path) -> Option<String> {
    let raw = util::read_optional(path)?;
    let head: String = raw.chars().take(4096).collect();
    for line in head.lines() {
        let trimmed = line.trim();
        let Some(rest) = trimmed.strip_prefix("//") else {
            continue;
        };
        let rest = rest.trim_start();
        let Some(value) = rest.strip_prefix("VERSION") else {
            continue;
        };
        let value = value.trim_start();
        if let Some(value) = value.strip_prefix(':') {
            let value = value.trim();
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }
    None
}

fn enabled(seed: &Seed, config: &Config) -> bool {
    match seed.kind {
        THEME => config.theme == seed.id,
        SNIPPET => config.snippets.iter().any(|value| value == seed.id),
        _ => config.extensions.iter().any(|value| value == seed.id),
    }
}

/// Lists every bundled module with its installed and enabled state.
pub fn list(config: &Config) -> Vec<Module> {
    let mut modules: Vec<Module> = SEEDS
        .iter()
        .map(|seed| {
            let installed_path = installed_file_path(seed);
            let installed = installed_path.is_some();
            let version = installed_path
                .as_deref()
                .and_then(header_version)
                .unwrap_or_else(|| seed.version.to_string());
            let update_available =
                installed && util::versions_compare(seed.version, &version) > 0;

            Module {
                id: seed.id.to_string(),
                name: seed.name.to_string(),
                author: "ninokiru".to_string(),
                description: seed.description.to_string(),
                description_vi: seed.description_vi.to_string(),
                version: version.clone(),
                kind: seed.kind.to_string(),
                glyph: seed.glyph.to_string(),
                accent: vec![seed.accent[0].to_string(), seed.accent[1].to_string()],
                files: vec![ModuleFile {
                    name: seed.file.to_string(),
                    url: String::new(),
                }],
                bundled: true,
                installed,
                enabled: enabled(seed, config),
                update_available,
            }
        })
        .collect();

    modules.sort_by(|left, right| {
        left.kind
            .cmp(&right.kind)
            .then_with(|| left.name.cmp(&right.name))
    });
    modules
}

pub fn find(id: &str) -> Option<&'static Seed> {
    SEEDS.iter().find(|seed| seed.id == id)
}

/// Enables a bundled module. Its files already ship next to the app, so only
/// the config changes.
pub fn install(id: &str, config: &mut Config) -> Result<(), String> {
    let Some(seed) = find(id) else {
        return Err(format!("Unknown module {}.", id));
    };
    match seed.kind {
        THEME => config.theme = seed.id.to_string(),
        SNIPPET => {
            if !config.snippets.iter().any(|value| value == seed.id) {
                config.snippets.push(seed.id.to_string());
            }
        }
        _ => {
            if !config.extensions.iter().any(|value| value == seed.id) {
                config.extensions.push(seed.id.to_string());
            }
        }
    }
    Ok(())
}

/// Removes the downloaded copy (if any) and disables the module.
pub fn remove(id: &str, config: &mut Config) -> Result<(), String> {
    let Some(seed) = find(id) else {
        return Err(format!("Unknown module {}.", id));
    };

    match seed.kind {
        THEME => {
            util::remove_dir(&paths::user_themes().join(seed.id));
            if config.theme == seed.id {
                config.theme = String::new();
            }
        }
        SNIPPET => {
            let _ = std::fs::remove_file(paths::user_snippets().join(seed.file));
            config.snippets.retain(|value| value != seed.id);
        }
        _ => {
            let _ = std::fs::remove_file(paths::user_extensions().join(seed.file));
            config.extensions.retain(|value| value != seed.id);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalogue_has_unique_ids() {
        let mut ids: Vec<&str> = SEEDS.iter().map(|seed| seed.id).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), SEEDS.len());
    }

    #[test]
    fn install_enables_module() {
        let mut config = Config::defaults();
        install("adblock", &mut config).expect("install");
        assert!(config.extensions.iter().any(|id| id == "adblock"));

        install("Soft", &mut config).expect("theme");
        assert_eq!(config.theme, "Soft");
    }

    #[test]
    fn list_marks_enabled_modules() {
        let mut config = Config::defaults();
        config.extensions.push("adblock".into());
        let modules = list(&config);
        let adblock = modules.iter().find(|item| item.id == "adblock").expect("adblock");
        assert!(adblock.enabled);
    }
}
