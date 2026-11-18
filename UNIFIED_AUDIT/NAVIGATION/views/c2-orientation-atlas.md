# C2 — Repères de situation dans les vues de l'Atlas

Surface **micro** `c2-orientation-atlas`. Fichiers possédés : `src/views/chronology.js`, `src/views/globe.js`.
Pièces lues pour le diagnostic : `src/ui/shell.js`, `src/domain/store.js`, `README.md`, `src/app.js`, `src/platform/keyboard.js`, `tests/e2e.mjs`, `scripts/verify.mjs`, `src/data/dataset.js`, `styles.css`.

Aucune donnée historique n'est inventée : tous les libellés proposés sont dérivés de `DATASET.meta`, de `state`, de `currentCountry()/currentEra()/currentEvent()` et des libellés déjà présents dans la coque (`VIEW_TAXONOMY` / `pathParts()`, `shell.js:128-137`).

> **Contexte concurrent.** `shell.js`, `store.js`, `keyboard.js`, `recit.js` et `geography.js` ont été modifiés en parallèle par d'autres surfaces pendant cet audit. Les numéros de ligne ci-dessous ont été revérifiés en fin d'implémentation ; en cas de nouveau décalage, se repérer aux symboles (`renderTrail`, `pathParts`, `situationText`, `backTarget`, `ensureLive`, `root.innerHTML`) plutôt qu'au chiffre seul.

## Ce que la coque fournit déjà (et que les vues doivent respecter)

- `shell.js:338-374` : barre d'onglets issue de `VIEW_TAXONOMY`, `aria-current="page"` sur l'onglet actif (`shell.js:355`) ; un bouton « Retour » de barre existe désormais (`shell.js:361-374`, `backTarget()` en `149-153`).
- `shell.js:128-137, 404-433` : fil global `Monde › pays › ère › repère › libellé de vue` + rang `X / N · année`, alimenté par `pathParts()` ; **aucun niveau « point »**. Les crumbs non terminaux se rabattent sur deux destinations seulement (`shell.js:422` : vue racine ou `VIEW_TAXONOMY[1]`).
- `shell.js:118-124, 163-172` : région live globale persistante hors `#app` ; `announcement()` dit désormais « Vous êtes ici : … » et le rang du repère, mais ne nomme l'ère qu'à travers le fil et les points que dans la vue Récit (`shell.js:166-169`).
- `shell.js:512-519` : `<main id="atlas-stage">` reconstruit à chaque rendu (`root.innerHTML = ''` en `512`) ; tout contenu de vue est donc recréé, ce qui impose des régions live persistantes hors scène.

---

## C2-01 — Vue Monde : aucun titre `h1`, libellé figé « Dix »

- **Problème / preuve.** `globe.js:247` crée un `<h2>Dix pays documentés</h2>` ; la coque ne fournit aucun `h1` (`shell.js:516` crée seulement le `<main>`). La hiérarchie démarre donc en `h2`. Le chiffre « Dix » est écrit en dur alors que `DATASET.meta.countries = 10` (`dataset.js:7-12` et `verify.mjs:16`).
- **Solution.** Remplacer le `h2` par un `h1#nav-c2b-title` unique : `Monde · ${DATASET.countries.length} pays documentés`. Style porté par le bloc `#nav-c2b` (`.globe-list h2` ne s'applique plus).
- **Impact sur l'évidence.** Le titre nomme la vue et sa portée réelle ; il reste vrai si le jeu de données change.
- **Risque.** régression visuelle mineure (ancien sélecteur CSS) → compensée dans `#nav-c2b`.
- **Effort.** S.
- **Vérification.** En vue Monde : un seul `h1`, `textContent` contient `10 pays documentés` ; `npm run check` vert.

## C2-02 — Vue Chronologie : titre courant non situé

- **Problème / preuve.** `chronology.js:116` : `el('h1', …, 'Chronologie')`, texte constant quel que soit le pays, l'ère ou le repère. Le contexte n'existe que dans le fil de la coque (`shell.js:128-137, 404-433`) et dans l'aside (`chronology.js:294-300`).
- **Solution.** Conserver l'ancre `atlas-chrono-title` (déjà référencée par `aria-labelledby` en `chronology.js:110`) mais qualifier le texte : `Chronologie · ${country.name}` ; ajouter un kicker « Vous êtes ici » avant le fil local.
- **Impact sur l'évidence.** Titre unique **et** situé, cohérent avec l'onglet `Chronologie` de `shell.js:338-355`.
- **Risque.** aucun test ne cible le texte du `h1` ; l'id reste stable.
- **Effort.** S.
- **Vérification.** Après clic sur un pays, `document.querySelector('h1').textContent` contient `Chronologie ·` et le nom du pays.

## C2-03 — Fil de situation incomplet : le niveau « point » manque

- **Problème / preuve.** `shell.js:128-137` et `404-433` produisent le chemin Monde › pays › ère › repère › vue ; aucun crumb ne represente les points. `shell.js:422` : tous les crumbs non terminaux appellent la même paire de destinations (racine ou `VIEW_TAXONOMY[1]`), donc « revenir au pays » et « revenir à l'ère » restent indifférenciés.
- **Solution.** Fil local adressable dans chaque vue possédée : `nav#nav-c2a-trail` (Monde › pays › ère › repère › `Points du repère (N)`) et `nav#nav-c2b-trail` (Monde › pays sélectionné le cas échéant). Crumbs en **texte réel** (pas de boutons fantômes), `aria-current="location"` sur l'entité courante. **Blocage documenté** : ajouter le crumb « point » au fil global exige `shell.js:128-137/404-433`, fichier interdit ; la portion possible est livrée ici.
- **Impact sur l'évidence.** Chemin `pays → ère → repère → point` visible en permanence dans la scène, sans dépendre du fil de la coque.
- **Risque.** Doublon visuel avec `.shell-trail` → style discret, `aria-label` distinct (« Situation — … »), aucun `aria-hidden` sur le texte utile.
- **Effort.** M.
- **Vérification.** Le fil local contient les cinq niveaux en Chronologie ; exactement un `[aria-current="location"]` par vue.

## C2-04 — Progression ère / repère / point : le dernier échelon n'est pas numéroté

- **Problème / preuve.** `chronology.js:154-155` donne ère et rang global mais aucun rang de point ; `chronology.js:331` n'affiche qu'un total « Points du repère (N) » ; `chronology.js:342` pose `id="point-…"` mais aucun texte visible `Point k / N`.
- **Solution.** Ajouter un `<span class="nav-c2-point-rank">Point k / N</span>` en tête de chaque `<li class="point">`, plus une ligne `#nav-c2a-progress` consolidant ère, rang dans l'ère, rang global et nombre de points, calculée depuis l'état et le dataset.
- **Impact sur l'évidence.** Progression complète lisible dans le DOM, même si la région live ou le WebGL échouent.
- **Risque.** Densité visuelle dans l'aside → taille 8 px, aucun changement de grille.
- **Effort.** M.
- **Vérification.** `.nav-c2-point-rank` est présent une fois par point ; sa somme égale `currentEvent().points.length`.

## C2-05 — Progression non autonome dans la vue Monde (texte JS / WebGL seulement)

- **Problème / preuve.** `globe.js:124-130` : le rang « pays X sur 10 » n'existe que dans un `aria-label` écrit dynamiquement par `highlight()` et dans `say()` ; `globe.js:252` n'affiche que « Survol : aucun pays » ; `globe.js:31-51` le host est un dégradé WebGL. Aucun texte statique de progression n'est présent dans la liste au chargement.
- **Solution.** Liste des pays en `<ol>` avec numéro visible `01 … 10` dans chaque bouton (le sélecteur E2E `.globe-list button` reste à 10) ; ligne `#nav-c2b-progress` dérivée de `DATASET.meta` : `10 pays · 229 repères · 901 points`, complétée par la sélection courante si `state.countryId` est renseigné.
- **Impact sur l'évidence.** Progression lisible sans couleur, sans survol, sans moteur 3D et sans annonce vocale.
- **Risque.** **Blocage partiel** : un `<noscript>` fiable exigerait `index.html` (`README.md:30`, fichier interdit) — l'application entière est générée par JS (`app.js:7`). Seule la portion « texte réel indépendant du WebGL / des live regions » est implémentée.
- **Effort.** M.
- **Vérification.** `#nav-c2b-progress` contient les trois compteurs de `DATASET.meta` ; `10` boutons pays toujours présents dans `.globe-list`.

## C2-06 — Annonces live triplées et description de globe instable

- **Problème / preuve.** Trois régions `role="status"` coexistent : `shell.js:118-124` (globale), `globe.js:233-238` avant intervention (`#globe-live`), `globe.js:240-244` (`#globe-status`). `globe.js:78` réémet le message d'erreur dans `#globe-live`. Surtout, `globe.js:196` avant intervention pointe `aria-describedby="globe-live"` vers cette région : le texte transitoire lu en dernier (ex. « Zoom arrière. » à `globe.js:185`) devient la **description permanente** du globe focalisé. Côté chronologie, `chronology.js:145-148` ajoutait un quatrième `role=status` pour un contenu déjà reconstruit à chaque rendu.
- **Solution.** Une région live locale persistante par vue, créée **hors de `#app`** (donc survivant à `shell.js:512`) : `#globe-live` conservée pour survol/zoom/pause ; `#nav-c2a-live` pour les filtres et changements d'ère (informations absentes de `shell.js:163-172`). `#globe-status` et `#atlas-chrono-status` deviennent du texte visuel sans `role=status`. `aria-describedby` du host pointe vers un texte stable `#globe-help`.
- **Impact sur l'évidence.** Annonce prévisible, non dupliquée ; description du globe stable et vérifiable.
- **Risque.** Retrait perçu comme une régression d'accessibilité → compensé par les deux régions persistantes dédiées ; le fil global de la coque reste inchangé (blocage `shell.js` documenté).
- **Effort.** M.
- **Vérification.** `#globe-canvas` a `aria-describedby="globe-help"` ; `#globe-status` et `#atlas-chrono-status` n'ont plus `role="status"` ; une saisie dans la recherche met `#nav-c2a-live` à jour.

## C2-07 — `aria-current` non typé et conventions divergentes

- **Problème / preuve.** `shell.js:355,418` utilisent `page` ; `chronology.js:171,266` et `globe.js:301` utilisent `true` ; `recit.js:247` (avant refonte par une autre surface) utilisait `step`. Les sélecteurs CSS dépendent de la valeur littérale `true` (`chronology.js:39,56`, `globe.js:35`). Aucun fil local n'expose d'état courant.
- **Solution.** Convention documentée dans les deux modules : `page` = coque (inchangé), `true` = contrôle de sélection existant (inchangé, CSS préservé), `location` = feuille du fil local. Un seul `aria-current="location"` par vue.
- **Impact sur l'évidence.** Le lecteur d'écran distingue « onglet actif », « choix courant » et « vous êtes ici ».
- **Risque.** faible : aucun sélecteur existant n'est modifié.
- **Effort.** S.
- **Vérification.** `document.querySelectorAll('[aria-current="location"]').length === 1` dans chaque vue possédée.

## C2-08 — Retour explicite absent de la scène

- **Problème / preuve.** Avant intervention, `chronology.js:373-392` ne proposait que « Repère précédent / suivant » : aucun bouton ne ramène à Monde **depuis le contenu**. Le bouton « Retour » ajouté entre-temps par la coque vit dans la barre (`shell.js:361-374`), hors de `#atlas-stage` ; le fil reste à deux destinations (`shell.js:422`). Échap (`keyboard.js:39-43`) fonctionne mais n'est pas nommé dans la scène.
- **Solution.** Bouton `#nav-c2a-back` « ← Retour au monde » (`goView('globe')`, `aria-keyshortcuts="Escape"`) placé dans le bloc d'orientation ; en vue Monde, texte stable `#globe-help` rappelant qu'Échap ramène ici.
- **Impact sur l'évidence.** Le chemin du retour est nommé dans la vue, pas seulement dans la barre (`shell.js:361-374`).
- **Risque.** double action avec Échap → effet idempotent (`goView('globe')`).
- **Effort.** S.
- **Vérification.** Clic sur `#nav-c2a-back` → `window.VATLAS.getState().view === 'globe'`.

## C2-09 — États vides non nommés / non adressables

- **Problème / preuve.** `globe.js:135` : `if (!countries.length) return;` silencieux. `globe.js:240` : statut « Chargement du globe local… » purement technique. `shell.js:144` a depuis amélioré le sien (`… · aucun pays sélectionné`), mais ce libellé reste hors scène. `chronology.js:233-249,337-338,393-397` avant intervention nommait correctement ses vides mais sans identifiant adressable.
- **Solution.** `#nav-c2b-here` : « Vous êtes ici : Monde · aucun pays sélectionné — choisissez un pays dans la liste ou sur le globe. » dès que `state.countryId` est nul, sinon le nom du pays. Ids `nav-c2a-empty-filter`, `nav-c2a-empty-era`, `nav-c2a-empty-points`, `nav-c2a-empty-event` sur les états vides existants ; crumbs « Ère non sélectionnée / Repère non sélectionné / Points du repère (0) » quand les données manquent.
- **Impact sur l'évidence.** Aucun repère ne se résume à un tiret : chaque vide dit ce qui manque et quoi faire.
- **Risque.** faible : textes d'interface uniquement, aucune donnée nouvelle.
- **Effort.** S/M.
- **Vérification.** Sur globe sans sélection, `#nav-c2b-here` contient « aucun pays sélectionné ».

## C2-10 — Région d'aside doublement étiquetée

- **Problème / preuve.** `chronology.js:113` pose `aria-label="Fiche du repère"` sur l'aside ; `chronology.js:293` ajoute ensuite `aria-labelledby="atlas-chrono-event-title"` **sans retirer l'aria-label**. Les deux mécanismes coexistent (ARIA donne priorité à `aria-labelledby`, mais l'intention devient ambiguë pour les outils d'audit). Le host du globe a le même type de dépendance avec `#globe-live` (voir C2-06).
- **Solution.** Retirer `aria-label` dès que `aria-labelledby` est posé ; conserver `aria-label="Fiche du repère"` uniquement dans le cas vide. Vérifier en même temps l'unicité des ids introduits (`nav-c2a-*`, `nav-c2b-*`, `globe-help`) face à `shell.js`, `recit.js`, `geography.js`.
- **Impact sur l'évidence.** Un seul nom accessible par région, traçable jusqu'à un id présent dans le DOM.
- **Risque.** nul pour les E2E (aucun sélecteur ne cible l'aria-label de l'aside).
- **Effort.** S.
- **Vérification.** Quand un repère est sélectionné, l'aside n'a pas d'`aria-label` et `document.getElementById('atlas-chrono-event-title')` existe.

---

## Synthèse des blocages (fichiers interdits)

1. **Fil global** (`shell.js:128-137, 404-433`) : le niveau « point » et la granularité des crumbs ne peuvent pas être corrigés ici → fil local livré en C2-03.
2. **Région live globale / `VIEW_TAXONOMY` / annonce navigation** (`shell.js:118-124, 163-172`) : déduplication totale impossible → régions locales persistantes et convention documentée en C2-06/C2-07.
3. **`<noscript>` / rendu sans JS** (`index.html:12`, `README.md:30`) : impossible sans éditer `index.html` → texte réel indépendant du WebGL livré en C2-04/C2-05.
4. **`styles.css`** : intact ; tout style passe par `#nav-c2a` et `#nav-c2b`, conformément aux règles de non-collision.

## État de vérification (fin d'implémentation)

- `node --check` : OK sur `chronology.js` et `globe.js`.
- `npm run check` : **15 contrôles E2E d'origine au vert** (accueil, 10 pays, pays → chronologie, repères, flèche, détail, Échap, vues 3/4/5/1, marqueurs, orbites figées, aucune erreur console). Contrôle DOM complémentaire : un seul `h1` par vue, fil à 5 crumbs, `aria-current="location"` unique, 4 rangs de points, `#globe-canvas[aria-describedby="globe-help"]`, régions live persistantes dans `<body>`, annonce de filtrage conforme au résultat affiché.
- Un **16e contrôle `6 = points`** a été ajouté en parallèle par une autre surface et échoue indépendamment de C2 : `keyboard.js:23` n'accepte une taxonomie publiée que si `published.length === FALLBACK_VIEWS.length` (5 vues de repli), donc ignore une taxonomie à 6 vues. Fichier interdit pour C2 → non corrigé ici.
- Le `waitUntil: 'networkidle0'` de `tests/e2e.mjs:20` a connu des timeouts intermittents pendant que plusieurs navigateurs headless d'autres surfaces tournaient en parallèle ; rejoué sur un serveur local isolé, les 15 contrôles d'origine passent de façon reproductible.
