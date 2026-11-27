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
 *    /fil-rouge, vue partagée (onglets, clavier, filtre), schémas, fil rouge au défilement, matrice UE × projets,
 *    filets de section, accordéon mobile, sans JavaScript, « réduire les animations », colophon, débordements,
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
            scripts: [...document.scripts].map((s) => (s.getAttribute("src") || "inline").split("/").pop()),
            reveal: document.querySelectorAll("[data-reveal], [data-split], .fr-autoplay").length,
            chain: document.querySelectorAll(".fr-chain__step").length,
            asterisk: /\*/.test(document.querySelector("main").innerText),
            colophon: document.querySelector(".fr-refs").innerText,
          };
        });
        check(r.fontsOk && /Newsreader/.test(r.h1Font) && /Source Sans 3/.test(r.bodyFont), `${L} : Newsreader et Source Sans 3 seulement (ni Cormorant, ni Inter, ni JetBrains Mono)`, `${r.h1Font} / ${r.bodyFont}`);
        check(r.bg === "rgb(246, 247, 249)" && r.shadows === 0 && r.gradients === 0, `${L} : fond #F6F7F9, aucune ombre, aucun dégradé`, `${r.bg}, ${r.shadows} ombre(s), ${r.gradients} dégradé(s)`);
        check(r.h1Em === 1 && r.h2Em <= 1 && !r.asterisk, `${L} : un seul mot en italique par grand titre`);
        check(r.scripts.join(",") === "lang.js,fil-rouge.js" && r.reveal === 0 && r.chain === 3, `${L} : scripts lang.js et fil-rouge.js seulement, aucun défilement automatique, chaîne en 3 étapes`, r.scripts.join(", "));
        check(!/IFRS|AMF/.test(r.colophon), `${L} : colophon sans IFRS ni AMF`);

        // Vue partagée (1440 px)
        const state = () =>
          p.evaluate(() => {
            const visible = [...document.querySelectorAll(".fr-fiche")].filter((f) => !f.hidden && f.getBoundingClientRect().height > 0);
            const selected = [...document.querySelectorAll('[role="tab"][aria-selected="true"]')];
            return {
              visible: visible.map((f) => f.id.replace("fiche-", "")),
              selected: selected.map((t) => t.getAttribute("data-project")),
              focused: document.activeElement?.getAttribute("data-project") ?? null,
              tabsShown: [...document.querySelectorAll('[role="tab"]')].filter((t) => !t.hidden).length,
            };
          });
        const ids = data.questions.ordre;
        const layout = await p.evaluate(() => {
          const d = document.querySelector("[data-dossier]");
          const nav = d.querySelector(".fr-dossier__nav").getBoundingClientRect();
          const panel = d.querySelector(".fr-fiches__list");
          const active = d.querySelector('[role="tab"][aria-selected="true"]');
          const fiche = d.querySelector(".fr-fiche:not([hidden])");
          return {
            split: d.classList.contains("is-split"),
            ratio: nav.width / d.getBoundingClientRect().width,
            sticky: getComputedStyle(panel).position,
            border: getComputedStyle(active).borderLeftColor,
            activeBg: getComputedStyle(active).backgroundColor,
            blueprint: Math.round(fiche.querySelector(".fr-blueprint").getBoundingClientRect().height),
            tabpanel: fiche.getAttribute("role") === "tabpanel" && fiche.getAttribute("aria-labelledby") === active.id,
          };
        });
        let s = await state();
        check(layout.split && layout.ratio > 0.36 && layout.ratio < 0.44 && layout.sticky === "sticky", `${L} : vue partagée 42 / 58 avec panneau collant`, JSON.stringify(layout));
        check(s.tabsShown === 6 && s.visible.length === 1 && s.visible[0] === ids[0] && s.selected.join() === ids[0] && layout.tabpanel, `${L} : une seule fiche affichée, liée à son onglet (aria-selected, tabpanel)`, JSON.stringify(s));
        check(layout.border === "rgb(22, 50, 79)" && layout.activeBg === "rgb(255, 255, 255)" && layout.blueprint === 240, `${L} : onglet actif sur fond blanc, filet de famille, zone de schéma de 240 px`, JSON.stringify(layout));
        await p.locator('[role="tab"]').nth(2).click();
        await p.waitForTimeout(300);
        s = await state();
        const opacity = await p.evaluate(() => getComputedStyle(document.querySelector(".fr-fiche:not([hidden])")).opacity);
        check(s.visible.join() === ids[2] && s.selected.join() === ids[2] && opacity === "1", `${L} : un clic affiche la fiche choisie (fondu terminé)`, JSON.stringify(s));
        await p.keyboard.press("ArrowDown");
        s = await state();
        const afterDown = s.selected.join() === ids[3] && s.focused === ids[3] && s.visible.join() === ids[3];
        await p.keyboard.press("End");
        const afterEnd = (await state()).selected.join() === ids[5];
        await p.keyboard.press("ArrowDown");
        const wrapped = (await state()).selected.join() === ids[0];
        await p.keyboard.press("ArrowUp");
        const up = (await state()).selected.join() === ids[5];
        check(afterDown && afterEnd && wrapped && up, `${L} : clavier (flèches haut et bas, Fin, retour au début)`);
        await p.locator('[data-filter="actualite"]').click();
        await p.waitForTimeout(300); // fin de la transition (220 ms)
        s = await state();
        const pressed = await p.locator('[data-filter="actualite"]').getAttribute("aria-pressed");
        const actualite = data.projets.filter((x) => x.famille === "actualite").map((x) => x.id);
        check(s.tabsShown === actualite.length && actualite.includes(s.selected[0]) && pressed === "true", `${L} : filtre « ${lang ? data.familles.actualite.label.en : data.familles.actualite.label.fr} » (${actualite.length} questions)`, JSON.stringify(s));
        const ochre = await p.evaluate(() => getComputedStyle(document.querySelector('[role="tab"][aria-selected="true"]')).borderLeftColor);
        check(ochre === "rgb(168, 75, 32)", `${L} : filet ocre pour un terrain d'actualité`, ochre);
        await p.locator('[data-filter="tous"]').click();
        await p.locator('.fr-family__projects a[href="#fiche-kyb-graph"]').click();
        await p.waitForTimeout(400);
        check((await state()).selected.join() === "kyb-graph", `${L} : un lien #fiche-… de la page ouvre la fiche dans le panneau`);
        // Schémas : tracé à l'affichage et infobulles au survol
        await p.locator('[role="tab"][data-project="kyb-graph"]').click();
        await p.waitForTimeout(250);
        const anim = await p.evaluate(() => {
          const bp = document.querySelector(".fr-fiche:not([hidden]) .fr-blueprint");
          const cs = getComputedStyle(bp.querySelector(".bp-draw"));
          return { inview: bp.classList.contains("is-inview"), name: cs.animationName, duration: cs.animationDuration, easing: cs.animationTimingFunction };
        });
        check(anim.inview && anim.name === "bp-draw" && anim.duration === "0.45s" && anim.easing === "cubic-bezier(0.22, 1, 0.36, 1)", `${L} : tracé progressif des schémas (450 ms, courbe demandée)`, JSON.stringify(anim));
        await p.waitForTimeout(1100);
        const visibleTip = (k) => p.evaluate((k) => getComputedStyle(document.querySelector(`.fr-fiche:not([hidden]) .bp-tip.k${k}`)).opacity, k);
        await p.locator(".fr-fiche:not([hidden]) .bp-hot.k2").hover();
        await p.waitForTimeout(350);
        const kyb = await p.evaluate(() => {
          const hot = document.querySelector(".fr-fiche:not([hidden]) .bp-hot.k2");
          return { width: getComputedStyle(hot.querySelector(".bp-l")).strokeWidth, dash: getComputedStyle(hot.querySelector(".bp-l")).strokeDasharray, tip: document.querySelector(".fr-fiche:not([hidden]) .bp-tip.k2").textContent };
        });
        check((await visibleTip(2)) === "1" && (await visibleTip(1)) === "0" && kyb.width === "2.5px" && kyb.dash === "none", `${L} : KYB Graph, le survol d'un lien l'épaissit et affiche son niveau de preuve`, JSON.stringify(kyb));
        await p.locator('[role="tab"][data-project="probant"]').click();
        await p.waitForTimeout(900);
        await p.locator(".fr-fiche:not([hidden]) .bp-hot.k1").focus();
        await p.waitForTimeout(350);
        check((await visibleTip(1)) === "1", `${L} : Probant, la règle de contrôle s'affiche au focus clavier sur l'anomalie`);

        // Fil rouge : tracé synchronisé au défilement
        const thread = () =>
          p.evaluate(() => {
            const svg = document.querySelector(".fr-thread");
            const cs = getComputedStyle(svg.querySelector(".fr-thread__line"));
            return { shown: getComputedStyle(svg).display !== "none", stroke: cs.stroke, width: cs.strokeWidth, total: parseFloat(cs.strokeDasharray), offset: parseFloat(cs.strokeDashoffset), reached: svg.querySelectorAll(".fr-thread__node.is-reached").length };
          });
        await p.evaluate(() => window.scrollTo(0, 0));
        await p.waitForTimeout(250);
        const t0 = await thread();
        await p.evaluate(() => window.scrollTo(0, 900));
        await p.waitForTimeout(250);
        const t1 = await thread();
        check(t0.shown && t0.stroke === "rgb(168, 75, 32)" && t0.width === "1.5px" && t0.offset > 0 && t0.offset < t0.total && Math.round(t0.offset - t1.offset) === 900, `${L} : fil rouge ocre de 1,5 px, dessiné au rythme exact du défilement`, JSON.stringify({ t0, t1 }));

        // Filets de section : tracés une fois, à l'entrée à l'écran
        const rule = (sel) => p.evaluate((sel) => getComputedStyle(document.querySelector(sel), "::before").transform, sel);
        const ruleBefore = await rule(".fr-colophon");
        await p.locator(".fr-colophon").scrollIntoViewIfNeeded();
        await p.waitForTimeout(700);
        const ruleDuration = await p.evaluate(() => getComputedStyle(document.querySelector(".fr-colophon"), "::before").transitionDuration);
        check(/^matrix\(0,/.test(ruleBefore) && (await rule(".fr-colophon")) === "matrix(1, 0, 0, 1, 0, 0)" && ruleDuration === "0.35s", `${L} : filets de section tracés en 350 ms à l'entrée à l'écran`, `${ruleBefore} → ${await rule(".fr-colophon")} (${ruleDuration})`);

        // Matrice UE × projets
        const mx = () =>
          p.evaluate(() => {
            const m = document.querySelector("[data-matrix]");
            const dim = [...m.querySelectorAll(".is-dim")];
            return {
              rows: m.querySelectorAll("tbody tr").length,
              cols: m.querySelectorAll("thead [data-col]").length,
              marks: m.querySelectorAll(".fr-mx__cell").length,
              dim: dim.length,
              dimOpacity: dim[0] ? getComputedStyle(dim[0]).opacity : null,
              proofs: [...m.querySelectorAll(".fr-mx__proof")].filter((li) => !li.hidden).map((li) => li.id.replace("mx-", "")),
              hint: !m.querySelector(".fr-mx__hint").hidden,
              clipped: [...m.querySelectorAll("th a, th button, .fr-mx__proof span")].filter((e) => e.scrollWidth > e.clientWidth + 1).length,
            };
          });
        await p.locator(".fr-matrix").scrollIntoViewIfNeeded();
        await p.mouse.move(2, 2);
        let m = await mx();
        const marks = data.matrice.poles.reduce((n, pole) => n + Object.keys(pole.cellules).length, 0);
        check(m.rows === 6 && m.cols === 6 && m.marks === marks && m.dim === 0 && m.proofs.length === 0 && m.hint && m.clipped === 0, `${L} : matrice 6 × 6, ${marks} marqueurs, aucun texte coupé`, JSON.stringify(m));
        const firstPole = data.matrice.poles[0];
        await p.locator(".fr-mx__pole").first().hover();
        await p.waitForTimeout(350);
        m = await mx();
        check(m.dimOpacity === "0.35" && m.proofs.length === Object.keys(firstPole.cellules).length && m.proofs.every((id) => id.startsWith(firstPole.id)) && !m.hint, `${L} : survol d'une ligne, le reste s'estompe à 0,35 et ses preuves s'affichent`, JSON.stringify(m));
        await p.locator('thead [data-col="carbon-co"] a').focus();
        m = await mx();
        check(m.proofs.length === 3 && m.proofs.every((id) => id.endsWith("carbon-co")), `${L} : focus sur une colonne, les preuves du projet s'affichent`, JSON.stringify(m.proofs));
        await p.locator('td[data-row="droit"][data-col="kyb-graph"] .fr-mx__cell').focus();
        m = await mx();
        check(m.proofs.join() === "droit-kyb-graph", `${L} : focus sur un marqueur, la preuve du croisement s'affiche`, JSON.stringify(m.proofs));
        await p.locator('thead [data-col="panoplie"] a').click();
        await p.waitForTimeout(900);
        const opened = await p.evaluate(() => ({ selected: document.querySelector('[role="tab"][aria-selected="true"]').dataset.project, top: Math.round(document.querySelector("[data-dossier]").getBoundingClientRect().top) }));
        check(opened.selected === "panoplie" && opened.top >= -4 && opened.top < 300, `${L} : un clic sur un projet de la matrice ouvre sa fiche dans la vue partagée`, JSON.stringify(opened));
        await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await p.waitForTimeout(350);
        const t2 = await thread();
        check(t2.offset === 0 && t2.reached === 2, `${L} : en bas de page, le fil est entièrement tracé jusqu'au colophon`, JSON.stringify(t2));
        check(!(await overflowX(p)), `${L} : pas de débordement horizontal (1440 px)`);
        check(p.errors.length === 0, `${L} : aucune erreur dans la console`, p.errors.join(" | "));
        await p.context().close();
      }
      {
        // Accordéon (375 px)
        const p = await page(`${lang}/fil-rouge`, { viewport: { width: 375, height: 812 } });
        await p.waitForTimeout(800);
        const acc = () =>
          p.evaluate(() => ({
            accordion: document.querySelector("[data-dossier]").classList.contains("is-accordion"),
            nav: !document.querySelector(".fr-dossier__nav").hidden,
            open: [...document.querySelectorAll(".fr-fiche__toggle")].map((b) => b.getAttribute("aria-expanded") === "true"),
            bodies: [...document.querySelectorAll(".fr-fiche__body")].map((b) => !b.hidden && b.getBoundingClientRect().height > 0),
            blueprint2: Math.round(document.querySelectorAll(".fr-blueprint")[1].getBoundingClientRect().height),
          }));
        let a = await acc();
        check(a.accordion && !a.nav && a.open.filter(Boolean).length === 1 && a.open[0] && a.bodies[0] && !a.bodies[1], `${L} 375 px : accordéon, première fiche ouverte`, JSON.stringify(a));
        await p.locator(".fr-fiche__toggle").nth(1).click();
        a = await acc();
        check(a.open[1] && a.bodies[1] && a.blueprint2 === 240, `${L} 375 px : un clic ouvre la fiche et sa zone de schéma`, JSON.stringify(a));
        await p.locator(".fr-fiche__toggle").nth(1).click();
        check(!(await acc()).open[1], `${L} 375 px : un second clic la referme`);
        const threadMobile = await p.evaluate(() => getComputedStyle(document.querySelector(".fr-thread")).display);
        check(threadMobile === "none", `${L} 375 px : le fil rouge est masqué`, threadMobile);
        check(!(await overflowX(p)) && p.errors.length === 0, `${L} 375 px : ni débordement, ni erreur`, p.errors.join(" | "));
        await p.context().close();
      }
      {
        // Sans JavaScript : les six fiches ouvertes, pas de navigation
        const p = await page(`${lang}/fil-rouge`, { javaScriptEnabled: false });
        const r = await p.evaluate(() => ({
          nav: document.querySelector(".fr-dossier__nav").getBoundingClientRect().height,
          fiches: [...document.querySelectorAll(".fr-fiche")].filter((f) => f.getBoundingClientRect().height > 100).length,
        }));
        check(r.nav === 0 && r.fiches === data.projets.length, `${L} : sans JavaScript, les ${data.projets.length} fiches sont ouvertes`, JSON.stringify(r));
        const plain = await p.evaluate(() => ({
          proofs: [...document.querySelectorAll(".fr-mx__proof")].filter((li) => li.getBoundingClientRect().height > 0).length,
          hint: document.querySelector(".fr-mx__hint").getBoundingClientRect().height,
          rule: getComputedStyle(document.querySelector(".fr-colophon"), "::before").transform,
          thread: getComputedStyle(document.querySelector(".fr-thread")).display,
        }));
        check(plain.proofs === 12 && plain.hint === 0 && plain.rule === "none" && plain.thread === "none", `${L} : sans JavaScript, les preuves de la matrice sont toutes listées et les filets visibles`, JSON.stringify(plain));
        await p.evaluate(() => document.fonts.ready);
        const bp = await p.evaluate(() => {
          const PALETTE = ["rgb(203, 213, 225)", "rgb(17, 20, 24)", "rgb(74, 85, 104)", "rgb(22, 50, 79)", "rgb(168, 75, 32)", "rgb(255, 255, 255)", "rgb(246, 247, 249)", "none"];
          const issues = [];
          const svgs = [...document.querySelectorAll(".fr-blueprint svg")];
          for (const svg of svgs) {
            const id = svg.parentElement.dataset.blueprint;
            if (svg.getAttribute("viewBox") !== "0 0 520 220") issues.push(`${id} : viewBox`);
            if (svg.querySelector("linearGradient, radialGradient, filter, image")) issues.push(`${id} : dégradé, filtre ou image`);
            if (!/Source Sans 3/.test(getComputedStyle(svg).fontFamily) || getComputedStyle(svg).fontVariantNumeric !== "tabular-nums") issues.push(`${id} : police`);
            for (const el of svg.querySelectorAll("line, path, rect, circle, text")) {
              const cs = getComputedStyle(el);
              if (!PALETTE.includes(cs.stroke) || !PALETTE.includes(cs.fill)) issues.push(`${id} : couleur hors palette (${cs.stroke} / ${cs.fill})`);
              if (el.classList.contains("bp-l") && !el.classList.contains("bp-band") && cs.strokeWidth !== "1.25px") issues.push(`${id} : trait de ${cs.strokeWidth}`);
            }
            const texts = [...svg.querySelectorAll("text")].map((t) => ({ b: t.getBBox(), tip: !!t.closest(".bp-tip"), s: t.textContent }));
            for (const { b, s } of texts) if (b.x < 4 || b.y < 2 || b.x + b.width > 516 || b.y + b.height > 218) issues.push(`${id} : texte hors cadre « ${s} »`);
            for (const g of svg.querySelectorAll(".bp-box")) {
              const r = g.querySelector("rect").getBBox();
              const t = g.querySelector("text").getBBox();
              if (t.x < r.x + 4 || t.x + t.width > r.x + r.width - 4) issues.push(`${id} : « ${g.textContent} » déborde de sa boîte`);
            }
            for (const g of svg.querySelectorAll(".bp-tip")) {
              const r = g.querySelector("rect").getBBox();
              if (r.x < 4 || r.x + r.width > 516 || r.y < 2 || r.y + r.height > 218) issues.push(`${id} : infobulle hors cadre`);
              for (const t of g.querySelectorAll("text")) if (t.getBBox().x + t.getBBox().width > r.x + r.width - 5) issues.push(`${id} : « ${t.textContent} » déborde de son infobulle`);
            }
            const fixed = texts.filter((x) => !x.tip);
            for (let i = 0; i < fixed.length; i += 1) {
              for (let j = i + 1; j < fixed.length; j += 1) {
                const a = fixed[i].b;
                const c = fixed[j].b;
                // 2 px de tolérance : les boîtes de texte incluent l'interligne.
                if (a.x < c.x + c.width && c.x < a.x + a.width && a.y + 2 < c.y + c.height - 2 && c.y + 2 < a.y + a.height - 2) issues.push(`${id} : « ${fixed[i].s} » chevauche « ${fixed[j].s} »`);
              }
            }
          }
          return { count: svgs.length, issues};
        });
        check(bp.count === data.projets.length && bp.issues.length === 0, `${L} : ${data.projets.length} schémas SVG sans débordement de texte, palette et traits conformes`, bp.issues.slice(0, 4).join(" ; "));
        await p.context().close();
      }
      {
        // « Réduire les animations » : pas de fondu
        const p = await page(`${lang}/fil-rouge`, { reducedMotion: "reduce" });
        await p.waitForTimeout(500);
        await p.locator('[role="tab"]').nth(1).click();
        const r = await p.evaluate(() => {
          const f = document.querySelector(".fr-fiche:not([hidden])");
          return { duration: getComputedStyle(f).transitionDuration, opacity: getComputedStyle(f).opacity };
        });
        const draw = await p.evaluate(() => {
          const cs = getComputedStyle(document.querySelector(".fr-fiche:not([hidden]) .bp-draw"));
          return { name: cs.animationName, dash: cs.strokeDasharray };
        });
        check(/^0s/.test(r.duration) && r.opacity === "1" && draw.name === "none" && draw.dash === "none", `${L} : « réduire les animations » coupe le fondu et le tracé des schémas`, JSON.stringify({ ...r, ...draw }));
        await p.evaluate(() => window.scrollTo(0, 0));
        await p.waitForTimeout(250);
        const still = await p.evaluate(() => ({
          offset: parseFloat(getComputedStyle(document.querySelector(".fr-thread__line")).strokeDashoffset),
          reached: document.querySelectorAll(".fr-thread__node.is-reached").length,
          rule: getComputedStyle(document.querySelector(".fr-colophon"), "::before").transform,
          nodeDuration: getComputedStyle(document.querySelector(".fr-thread__node")).transitionDuration,
        }));
        check(still.offset === 0 && still.reached === 2 && still.rule === "none" && /^0s/.test(still.nodeDuration), `${L} : « réduire les animations » affiche fil et filets dans leur état final`, JSON.stringify(still));
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
