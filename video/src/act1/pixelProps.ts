import { FOCAL, HORIZON, hex, Pixels, PX_W, RGB, ROAD, RUMBLE, smooth, SPEED } from "./pixelCore";
import { GLYPH_ROWS, wordPixels } from "./pixelBillboard";

// Décor de la route, en pixel art, aux couleurs des sujets de la vidéo :
//   · à l'horizon, la Grande Arche de la Défense, en silhouette devant le soleil (finance) ;
//   · sur les crêtes, des éoliennes dont les pales tournent (ESG, climat) ;
//   · dans le ciel, un globe filaire qui tourne (géopolitique) et un vol d'oiseaux en V ;
//   · au bord de la route, un robot humanoïde qui fait signe (robotique) ;
//   · avant le break, un péage « CONTRÔLE » dont la barrière se lève (contrôle interne).
// Tout dépend du temps passé en paramètre : rendu identique à chaque passage.

const SIL = hex("#14042a"); // silhouettes devant le ciel
const CYAN = hex("#3df0ff");
const PINK = hex("#ff2bd6");
const WHITE = hex("#f4e9ff");

/** Hauteur des montagnes (arrière, avant) à la colonne x : partagée avec le dessin des montagnes. */
export function mountainHeights(x: number) {
  const side = Math.abs(x - PX_W / 2);
  const mBack = Math.min(1, Math.max(0.12, (side - 28) / 90));
  const back = Math.round((16 + 9 * Math.sin(x * 0.05 + 1) + 6 * Math.sin(x * 0.13 + 2) + 3 * Math.sin(x * 0.31)) * mBack);
  const mFront = Math.min(1, Math.max(0, (side - 70) / 70));
  const front = Math.round((8 + 5 * Math.sin(x * 0.07 + 4) + 4 * Math.sin(x * 0.19 + 1)) * mFront);
  return { back, front };
}

/** Trait d'un point à un autre, en petits carrés (épaisseur w, en pixels de la toile). */
function line(p: Pixels, x0: number, y0: number, x1: number, y1: number, c: RGB, w = 1, a = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    p.fillF(x - w / 2, y - w / 2, x + w / 2, y + w / 2, c, a);
  }
}

// ------------------------------------------------------------------ fond (au-delà de la route)

/** La Grande Arche : un cube évidé, posé sur l'horizon au point de fuite, devant le soleil. */
export function drawArche(p: Pixels, t: number) {
  const a = smooth(4.2, 5.4, t);
  if (a <= 0) return;
  const w = 30;
  const h = 26;
  const th = 4; // épaisseur des montants
  const x0 = PX_W / 2 - w / 2;
  const y0 = HORIZON - h;
  p.fillF(x0, y0, x0 + w, y0 + th, SIL, a); // toit
  p.fillF(x0, y0, x0 + th, HORIZON, SIL, a); // montant gauche
  p.fillF(x0 + w - th, y0, x0 + w, HORIZON, SIL, a); // montant droit
  // Arêtes éclairées au néon : haut et intérieur.
  p.fillF(x0, y0, x0 + w, y0 + 1, CYAN, 0.85 * a);
  p.fillF(x0 + th, y0 + th, x0 + w - th, y0 + th + 1, PINK, 0.7 * a);
  p.fillF(x0 + th - 1, y0 + th, x0 + th, HORIZON, PINK, 0.5 * a);
  p.fillF(x0 + w - th, y0 + th, x0 + w - th + 1, HORIZON, PINK, 0.5 * a);
  // Le « Nuage », la toile tendue sous l'arche.
  p.fillF(x0 + th + 3, y0 + th + 6, x0 + w - th - 3, y0 + th + 8, WHITE, 0.25 * a);
}

const TURBINES = [
  { x: 52, h: 22, phase: 0.4, speed: 2.1 },
  { x: 78, h: 15, phase: 1.9, speed: 2.6 },
  { x: 266, h: 20, phase: 1.1, speed: 2.3 },
];

/** Éoliennes sur les crêtes : mât, nacelle, trois pales qui tournent. */
export function drawTurbines(p: Pixels, t: number) {
  for (const tb of TURBINES) {
    const { back, front } = mountainHeights(tb.x);
    const base = HORIZON - Math.max(back, front);
    const hub = { x: tb.x, y: base - tb.h };
    line(p, tb.x, base, hub.x, hub.y, SIL, 1.2);
    p.fillF(hub.x - 1, hub.y - 1, hub.x + 2, hub.y + 1, SIL);
    const len = tb.h * 0.48;
    for (let k = 0; k < 3; k++) {
      const ang = tb.phase + t * tb.speed + (k * 2 * Math.PI) / 3;
      line(p, hub.x, hub.y, hub.x + Math.cos(ang) * len, hub.y + Math.sin(ang) * len, SIL, 1);
    }
    p.fillF(hub.x, hub.y - 1, hub.x + 1, hub.y, PINK, 0.9); // feu de balisage
  }
}

/** Globe filaire néon en haut à droite : méridiens et parallèles, rotation lente. */
export function drawGlobe(p: Pixels, t: number) {
  const a = smooth(5, 6.5, t);
  if (a <= 0) return;
  const cx = 282;
  const cy = 46;
  const r = 14;
  const tilt = 0.38;
  const spin = t * 0.55;
  const plot = (lat: number, lon: number) => {
    const x = Math.cos(lat) * Math.sin(lon + spin);
    const y0 = Math.sin(lat);
    const z0 = Math.cos(lat) * Math.cos(lon + spin);
    const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
    const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    p.blend(Math.round(cx + x * r), Math.round(cy - y * r), CYAN, (z > 0 ? 0.9 : 0.22) * a);
  };
  // Halo.
  for (let y = cy - r - 3; y <= cy + r + 3; y++) {
    for (let x = cx - r - 3; x <= cx + r + 3; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r + 3) p.blend(x, y, CYAN, 0.06 * a * (1 - Math.abs(d - r) / 4));
    }
  }
  for (let m = 0; m < 6; m++) for (let s = -40; s <= 40; s++) plot((s / 40) * (Math.PI / 2), (m * Math.PI) / 6);
  for (const lat of [-60, -30, 0, 30, 60]) for (let s = 0; s < 90; s++) plot((lat * Math.PI) / 180, (s / 90) * 2 * Math.PI);
}

/** Vol d'oiseaux en V, de droite à gauche, devant le soleil (6,5 → 12,5 s). */
export function drawBirds(p: Pixels, t: number) {
  const from = 6.5;
  const to = 12.5;
  if (t < from || t > to) return;
  const lead = { x: 340 - ((t - from) / (to - from)) * 400, y: 96 + Math.sin(t * 1.3) * 2 };
  const flap = Math.floor(t * 7) % 2 === 0;
  const birds = [[0, 0], ...[1, 2, 3].flatMap((k) => [[k * 6, -k * 3], [k * 6, k * 3]])];
  birds.forEach(([dx, dy], i) => {
    const x = Math.round(lead.x + dx);
    const y = Math.round(lead.y + dy + (i % 2) * 0.5);
    const up = flap !== (i % 3 === 0);
    p.set(x, y, SIL);
    p.set(x - 1, up ? y - 1 : y, SIL);
    p.set(x + 1, up ? y - 1 : y, SIL);
    p.set(x - 2, up ? y - 2 : y, SIL);
    p.set(x + 2, up ? y - 2 : y, SIL);
  });
}

// ------------------------------------------------------------------ au bord de la route

// Robot humanoïde (11 × 15 cases) qui fait signe de la main droite.
const ROBOT_BODY = [
  "....WWW....",
  "...WCCCW...",
  "...WWWWW...",
  "....GGG....",
  "..WWWWWWW..",
  ".WWWWCWWWW.",
  ".W.WWWWW...",
  ".W.WWWWW...",
  ".G.GGGGG...",
  "...WW.WW...",
  "...WW.WW...",
  "...GW.WG...",
  "...WW.WW...",
  "...WW.WW...",
  "..DDD.DDD..",
];
// Bras droit levé, deux positions (salut) : [colonne, ligne, couleur].
const WAVE: [number, number, string][][] = [
  [[9, 4, "W"], [9, 3, "W"], [9, 2, "W"], [9, 1, "G"]],
  [[9, 4, "W"], [9, 3, "W"], [10, 2, "W"], [10, 1, "G"]],
];
const ROBOT_RGB: Record<string, RGB> = { W: hex("#dcd8f2"), G: hex("#6e6890"), C: CYAN, D: hex("#2a2140") };
const ROBOT = { zw: 12.6 * SPEED + 4, side: -1, x: ROAD + RUMBLE + 0.75, cell: 0.115 };

function drawRobot(p: Pixels, z: number, t: number) {
  const k = FOCAL / z;
  const cell = ROBOT.cell;
  const left = ROBOT.side * ROBOT.x - (11 * cell) / 2;
  const topH = 15 * cell; // hauteur du sommet de la tête (unités du monde)
  const sx = (wx: number) => PX_W / 2 + wx * k;
  const sy = (h: number) => HORIZON + (1 - h) * k;
  const fade = 1 - smooth(20, 30, z);
  const put = (c: number, r: number, key: string) => {
    const color = ROBOT_RGB[key];
    if (!color) return;
    p.fillF(sx(left + c * cell), sy(topH - r * cell), sx(left + (c + 1) * cell), sy(topH - (r + 1) * cell), color, fade);
  };
  ROBOT_BODY.forEach((row, r) => [...row].forEach((ch, c) => put(c, r, ch)));
  for (const [c, r, key] of WAVE[Math.floor(t * 4) % 2]) put(c, r, key);
  // Reflet cyan de la visière.
  p.fillF(sx(left + 4 * cell), sy(topH - cell) - Math.max(0.6, 0.05 * k), sx(left + 7 * cell), sy(topH - cell), CYAN, 0.35 * fade);
}

// Péage « CONTRÔLE » : portique au-dessus de la route, cabines et barrière qui se lève.
const TOLL = { zw: 17 * SPEED + 0.25, half: ROAD + 1.0, roof: [2.0, 2.45] as const, booth: 0.42 };
const TOLL_WORD = wordPixels("CONTRÔLE");
const TOLL_FILL = hex("#1a0636");
const TOLL_POST = hex("#2b0f4f");
const RED = hex("#ff1e3c");

function drawToll(p: Pixels, z: number) {
  const k = FOCAL / z;
  const sx = (wx: number) => PX_W / 2 + wx * k;
  const sy = (h: number) => HORIZON + (1 - h) * k;
  const fade = 1 - smooth(22, 30, z);
  const [r0, r1] = TOLL.roof;
  // Cabines et poteaux.
  for (const s of [-1, 1]) {
    const xi = s * (ROAD + 0.12);
    const xo = s * (ROAD + 0.12 + TOLL.booth);
    p.fillF(sx(Math.min(xi, xo)), sy(r0), sx(Math.max(xi, xo)), sy(0), TOLL_POST, fade);
    p.fillF(sx(Math.min(xi, xo)), sy(1.1), sx(Math.max(xi, xo)), sy(0.9), CYAN, 0.6 * fade); // vitre
  }
  // Toit, liseré néon.
  p.fillF(sx(-TOLL.half), sy(r1), sx(TOLL.half), sy(r0), TOLL_FILL, fade);
  p.fillF(sx(-TOLL.half), sy(r0) - Math.max(0.6, 0.04 * k), sx(TOLL.half), sy(r0), PINK, fade);
  p.fillF(sx(-TOLL.half), sy(r1), sx(TOLL.half), sy(r1) + Math.max(0.6, 0.04 * k), PINK, 0.8 * fade);
  // Le mot, centré sur le toit.
  const rows = GLYPH_ROWS + TOLL_WORD.accentRows;
  const cellW = Math.min((2 * TOLL.half - 0.5) / TOLL_WORD.w, (r1 - r0 - 0.12) / rows);
  const cell = cellW * k;
  const tx = sx(0) - (TOLL_WORD.w * cell) / 2;
  const ty = sy((r0 + r1) / 2) - (rows * cell) / 2 + TOLL_WORD.accentRows * cell;
  for (const [c, r] of TOLL_WORD.on) {
    const gx = tx + c * cell;
    const gy = ty + r * cell;
    p.fillF(gx, gy, gx + cell, gy + cell, hex("#ffd319"), fade);
  }
  // Barrière : pivot sur la cabine de droite, elle se lève quand la voiture approche.
  const lift = smooth(7, 3, z) * (Math.PI * 0.44);
  const pivot = { x: ROAD + 0.12, h: 0.62 };
  const len = 2 * ROAD + 0.1;
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const q0 = i / steps;
    const q1 = (i + 1) / steps;
    const ax = pivot.x - Math.cos(lift) * len * q0;
    const ah = pivot.h + Math.sin(lift) * len * q0;
    const bx = pivot.x - Math.cos(lift) * len * q1;
    const bh = pivot.h + Math.sin(lift) * len * q1;
    line(p, sx(ax), sy(ah), sx(bx), sy(bh), i % 2 ? WHITE : RED, Math.max(1, 0.06 * k), fade);
  }
}

// ------------------------------------------------------------------ calendrier

type Prop = { z: number; draw: () => void };

export const PROPS = {
  /** Objets du bord de la route visibles, à dessiner dans l'ordre des distances. */
  items(p: Pixels, scroll: number, t: number): Prop[] {
    const out: Prop[] = [];
    const zr = ROBOT.zw - scroll;
    if (zr > 0.3 && zr < 30) out.push({ z: zr, draw: () => drawRobot(p, zr, t) });
    const zt = TOLL.zw - scroll;
    if (zt > 0.25 && zt < 30) out.push({ z: zt, draw: () => drawToll(p, zt) });
    return out;
  },
  /** Vrai si un palmier (position zw, côté side) gênerait le robot ou le péage. */
  clearsPalm(zw: number, side: number) {
    return (side === ROBOT.side && Math.abs(zw - ROBOT.zw) < 2.2) || Math.abs(zw - TOLL.zw) < 1.4;
  },
};
