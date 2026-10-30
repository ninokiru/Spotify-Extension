import path from "node:path";
import {
  copyFileEnsured,
  ensureDir,
  exists,
  readText,
  removeDir,
  writeText,
} from "./fsx";
import { SXE_DIR, SXE_MARKER_END, SXE_MARKER_START } from "./constants";
import { EngineError } from "./errors";
import type { ExtensionInfo } from "../shared/types";
import { DEFAULT_RUNTIME_SETTINGS } from "../shared/defaults";
import { REPO_URL } from "../shared/links";

export interface ApplyInput {
  xpuiPath: string;
  runtimeFile: string;
  colorsCss: string;
  userCss: string;
  extensions: ExtensionInfo[];
  appVersion: string;
  language: string;
  safeMode: boolean;
}

const BLOCK_PATTERN = /<!--\s*sxe:start\s*-->[\s\S]*?<!--\s*sxe:end\s*-->\s*/gi;

function buildBlock(): string {
  return [
    SXE_MARKER_START,
    `<link rel="stylesheet" href="${SXE_DIR}/colors.css">`,
    `<link rel="stylesheet" href="${SXE_DIR}/user.css">`,
    `<script src="${SXE_DIR}/manifest.js"></script>`,
    `<script src="${SXE_DIR}/runtime.js"></script>`,
    SXE_MARKER_END,
  ].join("\n");
}

export async function writePayload(input: ApplyInput): Promise<void> {
  const target = path.join(input.xpuiPath, SXE_DIR);

  await removeDir(target);
  await ensureDir(target);

  if (!(await exists(input.runtimeFile))) {
    throw new EngineError("op.error.generic", "runtime bundle is missing");
  }

  await copyFileEnsured(input.runtimeFile, path.join(target, "runtime.js"));
  await writeText(path.join(target, "colors.css"), input.colorsCss);
  await writeText(path.join(target, "user.css"), input.userCss);

  const extensionsDir = path.join(target, "extensions");
  await ensureDir(extensionsDir);

  const manifest = {
    version: input.appVersion,
    repo: REPO_URL,
    language: input.language,
    safeMode: input.safeMode,
    settings: DEFAULT_RUNTIME_SETTINGS,
    generatedAt: new Date().toISOString(),
    extensions: [] as { id: string; name: string; file: string }[],
  };

  for (const extension of input.extensions) {
    const fileName = `${extension.id}.js`;
    await copyFileEnsured(extension.file, path.join(extensionsDir, fileName));
    manifest.extensions.push({
      id: extension.id,
      name: extension.name,
      file: fileName,
    });
  }

  await writeText(
    path.join(target, "manifest.js"),
    `window.__sxeManifest = ${JSON.stringify(manifest)};\n`,
  );
}

export async function patchHtml(xpuiPath: string): Promise<void> {
  const file = path.join(xpuiPath, "index.html");
  if (!(await exists(file))) {
    throw new EngineError("op.error.unsupported", "index.html is missing");
  }

  const html = await readText(file);
  const clean = html.replace(BLOCK_PATTERN, "");
  const block = buildBlock();

  const bodyTag = /<body[^>]*>/i.exec(clean);
  const next =
    bodyTag === null
      ? `${clean}\n${block}\n`
      : `${clean.slice(0, bodyTag.index + bodyTag[0].length)}\n${block}\n${clean.slice(
          bodyTag.index + bodyTag[0].length,
        )}`;

  await writeText(file, next);
}

export async function unpatchHtml(xpuiPath: string): Promise<void> {
  const file = path.join(xpuiPath, "index.html");
  if (!(await exists(file))) return;

  const html = await readText(file);
  const clean = html.replace(BLOCK_PATTERN, "");
  if (clean !== html) {
    await writeText(file, clean);
  }
}

export async function removePayload(xpuiPath: string): Promise<void> {
  await removeDir(path.join(xpuiPath, SXE_DIR));
}
