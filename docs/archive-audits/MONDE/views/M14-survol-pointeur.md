# M14 — Survol au pointeur (domaine B : drapeau & révélation)

Module : `src/views/monde/M14.js`. Sources auditées : `src/views/globe.js`,
`public/globe-engine.js`, `src/views/globe-reveal.js`, `src/views/monde/registry.js`.

## Chantiers

### M14-01 — Coalescence locale contre le throttle mort du moteur
- **Preuve** : `globe-engine.js::updateHoverFromPointer` (l. 274-280) teste `now - state.hoverCheckAt < 45` (l. 277) mais `hoverCheckAt` n'est jamais déclaré dans l'état (l. 27-73) → `NaN < 45 === false` → garde de 45 ms inactive, `pickAtClient` + raycast à chaque `pointermove` (jusqu'à 120 Hz). Correctif moteur hors de mon fichier (blocage A).
- **Solution** : le greffon stocke le payload en attente et n'écrit qu'une fois par frame via `requestAnimationFrame` (`schedule()`/`apply()`), avec `if (raf) return`.
- **Impact** : nombre d'écritures DOM du HUD borné à 1/frame quoi que fasse le pointeur.
- **Risque** : latence d'affichage ≤ 1 frame (~16 ms), acceptable pour un survol.
- **Effort** : S.
- **Vérification** : instrumenter `apply()` sur 1 s de moves rapides → appels ≤ frames écoulées.

### M14-02 — Séquence monotone anti-hazard (stale hover/leave)
- **Preuve** : `globe-reveal.js::hover()` protège ses appels asynchrones par `hoverToken` (l. 198, 205), mais `leave()` (l. 213-217) et la branche `.then()` de `reveal()` (l. 224-236) ne vérifient aucun jeton : une rafale `hover A → leave → hover B` peut appliquer un état périmé.
- **Solution** : chaque événement reçoit `seq: ++seq` ; `apply()` rejette `item.seq < appliedSeq` ; seul le dernier payload survive puisqu'une seule frame est planifiée.
- **Impact** : aucun libellé ni historique périmé après une rafale.
- **Risque** : l'événement intermédiaire est volontairement perdu (comportement voulu).
- **Effort** : M.
- **Vérification** : envoyer A→leave→B dans la même tick → seul B rendu.

### M14-03 — Dedup par code pays
- **Preuve** : `globe-engine.js::setHover` déduplique (l. 108), mais `globe.js::highlight` (l. 192) et le `focus` des boutons (l. 419) peuvent rappeler `reveal.hover` sans changement de code.
- **Solution** : `if (code === currentCode) return` avant toute écriture et tout `pushRail`.
- **Impact** : zéro `replaceChildren`/`offsetWidth` redondant pour un même pays.
- **Risque** : un pays ré-hover après révélation doit être réaffiché → `currentCode` remis à `null` sur suspension et sur `leave`.
- **Effort** : S.
- **Vérification** : 10 `onHover` consécutifs avec le même code → 1 seule mise à jour.

### M14-04 — Suspension pendant la révélation du masque
- **Preuve** : `globe-reveal.js::reveal()` appelle `done()` immédiatement (l. 220) puis anime `scale(1)→scale(7)` sur 720 ms (l. 228-235) ; `show()` appelle `resetFigure()` (l. 181) qui annule toute animation en cours — un survol parasite peut casser le zoom.
- **Solution** : `isRevealing()` est consultée dans `apply()` ; pendant la transition le HUD est masqué et `currentCode` réinitialisé. Le `leave` reste appliqué (il ne touche pas au masque).
- **Impact** : aucune couche supplémentaire au-dessus du masque de révélation (`#globe-reveal`, z-index 60 vs HUD 61).
- **Risque** : le module ne peut pas empêcher `globe.js` (l. 451-454) d'appeler `reveal.hover` — race côté révélation signalée comme blocage B.
- **Effort** : M.
- **Vérification** : déclencher `reveal()` puis un `onHover` → HUD invisible, animation intacte.

### M14-05 — Positionnement borné au viewport
- **Preuve** : un `clientX/clientY` proche du bord ferait déborder un libellé `position:fixed` et créer une barre de défilement ; `globe-engine.js` transmet des coordonnées clients brutes (l. 250-251).
- **Solution** : une seule écoute passive `pointermove` au `document` (pointerType `touch` ignorée) mémorise `pointerX/Y` sans écriture ; `positionChip()` borne `x` et `y` à `[8, innerWidth/innerHeight − taille − 8]` et utilise `translate3d` (compositeur, pas de layout). Repli clavier en haut à droite si aucun pointeur.
- **Impact** : aucun débordement, aucun reflow de la page, 390×844 compris.
- **Risque** : lecture de `offsetWidth` une fois par changement de pays (coalescé, ≤ 1/frame).
- **Effort** : S.
- **Vérification** : survoler les 4 coins en 1658×1150 et 390×844 → HUD entièrement visible.

### M14-06 — HUD `aria-hidden`, pas de doublon live
- **Preuve** : `globe.js` possède déjà `#globe-live` (`role="status"`, `aria-live="polite"`, l. 73-85) alimenté par `say()` dans `highlight()` (l. 199) ; le chemin souris de l'engine (l. 449-457) ne parle pas, un second live region bavarderait.
- **Solution** : `#monde-m14-chip` et `#monde-m14-rail` portent `aria-hidden="true"` et ne sont jamais des régions live. L'annonce reste déléguée au parcours clavier existant.
- **Impact** : zéro annonce redondante pour les lecteurs d'écran.
- **Risque** : le survol souris seul reste silencieux (identique au comportement actuel, l'information est dans `#globe-hover-readout`).
- **Effort** : S.
- **Vérification** : nvda/voiceover — un survol souris ne produit aucune annonce supplémentaire.

### M14-07 — Idempotence multi-rendus
- **Preuve** : `registry.js` ne vide jamais `readyCallbacks`/`hoverCallbacks`/`leaveCallbacks` (l. 16-19) et `runMondeEnhancements` est rappelé à chaque rendu (globe.js l. 442) → sans garde, N rendus = N abonnements M14.
- **Solution** : `registered` (callbacks une seule fois), `latest = ctx` à chaque appel, nœuds créés dans le `body` via `elOrGet()` avec garde `getElementById` et IDs uniques préfixés `monde-m14-`.
- **Impact** : 1 HUD et 1 abonnement M14 quel que soit le nombre de re-renders.
- **Risque** : `ctx` capturé une seule fois → toutes les lectures passent par `latest`, jamais par le ctx périmé.
- **Effort** : M.
- **Vérification** : rendre le globe 10× → `document.getElementById('monde-m14-chip')` unique, un seul callback dans le registre.

### M14-08 — Masque unique, aucun second canvas
- **Preuve** : `globe-reveal.js::maskFor` (l. 104-138) construit un masque PNG pleine texture et le cache dans `masks` (l. 30, 136) via `toDataURL` — coût mémoire élevé ; le dupliquer doublerait l'empreinte.
- **Solution** : le greffon n'injecte ni `<canvas>`, ni `mask-image`, ni image : il réutilise l'overlay `#globe-reveal` existant et n'ajoute qu'un libellé texte + un rail de codes.
- **Impact** : 0 octet de masque supplémentaire, 0 draw call.
- **Risque** : le HUD ne reproduit pas la découpe du drapeau — c'est volontaire, le masque reste géré par M11/M12.
- **Effort** : S.
- **Vérification** : `document.querySelectorAll('canvas').length` identique avec et sans M14.

### M14-09 — Mouvement réduit
- **Preuve** : `globe-reveal.js` neutralise ses transitions sous `prefers-reduced-motion` (l. 85) ; un fade/opacity sur le chip dérogerait à cette cohérence.
- **Solution** : règle `@media (prefers-reduced-motion:reduce){#monde-m14-chip{transition:none}}` dans `ctx.css('monde-m14', …)` ; positionnement par `translate3d` sans animation, aucune interpolation JS.
- **Impact** : aucun mouvement animé, y compris à chaud si la préférence change.
- **Risque** : aucun (le `transform` statique reste nécessaire au positionnement).
- **Effort** : S.
- **Vérification** : émuler `reduce` → `getComputedStyle(chip).transitionDuration === '0s'`.

### M14-10 — Nettoyage sur leave et sur onReady
- **Preuve** : `globe-engine.js::onPointerLeave` (l. 422-427) remet `hovering` à `false` et `setHover(null)` ; sans nettoyage symétrique, un `raf` en attente ou un libellé resterait affiché après la sortie du pointeur ou un re-render du moteur.
- **Solution** : `onLeave` planifie un `leave` (annule `pending`, masque le chip, remet `currentCode`) ; `onReady(reset)` réinitialise `appliedSeq`, `pending` et le HUD quand le moteur redevient prêt (`flushMondeReady`).
- **Impact** : aucun résidu visuel, file d'événements vide au repos.
- **Risque** : un `leave` pendant la révélation masque le HUD mais laisse le masque zoomer — comportement voulu (le masque est autonome).
- **Effort** : S.
- **Vérification** : hover puis `pointerleave` → `.is-on` retiré, `raf === 0` ; forcer `flushMondeReady` → HUD réinitialisé.

## Blocages hors de mon fichier

- **A (`globe-engine.js`)** : `state.hoverCheckAt` non initialisé (M14-01) — throttle de 45 ms inopérant ; à corriger par le domaine A/M07.
- **B (`globe-reveal.js`)** : `leave()` et `.then()` de `reveal()` sans contrôle de `hoverToken` (M14-02/04) — race pendant le zoom de 720 ms ; à corriger par M15/M20.
- **C (`registry.js`)** : tableaux de callbacks jamais purgés (M14-07) — les 50 lentilles accumulent leurs abonnements à chaque rendu ; correctif global à porter par le maître.

## Vérification

`node --check src/views/monde/M14.js` → **OK** (aucune sortie). Aucune suite E2E lancée (réservée à l'agent maître). Zéro réseau, zéro `Math.random`, zéro `console.*`, aucun sélecteur de test touché (`.globe-list button`, `.globe-country`, `#globe-reveal`, `.event-card`).
