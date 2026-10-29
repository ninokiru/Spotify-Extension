interface Binding {
  modifiers: Set<string>;
  key: string;
  handler: (event: KeyboardEvent) => void;
}

const bindings: Binding[] = [];
let listening = false;

function parseCombo(combo: string): Omit<Binding, "handler"> | null {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const key = parts.pop();
  if (!key) return null;

  return { modifiers: new Set(parts), key };
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function matches(binding: Binding, event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  if (key !== binding.key && !(key === " " && binding.key === "space")) return false;

  if (binding.modifiers.has("ctrl") !== event.ctrlKey) return false;
  if (binding.modifiers.has("shift") !== event.shiftKey) return false;
  if (binding.modifiers.has("alt") !== event.altKey) return false;
  if (binding.modifiers.has("meta") && !event.metaKey) return false;

  return true;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  if (isEditable(event.target) && !event.ctrlKey && !event.altKey && !event.metaKey) {
    return;
  }

  for (const binding of [...bindings]) {
    if (!matches(binding, event)) continue;

    event.preventDefault();
    event.stopPropagation();
    try {
      binding.handler(event);
    } catch (error) {
      console.error("[sxe] keyboard handler failed", error);
    }
    return;
  }
}

function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("keydown", onKeyDown, true);
}

export function registerKey(
  combo: string,
  handler: (event: KeyboardEvent) => void,
): () => void {
  const parsed = parseCombo(combo);
  if (!parsed) return () => undefined;

  const binding: Binding = { ...parsed, handler };
  bindings.push(binding);
  listen();

  return () => {
    const index = bindings.indexOf(binding);
    if (index >= 0) bindings.splice(index, 1);
  };
}
