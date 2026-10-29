import path from "node:path";
import { promises as fsp } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { exists, listDir, readTextOrNull, toId } from "./fsx";
import { readBackupManifest } from "./backup";
import { SXE_DIR, SXE_MARKER_START } from "./constants";
import type {
  Arch,
  InstallState,
  InstallVariant,
  PatchedBy,
  SpotifyInstall,
} from "../shared/types";

interface Candidate {
  root: string;
  variant: InstallVariant;
}

function envValue(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

async function collectCandidates(extraRoots: string[]): Promise<Candidate[]> {
  const list: Candidate[] = [];

  const push = (root: string | null, variant: InstallVariant): void => {
    if (!root) return;
    const normalized = path.resolve(root);
    if (list.some((item) => item.root.toLowerCase() === normalized.toLowerCase())) {
      return;
    }
    list.push({ root: normalized, variant });
  };

  const appData = envValue("APPDATA");
  if (appData) push(path.join(appData, "Spotify"), "normal");

  const programFiles = envValue("PROGRAMFILES");
  if (programFiles) push(path.join(programFiles, "Spotify"), "normal");

  const programFilesX86 = envValue("PROGRAMFILES(X86)");
  if (programFilesX86) push(path.join(programFilesX86, "Spotify"), "normal");

  const localAppData = envValue("LOCALAPPDATA");
  if (localAppData) {
    const packages = path.join(localAppData, "Packages");
    for (const entry of await listDir(packages)) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith("SpotifyAB.SpotifyMusic_")) continue;
      push(path.join(packages, entry.name, "LocalState", "Spotify"), "store");
    }
  }

  for (const extra of extraRoots) {
    const variant: InstallVariant = /\\Packages\\/i.test(extra) ? "store" : "normal";
    push(extra, variant);
  }

  return list;
}

async function readVersion(root: string): Promise<string | null> {
  const raw = await readTextOrNull(path.join(root, "prefs"));
  if (!raw) return null;

  const launched = /app\.last-launched-version="([^"]+)"/.exec(raw);
  if (launched && launched[1]) return launched[1];

  const plain = /app\.version="([^"]+)"/.exec(raw);
  if (plain && plain[1]) return plain[1];

  return null;
}

async function readArch(exePath: string): Promise<Arch> {
  if (!(await exists(exePath))) return "unknown";

  let handle: FileHandle | null = null;
  try {
    handle = await fsp.open(exePath, "r");

    const dos = Buffer.alloc(64);
    await handle.read(dos, 0, 64, 0);
    if (dos[0] !== 0x4d || dos[1] !== 0x5a) return "unknown";

    const peOffset = dos.readUInt32LE(0x3c);
    const head = Buffer.alloc(6);
    await handle.read(head, 0, 6, peOffset);
    if (head.readUInt32LE(0) !== 0x00004550) return "unknown";

    switch (head.readUInt16LE(4)) {
      case 0x8664:
        return "x64";
      case 0x014c:
        return "ia32";
      case 0xaa64:
        return "arm64";
      default:
        return "unknown";
    }
  } catch {
    return "unknown";
  } finally {
    if (handle) await handle.close();
  }
}

async function readState(
  xpuiPath: string,
): Promise<{ state: InstallState; patchedBy: PatchedBy }> {
  const hasOwnDir = await exists(path.join(xpuiPath, SXE_DIR));
  const html = await readTextOrNull(path.join(xpuiPath, "index.html"));

  if (!html) {
    return { state: "partial", patchedBy: hasOwnDir ? "sxe" : "none" };
  }

  if (html.includes(SXE_MARKER_START)) {
    const runtime = await exists(path.join(xpuiPath, SXE_DIR, "runtime.js"));
    return runtime
      ? { state: "patched", patchedBy: "sxe" }
      : { state: "partial", patchedBy: "sxe" };
  }

  if (/spicetify/i.test(html)) {
    return { state: "foreign", patchedBy: "spicetify" };
  }

  if (hasOwnDir) {
    return { state: "partial", patchedBy: "sxe" };
  }

  return { state: "stock", patchedBy: "none" };
}

async function describe(
  candidate: Candidate,
  backupRoot: string,
): Promise<SpotifyInstall | null> {
  const appsPath = path.join(candidate.root, "Apps");
  if (!(await exists(appsPath))) return null;

  const xpuiPath = path.join(appsPath, "xpui");
  const id = toId(candidate.root);
  const version = await readVersion(candidate.root);
  const arch = await readArch(path.join(candidate.root, "Spotify.exe"));
  const backup = await readBackupManifest(backupRoot, id);

  const base: SpotifyInstall = {
    id,
    name: "Spotify",
    root: candidate.root,
    appsPath,
    xpuiPath,
    variant: candidate.variant,
    version,
    arch,
    state: "stock",
    patchedBy: "none",
    hasBackup: backup !== null,
    backupAt: backup ? backup.createdAt : null,
    note: null,
  };

  if (!(await exists(xpuiPath))) {
    const hasSpa = await exists(path.join(appsPath, "xpui.spa"));
    return hasSpa
      ? { ...base, state: "unsupported" as const, note: "spa" }
      : null;
  }

  const { state, patchedBy } = await readState(xpuiPath);
  return { ...base, state, patchedBy };
}

export async function detectInstalls(
  backupRoot: string,
  extraRoots: string[] = [],
): Promise<SpotifyInstall[]> {
  const results: SpotifyInstall[] = [];

  for (const candidate of await collectCandidates(extraRoots)) {
    const install = await describe(candidate, backupRoot);
    if (install) results.push(install);
  }

  const rank = (variant: InstallVariant): number => (variant === "normal" ? 0 : 1);
  results.sort((a, b) => rank(a.variant) - rank(b.variant) || a.root.localeCompare(b.root));

  return results;
}

export async function readInstallsFor(
  installs: SpotifyInstall[],
  id: string,
): Promise<SpotifyInstall | null> {
  return installs.find((item) => item.id === id) ?? null;
}
