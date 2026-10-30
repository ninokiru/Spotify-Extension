package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/ninokiru/Spotify-Extension/internal/apply"
	"github.com/ninokiru/Spotify-Extension/internal/backup"
	"github.com/ninokiru/Spotify-Extension/internal/config"
	"github.com/ninokiru/Spotify-Extension/internal/detect"
	"github.com/ninokiru/Spotify-Extension/internal/msg"
	"github.com/ninokiru/Spotify-Extension/internal/paths"
	"github.com/ninokiru/Spotify-Extension/internal/process"
	"github.com/ninokiru/Spotify-Extension/internal/store"
	"github.com/ninokiru/Spotify-Extension/internal/themes"
	"github.com/ninokiru/Spotify-Extension/internal/update"
	semver "github.com/ninokiru/Spotify-Extension/internal/version"
)

var version = "0.3.0"

func main() {
	code := run(os.Args[1:])
	os.Exit(code)
}

func run(args []string) int {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}

	lang := cfg.Language
	action, rest := "", []string{}
	if len(args) > 0 {
		action = args[0]
		rest = args[1:]
	}

	switch action {
	case "", "help", "-h", "--help":
		fmt.Print(msg.Get(lang, "help"))
		return 0

	case "version", "--version", "-v":
		fmt.Printf("sxe v%s\n", version)
		return 0

	case "status":
		return cmdStatus(lang)

	case "backup":
		return cmdBackup(lang, rest)

	case "apply":
		return cmdApply(lang, rest)

	case "restore":
		return cmdRestore(lang, rest, false)

	case "uninstall":
		return cmdRestore(lang, rest, true)

	case "config":
		return cmdConfig(lang, cfg, rest)

	case "store":
		return cmdStore(lang, cfg, rest)

	case "theme", "themes":
		return cmdTheme(lang, cfg, rest)

	case "ext", "extension", "extensions":
		return cmdExt(lang, cfg, rest)

	case "doctor":
		return cmdDoctor(lang, cfg)

	case "restart":
		return cmdRestart(lang, rest)

	case "update":
		return cmdUpdate(lang, rest)

	default:
		fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", action))
		fmt.Println()
		fmt.Print(msg.Get(lang, "help"))
		return 1
	}
}

/* ---------- selection ---------- */

type flags struct {
	path    string
	replace bool
}

func parseFlags(args []string) flags {
	parsed := flags{}
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--path":
			if i+1 < len(args) {
				parsed.path = args[i+1]
				i++
			}
		case "--replace":
			parsed.replace = true
		}
	}
	return parsed
}

func allInstalls() []detect.Install {
	return detect.All(nil, backup.ReadSummary)
}

func pickInstall(lang string, cfg config.Config, args flags) (*detect.Install, int) {
	extra := []string{}
	if cfg.SpotifyPath != "" {
		extra = append(extra, cfg.SpotifyPath)
	}
	if args.path != "" {
		extra = append(extra, args.path)
	}

	installs := detect.All(extra, backup.ReadSummary)

	if args.path != "" {
		if found := detect.FindByRoot(installs, args.path); found != nil {
			return found, 0
		}
		fmt.Fprintln(os.Stderr, msg.Get(lang, "detect.none"))
		return nil, 1
	}

	if cfg.SpotifyPath != "" {
		if found := detect.FindByRoot(installs, cfg.SpotifyPath); found != nil {
			return found, 0
		}
	}

	switch len(installs) {
	case 0:
		fmt.Fprintln(os.Stderr, msg.Get(lang, "detect.none"))
		return nil, 1
	case 1:
		return &installs[0], 0
	default:
		fmt.Fprintln(os.Stderr, msg.Get(lang, "detect.pick"))
		for i := range installs {
			fmt.Fprintf(os.Stderr, "  %s\n", installs[i].Root)
		}
		return nil, 1
	}
}

func stateLabel(lang string, install *detect.Install) string {
	switch install.State {
	case detect.Stock:
		return msg.Get(lang, "state.stock")
	case detect.Patched:
		return msg.Get(lang, "state.patched")
	case detect.ForeignState:
		return msg.Get(lang, "state.foreign")
	case detect.Partial:
		return msg.Get(lang, "state.partial")
	default:
		return msg.Get(lang, "state.unsupported")
	}
}

/* ---------- commands ---------- */

func cmdStatus(lang string) int {
	installs := allInstalls()
	if len(installs) == 0 {
		fmt.Println(msg.Get(lang, "detect.none"))
		return 0
	}

	fmt.Println(msg.Get(lang, "detect.title"))
	fmt.Println()
	for i := range installs {
		install := &installs[i]
		backupState := msg.Get(lang, "state.nobackup")
		if install.HasBackup {
			backupState = msg.Get(lang, "state.backup")
		}
		fmt.Printf("  %s\n", install.Name)
		fmt.Printf("    %s\n", install.Root)
		fmt.Printf("    %s · %s · %s · %s\n",
			install.Version, install.Variant, install.Arch, stateLabel(lang, install))
		fmt.Printf("    %s\n\n", backupState)
	}
	return 0
}

func cmdBackup(lang string, args []string) int {
	cfg, _ := config.Load()
	flags := parseFlags(args)

	install, code := pickInstall(lang, cfg, flags)
	if code != 0 {
		return code
	}

	if existing := backup.SnapshotFor(install.ID, install.Version); existing != nil {
		fmt.Println(msg.Get(lang, "backup.exists"))
		return 0
	}

	manifest, err := backup.Ensure(install)
	if err != nil {
		return fail(lang, err)
	}
	fmt.Println(msg.Get(lang, "backup.done", install.XpuiPath, manifest.Files))
	return 0
}

func cmdApply(lang string, args []string) int {
	cfg, _ := config.Load()
	flags := parseFlags(args)

	install, code := pickInstall(lang, cfg, flags)
	if code != 0 {
		return code
	}

	replaced := false
	if install.State == detect.ForeignState {
		if !flags.replace {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "apply.foreign"))
			return 1
		}
		ok, err := takeOverFromSpicetify(install)
		if err != nil {
			return fail(lang, err)
		}
		if !ok {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "replace.none"))
			return 1
		}
		replaced = true

		// Re-read the install now that it is stock again.
		fresh := allInstalls()
		found := detect.FindByRoot(fresh, install.Root)
		if found == nil {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "detect.none"))
			return 1
		}
		if found.State == detect.ForeignState {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "apply.foreign"))
			return 1
		}
		install = found
	}

	if install.State == detect.Unsupported {
		fmt.Fprintln(os.Stderr, msg.Get(lang, "state.unsupported"))
		return 1
	}

	if !isFile(paths.RuntimeFile()) {
		fmt.Fprintln(os.Stderr, msg.Get(lang, "apply.noasset", filepath.Dir(paths.RuntimeFile())))
		return 1
	}

	if process.Running() {
		fmt.Println(msg.Get(lang, "apply.running"))
	}

	if _, err := backup.Ensure(install); err != nil {
		return fail(lang, err)
	}

	if err := apply.WritePayload(install, cfg, version); err != nil {
		return fail(lang, err)
	}
	if err := apply.PatchHtml(install); err != nil {
		return fail(lang, err)
	}

	if replaced {
		fmt.Println(msg.Get(lang, "apply.replaced"))
	}
	fmt.Println(msg.Get(lang, "apply.done"))
	return 0
}

func cmdRestore(lang string, args []string, full bool) int {
	cfg, _ := config.Load()
	flags := parseFlags(args)

	install, code := pickInstall(lang, cfg, flags)
	if code != 0 {
		return code
	}

	if process.Running() {
		fmt.Println(msg.Get(lang, "restore.running"))
	}

	restored, err := backup.Restore(install)
	if err != nil {
		return fail(lang, err)
	}

	if !restored {
		if full {
			// No backup: at least drop the marker block and our folder.
			if err := apply.UnpatchHtml(install); err != nil {
				return fail(lang, err)
			}
			if err := apply.RemovePayload(install); err != nil {
				return fail(lang, err)
			}
		}
		if install.State == detect.Stock || install.State == detect.ForeignState {
			fmt.Println(msg.Get(lang, "restore.skip"))
			return 0
		}
		fmt.Println(msg.Get(lang, "restore.none"))
		return 0
	}

	// The snapshot is pristine, so our payload folder has to go as well or the
	// client stays half-patched forever.
	if err := apply.RemovePayload(install); err != nil {
		return fail(lang, err)
	}
	if err := apply.UnpatchHtml(install); err != nil {
		return fail(lang, err)
	}

	fmt.Println(msg.Get(lang, "restore.done"))
	return 0
}

func cmdConfig(lang string, cfg config.Config, args []string) int {
	switch len(args) {
	case 0:
		fmt.Printf("%s\n", msg.Get(lang, "config.title", paths.ConfigFile()))
		fmt.Println()
		for _, key := range []string{
			"language", "spotify_path", "theme", "check_update", "safe_mode",
			"extensions", "snippets",
			"colors.accent", "colors.background", "colors.sidebar",
			"colors.card", "colors.text", "colors.subtext",
		} {
			if value, ok := config.Get(cfg, key); ok {
				fmt.Printf("  %s = %s\n", key, value)
			}
		}
		return 0

	case 1:
		value, ok := config.Get(cfg, args[0])
		if !ok {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "config.unknown", args[0]))
			return 1
		}
		fmt.Println(value)
		return 0

	default:
		if err := config.Set(&cfg, args[0], strings.Join(args[1:], " ")); err != nil {
			fmt.Fprintln(os.Stderr, err)
			return 1
		}
		if err := config.Save(cfg); err != nil {
			return fail(lang, err)
		}
		fmt.Println(msg.Get(lang, "config.changed", args[0], strings.Join(args[1:], " ")))
		fmt.Println(msg.Get(lang, "config.saved"))
		return 0
	}
}

func cmdStore(lang string, cfg config.Config, args []string) int {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "store list|install|uninstall|update"))
		return 1
	}

	switch args[0] {
	case "list", "ls":
		withRemote := len(args) > 1 && args[1] == "all"
		modules, reachable := store.Catalog()
		if !withRemote {
			modules = bundledOnly(modules)
		}

		fmt.Println(msg.Get(lang, "store.title"))
		fmt.Println()
		if !reachable && withRemote {
			fmt.Println("  " + msg.Get(lang, "store.offline"))
			fmt.Println()
		}

		for i := range modules {
			module := &modules[i]
			status := store.ModuleStatus(module, cfg.Extensions, cfg.Snippets, cfg.Theme)

			marker := "      "
			switch {
			case status.UpdateAvailable:
				marker = " [upd]"
			case status.Enabled:
				marker = " [on] "
			case status.Installed:
				marker = " [off]"
			}
			desc := module.Description
			if lang == "vi" && module.DescriptionVi != "" {
				desc = module.DescriptionVi
			}
			fmt.Printf("%s %-22s %-10s v%-9s %s\n",
				marker, module.Name, module.Kind, module.Version, desc)
		}
		return 0

	case "install", "i":
		if len(args) < 2 {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "store install <id>"))
			return 1
		}
		module := store.Find(args[1])
		if module == nil {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "store.notFound", args[1]))
			return 1
		}
		if err := store.InstallFiles(module); err != nil {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "store.download"))
			return fail(lang, err)
		}
		if err := enableModule(&cfg, module); err != nil {
			return fail(lang, err)
		}
		fmt.Println(msg.Get(lang, "store.installed", module.ID))
		return 0

	case "uninstall", "remove", "rm":
		if len(args) < 2 {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "store uninstall <id>"))
			return 1
		}
		module := store.Find(args[1])
		if module == nil {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "store.notFound", args[1]))
			return 1
		}
		if err := store.RemoveFiles(module); err != nil {
			return fail(lang, err)
		}
		if err := disableModule(&cfg, module); err != nil {
			return fail(lang, err)
		}
		fmt.Println(msg.Get(lang, "store.removed", module.ID))
		return 0

	case "update", "up":
		if len(args) < 2 {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "store update <id>"))
			return 1
		}
		module := store.Find(args[1])
		if module == nil {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "store.notFound", args[1]))
			return 1
		}
		if err := store.InstallFiles(module); err != nil {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "store.download"))
			return fail(lang, err)
		}
		fmt.Println(msg.Get(lang, "store.updated", module.ID))
		return 0

	default:
		fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "store list|install|uninstall|update"))
		return 1
	}
}

func cmdTheme(lang string, cfg config.Config, args []string) int {
	if len(args) == 0 || args[0] == "list" {
		list := themes.List()
		if len(list) == 0 {
			fmt.Println(msg.Get(lang, "theme.none"))
			return 0
		}

		fmt.Println(msg.Get(lang, "theme.title"))
		fmt.Println()
		for _, theme := range list {
			marker := "  "
			if theme.ID == cfg.Theme {
				marker = "* "
			}
			source := msg.Get(lang, "theme.user")
			if theme.Bundled {
				source = msg.Get(lang, "theme.bundled")
			}
			fmt.Printf("%s %-18s %s\n", marker, theme.ID, source)
		}
		return 0
	}

	if args[0] != "set" || len(args) < 2 {
		fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "theme list|set <name>"))
		return 1
	}

	name := args[1]
	if name == "default" || name == "none" {
		cfg.Theme = ""
	} else {
		if themes.Find(name) == nil {
			fmt.Fprintln(os.Stderr, msg.Get(lang, "theme.none"))
			return 1
		}
		cfg.Theme = name
	}

	if err := config.Save(cfg); err != nil {
		return fail(lang, err)
	}
	fmt.Println(msg.Get(lang, "theme.set", cfg.Theme))
	return 0
}

func cmdExt(lang string, cfg config.Config, args []string) int {
	list := apply.ListExtensions()

	if len(args) == 0 || args[0] == "list" {
		if len(list) == 0 {
			fmt.Println(msg.Get(lang, "ext.none"))
			return 0
		}

		fmt.Println(msg.Get(lang, "ext.title"))
		fmt.Println()
		for _, extension := range list {
			marker := "  "
			if contains(cfg.Extensions, extension.ID) {
				marker = "* "
			}
			version := extension.Version
			if version == "" {
				version = "-"
			}
			fmt.Printf("%s %-22s v%-9s %s\n", marker, extension.Name, version, extension.ID)
		}
		return 0
	}

	action := args[0]
	if len(args) < 2 {
		fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "ext list|on|off <id>"))
		return 1
	}

	id := args[1]
	found := false
	for _, extension := range list {
		if extension.ID == id {
			found = true
		}
	}
	if !found {
		fmt.Fprintln(os.Stderr, msg.Get(lang, "ext.notFound", id))
		return 1
	}

	switch action {
	case "on", "enable":
		cfg.Extensions = addUnique(cfg.Extensions, id)
	case "off", "disable":
		cfg.Extensions = removeItem(cfg.Extensions, id)
	default:
		fmt.Fprintln(os.Stderr, msg.Get(lang, "error.needArg", "ext list|on|off <id>"))
		return 1
	}

	if err := config.Save(cfg); err != nil {
		return fail(lang, err)
	}

	if action == "on" || action == "enable" {
		fmt.Println(msg.Get(lang, "ext.on", id))
	} else {
		fmt.Println(msg.Get(lang, "ext.off", id))
	}
	return 0
}

func cmdDoctor(lang string, cfg config.Config) int {
	fmt.Println(msg.Get(lang, "doctor.title"))
	fmt.Println()

	installs := allInstalls()
	if len(installs) == 0 {
		doctorLine(msg.Get(lang, "doctor.installs"), "!!", msg.Get(lang, "doctor.missing"))
	} else {
		for i := range installs {
			install := &installs[i]
			backupState := msg.Get(lang, "doctor.none")
			if install.HasBackup {
				backupState = msg.Get(lang, "doctor.ok")
			}
			doctorLine(msg.Get(lang, "doctor.installs"), "ok",
				fmt.Sprintf("%s · %s · %s", install.Root, install.State, backupState))
		}
	}

	configState := msg.Get(lang, "doctor.ok")
	if _, err := os.Stat(paths.ConfigFile()); err != nil {
		configState = msg.Get(lang, "doctor.missing")
	}
	doctorLine(msg.Get(lang, "doctor.config"), stateMark(configState),
		fmt.Sprintf("%s · %d ext · %d snippet", paths.ConfigFile(), len(cfg.Extensions), len(cfg.Snippets)))

	runtimeState := msg.Get(lang, "doctor.missing")
	if isFile(paths.RuntimeFile()) {
		runtimeState = msg.Get(lang, "doctor.ok")
	}
	doctorLine(msg.Get(lang, "doctor.runtime"), stateMark(runtimeState), paths.RuntimeFile())

	doctorLine(msg.Get(lang, "doctor.extensions"), "ok",
		fmt.Sprintf("%s · %d", msg.Get(lang, "doctor.count", len(apply.ListExtensions())), len(cfg.Extensions)))
	doctorLine(msg.Get(lang, "doctor.themes"), "ok",
		fmt.Sprintf("%s · %d", msg.Get(lang, "doctor.count", len(themes.List())), len(cfg.Theme)))
	doctorLine(msg.Get(lang, "doctor.snippets"), "ok",
		msg.Get(lang, "doctor.count", len(cfg.Snippets)))

	networkState := msg.Get(lang, "doctor.warn")
	detail := msg.Get(lang, "doctor.missing")
	if tag, _, err := update.Latest(); err == nil {
		networkState = msg.Get(lang, "doctor.ok")
		detail = tag
	}
	doctorLine(msg.Get(lang, "doctor.network"), stateMark(networkState), detail)

	runningState := msg.Get(lang, "doctor.no")
	if process.Running() {
		runningState = msg.Get(lang, "doctor.yes")
	}
	doctorLine(msg.Get(lang, "doctor.running"), stateMark(runningState), runningState)

	return 0
}

func doctorLine(label, state, detail string) {
	fmt.Printf("  %-4s %-20s %s\n", state, label, detail)
}

func stateMark(state string) string {
	if state == msg.Get("en", "doctor.ok") {
		return "ok"
	}
	if state == msg.Get("en", "doctor.missing") {
		return "!!"
	}
	return "--"
}

func cmdRestart(lang string, args []string) int {
	cfg, _ := config.Load()
	flags := parseFlags(args)

	install, code := pickInstall(lang, cfg, flags)
	if code != 0 {
		return code
	}

	if process.Restart(install.Root) {
		fmt.Println(msg.Get(lang, "restart.done"))
		return 0
	}

	fmt.Fprintln(os.Stderr, msg.Get(lang, "restart.failed"))
	return 1
}

func cmdUpdate(lang string, args []string) int {
	withYes := len(args) > 0 && (args[0] == "--yes" || args[0] == "-y")

	tag, url, err := update.Latest()
	if err != nil {
		fmt.Println(msg.Get(lang, "update.failed", err))
		return 1
	}

	latest := update.NormalizeTag(tag)
	if latest == "" || semver.Compare(latest, version) <= 0 {
		fmt.Println(msg.Get(lang, "update.latest", version))
		return 0
	}

	if !withYes {
		fmt.Println(msg.Get(lang, "update.available", tag, version))
		return 0
	}

	if err := update.Replace(lang, tag, url); err != nil {
		fmt.Fprintln(os.Stderr, msg.Get(lang, "update.failed", err))
		return 1
	}

	fmt.Println(msg.Get(lang, "update.done", tag))
	return 0
}

/* ---------- helpers ---------- */

func fail(lang string, err error) int {
	fmt.Fprintln(os.Stderr, msg.Get(lang, "error.generic", err))
	return 1
}

func bundledOnly(modules []store.Module) []store.Module {
	bundled := []store.Module{}
	for _, module := range modules {
		if module.Bundled {
			bundled = append(bundled, module)
		}
	}
	return bundled
}

func enableModule(cfg *config.Config, module *store.Module) error {
	switch module.Kind {
	case store.Theme:
		cfg.Theme = module.ID
	case store.Snippet:
		cfg.Snippets = addUnique(cfg.Snippets, module.ID)
	default:
		cfg.Extensions = addUnique(cfg.Extensions, module.ID)
	}
	return config.Save(*cfg)
}

func disableModule(cfg *config.Config, module *store.Module) error {
	switch module.Kind {
	case store.Theme:
		if cfg.Theme == module.ID {
			cfg.Theme = ""
		}
	case store.Snippet:
		cfg.Snippets = removeItem(cfg.Snippets, module.ID)
	default:
		cfg.Extensions = removeItem(cfg.Extensions, module.ID)
	}
	return config.Save(*cfg)
}

func addUnique(list []string, value string) []string {
	for _, item := range list {
		if item == value {
			return list
		}
	}
	return append(list, value)
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

func removeItem(list []string, value string) []string {
	out := list[:0]
	for _, item := range list {
		if item != value {
			out = append(out, item)
		}
	}
	return out
}

// takeOverFromSpicetify restores the pristine client that Spicetify left in
// its backup folder, or asks the spicetify CLI to do it.
func takeOverFromSpicetify(install *detect.Install) (bool, error) {
	if spicetify, err := exec.LookPath("spicetify"); err == nil {
		command := exec.Command(spicetify, "restore")
		command.Stdout = os.Stdout
		command.Stderr = os.Stderr
		if err := command.Run(); err == nil {
			return true, nil
		}
	}

	for _, base := range []string{
		filepath.Join(os.Getenv("APPDATA"), "spicetify", "Backup"),
		filepath.Join(os.Getenv("LOCALAPPDATA"), "spicetify", "Backup"),
	} {
		if base == "" {
			continue
		}
		for _, candidate := range []string{
			filepath.Join(base, "xpui"),
			base,
		} {
			if !isDir(candidate) {
				continue
			}
			if !isFile(filepath.Join(candidate, "index.html")) {
				continue
			}
			// Never restore over our own patch: refuse folders carrying the marker.
			if data, err := os.ReadFile(filepath.Join(candidate, "index.html")); err == nil &&
				strings.Contains(string(data), paths.MarkerStart) {
				continue
			}

			if err := copyDir(candidate, install.XpuiPath); err != nil {
				return false, err
			}
			return true, nil
		}
	}

	return false, nil
}

func copyDir(source, target string) error {
	return filepath.WalkDir(source, func(entryPath string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(source, entryPath)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(target, relative)
		if entry.IsDir() {
			return os.MkdirAll(targetPath, 0o755)
		}
		data, err := os.ReadFile(entryPath)
		if err != nil {
			return err
		}
		return os.WriteFile(targetPath, data, 0o644)
	})
}

func isDir(target string) bool {
	info, err := os.Stat(target)
	return err == nil && info.IsDir()
}

func isFile(target string) bool {
	info, err := os.Stat(target)
	return err == nil && !info.IsDir()
}
