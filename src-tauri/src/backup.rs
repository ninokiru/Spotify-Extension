use crate::model::{BackupInfo, Install};
use crate::paths;
use crate::util;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const UNKNOWN_VERSION: &str = "unknown";
const MAX_VERSION_KEY: usize = 48;
const SNAPSHOT_FOLDER: &str = "xpui";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    #[serde(default)]
    pub install_id: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub files: usize,
    /// True when the snapshot keeps Apps/xpui.spa instead of a folder.
    #[serde(default)]
    pub spa: bool,
}

/// One stored copy of a client folder; the copy itself lives in `dir/xpui`.
struct Snapshot {
    dir: PathBuf,
    manifest: Manifest,
}

fn backups_root() -> PathBuf {
    paths::backups_dir()
}

fn dir_for(root: &Path, install_id: &str) -> PathBuf {
    root.join(install_id)
}

fn version_dir(root: &Path, install_id: &str, version: &str) -> PathBuf {
    dir_for(root, install_id).join(version_key(version))
}

/// Sanitises a version so it can never escape the backup folder. Only
/// letters, digits, dots, dashes and underscores survive.
fn version_key(version: &str) -> String {
    let cleaned: String = version
        .chars()
        .filter(|value| {
            value.is_ascii_alphanumeric() || matches!(*value, '.' | '_' | '-')
        })
        .collect();
    let cleaned = cleaned.trim_matches(|value| value == '.' || value == '-');
    if cleaned.is_empty() {
        return UNKNOWN_VERSION.to_string();
    }
    cleaned.chars().take(MAX_VERSION_KEY).collect()
}

/// Removes every injected marker block together with the newline that
/// follows it. Slicing is always done on `find` offsets so multi-byte
/// characters cannot be split.
fn strip_marker(text: &str) -> String {
    let mut output = String::with_capacity(text.len());
    let mut rest = text;

    loop {
        let Some(start) = rest.find(paths::MARKER_START) else {
            output.push_str(rest);
            break;
        };

        output.push_str(&rest[..start]);
        let after_start = &rest[start + paths::MARKER_START.len()..];
        let Some(end) = after_start.find(paths::MARKER_END) else {
            output.push_str(&rest[start..]);
            break;
        };

        let after_end = &after_start[end + paths::MARKER_END.len()..];
        rest = after_end
            .strip_prefix("\r\n")
            .or_else(|| after_end.strip_prefix('\n'))
            .unwrap_or(after_end);
    }

    output
}

/// Reads the manifest of the snapshot stored for exactly one version.
fn snapshot_for_at(root: &Path, install_id: &str, version: &str) -> Option<Manifest> {
    read_manifest_file(&version_dir(root, install_id, version).join(paths::BACKUP_MANIFEST))
}

/// Reads the manifest of the pre-version layout, where the single snapshot
/// lived directly in the install folder.
fn legacy_snapshot_at(root: &Path, install_id: &str) -> Option<Snapshot> {
    let dir = dir_for(root, install_id);
    let manifest = read_manifest_file(&dir.join(paths::BACKUP_MANIFEST))?;
    Some(Snapshot { dir, manifest })
}

/// Returns every versioned snapshot of one install, oldest first.
fn list_snapshots_at(root: &Path, install_id: &str) -> Vec<Snapshot> {
    let mut list = Vec::new();
    let base = dir_for(root, install_id);
    let entries = match fs::read_dir(&base) {
        Ok(value) => value,
        Err(_) => return list,
    };

    for entry in entries.flatten() {
        let is_dir = entry
            .file_type()
            .map(|kind| kind.is_dir())
            .unwrap_or(false);
        if !is_dir {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }

        let dir = base.join(&name);
        if let Some(manifest) = read_manifest_file(&dir.join(paths::BACKUP_MANIFEST)) {
            list.push(Snapshot { dir, manifest });
        }
    }

    list.sort_by(|left, right| left.manifest.created_at.cmp(&right.manifest.created_at));
    list
}

/// Resolves exact version first, then the legacy layout, then the newest
/// snapshot.
fn find_snapshot_at(root: &Path, install_id: &str, version: &str) -> Option<Snapshot> {
    if let Some(manifest) = snapshot_for_at(root, install_id, version) {
        return Some(Snapshot {
            dir: version_dir(root, install_id, version),
            manifest,
        });
    }

    if let Some(snapshot) = legacy_snapshot_at(root, install_id) {
        return Some(snapshot);
    }

    list_snapshots_at(root, install_id).pop()
}

fn read_summary_at(root: &Path, install_id: &str, version: &str) -> Option<String> {
    find_snapshot_at(root, install_id, version).map(|snapshot| snapshot.manifest.created_at)
}

fn ensure_at(root: &Path, install: &Install) -> Result<Manifest, String> {
    if let Some(existing) = snapshot_for_at(root, &install.id, &install.version) {
        return Ok(existing);
    }

    let base = dir_for(root, &install.id);
    fs::create_dir_all(&base)
        .map_err(|error| format!("Could not create {}: {}", base.display(), error))?;

    let key = snapshot_key(install);
    if let Some(existing) = read_manifest_file(&base.join(&key).join(paths::BACKUP_MANIFEST)) {
        return Ok(existing);
    }

    let staging = base.join(format!(".staging-{}", key));
    util::remove_dir(&staging);

    let packed = Path::new(install.root.as_str())
        .join("Apps")
        .join("xpui.spa");
    let staged = if crate::apply::packed_pending(install) {
        stage_packed(&staging, install, &packed)
    } else {
        stage_snapshot(&staging, install)
    };

    let manifest = match staged {
        Ok(value) => value,
        Err(error) => {
            util::remove_dir(&staging);
            return Err(error);
        }
    };

    let destination = base.join(&key);
    util::remove_dir(&destination);
    if let Err(error) = fs::rename(&staging, &destination) {
        util::remove_dir(&staging);
        return Err(format!(
            "Could not store the backup at {}: {}",
            destination.display(),
            error
        ));
    }

    Ok(manifest)
}

fn stage_snapshot(staging: &Path, install: &Install) -> Result<Manifest, String> {
    let copy = staging.join(SNAPSHOT_FOLDER);
    util::copy_dir_skip(
        Path::new(install.xpui_path.as_str()),
        &copy,
        paths::SXE_DIR,
    )?;
    strip_marker_file(&copy.join("index.html"))?;
    let _ = fs::remove_file(copy.join(paths::SPA_MARKER));

    let manifest = Manifest {
        install_id: install.id.clone(),
        version: install.version.clone(),
        created_at: util::now_rfc3339(),
        source: install.xpui_path.clone(),
        files: count_files(&copy),
        spa: false,
    };

    let text = manifest_text(&manifest);
    util::write_atomic(&staging.join(paths::BACKUP_MANIFEST), text.as_bytes())?;
    Ok(manifest)
}

/// Keeps the packed archive as the pristine snapshot of a client that has no
/// extracted folder yet.
fn stage_packed(staging: &Path, install: &Install, archive: &Path) -> Result<Manifest, String> {
    fs::create_dir_all(staging)
        .map_err(|error| format!("Could not create {}: {}", staging.display(), error))?;

    let target = staging.join("xpui.spa");
    fs::copy(archive, &target)
        .map_err(|error| format!("Could not copy {}: {}", archive.display(), error))?;

    let manifest = Manifest {
        install_id: install.id.clone(),
        version: install.version.clone(),
        created_at: util::now_rfc3339(),
        source: archive.to_string_lossy().into_owned(),
        files: 1,
        spa: true,
    };

    let text = manifest_text(&manifest);
    util::write_atomic(&staging.join(paths::BACKUP_MANIFEST), text.as_bytes())?;
    Ok(manifest)
}

fn restore_at(root: &Path, install: &Install) -> Result<bool, String> {
    let mut candidates = Vec::new();

    if let Some(manifest) = snapshot_for_at(root, &install.id, &install.version) {
        candidates.push(Snapshot {
            dir: version_dir(root, &install.id, &install.version),
            manifest,
        });
    }
    if let Some(snapshot) = legacy_snapshot_at(root, &install.id) {
        candidates.push(snapshot);
    }

    let mut newest_first = list_snapshots_at(root, &install.id);
    newest_first.reverse();
    candidates.extend(newest_first);

    for candidate in candidates {
        // A packed snapshot means we extracted the folder ourselves, so
        // restoring is deleting it and letting Spotify use the archive again.
        if candidate.manifest.spa {
            util::remove_dir(Path::new(install.xpui_path.as_str()));
            return Ok(true);
        }

        let source = candidate.dir.join(SNAPSHOT_FOLDER);
        if !util::is_dir(&source) {
            continue;
        }
        util::copy_dir_over(&source, Path::new(install.xpui_path.as_str()))?;
        return Ok(true);
    }

    Ok(false)
}

fn count_files(root: &Path) -> usize {
    let mut total = 0;
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            let is_dir = entry
                .file_type()
                .map(|kind| kind.is_dir())
                .unwrap_or(false);
            if is_dir {
                total += count_files(&path);
            } else {
                total += 1;
            }
        }
    }
    total
}

/// Serialises the manifest the same way the Go build did, so both versions
/// can read each other's snapshots.
fn manifest_text(manifest: &Manifest) -> String {
    format!(
        "{{\n  \"installId\": \"{}\",\n  \"version\": \"{}\",\n  \"createdAt\": \"{}\",\n  \"source\": \"{}\",\n  \"files\": {},\n  \"spa\": {}\n}}\n",
        escape_json(&manifest.install_id),
        escape_json(&manifest.version),
        escape_json(&manifest.created_at),
        escape_json(&manifest.source),
        manifest.files,
        manifest.spa
    )
}

/// The crate only depends on `serde`, not `serde_json`, so the handful of
/// fields this manifest needs are read with a small scanner. Missing fields
/// fall back to their default values, matching the `#[serde(default)]`
/// attributes above.
fn read_manifest_file(path: &Path) -> Option<Manifest> {
    let raw = fs::read_to_string(path).ok()?;
    let trimmed = raw.trim();
    if !trimmed.starts_with('{') || !trimmed.ends_with('}') {
        return None;
    }

    Some(Manifest {
        install_id: json_string(&raw, "installId").unwrap_or_default(),
        version: json_string(&raw, "version").unwrap_or_default(),
        created_at: json_string(&raw, "createdAt").unwrap_or_default(),
        source: json_string(&raw, "source").unwrap_or_default(),
        files: json_number(&raw, "files").unwrap_or(0),
        spa: json_bool(&raw, "spa").unwrap_or(false),
    })
}

fn value_after_key<'a>(text: &'a str, key: &str) -> Option<&'a str> {
    let needle = format!("\"{}\"", key);
    let mut search = 0;

    while search < text.len() {
        let relative = text.get(search..)?.find(&needle)?;
        let start = search + relative + needle.len();
        let rest = text.get(start..)?.trim_start();
        if let Some(value) = rest.strip_prefix(':') {
            return Some(value.trim_start());
        }
        search = start;
    }

    None
}

fn json_bool(text: &str, key: &str) -> Option<bool> {
    let value = value_after_key(text, key)?;
    if value.starts_with("true") {
        Some(true)
    } else if value.starts_with("false") {
        Some(false)
    } else {
        None
    }
}

fn json_string(text: &str, key: &str) -> Option<String> {
    let value = value_after_key(text, key)?;
    let mut chars = value.strip_prefix('"')?.chars();
    let mut output = String::new();

    loop {
        match chars.next()? {
            '"' => return Some(output),
            '\\' => match chars.next()? {
                '"' => output.push('"'),
                '\\' => output.push('\\'),
                '/' => output.push('/'),
                'b' => output.push('\u{0008}'),
                'f' => output.push('\u{000c}'),
                'n' => output.push('\n'),
                'r' => output.push('\r'),
                't' => output.push('\t'),
                'u' => {
                    let mut code = 0u32;
                    for _ in 0..4 {
                        let digit = chars.next()?.to_digit(16)?;
                        code = code * 16 + digit;
                    }
                    if let Some(decoded) = char::from_u32(code) {
                        output.push(decoded);
                    }
                }
                other => output.push(other),
            },
            other => output.push(other),
        }
    }
}

fn json_number(text: &str, key: &str) -> Option<usize> {
    let value = value_after_key(text, key)?;
    let digits: String = value
        .chars()
        .take_while(|character| character.is_ascii_digit())
        .collect();
    if digits.is_empty() {
        return None;
    }
    digits.parse().ok()
}

fn escape_json(text: &str) -> String {
    let mut output = String::with_capacity(text.len());
    for character in text.chars() {
        match character {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            value if (value as u32) < 0x20 => {
                output.push_str(&format!("\\u{:04x}", value as u32));
            }
            value => output.push(value),
        }
    }
    output
}

fn strip_marker_file(path: &Path) -> Result<(), String> {
    let raw = match fs::read(path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("Could not read {}: {}", path.display(), error)),
    };

    let text = match std::str::from_utf8(&raw) {
        Ok(value) => value,
        Err(_) => return Ok(()),
    };

    let clean = strip_marker(text);
    if clean.as_str() == text {
        return Ok(());
    }

    fs::write(path, clean.as_bytes())
        .map_err(|error| format!("Could not write {}: {}", path.display(), error))
}

pub fn read_summary(install_id: &str, version: &str) -> Option<String> {
    read_summary_at(&backups_root(), install_id, version)
}

pub fn snapshot_for(install_id: &str, version: &str) -> Option<Manifest> {
    snapshot_for_at(&backups_root(), install_id, version)
}

pub fn ensure(install: &Install) -> Result<Manifest, String> {
    ensure_at(&backups_root(), install)
}

pub fn restore(install: &Install) -> Result<bool, String> {
    restore_at(&backups_root(), install)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(tag: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|value| value.as_nanos())
            .unwrap_or(0);
        let path = std::env::temp_dir().join(format!(
            "sxe-backup-{}-{}-{}",
            tag,
            std::process::id(),
            nanos
        ));
        let _ = fs::remove_dir_all(&path);
        path
    }

    fn install_for(xpui: &Path) -> Install {
        Install {
            id: "test-install".into(),
            name: "Test".into(),
            root: xpui
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| xpui.to_path_buf())
                .to_string_lossy()
                .to_string(),
            xpui_path: xpui.to_string_lossy().to_string(),
            variant: "desktop".into(),
            version: "1.2.3".into(),
            arch: "x64".into(),
            state: "patched".into(),
            patched_by: "test".into(),
            spa: false,
            has_backup: false,
            backup_at: String::new(),
        }
    }

    #[test]
    fn strips_every_marker_block() {
        let source = "a\n<!-- sxe:start -->\n<link rel=\"stylesheet\">\n<!-- sxe:end -->\nbody 日本語\n<!-- sxe:start --><!-- sxe:end -->\ntail";
        assert_eq!(strip_marker(source), "a\nbody 日本語\ntail");
    }

    #[test]
    fn keeps_text_without_markers() {
        let source = "<html>tiếng Việt</html>";
        assert_eq!(strip_marker(source), source);
    }

    #[test]
    fn sanitises_version_keys() {
        assert_eq!(version_key("1.2.3"), "1.2.3");
        assert_eq!(version_key("../evil"), "evil");
        assert_eq!(version_key(".."), "unknown");
        assert_eq!(version_key(""), "unknown");
        assert_eq!(version_key("v 1.2.3 (beta)"), "v1.2.3beta");
        assert_eq!(version_key(&"a".repeat(60)).len(), 48);
    }

    #[test]
    fn reads_go_style_manifests() {
        let base = temp_root("manifest");
        let dir = base.join("test-install").join("1.0.0");
        assert!(fs::create_dir_all(&dir).is_ok());
        let json = "{\n  \"installId\": \"test-install\",\n  \"version\": \"1.0.0\",\n  \"createdAt\": \"2025-01-02T03:04:05+07:00\",\n  \"source\": \"C:\\\\Users\\\\me\\\\Spotify\",\n  \"files\": 42\n}\n";
        assert!(fs::write(dir.join("manifest.json"), json).is_ok());

        let manifest = match snapshot_for_at(&base, "test-install", "1.0.0") {
            Some(value) => value,
            None => panic!("manifest was not readable"),
        };
        assert_eq!(manifest.install_id, "test-install");
        assert_eq!(manifest.created_at, "2025-01-02T03:04:05+07:00");
        assert_eq!(manifest.source, "C:\\Users\\me\\Spotify");
        assert_eq!(manifest.files, 42);

        let sparse_dir = base.join("test-install").join("2.0.0");
        assert!(fs::create_dir_all(&sparse_dir).is_ok());
        assert!(fs::write(sparse_dir.join("manifest.json"), "{\"installId\":\"test-install\"}").is_ok());
        let sparse = match snapshot_for_at(&base, "test-install", "2.0.0") {
            Some(value) => value,
            None => panic!("sparse manifest was not readable"),
        };
        assert_eq!(sparse.version, "");
        assert_eq!(sparse.source, "");
        assert_eq!(sparse.files, 0);

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn snapshots_and_restores_a_version() {
        let base = temp_root("roundtrip");
        let backup_root = base.join("backups");
        let live = base.join("live").join("xpui");
        let nested = live.join("nested");
        let payload = live.join("sxe").join("extensions");

        assert!(fs::create_dir_all(&nested).is_ok());
        assert!(fs::create_dir_all(&payload).is_ok());
        assert!(fs::write(
            live.join("index.html"),
            "before\n<!-- sxe:start -->\n<script src=\"sxe/runtime.js\"></script>\n<!-- sxe:end -->\nafter"
        )
        .is_ok());
        assert!(fs::write(nested.join("style.css"), "body{}").is_ok());
        assert!(fs::write(payload.join("adblock.js"), "payload").is_ok());

        let install = install_for(&live);
        let manifest = match ensure_at(&backup_root, &install) {
            Ok(value) => value,
            Err(error) => panic!("ensure failed: {}", error),
        };
        assert_eq!(manifest.install_id, "test-install");
        assert_eq!(manifest.version, "1.2.3");
        assert_eq!(manifest.files, 2);
        assert!(!manifest.created_at.is_empty());

        let snapshot = backup_root.join("test-install").join("1.2.3").join("xpui");
        let stored = fs::read_to_string(snapshot.join("index.html")).unwrap_or_default();
        assert_eq!(stored, "before\nafter");
        assert!(!snapshot.join("sxe").exists());

        let again = match ensure_at(&backup_root, &install) {
            Ok(value) => value,
            Err(error) => panic!("second ensure failed: {}", error),
        };
        assert_eq!(again.created_at, manifest.created_at);

        let parsed = snapshot_for_at(&backup_root, "test-install", "1.2.3");
        assert_eq!(
            parsed.map(|value| value.created_at),
            Some(manifest.created_at.clone())
        );
        assert_eq!(
            read_summary_at(&backup_root, "test-install", "9.9.9"),
            Some(manifest.created_at.clone())
        );

        assert!(fs::write(live.join("index.html"), "patched").is_ok());
        match restore_at(&backup_root, &install) {
            Ok(found) => assert!(found),
            Err(error) => panic!("restore failed: {}", error),
        }
        assert_eq!(
            fs::read_to_string(live.join("index.html")).unwrap_or_default(),
            "before\nafter"
        );

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn restore_reports_missing_snapshot() {
        let base = temp_root("missing");
        let live = base.join("live").join("xpui");
        assert!(fs::create_dir_all(&live).is_ok());

        let install = install_for(&live);
        match restore_at(&base.join("backups"), &install) {
            Ok(found) => assert!(!found),
            Err(error) => panic!("restore failed: {}", error),
        }

        let _ = fs::remove_dir_all(&base);
    }
}

/// Returns the stored backups of one install, newest first.
pub fn list_backups(install: &Install) -> Vec<BackupInfo> {
    list_snapshots_at(&backups_root(), &install.id)
        .into_iter()
        .rev()
        .map(|snapshot| BackupInfo {
            version: snapshot.manifest.version.clone(),
            created_at: snapshot.manifest.created_at.clone(),
            files: snapshot.manifest.files,
            spa: snapshot.manifest.spa,
            current: snapshot.manifest.version == install.version,
        })
        .collect()
}

/// Deletes an old backup. The backup of the running version is kept so there
/// is always a way back.
pub fn delete_backup(install: &Install, version: &str) -> Result<(), String> {
    if version == install.version {
        return Err("The backup of the running version cannot be deleted.".into());
    }
    let dir = version_dir(&backups_root(), &install.id, version);
    if !util::is_dir(&dir) {
        return Err("Backup not found.".into());
    }
    util::remove_dir(&dir);
    Ok(())
}

/// Restores one backup. Only the snapshot matching the running version is
/// accepted, so an old client can never be copied over the new one.
pub fn restore_version(install: &Install, version: &str) -> Result<bool, String> {
    if version != install.version {
        return Err("Only the backup of the running version can be restored.".into());
    }
    restore(install)
}

/// Folder name for one snapshot. An unreadable version falls back to a hash
/// of the client source, so two different builds never share one folder.
fn snapshot_key(install: &Install) -> String {
    if !install.version.is_empty() {
        return version_key(&install.version);
    }

    let packed = Path::new(install.root.as_str())
        .join("Apps")
        .join("xpui.spa");
    let source = if util::is_file(&packed) {
        util::packed_fingerprint("", &packed)
    } else {
        let index = Path::new(install.xpui_path.as_str()).join("index.html");
        match fs::metadata(&index) {
            Ok(meta) => format!(
                "{}:{}",
                meta.len(),
                meta.modified()
                    .ok()
                    .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|duration| duration.as_secs())
                    .unwrap_or(0)
            ),
            Err(_) => String::new(),
        }
    };

    if source.is_empty() {
        return version_key("");
    }
    let hash = source
        .bytes()
        .fold(0u32, |acc, byte| acc.wrapping_mul(31).wrapping_add(u32::from(byte)));
    format!("{}-{:08x}", version_key(""), hash)
}
