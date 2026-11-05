import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { APPS, PERSON, PUBLICATIONS } from "../content";
import { NEON, PIXEL, SANS, SERIF, SITE } from "../theme";
import { BEAT_SEC, FPS, SIXTEENTH_SEC } from "../timeline";
import { easeIn, enter, enterX, fr, leave, lerp, prog } from "./anim";
import { useSlot } from "./slot";
import { Grid, Vignette } from "./ui";

// Premier plan après la traversée de l'écran (2 mesures, 8 temps), en quatre temps :
//  1. Décodage : le nom apparaît en caractères brouillés, en police du terminal de l'acte 1 ;
//     ses lettres se fixent une à une, une par double-croche, dans le désordre.
//  2. Premier temps de la 2e mesure : un glitch le change en serif du site, et il remonte.
//  3. Piste d'audit : un registre de quatre lignes, chiffres du site qui défilent puis se cochent.
//  4. Troisième temps : le tampon « Traçable · Sourcé · Auditable » frappe le registre.
// Les chiffres viennent de content.ts (projets et publications) : rien n'est inventé ici.

const SIX = SIXTEENTH_SEC * FPS; // une double-croche, en images (5,625)
const BEAT = BEAT_SEC * FPS; // un temps, en images (22,5)

const DECODE_FROM = 12; // après le gros du flash
const MORPH = Math.round(4 * BEAT); // premier temps de la 2e mesure (24 s)
const STAMP = Math.round(6 * BEAT); // troisième temps de la 2e mesure (25,5 s)
const ROWS_FROM = MORPH + 14;
const ROW_STEP = 8;

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@<>/=+*";

const ROWS = [
  { value: APPS.length, label: "Projets" },
  ...PUBLICATIONS.stats.map((s) => ({ value: Number(s.value), label: s.label[0].toUpperCase() + s.label.slice(1) })),
];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Nom en police du terminal : lettres brouillées qui se fixent une à une. */
const DecodedName: React.FC<{ t: number; lines: string[]; size: number }> = ({ t, lines, size }) => {
  // Ordre de fixation des lettres : mélangé, mais toujours le même d'un rendu à l'autre.
  const letters = lines.flatMap((line, l) => [...line].map((c, i) => ({ c, key: `${l}-${i}` }))).filter((x) => x.c !== " ");
  const order = [...letters].sort((a, b) => random(`ord-${a.key}`) - random(`ord-${b.key}`));
  const lockAt = new Map(order.map((x, k) => [x.key, DECODE_FROM + k * SIX]));
  const lastLock = DECODE_FROM + (order.length - 1) * SIX;
  const cursorOn = t < MORPH - 2 && Math.floor(t / 8) % 2 === 0;

  return (
    <div style={{ fontFamily: PIXEL, fontSize: size, lineHeight: 0.92, letterSpacing: "0.04em", textAlign: "center" }}>
      {lines.map((line, l) => (
        <div key={l} style={{ whiteSpace: "pre" }}>
          {[...line].map((c, i) => {
            if (c === " ") return <span key={i}> </span>;
            const at = lockAt.get(`${l}-${i}`)!;
            const locked = t >= at;
            const flash = locked && t < at + 3;
            const glyph = locked ? c : GLYPHS[Math.floor(random(`g-${l}-${i}-${Math.floor(t / 2)}`) * GLYPHS.length)];
            return (
              <span
                key={i}
                style={{
                  color: flash ? "#ffffff" : locked ? "#fff0fb" : NEON.cyan,
                  opacity: locked ? 1 : 0.55 * prog(t, 4, 10),
                  textShadow: locked
                    ? `3px 0 0 rgba(255, 43, 214, 0.75), -3px 0 0 rgba(61, 240, 255, 0.7), 0 0 ${flash ? 40 : 22}px rgba(255, 61, 154, 0.65)`
                    : `0 0 14px rgba(61, 240, 255, 0.5)`,
                }}
              >
                {glyph}
              </span>
            );
          })}
          {l === lines.length - 1 && (
            <span style={{ background: "#fff0fb", color: "transparent", marginLeft: 6, opacity: cursorOn && t < lastLock + 8 ? 1 : 0 }}>_</span>
          )}
        </div>
      ))}
    </div>
  );
};

/** Coche tracée au trait. */
const Check: React.FC<{ p: number; size: number }> = ({ p, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: "visible" }}>
    <path
      d="M4 12.5l5 5L20 6.5"
      fill="none"
      stroke={NEON.cyan}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - p}
      style={{ filter: `drop-shadow(0 0 6px ${NEON.cyan})` }}
    />
  </svg>
);

export const TitleCard: React.FC = () => {
  const { t, dur, landscape, height } = useSlot();
  // Reste de lueur néon du flash (rose puis violet), qui s'éteint en ~2 s.
  const neon = interpolate(t, [0, 20, 70], [0.62, 0.42, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = leave(t, dur - 10, dur);

  // Mise en page (centres verticaux, en pixels de l'image).
  const L = landscape
    ? { nameY: 228, domainsY: 332, ledgerTop: 400, ledgerW: 1060, rowH: 78, stampY: 838, nameScale: 0.66 }
    : { nameY: 300, domainsY: 452, ledgerTop: 520, ledgerW: 880, rowH: 74, stampY: 935, nameScale: 0.62 };
  const lines = landscape ? [PERSON.name.toUpperCase()] : PERSON.name.toUpperCase().split(" ");

  // Glitch du changement de police, centré sur le premier temps de la 2e mesure.
  const g = Math.max(0, 1 - Math.abs(t - MORPH) / 6);
  const jitter = (random(`gx-${t}`) * 2 - 1) * 46 * g;
  const pixel = 1 - prog(t, MORPH - 2, MORPH + 3, easeIn);
  const serif = prog(t, MORPH - 1, MORPH + 7);
  // Le nom remonte pour laisser la place au registre.
  const rise = prog(t, MORPH + 4, MORPH + 24);
  const nameY = lerp(height / 2, L.nameY, rise);
  const nameScale = lerp(1, L.nameScale, rise);

  // Frappe du tampon : il tombe, puis tout le plan encaisse le choc.
  const hit = prog(t, STAMP, STAMP + 5, easeIn);
  const shake = t >= STAMP + 5 && t < STAMP + 12 ? (1 - (t - STAMP - 5) / 7) * 7 : 0;
  const sx = (random(`sx-${t}`) * 2 - 1) * shake;
  const sy = (random(`sy-${t}`) * 2 - 1) * shake;

  const centered: React.CSSProperties = { position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" };

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, #1b1d22 0%, ${SITE.bg} 62%)` }} />
      <Grid opacity={0.35 + 0.25 * prog(t, 10, 70)} size={landscape ? 72 : 64} at="50% 50%" />
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 46% at 50% 50%, rgba(255, 61, 154, ${neon}) 0%, rgba(123, 44, 255, ${neon * 0.45}) 45%, rgba(0,0,0,0) 75%)`,
        }}
      />
      {/* Ligne de balayage cyan : à la sortie du flash, puis au glitch */}
      <AbsoluteFill
        style={{
          top: lerp(height / 2, nameY, 0.5),
          height: 2,
          background: `linear-gradient(90deg, transparent, ${NEON.cyan}, transparent)`,
          opacity: Math.max(interpolate(t, [0, 50], [0.22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0.9 * g),
          boxShadow: `0 0 24px ${NEON.cyan}`,
        }}
      />
      <Vignette />

      <AbsoluteFill style={{ ...out, translate: `${sx}px ${sy}px` }}>
        {/* 1-2. Le nom : décodage, puis serif du site */}
        <div style={{ ...centered, top: nameY, translate: `${jitter}px -50%`, scale: String(nameScale) }}>
          <div style={{ display: "grid", placeItems: "center" }}>
            {pixel > 0 && (
              <div style={{ gridArea: "1 / 1", opacity: pixel, filter: g > 0 ? `blur(${g * 2}px)` : undefined }}>
                <DecodedName t={t} lines={lines} size={landscape ? 176 : 172} />
              </div>
            )}
            {serif > 0 && (
              <div
                style={{
                  gridArea: "1 / 1",
                  opacity: serif,
                  display: "flex",
                  flexDirection: landscape ? "row" : "column",
                  alignItems: "center",
                  gap: landscape ? "0.26em" : 0,
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: landscape ? 184 : 168,
                  lineHeight: landscape ? 1 : 0.98,
                  letterSpacing: "-0.01em",
                  color: SITE.ink,
                  whiteSpace: "nowrap",
                  textShadow: `${10 * g}px 0 0 rgba(255, 43, 214, ${0.8 * g}), ${-10 * g}px 0 0 rgba(61, 240, 255, ${0.8 * g})`,
                  filter: serif < 1 ? `blur(${(1 - serif) * 8}px)` : undefined,
                }}
              >
                {PERSON.name.split(" ").map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...centered, top: L.domainsY, translate: "0 -50%" }}>
          <div
            style={{
              ...enter(t, MORPH + 12, 16, 14),
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 28,
              letterSpacing: "0.3em",
              marginRight: "-0.3em",
              textTransform: "uppercase",
              color: SITE.inkDim,
            }}
          >
            {PERSON.domains}
          </div>
        </div>

        {/* 3. Piste d'audit : les chiffres du site */}
        <div style={{ ...centered, top: L.ledgerTop }}>
          <div style={{ width: L.ledgerW, fontFamily: SANS }}>
            <div
              style={{
                ...enter(t, MORPH + 8, 10, 10),
                display: "flex",
                justifyContent: "space-between",
                fontSize: landscape ? 22 : 21,
                fontWeight: 600,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: SITE.inkFaint,
                paddingBottom: 14,
              }}
            >
              <span>{fr("Piste d'audit")}</span>
              <span style={{ fontFamily: PIXEL, fontSize: landscape ? 32 : 31, letterSpacing: "0.08em", color: NEON.cyan, opacity: 0.85 }}>
                {"> "}
                {pad2(ROWS.filter((_, k) => t >= ROWS_FROM + k * ROW_STEP + 12).length)}/{pad2(ROWS.length)}
              </span>
            </div>
            <div style={{ height: 1, background: SITE.line, width: `${100 * prog(t, MORPH + 8, MORPH + 22)}%` }} />
            {ROWS.map((row, k) => {
              const a = ROWS_FROM + k * ROW_STEP;
              const count = Math.round(row.value * prog(t, a + 2, a + 12));
              return (
                <div
                  key={row.label}
                  style={{
                    ...enterX(t, a, 30, 10),
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    height: L.rowH,
                    borderBottom: `1px solid ${SITE.line}`,
                  }}
                >
                  <span style={{ fontSize: landscape ? 35 : 32, fontWeight: 500, color: SITE.inkDim, whiteSpace: "nowrap" }}>{fr(row.label)}</span>
                  <span style={{ flex: 1, alignSelf: "center", borderBottom: "2px dotted rgba(244, 241, 234, 0.18)", translate: "0 8px" }} />
                  <span
                    style={{
                      fontSize: landscape ? 47 : 42,
                      fontWeight: 600,
                      color: SITE.ink,
                      fontVariantNumeric: "tabular-nums",
                      minWidth: "1.4em",
                      textAlign: "right",
                    }}
                  >
                    {pad2(count)}
                  </span>
                  <Check p={prog(t, a + 11, a + 17)} size={landscape ? 34 : 32} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Le tampon frappe le bas du registre */}
        {t >= STAMP && (
          <div style={{ ...centered, top: L.stampY, translate: "0 -50%" }}>
            <div
              style={{
                opacity: prog(t, STAMP, STAMP + 3),
                scale: String(lerp(1.9, 1, hit)),
                rotate: "-5deg",
                padding: landscape ? "14px 30px" : "14px 26px",
                border: `6px double ${NEON.cyan}`,
                borderRadius: 10,
                background: "rgba(11, 12, 14, 0.82)",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: landscape ? 36 : 30,
                letterSpacing: "0.22em",
                marginRight: "-0.22em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                color: NEON.cyan,
                textShadow: `0 0 ${hit >= 1 ? 18 - 10 * prog(t, STAMP + 5, STAMP + 20) : 8}px ${NEON.cyan}`,
                boxShadow: `0 0 ${30 * (1 - prog(t, STAMP + 5, STAMP + 24)) + 10}px rgba(61, 240, 255, 0.35)`,
              }}
            >
              {PERSON.stamp}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
