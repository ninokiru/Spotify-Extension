use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// CREATE_NO_WINDOW: keeps tasklist/taskkill/explorer from flashing a console.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
fn windows_dir() -> PathBuf {
    std::env::var_os("SystemRoot")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("C:\\Windows"))
}

/// Absolute path to a Windows tool, so a planted executable next to the app
/// cannot be picked up instead.
#[cfg(windows)]
fn system_exe(name: &str) -> PathBuf {
    windows_dir().join("System32").join(name)
}

#[cfg(not(windows))]
fn system_exe(name: &str) -> PathBuf {
    PathBuf::from(name)
}

fn hide_console(command: &mut Command) {
    #[cfg(windows)]
    {
        let _ = command.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        let _ = command;
    }
}

/// Reports whether Spotify.exe is alive.
pub fn running() -> bool {
    let mut command = Command::new(system_exe("tasklist.exe"));
    command.args(["/FI", "IMAGENAME eq Spotify.exe", "/NH"]);
    hide_console(&mut command);

    match command.output() {
        Ok(output) => String::from_utf8_lossy(&output.stdout)
            .to_lowercase()
            .contains("spotify.exe"),
        Err(_) => false,
    }
}

/// Kills Spotify and starts it again from the install root. Returns false when
/// the executable cannot be started.
pub fn restart(root: &str) -> bool {
    let mut kill = Command::new(system_exe("taskkill.exe"));
    kill.args(["/IM", "Spotify.exe", "/F"]);
    hide_console(&mut kill);
    let _ = kill.output();

    std::thread::sleep(std::time::Duration::from_millis(1500));

    let exe = Path::new(root).join("Spotify.exe");
    if !exe.exists() {
        return false;
    }

    let mut command = Command::new(&exe);
    command.current_dir(root);
    hide_console(&mut command);
    command.spawn().is_ok()
}

/// Opens a folder in Explorer.
pub fn open_folder(path: &str) -> bool {
    #[cfg(windows)]
    let mut command = Command::new(windows_dir().join("explorer.exe"));
    #[cfg(not(windows))]
    let mut command = Command::new("explorer");

    command.arg(path);
    hide_console(&mut command);
    command.spawn().is_ok()
}
