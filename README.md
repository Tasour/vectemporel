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

Les données sont générées au build (`npm run years:import`, import reprenable) puis stockées en 41 chunks de siècle chargés à la demande. Le snapshot de référence et les chunks sont servis localement : aucun appel réseau au runtime, PWA hors ligne conservée.

La barre de dimensions permet de colorer les régions par État, culture, religion, capitale ou population. Les capitales historiques sont chargées depuis `npm run cities:import` et filtrées sur les capitales politiques de l'année affichée (210 points en l'an 1000) : ce sont de petits disques, visibles seulement à partir du zoom 2,5. **Cliquer un disque sélectionne la région correspondante**. Au survol d'une région, une **bulle custom** discrète affiche son nom et sa culture ; la bulle native du navigateur reste désactivée. L'information détaillée reste dans la fiche et le `role="status"`. Le zoom maximal est de **7,2**. Le thème clair/sombre est conservé dans `localStorage`.

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

- `public/three.min.js` : Three.js **r152 local**, licence **MIT** (voir `ATTRIBUTION.md`). Aucun CDN.
- `src/globe/lonlat.js` : conversions pures longitude/latitude ↔ vecteur 3D, convention UV alignée sur la texture.
- `src/globe/texture.js` : fond océan + graticule uniquement (2048×1024), sans binaire ni réseau.
- `src/globe/vector-provinces.js` : maillage GPU des 2 492 provinces (16 741 triangles), triangulé une fois par changement d'année ou de dimension. Les frontières restent nettes à tout zoom ; la caméra est bornée à **zoom 6**.
- `src/globe/globe.js` : une seule boucle rAF (pause sur `document.hidden`), Halo atmosphérique, champ d'étoiles déterministe, picking par raycast puis test de polygone, DPR ≤ 2.

## Vérifier

```bash
npm run check
```

| Commande | Rôle |
|---|---|
| `npm run verify` | snapshot, licence, roundtrip lon/lat, zéro réseau runtime, syntaxe, ids DOM |
| `node tests/http-guards.mjs` | vrai serveur : whitelist, en-têtes, entrées malformées, survie |
| `npm run test:e2e` | deep link, WebGL, fiche, clavier, recherche, aide |
| `npm run test:perf` | budget < 50 requêtes / < 1 Mo |
| `npm run test:pwa` | manifest, cache versionné, survie hors ligne |

Budget mesuré : **17 requêtes / 466 Ko** à la première visite (Three.js compris), **0 Ko** en régime établi. Le serveur écoute uniquement sur `127.0.0.1`.

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
public/three.min.js         Three.js r152 (MIT)
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
