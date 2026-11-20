# M07 — Boucle rAF et pause sur `document.hidden` (domaine A : rendu WebGL)

Lentille : M07. Fichier possédé : `src/views/monde/M07.js`.
Lectures seules : `public/globe-engine.js`, `src/views/globe.js`, `src/views/monde/registry.js`, `UNIFIED_AUDIT/views/atlas-globe.md`.
Aucun fichier partagé modifié, aucun réseau, aucun `Math.random`, aucun `console.*`, aucune boucle `requestAnimationFrame` propre au greffon.

---

## M07-01 — Accès au moteur uniquement par `onReady`, sans toucher à `globe.js`

- Preuve : `ctx` n'expose pas `engine` (registry.js:7-12). Le seul point de passage est `flushMondeReady({ engine, host, selected })` (globe.js:467, registry.js:58-60). Un greffon qui importerait `globe.js` créerait un cycle et un second propriétaire du moteur.
- Solution : `ctx.onReady(payload => engine = payload.engine)` avec une garde module `readyHooked` : un seul enregistrement de callback, même si `runMondeEnhancements()` est rejoué à chaque rendu. Le greffonagit sur la vraie instance (`VECTEMPOREL_GLOBE`) sans modifier le point d'entrée.
- Impact : observation de la boucle réelle, zéro couplage avec les fichiers partagés.
- Risque : `readyCallbacks` s'accumulent à chaque rendu (registry.js:50) ; la garde `readyHooked` empêche la duplication, et un `payload` incomplet est ignoré.
- Effort : S
- Vérification : `mondeDiagnostics()` liste une seule entrée `M07` et le callback `onReady` n'est poussé qu'une fois (compteur `readyHooked` interne), même après trois rendus du globe.

## M07-02 — Une seule boucle de rendu : zéro rAF dans le greffon

- Preuve : le moteur détient l'unique `renderer.setAnimationLoop(frame)` (globe-engine.js:441-444, 471-480). Ajouter un `requestAnimationFrame` récurrent dans la lentille produirait une boucle parasite concurrente, contraire à la règle de performance de la vague.
- Solution : le greffon est purement événementiel (`visibilitychange`, `onReady`) et lit l'état via `engine.getInfo()` (globe-engine.js:691-703). Aucun `requestAnimationFrame`, aucun `setInterval`, aucun `setTimeout` dans `M07.js`.
- Impact :exactement une boucle rAF, détenue par le moteur ; budget GPU inchangé.
- Risque : la tentation d'un « sampling » périodique de `getInfo()` réintroduirait un timer ; interdit par construction.
- Effort : S
- Vérification : `grep -nE 'requestAnimationFrame|setInterval|setTimeout' src/views/monde/M07.js` ne renvoie aucune ligne.

## M07-03 — Écouteur `visibilitychange` unique et idempotent

- Preuve : le moteur installe déjà son propre `onVisibilityChange` (globe-engine.js:488-496, 512) et le retire en `detachInteractions()` (539). Un second écouteur ajouté à chaque render du globe dupliquerait les appels `invalidate()`/`clearTimeout()`.
- Solution : un seul listener au niveau module, enregistré sous garde `visibilityHooked`, avec `hiddenPhase` initialisé à `document.hidden`. Il n'appelle jamais `open()`/`close()` (qui appartiennent à `syncEngine()`, globe.js:153-169) : il ne fait qu'informer et, au retour, nudge `invalidate()` si la vue est active.
- Impact : pause/reprise en arrière-plan fiable, sans double pilotage du moteur.
- Risque : conflit avec `syncEngine()` si le greffon ouvrait/fermait le moteur ; la limitation au `invalidate()` public (globe-engine.js:685) écarte ce risque.
- Effort : M
- Vérification : basculer `document.hidden` plusieurs fois → un seul handler s'exécute (les compteurs `resumeCount`/`invalidateCount` progressent d'exactement 1 par transition), et `data-globe-active` reste sous le contrôle exclusif de `globe.js`.

## M07-04 — Miroir d'état `data-m07-raf-phase` auditable sans console

- Preuve : le moteur ne publie ni `state.running` ni `state.visible` ; `getInfo()` (691-703) ne donne que des compteurs. Aucun moyen déclaratif de savoir si la boucle tourne, est au repos ou est suspendue.
- Solution : le greffon maintient `host.dataset.m07RafPhase` = `hidden` | `active` | `idle`, mis à jour uniquement sur événements (`onReady`, `visibilitychange`), jamais en boucle. Valeur dérivée de `document.hidden` et de `host.dataset.globeActive` (globe.js:156, 158).
- Impact : état du cycle lisible par un test E2E ou un audit, sans instrumentation du moteur.
- Risque : un marqueur périmé si la vue change sans `visibilitychange` ; le calcul est refait à chaque appel `install()` (render) et à chaque transition.
- Effort : S
- Vérification : `document.getElementById('globe-canvas').dataset.m07RafPhase` vaut `hidden` quand l'onglet est masqué, `active` au retour si `globeActive === '1'`, `idle` sinon.

## M07-05 — Reprise sans saut de rotation : l'horloge est réarmée par `invalidate()`

- Preuve : `frame()` borne `dt` à 0.05 s (globe-engine.js:451) et `invalidate()` appelle `clock.start()` (102) au réveil, ce qui remet `oldTime` à l'instant présent : aucun delta démesuré n'est injecté au retour d'onglet. `dt` reste donc dans [0, 0.05].
- Solution : le greffon ne touche jamais à `THREE.Clock` ni à `setAnimationLoop` ; il expose un compteur `resumeCount` incrémenté uniquement sur la transition `hidden → visible`, prouvant que la reprise passe bien par le chemin moteur. Affichage dans le readout.
- Impact : aucune rotation brusque au retour, expérience visuelle continue.
- Risque : le greffon ne possède pas `globe-engine.js` ; le contrôle est observatoire (documentation du mécanisme + compteur), pas correctif.
- Effort : M
- Vérification : masquer puis réafficher l'onglet → le readout affiche « Reprises : N » avec N qui augmente d'une unité, et aucun saut angulaire n'est observé sur la sphère.

## M07-06 — Aucun timer d'arrière-plan dans la lentille

- Preuve : le moteur neutralise son timer d'auto-rotation en arrière-plan : `stop()` fait `clearTimeout(autoRotateTimer)` (globe-engine.js:485) et `onVisibilityChange()` le refait (492) ; `scheduleAutoRotate()` (295-304) vérifie `state.visible` avant de réarmer.
- Solution : `M07.js` ne crée ni `setTimeout` ni `setInterval` ; le seul timer existant reste celui du moteur, déjà neutralisé. Le readout indique « rotation suspendue » quand `document.hidden` est vrai.
- Impact : zéro réveil CPU en arrière-plan imputable au greffon ; cohérence avec le timer moteur.
- Risque : un futur ajout de timer dans la lentille casserait cette propriété ; la règle est explicite en tête de fichier et vérifiable statiquement.
- Effort : S
- Vérification : `grep -nE 'setTimeout|setInterval' src/views/monde/M07.js` → 0 ligne ; le readout porte « Onglet masqué : boucle rAF suspendue » pendant la pause.

## M07-07 — IntersectionObserver délégué à M08, pas de second observateur

- Preuve : `globe.js:283-290` possède l'unique `IntersectionObserver` qui alimente `syncEngine()` via `inView`. Un second observateur dans M07 déclencherait des `open()`/`close()` redondants, donc des `setAnimationLoop` concurrents.
- Solution : M07 n'observe que `visibilitychange` et lit le marqueur `host.dataset.globeActive` posé par `syncEngine()` (globe.js:158). Aucun `IntersectionObserver` dans `M07.js`.
- Impact : complémentarité nette — M08 gère la présence dans la vue, M07 gère la visibilité du document — sans conflit de propriété.
- Risque : si M08 venait à ne pas poser le marqueur, `syncEngine()` le pose déjà (globe.js:156) : la condition de M07 reste valide.
- Effort : S
- Vérification : `grep -n 'IntersectionObserver' src/views/monde/M07.js` → 0 ligne ; le nudge au retour ne se produit que si `data-globe-active="1"`.

## M07-08 — Reprise conditionnée à l'activité réelle (pas de réveil fantôme)

- Preuve : `invalidate()` réveille la boucle seulement si `state.visible && !document.hidden && state.renderer` (globe-engine.js:99), tandis que `syncEngine()` pose `data-globe-active = inView && !paused && view === globe` (globe.js:155). Un retour d'onglet alors que la vue est « chronologie » ne doit rendre aucune frame.
- Solution : au passage `hidden → visible`, le greffon appelle `engine.invalidate()` **uniquement si** `!document.hidden && host.dataset.globeActive === '1'` ; sinon il se limite à mettre à jour le phase/readout. Compteur `invalidateCount` affiché.
- Impact : aucun GPU réveillé inutilement au retour d'onglet ; économie de batterie préservée.
- Risque : le cas mouvement réduit (`drawStaticFrame()`, globe.js:171-183) laisse `globeActive` à `0` après la frame statique — ne pas réveiller est alors le comportement correct.
- Effort : M
- Vérification : masquer l'onglet pendant la vue « chronologie », puis le réafficher → `engine.invalidate()` non appelé (`invalidateCount` inchangé, `getInfo().calls` stable) ; refaire en vue « globe » → `invalidateCount` +1.

## M07-09 — Arrêt au repos préservé : pas de `dirty` forcé périodique

- Preuve : `frame()` compte `idleFrames` et appelle `stopLoop()` après `IDLE_FRAMES_BEFORE_STOP = 10` frames inutiles (globe-engine.js:25, 465-468) ; tout appel à `invalidate()` remet `state.dirty = true` (98) et annulerait cet arrêt.
- Solution : le greffon n'appelle `invalidate()` qu'une fois par transition discrète `hidden → visible`, jamais sur un timer ni sur une frame. Le compteur `invalidateCount` rend visible cette parcimonie dans le readout.
- Impact : le globe s'arrête bien au repos (0 `render()` idle), y compris après une reprise.
- Risque : un « keep-alive » périodique du greffon empêcherait l'extinction → expressément interdit (cf. M07-02).
- Effort : S
- Vérification : au repos en vue globe, `engine.getInfo().calls` plafonne ; le readout affiche « Invalidations : N » avec N égal au nombre de reprises, pas au temps écoulé.

## M07-10 — Mesure de la pause en arrière-plan via `getInfo()` à la demande

- Preuve : `getInfo()` expose `calls`, `triangles`, `geometries`, `textures`, `pixelRatio` (globe-engine.js:691-703) et retourne `null` avant initialisation du renderer. C'est la seule métrique publique permettant de prouver qu'aucune frame n'est rendue pendant `document.hidden`.
- Solution : le greffon relève `calls` au masquage (`hiddenCalls`) et au réaffichage, calcule `Δcalls` et l'annonce dans un nœud `role="status" aria-live="polite"` (garde `getInfo()` nullable). Un `Δcalls > 0` signale une fuite de rendu en arrière-plan.
- Impact : preuve chiffrée et audible de la pause, indication non portée par la seule couleur.
- Risque : `getInfo().calls` est un compteur cumulatif du renderer ; si le moteur est réinitialisé entre les deux relevés, le delta peut être négatif — le readout affiche alors « métriques indisponibles » plutôt qu'un chiffre trompeur.
- Effort : M
- Vérification : masquer l'onglet 2 s puis le réafficher → le readout indique « +0 frame(s) rendue(s) en arrière-plan » ; injection contrôlée d'un rendu pendant la pause → le compteur le signale.

---

## Statut d'implémentation

Les 10 chantiers sont implémentés dans `src/views/monde/M07.js`. Aucun fichier interdit modifié. CSS injecté via `ctx.css('monde-m07', …)`, nœud `#monde-m07-raf` à ID unique avec garde d'existence, un seul `onReady` et un seul `visibilitychange`, zéro boucle rAF, zéro timer, zéro `IntersectionObserver`, zéro `console.*`, zéro `Math.random`, zéro réseau.

## Blocages

- Aucun bloquant fonctionnel. M07 ne peut pas modifier `start()` (globe-engine.js:471-480) pour qu'il teste `document.hidden` avant de démarrer : le fichier n'est pas possédé. Le premier `frame()` (447) arrête déjà la boucle dans ce cas ; le greffon documente ce chemin et se contente de relever l'état. Aucun contournement risqué n'est introduit.
- M07-05 et M07-10 restent des mesures observatoires : la correction moteur (clock réarmé, compteur de frames) relève d'une lentille dédiée si le maître le décide.
