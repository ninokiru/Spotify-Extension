export interface ManifestExtension {
  id?: string;
  file?: string;
}

function inject(file: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `sxe/extensions/${file}`;
    script.async = false;
    script.dataset.sxeExtension = id;

    let timer = 0;
    const done = (): void => {
      window.clearTimeout(timer);
      resolve();
    };

    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", done, { once: true });
    timer = window.setTimeout(done, 10000);

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

    await inject(file, id);
    if (!loaded.includes(id)) loaded.push(id);
  }
}
