import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "src", "renderer");
const target = path.join(root, "dist", "renderer");

await mkdir(target, { recursive: true });
await cp(path.join(source, "index.html"), path.join(target, "index.html"));
await cp(path.join(source, "styles"), path.join(target, "styles"), {
  recursive: true,
});

console.log("copied renderer static files -> dist/renderer");
