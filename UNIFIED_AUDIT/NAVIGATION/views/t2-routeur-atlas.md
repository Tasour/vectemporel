# T2 — Routeur clavier de l'Atlas

Surface MESO `t2-routeur-atlas`. Fichier possede : `~/Projects/vectemporel-atlas/src/platform/keyboard.js` (unique). CSS autorise uniquement via un bloc `<style id="nav-t2">` injecte.

Sources lues : `src/platform/keyboard.js`, `README.md`, `src/ui/shell.js`, `src/domain/store.js`, `tests/e2e.mjs`. Contexte complementaire lu seul : `src/views/globe.js`, `src/views/geography.js`, `src/views/recit.js`, `UNIFIED_AUDIT/NAVIGATION/README.md`.

Ordre de priorite decroissant : T2-01 puis T2-10. Ancres uniques.

---

<a id="t2-01"></a>
## T2-01 — Le gel des modales est contourne par les touches de vue

Probleme (preuve). `keyboard.js:45-55` traite `1`-`5` et `r/c/g/s/m` avant le test de modale de `keyboard.js:57-58`. Quand l'aide ou le detail est ouvert (`shell.js:350-352` rend pourtant le reste `inert`), une touche de vue appelle `goView()` et `store.js:104-108` ferme les modales et change de vue. Le commentaire de `keyboard.js:57` (une modale ouverte gele la scene et son clavier) est donc faux. Comportement reproductible : ouvrir le detail avec Entree, puis presser `4` : le detail disparait et la geographie s'affiche.

Solution. Deplacer le garde-fou de modale immediatement apres `?` et `Echap`, avant le dispatch des touches de vue. En modale, seuls `?` (bascule exclusive), `Echap` (fermeture), `Tab` (piece de `shell.js:140-159`) et l'activation native restent actifs ; toute autre touche sort sans `preventDefault()`.

Impact sur l'evidence. Question ou suis-je / comment je reviens : la modale ne teleporte plus silencieusement la scene ; le retour passe uniquement par `Echap` ou le bouton de fermeture.

Risque. Faible. Les 15 E2E n'ouvrent jamais de vue depuis une modale ; `Echap` doit rester avant le garde, sinon la fermeture casse (`e2e.mjs:36-38`).

Effort. S.

Verification. `node --check` ; `npm run check` (15/15) ; test manuel : Entree puis `4` dans le detail ne change pas de vue.

<a id="t2-02"></a>
## T2-02 — Double table de raccourcis, derive non unique

Probleme (preuve). `keyboard.js:10-11` porte `VIEWS` et `SHORTCUTS` en deux structures paralleles ; `shell.js:12-18` porte `TABS` (les memes five vues) et `shell.js:191-201` en derive les `aria-keyshortcuts` ; `README.md:63-71` en donne une troisieme formulation. Toute modification d'ordre ou de lettre exige trois edits non synchronises. Le routeur n'expose aucune table auditable.

Solution. Remplacer les deux constantes par une source unique `VIEW_KEYS` (id, digit, lettre, libelle) et en deriving `SHORTCUT_MAP` (Map digit+lettre vers id). Exposer la carte sur `window.VECTEMPOREL_KEYS.map` pour audit. Aucune duplication de libelle dans le routeur.

Impact sur l'evidence. Question ou puis-je aller : la carte des destinations est unique, verifiable et coherent avec la barre.

Risque. Faible : mapping identique a celui d'origine (`m=globe, c=chronology, r=recit, g=geography, s=constellation`). Aucun E2E ne teste les lettres, verification manuelle requise.

Effort. S.

Verification. Comparer `window.VECTEMPOREL_KEYS.map` aux cinq onglets ; presser chaque lettre et verifier la vue ; `npm run check`.

---

<a id="t2-03"></a>
## T2-03 — Ordre de dispatch macro-micro non explicite

Probleme (preuve). L'ordre reel de `handle` est : modificateurs (`keyboard.js:31`), editable (`:32`), `?` (`:34`), `Echap` (`:39`), vues (`:45-55`), modale (`:58`), scene (`:63-90`). Cet ordre melange touches globales (macro) et touches de scene (micro) sans regle documentee, et place le gel de modale apres les touches globales (voir T2-01).

Solution. Definir une constante `DISPATCH_ORDER` unique : modificateurs, editable, activation native, aide, echap, gel de modale, vue, scene. Faire correspondre exactement le corps de `handle` a cet ordre et l'exposer sur `window.VECTEMPOREL_KEYS.order` comme contrat auditable.

Impact sur l'evidence. Question comment je reviens : la precedence est lisible et testable ; les touches globales ne peuvent plus court-circuiter le contexte local.

Risque. Moyen : tout reordering doit conserver `Echap` avant le gel et les fleches apres. Couvert par les 15 E2E pour `1`-`5`, fleche droite, Entree, Echap.

Effort. S.

Verification. Lire `window.VECTEMPOREL_KEYS.order` ; rejouer le parcours `e2e.mjs:23-54`.

---

<a id="t2-04"></a>
## T2-04 — Axe des fleches haut/bas incoherent avec la documentation

Probleme (preuve). `keyboard.js:63-79` mappe ` haut/bas` selon la vue : periode en chronologie et constellation, point dans le recit, lieu en geographie. `README.md:67` annonce pourtant univoquement periode precedente / suivante, et `shell.js:279` donne une troisieme formulation. En recit et geographie, haut/bas et gauche/droite font la meme chose (`stepPoint`/`stepPlace`), rendant les deux axes redondants. `store.js:111-121` ajoute une autre divergence : `stepPoint` boucle (modulo) alors que `stepPlace` borne (clamp).

Solution. Centraliser la semantique dans `AXIS_BY_VIEW` unique (horizontal=event/point/place, vertical=era/point/place), faire passer tout le dispatch des fleches par `navigate(view, axe, delta)`, et exposer la table ainsi que `navigationBounds()` (mode wrap/clamp et index courant) sur le hook de test. La confusion documentaire restante (`README.md:67`, `shell.js:264-280`) est documentee comme blocage : ces fichiers ne sont pas possedes.

Impact sur l'evidence. Question ou puis-je aller : deux axes distincts et leur comportement aux bornes sont explicites et auditables.

Risque. Moyen : le comportement functional reste identique (aucun E2E sur haut/bas). Le risque est une divergence documentaire, pas une regression code.

Effort. M (code S, alignement doc bloque).

Verification. Lire `window.VECTEMPOREL_KEYS.axis` et `.navigationBounds()` ; tester haut/bas dans chaque vue ; signaler la correction de `README.md:67` au proprietaire de la surface documentaire.

---

<a id="t2-05"></a>
## T2-05 — Activation native de Entree/Espace trop tard dans la chaine

Probleme (preuve). Le garde `isControl` de `keyboard.js:61` est evalue apres les gardes de modale (`:58`) et de globe (`:59`) et apres les raccourcis de vue (`:45-55`). Un controle focuse ne doit jamais voir son Entree/Espace captee par la scene. Le code a du etre double par un garde-fou local dans `recit.js:126-140` (capture sur `window`), preuve que le routeur seul n'etait pas fiable. `isControl` ne couvre pas les roles `slider`/`spinbutton` utiles aux commandes tactiles.

Solution. Evaluer Entree/Espace sur controle en tete (juste apres modificateurs et editable), couvrir `HTMLElement` et `SVGElement` via `instanceof Element`, ajouter les roles `slider`/`spinbutton`, et ne jamais appeler `preventDefault()` dans ce cas. Exposer `isControl` sur le hook de test.

Impact sur l'evidence. Question comment je le sais : un bouton, un lien ou un marqueur focuse garde son activation native, sans activation double ni vol de touche.

Risque. Faible. Le parcours E2E (Entree sur la scene apres fleche, `e2e.mjs:33-38`) doit continuer a ouvrir le detail : le garde ne s'applique qu'aux controleurs reels, pas a `#atlas-stage` (`tabindex=-1`).

Effort. S.

Verification. `npm run check` ; test manuel : focus sur un onglet puis Entree change de vue, focus sur le stage puis Entree ouvre le detail.

---

<a id="t2-06"></a>
## T2-06 — Bascule d'aide et fermeture centralisees, modales exclusives

Probleme (preuve). `keyboard.js:34-44` traite `?` et `Echap` avant le gel, mais sans etat auditables : aucun hook ne permet de verifier que help et detail ne sont jamais ouverts en meme temps. `store.js:140-152` garantit l'exclusivite cote donnees (toggleHelp force detailOpen a false, toggleDetail force helpOpen a false), mais le routeur ne le documente pas et ne renvoie aucun retour live quand `?` remplace le detail par l'aide.

Solution. Conserver `?` et `Echap` en tete de chaine, ajouter une annonce live sur la bascule d'aide et sur la fermeture, appeler uniquement les actions du store (`toggleHelp`, `closeModal`, `goView`) sans ecriture d'etat brut, et exposer `modalState()` (help, detail) sur le hook pour prouver l'exclusivite.

Impact sur l'evidence. Question comment je le sais : chaque changement de modale est annonce, et l'exclusivite est verifiable de l'exterieur.

Risque. Faible. `store.js:104-108` ferme deja les modales sur `goView` ; aucun double etat possible cote routeur.

Effort. S.

Verification. Ouvrir le detail puis `?` : lire `window.VECTEMPOREL_KEYS.modalState()` et l'annonce ; `Echap` ferme puis annonce ; `npm run check`.

---

<a id="t2-07"></a>
## T2-07 — Aide en dur non synchronisee avec la carte de raccourcis

Probleme (preuve). `shell.js:264-280` ecrit huit lignes d'aide en dur, dont `r c g s m` (`:266`) et la formulation des fleches (`:267-268`), alors que la carte reelle vit dans `keyboard.js:10-11`. Toute evolution du routeur rend l'aide fausse sans qu'aucun test ne le detecte. Le panneau d'aide est la source de verite perceived par l'utilisateur.

Solution. Exposer `helpMap()` sur `window.VECTEMPOREL_KEYS` : lignes generees depuis `VIEW_KEYS` et `AXIS_BY_VIEW`, avec les memes libelles que la barre. Fournir ainsi une source unique consommable par la coque. La reecriture effective du panneau `shell.js:255-284` est un blocage : fichier non possede (surface m3-coque-atlas).

Impact sur l'evidence. Question ou puis-je aller : l'aide peut etre generee depuis la meme table que le routage, donc elle cesse de pouvoir mentir.

Risque. Faible : aucune modification de `shell.js`, pure addition d'un hook ; aucun impact E2E.

Effort. S (generation du hook), blocage documente pour l'integration visuelle.

Verification. Comparer `window.VECTEMPOREL_KEYS.helpMap()` aux huit lignes de `shell.js:264-277` ; signaler l'ecart au proprietaire de la coque.

---

<a id="t2-08"></a>
## T2-08 — Actions clavier lecture/perimetre sans annonce live

Probleme (preuve). `keyboard.js:85-90` appelle `togglePlay` et `toggleScope`, mais `shell.js:83-96` (`announcement()`) ne prend en compte ni `state.playing` ni `state.scope` : la region live de la coque annonce le point du recit ou le repere, sans mentionner demarrage/arret ni changement de perimetre. Un lecteur d'ecran ne sait pas que l'Espace a agi. `recit.js:110-124` porte une region live propre, mais le routeur ne l'alimente pas.

Solution. Injecter une region live dediee `#nav-t2-live` (`role=status`, `aria-live=polite`, `aria-atomic=true`) et le bloc CSS auto-porte `<style id="nav-t2">` definissant `.sr-only` en repli (`shell.js:58` le definit deja). Ajouter `announce()` avec deduplication, appele sur Espace (lecture activee/arrettee, perimetre pays/repere), `?` et `Echap`. Ne pas dupliquer les annonces deja couvertes par `shell.js:87-95`.

Impact sur l'evidence. Question comment je le sais : toute action clavier muette pour la coque recoit un retour audible et non redondant.

Risque. Faible. Deux regions live coexistent deja (`shell.js:74-81`, `globe.js:233-238`, `recit.js:110-115`) ; la nouvelle cible uniquement les actions non couvertes. Aucun ajout de texte visible, aucun E2E impacte.

Effort. M.

Verification. Presser Espace en recit puis en geographie ; lire `#nav-t2-live` et verifier l'absence de doublon avec `window.VATLAS_A11Y.getLive()` ; `npm run check`.

---

<a id="t2-09"></a>
## T2-09 — Mobile : equivalence tactile des raccourcis non explicite

Probleme (preuve). `?` necessite Shift+Slash et les raccourcis `r/c/g/s/m` (`keyboard.js:11,34`) sont difficiles sur clavier tactile. La coque prevoit deja des replis : bouton d'aide `shell.js:204-212` et onglets `shell.js:191-201` (CSS mobile `shell.js:59-67`). Mais le routeur n'expose aucune table d'equivalence : on ne peut pas verifier que chaque raccourci a un controle tactile equivalent, ni que `Echap` en a un (aucun bouton « retour au monde » n'existe).

Solution. Exposer `touchEquivalents()` sur le hook : mapping de chaque digit/lettre vers le selecteur du bouton existant (`[data-fk="tab-<id>"]`) et de `?` vers `[data-fk="help-toggle"]`. Preserver l'activation native de T2-05, condition necessaire aux boutons tactiles. Signaler comme blocage l'ajout d'un bouton « retour au monde » equivalent a `Echap` (hors fichier possede).

Impact sur l'evidence. Question ou puis-je aller / comment je reviens : l'equivalence clavier/tactile est auditable et le retour manquant est explicitement identifie.

Risque. Faible : hook en lecture seule, aucun DOM visible ajoute hors region live.

Effort. S (hooks), M pour le bouton de retour bloque.

Verification. Comparer `window.VECTEMPOREL_KEYS.touchEquivalents()` aux boutons reels ; cliquer chaque onglet ; `npm run check`.

---

<a id="t2-10"></a>
## T2-10 — Robustesse et testabilite du routeur

Probleme (preuve). `keyboard.js:93` installe un ecouteur en capture sur `document` sans verifier `event.defaultPrevented` : un gestionnaire local ayant deja consomme la touche peut encore voir la scene reagir. `keyboard.js:117` exporte `initKeyboard()` vide : aucun point d'entree idempotent pour initialiser le CSS/live. Le hook `window.VECTEMPOREL_KEYS` (`:94`) n'expose que `handle` et `setAutoplayMs`, insuffisant pour auditer les neuf chantiers ci-dessus. La boucle d'auto-lecture (`:96-115`) est correcte (`document.hidden`, modales) mais non introspectable.

Solution. Ajouter un garde `if (event.defaultPrevented) return;` en tete de `handle`, rendre `initKeyboard()` idempotent (injecte CSS et region live une seule fois), enrichir le hook avec `map`, `order`, `axis`, `isControl`, `announce`, `modalState`, `helpMap`, `touchEquivalents`, `navigationBounds`. Conserver la boucle rAF-free par `setTimeout` et le `subscribe` sur raison `autoplay`.

Impact sur l'evidence. Question comment je le sais : l'ensemble du contrat clavier est observable depuis la console, ce qui rend la refonte verifiable sans modifier les tests.

Risque. Faible. Le garde `defaultPrevented` ne change aucun des 15 E2E (aucun gestionnaire local ne `preventDefault` sur ces touches). Les hooks sont additifs.

Effort. S.

Verification. `node --check src/platform/keyboard.js` ; `npm run check` (15/15) ; inspector `Object.keys(window.VECTEMPOREL_KEYS)`.

---

## Notes de blocage (fichiers non possedes)

- `README.md:63-71` (table de navigation) et `shell.js:255-284` (panneau d'aide) restent a aligner sur `AXIS_BY_VIEW` et `helpMap()` : chantiers T2-04 et T2-07. Aucune modification apportee, conformement a la possession exclusive de `keyboard.js`.
- `shell.js:204-212` ne comporte pas de bouton equivalent a `Echap` sur mobile : chantier T2-09, hook d'equivalence fourni, bouton non ajoute.
- `store.js:111-121` (wrap de `stepPoint` vs clamp de `stepPlace`) n'a pas ete modifie : `navigationBounds()` expose le comportement reel pour arbitrage par la surface t4-etat-atlas.

---

<a id="alignement-m4"></a>
## Alignement avec la taxonomie M4 (coordination inter-surfaces)

Le sous-agent `m4-taxonomie-atlas` a finalize `src/app.js` avec `VIEW_TAXONOMY` (`app.js:20-26`) et les helpers publics `window.VATLAS` (`app.js:130-152`). Alignement applique dans `keyboard.js` sans modifier `app.js` :

- Source unique : le catalogue public est lu au runtime via `window.VATLAS.taxonomy` (`app.js:133`) ; `FALLBACK_VIEWS` en est le miroir strictement identique (id, digit, lettre, libelle, level) pour le cas ou le routeur est appele avant publication de `window.VATLAS` (`app.js:130`, apres `initKeyboard()` en `:126`). Aucun import circulaire.
- Resolution : `resolveViewKey()` delegate a `window.VATLAS.resolveView` (`app.js:62-69,137`) avec repli sur `SHORTCUT_MAP`.
- Verification de collision : `window.VECTEMPOREL_KEYS.conflicts()` controle que les lettres `r/c/g/s/m` sont uniques et ne recouvrent ni `?`, `Echap`, `Entree`, `Espace` ni les fleches ; resultat observe : aucune collision. `taxonomyAligned()` verifie l'egalite des champs avec `VIEW_TAXONOMY`.
- Derives : `helpMap()` (T2-07) et `touchEquivalents()` (T2-09) lisent desormais le catalogue public, donc aucune troisieme table de libelles ne subsiste dans le routeur.

`src/app.js` n'a pas ete modifie. Le garde `addEventListener('keydown'` du routeur reste unique (controle `scripts/verify.mjs:27`).

---

<a id="verification-environnement"></a>
## Note de verification (environnement)

`node --check src/platform/keyboard.js` : OK. `npm run verify` : tous les controles passent (21/21, dont `routeur clavier unique`, `scripts/verify.mjs:27`). `npm run test:e2e` : la navigation `waitUntil: 'networkidle0'` (`tests/e2e.mjs:20`) expire apres 30 s dans cette session, y compris sur une page triviale (`http://127.0.0.1:4181/README.md`) et avec zero requete pendante : defaut environnemental (forte contention Chromium entre sous-agents), non lie a `keyboard.js`. Les 15 memes assertions, rejouees avec `waitUntil: 'domcontentloaded'`, passent toutes (15/15, aucune erreur console). Verifications fonctionnelles supplementaires observees : `taxonomyAligned() === true`, `conflicts() === []`, gel de modale effectif (`4` dans le detail ne change pas de vue), annonce `#nav-t2-live` sur Espace en recit.
