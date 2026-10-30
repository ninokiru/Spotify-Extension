// NAME: Focus mode
// AUTHOR: ninokiru
// DESCRIPTION: Dims the sidebar and the main view so the player bar stands out.
// VERSION: 1.0.0

(() => {
  const KEY = "sxe:focus-mode";
  const CLASS_NAME = "sxe-focus-mode";
  const CSS = `
    body.${CLASS_NAME} [data-testid="left-sidebar"],
    body.${CLASS_NAME} .Root__nav-bar,
    body.${CLASS_NAME} .Root__main-view {
      opacity: .35;
      filter: saturate(.6);
      transition: opacity 220ms ease, filter 220ms ease;
    }
  `;
  const api = window.SpotifyExtension;

  if (!api?.player) return;

  function enabled() {
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  }

  function persist(value) {
    try {
      window.localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      /* storage can be blocked */
    }
  }

  function apply() {
    const body = document.body;
    if (!body) return;
    body.classList.toggle(CLASS_NAME, enabled());
  }

  function toggle() {
    const next = !enabled();
    persist(next);
    apply();
    api.toast(next ? "Focus mode: on" : "Focus mode: off", 1800);
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

  function start() {
    api.css.add(CSS, "sxe-focus-mode");
    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  hotkey("alt+f", () => {
    toggle();
  });
})();
