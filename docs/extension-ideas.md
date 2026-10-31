# Ý tưởng mở rộng — Spotify Extension

Tài liệu này chỉ chứa ý tưởng, không phải đặc tả triển khai. Mọi ý tưởng đều giả định chạy trong payload hiện tại, dùng `window.SpotifyExtension`; không đọc token, không gọi API tài khoản, không can thiệp DRM hay luồng phát.
`RuntimeSettings` chỉ có 4 khóa boolean (`seekButtons`, `songToast`, `timeRemaining`, `updateCheck`), nên cấu hình riêng của từng extension phải nằm trong `localStorage` với tiền tố riêng. Panel trong Spotify không có API để thêm mục; UI mới phải tự chèn DOM + `css.add`.
Tham chiếu: Spicetify Marketplace (Extensions/Themes/Snippets) và các extension phổ biến sleep timer, bookmark, volume percentage, lyrics; snippet phổ biến ẩn Now Playing, compact sidebar. Không trùng 11 extension, 9 theme hay 2 snippet đang có.
Nguồn: [Marketplace](https://spicetify.app/docs/customization/marketplace.html) · [Extensions](https://spicetify.app/docs/customization/extensions.html).

## 1. Mười hai ý tưởng extension

### 1. Sleep Timer — Hẹn giờ ngủ
- **Làm gì:** Alt+T mở menu 5 mục (15/30/45/60 phút, Hết bài này) ngay trên thanh âm lượng; chọn xong hiện chip đếm ngược cạnh đồng hồ, 15 giây cuối hạ dần volume rồi pause và trả volume về mức cũ. Bấm chip để huỷ, Alt+T mở lại để đổi.
- **Giá trị:** Nghe để ngủ không cần với tay tắt máy; không bị cắt ngang giữa câu.
- **Độ khó:** M — menu + đếm ngược + fade, không cần dữ liệu mới; khoảng 2 ngày.
- **API:** `player.on("songchange" | "progress" | "playpause")`, `player.state()`, `player.setVolume()`, `player.getVolume()`, `player.pause()`, `keyboard.register()`, `toast()`, `css.add()`, `dom.observe()`.
- **Rủi ro:** Menu bám vào cụm volume nên Spotify đổi layout là lệch. Fade tạo event `volume` và có thể khiến Volume memory lưu 0 — phải đánh dấu fade nội bộ và khôi phục trước khi pause. Timer tính bằng `Date.now()` để không trôi khi máy sleep.

### 2. Resume Point — Lưu vị trí phát
- **Làm gì:** Với bài dài hơn 5 phút, cứ 5 giây lưu vị trí (chỉ khi đã qua 60 giây và còn hơn 30 giây); mở lại đúng URI đó, toast “Tiếp tục từ 18:42 — Alt+R”. Alt+R nhảy tới mốc, Alt+Shift+R xoá mốc; giữ 200 bài gần nhất, hết hạn sau 30 ngày.
- **Giá trị:** Podcast, audiobook, set DJ dài; không phải tua lại từ đầu hoặc nhớ thời điểm bằng tay.
- **Độ khó:** S — chỉ nghe event + `localStorage`, không chèn UI; khoảng nửa ngày.
- **API:** `player.on("songchange" | "progress")`, `player.state()`, `player.seek()`, `keyboard.register()`, `toast()`.
- **Rủi ro:** `progress` chỉ bắn khoảng 1,4 lần/giây (ticker 700 ms), ghi mỗi lần là lãng phí — throttle 5 giây. Seek có fallback bằng pointer nên có thể lệch nếu thanh tiến trình đang ẩn; kiểm tra giá trị trả về.

### 3. Lyric Line — Lời nhạc trên thanh phát
- **Làm gì:** Chèn một dòng lời đang hát ngay dưới tên bài trong `[data-testid="now-playing-widget"]`, mờ dần khi hết câu; rê chuột hiện dòng kế, Alt+Y bật/tắt. Bấm vào dòng lời mở rộng 3 dòng tại chỗ.
- **Giá trị:** Hát theo hoặc học ngoại ngữ mà không mở panel che thư viện; nhìn được lời khi đang làm việc khác.
- **Độ khó:** M — chèn DOM + đồng bộ lời; khoảng 3 ngày, lâu hơn nếu phải tự gọi LRCLIB.
- **API:** `player.on("progress" | "songchange")`, `player.state()`, `dom.observe()`, `css.add()`, `keyboard.register()`. **Cần thêm** `lyrics.current()` + `lyrics.onChange()` để dùng lại cache của panel; nếu không, extension tự gọi LRCLIB và phải ghi rõ trong README.
- **Rủi ro:** Widget render lại mỗi lần đổi bài, chèn sai là mất dòng. Thanh phát chỉ rộng khoảng 200 px cho phần chữ — phải ellipsis, không wrap. Tự fetch thì mỗi bài thành 2 request (panel + extension).

### 4. Timestamp Bookmarks — Đánh dấu mốc thời gian
- **Làm gì:** Alt+1..5 lưu mốc hiện tại của bài, một vạch 2 px xuất hiện trên progress bar; Alt+Shift+1..5 nhảy lại kèm toast “Đã lưu 12:34 • Alt+Shift+1”. Tối đa 5 mốc/bài, 500 bài.
- **Giá trị:** Đánh dấu đoạn solo, đoạn giảng hoặc chorus; podcast không cần ghi thời gian ra giấy.
- **Độ khó:** S — keyboard + seek + marker, không cần API mới; khoảng 1 ngày.
- **API:** `player.state()`, `player.seek()`, `keyboard.register()`, `toast()`, `dom.observe('[data-testid="playback-progressbar"]')`, `css.add()`.
- **Rủi ro:** Progress bar đổi kích thước khi mở sidebar; marker phải tính lại theo %. Đổi bài phải xoá marker cũ và observe lại. Seek fallback pointer có thể trượt nếu bề rộng bar bằng 0.

### 5. Volume Guard — Chặn âm lượng lớn
- **Làm gì:** Alt+Shift+V chọn trần 30/50/70/100%; volume vượt trần bị kéo về kèm toast “Trần 50% — giữ Alt để vượt”, giữ Alt khi kéo thanh volume để override 10 giây. Khung 22:00–07:00 tự hạ trần xuống 30%.
- **Giá trị:** Bảo vệ tai khi cắm tai nghe, tránh Spotify mở lại ở 100%; hữu ích cho máy dùng chung. Khác Volume memory (ghi nhớ) và Volume wheel (cuộn chuột): đây là giới hạn.
- **Độ khó:** S — một listener volume + clamp; khoảng nửa ngày.
- **API:** `player.on("volume")`, `player.getVolume()`, `player.setVolume()`, `keyboard.register()`, `toast()`; `localStorage`.
- **Rủi ro:** Người dùng kéo slider mà nó tự bật về sẽ thấy “hỏng” — phải có toast giải thích và override rõ. Chống vòng lặp bằng cách bỏ qua event do chính extension phát ra. Volume memory khôi phục mức cao hơn trần sẽ bị kẹp — đúng ý nhưng cần báo.

### 6. Focus Sessions — Phiên tập trung
- **Làm gì:** Alt+Shift+F bắt đầu phiên 25 phút: làm mờ sidebar/main (khác Focus mode hiện có ở chỗ chỉ mờ trong phiên và có timer), chip 25:00 ở góc phải; hết giờ tự pause và toast “Nghỉ 5 phút”. Hết 5 phút tự play lại nếu trước đó đang phát; Alt+Shift+F lần nữa kết thúc sớm.
- **Giá trị:** Pomodoro ngay trong Spotify, không cần app riêng; không quên nghỉ và không phải tự bấm pause.
- **Độ khó:** M — máy trạng thái + chip + khôi phục play; khoảng 2 ngày.
- **API:** `player.state()`, `player.play()`, `player.pause()`, `player.on("playpause")`, `keyboard.register()`, `toast()`, `css.add()`; `localStorage`.
- **Rủi ro:** Tranh chấp class với Focus mode nếu bật cả hai — dùng class riêng, không toggle class của extension kia. Máy sleep làm timer trôi — tính từ timestamp. Không auto-resume nếu người dùng tự pause trong giờ nghỉ.

### 7. Song Notes — Ghi chú bài hát
- **Làm gì:** Alt+N mở ô ghi chú 280×140 cho bài hiện tại; Ctrl+Enter lưu, Esc đóng, chấm 4 px cạnh tên bài báo hiệu đã có ghi chú. Alt+Shift+N chép ghi chú vào clipboard; lưu theo URI, tối đa 1.000 bài.
- **Giá trị:** Ghi lý do lưu bài, lời cần sửa, cue tập guitar; dữ liệu nằm trên máy, không gửi đi đâu.
- **Độ khó:** S — overlay + `localStorage`; khoảng 1 ngày.
- **API:** `player.track()`, `player.on("songchange")`, `keyboard.register()`, `toast()`, `dom.observe()`, `css.add()`; `navigator.clipboard`; `localStorage`.
- **Rủi ro:** Ô nhập phải giữ focus và Esc không được đóng nhầm; `keys.ts` bỏ qua input không có modifier nên gõ an toàn. Widget render lại làm mất chấm — observe lại. LocalStorage đầy thì bỏ ghi chú cũ nhất.

### 8. Hotkey Deck — Bàn phím tắt
- **Làm gì:** Alt+/ mở bảng 12 hành động (play/pause, next/prev, ±10 giây, ±30 giây, volume ±5, mute, sleep timer, note, bookmark, lyric); bấm vào tổ hợp hiện tại rồi nhấn tổ hợp mới để đổi. Xung đột hiện dòng hổ phách, nút Đặt lại đưa về mặc định; khác Quick keys ở chỗ phím do người dùng đổi.
- **Giá trị:** Không phải nhớ 11 phím Alt rải rác; đổi phím theo bàn phím hoặc layout.
- **Độ khó:** M — thu tổ hợp, kiểm tra trùng, đăng ký lại; khoảng 2–3 ngày.
- **API:** `keyboard.register()`, `player.*`, `css.add()`, `toast()`; `localStorage`.
- **Rủi ro:** `keys.ts` so khớp chính xác modifier và dừng ở binding đầu tiên — trùng phím thì extension đăng ký trước thắng, phải cảnh báo. Không chặn được phím hệ thống như Alt+F4 hoặc phím do WebView xử lý trước. Layout AZERTY gõ “z” khác “w”.

### 9. Theme by Clock — Theme theo giờ
- **Làm gì:** 07:00–17:00 dùng palette Day, 17:00–22:00 Dusk, 22:00–07:00 Night (gần đen). Mỗi phút kiểm tra giờ và inject 6 biến màu; Alt+Shift+C chọn Auto/Day/Dusk/Night/Off, toast “Theme Dusk • 18:00”.
- **Giá trị:** Ban ngày dễ đọc, ban đêm dịu mắt; không phải đổi theme bằng tay mỗi tối.
- **Độ khó:** S — chỉ `css.add` + kiểm tra mỗi 60 giây; khoảng nửa ngày.
- **API:** `css.add()`, `keyboard.register()`, `toast()`; `localStorage`.
- **Rủi ro:** Không đổi được file theme (không có API) — chỉ override 6 biến, nên các biến khác vẫn theo theme gốc. Thứ tự CSS: extension nạp sau theme nên thắng, nhưng dùng `:root:root` để chắc. Spotify đổi màu động theo ảnh bìa có thể ghi đè.

### 10. Mini Player — Mini player ghim
- **Làm gì:** Alt+P bật thẻ 300×104 ở góc trái trên thanh phát: bìa 56 px, tên bài/nghệ sĩ, play/pause, tua ±10 giây, nút đóng; kéo header để dời, vị trí được nhớ. Alt+P tắt; thẻ nằm trong cửa sổ Spotify, không phải always-on-top của Windows.
- **Giá trị:** Đang cuộn thư viện hoặc queue vẫn điều khiển được mà không phải nhìn xuống thanh phát; hữu ích khi cửa sổ nhỏ.
- **Độ khó:** L — drag, z-index, focus, render lại; khoảng 1 tuần.
- **API:** `player.state()`, `player.track()`, `player.on("songchange" | "playpause" | "progress")`, `player.play()`, `player.pause()`, `player.seek()`, `dom.observe()`, `css.add()`, `keyboard.register()`, `toast()`.
- **Rủi ro:** Che nội dung; đè lên FAB panel ở góc phải dưới nếu đặt sai — đặt trái dưới. Modal/queue của Spotify có z-index cao hơn có thể che thẻ. Không nổi trên cửa sổ khác nếu không thêm cửa sổ Tauri.

### 11. Per-device Volume — Âm lượng theo thiết bị
- **Làm gì:** Cắm tai nghe → tự đặt 32%, rút ra → loa 65%, Bluetooth → 45%, kèm toast “Tai nghe • 32%”. Mỗi thiết bị một mức, lưu theo tên/ID; thiết bị lạ dùng mức global (khác Volume memory: nhiều mức theo thiết bị, không phải một mức chung).
- **Giá trị:** Không bị blast tai khi chuyển từ loa sang tai nghe; hết cảnh chỉnh volume mỗi lần dock/undock.
- **Độ khó:** L — phải lấy được thiết bị ra; native + bridge; khoảng 2 tuần.
- **API:** `player.getVolume()`, `player.setVolume()`, `player.on("volume")`, `toast()`. **Cần thêm** `player.output()` trả `{id, name, kind}` và `player.on("outputchange")`, hoặc bridge Tauri đọc default endpoint qua WASAPI.
- **Rủi ro:** Không có API trình duyệt nào cho biết đang phát ra thiết bị nào; đoán theo `enumerateDevices` là không đáng tin. ID đổi sau driver update; Bluetooth hands-free xuất hiện thành 2 endpoint. Cần debounce 1–2 giây khi chuyển.

### 12. Album Context — Thẻ bối cảnh album
- **Làm gì:** Rê chuột lên tên album ở thanh phát → card 260 px: bìa, năm phát hành, nhãn, số bài, tổng thời lượng; nút “Mở album”. Dữ liệu lấy từ client nếu có, cache 24 giờ.
- **Giá trị:** Biết đang nghe album nào, năm nào, dài bao lâu; khám phá lại album cũ mà không mở tab trình duyệt.
- **Độ khó:** L — metadata + hover card + cache; khoảng 1–2 tuần.
- **API:** `player.track()`, `player.state()`, `dom.observe('[data-testid="now-playing-widget"]')`, `css.add()`, `toast()`. **Cần thêm** `catalog.album(uri)` trả `{uri, year, label, tracks, duration}` (đọc từ client), hoặc opt-in MusicBrainz (gửi tên bài/album/nghệ sĩ, ghi rõ trong README).
- **Rủi ro:** `TrackInfo` chỉ có tên/artist/album/artwork, không có năm/nhãn/album URI — không làm được nếu không thêm API. Hover card dễ bị cắt ở mép cửa sổ; MusicBrainz dễ ghép sai bản remaster; rate limit 1 request/giây.

## 2. Năm theme mới

Đo bằng WCAG 2.1; tất cả theme dưới đây có text/nền tối thiểu 7,3:1 và subtext/card tối thiểu 4,8:1. Mapping khi ghi file: Accent → `--text-bright-accent`; Background → `--background-base`; Sidebar → `--spice-sidebar`; Card → `--background-highlight`; Text → `--text-base`; Subtext → `--text-subdued`.

### Everforest — Rừng sâu
| Accent | Background | Sidebar | Card | Text | Subtext |
| --- | --- | --- | --- | --- | --- |
| `#a7c080` | `#2d353b` | `#232a2e` | `#343f44` | `#d3c6aa` | `#a6b0a0` |

**Cảm giác:** Xanh rêu ấm trên nền than xanh, chữ be như giấy cũ; như thư viện gỗ, không chói.
**Vì sao:** Chưa có theme xanh rêu; Gruvbox ngả cam/nâu, Nord ngả băng. Hợp phiên đọc/viết dài. **Tương phản:** text/nền 7,4:1 · subtext/card 4,8:1 · accent/nền 6,2:1.

### Kanagawa — Sóng mực
| Accent | Background | Sidebar | Card | Text | Subtext |
| --- | --- | --- | --- | --- | --- |
| `#7e9cd8` | `#1f1f28` | `#16161d` | `#2a2a37` | `#dcd7ba` | `#a6a69c` |

**Cảm giác:** Indigo mực với chữ washi vàng nhạt; tĩnh, cổ điển, như tranh sóng.
**Vì sao:** Chưa có cặp indigo + beige; TokyoNight là xanh neon trên tím than, Nord là xám băng. Bổ sung sắc lạnh trầm. **Tương phản:** text/nền 11,3:1 · subtext/card 5,8:1 · accent/nền 5,9:1.

### Ayu Mirage — Hổ phách
| Accent | Background | Sidebar | Card | Text | Subtext |
| --- | --- | --- | --- | --- | --- |
| `#ffcc66` | `#1f2430` | `#171b24` | `#242936` | `#cbccc6` | `#9aa0a8` |

**Cảm giác:** Than xanh đậm với điểm nhấn hổ phách; ấm ở accent, lạnh ở nền, dịu mắt.
**Vì sao:** Chưa có amber trên charcoal lạnh; Gruvbox ấm toàn phần, Solarized ngả teal. Hợp buổi tối. **Tương phản:** text/nền 9,6:1 · subtext/card 5,5:1 · accent/nền 10,4:1.

### Tide — Thuỷ triều
| Accent | Background | Sidebar | Card | Text | Subtext |
| --- | --- | --- | --- | --- | --- |
| `#5eead4` | `#0b1a1f` | `#071216` | `#12262c` | `#e6f1f2` | `#a3b8ba` |

**Cảm giác:** Teal biển sâu trên nền gần đen, chữ trắng xanh; sạch, tập trung, hơi lạnh.
**Vì sao:** Chưa có teal; Amoled là đen + xanh Spotify, TokyoNight là tím/xanh dương. Accent đủ sáng để dùng cho trạng thái. **Tương phản:** text/nền 15,4:1 · subtext/card 7,6:1 · accent/nền 12,0:1.

### Paper — Giấy ấm
| Accent | Background | Sidebar | Card | Text | Subtext |
| --- | --- | --- | --- | --- | --- |
| `#096c33` | `#f4f1ea` | `#e8e3d8` | `#ffffff` | `#1a1a1a` | `#4a4a45` |

**Cảm giác:** Giấy ấm ban ngày, mực đen, accent xanh rêu; như tài liệu in, không phải app đêm.
**Vì sao:** Cả 9 theme hiện tại đều tối; Paper lấp khoảng trống cho người dùng ban ngày/ánh sáng mạnh. Cần kiểm tra các bề mặt hardcode tối của Spotify. **Tương phản:** text/nền 15,4:1 · subtext/card 8,9:1 · accent/nền 5,8:1.

## 3. Bốn snippet CSS mới

Không trùng `hide-window-controls` và `rounded-covers` đang có.

### Flat Player Bar — Thanh phát phẳng
**Mục đích:** Bỏ nền gradient/blur và bóng của now-playing bar, chỉ giữ 1 px viền trên; thanh phát liền một khối với nội dung, cover vuông 48 px.
**Kỹ thuật:** Nhắm `[data-testid="now-playing-bar"]` và `.Root__now-playing-bar`; đặt `background: var(--background-base)`, `box-shadow: none`, `backdrop-filter: none`, `border-top: 1px solid`; không đổi `height` để tránh lệch layout.
**Rủi ro:** Spotify đổi testid/chiều cao; nếu thanh phát dùng ảnh nền động thì phải thêm `background-image: none`.

### Compact Sidebar — Sidebar gọn
**Mục đích:** Thu sidebar từ khoảng 280 px xuống 180 px, hàng 32 px, nhãn 12 px; vẫn giữ icon và playlist, chỉ bớt khoảng trống.
**Kỹ thuật:** Đặt `--left-sidebar-width: 180px` trên `.Root__nav-bar` và `[data-testid="left-sidebar"]`, giảm padding row và `font-size`; không dùng `display: none` (Hide sidebar đã làm việc đó).
**Rủi ro:** Spotify có thể đặt width inline bằng JS; cần `!important` và kiểm tra ở cửa sổ 1000×700; tên playlist dài bị cắt nhiều hơn.

### Hide Share Buttons — Ẩn nút chia sẻ
**Mục đích:** Ẩn nút Share và menu “…” ở now-playing widget và hàng track để tránh bấm nhầm; giữ Like, Queue và Lyrics.
**Kỹ thuật:** Nhắm `[data-testid="now-playing-widget"] button[aria-label*="Share"]`, biến thể “Chia sẻ”, và `[data-testid="more-button"]`; chỉ scope trong widget/hàng, không ẩn toàn bộ `[role="button"]`.
**Rủi ro:** `aria-label` đổi theo ngôn ngữ; ẩn menu “…” có thể mất đường vào “Go to artist” — chỉ ẩn ở now-playing, không ẩn tracklist.

### Strong Focus Ring — Viền focus rõ
**Mục đích:** Tăng viền focus lên 2 px accent, offset 2 px cho link/button/card/sidebar; chỉ hiện khi điều hướng bằng bàn phím, không đổi giao diện khi dùng chuột.
**Kỹ thuật:** `:where(a, button, [role="button"], [tabindex]):focus-visible` với `outline: 2px solid var(--text-bright-accent)`; dùng `:focus-visible`, không dùng `:focus`; đặt `outline-offset: -2px` cho container `overflow: hidden`.
**Rủi ro:** Một số component Spotify có outline mặc định; cần `!important` và kiểm tra không bị cắt; không ảnh hưởng hiệu năng.

## 4. Bảng ưu tiên

Điểm = Giá trị ÷ Công sức. Giá trị 1–5 (độ hữu ích với người dùng), công sức 1–5 (1 = vài giờ, 5 = nhiều tuần); khi điểm bằng thì xếp theo giá trị giảm dần. Theme và snippet là nội dung nên điểm thấp hơn theo thiết kế, không phải vì kém chất lượng.

| # | Ý tưởng | Loại | Giá trị | Công sức | Điểm |
| --- | --- | --- | --- | --- | --- |
| 1 | Volume Guard | Extension | 4 | 1 | 4,00 |
| 2 | Theme by Clock | Extension | 3 | 1 | 3,00 |
| 3 | Sleep Timer | Extension | 5 | 2 | 2,50 |
| 4 | Resume Point | Extension | 4 | 2 | 2,00 |
| 5 | Timestamp Bookmarks | Extension | 4 | 2 | 2,00 |
| 6 | Compact Sidebar | Snippet | 2 | 1 | 2,00 |
| 7 | Flat Player Bar | Snippet | 2 | 1 | 2,00 |
| 8 | Hide Share Buttons | Snippet | 2 | 1 | 2,00 |
| 9 | Everforest | Theme | 2 | 1 | 2,00 |
| 10 | Kanagawa | Theme | 2 | 1 | 2,00 |
| 11 | Ayu Mirage | Theme | 2 | 1 | 2,00 |
| 12 | Tide | Theme | 2 | 1 | 2,00 |
| 13 | Lyric Line | Extension | 5 | 3 | 1,67 |
| 14 | Paper | Theme | 3 | 2 | 1,50 |
| 15 | Song Notes | Extension | 3 | 2 | 1,50 |
| 16 | Focus Sessions | Extension | 4 | 3 | 1,33 |
| 17 | Mini Player | Extension | 4 | 4 | 1,00 |
| 18 | Hotkey Deck | Extension | 3 | 3 | 1,00 |
| 19 | Strong Focus Ring | Snippet | 1 | 1 | 1,00 |
| 20 | Per-device Volume | Extension | 4 | 5 | 0,80 |
| 21 | Album Context | Extension | 3 | 4 | 0,75 |

### Năm cái nên làm trước
1. **Volume Guard (4,00):** nửa ngày, chặn một rủi ro thật (tai nghe bị blast), đồng thời là bài test tốt cho vòng event `volume` và chống feedback.
2. **Theme by Clock (3,00):** chỉ CSS + một interval, gần như không rủi ro; chứng minh `css.add` phủ được biến theme trước khi làm các extension nặng hơn.
3. **Sleep Timer (2,50):** nhu cầu cao nhất trong danh sách; làm sau Volume Guard để dùng lại logic `getVolume`/`setVolume` và cách khôi phục volume sau fade.
4. **Resume Point (2,00):** giá trị rõ cho podcast/audiobook, chỉ event + `localStorage`, không UI; đo được ngay bằng việc mở lại một tập dài.
5. **Timestamp Bookmarks (2,00):** cùng hạ tầng player event/seek với Resume Point; làm cùng đợt để chia sẻ helper lưu trữ, throttle và kiểm tra seek.

Lyric Line (1,67) bị hoãn đến khi có `lyrics` API; nếu tự gọi LRCLIB thì công sức tăng và trùng request với panel. BPM/crossfade và thông báo nhạc mới chưa đưa vào vì thiếu BPM/queue/catalog API, không phải vì vi phạm điều khoản.

## 5. Đã cân nhắc và loại

- **Premium Unlock / chặn quảng cáo ở tầng âm thanh:** can thiệp DRM và luồng phát, vi phạm điều khoản; Adblock hiện tại chỉ ẩn slot UI, giữ nguyên luồng phát.
- **Đọc token/cookie để gọi Web API:** lấy credential của người dùng, mở đường cho thao tác tài khoản và rò rỉ dữ liệu; vi phạm điều khoản và quyền riêng tư.
- **Bot tự follow/like/play, farm lượt nghe:** tạo tương tác giả, vi phạm điều khoản, hại nghệ sĩ và làm hỏng dữ liệu; mọi cơ chế né phát hiện đều nằm ngoài phạm vi.
- **Tải nhạc / trích xuất cache offline:** vượt DRM và điều khoản nội dung; không có cách làm sạch.
- **Đồng bộ thống kê nghe lên server không hỏi:** gửi lịch sử nghe ra ngoài khi chưa đồng ý là vi phạm riêng tư; nếu làm, chỉ lưu cục bộ và xuất file khi người dùng bấm.
