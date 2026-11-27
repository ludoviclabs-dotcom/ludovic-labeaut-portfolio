/**
 * Schémas techniques des six projets (« ProjectBlueprint »), dessinés en SVG pour /fil-rouge.
 *
 *   const blueprints = await createBlueprints({ data, root });
 *   blueprints.render("probant")  → lignes HTML du bloc <div class="fr-blueprint" data-blueprint="probant">
 *   blueprints.pairs              → paires [segment français, anglais] à ajouter à i18n/en/fil-rouge.json
 *
 * Un schéma = une fonction (probant, finvalstudio, carbonCo, kybGraph, panoplie, publications),
 * construite avec les mêmes briques : trait, tracé, boîte, texte, zone sensible, infobulle.
 * Règles communes : viewBox 0 0 520 220, traits de 1,25, palette de la page (structure #CBD5E1,
 * encre, ardoise, bleu de Prusse, ocre pour le point d'attention), Source Sans 3 en chiffres
 * tabulaires, ni dégradé ni ombre. Le style et l'animation de tracé sont dans fil-rouge.css.
 *
 * Les libellés viennent de public/data/fil-rouge.json (clé « schemas », français et anglais).
 * Le schéma Publications est calculé à partir de public/publications/index.html : dates réelles
 * des notes et des dossiers, titres de blocs déjà traduits dans i18n/en/.
 * Les textes passent par build-en comme le reste de la page : chaque <text> est un segment.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

export const VIEW = { w: 520, h: 220 };

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const normalize = (s) => s.replace(/\s+/g, " ").trim();
const r1 = (v) => Math.round(v * 10) / 10;
/** Libellé { fr, en } ; une chaîne seule vaut pour les deux langues. */
const both = (label) => (typeof label === "string" ? { fr: label, en: label } : label);

/* ---------- Briques de dessin ---------- */

/** Fabrique les briques d'un schéma ; `pairs` reçoit les textes à traduire. */
function toolkit(pairs) {
  const text = (label) => {
    const l = both(label);
    if (/\p{L}/u.test(l.fr)) pairs.push([normalize(esc(l.fr)), esc(l.en)]);
    return esc(l.fr);
  };
  const attr = (label) => {
    const l = both(label);
    pairs.push([normalize(l.fr), l.en]);
    return escAttr(l.fr);
  };
  /** Classe de trait : tone s (structure), a (ardoise), p (Prusse), o (ocre) ; stage = rang d'apparition. */
  const stroke = ({ tone = "s", stage = 0, draw = true, cls = "" } = {}) =>
    `class="bp-l bp-l--${tone}${draw ? " bp-draw" : ""}${cls ? ` ${cls}` : ""}"${draw ? ` pathLength="1" style="--s: ${stage}"` : ""}`;

  const t = {
    line: (x1, y1, x2, y2, o) => `<line ${stroke(o)} x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`,
    path: (d, o) => `<path ${stroke(o)} d="${d}"/>`,
    /** Pointe de flèche ouverte, vers la droite (dir 1) ou la gauche (dir -1). */
    arrow: (x, y, o, dir = 1) => t.path(`M${r1(x - 5 * dir)} ${r1(y - 3.5)}L${r1(x)} ${r1(y)}L${r1(x - 5 * dir)} ${r1(y + 3.5)}`, o),
    rect: (x, y, w, h, o) => `<rect ${stroke({ ...o, cls: "bp-fill" })} x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"/>`,
    circle: (cx, cy, r, o) => `<circle ${stroke({ ...o, cls: "bp-fill" })} cx="${r1(cx)}" cy="${r1(cy)}" r="${r}"/>`,
    /** Forme pleine (point, jalon) : tone p ou o. */
    dot: (cx, cy, r, { tone = "p", stage = 0 } = {}) => `<circle class="bp-dot bp-dot--${tone} bp-in" style="--s: ${stage}" cx="${r1(cx)}" cy="${r1(cy)}" r="${r}"/>`,
    square: (x, y, size, { tone = "o", stage = 0 } = {}) => `<rect class="bp-dot bp-dot--${tone} bp-in" style="--s: ${stage}" x="${r1(x)}" y="${r1(y)}" width="${size}" height="${size}"/>`,
    /** Texte : cls bp-t (libellé), bp-m (secondaire), bp-k (intertitre) ; anchor start, middle ou end. */
    text: (x, y, label, { cls = "bp-t", anchor = "start", stage = 0 } = {}) =>
      `<text class="${cls} bp-in" style="--s: ${stage}" x="${r1(x)}" y="${r1(y)}"${anchor === "start" ? "" : ` text-anchor="${anchor}"`}>${text(label)}</text>`,
    /** Boîte étiquetée : le texte doit tenir dans le rectangle (contrôlé par npm test). */
    box: (x, y, w, h, label, { tone = "s", stage = 0 } = {}) =>
      `<g class="bp-box">${t.rect(x, y, w, h, { tone, stage })}${t.text(x + w / 2, y + h / 2 + 4, label, { anchor: "middle", stage })}</g>`,
    /** Zone sensible (survol, focus clavier) ; son infobulle porte le même rang k. */
    hot: (k, label, parts) => `<g class="bp-hot k${k}" tabindex="0" role="img" aria-label="${attr(label)}">${parts.join("")}</g>`,
    /** Surface invisible qui élargit la zone sensible. */
    hit: (x, y, w, h) => `<rect class="bp-hit" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"/>`,
    /** Infobulle : une ligne de texte par libellé. */
    tip: (k, x, y, w, labels) =>
      `<g class="bp-tip k${k}" aria-hidden="true"><rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${8 + 14 * labels.length}"/>` +
      labels.map((l, i) => `<text class="bp-m" x="${r1(x + 8)}" y="${r1(y + 15 + 14 * i)}">${text(l)}</text>`).join("") +
      `</g>`,
    tips: (list) => `<g class="bp-tips">${list.join("")}</g>`,
    attr,
  };
  return t;
}

/* ---------- 1. Probant : FEC → trois contrôles parallèles → dossier de preuve ---------- */

function probant(t, L) {
  return [
    t.text(56, 16, L.entree, { cls: "bp-k", anchor: "middle" }),
    t.text(236, 16, L.controles, { cls: "bp-k", anchor: "middle", stage: 2 }),
    t.text(449, 16, L.sortie, { cls: "bp-k", anchor: "middle", stage: 4 }),
    t.path("M100 110H138V43H176", { stage: 1 }),
    t.path("M138 110H176", { stage: 1 }),
    t.path("M138 110V177H176", { stage: 1 }),
    t.path("M296 43H368V110H390", { stage: 3 }),
    t.path("M296 110H368", { stage: 3 }),
    t.path("M296 177H368V110", { stage: 3 }),
    t.arrow(176, 43, { stage: 1 }),
    t.arrow(176, 110, { stage: 1 }),
    t.arrow(176, 177, { stage: 1 }),
    t.arrow(390, 110, { stage: 3 }),
    t.box(12, 92, 88, 36, L.fec),
    t.box(176, 28, 120, 30, L.c1, { stage: 2 }),
    t.box(176, 95, 120, 30, L.c2, { stage: 2 }),
    t.box(176, 162, 120, 30, L.c3, { stage: 2 }),
    t.box(390, 92, 118, 36, L.dossier, { tone: "p", stage: 4 }),
    t.text(332, 100, L.anomalie, { cls: "bp-m bp-o", anchor: "middle", stage: 3 }),
    t.hot(1, L.regle_aria, [t.hit(320, 98, 24, 24), t.circle(332, 110, 6.5, { tone: "o", stage: 3 }), t.dot(332, 110, 3, { tone: "o", stage: 3 })]),
    t.tips([t.tip(1, 176, 125.5, 270, L.regle)]),
  ];
}

/* ---------- 2. FinValStudio : football field et distribution Monte Carlo ---------- */

function finvalstudio(t, L) {
  /** Repère vertical (P10, médiane, P90) : son seuil s'affiche au survol. */
  const marker = (k, x, label, tipLabel, tone) =>
    t.hot(k, tipLabel, [t.hit(x - 9, 22, 18, 178), t.line(x, 22, x, 198, { tone, stage: 3 }), t.text(x, 15, label, { cls: "bp-m", anchor: "middle", stage: 3 })]);
  return [
    t.text(12, 64, L.mc1),
    t.text(12, 82, L.mc2, { cls: "bp-m" }),
    t.text(12, 129, L.dispersion, { cls: "bp-m bp-o", stage: 3 }),
    t.text(12, 153, L.dcf, { stage: 2 }),
    t.text(12, 183, L.multiples, { stage: 2 }),
    t.line(128, 118, 508, 118),
    t.line(128, 198, 508, 198),
    t.path("M128 118C196 118 236 30 300 30C362 30 420 118 508 118", { tone: "a", stage: 1 }),
    t.rect(206, 142, 196, 13, { tone: "p", stage: 2 }),
    t.rect(176, 172, 176, 13, { tone: "p", stage: 2 }),
    t.path("M228 121V127H404V121", { tone: "o", stage: 3 }),
    t.text(508, 213, L.axe, { cls: "bp-m", anchor: "end", stage: 2 }),
    marker(1, 228, L.p10, L.tip_p10, "a"),
    marker(2, 306, L.mediane, L.tip_mediane, "p"),
    marker(3, 404, L.p90, L.tip_p90, "a"),
    t.tips([t.tip(1, 236, 36, 214, [L.tip_p10]), t.tip(2, 202, 36, 214, [L.tip_mediane]), t.tip(3, 182, 36, 214, [L.tip_p90])]),
  ];
}

/* ---------- 3. Carbon&Co : trois scopes vers les référentiels, avec piste d'audit ---------- */

function carbonCo(t, L) {
  return [
    t.text(12, 54, L.s1),
    t.text(12, 114, L.s2),
    t.text(12, 174, L.s3),
    t.path("M74 50C190 50 214 110 300 110", { stage: 1, cls: "bp-band" }),
    t.path("M74 110H300", { stage: 1, cls: "bp-band" }),
    t.path("M74 170C190 170 214 110 300 110", { stage: 1, cls: "bp-band" }),
    t.path("M300 110C350 110 352 73 396 73", { tone: "p", stage: 3 }),
    t.path("M300 110C350 110 352 147 396 147", { tone: "p", stage: 3 }),
    t.line(300, 116, 300, 178, { tone: "o", stage: 3 }),
    t.circle(300, 110, 5.5, { tone: "p", stage: 2 }),
    t.text(300, 94, L.total, { cls: "bp-m", anchor: "middle", stage: 2 }),
    t.box(396, 58, 112, 30, L.e1, { tone: "p", stage: 4 }),
    t.box(396, 132, 112, 30, L.vsme, { tone: "p", stage: 4 }),
    t.box(244, 178, 112, 28, L.audit, { tone: "o", stage: 4 }),
  ];
}

/* ---------- 4. KYB Graph : cinq nœuds, quatre liens et leur niveau de preuve ---------- */

function kybGraph(t, L) {
  const S = [86, 112];
  const H = [250, 112];
  const U = [414, 112];
  const J = [250, 40];
  const X = [414, 184];
  const aria = (a, b, level) => ({ fr: `${both(a).fr} → ${both(b).fr} : ${level.fr}`, en: `${both(a).en} → ${both(b).en}: ${level.en}` });
  const node = ([x, y]) => t.circle(x, y, 7, { tone: "a" });
  return [
    t.hot(1, aria(L.societe, L.holding, L.confirme), [t.hit(93, 102, 150, 20), t.line(93, 112, 243, 112, { tone: "p", stage: 1 }), t.arrow(243, 112, { tone: "p", stage: 1 })]),
    t.hot(2, aria(L.holding, L.ubo, L.declare), [t.hit(257, 102, 150, 20), t.line(257, 112, 407, 112, { tone: "o", stage: 2 }), t.arrow(407, 112, { tone: "o", stage: 2 })]),
    t.hot(3, aria(L.holding, L.juridiction, L.confirme), [t.hit(240, 47, 20, 58), t.line(250, 105, 250, 47, { tone: "p", stage: 2 })]),
    t.hot(4, aria(L.ubo, L.sanctions, L.confirme), [t.hit(404, 119, 20, 58), t.line(414, 119, 414, 177, { tone: "p", stage: 3 })]),
    node(S),
    node(H),
    node(U),
    node(J),
    node(X),
    t.text(S[0], 136, L.societe, { anchor: "middle" }),
    t.text(H[0], 136, L.holding, { anchor: "middle" }),
    t.text(428, 116, L.ubo),
    t.text(264, 44, L.juridiction),
    t.text(428, 188, L.sanctions),
    t.line(14, 204, 34, 204, { tone: "p", draw: false }),
    t.text(40, 208, L.officiel, { cls: "bp-m" }),
    t.line(150, 204, 170, 204, { tone: "o", draw: false }),
    t.text(176, 208, L.declaratif, { cls: "bp-m" }),
    t.tips([
      t.tip(1, 82, 76, 176, [L.confirme]),
      t.tip(2, 254, 76, 156, [L.declare]),
      t.tip(3, 262, 62, 176, [L.confirme]),
      t.tip(4, 230, 152, 176, [L.confirme]),
    ]),
  ];
}

/* ---------- 5. Panoplie : décomposition du coût complet d'un programme ---------- */

function panoplie(t, L) {
  const x0 = 14;
  const x1 = 506;
  const total = L.parts.reduce((a, b) => a + b, 0);
  if (L.parts.length !== 4 || total !== 100) throw new Error("schemas.panoplie.parts : quatre parts dont la somme vaut 100.");
  const X = (pct) => x0 + ((x1 - x0) * pct) / 100;
  const labels = [L.rd, L.acquisition, L.mco];
  const out = [
    t.text((x0 + x1) / 2, 50, L.total, { anchor: "middle" }),
    t.line(x0, 62, x1, 62),
    t.line(x0, 56, x0, 68),
    t.line(x1, 56, x1, 68),
  ];
  let from = 0;
  L.parts.forEach((part, i) => {
    const critical = i === 3;
    const x = X(from);
    const w = X(from + part) - x;
    out.push(t.rect(x, 88, w, 34, { tone: critical ? "o" : "a", stage: 1 + i }));
    if (!critical) out.push(t.text(x + w / 2, 109, labels[i], { anchor: "middle", stage: 1 + i }));
    else {
      out.push(t.path(`M${r1(x + w / 2)} 122V150`, { tone: "o", stage: 4 }));
      out.push(t.text(x1, 165, L.critiques, { cls: "bp-t bp-o", anchor: "end", stage: 4 }));
    }
    from += part;
  });
  for (const pct of [0, 25, 50, 75, 100]) {
    out.push(t.line(X(pct), 122, X(pct), 129, { stage: 2 }));
    if (pct < 100) out.push(t.text(X(pct), 142, `${pct} %`, { cls: "bp-m", anchor: pct === 0 ? "start" : "middle", stage: 2 }));
  }
  out.push(t.text(x0, 207, L.note_montant, { cls: "bp-m", stage: 4 }));
  out.push(t.text(x1, 207, L.note_proportions, { cls: "bp-m", anchor: "end", stage: 4 }));
  return out;
}

/* ---------- 6. Publications : jalons datés des notes et des dossiers, par bloc ---------- */

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_FR = new RegExp(`(\\d{1,2})(?:er)? (${MONTHS_FR.join("|")}) (\\d{4})`);
const DAY = 86400000;

/** Date française (« 26 septembre 2026 ») → { d, m, y, time }. */
function parseDate(text, where) {
  const m = DATE_FR.exec(text);
  if (!m) throw new Error(`Schéma Publications : date introuvable (${where}).`);
  const d = Number(m[1]);
  const month = MONTHS_FR.indexOf(m[2]);
  const y = Number(m[3]);
  return { d, m: month, y, time: Date.UTC(y, month, d) };
}

/**
 * Lit la page des publications : pour chaque bloc, son titre, ses notes (numéro, date) et ses dossiers (date).
 * @returns {Promise<{ title: string, titleEn: string, notes: { num: string, date: ReturnType<typeof parseDate> }[], dossiers: ReturnType<typeof parseDate>[] }[]>}
 */
export async function readPublications(root) {
  const html = await readFile(path.join(root, "public", "publications", "index.html"), "utf8");
  // Traductions de la page des publications, puis traductions communes (comme build-en).
  const readJson = async (...parts) => JSON.parse(await readFile(path.join(root, "i18n", "en", ...parts), "utf8"));
  const en = { ...(await readJson("_common.json")), ...(await readJson("publications", "index.json")) };
  const blocs = html.split('<section class="bloc"').slice(1);
  if (blocs.length === 0) throw new Error("Schéma Publications : aucun bloc dans public/publications/index.html.");
  return blocs.map((bloc) => {
    const title = /class="bloc__title">([\s\S]*?)<\/h2>/.exec(bloc)?.[1].trim();
    if (!title) throw new Error("Schéma Publications : bloc sans titre.");
    const titleEn = en[normalize(title)];
    if (!titleEn) throw new Error(`Schéma Publications : « ${title} » n'a pas de traduction dans i18n/en/ (publications/index.json ou _common.json).`);
    const notes = [...bloc.matchAll(/class="note__num">(\d+)<\/span>[\s\S]*?class="note__meta">([^<]*)/g)].map((m) => ({ num: m[1], date: parseDate(m[2], `note ${m[1]}`) }));
    const dossiers = [...bloc.matchAll(/class="dossier__meta">([^<]*)/g)].map((m) => parseDate(m[1], `dossier du bloc ${title}`));
    return { title, titleEn, notes, dossiers };
  });
}

function publications(t, L, blocs) {
  const rows = blocs.filter((b) => b.notes.length + b.dossiers.length > 0);
  const dates = rows.flatMap((b) => [...b.notes.map((n) => n.date), ...b.dossiers]);
  // Dix jours de marge à gauche : le premier mois a la place de porter son année.
  const start = Math.min(...dates.map((d) => d.time)) - 10 * DAY;
  const end = Math.max(...dates.map((d) => d.time)) + 8 * DAY;
  const x0 = 176;
  const x1 = 500;
  const X = (time) => x0 + ((x1 - x0) * (time - start)) / (end - start);
  const top = 30;
  const rowH = Math.min(19, 152 / rows.length);
  const bottom = top + rowH * rows.length;
  const short = (d) => `${String(d.d).padStart(2, "0")}/${String(d.m + 1).padStart(2, "0")}`;
  const long = (d) => ({ fr: `${d.d === 1 ? "1er" : d.d} ${MONTHS_FR[d.m]} ${d.y}`, en: `${d.d} ${MONTHS_EN[d.m]} ${d.y}` });

  const out = [];
  // Grille : un filet par ligne, un filet vertical par mois.
  for (let i = 0; i <= rows.length; i += 1) out.push(t.line(12, top + rowH * i, 508, top + rowH * i, { stage: Math.min(i, 4) }));
  const first = new Date(start);
  for (let y = first.getUTCFullYear(), m = first.getUTCMonth(), i = 0; Date.UTC(y, m, 1) < end; m += 1, i += 1) {
    if (m > 11) {
      m = 0;
      y += 1;
    }
    const monthStart = Date.UTC(y, m, 1);
    const x = Math.max(X(monthStart), x0);
    if (monthStart > start) out.push(t.line(x, top - 12, x, bottom, { stage: 1 }));
    out.push(t.text(x + 4, top - 8, i === 0 ? { fr: `${SHORT_FR[m]} ${y}`, en: `${SHORT_EN[m]} ${y}` } : { fr: SHORT_FR[m], en: SHORT_EN[m] }, { cls: "bp-k", stage: 1 }));
  }

  const hots = [];
  const tips = [];
  rows.forEach((bloc, i) => {
    const y = top + rowH * i + rowH / 2;
    const stage = Math.min(1 + i, 4);
    out.push(t.text(12, y + 4, { fr: bloc.title.replace(/&amp;/g, "&"), en: bloc.titleEn.replace(/&amp;/g, "&") }, { cls: "bp-m", stage }));
    // Jalons du bloc, regroupés par date.
    const groups = new Map();
    for (const note of bloc.notes) groups.set(note.date.time, { date: note.date, notes: [...(groups.get(note.date.time)?.notes ?? []), note.num], dossier: false });
    for (const date of bloc.dossiers) groups.set(-date.time, { date, notes: [], dossier: true });
    for (const group of groups.values()) {
      const k = hots.length + 1;
      const x = X(group.date.time);
      const parts = [];
      let width;
      if (group.dossier) {
        parts.push(t.square(x - 4, y - 4, 8, { tone: "o", stage }));
        width = 8;
      } else {
        group.notes.forEach((_, j) => parts.push(t.dot(x + 7 * j, y, 2.6, { tone: "p", stage })));
        width = 7 * (group.notes.length - 1) + 4;
      }
      parts.push(t.text(x + width + 5, y + 4, short(group.date), { cls: "bp-m", stage }));
      const nums = group.notes.slice().sort();
      const range = nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : nums[0];
      const d = long(group.date);
      const label = group.dossier
        ? { fr: `${both(L.dossier).fr} · ${d.fr}`, en: `${both(L.dossier).en} · ${d.en}` }
        : { fr: `${both(nums.length > 1 ? L.notes : L.note).fr} ${range} · ${d.fr}`, en: `${both(nums.length > 1 ? L.notes : L.note).en} ${range} · ${d.en}` };
      hots.push(t.hot(k, label, [t.hit(x - 6, y - rowH / 2 + 1, width + 44, rowH - 2), ...parts]));
      const tipW = 190;
      const tipX = Math.min(Math.max(x - 20, 8), VIEW.w - 8 - tipW);
      tips.push(t.tip(k, tipX, i === 0 ? y + rowH / 2 + 2 : y - rowH / 2 - 23, tipW, [label]));
    }
  });

  const notes = rows.reduce((n, b) => n + b.notes.length, 0);
  const dossiers = rows.reduce((n, b) => n + b.dossiers.length, 0);
  out.push(t.dot(16, 203, 2.6, { tone: "p", stage: 4 }));
  out.push(t.text(25, 207, L.note, { cls: "bp-m", stage: 4 }));
  out.push(t.square(70, 199, 8, { tone: "o", stage: 4 }));
  out.push(t.text(84, 207, L.dossier, { cls: "bp-m", stage: 4 }));
  out.push(
    t.text(508, 207, { fr: `${notes} ${both(L.total_notes).fr} · ${dossiers} ${both(L.total_dossiers).fr}`, en: `${notes} ${both(L.total_notes).en} · ${dossiers} ${both(L.total_dossiers).en}` }, { cls: "bp-m", anchor: "end", stage: 4 }),
  );
  return [...out, ...hots, t.tips(tips)];
}

/* ---------- Assemblage ---------- */

const SCHEMAS = { probant, finvalstudio, "carbon-co": carbonCo, "kyb-graph": kybGraph, panoplie, publications };

/**
 * @param {{ data: any, root: string }} options données de fil-rouge.json et racine du dépôt
 */
export async function createBlueprints({ data, root }) {
  const pairs = [];
  const t = toolkit(pairs);
  const blocs = await readPublications(root);
  const rendered = new Map();
  for (const project of data.projets) {
    const draw = SCHEMAS[project.id];
    const L = data.schemas?.[project.id];
    if (!draw || !L) throw new Error(`Schéma manquant pour le projet « ${project.id} » (scripts/blueprints.mjs ou schemas dans fil-rouge.json).`);
    const parts = draw(t, L, blocs);
    rendered.set(project.id, [
      `<div class="fr-blueprint" data-blueprint="${project.id}" role="group" aria-label="${t.attr(L.titre)}" tabindex="0">`,
      `  <svg class="bp" viewBox="0 0 ${VIEW.w} ${VIEW.h}" focusable="false">`,
      ...parts.map((p) => `    ${p}`),
      `  </svg>`,
      `</div>`,
    ]);
  }
  return {
    /** Lignes HTML du schéma d'un projet. */
    render: (id) => rendered.get(id),
    /** Paires [segment français, anglais] pour i18n/en/fil-rouge.json. */
    pairs,
  };
}
