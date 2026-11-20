# t3-retour-poc — Sémantique du retour dans le POC

> Surface MESO de la refonte de la navigation. Fichiers possédés : `solar.js`, `story.js`.
> Références : `APP_PLAN.md` §4 (parcours nominal), §7 (Échap), §12 (ce qui disparaît) ;
> `app.js` `closeReader()` (2109–2147), `onGlobalKeydown()` (1208–1261),
> `syncHashNow()` (255–272) ; `keyboard-router.js` (28–63).
> Ligne de base E2E : **14/14** (`E2E_REPORT.md`, 2026-11-18).

## Principe directeur retenu

`Échap` **reculer d'un cran** dans la vue courante ; le bouton de barre (`Monde`,
`Plan`) est la **sortie explicite** vers le Plan/Monde 3D. Le lecteur reste une
sortie qui rend la main à la vue d'origine (`APP_PLAN.md` §5). Le Système solaire
a une sortie unique documentée vers le globe (`SOLAR_SYSTEM.md` l.25) : son
`Échap` ne doit **pas** être transformé en recul de sélection, sous peine de
casser l'assertion E2E « Échap ramène au globe » (l.68–70). Le recul interne du
Système reste porté par `↑` / `Backspace` (l.1052–1065).

---

## T3-01 (P1) — Focus restauré sur un bouton masqué après fermeture du Récit

**Problème / preuve.** `story.js:1007` capture `state.lastFocus = document.activeElement`
lors de `open()`. Quand le Récit est ouvert depuis le Système, `solar.js:1148–1152`
met `state.open = false`, retire `is-open`, puis masque l'overlay et appelle
`STORY.open()` 300 ms plus tard : l'`activeElement` capturé est le bouton
`solar-recit-btn`, désormais dans un overlay `hidden`. `story.js:1027–1029` tente
ensuite `state.lastFocus.focus()` sur ce nœud masqué : l'appel échoue silencieusement
et le focus retombe sur `<body>`. Même défaut après `storySystemBtn`
(`story.js:1186` : `close({ restoreFocus: false })` puis `SOLAR.open()` à 60 ms :
`SOLAR.open()` capture à son tour le bouton `story-system-btn` en cours de
disparition, `solar.js:888`).

**Solution.** Helper `focusTarget(preferred)` dans chaque module fondé sur
`getClientRects().length > 0` (déjà utilisé par `solar.js:126`) et
`!node.closest('[hidden]')`, avec repli vers `#world-btn` / `#story-plan-btn`.
`open(countryId, mode, options)` accepte `options.returnFocus` ; `close()` ne
restaure que si la cible est réellement visible au moment du `setTimeout`.

**Impact évidence.** Aucune assert E2E ne lit le focus directement, mais
« Échap ramène au globe » (l.70) et « Maj+4 retourne au Système » (l.96)
supposent un focus rendu à la coque : la correction rend ces assertions
vérifiables en lecture d'écran au lieu d'être seulement vraies du DOM.

**Coordination m2-hub-plan (suite à la remontée de l'agent maître).** Le
correctif de `plan.js` ne couvre que les fermetures passant par `goTo()`.
`STORY.close()` reçoit donc un **filet de focus inconditionnel** : à 160 ms, si
`document.activeElement` est `null`/`<body>` ou encore dans `#story-overlay`
(désormais masqué), le focus est renvoyé vers l'origine visible résolue par
`focusTarget()`. Quand l'appelant prend légitimement le relais
(`plan.open()`, `SOLAR.open()`), `activeElement` est déjà un contrôle visible
hors du Récit et le filet ne fait rien — aucun vol de focus. Réciproquement,
`story.open()` appelle désormais
`SOLAR.closeForCountryChange({ restoreFocus: false })` : sans cela, le
`setTimeout` de 40 ms de `solar.close()` volait le focus au Récit en cours
d'ouverture (défaut introduit par T3-04 et corrigé ici). `plan.js` n'est pas
modifié.

**Risque.** Faible : repli explicite, aucun changement de l'ordre des overlays.
**Effort.** M (inclut la coordination).
**Vérification.** Après Maj+4 puis Échap, `document.activeElement.id` doit être
`world-btn` (ou un contrôle du globe), jamais un `*-system-btn` masqué. Cas
supplémentaire : `×` du Récit hors `goTo()` → focus rendu à l'origine visible
en ≤ 160 ms, sans déplacer un focus déjà pris par le Plan ou le Système.

---

## T3-02 (P1) — La transition Récit ← Système contourne `close()` du système

**Problème / preuve.** `solar.js:1146–1154` : le gestionnaire de `solar-recit-btn`
écrit directement `state.open = false` et retire `is-open`. Il n'appelle ni
`close()`, ni `stopLoop()`, ni `stopTour()`/`stopMotion()`/`clearOrbits()`,
ni `closeHelp()`. Si une visite guidée (`P`) ou les orbites (`O`) sont actives,
la boucle rAF (`solar.js:768–787`) continue tant que `document.hidden` est faux
puisque `tick()` teste `state.open`… qui a été mis à false, donc elle s'arrête au
prochain tick — mais `state.tour`/`state.motion` restent `true` et les
`aria-pressed` des boutons (`solar.js:721–729`) restent désynchronisés à la
réouverture. Le `hideTimer` d'un `close()` précédent n'est pas non plus annulé.

**Solution.** Extraire `openStoryFromSolar()` : construire un `snapshot`
(`countryId`, `eraIndex`, `eventIndex`, `returnTo:'solar'`), annoncer « Ouverture
du Récit · sélection conservée », appeler `close(false, { restoreFocus:false })`
(qui stoppe boucle/mouvement/aide), puis ouvrir le Récit après 300 ms avec le
snapshot. Étendre `close(toGlobe, options)` d'un `options.restoreFocus`.

**Impact évidence.** Renforce « La sélection est conservée » (l.97) : le snapshot
est désormais explicite au lieu de reposer sur l'état interne non réinitialisé.

**Risque.** Moyen : la fenêtre de 300 ms pendant laquelle l'overlay système est
encore visible pour le routeur (`keyboard-router.js:36`) doit déléguer le clavier
au Récit — traité en T3-04.

**Effort.** M.
**Vérification.** Activer `P` puis `R` : `VECTEMPOREL_SOLAR.state().tour === false`
et `aria-pressed` remis à `false` au retour ; aucun `requestAnimationFrame` pendant.

---

## T3-03 (P1) — `openPlaces()` / `openEra()` rendent deux fois et peuvent montrer la mauvaise ère

**Problème / preuve.** `story.js:1246–1258` appellent `open(countryId, mode)`
**avant** d'appliquer `eraIndex`. Or `open()` (`story.js:999–1015`) ne réinitialise
les index que si le pays change et appelle `setMode(mode)` → `render()` immédiatement.
Résultat : `renderPlaces()` (`story.js:631–753`) crée un satellite `VECTEMPOREL_SATELLITE`
pour l'ère **précédente**, le détruit, puis le recrée pour la bonne ère ; deux
annonces `aria-live` se succèdent (`story.js:752`), et l'utilisateur entend l'ère
erronée en premier. C'est exactement le bouton « Explorer les lieux » de
`solar.js:522` — donc le chemin E2E « Maj+3 ouvre les lieux » (l.81) après « R ».

**Solution.** Étendre `open(countryId, mode, options)` avec
`{ eraIndex, eventIndex, placeIndex }` appliqués **avant** `setMode()` ; faire
déléguer `openPlaces`/`openEra` à cet appel unique. Un seul rendu, un seul
satellite, une seule annonce.

**Impact évidence.** « Maj+3 ouvre les lieux » (l.81) et « Flèche droite change
de lieu » (l.84) deviennent déterministes : l'index de lieu est posé avant le
premier rendu.

**Risque.** Faible ; les appelants sans options (`plan.js:327`, `dragon.js:1548`)
conservent le comportement actuel.
**Effort.** M.
**Vérification.** Depuis le Système, explorer les lieux de l'ère 3 : une seule
création de satellite et `VECTEMPOREL_STORY.state().era === 2` dès le premier tick.

---

## T3-04 (P1) — Deux overlays simultanés et clavier avalé pendant la transition

**Problème / preuve.** (a) `solar.js:867–908` `open()` ne ferme pas le Récit s'il
est ouvert ; `higherSceneOpen()` (`solar.js:912–917`) empêche seulement la
**réouverture du globe**, pas la coexistence des scènes. (b) `dragon.js:1548`
ouvre le Récit sans fermer `spiral-overlay` : deux `role="dialog" aria-modal="true"`
visibles. (c) Pendant la transition de `solar.js:1148–1152`, le routeur
(`keyboard-router.js:36`) voit encore `solar-overlay` visible et envoie la touche
à `SOLAR.handleKey`, qui retourne immédiatement (`!state.open`, l.973) : ~300 ms
de frappe clavier perdue.

**Solution.** Fermer la scène sœur en tête de `open()` : côté solar,
`STORY.close({restoreFocus:false})` si ouvert ; côté story,
`DRAGON.close({force:true,restoreFocus:false})` et `SOLAR.closeForCountryChange()`
si ouverts, en mémorisant l'origine dans `state.returnTo`. Délégation
`handleKey(event)` à l'autre module quand `!state.open` mais que son overlay est
encore visible. Filet CSS non destructif `#nav-t3a` / `#nav-t3b` injecté par les
modules (aucune règle de `styles.css` modifiée).

**Impact évidence.** « Maj+4 retourne au Système » (l.96 : solar ouvert **et**
story fermé) passe à garantie structurelle au lieu de dépendre de l'ordre des
`setTimeout` des deux modules.

**Risque.** Moyen : bien garder `autoReturn` désactivé par défaut dans
`STORY.close()` pour ne pas rouvrir une scène depuis `plan.js`.
**Effort.** M.
**Vérification.** Comptage de `[role="dialog"][aria-modal="true"]` non masqués
≤ 1 en toute phase ; aucune touche perdue pendant 300 ms après `R`.

---

## T3-05 (P2) — Le Récit n'a pas de garde-lecteur, contrairement au Système

**Problème / preuve.** `solar.js:974` : `if (!document.getElementById('reader-overlay')?.hidden) return;`
protège le clavier système quand le lecteur est au-dessus. `story.js:1032–1143`
n'a **aucune** garde équivalente. Le routeur protège le cas usuel
(`keyboard-router.js:29–32` renvoie Échap à `app`), mais un appel direct à
`VECTEMPOREL_STORY.handleKey()` — ou un lecteur ouvert en chevauchement —
laisse `Échap` exécuter `setMode('eras')` (l.1062) puis `close()` (l.1064)
**sous** le lecteur : la scène d'origine disparaît alors que `closeReader()`
(`app.js:2135–2146`) va restaurer le focus vers un nœud du Récit masqué.

**Solution.** Ajouter en tête de `onKeyDown` la même garde que solar, plus un
test `is-open` pour couvrir la fenêtre des 430 ms de `closeReader()`. Conserver
le routage du routeur comme première barrière.

**Impact évidence.** « Échap referme le lecteur sans quitter le Système » (l.67)
a son pendant Récit : Échap lecteur ne doit jamais refermer le Récit.
**Risque.** Faible. **Effort.** S.
**Vérification.** Ouvrir le lecteur depuis une fiche du Récit, presser Échap :
`STORY.state().open` reste `true` et `mode` inchangé.

---

## T3-06 (P2) — Fil d'Ariane du Système : dernier cran = bouton no-op sans `aria-current`

**Problème / preuve.** `solar.js:553–566` : le dernier crumb (la lune) est construit
avec `action: () => {}` puis `addEventListener('click', item.action)` — un bouton
focusable, tabulable, dont l'activation ne fait rien. Aucun crumb ne porte
`aria-current`, contrairement au rail ordinal du Récit (`story.js:325`,
`aria-current="step"`). Le pied du fil d'Ariane est donc annoncé comme une liste
de boutons tous équivalents.

**Solution.** Rendre le cran courant en `<span aria-current="page" data-nav-t3-current>`
non focusable (`pointer-events:none`), garder les autres comme boutons avec un
`aria-label` explicite (« Retour au monde (Plan) », « Période … », « Repère … »).

**Impact évidence.** Rend visible la hiérarchie Monde › Ère › Repère › Lune que
l'E2E parcourt implicitement (l.55–60).
**Risque.** Très faible (DOM du tableau de bord uniquement). **Effort.** S.
**Vérification.** `querySelectorAll('#solar-crumbs button').length === crumbs.length - 1`
et un seul `[aria-current="page"]`.

---

## T3-07 (P2) — Fil d'Ariane du Récit et état vide : sauts non gardés et bouton cyclique

**Problème / preuve.** (a) `story.js:822–832` pose `is-active` sur le crumb courant
mais aucun `aria-current` ; rien n'empêche un saut direct vers « Lieux » alors
que l'ère n'a aucun repère ni lieu. (b) `story.js:643–657` : dans l'état vide des
lieux, le bouton « Voir les lieux du pays → » repasse `showCountryPlaces = true`
même quand il l'est déjà (chemin possible depuis `setMode('places')` sans
réinitialisation à l.894) : le bouton devient un cycle sans effet, sans sortie
explicite vers le panorama.

**Solution.** `aria-current="step"` sur le crumb actif ; désactiver (`disabled`
+ `aria-disabled`) les crumbs « Panorama »/« Lieux » dont le prérequis manque
(contrôle sur `era.events.length` et `displayPlaces(era).length`) ; dans l'état
vide, si `showCountryPlaces` est déjà vrai, remplacer le bouton par
« ← Retour au panorama ». Ajouter l'attribut `data-nav-t3-return` aux boutons de
sortie des deux états vides (`story.js:405–416` et `643–657`).

**Impact évidence.** Confirme la règle `APP_PLAN.md` §9 « états vides explicites »
et évite un faux positif sur « Maj+3 ouvre les lieux » (l.81) : le mode n'est
annoncé ouvert que s'il a du contenu.
**Risque.** Faible. **Effort.** M.
**Vérification.** Sur une ère sans lieu, `Échap` puis « Lieux » reste désactivé ;
le bouton de repli mène au panorama en un clic, pas en deux.

---

## T3-08 (P2) — « Monde » : retour explicite au Plan muet et focus non garanti

**Problème / preuve.** `solar.js:952–954` `returnToGlobe()` appelle seulement
`close(true)`, qui diffère `openGlobe()` d'un tick (`solar.js:941–949`). Aucune
annonce `aria-live` ne dit que la sélection est conservée, alors que le bouton
`#solar-world-btn` (`index.html:530`) et `#solar-close` (`l.535`) sont les seules
sorties explicites vers le Plan/Monde 3D. La restauration de focus utilise
`state.lastFocus` sans contrôle de visibilité (T3-01).

**Solution.** Annoncer avant `close(true)` :
`« Retour au monde · sélection conservée : {pays}, {ère}. »` via `announce()`
(`solar.js:164–166`, déjà `role="status" aria-live="polite"` et `aria-atomic`,
`l.1128–1130`) ; résoudre la cible de focus avec `focusTarget()`. Conserver le
garde-fou `higherSceneOpen()` et le `countryEpoch` pour le changement de pays
(`closeForCountryChange()`, l.956–958) qui, lui, doit rester silencieux.

**Impact évidence.** « Échap ramène au globe » (l.70) devient audible et pas
seulement visible, sans modifier le comportement de `Échap`.
**Risque.** Très faible. **Effort.** S.
**Vérification.** Après Échap, `#solar-live` contient « Retour au monde » et le
globe est ouvert ; aucun changement de `countryEpoch`.

---

## T3-09 (P2) — Échap (sortie) vs ↑ / Retour (recul d'un cran) non explicites dans l'aide

**Problème / preuve.** `solar.js:1001–1005` : Échap → `returnToGlobe()`, tandis que
`l.1052–1065` : `↑` et `Backspace` reculent d'un cran dans la sélection
(lune → planète → soleil). L'aide injectée `solar.js:1189` documente `↑/↓`, `P`,
`O`, `1–9`, `Tab`, mais **ni Échap ni Retour** : deux sorties différentes pour
deux gestes indistinguables pour l'utilisateur. Côté Récit, l'aide ment sur la
destination : `story.js:765` affiche « Échap : Retour à la queue », expression
retirée du parcours principal (`APP_PLAN.md` §12), alors que `l.1060–1065` ferme
le Récit (ou recule d'un mode).

**Solution.** Enrichir l'aide du Système : « Échap : retour au monde (sortie) ·
Retour/↑ : reculer d'un cran ». Corriger l'aide du Récit en « Fermer · retour à
la vue d'origine ». Encapsuler les reculs dans `recedeTo(...)` qui appelle
`keySelect()` puis `announce('Recul d’un cran · …')` (`solar.js:164`).

**Impact évidence.** Rend auditable la différence entre l'assertion l.67 (Échap
lecteur ne quitte pas le Système) et l.70 (Échap Système quitte vers le globe).
**Risque.** Faible. **Effort.** S.
**Vérification.** `↑` depuis une lune annonce « Recul d'un cran · planète » et
laisse `open === true` ; Échap annonce « Retour au monde » et ouvre le globe.

---

## T3-10 (P3) — Historique navigateur : les scènes n'écoutent pas le hash

**Problème / preuve.** `app.js:255–272` `syncHashNow()` n'écrit que
`history.replaceState('#/{countryId}/{start}-{end}')` : aucun `pushState`, donc
pas de pile navigateur pour les scènes. `solar.js` et `story.js` n'ont aucun
`popstate`/`hashchange` : un retour navigateur (ou une édition manuelle du hash
vers un autre pays) laisse une scène ouverte sur un pays devenu étranger à
l'état partagé. **Blocage de périmètre** : construire une vraie pile d'historique
exigerait `app.js` (possédé par m1/c1/c4) — hors de mes fichiers.

**Solution (portion possible).** Dans chaque module, un garde-fou
`onHistoryChange()` compare le pays du hash (`/^#\/([^/?]+)/`) au pays courant et
appelle `closeForCountryChange()` (solar) ou `close({restoreFocus:false})`
(story) si le hash a changé de pays. Aucun `pushState` ajouté : on ne perturbe
pas `syncHashNow()`. Documenter le blocage pour la synthèse.

**Impact évidence.** Aucun test E2E ne pilote le bouton « retour » du navigateur
; la correction empêche au moins un état incohérent sans changer les 14 asserts.
**Risque.** Faible : `replaceState` ne déclenche pas `hashchange`, donc aucun
bruit pendant le parcours E2E.
**Effort.** S (portion locale) / L (historique complet, hors périmètre).
**Vérification.** Depuis le Système France, écrire `#/uk/-3000-2026` dans la barre :
la scène se ferme sans erreur console et l'état reste cohérent.

---

## Synthèse des dépendances

| Chantier | Fichier(s) | Bloqué par |
| --- | --- | --- |
| T3-01 → T3-09 | `solar.js`, `story.js` | — |
| Coordination focus (T3-01) | `story.js`, `solar.js` | `plan.js` **non modifié** (déjà finalisé par m2) |
| T3-10 (historique complet) | `app.js`, `plan.js` | hors périmètre : pile `pushState` à porter par m1/c1 |

`styles.css` n'est pas modifié ; les correctifs visuels passent par
`<style id="nav-t3a">` (solar) et `<style id="nav-t3b">` (story).

## Observation hors périmètre (à remonter au maître)

Pendant la vérification complémentaire, `globe-modal` reste rendu
(`hidden === false`) après Globe → Système, y compris sans interaction avec mes modules.
Ce comportement vient de la coque partagée (`app.js`, `chooseGlobeCountry()` /
`initNavM1()` en cours de modification par m1) et n'est couvert par aucune des
14 asserts E2E. Il n'est **pas** corrigé ici (fichier interdit) ; il doit être
traité par la surface m1/c1 de la coque. Les 10 chantiers ci-dessus sont, eux,
vérifiés dans `solar.js` et `story.js`.
