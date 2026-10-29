import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import type { Engine } from "../engine";
import { ensureDir, exists } from "../engine/fsx";
import { IPC } from "../shared/channels";
import type { AppSettings, OpResult } from "../shared/types";
import type { SettingsStore } from "./settings";

export interface IpcContext {
  engine: Engine;
  settings: SettingsStore;
  appVersion: string;
  getWindow: () => BrowserWindow | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Accepts either the client root, the Apps folder or the xpui folder. */
function normalizeRoot(picked: string): string {
  let current = path.resolve(picked);

  if (path.basename(current).toLowerCase() === "xpui") {
    current = path.dirname(current);
  }
  if (path.basename(current).toLowerCase() === "apps") {
    current = path.dirname(current);
  }

  return current;
}

async function isSpotifyRoot(root: string): Promise<boolean> {
  return exists(path.join(root, "Apps"));
}

async function restartSpotify(root: string): Promise<boolean> {
  if (process.platform !== "win32") return false;

  await new Promise<void>((resolve) => {
    execFile(
      "taskkill",
      ["/IM", "Spotify.exe"],
      { windowsHide: true },
      () => resolve(),
    );
  });

  await delay(1500);

  const exe = path.join(root, "Spotify.exe");
  if (!(await exists(exe))) return false;

  const child = spawn(exe, [], { detached: true, stdio: "ignore" });
  child.unref();
  return true;
}

async function pickFolder(win: BrowserWindow | null): Promise<string | null> {
  const result = win
    ? await dialog.showOpenDialog(win, {
        title: "Select the Spotify folder",
        properties: ["openDirectory"],
      })
    : await dialog.showOpenDialog({
        title: "Select the Spotify folder",
        properties: ["openDirectory"],
      });

  if (result.canceled || result.filePaths.length === 0) return null;

  const root = normalizeRoot(result.filePaths[0]);
  if (!(await isSpotifyRoot(root))) return null;

  return root;
}

export function registerIpc(ctx: IpcContext): void {
  const { engine, settings, getWindow } = ctx;

  const syncRoots = async (value: AppSettings): Promise<AppSettings> => {
    engine.setCustomRoots(value.customRoots);
    return value;
  };

  ipcMain.handle(IPC.appVersion, () => ctx.appVersion);
  ipcMain.handle(IPC.appPlatform, () => process.platform);

  ipcMain.handle(IPC.openExternal, async (_event, url: unknown) => {
    if (typeof url !== "string") return;
    if (!/^https:\/\//i.test(url)) return;
    await shell.openExternal(url);
  });

  ipcMain.handle(IPC.detect, async () => {
    const current = await syncRoots(await settings.read());
    return engine.detect();
  });

  ipcMain.handle(IPC.chooseFolder, async () => {
    const root = await pickFolder(getWindow());
    if (!root) return null;

    const current = await settings.read();
    if (!current.customRoots.includes(root)) {
      await settings.patch({ customRoots: [...current.customRoots, root] });
    }

    return root;
  });

  ipcMain.handle(IPC.openInstallFolder, async (_event, id: unknown) => {
    if (typeof id !== "string") return;

    await syncRoots(await settings.read());
    const installs = await engine.detect();
    const install = installs.find((item) => item.id === id);
    if (!install) return;

    await ensureDir(install.root);
    await shell.openPath(install.root);
  });

  ipcMain.handle(IPC.install, async (_event, id: unknown): Promise<OpResult> => {
    if (typeof id !== "string") return { ok: false, code: "op.error.noInstall" };

    const current = await syncRoots(await settings.read());
    const result = await engine.install(id, current);
    if (result.ok) await settings.patch({ installId: id });
    return result;
  });

  ipcMain.handle(IPC.repair, async (_event, id: unknown): Promise<OpResult> => {
    if (typeof id !== "string") return { ok: false, code: "op.error.noInstall" };

    const current = await syncRoots(await settings.read());
    const result = await engine.repair(id, current);
    if (result.ok) await settings.patch({ installId: id });
    return result;
  });

  ipcMain.handle(IPC.uninstall, async (_event, id: unknown): Promise<OpResult> => {
    if (typeof id !== "string") return { ok: false, code: "op.error.noInstall" };

    const result = await engine.uninstall(id);
    if (result.ok) await settings.patch({ installId: null });
    return result;
  });

  ipcMain.handle(IPC.restart, async (_event, id: unknown): Promise<OpResult> => {
    if (typeof id !== "string") return { ok: false, code: "op.error.noInstall" };

    const current = await syncRoots(await settings.read());
    const installs = await engine.detect();
    const install = installs.find((item) => item.id === id);
    if (!install) return { ok: false, code: "op.error.notFound" };

    const ok = await restartSpotify(install.root);
    return ok
      ? { ok: true, code: "op.restart.done" }
      : { ok: false, code: "op.restart.failed" };
  });

  ipcMain.handle(IPC.listExtensions, async () => {
    const current = await settings.read();
    return engine.extensions(current);
  });

  ipcMain.handle(
    IPC.setExtension,
    async (_event, id: unknown, enabled: unknown) => {
      const current = await settings.read();

      if (typeof id === "string") {
        const set = new Set(current.extensions);
        if (enabled === true) set.add(id);
        else set.delete(id);

        const next = await settings.patch({ extensions: [...set] });
        await syncRoots(next);

        if (next.installId) {
          await engine.install(next.installId, next);
        }

        return engine.extensions(next);
      }

      return engine.extensions(current);
    },
  );

  ipcMain.handle(IPC.openExtensions, async () => {
    await ensureDir(engine.userExtensionsDir);
    await shell.openPath(engine.userExtensionsDir);
  });

  ipcMain.handle(IPC.listThemes, async () => engine.themes());

  ipcMain.handle(IPC.applyTheme, async (_event, themeId: unknown): Promise<OpResult> => {
    const current = await settings.read();
    const theme = typeof themeId === "string" ? themeId : null;
    const next = await settings.patch({ theme });
    await syncRoots(next);

    if (next.installId) {
      return engine.applyTheme(next.installId, next);
    }

    return { ok: true, code: "op.theme.done" };
  });

  ipcMain.handle(IPC.openThemes, async () => {
    await ensureDir(engine.userThemesDir);
    await shell.openPath(engine.userThemesDir);
  });

  ipcMain.handle(IPC.getSettings, async () => settings.read());

  ipcMain.handle(IPC.openConfig, async () => {
    const root = path.dirname(engine.userExtensionsDir);
    await ensureDir(root);
    await shell.openPath(root);
  });

  ipcMain.handle(IPC.patchSettings, async (_event, patch: unknown) => {
    if (typeof patch !== "object" || patch === null) {
      return settings.read();
    }

    const next = await settings.patch(patch as Partial<AppSettings>);
    await syncRoots(next);
    return next;
  });
}
