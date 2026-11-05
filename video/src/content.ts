// Textes et visuels de la vidéo. Tout ce qui est affiché vient du site :
// public/index.html (noms, axes, couleurs), public/projets/*.html (chapitres des démonstrations),
// public/publications/index.html et public/dossiers/robotique-humanoide/ (publications, chiffres),
// et l'historique git (mises à jour récentes). Aucun chiffre n'est inventé.
// Les photos (public/images du site) sont copiées dans public/photos par npm run assets :
// Unsplash (licence Unsplash) et DVIDS (domaine public, sans caution du ministère américain de la Défense).

export const PERSON = {
  name: "Ludovic Labeaut",
  domains: "Finance · Audit · ESG · Data",
  tagline: "Chaque chiffre renvoie à sa source.",
  /** Tampon du plan titre, posé sur la piste d'audit. */
  stamp: "Contrôlé",
};

/**
 * Séquence « profil », juste après le drop : un bilan de compétences présenté comme un bilan
 * comptable. Actif : ce que je sais faire ; passif : ce que je suis de près. Chaque poste a sa
 * sphère (pixel art), de sa propre couleur. Sources : le CV 2026 (compétences, centres d'intérêt),
 * les matières du Master CCA (consolidation, ingénierie sociétaire, fiscalité), les projets du
 * portfolio et les maquettes Blender de Panoplie. Un poste sans éléments n'est pas affiché.
 */
export type Poste = { label: string; items: string[]; accent: string };
export const PROFILE = {
  title: "Bilan de compétences",
  period: "Exercice 2026",
  actif: {
    heading: "Actif",
    caption: "Compétences",
    postes: [
      { label: "Audit", items: ["audit légal", "contrôle interne", "revue analytique"], accent: "#829bed" },
      { label: "Comptabilité", items: ["comptes sociaux et consolidés", "IFRS"], accent: "#b38cff" },
      { label: "Droit des sociétés", items: ["ingénierie sociétaire", "fiscalité"], accent: "#e9a3c9" },
      { label: "Finance", items: ["DCF", "LBO", "Monte Carlo"], accent: "#e2c27d" },
      { label: "ESG", items: ["CSRD", "ESRS E1", "bilan carbone"], accent: "#84c89a" },
      { label: "Conception", items: ["modélisation 3D", "visuels", "fonctionnalités"], accent: "#ff8b2c" },
      { label: "Automatisation", items: ["Python", "skills", "connexion d'applications"], accent: "#6ccad0" },
    ] as Poste[],
  },
  passif: {
    heading: "Passif",
    caption: "Centres d'intérêt",
    postes: [
      { label: "Géopolitique", items: ["géoéconomie", "défense"], accent: "#7fb0dc" },
      { label: "Aéronautique", items: ["avions de combat", "drones"], accent: "#3df0ff" },
      { label: "DeepTech", items: ["IA", "robotique"], accent: "#ff3d9a" },
      { label: "Marchés", items: ["banques centrales", "taux"], accent: "#d97a5e" },
      { label: "Hors travail", items: ["sport", "musique"], accent: "#ffd319" },
    ] as Poste[],
  },
  total: "Bilan équilibré",
};

/**
 * « Ce que je sais faire » : six écrans de contrôle animés (pixel art, terminal), un par savoir-faire.
 * Les écrans montrent une démarche (contrôles, structure, maillage…), pas des chiffres de clients.
 */
export const SKILLS = {
  title: "Ce que je sais faire",
  tiles: [
    {
      key: "audit",
      title: "Audit",
      caption: "Revue analytique",
      lines: ["[OK] Rapprochements", "[OK] Cut-off", "[!!] Écriture en double"],
      accent: "#829bed",
    },
    {
      key: "groupe",
      title: "Ingénierie sociétaire",
      caption: "Structure de groupe",
      lines: ["Holding", "Filiale A", "Filiale B", "Filiale C", "Sous-filiale"],
      accent: "#e9a3c9",
    },
    {
      key: "mesh",
      title: "Modélisation 3D",
      caption: "Maillage et axes",
      lines: [],
      accent: "#ff8b2c",
    },
    {
      key: "ui",
      title: "Visuels et fonctionnalités",
      caption: "Interface",
      lines: [],
      accent: "#ffd319",
    },
    {
      key: "auto",
      title: "Skills et automatisation",
      caption: "Tâches en chaîne",
      lines: ["> déclencheur : nouveau FEC", "  import ........ OK", "  contrôles ..... OK", "  rapport ....... OK"],
      accent: "#6ccad0",
    },
    {
      key: "api",
      title: "Connexion d'applications",
      caption: "API",
      lines: ["API", "ERP", "Banque", "CRM", "IA", "Docs", "Mail"],
      accent: "#3df0ff",
    },
  ],
};

/** Cartes du terminal de l'acte 1 : 30 caractères au plus par ligne pour rester lisibles. */
export const TERMINAL_CARDS: string[][] = [
  ["LUDOVIC LABEAUT", "M2 CCA · NEOMA"],
  ["2 ANS D'AUDIT FINANCIER", "FORVIS MAZARS · CAC 40"],
  ["AUDIT LÉGAL", "CONTRÔLE INTERNE", "CSRD · SYSTÈMES D'INFORMATION"],
  ["AUDITEUR DE FORMATION,", "JE CODE MES PROPRES OUTILS"],
];

/** Thème de chaque carte du terminal, repris dans le bandeau sous le téléviseur (format 4:5). */
export const TERMINAL_THEMES = [
  "Finance · Audit · ESG · Data",
  "Audit légal · Comptes du CAC 40",
  "Contrôle interne · CSRD · Systèmes d'information",
  "IA · Code · Preuve",
];

/** Mots des panneaux qui défilent au bord de la route (pixel art, majuscules ; É et È sont dessinés). */
export const BILLBOARDS = ["AUDIT", "CSRD", "PREUVE", "IA", "DÉFENSE", "CONFORMITÉ", "ROBOTIQUE"];

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
    line: "Le bilan carbone et le rapport CSRD, à partir des données de l'entreprise.",
    accent: "#84c89a",
    photo: "carbon-co/eolienne-brume.webp",
    evidence: "Carbon&Co",
  },
  {
    title: "Audit & preuve",
    line: "Contrôler les écritures comptables et garder la trace de chaque contrôle.",
    accent: "#829bed",
    photo: "probant/archives.webp",
    evidence: "Probant · KYB Graph",
  },
  {
    title: "IA & robotique",
    line: "Suivre l'IA et la robotique : qui produit, à quel coût, avec quelles dépendances.",
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
    captureFromSec: 13.4,
  },
  {
    id: "panoplie",
    name: "Panoplie",
    subtitle: "Veille défense",
    problem: "Ce que coûte un système d'armes, qui le fabrique et où il peut être exporté.",
    features: ["Carte des sous-systèmes, industriels et pays", "Six critères notés de A à E", "Evidence Pack, sources notées de A à D"],
    badges: ["Défense", "Souveraineté", "Sources ouvertes"],
    update: null,
    accent: "#7fb0dc",
    background: "radial-gradient(120% 70% at 45% 20%, #2e3b48 0%, #141c24 55%, #090d11 100%)",
    photo: "panoplie/rafale-pacifique.webp",
    capture: "panoplie.mp4",
    captureFromSec: 5.4,
  },
  {
    id: "finvalstudio",
    name: "FinValStudio",
    subtitle: "Modélisation & valorisation",
    problem: "Valoriser une entreprise : DCF, LBO et scénarios Monte Carlo.",
    features: ["DCF : du flux aux fonds propres", "Monte Carlo : 5 000 tirages, P10, médiane, P90", "LBO : TRI et multiple du sponsor"],
    badges: ["Valorisation", "Scénarios", "Data"],
    update: null,
    accent: "#e2c27d",
    background: "radial-gradient(120% 70% at 50% 25%, #23252b 0%, #131417 55%, #09090b 100%)",
    photo: "finvalstudio/la-defense-nuit.webp",
    capture: "finvalstudio.mp4",
    captureFromSec: 17,
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
    captureFromSec: 5.2,
  },
];

/** Publications : quatre mesures, en trois temps. */
export const PUBLICATIONS = {
  name: "Publications",
  kicker: "Lignes de force",
  subtitle: "23 notes d'analyse, toutes sourcées et datées.",
  accent: "#d97a5e",
  background: "radial-gradient(120% 70% at 55% 25%, #3a3833 0%, #1d1c19 55%, #0d0c0b 100%)",
  photo: "publications/bibliotheque.webp",
  capture: "publications.mp4",
  captureFromSec: 13.4,
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
  /** QR code de la carte de fin : utile quand la vidéo passe sur un autre écran (entretien, salon). */
  qr: "https://l-labs-portfolio.vercel.app",
  qrLabel: "Scannez pour ouvrir le portfolio",
  stack: "Next.js · TypeScript · Neon / Postgres · API Claude",
  languages: "Portfolio en français et en anglais",
  credits: "Photos : Unsplash et DVIDS (domaine public). Musique : « Synth Wave », pro-sensory (CC0).",
};
