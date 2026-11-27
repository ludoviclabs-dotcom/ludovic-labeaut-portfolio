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

### Étape 3 — Niveau 1 : l'accueil ✅
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

### Étape 7 — Version anglaise ✅
- [x] Relecture de tous les textes anglais du JSON (23 corrections), en anglais britannique comme le reste du site :
  - « Master's » pour le diplôme (« Link to the Master's », « the Master's subjects ») ;
  - familles : « Core expertise » et « Topical field » ;
  - accroche : « A figure is only worth something if it can be proven. » ;
  - vocabulaire déjà employé sur le site repris : « FEC general-ledger file », « audit-ready evidence file » ;
  - intitulés de matières : « Advanced financial analysis », « Lectures and methodology ».
- [x] `npm run en` : 33 pages anglaises, aucune traduction manquante.
- [x] Contrôle automatique : aucun texte français dans les blocs « fil rouge » des pages anglaises (accueil, `/en/fil-rouge`, six pages projet) ; `lang="en"`, liens vers `/en/…`.
- [x] Mise en page contrôlée avec les textes anglais (plus longs) : aucun débordement, de 360 à 1440 px.
- **Fini quand** : `/en/` affiche les trois niveaux sans texte français oublié.

### Étape 8 — Tests et mise en ligne
- [x] `npm test` (`scripts/test-fil-rouge.mjs`), sans nouvelle dépendance : 63 contrôles en FR et EN, environ 1 min 30.
  - Fichiers : pages à jour par rapport au JSON, pages anglaises régénérées, liens internes valides.
  - Navigateur (si Playwright est installé ; sinon ces contrôles sont ignorés et le message le dit) : enchaînement des questions, Pause, clic, Entrée, réponses fermées hors du parcours clavier, contenu apparu au défilement, « réduire les animations », sans JavaScript, décalage de mise en page, débordements (375 à 1440 px), descriptions mobiles non rognées, bloc et lien sur les six pages projet, erreurs de console.
  - Vérifié : une modification du JSON non régénérée fait bien échouer les tests.
- [x] README : section « Le fil rouge » (comment modifier un texte) et fichiers ajoutés.
- [x] Branche `claude/laughing-dirac-uoxti8` poussée.
- [x] Prévisualisation remplacée par un contrôle en production après fusion (PR #18) ; ancien point : : les adresses `*.vercel.app` sont bloquées par le réseau de la session de travail, elle n'a pas pu l'ouvrir. À vérifier : l'adresse `/fil-rouge` (sans `.html`), les animations, le lien de l'accueil, et un Lighthouse sur la prévisualisation.
- [x] Pull request ludoviclabs-dotcom/ludovic-labeaut-portfolio#18, fusionnée.
- [x] Hors projet, demandé ensuite : liens `hreflang` en adresses complètes sur le domaine de production `https://l-labs-portfolio.vercel.app` (défini une seule fois dans `scripts/site.mjs`).
  - 32 pages françaises (96 liens) et leurs versions anglaises ; générateurs mis à jour (`import-articles.mjs`, `import-photos.mjs`, `build-fil-rouge.mjs`) pour qu'une régénération garde la correction.
  - `lang.js` ne garde que le chemin de ces liens : la langue retenue redirige toujours sur le site consulté (prévisualisation, local), jamais vers la production. Contrôle ajouté à `npm test` (64 contrôles).
  - Lighthouse SEO : 90 → 100 (accueil, `/fil-rouge`, Probant, publications, en français et en anglais).

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

---

# Refonte éditoriale de /fil-rouge

Objectif : retirer tout effet « IA générative » et atteindre une rigueur éditoriale-financière
(références : Financial Times, Stripe Press, Linear).

## Étape 1 — Direction artistique et nettoyage éditorial ✅

- **Thème clair limité à la page** : `html.fr-page` (posé par le générateur) porte les variables
  (papier `#F6F7F9`, surface `#FFFFFF`, filet `#E2E6EC`, encre `#111418`, corps `#4A5568`,
  métadonnées `#6B7280`, Prusse `#16324F` pour le cœur de métier, Ocre `#A84B20` pour les terrains
  d'actualité et le fil rouge) et redéfinit celles de `project.css` : barre du haut et bouton final
  passent en clair sans modifier `project.css`. Accueil et pages projet inchangés (contrôlé par `npm test`).
- **Polices** : Newsreader (titres, taille optique fixe 36 ; italique sur un seul mot par grand titre,
  noté `*mot*` dans le JSON) et Source Sans 3 (texte, interface, chiffres tabulaires). Plus de
  Cormorant Garamond ni d'Inter sur cette page. Polices de secours calées (`size-adjust`) et largeurs
  en em : aucun décalage à l'arrivée des polices.
- **Contenu** :
  - triptyque C/C/A remplacé par la chaîne `Question métier / Norme` → `Pipeline de traitement` → `Livrable opposable` ;
  - six fiches ouvertes à trois champs : *Ce que fait l'outil* (entrées, contrôles, sorties, repris des
    étapes publiées sur chaque page projet), *Exigence CCA mobilisée*, *UE du Master* (UE1 à UE7 du DSCG) ;
  - règles « Sourcé / Reproductible / Explicable » remplacées par un colophon des référentiels.
- **Colophon, zéro hallucination** : IFRS retiré (IFRS 16 n'apparaît dans aucune page de Probant) ;
  AMF retiré (non documenté pour FinValStudio) ; aucune source nommée de KYB Graph ou de Panoplie dans
  le dépôt, d'où la formule « registres publics d'entreprises, listes de sanctions et sources ouvertes
  documentées ». Les identifiants de textes (ANC 2014-03, NEP 500, LPF art. A47 A-1, BOI-CF-IOR-60-40,
  règlement délégué (UE) 2023/2772, CMF art. L.561-5, règlement (UE) 2024/1624) ne figurent pas sur les
  pages projet : à garder sous relecture.
- **Supprimés** : défilement automatique, Pause / Reprendre, accordéon, titre mot à mot, apparitions au
  défilement, `public/assets/js/fil-rouge.js` (un script léger reviendra à l'étape 2).
- **Mesures** (local, médiane de 3) : Lighthouse mobile 92 (ancienne page 96), ordinateur 99,
  accessibilité, bonnes pratiques et SEO 100 ; CLS 0,001 même avec polices retardées de 1,5 s ;
  poids total 124 Ko (ancienne page 141 Ko). `npm test` : 63 contrôles.

## Étape 2 — Vue partagée « Dossier de preuve » ✅

- **Une seule structure HTML, trois présentations** (`public/assets/js/fil-rouge.js`, vanilla, `// @ts-check`) :
  - ≥ 1024 px : vue partagée 42 % / 58 %. À gauche, filtre segmenté (`Tous (6)` · `Cœur de métier (4)` ·
    `Terrain d'actualité (2)`, filet actif Prusse) et liste des six questions en onglets (`role="tablist"`,
    `aria-selected`, onglet actif sur fond blanc avec filet gauche de 2 px Prusse ou Ocre). À droite, panneau
    collant (`position: sticky`, 1,5 rem du haut), fond blanc, filet 1 px, sans ombre : numéro, nom, catégorie,
    zone du schéma, trois champs, lien vers le projet (flèche décalée de 3 px au survol) ;
  - < 1024 px : accordéon manuel, première fiche ouverte, sans défilement automatique ;
  - sans JavaScript : les six fiches ouvertes l'une sous l'autre.
- **Clavier** : flèches haut et bas (en boucle), Début, Fin ; anneau de focus Prusse. Les liens `#fiche-…`
  de la page (familles) ouvrent la fiche dans le panneau.
- **Transition** : fondu (opacité + 6 px) en 220 ms, courbe `cubic-bezier(0.22, 1, 0.36, 1)` ; coupée avec
  « réduire les animations ».
- **Zone du schéma** : `<div class="fr-blueprint" data-blueprint="<id>">` (240 px, fond papier, filet),
  libellé « Schéma du pipeline en préparation ». C'est le point de montage du composant de l'étape 3.
- Fiches en `<div>` (et non `<li>`) : `role="tabpanel"` n'est pas permis sur un élément de liste.
- Typographie : traits d'union insécables dans les références (A‑1, L.561‑5, BOI‑CF‑IOR‑60‑40, SHA‑256),
  appliqués au texte seulement, pas aux balises.
- **Vérifications** : `npm run typecheck` (TypeScript 5.6, `--strict --checkJs`) : 0 erreur ; `npm test` :
  87 contrôles ; Lighthouse ordinateur 99 et mobile 92 à 100 selon les mesures, accessibilité, bonnes
  pratiques et SEO 100, CLS 0,001.

## Étape 3 — Schémas des projets ✅

- **Composant** : `scripts/blueprints.mjs` (l'équivalent statique de `ProjectBlueprint`). Une fonction par
  projet, sur des briques communes (trait, tracé, boîte, texte, zone sensible, infobulle). Le générateur
  insère chaque SVG dans la zone `data-blueprint` de sa fiche ; les libellés FR et EN sont sous la clé
  `schemas` de `public/data/fil-rouge.json` et passent par `build-en` comme le reste de la page.
- **Règles** : viewBox `0 0 520 220`, traits de 1,25 (bandes de flux de Carbon&Co : 3), Source Sans 3 en
  chiffres tabulaires, palette `#CBD5E1` / `#111418` / `#4A5568` / `#16324F` / `#A84B20`, ni dégradé ni ombre.
- **Six schémas** :
  1. Probant : FEC (.txt) → Équilibre, Benford, Cut-off → Dossier de preuve ; anomalie ocre sur la branche
     Benford, règle de contrôle au survol ou au focus.
  2. FinValStudio : fourchettes DCF et multiples EV/EBITDA sous une distribution Monte Carlo ; repères P10,
     médiane, P90 expliqués au survol ; dispersion P10–P90 en ocre. Aucun montant.
  3. Carbon&Co : Scopes 1, 2, 3 → tCO₂e → ESRS E1 et VSME ; piste d'audit en ocre.
  4. KYB Graph : Société → Holding → UBO, liens Juridiction et Sanctions ; le survol d'un lien l'épaissit et
     affiche son niveau de preuve (« Confirmé · registre officiel » ou « Déclaré · déclaratif »).
  5. Panoplie : coût complet en quatre segments (R&D, Acquisition, MCO, Dépendances critiques en ocre),
     échelle 0 à 75 %. Parts 20 / 30 / 35 / 15 **illustratives**, signalées sur le schéma.
  6. Publications : grille des huit blocs par date, **calculée à partir de `public/publications/index.html`**
     (23 notes les 26/09, 08/10 et 31/10/2026 ; 3 dossiers les 14/10, 09/11 et 10/11/2026).
- **Animation** : tracé progressif (`stroke-dashoffset`, `pathLength="1"`), 450 ms par trait, courbe
  `cubic-bezier(0.22, 1, 0.36, 1)`, décalage de 90 ms par rang ; déclenché à l'entrée à l'écran puis à chaque
  réaffichage de la fiche ; coupé avec « réduire les animations » et absent sans JavaScript.
- **Accessibilité** : chaque schéma est un groupe nommé ; les zones sensibles sont atteignables au clavier
  et portent leur texte en `aria-label`. Sous 480 px de large, le schéma garde sa taille et son cadre
  défile horizontalement.
- **À relire (contenu)** : Équilibre et Benford ne figurent pas sur la page de Probant (qui cite doublons,
  hors période, séquence rompue) ; VSME ne figure pas sur celle de Carbon&Co ; EV/EBITDA ne figure pas sur
  celle de FinValStudio ; l'attribution des niveaux de preuve aux liens de KYB Graph est un exemple.
- **Vérifications** : `npm test` 95 contrôles (dont, en FR et en EN : aucun texte hors cadre, hors de sa boîte
  ou de son infobulle, aucun chevauchement, palette et épaisseurs conformes, animation, survols) ;
  `npm run typecheck` 0 erreur ; Lighthouse ordinateur 99, mobile 90, accessibilité 100, CLS 0,001.

## Étape 4 — Signatures de la page et recette finale ✅

- **Le fil rouge au défilement** (≥ 1024 px, masqué en dessous) : tracé ocre de 1,5 px dans la marge gauche.
  Il part de l'accroche, passe par un repère à la section des fiches puis à celle des familles, et
  s'accroche au colophon. `fil-rouge.js` règle `stroke-dashoffset` d'après la position de défilement :
  la pointe du fil reste à 60 % de la hauteur de l'écran, avec une écriture de style au plus par image
  (`requestAnimationFrame`, écouteur passif). Le tracé est recalculé quand la page change de hauteur.
- **Matrice de traçabilité UE × projets**, au-dessus du colophon : six pôles d'enseignement en lignes,
  six projets en colonnes, disque plein Prusse (compétence principale) ou anneau ocre (transversale).
  Survol ou focus d'une ligne, d'une colonne ou d'un marqueur : le reste s'estompe à 0,35 et les preuves
  correspondantes s'affichent sous le tableau. Un clic sur un projet ouvre sa fiche dans la vue partagée.
  Sans JavaScript, les douze preuves sont listées. Données : clé `matrice` de `fil-rouge.json`.
  Les six marqueurs principaux reprennent les matières validées à l'étape 0 ; les six transversaux sont
  une **proposition à valider**, chacun appuyé sur un élément de la fiche du projet.
- **Filets de section** : un filet de 1 px ouvre chaque section, tracé de gauche à droite en 350 ms à son
  entrée à l'écran, une seule fois.
- **Mouvement réduit** : fil entièrement tracé, filets et schémas affichés dans leur état final, aucune
  transition (contrôlé par `npm test`).
- **Parité FR / EN** : `npm run en` ne signale aucun segment sans traduction ; le test de parité du JSON et
  le contrôle des textes coupés (matrice, schémas) passent dans les deux langues.
- **Défaut corrigé pendant la recette** : sur mobile, les libellés masqués des cases de la matrice
  élargissaient la page (696 px au lieu de 375) ; le cadre du tableau est maintenant leur bloc de référence.
- **Commande de vérification** : `npm run check` (pages à jour, types, tests). Le dépôt n'a ni Next.js, ni
  ESLint, ni `npm run build` ; un script nommé `build` serait lancé par Vercel à chaque déploiement.
- **Résultat** : `npm run check` réussi ; `npm run typecheck` 0 erreur ; `npm test` 117 contrôles ;
  Lighthouse ordinateur 99, mobile 90 à 93, accessibilité, bonnes pratiques et SEO 100, CLS 0,001.
