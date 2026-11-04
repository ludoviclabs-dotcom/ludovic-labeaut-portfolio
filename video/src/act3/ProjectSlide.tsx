import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SANS, SERIF, SITE } from "../theme";
import { backgroundIn, enter, exitOpacity } from "./anim";
import { CaptureWindow } from "./CaptureWindow";

// Un plan de la vitrine : un projet (ou les publications), sa fenêtre réelle et ses repères.
// Mise en page en colonnes au format 16:9, empilée au format 4:5.

export type ProjectSlideProps = {
  kicker: string;
  name: string;
  subtitle: string;
  axes: string[];
  accent: string;
  background: string;
  capture: string;
  captureFromSec: number;
  slotFrames: number;
  /** Rang du projet (0 à 4) pour l'indicateur de progression ; absent pour les publications. */
  progress?: number;
  children?: React.ReactNode;
};

const Progress: React.FC<{ index: number; accent: string }> = ({ index, accent }) => (
  <div style={{ display: "flex", gap: 10 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 44,
          height: 4,
          borderRadius: 2,
          background: i === index ? accent : i < index ? "rgba(244,241,234,0.45)" : "rgba(244,241,234,0.15)",
        }}
      />
    ))}
  </div>
);

export const ProjectSlide: React.FC<ProjectSlideProps> = ({
  kicker,
  name,
  subtitle,
  axes,
  accent,
  background,
  capture,
  captureFromSec,
  slotFrames,
  progress,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const landscape = width > height;
  const out = exitOpacity(frame, slotFrames);

  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: landscape ? 22 : 18, width: landscape ? 600 : "100%" }}>
      <div
        style={{
          ...enter(frame, 2),
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 26,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          ...enter(frame, 5, 36),
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: landscape ? 116 : 104,
          lineHeight: 0.95,
          color: SITE.ink,
        }}
      >
        {name}
      </div>
      <div style={{ ...enter(frame, 9), fontFamily: SANS, fontSize: 32, color: SITE.inkDim }}>{subtitle}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
        {axes.map((a, i) => (
          <div
            key={a}
            style={{
              ...enter(frame, 12 + i * 3, 16),
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 24,
              color: SITE.ink,
              padding: "9px 18px",
              borderRadius: 999,
              border: `1px solid ${accent}80`,
              background: `${accent}14`,
            }}
          >
            {a}
          </div>
        ))}
      </div>
      {children}
    </div>
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background, opacity: backgroundIn(frame) }} />
      <AbsoluteFill
        style={{
          opacity: out,
          padding: landscape ? "0 100px 0 120px" : "120px 80px 110px",
          display: "flex",
          flexDirection: landscape ? "row" : "column",
          alignItems: landscape ? "center" : "flex-start",
          justifyContent: landscape ? "space-between" : "flex-start",
          gap: landscape ? 40 : 64,
        }}
      >
        {text}
        <CaptureWindow
          file={capture}
          fromSec={captureFromSec}
          width={landscape ? 1080 : width - 160}
          accent={accent}
        />
        {progress !== undefined ? (
          <div
            style={{
              position: "absolute",
              ...(landscape ? { right: 100, top: 84 } : { left: 80, bottom: 90 }),
              ...enter(frame, 0, 0, 10),
            }}
          >
            <Progress index={progress} accent={accent} />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
