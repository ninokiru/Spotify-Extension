'use strict';

/* Spotify Extension — UI controller.
   All displayed copy comes from DICT. Backend data only reaches the DOM
   through textContent and createElement. */

const DICT = {
  vi: {
    'app.name': 'Spotify Extension',
    'nav.label': 'Điều hướng chính',
    'nav.overview': 'Tổng quan',
    'nav.modules': 'Module',
    'nav.appearance': 'Giao diện',
    'nav.tools': 'Công cụ',
    'nav.css': 'CSS',
    'css.title': 'CSS của tôi',
    'css.files': 'Tệp CSS',
    'css.userFile': 'user.css',
    'css.snippet': 'Snippet',
    'css.new': 'Tạo snippet',
    'css.newName': 'Tên file',
    'css.create': 'Tạo',
    'css.cancel': 'Huỷ',
    'css.save': 'Lưu',
    'css.reload': 'Đọc lại',
    'css.delete': 'Xoá',
    'css.confirmDelete': 'Xoá?',
    'css.saved': 'Đã lưu CSS',
    'css.deleted': 'Đã xoá file',
    'css.hint': 'Áp dụng lại để Spotify nhận CSS mới.',
    'css.emptyHint': 'Chưa có snippet nào. Tạo một file để thêm CSS riêng.',
    'css.chars': '{count} ký tự',
    'css.preview': 'Xem trước',
    'css.previewHint': 'Cập nhật khi bạn gõ',
    'css.loadError': 'Không đọc được danh sách CSS.',
    'css.nameTaken': 'Tên này đã có.',
    'css.badName': 'Tên chỉ dùng chữ, số, dấu gạch ngang và gạch dưới.',
    'sidebar.themeToLight': 'Chuyển sang giao diện sáng',
    'sidebar.themeToDark': 'Chuyển sang giao diện tối',
    'preview.label': 'Chế độ xem trước — dữ liệu mẫu',
    'common.retry': 'Thử lại',
    'common.cancel': 'Huỷ',
    'common.close': 'Đóng',
    'common.loading': 'Đang tải…',
    'common.none': 'Chưa có',
    'common.ok': 'OK',
    'common.error': 'Lỗi',
    'common.copy': 'Chép',
    'common.save': 'Lưu',
    'common.refresh': 'Làm mới',
    'common.openFolder': 'Mở thư mục',
    'common.dash': '—',
    'err.not-found': 'Không tìm thấy bản cài Spotify.',
    'err.unsupported': 'Bản Spotify này không hỗ trợ.',
    'err.foreign': 'Client đã được vá bởi công cụ khác.',
    'err.no-asset': 'Thiếu tệp runtime cạnh ứng dụng.',
    'err.no-backup': 'Không có bản sao lưu cho phiên bản này.',
    'err.restart-failed': 'Không khởi động lại được Spotify.',
    'err.open-failed': 'Không mở được thư mục.',
    'err.error': 'Không thực hiện được thao tác.',
    'err.load': 'Không tải được thông tin bản cài.',
    'err.modules': 'Không tải được danh sách module.',
    'err.themes': 'Không tải được danh sách theme.',
    'err.doctor': 'Không chạy được chẩn đoán.',
    'err.save': 'Không lưu được cấu hình.',
    'err.copy': 'Không chép được nội dung.',
    'err.unknown': 'Đã xảy ra lỗi.',
    'state.stock': 'Nguyên bản',
    'state.patched': 'Đã vá',
    'state.partial': 'Vá dở',
    'state.foreign': 'Công cụ khác',
    'state.unsupported': 'Không hỗ trợ',
    'variant.normal': 'Thường',
    'variant.store': 'Store',
    'overview.title': 'Tổng quan',
    'overview.spotify': 'Spotify',
    'overview.install': 'Bản cài',
    'overview.folder': 'Thư mục',
    'overview.copyPath': 'Chép đường dẫn',
    'overview.pathCopied': 'Đã chép đường dẫn.',
    'overview.version': 'Phiên bản',
    'overview.arch': 'Kiến trúc',
    'overview.channel': 'Kênh',
    'overview.patchedBy': 'Vá bởi',
    'overview.backup': 'Sao lưu',
    'overview.backupHint': 'Lưu bản gốc trước khi vá.',
    'overview.backupExists': 'Đã có bản sao lưu.',
    'overview.apply': 'Áp dụng',
    'overview.restore': 'Khôi phục',
    'overview.backupAction': 'Sao lưu',
    'overview.restart': 'Khởi động lại',
    'overview.openFolder': 'Mở thư mục',
    'overview.openData': 'Mở thư mục dữ liệu',
    'overview.applying': 'Đang áp dụng…',
    'overview.restoring': 'Đang khôi phục…',
    'overview.backingUp': 'Đang sao lưu…',
    'overview.restarting': 'Đang khởi động…',
    'overview.opening': 'Đang mở…',
    'overview.warnRunning': 'Thay đổi chỉ có hiệu lực sau khi khởi động lại.',
    'overview.warnSafe': 'Chế độ an toàn đang bật.',
    'overview.noBackup': 'Chưa có',
    'overview.warnSpa': 'Bản cài dạng gói xpui.spa — Áp dụng sẽ giải nén ra Apps\\xpui (và giải nén lại mỗi khi Spotify cập nhật), gói gốc giữ nguyên.',
    'overview.turnOff': 'Tắt',
    'overview.restartNow': 'Khởi động lại',
    'overview.unsupported': 'Bản Spotify này không hỗ trợ.',
    'overview.empty': 'Không tìm thấy Spotify.',
    'overview.confirmRestore': 'Khôi phục bản gốc?',
    'overview.confirmRestoreBody': 'Thay đổi sẽ mất.',
    'overview.confirmRestoreAction': 'Khôi phục',
    'overview.noPatcher': 'Chưa có',
    'toast.applied': 'Đã áp dụng.',
    'toast.appliedRestart': 'Đã áp dụng. Khởi động lại Spotify.',
    'toast.restored': 'Đã khôi phục bản gốc.',
    'toast.backedUp': 'Đã sao lưu {count} tệp.',
    'toast.restarted': 'Đã khởi động lại Spotify.',
    'toast.saved': 'Đã lưu.',
    'toast.savedPath': 'Đã lưu đường dẫn.',
    'toast.colorsReset': 'Đã đặt lại màu.',
    'toast.themeChanged': 'Đã đổi theme.',
    'toast.reportCopied': 'Đã chép báo cáo.',
    'toast.moduleOn': 'Đã bật {name}.',
    'toast.moduleOff': 'Đã tắt {name}.',
    'toast.moduleInstalled': 'Đã cài {name}.',
    'toast.moduleRemoved': 'Đã gỡ {name}.',
    'toast.moduleUpdated': 'Đã cập nhật {name}.',
    'modules.title': 'Module',
    'modules.search': 'Tìm module',
    'modules.group.extension': 'Tiện ích',
    'modules.group.theme': 'Theme',
    'modules.group.snippet': 'Snippet',
    'modules.empty': 'Chưa có module.',
    'modules.emptyAction': 'Mở thư mục module',
    'modules.noResults': 'Không có kết quả.',
    'modules.clearSearch': 'Xoá tìm kiếm',
    'modules.newUpdate': 'Có bản mới',
    'modules.update': 'Cập nhật',
    'modules.install': 'Cài',
    'modules.remove': 'Gỡ',
    'modules.use': 'Dùng',
    'modules.inUse': 'Đang dùng',
    'modules.toggleOn': 'Bật {name}',
    'modules.toggleOff': 'Tắt {name}',
    'modules.busyInstall': 'Đang cài…',
    'modules.busyUpdate': 'Đang cập nhật…',
    'modules.busyRemove': 'Đang gỡ…',
    'modules.removeTitle': 'Gỡ {name}?',
    'modules.removeBody': 'Tệp đã tải sẽ bị xoá.',
    'modules.confirmRemove': 'Gỡ',
    'modules.loadError': 'Không tải được danh sách module.',
    'appearance.title': 'Giao diện',
    'appearance.themes': 'Theme',
    'appearance.import': 'Nhập theme Spicetify',
    'appearance.importPlaceholder': 'Dán đường dẫn thư mục theme',
    'appearance.importAction': 'Nhập',
    'appearance.importHint': 'Chọn thư mục có color.ini hoặc user.css của theme Spicetify.',
    'appearance.imported': 'Đã nhập theme {name}',
    'appearance.colors': 'Màu',
    'appearance.color.accent': 'Màu nhấn',
    'appearance.color.background': 'Nền',
    'appearance.color.sidebar': 'Thanh bên',
    'appearance.color.card': 'Thẻ',
    'appearance.color.text': 'Chữ',
    'appearance.color.subtext': 'Chữ phụ',
    'appearance.reset': 'Đặt lại',
    'appearance.inUse': 'Đang dùng',
    'appearance.applying': 'Đang áp dụng…',
    'appearance.note': '6 màu này chỉ đổi Spotify, không đổi giao diện ứng dụng.',
    'appearance.invalidHex': 'Mã màu không hợp lệ.',
    'appearance.empty': 'Chưa có theme.',
    'appearance.emptyAction': 'Mở thư mục theme',
    'appearance.useTheme': 'Dùng theme {name}',
    'appearance.loadError': 'Không tải được danh sách theme.',
    'tools.title': 'Công cụ',
    'tools.general': 'Chung',
    'tools.language': 'Ngôn ngữ',
    'tools.safeMode': 'Chế độ an toàn',
    'tools.safeHint': 'Bỏ qua tiện ích và tinh chỉnh khi áp dụng.',
    'tools.safeWarn': 'Áp dụng lại ở Tổng quan.',
    'tools.updates': 'Cập nhật',
    'tools.checkUpdate': 'Tự kiểm tra',
    'tools.checkHint': 'Kiểm tra bản mới khi mở ứng dụng.',
    'tools.spotify': 'Spotify',
    'tools.spotifyPath': 'Đường dẫn Spotify',
    'tools.pathPlaceholder': 'Chưa chọn',
    'tools.savePath': 'Lưu',
    'tools.diagnostics': 'Chẩn đoán',
    'tools.runAgain': 'Chạy lại',
    'tools.copyReport': 'Chép báo cáo',
    'tools.diagnosticsEmpty': 'Chưa có dữ liệu.',
    'tools.colName': 'Hạng mục',
    'tools.colValue': 'Giá trị',
    'tools.colStatus': 'Trạng thái',
    'tools.data': 'Dữ liệu',
    'tools.openData': 'Mở thư mục',
    'tools.appAppearance': 'Giao diện ứng dụng',
    'tools.mode': 'Chế độ',
    'tools.light': 'Sáng',
    'tools.dark': 'Tối',
    'tools.system': 'Hệ thống',
    'tools.accent': 'Màu nhấn',
    'tools.accent.green': 'Xanh Spotify',
    'tools.accent.purple': 'Tím',
    'tools.accent.orange': 'Cam',
    'tools.accent.pink': 'Hồng',
    'tools.accent.blue': 'Xanh dương',
    'tools.diag.install': 'Bản cài',
    'tools.diag.backup': 'Sao lưu',
    'tools.diag.spotify': 'Spotify',
    'tools.diag.config': 'Cấu hình',
    'tools.diag.runtime': 'Runtime',
    'tools.diag.extensions': 'Tiện ích',
    'tools.diag.themes': 'Theme',
    'tools.diag.language': 'Ngôn ngữ',
    'tools.diag.running': 'Đang chạy',
    'tools.diag.closed': 'Đã đóng',
    'tools.diag.none': 'Chưa có',
    'tools.diag.missing': 'Không thấy',
    'tools.diag.vi': 'Tiếng Việt',
    'tools.diag.en': 'Tiếng Anh',
    'demo.adblock.description': 'Ẩn quảng cáo và bảng nâng cấp.',
    'demo.auto-skip-explicit.description': 'Tự nhảy qua bài có nhãn explicit.',
    'demo.quick-keys.description': 'Phím tắt tua, âm lượng và tắt tiếng.',
    'demo.track-copy.description': 'Chép bài đang phát bằng Alt+C.',
    'demo.volume-memory.description': 'Khôi phục âm lượng cũ khi mở.',
    'demo.skip-short-tracks.description': 'Nhảy qua bài ngắn hơn 45 giây.',
    'demo.playback-speed.description': 'Đổi tốc độ phát bằng Alt+1.',
    'demo.like-hotkey.description': 'Thích bài đang phát bằng Alt+L.',
    'demo.hide-sidebar.description': 'Ẩn thanh bên bằng Alt+B.',
    'demo.focus-mode.description': 'Làm mờ thanh bên và nội dung.',
    'demo.volume-wheel.description': 'Lăn chuột trên thanh phát để đổi âm lượng.',
    'demo.Soft.description': 'Đồng hồ, nút phát lớn, tiến trình bo tròn.',
    'demo.Nord.description': 'Xanh Bắc cực dịu trên nền xám.',
    'demo.Dracula.description': 'Tím hồng trên nền tím than.',
    'demo.Amoled.description': 'Nền đen tuyệt đối cho OLED.',
    'demo.Catppuccin.description': 'Bảng màu Mocha tím pastel.',
    'demo.Gruvbox.description': 'Tông đất ấm kiểu retro.',
    'demo.TokyoNight.description': 'Đêm xanh sâu với điểm nhấn sáng.',
    'demo.RosePine.description': 'Hồng và tím nhạt trên nền thông.',
    'demo.Solarized.description': 'Xanh lam và cát dịu mắt.',
    'demo.hide-window-controls.description': 'Ẩn nút cửa sổ Windows.'
  },
  en: {
    'app.name': 'Spotify Extension',
    'nav.label': 'Primary navigation',
    'nav.overview': 'Overview',
    'nav.modules': 'Modules',
    'nav.appearance': 'Appearance',
    'nav.tools': 'Tools',
    'nav.css': 'CSS',
    'css.title': 'My CSS',
    'css.files': 'CSS files',
    'css.userFile': 'user.css',
    'css.snippet': 'Snippet',
    'css.new': 'New snippet',
    'css.newName': 'File name',
    'css.create': 'Create',
    'css.cancel': 'Cancel',
    'css.save': 'Save',
    'css.reload': 'Reload',
    'css.delete': 'Delete',
    'css.confirmDelete': 'Delete?',
    'css.saved': 'CSS saved',
    'css.deleted': 'File deleted',
    'css.hint': 'Apply again so Spotify picks up the new CSS.',
    'css.emptyHint': 'No snippets yet. Create a file to add your own CSS.',
    'css.chars': '{count} characters',
    'css.preview': 'Preview',
    'css.previewHint': 'Updates as you type',
    'css.loadError': 'Could not read the CSS files.',
    'css.nameTaken': 'That name is already used.',
    'css.badName': 'Use letters, digits, dashes and underscores only.',
    'sidebar.themeToLight': 'Switch to light appearance',
    'sidebar.themeToDark': 'Switch to dark appearance',
    'preview.label': 'Preview mode — sample data',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.loading': 'Loading…',
    'common.none': 'None',
    'common.ok': 'OK',
    'common.error': 'Error',
    'common.copy': 'Copy',
    'common.save': 'Save',
    'common.refresh': 'Refresh',
    'common.openFolder': 'Open folder',
    'common.dash': '—',
    'err.not-found': 'Spotify install not found.',
    'err.unsupported': 'This Spotify build is not supported.',
    'err.foreign': 'The client is patched by another tool.',
    'err.no-asset': 'The runtime file is missing next to the app.',
    'err.no-backup': 'No backup for this version.',
    'err.restart-failed': 'Could not restart Spotify.',
    'err.open-failed': 'Could not open the folder.',
    'err.error': 'The action could not be completed.',
    'err.load': 'Could not load install information.',
    'err.modules': 'Could not load modules.',
    'err.themes': 'Could not load themes.',
    'err.doctor': 'Could not run diagnostics.',
    'err.save': 'Could not save the configuration.',
    'err.copy': 'Could not copy the content.',
    'err.unknown': 'Something went wrong.',
    'state.stock': 'Original',
    'state.patched': 'Patched',
    'state.partial': 'Half-patched',
    'state.foreign': 'Other tool',
    'state.unsupported': 'Unsupported',
    'variant.normal': 'Standard',
    'variant.store': 'Store',
    'overview.title': 'Overview',
    'overview.spotify': 'Spotify',
    'overview.install': 'Install',
    'overview.folder': 'Folder',
    'overview.copyPath': 'Copy path',
    'overview.pathCopied': 'Path copied.',
    'overview.version': 'Version',
    'overview.arch': 'Architecture',
    'overview.channel': 'Channel',
    'overview.patchedBy': 'Patched by',
    'overview.backup': 'Backup',
    'overview.backupHint': 'Save the original before patching.',
    'overview.backupExists': 'A backup already exists.',
    'overview.apply': 'Apply',
    'overview.restore': 'Restore',
    'overview.backupAction': 'Back up',
    'overview.restart': 'Restart',
    'overview.openFolder': 'Open folder',
    'overview.openData': 'Open data folder',
    'overview.applying': 'Applying…',
    'overview.restoring': 'Restoring…',
    'overview.backingUp': 'Backing up…',
    'overview.restarting': 'Restarting…',
    'overview.opening': 'Opening…',
    'overview.warnRunning': 'Changes take effect after a restart.',
    'overview.warnSafe': 'Safe mode is on.',
    'overview.noBackup': 'None',
    'overview.warnSpa': 'This client ships as xpui.spa — applying extracts it into Apps\\xpui and re-extracts it after every Spotify update, leaving the archive untouched.',
    'overview.turnOff': 'Turn off',
    'overview.restartNow': 'Restart',
    'overview.unsupported': 'This Spotify build is not supported.',
    'overview.empty': 'Spotify was not found.',
    'overview.confirmRestore': 'Restore the original?',
    'overview.confirmRestoreBody': 'Changes will be lost.',
    'overview.confirmRestoreAction': 'Restore',
    'overview.noPatcher': 'None',
    'toast.applied': 'Applied.',
    'toast.appliedRestart': 'Applied. Restart Spotify.',
    'toast.restored': 'Restored the original.',
    'toast.backedUp': 'Backed up {count} files.',
    'toast.restarted': 'Spotify restarted.',
    'toast.saved': 'Saved.',
    'toast.savedPath': 'Path saved.',
    'toast.colorsReset': 'Colors reset.',
    'toast.themeChanged': 'Theme changed.',
    'toast.reportCopied': 'Report copied.',
    'toast.moduleOn': 'Enabled {name}.',
    'toast.moduleOff': 'Disabled {name}.',
    'toast.moduleInstalled': 'Installed {name}.',
    'toast.moduleRemoved': 'Removed {name}.',
    'toast.moduleUpdated': 'Updated {name}.',
    'modules.title': 'Modules',
    'modules.search': 'Search modules',
    'modules.group.extension': 'Extensions',
    'modules.group.theme': 'Themes',
    'modules.group.snippet': 'Snippets',
    'modules.empty': 'No modules.',
    'modules.emptyAction': 'Open module folder',
    'modules.noResults': 'No results.',
    'modules.clearSearch': 'Clear search',
    'modules.newUpdate': 'Update available',
    'modules.update': 'Update',
    'modules.install': 'Install',
    'modules.remove': 'Remove',
    'modules.use': 'Use',
    'modules.inUse': 'In use',
    'modules.toggleOn': 'Turn on {name}',
    'modules.toggleOff': 'Turn off {name}',
    'modules.busyInstall': 'Installing…',
    'modules.busyUpdate': 'Updating…',
    'modules.busyRemove': 'Removing…',
    'modules.removeTitle': 'Remove {name}?',
    'modules.removeBody': 'The downloaded file will be deleted.',
    'modules.confirmRemove': 'Remove',
    'modules.loadError': 'Could not load modules.',
    'appearance.title': 'Appearance',
    'appearance.themes': 'Themes',
    'appearance.import': 'Import Spicetify theme',
    'appearance.importPlaceholder': 'Paste the theme folder path',
    'appearance.importAction': 'Import',
    'appearance.importHint': 'Pick a folder containing a Spicetify color.ini or user.css.',
    'appearance.imported': 'Imported theme {name}',
    'appearance.colors': 'Colors',
    'appearance.color.accent': 'Accent',
    'appearance.color.background': 'Background',
    'appearance.color.sidebar': 'Sidebar',
    'appearance.color.card': 'Card',
    'appearance.color.text': 'Text',
    'appearance.color.subtext': 'Subtext',
    'appearance.reset': 'Reset',
    'appearance.inUse': 'In use',
    'appearance.applying': 'Applying…',
    'appearance.note': 'These six colors change Spotify only, not this app.',
    'appearance.invalidHex': 'Invalid color code.',
    'appearance.empty': 'No themes.',
    'appearance.emptyAction': 'Open theme folder',
    'appearance.useTheme': 'Use {name} theme',
    'appearance.loadError': 'Could not load themes.',
    'tools.title': 'Tools',
    'tools.general': 'General',
    'tools.language': 'Language',
    'tools.safeMode': 'Safe mode',
    'tools.safeHint': 'Skip extensions and tweaks when applying.',
    'tools.safeWarn': 'Apply again on Overview.',
    'tools.updates': 'Updates',
    'tools.checkUpdate': 'Check automatically',
    'tools.checkHint': 'Check for new versions when the app starts.',
    'tools.spotify': 'Spotify',
    'tools.spotifyPath': 'Spotify path',
    'tools.pathPlaceholder': 'Not selected',
    'tools.savePath': 'Save',
    'tools.diagnostics': 'Diagnostics',
    'tools.runAgain': 'Run again',
    'tools.copyReport': 'Copy report',
    'tools.diagnosticsEmpty': 'No diagnostics yet.',
    'tools.colName': 'Item',
    'tools.colValue': 'Value',
    'tools.colStatus': 'Status',
    'tools.data': 'Data',
    'tools.openData': 'Open folder',
    'tools.appAppearance': 'App appearance',
    'tools.mode': 'Mode',
    'tools.light': 'Light',
    'tools.dark': 'Dark',
    'tools.system': 'System',
    'tools.accent': 'Accent',
    'tools.accent.green': 'Spotify green',
    'tools.accent.purple': 'Purple',
    'tools.accent.orange': 'Orange',
    'tools.accent.pink': 'Pink',
    'tools.accent.blue': 'Blue',
    'tools.diag.install': 'Install',
    'tools.diag.backup': 'Backup',
    'tools.diag.spotify': 'Spotify',
    'tools.diag.config': 'Config',
    'tools.diag.runtime': 'Runtime',
    'tools.diag.extensions': 'Extensions',
    'tools.diag.themes': 'Themes',
    'tools.diag.language': 'Language',
    'tools.diag.running': 'Running',
    'tools.diag.closed': 'Closed',
    'tools.diag.none': 'None',
    'tools.diag.missing': 'Missing',
    'tools.diag.vi': 'Vietnamese',
    'tools.diag.en': 'English',
    'demo.adblock.description': 'Removes ad slots and upgrade banners.',
    'demo.auto-skip-explicit.description': 'Skips explicit tracks while playing.',
    'demo.quick-keys.description': 'Seek, volume and mute hotkeys.',
    'demo.track-copy.description': 'Copies the current track with Alt+C.',
    'demo.volume-memory.description': 'Restores the last volume on start.',
    'demo.skip-short-tracks.description': 'Skips tracks under 45 seconds.',
    'demo.playback-speed.description': 'Changes playback speed with Alt+1.',
    'demo.like-hotkey.description': 'Likes the current track with Alt+L.',
    'demo.hide-sidebar.description': 'Hides the sidebar with Alt+B.',
    'demo.focus-mode.description': 'Dims the sidebar and main view.',
    'demo.volume-wheel.description': 'Scroll over the player to change volume.',
    'demo.Soft.description': 'Clock, large play button, rounded progress.',
    'demo.Nord.description': 'Cool arctic blues on soft grey.',
    'demo.Dracula.description': 'Purple and pink on dark violet.',
    'demo.Amoled.description': 'True black surfaces for OLED.',
    'demo.Catppuccin.description': 'Pastel lavender Mocha palette.',
    'demo.Gruvbox.description': 'Warm retro earth tones.',
    'demo.TokyoNight.description': 'Deep blue night with bright accent.',
    'demo.RosePine.description': 'Rose and lilac on pine.',
    'demo.Solarized.description': 'Low contrast teal and sand.',
    'demo.hide-window-controls.description': 'Hides the Windows window buttons.'
  }
};

const ROUTES = ['overview', 'modules', 'appearance', 'css', 'tools'];
const THEME_KEY = 'sxe:ui-theme';
const ACCENT_KEY = 'sxe:ui-accent';
const UI_THEMES = ['light', 'dark', 'system'];
const ACCENTS = ['green', 'purple', 'orange', 'pink', 'blue'];
const ACCENT_DOT = {
  green: '#1ed760',
  purple: '#a78bfa',
  orange: '#fb923c',
  pink: '#f472b6',
  blue: '#60a5fa'
};
const DEFAULT_COLORS = {
  accent: '#1ed760',
  background: '#121212',
  sidebar: '#000000',
  card: '#1f1f1f',
  text: '#ffffff',
  subtext: '#b3b3b3'
};
const COLOR_KEYS = ['accent', 'background', 'sidebar', 'card', 'text', 'subtext'];
const THEME_PREVIEW = {
  soft: ['#121212', '#000000', '#1f1f1f', '#1ed760'],
  nord: ['#2e3440', '#2b303b', '#3b4252', '#88c0d0'],
  dracula: ['#282a36', '#21222c', '#44475a', '#bd93f9'],
  amoled: ['#000000', '#000000', '#0a0a0a', '#1ed760'],
  catppuccin: ['#1e1e2e', '#181825', '#313244', '#cba6f7'],
  gruvbox: ['#282828', '#1d2021', '#3c3836', '#fabd2f'],
  tokyonight: ['#1a1b26', '#16161e', '#292e42', '#7aa2f7'],
  rosepine: ['#191724', '#1f1d2e', '#26233a', '#ebbcba'],
  solarized: ['#002b36', '#073642', '#0b3a45', '#b58900']
};
const GLYPHS = ['shield', 'volume', 'skip', 'speed', 'heart', 'eye-off', 'focus', 'keyboard', 'keys', 'copy', 'palette', 'code', 'wave', 'sparkle', 'window'];

const state = {
  lang: 'vi',
  route: 'overview',
  demo: false,
  version: '0.0.0',
  dataDir: '',
  overview: null,
  installs: [],
  installId: '',
  config: null,
  running: false,
  modules: [],
  themes: [],
  diagnostics: [],
  loading: false,
  loadError: false,
  modulesLoading: false,
  modulesError: false,
  themesLoading: false,
  themesError: false,
  doctorLoading: false,
  doctorError: false,
  moduleQuery: '',
  moduleBusy: '',
  moduleBusyAction: '',
  modulesLoaded: false,
  confirmRemoveId: '',
  themeBusy: '',
  themesLoaded: false,
  overviewBusy: '',
  confirmRestore: false,
  toolsBusy: '',
  doctorLoaded: false,
  configBusy: '',
  pathBusy: false,
  cssFiles: [],
  cssActive: 'user',
  cssDraft: '',
  cssLoaded: false,
  cssLoading: false,
  cssError: false,
  cssDirty: false,
  cssBusy: '',
  cssNewOpen: false,
  cssNewName: '',
  cssConfirmDelete: '',
  uiTheme: 'dark',
  uiAccent: 'green',
  spicetifyPath: '',
  importBusy: false
};

const NS = 'http://www.w3.org/2000/svg';
let searchTimer = 0;
let previewTimer = 0;

/* A tiny Spotify-like surface so the CSS being edited can be seen live. */
const PREVIEW_BASE = [
  '*{box-sizing:border-box}',
  'html,body{margin:0;height:100%;font-family:"Segoe UI",system-ui,sans-serif;color:#fff;background:#000}',
  '.Root{display:grid;grid-template-columns:190px 1fr;grid-template-rows:1fr 72px;gap:8px;height:100%;padding:8px}',
  '.Root__nav-bar{background:#121212;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px}',
  '.nav-item{display:flex;align-items:center;gap:8px;color:#b3b3b3;font-size:12px}',
  '.nav-dot{width:24px;height:24px;border-radius:4px;background:#282828}',
  '.Root__main-view{background:linear-gradient(180deg,#1f1f1f,#121212 40%);border-radius:8px;padding:16px;overflow:hidden}',
  '.main-title{font-size:18px;font-weight:700;margin:0 0 12px}',
  '.card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}',
  '.card{background:#181818;border-radius:6px;padding:10px}',
  '.card:hover{background:#282828}',
  '.card-cover{aspect-ratio:1;border-radius:4px;background:linear-gradient(135deg,#1ed760,#0f6b32);margin-bottom:8px}',
  '.card-title{font-size:12px;font-weight:600;margin:0}',
  '.card-sub{font-size:11px;color:#b3b3b3;margin:2px 0 0}',
  '.Root__now-playing-bar{grid-column:1/3;display:grid;grid-template-columns:1fr 2fr 1fr;align-items:center;gap:12px;background:#181818;border-radius:8px;padding:8px 14px}',
  '.now-playing{display:flex;align-items:center;gap:10px;min-width:0}',
  '.now-cover{width:40px;height:40px;border-radius:4px;background:linear-gradient(135deg,#a78bfa,#4c1d95)}',
  '.now-title{font-size:12px;font-weight:600;margin:0}',
  '.now-artist{font-size:11px;color:#b3b3b3;margin:2px 0 0}',
  '.player-controls{display:flex;align-items:center;justify-content:center;gap:14px}',
  '.round{width:28px;height:28px;border-radius:50%;background:#fff;display:grid;place-items:center}',
  '.tri{width:0;height:0;border-left:8px solid #04140a;border-top:5px solid transparent;border-bottom:5px solid transparent;margin-left:2px}',
  '.bar{width:9px;height:9px;border-radius:2px;background:#fff}',
  '.playback-bar{display:flex;align-items:center;gap:8px;font-size:10px;color:#b3b3b3}',
  '.progress{flex:1;height:4px;border-radius:2px;background:#4d4d4d;position:relative}',
  '.progress span{position:absolute;inset:0 auto 0 0;width:42%;background:#fff;border-radius:2px}'
].join('');

const PREVIEW_HTML = [
  '<div class="Root">',
  '<div class="Root__nav-bar">',
  '<div class="nav-item"><span class="nav-dot"></span>Trang chủ</div>',
  '<div class="nav-item"><span class="nav-dot"></span>Tìm kiếm</div>',
  '<div class="nav-item"><span class="nav-dot"></span>Thư viện</div>',
  '</div>',
  '<div class="Root__main-view">',
  '<h2 class="main-title">Nghe gần đây</h2>',
  '<div class="card-grid">',
  '<div class="card"><div class="card-cover"></div><p class="card-title">Danh sách 1</p><p class="card-sub">Playlist</p></div>',
  '<div class="card"><div class="card-cover"></div><p class="card-title">Danh sách 2</p><p class="card-sub">Album</p></div>',
  '<div class="card"><div class="card-cover"></div><p class="card-title">Danh sách 3</p><p class="card-sub">Nghệ sĩ</p></div>',
  '<div class="card"><div class="card-cover"></div><p class="card-title">Danh sách 4</p><p class="card-sub">Playlist</p></div>',
  '</div></div>',
  '<div class="Root__now-playing-bar">',
  '<div class="now-playing"><div class="now-cover"></div><div><p class="now-title">Tên bài hát</p><p class="now-artist">Nghệ sĩ</p></div></div>',
  '<div class="player-controls"><span class="bar"></span><span class="round"><span class="tri"></span></span><span class="bar"></span></div>',
  '<div class="playback-bar"><span>1:12</span><div class="progress"><span></span></div><span>3:45</span></div>',
  '</div></div>'
].join('');

function previewDocument(css) {
  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    PREVIEW_BASE + '</style><style>' + css + '</style></head><body>' +
    PREVIEW_HTML + '</body></html>';
}

function refreshPreview() {
  const frame = document.querySelector('.css-preview-frame');
  if (frame) frame.srcdoc = previewDocument(state.cssDraft);
}
let colorTimer = 0;

/* ---------- Small DOM helpers ---------- */

function $(selector, root) {
  return (root || document).querySelector(selector);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function icon(name, className) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', className || 'ico');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', '#i-' + name);
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + name);
  svg.appendChild(use);
  return svg;
}

function has(key, lang) {
  return Object.prototype.hasOwnProperty.call(DICT[lang || state.lang] || {}, key);
}

function t(key, vars) {
  const lang = state.lang;
  let value = DICT[lang] && DICT[lang][key];
  if (value === undefined) value = DICT.vi[key];
  if (value === undefined) value = key;
  if (vars) {
    value = value.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
    });
  }
  return value;
}

function errorInfo(error) {
  const code = error && typeof error.code === 'string' ? error.code : 'error';
  if (has('err.' + code)) return t('err.' + code);
  return t('err.error');
}

function reportError(report) {
  const error = new Error('report');
  error.code = report && report.code ? report.code : 'error';
  return error;
}

function assertReport(report) {
  if (!report || report.ok !== true) throw reportError(report);
  return report;
}

function busyButton(button, labelKey) {
  if (!button) return;
  button.textContent = '';
  button.appendChild(el('span', 'spinner'));
  button.appendChild(el('span', null, t(labelKey || 'common.loading')));
  button.disabled = true;
  button.classList.add('is-busy');
  button.setAttribute('aria-busy', 'true');
}

function makeButton(label, variant, options) {
  const opts = options || {};
  const button = el('button', 'btn btn-' + variant + (opts.iconOnly ? ' btn-icon' : ''));
  button.type = 'button';
  if (opts.icon) button.appendChild(icon(opts.icon));
  if (!opts.iconOnly) button.appendChild(el('span', null, label));
  if (opts.ariaLabel) button.setAttribute('aria-label', opts.ariaLabel);
  if (opts.title) button.title = opts.title;
  if (opts.disabled) button.disabled = true;
  if (opts.onClick) button.addEventListener('click', opts.onClick);
  return button;
}

/* ---------- Clipboard / toasts ---------- */

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    /* fall through to the textarea path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    area.style.top = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch (error) {
    return false;
  }
}

function dismissToast(node) {
  if (!node || node.dataset.leaving === '1') return;
  node.dataset.leaving = '1';
  node.classList.add('is-out');
  window.setTimeout(function () { node.remove(); }, 140);
}

function showToast(message, tone) {
  const host = $('#toasts');
  if (!host) return;
  while (host.children.length >= 3) host.firstElementChild.remove();
  const node = el('div', 'toast', message);
  node.setAttribute('role', 'status');
  node.dataset.tone = tone === 'error' ? 'error' : 'ok';
  let timer = 0;
  function arm() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { dismissToast(node); }, 3500);
  }
  function pause() { window.clearTimeout(timer); }
  node.addEventListener('mouseenter', pause);
  node.addEventListener('mouseleave', arm);
  node.addEventListener('focusin', pause);
  node.addEventListener('focusout', arm);
  node.addEventListener('click', function () { dismissToast(node); });
  host.appendChild(node);
  arm();
}

function toastOk(key, vars) { showToast(t(key, vars), 'ok'); }
function toastError(error) {
  if (error && error.code) showToast(errorInfo(error), 'error');
  else showToast(t('err.error'), 'error');
}

/* ---------- App appearance (local only) ---------- */

function readStore(key) {
  try { return window.localStorage.getItem(key); } catch (error) { return null; }
}

function writeStore(key, value) {
  try { window.localStorage.setItem(key, value); } catch (error) { /* storage may be blocked */ }
}

function resolvedTheme() {
  if (state.uiTheme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return state.uiTheme === 'light' ? 'light' : 'dark';
}

function applyUiTheme() {
  const resolved = resolvedTheme();
  const root = document.documentElement;
  root.dataset.appTheme = resolved;
  root.dataset.appAccent = state.uiAccent;
  root.lang = state.lang;
  root.style.colorScheme = resolved;
  updateThemeToggle();
}

function updateThemeToggle() {
  const button = $('#theme-toggle');
  if (!button) return;
  const targetIsLight = resolvedTheme() === 'dark';
  const use = $('#theme-toggle-icon');
  if (use) {
    use.setAttribute('href', targetIsLight ? '#i-sun' : '#i-moon');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', targetIsLight ? '#i-sun' : '#i-moon');
  }
  const label = targetIsLight ? t('sidebar.themeToLight') : t('sidebar.themeToDark');
  button.setAttribute('aria-label', label);
  button.title = label;
}

function setUiTheme(mode, rerender) {
  if (UI_THEMES.indexOf(mode) === -1) return;
  state.uiTheme = mode;
  writeStore(THEME_KEY, mode);
  applyUiTheme();
  if (rerender) renderPage();
}

function setUiAccent(accent) {
  if (ACCENTS.indexOf(accent) === -1) return;
  state.uiAccent = accent;
  writeStore(ACCENT_KEY, accent);
  applyUiTheme();
  syncAccentButtons();
}

function syncAccentButtons() {
  const nodes = document.querySelectorAll('[data-accent-option]');
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    node.setAttribute('aria-pressed', node.dataset.accentOption === state.uiAccent ? 'true' : 'false');
  }
}

function initAppearance() {
  const storedTheme = readStore(THEME_KEY);
  if (UI_THEMES.indexOf(storedTheme) !== -1) state.uiTheme = storedTheme;
  const storedAccent = readStore(ACCENT_KEY);
  if (ACCENTS.indexOf(storedAccent) !== -1) state.uiAccent = storedAccent;
  applyUiTheme();
  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = function () {
      if (state.uiTheme === 'system') {
        applyUiTheme();
        if (state.route === 'tools') renderPage();
      }
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  }
}

/* ---------- Preview fixtures ---------- */

const DEMO_ROOT = 'C:\\Users\\Minh\\AppData\\Roaming\\Spotify';
const DEMO_MODULE_SEEDS = [
  { id: 'adblock', name: 'Adblock', kind: 'extension', glyph: 'shield', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'auto-skip-explicit', name: 'Auto skip explicit', kind: 'extension', glyph: 'skip', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'quick-keys', name: 'Quick keys', kind: 'extension', glyph: 'keys', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'track-copy', name: 'Track copy', kind: 'extension', glyph: 'copy', version: '1.0.0', installed: true, update: true, bundled: true },
  { id: 'volume-memory', name: 'Volume memory', kind: 'extension', glyph: 'wave', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'skip-short-tracks', name: 'Skip short tracks', kind: 'extension', glyph: 'skip', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'playback-speed', name: 'Playback speed', kind: 'extension', glyph: 'speed', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'like-hotkey', name: 'Like hotkey', kind: 'extension', glyph: 'heart', version: '1.0.0', installed: false, update: false, bundled: true },
  { id: 'hide-sidebar', name: 'Hide sidebar', kind: 'extension', glyph: 'eye-off', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'focus-mode', name: 'Focus mode', kind: 'extension', glyph: 'focus', version: '1.0.0', installed: false, update: false, bundled: true },
  { id: 'volume-wheel', name: 'Volume wheel', kind: 'extension', glyph: 'volume', version: '1.0.0', installed: true, update: false, bundled: false },
  { id: 'Soft', name: 'Soft', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'Nord', name: 'Nord', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'Dracula', name: 'Dracula', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'Amoled', name: 'Amoled', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'Catppuccin', name: 'Catppuccin', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'Gruvbox', name: 'Gruvbox', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'TokyoNight', name: 'Tokyo Night', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'RosePine', name: 'Rosé Pine', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'Solarized', name: 'Solarized', kind: 'theme', glyph: 'palette', version: '1.0.0', installed: true, update: false, bundled: true },
  { id: 'hide-window-controls', name: 'Hide window controls', kind: 'snippet', glyph: 'window', version: '1.0.0', installed: true, update: false, bundled: true }
];

function makeDemoModule(seed) {
  const key = 'demo.' + seed.id + '.description';
  return {
    id: seed.id,
    name: seed.name,
    author: 'ninokiru',
    description: DICT.en[key] || '',
    descriptionVi: DICT.vi[key] || '',
    version: seed.version,
    kind: seed.kind,
    glyph: seed.glyph,
    accent: ['#1b1f1d', '#131615'],
    files: [{ name: seed.id + (seed.kind === 'theme' ? '/user.css' : '.js'), url: '' }],
    bundled: seed.bundled,
    installed: seed.installed,
    enabled: false,
    updateAvailable: seed.update
  };
}

const DEMO = {
  running: true,
  config: {
    language: 'vi',
    spotifyPath: '',
    theme: 'Soft',
    checkUpdate: true,
    safeMode: false,
    extensions: ['adblock', 'quick-keys', 'volume-memory'],
    snippets: ['hide-window-controls'],
    colors: Object.assign({}, DEFAULT_COLORS)
  },
  installs: [
    {
      id: 'demo-appdata',
      name: 'Spotify',
      root: DEMO_ROOT,
      xpuiPath: DEMO_ROOT + '\\Apps\\xpui',
      variant: 'normal',
      version: '1.2.52.1001',
      arch: 'x64',
      state: 'patched',
      patchedBy: 'sxe',
      hasBackup: true,
      backupAt: '2026-10-30T14:22:00+07:00'
    },
    {
      id: 'demo-store',
      name: 'Spotify',
      root: 'C:\\Program Files\\WindowsApps\\SpotifyAB.SpotifyMusic_1.250.0.0_x64__zpdnekdrzrea0\\LocalState\\Spotify',
      xpuiPath: 'C:\\Program Files\\WindowsApps\\SpotifyAB.SpotifyMusic_1.250.0.0_x64__zpdnekdrzrea0\\LocalState\\Spotify\\Apps\\xpui',
      variant: 'store',
      version: '1.2.50.800',
      arch: 'arm64',
      state: 'stock',
      patchedBy: 'none',
      hasBackup: false,
      backupAt: ''
    }
  ],
  modules: DEMO_MODULE_SEEDS.map(makeDemoModule)
};

function demoOk(message) {
  return { ok: true, code: 'ok', message: message || '' };
}

function demoFail(code, message) {
  return { ok: false, code: code, message: message || '' };
}

function demoConfig() {
  return normalizeConfig(DEMO.config);
}

function demoModules() {
  const config = demoConfig();
  return DEMO.modules.map(function (module) {
    let enabled = false;
    if (module.kind === 'theme') enabled = config.theme === module.id;
    else if (module.kind === 'snippet') enabled = config.snippets.indexOf(module.id) !== -1;
    else enabled = config.extensions.indexOf(module.id) !== -1;
    return Object.assign({}, module, { enabled: enabled });
  });
}

function demoThemes() {
  const config = demoConfig();
  return DEMO.modules
    .filter(function (module) { return module.kind === 'theme'; })
    .map(function (module) {
      return { id: module.id, bundled: module.bundled, active: config.theme === module.id };
    });
}

function demoInstall(id) {
  return DEMO.installs.find(function (item) { return item.id === id; }) || null;
}

function demoDoctor(installId) {
  const install = demoInstall(installId) || DEMO.installs[0];
  const rows = [];
  if (install) {
    rows.push({ label: 'install', value: install.version + ' · ' + install.state, ok: install.state !== 'unsupported' });
    rows.push({ label: 'backup', value: install.hasBackup ? install.backupAt : 'none', ok: install.hasBackup });
    rows.push({ label: 'spotify', value: DEMO.running ? 'running' : 'closed', ok: true });
  } else {
    rows.push({ label: 'install', value: 'missing', ok: false });
  }
  rows.push({ label: 'config', value: 'C:\\Users\\Minh\\AppData\\Roaming\\Spotify Extension\\config.ini', ok: true });
  rows.push({ label: 'runtime', value: 'C:\\Program Files\\Spotify Extension\\runtime\\runtime.js', ok: true });
  rows.push({ label: 'extensions', value: String(DEMO.modules.filter(function (m) { return m.kind === 'extension'; }).length), ok: true });
  rows.push({ label: 'themes', value: String(DEMO.modules.filter(function (m) { return m.kind === 'theme'; }).length), ok: true });
  rows.push({ label: 'language', value: demoConfig().language, ok: true });
  return rows;
}

function demoDelay() {
  return new Promise(function (resolve) { window.setTimeout(resolve, 90); });
}

/* Preview-mode CSS store; only used when window.__TAURI__ is missing. */
const DEMO_CSS = {
  user: '/* CSS riêng của bạn — được nối sau theme và các snippet */\n:root {\n  --your-tweak: 1;\n}\n',
  snippets: {
    'my-tweaks': { content: '.Root__nav-bar { background: #101010; }\n', enabled: true },
    'rounded-covers': { content: 'img { border-radius: 8px; }\n', enabled: false }
  }
};

async function demoCall(name, args) {
  await demoDelay();
  switch (name) {
    case 'get_overview':
      return {
        version: '0.0.1',
        dataDir: 'C:\\Users\\Minh\\AppData\\Roaming\\Spotify Extension',
        config: demoConfig(),
        installs: DEMO.installs.map(function (item) { return Object.assign({}, item); })
      };
    case 'apply': {
      const install = demoInstall(args.installId);
      if (!install) return demoFail('not-found', 'Spotify install not found.');
      if (install.state === 'unsupported') return demoFail('unsupported', 'Unsupported build.');
      install.state = 'patched';
      install.patchedBy = 'sxe';
      if (!install.hasBackup) {
        install.hasBackup = true;
        install.backupAt = '2026-10-31T09:15:00+07:00';
      }
      return demoOk('');
    }
    case 'restore': {
      const install = demoInstall(args.installId);
      if (!install) return demoFail('not-found', 'Spotify install not found.');
      if (!install.hasBackup) return demoFail('no-backup', 'No backup.');
      install.state = 'stock';
      install.patchedBy = 'none';
      return demoOk('');
    }
    case 'backup': {
      const install = demoInstall(args.installId);
      if (!install) return demoFail('not-found', 'Spotify install not found.');
      install.hasBackup = true;
      install.backupAt = '2026-10-31T09:15:00+07:00';
      return demoOk('3');
    }
    case 'restart':
      DEMO.running = true;
      return demoOk('');
    case 'open_folder':
      return demoOk('');
    case 'list_themes':
      return demoThemes();
    case 'set_theme':
      DEMO.config.theme = args.id === 'default' || args.id === 'none' ? '' : args.id;
      return demoOk('');
    case 'list_extensions':
      return DEMO.modules
        .filter(function (m) { return m.kind === 'extension'; })
        .map(function (m) {
          return {
            id: m.id,
            name: m.name,
            version: m.version,
            enabled: demoConfig().extensions.indexOf(m.id) !== -1,
            bundled: m.bundled
          };
        });
    case 'set_extension': {
      const list = DEMO.config.extensions;
      if (args.enabled) {
        if (list.indexOf(args.id) === -1) list.push(args.id);
      } else {
        DEMO.config.extensions = list.filter(function (id) { return id !== args.id; });
      }
      return demoOk('');
    }
    case 'list_modules':
      return demoModules();
    case 'install_module': {
      const module = DEMO.modules.find(function (m) { return m.id === args.id; });
      if (!module) return demoFail('not-found', 'Module not found.');
      module.installed = true;
      module.updateAvailable = false;
      if (module.kind === 'theme') DEMO.config.theme = module.id;
      else if (module.kind === 'snippet') {
        if (DEMO.config.snippets.indexOf(module.id) === -1) DEMO.config.snippets.push(module.id);
      } else if (DEMO.config.extensions.indexOf(module.id) === -1) {
        DEMO.config.extensions.push(module.id);
      }
      return demoOk('');
    }
    case 'remove_module': {
      const module = DEMO.modules.find(function (m) { return m.id === args.id; });
      if (!module) return demoFail('not-found', 'Module not found.');
      module.installed = false;
      if (module.kind === 'theme') {
        if (DEMO.config.theme === module.id) DEMO.config.theme = '';
      } else if (module.kind === 'snippet') {
        DEMO.config.snippets = DEMO.config.snippets.filter(function (id) { return id !== module.id; });
      } else {
        DEMO.config.extensions = DEMO.config.extensions.filter(function (id) { return id !== module.id; });
      }
      return demoOk('');
    }
    case 'save_config':
      DEMO.config = normalizeConfig(args.config);
      return demoOk('');
    case 'doctor':
      return demoDoctor(args.installId);
    case 'list_css_files':
      return [{ id: 'user', kind: 'user', size: DEMO_CSS.user.length, enabled: true }].concat(
        Object.keys(DEMO_CSS.snippets).map(function (id) {
          const item = DEMO_CSS.snippets[id];
          return { id: id, kind: 'snippet', size: item.content.length, enabled: item.enabled };
        })
      );
    case 'read_css_file':
      return {
        ok: true,
        content: args.id === 'user'
          ? DEMO_CSS.user
          : (DEMO_CSS.snippets[args.id] ? DEMO_CSS.snippets[args.id].content : ''),
        message: ''
      };
    case 'save_css_file':
      if (args.id === 'user') DEMO_CSS.user = args.content;
      else if (DEMO_CSS.snippets[args.id]) DEMO_CSS.snippets[args.id].content = args.content;
      else DEMO_CSS.snippets[args.id] = { content: args.content, enabled: false };
      return demoOk('');
    case 'delete_css_file':
      if (!DEMO_CSS.snippets[args.id]) return demoFail('not-found', 'Missing file.');
      delete DEMO_CSS.snippets[args.id];
      return demoOk('');
    case 'set_snippet_enabled':
      if (DEMO_CSS.snippets[args.id]) DEMO_CSS.snippets[args.id].enabled = args.enabled;
      return demoOk('');
    case 'import_spicetify_theme':
      return demoOk('spicetify-theme');
    default:
      throw reportError({ code: 'error' });
  }
}

/* ---------- Single invoke gateway ---------- */

async function call(name, args) {
  const api = window.__TAURI__;
  if (api && api.core && typeof api.core.invoke === 'function') {
    return api.core.invoke(name, args || {});
  }
  return demoCall(name, args || {});
}

function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const colors = {};
  const rawColors = source.colors && typeof source.colors === 'object' ? source.colors : {};
  COLOR_KEYS.forEach(function (key) {
    const value = rawColors[key];
    colors[key] = typeof value === 'string' && value ? value : DEFAULT_COLORS[key];
  });
  return {
    language: source.language === 'en' ? 'en' : 'vi',
    spotifyPath: typeof source.spotifyPath === 'string' ? source.spotifyPath : '',
    theme: typeof source.theme === 'string' ? source.theme : '',
    checkUpdate: source.checkUpdate !== false,
    safeMode: source.safeMode === true,
    extensions: Array.isArray(source.extensions) ? source.extensions.filter(function (v) { return typeof v === 'string'; }) : [],
    snippets: Array.isArray(source.snippets) ? source.snippets.filter(function (v) { return typeof v === 'string'; }) : [],
    colors: colors
  };
}

function currentRoute() {
  const match = /^#\/([a-z]+)$/.exec(window.location.hash);
  return match && ROUTES.indexOf(match[1]) !== -1 ? match[1] : 'overview';
}

function selectedInstall() {
  if (!state.installs.length) return null;
  const found = state.installs.find(function (item) { return item.id === state.installId; });
  return found || state.installs[0];
}

function stateLabel(value) {
  const key = value === 'unsupported' ? 'unsupported' : value;
  return has('state.' + key) ? t('state.' + key) : String(value || '');
}

function patcherLabel(value) {
  if (!value || value === 'none') return t('overview.noPatcher');
  if (value === 'sxe') return t('app.name');
  if (value === 'spicetify') return 'Spicetify';
  return String(value);
}

function formatDate(value) {
  if (!value) return t('common.none');
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const pad = function (n) { return n < 10 ? '0' + n : String(n); };
  return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear() +
    ' · ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

/* ---------- Data loading ---------- */

async function loadOverview(options) {
  const opts = options || {};
  if (!opts.silent) {
    state.loading = true;
    state.loadError = false;
    renderAll();
  }
  try {
    const data = await call('get_overview', {});
    state.overview = data || {};
    state.version = String(data && data.version ? data.version : '0.0.0');
    state.dataDir = String(data && data.dataDir ? data.dataDir : '');
    state.config = normalizeConfig(data && data.config);
    state.lang = state.config.language;
    state.installs = Array.isArray(data && data.installs) ? data.installs : [];
    const stillThere = state.installs.some(function (item) { return item.id === state.installId; });
    if (!stillThere) state.installId = state.installs.length ? state.installs[0].id : '';
    state.loadError = false;
    if (state.route === 'overview' || state.route === 'tools') await loadDoctorInternal();
  } catch (error) {
    if (!opts.silent) state.loadError = true;
  } finally {
    state.loading = false;
    renderAll();
  }
}

async function loadModules() {
  state.modulesLoading = true;
  state.modulesError = false;
  renderPage();
  try {
    const rows = await call('list_modules', {});
    state.modules = Array.isArray(rows) ? rows : [];
    state.modulesLoaded = true;
  } catch (error) {
    state.modulesError = true;
  } finally {
    state.modulesLoading = false;
    renderPage();
  }
}

async function loadThemes() {
  state.themesLoading = true;
  state.themesError = false;
  renderPage();
  try {
    const rows = await call('list_themes', {});
    state.themes = Array.isArray(rows) ? rows : [];
    state.themesLoaded = true;
  } catch (error) {
    state.themesError = true;
  } finally {
    state.themesLoading = false;
    renderPage();
  }
}

async function loadCssFiles() {
  state.cssLoading = true;
  state.cssError = false;
  renderPage();
  try {
    const rows = await call('list_css_files', {});
    state.cssFiles = Array.isArray(rows) ? rows : [];
    state.cssLoaded = true;
    const known = state.cssFiles.some(function (file) { return file.id === state.cssActive; });
    if (!known) state.cssActive = state.cssFiles.length ? state.cssFiles[0].id : 'user';
  } catch (error) {
    state.cssError = true;
  } finally {
    state.cssLoading = false;
  }
  await loadCssFile(state.cssActive);
}

async function loadCssFile(id) {
  state.cssActive = id;
  state.cssConfirmDelete = '';
  try {
    const data = await call('read_css_file', { id: id });
    if (data && data.ok) {
      state.cssDraft = String(data.content || '');
      state.cssDirty = false;
    }
  } catch (error) {
    toastError(error);
  }
  renderPage();
}

async function saveCssFile() {
  if (state.cssBusy) return;
  state.cssBusy = 'save';
  renderPage();
  try {
    const report = await call('save_css_file', { id: state.cssActive, content: state.cssDraft });
    assertReport(report);
    state.cssDirty = false;
    toastOk('css.saved');
  } catch (error) {
    toastError(error);
  } finally {
    state.cssBusy = '';
    await loadCssFiles();
  }
}

async function toggleCssSnippet(file) {
  try {
    assertReport(await call('set_snippet_enabled', { id: file.id, enabled: !file.enabled }));
    await loadCssFiles();
  } catch (error) {
    toastError(error);
  }
}

async function deleteCssFile(id) {
  try {
    assertReport(await call('delete_css_file', { id: id }));
    toastOk('css.deleted');
    state.cssConfirmDelete = '';
    if (state.cssActive === id) state.cssActive = 'user';
    await loadCssFiles();
  } catch (error) {
    toastError(error);
  }
}

async function createCssSnippet(rawName) {
  const name = String(rawName || '').trim().toLowerCase().replace(/\.css$/, '');
  if (!name) return;
  if (!/^[a-z0-9_-]+$/.test(name)) {
    showToast(t('css.badName'), 'error');
    return;
  }
  if (state.cssFiles.some(function (file) { return file.id === name; })) {
    showToast(t('css.nameTaken'), 'error');
    return;
  }
  try {
    assertReport(await call('save_css_file', { id: name, content: '' }));
    state.cssNewOpen = false;
    state.cssNewName = '';
    state.cssActive = name;
    await loadCssFiles();
  } catch (error) {
    toastError(error);
  }
}

async function loadDoctorInternal(quiet) {
  state.doctorLoading = true;
  try {
    const rows = await call('doctor', { installId: state.installId || '' });
    state.diagnostics = Array.isArray(rows) ? rows : [];
    state.doctorLoaded = true;
    state.doctorError = false;
    state.running = state.diagnostics.some(function (row) {
      return row && row.label === 'spotify' && String(row.value).toLowerCase() === 'running';
    });
  } catch (error) {
    state.doctorError = true;
    state.running = false;
    if (!quiet) toastError(error);
  } finally {
    state.doctorLoading = false;
  }
}

async function loadDoctor() {
  state.doctorLoading = true;
  renderPage();
  await loadDoctorInternal(true);
  renderPage();
}

async function ensureRouteData() {
  if (state.route === 'modules' && !state.modulesLoaded) await loadModules();
  if (state.route === 'appearance' && !state.themesLoaded) await loadThemes();
  if (state.route === 'css' && !state.cssLoaded) await loadCssFiles();
  if (state.route === 'tools' && !state.doctorLoaded) await loadDoctor();
  renderShell();
  renderTopbar();
  renderPage();
}

async function saveConfigRaw(config) {
  const normalized = normalizeConfig(config);
  const report = await call('save_config', { config: normalized });
  assertReport(report);
  state.config = normalized;
  return report;
}

async function openFolder(path) {
  if (!path) {
    showToast(t('err.open-failed'), 'error');
    return;
  }
  try {
    const report = await call('open_folder', { path: path });
    assertReport(report);
  } catch (error) {
    toastError(error);
  }
}

/* ---------- Shell and routing ---------- */

function renderShell() {
  const nodes = document.querySelectorAll('[data-i18n]');
  for (let i = 0; i < nodes.length; i += 1) {
    nodes[i].textContent = t(nodes[i].dataset.i18n);
  }
  const nav = $('#nav');
  if (nav) nav.setAttribute('aria-label', t('nav.label'));
  const links = document.querySelectorAll('.nav-item[data-route]');
  for (let i = 0; i < links.length; i += 1) {
    if (links[i].dataset.route === state.route) links[i].setAttribute('aria-current', 'page');
    else links[i].removeAttribute('aria-current');
  }
  const title = $('#page-title');
  if (title) title.textContent = t(state.route + '.title');
  const version = $('#app-version');
  if (version) version.textContent = 'v' + (state.version || '0.0.0');
  updateThemeToggle();
  document.documentElement.lang = state.lang;
}

function renderTopbar() {
  const host = $('#topbar-actions');
  if (!host) return;
  host.textContent = '';

  if (state.route === 'overview') {
    if (state.installs.length > 1) {
      const wrap = el('div', 'install-picker');
      const id = 'install-select';
      const label = el('label', 'install-picker-label', t('overview.install'));
      label.setAttribute('for', id);
      const select = el('select', 'select');
      select.id = id;
      select.setAttribute('aria-label', t('overview.install'));
      state.installs.forEach(function (install) {
        const option = el('option', null, install.name + ' · ' + install.version + ' · ' + install.arch);
        option.value = install.id;
        if (install.id === state.installId) option.selected = true;
        select.appendChild(option);
      });
      select.disabled = state.loading;
      select.addEventListener('change', function () {
        state.installId = select.value;
        state.confirmRestore = false;
        state.doctorLoaded = false;
        loadOverview();
      });
      wrap.appendChild(label);
      wrap.appendChild(select);
      host.appendChild(wrap);
    }

    const refresh = el('button', 'btn btn-ghost btn-icon');
    refresh.type = 'button';
    refresh.setAttribute('aria-label', t('common.refresh'));
    refresh.title = t('common.refresh');
    if (state.loading) {
      refresh.appendChild(el('span', 'spinner'));
      refresh.disabled = true;
    } else {
      refresh.appendChild(icon('refresh'));
      refresh.addEventListener('click', function () { loadOverview(); });
    }
    host.appendChild(refresh);
  }

  if (state.route === 'modules') {
    const box = el('div', 'search-box');
    const input = el('input', 'input');
    input.type = 'search';
    input.value = state.moduleQuery;
    input.placeholder = t('modules.search');
    input.setAttribute('aria-label', t('modules.search'));
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.addEventListener('input', function () {
      state.moduleQuery = input.value;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () { renderModuleGroups(); }, 120);
    });
    box.appendChild(icon('search'));
    box.appendChild(input);
    host.appendChild(box);
  }
}

function renderPage() {
  const page = $('#page');
  if (!page) return;
  page.textContent = '';
  if (state.route === 'overview') renderOverviewPage(page);
  else if (state.route === 'modules') renderModulesPage(page);
  else if (state.route === 'appearance') renderAppearancePage(page);
  else if (state.route === 'css') renderCssPage(page);
  else renderToolsPage(page);
}

function renderAll() {
  renderShell();
  renderTopbar();
  renderPage();
}

async function onRouteChange() {
  state.route = currentRoute();
  state.confirmRestore = false;
  state.confirmRemoveId = '';
  const main = $('#main');
  if (main) main.scrollTop = 0;
  renderShell();
  renderTopbar();
  renderPage();
  await ensureRouteData();
}

async function boot() {
  initAppearance();
  state.demo = !(window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function');
  if (state.demo) {
    document.body.classList.add('is-preview');
    const bar = $('#preview-bar');
    if (bar) bar.hidden = false;
  }
  state.route = currentRoute();
  if (!window.location.hash) {
    try { window.history.replaceState(null, '', '#/overview'); } catch (error) { /* file URL may reject */ }
  }
  const toggle = $('#theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      setUiTheme(resolvedTheme() === 'dark' ? 'light' : 'dark', state.route === 'tools');
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && (state.confirmRestore || state.confirmRemoveId)) {
      state.confirmRestore = false;
      state.confirmRemoveId = '';
      renderPage();
    }
  });
  window.addEventListener('hashchange', onRouteChange);
  state.loading = true;
  renderShell();
  renderTopbar();
  renderPage();
  await loadOverview();
  await ensureRouteData();
}

/* ---------- Overview ---------- */

function makeChip(value) {
  const key = value === 'unsupported' ? 'foreign' : value;
  const chip = el('span', 'chip chip-' + (['stock', 'patched', 'partial', 'foreign'].indexOf(key) !== -1 ? key : 'stock'));
  chip.textContent = stateLabel(value);
  return chip;
}

function makeBanner(tone, iconName, message, actionLabel, action) {
  const banner = el('div', 'banner banner-' + tone);
  banner.appendChild(icon(iconName, 'ico banner-icon'));
  banner.appendChild(el('span', 'banner-text', message));
  if (actionLabel && action) {
    const actions = el('div', 'banner-actions');
    const button = makeButton(actionLabel, 'ghost', { onClick: action });
    actions.appendChild(button);
    banner.appendChild(actions);
  }
  return banner;
}

function warningBanners(install) {
  const list = el('div', 'banners');
  if (install.state === 'patched' && state.running) {
    list.appendChild(makeBanner('warn', 'alert', t('overview.warnRunning'), t('overview.restartNow'), function () {
      runInstallAction('restart');
    }));
  }
  if (install.spa) {
    list.appendChild(makeBanner('warn', 'info', t('overview.warnSpa')));
  }
  if (state.config && state.config.safeMode) {
    list.appendChild(makeBanner('warn', 'shield', t('overview.warnSafe'), t('overview.turnOff'), function () {
      setSafeMode(false);
    }));
  }
  return list.children.length ? list : null;
}

function statBlock(label, value, extraClass, isMono) {
  const block = el('div', 'stat');
  block.appendChild(el('span', 'stat-label', label));
  const valueNode = el('span', 'stat-value' + (extraClass ? ' ' + extraClass : '') + (isMono ? ' mono' : ''), value);
  valueNode.title = value;
  block.appendChild(valueNode);
  return block;
}

function actionSpecs(install) {
  return [
    { action: 'apply', label: 'overview.apply', busy: 'overview.applying', variant: 'primary', icon: '', disabled: install.state === 'unsupported' },
    { action: 'restore', label: 'overview.restore', busy: 'overview.restoring', variant: 'secondary', icon: '', disabled: install.state === 'stock' || !install.hasBackup },
    { action: 'backup', label: 'overview.backupAction', busy: 'overview.backingUp', variant: 'secondary', icon: '', disabled: install.hasBackup, title: install.hasBackup ? t('overview.backupExists') : t('overview.backupHint') },
    { action: 'restart', label: 'overview.restart', busy: 'overview.restarting', variant: 'ghost', icon: 'restart', disabled: false },
    { action: 'open', label: 'overview.openFolder', busy: 'overview.opening', variant: 'ghost', icon: 'folder', disabled: false }
  ];
}

function restorePopover(install) {
  const pop = el('div', 'confirm-popover');
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', t('overview.confirmRestore'));
  pop.appendChild(el('h3', 'confirm-title', t('overview.confirmRestore')));
  pop.appendChild(el('p', 'confirm-body', t('overview.confirmRestoreBody')));
  const actions = el('div', 'confirm-actions');
  const cancel = makeButton(t('common.cancel'), 'ghost', {
    onClick: function () {
      state.confirmRestore = false;
      renderPage();
    }
  });
  const confirm = makeButton(t('overview.confirmRestoreAction'), 'danger', {
    onClick: function () {
      state.confirmRestore = false;
      runInstallAction('restore');
    }
  });
  actions.appendChild(cancel);
  actions.appendChild(confirm);
  pop.appendChild(actions);
  window.requestAnimationFrame(function () { cancel.focus(); });
  return pop;
}

function renderOverviewPage(page) {
  if (state.loading && !state.overview) {
    const card = el('section', 'card');
    card.appendChild(el('p', 'color-note', t('common.loading')));
    page.appendChild(card);
    return;
  }

  if (state.loadError) {
    const banners = el('div', 'banners');
    banners.appendChild(makeBanner('danger', 'alert', t('err.load'), t('common.retry'), function () { loadOverview(); }));
    page.appendChild(banners);
    return;
  }

  const install = selectedInstall();
  if (!install) {
    const empty = el('div', 'empty');
    empty.appendChild(icon('search'));
    empty.appendChild(el('p', null, t('overview.empty')));
    empty.appendChild(makeButton(t('overview.openData'), 'secondary', {
      onClick: function () { openFolder(state.dataDir); }
    }));
    page.appendChild(empty);
    return;
  }

  const warnings = warningBanners(install);
  if (warnings) page.appendChild(warnings);

  const card = el('section', 'card install-card');
  const head = el('div', 'card-head');
  const heading = el('div', 'card-heading');
  heading.appendChild(el('h2', 'card-title', install.name || t('overview.spotify')));
  head.appendChild(heading);
  head.appendChild(makeChip(install.state));
  card.appendChild(head);

  const pathRow = el('div', 'path-row');
  pathRow.appendChild(el('span', 'install-path-label', t('overview.folder')));
  const path = el('code', 'install-path', install.root || t('common.dash'));
  path.title = install.root || '';
  pathRow.appendChild(path);
  const copy = el('button', 'btn btn-ghost btn-icon');
  copy.type = 'button';
  copy.setAttribute('aria-label', t('overview.copyPath'));
  copy.title = t('overview.copyPath');
  copy.appendChild(icon('copy'));
  copy.addEventListener('click', async function () {
    const ok = await copyText(install.root || '');
    if (ok) showToast(t('overview.pathCopied'), 'ok');
    else showToast(t('err.copy'), 'error');
  });
  pathRow.appendChild(copy);
  card.appendChild(pathRow);

  const stats = el('div', 'stat-grid');
  stats.appendChild(statBlock(t('overview.version'), install.version || t('common.dash'), 'stat-version', false));
  stats.appendChild(statBlock(t('overview.arch'), install.arch || t('common.dash'), '', true));
  stats.appendChild(statBlock(t('overview.channel'), has('variant.' + install.variant) ? t('variant.' + install.variant) : (install.variant || t('common.dash')), '', false));
  stats.appendChild(statBlock(t('overview.patchedBy'), patcherLabel(install.patchedBy), '', false));
  card.appendChild(stats);

  const backup = el('div', 'backup-row');
  backup.appendChild(el('span', 'backup-label', t('overview.backup')));
  const backupValue = install.hasBackup && install.backupAt ? formatDate(install.backupAt) : t('overview.noBackup');
  backup.appendChild(el('span', 'backup-value' + (install.hasBackup && install.backupAt ? '' : ' is-empty'), backupValue));
  card.appendChild(backup);

  if (install.state === 'unsupported') {
    card.appendChild(el('p', 'inline-note', t('overview.unsupported')));
  }

  const busy = state.overviewBusy;
  const area = el('div', 'action-area');
  const actions = el('div', 'install-actions');
  actionSpecs(install).forEach(function (spec) {
    const disabled = !!busy || spec.disabled;
    const button = makeButton(t(spec.label), spec.variant, {
      icon: spec.icon || undefined,
      disabled: disabled,
      title: spec.title || undefined,
      onClick: function () {
        if (spec.action === 'restore') {
          state.confirmRestore = true;
          renderPage();
        } else {
          runInstallAction(spec.action);
        }
      }
    });
    if (busy === spec.action) busyButton(button, spec.busy);
    actions.appendChild(button);
  });
  area.appendChild(actions);
  if (state.confirmRestore && !busy) area.appendChild(restorePopover(install));
  card.appendChild(area);
  page.appendChild(card);
}

async function runInstallAction(action) {
  if (state.overviewBusy) return;
  const install = selectedInstall();
  if (!install) return;
  state.overviewBusy = action;
  state.confirmRestore = false;
  renderPage();
  const wasRunning = state.running;
  try {
    let report;
    if (action === 'apply') {
      report = await call('apply', { installId: install.id });
      assertReport(report);
      showToast(t(wasRunning ? 'toast.appliedRestart' : 'toast.applied'), 'ok');
    } else if (action === 'restore') {
      report = await call('restore', { installId: install.id });
      assertReport(report);
      toastOk('toast.restored');
    } else if (action === 'backup') {
      report = await call('backup', { installId: install.id });
      assertReport(report);
      const count = String(report.message || '').trim() || '0';
      toastOk('toast.backedUp', { count: count });
    } else if (action === 'restart') {
      report = await call('restart', { installId: install.id });
      assertReport(report);
      toastOk('toast.restarted');
    } else if (action === 'open') {
      report = await call('open_folder', { path: install.root });
      assertReport(report);
    }
  } catch (error) {
    toastError(error);
  } finally {
    state.overviewBusy = '';
    await loadOverview({ silent: true });
    renderAll();
  }
}

/* ---------- Modules ---------- */

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function moduleKindLabel(kind) {
  return has('modules.group.' + kind) ? t('modules.group.' + kind) : String(kind || '');
}

function moduleDescription(module) {
  if (state.lang === 'vi' && module.descriptionVi) return String(module.descriptionVi);
  return String(module.description || '');
}

function filteredModules() {
  const query = fold(state.moduleQuery).trim();
  if (!query) return state.modules.slice();
  return state.modules.filter(function (module) {
    const haystack = fold([
      module.name,
      module.description,
      module.descriptionVi,
      module.id,
      module.glyph
    ].join(' '));
    return haystack.indexOf(query) !== -1;
  });
}

function applyConfigToModules() {
  if (!state.config) return;
  state.modules.forEach(function (module) {
    if (module.kind === 'theme') module.enabled = state.config.theme === module.id;
    else if (module.kind === 'snippet') module.enabled = state.config.snippets.indexOf(module.id) !== -1;
    else module.enabled = state.config.extensions.indexOf(module.id) !== -1;
  });
}

function moduleSkeleton() {
  const group = el('div', 'module-group');
  group.appendChild(el('div', 'group-head', t('common.loading')));
  const list = el('div', 'module-list');
  list.setAttribute('aria-busy', 'true');
  for (let i = 0; i < 3; i += 1) {
    const row = el('div', 'skeleton-row');
    row.appendChild(el('div', 'skeleton-box sq'));
    const main = el('div');
    main.appendChild(el('div', 'skeleton-box', ''));
    main.appendChild(el('div', 'skeleton-box short', ''));
    main.firstChild.style.marginBottom = '8px';
    row.appendChild(main);
    row.appendChild(el('div', 'skeleton-box short'));
    row.appendChild(el('div', 'skeleton-box pill'));
    list.appendChild(row);
  }
  group.appendChild(list);
  return group;
}

function renderModulesPage(page) {
  if (state.modulesLoading && !state.modulesLoaded) {
    const wrap = el('div');
    wrap.appendChild(moduleSkeleton());
    page.appendChild(wrap);
    return;
  }

  if (state.modulesError) {
    const banners = el('div', 'banners');
    banners.appendChild(makeBanner('danger', 'alert', t('modules.loadError'), t('common.retry'), function () {
      state.modulesLoaded = false;
      loadModules();
    }));
    page.appendChild(banners);
    return;
  }

  if (!state.modules.length) {
    const empty = el('div', 'empty');
    empty.appendChild(icon('empty-box'));
    empty.appendChild(el('p', null, t('modules.empty')));
    empty.appendChild(makeButton(t('modules.emptyAction'), 'secondary', {
      onClick: function () { openFolder(state.dataDir); }
    }));
    page.appendChild(empty);
    return;
  }

  const wrap = el('div');
  wrap.id = 'modules-groups';
  page.appendChild(wrap);
  fillModuleGroups(wrap);
}

function renderModuleGroups() {
  const wrap = $('#modules-groups');
  if (!wrap) {
    renderPage();
    return;
  }
  fillModuleGroups(wrap);
}

function fillModuleGroups(wrap) {
  wrap.textContent = '';
  const rows = filteredModules();
  if (!rows.length) {
    const empty = el('div', 'empty');
    empty.appendChild(icon('search'));
    empty.appendChild(el('p', null, t('modules.noResults')));
    empty.appendChild(makeButton(t('modules.clearSearch'), 'secondary', {
      onClick: function () {
        state.moduleQuery = '';
        renderTopbar();
        renderModuleGroups();
      }
    }));
    wrap.appendChild(empty);
    return;
  }

  const order = ['extension', 'theme', 'snippet'];
  order.forEach(function (kind) {
    const items = rows.filter(function (module) { return module.kind === kind; });
    if (!items.length) return;
    const group = el('section', 'module-group');
    const head = el('h2', 'group-head');
    head.appendChild(el('span', null, moduleKindLabel(kind)));
    head.appendChild(el('span', 'group-count', String(items.length)));
    group.appendChild(head);
    const list = el('div', 'module-list');
    list.setAttribute('role', 'list');
    items.forEach(function (module) {
      list.appendChild(moduleRow(module));
    });
    group.appendChild(list);
    wrap.appendChild(group);
  });
}

function moduleGlyph(module) {
  const tile = el('span', 'glyph');
  if (module.glyph && GLYPHS.indexOf(module.glyph) !== -1) {
    tile.appendChild(icon(module.glyph));
  } else {
    const letter = String(module.name || module.id || '?').charAt(0).toUpperCase();
    tile.textContent = letter;
  }
  tile.setAttribute('aria-hidden', 'true');
  return tile;
}

function moduleRow(module) {
  const busy = state.moduleBusy === module.id;
  const anyBusy = !!state.moduleBusy;
  const row = el('div', 'row');
  row.setAttribute('role', 'listitem');
  if (busy) row.setAttribute('aria-busy', 'true');

  row.appendChild(moduleGlyph(module));

  const main = el('div', 'row-main');
  const title = el('div', 'row-title');
  title.appendChild(el('span', 'row-name', module.name || module.id));
  title.appendChild(el('span', 'tag', moduleKindLabel(module.kind)));
  if (module.updateAvailable) {
    title.appendChild(el('span', 'chip chip-update', t('modules.newUpdate')));
  }
  main.appendChild(title);
  const desc = el('p', 'row-desc', moduleDescription(module));
  desc.title = moduleDescription(module);
  main.appendChild(desc);
  row.appendChild(main);

  row.appendChild(el('span', 'row-meta', module.version || ''));

  const actions = el('div', 'row-actions');

  if (module.kind === 'theme') {
    if (module.enabled) {
      actions.appendChild(el('span', 'chip chip-inuse', t('modules.inUse')));
    } else {
      const use = makeButton(t('modules.use'), 'ghost', {
        disabled: anyBusy,
        onClick: function () { useThemeModule(module); }
      });
      if (busy && state.moduleBusyAction === 'theme') busyButton(use, 'appearance.applying');
      actions.appendChild(use);
    }
  } else if (!module.installed) {
    const install = makeButton(t('modules.install'), 'secondary', {
      disabled: anyBusy,
      onClick: function () { installModule(module, false); }
    });
    if (busy && state.moduleBusyAction === 'install') busyButton(install, 'modules.busyInstall');
    actions.appendChild(install);
  } else {
    if (module.updateAvailable) {
      const update = makeButton(t('modules.update'), 'ghost', {
        icon: 'update',
        disabled: anyBusy,
        onClick: function () { installModule(module, true); }
      });
      if (busy && state.moduleBusyAction === 'update') busyButton(update, 'modules.busyUpdate');
      actions.appendChild(update);
    }

    const toggle = el('button', 'switch');
    toggle.type = 'button';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', module.enabled ? 'true' : 'false');
    toggle.setAttribute('aria-label', module.enabled ? t('modules.toggleOff', { name: module.name }) : t('modules.toggleOn', { name: module.name }));
    toggle.appendChild(el('span', 'knob'));
    toggle.disabled = anyBusy;
    if (busy && state.moduleBusyAction === 'toggle') {
      toggle.classList.add('is-busy');
      toggle.setAttribute('aria-busy', 'true');
    }
    toggle.addEventListener('click', function () { toggleModule(module); });
    actions.appendChild(toggle);

    if (!module.bundled) {
      const remove = el('button', 'btn btn-danger btn-icon');
      remove.type = 'button';
      remove.setAttribute('aria-label', t('modules.remove') + ': ' + module.name);
      remove.title = t('modules.remove');
      remove.appendChild(icon('trash'));
      remove.disabled = anyBusy;
      if (busy && state.moduleBusyAction === 'remove') {
        remove.textContent = '';
        remove.appendChild(el('span', 'spinner'));
      }
      remove.addEventListener('click', function () {
        state.confirmRemoveId = module.id;
        renderModuleGroups();
      });
      actions.appendChild(remove);
    }
  }

  row.appendChild(actions);

  if (state.confirmRemoveId === module.id && !anyBusy) {
    const pop = el('div', 'confirm-popover');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', t('modules.removeTitle', { name: module.name }));
    pop.appendChild(el('h3', 'confirm-title', t('modules.removeTitle', { name: module.name })));
    pop.appendChild(el('p', 'confirm-body', t('modules.removeBody')));
    const confirmActions = el('div', 'confirm-actions');
    const cancel = makeButton(t('common.cancel'), 'ghost', {
      onClick: function () {
        state.confirmRemoveId = '';
        renderModuleGroups();
      }
    });
    const confirm = makeButton(t('modules.confirmRemove'), 'danger', {
      onClick: function () {
        state.confirmRemoveId = '';
        removeModule(module);
      }
    });
    confirmActions.appendChild(cancel);
    confirmActions.appendChild(confirm);
    pop.appendChild(confirmActions);
    row.appendChild(pop);
    window.requestAnimationFrame(function () { cancel.focus(); });
  }

  return row;
}

function syncModulesFromConfig() {
  applyConfigToModules();
  if (state.themesLoaded) {
    state.themes.forEach(function (theme) {
      theme.active = !!state.config && state.config.theme === theme.id;
    });
  }
}

function updateConfigArray(kind, id, enabled) {
  if (!state.config) return;
  const key = kind === 'snippet' ? 'snippets' : 'extensions';
  const list = state.config[key].filter(function (value) { return value !== id; });
  if (enabled) list.push(id);
  state.config[key] = list;
}

async function toggleModule(module) {
  if (state.moduleBusy || !state.config) return;
  const enabled = !module.enabled;
  state.moduleBusy = module.id;
  state.moduleBusyAction = 'toggle';
  renderModuleGroups();
  try {
    if (module.kind === 'extension') {
      const report = await call('set_extension', { id: module.id, enabled: enabled });
      assertReport(report);
      updateConfigArray('extension', module.id, enabled);
    } else if (module.kind === 'snippet') {
      const next = normalizeConfig(state.config);
      const list = next.snippets.filter(function (value) { return value !== module.id; });
      if (enabled) list.push(module.id);
      next.snippets = list;
      await saveConfigRaw(next);
    }
    module.enabled = enabled;
    applyConfigToModules();
    toastOk(enabled ? 'toast.moduleOn' : 'toast.moduleOff', { name: module.name });
  } catch (error) {
    toastError(error);
  } finally {
    state.moduleBusy = '';
    state.moduleBusyAction = '';
    renderModuleGroups();
  }
}

async function installModule(module, isUpdate) {
  if (state.moduleBusy) return;
  state.moduleBusy = module.id;
  state.moduleBusyAction = isUpdate ? 'update' : 'install';
  state.confirmRemoveId = '';
  renderModuleGroups();
  try {
    const report = await call('install_module', { id: module.id });
    assertReport(report);
    module.installed = true;
    module.updateAvailable = false;
    if (state.config) {
      if (module.kind === 'theme') state.config.theme = module.id;
      else if (module.kind === 'snippet') updateConfigArray('snippet', module.id, true);
      else updateConfigArray('extension', module.id, true);
      syncModulesFromConfig();
    }
    toastOk(isUpdate ? 'toast.moduleUpdated' : 'toast.moduleInstalled', { name: module.name });
  } catch (error) {
    toastError(error);
  } finally {
    state.moduleBusy = '';
    state.moduleBusyAction = '';
    renderModuleGroups();
  }
}

async function useThemeModule(module) {
  if (state.moduleBusy) return;
  state.moduleBusy = module.id;
  state.moduleBusyAction = 'theme';
  renderModuleGroups();
  try {
    const report = await call('install_module', { id: module.id });
    assertReport(report);
    module.installed = true;
    if (state.config) state.config.theme = module.id;
    syncModulesFromConfig();
    toastOk('toast.themeChanged');
  } catch (error) {
    toastError(error);
  } finally {
    state.moduleBusy = '';
    state.moduleBusyAction = '';
    renderModuleGroups();
  }
}

async function removeModule(module) {
  if (state.moduleBusy) return;
  state.moduleBusy = module.id;
  state.moduleBusyAction = 'remove';
  state.confirmRemoveId = '';
  renderModuleGroups();
  try {
    const report = await call('remove_module', { id: module.id });
    assertReport(report);
    module.installed = false;
    module.enabled = false;
    if (state.config) {
      if (module.kind === 'theme' && state.config.theme === module.id) state.config.theme = '';
      else if (module.kind === 'snippet') updateConfigArray('snippet', module.id, false);
      else updateConfigArray('extension', module.id, false);
      syncModulesFromConfig();
    }
    toastOk('toast.moduleRemoved', { name: module.name });
  } catch (error) {
    toastError(error);
  } finally {
    state.moduleBusy = '';
    state.moduleBusyAction = '';
    renderModuleGroups();
  }
}

/* ---------- Appearance ---------- */

function normalizeHexColor(value) {
  let next = String(value || '').trim().toLowerCase();
  if (next.charAt(0) === '#') next = next.slice(1);
  if (/^[0-9a-f]{3}$/.test(next) || /^[0-9a-f]{6}$/.test(next)) return '#' + next;
  return '';
}

function expandHex(value) {
  const hex = normalizeHexColor(value);
  if (!hex) return '#000000';
  if (hex.length === 4) {
    return '#' + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) + hex.charAt(3) + hex.charAt(3);
  }
  return hex;
}

function themePreviewColors(id) {
  const key = String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (THEME_PREVIEW[key]) return THEME_PREVIEW[key];
  const colors = state.config ? state.config.colors : DEFAULT_COLORS;
  return [colors.background, colors.sidebar, colors.card, colors.accent];
}

function renderAppearancePage(page) {
  page.appendChild(el('h2', 'section-title', t('appearance.themes')));

  if (state.themesLoading && !state.themesLoaded) {
    page.appendChild(el('p', 'color-note', t('common.loading')));
  } else if (state.themesError) {
    const banners = el('div', 'banners');
    banners.appendChild(makeBanner('danger', 'alert', t('appearance.loadError'), t('common.retry'), function () {
      state.themesLoaded = false;
      loadThemes();
    }));
    page.appendChild(banners);
  } else if (!state.themes.length) {
    const empty = el('div', 'empty');
    empty.appendChild(icon('palette'));
    empty.appendChild(el('p', null, t('appearance.empty')));
    empty.appendChild(makeButton(t('appearance.emptyAction'), 'secondary', {
      onClick: function () { openFolder(state.dataDir); }
    }));
    page.appendChild(empty);
  } else {
    const grid = el('div', 'theme-grid');
    grid.id = 'theme-grid';
    page.appendChild(grid);
    fillThemeGrid(grid);
  }

  page.appendChild(importCard());
  page.appendChild(colorCard());
}

function importCard() {
  const card = el('section', 'card import-card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('appearance.import')));
  card.appendChild(head);

  const row = el('div', 'import-row');
  const input = el('input', 'input');
  input.type = 'text';
  input.placeholder = t('appearance.importPlaceholder');
  input.value = state.spicetifyPath || '';
  input.setAttribute('aria-label', t('appearance.importPlaceholder'));
  input.setAttribute('autocomplete', 'off');
  input.spellcheck = false;
  input.addEventListener('input', function () { state.spicetifyPath = input.value; });
  row.appendChild(input);
  row.appendChild(makeButton(t('appearance.importAction'), 'secondary', {
    disabled: state.importBusy,
    onClick: function () { importSpicetifyTheme(input.value); }
  }));
  card.appendChild(row);
  card.appendChild(el('p', 'card-note', t('appearance.importHint')));
  return card;
}

async function importSpicetifyTheme(path) {
  const value = String(path || '').trim();
  if (!value || state.importBusy) return;
  state.importBusy = true;
  renderPage();
  try {
    const report = await call('import_spicetify_theme', { path: value });
    assertReport(report);
    const name = report.message || '';
    state.themesLoaded = false;
    await loadThemes();
    const data = await call('get_overview', {});
    state.config = normalizeConfig(data && data.config);
    toastOk('appearance.imported', { name: name });
  } catch (error) {
    toastError(error);
  } finally {
    state.importBusy = false;
    renderPage();
  }
}

function fillThemeGrid(grid) {
  grid.textContent = '';
  state.themes.forEach(function (theme) {
    const active = !!(theme.active || (state.config && state.config.theme === theme.id));
    const busy = state.themeBusy === theme.id;
    const card = el('button', 'theme-card');
    card.type = 'button';
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
    card.setAttribute('aria-label', t('appearance.useTheme', { name: theme.id }));
    card.disabled = !!state.themeBusy;
    if (busy) {
      card.setAttribute('aria-busy', 'true');
      card.disabled = true;
    }

    const preview = el('span', 'theme-preview');
    const colors = themePreviewColors(theme.id);
    preview.style.setProperty('--t-bg', colors[0]);
    preview.style.setProperty('--t-side', colors[1]);
    preview.style.setProperty('--t-card', colors[2]);
    preview.style.setProperty('--t-accent', colors[3]);
    preview.appendChild(el('span', 'theme-dot'));
    card.appendChild(preview);

    const foot = el('span', 'theme-foot');
    foot.appendChild(el('span', 'theme-name', theme.id));
    foot.appendChild(el('span', 'theme-active', t('appearance.inUse')));
    const busyLabel = el('span', 'theme-busy');
    if (busy) busyLabel.appendChild(el('span', 'spinner'));
    busyLabel.appendChild(el('span', null, t('appearance.applying')));
    foot.appendChild(busyLabel);
    card.appendChild(foot);

    card.addEventListener('click', function () {
      if (active) return;
      setTheme(theme.id);
    });
    grid.appendChild(card);
  });
}

async function setTheme(id) {
  if (state.themeBusy) return;
  state.themeBusy = id;
  const grid = $('#theme-grid');
  if (grid) fillThemeGrid(grid);
  try {
    const report = await call('set_theme', { id: id });
    assertReport(report);
    if (state.config) state.config.theme = id;
    state.themes.forEach(function (theme) { theme.active = theme.id === id; });
    applyConfigToModules();
    toastOk('toast.themeChanged');
  } catch (error) {
    toastError(error);
  } finally {
    state.themeBusy = '';
    const current = $('#theme-grid');
    if (current) fillThemeGrid(current);
  }
}

function colorCard() {
  const card = el('section', 'card colors-card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('appearance.colors')));
  card.appendChild(head);

  const config = state.config || normalizeConfig({});
  const grid = el('div', 'color-grid');
  COLOR_KEYS.forEach(function (key) {
    const raw = config.colors[key] || DEFAULT_COLORS[key];
    const value = normalizeHexColor(raw) || DEFAULT_COLORS[key];
    const field = el('div', 'field');
    field.dataset.colorField = key;
    const inputId = 'color-hex-' + key;
    const label = el('label', 'field-label', t('appearance.color.' + key));
    label.setAttribute('for', inputId);
    const control = el('div', 'color-control');
    const swatch = el('span', 'swatch');
    swatch.style.setProperty('--c', value);
    const picker = el('input');
    picker.type = 'color';
    picker.value = expandHex(value);
    picker.setAttribute('aria-label', t('appearance.color.' + key));
    const hex = el('input', 'hex-input');
    hex.type = 'text';
    hex.id = inputId;
    hex.value = value;
    hex.maxLength = 7;
    hex.setAttribute('autocomplete', 'off');
    hex.setAttribute('spellcheck', 'false');
    const error = el('p', 'field-error', t('appearance.invalidHex'));
    error.hidden = true;
    control.appendChild(swatch);
    control.appendChild(hex);
    swatch.appendChild(picker);
    field.appendChild(label);
    field.appendChild(control);
    field.appendChild(error);
    grid.appendChild(field);

    function setValidity(valid, show) {
      field.classList.toggle('is-error', !valid && show);
      hex.classList.toggle('is-invalid', !valid && show);
      error.hidden = valid || !show;
    }

    picker.addEventListener('input', function () {
      const next = normalizeHexColor(picker.value);
      if (!next) return;
      hex.value = next;
      swatch.style.setProperty('--c', next);
      setValidity(true, false);
      scheduleColorSave();
    });

    hex.addEventListener('input', function () {
      const parsed = normalizeHexColor(hex.value);
      const show = hex.value.trim() !== '';
      if (parsed) {
        picker.value = expandHex(parsed);
        swatch.style.setProperty('--c', parsed);
        setValidity(true, false);
        scheduleColorSave();
      } else {
        setValidity(false, show);
      }
    });

    hex.addEventListener('blur', function () {
      const parsed = normalizeHexColor(hex.value);
      if (parsed) {
        hex.value = parsed;
        picker.value = expandHex(parsed);
        swatch.style.setProperty('--c', parsed);
        setValidity(true, false);
      } else {
        setValidity(false, true);
      }
    });

    hex.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        hex.blur();
      }
    });
  });
  card.appendChild(grid);

  const foot = el('div', 'color-foot');
  const reset = makeButton(t('appearance.reset'), 'ghost', {
    onClick: function () { resetColors(); }
  });
  foot.appendChild(reset);
  card.appendChild(foot);
  card.appendChild(el('p', 'color-note', t('appearance.note')));
  return card;
}

function colorInputs() {
  const values = {};
  let valid = true;
  COLOR_KEYS.forEach(function (key) {
    const input = $('#color-hex-' + key);
    const parsed = input ? normalizeHexColor(input.value) : '';
    if (!parsed) valid = false;
    values[key] = parsed;
  });
  return { values: values, valid: valid };
}

function scheduleColorSave() {
  window.clearTimeout(colorTimer);
  colorTimer = window.setTimeout(function () {
    const current = colorInputs();
    if (!current.valid) return;
    queueColorSave(current.values, 'toast.saved');
  }, 350);
}

let colorQueue = Promise.resolve();

function queueColorSave(values, toastKey) {
  const snapshot = Object.assign({}, values);
  colorQueue = colorQueue.then(async function () {
    if (!state.config) {
      showToast(t('err.save'), 'error');
      return;
    }
    const next = normalizeConfig(state.config);
    next.colors = Object.assign({}, next.colors, snapshot);
    await saveConfigRaw(next);
    toastOk(toastKey || 'toast.saved');
  }).catch(function (error) {
    toastError(error);
  });
}

function resetColors() {
  COLOR_KEYS.forEach(function (key) {
    const input = $('#color-hex-' + key);
    const field = document.querySelector('[data-color-field="' + key + '"]');
    if (!input) return;
    input.value = DEFAULT_COLORS[key];
    input.classList.remove('is-invalid');
    if (field) field.classList.remove('is-error');
    const error = field ? field.querySelector('.field-error') : null;
    if (error) error.hidden = true;
    const control = field ? field.querySelector('.color-control') : null;
    const swatch = control ? control.querySelector('.swatch') : null;
    if (swatch) swatch.style.setProperty('--c', DEFAULT_COLORS[key]);
    const picker = swatch ? swatch.querySelector('input[type="color"]') : null;
    if (picker) picker.value = DEFAULT_COLORS[key];
  });
  window.clearTimeout(colorTimer);
  queueColorSave(Object.assign({}, DEFAULT_COLORS), 'toast.colorsReset');
}

/* ---------- Custom CSS ---------- */

function renderCssPage(host) {
  if (state.cssLoading && !state.cssLoaded) {
    host.appendChild(el('p', 'css-empty', t('common.loading')));
    return;
  }
  if (state.cssError && !state.cssLoaded) {
    const empty = el('div', 'empty');
    empty.appendChild(icon('code', 'empty-icon'));
    empty.appendChild(el('p', null, t('css.loadError')));
    empty.appendChild(makeButton(t('common.retry'), 'secondary', { onClick: function () { loadCssFiles(); } }));
    host.appendChild(empty);
    return;
  }

  const layout = el('div', 'css-layout');
  const files = el('aside', 'css-files');

  const head = el('div', 'css-files-head');
  head.appendChild(el('h2', 'card-title', t('css.files')));
  head.appendChild(makeButton(t('css.new'), 'ghost', {
    icon: 'code',
    onClick: function () {
      state.cssNewOpen = !state.cssNewOpen;
      renderPage();
    }
  }));
  files.appendChild(head);

  const list = el('ul', 'css-list');
  state.cssFiles.forEach(function (file) {
    const row = el('li', 'css-row' + (file.id === state.cssActive ? ' is-active' : ''));

    const pick = el('button', 'css-row-main');
    pick.type = 'button';
    pick.appendChild(icon(file.kind === 'user' ? 'code' : 'copy'));
    const text = el('span', 'css-row-text');
    text.appendChild(el('span', 'css-row-name', file.kind === 'user' ? t('css.userFile') : file.id + '.css'));
    text.appendChild(el('span', 'css-row-meta', t('css.chars', { count: file.size })));
    pick.appendChild(text);
    pick.addEventListener('click', function () { loadCssFile(file.id); });
    row.appendChild(pick);

    if (file.kind === 'snippet') {
      if (state.cssConfirmDelete === file.id) {
        row.appendChild(makeButton(t('css.confirmDelete'), 'danger', {
          onClick: function () { deleteCssFile(file.id); }
        }));
      } else {
        const remove = el('button', 'btn btn-ghost btn-icon');
        remove.type = 'button';
        remove.setAttribute('aria-label', t('css.delete'));
        remove.title = t('css.delete');
        remove.appendChild(icon('trash'));
        remove.addEventListener('click', function () {
          state.cssConfirmDelete = file.id;
          renderPage();
        });
        row.appendChild(remove);
      }
    }

    list.appendChild(row);
  });
  files.appendChild(list);

  const hasSnippets = state.cssFiles.some(function (file) { return file.kind === 'snippet'; });
  if (!hasSnippets) files.appendChild(el('p', 'css-empty', t('css.emptyHint')));

  if (state.cssNewOpen) {
    const form = el('form', 'css-new');
    const input = el('input', 'input');
    input.type = 'text';
    input.placeholder = t('css.newName');
    input.value = state.cssNewName;
    input.setAttribute('aria-label', t('css.newName'));
    input.setAttribute('autocomplete', 'off');
    input.spellcheck = false;
    input.addEventListener('input', function () { state.cssNewName = input.value; });
    form.appendChild(input);
    form.appendChild(makeButton(t('css.create'), 'primary', {
      onClick: function () { createCssSnippet(input.value); }
    }));
    form.appendChild(makeButton(t('css.cancel'), 'ghost', {
      onClick: function () {
        state.cssNewOpen = false;
        state.cssNewName = '';
        renderPage();
      }
    }));
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      createCssSnippet(input.value);
    });
    files.appendChild(form);
  }

  layout.appendChild(files);

  const editor = el('div', 'css-editor');
  const bar = el('div', 'css-editor-head');
  const title = el('div', 'css-editor-title');
  title.appendChild(el('span', 'css-editor-name', state.cssActive === 'user' ? t('css.userFile') : state.cssActive + '.css'));
  const dot = el('span', 'css-dot');
  dot.hidden = !state.cssDirty;
  title.appendChild(dot);
  bar.appendChild(title);

  const counter = el('span', 'css-count', t('css.chars', { count: state.cssDraft.length }));

  const actions = el('div', 'css-editor-actions');
  actions.appendChild(makeButton(t('css.reload'), 'ghost', {
    onClick: function () { loadCssFile(state.cssActive); }
  }));
  const save = makeButton(t('css.save'), 'primary', {
    disabled: !state.cssDirty || state.cssBusy === 'save',
    onClick: function () { saveCssFile(); }
  });
  actions.appendChild(save);
  bar.appendChild(actions);
  editor.appendChild(bar);

  const area = el('textarea', 'css-textarea');
  area.spellcheck = false;
  area.setAttribute('aria-label', t('css.title'));
  area.value = state.cssDraft;
  area.addEventListener('input', function () {
    state.cssDraft = area.value;
    state.cssDirty = true;
    dot.hidden = false;
    save.disabled = false;
    counter.textContent = t('css.chars', { count: area.value.length });
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(refreshPreview, 250);
  });
  area.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (state.cssDirty) saveCssFile();
    }
  });
  editor.appendChild(area);

  const foot = el('div', 'css-foot');
  foot.appendChild(el('span', 'css-foot-hint', t('css.hint')));
  foot.appendChild(counter);
  editor.appendChild(foot);

  layout.appendChild(editor);

  const preview = el('section', 'css-preview');
  const previewHead = el('div', 'css-preview-head');
  previewHead.appendChild(el('h2', 'card-title', t('css.preview')));
  previewHead.appendChild(el('span', 'css-count', t('css.previewHint')));
  preview.appendChild(previewHead);

  const frame = el('iframe', 'css-preview-frame');
  frame.setAttribute('sandbox', '');
  frame.setAttribute('title', t('css.preview'));
  frame.srcdoc = previewDocument(state.cssDraft);
  preview.appendChild(frame);
  layout.appendChild(preview);

  host.appendChild(layout);
}

/* ---------- Tools ---------- */

function settingRow(labelText, hintText, control, extraHint) {
  const row = el('div', 'setting-row');
  const copy = el('div', 'setting-copy');
  copy.appendChild(el('span', 'setting-label', labelText));
  if (hintText) copy.appendChild(el('span', 'setting-hint', hintText));
  if (extraHint) copy.appendChild(el('span', 'setting-hint is-warn', extraHint));
  row.appendChild(copy);
  row.appendChild(control);
  return row;
}

function makeSwitch(checked, ariaLabel, options) {
  const opts = options || {};
  const button = el('button', 'switch');
  button.type = 'button';
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-checked', checked ? 'true' : 'false');
  button.setAttribute('aria-label', ariaLabel);
  button.appendChild(el('span', 'knob'));
  if (opts.disabled) button.disabled = true;
  if (opts.busy) {
    button.disabled = true;
    button.classList.add('is-busy');
    button.setAttribute('aria-busy', 'true');
  }
  if (opts.onClick) button.addEventListener('click', opts.onClick);
  return button;
}

function languageSegment() {
  const segment = el('div', 'segmented');
  segment.setAttribute('role', 'group');
  segment.setAttribute('aria-label', t('tools.language'));
  [['vi', 'VI'], ['en', 'EN']].forEach(function (pair) {
    const code = pair[0];
    const label = pair[1];
    const active = state.config ? state.config.language === code : state.lang === code;
    const busy = state.configBusy === 'language' && active;
    const button = el('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.disabled = !!state.configBusy;
    if (busy) {
      button.appendChild(el('span', 'spinner'));
      button.appendChild(el('span', null, label));
    } else {
      button.textContent = label;
    }
    button.addEventListener('click', function () { changeLanguage(code); });
    segment.appendChild(button);
  });
  return segment;
}

function generalCard() {
  const card = el('section', 'card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('tools.general')));
  card.appendChild(head);

  card.appendChild(settingRow(t('tools.language'), '', languageSegment()));

  const safeBusy = state.configBusy === 'safeMode';
  const safe = makeSwitch(!!(state.config && state.config.safeMode), t('tools.safeMode'), {
    disabled: !!state.configBusy,
    busy: safeBusy,
    onClick: function () {
      const current = !!(state.config && state.config.safeMode);
      setFlag('safeMode', !current);
    }
  });
  const safeRow = settingRow(t('tools.safeMode'), t('tools.safeHint'), safe, state.config && state.config.safeMode ? t('tools.safeWarn') : '');
  card.appendChild(safeRow);
  return card;
}

function updatesCard() {
  const card = el('section', 'card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('tools.updates')));
  card.appendChild(head);

  const busy = state.configBusy === 'checkUpdate';
  const toggle = makeSwitch(!!(state.config && state.config.checkUpdate), t('tools.checkUpdate'), {
    disabled: !!state.configBusy,
    busy: busy,
    onClick: function () {
      const current = !!(state.config && state.config.checkUpdate);
      setFlag('checkUpdate', !current);
    }
  });
  card.appendChild(settingRow(t('tools.checkUpdate'), t('tools.checkHint'), toggle));

  const versionRow = el('div', 'setting-row');
  const copy = el('div', 'setting-copy');
  copy.appendChild(el('span', 'setting-label', t('overview.version')));
  versionRow.appendChild(copy);
  versionRow.appendChild(el('span', 'setting-value', 'v' + (state.version || '0.0.0')));
  card.appendChild(versionRow);
  return card;
}

function spotifyCard() {
  const card = el('section', 'card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('tools.spotify')));
  card.appendChild(head);

  const field = el('div', 'field');
  const label = el('label', 'field-label', t('tools.spotifyPath'));
  label.setAttribute('for', 'spotify-path');
  const row = el('div', 'input-row');
  const input = el('input', 'input mono');
  input.id = 'spotify-path';
  input.type = 'text';
  input.value = state.config ? state.config.spotifyPath : '';
  input.placeholder = t('tools.pathPlaceholder');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');
  input.disabled = state.pathBusy;
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveSpotifyPath();
    }
  });
  const save = makeButton(t('tools.savePath'), 'primary', {
    disabled: state.pathBusy,
    onClick: function () { saveSpotifyPath(); }
  });
  save.id = 'save-path';
  if (state.pathBusy) busyButton(save, 'common.loading');
  row.appendChild(input);
  row.appendChild(save);
  field.appendChild(label);
  field.appendChild(row);
  card.appendChild(field);
  return card;
}

function diagLabel(label) {
  return has('tools.diag.' + label) ? t('tools.diag.' + label) : String(label);
}

function diagValue(row) {
  const value = row && row.value !== undefined && row.value !== null ? String(row.value) : '';
  if (!row) return t('common.dash');
  if (row.label === 'install') {
    if (value === 'missing') return t('tools.diag.missing');
    const parts = value.split(' · ');
    if (parts.length === 2) parts[1] = stateLabel(parts[1]);
    return parts.join(' · ');
  }
  if (row.label === 'backup') {
    if (!value || value === 'none') return t('tools.diag.none');
    return formatDate(value);
  }
  if (row.label === 'spotify') {
    if (value === 'running') return t('tools.diag.running');
    if (value === 'closed') return t('tools.diag.closed');
    return value;
  }
  if (row.label === 'language') {
    if (value === 'vi') return t('tools.diag.vi');
    if (value === 'en') return t('tools.diag.en');
    return value;
  }
  return value;
}

function diagnosticsCard() {
  const card = el('section', 'card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('tools.diagnostics')));
  const actions = el('div', 'card-actions');

  const copy = makeButton(t('tools.copyReport'), 'secondary', {
    disabled: state.toolsBusy === 'report' || !state.diagnostics.length,
    onClick: function () { copyReport(); }
  });
  if (state.toolsBusy === 'report') busyButton(copy, 'common.loading');
  actions.appendChild(copy);

  const rerun = makeButton('', 'ghost', {
    iconOnly: true,
    ariaLabel: t('tools.runAgain'),
    title: t('tools.runAgain'),
    disabled: state.doctorLoading,
    onClick: function () { loadDoctor(); }
  });
  if (state.doctorLoading) {
    rerun.textContent = '';
    rerun.appendChild(el('span', 'spinner'));
    rerun.setAttribute('aria-busy', 'true');
  } else {
    rerun.appendChild(icon('refresh'));
  }
  actions.appendChild(rerun);
  head.appendChild(actions);
  card.appendChild(head);

  if (state.doctorError) {
    card.appendChild(makeBanner('danger', 'alert', t('err.doctor'), t('common.retry'), function () { loadDoctor(); }));
  }

  const table = el('div', 'diagnostics');
  const header = el('div', 'diag-row diag-head');
  header.setAttribute('aria-hidden', 'true');
  header.appendChild(el('span', null, t('tools.colName')));
  header.appendChild(el('span', null, t('tools.colValue')));
  header.appendChild(el('span', null, t('tools.colStatus')));
  table.appendChild(header);

  if (state.diagnostics.length) {
    state.diagnostics.forEach(function (row) {
      const line = el('div', 'diag-row');
      line.appendChild(el('span', 'diag-label', diagLabel(row.label)));
      const value = el('span', 'diag-value', diagValue(row) || t('common.dash'));
      value.title = diagValue(row) || '';
      line.appendChild(value);
      const status = el('span', 'diag-status', row.ok ? t('common.ok') : t('common.error'));
      status.dataset.ok = row.ok ? 'true' : 'false';
      line.appendChild(status);
      table.appendChild(line);
    });
  } else {
    table.appendChild(el('div', 'diag-empty', state.doctorLoading ? t('common.loading') : t('tools.diagnosticsEmpty')));
  }
  card.appendChild(table);
  return card;
}

function dataCard() {
  const card = el('section', 'card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('tools.data')));
  card.appendChild(head);

  const row = el('div', 'path-display');
  const path = el('code', 'dir-path', state.dataDir || t('common.dash'));
  path.title = state.dataDir || '';
  row.appendChild(path);
  row.appendChild(makeButton(t('tools.openData'), 'secondary', {
    onClick: function () { openFolder(state.dataDir); }
  }));
  card.appendChild(row);
  return card;
}

function appAppearanceCard() {
  const card = el('section', 'card appearance-card');
  const head = el('div', 'card-head');
  head.appendChild(el('h2', 'card-title', t('tools.appAppearance')));
  card.appendChild(head);

  const modeLine = el('div', 'appearance-line');
  modeLine.appendChild(el('span', 'appearance-label', t('tools.mode')));
  const modes = el('div', 'segmented');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', t('tools.mode'));
  [['light', 'sun', 'tools.light'], ['dark', 'moon', 'tools.dark'], ['system', 'system', 'tools.system']].forEach(function (spec) {
    const button = el('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', state.uiTheme === spec[0] ? 'true' : 'false');
    button.appendChild(icon(spec[1]));
    button.appendChild(el('span', null, t(spec[2])));
    button.addEventListener('click', function () { setUiTheme(spec[0], true); });
    modes.appendChild(button);
  });
  modeLine.appendChild(modes);
  card.appendChild(modeLine);

  const accentLine = el('div', 'appearance-line');
  accentLine.appendChild(el('span', 'appearance-label', t('tools.accent')));
  const list = el('div', 'accent-list');
  ACCENTS.forEach(function (accent) {
    const button = el('button', 'accent-option');
    button.type = 'button';
    button.dataset.accentOption = accent;
    button.setAttribute('aria-pressed', state.uiAccent === accent ? 'true' : 'false');
    button.setAttribute('aria-label', t('tools.accent.' + accent));
    const dot = el('span', 'dot');
    dot.style.setProperty('--dot', ACCENT_DOT[accent]);
    button.appendChild(dot);
    button.appendChild(el('span', null, t('tools.accent.' + accent)));
    button.addEventListener('click', function () { setUiAccent(accent); });
    list.appendChild(button);
  });
  accentLine.appendChild(list);
  card.appendChild(accentLine);
  return card;
}

function renderToolsPage(page) {
  const stack = el('div', 'tools-stack');
  stack.appendChild(generalCard());
  stack.appendChild(updatesCard());
  stack.appendChild(spotifyCard());
  stack.appendChild(diagnosticsCard());
  stack.appendChild(dataCard());
  stack.appendChild(appAppearanceCard());
  page.appendChild(stack);
}

async function setFlag(key, value) {
  if (!state.config || state.configBusy) return;
  const previous = state.config[key];
  state.config[key] = value;
  state.configBusy = key;
  renderPage();
  try {
    await saveConfigRaw(state.config);
  } catch (error) {
    state.config[key] = previous;
    toastError(error);
  } finally {
    state.configBusy = '';
    renderPage();
  }
}

async function setSafeMode(value) {
  await setFlag('safeMode', value);
}

async function changeLanguage(lang) {
  if (!state.config || state.configBusy) return;
  const previous = state.config.language;
  if (previous === lang) return;
  state.config.language = lang;
  state.lang = lang;
  state.configBusy = 'language';
  renderAll();
  try {
    await saveConfigRaw(state.config);
  } catch (error) {
    state.config.language = previous;
    state.lang = previous;
    toastError(error);
  } finally {
    state.configBusy = '';
    renderAll();
  }
}

async function saveSpotifyPath() {
  if (state.pathBusy || !state.config) return;
  const input = $('#spotify-path');
  const button = $('#save-path');
  if (!input) return;
  state.pathBusy = true;
  const value = input.value.trim();
  if (button) busyButton(button, 'common.loading');
  input.disabled = true;
  try {
    const next = normalizeConfig(state.config);
    next.spotifyPath = value;
    await saveConfigRaw(next);
    toastOk('toast.savedPath');
  } catch (error) {
    toastError(error);
  } finally {
    state.pathBusy = false;
    renderPage();
  }
}

async function copyReport() {
  if (state.toolsBusy || !state.diagnostics.length) return;
  state.toolsBusy = 'report';
  renderPage();
  const lines = [t('app.name') + ' v' + (state.version || '0.0.0')];
  state.diagnostics.forEach(function (row) {
    lines.push(diagLabel(row.label) + ': ' + diagValue(row) + ' — ' + (row.ok ? t('common.ok') : t('common.error')));
  });
  const ok = await copyText(lines.join('\n'));
  state.toolsBusy = '';
  if (ok) toastOk('toast.reportCopied');
  else toastError(reportError({ code: 'error' }));
  renderPage();
}

boot();





