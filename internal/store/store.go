package store

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ninokiru/Spotify-Extension/internal/apply"
	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

type ModuleKind string

const (
	Extension ModuleKind = "extension"
	Theme     ModuleKind = "theme"
	Snippet   ModuleKind = "snippet"
)

type ModuleFile struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type Module struct {
	ID            string       `json:"id"`
	Name          string       `json:"name"`
	Author        string       `json:"author"`
	Description   string       `json:"description"`
	DescriptionVi string       `json:"descriptionVi"`
	Version       string       `json:"version"`
	Kind          ModuleKind   `json:"kind"`
	Downloads     int          `json:"downloads"`
	Glyph         string       `json:"glyph"`
	Accent        []string     `json:"accent"`
	Files         []ModuleFile `json:"files"`
	Bundled       bool         `json:"-"`
}

type Status struct {
	Installed       bool
	Enabled         bool
	Version         string
	UpdateAvailable bool
}

const registryPath = "store/modules.json"

func registryURL() string {
	return "https://raw.githubusercontent.com/ninokiru/Spotify-Extension/main/" + registryPath
}

var bundledModules = []Module{
	{
		ID: "adblock", Name: "Adblock", Author: "ninokiru",
		Description:   "Removes ad slots and upgrade banners from the client.",
		DescriptionVi: "Ẩn quảng cáo và các bảng nâng cấp trong giao diện Spotify.",
		Version:       "1.0.0", Kind: Extension, Glyph: "shield",
		Accent:  []string{"#123a24", "#0d1f16"},
		Files:   []ModuleFile{{Name: "adblock.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "auto-skip-explicit", Name: "Auto skip explicit", Author: "ninokiru",
		Description:   "Skips tracks marked explicit while playing.",
		DescriptionVi: "Tự nhảy qua các bài hát có nhãn explicit khi đang phát.",
		Version:       "1.0.0", Kind: Extension, Glyph: "skip",
		Accent:  []string{"#3a2a12", "#1f160a"},
		Files:   []ModuleFile{{Name: "auto-skip-explicit.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "quick-keys", Name: "Quick keys", Author: "ninokiru",
		Description:   "Alt+←/→ seek 10s, Alt+↑/↓ volume, Alt+M mute.",
		DescriptionVi: "Alt+←/→ tua 10 giây, Alt+↑/↓ chỉnh âm lượng, Alt+M tắt tiếng.",
		Version:       "1.0.0", Kind: Extension, Glyph: "keys",
		Accent:  []string{"#123040", "#0d1a22"},
		Files:   []ModuleFile{{Name: "quick-keys.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "track-copy", Name: "Track copy", Author: "ninokiru",
		Description:   "Alt+C copies the current track as “Song — Artist”.",
		DescriptionVi: "Alt+C chép tên bài hiện tại theo dạng “Tên bài — Ca sĩ”.",
		Version:       "1.1.0", Kind: Extension, Glyph: "copy",
		Accent:  []string{"#2c2440", "#161222"},
		Files:   []ModuleFile{{Name: "track-copy.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "volume-memory", Name: "Volume memory", Author: "ninokiru",
		Description:   "Restores the last volume level when Spotify starts.",
		DescriptionVi: "Khôi phục mức âm lượng cũ mỗi khi mở Spotify.",
		Version:       "1.0.0", Kind: Extension, Glyph: "wave",
		Accent:  []string{"#123040", "#0d1a22"},
		Files:   []ModuleFile{{Name: "volume-memory.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "skip-short-tracks", Name: "Skip short tracks", Author: "ninokiru",
		Description:   "Skips tracks shorter than 45 seconds while they are playing.",
		DescriptionVi: "Tự nhảy qua các bài ngắn hơn 45 giây khi đang phát.",
		Version:       "1.0.0", Kind: Extension, Glyph: "skip",
		Accent:  []string{"#3a2a12", "#1f160a"},
		Files:   []ModuleFile{{Name: "skip-short-tracks.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "playback-speed", Name: "Playback speed", Author: "ninokiru",
		Description:   "Switches the playback speed with Alt+1.",
		DescriptionVi: "Đổi tốc độ phát bằng Alt+1.",
		Version:       "1.0.0", Kind: Extension, Glyph: "wave",
		Accent:  []string{"#20242b", "#12151a"},
		Files:   []ModuleFile{{Name: "playback-speed.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "like-hotkey", Name: "Like hotkey", Author: "ninokiru",
		Description:   "Presses the like button of the current track with Alt+L.",
		DescriptionVi: "Bấm nút thích của bài đang phát bằng Alt+L.",
		Version:       "1.0.0", Kind: Extension, Glyph: "sparkle",
		Accent:  []string{"#2c2440", "#161222"},
		Files:   []ModuleFile{{Name: "like-hotkey.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "hide-sidebar", Name: "Hide sidebar", Author: "ninokiru",
		Description:   "Hides the left sidebar of the client with Alt+B.",
		DescriptionVi: "Ẩn thanh bên trái bằng Alt+B.",
		Version:       "1.0.0", Kind: Extension, Glyph: "window",
		Accent:  []string{"#20242b", "#12151a"},
		Files:   []ModuleFile{{Name: "hide-sidebar.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "focus-mode", Name: "Focus mode", Author: "ninokiru",
		Description:   "Dims the sidebar and main view so the player stands out.",
		DescriptionVi: "Làm mờ sidebar và nội dung để nổi bật thanh phát.",
		Version:       "1.0.0", Kind: Extension, Glyph: "sparkle",
		Accent:  []string{"#123040", "#0d1a22"},
		Files:   []ModuleFile{{Name: "focus-mode.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "volume-wheel", Name: "Volume wheel", Author: "ninokiru",
		Description:   "Changes the volume by five percent when the wheel turns over the player bar.",
		DescriptionVi: "Lăn chuột trên thanh phát để đổi âm lượng 5%.",
		Version:       "1.0.0", Kind: Extension, Glyph: "wave",
		Accent:  []string{"#3a2f18", "#1b1710"},
		Files:   []ModuleFile{{Name: "volume-wheel.js", URL: ""}},
		Bundled: true,
	},
	{
		ID: "Soft", Name: "Soft", Author: "ninokiru",
		Description:   "Digital clock, larger play button, rounded progress bar.",
		DescriptionVi: "Đồng hồ dạng số, nút phát to hơn, thanh tiến trình bo tròn.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#3a2f18", "#1b1710"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "Nord", Name: "Nord", Author: "ninokiru",
		Description:   "Cool arctic blues with soft grey surfaces.",
		DescriptionVi: "Xanh Bắc cực dịu mắt, nền xám nhạt.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#2e3440", "#1c212b"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "Dracula", Name: "Dracula", Author: "ninokiru",
		Description:   "Purple and pink on a dark violet base.",
		DescriptionVi: "Tím hồng trên nền tím than.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#282a36", "#1a1b26"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "Amoled", Name: "Amoled", Author: "ninokiru",
		Description:   "True black surfaces for OLED screens.",
		DescriptionVi: "Nền đen tuyệt đối cho màn hình OLED.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#000000", "#0b0b0b"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "Catppuccin", Name: "Catppuccin", Author: "ninokiru",
		Description:   "Pastel lavender and blue Mocha palette.",
		DescriptionVi: "Bảng màu Mocha pastel tím xanh.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#1e1e2e", "#141420"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "Gruvbox", Name: "Gruvbox", Author: "ninokiru",
		Description:   "Warm retro earth tones with amber accents.",
		DescriptionVi: "Tông đất ấm retro với điểm nhấn hổ phách.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#282828", "#1d2021"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "TokyoNight", Name: "Tokyo Night", Author: "ninokiru",
		Description:   "Deep blue night with a bright blue accent.",
		DescriptionVi: "Màu đêm xanh sâu với điểm nhấn xanh sáng.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#1a1b26", "#12131c"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "RosePine", Name: "Rosé Pine", Author: "ninokiru",
		Description:   "Soft rose and lilac on a pine background.",
		DescriptionVi: "Hồng dây và tím nhạt trên nền xanh thông.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#191724", "#12101c"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "Solarized", Name: "Solarized", Author: "ninokiru",
		Description:   "Low contrast teal and sand, easy on the eyes.",
		DescriptionVi: "Xanh lam và cát tương phản thấp, dịu mắt.",
		Version:       "1.0.0", Kind: Theme, Glyph: "palette",
		Accent:  []string{"#002b36", "#073642"},
		Files:   []ModuleFile{{Name: "user.css", URL: ""}},
		Bundled: true,
	},
	{
		ID: "hide-window-controls", Name: "Hide window controls", Author: "ninokiru",
		Description:   "Hides the Windows window buttons so Spotify fills the screen.",
		DescriptionVi: "Ẩn nút cửa sổ Windows để Spotify chiếm hết màn hình.",
		Version:       "1.0.0", Kind: Snippet, Glyph: "window",
		Accent:  []string{"#20242b", "#12151a"},
		Files:   []ModuleFile{{Name: "hide-window-controls.css", URL: ""}},
		Bundled: true,
	},
}

// Catalog merges the bundled, remote and locally installed modules.
// reachable reports whether the online registry could be downloaded.
func Catalog() ([]Module, bool) {
	remote, reachable := fetchRegistry()
	local := listLocal()

	known := mergeVersions(bundledModules, remote)
	knownIDs := map[string]bool{}
	for _, module := range known {
		knownIDs[module.ID] = true
	}
	for _, module := range local {
		if !knownIDs[module.ID] {
			known = append(known, module)
		}
	}

	sort.Slice(known, func(i, j int) bool { return known[i].Name < known[j].Name })
	return known, reachable
}

// Find returns the module with the given id, or nil.
func Find(id string) *Module {
	modules, _ := Catalog()
	for i := range modules {
		if modules[i].ID == id {
			return &modules[i]
		}
	}
	return nil
}

// ModuleStatus computes installed/enabled/update state for one module.
func ModuleStatus(module *Module, enabledExtensions, enabledSnippets []string, activeTheme string) Status {
	status := Status{Installed: fileExists(module)}

	onDisk := installedVersion(module)
	if onDisk != "" {
		status.Version = onDisk
	} else if status.Installed {
		status.Version = module.Version
	}

	if status.Installed && status.Version != "" && compareVersions(module.Version, status.Version) > 0 {
		status.UpdateAvailable = true
	}

	switch module.Kind {
	case Theme:
		status.Enabled = activeTheme == module.ID
	case Snippet:
		status.Enabled = contains(enabledSnippets, module.ID)
	default:
		status.Enabled = contains(enabledExtensions, module.ID)
	}

	return status
}

// InstallFiles copies or downloads the module files into the user folders.
// Bundled modules already live next to the exe, so only downloads are written.
func InstallFiles(module *Module) error {
	hasURL := false
	for _, file := range module.Files {
		if file.URL != "" {
			hasURL = true
		}
	}
	if !hasURL {
		return nil
	}

	switch module.Kind {
	case Theme:
		dir := filepath.Join(paths.UserThemes(), module.ID)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
		for _, file := range module.Files {
			if err := downloadTo(file.URL, filepath.Join(dir, file.Name)); err != nil {
				return err
			}
		}
	case Snippet:
		if err := os.MkdirAll(paths.UserSnippets(), 0o755); err != nil {
			return err
		}
		for _, file := range module.Files {
			if err := downloadTo(file.URL, filepath.Join(paths.UserSnippets(), file.Name)); err != nil {
				return err
			}
		}
	default:
		if err := os.MkdirAll(paths.UserExtensions(), 0o755); err != nil {
			return err
		}
		for _, file := range module.Files {
			if err := downloadTo(file.URL, filepath.Join(paths.UserExtensions(), file.Name)); err != nil {
				return err
			}
		}
	}

	return nil
}

// RemoveFiles deletes downloaded copies from the user folders.
func RemoveFiles(module *Module) error {
	switch module.Kind {
	case Theme:
		return os.RemoveAll(filepath.Join(paths.UserThemes(), module.ID))
	case Snippet:
		for _, file := range module.Files {
			if err := os.RemoveAll(filepath.Join(paths.UserSnippets(), file.Name)); err != nil {
				return err
			}
		}
		return nil
	default:
		for _, file := range module.Files {
			if err := os.RemoveAll(filepath.Join(paths.UserExtensions(), file.Name)); err != nil {
				return err
			}
		}
		return nil
	}
}

// VersionHeader reads the VERSION comment of an extension file.
func VersionHeader(id string) string {
	for _, dir := range []string{paths.UserExtensions(), paths.BundledExtensions()} {
		header := apply.ReadExtensionHeader(dir, id)
		if header.Version != "" {
			return header.Version
		}
	}
	return ""
}

// --- internals ---

type registryPayload struct {
	Modules []Module `json:"modules"`
}

func fetchRegistry() ([]Module, bool) {
	client := http.Client{Timeout: 10 * time.Second}
	response, err := client.Get(registryURL())
	if err != nil {
		return nil, false
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, false
	}

	payload := &registryPayload{}
	if json.NewDecoder(response.Body).Decode(payload) != nil {
		return nil, false
	}
	return payload.Modules, true
}

func listLocal() []Module {
	modules := []Module{}

	if entries, err := os.ReadDir(paths.UserExtensions()); err == nil {
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".js") {
				continue
			}
			id := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			modules = append(modules, Module{
				ID: id, Name: id, Version: "1.0.0", Kind: Extension, Glyph: "sparkle",
				Accent: []string{"#1f1f1f", "#101010"},
				Files:  []ModuleFile{{Name: entry.Name(), URL: ""}},
			})
		}
	}

	if entries, err := os.ReadDir(paths.UserSnippets()); err == nil {
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".css") {
				continue
			}
			id := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			modules = append(modules, Module{
				ID: id, Name: id, Version: "1.0.0", Kind: Snippet, Glyph: "sparkle",
				Accent: []string{"#1f1f1f", "#101010"},
				Files:  []ModuleFile{{Name: entry.Name(), URL: ""}},
			})
		}
	}

	return modules
}

// mergeVersions keeps the bundled copy until the registry ships a newer one.
func mergeVersions(base, remote []Module) []Module {
	byID := map[string]Module{}
	for _, module := range base {
		byID[module.ID] = module
	}
	for _, module := range remote {
		current, ok := byID[module.ID]
		if !ok {
			byID[module.ID] = module
			continue
		}
		if current.Bundled && compareVersions(module.Version, current.Version) <= 0 {
			continue
		}
		module.Bundled = false
		byID[module.ID] = module
	}

	modules := make([]Module, 0, len(byID))
	for _, module := range byID {
		modules = append(modules, module)
	}
	return modules
}

func compareVersions(left, right string) int {
	parse := func(value string) []int {
		parts := regexp.MustCompile(`[.\-+]`).Split(value, -1)
		numbers := make([]int, len(parts))
		for i, part := range parts {
			numbers[i], _ = strconv.Atoi(part)
		}
		return numbers
	}

	a := parse(left)
	b := parse(right)
	length := len(a)
	if len(b) > length {
		length = len(b)
	}

	for i := 0; i < length; i++ {
		av, bv := 0, 0
		if i < len(a) {
			av = a[i]
		}
		if i < len(b) {
			bv = b[i]
		}
		if diff := av - bv; diff != 0 {
			return diff
		}
	}
	return 0
}

func fileExists(module *Module) bool {
	switch module.Kind {
	case Theme:
		for _, dir := range []string{paths.UserThemes(), paths.BundledThemes()} {
			for _, file := range module.Files {
				if isFile(filepath.Join(dir, module.ID, file.Name)) {
					return true
				}
			}
		}
		return false
	case Snippet:
		name := module.ID + ".css"
		if len(module.Files) > 0 {
			name = module.Files[0].Name
		}
		return isFile(filepath.Join(paths.UserSnippets(), name)) ||
			isFile(filepath.Join(paths.BundledSnippets(), name))
	default:
		name := module.ID + ".js"
		if len(module.Files) > 0 {
			name = module.Files[0].Name
		}
		return isFile(filepath.Join(paths.UserExtensions(), name)) ||
			isFile(filepath.Join(paths.BundledExtensions(), name))
	}
}

func installedVersion(module *Module) string {
	if module.Kind != Extension {
		return ""
	}
	name := module.ID + ".js"
	if len(module.Files) > 0 {
		name = module.Files[0].Name
	}
	for _, dir := range []string{paths.UserExtensions(), paths.BundledExtensions()} {
		if data, err := os.ReadFile(filepath.Join(dir, name)); err == nil {
			head := string(data)
			if len(head) > 2048 {
				head = head[:2048]
			}
			pattern := regexp.MustCompile(`(?im)^\s*//\s*VERSION\s*:\s*(.+)$`)
			if match := pattern.FindStringSubmatch(head); match != nil {
				return strings.TrimSpace(match[1])
			}
		}
	}
	return ""
}

func downloadTo(url, target string) error {
	if url == "" {
		return nil
	}
	// Only files hosted in the project repository are accepted, so a tampered
	// catalogue cannot point the downloader anywhere else.
	if !strings.HasPrefix(url, "https://raw.githubusercontent.com/ninokiru/Spotify-Extension/") {
		return fmt.Errorf("refusing download from %s", url)
	}

	client := http.Client{Timeout: 60 * time.Second}
	response, err := client.Get(url)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed: %d", response.StatusCode)
	}

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}
	return os.WriteFile(target, data, 0o644)
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

func isFile(target string) bool {
	info, err := os.Stat(target)
	return err == nil && !info.IsDir()
}
