import type { WebpackRequire } from "../shared/api";

const MAX_PROPS = 80;

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value !== null && (typeof value === "object" || typeof value === "function");
}

function ownValues(exports: unknown): unknown[] {
  if (!isObjectLike(exports)) return [];

  let names: string[];
  try {
    names = Object.getOwnPropertyNames(exports).slice(0, MAX_PROPS);
  } catch {
    return [];
  }

  const values: unknown[] = [];
  for (const name of names) {
    try {
      const value = (exports as Record<string, unknown>)[name];
      if (isObjectLike(value)) values.push(value);
    } catch {
      /* getters from the bundle may throw */
    }
  }
  return values;
}

/**
 * Walks the webpack module cache and returns exports (and their direct
 * property values) accepted by the predicate. Stops after `limit` matches.
 */
export function scanCache(
  require: WebpackRequire | null,
  accept: (value: unknown) => boolean,
  limit = 8,
): unknown[] {
  const cache = require?.c;
  if (!cache) return [];

  const results: unknown[] = [];
  const seen = new Set<unknown>();

  let ids: string[];
  try {
    ids = Object.keys(cache);
  } catch {
    return [];
  }

  for (const id of ids) {
    let exports: unknown;
    try {
      exports = cache[id]?.exports;
    } catch {
      continue;
    }

    if (!isObjectLike(exports) || seen.has(exports)) continue;
    seen.add(exports);

    let accepted = false;
    try {
      accepted = accept(exports);
    } catch {
      accepted = false;
    }
    if (accepted) {
      results.push(exports);
      if (results.length >= limit) return results;
      continue;
    }

    for (const value of ownValues(exports)) {
      if (seen.has(value)) continue;
      seen.add(value);

      let hit = false;
      try {
        hit = accept(value);
      } catch {
        hit = false;
      }
      if (hit) {
        results.push(value);
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}
