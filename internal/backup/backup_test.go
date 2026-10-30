package backup

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/ninokiru/Spotify-Extension/internal/detect"
	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

// makeInstall builds a fake Spotify client with the payload injected and
// returns an Install pointing at it. Every call gets its own folder.
func makeInstall(t *testing.T, version string) *detect.Install {
	t.Helper()

	xpui := filepath.Join(t.TempDir(), "xpui")
	payload := filepath.Join(xpui, paths.SxeDir)
	if err := os.MkdirAll(payload, 0o755); err != nil {
		t.Fatalf("create payload folder: %v", err)
	}

	index := "<html>original</html>\n" +
		paths.MarkerStart + "\n" +
		"<script src=\"sxe/runtime.js\"></script>\n" +
		paths.MarkerEnd + "\n"
	if err := os.WriteFile(filepath.Join(xpui, "index.html"), []byte(index), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}
	if err := os.WriteFile(filepath.Join(payload, "runtime.js"), []byte("// runtime"), 0o644); err != nil {
		t.Fatalf("write runtime.js: %v", err)
	}
	if err := os.WriteFile(filepath.Join(xpui, "app.js"), []byte("// app"), 0o644); err != nil {
		t.Fatalf("write app.js: %v", err)
	}

	return &detect.Install{
		ID:       "test-install",
		Version:  version,
		XpuiPath: xpui,
	}
}

func readTestFile(t *testing.T, path string) string {
	t.Helper()

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(raw)
}

func TestEnsureWritesPristineSnapshot(t *testing.T) {
	backupsRoot = t.TempDir()
	install := makeInstall(t, "1.2.50")

	manifest, err := Ensure(install)
	if err != nil {
		t.Fatalf("Ensure: %v", err)
	}
	if manifest == nil {
		t.Fatal("Ensure returned a nil manifest")
	}

	stored := SnapshotFor("test-install", "1.2.50")
	if stored == nil {
		t.Fatal("SnapshotFor returned nil after Ensure")
	}
	if stored.Version != "1.2.50" {
		t.Errorf("Version = %q, want %q", stored.Version, "1.2.50")
	}
	if stored.Files <= 0 {
		t.Errorf("Files = %d, want > 0", stored.Files)
	}

	sxeDir := filepath.Join(backupsRoot, "test-install", "1.2.50", "xpui", paths.SxeDir)
	if _, err := os.Stat(sxeDir); !os.IsNotExist(err) {
		t.Errorf("snapshot must not contain the payload folder, stat error = %v", err)
	}

	snapshotIndex := filepath.Join(backupsRoot, "test-install", "1.2.50", "xpui", "index.html")
	html := readTestFile(t, snapshotIndex)
	if strings.Contains(html, paths.MarkerStart) {
		t.Errorf("snapshot index.html still contains the start marker: %q", html)
	}
	if !strings.Contains(html, "<html>original</html>") {
		t.Errorf("snapshot index.html lost the original content: %q", html)
	}
}

func TestEnsureKeepsExistingSnapshot(t *testing.T) {
	backupsRoot = t.TempDir()
	install := makeInstall(t, "1.2.50")

	first, err := Ensure(install)
	if err != nil {
		t.Fatalf("first Ensure: %v", err)
	}
	second, err := Ensure(install)
	if err != nil {
		t.Fatalf("second Ensure: %v", err)
	}

	firstCreated := first.CreatedAt
	if firstCreated == "" {
		t.Fatal("first manifest has an empty CreatedAt")
	}
	if second.CreatedAt != firstCreated {
		t.Errorf("CreatedAt = %q, want the existing %q", second.CreatedAt, firstCreated)
	}

	indexPath := filepath.Join(install.XpuiPath, "index.html")
	if err := os.WriteFile(indexPath, []byte("<html>original</html>changed"), 0o644); err != nil {
		t.Fatalf("modify client index.html: %v", err)
	}

	restored, err := Restore(install)
	if err != nil {
		t.Fatalf("Restore: %v", err)
	}
	if !restored {
		t.Fatal("Restore reported no backup")
	}

	html := readTestFile(t, indexPath)
	if strings.Contains(html, "changed") {
		t.Errorf("restored index.html still contains the edit: %q", html)
	}
	if !strings.Contains(html, "<html>original</html>") {
		t.Errorf("restored index.html lost the pristine content: %q", html)
	}
}

func TestEnsureSeparatesVersions(t *testing.T) {
	backupsRoot = t.TempDir()

	clientA := makeInstall(t, "1.2.50")
	if _, err := Ensure(clientA); err != nil {
		t.Fatalf("Ensure 1.2.50: %v", err)
	}

	clientB := makeInstall(t, "1.2.51")
	indexB := filepath.Join(clientB.XpuiPath, "index.html")
	if err := os.WriteFile(indexB, []byte("<html>v515</html>"), 0o644); err != nil {
		t.Fatalf("write client B index.html: %v", err)
	}
	if _, err := Ensure(clientB); err != nil {
		t.Fatalf("Ensure 1.2.51: %v", err)
	}

	if SnapshotFor("test-install", "1.2.50") == nil {
		t.Fatal("snapshot for 1.2.50 is missing")
	}
	if SnapshotFor("test-install", "1.2.51") == nil {
		t.Fatal("snapshot for 1.2.51 is missing")
	}

	restored, err := Restore(clientB)
	if err != nil {
		t.Fatalf("Restore: %v", err)
	}
	if !restored {
		t.Fatal("Restore reported no backup")
	}

	html := readTestFile(t, indexB)
	if !strings.Contains(html, "v515") {
		t.Errorf("restored index.html does not contain the 1.2.51 content: %q", html)
	}
	if strings.Contains(html, "<html>original</html>") {
		t.Errorf("restored index.html contains the 1.2.50 content: %q", html)
	}
}

func TestRestoreFallsBackToLegacyLayout(t *testing.T) {
	backupsRoot = t.TempDir()

	legacyXpui := filepath.Join(backupsRoot, "test-install", "xpui")
	if err := os.MkdirAll(legacyXpui, 0o755); err != nil {
		t.Fatalf("create legacy snapshot: %v", err)
	}
	if err := os.WriteFile(filepath.Join(legacyXpui, "index.html"), []byte("<html>legacy</html>"), 0o644); err != nil {
		t.Fatalf("write legacy index.html: %v", err)
	}

	manifest := `{"installId":"test-install","version":"1.0.0","createdAt":"2024-01-01T00:00:00Z","source":"x","files":1}`
	manifestPath := filepath.Join(backupsRoot, "test-install", paths.BackupManifest)
	if err := os.WriteFile(manifestPath, []byte(manifest), 0o644); err != nil {
		t.Fatalf("write legacy manifest: %v", err)
	}

	install := makeInstall(t, "9.9.9")
	restored, err := Restore(install)
	if err != nil {
		t.Fatalf("Restore: %v", err)
	}
	if !restored {
		t.Fatal("Restore did not use the legacy snapshot")
	}

	html := readTestFile(t, filepath.Join(install.XpuiPath, "index.html"))
	if !strings.Contains(html, "legacy") {
		t.Errorf("restored index.html does not contain the legacy content: %q", html)
	}
}

func TestRestoreWithoutBackup(t *testing.T) {
	backupsRoot = t.TempDir()
	install := makeInstall(t, "1.2.50")

	restored, err := Restore(install)
	if err != nil {
		t.Fatalf("Restore: %v", err)
	}
	if restored {
		t.Fatal("Restore reported a backup although none exists")
	}
}
