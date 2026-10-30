import type { PlayerState } from "../shared/api";
import { on as onPlayer, seek, snapshot, track } from "./player";
import { getSettings, onSettingsChange } from "./settings";
import { addCss, toast } from "./ui";

const CONTROLS = '[data-testid="player-controls"]';
const PLAY = '[data-testid="control-button-playpause"]';
const DURATION = '[data-testid="playback-duration"]';
const STEP = 10_000;

const BACK_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.5 5.9a5.1 5.1 0 1 1-.5 3.3"/>
  <path d="M3.3 2.9v3h3"/>
  <text x="8" y="10.5" text-anchor="middle" font-size="5.4" font-weight="600" fill="currentColor" stroke="none" font-family="Segoe UI, Arial, sans-serif">10</text>
</svg>`;

const FORWARD_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g transform="translate(16 0) scale(-1 1)">
    <path d="M3.5 5.9a5.1 5.1 0 1 1-.5 3.3"/>
    <path d="M3.3 2.9v3h3"/>
  </g>
  <text x="8" y="10.5" text-anchor="middle" font-size="5.4" font-weight="600" fill="currentColor" stroke="none" font-family="Segoe UI, Arial, sans-serif">10</text>
</svg>`;

const SEEK_CSS = `
.sxe-seek {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin: 0 2px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-subdued, #b3b3b3);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}
.sxe-seek:hover {
  color: var(--text-base, #ffffff);
  background: rgba(255, 255, 255, 0.06);
}
.sxe-seek:active { transform: scale(0.94); }
.sxe-seek svg { display: block; }
`;

let seekObserver: MutationObserver | null = null;
let seekPending = 0;
let seekCss: (() => void) | null = null;
let toastOff: (() => void) | null = null;
let timeTimer = 0;

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (value: number): string => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`;
}

async function step(offset: number): Promise<void> {
  const state: PlayerState = await snapshot();
  let target = Math.max(0, state.position + offset);
  if (state.duration > 0) target = Math.min(target, state.duration);
  await seek(target);
}

function seekButton(kind: "back" | "forward"): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sxe-seek";
  button.dataset.sxeSeek = kind;
  button.title = kind === "back" ? "-10s" : "+10s";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = kind === "back" ? BACK_ICON : FORWARD_ICON;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    void step(kind === "back" ? -STEP : STEP);
  });

  return button;
}

function injectSeek(): void {
  const controls = document.querySelector<HTMLElement>(CONTROLS);
  if (!controls) return;

  const play = controls.querySelector<HTMLElement>(PLAY);
  if (!play) return;

  let back = controls.querySelector<HTMLElement>('[data-sxe-seek="back"]');
  if (!back) {
    back = seekButton("back");
    play.before(back);
  } else if (back.nextElementSibling !== play) {
    play.before(back);
  }

  let forward = controls.querySelector<HTMLElement>('[data-sxe-seek="forward"]');
  if (!forward) {
    forward = seekButton("forward");
    play.after(forward);
  } else if (play.nextElementSibling !== forward) {
    play.after(forward);
  }
}

function scheduleSeek(): void {
  if (seekPending) return;
  seekPending = window.setTimeout(() => {
    seekPending = 0;
    injectSeek();
  }, 100);
}

function touchesPlayer(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element && (node.matches(PLAY) || !!node.querySelector(PLAY))) {
        return true;
      }
    }
    for (const node of mutation.removedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(PLAY) || node.matches("[data-sxe-seek]")) return true;
    }
  }
  return false;
}

function applySeek(enabled: boolean): void {
  seekObserver?.disconnect();
  seekObserver = null;
  if (seekPending) window.clearTimeout(seekPending);
  seekPending = 0;

  if (!enabled) {
    document.querySelectorAll("[data-sxe-seek]").forEach((element) => element.remove());
    seekCss?.();
    seekCss = null;
    return;
  }

  seekCss = addCss(SEEK_CSS, "seek-buttons");
  injectSeek();

  // The client re-renders its controls on every track change; watch for the
  // play button instead of polling on a timer.
  seekObserver = new MutationObserver((mutations) => {
    if (touchesPlayer(mutations)) scheduleSeek();
  });
  seekObserver.observe(document.body, { childList: true, subtree: true });
}

function applyToast(enabled: boolean): void {
  toastOff?.();
  toastOff = null;
  if (!enabled) return;

  let last = "";

  toastOff = onPlayer("songchange", () => {
    void track().then((info) => {
      if (!info || !info.name) return;

      const key = `${info.uri ?? ""}|${info.name}`;
      if (key === last) return;
      last = key;

      const artists = info.artists.join(", ");
      toast(artists ? `${info.name} — ${artists}` : info.name, 3400);
    });
  });
}

async function syncRemaining(): Promise<void> {
  const element = document.querySelector<HTMLElement>(DURATION);
  if (!element) return;

  const state = await snapshot();
  if (state.duration <= 0) return;

  const text = `-${formatTime(Math.max(0, state.duration - state.position))}`;
  if (element.textContent !== text) element.textContent = text;
}

function applyTime(enabled: boolean): void {
  if (timeTimer) window.clearInterval(timeTimer);
  timeTimer = 0;

  if (!enabled) {
    const element = document.querySelector<HTMLElement>(DURATION);
    if (!element) return;

    void snapshot().then((state) => {
      if (state.duration > 0) element.textContent = formatTime(state.duration);
    });
    return;
  }

  timeTimer = window.setInterval(() => void syncRemaining(), 500);
  void syncRemaining();
}

export function installTweaks(): void {
  const settings = getSettings();

  applySeek(settings.seekButtons);
  applyToast(settings.songToast);
  applyTime(settings.timeRemaining);

  onSettingsChange((next) => {
    applySeek(next.seekButtons);
    applyToast(next.songToast);
    applyTime(next.timeRemaining);
  });
}
