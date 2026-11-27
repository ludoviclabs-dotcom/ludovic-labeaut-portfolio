#!/usr/bin/env node
/**
 * Tests du « fil rouge » (accueil, pages projet, page /fil-rouge), en français et en anglais.
 *
 *   npm test
 *
 * 1. Contrôles des fichiers (toujours) :
 *    - les pages correspondent à public/data/fil-rouge.json (npm run fil-rouge -- --check) ;
 *    - les pages anglaises contiennent bien les textes anglais du JSON (npm run en a été relancé) ;
 *    - chaque lien interne des blocs « fil rouge » mène à une page qui existe.
 * 2. Contrôles dans un navigateur (si Playwright est disponible) : polices et thème clair de
 *    /fil-rouge, absence d'animation et de script de page, fiches et colophon, débordements,
 *    décalage de mise en page, erreurs dans la console, accueil et pages projet restés sombres.
 *    Sans Playwright : npm i -D playwright && npx playwright install chromium
 *    (ou PLAYWRIGHT_CHROMIUM=/chemin/vers/chrome pour un Chromium déjà installé).
 *
 * Code de sortie 1 si un contrôle échoue.
 */
import { readFile } from "node:fs/promises";
import { existsSync, statSync, createReadStream } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const data = JSON.parse(await readFile(path.join(PUBLIC, "data", "fil-rouge.json"), "utf8"));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let failures = 0;
let passes = 0;
function check(ok, label, detail = "") {
  if (ok) passes += 1;
  else failures += 1;
  console.log(`${ok ? "  ok  " : "  ÉCHEC"} ${label}${!ok && detail ? ` — ${detail}` : ""}`);
}

/* ---------- 1. Fichiers ---------- */

console.log("Fichiers");
try {
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "build-fil-rouge.mjs"), "--check"], { stdio: "pipe" });
  check(true, "pages à jour par rapport à public/data/fil-rouge.json");
} catch (err) {
  check(false, "pages à jour par rapport à public/data/fil-rouge.json", "lancez « npm run fil-rouge » puis « npm run en »");
}

const read = (rel) => readFile(path.join(PUBLIC, rel), "utf8");
const enHome = await read("en/index.html");
const enPage = await read("en/fil-rouge.html");
const missingEn = [];
for (const p of data.projets) {
  const enProject = await read(`en/projets/${p.id}.html`);
  if (!enHome.includes(esc(p.question.en))) missingEn.push(`en/index.html : ${p.question.en}`);
  if (!enPage.includes(esc(p.question.en))) missingEn.push(`en/fil-rouge.html : ${p.question.en}`);
  if (!enProject.includes(esc(p.montre.en))) missingEn.push(`en/projets/${p.id}.html : ${p.montre.en}`);
}
if (!enPage.includes(esc(data.accroche.en).replace(/\*([^*]+)\*/, "<em>$1</em>"))) missingEn.push("en/fil-rouge.html : accroche");
const unpaired = [];
(function walk(node, at) {
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${at}[${i}]`));
  if (!node || typeof node !== "object") return;
  if ("fr" in node || "en" in node) {
    const ok = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "");
    if (!ok(node.fr) || !ok(node.en)) unpaired.push(at);
    return;
  }
  for (const [k, v] of Object.entries(node)) walk(v, at ? `${at}.${k}` : k);
})(data, "");
check(unpaired.length === 0, "parité FR / EN : chaque texte du JSON existe dans les deux langues", unpaired.join(", "));
check(missingEn.length === 0, "pages anglaises à jour (textes anglais du JSON présents)", `${missingEn[0]} … relancez « npm run en »`);

/** Fichier servi pour une adresse du site (comme Vercel avec cleanUrls). */
function resolveUrl(url) {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  const base = path.join(PUBLIC, clean);
  if (!base.startsWith(PUBLIC)) return null;
  if (existsSync(base) && statSync(base).isFile()) return base;
  if (existsSync(path.join(base, "index.html"))) return path.join(base, "index.html");
  if (existsSync(`${base}.html`)) return `${base}.html`;
  return null;
}

const pagesWithBlocks = ["index.html", "fil-rouge.html", ...data.projets.map((p) => `projets/${p.id}.html`)];
const broken = [];
for (const page of pagesWithBlocks.flatMap((f) => [f, `en/${f}`])) {
  const html = await read(page);
  const blocks = page.endsWith("fil-rouge.html") ? [html] : html.match(/<!-- fil-rouge:[\s\S]*?<!-- \/fil-rouge:[^>]*-->/g) ?? [];
  const pageUrl = "/" + page.replace(/(index)?\.html$/, "");
  for (const block of blocks) {
    for (const [, href] of block.matchAll(/href="([^"#]+)"/g)) {
      if (/^(https?:)?\/\//.test(href) || href.endsWith(".css") || href.endsWith(".svg")) continue;
      const target = new URL(href, `https://site${pageUrl}`).pathname;
      if (!resolveUrl(target)) broken.push(`${page} → ${href}`);
    }
  }
}
check(broken.length === 0, "liens internes des blocs fil rouge valides (FR et EN)", broken.join(", "));

/* ---------- 2. Navigateur ---------- */

let playwright = null;
try {
  playwright = createRequire(import.meta.url)("playwright");
} catch {
  // Playwright absent : seuls les contrôles de fichiers sont faits.
}

if (!playwright) {
  console.log("\nNavigateur : contrôles ignorés, Playwright n'est pas installé (npm i -D playwright && npx playwright install chromium).");
} else {
  const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4" };
  const server = createServer((req, res) => {
    const file = resolveUrl(req.url);
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await playwright.chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

  async function page(url, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
    const p = await context.newPage();
    p.errors = [];
    p.on("pageerror", (e) => p.errors.push(String(e)));
    p.on("console", (m) => {
      if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text())) p.errors.push(m.text());
    });
    await p.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await p.goto(origin + url, { waitUntil: "load" });
    return p;
  }
  const overflowX = (p) => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);

  try {
    // Langue retenue : la redirection reste sur le site consulté, même si les liens hreflang
    // pointent vers le domaine de production.
    {
      const context = await browser.newContext();
      await context.addInitScript(() => localStorage.setItem("ll-lang", "en"));
      const p = await context.newPage();
      await p.goto(`${origin}/fil-rouge`);
      await p.waitForLoadState("load");
      check(p.url() === `${origin}/en/fil-rouge`, "langue anglaise retenue : redirection vers /en/fil-rouge sur le même site", p.url());
      await context.close();
    }

    for (const lang of ["", "/en"]) {
      const L = lang ? "EN" : "FR";
      console.log(`\nNavigateur — /fil-rouge (${L})`);
      {
        const p = await page(`${lang}/fil-rouge`);
        await p.waitForTimeout(1500);
        check((await p.evaluate(() => window.__cls)) < 0.01, `${L} : pas de décalage de mise en page à l'arrivée`);
        const r = await p.evaluate(() => {
          const css = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
          const main = document.querySelector("main");
          const fonts = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href).join(" ");
          return {
            fontsOk: /Newsreader/.test(fonts) && /Source\+Sans\+3/.test(fonts) && !/Cormorant|Inter|JetBrains/.test(fonts),
            h1Font: css(document.querySelector("h1"), "font-family"),
            bodyFont: css(document.body, "font-family"),
            bg: css(document.documentElement, "background-color"),
            shadows: [...document.querySelectorAll("body *")].filter((e) => css(e, "box-shadow") !== "none").length,
            gradients: [...document.querySelectorAll("body *")].filter((e) => /gradient/.test(css(e, "background-image"))).length,
            h1Em: document.querySelectorAll("h1 em").length,
            h2Em: Math.max(...[...document.querySelectorAll("h2")].map((h) => h.querySelectorAll("em").length)),
            scripts: [...document.scripts].map((s) => s.getAttribute("src") || "inline"),
            buttons: main.querySelectorAll("button").length,
            reveal: document.querySelectorAll("[data-reveal], [data-split], .fr-autoplay").length,
            chain: document.querySelectorAll(".fr-chain__step").length,
            fiches: [...document.querySelectorAll(".fr-fiche")].map((f) => ({
              fields: f.querySelectorAll(".fr-fiche__fields > .fr-field").length,
              io: f.querySelectorAll(".fr-io > div").length,
              ue: f.querySelectorAll(".fr-ue li").length,
              visible: f.getBoundingClientRect().height > 50,
            })),
            asterisk: /\*/.test(main.innerText),
            colophon: document.querySelector(".fr-refs").innerText,
          };
        });
        check(r.fontsOk && /Newsreader/.test(r.h1Font) && /Source Sans 3/.test(r.bodyFont), `${L} : Newsreader et Source Sans 3 seulement (ni Cormorant, ni Inter, ni JetBrains Mono)`, `${r.h1Font} / ${r.bodyFont}`);
        check(r.bg === "rgb(246, 247, 249)" && r.shadows === 0 && r.gradients === 0, `${L} : fond #F6F7F9, aucune ombre, aucun dégradé`, `${r.bg}, ${r.shadows} ombre(s), ${r.gradients} dégradé(s)`);
        check(r.h1Em === 1 && r.h2Em <= 1 && !r.asterisk, `${L} : un seul mot en italique par grand titre`);
        check(r.scripts.length === 1 && /lang\.js$/.test(r.scripts[0]) && r.buttons === 0 && r.reveal === 0, `${L} : ni défilement automatique, ni animation, aucun script de page`, r.scripts.join(", "));
        const fichesOk = r.fiches.length === data.projets.length && r.fiches.every((f) => f.fields === 3 && f.io === 3 && f.ue >= 1 && f.visible);
        check(r.chain === 3 && fichesOk, `${L} : chaîne en 3 étapes, ${data.projets.length} fiches à 3 champs (outil, exigence, UE)`);
        check(!/IFRS|AMF/.test(r.colophon), `${L} : colophon sans IFRS ni AMF`);
        check(!(await overflowX(p)), `${L} : pas de débordement horizontal (1440 px)`);
        check(p.errors.length === 0, `${L} : aucune erreur dans la console`, p.errors.join(" | "));
        await p.context().close();
      }
      {
        const p = await page(`${lang}/fil-rouge`, { viewport: { width: 375, height: 667 } });
        await p.waitForTimeout(800);
        check(!(await overflowX(p)), `${L} : pas de débordement horizontal (375 px)`);
        await p.context().close();
      }
      {
        // Le thème clair ne doit pas déborder sur les autres pages.
        const home = await page(`${lang}/`);
        const project = await page(`${lang}/projets/probant`);
        const bg = (p) => p.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
        const [b1, b2] = [await bg(home), await bg(project)];
        check(b1 === "rgb(11, 12, 14)" && b2 === "rgb(11, 12, 14)", `${L} : l'accueil et les pages projet restent sombres`, `${b1} / ${b2}`);
        await home.context().close();
        await project.context().close();
      }

      console.log(`\nNavigateur — accueil et pages projet (${L})`);
      for (const [w, h] of [[375, 667], [821, 700], [1024, 768], [1440, 900]]) {
        const p = await page(`${lang}/`, { viewport: { width: w, height: h } });
        await p.waitForTimeout(2600);
        const r = await p.evaluate(() => {
          const why = document.querySelector(".topbar__why")?.getBoundingClientRect();
          return {
            questions: document.querySelectorAll(".panel__question-text").length,
            why: !!why && why.width > 0 && why.right <= innerWidth,
            clipped: [...document.querySelectorAll(".panel__desc")].filter((d) => d.scrollHeight > d.clientHeight + 1).length,
          };
        });
        check(r.questions === data.projets.length && r.why, `${L} ${w} px : questions sur les panneaux et lien « ${lang ? data.lien_page.en : data.lien_page.fr} » visibles`);
        // Sur grand écran, la description ne se déplie qu'au survol : elle n'est contrôlée qu'en disposition mobile.
        if (w <= 820) check(!(await overflowX(p)) && r.clipped === 0, `${L} ${w} px : ni débordement, ni description rognée`);
        else check(!(await overflowX(p)), `${L} ${w} px : pas de débordement horizontal`);
        check(p.errors.length === 0, `${L} ${w} px : aucune erreur dans la console`, p.errors.join(" | "));
        await p.context().close();
      }
      for (const project of data.projets) {
        const p = await page(`${lang}/projets/${project.id}`, { viewport: { width: 390, height: 844 } });
        const r = await p.evaluate(() => ({
          block: !!document.querySelector(".pj-why .pj-why__question"),
          link: document.querySelector(".pj-why__more")?.getAttribute("href"),
        }));
        check(r.block && r.link === `${lang}/fil-rouge` && !(await overflowX(p)) && p.errors.length === 0, `${L} ${project.id} : bloc « Pourquoi ce projet », lien vers ${lang}/fil-rouge, sans débordement ni erreur`, p.errors.join(" | "));
        await p.context().close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

console.log(`\n${passes} contrôle(s) réussi(s), ${failures} échec(s).`);
process.exit(failures ? 1 : 0);
