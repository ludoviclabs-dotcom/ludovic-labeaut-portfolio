import React from "react";
import { TERMINAL_CARDS } from "../content";
import { NEON, PIXEL } from "../theme";
import { DROP_SEC, TERMINAL_AT_SEC } from "../timeline";
import { SCREEN } from "./CRTWrapper";

const CHARS_PER_SEC = 24;
const LINE_PAUSE = 4; // en caractères : petite pause entre deux lignes
const CLEAR_SEC = 0.3; // l'écran s'efface (invite seule) juste avant la carte suivante

// Mise en page de la carte, en pixels de conception de l'écran (960 × 720).
const FONT = 54;
const LINE_H = 1.04;
/** Chasse de VT323 (police à chasse fixe), en em (mesurée sur un rendu : ≈ 0,393). */
const ADVANCE_EM = 0.395;
const PAD = { top: 16, right: 24, bottom: 18, left: 24 };
const BORDER = 5;
const POS = { x: 44, y: 40 };

/** Caméra de la scène : échelle et position (pixels de l'image) du coin du téléviseur. */
export type TerminalCamera = { s: number; left: number; top: number; width: number; height: number };

// Zone sûre de l'image pour le texte (≥ 80 px des bords latéraux, ≥ 100 px du haut et du bas).
const SAFE_X = 80;
const SAFE_Y = 100;

/** Taille naturelle d'une carte (pixels de conception), d'après sa ligne la plus longue. */
const cardSize = (lines: string[]) => {
  const chars = Math.max(...lines.map((l) => l.length)) + 3; // « > » ou retrait, et le curseur
  return {
    w: BORDER + PAD.left + PAD.right + chars * FONT * ADVANCE_EM + 8,
    h: PAD.top + PAD.bottom + lines.length * FONT * LINE_H,
  };
};

/**
 * Pendant le break, la caméra avance sur l'écran : la carte, attachée à l'écran, sortirait du cadre.
 * On la réduit et on la décale juste ce qu'il faut pour qu'elle reste entière dans la zone sûre
 * de l'image (et dans la partie visible de l'écran) : elle reste dans le téléviseur, avec ses lignes
 * de balayage et son aberration chromatique.
 */
const fitTransform = (lines: string[], cam: TerminalCamera | undefined) => {
  if (!cam) return { k: 1, dx: 0, dy: 0 };
  const { w, h } = cardSize(lines);
  const { s } = cam;
  const fx = cam.left + (SCREEN.x + POS.x) * s;
  const fy = cam.top + (SCREEN.y + POS.y) * s;
  // Zone permise : zone sûre de l'image ∩ écran (avec une petite marge intérieure).
  const sx0 = Math.max(SAFE_X, cam.left + (SCREEN.x + 24) * s);
  const sy0 = Math.max(SAFE_Y, cam.top + (SCREEN.y + 24) * s);
  const sx1 = Math.min(cam.width - SAFE_X, cam.left + (SCREEN.x + SCREEN.w - 24) * s);
  const sy1 = Math.min(cam.height - SAFE_Y, cam.top + (SCREEN.y + SCREEN.h - 24) * s);
  const k = Math.min(1, (sx1 - sx0) / (w * s), (sy1 - sy0) / (h * s));
  const nx = Math.min(Math.max(fx, sx0), sx1 - w * s * k);
  const ny = Math.min(Math.max(fy, sy0), sy1 - h * s * k);
  return { k, dx: (nx - fx) / s, dy: (ny - fy) / s };
};

// Texte façon terminal, tapé caractère par caractère, affiché dans l'écran du téléviseur.
export const TerminalText: React.FC<{ timeSec: number; glitch: number; camera?: TerminalCamera }> = ({
  timeSec,
  glitch,
  camera,
}) => {
  let card = -1;
  TERMINAL_AT_SEC.forEach((s, i) => {
    if (timeSec >= s) card = i;
  });
  // Rien avant la première carte ; rien non plus à partir du drop (pas de fantôme dans le flash).
  if (card < 0 || timeSec >= DROP_SEC) return null;

  const local = timeSec - TERMINAL_AT_SEC[card];
  const next = TERMINAL_AT_SEC[card + 1];
  const clearing = next !== undefined && timeSec >= next - CLEAR_SEC;
  // Apostrophe typographique à l'affichage (VT323 possède le glyphe ’).
  const source = TERMINAL_CARDS[card].map((l) => l.replace(/'/g, "\u2019"));
  let budget = clearing ? 0 : Math.floor(local * CHARS_PER_SEC);
  const lines = source.map((line) => {
    const shown = line.slice(0, Math.max(0, budget));
    budget -= line.length + LINE_PAUSE;
    return shown;
  });
  const typing = budget < 0 && !clearing;
  const cursorOn = typing || Math.floor(timeSec * 2.5) % 2 === 0;
  const lastLine = lines.reduce((acc, l, i) => (l.length > 0 ? i : acc), 0);
  // Petit sursaut à l'apparition de chaque carte, et pendant les coups de batterie.
  const jolt = local < 0.07 ? 1 : glitch;
  const jitter = jolt * (card % 2 === 0 ? 14 : -14);
  const fit = fitTransform(source, camera);

  return (
    <div
      style={{
        position: "absolute",
        left: POS.x,
        top: POS.y,
        transformOrigin: "0 0",
        transform: `translate(${fit.dx + jitter}px, ${fit.dy}px) scale(${fit.k})`,
        padding: `${PAD.top}px ${PAD.right}px ${PAD.bottom}px ${PAD.left}px`,
        background: "rgba(11, 2, 33, 0.62)",
        borderLeft: `${BORDER}px solid ${NEON.magenta}`,
        fontFamily: PIXEL,
        fontSize: FONT,
        lineHeight: LINE_H,
        fontVariantNumeric: "lining-nums",
        color: "#fff0fb",
        letterSpacing: 0,
        textShadow: `3px 0 0 rgba(255, 43, 214, 0.75), -3px 0 0 rgba(61, 240, 255, 0.7), 0 0 22px rgba(255, 61, 154, 0.65)`,
        whiteSpace: "pre",
      }}
    >
      {(clearing ? [""] : lines).map((l, i) => (
        <div key={i} style={{ minHeight: `${LINE_H}em` }}>
          {i === 0 ? <span style={{ color: NEON.cyan }}>{"> "}</span> : "  "}
          {l}
          {(clearing || i === lastLine) && cursorOn ? (
            <span style={{ background: "#fff0fb", color: "transparent", marginLeft: 4 }}>_</span>
          ) : null}
        </div>
      ))}
    </div>
  );
};
