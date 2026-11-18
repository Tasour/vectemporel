# Correctifs parallèles — bugs du globe signalés par l'utilisateur

| # | Bug | Agent | Fichiers | État |
| --- | --- | --- | --- | --- |
| 1 | Drag : la sphère saute et revient | moteur drag | `public/globe-engine.js` (zone pointer/rotation) | ✅ |
| 1b | interférence inertie/pointeurs synthétiques | lens M04 | `src/views/monde/M04.js` | ✅ |
| 2 | Drapeau invisible au survol souris | révélation | `src/views/globe-reveal.js` | ✅ |
| 2b | masque / picking / jetons de survol | lenses M11 M12 M03 M14 M13 | leurs modules | ✅ |
| 3 | Rotation auto non voulue | coque + M10/M07 | `globe.js`, `M10.js`, `M07.js` | ✅ |
| 4 | Shader : surlignage au mauvais endroit | moteur shader | `public/globe-engine.js` (zone shader/picking) | ✅ |

### ✅ Correctif maître — drag bloqué par la désactivation de la rotation
- Après le correctif « rotation auto », `syncEngine()` calculait `want = inView && !paused && …` : avec `paused = true`, le moteur était **fermé**, donc les écouteurs `pointerdown/move/up` n'étaient jamais attachés — le drag ne tournait pas du tout.
- Séparation des responsabilités : `want = inView && state.view === 'globe'` (moteur toujours ouvert quand la vue est visible), rotation pilotée uniquement par `syncAutoRotate()`. `drawStaticFrame()` ne referme plus le moteur.
- Vérifié via `getInfo()` : `pointers 0→1`, `dragging true`, `rotationY` monotone `-2.18 → -1.575`, retour à `pointers 0` et rotation stable au `pointerup`.

### ✅ Correctif final — drapeau sur la sphère, à la place de la surbrillance
- `public/globe-engine.js` : 10 `CanvasTexture` de drapeaux construites depuis `public/flags/*.svg`, boîte équirectangulaire calculée depuis les `bounds` du dataset (API `registerCountries()` appelée au `onReady`). Le fragment shader échantillonne le drapeau quand le pixel de picking correspond au pays survolé et **remplace** la surbrillance dorée ; repli sur la surbrillance pour les pays sans drapeau.
- Ancienne recherche de couleur dans `globe-pick.png` abandonnée : plusieurs pays partagent la même teinte après compression (boîte de 30 % de la largeur au lieu de 3,5 %).
- `src/views/globe-reveal.js` : l'overlay DOM n'est plus affiché au survol ; il reste réservé à la transition de clic.
- Vérifié : survol souris réel sur la France → `debugPick = FR`, `flagActive = 1`, drapeau dessiné sur la France (capture), 0 erreur shader.
- Les 10 SVG ont ensuite été remplacés par les **vrais drapeaux vectoriels de FlagCDN** (téléchargés une fois, stockés dans `public/flags/`, 204 Ko au total). Vérifié : 10/10 textures chargées (`flagActive = 1`), 0 erreur console, E2E 16/16.
- Ajustement final (selon la consigne explicite) : le drapeau n'est plus étiré sur la boîte englobante ni centré sur son milieu. `registerCountries()` calcule le **centroïde géométrique du contour métropolitain** (aire pondérée sur `country.outline`) et `flagBox()` place le **centre géométrique du drapeau** sur ce point. Le ratio 3:2 reste préservé, corrigé par `cos(latitude)`, avec 86 % de la boîte ; textures 1024×683 + mipmaps/anisotropie. France : centre `(2,43° E, 46,59° N)`. Vérifié visuellement sur FR/IN/CN ; 10/10 drapeaux actifs ; E2E 16/16.
- Zoom et rendu (dernier retour) : le zoom est désormais **interpolé** (`zoomTarget` + lerp dans `frame()`, 2,941 → 2,790 en ~360 ms au lieu d'un saut). Le drapeau utilise un **masque suréchantillonné bilinéairement** depuis la texture de picking (512/1024/2048 selon le zoom) et une texture SVG reconstruite en HD **uniquement pour le pays survolé** ; le shader borne le rendu à l'intérieur de la boîte (`inside`), ce qui a supprimé les bandes de drapeau débordant sur tout le globe. Budget de pixels porté à 3,6 Mpx **uniquement quand la scène visible est zoomée** (`z <= 2,8`). Vérifié : bords lisses, 10/10 drapeaux, 0 erreur console, E2E 16/16.

### ✅ Correctif — fil d'Ariane obsolète sur le Monde (capture utilisateur)
- Symptôme : après être allé en Inde puis revenu au Monde, le fil affichait « Monde › Inde › Civilisations anciennes › Indus › Monde › vue d'ensemble » et un rang `1 / 16 · 2600 av. J.-C.` alors que la vue active était le Monde.
- Cause : `position()` exposait `countryName`/`eraName`/`eventTitle` depuis l'état global même dans la vue racine, et `renderTrail()` ajoutait le rang depuis `currentCountry()`/`currentEvent()` sans tester la vue.
- Correctif : `position()` neutralise ces champs quand `state.view === 'globe'` ; `renderTrail()` ne rend plus de rang à la racine.
- Vérifié : situation « Vous êtes ici : Monde · vue d'ensemble », fil « Monde », E2E 16/16.

## Résultats des diagnostiques

- **Drag** : `pointermove` sans `buttons & 1` tournait encore → saut/retour. Corrigé (+ `lostpointercapture`, capture protégée, anti-auto-rotation pendant le geste). M04 réutilisait le `pointerId` réel pour l'inertie → neutralisé.
- **Drapeau** : le masque pleine texture (2048×1024) réduisait le drapeau à ~15 px centré ; recadré sur la composante principale du pays. Les hooks des lentilles se désactivaient au 2ᵉ rendu → réarmés.
- **Rotation auto** : `paused=false` par défaut + M10 la réactivait → `paused=true`, `syncAutoRotate()`, M10/M07 neutralisés.
- **Shader** : pas de défaut UV/palette. `open()` laissait `uSelected` sur l'ancien pays → `setSelected(null)` quand aucune sélection est transmise.

Validation finale par l'agent maître : `npm run check`, test visuel de révélation, test de drag/réveil.
