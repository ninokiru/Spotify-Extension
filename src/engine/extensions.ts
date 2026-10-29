import path from "node:path";
import { listDir, readTextOrNull } from "./fsx";
import type { ExtensionInfo } from "../shared/types";

export interface ExtensionDir {
  dir: string;
  bundled: boolean;
}

interface Header {
  name: string;
  author: string;
  description: string;
  version: string;
}

function parseHeader(source: string, fallback: string): Header {
  const head = source.slice(0, 4096);

  const pick = (key: string): string | null => {
    const pattern = new RegExp(`^\\s*//\\s*${key}\\s*:\\s*(.+)$`, "im");
    const match = pattern.exec(head);
    return match && match[1] ? match[1].trim() : null;
  };

  return {
    name: pick("NAME") ?? fallback,
    author: pick("AUTHOR") ?? "",
    description: pick("DESCRIPTION") ?? "",
    version: pick("VERSION") ?? "1.0.0",
  };
}

export async function listExtensions(
  dirs: ExtensionDir[],
  enabled: string[],
): Promise<ExtensionInfo[]> {
  const found = new Map<string, ExtensionInfo>();

  for (const source of dirs) {
    for (const entry of await listDir(source.dir)) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith(".js")) continue;

      const id = entry.name.slice(0, -3);
      if (found.has(id)) continue;

      const file = path.join(source.dir, entry.name);
      const content = (await readTextOrNull(file)) ?? "";
      const header = parseHeader(content, id);

      found.set(id, {
        id,
        name: header.name,
        author: header.author,
        description: header.description,
        version: header.version,
        file,
        bundled: source.bundled,
        enabled: enabled.includes(id),
        size: Buffer.byteLength(content, "utf8"),
      });
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}
