#!/usr/bin/env node
/**
 * Importe les photos du dossier Dropbox dans le site.
 *
 *   npm run photos
 *   npm run photos -- "D:\autre\dossier"
 *
 * Pour chaque fichier image du dossier source :
 *   1. le thème est déduit du nom (Transition… → CARBON&CO, PROBANT… → PROBANT, etc.) ;
 *   2. l'image est redressée (EXIF), redimensionnée et convertie en WebP dans public/images/<thème>/ ;
 *   3. public/assets/js/photos.js est régénéré : c'est la liste que lit le diaporama.
 *
 * Ajouter une photo = la déposer dans Dropbox avec un nom qui commence par le bon préfixe,
 * relancer `npm run photos`, puis commit + push.
 */
import { readdir, mkdir, writeFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_IMAGES = path.join(ROOT, "public", "images");
const OUT_MANIFEST = path.join(ROOT, "public", "assets", "js", "photos.js");

const DEFAULT_SOURCE = path.join(
  os.homedir(),
  "Dropbox",
  "recherche emplois",
  "photos illustration portfolio",
);

const SOURCE = path.resolve(process.argv[2] ?? process.env.PHOTOS_DIR ?? DEFAULT_SOURCE);

// Préfixe du nom de fichier → panneau. L'ordre compte : la première règle qui correspond gagne.
const THEMES = [
  { id: "carbon-co", match: /^(transition|carbon)/ },
  { id: "probant", match: /^probant/ },
  { id: "panoplie", match: /^(euro-?hawk|patriot|rafale|panoplie)/ },
  { id: "finvalstudio", match: /^fin-?val/ },
  { id: "publications", match: /^(redaction|publication)/ },
];

// Ordre de passage voulu dans un panneau ; les photos non listées suivent, triées par nom.
const ORDER = {
  panoplie: ["rafale-1", "euro-hawk-rq-4", "patriot", "rafale-2"],
};

// Légende affichée en bas du panneau pendant que la photo est à l'écran.
const CAPTIONS = {
  "euro-hawk-rq-4": "Euro Hawk RQ-4",
  patriot: "Système Patriot",
  "rafale-1": "Rafale",
  "rafale-2": "Rafale",
};

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".tif", ".tiff", ".heic"]);
const MAX_SIZE = 2000; // px, plus grand côté
const QUALITY = 80;

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const naturalCompare = new Intl.Collator("fr", { numeric: true, sensitivity: "base" }).compare;

function sortForTheme(themeId, entries) {
  const preferred = ORDER[themeId] ?? [];
  const rank = (slug) => {
    const i = preferred.indexOf(slug);
    return i === -1 ? preferred.length : i;
  };
  return entries.sort((a, b) => rank(a.slug) - rank(b.slug) || naturalCompare(a.slug, b.slug));
}

async function main() {
  if (!existsSync(SOURCE) || !(await stat(SOURCE)).isDirectory()) {
    console.error(`Dossier introuvable : ${SOURCE}`);
    console.error('Indiquez-le en argument : npm run photos -- "C:\\chemin\\vers\\le\\dossier"');
    process.exit(1);
  }

  const files = (await readdir(SOURCE)).filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
  const byTheme = Object.fromEntries(THEMES.map((t) => [t.id, []]));
  const skipped = [];

  for (const file of files) {
    const slug = slugify(path.parse(file.normalize("NFC")).name);
    const theme = THEMES.find((t) => t.match.test(slug));
    if (!theme) {
      skipped.push(file);
      continue;
    }
    if (byTheme[theme.id].some((e) => e.slug === slug)) {
      skipped.push(`${file} (doublon de « ${slug} »)`);
      continue;
    }
    byTheme[theme.id].push({ file, slug });
  }

  await rm(OUT_IMAGES, { recursive: true, force: true });

  const manifest = {};
  let count = 0;
  for (const { id } of THEMES) {
    const entries = sortForTheme(id, byTheme[id]);
    manifest[id] = [];
    if (entries.length === 0) continue;
    await mkdir(path.join(OUT_IMAGES, id), { recursive: true });

    for (const { file, slug } of entries) {
      const out = path.join(OUT_IMAGES, id, `${slug}.webp`);
      const info = await sharp(path.join(SOURCE, file))
        .rotate()
        .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toFile(out);
      manifest[id].push({
        src: `images/${id}/${slug}.webp`,
        width: info.width,
        height: info.height,
        caption: CAPTIONS[slug] ?? null,
      });
      count += 1;
      console.log(`  ${id.padEnd(13)} ${file}  →  ${slug}.webp  (${info.width}×${info.height}, ${Math.round(info.size / 1024)} Ko)`);
    }
  }

  const js =
    "// Fichier généré par scripts/import-photos.mjs (npm run photos) : ne pas modifier à la main.\n" +
    `window.PORTFOLIO_PHOTOS = ${JSON.stringify(manifest, null, 2)};\n`;
  await writeFile(OUT_MANIFEST, js, "utf8");

  console.log(`\n${count} photo(s) importée(s) depuis ${SOURCE}`);
  for (const { id } of THEMES) {
    if (manifest[id].length === 0) console.log(`  (aucune photo pour « ${id} » : le panneau garde son visuel par défaut)`);
  }
  if (skipped.length) {
    console.log("\nIgnorés (nom sans préfixe reconnu) :");
    for (const s of skipped) console.log(`  - ${s}`);
    console.log("Préfixes acceptés : Transition/Carbon, PROBANT, Euro-Hawk/Patriot/Rafale/Panoplie, FinVal, Rédaction/Publication.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
