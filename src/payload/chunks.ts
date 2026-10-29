import type { WebpackRequire } from "../shared/api";

type AnyRecord = Record<string, unknown>;

const CHUNK_NAMES = [
  "webpackChunkclient_web",
  "webpackChunk",
  "rspackChunkclient_web",
  "rspackChunk",
] as const;

let requireFn: WebpackRequire | null = null;
let installed = false;

interface PinnedArray extends Array<unknown> {
  __sxePinned?: boolean;
}

function capture(value: unknown): void {
  if (typeof value !== "function") return;
  const candidate = value as WebpackRequire;
  if (candidate.c && typeof candidate.c === "object") {
    requireFn = candidate;
  }
}

function inspect(chunk: unknown): void {
  if (!Array.isArray(chunk)) return;
  capture(chunk[2]);
}

function pin(array: PinnedArray): PinnedArray {
  if (array.__sxePinned) return array;
  array.__sxePinned = true;

  for (const entry of array) inspect(entry);

  const original = array.push.bind(array);
  array.push = (...items: unknown[]): number => {
    for (const item of items) inspect(item);
    return original(...items);
  };

  return array;
}

function trap(name: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  if (descriptor && !descriptor.configurable) {
    const existing = descriptor.value;
    if (Array.isArray(existing)) pin(existing as PinnedArray);
    return;
  }

  let current: unknown = (globalThis as unknown as AnyRecord)[name];
  if (Array.isArray(current)) current = pin(current as PinnedArray);

  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: () => current,
    set: (value: unknown) => {
      current = Array.isArray(value) ? pin(value as PinnedArray) : value;
    },
  });
}

export function installChunkHooks(): void {
  if (installed) return;
  installed = true;
  for (const name of CHUNK_NAMES) trap(name);
}

export function getRequire(): WebpackRequire | null {
  if (requireFn) return requireFn;

  const direct = (globalThis as unknown as AnyRecord).__webpack_require__;
  if (typeof direct === "function") {
    const candidate = direct as WebpackRequire;
    if (candidate.c && typeof candidate.c === "object") requireFn = candidate;
  }

  return requireFn;
}

export function waitForRequire(timeoutMs = 15000): Promise<WebpackRequire | null> {
  if (requireFn) return Promise.resolve(requireFn);
  return new Promise((resolve) => {
    const started = Date.now();
    const poll = (): void => {
      if (requireFn) {
        resolve(requireFn);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(poll, 150);
    };
    poll();
  });
}
