# POC — Routeur clavier, priorité et découvrabilité (`t1-routeur-poc`)

Expertise appliquée : routeur clavier, ergonomie des commandes, map de touches.
Fichier possédé : `keyboard-router.js`. Fichiers lus sans modification : `app.js`, `plan.js`, `solar.js`, `story.js`, `dragon.js`, `globe-engine.js`, `index.html`, `APP_PLAN.md` §7/§10/§11, `scripts/e2e-keyboard.mjs`.
État de départ mesuré : `npm run test:e2e` = **14/14** (baseline rejouée avant audit).

> Les références `fichier:ligne` sont celles du snapshot audité. `app.js` est partagé avec d'autres surfaces de la refonte (bloc `nav-c4` ajouté depuis en `:1485`) : ses numéros de ligne peuvent avoir glissé, pas les comportements observés, reverifiés par E2E après implémentation.

## Diagnostic — 10 chantiers par priorité

### T1-01 — Le routeur n'est pas le premier à capter l'événement
**Problème (preuve).** `keyboard-router.js:59` écoute sur **`document`** en capture ; `globe-engine.js:693` écoute sur **`window`** en capture. L'ordre est `window → document`, donc `onGlobalKeyCapture` (`globe-engine.js:620-657`) s'exécute *avant* le routeur et appelle `event.stopImmediatePropagation()` en `globe-engine.js:655`. Le commentaire de `keyboard-router.js:3-6` (« unique point de dispatch ») est faux dès que le globe est visible : flèches, `+`, `-`, `0`, `Entrée` sont consommés en amont.
**Solution.** Enregistrer l'unique écouteur sur `window` en capture. Le script est chargé en premier (`index.html:740` vs `744`), donc son listener est inscrit avant celui du globe. Ajouter `globe` à la table de dispatch (`VECTEMPOREL_GLOBE.handleKey`, `globe-engine.js:838`) et `visible('globe-overlay') → 'globe'` au lieu de `'app'`.
**Impact sur l'évidence.** Critique — prérequis des 9 autres chantiers : sans lui, la « source unique » est une illusion et le double dispatch reste possible.
**Risque.** Moyen : `stopImmediatePropagation()` au niveau `window` coupe tout autre listener `window` ; aucun autre n'existe dans le dépôt (recherche exhaustive). Les listeners sur l'input de recherche restent intacts car les cibles éditables sont exclues du dispatch (T1-04).
**Effort.** S.
**Vérification.** `npm run test:e2e` = 14/14 ; instrumenter `VECTEMPOREL_KEYS.lastDispatch()` après une flèche sur le globe doit donner `module: 'globe'`, pas `app`.

### T1-02 — Priorité des modales incomplète : lecteur, « Le concept » et recherche absents de la chaîne
**Problème (preuve).** `keyboard-router.js:30-42` ne traite le lecteur que pour `Échap` ; `about-overlay` (`index.html:665`) et `search-results` (`index.html:78`) ne figurent jamais dans la chaîne. Le routage tombe sur `'app'` par défaut ou sur `'globe'`, si bien que la priorité réelle est décidée *dans* `app.js:1217-1261`, pas dans le routeur. Toute nouvelle modale introduite sans modifier `app.js` casse la priorité.
**Solution.** Remplacer la chaîne ad hoc par une pile ordonnée explicite : `reader → aides (story/solar/plan) → about → recherche → scène (story/solar/dragon/plan) → globe → socle app`, chaque entrée portant `{ id, test(), module }`. `Échap`, `Tab`, `?` restent globaux ; toute autre touche est dispatchée au premier layer visible.
**Impact sur l'évidence.** Critique — la règle « modales d'abord » devient vérifiable ; `APP_PLAN.md:186` (focus piégé) et `:154` (Échap ferme) sont respectés par construction.
**Risque.** Faible : l'ordre retenu reproduit exactement `app.js:1242-1261` et l'ordre historique du routeur. Le lecteur doit rester *devant* le globe (son `hidden` reste `false` pendant l'animation de fermeture, `app.js:2124-2128`).
**Effort.** M.
**Vérification.** Ouvrir le lecteur puis presser `?` : l'aide ne s'ouvre pas ; `Échap` ferme le lecteur sans quitter le Système (E2E : 2 contrôles).

### T1-03 — Routage de l'aide cassé : le nom d'overlay est pris pour un nom de module
**Problème (preuve).** `keyboard-router.js:34` renvoie l'**identifiant DOM** `'story-help'` (ou `'solar-help'`, `'plan-help'`) et l'affecte à `active` en `:35`. `call()` (`:46-52`) indexe la table `{app, plan, story, solar, dragon}` avec cette chaîne : aucune clé ne correspond, le handler vaut `undefined` et `:54` retourne **avant** `stopImmediatePropagation()` (`:55`). Résultat : en mode aide, le routeur ne fait rien et ce sont les écouteurs historiques qui gèrent l'événement — exactement l'inverse du contrat.
**Solution.** Mapper explicitement `story-help → story`, `solar-help → solar`, `plan-help → plan`, et garantir que **tout** chemin de `route()` aboutit à un module connu : `call()` lève un `console.warn` et stoppe malgré tout la propagation si le module est introuvable, pour éviter le double dispatch silencieux.
**Impact sur l'évidence.** Critique — élimine le cas où deux handlers traitent la même frappe et rend l'aide réellement pilotée par le routeur (E2E `:85-90`).
**Risque.** Faible : les handlers d'aide (`plan.js:193-207`, `solar.js:975-990`, `story.js:1034-1049`) gèrent déjà `Échap`/`?`/`Tab` et restent appelés une seule fois.
**Effort.** S.
**Vérification.** Ouvrir l'aide du Récit, presser `Échap` : `story-help.hidden === true` et `VECTEMPOREL_KEYS.lastDispatch().module === 'story'`.

### T1-04 — Garde `editable()` trop étroit : contrôles focusés détournés
**Problème (preuve).** `keyboard-router.js:21-26` ne filtre que `INPUT`, `TEXTAREA`, `SELECT` et `contentEditable`. Un `<button>` focusé n'est pas protégé : `Entrée`/`Espace` sont transmis au module, qui appelle `preventDefault()` (`plan.js:251-254`, `story.js:1105-1116`, `app.js:1300+`) et **supprime l'activation native** du bouton. Un `<select>` focusé (`plan.js`, sélecteur de pays) voit ses flèches consommées par `moveSelection()`. Seul `solar.js:1068` a un garde partiel (`isRealControl`).
**Solution.** Ajouter `isControl(target)` : `button, a[href], summary, input, select, textarea, [contenteditable]`, rôles ARIA `button/link/tab/checkbox/radio/switch/menuitem/option`, et `[tabindex]:not([tabindex="-1"])` — **en excluant les ancres de focus** `#solar-stage`, `#spiral-stage` (`solar.js:1123`) qui portent `tabindex="-1"`. Règle : `Entrée`/`Espace` sur un contrôle → stopper la propagation **sans** `preventDefault()` (l'activation native suit) ; flèches sur un `<select>` → laisser le comportement natif ; `Échap`/`?`/`Tab` restent globaux.
**Impact sur l'évidence.** Élevé — rétablit l'activation native de tous les boutons de la coque, `APP_PLAN.md:185` et WCAG 2.1.1/2.1.2. Le test E2E presse `Entrée` quand le focus est sur `#solar-stage` (mesuré), donc non contrôle : comportement inchangé.
**Risque.** Moyen : ne pas confondre les ancres `tabindex="-1"` avec des contrôles, sinon `Entrée` n'ouvre plus le lecteur dans le parcours E2E.
**Effort.** M.
**Vérification.** Focus sur `#solar-help-btn` puis `Entrée` → l'aide s'ouvre une seule fois (pas d'action globale) ; focus sur `#solar-stage` puis `Entrée` → lecteur ouvert (14/14).

### T1-05 — Aucune normalisation des touches, aucun garde modificateur
**Problème (preuve).** Le routeur lit `event.key` brut (`keyboard-router.js:30,34`). `?` = `Shift+/`, `+` = `Shift+=`, `-` = `_` selon les claviers ; `Maj+3` produit `event.key === '#'` en disposition US alors que `story.js:1067` lit `event.code`. Aucun test de `ctrlKey/metaKey/altKey` : `Ctrl+R` est dispatché à `solar.js:1006` (`r` → Récit) avec `preventDefault()`, ce qui **casse le rechargement du navigateur** ; `Cmd+K` n'est pas canalisé vers `app.js:1300`.
**Solution.** `canonical(event)` produisant un identifiant stable : `Shift+Digit1..4` depuis `event.code`, `?` pour `Shift+/`, `+` pour `=`, `-` pour `_`, minuscules pour les lettres. Garde global : `altKey` → abandon ; `ctrlKey/metaKey` → abandon sauf `k` (recherche) ; `shiftKey` autorisé.
**Impact sur l'évidence.** Élevé — fiabilité de la map de touches et non-capture des raccourcis navigateur ; réconcilie l'usage de `event.code` du Récit avec le reste du POC.
**Risque.** Faible : `Shift+Digit3/4` de l'E2E reste autorisé ; les événements transmis aux modules gardent leur `event.key`/`event.code` d'origine (aucune mutation).
**Effort.** S.
**Vérification.** `Maj+3` → `mode === 'places'` (E2E) ; `Ctrl+R` → aucun dispatch enregistré (`lastDispatch()` inchangé) ; comportement navigateur laissé intact.

### T1-06 — Six sources de vérité pour les mêmes raccourcis
**Problème (preuve).** Les touches sont codées en dur dans `app.js:1300-1363`, `plan.js:191-269`, `solar.js:996-1097`, `story.js:1055-1128`, `dragon.js:1531-1548`, `globe-engine.js:639-652`, et le contrat textuel vit à part dans `APP_PLAN.md:141-156`. Les grilles d'aide sont générées à nouveau dans `story.js:810-820` et `solar.js` (help) : tout ajout de touche crée une dérive entre le code, l'aide et le pied de page.
**Solution.** Déclarer dans le routeur un registre `SHORTCUTS` figé `{ id, keys, label, scope }`, calqué sur `APP_PLAN.md:141-156` et sur les raccourcis réellement observés (`p/o/Backspace`, `Home/End`, `PageUp/PageDown`, `Maj+4`). L'exposer via `VECTEMPOREL_KEYS.map()` et l'utiliser pour générer l'aide complémentaire (T1-08) et les `aria-keyshortcuts` (T1-07). Les modules restent propriétaires de l'action : le routeur ne duplique que la **déclaration**, pas la logique.
**Impact sur l'évidence.** Élevé — une seule table consultable par les trois experts (routeur, aide, coque) ; `APP_PLAN.md:202` (P4) reste le contrat de référence.
**Risque.** Moyen : les fichiers de module étant interdits, la déclaration ne peut pas encore remplacer leurs conditions — documenté comme blocage, pas simulé.
**Effort.** M.
**Vérification.** `VECTEMPOREL_KEYS.map().length` stable ; chaque entrée possède un `id` unique ; aucune doublon de `keys` dans un même `scope`.

### T1-07 — Libellés visibles et contrat §7 divergents, aucun `aria-keyshortcuts`
**Problème (preuve).** `APP_PLAN.md:147` annonce `Maj+1/2/3` « étape directe » : `story.js:1067-1070` les mappe en effet sur les **modes**, pas sur une « étape ». `Maj+4` (`story.js:1072-1076`, retour Système) n'apparaît pas dans le tableau §7. `solar.js:1028-1037` ajoute `p`/`o`, `solar.js:1060` `Backspace`, `app.js:1335-1353` `Home/End/PageUp/PageDown` : tous absents de l'aide. Aucun bouton ne porte `aria-keyshortcuts`, alors que `index.html:490` (« Aide clavier (?) ») et `index.html:507` existent déjà.
**Solution.** Depuis `SHORTCUTS`, poser `aria-keyshortcuts` sur les contrôles existants repérés par sélecteur stable (`#story-help-btn`, `#solar-help-btn`, boutons d'aide du Plan) sans modifier les modules ; générer une ligne de pied « Raccourcis » dérivée du registre. Documenter les écarts §7 comme **constats**, pas comme corrections inventées.
**Impact sur l'évidence.** Moyen — cohérence perçue, WCAG 1.3.1/4.1.2 et `APP_PLAN.md:122` (pied contextuel).
**Risque.** Faible : l'ajout d'attributs ARIA n'altère ni le layout ni l'E2E ; les sélecteurs sont vérifiés avant application.
**Effort.** S.
**Vérification.** `#story-help-btn` porte `aria-keyshortcuts="?"` en fin de chargement ; le registre liste `Maj+4` avec son libellé observé.

### T1-08 — Aide non affichable dans certaines cibles de focus
**Problème (preuve).** `keyboard-router.js:61` retourne immédiatement pour toute cible éditable : taper `?` dans `#globe-search` ou `#search-input` est bien natif, mais aucun `?` global ne peut plus ouvrir l'aide depuis ces champs. En mode aide, `story.js:1034-1049` gère `?` comme **fermeture** : la même touche a deux sens selon la couche, sans état explicite dans le routeur.
**Solution.** Distinguer `?` « global » et `?` « frappe » : si la cible est éditable, laisser la frappe native et exposer `VECTEMPOREL_KEYS.showHelp()` (cherche le bouton d'aide visible puis l'active) ; sinon, `?` route vers le module actif qui ouvre ou ferme son aide. `showHelp()` sert aussi de repli si `module.openHelp` n'existe pas.
**Impact sur l'évidence.** Élevé — `APP_PLAN.md:155` (« ? aide » dans toutes les vues) et découvrabilité de `c4-aide-poc`.
**Risque.** Faible : le test E2E presse `?` hors champ de saisie (focus mesuré sur un `button` du Récit), donc le chemin global reste testé.
**Effort.** S.
**Vérification.** `?` dans `#globe-search` insère bien un `?` dans le champ ; `VECTEMPOREL_KEYS.showHelp()` ouvre l'aide de la scène courante.

### T1-09 — Aucun équivalent tactile : la commande est le clavier ou rien
**Problème (preuve).** Toute action de navigation (aide, retour, suivant/précédent, ouvrir) n'existe que comme `keydown`. Sur mobile, `APP_PLAN.md:186` exige un focus visible mais aucun bouton d'aide/retour flottant n'est prévu dans le routeur ; l'utilisateur tactile n'a que les boutons internes de chaque scène, sans « Retour » global quand le clavier est absent.
**Solution.** Injecter depuis `keyboard-router.js` un bloc `<style id="nav-t1">` et une barre `#nav-t1-palette` (boutons `≥36px`, `aria-label` explicites) affichée uniquement en `@media (hover: none), (pointer: coarse)`. Les boutons ne dupliquent **aucune logique** : ils synthétisent un `KeyboardEvent` (bubbles, cancelable, `key` issu de `SHORTCUTS`) envoyé à `VECTEMPOREL_KEYS.handle()`. Masqué sur poste (E2E à 1440×900, `hover: hover`), donc aucun impact sur le test.
**Impact sur l'évidence.** Moyen — `APP_PLAN.md:10-14` (trois verbes, retour partout) et `:198` (P0 atteignable au clavier *et* au doigt).
**Risque.** Moyen : un `KeyboardEvent` synthétique traverse aussi les listeners natifs ; les gardes `isTrusted` n'existent pas ici, mais la pile de layers garantit un seul destinataire. Ne pas injecter la barre si `document.getElementById('nav-t1-palette')` existe déjà (id unique).
**Effort.** M.
**Vérification.** À 390×844 en émulation tactile, la barre est visible et « Retour » ramène au globe ; à 1440×900, `getComputedStyle(...).display === 'none'`.

### T1-10 — Aucune observabilité : impossible de prouver l'absence de double activation
**Problème (preuve).** `call()` (`keyboard-router.js:45-57`) ne journalise rien ; l'E2E (`scripts/e2e-keyboard.mjs:51-99`) vérifie uniquement des états finaux. Si deux handlers s'exécutent (cas T1-03), aucun contrôle ne le détecte : l'état final peut être identique alors que deux actions se sont annulées ou cumulées.
**Solution.** Exposer `VECTEMPOREL_KEYS.lastDispatch()` (retournant `{ key, canonical, layer, module, source, at }`), `stats()` (compteurs par module) et `run(id)` (exécution d'une commande nommée pour la palette et les tests). Émettre un `CustomEvent('vectemporel:keyroute', { detail })` sur `document` après chaque dispatch. Garde de réentrance pour ignorer un événement déjà marqué comme routé (propriété symbolique sur l'événement).
**Impact sur l'évidence.** Moyen — rend le contrat « un seul destinataire par frappe » mesurable et donne à `c4-aide-poc` un point d'entrée stable pour ses propres tests.
**Risque.** Faible : aucun changement de comportement, uniquement de l'instrumentation ; le `CustomEvent` n'est écouté par aucun module existant.
**Effort.** S.
**Vérification.** Après `Maj+3`, `lastDispatch().module === 'story'` et `stats().story - statsBefore === 1` (exactement un dispatch).

## Blocages documentés

- T1-06/T1-07 : les conditions de touches restent codées dans `app.js`, `plan.js`, `solar.js`, `story.js`, `dragon.js`, `globe-engine.js` (fichiers interdits). Le registre du routeur est la source de vérité **déclarée** ; la déduplication effective des conditions nécessitera une vague ultérieure.
- T1-04 : `plan.js:191-270` n'a pas de garde de saisie ; les touches frappées dans un `<select>` du Plan peuvent encore être interpretées par ce module. Le routeur expose `VECTEMPOREL_KEYS.isEditable()` mais ne peut pas modifier ce handler.
