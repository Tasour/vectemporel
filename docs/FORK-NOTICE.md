# v0-local — miroir local du fork Chronas

La branche `v0-local` part du fork intégral de `Chronasorg/chronas-frontend` (commit amont `3a7f784`), sans modification de l'interface React, MapLibre ou deck.gl.

## Périmètre

- Le code source du fork reste inchangé, hormis la configuration `.env.production`.
- L'API est reproduite localement dans `api/v1/` à partir de réponses réelles extraites de `https://d24mkpax7rmotx.cloudfront.net/v1` : 4 001 années, marqueurs et métadonnées.
- Chaque réponse est horodatée et checksummée dans `api/MANIFEST.json`.
- Un service worker (`public/mirror-sw.js`) sert ces réponses ; aucun appel réseau externe de l'application.
- Les chemins absolus du bundle sont corrigés au moment de la préparation des pages GitHub Pages par `scripts/patch-pages.mjs`.
- Google Analytics est retiré de la configuration.

## Licence

Aucun fichier `LICENSE` n'est détecté sur le dépôt amont au moment du fork. L'utilisateur a explicitement assumé le risque légal de la reprise du code. Aucune affirmation de licence n'est faite ici.

## Ancienne version

L'atlas Vectemporel précédent est conservé tel quel sur la branche `atlas-legacy` (`762a0ca`).

## Limite connue

Les tuiles du fond de carte (`tiles.openfreemap.org`, données Natural Earth / OpenStreetMap) restent chargées depuis le réseau : ce sont des ressources de la stack MapLibre du fork, pas des endpoints de l'API Chronas. Le miroir local couvre l'API (8 023 réponses), pas les tuiles cartographiques.
