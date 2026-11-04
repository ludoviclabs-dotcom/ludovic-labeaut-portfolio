// Copie dans public/ les médias du site dont la vidéo a besoin :
//   ../public/videos/<projet>.mp4   → public/captures/   (démonstrations des applications)
//   ../public/images/<thème>/*.webp → public/photos/      (photos Unsplash et DVIDS du portfolio)
// Les copies ne sont pas versionnées : le site reste la seule source.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.resolve(root, "../public");

const copy = (src, dest) => {
  if (!existsSync(src)) throw new Error(`Fichier introuvable : ${src}`);
  mkdirSync(path.dirname(dest), { recursive: true });
  if (existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs) return;
  copyFileSync(src, dest);
  console.log(`copié : ${path.relative(root, dest)}`);
};

for (const n of ["carbon-co", "probant", "panoplie", "finvalstudio", "kyb-graph", "publications"]) {
  copy(path.join(site, "videos", `${n}.mp4`), path.join(root, "public/captures", `${n}.mp4`));
}
for (const theme of readdirSync(path.join(site, "images"))) {
  const dir = path.join(site, "images", theme);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".webp")) copy(path.join(dir, file), path.join(root, "public/photos", theme, file));
  }
}
