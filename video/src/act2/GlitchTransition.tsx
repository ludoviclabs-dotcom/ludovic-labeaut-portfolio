import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { CRTWrapper, POWER_CLOSEUP, SCREEN, screenLightAt, TV_H, TV_W } from "../act1/CRTWrapper";
import { PixelArtHighwayCanvas } from "../act1/PixelArtHighwayCanvas";
import { TerminalText } from "../act1/TerminalText";
import { TERMINAL_THEMES } from "../content";
import { NEON, SANS } from "../theme";
import { DROP_SEC, FILL_HITS_SEC, FILL_START_SEC, POWER_ON, TERMINAL_AT_SEC } from "../timeline";

// Acte 2 : à chaque coup du break, la caméra avance d'un cran vers l'écran avec un glitch ;
// au drop, elle traverse l'écran (flash, éclats de pixels) et révèle la vitrine moderne.

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeIn = (x: number) => Math.pow(Math.min(1, Math.max(0, x)), 3);

/** Intensité du glitch : un pic bref à chaque coup, et un sursaut à chaque carte du terminal. */
export const glitchAt = (t: number) => {
  let g = 0;
  for (const h of FILL_HITS_SEC) if (t >= h) g = Math.max(g, Math.exp(-(t - h) / 0.07));
  for (const s of TERMINAL_AT_SEC) if (t >= s && t < s + 0.07) g = Math.max(g, 0.35);
  return g;
};

const easeInOutSine = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2;

// Format vertical : le téléviseur entier (meuble, panneau de commande, pieds) est cadré sur son
// centre, à peine rogné du même montant des deux côtés, et placé assez haut pour laisser sous lui
// un bandeau (thème de la carte du terminal en cours).
const PORTRAIT_SCALE = 0.85 * (1080 / 1040); // largeur visible ≈ 1224 px de conception (meuble : 1280)
const PORTRAIT_SCREEN_Y = 535; // ordonnée (image) du centre de l'écran
const LOWER_THIRD_TOP = 1166;

/** Cadrage de base (avant le break) : échelle et point de conception placé au centre de l'image. */
const baseFraming = (width: number, height: number) => {
  const scy = SCREEN.y + SCREEN.h / 2;
  if (height > width) {
    const base = (width / 1080) * PORTRAIT_SCALE;
    return { base, cx: TV_W / 2, cy: scy + (height / 2 - PORTRAIT_SCREEN_Y) / base };
  }
  const base = Math.min((width * 0.88) / TV_W, (height * 0.88) / TV_H);
  return { base, cx: TV_W / 2, cy: TV_H / 2 };
};

/** Le téléviseur, sa scène et la caméra (gros plan sur le bouton, recul, zooms par paliers, traversée). */
export const RetroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const P = POWER_ON;
  const portrait = height > width;

  const { base, cx: fullCx, cy: fullCy } = baseFraming(width, height);
  const cover = Math.max(width / (SCREEN.w * base), height / (SCREEN.h * base)) * 1.06;

  // Lente avancée pendant l'acte 1, puis un palier par coup de batterie jusqu'à remplir le cadre.
  const drift = 1 + 0.05 * smooth(P.pullBackToSec, FILL_START_SEC, t);
  let level = 0;
  FILL_HITS_SEC.forEach((h) => {
    if (t >= h) level += easeOut((t - h) / 0.11);
  });
  const progress = level / FILL_HITS_SEC.length;
  let zoom = drift * Math.pow(cover / drift, progress);
  // Traversée de l'écran au drop.
  const through = easeIn((t - DROP_SEC) / 0.4);
  zoom *= 1 + 6 * through;

  // Point de conception au centre de l'image : celui du cadrage de base, puis le centre de l'écran.
  const toScreen = Math.min(1, progress * 1.4);
  let cx = fullCx + (SCREEN.x + SCREEN.w / 2 - fullCx) * toScreen;
  let cy = fullCy + (SCREEN.y + SCREEN.h / 2 - fullCy) * toScreen;
  let s = base * zoom;

  // Ouverture : gros plan sur le bouton de mise en marche, puis travelling arrière (un seul
  // mouvement de caméra en ligne droite : le centre suit la largeur de champ).
  if (t < P.pullBackToSec) {
    const sClose = Math.min(width, height) / 330;
    const w0 = width / sClose;
    const w1 = width / s;
    const u = easeInOutSine((t - P.pullBackFromSec) / (P.pullBackToSec - P.pullBackFromSec));
    const w = Math.exp(Math.log(w0) + (Math.log(w1) - Math.log(w0)) * u);
    const k = (w - w0) / (w1 - w0);
    cx = POWER_CLOSEUP.x + (cx - POWER_CLOSEUP.x) * k;
    cy = POWER_CLOSEUP.y + (cy - POWER_CLOSEUP.y) * k;
    s = width / w;
  }

  // Petit à-coup de la caméra au déclic du bouton.
  const dc = t - P.buttonSec;
  const clickNudge = dc >= 0 && dc < 0.4 ? Math.exp(-dc / 0.07) * Math.cos(dc * 55) * 5 : 0;

  const g = glitchAt(t);
  const shake = g * 10;
  const sx = (random(`sx-${frame}`) * 2 - 1) * shake;
  const sy = (random(`sy-${frame}`) * 2 - 1) * shake + clickNudge;

  const left0 = width / 2 - cx * s;
  const top0 = height / 2 - cy * s;
  const left = left0 + sx;
  const top = top0 + sy;

  const lit = Math.min(1, 0.12 + screenLightAt(t));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(55% 60% at 50% ${portrait ? 40 : 48}%, rgba(120, 30, 110, ${0.35 * lit}) 0%, rgba(30, 6, 40, ${0.5 * lit}) 45%, #030205 85%)`,
        opacity: 1 - smooth(DROP_SEC + 0.03, DROP_SEC + 0.25, t),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${left}px, ${top}px) scale(${s})`,
          filter: through > 0 ? `blur(${through * 10}px) brightness(${1 + through * 2})` : undefined,
        }}
      >
        <CRTWrapper frame={frame} timeSec={t} glitch={g}>
          <PixelArtHighwayCanvas timeSec={t} glitch={g} glitchSeed={frame} />
          <TerminalText timeSec={t} glitch={g} camera={{ s, left: left0, top: top0, width, height }} />
        </CRTWrapper>
      </div>
      {portrait ? <ThemeLowerThird t={t} /> : null}
    </AbsoluteFill>
  );
};

/** Format vertical : le thème de la carte du terminal en cours, sous le téléviseur. */
const ThemeLowerThird: React.FC<{ t: number }> = ({ t }) => {
  let card = -1;
  TERMINAL_AT_SEC.forEach((s, i) => {
    if (t >= s) card = i;
  });
  if (card < 0) return null;
  const start = TERMINAL_AT_SEC[card];
  const end = TERMINAL_AT_SEC[card + 1] ?? FILL_START_SEC;
  const fadeIn = smooth(start + 0.15, start + 0.6, t);
  const fadeOut = 1 - smooth(end - 0.4, end - 0.05, t);
  const o = fadeIn * fadeOut;
  if (o <= 0) return null;
  const rise = (1 - fadeIn) * 18;
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: LOWER_THIRD_TOP,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        opacity: o,
        translate: `0 ${rise}px`,
      }}
    >
      <div style={{ width: 72, height: 4, borderRadius: 2, background: NEON.magenta, boxShadow: `0 0 14px ${NEON.magenta}` }} />
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: 44,
          lineHeight: 1.15,
          letterSpacing: "0.01em",
          fontVariantNumeric: "lining-nums",
          color: "#f6ecff",
          textAlign: "center",
          textWrap: "balance",
          textShadow: "0 0 18px rgba(255, 61, 154, 0.45)",
        }}
      >
        {TERMINAL_THEMES[card]}
      </div>
    </div>
  );
};

const SHARDS = Array.from({ length: 170 }, (_, i) => {
  const a = random(`a-${i}`) * Math.PI * 2;
  const r0 = 0.05 + random(`r-${i}`) * 0.45;
  const colors = [NEON.magenta, NEON.cyan, NEON.yellow, NEON.orange, NEON.pink, "#ffffff", NEON.violet];
  return {
    dx: Math.cos(a),
    dy: Math.sin(a),
    r0,
    size: 8 + random(`s-${i}`) * 34,
    speed: 0.7 + random(`v-${i}`) * 0.9,
    color: colors[Math.floor(random(`c-${i}`) * colors.length)],
  };
});

/** Flash et éclats de pixels au moment où la caméra traverse l'écran. */
export const TraverseFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const d = t - DROP_SEC;
  // Montée de lumière juste avant le drop, puis flash qui retombe.
  const pre = smooth(DROP_SEC - 0.12, DROP_SEC, t) * 0.5;
  const flash = d < 0 ? pre : d < 0.1 ? 1 : Math.pow(1 - easeOut((d - 0.1) / 0.6), 1.3);
  const half = Math.max(width, height) / 2;
  const p = easeOut(d / 0.85);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {d >= 0 && d < 0.85
        ? SHARDS.map((sh, i) => {
            const dist = (sh.r0 + p * 1.6 * sh.speed) * half;
            const size = sh.size * (1 + p * 2.5);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: width / 2 + sh.dx * dist - size / 2,
                  top: height / 2 + sh.dy * dist - size / 2,
                  width: size,
                  height: size,
                  background: sh.color,
                  opacity: Math.pow(1 - d / 0.85, 1.4),
                  boxShadow: `0 0 ${size}px ${sh.color}`,
                }}
              />
            );
          })
        : null}
      <AbsoluteFill
        style={{
          opacity: flash,
          background: "radial-gradient(70% 70% at 50% 50%, #ffffff 0%, #ffe8f8 40%, #ff8ade 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
