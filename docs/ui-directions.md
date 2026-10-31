# Năm hướng giao diện — Spotify Extension

Tài liệu so sánh 5 hướng cho cửa sổ 1000×700 của app quản lý tuỳ biến Spotify (Tauri 2, WebView2, Windows 10/11).
Mockup mở được: `docs/mockups/direction-a.html` (A), `direction-b.html` (B, có toggle sáng/tối), `direction-c.html` (C). D và E chỉ có đặc tả token, chưa dựng mockup. Các cặp chữ/nền đo được trên nền đặc đều ≥4.5:1; E cần scrim và fallback. Focus ring 2px; animation ≤180ms.

## Nguyên tắc rút ra từ nghiên cứu

- **Spicetify Marketplace** — tab theo loại; hàng đã cài đưa trạng thái bật/tắt lên trước. Một hàng chỉ nên có một quyết định.
- **Linear** — giảm nhiễu, tăng phân cấp trong sidebar; theme định nghĩa bằng base/accent/contrast thay vì rải màu; bề mặt tách nhau bằng độ nổi, không bằng trang trí.
- **Raycast** — nền gần đen, viền hairline, radius 6–16, không đổ bóng; chỉ một CTA sáng trên màn.
- **Warp** — mật độ kiểu IDE; dữ liệu và lệnh dùng mono, bảng cài đặt đọc như output.
- **Arc / Zen** — settings gom theo nhóm "look and feel", sidebar-first; đổi giao diện phải thấy ngay, không rời trang.
- **shadcn/ui dashboard** — sidebar 220–240, card padding 16/20/24, một thang spacing; nhanh nhưng dễ giống nhau nếu giữ token mặc định.
- **Windows Mica** — vật liệu động theo wallpaper cho cửa sổ sống lâu; cần transparent window + `window-vibrancy` và luôn có fallback đặc.
- **WCAG 2.2** — chữ ≥4.5:1, focus 2px, vùng bấm ≥24px (hướng tới 32px); các con số dưới đây đã đo bằng công thức tương phản.

Các hướng lấy nhịp bố cục và cách giảm nhiễu; không dùng logo, màu thương hiệu, gradient hay câu chữ của sản phẩm tham chiếu.

## A. Spotify-native

**Cảm giác**
- Tối như chính Spotify, xanh chỉ xuất hiện ở nơi đáng được chú ý.
- Bo tròn, nhịp thoáng, như một cửa sổ phụ của client.
- Thân thiện với người dùng phổ thông, ít dấu vết của công cụ hệ thống.

| Token | Giá trị |
| --- | --- |
| `bg` | `#080808` |
| `surface` | `#121212` |
| `line` | `#2b2b2b` |
| `text` / `dim` | `#ffffff` / `#b3b3b3` |
| `accent` | `#1ed760` (hover `#3be477`) |
| `accent-soft` | `#12351f` |
| `danger` / `warn` | `#f15e6c` / `#f5c451` |
| `radius` | 8 / 12 / 999 |
| `font stack` | `"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif`; tiêu đề dùng bản Display |
| `size` | 10.5–11 nhãn · 13 nút · 14 thân · 16 thẻ · 20 trang |

**Kiểu nút.** Pill 32px, chữ 13/600; primary xanh đặc, secondary viền 1px sáng, ghost chỉ đổi nền. Hover không đổi kích thước.
**Kiểu nav.** Mục 36px bo 8; active là pill `#1c1c1c` + icon xanh; brand 60px; footer version dính đáy.
**Hợp với ai.** Người dùng Spotify hằng ngày, thích app quản lý trông như một phần của client; hợp bản Việt hoá cho người mới.
**Điểm trừ.** Dễ bị đọc là fan-page; xanh vừa là thương hiệu vừa là hành động nên tín hiệu trạng thái yếu; trắng 14px trên đen gây chói khi đọc lâu; không có light mode.
**Độ khó.** Thấp — chỉ cần token và vài component; mockup A đã dựng xong.

## B. Linear minimal

**Cảm giác**
- Than chì, viền mảnh, chữ nhỏ; gần như không có gì để trang trí.
- Khoảng thở nhiều hơn mật độ thông tin, nhưng vẫn đủ để quét.
- Cảm giác của một công cụ được thiết kế cho người làm việc lâu.

| Token | Giá trị |
| --- | --- |
| `bg` | `#0c0d0f` |
| `surface` | `#121316` |
| `line` | `#24262b` |
| `text` / `dim` | `#e9eaee` / `#9a9da6` |
| `accent` | `#a78bfa` |
| `accent-soft` | `#211c31` |
| `danger` / `warn` | `#e5727a` (light `#b3404a`) / `#d9b36b` (light `#8a6414`) |
| `radius` | 6 / 8 / 10 |
| `font stack` | `"Inter","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif` |
| `size` | 10 nhãn · 11–12 phụ · 13 thân · 15 thẻ · 18 trang |
| Bản sáng | `bg #f6f6f7` · `surface #ffffff` · `line #e4e5e9` · `text #17181b` · `dim #5b5e66` · `accent #6b4bd6` · `accent-soft #efeafc` |

**Kiểu nút.** 28px bo 6, chữ 12/500; primary tím đặc; secondary `surface-2` + hairline; ghost phẳng. Chỉ một primary trên màn.
**Kiểu nav.** Hai nhóm có nhãn 10px; hàng 30px; active `surface-2` + vạch tím 2×12; icon không tô màu.
**Hợp với ai.** Người dùng Linear/Raycast, dev và designer làm việc lâu; cần cảm giác sản phẩm đã trưởng thành, không phô.
**Điểm trừ.** 13px và dim 6.8:1 có thể nhỏ với màn 125%; tím không liên hệ với Spotify; dễ trượt sang "SaaS chung chung" nếu thay token bằng mặc định; light mode phải hiệu chỉnh riêng.
**Độ khó.** Vừa — token đơn giản nhưng phải kỷ luật hairline, spacing và type scale.

## C. Technical mono

**Cảm giác**
- Đen, mono, nhãn in hoa; như một cửa sổ terminal có giao diện.
- Thông tin xếp thành bảng, trạng thái là các ô ON/OFF rõ ràng.
- Lạnh, chính xác, đáng tin với người quen dùng CLI.

| Token | Giá trị |
| --- | --- |
| `bg` | `#060807` |
| `surface` | `#0b0e0c` |
| `line` | `#1e2621` |
| `text` / `dim` | `#d9e2dc` / `#8e9b93` |
| `accent` | `#4ade80` |
| `accent-soft` | `#0d2417` |
| `danger` / `warn` | `#ff7b72` / `#e3b341` |
| `radius` | 2 / 3 |
| `font stack` | `"Cascadia Mono","Cascadia Code",Consolas,monospace` |
| `size` | 8.5–10 nhãn · 10.5–12 thân · 17 trang · 20 giá trị |

**Kiểu nút.** 30px bo 2, nhãn in hoa 9.5/700 + tracking .08em; primary xanh đặc; secondary viền; ghost không viền. Hover đổi nền, không đổi cỡ.
**Kiểu nav.** Mục 32px đánh số 01–04, nhãn in hoa; active `surface-2` + vạch xanh 2px; cột 220.
**Hợp với ai.** Dev/tinkerer, người dùng CLI `sxe`, thích nhìn thấy trạng thái và đường dẫn hơn là lời giải thích.
**Điểm trừ.** Mono toàn bộ làm chậm đọc tiếng Việt; nhãn 8.5–10px in hoa có dấu dễ rối; lạnh với người dùng phổ thông; chỉ hợp dark.
**Độ khó.** Vừa — cần kiểm tra font mono cho tiếng Việt, nhịp bảng và trạng thái ON/OFF.

## D. Paper light

**Cảm giác**
- Giấy ấm, chữ nâu đen, xanh rêu; như một cuốn sổ tay được số hoá.
- Tương phản cao, dễ đọc dưới ánh sáng ban ngày.
- Không cố bắt chước Spotify; đứng cạnh như một công cụ giấy.

| Token | Giá trị |
| --- | --- |
| `bg` | `#f7f3ea` |
| `surface` | `#fffdf6` |
| `line` | `#ded4c3` |
| `text` / `dim` | `#2a2620` / `#6a6053` |
| `accent` | `#3f6b4f` |
| `accent-soft` | `#e6eee4` |
| `danger` / `warn` | `#a8443a` / `#8a6216` |
| `radius` | 4 / 8 / 10 |
| `font stack` | `"Segoe UI Variable Text","Segoe UI",sans-serif`; tiêu đề `"Cambria",Georgia,serif` |
| `size` | 11 nhãn · 13 nút · 14 thân · 16 thẻ · 20 trang |

**Kiểu nút.** 34px bo 8; primary xanh rêu, secondary nền giấy + viền mực nhạt; ghost chữ mực. Không đổ bóng.
**Kiểu nav.** Mục 36px; active là tab giấy: nền surface + viền 1px + vạch rêu 2px; hover nền `#f1ebdf`.
**Hợp với ai.** Người ghét dark mode, dùng ban ngày, ưu tiên tương phản cao và cảm giác tài liệu; hợp bản in/hướng dẫn.
**Điểm trừ.** Lệch tông với Spotify tối; dễ thành app ghi chú; serif tiếng Việt cần kiểm tra dấu; light-only nên không đáp ứng người dùng ban đêm.
**Độ khó.** Thấp — chủ yếu là ánh xạ màu và kiểm tra tương phản; không cần switch light/dark.

## E. Mica / Vibrancy

**Cảm giác**
- Nền theo hình nền Windows, viền sáng 1px, lớp nổi nhẹ.
- Cảm giác native nhất trên Windows 11, nhưng phụ thuộc môi trường.
- Đẹp khi đứng một mình, khó đoán khi đặt trên nền wallpaper.

| Token | Giá trị |
| --- | --- |
| `bg` | Mica (fallback `#1b1c1e`, scrim 70%) |
| `surface` | `rgba(255,255,255,.06)` |
| `line` | `rgba(255,255,255,.14)` |
| `text` / `dim` | `#f4f6f7` / `#b7bcc2` |
| `accent` | `#3ddc97` |
| `accent-soft` | `rgba(61,220,151,.14)`, fallback `#16302a` |
| `danger` / `warn` | `#ff8a80` / `#ffd166` |
| `radius` | 8 / 12 |
| `font stack` | `"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif` |
| `size` | 11 nhãn · 14 thân · 16 thẻ · 20 trang |

**Kiểu nút.** 32px bo 8; primary mint đặc, ink tối; secondary trắng 8% + viền sáng 1px; hover tăng độ đục, không blur thêm.
**Kiểu nav.** Mục 34px; active là pill trắng 10% + viền sáng 1px + vạch mint 2px; sidebar 220.
**Hợp với ai.** Người dùng Windows 11, thích app hoà vào hệ điều hành; sản phẩm muốn tạo ấn tượng native ngay lần mở đầu.
**Điểm trừ.** Mica tắt hoặc khác trên Win10, remote desktop và một số driver; nền theo wallpaper nên tương phản không đoán trước; cần transparent window + fallback + QA; dễ thành glassmorphism nếu lạm dụng.
**Độ khó.** Cao — thêm `window-vibrancy`, xử lý fallback, kiểm tra trên nhiều cấu hình.

## Nguồn tham chiếu

- Spicetify Marketplace — https://spicetify.app/docs/customization/marketplace.html
- Linear, "How we redesigned the Linear UI" — https://linear.app/now/how-we-redesigned-the-linear-ui
- Raycast DESIGN.md — https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md
- Warp DESIGN.md — https://getdesign.md/warp/design-md
- Arc design system — https://open-design.ai/plugins/design-system-arc/
- Zen Browser, release notes — https://zen-browser.app/release-notes/
- shadcn/ui Card — https://ui.shadcn.com/docs/components/card
- Microsoft, Mica material — https://learn.microsoft.com/en-us/windows/apps/design/style/mica
- window-vibrancy — https://crates.io/crates/window-vibrancy
- WCAG 2.2, Focus Appearance — https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html

## Khuyến nghị

Chọn **B — Linear minimal**. Đây là hướng cân bằng nhất giữa cảm giác công cụ thật và khả năng triển khai: 13px, hairline, một CTA, tím chỉ dùng cho hành động và lựa chọn.
Nó cho phép light/dark bằng token, tiếng Việt dựa trên Segoe UI Variable nên không phụ thuộc font tải về, và chi phí code thấp (2/5).
A và C vẫn hữu ích: A nếu ưu tiên cảm giác "một phần của Spotify", C nếu người dùng là dev. E chỉ nên chọn sau khi có bộ test Mica trên cả Win10 và Win11.

## Bảng so sánh

Thang 1–5. Với "chi phí code", 1 = thấp, 5 = cao; với "light/dark", 5 = dễ.

| Hướng | Dễ đọc | Cá tính | Việt hoá | Light/dark | Chi phí code |
| --- | --- | --- | --- | --- | --- |
| A. Spotify-native | 5 | 3 | 5 | 1 | 1 |
| B. Linear minimal | 4 | 4 | 4 | 5 | 2 |
| C. Technical mono | 3 | 5 | 3 | 2 | 3 |
| D. Paper light | 5 | 4 | 5 | 2 | 2 |
| E. Mica / Vibrancy | 2 | 4 | 4 | 3 | 5 |
