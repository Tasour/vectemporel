# ATLAS-GEO — Géographie / carte schématique locale (V-ATLAS)

> Vue `atlas-geographie` · fichier possédé : `v2/src/views/geography.js`
> Expert : indexeur-semantique · 10 chantiers, par priorité · rapport de diagnostic + état d'implémentation.
> Aucune coordonnée, date ou lieu n'est inventé : seules les valeurs de `src/data/dataset.js` sont utilisées.

## ATLAS-GEO-01 — État vide explicite sur la carte

- **Problème :** `geography.js:20-22` `if (!country) return;` ne rend aucun contenu ; `geography.js:68-70` le message « Aucun lieu localisé pour ce périmètre » n'existe que dans le panneau, alors que le SVG reste affiché avec son seul contour. Aucun `role="status"`. Cas réel : ère 2 de France, repère `fr-clovis`, `places: []`.
- **Solution :** superposer un `<div class="geo-empty" role="status">` dès que `places.length === 0` ou qu'aucun pays n'est sélectionné ; conserver le contour et la note factuelle.
- **Impact :** l'utilisateur comprend immédiatement pourquoi la carte est vide ; état annoncé aux lecteurs d'écran.
- **Risque :** faible — ne touche que le cas dégénéré.
- **Effort :** S
- **Vérification :** aller sur Géographie après sélection de l'ère 2 de France → message visible, `.geo-empty` présent, aucune erreur console.

## ATLAS-GEO-02 — Projection schématique robuste

- **Problème :** `geography.js:11-17` divise par `bounds.maxLon - bounds.minLon` sans garde (étendue nulle → `Infinity`/`NaN`) ; `store.js:105` ne filtre que `lat === null || lon === null`, donc un `undefined` ou `NaN` traverserait le filtre et produirait `cx="NaN"`. Cas réel filtré : `spain-place-7 Valence` (`lat:null, lon:null`).
- **Solution :** `project()` renvoie `null` si les coordonnées ne sont pas finies ou si l'étendue est ≤ 0 ; les appelants ignorent le résultat. Aucun repli fictif.
- **Impact :** SVG toujours valide ; robustesse aux données partielles.
- **Risque :** moyen — la signature interne de `project()` change (valeur ou `null`).
- **Effort :** S
- **Vérification :** `node --check` ; parcourir les 10 pays → aucun attribut `NaN` dans le DOM ; Valence reste exclue.

## ATLAS-GEO-03 — Lieux hors du cadre, sans coordonnées inventées

- **Problème :** `geography.js:40-54` projette *tous* les lieux, y compris hors `bounds`. Exemple vérifié : `france-place-6 Fort-de-France` (14.61347, -61.064431) donne `cx≈-4003`, `cy≈2620` pour le contour de la France métropolitaine : marqueur invisible mais compté. **9 lieux hors cadre** recensés dans 6 pays (France, UK, Inde, Japon, Égypte, etc.).
- **Solution :** tester `inFrame(point, bounds)` ; les lieux hors cadre ne reçoivent aucun marqueur mais sont listés dans un bloc « Hors du cadre affiché » cliquable qui sélectionne le lieu ; leurs coordonnées réelles restent affichées telles quelles dans le panneau.
- **Impact :** cartographie honnête : aucun déplacement fictif, mais aucun lieu perdu.
- **Risque :** moyen — le nombre de marqueurs change en périmètre « pays ».
- **Effort :** M
- **Vérification :** France, périmètre pays, repère `fr-prop-001` (Code noir) → Fort-de-France dans la liste, aucun `circle` hors `viewBox`.

## ATLAS-GEO-04 — Chemin chronologique

- **Problème :** `geography.js:39-54` n'affiche que les lieux du repère courant (`currentPlaces()`), sans lien spatial avec les autres repères de l'ère, pourtant déjà portés par l'état partagé (`store.js:48-60`).
- **Solution :** construire, depuis `currentCountry().events` filtrés par `era.id` et triés par `year` réel, une polyline reliant les lieux dans le cadre ; nœuds non interactifs `.geo-path-node`, étiquette « première année → dernière année » calculée depuis les données. Désactivé en périmètre « pays » pour éviter la surcharge.
- **Impact :** la carte devient un index spatial de la chronologie, cohérent avec la vue Chronologie.
- **Risque :** moyen — densité visuelle ; mitigée par le périmètre ère et un trait pointillé discret.
- **Effort :** M
- **Vérification :** France, ère 1 → chemin Marseille → Alise-Sainte-Reine → Lyon, légende « 600 av. J.-C. → 43 av. J.-C. » ; le compte `.geo-marker` reste inchangé.

## ATLAS-GEO-05 — Zoom et déplacement sans réseau

- **Problème :** `geography.js:27-28` fixe `viewBox="0 0 900 620"` : aucun zoom/pan, impossible de distinguer des lieux proches.
- **Solution :** `viewBox` mutable et borné, boutons `+ / − / ↺`, molette, glisser au pointeur, raccourcis `+ / - / 0` (non capturés par `keyboard.js:16-71`). Transformation conservée dans un cache de module par contexte pays/ère/périmètre, **jamais** dans le store partagé.
- **Impact :** lisibilité des lieux denses ; 100 % local, aucune tuile.
- **Risque :** moyen — interactions pointeur à valider ; aucune dépendance ajoutée.
- **Effort :** L
- **Vérification :** `+` réduit la `viewBox`, `0` la restaure, glisser déplace ; aucun `fetch`/URL réseau dans le module.

## ATLAS-GEO-06 — Marqueurs accessibles au clavier

- **Problème :** `geography.js:41-52` crée des `<g class="geo-marker">` sans `tabindex`, `role` ni `aria-label` : sélection réservée à la souris ; `keyboard.js:48,55` incrémente `placeIndex` sans borne.
- **Solution :** `role="button"`, `tabindex` roving (0 pour l'actif, −1 sinon), `aria-label` avec lieu + hiérarchie, `aria-pressed`, sélection au `focus`, cercle de touchée transparent `r=14`. Les touches `Entrée`/`Espace` restent gérées par la coque (limite inter-domaines documentée).
- **Impact :** Tab puis flèches permettent de parcourir les lieux ; lecture par lecteur d'écran.
- **Risque :** moyen — cohabitation avec le routeur clavier global non modifiable ici.
- **Effort :** M
- **Vérification :** Tab atteint le marqueur actif, le focus met à jour le panneau ; `npm run test:e2e` passe.

## ATLAS-GEO-07 — Légende et description machine du SVG

- **Problème :** `geography.js:56` se contente d'une note « Carte schématique locale… » ; le SVG (`geography.js:27-29`) n'a ni `<title>` ni `<desc>` et les symboles ne sont pas expliqués.
- **Solution :** `<title id="atlas-geo-svg-title">` + `<desc id="atlas-geo-svg-desc">` référencés par `aria-labelledby` sur `role="group"` ; bloc `.geo-legend` décrivant marqueur actif / inactif / chemin / hors cadre et les raccourcis. Ids uniques préfixés `atlas-geo-`.
- **Impact :** indexation sémantique et compréhension des signes.
- **Risque :** faible.
- **Effort :** S
- **Vérification :** `svg[aria-labelledby]` présent, un seul jeu d'ids, légende visible.

## ATLAS-GEO-08 — Cohérence avec l'état partagé

- **Problème :** `geography.js:42,46,60` utilise `state.placeIndex` brut ; après assez de flèches droite (`keyboard.js:48`), l'index dépasse le tableau : plus de marqueur actif et panneau vide (`geography.js:68-70`) alors que des lieux existent.
- **Solution :** un unique index d'affichage `active = clamp(state.placeIndex, 0, places.length - 1)` sert au marqueur actif, au kicker et au panneau ; `set({ placeIndex }, 'place')` reste la seule écriture ; la bascule de périmètre réinitialise à 0 (`geography.js:73` conservé).
- **Impact :** carte, panneau et compteur toujours alignés, sans dupliquer l'état.
- **Risque :** faible.
- **Effort :** S
- **Vérification :** flèches droite au-delà du dernier lieu → dernier lieu reste actif, kicker cohérent, pas de panneau vide.

## ATLAS-GEO-09 — Mobile et cibles tactiles

- **Problème :** `styles.css:203` textes SVG à 9px, `styles.css:211` boutons à 38px, `geography.js:43-50` aucune zone de touch élargie ; `styles.css:256` empile la grille mais la carte n'est pas adaptée au toucher.
- **Solution :** CSS injecté `#atlas-geographie-css` : cible transparente `r=14`, boutons ≥ 44 px, `touch-action:none` sur le SVG, hauteur minimale de carte, légende en colonne, `preserveAspectRatio` explicite, media query ≤ 620 px. Aucune édition de `styles.css`.
- **Impact :** marqueurs tapables sur 390×844, pas de débordement.
- **Risque :** faible — règles préfixées `.geo-` / `#atlas-geo-`.
- **Effort :** M
- **Vérification :** viewport 390×844, marqueur tapable, pas de scroll horizontal.

## ATLAS-GEO-10 — Autonomie CSS et souveraineté zéro réseau

- **Problème :** `geography.js` dépend des classes définies dans `styles.css:196-212`, fichier partagé avec d'autres agents : une modification concurrente peut casser la vue ; rien ne garantit l'absence de ressource distante ajoutée plus tard.
- **Solution :** fonction `ensureGeoStyles()` injectant de façon idempotente `<style id="atlas-geographie-css">` via `textContent` (aucune URL, `@import`, `fetch`, police ou image distante) ; toutes les nouvelles règles sont locales au module.
- **Impact :** vue autonome et contrainte « zéro réseau » vérifiable par inspection.
- **Risque :** faible.
- **Effort :** S
- **Vérification :** un seul `#atlas-geographie-css` après plusieurs rendus ; `npm run check` vert ; `grep` du module sans `http`/`fetch`.

## État d'implémentation

Les 10 chantiers sont implémentés dans `v2/src/views/geography.js` uniquement. `styles.css`, `store.js`, `dataset.js` et tout autre fichier sont intacts ; le CSS est injecté par `#atlas-geographie-css`. Aucune coordonnée ni date inventée ; zéro requête réseau ajoutée.

Blocage inter-domaines identifié : la coque (`keyboard.js`) intercepte globalement `Entrée`/`Espace`, ce qui empêche d'activer un marqueur focalisé par ces touches. La sélection au clavier passe donc par le `focus` (roving tabindex) et les flèches, sans modifier un fichier interdit. Signalé à l'agent `atlas-coque-navigation`.

## Vérifications

- `node --check src/views/geography.js` : **OK**.
- `npm run verify` (dans `npm run check`) : **21/21 PASS**.
- `npm run test:e2e` : **échec préexistant**, indépendant de cette vue — `page.goto(..., { waitUntil: 'networkidle0' })` (`tests/e2e.mjs:20`) expire après 30 s alors que toutes les requêtes sont terminées (reproduit à l'identique avec le `geography.js` d'origine, sans aucun changement de ce module). Environnement : Chromium `/usr/bin/chromium`, serveur local 4181.
- Test fonctionnel isolé rejoué avec `waitUntil: 'load'` via `window.VATLAS` : marqueurs, style injecté unique, `title`/`desc` et `aria-labelledby`, chemin chronologique « 600 av. J.-C. → 43 av. J.-C. », marqueur focusable/`aria-pressed`, kicker, zoom boutons et clavier (`+`, `0`), état vide (`fr-clovis`, 0 lieu), absence de `NaN`, liste « Fort-de-France » hors cadre avec tous les marqueurs dans le cadre, zéro requête externe, zéro erreur console : **PASS**.
- Débordement horizontal de 3 px mesuré à 390×844 : origine `.shell-tab` (coque, `shell.js`), extérieur à ce module ; signalé à l'agent `atlas-coque-navigation`. La vue géographie elle-même ne déborde pas.
- Éditions concurrentes observées pendant l'audit (ex. `.globe-list` passé de 10 à 13 boutons) : les assertions E2E sur d'autres vues peuvent échouer indépendamment de ce chantier.
