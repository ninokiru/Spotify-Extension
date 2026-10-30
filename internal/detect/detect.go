package detect

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

type PatchedBy string

const (
	None      PatchedBy = "none"
	Sxe       PatchedBy = "sxe"
	Spicetify PatchedBy = "spicetify"
	Foreign   PatchedBy = "foreign"
)

type State string

const (
	Stock       State = "stock"
	Patched     State = "patched"
	ForeignState State = "foreign"
	Partial     State = "partial"
	Unsupported State = "unsupported"
)

type Install struct {
	ID        string
	Name      string
	Root      string
	AppsPath  string
	XpuiPath  string
	Variant   string // "normal" | "store"
	Version   string
	Arch      string
	State     State
	PatchedBy PatchedBy
	HasBackup bool
	BackupAt  string
	Note      string
}

type Candidate struct {
	Root    string
	Variant string
}

func env(name string) string {
	value := os.Getenv(name)
	return strings.TrimSpace(value)
}

// Collect returns every candidate Spotify root on this machine.
func Collect(extraRoots []string) []Candidate {
	list := []Candidate{}
	seen := map[string]bool{}

	push := func(root, variant string) {
		if root == "" {
			return
		}
		normalized, err := filepath.Abs(root)
		if err != nil {
			normalized = root
		}
		key := strings.ToLower(normalized)
		if seen[key] {
			return
		}
		seen[key] = true
		list = append(list, Candidate{Root: normalized, Variant: variant})
	}

	if appData := env("APPDATA"); appData != "" {
		push(filepath.Join(appData, "Spotify"), "normal")
	}
	if programFiles := env("PROGRAMFILES"); programFiles != "" {
		push(filepath.Join(programFiles, "Spotify"), "normal")
	}
	if programFilesX86 := env("PROGRAMFILES(X86)"); programFilesX86 != "" {
		push(filepath.Join(programFilesX86, "Spotify"), "normal")
	}
	if localAppData := env("LOCALAPPDATA"); localAppData != "" {
		packages := filepath.Join(localAppData, "Packages")
		if entries, err := os.ReadDir(packages); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() || !strings.HasPrefix(entry.Name(), "SpotifyAB.SpotifyMusic_") {
					continue
				}
				push(filepath.Join(packages, entry.Name(), "LocalState", "Spotify"), "store")
			}
		}
	}

	for _, extra := range extraRoots {
		variant := "normal"
		if strings.Contains(strings.ToLower(extra), "\\packages\\") {
			variant = "store"
		}
		push(extra, variant)
	}

	return list
}

func readVersion(root string) string {
	raw, err := os.ReadFile(filepath.Join(root, "prefs"))
	if err != nil {
		return ""
	}
	text := string(raw)

	if match := regexp.MustCompile(`app\.last-launched-version="([^"]+)"`).FindStringSubmatch(text); match != nil {
		return match[1]
	}
	if match := regexp.MustCompile(`app\.version="([^"]+)"`).FindStringSubmatch(text); match != nil {
		return match[1]
	}
	return ""
}

func readArch(exePath string) string {
	file, err := os.Open(exePath)
	if err != nil {
		return "unknown"
	}
	defer file.Close()

	dos := make([]byte, 64)
	if _, err := file.ReadAt(dos, 0); err != nil {
		return "unknown"
	}
	if dos[0] != 0x4d || dos[1] != 0x5a {
		return "unknown"
	}

	peOffset := binary.LittleEndian.Uint32(dos[0x3c:])
	head := make([]byte, 6)
	if _, err := file.ReadAt(head, int64(peOffset)); err != nil {
		return "unknown"
	}
	if binary.LittleEndian.Uint32(head) != 0x00004550 {
		return "unknown"
	}

	switch binary.LittleEndian.Uint16(head[4:]) {
	case 0x8664:
		return "x64"
	case 0x014c:
		return "ia32"
	case 0xaa64:
		return "arm64"
	default:
		return "unknown"
	}
}

func readState(xpuiPath string) (State, PatchedBy) {
	hasOwnDir := isDir(filepath.Join(xpuiPath, paths.SxeDir))

	html, err := os.ReadFile(filepath.Join(xpuiPath, "index.html"))
	if err != nil {
		if hasOwnDir {
			return Partial, Sxe
		}
		return Partial, None
	}
	text := string(html)

	if strings.Contains(text, paths.MarkerStart) {
		if isFile(filepath.Join(xpuiPath, paths.SxeDir, "runtime.js")) {
			return Patched, Sxe
		}
		return Partial, Sxe
	}

	if regexp.MustCompile(`(?i)spicetify`).MatchString(text) {
		return ForeignState, Spicetify
	}

	if hasOwnDir {
		return Partial, Sxe
	}

	return Stock, None
}

// Describe turns a candidate into an Install, or nil when it is not a Spotify folder.
func Describe(candidate Candidate, backupManifest func(id string, version string) (string, bool)) *Install {
	appsPath := filepath.Join(candidate.Root, "Apps")
	if !isDir(appsPath) {
		return nil
	}

	xpuiPath := filepath.Join(appsPath, "xpui")
	install := &Install{
		ID:       toID(candidate.Root),
		Name:     "Spotify",
		Root:     candidate.Root,
		AppsPath: appsPath,
		XpuiPath: xpuiPath,
		Variant:  candidate.Variant,
		Version:  readVersion(candidate.Root),
		Arch:     readArch(filepath.Join(candidate.Root, "Spotify.exe")),
	}

	if backupAt, ok := backupManifest(install.ID, install.Version); ok {
		install.HasBackup = true
		install.BackupAt = backupAt
	}

	if !isDir(xpuiPath) {
		if isFile(filepath.Join(appsPath, "xpui.spa")) {
			install.State = Unsupported
			install.Note = "spa"
			return install
		}
		return nil
	}

	install.State, install.PatchedBy = readState(xpuiPath)
	return install
}

// All runs detection over default locations plus the configured extra roots.
func All(extraRoots []string, backupManifest func(id string, version string) (string, bool)) []Install {
	results := []Install{}

	for _, candidate := range Collect(extraRoots) {
		install := Describe(candidate, backupManifest)
		if install == nil {
			continue
		}
		results = append(results, *install)
	}

	sort.Slice(results, func(i, j int) bool {
		rankI, rankJ := 0, 0
		if results[i].Variant == "store" {
			rankI = 1
		}
		if results[j].Variant == "store" {
			rankJ = 1
		}
		if rankI != rankJ {
			return rankI < rankJ
		}
		return results[i].Root < results[j].Root
	})

	return results
}

// FindByID returns the install with the given id, or nil.
func FindByID(installs []Install, id string) *Install {
	for i := range installs {
		if installs[i].ID == id {
			return &installs[i]
		}
	}
	return nil
}

// FindByRoot returns the install whose root matches the given folder.
func FindByRoot(installs []Install, root string) *Install {
	clean := filepath.Clean(root)
	for i := range installs {
		if strings.EqualFold(installs[i].Root, clean) {
			return &installs[i]
		}
	}
	return nil
}

// toID mirrors the stable id used by previous releases.
func toID(root string) string {
	lower := strings.ToLower(root)
	volume := strings.ToLower(filepath.VolumeName(root))
	lower = strings.TrimPrefix(lower, volume)
	lower = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(lower, "-")
	lower = strings.Trim(lower, "-")
	if len(lower) > 64 {
		lower = lower[:64]
	}
	if lower == "" {
		return "spotify"
	}
	return lower
}

func isDir(target string) bool {
	info, err := os.Stat(target)
	return err == nil && info.IsDir()
}

func isFile(target string) bool {
	info, err := os.Stat(target)
	return err == nil && !info.IsDir()
}
