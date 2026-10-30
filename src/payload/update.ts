import type { UpdateInfo, UpdateSnapshot } from "../shared/api";
import { RELEASE_API, RELEASES_URL } from "../shared/links";

interface ReleaseResponse {
  tag_name?: unknown;
  html_url?: unknown;
  body?: unknown;
  published_at?: unknown;
}

interface Cache {
  at: number;
  info: UpdateInfo | null;
}

const CACHE_KEY = "sxe:update-cache";
const CACHE_TTL = 6 * 60 * 60 * 1000;
const TIMEOUT = 8000;

let endpoint = RELEASE_API;
let currentVersion = "0.0.0";
let snapshot: UpdateSnapshot = { status: "idle", info: null };
let pending: Promise<UpdateInfo | null> | null = null;
const listeners = new Set<(snapshot: UpdateSnapshot) => void>();

function apiUrl(repo: string): string {
  try {
    const path = new URL(repo).pathname.replace(/^\/+|\/+$/g, "");
    if (path.split("/").length === 2) {
      return `https://api.github.com/repos/${path}/releases/latest`;
    }
  } catch {
    /* fall back to the bundled repository */
  }
  return RELEASE_API;
}

export function initUpdate(options: { version: string; repo: string }): void {
  currentVersion = options.version;
  endpoint = apiUrl(options.repo);
}

function normalizeInfo(value: unknown): UpdateInfo | null {
  if (typeof value !== "object" || value === null) return null;

  const info = value as Partial<UpdateInfo>;
  if (typeof info.version !== "string" || typeof info.url !== "string") return null;

  return {
    version: info.version,
    url: info.url,
    notes: typeof info.notes === "string" ? info.notes : "",
    publishedAt: typeof info.publishedAt === "string" ? info.publishedAt : null,
  };
}

function readCache(): Cache | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Cache>;
    if (typeof parsed.at !== "number") return null;
    return { at: parsed.at, info: normalizeInfo(parsed.info) };
  } catch {
    return null;
  }
}

function writeCache(info: UpdateInfo | null): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), info }));
  } catch {
    /* storage can be blocked */
  }
}

function parts(value: string): number[] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/i.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isNewer(remote: string, local: string): boolean {
  const next = parts(remote);
  const current = parts(local);
  if (!next || !current) return false;

  for (let index = 0; index < 3; index += 1) {
    if (next[index] !== current[index]) return next[index] > current[index];
  }
  return false;
}

async function request(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export function updateSnapshot(): UpdateSnapshot {
  return snapshot;
}

export function updateInfo(): UpdateInfo | null {
  return snapshot.info;
}

function publish(status: UpdateSnapshot["status"], info: UpdateInfo | null): void {
  snapshot = { status, info };
  for (const listener of [...listeners]) {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("[sxe] update listener failed", error);
    }
  }
}

export function onUpdateChange(
  handler: (snapshot: UpdateSnapshot) => void,
): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

export function checkUpdate(force = false): Promise<UpdateInfo | null> {
  if (pending) return pending;

  pending = run(force).finally(() => {
    pending = null;
  });
  return pending;
}

async function run(force: boolean): Promise<UpdateInfo | null> {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.at < CACHE_TTL) {
    const stillNewer = cached.info === null || isNewer(cached.info.version, currentVersion);
    if (stillNewer) {
      publish("done", cached.info);
      return cached.info;
    }
  }

  publish("checking", snapshot.info);

  try {
    const response = await request(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const release = (await response.json()) as ReleaseResponse;
    const tag = typeof release.tag_name === "string" ? release.tag_name : "";

    const available = isNewer(tag, currentVersion)
      ? {
          version: tag.replace(/^v/i, ""),
          url: typeof release.html_url === "string" ? release.html_url : RELEASES_URL,
          notes: typeof release.body === "string" ? release.body.slice(0, 2000) : "",
          publishedAt:
            typeof release.published_at === "string" ? release.published_at : null,
        }
      : null;

    writeCache(available);
    publish("done", available);
    return available;
  } catch (error) {
    console.warn("[sxe] update check failed", error);
    publish("error", snapshot.info);
    return snapshot.info;
  }
}

export function openUpdate(): void {
  openExternal(snapshot.info?.url ?? RELEASES_URL);
}

export function openExternal(url: string): void {
  try {
    window.open(url, "_blank", "noopener");
  } catch {
    /* the client may block new windows */
  }
}
