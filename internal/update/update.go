package update

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ninokiru/Spotify-Extension/internal/msg"
)

const releaseAPI = "https://api.github.com/repos/ninokiru/Spotify-Extension/releases/latest"

// Limits applied to the release archive and to the files taken out of it.
const (
	// maxArchiveSize caps the downloaded release zip (64 MiB).
	maxArchiveSize int64 = 64 << 20
	// maxEntrySize caps a single extracted file (32 MiB).
	maxEntrySize int64 = 32 << 20
	// maxEntries caps how many entries the archive may hold.
	maxEntries = 512
	// maxExtractedSize caps the total extracted size (256 MiB).
	maxExtractedSize int64 = 256 << 20
)

// allowedAssetHosts lists the hosts that are allowed to serve a release asset.
var allowedAssetHosts = map[string]bool{
	"github.com":                          true,
	"objects.githubusercontent.com":        true,
	"release-assets.githubusercontent.com": true,
}

type asset struct {
	Name string `json:"name"`
	URL  string `json:"browser_download_url"`
}

type release struct {
	Tag    string  `json:"tag_name"`
	Assets []asset `json:"assets"`
}

// Latest returns the newest release tag and the zip asset for Windows.
func Latest() (string, string, error) {
	client := http.Client{Timeout: 15 * time.Second}
	response, err := client.Get(releaseAPI)
	if err != nil {
		return "", "", err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("release api: %d", response.StatusCode)
	}

	payload := &release{}
	if err := json.NewDecoder(response.Body).Decode(payload); err != nil {
		return "", "", err
	}

	for _, file := range payload.Assets {
		if !strings.Contains(file.Name, "windows") || !strings.HasSuffix(file.Name, ".zip") {
			continue
		}
		// The asset url comes from the API, so the host is checked before it
		// is handed over to the downloader.
		if validateAssetURL(file.URL) != nil {
			continue
		}
		return payload.Tag, file.URL, nil
	}

	return payload.Tag, "", nil
}

// NormalizeTag drops the leading "v" of a release tag so the tag can be
// compared with a plain semantic version string.
func NormalizeTag(tag string) string {
	return strings.TrimPrefix(strings.TrimSpace(tag), "v")
}

// Replace downloads the zip and swaps the running binary and its assets.
// On Windows a running exe can be renamed, so the old file is parked as
// sxe.old.exe and removed once the whole update succeeded. When the new
// binary cannot be written the parked one is put back, so the tool never ends
// up without a working executable.
func Replace(lang, tag, url string) error {
	if url == "" {
		return errors.New(msg.Get(lang, "update.notfound"))
	}

	if err := validateAssetURL(url); err != nil {
		return err
	}

	fmt.Println(msg.Get(lang, "update.download", tag))

	archive, err := downloadArchive(url)
	if err != nil {
		return err
	}
	defer os.Remove(archive)

	staging, err := os.MkdirTemp("", "sxe-staging-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(staging)

	if err := unzip(archive, staging); err != nil {
		return err
	}

	installDir, err := exeDir()
	if err != nil {
		return err
	}

	exePath := filepath.Join(installDir, "sxe.exe")
	oldPath := filepath.Join(installDir, "sxe.old.exe")

	failed := false
	parked := false
	written := false

	// Park the running binary so it can be replaced. The parked copy is kept
	// until everything worked out, so it can be restored on failure.
	if _, err := os.Stat(exePath); err == nil {
		_ = os.Remove(oldPath)
		if err := os.Rename(exePath, oldPath); err != nil {
			failed = true
		} else {
			parked = true
		}
	}

	newExe := filepath.Join(staging, "sxe.exe")
	if !failed {
		data, readErr := os.ReadFile(newExe)
		switch {
		case readErr != nil:
			failed = true
		default:
			if err := os.WriteFile(exePath, data, 0o755); err != nil {
				failed = true
				// A half written file would be a broken executable.
				_ = os.Remove(exePath)
			} else {
				written = true
			}
		}
	}

	// Replace the asset folders wholesale, but only once the binary is in
	// place: a failed binary must not leave half-new assets behind.
	if !failed {
		for _, folder := range []string{"extensions", "themes", "snippets", "runtime"} {
			source := filepath.Join(staging, folder)
			target := filepath.Join(installDir, folder)
			if _, err := os.Stat(source); err != nil {
				continue
			}
			if err := replaceFolder(source, target); err != nil {
				failed = true
			}
		}
	}

	if failed {
		// Without a new binary the parked one has to come back, otherwise the
		// tool could not be started any more.
		if parked && !written {
			_ = os.Remove(exePath)
			if err := os.Rename(oldPath, exePath); err == nil {
				parked = false
			}
		}
		return errors.New(msg.Get(lang, "update.locked"))
	}

	// Clean up the parked old binary when the filesystem allows it.
	if parked && fileExists(oldPath) {
		_ = os.Remove(oldPath)
	}

	return nil
}

// downloadArchive stores the release zip in a temporary file and returns its
// path. The download is size limited, so a broken or hostile response cannot
// fill the disk.
func downloadArchive(assetURL string) (string, error) {
	client := http.Client{
		Timeout: 5 * time.Minute,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return validateAssetURL(req.URL.String())
		},
	}

	response, err := client.Get(assetURL)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	// The status is checked before anything is written, so an error page is
	// never stored as if it was the release archive.
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("release download failed with status %d", response.StatusCode)
	}

	if response.ContentLength > maxArchiveSize {
		return "", fmt.Errorf("the release archive is larger than %d bytes", maxArchiveSize)
	}

	temp, err := os.CreateTemp("", "sxe-update-*.zip")
	if err != nil {
		return "", err
	}
	tempPath := temp.Name()

	written, copyErr := io.Copy(temp, io.LimitReader(response.Body, maxArchiveSize+1))
	closeErr := temp.Close()
	if copyErr != nil {
		_ = os.Remove(tempPath)
		return "", copyErr
	}
	if closeErr != nil {
		_ = os.Remove(tempPath)
		return "", closeErr
	}
	if written > maxArchiveSize {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("the release archive is larger than %d bytes", maxArchiveSize)
	}

	return tempPath, nil
}

// unzip extracts the archive into target. Entries that try to leave the target
// folder are skipped and the extracted amount of data is bounded.
func unzip(file, target string) error {
	reader, err := zip.OpenReader(file)
	if err != nil {
		return err
	}
	defer reader.Close()

	if len(reader.File) > maxEntries {
		return fmt.Errorf("the release archive holds %d entries, the limit is %d", len(reader.File), maxEntries)
	}

	var total int64

	for _, entry := range reader.File {
		name := strings.ReplaceAll(entry.Name, "\\", "/")
		name = strings.TrimPrefix(name, "./")

		// Keep only top-level entries, and refuse paths that escape the folder.
		cleaned := filepath.Clean(filepath.FromSlash(name))
		if cleaned == "." || strings.HasPrefix(cleaned, "..") || filepath.IsAbs(cleaned) {
			continue
		}
		if strings.Contains(cleaned, string(filepath.Separator)+"..") {
			continue
		}
		if strings.Count(cleaned, string(filepath.Separator)) > 2 {
			continue
		}

		targetPath := filepath.Join(target, cleaned)
		if entry.FileInfo().IsDir() {
			if err := os.MkdirAll(targetPath, 0o755); err != nil {
				return err
			}
			continue
		}

		if entry.UncompressedSize64 > uint64(maxEntrySize) {
			return fmt.Errorf("%s is larger than the %d byte limit", cleaned, maxEntrySize)
		}
		if total > maxExtractedSize-int64(entry.UncompressedSize64) {
			return fmt.Errorf("the release archive expands beyond the %d byte limit", maxExtractedSize)
		}

		if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return err
		}

		source, err := entry.Open()
		if err != nil {
			return err
		}
		data, readErr := io.ReadAll(io.LimitReader(source, maxEntrySize+1))
		source.Close()
		if readErr != nil {
			return readErr
		}
		if int64(len(data)) > maxEntrySize {
			return fmt.Errorf("%s is larger than the %d byte limit", cleaned, maxEntrySize)
		}
		if total > maxExtractedSize-int64(len(data)) {
			return fmt.Errorf("the release archive expands beyond the %d byte limit", maxExtractedSize)
		}
		total += int64(len(data))

		if err := os.WriteFile(targetPath, data, 0o644); err != nil {
			return err
		}
	}

	return nil
}

// validateAssetURL makes sure a release archive is only fetched over https
// from one of the official GitHub hosts.
func validateAssetURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid release url: %s", rawURL)
	}
	if parsed.Scheme != "https" {
		return fmt.Errorf("the release url must use https: %s", rawURL)
	}
	if parsed.User != nil || parsed.Port() != "" {
		return fmt.Errorf("the release url must not carry credentials or a port: %s", rawURL)
	}
	host := strings.ToLower(parsed.Hostname())
	if !allowedAssetHosts[host] {
		return fmt.Errorf("unexpected release host: %s", host)
	}
	return nil
}

func exeDir() (string, error) {
	executable, err := os.Executable()
	if err != nil {
		return "", err
	}
	return filepath.Dir(executable), nil
}

// replaceFolder swaps a folder for a fresh copy. The new copy is staged next
// to the target, so a failure does not leave the target half written.
func replaceFolder(source, target string) error {
	staged := target + ".new"

	if err := os.RemoveAll(staged); err != nil {
		return err
	}
	if err := copyDir(source, staged); err != nil {
		_ = os.RemoveAll(staged)
		return err
	}
	if err := os.RemoveAll(target); err != nil {
		_ = os.RemoveAll(staged)
		return err
	}
	if err := os.Rename(staged, target); err != nil {
		_ = os.RemoveAll(staged)
		return err
	}
	return nil
}

func copyDir(source, target string) error {
	return filepath.WalkDir(source, func(entryPath string, entry os.DirEntry, err error) error {
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

func fileExists(target string) bool {
	info, err := os.Stat(target)
	return err == nil && !info.IsDir()
}
