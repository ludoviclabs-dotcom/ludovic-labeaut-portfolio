import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { APPS } from "../content";
import { SITE } from "../theme";
import { SLOTS, XFADE_FRAMES, slotFrames, slotFrom } from "../timeline";
import { easeInOut } from "./anim";
import { Outro } from "./Outro";
import { ProjectSlide } from "./ProjectSlide";
import { Publications } from "./Publications";
import { SlotProvider } from "./slot";
import { Themes } from "./Themes";
import { TitleCard } from "./TitleCard";

// Acte 3 : neuf plans calés sur les mesures (timeline.ts). Chaque plan commence XFADE_FRAMES / 2
// images avant son premier temps et déborde d’autant sur le suivant. Le plan entrant, posé au-dessus,
// passe de 0 à 1 d’opacité pendant que le sortant reste entier dessous : il n’y a jamais d’image vide.
const H = XFADE_FRAMES / 2;

const SlotFade: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const opacity = first ? 1 : interpolate(frame, [0, XFADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const slotContent = (i: number) => {
  if (i === 0) return { name: "Titre", node: <TitleCard /> };
  if (i === 1) return { name: "Ce à quoi je m’attaque", node: <Themes /> };
  const a = i - 2;
  if (a >= 0 && a < APPS.length) return { name: APPS[a].name, node: <ProjectSlide app={APPS[a]} index={a} /> };
  if (i === APPS.length + 2) return { name: "Publications", node: <Publications /> };
  return { name: "Carte de fin", node: <Outro /> };
};

export const Showcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      {Array.from({ length: SLOTS }).map((_, i) => {
        const lead = i === 0 ? 0 : H;
        const tail = i === SLOTS - 1 ? 0 : H;
        const { name, node } = slotContent(i);
        return (
          <Sequence key={i} name={name} from={slotFrom(i) - lead} durationInFrames={slotFrames(i) + lead + tail}>
            <SlotProvider lead={lead} dur={slotFrames(i)}>
              <SlotFade first={i === 0}>{node}</SlotFade>
            </SlotProvider>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
