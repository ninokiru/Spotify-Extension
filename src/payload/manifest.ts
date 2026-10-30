import type { RuntimeSettings } from "../shared/api";
import { REPO_URL } from "../shared/links";
import type { ManifestExtension } from "./extensions";

export interface Manifest {
  version?: string;
  repo?: string;
  language?: string;
  safeMode?: boolean;
  settings?: Partial<RuntimeSettings>;
  extensions?: ManifestExtension[];
}

/**
 * Written by the patcher as `sxe/manifest.js` and loaded before this script.
 * Read from the global instead of fetch(), which the client's file:// origin
 * blocks.
 */
export function readManifest(): Manifest {
  const value = (window as unknown as { __sxeManifest?: Manifest }).__sxeManifest;
  return value !== null && typeof value === "object" ? value : {};
}

export function manifestRepo(manifest: Manifest): string {
  const repo = manifest.repo;
  if (typeof repo !== "string" || !repo.startsWith("https://github.com/")) {
    return REPO_URL;
  }
  return repo.replace(/\/+$/, "");
}
