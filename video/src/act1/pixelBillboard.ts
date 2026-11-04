import { BILLBOARDS } from "../content";
import { FOCAL, HORIZON, hex, Pixels, PX_W, RGB, smooth, SPEED } from "./pixelCore";

// Panneaux d'affichage au bord de la route (pixel art) : un panneau néon sur deux poteaux, posé
// en alternance à droite et à gauche, qui porte un mot de BILLBOARDS écrit avec une petite police
// bitmap 5 × 7. Le mot est mis à l'échelle de la distance ; les palmiers du même côté sont retirés
// devant et autour du panneau pour qu'ils ne le masquent jamais.

// Police bitmap 5 × 7 (A–Z et tiret), une chaîne de 35 bits par glyphe, ligne par ligne.
const GLYPHS: Record<string, string> = {
  A: "01110100011000111111100011000110001",
  B: "11110100011000111110100011000111110",
  C: "01110100011000010000100001000101110",
  D: "11110100011000110001100011000111110",
  E: "11111100001000011110100001000011111",
  F: "11111100001000011110100001000010000",
  G: "01110100011000010111100011000101111",
  H: "10001100011000111111100011000110001",
  I: "01110001000010000100001000010001110",
  J: "00111000100001000010000101001001100",
  K: "10001100101010011000101001001010001",
  L: "10000100001000010000100001000011111",
  M: "10001110111010110101100011000110001",
  N: "10001100011100110101100111000110001",
  O: "01110100011000110001100011000101110",
  P: "11110100011000111110100001000010000",
  Q: "01110100011000110001101011001001101",
  R: "11110100011000111110101001001010001",
  S: "01111100001000001110000010000111110",
  T: "11111001000010000100001000010000100",
  U: "10001100011000110001100011000101110",
  V: "10001100011000110001100010101000100",
  W: "10001100011000110101101011010101010",
  X: "10001100010101000100010101000110001",
  Y: "10001100010101000100001000010000100",
  Z: "11111000010001000100010001000011111",
  "-": "00000000000000011111000000000000000",
  " ": "00000000000000000000000000000000000",
};

/** Pixels allumés d'un mot : [colonne, ligne], et largeur totale (1 colonne d'espace entre lettres). */
const wordPixels = (word: string) => {
  const on: [number, number][] = [];
  [...word].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let k = 0; k < 35; k++) if (g[k] === "1") on.push([i * 6 + (k % 5), Math.floor(k / 5)]);
  });
  return { on, w: word.length * 6 - 1 };
};
const WORDS = BILLBOARDS.map(wordPixels);

// Géométrie (unités du monde ; la caméra est à 1 unité du sol).
const W = 6.4; // largeur du panneau
const BOTTOM = 0.8; // bas du panneau
const TOP = 2.8; // haut du panneau
const INNER = 2.6; // bord intérieur, au-delà de la rangée de palmiers (1,94)
const PAD_X = 0.35;
const PAD_Y = 0.25;
// Calendrier : un panneau toutes les PERIOD secondes ; au temps FIRST + j·PERIOD, le panneau j
// est à NEAR unités de la caméra (au milieu de sa fenêtre de lisibilité).
// Sept panneaux, le dernier sorti avant le premier coup du break (18,75 s) : la question du
// terminal reste seule pendant le break. Au plus près : 4,85 · 7,07 · 9,29 · 11,51 · 13,73 · 15,95 · 18,17 s.
const PERIOD = 2.22;
const FIRST = 4.85;
const NEAR = 4;
const COUNT = 7;
const FAR = 30;

type Board = { j: number; z: number; side: number; zw: number };

const BOARDS = Array.from({ length: COUNT }, (_, j) => ({
  j,
  zw: (FIRST + j * PERIOD) * SPEED + NEAR,
  side: j % 2 === 0 ? 1 : -1,
}));

const NEON_FRAME: RGB[] = [hex("#ff2bd6"), hex("#3df0ff")];
const NEON_TEXT: RGB[] = [hex("#ffd319"), hex("#fff4fd")];
const BOARD_FILL = hex("#12032a");
const BOARD_FILL2 = hex("#1d0640");
const POST = hex("#1e0b33");
const POST_EDGE = hex("#5a2a8a");

const hash = (n: number) => {
  let h = Math.imul(n ^ 0x2c1b3c6d, 0x297a2d39);
  h ^= h >>> 15;
  return ((Math.imul(h, 0x85ebca6b) ^ (h >>> 13)) >>> 0) / 4294967296;
};

export const BILLBOARD = {
  /** Panneaux visibles, à la distance z (unités du monde) de la caméra. */
  items(scroll: number): Board[] {
    return BOARDS.map((b) => ({ ...b, z: b.zw - scroll })).filter((b) => b.z > 0.25 && b.z < FAR);
  },
  /** Vrai si un palmier (position zw sur la route, côté side) gênerait un panneau. */
  clearsPalm(zw: number, side: number) {
    return BOARDS.some((b) => b.side === side && zw > b.zw - 8 && zw < b.zw + 1.2);
  },
};

export function drawBillboard(p: Pixels, b: Board, t: number) {
  const k = FOCAL / b.z;
  const sx = (wx: number) => PX_W / 2 + wx * k;
  const sy = (h: number) => HORIZON + (1 - h) * k;
  const xc = b.side * (INNER + W / 2);
  const fade = 1 - smooth(FAR - 10, FAR, b.z);
  const style = b.j % 2;
  const neon = NEON_FRAME[style];
  // Néon qui grésille brièvement, de façon déterministe.
  const flick = hash(Math.floor(t * 30) * 31 + b.j) < 0.05 ? 0.55 : 1;

  const x0 = sx(xc - W / 2);
  const x1 = sx(xc + W / 2);
  const top = sy(TOP);
  const bot = sy(BOTTOM);
  if (x1 < -2 || x0 > PX_W + 2) return;

  // Poteaux.
  for (const px of [xc - W * 0.3, xc + W * 0.3]) {
    p.fillF(sx(px - 0.1), bot, sx(px + 0.1), sy(0), POST, fade);
    p.fillF(sx(px - 0.1), bot, sx(px - 0.1) + Math.max(0.6, 0.03 * k), sy(0), POST_EDGE, fade);
  }
  // Halo, cadre néon, fond.
  const halo = Math.max(1.2, 0.14 * k);
  p.fillF(x0 - halo, top - halo, x1 + halo, bot + halo, neon, 0.2 * fade * flick);
  p.fillF(x0, top, x1, bot, neon, fade * flick);
  const fr = Math.max(0.8, 0.09 * k);
  p.fillF(x0 + fr, top + fr, x1 - fr, bot - fr, BOARD_FILL, fade);
  p.fillF(x0 + fr, (top + bot) / 2, x1 - fr, bot - fr, BOARD_FILL2, 0.6 * fade);

  // Le mot, centré, à l'échelle de la distance.
  const word = WORDS[b.j % WORDS.length];
  const cellW = Math.min((W - 2 * PAD_X) / word.w, (TOP - BOTTOM - 2 * PAD_Y) / 7);
  const cell = cellW * k; // taille d'un pixel du glyphe, en pixels de la toile
  const tx = sx(xc) - (word.w * cell) / 2;
  const ty = sy((TOP + BOTTOM) / 2) - (7 * cell) / 2;
  const glow = Math.max(0.6, cell * 0.45);
  for (const [c, r] of word.on) {
    const gx = tx + c * cell;
    const gy = ty + r * cell;
    p.fillF(gx - glow, gy - glow, gx + cell + glow, gy + cell + glow, neon, 0.16 * fade * flick);
  }
  const text = NEON_TEXT[style];
  for (const [c, r] of word.on) {
    const gx = tx + c * cell;
    const gy = ty + r * cell;
    // Au-delà de 1,6 pixel par point, bords alignés sur la grille : le mot reste « pixel art ».
    if (cell >= 1.6) p.fillF(Math.round(gx), Math.round(gy), Math.round(gx + cell), Math.round(gy + cell), text, fade);
    else p.fillF(gx, gy, gx + cell, gy + cell, text, fade);
  }
}
