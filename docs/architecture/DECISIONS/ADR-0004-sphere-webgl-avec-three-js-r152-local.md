# ADR-0004 — Sphère WebGL avec Three.js r152 local

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : sphère plein écran, budget < 1 Mo, zéro réseau au runtime, mobile 390px, accessibilité clavier

## Contexte

L'utilisateur veut transformer la carte 2D en sphère plein écran « comme un jeu vidéo ». Mesures : arch.verify OK, scorecard 87/100, snapshot 593 Ko, première visite 208 Ko (marge ~790 Ko sous 1 Mo). Actif MIT déjà archivé : three.min.js r152 (633338 o). ADR-0001 imposait canvas maison zéro dépendance : il est partiellement abrogé pour la couche de rendu 3D.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — Three.js r152 local | Actif MIT déjà présent, rendu WebGL complet, raycast et halo natifs, ~160 Ko gzip | Dépendance de 619 Ko brut, avertissement de dépréciation r152 | Moyen | Élevée (archive v1) |
| B — WebGL maison | Zéro dépendance | ~300-400 lignes de shaders/matrices à maintenir | Élevé | Moyenne |
| C — Canvas 2D pseudo-sphère | Zéro dépendance, réutilisation totale | Rendu moins « jeu vidéo », pas de vrai éclairage | Faible | Élevée |

## Décision

Option A — Three.js r152 local, sous MIT, avec attribution dans ATTRIBUTION.md. La couche données reste CC BY-SA 4.0 et zéro réseau.

## Conséquences

- Positives : Rendu spatial et picking par raycast ; Budget mesuré sous 1 Mo ; Réversibilité par archive/v1-map-2d
- Négatives acceptées : Adjonction d'une dépendance de rendu ; console.warn de dépréciation r152
- À surveiller : Poids gzip réel de three.min.js ; Précision du picking aux pôles ; Absence de WebGL sur certains mobiles

## Preuves

- `arch.verify (2026-11-21)`
- `npm run test:perf : 10 requêtes / 208 Ko`
- `archive/v0-atlas/public/three.min.js en-tête MIT r152`

## Révision

0004
