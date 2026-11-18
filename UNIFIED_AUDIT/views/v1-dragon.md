# V1 · Queue du dragon — audit frontend (10 chantiers)

> Vue `v1-dragon` — périmètre exclusif : `dragon.js`. Rapport produit dans le cadre du hub `UNIFIED_AUDIT`.
> Références : `DRAGON_TIMELINE.md` §6/§8, `EVENT_IMAGES.md` « Règles », `APP_PLAN.md` §9/§10, `index.html` (overlay dragon), `styles.css` (bloc dragon).

## V1-DRAGON-01 — Boucle rAF : reprise après `document.hidden` et singularités du rafraîchissement

- **Problème / preuve :** `dragon.js:961` — `frame()` commence par `if (!state.open || document.hidden) return;` **après** avoir remis `state.raf = 0` (`:960`). Si l'onglet passe en arrière-plan pendant une interpolation, aucun frame n'est reprogrammé (`:970` n'est jamais atteint) : `state.p` reste bloqué sur une valeur intermédiaire, la caméra et la fiche ne se stabilisent plus jamais au retour. Corollaire : `dragon.js:1131` (`loadCountry`), `:1145` (`open`), `:1360` (`setCountry`) et `:973-981` (`resize`) appellent `render()` / `renderScene()` + `updateTiles()` **synchronous hors de la boucle**, ce qui multiplie les rendus par frame et contourne le budget unique. Enfin `:964` (`p += diff * 0.16`) est un pas par frame : l'animation est ~2× plus rapide à 120 Hz qu'à 60 Hz, contredisant `DRAGON_TIMELINE.md:192`.
- **Solution :** un seul chemin de rendu. `requestRender()` est la seule porte d'entrée ; `frame()` calcule un `dt` borné, applique un facteur `1 - (1-0.16)^(dt/(1000/60))`, et reprogramme tant que `p !== target`. Ajouter un écouteur `visibilitychange` qui annule le rAF en arrière-plan et le relance au retour avec `lastFrame = 0`. Remplacer les `render()` synchrones par `requestRender()` ; `resize()` ne fait plus que dimensionner le renderer puis planifier un frame.
- **Impact :** fiabilité de la navigation (plus de caméra figée), cohérence 60/120 Hz, respect de « un seul frame = un seul rendu » (`DRAGON_TIMELINE.md:188`).
- **Risque :** faible — le rendu au repos doit rester nul ; à vérifier sur l'ouverture froide où `loadCountry()` prépare la scène avant que `state.open` ne soit vrai.
- **Effort :** M.
- **Vérification :** `node --check` ; ouvrir le dragon, lancer une flèche, basculer d'onglet 2 s, revenir : `VECTEMPOREL_DRAGON.state().p === target`. Compter les appels à `renderer.render` sur 1 s au repos : 0.

## V1-DRAGON-02 — Suspension hors écran : IntersectionObserver et vues couvrantes

- **Problème / preuve :** `dragon.js:961` ne teste que `document.hidden` et `state.open`. Le Récit (`story-overlay`) et le Lecteur (`reader-overlay`, `app.js:1349`) s'ouvrent **par-dessus** le dragon sans le fermer (`state.open` reste `true`) : si une interpolation est en cours, WebGL continue de dessiner derrière un panneau opaque. Aucun `IntersectionObserver` n'est utilisé dans `dragon.js`, alors que le canevas peut être masqué/réduit (overlay `hidden`, `display:none` mobile, fenêtre redimensionnée).
- **Solution :** observer `#spiral-stage` avec `IntersectionObserver` (seuils `0`, `0.01`, `0.25`) ; suspendre et annuler le rAF si `intersectionRatio <= 0.01`. Ajouter `isCovered()` qui teste `hidden` + `.is-open` sur `story-overlay` et `reader-overlay`, intégrée à `requestRender()`/`frame()`. Un `MutationObserver` sur les attributs `class`/`hidden` de ces overlays relance `requestRender()` à la fermeture.
- **Impact :** consommation GPU nulle quand la vue n'est pas visible ; cohérent avec `APP_PLAN.md:189` (rendu à la demande).
- **Risque :** moyen — l'observer doit être installé après `cacheElements()` et ne pas réveiller la boucle quand `state.open` est faux ; les seuils doivent éviter le clignotement au redimensionnement.
- **Effort :** M.
- **Vérification :** ouvrir le dragon, appuyer sur `R` pendant une interpolation : aucun `requestAnimationFrame` supplémentaire ; fermer le Récit : l'interpolation reprend et atteint `target`.

## V1-DRAGON-03 — DPR figé : flou au zoom navigateur et au changement d'écran

- **Problème / preuve :** `dragon.js:333` — `setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))` n'est appelé **qu'une fois** dans `ensureRenderer()`. `resize()` (`:973-981`) appelle seulement `setSize()`. Or un zoom navigateur à 200 % ou le déplacement de la fenêtre vers un écran à DPR différent modifie `devicePixelRatio` **sans modifier les dimensions CSS** : le `ResizeObserver` (`:336-337`) ne se déclenche pas, le canvas reste à l'ancien ratio et devient flou. La borne basse n'est pas non plus posée explicitement (un DPR exotique < 1 est accepté).
- **Solution :** helper `pixelRatio()` = `clamp(devicePixelRatio || 1, 1, 1.6)` ; `syncPixelRatio()` compare au dernier ratio mémorisé et n'appelle `setPixelRatio()` que si l'écart dépasse 0,01. Appel depuis `ensureRenderer()`, `renderScene()` et un écouteur `window.resize` (en plus du `ResizeObserver`).
- **Impact :** netteté à 100 % et 200 %, plafond de 1,6 conservé (`DRAGON_TIMELINE.md:189`), pas de sur-coût de pixels sur écran 3×.
- **Risque :** faible — `setPixelRatio()` appelle `setSize()` en interne ; l'ordre `setPixelRatio` puis `setSize(w,h,false)` doit être conservé dans `resize()`.
- **Effort :** S.
- **Vérification :** à 100 % puis 200 % de zoom, `renderer.getPixelRatio()` vaut respectivement `min(dpr,1.6)` recalculé ; `renderer.domElement.width === Math.round(clientWidth * ratio)`.

## V1-DRAGON-04 — Recyclage des écailles : 21 tuiles au lieu de 15, churn DOM et reload d'images

- **Problème / preuve :** `dragon.js:568-569` — `from = floor(focus) - 9`, `to = ceil(focus) + 11` crée **21 à 22** tuiles simultanées, alors que `DRAGON_TIMELINE.md:186` et `:143` specifient « 15 écailles DOM recyclées ». Surtout, `:629-635` supprime littéralement les éléments (`el.remove()`) à la sortie de fenêtre et `:575-579` les recrée avec `makeTile()` à l'entrée : chaque franchissement d'indice détruit/reconstruit des boutons, des `<g>` SVG et relance le chargement des `<img loading="lazy">` (`:544-555`). Aucun pool de réemploi.
- **Solution :** resserrer la fenêtre à `HALF_BACK = 7`, `HALF_FWD = 7` (`to = ceil(focus) + 6`, soit 14–15 tuiles max) ; séparer `makeTile()` (création nue, une seule fois) de `bindTile(el, index)` (mise à jour du libellé, de l'art et des classes) ; conserver les éléments sortants dans `state.tilePool` (désactivés, `tabindex=-1`, retirés du DOM) et les réutiliser à l'entrée.
- **Impact :** conformité au chiffre documenté, division par ~1,4 du nombre de nœuds et de connectors SVG, suppression du churn d'images pendant le défilement.
- **Risque :** moyen — `bindTile()` doit réinitialiser `_link`, `_z`, `_isFocus`, `_isPast`, `_isFuture` et lever le `disabled`, sinon des connecteurs orphelins ou des tuiles invisibles subsistent.
- **Effort :** M.
- **Vérification :** `#dragon-tiles > button` ≤ 15 en régime établi ; faire 40 pas avec `→` : le nombre de `document.createElement('button')` reste stable (instrumenter via un compteur) ; `#dragon-links > g` ≤ 15.

## V1-DRAGON-05 — Focus clavier sur les écailles : perte au recyclage, sémantique et anneau

- **Problème / preuve :** une écaille est un `<button>` (`:520`) donc exposée à Tab, mais `:629-635` peut supprimer l'élément **pendant qu'il a le focus** (l'utilisateur a tabulé sur une écaille lointaine puis la caméra avance) : le focus tombe sur `<body>` et le piège de `onKeyDown` (`:1231-1244`) perd son point d'entrée. Le libellé (`:529`) ne dit ni la position (`3 / 57`) ni l'état (courante/passée/future), et aucun `aria-current` n'est posé sur `:613-616`. L'anneau global (`styles.css:69-74`) fait 1 px et est **mis à l'échelle** par le `scale(...)` de `:606` (jusqu'à ~0,2 pour les écailles lointaines) : il devient subpixel et invisible.
- **Solution :** exclure du recyclage l'index de l'élément actif (`document.activeElement.closest('.dragon-tile')`) ; recalculer l'`aria-label` à chaque changement d'état avec `Écaille X / N · courante|plus ancienne|plus récente` ; poser `aria-current="true"` sur l'écaille courante uniquement (pas `aria-pressed` : ce n'est pas une bascule indépendante) ; injecter `#v1-dragon-css` avec `.dragon-tile:focus-visible { outline:2px solid …; outline-offset:3px; opacity:1 !important; z-index:260 !important; }` et une classe `.is-keyboard-focus` pilotée par `focusin`/`focusout`.
- **Impact :** navigation clavier ininterrompue, orientation des lecteurs d'écran, focus visible quoi que soit le zoom de l'écaille (WCAG 2.4.7 / 2.4.11).
- **Risque :** moyen — garder une 16ᵉ tuile focalisée hors fenêtre est volontaire ; il faut la libérer au `focusout` pour ne pas augmenter le budget.
- **Effort :** M.
- **Vérification :** tabuler sur une écaille lointaine puis appuyer 10× sur `→` : `document.activeElement` reste le bouton ; `aria-current` n'apparaît que sur une seule tuile ; capture d'écran à 200 % de zoom montrant l'anneau.

## V1-DRAGON-06 — Live region bavarde et légendes d'images non vérifiées

- **Problème / preuve :** `index.html:316` déclare toute la fiche `<aside class="dragon-card" aria-live="polite">`, et `dragon.js:731-733` réécrit `els.position.textContent` **à chaque frame** (y compris quand l'indice arrondi n'a pas changé) : mutation répétée dans une région live → annonces parasite pendant toute l'animation. Par ailleurs, quand une image documentaire n'a pas de légende, `:667` et `:800` fabriquent un `alt` « Illustration : <titre de l'événement> » et `:673`/`:804` utilisent le titre de l'événement comme légende : c'est exactement ce qu'interdit `EVENT_IMAGES.md:10-11` (« la légende décrit ce que montre l'image ») et `APP_PLAN.md:176`.
- **Solution :** neutraliser `aria-live` sur la fiche (`els.card.setAttribute('aria-live','off')`) et créer un `<div role="status" aria-live="polite" aria-atomic="true" class="dragon-visually-hidden">` dédié ; n'annoncer que lors du changement d'indice arrondi (`state.cardIndex`) avec une phrase courte incluant rang/titre/année. Ne plus réécrire `els.position` que si le texte change. Remplacer les replis par `real.caption || real.alt || 'Illustration documentaire · légende non renseignée'` et un `alt` neutre quand aucune métadonnée vérifiée n'existe ; associer la légende à l'image via `aria-describedby`.
- **Impact :** annonces utiles et non redondantes ; aucune légende inventée ; conformité au contrat de contenu.
- **Risque :** faible — la région `role="status"` doit être ajoutée au DOM **avant** la première annonce, sinon celle-ci est perdue.
- **Effort :** M.
- **Vérification :** avec NVDA/VoiceOver, parcourir 5 écailles : 5 annonces, pas de répétition pendant le glissement ; inspecter une image sans `caption` : la légende ne contient pas le titre de l'événement.

## V1-DRAGON-07 — `prefers-reduced-motion` ignoré par le moteur d'animation

- **Problème / preuve :** les deux blocs CSS (`styles.css:5021-5026`, `:7920-7932`) désactivent le grain, l'atmosphère et l'animation d'entrée de la fiche, mais le mouvement principal reste piloté par JS : `dragon.js:964` (`p += diff * 0.16`) produit un glissement continu de la caméra, et `:881-885` / `:877-779` rejouent des transitions à chaque changement de fiche. Un utilisateur ayant activé « réduire les animations » subit donc toujours le zoom animé.
- **Solution :** `const MOTION = matchMedia('(prefers-reduced-motion: reduce)')` ; dans `frame()`, si `MOTION.matches`, poser `state.p = state.target` d'emblée (saut discret, aucun interpolated frame) ; écouter `MOTION.addEventListener('change', …)` pour basculer à chaud ; injecter dans `#v1-dragon-css` un `@media (prefers-reduced-motion: reduce)` qui neutralise les transitions de `.dragon-detail`, `.dragon-detail-sheet`, `.dragon-rail span` et `.dragon-depth-segment` non couvertes par les blocs existants.
- **Impact :** respect de `APP_PLAN.md:188` et WCAG 2.3.3 ; économie de frames.
- **Risque :** faible — le saut direct doit tout de même déclencher `render()` une fois pour synchroniser fiche, rail et profondeur.
- **Effort :** S.
- **Vérification :** Chromium avec `--force-prefers-reduced-motion` (ou émulation DevTools) : une flèche fait passer `p` de `n` à `n+1` en un seul frame ; aucune transition CSS détectée dans l'onglet Animations.

## V1-DRAGON-08 — Zoom/pan : deltas non bornés, seuil tactile trop faible, sensibilité dépendante de l'écran

- **Problème / preuve :** `dragon.js:1012-1014` — `onWheel()` multiplie `deltaY` (normalisé seulement par `deltaMode`) par `0.0055` sans borne : un trackpad à haute résolution ou un geste violent franchit plusieurs écailles d'un coup. `:1051` utilise un seuil de 4 px identique souris et tactile : sur mobile, un doigt qui tremble déclenche un pan et `suppressClick` (`:1054`) annule l'ouverture de l'écaille. `:1053` — `dy * 0.007 - dx * 0.0016` est exprimé en pixels absolus : le même geste parcourt ~2× plus d'écailles sur un écran de 450 px de haut que sur 900 px.
- **Solution :** borner le delta normalisé à `[-120, 120]` avant application du facteur ; conserver `0.02` sous `ctrlKey` (pincement) et `0.0055` sinon ; seuil `pointerType === 'touch' ? 8 : 4` px ; sensibilité normalisée `k = 6.3 / max(320, h)` (égale à 0,007 pour h = 900), avec composante X à `0,23·k`. Ajouter l'ère courante au `readout` pour rendre le niveau de zoom lisible.
- **Impact :** gestes prévisibles sur desktop et mobile, moins de clics accidentels, cohérence avec la carte de profondeur.
- **Risque :** faible — le bornage ne doit pas casser le pincement (déjà amplifié par `log(dist/pinchDist)` en `:1042`).
- **Effort :** S.
- **Vérification :** simulateur d'appareil 390×844 : un tap sur une écaille ouvre la fiche ; un pan de 6 px ne la déplace pas ; un wheel de `deltaY = 1000` avance d'au plus ~1,2 écaille.

## V1-DRAGON-09 — Profondeur et boutons de zoom : cibles tactiles insuffisantes et boutons masqués aux lecteurs d'écran

- **Problème / preuve :** `styles.css:4791-4813` — le rail de profondeur mesure **5 px de large** et ses segments n'ont ni `min-width` ni `min-height` : cible bien en dessous des 24×24 px de WCAG 2.5.8, et un ère à 1 repère sur 229 occupe ~0,4 % de la hauteur. `styles.css:4984-4986` le masque **entièrement** sous 900 px : plus de navigation par ère sur mobile. `index.html:303` pose `aria-hidden="true"` sur `.dragon-zoom`, qui contient deux `<button>` focusables (`:304-309`) : éléments focusables invisibles pour les lecteurs d'écran (violation ARIA). `styles.css:4859-4864` les dimensionne à **33×33 px**, sous le seuil de 36 px.
- **Solution :** depuis `#v1-dragon-css` : `::after` de 24×24 px centré sur chaque `.dragon-depth-segment` (zone tactile sans épaissir le ruban visible), réaffichage du rail sur mobile à gauche (`left:8px; right:auto`) pour ne pas chevaucher les boutons de zoom, `.dragon-zoom .dragon-zoom-button { width:44px; height:44px; }` ; retirer `aria-hidden` du conteneur via JS et préciser les `aria-label` (« Plonger d'une écaille vers les origines »). Poser `aria-current="true"` sur le segment de l'ère courante dans `updateDepth()`.
- **Impact :** navigation par ère utilisable au doigt et au lecteur d'écran sur tous les formats ; cibles conformes.
- **Risque :** moyen — sur mobile, le rail réaffiché ne doit pas recouvrir la fiche (hauteur `46vh`) ni les boutons ; vérifier l'empilement `z-index` 12/14.
- **Effort :** M.
- **Vérification :** à 390×844, toucher le segment d'une ère d'un seul repère : `p` rejoint son `startIndex` ; les deux boutons mesurent 44×44 et sont annoncés par le lecteur d'écran.

## V1-DRAGON-10 — État vide et gardes de données : plantage au lieu d'un message explicite

- **Problème / preuve :** `dragon.js:1141` — `COUNTRIES[0].id` est déréférencé sans garde : si `DATA` est chargé mais sans pays pourvu d'événements (`COUNTRIES` est filtré en `:25`), `open()` lève une `TypeError` et l'overlay reste invisible. `dragon.js:1137` — `if (!els.overlay || !THREE || !DATA) return;` sort silencieusement sans rien afficher. `:145` (`eraIndexForYear` parcourt `country.eras`) et `:899` (`state.story.country.domain[0]`) supposent des tableaux présents. `APP_PLAN.md:179` exige au contraire des états vides explicites.
- **Solution :** garder `eras`/`domain` dans `prepareStory()` (tableaux vides par défaut, `domain` stocké dans `state.story`) ; faire de `open()` un chemin « vide » qui affiche dans le stage un paragraphe `#dragon-empty` : « Aucun repère historique vérifié n'est disponible dans le corpus actuel. », garde l'overlay ouvrable et le bouton Fermer focusable, et désactive les contrôles de navigation ; protéger `clampedTarget`, `step`, `goTo` et la branche `End` de `onKeyDown` (`:1227`) contre `state.story === null`.
- **Impact :** plus d'exception bloquante, message conforme à `APP_PLAN.md:179`, dégradation gracieuse si WebGL ou les données manquent.
- **Risque :** faible — le chemin vide ne doit pas instancier `WebGLRenderer` ni appeler `buildScene()`.
- **Effort :** M.
- **Vérification :** en console, remplacer `VECTEMPOREL_DATA` par un objet sans pays puis appeler `VECTEMPOREL_DRAGON.open()` ; aucun `pageerror`, `#dragon-empty` visible, `Échap` referme et rend le focus.

---

## Synthèse

| Chantier | Effort | Priorité |
| --- | --- | --- |
| V1-DRAGON-01 boucle rAF / reprise | M | 1 |
| V1-DRAGON-02 suspension hors écran | M | 2 |
| V1-DRAGON-03 DPR | S | 3 |
| V1-DRAGON-04 pool 15 écailles | M | 4 |
| V1-DRAGON-05 focus clavier | M | 5 |
| V1-DRAGON-06 live + légendes | M | 6 |
| V1-DRAGON-07 reduced motion | S | 7 |
| V1-DRAGON-08 zoom/pan mobile | S | 8 |
| V1-DRAGON-09 cibles profondeur/zoom | M | 9 |
| V1-DRAGON-10 état vide | M | 10 |

---

## Implémentation et vérifications (post-audit)

Les 10 chantiers ont été implémentés **dans `dragon.js` uniquement**. Aucun autre fichier de code n'a été modifié ; les corrections CSS sont injectées sous `<style id="v1-dragon-css">` par le module (aucune édition de `styles.css`).

| Chantier | Statut | Point de vérification |
| --- | --- | --- |
| 01 | livré | `frame()` calculé sur `dt`, `visibilitychange` avec reprise, plus aucun `render()` synchrone hors boucle ; sonde navigateur : `p` rejoint `target` après un passage en arrière-plan. |
| 02 | livré | `IntersectionObserver` sur `#spiral-stage`, `isCovered()` + `MutationObserver` sur `story-overlay`/`reader-overlay`. |
| 03 | livré | `pixelRatio() = clamp(dpr, 1, 1.6)`, `syncPixelRatio()` appelé au `resize`, au `renderScene` et sur `window.resize` ; sonde CDP à `deviceScaleFactor:2` → `getPixelRatio() = 1.6`. |
| 04 | livré | fenêtre `HALF_BACK/HALF_FWD = 7` (14–15 tuiles), `makeTile()`/`bindTile()` séparés, `state.tilePool` ; sonde à `p≈25` : 15 tuiles, 15 connectors, 10 éléments recyclés en pool. |
| 05 | livré | index focalisé exclu du recyclage, `aria-current` unique, libellé rangé/étaté, `:focus-visible` renforcé ; sonde : 12 pas successifs sans perte de focus. |
| 06 | livré | `aria-live="off"` sur la fiche, `role="status"` dédié, `position` writer conditionnel, légendes/alt sans invention, `aria-describedby`. |
| 07 | livré | `matchMedia('(prefers-reduced-motion: reduce)')` : saut direct à `target` + overrides CSS injectés ; sonde avec média émulé : `p = target` en un frame. |
| 08 | livré | delta molette borné à ±120, seuil 8 px au toucher, sensibilité `6.3/max(320,h)`, ère ajoutée au readout. |
| 09 | livré | `aria-hidden` retiré, boutons 44×44, zones tactiles 24×24, rail réaffiché à gauche sous 900 px, `aria-current` sur l'ère ; sonde 390×844 : rail à `x=8`, zoom à `x=334`. |
| 10 | livré | gardes `eras`/`domain`, message `#dragon-empty`, chemins `open()`/`onKeyDown` protégés ; sonde avec `data.js` bloqué : message visible, zéro `pageerror`. |

**Commandes :** `node --check dragon.js` → OK. `npm run test:e2e` → 6/14, **échecs préexistants et hors périmètre** : ils se reproduisent identiquement quand `dragon.js` est bloqué au niveau réseau (sonde Puppeteer) — la touche `Entrée` n'ouvre pas le lecteur car le focus reste sur `world-btn` (`app.js`/`solar.js`/routeur clavier, vues `v1-systeme-solaire` et `atlas-coque-navigation`). Aucune erreur console attribuable à `dragon.js`. Note : l'exécution du test régénère `E2E_REPORT.md` (rapport, non code).
