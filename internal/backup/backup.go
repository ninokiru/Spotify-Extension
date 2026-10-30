package backup

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/ninokiru/Spotify-Extension/internal/detect"
	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

const (
	// snapshotFolder is the name of the copied client inside a snapshot.
	snapshotFolder = "xpui"
	// unknownVersion is used when the client reports no version at all.
	unknownVersion = "unknown"
	// maxVersionKey caps the length of a version folder name.
	maxVersionKey = 48
)

// backupsRoot holds every snapshot. It is a variable so tests can point it
// at a temporary folder instead of the user data directory.
var backupsRoot = paths.Backups()

// markerBlock matches the block this tool injects into index.html. It is
// built from the shared marker constants so both packages stay in sync.
var markerBlock = regexp.MustCompile(`(?s)` +
	strings.ReplaceAll(regexp.QuoteMeta(paths.MarkerStart), " ", `\s*`) + `.*?` +
	strings.ReplaceAll(regexp.QuoteMeta(paths.MarkerEnd), " ", `\s*`) + `\s*`)

type Manifest struct {
	InstallID string `json:"installId"`
	Version   string `json:"version"`
	CreatedAt string `json:"createdAt"`
	Source    string `json:"source"`
	Files     int    `json:"files"`
}

// snapshot is one stored copy of a client folder.
type snapshot struct {
	// dir is the folder holding the copy, the copied client lives in
	// dir/xpui.
	dir string
	// manifest describes the copy.
	manifest *Manifest
}

// dirFor returns the root folder holding every snapshot of one install.
func dirFor(installID string) string {
	return filepath.Join(backupsRoot, installID)
}

// versionDir returns the folder of the snapshot stored for one version.
func versionDir(installID string, version string) string {
	return filepath.Join(dirFor(installID), versionKey(version))
}

// versionKey sanitises a version string so it can be used as a folder name.
// Only letters, digits, dots, dashes and underscores survive; everything
// else is dropped so a strange version can never escape the backup folder.
func versionKey(version string) string {
	cleaned := strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			return r
		case r == '.', r == '_', r == '-':
			return r
		}
		return -1
	}, version)

	cleaned = strings.Trim(cleaned, ".-")
	if cleaned == "" {
		return unknownVersion
	}
	if len(cleaned) > maxVersionKey {
		cleaned = cleaned[:maxVersionKey]
	}
	return cleaned
}

// readManifestFile parses a manifest file and returns nil when it is
// missing or unreadable.
func readManifestFile(path string) *Manifest {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	manifest := &Manifest{}
	if err := json.Unmarshal(raw, manifest); err != nil {
		return nil
	}
	return manifest
}

// SnapshotFor returns the manifest of the snapshot stored for exactly one
// version, or nil when that version has no snapshot yet.
func SnapshotFor(installID string, version string) *Manifest {
	return readManifestFile(filepath.Join(versionDir(installID, version), paths.BackupManifest))
}

// legacyManifest reads the manifest of the pre-version layout, where a single
// snapshot lived directly in the install folder.
func legacyManifest(installID string) *Manifest {
	return readManifestFile(filepath.Join(dirFor(installID), paths.BackupManifest))
}

// listSnapshots returns every versioned snapshot of one install, oldest
// first.
func listSnapshots(installID string) []snapshot {
	entries, err := os.ReadDir(dirFor(installID))
	if err != nil {
		return nil
	}

	list := []snapshot{}
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		dir := filepath.Join(dirFor(installID), entry.Name())
		manifest := readManifestFile(filepath.Join(dir, paths.BackupManifest))
		if manifest == nil {
			continue
		}
		list = append(list, snapshot{dir: dir, manifest: manifest})
	}

	sort.Slice(list, func(i, j int) bool {
		return list[i].manifest.CreatedAt < list[j].manifest.CreatedAt
	})
	return list
}

// findSnapshot resolves the snapshot to use for a version: the exact version
// first, then the legacy single snapshot layout and finally the snapshot
// created last.
func findSnapshot(installID string, version string) (snapshot, bool) {
	if manifest := SnapshotFor(installID, version); manifest != nil {
		return snapshot{dir: versionDir(installID, version), manifest: manifest}, true
	}

	if manifest := legacyManifest(installID); manifest != nil {
		return snapshot{dir: dirFor(installID), manifest: manifest}, true
	}

	list := listSnapshots(installID)
	if len(list) == 0 {
		return snapshot{}, false
	}
	return list[len(list)-1], true
}

// Read returns the manifest of the backup matching the given version, or nil
// when the install has no backup at all.
func Read(installID string, version string) *Manifest {
	found, ok := findSnapshot(installID, version)
	if !ok {
		return nil
	}
	return found.manifest
}

// ReadSummary exposes the createdAt of a backup for detection.
func ReadSummary(installID string, version string) (string, bool) {
	manifest := Read(installID, version)
	if manifest == nil {
		return "", false
	}
	return manifest.CreatedAt, true
}

// Ensure snapshots the current xpui folder the first time a version is
// patched. Every version gets its own snapshot, so a Spotify update never
// reuses the backup of the previous release. Later calls are no-ops so a
// repair never overwrites the pristine copy with our own files.
func Ensure(install *detect.Install) (*Manifest, error) {
	if existing := SnapshotFor(install.ID, install.Version); existing != nil {
		return existing, nil
	}

	base := dirFor(install.ID)
	if err := os.MkdirAll(base, 0o755); err != nil {
		return nil, err
	}

	// The copy is staged first so a failure never leaves a half written
	// snapshot behind.
	staging := filepath.Join(base, ".staging-"+versionKey(install.Version))
	if err := os.RemoveAll(staging); err != nil {
		return nil, err
	}
	defer func() { _ = os.RemoveAll(staging) }()

	if err := copyTree(install.XpuiPath, filepath.Join(staging, snapshotFolder)); err != nil {
		return nil, err
	}
	if err := stripMarker(filepath.Join(staging, snapshotFolder, "index.html")); err != nil {
		return nil, err
	}

	manifest := &Manifest{
		InstallID: install.ID,
		Version:   install.Version,
		CreatedAt: time.Now().Format(time.RFC3339),
		Source:    install.XpuiPath,
		Files:     countFiles(filepath.Join(staging, snapshotFolder)),
	}

	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(filepath.Join(staging, paths.BackupManifest), append(data, '\n'), 0o644); err != nil {
		return nil, err
	}

	final := versionDir(install.ID, install.Version)
	if err := os.RemoveAll(final); err != nil {
		return nil, err
	}
	if err := os.Rename(staging, final); err != nil {
		return nil, err
	}

	return manifest, nil
}

// Restore copies the pristine snapshot back over the live client.
// It returns false when no backup exists.
func Restore(install *detect.Install) (bool, error) {
	candidates := []snapshot{}

	if manifest := SnapshotFor(install.ID, install.Version); manifest != nil {
		candidates = append(candidates, snapshot{dir: versionDir(install.ID, install.Version), manifest: manifest})
	}
	if manifest := legacyManifest(install.ID); manifest != nil {
		candidates = append(candidates, snapshot{dir: dirFor(install.ID), manifest: manifest})
	}

	list := listSnapshots(install.ID)
	for i := len(list) - 1; i >= 0; i-- {
		candidates = append(candidates, list[i])
	}

	for _, candidate := range candidates {
		source := filepath.Join(candidate.dir, snapshotFolder)
		if !isDir(source) {
			continue
		}
		return true, copyDir(source, install.XpuiPath)
	}

	return false, nil
}

// copyTree copies the client folder while skipping our own payload folder,
// so a snapshot never stores files we injected ourselves.
func copyTree(source, target string) error {
	return filepath.WalkDir(source, func(entryPath string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relative, err := filepath.Rel(source, entryPath)
		if err != nil {
			return err
		}

		if entry.IsDir() {
			if relative != "." && entry.Name() == paths.SxeDir {
				return filepath.SkipDir
			}
			return os.MkdirAll(filepath.Join(target, relative), 0o755)
		}

		data, err := os.ReadFile(entryPath)
		if err != nil {
			return err
		}
		return os.WriteFile(filepath.Join(target, relative), data, 0o644)
	})
}

// stripMarker removes the injected marker block from a copied index.html so a
// snapshot stays pristine even when the client was already patched.
func stripMarker(file string) error {
	raw, err := os.ReadFile(file)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	clean := markerBlock.ReplaceAllString(string(raw), "")
	if clean == string(raw) {
		return nil
	}
	return os.WriteFile(file, []byte(clean), 0o644)
}

// copyDir copies source over target without removing files the target owns.
func copyDir(source, target string) error {
	return filepath.WalkDir(source, func(entryPath string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relative, err := filepath.Rel(source, entryPath)
		if err != nil {
			return err
		}

		targetPath := filepath.Join(target, relative)
		if entry.IsDir() {
			return os.MkdirAll(targetPath, 0o755)
		}

		data, err := os.ReadFile(entryPath)
		if err != nil {
			return err
		}
		return os.WriteFile(targetPath, data, 0o644)
	})
}

func countFiles(root string) int {
	total := 0
	_ = filepath.WalkDir(root, func(_ string, entry fs.DirEntry, err error) error {
		if err == nil && !entry.IsDir() {
			total++
		}
		return nil
	})
	return total
}

func isDir(target string) bool {
	info, err := os.Stat(target)
	return err == nil && info.IsDir()
}
