// Textes et visuels de la vidéo. Tout ce qui est affiché vient du site :
// public/index.html (noms, axes, couleurs), public/projets/*.html (chapitres des démonstrations),
// public/publications/index.html et public/dossiers/robotique-humanoide/ (publications, chiffres),
// et l'historique git (mises à jour récentes). Aucun chiffre n'est inventé.
// Les photos (public/images du site) sont copiées dans public/photos par npm run assets :
// Unsplash (licence Unsplash) et DVIDS (domaine public, sans caution du ministère américain de la Défense).

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

/** Thème de chaque carte du terminal, repris dans le bandeau sous le téléviseur (format 4:5). */
export const TERMINAL_THEMES = [
  "Finance · Audit · ESG · Data",
  "Audit légal · Comptes du CAC 40",
  "Contrôle interne · CSRD · Systèmes IT",
  "IA · Code · Preuve",
];

/** Mots des panneaux qui défilent au bord de la route (pixel art, majuscules sans accent). */
export const BILLBOARDS = ["AUDIT", "ESG", "IA", "ROBOTIQUE", "CSRD", "DEFENSE", "LCB-FT", "DATA"];

/** « Ce à quoi je m'attaque » : trois thèmes, chacun sur une photo du site ou un visuel en code. */
export type Theme = {
  title: string;
  line: string;
  accent: string;
  /** Photo de public/photos, ou null pour un visuel dessiné en code (IA & robotique). */
  photo: string | null;
  evidence: string;
};
export const THEMES: Theme[] = [
  {
    title: "ESG & climat",
    line: "Un reporting CSRD traçable, du classeur au rapport.",
    accent: "#84c89a",
    photo: "carbon-co/eolienne-brume.webp",
    evidence: "Carbon&Co",
  },
  {
    title: "Audit & preuve",
    line: "Chaque chiffre relié à sa source, chaque contrôle documenté.",
    accent: "#829bed",
    photo: "probant/archives.webp",
    evidence: "Probant · KYB Graph",
  },
  {
    title: "IA & robotique",
    line: "Comprendre où se crée la valeur, sources à l'appui.",
    accent: "#d97a5e",
    photo: null,
    evidence: "Série IA · Dossier robotique",
  },
];

export type App = {
  id: string;
  name: string;
  subtitle: string;
  /** Le problème traité, en une phrase (public/index.html). */
  problem: string;
  /** Deux ou trois fonctions clés (chapitres de la démonstration, public/projets/<id>.html). */
  features: string[];
  /** Thèmes affichés en badges. */
  badges: string[];
  /** Mise à jour récente, vérifiable dans l'historique git ; null s'il n'y en a pas. */
  update: string | null;
  accent: string;
  background: string;
  /** Photo de fond (public/photos/<id>/…). */
  photo: string;
  /** Vidéo de démonstration (copiée depuis public/videos par npm run assets). */
  capture: string;
  /** Début de l'extrait dans la démonstration, en secondes : choisir un écran déjà construit. */
  captureFromSec: number;
};

export const APPS: App[] = [
  {
    id: "carbon-co",
    name: "Carbon&Co",
    subtitle: "Pilotage ESG & CSRD",
    problem: "Collecter les données ESG, calculer l'empreinte carbone, produire le rapport CSRD.",
    features: ["Scopes 1, 2 et 3 en tCO₂e, méthode GHG Protocol", "Double matérialité des thèmes ESRS", "Rapport CSRD et piste d'audit"],
    badges: ["ESG", "CSRD", "Climat"],
    update: null,
    accent: "#84c89a",
    background: "radial-gradient(120% 70% at 35% 25%, #2d4a37 0%, #15231b 55%, #0a110d 100%)",
    photo: "carbon-co/foret-vue-aerienne.webp",
    capture: "carbon-co.mp4",
    captureFromSec: 16.6,
  },
  {
    id: "probant",
    name: "Probant",
    subtitle: "Audit & conformité comptable",
    problem: "Du fichier des écritures comptables au dossier de preuve opposable.",
    features: ["Chaque écriture du FEC est contrôlée", "Doublons, hors période, séquence rompue", "Dossier scellé et horodaté"],
    badges: ["Audit", "Preuve", "Data"],
    update: "Nouvelle charte · oct. 2026",
    accent: "#829bed",
    background: "radial-gradient(120% 70% at 40% 25%, #1f2a4d 0%, #11172b 55%, #070910 100%)",
    photo: "probant/loupe.webp",
    capture: "probant.mp4",
    captureFromSec: 12.6,
  },
  {
    id: "panoplie",
    name: "Panoplie",
    subtitle: "Intelligence défense",
    problem: "Coût réel, chaîne industrielle, dépendances et régimes d'export, sourcés et datés.",
    features: ["Carte des sous-systèmes, industriels et pays", "Six critères notés de A à E", "Evidence Pack, sources notées de A à D"],
    badges: ["Défense", "Souveraineté", "Sources ouvertes"],
    update: null,
    accent: "#7fb0dc",
    background: "radial-gradient(120% 70% at 45% 20%, #2e3b48 0%, #141c24 55%, #090d11 100%)",
    photo: "panoplie/rafale-pacifique.webp",
    capture: "panoplie.mp4",
    captureFromSec: 4.6,
  },
  {
    id: "finvalstudio",
    name: "FinValStudio",
    subtitle: "Modélisation & valorisation",
    problem: "Modèles intégrés, valorisation, scénarios et reporting bancaire reproductible.",
    features: ["DCF : du flux aux fonds propres", "Monte Carlo : 5 000 tirages, P10, médiane, P90", "LBO : TRI et multiple du sponsor"],
    badges: ["Valorisation", "Scénarios", "Data"],
    update: null,
    accent: "#e2c27d",
    background: "radial-gradient(120% 70% at 50% 25%, #23252b 0%, #131417 55%, #09090b 100%)",
    photo: "finvalstudio/la-defense-nuit.webp",
    capture: "finvalstudio.mp4",
    captureFromSec: 16.6,
  },
  {
    id: "kyb-graph",
    name: "KYB Graph",
    subtitle: "Cartographie de conformité",
    problem: "Les liens entre sociétés, dirigeants, adresses et sanctions, chacun avec son niveau de preuve.",
    features: ["26 sources publiques, jamais de scraping", "Confirmé, déclaré, inféré, simulé", "Journal chaîné par empreinte SHA-256"],
    badges: ["LCB-FT", "Sanctions", "Preuve"],
    update: "Nouveau · oct. 2026",
    accent: "#6ccad0",
    background: "radial-gradient(120% 70% at 50% 25%, #1e3a3f 0%, #101c1f 55%, #080d0e 100%)",
    photo: "kyb-graph/ville-brume-bleue.webp",
    capture: "kyb-graph.mp4",
    captureFromSec: 4.6,
  },
];

/** Publications : quatre mesures, en trois temps. */
export const PUBLICATIONS = {
  name: "Publications",
  kicker: "Lignes de force",
  subtitle: "Notes d'analyse, séries de fond et dossier interactif, sourcés et datés",
  accent: "#d97a5e",
  background: "radial-gradient(120% 70% at 55% 25%, #3a3833 0%, #1d1c19 55%, #0d0c0b 100%)",
  photo: "publications/bibliotheque.webp",
  capture: "publications.mp4",
  captureFromSec: 12.6,
  update: "Nouveau · nov. 2026",
  stats: [
    { value: "23", label: "notes d'analyse" },
    { value: "2", label: "séries de fond" },
    { value: "1", label: "dossier interactif" },
  ],
  rubrics: ["Géopolitique", "Géoéconomie", "Banques centrales", "Defense-Tech", "IA & science", "Robotique & marchés"],
  series: [
    {
      title: "L'IA à la conquête du savoir",
      meta: "Série en 8 articles · état au 8 octobre 2026",
      topics: ["Modèles frontier et open weights", "Co-scientifiques et laboratoires autonomes", "Géopolitique de l'IA pour la science"],
    },
    {
      title: "Banques centrales : le retour du resserrement",
      meta: "Série en 6 articles · état au 31 octobre 2026",
      topics: ["Fed, BCE, Banque du Japon", "Quelle inflation combattent-elles ?", "Taux longs et prime de terme"],
    },
  ],
  dossier: {
    title: "Robotique humanoïde : où se capte la valeur, de 2026 à 2050",
    meta: "Dossier interactif · 8 chapitres · conçu avec Claude",
    figures: [
      { value: "5 000 Md$", label: "marché potentiel en 2050 (Morgan Stanley)" },
      { value: "~90 %", label: "des humanoïdes produits en Chine en 2025-2026" },
      { value: "~60 %", label: "du coût matériel dans les articulations et les mains" },
    ],
  },
};

/** Carte de fin. Une ligne vide n'est pas affichée. */
export const CONTACT = {
  email: "ludoviclabs@gmail.com",
  linkedin: "",
  portfolio: "l-labs-portfolio.vercel.app",
  publications: "l-labs-portfolio.vercel.app/publications",
  stack: "Next.js · TypeScript · Neon / Postgres · API Claude",
  languages: "Portfolio en français et en anglais",
  credits: "Photos : Unsplash et DVIDS (domaine public). Musique : « Synth Wave », pro-sensory (CC0).",
};
