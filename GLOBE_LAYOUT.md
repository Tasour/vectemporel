# Refonte de la vue Monde — synthèse des audits

> Huit agents indépendants ont audité le globe : visuel, interaction, information, performance, densité, responsive mobile, transition, typographie.

## Constats convergents

| Domaine | Constat | Correction |
| --- | --- | --- |
| Grille | Quatre enfants non placés dans une grille à deux colonnes : cellule vide, liste sous le globe | `grid-template-areas: "scene decision"` |
| Liste | Préambule de 234 px, 2,6 cartes visibles sur desktop, 0 sur mobile | Titre + une ligne d'orientation, cartes en grille |
| Densité | 10 lignes de 44 px. pour 25 caractères | Grille 2 colonnes desktop, 1 colonne mobile |
| Typographie | Titres 8–11 px, `h1` plus petit que `h2` | Corps 14 px, métadonnées 11–12 px, `h1` 30 px |
| Mobile | Statut prenait une ligne implicite hors écran | HUD absorbé dans la scène, liste dans sa propre ligne |
| Contrôle | Boutons blancs sur fond sombre | `var(--surface-2)` / `var(--line)` |
| Information | Seul « N repères » avant clic | ères, repères, points, 14/14 domaines |
| Transition | Focus perdu au clic pays | `data-fk="country-title"` |
| Performance | Rotation continue au repos | rendu à la demande, texture adaptative, `dispose()` |

## Nouvelle structure

```text
.globe-view
├── .globe-scene
│   ├── .globe-host (canvas Three.js)
│   ├── .globe-hud (statut + survol)
│   └── .globe-controls (zoom + rotation)
└── .globe-list
    ├── h1 « Choisir un pays »
    ├── sous-titre
    ├── bandeau d'orientation unique
    ├── grille de 10 cartes pays
    └── aide clavier
```

Chaque carte pays affiche :

- numéro et drapeau (`aria-hidden`) ;
- nom du pays en 14 px ;
- ères · repères · points ;
- couverture `14/14 domaines`.

## Critères

- 1440×900 : globe ≥ 1000×700, liste 420 px, 10 cartes visibles sans scroll inutile.
- 390×844 : globe 390×~300, liste scrollable,第一款 carte ≤ 560 px, aucune cellule vide.
- Cibles tactiles ≥ 36 px, corps ≥ 12 px, contraste ≥ 4,5:1.
- Un seul « Monde » visible dans la scène.

## Statut

Layout reconstruit et testé :
`npm run test:e2e` — 16/16. Correctifs moteur et focus en cours via agents dédiés.
