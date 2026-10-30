package update

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ninokiru/Spotify-Extension/internal/msg"
)

const releaseAPI = "https://api.github.com/repos/ninokiru/Spotify-Extension/releases/latest"

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
		if strings.Contains(file.Name, "windows") && strings.HasSuffix(file.Name, ".zip") {
			return payload.Tag, file.URL, nil
		}
	}

	return payload.Tag, "", nil
}

// Replace downloads the zip and swaps the running binary and its assets.
// On Windows a running exe can be renamed, so the old file is parked as
// sxe.old.exe and removed on the next run.
func Replace(lang, tag, url string) error {
	if url == "" {
		return errors.New(msg.Get(lang, "update.notfound"))
	}

	fmt.Println(msg.Get(lang, "update.download", tag))

	client := http.Client{Timeout: 5 * time.Minute}
	response, err := client.Get(url)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	temp, err := os.CreateTemp("", "sxe-update-*.zip")
	if err != nil {
		return err
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)

	if _, err := io.Copy(temp, response.Body); err != nil {
		temp.Close()
		return err
	}
	temp.Close()

	staging, err := os.MkdirTemp("", "sxe-staging-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(staging)

	if err := unzip(tempPath, staging); err != nil {
		return err
	}

	exeDir, err := exeDir()
	if err != nil {
		return err
	}

	failed := false

	// Replace the binary first: rename the running exe, then move the new one in.
	exePath := filepath.Join(exeDir, "sxe.exe")
	if _, err := os.Stat(exePath); err == nil {
		old := filepath.Join(exeDir, "sxe.old.exe")
		_ = os.Remove(old)
		if err := os.Rename(exePath, old); err != nil {
			failed = true
		}
	}

	newExe := filepath.Join(staging, "sxe.exe")
	if !failed {
		if data, err := os.ReadFile(newExe); err == nil {
			if err := os.WriteFile(exePath, data, 0o755); err != nil {
				failed = true
			}
		} else {
			failed = true
		}
	}

	// Replace the asset folders wholesale.
	for _, folder := range []string{"extensions", "themes", "snippets", "runtime"} {
		source := filepath.Join(staging, folder)
		target := filepath.Join(exeDir, folder)
		if _, err := os.Stat(source); err != nil {
			continue
		}
		if err := os.RemoveAll(target); err != nil {
			failed = true
			continue
		}
		if err := copyDir(source, target); err != nil {
			failed = true
		}
	}

	if failed {
		return errors.New(msg.Get(lang, "update.locked"))
	}

	// Clean up the parked old binary when the filesystem allows it.
	if old := filepath.Join(exeDir, "sxe.old.exe"); fileExists(old) {
		_ = os.Remove(old)
	}

	return nil
}

func unzip(file, target string) error {
	reader, err := zip.OpenReader(file)
	if err != nil {
		return err
	}
	defer reader.Close()

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

		if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return err
		}

		source, err := entry.Open()
		if err != nil {
			return err
		}
		data, err := io.ReadAll(source)
		source.Close()
		if err != nil {
			return err
		}

		if err := os.WriteFile(targetPath, data, 0o644); err != nil {
			return err
		}
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
