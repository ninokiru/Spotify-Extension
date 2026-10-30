export interface TrackInfo {
  uri: string | null;
  name: string;
  artists: string[];
  album: string;
  artwork: string | null;
  /** Set when Spotify marks the track as explicit. */
  explicit: boolean | null;
}

export interface PlayerState {
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  track: TrackInfo | null;
}

export type PlayerEvent = "songchange" | "playpause" | "progress" | "volume";

/** Tweaks that can be switched on from the panel inside Spotify. */
export interface RuntimeSettings {
  seekButtons: boolean;
  songToast: boolean;
  timeRemaining: boolean;
  updateCheck: boolean;
}

export interface UpdateInfo {
  version: string;
  url: string;
  notes: string;
  publishedAt: string | null;
}

export interface UpdateSnapshot {
  status: "idle" | "checking" | "done" | "error";
  info: UpdateInfo | null;
}

export type WebpackRequire = ((id: string | number) => unknown) & {
  c?: Record<string, { exports?: unknown }>;
  m?: Record<string, unknown>;
};

export interface SpotifyExtensionApi {
  readonly version: string;
  readonly ready: Promise<void>;

  player: {
    state: () => Promise<PlayerState>;
    track: () => Promise<TrackInfo | null>;
    play: () => Promise<boolean>;
    pause: () => Promise<boolean>;
    toggle: () => Promise<boolean>;
    next: () => Promise<boolean>;
    previous: () => Promise<boolean>;
    seek: (positionMs: number) => Promise<boolean>;
    setVolume: (volume: number) => Promise<boolean>;
    getVolume: () => Promise<number>;
    /** False while Spotify's own player module has not been found yet. */
    available: () => boolean;
    on: (event: PlayerEvent, handler: () => void) => () => void;
  };

  dom: {
    waitFor: <T extends Element = Element>(
      selector: string,
      timeoutMs?: number,
    ) => Promise<T | null>;
    observe: (
      selector: string,
      onFound: (element: Element) => void,
    ) => () => void;
  };

  css: {
    add: (css: string, id?: string) => () => void;
  };

  toast: (message: string, ms?: number) => void;

  keyboard: {
    register: (combo: string, handler: (event: KeyboardEvent) => void) => () => void;
  };

  events: {
    on: (name: string, handler: (payload?: unknown) => void) => () => void;
    emit: (name: string, payload?: unknown) => void;
  };

  settings: {
    get: () => RuntimeSettings;
    set: <K extends keyof RuntimeSettings>(
      key: K,
      value: RuntimeSettings[K],
    ) => void;
    onChange: (handler: (settings: RuntimeSettings) => void) => () => void;
  };

  update: {
    check: (force?: boolean) => Promise<UpdateInfo | null>;
    current: () => UpdateInfo | null;
    onChange: (handler: (snapshot: UpdateSnapshot) => void) => () => void;
  };

  /** Escape hatch into Spotify's own bundle. Null when hooking failed. */
  internal: {
    readonly require: WebpackRequire | null;
    findModules: (predicate: (exports: Record<string, unknown>) => boolean) => unknown[];
  };

  extensions: {
    loaded: string[];
  };
}
