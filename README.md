# Histoire du monde — Atlas historique

Application web **une seule vue** : la carte mondiale des régions historiques. Aucun framework, aucune dépendance runtime, aucun appel réseau à l'exécution. Les données sont générées au build depuis l'API publique de Chronas (CC BY-SA 4.0) et embarquées dans le bundle.

> L'ancien atlas (6 vues, lentilles d'audit, audits, captures) est conservé sans suppression dans `archive/v0-atlas/`. Les décisions sont documentées dans `docs/architecture/`.

## Lancer

```bash
npm install
npm start                 # http://127.0.0.1:4181
```

Pour régénérer les données (build-time, réseau autorisé uniquement ici) :

```bash
npm run map:data          # -> src/data/chronas-map.js (592 Ko, année 1000)
npm run build:pages       # -> dist-pages/ pour GitHub Pages
```

## URL

Format identique à celui de Chronas :

```
http://127.0.0.1:4181/index.html?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000
```

- `value` : région sélectionnée (ex. `Berry`, dont la capitale est Bourges).
- `pos` : `lat,lon,zoom` de la caméra (Mercator, zoom 0–8).
- `year` : année affichée. Le snapshot embarqué contient **l'an 1000** : toutes les régions (2 429) et leurs géométries (2 492 polygones).

L'URL est mise à jour à chaque sélection et chaque déplacement de la carte. Le format `pos` est aussi accepté dans le hash (`#type=area&…`) pour rester compatible avec les anciens liens.

## Interactions

- Clic sur un polygone : sélection de la région, panneau avec État, culture, religion, capitale et population.
- Molette, boutons `+`/`−`, glisser : zoom et déplacement.
- Clavier : la carte est focalisable ; flèches = déplacement, `+`/`−` = zoom. La recherche propose jusqu'à 8 régions, navigables avec les flèches et validées par `Entrée`.
- `✦ Hasard` : sélection déterministe (graine `20261121`) — aucun `Math.random()`.
- `↺ Recentrer` : recadre sur la région sélectionnée.

Le rendu est un **canvas statique** redessiné uniquement après interaction : aucune boucle rAF continue. Le service worker met les ressources locales en cache ; l'app fonctionne hors ligne.

## Vérifier

```bash
npm run check
```

| Commande | Rôle |
|---|---|
| `npm run verify` | cohérence du snapshot, licence, coordonnées finies, zéro réseau runtime, syntaxe, ids DOM uniques |
| `node tests/http-guards.mjs` | vrai serveur : whitelist, en-têtes, entrées malformées, survie |
| `npm run test:e2e` | deep link, panneau, zoom, clavier, recherche, hasard |
| `npm run test:perf` | budget réseau < 50 requêtes / < 1 Mo |
| `npm run test:pwa` | manifest, cache versionné, survie hors ligne |

Budget mesuré : **10 requêtes / 208 Ko** à la première visite, **0 Ko** en régime établi (service worker). Le service écoute uniquement sur `127.0.0.1` et ne sert que `index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, `public/**`, `src/**`, `icons/**`.

## Structure

```text
index.html                  entrée unique
styles.css                  tokens + mise en page carte
src/
  app.js                    composition root, URL, recherche, panneau
  map/
    projection.js           Mercator pur (projection, zoom, hit-testing)
    data.js                 accès au snapshot, recherche, couleurs
    renderer.js             canvas, pan/zoom, sélection
  data/
    chronas-map.js          généré — NE PAS ÉDITER
scripts/
  import-chronas-map.mjs    import borné et déterministe
  serve.mjs                 serveur local whitelisté
  build-pages.mjs           génération du site statique
  verify.mjs                vérification statique
tests/                      e2e, perf, pwa, guards HTTP
docs/architecture/          ADR, état courant, roadmap, risques, scorecard
docs/veille/                rapport Chronas / Histography
archive/v0-atlas/           ancienne application, conservée
```

## Licences

- Code de l'application : **MIT** (`LICENSE`).
- Données importées : **CC BY-SA 4.0** (`DATA-LICENSE.md`), © Chronas, Wikipédia, OpenHistoricalMap, Natural Earth — voir `ATTRIBUTION.md`.
- Le frontend de Chronas n'a aucun fichier `LICENSE` : **aucun code n'a été copié**. L'interaction est une réimplémentation originale (clean-room). Les paramètres d'URL sont reproduits pour compatibilité.
