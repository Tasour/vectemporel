# Styleguide visuel local

## Tokens

| Token | Usage |
|---|---|
| `--gold` / `--gold-bright` | accents, sélection, liens |
| `--ink` | texte principal |
| `--muted` / `--muted-2` | textes secondaires (contraste AA vérifié) |
| `--line` | bordures discrètes |
| `--surface` | fonds de panneaux et boutons |

Deux thèmes sont pris en charge : sombre par défaut, clair via `localStorage.history-theme`.

## Typographie

- Serif : titres et grandes valeurs (`h1`, `h2`, `.timeline-year`, `.learn-prompt`).
- Sans : corps de texte, boutons, légendes, tableaux.
- Taille minimale lue : 10 px pour les légendes, 11–12 px pour le corps, 16 px+ pour les titres.

## Contrôles

- Hauteur minimale **44 px** pour tout bouton ou champ interactif (les pastilles de rupture et les marqueurs d'arcs ont une zone de frappe étendue).
- `:focus-visible` obligatoire avec contour de 3 px.
- Aucune information portée par la seule couleur : chaque pastille, ruban ou badge a un `aria-label` ou un `data-tip`.

## Panneaux

- Même structure : bouton Fermer en haut à droite, `h2`, contenu, `role="dialog"` + `aria-label`.
- Un seul panneau ouvert à la fois ; l'indicateur central nomme le panneau actif.
- Transitions de 120 ms, désactivées par `prefers-reduced-motion`.

## Mobile

- Frise compacte (156 px), readout sur deux lignes.
- Boutons d'action répartis sur plusieurs lignes, jamais de chevauchement avec le titre.
- Panneaux scrollables et dans le viewport à 320 px et 390 px.
