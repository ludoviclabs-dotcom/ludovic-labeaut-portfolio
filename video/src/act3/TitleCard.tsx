import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PERSON } from "../content";
import { SANS, SERIF, SITE } from "../theme";
import { enter, exitOpacity } from "./anim";

// Premier plan après la traversée de l'écran : le nom, les domaines, la promesse.
export const TitleCard: React.FC<{ slotFrames: number }> = ({ slotFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const landscape = width > height;
  const out = exitOpacity(frame, slotFrames);
  // Reste de lueur néon du flash, qui s'éteint.
  const neon = interpolate(frame, [0, 30], [0.5, 0], { extrapolateRight: "clamp" });
  const rule = interpolate(frame, [20, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(80% 60% at 50% 45%, rgba(255, 61, 154, ${neon}) 0%, rgba(0,0,0,0) 70%), radial-gradient(120% 80% at 50% 0%, #1b1d22 0%, ${SITE.bg} 60%)`,
      }}
    >
      <AbsoluteFill
        style={{
          opacity: out,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: landscape ? "0 160px" : "0 90px",
          gap: 26,
        }}
      >
        <div style={{ display: "flex", gap: "0.28em", fontFamily: SERIF, fontWeight: 600, fontSize: landscape ? 176 : 140, lineHeight: 1, color: SITE.ink }}>
          {PERSON.name.split(" ").map((w, i) => (
            <span key={w} style={enter(frame, 6 + i * 5, 40, 20)}>
              {w}
            </span>
          ))}
        </div>
        <div
          style={{
            ...enter(frame, 16),
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: landscape ? 32 : 30,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: SITE.inkDim,
          }}
        >
          {PERSON.domains}
        </div>
        <div style={{ width: 280 * rule, height: 1, background: "rgba(244,241,234,0.4)", margin: "10px 0" }} />
        <div
          style={{
            ...enter(frame, 28),
            fontFamily: SERIF,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: landscape ? 58 : 54,
            lineHeight: 1.15,
            color: SITE.ink,
            maxWidth: landscape ? 1300 : 880,
          }}
        >
          {PERSON.tagline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
