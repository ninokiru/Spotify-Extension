export const en = {
  "app.name": "Spotify Extension",
  "app.tagline": "Themes, extensions and tweaks for your Spotify client.",

  "nav.install": "Install",
  "nav.extensions": "Extensions",
  "nav.theme": "Theme",
  "nav.settings": "Settings",

  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.retry": "Retry",
  "common.loading": "Loading…",
  "common.none": "None",
  "common.yes": "Yes",
  "common.no": "No",
  "common.bundled": "Built-in",
  "common.custom": "Custom",
  "common.openFolder": "Open folder",
  "common.save": "Save",
  "common.done": "Done",
  "common.failed": "Failed",

  "install.heading": "Select an install to patch",
  "install.warning.title": "Only download from the official repository",
  "install.warning.body":
    "github.com/ninokiru/Spotify-Extension is the only official source. If you got this app anywhere else, delete it, run a malware scan and change your passwords.",

  "install.empty.title": "No Spotify install found",
  "install.empty.body":
    "Install Spotify for Windows first, open it once, then scan again. You can also point the app at a custom folder.",
  "install.empty.scan": "Scan again",
  "install.empty.browse": "Choose folder",

  "install.state.stock": "Not patched",
  "install.state.patched": "Patched",
  "install.state.foreign": "Patched by another tool",
  "install.state.partial": "Incomplete patch",
  "install.state.unsupported": "Unsupported",

  "install.variant.store": "Microsoft Store",
  "install.variant.normal": "Desktop",
  "install.meta.version": "v{version}",
  "install.meta.unknownVersion": "Unknown version",
  "install.meta.backup": "Backup {date}",

  "install.action.install": "Install",
  "install.action.repair": "Reinstall / Repair",
  "install.action.uninstall": "Uninstall",
  "install.action.folder": "Open folder",

  "install.confirm.uninstall.title": "Uninstall Spotify Extension?",
  "install.confirm.uninstall.body":
    "This removes every patched file and restores the backup taken before the first install. Spotify will need a restart.",
  "install.confirm.repair.title": "Repair this install?",
  "install.confirm.repair.body":
    "Files will be rewritten from the backup and patched again. Enabled extensions and your theme are kept.",

  "install.foreign.title": "Another patcher is active",
  "install.foreign.body":
    "This Spotify folder is already modified by Spicetify or another tool. Both tools write into the same client and will conflict. Restore the original client before installing here.",

  "extensions.heading": "Extensions",
  "extensions.hint": "Drop a .js file into the extensions folder, then press reload.",
  "extensions.empty": "No extensions installed yet.",
  "extensions.enabled": "Enabled",
  "extensions.disabled": "Disabled",
  "extensions.reload": "Reload",
  "extensions.openFolder": "Open folder",
  "extensions.count": "{enabled} of {total} enabled",

  "theme.heading": "Theme",
  "theme.theme": "Theme",
  "theme.scheme": "Color scheme",
  "theme.default": "Spotify default",
  "theme.accent": "Accent color",
  "theme.background": "Background",
  "theme.sidebar": "Sidebar",
  "theme.text": "Text",
  "theme.subtext": "Secondary text",
  "theme.card": "Cards",
  "theme.preview": "Preview",
  "theme.customCss": "Custom CSS",
  "theme.customCssHint": "Saved to the client on every change.",
  "theme.apply": "Apply theme",
  "theme.reset": "Reset colors",
  "theme.empty": "No themes found. Add a folder with user.css to the themes directory.",

  "settings.heading": "Settings",
  "settings.language": "Language",
  "settings.languageHint": "Takes effect immediately.",
  "settings.maintenance": "Maintenance",
  "settings.restart": "Restart Spotify",
  "settings.restartHint": "Needed after installing or removing extensions.",
  "settings.openConfig": "Open config folder",
  "settings.openConfigHint": "Extensions, themes and backups live here.",
  "settings.autoApply": "Re-apply after a Spotify update",
  "settings.autoApplyHint": "Patches the client again the next time the app starts.",
  "settings.about": "About",
  "settings.version": "Version {version}",
  "settings.repo": "Source code",
  "settings.license": "MIT License",

  "progress.detect": "Scanning for Spotify…",
  "progress.backup": "Backing up the client…",
  "progress.payload": "Copying runtime…",
  "progress.extensions": "Copying extensions…",
  "progress.styles": "Writing styles…",
  "progress.patch": "Patching index.html…",
  "progress.restore": "Restoring backup…",
  "progress.done": "Done",

  "op.install.done": "Installed. Restart Spotify to see the changes.",
  "op.repair.done": "Repaired. Restart Spotify to see the changes.",
  "op.uninstall.done": "Restored to the original client.",
  "op.theme.done": "Theme saved.",
  "op.extensions.done": "Extensions updated.",
  "op.restart.done": "Spotify restarted.",
  "op.restart.failed": "Could not restart Spotify.",
  "op.error.noInstall": "No Spotify install selected.",
  "op.error.notFound": "That Spotify folder no longer exists.",
  "op.error.unsupported": "This Spotify build is not supported.",
  "op.error.foreignPatch":
    "This client is patched by another tool. Restore it first.",
  "op.error.noBackup": "No backup found, so nothing can be restored.",
  "op.error.spotifyRunning": "Quit Spotify before doing this.",
  "op.error.permission": "Access denied. Try running as administrator.",
  "op.error.generic": "Something went wrong.",
  "op.error.busy": "Another operation is already running.",

  "toast.copied": "Copied",
} as const;

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

export const vi: Dictionary = {
  "app.name": "Spotify Extension",
  "app.tagline": "Đổi giao diện, thêm tiện ích và tinh chỉnh Spotify của bạn.",

  "nav.install": "Cài đặt",
  "nav.extensions": "Tiện ích",
  "nav.theme": "Giao diện",
  "nav.settings": "Cài đặt chung",

  "common.cancel": "Huỷ",
  "common.close": "Đóng",
  "common.confirm": "Xác nhận",
  "common.retry": "Thử lại",
  "common.loading": "Đang tải…",
  "common.none": "Không có",
  "common.yes": "Có",
  "common.no": "Không",
  "common.bundled": "Có sẵn",
  "common.custom": "Tự thêm",
  "common.openFolder": "Mở thư mục",
  "common.save": "Lưu",
  "common.done": "Xong",
  "common.failed": "Thất bại",

  "install.heading": "Chọn bản Spotify để vá",
  "install.warning.title": "Chỉ tải từ kho chính thức",
  "install.warning.body":
    "github.com/ninokiru/Spotify-Extension là nguồn duy nhất. Nếu bạn tải app này từ nơi khác, hãy xoá đi, quét virus và đổi mật khẩu.",

  "install.empty.title": "Không tìm thấy Spotify",
  "install.empty.body":
    "Bạn cài Spotify cho Windows trước, mở lên một lần rồi quét lại. Hoặc trỏ tới thư mục cài đặt thủ công.",
  "install.empty.scan": "Quét lại",
  "install.empty.browse": "Chọn thư mục",

  "install.state.stock": "Chưa vá",
  "install.state.patched": "Đã vá",
  "install.state.foreign": "Bị công cụ khác vá",
  "install.state.partial": "Vá dở dang",
  "install.state.unsupported": "Không hỗ trợ",

  "install.variant.store": "Microsoft Store",
  "install.variant.normal": "Bản desktop",
  "install.meta.version": "v{version}",
  "install.meta.unknownVersion": "Không rõ phiên bản",
  "install.meta.backup": "Sao lưu {date}",

  "install.action.install": "Cài đặt",
  "install.action.repair": "Cài lại / Sửa",
  "install.action.uninstall": "Gỡ cài đặt",
  "install.action.folder": "Mở thư mục",

  "install.confirm.uninstall.title": "Gỡ Spotify Extension?",
  "install.confirm.uninstall.body":
    "Toàn bộ file đã vá sẽ bị xoá và bản sao lưu trước lần cài đầu tiên được khôi phục. Bạn cần khởi động lại Spotify.",
  "install.confirm.repair.title": "Sửa bản cài này?",
  "install.confirm.repair.body":
    "File sẽ được ghi lại từ bản sao lưu rồi vá lại. Tiện ích đang bật và giao diện của bạn được giữ nguyên.",

  "install.foreign.title": "Đang có công cụ khác vá Spotify",
  "install.foreign.body":
    "Thư mục Spotify này đã bị Spicetify hoặc công cụ khác sửa. Hai bên ghi vào cùng một client nên sẽ xung đột. Hãy khôi phục bản gốc trước khi cài ở đây.",

  "extensions.heading": "Tiện ích",
  "extensions.hint": "Thả file .js vào thư mục tiện ích rồi bấm tải lại.",
  "extensions.empty": "Chưa có tiện ích nào.",
  "extensions.enabled": "Đang bật",
  "extensions.disabled": "Đang tắt",
  "extensions.reload": "Tải lại",
  "extensions.openFolder": "Mở thư mục",
  "extensions.count": "Bật {enabled} trên {total}",

  "theme.heading": "Giao diện",
  "theme.theme": "Bộ giao diện",
  "theme.scheme": "Bảng màu",
  "theme.default": "Mặc định của Spotify",
  "theme.accent": "Màu nhấn",
  "theme.background": "Nền chính",
  "theme.sidebar": "Thanh bên",
  "theme.text": "Chữ",
  "theme.subtext": "Chữ phụ",
  "theme.card": "Thẻ",
  "theme.preview": "Xem trước",
  "theme.customCss": "CSS tuỳ chỉnh",
  "theme.customCssHint": "Lưu vào client mỗi khi bạn sửa.",
  "theme.apply": "Áp dụng giao diện",
  "theme.reset": "Đặt lại màu",
  "theme.empty":
    "Chưa có bộ giao diện nào. Thêm thư mục có file user.css vào thư mục themes.",

  "settings.heading": "Cài đặt chung",
  "settings.language": "Ngôn ngữ",
  "settings.languageHint": "Đổi ngay lập tức.",
  "settings.maintenance": "Bảo trì",
  "settings.restart": "Khởi động lại Spotify",
  "settings.restartHint": "Cần thiết sau khi cài hoặc gỡ tiện ích.",
  "settings.openConfig": "Mở thư mục cấu hình",
  "settings.openConfigHint": "Tiện ích, giao diện và bản sao lưu nằm ở đây.",
  "settings.autoApply": "Tự vá lại sau khi Spotify cập nhật",
  "settings.autoApplyHint": "Vá lại client ở lần mở app tiếp theo.",
  "settings.about": "Giới thiệu",
  "settings.version": "Phiên bản {version}",
  "settings.repo": "Mã nguồn",
  "settings.license": "Giấy phép MIT",

  "progress.detect": "Đang tìm Spotify…",
  "progress.backup": "Đang sao lưu client…",
  "progress.payload": "Đang chép runtime…",
  "progress.extensions": "Đang chép tiện ích…",
  "progress.styles": "Đang ghi giao diện…",
  "progress.patch": "Đang vá index.html…",
  "progress.restore": "Đang khôi phục bản sao lưu…",
  "progress.done": "Xong",

  "op.install.done": "Đã cài. Khởi động lại Spotify để thấy thay đổi.",
  "op.repair.done": "Đã sửa. Khởi động lại Spotify để thấy thay đổi.",
  "op.uninstall.done": "Đã khôi phục về bản gốc.",
  "op.theme.done": "Đã lưu giao diện.",
  "op.extensions.done": "Đã cập nhật tiện ích.",
  "op.restart.done": "Đã khởi động lại Spotify.",
  "op.restart.failed": "Không khởi động lại được Spotify.",
  "op.error.noInstall": "Bạn chưa chọn bản Spotify nào.",
  "op.error.notFound": "Thư mục Spotify đó không còn tồn tại.",
  "op.error.unsupported": "Bản Spotify này chưa được hỗ trợ.",
  "op.error.foreignPatch":
    "Client này đang bị công cụ khác vá. Hãy khôi phục bản gốc trước.",
  "op.error.noBackup": "Không tìm thấy bản sao lưu nên không thể khôi phục.",
  "op.error.spotifyRunning": "Hãy thoát Spotify trước khi làm việc này.",
  "op.error.permission": "Không có quyền truy cập. Thử chạy bằng quyền quản trị viên.",
  "op.error.generic": "Đã có lỗi xảy ra.",
  "op.error.busy": "Đang có một tác vụ khác chạy.",

  "toast.copied": "Đã chép",
};

export const dictionaries: Record<LanguageCode, Dictionary> = { en, vi };

export type LanguageCode = "en" | "vi";

export function isLanguage(value: unknown): value is LanguageCode {
  return value === "en" || value === "vi";
}

export function translate(
  language: LanguageCode,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[language];
  const template = dict[key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
