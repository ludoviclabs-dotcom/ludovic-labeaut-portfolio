import React from "react";
import QRCode from "qrcode";
import { AbsoluteFill, interpolate } from "remotion";
import { APPS, CONTACT, PERSON, PUBLICATIONS } from "../content";
import { SANS, SERIF, SITE } from "../theme";
import { enter, fr, prog } from "./anim";
import { useSlot } from "./slot";
import { Grid, Vignette } from "./ui";

// Carte de fin : nom, domaines, les six couleurs du portfolio, coordonnées, langues, technique,
// crédits. Tout est en place en 1,2 s et reste lisible plus de 4 s avant le fondu au noir final
// (dessiné par Presentation.tsx sur les 0,8 dernières secondes).
// Un QR code vers le portfolio complète les adresses écrites : on ne scanne pas l'écran du
// téléphone sur lequel on regarde, mais la vidéo passe aussi sur un autre écran (entretien, salon).

const Icon: React.FC<{ children: React.ReactNode; color: string; size: number }> = ({ children, color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
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

// Modules du QR code, calculés une fois (correction d'erreur M : version 3, 29 × 29 modules).
const QR = QRCode.create(CONTACT.qr, { errorCorrectionLevel: "M" }).modules;
const QUIET = 4; // marge blanche réglementaire, en modules

/** QR code en pixel art : les modules apparaissent au passage d'une ligne de balayage, puis l'image
 *  reste fixe (rien ne la recouvre) pour être scannée. Coins de viseur aux couleurs du portfolio. */
const QrCard: React.FC<{ t: number; module: number; accents: string[] }> = ({ t, module, accents }) => {
  const n = QR.size;
  const side = (n + QUIET * 2) * module;
  const FROM = 8; // image où commence le balayage
  const SWEEP = 18; // durée du balayage, en images
  const scanRow = ((t - FROM) / SWEEP) * n; // rangée atteinte par la ligne de balayage
  let d = "";
  for (let r = 0; r < n; r++) {
    if (r > scanRow) break;
    for (let c = 0; c < n; c++) if (QR.get(r, c)) d += `M${(c + QUIET) * module} ${(r + QUIET) * module}h${module}v${module}h-${module}z`;
  }
  const scanning = scanRow >= 0 && scanRow <= n;
  const corner = module * 3;
  const gap = module * 1.5;
  const brackets = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const;
  return (
    <div style={{ ...enter(t, 6, 14), position: "relative", width: side, height: side, flexShrink: 0 }}>
      <svg width={side} height={side} viewBox={`0 0 ${side} ${side}`} shapeRendering="crispEdges" style={{ display: "block" }}>
        <rect width={side} height={side} fill="#f4f1ea" />
        <path d={d} fill="#0b0c0f" />
        {scanning && <rect x={0} y={(Math.max(0, scanRow) + QUIET) * module} width={side} height={module} fill="#3df0ff" opacity={0.85} />}
      </svg>
      {/* Coins de viseur, en dehors de la marge blanche */}
      <svg
        width={side + gap * 2}
        height={side + gap * 2}
        style={{ position: "absolute", left: -gap, top: -gap, overflow: "visible" }}
        shapeRendering="crispEdges"
      >
        {brackets.map(([sx, sy], i) => {
          const x = sx < 0 ? 0 : side + gap * 2;
          const y = sy < 0 ? 0 : side + gap * 2;
          const k = prog(t, 10 + i * 2, 22 + i * 2);
          return (
            <path
              key={i}
              d={`M${x} ${y + -sy * corner * k}V${y}H${x + -sx * corner * k}`}
              fill="none"
              stroke={accents[(i * 2) % accents.length]}
              strokeWidth={module * 0.6}
              strokeLinecap="square"
            />
          );
        })}
      </svg>
    </div>
  );
};

export const Outro: React.FC = () => {
  const { t, dur, landscape } = useSlot();
  const accents = [...APPS.map((a) => a.accent), PUBLICATIONS.accent];
  const glow = interpolate(t, [0, dur], [0.9, 1.1]);

  const rows = [
    { icon: ICONS.mail, text: CONTACT.email },
    { icon: ICONS.linkedin, text: CONTACT.linkedin },
    { icon: ICONS.globe, text: CONTACT.portfolio },
    { icon: ICONS.book, text: CONTACT.publications },
  ].filter((r) => r.text);

  const rowSize = landscape ? 38 : 40;

  return (
    <AbsoluteFill style={{ background: SITE.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(110% 75% at 50% 0%, #1d2026 0%, ${SITE.bg} 62%)` }} />
      <Grid opacity={0.4} at="50% 35%" />
      {/* Halo aux six couleurs, très discret */}
      <AbsoluteFill
        style={{
          opacity: 0.22 * glow,
          background: `conic-gradient(from ${interpolate(t, [0, dur], [200, 240])}deg at 50% 38%, ${accents.join(", ")}, ${accents[0]})`,
          maskImage: "radial-gradient(38% 30% at 50% 38%, #000 0%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(38% 30% at 50% 38%, #000 0%, transparent 100%)",
          filter: "blur(40px)",
        }}
      />
      <Vignette />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: landscape ? "100px 120px 110px" : "110px 80px 110px",
          gap: landscape ? 26 : 26,
        }}
      >
        <div
          style={{
            ...enter(t, -6, 40, 20),
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: landscape ? 150 : 132,
            lineHeight: landscape ? 1 : 0.98,
            letterSpacing: "-0.01em",
            color: SITE.ink,
            textWrap: "balance",
          }}
        >
          {PERSON.name}
        </div>
        <div
          style={{
            ...enter(t, 0, 18),
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: landscape ? 30 : 30,
            letterSpacing: "0.3em",
            marginRight: "-0.3em",
            textTransform: "uppercase",
            color: SITE.inkDim,
          }}
        >
          {PERSON.domains}
        </div>
        {/* Les six couleurs des panneaux du portfolio */}
        <div style={{ display: "flex", gap: 10, margin: landscape ? "10px 0 18px" : "8px 0 14px" }}>
          {accents.map((c, i) => (
            <div
              key={c}
              style={{
                width: 60 * prog(t, 4 + i * 2, 18 + i * 2),
                height: 4,
                borderRadius: 2,
                background: c,
                boxShadow: `0 0 10px ${c}80`,
                marginRight: 60 * (1 - prog(t, 4 + i * 2, 18 + i * 2)),
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: landscape ? "row" : "column",
            alignItems: "center",
            gap: landscape ? 80 : 34,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: landscape ? 18 : 20 }}>
            {rows.map((r, i) => (
              <div key={r.text} style={{ ...enter(t, 6 + i * 3, 18), display: "flex", alignItems: "center", gap: 22 }}>
                <Icon color={accents[i % accents.length]} size={rowSize}>
                  {r.icon}
                </Icon>
                <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: rowSize, color: SITE.ink }}>{r.text}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: landscape ? "column" : "row", alignItems: "center", gap: landscape ? 18 : 28 }}>
            <QrCard t={t} module={6} accents={accents} />
            <div
              style={{
                ...enter(t, 18, 12),
                maxWidth: landscape ? 260 : 300,
                fontFamily: SANS,
                fontSize: landscape ? 22 : 26,
                lineHeight: 1.3,
                color: SITE.inkDim,
                textAlign: landscape ? "center" : "left",
              }}
            >
              {fr(CONTACT.qrLabel)}
            </div>
          </div>
        </div>
        <div
          style={{
            ...enter(t, 16, 14),
            marginTop: landscape ? 16 : 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: landscape ? 28 : 30, color: SITE.inkDim }}>{fr(CONTACT.languages)}</div>
          <div style={{ fontFamily: SANS, fontSize: landscape ? 24 : 26, letterSpacing: "0.06em", color: SITE.inkFaint, textWrap: "balance" }}>
            {fr(CONTACT.stack)}
          </div>
        </div>
        <div
          style={{
            ...enter(t, 20, 10),
            marginTop: landscape ? 10 : 8,
            maxWidth: landscape ? 1500 : 920,
            fontFamily: SANS,
            fontSize: landscape ? 24 : 26,
            lineHeight: 1.35,
            color: "rgba(244,241,234,0.42)",
            textWrap: "balance",
          }}
        >
          {fr(CONTACT.credits)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
