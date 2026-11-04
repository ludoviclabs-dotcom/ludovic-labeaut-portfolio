# Vidéo de présentation

Vidéo de 45 secondes, en code avec [Remotion](https://www.remotion.dev/), en deux formats :
16:9 (1920 × 1080) et 4:5 (1080 × 1350, pour le fil LinkedIn sur mobile).

| Temps | Acte | Ce qu'on voit |
|---|---|---|
| 0 → 2 s | 1 | Un téléviseur cathodique s'allume : déclic, trait blanc, neige |
| 2 → 15,75 s | 1 | Route synthwave en pixel art dans l'écran, et le parcours tapé façon terminal (3, 6, 9 et 12 s) |
| 15,75 → 18 s | 2 | Break de batterie : un zoom et un glitch par coup |
| 18 s | 2 | Le drop : la caméra traverse l'écran (flash, éclats de pixels) |
| 18 → 45 s | 3 | Vitrine moderne aux couleurs du site : titre, les 5 projets, les publications, la carte de fin |

Le dossier est indépendant du site : Vercel ne publie que `../public/`.

## Commandes

```bash
npm install           # une seule fois
npm run dev           # aperçu dans Remotion Studio (timeline, lecture, pause)
npm run render        # out/ludovic-labeaut-16x9.mp4 et out/ludovic-labeaut-4x5.mp4
npm run soundtrack    # régénère public/audio/soundtrack.mp3 après une modification de src/sync.json
```

`npm run dev` et `npm run render` copient d'abord les vidéos de démonstration du site
(`../public/videos/*.mp4`) dans `public/captures/` (copies non versionnées).

## Où modifier quoi

| Fichier | Contenu |
|---|---|
| `src/content.ts` | Tous les textes : cartes du terminal, projets, publications, coordonnées de la carte de fin |
| `src/sync.json` | Tempo, instant du drop, coups du break, morceau utilisé. Partagé par l'image et le son |
| `src/timeline.ts` | Chronologie dérivée de `sync.json` (allumage, cartes du terminal, plans de l'acte 3) |
| `src/act1/CRTWrapper.tsx` | Le téléviseur et son écran (allumage, lignes de balayage, aberration chromatique) |
| `src/act1/PixelArtHighwayCanvas.tsx` | La scène pixel art (ciel, soleil, montagnes, route, grille, palmiers, voiture) |
| `src/act1/TerminalText.tsx` | Le texte tapé façon terminal |
| `src/act2/GlitchTransition.tsx` | La caméra (zoom par coup de batterie, glitch) et la traversée de l'écran |
| `src/act3/` | La vitrine : titre, plans des projets (`ProjectSlide.tsx`), carte de fin |

## La bande-son

`scripts/build-soundtrack.mjs` fabrique `public/audio/soundtrack.mp3` à partir de `src/sync.json` :

- la musique est **« Synth Wave » de pro-sensory** ([OpenGameArt](https://opengameart.org/content/synth-wave)),
  dans le **domaine public (CC0)** : publication libre, sans mention obligatoire ;
- pendant l'acte 1, elle sort « du haut-parleur du téléviseur » (bande étroite, mono), puis s'ouvre
  en pleine bande au drop ;
- l'allumage du téléviseur, les toms du break (réverbération coupée façon années 80), le crash et la
  grosse caisse du drop sont synthétisés par le script, aux instants exacts lus par la vidéo :
  image et son sont calés par construction.

Pour changer de morceau, remplacer `music.url` et `music.file` dans `src/sync.json`, puis mesurer
`music.dropInSourceSec` : l'instant, dans le morceau, du premier temps fort après une coupure.
Ajuster `bpm` si le tempo diffère, puis `npm run soundtrack`.

« In the Air Tonight » n'est pas utilisable pour une vidéo publiée sans licence : les plateformes
la détectent et coupent le son ou bloquent la vidéo.

## Polices

Embarquées dans `public/fonts/` (Cormorant Garamond et Inter, celles du site ; VT323 pour le
terminal), sous licence SIL Open Font License 1.1 (fichiers `OFL-*.txt`). Le rendu ne télécharge rien.

## Licence de Remotion

Remotion est gratuit pour un particulier et pour une entreprise de trois personnes au plus ;
au-delà, une licence d'entreprise est nécessaire (voir remotion.dev/license).
