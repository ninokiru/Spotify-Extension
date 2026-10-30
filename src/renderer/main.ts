import { COLOR_KEYS, DEFAULT_COLORS } from "../shared/colors";
import { translate } from "../shared/i18n";
import type { LanguageCode, TranslationKey } from "../shared/i18n";
import { moduleGlyph } from "../shared/modules";
import type { ModuleEntry, ModuleKind, StoreCatalog } from "../shared/modules";
import { REPO_URL } from "../shared/links";
import type {
  AppSettings,
  ExtensionInfo,
  OpResult,
  SpotifyInstall,
  ThemeInfo,
  UpdateState,
} from "../shared/types";

const bridge = window.bridge;

type Page = "install" | "extensions" | "theme" | "settings" | "store";

type StoreFilter = "all" | ModuleKind;
type StoreSort = "installed" | "name" | "newest";

interface ModalState {
  title: string;
  body: string;
  confirm: string;
  action: () => void;
}

const state: {
  page: Page;
  settings: AppSettings | null;
  installs: SpotifyInstall[];
  selectedId: string | null;
  extensions: ExtensionInfo[];
  themes: ThemeInfo[];
  appVersion: string;
  update: UpdateState;
  busy: boolean;
  loading: boolean;
  progress: { code: string; percent: number } | null;
  modal: ModalState | null;
  store: StoreCatalog | null;
  storeFilter: StoreFilter;
  storeSort: StoreSort;
  storeQuery: string;
  storeBusy: boolean;
  storeDetail: ModuleEntry | null;
} = {
  page: "install",
  settings: null,
  installs: [],
  selectedId: null,
  extensions: [],
  themes: [],
  appVersion: "",
  update: { status: "idle", version: null, percent: 0, detail: null },
  busy: false,
  loading: true,
  progress: null,
  modal: null,
  store: null,
  storeFilter: "all",
  storeSort: "installed",
  storeQuery: "",
  storeBusy: false,
  storeDetail: null,
};

let colorDraft: Record<string, string> = { ...DEFAULT_COLORS };
let cssDraft = "";
let themeDraft: string | null = null;
let saveTimer = 0;

const root = document.getElementById("app") ?? document.body;
const toastRoot = document.createElement("div");
toastRoot.className = "toast-root";
document.body.appendChild(toastRoot);

const logo = `<svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true">
  <rect width="40" height="40" rx="11" fill="currentColor"/>
  <g fill="#04140a">
    <rect x="12.4" y="17" width="3.4" height="6" rx="1.7"/>
    <rect x="18.3" y="12.4" width="3.4" height="15.2" rx="1.7"/>
    <rect x="24.2" y="15" width="3.4" height="10" rx="1.7"/>
  </g>
</svg>`;

const icons = {
  install: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v8.4"/><path d="M6.9 8.6 10 11.7l3.1-3.1"/><path d="M4 13.6V15a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-1.4"/></svg>`,
  extensions: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="6" height="6" rx="1.6"/><rect x="11" y="3" width="6" height="6" rx="1.6"/><rect x="3" y="11" width="6" height="6" rx="1.6"/><rect x="11" y="11" width="6" height="6" rx="1.6"/></svg>`,
  theme: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M10 3.2c3.8 0 6.8 2.9 6.8 6.4 0 2.1-1.7 3.6-3.7 3.6h-1.2c-.9 0-1.6.7-1.6 1.6 0 .4.1.7.3 1 .2.3.3.6.3 1 0 .9-.7 1.6-1.6 1.6A6.9 6.9 0 0 1 10 3.2Z"/><circle cx="7" cy="8" r=".8" fill="currentColor" stroke="none"/><circle cx="10.4" cy="6.6" r=".8" fill="currentColor" stroke="none"/><circle cx="13.3" cy="8.6" r=".8" fill="currentColor" stroke="none"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 6.2h3.4"/><path d="M10.2 6.2H17"/><circle cx="8.3" cy="6.2" r="1.7"/><path d="M3 13.8h6.6"/><path d="M13.4 13.8H17"/><circle cx="11.6" cy="13.8" r="1.7"/></svg>`,
  external: `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 4H16v4.5"/><path d="m16 4-6.4 6.4"/><path d="M14.5 11.5V15A1.5 1.5 0 0 1 13 16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5h3.5"/></svg>`,
  store: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M10 3.1 16.5 6.6v6.8L10 16.9 3.5 13.4V6.6L10 3.1Z"/><path d="m3.5 6.6 6.5 3.5 6.5-3.5"/><path d="M10 10.1v6.8"/></svg>`,
  search: `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="8.6" cy="8.6" r="5.1"/><path d="m12.5 12.5 3.6 3.6"/></svg>`,
  download: `<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v8"/><path d="m6.6 8.7 3.4 3.4 3.4-3.4"/><path d="M4.5 15.5h11"/></svg>`,
};

const NAV: { page: Page; key: TranslationKey; icon: string }[] = [
  { page: "install", key: "nav.install", icon: icons.install },
  { page: "extensions", key: "nav.extensions", icon: icons.extensions },
  { page: "store", key: "nav.store", icon: icons.store },
  { page: "theme", key: "nav.theme", icon: icons.theme },
  { page: "settings", key: "nav.settings", icon: icons.settings },
];

/* ---------- helpers ---------- */

function language(): LanguageCode {
  return state.settings?.language ?? "en";
}

function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return translate(language(), key, params);
}

function esc(value: string | null | undefined): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (char) => map[char] ?? char);
}

function selectedInstall(): SpotifyInstall | null {
  return state.installs.find((item) => item.id === state.selectedId) ?? null;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(language() === "vi" ? "vi-VN" : "en-GB");
}

function toast(message: string, error = false, ms = 3600): void {
  const element = document.createElement("div");
  element.className = `toast${error ? " toast--error" : ""}`;
  element.textContent = message;
  toastRoot.appendChild(element);

  window.setTimeout(
    () => {
      element.style.opacity = "0";
      element.style.transform = "translateY(6px)";
      window.setTimeout(() => element.remove(), 220);
    },
    Math.max(900, ms),
  );
}

function finish(result: OpResult): void {
  toast(t(result.code as TranslationKey), !result.ok, result.ok ? 4200 : 6000);
  if (!result.ok && result.detail) console.warn("[sxe]", result.detail);
}

/* ---------- updates ---------- */

function updateStatusText(): string {
  const update = state.update;
  const version = update.version ?? "";

  switch (update.status) {
    case "checking":
      return t("update.checking");
    case "available":
      return t("update.available", { version });
    case "none":
      return t("update.none");
    case "downloading":
      return t("update.downloading", { percent: update.percent });
    case "downloaded":
      return t("update.downloaded");
    case "error":
      return t("update.error");
    case "disabled":
      return t("update.disabled");
    default:
      return t("update.idle");
  }
}

function updateIsActive(): boolean {
  return (
    state.update.status === "available" ||
    state.update.status === "downloading" ||
    state.update.status === "downloaded"
  );
}

function renderUpdateActions(mode: "strip" | "settings"): string {
  const status = state.update.status;

  if (status === "available") {
    return `<button type="button" class="btn btn--small btn--primary" data-action="download-update">${t("update.download")}</button>`;
  }
  if (status === "downloaded") {
    return `<button type="button" class="btn btn--small btn--primary" data-action="install-update">${t("update.install")}</button>`;
  }
  if (mode === "settings" && status !== "disabled") {
    const busy = status === "checking" || status === "downloading";
    return `<button type="button" class="btn btn--small" data-action="check-update" ${busy ? "disabled" : ""}>${status === "checking" ? t("update.checking") : t("update.check")}</button>`;
  }

  return "";
}

function renderUpdateStrip(): string {
  if (!updateIsActive()) return "";

  const percent = Math.max(0, Math.min(100, state.update.percent));
  const track =
    state.update.status === "downloading"
      ? `<span class="update-strip__track"><span class="update-strip__fill" style="width:${percent}%"></span></span>`
      : "";

  return `<div class="update-strip">
    <span class="update-strip__dot" aria-hidden="true"></span>
    <div class="update-strip__body">
      <span class="update-strip__text">${esc(updateStatusText())}</span>
      ${track}
    </div>
    ${renderUpdateActions("strip")}
  </div>`;
}

/* ---------- draft state ---------- */

function syncDrafts(): void {
  colorDraft = { ...DEFAULT_COLORS, ...(state.settings?.colors ?? {}) };
  cssDraft = state.settings?.customCss ?? "";
  themeDraft = state.settings?.theme ?? null;

  if (themeDraft && !state.themes.some((theme) => theme.id === themeDraft)) {
    themeDraft = null;
  }
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void persistTheme(true), 500);
}

async function persistTheme(silent: boolean): Promise<void> {
  if (!state.settings) return;

  try {
    state.settings = await bridge.settings.patch({
      colors: { ...colorDraft },
      customCss: cssDraft,
    });
    const result = await bridge.themes.apply(themeDraft);
    if (!silent || !result.ok) finish(result);
  } catch (error) {
    console.error(error);
    if (!silent) toast(t("op.error.generic"), true);
  }
}

/* ---------- actions ---------- */

async function refreshInstalls(renderAfter = true): Promise<void> {
  try {
    const installs = await bridge.installs.detect();
    state.installs = installs;

    const preferred = state.settings?.installId ?? null;
    if (!state.selectedId || !installs.some((item) => item.id === state.selectedId)) {
      state.selectedId =
        installs.find((item) => item.id === preferred)?.id ?? installs[0]?.id ?? null;
    }
  } catch (error) {
    console.error(error);
  } finally {
    state.loading = false;
    if (renderAfter) render();
  }
}

async function refreshExtensions(renderAfter = true): Promise<void> {
  try {
    state.extensions = await bridge.extensions.list();
  } catch (error) {
    console.error(error);
  } finally {
    if (renderAfter) render();
  }
}

async function refreshThemes(renderAfter = true): Promise<void> {
  try {
    state.themes = await bridge.themes.list();
    if (themeDraft && !state.themes.some((theme) => theme.id === themeDraft)) {
      themeDraft = null;
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (renderAfter) render();
  }
}

async function refreshStore(renderAfter = true): Promise<void> {
  state.storeBusy = true;
  if (renderAfter) render();

  try {
    state.store = await bridge.store.catalog();
  } catch (error) {
    console.error(error);
    state.store = { modules: [], status: {}, updatedAt: new Date().toISOString(), remote: false };
  } finally {
    state.storeBusy = false;
    if (renderAfter) render();
  }
}

async function updateAllModules(): Promise<void> {
  const pending = outdatedModules();
  if (pending.length === 0 || state.storeBusy) return;

  state.storeBusy = true;
  render();

  try {
    for (const entry of pending) {
      const result = await bridge.store.update(entry.id);
      if (!result.ok) finish(result);
    }
  } catch (error) {
    console.error(error);
  } finally {
    state.storeBusy = false;
    await Promise.all([refreshStore(false), refreshExtensions(false)]);
    state.settings = await bridge.settings.get();
    render();
  }
}

async function runStoreAction(action: string, id: string): Promise<void> {
  if (state.storeBusy) return;

  state.storeBusy = true;
  render();

  try {
    const result =
      action === "install"
        ? await bridge.store.install(id)
        : action === "uninstall"
          ? await bridge.store.uninstall(id)
          : await bridge.store.update(id);

    finish(result);

    if (result.ok && action !== "update") {
      state.storeDetail = null;
    }
  } catch (error) {
    console.error(error);
  } finally {
    state.storeBusy = false;
    await Promise.all([refreshStore(false), refreshExtensions(false)]);
    state.settings = await bridge.settings.get();
    render();
  }
}

async function runInstall(kind: "install" | "repair" | "uninstall"): Promise<void> {
  const install = selectedInstall();
  if (!install || state.busy) return;

  state.busy = true;
  state.progress = { code: "progress.detect", percent: 3 };
  render();

  try {
    const result =
      kind === "install"
        ? await bridge.actions.install(install.id)
        : kind === "repair"
          ? await bridge.actions.repair(install.id)
          : await bridge.actions.uninstall(install.id);

    state.settings = await bridge.settings.get();
    finish(result);
  } catch (error) {
    console.error(error);
    toast(t("op.error.generic"), true);
  } finally {
    state.busy = false;
    state.progress = null;
    await refreshInstalls(false);
    render();
  }
}

function openConfirm(titleKey: TranslationKey, bodyKey: TranslationKey, action: () => void): void {
  state.modal = {
    title: t(titleKey),
    body: t(bodyKey),
    confirm: t("common.confirm"),
    action,
  };
  render();
}

async function browseFolder(): Promise<void> {
  try {
    const root = await bridge.installs.chooseFolder();
    if (root) await refreshInstalls();
  } catch (error) {
    console.error(error);
    toast(t("op.error.generic"), true);
  }
}

async function openInstallFolder(): Promise<void> {
  const install = selectedInstall();
  if (!install) return;
  await bridge.installs.openFolder(install.id);
}

async function toggleExtension(id: string, enabled: boolean): Promise<void> {
  if (state.busy) return;

  state.busy = true;
  render();

  try {
    state.extensions = await bridge.extensions.setEnabled(id, enabled);
    toast(t("op.extensions.done"));
  } catch (error) {
    console.error(error);
    toast(t("op.error.generic"), true);
  } finally {
    state.busy = false;
    await refreshInstalls(false);
    render();
  }
}

async function chooseTheme(id: string | null): Promise<void> {
  if (state.busy) return;

  themeDraft = id;
  state.busy = true;
  render();

  try {
    const result = await bridge.themes.apply(id);
    state.settings = await bridge.settings.get();
    finish(result);
  } catch (error) {
    console.error(error);
    toast(t("op.error.generic"), true);
  } finally {
    state.busy = false;
    render();
  }
}

function resetColors(): void {
  colorDraft = { ...DEFAULT_COLORS };
  renderThemeColors();
  scheduleSave();
}

async function switchLanguage(code: LanguageCode): Promise<void> {
  if (code !== "en" && code !== "vi") return;

  try {
    state.settings = await bridge.settings.patch({ language: code });
    document.documentElement.lang = code;
  } catch (error) {
    console.error(error);
  }
  render();
}

async function toggleAutoApply(): Promise<void> {
  const next = !(state.settings?.autoApply ?? true);
  try {
    state.settings = await bridge.settings.patch({ autoApply: next });
  } catch (error) {
    console.error(error);
  }
  render();
}

async function checkUpdates(): Promise<void> {
  try {
    state.update = await bridge.update.check();
  } catch (error) {
    console.error(error);
  }
  render();
}

async function downloadUpdate(): Promise<void> {
  try {
    state.update = await bridge.update.download();
  } catch (error) {
    console.error(error);
  }
  render();
}

async function installUpdate(): Promise<void> {
  try {
    await bridge.update.install();
  } catch (error) {
    console.error(error);
  }
}

async function toggleAutoUpdate(): Promise<void> {
  const next = !(state.settings?.autoUpdate ?? true);
  try {
    state.settings = await bridge.settings.patch({ autoUpdate: next });
  } catch (error) {
    console.error(error);
  }
  render();
}

async function toggleSafeMode(): Promise<void> {
  const next = !(state.settings?.safeMode ?? false);
  try {
    state.settings = await bridge.settings.patch({ safeMode: next });
  } catch (error) {
    console.error(error);
  }
  render();
}

async function restartSpotify(): Promise<void> {
  const id = state.settings?.installId ?? state.selectedId;
  if (!id) {
    toast(t("op.error.noInstall"), true);
    return;
  }

  const result = await bridge.actions.restartSpotify(id);
  finish(result);
}

function handleAction(action: string): void {
  switch (action) {
    case "install":
      void runInstall("install");
      break;
    case "repair":
      openConfirm("install.confirm.repair.title", "install.confirm.repair.body", () =>
        void runInstall("repair"),
      );
      break;
    case "uninstall":
      openConfirm("install.confirm.uninstall.title", "install.confirm.uninstall.body", () =>
        void runInstall("uninstall"),
      );
      break;
    case "folder":
      void openInstallFolder();
      break;
    case "rescan":
      void refreshInstalls();
      break;
    case "browse":
      void browseFolder();
      break;
    case "reload-extensions":
      void refreshExtensions();
      break;
    case "open-extensions":
      void bridge.extensions.openFolder();
      break;
    case "apply-theme":
      void persistTheme(false);
      break;
    case "reset-colors":
      resetColors();
      break;
    case "restart":
      void restartSpotify();
      break;
    case "open-config":
      void bridge.settings.openConfig();
      break;
    case "check-update":
      void checkUpdates();
      break;
    case "download-update":
      void downloadUpdate();
      break;
    case "install-update":
      void installUpdate();
      break;
    default:
      break;
  }
}

function navigate(page: Page): void {
  if (state.page === page) return;
  state.page = page;
  if (page === "theme") syncDrafts();
  render();
  if (page === "store") void refreshStore();
}

/* ---------- rendering ---------- */

function renderLang(): string {
  const codes: LanguageCode[] = ["en", "vi"];
  return `<div class="lang" role="group" aria-label="${esc(t("settings.language"))}">${codes
    .map(
      (code) =>
        `<button type="button" data-lang="${code}" class="${language() === code ? "is-active" : ""}">${code.toUpperCase()}</button>`,
    )
    .join("")}</div>`;
}

function renderNavItem(item: (typeof NAV)[number]): string {
  const dot =
    item.page === "settings" &&
    (state.update.status === "available" || state.update.status === "downloaded")
      ? `<span class="nav-dot" aria-hidden="true"></span>`
      : "";

  return `<button type="button" class="nav-item ${state.page === item.page ? "is-active" : ""}" data-nav="${item.page}">${item.icon}<span>${t(item.key)}</span>${dot}</button>`;
}

function renderNotice(): string {
  return `<div class="notice">
    <span class="notice__icon" aria-hidden="true">!</span>
    <div>
      <strong>${t("install.warning.title")}</strong>
      <p>${t("install.warning.body")}</p>
    </div>
  </div>`;
}

function stateBadge(install: SpotifyInstall): string {
  const variant =
    install.state === "patched"
      ? "badge--patched"
      : install.state === "foreign" || install.state === "partial"
        ? "badge--foreign"
        : install.state === "unsupported"
          ? "badge--unsupported"
          : "";

  return `<span class="badge ${variant}">${t(
    `install.state.${install.state}` as TranslationKey,
  )}</span>`;
}

function renderInstallCard(install: SpotifyInstall): string {
  const variant =
    install.variant === "store" ? t("install.variant.store") : t("install.variant.normal");
  const version = install.version
    ? t("install.meta.version", { version: install.version })
    : t("install.meta.unknownVersion");
  const backup = install.backupAt
    ? t("install.meta.backup", { date: formatDate(install.backupAt) })
    : null;
  const arch = install.arch !== "unknown" ? install.arch : null;

  const meta = [variant, version, arch, backup].filter((item): item is string => !!item);

  return `<button type="button" class="install-card ${state.selectedId === install.id ? "is-selected" : ""}" data-select="${esc(install.id)}" role="radio" aria-checked="${state.selectedId === install.id}">
    <span class="install-radio" aria-hidden="true"></span>
    <span>
      <span class="install-name">${esc(install.name)} ${stateBadge(install)}</span>
      <span class="install-path" title="${esc(install.root)}">${esc(install.root)}</span>
      <span class="install-meta">${meta.map((item) => `<span>${esc(item)}</span>`).join("")}</span>
    </span>
  </button>`;
}

function renderInstallList(): string {
  if (state.loading) {
    return `<div class="install-list"><div class="skeleton"></div><div class="skeleton"></div></div>`;
  }

  if (state.installs.length === 0) {
    return `<div class="empty">
      <h2>${t("install.empty.title")}</h2>
      <p>${t("install.empty.body")}</p>
      <div class="row">
        <button type="button" class="btn btn--primary" data-action="rescan">${t("install.empty.scan")}</button>
        <button type="button" class="btn" data-action="browse">${t("install.empty.browse")}</button>
      </div>
    </div>`;
  }

  return `<div class="install-list" role="radiogroup" aria-label="${esc(t("install.heading"))}">${state.installs
    .map(renderInstallCard)
    .join("")}</div>`;
}

function renderInstallPage(): string {
  const install = selectedInstall();
  const foreign = install?.state === "foreign";
  const unsupported = install?.state === "unsupported";
  const blocked = !install || state.busy || foreign || unsupported;

  const canUninstall =
    !!install &&
    !state.busy &&
    !foreign &&
    (install.state === "patched" || install.state === "partial" || install.hasBackup);

  return `<div class="page">
    <div class="page-head">
      <h1>${t("install.heading")}</h1>
      <div class="actions-inline">
        <button type="button" class="btn btn--small btn--ghost" data-action="rescan" ${state.busy ? "disabled" : ""}>${t("install.empty.scan")}</button>
        <button type="button" class="btn btn--small btn--ghost" data-action="browse" ${state.busy ? "disabled" : ""}>${t("install.empty.browse")}</button>
      </div>
    </div>
    ${renderNotice()}
    ${
      foreign
        ? `<div class="notice notice--muted">
            <span class="notice__icon" aria-hidden="true">!</span>
            <div>
              <strong>${t("install.foreign.title")}</strong>
              <p>${t("install.foreign.body")}</p>
            </div>
          </div>`
        : ""
    }
    ${renderInstallList()}
    <div class="action-bar">
      <button type="button" class="btn btn--primary" data-action="install" ${blocked ? "disabled" : ""}>${t("install.action.install")}</button>
      <button type="button" class="btn" data-action="repair" ${blocked ? "disabled" : ""}>${t("install.action.repair")}</button>
      <button type="button" class="btn" data-action="uninstall" ${canUninstall ? "" : "disabled"}>${t("install.action.uninstall")}</button>
      <button type="button" class="btn btn--ghost" data-action="folder" ${!install || state.busy ? "disabled" : ""}>${t("install.action.folder")}</button>
    </div>
  </div>`;
}

function renderExtensionsPage(): string {
  const enabledCount = state.extensions.filter((item) => item.enabled).length;

  const body =
    state.extensions.length === 0
      ? `<div class="empty">
          <h2>${t("extensions.heading")}</h2>
          <p>${t("extensions.empty")}</p>
          <div class="row">
            <button type="button" class="btn btn--primary" data-action="open-extensions">${t("extensions.openFolder")}</button>
            <button type="button" class="btn" data-action="reload-extensions">${t("extensions.reload")}</button>
          </div>
        </div>`
      : `<div class="list">${state.extensions
          .map((extension) => {
            const meta = [
              extension.author || null,
              extension.version ? `v${extension.version}` : null,
            ]
              .filter((item): item is string => !!item)
              .join(" · ");

            return `<div class="ext-card">
              <div>
                <div class="ext-name">
                  <span>${esc(extension.name)}</span>
                  ${extension.bundled ? `<span class="badge badge--bundled">${t("common.bundled")}</span>` : ""}
                </div>
                <div class="ext-desc">${esc(extension.description)}</div>
                ${meta ? `<div class="ext-meta">${esc(meta)}</div>` : ""}
              </div>
              <button type="button" class="switch ${extension.enabled ? "is-on" : ""}" role="switch" aria-checked="${extension.enabled}" aria-label="${esc(extension.name)}" data-toggle-extension="${esc(extension.id)}" ${state.busy ? "disabled" : ""}></button>
            </div>`;
          })
          .join("")}</div>`;

  return `<div class="page">
    <div class="page-head">
      <h1>${t("extensions.heading")}</h1>
      <div class="actions-inline">
        <button type="button" class="btn btn--small btn--ghost" data-action="reload-extensions" ${state.busy ? "disabled" : ""}>${t("extensions.reload")}</button>
        <button type="button" class="btn btn--small btn--ghost" data-action="open-extensions">${t("extensions.openFolder")}</button>
      </div>
    </div>
    <div class="install-meta"><span>${t("extensions.count", { enabled: enabledCount, total: state.extensions.length })}</span><span>${t("extensions.hint")}</span></div>
    ${body}
  </div>`;
}

function moduleDescription(entry: ModuleEntry): string {
  if (language() === "vi") return entry.descriptionVi || entry.description;
  return entry.description;
}

function kindLabel(kind: ModuleKind): string {
  return t(`store.filter.${kind}` as TranslationKey);
}

function visibleModules(): ModuleEntry[] {
  const modules = state.store?.modules ?? [];
  const query = state.storeQuery.trim().toLowerCase();

  const filtered = modules.filter((entry) => {
    if (state.storeFilter !== "all" && entry.kind !== state.storeFilter) return false;
    if (!query) return true;

    const haystack = `${entry.name} ${entry.description} ${entry.descriptionVi} ${entry.author}`.toLowerCase();
    return haystack.includes(query);
  });

  const sorted = [...filtered];
  if (state.storeSort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.storeSort === "newest") {
    sorted.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  } else {
    sorted.sort((a, b) => {
      const byCount = (b.downloads || 0) - (a.downloads || 0);
      if (byCount !== 0) return byCount;
      return a.name.localeCompare(b.name);
    });
  }

  return sorted;
}

function moduleArt(entry: ModuleEntry, large = false): string {
  const glyph = moduleGlyph(entry.glyph);
  return `<div class="mod-art${large ? " mod-art--large" : ""}" style="--mod-a:${esc(entry.accent[0])};--mod-b:${esc(entry.accent[1])}">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
  </div>`;
}

function outdatedModules(): ModuleEntry[] {
  const modules = state.store?.modules ?? [];
  return modules.filter((entry) => state.store?.status[entry.id]?.updateAvailable === true);
}

function storeCardsHtml(): string {
  const modules = visibleModules();
  if (modules.length === 0) {
    return `<div class="empty store-empty">
      <h2>${t("store.empty")}</h2>
    </div>`;
  }

  return modules
    .map((entry) => {
      const status = state.store?.status[entry.id];
      const active = status?.enabled === true;
      const outdated = status?.updateAvailable === true;

      const meta = [entry.version, kindLabel(entry.kind)].filter(Boolean).join(" · ");
      const downloads =
        entry.downloads > 0
          ? `<span class="mod-card__downloads">${icons.download}${entry.downloads}</span>`
          : "";

      const flag = outdated
        ? `<span class="mod-card__state mod-card__state--update">${esc(t("store.update"))}</span>`
        : active
          ? `<span class="mod-card__state">${esc(t("store.installed"))}</span>`
          : "";

      return `<article class="mod-card${active ? " is-active" : ""}" data-module="${esc(entry.id)}" tabindex="0" role="button">
        <div class="mod-card__art">
          ${moduleArt(entry)}
          ${downloads}
          ${flag}
        </div>
        <div class="mod-card__body">
          <h3 class="mod-card__name">${esc(entry.name)}</h3>
          <p class="mod-card__desc">${esc(moduleDescription(entry))}</p>
          <div class="mod-card__meta">
            <span>${esc(meta)}</span>
            ${entry.bundled ? `<span class="badge badge--bundled">${esc(t("store.bundled"))}</span>` : ""}
          </div>
        </div>
      </article>`;
    })
    .join("");
}

function renderStorePage(): string {
  const filters: { id: StoreFilter; key: TranslationKey }[] = [
    { id: "all", key: "store.filter.all" },
    { id: "extension", key: "store.filter.extension" },
    { id: "theme", key: "store.filter.theme" },
    { id: "snippet", key: "store.filter.snippet" },
  ];

  const chips = filters
    .map(
      (filter) =>
        `<button type="button" class="chip ${state.storeFilter === filter.id ? "is-active" : ""}" data-store-filter="${filter.id}">${esc(t(filter.key))}</button>`,
    )
    .join("");

  const sort = `<label class="store-sort">
      <select data-store-sort>
        <option value="installed" ${state.storeSort === "installed" ? "selected" : ""}>${esc(t("store.sort.installed"))}</option>
        <option value="newest" ${state.storeSort === "newest" ? "selected" : ""}>${esc(t("store.sort.newest"))}</option>
        <option value="name" ${state.storeSort === "name" ? "selected" : ""}>${esc(t("store.sort.name"))}</option>
      </select>
    </label>`;

  const body = state.storeBusy
    ? `<div class="store-grid">${Array.from({ length: 6 })
        .map(() => `<div class="skeleton skeleton--card"></div>`)
        .join("")}</div>`
    : `<div class="store-grid" id="store-grid">${storeCardsHtml()}</div>`;

  const outdated = outdatedModules();
  const banner =
    outdated.length > 0
      ? `<div class="store-banner">
          <span>${esc(t("store.update.available", { count: outdated.length }))}</span>
          <button type="button" class="btn btn--small btn--primary" data-store-update-all ${state.storeBusy ? "disabled" : ""}>${esc(t("store.update.all"))}</button>
        </div>`
      : "";

  const offline =
    state.store !== null && !state.store.remote
      ? `<div class="store-banner store-banner--muted">
          <span>${esc(t("store.offline"))}</span>
        </div>`
      : "";

  return `<div class="page page--wide">
    <div class="store-head">
      <div>
        <h1>${esc(t("store.heading"))}</h1>
        <p class="store-head__sub">${esc(t("store.subtitle"))}</p>
      </div>
      <div class="store-search">
        ${icons.search}
        <input type="search" data-store-search placeholder="${esc(t("store.search"))}" value="${esc(state.storeQuery)}" spellcheck="false" />
      </div>
    </div>

    <div class="store-bar">
      <div class="store-filters">${chips}</div>
      ${sort}
    </div>

    ${offline}
    ${banner}

    ${body}
  </div>`;
}

function renderStoreDetail(entry: ModuleEntry): string {
  const status = state.store?.status[entry.id];
  const active = status?.enabled === true;
  const outdated = status?.updateAvailable === true;

  const meta = [entry.version, kindLabel(entry.kind)].filter(Boolean).join(" · ");

  const primary = outdated
    ? `<button type="button" class="btn btn--primary" data-store-action="update" data-module="${esc(entry.id)}" ${state.storeBusy ? "disabled" : ""}>${esc(t("store.update"))}</button>`
    : active
      ? `<button type="button" class="btn" data-store-action="uninstall" data-module="${esc(entry.id)}" ${state.storeBusy ? "disabled" : ""}>${esc(t("store.uninstall"))}</button>`
      : `<button type="button" class="btn btn--primary" data-store-action="install" data-module="${esc(entry.id)}" ${state.storeBusy ? "disabled" : ""}>${esc(t("store.install"))}</button>`;

  const downloads =
    entry.downloads > 0
      ? `<p class="modal__meta">${esc(t("store.downloads", { count: entry.downloads }))}</p>`
      : "";

  const author = entry.author
    ? `<p class="modal__meta">${esc(t("store.detail.author", { author: entry.author }))}</p>`
    : "";

  return `<div class="modal-backdrop" data-store-close>
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <div class="modal__head">
        ${moduleArt(entry, true)}
        <div>
          <h2>${esc(entry.name)}</h2>
          <p class="modal__meta">${esc(meta)}</p>
          ${author}
          ${downloads}
        </div>
      </div>
      <p class="modal__text">${esc(moduleDescription(entry))}</p>
      <div class="row">
        <button type="button" class="btn btn--ghost" data-store-close>${esc(t("common.close"))}</button>
        ${primary}
      </div>
    </div>
  </div>`;
}

function renderThemePage(): string {
  const chips = [
    `<button type="button" class="chip ${themeDraft === null ? "is-active" : ""}" data-theme-id="">${t("theme.default")}</button>`,
    ...state.themes.map(
      (theme) =>
        `<button type="button" class="chip ${themeDraft === theme.id ? "is-active" : ""}" data-theme-id="${esc(theme.id)}">${esc(theme.name)}</button>`,
    ),
  ].join("");

  return `<div class="page">
    <h1>${t("theme.heading")}</h1>

    <section class="panel">
      <h2>${t("theme.theme")}</h2>
      <div class="theme-chips">${chips}</div>
      ${state.themes.length === 0 ? `<div class="ext-meta">${t("theme.empty")}</div>` : ""}
    </section>

    <section class="panel">
      <h2>${t("theme.scheme")}</h2>
      <div class="color-grid">${COLOR_KEYS.map((key) => {
        const value = colorDraft[key] ?? DEFAULT_COLORS[key];
        const label = t(`theme.${key}` as TranslationKey);
        return `<label class="color-field">
          <span class="color-swatch" style="background:${esc(value)}">
            <input type="color" data-color="${key}" value="${esc(value)}" aria-label="${esc(label)}" />
          </span>
          <span class="color-name">${esc(label)}</span>
          <span class="color-value" data-color-value="${key}">${esc(value)}</span>
        </label>`;
      }).join("")}</div>
    </section>

    <section class="panel">
      <h2>${t("theme.preview")}</h2>
      <div class="preview" id="theme-preview" style="--pv-bg:${esc(colorDraft.background)};--pv-sidebar:${esc(colorDraft.sidebar)};--pv-card:${esc(colorDraft.card)};--pv-text:${esc(colorDraft.text)};--pv-sub:${esc(colorDraft.subtext)};--pv-accent:${esc(colorDraft.accent)}">
        <div class="preview__side">
          <span class="preview__dot"></span>
          <span class="preview__line" style="width:82%"></span>
          <span class="preview__line" style="width:58%"></span>
          <span class="preview__line" style="width:70%"></span>
          <span class="preview__line" style="width:46%"></span>
        </div>
        <div class="preview__main">
          <span class="preview__title"></span>
          <div class="preview__cards">
            <span class="preview__card"></span>
            <span class="preview__card"></span>
            <span class="preview__card"></span>
          </div>
          <div class="preview__bar">
            <span class="preview__play"></span>
            <span class="preview__sub"></span>
            <span class="preview__progress"></span>
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>${t("theme.customCss")}</h2>
      <textarea class="code" id="custom-css" spellcheck="false" placeholder="/* ... */">${esc(cssDraft)}</textarea>
    </section>

    <div class="action-bar">
      <button type="button" class="btn btn--primary" data-action="apply-theme" ${state.busy ? "disabled" : ""}>${t("theme.apply")}</button>
      <button type="button" class="btn btn--ghost" data-action="reset-colors" ${state.busy ? "disabled" : ""}>${t("theme.reset")}</button>
    </div>
  </div>`;
}

function renderUpdatePanel(): string {
  const autoUpdate = state.settings?.autoUpdate ?? true;
  const disabled = state.update.status === "disabled";

  return `<section class="panel">
      <h2>${t("update.title")}</h2>
      <div class="setting-row">
        <div>
          <h3>${t("update.auto")}</h3>
          <p>${t("update.autoHint")}</p>
        </div>
        <div class="control">
          <button type="button" class="switch ${autoUpdate ? "is-on" : ""}" role="switch" aria-checked="${autoUpdate}" aria-label="${esc(t("update.auto"))}" data-auto-update ${disabled ? "disabled" : ""}></button>
        </div>
      </div>
      <div class="setting-row">
        <div>
          <h3>${t("settings.version", { version: state.appVersion || "0.0.0" })}</h3>
          <p>${esc(updateStatusText())}</p>
        </div>
        <div class="control">${renderUpdateActions("settings")}</div>
      </div>
    </section>`;
}

function renderSettingsPage(): string {
  const autoApply = state.settings?.autoApply ?? true;
  const safeMode = state.settings?.safeMode ?? false;

  return `<div class="page">
    <h1>${t("settings.heading")}</h1>

    <section class="panel">
      <div class="setting-row">
        <div>
          <h3>${t("settings.language")}</h3>
          <p>${t("settings.languageHint")}</p>
        </div>
        <div class="control">${renderLang()}</div>
      </div>

      <div class="setting-row">
        <div>
          <h3>${t("settings.autoApply")}</h3>
          <p>${t("settings.autoApplyHint")}</p>
        </div>
        <div class="control">
          <button type="button" class="switch ${autoApply ? "is-on" : ""}" role="switch" aria-checked="${autoApply}" aria-label="${esc(t("settings.autoApply"))}" data-auto-apply></button>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <h3>${t("settings.safeMode")}</h3>
          <p>${t("settings.safeModeHint")}</p>
        </div>
        <div class="control">
          <button type="button" class="switch ${safeMode ? "is-on" : ""}" role="switch" aria-checked="${safeMode}" aria-label="${esc(t("settings.safeMode"))}" data-safe-mode></button>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <h3>${t("settings.restart")}</h3>
          <p>${t("settings.restartHint")}</p>
        </div>
        <div class="control">
          <button type="button" class="btn btn--small" data-action="restart">${t("settings.restart")}</button>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <h3>${t("settings.openConfig")}</h3>
          <p>${t("settings.openConfigHint")}</p>
        </div>
        <div class="control">
          <button type="button" class="btn btn--small" data-action="open-config">${t("common.openFolder")}</button>
        </div>
      </div>
    </section>

    ${renderUpdatePanel()}

    <section class="panel">
      <div class="about">
        <div>
          <h3>${t("app.name")}</h3>
          <p>${t("settings.version", { version: state.appVersion || "0.0.0" })} · ${t("settings.license")}</p>
        </div>
        <div class="about__actions">
          <button type="button" class="btn btn--small btn--ghost" data-open-link="${REPO_URL}/issues/new">
            ${t("settings.feedback")} ${icons.external}
          </button>
          <button type="button" class="btn btn--small btn--ghost" data-open-link="${REPO_URL}">
            ${t("settings.repo")}
          </button>
        </div>
      </div>
    </section>
  </div>`;
}

function renderPage(): string {
  switch (state.page) {
    case "extensions":
      return renderExtensionsPage();
    case "store":
      return renderStorePage();
    case "theme":
      return renderThemePage();
    case "settings":
      return renderSettingsPage();
    default:
      return renderInstallPage();
  }
}

function renderModal(modal: ModalState): string {
  return `<div class="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true">
      <h2>${esc(modal.title)}</h2>
      <p>${esc(modal.body)}</p>
      <div class="row">
        <button type="button" class="btn btn--ghost" data-modal-cancel>${t("common.cancel")}</button>
        <button type="button" class="btn btn--primary" data-modal-confirm>${esc(modal.confirm)}</button>
      </div>
    </div>
  </div>`;
}

function render(): void {
  root.innerHTML = `<div class="shell">
    <header class="titlebar">
      <div class="brand">${logo}<span>${t("app.name")}</span></div>
      <div class="titlebar__spacer"></div>
      ${renderLang()}
    </header>
    <div class="shell__body">
      <aside class="sidebar">
        ${NAV.map(renderNavItem).join("")}
        <div class="sidebar__footer">${t("settings.version", { version: state.appVersion || "0.0.0" })}</div>
      </aside>
      <main class="content">${renderUpdateStrip()}${renderPage()}</main>
    </div>
  </div>
  <div class="progress-dock" id="progress-dock" hidden>
    <div class="progress-dock__label"><span id="progress-label"></span><span id="progress-percent"></span></div>
    <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
  </div>
  ${state.modal ? renderModal(state.modal) : ""}
  ${state.storeDetail ? renderStoreDetail(state.storeDetail) : ""}`;

  renderProgress();
}

function renderProgress(): void {
  const dock = document.getElementById("progress-dock");
  if (!dock) return;

  if (!state.busy) {
    dock.hidden = true;
    return;
  }

  dock.hidden = false;

  const code = state.progress?.code ?? "common.loading";
  const label = t(code as TranslationKey);
  const percent = Math.max(4, Math.min(100, Math.round(state.progress?.percent ?? 0)));

  const labelElement = document.getElementById("progress-label");
  const percentElement = document.getElementById("progress-percent");
  const fill = document.getElementById("progress-fill");

  if (labelElement) labelElement.textContent = label;
  if (percentElement) percentElement.textContent = `${percent}%`;
  if (fill instanceof HTMLElement) fill.style.width = `${percent}%`;
}

function updatePreview(): void {
  const preview = document.getElementById("theme-preview");
  if (!preview) return;

  preview.style.setProperty("--pv-bg", colorDraft.background ?? DEFAULT_COLORS.background);
  preview.style.setProperty("--pv-sidebar", colorDraft.sidebar ?? DEFAULT_COLORS.sidebar);
  preview.style.setProperty("--pv-card", colorDraft.card ?? DEFAULT_COLORS.card);
  preview.style.setProperty("--pv-text", colorDraft.text ?? DEFAULT_COLORS.text);
  preview.style.setProperty("--pv-sub", colorDraft.subtext ?? DEFAULT_COLORS.subtext);
  preview.style.setProperty("--pv-accent", colorDraft.accent ?? DEFAULT_COLORS.accent);
}

function renderThemeColors(): void {
  render();
  updatePreview();
}

/* ---------- events ---------- */

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const modalConfirm = target.closest<HTMLElement>("[data-modal-confirm]");
  if (modalConfirm) {
    const modal = state.modal;
    state.modal = null;
    render();
    modal?.action();
    return;
  }

  const modalCancel = target.closest<HTMLElement>("[data-modal-cancel]");
  if (modalCancel) {
    state.modal = null;
    render();
    return;
  }

  const langButton = target.closest<HTMLElement>("[data-lang]");
  if (langButton?.dataset.lang) {
    void switchLanguage(langButton.dataset.lang as LanguageCode);
    return;
  }

  const nav = target.closest<HTMLElement>("[data-nav]");
  if (nav?.dataset.nav) {
    navigate(nav.dataset.nav as Page);
    return;
  }

  const select = target.closest<HTMLElement>("[data-select]");
  if (select?.dataset.select) {
    state.selectedId = select.dataset.select;
    render();
    return;
  }

  const tag = target.closest<HTMLElement>("[data-theme-id]");
  if (tag) {
    void chooseTheme(tag.dataset.themeId ? tag.dataset.themeId : null);
    return;
  }

  const toggle = target.closest<HTMLElement>("[data-toggle-extension]");
  if (toggle?.dataset.toggleExtension) {
    const extension = state.extensions.find((item) => item.id === toggle.dataset.toggleExtension);
    if (extension) void toggleExtension(extension.id, !extension.enabled);
    return;
  }

  const auto = target.closest<HTMLElement>("[data-auto-apply]");
  if (auto) {
    void toggleAutoApply();
    return;
  }

  const autoUpdate = target.closest<HTMLElement>("[data-auto-update]");
  if (autoUpdate) {
    void toggleAutoUpdate();
    return;
  }

  const safeMode = target.closest<HTMLElement>("[data-safe-mode]");
  if (safeMode) {
    void toggleSafeMode();
    return;
  }

  const link = target.closest<HTMLElement>("[data-open-link]");
  const href = link?.dataset.openLink;
  if (href?.startsWith("https://")) {
    void bridge.app.openExternal(href);
    return;
  }

  const filter = target.closest<HTMLElement>("[data-store-filter]");
  if (filter?.dataset.storeFilter) {
    state.storeFilter = filter.dataset.storeFilter as StoreFilter;
    render();
    return;
  }

  const storeAction = target.closest<HTMLElement>("[data-store-action]");
  if (storeAction?.dataset.storeAction && storeAction.dataset.module) {
    void runStoreAction(storeAction.dataset.storeAction, storeAction.dataset.module);
    return;
  }

  if (target.closest("[data-store-update-all]")) {
    void updateAllModules();
    return;
  }

  if (target.matches("[data-store-close]")) {
    state.storeDetail = null;
    render();
    return;
  }

  const moduleCard = target.closest<HTMLElement>("[data-module]");
  if (moduleCard?.dataset.module) {
    const entry = state.store?.modules.find((item) => item.id === moduleCard.dataset.module);
    if (entry) {
      state.storeDetail = entry;
      render();
    }
    return;
  }

  const action = target.closest<HTMLElement>("[data-action]");
  if (action?.dataset.action) {
    handleAction(action.dataset.action);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.storeDetail) {
    state.storeDetail = null;
    render();
    return;
  }
  if (state.modal) {
    state.modal = null;
    render();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (!target.dataset.storeSort) return;

  state.storeSort = target.dataset.storeSort as StoreSort;
  render();
});

document.addEventListener("input", (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.dataset.storeSearch !== undefined) {
    state.storeQuery = target.value;

    const grid = document.getElementById("store-grid");
    if (grid) grid.innerHTML = storeCardsHtml();
    return;
  }

  if (target instanceof HTMLInputElement && target.dataset.color) {
    const key = target.dataset.color;
    colorDraft[key] = target.value;

    const swatch = target.closest<HTMLElement>(".color-swatch");
    if (swatch) swatch.style.background = target.value;

    const value = document.querySelector<HTMLElement>(`[data-color-value="${key}"]`);
    if (value) value.textContent = target.value;

    updatePreview();
    scheduleSave();
    return;
  }

  if (target instanceof HTMLTextAreaElement && target.id === "custom-css") {
    cssDraft = target.value;
    scheduleSave();
  }
});

/* ---------- boot ---------- */

async function boot(): Promise<void> {
  try {
    const [settings, version] = await Promise.all([
      bridge.settings.get(),
      bridge.app.version(),
    ]);

    state.settings = settings;
    state.appVersion = version;
    document.documentElement.lang = settings.language;
    syncDrafts();
  } catch (error) {
    console.error(error);
  }

  try {
    state.update = await bridge.update.getState();
  } catch (error) {
    console.error(error);
  }

  render();

  bridge.events.onProgress((event) => {
    if (!state.busy) return;
    state.progress = { code: event.code, percent: event.percent };
    renderProgress();
  });

  let updateTimer = 0;
  bridge.update.onChange((update) => {
    state.update = update;
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(() => {
      // Re-rendering moves the caret, so leave a focused textarea alone.
      if (document.activeElement instanceof HTMLTextAreaElement) return;
      render();
    }, 150);
  });

  void refreshInstalls();
  void refreshExtensions();
  void refreshThemes();
  void refreshStore();
}

void boot();
