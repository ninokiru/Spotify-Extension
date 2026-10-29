import path from "node:path";
import { app, BrowserWindow, nativeTheme, shell } from "electron";
import { Engine } from "../engine";
import { IPC } from "../shared/channels";
import type { Language } from "../shared/types";
import { registerIpc } from "./ipc";
import { SettingsStore } from "./settings";

let mainWindow: BrowserWindow | null = null;

function preferredLanguage(): Language {
  return app.getLocale().toLowerCase().startsWith("vi") ? "vi" : "en";
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: "#121212",
    title: "Spotify Extension",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#121212",
      symbolColor: "#b3b3b3",
      height: 44,
    },
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  void mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  void app.whenReady().then(async () => {
    app.setAppUserModelId("com.ninokiru.spotify-extension");
    nativeTheme.themeSource = "dark";

    const userData = app.getPath("userData");
    const settings = new SettingsStore(
      path.join(userData, "settings.json"),
      preferredLanguage(),
    );

    const engine = new Engine({
      appRoot: app.getAppPath(),
      userData,
      payloadFile: path.join(app.getAppPath(), "dist", "payload", "runtime.js"),
      appVersion: app.getVersion(),
      onProgress: (event) => {
        mainWindow?.webContents.send(IPC.progress, event);
      },
    });

    const current = await settings.read();
    engine.setCustomRoots(current.customRoots);
    await engine.prepare();

    registerIpc({
      engine,
      settings,
      appVersion: app.getVersion(),
      getWindow: () => mainWindow,
    });

    createWindow();

    if (current.autoApply && current.installId) {
      void engine.autoReapply(current.installId, current);
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}
