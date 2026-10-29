export function waitFor<T extends Element = Element>(
  selector: string,
  timeoutMs = 10000,
): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<T>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timer = 0;
    const observer = new MutationObserver(() => {
      const element = document.querySelector<T>(selector);
      if (!element) return;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(element);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    timer = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}

export function observe(
  selector: string,
  onFound: (element: Element) => void,
): () => void {
  const seen = new WeakSet<Element>();

  const check = (root: ParentNode): void => {
    if (root instanceof Element && root.matches(selector)) {
      if (!seen.has(root)) {
        seen.add(root);
        onFound(root);
      }
    }

    for (const element of root.querySelectorAll(selector)) {
      if (seen.has(element)) continue;
      seen.add(element);
      onFound(element);
    }
  };

  try {
    check(document);
  } catch {
    /* document may not be ready */
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) check(node);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  return () => observer.disconnect();
}
