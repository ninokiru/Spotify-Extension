import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import { IPC } from "../shared/channels";
import type {
  AppSettings,
  BridgeApi,
  ExtensionInfo,
  OpResult,
  ProgressEvent,
  SpotifyInstall,
  ThemeInfo,
} from "../shared/types";

const api: BridgeApi = {
  app: {
    version: () => ipcRenderer.invoke(IPC.appVersion) as Promise<string>,
    platform: () => ipcRenderer.invoke(IPC.appPlatform) as Promise<string>,
    openExternal: (url) =>
      ipcRenderer.invoke(IPC.openExternal, url) as Promise<void>,
  },
  installs: {
    detect: () => ipcRenderer.invoke(IPC.detect) as Promise<SpotifyInstall[]>,
    chooseFolder: () =>
      ipcRenderer.invoke(IPC.chooseFolder) as Promise<string | null>,
    openFolder: (id) =>
      ipcRenderer.invoke(IPC.openInstallFolder, id) as Promise<void>,
  },
  actions: {
    install: (id) => ipcRenderer.invoke(IPC.install, id) as Promise<OpResult>,
    repair: (id) => ipcRenderer.invoke(IPC.repair, id) as Promise<OpResult>,
    uninstall: (id) =>
      ipcRenderer.invoke(IPC.uninstall, id) as Promise<OpResult>,
    restartSpotify: (id) =>
      ipcRenderer.invoke(IPC.restart, id) as Promise<OpResult>,
  },
  extensions: {
    list: () => ipcRenderer.invoke(IPC.listExtensions) as Promise<ExtensionInfo[]>,
    setEnabled: (id, enabled) =>
      ipcRenderer.invoke(IPC.setExtension, id, enabled) as Promise<ExtensionInfo[]>,
    openFolder: () => ipcRenderer.invoke(IPC.openExtensions) as Promise<void>,
    reload: () => ipcRenderer.invoke(IPC.listExtensions) as Promise<ExtensionInfo[]>,
  },
  themes: {
    list: () => ipcRenderer.invoke(IPC.listThemes) as Promise<ThemeInfo[]>,
    apply: (themeId) =>
      ipcRenderer.invoke(IPC.applyTheme, themeId) as Promise<OpResult>,
    openFolder: () => ipcRenderer.invoke(IPC.openThemes) as Promise<void>,
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.getSettings) as Promise<AppSettings>,
    patch: (patch) =>
      ipcRenderer.invoke(IPC.patchSettings, patch) as Promise<AppSettings>,
    openConfig: () => ipcRenderer.invoke(IPC.openConfig) as Promise<void>,
  },
  events: {
    onProgress: (cb) => {
      const listener = (_event: IpcRendererEvent, payload: ProgressEvent): void => {
        cb(payload);
      };
      ipcRenderer.on(IPC.progress, listener);
      return () => {
        ipcRenderer.removeListener(IPC.progress, listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("bridge", api);
