import type { PlayerEvent, PlayerState, TrackInfo } from "../shared/api";
import { getRequire } from "./chunks";
import { scanCache } from "./internal";

type Rec = Record<string, unknown>;

const BUTTONS = {
  playpause: '[data-testid="control-button-playpause"]',
  next: '[data-testid="control-button-skip-forward"]',
  previous: '[data-testid="control-button-skip-back"]',
};

const SELECTORS = {
  position: '[data-testid="playback-position"]',
  duration: '[data-testid="playback-duration"]',
  progress: '[data-testid="playback-progressbar"]',
  progressPip: '[data-testid="progress-bar"]',
  volume: '[data-testid="volume-bar"]',
};

let api: Rec | null = null;
let discovering = false;
let attempts = 0;
let lastVolume = 0.5;
let lastPlaying = false;

function rec(value: unknown): Rec | null {
  return value !== null && typeof value === "object" ? (value as Rec) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function score(value: unknown): number {
  const candidate = rec(value);
  if (!candidate) return 0;

  const has = (name: string): boolean => typeof candidate[name] === "function";

  let total = 0;
  if (has("seek") || has("seekTo")) total += 3;
  if (has("setVolume")) total += 3;
  if (has("getState") || has("getPlayerState")) total += 2;
  if (has("skipToNext")) total += 1;
  if (has("togglePlay")) total += 1;
  if (has("resume") && has("pause")) total += 1;
  return total;
}

export function startDiscovery(): void {
  if (discovering) return;
  discovering = true;

  const tick = (): void => {
    const candidates = scanCache(getRequire(), (value) => score(value) >= 6, 10);
    candidates.sort((a, b) => score(b) - score(a));

    const best = candidates[0];
    if (best) {
      api = best as Rec;
      return;
    }

    attempts += 1;
    if (attempts >= 40) return;
    window.setTimeout(tick, 1500);
  };

  tick();
}

async function invoke(name: string, ...args: unknown[]): Promise<boolean> {
  if (!api) return false;
  const fn = api[name];
  if (typeof fn !== "function") return false;

  try {
    await Promise.resolve((fn as (...a: unknown[]) => unknown).apply(api, args));
    return true;
  } catch {
    return false;
  }
}

async function readMethod(name: string): Promise<unknown> {
  if (!api) return undefined;
  const fn = api[name];
  if (typeof fn !== "function") return undefined;

  try {
    return await Promise.resolve((fn as (...a: unknown[]) => unknown).apply(api));
  } catch {
    return undefined;
  }
}

function artistsOf(record: Rec): string[] {
  const list = record.artists;
  if (Array.isArray(list)) {
    return list
      .map((item) => {
        if (typeof item === "string") return item.trim();
        const entry = rec(item);
        return entry ? (str(entry.name) ?? "") : "";
      })
      .filter((name) => name.length > 0);
  }

  const joined = str(record.artist_name) ?? str(record.artist);
  if (!joined) return [];
  return joined
    .split(/\s*[,/;&]\s*/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function trackFrom(value: unknown): TrackInfo | null {
  const track = rec(value);
  if (!track) return null;

  const metadata = rec(track.metadata) ?? track;
  const name = str(metadata.name) ?? str(metadata.title) ?? str(metadata.track_name) ?? "";
  const uri = str(track.uri) ?? str(metadata.uri);
  if (!name && !uri) return null;

  return {
    uri,
    name,
    artists: artistsOf(metadata),
    album:
      str(metadata.album_name) ??
      str(metadata.album_title) ??
      str(metadata.album) ??
      "",
    artwork:
      str(metadata.image_url) ??
      str(metadata.image_large_url) ??
      str(metadata.image_xlarge_url) ??
      str(metadata.cover) ??
      null,
  };
}

function sessionTrack(): TrackInfo | null {
  try {
    const metadata = navigator.mediaSession?.metadata;
    if (!metadata) return null;

    const artwork = metadata.artwork ?? [];
    const last = artwork.length > 0 ? artwork[artwork.length - 1] : null;

    return {
      uri: null,
      name: metadata.title ?? "",
      artists: metadata.artist
        ? metadata.artist
            .split(/\s*[,/;&]\s*/)
            .map((name) => name.trim())
            .filter((name) => name.length > 0)
        : [],
      album: metadata.album ?? "",
      artwork: last?.src ?? null,
    };
  } catch {
    return null;
  }
}

function playbackFields(value: unknown): {
  playing?: boolean;
  position?: number;
  duration?: number;
  volume?: number;
} {
  const record = rec(value);
  if (!record) return {};

  let playing: boolean | undefined;
  if (typeof record.playing === "boolean") playing = record.playing;
  else if (typeof record.isPaused === "boolean") playing = !record.isPaused;
  else if (typeof record.paused === "boolean") playing = !record.paused;

  return {
    playing,
    position:
      num(record.position) ?? num(record.positionMs) ?? num(record.position_ms) ?? undefined,
    duration:
      num(record.duration) ?? num(record.durationMs) ?? num(record.duration_ms) ?? undefined,
    volume: num(record.volume) ?? undefined,
  };
}

async function readRaw(): Promise<{
  playing?: boolean;
  position?: number;
  duration?: number;
  volume?: number;
  track?: TrackInfo | null;
} | null> {
  if (!api) return null;

  const state = rec(await readMethod("getState"));
  if (state) {
    const playback =
      rec(state.playbackState) ?? rec(state.state) ?? rec(state.playback_state) ?? state;

    return {
      ...playbackFields(playback),
      track: trackFrom(state.track) ?? trackFrom(state.item) ?? null,
    };
  }

  const playback = await readMethod("getPlayerState");
  if (playback) return playbackFields(playback);

  return null;
}

function mediaElement(): HTMLMediaElement | null {
  const elements = Array.from(document.querySelectorAll<HTMLMediaElement>("audio, video"));
  return (
    elements.find((element) => Number.isFinite(element.duration) && element.duration > 0) ??
    elements[0] ??
    null
  );
}

function elementText(selector: string): string | null {
  const element = document.querySelector(selector);
  return element?.textContent?.trim() || null;
}

function parseClock(value: string | null): number | null {
  if (!value) return null;

  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.length === 0 || parts.some((part) => Number.isNaN(part))) return null;

  return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
}

function durationFromDom(): number | null {
  return parseClock(elementText(SELECTORS.duration));
}

export async function snapshot(): Promise<PlayerState> {
  const raw = await readRaw();
  const element = mediaElement();

  const track = raw?.track ?? sessionTrack();

  const playing = raw?.playing ?? (element ? !element.paused : lastPlaying);
  lastPlaying = playing;

  const position =
    raw?.position ??
    (element && Number.isFinite(element.currentTime) ? element.currentTime * 1000 : null) ??
    parseClock(elementText(SELECTORS.position)) ??
    0;

  const duration =
    raw?.duration ??
    (element && Number.isFinite(element.duration) ? element.duration * 1000 : null) ??
    durationFromDom() ??
    0;

  let volume = raw?.volume;
  if (volume === undefined) {
    const reported = num(await readMethod("getVolume"));
    if (reported !== null) volume = reported;
  }
  if (volume !== undefined) lastVolume = clamp01(volume);

  return {
    playing,
    position,
    duration,
    volume: clamp01(lastVolume),
    track,
  };
}

export async function track(): Promise<TrackInfo | null> {
  return (await snapshot()).track;
}

function clickButton(selector: string): boolean {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return false;
  element.click();
  return true;
}

export async function play(): Promise<boolean> {
  if (await invoke("resume")) return true;
  if ((await snapshot()).playing) return true;
  return clickButton(BUTTONS.playpause);
}

export async function pause(): Promise<boolean> {
  if (await invoke("pause")) return true;
  if (!(await snapshot()).playing) return true;
  return clickButton(BUTTONS.playpause);
}

export async function toggle(): Promise<boolean> {
  if (await invoke("togglePlay")) return true;
  return clickButton(BUTTONS.playpause);
}

export async function next(): Promise<boolean> {
  if (await invoke("skipToNext", {})) return true;
  return clickButton(BUTTONS.next);
}

export async function previous(): Promise<boolean> {
  if (await invoke("skipToPrevious", {})) return true;
  return clickButton(BUTTONS.previous);
}

function seekByPointer(positionMs: number): boolean {
  const bar =
    document.querySelector<HTMLElement>(SELECTORS.progress) ??
    document.querySelector<HTMLElement>(SELECTORS.progressPip);
  if (!bar) return false;

  const duration = durationFromDom() ?? 0;
  const rectangle = bar.getBoundingClientRect();
  if (rectangle.width <= 0) return false;

  const ratio = duration > 0 ? clamp01(positionMs / duration) : 0;
  const clientX = rectangle.left + ratio * rectangle.width;
  const clientY = rectangle.top + rectangle.height / 2;

  const init: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX,
    clientY,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
  };

  try {
    bar.dispatchEvent(new PointerEvent("pointerdown", init));
    bar.dispatchEvent(new PointerEvent("pointermove", init));
    bar.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }));
    return true;
  } catch {
    return false;
  }
}

export async function seek(positionMs: number): Promise<boolean> {
  const position = Math.max(0, positionMs);
  if (await invoke("seek", position)) return true;
  if (await invoke("seekTo", position)) return true;
  return seekByPointer(position);
}

function setVolumeByWheel(target: number): boolean {
  const bar = document.querySelector<HTMLElement>(SELECTORS.volume);
  if (!bar) return false;

  const delta = target - lastVolume;
  if (Math.abs(delta) < 0.005) return true;

  const steps = Math.min(12, Math.max(1, Math.ceil(Math.abs(delta) / 0.1)));
  const step = delta / steps;

  for (let index = 0; index < steps; index += 1) {
    bar.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: step * 1200,
        deltaMode: 0,
      }),
    );
  }

  lastVolume = target;
  return true;
}

export async function setVolume(volume: number): Promise<boolean> {
  const value = clamp01(volume);
  if (await invoke("setVolume", value)) {
    lastVolume = value;
    return true;
  }
  return setVolumeByWheel(value);
}

export async function getVolume(): Promise<number> {
  const reported = num(await readMethod("getVolume"));
  if (reported !== null) lastVolume = clamp01(reported);
  return lastVolume;
}

interface Subscription {
  event: PlayerEvent;
  handler: () => void;
}

const subscriptions = new Set<Subscription>();
let ticker: number | null = null;
let previousState: PlayerState | null = null;
let ticking = false;

function trackKey(info: TrackInfo | null): string {
  if (!info) return "";
  return `${info.uri ?? ""}|${info.name}`;
}

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;

  try {
    const next = await snapshot();
    const previous = previousState;
    previousState = next;
    if (!previous) return;

    const events: PlayerEvent[] = [];
    if (trackKey(previous.track) !== trackKey(next.track)) events.push("songchange");
    if (previous.playing !== next.playing) events.push("playpause");
    if (Math.abs(previous.position - next.position) >= 250) events.push("progress");
    if (Math.abs(previous.volume - next.volume) >= 0.01) events.push("volume");
    if (events.length === 0) return;

    for (const subscription of [...subscriptions]) {
      if (!events.includes(subscription.event)) continue;
      try {
        subscription.handler();
      } catch (error) {
        console.error("[sxe] player listener failed", error);
      }
    }
  } finally {
    ticking = false;
  }
}

function ensureTicker(): void {
  if (ticker !== null || subscriptions.size === 0) return;
  ticker = window.setInterval(() => void tick(), 700);
}

function stopTicker(): void {
  if (ticker === null || subscriptions.size > 0) return;
  window.clearInterval(ticker);
  ticker = null;
  previousState = null;
}

export function on(event: PlayerEvent, handler: () => void): () => void {
  const subscription: Subscription = { event, handler };
  subscriptions.add(subscription);
  ensureTicker();

  return () => {
    subscriptions.delete(subscription);
    stopTicker();
  };
}
