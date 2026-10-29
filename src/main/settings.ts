import { readTextOrNull, writeText } from "../engine/fsx";
import { normalizeHex } from "../engine/themes";
import { COLOR_KEYS, DEFAULT_COLORS } from "../shared/colors";
import { isLanguage } from "../shared/i18n";
import type { AppSettings, Language } from "../shared/types";

function defaultSettings(language: Language): AppSettings {
  return {
    language,
    installId: null,
    customRoots: [],
    extensions: [],
    theme: null,
    colors: { ...DEFAULT_COLORS },
    customCss: "",
    autoApply: true,
  };
}

function sanitize(raw: unknown, language: Language): AppSettings {
  const base = defaultSettings(language);
  if (typeof raw !== "object" || raw === null) return base;

  const input = raw as Partial<AppSettings>;

  const colors: Record<string, string> = { ...base.colors };
  if (typeof input.colors === "object" && input.colors !== null) {
    for (const key of COLOR_KEYS) {
      const value = (input.colors as Record<string, unknown>)[key];
      if (typeof value === "string") {
        colors[key] = normalizeHex(value, base.colors[key]);
      }
    }
  }

  return {
    language: isLanguage(input.language) ? input.language : base.language,
    installId: typeof input.installId === "string" ? input.installId : null,
    customRoots: Array.isArray(input.customRoots)
      ? input.customRoots.filter((item): item is string => typeof item === "string")
      : [],
    extensions: Array.isArray(input.extensions)
      ? input.extensions.filter((item): item is string => typeof item === "string")
      : [],
    theme: typeof input.theme === "string" ? input.theme : null,
    colors,
    customCss: typeof input.customCss === "string" ? input.customCss : "",
    autoApply: typeof input.autoApply === "boolean" ? input.autoApply : base.autoApply,
  };
}

export class SettingsStore {
  constructor(
    private readonly file: string,
    private readonly defaultLanguage: Language,
  ) {}

  async read(): Promise<AppSettings> {
    const raw = await readTextOrNull(this.file);
    if (!raw) return defaultSettings(this.defaultLanguage);

    try {
      return sanitize(JSON.parse(raw), this.defaultLanguage);
    } catch {
      return defaultSettings(this.defaultLanguage);
    }
  }

  async write(settings: AppSettings): Promise<AppSettings> {
    const clean = sanitize(settings, this.defaultLanguage);
    await writeText(this.file, `${JSON.stringify(clean, null, 2)}\n`);
    return clean;
  }

  async patch(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.read();
    const merged: AppSettings = {
      ...current,
      ...patch,
      colors: { ...current.colors, ...(patch.colors ?? {}) },
    };
    return this.write(merged);
  }
}
