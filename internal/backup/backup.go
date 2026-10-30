package backup

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/ninokiru/Spotify-Extension/internal/detect"
	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

type Manifest struct {
	InstallID string `json:"installId"`
	Version   string `json:"version"`
	CreatedAt string `json:"createdAt"`
	Source    string `json:"source"`
	Files     int    `json:"files"`
}

func dirFor(installID string) string {
	return filepath.Join(paths.Backups(), installID)
}

// Read returns the manifest for an install, or nil.
func Read(installID string) *Manifest {
	raw, err := os.ReadFile(filepath.Join(dirFor(installID), paths.BackupManifest))
	if err != nil {
		return nil
	}
	manifest := &Manifest{}
	if json.Unmarshal(raw, manifest) != nil {
		return nil
	}
	return manifest
}

// ReadSummary exposes the createdAt of a backup for detection.
func ReadSummary(installID string) (string, bool) {
	manifest := Read(installID)
	if manifest == nil {
		return "", false
	}
	return manifest.CreatedAt, true
}

// Ensure snapshots the current xpui folder the first time an install is
// patched. Later calls are no-ops so a repair never overwrites the pristine
// copy with our own files.
func Ensure(install *detect.Install) (*Manifest, error) {
	if existing := Read(install.ID); existing != nil {
		return existing, nil
	}

	dir := dirFor(install.ID)
	if err := os.RemoveAll(dir); err != nil {
		return nil, err
	}

	if err := copyDir(install.XpuiPath, filepath.Join(dir, "xpui")); err != nil {
		return nil, err
	}

	manifest := &Manifest{
		InstallID: install.ID,
		Version:   install.Version,
		CreatedAt: time.Now().Format(time.RFC3339),
		Source:    install.XpuiPath,
		Files:     countFiles(filepath.Join(dir, "xpui")),
	}

	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(filepath.Join(dir, paths.BackupManifest), append(data, '\n'), 0o644); err != nil {
		return nil, err
	}

	return manifest, nil
}

// Restore copies the pristine snapshot back over the live client.
// It returns false when no backup exists.
func Restore(install *detect.Install) (bool, error) {
	source := filepath.Join(dirFor(install.ID), "xpui")
	if !isDir(source) {
		return false, nil
	}
	return true, copyDir(source, install.XpuiPath)
}

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
