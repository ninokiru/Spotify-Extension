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
import { listSnippets, readSnippetCss, type SnippetDir } from "./snippets";
import { buildColorsCss, listThemes, readThemeCss, type ThemeDir } from "./themes";
import {
  bundledCatalog,
  listLocalModules,
  mergeModules,
  readRegistry,
  removeModuleFiles,
  statusOf,
  writeModuleFiles,
  type StoreDirs,
} from "./store";
import { patchHtml, removePayload, unpatchHtml, writePayload } from "./apply";
import { SXE_DIR } from "./constants";
import { EngineError, toErrorCode } from "./errors";
import type {
  AppSettings,
  ExtensionInfo,
  OpResult,
  ProgressEvent,
  SnippetInfo,
  SpotifyInstall,
  ThemeInfo,
} from "../shared/types";
import type { ModuleEntry, StoreCatalog } from "../shared/modules";

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

  get bundledSnippetsDir(): string {
    return path.join(this.options.appRoot, "snippets");
  }

  get userSnippetsDir(): string {
    return path.join(this.options.userData, "snippets");
  }

  private get storeDirs(): StoreDirs {
    return {
      bundledExtensions: this.bundledExtensionsDir,
      userExtensions: this.userExtensionsDir,
      bundledThemes: this.bundledThemesDir,
      userThemes: this.userThemesDir,
      bundledSnippets: this.bundledSnippetsDir,
      userSnippets: this.userSnippetsDir,
    };
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
    await ensureDir(this.userSnippetsDir);
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

  async snippets(settings: AppSettings): Promise<SnippetInfo[]> {
    return listSnippets(this.snippetDirs());
  }

  /** Catalogue shown in the module store: bundled, remote and local files. */
  async catalog(repo: string, settings: AppSettings): Promise<StoreCatalog> {
    const registry = await readRegistry(repo);
    const local = await listLocalModules(this.storeDirs);

    const known = mergeModules(bundledCatalog(), registry.modules);
    const knownIds = new Set(known.map((entry) => entry.id));
    const extra = local.filter((entry) => !knownIds.has(entry.id));
    const modules = mergeModules(known, extra);

    const status: StoreCatalog["status"] = {};
    for (const entry of modules) {
      status[entry.id] = await statusOf(this.storeDirs, entry, {
        extensions: settings.extensions,
        snippets: settings.snippets,
        theme: settings.theme,
      });
    }

    return {
      modules,
      status,
      updatedAt: new Date().toISOString(),
      remote: registry.reachable,
    };
  }

  async installFiles(entry: ModuleEntry): Promise<void> {
    // Bundled modules already live in the app folder, only downloads are copied.
    if (entry.files.every((file) => file.url.length === 0)) return;
    await writeModuleFiles({ dirs: this.storeDirs, entry });
  }

  async uninstallFiles(entry: ModuleEntry): Promise<void> {
    await removeModuleFiles(this.storeDirs, entry);
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

  /** User folders come first so a downloaded update wins over the bundled copy. */
  private extensionDirs(): ExtensionDir[] {
    return [
      { dir: this.userExtensionsDir, bundled: false },
      { dir: this.bundledExtensionsDir, bundled: true },
    ];
  }

  private themeDirs(): ThemeDir[] {
    return [
      { dir: this.userThemesDir, bundled: false },
      { dir: this.bundledThemesDir, bundled: true },
    ];
  }

  private snippetDirs(): SnippetDir[] {
    return [
      { dir: this.userSnippetsDir, bundled: false },
      { dir: this.bundledSnippetsDir, bundled: true },
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

    for (const snippet of await this.snippets(settings)) {
      if (!settings.snippets.includes(snippet.id)) continue;
      parts.push(await readSnippetCss(snippet.path));
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
      language: settings.language,
      safeMode: settings.safeMode,
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
