import { app } from "electron";
import { autoUpdater } from "electron-updater";
import type { UpdateState } from "../shared/types";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const EMPTY: UpdateState = {
  status: "idle",
  version: null,
  percent: 0,
  detail: null,
};

export class Updater {
  private state: UpdateState = { ...EMPTY };

  constructor(private readonly emit: (state: UpdateState) => void) {
    // Running from source has no app-update.yml, so every updater call would
    // throw. The UI shows "disabled" instead of an error.
    if (!app.isPackaged) {
      this.state = { ...EMPTY, status: "disabled" };
      return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("checking-for-update", () =>
      this.set({ status: "checking", percent: 0, detail: null }),
    );
    autoUpdater.on("update-available", (info) =>
      this.set({
        status: "available",
        version: info.version,
        percent: 0,
        detail: null,
      }),
    );
    autoUpdater.on("update-not-available", () =>
      this.set({ status: "none", version: null, percent: 0, detail: null }),
    );
    autoUpdater.on("download-progress", (progress) =>
      this.set({ status: "downloading", percent: Math.round(progress.percent) }),
    );
    autoUpdater.on("update-downloaded", (info) =>
      this.set({
        status: "downloaded",
        version: info.version,
        percent: 100,
        detail: null,
      }),
    );
    autoUpdater.on("error", (error) =>
      this.set({ status: "error", percent: 0, detail: messageOf(error) }),
    );
  }

  get(): UpdateState {
    return { ...this.state };
  }

  async check(): Promise<UpdateState> {
    if (!app.isPackaged) return this.get();

    try {
      this.set({ status: "checking", percent: 0, detail: null });
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.set({ status: "error", percent: 0, detail: messageOf(error) });
    }

    return this.get();
  }

  async download(): Promise<UpdateState> {
    if (!app.isPackaged || this.state.status !== "available") return this.get();

    try {
      this.set({ status: "downloading", percent: 0, detail: null });
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.set({ status: "error", percent: 0, detail: messageOf(error) });
    }

    return this.get();
  }

  install(): void {
    if (this.state.status !== "downloaded") return;
    autoUpdater.quitAndInstall(true, true);
  }

  private set(patch: Partial<UpdateState>): void {
    this.state = { ...this.state, ...patch };
    this.emit(this.get());
  }
}
