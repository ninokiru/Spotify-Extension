import type {
  RuntimeSettings,
  TrackInfo,
  UpdateSnapshot,
} from "../shared/api";
import { DEFAULT_COLORS } from "../shared/colors";
import type { TranslationKey } from "../shared/i18n";
import { ACCENT_PRESETS, getAccent, onAccentChange, setAccent } from "./accent";
import { copyText } from "./clipboard";
import {
  collectDiagnostics,
  copyDiagnostics,
} from "./diagnostics";
import type { DiagnosticRow, DiagnosticsInput } from "./diagnostics";
import {
  lineIndexAt,
  lyricsSnapshot,
  onLyrics,
  retryLyrics,
  setLyricsActive,
} from "./lyrics";
import type { LyricsSnapshot } from "./lyrics";
import { on as onPlayer, snapshot as playerSnapshot } from "./player";
import { getSettings, onSettingsChange, setSetting } from "./settings";
import { tx } from "./text";
import { toast } from "./ui";
import {
  checkUpdate,
  onUpdateChange,
  openExternal,
  openUpdate,
  updateSnapshot,
} from "./update";

interface PanelOptions {
  version: string;
  repo: string;
  safeMode: boolean;
  extensions: () => string[];
}

const DISMISS_KEY = "sxe:update-dismissed";

const LOGO = `<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
  <rect width="40" height="40" rx="11" fill="currentColor"/>
  <g fill="#04140a">
    <rect x="12.4" y="17" width="3.4" height="6" rx="1.7"/>
    <rect x="18.3" y="12.4" width="3.4" height="15.2" rx="1.7"/>
    <rect x="24.2" y="15" width="3.4" height="10" rx="1.7"/>
  </g>
</svg>`;

const FEATURE_ROWS: { key: keyof RuntimeSettings; label: TranslationKey }[] = [
  { key: "seekButtons", label: "spotify.panel.seekButtons" },
  { key: "songToast", label: "spotify.panel.songToast" },
  { key: "timeRemaining", label: "spotify.panel.timeRemaining" },
];

const STYLES = `
*, *::before, *::after { box-sizing: border-box; }

.stack {
  position: absolute;
  right: 16px;
  bottom: 96px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  font-family: var(--font-family, "Segoe UI", "Helvetica Neue", Arial, sans-serif);
  color: var(--text-base, #ffffff);
  line-height: 1.4;
}

.fab {
  pointer-events: auto;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #1ed760;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.fab:hover { color: #2ee06b; transform: translateY(-1px); }
.fab:active { transform: none; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); }
.fab svg { display: block; }

.panel {
  pointer-events: auto;
  width: 320px;
  max-width: calc(100vw - 32px);
  max-height: min(620px, calc(100vh - 160px));
  overflow-y: auto;
  padding: 14px 16px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: #1b1b1b;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
  animation: rise 0.16s ease both;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}
.panel::-webkit-scrollbar { width: 8px; }
.panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}
.panel[hidden], .banner[hidden] { display: none; }

@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.panel__title { font-size: 13.5px; font-weight: 650; letter-spacing: -0.01em; }
.panel__close, .banner__close {
  border: 0;
  background: transparent;
  color: #a7a7a7;
  font-size: 17px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
}
.panel__close:hover, .banner__close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.safe {
  display: flex;
  gap: 9px;
  padding: 9px 11px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 164, 43, 0.32);
  border-radius: 8px;
  background: rgba(255, 164, 43, 0.1);
}
.safe[hidden] { display: none; }
.safe strong { display: block; font-size: 11.5px; color: #ffc46b; }
.safe p { margin: 2px 0 0; font-size: 11px; color: #d9b98a; }
.safe__dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  background: #ffa42b;
}

.group { padding: 10px 0; border-top: 1px solid rgba(255, 255, 255, 0.07); }
.group:first-of-type { border-top: 0; }
.group__title {
  margin: 0 0 6px;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #8f8f8f;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
}
.row__label { font-size: 12.5px; color: #ececec; }

.switch {
  position: relative;
  flex: none;
  width: 34px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  cursor: pointer;
  transition: background 0.15s ease;
}
.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f4f4f4;
  transition: transform 0.16s ease, background 0.16s ease;
}
.switch[aria-checked="true"] { background: #1ed760; }
.switch[aria-checked="true"]::after { transform: translateX(14px); background: #04140a; }

.fab:focus-visible,
.switch:focus-visible,
.btn:focus-visible,
.link:focus-visible,
.swatch:focus-visible,
.panel__close:focus-visible,
.banner__close:focus-visible,
.diag > summary:focus-visible {
  outline: 2px solid #1ed760;
  outline-offset: 2px;
}

.track__name {
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track__artists {
  margin-top: 2px;
  font-size: 11.5px;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track__artists:empty { display: none; }
.track__actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }

.hint { margin: 6px 0 0; font-size: 11px; color: #8f8f8f; }
.hint[hidden] { display: none; }

.swatches { display: flex; align-items: center; gap: 9px; }
.swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  background: var(--swatch, #1ed760);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
}
.swatch:hover { transform: scale(1.08); }
.swatch[aria-pressed="true"] { border-color: #ffffff; }

.lyrics {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 168px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}
.lyrics::-webkit-scrollbar { width: 8px; }
.lyrics::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}
.lyrics__line {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #9a9a9a;
  transition: color 0.12s ease;
}
.lyrics__line.is-active { color: #ffffff; font-weight: 600; }
.lyrics__plain {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #c9c9c9;
  white-space: pre-wrap;
}

.update__text { margin: 2px 0 10px; font-size: 12px; line-height: 1.45; color: #b3b3b3; }
.update__actions { display: flex; gap: 8px; }

.btn {
  height: 30px;
  padding: 0 13px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: transparent;
  color: #ffffff;
  font: 600 12px/1 var(--font-family, "Segoe UI", sans-serif);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}
.btn:hover { border-color: rgba(255, 255, 255, 0.34); }
.btn:disabled { opacity: 0.45; cursor: default; }
.btn--primary { background: #1ed760; border-color: transparent; color: #04140a; }
.btn--primary:hover { background: #2ee06b; }
.btn--tiny { height: 26px; padding: 0 11px; font-size: 11.5px; }
.btn[hidden] { display: none; }

.diag > summary { cursor: pointer; list-style: none; }
.diag > summary::-webkit-details-marker { display: none; }
.diag > summary::after { content: "+"; float: right; color: #6f6f6f; }
.diag[open] > summary::after { content: "–"; }
.diag__rows { margin-bottom: 8px; }
.diag__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  font-size: 11.5px;
  color: #ececec;
}
.diag__value { color: #a7a7a7; text-align: right; overflow-wrap: anywhere; }
.diag__value.is-bad { color: #ff8b8b; }

.panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.version { font-size: 11px; color: #8f8f8f; }
.link {
  border: 0;
  background: transparent;
  color: #b3b3b3;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 0;
  cursor: pointer;
}
.link:hover { color: #ffffff; }

.banner {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 13px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: #1f1f1f;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
  animation: rise 0.16s ease both;
}
.banner__text { font-size: 12px; font-weight: 600; }
.banner__action {
  border: 0;
  background: #1ed760;
  color: #04140a;
  height: 26px;
  padding: 0 11px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 650;
  cursor: pointer;
}
.banner__action:hover { background: #2ee06b; }
`;

function readDismissed(): string {
  try {
    return window.localStorage.getItem(DISMISS_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDismissed(version: string): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, version);
  } catch {
    /* storage can be blocked */
  }
}

function trackLink(info: TrackInfo | null): string | null {
  const uri = info?.uri ?? null;
  if (!uri) return null;

  const match = /^spotify:([a-z]+):([A-Za-z0-9]+)$/.exec(uri);
  if (!match) return null;
  return `https://open.spotify.com/${match[1]}/${match[2]}`;
}

function switchRow(key: keyof RuntimeSettings, label: TranslationKey): string {
  return `<div class="row">
    <span class="row__label">${tx(label)}</span>
    <button class="switch" type="button" role="switch" data-setting="${key}" aria-label="${tx(label)}" aria-checked="false"></button>
  </div>`;
}

function swatches(): string {
  const fallback = `<button class="swatch" type="button" data-accent="" aria-pressed="true" title="${tx("spotify.panel.accentDefault")}" aria-label="${tx("spotify.panel.accentDefault")}" style="--swatch:${DEFAULT_COLORS.accent}"></button>`;
  const presets = ACCENT_PRESETS.map(
    (preset) =>
      `<button class="swatch" type="button" data-accent="${preset.id}" aria-pressed="false" aria-label="${preset.color}" style="--swatch:${preset.color}"></button>`,
  ).join("");
  return fallback + presets;
}

export function createPanel(options: PanelOptions): void {
  if (document.getElementById("sxe-panel-host")) return;

  let open = false;
  let settings = getSettings();
  let update: UpdateSnapshot = updateSnapshot();
  let dismissed = readDismissed();
  let currentTrack: TrackInfo | null = null;
  let lyrics: LyricsSnapshot = lyricsSnapshot();
  let activeLine = -1;
  let diagRows: DiagnosticRow[] = [];
  let offSong: (() => void) | null = null;
  let offProgress: (() => void) | null = null;

  const diagInput: DiagnosticsInput = {
    version: options.version,
    safeMode: options.safeMode,
    extensions: options.extensions,
  };

  const host = document.createElement("div");
  host.id = "sxe-panel-host";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483001;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `<style>${STYLES}</style>
    <div class="stack">
      <aside class="banner" hidden>
        <span class="banner__text"></span>
        <button class="banner__action" type="button">${tx("spotify.panel.download")}</button>
        <button class="banner__close" type="button" aria-label="${tx("spotify.panel.dismiss")}">×</button>
      </aside>
      <section class="panel" hidden>
        <header class="panel__head">
          <span class="panel__title">Spotify Extension</span>
          <button class="panel__close" type="button" aria-label="${tx("spotify.panel.close")}">×</button>
        </header>
        <div class="safe" hidden>
          <span class="safe__dot" aria-hidden="true"></span>
          <div>
            <strong>${tx("spotify.panel.safeOn")}</strong>
            <p>${tx("spotify.panel.safeHint")}</p>
          </div>
        </div>
        <section class="group">
          <h2 class="group__title">${tx("spotify.panel.nowPlaying")}</h2>
          <div>
            <div class="track__name" data-track-name></div>
            <div class="track__artists" data-track-artists></div>
          </div>
          <div class="track__actions">
            <button class="btn btn--tiny" type="button" data-copy-link disabled>${tx("spotify.panel.copyLink")}</button>
            <button class="btn btn--tiny" type="button" data-copy-uri disabled>${tx("spotify.panel.copyUri")}</button>
            <button class="btn btn--tiny" type="button" data-open-track disabled>${tx("spotify.panel.openTrack")}</button>
          </div>
        </section>
        <section class="group" data-accent-group>
          <h2 class="group__title">${tx("spotify.panel.accent")}</h2>
          <div class="swatches">${swatches()}</div>
        </section>
        <section class="group" data-features>
          <h2 class="group__title">${tx("spotify.panel.features")}</h2>
          ${FEATURE_ROWS.map((row) => switchRow(row.key, row.label)).join("")}
        </section>
        <section class="group">
          <h2 class="group__title">${tx("spotify.panel.lyrics")}</h2>
          <div class="lyrics" data-lyrics></div>
          <p class="hint" data-lyrics-hint hidden></p>
          <button class="btn btn--tiny" type="button" data-lyrics-retry hidden>${tx("spotify.panel.lyricsRetry")}</button>
        </section>
        <section class="group">
          <h2 class="group__title">${tx("spotify.panel.updates")}</h2>
          <p class="update__text" aria-live="polite"></p>
          <div class="update__actions">
            <button class="btn btn--primary" type="button" data-download hidden>${tx("spotify.panel.download")}</button>
            <button class="btn" type="button" data-recheck>${tx("spotify.panel.recheck")}</button>
          </div>
          ${switchRow("updateCheck", "spotify.panel.updateCheck")}
        </section>
        <details class="group diag" data-diag-details>
          <summary class="group__title">${tx("spotify.panel.diagnostics")}</summary>
          <div class="diag__rows" data-diag></div>
          <button class="btn btn--tiny" type="button" data-diag-copy>${tx("spotify.panel.diagCopy")}</button>
        </details>
        <footer class="panel__foot">
          <span class="version"></span>
          <button class="link" type="button" data-source>${tx("spotify.panel.source")}</button>
        </footer>
      </section>
      <button class="fab" type="button" aria-label="${tx("spotify.panel.open")}" aria-expanded="false">${LOGO}</button>
    </div>`;

  document.body.appendChild(host);

  function must<T extends Element>(selector: string): T {
    const found = shadow.querySelector<T>(selector);
    if (!found) throw new Error(`[sxe] missing ${selector}`);
    return found;
  }

  const fab = must<HTMLButtonElement>(".fab");
  const panel = must<HTMLElement>(".panel");
  const banner = must<HTMLElement>(".banner");
  const bannerText = must<HTMLElement>(".banner__text");
  const bannerAction = must<HTMLButtonElement>(".banner__action");
  const bannerClose = must<HTMLButtonElement>(".banner__close");
  const panelClose = must<HTMLButtonElement>(".panel__close");
  const safeBox = must<HTMLElement>(".safe");
  const accentGroup = must<HTMLElement>("[data-accent-group]");
  const featureGroup = must<HTMLElement>("[data-features]");
  const trackName = must<HTMLElement>("[data-track-name]");
  const trackArtists = must<HTMLElement>("[data-track-artists]");
  const copyLinkButton = must<HTMLButtonElement>("[data-copy-link]");
  const copyUriButton = must<HTMLButtonElement>("[data-copy-uri]");
  const openTrackButton = must<HTMLButtonElement>("[data-open-track]");
  const lyricsBox = must<HTMLElement>("[data-lyrics]");
  const lyricsHint = must<HTMLElement>("[data-lyrics-hint]");
  const lyricsRetry = must<HTMLButtonElement>("[data-lyrics-retry]");
  const updateText = must<HTMLElement>(".update__text");
  const downloadButton = must<HTMLButtonElement>("[data-download]");
  const recheckButton = must<HTMLButtonElement>("[data-recheck]");
  const diagDetails = must<HTMLDetailsElement>("[data-diag-details]");
  const diagBox = must<HTMLElement>("[data-diag]");
  const diagCopy = must<HTMLButtonElement>("[data-diag-copy]");
  const sourceButton = must<HTMLButtonElement>("[data-source]");
  const versionLabel = must<HTMLElement>(".version");
  const switches = Array.from(shadow.querySelectorAll<HTMLButtonElement>("[data-setting]"));
  const swatchButtons = Array.from(shadow.querySelectorAll<HTMLButtonElement>("[data-accent]"));

  versionLabel.textContent = `v${options.version}`;

  safeBox.hidden = !options.safeMode;
  featureGroup.hidden = options.safeMode;
  accentGroup.hidden = options.safeMode;

  function updateLine(): string {
    if (update.status === "checking") return tx("spotify.panel.checking");
    if (update.status === "error") return tx("spotify.panel.updateError");
    if (update.info) return tx("spotify.panel.updateAvailable", { version: update.info.version });
    if (update.status === "done") return tx("spotify.panel.updateLatest");
    return tx("spotify.panel.updateIdle");
  }

  function renderUpdate(): void {
    updateText.textContent = updateLine();
    downloadButton.hidden = update.info === null;
    downloadButton.disabled = update.status === "checking";
    recheckButton.disabled = update.status === "checking";

    const showBanner =
      !open && settings.updateCheck && update.info !== null && update.info.version !== dismissed;

    banner.hidden = !showBanner;
    if (update.info) {
      bannerText.textContent = tx("spotify.panel.updateAvailable", {
        version: update.info.version,
      });
    }
  }

  function renderTrack(): void {
    trackName.textContent = currentTrack?.name || tx("spotify.panel.noTrack");
    trackArtists.textContent = currentTrack ? currentTrack.artists.join(", ") : "";

    const link = trackLink(currentTrack);
    copyLinkButton.disabled = link === null;
    openTrackButton.disabled = link === null;
    copyUriButton.disabled = !currentTrack?.uri;
  }

  function renderAccent(): void {
    const active = getAccent();
    for (const button of swatchButtons) {
      button.setAttribute(
        "aria-pressed",
        String((button.dataset.accent ?? "") === active),
      );
    }
  }

  function renderLyrics(): void {
    lyrics = lyricsSnapshot();
    activeLine = -1;
    lyricsBox.textContent = "";
    lyricsHint.hidden = true;
    lyricsRetry.hidden = true;

    if (lyrics.status === "loading") {
      lyricsHint.textContent = tx("spotify.panel.lyricsLoading");
      lyricsHint.hidden = false;
      return;
    }

    if (lyrics.status === "none") {
      lyricsHint.textContent = tx("spotify.panel.lyricsEmpty");
      lyricsHint.hidden = false;
      lyricsRetry.hidden = false;
      return;
    }

    if (lyrics.status === "instrumental") {
      lyricsHint.textContent = tx("spotify.panel.lyricsInstrumental");
      lyricsHint.hidden = false;
      return;
    }

    if (lyrics.status === "error") {
      lyricsHint.textContent = tx("spotify.panel.lyricsError");
      lyricsHint.hidden = false;
      lyricsRetry.hidden = false;
      return;
    }

    if (lyrics.status !== "ready") return;

    if (!lyrics.synced) {
      const plain = document.createElement("p");
      plain.className = "lyrics__plain";
      plain.textContent = lyrics.lines.map((line) => line.text).join("\n");
      lyricsBox.appendChild(plain);
      return;
    }

    for (let index = 0; index < lyrics.lines.length; index += 1) {
      const line = document.createElement("div");
      line.className = "lyrics__line";
      line.dataset.line = String(index);
      line.textContent = lyrics.lines[index].text;
      lyricsBox.appendChild(line);
    }

    void highlight(true);
  }

  async function highlight(force = false): Promise<void> {
    if (!lyrics.synced || lyrics.lines.length === 0) return;

    const state = await playerSnapshot();
    const next = lineIndexAt(lyrics, state.position);
    if (next === activeLine && !force) return;

    if (activeLine >= 0) {
      lyricsBox.querySelector(`[data-line="${activeLine}"]`)?.classList.remove("is-active");
    }

    activeLine = next;
    if (next < 0) return;

    const line = lyricsBox.querySelector<HTMLElement>(`[data-line="${next}"]`);
    if (!line) return;

    line.classList.add("is-active");
    const top = line.offsetTop;
    if (top < lyricsBox.scrollTop || top + line.offsetHeight > lyricsBox.scrollTop + lyricsBox.clientHeight) {
      lyricsBox.scrollTop = Math.max(0, top - lyricsBox.clientHeight / 2 + line.offsetHeight / 2);
    }
  }

  async function refreshTrack(): Promise<void> {
    const state = await playerSnapshot();
    currentTrack = state.track;
    renderTrack();
  }

  function renderDiagnostics(): void {
    diagRows = collectDiagnostics(diagInput);
    diagBox.textContent = "";

    for (const row of diagRows) {
      const line = document.createElement("div");
      line.className = "diag__row";

      const label = document.createElement("span");
      label.textContent = row.label;

      const value = document.createElement("span");
      value.className = row.ok ? "diag__value" : "diag__value is-bad";
      value.textContent = row.value;

      line.append(label, value);
      diagBox.appendChild(line);
    }
  }

  function render(): void {
    settings = getSettings();

    for (const button of switches) {
      const key = button.dataset.setting as keyof RuntimeSettings | undefined;
      if (!key) continue;
      button.setAttribute("aria-checked", String(settings[key]));
    }

    renderUpdate();
    renderTrack();
    renderAccent();

    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
  }

  function activate(): void {
    if (!offSong) {
      offSong = onPlayer("songchange", () => {
        void refreshTrack();
      });
    }
    if (!offProgress) offProgress = onPlayer("progress", () => void highlight());

    setLyricsActive(true);
    void refreshTrack();
    renderLyrics();
    if (diagDetails.open) renderDiagnostics();
    void checkUpdate();
  }

  function deactivate(): void {
    offSong?.();
    offSong = null;
    offProgress?.();
    offProgress = null;
    setLyricsActive(false);
  }

  fab.addEventListener("click", () => {
    open = !open;
    render();
    if (open) activate();
    else deactivate();
  });

  panelClose.addEventListener("click", () => {
    open = false;
    deactivate();
    render();
  });

  bannerAction.addEventListener("click", () => openUpdate());
  bannerClose.addEventListener("click", () => {
    dismissed = update.info?.version ?? "";
    writeDismissed(dismissed);
    render();
  });

  downloadButton.addEventListener("click", () => openUpdate());
  recheckButton.addEventListener("click", () => void checkUpdate(true));
  sourceButton.addEventListener("click", () => openExternal(options.repo));

  for (const button of switches) {
    button.addEventListener("click", () => {
      const key = button.dataset.setting as keyof RuntimeSettings | undefined;
      if (!key) return;

      setSetting(key, !getSettings()[key]);
      if (key === "updateCheck" && getSettings().updateCheck) void checkUpdate();
    });
  }

  for (const button of swatchButtons) {
    button.addEventListener("click", () => setAccent(button.dataset.accent ?? ""));
  }

  copyLinkButton.addEventListener("click", () => {
    const link = trackLink(currentTrack);
    if (!link) return;
    void copyText(link).then((copied) => {
      if (copied) toast(tx("spotify.panel.linkCopied"), 2200);
    });
  });

  copyUriButton.addEventListener("click", () => {
    const uri = currentTrack?.uri;
    if (!uri) return;
    void copyText(uri).then((copied) => {
      if (copied) toast(tx("spotify.panel.uriCopied"), 2200);
    });
  });

  openTrackButton.addEventListener("click", () => {
    const link = trackLink(currentTrack);
    if (link) openExternal(link);
  });

  lyricsRetry.addEventListener("click", () => retryLyrics());

  diagDetails.addEventListener("toggle", () => {
    if (diagDetails.open) renderDiagnostics();
  });

  diagCopy.addEventListener("click", () => {
    renderDiagnostics();
    void copyDiagnostics(diagInput, diagRows);
  });

  onSettingsChange(() => render());
  onUpdateChange((next) => {
    update = next;
    render();
  });
  onAccentChange(() => renderAccent());
  onLyrics((next) => {
    lyrics = next;
    if (open) renderLyrics();
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!open) return;
      if (event.composedPath().includes(host)) return;
      open = false;
      deactivate();
      render();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !open) return;
    open = false;
    deactivate();
    render();
  });

  render();
  renderLyrics();
}
