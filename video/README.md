# Vidéo de présentation

Vidéo de 100,8 secondes (1,8 s de prologue, puis 99 s), en code avec [Remotion](https://www.remotion.dev/), en deux formats :
16:9 (1920 × 1080) et 4:5 (1080 × 1350, pour le fil LinkedIn sur mobile). Tempo : 80 BPM
(une mesure = 3 s).

| Temps | Acte | Ce qu'on voit |
|---|---|---|
| 0 → 5,2 s | Prologue | Plan large de la pièce, en clair-obscur : un cadre en chemise blanche et cravate bleue (visage jamais visible : cadré au ras du col en 16:9, silhouette dans l'ombre en 4:5) entre, s'assoit, tend le bras et allume le poste à la télécommande (2,4 s) ; voyant rouge, trait blanc, neige « CH 03 » ; la lueur de l'écran éclaire sa chemise ; travelling avant jusqu'au téléviseur (3 → 5,2 s) |
| 5,2 → 20,55 s | 1 | Route synthwave en pixel art dans l'écran, cartes du terminal (6,8 ; 10,3 ; 13,8 et 17,3 s). Panneaux à mots, et en face des panneaux illustrés animés (loupe d'audit, organigramme de groupe, calcul de coûts, cube 3D, puce, réseau d'applications) ; Grande Arche devant le soleil, éoliennes, globe néon tramé avec anneau et satellite, oiseaux, Rafale poursuivi par un F-22, drones, robots, péage « CONTRÔLE » |
| 20,55 → 22,8 s | 2 | Break de batterie (10 coups) : un zoom et un glitch par coup |
| 22,8 s | 2 | Le drop : la caméra traverse l'écran (flash, éclats de pixels) |
| 22,8 → 31,8 s | 3 | Bilan de compétences : sphères en fil de fer néon tramé (rotation, pulsation, dispersion en particules) autour du titre ; un poste par demi-temps (actif : 7 compétences, passif : 5 centres d'intérêt) ; « Bilan équilibré » ; les sphères fusionnent en soleil synthwave |
| 31,8 → 37,8 s | 3 | Le nom : décodé en police du terminal, glitch vers le serif ; piste d'audit qui se coche, tampon « Contrôlé », « Chaque chiffre renvoie à sa source. » |
| 37,8 → 46,8 s | 3 | « Ce que je sais faire » : six écrans de contrôle animés (audit, ingénierie sociétaire, modélisation 3D, visuels et fonctionnalités, skills et automatisation, connexion d'applications) |
| 46,8 → 52,8 s | 3 | « Mes sujets » : trois thèmes, avec photos du site |
| 52,8 → 82,8 s | 3 | Les cinq projets, 6 s chacun : problème, puis fonctionnalités et capture |
| 82,8 → 94,8 s | 3 | Publications : « Lignes de force », les deux séries, le dossier robotique |
| 94,8 → 100,8 s | 3 | Carte de fin (adresses écrites et QR code vers le portfolio, `CONTACT.qr`), fondu au noir sur les 0,8 dernières secondes |

Le code compte le temps depuis le début du téléviseur (`src/timeline.ts`, `src/sync.json`) : la vidéo
commence `prologueSec` (1,8 s) plus tôt. Les instants ci-dessus sont ceux de la vidéo.

Le dossier est indépendant du site : Vercel ne publie que `../public/`. Une vidéo rendue dans `out/`
n'apparaît donc sur le site qu'après `npm run publish-site` (voir plus bas).

## Commandes

```bash
npm install           # une seule fois
npm run dev           # aperçu dans Remotion Studio (timeline, lecture, pause)
npm run render        # out/ludovic-labeaut-16x9.mp4 et out/ludovic-labeaut-4x5.mp4
npm run publish-site  # rend les deux formats et les publie sur le site (bouton « Présentation »)
npm run soundtrack    # régénère public/audio/soundtrack.mp3 après une modification de src/sync.json
```

`npm run dev` et `npm run render` copient d'abord les vidéos de démonstration du site
(`../public/videos/*.mp4`) dans `public/captures/` et les photos du site dans `public/photos/`
(copies non versionnées).

## Publier sur le site

Le bouton « Présentation » de la page d'accueil (`../public/index.html`, script
`../public/assets/js/intro.js`) ouvre la vidéo dans une fenêtre, avec le son. Il lit trois fichiers
aux noms fixes, que `npm run publish-site` produit à partir de `out/` :

| Fichier | Rôle |
|---|---|
| `../public/videos/presentation-16x9.mp4` | écran large (et lien direct sans JavaScript) |
| `../public/videos/presentation-4x5.mp4` | téléphone tenu en portrait |
| `../public/videos/presentation-poster.jpg` | image avant lecture (le plan du nom complet, à 37,3 s) |

Après chaque modification de la vidéo : `npm run publish-site`, puis versionner ces trois fichiers
et pousser. `npm run publish-site -- --no-render` republie les fichiers déjà présents dans `out/`.

## Où modifier quoi

| Fichier | Contenu |
|---|---|
| `src/content.ts` | Tous les textes : cartes du terminal, mots des panneaux, bilan de compétences (`PROFILE` ; un poste vide est masqué), projets, publications, coordonnées de la carte de fin |
| `src/sync.json` | Tempo, instant du drop, coups du break, morceau utilisé. Partagé par l'image et le son |
| `src/timeline.ts` | Chronologie dérivée de `sync.json` (allumage, cartes du terminal, plans de l'acte 3) |
| `src/act1/Prologue.tsx` | Le prologue : la pièce, le personnage (anonyme, clair-obscur), la télécommande, le cadrage large |
| `src/act1/CRTWrapper.tsx` | Le téléviseur et son écran (allumage, lignes de balayage, aberration chromatique) |
| `src/act1/PixelArtHighwayCanvas.tsx` | La scène pixel art (ciel, soleil, montagnes, route, grille, palmiers, panneaux, voiture) |
| `src/act1/pixelProps.ts` | Le décor : Grande Arche, éoliennes, globe, oiseaux, avions, drones, robots, péage |
| `src/act1/pixelPictures.ts` | Les illustrations animées des panneaux (loupe, organigramme, coûts, cube, puce, réseau) |
| `src/act1/TerminalText.tsx` | Le texte tapé façon terminal |
| `src/act2/GlitchTransition.tsx` | La caméra (zoom par coup de batterie, glitch) et la traversée de l'écran |
| `src/act3/` | La vitrine : bilan de compétences (`Profile.tsx`, sphères `PixelSpheres.tsx`), savoir-faire (`Skills.tsx`, dessins `pixelKit.ts`), titre (`TitleCard.tsx`), thèmes (`Themes.tsx`), projets (`ProjectSlide.tsx`), publications (`Publications.tsx`), carte de fin |

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
