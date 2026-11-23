# Sources — référence Histography

Date d'accès : 2026-11-23. L'utilisateur a explicitement autorisé la reprise du code et pris le risque légal à sa charge ; aucun contournement ni licence supposée n'est invoqué ici.

| Fichier | URL source | SHA-256 d'origine | SHA-256 archivé (appels distants retirés) |
|---|---|---|---|
| `script.js` | https://histography.io/script.js | `bf7cff83b510bd6b4ed1b33a2c9a342bf27b327972a23ee7c34b8efd65b7e88b` | `46b96bfe1a3c0b29fb3437df53266a3f8a1e5ffbadbe219281a4287a8f83c681` |
| `style.css` | https://histography.io/style.css | `92d81eaf9319359e1acdeeaf5d605bfc49d031071458cd031b00389c381dc370` | identique |
| `plugins.js` | https://histography.io/plugins.js | `19c2849596dafbb5fafd85237b63f6cdfc24a9a8a7db9de52114d9dbad4923e0` | `fc9d013952419bc015d8defba4f3b67cc71fb60cd2b044a39663df5928272a46` |
| `favicon.png` | https://histography.io/svg/favicon.png | `54309784443c614c8c5666617755ee801334e80a4acd8839bbd0ba1ffb88e7c2` | identique |

## Vérifications

- Le moteur graphique est **PixiJS** (`new PIXI.Sprite`), embarqué dans `plugins.js`. Il n'y a **aucune occurrence de `THREE`** dans `script.js`.
- Aucun dépôt source public n'est disponible : le dépôt de l'auteur (`matanstau/histography`) est vide.
- Retraits appliqués aux copies archivées, uniquement pour le fonctionnement hors ligne :
  - appel `google-analytics.com/analytics.js` et `ga(...)` dans `script.js` ;
  - script distant `hello.myfonts.net/count/2f45a7` dans `plugins.js`.
- Aucun appel réseau ne subsiste dans les copies archivées (`grep` à zéro occurrence).
- `int.js` (1,6 Mo de données historiques) n'est pas archivé : le mode sujet utilise des articles Wikipédia locaux.
