# Synthèse globale — les 5 vues à 100 lentilles

Chaque vue possède son propre hub : `CHRONOLOGIE/`, `RECIT/`, `GEOGRAPHIE/`, `CONSTELLATION/`, `POINTS/`.

Chaque vue : **100 sous-agents**, **100 modules dédiés**, **10 chantiers chacun** = **1 000 chantiers**.
Total : **500 sous-agents**, **5 000 chantiers**.

| Vue | Modules | Rapports | Synthèse |
| --- | --- | --- | --- |
| Chronologie | 100 | 100 | `CHRONOLOGIE/SYNTHESE.md` |
| Récit | 100 | 100 | `RECIT/SYNTHESE.md` |
| Géographie | 100 | 100 | `GEOGRAPHIE/SYNTHESE.md` |
| Constellation | 100 | 100 | `CONSTELLATION/SYNTHESE.md` |
| Points | 100 | 100 | `POINTS/SYNTHESE.md` |

## Correctifs maître appliqués en cours de vague

- Nommage `E01.js` vs imports `E001.js` : ponts d'import créés automatiquement (cache ESM → un seul `register`).
- `_diagnostics.js` : motif étendu à 2 et 3 chiffres, casse-insensible.
- Imports erronés corrigés : `geography/E003.js` et `points/E038.js` (`../../domain/store.js`).
- `geography/E037.js` : signe ASCII dans l'attribut SVG `rotate`.
- Contrat de non-collision préservé : un seul fichier par lentille, CSS via `ctx.css`, IDs uniques, zéro console/réseau/aléa.
- E23 (Chronologie) finalisé en maître après trois blocages fournisseur.
- Les coordinateurs ont activé `experimental.subagent_depth` dans `~/.config/opencode/opencode.json` pour permettre les sous-agents imbriqués (paramètre conservé).

## Validation finale

`npm run check` rejoué à froid : **tout PASS**, 16/16 E2E, 0 erreur console.
