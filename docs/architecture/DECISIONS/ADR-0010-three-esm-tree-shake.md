# ADR-0010 — Three.js r180 ESM tree-shaké

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : budget initial, zéro réseau au runtime, compatibilité navigateur, maintenabilité

## Contexte

Le rendu 3D utilisait Three.js r152 sous forme de script UMD global (`public/three.min.js`, 633 338 o / 157 032 o gzip). Ce build est déprécié depuis r150 et émet un `console.warn`. L'utilisateur a demandé une revue de stack ; la mesure montre que le moteur n'est pas le goulot (16 741 triangles, ~7 draw calls), mais que la livraison du moteur peut être modernisée et réduite.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — Garder UMD r152 | Aucun changement | Dépréciation, global `window.THREE`, 157 Ko gzip | Nul | Élevée |
| B — ESM r180 sans bundler | API moderne, plus de warning | 2 fichiers, 179 Ko gzip (module + core) | Faible | Élevée |
| C — ESM r180 + esbuild tree-shaking | API moderne, imports explicites, 126 Ko gzip | DevDependency esbuild + étape de build | Moyen | Élevée |
| D — WebGL2 maison | Taille minimale théorique | Très coûteux à maintenir | Élevé | Faible |

## Décision

Option C — Three.js r180, exports utilisés listés dans `scripts/three-entry.js`, bundle local généré par `scripts/build-three.mjs` vers `public/three-bundle.js`. L'adaptateur `src/globe/three.js` remplace le global `THREE`. Mesure : 126 572 o gzip contre 157 032 o pour l'UMD r152, soit ~30 Ko gagnés.

## Conséquences

- Positives : suppression du warning de dépréciation, -30 Ko gzip, imports explicites, licence MIT conservée.
- Négatives acceptées : esbuild en devDependency, bundle généré à committer, rebuild nécessaire si la liste d'exports change.
- À surveiller : compatibilité des API r180, contenu du bundle après montée de version.

## Preuves

- `node scripts/build-three.mjs` → 491 Ko brut, 126 Ko gzip.
- Ancien UMD : 633 338 o brut, 157 045 o gzip.
- `tests/e2e.mjs` : scène complète et budget vérifiés.

## Révision

0010
