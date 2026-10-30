import type { RuntimeSettings } from "../shared/api";
import { DEFAULT_RUNTIME_SETTINGS } from "../shared/defaults";

const STORAGE_KEY = "sxe:settings";

export const DEFAULT_SETTINGS = DEFAULT_RUNTIME_SETTINGS;

const listeners = new Set<(settings: RuntimeSettings) => void>();
let values: RuntimeSettings = { ...DEFAULT_SETTINGS };
let initialized = false;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored(): Partial<RuntimeSettings> {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return {};
  }
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<RuntimeSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]) {
      const value = parsed[key];
      if (typeof value === "boolean") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function initSettings(defaults?: Partial<RuntimeSettings>): void {
  values = { ...DEFAULT_SETTINGS, ...defaults, ...readStored() };
  initialized = true;
}

export function getSettings(): RuntimeSettings {
  if (!initialized) initSettings();
  return { ...values };
}

function persist(): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(values));
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
