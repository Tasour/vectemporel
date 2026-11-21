# Architecture cible — Atlas historique minimal

## 1. Contexte

Remplacer l'Atlas v0 (6 vues, 1 632 lentilles, audits) par **une seule vue** : la carte mondiale de Chronas, reconstruite en clean-room, avec les paramètres d'URL d'origine (`type=area&value=Berry&pos=lat,lon,zoom&year=1000`). Données locales, zéro réseau au runtime, PWA conservée.

## 2. Drivers de qualité

1. Budget : < 50 requêtes et < 1 Mo au chargement.
2. Zéro dépendance runtime, zéro appel réseau externe à l'exécution.
3. Mobile 390×844, clavier, ARIA, mouvement réduit.
4. Fidélité fonctionnelle à l'URL cible.
5. Réversibilité : archiver l'ancien sans suppression.

## 3. État des lieux

Voir `CURRENT-STATE.md`. Points clés : vanilla JS, 0 dépendance, 0 cycle, snapshot 705 Ko, géométrie 2 492 polygones disponible au build.

## 4. Options comparées

| Décision | Options | Retenue | ADR |
|---|---|---|---|
| Rendu carte | Canvas maison / MapLibre / SVG | **Canvas maison** | ADR-0001 |
| Données | Année 1000 complète / 10 ans bornées / 10 ans complètes | **Année 1000 complète** | ADR-0002 |
| Migration | Archive dépôt / nouveau dépôt / écrasement | **Archive dépôt** | ADR-0003 |

Chaque ADR contient coût, risque et réversibilité.

## 5. Architecture cible

```text
index.html                  # une seule entrée
styles.css                  # tokens + styles de la carte
src/
  app.js                    # composition root, aucun état métier
  map/
    renderer.js             # canvas Mercator, pan/zoom, hit-testing
    projection.js           # pure, testable
    data.js                 # chargement du snapshot local
  data/
    chronas-map.js          # généré, CC BY-SA 4.0
scripts/
  serve.mjs                 # statique, whitelist
  build-pages.mjs           # dist-pages
  import-chronas.mjs        # build-time uniquement
public/  icons/  manifest.webmanifest  sw.js
archive/v0-atlas/           # ancienne app, données et audits
docs/architecture/  docs/veille/
```

## 6. Contrats et invariables

- URL : `type=area&value=<nom>&pos=<lat,lon,zoom>&year=<année>` ; `value` et `year` pilotent la sélection.
- `projection.js` : fonctions pures, coordonnées arrondies, pas d'aléa.
- `renderer.js` : un seul canvas, un seul gestionnaire de rendu, aucun rAF continu ; DPR ≤ 2.
- Données générées : `meta.source`, `meta.license`, `meta.retrieved_at`, `meta.api_version`.
- Aucun appel réseau au runtime ; le service worker met les ressources locales en cache.

## 7. Budgets

| Budget | Cible | Contrôle |
|---|---|---|
| Requêtes | < 50 | `test:perf` |
| Poids initial | < 1 Mo | `test:perf` |
| Snapshot carte | < 1 Mo | taille du fichier généré |
| DOM | 1 canvas, cibles ≥ 44 px | `ui.guard`, `test:e2e` |

## 8. Migration (strangler)

P0 — ADR + import des données + archive de l'ancien.
P1 — vue carte minimale avec pan/zoom/sélection/deep link.
P2 — accessibilité, PWA, vérifications et publication.

Chaque étape réversible par restauration depuis `archive/v0-atlas/`.

## 9. Risques

Voir `RISKS.md`. Principal risque : perte de fidélité visuelle par rapport au frontend Chronas (non copiable légalement).

## 10. Définition de terminée

`tools.arch.verify` vert, `npm run check` vert, `test:perf`, `test:pwa`, captures, `git diff --check`, site Pages mis à jour.

## 11. Décisions

- ADR-0001 : rendu Canvas maison, zéro dépendance.
- ADR-0002 : snapshot complet de l'année 1000, géométrie simplifiée.
- ADR-0003 : archivage de l'Atlas v0 dans le dépôt, migration strangler.

Ces décisions sont réversibles : voir `ROADMAP.md` (rollback) et `RISKS.md`.
