# ADR-0008 — Timeline provinciale en chunks locaux paresseux

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : zéro réseau au runtime, budget initial < 1 Mo, offline PWA, apprentissage historique

## Contexte

L'API Chronas fournit /v1/metadata/ap_<province>?type=ap (souverain, culture, religion, capitale, population). La liste /metadata?type=ap est plafonnée à 10 résultats. Mesure : 187 provinces échantillonnées, 187 HTTP 200, 0 erreur, 1082 octets en moyenne, soit ~2,6 Mo pour 2429 provinces. Le budget initial est de 22 requêtes / 529 Ko.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — Fichier unique 2,6 Mo | Accès direct | Dépasse le budget initial | Faible | Faible |
| B — Chunks par initiale, import dynamique | Coût initial nul, offline après premier chargement, ~1,4 Mo généré | 27 fichiers + index, cache à gérer | Moyen | Élevée |
| C — Un fichier par province | Granularité maximale | 2429 fichiers, surcoût HTTP important | Élevé | Moyenne |

## Décision

Option B — 27 chunks par initiale (découpage à 220 Ko), index de 41 Ko, import dynamique à la sélection, cache navigateur dédié avec repli hors ligne.

## Conséquences

- Positives : 0 requête ajoutée au chargement initial ; Couverture des 2429 provinces ; Offline après premier usage
- Négatives acceptées : Import build de ~2,6 Mo ; Cache spécifique au store
- À surveiller : Taille des chunks ; Temps de chargement à la sélection ; Cohérence des noms localisés

## Preuves

- `probe API 187 provinces (2026-11-21)`
- `tests/province-timelines.mjs`
- `test:perf 22 requêtes / 529 Ko`

## Révision

0008
