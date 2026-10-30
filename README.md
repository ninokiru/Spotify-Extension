# Spotify Extension

Bản Việt hoá + tuỳ biến cho Spotify Desktop trên Windows: cài theme, đổi màu, thêm extension — tương tự Spicetify nhưng giao diện thân thiện hơn.

> Chỉ hỗ trợ **Windows 10/11 64-bit** và **Spotify Desktop bản cài từ trang chủ Spotify** (Microsoft Store chưa được hỗ trợ).

## Tính năng

| Nhóm | Nội dung |
| --- | --- |
| Cài đặt | Tự tìm bản Spotify đang cài, sao lưu trước khi sửa, cài / sửa / gỡ chỉ với một nút |
| Giao diện | 6 màu chỉnh trực tiếp (accent, nền, sidebar, card, chữ, chữ mờ) + CSS tuỳ ý |
| Theme | Chọn theme dựng sẵn hoặc tự thả file vào thư mục theme |
| Extension | Bật/tắt từng extension, có sẵn phím tắt nhanh và copy tên bài hát |
| Kho tiện ích | Danh mục module: tìm kiếm, lọc theo loại, xem chi tiết, cài / gỡ / cập nhật từ kho trên GitHub |
| Trong Spotify | Bảng điều khiển (góc phải dưới): copy link/URI bài, mở bài, đổi màu nhấn, lời bài hát đồng bộ, tua ±10s, popup tên bài, đếm ngược thời gian |
| Chẩn đoán | Safe mode bỏ qua mọi extension/tinh chỉnh; bảng kiểm tra webpack hook, selector, extension lỗi và chép báo cáo gửi lỗi |
| Cập nhật | App tự cập nhật qua electron-updater; bản mới của extension hiện ngay trong Spotify |
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
3. Chép runtime, danh sách extension, `colors.css`, `user.css` và `manifest.js` (phiên bản, repo, thiết lập mặc định) vào `Apps\xpui\sxe\`.
4. Chèn một khối nhỏ vào `index.html` giữa hai mốc `<!-- sxe:start -->` và `<!-- sxe:end -->`.

Nhờ hai mốc này, app luôn biết phần nào là của mình: cài lại nhiều lần không bị nhân đôi, gỡ ra không đụng vào phần khác.

Nút tua ±10 giây được gắn lại bằng `MutationObserver` mỗi khi Spotify render lại thanh điều khiển, không còn vòng lặp kiểm tra 1,5 giây.

## Kho tiện ích

Tab **Kho tiện ích** trong app là nơi cài thêm module, giống Module Store của Spicetify:

- **Tìm kiếm** theo tên, mô tả hoặc tác giả; lọc theo **Tiện ích / Theme / Đoạn CSS**; sắp xếp theo lượt cài, mới nhất hoặc tên.
- Bấm vào một thẻ để xem chi tiết rồi **Cài đặt** hoặc **Gỡ**. Cài xong app tự áp lại vào Spotify.
- Module đi kèm trong bộ cài: **Adblock** (ẩn quảng cáo và bảng được tài trợ), **Auto skip explicit** (tự nhảy bài có nhãn explicit), **Volume memory** (nhớ mức âm lượng), **Quick keys**, **Track copy**, theme **Soft**, đoạn CSS **Hide window controls**.
- Module trong kho online lấy từ `store/modules.json` trong repo. Phiên bản mới hiện banner vàng kèm nút **Cập nhật tất cả**. Không tải được danh mục online thì app hiện dòng nhắc và vẫn dùng được module đi kèm.

Cấu trúc một module trong kho:

```json
{
  "id": "adblock",
  "name": "Adblock",
  "author": "ninokiru",
  "description": "Removes ad slots and sponsored cards in the Spotify client.",
  "descriptionVi": "Ẩn quảng cáo và thẻ được tài trợ trong giao diện Spotify.",
  "version": "1.0.0",
  "kind": "extension",
  "glyph": "shield",
  "accent": ["#123a24", "#0d1f16"],
  "files": [{ "name": "adblock.js", "url": "https://raw.githubusercontent.com/…/adblock.js" }]
}
```

`kind` là `extension` (file `.js`), `theme` (CSS trong thư mục riêng) hoặc `snippet` (CSS chèn thêm vào `user.css`).

## Bảng điều khiển trong Spotify

Bấm nút xanh có biểu tượng cân bằng ở góc phải dưới Spotify để mở:

- **Đang phát**: chép link `open.spotify.com`, chép URI, hoặc mở bài hát bằng trình duyệt.
- **Màu nhấn**: 6 màu có sẵn, đổi ngay không cần khởi động lại.
- **Tính năng**: bật/tắt nút tua ±10 giây, popup tên bài, đếm ngược thời gian.
- **Lời bài hát**: lấy từ LRCLIB (miễn phí, không cần API key), tự cuộn và tô sáng câu đang hát. Chỉ tải khi bảng điều khiển mở.
- **Cập nhật**: kiểm tra bản mới của extension.
- **Chẩn đoán**: webpack hook, số module, nút điều khiển, ô thời lượng, extension lỗi, bộ nhớ tạm — kèm nút chép toàn bộ thành báo cáo để gửi lỗi.

### Safe mode

Bật **Chế độ an toàn** trong tab Cài đặt của app rồi bấm **Sửa** (Repair). Lần mở Spotify tiếp theo sẽ bỏ qua extension, tinh chỉnh và màu nhấn, chỉ giữ bảng điều khiển — dùng khi Spotify lỗi sau khi cài để tìm thủ phạm. Tắt safe mode rồi **Sửa** lại để khôi phục.

## Cập nhật

- **App**: dùng `electron-updater` + GitHub Releases. App kiểm tra sau khi mở (nếu bật **Tự động cập nhật** trong Cài đặt), tải bản mới rồi cài im lặng khi bạn bấm **Cài đặt**.
- **Trong Spotify**: runtime đọc `tag_name` của release mới nhất qua GitHub API. Khi có bản mới, một banner nhỏ hiện ở góc phải dưới; bấm vào để mở trang tải. Có thể tắt kiểm tra trong bảng điều khiển.
- Việc kiểm tra chạy 6 giờ một lần (có cache), lỗi mạng chỉ ẩn banner chứ không ảnh hưởng Spotify.
- Release cần đăng kèm `latest.yml` và file `.blockmap` để app tự cập nhật được — workflow đã làm sẵn.

## Tự viết extension

Mỗi extension là **một file `.js`** trong thư mục `extensions/` của app (mở bằng nút **Mở thư mục** trong tab Extension). Phần đầu file là metadata:

```js
// NAME: Tên extension
// AUTHOR: tên bạn
// DESCRIPTION: Mô tả ngắn
// VERSION: 1.0.0

window.SpotifyExtension.ready.then(() => {
  const api = window.SpotifyExtension;
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
| `settings` | `get()`, `set(key, value)`, `onChange(fn)` — dùng chung với bảng điều khiển trong Spotify |
| `update` | `check(force?)`, `current()`, `onChange(fn)` — kiểm tra bản mới trên GitHub |
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

- **Actions → build** (hoặc push lên `main`): tạo file `.exe` + `latest.yml` trong mục *Artifacts*.
- **Actions → release** (hoặc push tag `v1.0.0`): tạo GitHub Release kèm `.exe`, `latest.yml`, `.blockmap`. Chạy tay workflow bằng *Run workflow* thì chỉ để file trong *Artifacts*, không tạo release (GitHub bắt buộc có tag cho release).

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
- A small panel inside Spotify (bottom-right) copies track links/URIs, opens the track, switches accent colours, shows synced lyrics from LRCLIB, toggles ±10s seek buttons, the track toast and time remaining, and holds a diagnostics report. The app updates itself through electron-updater.
- **Safe mode** in Settings (then Repair) loads the panel only — extensions, tweaks and accents are skipped so a broken install can still open Spotify.
- Builds run only on GitHub Actions (`.github/workflows`), producing a Windows x64 NSIS installer plus `latest.yml`/`.blockmap` for auto-update.

MIT licensed.
