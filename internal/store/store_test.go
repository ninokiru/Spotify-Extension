package store

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCompareVersions(t *testing.T) {
	cases := []struct {
		left, right string
		want        int
	}{
		{"1.0.0", "1.0.0", 0},
		{"2.0.0", "1.0.0", 1},
		{"1.0.0", "2.0.0", -1},
		{"1.10.0", "1.9.0", 1},
		{"1.0.0-beta", "1.0.0", -1},
		{"0.3.0", "0.3.0", 0},
	}
	for _, tc := range cases {
		got := compareVersions(tc.left, tc.right)
		if sign(got) != tc.want {
			t.Errorf("compareVersions(%q, %q) = %d, want %d", tc.left, tc.right, got, tc.want)
		}
	}
}

func TestMergeKeepsBundledOnSameVersion(t *testing.T) {
	bundled := []Module{{ID: "adblock", Version: "1.0.0", Bundled: true, Files: []ModuleFile{{Name: "adblock.js", URL: ""}}}}
	remote := []Module{{ID: "adblock", Version: "1.0.0", Files: []ModuleFile{{Name: "adblock.js", URL: "https://example.invalid/x.js"}}}}

	merged := mergeVersions(bundled, remote)
	if len(merged) != 1 || !merged[0].Bundled || merged[0].Files[0].URL != "" {
		t.Fatalf("bundled copy should win on equal version: %+v", merged)
	}
}

func TestMergeRemoteWinsOnNewerVersion(t *testing.T) {
	bundled := []Module{{ID: "adblock", Version: "1.0.0", Bundled: true, Files: []ModuleFile{{Name: "adblock.js", URL: ""}}}}
	remote := []Module{{ID: "adblock", Version: "2.0.0", Files: []ModuleFile{{Name: "adblock.js", URL: "https://example.invalid/x.js"}}}}

	merged := mergeVersions(bundled, remote)
	if len(merged) != 1 || merged[0].Version != "2.0.0" || merged[0].Bundled || merged[0].Files[0].URL == "" {
		t.Fatalf("remote copy should win on newer version: %+v", merged)
	}
}

func sign(value int) int {
	switch {
	case value > 0:
		return 1
	case value < 0:
		return -1
	default:
		return 0
	}
}

func TestValidModuleID(t *testing.T) {
	valid := []string{"adblock", "Soft", "hide-window-controls", "night.theme"}
	for _, id := range valid {
		if !validModuleID(id) {
			t.Errorf("validModuleID(%q) = false, want true", id)
		}
	}

	invalid := []string{"", "..", "../evil", "a/b", `a\b`, ".hidden"}
	for _, id := range invalid {
		if validModuleID(id) {
			t.Errorf("validModuleID(%q) = true, want false", id)
		}
	}
}

func TestValidFileName(t *testing.T) {
	cases := []struct {
		name string
		kind ModuleKind
		want bool
	}{
		{"adblock.js", Extension, true},
		{"user.css", Theme, true},
		{"rounded-covers.css", Snippet, true},
		{"../../x.js", Extension, false},
		{"x.js", Theme, false},
		{"x.css", Extension, false},
		{"a/b.css", Theme, false},
		{"..", Theme, false},
	}
	for _, tc := range cases {
		if got := validFileName(tc.name, tc.kind); got != tc.want {
			t.Errorf("validFileName(%q, %q) = %v, want %v", tc.name, tc.kind, got, tc.want)
		}
	}
}

func TestDownloadToRejectsForeignHost(t *testing.T) {
	target := filepath.Join(t.TempDir(), "x.js")
	if err := downloadTo("https://example.com/x.js", target); err == nil {
		t.Fatal("downloadTo should reject a foreign host")
	}
	if _, err := os.Stat(target); err == nil {
		t.Fatalf("downloadTo must not create %s", target)
	}
	if err := downloadTo("", target); err != nil {
		t.Fatalf("downloadTo(\"\") = %v, want nil", err)
	}
}

func TestInstallFilesRejectsTraversal(t *testing.T) {
	module := &Module{
		ID:   "../evil",
		Kind: Extension,
		Files: []ModuleFile{{
			Name: "x.js",
			URL:  "https://raw.githubusercontent.com/ninokiru/Spotify-Extension/main/x.js",
		}},
	}
	if err := InstallFiles(module); err == nil {
		t.Fatal("InstallFiles should reject a module id with traversal")
	}
}
