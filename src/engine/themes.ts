import path from "node:path";
import { exists, listDir, readTextOrNull } from "./fsx";
import { DEFAULT_COLORS } from "../shared/colors";
import type { ThemeInfo } from "../shared/types";

export interface ThemeDir {
  dir: string;
  bundled: boolean;
}

export function normalizeHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();

  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return fallback;
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = normalizeHex(hex, "#000000").slice(1);
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(from: string, to: string, weight: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex(
    a[0] * (1 - weight) + b[0] * weight,
    a[1] * (1 - weight) + b[1] * weight,
    a[2] * (1 - weight) + b[2] * weight,
  );
}

/**
 * Spotify 1.3 ships the Encore design system, which reads every surface colour
 * from CSS custom properties. Overriding those is enough to retheme the client
 * without patching any of Spotify's own stylesheets.
 */
export function buildColorsCss(input: Record<string, string>): string {
  const accent = normalizeHex(input.accent, DEFAULT_COLORS.accent);
  const background = normalizeHex(input.background, DEFAULT_COLORS.background);
  const sidebar = normalizeHex(input.sidebar, DEFAULT_COLORS.sidebar);
  const card = normalizeHex(input.card, DEFAULT_COLORS.card);
  const text = normalizeHex(input.text, DEFAULT_COLORS.text);
  const subtext = normalizeHex(input.subtext, DEFAULT_COLORS.subtext);

  const textRgb = hexToRgb(text);
  const backgroundRgb = hexToRgb(background);

  const lines = [
    `  color-scheme: dark;`,
    ``,
    `  --background-base: ${background};`,
    `  --background-elevated-base: ${sidebar};`,
    `  --background-elevated-highlight: ${mix(sidebar, text, 0.08)};`,
    `  --background-elevated-press: ${mix(sidebar, "#000000", 0.2)};`,
    `  --background-highlight: ${card};`,
    `  --background-press: ${mix(background, "#000000", 0.25)};`,
    `  --background-tinted-base: rgba(${textRgb.join(", ")}, 0.07);`,
    `  --background-tinted-highlight: rgba(${textRgb.join(", ")}, 0.12);`,
    `  --background-tinted-press: rgba(${textRgb.join(", ")}, 0.04);`,
    ``,
    `  --text-base: ${text};`,
    `  --text-subdued: ${subtext};`,
    `  --text-bright-accent: ${accent};`,
    ``,
    `  --essential-base: ${text};`,
    `  --essential-subdued: ${subtext};`,
    `  --essential-bright-accent: ${accent};`,
    `  --decorative-base: ${text};`,
    `  --decorative-subdued: ${mix(text, background, 0.5)};`,
    ``,
    `  /* Spicetify-compatible aliases, so existing colour schemes still apply */`,
    `  --spice-text: ${text};`,
    `  --spice-subtext: ${subtext};`,
    `  --spice-main: ${background};`,
    `  --spice-sidebar: ${sidebar};`,
    `  --spice-player: ${background};`,
    `  --spice-card: ${card};`,
    `  --spice-button: ${accent};`,
    `  --spice-button-active: ${accent};`,
    `  --spice-button-disabled: ${subtext};`,
    `  --spice-tab-active: ${card};`,
    `  --spice-rgb-text: ${textRgb.join(", ")};`,
    `  --spice-rgb-main: ${backgroundRgb.join(", ")};`,
    `  --spice-rgb-selected-row: ${textRgb.join(", ")};`,
    `  --spice-rgb-shadow: 0, 0, 0;`,
  ];

  return `:root {\n${lines.join("\n")}\n}\n`;
}

export async function listThemes(dirs: ThemeDir[]): Promise<ThemeInfo[]> {
  const found = new Map<string, ThemeInfo>();

  for (const source of dirs) {
    for (const entry of await listDir(source.dir)) {
      if (!entry.isDirectory()) continue;

      const id = entry.name;
      if (found.has(id)) continue;

      const themePath = path.join(source.dir, entry.name);
      const hasCss =
        (await exists(path.join(themePath, "user.css"))) ||
        (await exists(path.join(themePath, "theme.css")));

      if (!hasCss) continue;

      found.set(id, {
        id,
        name: id,
        path: themePath,
        bundled: source.bundled,
        hasCss,
      });
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function readThemeCss(themePath: string): Promise<string> {
  const candidates = ["user.css", "theme.css"];

  for (const name of candidates) {
    const content = await readTextOrNull(path.join(themePath, name));
    if (content !== null) return content;
  }

  return "";
}
