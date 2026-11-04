// Fabrique la bande-son de la vidéo : public/audio/soundtrack.mp3
//
//   npm run soundtrack
//
// Tout part de src/sync.json (tempo, drop, coups du break, morceau) et du bloc POWER_ON de
// src/timeline.ts (instants de l'allumage), les deux fichiers que lit aussi la vidéo. Avec les
// réglages actuels (80 BPM : un temps = 0,75 s, une mesure = 3 s, drop à 21 s, durée 81 s) :
//
//   0 → 0,6 s     : silence de pièce (souffle à peine audible) ;
//   0,6 s         : le bouton s'enfonce — déclic en deux temps (enfoncement, verrouillage), « tchk »
//                   du relais, coup sourd du transformateur, puis la démagnétisation (« bwoum » grave) ;
//   1,25 → 1,6 s  : le trait blanc s'ouvre, la neige monte (léger sifflement THT, moins de 0,6 s) ;
//   1,6 → 4,8 s   : la neige, un « bruit numérique » large et dense (souffle stéréo, crépitements),
//                   qui enfle doucement puis s'efface de 3,6 à 4,8 s ;
//   3,2 → 4,6 s   : la musique monte sous la neige, filtrée comme si elle sortait du petit
//                   haut-parleur du téléviseur (mono, bande étroite) : aucun trou entre les deux ;
//   4,6 → 18,75 s : la route synthwave, musique « téléviseur » nivelée vers −18 LUFS ;
//   18,75 → 21 s  : le break, 10 toms à réverbération coupée (gated reverb, années 80) placés en
//                   double-croches (0,1875 s) avant le drop, sur la coupure propre du morceau,
//                   1,5 LU sous l'acte 3 ; souffle montant discret ;
//   21 s          : le drop (crash, grosse caisse), la musique s'ouvre en pleine bande ;
//   21 → 78 s     : l'acte 3, la partie la plus forte (≈ −13 LUFS) ;
//   78 → 81 s     : fondu de sortie (fadeOutSec), jusqu'au silence.
//
// Fenêtre du morceau : de (dropInSourceSec − dropSec) à + totalSec, soit 75,238 → 156,238 s.
// Mastering : intensité intégrée −14 LUFS (UIT-R BS.1770), crête vraie ≤ −1,5 dBTP après encodage
// grâce à un limiteur à anticipation (crêtes mesurées en suréchantillonnage ×4) réglé à −2,2 dBTP :
// un réencodage AAC par une plateforme ne peut pas saturer.
//
// La musique est « Synth Wave » de pro-sensory (OpenGameArt, domaine public CC0). Le fichier est
// téléchargé une fois dans .cache/. Pour en changer : remplacer music.url / music.file et mesurer
// music.dropInSourceSec (le premier temps fort après une coupure) dans le nouveau morceau.
// ffmpeg est celui fourni par Remotion : rien d'autre à installer.

import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sync = JSON.parse(readFileSync(path.join(root, 'src/sync.json'), 'utf8'));

// Les instants de l'allumage sont lus dans src/timeline.ts (bloc POWER_ON) : une seule source.
function readPowerOn() {
  const src = readFileSync(path.join(root, 'src/timeline.ts'), 'utf8');
  const block = src.match(/POWER_ON\s*=\s*\{([\s\S]*?)\}/);
  if (!block) throw new Error('POWER_ON introuvable dans src/timeline.ts');
  const po = {};
  for (const [, k, v] of block[1].matchAll(/(\w+)\s*:\s*([\d.]+)/g)) po[k] = Number(v);
  for (const k of ['buttonSec', 'lineSec', 'openSec', 'snowFromSec', 'pictureSec', 'snowEndSec']) {
    if (!Number.isFinite(po[k])) throw new Error(`POWER_ON.${k} introuvable dans src/timeline.ts`);
  }
  return po;
}
const PO = readPowerOn();

const SR = 48000;
const TOTAL = sync.totalSec;
const N = Math.round(TOTAL * SR);
const SIXTEENTH = 60 / sync.bpm / 4;
const DROP = sync.dropSec;
const HITS = sync.fill.hits.map((h) => ({t: DROP + h.step * SIXTEENTH, drum: h.drum}));
const FILL_START = Math.min(...HITS.map((h) => h.t));
const AUDIBLE = sync.music.audibleFromSec;
const FADE_OUT = sync.music.fadeOutSec;

// Niveaux visés, en LUFS (intensité BS.1770 mesurée sur la piste finale).
const LEVEL = {
  act3: -13.2, // acte 3, musique en pleine bande : la partie la plus forte
  act1: -18, // musique « téléviseur » de l'acte 1
  powerOn: -18, // allumage 0 → snowEndSec, au niveau de la musique de l'acte 1
  fillBelowAct3: 1.5, // le break reste 1 à 2 LU sous l'acte 3
  riserBelowFill: 10, // souffle montant, discret
  crashBelowAct3: 7,
  integrated: -14,
  ceilingDbtp: -2.2, // plafond du limiteur (crête vraie) : l'encodage MP3 ajoute ≈ 0,3 dB, reste ≤ −1,5 dBTP
};
const CLICK_PEAK_DBFS = -9; // déclic du bouton (≤ −6 dBFS après mastering)
const THUMP_PEAK_DBFS = -12;
const DEGAUSS_PEAK_DBFS = -11;
const KICK_PEAK_DBFS = -5;

// ---------------------------------------------------------------- ffmpeg (celui de Remotion)

const require = createRequire(import.meta.url);
const remotionCli = path.join(path.dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');

function ffmpeg(args, input) {
  const r = spawnSync(process.execPath, [remotionCli, 'ffmpeg', ...args], {
    input,
    maxBuffer: 1 << 30,
  });
  if (r.status !== 0) {
    throw new Error(`ffmpeg a échoué :\n${r.stderr?.toString()}`);
  }
  return r.stdout;
}

// ---------------------------------------------------------------- utilitaires

let seed = 0x5eed;
const rand = () => {
  // mulberry32 : bruit reproductible d'un rendu à l'autre
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rand() * 2 - 1;
const at = (sec) => Math.max(0, Math.min(N, Math.round(sec * SR)));
const dbToGain = (db) => 10 ** (db / 20);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const mono = () => new Float32Array(N);
const stereo = () => [mono(), mono()];

function addPanned(bus, i, v, pan) {
  if (i < 0 || i >= N) return;
  const a = ((pan + 1) * Math.PI) / 4;
  bus[0][i] += v * Math.cos(a);
  bus[1][i] += v * Math.sin(a);
}

/** dst += src × gain, canal par canal (src mono ou stéréo). */
function mixInto(dst, src, gain = 1) {
  const s = Array.isArray(src) ? src : [src, src];
  for (const c of [0, 1]) for (let i = 0; i < N; i++) dst[c][i] += s[c][i] * gain;
}

function peakOf(bus) {
  let p = 0;
  for (const c of Array.isArray(bus) ? bus : [bus]) for (let i = 0; i < N; i++) p = Math.max(p, Math.abs(c[i]));
  return p;
}

function scale(bus, k) {
  for (const c of Array.isArray(bus) ? bus : [bus]) for (let i = 0; i < N; i++) c[i] *= k;
  return bus;
}

// Filtre biquad (RBJ), appliqué en place.
function biquad(x, type, f0, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * f0) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const A = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') [b0, b1, b2, a0, a1, a2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
  else if (type === 'highpass') [b0, b1, b2, a0, a1, a2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
  else if (type === 'peak') [b0, b1, b2, a0, a1, a2] = [1 + alpha * A, -2 * cos, 1 - alpha * A, 1 + alpha / A, -2 * cos, 1 - alpha / A];
  else [b0, b1, b2, a0, a1, a2] = [alpha, 0, -alpha, 1 + alpha, -2 * cos, 1 - alpha]; // bandpass
  return iir(x, [b0 / a0, b1 / a0, b2 / a0], [a1 / a0, a2 / a0]);
}

function iir(x, [b0, b1, b2], [a1, a2], out = x) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

// FFT radix 2, en place.
function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// Convolution d'un extrait [from, to) du signal par une réponse impulsionnelle.
function convolveRegion(x, h, from, to) {
  const len = to - from;
  let n = 1;
  while (n < len + h.length) n <<= 1;
  const ar = new Float64Array(n), ai = new Float64Array(n);
  const br = new Float64Array(n), bi = new Float64Array(n);
  for (let i = 0; i < len; i++) ar[i] = x[from + i];
  for (let i = 0; i < h.length; i++) br[i] = h[i];
  fft(ar, ai, false);
  fft(br, bi, false);
  for (let i = 0; i < n; i++) {
    const r = ar[i] * br[i] - ai[i] * bi[i];
    ai[i] = ar[i] * bi[i] + ai[i] * br[i];
    ar[i] = r;
  }
  fft(ar, ai, true);
  const out = mono();
  for (let i = 0; i < len + h.length && from + i < N; i++) out[from + i] = ar[i];
  return out;
}

// ---------------------------------------------------------------- intensité (UIT-R BS.1770-4)

// Pondération K à 48 kHz (filtre en plateau puis passe-haut « RLB »), coefficients de la norme.
function kWeighted(x, from, to) {
  const y = new Float64Array(to - from);
  for (let i = from; i < to; i++) y[i - from] = x[i];
  iir(y, [1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]);
  iir(y, [1, -2, 1], [-1.99004745483398, 0.99007225036621]);
  return y;
}

/** Intensité intégrée (LUFS) de bus entre deux instants, avec les portes −70 LUFS et −10 LU. */
function lufs(bus, fromSec, toSec) {
  const chans = Array.isArray(bus) ? bus : [bus, bus];
  const pre = at(0.5); // le filtre se stabilise avant la mesure
  const from = at(fromSec), to = at(toSec), start = Math.max(0, from - pre);
  const k = chans.map((c) => kWeighted(c, start, to).subarray(from - start));
  const len = to - from;
  const block = Math.round(0.4 * SR), step = Math.round(0.1 * SR);
  const powers = [];
  if (len < block) {
    let s = 0;
    for (const c of k) for (let i = 0; i < len; i++) s += c[i] * c[i];
    powers.push(s / Math.max(1, len));
  } else {
    for (let b = 0; b + block <= len; b += step) {
      let s = 0;
      for (const c of k) for (let i = b; i < b + block; i++) s += c[i] * c[i];
      powers.push(s / block);
    }
  }
  const L = (p) => -0.691 + 10 * Math.log10(p + 1e-20);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const abs = powers.filter((p) => L(p) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(mean(abs)) - 10;
  return L(mean(abs.filter((p) => L(p) > rel)));
}

/** Gain (linéaire) à donner à x pour que bed + x × gain atteigne target LUFS entre a et b. */
function solveGain(bed, x, target, a, b) {
  const sum = stereo();
  const measure = (g) => {
    const xs = Array.isArray(x) ? x : [x, x];
    for (const c of [0, 1]) for (let i = at(a - 0.6); i < at(b); i++) sum[c][i] = (bed ? bed[c][i] : 0) + xs[c][i] * g;
    return lufs(sum, a, b);
  };
  let lo = -60, hi = 40;
  for (let it = 0; it < 30; it++) {
    const mid = (lo + hi) / 2;
    if (measure(dbToGain(mid)) < target) lo = mid;
    else hi = mid;
  }
  return dbToGain((lo + hi) / 2);
}

// ---------------------------------------------------------------- musique

async function loadMusic() {
  const cacheDir = path.join(root, '.cache');
  const file = path.join(cacheDir, sync.music.file);
  if (!existsSync(file)) {
    mkdirSync(cacheDir, {recursive: true});
    console.log(`Téléchargement de ${sync.music.url}`);
    const res = await fetch(sync.music.url);
    if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  // La vidéo commence à (drop source − drop vidéo) dans le morceau.
  const offset = sync.music.dropInSourceSec - DROP;
  const skip = Math.max(0, offset);
  const pad = Math.max(0, -offset);
  // Le ffmpeg de Remotion sait écrire du WAV 16 bits, pas du PCM brut : on lit le bloc « data ».
  const wav = ffmpeg([
    '-v', 'error', '-ss', String(skip), '-t', String(TOTAL), '-i', file,
    '-f', 'wav', '-c:a', 'pcm_s16le', '-ac', '2', '-ar', String(SR), 'pipe:1',
  ]);
  const dataAt = wav.indexOf('data') + 8;
  const [L, R] = stereo();
  const start = at(pad);
  const frames = Math.floor((wav.length - dataAt) / 4);
  for (let i = 0; start + i < N && i < frames; i++) {
    L[start + i] = wav.readInt16LE(dataAt + 4 * i) / 32768;
    R[start + i] = wav.readInt16LE(dataAt + 4 * i + 2) / 32768;
  }
  return [L, R];
}

// Le son « sorti du téléviseur » : mono, bande étroite, légèrement saturé.
function tvSpeaker([L, R]) {
  const m = mono();
  for (let i = 0; i < N; i++) m[i] = (L[i] + R[i]) / 2;
  biquad(m, 'highpass', 380);
  biquad(m, 'highpass', 380);
  biquad(m, 'peak', 1800, 1.2, 3); // petite bosse de haut-parleur en carton
  biquad(m, 'lowpass', 3400);
  biquad(m, 'lowpass', 3400);
  for (let i = 0; i < N; i++) m[i] = Math.tanh(m[i] * 2.2) / 2.2;
  return m;
}

// Nivellement lent (non causal) : le début du morceau, plus fort, et sa partie calme se
// rapprochent ; ±maxDb au plus, 70 % de l'écart corrigé, fenêtre de 2 s.
function level(x, fromSec, toSec, maxDb = 4) {
  const hop = Math.round(0.1 * SR);
  const k = kWeighted(x, 0, N);
  const nh = Math.ceil(N / hop);
  const p = new Float64Array(nh);
  for (let h = 0; h < nh; h++) {
    let s = 0;
    const end = Math.min(N, (h + 1) * hop);
    for (let i = h * hop; i < end; i++) s += k[i] * k[i];
    p[h] = s / Math.max(1, end - h * hop);
  }
  const win = 10;
  const local = new Float64Array(nh);
  for (let h = 0; h < nh; h++) {
    let s = 0, n = 0;
    for (let j = Math.max(0, h - win); j <= Math.min(nh - 1, h + win); j++) { s += p[j]; n++; }
    local[h] = 10 * Math.log10(s / n + 1e-20);
  }
  let ref = 0, n = 0;
  for (let h = Math.floor(fromSec * 10); h < Math.floor(toSec * 10); h++) { ref += p[h]; n++; }
  ref = 10 * Math.log10(ref / n);
  const gDb = Array.from(local, (l) => Math.max(-maxDb, Math.min(maxDb, 0.7 * (ref - l))));
  const out = mono();
  for (let i = 0; i < N; i++) {
    const pos = i / hop - 0.5;
    const h = Math.max(0, Math.min(nh - 2, Math.floor(pos)));
    const fr = Math.max(0, Math.min(1, pos - h));
    out[i] = x[i] * dbToGain(gDb[h] * (1 - fr) + gDb[h + 1] * fr);
  }
  return out;
}

// ---------------------------------------------------------------- allumage du téléviseur

// Résonance amortie : sinus de fréquence f, décroissance tau, ajoutée à partir de t0.
function addRing(bus, t0, f, tau, amp, pan = 0) {
  const i0 = at(t0);
  const len = Math.round(tau * 6 * SR);
  const ph = rand() * Math.PI * 2;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = (1 - Math.exp(-t / 0.0002)) * Math.exp(-t / tau);
    addPanned(bus, i0 + i, Math.sin(2 * Math.PI * f * t + ph) * env * amp, pan);
  }
}

// Petite rafale de bruit filtré en bande (le « contact » d'un déclic).
function addBurst(bus, t0, dur, fc, q, amp, pan = 0) {
  const len = Math.round(dur * 4 * SR);
  const x = new Float32Array(len);
  for (let i = 0; i < len; i++) x[i] = noise() * Math.exp(-i / SR / dur);
  biquad(x, 'bandpass', fc, q);
  const i0 = at(t0);
  for (let i = 0; i < len; i++) addPanned(bus, i0 + i, x[i] * amp * 3, pan);
}

function powerOnClicks(t0) {
  const bus = stereo();
  // 1. Le bouton en plastique s'enfonce : contact sec, résonances du boîtier, corps grave.
  addBurst(bus, t0, 0.0015, 3200, 0.9, 1, 0.05);
  addRing(bus, t0, 1850, 0.009, 0.5, 0.05);
  addRing(bus, t0, 3320, 0.005, 0.32, 0.05);
  addRing(bus, t0, 5650, 0.003, 0.2, 0.05);
  addRing(bus, t0, 240, 0.016, 0.35, 0);
  // 2. Le mécanisme se verrouille, 38 ms plus tard : plus petit, plus aigu.
  const t1 = t0 + 0.038;
  addBurst(bus, t1, 0.001, 4200, 1.2, 0.5, 0.1);
  addRing(bus, t1, 2450, 0.005, 0.26, 0.1);
  addRing(bus, t1, 4150, 0.003, 0.16, 0.1);
  // 3. Le relais colle (« tchk ») : contact métallique, deux rebonds, puis l'armature.
  const t2 = t0 + 0.085;
  for (const [dt, a] of [[0, 1], [0.0024, 0.45], [0.0051, 0.2]]) {
    addBurst(bus, t2 + dt, 0.0008, 5200, 1.5, 0.45 * a, -0.05);
    addRing(bus, t2 + dt, 3800, 0.003, 0.18 * a, -0.05);
    addRing(bus, t2 + dt, 7300, 0.0018, 0.1 * a, -0.05);
  }
  addBurst(bus, t2 + 0.004, 0.02, 1150, 1.4, 0.16, -0.05);
  addRing(bus, t2 + 0.004, 610, 0.022, 0.12, -0.05);
  for (const c of bus) biquad(c, 'highpass', 90);
  return scale(bus, dbToGain(CLICK_PEAK_DBFS) / peakOf(bus));
}

// Le transformateur se met sous tension : coup sourd, très grave.
function powerOnThump(t0) {
  const x = mono();
  let ph = 0;
  for (let i = 0; i < at(0.45); i++) {
    const t = i / SR;
    const f = 40 + 32 * Math.exp(-t / 0.04);
    ph += (2 * Math.PI * f) / SR;
    const env = (1 - Math.exp(-t / 0.004)) * Math.exp(-t / 0.11);
    x[at(t0) + i] += Math.sin(ph) * env;
  }
  return scale(x, dbToGain(THUMP_PEAK_DBFS) / peakOf(x));
}

// Démagnétisation : un « bwoum » grave et bref (bourdonnement riche, assombri, qui retombe).
function degauss(t0) {
  const x = mono();
  for (let i = at(t0); i < at(t0 + 1.6); i++) {
    const t = i / SR - t0;
    const f = 47 + 5 * Math.exp(-t / 0.25); // la bobine retombe légèrement
    let saw = 0;
    for (let k = 1; k <= 8; k++) saw += Math.sin(2 * Math.PI * f * k * t * (1 + 0.003 * Math.sin(7 * t))) / k;
    x[i] = saw * (1 - Math.exp(-t / 0.05)) * Math.exp(-t / 0.4);
  }
  biquad(x, 'lowpass', 320);
  biquad(x, 'lowpass', 320);
  biquad(x, 'peak', 140, 1.5, 4); // le « ou » de « bwoum »
  biquad(x, 'highpass', 35);
  return x;
}

// La neige : un bruit numérique large et dense (souffle stéréo, grain, crépitements), qui
// monte avec le trait blanc, enfle doucement, puis s'efface sous la musique.
function staticBed() {
  const from = at(PO.lineSec - 0.2), to = at(PO.snowEndSec + 0.4);
  const c = mono(), l = mono(), r = mono(), body = mono();
  for (let i = from; i < to; i++) { c[i] = noise(); l[i] = noise(); r[i] = noise(); body[i] = noise(); }
  for (const x of [c, l, r]) {
    biquad(x, 'highpass', 160);
    biquad(x, 'highpass', 160);
    biquad(x, 'peak', 5200, 0.8, 3);
    biquad(x, 'lowpass', 11500);
  }
  // Un peu de corps (bruit plus sombre) pour que la neige ne soit pas qu'un sifflement.
  biquad(body, 'bandpass', 520, 0.7);
  // Grain : modulation aléatoire rapide (lissée, sans périodicité) et lente.
  let fast = 0, slow = 0, target = 0, slowTarget = 0;
  const bus = stereo();
  for (let i = from; i < to; i++) {
    const t = i / SR;
    if (i % 160 === 0) target = noise();
    if (i % 4800 === 0) slowTarget = noise();
    fast += (target - fast) * 0.004;
    slow += (slowTarget - slow) * 0.0002;
    const grain = 1 + 0.22 * fast + 0.1 * slow;
    const out = 1 - smooth(PO.pictureSec, PO.snowEndSec + 0.2, t);
    const env =
      smooth(PO.lineSec - 0.15, PO.openSec + 0.1, t) * // monte avec le trait blanc
      dbToGain(-1.5 + 2 * smooth(PO.snowFromSec, PO.pictureSec - 0.2, t)) * // lente montée
      out * out; // s'efface sous la musique (qui monte en même temps) sans bosse
    const m = c[i] + 0.9 * body[i];
    bus[0][i] = (m + 0.45 * l[i]) * grain * env;
    bus[1][i] = (m + 0.45 * r[i]) * grain * env;
  }
  // Crépitements numériques : de brèves bribes échantillonnées-bloquées, éparses.
  let rms = 0;
  for (let i = at(2), e = at(3); i < e; i++) rms += bus[0][i] * bus[0][i];
  rms = Math.sqrt(rms / (at(3) - at(2)));
  for (let t = PO.lineSec + 0.1; t < PO.snowEndSec + 0.2; t += -Math.log(1 - rand() * 0.999) / 22) {
    const out = 1 - smooth(PO.pictureSec, PO.snowEndSec + 0.2, t);
    const env = smooth(PO.lineSec, PO.snowFromSec, t) * out * out;
    const len = Math.round((0.0004 + rand() * 0.0025) * SR);
    const hold = 2 + Math.floor(rand() * 10);
    const amp = rms * (1.2 + rand() * 2.2) * env;
    const pan = noise() * 0.7;
    let v = 0;
    for (let i = 0; i < len; i++) {
      if (i % hold === 0) v = noise();
      const edge = Math.min(1, i / 8, (len - i) / 8);
      addPanned(bus, at(t) + i, v * amp * edge, pan);
    }
  }
  return bus;
}

// ---------------------------------------------------------------- batterie

const TOMS = {hi: [215, 142], mid: [165, 108], low: [124, 82], floor: [98, 64]};

function addTom(bus, t0, kind, gain, pan) {
  const [f1, f2] = TOMS[kind];
  const i0 = at(t0);
  let ph = 0;
  for (let i = 0; i < at(0.7); i++) {
    const t = i / SR;
    const f = f2 + (f1 - f2) * Math.exp(-t / 0.045);
    ph += (2 * Math.PI * f) / SR;
    const env = (1 - Math.exp(-t / 0.0012)) * Math.exp(-t / 0.2);
    let v = Math.sin(ph) * env + 0.22 * Math.sin(ph * 1.53) * Math.exp(-t / 0.07);
    if (t < 0.008) v += noise() * (1 - t / 0.008) * 0.6;
    addPanned(bus, i0 + i, v * gain, pan);
  }
}

function addKick(bus, t0, gain) {
  const i0 = at(t0);
  let ph = 0;
  for (let i = 0; i < at(0.8); i++) {
    const t = i / SR;
    const f = 42 + 90 * Math.exp(-t / 0.035);
    ph += (2 * Math.PI * f) / SR;
    let v = Math.sin(ph) * Math.exp(-t / 0.32);
    if (t < 0.004) v += noise() * (1 - t / 0.004) * 0.5;
    addPanned(bus, i0 + i, v * gain, 0);
  }
}

function crash(t0) {
  const bus = stereo();
  const i0 = at(t0);
  const len = at(2.6);
  const partials = [541, 807, 1173, 1489, 2011, 3153, 4219];
  for (let i = 0; i < len && i0 + i < N; i++) {
    const t = i / SR;
    let metal = 0;
    for (const p of partials) metal += Math.sign(Math.sin(2 * Math.PI * p * t));
    const env = Math.exp(-t / 0.9);
    bus[0][i0 + i] = (noise() * 0.8 + metal * 0.05) * env;
    bus[1][i0 + i] = (noise() * 0.8 + metal * 0.05) * env;
  }
  for (const x of bus) {
    biquad(x, 'highpass', 3800);
    biquad(x, 'highpass', 3800);
  }
  return bus;
}

// Réponse impulsionnelle de réverbération (bruit à décroissance exponentielle).
function impulse(decay, length) {
  const h = new Float32Array(at(length));
  for (let i = 0; i < h.length; i++) h[i] = noise() * Math.exp(-i / SR / decay);
  biquad(h, 'lowpass', 5500);
  let e = 0;
  for (const v of h) e += v * v;
  const k = 1 / Math.sqrt(e);
  for (let i = 0; i < h.length; i++) h[i] *= k;
  return h;
}

// Les toms du break : coup sec + réverbération coupée net (gated reverb).
function fillToms() {
  const dry = stereo();
  HITS.forEach((h, k) => {
    const pan = -0.45 + (0.9 * k) / Math.max(1, HITS.length - 1);
    addTom(dry, h.t, h.drum, 0.4, pan);
  });
  const region = [at(FILL_START - 0.1), at(DROP + 0.5)];
  const wet = [
    convolveRegion(dry[0], impulse(0.5, 1.4), ...region),
    convolveRegion(dry[1], impulse(0.5, 1.4), ...region),
  ];
  const gate = (t) => {
    let g = 0;
    for (const h of HITS) {
      const d = t - h.t;
      if (d >= 0 && d < 0.3) g = Math.max(g, d < 0.26 ? 1 : 1 - (d - 0.26) / 0.04);
    }
    return g;
  };
  const bus = stereo();
  for (let i = region[0]; i < region[1]; i++) {
    const g = gate(i / SR);
    for (const c of [0, 1]) bus[c][i] = Math.tanh((dry[c][i] + wet[c][i] * g) * 1.3) / 1.3;
  }
  return bus;
}

// Souffle montant avant le drop.
function riser() {
  const bus = stereo();
  let low = 0, band = 0;
  for (let i = at(DROP - 1.4); i < at(DROP); i++) {
    const t = i / SR;
    const p = smooth(DROP - 1.4, DROP, t);
    const f = 2 * Math.sin((Math.PI * (400 + 7000 * p * p)) / SR);
    low += f * band;
    const high = noise() - low - 0.5 * band;
    band += f * high;
    addPanned(bus, i, band * p * p, Math.sin(t * 11) * 0.3);
  }
  return bus;
}

// ---------------------------------------------------------------- mastering

// Suréchantillonnage ×4 (sinus cardinal fenêtré, 12 coefficients par phase) pour estimer la
// crête vraie entre deux échantillons, comme le fait la norme BS.1770.
const OS = 4, TAPS = 12;
const PHASES = Array.from({length: OS - 1}, (_, p) => {
  const frac = (p + 1) / OS;
  return Array.from({length: TAPS}, (_, j) => {
    const x = j - TAPS / 2 + 1 - frac; // position relative au point interpolé
    const sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / (TAPS / 2 + 1));
    return sinc * w;
  });
});

/** Crête (vraie) de chaque intervalle [i, i+1], canaux liés. */
function intervalPeaks(bus) {
  const p = new Float32Array(N);
  for (const c of bus) {
    for (let i = 0; i < N; i++) {
      let m = Math.max(Math.abs(c[i]), i + 1 < N ? Math.abs(c[i + 1]) : 0);
      for (const h of PHASES) {
        let s = 0;
        for (let j = 0; j < TAPS; j++) {
          const k = i + j - TAPS / 2 + 1;
          if (k >= 0 && k < N) s += c[k] * h[j];
        }
        m = Math.max(m, Math.abs(s));
      }
      if (m > p[i]) p[i] = m;
    }
  }
  return p;
}

// Limiteur à anticipation, non causal (on connaît toute la piste) : le gain requis est pris au
// minimum sur la fenêtre d'anticipation, relâché lentement, puis lissé sur la même fenêtre :
// le gain est déjà descendu quand la crête arrive, et ne la dépasse jamais.
function limit(bus, ceiling) {
  const peaks = intervalPeaks(bus);
  const req = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = Math.max(peaks[i], i > 0 ? peaks[i - 1] : 0);
    req[i] = p > ceiling ? ceiling / p : 1;
  }
  const L = Math.round(0.005 * SR);
  // minimum glissant vers l'avant sur L échantillons (file monotone)
  const hold = new Float32Array(N);
  const q = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let i = N - 1; i >= 0; i--) {
    while (qt > qh && req[q[qt - 1]] >= req[i]) qt--;
    q[qt++] = i;
    while (q[qh] > i + L - 1) qh++;
    hold[i] = req[q[qh]];
  }
  // relâchement (≈ 80 ms), sans jamais dépasser le gain requis
  const rel = 1 - Math.exp(-1 / (0.08 * SR));
  let g = 1;
  for (let i = 0; i < N; i++) {
    g = Math.min(hold[i], g + (1 - g) * rel);
    hold[i] = g;
  }
  // lissage (moyenne sur L échantillons vers l'arrière)
  const gain = new Float32Array(N);
  let s = L; // avant le début, le gain vaut 1
  for (let i = 0; i < N; i++) {
    s += hold[i] - (i >= L ? hold[i - L] : 1);
    gain[i] = s / L;
  }
  let minGain = 1;
  for (const c of bus) for (let i = 0; i < N; i++) c[i] *= gain[i];
  for (let i = 0; i < N; i++) minGain = Math.min(minGain, gain[i]);
  return minGain;
}

// ---------------------------------------------------------------- assemblage

const music = await loadMusic();
for (const c of music) biquad(c, 'highpass', 18); // le morceau source a un léger décalage continu

// Acte 3 : la musique en pleine bande, réglée à LEVEL.act3.
const gFull = solveGain(null, music, LEVEL.act3, DROP, TOTAL - FADE_OUT);
const full = [Float32Array.from(music[0], (v) => v * gFull), Float32Array.from(music[1], (v) => v * gFull)];

// Acte 1 : le haut-parleur du téléviseur, nivelé, réglé à LEVEL.act1.
const tvRaw = level(tvSpeaker(music), PO.snowEndSec, FILL_START);
const tvLeveled = scale(tvRaw, solveGain(null, tvRaw, LEVEL.act1, PO.snowEndSec, FILL_START));

// Le lit musical : le téléviseur monte de audibleFromSec à snowEndSec ; pendant le break le son
// commence à « sortir » de l'écran ; au drop il est en pleine bande ; fondu final après limiteur.
const bed = stereo();
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const open = t >= DROP ? 1 : 0.35 * smooth(FILL_START, DROP, t);
  const tvPart = tvLeveled[i] * smooth(AUDIBLE, PO.snowEndSec, t) * (1 - open);
  bed[0][i] = tvPart + full[0][i] * open;
  bed[1][i] = tvPart + full[1][i] * open;
}

// Allumage : souffle de pièce, déclic, relais, coup sourd, démagnétisation, sifflement, neige.
const power = stereo();
{
  // souffle de pièce, à peine audible (≈ −62 dBFS), qui s'efface sous la musique
  const room = mono();
  for (let i = 0; i < at(PO.snowEndSec + 1); i++) room[i] = noise();
  biquad(room, 'lowpass', 1200);
  biquad(room, 'highpass', 60);
  let e = 0;
  for (let i = 0; i < at(1); i++) e += room[i] * room[i];
  const k = dbToGain(-62) / Math.sqrt(e / at(1));
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    room[i] *= k * smooth(0, 0.05, t) * (1 - smooth(PO.snowEndSec, PO.snowEndSec + 1, t));
  }
  mixInto(power, room);

  mixInto(power, powerOnClicks(PO.buttonSec));
  mixInto(power, powerOnThump(PO.buttonSec + 0.092));
  const dg = degauss(PO.buttonSec + 0.12);
  let gDg = solveGain(null, dg, LEVEL.act1 - 4, PO.buttonSec + 0.12, PO.lineSec + 0.2);
  gDg = Math.min(gDg, dbToGain(DEGAUSS_PEAK_DBFS) / peakOf(dg));
  mixInto(power, dg, gDg);

  // sifflement THT, très léger, moins de 0,6 s autour du trait blanc
  const whine = mono();
  for (let i = at(PO.lineSec - 0.05); i < at(PO.lineSec + 0.5); i++) {
    const t = i / SR;
    const env = smooth(PO.lineSec - 0.05, PO.lineSec + 0.1, t) * (1 - smooth(PO.lineSec + 0.2, PO.lineSec + 0.5, t));
    whine[i] = Math.sin(2 * Math.PI * 15734 * t) * env * dbToGain(-50);
  }
  mixInto(power, whine);

  // la neige, réglée pour que l'allumage sonne au niveau de la musique de l'acte 1
  const snow = staticBed();
  const before = stereo();
  mixInto(before, bed);
  mixInto(before, power);
  mixInto(power, snow, solveGain(before, snow, LEVEL.powerOn, 0, PO.snowEndSec));
}

// Le break : toms (réglés 1,5 LU sous l'acte 3), souffle montant discret ; puis crash et grosse caisse.
const fillLevel = LEVEL.act3 - LEVEL.fillBelowAct3;
const drums = stereo();
{
  const rs = riser();
  mixInto(drums, rs, solveGain(null, rs, fillLevel - LEVEL.riserBelowFill, DROP - 0.7, DROP));
  const toms = fillToms();
  const under = stereo();
  mixInto(under, bed);
  mixInto(under, drums);
  mixInto(drums, toms, solveGain(under, toms, fillLevel, FILL_START, DROP));
  const cr = crash(DROP);
  mixInto(drums, cr, solveGain(null, cr, LEVEL.act3 - LEVEL.crashBelowAct3, DROP, DROP + 2));
  const kick = stereo();
  addKick(kick, DROP, 1);
  mixInto(drums, kick, dbToGain(KICK_PEAK_DBFS) / peakOf(kick));
}

const mix = stereo();
mixInto(mix, bed);
mixInto(mix, power);
mixInto(mix, drums);

// Mastering : gain global pour −14 LUFS intégrés, limiteur de crête vraie, fondus.
const fades = (bus) => {
  for (const c of bus) {
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      c[i] *= smooth(0, 0.005, t) * (1 - smooth(TOTAL - FADE_OUT, TOTAL, t));
    }
    c[N - 1] = 0;
  }
};
let G = 1;
let out, integrated, minGain, applied;
for (let it = 0; it < 5; it++) {
  applied = G;
  out = [Float32Array.from(mix[0], (v) => v * G), Float32Array.from(mix[1], (v) => v * G)];
  minGain = limit(out, dbToGain(LEVEL.ceilingDbtp));
  fades(out);
  integrated = lufs(out, 0, TOTAL);
  if (Math.abs(integrated - LEVEL.integrated) < 0.03) break;
  G *= dbToGain(LEVEL.integrated - integrated);
}
const tp = 20 * Math.log10(intervalPeaks(out).reduce((a, b) => Math.max(a, b), 0));

const inter = new Float32Array(N * 2);
for (let i = 0; i < N; i++) {
  inter[2 * i] = out[0][i];
  inter[2 * i + 1] = out[1][i];
}

const dest = path.join(root, 'public/audio/soundtrack.mp3');
mkdirSync(path.dirname(dest), {recursive: true});
ffmpeg(
  ['-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '320k', dest],
  Buffer.from(inter.buffer),
);
const seg = (a, b) => lufs(out, a, b).toFixed(1);
console.log(
  [
    `Bande-son écrite : ${path.relative(root, dest)} (${TOTAL} s, drop à ${DROP} s, break à ${FILL_START.toFixed(3)} s)`,
    `  intégré ${integrated.toFixed(1)} LUFS, crête vraie ${tp.toFixed(1)} dBTP (avant MP3), gain global ${(20 * Math.log10(applied)).toFixed(1)} dB, limiteur −${(-20 * Math.log10(minGain)).toFixed(1)} dB au plus`,
    `  allumage 0–${PO.snowEndSec} s : ${seg(0, PO.snowEndSec)} · acte 1 : ${seg(PO.snowEndSec, FILL_START)} · break : ${seg(FILL_START, DROP)} · acte 3 : ${seg(DROP, TOTAL - FADE_OUT)} LUFS`,
  ].join('\n'),
);
