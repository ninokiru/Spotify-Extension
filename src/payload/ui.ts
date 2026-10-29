const BASE_STYLE_ID = "sxe-base-styles";

const BASE_CSS = `
.sxe-toast {
  position: fixed;
  left: 50%;
  bottom: 104px;
  z-index: 2147483000;
  max-width: min(460px, calc(100vw - 48px));
  padding: 12px 20px;
  border-radius: 8px;
  background: var(--background-elevated-base, rgba(40, 40, 40, 0.96));
  color: var(--text-base, #ffffff);
  font-family: var(--font-family, "Segoe UI", "Helvetica Neue", sans-serif);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  opacity: 0;
  transform: translate(-50%, 10px);
  pointer-events: none;
  transition: opacity 180ms ease, transform 180ms ease;
}
.sxe-toast--visible {
  opacity: 1;
  transform: translate(-50%, 0);
}
`;

export function ensureStyles(): void {
  if (document.getElementById(BASE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BASE_STYLE_ID;
  style.textContent = BASE_CSS;
  document.head.appendChild(style);
}

export function addCss(css: string, id?: string): () => void {
  if (id) document.getElementById(`sxe-css-${id}`)?.remove();

  const style = document.createElement("style");
  style.dataset.sxe = "true";
  if (id) style.id = `sxe-css-${id}`;
  style.textContent = css;
  document.head.appendChild(style);

  return () => style.remove();
}

export function toast(message: string, ms = 3000): void {
  ensureStyles();

  const element = document.createElement("div");
  element.className = "sxe-toast";
  element.textContent = message;
  document.body.appendChild(element);

  requestAnimationFrame(() => element.classList.add("sxe-toast--visible"));

  window.setTimeout(
    () => {
      element.classList.remove("sxe-toast--visible");
      window.setTimeout(() => element.remove(), 220);
    },
    Math.max(600, ms),
  );
}
