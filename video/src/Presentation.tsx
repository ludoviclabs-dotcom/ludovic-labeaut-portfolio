import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { RetroScene, TraverseFlash } from "./act2/GlitchTransition";
import { Showcase } from "./act3/Showcase";
import { DROP_SEC, f } from "./timeline";

// La vidéo complète : le téléviseur (actes 1 et 2) passe devant la vitrine (acte 3),
// qu'il révèle en traversant l'écran au drop. Une seule piste son, calée par sync.json.
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
      <Audio src={staticFile("audio/soundtrack.mp3")} />
    </AbsoluteFill>
  );
};
