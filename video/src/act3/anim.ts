import { Easing, interpolate } from "remotion";

// Outils d'animation de l'acte 3. Tout dérive du numéro d'image (useCurrentFrame), jamais du temps réel.

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.in(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Progression 0 → 1 entre les images a et b (bornée). */
export const prog = (t: number, a: number, b: number, easing = easeOut) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing });

/** Entrée d'un élément : fondu, montée et netteté, à partir de l'image `delay`. */
export const enter = (t: number, delay: number, distance = 28, duration = 18) => {
  const p = prog(t, delay, delay + duration);
  const b = prog(t, delay, delay + duration * 0.8);
  return {
    opacity: p,
    translate: `0 ${(1 - p) * distance}px`,
    filter: b < 1 ? `blur(${(1 - b) * 10}px)` : undefined,
  };
};

/** Entrée latérale (de la gauche vers la droite pour un distance positive). */
export const enterX = (t: number, delay: number, distance = 40, duration = 18) => {
  const p = prog(t, delay, delay + duration);
  return {
    opacity: p,
    translate: `${(1 - p) * -distance}px 0`,
    filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined,
  };
};

/** Sortie : fondu, légère montée et flou entre les images a et b. */
export const leave = (t: number, a: number, b: number, distance = 18) => {
  const p = prog(t, a, b, easeIn);
  return {
    opacity: 1 - p,
    translate: `0 ${-p * distance}px`,
    filter: p > 0 ? `blur(${p * 8}px)` : undefined,
  };
};

/** Combine l'entrée et la sortie d'un même élément. */
export const enterLeave = (
  t: number,
  delay: number,
  outFrom: number,
  outTo: number,
  distance = 28,
  duration = 18,
) => {
  const e = enter(t, delay, distance, duration);
  const p = prog(t, outFrom, outTo, easeIn);
  const ey = (1 - prog(t, delay, delay + duration)) * distance;
  const blurIn = (1 - prog(t, delay, delay + duration * 0.8)) * 10;
  const blur = blurIn + p * 8;
  return {
    opacity: e.opacity * (1 - p),
    translate: `0 ${ey - p * 18}px`,
    filter: blur > 0.01 ? `blur(${blur}px)` : undefined,
  };
};

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/**
 * Typographie française à l'affichage : apostrophe typographique, espaces insécables avant
 * : ; ? ! % et entre les groupes de chiffres (« 5 000 »), après « « » et avant « » » ; et après
 * les articles et prépositions courtes, et entre un nombre et le mot qui le suit.
 */
export const fr = (s: string) =>
  s
    .replace(/'/g, "’")
    .replace(/ ([:;?!%»])/g, " $1")
    .replace(/« /g, "« ")
    .replace(/(\d) (\d{3})/g, "$1 $2")
    // Pas de mot court en fin de ligne (« le / retour », « la / valeur ») ni de nombre séparé
    // de son mot (« 5 000 / tirages ») : on les lie au mot suivant.
    .replace(/(?<=^|[\s\u00a0’(])(le|la|les|un|une|des|du|de|au|aux|à) (?=\S)/gi, "$1\u00a0")
    .replace(/(\d) (?=[a-zA-ZÀ-ÿ])/g, "$1\u00a0");
