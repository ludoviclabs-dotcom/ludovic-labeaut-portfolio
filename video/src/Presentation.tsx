import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { RetroScene, TraverseFlash } from "./act2/GlitchTransition";
import { Showcase } from "./act3/Showcase";
import { DROP_SEC, TOTAL_SEC, f } from "./timeline";

// La vidéo complète : le téléviseur (actes 1 et 2) passe devant la vitrine (acte 3),
// qu'il révèle en traversant l'écran au drop. Une seule piste son, calée par sync.json
// (son fondu de sortie, 78 → 81 s, est fabriqué dans le fichier audio lui-même).

/** Fondu au noir sur les 0,8 dernières secondes. */
const FADE_OUT_SEC = 0.8;

const FadeToBlack: React.FC = () => {
  const frame = useCurrentFrame();
  const end = f(TOTAL_SEC);
  const opacity = interpolate(frame, [end - f(FADE_OUT_SEC), end - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity }} />;
};

export const Presentation: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence name="Acte 3 — Vitrine" from={f(DROP_SEC)}>
        <Showcase />
      </Sequence>
      <Sequence name="Actes 1 et 2 — Téléviseur" durationInFrames={f(DROP_SEC + 0.5)}>
        <RetroScene />
      </Sequence>
      <Sequence name="Traversée de l'écran" durationInFrames={f(DROP_SEC + 1)}>
        <TraverseFlash />
      </Sequence>
      <FadeToBlack />
      <Audio src={staticFile("audio/soundtrack.mp3")} />
    </AbsoluteFill>
  );
};
