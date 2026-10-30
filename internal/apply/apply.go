package apply

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/ninokiru/Spotify-Extension/internal/config"
	"github.com/ninokiru/Spotify-Extension/internal/detect"
	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

// Extension describes one enabled JS file copied into the client.
type Extension struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	File string `json:"file"`
}

type manifestSettings map[string]bool

type manifest struct {
	Version     string           `json:"version"`
	Repo        string           `json:"repo"`
	Language    string           `json:"language"`
	SafeMode    bool             `json:"safeMode"`
	Settings    manifestSettings `json:"settings"`
	GeneratedAt string           `json:"generatedAt"`
	Extensions  []Extension      `json:"extensions"`
}

var blockPattern = regexp.MustCompile(`(?s)<!--\s*sxe:start\s*-->.*?<!--\s*sxe:end\s*-->\s*`)

// ListExtensions returns every JS extension found in the user and bundled
// folders, user folder first so a downloaded update wins.
func ListExtensions() []Extension {
	byID := map[string]Extension{}

	for _, dir := range []string{paths.UserExtensions(), paths.BundledExtensions()} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".js") {
				continue
			}
			id := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			if _, exists := byID[id]; exists {
				continue
			}
			file := filepath.Join(dir, entry.Name())
			byID[id] = Extension{ID: id, Name: headerField(file, "NAME", id), File: file}
		}
	}

	list := make([]Extension, 0, len(byID))
	for _, extension := range byID {
		list = append(list, extension)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Name < list[j].Name })
	return list
}

// EnabledExtensions resolves the pipe list from the config to real files.
func EnabledExtensions(cfg config.Config) []Extension {
	enabled := map[string]bool{}
	for _, id := range cfg.Extensions {
		enabled[id] = true
	}

	list := []Extension{}
	for _, extension := range ListExtensions() {
		if enabled[extension.ID] {
			list = append(list, extension)
		}
	}
	sort.Slice(list, func(i, j int) bool { return list[i].ID < list[j].ID })
	return list
}

// EnabledSnippets returns the css files for the snippet ids in the config.
func EnabledSnippets(cfg config.Config) []string {
	enabled := map[string]bool{}
	for _, id := range cfg.Snippets {
		enabled[id] = true
	}

	files := []string{}
	for _, dir := range []string{paths.UserSnippets(), paths.BundledSnippets()} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".css") {
				continue
			}
			id := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			if !enabled[id] {
				continue
			}
			files = append(files, filepath.Join(dir, entry.Name()))
		}
	}
	return files
}

// ComposeUserCss builds user.css: active theme, then snippets, then custom CSS.
func ComposeUserCss(cfg config.Config) string {
	parts := []string{}

	if cfg.Theme != "" {
		for _, dir := range []string{paths.UserThemes(), paths.BundledThemes()} {
			themePath := filepath.Join(dir, cfg.Theme)
			if css := readFirst(themePath, "user.css", "theme.css"); css != "" {
				parts = append(parts, css)
				break
			}
		}
	}

	for _, file := range EnabledSnippets(cfg) {
		if css, err := os.ReadFile(file); err == nil {
			parts = append(parts, string(css))
		}
	}

	if custom, err := os.ReadFile(paths.CustomCss()); err == nil {
		if text := strings.TrimSpace(string(custom)); text != "" {
			parts = append(parts, text)
		}
	}

	return strings.Join(parts, "\n\n")
}

// WritePayload writes runtime.js, colors.css, user.css, manifest.js and the
// enabled extensions into Apps/xpui/sxe.
func WritePayload(install *detect.Install, cfg config.Config, version string) error {
	target := filepath.Join(install.XpuiPath, paths.SxeDir)

	if err := os.RemoveAll(target); err != nil {
		return err
	}
	if err := os.MkdirAll(target, 0o755); err != nil {
		return err
	}

	if !isFile(paths.RuntimeFile()) {
		return os.ErrNotExist
	}

	runtime, err := os.ReadFile(paths.RuntimeFile())
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(target, "runtime.js"), runtime, 0o644); err != nil {
		return err
	}

	if err := os.WriteFile(filepath.Join(target, "colors.css"), []byte(config.BuildColorsCss(cfg)), 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(target, "user.css"), []byte(ComposeUserCss(cfg)), 0o644); err != nil {
		return err
	}

	extensionsDir := filepath.Join(target, "extensions")
	if err := os.MkdirAll(extensionsDir, 0o755); err != nil {
		return err
	}

	enabled := []Extension{}
	for _, extension := range EnabledExtensions(cfg) {
		data, err := os.ReadFile(extension.File)
		if err != nil {
			continue
		}
		fileName := extension.ID + ".js"
		if err := os.WriteFile(filepath.Join(extensionsDir, fileName), data, 0o644); err != nil {
			return err
		}
		enabled = append(enabled, Extension{ID: extension.ID, Name: extension.Name, File: fileName})
	}

	manifestData := manifest{
		Version:     version,
		Repo:        paths.RepoURL,
		Language:    cfg.Language,
		SafeMode:    cfg.SafeMode,
		Settings:    manifestSettings{"seekButtons": true, "songToast": true, "timeRemaining": false, "updateCheck": true},
		GeneratedAt: time.Now().Format(time.RFC3339),
		Extensions:  enabled,
	}

	encoded, err := json.Marshal(manifestData)
	if err != nil {
		return err
	}
	return os.WriteFile(
		filepath.Join(target, "manifest.js"),
		[]byte("window.__sxeManifest = "+string(encoded)+";\n"),
		0o644,
	)
}

// PatchHtml inserts the sxe block right after <body…>.
func PatchHtml(install *detect.Install) error {
	file := filepath.Join(install.XpuiPath, "index.html")
	raw, err := os.ReadFile(file)
	if err != nil {
		return err
	}

	clean := blockPattern.ReplaceAllString(string(raw), "")
	block := strings.Join([]string{
		paths.MarkerStart,
		`<link rel="stylesheet" href="` + paths.SxeDir + `/colors.css">`,
		`<link rel="stylesheet" href="` + paths.SxeDir + `/user.css">`,
		`<script src="` + paths.SxeDir + `/manifest.js"></script>`,
		`<script src="` + paths.SxeDir + `/runtime.js"></script>`,
		paths.MarkerEnd,
	}, "\n")

	bodyPattern := regexp.MustCompile(`(?i)<body[^>]*>`)
	loc := bodyPattern.FindStringIndex(clean)

	next := clean
	if loc == nil {
		next = clean + "\n" + block + "\n"
	} else {
		end := loc[1]
		next = clean[:end] + "\n" + block + "\n" + clean[end:]
	}

	return os.WriteFile(file, []byte(next), 0o644)
}

// UnpatchHtml removes the sxe block from index.html.
func UnpatchHtml(install *detect.Install) error {
	file := filepath.Join(install.XpuiPath, "index.html")
	raw, err := os.ReadFile(file)
	if err != nil {
		return nil
	}
	clean := blockPattern.ReplaceAllString(string(raw), "")
	if clean == string(raw) {
		return nil
	}
	return os.WriteFile(file, []byte(clean), 0o644)
}

// RemovePayload deletes the whole sxe folder from the client.
func RemovePayload(install *detect.Install) error {
	return os.RemoveAll(filepath.Join(install.XpuiPath, paths.SxeDir))
}

// ExtensionHeader describes an extension file found in a folder.
type ExtensionHeader struct {
	ID      string
	Name    string
	Version string
	File    string
}

// ExtensionHeader reads the header comments of <dir>/<id>.js.
func ExtensionHeader(dir, id string) ExtensionHeader {
	file := filepath.Join(dir, id+".js")
	header := ExtensionHeader{ID: id, Name: id, File: file}

	raw, err := os.ReadFile(file)
	if err != nil {
		return header
	}
	head := string(raw)
	if len(head) > 4096 {
		head = head[:4096]
	}

	if name := headerValue(head, "NAME"); name != "" {
		header.Name = name
	}
	header.Version = headerValue(head, "VERSION")
	return header
}

func headerValue(source, key string) string {
	pattern := regexp.MustCompile(`(?im)^\s*//\s*` + key + `\s*:\s*(.+)$`)
	if match := pattern.FindStringSubmatch(source); match != nil {
		return strings.TrimSpace(match[1])
	}
	return ""
}

// headerField resolves a single header key with a fallback.
func headerField(file, key, fallback string) string {
	if value := headerValue(readHead(file), key); value != "" {
		return value
	}
	return fallback
}

func readHead(file string) string {
	raw, err := os.ReadFile(file)
	if err != nil {
		return ""
	}
	head := string(raw)
	if len(head) > 4096 {
		head = head[:4096]
	}
	return head
}

func readFirst(dir string, names ...string) string {
	for _, name := range names {
		if data, err := os.ReadFile(filepath.Join(dir, name)); err == nil {
			return string(data)
		}
	}
	return ""
}

func isFile(target string) bool {
	info, err := os.Stat(target)
	return err == nil && !info.IsDir()
}
