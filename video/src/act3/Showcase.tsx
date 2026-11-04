import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { APPS, PUBLICATIONS } from "../content";
import { SANS, SERIF, SITE } from "../theme";
import { SLOTS, slotFrom } from "../timeline";
import { enter } from "./anim";
import { Outro } from "./Outro";
import { ProjectSlide } from "./ProjectSlide";
import { TitleCard } from "./TitleCard";

// Acte 3 : huit plans calés sur le tempo (une mesure et demie chacun).
// Chaque plan déborde de quelques images sur le suivant pour que les fonds se fondent.
const OVERLAP = 12;

const Punchline: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...enter(frame, 22), marginTop: 26, fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 46, lineHeight: 1.1, color: accent }}>
      {text}
    </div>
  );
};

const Stats: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 44, marginTop: 30 }}>
      {PUBLICATIONS.stats.map((s, i) => (
        <div key={s.label} style={{ ...enter(frame, 20 + i * 4), display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 84, lineHeight: 1, color: PUBLICATIONS.accent }}>{s.value}</span>
          <span style={{ fontFamily: SANS, fontSize: 22, color: SITE.inkDim, whiteSpace: "nowrap" }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
};

export const Showcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      {Array.from({ length: SLOTS }).map((_, i) => {
        const slotFrames = slotFrom(i + 1) - slotFrom(i);
        const app = i >= 1 && i <= APPS.length ? APPS[i - 1] : null;
        let content: React.ReactNode;
        let name: string;
        if (i === 0) {
          name = "Titre";
          content = <TitleCard slotFrames={slotFrames} />;
        } else if (app) {
          name = app.name;
          content = (
            <ProjectSlide
              kicker={`${String(i).padStart(2, "0")} / ${String(APPS.length).padStart(2, "0")}`}
              name={app.name}
              subtitle={app.subtitle}
              axes={app.axes}
              accent={app.accent}
              background={app.background}
              capture={app.capture}
              captureFromSec={app.captureFromSec}
              slotFrames={slotFrames}
              progress={i - 1}
            >
              <Punchline text={app.punchline} accent={app.accent} />
            </ProjectSlide>
          );
        } else if (i === APPS.length + 1) {
          name = "Publications";
          content = (
            <ProjectSlide
              kicker="Lignes de force"
              name={PUBLICATIONS.name}
              subtitle={PUBLICATIONS.subtitle}
              axes={PUBLICATIONS.axes}
              accent={PUBLICATIONS.accent}
              background={PUBLICATIONS.background}
              capture={PUBLICATIONS.capture}
              captureFromSec={PUBLICATIONS.captureFromSec}
              slotFrames={slotFrames}
            >
              <Stats />
            </ProjectSlide>
          );
        } else {
          name = "Carte de fin";
          content = <Outro />;
        }
        return (
          <Sequence key={i} name={name} from={slotFrom(i)} durationInFrames={slotFrames + OVERLAP}>
            {content}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
