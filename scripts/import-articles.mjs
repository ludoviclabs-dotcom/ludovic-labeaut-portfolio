#!/usr/bin/env node
/**
 * Publie les notes « Lignes de force » du dossier Dropbox « Articles rédigés ».
 *
 *   npm run articles
 *   npm run articles -- "D:\autre\dossier"
 *
 * - Les notes HTML (« 01_Titre.html ») sont publiées telles quelles, avec une barre de navigation
 *   (retour aux publications, enregistrement en PDF) visible à l'écran seulement.
 * - Les notes Markdown (« Bloc_2_Article_04_Titre.md ») sont converties avec la même mise en page
 *   que les notes HTML (feuille de style reprise d'une note HTML du dossier).
 * - Les séries (SERIES) viennent d'un autre dossier Dropbox : « Article 1 — Titre.md », etc.
 *   Chaque article devient une note numérotée à la suite (firstNum), avec la même mise en page
 *   et une navigation entre les articles de la série.
 * - Les dossiers interactifs (DOSSIERS) sont des pages autonomes de public/dossiers/ :
 *   la page /publications les présente en carte vedette dans leur bloc.
 * - La page /publications (public/publications/index.html) est régénérée à partir des notes.
 *
 * Les fichiers sont d'abord générés dans .cache/publications-en-cours, puis remplacent
 * public/publications/ seulement si tout a réussi.
 */
import { readdir, readFile, mkdir, writeFile, rm, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "publications");
const STAGING = path.join(ROOT, ".cache", "publications-en-cours");
const DEFAULT_SOURCE = path.join(os.homedir(), "Dropbox", "Articles rédigés");
const SOURCE = path.resolve(process.argv[2] ?? process.env.ARTICLES_DIR ?? DEFAULT_SOURCE);

const AUTHOR = "Ludovic Labeaut";
const DISCLAIMER =
  "Analyse personnelle fondée sur des sources publiques. Elle n'engage que son auteur et ne constitue ni un conseil en investissement ni une recommandation.";
// Ordre et intitulé des blocs sur la page /publications.
const BLOCKS = [
  { id: "Géopolitique", intro: "Détroits, conflits, alliances : ce qui se joue sur la carte." },
  { id: "Géoéconomie", intro: "Sanctions, capital public, dépendances : la puissance par l'économie." },
  { id: "Banques centrales & taux", intro: "Fed, BCE, Banque du Japon : décisions, inflation, anticipations et courbe des taux, lues avec leurs sources." },
  { id: "Defense-Tech", intro: "Munitions, achats d'armement, drones : l'industrie de défense en mutation." },
  { id: "IA & science", intro: "Modèles, laboratoires autonomes, souveraineté : comment l'IA transforme la production du savoir." },
  { id: "Robotique & marchés", intro: "Chaîne de valeur, volumes, valorisations : les données d'un marché en formation." },
];

// Séries d'articles : un dossier Dropbox par série, fichiers « Article N — Titre.md ».
// firstNum fixe le numéro de note du premier article, pour que les adresses ne changent pas.
const SERIES = [
  {
    name: "L'IA à la conquête du savoir",
    block: "IA & science",
    dir: path.resolve(process.env.SERIE_IA_DIR ?? path.join(os.homedir(), "Dropbox", "Articles IA")),
    firstNum: 10,
  },
  {
    name: "Banques centrales : le retour du resserrement",
    block: "Banques centrales & taux",
    dir: path.resolve(process.env.SERIE_BC_DIR ?? path.join(os.homedir(), "Dropbox", "Articles banques centrales")),
    firstNum: 18,
  },
];

// Dossiers interactifs : pages autonomes de public/dossiers/, présentées en carte vedette.
const DOSSIERS = [
  {
    block: "Robotique & marchés",
    href: "/dossiers/robotique-humanoide",
    title: "Robotique humanoïde : où se capte la valeur, de 2026 à 2050",
    standfirst:
      "Marché, volumes réels, anatomie du coût, chaîne de valeur en douze couches, rivalités géopolitiques et valorisations boursières : un dossier interactif où chaque chiffre renvoie à sa source.",
    meta: "Données au 14 octobre 2026 · 8 chapitres · conçu avec Claude",
    kpis: [
      { value: "5 000 Md$", label: "de marché potentiel en 2050 selon Morgan Stanley" },
      { value: "~90 %", label: "des humanoïdes produits en Chine en 2025-2026" },
      { value: "~60 %", label: "du coût matériel logé dans les articulations et les mains" },
    ],
    chapters: ["Marché", "Réalité 2026", "Anatomie du coût", "Chaîne de valeur", "Géopolitique", "Acteurs & thèses", "Valorisations", "Risques & opportunités"],
    // Couverture dessinée en code : fourchette du marché mondial (Md$), reprise du dossier.
    cover: {
      caption: "Marché mondial des humanoïdes, en Md$ · échelle logarithmique",
      label: "Fourchette du marché mondial des robots humanoïdes : 0,5 à 1 Md$ en 2024, 4 700 à 5 000 Md$ en 2050",
      highlight: "5 000 Md$",
      points: [
        { year: 2024, min: 0.5, max: 1 },
        { year: 2026, min: 2.5, max: 4.2 },
        { year: 2030, min: 15, max: 30 },
        { year: 2035, min: 38, max: 150 },
        { year: 2050, min: 4700, max: 5000 },
      ],
    },
  },
];

const WORDS_PER_MINUTE = 230;

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\(\d+\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const textOf = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// Barre affichée en haut de chaque note, à l'écran seulement.
const BAR_STYLE = `<style id="lf-bar">
@media screen {
  body { padding-top: calc(14mm + 48px) !important; }
  .lf-bar { position: fixed; inset: 0 0 auto; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    height: 48px; padding: 0 clamp(12px, 3vw, 28px); background: #0b0c0e; color: #f4f1ea; font: 500 12px/1 Inter, system-ui, sans-serif; letter-spacing: .08em; }
  .lf-bar a, .lf-bar button { color: inherit; text-decoration: none; font: inherit; letter-spacing: inherit; background: none; border: 0; cursor: pointer; padding: 8px 0; }
  .lf-bar a:hover, .lf-bar button:hover { color: #e2c27d; }
  .lf-bar a:focus-visible, .lf-bar button:focus-visible { outline: 2px solid #e2c27d; outline-offset: 2px; }
  .lf-bar .lf-name { color: rgba(244, 241, 234, .55); text-transform: uppercase; font-size: 11px; letter-spacing: .2em; }
  .lf-bar .lf-tools { display: flex; align-items: center; gap: clamp(14px, 2.5vw, 24px); }
  .lf-bar .lang-switch { display: flex; align-items: center; gap: 6px; color: rgba(244, 241, 234, .55); font-size: 11px; letter-spacing: .2em; }
  .lf-bar .lang-switch a { color: rgba(244, 241, 234, .55); }
  .lf-bar .lang-switch a[aria-current], .lf-bar .lang-switch a:hover { color: #f4f1ea; }
  .sources a { text-decoration: underline; text-decoration-color: rgba(22, 32, 44, .35); text-underline-offset: 2px; }
  @media (max-width: 700px) { body { padding-top: 64px !important; } .lf-bar .lf-name { display: none; } }
}
@media print { .lf-bar { display: none !important; } }
</style>`;
// Versions française et anglaise d'une page (l'anglaise est générée par npm run en).
const alternates = (fr) =>
  `<link rel="alternate" hreflang="fr" href="${fr}">
<link rel="alternate" hreflang="en" href="/en${fr}">
<link rel="alternate" hreflang="x-default" href="${fr}">
<script src="/assets/js/lang.js"></script>`;

const langSwitch = (fr, indent = "") =>
  [
    `<nav class="lang-switch" aria-label="Langue">`,
    `  <a href="${fr}" hreflang="fr" lang="fr" translate="no" aria-label="Français" aria-current="page">FR</a>`,
    `  <span class="lang-switch__sep" aria-hidden="true">/</span>`,
    `  <a href="/en${fr}" hreflang="en" lang="en" translate="no" aria-label="English">EN</a>`,
    `</nav>`,
  ].join(`\n${indent}`);

const barHtml = (fr) => `<nav class="lf-bar" aria-label="Navigation">
<a href="/publications">← Publications</a>
<span class="lf-name">${AUTHOR} · Lignes de force</span>
<span class="lf-tools">
${langSwitch(fr)}
<button type="button" onclick="window.print()">Enregistrer en PDF</button>
</span>
</nav>`;

// Édition écran (en-tête sombre, sommaire, progression…) : /assets/css/note.css et /assets/js/note.js.
// L'en-tête de la note (du bandeau .mast à la ligne .byline) est regroupé pour pouvoir le styler.
const SCREEN_EDITION = `<link rel="stylesheet" href="/assets/css/note.css">
<script src="/assets/js/note.js" defer></script>`;

function withBar(html, slug) {
  const fr = `/publications/${slug}`;
  return html
    .replace(/<\/head>/i, `${alternates(fr)}\n${BAR_STYLE}\n${SCREEN_EDITION}</head>`)
    .replace(/<body([^>]*)>/i, `<body$1>${barHtml(fr)}\n<div class="lf-page"><main class="lf-note">`)
    .replace(/<\/body>/i, `</main></div>\n</body>`)
    .replace(/(<div class="mast">[\s\S]*?<div class="byline">[\s\S]*?<\/div>)/, `<header class="lf-hero">$1</header>`);
}

function readHtmlNote(file, html) {
  const num = file.match(/^(\d{2})_/)[1];
  const pick = (re) => (html.match(re)?.[1] ?? "").trim();
  const issue = textOf(pick(/<div class="issue">([\s\S]*?)<\/div>/));
  const issueTitle = textOf(pick(/<div class="issue"><b>([\s\S]*?)<\/b>/));
  const slug = slugify(path.parse(file).name);
  return {
    num,
    slug,
    title: textOf(pick(/<title>([\s\S]*?)<\/title>/)),
    block: issueTitle.split("·")[0].trim(),
    kicker: textOf(pick(/<div class="kicker">([\s\S]*?)<\/div>/)),
    standfirst: textOf(pick(/<p class="standfirst">([\s\S]*?)<\/p>/)),
    date: issue.replace(issueTitle, "").trim(),
    reading: (textOf(pick(/<div class="byline">([\s\S]*?)<\/div>/)).match(/Lecture\s*:\s*([^A-ZÀ-Ý]+min)/) ?? [])[1]?.trim() ?? "",
    page: withBar(html, slug),
  };
}

function readMarkdownNote(file, md, css) {
  const num = file.match(/Article_(\d{2})/i)[1];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const title = lines.find((l) => l.startsWith("# ")).slice(2).trim();
  const blockLine = lines.find((l) => /^\*\*Bloc/.test(l)) ?? "";
  const block = (blockLine.match(/—\s*([^·*]+)/)?.[1] ?? "").trim();
  const metaLine = lines.find((l) => /^\*Analyse arrêtée/.test(l)) ?? "";
  const date = (metaLine.match(/arrêtée au ([^·*]+)/)?.[1] ?? "").trim();
  const reading = metaLine.match(/(\d+)\s*minutes?/) ? `${metaLine.match(/(\d+)\s*minutes?/)[1]} min` : "";

  // Chapeau : premier paragraphe entièrement en gras après l'en-tête.
  const startIdx = lines.findIndex((l, i) => i > lines.indexOf(metaLine) && /^\*\*[^*].*\*\*$/.test(l.trim()));
  const standfirst = lines[startIdx].trim().replace(/^\*\*|\*\*$/g, "");
  const rest = lines.slice(startIdx + 1).join("\n");
  const [bodyMd, sourcesMd = ""] = rest.split(/\n-{3,}\n+## Sources[^\n]*\n/);

  let h2 = 0;
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const inner = this.parser.parseInline(tokens);
    if (depth === 2) {
      h2 += 1;
      return `<h2><span class="n">${String(h2).padStart(2, "0")}</span>${inner}</h2>`;
    }
    return `<h${depth}>${inner}</h${depth}>`;
  };
  renderer.table = function (token) {
    return marked.Renderer.prototype.table.call(this, token).replace("<table>", '<table class="data nobreak">');
  };
  const body = marked.parse(bodyMd, { renderer });

  const srcTokens = marked.lexer(sourcesMd);
  const list = srcTokens.filter((t) => t.type === "list").map((t) => marked.parser([t])).join("");
  const notes = srcTokens.filter((t) => t.type === "paragraph").map((t) => `<p class="method">${marked.parseInline(t.text)}</p>`).join("");

  const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="${AUTHOR}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
<div class="mast"><div class="brand">LIGNES <span>DE</span> FORCE<small>Notes d'analyse géopolitique &amp; géoéconomique</small></div><div class="issue"><b>${escapeHtml(block)} · Note n°${Number(num)}</b><br>${escapeHtml(date)}</div></div>
<div class="kicker">${escapeHtml(block)}</div>
<h1>${escapeHtml(title)}</h1>
<p class="standfirst">${marked.parseInline(standfirst)}</p>
<div class="byline"><span>Par <b>${AUTHOR}</b></span>${reading ? `<span>Lecture : ${reading}</span>` : ""}<span>Données arrêtées au ${escapeHtml(date)}</span></div>
${body}
${list || notes ? `<div class="sources"><h3>Sources et repères</h3>${list}${notes}</div>` : ""}
<div class="disclaimer">${DISCLAIMER}</div>
</body></html>`;

  const slug = `${num}-${slugify(file.replace(/^.*Article_\d{2}_/i, "").replace(/\.md$/i, ""))}`;
  return { num, slug, title, block, kicker: block, standfirst: textOf(marked.parseInline(standfirst)), date, reading, page: withBar(page, slug) };
}

// Mise en page propre aux séries : schémas en texte, encadrés, navigation entre articles (écran seulement).
const SERIES_STYLE = `<style id="lf-serie">
.schema{margin:10pt 0 13pt;break-inside:avoid}
.schema__art{white-space:pre;overflow-x:auto;font-family:var(--mono);font-size:7.3pt;line-height:1.45;color:var(--ink);background:var(--tint-2);border:.6pt solid var(--rule);border-left:2.4pt solid var(--data);padding:9pt 11pt}
.sources table.data{font-size:7pt}
@media screen {
  .serie-nav{margin-top:22pt;border-top:2.2pt solid var(--navy);padding-top:10pt;font-family:var(--sans)}
  .serie-nav__label{font-size:7.6pt;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0 0 8pt;text-align:left}
  .serie-nav__pn{display:grid;grid-template-columns:1fr 1fr;gap:9pt;margin-bottom:10pt}
  .serie-nav__pn a{display:block;border:.6pt solid var(--rule);padding:8pt 10pt;transition:border-color .2s,background-color .2s}
  .serie-nav__pn a:hover{border-color:var(--navy);background:var(--tint-2)}
  .serie-nav__pn a:focus-visible,.serie-nav__list a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .serie-nav__pn span{display:block;font-size:7pt;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .serie-nav__pn b{display:block;font-family:var(--serif);font-size:10.5pt;line-height:1.3;color:var(--navy);margin-top:3pt}
  .serie-nav__next{grid-column:2;text-align:right}
  .serie-nav__list{margin:0;padding-left:16pt;font-size:8pt;line-height:1.55;color:var(--ink-2)}
  .serie-nav__list a:hover{color:var(--accent)}
  .serie-nav__list a[aria-current]{color:var(--navy);font-weight:600}
}
@media screen and (max-width:700px){.serie-nav__pn{grid-template-columns:1fr}.serie-nav__next{grid-column:1;text-align:left}}
@media print{.serie-nav{display:none}}
</style>`;

/** Lit un article de série (« Article 3 — Titre.md ») : en-tête, chapô, sections, bibliographie. */
function readSeriesArticle(serie, file, md) {
  const text = md.replace(/\r\n/g, "\n").trim();
  const title = (text.match(/^# (.+)$/m)?.[1] ?? "").trim();
  const head = text.match(/Article\s+(\d+)\s+sur\s+(\d+)[^\n]*/i);
  const date = (head?.[0].match(/\bau\s+(\d{1,2}(?:er)?\s+[^\s.]+\s+\d{4})/)?.[1] ?? "").trim();
  const sections = text
    .split(/\n(?=## )/)
    .slice(1)
    .map((part) => {
      const [heading, ...body] = part.split("\n");
      return { title: heading.replace(/^##\s+/, "").trim(), md: body.join("\n").trim() };
    });
  const chapo = sections.find((s) => /^chap[ôo]/i.test(s.title));
  const biblio = sections.find((s) => /^bibliographie/i.test(s.title));
  const index = Number(head?.[1]);
  if (!title || !index || !date || !chapo) throw new Error(`Article de série incomplet (titre, numéro, date ou chapô) : ${file}`);

  const num = String(serie.firstNum + index - 1).padStart(2, "0");
  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  const name = file.replace(/^Article\s+\d+\s*[—–-]\s*/i, "").replace(/\.md$/i, "");
  return {
    num,
    slug: `${num}-${slugify(name)}`,
    title,
    block: serie.block,
    kicker: `Article ${index} sur ${head[2]}`,
    serie,
    index,
    total: Number(head[2]),
    date,
    reading: `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min`,
    chapoMd: chapo.md,
    standfirst: textOf(marked.parseInline(chapo.md)),
    sections: sections.filter((s) => s !== chapo && s !== biblio),
    biblioMd: biblio?.md ?? "",
  };
}

/** Page d'un article de série, avec la mise en page des notes et la navigation dans la série. */
function seriesPage(a, siblings, css) {
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const inner = this.parser.parseInline(tokens);
    return depth === 3 ? `<h3 class="sub">${inner}</h3>` : `<h${depth}>${inner}</h${depth}>`;
  };
  renderer.table = function (token) {
    return marked.Renderer.prototype.table.call(this, token).replace("<table>", '<table class="data">');
  };
  // Les schémas en texte restent alignés, mais dans un bloc traduisible (un <pre> ne l'est pas).
  renderer.code = ({ text }) => `<figure class="schema"><div class="schema__art">${escapeHtml(text)}</div></figure>`;

  let h2 = 0;
  const body = a.sections
    .map((s) => {
      const html = marked.parse(s.md, { renderer });
      if (/^encadr[ée]/i.test(s.title)) {
        const t = s.title.replace(/^encadr[ée]\s*(?:[—–:-]\s*)?/i, "");
        return `<div class="encadre"><div class="tag">Encadré</div>${t ? `<h4>${marked.parseInline(t)}</h4>` : ""}${html}</div>`;
      }
      h2 += 1;
      return `<h2><span class="n">${String(h2).padStart(2, "0")}</span>${marked.parseInline(s.title)}</h2>\n${html}`;
    })
    .join("\n");
  const biblio = a.biblioMd ? `<div class="sources"><h3>Bibliographie commentée</h3>${marked.parse(a.biblioMd, { renderer })}</div>` : "";

  const i = siblings.indexOf(a);
  const step = (n, cls, label) => `<a class="${cls}" href="/publications/${n.slug}"><span>${label}</span><b>${escapeHtml(n.title)}</b></a>`;
  const nav = `<nav class="serie-nav" aria-label="Série « ${escapeHtml(a.serie.name)} »">
<p class="serie-nav__label">Série « ${escapeHtml(a.serie.name)} » · Article ${a.index} sur ${a.total}</p>
<div class="serie-nav__pn">${siblings[i - 1] ? step(siblings[i - 1], "serie-nav__prev", "← Article précédent") : ""}${siblings[i + 1] ? step(siblings[i + 1], "serie-nav__next", "Article suivant →") : ""}</div>
<ol class="serie-nav__list">${siblings.map((n) => `<li><a href="/publications/${n.slug}"${n === a ? ' aria-current="page"' : ""}>${escapeHtml(n.title)}</a></li>`).join("")}</ol>
</nav>`;

  const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(a.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="${AUTHOR}">
<meta name="description" content="${escapeHtml(a.standfirst)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
<style>${css}</style>
${SERIES_STYLE}</head><body>
<div class="mast"><div class="brand">LIGNES <span>DE</span> FORCE<small>Série « ${escapeHtml(a.serie.name)} »</small></div><div class="issue"><b>${escapeHtml(a.block)} · Note n°${Number(a.num)}</b><br>${escapeHtml(a.date)}</div></div>
<div class="kicker">${escapeHtml(a.block)} · Article ${a.index} sur ${a.total}</div>
<h1>${escapeHtml(a.title)}</h1>
<p class="standfirst">${marked.parseInline(a.chapoMd)}</p>
<div class="byline"><span>Par <b>${AUTHOR}</b></span><span>Lecture : ${a.reading}</span><span>État des connaissances au ${escapeHtml(a.date)}</span></div>
${body}
${biblio}
${nav}
<div class="disclaimer">${DISCLAIMER}</div>
</body></html>`;
  return withBar(page, a.slug);
}

const ARROW = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

/** En-tête d'une série dans son bloc : nom, parcours de lecture article par article. */
function serieHead(serie, list) {
  if (!list.length) return "";
  return `        <div class="serie">
          <div class="serie__text">
            <p class="serie__label">Série en ${list[0].total} articles · État des connaissances au ${escapeHtml(list[0].date)}</p>
            <p class="serie__name">« ${escapeHtml(serie.name)} »</p>
          </div>
          <ol class="serie__track" aria-label="Articles de la série">${list
            .map((n) => `<li><a href="/publications/${n.slug}" aria-label="Article ${n.index} : ${escapeHtml(n.title)}">${n.index}</a></li>`)
            .join("")}</ol>
          <a class="serie__start" href="/publications/${list[0].slug}">Commencer la série ${ARROW}</a>
        </div>`;
}

/** Couverture d'un dossier : fourchette min–max sur une échelle logarithmique, dessinée en SVG. */
function coverSvg({ caption, label, highlight, points }) {
  const [x0, x1, top, bottom] = [64, 556, 92, 318];
  const values = points.flatMap((p) => [p.min, p.max]);
  const lo = Math.floor(Math.log10(Math.min(...values)));
  const hi = Math.ceil(Math.log10(Math.max(...values)));
  const first = points[0].year;
  const last = points[points.length - 1].year;
  const X = (year) => x0 + ((year - first) / (last - first)) * (x1 - x0);
  const Y = (v) => bottom - ((Math.log10(v) - lo) / (hi - lo)) * (bottom - top);
  const f = (n) => n.toFixed(1);
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (lo + i)).filter((v) => v >= 1);
  const band = [...points.map((p) => `${f(X(p.year))},${f(Y(p.max))}`), ...[...points].reverse().map((p) => `${f(X(p.year))},${f(Y(p.min))}`)].join(" ");
  const line = points.map((p, i) => `${i ? "L" : "M"}${f(X(p.year))} ${f(Y(p.max))}`).join(" ");
  const end = points[points.length - 1];
  return `<svg class="cover" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(label)}">
              <defs><linearGradient id="cover-band" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e2c27d" stop-opacity=".34"/><stop offset="1" stop-color="#e2c27d" stop-opacity=".03"/></linearGradient></defs>
              <text class="cover__cap" x="${x0}" y="52">${escapeHtml(caption)}</text>
              <g class="cover__grid">${ticks.map((v) => `<line x1="${x0}" x2="${x1}" y1="${f(Y(v))}" y2="${f(Y(v))}"/><text x="${x0 - 12}" y="${f(Y(v) + 4)}" text-anchor="end">${fmt(v)}</text>`).join("")}</g>
              <polygon class="cover__band" points="${band}"/>
              <path class="cover__line" d="${line}" pathLength="1"/>
              ${points.map((p) => `<circle class="cover__dot" cx="${f(X(p.year))}" cy="${f(Y(p.max))}" r="4.5"/>`).join("")}
              <circle class="cover__pulse" cx="${f(X(end.year))}" cy="${f(Y(end.max))}" r="4.5"/>
              <g class="cover__years">${points.map((p) => `<text x="${f(X(p.year))}" y="350" text-anchor="middle">${p.year}</text>`).join("")}</g>
              <text class="cover__big" x="${f(X(end.year))}" y="${f(Y(end.max) - 18)}" text-anchor="end">${escapeHtml(highlight)}</text>
            </svg>`;
}

/** Carte vedette d'un dossier interactif (page autonome en français, d'où hreflang="fr"). */
function dossierCard(d) {
  return `        <article class="dossier">
          <a class="dossier__media" href="${d.href}" hreflang="fr" tabindex="-1" aria-hidden="true">
            ${coverSvg(d.cover)}
          </a>
          <div class="dossier__body">
            <span class="note__format note__format--live">Dossier interactif</span>
            <h3 class="dossier__title"><a href="${d.href}" hreflang="fr">${escapeHtml(d.title)}</a></h3>
            <p class="dossier__standfirst">${escapeHtml(d.standfirst)}</p>
            <ul class="dossier__kpis" role="list">${d.kpis.map((k) => `<li><b>${escapeHtml(k.value)}</b><span>${escapeHtml(k.label)}</span></li>`).join("")}</ul>
            <ol class="dossier__chapters" aria-label="Chapitres du dossier">${d.chapters.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ol>
            <p class="dossier__meta">${escapeHtml(d.meta)}</p>
            <a class="dossier__cta" href="${d.href}" hreflang="fr">Explorer le dossier ${ARROW}</a>
          </div>
        </article>`;
}

function indexPage(notes) {
  const ids = [...BLOCKS.map((b) => b.id), ...notes.map((n) => n.block)].filter((id, i, all) => all.indexOf(id) === i);
  const sections = ids
    .map((id) => ({
      id,
      intro: BLOCKS.find((b) => b.id === id)?.intro ?? "",
      notes: notes.filter((n) => n.block === id),
      dossiers: DOSSIERS.filter((d) => d.block === id),
      series: SERIES.filter((s) => s.block === id),
    }))
    .filter((s) => s.notes.length || s.dossiers.length);
  const dossierCount = DOSSIERS.length === 1 ? "un dossier interactif" : `${DOSSIERS.length} dossiers interactifs`;

  const cards = (list) =>
    list
      .map(
        (n) => `          <li class="note">
            <a class="note__link" href="/publications/${n.slug}">
              <span class="note__head"><span class="note__num">${n.num}</span><span class="note__format">${n.serie ? "Série" : "Note"}</span></span>
              ${n.kicker && n.kicker !== n.block ? `<span class="note__kicker">${escapeHtml(n.kicker)}</span>` : ""}
              <span class="note__title">${escapeHtml(n.title)}</span>
              <span class="note__standfirst">${escapeHtml(n.standfirst)}</span>
              <span class="note__meta">${escapeHtml(n.date)}${n.reading ? ` · ${escapeHtml(n.reading)} de lecture` : ""}</span>
              <span class="note__cta">${n.serie ? "Lire l'article" : "Lire la note"} ${ARROW}</span>
            </a>
          </li>`,
      )
      .join("\n");

  const body = sections
    .map((s, i) =>
      [
        `      <section class="bloc" aria-labelledby="bloc-${i + 1}">
        <header class="bloc__head">
          <span class="bloc__num">Bloc ${i + 1}</span>
          <h2 id="bloc-${i + 1}" class="bloc__title">${escapeHtml(s.id)}</h2>
          ${s.intro ? `<p class="bloc__intro">${escapeHtml(s.intro)}</p>` : ""}
        </header>`,
        ...s.series.map((serie) => serieHead(serie, s.notes.filter((n) => n.serie === serie))),
        ...s.dossiers.map(dossierCard),
        s.notes.length ? `        <ul class="notes" role="list">\n${cards(s.notes)}\n        </ul>` : "",
        `      </section>`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Publications — Ludovic Labeaut</title>
  <meta name="description" content="Lignes de force : ${notes.length} notes d'analyse et ${dossierCount} de Ludovic Labeaut — géopolitique, géoéconomie, banques centrales, defense-tech, IA et robotique, sourcés et datés.">
  <meta name="theme-color" content="#0b0c0e">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${alternates("/publications").split("\n").join("\n  ")}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="/assets/css/publications.css">
</head>
<body>
  <header class="pub-top">
    <a class="pub-back" href="/">← Projets</a>
    <div class="pub-top__right">
      ${langSwitch("/publications", "      ")}
      <span class="pub-brand">Ludovic Labeaut</span>
    </div>
  </header>
  <main>
    <section class="pub-hero">
      <p class="pub-hero__eyebrow">06 / 06 · Publications</p>
      <h1 class="pub-hero__title">Lignes de force</h1>
      <p class="pub-hero__lede">Notes d'analyse, séries de fond et dossiers interactifs : géopolitique, géoéconomie, banques centrales, defense-tech, IA et robotique. Chaque publication est sourcée et datée ; les notes se téléchargent en PDF.</p>
      <ul class="pub-hero__axes" aria-label="Thèmes">${sections.map((s) => `<li>${escapeHtml(s.id)}</li>`).join("")}</ul>
    </section>
${body}
  </main>
  <footer class="pub-foot">
    <p>${DISCLAIMER}</p>
  </footer>
</body>
</html>
`;
}

async function main() {
  if (!existsSync(SOURCE) || !(await stat(SOURCE)).isDirectory()) {
    console.error(`Dossier introuvable : ${SOURCE}`);
    console.error('Indiquez-le en argument : npm run articles -- "C:\\chemin\\vers\\Articles rédigés"');
    process.exit(1);
  }
  const files = (await readdir(SOURCE)).map((f) => f.normalize("NFC")).sort();
  const htmlFiles = files.filter((f) => /^\d{2}_.+\.html?$/i.test(f));
  const mdFiles = files.filter((f) => /Article_\d{2}_.+\.md$/i.test(f));

  const notes = [];
  for (const f of htmlFiles) notes.push(readHtmlNote(f, await readFile(path.join(SOURCE, f), "utf8")));

  const sample = htmlFiles.length ? await readFile(path.join(SOURCE, htmlFiles[0]), "utf8") : "";
  const css = sample.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  if (mdFiles.length && !css) throw new Error("Aucune note HTML dont reprendre la mise en page pour convertir les notes Markdown.");
  for (const f of mdFiles) notes.push(readMarkdownNote(f, await readFile(path.join(SOURCE, f), "utf8"), css));

  for (const serie of SERIES) {
    if (!existsSync(serie.dir)) throw new Error(`Dossier de la série « ${serie.name} » introuvable : ${serie.dir} (variable SERIE_IA_DIR).`);
    if (!css) throw new Error("Aucune note HTML dont reprendre la mise en page pour les articles de série.");
    const files = (await readdir(serie.dir)).map((f) => f.normalize("NFC")).filter((f) => /^Article\s+\d+\s*[—–-].+\.md$/i.test(f));
    const articles = [];
    for (const f of files) articles.push(readSeriesArticle(serie, f, await readFile(path.join(serie.dir, f), "utf8")));
    if (!articles.length) throw new Error(`Aucun article « Article N — Titre.md » dans ${serie.dir} : la série « ${serie.name} » disparaîtrait du site.`);
    articles.sort((a, b) => a.index - b.index);
    articles.forEach((a, i) => {
      if (a.index !== i + 1 || a.total !== articles.length) throw new Error(`Série « ${serie.name} » incomplète ou mal numérotée (${a.slug}).`);
    });
    for (const a of articles) notes.push({ ...a, page: seriesPage(a, articles, css) });
  }

  for (const d of DOSSIERS) {
    if (!existsSync(path.join(ROOT, "public", d.href, "index.html"))) throw new Error(`Dossier interactif introuvable : public${d.href}/index.html`);
  }

  notes.sort((a, b) => a.num.localeCompare(b.num));
  const dup = notes.find((n, i) => notes.findIndex((m) => m.num === n.num) !== i);
  if (dup) throw new Error(`Deux notes portent le numéro ${dup.num}.`);
  for (const n of notes) {
    if (!n.title || !n.block) throw new Error(`Titre ou bloc introuvable pour la note ${n.num} (${n.slug}).`);
  }

  await rm(STAGING, { recursive: true, force: true });
  await mkdir(STAGING, { recursive: true });
  for (const n of notes) await writeFile(path.join(STAGING, `${n.slug}.html`), n.page, "utf8");
  await writeFile(path.join(STAGING, "index.html"), indexPage(notes), "utf8");

  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.dirname(OUT), { recursive: true });
  await rename(STAGING, OUT);

  for (const n of notes) console.log(`  ${n.num}  ${n.block.padEnd(13)} /publications/${n.slug}`);
  console.log(`\n${notes.length} note(s) publiée(s) depuis ${SOURCE}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
