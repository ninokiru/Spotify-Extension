import { translate } from "../shared/i18n";
import type { LanguageCode, TranslationKey } from "../shared/i18n";

function detect(): LanguageCode {
  try {
    return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
  } catch {
    return "en";
  }
}

let active: LanguageCode = detect();

/** The manager passes its own language through the manifest so both UIs agree. */
export function initLanguage(value?: string): void {
  if (value === "en" || value === "vi") active = value;
}

export function tx(key: TranslationKey, params?: Record<string, string | number>): string {
  return translate(active, key, params);
}
