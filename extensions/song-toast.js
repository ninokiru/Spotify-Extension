// NAME: Song toast
// AUTHOR: ninokiru
// DESCRIPTION: Pops the current track in the corner every time the song changes.
// VERSION: 1.0.0

(() => {
  const api = window.SpotifyExtension;
  if (!api) return;

  api.ready.then(() => {
    let lastKey = null;

    const announce = async () => {
      const track = await api.player.track();
      if (!track) return;

      const key = track.uri || `${track.name}|${track.artists.join(",")}`;
      if (key === lastKey) return;
      lastKey = key;

      const artists = track.artists.join(", ");
      api.toast(artists ? `${track.name} — ${artists}` : track.name, 3200);
    };

    api.player.on("songchange", () => {
      void announce();
    });
  });
})();
