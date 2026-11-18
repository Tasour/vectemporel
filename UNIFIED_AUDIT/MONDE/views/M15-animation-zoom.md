# M15 — Animation de zoom dans le contour

> Lentille de la vague Monde · domaine B (drapeau & révélation).
> Fichier possédé : `src/views/monde/M15.js`. Aucun autre fichier modifié.
> Source audité : `src/views/globe-reveal.js` (animation) et `src/views/globe.js` (appels).

## Contexte

`globe-reveal.js` crée le zoom de révélation dans `reveal()` (lignes 219-238) :
`figure.animate([{scale(1),opacity:1},{scale(7),opacity:0}], {duration:720,
easing:'cubic-bezier(.2,.7,.2,1)', fill:'forwards'})`. La lentille ne peut pas
éditer ce fichier partagé : elle intercepte l'appel à `figure.animate` au
moment où il se produit (l'overlay est fixé au `body`, ligne 156, donc found
via `document.getElementById('globe-reveal')`) et wrappe `ctx.reveal`.

---

## M15-01 — Durée unique et bornée

- **Titre** — Remplacer le littéral `720` ms par une constante unique et explicitée.
- **Preuve** — `globe-reveal.js:233` : `duration: 720` en dur, sans source de vérité ni garde-fou.
- **Solution** — Constante `ZOOM.duration = 620` ms, lue seule dans l'interception ; durée raccourcie pour une révélation plus vive, bornée et modifiable en un point.
- **Impact** — Révélation perçue comme plus réactive (~14 % plus courte), cohérence si une autre valeur était réutilisée.
- **Risque** — Faible : une durée trop courte peut sembler saccadée ; 620 ms reste au-dessus du seuil de perception.
- **Effort** — Trivial (constante).
- **Vérification** — `node --check` ; lecture de la constante dans le code.

## M15-02 — Easing décéléré

- **Titre** — Substituer la courbe d'accélération par une décélération douce.
- **Preuve** — `globe-reveal.js:233` : `cubic-bezier(.2,.7,.2,1)` démarre trop sec et freine tard.
- **Solution** — `ZOOM.easing = 'cubic-bezier(.18,.62,.24,1)'` : départ franc, décélération longue, fin amortie qui accompagne la disparition de l'opacité.
- **Impact** — Mouvement plus naturel, meilleure lisibilité de la transition vers la « Chronologie ».
- **Risque** — Faible : courbe purement esthétique, réversible.
- **Effort** — Trivial (constante).
- **Vérification** — `node --check` ; comparaison visuelle avant/après par l'agent maître (E2E).

## M15-03 — Facteur d'échelle borné

- **Titre** — Limiter le zoom final pour éviter le sur-dimensionnement brutal.
- **Preuve** — `globe-reveal.js:232` : `scale(7)` agrandit la figure jusqu'à 7×, souvent au-delà du cadre utile.
- **Solution** — `ZOOM.scale = 6`, frames entièrement régénérées dans l'interception (`scale(1)` → `scale(6)`).
- **Impact** — Zoom reste dans la zone lisible du contour, moins de pixels surcomposés en fin de course.
- **Risque** — Très faible : l'opacité atteint 0 avant la fin, l'écart de facteur est imperceptible.
- **Effort** — Trivial.
- **Vérification** — `node --check` ; les frames passées à `nativeAnimate` sont bien les nôtres.

## M15-04 — Fluidité par couche compositée

- **Titre** — N'animer que `transform` et `opacity`, sur une couche stable.
- **Preuve** — `globe-reveal.js:73` : `filter:drop-shadow(...)` sur `.gr-figure`, recalculé à chaque frame du scale (coûteux en GPU).
- **Solution** — CSS `is-revealing .gr-figure { filter:none }` pendant le zoom ; `transform-origin` centré et `backface-visibility:hidden` pour figer le plan de composition.
- **Impact** — Moins de recalculs de filtre par frame, scale plus fluide.
- **Risque** — Faible : l'ombre disparaît pendant ~620 ms, masquée par l'opacité qui tombe à 0.
- **Effort** — Faible (CSS).
- **Vérification** — `node --check` ; règle CSS injectée sous l'ID `monde-m15`.

## M15-05 — Stabilité du centre de transformation

- **Titre** — Épingler le centre de zoom au centre de la figure.
- **Preuve** — `globe-reveal.js:72` : `.gr-figure` n'explicite pas `transform-origin` (dépend du centre par défaut, sensible aux `aspect-ratio`/media queries) .
- **Solution** — `transform-origin:50% 50%` et `backface-visibility:hidden` explicites dans l'état `is-revealing`.
- **Impact** — Le contour se dilate symétriquement, sans dérive sur mobile (largeur 78 % en `@media max-width:700px`).
- **Risque** — Nul : uniformise le comportement par défaut.
- **Effort** — Trivial (CSS).
- **Vérification** — `node --check` ; relecture responsive par l'agent maître.

## M15-06 — Cycle de vie de `will-change`

- **Titre** — Activer l'indice de composition seulement pendant la révélation, puis le relâcher.
- **Preuve** — `globe-reveal.js:73` : `will-change:transform,opacity` est permanent sur `.gr-figure`, maintenant une couche GPU promue en permanence.
- **Solution** — CSS : `will-change:auto` par défaut, `transform,opacity` en `is-revealing` ; le callback `finished` efface aussi `figure.style.willChange` (jeton de génération à l'appui).
- **Impact** — Mémoire GPU libérée au repos ; aucune couche fantôme après la navigation.
- **Risque** — Faible : si la classe `is-revealing` reste posée, l'indice reste actif — cas déjà géré par `leave()` de la source.
- **Effort** — Faible.
- **Vérification** — `node --check` ; `will-change` absent du style inline hors révélation.

## M15-07 — Annulation par jeton de génération

- **Titre** — Rendre l'annulation déterministe avec un jeton incrémenté à chaque transition.
- **Preuve** — `globe-reveal.js:42-44` (`resetFigure()` annule `activeAnimation`) et `:235` (les deux branches `finished` appellent `leave()`) : une animation annulée peut masquer la suivante.
- **Solution** — Compteur `generation` incrémenté par `beginTransition()` ; chaque callback `finished` compare son jeton avant de nettoyer, et `stopTracked()` annule l'animation courante dans un `try/catch`.
- **Impact** — Une animation périmée ne peut plus effacer l'état d'une animation en cours ; au plus un zoom actif.
- **Risque** — Moyen : l'annulation déclenche le `.catch()` de la source, qui appelle son `leave()` local (léger clignotement, corrigé par le `show()` suivant).
- **Effort** — Moyen.
- **Vérification** — `node --check` ; scénario E2E « révélation → nouvelle révélation » rejoué par l'agent maître.

## M15-08 — Annulation sur survol et sortie

- **Titre** — Interrompre un zoom en vol dès que le pays survolé change ou que le pointeur sort.
- **Preuve** — `globe.js:282` (`pointerleave` → `reveal.leave()`) et `:449-456` (`onHover` moteur) : ces transitions n'annulent pas l'animation en cours dans la source.
- **Solution** — Wrappers `api.reveal`, `api.hover`, `api.leave` qui appellent `beginTransition()`, plus les hooks `ctx.onHover`/`ctx.onLeave` enregistrés une seule fois.
- **Impact** — Aucun drapeau zoomé ne reste figé après un changement d'intention.
- **Risque** — Faible : les wrappers délèguent toujours à l'implémentation d'origine ; sémantique de `done()` inchangée.
- **Effort** — Moyen.
- **Vérification** — `node --check` ; `reveal/hover/leave` restent appelables et renvoient la valeur d'origine.

## M15-09 — Mouvement réduit

- **Titre** — Réduire le zoom à un quasi-instantané quand `prefers-reduced-motion` est actif.
- **Preuve** — `globe-reveal.js:221` court-circuite `reveal()` (donc `animate()` n'est jamais appelé), mais `:69-85` laisse des transitions CSS sur l'overlay et la page.
- **Solution** — Défense en profondeur : `ZOOM.reducedDuration = 1` ms et easing `linear` dans l'interception si `ctx.reducedMotion()`, plus `@media (prefers-reduced-motion:reduce)` qui force `transition:none` et `animation:none` sur l'overlay, la page et la figure.
- **Impact** — Conformité mouvement réduit même si une animation était déclenchée malgré le court-circuit de la source.
- **Risque** — Nul : aucun mouvement, `done()` reste appelé immédiatement par la source.
- **Effort** — Faible.
- **Vérification** — `node --check` ; bascule OS « réduire les animations » rejouée par l'agent maître.

## M15-10 — Repli, gardes et innocuité

- **Titre** — Garantir une lentille idempotente, sans erreur ni effet de bord.
- **Preuve** — Le registre réapplique les 50 greffons à chaque rendu (`registry.js:45-55`) et neutralise silencieusement une lentille qui lève (`safe()`), masquant les erreurs.
- **Solution** — ID CSS unique `monde-m15` (géré par `cssOnce`), garde d'existence sur `#globe-reveal`/`.gr-figure`, gardes d'idempotence `api.__m15Installed` et `figure.__m15AnimatePatched`, hooks enregistrés une seule fois (`hooksRegistered`), `try/catch` sur `cancel()` et nettoyage de style ; aucun `console.*`, aucun réseau, aucun `Math.random`, aucun sélecteur de test modifié.
- **Impact** — Zéro erreur console, zéro accumulation de callbacks entre rendus, aucun conflit avec les autres lentilles du domaine B (M11–M20).
- **Risque** — Très faible : la source reste maîtresse du cycle de vie (`done()`, `revealing`, `isRevealing()` non modifiés).
- **Effort** — Moyen.
- **Vérification** — `node --check src/views/monde/M15.js` (unique vérification demandée) ; E2E global rejoué par l'agent maître.

---

## Synthèse

| Axe | Chantiers | Dispositif |
| --- | --- | --- |
| Fluidité | M15-04, M15-05 | couche compositée, origine figée, ombre retirée |
| Durée | M15-01 | constante `ZOOM.duration = 620` |
| Easing | M15-02, M15-03 | courbe décélérée, `scale(6)` borné |
| Annulation | M15-07, M15-08 | jeton de génération, wrappers `reveal/hover/leave` |
| Mouvement réduit | M15-09 | durée 1 ms + CSS `reduce` |
| Robustesse | M15-06, M15-10 | `will-change` cyclé, gardes et idempotence |

**Vérification demandée :** `node --check src/views/monde/M15.js` uniquement.
