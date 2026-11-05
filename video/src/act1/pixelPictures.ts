import { hex, line, Pixels, RGB } from "./pixelCore";

// Illustrations animées des panneaux de la route (pixel art), une par savoir-faire :
//   loupe        audit : la loupe parcourt les lignes d'un registre, chaque ligne vue est cochée
//   organigramme ingénierie sociétaire : une holding et ses filiales, liens qui s'allument
//   couts        calcul des coûts : barres qui montent, courbe du coût cumulé
//   cube         modélisation 3D : cube filaire qui tourne, sommets marqués
//   puce         circuit imprimé : une puce, ses pistes, des impulsions qui circulent
//   reseau       connexion d'applications : nœuds reliés, paquets qui transitent
// Chaque dessin occupe le rectangle intérieur du panneau, en coordonnées (u, v) de 0 à 1.

export type Picture = "loupe" | "organigramme" | "couts" | "cube" | "puce" | "reseau";

const YELLOW = hex("#ffd319");
const CYAN = hex("#3df0ff");
const PINK = hex("#ff2bd6");
const WHITE = hex("#f4e9ff");
const DIM = hex("#5a3a8a");

type Rect = { x0: number; y0: number; x1: number; y1: number };

export function drawPicture(p: Pixels, kind: Picture, r: Rect, t: number, fade: number) {
  const W = r.x1 - r.x0;
  const H = r.y1 - r.y0;
  const X = (u: number) => r.x0 + u * W;
  const Y = (v: number) => r.y0 + v * H;
  const lw = Math.max(0.8, H * 0.045); // épaisseur des traits
  const box = (u0: number, v0: number, u1: number, v1: number, c: RGB, a = 1) => {
    line(p, X(u0), Y(v0), X(u1), Y(v0), c, lw, a * fade);
    line(p, X(u1), Y(v0), X(u1), Y(v1), c, lw, a * fade);
    line(p, X(u1), Y(v1), X(u0), Y(v1), c, lw, a * fade);
    line(p, X(u0), Y(v1), X(u0), Y(v0), c, lw, a * fade);
  };
  const seg = (u0: number, v0: number, u1: number, v1: number, c: RGB, a = 1, w = lw) => line(p, X(u0), Y(v0), X(u1), Y(v1), c, w, a * fade);
  const dot = (u: number, v: number, s: number, c: RGB, a = 1) => p.fillF(X(u) - s, Y(v) - s, X(u) + s, Y(v) + s, c, a * fade);

  if (kind === "loupe") {
    // Registre : 4 lignes ; la loupe passe sur chacune, puis la coche apparaît.
    const rows = [0.18, 0.4, 0.62, 0.84];
    const k = (t * 0.9) % rows.length;
    rows.forEach((v, i) => {
      seg(0.06, v, 0.62, v, DIM);
      seg(0.06, v, 0.06 + 0.12 + 0.1 * ((i * 7) % 3), v, WHITE, 0.8);
      seg(0.68, v, 0.78, v, WHITE, 0.8);
      if (i < Math.floor(k)) {
        seg(0.86, v, 0.89, v + 0.07, CYAN);
        seg(0.89, v + 0.07, 0.95, v - 0.08, CYAN);
      }
    });
    const v = rows[Math.floor(k)];
    const u = 0.1 + (k % 1) * 0.55;
    const rad = 0.16;
    for (let a = 0; a < 24; a++) {
      const th = (a / 24) * 2 * Math.PI;
      dot(u + (Math.cos(th) * rad * H) / W, v + Math.sin(th) * rad, lw * 0.55, YELLOW);
    }
    seg(u + (rad * 0.7 * H) / W, v + rad * 0.7, u + (rad * 1.6 * H) / W, v + rad * 1.6, YELLOW, 1, lw * 1.6);
  } else if (kind === "organigramme") {
    // Holding, trois filiales ; un lien s'allume à tour de rôle.
    const on = Math.floor(t * 2.5) % 3;
    box(0.38, 0.06, 0.62, 0.32, YELLOW);
    seg(0.5, 0.32, 0.5, 0.5, WHITE);
    seg(0.17, 0.5, 0.83, 0.5, WHITE);
    [0.17, 0.5, 0.83].forEach((u, i) => {
      seg(u, 0.5, u, 0.64, i === on ? CYAN : WHITE, 1, i === on ? lw * 1.5 : lw);
      box(u - 0.12, 0.64, u + 0.12, 0.92, i === on ? CYAN : WHITE);
    });
  } else if (kind === "couts") {
    // Barres qui montent l'une après l'autre, courbe du coût cumulé.
    const h = [0.32, 0.5, 0.42, 0.66, 0.58, 0.8];
    const grow = (t * 1.2) % 1.6;
    seg(0.04, 0.94, 0.96, 0.94, WHITE);
    seg(0.04, 0.06, 0.04, 0.94, WHITE);
    let prev: [number, number] | null = null;
    h.forEach((hh, i) => {
      const u = 0.12 + i * 0.145;
      const g = Math.min(1, Math.max(0, grow * 6 - i));
      const top = 0.94 - hh * 0.8 * g;
      p.fillF(X(u - 0.045), Y(top), X(u + 0.045), Y(0.94), i % 2 ? PINK : CYAN, 0.9 * fade);
      const cum = 0.9 - ((i + 1) / h.length) * 0.78;
      if (prev && g > 0) seg(prev[0], prev[1], u, cum, YELLOW, 1, lw * 1.2);
      if (g > 0) prev = [u, cum];
    });
  } else if (kind === "cube") {
    // Cube filaire qui tourne (le cube de départ d'un logiciel 3D), sommets en orange.
    const a = t * 1.1;
    const b = 0.5;
    const pts = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])));
    const proj = pts.map(([x, y, z]) => {
      const x1 = x * Math.cos(a) - z * Math.sin(a);
      const z1 = x * Math.sin(a) + z * Math.cos(a);
      const y1 = y * Math.cos(b) - z1 * Math.sin(b);
      const s = 0.3 * H;
      return [r.x0 + W / 2 + x1 * s, r.y0 + H / 2 + y1 * s] as const;
    });
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        const diff = pts[i].filter((v, k) => v !== pts[j][k]).length;
        if (diff === 1) line(p, proj[i][0], proj[i][1], proj[j][0], proj[j][1], CYAN, lw, fade);
      }
    }
    proj.forEach(([x, y]) => p.fillF(x - lw, y - lw, x + lw, y + lw, hex("#ff8b2c"), fade));
  } else if (kind === "puce") {
    // Puce centrale, pistes vers les bords, impulsions qui partent de la puce.
    box(0.4, 0.25, 0.6, 0.75, YELLOW);
    p.fillF(X(0.43), Y(0.32), X(0.57), Y(0.68), hex("#2a1050"), fade);
    const tracks: [number, number, number, number, number, number][] = [
      [0.4, 0.35, 0.25, 0.35, 0.06, 0.15],
      [0.4, 0.5, 0.2, 0.5, 0.06, 0.5],
      [0.4, 0.65, 0.25, 0.65, 0.06, 0.85],
      [0.6, 0.35, 0.75, 0.35, 0.94, 0.15],
      [0.6, 0.5, 0.8, 0.5, 0.94, 0.5],
      [0.6, 0.65, 0.75, 0.65, 0.94, 0.85],
    ];
    tracks.forEach(([u0, v0, u1, v1, u2, v2], i) => {
      seg(u0, v0, u1, v1, DIM);
      seg(u1, v1, u2, v2, DIM);
      dot(u2, v2, lw * 0.9, YELLOW);
      const q = (t * 1.4 + i * 0.17) % 1;
      const [pu, pv] = q < 0.5 ? [u0 + (u1 - u0) * q * 2, v0 + (v1 - v0) * q * 2] : [u1 + (u2 - u1) * (q - 0.5) * 2, v1 + (v2 - v1) * (q - 0.5) * 2];
      dot(pu, pv, lw * 0.9, CYAN);
    });
  } else {
    // Réseau : cinq applications reliées, des paquets circulent sur les liens.
    const nodes: [number, number][] = [
      [0.12, 0.3],
      [0.35, 0.75],
      [0.55, 0.22],
      [0.75, 0.7],
      [0.9, 0.3],
    ];
    const edges = [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 3],
      [2, 4],
      [3, 4],
    ];
    edges.forEach(([i, j], e) => {
      const [u0, v0] = nodes[i];
      const [u1, v1] = nodes[j];
      seg(u0, v0, u1, v1, DIM);
      const q = (t * 0.9 + e * 0.31) % 1;
      dot(u0 + (u1 - u0) * q, v0 + (v1 - v0) * q, lw * 0.8, CYAN);
    });
    nodes.forEach(([u, v], i) => {
      const s = H * 0.09;
      p.fillF(X(u) - s, Y(v) - s, X(u) + s, Y(v) + s, i % 2 ? PINK : YELLOW, fade);
    });
  }
}
