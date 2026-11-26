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
| Rendus MapLibre pendant un geste de 12 mouvements | 8 | **1** (frame de capture) |
| Rendus MapLibre dans la seconde suivant le relâchement | 8 | **0–1** |
| Long task p50 pendant le geste | ~200 ms | 183 ms (capture) |
| Année qui repart en arrière après relâchement | oui (919 → 846) | **0 régression** |
| Position finale de la frise | ~1,3 s après relâchement | **0 ms** |
| Canvas des graduations pendant le geste | 300 × 150 px | pleine largeur |
| Sommes de projection des provinces (une fois) | — | 21 ms / 24 520 sommets |
| Redessin 2D des entités visibles | — | 2 ms / 1 260 entités |

Le renderer mesuré est `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))` :
ces durées de rendu **ne décrivent pas un téléphone ni un GPU de bureau**. Elles
servent uniquement à comparer deux versions sur la même machine.

## Parade retenue

Pendant le geste, la carte ne bouge pas (seules les couleurs changent). On
exploite cela au lieu de demander au GPU de recalculer la planète :

1. `map.stop()` puis capture du canvas WebGL dans l'événement `render` ;
2. masquage des cinq couches `*-fill` et neutralisation de `triggerRepaint`
   (une seule frame autorisée, celle de la capture) ;
3. projection unique des géométries, avec culling par bbox écran (1 260 entités
   visibles sur 2 492) ;
4. surcouche canvas 2D : remplissages + noms des seules entités visibles,
   rafraîchis à ~14 Hz, DPR plafonné à 2 ;
5. au relâchement : restauration des couches après deux frames, rendu MapLibre
   unique de toute la planète, fondu de 120 ms.

Les couleurs de la surcouche et celles de MapLibre viennent de la même fonction
pure `getProvinceStyle` : aucun écart de teinte au fondu.

## Leviers GPU additionnels

Appliqués : `renderWorldCopies: false` (le zoom 2,5 dessinait plusieurs copies
du monde), `fill-antialias: false` sur les cinq couches de provinces,
`fadeDuration: 0`, `refreshExpiredTiles: false`,
`canvasContextAttributes: { antialias: false, desynchronized: true,
powerPreference: 'high-performance' }`. Le gain individuel de chacun n'a pas été
isolé : le gel rend le coût pendant le geste négligeable, seule la frame finale
en bénéficie.

## Limites

- Le **120 Hz constant** ne peut pas être validé en headless : à vérifier sur
  la machine de l'utilisateur avec le harnais et le diagnostic GPU.
- Si `createImageBitmap` est indisponible ou échoue, la surcouche se désactive
  et la carte reste vivante (aucun écran vide).
- Si la carte bouge (pan/zoom) pendant le geste, les couches sont restaurées
  immédiatement et le gel est abandonné.
- `desynchronized: true` peut provoquer un léger tearing sur certains pilotes ;
  à retirer si le diagnostic utilisateur le signale.
