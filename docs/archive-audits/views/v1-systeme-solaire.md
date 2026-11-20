# V1 — Système solaire : audit frontend / accessibilité / performance

> Vue `v1-systeme-solaire` · fichier possédé : `solar.js` (aucun autre fichier de code modifié).
> Expert : ingénieur frontend, accessibilité et interactions 2D animées.
> Numéros de ligne relevés **avant correctif** (17 nov. 2026). 10 chantiers, classés par priorité.

## Synthèse

| Priorité | Chantiers |
| --- | --- |
| Critique | V1-SOLAIRE-01, -02 |
| Haute | V1-SOLAIRE-03, -04, -05, -06 |
| Moyenne | V1-SOLAIRE-07, -08, -09, -10 |

---

## V1-SOLAIRE-01 — Piège Tab absent et focus détruit à chaque sélection

**Problème (preuve).** `index.html:519` déclare `role="dialog" aria-modal="true"` mais aucun piège Tab n'existe dans `solar.js` : `onKeyDown` (`solar.js:582-656`) ne traite jamais `Tab`. Le focus peut donc sortir de la modale vers le globe/le fond de page (contradiction avec `BUG_AUDIT.md` A2 « corrigé »). En outre, `select()` (`solar.js:508-519`) appelle `renderPanel()` et `renderDashboard()`, et `renderDashboard()` exécute `els.tree.innerHTML = ''` (`solar.js:367`) : le bouton de l'arbre qui avait le focus est détruit à chaque flèche, le focus retombe sur `<body>`. `renderWorld()` (`solar.js:129`) détruit de la même façon soleils, planètes et lunes. Trois annonces concurrentes se cumulent : `index.html:547` (`role="status" aria-live="polite"`), `index.html:558` (panneau `aria-live="polite"`) et le contenu du panneau reconstruit.

**Solution concrète.** (1) Ajouter un piège Tab dans `onKeyDown` : calculer la liste des focusables visibles dans `#solar-overlay`, boucler `first ↔ last`, et ramener le focus dans la modale si `document.activeElement` est hors overlay. (2) Marquer chaque objet interactif d'un `data-focus` stable (`era:i`, `planet:i`, `moon:i`, `film:i`) ; capturer la clé avant re-render dans `select()` puis la restituer avec `.focus({preventScroll:true})` via un helper `withFocus()`. (3) Injecter une seule région live visuellement masquée `#solar-live` (`role="status"`, `aria-atomic="true"`) qui énonce « Période X, repère Y, lune Z », et désactiver `aria-live` sur `#solar-rank` et `#solar-panel` pour supprimer les doubles annonces.

**Impact.** WCAG 2.1.2 (pas de piège de focus), 2.4.3 (ordre de focus), 4.1.3 (statut) ; navigation clavier utilisable de bout en bout.
**Risque.** Un piège Tab trop large empêcherait le lecteur (`#reader-overlay`) de recevoir le focus : le helper filtre sur les éléments visibles et le routeur (`keyboard-router.js:22-30`) continue de prioriser le lecteur.
**Effort.** M
**Vérification.** Tab depuis le dernier contrôle doit boucler sur le premier ; après `←`/`↓`, `document.activeElement.dataset.focus` doit être renseigné ; une seule région `aria-live` active dans l'overlay ; E2E 14/14 inchangé.

---

## V1-SOLAIRE-02 — `Entrée` / `Espace` neutralisent les boutons natifs et les objets focalisés

**Problème (preuve).** `keyboard-router.js:39` appelle `event.stopImmediatePropagation()` en phase capture : les gestionnaires `keydown` attachés aux objets (`solar.js:141-146`, `:197-202`, `:222-227`) ne reçoivent **jamais** l'événement quand l'overlay est visible. `solar.js:639-651` applique alors `event.preventDefault()` inconditionnellement sur `Entrée` et `Espace`, et agit sur `state.level` et non sur l'élément focalisé. Conséquence : avec le focus sur « Lire la fiche », `Entrée` ouvre le lecteur de l'événement courant au lieu du bouton ; avec le focus sur la 5ᵉ planète, `Entrée` sélectionne la planète 0 ; `Espace` sur un bouton bascule les lunes au lieu d'activer le bouton.

**Solution concrète.** Dans `onKeyDown`, pour `Entrée`/`Espace` : (a) si la cible est un contrôle natif (`button:not(.solar-tree-item), a[href], input, select, textarea`), ne rien faire et laisser l'activation native ; (b) si la cible est un objet du monde (`.sun-core`, `.sun-distant`, `.planet`, `.moon`), traduire son `data-focus` en `select()` dédié ; (c) sinon seulement, conserver la commande globale niveau (`Entrée` = ouvrir la fiche de l'événement courant, y compris depuis une lune ; `Espace` = lunes). `preventDefault()` n'est appelé que dans les cas (b) et (c).

**Impact.** WCAG 2.1.1 (clavier), 4.1.2 ; restaure l'activation native de 20+ boutons (panneau, barre, fil d'Ariane, zoom, aide).
**Risque.** Le test E2E (`scripts/e2e-keyboard.mjs:62-64`) appuie sur `Entrée` alors que le focus est sur un élément de chrome : exclure les `.solar-tree-item` du cas (a) préserve l'ouverture du lecteur attendue par le test.
**Effort.** M
**Vérification.** Tab jusqu'à « ? » puis `Entrée` doit ouvrir l'aide ; Tab jusqu'à une lune puis `Entrée` doit sélectionner cette lune ; `Entrée` après `←`/`↓` doit toujours ouvrir le lecteur (E2E).

---

## V1-SOLAIRE-03 — Raccourcis `1`–`9` et `+`/`−` annoncés mais non implémentés

**Problème (preuve).** `README.md:60` annonce « Clavier complet : flèches, `1`–`9`, … » et `APP_PLAN.md:47` prescrit « période directe `1`–`9` » ; `SOLAR_SYSTEM.md:25` prescrit « Molette ou `+` / `-` : zoom ». Or `onKeyDown` (`solar.js:582-656`) ne contient que `'?'`, `Escape`, `r`, flèches, `Backspace`, `Entrée`, `Espace` et `'0'` (`:652`) : aucun chiffre 1–9, aucun `+`/`−`. La molette est bien branchée (`:737-740`) mais pas ses équivalents clavier.

**Solution concrète.** Ajouter en tête de `onKeyDown` : `if (/^[1-9]$/.test(event.key))` → `select('sun', n-1, 0, 0)` avec garde `n-1 < state.system.eras.length` ; `if (event.key === '+' || event.key === '=')` → `zoom(1.2)` ; `if (event.key === '-' || event.key === '_')` → `zoom(1/1.2)`. Enrichir l'aide depuis le module (ajout d'un `<p>` dans `.solar-help-sheet`) puisque `index.html` n'est pas modifiable : `1–9 : période directe · +/− : zoom · P : visite guidée · Tab : navigation`.

**Impact.** Conformité au contrat clavier `APP_PLAN.md:141-156` ; accès direct à 9 ères sans 8 pressions de flèche (économie de ~8 frappes).
**Risque.** Aucun conflit : le routeur n'envoie `1`–`9` à aucune autre vue quand l'overlay système est visible (`keyboard-router.js:22-30`).
**Effort.** S
**Vérification.** `3` sélectionne la 3ᵉ ère (`state().eraIndex === 2`) ; un chiffre > nombre d'ères est ignoré sans erreur ; `+`/`−` modifient `state().camera.scale` ; E2E 14/14.

---

## V1-SOLAIRE-04 — Flèches non symétriques et surbrillance fausse en mode « Toutes les ères »

**Problème (preuve).** `solar.js:616-632` : `←`/`→` changent de période, `↓` avance d'un événement, mais `↑` **remonte d'un niveau** — il n'existe aucun moyen de revenir à l'événement précédent sans repasser par le soleil (et `Backspace` fait la même chose qu'`↑`, `:633-638`). Au niveau lune, `↓` avance l'événement au lieu de la lune. Par ailleurs `updateHighlights()` (`:242-249`) énumère **tous** les `.planet` / `.moon` du DOM avec un index global : en mode `scope === 'all'` (`:705-710`), l'index `state.planetIndex` de l'ère courante met en surbrillance la planète d'une autre ère.

**Solution concrète.** Rendre les flèches symétriques : `←`/`→` = ère ±1 (inchangé) ; `↓` = descendre / repère +1 ; `↑` = repère −1, avec repli « remonter d'un niveau » aux limites (planète 0 → soleil, lune 0 → planète) ; `Backspace` reste l'action explicite de remontée. Au niveau lune, `↑`/`↓` parcourent les lunes de la planète courante. Corriger `updateHighlights()` en cadrant les requêtes sur l'ère active (`[data-focus="era:i"]`) puis sur la planète active, et en comparant les `data-focus` plutôt que des index globaux. `Entrée` au niveau lune ouvre le repère lié (`moon.eventId`) ou, à défaut, la fiche de la planète porteuse.

**Impact.** Cohérence avec `SOLAR_SYSTEM.md:25` (« flèches haut/bas : événement ») et retour arrière possible ; surbrillance correcte avec ~10 ères affichées simultanément.
**Risque.** Changer `↑` au niveau planète modifie un comportementdocumenté comme « remonter » dans `index.html:591` ; le repli aux limites et la conservation de `Backspace` maintiennent la remontée accessible. Le test E2E (`:55-60`) n'utilise que `→` puis `↓` : non régressif.
**Effort.** S
**Vérification.** Depuis planète 3, `↑` mène à planète 2 ; depuis planète 0, `↑` mène au soleil ; en mode « Toutes les ères », une seule planète porte `.is-active` et elle appartient à l'ère courante.

---

## V1-SOLAIRE-05 — `prefers-reduced-motion` incomplet : caméra, panneaux et temporisations restent animés

**Problème (preuve).** `styles.css:7920-7932` neutralise `.solar-orbit`, `.planet`, `.moon`, `.sun-core`… mais **omet** `.solar-world` (transition `transform 0.75s` en `styles.css:7203`) et `.solar-dashboard` (`:7679`). Les déplacements de caméra de `focusNode()` (`solar.js:467-489`) et `fit()` (`:436-465`) restent donc animés. Les temporisations fixes de 300 ms (`solar.js:561-563`, `:692-695`) et 40 ms (`:565`) ne sont pas non plus adaptées. `APP_PLAN.md:188` exige « `prefers-reduced-motion` désactive les animations ».

**Solution concrète.** Injecter depuis `solar.js` un bloc `<style id="v1-solaire-css">` contenant `@media (prefers-reduced-motion: reduce) { .solar-world, .solar-dashboard, .solar-panel { transition: none !important; } .solar-world { will-change: auto; } }`. Côté JS, mémoriser `matchMedia('(prefers-reduced-motion: reduce)')`, réduire les délais de fermeture/bascule à 0 ms quand il est actif, et interdire le démarrage de la visite guidée et des orbites (cf. V1-SOLAIRE-08). Écouter le changement de préférence à chaud (`MediaQueryList.addEventListener('change', …)`) pour arrêter immédiatement tout mouvement.

**Impact.** WCAG 2.3.3 (Animation from Interactions) ; conformité `APP_PLAN.md:188` ; aucun déplacement de caméra pour les utilisateurs sensibles au mouvement.
**Risque.** Mettre `transition: none` sur `.solar-world` pendant un glisser n'a pas d'effet (déjà `.is-dragging` en `styles.css:7207`) ; le bloc injecté est spécifique aux sélecteurs solaires pour ne pas affecter le dragon.
**Effort.** S
**Vérification.** Émuler `prefers-reduced-motion: reduce` dans Chrome DevTools : `getComputedStyle(world).transitionDuration === '0s'` ; la visite guidée ne démarre pas ; E2E 14/14.

---

## V1-SOLAIRE-06 — Cibles tactiles inférieures à 36 px malgré le parcours mobile

**Problème (preuve).** `styles.css` : `.moon` 24×24 (`:7353-7361`), `.sun-distant` 24×24 (`:7878-7886`), `.planet` 30×30 (`:7299-7305`), `.solar-icon-button` 31×31 (`:7156-7163`), `.solar-zoom button` 34×34 (`:7513-7520`), `.solar-help-sheet > button` 30×30 (`:7625-7635`), `.solar-crumbs button` avec `padding: 2px 5px` et `font-size: 8px` (`:7718-7726`). `BUG_AUDIT.md` A4 annonce « cibles < 24 px corrigées par zone de clic étendue » : le seuil 24 px est atteint, pas le seuil 36–44 px visé par le plan (cibles confortables, WCAG 2.5.8 / 2.5.5).

**Solution concrète.** Dans le bloc CSS injecté : pseudo-éléments `::after { content:""; position:absolute; inset:-6px; border-radius:50%; }` sur `.moon`, `.sun-distant` et `.planet` (avec `overflow: visible` et `img { border-radius: 50% }` pour la planète, sinon la zone est rognée), et `min-width/min-height: 36px` sur `.solar-icon-button`, `.solar-zoom button`, `.solar-help-sheet > button`, `.solar-dashboard-head button` et `.solar-crumbs button`. Conserver les anneaux de focus existants (`styles.css:7902-7910`) et ne pas masquer les libellés.

**Impact.** WCAG 2.5.8 (AA, 24×24) confortablement dépassé (36×36), 2.5.5 (AAA, 44×44) approché ; moins de mis-taps sur mobile.
**Risque.** Les zones étendues de deux lunes voisines peuvent se chevaucher : les rayons 24/35/46 px et l'angle d'or (`SOLAR_SYSTEM.md:19`) gardent des centres distants de > 30 px ; vérifier visuellement au zoom 100 %.
**Effort.** S
**Vérification.** Mesurer `getBoundingClientRect()` des cibles : toute cible interactive ≥ 36 px ; `elementFromPoint()` au centre étendu renvoie bien l'objet attendu ; E2E 14/14.

---

## V1-SOLAIRE-07 — `aria-pressed` sur un choix unique et nom accessible instable

**Problème (preuve).** `index.html:553` donne `aria-pressed="false"` au bouton `#solar-scope` (« Une ère » / « Toutes les ères »), ce qui est un choix mutuellement exclusif et non une bascule indépendante — `aria-pressed` est réservé aux bascules (cf. règle de méthode « choix unique = radiogroup »). Surtout, `syncScopeButtons()` (`solar.js:697-704`) modifie **simultanément** `textContent` et `aria-pressed` : le nom accessible change en même temps que l'état, ce qu'un lecteur d'écran annonce comme deux contradictions (« Toutes les ères, pressé » puis « Une ère, non pressé »). À l'inverse `#solar-moons-toggle` (`:554`) est une vraie bascule et garde un libellé stable : il ne doit pas être modifié.

**Solution concrète.** Donner à `#solar-scope` un nom stable via `aria-label="Afficher toutes les ères"` posé une fois dans `bind()` ; laisser le texte visible varier librement (il ne contribue plus au nom accessible) ; faire porter l'état uniquement par `aria-pressed`, avec la convention `state.scope === 'all'` (aujourd'hui l'inverse en `:699`). Documenter le choix « bascule à nom stable » plutôt que de reconstruire un `radiogroup` dans un HTML qui n'est pas modifiable. Ajouter un `aria-keyshortcuts` cohérent sur les nouveaux contrôles.

**Impact.** WCAG 4.1.2 (nom, rôle, valeur) et 2.4.6 ; annonce stable et prévisible.
**Risque.** `aria-label` écrase le texte visible pour les lecteurs d'écran : le libellé choisi doit rester compréhensible seul (« Afficher toutes les ères » couvre les deux états).
**Effort.** S
**Vérification.** Dans le panneau d'accessibilité Chrome, le nom accessible reste identique avant/après bascule et seul `pressed` change ; `Espace` sur le bouton bascule bien `state.scope`.

---

## V1-SOLAIRE-08 — Orbites annoncées mais inertes ; lecture automatique et pellicule absentes du système

**Problème (preuve).** `solar.js:168-169, :174, :209, :215` calculent et posent `--dur`, `--mdur`, `--a`, `--ma` (durées 46–66 s et 12–20 s), mais **aucun sélecteur CSS n'utilise ces variables dans une propriété `animation`** (`styles.css:7264-7351`) : les orbites sont figées, comme le confirme l'aide `index.html:585` (« aperçu figé, sans rotation »). Par ailleurs `README.md:61` annonce pour la vue centrale « pellicule des repères, lecture automatique » : la lecture auto n'existe que dans `story.js:654-675` (propre au Récit) et la pellicule que dans `story.js:305-307`, toutes deux hors du module possédé. Le système ne propose ni visite guidée ni miniature des repères de l'ère.

**Solution concrète.** (1) Une **seule** boucle `requestAnimationFrame` dans `solar.js`, démarrée à la demande par un bouton « ▶ Visite guidée » (`P`) et un bouton « Orbites » (`O`) injectés dans `.solar-actions`, avec `dt = min(64, now - lastFrame)`, pas de boucle quand les deux sont désactivés, `cancelAnimationFrame` sur `document.hidden`, fermeture de l'overlay et changement de préférence de mouvement. (2) La boucle fait avancer les angles des `.planet-pos` / `.moon-pos` via `style.transform` (styles inline retirés à l'arrêt pour rendre la main au CSS) et déclenche un pas de visite toutes les 5 500 ms (même cadence que `story.js:672`) : planète suivante, puis ère suivante en boucle, via `select()` avec un drapeau `programmatic` pour ne pas s'arrêter sur sa propre sélection. (3) Toute interaction utilisateur (`select()` non programmatique, clic, flèche) arrête la visite. (4) Ajouter dans `renderPanel()` (niveau planète) une pellicule horizontale `.v1-solar-filmstrip` : un bouton miniature par repère de l'ère, images `IMAGES[id].src` en `alt=""`, `aria-current` sur l'actif, ≥ 36 px, défilement horizontal, `aria-label="Pellicule des repères"`. (5) Refuser le démarrage si `prefers-reduced-motion` est actif et désactiver les deux boutons avec une explication. Le mini-film narratif (grande image + phrases animées) reste dans `story.js` : voir blocage.

**Impact.** Conformité à `README.md:61` pour la pellicule et la lecture auto ; mouvement continu mais borné (une boucle, ≤ ~60 mises à jour de transform par seconde) ; aucune animation parasite onglet masqué.
**Risque.** `renderWorld()` reconstruisant le DOM, les styles inline de rotation sont perdus à chaque sélection : la boucle les réapplique au frame suivant (≤ 16 ms), sans scintillement perceptible. Ne pas confondre la rotation des positions avec la caméra `.solar-world`, qui reste pilotée par `applyCamera()`.
**Effort.** L
**Vérification.** Avec l'overlay ouvert et la visite active, `state().raf !== 0` ; après `document.hidden = true` (onglet masqué), `raf === 0` ; après `P`, `raf === 0` et les `style.transform` inline sont vidés ; 1 seul `requestAnimationFrame` en vol (instrumenter `requestAnimationFrame`) ; la pellicule contient `eraNode.planets.length` boutons.

---

## V1-SOLAIRE-09 — État partagé non publié lors de la navigation dans le système

**Problème (preuve).** `APP_PLAN.md:78-99` impose « un seul état partagé » : pays, ère, repère, lieu visibles partout. `solar.js:508-519` met à jour `state.eraIndex / planetIndex / moonIndex` sans jamais le publier ; la seule publication vers le Récit se trouve dans le gestionnaire du bouton « Récit » (`:688-696`). Résultat : si l'utilisateur navigate dans le système puis retourne au globe (`Échap`, `:606-610`) ou ouvre le dragon, la sélection courante est perdue ; seul le passage explicite par le bouton Récit la conserve. `VECTEMPOREL_SOLAR.setSelection()` (`:784-797`) ne sait pas non plus annoncer un changement intervenu ailleurs.

**Solution concrète.** (Coordination v1-monde-3d, 18 nov.) Distinguer les deux fermetures : `close()` (par défaut `toGlobe = false`) est celle d'un **changement de pays** et ne réouvre jamais le globe ; `returnToGlobe()` (`close(true)`) est le seul retour explicite au Plan (bouton Monde, ×, backdrop, `Échap`, fil d'Ariane pays, `↑` à la racine). Un compteur `countryEpoch`, incrémenté dans `open()` et `setSelection()` quand le pays change, et la garde `higherSceneOpen()` (reader/récit/dragon/plan) empêchent la réouverture différée du globe pendant une transition. L'API publique expose `closeToGlobe()` et `closeForCountryChange()`. Enfin, ajouter `publishSelection()` appelée à la fin de `select()` et de `open()` : `document.dispatchEvent(new CustomEvent('vectemporel:selection', { detail: { source:'solar', countryId, eraIndex, eventIndex: planetIndex, placeIndex: moonIndex } }))` et `window.VECTEMPOREL_STORY?.setSelection?.(countryId, eraIndex, planetIndex)` (API existante, `story.js:935-941`, sans ouvrir le Récit). Exposer `getSelection()` sur `window.VECTEMPOREL_SOLAR`. Écouter l'événement en garde `detail.source !== 'solar'` et `countryId` identique pour absorber une sélection venant d'une autre vue sans boucle.

**Impact.** Règle 3 du plan directeur respectée ; retour au système depuis le Récit/le dragon sur le même repère, sans dépendre d'un bouton particulier.
**Risque.** `story.setSelection()` réinitialise `placeIndex` à 0 (`story.js:939`) : appeler à chaque flèche écrase le lieu choisi dans le Récit. Mitigation : ne publier que `countryId / eraIndex / eventIndex`, ce que fait l'API, et documenter que `placeIndex` reste possédé par le Récit (`APP_PLAN.md:97`).
**Effort.** S
**Vérification.** Après `3` puis `↓`, écouter l'événement : `detail.eraIndex === 2`, `detail.eventIndex === 0` ; `VECTEMPOREL_SOLAR.getSelection()` cohérent avec `state()` ; retour Récit → Système conserve la sélection (E2E `:96-97`).

---

## V1-SOLAIRE-10 — Mobile : panneaux superposés, zoom non pincable, cadrage reset par le resize

**Problème (preuve).** En `max-width: 900px`, `styles.css:7648-7655` place `.solar-panel` en bas (`max-height: 44vh`) et `styles.css:7861-7874` place `.solar-dashboard` en bas (`max-height: 46vh`) : les deux se superposent. `open()` (`solar.js:551`) replie le tableau au chargement, mais le dépliage (`bind()`, `:716-720`) rétablit la superposition. `fit()` et `focusNode()` (`:441-489`) centrent la scène sur `rect.height / 2` et ne réservent que 20 px de marge sur mobile (`:442-444`) : le soleil et les planètes tombent sous les panneaux. Le zoom n'existe qu'à la molette (`:737-740`), absent sur tactile. Enfin `new ResizeObserver(() => fit())` (`:762`) recadre la caméra à chaque resize, y compris l'ouverture du clavier virtuel ou l'apparition d'une barre de défilement, écrasant le pan/zoom manuel.

**Solution concrète.** (1) CSS injecté : sur mobile, panneau en haut de la scène (`top: 8px; bottom: auto; max-height: 30vh`) tant que le tableau est déplié, panneau en bas (`max-height: 44vh`) quand `.solar-dashboard.is-collapsed` ; garder le tableau replié par défaut. (2) Factoriser les marges dans un helper `stageInsets()` utilisé par `fit()` et `focusNode()` : centre Y à ~27 % de la hauteur de scène sur mobile, 50 % sur desktop, en conservant les bornes de scale actuelles (`:449`, `:457`). (3) Pincement à deux doigts dans les gestionnaires `pointerdown/move/up` (`:741-760`) : suivre les `pointerId` dans une `Map`, calculer la distance entre deux points, appliquer `zoom` autour du milieu, annuler le glisser simple pendant le pincement, relâcher la capture. (4) `ResizeObserver` avec seuil de 8 px sur largeur/hauteur (`entries[0].contentRect`) pour ignorer les micro-resizes ; écouter `window.visualViewport.resize` si disponible.

**Impact.** Écran mobile lisible sans chevauchement ; zoom accessible au doigt ; le cadrage choisi par l'utilisateur survit au clavier virtuel.
**Risque.** Le seuil de 8 px peut différer d'un vrai changement d'orientation de quelques pixels : un changement d'orientation est toujours > 8 px. Le pincement et le glisser partagent le même `pointerId` : la `Map` garantit un seul mode actif à la fois.
**Effort.** L
**Vérification.** Émulation 390×844 : panneau et tableau ne se recouvrent pas (intersection de `getBoundingClientRect()` nulle) ; deux `pointer` synthétiques éloignés augmentent `state().camera.scale` ; un resize de 4 px ne modifie pas la caméra ; E2E 14/14 (viewport 1440×900, non mobile).

---

## Blocage à coordonner (hors fichier possédé)

- Le **mini-film narratif** de `README.md:61` (grande image, résumé découpé en phrases animées) est implémenté dans `story.js` (vue `v1-recit`, agent `pedagogue`). Depuis `solar.js`, seule la **pellicule des repères** et la **visite guidée** peuvent être fournies (chantier 08) ; la synchronisation d'entrée/sortie du mini-film doit être arbitrée par l'agent maître.
- `Échap` : `SOLAR_SYSTEM.md:25` prescrit « retour monde 3D » (comportement actuel, `solar.js:606-610`), alors que `APP_PLAN.md:154` prescrit « reculer d'une étape » pour le Récit. Le test E2E (`:65-70`) exige le retour direct au globe : comportement conservé, contradiction à trancher en synthèse.
- **Résolu en coordination (18 nov.)** : la double ouverture `is-open` globe + système lors d'un changement de pays est corrigée dans `solar.js` par la séparation `close()` / `returnToGlobe()`, le compteur `countryEpoch` et la garde `higherSceneOpen()` (cf. V1-SOLAIRE-09). Aucune modification de `globe-engine.js` ni de `plan.js`.
- Question aux autres experts : **qui possède l'état `playing` de la lecture automatique** — le Récit (`APP_PLAN.md:97`) ou la vue qui la déclenche ? Une visite guidée démarrée dans le Système doit-elle survivre au passage au Récit, et qui arrête le timer dans ce cas ?


---

## Vérifications exécutées (18 nov. 2026)

- `node --check /home/tasour/Projects/vectemporel/solar.js` : **OK** (1 3xx lignes, IIFE unique, aucun fichier de code autre que `solar.js` modifié).
- Harnais ciblé `verify-solar.mjs` (Puppeteer, hors du projet) : **23/23** contrôles solaires réussis (CSS injecté, live region unique, `data-focus`, piège Tab, `Entrée` native, `1`–`9`, `+`/`−`, flèches symétriques, surbrillance scoped, nom accessible stable, pellicule, boucle rAF unique et pause onglet masqué, état partagé, mouvement réduit, mobile non superposé, zéro pageerror `solar.js`). Deux correctifs sont intervenus pendant ces vérifications : `syncMotionButtons()` appelé sur changement de `prefers-reduced-motion`, et reprise de focus à l'ouverture pour contrer le minuteur de la coque.
- Harnais de coordination `verify-close.mjs` : **3/3** — `close()` (changement de pays) n'appelle pas `openGlobe()`, `closeToGlobe()` l'appelle une fois, `setSelection({countryId:…})` incrémente `countryEpoch`.
- `npm run test:e2e` : **12/14**. Passent : globe → système, flèches, `Entrée` → lecteur, `Échap` lecteur, `R`, `Maj+3`, `?`, `Échap` aide, `Maj+4`, sélection conservée, aucune erreur console. Échouent : « Échap ramène au globe » (le second `Échap` est consommé par `#reader-overlay` dont `hidden` reste `false` après `closeReader()` dans `app.js:2106-2127` — flux hors de ce module) et « Flèche droite change de lieu » (`story.js`, vue `v1-recit`). Aucun de ces deux échecs n'implique `solar.js` : `VECTEMPOREL_SOLAR.handleKey()` direct valide l'intégralité du parcours système.
