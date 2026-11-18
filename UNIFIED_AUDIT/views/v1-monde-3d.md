# Audit de la vue `v1-monde-3d` — Monde 3D / Plan (V1)

> Vue attribuée : globe WebGL de sélection des pays, sélecteur de pays (liste + recherche), Plan (menu principal).
> Fichiers possédés : `globe-engine.js`, `plan.js`. Dépendances lues (non modifiables ici) : `index.html`, `styles.css`, `app.js`, `keyboard-router.js`, `README.md`, `APP_PLAN.md`.
> 10 chantiers, priorité décroissante. Aucune date, citation ni donnée historique inventée.
> Les numéros de ligne des fichiers **non possédés** (`app.js`, `solar.js`, `styles.css`, `index.html`, `keyboard-router.js`) ont été relevés en début d'audit ; ces fichiers ont été modifiés en parallèle par d'autres sous-agents et leurs lignes ont pu se décaler.

## Synthèse

| # | Chantier | Priorité | Effort |
| --- | --- | --- | --- |
| 01 | Canvas WebGL invisible aux lecteurs d'écran et pilotable seulement à la souris | P0 | M |
| 02 | Survol / sélection jamais repeints : `state.hovering` n'existe pas, rendu à la demande absent | P0 | M |
| 03 | Plan : flèches linéaires sur une grille 2×2, focus volé au survol, double piège de focus | P0 | M |
| 04 | Boucle rAF permanente au repos et `prefers-reduced-motion` ignoré par la boucle | P1 | S |
| 05 | Deep link / état vide des 186 audits à venir et de la recherche à 0 résultat | P1 | S |
| 06 | Aucun zoom clavier ni bouton de zoom ; consigne incomplète | P1 | S |
| 07 | Cibles tactiles 32 px et corps 7–8,5 px : seuils WCAG 2.2 non tenus | P1 | S |
| 08 | Aucune gestion de `webglcontextlost` / `webglcontextrestored` | P2 | S |
| 09 | `prefers-reduced-motion` non réévalué en direct ; transitions CSS non neutralisées | P2 | S |
| 10 | DPR / budget de pixels non instrumentés, pas de garde-fou zoom 200 % | P2 | S |

---

## V1-MONDE-01 — Canvas WebGL invisible aux lecteurs d'écran et pilotable seulement à la souris

- **Problème / preuve** : `globe-engine.js:430` pose `aria-hidden="true"` sur le canvas ; aucun `tabindex`, `role` ni `aria-label` (le canvas n'est pas dans l'ordre de focus). `globe-engine.js:273–359` ne branche que `pointerdown/move/up`, `wheel` et `contextmenu` : aucune touche ne tourne, ne zoome ni ne choisit un pays sur le globe. `onGlobalKeydown` de `app.js:1120–1142` ne traite, globe ouvert, que `Échap` et `Tab`. Le `role="listbox"` de `index.html:259` est le seul repli, sans équivalent pour l'orientation spatiale du globe.
- **Solution** : retirer `aria-hidden`, exposer `role="application"`, `tabindex="0"`, `aria-label` et `aria-keyshortcuts` ; ajouter un gestionnaire **window en phase capture** (il doit devancer `keyboard-router.js:59–63`, qui appelle `stopImmediatePropagation`) pour Flèches (rotation), `+`/`−` (zoom), `0` (recadrage), `Entrée` (sélection du pays au centre via un picking du point monde `(0,0,1)`). Ajouter une description textuelle et un `role="status" aria-live="polite"` annonçant le pays survolé/au centre avec son statut (« frise disponible » / « audit à venir ») lu depuis `window.VECTEMPOREL_ATLAS`. Ignorer les touches quand le focus est dans un champ ou dans le panneau latéral.
- **Impact attendu** : le choix d'un pays devient possible sans souris et sans vision ; conformité avec `APP_PLAN.md` §7 (contrat clavier) et §10 (focus visible / déplacé).
- **Risque** : capture trop large → vol des flèches destinées à la liste. Mitigation : garde `INPUT/TEXTAREA/SELECT` + `.globe-panel`.
- **Effort** : M.
- **Indicateur de vérification** : on peut focaliser `.globe-webgl`, tourner avec `→`, lire « pays au centre : … » dans le live region et sélectionner avec `Entrée` ; la recherche reste saisissable.

## V1-MONDE-02 — Survol / sélection jamais repeints : `state.hovering` n'existe pas, rendu à la demande absent

- **Problème / preuve** : `globe-engine.js:365` lit `state.hovering`, propriété absente de l'état déclaré en `globe-engine.js:21–59` (seul `hoverCode` existe) : le survol ne déclenche jamais de frame. Pire, `pointerenter` appelle `pauseAutoRotate` (`globe-engine.js:394`), donc `moving` passe à `false` dès que l'utilisateur entre sur le globe : la mise en évidence du pays (`uHover`, `globe-engine.js:82–94`) et la sélection (`uSelected`, `globe-engine.js:72–80`) ne sont jamais dessinées. `resize()` (`globe-engine.js:169–183`) modifie la taille du dessin sans redemander de frame : après redimensionnement ou zoom navigateur, l'image reste étirée jusqu'à la prochaine rotation.
- **Solution** : initialiser `hovering`, le tenir à jour dans `setHover`, et introduire un drapeau `needsRender` + `requestRender()` appelé par `setHover`, `setSelected`, `resize`, zoom, rotation, restauration de contexte. Rendre dans `frame()` quand `moving || needsRender`, puis remettre le drapeau à `false`.
- **Impact attendu** : retour visuel immédiat du survol et de la sélection, image correcte après resize, sans ajouter de boucle.
- **Risque** : rendus redondants si `requestRender()` est appelé depuis la boucle. Mitigation : `requestRender()` ne fait que poser le drapeau + relancer une boucle arrêtée.
- **Effort** : M.
- **Indicateur de vérification** : `VECTEMPOREL_GLOBE.getInfo().renderCount` augmente d'au moins 1 après `setHover('FR')` alors que l'auto-rotation est à l'arrêt ; le survol colore le pays.

## V1-MONDE-03 — Plan : flèches linéaires sur une grille 2×2, focus volé au survol, double piège de focus

- **Problème / preuve** : `plan.js:162–171` incrémente/décrémente `state.selected` de 1 pour **toutes** les flèches. La grille est 2×2 (`index.html:412–441`) : `↓` depuis la carte 01 (Récit, en haut à gauche) mène à 02 (Dragon, en haut à droite) au lieu de 03 (Frise, en bas à gauche). `plan.js:211–215` appelle `updateSelection()` sur `mouseenter`, ce qui force le focus (`plan.js:43`) : un simple survol souris déplace le focus et pose un anneau. `plan.js:66–101` n'exclut pas le globe : si `globe-overlay` s'ouvre pendant que le Plan est ouvert, deux pièges de focus coexistent (`app.js:1125–1140` pour le globe, `plan.js:192–205` pour le Plan), alors que `keyboard-router.js:34–41` n'en élit qu'un.
- **Solution** : navigation 2D explicite (ligne/colonne modulo 2), `tabindex` mobile (roving) et `aria-current` sur la carte active ; `mouseenter` ne change plus le focus (`setSelected(index, false)`) ; `MutationObserver` sur l'attribut `hidden` de `#globe-overlay` pour refermer le Plan sans rendre le focus quand le globe s'ouvre ; `close({ restoreFocus: false })`.
- **Impact attendu** : flèches conformes à la disposition visuelle, focus prévisible, plus de conflit de piège.
- **Risque** : `tabindex="-1"` sur trois cartes modification du piège Tab de `app.js`. Mitigation : le piège programme `.focus()` sur les boutons, y compris those à `-1` — comportement conservé.
- **Effort** : M.
- **Indicateur de vérification** : `←/→` changent de colonne, `↑/↓` de ligne, `VECTEMPOREL_PLAN.state().selected` vaut 2 après `↓` depuis 0 ; survol souris ne change pas `document.activeElement`; ouvrir le globe referme le Plan.

## V1-MONDE-04 — Boucle rAF permanente au repos et `prefers-reduced-motion` ignoré par la boucle

- **Problème / preuve** : `globe-engine.js:378` installe `setAnimationLoop(frame)` ; `frame()` (`globe-engine.js:361–371`) est rappelé 60 fois par seconde même quand `moving` est faux (il se contente de ne pas rendre). `open()` (`globe-engine.js:495`) force `autoRotate = true` ; `prefers-reduced-motion` n'est consulté qu'à l'intérieur du test de rotation (`globe-engine.js:367`), donc avec « réduire les animations » la boucle continue de tourner à vide. `APP_PLAN.md:190` exige 60 fps au repos sans gaspiller de frames et l'§189 un rendu à la demande.
- **Solution** : `pauseLoop()` (`setAnimationLoop(null)`) dès qu'il n'y a ni rotation ni interaction ; `resumeLoop()` sur `requestRender()`, `open()` et retour d'onglet ; `scheduleAutoRotate()` ne réactive plus l'auto-rotation en mouvement réduit ; `start()/stop()` et le gestionnaire `visibilitychange` délèguent à ces deux fonctions.
- **Impact attendu** : 0 frame/s au repos, une seule boucle conservée, respect de `prefers-reduced-motion` sans casser `document.hidden`.
- **Risque** : boucle arrêtée avant qu'une rotation programmée ne reprenne. Mitigation : ne jamais annuler `autoRotateTimer` dans `pauseLoop`.
- **Effort** : S.
- **Indicateur de vérification** : après 4 s sans interaction, `getInfo().running === false` ; reprise au survol ; en mouvement réduit, `running === false` après une frame.

## V1-MONDE-05 — Deep link / état vide des 186 audits à venir et de la recherche à 0 résultat

- **Problème / preuve** : `app.js:2159–2165` : choisir un pays non disponible (186 sur 196, `countries.js` `counts.queued = 186`) se contente de `setSelected`/`setHover` et `return` — aucun changement d'état partagé, aucun message, aucun lien partageable. `app.js:2078–2092` : une recherche sans résultat met `globe-list-count` à 0 sans état vide visible ni annonce. `app.js` ne renseigne pas de paramètre de globe dans l'URL (`parseHash`, `app.js:1940–1967`).
- **Solution** (dans les fichiers possédés) : exposer `VECTEMPOREL_GLOBE.focusCountry(code)` qui met en surbrillance et fait défiler la ligne `[data-code]`, annonce le nom et le statut via le live region ; lire `?pays=XX` au démarrage dans `plan.js` (code ISO à 2 lettres, présent dans `window.VECTEMPOREL_ATLAS`), aligner l'état partagé avec `setCountry` si la frise existe, puis focaliser la ligne. Ajouter un état vide visible et un `role="status"` au-dessus de la liste, mis à jour après filtrage (`requestAnimationFrame`).
- **Impact attendu** : un pays « audit à venir » produit un retour explicite ; un lien `?pays=XX` ouvre le globe sur ce pays ; une recherche à 0 résultat est comprise.
- **Risque** : paramètre URL concurrent du hash `#/pays/…` possédé par `app.js`. Mitigation : paramètre **additif** `?pays=`, aucune écriture du hash ; coordination à signaler à l'agent maître.
- **Effort** : S.
- **Indicateur de vérification** : `?pays=FR` ouvre le globe avec la ligne FR en `is-selected` ; saisir « zzzzz » affiche « Aucun pays ne correspond… » et le live region annonce 0 résultat.

## V1-MONDE-06 — Aucun zoom clavier ni bouton de zoom ; consigne incomplète

- **Problème / preuve** : `globe-engine.js:354–359` (`wheel`) et `globe-engine.js:302–311` (pincement) sont les seuls chemins de zoom ; bornes `1.8…4.8` codées en dur à deux endroits. `index.html:234–237` n'affiche que « Glisser pour tourner · molette pour zoomer », sans mention du clavier ni du pincement. Aucun bouton de zoom dans `index.html:228–242`.
- **Solution** : API `zoomBy(factor)` partagée par molette, pincement, touches `+`/`−`/`0` et deux boutons injectés (`#v1-globe-zoom`, 44×44) dans `.globe-stage` ; constantes `MIN_CAMERA_Z`/`MAX_CAMERA_Z` uniques ; mise à jour de la consigne visuelle via le module (sans éditer `index.html`).
- **Impact attendu** : zoom accessible au clavier, au toucher et à la souris, bornes cohérentes.
- **Risque** : boutons injectés pris dans le piège Tab de `app.js` — acceptable, ils sont réels et nommés.
- **Effort** : S.
- **Indicateur de vérification** : `+` puis `−` modifient `getInfo().cameraZ` ; les deux boutons existent et ont un `aria-label`.

## V1-MONDE-07 — Cibles tactiles 32 px et corps 7–8,5 px : seuils WCAG 2.2 non tenus

- **Problème / preuve** : `styles.css:3133–3140` : `.globe-close` mesure 32×32 px (WCAG 2.2 SC 2.5.8 exige ≥ 24 px, cible recommandée 44 px). `styles.css:3591–3598` : `.globe-row-meta` est à 7 px ; `styles.css:3382–3390` `.globe-detail-meta` à 8,5 px ; `styles.css:3392–3404` `.globe-status` à 8 px ; `styles.css:3500–3506` `.globe-audit-link` à 8,5 px. Couleurs secondaires `styles.css:8–9` (`--muted-2: #7f8791`) sur fond `#0b1017` ≈ 4,8:1, limite pour du texte sans-serif très fin.
- **Solution** : bloc `<style id="v1-monde-3d-css">` injecté par les modules (aucune suppression) : cibles 44 px (`globe-close`, `globe-search`, `.globe-row`, boutons de zoom), planchers de 10–11 px pour les textes secondaires, `color: var(--muted)` sur les métadonnées, focus renforcé `2px` sur le canvas et les cartes du Plan.
- **Impact attendu** : lisibilité et zone tactile conformes sur mobile et zoom 200 %.
- **Risque** : `.globe-row` plus hautes → moins de lignes visibles ; acceptable (liste défilante).
- **Effort** : S.
- **Indicateur de vérification** : `getComputedStyle(...).height` ≥ 44 px sur les cibles ; aucune règle supprimée dans `styles.css` ; bloc injecté une seule fois.

## V1-MONDE-08 — Aucune gestion de `webglcontextlost` / `webglcontextrestored`

- **Problème / preuve** : `globe-engine.js:420–433` crée le `WebGLRenderer` et pose le canvas sans écouter `webglcontextlost` ni `webglcontextrestored`. Sur perte de contexte (GPU, veille, onglet prolongé), `setAnimationLoop` continue d'appeler `render()` sur un contexte mort : l'image se fige sans message, alors que la liste des pays reste utilisable (`app.js:2094–2149`).
- **Solution** : écouteurs sur le canvas avec `event.preventDefault()` en perte, `pauseLoop()`, drapeau `contextLost`, annonce live « rendu 3D interrompu, utilisez la liste » ; en restauration, reprendre la boucle et demander un rendu.
- **Impact attendu** : dégradation explicite et reprise automatique, sans erreur console.
- **Risque** : faux positif sur certains pilotes → annonce temporaire. Mitigation : l'état se corrige au premier `webglcontextrestored`.
- **Effort** : S.
- **Indicateur de vérification** : `WEBGL_lose_context.loseContext()` puis `restoreContext()` font passer `getInfo().contextLost` à `true` puis `false` et le live region est mis à jour.

## V1-MONDE-09 — `prefers-reduced-motion` non réévalué en direct ; transitions CSS non neutralisées

- **Problème / preuve** : `globe-engine.js:258–264` interroge `matchMedia` à chaque frame sans abonnement : un changement de préférence en cours de session n'est pas mémorisé, et `frame()` continue d'évaluer la requête. Côté CSS, `styles.css:3231` (`spin 0.9s linear infinite`) et `styles.css:3081` (transition du modal) tournent même en mouvement réduit ; `APP_PLAN.md:188` exige le contraire.
- **Solution** : résoudre la préférence une fois dans `state.reducedMotion`, s'abonner à `MediaQueryList.change` (avec repli `addListener`), couper l'auto-rotation immédiatement quand elle passe à `reduce`, et neutraliser spinner/transitions dans le bloc CSS injecté sous `@media (prefers-reduced-motion: reduce)`.
- **Impact attendu** : mouvement réduit effectif et sans coût par frame.
- **Risque** : `matchMedia` absent en tests headless → conserver l'ancien repli `try/catch`.
- **Effort** : S.
- **Indicateur de vérification** : basculer l'émulation Puppeteer en `reduce` annule la rotation et `getInfo().reducedMotion === true`.

## V1-MONDE-10 — DPR / budget de pixels non instrumentés, pas de garde-fou zoom 200 %

- **Problème / preuve** : `globe-engine.js:175–180` calcule `budgetDpr` sur 2 200 000 px et plafonne à 1,5, mais ne stocke ni le DPR retenu ni la taille effective ; `getInfo()` (`globe-engine.js:520–532`) n'expose que `pixelRatio`, `width`, `height`. `ResizeObserver` (`globe-engine.js:398–399`) couvre le redimensionnement de l'élément, mais aucun écouteur `window.resize` ne force un nouveau calcul quand le zoom navigateur change `devicePixelRatio` sans changer les pixels CSS du conteneur, et aucun rendu n'est demandé après le calcul (cf. chantier 02).
- **Solution** : mémoriser `state.dpr`, ajouter un écouteur `window.resize` qui appelle `resize()` puis `requestRender()`, garder les bornes `0.7…1.5` et le budget 2,2 Mpx, enrichir `getInfo()` (`dpr`, `needsRender`, `running`, `reducedMotion`, `contextLost`, `cameraZ`, `hoverCode`, `selectedCode`).
- **Impact attendu** : budget de pixels vérifiable en test, image nette à 200 % sans dépasser le budget, diagnostic exploitable.
- **Risque** : `resize()` appelé deux fois (RO + window) → inoffensif, `setSize` est idempotent.
- **Effort** : S.
- **Indicateur de vérification** : à 1440×900 et DPR 2, `getInfo().dpr ≤ 1,5` et `width*height ≤ 2,2 Mpx` ; compteurs présents dans `getInfo()`.

---

## État d'implémentation et coordination

Les 10 chantiers sont implémentés dans `globe-engine.js` et `plan.js`. Le CSS est ajouté par injection d'un unique bloc `<style id="v1-monde-3d-css">` (deux sections distinctes, `data-globe-css` / `data-plan-css`) : `styles.css` n'est pas modifié.

**Points à coordonner avec l'agent maître / autres experts :**
1. `keyboard-router.js` (non possédé) intercepte en capture et appelle `stopImmediatePropagation` : le globe installe son propre écouteur sur **`window` en capture** pour passer avant lui. Si la coque Atlas unifie le routage, prévoir un relais `VECTEMPOREL_GLOBE.handleKey(event)` plutôt que cet écouteur.
2. Le deep link `?pays=XX` est additif et ne touche pas au hash `#/pays/…` possédé par `app.js` ; l'écriture d'un deep link canonique nécessitera l'accord du propriétaire de `app.js`.
3. Le piège de focus du globe reste dans la fonction `onGlobalKeydown` de `app.js` : les boutons de zoom injectés y sont inclus automatiquement. Aucune modification de `app.js` n'a été faite.

4. **Conflit inter-vues observé pendant l'audit** : `solar.js:917` (`close(toGlobe = true)`) appelle désormais `openGlobe()`, ce qui peut réouvrir le globe pendant un changement de pays : deux overlays `is-open` coexistent. Le moteur ajoute une garde de priorité identique à `keyboard-router.js` (il cède la main dès qu'une scène plus haute est visible), mais la logique de réouverture appartient aux propriétaires de `solar.js` / `app.js`. Le test E2E historique passe ainsi de 14/14 à 6/14 sur les contrôles **postérieurs à l'ouverture du Système** ; les contrôles du globe et « aucune erreur console » restent verts.

## Vérifications

- `node --check globe-engine.js` : **OK**.
- `node --check plan.js` : **OK**.
- E2E (`npm run test:e2e`, exécuté depuis une copie isolée dans `/tmp` pour ne pas écrire `E2E_REPORT.md`) : **6/14**. Échecs tous localisés dans le parcours Système réécrit en parallèle (Entrée → lecteur, Échap, R, Maj+3, Maj+4) ; aucun échec sur l'ouverture du globe ni sur la console. À réexécuter après stabilisation de `app.js`/`solar.js`.
- Sonde fonctionnelle dédiée (Chromium headless, 11 contrôles) : **11/11 PASS** — canvas `role/tabindex/aria-label` et live region ; `setHover` repeint (645 → 652 frames) ; flèche `↓` mène à la carte 03 ; survol sans vol de focus ; état vide « Aucun pays… » ; `+` et boutons 44 px déplacent `cameraZ` (4,05 → 3,48 → 3,00) ; un seul `<style id="v1-monde-3d-css">` avec les deux sections ; budget DPR respecté (`dpr 1`, 907×746) ; perte/restauration de contexte WebGL ; mouvement réduit détecté, boucle arrêtée (`running=false`, 0 frame en 700 ms), spinner sans animation ; exclusion mutuelle Plan ↔ Globe.
