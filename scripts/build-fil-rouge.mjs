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
 *   - public/fil-rouge.html, en entier (page « Le fil rouge », adresse /fil-rouge) ;
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

function questionItem(project, i) {
  const n = String(i + 1).padStart(2, "0");
  const famille = data.familles[project.famille].label;
  return [
    `<li class="fr-q" data-reveal style="--n: ${i}; --q-accent: ${project.accent}">`,
    `  <h3 class="fr-q__heading">`,
    `    <button class="fr-q__toggle" type="button" id="fr-q-${project.id}" aria-expanded="true" aria-controls="fr-q-${project.id}-panel">`,
    `      <span class="fr-q__num">${n}</span>`,
    `      <span class="fr-q__question">${esc(project.question.fr)}</span>`,
    `      <span class="fr-q__meta">`,
    `        <span class="fr-q__dot" aria-hidden="true"></span>`,
    `        <span class="fr-q__name" translate="no">${esc(project.nom)}</span>`,
    `        <span class="fr-q__family">${esc(famille.fr)}</span>`,
    `      </span>`,
    `      <span class="fr-q__sign" aria-hidden="true"></span>`,
    `    </button>`,
    `  </h3>`,
    `  <div class="fr-q__panel" id="fr-q-${project.id}-panel" role="region" aria-labelledby="fr-q-${project.id}">`,
    `    <div class="fr-q__panel-inner">`,
    `      <div class="fr-q__body">`,
    `        <div class="fr-q__answer">`,
    `          <p class="fr-q__label">${esc(P.reponse_label.fr)}</p>`,
    `          <p class="fr-q__text">${esc(project.reponse.fr)}</p>`,
    `          <a class="fr-q__link" href="/projets/${project.id}">${voirProjet(project).fr}</a>`,
    `        </div>`,
    `        <div class="fr-q__master">`,
    `          <p class="fr-q__label">${esc(data.projet_page.label_lien.fr)}</p>`,
    `          <p class="fr-q__lien">${esc(project.lien_master.fr)}</p>`,
    `          <p class="fr-q__label fr-q__label--courses">${esc(P.matieres_label.fr)}</p>`,
    `          <p class="fr-q__courses">${esc(project.matieres.fr.join(" · "))}</p>`,
    `        </div>`,
    `      </div>`,
    `    </div>`,
    `  </div>`,
    `  <span class="fr-q__progress" aria-hidden="true"></span>`,
    `</li>`,
  ];
}

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

function familyBlock(key, i) {
  const f = data.familles[key];
  const projects = data.questions.ordre.map((id) => byId.get(id)).filter((p) => p.famille === key);
  return [
    `<article class="fr-family" data-reveal style="--n: ${i}">`,
    `  <p class="fr-family__label">${esc(familyCount(key).fr)}</p>`,
    `  <h3 class="fr-family__title">${esc(f.titre.fr)}</h3>`,
    `  <p class="fr-family__text">${esc(f.texte.fr)}</p>`,
    `  <ul class="fr-family__projects">`,
    ...projects.map((p) => `    <li><a href="/projets/${p.id}" translate="no" style="--p-accent: ${p.accent}">${esc(p.nom)}</a></li>`),
    `  </ul>`,
    `</article>`,
  ];
}

function filRougePage() {
  const ordered = data.questions.ordre.map((id) => {
    if (!byId.has(id)) throw new Error(`questions.ordre : projet « ${id} » inconnu.`);
    return byId.get(id);
  });
  if (ordered.length !== data.projets.length) throw new Error("questions.ordre doit citer chaque projet une fois.");

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
    `    <p class="fr-kicker" data-reveal>${esc(P.kicker.fr)}</p>`,
    `    <h1 id="fr-title" class="fr-hero__title" data-split>${esc(data.accroche.fr)}</h1>`,
    `    <p class="fr-hero__intro" data-reveal style="--n: 4">${esc(data.intro.fr)}</p>`,
    `    <div class="fr-hero__rule" data-reveal style="--n: 6" aria-hidden="true"></div>`,
    `    <ol class="fr-cs">`,
    ...data.trois_c.flatMap((c, i) => [
      `      <li class="fr-c" data-reveal style="--n: ${7 + i}">`,
      `        <p class="fr-c__label"><span class="fr-c__letter" translate="no" aria-hidden="true">${esc(c.lettre)}</span><span>${esc(c.label.fr)}</span></p>`,
      `        <p class="fr-c__verb">${esc(c.verbe.fr)}</p>`,
      `        <p class="fr-c__phrase">${esc(c.phrase.fr)}</p>`,
      `      </li>`,
    ]),
    `    </ol>`,
    `  </section>`,
    ``,
    `  <section class="fr-section fr-questions fr-wrap" aria-labelledby="fr-questions-title">`,
    `    <div class="fr-section__head">`,
    `      <div>`,
    `        <p class="fr-kicker" data-reveal>${esc(P.questions_kicker.fr)}</p>`,
    `        <h2 id="fr-questions-title" class="fr-h2" data-reveal style="--n: 1">${esc(data.questions.titre.fr)}</h2>`,
    `      </div>`,
    `      <div class="fr-section__aside" data-reveal style="--n: 2">`,
    `        <p class="fr-section__sub">${esc(data.questions.sous_titre.fr)}</p>`,
    `        <button class="fr-autoplay" type="button" hidden>`,
    `          <span class="fr-autoplay__icon" aria-hidden="true"></span>`,
    `          <span class="fr-autoplay__pause">${esc(P.pause.fr)}</span>`,
    `          <span class="fr-autoplay__play">${esc(P.reprendre.fr)}</span>`,
    `        </button>`,
    `      </div>`,
    `    </div>`,
    `    <ol class="fr-list">`,
    ...ordered.flatMap((p, i) => questionItem(p, i).map((l) => `      ${l}`)),
    `    </ol>`,
    `  </section>`,
    ``,
    `  <section class="fr-section fr-families fr-wrap" aria-labelledby="fr-families-title">`,
    `    <p class="fr-kicker" data-reveal>${esc(P.familles_kicker.fr)}</p>`,
    `    <h2 id="fr-families-title" class="fr-h2" data-reveal style="--n: 1">${esc(data.familles.titre.fr)}</h2>`,
    `    <div class="fr-families__grid" data-reveal style="--n: 2">`,
    ...["coeur", "actualite"].flatMap((key, i) => familyBlock(key, i).map((l) => `      ${l}`)),
    `    </div>`,
    `  </section>`,
    ``,
    `  <section class="fr-section fr-method fr-wrap" aria-labelledby="fr-method-title">`,
    `    <p class="fr-kicker" data-reveal>${esc(P.methode_kicker.fr)}</p>`,
    `    <h2 id="fr-method-title" class="fr-h2" data-reveal style="--n: 1">${esc(data.methode.titre.fr)}</h2>`,
    `    <ol class="fr-rules">`,
    ...data.methode.regles.flatMap((r, i) => [
      `      <li class="fr-rule" data-reveal style="--n: ${i + 2}">`,
      `        <span class="fr-rule__num">${String(i + 1).padStart(2, "0")}</span>`,
      `        <h3 class="fr-rule__title">${esc(r.titre.fr)}</h3>`,
      `        <p class="fr-rule__text">${esc(r.texte.fr)}</p>`,
      `      </li>`,
    ]),
    `    </ol>`,
    `  </section>`,
    ``,
    `  <section class="fr-outro fr-wrap" data-reveal>`,
    `    <p class="fr-outro__mention">${esc(P.mention.fr)}</p>`,
    `    <a class="pj-cta" href="/">${esc(P.cta.fr)} ${ARROW}</a>`,
    `  </section>`,
    `</main>`,
    ``,
    `<script src="/assets/js/fil-rouge.js" defer></script>`,
  ];

  return [
    `<!doctype html>`,
    `<html lang="fr">`,
    `<head>`,
    `  <meta charset="utf-8">`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`,
    `  <title>${esc(P.titre.fr)}</title>`,
    `  <meta name="description" content="${escAttr(P.description.fr)}">`,
    `  <meta name="theme-color" content="#0b0c0e">`,
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
    `  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap">`,
    `  <link rel="stylesheet" href="/assets/css/project.css">`,
    `  <link rel="stylesheet" href="/assets/css/fil-rouge.css">`,
    `  <!-- Animations d'entrée : actives seulement si fil-rouge.js démarre (sinon tout reste visible). -->`,
    `  <script>document.documentElement.classList.add("js");setTimeout(function(){if(!window.filRougeReady)document.documentElement.classList.remove("js")},2500);</script>`,
    `</head>`,
    `<body class="fil-rouge">`,
    `  <!-- Page générée par scripts/build-fil-rouge.mjs à partir de public/data/fil-rouge.json : ne pas la modifier à la main. -->`,
    indent(body, 2),
    `</body>`,
    `</html>`,
    ``,
  ].join("\n");
}

{
  const page = await open(path.join(ROOT, "public", "fil-rouge.html"));
  page.after = filRougePage();
  const ordered = data.questions.ordre.map((id) => byId.get(id));
  await translate(path.join(ROOT, "i18n", "en", "fil-rouge.json"), [
    textPair(P.titre),
    attrPair(P.description),
    attrPair(P.titre),
    attrPair(P.og_description),
    textPair(P.kicker),
    textPair(data.accroche),
    textPair(data.intro),
    ...data.trois_c.flatMap((c) => [textPair(c.label), textPair(c.verbe), textPair(c.phrase)]),
    textPair(P.questions_kicker),
    textPair(data.questions.titre),
    textPair(data.questions.sous_titre),
    textPair(P.pause),
    textPair(P.reprendre),
    textPair(P.reponse_label),
    textPair(data.projet_page.label_lien),
    textPair(P.matieres_label),
    ...ordered.flatMap((p) => [
      textPair(p.question),
      textPair(data.familles[p.famille].label),
      textPair(p.reponse),
      [normalize(voirProjet(p).fr), voirProjet(p).en],
      textPair(p.lien_master),
      textPair({ fr: p.matieres.fr.join(" · "), en: p.matieres.en.join(" · ") }),
    ]),
    textPair(P.familles_kicker),
    textPair(data.familles.titre),
    ...["coeur", "actualite"].flatMap((key) => [
      textPair(familyCount(key)),
      textPair(data.familles[key].titre),
      textPair(data.familles[key].texte),
    ]),
    textPair(P.methode_kicker),
    textPair(data.methode.titre),
    ...data.methode.regles.flatMap((r) => [textPair(r.titre), textPair(r.texte)]),
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
