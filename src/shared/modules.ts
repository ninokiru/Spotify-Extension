export type ModuleKind = "extension" | "theme" | "snippet";

export interface ModuleFile {
  /** File name written into the user folder. */
  name: string;
  /** Raw download URL. Empty for files that ship with the app. */
  url: string;
}

export interface ModuleEntry {
  id: string;
  name: string;
  author: string;
  description: string;
  descriptionVi: string;
  version: string;
  kind: ModuleKind;
  /** Install counter from the registry. Zero when nobody tracks it. */
  downloads: number;
  /** Key of the glyph drawn on the preview tile. */
  glyph: string;
  /** Two hex colours used for the preview tile gradient. */
  accent: [string, string];
  files: ModuleFile[];
  bundled: boolean;
}

export interface ModuleStatus {
  installed: boolean;
  enabled: boolean;
  /** Version currently on disk. */
  version: string | null;
  updateAvailable: boolean;
}

export interface StoreCatalog {
  modules: ModuleEntry[];
  status: Record<string, ModuleStatus>;
  updatedAt: string;
  /** False when the online catalogue could not be reached. */
  remote: boolean;
}

export const MODULE_GLYPHS: Record<string, string> = {
  shield: `<path d="M10 3.2 4.6 5.6v4.1c0 3.2 2.2 6 5.4 7.1 3.2-1.1 5.4-3.9 5.4-7.1V5.6L10 3.2Z"/><path d="m7.6 9.9 1.7 1.7 3.2-3.4"/>`,
  skip: `<circle cx="10" cy="10" r="6.8"/><path d="m8.4 7.3 5 5.7"/><path d="m13.4 7.3-5 5.7"/>`,
  keys: `<rect x="3" y="6.4" width="14" height="7.2" rx="2"/><path d="M6 6.4v2.6M9 6.4v2.6M12 6.4v2.6"/>`,
  copy: `<rect x="7" y="7" width="9" height="9" rx="2"/><path d="M13 5.4A1.4 1.4 0 0 0 11.6 4H5.4A1.4 1.4 0 0 0 4 5.4v6.2A1.4 1.4 0 0 0 5.4 13"/>`,
  palette: `<path d="M10 3.6a6.4 6.4 0 0 0 0 12.8c.9 0 1.4-.6 1.4-1.3 0-.8-.7-1.1-.7-1.8 0-.7.6-1.2 1.4-1.2h1.2A3.1 3.1 0 0 0 16.4 9c0-3-2.9-5.4-6.4-5.4Z"/><circle cx="7.4" cy="9" r=".9" fill="currentColor" stroke="none"/><circle cx="10" cy="6.9" r=".9" fill="currentColor" stroke="none"/><circle cx="12.6" cy="8.6" r=".9" fill="currentColor" stroke="none"/>`,
  window: `<rect x="3.4" y="4.6" width="13.2" height="10.8" rx="2"/><path d="M3.4 8h13.2"/><circle cx="6" cy="6.3" r=".7" fill="currentColor" stroke="none"/>`,
  sparkle: `<path d="M10 3.6 11.7 8l4.4 1.7-4.4 1.7L10 15.8 8.3 11.4 3.9 9.7 8.3 8 10 3.6Z"/>`,
  wave: `<path d="M4 10c1.6-1.4 3.2-2.1 4.8-2.1S12 8.6 13.6 10"/><path d="M6.4 12.6c1.1-1 2.3-1.5 3.6-1.5s2.5.5 3.6 1.5"/>`,
};

export function moduleGlyph(name: string): string {
  return MODULE_GLYPHS[name] ?? MODULE_GLYPHS.sparkle;
}

/** Modules that ship inside the installer. */
export const BUNDLED_MODULES: ModuleEntry[] = [
  {
    id: "adblock",
    name: "Adblock",
    author: "ninokiru",
    description: "Removes ad slots and upgrade banners from the client.",
    descriptionVi: "Ẩn quảng cáo và các bảng nâng cấp trong giao diện Spotify.",
    version: "1.0.0",
    kind: "extension",
    downloads: 0,
    glyph: "shield",
    accent: ["#123a24", "#0d1f16"],
    files: [{ name: "adblock.js", url: "" }],
    bundled: true,
  },
  {
    id: "auto-skip-explicit",
    name: "Auto skip explicit",
    author: "ninokiru",
    description: "Skips tracks marked explicit while playing.",
    descriptionVi: "Tự nhảy qua các bài hát có nhãn explicit khi đang phát.",
    version: "1.0.0",
    kind: "extension",
    downloads: 0,
    glyph: "skip",
    accent: ["#3a2a12", "#1f160a"],
    files: [{ name: "auto-skip-explicit.js", url: "" }],
    bundled: true,
  },
  {
    id: "quick-keys",
    name: "Quick keys",
    author: "ninokiru",
    description: "Alt+←/→ seek 10s, Alt+↑/↓ volume, Alt+M mute.",
    descriptionVi: "Alt+←/→ tua 10 giây, Alt+↑/↓ chỉnh âm lượng, Alt+M tắt tiếng.",
    version: "1.0.0",
    kind: "extension",
    downloads: 0,
    glyph: "keys",
    accent: ["#123040", "#0d1a22"],
    files: [{ name: "quick-keys.js", url: "" }],
    bundled: true,
  },
  {
    id: "track-copy",
    name: "Track copy",
    author: "ninokiru",
    description: "Alt+C copies the current track as “Song — Artist”.",
    descriptionVi: "Alt+C chép tên bài hiện tại theo dạng “Tên bài — Ca sĩ”.",
    version: "1.1.0",
    kind: "extension",
    downloads: 0,
    glyph: "copy",
    accent: ["#2c2440", "#161222"],
    files: [{ name: "track-copy.js", url: "" }],
    bundled: true,
  },
  {
    id: "volume-memory",
    name: "Volume memory",
    author: "ninokiru",
    description: "Restores the last volume level when Spotify starts.",
    descriptionVi: "Khôi phục mức âm lượng cũ mỗi khi mở Spotify.",
    version: "1.0.0",
    kind: "extension",
    downloads: 0,
    glyph: "wave",
    accent: ["#123040", "#0d1a22"],
    files: [{ name: "volume-memory.js", url: "" }],
    bundled: true,
  },
  {
    id: "Soft",
    name: "Soft",
    author: "ninokiru",
    description: "Digital clock, larger play button, rounded progress bar.",
    descriptionVi: "Đồng hồ dạng số, nút phát to hơn, thanh tiến trình bo tròn.",
    version: "1.0.0",
    kind: "theme",
    downloads: 0,
    glyph: "palette",
    accent: ["#3a2f18", "#1b1710"],
    files: [{ name: "user.css", url: "" }],
    bundled: true,
  },
  {
    id: "hide-window-controls",
    name: "Hide window controls",
    author: "ninokiru",
    description: "Hides the Windows window buttons so Spotify fills the screen.",
    descriptionVi: "Ẩn nút cửa sổ Windows để Spotify chiếm hết màn hình.",
    version: "1.0.0",
    kind: "snippet",
    downloads: 0,
    glyph: "window",
    accent: ["#20242b", "#12151a"],
    files: [{ name: "hide-window-controls.css", url: "" }],
    bundled: true,
  },
];
