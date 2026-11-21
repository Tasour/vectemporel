# Roadmap de migration — sphère plein écran

## P0 — Fondations (réversible) ✅ 2026-11-21

1. Écrire l'ADR-0004 (Three.js r152 local, abrogation partielle de l'ADR-0001). ✅
2. Archiver la version 2D sous `archive/v1-map-2d/`. ✅
3. Mettre à jour `ARCHITECTURE.md`, `CURRENT-STATE.md`, `RISKS.md`, scorecard. ✅
4. Copier `three.min.js` dans `public/` et documenter la licence MIT. ✅

**Sortie** : `arch.verify` vert, archives en place.

## P1 — Sphère

5. `src/globe/lonlat.js` : conversions pures et convention UV.
6. `src/globe/texture.js` : texture équirectangulaire depuis `FEATURES`.
7. `src/globe/globe.js` : scène, picking par raycast, inertie, étoiles, halo, caméra.

**Sortie** : la deep link `value=Berry` sélectionne Berry sur la sphère.

## P2 — HUD et expérience

8. Réécrire `index.html` et `styles.css` : canvas plein écran, HUD minimal.
9. Réécrire `src/app.js` : URL, recherche `/`, aide `?`, clavier, tactile, fiche de région.
10. Mettre à jour le service worker (cache de `three.min.js`).

**Sortie** : aucune barre ni panneau permanent ; 0 erreur console.

## P3 — Vérification et publication

11. Adapter `tests/e2e.mjs`, `test:perf`, `test:pwa`, `http-guards`.
12. `npm run check`, `arch.verify`, scorecard, `ui.guard`, captures 1440×900 / 390×844.
13. Commit `atlas`, repush `gh-pages`, contrôle HTTP et PWA du site publié.

**Sortie** : budget < 50 requêtes / < 1 Mo, site en 200, PWA hors ligne.

## Rollback

Restaurer `archive/v1-map-2d/` vers la racine, rétablir l'ADR-0001 comme référence de rendu, republier `gh-pages` depuis le commit précédent (`ea3527c`).
