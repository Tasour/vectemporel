# M02 — Textures du globe

Surface **micro** `M02-textures-globe`. Domaine A (rendu & moteur WebGL), lentille 2/50.
Fichier possédé : `src/views/monde/M02.js` (stub remplacé). Rapport : `UNIFIED_AUDIT/MONDE/views/M02-textures-globe.md`.

Pièces lues pour le diagnostic : `src/views/globe.js`, `public/globe-engine.js`, `src/views/monde/registry.js`, `src/views/monde/index.js`, `styles.css`, `index.html`, `UNIFIED_AUDIT/MONDE/README.md`, `globe-palette.json`. Dimensions des PNG relevées dans l'en-tête IHDR des fichiers locaux.

Aucune donnée historique n'est inventée. Tous les chiffres de ce rapport proviennent des fichiers présents dans le dépôt ; les durées et l'URL réellement chargée sont lues à l'exécution dans le Resource Timing, sans requête supplémentaire.

## Faits de départ (preuves partagées)

| Ressource | Dimensions | Colortype PNG | Taille sur disque |
| --- | --- | --- | --- |
| `globe-map.png` | 4096×2048 | 6 (RGBA 8 bits) | 1 285 223 o |
| `globe-map-2k.png` | 2048×1024 | 6 (RGBA 8 bits) | 416 624 o |
| `globe-pick.png` | 2048×1024 | 6 (RGBA 8 bits) | 269 592 o |
| `globe-palette.json` | grille 2048×1024, 196 couleurs | — | 18 271 o |

`globe-engine.js:562-570` (`chooseMapUrl`) choisit la carte 4k si, et seulement si, `maxTextureSize >= 4096`, `innerWidth >= 700`, `deviceMemory > 4` (ou non exposé) et `saveData == false` ; sinon la 2k. `globe-engine.js:611-618` charge carte, picking et palette dans un seul `Promise.all`. `globe.js:325` et `466` affichent « textures et palette locales, aucun service externe » sans jamais nommer la résolution.

---

## M02-01 — La résolution réellement chargée n'est jamais visible

- **Problème / preuve.** `globe-engine.js:608-613` appelle `chooseMapUrl(maxTexture)` puis `loader.loadAsync(mapUrl)`, mais ne conserve ni l'URL choisie ni la résolution dans `getInfo()` (`:691-703`). Le statut `globe.js:466` dit seulement « textures et palette locales ». Un audit ne peut donc pas vérifier si 4096×2048 ou 2048×1024 a été utilisé.
- **Solution.** En `ctx.onReady`, lire `performance.getEntriesByType('resource')`, repérer `globe-map.png` / `globe-map-2k.png`, et écrire la résolution réelle dans le résumé du panneau `#monde-m02-quality` ainsi que dans la ligne « Carte chargée ». Si les deux entrées coexistent ou si aucune n'est présente, afficher explicitement « non déterminé » / « non mesuré » plutôt que de deviner.
- **Impact sur l'évidence.** Le choix de résolution devient une mesure auditable, distincte du texte de statut générique.
- **Risque.** Resource Timing peut être vide (buffer purgé, navigation atypique) → repli explicite « non mesuré », aucune affirmation inventée.
- **Effort.** S.
- **Vérification.** En vue Monde après chargement, `#monde-m02-summary-res` contient `4096×2048` ou `2048×1024` ; en cas d'absence d'entrée, il contient « non mesuré ».

## M02-02 — Aucun repli 2k lorsque la carte 4k échoue

- **Problème / preuve.** `globe-engine.js:611-618` charge les trois ressources dans un `Promise.all` : si `globe-map.png` (1 285 223 o) échoue, tout l'init rejette, `:650-655` appelle `onError`, et `globe.js:469` affiche « Globe 3D indisponible ». Pourtant `globe-map-2k.png` (416 624 o) est présent localement et n'est jamais retenté.
- **Solution.** La lentille ne peut pas modifier le `try/catch` du moteur (fichier interdit) : elle surveille l'apparition de `canvas.globe-webgl` via `MutationObserver` et, après 5 s sans canvas ni statut `ready`, affiche `#monde-m02-fallback` : nom, dimensions et taille du fichier 2k, avec rappel que la liste des pays reste utilisable. Le message cite explicitement `globe-engine.js:611-618` comme point de correction.
- **Impact sur l'évidence.** L'échec n'est plus un mur : l'existence du repli local est documentée au même endroit que le diagnostic.
- **Risque.** **Blocage partiel** : le repli automatique exigerait une modification de `public/globe-engine.js`, fichier interdit. Une annonce peut survenir sur réseau très lent alors que le chargement est encore en cours → message formulé comme « non confirmé après 5 s », pas comme un échec définitif.
- **Effort.** M.
- **Vérification.** Sans canvas après délai, `#monde-m02-fallback` est visible et mentionne `globe-map-2k.png` ; dès `onReady`, le message est masqué et les timers/observateurs sont stoppés (déconnectés).

## M02-03 — Le chemin critique des trois ressources n'est pas mesuré

- **Problème / preuve.** `globe-engine.js:611-618` lance simultanément la carte (jusqu'à 1 285 223 o), le picking (269 592 o) et la palette (18 271 o) sans `onProgress` ni indicateur par ressource ; `globe.js:328` n'affiche qu'un « Chargement du globe local… » global.
- **Solution.** Lire `entry.duration` pour chaque fichier dans le Resource Timing et afficher une ligne « Latence des ressources » avec les quatre durées. Au-delà de 1500 ms pour une ressource, `#monde-m02-alert` devient visible et le libellé est annoncé dans la région live.
- **Impact sur l'évidence.** On distingue enfin la ressource lente du simple « chargement en cours ».
- **Risque.** Seuil de 1500 ms : convention de la lentille, pas une constante du moteur ; il est affiché dans le message pour rester falsifiable. Une ressource servie depuis le cache peut afficher `0 ms`, ce qui est exact.
- **Effort.** S.
- **Vérification.** La ligne contient quatre durées (ou « durées non exposées ») ; en cas de latence > 1500 ms, l'alerte et l'annonce live contiennent le nom de la ressource.

## M02-04 — Le critère de sélection 4k est binaire et opaque

- **Problème / preuve.** `globe-engine.js:562-570` : `maxTexture >= 4096 && !smallScreen && !lowMemory && !saveData`. Aucun de ces quatre termes n'est exposé à l'utilisateur ; `getInfo()` (`:691-703`) ne publie pas `maxTextureSize`. Le choix paraît arbitraire alors qu'il est déterministe.
- **Solution.** Recalculer dans la lentille les trois termes observables (`innerWidth`, `navigator.deviceMemory`, `navigator.connection.saveData`) et afficher la ligne « Critère 4k » avec leurs valeurs réelles et leurs seuils (700, > 4). Le quatrième terme est écrit « non exposé par getInfo() », sans estimation.
- **Impact sur l'évidence.** Le passage à la 2k devient explicable : on voit quelle condition locale a basculé.
- **Risque.** `navigator.deviceMemory` et `navigator.connection` sont absents de certains navigateurs → libellé « non exposé », jamais une valeur supposée. Le calcul de la lentille, identique à celui du moteur, est indicatif : c'est le Resource Timing (M02-01) qui fait foi pour la résolution effective.
- **Effort.** S.
- **Vérification.** La ligne contient `seuil 700`, `seuil > 4` et `maxTextureSize : non exposé par getInfo()`.

## M02-05 — Framebuffer plafonné, carte possiblement huit fois plus grande

- **Problème / preuve.** `globe-engine.js:202-204` plafonne le framebuffer à 2 200 000 px et le DPR à 1,5, alors que la carte 4k contient 4096×2048 = 8,39 Mpx. Le globe n'occupe qu'une partie de la scène (`.globe-scene`, `styles.css:127`). Rien ne rapporte ce décalage.
- **Solution.** À partir de `getInfo()` (`width`, `height`, `pixelRatio`), afficher le framebuffer réel en Mpx, le ratio carte/framebuffer et le budget de 2,20 Mpx ; signaler un ratio > 4 comme « sur-échantillonnage théorique ».
- **Impact sur l'évidence.** Le coût de la haute résolution est mis en regard de la surface réellement dessinée.
- **Risque.** `getInfo()` renvoie `null` avant l'ouverture du moteur → libellé « compteurs non exposés avant ouverture ». Le rapport est une comparaison de surfaces, pas une mesure de qualité perçue. **Blocage partiel** : ajuster la résolution au framebuffer exigerait `globe-engine.js:562-570`, fichier interdit.
- **Effort.** M.
- **Vérification.** La ligne « Framebuffer » affiche `budget moteur 2,20 Mpx` et, si `getInfo()` est disponible, les dimensions du drawing buffer.

## M02-06 — Un canal alpha transporté puis ignoré

- **Problème / preuve.** Les trois PNG sont en colortype 6 (RGBA 8 bits, vérifié en IHDR) : 4 canaux × 4096×2048 = 33,55 Mio pour la carte 4k. Or le fragment shader force `gl_FragColor = vec4(color, 1.0)` (`globe-engine.js:183`) et le matériau n'est pas transparent (`:145-149`). Un canal entier est donc stocké, téléchargé et échantillonné sans effet.
- **Solution.** Afficher la ligne « Canal alpha » : nombre de canaux, référence `globe-engine.js:183` et volume théorique du canal inutilisé (8,0 Mio en 4k, 2,0 Mio en 2k), calculé depuis les dimensions réelles du fichier sélectionné.
- **Impact sur l'évidence.** Une piste d'optimisation chiffrée, sans modifier les fichiers graphiques.
- **Risque.** **Blocage** : convertir les PNG en RGB (colortype 2) toucherait aux ressources binaires, hors périmètre de la lentille. La valeur affichée est une estimation de volume de canaux, pas une mesure VRAM.
- **Effort.** S.
- **Vérification.** La ligne contient `4 canaux PNG (type 6)` et `alpha forcé à 1.0 (globe-engine.js:183)`.

## M02-07 — Les mipmaps de la carte coûtent un tiers de mémoire en plus

- **Problème / preuve.** `globe-engine.js:621-624` active `LinearMipmapLinearFilter` et `generateMipmaps = true` sur une carte 4k : 33,55 Mio en base, ~44,74 Mio avec la pyramide complète (facteur 4/3). Aucun budget mémoire n'est documenté dans le HUD.
- **Solution.** Ligne « Mipmaps » avec le passage `base → avec mipmaps (+33 %)` calculé depuis la carte détectée ; note de bas de tableau précisant que ce sont des estimations théoriques (4 canaux × 8 bits, pyramide complète).
- **Impact sur l'évidence.** Le surcoût est explicite et varie avec la résolution réellement chargée.
- **Risque.** Le facteur 4/3 est une approximation de pyramide complète ; arrondi à 0,1 Mio. Aucune assertion sur la VRAM réelle (`getInfo()` ne l'expose pas).
- **Effort.** S.
- **Vérification.** En 4k, la ligne affiche `32,0 Mio en base → 42,7 Mio avec mipmaps` ; en 2k, `8,0 Mio → 10,7 Mio`.

## M02-08 — Aucun contrôle de cohérence du compteur de textures

- **Problème / preuve.** `getInfo()` (`globe-engine.js:697`) expose `info.memory.textures`. La scène n'utilise que deux textures GPU (carte + picking ; la palette est un JSON et la copie `pickData` est un canvas 2D en `:638-643`). Un compteur différent signalerait une duplication ou une fuite, mais personne ne le lit.
- **Solution.** Ligne « Textures GPU » affichant la valeur réelle et l'attendu (2). Si le compteur est disponible et différent de 2, `#monde-m02-alert` signale une anomalie.
- **Impact sur l'évidence.** Détection non invasive d'une dérive du cycle de vie WebGL, sans toucher au moteur.
- **Risque.** Le compteur peut être à 0 avant le premier rendu : l'alerte n'est déclenchée qu'après `onReady`, et le libellé précise « attendu 2 (carte + picking) ».
- **Effort.** S.
- **Vérification.** Après `onReady`, la ligne contient `attendu 2 (carte + picking)` ; aucune alerte en fonctionnement nominal.

## M02-09 — Les filtres d'échantillonnage ne sont nulle part documentés

- **Problème / preuve.** `globe-engine.js:620-629` applique des réglages dissymétriques et corrects : carte en sRGB, `LinearMipmapLinearFilter` / `LinearFilter`, anisotropie `min(4, max)` ; picking en `NoColorSpace`, `NearestFilter` des deux côtés, sans mipmaps. Ces choix sont invisibles dans l'interface, ce qui rend impossible l'interprétation d'un rendu flou ou d'un survol inexact.
- **Solution.** Ligne « Échantillonnage » restituant ces réglages et leurs références de lignes, afin que tout signalement de netteté puisse être relié à un paramètre connu.
- **Impact sur l'évidence.** Le comportement de la texture est traçable depuis l'interface, sans ouvrir le code.
- **Risque.** Texte statique : si le moteur change de filtres, la ligne devient obsolète ; elle est datée par les références `globe-engine.js:620-629` explicites dans le libellé.
- **Effort.** S.
- **Vérification.** La ligne contient `LinearMipmapLinearFilter`, `NearestFilter` et `globe-engine.js:620-629`.

## M02-10 — La qualité de texture est inaccessible sans le globe

- **Problème / preuve.** Toutes les informations ci-dessus viennent du canvas WebGL ou de `getInfo()` ; `globe.js:325/466` ne dit que « textures et palette locales ». Un lecteur d'écran n'a aucun accès à la résolution, à la latence ni au budget, et le canvas est `aria-hidden="true"` (`globe-engine.js:601`).
- **Solution.** Regrouper les dix lignes dans un `<table>` réel avec `<caption>` et `<th scope="row">`, dans un `<details id="monde-m02-quality">` intitulé « Textures · <résolution> », plus une région `role="status" aria-live="polite" aria-atomic="true"` hors du canvas pour l'annonce ponctuelle. Aucune information n'est portée par la seule couleur ; le tableau reste lisible si WebGL échoue.
- **Impact sur l'évidence.** Le diagnostic texture devient une substitution textuelle du canvas, conforme au contrat d'accessibilité de la vue Monde.
- **Risque.** Deux annonces concurrentes sont possibles avec la live globale de `globe.js` (`#globe-live`) : la région M02 ne publie qu'un message de synthèse à `onReady`, et `ctx.say()` n'est utilisé que pour l'incident de chargement (message distinct). Le panneau est `<details>` fermé par défaut pour ne pas couvrir la scène ni déplacer les contrôles `styles.css:150`.
- **Effort.** M.
- **Vérification.** Un seul `#monde-m02-quality` dans le DOM, un `<caption>` et dix `<th scope="row">`, `#monde-m02-live` présent dans `<body>` avec `aria-live="polite"`, aucun sélecteur de test modifié (`.globe-list button`, `.globe-country`, `#globe-status`).

---

## Synthèse des blocages (fichiers interdits)

1. **`public/globe-engine.js`** : repli automatique sur la 2k (M02-02), adaptation de la résolution au framebuffer (M02-05) et suppression du canal alpha (M02-06) exigent une modification du moteur. La lentille fournit la détection, le chiffre et le diagnostic, pas la correction moteur.
2. **Ressources binaires** : convertir `globe-map.png` / `globe-map-2k.png` en RGB relève des fichiers graphiques (M02-06), hors périmètre.
3. **`src/views/globe.js` / `styles.css`** : inchangés. Le statut du HUD reste générique ; le panneau M02 est injecté par `ctx.css('monde-m02', …)` dans `.globe-scene` (déjà `position: relative`, `styles.css:127`).

## État de vérification

- `node --check src/views/monde/M02.js` : OK.
- Aucun `console.*`, aucun `Math.random()`, aucune requête réseau ajoutée : les données sont lues dans le Resource Timing déjà existant et dans `getInfo()`.
- IDs utilisés : `monde-m02-quality`, `monde-m02-live`, `monde-m02-summary-res`, `monde-m02-rows`, `monde-m02-fallback`, `monde-m02-alert`, `monde-m02-table` — tous préfixés et protégés par garde d'existence (rendus répétés).
- Temporalité : le panneau se remplit à `onReady` ou immédiatement si le moteur est déjà prêt ; le délai de 5 s ne s'arme que tant qu'aucun canvas n'est présent.
