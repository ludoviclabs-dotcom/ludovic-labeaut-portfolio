# ludovic-labeaut-portfolio

Portfolio professionnel de Ludovic Labeaut — projets finance, audit, ESG, data et publications.

La page d'accueil présente cinq projets dans des panneaux séparés par des diagonales « / ».
Chaque panneau fait défiler en continu les photos de son thème, affiche les axes du projet
et un bouton **Voir le projet** qui ouvre la version en ligne dans un nouvel onglet.

| Panneau | Axes | Lien |
|---|---|---|
| CARBON&CO — Pilotage ESG & CSRD | CSRD & ESRS / Scopes 1·2·3 / Taxonomie verte | https://carbon-snowy-nine.vercel.app |
| PROBANT — Audit & conformité comptable | Analyse du FEC / Détection d'anomalies / Dossier de preuve | https://probant.vercel.app |
| PANOPLIE — Intelligence défense | Coûts & financement / Supply chain / Géopolitique & export | https://drones-mu.vercel.app |
| FINVALSTUDIO — Modélisation & valorisation | DCF & LBO / Comparables / Monte Carlo | https://fin-val-studio.vercel.app |
| PUBLICATIONS — Recherche & articles | Géopolitique / Géoéconomie / Defense-Tech | `/publications` (sur ce site) |

## Structure

```
public/                    site statique servi par Vercel
  index.html               contenu des panneaux (noms, axes, descriptions, liens)
  assets/css/styles.css    mise en page, diagonales, animations
  assets/js/main.js        diaporamas, alignement du texte sur la diagonale, pause
  assets/js/photos.js      liste des photos par panneau (générée par le script)
  images/<thème>/*.webp    photos optimisées (générées par le script)
  credits.html             crédits photo (généré par le script)
  publications/            page /publications et notes « Lignes de force » (générées)
  assets/css/publications.css  style de la page /publications
scripts/import-photos.mjs    import des photos (liste libre de droits + Dropbox)
scripts/photos-libres.json   photos Unsplash / DVIDS avec auteur et licence
scripts/import-articles.mjs  publication des notes depuis Dropbox « Articles rédigés »
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
Defense-Tech) est lu dans la note ; l'ordre suit le numéro.

## Modifier un texte ou un lien

Tout se trouve dans `public/index.html`, un bloc `<li class="panel">` par projet.

## Aperçu local et déploiement

```bash
npm run dev          # http://localhost:3000
```

Vercel sert directement le dossier `public/` (voir `vercel.json`), sans étape de build :
chaque push sur `main` met le site en ligne.
