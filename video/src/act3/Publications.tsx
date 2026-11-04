import React from "react";
import { AbsoluteFill } from "remotion";
import { PUBLICATIONS } from "../content";
import { SANS, SERIF, SITE } from "../theme";
import { enter, enterLeave, fr, prog } from "./anim";
import { CAPTURE_RATIO, CaptureWindow } from "./CaptureWindow";
import { safe, useSlot } from "./slot";
import { Badge, Grid, Photo, UpdatePill, Vignette } from "./ui";

// Publications : 12 s en trois temps de 4 s.
// 1. « Lignes de force » : vue d’ensemble sur la photo de la bibliothèque (chiffres, rubriques,
//    pastille de nouveauté, fenêtre de l’application).
// 2. Les deux séries de fond, en deux cartes.
// 3. Le dossier robotique : titre, mentions, trois chiffres qui se dévoilent.

const BEAT = 120;
const P = PUBLICATIONS;
const accent = P.accent;

/** Visibilité d’un temps : entre à `from`, sort juste avant `to` (fondu enchaîné de 14 images). */
const beatStyle = (t: number, from: number, to: number | null) => ({
  opacity: prog(t, from - 7, from + 7) * (to === null ? 1 : 1 - prog(t, to - 7, to + 7)),
});

const Kicker: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: 600,
      fontSize: 26,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: accent,
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------- Temps 1 : vue d’ensemble
const Overview: React.FC = () => {
  const { t, lead, width, landscape } = useSlot();
  const s = safe(landscape);
  const out = (d: number, dist = 26) => enterLeave(t, d, BEAT - 10, BEAT, dist);
  const capW = landscape ? 1040 : width - 160;
  const capH = capW / CAPTURE_RATIO;
  const capEnter = 16;
  const pulse = (((t + 300) % 40) / 40) as number;

  const stats = (
    <div style={{ display: "flex", gap: landscape ? 46 : 56 }}>
      {P.stats.map((st, i) => (
        <div key={st.label} style={{ ...out(20 + i * 5), display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: landscape ? 92 : 88,
              lineHeight: 0.9,
              color: accent,
              fontVariantNumeric: "lining-nums",
            }}
          >
            {st.value}
          </span>
          <span style={{ fontFamily: SANS, fontSize: landscape ? 24 : 26, color: SITE.inkDim, whiteSpace: "nowrap" }}>{fr(st.label)}</span>
        </div>
      ))}
    </div>
  );
  const rubrics = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: landscape ? 600 : 920 }}>
      {P.rubrics.map((r, i) => (
        <div key={r} style={out(30 + i * 3, 12)}>
          <Badge accent={accent} size={landscape ? 24 : 26}>
            {fr(r)}
          </Badge>
        </div>
      ))}
    </div>
  );
  const head = (
    <>
      <div style={{ ...out(-4, 16), display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
        <Kicker>{P.kicker}</Kicker>
        <UpdatePill text={fr(P.update)} accent={accent} pulse={pulse} size={24} />
      </div>
      <div style={{ ...out(0, 36), fontFamily: SERIF, fontWeight: 600, fontSize: landscape ? 128 : 112, lineHeight: 0.95, color: SITE.ink }}>
        {P.name}
      </div>
      <div
        style={{
          ...out(8),
          fontFamily: SANS,
          fontSize: landscape ? 32 : 38,
          lineHeight: 1.3,
          color: "rgba(244,241,234,0.88)",
          textWrap: "balance",
        }}
      >
        {fr(P.subtitle)}
      </div>
    </>
  );
  const capture = (
    <div style={enterLeave(t, 0, BEAT - 10, BEAT, 0)}>
      <CaptureWindow
        file={P.capture}
        fromSec={P.captureFromSec}
        width={capW}
        accent={accent}
        t={t}
        start={capEnter + lead}
        enterAt={capEnter}
        showFrames={BEAT + 4 - capEnter}
      />
    </div>
  );

  return landscape ? (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: s.x, top: 150, width: 640, display: "flex", flexDirection: "column", gap: 28 }}>
        {head}
        <div style={{ height: 6 }} />
        {stats}
        {rubrics}
      </div>
      <div style={{ position: "absolute", right: s.x, top: (1080 - capH) / 2 + 20 }}>{capture}</div>
    </AbsoluteFill>
  ) : (
    <AbsoluteFill style={{ padding: `${s.top}px ${s.x}px ${s.bottom}px`, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {head}
        <div style={{ height: 4 }} />
        {stats}
        {rubrics}
      </div>
      <div style={{ flex: 1, minHeight: 24 }} />
      {capture}
      <div style={{ flex: 0.5 }} />
    </AbsoluteFill>
  );
};

// ---------- Temps 2 : les deux séries
const Series: React.FC = () => {
  const { t: t0, landscape, width } = useSlot();
  const t = t0 - BEAT;
  const s = safe(landscape);
  const out = (d: number, dist = 26) => enterLeave(t, d, BEAT - 10, BEAT, dist);
  const cardW = landscape ? (width - 2 * s.x - 32) / 2 : width - 2 * s.x;

  return (
    <AbsoluteFill style={{ padding: `${s.top}px ${s.x}px ${s.bottom}px`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ ...out(-8, 16), display: "flex", alignItems: "baseline", gap: 24 }}>
        <Kicker>{P.kicker}</Kicker>
      </div>
      <div
        style={{
          ...out(-4, 30),
          marginTop: 16,
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: landscape ? 96 : 88,
          lineHeight: 1,
          color: SITE.ink,
          fontVariantNumeric: "lining-nums",
        }}
      >
        2 séries de fond
      </div>
      <div style={{ display: "flex", flexDirection: landscape ? "row" : "column", gap: landscape ? 32 : 26, marginTop: landscape ? 56 : 40 }}>
        {P.series.map((se, i) => {
          const d = 2 + i * 12;
          const p = prog(t, d, d + 24);
          return (
            <div
              key={se.title}
              style={{
                ...enterLeave(t, d, BEAT - 10, BEAT, 50, 24),
                width: cardW,
                padding: landscape ? "44px 48px" : "34px 40px",
                borderRadius: 24,
                background: "linear-gradient(180deg, rgba(28,27,25,0.82) 0%, rgba(16,15,14,0.88) 100%)",
                border: "1px solid rgba(244,241,234,0.14)",
                boxShadow: `0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)`,
                display: "flex",
                flexDirection: "column",
                gap: landscape ? 18 : 14,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, height: 3, width: `${p * 100}%`, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
              <div
                style={{
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: landscape ? 56 : 54,
                  lineHeight: 1.05,
                  color: SITE.ink,
                  textWrap: "balance",
                }}
              >
                {fr(se.title)}
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 26, color: accent, fontVariantNumeric: "lining-nums" }}>{fr(se.meta)}</div>
              <div style={{ height: 1, background: SITE.line, margin: landscape ? "10px 0 6px" : "6px 0 2px" }} />
              {se.topics.map((tp, j) => (
                <div key={tp} style={{ ...enter(t, d + 14 + j * 6, 0, 16), translate: `${(1 - prog(t, d + 14 + j * 6, d + 30 + j * 6)) * -24}px 0`, display: "flex", gap: 20, alignItems: "baseline" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: SITE.inkFaint, fontVariantNumeric: "tabular-nums lining-nums" }}>
                    {String(j + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: landscape ? 32 : 38, lineHeight: 1.25, color: "rgba(244,241,234,0.9)", textWrap: "balance" }}>{fr(tp)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Temps 3 : le dossier robotique
/** Dévoile un chiffre : compte de 0 à la valeur en gardant son écriture (« 5 000 Md$ », « ~90 % »). */
const countUp = (value: string, p: number) => {
  const m = value.match(/^([^\d]*)(\d(?:[\d ]*\d)?)(.*)$/);
  if (!m) return value;
  const target = parseInt(m[2].replace(/ /g, ""), 10);
  const n = Math.round(target * p);
  const grouped = n >= 1000 ? `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, "0")}` : String(n);
  return fr(`${m[1]}${grouped}${m[3]}`);
};

const Dossier: React.FC = () => {
  const { t: t0, landscape, width } = useSlot();
  const t = t0 - 2 * BEAT;
  const s = safe(landscape);
  const d = P.dossier;
  const colW = landscape ? (width - 2 * s.x - 2 * 48) / 3 : width - 2 * s.x;

  return (
    <AbsoluteFill style={{ padding: `${s.top + 10}px ${s.x}px ${s.bottom + 10}px`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div
        style={{
          ...enter(t, -8, 16),
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: landscape ? 28 : 30,
          color: accent,
          fontVariantNumeric: "lining-nums",
          textWrap: "balance",
        }}
      >
        <span style={{ flex: "none", width: 10, height: 10, borderRadius: 2, rotate: "45deg", background: accent, boxShadow: `0 0 12px ${accent}` }} />
        {fr(d.meta)}
      </div>
      <div
        style={{
          ...enter(t, -4, 34, 22),
          marginTop: 22,
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: landscape ? 104 : 84,
          lineHeight: 1.02,
          color: SITE.ink,
          maxWidth: landscape ? 1500 : 920,
          textWrap: "balance",
          fontVariantNumeric: "lining-nums",
        }}
      >
        {fr(d.title)}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: landscape ? "row" : "column",
          gap: landscape ? 48 : 34,
          marginTop: landscape ? 100 : 64,
        }}
      >
        {d.figures.map((fg, i) => {
          const dl = 16 + i * 14;
          const p = prog(t, dl, dl + 40);
          return (
            <div
              key={fg.label}
              style={{
                width: colW,
                display: "flex",
                flexDirection: "column",
                gap: landscape ? 16 : 10,
                borderTop: "1px solid rgba(244,241,234,0.14)",
                paddingTop: landscape ? 28 : 22,
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", left: 0, top: -1, height: 2, width: `${p * 100}%`, background: accent, boxShadow: `0 0 12px ${accent}` }} />
              <div
                style={{
                  ...enter(t, dl, 30, 20),
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: landscape ? 120 : 112,
                  lineHeight: 0.95,
                  color: accent,
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "lining-nums tabular-nums",
                }}
              >
                {countUp(fg.value, p)}
              </div>
              <div
                style={{
                  ...enter(t, dl + 12, 14, 18),
                  fontFamily: SANS,
                  fontSize: landscape ? 30 : 36,
                  lineHeight: 1.3,
                  color: "rgba(244,241,234,0.88)",
                  textWrap: "balance",
                }}
              >
                {fr(fg.label)}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Publications: React.FC = () => {
  const { t, dur, lead, landscape } = useSlot();
  const out = enterLeave(t, -100, dur - 10, dur, 0);
  const k = (t + lead) / (dur + 2 * lead);
  const b2 = prog(t, BEAT - 8, BEAT + 10);
  const b3 = prog(t, 2 * BEAT - 8, 2 * BEAT + 10);

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      {/* Fonds : bibliothèque → rayonnages → dégradé du site, en fondus continus */}
      <Photo src={P.photo} k={k} brightness={0.62} blur={b2 * 10} zoom={[1.04, 1.16]} drift={[-1.2, -1]} />
      <AbsoluteFill style={{ opacity: b2 }}>
        <Photo src="publications/rayonnages.webp" k={k} brightness={0.42} blur={6 + b3 * 10} zoom={[1.08, 1.18]} drift={[1.2, 0]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: P.background, opacity: 0.55 + 0.15 * b2 + 0.3 * b3 }} />
      <AbsoluteFill
        style={{
          background: landscape
            ? "linear-gradient(90deg, rgba(8,8,8,0.85) 0%, rgba(8,8,8,0.35) 60%, rgba(8,8,8,0.1) 100%)"
            : "linear-gradient(180deg, rgba(8,8,8,0.85) 0%, rgba(8,8,8,0.45) 55%, rgba(8,8,8,0.2) 100%)",
          opacity: 1 - b3 * 0.6,
        }}
      />
      <AbsoluteFill style={{ opacity: b3 }}>
        <Grid opacity={0.55} at="70% 70%" />
        <AbsoluteFill style={{ background: `radial-gradient(60% 55% at 70% 75%, ${accent}2b 0%, transparent 70%)` }} />
      </AbsoluteFill>
      <Vignette />
      <AbsoluteFill style={out}>
        {t < BEAT + 4 ? <AbsoluteFill style={beatStyle(t, -100, null)}><Overview /></AbsoluteFill> : null}
        {t >= BEAT - 12 && t < 2 * BEAT + 4 ? <AbsoluteFill><Series /></AbsoluteFill> : null}
        {t >= 2 * BEAT - 12 ? <AbsoluteFill><Dossier /></AbsoluteFill> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
