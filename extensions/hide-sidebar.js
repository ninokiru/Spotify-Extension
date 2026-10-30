// NAME: Hide sidebar
// AUTHOR: ninokiru
// DESCRIPTION: Hides the left sidebar of the Spotify client with Alt+B.
// VERSION: 1.0.0

(() => {
  const KEY = "sxe:hide-sidebar";
  const CLASS_NAME = "sxe-no-sidebar";
  const CSS = `
    body.${CLASS_NAME} [data-testid="left-sidebar"],
    body.${CLASS_NAME} .Root__nav-bar,
    body.${CLASS_NAME} #Desktop_LeftSidebar_Id { display: none !important; }
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
    api.toast(next ? "Sidebar hidden" : "Sidebar shown", 1800);
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
    api.css.add(CSS, "sxe-no-sidebar");
    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  hotkey("alt+b", () => {
    toggle();
  });
})();
