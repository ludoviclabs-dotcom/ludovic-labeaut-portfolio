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

### Étape 0 — Valider les textes
- [ ] L'accroche et la phrase d'introduction.
- [ ] Les six questions, les six réponses, le lien avec le master.
- [ ] Les trois règles de méthode (sourcé, reproductible, explicable).
- [ ] Le message « maîtrise + agilité » et les deux familles de projets.
- **Fini quand** : les textes français sont figés.

### Étape 1 — Figer la maquette
- [ ] Ajuster les trois planches selon les retours.
- [ ] Choisir le nom et l'adresse de la page (proposition : `/fil-rouge`).
- **Fini quand** : les trois planches sont validées.

### Étape 2 — Une seule source pour les textes
- [ ] Créer `public/data/fil-rouge.json` : six entrées (question, réponse, lien, matières, couleur).
- [ ] Ajouter la traduction dans `i18n/en/`.
- **Fini quand** : un même texte n'est écrit qu'à un seul endroit.

### Étape 3 — Niveau 1 : l'accueil
- [ ] Ajouter la question dans chaque panneau de `public/index.html`, en HTML simple.
- [ ] Ajouter le lien « Pourquoi ces projets ? » dans l'en-tête.
- [ ] Vérifier que l'alignement sur les diagonales et les diaporamas ne bougent pas.
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

## Ordre conseillé

0 → 1 → 2 → 3 (mise en ligne possible dès cette étape) → 4 → 5 → 6 → 7 → 8.

L'étape 3 est la plus petite et la plus visible : elle répond déjà à « on ne comprend pas pourquoi ».
