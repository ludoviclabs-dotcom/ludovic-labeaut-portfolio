import React, { useLayoutEffect, useRef } from "react";
import { PIXEL } from "../theme";
import { POWER_ON } from "../timeline";

// Téléviseur cathodique dessiné en CSS (meuble en bois, façade, molettes, grille du haut-parleur)
// et son écran : allumage (trait blanc qui s'ouvre, neige), lignes de balayage, vignettage,
// reflet du verre bombé, aberration chromatique (filtre SVG).
// Les dimensions sont en pixels « de conception » ; la caméra (GlitchTransition) met à l'échelle.

export const TV_W = 1280;
export const TV_H = 980;
export const SCREEN = { x: 50, y: 50, w: 960, h: 720 };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const SnowCanvas: React.FC<{ frame: number; timeSec: number }> = ({ frame, timeSec }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const w = 240;
    const h = 180;
    const img = ctx.createImageData(w, h);
    let seed = frame * 7919 + 13;
    const band = ((timeSec * 1.7) % 1) * h;
    for (let i = 0; i < w * h; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      const y = Math.floor(i / w);
      const boost = Math.abs(y - band) < 14 ? 60 : 0;
      const v = (((seed >>> 16) & 255) * 0.85 + boost) | 0;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v + 10;
      img.data[i * 4 + 3] = 255;
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

export const CRTWrapper: React.FC<{
  frame: number;
  timeSec: number;
  /** Intensité du glitch (0 à 1) : renforce l'aberration chromatique. */
  glitch: number;
  children: React.ReactNode;
}> = ({ frame, timeSec: t, glitch, children }) => {
  const P = POWER_ON;
  const ledOn = t >= P.clickSec;
  // Trait blanc : il s'étire horizontalement, puis s'ouvre verticalement.
  const lineX = smooth(P.lineSec, P.openSec, t);
  const open = smooth(P.openSec, P.openSec + 0.28, t);
  const flashOpacity = t < P.lineSec ? 0 : 1 - smooth(P.openSec + 0.15, P.openSec + 0.5, t);
  const snowOpacity = t < P.openSec + 0.05 ? 0 : 1 - smooth(P.pictureSec, P.snowEndSec, t);
  const picture = smooth(P.pictureSec, P.snowEndSec, t);
  const roll = (1 - smooth(P.pictureSec, P.snowEndSec + 0.25, t)) * -22;
  const overshoot = 1 + 0.45 * (1 - smooth(P.snowEndSec, P.snowEndSec + 0.7, t));
  const flicker = 0.965 + 0.035 * Math.sin(frame * 2.7) * Math.sin(frame * 1.3);
  const split = 1.6 + 7 * glitch;
  const osd = t > P.snowEndSec && t < P.snowEndSec + 2.4 && Math.floor(t * 3) % 6 !== 5;

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
          left: 1040,
          top: SCREEN.y,
          width: 200,
          height: SCREEN.h,
          borderRadius: 14,
          background: "linear-gradient(180deg, #19181c, #111013)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <Knob top={60} />
        <Knob top={220} />
        <div
          style={{
            position: "absolute",
            left: 92,
            top: 372,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: ledOn ? "#ff2a3a" : "#3a1015",
            boxShadow: ledOn ? "0 0 14px 4px rgba(255,42,58,0.7)" : "none",
          }}
        />
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 30,
              top: 440 + i * 22,
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: picture * flicker,
            translate: `0 ${roll}%`,
            filter: `url(#crt-rgb) brightness(${overshoot}) saturate(1.15)`,
          }}
        >
          {children}
        </div>

        {snowOpacity > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: snowOpacity }}>
            <SnowCanvas frame={frame} timeSec={t} />
          </div>
        ) : null}

        {flashOpacity > 0 ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: SCREEN.w * lineX,
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
              right: 54,
              top: 40,
              fontFamily: PIXEL,
              fontSize: 56,
              color: "#7dff9a",
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
        {/* Verre bombé : vignettage et reflet */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "48px / 42px",
            boxShadow: "inset 0 0 140px rgba(0,0,0,0.85), inset 0 0 36px rgba(0,0,0,0.9)",
            background:
              "radial-gradient(130% 90% at 30% 12%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0) 55%)",
          }}
        />
      </div>

      {/* Lueur de l'écran sur la façade */}
      <div
        style={{
          position: "absolute",
          left: SCREEN.x - 14,
          top: SCREEN.y - 14,
          width: SCREEN.w + 28,
          height: SCREEN.h + 28,
          borderRadius: "60px / 54px",
          boxShadow: `0 0 60px 10px rgba(255, 61, 154, ${0.22 * picture})`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
