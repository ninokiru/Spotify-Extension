import { addCss } from "./ui";

const STORAGE_KEY = "sxe:accent";

export interface AccentPreset {
  id: string;
  color: string;
}

/** An empty id means "use whatever the theme sets". */
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "blue", color: "#4d9fff" },
  { id: "purple", color: "#b18cff" },
  { id: "pink", color: "#ff7ab6" },
  { id: "orange", color: "#ffa42b" },
  { id: "red", color: "#f46e6e" },
];

const listeners = new Set<(id: string) => void>();
let active = "";
let off: (() => void) | null = null;
let safeMode = false;

function readStored(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persist(): void {
  try {
    if (active) window.localStorage.setItem(STORAGE_KEY, active);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage can be blocked */
  }
}

export function initAccent(isSafeMode: boolean): void {
  safeMode = isSafeMode;
  const stored = readStored();
  active = ACCENT_PRESETS.some((preset) => preset.id === stored) ? stored : "";
  apply();
}

export function getAccent(): string {
  return active;
}

export function setAccent(id: string): void {
  active = ACCENT_PRESETS.some((preset) => preset.id === id) ? id : "";
  persist();
  apply();

  for (const listener of [...listeners]) {
    try {
      listener(active);
    } catch (error) {
      console.error("[sxe] accent listener failed", error);
    }
  }
}

export function onAccentChange(handler: (id: string) => void): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

function apply(): void {
  off?.();
  off = null;

  if (safeMode) return;

  const preset = ACCENT_PRESETS.find((item) => item.id === active);
  if (!preset) return;

  off = addCss(
    `:root {
  --text-bright-accent: ${preset.color};
  --essential-bright-accent: ${preset.color};
  --spice-button: ${preset.color};
  --spice-button-active: ${preset.color};
}`,
    "accent",
  );
}
