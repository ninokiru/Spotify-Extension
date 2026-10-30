package store

import "testing"

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
