# M05 — Zoom et bornes (domaine A : rendu WebGL)

Fichier possédé : `src/views/monde/M05.js`. Lectures seules : `src/views/globe.js`,
`public/globe-engine.js`, `src/views/globe-reveal.js`, `src/platform/keyboard.js`,
`styles.css`, `src/views/monde/registry.js`. Zéro réseau, zéro `Math.random`,
aucun `console.*`, aucun sélecteur de test modifié. 10 chantiers, tous implémentés.

Repères moteur : `camera.position.z` vaut 4,05 au départ (`buildScene`, globe-engine.js:131) ;
`onWheel` :432 applique `z + deltaY * 0.0014` puis `clamp(z, 1.8, 4.8)` ;
pincement :362-366 applique `z0 * (distance0 / distance)` puis le même clamp ;
`getInfo()` :691-703 n'expose **pas** la distance caméra. `globe.js:248-261`
dispatche déjà des `WheelEvent` synthétiques (deltaY ±240) pour les boutons Zoom±.

---

## M05-01 — Bornes de zoom invisibles et non exposées par l'API moteur

- **Preuve** : globe-engine.js:432 et :362-366 bornent z dans [1,8 ; 4,8] ; `getInfo()` (:691-703) renvoie calls/triangles/geometries/textures/pixelRatio/width/height, jamais `camera.position.z`. Aucun contrôle ne sait où il se trouve.
- **Solution** : modèle d'ombre `z` initialisé à 4,05, mirroring exact de la formule moteur (`WHEEL_SCALE=0.0014`, clamp [1,8 ; 4,8]), mis à jour par un écouteur `wheel` en capture document (`observeWheel`). Surface `window.VECTEMPOREL_M05.bounds()/level()`.
- **Impact** : niveau et bornes deviennent auditables et affichables sans toucher au moteur.
- **Risque** : dérive si le moteur change ses constantes ; documenté et isolé dans 5 constantes en tête de module.
- **Effort** : M.
- **Vérification** : `VECTEMPOREL_M05.bounds()` → `{min:1.8, max:4.8, default:4.05, wheelScale:0.0014, keyboardStep:360}` ; 7 crans molette vers le haut → `level().z === 1.8`.

## M05-02 — Aucun retour quand une borne est atteinte

- **Preuve** : au-delà de 1,8 ou 4,8, `clamp` rend la valeur identique ; `onWheel` continue pourtant `pauseAutoRotate()` + `invalidate()` + `scheduleAutoRotate()` (globe-engine.js:430-435) : aucun effet visible ni sonore.
- **Solution** : `setZoom()` détecte `z === previous` aux bornes et appelle `ctx.say()` avec un message distinct (« borne rapprochée » / « borne éloignée »), throttlé à `BOUND_MS = 1500` ms ; marqueur `host.dataset.m05Bound`.
- **Impact** : retour non visuel pour les lecteurs d'écran, sans spam.
- **Risque** : annonce répétée sur molette continue → throttling 1,5 s.
- **Effort** : S.
- **Vérification** : 20 `wheel deltaY=-120` rapides → une seule annonce dans `#globe-live` en 1,5 s ; `data-m05-bound="near"` sur le host.

## M05-03 — Boutons Zoom+ / Zoom− jamais désactivés aux bornes

- **Preuve** : globe.js:343-350 crée les deux boutons sans état `disabled` ; cliquer « Zoom + » à z=1,8 déclenche un `WheelEvent` sans effet.
- **Solution** : `findZoomButtons()` repère les boutons par `aria-label`/texte (`Zoomer sur le globe`, `Dézoomer sur le globe`), puis `refreshUI()` pose `disabled` quand `z <= 1,8 + 1e-6` / `z >= 4,8 − 1e-6`. Le bouton de pause n'est jamais ciblé.
- **Impact** : affordance correcte, pas d'action morte.
- **Risque** : sélection par libellé français figé ; doublé par le texte visible, et aucun sélecteur de test touché.
- **Effort** : S.
- **Vérification** : à z=1,8, `button[aria-label="Zoomer sur le globe"].disabled === true`, l'autre restant actif.

## M05-04 — Readout de zoom non dépendant de la couleur

- **Preuve** : le HUD (globe.js:329-337) n'affiche que le statut moteur et le survol ; la distance caméra n'apparaît nulle part.
- **Solution** : badge `#globe-m05-zoom` (`role=status`, `aria-live=polite`, `aria-atomic=true`) affichant « Zoom N % · distance X,XX », actualisé seulement quand le pourcentage entier change (cache `percentShown`), avec `font-variant-numeric: tabular-nums` et bordure renforcée aux bornes via `data-bound`.
- **Impact** : mesure lisible, chiffrée, non portée par la seule couleur.
- **Risque** : bavardage ARIA ; limité aux changements de pourcentage (12 annonces max sur la plage).
- **Effort** : S.
- **Vérification** : à z=4,05 le badge lit « Zoom 100 % · distance 4,05 » ; à z=1,8 « Zoom 225 % · distance 1,80 · borne rapprochée ».

## M05-05 — Zoom clavier absent en dehors des boutons

- **Preuve** : globe.js:202-230 gère flèches/Home/End/Entrée mais aucun raccourci de zoom ; keyboard.js:169 court-circuite les flèches en vue globe, et les touches `+`/`−` ne sont pas dans sa map.
- **Solution** : écouteur `keydown` sur le host : `+`, `=`, `PageUp` → `deltaY = −360` ; `−`, `_`, `PageDown` → `+360`, soit un pas de 0,504 en z. `preventDefault()` (le routeur capture vérifie `defaultPrevented`, T2-10). Modificateurs ctrl/meta/alt ignorés.
- **Impact** : zoom utilisable sans pointeur ni Tab supplémentaire.
- **Risque** : conflit avec le routeur global → aucune touche réservée (`?`, Échap, 1–5) n'est interceptée.
- **Effort** : S.
- **Vérification** : focus sur `#globe-canvas`, `PageUp` → `level().z` passe de 4,05 à 3,546.

## M05-06 — `deltaMode` non normalisé (lignes/pages)

- **Preuve** : globe-engine.js:432 multiplie `event.deltaY` brut par 0,0014 sans lire `deltaMode`. Un wheel Firefox en lignes (`deltaMode=1`, `deltaY=3`) n'avance que de 0,0042 au lieu de ~0,336 : zoom 80× plus lent qu'à la souris.
- **Solution** : écouteur capture `passive:false` : si `deltaMode===1`, `deltaY *= 16` (hauteur de ligne) ; si `===2`, `deltaY *= clientHeight` ; `preventDefault()` + `stopPropagation()` puis réémission d'un `WheelEvent` synthétique `deltaMode=0`. `WeakSet` anti-réentrance ; `observeWheel` ignore les modes non nuls.
- **Impact** : même geste → même zoom sur souris, trackpad et navigateur.
- **Risque** : `stopPropagation` en capture empêche le moteur de voir l'original — le synthétique le remplace ; garde par `WeakSet`.
- **Effort** : M.
- **Vérification** : dispatch `WheelEvent('wheel',{deltaY:3,deltaMode:1})` sur le canvas → `level().z` recule de ~0,336, identique à `deltaY:48, deltaMode:0`.

## M05-07 — Pincement tactile non suivi ni annoncé

- **Preuve** : globe-engine.js:359-369 borne le pincement mais n'émet aucun retour ; `globe.js` n'écoute pas `pointermove` (ATLAS-GLOBE-10 ne couvre que les boutons).
- **Solution** : capture `pointerdown/move/up/cancel` sur document, filtrés au host. Au 2ᵉ doigt, mémorisation `{distance, z0:z}` ; au move, `z = clamp(z0 * distance0 / max(20, distance), 1.8, 4.8)`, même formule que le moteur ; annonce de borne via `setZoom()` ; nettoyage quand `pointers.size < 2`. `passive:true`, aucun `preventDefault` : les `setPointerCapture` du moteur restent intacts.
- **Impact** : le mode tactile est couvert par le même modèle et les mêmes annonces que la molette.
- **Risque** : léger décalage si le moteur et le modèle voient des `clientX` différents (même source d'événement, donc nul en pratique).
- **Effort** : M.
- **Vérification** : deux pointeurs à 100 px puis 200 px → `level().z ≈ z0/2` plafonné à 4,8 ; annonce « borne éloignée » au-delà.

## M05-08 — Aucun retour au niveau de zoom par défaut

- **Preuve** : ni le moteur ni globe.js n'exposent de reset ; après 10 crans, l'utilisateur doit les annuler un à un.
- **Solution** : bouton `#globe-m05-reset` (↺, `aria-label="Réinitialiser le zoom à 100 %"`, 46×46 hérité de `.globe-controls button`) qui dispatche un unique `WheelEvent` de `deltaY = (4,05 − z)/0,0014` — la formule étant linéaire, un seul événement suffit. Désactivé quand `|z−4,05| < 0,01` ; annonce « Zoom réinitialisé à 100 %. »
- **Impact** : récupération en une action, sans état supplémentaire.
- **Risque** : arrondi flottant ; seuil de 0,01 absorbe l'écart.
- **Effort** : S.
- **Vérification** : à z=2,0, un clic → `level().z === 4.05` et `percent()===100`.

## M05-09 — Consignes de zoom uniquement gestuelles

- **Preuve** : globe.js:425 n'informe que flèches/Entrée/survol ; ni molette, ni pincement, ni bornes ne sont décrits, donc l'information n'existe que dans le geste.
- **Solution** : paragraphe `#globe-m05-hint` visible (11 px, droite basse) listant molette / pincement / `+` `−` / PageUp PageDown / boutons et la plage 1,80–4,80 (84 %–225 %), ajouté à l'`aria-describedby` du host sans doubler l'id.
- **Impact** : équivalence clavier/lecteur d'écran/pointeur, consigne numérique explicite.
- **Risque** : chevauchement du badge en petit écran → media query 620 px qui réduit largeur et taille.
- **Effort** : S.
- **Vérification** : focus host → le lecteur d'écran lit l'aide globale puis la consigne M05 ; en 390×844, aucun chevauchement ni débordement horizontal.

## M05-10 — Robustesse multi-rendus et diagnostic

- **Preuve** : shell.js vide `root.innerHTML` à chaque émission du store ; `renderGlobe()` recrée scène et contrôles. Un greffon naïf dupliquerait badge, bouton et écouteurs à chaque rendu.
- **Solution** : `ctx.css('monde-m05', …)` une seule fois via `cssOnce` ; chaque nœud créé sous id unique avec garde `getElementById` ; écouteurs posés une fois (`attached`) sur document et sur le host persistant ; `aria-describedby` complété sans doublon ; `window.VECTEMPOREL_M05` expose `bounds()`, `level()`, `shadow()`, `chantiers()`, `ready()`.
- **Impact** : aucun doublon, état stable, contrôles rejouables par l'agent maître.
- **Risque** : si le moteur est réinitialisé (impossible : garde `state.ready`), le modèle d'ombre resterait figé → documenté.
- **Effort** : S.
- **Vérification** : basculer 1→2→1 trois fois → un seul `#globe-m05-zoom`, un seul `#globe-m05-reset`, `VECTEMPOREL_M05.chantiers().length === 10`.

---

## Blocages

1. **API moteur incomplète** : `getInfo()` n'expose pas `camera.position.z` et aucun setter de bornes n'existe. Le modèle d'ombre (M05-01) est un contournement, pas une lecture — dérive possible si `public/globe-engine.js` évolue (fichier non possédé).
2. **Pas d'API de zoom publique** : tous les chantiers passent par des `WheelEvent` synthétiques, comme globe.js:248-261. Un `engine.setZoom(z)` côté moteur remplacerait proprement M05-01, -05, -06 et -08.
3. **`deltaMode` corrigé côté greffon** (M05-06) : la vraie correction appartient à `onWheel` dans le moteur, non accessible ici.

## Vérifications

- `node --check src/views/monde/M05.js` : PASS (seule vérification autorisée par la consigne).
- Contrôles manuels décrits ci-dessus (non exécutés : suites E2E rejouées par l'agent maître).
