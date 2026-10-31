use crate::model::Install;
use crate::{backup, paths, util};
use std::fs;
use std::path::{Component, Path, PathBuf};

pub struct Candidate {
    pub root: String,
    pub variant: String,
}

/// Every Spotify root that may exist on this machine, in the order used by
/// internal/detect/detect.go::Collect: per-user install, machine installs,
/// Microsoft Store packages, then the configured extra roots.
pub fn collect(extra_roots: &[String]) -> Vec<Candidate> {
    let mut list: Vec<Candidate> = Vec::new();
    let mut seen: Vec<String> = Vec::new();

    if let Some(app_data) = env("APPDATA") {
        push(
            &mut list,
            &mut seen,
            &Path::new(&app_data).join("Spotify"),
            "normal",
        );
    }
    if let Some(program_files) = env("PROGRAMFILES") {
        push(
            &mut list,
            &mut seen,
            &Path::new(&program_files).join("Spotify"),
            "normal",
        );
    }
    if let Some(program_files_x86) = env("PROGRAMFILES(X86)") {
        push(
            &mut list,
            &mut seen,
            &Path::new(&program_files_x86).join("Spotify"),
            "normal",
        );
    }
    if let Some(local_app_data) = env("LOCALAPPDATA") {
        let packages = Path::new(&local_app_data).join("Packages");
        if let Ok(entries) = fs::read_dir(&packages) {
            for entry in entries.flatten() {
                let name = entry.file_name();
                if !name
                    .to_string_lossy()
                    .starts_with("SpotifyAB.SpotifyMusic_")
                {
                    continue;
                }
                let is_dir = match entry.file_type() {
                    Ok(kind) => kind.is_dir(),
                    Err(_) => false,
                };
                if !is_dir {
                    continue;
                }
                let root = entry.path().join("LocalState").join("Spotify");
                push(&mut list, &mut seen, &root, "store");
            }
        }
    }

    for extra in extra_roots {
        let variant = if extra.to_lowercase().contains("\\packages\\") {
            "store"
        } else {
            "normal"
        };
        push(&mut list, &mut seen, Path::new(extra), variant);
    }

    list
}

fn env(name: &str) -> Option<String> {
    std::env::var_os(name)
        .map(|value| value.to_string_lossy().trim().to_string())
        .filter(|value| !value.is_empty())
}

fn push(list: &mut Vec<Candidate>, seen: &mut Vec<String>, root: &Path, variant: &str) {
    if root.as_os_str().is_empty() {
        return;
    }
    let normalized = absolute(root);
    let key = normalized.to_lowercase();
    if seen.contains(&key) {
        return;
    }
    seen.push(key);
    list.push(Candidate {
        root: normalized,
        variant: variant.to_string(),
    });
}

fn absolute(path: &Path) -> String {
    let full = if path.is_absolute() {
        path.to_path_buf()
    } else {
        match std::env::current_dir() {
            Ok(current) => current.join(path),
            Err(_) => path.to_path_buf(),
        }
    };
    clean_path(&full).to_string_lossy().replace('/', "\\")
}

fn clean_path(path: &Path) -> PathBuf {
    let mut cleaned = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                if !cleaned.pop() && !cleaned.has_root() {
                    cleaned.push("..");
                }
            }
            other => cleaned.push(other.as_os_str()),
        }
    }
    if cleaned.as_os_str().is_empty() {
        return PathBuf::from(".");
    }
    cleaned
}

/// Turns a candidate into an Install, or None when it does not look like a
/// Spotify folder.
pub fn describe(candidate: &Candidate) -> Option<Install> {
    let root = Path::new(&candidate.root);
    let apps = root.join("Apps");
    if !util::is_dir(&apps) {
        return None;
    }

    let xpui = apps.join("xpui");
    let mut install = Install {
        id: to_id(&candidate.root),
        name: "Spotify".to_string(),
        root: candidate.root.clone(),
        xpui_path: xpui.to_string_lossy().into_owned(),
        variant: candidate.variant.clone(),
        version: read_version(root),
        arch: read_arch(&root.join("Spotify.exe")),
        state: String::new(),
        patched_by: String::new(),
        spa: false,
        has_backup: false,
        backup_at: String::new(),
    };

    if let Some(created_at) = backup::read_summary(&install.id, &install.version) {
        install.has_backup = true;
        install.backup_at = created_at;
    }

    let packed = apps.join("xpui.spa");
    let has_packed = util::is_file(&packed);

    // A folder only counts when it was extracted from the running version.
    // After a Spotify update the archive is newer than the leftover folder,
    // so the folder has to be rebuilt instead of patched.
    let fresh = if !util::is_dir(&xpui) {
        false
    } else if has_packed {
        let expected = util::packed_fingerprint(&install.version, &packed);
        matches!(util::read_marker(&xpui), Some(value) if value == expected)
    } else {
        true
    };

    if !fresh {
        // Spotify 1.2.46+ ships the client as a packed archive. Applying
        // extracts it into Apps/xpui, which Spotify prefers.
        if has_packed {
            install.spa = true;
            install.state = "stock".to_string();
            install.patched_by = "none".to_string();
            return Some(install);
        }
        return None;
    }

    let (state, patched_by) = read_state(&xpui);
    install.state = state.to_string();
    install.patched_by = patched_by.to_string();
    Some(install)
}

/// Detection over the default locations plus the configured extra roots.
pub fn all(extra_roots: &[String]) -> Vec<Install> {
    let mut installs: Vec<Install> = collect(extra_roots)
        .iter()
        .filter_map(|candidate| describe(candidate))
        .collect();

    installs.sort_by(|left, right| {
        let left_rank = if left.variant.as_str() == "store" {
            1
        } else {
            0
        };
        let right_rank = if right.variant.as_str() == "store" {
            1
        } else {
            0
        };
        left_rank
            .cmp(&right_rank)
            .then_with(|| left.root.cmp(&right.root))
    });

    installs
}

/// Cloned lookup so callers can keep an owned Install.
pub fn find(installs: &[Install], id: &str) -> Option<Install> {
    installs.iter().find(|install| install.id == id).cloned()
}

/// Stable install id used by previous releases: lowercase, no drive prefix,
/// non alphanumeric runs collapsed to one dash, at most 64 bytes.
fn to_id(root: &str) -> String {
    let lower = root.to_lowercase();
    let rest = strip_volume(&lower);

    let mut slug = String::with_capacity(rest.len());
    let mut previous_dash = false;
    for character in rest.chars() {
        if character.is_ascii_lowercase() || character.is_ascii_digit() {
            slug.push(character);
            previous_dash = false;
        } else if !previous_dash {
            slug.push('-');
            previous_dash = true;
        }
    }

    let id: String = slug.trim_matches('-').chars().take(64).collect();
    if id.is_empty() {
        return "spotify".to_string();
    }
    id
}

fn strip_volume(lower: &str) -> &str {
    let bytes = lower.as_bytes();
    if bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' {
        return lower.get(2..).unwrap_or(lower);
    }
    lower
}

fn read_version(root: &Path) -> String {
    let text = match util::read_optional(&root.join("prefs")) {
        Some(value) => value,
        None => return String::new(),
    };

    if let Some(version) = capture_version(&text, "app.last-launched-version=\"") {
        return version;
    }
    match capture_version(&text, "app.version=\"") {
        Some(version) => version,
        None => String::new(),
    }
}

fn capture_version(text: &str, prefix: &str) -> Option<String> {
    let start = match text.find(prefix) {
        Some(index) => index + prefix.len(),
        None => return None,
    };
    let rest = match text.get(start..) {
        Some(value) => value,
        None => return None,
    };
    let end = match rest.find('"') {
        Some(index) => index,
        None => return None,
    };
    if end == 0 {
        return None;
    }
    match rest.get(..end) {
        Some(value) => Some(value.to_string()),
        None => None,
    }
}

fn read_arch(exe: &Path) -> String {
    let data = match fs::read(exe) {
        Ok(value) => value,
        Err(_) => return "unknown".to_string(),
    };
    if data.len() < 64 || data[0] != 0x4d || data[1] != 0x5a {
        return "unknown".to_string();
    }

    let offset = u32::from_le_bytes([data[0x3c], data[0x3d], data[0x3e], data[0x3f]]) as usize;
    let end = match offset.checked_add(6) {
        Some(value) => value,
        None => return "unknown".to_string(),
    };
    let head = match data.get(offset..end) {
        Some(value) => value,
        None => return "unknown".to_string(),
    };
    if head[0] != b'P' || head[1] != b'E' || head[2] != 0 || head[3] != 0 {
        return "unknown".to_string();
    }

    let machine = u16::from_le_bytes([head[4], head[5]]);
    let arch = match machine {
        0x8664 => "x64",
        0x014c => "ia32",
        0xaa64 => "arm64",
        _ => "unknown",
    };
    arch.to_string()
}

fn read_state(xpui: &Path) -> (&'static str, &'static str) {
    let sxe_dir = xpui.join(paths::SXE_DIR);
    let has_sxe = util::is_dir(&sxe_dir);

    let html = match util::read_optional(&xpui.join("index.html")) {
        Some(value) => value,
        None => {
            if has_sxe {
                return ("partial", "sxe");
            }
            return ("partial", "none");
        }
    };

    if html.contains(paths::MARKER_START) {
        if util::is_file(&sxe_dir.join("runtime.js")) {
            return ("patched", "sxe");
        }
        return ("partial", "sxe");
    }

    if html.to_ascii_lowercase().contains("spicetify") {
        return ("foreign", "spicetify");
    }

    if has_sxe {
        return ("partial", "sxe");
    }

    ("stock", "none")
}
