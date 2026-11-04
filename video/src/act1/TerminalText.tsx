import React from "react";
import { TERMINAL_CARDS } from "../content";
import { NEON, PIXEL } from "../theme";
import { TERMINAL_AT_SEC } from "../timeline";

const CHARS_PER_SEC = 30;
const LINE_PAUSE = 4; // en caractères : petite pause entre deux lignes

// Texte façon terminal, tapé caractère par caractère, affiché dans l'écran du téléviseur.
export const TerminalText: React.FC<{ timeSec: number; glitch: number }> = ({
  timeSec,
  glitch,
}) => {
  let card = -1;
  TERMINAL_AT_SEC.forEach((s, i) => {
    if (timeSec >= s) card = i;
  });
  if (card < 0) return null;

  const local = timeSec - TERMINAL_AT_SEC[card];
  let budget = Math.floor(local * CHARS_PER_SEC);
  const lines = TERMINAL_CARDS[card].map((line) => {
    const shown = line.slice(0, Math.max(0, budget));
    budget -= line.length + LINE_PAUSE;
    return shown;
  });
  const typing = budget < 0;
  const cursorOn = typing || Math.floor(timeSec * 2.5) % 2 === 0;
  const lastLine = lines.reduce((acc, l, i) => (l.length > 0 ? i : acc), 0);
  // Petit sursaut à l'apparition de chaque carte, et pendant les coups de batterie.
  const jolt = local < 0.07 ? 1 : glitch;
  const jitter = jolt * (card % 2 === 0 ? 14 : -14);

  return (
    <div
      style={{
        position: "absolute",
        left: 44,
        top: 40,
        padding: "16px 24px 18px",
        background: "rgba(11, 2, 33, 0.62)",
        borderLeft: `5px solid ${NEON.magenta}`,
        fontFamily: PIXEL,
        fontSize: 54,
        lineHeight: 1.04,
        color: "#fff0fb",
        letterSpacing: 1,
        textShadow: `3px 0 0 rgba(255, 43, 214, 0.75), -3px 0 0 rgba(61, 240, 255, 0.7), 0 0 22px rgba(255, 61, 154, 0.65)`,
        translate: `${jitter}px 0`,
        whiteSpace: "pre",
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{ minHeight: "1.04em" }}>
          {i === 0 ? <span style={{ color: NEON.cyan }}>{"> "}</span> : "  "}
          {l}
          {i === lastLine && cursorOn ? (
            <span style={{ background: "#fff0fb", color: "transparent", marginLeft: 4 }}>_</span>
          ) : null}
        </div>
      ))}
    </div>
  );
};
