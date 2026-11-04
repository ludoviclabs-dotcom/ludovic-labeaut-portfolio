import React, { useMemo } from "react";
import { random } from "remotion";

// Visuel dessiné en code pour « IA & robotique » (pas de photo sur le site) : une chaîne de valeur
// en couches (des composants vers les usages), des liens qui se tracent de gauche à droite et des
// impulsions qui les parcourent. Aucun chiffre, aucun libellé : un motif, pas une donnée.

type Node = { x: number; y: number; layer: number; r: number };
type Link = { a: number; b: number; len: number };

const LAYERS = [3, 5, 6, 5, 3];

export const NetworkVisual: React.FC<{ width: number; height: number; t: number; accent: string }> = ({ width, height, t, accent }) => {
  const { nodes, links } = useMemo(() => {
    const padX = width * 0.12;
    const padY = height * 0.14;
    const ns: Node[] = [];
    LAYERS.forEach((count, l) => {
      for (let i = 0; i < count; i++) {
        const x = padX + ((width - 2 * padX) * l) / (LAYERS.length - 1) + (random(`nx-${l}-${i}`) - 0.5) * width * 0.04;
        const y = padY + ((height - 2 * padY) * (i + 0.5)) / count + (random(`ny-${l}-${i}`) - 0.5) * height * 0.05;
        ns.push({ x, y, layer: l, r: 3.5 + random(`nr-${l}-${i}`) * 3.5 });
      }
    });
    const ls: Link[] = [];
    ns.forEach((n, ai) => {
      const next = ns.map((m, bi) => ({ m, bi })).filter(({ m }) => m.layer === n.layer + 1);
      next.forEach(({ m, bi }) => {
        const d = Math.abs(m.y - n.y) / height;
        if (random(`lk-${ai}-${bi}`) > 0.25 + d * 1.4) {
          ls.push({ a: ai, b: bi, len: Math.hypot(m.x - n.x, m.y - n.y) });
        }
      });
    });
    return { nodes: ns, links: ls };
  }, [width, height]);

  // Révélation couche par couche (≈ 0,25 s par couche), puis respiration lente.
  const layerIn = (l: number) => Math.min(1, Math.max(0, (t - 10 - l * 8) / 14));
  const float = (i: number) => Math.sin(t / 34 + i * 1.7) * height * 0.008;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="nv-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill="url(#nv-glow)" />
      {/* Colonnes des couches */}
      {LAYERS.map((_, l) => {
        const x = width * 0.12 + ((width * 0.76) * l) / (LAYERS.length - 1);
        return (
          <line
            key={`col-${l}`}
            x1={x}
            x2={x}
            y1={height * 0.08}
            y2={height * 0.92}
            stroke="rgba(244,241,234,0.08)"
            strokeDasharray="2 8"
            opacity={layerIn(l)}
          />
        );
      })}
      {links.map((lk, i) => {
        const a = nodes[lk.a];
        const b = nodes[lk.b];
        const p = Math.min(layerIn(a.layer), 1) * Math.min(1, Math.max(0, (t - 16 - a.layer * 8) / 16));
        const ya = a.y + float(lk.a);
        const yb = b.y + float(lk.b);
        // Impulsion qui parcourt le lien, décalée pour chaque lien.
        const speed = 50 + random(`sp-${i}`) * 40;
        const phase = ((t + random(`ph-${i}`) * speed) % speed) / speed;
        const showPulse = p >= 1 && random(`pu-${i}`) > 0.35;
        return (
          <g key={`l-${i}`}>
            <line
              x1={a.x}
              y1={ya}
              x2={b.x}
              y2={yb}
              stroke={accent}
              strokeOpacity={0.32}
              strokeWidth={1.2}
              strokeDasharray={lk.len}
              strokeDashoffset={lk.len * (1 - p)}
            />
            {showPulse ? (
              <circle
                cx={a.x + (b.x - a.x) * phase}
                cy={ya + (yb - ya) * phase}
                r={2.6}
                fill="#ffd9cc"
                opacity={Math.sin(phase * Math.PI) * 0.95}
                style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
              />
            ) : null}
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const p = layerIn(n.layer);
        const y = n.y + float(i);
        const beat = 0.5 + 0.5 * Math.sin(t / 12 + i);
        return (
          <g key={`n-${i}`} opacity={p}>
            <circle cx={n.x} cy={y} r={n.r * 3.2} fill={accent} opacity={0.08 + 0.06 * beat} />
            <circle cx={n.x} cy={y} r={n.r * p} fill="#0b0c0e" stroke={accent} strokeWidth={1.6} />
            <circle cx={n.x} cy={y} r={n.r * 0.45 * p} fill={accent} />
          </g>
        );
      })}
    </svg>
  );
};
