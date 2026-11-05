// Publie la vidéo de présentation sur le site (bouton « Présentation » de la page d'accueil).
//
//   npm run publish-site                 rend les deux formats, puis les publie
//   npm run publish-site -- --no-render  republie les rendus déjà présents dans out/
//
// out/ garde les rendus pleine qualité (à téléverser sur LinkedIn, YouTube…). Le site reçoit une
// copie allégée pour le web (H.264 CRF 27, lecture qui démarre avant la fin du téléchargement),
// sous des noms stables lus par ../public/index.html :
//   ../public/videos/presentation-16x9.mp4   écran large
//   ../public/videos/presentation-4x5.mp4    téléphone tenu en portrait
//   ../public/videos/presentation-poster.jpg image avant lecture (le plan titre complet)
// Vercel ne publie que ../public/ : sans cette étape, une vidéo rendue reste invisible sur le site.
// Il suffit ensuite de versionner ces trois fichiers et de pousser.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.resolve(root, "../public/videos");
const sync = JSON.parse(readFileSync(path.join(root, "src/sync.json"), "utf8"));
const POSTER_SEC = 26.6; // le plan titre complet : nom, piste d'audit cochée, tampon (21 → 27 s)

const cli = path.join(root, "node_modules/@remotion/cli/remotion-cli.js");
const remotion = (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: root, stdio: "inherit" });
const mb = (file) => `${(statSync(file).size / 1e6).toFixed(1)} Mo`;

execFileSync(process.execPath, ["scripts/sync-assets.mjs"], { cwd: root, stdio: "inherit" });
mkdirSync(site, { recursive: true });

for (const format of ["16x9", "4x5"]) {
  const master = path.join(root, "out", `ludovic-labeaut-${format}.mp4`);
  if (!process.argv.includes("--no-render")) remotion("render", `Presentation-${format}`, master);

  const web = path.join(site, `presentation-${format}.mp4`);
  remotion(
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", master,
    "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", web,
  );
  console.log(`publié : public/videos/${path.basename(web)} (${mb(web)}, rendu complet ${mb(master)})`);
}

const poster = path.join(site, "presentation-poster.jpg");
remotion("still", "Presentation-16x9", poster, `--frame=${Math.round(POSTER_SEC * sync.fps)}`, "--jpeg-quality=82");
console.log("publié : public/videos/presentation-poster.jpg");
