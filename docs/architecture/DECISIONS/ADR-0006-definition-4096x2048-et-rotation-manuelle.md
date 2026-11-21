# ADR-0006 — Definition 4096x2048 et rotation manuelle

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : nettete en zoom, aucun mouvement spontane, mobile 390px, VRAM

## Contexte

L'utilisateur juge la definition de la surface insuffisante (texture 2048x1024, sphere 96x64) et ne veut aucune animation automatique (rotation actuelle apres 2600 ms, globe.js:186-187). Budget VRAM et mobile a prendre en compte.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — 3072x1536 / 160x96 | 2,25x pixels, ~18 Mo VRAM | Moins net en gros plan | Faible | Eleve |
| B — 4096x2048 / 192x128 | 4x pixels, ~43 Mo VRAM, net en zoom | VRAM elevee, repli mobile necessaire | Moyen | Eleve |
| C — 8192x4096 / 256x160 | 16x pixels | ~170 Mo VRAM, risque crash GPU | Eleve | Faible |

## Décision

Option B — texture 4096x2048, sphere 192x128, anisotropie 16, repli automatique 2048x1024 sur appareil peu memoire. Rotation spatiale supprimee, remplacee par un bouton manuel.

## Conséquences

- Positives : Surface nette ; Aucune animation automatique ; Repli mobile documente
- Négatives acceptées : 43 Mo VRAM avec mipmaps ; Regeneration texture plus couteuse
- À surveiller : Temps de regeneration par annee ; Comportement sur 390x844

## Preuves

- `texture.js:6-7`
- `globe.js:50,186-187`
- `captures 1440x900 / 390x844`

## Révision

Condition de révision à définir (métrique ou date).
