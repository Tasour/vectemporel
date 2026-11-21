# ADR-0007 — Rendu vectoriel des provinces et borne de zoom 6

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : netteté des frontières en gros plan, budget < 1 Mo, zéro réseau au runtime, mobile 390px

## Contexte

Après ADR-0006 (texture 4096x2048, sphère 192x128), l'utilisateur juge le rendu encore flou en zoom. Diagnostic : la texture raster est magnifiée jusqu'à zoom 8 (distanceForZoom ~1,68), étirant ~1000 pixels de texture sur plusieurs milliers de pixels écran. La géométrie 192x128 ne corrige que la silhouette.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — Maillage vectoriel GPU | Contours nets à tout zoom, 1 draw call, ~25 000 triangles, indépendant de la résolution | Triangulation et gestion de l'antiméridien à implémenter | Moyen | Élevée |
| B — Texture 8192x4096 | Simple à appliquer | ~170 Mo VRAM avec mipmaps, risque de crash GPU | Élevé | Faible |
| C — Texture dynamique selon le zoom | Compromis mémoire/netteté | Coût de regeneration pendant le zoom, flou résiduel | Moyen | Moyenne |

## Décision

Option A — maillage vectoriel des provinces, fond de carte raster réduit à 2048x1024 (océan + graticule seulement), zoom maximal borné à 6, puis porté à 7,2 par révision du 2026-11-21.

## Conséquences

- Positives : Zéro flou sur les frontières ; VRAM réduite ; 0 requête réseau supplémentaire
- Négatives acceptées : Triangulation à maintenir ; Reconstruction à chaque changement d'année
- À surveiller : Polygones concaves et antiméridien ; Temps de reconstruction ; Captures zoom 6 desktop/mobile

## Preuves

- `texture.js:6-7 (HIGH 4096x2048)`
- `globe.js:19-20 (zoom 0..8)`
- `captures zoom 4.2 (2026-11-21)`

## Révision

0007

Révision 2026-11-21 : le zoom maximal passe de 6 à **7,2** (+20 %) à la demande de l'utilisateur. Le maillage vectoriel restant indépendant du raster, la netteté des frontières est conservée. Le picking des capitales est ajouté sans bulle d'infobulle.
