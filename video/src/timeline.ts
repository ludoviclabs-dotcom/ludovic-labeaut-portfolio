// Toute la chronologie de la vidéo, en secondes. Les instants musicaux viennent de sync.json,
// que lit aussi la bande-son : image et son restent calés par construction.
import sync from "./sync.json";

export const FPS = sync.fps;
export const TOTAL_SEC = sync.totalSec;
export const DROP_SEC = sync.dropSec;

export const BEAT_SEC = 60 / sync.bpm;
export const BAR_SEC = BEAT_SEC * 4;
export const SIXTEENTH_SEC = BEAT_SEC / 4;

/** Secondes → numéro d'image. */
export const f = (sec: number) => Math.round(sec * FPS);

// ---- Acte 1a : allumage du téléviseur (0 → ~4,6 s)
// La caméra part en gros plan sur le bouton de mise en marche, le bouton s'enfonce (déclic,
// voyant rouge), puis la caméra recule pendant que l'écran s'allume dans la neige.
export const POWER_ON = {
  buttonSec: 0.6, // le bouton s'enfonce : déclic, voyant rouge
  pullBackFromSec: 0.9, // la caméra quitte le bouton…
  pullBackToSec: 3.4, // … et cadre tout le téléviseur
  lineSec: 1.25, // trait blanc horizontal
  openSec: 1.45, // le trait s'ouvre verticalement
  snowFromSec: 1.6, // neige (« bruit numérique »), indicatif CH 03
  pictureSec: 3.6, // l'image apparaît sous la neige, roule puis se cale
  snowEndSec: 4.6, // fin de la neige
};

// ---- Acte 1b : la route synthwave et les cartes du terminal (jusqu'au break)
/** Début de chaque carte du terminal (la dernière reste jusqu'au drop). */
export const TERMINAL_AT_SEC = [5, 8.5, 12, 15.5];

// ---- Acte 2 : le break (la dernière mesure avant le drop) puis la traversée de l'écran
export const FILL_HITS_SEC = sync.fill.hits.map(
  (h) => DROP_SEC + h.step * SIXTEENTH_SEC,
);
export const FILL_START_SEC = Math.min(...FILL_HITS_SEC);

// ---- Acte 3 : la vitrine, après le drop. Durées en mesures (une mesure = 3 s à 80 BPM) ;
// leur somme doit égaler totalSec − dropSec (vérifié plus bas) :
// chaque changement de plan tombe sur un premier temps.
export const SLOT_BARS = [
  3, // bilan de compétences (profil, sans l'identité) : 12 postes, un par demi-temps
  2, // titre : le nom, la piste d'audit
  2, // « Mes sujets » : trois thèmes
  2, 2, 2, 2, 2, // les cinq projets
  4, // publications : série IA, série banques centrales, dossier robotique
  2, // carte de fin
];
export const SLOTS = SLOT_BARS.length;

/** Début du plan i, en secondes après le drop. */
export const slotStartSec = (i: number) =>
  SLOT_BARS.slice(0, i).reduce((a, b) => a + b, 0) * BAR_SEC;
/** Début du plan i, en images après le drop. */
export const slotFrom = (i: number) => f(slotStartSec(i));
/** Durée du plan i, en images. */
export const slotFrames = (i: number) => slotFrom(i + 1) - slotFrom(i);
/** Fondu enchaîné entre deux plans de l'acte 3 (images). */
export const XFADE_FRAMES = 12;

if (Math.abs(SLOT_BARS.reduce((a, b) => a + b, 0) * BAR_SEC - (TOTAL_SEC - DROP_SEC)) > 1e-6) {
  throw new Error("timeline : la somme des plans de l'acte 3 ne correspond pas à totalSec − dropSec (sync.json).");
}
