import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { SANS, SITE } from "../theme";

// Briques visuelles de la vitrine : photo en mouvement lent, voiles, badges, pastilles, progression.

/** Photo plein cadre avec un Ken Burns lent ; flou et assombrissement réglables (images dérivées de t). */
export const Photo: React.FC<{
  src: string;
  /** Avancement du Ken Burns, de 0 à 1 sur la durée d'affichage. */
  k: number;
  blur?: number;
  brightness?: number;
  /** Point fixe du zoom, en % (x y). */
  origin?: string;
  zoom?: [number, number];
  drift?: [number, number];
}> = ({ src, k, blur = 0, brightness = 1, origin = "50% 50%", zoom = [1.05, 1.16], drift = [0, -1.5] }) => {
  const s = interpolate(k, [0, 1], zoom) + blur * 0.004;
  const dx = interpolate(k, [0, 1], [0, drift[0]]);
  const dy = interpolate(k, [0, 1], [0, drift[1]]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(`photos/${src}`)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: origin,
          transform: `translate(${dx}%, ${dy}%) scale(${s})`,
          filter: `${blur > 0.05 ? `blur(${blur}px) ` : ""}brightness(${brightness}) saturate(0.92)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Grain de lumière d'accent et vignette, communs à tous les plans. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.55 * strength}) 100%)`,
    }}
  />
);

/** Quadrillage fin façon interface moderne, masqué en halo. */
export const Grid: React.FC<{ opacity?: number; size?: number; at?: string }> = ({ opacity = 0.5, size = 64, at = "50% 40%" }) => (
  <AbsoluteFill
    style={{
      opacity,
      backgroundImage: `linear-gradient(${SITE.line} 1px, transparent 1px), linear-gradient(90deg, ${SITE.line} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: "center center",
      maskImage: `radial-gradient(60% 60% at ${at}, #000 0%, transparent 100%)`,
      WebkitMaskImage: `radial-gradient(60% 60% at ${at}, #000 0%, transparent 100%)`,
    }}
  />
);

/** Badge thématique (pilule bordée de la couleur d'accent). */
export const Badge: React.FC<{ children: React.ReactNode; accent: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  accent,
  size = 26,
  style,
}) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      color: SITE.ink,
      padding: `${size * 0.42}px ${size * 0.72}px`,
      borderRadius: 999,
      border: `1px solid ${accent}8c`,
      background: `${accent}1f`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Pastille « nouveauté » : point lumineux et texte (mise à jour récente vérifiable). */
export const UpdatePill: React.FC<{ text: string; accent: string; size?: number; pulse: number; style?: React.CSSProperties }> = ({
  text,
  accent,
  size = 26,
  pulse,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.55,
      fontFamily: SANS,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      color: SITE.ink,
      padding: `${size * 0.45}px ${size * 0.8}px ${size * 0.45}px ${size * 0.6}px`,
      borderRadius: 999,
      background: "rgba(11, 12, 14, 0.62)",
      border: `1px solid rgba(244, 241, 234, 0.22)`,
      boxShadow: `0 0 0 1px rgba(0,0,0,0.2), 0 10px 30px rgba(0,0,0,0.35)`,
      whiteSpace: "nowrap",
      fontVariantNumeric: "lining-nums",
      ...style,
    }}
  >
    <span style={{ position: "relative", width: size * 0.42, height: size * 0.42 }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: accent,
          boxShadow: `0 0 ${size * 0.5}px ${accent}`,
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: -size * 0.3 * pulse,
          borderRadius: 999,
          border: `1px solid ${accent}`,
          opacity: 1 - pulse,
        }}
      />
    </span>
    {text}
  </div>
);

/** Indicateur de progression des projets : « 02 / 05 » et cinq segments. */
export const Progress: React.FC<{ index: number; total: number; accent: string; fill: number }> = ({ index, total, accent, fill }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
    <span
      style={{
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 26,
        letterSpacing: "0.18em",
        color: SITE.ink,
        fontVariantNumeric: "tabular-nums lining-nums",
      }}
    >
      {String(index + 1).padStart(2, "0")}
      <span style={{ color: SITE.inkFaint }}> / {String(total).padStart(2, "0")}</span>
    </span>
    <div style={{ display: "flex", gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            width: 46,
            height: 5,
            borderRadius: 3,
            overflow: "hidden",
            background: i < index ? "rgba(244,241,234,0.55)" : "rgba(244,241,234,0.18)",
          }}
        >
          {i === index ? (
            <div style={{ position: "absolute", inset: 0, width: `${fill * 100}%`, background: accent, boxShadow: `0 0 10px ${accent}` }} />
          ) : null}
        </div>
      ))}
    </div>
  </div>
);
