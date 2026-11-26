# Fluidité du geste et GPU

## Protocole

1. Serveur de dev avec l'API locale :
   `VITE_API_BASE_URL=http://127.0.0.1:4189/api/v1 VITE_ENVIRONMENT=development npm run dev`
2. Mesure reproductible :
   `node scripts/measure-gesture.mjs 'http://localhost:5173/?year=1000'`
   Le harnais écrit un JSON horodaté dans `docs/harness/gesture-*.json`.
3. Sur une machine réelle, recopier le diagnostic de l'application
   (Réglages → « Copier le diagnostic ») : il contient `gpu=`, `gpuSoftware=`,
   `dpr=` et `cores=`. C'est la seule manière de savoir si les chiffres sont
   représentatifs : un renderer `SwiftShader`/`llvmpipe` est un rendu logiciel.

## Mesures du 26/11/2026 (headless Chromium, 1658×1150)

| Indicateur | Avant | Après |
|---|---:|---:|
| Rendus MapLibre pendant un geste de 12 mouvements | 8 | **0** |
| Rendus MapLibre dans la seconde suivant le relâchement | 8 | **0–1** |
| Long task p50 pendant le geste | ~200 ms | **aucune** |
| Année qui repart en arrière après relâchement | oui (919 → 846) | **0 régression** |
| Position finale de la frise | ~1,3 s après relâchement | **0 ms** |
| Canvas des graduations pendant le geste | 300 × 150 px | pleine largeur |
| Sommes de projection des provinces (une fois) | — | 21 ms / 24 520 sommets |
| Redessin 2D des entités visibles | — | 2 ms / 1 260 entités |

Le renderer par défaut du headless est `ANGLE (Google, Vulkan 1.3.0
(SwiftShader Device))`. Le harnais `--gpu` force le GPU réel : sur cette machine
(`ANGLE (AMD Radeon 860M)`), un geste de 12 mouvements donne **0 rendu MapLibre**,
une seule long task de **93 ms** (projection + premier dessin), la frise à sa
position finale en **0 ms**, le commit d'année en **148 ms**, **0 régression**.

Le chiffre du téléphone reste à mesurer par l'utilisateur ; le GPU de bureau ne
remplace pas le Brave Android.

## Parade retenue

Pendant le geste, la carte ne bouge pas (seules les couleurs changent). On
exploite cela au lieu de demander au GPU de recalculer la planète :

1. `map.stop()` et neutralisation de `triggerRepaint` : la carte conserve sa
   dernière frame, **aucune couche n'est masquée et aucun readback n'est fait** ;
2. projection unique des géométries, avec culling par bbox écran (1 260 entités
   visibles sur 2 492) ;
3. surcouche canvas 2D : fond terre opaque (efface l'année précédente),
   remplissage à l'opacité MapLibre, frontière et noms des seules entités
   visibles, rafraîchis à ~14 Hz, DPR plafonné à 2 ;
4. au relâchement : restauration de `triggerRepaint` après deux frames, rendu
   MapLibre unique de toute la planète, fondu de 120 ms. La restauration est
   idempotente et doublée d'un timer de 400 ms : le `!active` de React ne doit
   jamais annuler le rAF programmé par le cleanup, sinon la carte reste figée
   et non interactive (bug corrigé le 26/11).

Une version antérieure masquait les couches **avant** de capturer un raster du
canvas via `createImageBitmap`. Sur les GPUs où le readback est lent ou bloqué,
la capture ne revenait pas et les provinces disparaissaient pendant tout le
geste. La correction supprime cette dépendance : même si la surcouche ne peint
pas, la carte reste affichée avec l'année précédente.

Les couleurs de la surcouche et celles de MapLibre viennent de la même fonction
pure `getProvinceStyle` : aucun écart de teinte au fondu.

## Leviers GPU additionnels

Appliqués : `renderWorldCopies: false` (le zoom 2,5 dessinait plusieurs copies
du monde), `fill-antialias: false` sur les cinq couches de provinces,
`fadeDuration: 0`, `refreshExpiredTiles: false`,
`canvasContextAttributes: { antialias: false, powerPreference: 'high-performance' }`.
`desynchronized` a été retiré : il fragilisait le readback et n'apportait rien
au gel. Le gain individuel de chaque levier n'a pas été isolé : le gel rend le
coût pendant le geste négligeable, seule la frame finale en bénéficie.

## Limites

- Le **120 Hz constant** doit être validé sur la machine de l'utilisateur. Le
  harnais peut force le GPU réel avec `node scripts/measure-gesture.mjs URL --gpu`
  (vérifie que `gpu` ne contient pas `SwiftShader`).
- Plus aucun readback n'est utilisé : `createImageBitmap` ne peut plus faire
  disparaître les données.
- Si la carte bouge (pan/zoom) pendant le geste, `triggerRepaint` est restauré
  immédiatement et le gel est abandonné.
- Pendant le geste, le relief sous les provinces est aplati et quelques
  étiquettes du fond restent visibles en mer ; le rendu exact revient au
  relâchement en 120 ms.
