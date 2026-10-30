// NAME: Auto skip explicit
// AUTHOR: ninokiru
// DESCRIPTION: Skips tracks marked explicit while playing.
// VERSION: 1.0.0

(() => {
  const KEY = "sxe:skip-explicit";
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
    if (state.track?.explicit !== true) return;

    await api.player.next();
  }

  api.player.on("songchange", () => {
    void handle();
  });

  window.addEventListener("keydown", (event) => {
    if (event.altKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      toggle();
      api.toast(
        enabled() ? "Auto skip explicit: on" : "Auto skip explicit: off",
        2200,
      );
    }
  });
})();
