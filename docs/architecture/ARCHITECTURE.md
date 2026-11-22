# Architecture cible — Sphère historique plein écran

## 1. Contexte

L'atlas livré affiche une carte 2D de 2 429 régions de l'an 1000 (données Chronas CC BY-SA 4.0). L'objectif est de transformer cette base en **sphère WebGL plein écran**, avec une interface réduite au minimum : un HUD de jeu vidéo, pas de barre d'outils ni de panneau latéral. Le site publié et le raccourci Omarchy restent inchangés.

L'ADR-0001 (« canvas maison, zéro dépendance ») est partiellement abrogé par l'**ADR-0004** : la couche de rendu 3D utilise Three.js r152 local (MIT). La couche données reste locale, déterministe et sans appel réseau.

## 2. Drivers de qualité

1. Sphère plein écran, ambiance spatiale (étoiles, halo, inertie, rotation auto).
2. Budget : < 50 requêtes et < 1 Mo au chargement (mesure : 208 Ko avant Three.js).
3. Zéro appel réseau au runtime ; PWA hors ligne conservée.
4. Mobile 390×844, clavier, ARIA, `prefers-reduced-motion`.
5. Contrat d'URL Chronas inchangé : `type=area&value=…&pos=lat,lon,zoom&year=…`.
6. Réversibilité : version 2D archivée dans `archive/v1-map-2d/`.

## 3. État des lieux

Voir `CURRENT-STATE.md`. Points clés : 5 modules JS, 0 cycle, `arch.verify` OK, scorecard 87/100, snapshot 593 Ko, première visite 10 requêtes / 208 Ko, actif Three.js r152 MIT déjà présent dans l'archive (633 Ko brut).

## 4. Options comparées

| Décision | Options | Retenue | ADR |
|---|---|---|---|
| Rendu carte 2D | Canvas maison / MapLibre / SVG | Canvas maison | ADR-0001 |
| Données | Année 1000 complète / 10 ans bornées / 10 ans complètes | Année 1000 complète | ADR-0002 |
| Migration v0 | Archive dépôt / nouveau dépôt / écrasement | Archive dépôt | ADR-0003 |
| Rendu sphère | Three.js r152 local / WebGL maison / Canvas 2D pseudo-sphère | **Three.js r152 local** | ADR-0004 |
| Timeline | Snapshot unique / chunks par siècle + deltas / proxy API | **Chunks locaux par siècle** | ADR-0005 |
| Définition et rotation | 3072 / 4096 / 8192 ; auto / manuel | **4096×2048, rotation manuelle** | ADR-0006 |
| Netteté en zoom | Texture 8192 / texture dynamique / maillage vectoriel | **Maillage vectoriel + zoom 6, porté 7,2 en P9** | ADR-0007 |
| Moteur 3D | UMD r152 / ESM r180 / WebGL2 maison | **ESM r180 tree-shaké** | ADR-0010 |
| Timeline provinciale | Fichier unique / chunks par initiale / un fichier par province | **Chunks par initiale, import paresseux** | ADR-0008 |

Chaque ADR contient coût, risque et réversibilité.

## 5. Architecture cible

```text
index.html                  canvas plein écran + HUD
styles.css                  tokens + HUD minimal
src/
  app.js                    composition root, URL, HUD, clavier
  globe/
    globe.js                scène Three.js, picking, inertie, étoiles, halo
    lonlat.js               conversions pures lon/lat <-> vecteur 3D
    texture.js              fond océan + graticule uniquement
    vector-provinces.js     maillage GPU des 2 492 provinces (ADR-0007)
  map/
    data.js                 accès au snapshot (partagé)
    projection.js           hits et bbox (partagé, hors rendu 2D)
  data/
    chronas-map.js          généré, géométrie partagée, CC BY-SA 4.0
    years/                  chunks de deltas par siècle (générés)
    year-store.js           reconstruction LRU des années -2000..2000
    province-timeline-store.js  import paresseux des timelines provinciales
    province-timelines/     27 chunks générés + index
public/
  three-bundle.js           r180 ESM tree-shaké, MIT (généré par esbuild)
scripts/                    serve, build-pages, import, verify
tests/                      e2e, perf, pwa, guards
archive/v0-atlas/           application originelle
archive/v1-map-2d/          version cartographique plate
```

Le module `src/map/renderer.js` n'est plus livré : il reste dans `archive/v1-map-2d/`.

## 6. Contrats et invariables

- URL : `type=area&value=<nom>&pos=<lat,lon,zoom>&year=<année>` ; la caméra de la sphère pilote `pos`, la sélection pilote `value`.
- `lonlat.js` : fonctions pures, convention UV alignée sur la texture équirectangulaire, aucun aléa.
- `globe.js` : une seule boucle rAF, pause sur `document.hidden`, DPR ≤ 2, picking par raycast puis `pointInFeature()`.
- `vector-provinces.js` : tris déterministes, rayon 1.003, `ShapeUtils.triangulateShape`, antiméridien normalisé ; zoom maximal 6.
- `texture.js` : aucun fichier binaire généré au runtime, aucun réseau ; dessin déterministe des 2 492 polygones.
- Données générées : `meta.source`, `meta.license`, `meta.retrieved_at`, `meta.api_version`.
- Licences : code MIT (Three.js inclus), données CC BY-SA 4.0 — attribution visible dans le HUD.

## 7. Budgets

| Budget | Cible | Contrôle |
|---|---|---|
| Requêtes | < 50 | `test:perf` |
| Poids initial | < 1 Mo | `test:perf` |
| `three-bundle.js` | 126 Ko gzip (vs 157 Ko pour l'UMD r152) | mesure gzip locale |
| Snapshot | < 1 Mo | `verify` |
| DOM | 1 canvas plein écran, cibles ≥ 44 px | `ui.guard`, `test:e2e` |
| rAF | 1 boucle, 0 en arrière-plan | revue de code + `test:perf` |

## 8. Migration (strangler)

P0 — ADR-0005/0006, docs, archive v2 (✅ 2026-11-21).
P1 — import 4 001 ans, géométrie partagée, deltas par siècle, `year-store`, intégrité.
P2 — texture 4096×2048, sphère 192×128, repli mobile, contours, rotation manuelle, redraw par année.
P3 — timeline -2000→2000, saisie directe, sauts de siècle, autoplay manuel, états de chargement, deep-link.
P4 — dimensions de couleur, libellés, marqueurs, tooltips, fiches, épiques, préférences.
P5 — tests, perf/PWA étendus, captures, publication.
P6 — maillage vectoriel des provinces, texture réduite, zoom borné à 6, preuves visuelles. ✅ 2026-11-21

Chaque étape est réversible par restauration depuis `archive/v1-map-2d/`.

## 9. Risques

Voir `RISKS.md`. Risques principaux : WebGL indisponible, couture de texture aux pôles, avertissement de dépréciation de Three.js r152.

## 10. Définition de terminée

`tools.arch.verify` vert, `npm run check` vert (e2e, perf, pwa, guards), captures 1440×900 et 390×844, `ui.guard` sans constat sur le code livré, `git diff --check` propre, site Pages mis à jour.

## 11. Décisions

- ADR-0001 : rendu Canvas maison pour la carte 2D.
- ADR-0002 : snapshot complet de l'année 1000.
- ADR-0003 : archivage de l'Atlas v0 dans le dépôt.
- ADR-0004 : sphère WebGL avec Three.js r152 local ; abroge partiellement ADR-0001.
- ADR-0005 : timeline multi-années avec chunks locaux ; abroge ADR-0002.
- ADR-0006 : définition 4096×2048 et rotation exclusivement manuelle.
- ADR-0007 : maillage vectoriel des provinces et zoom maximal 6, porté à 7,2 en P9 ; remplace le dessin raster des frontières.
- ADR-0008 : timelines provinciales en 27 chunks locaux chargés à la demande.
- ADR-0009 : libellés modernes issus de Natural Earth, importés au build.
- ADR-0010 : Three.js r180 ESM tree-shaké, bundle local généré par esbuild.
- ADR-0011 : apprentissage actif local, questions sourcées et SRS Leitner.

Ces décisions sont réversibles : voir `ROADMAP.md` (rollback) et `RISKS.md`.
