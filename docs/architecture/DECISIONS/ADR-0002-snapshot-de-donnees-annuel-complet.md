# ADR-0002 — Snapshot de données annuel complet

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : budget < 1 Mo, zéro réseau au runtime, mobile 390px, accessibilité clavier

## Contexte

L'URL cible porte year=1000 et value=Berry. Le snapshot borné à 200 régions/an omettait Berry. Mesure : /v1/areas/1000 = 2 429 régions, Berry = ['_Kingdom_of_France','cosmopolitan_french','chalcedonism','Bourges',11000].

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| undefined | Fidèle à l'URL, Berry présente | Une seule année | Faible | Élevée |
| undefined | Couverture temporelle | Régions manquantes | Moyen | Moyenne |
| undefined | Couverture maximale | 2-3 Mo, budget dépassé | Élevé | Faible |

## Décision

Option A — année 1000, toutes les régions, géométrie simplifiée.

## Conséquences

- Positives : Fidélité à l'URL cible ; Budget < 1 Mo
- Négatives acceptées : Pas d'autres années au départ
- À surveiller : Taille générée ; Licence CC BY-SA

## Preuves

- `API Chronas 2026-11-21`
- `DATA-LICENSE.md`

## Révision

0002
