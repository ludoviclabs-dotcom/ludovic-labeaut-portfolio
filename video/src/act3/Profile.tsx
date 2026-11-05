import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { PROFILE, type Poste } from "../content";
import { NEON, SANS, SERIF, SITE } from "../theme";
import { BEAT_SEC, FPS } from "../timeline";
import { easeInOut, easeIn, enter, enterX, fr, leave, lerp, prog } from "./anim";
import { useSlot } from "./slot";
import { Grid, Vignette } from "./ui";

// Premier plan après la traversée de l'écran (2 mesures, 8 temps) : le profil, sans l'identité.
// Un « bilan de compétences » présenté comme un bilan comptable, en quatre temps :
//  1. Les sphères jaillissent du flash et se mettent en orbite autour du titre.
//  2. Un poste par demi-temps, en alternant actif et passif : sa sphère quitte l'orbite et vient
//     se poser devant lui.
//  3. Troisième temps de la 2e mesure : doubles traits des totaux, « Bilan équilibré ».
//  4. Les sphères se rejoignent au centre et s'embrasent : le plan suivant (le nom) en sort.

const BEAT = BEAT_SEC * FPS; // un temps, en images (22,5)
const HALF = BEAT / 2;
const FIRST_ROW = 1.5 * BEAT; // premier poste, sur le contretemps du 2e temps
const TOTALS = 6 * BEAT; // totaux sur le 3e temps de la 2e mesure (25,5 s)
const MERGE = 160; // les sphères se rejoignent (images)

type Row = { side: 0 | 1; index: number; poste: Poste; at: number };

// Postes affichés (sans éléments : pas affiché), dans l'ordre d'apparition : actif, passif, actif…
const COLUMNS = [PROFILE.actif, PROFILE.passif].map((c) => ({ ...c, postes: c.postes.filter((p) => p.items.length > 0) }));
const ROWS: Row[] = (() => {
  const rows: Row[] = [];
  const n = Math.max(...COLUMNS.map((c) => c.postes.length));
  for (let i = 0; i < n; i++) {
    for (const side of [0, 1] as const) {
      const poste = COLUMNS[side].postes[i];
      if (poste) rows.push({ side, index: i, poste, at: FIRST_ROW + rows.length * HALF });
    }
  }
  return rows;
})();
if (ROWS[ROWS.length - 1].at + 10 > TOTALS) {
  throw new Error("Profile : trop de postes pour la durée du plan (ils doivent être posés avant les totaux).");
}

/** Sphère néon, éclairée en haut à gauche. */
const Sphere: React.FC<{ x: number; y: number; r: number; accent: string; glow: number; opacity: number }> = ({
  x,
  y,
  r,
  accent,
  glow,
  opacity,
}) => (
  <div
    style={{
      position: "absolute",
      left: x - r,
      top: y - r,
      width: 2 * r,
      height: 2 * r,
      borderRadius: "50%",
      opacity,
      background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${accent} 34%, ${accent}66 70%, rgba(5, 6, 8, 0.9) 100%)`,
      boxShadow: `0 0 ${glow}px ${accent}, 0 0 ${glow * 2.2}px ${accent}55`,
    }}
  />
);

export const ProfileCard: React.FC = () => {
  const { t, landscape, width, height } = useSlot();
  const neon = interpolate(t, [0, 20, 70], [0.62, 0.42, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Mise en page, en pixels de l'image.
  const L = landscape
    ? {
        titleY: 150,
        periodY: 208,
        orbit: { rx: 560, ry: 62 },
        cols: [
          { x: 200, w: 700, headY: 290, rowsY: 338 },
          { x: 1020, w: 700, headY: 290, rowsY: 338 },
        ],
        rowH: 104,
        totalY: 790,
        balanceY: 858,
        bullet: 15,
      }
    : {
        titleY: 128,
        periodY: 182,
        orbit: { rx: 400, ry: 48 },
        cols: [
          { x: 80, w: 920, headY: 262, rowsY: 300 },
          { x: 80, w: 920, headY: 776, rowsY: 814 },
        ],
        rowH: 84,
        totalY: 0, // en 4:5, chaque total suit sa colonne
        balanceY: 814 + COLUMNS[1].postes.length * 84 + 100,
        bullet: 13,
      };
  const center = { x: width / 2, y: height / 2 };
  const fade = leave(t, MERGE, MERGE + 12);

  // Orbite autour du titre : les sphères partent du centre de l'image (le flash) et s'y installent.
  const settle = prog(t, 2, 26);
  const orbitC = { x: width / 2, y: lerp(center.y, L.titleY, settle) };
  const orbitPos = (k: number) => {
    const a = (2 * Math.PI * k) / ROWS.length + t * 0.045;
    const depth = (Math.sin(a) + 1) / 2; // 1 : devant le titre
    return {
      x: orbitC.x + Math.cos(a) * L.orbit.rx * settle,
      y: orbitC.y + Math.sin(a) * L.orbit.ry * settle,
      r: (landscape ? 26 : 22) * (0.62 + 0.5 * depth) * prog(t, 0, 10),
      depth,
    };
  };
  const bulletPos = (row: Row) => {
    const c = L.cols[row.side];
    return { x: c.x + L.bullet, y: c.rowsY + row.index * L.rowH + (landscape ? 22 : 20) };
  };

  const spheres = (front: boolean) =>
    ROWS.map((row, k) => {
          const o = orbitPos(k);
          const b = bulletPos(row);
          const dock = prog(t, row.at - 10, row.at + 2, easeInOut);
          const merge = prog(t, MERGE, MERGE + 16, easeIn);
          if ((dock > 0 || merge > 0 || o.depth > 0.5) !== front) return null;
          const docked = { x: lerp(o.x, b.x, dock), y: lerp(o.y, b.y, dock), r: lerp(o.r, L.bullet, dock) };
          const pulse = dock >= 1 ? 1 + 0.12 * Math.max(0, 1 - (t - row.at - 2) / 8) : 1;
          return (
            <Sphere
              key={k}
              x={lerp(docked.x, center.x, merge)}
              y={lerp(docked.y, center.y, merge)}
              r={docked.r * pulse * lerp(1, 0.5, merge)}
              accent={row.poste.accent}
              glow={lerp(lerp(18, 12, dock), 40, merge)}
              opacity={dock > 0 ? 1 : 0.55 + 0.45 * o.depth}
            />
          );
    });

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, #1b1d22 0%, ${SITE.bg} 62%)` }} />
      <Grid opacity={0.3 + 0.2 * prog(t, 10, 70)} size={landscape ? 72 : 64} at="50% 45%" />
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 46% at 50% 50%, rgba(255, 61, 154, ${neon}) 0%, rgba(123, 44, 255, ${neon * 0.45}) 45%, rgba(0,0,0,0) 75%)`,
        }}
      />
      <Vignette />

      {/* Les sphères derrière le titre (moitié arrière de l'orbite) */}
      <AbsoluteFill>{spheres(false)}</AbsoluteFill>

      <AbsoluteFill style={fade}>
        {/* Trace de l'orbite, qui s'efface à mesure que les sphères se posent */}
        <div
          style={{
            position: "absolute",
            left: orbitC.x - L.orbit.rx * settle,
            top: orbitC.y - L.orbit.ry * settle,
            width: 2 * L.orbit.rx * settle,
            height: 2 * L.orbit.ry * settle,
            borderRadius: "50%",
            border: `1px solid rgba(61, 240, 255, ${0.28 * (1 - prog(t, FIRST_ROW, ROWS[ROWS.length - 1].at + 6))})`,
            zIndex: 2,
          }}
        />

        {/* En-tête du bilan */}
        <div style={{ position: "absolute", left: 0, right: 0, top: L.titleY, translate: "0 -50%", textAlign: "center", zIndex: 3 }}>
          <div style={{ ...enter(t, 10, 24, 18), fontFamily: SERIF, fontWeight: 600, fontSize: landscape ? 72 : 64, color: SITE.ink, lineHeight: 1 }}>
            {fr(PROFILE.title)}
          </div>
        </div>
        <div
          style={{
            ...enter(t, 18, 14, 14),
            position: "absolute",
            left: 0,
            right: 0,
            top: L.periodY,
            translate: "0 -50%",
            textAlign: "center",
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: "0.32em",
            marginRight: "-0.32em",
            textTransform: "uppercase",
            color: SITE.inkFaint,
          }}
        >
          {PROFILE.period}
        </div>

        {/* Colonnes actif et passif */}
        {COLUMNS.map((col, side) => {
          const c = L.cols[side];
          const headAt = FIRST_ROW - 8 + side * HALF;
          return (
            <React.Fragment key={col.heading}>
              <div
                style={{
                  ...enter(t, headAt, 12, 12),
                  position: "absolute",
                  left: c.x,
                  width: c.w,
                  top: c.headY,
                  translate: "0 -100%",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                }}
              >
                <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: landscape ? 26 : 24, letterSpacing: "0.28em", textTransform: "uppercase", color: SITE.ink }}>
                  {col.heading}
                </span>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: landscape ? 32 : 30, color: SITE.inkDim }}>{fr(col.caption)}</span>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: c.x,
                  top: c.headY,
                  height: 1,
                  width: c.w * prog(t, headAt, headAt + 14),
                  background: "rgba(244, 241, 234, 0.4)",
                }}
              />
              {/* Totaux : double trait comptable sous la colonne */}
              {(() => {
                const y = landscape ? L.totalY : c.rowsY + col.postes.length * L.rowH + 8;
                const w = c.w * prog(t, TOTALS + side * 4, TOTALS + side * 4 + 12);
                return (
                  <div style={{ position: "absolute", left: c.x, top: y, width: c.w }}>
                    <div style={{ height: 2, width: w, background: SITE.ink, opacity: 0.8 }} />
                    <div style={{ height: 2, width: w, background: SITE.ink, opacity: 0.8, marginTop: 4 }} />
                    <div
                      style={{
                        ...enter(t, TOTALS + 6 + side * 4, 8, 10),
                        marginTop: 10,
                        fontFamily: SANS,
                        fontWeight: 600,
                        fontSize: landscape ? 22 : 20,
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: SITE.inkFaint,
                      }}
                    >
                      Total {col.heading.toLowerCase()}
                    </div>
                  </div>
                );
              })()}
            </React.Fragment>
          );
        })}

        {/* Les postes */}
        {ROWS.map((row) => {
          const c = L.cols[row.side];
          const y = c.rowsY + row.index * L.rowH;
          return (
            <div
              key={`${row.side}-${row.index}`}
              style={{
                ...enterX(t, row.at - 2, 26, 10),
                position: "absolute",
                left: c.x + L.bullet * 2 + 26,
                width: c.w - L.bullet * 2 - 26,
                top: y,
                height: L.rowH - 12,
                borderBottom: `1px solid ${SITE.line}`,
                fontFamily: SANS,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: landscape ? 34 : 30, color: SITE.ink, lineHeight: 1.25 }}>{fr(row.poste.label)}</div>
              <div style={{ fontWeight: 400, fontSize: landscape ? 28 : 26, color: SITE.inkDim, lineHeight: 1.35 }}>{fr(row.poste.items.join(" · "))}</div>
            </div>
          );
        })}

        {/* Égalité des totaux */}
        <div
          style={{
            ...enter(t, TOTALS + 12, 14, 14),
            position: "absolute",
            left: 0,
            right: 0,
            top: L.balanceY,
            translate: "0 -50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
          }}
        >
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: landscape ? 46 : 42, color: SITE.ink }}>{fr(PROFILE.total)}</span>
          <svg width={36} height={36} viewBox="0 0 24 24" style={{ overflow: "visible" }}>
            <path
              d="M4 12.5l5 5L20 6.5"
              fill="none"
              stroke={NEON.cyan}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - prog(t, TOTALS + 20, TOTALS + 27)}
              style={{ filter: `drop-shadow(0 0 6px ${NEON.cyan})` }}
            />
          </svg>
        </div>
      </AbsoluteFill>

      {/* Les sphères devant le titre (orbite avant), posées, ou en route vers le centre */}
      <AbsoluteFill>{spheres(true)}</AbsoluteFill>


      {/* Les sphères réunies s'embrasent : le nom sort de cette lumière */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 32% at 50% 50%, rgba(255, 244, 253, ${0.7 * prog(t, MERGE + 10, MERGE + 20)}) 0%, rgba(255, 61, 154, ${0.5 * prog(t, MERGE + 8, MERGE + 20)}) 40%, rgba(0,0,0,0) 75%)`,
        }}
      />
    </AbsoluteFill>
  );
};
