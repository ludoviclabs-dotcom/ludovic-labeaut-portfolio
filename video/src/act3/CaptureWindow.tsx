import { Video } from "@remotion/media";
import React from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { prog } from "./anim";

// Fenêtre de l'application, découpée dans la vidéo de démonstration (1920 × 1080) :
// on garde la fenêtre et on retire la légende du bas, que la vitrine remplace.
const SRC = { w: 1920, h: 1080 };
const CROP = { x: 150, y: 122, w: 1620, h: 724 };
export const CAPTURE_RATIO = CROP.w / CROP.h;

// Chaque démonstration dure 20 s : cinq étapes de 4 s. Le fondu vers l'étape suivante commence
// juste après 4n s : l'extrait s'arrête avant, quitte à être joué un peu plus lentement.
const STEP_SEC = 4;
const DEMO_SEC = 20;
export const captureEndSec = (fromSec: number) => {
  const step = Math.floor(fromSec / STEP_SEC);
  return step >= DEMO_SEC / STEP_SEC - 1 ? DEMO_SEC - 0.05 : (step + 1) * STEP_SEC - 1 / 30;
};

/**
 * @param t image courante, comptée dans le repère du parent
 * @param start image (même repère) où la vidéo commence à jouer
 * @param showFrames nombre d'images pendant lesquelles la fenêtre reste visible
 * @param enterAt image (même repère) où la fenêtre commence à entrer
 */
export const CaptureWindow: React.FC<{
  file: string;
  fromSec: number;
  width: number;
  accent: string;
  t: number;
  start: number;
  showFrames: number;
  enterAt: number;
}> = ({ file, fromSec, width, accent, t, start, showFrames, enterAt }) => {
  const { fps } = useVideoConfig();
  const height = width / CAPTURE_RATIO;
  const k = width / CROP.w;
  const p = prog(t, enterAt, enterAt + 24);
  const span = captureEndSec(fromSec) - fromSec;
  const playbackRate = Math.min(1, span / (showFrames / fps));
  const radius = 18 * (width / 1100);

  return (
    <div style={{ perspective: 2000, width, height }}>
      <div
        style={{
          position: "relative",
          width,
          height,
          borderRadius: radius,
          overflow: "hidden",
          opacity: p,
          translate: `0 ${(1 - p) * 70}px`,
          rotate: `x ${(1 - p) * 16}deg`,
          scale: String(0.93 + 0.07 * p),
          border: "1px solid rgba(244, 241, 234, 0.18)",
          boxShadow: `0 40px 110px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.4), 0 0 120px ${accent}2e`,
          background: "#0b0c0e",
        }}
      >
        <Sequence from={start} durationInFrames={showFrames + 2} layout="none">
          <Video
            src={staticFile(`captures/${file}`)}
            trimBefore={Math.round(fromSec * fps)}
            playbackRate={playbackRate}
            muted
            style={{
              position: "absolute",
              left: -CROP.x * k,
              top: -CROP.y * k,
              width: SRC.w * k,
              height: SRC.h * k,
            }}
          />
        </Sequence>
        {/* Reflet de vitre très léger */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            background: "linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 35%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        />
      </div>
    </div>
  );
};
