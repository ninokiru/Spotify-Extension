package update

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"testing"
)

// nulReader yields zero bytes forever, which lets a test build an entry of an
// exact size without allocating it in memory.
type nulReader struct{}

func (nulReader) Read(p []byte) (int, error) {
	for i := range p {
		p[i] = 0
	}
	return len(p), nil
}

// writeZip stores the given files in a fresh archive.
func writeZip(t *testing.T, path string, files map[string]string) {
	t.Helper()

	file, err := os.Create(path)
	if err != nil {
		t.Fatalf("create archive: %v", err)
	}
	writer := zip.NewWriter(file)

	for name, content := range files {
		entry, err := writer.Create(name)
		if err != nil {
			_ = file.Close()
			t.Fatalf("create entry %q: %v", name, err)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			_ = file.Close()
			t.Fatalf("write entry %q: %v", name, err)
		}
	}

	if err := writer.Close(); err != nil {
		_ = file.Close()
		t.Fatalf("close archive writer: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close archive file: %v", err)
	}
}

func TestValidateAssetURL(t *testing.T) {
	accepted := []string{
		"https://github.com/x/y/releases/download/v1/a.zip",
		"https://objects.githubusercontent.com/x",
		"https://release-assets.githubusercontent.com/x",
	}
	for _, raw := range accepted {
		if err := validateAssetURL(raw); err != nil {
			t.Errorf("validateAssetURL(%q) = %v, want nil", raw, err)
		}
	}

	rejected := []string{
		"http://github.com/x",
		"https://evil.com/x",
		"https://raw.githubusercontent.com/x",
		"https://github.com:8443/x",
		"",
	}
	for _, raw := range rejected {
		if err := validateAssetURL(raw); err == nil {
			t.Errorf("validateAssetURL(%q) = nil, want an error", raw)
		}
	}
}

func TestUnzipExtractsFiles(t *testing.T) {
	root := t.TempDir()
	archive := filepath.Join(root, "release.zip")
	writeZip(t, archive, map[string]string{"sxe.exe": "binary"})

	target := filepath.Join(root, "out")
	if err := unzip(archive, target); err != nil {
		t.Fatalf("unzip: %v", err)
	}

	raw, err := os.ReadFile(filepath.Join(target, "sxe.exe"))
	if err != nil {
		t.Fatalf("read extracted file: %v", err)
	}
	if string(raw) != "binary" {
		t.Errorf("extracted content = %q, want %q", string(raw), "binary")
	}
}

func TestUnzipSkipsTraversal(t *testing.T) {
	root := t.TempDir()
	archive := filepath.Join(root, "release.zip")
	writeZip(t, archive, map[string]string{"../evil.txt": "bad"})

	target := filepath.Join(root, "out")
	if err := unzip(archive, target); err != nil {
		t.Fatalf("unzip: %v", err)
	}

	outside := filepath.Join(filepath.Dir(target), "evil.txt")
	if _, err := os.Stat(outside); !os.IsNotExist(err) {
		t.Errorf("traversal entry escaped the target folder, stat error = %v", err)
	}
}

func TestUnzipRejectsOversizedEntry(t *testing.T) {
	root := t.TempDir()
	archive := filepath.Join(root, "release.zip")

	file, err := os.Create(archive)
	if err != nil {
		t.Fatalf("create archive: %v", err)
	}
	writer := zip.NewWriter(file)
	entry, err := writer.Create("big.bin")
	if err != nil {
		_ = file.Close()
		t.Fatalf("create entry: %v", err)
	}
	if _, err := io.CopyN(entry, nulReader{}, maxEntrySize+1); err != nil {
		_ = file.Close()
		t.Fatalf("write oversized entry: %v", err)
	}
	if err := writer.Close(); err != nil {
		_ = file.Close()
		t.Fatalf("close archive writer: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close archive file: %v", err)
	}

	if err := unzip(archive, filepath.Join(root, "out")); err == nil {
		t.Fatal("unzip accepted an oversized entry")
	}
}

func TestUnzipRejectsTooManyEntries(t *testing.T) {
	root := t.TempDir()
	archive := filepath.Join(root, "release.zip")

	file, err := os.Create(archive)
	if err != nil {
		t.Fatalf("create archive: %v", err)
	}
	writer := zip.NewWriter(file)
	for i := 0; i < maxEntries+1; i++ {
		if _, err := writer.Create(fmt.Sprintf("f%03d.txt", i)); err != nil {
			_ = file.Close()
			t.Fatalf("create entry %d: %v", i, err)
		}
	}
	if err := writer.Close(); err != nil {
		_ = file.Close()
		t.Fatalf("close archive writer: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close archive file: %v", err)
	}

	if err := unzip(archive, filepath.Join(root, "out")); err == nil {
		t.Fatal("unzip accepted an archive with too many entries")
	}
}
