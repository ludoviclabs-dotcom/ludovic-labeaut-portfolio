import React from "react";
import { Composition } from "remotion";
import { Presentation } from "./Presentation";
import { FPS, TOTAL_SEC, f } from "./timeline";

// Deux formats tirés du même code : 16:9 (YouTube, site, présentation) et 4:5 (fil LinkedIn mobile).
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Presentation-16x9"
        component={Presentation}
        durationInFrames={f(TOTAL_SEC)}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Presentation-4x5"
        component={Presentation}
        durationInFrames={f(TOTAL_SEC)}
        fps={FPS}
        width={1080}
        height={1350}
      />
    </>
  );
};
