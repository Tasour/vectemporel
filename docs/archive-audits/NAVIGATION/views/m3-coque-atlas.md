# M3 — Coque de l’Atlas (`m3-coque-atlas`)

Spécialité : ergonomie et accessibilité de la coque commune — barre, onglets, situation, retour, aide.
Fichier possédé : `~/Projects/vectemporel-atlas/src/ui/shell.js` (seul fichier modifié).
Fichiers lus sans modification : `src/app.js`, `src/domain/store.js`, `src/platform/keyboard.js`, `styles.css`, `src/views/*.js`, `README.md`, `scripts/verify.mjs`, `tests/e2e.mjs`.
Périmètre MACRO : « où suis-je, où puis-je aller, comment je reviens, comment je le sais » (hub `NAVIGATION/README.md:3`).

## Diagnostic — 10 chantiers, par priorité

### M3-01 — Le fil d’Ariane ignore la vue courante et sature de jalons vides
**Problème (preuve).** `shell.js:223-228` construit toujours les quatre mêmes segments (`Monde`, pays, ère, repère) et `shell.js:241-245` les envoie tous vers `chronology`. Aucun segment ne porte `state.view` : Récit, Géographie et Constellation affichent un fil **identique** pour le même repère. Sur le globe sans pays, `shell.js:225-227` produit trois fois « — ». Le dernier segment est un `<button>` (`shell.js:236`) avec `aria-current="page"` : un « vous êtes ici » cliquable, contraire au pattern de fil d’Ariane.
**Solution.** Construire le fil depuis une fonction unique `pathParts()` (macro→micro) qui ajoute systématiquement `VIEW_META[state.view].label`, omet les jalons absents au lieu d’afficher « — », et ne répète pas « Monde ». `<nav aria-label="Fil d’Ariane">` ; les ancêtres restent des boutons (`Monde` → `globe`, les autres → `chronology`), le dernier devient un `<span aria-current="page">` non focusable. Séparateurs `aria-hidden` conservés.
**Impact sur l’évidence.** Le fil devient une preuve de situation : pour un même repère, le texte diffère selon la vue. Assertions possibles : un seul `aria-current` dans le fil, zéro « — » sur le globe.
**Risque.** Faible : l’E2E ne sélectionne aucun `.crumb` ; le passage de `<button>` à `<span>` pour le dernier jalon ne casse aucun sélecteur (`tests/e2e.mjs`).
**Effort.** M.
**Vérification.** Sur `3` (récit), le fil se termine par « Récit » ; sur `4`, par « Géographie » ; sur le globe, le fil contient « Monde · vue d’ensemble » et aucun tiret.

### M3-02 — Aucune situation « vous êtes ici » permanente et textuelle
**Problème (preuve).** `render()` (`shell.js:327-348`) produit barre, fil, scène, pied : aucun bandeau de situation. La couleur de l’onglet actif (`shell.js:53`) est le seul indicateur, donc une information portée par la seule couleur ; le fil de M3-01 est le seul texte et disparaît logiquement derrière les modales (`shell.js:350-352` rend tout `inert`).
**Solution.** Insérer `<div class="atlas-situation" data-fk="situation">` juste sous la barre, avec un préfixe `<span class="sr-only">Vous êtes ici : </span>` et le texte de `situationText()` partagé avec le fil et l’annonce live. Présent dans les 5 vues, y compris le globe et l’état « aucun pays sélectionné ». Style injecté dans `<style id="nav-m3">` (jamais `styles.css`). Ajouté à la liste `inert` avec les autres régions.
**Impact sur l’évidence.** Situation mesurable sans lecteur d’écran : `document.querySelector('.atlas-situation').textContent` reflète l’état; plus d’information portée par la seule couleur (WCAG 1.4.1 / 1.3.1).
**Risque.** Faible : nœud additionnel, aucun identifiant existant réutilisé.
**Effort.** S.
**Vérification.** `.atlas-situation` existe après `mount()`, contient « Monde » au chargement, le nom du pays après sélection, et le libellé de vue après `1`–`5`.

### M3-03 — Onglets : ordre macro→micro et rôles opaques, libellés trop courts
**Problème (preuve).** `shell.js:12-20` ne stocke qu’un couple `id → label`. `shell.js:194` donne `aria-label="1 · Monde"` etc. : le chiffre est lu mais pas la place dans la hiérarchie (ensemble des pays → ères/repères → points → lieux → synthèse). Aucune instruction sur `1`–`5` n’est rattachée au `<nav>` (`shell.js:189-190`) ; les raccourcis `r c g s/m` ne vivent que dans l’aide (`shell.js:266`).
**Solution.** Conserver les libellés visibles (stabilité E2E et cohérence avec `README.md:65`), enrichir `aria-label` avec un rôle hiérarchique issu d’une table `VIEW_ROLE`, ajouter `aria-describedby` pointant un `<p id="atlas-tab-help" class="sr-only">` unique portant « ordre macro→micro, 1–5 ou r/c/g/s/m pour changer de vue ». Garder `aria-current="page"` sur exactement un onglet et les `tab-num` visibles ≥620 px.
**Impact sur l’évidence.** La barre elle-même documente la progression : un lecteur d’écran entend « niveau 3 sur 5 · points du repère » sans ouvrir l’aide.
**Risque.** Faible : changement de texte d’`aria-label` uniquement ; les sélecteurs d’E2E sont les raccourcis clavier, pas ces libellés.
**Effort.** S.
**Vérification.** `aria-describedby` de la `<nav>` résout vers un nœud unique ; chaque onglet a un `aria-label` préfixé « niveau N sur 5 ».

### M3-04 — Retour visible unique absent : Échap seulement
**Problème (preuve).** Aucun bouton de retour dans `renderBar()` (`shell.js:180-216`) ni ailleurs dans la coque. Le seul retour est `keyboard.js:39-43` (Échap) : inaccessible au tactile et invisible. Des boutons locaux concurrents existent dans les vues (`constellation.js:205,358`, `geography.js:339`, `recit.js:289`) sans coordination avec la barre — files possédées, non modifiables ici.
**Solution.** Un seul bouton `Retour` canonical dans `shell-actions` (`data-fk="back"`, `aria-keyshortcuts="Escape"`) dont la cible est calculée par `backTarget()` : fermer l’aide → fermer le détail → revenir au Monde ; `disabled` et libellé « Retour indisponible » sur le globe sans modale. Même effet qu’Échap, jamais un second comportement. `aria-label` dynamique et unique.
**Impact sur l’évidence.** Retour observable au clic comme au clavier ; `window.VATLAS_A11Y.back()` expose la cible pour les tests.
**Risque.** Moyen : les boutons locaux des vues restent (fichiers interdit) ; documentés comme raccourcis locaux dans l’aide (M3-05) et non supprimés.
**Effort.** M.
**Vérification.** Ouvrir l’aide puis cliquer Retour → aide fermée ; sur `4`, cliquer Retour → `view === 'globe'` ; sur le globe, le bouton est `disabled`.

### M3-05 — Aide non contextuelle et muette sur le retour
**Problème (preuve).** `renderHelp()` (`shell.js:255-284`) affiche la même grille de 8 lignes (`shell.js:264-277`) dans les 5 vues, avec un titre fixe (`shell.js:260`). Elle ne dit pas où l’utilisateur se trouve, ne mentionne pas le bouton Retour de M3-04, et ne hiérarchise pas les raccourcis selon la vue. Le bouton `?` (`shell.js:204-212`) n’a pas `aria-haspopup="dialog"`.
**Solution.** Titre `Aide · <vue>` ; paragraphe `<p id="atlas-help-context">Vous êtes ici · <situationText()></p>` raccordé au dialogue par `aria-describedby` ; ligne « Échap / Retour » ; note explicite « les boutons ← Chronologie des vues sont des raccourcis locaux, le Retour de la barre et Échap sont la commande unique ». `aria-haspopup="dialog"` sur `?`, `aria-expanded` conservé.
**Impact sur l’évidence.** L’aide devient une preuve de situation et de cohérence barre/pied/retour.
**Risque.** Faible : l’E2E n’ouvre jamais l’aide ; `aria-describedby` additif.
**Effort.** S.
**Vérification.** Ouvrir `?` en Géographie → le titre contient « Géographie » et le paragraphe contient le pays courant.

### M3-06 — Pied déconnecté de la barre et de la progression
**Problème (preuve).** `footerText()` (`shell.js:316-325`) renvoie deux chaînes codées en dur, sans `VIEW_META`, sans nom de vue ni indice de repère ; il répète des hints déjà dans l’aide. `styles.css:267` masque la bande droite à ≤620 px sans la remplacer. La progression vit seulement dans `.rank` du fil (`shell.js:248-250`), donc deux sources divergentes.
**Solution.** Générer les deux bandes depuis `VIEW_META` et l’état : gauche `Vous êtes ici · <libellé> · repère i/n` (même vocabulaire que `situationText()`), droite les raccourcis contextuels globe / non-globe. `<footer aria-label="Situation et raccourcis">` ; la bande gauche reste visible sur mobile via le style injecté.
**Impact sur l’évidence.** Barre, bandeau, fil, pied et live partagent la même table de libellés : une seule vérité vérifiable.
**Risque.** Faible : l’E2E ne lit pas le texte du pied (preuve : `tests/e2e.mjs:23-54`).
**Effort.** S.
**Vérification.** Sur `3`, le pied contient « Récit » et l’indice `i/n` identique à `.rank`.

### M3-07 — Focus détruit dans les vues et volé toutes les 5 s par l’auto-lecture
**Problème (preuve).** `captureFocusKey()` (`shell.js:105-108`) ne lit que `data-fk`. Or aucun `src/views/*.js` ne pose `data-fk` (vérifié par recherche) : après une flèche dans une vue, `manageFocus()` (`shell.js:134-135`) retombe sur `focusStage()`. Pire : `subscribe(render)` (`app.js:8`) transmet `(state, reason)` mais `render()` (`shell.js:327`) ignore `reason` ; l’auto-lecture (`keyboard.js:99-111`, pas de `document.hidden` pendant 5 s) reconstruit le DOM et déplace le focus vers la scène à chaque tick. Le déclencheur de modale n’est mémorisé que par clé (`shell.js:126`), donc perdu pour un contrôle de vue.
**Solution.** Avant `innerHTML`, capturer `activeElement`, sa clé `data-fk` **et** une signature stable (`tag`, `role`, `aria-label`, `aria-current`, texte tronqué, index parmi frères homonymes). Après reconstruction, `findBySignature()` retrouve l’équivalent (scène `#atlas-stage` incluse). `render(_state, reason)` exploite `reason` : pour `play`/`autoplay`, restaurer la signature si trouvée, **ne jamais forcer la scène** ; sinon repli sur la clé puis la scène. Mémoriser la signature du déclencheur de modale pour un retour exact, avec repli sur `help-toggle`/`detailTrigger`. `focusByKey` ignore les boutons `disabled` (nouveau bouton Retour de M3-04).
**Impact sur l’évidence.** `VATLAS_A11Y.focusKey()` et `getLive()` permettent d’affirmer la continuité du focus pendant l’auto-lecture (WCAG 2.4.3 / 3.2.1).
**Risque.** Moyen : apparier par signature peut échouer si une vue change radicalement son libellé ; le repli sans vol de focus est alors volontaire. Ne pas toucher `keyboard.js` (verify.mjs:27 exige un seul `keydown`).
**Effort.** L.
**Vérification.** Focus sur « Repère suivant → », pressez `Entrée` puis Échap : le focus revient au même bouton ; en lecture récit, le focus reste sur le contrôle focusé pendant ≥2 ticks (10 s).

### M3-08 — Dialogue : pas de fermeture hors feuille, pas de description, pas de `haspopup`
**Problème (preuve).** `makeDialog()` (`shell.js:162-178`) pose `role/aria-modal/aria-labelledby` et le piège `Tab` (`shell.js:140-160`), mais pas d’`aria-describedby`, et l’overlay n’écoute aucun clic : sur mobile, seul le bouton « Fermer » ou Échap sortent (l'aide ne peut pas être refermée en touchant le fond). `?` n’annonce pas `aria-haspopup`.
**Solution.** Factoriser `closeAction` pour le bouton et le clic sur le fond (`event.target === overlay`) ; `aria-describedby` optionnel transmis par `makeDialog` (contexte pour l’aide) ; `aria-haspopup="dialog"` sur `?` ; `inert` appliqué aussi au nouveau bandeau de situation (M3-02). Le piège `Tab` reste local (aucun second `keydown` global).
**Impact sur l’évidence.** Dialogue fermable de 3 façons cohérentes (bouton, fond, Échap) et décrit ; WCAG 2.1.2 / 4.1.2.
**Risque.** Faible : le clic sur la feuille ne doit pas propager (`event.target !== overlay`) ; l’E2E presse Échap, chemin inchangé.
**Effort.** S.
**Vérification.** Clic sur le fond de l’aide → `.help-sheet` absent ; l’overlay a `aria-describedby="atlas-help-context"`.

### M3-09 — Mobile ≤620 px : cibles, crumbs et situation malmenés
**Problème (preuve).** Le style injecté existant (`shell.js:59-67`) masque `tab-num`, réduit les onglets à 9 px mais laisse `.crumb { min-height:24px }` (`shell.js:52`), soit sous le seuil 36/44 px ; `styles.css:252-270` empile les crumbs et cache la bande droite du pied. Le fil de M3-01 (5 jalons + séparateurs + `.rank`) va se wrapper sur 390 px et repousser la scène.
**Solution.** Dans `<style id="nav-m3">` (injecté après `#atlas-coque-css`) : `.shell-trail { flex-wrap:nowrap; overflow-x:auto; scroll-snap-type:x proximity }`, `.crumb { min-height:36px; display:inline-flex; align-items:center }`, `.rank { flex:none }`, `.atlas-situation { white-space:nowrap; overflow:hidden; text-overflow:ellipsis }`, `.shell-icon { width:40px; height:40px }`, garde de la bande gauche du pied visible. `prefers-reduced-motion` : `scroll-behavior:auto`.
**Impact sur l’évidence.** À 390×844, toutes les cibles de la coque ≥36 px et aucun débordement horizontal (`scrollWidth === innerWidth`).
**Risque.** Faible : le scroll horizontal du fil est natif, sans JavaScript ; le style injecté ne modifie pas `styles.css`.
**Effort.** S.
**Vérification.** Mesure `getBoundingClientRect()` des `.crumb`, `.shell-tab`, `.shell-icon` à 390 px.

### M3-10 — Annonce live et situation visible redondantes / divergentes
**Problème (preuve).** `announcement()` (`shell.js:83-96`) reconstruit sa propre phrase (« Vue ... Aucun pays sélectionné. ») sans utiliser le vocabulaire du fil ni du pied (M3-01/02/06). Le même état peut donc être nommé différemment selon le canal ; `VATLAS_A11Y` (`shell.js:365-369`) n’expose pas la situation, seulement le live brut.
**Solution.** Faire de `situationText()` la source unique : `announcement()` préfixe chaque phrase par « Vous êtes ici · <situation> » avant la précision contextuelle (point du récit, modale), en conservant `aria-live="polite"`/`aria-atomic` et la déduplication de `updateLive()` (`shell.js:98-103`). Exposer `situation()` et `back()` dans `VATLAS_A11Y` (API additive).
**Impact sur l’évidence.** Un seul test peut comparer texte visible et annonce vocale : `getLive()` contient `situation()`.
**Risque.** Faible : phrases plus longues mais toujours atomic et dédupliquées ; l’E2E ne lit pas le live.
**Effort.** S.
**Vérification.** Après `4`, `getLive()` contient le même libellé de vue que `.atlas-situation` et le pied.

## Coordination M4 — taxonomie source unique de vérité
`app.js` (possédé par `m4-taxonomie-atlas`, non modifié) expose `TAXONOMY_VERSION = 'm4.1'`, `VIEW_TAXONOMY` (5 vues `id/label/digit/letter/level/role`), `viewInfo`, `shortcuts`, `position`. La coque s'y aligne **sans aucune table locale de libellés** :
- `TABS`, `VIEW_META` et `VIEW_ROLE` (codés en dur avant) sont supprimés ; la barre itère `VIEW_TAXONOMY` pour l'ordre, les libellés visibles, les chiffres `1–5`, `aria-keyshortcuts`, les niveaux et les rôles dans `aria-label`.
- Le paragraphe sr-only de la `<nav>` est généré depuis les `role` et `digit/letter` du catalogue ; la barre porte `data-taxonomy="m4.1"` et `VATLAS_A11Y.taxonomy()`.
- La grille d'aide est le miroir de `shortcuts()` (7 lignes, clés et portées), plus le `role` de la vue courante ; plus aucune ligne de raccourci codée en dur dans `shell.js`.
- `pathParts()`, `situationText()`, `footerText()` et `announcement()` dérivent de `position()` : fil, bandeau, pied et live partagent exactement le même libellé de vue que `VATLAS.position()`.
- Import circulaire ESM `app.js ↔ shell.js` maîtrisé : les liaisons du catalogue ne sont lues que dans des fonctions appelées après `mount()` (`app.js:124`), jamais au niveau module (aucun TDZ).

Preuve navigateur : `data-taxonomy === VATLAS.taxonomyVersion === VATLAS_A11Y.taxonomy() === 'm4.1'` ; 5 onglets ordonnés et libellés comme le catalogue ; 7 lignes d'aide identiques à `shortcuts()`.

## Coordination T2 — routeur clavier (3 points signalés)
- **(a) Aide synchronisée.** La grille d'aide est désormais générée depuis `window.VECTEMPOREL_KEYS.helpMap()` (map unique du routeur, 11 lignes : 5 vues + 6 commandes), avec annotation « vue courante » ; repli sur `shortcuts()` (`app.js:92`) si le contrat n'est pas publié. Aucune ligne de raccourci codée en dur dans `shell.js`. Preuve : 11/11 clés identiques à `helpMap()`.
- **(b) Retour mobile.** Le bouton `data-fk="back"` de M3-04 existe à toutes les largeurs ; il était déjà mesuré à 40×40 px et actif à 390×844. Il porte maintenant un libellé visible « Retour » (glyphe `↩` + `::after`), avec spécificité `.shell-icon.atlas-back` pour survivre à la règle mobile `.shell-icon { width:40px }`. Mesuré à 52×40 px, `scrollWidth === clientWidth`, aucun débordement.
- **(c) Gel des modales visible.** Paragraphe `.atlas-help-freeze` ajouté à l'aide : interface gelée (`inert`, ni clic ni Tab), lecture automatique suspendue (`keyboard.js:252-254`), trois sorties (Échap / Fermer / clic hors feuille).

## Blocages / coordination
- `src/views/constellation.js:205,358`, `geography.js:339`, `recit.js:289` portent des boutons de retour locaux : fichiers non possédés, non modifiés. La barre porte la commande canonique ; l’aide (M3-05) les qualifie de raccourcis locaux.
- `tests/e2e.mjs`, `app.js`, `store.js`, `keyboard.js`, `styles.css`, `README.md` : lus, non modifiés. Tout le CSS passe par `<style id="nav-m3">` injecté depuis `shell.js`.
- **E2E concurrent (hors surface).** `tests/e2e.mjs:50-52` a été étendu par une surface concurrente d'une assertion `6 = points` : or `app.js:20-26` (taxonomie figée à 5 vues), `store.js:12` (`VIEWS` 5 entrées) et `keyboard.js:14-21` (map 5 vues) restent sur 5 vues. Les 15 assertions historiques passent ; seul `6 = points` échoue, sans lien avec `shell.js`. La coque rend désormais un message neutre pour un id de vue inconnu au lieu d'afficher Constellation par erreur. Aucun fichier de cette surface n'a été modifié.
- `verify.mjs:27` impose un seul `addEventListener('keydown')` : le piège de Tab reste un écouteur local sur l’overlay, aucun écouteur global ajouté.

## Statut d’implémentation
Les 10 chantiers sont implémentés dans `src/ui/shell.js` uniquement, alignés sur la taxonomie M4. Vérifications : `node --check src/ui/shell.js` OK ; `npm run verify` OK ; 15/15 E2E sur copie temps `waitUntil: 'domcontentloaded'` ; 34 contrôles M3/M4/T2 additionnels OK (détails dans la réponse finale du sous-agent). Le `npm run check` officiel bute sur le timeout `networkidle0` environnemental déjà documenté en vague 1.
