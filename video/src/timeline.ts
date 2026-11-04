// Toute la chronologie de la vidéo, en secondes. Les instants musicaux viennent de sync.json,
// que lit aussi la bande-son : image et son restent calés par construction.
import sync from "./sync.json";

export const FPS = sync.fps;
export const TOTAL_SEC = sync.totalSec;
export const DROP_SEC = sync.dropSec;

const BEAT_SEC = 60 / sync.bpm;
export const BAR_SEC = BEAT_SEC * 4;
export const SIXTEENTH_SEC = BEAT_SEC / 4;

/** Secondes → numéro d'image. */
export const f = (sec: number) => Math.round(sec * FPS);

// ---- Acte 1 : allumage du téléviseur puis route synthwave (0 → 15,75 s)
export const POWER_ON = {
  clickSec: 0.25, // déclic, voyant rouge
  lineSec: 0.3, // trait blanc horizontal
  openSec: 0.45, // le trait s'ouvre verticalement
  snowEndSec: 1.6, // fin de la neige
  pictureSec: 1.2, // l'image apparaît sous la neige
};

/** Cartes du terminal : début de chaque carte (la dernière reste jusqu'au drop). */
export const TERMINAL_AT_SEC = [3, 6, 9, 12];

// ---- Acte 2 : le break de batterie (15,75 → 18 s)
export const FILL_HITS_SEC = sync.fill.hits.map(
  (h) => DROP_SEC + h.step * SIXTEENTH_SEC,
);
export const FILL_START_SEC = Math.min(...FILL_HITS_SEC);

// ---- Acte 3 : vitrine (18 → 45 s), huit plans d'une mesure et demie, calés sur le tempo :
// titre, cinq applications, publications, carte de fin.
export const SLOT_SEC = BAR_SEC * 1.5;
export const SLOTS = 8;
export const slotFrom = (i: number) => f(i * SLOT_SEC);
