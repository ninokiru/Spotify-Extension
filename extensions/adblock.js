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

  // Card roots only: generic "li"/"section" ancestors would hide a whole row
  // or panel that merely happens to contain a sponsored card.
  const CARD_SELECTOR = [
    '[data-testid="card-container"]',
    '[data-testid="context-item-link"]',
    '[data-testid="card-click-handler"]',
    ".Root__cardContainer",
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
      // descendant-or-self keeps the walk inside `root`; an absolute "//" would
      // ignore the context node and re-scan the entire document every time.
      found = document.evaluate(
        `descendant-or-self::*[${expression}]`,
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

  function start() {
    style();

    const body = document.body;
    if (!body) return;

    // The client renders before this script runs, so the first pass still has
    // to cover the whole page exactly once.
    hide(body);

    // Later on only freshly inserted subtrees are scanned: walking the full
    // tree on every re-render is what burned CPU while the track changed.
    const pending = new Set();
    let timer = 0;

    const observer = new MutationObserver((mutations) => {
      for (let index = 0; index < mutations.length; index += 1) {
        const added = mutations[index].addedNodes;
        for (let node = 0; node < added.length; node += 1) {
          if (added[node] instanceof Element) pending.add(added[node]);
        }
      }

      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        pending.forEach((node) => hide(node));
        pending.clear();
      }, 400);
    });

    observer.observe(body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
