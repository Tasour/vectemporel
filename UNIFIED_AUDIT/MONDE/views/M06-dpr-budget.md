# M06 — DPR et budget de pixels

Lentille **M06** (domaine A : rendu WebGL) de la vague « Monde ». Fichier possédé : `src/views/monde/M06.js`. Rapport : `UNIFIED_AUDIT/MONDE/views/M06-dpr-budget.md`.

Pièces lues pour le diagnostic : `public/globe-engine.js`, `src/views/globe.js`, `src/views/monde/registry.js`, `src/views/monde/index.js`, `styles.css`, `GLOBE_LAYOUT.md`, `UNIFIED_AUDIT/MONDE/README.md`.

Aucune donnée historique n'est inventée. Aucun fichier partagé n'est modifié : les dix chantiers sont implémentés dans le seul module `M06.js`, via `ctx.css('monde-m06', …)`, des identifiants préfixés `monde-m06-` et une garde d'existence sur le panneau (rendu répété). Le moteur est un singleton exposé par `window.VECTEMPOREL_GLOBE` ; `ctx.onReady` fournit `{ engine, host, selected }` (`globe.js:464-468`, `registry.js:50,58-60`), ce qui donne accès à l'API publique `resize()`, `invalidate()` et `getInfo()`.

> **Contrainte de périmètre.** La constante de budget (`globe-engine.js:202`) et le plafond DPR (`globe-engine.js:204`) vivent dans `public/globe-engine.js`, fichier interdit. La lentille ne peut donc pas les modifier : elle les **rend observables**, **coordonne les recalculs** et **détecte les dérives** via l'API publique. Le plafond numérique est dupliqué en miroir documenté dans `M06.js` (`PIXEL_BUDGET = 2200000`, `DPR_MAX = 1.5`, `DPR_MIN = 0.7`) ; toute modification future de la spec doit être répercutée aux deux endroits.

---

## M06-01 — DPR effectif et dimensions du tampon opaques

- **Preuve.** `globe-engine.js:202-207` calcule un DPR plafonné par un budget de 2,2 Mpx et appelle `setPixelRatio` / `setSize`. `getInfo()` (`globe-engine.js:691-703`) expose `pixelRatio`, `width`, `height`, mais aucun élément du DOM ne les consomme : le réglage réel est invérifiable sans outil développeur.
- **Solution.** Ajouter un panneau `#monde-m06-budget` ancré en bas à droite de `.globe-scene` (hors du HUD et des commandes), avec une ligne de texte réel `#monde-m06-budget-line` : `DPR x.xx · tampon L×H · N px`, alimentée par `getInfo()`. Le texte est indexable, en `font-variant-numeric: tabular-nums`, et ne dépend d'aucune couleur.
- **Impact.** La densité de pixels réellement appliquée devient une donnée visible et auditable, distincte du `devicePixelRatio` déclaré par l'appareil.
- **Risque.** faible : le panneau est `pointer-events: none`, avec repli mobile à 210 px ; il ne recouvre ni `.globe-controls` (bas-gauche) ni `.globe-hud` (haut).
- **Effort.** S.
- **Vérification.** En vue Monde avec WebGL actif, `#monde-m06-budget-line` contient un DPR et une paire de dimensions cohérents avec `window.VECTEMPOREL_GLOBE.getInfo()`.

## M06-02 — Budget de 2,2 Mpx sans témoin de dépassement

- **Preuve.** `globe-engine.js:202` : `pixelBudget = 2200000` est une constante magique. Si le moteur évolue ou si un autre greffon agrandit le conteneur, rien ne signale un dépassement ; `globe.js:335` affiche seulement « textures et palette locales ».
- **Solution.** Calculer `pixels / PIXEL_BUDGET` depuis `getInfo()` et afficher dans `#monde-m06-budget-badge` ( `role="status"`, `aria-live="polite"` ) soit `Budget NN % · N px libres`, soit `Budget dépassé de NN %`. L'état est porté par le texte **et** par `data-state="warn"`, jamais par la couleur seule.
- **Impact.** Le budget devient falsifiable : la marge restante est chiffrée, l'alerte de dépassement est explicite et annoncée aux lecteurs d'écran.
- **Risque.** annonce vocale à chaque redimensionnement → `aria-live="polite"` et rafraîchissement coalescé en une frame (M06-04) limitent le bruit.
- **Effort.** S.
- **Vérification.** `getInfo().width * getInfo().height <= 2200000` en toutes circonstances ; le badge affiche `ok` et un pourcentage ≤ 100 % ; forcer une valeur simulée > budget fait basculer `data-state="warn"`.

## M06-03 — Changement de DPR à taille constante non suivi

- **Preuve.** `globe-engine.js:204` relit `window.devicePixelRatio` à chaque `resize()`, mais le `ResizeObserver` (`globe-engine.js:510-511`) ne réagit qu'à la taille du conteneur. Déplacer la fenêtre vers un écran Retina, ou changer le zoom navigateur, modifie le DPR **sans modifier `clientWidth/clientHeight`** : aucun recalcul n'est déclenché et le tampon reste sous-échantillonné ou sur-dimensionné.
- **Solution.** Écouteur `matchMedia('(resolution: Ndppx)')` ré-armé après chaque changement ( `armDprWatch()` / `onDprChange()` ). Au basculement : `engine.resize()`, `engine.invalidate()`, puis rafraîchissement du panneau. Repli silencieux si la média-feature `resolution` n'est pas supportée ; le `resize` classique reste actif.
- **Impact.** La densité suit réellement l'appareil, y compris en mobilité entre écrans, sans dépendre d'un changement de geometry.
- **Risque.** boucle de réarmement → la sonde est retirée puis récriée avec le **nouveau** dpr ; le nouvel écouteur ne correspond plus à l'ancienne requête, donc pas de réémission infinie. Guard `try/catch` sur les API `addListener`/`removeListener` historiques.
- **Effort.** M.
- **Vérification.** Simuler un passage de DPR 1 → 2 à taille de fenêtre fixe : `getInfo().pixelRatio` et `getInfo().width` sont recalculés et le panneau se met à jour sans rechargement.

## M06-04 — Redimensionnements non coordonnés (observateurs concurrents)

- **Preuve.** Trois chemins peuvent appeler `resize()` pour le même événement : le `ResizeObserver` du moteur (`globe-engine.js:510`), `open()` (`globe-engine.js:663`) et l'initialisation (`globe-engine.js:647`). `resize()` enchaîne `setPixelRatio` + `setSize` + `updateProjectionMatrix` + `invalidate()` (`globe-engine.js:206-210`) : sans coalescence, un seul redimensionnement provoque plusieurs écritures du tampon et plusieurs frames demandées.
- **Solution.** Un unique scheduler `scheduleRefresh()` qui coalesce les signaux `window.resize` et un `ResizeObserver` local sur `ctx.host` en **une seule** `requestAnimationFrame` par frame. La lentille ne duplique jamais `setSize` : elle ne lit que `getInfo()`. `installListeners()` est protégé par un drapeau module — un seul jeu d'écouteurs malgré les 50 rendus successifs de la scène.
- **Impact.** Coût CPU maîtrisé : au plus une lecture de télémétrie par frame, zéro écriture redondante du tampon.
- **Risque.** décalage d'une frame entre le `resize` du moteur et la lecture du panneau → sans conséquence fonctionnelle (valeur corrigée à la frame suivante, sans boucle).
- **Effort.** M.
- **Vérification.** Un redimensionnement manuel unique incrémente le compteur `redim.` d'exactement 1 dans `#monde-m06-budget-detail`, et une seule frame est demandée au moteur.

## M06-05 — Plancher DPR 0,7 : perte de netteté silencieuse sur grand canevas

- **Preuve.** `globe-engine.js:204` borne le DPR à `[0.7, 1.5]`. Sur un canevas CSS de 2560×1440 (3,69 Mpx), `budgetDpr = sqrt(2,2/3,69) ≈ 0,77` ; au-delà, le plancher 0,7 est atteint et le budget n'est plus la contrainte : l'image devient floue sans qu'aucun message ne l'explique.
- **Solution.** Détecter `pixelRatio <= 0.7 + ε` **et** `cssW × cssH × 0,7² > PIXEL_BUDGET`, puis ajouter la mention explicite `qualité réduite (plancher DPR 0,7)` dans `#monde-m06-budget-detail`. Le calcul est dérivé du rectangle CSS du host et de `getInfo()`, sans estimation arbitraire.
- **Impact.** La dégradation de netteté est nommée et chiffrée au lieu d'être attribuée à un défaut de texture.
- **Risque.** faible : la condition combine le DPR **et** la surface CSS, donc aucun faux positif sur un petit canevas à DPR 0,7 (ex. économie de données explicite).
- **Effort.** S.
- **Vérification.** Agrandir la fenêtre au-delà du seuil : la mention apparaît ; la réduire : elle disparaît.

## M06-06 — Picking indexé en pixels CSS : contrôle de cohérence tampon/écran

- **Preuve.** `globe-engine.js:246-256` : `pickAtClient()` convertit le pointeur avec `getBoundingClientRect()` (pixels CSS) puis raycast en coordonnées normalisées. Le picking est donc indépendant du DPR — mais rien ne protège contre une régression qui utiliserait `domElement.width` (pixels du tampon) à la place de `rect.width`.
- **Solution.** À chaque mesure, comparer `getInfo().width / cssWidth` à `getInfo().pixelRatio` (tolérance 0,05). Afficher `picking DPR-indépendant : cohérent` ou `incohérence tampon/écran : à vérifier` dans le détail du panneau. Le CSS garantit par ailleurs `.globe-host canvas { width:100% !important; height:100% !important }` (`styles.css:129`).
- **Impact.** L'invariant de picking est documenté dans le DOM et surveillé à chaque redimensionnement, sans modifier la logique de raycast.
- **Risque.** si `cssWidth` vaut 0 (scène masquée), le contrôle est neutre (`cohérent`) plutôt que faux ; le panneau se corrige au prochain rafraîchissement visible.
- **Effort.** S.
- **Vérification.** Après changement de DPR (M06-03), le libellé reste « cohérent » et le survol d'un pays renvoie toujours son code via `debugPick()`.

## M06-07 — Budget de draw calls et de triangles non exposé

- **Preuve.** `globe-engine.js:189` crée une seule `SphereGeometry(1, 64, 40)` et un seul `Mesh` (`:190`) : l'architecture promet **un** draw call (`globe-engine.js:5`). `getInfo()` expose `calls` et `triangles` mais aucun témoin ne vérifie cette promesse.
- **Solution.** Afficher `${calls} appel(s) · ${fmt(triangles)} triangles` dans le détail ; un appel supérieur à 1 est signalé comme régression de budget GPU par le même mécanisme de texte que M06-02 (le panneau surligne la valeur, la couleur n'étant qu'un renfort).
- **Impact.** La complexité de rendu par frame devient mesurable sans instrumentation externe.
- **Risque.** le nombre de triangles dépend de la résolution de la sphère ; la valeur est lue, jamais écrite en dur, donc aucune donnée géométrique n'est inventée.
- **Effort.** S.
- **Vérification.** `getInfo().calls === 1` static après rotation, zoom et survol ; le panneau affiche le même chiffre.

## M06-08 — Budget mémoire GPU sans détection de fuite

- **Preuve.** `globe-engine.js:611-645` charge deux textures et construit la géométrie une seule fois dans `init()` ; `dispose()` (`:552-560`) est volontairement léger et conserve renderer/textures/géométrie. `getInfo()` expose `memory.geometries` et `memory.textures` (`:697-698`) : une réinitialisation répétée qui doublerait ces compteurs passerait inaperçue.
- **Solution.** Afficher `${geometries} géométrie(s) · ${textures} texture(s)` et conserver un compteur de redimensionnements dans le panneau. La stabilité des deux nombres à travers les `resize()` prouve qu'aucune ressource GPU n'est recréée pendant le redimensionnement.
- **Impact.** Le budget mémoire est observable et une dérive après réouverture devient détectable par simple lecture du texte.
- **Risque.** les compteurs sont ceux de Three.js (objets alloués, pas octets) : le libellé dit « géométrie(s)/texture(s) » et non « Mo », pour ne pas prétendre à une mesure de mémoire exacte.
- **Effort.** S.
- **Vérification.** Après N redimensionnements, `geometries` et `textures` sont identiques à leurs valeurs initiales ; le compteur `redim.` reflète N.

## M06-09 — Moteur indisponible : budget lisible sans WebGL

- **Preuve.** `globe.js:478-480` : si `THREE` est absent, le moteur n'est jamais initialisé et `getInfo()` (`globe-engine.js:692`) renvoie `null`. Le panneau de budget ne doit ni lever d'exception (aucun `console.*` autorisé), ni afficher un chiffre faux, ni dépendre du canvas.
- **Solution.** `paint()` gère explicitement `measure() === null` : `Moteur 3D indisponible · budget non mesurable` quand le singleton est absent, `Initialisation du moteur…` quand il existe mais n'est pas encore `ready`. Le badge passe à `data-state="idle"` et le plafond de référence reste affiché. Toutes les lectures sont protégées par des gardes (`typeof engine.getInfo === 'function'`, `try/catch`).
- **Impact.** L'état du budget reste auditable même dans le scénario de repli sans accélération 3D, en texte indexable indépendant du rendu.
- **Risque.** libellé transitoire « initialisation » remplacé au `onReady` → annonce `polite` unique, non intrusive.
- **Effort.** S.
- **Vérification.** Simuler l'absence de `window.THREE` : le panneau affiche « Moteur 3D indisponible », sans erreur console, et la liste des dix pays reste utilisable.

## M06-10 — Rafraîchissement à la demande : zéro boucle continue, pause hors écran

- **Preuve.** `globe-engine.js:446-469` arrête la boucle rAF après 10 frames inutiles et sur `document.hidden` (`:488-496`). Un observateur de budget implémenté en polling annulerait ce bénéfice en maintenant une boucle active en arrière-plan.
- **Solution.** `refresh()` et `scheduleRefresh()` court-circuitent sur `document.hidden` ; un seul `requestAnimationFrame` est demandé par événement (jamais de boucle récursive). Sur `visibilitychange` au retour au premier plan, un unique rafraîchissement est planifié. Le drapeau `ctx.reducedMotion` est pris en compte pour ne jamais forcer de rendu moteur supplémentaire dans ce mode ; la mesure DOM, elle, reste exacte après redimensionnement.
- **Impact.** Le coût CPU de la lentille est nul au repos et nul hors écran ; le budget GPU du moteur n'est pas dégradé par l'audit lui-même.
- **Risque.** données figées pendant l'absence de l'onglet → corrigées automatiquement au retour, avant toute interaction possible.
- **Effort.** S.
- **Vérification.** Hors écran (`document.hidden`), aucun `requestAnimationFrame` de M06 n'est planifié ; au retour, une seule frame met le panneau à jour ; `node --check src/views/monde/M06.js` passe.

---

## Synthèse M06

| Thème | Chantiers | Points clés |
| --- | --- | --- |
| Densité de pixels | 01, 03, 05, 06 | DPR effectif, sonde `resolution`, plancher 0,7, invariance picking |
| Redimensionnement | 03, 04, 06, 10 | `matchMedia`, scheduler rAF unique, cohérence tampon/écran, pause |
| Budget GPU/CPU | 02, 07, 08, 09, 10 | 2,2 Mpx, draw call, mémoire, repli sans WebGL, zéro polling |

**Blocage assumé :** la valeur du budget et le plafond DPR ne peuvent pas être relevés dans `globe-engine.js` (fichier interdit). La lentille se limite à les rendre observables et à détecter les dérives ; toute modification de ces constantes doit être répercutée dans le miroir documenté de `M06.js`.
