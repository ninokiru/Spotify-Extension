import type { TrackInfo } from "../shared/api";
import { on as onPlayer, snapshot as playerSnapshot } from "./player";

export interface LyricLine {
  time: number;
  text: string;
}

export type LyricsStatus =
  | "idle"
  | "loading"
  | "ready"
  | "none"
  | "instrumental"
  | "error";

export interface LyricsSnapshot {
  status: LyricsStatus;
  key: string;
  lines: LyricLine[];
  synced: boolean;
  track: TrackInfo | null;
}

interface LrclibRecord {
  instrumental?: unknown;
  plainLyrics?: unknown;
  syncedLyrics?: unknown;
  duration?: unknown;
}

const ENDPOINT = "https://lrclib.net/api";
const TIMEOUT = 8000;
/** Highlights a line slightly before its timestamp so it lines up with the vocal. */
const LEAD = 120;

const cache = new Map<string, LyricsSnapshot>();
const listeners = new Set<(snapshot: LyricsSnapshot) => void>();

let snapshot: LyricsSnapshot = blank();
let currentKey = "";
let offPlayer: (() => void) | null = null;
let controller: AbortController | null = null;

function blank(): LyricsSnapshot {
  return { status: "idle", key: "", lines: [], synced: false, track: null };
}

function keyOf(info: TrackInfo | null): string {
  if (!info) return "";
  if (info.uri) return info.uri;
  if (!info.name) return "";
  return `${info.name}|${info.artists.join(",")}|${info.album}`;
}

export function lyricsSnapshot(): LyricsSnapshot {
  return snapshot;
}

export function onLyrics(handler: (snapshot: LyricsSnapshot) => void): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

function publish(next: LyricsSnapshot): void {
  snapshot = next;
  for (const listener of [...listeners]) {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("[sxe] lyrics listener failed", error);
    }
  }
}

/** Fetching only runs while the panel is open, so idle users make no requests. */
export function setLyricsActive(active: boolean): void {
  if (active) {
    if (!offPlayer) offPlayer = onPlayer("songchange", () => void sync(false));
    void sync(false);
    return;
  }

  offPlayer?.();
  offPlayer = null;
  controller?.abort();
  controller = null;

  if (snapshot.status === "loading") {
    currentKey = "";
    publish(blank());
  }
}

export function retryLyrics(): void {
  const key = currentKey || keyOf(snapshot.track);
  if (key) cache.delete(key);
  currentKey = "";
  void sync(true);
}

async function sync(force: boolean): Promise<void> {
  const state = await playerSnapshot();
  const info = state.track;
  const key = keyOf(info);

  if (!force && key === currentKey) return;

  currentKey = key;
  controller?.abort();
  controller = null;

  if (!info || !key) {
    publish(blank());
    return;
  }

  const cached = cache.get(key);
  if (cached && !force) {
    publish(cached);
    return;
  }

  publish({ status: "loading", key, lines: [], synced: false, track: info });
  await load(info, key, state.duration);
}

async function load(info: TrackInfo, key: string, duration: number): Promise<void> {
  const local = new AbortController();
  controller = local;
  const timer = window.setTimeout(() => local.abort(), TIMEOUT);

  try {
    const result = await request(info, duration, local.signal);
    if (controller !== local) return;
    if (result.status !== "error") cache.set(key, result);
    publish(result);
  } catch {
    if (controller !== local) return;
    publish({ status: "error", key, lines: [], synced: false, track: info });
  } finally {
    window.clearTimeout(timer);
    if (controller === local) controller = null;
  }
}

async function request(
  info: TrackInfo,
  duration: number,
  signal: AbortSignal,
): Promise<LyricsSnapshot> {
  const base: LyricsSnapshot = {
    status: "none",
    key: keyOf(info),
    lines: [],
    synced: false,
    track: info,
  };

  const record = await fetchRecord(info, duration, signal);
  if (!record) return base;
  if (record.instrumental === true) return { ...base, status: "instrumental" };

  const synced =
    typeof record.syncedLyrics === "string" ? parseSynced(record.syncedLyrics) : [];
  if (synced.length > 0) {
    return { ...base, status: "ready", lines: synced, synced: true };
  }

  const plain =
    typeof record.plainLyrics === "string" ? plainLines(record.plainLyrics) : [];
  if (plain.length > 0) {
    return {
      ...base,
      status: "ready",
      lines: plain.map((text) => ({ time: 0, text })),
      synced: false,
    };
  }

  return base;
}

function isRecord(value: unknown): value is LrclibRecord {
  return value !== null && typeof value === "object";
}

async function fetchRecord(
  info: TrackInfo,
  duration: number,
  signal: AbortSignal,
): Promise<LrclibRecord | null> {
  const trackName = info.name.trim();
  if (!trackName) return null;

  const artist = info.artists[0] ?? "";
  const seconds = duration > 0 ? Math.round(duration / 1000) : 0;

  const params = new URLSearchParams({ track_name: trackName });
  if (artist) params.set("artist_name", artist);
  if (info.album) params.set("album_name", info.album);
  if (seconds > 0) params.set("duration", String(seconds));

  const direct = await fetch(`${ENDPOINT}/get?${params.toString()}`, { signal });

  if (direct.ok) {
    const record = (await direct.json()) as unknown;
    return isRecord(record) ? record : null;
  }

  if (direct.status !== 404) throw new Error(`HTTP ${direct.status}`);

  const search = new URLSearchParams({ track_name: trackName });
  if (artist) search.set("artist_name", artist);

  const response = await fetch(`${ENDPOINT}/search?${search.toString()}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const list = (await response.json()) as unknown;
  if (!Array.isArray(list)) return null;

  const records = list.filter(isRecord);
  if (records.length === 0) return null;
  if (seconds <= 0) return records[0];

  let best = records[0];
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const record of records) {
    if (typeof record.duration !== "number") continue;
    const delta = Math.abs(record.duration - seconds);
    if (delta < bestDelta) {
      best = record;
      bestDelta = delta;
    }
  }

  return bestDelta <= 5 ? best : null;
}

function toMs(match: RegExpExecArray): number {
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ?? "";

  const millis =
    fraction.length === 0
      ? 0
      : fraction.length === 1
        ? Number(fraction) * 100
        : fraction.length === 2
          ? Number(fraction) * 10
          : Number(fraction);

  return minutes * 60_000 + seconds * 1000 + millis;
}

const TIME_TAG = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/;

function parseSynced(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const source of raw.split(/\r?\n/)) {
    let rest = source.trim();
    const times: number[] = [];

    let tag = TIME_TAG.exec(rest);
    while (tag) {
      times.push(toMs(tag));
      rest = rest.slice(tag[0].length).trimStart();
      tag = TIME_TAG.exec(rest);
    }

    if (times.length === 0) continue;
    const text = rest.trim();
    if (!text) continue;

    for (const time of times) lines.push({ time, text });
  }

  lines.sort((a, b) => a.time - b.time);
  return lines;
}

function plainLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Index of the last lyric line at or before `positionMs`, or -1. */
export function lineIndexAt(value: LyricsSnapshot, positionMs: number): number {
  if (!value.synced || value.lines.length === 0) return -1;

  const target = positionMs + LEAD;
  let low = 0;
  let high = value.lines.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (value.lines[mid].time <= target) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return found;
}
