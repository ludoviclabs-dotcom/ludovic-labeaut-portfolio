import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { POWER_ON, PROLOGUE_SEC } from "../timeline";
import { TV_H, TV_W } from "./CRTWrapper";

// Prologue : un plan large de la pièce, avant le téléviseur. Un cadre en chemise blanche et
// cravate bleue entre, s'assoit dans un fauteuil face au poste éteint, tend le bras et l'allume à
// la télécommande ; la lueur de l'écran éclaire sa chemise, puis la caméra avance vers le poste.
//
// Anonymat : le visage n'est jamais visible. En 16:9, le cadre coupe au ras du col ; en 4:5, la
// tête reste une silhouette noire, sans aucun détail, dans l'ombre de la pièce.
// Éclairage en clair-obscur : une faible lumière d'ambiance froide, puis le contre-jour de l'écran
// (côté droit du personnage), qui vacille avec la neige.
//
// Temps t : celui du téléviseur (négatif avant le début du poste ; −PROLOGUE_SEC à l'image 0).

/** Début du travelling avant vers le poste (temps du téléviseur). */
export const PUSH_IN_FROM = 1.2;

/** Plan large : le poste, plus petit, à droite du centre ; le personnage occupe la gauche. */
export const prologueFraming = (width: number, height: number, base: number) => {
  const portrait = height > width;
  const s = base * (portrait ? 0.5 : 0.4);
  const at = portrait ? { x: 0.66 * width, y: 0.27 * height } : { x: 0.67 * width, y: 0.5 * height };
  return { s, cx: TV_W / 2 - (at.x - width / 2) / s, cy: TV_H / 2 - (at.y - height / 2) / s };
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (n: number) => {
  let h = Math.imul(n ^ 0x2f6b1d3a, 0x9e3779b1);
  h ^= h >>> 15;
  return ((Math.imul(h, 0x85ebca6b) ^ (h >>> 13)) >>> 0) / 4294967296;
};
type Pt = [number, number];
const lerpPt = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const rgb = (a: [number, number, number], b: [number, number, number], k: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)}, ${Math.round(a[1] + (b[1] - a[1]) * k)}, ${Math.round(a[2] + (b[2] - a[2]) * k)})`;

// Couleurs : dans l'ombre (ambiance) → éclairé par l'écran.
const SHIRT_DARK: [number, number, number] = [26, 29, 40];
const SHIRT_AMB: [number, number, number] = [86, 93, 112];
const SHIRT_LIT: [number, number, number] = [236, 246, 255];
const TIE_DARK: [number, number, number] = [10, 22, 54];
const TIE_LIT: [number, number, number] = [70, 120, 255];
const SKIN_AMB: [number, number, number] = [92, 70, 62];
const SKIN_LIT: [number, number, number] = [232, 200, 182];

export const Prologue: React.FC<{ t: number; frame: number; push: number; light: number }> = ({ t, frame, push, light }) => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const a = t + PROLOGUE_SEC; // temps depuis le début de la vidéo
  const P = POWER_ON;

  // Lumière de l'écran sur le personnage : elle vacille avec la neige.
  const snow = t >= P.openSec && t < P.snowEndSec;
  const flick = snow ? 0.8 + 0.2 * hash(frame) : 1;
  const L = clamp01(light * 1.25) * flick;
  const amb = 0.36; // ambiance froide, très faible (côté gauche du personnage)

  // Le personnage entre et s'assoit (0 → 1,4 s), puis tend le bras (1,4 → 2,25 s) ;
  // la télécommande est pressée au déclic du poste (POWER_ON.buttonSec).
  const sit = ease((a - 0.05) / 1.25);
  const settle = a > 1.3 ? Math.exp(-(a - 1.3) / 0.12) * Math.sin((a - 1.3) * 28) * 7 : 0;
  const reach = ease((a - 1.4) / 0.85);
  const press = t - P.buttonSec;
  const jab = press > -0.08 && press < 0.2 ? Math.sin(clamp01((press + 0.08) / 0.28) * Math.PI) * 8 : 0;
  const ir = press >= -0.02 && press < 0.12;

  // Squelette (unités : 1000 = hauteur de la boîte du personnage).
  const hip = add(lerpPt([60, 360], [300, 640], sit), [0, settle]);
  const lean = -0.06 * sit; // le buste penche un peu en arrière une fois assis
  const torsoLen = 560;
  const shoulderC: Pt = [hip[0] + Math.sin(lean) * torsoLen, hip[1] - Math.cos(lean) * torsoLen];
  const knee = add(hip, lerpPt([40, 290], [320, 25], sit));
  const ankle = add(knee, lerpPt([0, 300], [20, 300], sit));
  const shoulder: Pt = add(shoulderC, [70, 40]); // épaule du côté de la caméra (bras droit)
  // En 4:5, le geste est plus court : la main reste sous l'écran.
  const rk = portrait ? 0.72 : 1;
  const elbow = add(shoulder, lerpPt(lerpPt([10, 290], [30, 290], sit), [200 * rk, 140], reach));
  // Bras qui pend en entrant, avant-bras posé sur l'accoudoir une fois assis, puis tendu vers le poste.
  const hand = add(elbow, lerpPt(lerpPt([25, 235], [210, 50], sit), [(250 + jab) * rk, portrait ? 10 : -20], reach));

  // Contour de la chemise (vue de trois quarts, face tournée vers le poste, à droite).
  const sx = shoulderC[0];
  const sy = shoulderC[1];
  const torso = [
    `M ${sx - 140} ${sy + 26}`,
    `C ${sx - 175} ${sy + 170}, ${hip[0] - 135} ${hip[1] - 210}, ${hip[0] - 100} ${hip[1] + 10}`,
    `L ${hip[0] + 100} ${hip[1] + 20}`,
    `C ${hip[0] + 132} ${hip[1] - 160}, ${sx + 168} ${sy + 240}, ${sx + 120} ${sy + 12}`,
    `C ${sx + 70} ${sy - 20}, ${sx - 80} ${sy - 12}, ${sx - 140} ${sy + 26} Z`,
  ].join(" ");
  const tie = [
    `M ${sx + 54} ${sy + 30}`,
    `L ${sx + 78} ${sy + 30}`,
    `L ${sx + 92} ${sy + 330}`,
    `L ${sx + 74} ${sy + 372}`,
    `L ${sx + 52} ${sy + 330} Z`,
  ].join(" ");

  // Boîte du personnage dans l'image (carré, ancré en bas à gauche).
  const box = portrait ? { size: 0.6 * height, left: -0.06 * width } : { size: 1.04 * height, left: -0.02 * width };
  const top = height - box.size;
  // Pendant le travelling avant, le personnage glisse hors champ vers la gauche (premier plan).
  const exitX = -0.62 * width * push;
  const exitScale = 1 + 0.6 * push;
  const opacity = 1 - smooth(0.55, 0.92, push);

  const shirtGrad = (id: string, x0: number, x1: number) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x0} y1={0} x2={x1} y2={0}>
      {/* Gauche : faible lumière froide de la pièce ; milieu : ombre ; droite : contre-jour de l'écran. */}
      <stop offset="0" stopColor={rgb(SHIRT_DARK, SHIRT_AMB, amb * 1.6)} />
      <stop offset="0.45" stopColor={rgb(SHIRT_DARK, SHIRT_AMB, amb * 0.5 + 0.2 * L)} />
      <stop offset="0.8" stopColor={rgb(SHIRT_DARK, SHIRT_LIT, 0.08 + 0.55 * L)} />
      <stop offset="1" stopColor={rgb(SHIRT_DARK, SHIRT_LIT, 0.14 + 0.86 * L)} />
    </linearGradient>
  );
  const rim = `rgba(214, 240, 255, ${0.85 * L})`;

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {/* Sol de la pièce : un reflet discret de l'écran */}
      <AbsoluteFill
        style={{
          top: portrait ? "52%" : "70%",
          background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(70, 40, 110, ${0.12 + 0.18 * L}) 40%, rgba(3, 2, 5, 0.9) 100%)`,
          opacity: 1 - push,
        }}
      />
      <svg
        viewBox="0 0 1000 1000"
        style={{
          position: "absolute",
          left: box.left,
          top,
          width: box.size,
          height: box.size,
          overflow: "visible",
          transformOrigin: "0% 100%",
          transform: `translateX(${exitX}px) scale(${exitScale})`,
        }}
      >
        <defs>
          {shirtGrad("pro-shirt", sx - 170, sx + 160)}
          {shirtGrad("pro-sleeve", shoulder[0] - 40, hand[0] + 40)}
          <linearGradient id="pro-tie" gradientUnits="userSpaceOnUse" x1={sx + 50} y1={0} x2={sx + 95} y2={0}>
            <stop offset="0" stopColor={rgb(TIE_DARK, TIE_DARK, 0)} />
            <stop offset="1" stopColor={rgb(TIE_DARK, TIE_LIT, Math.min(1, 0.2 + 0.9 * L))} />
          </linearGradient>
          <linearGradient id="pro-leather" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#07040a" />
            <stop offset="1" stopColor={rgb([20, 12, 14], [70, 44, 52], 0.2 + 0.6 * L)} />
          </linearGradient>
        </defs>

        {/* Fauteuil : dossier derrière le buste */}
        <path d="M 70 170 Q 70 120 130 120 L 300 120 Q 350 120 350 180 L 350 720 L 70 720 Z" fill="url(#pro-leather)" />

        {/* Jambes (pantalon sombre) */}
        <path d={`M ${hip[0]} ${hip[1]} L ${knee[0]} ${knee[1]} L ${ankle[0]} ${ankle[1]}`} stroke="#0a0b11" strokeWidth={128} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={`M ${hip[0] + 40} ${hip[1] - 50} L ${knee[0]} ${knee[1] - 60}`} stroke={`rgba(150, 170, 220, ${0.35 * L})`} strokeWidth={6} strokeLinecap="round" fill="none" />
        <path d={`M ${ankle[0] - 30} ${ankle[1] + 30} L ${ankle[0] + 95} ${ankle[1] + 38}`} stroke="#050507" strokeWidth={46} strokeLinecap="round" fill="none" />

        {/* Assise du fauteuil */}
        <rect x={60} y={660} width={330} height={110} rx={26} fill="url(#pro-leather)" />

        {/* Tête et cou : une silhouette dans l'ombre, sans aucun détail ; seul le contour arrière
            accroche un peu de la lumière froide de la pièce. */}
        <path
          d={`M ${sx + 8} ${sy + 4} L ${sx + 4} ${sy - 70} C ${sx - 60} ${sy - 90}, ${sx - 70} ${sy - 230}, ${sx + 20} ${sy - 250} C ${sx + 120} ${sy - 255}, ${sx + 120} ${sy - 120}, ${sx + 70} ${sy - 70} L ${sx + 64} ${sy + 4} Z`}
          fill="#0a090f"
        />
        <path
          d={`M ${sx + 4} ${sy - 70} C ${sx - 60} ${sy - 90}, ${sx - 70} ${sy - 230}, ${sx + 20} ${sy - 250}`}
          stroke="rgba(120, 140, 190, 0.28)"
          strokeWidth={5}
          fill="none"
        />

        {/* Chemise, cravate, col */}
        <path d={torso} fill="url(#pro-shirt)" />
        <path d={`M ${sx + 108} ${sy + 10} C ${sx + 140} ${sy + 230}, ${hip[0] + 120} ${hip[1] - 150}, ${hip[0] + 95} ${hip[1] + 20}`} stroke={rim} strokeWidth={7} fill="none" />
        <path d={`M ${sx + 20} ${sy + 220} C ${sx + 30} ${sy + 300}, ${sx + 10} ${sy + 380}, ${sx + 30} ${sy + 470}`} stroke="rgba(0,0,0,0.25)" strokeWidth={5} fill="none" />
        <path d={tie} fill="url(#pro-tie)" />
        <path d={`M ${sx + 48} ${sy + 10} L ${sx + 84} ${sy + 10} L ${sx + 80} ${sy + 46} L ${sx + 52} ${sy + 46} Z`} fill={rgb(TIE_DARK, TIE_LIT, 0.15 + 0.7 * L)} />
        <path d={`M ${sx + 20} ${sy - 4} L ${sx + 52} ${sy + 44} L ${sx + 66} ${sy + 8} Z`} fill={rgb(SHIRT_DARK, SHIRT_LIT, 0.25 + 0.5 * L)} />
        <path d={`M ${sx + 112} ${sy - 2} L ${sx + 82} ${sy + 44} L ${sx + 68} ${sy + 8} Z`} fill={rgb(SHIRT_AMB, SHIRT_LIT, Math.min(1, 0.2 + L))} />

        {/* Accoudoir (côté caméra) */}
        <rect x={hip[0] - 70} y={hip[1] - 105} width={330} height={62} rx={24} fill="url(#pro-leather)" opacity={0.96} />

        {/* Bras droit : manche blanche, poignet, main, télécommande */}
        <path d={`M ${shoulder[0]} ${shoulder[1]} L ${elbow[0]} ${elbow[1]} L ${hand[0]} ${hand[1]}`} stroke="url(#pro-sleeve)" strokeWidth={96} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={`M ${shoulder[0] + 30} ${shoulder[1] - 30} L ${elbow[0] + 20} ${elbow[1] - 40} L ${hand[0] - 20} ${hand[1] - 40}`} stroke={rim} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {(() => {
          const ang = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]);
          const deg = (ang * 180) / Math.PI;
          const cuff = lerpPt(elbow, hand, 0.86);
          return (
            <g>
              <g transform={`translate(${cuff[0]} ${cuff[1]}) rotate(${deg})`}>
                <rect x={-14} y={-50} width={30} height={100} rx={8} fill={rgb(SHIRT_AMB, SHIRT_LIT, Math.min(1, 0.25 + L))} />
              </g>
              <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${deg})`}>
                <ellipse cx={22} cy={4} rx={46} ry={36} fill={rgb(SKIN_AMB, SKIN_LIT, 0.15 + 0.7 * L)} />
                <rect x={10} y={-30} width={140} height={34} rx={9} fill="#0c0b10" />
                <rect x={10} y={-30} width={140} height={6} rx={3} fill={`rgba(200, 230, 255, ${0.25 + 0.4 * L})`} />
                <circle cx={148} cy={-13} r={ir ? 9 : 4} fill={ir ? "#ff3048" : "#3a0d14"} />
                {ir ? <circle cx={148} cy={-13} r={30} fill="rgba(255, 48, 72, 0.25)" /> : null}
              </g>
            </g>
          );
        })()}
      </svg>
      {/* Ombre profonde en haut à gauche : rien n'apparaît au-dessus du col */}
      <AbsoluteFill
        style={{
          background: portrait
            ? "linear-gradient(180deg, rgba(2,1,3,0.9) 0%, rgba(2,1,3,0) 12%)"
            : "linear-gradient(180deg, rgba(2,1,3,1) 0%, rgba(2,1,3,0) 9%)",
          width: "55%",
        }}
      />
    </AbsoluteFill>
  );
};
