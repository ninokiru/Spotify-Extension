import { getRequire } from "./chunks";
import { copyText } from "./clipboard";
import { extensionFailures } from "./extensions";
import { tx } from "./text";
import { toast } from "./ui";

export interface DiagnosticRow {
  label: string;
  value: string;
  ok: boolean;
}

export interface DiagnosticsInput {
  version: string;
  safeMode: boolean;
  extensions: () => string[];
}

const PLAY = '[data-testid="control-button-playpause"]';
const DURATION = '[data-testid="playback-duration"]';

function storageWorks(): boolean {
  try {
    const probe = "sxe:probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function extensionValue(loaded: string[]): string {
  if (extensionFailures.length === 0) return String(loaded.length);

  const failed = extensionFailures
    .map((failure) => `${failure.id} (${failure.reason})`)
    .join(", ");
  return `${loaded.length} · ${failed}`;
}

export function collectDiagnostics(input: DiagnosticsInput): DiagnosticRow[] {
  const require = getRequire();
  const cache = require?.c;
  let modules = 0;
  if (cache) {
    try {
      modules = Object.keys(cache).length;
    } catch {
      modules = 0;
    }
  }

  const play = document.querySelector(PLAY);
  const duration = document.querySelector(DURATION);
  const storage = storageWorks();
  const ok = tx("spotify.panel.diagOk");
  const fail = tx("spotify.panel.diagFail");
  const loaded = input.extensions();

  return [
    { label: tx("spotify.panel.diagRuntime"), value: `v${input.version}`, ok: true },
    {
      label: tx("spotify.panel.diagWebpack"),
      value: require ? ok : fail,
      ok: require !== null,
    },
    {
      label: tx("spotify.panel.diagModules"),
      value: String(modules),
      ok: modules > 0,
    },
    {
      label: tx("spotify.panel.diagControls"),
      value: play ? ok : fail,
      ok: play !== null,
    },
    {
      label: tx("spotify.panel.diagDuration"),
      value: duration ? ok : fail,
      ok: duration !== null,
    },
    {
      label: tx("spotify.panel.diagExtensions"),
      value: extensionValue(loaded),
      ok: extensionFailures.length === 0,
    },
    {
      label: tx("spotify.panel.diagStorage"),
      value: storage ? ok : fail,
      ok: storage,
    },
    {
      label: tx("spotify.panel.diagSafe"),
      value: input.safeMode ? tx("spotify.panel.diagOn") : tx("spotify.panel.diagOff"),
      ok: true,
    },
  ];
}

export function diagnosticsReport(
  input: DiagnosticsInput,
  rows: DiagnosticRow[],
): string {
  const lines = [
    `Spotify Extension v${input.version}`,
    `Generated: ${new Date().toISOString()}`,
    `Page: ${location.href}`,
    `User agent: ${navigator.userAgent}`,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
  ];

  return lines.join("\n");
}

export async function copyDiagnostics(
  input: DiagnosticsInput,
  rows: DiagnosticRow[],
): Promise<boolean> {
  const copied = await copyText(diagnosticsReport(input, rows));
  if (copied) toast(tx("spotify.panel.diagCopied"), 2600);
  return copied;
}
