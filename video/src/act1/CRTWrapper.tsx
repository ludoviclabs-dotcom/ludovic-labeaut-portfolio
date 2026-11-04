import React, { useLayoutEffect, useRef } from "react";
import { PIXEL, SANS } from "../theme";
import { POWER_ON } from "../timeline";

// Téléviseur cathodique dessiné en CSS (meuble en bois, façade, molettes, bouton de mise en marche,
// grille du haut-parleur) et son écran : allumage (trait blanc qui s'ouvre, neige qui roule,
// indicatif CH 03, image qui roule puis se cale), lignes de balayage, vignettage, reflet du verre
// bombé, aberration chromatique (filtre SVG).
// Les dimensions sont en pixels « de conception » ; la caméra (GlitchTransition) met à l'échelle.

export const TV_W = 1280;
export const TV_H = 980;
export const SCREEN = { x: 50, y: 50, w: 960, h: 720 };
const PANEL = { x: 1040, y: SCREEN.y, w: 200, h: SCREEN.h };
// Bouton de mise en marche (coordonnées du panneau de commande).
const WELL = { x: 24, y: 360, w: 152, h: 80 };
const CAP = { x: 32, y: 366, w: 136, h: 58 };
const LED = { x: 170, y: 333, d: 16 };
/** Centre du gros plan d'ouverture (étiquette POWER, voyant et bouton), en coordonnées du téléviseur. */
export const POWER_CLOSEUP = { x: PANEL.x + 100, y: PANEL.y + 392 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const hash = (n: number) => {
  let h = Math.imul(n ^ 0x3243f6a8, 0x9e3779b1);
  h ^= h >>> 15;
  return ((Math.imul(h, 0x85ebca6b) ^ (h >>> 13)) >>> 0) / 4294967296;
};

/** Lumière émise par l'écran (0 éteint, 1 image) : éclaire la façade et la pièce. */
export const screenLightAt = (t: number) => {
  const P = POWER_ON;
  return 0.75 * smooth(P.lineSec, P.openSec + 0.1, t) - 0.25 * smooth(P.openSec + 0.2, P.snowFromSec + 0.4, t) + 0.5 * smooth(P.pictureSec, P.snowEndSec, t);
};

/** Enfoncement du bouton (0 sorti, 1 au fond) : il descend, touche le fond au déclic, puis se verrouille un peu plus haut. */
const buttonDepth = (t: number) => {
  const b = POWER_ON.buttonSec;
  return smooth(b - 0.13, b, t) - 0.3 * smooth(b + 0.02, b + 0.16, t);
};

const SnowCanvas: React.FC<{ frame: number; timeSec: number }> = ({ frame, timeSec }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const w = 240;
    const h = 180;
    const img = ctx.createImageData(w, h);
    const local = Math.max(0, timeSec - POWER_ON.snowFromSec);
    // Défilement vertical (« vertical hold ») : la barre noire d'effacement roule vers le bas,
    // de plus en plus lentement ; une bande plus claire roule plus vite par-dessus.
    const holdPos = (local * 0.62 - 0.05 * local * local) * h;
    const vbar = ((holdPos % (h + 26)) + h + 26) % (h + 26) - 13;
    const bright = (((local * 1.15 + 0.35) % 1) + 1) % 1 * (h + 40) - 20;
    const gain = 0.82 + 0.25 * (1 - smooth(POWER_ON.snowFromSec, POWER_ON.snowFromSec + 0.5, timeSec));
    let seed = frame * 7919 + 13;
    for (let y = 0; y < h; y++) {
      const dv = y - vbar;
      const inBar = Math.abs(dv) < 9;
      const edge = Math.abs(Math.abs(dv) - 9) < 1;
      const boost = 64 * Math.exp(-((y - bright) * (y - bright)) / 120);
      let v = 0;
      for (let x = 0; x < w; x++) {
        // Une valeur pour deux pixels : la neige analogique est étirée horizontalement.
        if ((x & 1) === 0) {
          seed = (seed * 1664525 + 1013904223) | 0;
          v = (seed >>> 16) & 255;
        }
        let c = v * gain + boost;
        if (inBar) c *= 0.12;
        if (edge) c = c * 0.6 + 90;
        const i = (y * w + x) * 4;
        img.data[i] = c;
        img.data[i + 1] = c;
        img.data[i + 2] = c + 12;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, timeSec]);
  return (
    <canvas
      ref={ref}
      width={240}
      height={180}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
};

const Knob: React.FC<{ top: number }> = ({ top }) => (
  <div
    style={{
      position: "absolute",
      left: 48,
      top,
      width: 104,
      height: 104,
      borderRadius: "50%",
      background: "conic-gradient(from 20deg, #6d6a73, #2b2a30, #8c8992, #2b2a30, #6d6a73)",
      boxShadow: "0 6px 14px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.25)",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 18,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #4a4850, #1c1b20)",
      }}
    />
    <div style={{ position: "absolute", left: 49, top: 8, width: 6, height: 26, borderRadius: 3, background: "#d8d4dc" }} />
  </div>
);

/** Symbole de mise en marche (cercle ouvert et trait), dessiné en SVG. */
const PowerGlyph: React.FC<{ size: number; color: string; stroke?: number }> = ({ size, color, stroke = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M7.05 6.6 A8 8 0 1 0 16.95 6.6" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    <path d="M12 3 V11.5" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
  </svg>
);

/** Le bouton de mise en marche, son logement, son étiquette et le voyant. */
const PowerControl: React.FC<{ t: number }> = ({ t }) => {
  const depth = buttonDepth(t);
  const lip = 9 * (1 - depth) + 1.5; // face supérieure visible tant que le bouton dépasse
  const capTop = CAP.y + 7 * depth;
  return (
    <>
      {/* Étiquette gravée */}
      <div style={{ position: "absolute", left: 24, top: 320, display: "flex", alignItems: "center", gap: 8 }}>
        <PowerGlyph size={24} color="#a9a5b3" />
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 19, letterSpacing: "0.16em", color: "#a9a5b3" }}>POWER</span>
      </div>
      {/* Logement */}
      <div
        style={{
          position: "absolute",
          left: WELL.x,
          top: WELL.y,
          width: WELL.w,
          height: WELL.h,
          borderRadius: 12,
          background: "#060508",
          boxShadow: "inset 0 4px 10px rgba(0,0,0,0.95), 0 1px 0 rgba(255,255,255,0.08)",
        }}
      />
      {/* Face supérieure du bouton (visible tant qu'il dépasse) */}
      <div
        style={{
          position: "absolute",
          left: CAP.x + 3,
          top: capTop - lip,
          width: CAP.w - 6,
          height: lip + 6,
          borderRadius: "8px 8px 0 0",
          background: "linear-gradient(180deg, #8d8a95, #55525c)",
        }}
      />
      {/* Bouton */}
      <div
        style={{
          position: "absolute",
          left: CAP.x,
          top: capTop,
          width: CAP.w,
          height: CAP.h,
          borderRadius: 8,
          background: `linear-gradient(180deg, ${depth > 0.5 ? "#3b3940" : "#47454d"}, #26252a)`,
          boxShadow: `0 ${10 - 8 * depth}px ${14 - 8 * depth}px rgba(0,0,0,${0.75 - 0.3 * depth}), inset 0 1px 0 rgba(255,255,255,${0.22 - 0.12 * depth})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PowerGlyph size={30} color={`rgba(20,19,23,${0.9})`} stroke={2.8} />
      </div>
    </>
  );
};

export const CRTWrapper: React.FC<{
  frame: number;
  timeSec: number;
  /** Intensité du glitch (0 à 1) : renforce l'aberration chromatique. */
  glitch: number;
  children: React.ReactNode;
}> = ({ frame, timeSec: t, glitch, children }) => {
  const P = POWER_ON;
  // Voyant : il s'allume au déclic, avec un bref vacillement.
  const ledOn = t >= P.buttonSec && !(t > P.buttonSec + 0.05 && t < P.buttonSec + 0.09);
  // Réchauffement du tube, puis trait blanc : il s'étire horizontalement, puis s'ouvre verticalement.
  const warm = smooth(P.lineSec - 0.3, P.lineSec, t) * (t < P.lineSec + 0.1 ? 1 : 0);
  const lineX = smooth(P.lineSec, P.openSec - 0.05, t);
  const open = smooth(P.openSec, P.openSec + 0.26, t);
  const flashOpacity = t < P.lineSec ? 0 : 1 - smooth(P.snowFromSec - 0.05, P.snowFromSec + 0.3, t);
  const snowOpacity = t < P.openSec + 0.05 ? 0 : 1 - smooth(P.pictureSec + 0.1, P.snowEndSec, t);
  const picture = smooth(P.pictureSec, P.pictureSec + 0.6, t);
  // L'image roule (défilement vertical) puis se cale à la fin de la neige.
  const rollPos = 1.35 * (1 - easeOutCubic((t - P.pictureSec) / (P.snowEndSec - P.pictureSec)));
  const roll = t >= P.snowEndSec ? 0 : rollPos % 1;
  const rollJitter = t < P.snowEndSec && t >= P.pictureSec ? (hash(frame) * 2 - 1) * 6 * (1 - picture * 0.5) : 0;
  const overshoot = 1 + 0.3 * (1 - smooth(P.snowEndSec, P.snowEndSec + 0.7, t));
  const flicker = 0.965 + 0.035 * Math.sin(frame * 2.7) * Math.sin(frame * 1.3);
  const split = 1.6 + 7 * glitch;
  const osd = t >= 2.0 && t < 4.4;
  const osdAlpha = osd ? 0.82 + 0.18 * hash(frame * 3 + 1) : 0;

  const light = screenLightAt(t);
  // Pièce dans le noir au début : la façade n'est éclairée que faiblement, puis par l'écran.
  const dark = 0.6 * (1 - smooth(P.lineSec, P.snowEndSec, t));
  const snowLevel = t < P.openSec ? 0 : 1 - smooth(P.pictureSec, P.snowEndSec, t);
  const BAR = 0.06; // barre noire entre deux images qui roulent (fraction de la hauteur)

  const pictureLayer = (offset: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        inset: 0,
        opacity: picture * flicker,
        translate: `${rollJitter}px ${offset * 100}%`,
        filter: `url(#crt-rgb) brightness(${overshoot}) saturate(1.15)`,
      }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: TV_W, height: TV_H }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="crt-rgb" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={split} dy={0} result="r2" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-split} dy={0} result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </svg>

      {/* Meuble en bois */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: TV_W,
          height: 920,
          borderRadius: 40,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(0,0,0,0.3)), repeating-linear-gradient(91deg, #4a2c19 0px, #3d2414 7px, #4f301b 13px, #3a2112 21px, #442818 30px)",
          boxShadow: "0 50px 90px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -4px 0 rgba(0,0,0,0.4)",
        }}
      />
      {/* Façade */}
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 22,
          width: TV_W - 44,
          height: 876,
          borderRadius: 24,
          background: "linear-gradient(180deg, #1f1e23, #141317)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      />
      {/* Logement de l'écran */}
      <div
        style={{
          position: "absolute",
          left: SCREEN.x - 14,
          top: SCREEN.y - 14,
          width: SCREEN.w + 28,
          height: SCREEN.h + 28,
          borderRadius: "60px / 54px",
          background: "#050506",
          boxShadow: "inset 0 0 24px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.06)",
        }}
      />
      {/* Panneau de commande */}
      <div
        style={{
          position: "absolute",
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          height: PANEL.h,
          borderRadius: 14,
          background: "linear-gradient(180deg, #19181c, #111013)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <Knob top={40} />
        <Knob top={180} />
        <PowerControl t={t} />
        <div
          style={{
            position: "absolute",
            left: LED.x - LED.d / 2,
            top: LED.y - LED.d / 2,
            width: LED.d,
            height: LED.d,
            borderRadius: "50%",
            background: "#3a1015",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)",
          }}
        />
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 30,
              top: 482 + i * 22,
              width: 140,
              height: 8,
              borderRadius: 4,
              background: "#060507",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.05)",
            }}
          />
        ))}
      </div>
      {/* Bandeau bas : boutons */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 760 + i * 62,
            top: 812,
            width: 46,
            height: 26,
            borderRadius: 5,
            background: "linear-gradient(180deg, #3a3940, #1d1c21)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.6)",
          }}
        />
      ))}
      <div style={{ position: "absolute", left: 60, top: 824, width: 640, height: 2, background: "rgba(255,255,255,0.08)" }} />
      {/* Pieds */}
      {[150, TV_W - 310].map((x) => (
        <div key={x} style={{ position: "absolute", left: x, top: 916, width: 160, height: 44, borderRadius: "0 0 12px 12px", background: "#1a0f09" }} />
      ))}

      {/* Pénombre de la pièce : seul un faible éclairage d'ambiance touche le panneau de commande. */}
      {dark > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: TV_W,
            height: 960,
            borderRadius: 40,
            background: `radial-gradient(420px 360px at ${POWER_CLOSEUP.x}px ${POWER_CLOSEUP.y - 30}px, rgba(4,3,8,${dark * 0.45}) 0%, rgba(4,3,8,${dark}) 100%)`,
          }}
        />
      ) : null}

      {/* Voyant rouge et sa lueur sur le panneau */}
      {ledOn ? (
        <>
          <div
            style={{
              position: "absolute",
              left: PANEL.x + LED.x - 110,
              top: PANEL.y + LED.y - 110,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(255,40,60,${0.32 * (1 - 0.6 * light)}) 0%, rgba(255,40,60,0) 70%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: PANEL.x + LED.x - LED.d / 2,
              top: PANEL.y + LED.y - LED.d / 2,
              width: LED.d,
              height: LED.d,
              borderRadius: "50%",
              background: "radial-gradient(circle at 40% 35%, #ffd0d4, #ff2a3a 55%, #c4101f)",
              boxShadow: "0 0 14px 4px rgba(255,42,58,0.75)",
            }}
          />
        </>
      ) : null}

      {/* Écran */}
      <div
        style={{
          position: "absolute",
          left: SCREEN.x,
          top: SCREEN.y,
          width: SCREEN.w,
          height: SCREEN.h,
          borderRadius: "48px / 42px",
          overflow: "hidden",
          background: "radial-gradient(120% 120% at 40% 35%, #1a1f1d 0%, #0b0e0d 60%, #050606 100%)",
        }}
      >
        {picture > 0
          ? roll > 0
            ? [pictureLayer(roll * (1 + BAR), "a"), pictureLayer(roll * (1 + BAR) - (1 + BAR), "b")]
            : pictureLayer(0, "a")
          : null}

        {snowOpacity > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: snowOpacity * (0.75 + 0.25 * (1 - picture)) }}>
            <SnowCanvas frame={frame} timeSec={t} />
          </div>
        ) : null}

        {/* Réchauffement du tube : un point bleuté au centre, juste avant le trait. */}
        {warm > 0 ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 30,
              height: 30,
              translate: "-50% -50%",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(230,245,255,0.9), rgba(160,200,255,0) 70%)",
              opacity: warm,
            }}
          />
        ) : null}

        {flashOpacity > 0 ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: Math.max(8, SCREEN.w * lineX),
              height: 4 + (SCREEN.h - 4) * open,
              translate: "-50% -50%",
              background: "#ffffff",
              opacity: flashOpacity,
              boxShadow: "0 0 40px 12px rgba(220,240,255,0.9)",
            }}
          />
        ) : null}

        {osd ? (
          <div
            style={{
              position: "absolute",
              right: 58,
              top: 44,
              fontFamily: PIXEL,
              fontSize: 64,
              lineHeight: 1,
              fontVariantNumeric: "lining-nums",
              color: "#7dff9a",
              opacity: osdAlpha,
              textShadow: "0 0 10px rgba(125,255,154,0.8)",
            }}
          >
            CH 03
          </div>
        ) : null}

        {/* Lignes de balayage, une par ligne de la toile (3 px de conception) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: t >= P.lineSec ? 1 : 0,
            background:
              "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.32) 2px, rgba(0,0,0,0.32) 3px)",
            mixBlendMode: "multiply",
          }}
        />
        {/* Verre bombé : vignettage et reflet (plus discret tant que la pièce est sombre) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "48px / 42px",
            boxShadow: "inset 0 0 140px rgba(0,0,0,0.85), inset 0 0 36px rgba(0,0,0,0.9)",
            background: `radial-gradient(130% 90% at 30% 12%, rgba(255,255,255,${0.04 + 0.06 * (1 - dark / 0.6)}) 0%, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0) 55%)`,
          }}
        />
      </div>

      {/* Lueur de l'écran sur la façade : bleutée pendant la neige, rose avec l'image. */}
      {light > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: SCREEN.x - 14,
            top: SCREEN.y - 14,
            width: SCREEN.w + 28,
            height: SCREEN.h + 28,
            borderRadius: "60px / 54px",
            boxShadow: `0 0 70px 14px rgba(${Math.round(255 - 50 * snowLevel)}, ${Math.round(61 + 164 * snowLevel)}, ${Math.round(154 + 101 * snowLevel)}, ${0.24 * Math.min(1, light)})`,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
};
