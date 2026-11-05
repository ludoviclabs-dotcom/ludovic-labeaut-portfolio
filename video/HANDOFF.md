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

## Dernier état

Les 11 points du dernier audit sont corrigés et la v2 est rendue (2 430 images, 81 s, deux formats).
Les mesures sont dans les messages de commit. Restent à valider à l'oreille : le déclic, la neige
et le break (ils n'ont été vérifiés que par mesure).

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
