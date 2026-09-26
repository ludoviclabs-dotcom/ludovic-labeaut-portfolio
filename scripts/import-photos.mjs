#!/usr/bin/env node
/**
 * Construit les photos du site à partir de deux sources :
 *
 *   1. scripts/photos-libres.json — photos libres de droits (Unsplash, DVIDS…), téléchargées
 *      depuis leur adresse d'origine et gardées en cache dans .cache/photos/ ;
 *   2. le dossier Dropbox (facultatif) — vos propres photos, rangées par préfixe de nom
 *      (Transition… → CARBON&CO, PROBANT… → PROBANT, etc.).
 *
 *   npm run photos
 *   npm run photos -- "D:\autre\dossier"
 *
 * Chaque photo est redressée (EXIF), recadrée si besoin, redimensionnée et convertie en WebP
 * dans public/images/<thème>/. Une photo dont la hauteur est inférieure à MIN_HEIGHT est
 * écartée : agrandie pour remplir un panneau plein écran, elle paraîtrait floue.
 * Le script régénère ensuite public/assets/js/photos.js (lu par le diaporama) et
 * public/credits.html (auteurs et licences).
 */
import { readdir, readFile, mkdir, writeFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_IMAGES = path.join(ROOT, "public", "images");
const OUT_MANIFEST = path.join(ROOT, "public", "assets", "js", "photos.js");
const OUT_CREDITS = path.join(ROOT, "public", "credits.html");
const FREE_LIST = path.join(ROOT, "scripts", "photos-libres.json");
const CACHE = path.join(ROOT, ".cache", "photos");

const DEFAULT_SOURCE = path.join(
  os.homedir(),
  "Dropbox",
  "recherche emplois",
  "photos illustration portfolio",
);

const SOURCE = path.resolve(process.argv[2] ?? process.env.PHOTOS_DIR ?? DEFAULT_SOURCE);

// Panneaux, dans l'ordre de la page, et préfixes des fichiers Dropbox qui leur reviennent.
const THEMES = [
  { id: "carbon-co", label: "CARBON&CO", match: /^(transition|carbon)/ },
  { id: "probant", label: "PROBANT", match: /^probant/ },
  { id: "panoplie", label: "PANOPLIE", match: /^(euro-?hawk|patriot|rafale|panoplie)/ },
  { id: "finvalstudio", label: "FINVALSTUDIO", match: /^fin-?val/ },
  { id: "publications", label: "PUBLICATIONS", match: /^(redaction|publication)/ },
];

// Photos Dropbox : légende et recadrage éventuels, par nom de fichier normalisé.
// Les captures d'écran de recherche d'images portent des éléments d'interface (icône Lens
// en bas à gauche, dimensions en bas à droite) : SCREENSHOT_CROP retire une bande sur chaque bord.
const DROPBOX_CAPTIONS = {
  "euro-hawk-rq-4": "Euro Hawk RQ-4",
  patriot: "Système Patriot",
  "rafale-1": "Rafale · © Dassault Aviation – A. Paringaux",
  "rafale-2": "Rafale",
};
const SCREENSHOT_CROP = { top: 0.02, right: 0.03, bottom: 0.12, left: 0.03 };
const DROPBOX_CROP = {
  "euro-hawk-rq-4": null,
  "rafale-2": null,
  "rafale-1": { top: 0, right: 0, bottom: 0.07, left: 0 },
};

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".tif", ".tiff", ".heic"]);
const MIN_HEIGHT = 1000; // px, après recadrage
const MAX_WIDTH = 2400;
const MAX_HEIGHT = 1600; // couvre un écran 1080p et la plupart des écrans haute densité
const QUALITY = 78;

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const naturalCompare = new Intl.Collator("fr", { numeric: true, sensitivity: "base" }).compare;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function readFreeList() {
  if (!existsSync(FREE_LIST)) return {};
  return JSON.parse(await readFile(FREE_LIST, "utf8"));
}

async function download(entry) {
  const ext = path.extname(new URL(entry.url).pathname) || ".jpg";
  const file = path.join(CACHE, `${entry.slug}${ext.length <= 5 ? ext : ".jpg"}`);
  if (existsSync(file)) return file;
  await mkdir(CACHE, { recursive: true });
  const res = await fetch(entry.url, { headers: { "User-Agent": "ludovic-labeaut-portfolio/1.0 (npm run photos)" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${entry.url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function collectDropbox() {
  const byTheme = Object.fromEntries(THEMES.map((t) => [t.id, []]));
  const skipped = [];
  if (!existsSync(SOURCE) || !(await stat(SOURCE)).isDirectory()) {
    console.log(`Dossier Dropbox introuvable (${SOURCE}) : seules les photos libres sont utilisées.`);
    return { byTheme, skipped };
  }
  const files = (await readdir(SOURCE)).filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
  for (const file of files) {
    const slug = slugify(path.parse(file.normalize("NFC")).name);
    const theme = THEMES.find((t) => t.match.test(slug));
    if (!theme) {
      skipped.push(`${file} : nom sans préfixe reconnu`);
      continue;
    }
    byTheme[theme.id].push({
      slug,
      input: path.join(SOURCE, file),
      label: file,
      caption: DROPBOX_CAPTIONS[slug] ?? null,
      crop: slug in DROPBOX_CROP ? DROPBOX_CROP[slug] : SCREENSHOT_CROP,
    });
  }
  for (const list of Object.values(byTheme)) list.sort((a, b) => naturalCompare(a.slug, b.slug));
  return { byTheme, skipped };
}

async function render(entry, themeId) {
  let image = sharp(entry.input).rotate();
  const { width, height } = await image.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  let w = width;
  let h = height;
  if (entry.crop) {
    const left = Math.round(width * entry.crop.left);
    const top = Math.round(height * entry.crop.top);
    w = width - left - Math.round(width * entry.crop.right);
    h = height - top - Math.round(height * entry.crop.bottom);
    image = image.extract({ left, top, width: w, height: h });
  }
  if (h < MIN_HEIGHT) return { rejected: `${entry.label} : ${w}×${h} px, trop petite (hauteur minimale ${MIN_HEIGHT} px)` };

  const out = path.join(OUT_IMAGES, themeId, `${entry.slug}.webp`);
  const info = await image
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(out);
  return { info };
}

function creditsPage(rows) {
  const items = rows
    .map(
      (r) => `      <li>
        <span class="panel">${escapeHtml(r.panel)}</span>
        <span class="what">${escapeHtml(r.title)}</span>
        <span class="who">${escapeHtml(r.credit)}</span>
        <span class="lic">${r.licenceUrl ? `<a href="${escapeHtml(r.licenceUrl)}">${escapeHtml(r.licence)}</a>` : escapeHtml(r.licence)}${r.page ? ` · <a href="${escapeHtml(r.page)}">source</a>` : ""}</span>
      </li>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crédits photo — Ludovic Labeaut</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <style>
    :root { color-scheme: dark; --ink: #f4f1ea; --dim: rgba(244, 241, 234, 0.62); --line: rgba(244, 241, 234, 0.14); }
    body { margin: 0; background: #0b0c0e; color: var(--ink); font: 15px/1.6 Inter, system-ui, sans-serif; }
    main { max-width: 860px; margin: 0 auto; padding: 3rem 1rem 4rem; }
    h1 { font: 600 1.6rem/1.2 "Cormorant Garamond", Garamond, serif; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 0.5rem; }
    p { color: var(--dim); margin: 0 0 2rem; }
    a { color: var(--ink); }
    ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
    li { display: grid; grid-template-columns: 9rem 1fr; gap: 0.1rem 1rem; padding: 0.9rem 0; border-bottom: 1px solid var(--line); }
    .panel { grid-row: span 3; font-size: 0.7rem; letter-spacing: 0.18em; color: var(--dim); padding-top: 0.2rem; }
    .who, .lic { color: var(--dim); font-size: 0.88rem; }
    @media (max-width: 560px) { li { grid-template-columns: 1fr; } .panel { grid-row: auto; } }
  </style>
</head>
<body>
  <main>
    <h1>Crédits photo</h1>
    <p><a href="./">← Retour au portfolio</a></p>
    <ul>
${items}
    </ul>
  </main>
</body>
</html>
`;
}

async function main() {
  const free = await readFreeList();
  const dropbox = await collectDropbox();
  const rejected = [...dropbox.skipped];

  await rm(OUT_IMAGES, { recursive: true, force: true });

  const manifest = {};
  const credits = [];
  let count = 0;

  for (const theme of THEMES) {
    manifest[theme.id] = [];
    await mkdir(path.join(OUT_IMAGES, theme.id), { recursive: true });
    const seen = new Set();

    const entries = [];
    for (const f of free[theme.id] ?? []) {
      try {
        entries.push({ ...f, input: await download(f), label: `${f.slug} (${f.source})`, crop: f.crop ?? null });
      } catch (err) {
        rejected.push(`${f.slug} : téléchargement impossible (${err.message})`);
      }
    }
    entries.push(...dropbox.byTheme[theme.id].map((e) => ({ ...e, source: "Dropbox" })));

    for (const entry of entries) {
      if (seen.has(entry.slug)) {
        rejected.push(`${entry.label} : doublon de « ${entry.slug} »`);
        continue;
      }
      seen.add(entry.slug);
      const result = await render(entry, theme.id);
      if (result.rejected) {
        rejected.push(result.rejected);
        continue;
      }
      const { info } = result;
      manifest[theme.id].push({
        src: `images/${theme.id}/${entry.slug}.webp`,
        width: info.width,
        height: info.height,
        caption: entry.caption ?? null,
        ...(entry.focus ? { focus: entry.focus } : {}),
      });
      if (entry.credit) {
        credits.push({
          panel: theme.label,
          title: entry.title ?? entry.caption ?? entry.slug,
          credit: entry.credit,
          licence: entry.licence ?? "",
          licenceUrl: entry.licenceUrl ?? null,
          page: entry.page ?? null,
        });
      }
      count += 1;
      console.log(`  ${theme.id.padEnd(13)} ${entry.label}  →  ${entry.slug}.webp  (${info.width}×${info.height}, ${Math.round(info.size / 1024)} Ko)`);
    }
  }

  const js =
    "// Fichier généré par scripts/import-photos.mjs (npm run photos) : ne pas modifier à la main.\n" +
    `window.PORTFOLIO_PHOTOS = ${JSON.stringify(manifest, null, 2)};\n`;
  await writeFile(OUT_MANIFEST, js, "utf8");
  await writeFile(OUT_CREDITS, creditsPage(credits), "utf8");

  console.log(`\n${count} photo(s) prêtes.`);
  for (const { id } of THEMES) {
    if (manifest[id].length === 0) console.log(`  (aucune photo pour « ${id} » : le panneau garde son visuel par défaut)`);
  }
  if (rejected.length) {
    console.log("\nÉcartées :");
    for (const s of rejected) console.log(`  - ${s}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
