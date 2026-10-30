export interface ManifestExtension {
  id?: string;
  file?: string;
}

export interface ExtensionFailure {
  id: string;
  reason: "load" | "timeout";
}

export const extensionFailures: ExtensionFailure[] = [];

function recordFailure(id: string, reason: ExtensionFailure["reason"]): void {
  if (extensionFailures.some((item) => item.id === id)) return;
  extensionFailures.push({ id, reason });
}

function inject(file: string, id: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = `sxe/extensions/${file}`;
    script.async = false;
    script.dataset.sxeExtension = id;

    let timer = 0;
    let settled = false;

    const finish = (reason?: ExtensionFailure["reason"]): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (reason) recordFailure(id, reason);
      resolve(reason === undefined);
    };

    script.addEventListener("load", () => finish(), { once: true });
    script.addEventListener("error", () => finish("load"), { once: true });
    timer = window.setTimeout(() => finish("timeout"), 10000);

    document.body.appendChild(script);
  });
}

export async function loadExtensionScripts(
  entries: ManifestExtension[],
  loaded: string[],
): Promise<void> {
  for (const entry of entries) {
    const file = typeof entry.file === "string" ? entry.file : "";
    if (!file) continue;

    const id =
      typeof entry.id === "string" && entry.id.length > 0
        ? entry.id
        : file.replace(/\.js$/i, "");

    const ok = await inject(file, id);
    if (ok && !loaded.includes(id)) loaded.push(id);
  }
}
