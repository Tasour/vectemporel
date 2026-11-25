# v0-local — miroir local du fork Chronas

La branche `v0-local` part du fork intégral de `Chronasorg/chronas-frontend` (commit amont `3a7f784`). L'interface React, MapLibre et deck.gl sont depuis largement adaptés pour l'usage local : voir les sections « Interface locale v0 » et « Architecture locale ».

## Périmètre

- Les endpoints de l'API sont redirigés vers le miroir local, sans dépendance au réseau pour les données.
- L'API est reproduite localement dans `api/v1/` à partir de réponses réelles extraites de `https://d24mkpax7rmotx.cloudfront.net/v1` : 4 001 années, marqueurs et métadonnées.
- Chaque réponse est horodatée et checksummée dans `api/MANIFEST.json`.
- Un service worker (`public/mirror-sw.js`) sert ces réponses ; aucun appel réseau externe de l'application.
- Les chemins absolus du bundle sont corrigés au moment de la préparation des pages GitHub Pages par `scripts/patch-pages.mjs`.
- Google Analytics est retiré de la configuration.

## Licence

Aucun fichier `LICENSE` n'est détecté sur le dépôt amont au moment du fork. L'utilisateur a explicitement assumé le risque légal de la reprise du code. Aucune affirmation de licence n'est faite ici.

## Ancienne version

L'atlas Vectemporel précédent est conservé tel quel sur la branche `atlas-legacy` (`762a0ca`).

## Interface locale v0

- La bannière d'annonce, les entrées `Support Chronas` et `Logout`, ainsi que le contrôle d'attribution de MapLibre ont été retirés à la demande explicite de l'utilisateur.
- Les contrôles de timeline existants sont conservés.
- Les entrées `Discover`, `Random Article` et `Collections` sont réactivées et alimentées par le miroir local.
- `Découvrir` propose trois onglets : Articles, Époques, Régions.
- `Téléchargements` est accessible depuis Découvrir et Configuration : sélection arbitraire continent → époque → groupe → provinces, persistée en `localStorage` et exportable en JSON.
- Les collections (provinces + articles) sont persistées localement.

### Risque juridique assumé

L'utilisateur a explicitement demandé la suppression des attributions affichées sur la carte. Natural Earth, OpenMapTiles et OpenStreetMap peuvent imposer une attribution visible selon leurs conditions d'utilisation. Ce retrait est donc un choix assumé, documenté ici, et non une omission involontaire.

## Articles locaux

- Catalogue généré par `node scripts/build-catalog.mjs` depuis le miroir API : 2 338 groupes, 4 001 années, SHA-256 dans `public/articles/catalog.json`.
- Extraction via `python3 scripts/extract-wiki.py scripts/selection-example.json` : endpoint REST `summary` de Wikipédia FR, avec reprises et journal des échecs dans `public/articles/FAILURES.json`.
- Les vignettes sont converties en WebP ≤ 25 Ko et inlinées. Le crédit réel (auteur, licence, page Commons) est récupéré via l'API Wikimedia Commons ; une image sans crédit valide est écartée.
- `node scripts/finalize-articles.mjs` vérifie chaque SHA-256, la taille des images et la présence des crédits avant de reconstruire `public/articles/MANIFEST.json`.
- Les liens Wikipédia ne sont plus chargés au runtime : ils ne s'ouvrent que sur clic explicite, dans un nouvel onglet.

## Architecture locale

- Le français est la langue par défaut (`DEFAULT_LOCALE`), y compris pour le document HTML et les métadonnées.
- La navigation basse est un conteneur unique inséré sous la timeline ; la timeline se décale de sa hauteur mesurée.
- La timeline porte une surcouche de graduations et de grandes périodes, sans capter les gestes.
- La cinématique `vitesse → date + zoom` et son calibrage sont décrits dans `docs/ERGONOMIE-TIMELINE.md` ; les tests d'ergonomie couvrent 390×844, 1658×1150 et le tactile.
- Les aires sont servies par un pack binaire préchargé (`docs/ATLAS-PACK.md`) : 886 Ko au lieu de 110 Mo, décodage < 1 ms par année.
- Le reset de cache d'un nouveau build s'exécute avant le montage React ; une requête d'aires en vol ne peut plus être invalidée par le reset.
- Les frontières internes utilisent la couleur résolue de l'ensemble assombrie de 18 % (facteur 0,82), jamais un noir opaque.
- Les libellés d'entités sont en français : noms `*_fr` de l'API complétés par `src/data/frenchNames.ts` (couverture mesurée dans `docs/FR-LABELS-COVERAGE.md`).
- Le changement d'année est mesuré par `performance.mark/measure`. Cache LRU dans le service worker et le store, préchargement des années voisines, mutation GeoJSON sur place.
- **Rust/Wasm écarté** : le profil (18–50 ms à froid, 12–17 ms en cache) montre que le coût dominant est le décodage/rendu, pas le calcul JS. Le gain attendu d'un module Wasm ne justifie pas son poids ni la conversion des 4 001 fichiers. Réévaluation seulement si le p95 après cache dépasse 8 ms hors rendu MapLibre.

## Vérification de design

Le gate Apple v1.9.0 sur l'application en 1658×1150 et 390×844 rend **P0 = 0**, **P1 = 0**, **P2 = 0**.

## Paquet de téléchargement

Le bouton de téléchargement assemble un JSON local par langue : fiches sélectionnées, vignettes/crédits inlinés, source et `locale`. Aucun appel réseau supplémentaire. Les extraits conservent la langue de leur source d’extraction (`en.wikipedia.org`) ; seule l’étiquette du paquet et l’interface sont françaises par défaut.

## Limite réseau connue

Les tuiles du fond de carte (`tiles.openfreemap.org`, données Natural Earth / OpenStreetMap) restent chargées depuis le réseau : ce sont des ressources de la stack MapLibre du fork, pas des endpoints de l'API Chronas. Le miroir local couvre l'API (8 023 réponses), pas les tuiles cartographiques.
