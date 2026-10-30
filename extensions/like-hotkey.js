// NAME: Like hotkey
// AUTHOR: ninokiru
// DESCRIPTION: Presses the like button of the current track with Alt+L.
// VERSION: 1.0.0

(() => {
  const api = window.SpotifyExtension;

  if (!api?.player) return;

  const SELECTORS = [
    '[data-testid="now-playing-widget"] [data-testid="add-button"]',
    '[data-testid="now-playing-widget"] [data-testid="remove-button"]',
    '[data-testid="now-playing-widget"] button[aria-label*="Like"]',
    '[data-testid="now-playing-widget"] button[aria-label*="Saved"]',
    '[data-testid="now-playing-widget"] button[aria-label*="Thích"]',
  ];

  function find() {
    for (const selector of SELECTORS) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  function like() {
    const button = find();
    if (!(button instanceof HTMLElement)) {
      api.toast("Like button not found", 1600);
      return;
    }
    button.click();
  }

  if (api.keyboard?.register) {
    api.keyboard.register("alt+l", () => {
      like();
    });
  } else {
    window.addEventListener("keydown", (event) => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() !== "l") return;
      event.preventDefault();
      like();
    });
  }
})();
