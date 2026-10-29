import path from "node:path";
import {
  copyDir,
  countFiles,
  exists,
  readTextOrNull,
  removeDir,
  writeText,
} from "./fsx";
import { BACKUP_MANIFEST } from "./constants";
import type { SpotifyInstall } from "../shared/types";

export interface BackupManifest {
  installId: string;
  version: string | null;
  createdAt: string;
  source: string;
  files: number;
}

export function backupDirFor(backupRoot: string, installId: string): string {
  return path.join(backupRoot, installId);
}

export async function readBackupManifest(
  backupRoot: string,
  installId: string,
): Promise<BackupManifest | null> {
  const raw = await readTextOrNull(
    path.join(backupDirFor(backupRoot, installId), BACKUP_MANIFEST),
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BackupManifest;
  } catch {
    return null;
  }
}

/**
 * Snapshots the current xpui folder the first time an install is patched.
 * Later calls are no-ops so a repair never overwrites the pristine copy with
 * our own files.
 */
export async function ensureBackup(
  backupRoot: string,
  install: Pick<SpotifyInstall, "id" | "xpuiPath" | "version">,
): Promise<BackupManifest> {
  const existing = await readBackupManifest(backupRoot, install.id);
  if (existing) return existing;

  const dir = backupDirFor(backupRoot, install.id);
  await removeDir(dir);

  const source = install.xpuiPath;
  await copyDir(source, path.join(dir, "xpui"));

  const manifest: BackupManifest = {
    installId: install.id,
    version: install.version,
    createdAt: new Date().toISOString(),
    source,
    files: await countFiles(path.join(dir, "xpui")),
  };

  await writeText(
    path.join(dir, BACKUP_MANIFEST),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  return manifest;
}

/** Copies the backup back over the live client. Returns false when none exists. */
export async function restoreBackup(
  backupRoot: string,
  install: Pick<SpotifyInstall, "id" | "xpuiPath">,
): Promise<boolean> {
  const source = path.join(backupDirFor(backupRoot, install.id), "xpui");
  if (!(await exists(source))) return false;
  await copyDir(source, install.xpuiPath);
  return true;
}
