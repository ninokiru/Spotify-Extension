// Package version compares semantic version strings.
package version

import (
	"strconv"
	"strings"
)

// Compare orders two version strings the way semver does: build metadata is
// ignored and a pre-release tag is older than its release. It returns 1 when
// left is newer, -1 when right is newer and 0 when both are the same.
func Compare(left, right string) int {
	a, aPre := parse(left)
	b, bPre := parse(right)

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

	switch {
	case aPre == bPre:
		return 0
	case aPre == "":
		return 1
	case bPre == "":
		return -1
	default:
		return strings.Compare(aPre, bPre)
	}
}

func parse(value string) ([]int, string) {
	if index := strings.Index(value, "+"); index >= 0 {
		value = value[:index]
	}
	pre := ""
	if index := strings.Index(value, "-"); index >= 0 {
		pre = value[index+1:]
		value = value[:index]
	}

	numbers := []int{}
	for _, part := range strings.Split(value, ".") {
		number, _ := strconv.Atoi(part)
		numbers = append(numbers, number)
	}
	return numbers, pre
}
