// NAME: Volume wheel
// AUTHOR: ninokiru
// DESCRIPTION: Changes the volume by five percent when the wheel turns over the player bar.
// VERSION: 1.0.0

(() => {
  const STEP = 0.05;
  const TOAST_INTERVAL = 800;
  const BAR_SELECTOR = [
    '[data-testid="now-playing-bar"]',
    ".Root__now-playing-bar",
    '[data-testid="now-playing-widget"]',
  ].join(", ");
  const api = window.SpotifyExtension;

  if (!api?.player) return;

  let queued = 0;
  let running = false;
  let lastToast = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function showVolume(value) {
    const now = Date.now();
    if (now - lastToast < TOAST_INTERVAL) return;
    lastToast = now;
    api.toast(`${Math.round(value * 100)}%`, 1200);
  }

  async function apply() {
    running = true;
    try {
      while (queued !== 0) {
        const delta = queued;
        queued = 0;

        const current = await api.player.getVolume();
        const next = clamp(current + delta, 0, 1);
        await api.player.setVolume(next);
        showVolume(next);
      }
    } catch {
      /* the player may be busy */
    } finally {
      running = false;
    }
  }

  window.addEventListener(
    "wheel",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(BAR_SELECTOR)) return;
      if (event.deltaY === 0) return;

      queued += event.deltaY < 0 ? STEP : -STEP;
      if (!running) void apply();
    },
    { passive: true },
  );
})();
