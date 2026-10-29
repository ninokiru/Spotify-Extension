import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";

export async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

export async function readText(target: string): Promise<string> {
  return fs.readFile(target, "utf8");
}

export async function readTextOrNull(target: string): Promise<string | null> {
  try {
    return await fs.readFile(target, "utf8");
  } catch {
    return null;
  }
}

export async function writeText(target: string, data: string): Promise<void> {
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, data, "utf8");
}

export async function removeDir(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
}

export async function listDir(target: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(target, { withFileTypes: true });
  } catch {
    return [];
  }
}

export async function statOrNull(target: string) {
  try {
    return await fs.stat(target);
  } catch {
    return null;
  }
}

export async function copyFileEnsured(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

/** Recursively copies `src` into `dest`, creating directories as needed. */
export async function copyDir(src: string, dest: string): Promise<void> {
  const entries = await listDir(src);
  await ensureDir(dest);

  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isSymbolicLink()) {
      continue;
    } else {
      await fs.copyFile(from, to);
    }
  }
}

export async function countFiles(dir: string): Promise<number> {
  const entries = await listDir(dir);
  let total = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      total += await countFiles(path.join(dir, entry.name));
    } else {
      total += 1;
    }
  }
  return total;
}

/** Returns a stable, filesystem-safe id for an install root. */
export function toId(root: string): string {
  return root
    .toLowerCase()
    .replace(/^[a-z]:/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "spotify";
}
