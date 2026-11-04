import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { CRTWrapper, SCREEN, TV_H, TV_W } from "../act1/CRTWrapper";
import { PixelArtHighwayCanvas } from "../act1/PixelArtHighwayCanvas";
import { TerminalText } from "../act1/TerminalText";
import { NEON } from "../theme";
import { DROP_SEC, FILL_HITS_SEC, FILL_START_SEC, TERMINAL_AT_SEC } from "../timeline";

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

/** Le téléviseur, sa scène et la caméra (cadrage, zooms par paliers, traversée). */
export const RetroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // Au format vertical, le téléviseur occupe toute la largeur (les bords du meuble sont rognés).
  const base = Math.min((width * (width > height ? 0.88 : 1.04)) / TV_W, (height * 0.88) / TV_H);
  const cover = Math.max(width / (SCREEN.w * base), height / (SCREEN.h * base)) * 1.06;

  // Lente avancée pendant l'acte 1, puis un palier par coup de batterie jusqu'à remplir le cadre.
  const drift = 1 + 0.05 * smooth(2, FILL_START_SEC, t);
  let level = 0;
  FILL_HITS_SEC.forEach((h) => {
    if (t >= h) level += easeOut((t - h) / 0.11);
  });
  const progress = level / FILL_HITS_SEC.length;
  let zoom = drift * Math.pow(cover / drift, progress);
  // Traversée de l'écran au drop.
  const through = easeIn((t - DROP_SEC) / 0.4);
  zoom *= 1 + 6 * through;

  const g = glitchAt(t);
  const shake = g * 10;
  const sx = (random(`sx-${frame}`) * 2 - 1) * shake;
  const sy = (random(`sy-${frame}`) * 2 - 1) * shake;

  // Point du téléviseur placé au centre de l'image : le centre du meuble, puis celui de l'écran.
  const ax = TV_W / 2 + (SCREEN.x + SCREEN.w / 2 - TV_W / 2) * Math.min(1, progress * 1.4);
  const ay = TV_H / 2 + (SCREEN.y + SCREEN.h / 2 - TV_H / 2) * Math.min(1, progress * 1.4);
  const s = base * zoom;
  const left = width / 2 - ax * s + sx;
  const top = height / 2 - ay * s + sy;

  const lit = smooth(0.4, 1.8, t);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(55% 60% at 50% 48%, rgba(120, 30, 110, ${0.35 * lit}) 0%, rgba(30, 6, 40, ${0.5 * lit}) 45%, #030205 85%)`,
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
          <TerminalText timeSec={t} glitch={g} />
        </CRTWrapper>
      </div>
    </AbsoluteFill>
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
          background: "radial-gradient(70% 70% at 50% 50%, #ffffff 0%, #ffe8f8 40%, rgba(255, 120, 220, 0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
