# Atlas — Coque commune, état unique et routeur clavier (`atlas-coque-navigation`)

Expertise appliquée : ingénieur frontend, accessibilité WCAG 2.2, architecture d'état.
Fichiers possédés : `src/ui/shell.js`, `src/domain/store.js`, `src/platform/keyboard.js`.
Fichiers lus sans modification : `src/app.js`, `src/views/*.js`, `README.md`, `styles.css`, `scripts/verify.mjs`, `tests/e2e.mjs`.

## Diagnostic — 10 chantiers par priorité

### ATLAS-COQUE-01 — Le routeur clavier capture Entrée/Espace et détruit l'activation native des boutons
**Problème (preuve).** `keyboard.js:73` enregistre `document.addEventListener('keydown', handle, true)` en phase **capture**. `keyboard.js:60-70` appelle `event.preventDefault()` sur `Entrée` et `Espace` alors que la cible peut être un `<button>` (onglet, crumb, « Point suivant », fermeture…). Résultat : un utilisateur qui tabule sur un bouton et presse Entrée déclenche l'action globale (ouvrir le détail / lecture) au lieu d'activer le bouton. Les contrôles de la coque deviennent inopérables au clavier, hors E2E qui teste uniquement les raccourcis sur `body`.
**Solution.** Ajouter un garde-fou `isControl(target)` (BUTTON/A/SUMMARY/INPUT/SELECT/TEXTAREA, rôles ARIA `button/link/checkbox/radio/switch/tab/menuitem/option`, `[tabindex]:not([tabindex="-1"])`) et retourner immédiatement pour `Entrée`/`Espace` si la cible est un contrôle. Conserver le comportement global quand le focus est sur `body` ou sur `<main tabindex="-1">` (cas E2E). Ajouter un garde modificateur `ctrl/meta/alt` en tête de `handle`. **Coordination `atlas-geographie` (a)** : point confirmé — test navigateur, `Entrée` sur « Repère précédent » change bien `eventIndex` 1→0 sans ouvrir le détail (`detailOpen: false`).
**Impact.** Critique — rétablit l'activation native de ~30 boutons ; WCAG 2.1.1 / 2.1.2.
**Risque.** Faible : l'E2E (`tests/e2e.mjs:33`) presse Entrée après un clic souris sur un bouton de globe supprimé du DOM → `activeElement = body` → comportement inchangé.
**Effort.** S.
**Vérification.** Onglet « 3 · Récit » focusé puis `Entrée` → doit rester en récit (et non ouvrir le détail) ; `npm run test:e2e` inchangé.

### ATLAS-COQUE-02 — Focus détruit à chaque rendu (`innerHTML = ''`)
**Problème (preuve).** `shell.js:137` vide `root` puis reconstruit toute la coque à chaque `emit` (`store.js:23-25`), y compris pour une simple flèche. `document.activeElement` retombe sur `body` ; la position de lecture et l'annonce vocale sont perdues à chaque frappe.
**Solution.** Avant le vidage, capturer l'attribut stable `data-fk` de l'élément actif ; après reconstruction, restaurer le focus sur `[data-fk]` identique avec `focus({preventScroll:true})`, avec repli sur `<main id="atlas-stage" tabindex="-1">`. Marquer les contrôles de la coque avec `data-fk`. Ne pas voler le focus sur les rendus passifs (`reason === 'play'`).
**Impact.** Critique — navigation claviercontinue, WCAG 2.4.3 / 2.4.7.
**Risque.** Moyen : ne pas restaurer vers un bouton de vue différent de celui utilisé par l'E2E (sinon l'Entrée suivante activerait ce bouton, voir 01). La restauration ne s'applique qu'aux éléments porteurs de `data-fk`.
**Effort.** M.
**Vérification.** Focus sur l'onglet « Chronologie », presse `→` : l'onglet reste focusé et `eventIndex` passe à 1.

### ATLAS-COQUE-03 — Aucune région live : les changements d'état sont muets pour les lecteurs d'écran
**Problème (preuve).** `shell.js` n'utilise ni `role="status"` ni `aria-live`. Le `.readout` de la coque n'existe pas. Changer de vue, de pays ou de repère (`store.js:32-82`) ne produit aucune annonce ; le texte du récit est recréé sans être lu.
**Solution.** Créer **une seule** région persistante hors de `#app` (donc jamais détruite par le rendu) : `<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">`. La mettre à jour depuis `render()` avec une phrase courte dérivée de l'état (vue, pays, repère i/n, et texte du point en vue Récit). Exposer `window.VATLAS_A11Y.getLive()` pour les tests.
**Impact.** Élevé — WCAG 4.1.3.
**Risque.** Faible : éviter l'annonce initiale en initialisant le dernier texte au premier rendu.
**Effort.** S.
**Vérification.** `page.keyboard.press('4')` → `VATLAS_A11Y.getLive()` contient « Géographie ».

### ATLAS-COQUE-04 — Overlays (aide, détail) sans sémantique de dialogue ni sortie souris
**Problème (preuve).** `shell.js:84-105` et `113-132` créent des `.help-overlay`/`.detail-overlay` sans `role="dialog"`, `aria-modal`, `aria-labelledby`, ni bouton de fermeture. `styles.css:238` les rend `position:absolute; inset:0`. Seuls `?` et `Échap` ferment (`keyboard.js:19-29`) : sur mobile/tactile, l'utilisateur est **enfermé** dans l'overlay. Le fond reste focusable et interactif.
**Solution.** Ajouter `role="dialog" aria-modal="true" aria-labelledby` + un bouton `.atlas-close` (`data-fk="help-close"` / `"detail-close"`), `tabindex="-1"` sur la feuille, piège de `Tab` local, et `inert` sur barre/fil/scène/pied tant que le dialogue est ouvert. Déplacer le focus vers le bouton de fermeture à l'ouverture, le restituer à la fermeture. Rendre `helpOpen`/`detailOpen` mutuellement exclusifs dans le store.
**Impact.** Critique — WCAG 2.1.2 / 4.1.2.
**Risque.** Moyen : le piège `Tab` vit dans `shell.js` (un seul `keydown` dans `keyboard.js` exigé par `verify.mjs:27`) ; l'`inert` ne doit pas masquer l'overlay.
**Effort.** M.
**Vérification.** Ouvrir l'aide au clic, fermer au clic ; `Tab` reste dans la feuille ; le fond n'est plus atteignable.

### ATLAS-COQUE-05 — État implicite et indices non bornés dans le store
**Problème (preuve).** `store.js:6-16` ne déclare pas `helpOpen`, pourtant utilisé par `shell.js:49,83` et `keyboard.js:21`. `store.js:27-30` fait un `Object.assign` sans validation : `keyboard.js:48` incrémente `placeIndex` sans borne (dépassement → « Aucun lieu documenté »), et toute vue peut écrire n'importe quelle clé.
**Solution.** Déclarer `helpOpen: false`. Après l'`assign`, borner les quatre indices (`eraIndex`, `eventIndex`, `pointIndex`, `placeIndex`) selon le pays/événement/lieux courants. Centraliser les actions manquantes : `stepPoint` (bouclage), `stepPlace` (bornage), `togglePlay`, `toggleScope`, `toggleHelp`, `toggleDetail`, `closeModal`.
**Impact.** Élevé — état unique fiable, fin des dérives d'index.
**Risque.** Faible : le borner s'applique après `selectCountry`/`selectEra`/`selectEvent` dont les valeurs sont déjà valides.
**Effort.** M.
**Vérification.** `stepPlace(+1)` au-delà du dernier lieu reste sur le dernier ; `VATLAS.getState().helpOpen === false` au chargement.

### ATLAS-COQUE-06 — Onglets et fil d'Ariane sans état sémantique, crumb mort
**Problème (preuve).** `shell.js:38` pose `.is-active` (couleur seulement) sur l'onglet courant, sans `aria-current`. `shell.js:66-75` : le crumb d'index 1 (le pays) a un gestionnaire qui ne fait **rien** (`if (index === 0) … else if (index >= 2) …`) : contrôle mort. Les séparateurs `›` (`shell.js:67`) sont lus comme du texte.
**Solution.** `<nav aria-label="Vues de l'atlas">` + `aria-current="page"` sur l'onglet actif, `aria-keyshortcuts="1"…"5"`. Rendre le crumb pays navigable vers `chronology`, ajouter `aria-current="page"` au dernier, marquer les séparateurs `aria-hidden="true"`. Factoriser les libellés de vues dans une table unique partagée barre/pied/fil/annonces.
**Impact.** Moyen — WCAG 1.3.1 / 4.1.2.
**Risque.** Faible.
**Effort.** S.
**Vérification.** `aria-current` présent sur exactement un onglet et un crumb ; le crumb pays change la vue vers `chronology`.

### ATLAS-COQUE-07 — Barre et pied incohérents, raccourcis non documentés
**Problème (preuve).** `shell.js:151` affiche « ← → repère · ↑ ↓ période · 1–5 vues » **même sur le globe** où `keyboard.js:43` retourne early (flèches sans effet), et `shell.js:152` annonce « Entrée détail » alors qu'Entrée est neutralisée sur le globe. `shell.js:87-95` documente 7 raccourcis mais pas `r/c/g/s/m` (`keyboard.js:35`), absents aussi de `README.md:63-71`. Le pied n'est pas mis à jour selon la vue.
**Solution.** Générer les deux bandes de texte depuis `VIEW_META` et la vue courante : sur le globe, « 1–5 vues · Échap retour · ? aide » ; ailleurs, les hints complets. Ajouter `Échap retour` au pied. Ajouter la ligne `r c g s m` dans la grille d'aide (sans toucher au README, fichier interdit, blocage documenté).
**Impact.** Moyen — cohérence perçue, WCAG 3.3.2.
**Risque.** Faible : l'E2E ne lit pas le texte du pied.
**Effort.** S.
**Vérification.** Sur le globe, le pied ne mentionne ni « repère » ni « détail ».

### ATLAS-COQUE-08 — Cibles tactiles et lisibilité mobile sous les seuils
**Problème (preuve).** `styles.css:77-81` : `.shell-icon` = 34×34 px ; `styles.css:266` : `.shell-tab` min-height 32 px et `font-size: 7px` à ≤620 px ; `styles.css:93-96` : `.crumb` ~9 px de haut. Sous les 36/44 px recommandés et sous un corps lisible.
**Solution.** Injecter `#atlas-coque-css` depuis `shell.js` (bloc CSS auto-porté, aucun fichier CSS existant modifié) : `.shell-tab { min-height:36px; min-width:0 }`, `.shell-icon { 36×36 }`, `.crumb { min-height:24px; padding:6px 8px }`, focus visible renforcé, `.sr-only` et styles des boutons de fermeture. **Coordination `atlas-geographie` (b)** : le numéro d'onglet est isolé dans `<span class="tab-num">` (masqué à ≤620 px, `aria-label` complet conservé) et les onglets passent en `flex:1 1 0; padding:0 4px` → débordement horizontal de 3 px à 390 px supprimé (`scrollWidth === innerWidth === 390`, mesuré). `prefers-reduced-motion` déjà global (`styles.css:271-273`), conservé.
**Impact.** Moyen — WCAG 2.5.8 / 1.4.4.
**Risque.** Faible : l'injection runtime arrive après la feuille liée, donc priorité sur sélecteurs de même spécificité.
**Effort.** S.
**Vérification.** À 390×844, `getBoundingClientRect()` des onglets ≥ 36 px de haut.

### ATLAS-COQUE-09 — Modales non exclusives, lecture automatique et modificateurs non maîtrisés
**Problème (preuve).** `store.js:79-82` : `goView` ferme le détail mais pas l'aide. `keyboard.js:76-83` : l'intervalle de 5 s avance `pointIndex` même si une modale est ouverte → le détail change sous les yeux de l'utilisateur. `keyboard.js:35-41` vérifie ctrl/meta pour les lettres mais pas pour les flèches/Entrée/Espace.
**Solution.** `goView` ferme les deux modales ; `toggleHelp`/`toggleDetail` s'excluent mutuellement ; la boucle temporelle teste `helpOpen || detailOpen` en plus de `document.hidden` ; garde `ctrl/meta/alt` global en tête de `handle`. La cadence n'est plus codée en dur (voir « Coordination inter-vues »). **Coordination `atlas-chronologie`** : arbitrage en faveur de la documentation — `↓` appelle désormais `stepEra(1)` en Chronologie/Constellation (comme `↑` appelle `stepEra(-1)`), tandis que `←/→` restent les repères ; Récit et Géographie gardent leur mapping contextuel (points/lieux), explicité dans l'aide.
**Impact.** Moyen — cohérence d'état, WCAG 2.2.2 (pause).
**Risque.** Faible.
**Effort.** S.
**Vérification.** Ouvrir l'aide puis presser `1` → aide fermée ; détail ouvert + lecture en cours → `pointIndex` stable pendant 6 s.

### ATLAS-COQUE-10 — Aucun crochet de test pour l'accessibilité de la coque
**Problème (preuve).** `tests/e2e.mjs` ( fichier interdit ) ne vérifie ni focus, ni `aria-live`, ni dialogues. `window.VATLAS` (`app.js:11-16`, fichier interdit) n'expose aucun diagnostic de coque ; seul `window.VECTEMPOREL_KEYS` existe (`keyboard.js:74`).
**Solution.** Exposer depuis `shell.js` un objet `window.VATLAS_A11Y = { getLive(), focusKey(), modal() }` adossé aux `data-fk` et à la région live, afin que l'E2E puisse affirmer focus/annonces sans modifier `app.js` ni le test. Documenter dans le rapport les assertions E2E à ajouter (blocage : `tests/e2e.mjs` n'est pas possédé).
**Impact.** Moyen — rend la régression mesurable.
**Risque.** Faible : API additive, aucun changement de `window.VATLAS`.
**Effort.** S.
**Vérification.** `VATLAS_A11Y.focusKey()` renvoie `'tab-chronology'` après focus sur l'onglet 2.

## Coordination inter-vues (demandes des sous-agents `atlas-recit`, `atlas-geographie`, `atlas-chronologie`)

La cadence d'auto-lecture n'est plus figée à 5 s dans `keyboard.js` :

- `store.js` exporte `DEFAULT_AUTOPLAY_MS = 5000` et porte `state.autoplayMs` (valeur initiale : la constante).
- `store.js` exporte `setAutoplayMs(ms)` (bornes 1000–60000 ms, arrondi, `reason: 'autoplay'`), utilisable depuis `src/views/recit.js` sans modifier le routeur.
- `keyboard.js` importe et réexporte `DEFAULT_AUTOPLAY_MS` / `setAutoplayMs`, et expose `window.VECTEMPOREL_KEYS.setAutoplayMs` pour les tests. Le `setInterval` fixe est remplacé par un `setTimeout` réordonnançable : la cadence est relue à chaque tick et un `subscribe` sur `reason === 'autoplay'` relance immédiatement le timer.
- Comportement par défaut identique (5000 ms), E2E inchangé ; la boucle reste unique et suspendue sur `document.hidden` ou modale ouverte.
- **`atlas-geographie` (a)** : `isControl()` étendu aux rôles ARIA interactifs ; `Entrée`/`Espace` n'appellent plus `preventDefault()` quand un contrôle est focusé ( chantier 01 ). Aucune modification de `src/views/geography.js`.
- **`atlas-geographie` (b)** : débordement de 3 px à 390 px corrigé dans le CSS injecté ( chantier 08 ). Aucune modification de `styles.css`.
- **`atlas-chronologie`** : `↑`/`↓` alignés sur `README.md:67` et sur l'aide de la coque ( chantier 09 ). `src/views/chronology.js` non modifié : sa phrase décrivant l'ancien mapping `↓ = repère suivant` devra être réécrite par son propriétaire.

## Vérifications

- `node --check src/ui/shell.js`, `src/domain/store.js`, `src/platform/keyboard.js` : **OK**.
- `npm run verify` : **11 contrôles + 10 pays OK** (dont « routeur clavier unique » : un seul `addEventListener('keydown')` dans `keyboard.js`).
- `npm run test:e2e` : bloqué avant toute assertion par un `TimeoutError` sur `page.goto(..., waitUntil: 'networkidle0')` (30 s). Toutes les requêtes réseau se terminent en < 1 s (diagnostic CDP) ; le timeout est reproductible avec un Chromium non modifié et s'aggrave avec la charge machine (plusieurs sessions Chromium parallèles), donc environnemental et non imputable à ces fichiers.
- Preuve de non-régression : copie de `tests/e2e.mjs` en `/tmp` avec seul `waitUntil` remplacé par `'domcontentloaded'` → **15/15 assertions PASS**, y compris « aucune erreur console ». Le fichier de test officiel n'a pas été modifié.
- Contrôles a11y complémentaires (navigateur, 390×844 et 800×600) : `scrollWidth === innerWidth`, onglets 53×36 px, `aria-current` unique sur barre et fil, dialogue d'aide `role="dialog"` + `aria-modal` + focus sur `help-close` + `inert` du fond, restauration du focus sur `help-toggle` à la fermeture, `setAutoplayMs` 2500/1000/60000 ms borné, zéro erreur console.

## Blocages
- `README.md:63-71` (table de navigation) et `tests/e2e.mjs` (assertions a11y) ne sont pas des fichiers possédés : documentés dans les chantiers 07 et 10, non modifiés.
- `styles.css` : aucune règle existante supprimée ; uniquement un style injecté `#atlas-coque-css` depuis `shell.js` (autorisé).

## Statut d'implémentation
Les 10 chantiers sont implémentés dans `shell.js`, `store.js`, `keyboard.js`. Vérifications détaillées en section « Vérifications » ci-dessus (le timeout `networkidle0` de l'E2E officiel est documenté, la non-régression est prouvée sur copie du test).
