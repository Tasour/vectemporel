# ADR-0011 — Apprentissage actif local

- Statut : accepted
- Date : 2026-11-22
- Décideurs : Tasour (validation utilisateur)
- Drivers : objectif initial d'engagement cognitif, zéro réseau au runtime, localisme des données, accessibilité

## Contexte

L'atlas permet d'explorer 4 001 ans et 2 429 régions, mais reste passif. L'audit `docs/veille/2026-11-21-chronas-histography.md` identifie les leviers vérifiables : rappel actif, répétition espacée, entrelacement, feedback immédiat, progression visible, difficulté adaptative (MAD Learn 2021 ; gamification studies 2018–2019).

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — Service d'apprentissage externe | SRS mature, synchronisation | Réseau, compte, dépendance | Élevé | Faible |
| B — Générateur de questions + SRS local | Zéro réseau, données sourcées, déterministe | Pas de synchronisation multi-appareils | Moyen | Élevée |
| C — Quiz statiques figés dans le code | Simple | Contenu non traçable, pas d'adaptation | Faible | Moyenne |

## Décision

Option B — questions générées à partir des snapshots Chronas présents (`chronas-map.js`, `chronas-labels.js`, `chronas-epics.js`), SRS Leitner 5 boîtes stocké dans `localStorage`, session de 10 cartes entrelacées avec graine affichée. Chaque question porte sa source. Modules chargés à la demande via `import()` local.

## Conséquences

- Positives : apprentissage réellement actif, 9 245 questions traçables, hors ligne, déterministe, aucune dépendance.
- Négatives acceptées : données dérivées donc sous CC BY-SA 4.0 comme la source, pas de synchronisation entre appareils.
- À surveiller : ambiguïté des noms de capitales, taille du pool, densité du panneau sur mobile.

## Preuves

- `tests/learning.mjs` : 9245 questions, 5 types, SRS et session déterministes.
- `tests/e2e.mjs` : ouverture, réponse, feedback, source, progression, fermeture.
- `test:perf` : 24 requêtes / 508 Ko au chargement initial.

## Révision

0011
