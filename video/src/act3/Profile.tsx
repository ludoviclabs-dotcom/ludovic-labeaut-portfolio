import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { PROFILE, type Poste } from "../content";
import { NEON, SANS, SERIF, SITE } from "../theme";
import { BEAT_SEC, FPS } from "../timeline";
import { easeIn, easeInOut, enter, enterX, fr, leave, lerp, prog } from "./anim";
import { PixelSpheres, type PixelSphere } from "./PixelSpheres";
import { useSlot } from "./slot";
import { Grid, Vignette } from "./ui";

// Premier plan après la traversée de l'écran (3 mesures, 12 temps) : le profil, sans l'identité.
// Un « bilan de compétences » présenté comme un bilan comptable, en quatre temps :
//  1. Les sphères (fil de fer néon tramé) jaillissent du flash et tournent autour du titre.
//  2. Un poste par demi-temps, en alternant actif et passif : sa sphère quitte l'orbite, se défait
//     en particules et se reforme devant lui, dans un éclat de pixels.
//  3. Premier temps de la 3e mesure : doubles traits des totaux, « Bilan équilibré ».
//  4. Les sphères se rejoignent au centre et forment le soleil synthwave de la route, qui
//     s'embrase : le plan suivant (le nom) sort de cette lumière.

const BEAT = BEAT_SEC * FPS; // un temps, en images (22,5)
const HALF = BEAT / 2;
const FIRST_ROW = 1.5 * BEAT; // premier poste, sur le contretemps du 2e temps
const TOTALS = 8 * BEAT; // totaux sur le premier temps de la 3e mesure
const MERGE = 10 * BEAT + 3; // les sphères se rejoignent (3e temps de la 3e mesure)

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
const MAX_ROWS = Math.max(...COLUMNS.map((c) => c.postes.length));

export const ProfileCard: React.FC = () => {
  const { t, landscape, width, height } = useSlot();
  const neon = interpolate(t, [0, 20, 70], [0.62, 0.42, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Mise en page, en pixels de l'image. En 16:9, deux colonnes et des postes sur deux lignes ;
  // en 4:5, l'actif puis le passif, des postes sur une ligne.
  const L = landscape
    ? {
        titleY: 116,
        periodY: 170,
        orbit: { rx: 560, ry: 62 },
        cols: [
          { x: 200, w: 700, headY: 248, rowsY: 282 },
          { x: 1020, w: 700, headY: 248, rowsY: 282 },
        ],
        rowH: 80,
        inline: false,
        bullet: 16,
      }
    : {
        titleY: 112,
        periodY: 162,
        orbit: { rx: 400, ry: 48 },
        cols: [
          { x: 80, w: 920, headY: 232, rowsY: 256 },
          { x: 80, w: 920, headY: 256 + COLUMNS[0].postes.length * 56 + 104, rowsY: 256 + COLUMNS[0].postes.length * 56 + 128 },
        ],
        rowH: 56,
        inline: true,
        bullet: 14,
      };
  const totalY = (side: number) =>
    landscape ? L.cols[0].rowsY + MAX_ROWS * L.rowH + 10 : L.cols[side].rowsY + COLUMNS[side].postes.length * L.rowH + 6;
  const balanceY = landscape ? totalY(0) + 78 : totalY(1) + 70;
  const center = { x: width / 2, y: height / 2 };
  const fade = leave(t, MERGE, MERGE + 12);

  // Orbite autour du titre : les sphères partent du centre de l'image (le flash) et s'y installent.
  const settle = prog(t, 2, 30);
  const orbitC = { x: width / 2, y: lerp(center.y, L.titleY, settle) };
  const orbitPos = (k: number) => {
    const a = (2 * Math.PI * k) / ROWS.length + t * 0.04;
    const depth = (Math.sin(a) + 1) / 2; // 1 : devant le titre
    return {
      x: orbitC.x + Math.cos(a) * L.orbit.rx * settle,
      y: orbitC.y + Math.sin(a) * L.orbit.ry * settle,
      r: (landscape ? 30 : 26) * (0.6 + 0.5 * depth) * prog(t, 0, 10),
      depth,
    };
  };
  const bulletPos = (row: Row) => {
    const c = L.cols[row.side];
    return { x: c.x + L.bullet, y: c.rowsY + row.index * L.rowH + (L.inline ? L.rowH / 2 - 6 : 21) };
  };

  // Les sphères, réparties entre la toile de derrière (moitié arrière de l'orbite) et celle de devant.
  const back: PixelSphere[] = [];
  const front: PixelSphere[] = [];
  const merge = prog(t, MERGE, MERGE + 16, easeIn);
  ROWS.forEach((row, k) => {
    const o = orbitPos(k);
    const b = bulletPos(row);
    const dock = prog(t, row.at - 10, row.at + 2, easeInOut);
    const s: PixelSphere = {
      x: lerp(lerp(o.x, b.x, dock), center.x, merge),
      y: lerp(lerp(o.y, b.y, dock), center.y, merge),
      r: lerp(o.r, L.bullet, dock) * lerp(1, 0.6, merge),
      accent: row.poste.accent,
      alpha: dock > 0 ? 1 : 0.6 + 0.4 * o.depth,
      phase: k * 1.7,
      burst: dock >= 1 ? (t - row.at - 2) / 10 : 0,
      // En chemin, la sphère se défait en particules et se reforme à son arrivée.
      scatter: Math.max(Math.sin(dock * Math.PI), Math.sin(merge * Math.PI) * 0.8),
    };
    (dock > 0 || merge > 0 || o.depth > 0.5 ? front : back).push(s);
  });
  // Le soleil : les sphères réunies en une seule, qui grandit puis s'embrase.
  const sunGrow = prog(t, MERGE + 10, MERGE + 30);
  if (sunGrow > 0) {
    front.push({
      x: center.x,
      y: center.y,
      r: (landscape ? 190 : 170) * sunGrow,
      accent: "#ff7d36",
      sun: true,
      alpha: prog(t, MERGE + 10, MERGE + 14),
    });
  }
  const orbitAlpha = 0.6 * settle * (1 - prog(t, FIRST_ROW, ROWS[ROWS.length - 1].at + 6));

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

      <PixelSpheres
        width={width}
        height={height}
        frame={t}
        spheres={back}
        orbit={{ x: orbitC.x, y: orbitC.y, rx: L.orbit.rx * settle, ry: L.orbit.ry * settle, alpha: orbitAlpha }}
      />

      <AbsoluteFill style={fade}>
        {/* En-tête du bilan */}
        <div style={{ position: "absolute", left: 0, right: 0, top: L.titleY, translate: "0 -50%", textAlign: "center" }}>
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

        {/* Colonnes actif et passif : en-tête, filet, totaux à double trait */}
        {COLUMNS.map((col, side) => {
          const c = L.cols[side];
          const headAt = FIRST_ROW - 8 + side * HALF;
          const w = c.w * prog(t, TOTALS + side * 4, TOTALS + side * 4 + 12);
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
                  paddingBottom: 8,
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
              <div style={{ position: "absolute", left: c.x, top: totalY(side), width: c.w }}>
                <div style={{ height: 2, width: w, background: SITE.ink, opacity: 0.8 }} />
                <div style={{ height: 2, width: w, background: SITE.ink, opacity: 0.8, marginTop: 4 }} />
                <div
                  style={{
                    ...enter(t, TOTALS + 6 + side * 4, 8, 10),
                    marginTop: 8,
                    fontFamily: SANS,
                    fontWeight: 600,
                    fontSize: landscape ? 22 : 18,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: SITE.inkFaint,
                  }}
                >
                  Total {col.heading.toLowerCase()}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Les postes */}
        {ROWS.map((row) => {
          const c = L.cols[row.side];
          const y = c.rowsY + row.index * L.rowH;
          const left = c.x + L.bullet * 2 + 22;
          return (
            <div
              key={`${row.side}-${row.index}`}
              style={{
                ...enterX(t, row.at - 2, 26, 10),
                position: "absolute",
                left,
                width: c.x + c.w - left,
                top: y,
                height: L.rowH - 8,
                borderBottom: `1px solid ${SITE.line}`,
                fontFamily: SANS,
                display: "flex",
                flexDirection: L.inline ? "row" : "column",
                alignItems: L.inline ? "center" : "flex-start",
                gap: L.inline ? 16 : 0,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: landscape ? 30 : 26, color: SITE.ink, lineHeight: 1.25 }}>{fr(row.poste.label)}</span>
              <span style={{ fontWeight: 400, fontSize: landscape ? 25 : 22, color: SITE.inkDim, lineHeight: 1.35 }}>{fr(row.poste.items.join(" · "))}</span>
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
            top: balanceY,
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

      <PixelSpheres width={width} height={height} frame={t} spheres={front} />

      {/* Le soleil s'embrase : le nom sort de cette lumière */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(42% 34% at 50% 50%, rgba(255, 244, 253, ${0.75 * prog(t, MERGE + 30, MERGE + 42)}) 0%, rgba(255, 61, 154, ${0.55 * prog(t, MERGE + 26, MERGE + 42)}) 40%, rgba(0,0,0,0) 75%)`,
        }}
      />
    </AbsoluteFill>
  );
};
