import type { RuntimeSettings } from "../shared/api";
import { DEFAULT_RUNTIME_SETTINGS } from "../shared/defaults";

/** Legacy key that stored a full snapshot of every setting. */
const STORAGE_KEY = "sxe:settings";
/** Current key: only the values the user actually changed. */
const OVERRIDES_KEY = "sxe:overrides";

export const DEFAULT_SETTINGS = DEFAULT_RUNTIME_SETTINGS;

const listeners = new Set<(settings: RuntimeSettings) => void>();
let values: RuntimeSettings = { ...DEFAULT_SETTINGS };
let overrides: Partial<RuntimeSettings> = {};
let initialized = false;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readObject(key: string): Record<string, unknown> | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickBooleans(source: Record<string, unknown>): Partial<RuntimeSettings> {
  const result: Partial<RuntimeSettings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]) {
    const value = source[key];
    if (typeof value === "boolean") result[key] = value;
  }
  return result;
}

/**
 * The CLI config is the default; the panel only stores what the user changed,
 * so `sxe config check_update 0` still applies after a restart.
 */
function readOverrides(): Partial<RuntimeSettings> {
  const stored = readObject(OVERRIDES_KEY);
  if (stored) return pickBooleans(stored);

  const legacy = readObject(STORAGE_KEY);
  if (!legacy) return {};

  const result: Partial<RuntimeSettings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]) {
    const value = legacy[key];
    if (typeof value === "boolean" && value !== DEFAULT_SETTINGS[key]) {
      result[key] = value;
    }
  }
  return result;
}

export function initSettings(defaults?: Partial<RuntimeSettings>): void {
  overrides = readOverrides();
  values = { ...DEFAULT_SETTINGS, ...defaults, ...overrides };
  initialized = true;
}

export function getSettings(): RuntimeSettings {
  if (!initialized) initSettings();
  return { ...values };
}

function persist(): void {
  try {
    storage()?.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    /* storage can be blocked; the session keeps the value in memory */
  }
}

export function setSetting<K extends keyof RuntimeSettings>(
  key: K,
  value: RuntimeSettings[K],
): void {
  if (!initialized) initSettings();
  if (values[key] === value) return;

  const nextOverrides: Partial<RuntimeSettings> = { ...overrides };
  nextOverrides[key] = value;
  overrides = nextOverrides;

  const next: RuntimeSettings = { ...values };
  next[key] = value;
  values = next;
  persist();

  for (const listener of [...listeners]) {
    try {
      listener(getSettings());
    } catch (error) {
      console.error("[sxe] settings listener failed", error);
    }
  }
}

export function onSettingsChange(
  listener: (settings: RuntimeSettings) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
