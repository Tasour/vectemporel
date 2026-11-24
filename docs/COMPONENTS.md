# Inventaire des composants

Tous les composants sont locaux, sans bibliothèque d'interface.

| Composant | Fichier | Responsabilité |
|---|---|---|
| `createGlobe` | `src/globe/globe.js` | scène Three.js, rAF unique, picking, arcs, ombre |
| `createProvinceMesh` | `src/globe/vector-provinces.js` | maillage vectoriel des contours |
| `createLabelRenderer` | `src/globe/labels.js` | libellés projetés et anti-collision |
| `createEpicTimeline` | `src/timeline/epics.js` | 560 épiques, filtre par catégorie |
| `createTrailPlayer` | `src/story/trails.js` | lecteur de récits pur |
| `createLearnPanel` | `src/learning/learn-ui.js` | cinq défis locaux et profil |
| `createHistomap` | `src/histomap/stream.js` | streamgraph D3 et table miroir |
| `createHistomap` (callback) | `src/app.js` | liaison famille → récit |
| `hud-overlay` | `styles.css` | base commune des panneaux |
| `hm-btn`, `learn-option`, `trail-item` | `styles.css` | boutons 44 px cohérents |
| `panel-indicator` | `styles.css` | indicateur de panneau via `:has()` |
| `budget-widget` | `src/app.js` | mesure sous `?devtools=1` uniquement |

## Règles

- Un composant qui détient une ressource (rAF, observer, listener global) expose un `destroy()`.
- Aucun composant n'appelle `fetch` vers une origine externe.
- Les états sont dans `window.VATLAS.getState()` pour les tests ; aucune autre API globale.
