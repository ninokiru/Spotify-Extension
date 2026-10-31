# Tauri 2 — ghi chú audit & cấu hình

> Ngày 31/10/2026. Phiên bản tham chiếu (tra crates.io): `tauri 2.12.5`, `tauri-build 2.7.4`,
> `window-vibrancy 0.8.1`; plugin `opener 2.7.2`, `dialog 2.8.4`, `updater 2.14.1`,
> `single-instance 2.5.5`, `store 2.5.0`. Máy dev **không có Rust** nên chưa compile lần nào;
> các kết luận build dưới đây dựa trên source Tauri và cấu hình CI.

## Kết luận nhanh

- **Trạng thái repo là blocker duy nhất:** `git status` cho thấy `src-tauri/`, `ui/`, `docs/` còn untracked và workflow mới chỉ ở working tree.
  `ui/` đã có `index.html` + `styles.css` + `app.js` (tạo 10:59–11:06) nên lỗi `frontendDist` đã hết; nhưng nếu push thiếu `ui/` thì
  `generate_context!()` vẫn panic: "The frontendDist configuration is set to \"../ui\" but this path doesn't exist", và cả `cargo test` lẫn `cargo build --release` fail.
- **Config hợp lệ schema v2:** `theme: "Dark"`, `decorations`, `withGlobalTauri`, `bundle.active=false` đều đúng.
  `../ui` đúng quy ước vì đường dẫn tính từ file `tauri.conf.json` (nên nó trỏ `repo/ui`).
- **`cargo build --release` tạo exe chạy được** khi `ui/` tồn tại (nay đã có): asset được nhúng vào binary lúc compile,
  không cần Tauri CLI và không cần copy `ui/` cạnh exe. Nhưng thiếu `--features tauri/custom-protocol`
  (đúng thứ CLI bật) nên `is_dev() == true`; hiện `csp: null` nên chưa thấy khác biệt, và không có installer.
- **Capabilities đủ:** command khai báo bằng `#[tauri::command]` + `generate_handler!` được phép cho mọi window,
  **không cần permission**. `core:default` phủ 9 module core. UI hiện chỉ gọi `window.__TAURI__.core.invoke`, không dùng
  `minimize/close/startDragging` nên không cần thêm quyền window.
- **Icon:** Windows chỉ cần `icons/icon.ico`; `icon.png` hiện không được dùng. Nhưng `icon.ico` chỉ có 1 entry 256×256
  nên icon trên taskbar/Start menu dễ mờ; thay bằng bộ đa kích thước là việc nên làm, không phải blocker.
- **Nên sửa ngay:** commit `Cargo.lock` + `package-lock.json`, dùng `npm ci`, `#[tauri::command(async)]` cho lệnh blocking,
  đặt CSP, panic hook, và tính chuyện ký số trước khi phát hành rộng.

## Bảng audit

| File | Vấn đề | Mức | Cách sửa chính xác |
|---|---|---|---|
| `git` (repo state) | `src-tauri/`, `ui/`, `docs/` untracked; workflow build/release mới chưa commit | **Chặn build** | `git add src-tauri ui .github` rồi commit/push (thêm `src-tauri/Cargo.lock` và `package-lock.json` sau khi chạy `npm install`); chạy `workflow_dispatch` trước khi tag. |
| `ui/index.html`, `ui/app.js` | UI đã có (10:59–11:06); chỉ gọi `window.__TAURI__.core.invoke`, không dùng window API/titlebar | **OK** | Giữ `withGlobalTauri: true`; capability hiện tại đã đủ, không thêm permission. |
| `src-tauri/Cargo.toml` + `.github/workflows/*.yml` | Release build không bật `tauri/custom-protocol` → `is_dev()` true, dùng dev CSP, khác hành vi `tauri build` | **Nên sửa** | Thêm `--features tauri/custom-protocol` vào lệnh `cargo build --release` (xem mẫu bên dưới). |
| `src-tauri/Cargo.toml` | `[profile.release]` đúng hướng dẫn size nhưng thiếu `panic = "abort"` | **Nên sửa** | Thêm `panic = "abort"`. Lưu ý: panic sẽ abort, không unwind; cần panic hook (dòng `main.rs`). |
| `src-tauri/Cargo.toml`, `.github/workflows/*.yml` | Không commit `Cargo.lock`; cache key chỉ hash `Cargo.toml`; không `--locked` | **Nên sửa** | Commit lock; `key: ${{ runner.os }}-cargo-${{ hashFiles('src-tauri/Cargo.lock') }}`; build với `--locked`. |
| `src-tauri/icons/` | `icon.ico` chỉ 1 entry 256×256; `icon.png` 256×256 không nằm trong `bundle.icon` | **Nên sửa** | Cài `@tauri-apps/cli` (devDependency) rồi chạy `npx tauri icon <png 1024>` để sinh bộ đầy đủ; cập nhật `bundle.icon` gồm `icons/32x32.png`, `icons/128x128.png`, `icons/icon.ico`. Build Windows chỉ cần `.ico`. |
| `src-tauri/tauri.conf.json` | `"csp": null` — tắt hoàn toàn CSP; XSS trong UI gọi được mọi command (command app không qua ACL) | **Nên sửa** | Đặt CSP, ví dụ `{"default-src": "'self'", "connect-src": "ipc: http://ipc.localhost", "img-src": "'self' data:", "style-src": "'self' 'unsafe-inline'"}`. UI hiện không có inline script/handler/`eval` nên siết được, nhưng phải test lại `invoke`. |
| `src-tauri/src/commands.rs` | 15 command đều sync; `restart` ngủ 1.5 s, `apply`/`backup` đọc-ghi file → chạy trên **main thread**, treo UI | **Nên sửa** | Đổi sang `#[tauri::command(async)] pub fn ...` (giữ thân sync); hoặc `async fn` với tham số `String`. |
| `src-tauri/src/process.rs` | `Command::new("tasklist"/"taskkill"/"explorer")` tìm theo PATH + CWD → binary planting; `taskkill /F` giết mọi Spotify; output `tasklist` bị bản địa hoá; `CREATE_NO_WINDOW` bị bỏ qua với app GUI | **Nên sửa** | Dùng đường dẫn tuyệt đối `%SystemRoot%\System32\tasklist.exe`; giữ `explorer` nhưng dùng path tuyệt đối, hoặc chuyển sang `opener` (`open_path` cần thêm permission/scope); không tin exit code của `explorer`. |
| `src-tauri/src/main.rs` | `.expect(...)` + `windows_subsystem="windows"` + `panic="abort"` → chết im lặng, không log | **Nên sửa** | `std::panic::set_hook` ghi `%APPDATA%\spotify-extension\panic.log` trước khi abort. |
| `src-tauri/capabilities/default.json` | Đủ cho `invoke`; nhưng thiếu quyền window nếu chuyển sang `decorations:false` | **Tuỳ chọn** | Thêm `core:window:allow-start-dragging`, `allow-minimize`, `allow-toggle-maximize`, `allow-close`. |
| `src-tauri/build.rs` | `tauri_build::build()` → mọi command app mở cho mọi window, không phân quyền được | **Tuỳ chọn** | Nếu muốn siết: `try_build(Attributes::new().app_manifest(AppManifest::new().commands(&[...])))` + thêm permission vào capability. |
| `src-tauri/tauri.conf.json` | `bundle.active=false` → không installer, không uninstaller, không updater artifact | **Tuỳ chọn** | Giữ nếu phân phối zip; khi làm updater phải bật NSIS và dùng `tauri build`. |
| `.github/workflows/build.yml`, `release.yml` | `npm install` không lockfile; `actions/cache@v4` (bản mới là v6); cache cả `src-tauri/target`; `cargo test` (dev) rồi `cargo build --release` compile 2 lần | **Nên sửa** | Commit `package-lock.json` + `npm ci`; nâng cache lên v6 hoặc `Swatinem/rust-cache@v2` với `workspaces: src-tauri -> target`; tách job test/build. |
| `.github/workflows/*.yml` + test layout | `cargo test` build cả bin crate → `generate_context!` cần `ui/`; test nằm trong bin nên kéo theo tauri + wry | **Nên sửa** | `ui/` đã có nên test sẽ compile; để nhanh: tách module thuần sang lib/core crate và chạy `cargo test --lib`/`-p core` (xem mục Kiểm thử). |
| `.github/workflows/release.yml` | Không ký exe/zip; checksum SHA-256 nằm cùng release | **Nên sửa** (nếu phát hành rộng) | Ký OV/SignPath; thêm attestation; checksum chỉ chống hỏng file (xem mục SmartScreen). |
| `src-tauri/tauri.conf.json` | `theme: "Dark"`, `decorations: true`, `withGlobalTauri: true`, `identifier`, `productName` | **OK** | Không cần sửa. `withGlobalTauri` cần cho UI thuần JS (`window.__TAURI__.core.invoke`); `theme` nhận `"Dark"` (deserializer không phân biệt hoa/thường). |
| `src-tauri/capabilities/default.json` | `$schema` trỏ `../gen/schemas/desktop-schema.json` (gen bị gitignore) | **Tuỳ chọn** | Không ảnh hưởng build; `tauri-build` sinh file này. Editor chỉ báo thiếu trước lần build đầu. |

### Mẫu sửa nhanh

```toml
# src-tauri/Cargo.toml
[profile.release]
opt-level = "s"
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

```yaml
# .github/workflows/*.yml — bước build
- run: npm ci
- run: cargo test --manifest-path src-tauri/Cargo.toml
- run: cargo build --release --locked --features tauri/custom-protocol --manifest-path src-tauri/Cargo.toml
```

Thêm vào `src-tauri/capabilities/default.json` (chỉ khi làm titlebar tự vẽ):

```json
"permissions": [
  "core:default",
  "core:window:allow-start-dragging",
  "core:window:allow-minimize",
  "core:window:allow-toggle-maximize",
  "core:window:allow-close"
]
```

`ui/` đã có `index.html`, `styles.css`, `app.js`; chỉ cần đảm bảo chúng được commit cùng `src-tauri/`.

## Xác nhận từ tài liệu

**Config & build**
- `frontendDist` là đường dẫn **tương đối với file config**, được đọc đệ quy và nhúng vào binary; Tauri tìm `index.html` làm entry.
  Nguồn: [BuildConfig](https://v2.tauri.app/reference/config/#buildconfig).
- Thư mục không tồn tại → panic đúng chuỗi trên. Nguồn: [`tauri-codegen/src/context.rs`](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-codegen/src/context.rs).
- `generate_context!()` "embeds the frontend assets, the application icons, the resolved Access Control List and the parsed configuration into the binary".
  Nguồn: [docs.rs — generate_context](https://docs.rs/tauri/2.12.5/tauri/macro.generate_context.html).
- `is_dev()` = `!cfg!(feature = "custom-protocol")`. Nguồn: [docs.rs — is_dev](https://docs.rs/tauri/2.12.5/tauri/fn.is_dev.html).
- CLI production build tự bật feature này: `features.push("tauri/custom-protocol")`.
  Nguồn: [`tauri-cli/src/interface/rust.rs`](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-cli/src/interface/rust.rs).
- `theme` chỉ nhận `Light`/`Dark` trong schema nhưng deserializer so sánh lowercase. Nguồn: [WindowConfig](https://v2.tauri.app/reference/config/#windowconfig).
- CSP: Tauri tự chèn nonce/hash cho asset bundled; ví dụ chính thức dùng `"connect-src": "ipc: http://ipc.localhost"`.
  Nguồn: [CSP](https://v2.tauri.app/security/csp/).

**Capabilities / ACL**
- "By default, all commands that you registered in your app (using `tauri::Builder::invoke_handler`) are allowed to be used by all the windows and webviews of the app."
  Nguồn: [Capabilities](https://v2.tauri.app/security/capabilities/).
- `core:default` gồm default set của 9 module: `core:app`, `core:event`, `core:image`, `core:menu`, `core:path`,
  `core:resources`, `core:tray`, `core:webview`, `core:window`. Nguồn: [Core Permissions](https://v2.tauri.app/reference/acl/core-permissions/).
- `core:window:default` **không** có `allow-minimize`, `allow-close`, `allow-toggle-maximize`, `allow-start-dragging`
  (chỉ có các lệnh đọc trạng thái và `allow-internal-toggle-maximize`).
  Nguồn: [window permissions reference](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/permissions/window/autogenerated/reference.md).

**Icon**
- `tauri-build` tìm file `.ico` trong `bundle.icon`, fallback `icons/icon.ico`; thiếu thì lỗi
  "not found; required for generating a Windows Resource file during tauri-build". `bundle.active` **không** ảnh hưởng bước này —
  hễ target Windows là resource icon luôn được nhúng.
  Nguồn: [`tauri-build/src/lib.rs`](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-build/src/lib.rs).
- Trên Windows, default window icon lấy từ **icon resource của exe** (`default_window_icon_from_app_icon_resource()`),
  nên `icon.png` không bắt buộc. Nguồn: [codegen context.rs](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-codegen/src/context.rs).
- `tauri icon` sinh icon đa nền tảng từ PNG/SVG vuông. Nguồn: [CLI reference](https://v2.tauri.app/reference/cli/#icon).

**Cửa sổ / Mica / titlebar**
- `windowEffects` **yêu cầu window transparent**; Windows nhận `mica`, `micaDark`, `micaLight`, `acrylic`, `blur`, `tabbed`;
  có ghi chú workaround khi dùng decorations/shadow. Nguồn: [WindowConfig](https://v2.tauri.app/reference/config/#windowconfig).
- Tauri 2.12 dùng chính `window-vibrancy 0.8.1` bên trong (`Effect::Mica` → `window_vibrancy::apply_mica`), và **bỏ qua lỗi**
  (`set_window_effects` luôn trả `Ok`). Nguồn: [`vibrancy/windows.rs`](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/vibrancy/windows.rs).
- API trực tiếp: `apply_mica(window: impl HasWindowHandle, dark: Option<bool>) -> Result<(), Error>`,
  `apply_acrylic(window, color: Option<Color>)`, `Color = (u8,u8,u8,u8)`; Mica chỉ Windows 11, trả lỗi trên Win10.
  Nguồn: [apply_mica 0.8.1](https://docs.rs/window-vibrancy/0.8.1/window_vibrancy/fn.apply_mica.html).
- `WebviewWindow` implement `HasWindowHandle` nên truyền `&window` được. Nguồn: [`webview_window.rs`](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/webview/webview_window.rs).
- Titlebar tự vẽ: `"decorations": false` + `data-tauri-drag-region`; cần `core:window:allow-start-dragging`;
  trên Windows thêm CSS `*[data-tauri-drag-region]{app-region:drag}` cho touch/pen.
  Nguồn: [Window Customization](https://v2.tauri.app/learn/window-customization/).
- `shadow: true` trên window không viền tạo viền trắng 1px (Windows) — rủi ro thẩm mỹ khi bỏ decorations.
  Nguồn: [WindowConfig.shadow](https://v2.tauri.app/reference/config/#windowconfig).

**Plugin**
- `opener`: `opener:default` cho `open-url` (http/https/mailto/tel) + `reveal-item-in-dir`; `open_path` cần permission/scope riêng.
  Nguồn: [Opener](https://v2.tauri.app/plugin/opener/), [`permissions/default.toml`](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/opener/permissions/default.toml).
- `dialog`: `dialog:default` = `allow-message`, `allow-save`, `allow-open`; `ask`/`confirm` hiện là alias của `message` (deprecated ở v3).
  Nguồn: [Dialog](https://v2.tauri.app/plugin/dialog/), crate `tauri-plugin-dialog 2.8.4`.
- `updater`: cần `createUpdaterArtifacts`, public key, ký private key; trên Windows artifact là MSI/NSIS, không có installer thì không áp dụng.
  Nguồn: [Updater](https://v2.tauri.app/plugin/updater/).
- `single-instance`: **phải đăng ký đầu tiên**; chỉ có Rust API, không có thư mục `permissions` → không sửa capability.
  Nguồn: [Single Instance](https://v2.tauri.app/plugin/single-instance/).
- `store`: `store:default` mở toàn bộ lệnh; nhưng app đã có `config.rs` nên thường dư.
  Nguồn: [Store](https://v2.tauri.app/plugin/store/).
- Tray cần feature `tray-icon` (`tauri = { version = "2", features = ["tray-icon"] }`); `app.trayIcon.iconPath` là bắt buộc,
  icon được nhúng dạng **raw RGBA** nên ảnh càng lớn binary càng phình.
  Nguồn: [System Tray](https://v2.tauri.app/learn/system-tray/), [TrayIconConfig](https://v2.tauri.app/reference/config/#trayiconconfig).

**Rust / Windows**
- `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` là đúng mẫu chính thức để ẩn console ở release.
  Nguồn: [create-tauri-app main.rs template](https://github.com/tauri-apps/create-tauri-app/blob/dev/templates/_base_/src-tauri/src/main.rs.lte).
- `CommandExt::creation_flags(&mut self, flags: u32) -> &mut Command` là API **safe** (không `unsafe`), áp cho `CreateProcess`.
  Nguồn: [std::os::windows::process::CommandExt](https://doc.rust-lang.org/std/os/windows/process/trait.CommandExt.html).
- `CreateProcess` tìm executable theo thứ tự gồm thư mục app, **thư mục hiện tại**, System32, Windows, PATH
  → `Command::new("tasklist")` có thể chạy file lạ đặt cạnh app. Nguồn: [CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw).
- Command sync chạy trên main thread; `#[tauri::command(async)]` đẩy sang thread khác.
  Nguồn: [Calling Rust — Async Commands](https://v2.tauri.app/develop/calling-rust/#async-commands).

**Kích thước / build**
- Tauri khuyến nghị `codegen-units=1`, `lto=true`, `opt-level="s"`, `panic="abort"`, `strip=true`; `"z"` nhỏ hơn `"s"` một chút
  nhưng có thể chậm hơn, `"s"` là mặc định hợp lý. Nguồn: [Reduce app size](https://v2.tauri.app/concept/size/).
- `lto=true` (fat LTO) + 1 CGU làm bước link chậm nhất; `strip` không ảnh hưởng compile; có thể dùng
  `CARGO_PROFILE_RELEASE_LTO=thin` cho PR và fat cho tag. Nguồn: [Cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html).
- Ước lượng (chưa đo): cold build windows-latest khoảng 10–18 phút; LTO + 1 CGU cộng ~30–100% thời gian link so với mặc định,
  nên cache `target` quan trọng hơn việc hạ `opt-level`. Timeout 45 phút hiện tại đủ.

**SmartScreen**
- App chưa ký bị SmartScreen chặn vì chưa có reputation; từ 2024 EV **không còn** được miễn trừ tức thì, OV/EV đều phải xây reputation.
  Nguồn: [Tauri — Windows signing](https://v2.tauri.app/distribute/sign/windows/), [Microsoft SmartScreen reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).
- Có thể gửi file cho Microsoft review thủ công (không đảm bảo), hoặc dùng dịch vụ ký miễn phí cho OSS (ví dụ SignPath Foundation —
  cần xác minh điều kiện). Checksum SHA-256 đặt cùng release **chỉ chống hỏng file**, không chống kẻ chiếm được tài khoản GitHub
  (họ thay được cả zip lẫn checksum).
- Giảm miễn phí thực tế: hướng dẫn người dùng right-click file → Properties → **Unblock** (Mark-of-the-Web), gửi Microsoft review,
  và giữ nguyên certificate qua các bản để tích reputation; không có cách nào xoá cảnh báo ngay lập tức.

**Kiểm thử**
- `cargo test` biên dịch bin crate → có `generate_context!()` → cần `ui/`; test hiện nằm trong module của bin nên kéo theo tauri/wry.
  Nguồn: [generate_context!](https://docs.rs/tauri/2.12.5/tauri/macro.generate_context.html), [Tests](https://v2.tauri.app/develop/tests/).
- Tách test nhanh: thêm `src/lib.rs` (đặt `[lib] name = "spotify_extension_lib"` để tránh trùng tên bin trên Windows)
  export các module thuần (`apply`, `backup`, `config`, `detect`, `model`, `paths`, `process`, `store`, `themes`, `util`),
  giữ `commands.rs` + `main.rs` ở bin (đổi `crate::` → `spotify_extension_lib::`), chạy `cargo test --lib` → không còn `generate_context!`.
  Nhanh nhất là tách hẳn crate `sxe-core` **không phụ thuộc tauri**; nếu để chung package thì tauri/wry vẫn bị compile.
- Tauri có mock runtime (`tauri::test`) cho test command, cần feature `test`.
  Nguồn: [Mock runtime](https://v2.tauri.app/develop/tests/mocking/).

## Đề xuất v0.5

### Plugin chính thức (chi phí / capability)

| Plugin | Giải quyết | KB thêm (ước lượng thô) | Capability |
|---|---|---|---|
| `tauri-plugin-opener 2.7.2` | Mở URL/thư mục bằng app mặc định, reveal file — thay `explorer` spawn | +~80–200 KB | `opener:default` (open-url http/https/mailto/tel + reveal-item-in-dir); `open_path` (mở folder) cần thêm `opener:allow-open-path` + scope |
| `tauri-plugin-dialog 2.8.4` | Hộp thoại chọn thư mục/file, message | +~300–600 KB (rfd + fs) | `dialog:default` = message/save/open; `ask`/`confirm` là alias của message |
| `tauri-plugin-updater 2.14.1` | Tự cập nhật có ký | +~1.5–3 MB (reqwest + rustls + minisign) | `updater:default`; chỉ dùng được khi có MSI/NSIS, không hợp zip portable |
| `tauri-plugin-single-instance 2.5.5` | Chặn 2 instance, focus cửa sổ cũ | +~80–200 KB (kèm deep-link) | Không cần — plugin thuần Rust, không có lệnh JS; đăng ký **đầu tiên** |
| `tauri-plugin-store 2.5.0` | Key-value JSON cho UI | +~60–150 KB | `store:default`; nhưng trùng `config.rs` nên bỏ qua |

Số KB là ước lượng từ dependency footprint, **chưa đo** trên build thật; muốn chắc thì chạy `cargo bloat --release` trong CI.

### Ưu tiên

| Ưu tiên | Việc | Chi phí | Ghi chú |
|---|---|---|---|
| P0 | Commit `ui/` + `src-tauri/` + lockfile, sửa CI, chạy build thật | 0.5–1 ngày | Điều kiện bắt buộc để CI xanh; UI đã có sẵn nên chủ yếu là commit + sửa workflow. |
| P1 | `tauri-plugin-single-instance` + `tauri-plugin-opener` cho link/reveal | ~1–2 giờ, +~100–200 KB | Single-instance đăng ký **đầu tiên**, không cần capability; opener dùng `opener:default`; mở folder bằng `open_path` thì phải thêm permission + scope. |
| P1 | Bật `--features tauri/custom-protocol`, `panic="abort"`, panic hook, CSP | ~2–3 giờ | Không thêm dependency; giảm rủi ro "dev mode" và crash im lặng. |
| P2 | Tray icon | ~0.5 ngày, +~200–400 KB | Thêm feature `tray-icon`, icon 32×32 (256×256 tốn ~262 KB raw RGBA), menu Show/Quit; đóng window thì ẩn xuống tray. |
| P2 | Mica (giữ `decorations: true`) | ~0.5 ngày | `"transparent": true`, `"noRedirectionBitmap": true`, `"windowEffects": {"effects":["mica"]}`; Win10 phải fallback màu đặc. |
| P3 | Titlebar tự vẽ (`decorations:false`) | 1–2 ngày | Cần 4 permission window + CSS drag + xử lý snap/shadow/rounded corners; rủi ro cao hơn Mica. |
| P4 | Updater | 2–3 ngày, +~1.5–3 MB | Phải chuyển sang NSIS (`bundle.active=true`, `createUpdaterArtifacts`), ký key, publish `latest.json`; **không dùng được với zip portable hiện tại**. |
| — | `tauri-plugin-store` | — | Bỏ qua: đã có `config.rs` + `config.ini`. |
| — | `tauri-plugin-dialog` | ~0.5 ngày, +~300–600 KB | Chỉ cần nếu muốn chọn thư mục Spotify bằng hộp thoại; `dialog:default` đã đủ. |

Mica bằng config (không cần thêm crate):

```json
{
  "label": "main",
  "transparent": true,
  "noRedirectionBitmap": true,
  "windowEffects": { "effects": ["mica"] }
}
```

Nếu cần fallback có kiểm soát trên Win10, gọi trực tiếp `window-vibrancy = "0.8"` trong `setup`:

```rust
let win = app.get_webview_window("main").unwrap();
if window_vibrancy::apply_mica(&win, Some(true)).is_err() {
    let _ = window_vibrancy::apply_acrylic(&win, Some((11, 13, 12, 200)));
}
```

## Rủi ro còn lại

- **Chưa build thật:** không có Rust trên máy dev, nên chưa xác nhận `ui/` + `generate_context!` + icon resource biên dịch được.
- **ICO 1 entry 256×256:** `rc.exe`/`tauri-winres` có thể chấp nhận, nhưng chất lượng 16/32 px kém và hiếm trường hợp lỗi resource — cần build CI để chốt.
- **Mica + WebView2:** chưa kiểm chứng trên Win11 thật; có thể gặp viền trắng, mất shadow/rounded corners, đặc biệt khi `decorations:false`.
  Config-based effect **nuốt lỗi**, nên trên Win10 cửa sổ vẫn transparent mà không có blur → UI phải có nền rgba đủ đục.
- **`cargo test --release`:** với `windows_subsystem="windows"`, test harness có thể không in ra console (cần xác minh) — chỉ chạy test ở dev profile.
- **Version drift:** `tauri = "2"` không có lockfile có thể kéo minor mới; `core:default` và danh sách permission có thể đổi giữa các bản.
- **GitHub Actions:** `actions/checkout@v7`, `upload-artifact@v7`, `softprops/action-gh-release@v3` đang tồn tại (kiểm tra 31/10/2026),
  nhưng `actions/cache@v4` đã cũ (v6) và có thể bị bỏ runtime Node20.
- **SmartScreen:** không có cách miễn phí tức thì; reputation tích luỹ theo thời gian và theo certificate.
- **Checksum:** không chống được tài khoản GitHub bị chiếm; cần ký/attestation + 2FA + protected tag/environment.
- **`tasklist`/`taskkill`:** output phụ thuộc locale, `taskkill` trả mã khác 0 khi không có process; `explorer` trả exit code 1 dù thành công.
- **Không có installer:** zip portable không tạo uninstaller, không tự cập nhật, và người dùng có thể chạy nhiều bản từ nhiều thư mục.
