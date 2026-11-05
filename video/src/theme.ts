import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Polices embarquées dans public/fonts (licence SIL OFL 1.1, voir les fichiers OFL-*.txt) :
// le rendu ne dépend d'aucun téléchargement. Cormorant Garamond et Inter sont celles du site,
// VT323 sert au terminal rétro.
export const SERIF = "Cormorant Garamond";
export const SANS = "Inter";
export const PIXEL = "VT323";

const fonts = [
  { family: SERIF, file: "CormorantGaramond.woff2", weight: "300 700", style: "normal" },
  { family: SERIF, file: "CormorantGaramond-Italic.woff2", weight: "300 700", style: "italic" },
  { family: SANS, file: "Inter.woff2", weight: "100 900", style: "normal" },
  { family: PIXEL, file: "VT323.woff2", weight: "400", style: "normal" },
];
for (const font of fonts) {
  loadFont({ family: font.family, url: staticFile(`fonts/${font.file}`), weight: font.weight, style: font.style });
}

// Charte du site (public/assets/css/styles.css).
export const SITE = {
  bg: "#0b0c0e",
  ink: "#f4f1ea",
  inkDim: "rgba(244, 241, 234, 0.74)",
  inkFaint: "rgba(244, 241, 234, 0.5)",
  line: "rgba(244, 241, 234, 0.14)",
};

// Palette néon de l'acte 1.
export const NEON = {
  magenta: "#ff2bd6",
  pink: "#ff3d7f",
  cyan: "#3df0ff",
  yellow: "#ffd319",
  orange: "#ff8b2c",
  violet: "#7b2cff",
  night: "#0b0221",
};
