# Plan — « Le fil rouge » (justification du portfolio par le Master CCA)

Maquette : https://claude.ai/artifact/F72DYdWWiurnTNsPxNJF2B

## L'idée

Le visiteur doit comprendre en quelques secondes pourquoi ces six projets existent et ce qui les relie.

- **Une phrase** : « Un chiffre ne vaut que s'il peut être prouvé. » C'est l'exigence du Master Comptabilité, Contrôle, Audit.
- **Une question par projet** : chaque projet répond à une question que pose le master.
- **Aucun détail de cursus** : pas de liste de cours, pas de codes UE. Au plus deux matières citées par projet, sur la page « Le fil rouge » uniquement.

## Deux façons de le prouver

Panoplie et Publications font partie du fil rouge : ils portent des sujets d'actualité, nouveaux et porteurs (défense, géopolitique, quantique, robotique, nutraceutique). Ils montrent la polyvalence et la capacité à apprendre un domaine neuf avec la même exigence.

| Famille | Projets | Ce qu'elle montre |
|---|---|---|
| Cœur de métier | Probant, FinValStudio, Carbon&Co, KYB Graph | La maîtrise : les matières du master transformées en outils |
| Terrains d'actualité | Panoplie, Publications | L'agilité : « le master apprend une méthode, pas un secteur » |

Traduction dans la maquette :
- un repère « Cœur de métier » ou « Terrain d'actualité » sur chacune des six questions ;
- une étiquette « Terrain d'actualité » sur les panneaux Panoplie et Publications de l'accueil ;
- une section « Maîtriser un métier, et savoir apprendre un sujet neuf » sur la page « Le fil rouge ».

## Trois niveaux de lecture

| Niveau | Où | Temps de lecture | Contenu |
|---|---|---|---|
| 1 | Accueil, sur chaque panneau | 5 s | La question du projet + un lien « Pourquoi ces projets ? » |
| 2 | Page de chaque projet | 30 s | Bloc « Pourquoi ce projet » : la question, le lien avec le master, ce que le projet montre |
| 3 | Nouvelle page « Le fil rouge » | 1 min | L'accroche, Compter / Contrôler / Auditer, les six questions, la méthode commune |

## Les six questions (à valider)

| Projet | Question | Lien avec le master |
|---|---|---|
| Probant | Peut-on prouver qu'une comptabilité est fiable ? | Audit |
| FinValStudio | Combien vaut une entreprise, et avec quelle marge d'erreur ? | Finance d'entreprise |
| Carbon&Co | Comment rendre compte de ce qui ne se compte pas en euros ? | Reporting de durabilité |
| KYB Graph | Qui se trouve vraiment derrière une société ? | Droit des sociétés et audit |
| Panoplie | Que coûte réellement un système de défense ? | Contrôle de gestion, appliqué à un secteur d'actualité |
| Publications | Dans quel monde ces entreprises évoluent-elles ? | Méthode du mémoire, appliquée à des sujets neufs |

## Étapes

Chaque étape se termine par une vérification. On ne passe à la suivante que si elle est validée.

### Étape 0 — Valider les textes ✅ (17 nov. 2026)
- [x] L'accroche et la phrase d'introduction.
- [x] Les six questions, les six réponses, le lien avec le master.
- [x] Les trois règles de méthode (sourcé, reproductible, explicable).
- [x] Le message « maîtrise + agilité » et les deux familles de projets.
- Décisions : Carbon&Co reste dans « Cœur de métier » (4 + 2). Sous-titre des questions : « Chaque question mobilise une compétence du master… ». Lien master de Panoplie : « …hors des secteurs classiques : la même méthode d'analyse des coûts, appliquée à l'industrie de défense. »
- **Fini quand** : les textes français sont figés.

### Étape 1 — Figer la maquette ✅
- [x] Tags de droite alignés (colonnes fixes), plus de mot ou de `?` isolé à la ligne, micro-labels remontés à `#a8a399` (WCAG AA).
- [x] Section « Maîtriser un métier… » et les trois règles de méthode sous les six questions.
- [x] Adresse de la page : `/fil-rouge`.
- **Fini quand** : les trois planches sont validées.

### Étape 2 — Une seule source pour les textes ✅
- [x] `public/data/fil-rouge.json` : tous les textes, en français et en anglais (accroche, trois C, six projets, deux familles, trois règles).
- [x] `scripts/build-fil-rouge.mjs` (`npm run fil-rouge`) écrit les textes dans les pages et leurs traductions dans `i18n/en/`. `npm run fil-rouge -- --check` vérifie que rien n'a divergé.
- À relire à l'étape 4 : le champ `montre` (« ce que le projet montre ») des cinq projets autres que Probant a été rédigé après la maquette.
- **Fini quand** : un même texte n'est écrit qu'à un seul endroit.

### Étape 3 — Niveau 1 : l'accueil ✅ (sauf le lien d'en-tête)
- [x] La question de chaque projet est ajoutée à son panneau de `public/index.html`, en HTML simple (visible sans JavaScript).
- [ ] Lien « Pourquoi ces projets ? » dans l'en-tête : **reporté à l'étape 5**, une fois la page `/fil-rouge` créée (sinon le lien mènerait à une erreur 404). Le texte est déjà dans le JSON (`lien_page`).
- [x] L'alignement sur les diagonales, le survol et les diaporamas fonctionnent (contrôlés à 1100, 1280, 1366 et 1440 px de large, en français et en anglais).
- [x] Mobile : la hauteur minimale des panneaux passe de 460 à 640 px. Avec la question ajoutée, le panneau Publications a besoin d'environ 625 px ; en dessous, sa description était rognée sur les écrans courts (375×667).
- **Fini quand** : l'accueil s'affiche correctement sur ordinateur et à 375 px de large.

### Étape 4 — Niveau 2 : les pages projet
- [ ] Ajouter le bloc « Pourquoi ce projet » dans les six fichiers de `public/projets/`.
- **Fini quand** : les six pages affichent le bloc, avec la couleur du projet.

### Étape 5 — Niveau 3 : la page « Le fil rouge »
- [ ] Construire la page en HTML, CSS et JavaScript simples (aucune nouvelle dépendance).
- [ ] Animations : apparition du titre, trait qui se dessine, questions qui s'ouvrent, défilement automatique qui s'arrête au premier clic.
- [ ] Les animations se déclenchent quand la section entre à l'écran.
- **Fini quand** : la page fonctionne avec `npm run dev`.

### Étape 6 — Performance et accessibilité
- [ ] Mesurer Lighthouse avant et après : le score ne doit pas baisser.
- [ ] Animations limitées à l'opacité et au déplacement, coupées si « réduire les animations » est activé.
- [ ] Navigation complète au clavier, contraste suffisant sur les petits textes.
- [ ] Pas de troisième police téléchargée si la police monospace du système suffit.

### Étape 7 — Version anglaise
- [ ] Lancer `npm run en`.
- **Fini quand** : `/en/` affiche les trois niveaux sans texte français oublié.

### Étape 8 — Tests et mise en ligne
- [ ] Test Playwright : les questions s'ouvrent, les liens mènent au bon projet, aucune erreur dans la console, en FR et en EN, sur ordinateur et sur mobile.
- [ ] Branche `claude/laughing-dirac-uoxti8`, prévisualisation Vercel à relire.
- [ ] Pull request uniquement sur demande.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run fil-rouge` | écrit les textes de `public/data/fil-rouge.json` dans les pages et dans `i18n/en/` |
| `npm run fil-rouge -- --check` | vérifie que les pages sont à jour (code 1 sinon) |
| `npm run en` | régénère `public/en/` |
| `npm run dev` | sert le site sur http://localhost:3000 |

Ordre à suivre après une modification de texte : modifier le JSON, `npm run fil-rouge`, `npm run en`.

## Ordre conseillé

0 → 1 → 2 → 3 (mise en ligne possible dès cette étape) → 4 → 5 → 6 → 7 → 8.

L'étape 3 est la plus petite et la plus visible : elle répond déjà à « on ne comprend pas pourquoi ».
