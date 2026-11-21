# Roadmap de migration — carte mondiale minimale

## P0 — Fondations (réversible)

1. Écrire les ADR et ce dossier d'architecture. ✅ 2026-11-21
2. Étendre `scripts/import-chronas.mjs` : année 1000 complète + géométrie simplifiée → `src/data/chronas-map.js`.
3. Créer `archive/v0-atlas/` et y déplacer les 6 vues, lentilles, audits, scripts génération, captures et docs historiques.
4. Réduire `package.json`, `index.html`, `styles.css` au strict nécessaire.

**Sortie** : `npm run check` vert, snapshot < 1 Mo, aucune référence morte.

## P1 — Carte

5. `src/map/projection.js` (pur) + tests.
6. `src/map/renderer.js` : canvas, pan/zoom, couleurs par culture/religion, hit-testing au clic.
7. `src/app.js` : lecture de l'URL, panneau de détail, synchronisation du hash.
8. Supprimer l'ancien code de vue de `src/`.

**Sortie** : l'URL cible ouvre `Berry` en 1000 avec le panneau correspondant ; `test:e2e` dédié.

## P2 — Qualité et publication

9. Accessibilité clavier et live region, mouvement réduit.
10. PWA : cache du snapshot et du renderer, hors ligne.
11. `test:perf`, `ui.guard`, captures 1658×1150 / 390×844, `git diff --check`.
12. Push `atlas`, repush `gh-pages`, contrôle HTTP du site.

**Sortie** : `tools.arch.verify` vert, `tools.arch.scorecard` valide, `< 50` requêtes / `< 1 Mo`.

## Rollback

Restaurer `archive/v0-atlas/` vers la racine, rétablir `package.json` depuis l'historique Git, republier `gh-pages` depuis le commit précédent.
