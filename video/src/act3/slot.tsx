import React, { createContext, useContext } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

// Chaque plan de l'acte 3 démarre XFADE_FRAMES / 2 images avant son premier temps (lead) et
// déborde d'autant sur le plan suivant : le fondu enchaîné est centré sur le temps fort.
// useSlot() donne t, le numéro d'image compté depuis ce premier temps (négatif pendant l'entrée),
// et dur, la durée du plan en images.

type SlotInfo = { lead: number; dur: number };
const SlotContext = createContext<SlotInfo>({ lead: 0, dur: 180 });

export const SlotProvider: React.FC<SlotInfo & { children: React.ReactNode }> = ({ lead, dur, children }) => (
  <SlotContext.Provider value={{ lead, dur }}>{children}</SlotContext.Provider>
);

export const useSlot = () => {
  const frame = useCurrentFrame();
  const { lead, dur } = useContext(SlotContext);
  const { width, height } = useVideoConfig();
  return { t: frame - lead, lead, dur, width, height, landscape: width > height };
};

/** Marges de sécurité : texte à 100 px au moins des bords latéraux (80 en 4:5) et 100 px du haut/bas. */
export const safe = (landscape: boolean) => ({ x: landscape ? 100 : 80, top: 100, bottom: 110 });
