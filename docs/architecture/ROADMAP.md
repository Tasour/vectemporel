# Roadmap — plan de features ordonné

Un push est effectué à la fin de chaque phase P*.

## P0 — Fondations ✅ 2026-11-21

- F01 ADR-0005 (timeline chunks locaux) ✅
- F02 ADR-0006 (4096×2048 + rotation manuelle) ✅
- F03 Documents d'architecture et scorecard ✅
- F04 Archive `archive/v2-globe-1year/` ✅

**Rollback** : restaurer l'archive v2.

## P1 — Données 4 001 ans ✅

- F05 Importeur borné et reprenable (−2000→2000) ✅
- F06 Géométrie partagée ✅
- F07 Deltes annuels par siècle (41 chunks) ✅
- F08 `year-store.js` (LRU, abort, debounce) ✅
- F09 Intégrité `getYear(1000)` == snapshot actuel ✅

## P2 — Rendu haute définition ✅

- F10 Texture 4096×2048, sphère 192×128, anisotropie 16 ✅ (amendé par P6/F35)
- F11 Repli mémoire mobile ✅
- F12 Contours et survol ✅
- F13 Rotation manuelle (bouton, suppression de l'auto) ✅
- F14 Redraw par année ✅ (redirection vers le maillage vectoriel en P6)

## P3 — Timeline ✅

- F15 Curseur −2000→2000 ✅
- F16 Saisie directe de l'année ✅
- F17 Sauts de siècle + bandes d'époques ✅
- F18 Autoplay manuel ✅
- F19 États de chargement ✅
- F20 Deep-link `year=` ✅ (pos borné à zoom 6 en P6/F36)

## P4 — Features Chronas complémentaires ✅ (partiel)

- F21 5 dimensions de couleur ✅
- F22 Modes de libellés — reporté
- F23 Marqueurs locaux (4 662 capitales) ✅
- F24 Tooltip riche ✅
- F25 Fiche enrichie + lien Wikipédia externe ✅
- F26 Recherche enrichie — déjà présente, conservée ✅
- F27 Épiques locaux — reporté
- F28 Préférences locales (thème persistant) ✅

Les features F22 et F27 sont reportées : elles demandent un import supplémentaire d'épiques et un travail de libellés non prioritaire dans cette livraison. Aucune partie du plan n'est abandonnée sans traçabilité.

## P5 — Qualité et publication

- F29 E2E timeline
- F30 Perf/PWA étendus
- F31 Preuves visuelles
- F32 Publication `atlas` + `gh-pages`

## P6 — Netteté vectorielle ✅ 2026-11-21

- F33 ADR-0007 (maillage vectoriel + zoom 6) ✅
- F34 Module `vector-provinces.js` (16 741 triangles, 44 ms) ✅
- F35 Intégration globe + texture réduite à 2048×1024 ✅
- F36 Borne de zoom 6 (`clampView`, molette, pincement, deep-link) ✅
- F37 Test vectoriel, e2e, captures zoom 6, publication ✅

**Rollback** : restaurer la texture 4096×2048 et le zoom 8 depuis `archive/v2-globe-1year/`.

## P7 — Finition visuelle ✅ 2026-11-21

- F38 Marqueurs ronds (sprite disque local, taille fixe en pixels, zéro carré) ✅
- F39 Filtrage des capitales par année (344 → 210 marqueurs en 1000) ✅
- F40 Message de chargement différé de 800 ms (plus de flash) ✅
- F41 Tests e2e, captures zoom 6, publication ✅

**Rollback** : restaurer `PointsMaterial` nu, le filtre complet et le message immédiat depuis le commit `b4f4525`.

## P8 — Cache busting automatique ✅ 2026-11-21

- Hash SHA-256 de tous les fichiers publiés calculé par `build-pages.mjs`.
- Nom du cache SW et URLs des assets versionnés par ce hash.
- Anciens caches supprimés à l'activation ; fetch réseau en `cache: 'reload'`.
- Rechargement unique de la page quand un nouveau SW prend le contrôle.

**Rollback** : restaurer `sw.js`, `build-pages.mjs` et `src/app.js` depuis le commit `722eea1`.

## Rollback global

Restaurer `archive/v2-globe-1year/` (ou `archive/v1-map-2d/`) et republier le commit `adc5c9d`.
