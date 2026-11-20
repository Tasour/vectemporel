# M08 — IntersectionObserver et cycle de vie de la vue (domaine A : rendu WebGL)

Lentille : M08. Fichier possédé : `src/views/monde/M08.js`.
Lectures seules : `src/views/globe.js` (`inView` :16, `engineRunning` :17, `syncEngine()` :153-169, `drawStaticFrame()` :171-183, `IntersectionObserver` :283-290, `subscribe` :295-308, branche d'init :444-485), `public/globe-engine.js` (`IDLE_FRAMES_BEFORE_STOP` :24-25, `invalidate()` :96-105, `frame()` :446-469, `start()` :471-480, `stop()` :482-486, `onVisibilityChange()` :488-496, `open()`/`close()` :660-675, API publique :677-704), `src/views/monde/registry.js`, `UNIFIED_AUDIT/views/atlas-globe.md`, `UNIFIED_AUDIT/MONDE/views/M07-raf-pause.md`.

Aucun fichier partagé modifié, aucun réseau, aucun `Math.random`, aucun `console.*`. Aucun appel à `engine.open()`/`engine.close()` : ces appels appartiennent à `syncEngine()` (globe.js:153-169). Aucun timer, aucune boucle rAF récurrente.

> **Délimitation avec M07.** M07 possède `document.hidden` et la mesure de la boucle rAF (`data-m07-raf-phase`) ; M08 possède la présence dans le viewport et ses états stabilisés. Les deux lentilles n'appellent jamais `open()`/`close()`. L'`IntersectionObserver` canonique de `globe.js:283-290` reste l'unique pilote du rendu ; l'observateur de M08 est un observateur de mesure, sans pouvoir de décision sur le moteur.

---

## M08-01 — État de présence dans le viewport non observable dans le DOM

- **Problème / preuve.** `globe.js:16` tient `inView` dans une variable de module privée ; l'unique sortie est `host.dataset.globeActive` (globe.js:156-158), qui **mélange** trois causes : `inView && !paused && state.view === 'globe'`. Un audit ne peut donc pas distinguer « globe hors écran » de « rotation en pause » ou de « vue quittée ». Le canvas porte `aria-hidden` (globe-engine.js:601) et aucun texte ne porte la présence.
- **Solution.** Un témoin `#m08-lifecycle` (`role="status"`, `aria-live="polite"`) et trois attributs dérivés, indépendants : `data-m08-visibility` (`visible`/`hidden`), `data-m08-document` (`visible`/`hidden`), `data-m08-engine` (`ready`/`absent`). Le texte dit « globe à l'écran / hors écran », « onglet actif / masqué » et l'état du moteur.
- **Impact.** Visibilité auditable par un test E2E ou un lecteur d'écran, sans instrumenter `globe.js` ni le moteur.
- **Risque.** Doublon perçu avec `data-globe-active` → attributs distincts et commentés comme « mesure », jamais lus par `syncEngine()`.
- **Effort.** S
- **Vérification.** `#m08-lifecycle` existe une seule fois et contient « à l'écran » en vue Monde ; `#globe-canvas.dataset.m08Visibility === 'visible'`.

## M08-02 — Seuil binaire et dernière entrée du lot : décision fragile au bord du viewport

- **Problème / preuve.** `globe.js:284-288` n'écoute que `threshold: [0, 0.01]` et ne lit que `entries[entries.length - 1]`. Une entrée périmée en fin de lot peut écraser une entrée fraîche, et un seuil unique à 0 rend l'état instable quand le globe frôle le bord (défilement de quelques pixels).
- **Solution.** Observateur de mesure avec `threshold: [0, 0.01, 0.05, 0.25, 0.5]` ; la ratio retenue est le **maximum** des entrées du lot, puis décision à hystérésis : `visible` dès ≥ 0,05, `hidden` seulement à ≤ 0,01, zone morte [0,01 ; 0,05[ conservant l'état précédent.
- **Impact.** État stabilisé, sans basculement parasite sur un frôlement du bord ; lecture robuste des lots d'entrées.
- **Risque.** Hystérésis locale qui pourrait différer de `inView` pendant la zone morte → elle ne pilote rien ; seule la mesure est affectée, `data-globe-active` reste la référence.
- **Effort.** M
- **Vérification.** Faire varier la hauteur du viewport autour de 3 % de visibilité : `data-m08-visibility` ne change pas ; sous 1 % il passe à `hidden`, au-dessus de 5 % à `visible`.

## M08-03 — `document.hidden` non reflété dans les états de la vue

- **Problème / preuve.** Le moteur gère l'onglet masqué en propre (`globe-engine.js:488-496`) et M07 mesure la phase rAF, mais aucun attribut de la lentille ne distingue « globe hors écran » (défilement) de « onglet masqué » : deux causes de suspension aujourd'hui confondues dans le texte affiché.
- **Solution.** Un écouteur `visibilitychange` idempotent met à jour `data-m08-document` et le témoin. M08 ne réveille pas la boucle au retour d'onglet : ce nudge est déjà celui de M07-03/M07-08, et le dupliquerait.
- **Impact.** Diagnostic précis de la cause de l'arrêt, complémentaire de `data-m07-raf-phase` sans recouvrement.
- **Risque.** Deux handlers `visibilitychange` (M07 et M08) → roles disjoints (mesure M08 / nudge M07), chacun enregistré sous garde.
- **Effort.** S
- **Vérification.** Masquer l'onglet : `data-m08-document === 'hidden'` et le témoin dit « onglet masqué » ; au retour, `visible`, sans appel supplémentaire à `invalidate()` de la part de M08.

## M08-04 — Détache / rattache du host au re-render : faux « hors écran »

- **Problème / preuve.** La coque vide `#app` à chaque émission du store ; `ensure()` (globe.js:263-292) réattache le **même** host. L'observateur canonique voit alors `isIntersecting: false` puis `true`, ce qui peut provoquer un `close()`/`open()` parasite (et, avec le dessin statique de `drawStaticFrame()`, une frame supplémentaire).
- **Solution.** Antirebond d'une frame sur l'observateur de mesure : un changement d'état n'est confirmé qu'au `requestAnimationFrame` suivant, et un retour au même état annule la confirmation en cours. Une seule frame planifiée par transition, jamais de boucle, jamais de timer.
- **Impact.** Un re-render dans la même frame n'est pas compté comme une sortie d'écran ; le témoin reste lisible.
- **Risque.** Confirmation différée d'une frame → acceptable pour un témoin, sans effet sur `syncEngine()` qui reste immédiat.
- **Effort.** S
- **Vérification.** Déclencher trois rendus successifs (touche `?` deux fois) : `data-m08-visibility` reste `visible` et le compteur de transitions du témoin n'augmente pas.

## M08-05 — Boucle auto-arrêtée au repos puis ré-entrée : `engineRunning` périmé

- **Problème / preuve.** Le moteur s'arrête seul après `IDLE_FRAMES_BEFORE_STOP = 10` frames inutiles (`globe-engine.js:24-25, 465-468`) par `stopLoop()` (441-444), **sans informer la vue**. Or `engineRunning` (globe.js:17) ne reflète que les appels `open()`/`close()` : il reste `true`. Au retour dans le viewport, `syncEngine()` (globe.js:161) voit `want === engineRunning` et ne rappelle pas `open()` : la boucle reste arrêtée, le globe est figé jusqu'à une interaction.
- **Solution.** Sur ré-entrée **stabilisée** de l'observateur de mesure, si `host.dataset.globeActive === '1'`, appeler `engine.invalidate()` (globe-engine.js:96-105, 685). `invalidate()` pose `dirty`, réarme l'horloge et ne redémarre que si `visible && !document.hidden` : aucun `open()` parasite, aucune frame en arrière-plan.
- **Impact.** Reprise réelle du rendu après une sortie d'écran, y compris quand le moteur s'était rendormi — le défaut le plus grave de ce cycle de vie.
- **Risque.** `invalidate()` supplémentaire quand la boucle tournait déjà → au plus une frame `dirty`, sans double `setAnimationLoop` (gardé par `state.running`). Aucun `open()`/`close()` introduit.
- **Effort.** M
- **Vérification.** Laisser le globe au repos 10 frames, défiler hors écran puis revenir : `getInfo().calls` repasse à `null` → croissant ; le témoin expose un compteur `m08-wakeups` incrémenté d'exactement 1 par ré-entrée.

## M08-06 — Moteur absent ou non initialisé non signalé

- **Problème / preuve.** `globe.js:478-480` affiche un statut d'erreur si `THREE` ou le moteur manque, mais la lentille n'a aucun moyen déclaratif de savoir si `VECTEMPOREL_GLOBE` est prêt ; `getInfo()` retourne `null` avant initialisation (globe-engine.js:692). Un appel direct à `invalidate()` sur un moteur absent ferait alors exception.
- **Solution.** Récupération via `ctx.onReady(payload => payload.engine)`, complétée par une lecture défensive de `window.VECTEMPOREL_GLOBE.ready`. Tout appel est précédé d'une garde `api && api.ready`. `data-m08-engine` et `data-m08-pixelratio` (via `getInfo()` nullable) exposent l'état ; aucun `console.*`.
- **Impact.** Aucune exception en repli sans WebGL, état du moteur auditable, cohérent avec le chantier M19.
- **Risque.** `readyCallbacks` s'accumule dans le registre (registry.js:50) → un seul `onReady` enregistré par lentille, sous garde module ; `payload` incomplet ignoré.
- **Effort.** S
- **Vérification.** Sans `window.THREE`, `data-m08-engine === 'absent'`, aucune erreur console, et le témoin dit « Moteur 3D indisponible ».

## M08-07 — Sortie de vue : l'arrêt décidé par `syncEngine` non répercuté immédiatement dans le témoin

- **Problème / preuve.** À la sortie de la vue Monde, `subscribe()` (globe.js:295-308) appelle `syncEngine()` qui pose `data-globe-active = 0` et ferme le moteur, mais l'observateur d'intersection ne rapporte la sortie qu'asynchronement, après le détachement du host. Le texte de la lentille peut rester « à l'écran » pendant cette fenêtre.
- **Solution.** `MutationObserver` sur l'attribut `data-globe-active` du host : à chaque transition, rafraîchir immédiatement le témoin et l'attribut de mesure. Le greffon **lit** la décision de `syncEngine()`, il ne la redécide pas : aucun `open()`/`close()`.
- **Impact.** Témoin synchrone avec la vue réelle, y compris pendant la fenêtre asynchrone de l'IO.
- **Risque.** MutationObserver déconnecté puis réinstallé à chaque rendu sous garde `WeakMap`, sans boucle (les attributs écrits par M08 ne sont pas dans `attributeFilter`).
- **Effort.** S
- **Vérification.** Passer en vue Chronologie : `data-m08-visibility` passe à `hidden` dès la mutation de `data-globe-active`, avant même le callback d'intersection.

## M08-08 — Mouvement réduit : la reprise ne doit pas relancer la rotation

- **Problème / preuve.** `drawStaticFrame()` (globe.js:171-183) dessine une frame puis repose `globeActive` à `0` ; `open()` force `autoRotate` à `autoRotateEnabled && !reducedMotion` (globe-engine.js:664). Un `invalidate()` inconditionnel au retour réveillerait la boucle pour 10 frames inutiles, contraire à `prefers-reduced-motion`.
- **Solution.** Lire `ctx.reducedMotion()` à l'installation ; le réveil du chantier M08-05 est conditionné à `!reduced`. En mouvement réduit, seule la mesure est mise à jour et le texte précise « reprise statique ».
- **Impact.** Zéro frame de rotation réintroduite par la lentille, cohérent avec M10.
- **Risque.** Préférence changée à chaud → M08 la relit à chaque `render()` du globe ; entre deux rendus, le moteur gère déjà `onMotionChange()` (globe-engine.js:317-327).
- **Effort.** S
- **Vérification.** Émuler `prefers-reduced-motion: reduce`, sortir puis revenir dans le viewport : `m08-wakeups` n'augmente pas et `getInfo().calls` reste stable.

## M08-09 — Annonces de suspension absentes ou bavardes

- **Problème / preuve.** `#globe-live` (globe.js:73-85) est partagé avec la navigation clavier, le zoom et la pause ; y écrire à chaque callback d'intersection écraserait les annonces de pays et saturerait le lecteur d'écran. Le témoin seul, sans `aria-live`, resterait muet.
- **Solution.** Annonces portées par le témoin dédié (`aria-live="polite"`, `aria-atomic="true"`), mises à jour uniquement sur état **stabilisé** ; `ctx.say()` n'est appelé qu'une fois par suspension durable, avec un intervalle plancher de 1,5 s et un texte dédié à la visibilité. Aucune annonce sur chaque frame ni sur la zone d'hystérésis.
- **Impact.** Suspension et reprise audibles sans polluer le fil de navigation (M20).
- **Risque.** Collision résiduelle avec `say()` d'une autre lentille → garde de throttling et texte court, spécifique au rendu.
- **Effort.** S
- **Vérification.** Défilement rapide hors puis dans le viewport : au plus une annonce par transition stabilisée ; le texte du témoin contient « rendu suspendu » en sortie.

## M08-10 — Observateurs et écouteurs dupliqués à chaque rendu du globe

- **Problème / preuve.** `runMondeEnhancements()` est rejoué à chaque `renderGlobe()` (globe.js:442) et `readyCallbacks` s'accumule (registry.js:50). Un greffon qui recrée son `IntersectionObserver`, son `visibilitychange` et son `MutationObserver` à chaque rendu multiplierait les callbacks et les nœuds.
- **Solution.** Garde par `WeakMap` clé sur le host persistant : un seul `onReady`, un seul observateur d'intersection, un seul écouteur de document, un seul `MutationObserver`, déconnectés/retirés avant réinstallation ; nœud `#m08-lifecycle` réutilisé s'il est connecté, sinon recréé dans la nouvelle scène. IDs préfixés `m08-`, CSS via `ctx.css('monde-m08', …)`.
- **Impact.** Idempotence complète sur 3 rendus successifs, zéro fuite d'écouteurs, aucun sélecteur de test modifié.
- **Risque.** `WeakMap` clé sur le host : si `globe.js` remplaçait le host, un nouvel état serait créé proprement — pas de référence vers l'ancien.
- **Effort.** M
- **Vérification.** Trois rendus du globe → un seul `#m08-lifecycle`, un seul `IntersectionObserver` actif, `m08-wakeups` cohérent avec le nombre réel de ré-entrées.

---

## Statut d'implémentation

Les 10 chantiers sont implémentés dans `src/views/monde/M08.js`. Aucun fichier interdit modifié ; CSS injecté via `ctx.css('monde-m08', …)`, IDs uniques préfixés `m08-` avec garde d'existence. Zéro `open()`/`close()`, zéro timer, zéro boucle rAF récurrente (au plus une frame d'antirebond par transition), zéro `console.*`, zéro `Math.random`, zéro réseau.

## Blocages

- Aucun bloquant fonctionnel. M08 ne peut pas modifier `syncEngine()` (globe.js:153-169) ni `frame()` (globe-engine.js:446-469), fichiers non possédés : la correction du réveil passe donc par l'API publique `invalidate()` (M08-05), exactement comme M07, sans changer le propriétaire du moteur.
- M08-01 à M08-04, M08-06, M08-07 et M08-09 restent des mesures : l'hystérésis et le témoin n'influencent pas la décision de rendu, qui demeure l'apanage de `syncEngine()`. C'est un choix de non-collision assumé avec les lentilles M07 et M19.

## Vérification

`node --check src/views/monde/M08.js` : PASS. Les suites E2E sont rejouées par l'agent maître.
