// Copie les vidéos de démonstration du site (../public/videos) dans public/captures,
// où la vidéo les lit. Les copies ne sont pas versionnées : le site reste la seule source.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.resolve(root, "../public/videos");
const to = path.join(root, "public/captures");
const files = ["carbon-co", "probant", "panoplie", "finvalstudio", "kyb-graph", "publications"].map((n) => `${n}.mp4`);

mkdirSync(to, { recursive: true });
for (const file of files) {
  const src = path.join(from, file);
  const dest = path.join(to, file);
  if (!existsSync(src)) throw new Error(`Vidéo introuvable : ${src}`);
  if (existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs) continue;
  copyFileSync(src, dest);
  console.log(`copié : ${file}`);
}
