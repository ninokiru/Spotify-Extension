export type Language = "en" | "vi";

export type InstallVariant = "normal" | "store";

export type Arch = "x64" | "ia32" | "arm64" | "unknown";

/** Who currently owns the modifications inside the xpui folder. */
export type PatchedBy = "none" | "sxe" | "spicetify" | "foreign";

export type InstallState =
  | "stock"
  | "patched"
  | "foreign"
  | "partial"
  | "unsupported";

export interface SpotifyInstall {
  /** Stable id derived from the install root, safe to use as a folder name. */
  id: string;
  name: string;
  /** Folder that holds Spotify.exe (or the LocalState\Spotify folder for Store installs). */
  root: string;
  appsPath: string;
  xpuiPath: string;
  variant: InstallVariant;
  version: string | null;
  arch: Arch;
  state: InstallState;
  patchedBy: PatchedBy;
  hasBackup: boolean;
  backupAt: string | null;
  note: string | null;
}

export interface ExtensionInfo {
  id: string;
  name: string;
  author: string;
  description: string;
  version: string;
  file: string;
  bundled: boolean;
  enabled: boolean;
  size: number;
}

export interface ThemeInfo {
  id: string;
  name: string;
  path: string;
  bundled: boolean;
  hasCss: boolean;
}

export interface AppSettings {
  language: Language;
  installId: string | null;
  /** Extra folders the user picked by hand. */
  customRoots: string[];
  extensions: string[];
  theme: string | null;
  colors: Record<string, string>;
  customCss: string;
  autoApply: boolean;
}

export interface OpResult {
  ok: boolean;
  /** Translation key resolved by the renderer. */
  code: string;
  params?: Record<string, string | number>;
  /** Raw technical detail, never translated. */
  detail?: string;
}

export interface ProgressEvent {
  task: "detect" | "backup" | "apply" | "restore";
  code: string;
  percent: number;
}

export interface BridgeApi {
  app: {
    version: () => Promise<string>;
    platform: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
  };
  installs: {
    detect: () => Promise<SpotifyInstall[]>;
    chooseFolder: () => Promise<string | null>;
    openFolder: (installId: string) => Promise<void>;
  };
  actions: {
    install: (installId: string) => Promise<OpResult>;
    repair: (installId: string) => Promise<OpResult>;
    uninstall: (installId: string) => Promise<OpResult>;
    restartSpotify: (installId: string) => Promise<OpResult>;
  };
  extensions: {
    list: () => Promise<ExtensionInfo[]>;
    setEnabled: (id: string, enabled: boolean) => Promise<ExtensionInfo[]>;
    openFolder: () => Promise<void>;
    reload: () => Promise<ExtensionInfo[]>;
  };
  themes: {
    list: () => Promise<ThemeInfo[]>;
    apply: (themeId: string | null) => Promise<OpResult>;
    openFolder: () => Promise<void>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    patch: (patch: Partial<AppSettings>) => Promise<AppSettings>;
    openConfig: () => Promise<void>;
  };
  events: {
    onProgress: (cb: (event: ProgressEvent) => void) => () => void;
  };
}
