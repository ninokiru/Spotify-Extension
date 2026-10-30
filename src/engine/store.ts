import path from "node:path";
import { BUNDLED_MODULES } from "../shared/modules";
import type {
  ModuleEntry,
  ModuleKind,
  ModuleStatus,
  StoreCatalog,
} from "../shared/modules";
import { ensureDir, exists, listDir, readTextOrNull, removeDir, writeText } from "./fsx";

export interface StoreDirs {
  bundledExtensions: string;
  userExtensions: string;
  bundledThemes: string;
  userThemes: string;
  bundledSnippets: string;
  userSnippets: string;
}

const REGISTRY_PATH = "store/modules.json";

function registryUrl(repo: string): string {
  const base = repo.replace(/\/+$/, "");
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i.exec(base);
  if (!match) return "";

  return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/main/${REGISTRY_PATH}`;
}

export interface RegistryResult {
  modules: ModuleEntry[];
  /** False when the catalogue could not be reached. */
  reachable: boolean;
}

/** Reads the online catalogue. A missing or broken registry never breaks the app. */
export async function readRegistry(repo: string): Promise<RegistryResult> {
  const url = registryUrl(repo);
  if (!url) return { modules: [], reachable: false };

  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) return { modules: [], reachable: false };

    const payload = (await response.json()) as { modules?: unknown };
    if (!Array.isArray(payload.modules)) return { modules: [], reachable: false };

    const modules = payload.modules
      .map((item) => normalizeEntry(item))
      .filter((item): item is ModuleEntry => item !== null);

    return { modules, reachable: true };
  } catch {
    return { modules: [], reachable: false };
  }
}

function normalizeEntry(raw: unknown): ModuleEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const input = raw as Partial<ModuleEntry>;

  if (typeof input.id !== "string" || input.id.length === 0) return null;

  const kind: ModuleKind =
    input.kind === "theme" || input.kind === "snippet" ? input.kind : "extension";

  const files = Array.isArray(input.files)
    ? input.files
        .map((file) => {
          const entry = file as Partial<{ name: string; url: string }>;
          if (typeof entry.name !== "string" || typeof entry.url !== "string") return null;
          return { name: entry.name, url: entry.url };
        })
        .filter((file): file is { name: string; url: string } => file !== null)
    : [];

  const accent = Array.isArray(input.accent) ? input.accent : [];
  const accentA = typeof accent[0] === "string" ? accent[0] : "#1f1f1f";
  const accentB = typeof accent[1] === "string" ? accent[1] : "#101010";

  return {
    id: input.id,
    name: typeof input.name === "string" ? input.name : input.id,
    author: typeof input.author === "string" ? input.author : "",
    description: typeof input.description === "string" ? input.description : "",
    descriptionVi:
      typeof input.descriptionVi === "string" ? input.descriptionVi : "",
    version: typeof input.version === "string" ? input.version : "1.0.0",
    kind,
    downloads: typeof input.downloads === "number" ? input.downloads : 0,
    glyph: typeof input.glyph === "string" ? input.glyph : "sparkle",
    accent: [accentA, accentB],
    files,
    bundled: false,
  };
}

/** Modules found in the user folder but missing from the catalogue. */
export async function listLocalModules(dirs: StoreDirs): Promise<ModuleEntry[]> {
  const found: ModuleEntry[] = [];

  const extensions = await listDir(dirs.userExtensions);
  for (const entry of extensions) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    found.push({
      id: entry.name.slice(0, -3),
      name: entry.name.slice(0, -3),
      author: "",
      description: "",
      descriptionVi: "",
      version: "1.0.0",
      kind: "extension",
      downloads: 0,
      glyph: "sparkle",
      accent: ["#1f1f1f", "#101010"],
      files: [{ name: entry.name, url: "" }],
      bundled: false,
    });
  }

  const snippets = await listDir(dirs.userSnippets);
  for (const entry of snippets) {
    if (!entry.isFile() || !entry.name.endsWith(".css")) continue;
    found.push({
      id: entry.name.slice(0, -4),
      name: entry.name.slice(0, -4),
      author: "",
      description: "",
      descriptionVi: "",
      version: "1.0.0",
      kind: "snippet",
      downloads: 0,
      glyph: "sparkle",
      accent: ["#1f1f1f", "#101010"],
      files: [{ name: entry.name, url: "" }],
      bundled: false,
    });
  }

  return found;
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string): number[] =>
    value
      .split(/[.\-+]/)
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isNaN(part) ? 0 : part));

  const a = parse(left);
  const b = parse(right);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

/** Reads the version a module file was shipped with. */
export async function installedVersion(
  dirs: StoreDirs,
  entry: ModuleEntry,
): Promise<string | null> {
  if (entry.kind !== "extension") return null;

  const name = entry.files[0]?.name ?? `${entry.id}.js`;
  const folders = [dirs.userExtensions, dirs.bundledExtensions];

  for (const folder of folders) {
    const content = await readTextOrNull(path.join(folder, name));
    if (!content) continue;

    const match = /^\s*\/\/\s*VERSION\s*:\s*(.+)$/im.exec(content.slice(0, 2048));
    if (match && match[1]) return match[1].trim();
  }

  return null;
}

/**
 * Later groups win, but a bundled module keeps its files until the registry
 * ships a newer version of it.
 */
export function mergeModules(...groups: ModuleEntry[][]): ModuleEntry[] {
  const merged = new Map<string, ModuleEntry>();

  for (const group of groups) {
    for (const entry of group) {
      const current = merged.get(entry.id);
      if (!current) {
        merged.set(entry.id, entry);
        continue;
      }

      if (current.bundled && compareVersions(entry.version, current.version) <= 0) {
        continue;
      }

      merged.set(entry.id, { ...current, ...entry });
    }
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fileExists(dirs: StoreDirs, entry: ModuleEntry): Promise<boolean> {
  if (entry.kind === "theme") {
    for (const dir of [dirs.userThemes, dirs.bundledThemes]) {
      for (const file of entry.files) {
        if (await exists(path.join(dir, entry.id, file.name))) return true;
      }
    }
    return false;
  }

  if (entry.kind === "snippet") {
    const name = entry.files[0]?.name ?? `${entry.id}.css`;
    return (
      (await exists(path.join(dirs.userSnippets, name))) ||
      (await exists(path.join(dirs.bundledSnippets, name)))
    );
  }

  const name = entry.files[0]?.name ?? `${entry.id}.js`;
  return (
    (await exists(path.join(dirs.userExtensions, name))) ||
    (await exists(path.join(dirs.bundledExtensions, name)))
  );
}

export async function statusOf(
  dirs: StoreDirs,
  entry: ModuleEntry,
  enabled: { extensions: string[]; snippets: string[]; theme: string | null },
): Promise<ModuleStatus> {
  const installed = await fileExists(dirs, entry);
  const onDisk = await installedVersion(dirs, entry);
  const version = onDisk ?? (installed ? entry.version : null);
  const updateAvailable =
    installed && version !== null && compareVersions(entry.version, version) > 0;

  if (entry.kind === "theme") {
    return {
      installed,
      enabled: enabled.theme === entry.id,
      version,
      updateAvailable,
    };
  }

  const list = entry.kind === "snippet" ? enabled.snippets : enabled.extensions;
  const on = list.includes(entry.id);

  return {
    installed,
    enabled: on,
    version,
    updateAvailable,
  };
}

async function download(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  return response.text();
}

export interface InstallInput {
  dirs: StoreDirs;
  entry: ModuleEntry;
}

/** Writes the module files into the user folder. Bundled files are copied as they are. */
export async function writeModuleFiles(input: InstallInput): Promise<void> {
  const { dirs, entry } = input;

  if (entry.kind === "theme") {
    const folder = path.join(dirs.userThemes, entry.id);
    await ensureDir(folder);
    for (const file of entry.files) {
      const content = file.url
        ? await download(file.url)
        : ((await readTextOrNull(path.join(dirs.bundledThemes, entry.id, file.name))) ?? "");
      await writeText(path.join(folder, file.name), content);
    }
    return;
  }

  if (entry.kind === "snippet") {
    await ensureDir(dirs.userSnippets);
    for (const file of entry.files) {
      const content = file.url
        ? await download(file.url)
        : ((await readTextOrNull(path.join(dirs.bundledSnippets, file.name))) ?? "");
      await writeText(path.join(dirs.userSnippets, file.name), content);
    }
    return;
  }

  await ensureDir(dirs.userExtensions);
  for (const file of entry.files) {
    const content = file.url
      ? await download(file.url)
      : ((await readTextOrNull(path.join(dirs.bundledExtensions, file.name))) ?? "");
    await writeText(path.join(dirs.userExtensions, file.name), content);
  }
}

export async function removeModuleFiles(dirs: StoreDirs, entry: ModuleEntry): Promise<void> {
  if (entry.kind === "theme") {
    await removeDir(path.join(dirs.userThemes, entry.id));
    return;
  }

  if (entry.kind === "snippet") {
    for (const file of entry.files) {
      await removeDir(path.join(dirs.userSnippets, file.name));
    }
    return;
  }

  for (const file of entry.files) {
    await removeDir(path.join(dirs.userExtensions, file.name));
  }
}

export function bundledCatalog(): ModuleEntry[] {
  return BUNDLED_MODULES;
}

export type { StoreCatalog };
