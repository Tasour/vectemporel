# M13 — Survol clavier (domaine B : drapeau & révélation)

Lentille « Monde » M13. Fichier possédé : `src/views/monde/M13.js`. Pièces lues :
`src/views/globe.js`, `src/views/globe-reveal.js`, `src/views/monde/registry.js`,
`src/views/monde/index.js`, `UNIFIED_AUDIT/MONDE/README.md`.

Le globe dispose déjà d'un survol clavier réel : `highlight()` (`globe.js:186-200`)
appelle `engine.setHover()`, `reveal.hover()`, `notifyMondeHover()`, met à jour
`#globe-hover-readout` et `say()`. Les dix chantiers ci-dessous ne doublonnent pas
ce chemin : ils comblent la **sortie** de survol, l'**annonce dédiée**, la
**substitution accessible** au drapeau et l'**idempotence** du greffon.

## M13-01 — Région live dédiée : `say()` est partagé avec zoom et pause

- **Preuve.** `globe.js:148-150` : `say()` écrit dans `#globe-live`. Le même canal
  reçoit le survol clavier (`:199`), le zoom (`:260`) et la pause (`:361`). Une
  flèche puis « Zoom arrière. » écrase l'annonce de pays.
- **Solution.** Créer `#monde-m13-live` (`role="status"`, `aria-live="polite"`,
  `aria-atomic="true"`) dans `<body>`, hors `#app`, avec garde d'existence.
  M13 n'appelle jamais `say()` : le `#globe-live` de `globe.js` reste intact pour
  le test E2E existant (`atlas-globe.md:27`).
- **Impact.** Le nom du pays survolé n'est plus écrasé par une commande de caméra.
- **Risque.** Deux régions `role="status"` coexistent ; elles ont des portées
  distinctes (caméra vs aperçu) et des identifiants distincts.
- **Effort.** S.
- **Vérification.** Flèche sur `#globe-canvas` puis clic « Zoom − » :
  `#monde-m13-live` contient encore le nom du pays ; `#globe-live` contient
  « Zoom arrière. ».

## M13-02 — Substitution textuelle : le drapeau est `aria-hidden`

- **Preuve.** `globe-reveal.js:146` pose `aria-hidden="true"` sur `#globe-reveal` ;
  le drapeau découpé dans le contour est purement visuel. Aucun lecteur d'écran
  ne peut percevoir l'aperçu.
- **Solution.** Panneau `#monde-m13-panel` (sr-only, `role="group"`,
  `aria-label="Aperçu clavier du survol"`) contenant un `<table>` à sept lignes :
  pays, code, ères, repères, points, couverture, plage — valeurs dérivées des
  champs réels de `country` et de la convention `/14 domaines` de
  `globe.js:131`. Miroir mis à jour sur `onHover`, remis à `—` sur `onLeave`.
- **Impact.** L'information portée par le drapeau devient indexable et lisible
  sans canvas, sans WebGL et sans couleur.
- **Risque.** Le tableau est sr-only : aucun décalage de mise en page, aucun
  sélecteur de test modifié.
- **Effort.** M.
- **Vérification.** Après `ArrowRight` sur le host, les sept `<td>` contiennent
  les valeurs du pays courant ; après `Tab` hors de la liste, tous valent `—`.

## M13-03 — Description stable du contour, sans toucher à `#globe-canvas`

- **Preuve.** `globe.js:278` pose `aria-describedby="globe-help"` sur le host ;
  l'adjonction d'un second IDREF casserait le contrôle
  `#globe-canvas[aria-describedby="globe-help"]` (`c2-orientation-atlas.md:121`).
- **Solution.** Nœud persistant `#monde-m13-desc` décrivant le mécanisme « drapeau
  découpé dans le contour » ; c'est le **panneau M13** qui le référence via
  `aria-describedby`, pas le host. Aucune écriture dans les attributs du host
  hormis la restauration du libellé (M13-05).
- **Impact.** Le sens visuel du drapeau est expliqué en texte stable, distinct
  de la région live transitoire.
- **Risque.** nul : le `aria-describedby` du globe reste strictement inchangé.
- **Effort.** S.
- **Vérification.** `#globe-canvas[aria-describedby]` vaut exactement
  `globe-help` ; `#monde-m13-panel[aria-describedby]` vaut `monde-m13-desc`.

## M13-04 — Focusin : repli d'aperçu si `highlight()` n'a pas porté le drapeau

- **Preuve.** `globe.js:419` attache `focus` directement à chaque bouton ;
  l'événement ne bouillonne pas et dépend du rendu de la liste. Si un autre
  greffon neutralise ce chemin, le focus clavier avance sans drapeau.
- **Solution.** Un seul `focusin` délégué sur `document`, résolvant
  `button[data-index]` dans `ctx.stage`, puis `reveal.hover(country)` uniquement
  si `reveal.current() !== country`. Aucun appel systématique : le chemin de
  `globe.js` reste prioritaire.
- **Impact.** L'équivalence clavier survit à la défaillance d'une lentille voisine.
- **Risque.** `reveal.hover()` est asynchrone (`globe-reveal.js:204`) mais pose
  `activeCountry` immédiatement (`:199`) : le test `current()` est fiable.
- **Effort.** S.
- **Vérification.** Déclencher un `focusin` synthétique sur un bouton pays :
  `#globe-reveal` reçoit `is-visible` et le bon masque, une seule fois.

## M13-05 — Focusout : retour au repos et restauration du libellé du host

- **Preuve.** `globe.js:282` et `:420` n'écoutent que `pointerleave`. Aucun
  `focusout` : après `Tab` hors de la liste, `#globe-reveal` reste `is-visible`.
  `globe.js:196-198` écrase en outre l'`aria-label` du host avec « X mis en
  évidence » et ne le restaure jamais.
- **Solution.** `focusout` délégué avec garde `relatedTarget` : si le focus reste
  sur un bouton pays ou sur le host, rien ne fait ; sinon `reveal.leave()`,
  remise à `—` du miroir et restauration du libellé de base mémorisé au premier
  rendu (`:270`). **Blocage partiel** : `notifyMondeLeave()` n'est pas exposé dans
  `ctx` (`registry.js:6-12`), les autres abonnés `onLeave` ne sont donc pas
  prévenus sur une sortie clavier.
- **Impact.** Le drapeau et l'annonce suivent le focus, pas seulement la souris.
- **Risque.** `focusout` précède `focusin` sur le bouton suivant : la garde
  `relatedTarget` évite un clignotement.
- **Effort.** M.
- **Vérification.** `Tab` depuis le dernier pays vers le texte d'aide :
  `is-visible` retiré, `aria-label` du host revenu au libellé de `globe.js:270`.

## M13-06 — Échap annule l'aperçu sans intercepter le routeur

- **Preuve.** `globe.js:226-227` renvoie explicitement Échap au routeur unique et
  n'appelle pas `reveal.leave()` côté clavier.
- **Solution.** Un `keydown` délégué unique qui, sur `Escape` et seulement si le
  focus est dans le host ou un bouton pays et qu'un aperçu est actif, appelle le
  même `clearHover()` que M13-05 — **sans** `preventDefault()` ni
  `stopPropagation()`.
- **Impact.** L'utilisateur clavier peut refermer l'aperçu tout en conservant la
  navigation Échap de la coque.
- **Risque.** Faible : l'événement continue de bouillonner vers le routeur.
- **Effort.** S.
- **Vérification.** Flèche puis Échap : `#monde-m13-live` dit « Aperçu du drapeau
  annulé. », `#globe-reveal` n'est plus visible, la vue reste `globe` si Échap
  est consommé par ailleurs.

## M13-07 — `onHover` : détecter la source clavier par le focus

- **Preuve.** `notifyMondeHover()` est émis aussi bien par le pointeur
  (`globe.js:455`, engine `onHover`) que par le clavier (`:193`, `highlight()`).
  Le callback ne porte pas de champ « source ».
- **Solution.** Déduire la source de `document.activeElement` : focus dans le host
  ou un bouton pays ⇒ annonce vocale ; sinon ⇒ miroir seul (le pointeur voit le
  drapeau, l'annoncer serait du bruit). Dédoublonnage par `lastMessage`.
- **Impact.** Une seule annonce par changement de pays, quelle que soit la voie
  (flèches sur le host ou focus dans la liste).
- **Risque.** Si le focus reste sur un contrôle de zoom pendant un survol
  pointeur, aucun message n'est émis : comportement voulu.
- **Effort.** S.
- **Vérification.** Survol souris : `#monde-m13-live` inchangé, miroir à jour.
  `ArrowRight` : `#monde-m13-live` contient nom, rang `Pays k sur N` et compteurs.

## M13-08 — Mouvement réduit : aperçu statique, aucune animation propre

- **Preuve.** `globe-reveal.js:85` neutralise la transition CSS et `:221`
  court-circuite `reveal()` en mouvement réduit, mais `hover()` (`:197-211`)
  n'a pas de garde explicite côté annonce.
- **Solution.** Lire `ctx.reducedMotion()` ; M13 n'injecte aucune transition ni
  `Element.animate()` et ajoute « Aperçu statique. » au message vocal.
- **Impact.** Informations identiques avec ou sans animation.
- **Risque.** nul : aucune frame ni `requestAnimationFrame` ajoutée.
- **Effort.** S.
- **Vérification.** Avec `prefers-reduced-motion: reduce`, fléchir : le message
  contient « Aperçu statique. » et aucun style `transition` n'est injecté par M13.

## M13-09 — Idempotence : abonnements accumulés et nœuds déconnectés

- **Preuve.** `registry.js:50-52` fait `push` sur `hoverCallbacks`/`leaveCallbacks`
  sans dé-duplication, alors que `runMondeEnhancements()` est rejoué à chaque
  `renderGlobe()` (`globe.js:442`). Un callback à closure locale pointerait vers
  les nœuds d'un rendu mort.
- **Solution.** Un unique pointeur module `current` remplacé à chaque rendu,
  subscriptions `onHover`/`onLeave` enregistrées **une seule fois**, gardes
  `isConnected` sur le live et le panneau, `cssOnce` via `ctx.css`, contrôles
  `byId` avant création.
- **Impact.** Navigation aller-retour sans annonces dupliquées ni nœuds fantômes.
- **Risque.** Les anciens callbacks du registre s'exécutent encore mais ne font
  plus rien : surcharge linéaire minime, non corrigeable sans modifier le registre
  (fichier partagé interdit).
- **Effort.** M.
- **Vérification.** Aller pays puis retour Monde trois fois : un seul
  `#monde-m13-live`, un seul `#monde-m13-panel`, une annonce par flèche.

## M13-10 — Confinement : zéro réseau, zéro aléa, zéro sélecteur de test

- **Preuve.** `UNIFIED_AUDIT/MONDE/README.md` interdit réseau, `Math.random`,
  `console.*` et la modification de `.globe-list button`, `.globe-country`,
  `#globe-reveal`. `globe-reveal.js:24,182` charge des fichiers locaux ; M13 n'a
  pas à en ajouter.
- **Solution.** Aucun `fetch`, `Image`, `url(http…)` ni `Math.random` ; aucun
  `console.*` ; aucun ajout/retrait de classe ou d'ID sur les sélecteurs testés —
  seulement des listeners et des nœuds préfixés `monde-m13-`. CSS injecté une
  fois sous `#monde-m13` (classe `.monde-m13-sr` isolée).
- **Impact.** La lentille reste remplaçable sans effet de bord sur les suites E2E.
- **Risque.** nul.
- **Effort.** S.
- **Vérification.** `node --check src/views/monde/M13.js` vert ;
  `grep -E 'Math\.random|console\.|fetch\(|https?://'` sur le module : vide ;
  `npm run check` rejoué par l'agent maître.

## Blocages

- `notifyMondeLeave()` absent du contrat `ctx` (`registry.js:6-12`) : la sortie
  clavier ne prévient pas les autres abonnés `onLeave` (M13-05).
- Registre à abonnements cumulatifs non modifiable : M13 se protège en amont
  (M13-09) mais ne peut pas dé-dupliquer globalement.

## Vérification locale

`node --check src/views/monde/M13.js` → **OK** (aucune autre commande lancée).
