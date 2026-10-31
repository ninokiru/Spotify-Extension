use std::fs;
use std::io;
use std::path::{Path, PathBuf};

pub fn is_file(path: &Path) -> bool {
    fs::metadata(path).map(|meta| meta.is_file()).unwrap_or(false)
}

pub fn is_dir(path: &Path) -> bool {
    fs::metadata(path).map(|meta| meta.is_dir()).unwrap_or(false)
}

pub fn read_optional(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok()
}

/// Reads the marker that records which Spotify version a client folder was
/// extracted from, or None when the folder was not created by this app.
pub fn read_marker(folder: &Path) -> Option<String> {
    let raw = fs::read_to_string(folder.join(crate::paths::SPA_MARKER)).ok()?;
    Some(raw.trim().to_string())
}

/// Fingerprint of a packed client: the Spotify version plus the archive size
/// and modification time, so a replaced archive is noticed even before
/// Spotify reports its new version.
pub fn packed_fingerprint(version: &str, archive: &Path) -> String {
    let meta = fs::metadata(archive).ok();
    let size = meta.as_ref().map(|value| value.len()).unwrap_or(0);
    let modified = meta
        .and_then(|value| value.modified().ok())
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("{}|{}:{}", version, size, modified)
}

fn io_error(error: io::Error) -> String {
    error.to_string()
}

fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path
        .file_name()
        .map(|value| value.to_os_string())
        .unwrap_or_default();
    name.push(suffix);
    path.with_file_name(name)
}

/// Writes through a temporary file so a crash cannot leave a truncated file.
pub fn write_atomic(path: &Path, data: &[u8]) -> Result<(), String> {
    let temp = sibling(path, ".sxe-tmp");
    fs::write(&temp, data).map_err(io_error)?;
    if let Err(error) = fs::rename(&temp, path) {
        let _ = fs::remove_file(&temp);
        return Err(error.to_string());
    }
    Ok(())
}

/// Copies every entry of source into target, keeping files the target owns.
pub fn copy_dir_over(source: &Path, target: &Path) -> Result<(), String> {
    fs::create_dir_all(target).map_err(io_error)?;
    for entry in fs::read_dir(source).map_err(io_error)? {
        let entry = entry.map_err(io_error)?;
        let from = entry.path();
        let to = target.join(entry.file_name());
        if entry.file_type().map_err(io_error)?.is_dir() {
            copy_dir_over(&from, &to)?;
        } else {
            fs::copy(&from, &to).map_err(io_error)?;
        }
    }
    Ok(())
}

/// Copies source into target while skipping a folder name at any depth.
pub fn copy_dir_skip(source: &Path, target: &Path, skip: &str) -> Result<(), String> {
    fs::create_dir_all(target).map_err(io_error)?;
    for entry in fs::read_dir(source).map_err(io_error)? {
        let entry = entry.map_err(io_error)?;
        let from = entry.path();
        let to = target.join(entry.file_name());
        if entry.file_type().map_err(io_error)?.is_dir() {
            if entry.file_name().to_string_lossy() == skip {
                continue;
            }
            copy_dir_skip(&from, &to, skip)?;
        } else {
            fs::copy(&from, &to).map_err(io_error)?;
        }
    }
    Ok(())
}

pub fn remove_dir(path: &Path) {
    let _ = fs::remove_dir_all(path);
}

pub fn now_rfc3339() -> String {
    let seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_secs() as i64)
        .unwrap_or(0);
    let days = seconds.div_euclid(86_400);
    let rest = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year,
        month,
        day,
        rest / 3600,
        (rest % 3600) / 60,
        rest % 60
    )
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let shifted = days + 719_468;
    let era = if shifted >= 0 { shifted } else { shifted - 146_096 } / 146_097;
    let day_of_era = shifted - era * 146_097;
    let year_of_era = (day_of_era - day_of_era / 1_460 + day_of_era / 36_524
        - day_of_era / 146_096)
        / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = if month_prime < 10 {
        month_prime + 3
    } else {
        month_prime - 9
    };
    (if month <= 2 { year + 1 } else { year }, month, day)
}

/// Orders two version strings like semver: build metadata is ignored and a
/// pre-release tag is older than its release.
pub fn versions_compare(left: &str, right: &str) -> i32 {
    let (a, a_pre) = parse_version(left);
    let (b, b_pre) = parse_version(right);

    let length = a.len().max(b.len());
    for index in 0..length {
        let av = a.get(index).copied().unwrap_or(0);
        let bv = b.get(index).copied().unwrap_or(0);
        if av != bv {
            return if av > bv { 1 } else { -1 };
        }
    }

    match (a_pre.is_empty(), b_pre.is_empty()) {
        (true, true) => 0,
        (true, false) => 1,
        (false, true) => -1,
        (false, false) => match a_pre.cmp(&b_pre) {
            std::cmp::Ordering::Less => -1,
            std::cmp::Ordering::Greater => 1,
            std::cmp::Ordering::Equal => 0,
        },
    }
}

fn parse_version(value: &str) -> (Vec<i64>, String) {
    let without_build = match value.find('+') {
        Some(index) => &value[..index],
        None => value,
    };
    let (numbers, pre) = match without_build.find('-') {
        Some(index) => (&without_build[..index], without_build[index + 1..].to_string()),
        None => (without_build, String::new()),
    };
    let parts = numbers
        .split('.')
        .map(|part| part.parse::<i64>().unwrap_or(0))
        .collect();
    (parts, pre)
}

pub fn normalize_hex(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let padded = if trimmed.starts_with('#') {
        trimmed.to_string()
    } else {
        format!("#{}", trimmed)
    };
    let digits = &padded[1..];
    if digits.len() == 6 && digits.chars().all(|c| c.is_ascii_hexdigit()) {
        return Some(format!("#{}", digits.to_ascii_lowercase()));
    }
    if digits.len() == 3 && digits.chars().all(|c| c.is_ascii_hexdigit()) {
        let chars: Vec<char> = digits.chars().collect();
        return Some(
            format!(
                "#{}{}{}{}{}{}",
                chars[0], chars[0], chars[1], chars[1], chars[2], chars[2]
            )
            .to_ascii_lowercase(),
        );
    }
    None
}

pub fn hex_to_rgb(hex: &str) -> (i32, i32, i32) {
    if hex.len() != 7 || !hex.starts_with('#') {
        return (0, 0, 0);
    }
    let parse = |start: usize| i32::from_str_radix(&hex[start..start + 2], 16).unwrap_or(0);
    (parse(1), parse(3), parse(5))
}

pub fn mix(from: &str, to: &str, weight: f64) -> String {
    let (fr, fg, fb) = hex_to_rgb(from);
    let (tr, tg, tb) = hex_to_rgb(to);
    let part = |a: i32, b: i32| {
        let value = (a as f64 * (1.0 - weight) + b as f64 * weight) as i32;
        format!("{:02x}", value.clamp(0, 255))
    };
    format!("#{}{}{}", part(fr, tr), part(fg, tg), part(fb, tb))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_versions() {
        assert_eq!(versions_compare("1.0.0", "1.0.0"), 0);
        assert_eq!(versions_compare("2.0.0", "1.0.0"), 1);
        assert_eq!(versions_compare("1.10.0", "1.9.0"), 1);
        assert_eq!(versions_compare("1.0.0-beta", "1.0.0"), -1);
        assert_eq!(versions_compare("1.0.0+build", "1.0.0"), 0);
    }

    #[test]
    fn normalizes_colours() {
        assert_eq!(normalize_hex("#ABC"), Some("#aabbcc".into()));
        assert_eq!(normalize_hex("1ed760"), Some("#1ed760".into()));
        assert_eq!(normalize_hex("nope"), None);
    }

    #[test]
    fn formats_timestamp() {
        assert_eq!(now_rfc3339().len(), 20);
        assert!(now_rfc3339().ends_with('Z'));
    }
}
