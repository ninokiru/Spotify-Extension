// NAME: Adblock
// AUTHOR: ninokiru
// DESCRIPTION: Hides ad slots and sponsored cards in the Spotify client.
// VERSION: 1.0.0

(() => {
  const STYLE_ID = "sxe-adblock";
  const HIDDEN = "sxe-ad-hidden";

  const CSS = `
    .${HIDDEN} { display: none !important; }
    [data-testid="ad-slot"],
    [data-testid="card-ad"],
    [data-testid="ad-break"],
    .ad-break,
    .Root__ad-break,
    [class*="AdSlot"],
    [class*="adSlot"],
    [class*="sponsor-label"],
    [data-testid="sponsor-label"] { display: none !important; }
  `;

  const LABELS = ["advertisement", "sponsored", "quảng cáo", "được tài trợ"];

  const CARD_SELECTOR = [
    '[data-testid="card-container"]',
    '[data-testid="context-item-link"]',
    '[data-testid="card-click-handler"]',
    ".Root__cardContainer",
    "li",
    "section",
  ].join(", ");

  function style() {
    if (document.getElementById(STYLE_ID)) return;

    const element = document.createElement("style");
    element.id = STYLE_ID;
    element.textContent = CSS;
    document.head.appendChild(element);
  }

  function hide(root) {
    const expression = LABELS.map(
      (label) => `normalize-space(text())="${label}"`,
    ).join(" or ");

    let found;
    try {
      found = document.evaluate(
        `//*[${expression}]`,
        root,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
      );
    } catch {
      return;
    }

    for (let index = 0; index < found.snapshotLength; index += 1) {
      const node = found.snapshotItem(index);
      if (!(node instanceof Element)) continue;

      const target = node.closest(CARD_SELECTOR) ?? node;
      target.classList.add(HIDDEN);
    }
  }

  function sweep() {
    if (!document.body) return;
    hide(document.body);
  }

  function start() {
    style();
    sweep();

    // The client re-renders often, so the scan runs at most a few times a
    // second instead of on every single mutation.
    let pending = 0;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        sweep();
      }, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
