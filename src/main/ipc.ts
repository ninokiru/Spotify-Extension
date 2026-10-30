import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import type { Engine } from "../engine";
import { ensureDir, exists } from "../engine/fsx";
import { IPC } from "../shared/channels";
import { REPO_URL } from "../shared/links";
import type { AppSettings, OpResult } from "../shared/types";
import type { ModuleKind } from "../shared/modules";
import type { SettingsStore } from "./settings";
import type { Updater } from "./updater";

export interface IpcContext {
  engine: Engine;
  settings: SettingsStore;
  updater: Updater;
  appVersion: string;
  getWindow: () => BrowserWindow | null;
}

function enablePatch(
  settings: AppSettings,
  kind: ModuleKind,
  id: string,
): Partial<AppSettings> {
  if (kind === "theme") return { theme: id };
  if (kind === "snippet") {
    return { snippets: [...new Set([...settings.snippets, id])] };
  }
  return { extensions: [...new Set([...settings.extensions, id])] };
}

function disablePatch(
  settings: AppSettings,
  kind: ModuleKind,
  id: string,
): Partial<AppSettings> {
  if (kind === "theme") return { theme: settings.theme === id ? null : settings.theme };
  if (kind === "snippet") {
    return { snippets: settings.snippets.filter((item) => item !== id) };
  }
  return { extensions: settings.extensions.filter((item) => item !== id) };
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

  ipcMain.handle(IPC.storeCatalog, async () => {
    const current = await syncRoots(await settings.read());
    return engine.catalog(REPO_URL, current);
  });

  ipcMain.handle(IPC.storeInstall, async (_event, id: unknown): Promise<OpResult> => {
    if (typeof id !== "string") return { ok: false, code: "store.error.notFound" };

    const current = await syncRoots(await settings.read());
    const catalog = await engine.catalog(REPO_URL, current);
    const entry = catalog.modules.find((item) => item.id === id);
    if (!entry) return { ok: false, code: "store.error.notFound" };

    try {
      await engine.installFiles(entry);
    } catch (error) {
      return { ok: false, code: "store.error.download", detail: String(error) };
    }

    const next = await settings.patch(enablePatch(current, entry.kind, entry.id));
    await syncRoots(next);

    if (next.installId) {
      const applied = await engine.install(next.installId, next);
      if (!applied.ok) return applied;
    }

    return { ok: true, code: "store.install.done" };
  });

  ipcMain.handle(IPC.storeUninstall, async (_event, id: unknown): Promise<OpResult> => {
    if (typeof id !== "string") return { ok: false, code: "store.error.notFound" };

    const current = await syncRoots(await settings.read());
    const catalog = await engine.catalog(REPO_URL, current);
    const entry = catalog.modules.find((item) => item.id === id);
    if (!entry) return { ok: false, code: "store.error.notFound" };

    await engine.uninstallFiles(entry);

    const next = await settings.patch(disablePatch(current, entry.kind, entry.id));
    await syncRoots(next);

    if (next.installId) {
      const applied = await engine.install(next.installId, next);
      if (!applied.ok) return applied;
    }

    return { ok: true, code: "store.uninstall.done" };
  });

  ipcMain.handle(IPC.storeUpdate, async (_event, id: unknown): Promise<OpResult> => {
    if (typeof id !== "string") return { ok: false, code: "store.error.notFound" };

    const current = await syncRoots(await settings.read());
    const catalog = await engine.catalog(REPO_URL, current);
    const entry = catalog.modules.find((item) => item.id === id);
    if (!entry) return { ok: false, code: "store.error.notFound" };

    try {
      await engine.installFiles(entry);
    } catch (error) {
      return { ok: false, code: "store.error.download", detail: String(error) };
    }

    if (current.installId) {
      const applied = await engine.install(current.installId, current);
      if (!applied.ok) return applied;
    }

    return { ok: true, code: "store.update.done" };
  });

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

  ipcMain.handle(IPC.getUpdateState, () => ctx.updater.get());
  ipcMain.handle(IPC.checkUpdate, () => ctx.updater.check());
  ipcMain.handle(IPC.downloadUpdate, () => ctx.updater.download());
  ipcMain.handle(IPC.installUpdate, () => {
    ctx.updater.install();
  });
}
