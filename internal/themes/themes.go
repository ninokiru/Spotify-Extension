package themes

import (
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/ninokiru/Spotify-Extension/internal/paths"
)

type Theme struct {
	ID      string
	Path    string
	Bundled bool
}

// List returns every theme folder that carries a user.css or theme.css.
func List() []Theme {
	found := map[string]Theme{}

	for _, source := range []struct {
		dir     string
		bundled bool
	}{
		{paths.UserThemes(), false},
		{paths.BundledThemes(), true},
	} {
		entries, err := os.ReadDir(source.dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			if _, exists := found[entry.Name()]; exists {
				continue
			}
			folder := filepath.Join(source.dir, entry.Name())
			if !hasCss(folder) {
				continue
			}
			found[entry.Name()] = Theme{ID: entry.Name(), Path: folder, Bundled: source.bundled}
		}
	}

	list := make([]Theme, 0, len(found))
	for _, theme := range found {
		list = append(list, theme)
	}
	sort.Slice(list, func(i, j int) bool {
		return strings.ToLower(list[i].ID) < strings.ToLower(list[j].ID)
	})
	return list
}

// Find returns the theme with the given folder name, or nil.
func Find(id string) *Theme {
	for _, theme := range List() {
		if strings.EqualFold(theme.ID, id) {
			return &theme
		}
	}
	return nil
}

func hasCss(folder string) bool {
	for _, name := range []string{"user.css", "theme.css"} {
		if info, err := os.Stat(filepath.Join(folder, name)); err == nil && !info.IsDir() {
			return true
		}
	}
	return false
}
