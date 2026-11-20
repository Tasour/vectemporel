# M04 — Caméra, rotation, inertie, orientation et centrage

> Lentille M04 · domaine A (rendu WebGL) · fichier possédé : `src/views/monde/M04.js`.
> Sources auditées : `public/globe-engine.js` (moteur) et `src/views/globe.js` (vue).
> Numéros de ligne cités : **avant correctif** (relevés le 2026-11-18).
> Les 10 chantiers sont **implémentés** dans le greffon seul : aucun fichier partagé
> (`globe-engine.js`, `globe.js`, `styles.css`) n'est modifié.

## Contrainte structurante

Le moteur possède l'état de rotation (`state.globeGroup.rotation`) et n'expose que
`init/open/close/resize/setSelected/setHover/setAutoRotate/invalidate/dispose/debugPick/getInfo`
(`globe-engine.js:677-704`). `ctx.scene` et `ctx.host` sont des **DOM**, pas des objets THREE.
M04 ne monkey-patche donc aucun constructeur THREE : il pilote la rotation **par les
mêmes événements que l'utilisateur** (pointers synthétiques sur `canvas.globe-webgl`)
et lit le cap réel via `engine.debugPick()` au centre du canvas. Le `pointerdown`
synthétique neutralise `setPointerCapture` le temps d'un appel, car un événement
synthétique n'a aucun pointeur actif (sinon `NotFoundError`).

---

## M04-01 — Aucune inertie après un lancer (P1)

- **Preuve** : `globe-engine.js:399-412` `onPointerUp()` enchaîne `releasePointer()` puis
  `scheduleAutoRotate()` : aucune vitesse n'est échantillonnée, aucune décroissance
  n'est appliquée. La sphère s'arrête **net** au relâcher d'un glisser rapide
  (`onPointerMove` :377-378 applique `dx*0.0042` tant que le doigt est enfoncé, puis plus rien).
- **Solution** : échantillonnage des 10 derniers `pointermove` sur une fenêtre de
  **90 ms** (phase de capture de `#globe-canvas`, qui précède les écouteurs du moteur
  posés sur la cible `canvas`). Au `pointerup`, vitesse `v = Σ(dx) × 0.0042 / Σdt`,
  plafonnée à **4 rad/s**, seuil de déclenchement **0,15 rad/s**, tangage amorti ×0,6.
  Le `pointerup` réel est étouffé (`stopPropagation`) et le **vrai pointerId** est
  réutilisé pour les `pointermove` synthétiques : le moteur reste en `dragging`,
  sans jamais basculer en `pinching` (:343-351). Un `pointerup` synthétique clot
  le geste. Implémenté : `onDown/onMove/onUp`, `startInertia`, `drive`, `endDrive`.
- **Impact sur l'évidence** : le geste de rotation a une suite physique visible ;
  la mesure de vitesse est calculée depuis les mêmes deltas que le moteur (`SENS = 0.0042`).
- **Risque** : si le moteur change de sensibilité, `SENS` doit être réaligné (constante
  unique en tête de module, commentaire source). Aucun `Math.random`.
- **Effort** : M.
- **Vérification** : glisser rapide puis relâcher sur le canvas → continuation ~0,6 à 1,0 s,
  puis arrêt ; `prefers-reduced-motion: reduce` → arrêt immédiat ; double-clic non identifié
  comme lancer (distance < 6 px).

---

## M04-02 — Friction bornée et arrêt garanti (P1)

- **Preuve** : une décroissance exponentielle pure ne converge jamais ; sans seuil,
  la boucle d'inertie écrirait des micro-rotations indéfiniment et empêcherait
  `IDLE_FRAMES_BEFORE_STOP = 10` (`globe-engine.js:24-25, 465-468`) de mettre la
  boucle au repos : budget de frames violé dès qu'on quitte le canvas.
- **Solution** : `v *= exp(-dt / 0,22 s)` avec `dt` borné à 0,05 s (identique à
  `frame()` :451), arrêt dès que `|v| < 0,02 rad/s` (~1,1°/s, imperceptible)
  ou après **1200 ms** maximum. Une seule rAF pour toute la lentille (`loop.raf`),
  `cancelAnimationFrame` à l'arrêt, `endDrive()` libère l'état `dragging` du moteur.
- **Impact sur l'évidence** : retour à **0 render()** au repos, cohérent avec la
  consigne d'arrêt après 10 frames inutiles du moteur.
- **Risque** : seuil trop élevé = inertie trop courte sur geste lent ; 0,02 rad/s est
  sous le seuil perceptif, donc sans effet visible.
- **Effort** : S.
- **Vérification** : `engine.getInfo().calls` revient à 0 après ~1 s ; une seule boucle
  active (instrumenter `requestAnimationFrame`) ; arrêt à `document.hidden`.

---

## M04-03 — Cap affiché non normalisé, incréments non bornés (P1)

- **Preuve** : `frame()` (`globe-engine.js:456`) fait `rotation.y += dt*0.065` sans
  modulo, et le glisser ajoute `dx*0.0042` (:377). En session longue, l'accumulateur
  interne dépasse plusieurs milliers de radians : `atan2(z,-x)` du picking (:217)
  reste juste mais la précision flottante et la lisibilité du cap se dégradent.
- **Solution** : `readOrientation()` reconstruit le cap réel depuis le point avant
  renvoyé par `debugPick(centre)` : avec
  `P = (-sin(yaw)cos(pitch), sin(pitch), cos(yaw)cos(pitch))`, on a
  `pitch = asin(y)` et `yaw = atan2(-x, z)`, puis `wrapPi()` ramène dans `[-π, π]`.
  Tout incrément injecté est borné à ±π par frame dans `tick()`. Le HUD affiche
  la **longitude au centre** (`λ = π/2 − yaw`), grandeur vérifiable.
  *Limite assumée* : rebaser l'accumulateur interne du moteur exigerait une écriture
  dans `globe-engine.js`, hors périmètre ; correctif proposé en remontée (M09) :
  `state.globeGroup.rotation.y = wrapPi(state.globeGroup.rotation.y)` en fin de `frame()`.
- **Impact sur l'évidence** : le cap annoncé est toujours dans `[-180°, +180°]`,
  aucune valeur absurde n'est exposée au lecteur d'écran.
- **Risque** : un rebasing interne mal calibré produirait un saut de 2π ; invisible
  visuellement mais à coordonner avec le propriétaire du moteur.
- **Effort** : M.
- **Vérification** : faire tourner plusieurs minutes → texte du HUD toujours dans
  `[-180, 180]` ; lire `debugPick(centre)` avant/après recentrage → même point local.

---

## M04-04 — Tangage non borné pendant l'inertie (P1)

- **Preuve** : le moteur clamp le seul **glisser** à `[-1,15, 1,15] rad` (:378).
  Toute rotation ajoutée par un greffon écrirait `rotation.x` hors de cette borne
  et retournerait la sphère : `asin(y)` du picking (:216) devient ambigu, les pôles
  passent devant la caméra.
- **Solution** : la borne `PITCH_LIMIT = 1,15` est réappliquée à chaque écriture
  cible (`startTween`, `applyInstant`) et le moteur reclampe déjà les `pointermove`
  synthétiques de l'inertie. La vitesse verticale est en outre amortie ×0,6 dans
  `onUp()` : un lancer très vertical ne déséquilibre pas la scène.
- **Impact sur l'évidence** : l'horizon reste lisible, aucune image n'est retournée,
  le picking reste cohérent avec la texture.
- **Risque** : les pôles restent inaccessibles ; c'est déjà une règle du moteur,
  honorée et non contournée.
- **Effort** : S.
- **Vérification** : lancer vertical maximal → `rotation.x` reste dans `[-1,15, 1,15]` ;
  `readOrientation().pitch` identique après 1,2 s d'inertie.

---

## M04-05 — Aucun retour à l'orientation de référence (P1)

- **Preuve** : `BASE_YAW = -2,18`, `BASE_PITCH = 0,16` (:75-76) servent uniquement à
  l'initialisation (`buildScene`, :134). Ni `open()` (:660-669), ni `setAutoRotate()`
  (:306-315) ne restaurent cette attitude : après un glisser, l'utilisateur n'a aucun
  moyen de revenir à la vue de départ et « perd le Nord ».
- **Solution** : bouton `#m04-recenter` (36 px min, `aria-label`, `aria-keyshortcuts="0"`)
  et touche `0` quand le focus est dans la scène. Attitude cible = constantes du moteur,
  interpolée en **420 ms** avec `easeOutCubic` (`1-(1-t)^3`) par le plus court chemin
  angulaire (`shortest = wrapPi(to-from)`). En mouvement réduit, application instantanée
  (`applyInstant`) sans rAF. L'ouverture du pilote virtuel (`beginDrive`) met le moteur
  en pause d'auto-rotation via son `pointerdown` (:329-333) et le `pointerup` final
  reprogramme la reprise habituelle (:411) : la préférence utilisateur n'est jamais
  modifiée (contrairement à `setAutoRotate(false)` qui écrase `autoRotateEnabled`).
- **Impact sur l'évidence** : retour reproductible et audible (`ctx.say`), sans changer
  le zoom (`camera.position.z` intact, contrairement à `reveal`).
- **Risque** : le bouton `#m04-recenter` est distinct de `#globe-controls` et ne
  modifie pas le `aria-pressed` de « Rotation active/inactive » de `globe.js:351-362`.
- **Effort** : M.
- **Vérification** : glisser puis `0` → `debugPick(centre)` revient au point de départ
  à ± 0,01 rad ; annonce « Vue recentrée... » dans `#globe-live`.

---

## M04-06 — Le pays sélectionné n'est jamais centré (P2)

- **Preuve** : `selectCountry()` (`globe.js:415-418`) et `setSelected()`
  (`globe-engine.js:122-126`) ne font que colorer l'uniforme `uSelected` ; aucune
  rotation n'amène le pays actif devant la caméra. Le lien entre la liste des dix
  pays et la sphère est donc purement cognitif.
- **Solution** : bouton `#m04-center` (désactivé si aucun pays). Le centre du pays
  est tiré de `country.bounds` (moyenne de `minLon/maxLon` et `minLat/maxLat`,
  données réelles du `dataset.js`, aucune invention). Relation géométrique démontrée
  depuis `codeAtLocalPoint` (:213-223) : face caméra, `yaw = π/2 − λ` et
  `pitch = φ`, avec `pitch` clamp à 1,15. Tween de 420 ms, plus court chemin,
  via le même pilote que M04-05. Le survol (`ctx.onHover`) fournit un repli quand
  aucun pays n'est encore sélectionné.
- **Impact sur l'évidence** : le pays nommé dans le texte est effectivement au
  centre de la sphère ; l'annonce `Globe centré sur {nom}.` lie les deux canaux.
- **Risque** : ne pas confondre avec le zoom de transition de `globe-reveal.js` :
  M04 ne touche jamais à `camera.position.z` ni au focus DOM.
- **Effort** : M.
- **Vérification** : sélectionner le Japon puis `#m04-center` → `debugPick(centre).code === 'JP'`
  ; pays sans `bounds` → message « Coordonnées... indisponibles », aucune rotation.

---

## M04-07 — Orientation invisible et inaudible (P2)

- **Preuve** : le canvas est `aria-hidden="true"` (:601) et la sphère ne porte aucun
  repère de cap. Le HUD existant (`globe.js:329-337`) affiche le statut et le survol,
  jamais l'attitude : un utilisateur lecteur d'écran ou ayant perdu le cap ne peut
  pas savoir où il regarde.
- **Solution** : panneau `#m04-panel` avec une boussole décorative (`aria-hidden`,
  aiguille CSS `rotate()`), un texte visible `#m04-orientation`
  « Centre du globe : 145,2° O · 9,2° N » calculé depuis `readOrientation()`,
  et une région `#m04-live` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`)
  hors de `#app` (survit au `innerHTML` de la coque). Annonce **throttlée à 500 ms**
  pour éviter le bavardage ; aucune information portée par la seule couleur.
- **Impact sur l'évidence** : « où suis-je » est lisible et audible, avec une grandeur
  chiffrée (longitude/latitude du centre) recalculée depuis `debugPick`, pas devinée.
- **Risque** : la boussole étant `aria-hidden`, aucun doublon vocal avec le texte ;
  le live de M04 reste distinct de `#globe-live` de `globe.js:73-85`.
- **Effort** : M.
- **Vérification** : tourner de 90° → texte et aiguille cohérents ; lecteur
  d'écran : une annonce au plus toutes les 500 ms ; aucun « N » lu deux fois.

---

## M04-08 — Gestes de rotation non découvrables, conflit de scroll (P2)

- **Preuve** : le canvas GL n'a ni `cursor: grab`, ni `touch-action: none`
  (`globe-engine.js:591-603` pose seulement `className = 'globe-webgl'` et
  `aria-hidden`). Sur mobile, un glisser horizontal peut être intercepté par le
  défilement de la page, et l'absence de retour visuel fait croire à une sphère figée.
- **Solution** : bloc `#monde-m04` injecté via `ctx.css` :
  `#globe-canvas canvas.globe-webgl{cursor:grab;touch-action:none}` et
  `#globe-canvas.m04-dragging canvas.globe-webgl{cursor:grabbing}` ; la classe
  `m04-dragging` est posée en phase de capture sur `#globe-canvas`. Les cibles
  `#m04-*` font **36 px min** avec `touch-action:manipulation` ; le panneau est
  `pointer-events:none` avec enfants en `auto`, donc il ne bloque pas le canvas.
- **Impact sur l'évidence** : l'affordance de rotation est visible avant le geste,
  et le doigt ne déclenche pas un scroll parasite.
- **Risque** : `touch-action:none` est limité au canvas ; le HUD, la liste des pays
  et `.globe-controls` restent défilables (vérifié à 390×844).
- **Effort** : S.
- **Vérification** : `getComputedStyle(canvas).cursor === 'grab'` au repos,
  `'grabbing'` pendant le glisser ; `scrollY` invariant après un glisser horizontal
  sur le canvas ; `getBoundingClientRect()` des trois boutons ≥ 36 px.

---

## M04-09 — Aucun geste court de reset (P2)

- **Preuve** : aucun gestionnaire `dblclick` ni double-tap n'existe dans le moteur
  (`attachInteractions`, :498-522) ; la seule sortie est le bouton Zoom/Rotation
  de `globe.js:340-364`, qui ne parle pas d'orientation.
- **Solution** : `dblclick` sur le canvas et détection d'un double-tap
  (< **300 ms**, < **12 px**, sans aléa) dans `onUp()` → `recenter()`.
  Le double-tap est **différé d'une rAF** : il doit attendre que le vrai
  `pointerup` ait atteint le moteur avant d'ouvrir le pilote virtuel, sinon
  `onPointerDown` (:343-351) verrait deux pointeurs et activerait le pinch.
  Le clic simple du moteur n'est pas modifié.
- **Impact sur l'évidence** : geste conventionnel « reset view » disponible
  souris comme au doigt, sans chercher un bouton.
- **Risque** : un double-clic sur un pays peut déclencher la sélection normale du
  moteur au premier clic ; ce n'est pas une sélection inventée, et le recentrage
  ne l'annule pas (cohérent avec `selectCountry`).
- **Effort** : S.
- **Vérification** : deux clics rapides sur le canvas → orientation de référence ;
  un clic isolé → aucun recentrage ; aucun `pinching` résiduel (rotation non bloquée).

---

## M04-10 — Boucle M04 non coordonnée avec le cycle de vie (P1)

- **Preuve** : le moteur arrête sa boucle sur `document.hidden` (:447, :488-496) et
  coupe l'auto-rotation sur `prefers-reduced-motion` (:317-327), mais toute rAF
  ajoutée par un greffon survivrait à `engine.close()` (changement de vue,
  `globe.js:152-169`) ou à un basculement de préférence en cours de geste :
  écritures sur une scène fermée et frames gaspillées. `flushMondeReady` pouvant
  être appelé à chaque rendu, une inscription non gardée empilerait les écouteurs.
- **Solution** : une seule rAF (`loop.raf`), gardée par `installed` (module) et par
  `dataset.m04Dbl` sur le canvas. `tick()` teste à chaque frame `isFrozen()` =
  `reducedMotion() || document.hidden || store.view !== 'globe'` → `stopLoop()`.
  `watchMotion()` écoute `matchMedia('(prefers-reduced-motion: reduce)')` (`change`,
  avec repli `addListener`) et `visibilitychange` : bascule en cours → arrêt immédiat,
  `inertiaOn = false`, bouton `aria-pressed="false"` et désactivé. Aucun `setInterval`,
  aucun écouteur qui se ré-inscrit.
- **Impact sur l'évidence** : respect de la règle « une seule boucle rAF + pause sur
  `document.hidden` » et zéro écriture hors écran, y compris en iframe/base de vue.
- **Risque** : `stopLoop()` déclenche un `pointerup` synthétique qui reprogramme la
  reprise auto du moteur (3,8 s) ; c'est le comportement normal du moteur, et il est
  neutralisé par `reducedMotion` côté moteur (:298-299).
- **Effort** : M.
- **Vérification** : lancer une inertie puis changer d'onglet Vue → aucune frame M04
  après 1 frame ; activer `prefers-reduced-motion` en direct → arrêt immédiat,
  `#m04-inertia[aria-pressed="false"]` et `disabled` ; 20 rendus successifs →
  un seul `#m04-panel`, un seul `dblclick`, une seule boucle.

---

## Synthèse

| Chantier | Priorité | État | API moteur mobilisée |
| --- | --- | --- | --- |
| M04-01 Inertie de lancer | P1 | implémenté | pointers synthétiques sur canvas |
| M04-02 Friction bornée | P1 | implémenté | `invalidate`, `setAnimationLoop` |
| M04-03 Cap normalisé | P1 | implémenté (partiel : accumulateur interne hors périmètre) | `debugPick` |
| M04-04 Tangage borné | P1 | implémenté | clamp du `pointermove` moteur |
| M04-05 Recentrage | P1 | implémenté | `pointerdown/up` synthétiques |
| M04-06 Centrage pays | P2 | implémenté | `debugPick`, `bounds` du dataset |
| M04-07 Repère d'orientation | P2 | implémenté | `debugPick`, `ctx.say` |
| M04-08 Affordance / touch-action | P2 | implémenté | CSS `ctx.css` |
| M04-09 Double-clic / double-tap | P2 | implémenté | `pointerup` capture + `dblclick` |
| M04-10 Cycle de vie rAF | P1 | implémenté | `visibilitychange`, `matchMedia` |

### Vérification demandée

- `node --check src/views/monde/M04.js` uniquement (aucune autre suite relevée par la lentille).
- Résultat : **OK** (aucune erreur de syntaxe).
- Motifs interdits : 0 `Math.random`, 0 `console.*`, 0 `fetch`/URL distante, 0 fichier modifié
  autre que `src/views/monde/M04.js` et le présent rapport.

### Questions aux autres experts (arbitrage)

- **M09 (contexte WebGL)** : acceptez-vous d'ajouter une ligne
  `rotation.y = wrapPi(rotation.y)` en fin de `frame()` pour residualiser le cap interne ?
  M04 ne peut pas l'écrire sans toucher au moteur ; notre normalisation ne couvre que l'affichage.
- **M07 (boucle rAF)** : la rAF unique de M04 est suspendue sur `document.hidden` et
  sur `store.view !== 'globe'` ; confirmez que `flushMondeReady` n'est pas appelé après
  un `engine.close()` pour que `isFrozen()` reste la seule porte de décision.
