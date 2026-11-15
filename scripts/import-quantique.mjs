#!/usr/bin/env node
/**
 * Dossier interactif « Le quantique devient une industrie » : import de la publication Claude Design.
 *
 *   npm run quantique
 *   npm run quantique -- "D:\autre\Le quantique devient une industrie – Publication interactive.html"
 *
 * La publication est conçue dans Claude Design, puis téléchargée en un seul fichier HTML « empaqueté » :
 * le moteur de rendu (dc-runtime), Three.js, React, les figures interactives et les polices y sont
 * codés en base64 et déballés par le navigateur à l'ouverture. Ce script les déballe une fois pour toutes
 * dans public/dossiers/quantique/, pour que le site serve le dossier comme une page ordinaire :
 *
 *   index.html               la page : barre « ← Publications », métadonnées, chemins des fichiers ;
 *   moteur/                  dc-runtime, Three.js, React et ReactDOM, servis par le site (aucun CDN) ;
 *   figures/<Nom>.dc.html    les figures interactives, que le moteur charge à l'ouverture ;
 *   dossier.css              (écrit à la main, jamais régénéré) accord avec la charte du portfolio.
 *
 * Transformations, toutes dans ce fichier :
 * - polices de la charte : Inter à la place de Geist, Cormorant Garamond à la place d'Instrument Serif ;
 *   Geist Mono est gardée pour les repères techniques (sources, numéros de figure) ;
 * - thème sombre par défaut (le lecteur peut repasser en clair), viewport mobile, chargement différé ;
 * - la copie statique (affichée avant le moteur, ou sans JavaScript) prend les mêmes classes.
 * Le texte de la publication n'est pas modifié, sauf la limite « intégration au portfolio non testée »,
 * devenue fausse une fois le dossier publié et vérifié ici (voir FIXES).
 */
import { readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "quantique";
const BASE = `/dossiers/${SLUG}`;
const OUT = path.join(ROOT, "public", "dossiers", SLUG);
const STAGING = path.join(ROOT, ".cache", `dossier-${SLUG}-en-cours`);
const DEFAULT_SOURCE = path.join(
  os.homedir(),
  "Dropbox",
  "Articles",
  "Quantique",
  "Le quantique devient une industrie – Publication interactive.html",
);
const SOURCE = path.resolve(process.argv[2] ?? process.env.QUANTIQUE_HTML ?? DEFAULT_SOURCE);

// Fichiers écrits à la main dans public/dossiers/quantique/ : conservés d'un import à l'autre.
const HAND_WRITTEN = ["dossier.css"];

const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";

const META = {
  title: "Le quantique devient une industrie — dossier interactif · Ludovic Labeaut",
  description:
    "Dossier interactif : principes du calcul quantique, architectures, chaîne de valeur, preuves d'usage, sécurité post-quantique, économie et souveraineté. Quatorze chapitres, onze figures à manipuler, 69 références datées.",
  ogTitle: "Le quantique devient une industrie",
  ogDescription:
    "Un dossier interactif de Ludovic Labeaut : entre révolution scientifique, souveraineté technologique et incertitude économique.",
};

// Corrections du texte : [texte d'origine, texte publié]. Chaque correction doit trouver son texte.
const FIXES = [[" ; l’intégration au portfolio n’a pas été testée.</li>", ".</li>"]];

/** Lit un bloc <script type="__bundler/…"> du fichier empaqueté. */
function bundlePart(html, type) {
  const open = `<script type="__bundler/${type}">`;
  const start = html.indexOf(open);
  if (start < 0) return null;
  const end = html.indexOf("</script>", start + open.length);
  return JSON.parse(html.slice(start + open.length, end).trim());
}

function decode(entry) {
  const bytes = Buffer.from(entry.data, "base64");
  return entry.compressed ? gunzipSync(bytes) : bytes;
}

/** Polices de la charte, dans le gabarit comme dans le code des figures (y compris le dessin sur canevas). */
const restyle = (s) =>
  s
    .replace(/https:\/\/fonts\.googleapis\.com\/css2\?family=Geist[^"']*/g, FONTS.replace(/&/g, "&amp;"))
    .replace(/\bGeist\b(?![ +]Mono)/g, "Inter")
    .replace(/Instrument Serif/g, "Cormorant Garamond");

function replaceAll(s, from, to, what) {
  if (!s.includes(from)) throw new Error(`Introuvable dans la publication (${what}) : ${from.slice(0, 80)}`);
  return s.split(from).join(to);
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Publication introuvable : ${SOURCE}`);
    console.error('Indiquez-la en argument : npm run quantique -- "C:\\chemin\\vers\\Publication interactive.html"');
    process.exit(1);
  }
  const bundle = await readFile(SOURCE, "utf8");
  const manifest = bundlePart(bundle, "manifest");
  const resources = bundlePart(bundle, "ext_resources") ?? [];
  let template = bundlePart(bundle, "template");
  if (!manifest || typeof template !== "string") throw new Error("Ce fichier n'est pas une publication Claude Design empaquetée.");

  const files = new Map(); // chemin publié (relatif à OUT) -> contenu
  const urlOf = (rel) => `${BASE}/${rel}`;
  const runtimeMap = {}; // window.__resources : adresse demandée par le moteur -> fichier du site

  // Figures (« ./Bloch.dc.html ») et bibliothèques chargées par le moteur (React, ReactDOM).
  for (const { id, uuid } of resources) {
    const entry = manifest[uuid];
    if (!entry) continue;
    const figure = id.match(/^\.\/([\w-]+)\.dc\.html$/);
    if (figure) {
      const rel = `figures/${figure[1]}.dc.html`;
      files.set(rel, restyle(decode(entry).toString("utf8")));
      // Adresse sans .html : Vercel (cleanUrls) redirigerait sinon chaque figure.
      runtimeMap[id] = urlOf(rel.replace(/\.html$/, ""));
    } else if (/\/(react|react-dom)@[\d.]+\/umd\/[\w.-]+\.js$/.test(id)) {
      const rel = `moteur/${path.posix.basename(id)}`;
      files.set(rel, decode(entry));
      runtimeMap[id] = urlOf(rel);
    }
    // Les feuilles de polices Google Fonts ne sont pas reprises : la page charge celles de la charte.
  }

  // Scripts du gabarit : le moteur dc-runtime et Three.js.
  const headScripts = [];
  for (const [, uuid] of template.matchAll(/<script src="([0-9a-f-]{36})"><\/script>/g)) {
    const entry = manifest[uuid];
    const head = decode(entry).subarray(0, 400).toString("utf8");
    const rel = head.includes("dc-runtime") ? "moteur/dc-runtime.js" : head.includes("Three.js") ? "moteur/three.min.js" : null;
    if (!rel) throw new Error(`Script inconnu dans la publication : ${uuid}`);
    files.set(rel, decode(entry));
    headScripts.push(urlOf(rel));
  }
  if (!headScripts.some((u) => u.endsWith("dc-runtime.js"))) throw new Error("Moteur dc-runtime introuvable dans la publication.");
  // Three.js d'abord : les scènes 3D le trouvent ainsi toujours en place quand le moteur les monte.
  headScripts.sort((a, b) => Number(b.endsWith("three.min.js")) - Number(a.endsWith("three.min.js")));

  // Gabarit : la balise <x-dc> (page vivante et copie statique) et le script de la page.
  const xdcStart = template.indexOf("<x-dc>");
  const scriptEnd = template.lastIndexOf("</script>") + "</script>".length;
  let page = template.slice(xdcStart, scriptEnd);
  // Polices embarquées du gabarit : remplacées par celles de la charte (lien dans <head>).
  page = page.replace(/<style>(?:(?!<\/style>)[\s\S])*?@font-face[\s\S]*?<\/style>\n?/g, "");
  page = restyle(page);
  for (const [from, to] of FIXES) page = replaceAll(page, from, to, "correction du texte");
  // Thème sombre par défaut, comme le reste du site.
  page = replaceAll(page, "&quot;default&quot;:&quot;clair&quot;", "&quot;default&quot;:&quot;sombre&quot;", "thème par défaut");
  // Copie statique (visible le temps que le moteur démarre) : mêmes classes que la page vivante,
  // et libellés des boutons résolus pour le thème sombre (Claude Design les y laisse en {{…}}).
  page = replaceAll(page, '<div style="--cu: #C68D5A" data-canvas-width', '<div class="q dark" style="--cu: #C68D5A" data-canvas-width', "copie statique");
  const staticAt = page.indexOf("<sc-if data-dc-static");
  if (staticAt < 0) throw new Error("Copie statique introuvable dans la publication.");
  const labels = { themeLabel: "Mode clair", themeShort: "Clair", aideLabel: "Activer la lecture accompagnée" };
  const staticCopy = page.slice(staticAt).replace(/\{\{(themeLabel|themeShort|aideLabel)\}\}/g, (_, k) => labels[k]);
  const unresolved = staticCopy.match(/\{\{(?! false \}\})[^}]*\}\}/);
  if (unresolved) throw new Error(`Valeur non résolue dans la copie statique : ${unresolved[0]}`);
  page = page.slice(0, staticAt) + staticCopy;
  const leftover = page.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  if (leftover) throw new Error(`Ressource empaquetée non reprise : ${leftover[0]}`);

  const preloads = Object.values(runtimeMap).filter((u) => u.endsWith(".js"));
  files.set(
    "index.html",
    `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${META.title}</title>
  <meta name="description" content="${META.description}">
  <meta name="author" content="Ludovic Labeaut">
  <meta name="theme-color" content="#0b0c0e">
  <meta property="og:title" content="${META.ogTitle}">
  <meta property="og:description" content="${META.ogDescription}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${FONTS.replace(/&/g, "&amp;")}">
  <link rel="stylesheet" href="${BASE}/dossier.css">
  <!-- Publication conçue dans Claude Design, déballée par scripts/import-quantique.mjs : ne pas modifier à la main. -->
  <script>window.__resources = ${JSON.stringify(runtimeMap, null, 2).replace(/\n/g, "\n  ")};</script>
${preloads.map((u) => `  <link rel="preload" href="${u}" as="script">`).join("\n")}
${headScripts.map((u) => `  <script src="${u}" defer></script>`).join("\n")}
</head>
<body>
  <nav class="dz-bar" aria-label="Navigation">
    <a href="/publications">← Publications</a>
    <span class="dz-bar__name">Ludovic Labeaut · Lignes de force</span>
    <span>Dossier interactif</span>
  </nav>
  <main class="dz-main">
${page}
  </main>
</body>
</html>
`,
  );

  // Écriture en zone d'attente, puis remplacement du dossier publié (fichiers écrits à la main conservés).
  await rm(STAGING, { recursive: true, force: true });
  for (const [rel, content] of files) {
    await mkdir(path.dirname(path.join(STAGING, rel)), { recursive: true });
    await writeFile(path.join(STAGING, rel), content);
  }
  for (const f of HAND_WRITTEN) {
    if (!existsSync(path.join(OUT, f))) throw new Error(`Fichier attendu dans ${OUT} : ${f}`);
    await writeFile(path.join(STAGING, f), await readFile(path.join(OUT, f)));
  }
  await rm(OUT, { recursive: true, force: true });
  await rename(STAGING, OUT);

  const figures = [...files.keys()].filter((k) => k.startsWith("figures/"));
  console.log(`Dossier publié dans public${BASE}/ : ${figures.length} figures, ${files.size - figures.length - 1} fichiers du moteur.`);
  console.log(`Source : ${SOURCE}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
