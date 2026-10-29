// NAME: Quick keys
// AUTHOR: ninokiru
// DESCRIPTION: Alt+←/→ seek 10s · Alt+↑/↓ volume 5% · Alt+M mute.
// VERSION: 1.0.0

(() => {
  const api = window.SpotifyExtension;
  if (!api) return;

  const SEEK_STEP = 10000;
  const VOLUME_STEP = 0.05;
  let lastVolume = 0.5;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  api.ready.then(() => {
    api.keyboard.register("alt+arrowright", async () => {
      const state = await api.player.state();
      if (state.duration <= 0) return;
      await api.player.seek(clamp(state.position + SEEK_STEP, 0, state.duration));
    });

    api.keyboard.register("alt+arrowleft", async () => {
      const state = await api.player.state();
      if (state.duration <= 0) return;
      await api.player.seek(clamp(state.position - SEEK_STEP, 0, state.duration));
    });

    api.keyboard.register("alt+arrowup", async () => {
      const current = await api.player.getVolume();
      const next = clamp(Math.round((current + VOLUME_STEP) * 100) / 100, 0, 1);
      if (next === current) return;
      lastVolume = next;
      await api.player.setVolume(next);
      api.toast(`${Math.round(next * 100)}%`, 1200);
    });

    api.keyboard.register("alt+arrowdown", async () => {
      const current = await api.player.getVolume();
      const next = clamp(Math.round((current - VOLUME_STEP) * 100) / 100, 0, 1);
      if (next === current) return;
      if (next > 0) lastVolume = next;
      await api.player.setVolume(next);
      api.toast(`${Math.round(next * 100)}%`, 1200);
    });

    api.keyboard.register("alt+m", async () => {
      const current = await api.player.getVolume();
      if (current > 0) {
        lastVolume = current;
        await api.player.setVolume(0);
        api.toast("0%", 1200);
      } else {
        const restore = lastVolume > 0 ? lastVolume : 0.5;
        await api.player.setVolume(restore);
        api.toast(`${Math.round(restore * 100)}%`, 1200);
      }
    });
  });
})();
