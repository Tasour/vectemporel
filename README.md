# Histoire du monde — Sphère historique

![version](https://img.shields.io/badge/version-0.2.0-blue) ![tests](https://img.shields.io/badge/check-1031%20PASS-brightgreen) ![licence](https://img.shields.io/badge/licence-MIT-blue)

Application web **une seule vue** : une sphère WebGL plein écran affichant les régions du monde en l'an 1000. Aucun framework applicatif, aucun appel réseau à l'exécution. Les données sont générées au build depuis l'API publique de Chronas (CC BY-SA 4.0) et embarquées dans le bundle.

> L'atlas 6 vues est dans `archive/v0-atlas/`, la carte 2D dans `archive/v1-map-2d/`. Les décisions sont documentées dans `docs/architecture/` (ADR-0001 à 0004).

## Lancer

```bash
npm install
npm start                 # http://127.0.0.1:4181
```

Régénération des données (build-time, réseau autorisé uniquement ici) :

```bash
npm run map:data          # -> src/data/chronas-map.js (592 Ko, année 1000)
npm run build:pages       # -> dist-pages/ pour GitHub Pages
```

## Timeline et années

La frise en bas de l'écran couvre **toutes les années de −2000 à 2000** (4 001 ans). Le curseur change d'année pas à pas, le clic sur l'année ouvre la saisie directe, les boutons de siècle sautent aux repères, et la lecture est **toujours manuelle**. Aucune rotation spatiale n'est automatique : le bouton `▶` du coin supérieur droit lance le tour du monde.

Deux échelles cohabitent, testées dans `src/timeline/scale.js` : **linéaire** (chaque année occupe la même largeur) et **récents** (exposant 2 : les siècles récents s'étalent, le passé lointain se comprime). Le bouton `Linéaire / Récents` bascule l'échelle du curseur principal et l'état part dans l'URL (`?scale=recent`). Une **minimap de densité** sous le curseur montre la répartition des 560 épiques sur 80 tranches, avec son propre curseur linéaire : elle reste la référence spatiale même quand l'échelle principale est compressée. Les deux curseurs exposent `aria-valuetext` avec l'année réelle, jamais la position interne.

Les données sont générées au build (`npm run years:import`, import reprenable) puis stockées en 41 chunks de siècle chargés à la demande. Le snapshot de référence et les chunks sont servis localement : aucun appel réseau au runtime, PWA hors ligne conservée.

La barre de dimensions permet de colorer les régions par État, culture, religion, capitale ou population. Les capitales historiques sont chargées depuis `npm run cities:import` et filtrées sur les capitales politiques de l'année affichée (210 points en l'an 1000) : ce sont de petits disques, visibles seulement à partir du zoom 2,5. **Cliquer un disque sélectionne la région correspondante**. Au survol d'une région, une **bulle custom** discrète affiche son nom et sa culture ; la bulle native du navigateur reste désactivée. L'information détaillée reste dans la fiche et le `role="status"`. Le zoom maximal est de **7,2**.

La barre `Aucun / Historique / Capitales / Moderne / Les deux` affiche des libellés projetés sur la sphère : noms Chronas importés au build et noms de pays modernes issus de Natural Earth (domaine public, 177 pays, 8 Ko), tous hors ligne. La frise porte les **560 épiques** Chronas : pastilles colorées par catégorie et sélecteur accessible pour sauter à un événement. La fiche de chaque région affiche aussi sa **chronologie provinciale** locale : souverain, culture, religion, capitale et population à travers les siècles, avec un sélecteur de repères. Contrairement à Chronas, aucun fond de carte externe n'est nécessaire pour le mode moderne : les noms sont embarqués. Le thème clair/sombre est conservé dans `localStorage`.

## Récits guidés

Dix parcours — route de la soie, réveil de l'Islam, Europe des capitales, villes du savoir, empires d'Asie, Égypte, Levant, steppe, océan Indien et Amériques — totalisent **70 jalons** dans `content/trails/*.json`. Le bouton `❖` (touche `T`) ouvre la liste ; deux filtres (difficulté, thème) permettent de la parcourir. Chaque récit porte sa difficulté, sa durée estimée et ses tags. Chaque jalon amène la sphère à l'année et à la province concernées, puis affiche le récit, les faits Chronas à cette année et la preuve utilisée (`souverain « XIO » en -138`). La fiche de région reste fermée pendant le récit : le panneau tient lieu de lecture. `Précédent / Suivant / Quitter` et `Échap` pilotent la progression ; `?trail=soie&step=2` reprend un récit après rechargement.

Les récits ne sont pas du texte libre non vérifié : `scripts/build-trails.mjs` recalcule pour chaque jalon la valeur du champ Chronas déclaré à l'année indiquée et casse le build en cas d'écart. Un SHA-256 canonique est embarqué dans `src/data/trails.js` et contrôlé par `npm run test:trails:data`. Texte des récits sous licence MIT, données © Chronas CC BY-SA 4.0.

## Ruptures détectées

La frise porte aussi **49 points de rupture** calculés depuis les 41 chunks annuels (ADR-0012). Règle reproductible : une année où au moins 20 provinces changent de souverain, l'an 1 et les sauts de population $>10$ millions étant exclus comme artefacts de la source. Chaque badge affiche l'année, son nombre de régions et, au clic, amène le globe à l'année puis ouvre la fiche d'une province concernée. Le libellé dit explicitement **« extrait Chronas »** : c'est un constat sur la donnée, pas un récit historique. `?turn=751` sélectionne un point au chargement ; les badges sont des cibles de 44 px dans une bande défilante.

## Simultanéités

Le bouton `⌁` (touche `S`) affiche des arcs entre la province sélectionnée et jusqu'à quatre autres provinces qui partagent le même souverain l'année courante (`?arcs=1` au chargement). Les arcs sont des `LineSegments` dessinés dans le repère de la sphère, donc occlus correctement par le globe ; un seul rendu est déclenché par changement, aucune boucle d'animation supplémentaire. Le `role="status"` annonce la catégorie (souverain), la valeur (province) et l'unité (`hab`) de chaque lien. `prefers-reduced-motion` aplatit les arcs.

## Histomap (mode de la chronologie)

Le bouton `Histomap` de la frise (touche `H`) ouvre une seconde lecture du temps : un **streamgraph D3 de la part de population estimée par famille culturelle**, tous les 25 ans de −2000 à 2000. La métrique est relative (chaque année a la même hauteur), ce qui rend les quatre millénaires lisibles malgré la croissance démographique ; les valeurs absolues restent dans les tooltips et la table miroir. Sept rubans, dont une bande **« non classé »** hachurée pour les cultures absentes de `scripts/families.csv` (table éditoriale auditable, 104 cultures). Le graphique réutilise l'échelle `src/timeline/scale.js` (linéaire ou récents), possède sa propre minimap, des étiquettes directes, des tooltips « famille · population · part · source », une table miroir et le clavier ←/→ / Début / Fin. Un clic sur un ruban amène le globe à l'année correspondante ; `?histomap=1&year=1500` ouvre directement le mode. D3 v7 local (ISC, `vendor/`), chargé à la demande, zéro réseau externe.

## Lignée d'un item et Histographie

Les récits `?report=dauphine` et `?report=catholicisme` sont générés depuis l'**article Wikipédia FR complet** par le profil §17 du harnais Noeta v2.3 : un jalon = une section d'article (29 sections pour le Dauphiné, 21 pour le Catholicisme), texte conservé et attribué **CC BY-SA 4.0**, chrome d'origine supprimé, illustrations WebP ≤ 25 Ko incorporées avec crédit et licence. `npm run report:build [-- --offline]` régénère les deux fragments via `node ~/Projects/noeta/bin/noeta.mjs wiki …` ; les pages brutes sont mises en cache dans `~/Projects/noeta/docs/wiki-cache/`, et la convergence avec Grokipedia est archivée dans `~/Projects/noeta/docs/wiki-convergence/`. Grokipedia reste préférée pour l'interprétation des points communs, sans reproduction de sa prose ; les points contestés (prix de 1349, effectifs, date du mot « catholicisme ») sont décidés et affichés dans chaque rapport. Les preuves Noeta sont vertes (`spec` 24/24, `scrolly-probe` et `prove`).

Le sélecteur d'année reste un filtre de découverte des items ; il n'ancre pas le récit. Figure épinglée avec progression par section, readout `role="status"`, navigation clavier ↑/↓, `prefers-reduced-motion`. Le HTML livré à l'app est un fragment sans `<script>` inline : le runtime est le module local `src/reports/scrolly.js`, compatible avec la CSP `script-src 'self'`. Les deux récits sont accessibles depuis le panneau **Affichage → Récits d'un item**, depuis la fiche du Dauphiné, et depuis les repères « Religions » de la frise Histographie. Les anciens récits composés à partir des seules séries Chronas ne sont plus livrés.

`PixiTimeline` est désormais la couche visuelle de la frise principale, de la chronologie de province, du panneau Histographie et de l'Histomap ; le champ sujet utilise le même empilement Pixi. Les anciens repères DOM sont conservés dans le document pour les tests et l'accessibilité mais ne sont plus dessinés en doublon.

Le moteur temporel partagé est `PixiTimeline` (`src/timeline/pixi-timeline.js`) : un canvas Pixi paramétré par ses événements, sa plage, son mode et son thème. Les points sont **empilés symétriquement depuis l'axe y=0** par colonne d'année, sans position aléatoire ; la hauteur d'une colonne traduit sa densité. La palette est rose en thème clair, sombre en thème sombre. La frise principale utilise déjà ce moteur en couche visuelle.

Cliquer une province cartographiée ouvre désormais le **mode sujet** (`?subject=dauphine`) à la place de la fiche : un champ PixiJS reprenant la direction artistique d'Histography, avec des **carrés** pour les articles Wikipédia archivés localement, un double curseur d'années et un mode « Récits ». La stack d'origine (jQuery 1.10.2 + PixiJS 3) est archivée dans `docs/histography-source/` avec les empreintes et l'accord explicite de l'utilisateur ; les appels distants en ont été retirés. Dauphiné est le pilote (19 articles) ; `node scripts/build-subject.mjs <item> "<requête>"` génère les autres sujets à la demande. Les 13 commandes secondaires sont regroupées dans le bouton **⋯ Outils**, et toutes les croix de fermeture sont en haut à droite.

Le bouton **HIST** (`?histography=1`) ouvre une frise d'événements dans l'esprit d'Histography : champ gris, points blancs, menu sombre, pied à deux bornes d'années, curseur vertical et fiche d'événement. Les catégories (guerres, empires, ruptures, provinces) filtrent les 560 épiques Chronas et les 49 ruptures ; les époques déplacent la plage. Le bouton « Lire les récits → » bascule vers un flux éditorial déterministe groupé par époque (ruptures et faits de province prioritaires, puis échantillonnage régulier), où chaque carte ouvre le récit lié. Sur mobile, le menu passe en tiroir. **Réimplémentation originale** : le site de référence ne publie aucune licence, donc aucun code ni asset n'a été copié (spécification et observations dans `docs/architecture/HISTOGRAPHE-SPEC.md`).

## Qualité des données

Le bouton `⚑` ouvre un rapport d'**extraits Chronas** : 1 372 changements de capitale sans changement de souverain, avec l'année et la province. `scripts/build-data-quality.mjs` produit aussi la couverture des champs par siècle et les index des souverains et cultures les plus présents en 1000, 1500 et 2000 ; ces index alimentent la recherche locale. `npm run quality:build`, `npm run test:quality` et `npm run test:snapshot` garantissent un rapport reproductible, résumé dans `data-snapshot.sha256`. Aucun de ces chiffres n'est présenté comme validé historiquement.

## Interface mobile et navigation

Sous 760 px, la fiche de région s'ouvre en **plein écran** avec un bouton Fermer (`Échap` fonctionne aussi) ; la timeline et les contrôles sont masqués pendant la lecture. Une fois fermée, la frise devient compacte (156 px, année + curseur + lecture sur une ligne) et le readout tient sur deux lignes à gauche des boutons de zoom. Le bouton `☷` ouvre le panneau « Affichage » qui regroupe couleurs, libellés et épiques ; les boutons `+`, `−` et `⌖` pilotent le zoom et le recentrage avec des cibles de 44 px.

La navigation de la sphère a été affinée : molette/D trackpad zooment vers le curseur, double-clic zoom, `Maj+flèches` tourne finement, `R` recentre, le tactile a une sensibilité réduite et un rayon de sélection de 20 px. Les capitales se choisissent au doigt comme à la souris.

Sur téléphone, les gestes sont désormais déterministes (P14) : un **double-tap** zoome d'un seul cran (+0,8) sans sélectionner, un **tap à deux doigts** zoome en arrière (−0,8), et un tap simple sélectionne après 600 ms. Le pincement et le glisser restent disponibles ; un taper après pincement sélectionne normalement.

Les épiques se filtrent par catégorie (la minimap se recalcule), les ruptures exposent leurs provinces comme raccourcis, `Alt+←/→` parcourt l'historique des années et des provinces, les arcs portent des marqueurs interactifs, et les libellés projected évitent les collisions en priorisant les groupes les plus étendus.

Sur mobile, quatre actions primaires (recherche, affichage, récits, apprentissage) sont dans la zone pouce ; les bascules secondaires se déplient depuis le panneau Affichage ou par appui long. Les 49 ruptures sont aussi accessibles dans un tiroir vertical par siècle. Le clavier utilise un `roving tabindex` (34 arrêts au lieu de 151) et deux liens d'évitement. `Ctrl+K` inclut les bascules secondaires. Sous `?devtools=1`, la latence du dernier geste est affichée et `npm run test:ergonomics` mesure 20 répétitions par option.

La frise peut zoomer sur un seul siècle (101 crans), le bouton `A/B` compare deux années, la dimension **Empire** isole les provinces d'un même souverain, la recherche trouve aussi les souverains et cultures de l'année, et un clic sur un ruban Histomap ouvre le récit correspondant. Le panneau **Affichage** (bouton `☷`, présent sur desktop et mobile) regroupe les outils : recentrer, revenir à 1000, copier le lien, plein écran et **mode zen** (`Z`). `Ctrl+K` ouvre la recherche et un seul panneau peut être ouvert à la fois.

## Mode révision active

Le bouton **✦** (touche `É`) ouvre un mode d'apprentissage par rappel actif : **9 245 questions** générées localement à partir des données Chronas, 5 types (capitales, souverains, cultures, religions, événements), 4 réponses, feedback immédiat et source affichée. La progression suit un Leitner à 5 boîtes (1/3/7/16/35 jours) stocké dans `localStorage`. Chaque session de 10 cartes est entrelacée et reproductible via une graine affichée (`20261121`). Les cartes fausses reviennent en boîte 1 ; les cartes justes montent d'une boîte. Aucun appel réseau, aucune donnée inventée. Les questions dérivées restent sous CC BY-SA 4.0 comme les données source.

## URL

Format Chronas conservé :

```
http://127.0.0.1:4181/index.html?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000
```

- `value` : région sélectionnée (ex. `Berry`, capitale Bourges) ; un marqueur doré la situe sur la sphère.
- `pos` : `lat,lon,zoom` de la caméra, synchronisé à chaque déplacement.
- `year` : année affichée. Le snapshot embarqué contient **l'an 1000** : 2 429 régions et 2 492 géométries.
- `report=dauphine` : ouvre la lignée scrollytelling du Dauphiné.
- `histography=1` : ouvre la frise d'événements Histographie. Plusieurs panneaux ne peuvent pas être ouverts en même temps.

Le format est aussi accepté dans le hash (`#type=area&…`) pour compatibilité avec les anciens liens.

## Commandes

| Action | Souris / tactile | Clavier |
|---|---|---|
| Tourner la sphère | glisser | `←` `→` `↑` `↓` |
| Zoomer | molette / pincement | `+` `−` |
| Sélectionner une région | clic sur un contour | `/` puis recherche + `Entrée` |
| Aide | bouton `?` | `?` |
| Fermer un panneau | — | `Échap` |

Au repos, la sphère tourne lentement ; le mouvement s'arrête au premier geste et respecte `prefers-reduced-motion`. Le HUD se réduit au titre, à la fiche de région et aux boutons d'aide.

## Rendu

- `public/three-bundle.js` : Three.js **r180 local**, bundle ESM tree-shaké (126 Ko gzip), licence **MIT** (voir `ATTRIBUTION.md`). Aucun CDN, aucun script global.
- `src/globe/lonlat.js` : conversions pures longitude/latitude ↔ vecteur 3D, convention UV alignée sur la texture.
- `src/globe/texture.js` : fond océan + graticule uniquement (2048×1024), sans binaire ni réseau.
- `src/globe/vector-provinces.js` : maillage GPU des 2 492 provinces (16 741 triangles), triangulé une fois par changement d'année ou de dimension. Les frontières restent nettes à tout zoom ; la caméra est bornée à **zoom 6**.
- `src/globe/globe.js` : une seule boucle rAF (pause sur `document.hidden`), Halo atmosphérique, champ d'étoiles déterministe, picking par raycast puis test de polygone, DPR ≤ 2.

## Pont Three.js pour OpenCode

Le MCP `threejs-devtools-mcp` est lancé par `scripts/bridge-mcp.mjs` : il démarre le serveur local sur 4181 si besoin, puis le MCP avec `DEV_URL=http://127.0.0.1:4181/?devtools=1`, un Chromium headless et le CDP sur 9229. Le proxy du pont écoute sur 9222. `?devtools=1` n'assouplit la CSP que pour ce proxy local ; la CSP de production reste stricte.

```bash
npm run bridge:check   # config MCP, wrapper, CSP production/dev, proxy si actif
```

## Vérifier

```bash
npm run check
```

`npm run check` ne demande aucun terminal annexe : les harnais e2e, perf et pwa démarrent leur propre serveur loopback (ports 4186, 4187, 4188) et l'arrêtent en sortie. Le gate de design (`npm run design:gate`) balaie 23 états de l'app (tous les panneaux, les deux thèmes implicitement via les états pilotés, les deep links) aux deux viewports imposés, puis contrôle les deux fragments de récit ; il réutilise `~/.config/opencode/design/apple-design-gate.sh` sans dupliquer les 60 règles universelles. Les règles non mesurables par le script restent `notMeasured`, jamais déclarées vertes.

| Commande | Rôle |
|---|---|
| `npm run verify` | snapshot, licence, roundtrip lon/lat, zéro réseau runtime, syntaxe, ids DOM |
| `npm run test:scale` | échelle de la frise : bornes, monotonie, aller-retour, mode récents |
| `npm run trails:build` | régénère `src/data/trails.js` depuis `content/trails/*.json`, preuve à l'appui |
| `npm run test:trails:data` | 70 jalons : provinces existantes, preuves Chronas, SHA-256 |
| `npm run test:trails` | parcours des récits : navigation, deep link, mobile |
| `npm run points:build` | recalcule les 49 ruptures depuis les chunks, avec SHA-256 |
| `npm run test:points` | règle ADR-0012, bornes, espacement, reproductibilité |
| `npm run test:points:ui` | badges, clic, fiche, deep link, timeline mobile |
| `npm run test:arcs` | simultanéités : bascule, arcs WebGL, clavier, deep link, mobile |
| `npm run report:build [-- --offline]` | régénère les deux récits depuis les articles Wikipédia complets via le harnais Noeta v2.3 |
| `node ~/Projects/noeta/bin/noeta.mjs wiki <url> <sortie.html>` | transforme un article en récit scrolly autonome (profil §17) |
| `npm run histomap:build` | régénère histomap.json depuis les chunks et families.csv |
| `npm run test:histomap` | données : 161 échantillons, SHA-256, budget 80 Ko |
| `npm run test:histomap:ui` | rubans D3, tooltips, clavier, minimap, deep link, mobile |
| `npm run quality:build` | couverture, anomalies souverains et index de référence |
| `npm run test:quality` | contrat du rapport qualité et reproductibilité |
| `npm run test:challenges` | défis d'apprentissage : graine, heatmap, objectifs |
| `npm run test:throttle` | budget sous CPU x4 et réseau lent |
| `npm run test:globe` | détails du rendu : focus empire, arcs, ombre |
| `npm run test:offline` | deep links repris hors ligne depuis le cache PWA |
| `npm run test:a11y` | noms, rôles, contraste et panneaux accessibles |
| `npm run test:snapshot` | empreinte déterministe des données générées |
| `npm run licenses:check` | mentions de licence dans les livrables |
| `node tests/http-guards.mjs` | vrai serveur : whitelist, en-têtes, entrées malformées, survie |
| `npm run test:live` | gate live 1440×1000 et 390×844 : cibles ≥ 44 px, collisions HUD, débordement, console, réseau |
| `npm run design:gate` | gate de design universel : 23 états × 2 viewports (dont le mode sujet) + les deux fragments de récit |
| `node scripts/build-subject.mjs <item> "<requête>"` | génère le jeu d'articles Wikipédia local d'un sujet |
| `npm run test:e2e` | deep link, WebGL, fiche, clavier, recherche, aide, révision |
| `npm run test:perf` | budget < 50 requêtes / < 1 Mo |
| `npm run test:pwa` | manifest, cache versionné, survie hors ligne |
| `npm run test:devtools` | pont Three.js injecté avant chargement, API in-page |
| `npm run bridge:check` | configuration du pont OpenCode et CSP production/dev |

Budget mesuré : **38 requêtes / 516 Ko** à la première visite (Three.js et D3 locaux compris), **56 Ko** en régime établi. Le serveur écoute uniquement sur `127.0.0.1`.

## Mises à jour et cache

`npm run build:pages` calcule un hash SHA-256 de tous les fichiers publiés. Ce hash devient le nom du cache du service worker (`vectemporel-<hash>`) et est ajouté aux URLs des assets dans `index.html` (`?v=<hash>`). À chaque déploiement, les anciens caches `vectemporel-*` sont supprimés lors de l'activation du service worker, et les assets sont récupérés avec `cache: 'reload'` plutôt que depuis le cache HTTP de GitHub Pages (`max-age=600`).

Côté client, lorsqu'un nouveau service worker prend le contrôle d'une page déjà ouverte, l'application se recharge **une seule fois** (garde-fou `sessionStorage`) pour afficher immédiatement la nouvelle version. Le hash est stable si le contenu ne change pas, et change dès qu'un fichier publié est modifié.

## Structure

```text
index.html                  canvas plein écran + HUD
styles.css                  HUD minimal
src/
  app.js                    composition root, URL, HUD, clavier
  globe/{globe,lonlat,texture}.js
  map/{data,projection}.js  données partagées
  data/chronas-map.js       géométrie partagée, générée
  data/chronas-cities.js    capitales historiques, générée
  data/years/               41 chunks de siècle, générés
  data/year-store.js        reconstruction des années
public/three-bundle.js      Three.js r180 tree-shaké (MIT)
scripts/                    serve, build-pages, import, verify
tests/                      e2e, perf, pwa, guards
docs/architecture/          ADR, scorecard, roadmap, risques
docs/veille/                rapport Chronas / Histography
archive/v0-atlas/           application originelle
archive/v1-map-2d/          version cartographique plate
```

## Documentation

- `docs/ABOUT.md` — ce que contient l'atlas et pourquoi.
- `docs/ARCHITECTURE.md` — comment c'est fait.
- `docs/LIMITES.md` — angles morts et ce que l'application ne prouve pas.
- `docs/GLOSSAIRE.md` — vocabulaire des épiques, ruptures, extraits et du SRS.
- `docs/FAMILLES.md` — règles de regroupement des cultures et couverture mesurée.
- `docs/UI-MAP.md`, `docs/COMPONENTS.md`, `docs/STYLEGUIDE.md` — carte des écrans, composants et tokens.
- `docs/TUTORIEL.md` — tutoriel en cinq écrans et didacticiel des ruptures.
- `RELEASE.md` — procédure de publication ; `CONTRIBUTING.md` — règles de contribution.
- `CHANGELOG.md` — historique des versions ; `LICENSES.md` — tableau consolidé des licences.

## Licences

- Code de l'application : **MIT** (`LICENSE`), Three.js r152 inclus.
- Données importées : **CC BY-SA 4.0** (`DATA-LICENSE.md`), © Chronas, Wikipédia, OpenHistoricalMap, Natural Earth — voir `ATTRIBUTION.md`.
- Le frontend de Chronas n'a aucun fichier `LICENSE` : **aucun code n'a été copié**. L'URL est reproduite pour compatibilité uniquement.
