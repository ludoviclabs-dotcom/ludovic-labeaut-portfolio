#!/usr/bin/env node
/**
 * « Fil rouge » : écrit dans les pages les textes de public/data/fil-rouge.json,
 * qui reste la seule source de ces textes.
 *
 *   npm run fil-rouge            met à jour public/index.html et i18n/en/index.json
 *   npm run fil-rouge -- --check vérifie que les pages sont à jour, sans rien écrire (code 1 sinon)
 *
 * Après une mise à jour, relancer « npm run en » pour régénérer public/en/.
 *
 * Étape 3 : la question de chaque projet, sur son panneau de l'accueil, entre deux repères
 *   <!-- fil-rouge:<id> --> … <!-- /fil-rouge:<id> -->
 * (le bloc est créé après la liste des axes du panneau s'il n'existe pas encore).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public", "data", "fil-rouge.json");
const INDEX = path.join(ROOT, "public", "index.html");
const INDEX_EN = path.join(ROOT, "i18n", "en", "index.json");
const CHECK = process.argv.includes("--check");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const normalize = (s) => s.replace(/\s+/g, " ").trim();

function questionBlock(data, project) {
  const pad = " ".repeat(12);
  return [
    `<!-- fil-rouge:${project.id} -->`,
    `<div class="panel__question">`,
    `  <p class="panel__question-label">${esc(data.questions.label.fr)}</p>`,
    `  <p class="panel__question-text">${esc(project.question.fr)}</p>`,
    `</div>`,
    `<!-- /fil-rouge:${project.id} -->`,
  ]
    .map((line, i) => (i === 0 ? line : pad + line))
    .join("\n");
}

function updateIndex(html, data) {
  let out = html;
  for (const project of data.projets) {
    const block = questionBlock(data, project);
    const marked = new RegExp(`<!-- fil-rouge:${project.id} -->[\\s\\S]*?<!-- /fil-rouge:${project.id} -->`);
    if (marked.test(out)) {
      out = out.replace(marked, () => block);
      continue;
    }
    const panel = out.indexOf(`data-project="${project.id}"`);
    if (panel < 0) throw new Error(`Panneau « ${project.id} » introuvable dans public/index.html.`);
    const axesEnd = out.indexOf("</ul>", panel);
    if (axesEnd < 0) throw new Error(`Liste des axes introuvable pour « ${project.id} ».`);
    const at = axesEnd + "</ul>".length;
    out = `${out.slice(0, at)}\n${" ".repeat(12)}${block}${out.slice(at)}`;
  }
  return out;
}

function updateTranslations(dict, data) {
  const next = { ...dict };
  const set = (fr, en) => {
    next[normalize(esc(fr))] = esc(en);
  };
  set(data.questions.label.fr, data.questions.label.en);
  for (const project of data.projets) set(project.question.fr, project.question.en);
  return next;
}

const data = JSON.parse(await readFile(DATA, "utf8"));
const html = await readFile(INDEX, "utf8");
const dict = JSON.parse(await readFile(INDEX_EN, "utf8"));

const nextHtml = updateIndex(html, data);
const nextDict = updateTranslations(dict, data);
const dictText = `${JSON.stringify(nextDict, null, 2)}\n`;
const htmlStale = nextHtml !== html;
const dictStale = dictText !== `${JSON.stringify(dict, null, 2)}\n`;

if (CHECK) {
  if (htmlStale || dictStale) {
    console.error(`Fil rouge : ${[htmlStale && "public/index.html", dictStale && "i18n/en/index.json"].filter(Boolean).join(" et ")} ne correspond${htmlStale && dictStale ? "ent" : ""} plus à public/data/fil-rouge.json. Lancez « npm run fil-rouge ».`);
    process.exit(1);
  }
  console.log("Fil rouge : les pages sont à jour.");
} else {
  if (htmlStale) await writeFile(INDEX, nextHtml, "utf8");
  if (dictStale) await writeFile(INDEX_EN, dictText, "utf8");
  console.log(`Fil rouge : ${htmlStale || dictStale ? "pages mises à jour" : "rien à changer"}.`);
}
