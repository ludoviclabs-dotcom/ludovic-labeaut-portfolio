import { Video } from "@remotion/media";
import React from "react";
import { Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Fenêtre de l'application, découpée dans la vidéo de démonstration (1920 × 1080) :
// on garde la fenêtre et on retire la légende du bas, que la vitrine remplace.
const SRC = { w: 1920, h: 1080 };
const CROP = { x: 150, y: 122, w: 1620, h: 724 };
export const CAPTURE_RATIO = CROP.w / CROP.h;

export const CaptureWindow: React.FC<{
  file: string;
  fromSec: number;
  width: number;
  accent: string;
  delay?: number;
}> = ({ file, fromSec, width, accent, delay = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const height = width / CAPTURE_RATIO;
  const k = width / CROP.w;
  const p = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div style={{ perspective: 1800, width, height }}>
      <div
        style={{
          position: "relative",
          width,
          height,
          borderRadius: 22 * (width / 1100),
          overflow: "hidden",
          opacity: p,
          translate: `0 ${(1 - p) * 60}px`,
          rotate: `x ${(1 - p) * 14}deg`,
          scale: String(0.94 + 0.06 * p),
          border: "1px solid rgba(244, 241, 234, 0.16)",
          boxShadow: `0 50px 120px rgba(0,0,0,0.6), 0 0 90px ${accent}26`,
          background: "#0b0c0e",
        }}
      >
        <Video
          src={staticFile(`captures/${file}`)}
          trimBefore={Math.round(fromSec * fps)}
          muted
          style={{
            position: "absolute",
            left: -CROP.x * k,
            top: -CROP.y * k,
            width: SRC.w * k,
            height: SRC.h * k,
          }}
        />
      </div>
    </div>
  );
};
