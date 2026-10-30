// NAME: Skip short tracks
// AUTHOR: ninokiru
// DESCRIPTION: Skips tracks shorter than 45 seconds while they are playing.
// VERSION: 1.0.0

(() => {
  const KEY = "sxe:skip-short";
  const MIN_DURATION = 45000;
  const api = window.SpotifyExtension;

  if (!api?.player) return;

  function enabled() {
    try {
      return window.localStorage.getItem(KEY) !== "0";
    } catch {
      return true;
    }
  }

  function toggle() {
    try {
      window.localStorage.setItem(KEY, enabled() ? "0" : "1");
    } catch {
      /* storage can be blocked */
    }
  }

  async function handle() {
    if (!enabled()) return;

    const state = await api.player.state();
    if (!state.playing) return;
    if (!(state.duration > 0 && state.duration < MIN_DURATION)) return;

    await api.player.next();
  }

  function hotkey(combo, handler) {
    if (api.keyboard?.register) {
      api.keyboard.register(combo, handler);
      return;
    }

    const key = combo.split("+").pop() ?? "";
    window.addEventListener("keydown", (event) => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() !== key) return;
      event.preventDefault();
      handler(event);
    });
  }

  api.player.on("songchange", () => {
    void handle();
  });

  hotkey("alt+k", () => {
    toggle();
    api.toast(
      enabled() ? "Skip short tracks: on" : "Skip short tracks: off",
      2200,
    );
  });
})();
