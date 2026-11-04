import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { APPS, CONTACT, PERSON, PUBLICATIONS } from "../content";
import { SANS, SERIF, SITE } from "../theme";
import { backgroundIn, enter } from "./anim";

// Carte de fin : nom, coordonnées, liens. Elle reste à l'écran jusqu'à la dernière image,
// qui sert aussi de vignette.

const Icon: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const ICONS = {
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>
  ),
  book: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const landscape = width > height;
  const accents = [...APPS.map((a) => a.accent), PUBLICATIONS.accent];

  const rows = [
    { icon: ICONS.mail, text: CONTACT.email },
    { icon: ICONS.linkedin, text: CONTACT.linkedin },
    { icon: ICONS.globe, text: CONTACT.portfolio },
    { icon: ICONS.book, text: CONTACT.publications },
  ].filter((r) => r.text);

  return (
    <AbsoluteFill style={{ opacity: backgroundIn(frame), background: `radial-gradient(120% 80% at 50% 0%, #1b1d22 0%, ${SITE.bg} 60%)` }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <div style={{ ...enter(frame, 2, 36, 20), fontFamily: SERIF, fontWeight: 600, fontSize: landscape ? 140 : 124, lineHeight: 1, color: SITE.ink }}>
          {PERSON.name}
        </div>
        <div
          style={{
            ...enter(frame, 8),
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: SITE.inkDim,
          }}
        >
          {PERSON.domains}
        </div>
        {/* Les six couleurs des panneaux du portfolio */}
        <div style={{ ...enter(frame, 12, 0, 14), display: "flex", gap: 8, margin: "14px 0 22px" }}>
          {accents.map((c) => (
            <div key={c} style={{ width: 56, height: 4, borderRadius: 2, background: c }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {rows.map((r, i) => (
            <div key={r.text} style={{ ...enter(frame, 16 + i * 4, 18), display: "flex", alignItems: "center", gap: 22 }}>
              <Icon color={accents[i % accents.length]}>{r.icon}</Icon>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: landscape ? 38 : 34, color: SITE.ink }}>{r.text}</span>
            </div>
          ))}
        </div>
        <div style={{ ...enter(frame, 34), marginTop: 30, fontFamily: SANS, fontSize: 24, letterSpacing: "0.08em", color: SITE.inkFaint }}>
          {CONTACT.stack}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
