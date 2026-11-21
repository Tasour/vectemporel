# Roadmap — plan de features ordonné

Un push est effectué à la fin de chaque phase P*.

## P0 — Fondations ✅ 2026-11-21

- F01 ADR-0005 (timeline chunks locaux) ✅
- F02 ADR-0006 (4096×2048 + rotation manuelle) ✅
- F03 Documents d'architecture et scorecard ✅
- F04 Archive `archive/v2-globe-1year/` ✅

**Rollback** : restaurer l'archive v2.

## P1 — Données 4 001 ans

- F05 Importeur borné et reprenable (−2000→2000)
- F06 Géométrie partagée
- F07 Deltes annuels par siècle
- F08 `year-store.js` (LRU, abort, debounce)
- F09 Intégrité `getYear(1000)` == snapshot actuel

## P2 — Rendu haute définition

- F10 Texture 4096×2048, sphère 192×128, anisotropie 16
- F11 Repli mémoire mobile
- F12 Contours et survol
- F13 Rotation manuelle (bouton, suppression de l'auto)
- F14 Redraw texture par année

## P3 — Timeline

- F15 Curseur −2000→2000
- F16 Saisie directe de l'année
- F17 Sauts de siècle + bandes d'époques
- F18 Autoplay manuel
- F19 États de chargement
- F20 Deep-link `year=`

## P4 — Features Chronas complémentaires

- F21 5 dimensions de couleur
- F22 Modes de libellés
- F23 Marqueurs locaux
- F24 Tooltip riche
- F25 Fiche à onglets + lien Wikipédia externe
- F26 Recherche enrichie
- F27 Épiques locaux
- F28 Préférences locales

## P5 — Qualité et publication

- F29 E2E timeline
- F30 Perf/PWA étendus
- F31 Preuves visuelles
- F32 Publication `atlas` + `gh-pages`

## Rollback global

Restaurer `archive/v2-globe-1year/` (ou `archive/v1-map-2d/`) et republier le commit `adc5c9d`.
