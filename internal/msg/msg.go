package msg

import "fmt"

const (
	en = "en"
	vi = "vi"
)

var table = map[string]map[string]string{
	en: {
		"help": `Spotify Extension — themes, extensions and tweaks for the Spotify desktop client.

Usage:
  sxe status              List Spotify installs and their state
  sxe backup              Snapshot the client before the first patch
  sxe apply               Write everything and patch the client (backup runs automatically)
  sxe restore             Roll the client back to the pristine backup
  sxe uninstall           Alias of restore, plus remove leftover files
  sxe config              Print the current config
  sxe config <key> <val>  Change one setting (extensions, snippets, theme, colors.*, language, safe_mode, check_update, spotify_path)
  sxe store list          List modules (add "all" to include the online catalogue)
  sxe store install <id>  Install a module
  sxe store uninstall <id> Remove a module
  sxe store update <id>   Update a module to the newest version
  sxe update              Check for a new release
  sxe update --yes        Download and install the new release
  sxe version             Print the version

Flags for backup/apply/restore:
  --path <root>   Pick the Spotify folder explicitly
  --replace       Apply over a client patched by Spicetify (restores it first)

Examples:
  sxe backup
  sxe config extensions adblock | volume-memory
  sxe apply
  sxe store install adblock
  sxe apply`,

		"detect.title":       "Spotify installs",
		"detect.none":        "No Spotify install found.",
		"detect.pick":        "More than one install found — pass --path <folder>:",
		"state.stock":        "original",
		"state.patched":      "patched by Spotify Extension",
		"state.foreign":      "patched by another tool",
		"state.partial":      "half-patched",
		"state.unsupported":  "unsupported (xpui.spa build)",
		"state.backup":       "backup available",
		"state.nobackup":     "no backup",

		"backup.done":    "Backed up %s (%d files)",
		"backup.exists":  "Backup already exists — not overwritten",
		"backup.skipped": "Client already has a backup",

		"apply.foreign":  "This client is patched by another tool. Run \"spicetify restore\" first, or add --replace so this tool restores it automatically.",
		"apply.replaced": "Restored the original client before patching",
		"apply.done":     "Applied. Restart Spotify to see the changes.",
		"apply.noasset":  "Asset folder is missing: %s",

		"restore.done":  "Restored the original client.",
		"restore.none":  "No backup found — nothing to restore.",
		"restore.skip":  "Client is not patched — nothing to do.",

		"replace.none": "Could not restore the Spicetify patch automatically (no spicetify command, no backup folder found). Run \"spicetify restore\" yourself, then run this command again without --replace.",

		"config.title":   "Config: %s",
		"config.changed": "Changed %s = %s",
		"config.badkey":  "Unknown config key %q",
		"config.unknown": "Unknown setting %q",
		"config.saved":   "Config saved. Run \"sxe apply\" to push it into Spotify.",

		"store.title":     "Modules",
		"store.empty":     "No modules match.",
		"store.listline":  "%-24s %-10s v%-8s %s",
		"store.notFound":  "Module %q is not in the catalogue.",
		"store.installed": "Installed %q. Run \"sxe apply\" to push it into Spotify.",
		"store.removed":   "Removed %q. Run \"sxe apply\" to push the change into Spotify.",
		"store.updated":   "Updated %q. Run \"sxe apply\" to push it into Spotify.",
		"store.download":  "Could not download the module files.",
		"store.offline":   "The online catalogue is unreachable — showing bundled modules only.",

		"update.checking":   "Checking for updates…",
		"update.latest":     "You are on the newest version (%s).",
		"update.available":  "New version available: %s (current: %s)",
		"update.download":   "Downloading %s…",
		"update.done":       "Updated to %s. Run \"sxe version\" to confirm.",
		"update.failed":     "Update failed: %s",
		"update.notfound":   "No Windows release asset found.",
		"update.locked":     "Some files are in use — run \"sxe update --yes\" again after closing other windows.",

		"error.generic": "Something went wrong: %s",
		"error.needArg": "This command needs an argument: %s",
	},

	vi: {
		"help": `Spotify Extension — đổi giao diện, thêm tiện ích và tinh chỉnh cho Spotify Desktop.

Cách dùng:
  sxe status              Liệt kê bản Spotify và trạng thái
  sxe backup              Chụp bản gốc trước khi vá lần đầu
  sxe apply               Ghi toàn bộ và vá client (tự backup nếu chưa có)
  sxe restore             Khôi phục client về bản gốc đã lưu
  sxe uninstall           Giống restore, kèm dọn file thừa
  sxe config              In cấu hình hiện tại
  sxe config <khoá> <giá> Sửa một mục (extensions, snippets, theme, colors.*, language, safe_mode, check_update, spotify_path)
  sxe store list          Liệt kê module (thêm "all" để gộp danh mục online)
  sxe store install <id>  Cài một module
  sxe store uninstall <id> Gỡ một module
  sxe store update <id>   Cập nhật module lên bản mới nhất
  sxe update              Kiểm tra bản mới
  sxe update --yes        Tải và cài bản mới
  sxe version             In phiên bản

Cờ cho backup/apply/restore:
  --path <thư mục>   Chọn thư mục Spotify một cách tường minh
  --replace          Vá đè lên client đang bị Spicetify vá (tự khôi phục bản gốc trước)

Ví dụ:
  sxe backup
  sxe config extensions adblock | volume-memory
  sxe apply
  sxe store install adblock
  sxe apply`,

		"detect.title":       "Bản Spotify tìm thấy",
		"detect.none":        "Không tìm thấy Spotify nào.",
		"detect.pick":        "Tìm thấy nhiều bản — thêm --path <thư mục>:",
		"state.stock":        "nguyên bản",
		"state.patched":      "đã được Spotify Extension vá",
		"state.foreign":      "đang bị công cụ khác vá",
		"state.partial":      "vá dở",
		"state.unsupported":  "không hỗ trợ (bản xpui.spa)",
		"state.backup":       "có bản sao lưu",
		"state.nobackup":     "chưa có bản sao lưu",

		"backup.done":    "Đã sao lưu %s (%d file)",
		"backup.exists":  "Bản sao lưu đã có — không ghi đè",
		"backup.skipped": "Client đã có bản sao lưu",

		"apply.foreign":  "Client này đang bị công cụ khác vá. Chạy \"spicetify restore\" trước, hoặc thêm --replace để công cụ này tự khôi phục.",
		"apply.replaced": "Đã khôi phục bản gốc trước khi vá",
		"apply.done":     "Đã áp dụng. Khởi động lại Spotify để thấy thay đổi.",
		"apply.noasset":  "Thiếu thư mục dữ liệu: %s",

		"restore.done":  "Đã khôi phục client về bản gốc.",
		"restore.none":  "Không có bản sao lưu — không có gì để khôi phục.",
		"restore.skip":  "Client chưa bị vá — không có gì để làm.",

		"replace.none": "Không tự khôi phục được bản vá Spicetify (không có lệnh spicetify, không thấy thư mục backup). Cậu chạy \"spicetify restore\" thủ công rồi chạy lại lệnh này không cần --replace.",

		"config.title":   "Cấu hình: %s",
		"config.changed": "Đã đổi %s = %s",
		"config.badkey":  "Khoá cấu hình không tồn tại %q",
		"config.unknown": "Không biết mục %q",
		"config.saved":   "Đã lưu cấu hình. Chạy \"sxe apply\" để đẩy vào Spotify.",

		"store.title":     "Module",
		"store.empty":     "Không có module nào khớp.",
		"store.listline":  "%-24s %-10s v%-8s %s",
		"store.notFound":  "Module %q không có trong danh mục.",
		"store.installed": "Đã cài %q. Chạy \"sxe apply\" để đẩy vào Spotify.",
		"store.removed":   "Đã gỡ %q. Chạy \"sxe apply\" để đẩy thay đổi vào Spotify.",
		"store.updated":   "Đã cập nhật %q. Chạy \"sxe apply\" để đẩy vào Spotify.",
		"store.download":  "Không tải được file của module.",
		"store.offline":   "Không tải được danh mục online — chỉ hiện module đi kèm.",

		"update.checking":   "Đang kiểm tra bản mới…",
		"update.latest":     "Cậu đang ở bản mới nhất (%s).",
		"update.available":  "Có bản mới: %s (đang chạy: %s)",
		"update.download":   "Đang tải %s…",
		"update.done":       "Đã cập nhật lên %s. Chạy \"sxe version\" để xác nhận.",
		"update.failed":     "Cập nhật thất bại: %s",
		"update.notfound":   "Không thấy file Windows trong bản phát hành.",
		"update.locked":     "Vài file đang bị khoá — đóng cửa sổ khác rồi chạy lại \"sxe update --yes\".",

		"error.generic": "Đã có lỗi xảy ra: %s",
		"error.needArg": "Lệnh này cần thêm tham số: %s",
	},
}

// Get resolves a message for the given language, falling back to English.
func Get(lang, key string, args ...interface{}) string {
	dict, ok := table[lang]
	if !ok {
		dict = table[en]
	}
	template, ok := dict[key]
	if !ok {
		template = table[en][key]
	}
	if template == "" {
		template = key
	}
	if len(args) > 0 {
		return fmt.Sprintf(template, args...)
	}
	return template
}
