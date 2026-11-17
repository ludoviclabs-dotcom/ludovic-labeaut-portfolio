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
- [x] Lien « Pourquoi ces projets ? » dans l'en-tête : ajouté à l'étape 5, avec la page `/fil-rouge`.
- [x] L'alignement sur les diagonales, le survol et les diaporamas fonctionnent (contrôlés à 1100, 1280, 1366 et 1440 px de large, en français et en anglais).
- [x] Mobile : la hauteur minimale des panneaux passe de 460 à 640 px. Avec la question ajoutée, le panneau Publications a besoin d'environ 625 px ; en dessous, sa description était rognée sur les écrans courts (375×667).
- **Fini quand** : l'accueil s'affiche correctement sur ordinateur et à 375 px de large.

### Étape 4 — Niveau 2 : les pages projet ✅
- [x] Bloc « Pourquoi ce projet » dans les six fichiers de `public/projets/` (et leurs versions anglaises), écrit par `npm run fil-rouge`.
- Contenu : l'étiquette de famille (Cœur de métier / Terrain d'actualité), la question, le lien avec le master, ce que le projet montre.
- Emplacement : après la démonstration (et après les planches de Panoplie), juste avant « Ouvrir l'application ». La vidéo reste ainsi visible dès l'arrivée sur la page.
- Style dans `public/assets/css/project.css` : filet et titre dans la couleur du projet, trois colonnes sur ordinateur, une seule sur mobile.
- Contrôlé à 390 et 1440 px de large, en français et en anglais : aucun débordement, aucune erreur dans la console.
- [x] Lien « Lire le fil rouge » vers `/fil-rouge` : ajouté à l'étape 5.
- **Fini quand** : les six pages affichent le bloc, avec la couleur du projet.

### Étape 5 — Niveau 3 : la page « Le fil rouge » ✅
- [x] `public/fil-rouge.html` (adresse `/fil-rouge`, et `/en/fil-rouge`), **entièrement générée** par `npm run fil-rouge` : ne pas la modifier à la main. Style dans `public/assets/css/fil-rouge.css`, comportement dans `public/assets/js/fil-rouge.js`. Aucune nouvelle dépendance, aucune police en plus.
- [x] Contenu : accroche et Compter / Contrôler / Auditer ; les six questions (ordre : `questions.ordre` du JSON) ; les deux familles avec leurs projets ; les trois règles de méthode ; retour aux six projets.
- [x] Animations : titre révélé mot à mot, filet qui se trace, sections qui entrent au défilement, séparateur des familles qui se trace.
- [x] Questions : une seule ouverte à la fois ; elles s'ouvrent l'une après l'autre (7 s, barre de progression dans la couleur du projet). Le défilement s'arrête au premier clic ou dès que le clavier entre dans la liste, se met en pause hors écran et au survol, et un bouton Pause / Reprendre le contrôle (critère WCAG 2.2.2).
- [x] Une réponse fermée est retirée du parcours clavier et des lecteurs d'écran. Exception assumée à la règle « opacité et déplacement seulement » : la hauteur de la réponse s'anime à l'ouverture.
- [x] Sans JavaScript : tout est visible, toutes les réponses sont ouvertes. Si `fil-rouge.js` ne démarre pas dans les 2,5 s, les animations sont annulées et tout s'affiche.
- [x] « Réduire les animations » : ni entrée animée, ni défilement automatique (le bouton Pause est alors masqué).
- [x] Accueil : pastille « Pourquoi ces projets ? » dans la barre du haut. Entre 821 et 1180 px de large, le compteur décoratif « 06 projets » est masqué, le nom passe au-dessus du métier et les boutons vont à la ligne, sinon la barre débordait.
- [x] Pages projet : lien « Lire le fil rouge » sous le bloc « Pourquoi ce projet ».
- Contrôlé (navigateur réel) : défilement automatique, Pause, clic, clavier, mouvement réduit, sans JavaScript ; 375 et 1440 px, en français et en anglais ; barre de l'accueil de 360 à 1440 px. Aucune erreur dans la console, aucun débordement horizontal.
- **Fini quand** : la page fonctionne avec `npm run dev`.

### Étape 6 — Performance et accessibilité ✅
- [x] Lighthouse avant (branche `main`) et après, en local, médiane de 3 mesures :

  | Page | Mobile perf. (avant → après) | Ordinateur perf. | Accessibilité | Bonnes pratiques | SEO |
  |---|---|---|---|---|---|
  | Accueil | 91 → 90 (écart de mesure) | 99 → 99 | 100 → 100 | 100 | 90 → 90 |
  | Probant | 75 → 75 | 98 → 98 | 100 → 100 | 100 | 90 → 90 |
  | `/fil-rouge` (FR et EN) | 96 (nouvelle) | 99 | 100 | 100 | 90 |

  Poids : +4 Ko sur l'accueil et les pages projet ; la page `/fil-rouge` pèse 141 Ko au total.
- [x] Décalage de mise en page (CLS) de `/fil-rouge` : 0,07 → 0. Le titre était découpé mot à mot avant l'arrivée de la police et les mots changeaient de ligne ; il est maintenant découpé une fois la police chargée (1,5 s au plus), masqué en opacité jusque-là.
- [x] Animations limitées à l'opacité et au déplacement (sauf la hauteur d'une réponse qui s'ouvre), coupées avec « réduire les animations ».
- [x] Navigation au clavier, contraste (audit Lighthouse à 100), réponses fermées retirées du parcours clavier.
- [x] Aucune police ajoutée.
- Constat **antérieur au projet**, non corrigé : SEO à 90 sur toutes les pages, car les liens `<link rel="alternate" hreflang>` utilisent des adresses relatives (`/projets/probant`) alors que Google attend des adresses complètes (`https://…/projets/probant`). La correction demande de connaître le domaine de production ; elle touche toutes les pages.
- Mesures faites sur un serveur local sans compression : à refaire sur la prévisualisation Vercel à l'étape 8.

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
