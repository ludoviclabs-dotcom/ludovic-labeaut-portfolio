import React, { useLayoutEffect, useRef } from "react";

// Sphères en pixel art, dans le style de la route synthwave de l'acte 1 : dessinées dans une toile
// trois fois plus petite que l'image, puis agrandies sans lissage. Chaque sphère a :
//   · un ombrage en tramage ordonné (Bayer 4 × 4) sur cinq tons de sa couleur ;
//   · un reflet qui tourne lentement autour d'elle ;
//   · dans sa moitié basse, des bandes horizontales qui défilent, comme le soleil de la route ;
//   · un liseré clair et un halo tramé.
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
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const BLACK: RGB = [6, 3, 14];
const WHITE: RGB = [255, 250, 255];
const SUN = ["#e7258f", "#ff3d7f", "#ff5a55", "#ff7d36", "#ffa431", "#ffc93a", "#ffe156", "#fff4a8"].map(hex);

/** Cinq tons, du plus sombre au plus clair. */
const palette = (accent: string): RGB[] => {
  const c = hex(accent);
  return [mix(c, BLACK, 0.78), mix(c, BLACK, 0.45), c, mix(c, WHITE, 0.4), mix(c, WHITE, 0.78)];
};

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
  const cx = s.x / PIXEL_SCALE;
  const cy = s.y / PIXEL_SCALE;
  const r = Math.max(1.5, s.r / PIXEL_SCALE);
  const pal = s.sun ? SUN : palette(s.accent);
  const accent = s.sun ? SUN[3] : hex(s.accent);
  const phase = s.phase ?? 0;
  // Reflet tournant : direction de la lumière.
  const la = -2.3 + Math.sin((frame + phase * 40) / 34) * 0.55;
  const L = [Math.cos(la) * 0.62, Math.sin(la) * 0.62, 0.48];
  const stripeShift = Math.floor((frame + phase * 13) / 5);
  const halo = Math.max(2, r * 0.35);

  const x0 = Math.floor(cx - r - halo - 1);
  const x1 = Math.ceil(cx + r + halo + 1);
  const y0 = Math.floor(cy - r - halo - 1);
  const y1 = Math.ceil(cy + r + halo + 1);
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      const b = BAYER[(py & 3) * 4 + (px & 3)];
      if (d > r) {
        // Halo tramé, plus dense près du bord.
        const k = 1 - (d - r) / halo;
        if (k > 0 && b < 16 * k * k * 0.55) cv.blend(px, py, accent, 0.55 * alpha);
        continue;
      }
      const v = dy / r; // −1 en haut, +1 en bas
      // Bandes du soleil synthwave, de plus en plus larges vers le bas, qui défilent.
      if (v > 0.12 && r >= 4) {
        const period = Math.max(3, Math.round(r / 3.2));
        const gap = 1 + Math.floor((v - 0.12) * (period - 1));
        if ((((py - Math.floor(cy) + stripeShift) % period) + period) % period < gap) continue;
      }
      let level: number;
      if (s.sun) {
        level = (1 - (v + 1) / 2) * (pal.length - 1);
      } else {
        const nz = Math.sqrt(Math.max(0, 1 - (d / r) ** 2));
        const dot = (dx / r) * L[0] + (dy / r) * L[1] + nz * L[2];
        level = Math.min(1, Math.max(0, 0.42 + 0.62 * dot)) * (pal.length - 1);
      }
      const base = Math.floor(level);
      const idx = Math.min(pal.length - 1, (level - base) * 16 > b ? base + 1 : base);
      let c = pal[idx];
      if (d > r - 1) c = mix(c, WHITE, 0.45); // liseré
      cv.blend(px, py, c, alpha);
    }
  }
  // Éclats de pixels quand la sphère se pose.
  const burst = s.burst ?? 0;
  if (burst > 0 && burst < 1) {
    const dist = r + 1 + burst * 7;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + 0.4;
      cv.blend(Math.round(cx + Math.cos(a) * dist), Math.round(cy + Math.sin(a) * dist), WHITE, (1 - burst) * alpha);
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
