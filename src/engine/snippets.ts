import path from "node:path";
import { exists, listDir, readTextOrNull } from "./fsx";
import type { SnippetInfo } from "../shared/types";

export interface SnippetDir {
  dir: string;
  bundled: boolean;
}

export async function listSnippets(dirs: SnippetDir[]): Promise<SnippetInfo[]> {
  const found = new Map<string, SnippetInfo>();

  for (const source of dirs) {
    for (const entry of await listDir(source.dir)) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".css")) continue;

      const id = entry.name.slice(0, -4);
      if (found.has(id)) continue;

      found.set(id, {
        id,
        name: id,
        path: path.join(source.dir, entry.name),
        bundled: source.bundled,
        hasCss: await exists(path.join(source.dir, entry.name)),
      });
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function readSnippetCss(file: string): Promise<string> {
  return (await readTextOrNull(file)) ?? "";
}
