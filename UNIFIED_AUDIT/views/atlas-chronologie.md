# ATLAS-CHRONO — Chronologie (V-ATLAS) : architecture de l'information & indexation sémantique

Périmètre : `src/views/chronology.js` (fichier possédé). Lectures : `src/domain/store.js`,
`src/data/dataset.js`, `README.md`, `src/ui/shell.js`, `src/platform/keyboard.js`, `styles.css`,
`tests/e2e.mjs`. Aucun fichier interdit modifié, aucune donnée inventée, aucun lien externe ajouté.

Constat structurant : le champ `related` est **vide pour les 229 repères** du jeu généré. Aucune
relation sémantique explicite (« influence », « contemporary », « breaks_with ») ne peut donc être
émise sans inventer des données (chantier 09). Les seules relations réellement disponibles sont
`eraId`, `tags`, `importance`, `year`, `points[].kind`, `points[].confidence` et `points[].sources`.

---

## ATLAS-CHRONO-01 — Hiérarchie de titres absente dans la vue

**Problème (preuve).** `chronology.js:22` crée le titre dans un `<div class="view-title">` : la vue
ne contient aucun `h1`, alors que `chronology.js:60` produit un `h2` (`aside-title`) sans parent de
niveau supérieur. `recit.js:33` utilise correctement un `h1`. Un indexeur ou un lecteur d'écran ne
peut pas reconstruire l'arbre ère → repère → points ; les titres ne sont pas des ancres.

**Solution concrète.** `<h1 id="atlas-chrono-title">Chronologie</h1>` ; `<h2 id="atlas-chrono-event-title">`
pour le repère courant ; `<h3 id="atlas-chrono-points-title">` pour le groupe de points. Relay par
`aria-labelledby` sur `<section class="chronology-main">` et `<aside id="atlas-chrono-aside">`. Ids uniques
dérivés de `era.id` / `event.id`, jamais de `point.id` (qui se répète entre repères, ex.
`france-actor-1-point` dans `fr-massalia`, `fr-alesia`, `fr-lugdunum`).

**Impact.** Navigation par titres (AT), extraction sémantique, cohérence avec la vue Récit.

**Risque.** Doublon de `h1` si deux vues co-existaient : la coque n'en rend qu'une
(`shell.js:142-148`), risque nul en l'état.

**Effort.** S.

**Vérification.** En vue chronologie : `document.querySelectorAll('#app h1').length === 1` et
`document.querySelector('#atlas-chrono-event-title')` non nul.

## ATLAS-CHRONO-02 — Bandes d'ères : période reléguée dans `title`, actif par la seule couleur

**Problème (preuve).** `chronology.js:29` place `formatYear(era.start) → formatYear(era.end)`
uniquement dans l'attribut `title` (infobulle non indexable). `chronology.js:27` marque l'ère active
par la seule classe `is-active`, dont la matérialisation est purement visuelle (`styles.css:144` :
`border-color` + `box-shadow`). Aucun `aria-current`, aucun `id`, aucun contenu textuel de période.

**Solution concrète.** `<nav aria-label="Ères de …">` contenant une `<ol>` de `<li>` ; plage écrite
en texte visible `<span class="atlas-chrono-era-range">` ; `aria-current="true"` sur l'ère courante ;
`id="era-<id>"`, `data-era-id`, `data-start`, `data-end`, `aria-controls="atlas-chrono-events"`.

**Impact.** Période lisible, indexable et annoncée ; état actif non porté par la couleur seule.

**Risque.** `<ol>` réinitialise le comptage visuel : neutralisé par `list-style:none` dans le bloc
CSS injecté.

**Effort.** M.

**Vérification.** Un seul `.era-band[aria-current="true"]` et son `textContent` contient l'année
de début de l'ère (`-600` → `600 av. J.-C.`).

## ATLAS-CHRONO-03 — Liste de repères non sémantique et non adressable

**Problème (preuve).** `chronology.js:37` crée `<div class="event-list">` rempli de `<button>`
(`chronology.js:40`) : ni `<ol>/<li>`, ni `aria-current`, ni `id`, ni `data-*`. Les 229 repères et
901 points ne sont donc pas adressables individuellement ; aucun lien profond n'est possible.

**Solution concrète.** `<ol id="atlas-chrono-events" aria-label="Repères de l'ère …">` avec un
`<li id="event-<event.id>">` par repère ; le bouton garde la classe `.event-card` (contrat E2E)
et reçoit `id="event-btn-<id>"`, `data-event-id`, `aria-controls="atlas-chrono-aside"` et
`aria-current="true"` si sélectionné. Le `<li>` porte `data-year`, `data-era-id`, `data-tags`,
`data-importance`.

**Impact.** Graphe de connaissances plus riche, navigation `Tab` structurée, ancrages stables.

**Risque.** `styles.css:145` applique une grille à `.event-list` : les `<li>` reçoivent `display:flex`
dans le bloc injecté pour conserver la mise en page.

**Effort.** M.

**Vérification.** `(await page.$$('.event-card')).length > 0` (test existant `tests/e2e.mjs:29`)
et `document.querySelectorAll('#atlas-chrono-events > li').length === nombre de repères de l'ère`.

## ATLAS-CHRONO-04 — Focus perdu à chaque changement d'état, raccourcis non documentés

**Problème (preuve).** `shell.js:137` fait `root.innerHTML = ''` à chaque `emit()` (`store.js:23-25`),
donc le bouton focalisé est détruit. Après `←`/`→` (`keyboard.js:45-58`) ou un clic sur une carte
(`chronology.js:52`), le focus retombe sur `<body>` : navigation clavier inutilisable en pratique.
Par ailleurs `keyboard.js:45` mappe `→` **et** `↓` vers le repère suivant mais `keyboard.js:56` mappe
seulement `↑` vers l'ère précédente, en désaccord avec `README.md:67` (« ↑ ↓ période ») ; cette
asymétrie appartient à la coque, non modifiable ici.

**Solution concrète.** Variable de module `focusIntent` positionnée dans chaque handler avant
`selectEra`/`selectEvent`/`set`, puis restaurée en fin de rendu via `document.getElementById(...).focus()`.
Cibles : carte active, bande d'ère, champ de recherche, bouton de thème. Ajout d'une ligne d'indication
visible et **fidèle au code** : « → repère suivant · ↑ ère précédente · Entrée détail · ? aide ».
Aucun écouteur `keydown` ajouté (contrat `verify.mjs:27` : routeur unique).

**Impact.** Parcours clavier complet et prévisible ; cohérence avec le routeur sans le modifier.

**Risque.** `focus()` sur un champ de recherche peut replacer le caret en fin de texte : acceptable,
le re-render est complet de toute façon.

**Effort.** M.

**Vérification.** Après clic sur une carte, `document.activeElement.id === 'event-btn-<id>'` ;
`verify.mjs:27` toujours vert.

## ATLAS-CHRONO-05 — Provenance des points illisible et troncature silencieuse

**Problème (preuve).** `chronology.js:77` affiche `sources : SRC-001, SRC-015` : identifiants bruts,
sans titre, alors que `country.sources` contient 20 références titrées pour la France. `chronology.js:71`
applique `slice(0, 8)` sans signalement. Le jeu comptant au plus 8 points par repère, la troncature
est aujourd'hui latente (vérifié sur les 229 repères), mais le risque reste réel.

**Solution concrète.** Supprimer le `slice`, rendre `<ul class="point-sources">` avec un `<li
data-source-id="SRC-…">` par source et résoudre l'id vers `country.sources[].title` (texte seul,
**aucun `href`** : `README.md:5` et `verify.mjs:26` interdisent les liens externes). Intitulé du
groupe : `Points du repère (N)`, sans présupposé de vérification (les certitudes incluent
`disputed` et `probable`).

**Impact.** Lisibilité des 901 points, traçabilité, aucune invention de citation.

**Risque.** Un id de source absent du registre est affiché tel quel — comportement de repli explicite.

**Effort.** M.

**Vérification.** Aucun `href^="http"` dans le DOM ; les `SRC-…` du repère « Code noir » affichent
le titre `Le Code noir ou le calvaire de Canaan` pour `SRC-002`.

## ATLAS-CHRONO-06 — Aucune recherche sur 229 repères / 901 points

**Problème (preuve).** La vue n'offre aucun filtre : `chronology.js:36` ne filtre que par `eraId`,
et les 901 points ne sont atteignables qu'en parcourant les 229 cartes une par une. Aucun champ
de recherche n'existe dans `shell.js`, `keyboard.js` ou `chronology.js`.

**Solution concrète.** `<input type="search" id="atlas-chrono-search">` local au module (volontairement
hors du store partagé pour ne pas affecter les autres vues), filtrant `title`, `subtitle`, `summary`,
`formatYear(year)`, `tags` et `text` des points. Sans filtre, la vue reste ère par ère ; dès qu'un
terme ou un thème est actif, la recherche porte sur les **229 repères du pays** (les 901 points
sont ainsi atteignables) et chaque carte porte le nom de son ère, issu du jeu de données.
Boutons de thèmes avec `aria-pressed` (bascules
indépendantes, `shell.js:49` utilise le même motif). Compteur `N / M repères`, état vide explicite
et bouton « Réinitialiser le filtre ». Le routeur clavier ignore les touches dans un `INPUT`
(`keyboard.js:6-10,17`), donc la saisie ne déplace pas la sélection.

**Impact.** Accès direct au contenu des 901 points ; aucune dépendance, aucune requête réseau.

**Risque.** Re-render complet à chaque frappe : 229 cartes maximum, coût acceptable ; l'état local
est restauré après chaque re-render de la coque.

**Effort.** L.

**Vérification.** Saisir « esclavage » dans le champ ramène les repères dont un point contient le
mot ; vider le champ restaure la liste complète de l'ère.

## ATLAS-CHRONO-07 — États vides non traités

**Problème (preuve).** `chronology.js:17` sort silencieusement si aucun pays (la coque gère ce cas en
`shell.js:143-145`). Mais si l'ère n'a aucun repère, `chronology.js:37-55` produit une `<div>` vide ;
si `country.events[state.eventIndex]` est absent (`chronology.js:57-58`), l'`<aside>` reste entièrement
vide ; un `points` vide donne un conteneur vide (`chronology.js:70-80`).

**Solution concrète.** Messages dédiés, visibles et annoncés (`role="status"`, `aria-live="polite"`)
dans la liste, dans l'aside et dans le groupe de points. Différencier « aucun repère documenté pour
cette ère » de « aucun repère ne correspond au filtre ».

**Impact.** Robustesse, compréhension, accessibilité.

**Risque.** Ajout de texte générique (aucune date ni fait inventé).

**Effort.** S.

**Vérification.** Forcer `eraIndex` sur une ère sans repère : un message s'affiche et l'aside n'est
pas vide.

## ATLAS-CHRONO-08 — Compteurs ambigus et franchissement d'ère non signalé

**Problème (preuve).** `chronology.js:59` affiche `Repère i / country.events.length` (rang **global**,
ex. 10/57) alors que `chronology.js:36` n'affiche que les repères de l'ère (ex. 6 cartes) : deux
échelles sans étiquette. Les boutons `chronology.js:85-86` appellent `selectEvent(±1)`, qui modifie
`eraIndex` dans `store.js:67-68` : franchir la dernière carte d'une ère change d'ère sans annonce,
et la carte active peut ne plus être dans la liste affichée.

**Solution concrète.** Afficher explicitement les deux échelles : `Ère k / N` + `repère j / m dans
cette ère` et `Repère global i / total`. Boutons précédent/suivant désactivés aux bornes et ciblés
vers la nouvelle carte active (focus restauré). Bande d'ère mise à jour par le store, sans état
dupliqué. Statut `aria-live` annonçant ère, nombre affiché et repère courant.

**Impact.** Cohérence avec l'état partagé, orientation de l'utilisateur.

**Risque.** Aucun : `selectEvent` reste la seule source de vérité.

**Effort.** M.

**Vérification.** Sur `france`, passer de `fr-jeanne` (fin de `france-era-2`) à `fr-marignan` :
l'ère active et le compteur changent ensemble dans le même rendu.

## ATLAS-CHRONO-09 — Graphe de connaissances : relations absentes, attributs exploitables

**Problème (preuve).** Aucun `data-*` sémantique dans `chronology.js`. Le champ `related` est vide
pour **tous** les repères (contrôle sur `dataset.js`) : toute relation « influence » ou
« contemporain » écrite dans le DOM serait inventée. Les seules données relationnelles réelles
sont `eraId`, `tags`, `year`, `importance`, `kind`, `confidence`, `sources`.

**Solution concrète.** Exposer ces champs en `data-*` (`data-era-id`, `data-event-id`, `data-year`,
`data-tags`, `data-importance`, `data-kind`, `data-confidence`, `data-source-id`) pour un indexeur
externe. Regrouper les repères par **tag partagé** via les boutons de filtre du chantier 06, avec un
libellé factuel (« Thèmes : … ») et non une relation interpretative. Aucune relation absente du
jeu de données n'est créée.

**Impact.** Lisibilité machine, requêtes `querySelectorAll('[data-tag~="guerre"]')`, extension future
du schéma sans invention.

**Risque.** Sur-interprétation d'un tag comme relation causale : évitée par le libellé « Thèmes ».

**Effort.** M.

**Vérification.** `document.querySelectorAll('[data-importance="3"]').length > 0` ; aucun attribut
`data-influence` / `data-breaks-with` n'est produit.

## ATLAS-CHRONO-10 — Styles dépendants d'un fichier non possédé, adaptation mobile absente

**Problème (preuve).** `chronology.js` n'injecte aucun style : toute la présentation vient de
`styles.css:133-177`, fichier partagé. Les règles `@media (max-width:1000px)` et `620px`
(`styles.css:252-270`) empilent les panneaux mais ne gèrent ni les nouveaux contrôles, ni
`scroll-margin` des ancres, ni l'état de focus des boutons de thème.

**Solution concrète.** Injecter un unique bloc `<style id="atlas-chronologie-css">` depuis le module
(ancre unique, inséré dans un `stage` reconstruit à chaque rendu). Il porte : `h1` et titres,
`ol/li` sans puces, plage d'ère, `aria-current` / `aria-pressed`, champ de recherche, statut visible,
sources, états vides, `scroll-margin-block:60px`, grille 2 colonnes des ères sous 620 px et
`prefers-reduced-motion`. Aucune règle de `styles.css` supprimée ni surchargée en dehors du besoin.

**Impact.** Mobile lisible, styles de la vue autocontenus, zéro conflit d'édition.

**Risque.** Bloquage si le bloc était injecté dans `<head>` à chaque rendu (doublons) : il est
donc injecté dans `stage`, détruit et recréé avec lui, avec garde par id.

**Effort.** M.

**Vérification.** `document.querySelectorAll('#atlas-chronologie-css').length === 1` ; à 390 px,
`.atlas-chrono-era-list li` occupe ≈ la moitié de la largeur et le champ de recherche occupe 100 %.

---

## Statut d'implémentation

Les 10 chantiers sont implémentés dans `src/views/chronology.js` (un seul fichier modifié).
Les chantiers 02, 03 et 10 ajoutent des styles via le bloc `<style id="atlas-chronologie-css">` injecté
par le module ; aucun style de `styles.css` n'a été touché. Le chantier 04 documente l'asymétrie
`↑`/`↓` de `keyboard.js` sans modifier ce fichier appartenant à la vue `atlas-coque-navigation`.

### Vérifications exécutées

- `node --check src/views/chronology.js` : **OK**.
- `npm run verify` : **tous les contrôles passent** (10 pays, 229 repères, ≥900 points, ids uniques,
  images présentes, aucun lien externe, routeur clavier unique).
- `npm run test:e2e` : **bloqué avant tout test** par un `TimeoutError: Navigation timeout of 30000 ms`
  sur `page.goto(..., { waitUntil: 'networkidle0' })` (`tests/e2e.mjs:20`). Blocage **préexistant** :
  reproduit à l'identique après restauration temporaire du `chronology.js` d'origine. Toutes les
  requêtes aboutissent pourtant (17/17) et la console ne contient aucune erreur.
- Harnais de substitution (même parcours E2E, `waitUntil: 'domcontentloaded'` + attentes explicites,
  sans modifier `tests/e2e.mjs`) : **14/14 assertions E2E d'origine + 14/14 contrôles des chantiers
  passent**, dont l'unicité des ancres (0 doublon), le bloc de style unique, `aria-current`, le
  texte de plage des ères, les sources titrées, la recherche sur le contenu des points (7 repères
  trouvés pour « esclavage »), le focus restauré sur le champ et sur la carte, et la mise en page
  à 390 px. Aucune erreur console.
