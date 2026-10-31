use crate::model::{Config, ExtensionInfo, Install};
use crate::{paths, util};
use std::fs;
use std::path::{Path, PathBuf};

/// Lists every JS extension found in the user and bundled folders. The user
/// folder is scanned first so a downloaded update wins.
pub fn list_extensions() -> Vec<ExtensionInfo> {
    let mut by_id: std::collections::BTreeMap<String, ExtensionInfo> =
        std::collections::BTreeMap::new();

    for (dir, bundled) in [
        (paths::user_extensions(), false),
        (paths::bundled_extensions(), true),
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
            if is_dir {
                continue;
            }

            let name = entry.file_name().to_string_lossy().to_string();
            if !name.to_ascii_lowercase().ends_with(".js") {
                continue;
            }
            let Some(id) = name.get(..name.len() - 3) else {
                continue;
            };
            if by_id.contains_key(id) {
                continue;
            }

            let (display, version) = read_header(&dir, id);
            by_id.insert(
                id.to_string(),
                ExtensionInfo {
                    id: id.to_string(),
                    name: display,
                    version,
                    enabled: false,
                    bundled,
                },
            );
        }
    }

    let mut list: Vec<ExtensionInfo> = by_id.into_values().collect();
    list.sort_by(|left, right| left.name.cmp(&right.name));
    list
}

/// Reads the `// NAME:` and `// VERSION:` comments of `<dir>/<id>.js`.
pub fn read_header(dir: &Path, id: &str) -> (String, String) {
    let file = dir.join(format!("{}.js", id));
    let raw = match util::read_optional(&file) {
        Some(value) => value,
        None => return (id.to_string(), String::new()),
    };

    let head: String = raw.chars().take(4096).collect();
    let name = header_value(&head, "NAME");
    let version = header_value(&head, "VERSION");
    let display = if name.is_empty() { id.to_string() } else { name };
    (display, version)
}

fn header_value(source: &str, key: &str) -> String {
    for line in source.lines() {
        let trimmed = line.trim_start();
        let Some(rest) = trimmed.strip_prefix("//") else {
            continue;
        };
        let rest = rest.trim_start();
        let Some(head) = rest.get(..key.len()) else {
            continue;
        };
        if !head.eq_ignore_ascii_case(key) {
            continue;
        }
        let Some(tail) = rest.get(key.len()..) else {
            continue;
        };
        let tail = tail.trim_start();
        let Some(tail) = tail.strip_prefix(':') else {
            continue;
        };
        return tail.trim().to_string();
    }
    String::new()
}

/// Builds user.css: the active theme, then the enabled snippets, then the
/// custom CSS file.
pub fn compose_user_css(config: &Config) -> String {
    let mut parts: Vec<String> = Vec::new();

    if !config.theme.is_empty() {
        for dir in [paths::user_themes(), paths::bundled_themes()] {
            if let Some(css) =
                read_first(&dir.join(config.theme.as_str()), &["user.css", "theme.css"])
            {
                if !css.is_empty() {
                    parts.push(css);
                    break;
                }
            }
        }
    }

    for file in enabled_snippets(config) {
        if let Ok(css) = fs::read_to_string(&file) {
            parts.push(css);
        }
    }

    if let Some(custom) = util::read_optional(&paths::custom_css()) {
        let text = custom.trim();
        if !text.is_empty() {
            parts.push(text.to_string());
        }
    }

    parts.join("\n\n")
}

fn enabled_snippets(config: &Config) -> Vec<PathBuf> {
    let mut files = Vec::new();

    for dir in [paths::user_snippets(), paths::bundled_snippets()] {
        let entries = match fs::read_dir(&dir) {
            Ok(value) => value,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let is_dir = entry
                .file_type()
                .map(|kind| kind.is_dir())
                .unwrap_or(false);
            if is_dir {
                continue;
            }

            let name = entry.file_name().to_string_lossy().to_string();
            if !name.to_ascii_lowercase().ends_with(".css") {
                continue;
            }
            let Some(id) = name.get(..name.len() - 4) else {
                continue;
            };
            if !config.snippets.iter().any(|value| value == id) {
                continue;
            }
            files.push(dir.join(&name));
        }
    }

    files
}

fn read_first(dir: &Path, names: &[&str]) -> Option<String> {
    for name in names {
        if let Ok(text) = fs::read_to_string(dir.join(*name)) {
            return Some(text);
        }
    }
    None
}

fn extension_path(id: &str) -> Option<PathBuf> {
    for dir in [paths::user_extensions(), paths::bundled_extensions()] {
        let file = dir.join(format!("{}.js", id));
        if util::is_file(&file) {
            return Some(file);
        }
    }
    None
}

/// Writes the payload into a staging folder and swaps it in, so a failed
/// write never leaves Spotify with a half written payload.
pub fn write_payload(install: &Install, config: &Config, version: &str) -> Result<(), String> {
    ensure_client_folder(install)?;

    let xpui = Path::new(install.xpui_path.as_str());
    let target = xpui.join(paths::SXE_DIR);
    let staging = xpui.join(format!("{}.new", paths::SXE_DIR));
    let previous = xpui.join(format!("{}.old", paths::SXE_DIR));

    remove_path(&staging);
    fs::create_dir_all(&staging)
        .map_err(|error| format!("Could not create {}: {}", staging.display(), error))?;

    if let Err(error) = write_payload_dir(&staging, config, version) {
        remove_path(&staging);
        return Err(error);
    }

    let mut had_previous = false;
    if fs::metadata(&target).is_ok() {
        remove_path(&previous);
        if let Err(error) = fs::rename(&target, &previous) {
            remove_path(&staging);
            return Err(format!(
                "Could not replace {}: {}",
                target.display(),
                error
            ));
        }
        had_previous = true;
    }

    if let Err(error) = fs::rename(&staging, &target) {
        if had_previous {
            let _ = fs::rename(&previous, &target);
        }
        remove_path(&staging);
        return Err(format!("Could not install {}: {}", target.display(), error));
    }

    if had_previous {
        remove_path(&previous);
    }
    Ok(())
}

fn write_payload_dir(dir: &Path, config: &Config, version: &str) -> Result<(), String> {
    let runtime = paths::runtime_file();
    if !util::is_file(&runtime) {
        return Err(format!(
            "runtime.js is missing at {}; reinstall the app to restore it.",
            runtime.display()
        ));
    }

    let runtime_data = fs::read(&runtime)
        .map_err(|error| format!("Could not read {}: {}", runtime.display(), error))?;
    write_bytes(dir, "runtime.js", &runtime_data)?;
    write_text(dir, "colors.css", &crate::config::build_colors_css(config))?;
    write_text(dir, "user.css", &compose_user_css(config))?;

    let extensions_dir = dir.join("extensions");
    fs::create_dir_all(&extensions_dir).map_err(|error| {
        format!(
            "Could not create {}: {}",
            extensions_dir.display(),
            error
        )
    })?;

    let mut selected: Vec<ExtensionInfo> = list_extensions()
        .into_iter()
        .filter(|item| config.extensions.iter().any(|value| value == &item.id))
        .collect();
    selected.sort_by(|left, right| left.id.cmp(&right.id));

    let mut manifest_extensions = String::from("[");
    let mut first = true;

    for item in selected {
        let Some(source) = extension_path(&item.id) else {
            continue;
        };
        let Ok(data) = fs::read(&source) else {
            continue;
        };

        let file = format!("{}.js", item.id);
        write_bytes(&extensions_dir, &file, &data)?;

        if !first {
            manifest_extensions.push(',');
        }
        first = false;
        manifest_extensions.push_str("{\"id\":\"");
        manifest_extensions.push_str(&json_escape(&item.id));
        manifest_extensions.push_str("\",\"name\":\"");
        manifest_extensions.push_str(&json_escape(&item.name));
        manifest_extensions.push_str("\",\"file\":\"");
        manifest_extensions.push_str(&json_escape(&file));
        manifest_extensions.push_str("\"}");
    }
    manifest_extensions.push(']');

    let mut manifest = String::from("window.__sxeManifest = {");
    manifest.push_str("\"version\":\"");
    manifest.push_str(&json_escape(version));
    manifest.push_str("\",\"repo\":\"");
    manifest.push_str(&json_escape(paths::REPO_URL));
    manifest.push_str("\",\"language\":\"");
    manifest.push_str(&json_escape(&config.language));
    manifest.push_str("\",\"safeMode\":");
    manifest.push_str(bool_text(config.safe_mode));
    manifest.push_str(
        ",\"settings\":{\"seekButtons\":true,\"songToast\":true,\"timeRemaining\":false,\"updateCheck\":",
    );
    manifest.push_str(bool_text(config.check_update));
    manifest.push_str("},\"generatedAt\":\"");
    manifest.push_str(&json_escape(&util::now_rfc3339()));
    manifest.push_str("\",\"extensions\":");
    manifest.push_str(&manifest_extensions);
    manifest.push_str("};\n");

    write_text(dir, "manifest.js", &manifest)
}

fn write_bytes(dir: &Path, name: &str, data: &[u8]) -> Result<(), String> {
    let path = dir.join(name);
    fs::write(&path, data).map_err(|error| format!("Could not write {}: {}", path.display(), error))
}

fn write_text(dir: &Path, name: &str, text: &str) -> Result<(), String> {
    write_bytes(dir, name, text.as_bytes())
}

fn bool_text(value: bool) -> &'static str {
    if value {
        "true"
    } else {
        "false"
    }
}

fn remove_path(path: &Path) {
    util::remove_dir(path);
    let _ = fs::remove_file(path);
}

/// Inserts the sxe block right after `<body…>`.
pub fn patch_html(install: &Install) -> Result<(), String> {
    let file = Path::new(install.xpui_path.as_str()).join("index.html");
    let raw = fs::read_to_string(&file)
        .map_err(|error| format!("Could not read {}: {}", file.display(), error))?;
    let clean = strip_marker(&raw);
    let block = marker_block();

    let mut next = String::with_capacity(clean.len() + block.len() + 4);
    match body_end(&clean) {
        Some(end) => {
            next.push_str(&clean[..end]);
            next.push('\n');
            next.push_str(&block);
            next.push('\n');
            next.push_str(&clean[end..]);
        }
        None => {
            next.push_str(&clean);
            next.push('\n');
            next.push_str(&block);
            next.push('\n');
        }
    }

    util::write_atomic(&file, next.as_bytes())
}

/// Removes the sxe block from index.html.
pub fn unpatch_html(install: &Install) -> Result<(), String> {
    let file = Path::new(install.xpui_path.as_str()).join("index.html");
    let raw = match fs::read_to_string(&file) {
        Ok(value) => value,
        Err(_) => return Ok(()),
    };

    let clean = strip_marker(&raw);
    if clean == raw {
        return Ok(());
    }
    util::write_atomic(&file, clean.as_bytes())
}

/// Deletes the whole sxe folder plus the staging folders a crashed write may
/// have left behind.
pub fn remove_payload(install: &Install) {
    let xpui = Path::new(install.xpui_path.as_str());
    for name in [
        paths::SXE_DIR.to_string(),
        format!("{}.new", paths::SXE_DIR),
        format!("{}.old", paths::SXE_DIR),
    ] {
        remove_path(&xpui.join(name));
    }
}

fn marker_block() -> String {
    [
        paths::MARKER_START.to_string(),
        format!(
            "<link rel=\"stylesheet\" href=\"{}/colors.css\">",
            paths::SXE_DIR
        ),
        format!(
            "<link rel=\"stylesheet\" href=\"{}/user.css\">",
            paths::SXE_DIR
        ),
        format!("<script src=\"{}/manifest.js\"></script>", paths::SXE_DIR),
        format!("<script src=\"{}/runtime.js\"></script>", paths::SXE_DIR),
        paths::MARKER_END.to_string(),
    ]
    .join("\n")
}

/// Returns the byte offset right after the first `<body…>` tag.
fn body_end(text: &str) -> Option<usize> {
    let lower = text.to_ascii_lowercase();
    let start = lower.find("<body")?;
    let relative = lower.get(start..)?.find('>')?;
    Some(start + relative + 1)
}

/// Removes every injected block, including the newline that follows it.
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

/// Escapes a string for a double quoted JavaScript/JSON literal. `<`, `>` and
/// `&` are escaped as well so the manifest can never close the script tag.
fn json_escape(text: &str) -> String {
    let mut output = String::with_capacity(text.len());
    for character in text.chars() {
        match character {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            '<' => output.push_str("\\u003c"),
            '>' => output.push_str("\\u003e"),
            '&' => output.push_str("\\u0026"),
            value if (value as u32) < 0x20 => {
                output.push_str(&format!("\\u{:04x}", value as u32));
            }
            value => output.push(value),
        }
    }
    output
}

/// True when Apps/xpui is missing or was extracted from another Spotify
/// build, so it has to be rebuilt from the packed archive.
pub fn packed_pending(install: &Install) -> bool {
    let packed = Path::new(install.root.as_str())
        .join("Apps")
        .join("xpui.spa");
    if !util::is_file(&packed) {
        return false;
    }
    let expected = util::packed_fingerprint(&install.version, &packed);
    match util::read_marker(Path::new(install.xpui_path.as_str())) {
        Some(value) => value != expected,
        None => true,
    }
}

/// Extracts Apps/xpui.spa into Apps/xpui, replacing a folder left behind by an
/// older Spotify version. The archive itself is never modified.
fn ensure_client_folder(install: &Install) -> Result<(), String> {
    let xpui = Path::new(install.xpui_path.as_str());

    if packed_pending(install) {
        let packed = Path::new(install.root.as_str())
            .join("Apps")
            .join("xpui.spa");

        if util::is_dir(xpui) {
            util::remove_dir(xpui);
        }
        extract_zip(&packed, xpui)?;
        let marker = util::packed_fingerprint(&install.version, &packed);
        util::write_atomic(&xpui.join(paths::SPA_MARKER), marker.as_bytes())?;
        return Ok(());
    }

    if util::is_dir(xpui) {
        return Ok(());
    }
    Err(format!("Client folder is missing: {}", xpui.display()))
}

fn extract_zip(archive_path: &Path, target: &Path) -> Result<(), String> {
    let file = fs::File::open(archive_path)
        .map_err(|error| format!("Could not open {}: {}", archive_path.display(), error))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|error| format!("Could not read {}: {}", archive_path.display(), error))?;

    fs::create_dir_all(target)
        .map_err(|error| format!("Could not create {}: {}", target.display(), error))?;

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("Could not read an archive entry: {}", error))?;

        let name = entry.name().replace('\\', "/");
        let cleaned = name.trim_start_matches("./");
        if cleaned.is_empty() || cleaned.contains("..") || cleaned.starts_with('/') {
            continue;
        }

        let out = target.join(cleaned);
        if entry.is_dir() {
            fs::create_dir_all(&out)
                .map_err(|error| format!("Could not create {}: {}", out.display(), error))?;
            continue;
        }

        if let Some(parent) = out.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Could not create {}: {}", parent.display(), error))?;
        }

        let mut destination = fs::File::create(&out)
            .map_err(|error| format!("Could not write {}: {}", out.display(), error))?;
        std::io::copy(&mut entry, &mut destination)
            .map_err(|error| format!("Could not extract {}: {}", out.display(), error))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_manifest_strings() {
        assert_eq!(json_escape("say \"hi\""), "say \\\"hi\\\"");
        assert_eq!(json_escape("C:\\Users\\me"), "C:\\\\Users\\\\me");
        assert_eq!(json_escape("a\nb\tc"), "a\\nb\\tc");
        assert_eq!(json_escape("<&>"), "\\u003c\\u0026\\u003e");
        assert_eq!(json_escape("\u{1}"), "\\u0001");
        assert_eq!(json_escape("tiếng Việt"), "tiếng Việt");
    }
}
