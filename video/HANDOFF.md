# Où en est la vidéo (point de reprise)

État au 5 novembre 2026, branche `claude/cool-tesla-t1c4t5`. À lire pour reprendre le travail
dans une autre session, par exemple en local avec Claude Code.

## Ce qui est fait

- **v1** (45 s) livrée puis auditée. 24 problèmes confirmés, tous traités dans la v2.
- **v2** (81 s, 16:9 et 4:5) implémentée, intégrée et rendue (`npm run render` → `out/`) :
  - les réglages communs sont dans `src/sync.json` : 80 BPM (tempo réel du morceau, la v1 supposait
    106,67 à tort), drop à 21 s, 10 coups dans le break ;
  - l'acte 1 s'allume en plusieurs temps : gros plan sur le bouton, déclic, recul de la caméra, neige
    « bruit numérique » et « CH 03 ». Des panneaux en pixel art affichant les thèmes bordent la route.
    Le bug des palmiers est corrigé et la question du terminal reste entière pendant le zoom ;
  - l'acte 3 se découpe en plans de 3 s par mesure : titre, trois thèmes (ESG, audit et preuve, IA et
    robotique), cinq projets en deux temps (photo du site et problème, puis fonctions et vraie démo),
    publications en trois temps (« Lignes de force », les deux séries, le dossier robotique), carte de
    fin avec fondu au noir ;
  - la bande-son est fabriquée par `npm run soundtrack` : allumage avec bouton et souffle, break à
    80 BPM, mastering à environ −14 LUFS.

## Ce qui restait en cours

L'agent de correction du dernier audit de la v2 tournait au moment de la reprise. S'il n'a rien
commité après ce fichier, il reste ces 11 points (confirmés par un vérificateur indépendant) :

| Id | Où | Correction attendue |
|---|---|---|
| QA16-01 | Acte 3, phrase « problème » de chaque projet | Lisible environ 1,9 s seulement : la laisser plus longtemps avant de passer à la démo |
| QA16-02 | Publications, temps 3, 71–75 s | Les chiffres du dossier robotique finissent de compter trop tard (environ 1,4 s de lecture) : compter plus vite |
| QA16-03, P45-3 | Publications, temps 2 | « Banques centrales : le / retour du resserrement » : éviter la coupure après « le » |
| QA16-06 | 2,2–2,4 s | « CH 03 » coupé par le haut du cadre pendant le recul de la caméra |
| QA16-08 | FinValStudio | « 5 000 / tirages » : espace insécable entre le nombre et le nom |
| P45-1 | 4:5, 3,4–19,5 s | Le téléviseur paraît décentré : le panneau du bouton POWER sort du cadre |
| P45-2 | 4:5, Publications | Pendant les fondus entre les temps, les deux titres se superposent (5–6 images) |
| P45-4 | 4:5, thèmes | Coupure après « la » ; le texte « Audit & preuve » passe sur la photo chargée des archives |
| A2 | Break, 18,75–21 s | Le break faiblit sur sa seconde moitié : le faire monter jusqu'au drop |

## Ce qui attend Ludovic

- L'adresse de son profil LinkedIn : `CONTACT.linkedin` dans `src/content.ts`. La ligne est masquée
  tant qu'elle est vide.
- La musique de Phil Collins, prévue plus tard, pour un usage privé ou avec une licence. Il faudra
  mesurer son tempo et l'instant de son break, puis mettre à jour `music` et `bpm` dans
  `src/sync.json`, et lancer `npm run soundtrack`.

## Reprendre en local

```bash
git fetch origin claude/cool-tesla-t1c4t5
git checkout claude/cool-tesla-t1c4t5
cd video && npm install
npm run dev       # aperçu (Remotion Studio)
npm run render    # out/ludovic-labeaut-16x9.mp4 et out/ludovic-labeaut-4x5.mp4
```

Pour Claude Code en local, une consigne de reprise suffit : « Lis video/HANDOFF.md, corrige les points
restants, vérifie avec des images fixes, rends les deux formats, puis commite et pousse sur
claude/cool-tesla-t1c4t5. »
