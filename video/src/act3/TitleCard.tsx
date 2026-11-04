import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { PERSON } from "../content";
import { NEON, SANS, SERIF, SITE } from "../theme";
import { enter, fr, leave, prog } from "./anim";
import { useSlot } from "./slot";
import { Grid, Vignette } from "./ui";

// Premier plan après la traversée de l'écran : le nom, les domaines, un filet, la promesse.
// La lueur néon du flash s'éteint lentement derrière le nom.
export const TitleCard: React.FC = () => {
  const { t, dur, landscape } = useSlot();
  // Reste de lueur néon du flash (rose puis violet), qui s'éteint en ~2 s.
  const neon = interpolate(t, [0, 20, 70], [0.62, 0.42, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cyan = interpolate(t, [0, 50], [0.22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rule = prog(t, 46, 78);
  const drift = interpolate(t, [0, dur], [1, 1.035]);
  const out = leave(t, dur - 8, dur + 4);

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, #1b1d22 0%, ${SITE.bg} 62%)` }} />
      <Grid opacity={0.35 + 0.25 * prog(t, 10, 70)} size={landscape ? 72 : 64} at="50% 50%" />
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 46% at 50% 50%, rgba(255, 61, 154, ${neon}) 0%, rgba(123, 44, 255, ${neon * 0.45}) 45%, rgba(0,0,0,0) 75%)`,
        }}
      />
      {/* Ligne de balayage résiduelle, souvenir du téléviseur */}
      <AbsoluteFill
        style={{
          top: "50%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${NEON.cyan}, transparent)`,
          opacity: cyan,
          boxShadow: `0 0 24px ${NEON.cyan}`,
        }}
      />
      <Vignette />
      <AbsoluteFill
        style={{
          ...out,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: landscape ? "0 160px" : "0 80px",
          gap: landscape ? 30 : 28,
          scale: String(drift),
        }}
      >
        <div
          style={{
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
            textShadow: `0 0 ${40 * neon}px rgba(255, 61, 154, ${neon})`,
          }}
        >
          {PERSON.name.split(" ").map((w, i) => (
            <span key={w} style={enter(t, 8 + i * 9, 46, 28)}>
              {w}
            </span>
          ))}
        </div>
        <div
          style={{
            ...enter(t, 32, 20, 22),
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: landscape ? 32 : 30,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: SITE.inkDim,
            marginRight: "-0.3em",
          }}
        >
          {PERSON.domains}
        </div>
        <div
          style={{
            width: (landscape ? 320 : 260) * rule,
            height: 2,
            margin: "8px 0",
            background: "linear-gradient(90deg, transparent, rgba(244,241,234,0.75), transparent)",
          }}
        />
        <div
          style={{
            ...enter(t, 64, 24, 26),
            fontFamily: SERIF,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: landscape ? 60 : 56,
            lineHeight: 1.18,
            color: SITE.ink,
            maxWidth: landscape ? 1300 : 900,
            textWrap: "balance",
          }}
        >
          {fr(PERSON.tagline)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
