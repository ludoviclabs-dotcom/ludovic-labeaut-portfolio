# ludovic-labeaut-portfolio

Portfolio professionnel de Ludovic Labeaut — projets finance, audit, ESG, data et publications.

La page d'accueil présente six projets dans des panneaux séparés par des diagonales « / ».
Chaque panneau fait défiler en continu les photos de son thème, affiche les axes du projet
et un bouton **Voir le projet** qui ouvre la version en ligne dans un nouvel onglet.

| Panneau | Axes | Lien |
|---|---|---|
| CARBON&CO — Pilotage ESG & CSRD | CSRD & ESRS / Scopes 1·2·3 / Taxonomie verte | https://carbon-snowy-nine.vercel.app |
| PROBANT — Audit & conformité comptable | Analyse du FEC / Détection d'anomalies / Dossier de preuve | https://probant.vercel.app |
| PANOPLIE — Intelligence défense | Coûts & financement / Supply chain / Géopolitique & export | https://drones-mu.vercel.app |
| FINVALSTUDIO — Modélisation & valorisation | DCF & LBO / Comparables / Monte Carlo | https://fin-val-studio.vercel.app |
| KYB GRAPH — Cartographie de conformité | LCB-FT & AMLR / Niveaux de preuve / Sources publiques | https://kyb-graph.vercel.app |
| PUBLICATIONS — Recherche & articles | Géopolitique / Géoéconomie / Defense-Tech | `/publications` (sur ce site) |

## Le fil rouge : pourquoi ces projets

Le portfolio relie chaque projet au Master Comptabilité, Contrôle, Audit (NEOMA BS) par une question,
sur trois niveaux de lecture : la question sur chaque panneau de l'accueil, le bloc « Pourquoi ce
projet » sur chaque page projet, et la page `/fil-rouge` (lien « Pourquoi ces projets ? » dans la barre).

Tous ces textes, en français et en anglais, viennent d'un seul fichier : `public/data/fil-rouge.json`.
Pour en changer un :

1. modifier `public/data/fil-rouge.json` ;
2. `npm run fil-rouge` (écrit les blocs dans les pages, régénère `public/fil-rouge.html` et les traductions) ;
3. `npm run en` (régénère `public/en/`) ;
4. `npm test` (vérifie les fichiers, puis le comportement dans un navigateur si Playwright est installé).

Ne pas modifier à la main `public/fil-rouge.html` ni les blocs entre `<!-- fil-rouge:… -->` et
`<!-- /fil-rouge:… -->` : ils seraient écrasés. Plan et historique : `docs/plan-fil-rouge.md`.

## Structure

```
public/                    site statique servi par Vercel
  index.html               contenu des panneaux (noms, axes, descriptions, liens)
  en/                      version anglaise, générée par scripts/build-en.mjs (npm run en)
  assets/js/lang.js        sélecteur de langue FR / EN (choix retenu d'une page à l'autre)
  assets/css/styles.css    mise en page, diagonales, animations
  assets/js/main.js        diaporamas, alignement du texte sur la diagonale, pause
  assets/js/photos.js      liste des photos par panneau (générée par le script)
  images/<thème>/*.webp    photos optimisées (générées par le script)
  credits.html             crédits photo (généré par le script)
  publications/            page /publications et notes « Lignes de force » (générées)
  dossiers/<nom>/          dossiers interactifs (robotique : page, moteur dash.js, données JSON ;
                           quantique : page, moteur/, figures/, générés par import-quantique.mjs)
  assets/css/publications.css  style de la page /publications
  data/fil-rouge.json      textes du fil rouge (FR et EN), source unique
  fil-rouge.html           page /fil-rouge (générée par scripts/build-fil-rouge.mjs)
  assets/css/fil-rouge.css, assets/js/fil-rouge.js  style et animations de la page /fil-rouge
scripts/site.mjs             domaine de production (liens hreflang des pages, en adresses complètes)
scripts/build-fil-rouge.mjs  écrit les textes du fil rouge dans les pages (npm run fil-rouge)
scripts/test-fil-rouge.mjs   tests du fil rouge, fichiers et navigateur (npm test)
scripts/import-photos.mjs    import des photos (liste libre de droits + Dropbox)
scripts/photos-libres.json   photos Unsplash / DVIDS avec auteur et licence
scripts/import-articles.mjs  publication des notes depuis Dropbox « Articles rédigés »
scripts/import-quantique.mjs dossier quantique : déballe la publication Claude Design (npm run quantique)
scripts/import-nutraceutique.mjs  Atlas Nutraceutique : copie corrigée de l'Atlas (npm run nutraceutique)
scripts/build-en.mjs         génération des pages anglaises à partir de i18n/en/*.json
i18n/en/                     traductions anglaises, page par page
video/                       vidéo de présentation (Remotion), hors du site publié : voir video/README.md
```

## Photos libres de droits

`scripts/photos-libres.json` liste les photos haute définition utilisées (Unsplash, licence
Unsplash ; DVIDS, domaine public), avec auteur, licence, page source et cadrage (`focus`).
`npm run photos` les télécharge (cache dans `.cache/photos/`) puis les convertit.
Les crédits sont publiés sur la page `credits` du site, générée par le script.

## Ajouter ou remplacer des photos

Les photos viennent du dossier Dropbox `recherche emplois/photos illustration portfolio`.
Le thème est déduit du début du nom de fichier :

| Préfixe du fichier | Panneau |
|---|---|
| `Transition…`, `Carbon…` | CARBON&CO |
| `PROBANT…` | PROBANT |
| `Euro-Hawk…`, `Patriot…`, `Rafale…`, `Panoplie…` | PANOPLIE |
| `FinVal…` | FINVALSTUDIO |
| `KYB…` | KYB GRAPH |
| `Rédaction…`, `Publication…` | PUBLICATIONS |

Puis, depuis le dossier du dépôt :

```bash
npm install          # une seule fois (installe sharp)
npm run photos       # lit le dossier Dropbox, convertit en WebP, régénère photos.js
git add public && git commit -m "Photos du portfolio" && git push
```

Par défaut le script lit `C:\Users\<vous>\Dropbox\recherche emplois\photos illustration portfolio`.
Pour un autre dossier : `npm run photos -- "D:\chemin\vers\les\photos"`.

Le script remplace tout le contenu de `public/images/`. Les photos sont redressées,
limitées à 2400×1600 px et converties en WebP ; toute photo de moins de 1000 px de haut
est écartée, car elle paraîtrait floue en plein écran. Les photos libres passent d'abord,
dans l'ordre de `photos-libres.json`, puis les photos Dropbox par ordre alphabétique.
En tête du script : `DROPBOX_CAPTIONS` (légendes), `DROPBOX_CREDITS` (crédits),
`DROPBOX_EXCLUDE` (photos à ne pas publier, par ex. droits non vérifiés) et
`SCREENSHOT_CROP` / `DROPBOX_CROP` (recadrage des captures d'écran de recherche d'images).

Tant qu'un panneau n'a pas de photo, il garde un fond sobre à sa couleur ;
FinValStudio affiche un graphique de valorisation dessiné en code.

## Publications

Les notes « Lignes de force » viennent du dossier Dropbox `Articles rédigés` :

- `NN_Titre.html` : note HTML autonome, publiée telle quelle ;
- `Bloc_N_Article_NN_Titre.md` : note Markdown, convertie avec la même mise en page.

```bash
npm run articles     # lit ~/Dropbox/Articles rédigés, régénère public/publications/
```

Chaque note est publiée sur `/publications/<numéro-titre>`, avec une barre « ← Publications »
et un bouton « Enregistrer en PDF » (impression A4). Le bloc (Géopolitique, Géoéconomie,
Defense-Tech) est lu dans la note ; l'ordre suit le numéro. Deux notes ne peuvent pas porter le
même numéro : garder une seule version (HTML ou Markdown) de chaque note dans le dossier.

La page `/publications` présente trois formats, signalés par un badge sur chaque carte :

| Format | Source | Configuration (`scripts/import-articles.mjs`) |
|---|---|---|
| Note | Dropbox `Articles rédigés` | blocs dans `BLOCKS` |
| Série | Un dossier Dropbox par série (`Articles IA`, `Articles banques centrales`) : `Article 1 — Titre.md`, `Article 2 — Titre.md`… | `SERIES` (nom, bloc, dossier, premier numéro) |
| Dossier interactif | `public/dossiers/<nom>/` (page autonome) | `DOSSIERS` (titre, chiffres clés, chapitres, couverture) |

- **Séries** : chaque article devient une note numérotée à la suite (`firstNum`), avec la mise en
  page des notes, une navigation « article précédent / suivant » et le sommaire de la série :
  « L'IA à la conquête du savoir » (Dropbox `Articles IA`, notes 10 à 17) et « Banques centrales :
  le retour du resserrement » (Dropbox `Articles banques centrales`, notes 18 à 23). Une nouvelle
  note de `Articles rédigés` prend donc le numéro 24 ou suivant. Un article attend : `# Titre`, une
  ligne « Article N sur M. État des connaissances au … », une section `## Chapô`, puis ses sections ;
  `## Encadré — …` devient un encadré, `## Bibliographie commentée` la liste des sources, et un bloc
  de code un schéma en texte. Autres dossiers : `SERIE_IA_DIR="D:\…"` et `SERIE_BC_DIR="D:\…"`.
- **Dossiers interactifs** : `public/dossiers/robotique-humanoide/` reprend le tableau de bord
  conçu avec Claude. `dash.js` remplace le moteur de Claude (chargement des jeux de données de
  `donnees/`, calculs, redessin) ; `dossier.css` l'accorde à la charte du site. Pour mettre à jour
  les chiffres, remplacer les fichiers JSON de `donnees/` (mêmes colonnes). Le dossier existe en
  français seulement : depuis la version anglaise, le lien y mène avec la mention « in French ».
- **Dossier quantique** : `public/dossiers/quantique/` (« Le quantique devient une industrie », bloc
  « Quantique & industrie ») est une publication conçue dans Claude Design, téléchargée en un seul
  fichier HTML empaqueté (Dropbox `Articles/Quantique/Le quantique devient une industrie – Publication
  interactive.html`). `npm run quantique` la déballe : la page `index.html`, le moteur de rendu, Three.js
  et React dans `moteur/` (servis par le site, sans CDN), les onze figures interactives dans `figures/`.
  Le script reprend la charte du site (Inter, Cormorant Garamond, thème sombre par défaut, accent or) ;
  `dossier.css`, écrit à la main et conservé d'un import à l'autre, redéfinit les couleurs. Après une
  nouvelle version de la publication : `npm run quantique` (ou `npm run quantique -- "D:\…\fichier.html"`),
  vérifier la page, puis committer. Ne pas modifier `index.html` ni `figures/` à la main.
- **Atlas Nutraceutique** : `public/dossiers/nutraceutique/` (bloc « Nutraceutique & santé ») est une page
  autonome conçue avec Claude (Dropbox `Articles/Nutraceutique/Atlas Nutraceutique.html`). `npm run
  nutraceutique` la copie avec un en-tête propre au site, le lien « ← Publications » et les corrections
  de la relecture du 15/11/2026 (liste `EDITS` de `scripts/import-nutraceutique.mjs` : clarté, provenance
  des chiffres de Nutri&Co, état des points encore ouverts). Le fichier Dropbox n'est pas modifié : après
  une nouvelle version de l'Atlas, relancer le script ; s'il s'arrête sur une correction dont le texte a
  changé, relire le passage et adapter `EDITS`. `dossier.css` (à la main) porte les retouches de mise en page.

## Modifier un texte ou un lien

Tout se trouve dans `public/index.html`, un bloc `<li class="panel">` par projet.
Après toute modification d'un texte français, mettez à jour la version anglaise (ci-dessous).

## Version anglaise (FR / EN)

Chaque page existe en anglais sous `/en/` (`/en/`, `/en/projets/…`, `/en/publications/…`,
`/en/credits`). Le sélecteur « FR / EN » de la barre du haut mène à la même page dans l'autre
langue et retient le choix (`assets/js/lang.js`) ; les liens `hreflang` l'indiquent aux moteurs.

Les pages anglaises sont **générées** à partir des pages françaises : ne modifiez pas `public/en/`.

```bash
npm run en -- --extract   # ajoute à i18n/en/ les textes français à traduire, retire les obsolètes
npm run en                # régénère public/en/ (s'arrête et liste ce qui n'est pas traduit)
```

- `i18n/en/<page>.json` associe chaque texte français (un paragraphe, un titre, un bouton…) à sa
  traduction ; `i18n/en/_common.json` regroupe les textes présents sur plusieurs pages.
- Modifier ou ajouter un texte français crée une entrée vide : complétez-la, puis `npm run en`.
  Tant qu'une traduction manque, `public/en/` n'est pas modifié.
- Les nombres seuls (axes, barres, cellules) passent d'eux-mêmes au format anglais
  (« 23,2 » → « 23.2 », « 28 000 » → « 28,000 », « 93 % » → « 93% »).
- Une vidéo ou un poster qui existe en version anglaise (`/videos/probant-en.mp4`) remplace
  l'original sur la page anglaise ; les vidéos anglaises ne changent que la narration, les écrans
  des applications restent en français.

Après `npm run articles` (nouvelle note ou note modifiée), lancez `npm run en -- --extract`,
traduisez les entrées vides de `i18n/en/publications/<note>.json`, puis `npm run en`.

## Aperçu local et déploiement

```bash
npm run dev          # http://localhost:3000
```

Vercel sert directement le dossier `public/` (voir `vercel.json`), sans étape de build :
chaque push sur `main` met le site en ligne.
