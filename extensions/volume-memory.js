// NAME: Volume memory
// AUTHOR: ninokiru
// DESCRIPTION: Remembers the last volume level and restores it on start.
// VERSION: 1.0.0

(() => {
  const KEY = "sxe:volume";
  const api = window.SpotifyExtension;

  if (!api?.player) return;

  function saved() {
    try {
      const value = Number.parseFloat(window.localStorage.getItem(KEY) ?? "0");
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function remember(value) {
    try {
      window.localStorage.setItem(KEY, String(value));
    } catch {
      /* storage can be blocked */
    }
  }

  function restore() {
    const stored = saved();
    if (stored <= 0) return;

    void api.player.getVolume().then((current) => {
      if (Math.abs(current - stored) > 0.01) void api.player.setVolume(stored);
    });
  }

  // The player module is found a moment after the client boots, so wait for
  // it instead of guessing the volume.
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;

    if (api.player.available()) {
      window.clearInterval(timer);
      restore();
      return;
    }

    if (attempts >= 20) window.clearInterval(timer);
  }, 500);

  api.player.on("volume", () => {
    void api.player.getVolume().then(remember);
  });
})();
