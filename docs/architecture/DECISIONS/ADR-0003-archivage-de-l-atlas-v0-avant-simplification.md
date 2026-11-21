# ADR-0003 — Archivage de l'Atlas v0 avant simplification

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : budget < 1 Mo, zéro réseau au runtime, mobile 390px, accessibilité clavier

## Contexte

L'app actuelle a 6 vues, 1 632 lentilles et des audits ; l'utilisateur veut une base saine réduite à la carte mondiale, sans suppression définitive.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| undefined | Réversible, historique conservé | Taille du dépôt inchangée | Faible | Élevée |
| undefined | Base propre | Double maintenance | Moyen | Moyenne |
| undefined | Simple | Git seul recours | Faible | Faible |

## Décision

Option A — archivage dans le dépôt, migration strangler.

## Conséquences

- Positives : Réversible ; Un seul site Pages
- Négatives acceptées : Dépôt volumineux
- À surveiller : Références mortes

## Preuves

- `git status 2026-11-21`

## Révision

0003
