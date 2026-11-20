# m1-orientation-globale — modèle d’orientation global du POC

> Surface **MACRO** de la refonte de la navigation Vectemporel. Périmètre : point d’entrée, nombre et noms des destinations, hiérarchie des niveaux, « où suis-je » permanent, absence de modes orphelins.
> Fichiers possédés : `index.html`, `APP_PLAN.md`, zone shell/état global de `app.js` (début du fichier).
> Fichiers lus en dépendance (non modifiés ici) : `README.md`, `plan.js`, `keyboard-router.js`, `story.js`, `solar.js`, `dragon.js`, `styles.css`, `scripts/e2e-keyboard.mjs`.
> 10 chantiers, priorité décroissante. Aucune date, citation ni donnée historique inventée. Aucune commande Git. E2E de référence : 14/14 avant passage.

## Synthèse

| # | Chantier | Priorité | Effort |
| --- | --- | --- | --- |
| M1-01 | Aucun « où suis-je » permanent dans la coque | P0 | M |
| M1-02 | Point d’entrée documenté trois façons différentes | P0 | S |
| M1-03 | Double taxonomie : plan hiérarchique vs grille plate | P0 | S |
| M1-04 | Système solaire : mode central orphelin du Plan | P0 | M |
| M1-05 | Jeux d’onglets divergents d’une scène à l’autre | P1 | M |
| M1-06 | Bandeau `plan-flow` qui décrit un autre parcours que la grille | P1 | S |
| M1-07 | `document.title` écrase la tagline et perd la vue courante | P1 | S |
| M1-08 | Contrat d’état §5 caduc : `view` = fenêtre temporelle, pas mode | P1 | S |
| M1-09 | Lecteur annoncé comme destination alors qu’il est une sortie | P2 | S |
| M1-10 | Aucune annonce live de changement de vue, aucun ancrage pour le routeur | P2 | S |

---

## M1-01 — Aucun « où suis-je » permanent dans la coque

- **Problème / preuve** : la barre de base `index.html:29–93` affiche la marque, le pays (`world-name` `index.html:52`) et des actions, mais aucun indicateur de vue courante. Chaque scène porte sa propre barre avec un jeu d’onglets différent (`index.html:282–287`, `482–487`, `529–533`). Le routeur déduit la scène active de la seule visibilité des overlays (`keyboard-router.js:34–41` `visible(id)` = `!node.hidden`) : il n’existe aucune source de vérité exposée. `APP_PLAN.md:120` affirme « Barre : onglets, pays, aide, fermeture. Identique dans Plan, Récit et Dragon » — contredit par le HTML.
- **Solution** : dans la zone shell de `app.js`, déclarer `state.mode`, une table `NAV_MODE_LABELS`, `detectMode()` (même priorité que `keyboard-router.js:34–41`, lecteur en tête) et `setMode()` qui écrit `#app.dataset.nav-mode`, le fil d’Ariane `Monde › Pays › Vue` et le titre. Un `MutationObserver` sur l’attribut `hidden` des sept overlays synchronise l’état sans toucher aux modules propriétaires. Injection d’un bloc CSS unique `<style id="nav-m1">` et d’un cluster de repérage identique en tête de chaque barre — `styles.css` intact.
- **Impact sur l’évidence de la navigation** : la question « où suis-je ? » reçoit une réponse visible en permanence, dans la coque et dans toutes les scènes, avec une hiérarchie explicite ; le routeur et l’interface partagent le même vocabulaire.
- **Risque** : observateur trop réactif pendant les transitions (fermeture différée du Système à `solar.js:934–937`) → mitigation par `requestAnimationFrame` et priorité calquée sur le routeur. Ajout de nœuds non focusables (le beacon est un `span`) pour ne pas perturber les pièges de focus.
- **Effort** : M.
- **Vérification** : `VECTEMPOREL_NAV_M1.getMode()` vaut `monde` au chargement, `systeme` après choix du pays, `recit` après `R`, `frise` au retour ; `#app.dataset.nav-mode` suit ; un seul `<style id="nav-m1">` présent ; E2E 14/14.

## M1-02 — Point d’entrée documenté trois façons différentes

- **Problème / preuve** : `README.md:43` « le Récit s’ouvre directement », `APP_PLAN.md:11` « L’application s’ouvre sur le Monde 3D », `plan.js:328–344` `start()` appelle `openGlobe()` au `load` (et n’ouvre le Récit sur aucune touche). Le E2E confirme le comportement réel : `scripts/e2e-keyboard.mjs:51` « Accueil = globe 3D ». Le document canonique décrit donc un point d’entrée différent de celui que l’utilisateur voit.
- **Solution** : réécrire `APP_PLAN.md` §1, §4 et §12 pour aligner la règle, le parcours nominal et la rubrique « Ce qui disparaît » sur le globe d’accueil ; ajouter un avertissement explicite que `README.md:43` est obsolète et que `APP_PLAN.md` fait foi (correctif README à coordonner, fichier non possédé ici).
- **Impact sur l’évidence de la navigation** : un modèle mental unique dès la première seconde ; plus de contradiction entre la doc de référence et l’écran d’accueil.
- **Risque** : aucun sur le code. Risque documentaire si le README n’est pas corrigé par son propriétaire — signalé au hub.
- **Effort** : S.
- **Vérification** : `APP_PLAN.md` §1 et §4 nomment tous deux le Monde 3D comme point d’entrée et ne mentionnent plus d’ouverture automatique du Récit ; l’alerte de coordination figure dans le rapport.

## M1-03 — Double taxonomie : plan hiérarchique vs grille plate

- **Problème / preuve** : `APP_PLAN.md:21–34` décrit une hiérarchie `Monde 3D → Système solaire → {soleil, planète, lune, fiche, Récit}` avec Frise et Lecteur en sorties latérales, tandis que `index.html:412–440` et `plan.js:11` présentent quatre destinations plates (`recit`, `dragon`, `frise`, `lecteur`). `APP_PLAN.md:44–53` inventorie huit écrans (00, 01a, 01b, 01c, 02, 02a, 03, 04) pour quatre cartes. Résultat : le Dragon est une destination de premier plan dans l’un, un « ancien tourbillon retiré du parcours principal » dans l’autre (`APP_PLAN.md:204`).
- **Solution** : arrêter une taxonomie canonique à six noms stables — `monde`, `plan`, `systeme`, `recit`, `dragon`, `frise` — plus `lecteur` comme **sortie** ; la consigner dans `APP_PLAN.md` §2 et §3, et l’exposer dans le code via `NAV_MODE_LABELS` (M1-01). Les cartes du Plan conservent leurs quatre verbes pour ne pas casser `plan.js:63` (`% 4`) ni le E2E, mais chaque libellé est réconcilié avec la hiérarchie (Récit = porte d’entrée du récit, Dragon = exploration libre, Frise = consultation, Lire = sortie).
- **Impact sur l’évidence de la navigation** : un seul jeu de noms pour la carte, la barre, le titre d’onglet et le document ; la hiérarchie devient lisible au lieu d’être implicite.
- **Risque** : renommer une carte casserait `plan.js:11` et les raccourcis `1`–`4` → mitigation : aucun `data-view` ni identifiant de carte modifié, seulement les textes visibles et la doc.
- **Effort** : S.
- **Vérification** : les six noms canoniques apparaissent dans `APP_PLAN.md` §2 et dans `NAV_MODE_LABELS` ; `document.querySelectorAll('.plan-card[data-view]').length === 4` ; E2E 14/14 (raccourcis `1`–`4` intacts).

## M1-04 — Système solaire : mode central orphelin du Plan

- **Problème / preuve** : `APP_PLAN.md:25` fait du Système solaire « la vue centrale après le pays », mais il n’a aucune carte dans le Plan (`index.html:412–440`), aucun onglet dans la barre du Dragon (`index.html:281–287`) et aucun deep link dédié. Il n’est atteignable que par un clic sur le globe (`app.js:3036–3037`) ou l’onglet `data-view-tab="systeme"` du Récit (`index.html:485`). Inversement, le Plan n’est pas atteignable depuis le Système : ses onglets sont `Monde | Système | Récit` (`index.html:529–533`).
- **Solution** : dans le cluster injecté (M1-01), exposer en permanence deux commandes nommées `Plan` et `Système` (`data-nav-goto`) ; un gestionnaire délégué unique dans la zone shell ferme les scènes concurrentes puis appelle `VECTEMPOREL_PLAN.open()` ou `VECTEMPOREL_SOLAR.open(getCountryId())`, en s’appuyant sur les API publiques existantes (`plan.js:315–323`, `solar.js:1336–1364`). Compléter `APP_PLAN.md` §2 pour que toute scène puisse rejoindre le hub.
- **Impact sur l’évidence de la navigation** : la vue centrale et le hub deviennent des destinations réellement atteignables d’où que l’on soit — fin des modes orphelins.
- **Risque** : ouvrir le Système depuis le Dragon ou le Récit peut laisser deux overlays `is-open` (déjà observé en `v1-monde-3d.md:126`) → mitigation : fermeture explicite de `VECTEMPOREL_DRAGON`, `VECTEMPOREL_STORY`, `VECTEMPOREL_PLAN` et `closeGlobe()` avant l’appel, comme `plan.js:180–184` le fait déjà.
- **Effort** : M.
- **Vérification** : depuis le Dragon, le bouton injecté `Système` ouvre `VECTEMPOREL_SOLAR.state().open === true` avec `story.open === false` et `dragon.open === false` ; depuis le Système, `Plan` rouvre `#plan-overlay` ; un seul overlay `is-open` à la fois ; E2E 14/14.

## M1-05 — Jeux d’onglets divergents d’une scène à l’autre

- **Problème / preuve** : Récit = `Plan | Récit | Système | Dragon` (`index.html:482–487`) ; Dragon = `Plan | Dragon | Récit` (`281–287`) ; Système = `Monde | Système | Récit` (`529–533`) ; Plan = aucun onglet (`393–405`) ; Frise = aucun (`29–93`). Le nombre et l’ordre des destinations changent selon la scène, ce qui contredit `APP_PLAN.md:120` et rend le retour imprévisible.
- **Solution** : injecter un cluster identique en tête des sept barres, avec les six destinations canoniques dans le même ordre (`Plan · Monde · Récit · Dragon · Système · Frise`) plus `Lire`, piloté par une seule fonction `renderNavCluster()`. Les onglets historiques restent en place (aucun `id` supprimé, aucun handler cassé) ; le cluster ajoute la cohérence sans modifier les modules propriétaires. Styles du cluster uniquement dans `<style id="nav-m1">`.
- **Impact sur l’évidence de la navigation** : la carte des destinations est la même partout ; « où puis-je aller ? » se lit d’un coup d’œil, sans mémoriser six variantes.
- **Risque** : surcharge visuelle des barres denses (`.mode-tab` 25 px / 9 px, `styles.css:6614–6625`) → mitigation : pastilles plus compactes, `flex-wrap`, et `aria-hidden` sur les clones non actifs pour ne pas dupliquer les annonces.
- **Effort** : M.
- **Vérification** : `document.querySelectorAll('.nav-m1-cluster').length` = nombre de barres + 1 ; l’ordre des `data-nav-goto` est identique dans chaque cluster ; aucun `id` d’onglet historique perdu ; E2E 14/14.

## M1-06 — Bandeau `plan-flow` qui décrit un autre parcours que la grille

- **Problème / preuve** : `index.html:442–444` affiche `PLAN → PÉRIODE → PANORAMA → LIEUX → DRAGON → FICHE`. Ce ruban linéaire omet la Frise et le Lecteur, transforme trois **sous-étapes** du Récit (`APP_PLAN.md:47–49`) en destinations, et suggère un enchaînement obligatoire alors que `plan.js:165–189` offre quatre portes indépendantes.
- **Solution** : remplacer le ruban par la hiérarchie canonique réelle, lisible de gauche à droite : `MONDE → PAYS → { SYSTÈME · RÉCIT · DRAGON · FRISE } → LECTEUR (sortie)`. Conserver l’`aria-hidden="true"` du conteneur (c’est une aide visuelle, le détail est dans les cartes) et synchroniser `APP_PLAN.md` §2 avec ce libellé.
- **Impact sur l’évidence de la navigation** : le schéma visible sous la grille ne contredit plus la grille ; la sortie `Lecteur` est enfin nommée comme telle.
- **Risque** : aucun sur le JS (nœud purement décoratif, aucun `id` référencé) ; risque de débordement sur mobile → `white-space: normal` dans le bloc injecté.
- **Effort** : S.
- **Vérification** : le texte du `.plan-flow` contient les six noms canoniques et le mot « sortie » ; aucune référence à `PÉRIODE/PANORAMA/LIEUX` comme destinations ; E2E 14/14.

## M1-07 — `document.title` écrase la tagline et perd la vue courante

- **Problème / preuve** : `index.html:11` pose `Vectemporel — L’Histoire, à portée de zoom`, mais `app.js:324` remplace le titre par `${pays} — Vectemporel`, supprimant la tagline et toute mention de la vue. Dans un onglet parmi d’autres (atlas sur 4181, POC sur 4173), le titre ne dit plus où l’on est.
- **Solution** : centraliser le titre dans `updateDocumentTitle()` (zone shell) : `${Nom canonique de la vue} · ${Pays} — Vectemporel` ; l’appeler depuis `updateCountryCopy()` (en remplacement de l’affectation directe) et depuis `setMode()`. Le `<title>` initial reste la tagline pour le premier chargement avant `boot()`.
- **Impact sur l’évidence de la navigation** : l’orientation survit au changement d’onglet ; le titre devient un repère secondaire cohérent avec la balise visuelle (M1-01).
- **Risque** : titre trop long dans l’onglet → mitigation : libellés courts (`Système`, `Récit`, `Dragon`, `Frise`, `Lecteur`, `Monde`, `Plan`).
- **Effort** : S.
- **Vérification** : après `R`, `document.title` commence par `Récit · France` ; après retour Frise, par `Frise · France` ; E2E 14/14.

## M1-08 — Contrat d’état §5 caduc : `view` = fenêtre temporelle, pas mode

- **Problème / preuve** : `APP_PLAN.md:81–92` spécifie `AppState.view: 'plan' | 'recit' | 'dragon' | 'frise' | 'lecteur'` et `§96` « la coque possède `countryId` et `view` ». Dans le code, `app.js:105–124` définit `view: { start: -600, end: 2026 }` — la **fenêtre de temps** de la frise — et aucun champ de mode ; `state.globeOpen` est même créé implicitement plus bas (`app.js:3094`). Le §5 promet donc un contrat que l’implémentation ne tient pas, ce qui rend impossible un routeur ou un deep link de vue.
- **Solution** : ajouter `mode: 'frise'` à l’objet `state` de la zone shell, exposer `getMode()` / `setMode()` sur `window.VECTEMPOREL_APP`, et réécrire `APP_PLAN.md` §5 avec les vrais noms : `view` = fenêtre `{start,end}` (frise), `mode` = destination active, `globeOpen` explicite ; documenter la priorité de détection identique au routeur.
- **Impact sur l’évidence de la navigation** : l’état affiché, l’état annoncé et l’état documenté concordent ; les autres experts (deep links, aide, coque Atlas) disposent d’un point d’ancrage stable.
- **Risque** : collision de noms avec `story.js` (`state.mode = 'places'` y est local) → mitigation : `state` est privé à l’IIFE de `app.js`, aucun conflit ; vérifié par recherche de `state.mode` dans `app.js` (aucune occurrence avant ajout).
- **Effort** : S.
- **Vérification** : `APP_PLAN.md` §5 ne présente plus `view` comme un mode ; `VECTEMPOREL_NAV_M1.getMode()` existe et renvoie une chaîne ; `node --check app.js` OK ; E2E 14/14.

## M1-09 — Lecteur annoncé comme destination alors qu’il est une sortie

- **Problème / preuve** : la carte 04 `index.html:434–440` est intitulée « Lecteur · Lire… · L’article Grokipedia traduit, avec ses sources » et rangée parmi les quatre destinations, alors que `APP_PLAN.md:12` (« le lecteur est une sortie »), `:38` (« jamais une destination ») et `plan.js:180–187` le traitent comme une sortie de la coque. Le `plan-flow` `index.html:443` le nomme « FICHE », troisième synonyme.
- **Solution** : relibeller la carte 04 en « Lire la source · sortie commune » sans toucher à son `data-view="lecteur"` ; aligner le sous-titre et le libellé du cluster injecté sur `Lire` ; préciser dans `APP_PLAN.md` §3 que l’ID 04 est une sortie et non une destination.
- **Impact sur l’évidence de la navigation** : la différence entre « je choisis un mode de lecture » et « je consulte la source d’un repère » devient explicite ; le retour (Échap) se comprend sans explication.
- **Risque** : modification de texte seul → aucun risque fonctionnel ; le E2E teste l’ouverture du lecteur par `Entrée` dans le Système, pas le libellé de la carte.
- **Effort** : S.
- **Vérification** : la carte 04 contient « sortie » ; `data-view="lecteur"` intact ; `VECTEMPOREL_PLAN.goTo('lecteur')` ouvre toujours un article ; E2E 14/14.

## M1-10 — Aucune annonce live de changement de vue, aucun ancrage pour le routeur

- **Problème / preuve** : le passage d’une scène à l’autre n’est annoncé par aucune `live region` dédiée : `index.html` ne porte que `#toast` (`738`) et les `role="status"` locaux du Système (`547`) et du lecteur. `keyboard-router.js:34–41` déduit la scène active du DOM, sans attribut sur `#app` : un routeur futur (deep links, aide contextuelle) ne peut pas interroger l’orientation.
- **Solution** : ajouter une `live region` visuellement masquée `#nav-m1-live` (`role="status" aria-live="polite"`) mise à jour par `setMode()` avec le fil d’Ariane complet ; poser `data-nav-mode` sur `#app` (M1-01) comme ancrage machine ; documenter dans `APP_PLAN.md` §7 que le routeur doit lire cet attribut avant de distribuer la touche. Aucune modification de `keyboard-router.js` (non possédé) : l’intégration est proposée au propriétaire.
- **Impact sur l’évidence de la navigation** : le changement de repère est audible, et l’orientation devient interrogeable par les autres couches — l’évidence profite à la fois à la personne et à la machine.
- **Risque** : annonces redondantes avec les `role="status"` existants → mitigation : annoncer uniquement sur changement effectif de `state.mode` (garde `if (next === state.mode) return`) et non sur chaque observateur.
- **Effort** : S.
- **Vérification** : `R` puis `Échap` produisent exactement deux textes distincts dans `#nav-m1-live` ; `#app.dataset.nav-mode` vaut `recit` puis `frise` ; E2E 14/14.

---

## État d’implémentation et coordination

Les 10 chantiers sont implémentés dans `index.html`, `APP_PLAN.md` et la zone shell de `app.js`. Le CSS est ajouté par un bloc injecté unique `<style id="nav-m1">` ; `styles.css` n’est pas modifié. Aucun `id` ni `data-view` existant n’est supprimé, aucun handler de module voisin n’est déplacé.

**Points à coordonner avec l’agent maître / autres experts :**
1. `README.md:43` (« le Récit s’ouvre directement ») est obsolète et appartient à un autre périmètre : correctif à prévoir (M1-02).
2. `keyboard-router.js:34–41` continue d’inférer la scène depuis les `hidden` ; il pourrait lire `#app.dataset.nav-mode` (M1-10) — fichier non possédé ici.
3. Le hash `#/pays/début-fin/événement` (`app.js:255–272`) ne porte pas de vue : l’ajout d’un deep link de mode appartient au chantier `c1-deeplink-poc` ; l’ancrage `data-nav-mode` lui est fourni.
4. `solar.js` masque l’overlay avec un délai : le `MutationObserver` de M1-01 suit le DOM, comme le routeur, pour rester cohérent pendant la transition.
5. **Coordination `t3-retour-poc` (demande de l’agent maître)** : après Globe → Système, le `.globe-modal` restait `is-open` avec `body.globe-open`, bien que le Système fût actif — deux modaux concurrents. Corrigé dans la zone shell : `setNavMode()` appelle `closeGlobe()` puis `setGlobeInert(true)` dès que la destination n’est pas `monde`. Le modal reste dans le DOM (aucune suppression, moteur WebGL arrêté par `closeGlobe()`) mais reçoit `inert`, `aria-hidden="true"` et perd `is-open` ; un `requestAnimationFrame` différé neutralise la `rAF` pendante de `openGlobe()` qui réajoutait `is-open`. Le retour `Échap` du Système rouvre normalement le globe (`setGlobeInert(false)`), contrôle E2E « Échap ramène au globe » vert. `solar.js` et `story.js` n’ont pas été modifiés.

## Vérifications

- `node --check app.js` : **OK**.
- E2E (`npm run test:e2e`, exécuté depuis une copie isolée dans `/tmp/opencode/m1-e2e` pour ne pas réécrire `E2E_REPORT.md`, fichier non possédé) : **14/14**, identique au baseline avant passage.
- Sonde fonctionnelle dédiée (Chromium headless, 22 contrôles) : **22/22 PASS** — API `VECTEMPOREL_NAV_M1` exposée, un seul `<style id="nav-m1">`, 7 clusters aux 7 jeux de boutons identiques, mode initial `monde`, `#app[data-nav-mode]` synchronisé, fil d’Ariane à trois niveaux, `#nav-m1-live` alimenté, titre d’onglet préfixé par la vue, transitions `monde → systeme → recit → plan → systeme → lecteur` par clavier et par clic délégué, aucun overlay concurrent, aucune erreur console.
- Sonde de nav libre (8 contrôles) : **8/8 PASS** — `globe → Système`, `Système → Plan` depuis la barre solaire, `Plan → Récit`, `Récit → Lecteur`, `Lecteur → Plan`, lecteur refermé, aucune erreur console. Un premier passage avait révélé une récursion `enforceFocus` (`plan.js` ↔ `solar.js`) quand deux overlays restaient visibles : `closeNavScenes()` force maintenant le masquage immédiat des overlays concurrents avant l’ouverture.
- Sonde `globe-modal` (coordination t3) : après Globe → Système, `#globe-overlay` est `hidden`, privé de `is-open` et de `body.globe-open`, tandis que `.globe-modal` porte `inert` et `aria-hidden="true"` ; le canvas reste présent mais le moteur est arrêté.
- E2E rejoué **3 fois consécutivement** après la correction : **14/14 à chaque fois**. Une exécution lancée sans délai après une autre a produit un 9/14 transitoire par contention de deux instances Chromium/WebGL ; non reproductible avec un espacement de 2 s.
- Fichiers modifiés : `index.html`, `APP_PLAN.md`, `app.js` (zone shell uniquement), le présent rapport. `styles.css`, `README.md`, `keyboard-router.js` et les modules de scène n’ont pas été touchés.
