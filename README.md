# Histoire du monde — Sphère historique

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

Cinq parcours — **la route de la soie, le réveil de l'Islam, l'Europe des capitales, les villes du savoir, les empires d'Asie** — totalisent **35 jalons** dans `content/trails/*.json`. Le bouton `❖` (touche `T`) ouvre la liste ; chaque jalon amène la sphère à l'année et à la province concernées, puis affiche le récit, les faits Chronas à cette année et la preuve utilisée (`souverain « XIO » en -138`). La fiche de région reste fermée pendant le récit : le panneau tient lieu de lecture. `Précédent / Suivant / Quitter` et `Échap` pilotent la progression ; `?trail=soie&step=2` reprend un récit après rechargement.

Les récits ne sont pas du texte libre non vérifié : `scripts/build-trails.mjs` recalcule pour chaque jalon la valeur du champ Chronas déclaré à l'année indiquée et casse le build en cas d'écart. Un SHA-256 canonique est embarqué dans `src/data/trails.js` et contrôlé par `npm run test:trails:data`. Texte des récits sous licence MIT, données © Chronas CC BY-SA 4.0.

## Ruptures détectées

La frise porte aussi **49 points de rupture** calculés depuis les 41 chunks annuels (ADR-0012). Règle reproductible : une année où au moins 20 provinces changent de souverain, l'an 1 et les sauts de population $>10$ millions étant exclus comme artefacts de la source. Chaque badge affiche l'année, son nombre de régions et, au clic, amène le globe à l'année puis ouvre la fiche d'une province concernée. Le libellé dit explicitement **« extrait Chronas »** : c'est un constat sur la donnée, pas un récit historique. `?turn=751` sélectionne un point au chargement ; les badges sont des cibles de 44 px dans une bande défilante.

## Simultanéités

Le bouton `⌁` (touche `S`) affiche des arcs entre la province sélectionnée et jusqu'à quatre autres provinces qui partagent le même souverain l'année courante (`?arcs=1` au chargement). Les arcs sont des `LineSegments` dessinés dans le repère de la sphère, donc occlus correctement par le globe ; un seul rendu est déclenché par changement, aucune boucle d'animation supplémentaire. Le `role="status"` annonce la catégorie (souverain), la valeur (province) et l'unité (`hab`) de chaque lien. `prefers-reduced-motion` aplatit les arcs.

## Interface mobile et navigation

Sous 760 px, la fiche de région s'ouvre en **plein écran** avec un bouton Fermer (`Échap` fonctionne aussi) ; la timeline et les contrôles sont masqués pendant la lecture. Une fois fermée, la frise devient compacte (156 px, année + curseur + lecture sur une ligne) et le readout tient sur deux lignes à gauche des boutons de zoom. Le bouton `☷` ouvre le panneau « Affichage » qui regroupe couleurs, libellés et épiques ; les boutons `+`, `−` et `⌖` pilotent le zoom et le recentrage avec des cibles de 44 px.

La navigation de la sphère a été affinée : molette/D trackpad zooment vers le curseur, double-clic zoom, `Maj+flèches` tourne finement, `R` recentre, le tactile a une sensibilité réduite et un rayon de sélection de 20 px. Les capitales se choisissent au doigt comme à la souris.

Sur téléphone, les gestes sont désormais déterministes (P14) : un **double-tap** zoome d'un seul cran (+0,8) sans sélectionner, un **tap à deux doigts** zoome en arrière (−0,8), et un tap simple sélectionne après 600 ms. Le pincement et le glisser restent disponibles ; un taper après pincement sélectionne normalement.

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

`npm run check` ne demande aucun terminal annexe : les harnais e2e, perf et pwa démarrent leur propre serveur loopback (ports 4186, 4187, 4188) et l'arrêtent en sortie.

| Commande | Rôle |
|---|---|
| `npm run verify` | snapshot, licence, roundtrip lon/lat, zéro réseau runtime, syntaxe, ids DOM |
| `npm run test:scale` | échelle de la frise : bornes, monotonie, aller-retour, mode récents |
| `npm run trails:build` | régénère `src/data/trails.js` depuis `content/trails/*.json`, preuve à l'appui |
| `npm run test:trails:data` | 35 jalons : provinces existantes, preuves Chronas, SHA-256 |
| `npm run test:trails` | parcours des récits : navigation, deep link, mobile |
| `npm run points:build` | recalcule les 49 ruptures depuis les chunks, avec SHA-256 |
| `npm run test:points` | règle ADR-0012, bornes, espacement, reproductibilité |
| `npm run test:points:ui` | badges, clic, fiche, deep link, timeline mobile |
| `npm run test:arcs` | simultanéités : bascule, arcs WebGL, clavier, deep link, mobile |
| `node tests/http-guards.mjs` | vrai serveur : whitelist, en-têtes, entrées malformées, survie |
| `npm run test:live` | gate live 1440×1000 et 390×844 : cibles ≥ 44 px, collisions HUD, débordement, console, réseau |
| `npm run test:e2e` | deep link, WebGL, fiche, clavier, recherche, aide, révision |
| `npm run test:perf` | budget < 50 requêtes / < 1 Mo |
| `npm run test:pwa` | manifest, cache versionné, survie hors ligne |
| `npm run test:devtools` | pont Three.js injecté avant chargement, API in-page |
| `npm run bridge:check` | configuration du pont OpenCode et CSP production/dev |

Budget mesuré : **24 requêtes / 508 Ko** à la première visite (Three.js compris), **0 Ko** en régime établi. Le serveur écoute uniquement sur `127.0.0.1`.

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

## Licences

- Code de l'application : **MIT** (`LICENSE`), Three.js r152 inclus.
- Données importées : **CC BY-SA 4.0** (`DATA-LICENSE.md`), © Chronas, Wikipédia, OpenHistoricalMap, Natural Earth — voir `ATTRIBUTION.md`.
- Le frontend de Chronas n'a aucun fichier `LICENSE` : **aucun code n'a été copié**. L'URL est reproduite pour compatibilité uniquement.
