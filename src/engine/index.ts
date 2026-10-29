import path from "node:path";
import { ensureDir, exists, removeDir, writeText } from "./fsx";
import { detectInstalls } from "./detect";
import {
  backupDirFor,
  ensureBackup,
  readBackupManifest,
  restoreBackup,
} from "./backup";
import { listExtensions, type ExtensionDir } from "./extensions";
import { buildColorsCss, listThemes, readThemeCss, type ThemeDir } from "./themes";
import { patchHtml, removePayload, unpatchHtml, writePayload } from "./apply";
import { SXE_DIR } from "./constants";
import { EngineError, toErrorCode } from "./errors";
import type {
  AppSettings,
  ExtensionInfo,
  OpResult,
  ProgressEvent,
  SpotifyInstall,
  ThemeInfo,
} from "../shared/types";

export interface EngineOptions {
  appRoot: string;
  userData: string;
  payloadFile: string;
  appVersion: string;
  onProgress?: (event: ProgressEvent) => void;
}

export class Engine {
  private busy = false;
  private customRoots: string[] = [];

  constructor(private readonly options: EngineOptions) {}

  setCustomRoots(roots: string[]): void {
    this.customRoots = [...roots];
  }

  get backupRoot(): string {
    return path.join(this.options.userData, "backups");
  }

  get userExtensionsDir(): string {
    return path.join(this.options.userData, "extensions");
  }

  get userThemesDir(): string {
    return path.join(this.options.userData, "themes");
  }

  get bundledExtensionsDir(): string {
    return path.join(this.options.appRoot, "extensions");
  }

  get bundledThemesDir(): string {
    return path.join(this.options.appRoot, "themes");
  }

  async prepare(): Promise<void> {
    await ensureDir(this.backupRoot);
    await ensureDir(this.userExtensionsDir);
    await ensureDir(this.userThemesDir);
  }

  async detect(): Promise<SpotifyInstall[]> {
    this.progress("detect", "progress.detect", 5);
    const installs = await detectInstalls(this.backupRoot, this.customRoots);
    this.progress("detect", "progress.done", 100);
    return installs;
  }

  async extensions(settings: AppSettings): Promise<ExtensionInfo[]> {
    return listExtensions(this.extensionDirs(), settings.extensions);
  }

  async themes(): Promise<ThemeInfo[]> {
    return listThemes(this.themeDirs());
  }

  async install(installId: string, settings: AppSettings): Promise<OpResult> {
    return this.run(async () => {
      const install = await this.resolve(installId);
      this.assertNotForeign(install);

      this.progress("apply", "progress.backup", 15);
      await this.ensureFreshBackup(install);

      await this.writeClient(install, settings);
      return { ok: true, code: "op.install.done" };
    });
  }

  async repair(installId: string, settings: AppSettings): Promise<OpResult> {
    return this.run(async () => {
      const install = await this.resolve(installId);
      this.assertNotForeign(install);

      this.progress("apply", "progress.backup", 15);
      await this.ensureFreshBackup(install);

      this.progress("apply", "progress.restore", 30);
      await restoreBackup(this.backupRoot, install);
      await removePayload(install.xpuiPath);

      await this.writeClient(install, settings);
      return { ok: true, code: "op.repair.done" };
    });
  }

  async uninstall(installId: string): Promise<OpResult> {
    return this.run(async () => {
      const install = await this.resolve(installId);
      const backup = await readBackupManifest(this.backupRoot, install.id);

      // A backup from another client version would downgrade the files Spotify
      // has already replaced, so only restore an exact match.
      if (backup && backup.version === install.version) {
        this.progress("restore", "progress.restore", 40);
        await restoreBackup(this.backupRoot, install);
      }

      await unpatchHtml(install.xpuiPath);
      await removePayload(install.xpuiPath);

      this.progress("restore", "progress.done", 100);
      return { ok: true, code: "op.uninstall.done" };
    });
  }

  async applyTheme(installId: string, settings: AppSettings): Promise<OpResult> {
    return this.run(async () => {
      const install = await this.resolve(installId);
      const styleDir = path.join(install.xpuiPath, SXE_DIR);

      // Colours are already stored in the settings, so an install that is not
      // patched yet simply picks them up on the next patch.
      if (!(await exists(path.join(styleDir, "runtime.js")))) {
        return { ok: true, code: "op.theme.done" };
      }

      await writeText(
        path.join(styleDir, "colors.css"),
        buildColorsCss(settings.colors),
      );
      await writeText(path.join(styleDir, "user.css"), await this.composeUserCss(settings));

      return { ok: true, code: "op.theme.done" };
    });
  }

  /** Drops the whole modification when the app starts and Spotify replaced it. */
  async autoReapply(installId: string, settings: AppSettings): Promise<boolean> {
    const install = await this.resolve(installId).catch(() => null);
    if (!install) return false;
    if (install.state !== "stock") return false;

    const result = await this.install(installId, settings);
    return result.ok;
  }

  private extensionDirs(): ExtensionDir[] {
    return [
      { dir: this.bundledExtensionsDir, bundled: true },
      { dir: this.userExtensionsDir, bundled: false },
    ];
  }

  private themeDirs(): ThemeDir[] {
    return [
      { dir: this.bundledThemesDir, bundled: true },
      { dir: this.userThemesDir, bundled: false },
    ];
  }

  /**
   * Spotify updates replace the whole client, so a backup taken on an older
   * version must be refreshed before it is used again.
   */
  private async ensureFreshBackup(install: SpotifyInstall): Promise<void> {
    const backup = await readBackupManifest(this.backupRoot, install.id);
    const stale = backup !== null && backup.version !== install.version;

    if (stale && install.state === "stock") {
      await removeDir(backupDirFor(this.backupRoot, install.id));
    }

    await ensureBackup(this.backupRoot, install);
  }

  private async composeUserCss(settings: AppSettings): Promise<string> {
    const parts: string[] = [];

    if (settings.theme) {
      const theme = (await this.themes()).find((item) => item.id === settings.theme);
      if (theme) parts.push(await readThemeCss(theme.path));
    }

    if (settings.customCss.trim().length > 0) {
      parts.push(settings.customCss);
    }

    return parts.join("\n\n");
  }

  private async writeClient(
    install: SpotifyInstall,
    settings: AppSettings,
  ): Promise<void> {
    const enabled = (await this.extensions(settings)).filter((item) => item.enabled);

    this.progress("apply", "progress.styles", 40);
    const colorsCss = buildColorsCss(settings.colors);
    const userCss = await this.composeUserCss(settings);

    this.progress("apply", "progress.payload", 60);
    await writePayload({
      xpuiPath: install.xpuiPath,
      runtimeFile: this.options.payloadFile,
      colorsCss,
      userCss,
      extensions: enabled,
      appVersion: this.options.appVersion,
    });

    this.progress("apply", "progress.patch", 85);
    await patchHtml(install.xpuiPath);
    this.progress("apply", "progress.done", 100);
  }

  private async resolve(installId: string): Promise<SpotifyInstall> {
    const installs = await this.detect();
    const install = installs.find((item) => item.id === installId);

    if (!install) throw new EngineError("op.error.notFound");
    if (install.state === "unsupported") throw new EngineError("op.error.unsupported");

    return install;
  }

  private assertNotForeign(install: SpotifyInstall): void {
    if (install.state === "foreign") {
      throw new EngineError("op.error.foreignPatch");
    }
  }

  private progress(
    task: ProgressEvent["task"],
    code: string,
    percent: number,
  ): void {
    this.options.onProgress?.({ task, code, percent });
  }

  private async run(fn: () => Promise<OpResult>): Promise<OpResult> {
    if (this.busy) {
      return { ok: false, code: "op.error.busy" };
    }

    this.busy = true;
    try {
      return await fn();
    } catch (error) {
      const { code, detail } = toErrorCode(error);
      return { ok: false, code, detail };
    } finally {
      this.busy = false;
    }
  }
}
