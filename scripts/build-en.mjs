#!/usr/bin/env node
/**
 * Version anglaise du site : génère public/en/ à partir des pages françaises.
 *
 *   npm run en              construit public/en/ (échoue s'il manque une traduction)
 *   npm run en -- --extract ajoute aux fichiers i18n/en/ les textes français encore non traduits
 *                           et retire ceux qui n'existent plus dans les pages
 *   npm run en -- --partial publie les pages complètes même s'il en reste à traduire (aperçu)
 *
 * Principe : chaque page anglaise est la page française dont seuls les textes changent.
 * - Un « segment » est le contenu d'un élément qui porte directement du texte (un paragraphe
 *   avec son gras et ses liens, un titre, un bouton…), plus quelques attributs (aria-label,
 *   alt, title, meta description / og). Un chiffre suivi de son unité en ligne
 *   (« 218 <small>k$</small> ») forme aussi un segment, pour que l'unité puisse changer de place.
 *   Les éléments marqués translate="no" sont gardés tels quels.
 * - Les textes faits seulement de chiffres (axes, barres, cellules) ne sont pas traduits :
 *   leur format passe à l'anglais (« 23,2 » → « 23.2 », « 28 000 » → « 28,000 », « 93 % » → « 93% »).
 * - Les traductions vivent dans i18n/en/<chemin de la page>.json ({ "segment français": "English" }),
 *   avec i18n/en/_common.json pour les textes partagés. Modifier un texte français crée donc
 *   un segment non traduit : la construction s'arrête et le liste, l'anglais ne peut pas
 *   se désynchroniser en silence.
 * - Les liens internes pointent vers /en/… ; les feuilles de style, scripts, images et vidéos
 *   restent communs aux deux langues, sauf une vidéo ou un poster qui existe en version
 *   anglaise à côté de l'original (/videos/probant-en.mp4 pour /videos/probant.mp4).
 */
import { readdir, readFile, mkdir, writeFile, rm, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "en");
const STAGING = path.join(ROOT, ".cache", "en-en-cours");
const I18N = path.join(ROOT, "i18n", "en");
const EXTRACT = process.argv.includes("--extract");
const PARTIAL = process.argv.includes("--partial");

const LOCALE = "en_GB";
/** Éléments dont le contenu n'est jamais traduit. */
const SKIP = new Set(["script", "style", "template", "code", "pre"]);
/** Attributs traduits, quel que soit l'élément. */
const TEXT_ATTRS = ["aria-label", "alt", "title", "placeholder"];
/** Balises meta dont le contenu est traduit (name ou property). */
const META_KEYS = new Set(["description", "og:title", "og:description", "og:image:alt", "twitter:title", "twitter:description"]);
const ASSET_PREFIXES = ["/assets/", "/images/", "/videos/", "/favicon"];
const HAS_LETTER = /\p{L}/u;
const HAS_DIGIT = /\d/;
/** Éléments en ligne qui peuvent accompagner un chiffre dans un même segment (unité, flèche…). */
const INLINE = new Set(["span", "small", "b", "strong", "i", "em", "sup", "sub", "abbr", "br"]);

const textContent = (node) => (node.nodeName === "#text" ? node.value : (node.childNodes ?? []).map(textContent).join(""));
const onlyInline = (node) => (node.childNodes ?? []).every((c) => !c.tagName || (INLINE.has(c.tagName) && onlyInline(c)));

/** Format anglais des nombres : virgule décimale, espaces de milliers, %, $ et € placés à l'anglaise. */
function localizeNumbers(s) {
  return s
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/(\d)[   ](?=\d{3}(?!\d))/g, "$1,")
    .replace(/(\d)[   ]?%/g, "$1%")
    .replace(/(\d[\d.,]*)[   ]?\$/g, "$$$1")
    .replace(/(\d[\d.,]*)[   ]?€/g, "€$1");
}

/** Pages françaises à traduire : fichier source et adresse publique (pour résoudre les liens relatifs). */
async function listPages() {
  const pages = [
    { file: "index.html", url: "/" },
    { file: "credits.html", url: "/credits" },
    { file: "publications/index.html", url: "/publications/" },
  ];
  for (const dir of ["projets", "publications"]) {
    for (const f of (await readdir(path.join(PUBLIC, dir))).sort()) {
      if (f.endsWith(".html") && f !== "index.html") pages.push({ file: `${dir}/${f}`, url: `/${dir}/${f.replace(/\.html$/, "")}` });
    }
  }
  return pages;
}

const normalize = (s) => s.replace(/\s+/g, " ").trim();
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Une traduction d'attribut peut être écrite « & » ou « &amp; » : on la décode avant de l'échapper. */
const decodeEntities = (s) =>
  s.replace(/&(amp|quot|lt|gt|apos|#39|nbsp);/g, (_, e) => ({ amp: "&", quot: '"', lt: "<", gt: ">", apos: "'", "#39": "'", nbsp: " " })[e]);

const parseHtml = (html) => parse(html, { sourceCodeLocationInfo: true, scriptingEnabled: false });

/** Parcourt le document et renvoie les segments traduisibles avec leur position dans le source. */
function collectSegments(html) {
  const segments = [];
  const visit = (node) => {
    if (!node.tagName) {
      node.childNodes?.forEach(visit);
      return;
    }
    if (SKIP.has(node.tagName) || attr(node, "translate") === "no") return;
    const loc = node.sourceCodeLocation;

    for (const name of TEXT_ATTRS) {
      const value = attr(node, name);
      if (value && HAS_LETTER.test(value)) segments.push({ kind: "attr", name, key: normalize(value), loc: loc.attrs[name] });
    }
    if (node.tagName === "meta") {
      const key = attr(node, "name") ?? attr(node, "property");
      const value = attr(node, "content");
      if (META_KEYS.has(key) && value) segments.push({ kind: "attr", name: "content", key: normalize(value), loc: loc.attrs.content });
    }

    const children = node.tagName === "template" ? [] : node.childNodes ?? [];
    const hasText = children.some((c) => c.nodeName === "#text" && HAS_LETTER.test(c.value));
    // Un chiffre et son unité en ligne (« 218 <small>k$</small> ») forment un seul segment.
    const figure =
      !hasText &&
      children.some((c) => c.nodeName === "#text" && HAS_DIGIT.test(c.value)) &&
      children.some((c) => c.tagName) &&
      onlyInline(node) &&
      /[\p{L}$€£]/u.test(textContent(node));
    if (hasText || figure) {
      if (!loc.endTag) throw new Error(`Balise <${node.tagName}> sans fermeture (ligne ${loc.startLine}).`);
      const start = loc.startTag.endOffset;
      const end = loc.endTag.startOffset;
      const inner = html.slice(start, end);
      if (HAS_LETTER.test(inner.replace(/<[^>]*>/g, ""))) segments.push({ kind: "text", key: normalize(inner), start, end, inner });
      return; // le segment englobe ses éléments en ligne (gras, liens, sauts de ligne…)
    }
    for (const c of children) {
      if (c.nodeName === "#text" && HAS_DIGIT.test(c.value)) {
        const { startOffset, endOffset } = c.sourceCodeLocation;
        segments.push({ kind: "number", start: startOffset, end: endOffset, raw: html.slice(startOffset, endOffset) });
      }
    }
    children.forEach(visit);
  };
  visit(parseHtml(html));
  return segments;
}

/** Remplace les segments par leur traduction ; renvoie aussi les segments sans traduction. */
function translate(html, lookup) {
  const missing = [];
  const edits = [];
  for (const s of collectSegments(html)) {
    if (s.kind === "number") {
      const en = localizeNumbers(s.raw);
      if (en !== s.raw) edits.push([s.start, s.end, en]);
      continue;
    }
    const en = lookup(s.key);
    if (en === undefined || en === "") {
      missing.push(s.key);
      continue;
    }
    if (s.kind === "attr") {
      edits.push([s.loc.startOffset, s.loc.endOffset, `${s.name}="${escapeAttr(decodeEntities(en))}"`]);
    } else {
      const lead = s.inner.match(/^\s*/)[0];
      const trail = s.inner.match(/\s*$/)[0];
      edits.push([s.start, s.end, `${lead}${en}${trail}`]);
    }
  }
  return { html: applyEdits(html, edits), missing };
}

function applyEdits(html, edits) {
  let out = html;
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, start) + text + out.slice(end);
  return out;
}

/** Adresse anglaise d'un lien interne, ou null s'il ne change pas. */
function englishHref(value, pageUrl) {
  if (!value || /^(?:[a-z]+:|#|\/\/)/i.test(value)) return null;
  const resolved = new URL(value, `https://site${pageUrl}`);
  const p = resolved.pathname;
  const isAsset = ASSET_PREFIXES.some((prefix) => p.startsWith(prefix)) || /\.(?:css|js|png|jpe?g|webp|svg|mp4|ico|pdf|json)$/i.test(p);
  const target = isAsset || p === "/en" || p.startsWith("/en/") ? p : `/en${p === "/" ? "/" : p}`;
  return target + resolved.search + resolved.hash;
}

/** Version anglaise d'une vidéo ou d'un poster (/videos/x-en.mp4), si elle existe. */
function englishAsset(value) {
  if (!value?.startsWith("/videos/")) return null;
  const candidate = value.replace(/(\.[a-z0-9]+)$/i, "-en$1");
  return existsSync(path.join(PUBLIC, candidate)) ? candidate : null;
}

/** Langue du document, liens vers /en/, état du sélecteur de langue. */
function localize(html, pageUrl) {
  const edits = [];
  const visit = (node, inSwitch) => {
    if (!node.tagName) {
      node.childNodes?.forEach((c) => visit(c, inSwitch));
      return;
    }
    const loc = node.sourceCodeLocation;
    const set = (name, value) => {
      const a = loc.attrs?.[name];
      if (a) edits.push([a.startOffset, a.endOffset, `${name}="${escapeAttr(value)}"`]);
      else edits.push([loc.startTag.endOffset - 1, loc.startTag.endOffset - 1, ` ${name}="${escapeAttr(value)}"`]);
    };
    const switchHere = inSwitch || (attr(node, "class") ?? "").split(/\s+/).includes("lang-switch");

    if (node.tagName === "html") set("lang", "en");
    if (node.tagName === "meta" && attr(node, "property") === "og:locale") set("content", LOCALE);
    if (node.tagName === "meta" && attr(node, "property") === "og:image") {
      const asset = englishAsset(attr(node, "content"));
      if (asset) set("content", asset);
    }
    for (const name of ["data-src", "poster"]) {
      const asset = englishAsset(attr(node, name));
      if (asset) set(name, asset);
    }
    if (switchHere && node.tagName === "a") {
      const current = loc.attrs?.["aria-current"];
      if (current) edits.push([current.startOffset - 1, current.endOffset, ""]);
      if (attr(node, "hreflang") === "en") set("aria-current", "page");
    } else if (!attr(node, "hreflang")) {
      for (const name of ["href", "src"]) {
        const href = englishHref(attr(node, name), pageUrl);
        const next = englishAsset(href ?? attr(node, name)) ?? href;
        if (next !== null && next !== attr(node, name)) set(name, next);
      }
    }
    (node.tagName === "template" ? [] : node.childNodes ?? []).forEach((c) => visit(c, switchHere));
  };
  visit(parseHtml(html), false);
  return applyEdits(html, edits);
}

async function readJson(file) {
  return existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const pages = await listPages();
  const commonFile = path.join(I18N, "_common.json");
  const common = await readJson(commonFile);
  const report = [];
  const usedCommon = new Set();

  if (!EXTRACT) {
    await rm(STAGING, { recursive: true, force: true });
    await mkdir(STAGING, { recursive: true });
  }

  for (const page of pages) {
    const html = await readFile(path.join(PUBLIC, page.file), "utf8");
    const dictFile = path.join(I18N, page.file.replace(/\.html$/, ".json"));
    const dict = await readJson(dictFile);
    const lookup = (key) => (dict[key] !== undefined && dict[key] !== "" ? dict[key] : common[key]);

    if (EXTRACT) {
      let added = 0;
      const used = new Set();
      for (const { kind, key } of collectSegments(html)) {
        if (kind === "number") continue;
        used.add(key);
        if (dict[key] === undefined && common[key] !== undefined) usedCommon.add(key);
        if (lookup(key) === undefined && dict[key] === undefined) {
          dict[key] = "";
          added += 1;
        }
      }
      const stale = Object.keys(dict).filter((key) => !used.has(key));
      for (const key of stale) delete dict[key];
      if (added || stale.length) await writeJson(dictFile, dict);
      if (stale.length) report.push(`  ${page.file} : ${stale.length} segment(s) retiré(s), absents de la page`);
      const todo = Object.values(dict).filter((v) => v === "").length;
      if (todo) report.push(`  ${page.file} : ${todo} segment(s) à traduire${added ? ` (${added} nouveau·x)` : ""}`);
      continue;
    }

    const { html: translated, missing } = translate(html, lookup);
    if (missing.length) {
      report.push(`  ${page.file} : ${missing.length} segment(s) sans traduction, par exemple « ${missing[0].slice(0, 90)} »`);
      continue;
    }
    const out = path.join(STAGING, page.file);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, localize(translated, page.url), "utf8");
  }

  if (EXTRACT) {
    const staleCommon = Object.keys(common).filter((key) => !usedCommon.has(key));
    if (staleCommon.length) {
      for (const key of staleCommon) delete common[key];
      await writeJson(commonFile, common);
      report.push(`  _common.json : ${staleCommon.length} segment(s) retiré(s), absents des pages`);
    }
    console.log(report.length ? `Segments à traduire dans i18n/en/ :\n${report.join("\n")}` : "Tout est traduit.");
    return;
  }
  if (report.length && !PARTIAL) {
    await rm(STAGING, { recursive: true, force: true });
    console.error(`Traductions manquantes (public/en/ n'a pas été modifié) :\n${report.join("\n")}`);
    console.error("Lancez « npm run en -- --extract » puis complétez les fichiers i18n/en/.");
    process.exit(1);
  }
  await rm(OUT, { recursive: true, force: true });
  await rename(STAGING, OUT);
  if (report.length) console.warn(`Aperçu partiel, pages encore à traduire :\n${report.join("\n")}`);
  console.log(`${pages.length - report.length} page(s) anglaise(s) générées dans public/en/.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
