import type { SpotifyExtensionApi } from "../shared/api";
import { initAccent } from "./accent";
import { getRequire, installChunkHooks } from "./chunks";
import { observe, waitFor } from "./dom";
import { loadExtensionScripts } from "./extensions";
import { scanCache } from "./internal";
import { registerKey } from "./keys";
import { manifestRepo, readManifest } from "./manifest";
import { createPanel } from "./panel";
import {
  available,
  getVolume,
  next,
  on as onPlayer,
  pause,
  play,
  previous,
  seek,
  setVolume,
  snapshot,
  startDiscovery,
  toggle,
  track,
} from "./player";
import { getSettings, initSettings, onSettingsChange, setSetting } from "./settings";
import { initLanguage } from "./text";
import { installTweaks } from "./tweaks";
import { addCss, ensureStyles, toast } from "./ui";
import { checkUpdate, initUpdate, onUpdateChange, updateInfo } from "./update";

const appState = { version: "0.0.0" };
const loadedExtensions: string[] = [];
const bus = new Map<string, Set<(payload?: unknown) => void>>();

let resolveReady: () => void = () => undefined;
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

function onBusEvent(name: string, handler: (payload?: unknown) => void): () => void {
  let handlers = bus.get(name);
  if (!handlers) {
    handlers = new Set();
    bus.set(name, handlers);
  }

  handlers.add(handler);
  return () => {
    handlers?.delete(handler);
  };
}

function emitBusEvent(name: string, payload?: unknown): void {
  const handlers = bus.get(name);
  if (!handlers) return;

  for (const handler of [...handlers]) {
    try {
      handler(payload);
    } catch (error) {
      console.error("[sxe] event handler failed", error);
    }
  }
}

const api: SpotifyExtensionApi = {
  get version() {
    return appState.version;
  },
  ready,
  player: {
    state: snapshot,
    track,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    getVolume,
    available,
    on: onPlayer,
  },
  dom: {
    waitFor,
    observe,
  },
  css: {
    add: addCss,
  },
  toast,
  keyboard: {
    register: registerKey,
  },
  events: {
    on: onBusEvent,
    emit: emitBusEvent,
  },
  settings: {
    get: getSettings,
    set: setSetting,
    onChange: onSettingsChange,
  },
  update: {
    check: checkUpdate,
    current: updateInfo,
    onChange: onUpdateChange,
  },
  internal: {
    get require() {
      return getRequire();
    },
    findModules: (predicate) =>
      scanCache(
        getRequire(),
        (value) => {
          try {
            return predicate(value as Record<string, unknown>);
          } catch {
            return false;
          }
        },
        50,
      ),
  },
  extensions: {
    loaded: loadedExtensions,
  },
};

function expose(): void {
  try {
    Object.defineProperty(window, "SpotifyExtension", {
      value: api,
      configurable: true,
      writable: true,
    });
  } catch {
    (window as unknown as Record<string, unknown>).SpotifyExtension = api;
  }
}

function domReady(): Promise<void> {
  if (document.readyState !== "loading") return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

function scheduleUpdateCheck(): void {
  if (!getSettings().updateCheck) return;
  window.setTimeout(() => {
    if (getSettings().updateCheck) void checkUpdate();
  }, 4000);
}

async function boot(): Promise<void> {
  await domReady();

  const manifest = readManifest();
  if (typeof manifest.version === "string" && manifest.version.length > 0) {
    appState.version = manifest.version;
  }

  const safeMode = manifest.safeMode === true;

  initLanguage(manifest.language);
  initSettings(manifest.settings);
  initAccent(safeMode);

  const repo = manifestRepo(manifest);
  initUpdate({ version: appState.version, repo });

  startDiscovery();

  await waitFor('main, #main, [data-testid="now-playing-widget"]', 6000);

  resolveReady();
  document.dispatchEvent(new CustomEvent("sxe:ready", { detail: api }));

  if (!safeMode) installTweaks();

  try {
    createPanel({
      version: appState.version,
      repo,
      safeMode,
      extensions: () => loadedExtensions,
    });
  } catch (error) {
    console.error("[sxe] panel failed", error);
  }

  scheduleUpdateCheck();

  if (safeMode) return;

  const entries = Array.isArray(manifest.extensions) ? manifest.extensions : [];
  await loadExtensionScripts(entries, loadedExtensions);
}

installChunkHooks();
ensureStyles();
expose();
void boot();
