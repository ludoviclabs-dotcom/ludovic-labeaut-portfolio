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
 * Blocs écrits, chacun entre deux repères <!-- fil-rouge:… --> … <!-- /fil-rouge:… --> :
 *   - accueil (public/index.html) : la question du projet, après la liste des axes de son panneau ;
 *   - page projet (public/projets/<id>.html) : « Pourquoi ce projet », avant la ligne d'appel
 *     « Ouvrir l'application ».
 * Un bloc absent est créé à l'emplacement indiqué ; un bloc présent est remplacé.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public", "data", "fil-rouge.json");
const CHECK = process.argv.includes("--check");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const normalize = (s) => s.replace(/\s+/g, " ").trim();

/** Fichiers lus puis modifiés en mémoire : { before, after }. */
const files = new Map();
async function open(file) {
  if (!files.has(file)) {
    const text = await readFile(file, "utf8");
    files.set(file, { before: text, after: text });
  }
  return files.get(file);
}

/** Remplace le bloc repéré par `id` dans `html`, ou l'insère avant/après `anchor` s'il n'existe pas encore. */
function putBlock(html, id, block, { anchor, where }, label) {
  const marked = new RegExp(`[ \\t]*<!-- fil-rouge:${id} -->[\\s\\S]*?<!-- /fil-rouge:${id} -->`);
  if (marked.test(html)) return html.replace(marked, () => block);
  const at = html.indexOf(anchor);
  if (at < 0) throw new Error(`${label} : emplacement introuvable (« ${anchor} »).`);
  const cut = where === "after" ? at + anchor.length : at;
  return `${html.slice(0, cut)}${where === "after" ? "\n" : ""}${block}${where === "after" ? "" : "\n\n"}${html.slice(cut)}`;
}

const indent = (lines, n) => lines.map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

function questionBlock(data, project) {
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

function whyBlock(data, project) {
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
      `</section>`,
      `<!-- /fil-rouge:why -->`,
    ],
    4,
  );
}

/** Ajoute à un dictionnaire i18n/en/ les paires « segment français → anglais ». */
async function translate(file, pairs) {
  const entry = await open(file);
  const dict = JSON.parse(entry.after);
  for (const [fr, en] of pairs) dict[normalize(esc(fr))] = esc(en);
  entry.after = `${JSON.stringify(dict, null, 2)}\n`;
}

const data = JSON.parse(await readFile(DATA, "utf8"));
const homeFile = path.join(ROOT, "public", "index.html");
const homeDict = path.join(ROOT, "i18n", "en", "index.json");

// Accueil : la question sur chaque panneau.
{
  const home = await open(homeFile);
  for (const project of data.projets) {
    const panel = home.after.indexOf(`data-project="${project.id}"`);
    if (panel < 0) throw new Error(`Panneau « ${project.id} » introuvable dans public/index.html.`);
    const axesEnd = home.after.indexOf("</ul>", panel);
    if (axesEnd < 0) throw new Error(`Liste des axes introuvable pour « ${project.id} ».`);
    // Le bloc est inséré juste après la liste des axes de ce panneau.
    const marked = new RegExp(`[ \\t]*<!-- fil-rouge:${project.id} -->[\\s\\S]*?<!-- /fil-rouge:${project.id} -->`);
    const block = questionBlock(data, project);
    if (marked.test(home.after)) home.after = home.after.replace(marked, () => block);
    else {
      const at = axesEnd + "</ul>".length;
      home.after = `${home.after.slice(0, at)}\n${block}${home.after.slice(at)}`;
    }
  }
  await translate(homeDict, [
    [data.questions.label.fr, data.questions.label.en],
    ...data.projets.map((p) => [p.question.fr, p.question.en]),
  ]);
}

// Pages projet : « Pourquoi ce projet ».
for (const project of data.projets) {
  const page = path.join(ROOT, "public", "projets", `${project.id}.html`);
  if (!existsSync(page)) throw new Error(`Page projet introuvable : public/projets/${project.id}.html`);
  const entry = await open(page);
  entry.after = putBlock(entry.after, "why", whyBlock(data, project), { anchor: `    <section class="pj-cta-row">`, where: "before" }, `projets/${project.id}.html`);
  const p = data.projet_page;
  await translate(path.join(ROOT, "i18n", "en", "projets", `${project.id}.json`), [
    [p.titre.fr, p.titre.en],
    [data.familles[project.famille].label.fr, data.familles[project.famille].label.en],
    [data.questions.label.fr, data.questions.label.en],
    [project.question.fr, project.question.en],
    [p.label_lien.fr, p.label_lien.en],
    [project.lien_master.fr, project.lien_master.en],
    [p.label_montre.fr, p.label_montre.en],
    [project.montre.fr, project.montre.en],
  ]);
}

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
