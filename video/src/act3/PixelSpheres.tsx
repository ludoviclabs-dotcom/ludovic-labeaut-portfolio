import React, { useLayoutEffect, useRef } from "react";

// Sphères en pixel art, dans le style de la route synthwave de l'acte 1 : dessinées dans une toile
// trois fois plus petite que l'image, puis agrandies sans lissage. Chaque sphère a :
//   · un maillage fil de fer néon (méridiens qui tournent sur l'axe vertical, parallèles), arrière
//     plus pâle que l'avant ;
//   · un remplissage et un halo en tramage ordonné (Bayer 4 × 4), plus denses en haut, comme le
//     soleil de la route, avec des lignes de balayage une ligne sur deux ;
//   · une pulsation lumineuse lente ;
//   · quand elle change de place, elle se défait en particules et se reforme (scatter) ;
//   · des éclats de pixels quand elle se pose.
// La « sphère soleil » (sun) reprend le dégradé jaune → rose du soleil de l'acte 1.
// Tout dépend du numéro d'image : rendu identique à chaque passage, comme l'exige Remotion.

export const PIXEL_SCALE = 3;

export type PixelSphere = {
  /** Centre et rayon, en pixels de l'image (pas de la toile). */
  x: number;
  y: number;
  r: number;
  accent: string;
  alpha?: number;
  /** Décalage propre de l'animation (bandes, reflet). */
  phase?: number;
  /** 0 → 1 : éclats de pixels autour de la sphère quand elle se pose. */
  burst?: number;
  sun?: boolean;
  /** 0 → 1 : la sphère se défait en particules (0 : entière). */
  scatter?: number;
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const BLACK: RGB = [6, 3, 14];
const WHITE: RGB = [255, 250, 255];
const SUN = ["#e7258f", "#ff3d7f", "#ff5a55", "#ff7d36", "#ffa431", "#ffc93a", "#ffe156", "#fff4a8"].map(hex);

class Canvas {
  constructor(
    public data: Uint8ClampedArray,
    public w: number,
    public h: number,
  ) {}
  blend(x: number, y: number, c: RGB, a: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    const k = Math.min(1, a);
    const prev = this.data[i + 3] / 255;
    // Composition « par-dessus » sur une toile transparente.
    const out = k + prev * (1 - k);
    for (let j = 0; j < 3; j++) this.data[i + j] = (c[j] * k + this.data[i + j] * prev * (1 - k)) / (out || 1);
    this.data[i + 3] = out * 255;
  }
}

function drawSphere(cv: Canvas, s: PixelSphere, frame: number) {
  const alpha = s.alpha ?? 1;
  if (alpha <= 0 || s.r <= 0) return;
  if (s.sun) return drawSun(cv, s, frame);
  const cx = s.x / PIXEL_SCALE;
  const cy = s.y / PIXEL_SCALE;
  const r = Math.max(2, s.r / PIXEL_SCALE);
  const phase = s.phase ?? 0;
  const accent = hex(s.accent);
  const bright = mix(accent, WHITE, 0.55);
  const deep = mix(accent, BLACK, 0.55);
  const scatter = s.scatter ?? 0;
  // Pulsation lumineuse lente, propre à chaque sphère.
  const pulse = 0.75 + 0.25 * Math.sin((frame + phase * 30) / 11);
  const halo = Math.max(2, r * 0.5);

  // 1. Halo et remplissage tramés (Bayer), lignes de balayage une ligne sur deux.
  if (scatter < 0.5) {
    const fillA = alpha * (1 - scatter * 2);
    const x0 = Math.floor(cx - r - halo);
    const x1 = Math.ceil(cx + r + halo);
    const y0 = Math.floor(cy - r - halo);
    const y1 = Math.ceil(cy + r + halo);
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        const b = BAYER[(py & 3) * 4 + (px & 3)];
        if (d > r) {
          const k = 1 - (d - r) / halo;
          if (k > 0 && b < 16 * k * k * 0.5 * pulse) cv.blend(px, py, accent, 0.5 * fillA);
          continue;
        }
        if ((py & 1) === 1) continue; // ligne de balayage
        const v = (py + 0.5 - cy) / r; // −1 en haut, +1 en bas
        const density = 0.42 * (1 - (v + 1) / 2) + 0.08; // plus dense en haut, comme le soleil
        if (b < 16 * density) cv.blend(px, py, mix(deep, accent, 0.5 - v * 0.4), 0.8 * fillA);
      }
    }
  }

  // 2. Maillage fil de fer : méridiens qui tournent sur l'axe vertical, parallèles fixes.
  const spin = (frame + phase * 20) * 0.045;
  const tilt = 0.32;
  const pt = (lat: number, lon: number, seed: number) => {
    const x = Math.cos(lat) * Math.sin(lon + spin);
    const y0 = Math.sin(lat);
    const z0 = Math.cos(lat) * Math.cos(lon + spin);
    const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
    const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    // Dispersion en particules : chaque point s'écarte selon sa propre direction.
    const h1 = Math.sin(seed * 12.9898 + phase * 78.233) * 43758.5453;
    const h2 = Math.sin(seed * 39.3468 + phase * 11.135) * 24634.6345;
    const jx = (h1 - Math.floor(h1) - 0.5) * 2;
    const jy = (h2 - Math.floor(h2) - 0.5) * 2;
    return { x: cx + x * r + jx * scatter * r * 1.8, y: cy - y * r + jy * scatter * r * 1.8, front: z > 0 };
  };
  const meridians = r >= 8 ? 8 : 6;
  const steps = Math.max(16, Math.round(r * 4));
  let seed = 0;
  const plot = (q: { x: number; y: number; front: boolean }) => {
    const c = q.front ? bright : accent;
    const a = (q.front ? 1 : 0.28) * alpha * (scatter > 0 ? 1 : pulse * 0.25 + 0.75);
    cv.blend(Math.round(q.x), Math.round(q.y), c, a);
  };
  for (let m = 0; m < meridians; m++) {
    for (let k = 0; k <= steps; k++) {
      if (scatter > 0 && k % 3) continue;
      plot(pt(-Math.PI / 2 + (k / steps) * Math.PI, (m * Math.PI) / meridians, seed++));
    }
  }
  for (const lat of [-0.9, -0.45, 0, 0.45, 0.9]) {
    const n = Math.round(steps * 2 * Math.cos(lat));
    for (let k = 0; k < n; k++) {
      if (scatter > 0 && k % 3) continue;
      plot(pt(lat, (k / n) * 2 * Math.PI, seed++));
    }
  }

  // 3. Éclats de pixels quand la sphère se pose.
  const burst = s.burst ?? 0;
  if (burst > 0 && burst < 1) {
    const dist = r + 1 + burst * 7;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + 0.4;
      cv.blend(Math.round(cx + Math.cos(a) * dist), Math.round(cy + Math.sin(a) * dist), WHITE, (1 - burst) * alpha);
    }
  }
}

/** Le soleil synthwave de la route : dégradé jaune → rose tramé, bandes qui défilent. */
function drawSun(cv: Canvas, s: PixelSphere, frame: number) {
  const alpha = s.alpha ?? 1;
  const cx = s.x / PIXEL_SCALE;
  const cy = s.y / PIXEL_SCALE;
  const r = Math.max(2, s.r / PIXEL_SCALE);
  const halo = Math.max(2, r * 0.35);
  const stripeShift = Math.floor(frame / 5);
  for (let py = Math.floor(cy - r - halo); py <= Math.ceil(cy + r + halo); py++) {
    for (let px = Math.floor(cx - r - halo); px <= Math.ceil(cx + r + halo); px++) {
      const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      const b = BAYER[(py & 3) * 4 + (px & 3)];
      if (d > r) {
        const k = 1 - (d - r) / halo;
        if (k > 0 && b < 16 * k * k * 0.55) cv.blend(px, py, SUN[3], 0.55 * alpha);
        continue;
      }
      const v = (py + 0.5 - cy) / r;
      if (v > 0.12 && r >= 4) {
        const period = Math.max(3, Math.round(r / 3.2));
        const gap = 1 + Math.floor((v - 0.12) * (period - 1));
        if ((((py - Math.floor(cy) + stripeShift) % period) + period) % period < gap) continue;
      }
      const level = (1 - (v + 1) / 2) * (SUN.length - 1);
      const base = Math.floor(level);
      const idx = Math.min(SUN.length - 1, (level - base) * 16 > b ? base + 1 : base);
      cv.blend(px, py, d > r - 1 ? mix(SUN[idx], WHITE, 0.45) : SUN[idx], alpha);
    }
  }
}

/** Ellipse en pointillés qui défilent (trace d'orbite), en pixels de l'image. */
export type PixelOrbit = { x: number; y: number; rx: number; ry: number; alpha: number };

function drawOrbit(cv: Canvas, o: PixelOrbit, frame: number) {
  if (o.alpha <= 0) return;
  const n = Math.ceil((o.rx / PIXEL_SCALE) * 5);
  for (let i = 0; i < n; i++) {
    if (Math.floor(i / 3 + frame / 4) % 2) continue;
    const a = (i / n) * 2 * Math.PI;
    cv.blend(Math.round((o.x + Math.cos(a) * o.rx) / PIXEL_SCALE), Math.round((o.y + Math.sin(a) * o.ry) / PIXEL_SCALE), [61, 240, 255], o.alpha);
  }
}

export const PixelSpheres: React.FC<{
  width: number;
  height: number;
  frame: number;
  spheres: PixelSphere[];
  orbit?: PixelOrbit;
}> = ({ width, height, frame, spheres, orbit }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.ceil(width / PIXEL_SCALE);
  const h = Math.ceil(height / PIXEL_SCALE);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    const cv = new Canvas(img.data, w, h);
    if (orbit) drawOrbit(cv, orbit, frame);
    for (const s of spheres) drawSphere(cv, s, frame);
    ctx.putImageData(img, 0, 0);
  });

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
};
