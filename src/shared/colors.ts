export const DEFAULT_COLORS: Record<string, string> = {
  accent: "#1ed760",
  background: "#121212",
  sidebar: "#000000",
  card: "#1f1f1f",
  text: "#ffffff",
  subtext: "#b3b3b3",
};

export const COLOR_KEYS = [
  "accent",
  "background",
  "sidebar",
  "card",
  "text",
  "subtext",
] as const;

export type ColorKey = (typeof COLOR_KEYS)[number];
