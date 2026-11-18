# M03 — Palette de picking et précision de sélection

Lentille du domaine A (rendu & moteur WebGL) de la vague « Monde ». Un seul fichier possédé : `src/views/monde/M03.js`. Lectures seules : `public/globe-palette.json`, `public/globe-pick.png`, `public/globe-engine.js`, `src/views/globe-reveal.js`, ainsi que `src/views/globe.js` et `src/views/monde/registry.js` pour le contrat d'appel.

Fidélité = adéquation entre (a) le code renvoyé par la lecture de la texture de picking, (b) la couleur mise en évidence par le shader et (c) le contour découpé par la révélation. Mesures relevées localement sur les fichiers livrés : PNG 2048×1024 en RGBA (alpha 255 sur tous les pixels), JSON de 196 codes uniques répartis sur 6 niveaux RVB (24, 64, 104, 144, 184, 224). Aucune donnée inventée, aucun appel réseau ajouté.

---

## M03-01 — Palette chargée sans référence ni validation

- **Preuve** : `globe-engine.js:611-636` charge `globe-palette.json`, construit 196 triplets et deux `Map`, sans comparaison avec une référence figée ; `codeAtLocalPoint()` (`:231-243`) restitue le code par plus proche voisin. Une dérive du JSON (code échangé, palette tronquée, dimensions modifiées) serait silencieuse.
- **Solution** : figer dans le module la liste intégrale des 196 codes ; au `onReady`, sonder `engine.debugPick()` sur une grille 3×3 déterministe et contrôler l'appartenance de chaque code renvoyé. Résultat en ligne 1 du panneau `#monde-m03-panel` ; le `MutationObserver` sur `data-globe-selected` signale aussi une sélection hors palette.
- **Impact** : une dérive de la table devient détectable sans toucher au moteur, seul propriétaire du chargement.
- **Risque** : `debugPick()` renvoie `null` hors sphère (`:253`) ; les sondes sont donc confinées à la zone centrale.
- **Effort** : M
- **Vérification** : après chargement, ligne 1 = `palette N/N codes conformes` ; `N` vaut 9 au plus (un point peut tomber sur l'océan et être compté comme rejet, pas comme non-conforme).

## M03-02 — Convention de lecture UV non vérifiée

- **Preuve** : `globe-engine.js:213-223` dérive `u` de `atan2(point.z, -point.x)` et `v` de `asin(point.y)`, puis applique un flip de ligne (`1 - v`) ; `:626-629` configure la texture de picking en `NearestFilter`, `NoColorSpace`, sans mipmaps. Le résultat dépend du `flipY` implicite du `TextureLoader` (`:610-628`) et d'aucun test ne contrôle l'orientation.
- **Solution** : contrôle de la géométrie de lecture par sondes : sur la colonne centrale, l'axe `local[1]` doit décroître quand l'ordonnée écran croît ; tous les `local` rendus doivent être sur la sphère unité. Comptage des inversions et des écarts en ligne 2.
- **Impact** : une inversion nord/sud ou une lecture hors sphère devient mesurable au chargement.
- **Risque** : sans accès aux pixels de la texture (non exposée par l'API publique), le flip de ligne lui-même ne peut pas être vérifié : blocage documenté, le contrôle porte sur la convention géométrique, pas sur l'orientation de l'image.
- **Effort** : S
- **Vérification** : ligne 2 = `UV : 0 inversion · 0 hors unité` sur la grille nominale.

## M03-03 — 26 codes de palette sans aucun pixel exact

- **Preuve** : mesure sur `globe-pick.png` : 196 codes uniques dans le JSON, mais 26 d'entre eux n'ont aucune occurrence exacte de leur triplet RVB dans la texture — KM, CV, ST, SC, BH, MV, SG, AG, BB, DM, KN, VC, LC, AD, VA, LI, MT, MC, SM, MH, KI, FM, NR, PW, TO, TV. Seuls 170 codes sont réellement présents ; il s'agit surtout de micro-États.
- **Solution** : figer la liste des 26 codes, l'afficher en ligne 3, lever une alerte si une sonde en renvoie un et surveiller `data-globe-selected` pour signaler une sélection de ce type.
- **Impact** : dette de fidélité explicite : un code peut être sélectionné sans qu'aucun pixel « pur » ne lui corresponde.
- **Risque** : la recherche du plus proche voisin (`:231-243`) peut tout de même attribuer un pixel de blend à ces codes ; l'alerte signale un cas à investiguer, pas une certitude d'erreur.
- **Effort** : S
- **Vérification** : ligne 3 = `palette : 26 codes sans pixel exact` ; aucune occurrence signalée sur la grille de neuf sondes.

## M03-04 — Seuil océan : 1 901 pixels de frange rejetés

- **Preuve** : `globe-engine.js:229` rejette tout pixel tel que `r + g + b < 24`. Mesure sur le PNG : 1 605 986 pixels noirs, soit 76,58 % de l'image, et 1 901 pixels avec `0 < r + g + b < 24` : ils portent du contour mais sont écartés du picking.
- **Solution** : exposer la mesure en ligne 4 et compter, parmi les sondes déterministes, les retours `null` (rejets océan) ; aucun seuil n'est modifié, le moteur n'étant pas possédé.
- **Impact** : la zone de frange côtière est chiffrée et observable au lieu d'être implicite.
- **Risque** : des sondes écran à position fixe ne visent pas nécessairement une côte ; le compteur est un indicateur local, pas une mesure exhaustive.
- **Effort** : M
- **Vérification** : ligne 4 = `frange océan 1901 px · rejets sonde N`, avec `N` entre 0 et 9 selon l'orientation du globe au chargement.

## M03-05 — Plus proche couleur sans plafond de distance

- **Preuve** : `globe-engine.js:231-243` choisit le code minimisant la distance RVB au carré sans imposer de maximum. Mesure sur le PNG : 42 840 pixels ni noirs ni de couleur palette exacte, dont 21 047 à plus de 20 (demi-pas de la grille) de toute couleur palette ; distance maximale observée 41. Un tel pixel est nécessairement « snapé » vers un pays arbitraire.
- **Solution** : afficher les deux volumes mesurés en ligne 5 et ajouter des sondes jumelles à +2 px autour de chaque point de grille : un changement de code ou un passage terre/océan sur 2 px incrémente un compteur d'instabilité.
- **Impact** : distingue une sélection fiable d'une sélection issue d'un pixel de transition.
- **Risque** : correctif impossible depuis la vue : plafonner la distance exigerait une modification de `codeAtLocalPoint()` dans `public/globe-engine.js` (blocage documenté). Le module ne fait que diagnostiquer.
- **Effort** : M
- **Vérification** : ligne 5 = `blends 42840 · ambigus 21047 · inst. N` ; `N` reste faible sur une grille en zone centrale.

## M03-06 — Découpe plus large que la surbrillance

- **Preuve** : `src/views/globe-reveal.js:23` fixe `TOLERANCE = 18` et `:125-133` inclut dans le masque tout pixel dont chaque canal est à 18 près d'une couleur palette ; `globe-engine.js:176-180` met en évidence le pays seulement si `distance(pickColor, uHover) < 0.018`, soit environ 4,6 niveaux sur 255. Mesure du gain du masque par rapport aux pixels exacts : FR +89, GB +72, US +328, DE +10, IT +34, ES +15, CN +1045, IN +140, JP +72, EG +769 pixels, soit +27,8 % pour l'Égypte.
- **Solution** : afficher les gains mesurés en ligne 6 et comparer, à chaque `onHover`, le code annoncé au pays exposé par `reveal.current()` : toute divergence d'identité est signalée. La surveillance de `data-globe-selected` signale aussi un code absent de la table de 10 codes de la révélation (`globe-reveal.js:11-22`), donc non découpable.
- **Impact** : le décalage entre silhouette du drapeau et silhouette surlignée est documenté et toute erreur d'identité de découpe est détectée.
- **Risque** : l'API de révélation n'expose pas les pixels du masque : la comparaison porte sur l'identité du pays, les écarts de pixels restant des mesures statiques (blocage documenté).
- **Effort** : M
- **Vérification** : ligne 6 = `découpe T18 : EG +769 px · CN +1045 px` ; aucun `découpe : écart` après dix survols des pays documentés.

## M03-07 — Sphère analytique de pick contre maillage fini

- **Preuve** : `globe-engine.js:49` définit une sphère de rayon 1 pour le raycaster (`:253`), tandis que `:189` rend `SphereGeometry(1, 64, 40)`. Le flèche est `1 - cos(pi/64) = 0,0012` du rayon, soit environ 0,36 px pour un globe de 300 px de rayon : au limbe, le rayon frappe une surface qui n'est pas celle du maillage.
- **Solution** : exclure 15 % de marge sur les bords du canvas pour toutes les sondes, contrôler `|local| ≈ 1` sur chaque retour (lignes 2 et 7) et consigner l'écart géométrique dans la fiche.
- **Impact** : la validation ne produit pas de faux positifs liés au limbe et la zone de confiance est explicite.
- **Risque** : marge empirique ; `worldToLocal()` (`:254-255`) compense déjà la rotation, il ne s'agit pas d'un dysfonctionnement fonctionnel mais d'une limite de fidélité.
- **Effort** : S
- **Vérification** : ligne 7 = `limbe : 0 pick hors unité` ; l'intégralité des sondes tombe dans la zone centrale.

## M03-08 — Survol périmé pendant la rotation

- **Preuve** : `globe-engine.js:27-73` ne déclare pas `hoverCheckAt` ; `:277` calcule `now - undefined`, soit `NaN`, et `NaN < 45` est faux : le premier `updateHoverFromPointer()` échappe au throttling de 45 ms, la valeur n'étant initialisée qu'à `:278`. Par ailleurs `:456` fait tourner le globe de `dt * 0,065` rad/s pendant que le survol n'est réévalué qu'à 45 ms.
- **Solution** : observateur `pointermove` passif sur le `host` mémorisant la dernière position ; à chaque `onHover`, comparer le code annoncé à un `debugPick()` frais à cette position et compter les désaccords en ligne 8, avec une annonce `say()` unique au premier cas.
- **Impact** : un code de survol qui ne correspond plus au pixel réellement pointé devient observable pendant l'auto-rotation.
- **Risque** : `debugPick()` parcourt la palette ; la comparaison est donc faite uniquement sur le callback `onHover` (déjà conditionné à un changement de code, `:107-120`), jamais à chaque mouvement.
- **Effort** : M
- **Vérification** : ligne 8 = `survol périmé : 0` après deux secondes de rotation avec pointeur immobile sur la zone centrale.

## M03-09 — Aucun survol au toucher, donc aucune découpe

- **Preuve** : `globe-engine.js:383` n'appelle `updateHoverFromPointer()` que si `event.pointerType !== 'touch'` ; `src/views/globe.js:282` ne gère que `pointerleave`. La sélection tactile reste possible via `onPointerUp()` (`:399-412`), mais `reveal.hover()` n'est jamais déclenché par un doigt.
- **Solution** : observateur `pointerdown` passif sur le `host` : pour un pointeur `touch`, relever `debugPick()` au point de contact et afficher le code touché ainsi que l'indication `découpe absente` en ligne 9.
- **Impact** : la dette mobile est explicite et le code réellement touché est vérifiable sans modifier le moteur.
- **Risque** : l'écouteur est purement observationnel et `passive` : il n'empêche ni le `preventDefault()` du moteur (`:332`) ni la sélection au `pointerup`.
- **Effort** : S
- **Vérification** : avec un pointeur simulé de type `touch`, la ligne 9 affiche le code touché et la sélection reste correcte.

## M03-10 — Greffon non idempotent entre deux rendus

- **Preuve** : `src/views/monde/registry.js:17-19` conserve trois tableaux de callbacks jamais vidés et `:45-55` réapplique tous les greffons à chaque rendu ; `src/views/globe.js:310,442` appelle `runMondeEnhancements()` à chaque `renderGlobe()`. Le CSS est protégé par `cssOnce()` (`registry.js:25-31`), mais ni les callbacks ni les nœuds ne le sont.
- **Solution** : verrou module `bound` pour n'enregistrer qu'une seule fois `onReady`/`onHover`/`onLeave` et les deux observateurs ; garde d'existence `getElementById(PANEL_ID)` et réutilisation du même panneau et des dix mêmes lignes à chaque rendu.
- **Impact** : un seul cycle de sondes, aucune annonce dupliquée, aucun panneau fantôme après dix changements d'état.
- **Risque** : le verrou suppose le `host` réutilisé par `ensure()` (`globe.js:263-292`) ; si un nouveau `host` était créé, le panneau serait déplacé mais les callbacks resteraient attachés au premier — limite documentée.
- **Effort** : S
- **Vérification** : après dix re-renders, `document.querySelectorAll('#monde-m03-panel').length === 1` et la ligne 10 indique un compteur de cycle unique par chargement.

---

## Statut d'implémentation

Les dix chantiers sont implémentés dans `src/views/monde/M03.js` : panneau local `#monde-m03-panel`, dix lignes de diagnostic, sondes déterministes, contrôle d'identité de la révélation, observateurs pointeur et sélection. Aucun autre fichier ni sélecteur de test n'est modifié ; aucun `console.*`, aucun `Math.random`, aucun appel réseau.

Blocages documentés (correctifs hors périmètre de la lentille) : plafond de distance dans `codeAtLocalPoint()` (M03-05), seuil océan (M03-04), seuil de surbrillance du shader (M03-06), vérification du flip de ligne de la texture (M03-02), survol tactile (M03-09). Ils sont diagnostiqués et chiffrés, pas corrigés.

## Vérification

`node --check src/views/monde/M03.js` : PASS. Contrôles statiques complémentaires : 196 codes figés, 26 codes absents tous présents dans la palette, zéro occurrence de `console.`, `Math.random`, `fetch(`, `XMLHttpRequest`.
