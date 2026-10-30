package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/ninokiru/Spotify-Extension/internal/msg"
	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

var ColorKeys = []string{"accent", "background", "sidebar", "card", "text", "subtext"}

var DefaultColors = map[string]string{
	"accent":     "#1ed760",
	"background": "#121212",
	"sidebar":    "#000000",
	"card":       "#1f1f1f",
	"text":       "#ffffff",
	"subtext":    "#b3b3b3",
}

type Config struct {
	Language    string
	SpotifyPath string
	Theme       string
	CheckUpdate bool
	SafeMode    bool
	Extensions  []string
	Snippets    []string
	Colors      map[string]string
}

func Default() Config {
	return Config{
		Language:    "vi",
		SpotifyPath: "",
		Theme:       "",
		CheckUpdate: true,
		SafeMode:    false,
		Extensions:  nil,
		Snippets:    nil,
		Colors:      map[string]string{},
	}
}

func normalizeHex(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if !strings.HasPrefix(trimmed, "#") {
		trimmed = "#" + trimmed
	}
	if regexp.MustCompile(`^#[0-9a-fA-F]{6}$`).MatchString(trimmed) {
		return strings.ToLower(trimmed)
	}
	if regexp.MustCompile(`^#[0-9a-fA-F]{3}$`).MatchString(trimmed) {
		return fmt.Sprintf("#%c%c%c%c%c%c",
			trimmed[1], trimmed[1], trimmed[2], trimmed[2], trimmed[3], trimmed[3])
	}
	return ""
}

// legacySettings is the JSON file written by the old Electron builds.
type legacySettings struct {
	Language   string            `json:"language"`
	Extensions []string          `json:"extensions"`
	Snippets   []string          `json:"snippets"`
	Theme      *string           `json:"theme"`
	Colors     map[string]string `json:"colors"`
	SafeMode   bool              `json:"safeMode"`
}

// migrateLegacy imports settings.json from the old app so nobody loses their
// modules or colours when switching to the CLI.
func migrateLegacy(cfg Config) (Config, bool) {
	raw, err := os.ReadFile(filepath.Join(paths.Data(), "settings.json"))
	if err != nil {
		return cfg, false
	}

	legacy := legacySettings{}
	if json.Unmarshal(raw, &legacy) != nil {
		return cfg, false
	}

	if legacy.Language == "en" || legacy.Language == "vi" {
		cfg.Language = legacy.Language
	}
	if len(legacy.Extensions) > 0 {
		cfg.Extensions = legacy.Extensions
	}
	if len(legacy.Snippets) > 0 {
		cfg.Snippets = legacy.Snippets
	}
	if legacy.Theme != nil {
		cfg.Theme = *legacy.Theme
	}
	cfg.SafeMode = legacy.SafeMode

	for _, key := range ColorKeys {
		if value, ok := legacy.Colors[key]; ok {
			if hex := normalizeHex(value); hex != "" {
				cfg.Colors[key] = hex
			}
		}
	}

	return cfg, true
}

// Load reads config.ini; a missing file falls back to defaults, after trying
// to import the old Electron settings once.
func Load() (Config, error) {
	cfg := Default()

	raw, err := os.ReadFile(paths.ConfigFile())
	if err != nil {
		if migrated, ok := migrateLegacy(cfg); ok {
			_ = Save(migrated)
			return migrated, nil
		}
		return cfg, nil
	}

	section := ""
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			section = strings.TrimSpace(line[1 : len(line)-1])
			continue
		}
		eq := strings.Index(line, "=")
		if eq < 0 {
			continue
		}
		key := strings.TrimSpace(line[:eq])
		value := strings.TrimSpace(line[eq+1:])

		switch section + "." + key {
		case "Setting.language":
			if value == "en" || value == "vi" {
				cfg.Language = value
			}
		case "Setting.spotify_path":
			cfg.SpotifyPath = value
		case "Setting.theme":
			cfg.Theme = value
		case "Setting.check_update":
			cfg.CheckUpdate = value != "0"
		case "Feature.safe_mode":
			cfg.SafeMode = value == "1" || strings.EqualFold(value, "true")
		case "AdditionalOptions.extensions":
			cfg.Extensions = splitList(value)
		case "AdditionalOptions.snippets":
			cfg.Snippets = splitList(value)
		default:
			if section == "Colors" {
				for _, color := range ColorKeys {
					if key == color {
						cfg.Colors[color] = normalizeHex(value)
					}
				}
			}
		}
	}

	return cfg, nil
}

func splitList(value string) []string {
	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == '|' || r == ',' || r == ';' || r == ' ' || r == '\t'
	})
	list := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			list = append(list, part)
		}
	}
	return list
}

// Save writes config.ini, keeping the sections in a stable order.
func Save(cfg Config) error {
	colors := make([]string, 0, len(ColorKeys))
	for _, key := range ColorKeys {
		value, ok := cfg.Colors[key]
		if !ok || value == "" {
			value = DefaultColors[key]
		}
		colors = append(colors, fmt.Sprintf("%s = %s", key, value))
	}

	check := "1"
	if !cfg.CheckUpdate {
		check = "0"
	}
	safe := "0"
	if cfg.SafeMode {
		safe = "1"
	}

	lines := []string{
		"[Setting]",
		"language = " + cfg.Language,
		"spotify_path = " + cfg.SpotifyPath,
		"theme = " + cfg.Theme,
		"check_update = " + check,
		"",
		"[AdditionalOptions]",
		"extensions = " + strings.Join(cfg.Extensions, " | "),
		"snippets = " + strings.Join(cfg.Snippets, " | "),
		"",
		"[Colors]",
		strings.Join(colors, "\n"),
		"",
		"[Feature]",
		"safe_mode = " + safe,
		"",
	}

	content := strings.Join(lines, "\n")
	if err := os.MkdirAll(paths.Data(), 0o755); err != nil {
		return err
	}
	return os.WriteFile(paths.ConfigFile(), []byte(content), 0o644)
}

// Get returns the value of one config key ("extensions", "colors.accent", …).
func Get(cfg Config, key string) (string, bool) {
	parts := strings.Split(key, ".")
	switch parts[0] {
	case "language":
		return cfg.Language, true
	case "spotify_path":
		return cfg.SpotifyPath, true
	case "theme":
		return cfg.Theme, true
	case "check_update":
		return boolString(cfg.CheckUpdate), true
	case "safe_mode":
		return boolString(cfg.SafeMode), true
	case "extensions":
		return strings.Join(cfg.Extensions, " | "), true
	case "snippets":
		return strings.Join(cfg.Snippets, " | "), true
	case "colors":
		if len(parts) == 2 {
			value, ok := cfg.Colors[parts[1]]
			if !ok || value == "" {
				value = DefaultColors[parts[1]]
			}
			if value == "" {
				return "", false
			}
			return value, true
		}
	}
	return "", false
}

// Set updates one config key, returning an error for unknown keys.
func Set(cfg *Config, key, value string) error {
	parts := strings.Split(key, ".")
	switch parts[0] {
	case "language":
		if value != "en" && value != "vi" {
			return fmt.Errorf(msg.Get(cfg.Language, "config.badkey"), value)
		}
		cfg.Language = value
	case "spotify_path":
		cfg.SpotifyPath = strings.TrimSpace(value)
	case "theme":
		cfg.Theme = strings.TrimSpace(value)
	case "check_update":
		cfg.CheckUpdate = parseBool(value)
	case "safe_mode":
		cfg.SafeMode = parseBool(value)
	case "extensions":
		cfg.Extensions = splitList(value)
	case "snippets":
		cfg.Snippets = splitList(value)
	case "colors":
		if len(parts) != 2 {
			return fmt.Errorf(msg.Get(cfg.Language, "config.badkey"), key)
		}
		if !ValidColor(parts[1]) {
			return fmt.Errorf(msg.Get(cfg.Language, "config.badkey"), key)
		}
		hex := normalizeHex(value)
		if hex == "" {
			return fmt.Errorf(msg.Get(cfg.Language, "config.badkey"), value)
		}
		cfg.Colors[parts[1]] = hex
	default:
		return fmt.Errorf(msg.Get(cfg.Language, "config.badkey"), key)
	}
	return nil
}

// ValidColor reports whether the key names one of the six theme colours.
func ValidColor(key string) bool {
	for _, color := range ColorKeys {
		if color == key {
			return true
		}
	}
	return false
}

func parseBool(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func boolString(value bool) string {
	if value {
		return "1"
	}
	return "0"
}

func hexToRgb(hex string) (int, int, int) {
	if len(hex) != 7 || hex[0] != '#' {
		return 0, 0, 0
	}
	r, _ := strconv.ParseInt(hex[1:3], 16, 32)
	g, _ := strconv.ParseInt(hex[3:5], 16, 32)
	b, _ := strconv.ParseInt(hex[5:7], 16, 32)
	return int(r), int(g), int(b)
}

func mix(from, to string, weight float64) string {
	fr, fg, fb := hexToRgb(from)
	tr, tg, tb := hexToRgb(to)
	part := func(a, b int) string {
		value := int(float64(a)*(1-weight) + float64(b)*weight)
		if value < 0 {
			value = 0
		}
		if value > 255 {
			value = 255
		}
		return fmt.Sprintf("%02x", value)
	}
	return "#" + part(fr, tr) + part(fg, tg) + part(fb, tb)
}

// BuildColorsCss renders colors.css from the six theme colours.
func BuildColorsCss(cfg Config) string {
	get := func(key string) string {
		value, ok := cfg.Colors[key]
		if !ok || value == "" {
			value = DefaultColors[key]
		}
		return value
	}

	accent := get("accent")
	background := get("background")
	sidebar := get("sidebar")
	card := get("card")
	text := get("text")
	subtext := get("subtext")

	tr, tg, tb := hexToRgb(text)
	br, bg, bb := hexToRgb(background)

	lines := []string{
		"  color-scheme: dark;",
		"",
		"  --background-base: " + background + ";",
		"  --background-elevated-base: " + sidebar + ";",
		"  --background-elevated-highlight: " + mix(sidebar, text, 0.08) + ";",
		"  --background-elevated-press: " + mix(sidebar, "#000000", 0.2) + ";",
		"  --background-highlight: " + card + ";",
		"  --background-press: " + mix(background, "#000000", 0.25) + ";",
		fmt.Sprintf("  --background-tinted-base: rgba(%d, %d, %d, 0.07);", tr, tg, tb),
		fmt.Sprintf("  --background-tinted-highlight: rgba(%d, %d, %d, 0.12);", tr, tg, tb),
		fmt.Sprintf("  --background-tinted-press: rgba(%d, %d, %d, 0.04);", tr, tg, tb),
		"",
		"  --text-base: " + text + ";",
		"  --text-subdued: " + subtext + ";",
		"  --text-bright-accent: " + accent + ";",
		"",
		"  --essential-base: " + text + ";",
		"  --essential-subdued: " + subtext + ";",
		"  --essential-bright-accent: " + accent + ";",
		"  --decorative-base: " + text + ";",
		"  --decorative-subdued: " + mix(text, background, 0.5) + ";",
		"",
		"  /* Spicetify-compatible aliases, so existing colour schemes still apply */",
		"  --spice-text: " + text + ";",
		"  --spice-subtext: " + subtext + ";",
		"  --spice-main: " + background + ";",
		"  --spice-sidebar: " + sidebar + ";",
		"  --spice-player: " + background + ";",
		"  --spice-card: " + card + ";",
		"  --spice-button: " + accent + ";",
		"  --spice-button-active: " + accent + ";",
		"  --spice-button-disabled: " + subtext + ";",
		"  --spice-tab-active: " + card + ";",
		fmt.Sprintf("  --spice-rgb-text: %d, %d, %d;", tr, tg, tb),
		fmt.Sprintf("  --spice-rgb-main: %d, %d, %d;", br, bg, bb),
		fmt.Sprintf("  --spice-rgb-selected-row: %d, %d, %d;", tr, tg, tb),
		"  --spice-rgb-shadow: 0, 0, 0;",
	}

	return ":root {\n" + strings.Join(lines, "\n") + "\n}\n"
}

// SortedKeys returns the colour keys in display order (unused but kept for
// callers that want deterministic output).
func SortedKeys() []string {
	keys := append([]string(nil), ColorKeys...)
	sort.Strings(keys)
	return keys
}
