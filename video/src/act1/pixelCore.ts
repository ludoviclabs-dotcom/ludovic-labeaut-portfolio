// Noyau du moteur pixel art (toile de 320 × 240) : dimensions, projection, petites primitives.

export const PX_W = 320;
export const PX_H = 240;
export const HORIZON = 132;
export const FOCAL = 60;
export const ROAD = 0.75; // demi-largeur de la route (unités du monde)
export const RUMBLE = 0.09;
export const SPEED = 5; // unités du monde par seconde (v1 : 7 ; plus lent, plus « cinéma »)
export type RGB = [number, number, number];
export const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Pixels {
  data: Uint8ClampedArray;
  constructor(public img: ImageData) {
    this.data = img.data;
  }
  set(x: number, y: number, c: RGB) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= PX_W || y >= PX_H) return;
    const i = (y * PX_W + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = 255;
  }
  blend(x: number, y: number, c: RGB, a: number) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= PX_W || y >= PX_H || a <= 0) return;
    const i = (y * PX_W + x) * 4;
    this.data[i] += (c[0] - this.data[i]) * a;
    this.data[i + 1] += (c[1] - this.data[i + 1]) * a;
    this.data[i + 2] += (c[2] - this.data[i + 2]) * a;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(PX_W, (x | 0) + w);
    const y1 = Math.min(PX_H, (y | 0) + h);
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) this.set(i, j, c);
  }
  /** Rectangle aux bords flottants : les pixels partiellement couverts sont mélangés (anticrénelage). */
  fillF(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) {
    if (x1 <= x0 || y1 <= y0 || a <= 0) return;
    const ys = Math.max(0, Math.floor(y0));
    const ye = Math.min(PX_H, Math.ceil(y1));
    const xs = Math.max(0, Math.floor(x0));
    const xe = Math.min(PX_W, Math.ceil(x1));
    for (let y = ys; y < ye; y++) {
      const cy = Math.min(y + 1, y1) - Math.max(y, y0);
      for (let x = xs; x < xe; x++) {
        const cx = Math.min(x + 1, x1) - Math.max(x, x0);
        const k = a * cx * cy;
        if (k >= 0.999) this.set(x, y, c);
        else this.blend(x, y, c, k);
      }
    }
  }
}


/** Trait d'un point à un autre, en petits carrés (épaisseur w, en pixels de la toile). */
export function line(p: Pixels, x0: number, y0: number, x1: number, y1: number, c: RGB, w = 1, a = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    p.fillF(x - w / 2, y - w / 2, x + w / 2, y + w / 2, c, a);
  }
}
