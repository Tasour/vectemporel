# ADR-0001 — Moteur de rendu de la carte mondiale

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : budget < 1 Mo, zéro réseau au runtime, mobile 390px, accessibilité clavier

## Contexte

Application vanilla JS sans framework, PWA zéro réseau, budget < 50 requêtes / < 1 Mo, 2 429 régions et 2 492 polygones pour l'année 1000. Mesures : arch.profile = JavaScript/0 framework/0 dépendance ; arch.budget signale snapshot 705 Ko et three.min.js 633 Ko.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| undefined | Zéro dépendance, un seul canvas, hit-testing au clic | Projection et zoom à implémenter | Moyen | Élevée |
| undefined | Rendu proche de Chronas | +500 Ko JS et style à embarquer | Élevé | Moyenne |
| undefined | Simple à inspecter | 2 492 <path>, DOM et focus dégradés | Faible | Élevée |

## Décision

Option A — Canvas maison, zéro dépendance.

## Conséquences

- Positives : Aucune dépendance ajoutée ; Budget maîtrisé ; Determinisme
- Négatives acceptées : Pas de style MapLibre
- À surveiller : Taille du snapshot ; Fluidité du zoom à 390×844

## Preuves

- `tools.arch.profile`
- `tools.arch.budget`
- `API Chronas 2026-11-21`

## Révision

0001
