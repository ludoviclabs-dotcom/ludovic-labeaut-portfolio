// Textes de la vidéo. Les noms, sous-titres, axes et couleurs reprennent ceux du site
// (public/index.html et public/assets/css/styles.css) ; les phrases d'accroche, les légendes
// des vidéos de démonstration (public/videos/*.mp4).

export const PERSON = {
  name: "Ludovic Labeaut",
  domains: "Finance · Audit · ESG · Data",
  tagline: "Des données traçables, sourcées et directement auditables.",
};

/** Cartes du terminal de l'acte 1 : 30 caractères au plus par ligne pour rester lisibles. */
export const TERMINAL_CARDS: string[][] = [
  ["LUDOVIC LABEAUT", "M2 CCA · NEOMA"],
  ["2 ANS D'AUDIT FINANCIER", "FORVIS MAZARS · CAC 40"],
  ["AUDIT LÉGAL", "CONTRÔLE INTERNE", "CSRD · SYSTÈMES IT"],
  ["ET SI LA RIGUEUR DE L'AUDIT", "RENCONTRAIT L'IA ET LE CODE ?"],
];

export type App = {
  id: string;
  name: string;
  subtitle: string;
  axes: string[];
  punchline: string;
  accent: string;
  background: string;
  /** Vidéo de démonstration (copiée depuis public/videos par npm run captures). */
  capture: string;
  /** Début de l'extrait dans la démonstration, en secondes. */
  captureFromSec: number;
};

export const APPS: App[] = [
  {
    id: "carbon-co",
    name: "Carbon&Co",
    subtitle: "Pilotage ESG & CSRD",
    axes: ["CSRD & ESRS", "Scopes 1·2·3", "Double matérialité"],
    punchline: "Prêt pour la CSRD, piste d'audit SHA-256",
    accent: "#84c89a",
    background:
      "radial-gradient(120% 70% at 35% 25%, #2d4a37 0%, #15231b 55%, #0a110d 100%)",
    capture: "carbon-co.mp4",
    captureFromSec: 16.1,
  },
  {
    id: "probant",
    name: "Probant",
    subtitle: "Audit & conformité comptable",
    axes: ["Analyse du FEC", "Détection d'anomalies", "Dossier de preuve"],
    punchline: "Du FEC au dossier opposable",
    accent: "#829bed",
    background:
      "radial-gradient(120% 70% at 40% 25%, #1f2a4d 0%, #11172b 55%, #070910 100%)",
    capture: "probant.mp4",
    captureFromSec: 12.1,
  },
  {
    id: "panoplie",
    name: "Panoplie",
    subtitle: "Intelligence défense",
    axes: ["Coûts & financement", "Supply chain", "Géopolitique & export"],
    punchline: "Chaque dépendance cartographiée",
    accent: "#7fb0dc",
    background:
      "radial-gradient(120% 70% at 45% 20%, #2e3b48 0%, #141c24 55%, #090d11 100%)",
    capture: "panoplie.mp4",
    captureFromSec: 4.1,
  },
  {
    id: "finvalstudio",
    name: "FinValStudio",
    subtitle: "Modélisation & valorisation",
    axes: ["DCF & LBO", "Comparables", "Monte Carlo"],
    punchline: "Cinq mille scénarios, une fourchette",
    accent: "#e2c27d",
    background:
      "radial-gradient(120% 70% at 50% 25%, #23252b 0%, #131417 55%, #09090b 100%)",
    capture: "finvalstudio.mp4",
    captureFromSec: 12.1,
  },
  {
    id: "kyb-graph",
    name: "KYB Graph",
    subtitle: "Cartographie de conformité",
    axes: ["LCB-FT & AMLR", "Niveaux de preuve", "Sources publiques"],
    punchline: "Qui détient, qui dirige, en un graphe",
    accent: "#6ccad0",
    background:
      "radial-gradient(120% 70% at 50% 25%, #1e3a3f 0%, #101c1f 55%, #080d0e 100%)",
    capture: "kyb-graph.mp4",
    captureFromSec: 4.1,
  },
];

export const PUBLICATIONS = {
  name: "Publications",
  subtitle: "Recherche & articles",
  axes: ["Géopolitique", "Géoéconomie", "Defense-Tech"],
  stats: [
    { value: "23", label: "notes d'analyse" },
    { value: "2", label: "séries d'articles" },
    { value: "1", label: "dossier interactif" },
  ],
  accent: "#d97a5e",
  background:
    "radial-gradient(120% 70% at 55% 25%, #3a3833 0%, #1d1c19 55%, #0d0c0b 100%)",
  capture: "publications.mp4",
  captureFromSec: 12.1,
};

/** Carte de fin. Une ligne vide n'est pas affichée. */
export const CONTACT = {
  email: "ludoviclabs@gmail.com",
  linkedin: "",
  portfolio: "l-labs-portfolio.vercel.app",
  publications: "l-labs-portfolio.vercel.app/publications",
  stack: "Next.js · TypeScript · Neon / Postgres · API Claude",
};
