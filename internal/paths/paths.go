package paths

import (
	"os"
	"path/filepath"
)

const (
	SxeDir         = "sxe"
	MarkerStart    = "<!-- sxe:start -->"
	MarkerEnd      = "<!-- sxe:end -->"
	BackupManifest = "manifest.json"
	RepoURL        = "https://github.com/ninokiru/Spotify-Extension"
)

// Data returns %APPDATA%\spotify-extension, the folder shared with previous releases.
func Data() string {
	base, err := os.UserConfigDir()
	if err != nil || base == "" {
		base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming")
	}
	return filepath.Join(base, "spotify-extension")
}

// ConfigFile returns the path of config.ini.
func ConfigFile() string { return filepath.Join(Data(), "config.ini") }

// CustomCss returns the path of the user's own CSS file.
func CustomCss() string { return filepath.Join(Data(), "user.css") }

// Backups returns the folder holding per-install snapshots.
func Backups() string { return filepath.Join(Data(), "backups") }

// UserExtensions, UserThemes and UserSnippets hold downloaded modules.
func UserExtensions() string { return filepath.Join(Data(), "extensions") }
func UserThemes() string     { return filepath.Join(Data(), "themes") }
func UserSnippets() string   { return filepath.Join(Data(), "snippets") }

// exeDir is the folder containing sxe.exe; bundled assets live next to it.
func exeDir() string {
	dir, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(dir)
}

// BundledExtensions, BundledThemes and BundledSnippets ship next to the binary.
func BundledExtensions() string { return filepath.Join(exeDir(), "extensions") }
func BundledThemes() string     { return filepath.Join(exeDir(), "themes") }
func BundledSnippets() string   { return filepath.Join(exeDir(), "snippets") }

// RuntimeFile is the prebuilt payload injected into Spotify.
func RuntimeFile() string { return filepath.Join(exeDir(), "runtime", "runtime.js") }
