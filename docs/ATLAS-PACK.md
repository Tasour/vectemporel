# Modèle binaire préchargé de l'atlas

Objectif : changer la date sans requête réseau et sans décodage JSON, pour un
affichage quasi instantané.

## Pourquoi c'est possible

Sur les 4 001 années du miroir, **18,4 provinces changent par année en moyenne**
(0,8 %). Les fichiers `areas/*.gz` répètent donc 99,2 % de données identiques.

| Données | Taille |
|---|---:|
| 4 001 fichiers `areas/*.gz` | 110 Mo |
| Pack binaire brut | 1,99 Mo |
| **Pack binaire gzip** | **886 Ko** |
| Keyframes | 49 (tous les 100 ans) |
| Dictionnaires | 2 429 provinces, 1 747 dirigeants, 541 cultures, 63 religions, 4 716 capitales |

## Format

- en-tête `VAP1` : version, bornes d'années, nombre de provinces, tailles des
  dictionnaires, longueur du flux, table des keyframes ;
- dictionnaires de chaînes (province + 4 dimensions) ;
- table des keyframes : année + offset ;
- flux :
  - **keyframe** (tous les 100 ans ou après un saut massif) : 2 429
    enregistrements `(province u16, r u16, c u16, e u16, capitale u16, population u32)` ;
  - **delta annuel** : année, nombre de changements, puis par province un
    masque de champs et les nouvelles valeurs. Un delta vide coûte 5 octets.

Le décodage part du keyframe ≤ année demandée et applique les deltas jusqu'à
l'année. Cas courant : 18 changements.

## Génération et vérification

```bash
npm run pack:build    # écrit public/atlas-pack/atlas-v1.bin.gz + manifest + version
npm run pack:verify   # compare 8 années témoins aux fichiers sources
```

Le script `scripts/build-atlas-pack.mjs` reconstruit les dictionnaires, les
keyframes et les deltas depuis `api/v1/areas/*.gz`.
`scripts/verify-atlas-pack.ts` décode le pack et compare les 2 429 provinces de
8 années (dont 1714 et 2000) aux JSON d'origine.

## Chargement

`src/features/atlasPack/atlasPack.ts` :

- `ensureAtlasPack()` charge le pack une seule fois (886 Ko) ;
- `getYear(year)` décode l'année et mémorise la dernière ;
- si le pack est absent ou invalide, `loadAreaData` retombe sur l'API locale.

Le service worker met le pack en cache-first (`/atlas-pack/`), donc il est
disponible hors ligne. Le nom d'URL contient `?v=<hash>` : un nouveau pack est
téléchargé, l'ancien est purgé avec `BUILD_VERSION`.

## Mesures

Chromium, 390×844, 10 changements d'année :

| Mesure | Médiane | p95 |
|---|---:|---:|
| Décodage d'une année (`atlas-pack-year`) | 0,2 ms | 2,3 ms |
| Calcul des libellés (`atlas-labels`) | ~20 ms | ~60 ms (cache géométrique chaud) |
| Requêtes `/areas` | **0** | — |

Les centroïdes et surfaces des provinces sont calculés une seule fois
(`geometryCache`) : les années suivantes ne refont que le regroupement des
entités et le placement des libellés.

## Pack marqueurs

`markers-v1.bin.gz` (2,72 Mo compressés, 11,7 Mo bruts) contient **68 473
marqueurs uniques** et un index des 4 002 années. Le décodage d'une année prend
**0,4 ms** et aucune requête `/markers?year=` n'est émise. Vérification :
`npm run pack:markers:verify` compare 6 années (dont 1714 et 2000).

Le pack stocke `_id`, `name`, `coo`/`coo2`, `year`, `end` et `type`. Les champs
`names`/`capital` des fiches de villes restent servis par le fichier
« toutes les villes » (`markers?types=c…`), qui fournit les libellés
historiques.

## Limites

- Les tuiles du fond de carte restent réseau (ce ne sont pas des données
  Chronas).
- Un fichier `areas/*.gz` contient une valeur de population non numérique
  (`Azow`, 1714) ; le pack la normalise à 0 et le vérificateur le consigne.
- Le pack doit être régénéré si les données du miroir changent ; `pack:verify`
  échoue alors et le déploiement doit être bloqué.
