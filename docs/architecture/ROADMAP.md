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
- F22 Modes de libellés — ✅ livré en P10 (Aucun / Historique / Capitales)
- F23 Marqueurs locaux (4 662 capitales) ✅
- F24 Tooltip riche ✅
- F25 Fiche enrichie + lien Wikipédia externe ✅
- F26 Recherche enrichie — déjà présente, conservée ✅
- F27 Épiques locaux — ✅ livré en P10 (560 événements)
- F28 Préférences locales (thème persistant) ✅

Les features F22 et F27, initialement reportées, ont été livrées en P10 avec leurs imports build-time et leurs contrôles dédiés.

## P5 — Qualité et publication ✅ 2026-11-21

- F29 E2E timeline ✅
- F30 Perf/PWA étendus ✅
- F31 Preuves visuelles ✅
- F32 Publication `atlas` + `gh-pages` ✅

## P6 — Netteté vectorielle ✅ 2026-11-21

- F33 ADR-0007 (maillage vectoriel + zoom 6) ✅
- F34 Module `vector-provinces.js` (16 741 triangles, 44 ms) ✅
- F35 Intégration globe + texture réduite à 2048×1024 ✅
- F36 Borne de zoom 6 (`clampView`, molette, pincement, deep-link) ✅ (portée à 7,2 en P9/F43)
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
- Anciens caches supprimés à l'activation ; chunks d'années gérés par `year-store` (fetch standard + cache dédié), amendé en P11.
- Rechargement unique de la page quand un nouveau SW prend le contrôle.

**Rollback** : restaurer `sw.js`, `build-pages.mjs` et `src/app.js` depuis le commit `722eea1`.

## P9 — Interaction sans bulle native et picking des capitales ✅ 2026-11-21

- F42 Suppression de l'infobulle native ; bulle custom restaurée en P9a ✅
- F43 Zoom maximal porté à 7,2 (+20 %) ✅
- F44 Hit-test écran des capitales → sélection de la région ✅
- F45 Tests e2e, captures zoom 7,2, publication ✅

**Rollback** : restaurer `src/app.js`, `src/globe/globe.js`, `styles.css` et `tests/e2e.mjs` depuis le commit `de2e7a6`.

## P9a — Bulle custom restaurée ✅ 2026-11-21

- F46 Réintroduction du tooltip maison au survol d'une province ✅
- F47 Tests : bulle visible, `title` natif vide, masquage à la sortie ✅

**Rollback** : restaurer l'état sans tooltip depuis le commit `319d149`.

## P10 — Libellés et épiques ✅ 2026-11-21

- F48 Import des noms Chronas (4 832 libellés, 104 Ko) ✅
- F49 Libellés projetés : Aucun / Historique / Capitales ✅
- F50 Mode « moderne » tracé comme hors périmètre hors ligne ✅ (finalement livré en P13)
- F51 Import des 560 épiques (46 Ko, sans poster) ✅
- F52 Pastilles + sélecteur accessible sur la timeline ✅
- F53 Correctif SW : les chunks d'années ne sont pas réécrits (400 Chromium) ✅
- F54 Tests, captures et publication ✅

**Rollback** : restaurer `src/app.js`, `sw.js` et `scripts/serve.mjs` depuis le commit `30fdb17`.

## P11 — Timeline provinciale ✅ 2026-11-21

- F55 ADR-0008 (chunks locaux paresseux) ✅
- F56 Importeur reprenable des 2 429 timelines ✅
- F57 27 chunks par initiale + index 41 Ko ✅
- F58 Store paresseux avec LRU et repli hors ligne ✅
- F59 Section « Chronologie » dans la fiche de région ✅
- F60 Nettoyage de la roadmap et docs ✅
- F61 Test d'intégrité, e2e, captures, publication ✅

**Rollback** : restaurer `src/app.js`, `sw.js` et `src/data/year-store.js` depuis le commit `b32e7a8`.

## P12 — Interface mobile et navigation ✅ 2026-11-21

- F62 Fiche de région plein écran sur mobile, focus et fermeture ✅
- F63 HUD mobile sans collision (titre ellipsé, boutons 44 px, panneau Affichage) ✅
- F64 Timeline mobile compacte (144 px) ✅
- F65 Readout repositionné au-dessus de la timeline ✅
- F66 Zoom molette/trackpad vers le curseur ✅
- F67 Double-clic zoom ✅
- F68 Touch optimisé (sensibilité, seuil 8 px, rayon 20 px, inertie plafonnée) ✅
- F69 Boutons zoom/recentrer + raccourcis `R`, `Maj+flèches` ✅
- F70 `lastInput` exposé dans l'état pour les tests ✅

**Rollback** : restaurer `styles.css`, `src/app.js` et `src/globe/globe.js` depuis le commit `e381dee`.

## P13 — Libellés modernes locaux ✅ 2026-11-21

- Import Natural Earth 110m (177 pays, 8 Ko, domaine public) ✅
- Modes `Moderne` et `Les deux` dans la barre de libellés ✅
- ADR-0009 ✅
- Tests e2e et vérification budget ✅

**Rollback** : restaurer `src/globe/labels.js`, `src/app.js` et `styles.css` depuis le commit `c569360`.

## P14 — Gestes tactiles fiables ✅ 2026-11-21

- Machine à gestes `pointerdown/move/up/cancel` dans `globe.js` ✅
- Double-tap = zoom avant unique, sans sélection ✅
- Tap à deux doigts = zoom arrière ✅
- Timer de sélection 600 ms annulé par tout nouveau toucher ✅
- Tests e2e mobiles : 4 nouveaux contrôles ✅

**Rollback** : restaurer `src/globe/globe.js` et `tests/e2e.mjs` depuis le commit `473e8a6`.

## P15 — Stack Three.js r180 ESM tree-shaké ✅ 2026-11-21

- ADR-0010 ✅
- Bundle local `public/three-bundle.js` (126 Ko gzip vs 157 Ko) ✅
- Adaptateur `src/globe/three.js`, suppression du global `window.THREE` ✅
- Scripts `three-entry.js` / `build-three.mjs`, esbuild en devDependency ✅
- Mise à jour index, SW, verify, http-guards, attribution ✅

**Rollback** : restaurer `public/three.min.js`, `index.html` et `src/globe/globe.js` depuis le commit `539fdda`.

## P16 — Apprentissage actif ✅ 2026-11-22

- F83 Audit des 2 commits hors plan : conservés (skills Three.js, pont devtools, `test:devtools`) ✅
- F84 Générateur de 9 245 questions sourcées ✅
- F85 SRS Leitner local 5 boîtes ✅
- F86 Session entrelacée de 10 cartes, graine affichée ✅
- F87 Panneau « Réviser » avec feedback et source ✅
- F88 Progression visible (dues, réussites, cartes, maîtrise) ✅
- F89 Difficulté adaptative et cartes dues prioritaires ✅
- F90 Tests, captures, ADR-0011, publication ✅

**Rollback** : restaurer `src/app.js`, `styles.css`, `package.json` et `sw.js` depuis le commit `0b8868b`.

## P17 — Accessibilité tactile et gate live ✅ 2026-11-22

- Correction des cibles < 44 px sur desktop et mobile (années, siècles, dimensions, libellés) ✅
- Recalage de la fiche, du readout et de la navigation au-dessus de la timeline ✅
- `tests/live-layout.mjs` : mesures groupées 1440×1000 / 390×844 ✅
- Gate intégré à `npm run check` ✅
- Documentation README / RISKS mise à jour ✅

**Rollback** : restaurer `styles.css`, `package.json` et `README.md` depuis le commit `2a539dd`.

## P18 — Pont Three.js créé par OpenCode ✅ 2026-11-22

- Configuration MCP globale : wrapper + `DEV_URL` 4181 `?devtools=1` + headless + CDP 9229 ✅
- `scripts/bridge-mcp.mjs` : health-check puis démarrage du MCP ✅
- CSP de production inchangée ; CSP assouplie uniquement sur `?devtools=1` ✅
- `npm run bridge:check` ✅
- Documentation locale mise à jour ✅

**Rollback** : restaurer `~/.config/opencode/opencode.json` depuis le backup horodaté et `scripts/serve.mjs` depuis le commit `0a05101`.

## Rollback global

Restaurer `archive/v2-globe-1year/` (ou `archive/v1-map-2d/`) et republier le commit `adc5c9d`.
