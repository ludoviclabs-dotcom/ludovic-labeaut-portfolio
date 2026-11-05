import React, { useLayoutEffect, useRef } from "react";
import { BILLBOARD, drawBillboard } from "./pixelBillboard";
import { drawArche, drawBirds, drawDrones, drawGlobe, drawJets, drawTurbines, mountainHeights, PROPS } from "./pixelProps";
import { FOCAL, HORIZON, hex, Pixels, PX_H, PX_W, RGB, ROAD, RUMBLE, smooth, SPEED } from "./pixelCore";

export { PX_H, PX_W };

// Scène synthwave en pixel art, dessinée image par image dans une toile de 320 × 240 pixels,
// agrandie sans lissage (image-rendering: pixelated). Tout dépend du temps passé en paramètre :
// le rendu est identique à chaque passage, comme l'exige Remotion.

const CELL = 0.5; // largeur des cases de la grille

const SKY = [
  "#0b0221", "#140430", "#1f063d", "#2e0a4d", "#43105c", "#5c1468",
  "#7a1872", "#9b1c77", "#bd2079", "#de2877", "#ff3d6e",
].map(hex);
const SUN = ["#fff4a8", "#ffe156", "#ffc93a", "#ffa431", "#ff7d36", "#ff5a55", "#ff3d7f", "#e7258f"].map(hex);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const C = {
  ground: hex("#0d0221"),
  ground2: hex("#100327"),
  grid: hex("#ff2bd6"),
  asphalt: hex("#1b0b30"),
  asphalt2: hex("#160926"),
  rumbleA: hex("#ff2bd6"),
  rumbleB: hex("#f4e9ff"),
  dash: hex("#ffe6ff"),
  mountainBack: hex("#2a0a45"),
  mountainFront: hex("#150428"),
  edgeBack: hex("#ff2bd6"),
  edgeFront: hex("#3df0ff"),
  palm: hex("#10031a"),
  haze: hex("#ff3d9a"),
};

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Étoiles fixes, scintillement selon le temps.
const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 80 }, () => ({
    x: Math.floor(r() * PX_W),
    y: Math.floor(r() * (HORIZON - 40)),
    phase: r() * Math.PI * 2,
    speed: 1 + r() * 3,
    pink: r() < 0.3,
  }));
})();

function drawSky(p: Pixels, t: number) {
  const n = SKY.length - 1;
  for (let y = 0; y < HORIZON; y++) {
    const v = Math.pow(y / HORIZON, 1.5) * n;
    const base = Math.floor(v);
    const frac = v - base;
    for (let x = 0; x < PX_W; x++) {
      const b = frac * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? base + 1 : base;
      p.set(x, y, SKY[Math.max(0, Math.min(n, b))]);
    }
  }
  for (const s of STARS) {
    const tw = Math.sin(t * s.speed + s.phase);
    if (tw < -0.4) continue;
    const c: RGB = s.pink ? [255, 170, 230] : [255, 245, 255];
    p.blend(s.x, s.y, c, tw > 0.6 ? 1 : 0.5);
  }
}

function drawSun(p: Pixels, t: number) {
  const r = 46;
  const cx = PX_W / 2;
  // Le soleil se lève doucement pendant tout l'acte 1.
  const cy = HORIZON + 24 - 30 * smooth(3, 19.5, t);
  for (const [rr, a] of [[r + 18, 0.05], [r + 10, 0.09], [r + 4, 0.14]] as const) {
    for (let y = Math.floor(cy - rr); y < HORIZON; y++) {
      const half = Math.sqrt(Math.max(0, rr * rr - (y - cy) * (y - cy)));
      for (let x = Math.floor(cx - half); x <= cx + half; x++) p.blend(x, y, [255, 80, 150], a);
    }
  }
  const stripeShift = Math.floor(t * 4);
  for (let y = Math.ceil(cy - r); y < Math.min(HORIZON, cy + r); y++) {
    const v = Math.min(1, Math.max(0, (y - (cy - r)) / (2 * r)));
    // Bandes horizontales de plus en plus larges vers le bas.
    if (v > 0.42) {
      const gap = 1 + Math.floor((v - 0.42) * 8);
      if ((y + stripeShift) % 8 < gap) continue;
    }
    const q = v * (SUN.length - 1);
    const qb = Math.floor(q);
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.ceil(cx - half); x <= cx + half; x++) {
      const k = (q - qb) * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? qb + 1 : qb;
      p.set(x, y, SUN[Math.max(0, Math.min(SUN.length - 1, k))]);
    }
  }
}

function drawMountains(p: Pixels) {
  for (let x = 0; x < PX_W; x++) {
    const { back: hBack, front: hFront } = mountainHeights(x);
    for (let y = HORIZON - hBack; y < HORIZON; y++) p.set(x, y, C.mountainBack);
    p.set(x, HORIZON - hBack, C.edgeBack);
    if (hFront > 0) {
      for (let y = HORIZON - hFront; y < HORIZON; y++) p.set(x, y, C.mountainFront);
      p.set(x, HORIZON - hFront, C.edgeFront);
    }
  }
  for (let x = 0; x < PX_W; x++) p.set(x, HORIZON, [255, 120, 220]);
}

function drawGround(p: Pixels, t: number) {
  const scroll = t * SPEED;
  const glow: number[] = [];
  for (let y = HORIZON + 1; y < PX_H; y++) {
    const d = y - HORIZON;
    const z = FOCAL / d;
    const zTop = FOCAL / (d - 0.5);
    const zBot = FOCAL / (d + 0.5);
    const crossLine = Math.floor(zTop + scroll) !== Math.floor(zBot + scroll);
    const fade = Math.min(1, d / 34);
    const band = Math.floor((z + scroll) * 1.2) & 1;
    const rumbleBand = Math.floor((z + scroll) * 2.4) & 1;
    const dashOn = ((z + scroll) / 1.6) % 1 < 0.5;
    const pxWorld = z / FOCAL; // largeur d'un pixel dans le monde, à cette distance
    for (let x = 0; x < PX_W; x++) {
      const wx = (x - PX_W / 2 + 0.5) * pxWorld;
      const ax = Math.abs(wx);
      if (ax < ROAD) {
        if (dashOn && ax < Math.max(pxWorld * 0.6, 0.035)) p.set(x, y, C.dash);
        else p.set(x, y, band ? C.asphalt : C.asphalt2);
      } else if (ax < ROAD + RUMBLE) {
        p.set(x, y, rumbleBand ? C.rumbleA : C.rumbleB);
      } else {
        p.set(x, y, band ? C.ground : C.ground2);
        const u = (ax - ROAD - RUMBLE) / CELL;
        const du = pxWorld / CELL;
        const vertical = Math.floor(u - du / 2) !== Math.floor(u + du / 2);
        if (crossLine || vertical) {
          p.blend(x, y, C.grid, 0.25 + 0.75 * fade);
          glow.push(x, y, fade);
        }
      }
    }
    // Brume rose sur l'horizon.
    const haze = Math.max(0, 1 - d / 26) * 0.55;
    if (haze > 0) for (let x = 0; x < PX_W; x++) p.blend(x, y, C.haze, haze);
  }
  for (let i = 0; i < glow.length; i += 3) {
    const [x, y, a] = [glow[i], glow[i + 1], glow[i + 2]];
    p.blend(x, y - 1, C.grid, 0.18 * a);
    p.blend(x, y + 1, C.grid, 0.18 * a);
  }
}

function drawPalm(p: Pixels, bx: number, by: number, h: number, lean: number) {
  const top = { x: bx, y: by - h };
  for (let i = 0; i < h; i++) {
    const k = i / h;
    const x = bx + lean * k * k * h * 0.22;
    const w = Math.max(1, Math.round(h * 0.055 * (1 - k * 0.45)));
    p.rect(Math.round(x - w / 2), Math.round(by - i), w, 1, C.palm);
    top.x = x;
  }
  const fronds = [-168, -140, -112, -80, -48, -14];
  for (const deg of fronds) {
    const a = (deg * Math.PI) / 180;
    const len = h * (0.42 + 0.08 * Math.cos(a * 3));
    const steps = Math.ceil(len * 1.5);
    for (let s = 0; s <= steps; s++) {
      const q = s / steps;
      const x = top.x + Math.cos(a) * len * q;
      const y = top.y + Math.sin(a) * len * q + len * 0.55 * q * q;
      const w = Math.max(1, Math.round(h * 0.05 * (1 - q * 0.7)));
      p.rect(Math.round(x - w / 2), Math.round(y - w / 2), w, w, C.palm);
    }
  }
}

// Palmiers : un index continu k le long de la route (un palmier tous les PALM_GAP), si bien que
// chaque palmier garde son côté et son inclinaison jusqu'à sortir du cadre (correctif v1 : un
// palmier sur deux disparaissait au milieu de l'écran). Côtés : G D D G G D D G…
const PALM_GAP = 1.6;
const PALM_X = ROAD + RUMBLE + 1.1;
const palmSide = (k: number) => (((k + (k >> 1)) & 1) === 1 ? 1 : -1);
const hash01 = (k: number) => {
  let h = Math.imul(k ^ 0x5bd1e995, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x165667b1);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

type Item = { z: number; draw: () => void };

function palmItems(p: Pixels, scroll: number, items: Item[]) {
  const first = Math.max(0, Math.ceil((scroll + 0.1) / PALM_GAP));
  for (let k = first; k < first + 26; k++) {
    const zw = k * PALM_GAP;
    const side = palmSide(k);
    if (BILLBOARD.clearsPalm(zw, side) || PROPS.clearsPalm(zw, side)) continue;
    const z = zw - scroll;
    const wx = side * PALM_X;
    const x = PX_W / 2 + (wx * FOCAL) / z;
    const y = HORIZON + FOCAL / z;
    const h = (2.6 * FOCAL) / z;
    if (h < 6) continue;
    // Hors champ (tronc et palmes) : inutile de dessiner.
    if (side > 0 ? x - 0.62 * h > PX_W : x + 0.62 * h < 0) continue;
    const lean = side * (0.4 + (hash01(k) - 0.4) * 0.3);
    items.push({ z, draw: () => drawPalm(p, x, y, h, lean) });
  }
}

// Voiture de sport vue de dos (silhouette générique, 64 × 28 pixels).
type Rect = [number, number, number, number, string];
const CAR: Rect[] = (() => {
  const r: Rect[] = [];
  for (let row = 0; row <= 5; row++) r.push([20 - row, row, 24 + row * 2, 1, "#1d3f6e"]);
  r.push([20, 0, 24, 1, "#0f0820"]);
  for (let k = 1; k <= 4; k++) r.push([24 + k * 3, k, 2, 1, "#6fe3ff"]);
  r.push([0, 6, 64, 1, "#a46bff"], [0, 7, 64, 1, "#1a0f30"]);
  r.push([8, 8, 2, 2, "#1a0f30"], [54, 8, 2, 2, "#1a0f30"]);
  r.push([5, 8, 54, 3, "#2f1c52"], [10, 8, 44, 1, "#ff4fd8"]);
  r.push([2, 11, 60, 9, "#241540"], [2, 11, 2, 8, "#4a2a7a"], [60, 11, 2, 8, "#4a2a7a"]);
  r.push([5, 12, 54, 4, "#ff1e3c"], [25, 12, 14, 4, "#3a0d1a"]);
  r.push([7, 13, 14, 2, "#ff9aa8"], [43, 13, 14, 2, "#ff9aa8"]);
  r.push([25, 16, 14, 3, "#e6e3f0"]);
  for (const x of [27, 28, 30, 31, 33, 35, 36]) r.push([x, 17, 1, 1, "#3a3550"]);
  r.push([2, 19, 60, 1, "#170c2b"]);
  r.push([10, 20, 44, 3, "#1c1030"], [15, 20, 4, 2, "#9a98b0"], [45, 20, 4, 2, "#9a98b0"]);
  r.push([16, 20, 2, 1, "#3a3850"], [46, 20, 2, 1, "#3a3850"]);
  r.push([3, 19, 10, 9, "#07020d"], [51, 19, 10, 9, "#07020d"]);
  r.push([3, 19, 10, 1, "#2a2040"], [51, 19, 10, 1, "#2a2040"]);
  r.push([13, 23, 38, 3, "#05010a"]);
  return r;
})().map(([x, y, w, h, c]) => [x, y, w, h, c] as Rect);
const CAR_RGB = CAR.map(([x, y, w, h, c]) => ({ x, y, w, h, c: hex(c) }));

function drawCar(p: Pixels, t: number, flare: number) {
  const sway = Math.sin(t * 0.8) * 5 + Math.sin(t * 2.3) * 1.5;
  const bump = Math.floor(t * 8) % 5 === 0 ? -1 : 0;
  const x0 = Math.round(PX_W / 2 - 32 + sway);
  const y0 = PX_H - 30 + bump;
  // Ombre portée.
  for (let y = PX_H - 4; y < PX_H; y++) for (let x = x0 - 3; x < x0 + 67; x++) p.blend(x, y, [3, 0, 8], 0.55);
  for (const r of CAR_RGB) p.rect(x0 + r.x, y0 + r.y, r.w, r.h, r.c);
  // Halo des feux arrière, plus fort sur les coups de batterie.
  const a = 0.16 + 0.25 * flare;
  for (let y = y0 + 9; y < y0 + 19; y++) {
    for (let x = x0 + 1; x < x0 + 63; x++) {
      const inLight = y >= y0 + 12 && y < y0 + 16 && x >= x0 + 5 && x < x0 + 59 && !(x >= x0 + 25 && x < x0 + 39);
      if (!inLight) p.blend(x, y, [255, 40, 70], a * (y === y0 + 11 || y === y0 + 16 ? 1 : 0.45));
    }
  }
  // Reflets des feux sur la route.
  for (let y = y0 + 28; y < PX_H; y++) {
    for (const lx of [x0 + 10, x0 + 50]) for (let x = lx - 3; x < lx + 4; x++) p.blend(x, y, [255, 30, 60], 0.18 + 0.2 * flare);
  }
}

function glitchPass(p: Pixels, amount: number, seed: number) {
  if (amount <= 0) return;
  const r = rng(seed);
  const src = new Uint8ClampedArray(p.data);
  const bands = 2 + Math.floor(amount * 7);
  for (let b = 0; b < bands; b++) {
    const y0 = Math.floor(r() * PX_H);
    const h = 2 + Math.floor(r() * 14);
    const shift = Math.round((r() * 2 - 1) * 36 * amount);
    for (let y = y0; y < Math.min(PX_H, y0 + h); y++) {
      for (let x = 0; x < PX_W; x++) {
        const sx = (x - shift + PX_W) % PX_W;
        const i = (y * PX_W + x) * 4;
        const j = (y * PX_W + sx) * 4;
        p.data[i] = src[j];
        p.data[i + 1] = src[j + 1];
        p.data[i + 2] = src[j + 2];
      }
    }
  }
  // Décalage du rouge et du bleu.
  const off = Math.max(1, Math.round(3 * amount));
  const copy = new Uint8ClampedArray(p.data);
  for (let y = 0; y < PX_H; y++) {
    for (let x = 0; x < PX_W; x++) {
      const i = (y * PX_W + x) * 4;
      const ir = (y * PX_W + Math.min(PX_W - 1, x + off)) * 4;
      const ib = (y * PX_W + Math.max(0, x - off)) * 4;
      p.data[i] = copy[ir];
      p.data[i + 2] = copy[ib + 2];
    }
  }
}

export const PixelArtHighwayCanvas: React.FC<{
  timeSec: number;
  /** 0 à 1 : intensité du glitch (coups de batterie). */
  glitch?: number;
  glitchSeed?: number;
  style?: React.CSSProperties;
}> = ({ timeSec, glitch = 0, glitchSeed = 1, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const p = new Pixels(ctx.createImageData(PX_W, PX_H));
    drawSky(p, timeSec);
    drawGlobe(p, timeSec);
    drawSun(p, timeSec);
    drawBirds(p, timeSec);
    drawJets(p, timeSec);
    drawArche(p, timeSec);
    drawMountains(p);
    drawTurbines(p, timeSec);
    drawDrones(p, timeSec);
    drawGround(p, timeSec);
    const scroll = timeSec * SPEED;
    const items: Item[] = [];
    palmItems(p, scroll, items);
    BILLBOARD.items(scroll).forEach((b) => items.push({ z: b.z, draw: () => drawBillboard(p, b, timeSec) }));
    items.push(...PROPS.items(p, scroll, timeSec));
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();
    drawCar(p, timeSec, glitch);
    glitchPass(p, glitch, glitchSeed);
    ctx.putImageData(p.img, 0, 0);
  }, [timeSec, glitch, glitchSeed]);

  return (
    <canvas
      ref={ref}
      width={PX_W}
      height={PX_H}
      style={{ width: "100%", height: "100%", imageRendering: "pixelated", display: "block", ...style }}
    />
  );
};
