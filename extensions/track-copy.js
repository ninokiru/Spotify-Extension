// NAME: Track copy
// AUTHOR: ninokiru
// DESCRIPTION: Alt+C copies the current track as "Song — Artist" to the clipboard.
// VERSION: 1.1.0

(() => {
  const api = window.SpotifyExtension;
  if (!api) return;

  const vi = (navigator.language || "").toLowerCase().startsWith("vi");
  const text = {
    copied: vi ? "Đã copy bài hát" : "Copied track",
    empty: vi ? "Chưa có bài hát nào" : "Nothing playing",
  };

  const copy = async () => {
    const track = await api.player.track();
    if (!track) {
      api.toast(text.empty, 1800);
      return;
    }

    const artists = track.artists.join(", ");
    const value = artists ? `${track.name} — ${artists}` : track.name;
    const clipboard = navigator.clipboard;

    if (!clipboard) {
      api.toast(value, 3200);
      return;
    }

    try {
      await clipboard.writeText(value);
      api.toast(text.copied, 1600);
    } catch {
      api.toast(value, 3200);
    }
  };

  api.ready.then(() => {
    api.keyboard.register("alt+c", () => {
      void copy();
    });
  });
})();
