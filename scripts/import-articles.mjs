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
  { id: "Defense-Tech", intro: "Munitions, achats d'armement, drones : l'industrie de défense en mutation." },
];

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
  .sources a { text-decoration: underline; text-decoration-color: rgba(22, 32, 44, .35); text-underline-offset: 2px; }
  @media (max-width: 700px) { body { padding-top: 64px !important; } .lf-bar .lf-name { display: none; } }
}
@media print { .lf-bar { display: none !important; } }
</style>`;
const BAR_HTML = `<nav class="lf-bar" aria-label="Navigation">
<a href="/publications">← Publications</a>
<span class="lf-name">${AUTHOR} · Lignes de force</span>
<button type="button" onclick="window.print()">Enregistrer en PDF</button>
</nav>`;

function withBar(html) {
  return html.replace(/<\/head>/i, `${BAR_STYLE}</head>`).replace(/<body([^>]*)>/i, `<body$1>${BAR_HTML}`);
}

function readHtmlNote(file, html) {
  const num = file.match(/^(\d{2})_/)[1];
  const pick = (re) => (html.match(re)?.[1] ?? "").trim();
  const issue = textOf(pick(/<div class="issue">([\s\S]*?)<\/div>/));
  const issueTitle = textOf(pick(/<div class="issue"><b>([\s\S]*?)<\/b>/));
  return {
    num,
    slug: slugify(path.parse(file).name),
    title: textOf(pick(/<title>([\s\S]*?)<\/title>/)),
    block: issueTitle.split("·")[0].trim(),
    kicker: textOf(pick(/<div class="kicker">([\s\S]*?)<\/div>/)),
    standfirst: textOf(pick(/<p class="standfirst">([\s\S]*?)<\/p>/)),
    date: issue.replace(issueTitle, "").trim(),
    reading: (textOf(pick(/<div class="byline">([\s\S]*?)<\/div>/)).match(/Lecture\s*:\s*([^A-ZÀ-Ý]+min)/) ?? [])[1]?.trim() ?? "",
    page: withBar(html),
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

  return { num, slug: `${num}-${slugify(file.replace(/^.*Article_\d{2}_/i, "").replace(/\.md$/i, ""))}`, title, block, kicker: block, standfirst: textOf(marked.parseInline(standfirst)), date, reading, page: withBar(page) };
}

function indexPage(notes) {
  const sections = BLOCKS.map((b) => ({ ...b, notes: notes.filter((n) => n.block === b.id) }))
    .concat(
      [...new Set(notes.map((n) => n.block))]
        .filter((id) => !BLOCKS.some((b) => b.id === id))
        .map((id) => ({ id, intro: "", notes: notes.filter((n) => n.block === id) })),
    )
    .filter((s) => s.notes.length);

  const cards = (list) =>
    list
      .map(
        (n) => `          <li class="note">
            <a class="note__link" href="/publications/${n.slug}">
              <span class="note__num">${n.num}</span>
              ${n.kicker && n.kicker !== n.block ? `<span class="note__kicker">${escapeHtml(n.kicker)}</span>` : ""}
              <span class="note__title">${escapeHtml(n.title)}</span>
              <span class="note__standfirst">${escapeHtml(n.standfirst)}</span>
              <span class="note__meta">${escapeHtml(n.date)}${n.reading ? ` · ${escapeHtml(n.reading)} de lecture` : ""}</span>
              <span class="note__cta">Lire la note <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>
            </a>
          </li>`,
      )
      .join("\n");

  const body = sections
    .map(
      (s, i) => `      <section class="bloc" aria-labelledby="bloc-${i + 1}">
        <header class="bloc__head">
          <span class="bloc__num">Bloc ${i + 1}</span>
          <h2 id="bloc-${i + 1}" class="bloc__title">${escapeHtml(s.id)}</h2>
          ${s.intro ? `<p class="bloc__intro">${escapeHtml(s.intro)}</p>` : ""}
        </header>
        <ul class="notes" role="list">
${cards(s.notes)}
        </ul>
      </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Publications — Ludovic Labeaut</title>
  <meta name="description" content="Lignes de force : ${notes.length} notes d'analyse géopolitique, géoéconomique et defense-tech de Ludovic Labeaut, sourcées et datées.">
  <meta name="theme-color" content="#0b0c0e">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="/assets/css/publications.css">
</head>
<body>
  <header class="pub-top">
    <a class="pub-back" href="/">← Projets</a>
    <span class="pub-brand">Ludovic Labeaut</span>
  </header>
  <main>
    <section class="pub-hero">
      <p class="pub-hero__eyebrow">05 / 05 · Publications</p>
      <h1 class="pub-hero__title">Lignes de force</h1>
      <p class="pub-hero__lede">Notes d'analyse géopolitique, géoéconomique et defense-tech. Chaque note est sourcée, datée et téléchargeable en PDF.</p>
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
