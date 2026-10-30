package version

import "testing"

func TestCompare(t *testing.T) {
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
		{"0.10.0", "0.9.0", 1},
		{"1.0.0+build", "1.0.0", 0},
	}
	for _, tc := range cases {
		got := sign(Compare(tc.left, tc.right))
		if got != tc.want {
			t.Errorf("Compare(%q, %q) = %d, want %d", tc.left, tc.right, got, tc.want)
		}
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
