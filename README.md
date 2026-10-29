# Spotify Extension

Bản Việt hoá + tuỳ biến cho Spotify Desktop trên Windows: cài theme, đổi màu, thêm extension — tương tự Spicetify nhưng giao diện thân thiện hơn.

> Chỉ hỗ trợ **Windows 10/11 64-bit** và **Spotify Desktop bản cài từ trang chủ Spotify** (Microsoft Store chưa được hỗ trợ).

## Tính năng

| Nhóm | Nội dung |
| --- | --- |
| Cài đặt | Tự tìm bản Spotify đang cài, sao lưu trước khi sửa, cài / sửa / gỡ chỉ với một nút |
| Giao diện | 6 màu chỉnh trực tiếp (accent, nền, sidebar, card, chữ, chữ mờ) + CSS tuỳ ý |
| Theme | Chọn theme dựng sẵn hoặc tự thả file vào thư mục theme |
| Extension | Bật/tắt từng extension, có sẵn phím tắt nhanh và popup tên bài hát |
| An toàn | Mọi thay đổi nằm trong `Apps/xpui/sxe/`, gỡ ra là về nguyên bản |
| Song ngữ | Tiếng Việt và English, đổi ngay trong Cài đặt |

## Cài đặt

1. Vào tab **Releases** của repo, tải `Spotify-Extension-Setup-<version>-x64.exe`.
2. Chạy file vừa tải. Windows có thể hiện cảnh báo SmartScreen (ứng dụng chưa ký số) → chọn **More info → Run anyway**.
3. Mở app, chọn bản Spotify đang cài rồi bấm **Cài đặt** (Install).
4. Khởi động lại Spotify để thấy thay đổi.

Gỡ hoàn toàn: bấm **Gỡ cài đặt** (Uninstall) trong app — Spotify sẽ trở về nguyên bản.

## Cách hoạt động

1. App tìm `Spotify.exe` trong `%APPDATA%\Spotify` và các thư mục cài đặt phổ biến.
2. Sao lưu `Apps\xpui` vào thư mục dữ liệu của app (`backups/`).
3. Chép runtime, danh sách extension, `colors.css` và `user.css` vào `Apps\xpui\sxe\`.
4. Chèn một khối nhỏ vào `index.html` giữa hai mốc `<!-- sxe:start -->` và `<!-- sxe:end -->`.

Nhờ hai mốc này, app luôn biết phần nào là của mình: cài lại nhiều lần không bị nhân đôi, gỡ ra không đụng vào phần khác.

## Tự viết extension

Mỗi extension là **một file `.js`** trong thư mục `extensions/` của app (mở bằng nút **Mở thư mục** trong tab Extension). Phần đầu file là metadata:

```js
// NAME: Tên extension
// AUTHOR: tên bạn
// DESCRIPTION: Mô tả ngắn
// VERSION: 1.0.0

window.SpotifyExtension.ready.then((api) => {
  api.keyboard.register("ctrl+shift+p", async () => {
    const track = await api.player.track();
    api.toast(track ? track.name : "Không có gì đang phát");
  });
});
```

API có sẵn:

| Nhóm | Hàm |
| --- | --- |
| `player` | `state()`, `track()`, `play()`, `pause()`, `toggle()`, `next()`, `previous()`, `seek(ms)`, `setVolume(0–1)`, `getVolume()`, `on("songchange" \| "playpause" \| "progress" \| "volume", fn)` |
| `dom` | `waitFor(selector, ms?)`, `observe(selector, fn)` |
| `css` | `add(css, id?)` → trả về hàm gỡ |
| khác | `toast(text, ms?)`, `keyboard.register(combo, fn)`, `events.on/emit`, `internal.require`, `internal.findModules(fn)` |

Sau khi thêm file, mở tab **Extension** rồi bật công tắc của extension đó.

## Tự viết theme

Tạo thư mục trong `themes/` (của app hoặc của repo) và đặt `user.css` hoặc `theme.css` bên trong. Tên thư mục chính là tên theme trong danh sách. Màu sắc dùng biến CSS của Spotify:

```css
:root {
  --background-base: #101418;
  --text-bright-accent: #7ad7ff;
}
```

## Build bằng GitHub Actions

Repo không build ở máy local — mọi bản build đều chạy trên GitHub Actions:

- **Actions → build** (hoặc push lên `main`): tạo file `.exe` trong mục *Artifacts*.
- **Actions → release** (hoặc push tag `v1.0.0`): tạo GitHub Release kèm file `.exe`.

Quy trình trong [.github/workflows](.github/workflows): cài Node 22 → `npm install` → `npm run build` (typecheck + esbuild) → `electron-builder --win --x64`.

## Ghi chú

- Spotify cập nhật phiên bản sẽ ghi đè `Apps/xpui`. Khi đó mở app và bấm **Sửa** (Repair) là xong; bật **Tự áp dụng khi mở app** để app tự lo.
- Nếu bạn đã dùng Spicetify trên cùng bản Spotify, hãy gỡ Spicetify trước — hai bên sửa cùng một thư mục.
- Bản build chưa ký số nên Windows sẽ cảnh báo lần chạy đầu.

---

## English

Spotify Extension is a Windows-only (x64) desktop tool for theming and extending the Spotify client, in the spirit of Spicetify with a friendlier installer UI. It backs up `Apps/xpui`, drops its runtime into `Apps/xpui/sxe/`, and injects a marker block into `index.html`, so installs are repeatable and removable.

- Download `Spotify-Extension-Setup-<version>-x64.exe` from Releases, run it, pick your Spotify install, hit **Install**.
- Extensions are single `.js` files using `window.SpotifyExtension`; themes are folders containing `user.css`.
- Builds run only on GitHub Actions (`.github/workflows`), producing a Windows x64 NSIS installer.

MIT licensed.
