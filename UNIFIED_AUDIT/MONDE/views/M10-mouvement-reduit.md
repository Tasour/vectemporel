# M10 — Mouvement réduit et image statique (domaine A : rendu WebGL)

Lentille **M10** de la vague « Monde ». Fichier possédé : `src/views/monde/M10.js`.
Pièces lues pour le diagnostic : `src/views/globe.js`, `public/globe-engine.js`,
`src/views/globe-reveal.js`, `src/views/monde/registry.js`, `styles.css`.
Contract : `register('M10', (ctx) => { … })` ; CSS unique via `ctx.css('monde-m10', …)` ;
annonces via `ctx.say()` (unique `#globe-live`) ; IDs préfixés `m10-` + garde d'existence.

Aucune donnée historique inventée : le dessin statique est purement schématique
(spirale de Fibonacci déterministe, `Math.sqrt(5)`, aucune graine aléatoire) et le
texte dérive de `ctx.countries`, de `ctx.selected` et de `ctx.state`.

---

## M10-01 — Préférence gelée au chargement dans la vue

- **Titre.** `REDUCED_MOTION` est un instantané, `ctx.reducedMotion()` est vivant.
- **Preuve.** `globe.js:32-36` : IIFE `window.matchMedia(...).matches` stockée dans une
  constante puis `paused = REDUCED_MOTION`. `globe.js:436-439` fournit parallèlement
  `reducedMotion: () => window.matchMedia(...).matches`, réévalué à chaque appel.
  Deux sources de vérité divergent dès que l'utilisateur change son réglage système.
- **Solution.** M10 maintient son propre état `M.reduce` via un écouteur `change`
  persistant sur `matchMedia('(prefers-reduced-motion: reduce)')` (`installWatcher`)
  et le publie dans `document.documentElement.dataset.m10Motion` (`reduce`/`full`).
- **Impact.** L'état de mouvement affiché et le CSS de repli suivent le système en
  direct, sans rechargement.
- **Risque.** **Blocage partiel** : la constante et le `paused` de `globe.js` ne
  peuvent pas être réécrits depuis une lentille (fichier interdit). M10 ne corrige
  que sa propre couche ; documenté.
- **Effort.** S.
- **Vérification.** Basculer le réglage système : `document.documentElement.dataset.m10Motion`
  passe de `full` à `reduce` sans recharger ; `#globe-live` reçoit l'annonce.

## M10-02 — Écouteur `change` du moteur dépendant du cycle open/close

- **Titre.** Le moteur n'écoute la préférence que pendant ses interactions, donc jamais en mouvement réduit.
- **Preuve.** `globe-engine.js:514-520` attache `onMotionChange` dans
  `attachInteractions()` ; `globe-engine.js:526-548` le retire dans
  `detachInteractions()`. Or en mouvement réduit `globe.js:171-183` garde le moteur
  `close()` après deux frames → écouteur absent. `globe-reveal.js:52-55` interroge
  `matchMedia` mais n'écoute rien.
- **Solution.** Écouteur M10 indépendant du moteur (`installWatcher`) ; sur bascule,
  `reconcileEngine()` appelle `engine.setAutoRotate(false|true)` puis
  `engine.invalidate()`, et `reveal.leave()` si le mode statique s'active. Un
  `visibilitychange` réaffirme la préférence au retour d'onglet (`globe-engine.js:488-496`
  arrête la boucle mais ne réconcilie pas `autoRotate`).
- **Impact.** Aucun redémarrage de rotation fantôme après un changement de préférence ou un retour d'onglet.
- **Risque.** `setAutoRotate(false)` rend `autoRotateEnabled=false` côté moteur : M10
  doit impérativement le remettre à `true` au retour, ce que fait `reconcileEngine()`.
- **Effort.** M.
- **Vérification.** Réduire le mouvement pendant que le globe est fermé, puis le
  réactiver : `engine.setAutoRotate` est appelé dans les deux sens ; aucune rotation
  dans l'intervalle.

## M10-03 — `aria-pressed` du bouton de pause mensonger en mouvement réduit

- **Titre.** Le bouton de `globe.js` annonce « Rotation active » alors que le moteur refuse de tourner.
- **Preuve.** `globe.js:351-362` : `aria-pressed = String(!paused)`. Au démarrage en
  mode réduit, `paused=true` → « Rotation inactive ». Un clic force `paused=false`
  puis `syncEngine()` → `engine.open()`, or `globe-engine.js:664` recalcule
  `state.autoRotate = autoRotateEnabled && !state.reducedMotion` = **false** : le
  libellé et l'état ARIA deviennent faux.
- **Solution.** M10 ajoute son propre bouton `#m10-freeze-toggle` dont l'
  `aria-pressed` reflète exactement l'état qu'il pilote (`M.manualFreeze`) et une
  ligne de statut qui distingue « préférence système » et « figement manuel ».
  Le bouton de `globe.js` n'est pas modifié (fichier interdit).
- **Impact.** Un état de contrôle véridique et explicable, sans double announcement.
- **Risque.** Deux contrôles de mouvement coexistent → libellés distincts
  (« Rotation active/inactive » vs « Figer/Réactiver ») et panneau séparé.
- **Effort.** M.
- **Vérification.** En mode réduit, `aria-pressed` du bouton M10 reste cohérent avec
  le texte du statut après cinq clics aller-retour.

## M10-04 — Image figée obsolète après redimensionnement

- **Titre.** Le canvas statique n'est pas redessiné au resize ni en zoom 200 %.
- **Preuve.** `globe.js:171-183` ouvre le moteur deux frames puis le ferme en mouvement
  réduit. `globe-engine.js:510` attache un `ResizeObserver`, mais `detachInteractions()`
  le déconnecte à la fermeture ; `resize()` (`:196-211`) appelle `invalidate()` qui exige
  `state.visible` (`:97-105`). Résultat : canvas étiré/flou après resize ou zoom du navigateur.
- **Solution.** Substitut vectoriel inline : `<svg viewBox="0 0 100 100">`, graticule
  statique, un point par pays (spirale dorée), `pointer-events:none`. Indépendant du
  DPR et du WebGL. M10 relaie aussi `engine.resize()` (rAF-throttlé) si le moteur est disponible.
- **Impact.** Une image statique toujours nette, y compris quand Three.js est absent.
- **Risque.** Dessin schématique, non cartographique → `role="img"` + `<desc>` le
  déclarent explicitement pour ne pas induire en erreur.
- **Effort.** M.
- **Vérification.** Redimensionner la fenêtre : le `viewBox` reste `0 0 100 100` et
  le SVG reste net ; aucun appel réseau.

## M10-05 — Zoom clavier muet quand le moteur est fermé

- **Titre.** Les boutons de zoom de la vue n'atteignent aucun écouteur en mouvement réduit.
- **Preuve.** `globe.js:247-261` cherche un `<canvas>` dans `host`, puis distribue un
  `WheelEvent` synthétique. En mouvement réduit le moteur est `close()` et
  `detachInteractions()` a retiré le listener `wheel` (`globe-engine.js:535`) ; si le
  canvas est absent, la fonction returne silencieusement (`:250`) sans appeler `say()`.
- **Solution.** Zoom propre au SVG statique : palette `ZOOMS = [1, 1.5, 2.25, 3.4, 4]`,
  `viewBox` recadré autour du centre, **instantané** (aucune transition CSS/WAAPI),
  `aria-disabled` aux bornes (boutons restent focalisables), annonce du niveau via `say()`.
- **Impact.** Le zoom redevient utilisable et audible pour les utilisateurs en mouvement réduit.
- **Risque.** Zoom visuel distinct du zoom caméra du moteur → annonce explicite
  « Zoom de la vue statique » pour lever l'ambiguïté.
- **Effort.** S.
- **Vérification.** Cliquer `+` quatre fois : `viewBox` = `37.50 37.50 25.00 25.00`,
  `aria-disabled="true"` sur `+`, cinq messages distincts dans `#globe-live`.

## M10-06 — Transition de zoom : destination non annoncée

- **Titre.** `done()` précède le test `reducedMotion()` : la navigation est instantanée et muette.
- **Preuve.** `globe-reveal.js:219-238` appelle `done()` en ligne 220 **avant** le test
  `reducedMotion()` en ligne 221. En mode réduit, ni `show()` ni la WAAPI
  `scale(7)/720 ms` (`:228-234`) ne s'exécutent ; `globe.js:473-474` vide ensuite
  `#globe-live`. Aucun texte ne nomme la destination.
- **Solution.** Détection du changement de `selected.id` entre deux passes de
  `register()` (la coque reconstruit `#app` à chaque rendu) → `say('Pays sélectionné : …')`.
  En mode statique, `reveal.leave()` est appelé pour garantir qu'aucun overlay animé
  ne subsiste.
- **Impact.** La navigation instantanée reste compréhensible sans transition visuelle.
- **Risque.** Annonce potentiellement dupliquée avec la région live globale de la
  coque → garde `selectedId !== prevSelectedId`.
- **Effort.** S.
- **Vérification.** Choisir un pays en mode réduit : `#globe-live` contient le nom,
  le nombre d'ères et de repères ; l'annonce ne se répète pas au rendu suivant.

## M10-07 — Couches de composition conservées en mouvement réduit

- **Titre.** La media query ne neutralise que `transition`, pas `will-change` ni `filter`.
- **Preuve.** `globe-reveal.js:69-84` : `#globe-reveal{transition:opacity .22s}`,
  `.gr-figure{will-change:transform,opacity; filter:drop-shadow(...)}`,
  `.gr-page{transition:opacity .35s}` ; la règle `:85` ne désactive que `transition`.
  `will-change` et le `drop-shadow` maintiennent une couche de composition coûteuse.
- **Solution.** Bloc `monde-m10` : `@media (prefers-reduced-motion:reduce)` force
  `#globe-reveal .gr-figure{will-change:auto !important;filter:none !important}` et
  `transition:none !important`, **et** le sélecteur de repli
  `html[data-m10-motion="reduce"] …` couvre le cas où `matchMedia` est absent.
- **Impact.** Aucune couche GPU fantôme ; cohérence CSS/JS.
- **Risque.** `!important` écrase les règles de `globe-reveal` → voulu et limité au
  seul mode réduit ; aucun sélecteur E2E n'est touché.
- **Effort.** S.
- **Vérification.** En mode réduit, `getComputedStyle(figure).willChange === 'auto'`
  et `filter === 'none'` ; en mode complet, les valeurs d'origine reviennent.

## M10-08 — Risque de quatrième région live

- **Titre.** Ajouter un `role="status"` rejouerait le défaut C2-06.
- **Preuve.** `globe.js:73-85` crée déjà `#globe-live` (`role=status`, `aria-live=polite`),
  `globe.js:140-146` ajoute `#globe-status` (`role=status`), la coque a le sien
  (cf. `UNIFIED_AUDIT/NAVIGATION/views/c2-orientation-atlas.md`, C2-06).
- **Solution.** Le statut M10 est un `<p id="m10-motion-status">` **sans** `role` ni
  `aria-live`. Toutes les annonces passent par `ctx.say()`. Le SVG porte `role="img"`
  avec un `aria-label` stable, jamais une live region.
- **Impact.** Une seule voie d'annonce pour la vue Monde, prévisible et non dupliquée.
- **Risque.** Le statut visuel n'est pas vocale → compensé par `say()` sur chaque
  changement de préférence, de figement et de zoom.
- **Effort.** S.
- **Vérification.** `document.querySelectorAll('[aria-live]')` ne gagne aucun nœud
  dans `#m10-motion-panel`.

## M10-09 — Survol : information portée par la seule couleur

- **Titre.** Le texte de survol disparaît au `leave`, le canvas est `aria-hidden`.
- **Preuve.** `globe-engine.js:107-120` `setHover()` ne modifie que l'uniforme
  `uHover` (couleur) ; `globe.js:117-122` alimente `#globe-hover-readout`, remis à
  « aucun pays » au `onLeave` (`:455`) ; le canvas est `aria-hidden="true"`
  (`globe-engine.js:601`).
- **Solution.** Le point actif du SVG change selon **quatre** canaux : couleur,
  rayon `r` 2.1 → 3.4, `stroke-width` 0 → 1.4, et `figcaption` textuelle durable.
  Les points de la face arrière sont en outre atténués **et** pointillés
  (`stroke-dasharray`). Abonnement via `ctx.onHover()` / `ctx.onLeave()`.
- **Impact.** L'identité du pays reste lisible sans couleur, sans survol actif et sans WebGL.
- **Risque.** Le survol du canvas et la surbrillance du SVG ne sont pas synchronisés
  pixel à pixel → le SVG est une légende, pas une seconde cible de picking.
- **Effort.** M.
- **Vérification.** Survoler puis quitter un pays : au moins un attribut `r` ou
  `stroke-width` change, et la `figcaption` reste non vide.

## M10-10 — Absence de `matchMedia` : repli silencieux vers l'animation

- **Titre.** Quatre `try/catch` renvoient `false`, donc « pas de mouvement réduit ».
- **Preuve.** `globe.js:32-35`, `globe.js:436-439`, `globe-engine.js:287-293`,
  `globe-reveal.js:52-55` : tous retournent `false` en cas d'erreur ou d'absence de
  `matchMedia`. La préférence est donc ignorée sans qu'aucun texte ne le signale.
- **Solution.** `queryReduce()` applique un **fail-safe** : sans `matchMedia` (ou si
  `ctx.reducedMotion()` lève), `M.reduce = true` → `data-m10-motion="reduce"` → le
  CSS de repli s'applique et `reconcileEngine()` fige le moteur.
- **Impact.** Jamais d'animation imposée quand la détection est indisponible.
- **Risque.** Sur un vieux WebView où l'utilisateur voulait l'animation, le repli
  fige par excès → choix délibéré (accessibilité prioritaire) et annoncé.
- **Effort.** S.
- **Vérification.** Simuler `window.matchMedia = undefined` avant le rendu :
  le panneau affiche « mouvement réduit », `will-change` est `auto`, aucune rotation.

---

## Synthèse des blocages (fichiers interdits)

1. `globe.js:32-36` — la constante `REDUCED_MOTION` et le `paused` local restent figés (M10-01).
2. `globe.js:351-362` — le `aria-pressed` du bouton « Rotation » reste mensonger en mode réduit (M10-03) ; M10 fournit un contrôle correct à côté.
3. `globe.js:247-261` — les boutons de zoom d'origine restent muets quand le moteur est fermé (M10-05) ; M10 fournit un zoom statique de substitution.
4. `globe-reveal.js:220` — l'ordre `done()` avant le test `reducedMotion()` n'est pas modifiable (M10-06) ; M10 compense par l'annonce post-render.
5. `styles.css` — intact : tout style passe par `ctx.css('monde-m10', …)`.

## État de vérification

- `node --check src/views/monde/M10.js` : **OK** (seule vérification demandée).
- Zéro réseau, zéro `Math.random`, zéro `console.*`, aucun sélecteur de test ajouté.
- Un seul identifiant CSS injecté (`monde-m10`) ; tous les IDs DOM sont préfixés `m10-`
  et protégés par `document.getElementById` + `cssOnce`.
