import { Easing, interpolate } from "remotion";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Entrée d'un élément : fondu, montée et netteté, à partir de l'image `delay` du plan. */
export const enter = (frame: number, delay: number, distance = 28, duration = 16) => ({
  opacity: interpolate(frame, [delay, delay + duration], [0, 1], { ...clamp, easing: ease }),
  translate: `0 ${interpolate(frame, [delay, delay + duration], [distance, 0], { ...clamp, easing: ease })}px`,
  filter: `blur(${interpolate(frame, [delay, delay + duration * 0.8], [10, 0], { ...clamp, easing: ease })}px)`,
});

/** Sortie du contenu dans les dernières images du plan. */
export const exitOpacity = (frame: number, slotFrames: number) =>
  interpolate(frame, [slotFrames - 9, slotFrames - 1], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });

/** Fondu d'entrée du fond (les plans se chevauchent légèrement). */
export const backgroundIn = (frame: number) =>
  interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
