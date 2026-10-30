# Spotify Extension

Bản Việt hoá + tuỳ biến cho Spotify Desktop trên Windows: đổi màu, cài theme, thêm extension — CLI nhẹ kiểu Spicetify, chỉ **~12 MB**.

> Chỉ hỗ trợ **Windows 10/11 64-bit** và **Spotify Desktop bản cài từ trang chủ Spotify** (Microsoft Store chưa được hỗ trợ).

## Tính năng

| Nhóm | Nội dung |
| --- | --- |
| Cài đặt | Tự tìm bản Spotify đang cài, sao lưu trước khi sửa, cài / gỡ chỉ với một lệnh |
| Giao diện | 6 màu chỉnh trực tiếp trong `config.ini` (accent, nền, sidebar, card, chữ, chữ mờ) + CSS tuỳ ý |
| Theme | Chọn theme dựng sẵn hoặc tự thả file vào thư mục theme |
| Extension | Bật/tắt từng extension bằng lệnh `sxe config` |
| Kho tiện ích | `sxe store list / install / uninstall / update` — module đi kèm + kho online trên GitHub |
| Trong Spotify | Bảng điều khiển (góc phải dưới): copy link/URI bài, mở bài, đổi màu nhấn, lời bài hát đồng bộ, tua ±10s, popup tên bài, đếm ngược thời gian |
| Chẩn đoán | Safe mode bỏ qua mọi extension/tinh chỉnh; bảng kiểm tra webpack hook, selector, extension lỗi và chép báo cáo gửi lỗi |
| Cập nhật | `sxe update --yes` tự tải bản mới từ GitHub Releases; bản mới của extension hiện ngay trong Spotify |
| An toàn | Mọi thay đổi nằm trong `Apps/xpui/sxe/`, `sxe restore` là về nguyên bản |

## Cài đặt

1. Vào tab **Releases** của repo, tải `spotify-extension-windows-x64.zip`.
2. Giải nén vào một thư mục cố định (vd `C:\Tools\sxe`).
3. Mở **Command Prompt** trong thư mục đó rồi chạy:

```
sxe status
sxe backup
sxe apply
```

4. Khởi động lại Spotify để thấy thay đổi.

Gỡ hoàn toàn: `sxe restore` — Spotify trở về nguyên bản.

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `sxe status` | Liệt kê bản Spotify tìm thấy và trạng thái |
| `sxe backup` | Chụp `Apps\xpui` nguyên bản theo từng phiên bản Spotify vào `%APPDATA%\spotify-extension\backups\` |
| `sxe apply` | Ghi payload + extension + màu vào `Apps\xpui\sxe\`, chèn khối vào `index.html` (tự backup nếu chưa có) |
| `sxe restore` | Khôi phục client từ bản sao lưu của đúng phiên bản Spotify đang chạy và dọn sạch thư mục `sxe\` |
| `sxe uninstall` | Giống restore, kèm dọn file thừa khi không có backup |
| `sxe config` | In cấu hình hiện tại |
| `sxe config <khoá> <giá>` | Sửa một mục (xem dưới) |
| `sxe theme list` / `sxe theme set <tên>` | Liệt kê / chọn theme |
| `sxe ext list` / `sxe ext on\|off <id>` | Liệt kê / bật / tắt extension |
| `sxe doctor` | In báo cáo chẩn đoán (client, backup, runtime, mạng…) |
| `sxe restart` | Khởi động lại Spotify |
| `sxe store list [all]` | Liệt kê module (thêm `all` để gộp kho online) |
| `sxe store install <id>` | Cài module rồi ghi vào config |
| `sxe store uninstall <id>` | Gỡ module |
| `sxe store update <id>` | Cập nhật module lên bản mới nhất |
| `sxe update` / `sxe update --yes` | Kiểm tra / cài bản mới của chính CLI |
| `sxe version` | In phiên bản |

Cờ chung: `--path <thư mục>` chọn bản Spotify tường minh, `--replace` vá đè lên client đang bị Spicetify vá (tự chạy `spicetify restore` hoặc khôi phục từ thư mục backup của Spicetify trước).

Sau khi đổi config hay cài module, chạy `sxe apply` để đẩy vào Spotify.

## Cấu hình

File `%APPDATA%\spotify-extension\config.ini`:

```ini
[Setting]
language = vi
spotify_path =
theme = Soft
check_update = 1

[AdditionalOptions]
extensions = adblock | volume-memory
snippets = hide-window-controls

[Colors]
accent = #1ed760
background = #121212
sidebar = #000000
card = #1f1f1f
text = #ffffff
subtext = #b3b3b3

[Feature]
safe_mode = 0
```

| Khoá | Ý nghĩa |
| --- | --- |
| `extensions` | Danh sách extension bật, ngăn cách bằng `\|` |
| `snippets` | Đoạn CSS bật, ngăn cách bằng `\|` |
| `theme` | Tên theme (`Soft`, hoặc theme tải từ kho) |
| `colors.*` | 6 màu giao diện |
| `language` | `vi` hoặc `en` — áp cho bảng điều khiển trong Spotify và CLI |
| `safe_mode` | `1` = bỏ qua extension/tinh chỉnh khi apply (để chẩn đoán) |
| `spotify_path` | Khoá thư mục Spotify cố định khi có nhiều bản |
| `check_update` | `0` = tắt kiểm tra bản mới trong Spotify. Đây là **mặc định**; nếu cậu bật/tắt trong bảng điều khiển thì lựa chọn đó được giữ lại |

CSS tuỳ ý: bỏ vào `%APPDATA%\spotify-extension\user.css`, nó được nối vào sau cùng.

Lần chạy đầu tiên, nếu máy còn `settings.json` của bản app cũ, CLI tự nhập màu, theme và danh sách extension sang `config.ini`.

## Kho tiện ích

Module đi kèm trong zip:

| Module | Loại | Việc |
| --- | --- | --- |
| Adblock | extension | Ẩn quảng cáo và thẻ được tài trợ |
| Auto skip explicit | extension | Tự nhảy bài có nhãn explicit (Alt+E bật/tắt) |
| Skip short tracks | extension | Tự nhảy bài ngắn hơn 45 giây (Alt+K bật/tắt) |
| Volume memory | extension | Nhớ mức âm lượng, khôi phục khi mở Spotify |
| Volume wheel | extension | Lăn chuột trên thanh phát để đổi âm lượng 5% |
| Playback speed | extension | Đổi tốc độ phát 1x → 1.25x → 1.5x → 2x (Alt+1) |
| Like hotkey | extension | Bấm nút thích bài đang phát (Alt+L) |
| Hide sidebar | extension | Ẩn thanh bên trái (Alt+B) |
| Focus mode | extension | Làm mờ giao diện, nổi bật thanh phát (Alt+F) |
| Quick keys | extension | Alt+←/→ tua 10 giây, Alt+↑/↓ âm lượng, Alt+M tắt tiếng |
| Track copy | extension | Alt+C chép tên bài hiện tại |
| Soft, Nord, Dracula, Amoled, Catppuccin, Gruvbox, TokyoNight, Rosé Pine, Solarized | theme | 9 theme màu sẵn, đổi bằng `sxe theme set <tên>` |
| Hide window controls | snippet | Ẩn nút cửa sổ Windows của Spotify |

Kho online lấy từ `store/modules.json` trong repo — module mới (như theme **Night**, snippet **Rounded covers**) tải thẳng về `%APPDATA%\spotify-extension\`. Thêm module vào `store/modules.json` là nó xuất hiện với tất cả người dùng, không cần ra bản mới.

Cấu trúc một mục trong kho:

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

`kind` là `extension` (file `.js`), `theme` (CSS trong thư mục riêng) hoặc `snippet` (CSS nối vào `user.css`).

## Bảng điều khiển trong Spotify

Bấm nút xanh có biểu tượng cân bằng ở góc phải dưới Spotify để mở:

- **Đang phát**: chép link `open.spotify.com`, chép URI, hoặc mở bài hát bằng trình duyệt.
- **Màu nhấn**: 6 màu có sẵn, đổi ngay không cần khởi động lại.
- **Tính năng**: bật/tắt nút tua ±10 giây, popup tên bài, đếm ngược thời gian.
- **Lời bài hát**: lấy từ LRCLIB (miễn phí, không cần API key), tự cuộn và tô sáng câu đang hát. Chỉ tải khi bảng điều khiển mở.
- **Cập nhật**: kiểm tra bản mới của extension.
- **Chẩn đoán**: webpack hook, số module, nút điều khiển, ô thời lượng, extension lỗi, bộ nhớ tạm — kèm nút chép toàn bộ thành báo cáo để gửi lỗi.

### Quyền riêng tư

Khi mở mục lời bài hát, tên bài, nghệ sĩ, album và thời lượng được gửi tới `lrclib.net` để tìm lời. Không có dữ liệu nào khác rời khỏi máy. Báo cáo chẩn đoán chỉ được chép vào clipboard khi cậu bấm nút — công cụ không tự gửi đi đâu cả.

### Safe mode

Bật `safe_mode = 1` trong config rồi chạy `sxe apply`. Lần mở Spotify tiếp theo sẽ bỏ qua extension, tinh chỉnh và màu nhấn, chỉ giữ bảng điều khiển — dùng khi Spotify lỗi sau khi cài để tìm thủ phạm. Tắt đi rồi `sxe apply` lại để khôi phục.

## Cách hoạt động

1. `sxe backup` chép nguyên vẹn `Apps\xpui` vào `%APPDATA%\spotify-extension\backups\<id>\<phiên-bản>\xpui\` kèm `manifest.json`. Mỗi phiên bản Spotify một bản sao riêng, nên khi Spotify tự cập nhật thì bản cũ vẫn còn nguyên và `sxe restore` luôn chọn đúng bản của phiên bản đang chạy.
2. `sxe apply` ghi `runtime.js`, `colors.css`, `user.css`, `manifest.js` và các extension đang bật vào `Apps\xpui\sxe\`, rồi chèn một khối nhỏ vào `index.html` giữa hai mốc `<!-- sxe:start -->` và `<!-- sxe:end -->`. Payload được ghi ra thư mục tạm rồi mới đổi chỗ, nên lỗi giữa chừng không làm hỏng bản đang chạy.
3. Nhờ hai mốc này, apply lại nhiều lần không bị nhân đôi, restore không đụng vào phần khác.
4. Nút tua ±10 giây được gắn lại bằng `MutationObserver` mỗi khi Spotify render lại thanh điều khiển, không còn vòng lặp kiểm tra 1,5 giây.

## Tự cập nhật

- **CLI**: `sxe update` so tag mới nhất trên GitHub Releases với phiên bản đang chạy theo chuẩn semver (bản local mới hơn thì không hạ cấp); `sxe update --yes` tải zip mới, thay `sxe.exe` và toàn bộ thư mục tài nguyên. Nếu ghi exe mới lỗi, bản cũ được trả lại để CLI vẫn chạy được.
- **Trong Spotify**: runtime đọc `tag_name` của release mới nhất qua GitHub API. Khi có bản mới, một banner nhỏ hiện ở góc phải dưới; bấm vào để mở trang tải. Có thể tắt kiểm tra trong bảng điều khiển.
- Việc kiểm tra chạy 6 giờ một lần (có cache), lỗi mạng chỉ ẩn banner chứ không ảnh hưởng Spotify.

## Build từ nguồn

CI (GitHub Actions) làm mọi thứ:

1. `npm run build` — typecheck + đóng gói payload (`dist/payload/runtime.js`).
2. `go vet ./... && go test ./...` — kiểm tra Go.
3. `go build` — ra `sxe.exe` (~12 MB, không dependency ngoài).
4. Đóng zip: `sxe.exe` + `runtime/` + `extensions/` + `themes/` + `snippets/`.

Push tag `v*` (vd `v0.3.0`) là workflow `release` tự tạo GitHub Release kèm zip.

---

## English

A Spicetify-style command-line tool for Spotify Desktop on Windows 10/11 x64, ~12 MB:

- `sxe status` lists installs; `sxe backup` snapshots `Apps/xpui`; `sxe apply` patches; `sxe restore` rolls back.
- Six theme colours, custom CSS, themes, extensions and CSS snippets via `config.ini` in `%APPDATA%\spotify-extension\`.
- `sxe store install <id>` pulls modules from the catalogue in `store/modules.json`.
- Inside Spotify: a panel (bottom-right) copies track links/URIs, opens the track, switches accent colours, shows synced lyrics from LRCLIB, toggles ±10s seek buttons, the track toast and time remaining, and holds a diagnostics report.
- `sxe update --yes` self-updates from GitHub Releases. Only download from `github.com/ninokiru/Spotify-Extension`.
