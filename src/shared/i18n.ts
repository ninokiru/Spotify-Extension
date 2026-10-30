export const en = {
  "spotify.panel.accent": "Accent color",
  "spotify.panel.accentDefault": "Default",
  "spotify.panel.checking": "Checking…",
  "spotify.panel.close": "Close",
  "spotify.panel.copyLink": "Copy link",
  "spotify.panel.copyUri": "Copy URI",
  "spotify.panel.diagControls": "Player controls",
  "spotify.panel.diagCopied": "Report copied",
  "spotify.panel.diagCopy": "Copy report",
  "spotify.panel.diagDuration": "Duration element",
  "spotify.panel.diagExtensions": "Extensions",
  "spotify.panel.diagFail": "Missing",
  "spotify.panel.diagModules": "Modules",
  "spotify.panel.diagOff": "Off",
  "spotify.panel.diagOk": "OK",
  "spotify.panel.diagOn": "On",
  "spotify.panel.diagRuntime": "Runtime",
  "spotify.panel.diagSafe": "Safe mode",
  "spotify.panel.diagStorage": "Storage",
  "spotify.panel.diagWebpack": "Webpack hook",
  "spotify.panel.diagnostics": "Diagnostics",
  "spotify.panel.dismiss": "Dismiss",
  "spotify.panel.download": "Download",
  "spotify.panel.features": "Features",
  "spotify.panel.linkCopied": "Link copied",
  "spotify.panel.lyrics": "Lyrics",
  "spotify.panel.lyricsEmpty": "No lyrics found for this track.",
  "spotify.panel.lyricsError": "Couldn't load lyrics.",
  "spotify.panel.lyricsInstrumental": "Instrumental track",
  "spotify.panel.lyricsLoading": "Loading lyrics…",
  "spotify.panel.lyricsRetry": "Try again",
  "spotify.panel.noTrack": "Nothing playing",
  "spotify.panel.nowPlaying": "Now playing",
  "spotify.panel.open": "Open Spotify Extension",
  "spotify.panel.openTrack": "Open",
  "spotify.panel.recheck": "Check again",
  "spotify.panel.safeHint": "Turn it off in the app, then press Repair.",
  "spotify.panel.safeOn": "Safe mode is on: extensions and tweaks are disabled.",
  "spotify.panel.seekButtons": "Seek buttons ±10s",
  "spotify.panel.songToast": "Track toast",
  "spotify.panel.source": "Source",
  "spotify.panel.timeRemaining": "Time remaining",
  "spotify.panel.updateAvailable": "Version {version} is available",
  "spotify.panel.updateCheck": "Check automatically",
  "spotify.panel.updateError": "Couldn't check for updates",
  "spotify.panel.updateIdle": "Not checked yet",
  "spotify.panel.updateLatest": "You're up to date",
  "spotify.panel.updates": "Updates",
  "spotify.panel.uriCopied": "URI copied",
} as const;

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

export const vi: Dictionary = {
  "spotify.panel.accent": "Màu nhấn",
  "spotify.panel.accentDefault": "Mặc định",
  "spotify.panel.checking": "Đang kiểm tra…",
  "spotify.panel.close": "Đóng",
  "spotify.panel.copyLink": "Chép link",
  "spotify.panel.copyUri": "Chép URI",
  "spotify.panel.diagControls": "Nút điều khiển",
  "spotify.panel.diagCopied": "Đã chép báo cáo",
  "spotify.panel.diagCopy": "Chép báo cáo",
  "spotify.panel.diagDuration": "Ô thời lượng",
  "spotify.panel.diagExtensions": "Tiện ích",
  "spotify.panel.diagFail": "Thiếu",
  "spotify.panel.diagModules": "Số module",
  "spotify.panel.diagOff": "Tắt",
  "spotify.panel.diagOk": "OK",
  "spotify.panel.diagOn": "Bật",
  "spotify.panel.diagRuntime": "Bản chạy",
  "spotify.panel.diagSafe": "Chế độ an toàn",
  "spotify.panel.diagStorage": "Bộ nhớ tạm",
  "spotify.panel.diagWebpack": "Hook webpack",
  "spotify.panel.diagnostics": "Chẩn đoán",
  "spotify.panel.dismiss": "Bỏ qua",
  "spotify.panel.download": "Tải về",
  "spotify.panel.features": "Tính năng",
  "spotify.panel.linkCopied": "Đã chép link",
  "spotify.panel.lyrics": "Lời bài hát",
  "spotify.panel.lyricsEmpty": "Không tìm thấy lời cho bài này.",
  "spotify.panel.lyricsError": "Không tải được lời bài hát.",
  "spotify.panel.lyricsInstrumental": "Nhạc không lời",
  "spotify.panel.lyricsLoading": "Đang tải lời…",
  "spotify.panel.lyricsRetry": "Thử lại",
  "spotify.panel.noTrack": "Chưa có bài nào",
  "spotify.panel.nowPlaying": "Đang phát",
  "spotify.panel.open": "Mở Spotify Extension",
  "spotify.panel.openTrack": "Mở",
  "spotify.panel.recheck": "Kiểm tra lại",
  "spotify.panel.safeHint": "Tắt trong app rồi bấm Sửa để áp dụng lại.",
  "spotify.panel.safeOn": "Đang bật chế độ an toàn: tiện ích và tinh chỉnh bị tắt.",
  "spotify.panel.seekButtons": "Nút tua ±10 giây",
  "spotify.panel.songToast": "Thông báo bài hát",
  "spotify.panel.source": "Mã nguồn",
  "spotify.panel.timeRemaining": "Thời gian còn lại",
  "spotify.panel.updateAvailable": "Đã có bản {version}",
  "spotify.panel.updateCheck": "Tự kiểm tra",
  "spotify.panel.updateError": "Không kiểm tra được",
  "spotify.panel.updateIdle": "Chưa kiểm tra",
  "spotify.panel.updateLatest": "Bản mới nhất",
  "spotify.panel.updates": "Cập nhật",
  "spotify.panel.uriCopied": "Đã chép URI",
} as const;

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
