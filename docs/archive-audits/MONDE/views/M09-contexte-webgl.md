# M09 — Contexte WebGL perdu / restauré

> Vague Monde — domaine A : rendu WebGL.
> Fichier possédé : `src/views/monde/M09.js`. Lectures seules : `public/globe-engine.js`,
> `src/views/globe.js`, `src/views/monde/registry.js`, `src/views/monde/index.js`,
> `UNIFIED_AUDIT/views/v1-monde-3d.md` (chantier V1-MONDE-08), `UNIFIED_AUDIT/views/atlas-globe.md`.
> Aucun autre fichier modifié, aucun réseau, aucun aléa, aucun `console.*`, aucun Git.

## Synthèse

| # | Chantier | Effort |
| --- | --- | --- |
| M09-01 | Accès au moteur sans posséder `globe-engine.js` | S |
| M09-02 | Écouteurs `webglcontextlost` / `webglcontextrestored` absents | M |
| M09-03 | `preventDefault()` explicite requis pour la restauration | S |
| M09-04 | Aucun signal visuel ni textuel à la perte | S |
| M09-05 | Boucle de rendu non neutralisée sur contexte mort | M |
| M09-06 | État applicatif non réappliqué après restauration | S |
| M09-07 | Risque de rafale perte / restauration | S |
| M09-08 | Aucun diagnostic auditable de la perte | S |
| M09-09 | Mouvement réduit non respecté par le repli | S |
| M09-10 | Fuite d'écouteurs si le canvas est recréé | M |

---

## M09-01 — Accès au moteur sans posséder `globe-engine.js`

- **Preuve** : `globe-engine.js:591–604` crée le `WebGLRenderer` et pose le canvas sans exposer d'abonnement « contexte » ; `ctx` ne contient pas `engine`, mais `registry.js:50` et `globe.js:467` livrent `onReady({ engine, host, selected })` via `flushMondeReady`.
- **Solution** : récupération unique de l'engine via `onReady`, avec repli sur `window.VECTEMPOREL_GLOBE` si le callback n'a pas pu être reçu.
- **Impact** : aucun fichier partagé modifié ; la lentille reste cantonnée à l'API publique.
- **Risque** : `onReady` ne se déclenche qu'une fois au chargement → l'engine est mémorisé dans l'état module.
- **Effort** : S.
- **Vérification** : présence du badge `#m09-contexte-badge` et de `data-m09-contexte` sur le host après rendu.

## M09-02 — Écouteurs `webglcontextlost` / `webglcontextrestored` absents

- **Preuve** : aucun écouteur de contexte dans `globe-engine.js` ; le canvas `.globe-webgl` (`globe-engine.js:602`) est le seul point d'accès au contexte WebGL.
- **Solution** : deux écouteurs en phase capture, avec marqueur d'idempotence `data-m09-bound` ; `syncCanvas()` détache et réattache les écouteurs si le canvas change.
- **Impact** : détection fiable de la perte et de la reprise sans toucher au moteur.
- **Risque** : ré-attachement pendant une perte active → l'état `lost` est réappliqué au nouveau canvas.
- **Effort** : M.
- **Vérification** : un seul jeu d'écouteurs actif après plusieurs rendus de la coque.

## M09-03 — `preventDefault()` explicite requis pour la restauration

- **Preuve** : la spécification WebGL exige `event.preventDefault()` sur `webglcontextlost` pour autoriser `restoreContext()` ; three.js le fait en interne, mais un bundle différent pourrait s'en passer.
- **Solution** : appel explicite à `event.preventDefault()` dans le gestionnaire de perte, **sans jamais** appeler `stopPropagation` pour laisser three.js recréer son contexte interne.
- **Impact** : restauration fiable, sans conflit avec `initGLContext()` de three.js.
- **Risque** : un `stopPropagation` empêcherait three.js de voir l'événement et casserait la reprise ; il est explicitement proscrit.
- **Effort** : S.
- **Vérification** : forcer perte puis restauration via `WEBGL_lose_context` ; l'état repasse à `ok`.

## M09-04 — Aucun signal visuel ni textuel à la perte

- **Preuve** : au `webglcontextlost`, `render()` devient un no-op côté three.js ; `#globe-status` reste « chargé » et l'image se fige sans message, alors que la liste des pays reste utilisable (ATLAS-GLOBE-08, V1-MONDE-08).
- **Solution** : badge autonome `#m09-contexte-badge` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) avec cinq états — `pending`, `ok`, `lost`, `restoring`, `unavailable` — dont un texte de repli explicite renvoyant vers la liste et le clavier. Le nœud vit dans le host réutilisé par `ensure()` (`globe.js:263–292`), jamais dans le HUD recréé à chaque rendu.
- **Impact** : dégradation comprise de l'utilisateur ; continuité fonctionnelle de la liste et du pilotage clavier.
- **Risque** : doublon perçu avec `#globe-status` de `globe.js` → le badge est complémentaire et non substitutif.
- **Effort** : S.
- **Vérification** : après perte, le badge contient « Rendu 3D interrompu — utilisez la liste des pays ou les flèches au clavier. ».

## M09-05 — Boucle de rendu non neutralisée sur contexte mort

- **Preuve** : `invalidate()` (`globe-engine.js:96–105`) relance `setAnimationLoop` et `frame()` (`:446–469`) continue de rendre des frames no-ops sur un contexte perdu.
- **Solution** : `engine.close()` à la perte (API publique réversible qui conserve renderer, textures et géométrie), puis `engine.open()` ou `engine.invalidate()` à la reprise, conditionné par `document.documentElement.dataset.globeActive === '1'` positionné par `syncEngine()`.
- **Impact** : zéro frame GPU parasite pendant la perte ; reprise cohérente avec la gestion `open()`/`close()` de `globe.js`.
- **Risque** : `close()` appelle `dispose()` qui détache les interactions ; `open()` les réattache, et les écouteurs M09 posés directement sur le canvas survivent.
- **Effort** : M.
- **Vérification** : perte puis restauration avec la vue active → `data-globe-active` reste `1` et la sphère est repeinte ; si l'utilisateur quitte la vue pendant la perte, la restauration ne relance pas le rendu.

## M09-06 — État applicatif non réappliqué après restauration

- **Preuve** : `initGLContext()` de three.js recrée les ressources GPU ; les uniforms `uSelected`/`uHover` existent côté JS (`globe-engine.js:137–143`) mais aucun re-peint n'est automatiquement demandé après restauration.
- **Solution** : sur `webglcontextrestored`, réappliquer `engine.setSelected(code)` et `engine.invalidate()`, le code étant dérivé de `state.countryId` et de `ctx.countries`.
- **Impact** : image et surbrillance du pays courant restaurées immédiatement.
- **Risque** : `setSelected(undefined)` poserait un vecteur `(-1, -1, -1)` → garde sur la présence d'un `code`.
- **Effort** : S.
- **Vérification** : forcer perte/restauration avec un pays sélectionné ; le badge repasse à `ok` et le pays reste marqué.

## M09-07 — Risque de rafale perte / restauration

- **Preuve** : sur un GPU instable, `loseContext()` / `restoreContext()` peuvent s'enchaîner ; sans temporisation, la région live est spamée et `invalidate()` est appelé en rafale.
- **Solution** : état intermédiaire `restoring` dès la restauration, puis stabilisation de 180 ms avant de repasser à `ok` ; `clearTimeout()` sur nouvelle perte pour annuler une reprise en cours ; une seule annonce par transition d'état.
- **Impact** : annonces stables et aucune rafale de rendu.
- **Risque** : délai trop long → sensation de latence ; 180 ms reste imperceptible.
- **Effort** : S.
- **Vérification** : trois pertes consécutives produisent exactement trois annonces « interrompu » et une seule annonce « rétabli » à la fin.

## M09-08 — Aucun diagnostic auditable de la perte

- **Preuve** : `getInfo()` (`globe-engine.js:691–703`) n'expose ni état de contexte ni compteur de pertes ; `mondeDiagnostics()` (`registry.js:70–72`) ne journalise que les erreurs de greffons.
- **Solution** : exposer `host.dataset.m09Contexte`, `host.dataset.m09LossCount` et `host.dataset.m09LastEvent` (horodatage `Date.now()`, sans aléa), uniquement sur le host possédé.
- **Impact** : état auditable sans modifier le moteur ni écrire dans un fichier partagé.
- **Risque** : aucun ; les attributs sont locaux au host et sérialisés en chaîne.
- **Effort** : S.
- **Vérification** : `host.dataset.m09LossCount` passe de `0` à `1` après une perte simulée.

## M09-09 — Mouvement réduit non respecté par le repli

- **Preuve** : `ctx.reducedMotion()` (`globe.js:436–440`) fournit la préférence, mais rien côté perte de contexte ne neutralise transitions ou animations ; V1-MONDE-09 et ATLAS-GLOBE-06 imposent le contraire.
- **Solution** : bloc CSS injecté `#monde-m09` avec `transition: none !important; animation: none !important;` sous `@media (prefers-reduced-motion: reduce)`, ciblé uniquement sur le badge ; lecture de `ctx.reducedMotion()` à l'attachement pour un libellé sobre.
- **Impact** : cohérence avec le contrat mouvement réduit ; aucun clignotement du badge.
- **Risque** : une règle trop large toucherait le reste de la vue → sélecteur strictement limité à `.m09-contexte-badge`.
- **Effort** : S.
- **Vérification** : en émulant `reduce`, forcer une perte ; `getComputedStyle(badge).transitionDuration === '0s'`.

## M09-10 — Fuite d'écouteurs si le canvas est recréé

- **Preuve** : `globe.js:317` recrée le `div.globe-scene` à chaque rendu tandis que `ensure()` (`:263–292`) réutilise le host ; si le moteur recrée son canvas, les écouteurs M09 deviennent orphelins.
- **Solution** : `syncCanvas()` appelé à chaque `apply` : comparaison du canvas courant et de la référence mémorisée, détachage de l'ancien (`removeEventListener`), attachement du nouveau, avec réapplication immédiate de l'état `lost` si une perte est en cours. Aucune boucle rAF propre, aucun timer persistant hors restauration.
- **Impact** : aucune fuite d'écouteurs ; détection fonctionnelle après recréation du canvas.
- **Risque** : ré-attachement pendant une perte → l'état doit être réappliqué au plus tôt (traité par `syncCanvas()`).
- **Effort** : M.
- **Vérification** : simuler le remplacement du canvas ; un seul jeu d'écouteurs actif et le badge reflète l'état courant.

---

## Blocages

1. **`public/globe-engine.js` non possédé** : ni événement contexte exposé, ni `getInfo().contextLost`, ni compteur de pertes. La détection passe donc exclusivement par le canvas `.globe-webgl` et l'API publique reçue via `onReady({ engine, host, selected })`.
2. **`flushMondeReady` unique** : `onReady` ne se déclenche qu'une fois au chargement (`globe.js:467`) ; la lentille mémorise l'engine dans son état module et se resynchronise via `window.VECTEMPOREL_GLOBE` et `syncCanvas()` à chaque rendu.
3. **`ctx` sans `engine`** : le contrat de `registry.js` ne fournit pas l'engine directement ; le payload `onReady` est le seul chemin nominal, d'où le repli global documenté ci-dessus.
4. **Rapport initialement annoncé à cette même adresse** : le fichier n'existait pas ; il est créé ici sans toucher au module `src/views/monde/M09.js`, conformément à la consigne.

## Vérifications

- `node --check src/views/monde/M09.js` : **PASS**.
- Aucune autre commande ni test exécuté, conformément à la consigne de vérification unique.
