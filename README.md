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
| PUBLICATIONS — Recherche & articles | Analyses / Articles / Veille sectorielle | *à renseigner* |

## Structure

```
public/                    site statique servi par Vercel
  index.html               contenu des panneaux (noms, axes, descriptions, liens)
  assets/css/styles.css    mise en page, diagonales, animations
  assets/js/main.js        diaporamas, alignement du texte sur la diagonale, pause
  assets/js/photos.js      liste des photos par panneau (générée par le script)
  images/<thème>/*.webp    photos optimisées (générées par le script)
scripts/import-photos.mjs  import des photos depuis Dropbox
```

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
limitées à 2000 px et converties en WebP. L'ordre de passage est alphabétique
(`Transition`, `Transition 2`, …) sauf pour Panoplie, dont l'ordre est fixé
dans `ORDER` en tête du script, avec les légendes (et crédits) dans `CAPTIONS`.
Les captures d'écran de recherche d'images sont recadrées automatiquement pour retirer
l'icône Lens et les dimensions affichées dans les coins (`DEFAULT_CROP` / `CROP`).

Tant qu'un panneau n'a pas de photo, il garde un fond sobre à sa couleur ;
FinValStudio affiche un graphique de valorisation dessiné en code.

## Modifier un texte ou un lien

Tout se trouve dans `public/index.html`, un bloc `<li class="panel">` par projet.
Pour activer le lien des publications, remplacer
`<span class="panel__cta panel__cta--soon">Bientôt en ligne</span>` par un
`<a class="panel__cta" href="…">` sur le modèle des autres panneaux.

## Aperçu local et déploiement

```bash
npm run dev          # http://localhost:3000
```

Vercel sert directement le dossier `public/` (voir `vercel.json`), sans étape de build :
chaque push sur `main` met le site en ligne.
