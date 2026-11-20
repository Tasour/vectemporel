# M2 — Hub « Plan » (grille 2×2 du POC)

> Surface MACRO `m2-hub-plan`. Fichier possédé : `plan.js` uniquement ; CSS via bloc injecté `<style id="nav-m2">`.
> Les numéros de ligne cités sont ceux **avant correctif** (relevés le 2026-11-18).

## M2-01 — Vol de focus au retour de navigation (priorité P0)

- **Problème (preuve)** : `plan.js:137-145` `close()` programme un `setTimeout(…, 40)` qui rend le focus à `state.lastFocus` (le bouton `#plan-main-btn`). `plan.js:165-189` `goTo()` appelle ce `close()` **avant** `VECTEMPOREL_STORY.open()` (`story.js:993-1015`, qui pose le focus dans la scène via `render()`→`focusCurrent()`) ou `VECTEMPOREL_DRAGON.open()` (`dragon.js:1465-1469`, `els.close.focus()`). 40 ms plus tard, le timer du Plan écrase ce focus et le renvoie dans la barre. Comportement reproductible : ouvrir le Plan par `#plan-main-btn`, `Entrée` sur « Récit », lire `document.activeElement` à 150 ms → `#plan-main-btn` au lieu d'un contrôle du Récit.
- **Solution** : dans `goTo()`, appeler `close({ restoreFocus: false, syncTab: false })`, focaliser同步 un point de retour visible (`#plan-main-btn`, sinon un `[data-view-tab="plan"]` visible) **avant** d'ouvrir la destination (pour que celle-ci enregistre un `lastFocus` valide), et propager `restoreFocus:false` aux `STORY.close()` / `DRAGON.close()` du même `goTo()`.
- **Impact sur l'évidence** : la touche `Entrée` « ouvre vraiment » la destination pour un utilisateur clavier ; conforme à `APP_PLAN.md:185` (« focus déplacé à chaque changement de scène »).
- **Risque** : si une vue cible ne focalise rien, le focus reste sur le bouton Plan (contrôle visible, état acceptable) ; propagation des `close()` tiers limitée à `goTo()`.
- **Effort** : S.
- **Vérification** : ouvrir Plan → `Entrée` sur chaque carte, puis `document.activeElement` à 150 ms ; refaire depuis `storyPlanBtn` et `dragonPlanBtn` ; E2E 14/14.

## M2-02 — `aria-current` détourné comme curseur clavier (P0)

- **Problème (preuve)** : `plan.js:62-71` `setSelected()` écrit `aria-current="true"`/`"false"` sur les 4 cartes à chaque flèche **et** à chaque survol (`plan.js:275-278`). `aria-current` désigne une page courante en navigation ; ici il sert de simple curseur, et entre en collision avec `syncTabs()` (`plan.js:85-96`) qui pose `aria-current="page"` sur les onglets. Un lecteur d'écran annonce « Récit, page courante » alors qu'aucune destination n'est ouverte.
- **Solution** : retirer `aria-current` des cartes ; conserver `is-selected` (visuel) + roving `tabIndex` ; ajouter `aria-keyshortcuts` (`R 1`, `D 2`, `F 3`, `L 4`) et un fragment `.nav-m2-sr` « Étape N sur 4. Touche X. » ; reporter le sélecteur CSS `PLAN_CSS` (`plan.js:29`) de `[aria-current="true"]` vers `.is-selected`.
- **Impact sur l'évidence** : « où suis-je / quelle touche / quelle position » est audible une seule fois, sans faux signal de page courante.
- **Risque** : aucun test E2E ne lit cet attribut ; relecture des annonces NVDA/VoiceOver nécessaire.
- **Effort** : S.
- **Vérification** : inspecteur ARIA (0 `aria-current` sur `.plan-card`), annonce vocale sur `1`, flèche, `Tab`.

## M2-03 — Cibles tactiles inférieures à 44 px (P0)

- **Problème (preuve)** : `styles.css:6753-6760` `.plan-help-btn` = 30×30 px et `styles.css:6977-6987` `.plan-help-close` = 30×30 px. La cible minimale WCAG 2.2 (2.5.8) est 24×24, mais la consigne de la surface est **44×44** ; 30 px est sous la cible recommandée et difficile au pouce sur mobile.
- **Solution** : dans le bloc `#nav-m2`, `#plan-overlay .plan-help-btn, #plan-overlay .plan-help-close { min-width:44px; min-height:44px; touch-action:manipulation }` (la barre fait 54 px, `styles.css:6720` : cela tient sans débordement). `styles.css` reste intact.
- **Impact sur l'évidence** : les sorties « aide » et « fermer » paraissent immédiatement atteignables au doigt.
- **Risque** : sur écran étroit, deux boutons de 44 px + le brand dans une barre de 54 px de haut ; vérifier le chevauchement à 390 px.
- **Effort** : S.
- **Vérification** : `getBoundingClientRect()` des deux boutons à 1440×900 et 390×844 → largeur et hauteur ≥ 44.

## M2-04 — Navigation fléchée codée en dur pour 2 colonnes (P1)

- **Problème (preuve)** : `plan.js:77-83` `moveSelection()` calcule `row = floor(selected/2)`, `col = selected%2`. Or `styles.css:7001-7003` bascule la grille en **1 colonne** sous 760 px. En mobile, `→` déplace sur une carte située visuellement **en dessous**, et `↓` sur une autre : le geste et le déplacement divergent.
- **Solution** : lire `getComputedStyle(els.grid).gridTemplateColumns`, compter les jetons numériques pour obtenir `cols` (fallback 2) ; si `cols === 1`, `→`/`↓` = `+1`, `←`/`↑` = `-1` avec bouclage ; sinon conserver le calcul row/col généralisé (`rows = ceil(4/cols)`).
- **Impact sur l'évidence** : la flèche « correspond » toujours à la carte voisine visuelle, sur mobile comme sur desktop.
- **Risque** : `gridTemplateColumns` peut être renvoyé en pixels fractionnaires ; le comptage par jeton reste stable (fallback 2 si `none`).
- **Effort** : S.
- **Vérification** : à 1440 px puis 390 px, `→` depuis la carte 1 → carte 2 ; `↓` depuis la carte 1 → carte 2 en mobile, carte 3 en desktop.

## M2-05 — Survol qui modifie l'état commandé par `Entrée` (P1)

- **Problème (preuve)** : `plan.js:275-278` `mouseenter → setSelected(index, false)` modifie `is-selected`, `aria-current` **et** `tabIndex` sans déplacer le focus. Le focus visible reste sur la carte A pendant que la carte B est marquée « courante » ; `Entrée` (`plan.js:251-255`) ouvre alors B. C'est un « vol de sélection » même s'il n'y a pas vol de focus.
- **Solution** : le survol ne pose plus qu'une classe cosmétique `is-preview` (avec retrait au `mouseleave`) ; il ne touche ni `state.selected`, ni ARIA, ni `tabIndex`. Ajouter un listener `focus` sur chaque carte qui aligne `state.selected` sur le focus réel (utile au piège `Tab`, qui peut atteindre une carte `tabindex=-1` par programmation).
- **Impact sur l'évidence** : `Entrée` ouvre toujours la carte où le focus est visible ; le survol reste un aperçu purement visuel, comme demandé (`survol sans vol de focus`).
- **Risque** : le survol ne « pré-sélectionne » plus la destination pour un utilisateur souris qui presserait `Entrée` sans cliquer — comportement moins surprenant et cohérent avec le clic (`goTo(card.dataset.view)`).
- **Effort** : S.
- **Vérification** : survoler la carte 3, presser `Entrée` → c'est la carte focalisée qui s'ouvre ; `is-preview` retiré au `mouseleave`.

## M2-06 — État vide silencieux pour « Lecteur » (P1)

- **Problème (preuve)** : `plan.js:160-163` `firstEventId()` retombe sur `COUNTRIES[0]` puis renvoie `null` si le corpus est vide ; `plan.js:185-188` `goTo('lecteur')` ne fait **rien** si `id` est `null` : le Plan se ferme et aucun message n'apparaît. `APP_PLAN.md:179` exige « aucun lieu lié à cette ère », pas un repli silencieux ; `dragon.js:1435` applique déjà un message explicite.
- **Solution** : tester `firstEventId()` **avant** de fermer le Plan ; si `null`, maintenir le Plan ouvert et écrire dans une région `role="status" aria-live="polite"` (`#nav-m2-status`, focalisable `tabindex="-1"`) : « Aucun repère vérifié n'est disponible : le Lecteur est momentanément indisponible. »
- **Impact sur l'évidence** : l'absence de contenu est énoncée, pas masquée ; aucune donnée inventée pour combler le vide.
- **Risque** : doublon sémantique avec `showEmpty()` du Dragon ; message distinct et limité au Lecteur.
- **Effort** : M.
- **Vérification** : forcer `VECTEMPOREL_DATA.countries = []` avant l'init, `Entrée` sur « Lecteur » → message lu et Plan toujours ouvert.

## M2-07 — Deep link `?pays=` invisible dans le Plan (P1)

- **Problème (preuve)** : `plan.js:328-345` `start()` résout `?pays=XX` via `VECTEMPOREL_ATLAS.countries`, appelle `setCountry` et stocke `state.deepLinkCode` ; mais `plan.js:407-410` affiche « Le pays et le repère sélectionnés vous suivent partout » sans jamais nommer le pays. `state.deepLinkCode` n'est relu qu'à la ligne 342 (focus du globe). Règle 3 de `APP_PLAN.md` : un état partagé doit être **visible partout**.
- **Solution** : injecter dans `.plan-hero` un paragraphe `#nav-m2-context` mis à jour à chaque `open()` depuis `VECTEMPOREL_APP.getCountryId()` (`app.js:3499`) résolu par `atlas.find(item => item.appId === id)?.name` (`countries.js` porte bien `appId`, `code`, `name`) ; repli sur `state.deepLinkCode`, puis sur « aucun pays sélectionné ». Zéro donnée inventée.
- **Impact sur l'évidence** : la cohérence globe → Plan est lisible : « Pays actif : France. »
- **Risque** : si l'atlas n'est pas chargé, afficher l'identifiant réel ou « aucun pays sélectionné », jamais un nom deviné.
- **Effort** : M.
- **Vérification** : `/index.html?pays=FR` puis ouvrir le Plan → « Pays actif : France. » ; sans paramètre → « aucun pays sélectionné ».

## M2-08 — Piège de focus et liste tabulable incohérente (P1)

- **Problème (preuve)** : `plan.js:256-269` le piège `Tab` énumère **tous** les `button` de l'overlay, y compris les cartes `tabIndex=-1` que le roving tabindex (`plan.js:68`) déclare justement hors de l'ordre de tabulation. La modale annonce `aria-modal="true"` (`index.html:392`) mais le focus peut sortir par un `focusin` externe sans être rappelé.
- **Solution** : factoriser `focusableIn(root)` = `button:not([disabled]), [tabindex]:not([tabindex="-1"])` filtrés par `offsetParent !== null` et `aria-hidden` absent ; l'utiliser pour les deux pièges (Plan et aide). Ajouter un garde `document.addEventListener('focusin', …)` qui, si `state.open` et `!helpOpen` et cible hors overlay, ramène le focus à la carte sélectionnée.
- **Impact sur l'évidence** : `Tab` ne visite que ce qui est annoncé comme tabulable ; le focus reste dans la modale (« où suis-je »).
- **Risque** : boucle de focus si la cible de rappel est masquée — garde `isConnected` + visibilité et désactivation pendant `goTo()` (`state.open=false`).
- **Effort** : M.
- **Vérification** : 8 × `Tab` puis 8 × `Shift+Tab` sans sortie ; clic sur la barre derrière → focus rappelé ; `goTo()` non bloqué.

## M2-09 — Ordre de lecture et fil narratif inaudible (P2)

- **Problème (preuve)** : `index.html:414-439` affiche « 01 · Raconter » **puis** « Récit », « 02 · Explorer » puis « Dragon » (verbe + nom), alors que `APP_PLAN.md:126-137` donne « 01 · RÉCIT / 02 · DRAGON / … ». Le fil `plan-flow` (`index.html:442-444`) est `aria-hidden="true"` : en lecture séquentielle, on entend quatre cartes sans le parcours.
- **Solution** : ajouter le fragment `.nav-m2-sr` « Étape N sur 4. Touche X. » en tête de chaque carte (sans écraser son texte visible) ; rendre `.plan-flow` audible via JS (`removeAttribute('aria-hidden')`, `role="list"`, `aria-label="Parcours type : du Plan au Dragon"`, `<span>` en `listitem`, `<i>→</i>` laissés `aria-hidden`). `index.html` non modifié.
- **Impact sur l'évidence** : l'ordre 1→4 et le chemin PLAN→…→FICHE sont énoncés, ce qui rend la grille lisible sans la voir.
- **Risque** : les flèches `<i>` lues « flèche droite » si mal masquées — d'où `aria-hidden` maintenu sur elles.
- **Effort** : M.
- **Vérification** : lecture séquentielle (NVDA/VoiceOver) : « Étape 1 sur 4 … », puis « Parcours type … PLAN, PÉRIODE, … » sans « flèche droite ».

## M2-10 — État d'onglet non restauré après fermeture (P2)

- **Problème (preuve)** : `plan.js:130` `open()` appelle `syncTabs('plan')`, mais `plan.js:137-145` `close()` ne restaure jamais l'onglet actif. Après `Échap` depuis un Plan ouvert par `#plan-main-btn`, les onglets `[data-view-tab="plan"]` (`index.html:282` et `483`) restent `is-active` + `aria-current="page"` alors qu'aucune vue Plan n'est affichée.
- **Solution** : mémoriser `state.previousView` dans `open()` avant `syncTabs('plan')` (premier `[data-view-tab][aria-current="page"]`, en excluant `plan`), puis `syncTabs(state.previousView)` dans `close()` ; `goTo()` passe `syncTab:false` car il synchronise déjà sa destination (`syncTabs('recit')`, `'dragon'`, `null`).
- **Impact sur l'évidence** : l'onglet surligné correspond toujours à la vue réelle, y compris après un retour.
- **Risque** : écraser un `aria-current` posé par `story.js`/`dragon.js` — mitigé car `syncTabs()` ne touche que `[data-view-tab]` et `goTo()` synchronise après `close()`.
- **Effort** : M.
- **Vérification** : open → `Échap`, lire les `[data-view-tab]` : aucun ne porte `aria-current="page"` si aucune vue n'est active ; open → carte → l'onglet attendu est actif.
