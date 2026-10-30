package process

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Running reports whether Spotify.exe is alive.
func Running() bool {
	command := exec.Command("tasklist", "/FI", "IMAGENAME eq Spotify.exe", "/NH")
	hideWindow(command)

	output, err := command.Output()
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(output)), "spotify.exe")
}

// Restart kills Spotify and starts it again from the install root.
// It returns false when the executable cannot be started.
func Restart(root string) bool {
	kill := exec.Command("taskkill", "/IM", "Spotify.exe", "/F")
	hideWindow(kill)
	_ = kill.Run()

	time.Sleep(1500 * time.Millisecond)

	exe := filepath.Join(root, "Spotify.exe")
	if _, err := os.Stat(exe); err != nil {
		return false
	}

	command := exec.Command(exe)
	command.Dir = root
	hideWindow(command)
	if err := command.Start(); err != nil {
		return false
	}
	return true
}
