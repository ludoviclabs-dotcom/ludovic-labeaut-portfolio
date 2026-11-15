#!/usr/bin/env node
/**
 * Dossier interactif « Atlas Nutraceutique » : publication sur le site.
 *
 *   npm run nutraceutique
 *   npm run nutraceutique -- "D:\autre\Atlas Nutraceutique.html"
 *
 * L'Atlas est une page autonome (styles, données et scripts dans un seul fichier), conçue avec Claude
 * et rangée dans Dropbox « Articles/Nutraceutique ». Ce script la copie dans
 * public/dossiers/nutraceutique/index.html en appliquant, à chaque import :
 * - un en-tête de page propre au site (langue, titre, description, icône) à la place de l'enveloppe
 *   d'export, et le lien « ← Publications » prévu par l'Atlas (BACK_LINK) ;
 * - les corrections de la relecture du 15/11/2026 (EDITS) : clarté du texte, provenance des chiffres
 *   de Nutri&Co, état au 15/11/2026 des points encore ouverts.
 * Le fichier Dropbox n'est pas modifié. Si l'Atlas change au point qu'une correction ne trouve plus
 * son texte, le script s'arrête et la nomme : relire le passage, puis adapter EDITS.
 * dossier.css (écrit à la main) est conservé d'un import à l'autre.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "nutraceutique";
const BASE = `/dossiers/${SLUG}`;
const OUT = path.join(ROOT, "public", "dossiers", SLUG);
const DEFAULT_SOURCE = path.join(os.homedir(), "Dropbox", "Articles", "Nutraceutique", "Atlas Nutraceutique.html");
const SOURCE = path.resolve(process.argv[2] ?? process.env.NUTRACEUTIQUE_HTML ?? DEFAULT_SOURCE);

const META = {
  title: "Atlas Nutraceutique — dossier interactif · Ludovic Labeaut",
  description:
    "Dossier interactif : chaîne de valeur, origines des ingrédients, capital, preuves cliniques, vigilance et règles européennes de la nutraceutique en France et en Europe. Corpus arrêté au 9 novembre 2026.",
  ogTitle: "Atlas Nutraceutique",
  ogDescription:
    "Un dossier interactif de Ludovic Labeaut : enquête sur la chaîne de valeur, les preuves cliniques et les dépendances d'une industrie de plus de 3 milliards d'euros.",
};

/**
 * Corrections : [motif, remplacement, raison]. Le motif doit apparaître exactement une fois.
 * Les faits ajoutés ont été vérifiés le 15/11/2026 (sources dans la description de la PR).
 */
const EDITS = [
  [
    "const BACK_LINK = null;",
    'const BACK_LINK = { href: "/publications", label: "← Publications" };',
    "lien de retour vers la page Publications",
  ],
  [
    "Ce dossier réunit onze articles d’intelligence économique et leurs sources.",
    "Ce dossier réunit onze articles d’intelligence économique et leurs sources, regroupés en huit chapitres : le bouton « Lire la suite » de chaque chapitre ouvre ses articles complets.",
    "correspondance entre les huit chapitres et les onze articles",
  ],
  [
    '<span class="stamp">Corpus arrêté au 9 novembre 2026</span>',
    '<span class="stamp">Corpus arrêté au 9 novembre 2026 · étude de cas au 15 novembre</span>',
    "deux dates de référence",
  ],
  [
    "<p>Les circuits sans conseil reculent, de 3,9 % en grande distribution et de 3 % dans les magasins bio. La vente en ligne gagne 5 %.",
    "<p>La grande distribution et les magasins bio reculent, de 3,9 % et de 3 %. La vente en ligne, sans comptoir elle aussi, gagne pourtant 5 %.",
    "« circuits sans conseil » contredit par la vente en ligne",
  ],
  [
    "L’entonnoir de 2012 : 222 autorisations, 1 548 plantes en suspens",
    "Le bilan de 2012 : 222 autorisations, 1 548 plantes en suspens",
    "« entonnoir » alors que l'entonnoir a été retiré le 09/11",
  ],
  [
    "Nutri&amp;Co, 20,8 M€ de chiffre d’affaires en 2025 selon ses comptes,",
    "Nutri&amp;Co, 20,8 M€ de chiffre d’affaires en 2025 selon les comptes de sa holding,",
    "le chiffre d'affaires ne figure pas dans les comptes publics de Nutri&Co",
  ],
  [
    "est passée sous le contrôle du fonds PAI Partners en 2024.",
    "est passée sous le contrôle du fonds PAI Partners en 2024. Selon L’Informé (12/11/2026), le fonds préparerait sa sortie, et l’exercice clos en septembre 2026 approcherait 100 M€ de chiffre d’affaires : information de presse non recoupée, postérieure aux données de cette étude.",
    "fait de presse postérieur à l'étude de cas",
  ],
  [
    'ref: "Comptes annuels 2024 et 2025 de NUTRI&CO (SIREN 825 396 492), chiffres d’affaires relevés dans les annexes des comptes de sa holding NARVA, d’après le dossier « Nutripure / Nutri&Co, finance interactive » du 15/11/2026 (Dropbox, Articles).", url: null, acc: "C" }',
    'ref: "Comptes annuels 2024 et 2025 de NUTRI&CO (SIREN 825 396 492). Les résultats nets sont publics (données INPI, Annuaire des entreprises). Le compte de résultat est déposé avec une confidentialité partielle : les chiffres d’affaires, absents des fiches publiques, sont relevés dans les annexes des comptes de la holding NARVA ; la valeur 2024 reste à confirmer sur ce dépôt.", url: null, acc: "C" }',
    "provenance réelle des chiffres d'affaires de Nutri&Co",
  ],
  [
    '<h3 style="font-size:19px;margin-bottom:8px">À vérifier avant diffusion externe</h3>',
    '<h3 style="font-size:19px;margin-bottom:8px">Points encore ouverts</h3>\n        <p class="small" style="margin:0 0 10px">Contrôle du 15/11/2026 : l’interdiction des monacolines et la mesure sur la rhubarbe, le séné et le nerprun ne sont toujours pas publiées au Journal officiel de l’UE ; aucune clôture n’est annoncée pour les cessions dsm-firmenich/CVC, Lonza/Lone Star et Nestlé/Yellow Wood (accord du 01/09/2026, clôture attendue au premier semestre 2027) ; le Critical Medicines Act attend le vote du Parlement européen, inscrit au 23/11/2026 ; le NMN n’est pas autorisé par la Commission.</p>',
    "état au 15/11/2026 des points à vérifier",
  ],
];

// L'Atlas compose en espaces insécables (avant %, :, ;, », €, entre groupes de chiffres) :
// un motif écrit avec des espaces ordinaires les accepte, et le remplacement les reprend.
const flexible = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ \\u00a0\\u202f]"), "g");
const typo = (s) =>
  s
    .replace(/ (?=[%:;»€!?])/g, "\u00a0")
    .replace(/« /g, "«\u00a0")
    .replace(/(\d) (?=\d{3}\b)/g, "$1\u00a0")
    .replace(/(\d) (?=M€|Md€)/g, "$1\u00a0");

function applyEdits(html) {
  for (const [from, to, why] of EDITS) {
    const re = flexible(from);
    const n = (html.match(re) || []).length;
    if (n !== 1) throw new Error(`Correction « ${why} » : texte trouvé ${n} fois au lieu d'une.\n  ${from.slice(0, 120)}`);
    html = html.replace(re, () => typo(to));
  }
  return html;
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Atlas introuvable : ${SOURCE}`);
    console.error('Indiquez-le en argument : npm run nutraceutique -- "C:\\chemin\\vers\\Atlas Nutraceutique.html"');
    process.exit(1);
  }
  const src = await readFile(SOURCE, "utf8");

  // L'export place l'en-tête de l'Atlas (titre, métas, polices, styles) au début de <body> :
  // tout ce qui précède le lien d'évitement passe dans <head>, sans l'enveloppe d'export.
  const bodyAt = src.indexOf("<body>");
  const skipAt = src.indexOf('<a class="skip"');
  if (bodyAt < 0 || skipAt < bodyAt) throw new Error("Structure de l'Atlas inattendue : <body> ou lien d'évitement introuvable.");
  const headPart = src
    .slice(bodyAt + "<body>".length, skipAt)
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/<meta name="claude:[^>]*>\s*/g, "")
    .replace(/<meta name="description"[^>]*>\s*/, "")
    .trim();
  let body = src.slice(skipAt).replace(/<\/body>\s*<\/html>\s*$/, "").trimEnd();
  body = applyEdits(body);
  if (!headPart.includes("<style>")) throw new Error("Styles de l'Atlas introuvables.");

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${META.title}</title>
  <meta name="description" content="${META.description}">
  <meta name="author" content="Ludovic Labeaut">
  <meta name="theme-color" content="#0b0f10">
  <meta property="og:title" content="${META.ogTitle}">
  <meta property="og:description" content="${META.ogDescription}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <!-- Atlas conçu avec Claude, publié par scripts/import-nutraceutique.mjs : ne pas modifier à la main. -->
  <style>[hidden]:not([hidden=until-found i]){display:none!important}body{margin:0}</style>
${headPart}
  <link rel="stylesheet" href="${BASE}/dossier.css">
</head>
<body>
${body}
</body>
</html>
`;

  await mkdir(OUT, { recursive: true });
  if (!existsSync(path.join(OUT, "dossier.css"))) throw new Error(`Fichier attendu : public${BASE}/dossier.css`);
  await writeFile(path.join(OUT, "index.html"), html, "utf8");
  console.log(`Atlas publié dans public${BASE}/index.html (${EDITS.length} corrections appliquées).`);
  console.log(`Source : ${SOURCE}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
