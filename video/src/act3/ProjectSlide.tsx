import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { APPS, type App } from "../content";
import { SANS, SERIF, SITE } from "../theme";
import { easeInOut, enter, enterLeave, fr, leave, lerp, prog } from "./anim";
import { CAPTURE_RATIO, CaptureWindow } from "./CaptureWindow";
import { safe, useSlot } from "./slot";
import { Badge, Photo, Progress, UpdatePill, Vignette } from "./ui";

// Un projet en deux temps (6 s) :
// A (0 → 3,3 s) la photo du site en plein cadre, le numéro, le nom, le problème traité, les badges
//   et la pastille de mise à jour ;
// B (3,3 → 6 s) la photo recule (flou, assombrie, teintée du dégradé du site), le nom glisse en haut
//   de la colonne de gauche, les fonctions clés arrivent une à une, et la vraie fenêtre de
//   l’application s’ouvre à droite (en dessous au format 4:5).

const B_FROM = 98; // début du passage A → B (images) : le problème reste lisible ~2,8 s
const B_TO = 120;

type Layout = {
  x: number;
  nameA: number; // taille du nom en A
  nameB: number; // taille du nom en B
  nameTopA: number;
  nameTopB: number;
  problem: number;
  problemW: number;
  colW: number; // largeur de la colonne de texte en B
  subtitle: number;
  feature: number;
  badge: number;
  capW: number;
};

const layoutFor = (landscape: boolean, width: number): Layout =>
  landscape
    ? {
        x: 100,
        nameA: 168,
        nameB: 100,
        nameTopA: 560,
        nameTopB: 318,
        problem: 42,
        problemW: 1120,
        colW: 640,
        subtitle: 34,
        feature: 32,
        badge: 26,
        capW: 1020,
      }
    : {
        x: 80,
        nameA: 136,
        nameB: 100,
        nameTopA: 808,
        nameTopB: 168,
        problem: 42,
        problemW: 920,
        colW: 920,
        subtitle: 38,
        feature: 40,
        badge: 26,
        capW: width - 80,
      };

export const ProjectSlide: React.FC<{ app: App; index: number }> = ({ app, index }) => {
  const { t, dur, lead, width, height, landscape } = useSlot();
  const L = layoutFor(landscape, width);
  const s = safe(landscape);
  const pB = prog(t, B_FROM, B_TO, easeInOut);
  const k = (t + lead) / (dur + 2 * lead);
  const out = leave(t, dur - 10, dur);
  const aOut = (delay: number, dist = 28) => enterLeave(t, delay, B_FROM - 6, B_FROM + 8, dist);

  // Nom : un seul élément qui glisse de A vers B (position et échelle).
  const nameTop = lerp(L.nameTopA, L.nameTopB, pB);
  const nameScale = lerp(1, L.nameB / L.nameA, pB);

  // Fenêtre de l’application.
  const capH = L.capW / CAPTURE_RATIO;
  const capEnter = 100;
  const capShow = dur + lead - capEnter;
  const nameBBottom = L.nameTopB + L.nameB;

  const pulse = (((t + 300) % 40) / 40) as number;

  const features = (
    <div style={{ display: "flex", flexDirection: "column", gap: landscape ? 18 : 16 }}>
      {app.features.map((f, i) => (
        <div
          key={f}
          style={{
            ...enter(t, 110 + i * 6, 0, 16),
            translate: `${(1 - prog(t, 110 + i * 6, 126 + i * 6)) * -30}px 0`,
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          <span
            style={{
              flex: "none",
              width: 10,
              height: 10,
              marginTop: L.feature * 0.5,
              borderRadius: 2,
              rotate: "45deg",
              background: app.accent,
              boxShadow: `0 0 12px ${app.accent}`,
            }}
          />
          <span
            style={{
              fontFamily: SANS,
              fontSize: L.feature,
              lineHeight: 1.3,
              color: "rgba(244,241,234,0.9)",
              textWrap: "balance",
              fontVariantNumeric: "lining-nums",
            }}
          >
            {fr(f)}
          </span>
        </div>
      ))}
    </div>
  );

  const badgesB = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {app.badges.map((b, i) => (
        <div key={b} style={enter(t, 128 + i * 3, 14, 14)}>
          <Badge accent={app.accent} size={L.badge}>
            {fr(b)}
          </Badge>
        </div>
      ))}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      {/* Fond : photo plein cadre qui recule en B */}
      <Photo
        src={app.photo}
        k={k}
        blur={pB * 22}
        brightness={lerp(0.86, 0.5, pB)}
        zoom={[1.04, 1.17]}
        drift={[index % 2 ? 1.5 : -1.5, -1]}
      />
      <AbsoluteFill style={{ background: app.background, opacity: 0.25 + 0.6 * pB }} />
      <AbsoluteFill
        style={{
          background: landscape
            ? "linear-gradient(90deg, rgba(6,7,9,0.88) 0%, rgba(6,7,9,0.55) 45%, rgba(6,7,9,0.05) 80%), linear-gradient(0deg, rgba(6,7,9,0.85) 0%, rgba(6,7,9,0) 55%)"
            : "linear-gradient(0deg, rgba(6,7,9,0.95) 0%, rgba(6,7,9,0.75) 40%, rgba(6,7,9,0) 75%)",
          opacity: 1 - 0.55 * pB,
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(70% 60% at ${landscape ? "72% 50%" : "50% 72%"}, ${app.accent}22 0%, transparent 70%)`, opacity: pB }} />
      <Vignette strength={0.8} />

      {/* Progression des cinq projets : même position d’un projet à l’autre */}
      <div
        style={{
          position: "absolute",
          left: s.x,
          top: s.top,
          ...(index === 0 ? enter(t, -6, 0, 14) : {}),
          ...(index === APPS.length - 1 ? leave(t, dur - 10, dur, 0) : {}),
        }}
      >
        <Progress index={index} total={APPS.length} accent={app.accent} fill={prog(t, 0, dur, (x) => x)} />
      </div>

      <AbsoluteFill style={out}>
        {/* A — pastille de mise à jour, au-dessus du nom */}
        {app.update ? (
          <div style={{ position: "absolute", left: L.x, top: L.nameTopA - 82, ...aOut(4, 20) }}>
            <UpdatePill text={fr(app.update)} accent={app.accent} pulse={pulse} />
          </div>
        ) : null}

        {/* Le nom, partagé par A et B */}
        <div
          style={{
            position: "absolute",
            left: L.x,
            top: nameTop,
            transformOrigin: "0 0",
            scale: String(nameScale),
            ...enter(t, -2, 40, 24),
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: L.nameA,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: SITE.ink,
            whiteSpace: "nowrap",
            textShadow: "0 4px 40px rgba(0,0,0,0.45)",
          }}
        >
          {app.name}
        </div>

        {/* A — le problème traité et les badges */}
        <div
          style={{
            position: "absolute",
            left: L.x,
            top: L.nameTopA + L.nameA + 26,
            width: L.problemW,
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <div
            style={{
              ...aOut(6, 24),
              fontFamily: SANS,
              fontWeight: 400,
              fontSize: L.problem,
              lineHeight: 1.28,
              color: "rgba(244,241,234,0.92)",
              textWrap: "balance",
            }}
          >
            {fr(app.problem)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {app.badges.map((b, i) => (
              <div key={b} style={aOut(14 + i * 4, 14)}>
                <Badge accent={app.accent} size={L.badge}>
                  {fr(b)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* B — colonne de texte et fenêtre de l’application */}
        {landscape ? (
          <>
            <div
              style={{
                position: "absolute",
                left: L.x,
                top: nameBBottom + 18,
                width: L.colW,
                display: "flex",
                flexDirection: "column",
                gap: 36,
              }}
            >
              <div style={{ ...enter(t, 104, 16), fontFamily: SANS, fontWeight: 500, fontSize: L.subtitle, color: app.accent }}>
                {fr(app.subtitle)}
              </div>
              {features}
              {badgesB}
            </div>
            <div
              style={{
                position: "absolute",
                right: s.x,
                top: (height - capH) / 2 + 30,
              }}
            >
              <CaptureWindow
                file={app.capture}
                fromSec={app.captureFromSec}
                width={L.capW}
                accent={app.accent}
                t={t}
                start={capEnter + lead}
                enterAt={capEnter}
                showFrames={capShow}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              left: L.x,
              right: L.x,
              top: nameBBottom + 14,
              bottom: s.bottom,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
              <div style={{ ...enter(t, 104, 16), fontFamily: SANS, fontWeight: 500, fontSize: L.subtitle, color: app.accent }}>
                {fr(app.subtitle)}
              </div>
              {features}
              {badgesB}
            </div>
            <div style={{ flex: 1, minHeight: 30 }} />
            <div style={{ marginLeft: -40 }}>
            <CaptureWindow
              file={app.capture}
              fromSec={app.captureFromSec}
              width={L.capW}
              accent={app.accent}
              t={t}
              start={capEnter + lead}
              enterAt={capEnter}
              showFrames={capShow}
            />
            </div>
            <div style={{ flex: 0.6 }} />
          </div>
        )}
      </AbsoluteFill>
      {/* Liseré d’accent qui balaie le bas du cadre au passage A → B */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 3,
          width: `${interpolate(pB, [0, 1], [0, 100])}%`,
          background: `linear-gradient(90deg, transparent, ${app.accent})`,
          opacity: 0.8 * (1 - prog(t, B_TO, B_TO + 20)),
        }}
      />
    </AbsoluteFill>
  );
};
