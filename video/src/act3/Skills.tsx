import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { SKILLS } from "../content";
import { PIXEL, SANS, SERIF, SITE } from "../theme";
import { BEAT_SEC, FPS } from "../timeline";
import { enter, fr, leave, prog } from "./anim";
import { BAYER, C, Canvas, hex, mix, type RGB } from "./pixelKit";
import { useSlot } from "./slot";
import { Grid, Vignette } from "./ui";

// « Ce que je sais faire » (3 mesures) : six écrans de contrôle animés, en pixel art et en police
// de terminal, qui apparaissent un par temps puis tournent ensemble :
//   audit (balayage d'un registre, anomalies, jauge, liste de contrôles), ingénierie sociétaire
//   (holding, filiales, flux de capital et de dividendes), modélisation 3D (maillage qui se construit
//   et pivote sur une grille de conception, axes X/Y/Z), visuels et fonctionnalités (composants
//   d'interface qui s'assemblent), skills et automatisation (déclencheur, tâches en chaîne,
//   engrenages), connexion d'applications (concentrateur API, paquets de données).

const BEAT = BEAT_SEC * FPS;
const SCALE = 2; // un pixel de la toile = 2 pixels de l'image
const APPEAR = (k: number) => 14 + k * BEAT;

type Tile = (typeof SKILLS.tiles)[number];
type Draw = (cv: Canvas, w: number, h: number, lt: number, accent: RGB) => void;

// ------------------------------------------------------------------ les six dessins

const drawAudit: Draw = (cv, w, h, lt, accent) => {
  const left = Math.round(w * 0.5);
  const rows = 8;
  const rowH = (h - 12) / rows;
  const scan = 6 + ((lt * 1.6) % (h - 12));
  const anomalies = [2, 6];
  for (let i = 0; i < rows; i++) {
    const y = 6 + i * rowH + rowH / 2;
    const len = 0.28 + 0.4 * ((i * 37) % 10) / 10;
    cv.rect(8, y - 1, 8 + (left - 30) * len, y + 1, C.dim);
    cv.rect(left - 18, y - 1, left - 6, y + 1, C.dim);
    const seen = lt * 1.6 > 6 + i * rowH + rowH;
    if (seen && anomalies.includes(i)) {
      const on = Math.floor(lt / 6) % 2 === 0;
      cv.frame(5, y - rowH / 2 + 1, left - 3, y + rowH / 2 - 1, C.magenta, on ? 1 : 0.5);
      cv.rect(left - 2, y - 3, left, y + 2, C.magenta); // « ! »
      cv.rect(left - 2, y + 3, left, y + 4, C.magenta);
    } else if (seen) {
      cv.rect(8, y - 1, 8 + (left - 30) * len, y + 1, mix(C.dim, accent, 0.6));
    }
  }
  // Ligne de balayage et sa traîne tramée.
  cv.rect(4, scan, left, scan + 1, C.cyan);
  for (let k = 1; k < 10; k++) cv.dither(4, scan - k, left, scan - k + 1, C.cyan, 0.5 * (1 - k / 10), 0.6);
  // Jauge de couverture.
  const gx = left + (w - left) / 2;
  const gy = h * 0.27;
  const gr = Math.min((w - left) * 0.32, h * 0.2);
  const p = Math.min(1, lt / 100);
  cv.arc(gx, gy, gr, Math.PI * 0.75, Math.PI * 2.25, C.faint, 1, 3);
  cv.arc(gx, gy, gr, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * p), p >= 1 ? C.green : C.cyan, 1, 3);
};

const drawGroupe: Draw = (cv, w, h, lt, accent) => {
  const boxes = groupBoxes(w, h);
  const grow = prog(lt, 0, 24);
  const edge = (a: number, b: number) => {
    const A = boxes[a];
    const B = boxes[b];
    const midY = (A.y + A.h / 2 + (B.y - B.h / 2)) / 2;
    const pts: [number, number][] = [
      [A.x, A.y + A.h / 2],
      [A.x, midY],
      [B.x, midY],
      [B.x, B.y - B.h / 2],
    ];
    let total = 0;
    const segs = pts.slice(1).map((q, i) => {
      const l = Math.abs(q[0] - pts[i][0]) + Math.abs(q[1] - pts[i][1]);
      total += l;
      return l;
    });
    // Tracé progressif.
    let left = total * grow;
    pts.slice(1).forEach((q, i) => {
      const f = Math.min(1, left / segs[i]);
      left -= segs[i];
      if (f > 0) cv.line(pts[i][0], pts[i][1], pts[i][0] + (q[0] - pts[i][0]) * f, pts[i][1] + (q[1] - pts[i][1]) * f, C.dim);
    });
    if (grow < 1) return;
    // Flux : capital qui descend (cyan), dividendes qui remontent (jaune).
    const at = (u: number) => {
      let d = u * total;
      for (let i = 0; i < segs.length; i++) {
        if (d <= segs[i]) {
          const f = d / segs[i];
          return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
        }
        d -= segs[i];
      }
      return pts[pts.length - 1];
    };
    const u = ((lt + a * 7 + b * 11) % 40) / 40;
    const [dx, dy] = at(u);
    cv.rect(dx - 1, dy - 1, dx + 2, dy + 2, C.cyan);
    const [ux, uy] = at(1 - u);
    cv.rect(ux - 1, uy - 1, ux + 2, uy + 2, C.yellow);
  };
  edge(0, 1);
  edge(0, 2);
  edge(0, 3);
  edge(3, 4);
  boxes.forEach((b, i) => {
    const a = prog(lt, i * 4, i * 4 + 10);
    cv.dither(b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, b.y + b.h / 2, accent, 0.08, a);
    cv.frame(b.x - b.w / 2, b.y - b.h / 2, b.x + b.w / 2, b.y + b.h / 2, i === 0 ? C.yellow : accent, a);
  });
};
const groupBoxes = (w: number, h: number) => [
  { x: w * 0.5, y: h * 0.16, w: w * 0.3, h: h * 0.18 },
  { x: w * 0.17, y: h * 0.52, w: w * 0.27, h: h * 0.16 },
  { x: w * 0.5, y: h * 0.52, w: w * 0.27, h: h * 0.16 },
  { x: w * 0.83, y: h * 0.52, w: w * 0.27, h: h * 0.16 },
  { x: w * 0.83, y: h * 0.86, w: w * 0.3, h: h * 0.16 },
];

// Avion à aile delta, maillage simplifié (clin d'œil aux maquettes Blender de Panoplie).
const MESH_V: [number, number, number][] = [
  [0, 0, 3.2], [0, 0.45, 1.3], [0, 0.3, -1.0], [0, 0.15, -2.6], [0, 1.3, -2.4],
  [-2.3, 0, -1.6], [2.3, 0, -1.6], [-0.45, 0, 1.0], [0.45, 0, 1.0], [-0.5, 0, -2.2],
  [0.5, 0, -2.2], [-1.0, 0.05, 1.9], [1.0, 0.05, 1.9], [0, -0.35, 0.4],
];
const MESH_E: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [2, 4], [0, 7], [0, 8], [0, 13], [13, 7], [13, 8], [7, 5], [8, 6], [5, 9],
  [6, 10], [9, 3], [10, 3], [7, 9], [8, 10], [1, 7], [1, 8], [11, 7], [12, 8], [11, 0], [12, 0], [13, 9], [13, 10],
];
export const MESH_STATS = { vertices: MESH_V.length, edges: MESH_E.length };

const drawMesh: Draw = (cv, w, h, lt, accent) => {
  // Grille de conception en perspective.
  const hor = h * 0.42;
  for (let i = -8; i <= 8; i++) cv.line(w / 2 + i * w * 0.02, hor, w / 2 + i * w * 0.16, h, C.faint);
  for (let j = 1; j <= 6; j++) {
    const y = hor + (h - hor) * Math.pow(j / 6, 1.8);
    cv.line(0, y, w, y, C.faint);
  }
  // Axes X / Y / Z (rouge, vert, bleu), en bas à gauche.
  const o = { x: 14, y: h - 12 };
  cv.line(o.x, o.y, o.x + 16, o.y + 3, C.red);
  cv.line(o.x, o.y, o.x, o.y - 16, C.green);
  cv.line(o.x, o.y, o.x + 8, o.y - 8, hex("#4d7dff"));
  // Le maillage se construit arête par arête, puis pivote.
  const yaw = lt * 0.035 + 0.6;
  const pitch = 0.42;
  const s = Math.min(w, h) * 0.15;
  const P = MESH_V.map(([x, y, z]) => {
    const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
    const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
    const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    return [w * 0.56 + x1 * s, h * 0.45 - y1 * s] as const;
  });
  const shown = Math.min(MESH_E.length, Math.floor(lt * 0.9));
  const vis = new Set<number>();
  MESH_E.slice(0, shown).forEach(([a, b]) => {
    cv.line(P[a][0], P[a][1], P[b][0], P[b][1], accent);
    vis.add(a);
    vis.add(b);
  });
  if (shown < MESH_E.length) {
    const [a, b] = MESH_E[shown];
    const f = (lt * 0.9) % 1;
    cv.line(P[a][0], P[a][1], P[a][0] + (P[b][0] - P[a][0]) * f, P[a][1] + (P[b][1] - P[a][1]) * f, C.white);
  }
  vis.forEach((i) => cv.rect(P[i][0] - 1, P[i][1] - 1, P[i][0] + 2, P[i][1] + 2, C.orange));
};

const drawUi: Draw = (cv, w, h, lt, accent) => {
  const cards = [
    { x0: 0.04, y0: 0.05, x1: 0.96, y1: 0.16, from: [0, -0.4] },
    { x0: 0.04, y0: 0.23, x1: 0.53, y1: 0.95, from: [-0.6, 0] },
    { x0: 0.57, y0: 0.23, x1: 0.96, y1: 0.55, from: [0.6, 0] },
    { x0: 0.57, y0: 0.62, x1: 0.96, y1: 0.95, from: [0, 0.6] },
  ];
  cards.forEach((c, i) => {
    const p = prog(lt, i * 8, i * 8 + 14);
    const over = p < 1 ? 0 : Math.max(0, 1 - (lt - i * 8 - 14) / 6) * 0.02;
    const dx = (1 - p) * c.from[0] * w;
    const dy = (1 - p) * c.from[1] * h - over * h;
    const X0 = c.x0 * w + dx;
    const Y0 = c.y0 * h + dy;
    const X1 = c.x1 * w + dx;
    const Y1 = c.y1 * h + dy;
    cv.dither(X0, Y0, X1, Y1, accent, 0.12, p);
    cv.frame(X0, Y0, X1, Y1, i === 0 ? accent : C.white, 0.85 * p);
    if (p < 1) return;
    if (i === 0) {
      for (let k = 0; k < 3; k++) cv.disc(X0 + 6 + k * 6, (Y0 + Y1) / 2, 1.5, [C.red, C.yellow, C.green][k]);
      for (let k = 0; k < 3; k++) cv.rect(X1 - 14 - k * 16, (Y0 + Y1) / 2 - 1, X1 - 4 - k * 16, (Y0 + Y1) / 2 + 1, C.dim);
    } else if (i === 1) {
      // Graphique : barres qui montent, courbe.
      const n = 7;
      let prev: [number, number] | null = null;
      for (let k = 0; k < n; k++) {
        const g = prog(lt, 34 + k * 3, 46 + k * 3);
        const hh = (0.25 + 0.6 * (((k * 5 + 3) % 7) / 7)) * (Y1 - Y0 - 10) * g;
        const x = X0 + 6 + k * ((X1 - X0 - 12) / n);
        cv.rect(x, Y1 - 4 - hh, x + (X1 - X0 - 12) / n - 3, Y1 - 4, k % 2 ? C.pink : C.cyan, 0.9);
        const pt: [number, number] = [x + 3, Y1 - 4 - hh - 3];
        if (prev && g > 0) cv.line(prev[0], prev[1], pt[0], pt[1], C.yellow);
        if (g > 0) prev = pt;
      }
    } else if (i === 2) {
      // Indicateurs : trois lignes et une courbe.
      for (let k = 0; k < 3; k++) cv.rect(X0 + 5, Y0 + 6 + k * 6, X0 + 5 + (X1 - X0 - 10) * (0.4 + 0.2 * k), Y0 + 8 + k * 6, k ? C.dim : C.white);
      for (let x = X0 + 5; x < X1 - 5; x++) cv.blend(x, Y1 - 8 - 4 * Math.sin((x + lt) * 0.18), C.green);
    } else {
      // Interrupteur et bouton, avec un pointeur qui clique.
      const on = Math.floor(lt / 40) % 2 === 1;
      cv.frame(X0 + 6, Y0 + 6, X0 + 26, Y0 + 14, C.white);
      cv.rect(on ? X0 + 17 : X0 + 8, Y0 + 8, on ? X0 + 25 : X0 + 16, Y0 + 13, on ? C.green : C.dim);
      const bx0 = X0 + 6;
      const by0 = Y1 - 16;
      cv.rect(bx0, by0, X1 - 6, Y1 - 6, accent, 0.85);
      const q = (lt % 60) / 60;
      const cx = X1 - 4 - (1 - Math.min(1, q * 2)) * 30;
      const cy = Y1 - 11 + (1 - Math.min(1, q * 2)) * 10;
      if (q > 0.5) cv.frame(bx0 - (q - 0.5) * 8, by0 - (q - 0.5) * 8, X1 - 6 + (q - 0.5) * 8, Y1 - 6 + (q - 0.5) * 8, C.white, 1 - (q - 0.5) * 2);
      for (let k = 0; k < 6; k++) cv.line(cx, cy, cx + k * 0.5, cy + 6 - k * 0.3, C.white);
    }
  });
};

const drawAuto: Draw = (cv, w, h, lt, accent) => {
  // Engrenages qui tournent.
  const gear = (gx: number, gy: number, r: number, teeth: number, rot: number, c: RGB) => {
    cv.arc(gx, gy, r, 0, Math.PI * 2, c, 1, 2);
    cv.arc(gx, gy, r * 0.35, 0, Math.PI * 2, c, 1, 1);
    for (let k = 0; k < teeth; k++) {
      const a = rot + (k * 2 * Math.PI) / teeth;
      cv.rect(gx + Math.cos(a) * (r + 1.5) - 1, gy + Math.sin(a) * (r + 1.5) - 1, gx + Math.cos(a) * (r + 1.5) + 2, gy + Math.sin(a) * (r + 1.5) + 2, c);
    }
  };
  gear(w * 0.84, h * 0.3, h * 0.14, 10, lt * 0.06, accent);
  gear(w * 0.84 - h * 0.25, h * 0.3 + h * 0.13, h * 0.09, 7, -lt * 0.09, C.yellow);
  // Chaîne de tâches : quatre étapes, un jeton qui avance, chaque étape faite passe au vert.
  const n = 4;
  const y = h * 0.86;
  const step = Math.min(n, Math.floor(lt / 18));
  for (let k = 0; k < n; k++) {
    const x = w * 0.08 + k * (w * 0.84) / (n - 1);
    if (k < n - 1) cv.line(x + 6, y, x + (w * 0.84) / (n - 1) - 6, y, C.dim);
    cv.frame(x - 5, y - 5, x + 5, y + 5, k < step ? C.green : C.white);
    if (k < step) cv.rect(x - 3, y - 3, x + 4, y + 4, C.green, 0.6);
  }
  if (step < n) {
    const f = (lt % 18) / 18;
    const x = w * 0.08 + (step - 1 + f) * (w * 0.84) / (n - 1);
    if (step > 0) cv.rect(x - 1, y - 1, x + 2, y + 2, C.cyan);
  }
  // Éclair du déclencheur, qui clignote au départ.
  if (lt < 18 ? Math.floor(lt / 3) % 2 === 0 : true) {
    const ex = w * 0.66;
    const ey = h * 0.08;
    cv.line(ex + 4, ey, ex, ey + 6, C.yellow);
    cv.line(ex, ey + 6, ex + 4, ey + 6, C.yellow);
    cv.line(ex + 4, ey + 6, ex, ey + 12, C.yellow);
  }
};

const apiNodes = (w: number, h: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 6;
    return { x: w / 2 + Math.cos(a) * w * 0.36, y: h * 0.52 + Math.sin(a) * h * 0.36 };
  });

const drawApi: Draw = (cv, w, h, lt, accent) => {
  const hub = { x: w / 2, y: h * 0.52 };
  const nodes = apiNodes(w, h);
  const pulse = 0.6 + 0.4 * Math.sin(lt * 0.2);
  nodes.forEach((n, k) => {
    const grow = prog(lt, k * 3, k * 3 + 10);
    cv.line(hub.x, hub.y, hub.x + (n.x - hub.x) * grow, hub.y + (n.y - hub.y) * grow, C.dim);
    if (grow < 1) return;
    // Paquet aller (cyan) puis retour (rose) ; le nœud s'allume à l'arrivée.
    const q = ((lt + k * 9) % 36) / 36;
    const out = q < 0.5;
    const f = out ? q * 2 : 2 - q * 2;
    cv.rect(hub.x + (n.x - hub.x) * f - 1, hub.y + (n.y - hub.y) * f - 1, hub.x + (n.x - hub.x) * f + 2, hub.y + (n.y - hub.y) * f + 2, out ? C.cyan : C.pink);
    const lit = Math.abs(q - 0.5) < 0.08;
    cv.dither(n.x - 17, n.y - 7, n.x + 17, n.y + 7, accent, lit ? 0.45 : 0.06);
    cv.frame(n.x - 17, n.y - 7, n.x + 17, n.y + 7, lit ? C.white : accent);
  });
  for (let r = 9; r > 0; r--) cv.disc(hub.x, hub.y, r, mix(accent, C.white, 1 - r / 9), r === 9 ? 0.3 * pulse : 0.15);
  cv.arc(hub.x, hub.y, 11 + pulse * 2, 0, Math.PI * 2, accent, 0.8);
};

const DRAW: Record<string, Draw> = { audit: drawAudit, groupe: drawGroupe, mesh: drawMesh, ui: drawUi, auto: drawAuto, api: drawApi };

// ------------------------------------------------------------------ la tuile

const TileCanvas: React.FC<{ tile: Tile; w: number; h: number; lt: number }> = ({ tile, w, h, lt }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const cw = Math.ceil(w / SCALE);
  const ch = Math.ceil(h / SCALE);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(cw, ch);
    const cv = new Canvas(img.data, cw, ch);
    DRAW[tile.key](cv, cw, ch, Math.max(0, lt), hex(tile.accent));
    // Lignes de balayage sur toute la tuile.
    for (let y = 1; y < ch; y += 2) for (let x = 0; x < cw; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 3) cv.blend(x, y, [0, 0, 0], 0.4);
    ctx.putImageData(img, 0, 0);
  });
  return <canvas ref={ref} width={cw} height={ch} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />;
};

const SkillTile: React.FC<{ tile: Tile; index: number; x: number; y: number; w: number; h: number; t: number; landscape: boolean }> = ({
  tile,
  index,
  x,
  y,
  w,
  h,
  t,
  landscape,
}) => {
  const lt = t - APPEAR(index);
  const p = prog(t, APPEAR(index), APPEAR(index) + 12);
  const head = landscape ? 52 : 50;
  const bodyH = h - head;
  const cw = Math.ceil(w / SCALE);
  const chh = Math.ceil(bodyH / SCALE);
  const toPx = (u: number, v: number) => ({ left: u * SCALE, top: head + v * SCALE });
  const mono: React.CSSProperties = { position: "absolute", fontFamily: PIXEL, color: SITE.ink, whiteSpace: "nowrap", lineHeight: 1 };
  const chip: React.CSSProperties = { ...mono, background: "rgba(10, 8, 18, 0.9)", padding: "2px 6px", borderRadius: 3 };

  // Textes posés sur les dessins (en police de terminal, nets).
  let overlay: React.ReactNode = null;
  if (tile.key === "audit") {
    overlay = tile.lines.map((l, i) => (
      <div
        key={l}
        style={{
          ...mono,
          left: w * 0.54,
          top: head + bodyH * (0.52 + i * 0.15),
          fontSize: landscape ? 22 : 18,
          color: l.startsWith("[!!]") ? "#ff3d9a" : "#3dff7a",
          opacity: prog(lt, 30 + i * 18, 34 + i * 18),
        }}
      >
        {fr(l)}
      </div>
    ));
  } else if (tile.key === "groupe") {
    overlay = groupBoxes(cw, chh).map((b, i) => {
      const pos = toPx(b.x, b.y);
      return (
        <div key={i} style={{ ...chip, left: pos.left, top: pos.top, translate: "-50% -50%", fontSize: landscape ? 20 : 17, opacity: prog(lt, i * 4 + 6, i * 4 + 12) }}>
          {tile.lines[i]}
        </div>
      );
    });
  } else if (tile.key === "mesh") {
    overlay = (
      <div style={{ ...mono, right: 12, bottom: 10, fontSize: landscape ? 20 : 17, color: "#ff8b2c", opacity: prog(lt, 30, 36) }}>
        {MESH_STATS.vertices} sommets · {MESH_STATS.edges} arêtes
      </div>
    );
  } else if (tile.key === "auto") {
    overlay = tile.lines.map((l, i) => {
      const startAt = i * 18;
      const chars = Math.max(0, Math.min(l.length, Math.floor((lt - startAt) * 2.2)));
      return (
        <div
          key={l}
          style={{
            ...mono,
            left: 14,
            top: head + 10 + i * (landscape ? 30 : 26),
            fontSize: landscape ? 23 : 19,
            color: i === 0 ? "#3df0ff" : l.endsWith("OK") && chars === l.length ? "#3dff7a" : SITE.ink,
          }}
        >
          {fr(l.slice(0, chars))}
        </div>
      );
    });
  } else if (tile.key === "api") {
    const nodes = [{ x: cw / 2, y: chh * 0.52 }, ...apiNodes(cw, chh)];
    overlay = nodes.map((n, i) => {
      const pos = toPx(n.x, n.y);
      return (
        <div
          key={i}
          style={{
            ...(i === 0 ? mono : chip),
            left: pos.left,
            top: pos.top,
            translate: "-50% -50%",
            fontSize: i === 0 ? (landscape ? 22 : 19) : landscape ? 18 : 15,
            color: i === 0 ? "#ffffff" : SITE.ink,
            textShadow: i === 0 ? "0 0 4px #000, 0 0 2px #000" : undefined,
            opacity: prog(lt, i * 3 + 6, i * 3 + 12),
          }}
        >
          {tile.lines[i]}
        </div>
      );
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity: p,
        scale: String(0.92 + 0.08 * p),
        border: `1px solid ${tile.accent}88`,
        borderRadius: 10,
        background: "rgba(10, 8, 18, 0.88)",
        boxShadow: `0 0 ${18 * p}px ${tile.accent}33, inset 0 0 30px rgba(0,0,0,0.5)`,
        overflow: "hidden",
      }}
    >
      {/* En-tête : numéro, titre, légende */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: head,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          borderBottom: `1px solid ${tile.accent}44`,
          fontFamily: SANS,
        }}
      >
        <span style={{ fontFamily: PIXEL, fontSize: landscape ? 24 : 22, color: tile.accent }}>{String(index + 1).padStart(2, "0")}</span>
        <span style={{ fontWeight: 600, fontSize: landscape ? 23 : 20, color: SITE.ink, whiteSpace: "nowrap" }}>{fr(tile.title)}</span>
        {landscape ? (
          <span style={{ marginLeft: "auto", fontSize: 16, letterSpacing: "0.12em", textTransform: "uppercase", color: SITE.inkFaint, whiteSpace: "nowrap" }}>
            {fr(tile.caption)}
          </span>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: head, height: bodyH }}>
        <TileCanvas tile={tile} w={w} h={bodyH} lt={lt} />
      </div>
      {overlay}
    </div>
  );
};

export const SkillsCard: React.FC = () => {
  const { t, dur, landscape, width } = useSlot();
  const out = leave(t, dur - 12, dur);
  const cols = landscape ? 3 : 2;
  const tw = landscape ? 540 : 452;
  const th = landscape ? 362 : 330;
  const gap = landscape ? 30 : 22;
  const x0 = (width - (cols * tw + (cols - 1) * gap)) / 2;
  const y0 = landscape ? 196 : 186;

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, #1b1d22 0%, ${SITE.bg} 62%)` }} />
      <Grid opacity={0.4} size={landscape ? 72 : 64} at="50% 45%" />
      <Vignette />
      <AbsoluteFill style={out}>
        <div
          style={{
            ...enter(t, 0, 20, 16),
            position: "absolute",
            left: 0,
            right: 0,
            top: landscape ? 110 : 108,
            translate: "0 -50%",
            textAlign: "center",
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: landscape ? 68 : 60,
            color: SITE.ink,
          }}
        >
          {fr(SKILLS.title)}
        </div>
        {SKILLS.tiles.map((tile, k) => (
          <SkillTile
            key={tile.key}
            tile={tile}
            index={k}
            x={x0 + (k % cols) * (tw + gap)}
            y={y0 + Math.floor(k / cols) * (th + gap)}
            w={tw}
            h={th}
            t={t}
            landscape={landscape}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
