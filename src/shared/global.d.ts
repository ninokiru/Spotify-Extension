import type { BridgeApi } from "./types";
import type { SpotifyExtensionApi } from "./api";

declare global {
  interface Window {
    bridge: BridgeApi;
    SpotifyExtension?: SpotifyExtensionApi;
  }
}

export {};
