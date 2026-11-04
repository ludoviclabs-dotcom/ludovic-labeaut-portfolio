// Fabrique la bande-son de la vidéo : public/audio/soundtrack.mp3
//
//   npm run soundtrack
//
// Tout part de src/sync.json, le fichier que lit aussi la vidéo :
//   - 0 → 2 s   : allumage du téléviseur (déclic, démagnétisation, neige, sifflement), synthétisés ici ;
//   - 2 → 15 s  : la musique, filtrée comme si elle sortait du petit haut-parleur du téléviseur ;
//   - 15 → 18 s : le break de batterie (toms à réverbération coupée, façon années 80), synthétisé
//                 aux instants exacts de sync.json, donc calé à l'image près sur les zooms ;
//   - 18 s      : le drop (crash, grosse caisse), la musique s'ouvre en pleine bande ;
//   - fin       : fondu de sortie.
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

const SR = 48000;
const N = Math.round(sync.totalSec * SR);
const SIXTEENTH = 60 / sync.bpm / 4;
const DROP = sync.dropSec;
const FILL_START = DROP + Math.min(...sync.fill.hits.map((h) => h.step)) * SIXTEENTH;

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
const at = (sec) => Math.round(sec * SR);

const stereo = () => [new Float32Array(N), new Float32Array(N)];

function addPanned(bus, i, v, pan) {
  if (i < 0 || i >= N) return;
  const a = ((pan + 1) * Math.PI) / 4;
  bus[0][i] += v * Math.cos(a);
  bus[1][i] += v * Math.sin(a);
}

// Filtre biquad (RBJ), appliqué en place.
function biquad(x, type, f0, q = 0.707) {
  const w = (2 * Math.PI * f0) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === 'highpass') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha]; // bandpass
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
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
  const out = new Float32Array(N);
  for (let i = 0; i < len + h.length && from + i < N; i++) out[from + i] = ar[i];
  return out;
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
    '-v', 'error', '-ss', String(skip), '-t', String(sync.totalSec), '-i', file,
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

const rms = (x, from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, to - from));
};

// Le son « sorti du téléviseur » : mono, bande étroite, légèrement saturé.
function tvSpeaker([L, R]) {
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) m[i] = (L[i] + R[i]) / 2;
  biquad(m, 'highpass', 380);
  biquad(m, 'highpass', 380);
  biquad(m, 'lowpass', 3200);
  biquad(m, 'lowpass', 3200);
  for (let i = 0; i < N; i++) m[i] = Math.tanh(m[i] * 2.2) / 2.2;
  return m;
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

function addCrash(bus, t0, gain) {
  const i0 = at(t0);
  const len = at(2.6);
  const partials = [541, 807, 1173, 1489, 2011, 3153, 4219];
  const l = new Float32Array(len), r = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let metal = 0;
    for (const p of partials) metal += Math.sign(Math.sin(2 * Math.PI * p * t));
    const env = Math.exp(-t / 0.9);
    l[i] = (noise() * 0.8 + metal * 0.05) * env;
    r[i] = (noise() * 0.8 + metal * 0.05) * env;
  }
  for (const x of [l, r]) {
    biquad(x, 'highpass', 3800);
    biquad(x, 'highpass', 3800);
  }
  for (let i = 0; i < len && i0 + i < N; i++) {
    bus[0][i0 + i] += l[i] * gain;
    bus[1][i0 + i] += r[i] * gain;
  }
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

// ---------------------------------------------------------------- assemblage

const music = await loadMusic();
const tv = tvSpeaker(music);

// Le son du téléviseur garde à peu près la moitié du niveau de la musique en pleine bande.
const from = at(2), to = at(FILL_START);
const tvGain = (0.55 * (rms(music[0], from, to) + rms(music[1], from, to))) / 2 / Math.max(1e-6, rms(tv, from, to));

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const out = stereo();
const audible = sync.music.audibleFromSec;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  // Volume : le tube chauffe, puis fondu final.
  const g = smooth(audible, audible + 1.4, t) * (1 - smooth(sync.totalSec - sync.music.fadeOutSec, sync.totalSec, t));
  // Pendant le break, le son commence à « sortir » du téléviseur ; au drop il est en pleine bande.
  const open = t >= DROP ? 1 : 0.35 * smooth(FILL_START, DROP, t);
  const tvPart = tv[i] * tvGain * (1 - open);
  out[0][i] += g * (tvPart + music[0][i] * open);
  out[1][i] += g * (tvPart + music[1][i] * open);
}

// Allumage du téléviseur : déclic, démagnétisation (« bwoum »), neige, sifflement THT, ronflement.
{
  const click = at(0.25);
  for (let i = 0; i < at(0.06); i++) {
    const t = i / SR;
    addPanned(out, click + i, (t < 0.006 ? noise() * 0.5 : 0) + Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t / 0.03) * 0.5, 0);
  }
  const degauss = new Float32Array(N);
  for (let i = at(0.3); i < at(2.2); i++) {
    const t = i / SR - 0.3;
    let saw = 0;
    for (let k = 1; k <= 10; k++) saw += Math.sin(2 * Math.PI * 50 * k * t * (1 + 0.004 * Math.sin(9 * t))) / k;
    degauss[i] = saw * (1 - Math.exp(-t / 0.03)) * Math.exp(-t / 0.42) * 0.2;
  }
  biquad(degauss, 'lowpass', 900);
  const snow = new Float32Array(N);
  for (let i = at(0.45); i < at(1.6); i++) {
    const t = i / SR;
    snow[i] = noise() * smooth(0.45, 0.55, t) * (1 - smooth(1.3, 1.6, t)) * 0.35;
  }
  biquad(snow, 'bandpass', 3000, 0.6);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const whine = t > 0.35 && t < DROP ? 0.01 * smooth(0.35, 0.6, t) * (1 - smooth(DROP - 0.4, DROP, t)) : 0;
    const hum = t > 0.3 && t < DROP ? 0.012 * (1 - smooth(DROP - 0.4, DROP, t)) : 0;
    const v =
      degauss[i] +
      snow[i] +
      whine * Math.sin(2 * Math.PI * 15625 * t) +
      hum * (Math.sin(2 * Math.PI * 50 * t) + 0.5 * Math.sin(2 * Math.PI * 100 * t));
    out[0][i] += v;
    out[1][i] += v;
  }
}

// Break de batterie : toms secs + réverbération coupée net (gated reverb).
{
  const dry = stereo();
  const hits = sync.fill.hits.map((h) => ({t: DROP + h.step * SIXTEENTH, drum: h.drum}));
  hits.forEach((h, k) => {
    const pan = -0.45 + (0.9 * k) / Math.max(1, hits.length - 1);
    addTom(dry, h.t, h.drum, 0.4, pan);
  });
  const region = [at(FILL_START - 0.1), at(DROP + 0.2)];
  const wet = [
    convolveRegion(dry[0], impulse(0.5, 1.4), ...region),
    convolveRegion(dry[1], impulse(0.5, 1.4), ...region),
  ];
  const gate = (t) => {
    let g = 0;
    for (const h of hits) {
      const d = t - h.t;
      if (d >= 0 && d < 0.3) g = Math.max(g, d < 0.26 ? 1 : 1 - (d - 0.26) / 0.04);
    }
    return g;
  };
  for (let i = region[0]; i < N; i++) {
    const t = i / SR;
    const g = gate(t);
    for (const c of [0, 1]) {
      out[c][i] += Math.tanh((dry[c][i] * 0.9 + wet[c][i] * 0.9 * g) * 1.3) / 1.3;
    }
  }
}

// Souffle montant avant le drop, puis crash et grosse caisse sur le drop.
{
  const riser = stereo();
  let low = 0, band = 0;
  for (let i = at(DROP - 1.4); i < at(DROP); i++) {
    const t = i / SR;
    const p = smooth(DROP - 1.4, DROP, t);
    const f = 2 * Math.sin((Math.PI * (400 + 7000 * p * p)) / SR);
    const x = noise();
    low += f * band;
    const high = x - low - 0.5 * band;
    band += f * high;
    addPanned(riser, i, band * p * p * 0.22, Math.sin(t * 11) * 0.3);
  }
  for (let i = 0; i < N; i++) {
    out[0][i] += riser[0][i];
    out[1][i] += riser[1][i];
  }
  addCrash(out, DROP, 0.32);
  addKick(out, DROP, 0.9);
}

// Mastering : saturation douce des crêtes, puis crête à −1 dBFS.
let peak = 0;
for (const c of out) for (let i = 0; i < N; i++) {
  c[i] = Math.tanh(c[i] * 1.15) / Math.tanh(1.15);
  peak = Math.max(peak, Math.abs(c[i]));
}
const k = 0.89 / peak;
const inter = new Float32Array(N * 2);
for (let i = 0; i < N; i++) {
  inter[2 * i] = out[0][i] * k;
  inter[2 * i + 1] = out[1][i] * k;
}

const dest = path.join(root, 'public/audio/soundtrack.mp3');
mkdirSync(path.dirname(dest), {recursive: true});
ffmpeg(
  ['-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '320k', dest],
  Buffer.from(inter.buffer),
);
console.log(`Bande-son écrite : ${path.relative(root, dest)} (${sync.totalSec} s, drop à ${DROP} s, break à ${FILL_START.toFixed(3)} s)`);
