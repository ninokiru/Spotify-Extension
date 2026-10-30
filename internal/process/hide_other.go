//go:build !windows

package process

import "os/exec"

func hideWindow(command *exec.Cmd) {}
