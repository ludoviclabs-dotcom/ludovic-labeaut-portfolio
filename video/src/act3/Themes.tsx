import React from "react";
import { AbsoluteFill } from "remotion";
import { THEMES, type Theme } from "../content";
import { SANS, SERIF, SITE } from "../theme";
import { enter, fr, leave, prog } from "./anim";
import { NetworkVisual } from "./NetworkVisual";
import { safe, useSlot } from "./slot";
import { Grid, Photo, Vignette } from "./ui";

// « Ce à quoi je m’attaque » : trois panneaux décalés de 0,6 s, chacun sur une photo du site
// (Ken Burns lent, dégradé sombre) ou, pour l’IA et la robotique, sur un visuel dessiné en code.

const STAGGER = 18;

const Panel: React.FC<{ theme: Theme; index: number; w: number; h: number }> = ({ theme, index, w, h }) => {
  const { t, dur, landscape } = useSlot();
  const d = 6 + index * STAGGER;
  const p = prog(t, d, d + 26);
  const k = (t + 6) / (dur + 12);
  const titleSize = landscape ? 66 : 64;
  const lineSize = landscape ? 32 : 40;
  const labelSize = landscape ? 24 : 26;
  const pad = landscape ? 40 : 34;

  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 22,
        overflow: "hidden",
        opacity: p,
        translate: `0 ${(1 - p) * 60}px`,
        clipPath: `inset(${(1 - p) * 30}% 0 0 0 round 22px)`,
        border: "1px solid rgba(244,241,234,0.14)",
        boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 60px ${theme.accent}1a`,
        background: "#0d0f12",
      }}
    >
      {theme.photo ? (
        <Photo src={theme.photo} k={k} zoom={[1.12 - 0.06 * p, 1.2]} drift={[index % 2 ? 1.2 : -1.2, -1]} brightness={0.82} />
      ) : (
        <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 60% 30%, #2a1a15 0%, #120d0c 60%, #0a0909 100%)` }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: landscape ? w : w * 0.55, height: landscape ? h * 0.66 : h }}>
            <NetworkVisual width={landscape ? w : w * 0.55} height={landscape ? h * 0.66 : h} t={t - d} accent={theme.accent} />
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          background: landscape
            ? "linear-gradient(180deg, rgba(8,9,11,0) 25%, rgba(8,9,11,0.7) 55%, rgba(8,9,11,0.94) 100%)"
            : "linear-gradient(90deg, rgba(8,9,11,0.94) 0%, rgba(8,9,11,0.78) 55%, rgba(8,9,11,0.25) 100%)",
        }}
      />
      {/* Filet d’accent */}
      <div
        style={{
          position: "absolute",
          left: pad,
          top: pad,
          width: 64 * prog(t, d + 12, d + 34),
          height: 4,
          borderRadius: 2,
          background: theme.accent,
          boxShadow: `0 0 16px ${theme.accent}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          ...(landscape ? { top: h * 0.5 } : { top: 0, bottom: 0, justifyContent: "center" }),
          display: "flex",
          flexDirection: "column",
          gap: landscape ? 14 : 10,
        }}
      >
        <div style={{ ...enter(t, d + 10, 24), fontFamily: SERIF, fontWeight: 600, fontSize: titleSize, lineHeight: 1, color: SITE.ink }}>
          {fr(theme.title)}
        </div>
        <div
          style={{
            ...enter(t, d + 16, 20),
            fontFamily: SANS,
            fontSize: lineSize,
            lineHeight: 1.28,
            color: "rgba(244,241,234,0.88)",
            textWrap: "balance",
            maxWidth: landscape ? undefined : 780,
          }}
        >
          {fr(theme.line)}
        </div>
        <div
          style={{
            ...enter(t, d + 22, 14),
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: landscape ? 10 : 4,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: labelSize,
            letterSpacing: "0.08em",
            color: theme.accent,
          }}
        >
          <span style={{ width: 22, height: 1, background: theme.accent }} />
          {fr(theme.evidence)}
        </div>
      </div>
    </div>
  );
};

export const Themes: React.FC = () => {
  const { t, dur, width, height, landscape } = useSlot();
  const s = safe(landscape);
  const out = leave(t, dur - 8, dur + 4);
  const headSize = landscape ? 96 : 88;
  const top = landscape ? 120 : 110;
  const panelsTop = landscape ? 300 : 250;
  const gap = landscape ? 28 : 22;
  const areaW = width - 2 * s.x;
  const areaH = height - panelsTop - (landscape ? 110 : 105);
  const w = landscape ? (areaW - 2 * gap) / 3 : areaW;
  const h = landscape ? areaH : (areaH - 2 * gap) / 3;

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 30% 0%, #1c1f25 0%, ${SITE.bg} 70%)` }} />
      <Grid opacity={0.4} at="30% 10%" />
      <Vignette />
      <AbsoluteFill style={out}>
        <div
          style={{
            ...enter(t, -4, 30, 22),
            position: "absolute",
            left: s.x,
            top,
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: headSize,
            lineHeight: 1,
            color: SITE.ink,
          }}
        >
          Ce à quoi je m’attaque
        </div>
        <div
          style={{
            position: "absolute",
            left: s.x,
            top: panelsTop,
            display: "flex",
            flexDirection: landscape ? "row" : "column",
            gap,
          }}
        >
          {THEMES.map((th, i) => (
            <Panel key={th.title} theme={th} index={i} w={w} h={h} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
