# Design spec — Spotify Extension
Cửa sổ 1000×700 · Tauri 2 / WebView2 · Windows 10/11 · Nguồn: `ui/index.html`, `ui/styles.css`, `ui/app.js`.
## 1. Định hướng

Giao diện là một công cụ, không phải landing page: mở lên là thấy Spotify đang ở đâu và việc cần làm.
Tối, phẳng, điềm tĩnh; tương phản đủ cao để đọc lâu mà không mỏi mắt.
Xanh Spotify chỉ dành cho hành động chính và trạng thái "đã vá"; phần còn lại là thang xám pha rất nhẹ xanh.
Nhịp điệu chặt: nhãn 11–13px, hàng 52px, khoảng cách 4–24px, không khối trang trí.
Chuyển động 120–180ms và chỉ để xác nhận trạng thái, không để gây chú ý.
Cảm giác cuối: yên tĩnh, chính xác, giống bảng điều khiển của một công cụ.

Ba điều cấm kỵ:
1. Không dùng màu accent cho thứ không phải hành động chính.
2. Không thêm khối, ảnh, icon hay câu chữ chỉ để "cho đẹp".
3. Không bắt người dùng đoán: mỗi vùng một hành động chính, nhãn nói rõ việc sẽ xảy ra.
## 2. Design tokens

Dán khối sau vào đầu `ui/styles.css`; component chỉ dùng token, không viết hex rời.

```css
:root {
  color-scheme:dark;
  /* Nền */ --bg:#0b0d0c; --surface:#131615; --surface-2:#1b1f1d; --surface-3:#242926;
  --line:#272c29; --line-strong:#3d453f;
  /* Chữ */ --text:#e8ece9; --text-dim:#9aa39d; --text-faint:#7f8983;
  /* Nhấn + trạng thái */ --accent:#1ed760; --accent-hover:#3ae075; --accent-press:#19c157;
  --accent-soft:#14271c; --accent-ink:#04140a;
  --danger:#ff6b6b; --danger-soft:#2a1719; --danger-line:#5c2b2e;
  --warn:#f5c451; --warn-soft:#2a2314;
  /* Bo góc */ --r-sm:6px; --r-md:10px; --r-lg:14px; --r-full:999px;
  /* Khoảng cách */ --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px; --sp-8:32px;
  /* Bóng */ --shadow-1:0 1px 2px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.03);
  --shadow-2:0 8px 24px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.04);
  /* Chuyển động */ --dur-1:120ms; --dur-2:180ms; --ease:cubic-bezier(.2,0,0,1);
  /* Chữ */ --font-ui:"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
  --font-mono:"Cascadia Mono",Consolas,monospace;
  --fs-11:11px; --fs-12:12px; --fs-13:13px; --fs-15:15px; --fs-20:20px;
  --fw-400:400; --fw-500:500; --fw-600:600;
  --tracking-caps:.06em; --lh-body:1.45; --lh-tight:1.2;
  /* Layout */ --sidebar-w:220px; --header-h:56px; --content-max:760px;
  --page-pad:24px; --control-h:32px; --row-h:52px;
}
```

Type scale: `11/16` 600 + tracking `.06em` cho nhãn caps, chip, version · `12/17` 400 cho mô tả, label · `13/20` 400, nav và nút 500 · `15/20` 600 cho tiêu đề trang/card · `20/26` 600 chỉ cho một giá trị số (version Spotify ở Tổng quan). Không dùng 20px cho tiêu đề.

Độ tương phản đã đo theo WCAG: text/surface 15.3:1 · dim/surface 7.0:1 · faint/surface 5.0:1 · ink/accent 9.9:1 · danger/danger-soft 6.1:1 · warn/warn-soft 9.6:1 — đạt AA. `--text-faint` chỉ đặt trên `--bg`, `--surface`, `--surface-2`; trên `--surface-3` dùng `--text-dim` (faint chỉ còn cho chữ disabled, vốn được miễn).

Nền tảng: `*{box-sizing:border-box}`; `body{margin:0;height:100%;background:var(--bg);color:var(--text);font:var(--fw-400) var(--fs-13)/var(--lh-body) var(--font-ui)}`; mọi control có `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`; tôn trọng `prefers-reduced-motion` (duration 0).
## 3. Bố cục cửa sổ

```text
┌──────────────────────────────────────────────────────────────┐
│ ┌─────────────┬────────────────────────────────────────────┐ │
│ │ Brand   56  │ Topbar 56                    [Làm mới]     │ │
│ │             ├────────────────────────────────────────────┤ │
│ │ ▍Tổng quan  │  .page  max-width 760 · padding 24         │ │
│ │  Module     │  ┌──────────────────────────────────────┐  │ │
│ │  Giao diện  │  │ Card · surface · line · r-lg · p16   │  │ │
│ │  Công cụ    │  └──────────────────────────────────────┘  │ │
│ │             │                                            │ │
│ │ v0.0.1      │                                            │ │
│ └─────────────┴────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

```css
.app{display:grid;grid-template-columns:var(--sidebar-w) minmax(0,1fr);height:100vh}
.sidebar{display:flex;flex-direction:column;padding:0 var(--sp-3);border-right:1px solid var(--line);background:var(--bg)}.nav{display:flex;flex-direction:column;gap:2px;padding-top:var(--sp-2)}.sidebar-foot{margin-top:auto;padding:var(--sp-3) 2px var(--sp-4);font-size:var(--fs-11);color:var(--text-faint)}
.main{min-width:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--surface-3) transparent}
.topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:var(--sp-2);height:var(--header-h);padding:0 max(var(--page-pad),calc((100% - var(--content-max)) / 2 + var(--page-pad)));background:var(--bg);border-bottom:1px solid var(--line)}.page-title{margin:0;font-size:var(--fs-15);font-weight:var(--fw-600);line-height:var(--lh-tight)}.topbar-actions{margin-left:auto;display:flex;gap:var(--sp-2)}
.page{max-width:var(--content-max);margin:0 auto;padding:var(--page-pad) var(--page-pad) var(--sp-8)}
```

- Sidebar 220px cố định, không thu gọn; cửa sổ nhỏ nhất 880px vẫn đủ 612px nội dung; nav xếp dọc gap 2, cách brand 8.
- Brand cao 56px bằng topbar; footer version dùng `margin-top:auto`; brand: ô 22px radius 6 nền accent, 3 thanh dọc `--accent-ink` (cao 8/14/10, rộng 3, rx 1.5), wordmark 13/600.
- Giữ title bar Windows mặc định (decorations true); topbar 56px nằm trong client area, nền đặc `--bg`, không blur; tiêu đề 15/600, không có dòng phụ dưới tiêu đề.
- Content một cột, max 760px (gồm padding), canh giữa; cách khối 24px, trong card 16px.
- Điều hướng hash `#/overview`, `#/modules`, `#/appearance`, `#/tools`; đổi view tức thì, không animation chuyển trang.
- Scrollbar mảnh, thumb `--surface-3`, track trong suốt; không ẩn scrollbar.
## 4. Component

Quy ước chung: icon SVG stroke 1.5, 18px (16px trong nút), `currentColor`, `fill:none`; không emoji, không icon font. Vùng bấm ≥32×32 (nav 34, input 34, switch có hit 44×32). Focus ring 2px `--accent`, offset 2; trong vùng `overflow:hidden` dùng offset −2. Hover chỉ đổi nền/viền, không đổi kích thước.
```css
.ico{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
```
### 4.1 Nav item
Cao 34px, padding 0 10px, radius md, gap 10, icon 18, nhãn 13/500. Default chữ `--text-dim`; hover nền `--surface-2`, chữ `--text`; đang chọn nền `--surface-2` + vạch accent 2×16 bên trái; focus ring offset −2; disabled `--text-faint`, không phản hồi.
```css
.nav-item{position:relative;display:flex;align-items:center;gap:10px;height:34px;padding:0 10px;border-radius:var(--r-md);color:var(--text-dim);font-size:var(--fs-13);font-weight:var(--fw-500);transition:background-color var(--dur-1) var(--ease),color var(--dur-1) var(--ease)}
.nav-item:hover{background:var(--surface-2);color:var(--text)}
.nav-item[aria-current="page"]{background:var(--surface-2);color:var(--text)}
.nav-item[aria-current="page"]::before{content:"";position:absolute;left:0;top:9px;width:2px;height:16px;border-radius:2px;background:var(--accent)}
.nav-item:focus-visible{outline-offset:-2px}
.nav-item[aria-disabled="true"]{color:var(--text-faint);pointer-events:none}
```
```html
<a class="nav-item" href="#/overview" aria-current="page">
  <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
  <span>Tổng quan</span>
</a>
<a class="nav-item" href="#/modules">
  <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>
  <span>Module</span>
</a>
```
Nav còn lại: Giao diện = vòng tròn + 3 chấm; Công cụ = cờ lê.
### 4.2 Button
Cao 32px, padding 0 12px, radius md, gap 6, 13/500. Primary: nền accent, chữ `--accent-ink`; hover `--accent-hover`; active `--accent-press`. Secondary: nền `--surface-2`, viền `--line`; hover/active `--surface-3`. Ghost: trong suốt, chữ dim; hover `--surface-2`. Danger: trong suốt, viền `--danger-line`, chữ danger; hover `--danger-soft`. Disabled: nền `--surface-2`, chữ/viền mờ, cursor not-allowed, không đổi khi hover. Icon-only 32×32.
```css
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:var(--control-h);padding:0 12px;border:1px solid transparent;border-radius:var(--r-md);font-size:var(--fs-13);font-weight:var(--fw-500);line-height:1;white-space:nowrap;cursor:pointer;transition:background-color var(--dur-1) var(--ease),border-color var(--dur-1) var(--ease),color var(--dur-1) var(--ease)}
.btn-primary{background:var(--accent);color:var(--accent-ink)}
.btn-primary:hover:not(:disabled){background:var(--accent-hover)}
.btn-primary:active:not(:disabled){background:var(--accent-press)}
.btn-secondary{background:var(--surface-2);border-color:var(--line);color:var(--text)}
.btn-secondary:hover:not(:disabled),.btn-ghost:hover:not(:disabled){background:var(--surface-3);color:var(--text)}
.btn-ghost{background:transparent;color:var(--text-dim)}.btn-secondary:active:not(:disabled),.btn-ghost:active:not(:disabled){background:var(--bg)}
.btn-danger{background:transparent;border-color:var(--danger-line);color:var(--danger)}
.btn-danger:hover:not(:disabled){background:var(--danger-soft)}
.btn:disabled{background:var(--surface-2);border-color:var(--line);color:var(--text-faint);cursor:not-allowed}
.btn-icon{width:var(--control-h);padding:0}.btn .ico{width:16px;height:16px}
```
```html
<div class="row-actions">
  <button class="btn btn-primary" type="button">Áp dụng</button>
  <button class="btn btn-secondary" type="button">Sao lưu</button>
  <button class="btn btn-ghost" type="button">Mở thư mục</button>
  <button class="btn btn-danger" type="button">Gỡ</button>
  <button class="btn btn-primary" type="button" disabled>Đang áp dụng…</button>
</div>
```
### 4.3 Card
Nền surface, viền 1px line, radius lg, padding 16, shadow-1. Header flex, title 15/600, chip bên phải; thân cách header 12. Chỉ card bấm được mới có hover (viền `--line-strong`); focus-visible dùng ring chung; không có trạng thái disabled.
```css
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:var(--sp-4);box-shadow:var(--shadow-1)}
.card-head{display:flex;align-items:center;justify-content:space-between;gap:var(--sp-3);margin-bottom:var(--sp-3)}
.card-title{margin:0;font-size:var(--fs-15);font-weight:var(--fw-600);line-height:var(--lh-tight)}
.card.is-clickable:hover{border-color:var(--line-strong)}
```
```html
<section class="card" aria-labelledby="install-title">
  <div class="card-head">
    <h2 class="card-title" id="install-title">Spotify</h2>
    <span class="chip chip-patched">Đã vá</span>
  </div>
  <p class="card-line mono">C:\Users\…\AppData\Roaming\Spotify</p>
</section>
```
### 4.4 State chip
Cao 22px, padding 0 8px, radius full, 11/600, chấm 6px cùng màu chữ. Bốn biến thể: stock = nền `--surface-2`, chữ `--text-dim`; patched = `--accent-soft` / `--accent`; partial = `--warn-soft` / `--warn`; foreign = `--danger-soft` / `--danger`. Chip tĩnh: không hover, active, focus, disabled. "unsupported" dùng biến thể foreign.
```css
.chip{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:var(--r-full);font-size:var(--fs-11);font-weight:var(--fw-600);letter-spacing:.02em;white-space:nowrap}
.chip::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.chip-stock{background:var(--surface-2);color:var(--text-dim)}
.chip-patched{background:var(--accent-soft);color:var(--accent)}
.chip-partial{background:var(--warn-soft);color:var(--warn)}
.chip-foreign{background:var(--danger-soft);color:var(--danger)}
.chip-row{display:flex;flex-wrap:wrap;gap:var(--sp-2)}
```
```html
<div class="chip-row">
  <span class="chip chip-stock">Nguyên bản</span>
  <span class="chip chip-patched">Đã vá</span>
  <span class="chip chip-partial">Vá dở</span>
  <span class="chip chip-foreign">Công cụ khác</span>
</div>
```
### 4.5 Toggle switch
Track 32×18, radius full, viền `--line-strong`; tắt nền `--surface-3`, bật nền accent. Knob trắng 12px, inset 2px, dịch 14px khi bật; transition 120ms. Hit area 44×32 bằng `::before` trong suốt. Hover đổi viền sang `--text-faint`; active thu knob còn 10px; focus ring 2px; disabled nền surface-2, knob `--text-faint`, không phản hồi.
```css
.switch{position:relative;flex:none;width:32px;height:18px;padding:0;border:1px solid var(--line-strong);border-radius:var(--r-full);background:var(--surface-3);cursor:pointer;transition:background-color var(--dur-1) var(--ease),border-color var(--dur-1) var(--ease)}
.switch::before{content:"";position:absolute;inset:-7px -6px}
.switch .knob{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:transform var(--dur-1) var(--ease)}
.switch:hover:not(:disabled){border-color:var(--text-faint)}
.switch[aria-checked="true"]{background:var(--accent);border-color:var(--accent)}
.switch[aria-checked="true"] .knob{transform:translateX(14px)}
.switch:disabled{background:var(--surface-2);border-color:var(--line);cursor:not-allowed}
.switch:disabled .knob{background:var(--text-faint)}
.switch-row{display:flex;align-items:center;justify-content:space-between;gap:var(--sp-3);min-height:var(--control-h);font-size:var(--fs-13);color:var(--text)}
```
```html
<div class="switch-row">
  <span id="safe-label">Chế độ an toàn</span>
  <button class="switch" type="button" role="switch" aria-checked="true" aria-labelledby="safe-label">
    <span class="knob"></span>
  </button>
</div>
```
### 4.6 List row
Cao 52px, padding 8px 12px, grid `18px 1fr auto auto`, gap 12, viền dưới line. Default nền trong suốt; hover `--surface-2`; active `--surface-3`; focus-within `--surface-2`; disabled chữ faint, action disabled. Tên 13/500 + tag 11; mô tả 12 dim, một dòng, ellipsis; version 11 mono faint; action bên phải. Không bấm cả hàng nếu hàng không có hành động.
```css
.row{display:grid;grid-template-columns:18px minmax(0,1fr) auto auto;align-items:center;gap:var(--sp-3);min-height:var(--row-h);padding:8px 12px;border-bottom:1px solid var(--line);transition:background-color var(--dur-1) var(--ease)}
.row:hover,.row:focus-within{background:var(--surface-2)}.row:active{background:var(--surface-3)}.row:active .row-meta,.row:active .tag{color:var(--text-dim)}
.row-main{min-width:0}
.row-title{display:flex;align-items:center;gap:var(--sp-1);font-size:var(--fs-13);font-weight:var(--fw-500);line-height:18px}
.row-desc{margin:0;color:var(--text-dim);font-size:var(--fs-12);line-height:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row-meta{color:var(--text-faint);font:var(--fs-11)/1 var(--font-mono)}.row-actions{display:flex;align-items:center;gap:var(--sp-2)}
.tag{height:18px;padding:0 6px;border:1px solid var(--line);border-radius:var(--r-full);font-size:var(--fs-11);color:var(--text-faint)}
```
```html
<div class="row">
  <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>
  <div class="row-main">
    <div class="row-title">Adblock <span class="tag">Tiện ích</span></div>
    <p class="row-desc">Ẩn quảng cáo và thẻ được tài trợ.</p>
  </div>
  <span class="row-meta">1.0.0</span>
  <div class="row-actions"><button class="switch" type="button" role="switch" aria-checked="true" aria-label="Adblock"><span class="knob"></span></button></div>
</div>
```
### 4.7 Theme card
Grid `repeat(auto-fill,minmax(184px,1fr))`, gap 12. Card padding 8, radius lg, nền surface, viền line; preview cao 48px, radius sm, dựng từ 4 biến `--t-bg`, `--t-side`, `--t-card`, `--t-accent` (không gradient); tên 13/500; nhãn "Đang dùng" 11 accent, chỉ hiện khi `aria-pressed="true"`. Default/hover (viền line-strong) / active (`--surface-2`) / selected (viền accent) / focus ring / disabled (không pointer) / applying (`aria-busy`, viền accent, chữ "Đang áp dụng…").
```css
.theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(184px,1fr));gap:var(--sp-3)}
.theme-card{display:flex;flex-direction:column;gap:var(--sp-2);padding:8px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);text-align:left;cursor:pointer;transition:background-color var(--dur-1) var(--ease),border-color var(--dur-1) var(--ease)}
.theme-card:hover{background:var(--surface-2);border-color:var(--line-strong)}
.theme-card[aria-pressed="true"]{border-color:var(--accent)}
.theme-preview{position:relative;height:48px;border-radius:var(--r-sm);background:var(--t-bg);overflow:hidden;border:1px solid rgba(255,255,255,.06)}
.theme-preview::before{content:"";position:absolute;inset:0 68% 0 0;background:var(--t-side)}
.theme-preview::after{content:"";position:absolute;left:38%;right:8px;top:9px;bottom:9px;border-radius:4px;background:var(--t-card)}
.theme-dot{position:absolute;left:43%;top:15px;width:8px;height:8px;border-radius:50%;background:var(--t-accent)}
.theme-foot{display:flex;align-items:center;justify-content:space-between;gap:var(--sp-2);font-size:var(--fs-13);font-weight:var(--fw-500)}
.theme-active{display:none;font-size:var(--fs-11);font-weight:var(--fw-600);color:var(--accent)}
.theme-card[aria-pressed="true"] .theme-active{display:inline}
.theme-card[aria-busy="true"]{border-color:var(--accent);cursor:progress}.theme-card:disabled{color:var(--text-faint);cursor:not-allowed}
```
```html
<button class="theme-card" type="button" aria-pressed="true">
  <span class="theme-preview" style="--t-bg:#121212;--t-side:#000000;--t-card:#1f1f1f;--t-accent:#1ed760">
    <span class="theme-dot"></span>
  </span>
  <span class="theme-foot"><span>Soft</span><span class="theme-active">Đang dùng</span></span>
</button>
```
### 4.8 Empty state
Khối giữa, padding 32 16, gap 12, max-width 320; icon line 28px `--text-faint`; một dòng 13 `--text-dim`; một nút secondary 32. Không viền, không minh hoạ, không dòng phụ. Tĩnh, không trạng thái hover/focus riêng (nút bên trong giữ chuẩn).
```css
.empty{display:flex;flex-direction:column;align-items:center;gap:var(--sp-3);max-width:320px;margin:0 auto;padding:var(--sp-8) var(--sp-4);text-align:center}
.empty svg{width:28px;height:28px;color:var(--text-faint);stroke:currentColor;fill:none;stroke-width:1.5}
.empty p{margin:0;color:var(--text-dim);font-size:var(--fs-13)}
```
```html
<div class="empty">
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  <p>Không tìm thấy Spotify.</p>
  <button class="btn btn-secondary" type="button">Chọn thư mục</button>
</div>
```
### 4.9 Toast
Cố định góc dưới phải 16px, rộng tối đa 340, xếp tối đa 3, gap 8; nền `--surface-2`, viền line, viền trái 2px accent (ok) hoặc danger (lỗi), radius md, padding 10 12, shadow-2, 13/400. Vào 180ms trượt 4px; tự ẩn sau 3500ms (exit 120ms); hover/focus tạm dừng; bấm để đóng. `role="status"` để trình đọc màn hình đọc.
```css
.toasts{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;flex-direction:column;gap:var(--sp-2)}
.toast{width:min(340px,calc(100vw - 32px));padding:10px 12px;background:var(--surface-2);border:1px solid var(--line);border-left:2px solid var(--accent);border-radius:var(--r-md);box-shadow:var(--shadow-2);font-size:var(--fs-13);color:var(--text);animation:toast-in var(--dur-2) var(--ease)}
.toast[data-tone="error"]{border-left-color:var(--danger)}
.toast.is-out{opacity:0;transform:translateY(4px);transition:opacity var(--dur-1) var(--ease),transform var(--dur-1) var(--ease)}
@keyframes toast-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
```
```html
<div class="toasts">
  <div class="toast" role="status" data-tone="ok">
    Đã áp dụng. Khởi động lại Spotify.
  </div>
  <div class="toast" role="status" data-tone="error">
    Không đọc được bản sao lưu.
  </div>
</div>
```
### 4.10 Form field
Label 12/500 dim, cách input 6. Input cao 34, nền `--bg`, viền `--line-strong`, radius sm, padding 0 10, 13; placeholder faint. Hover viền `--text-faint`; focus viền accent + ring 2px accent offset 1 (giữ ring cả khi bấm chuột để biết đang gõ); disabled nền surface-2, chữ faint; lỗi viền danger + dòng 12 danger. Input readonly vẫn đọc được, có nút chép 32 bên cạnh.
```css
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:var(--fs-12);font-weight:var(--fw-500);color:var(--text-dim)}
.input{width:100%;height:34px;padding:0 10px;background:var(--bg);border:1px solid var(--line-strong);border-radius:var(--r-sm);color:var(--text);font-size:var(--fs-13);transition:border-color var(--dur-1) var(--ease)}
.input::placeholder{color:var(--text-faint)}
.input:hover:not(:disabled){border-color:var(--text-faint)}
.input:focus{border-color:var(--accent);outline:2px solid var(--accent);outline-offset:1px}
.input:disabled{background:var(--surface-2);color:var(--text-faint);cursor:not-allowed}
.field.is-error .input{border-color:var(--danger)}
.field-error{margin:0;font-size:var(--fs-12);color:var(--danger)}
.input-row{display:flex;gap:var(--sp-2)}
.input-row .input{flex:1;min-width:0}
.color-control{display:flex;align-items:center;gap:var(--sp-2);height:34px;padding:0 10px;background:var(--bg);border:1px solid var(--line-strong);border-radius:var(--r-sm)}
.color-control:focus-within{border-color:var(--accent);outline:2px solid var(--accent);outline-offset:1px}.color-control .input{height:28px;border:0;background:transparent;padding:0;font-family:var(--font-mono);font-size:var(--fs-12)}
.swatch{position:relative;display:grid;place-items:center;width:32px;height:32px;flex:none;cursor:pointer}
.swatch::before{content:"";width:20px;height:20px;border-radius:4px;background:var(--c);border:1px solid var(--line-strong)}
.swatch input{position:absolute;inset:0;opacity:0;cursor:pointer}
```
```html
<div class="field">
  <label for="spotify-path">Đường dẫn Spotify</label>
  <div class="input-row">
    <input class="input mono" id="spotify-path" value="C:\Users\…\Spotify" readonly>
    <button class="btn btn-ghost btn-icon" type="button" aria-label="Chép đường dẫn">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
    </button>
  </div>
</div>
```
## 5. Đặc tả bốn trang
### 5.1 Tổng quan

**Mục đích:** biết bản cài đang ở trạng thái nào và xử lý trong một màn.
**Khối, từ trên xuống:**
1. Topbar: tiêu đề "Tổng quan"; phải là nút icon "Làm mới" 32px (aria-label "Làm mới").
2. Cảnh báo (nếu có, tối đa 2, cách 8px): Spotify đang chạy → nền warn-soft "Thay đổi chỉ có hiệu lực sau khi khởi động lại." + ghost "Khởi động lại"; safe mode bật → cùng kiểu "Chế độ an toàn đang bật." + ghost "Tắt" (lưu + áp dụng).
3. Chọn bản cài (chỉ khi >1 bản): field select 34px class `input`, nhãn "Bản cài", giá trị `name · version · arch`; đổi bản thì tải lại thẻ bên dưới.
4. Thẻ trạng thái: header "Spotify" 15/600 + chip trạng thái; dòng đường dẫn mono 12 (ellipsis, `title` đầy đủ) + nút chép 32; lưới 2 cột: Phiên bản (20/600), Kiến trúc, Kênh, Vá bởi; dòng "Bản sao lưu" + `30/10/2026 · 14:22` hoặc "Chưa có".
5. Hàng nút: Áp dụng (primary) · Khôi phục (secondary) · Sao lưu (secondary) · Khởi động lại (ghost) · Mở thư mục (ghost); gap 8, đủ chỗ ở 880px.

**Dữ liệu:** `installs[]` (name, root, version, variant, arch, state, patchedBy, hasBackup, backupAt), `config.safeMode`, cờ `spotifyRunning`, `version`.
**Hành động:** Áp dụng gọi apply, nhãn đổi "Đang áp dụng…", disable toàn bộ nút; thành công toast "Đã áp dụng." (kèm "Khởi động lại Spotify." nếu đang chạy). Khôi phục chỉ bật khi state khác stock và có backup; mở popover 320px "Khôi phục bản gốc? Thay đổi sẽ mất." với Huỷ (ghost) / Khôi phục (danger); Esc đóng, focus trả về nút. Sao lưu disable khi đã có backup, `title` giải thích. Khởi động lại disable khi đang bận. Mở thư mục mở `root` bằng Explorer. Spotify đang chạy không chặn Áp dụng; chỉ hiện cảnh báo warn.
**Rỗng:** không có bản cài → thay khối 3–5 bằng empty state "Không tìm thấy Spotify." + "Chọn thư mục"; tự dò lại khi cửa sổ được focus.
**Lỗi:** không đọc được dữ liệu → banner danger "Không tải được thông tin bản cài." + "Thử lại". Bản `unsupported` → chip đỏ `chip-foreign` nhãn "Không hỗ trợ", dòng "Bản Spotify này không hỗ trợ.", disable Áp dụng; vẫn cho mở thư mục.
### 5.2 Module

**Mục đích:** xem toàn bộ module, bật/tắt hoặc cài/gỡ ngay tại hàng.
**Khối, từ trên xuống:**
1. Topbar: tiêu đề "Module"; phải là ô tìm kiếm 200×34 (aria-label "Tìm module", icon 16, placeholder "Tìm module", debounce 120ms, lọc cả tên và mô tả, không phân biệt hoa thường).
2. Banner warn (chỉ khi kho online lỗi): "Không tải được kho online. Đang hiện module đi kèm." + ghost "Thử lại".
3. Nhóm theo `kind`, thứ tự: Tiện ích → Theme → Đoạn CSS. Header nhóm 11/600 caps, `letter-spacing:.06em`, màu faint, kèm số lượng; cách trên 20, dưới 8; viền dưới line.
4. Các hàng 52px (component 4.6), cách nhau 0, viền dưới line.

**Dữ liệu:** `modules[]` (name, id, version, kind, glyph, description/descriptionVi, bundled, installed, enabled, updateAvailable), `config.language`.
**Hành động:** extension/snippet đã cài → switch (lưu + apply); chưa cài → "Cài" secondary (lưu + apply); theme → "Dùng" ghost (lưu + apply), theme đang dùng → nhãn "Đang dùng" 11 accent. Module không bundled đã cài có thêm nút icon "Gỡ" 32 (`btn-danger btn-icon`, aria-label "Gỡ") bên trái switch, xác nhận bằng popover. Có `updateAvailable` → ghost "Cập nhật" trước switch. Trong lúc đổi: disable hàng, `aria-busy`, nhãn "Đang bật…/Đang cài…", không spinner; xong toast "Đã bật Adblock." (kèm "Khởi động lại Spotify." nếu đang chạy).
**Rỗng:** không có module → "Chưa có module." + "Mở thư mục dữ liệu"; tìm không khớp → "Không có kết quả." + "Xoá tìm kiếm".
**Lỗi:** thao tác thất bại → toast danger "Không bật được Adblock."; hàng trở về trạng thái cũ. Đang tải → 3 hàng skeleton tĩnh (nền surface-2, không shimmer), `aria-busy`.
**Glyph:** map `shield/volume/skip/speed/heart/eye-off/focus/keyboard/copy/palette/code`, stroke 1.5; glyph lạ dùng chữ cái đầu trong ô 32px surface-2 radius sm.
### 5.3 Giao diện

**Mục đích:** đổi theme và 6 màu của Spotify, thấy kết quả ngay.
**Khối, từ trên xuống:**
1. Topbar: tiêu đề "Giao diện".
2. Section "Theme" 13/600 + grid theme card (9 theme đi kèm). Chọn card → gọi đặt theme + apply; card `aria-busy`, chữ "Đang áp dụng…"; thành công → chip "Đang dùng" chuyển sang card mới + toast "Đã đổi theme." (kèm "Khởi động lại Spotify." nếu đang chạy); lỗi → giữ card cũ + toast danger.
3. Card "Màu": grid 2 cột gap 12, 6 field theo thứ tự Màu nhấn (accent), Nền (background), Thanh bên (sidebar), Thẻ (card), Chữ (text), Chữ mờ (subtext); mỗi field là label 12 + color-control 34 (swatch 20 inline `--c`, input color ẩn có aria-label, hex mono 12). Footer card: "Đặt lại" ghost bên trái, "Lưu màu" primary bên phải.
4. Ghi chú một dòng trong card: "6 màu này chỉ đổi Spotify; app quản lý luôn tối, accent xanh." (12 dim).

**Dữ liệu:** `themes[]` (id, bundled, active), `config.colors` 6 khóa; theme mặc định `Soft`; màu mặc định `#1ed760 / #121212 / #000000 / #1f1f1f / #ffffff / #b3b3b3`; map preview: Soft `#121212 #000000 #1f1f1f #1ed760`, Nord `#2e3440 #2b303b #3b4252 #88c0d0`, Dracula `#282a36 #21222c #44475a #bd93f9`, Amoled `#000000 #000000 #0a0a0a #1ed760`, Catppuccin `#1e1e2e #181825 #313244 #cba6f7`, Gruvbox `#282828 #1d2021 #3c3836 #fabd2f`, TokyoNight `#1a1b26 #16161e #24283b #7aa2f7`, RosePine `#191724 #1f1d2e #26233a #ebbcba`, Solarized `#002b36 #073642 #19444e #b58900`; theme lạ dùng 4 màu từ config.
**Hành động:** hex chỉ nhận 3 hoặc 6 ký tự, tự thêm `#`, chuẩn hoá chữ thường khi blur. "Lưu màu" disable nếu có field lỗi; lưu + apply, toast "Đã lưu màu."; nếu Spotify đang chạy thêm "Khởi động lại Spotify." "Đặt lại" điền 6 màu mặc định và lưu ngay, toast "Đã đặt lại màu."
**Rỗng:** không có theme → "Chưa có theme." + "Mở thư mục theme".
**Lỗi:** hex sai → viền danger + "Mã màu không hợp lệ." dưới field, không toast. Apply lỗi → toast danger, giữ nguyên lựa chọn trước đó.

### 5.4 Công cụ

**Mục đích:** cấu hình chung, đường dẫn, cập nhật và chẩn đoán.
**Khối, từ trên xuống:**
1. Topbar: tiêu đề "Công cụ".
2. Card "Chung": hàng Ngôn ngữ (segmented 2 nút VI/EN, 32px, mặc định VI; container surface + viền line, nút chọn nền surface-2) và hàng "Chế độ an toàn" + switch (mặc định tắt) + mô tả 12 "Bỏ qua tiện ích và tinh chỉnh khi áp dụng."; khi bật hiện thêm dòng 12 warn "Áp dụng lại ở Tổng quan."
3. Card "Cập nhật": hàng "Tự kiểm tra" + switch (mặc định tắt); hàng "Phiên bản" giá trị mono 12 + nút "Kiểm tra" secondary; dòng kết quả 12: "Bản mới nhất" / "Có bản 0.4.1" + ghost "Tải về"; đang kiểm tra đổi nhãn "Đang kiểm tra…".
4. Card "Spotify": field đường dẫn readonly + "Chọn thư mục" secondary + "Tự dò" ghost; lưu ngay khi chọn, toast "Đã lưu đường dẫn."; sai → viền danger + "Thư mục không chứa Spotify."; dưới cùng là link ghost "Mở thư mục cài đặt".
5. Card "Chẩn đoán": header + "Chép báo cáo" secondary + "Chạy lại" ghost icon (aria-label "Chạy lại"); bảng 3 cột (Hạng mục 12 dim, Giá trị 12 mono, Trạng thái 11 kèm "OK"/"Lỗi" chứ không chỉ màu), hàng cao 32, viền dưới line.
6. Card "Dữ liệu": đường dẫn `dataDir` mono 12 + "Mở thư mục" secondary.

**Dữ liệu:** `config.language`, `config.safeMode`, `config.checkUpdate`, `config.spotifyPath`, `version`, `dataDir`, `diagnostics[]` (label, value, ok).
**Hành động:** đổi ngôn ngữ render lại ngay, không toast. Switch lưu ngay, lỗi thì trả về trạng thái cũ + toast danger. Kiểm tra cập nhật disable khi đang chạy; lỗi mạng hiện dòng 12 danger, không đổi nút. Chép báo cáo gọi clipboard + toast "Đã chép báo cáo." Mở dữ liệu mở `dataDir`.
**Rỗng:** chưa có đường dẫn → placeholder "Chưa chọn" + "Chọn thư mục"; bảng chẩn đoán hiện "—" và status "Lỗi".
**Lỗi:** không chạy được chẩn đoán → banner danger "Không chạy được chẩn đoán." + "Chạy lại"; vẫn giữ các hàng cũ.
## 6. Quy tắc viết chữ

- Mặc định `vi`; mọi chuỗi UI lấy từ dictionary `vi`/`en`, không hard-code; mỗi mục tối đa một dòng mô tả, tối đa 64 ký tự; không có dòng phụ dưới tiêu đề trang.
- Không dùng "vui lòng", "quý khách", "chúng tôi", "xin lỗi"; không dấu chấm than.
- Nhãn nút bắt đầu bằng động từ, tối đa 2 từ (EN) / 16 ký tự (VI); không "OK", không "Đồng ý".
- Sentence case; nhãn và nút không có dấu chấm cuối; toast/lỗi một câu, có dấu chấm.
- Lỗi theo mẫu "Không + động từ + đối tượng."; không đổ lỗi, không mã lỗi trong dòng chính.
- Giữ nguyên tên riêng: Spotify, Windows, theme, module; "extension" dịch là "tiện ích" khi là nhãn.
- Ngày `dd/MM/yyyy`, giờ 24h, số dùng dấu phẩy thập phân kiểu Việt.

| Key | VI | EN |
| --- | --- | --- |
| nav.overview | Tổng quan | Overview |
| nav.modules | Module | Modules |
| nav.appearance | Giao diện | Appearance |
| nav.tools | Công cụ | Tools |
| action.apply | Áp dụng | Apply |
| action.restore | Khôi phục | Restore |
| action.backup | Sao lưu | Back up |
| action.restart | Khởi động lại | Restart |
| action.openFolder | Mở thư mục | Open folder |
| state.inUse | Đang dùng | In use |

Chip trạng thái: Nguyên bản / Original · Đã vá / Patched · Vá dở / Half-patched · Công cụ khác / Other tool. Nút khác: Cài / Install · Gỡ / Remove · Bật / On · Tắt / Off · Dùng / Use · Lưu màu / Save colors · Đặt lại / Reset.
## 7. Những gì KHÔNG làm

1. Không emoji làm icon, kể cả trong toast hay empty state; chỉ SVG stroke.
2. Không gradient ở nền, chữ, viền, preview hay biểu đồ.
3. Không glow/neon và không bóng đổ nặng: cấm `box-shadow` màu, `text-shadow`, viền phát sáng, blur > 24px hoặc alpha > 0.4.
4. Không glassmorphism, `backdrop-filter`, panel bán trong suốt.
5. Không tiêu đề nội dung > 20px; page title 15px, chỉ một giá trị số được 20px.
6. Không ảnh minh hoạ, hero, illustration, ảnh stock, background image.
7. Không quá 2 màu nhấn: xanh accent cho hành động; đỏ/amber chỉ cho trạng thái; cấm tím, lam, cam trang trí.
8. Không animation > 200ms, không lặp vô hạn, không parallax, bounce, shimmer hay spinner quay; loading dùng chữ + trạng thái disabled.
## 8. Nguồn tham chiếu

- Spicetify Marketplace — tabs, install/enable, card metadata: https://spicetify.app/docs/customization/marketplace.html
- Linear — giảm nhiễu sidebar, mật độ, phân cấp header: https://linear.app/now/how-we-redesigned-the-linear-ui
- Raycast — nền gần đen, viền hairline, radius nhỏ, một CTA: https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/raycast/DESIGN.md
- Warp — bố cục IDE tối, mật độ cao, bảng cài đặt: https://getdesign.md/warp/design-md
- Spotify Desktop — sidebar thư viện + now playing, nội dung là trung tâm: https://community.spotify.com/forum/t5/Desktop-Windows/Desktop-New-quot-Now-Playing-View-quot-sidebar/m-p/5602589
- WCAG 2.2 — Focus Appearance (2px, 3:1): https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Microsoft Fluent 2 — Segoe UI Variable, type ramp: https://fluent2.microsoft.design/typography
