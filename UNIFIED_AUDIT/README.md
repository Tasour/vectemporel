# Vectemporel unifié — audit des vues (V1 + Atlas)

Hub de coordination pour l'audit parallèle de **toutes les vues** de Vectemporel,
traité comme **une seule et unique application** (V1 POC + Atlas V-ATLAS).

- V1 : `/home/tasour/Projects/vectemporel`
- Atlas : `/home/tasour/Projects/vectemporel-atlas`

Chaque vue possède **un sous-agent expert**, un rapport de **10 chantiers**, et
implémente **les 10 chantiers** dans ses propres fichiers. L'agent maître
synchronise les avancées dans `SYNTHESE.md`.

## Vues et propriétaires

| ID | Vue | Version | Agent | Fichiers possédés |
| --- | --- | --- | --- | --- |
| `v1-monde-3d` | Monde 3D / Plan | V1 | ux-accessibilite | `globe-engine.js`, `plan.js` |
| `v1-systeme-solaire` | Système solaire | V1 | ux-accessibilite | `solar.js` |
| `v1-recit` | Récit (périodes/panorama/lieux) | V1 | pedagogue | `story.js`, `satellite-map.js` |
| `v1-dragon` | Dragon (canevas zoomable) | V1 | ux-accessibilite | `dragon.js` |
| `v1-frise` | Frise chronologique | V1 | indexeur-semantique | `app.js` (zone frise) |
| `v1-fiche-detaillee` | Fiche détaillée | V1 | general | `app.js` (zone fiche) |
| `v1-lecteur` | Lecteur de source | V1 | pedagogue | `app.js` (zone lecteur/recherche), `server.mjs` |
| `atlas-globe` | Globe | Atlas | ux-accessibilite | `src/views/globe.js` |
| `atlas-chronologie` | Chronologie | Atlas | indexeur-semantique | `src/views/chronology.js` |
| `atlas-recit` | Récit guidé | Atlas | pedagogue | `src/views/recit.js` |
| `atlas-geographie` | Géographie | Atlas | indexeur-semantique | `src/views/geography.js` |
| `atlas-constellation` | Constellation | Atlas | general | `src/views/constellation.js` |
| `atlas-coque-navigation` | Coque, état, clavier | Atlas | ux-accessibilite | `src/ui/shell.js`, `src/domain/store.js`, `src/platform/keyboard.js` |

## Rapports

`views/<id>.md` — 10 chantiers structurés, statut d'implémentation, vérifications.

## Règles de non-collision

- Un sous-agent ne modifie que ses fichiers possédés.
- `app.js` de V1 est partagé par trois vues : edits avec ancres uniques, relecture avant chaque modification.
- `styles.css` : ajout d'un bloc signalé en fin de fichier, aucune suppression de règles existantes.
- Aucune donnée historique inventée, aucune commande Git.
