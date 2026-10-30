// NAME: Playback speed
// AUTHOR: ninokiru
// DESCRIPTION: Switches the playback speed between 1x, 1.25x, 1.5x and 2x.
// VERSION: 1.0.0

(() => {
  const KEY = "sxe:speed";
  const SPEEDS = [1, 1.25, 1.5, 2];
  const MEDIA_SELECTOR = "audio, video";
  const api = window.SpotifyExtension;

  if (!api?.player) return;

  let speed = saved();

  function saved() {
    try {
      const value = Number.parseFloat(window.localStorage.getItem(KEY) ?? "");
      if (SPEEDS.includes(value)) return value;
    } catch {
      /* storage can be blocked */
    }
    return 1;
  }

  function persist() {
    try {
      window.localStorage.setItem(KEY, String(speed));
    } catch {
      /* storage can be blocked */
    }
  }

  function setRate(element) {
    if (!(element instanceof HTMLMediaElement)) return;
    element.playbackRate = speed;
  }

  function apply() {
    const elements = document.querySelectorAll(MEDIA_SELECTOR);
    elements.forEach((element) => {
      setRate(element);
    });
  }

  function cycle() {
    const index = SPEEDS.indexOf(speed);
    speed = SPEEDS[(index + 1) % SPEEDS.length];
    persist();
    apply();
    api.toast(`Speed: ${speed}x`, 1500);
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
    apply();
  });

  // The media element is created and destroyed while the client navigates,
  // so the rate is pushed again whenever a new one shows up.
  api.dom.observe(MEDIA_SELECTOR, (element) => {
    setRate(element);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  // An unusable stored value is replaced by the normal speed.
  persist();

  hotkey("alt+1", () => {
    cycle();
  });
})();
