// Petite boîte à outils de dessin en pixel art pour les écrans de contrôle (HUD) de l'acte 3 :
// une toile RGBA transparente, des traits, des rectangles, des disques, un tramage Bayer.

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export const C = {
  cyan: hex("#3df0ff"),
  pink: hex("#ff2bd6"),
  magenta: hex("#ff3d9a"),
  yellow: hex("#ffd319"),
  orange: hex("#ff8b2c"),
  violet: hex("#7b2cff"),
  green: hex("#3dff7a"),
  red: hex("#ff3b4e"),
  white: hex("#f4e9ff"),
  dim: hex("#3a2a5a"),
  faint: hex("#241a3a"),
};

export class Canvas {
  constructor(
    public data: Uint8ClampedArray,
    public w: number,
    public h: number,
  ) {}
  blend(x: number, y: number, c: RGB, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    const k = Math.min(1, a);
    const prev = this.data[i + 3] / 255;
    const out = k + prev * (1 - k);
    for (let j = 0; j < 3; j++) this.data[i + j] = (c[j] * k + this.data[i + j] * prev * (1 - k)) / (out || 1);
    this.data[i + 3] = out * 255;
  }
  rect(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) {
    for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) this.blend(x, y, c, a);
  }
  /** Rectangle tramé : densité 0 → 1. */
  dither(x0: number, y0: number, x1: number, y1: number, c: RGB, density: number, a = 1) {
    for (let y = Math.round(y0); y < Math.round(y1); y++)
      for (let x = Math.round(x0); x < Math.round(x1); x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 16 * density) this.blend(x, y, c, a);
  }
  frame(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) {
    this.line(x0, y0, x1, y0, c, a);
    this.line(x1, y0, x1, y1, c, a);
    this.line(x1, y1, x0, y1, c, a);
    this.line(x0, y1, x0, y0, c, a);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) this.blend(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
  }
  disc(cx: number, cy: number, r: number, c: RGB, a = 1) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.hypot(x - cx, y - cy) <= r) this.blend(x, y, c, a);
  }
  arc(cx: number, cy: number, r: number, from: number, to: number, c: RGB, a = 1, thick = 1) {
    const n = Math.max(8, Math.ceil(Math.abs(to - from) * r * 1.5));
    for (let i = 0; i <= n; i++) {
      const th = from + ((to - from) * i) / n;
      for (let k = 0; k < thick; k++) this.blend(cx + Math.cos(th) * (r - k), cy + Math.sin(th) * (r - k), c, a);
    }
  }
}
