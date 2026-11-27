#!/usr/bin/env node
/**
 * « Fil rouge » : écrit dans les pages les textes de public/data/fil-rouge.json,
 * qui reste la seule source de ces textes.
 *
 *   npm run fil-rouge            met à jour les pages et leurs traductions (i18n/en/)
 *   npm run fil-rouge -- --check vérifie que les pages sont à jour, sans rien écrire (code 1 sinon)
 *
 * Après une mise à jour, relancer « npm run en » pour régénérer public/en/.
 *
 * Ce que le script écrit :
 *   - public/fil-rouge.html, en entier (page « Le fil rouge », adresse /fil-rouge : cahier clair, sans JavaScript) ;
 *   - accueil (public/index.html) : le lien « Pourquoi ces projets ? » dans la barre du haut,
 *     et la question de chaque projet après la liste des axes de son panneau ;
 *   - pages projet (public/projets/<id>.html) : le bloc « Pourquoi ce projet », avant la ligne
 *     « Ouvrir l'application ».
 * Dans les pages existantes, chaque bloc est entre deux repères <!-- fil-rouge:… --> … <!-- /fil-rouge:… -->.
 * Un bloc absent est créé à l'emplacement indiqué ; un bloc présent est remplacé.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL } from "./site.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public", "data", "fil-rouge.json");
const CHECK = process.argv.includes("--check");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const normalize = (s) => s.replace(/\s+/g, " ").trim();
const indent = (lines, n) => lines.map((l) => (l ? " ".repeat(n) + l : l)).join("\n");
const ARROW = `<svg class="pj-cta__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

/** Fichiers lus puis modifiés en mémoire : { before, after }. Un fichier absent part d'un texte vide. */
const files = new Map();
async function open(file, empty = "") {
  if (!files.has(file)) {
    const text = existsSync(file) ? await readFile(file, "utf8") : empty;
    files.set(file, { before: existsSync(file) ? text : null, after: text });
  }
  return files.get(file);
}

/** Remplace le bloc repéré par `id`, ou l'insère avant `anchor` (suivi de `sep`) s'il n'existe pas encore. */
function putBlock(html, id, block, anchor, sep, label) {
  const marked = new RegExp(`[ \\t]*<!-- fil-rouge:${id} -->[\\s\\S]*?<!-- /fil-rouge:${id} -->`);
  if (marked.test(html)) return html.replace(marked, () => block);
  const at = html.indexOf(anchor);
  if (at < 0) throw new Error(`${label} : emplacement introuvable (« ${anchor.trim()} »).`);
  return `${html.slice(0, at)}${block}${sep}${html.slice(at)}`;
}

/** Dictionnaire i18n/en/ d'une page : paires « segment français → anglais ». */
async function translate(file, pairs) {
  const entry = await open(file, "{}\n");
  const dict = JSON.parse(entry.after);
  for (const [fr, en] of pairs) dict[fr] = en;
  entry.after = `${JSON.stringify(dict, null, 2)}\n`;
}
/** Paire pour un texte simple (échappé comme il l'est dans la page). */
const textPair = (o) => [normalize(esc(o.fr)), esc(o.en)];
/** Paire pour un attribut (aria-label, meta) : le segment est la valeur décodée. */
const attrPair = (o) => [normalize(o.fr), o.en];

const data = JSON.parse(await readFile(DATA, "utf8"));
const byId = new Map(data.projets.map((p) => [p.id, p]));
const P = data.page;

/* ---------- Accueil ---------------------------------------------------- */

function questionBlock(project) {
  return indent(
    [
      `<!-- fil-rouge:${project.id} -->`,
      `<div class="panel__question">`,
      `  <p class="panel__question-label">${esc(data.questions.label.fr)}</p>`,
      `  <p class="panel__question-text">${esc(project.question.fr)}</p>`,
      `</div>`,
      `<!-- /fil-rouge:${project.id} -->`,
    ],
    12,
  );
}

{
  const home = await open(path.join(ROOT, "public", "index.html"));
  const link = indent(
    [`<!-- fil-rouge:lien -->`, `<a class="topbar__why" href="fil-rouge">${esc(data.lien_page.fr)}</a>`, `<!-- /fil-rouge:lien -->`],
    6,
  );
  home.after = putBlock(home.after, "lien", link, `      <a class="intro-open"`, "\n", "index.html");

  for (const project of data.projets) {
    const marked = new RegExp(`[ \\t]*<!-- fil-rouge:${project.id} -->[\\s\\S]*?<!-- /fil-rouge:${project.id} -->`);
    const block = questionBlock(project);
    if (marked.test(home.after)) {
      home.after = home.after.replace(marked, () => block);
      continue;
    }
    const panel = home.after.indexOf(`data-project="${project.id}"`);
    if (panel < 0) throw new Error(`Panneau « ${project.id} » introuvable dans public/index.html.`);
    const axesEnd = home.after.indexOf("</ul>", panel);
    if (axesEnd < 0) throw new Error(`Liste des axes introuvable pour « ${project.id} ».`);
    const at = axesEnd + "</ul>".length;
    home.after = `${home.after.slice(0, at)}\n${block}${home.after.slice(at)}`;
  }

  await translate(path.join(ROOT, "i18n", "en", "index.json"), [
    textPair(data.lien_page),
    textPair(data.questions.label),
    ...data.projets.map((p) => textPair(p.question)),
  ]);
}

/* ---------- Pages projet ----------------------------------------------- */

function whyBlock(project) {
  const page = data.projet_page;
  const famille = data.familles[project.famille].label;
  return indent(
    [
      `<!-- fil-rouge:why -->`,
      `<section class="pj-why" aria-labelledby="pj-why-title">`,
      `  <div class="pj-why__head">`,
      `    <h2 id="pj-why-title" class="pj-why__title">${esc(page.titre.fr)}</h2>`,
      `    <p class="pj-why__tag">${esc(famille.fr)}</p>`,
      `  </div>`,
      `  <div class="pj-why__grid">`,
      `    <div class="pj-why__item pj-why__item--lead">`,
      `      <p class="pj-why__label">${esc(data.questions.label.fr)}</p>`,
      `      <p class="pj-why__question">${esc(project.question.fr)}</p>`,
      `    </div>`,
      `    <div class="pj-why__item">`,
      `      <p class="pj-why__label">${esc(page.label_lien.fr)}</p>`,
      `      <p class="pj-why__text">${esc(project.lien_master.fr)}</p>`,
      `    </div>`,
      `    <div class="pj-why__item">`,
      `      <p class="pj-why__label">${esc(page.label_montre.fr)}</p>`,
      `      <p class="pj-why__text">${esc(project.montre.fr)}</p>`,
      `    </div>`,
      `  </div>`,
      `  <a class="pj-why__more" href="/fil-rouge">${esc(page.lien_fil.fr)}</a>`,
      `</section>`,
      `<!-- /fil-rouge:why -->`,
    ],
    4,
  );
}

for (const project of data.projets) {
  const file = path.join(ROOT, "public", "projets", `${project.id}.html`);
  if (!existsSync(file)) throw new Error(`Page projet introuvable : public/projets/${project.id}.html`);
  const entry = await open(file);
  entry.after = putBlock(entry.after, "why", whyBlock(project), `    <section class="pj-cta-row">`, "\n\n", `projets/${project.id}.html`);
  const p = data.projet_page;
  await translate(path.join(ROOT, "i18n", "en", "projets", `${project.id}.json`), [
    textPair(p.titre),
    textPair(data.familles[project.famille].label),
    textPair(data.questions.label),
    textPair(project.question),
    textPair(p.label_lien),
    textPair(project.lien_master),
    textPair(p.label_montre),
    textPair(project.montre),
    textPair(p.lien_fil),
  ]);
}

/* ---------- Page « Le fil rouge » -------------------------------------- */
// Cahier éditorial clair, sans animation ni JavaScript (étape 1 de la refonte).
// Polices de la page seulement : Newsreader (titres) et Source Sans 3 (texte, interface, chiffres).
// Newsreader en taille optique fixe (36) : 46 Ko pour le romain et l'italique, contre 117 Ko pour l'axe complet.

const FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,36,400;1,36,400&family=Source+Sans+3:wght@400;600&display=swap";

/** Titre : texte échappé, *mot* → <em>mot</em> ; un seul mot en italique par titre. */
function title(text) {
  const marks = text.match(/\*[^*]+\*/g) ?? [];
  if (marks.length > 1) throw new Error(`Un seul mot en italique par titre : « ${text} »`);
  return esc(text).replace(/\*([^*]+)\*/, "<em>$1</em>");
}
const titlePair = (o) => [normalize(title(o.fr)), title(o.en)];
const pad2 = (n) => String(n).padStart(2, "0");

/** « Voir le projet » suivi du nom du projet pour les lecteurs d'écran. */
function voirProjet(project) {
  const html = (lang) => `${esc(P.voir_projet[lang])} <span class="visually-hidden">${esc(project.nom)}</span>`;
  return { fr: html("fr"), en: html("en") };
}

function familyCount(key) {
  const n = data.projets.filter((p) => p.famille === key).length;
  const label = data.familles[key].label;
  return { fr: `${label.fr} · ${n} ${P.projets_mot.fr}`, en: `${label.en} · ${n} ${P.projets_mot.en}` };
}

function ueLabel(n) {
  const ue = data.ue[String(n)];
  if (!ue) throw new Error(`UE ${n} inconnue (attendu : 1 à 7).`);
  return ue;
}

function fiche(project, i) {
  const famille = data.familles[project.famille].label;
  const o = project.outil;
  return [
    `<li class="fr-fiche fr-fiche--${project.famille}" id="fiche-${project.id}">`,
    `  <div class="fr-fiche__head">`,
    `    <p class="fr-fiche__meta"><span class="fr-num">${pad2(i + 1)}</span><span class="fr-fiche__name" translate="no">${esc(project.nom)}</span><span class="fr-fiche__family">${esc(famille.fr)}</span></p>`,
    `    <h3 class="fr-fiche__question">${esc(project.question.fr)}</h3>`,
    `    <a class="fr-fiche__link" href="/projets/${project.id}">${voirProjet(project).fr}</a>`,
    `  </div>`,
    `  <dl class="fr-fiche__fields">`,
    `    <div class="fr-field">`,
    `      <dt>${esc(P.label_outil.fr)}</dt>`,
    `      <dd>`,
    `        <dl class="fr-io">`,
    `          <div><dt>${esc(P.label_entrees.fr)}</dt><dd>${esc(o.entrees.fr)}</dd></div>`,
    `          <div><dt>${esc(P.label_controles.fr)}</dt><dd>${esc(o.controles.fr)}</dd></div>`,
    `          <div><dt>${esc(P.label_sorties.fr)}</dt><dd>${esc(o.sorties.fr)}</dd></div>`,
    `        </dl>`,
    `      </dd>`,
    `    </div>`,
    `    <div class="fr-field">`,
    `      <dt>${esc(P.label_exigence.fr)}</dt>`,
    `      <dd>${esc(project.exigence.fr)}</dd>`,
    `    </div>`,
    `    <div class="fr-field">`,
    `      <dt>${esc(P.label_ue.fr)}</dt>`,
    `      <dd>`,
    `        <ul class="fr-ue">`,
    ...project.ue.map((n) => `          <li><span class="fr-ue__code fr-num" translate="no">UE${n}</span><span>${esc(ueLabel(n).fr)}</span></li>`),
    `        </ul>`,
    `      </dd>`,
    `    </div>`,
    `  </dl>`,
    `</li>`,
  ];
}

function familyBlock(key) {
  const f = data.familles[key];
  const projects = data.questions.ordre.map((id) => byId.get(id)).filter((p) => p.famille === key);
  return [
    `<article class="fr-family fr-family--${key}">`,
    `  <p class="fr-family__label">${esc(familyCount(key).fr)}</p>`,
    `  <h3 class="fr-family__title">${esc(f.titre.fr)}</h3>`,
    `  <p class="fr-family__text">${esc(f.texte.fr)}</p>`,
    `  <ul class="fr-family__projects">`,
    ...projects.map((p) => `    <li><a href="#fiche-${p.id}" translate="no">${esc(p.nom)}</a></li>`),
    `  </ul>`,
    `</article>`,
  ];
}

function refLine(line) {
  const names = line.projets.map((id) => {
    if (!byId.has(id)) throw new Error(`colophon : projet « ${id} » inconnu.`);
    return esc(byId.get(id).nom);
  });
  return [
    `<div class="fr-ref">`,
    `  <dt class="fr-ref__name">${esc(line.nom.fr)}</dt>`,
    `  <dd class="fr-ref__ref">${esc(line.ref.fr)}</dd>`,
    `  <dd class="fr-ref__projects" translate="no">${names.join(" · ")}</dd>`,
    `</div>`,
  ];
}

function filRougePage() {
  const ordered = data.questions.ordre.map((id) => {
    if (!byId.has(id)) throw new Error(`questions.ordre : projet « ${id} » inconnu.`);
    return byId.get(id);
  });
  if (ordered.length !== data.projets.length) throw new Error("questions.ordre doit citer chaque projet une fois.");
  const C = data.colophon;

  const body = [
    `<header class="pj-top">`,
    `  <a class="pj-back" href="/">← Projets</a>`,
    `  <div class="pj-top__right">`,
    `    <nav class="lang-switch" aria-label="Langue">`,
    `      <a href="/fil-rouge" hreflang="fr" lang="fr" translate="no" aria-label="Français" aria-current="page">FR</a>`,
    `      <span class="lang-switch__sep" aria-hidden="true">/</span>`,
    `      <a href="/en/fil-rouge" hreflang="en" lang="en" translate="no" aria-label="English">EN</a>`,
    `    </nav>`,
    `    <span class="pj-brand">Ludovic Labeaut</span>`,
    `  </div>`,
    `</header>`,
    ``,
    `<main class="fr-main">`,
    `  <section class="fr-hero fr-wrap" aria-labelledby="fr-title">`,
    `    <p class="fr-kicker">${esc(P.kicker.fr)}</p>`,
    `    <h1 id="fr-title" class="fr-hero__title">${title(data.accroche.fr)}</h1>`,
    `    <p class="fr-hero__intro">${esc(data.intro.fr)}</p>`,
    `  </section>`,
    ``,
    `  <section class="fr-chain fr-wrap" aria-labelledby="fr-chain-title">`,
    `    <h2 id="fr-chain-title" class="fr-kicker">${esc(P.chaine_label.fr)}</h2>`,
    `    <ol class="fr-chain__steps">`,
    ...data.chaine.flatMap((step, i) => [
      `      <li class="fr-chain__step">`,
      `        <span class="fr-num">${pad2(i + 1)}</span>`,
      `        <p class="fr-chain__label">${esc(step.label.fr)}</p>`,
      `        <p class="fr-chain__text">${esc(step.texte.fr)}</p>`,
      `      </li>`,
    ]),
    `    </ol>`,
    `  </section>`,
    ``,
    `  <section class="fr-section fr-fiches fr-wrap" aria-labelledby="fr-fiches-title">`,
    `    <div class="fr-section__head">`,
    `      <p class="fr-kicker">${esc(P.questions_kicker.fr)}</p>`,
    `      <h2 id="fr-fiches-title" class="fr-h2">${title(data.questions.titre.fr)}</h2>`,
    `      <p class="fr-section__sub">${esc(data.questions.sous_titre.fr)}</p>`,
    `    </div>`,
    `    <ol class="fr-fiches__list">`,
    ...ordered.flatMap((p, i) => fiche(p, i).map((l) => `      ${l}`)),
    `    </ol>`,
    `  </section>`,
    ``,
    `  <section class="fr-section fr-families fr-wrap" aria-labelledby="fr-families-title">`,
    `    <p class="fr-kicker">${esc(P.familles_kicker.fr)}</p>`,
    `    <h2 id="fr-families-title" class="fr-h2">${title(data.familles.titre.fr)}</h2>`,
    `    <div class="fr-families__grid">`,
    ...["coeur", "actualite"].flatMap((key) => familyBlock(key).map((l) => `      ${l}`)),
    `    </div>`,
    `  </section>`,
    ``,
    `  <section class="fr-section fr-colophon fr-wrap" aria-labelledby="fr-colophon-title">`,
    `    <p class="fr-kicker">${esc(C.kicker.fr)}</p>`,
    `    <h2 id="fr-colophon-title" class="fr-h2">${title(C.titre.fr)}</h2>`,
    `    <p class="fr-section__sub">${esc(C.note.fr)}</p>`,
    `    <dl class="fr-refs">`,
    ...C.lignes.flatMap((line) => refLine(line).map((l) => `      ${l}`)),
    `    </dl>`,
    `  </section>`,
    ``,
    `  <section class="fr-outro fr-wrap">`,
    `    <p class="fr-outro__mention">${esc(P.mention.fr)}</p>`,
    `    <a class="pj-cta" href="/">${esc(P.cta.fr)} ${ARROW}</a>`,
    `  </section>`,
    `</main>`,
  ];

  return [
    `<!doctype html>`,
    `<html lang="fr" class="fr-page">`,
    `<head>`,
    `  <meta charset="utf-8">`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`,
    `  <title>${esc(P.titre.fr)}</title>`,
    `  <meta name="description" content="${escAttr(P.description.fr)}">`,
    `  <meta name="theme-color" content="#F6F7F9">`,
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:locale" content="fr_FR">`,
    `  <meta property="og:title" content="${escAttr(P.titre.fr)}">`,
    `  <meta property="og:description" content="${escAttr(P.og_description.fr)}">`,
    `  <link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `  <link rel="alternate" hreflang="fr" href="${SITE_URL}/fil-rouge">`,
    `  <link rel="alternate" hreflang="en" href="${SITE_URL}/en/fil-rouge">`,
    `  <link rel="alternate" hreflang="x-default" href="${SITE_URL}/fil-rouge">`,
    `  <script src="/assets/js/lang.js"></script>`,
    `  <link rel="preconnect" href="https://fonts.googleapis.com">`,
    `  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `  <link rel="stylesheet" href="${FONTS}">`,
    `  <link rel="stylesheet" href="/assets/css/project.css">`,
    `  <link rel="stylesheet" href="/assets/css/fil-rouge.css">`,
    `</head>`,
    `<body class="fil-rouge">`,
    `  <!-- Page générée par scripts/build-fil-rouge.mjs à partir de public/data/fil-rouge.json : ne pas la modifier à la main. -->`,
    indent(body, 2),
    `</body>`,
    `</html>`,
    ``,
  ]
    .join("\n")
    // Typographie française : espace insécable avant : ; ? ! (jamais de ponctuation seule en début de ligne).
    .replace(/ ([:;?!])(?=[\s<"])/g, " $1");
}

{
  const page = await open(path.join(ROOT, "public", "fil-rouge.html"));
  page.after = filRougePage();
  const ordered = data.questions.ordre.map((id) => byId.get(id));
  const C = data.colophon;
  await translate(path.join(ROOT, "i18n", "en", "fil-rouge.json"), [
    textPair(P.titre),
    attrPair(P.description),
    attrPair(P.titre),
    attrPair(P.og_description),
    textPair(P.kicker),
    titlePair(data.accroche),
    textPair(data.intro),
    textPair(P.chaine_label),
    ...data.chaine.flatMap((s) => [textPair(s.label), textPair(s.texte)]),
    textPair(P.questions_kicker),
    titlePair(data.questions.titre),
    textPair(data.questions.sous_titre),
    textPair(P.label_outil),
    textPair(P.label_entrees),
    textPair(P.label_controles),
    textPair(P.label_sorties),
    textPair(P.label_exigence),
    textPair(P.label_ue),
    ...ordered.flatMap((p) => [
      textPair(data.familles[p.famille].label),
      textPair(p.question),
      [normalize(voirProjet(p).fr), voirProjet(p).en],
      textPair(p.outil.entrees),
      textPair(p.outil.controles),
      textPair(p.outil.sorties),
      textPair(p.exigence),
      ...p.ue.map((n) => textPair(ueLabel(n))),
    ]),
    textPair(P.familles_kicker),
    titlePair(data.familles.titre),
    ...["coeur", "actualite"].flatMap((key) => [
      textPair(familyCount(key)),
      textPair(data.familles[key].titre),
      textPair(data.familles[key].texte),
    ]),
    textPair(C.kicker),
    titlePair(C.titre),
    textPair(C.note),
    ...C.lignes.flatMap((l) => [textPair(l.nom), textPair(l.ref)]),
    textPair(P.mention),
    [normalize(`${esc(P.cta.fr)} ${ARROW}`), `${esc(P.cta.en)} ${ARROW}`],
  ]);
}

/* ---------- Écriture ou vérification ----------------------------------- */

const stale = [...files].filter(([, f]) => f.before !== f.after).map(([file]) => path.relative(ROOT, file));
if (CHECK) {
  if (stale.length) {
    console.error(`Fil rouge : ${stale.length} fichier(s) ne correspondent plus à public/data/fil-rouge.json :\n  ${stale.join("\n  ")}\nLancez « npm run fil-rouge ».`);
    process.exit(1);
  }
  console.log("Fil rouge : les pages sont à jour.");
} else {
  for (const [file, f] of files) if (f.before !== f.after) await writeFile(file, f.after, "utf8");
  console.log(stale.length ? `Fil rouge : ${stale.length} fichier(s) mis à jour.` : "Fil rouge : rien à changer.");
}
