# Récit — périodes, panorama, lieux

> **Design v1.0 — 17 novembre 2026.** Parcours narratif de Vectemporel.
> Il s’ouvre au chargement, avant la queue du dragon.

---

## 1. Pourquoi trois étapes

Une frise dense est excellente pour chercher, mauvaise pour raconter. Le mode **Récit** découpe la lecture en trois gestes cognitifs simples :

1. **Choisir une période** : 5 à 9 cartes, une par ère, avec dates, nombre de repères et image de couverture.
2. **Écouter le panorama** : les repères de l’ère défilent comme un mini-film, un événement à la fois, avec une grande image et le récit découpé en phrases animées.
3. **Voyager de lieu en lieu** : les lieux vérifiés de l’ère sont placés sur une carte avec des coordonnées réelles ; la caméra passe de l’un à l’autre.

Chaque étape répond à une question différente : *quand*, *quoi*, *où*. On ne demande jamais à un même écran de faire les trois.

---

## 2. Clavier d’abord

Aucune action n’exige la souris. Le focus est visible et déplacé à chaque rendu.

| Touche | Périodes | Panorama | Lieux |
| --- | --- | --- | --- |
| `←` `→` | changer de période | repère précédent / suivant | lieu précédent / suivant |
| `↑` `↓` | — | période précédente / suivante | — |
| `1`–`9` | période directe | — | — |
| `Entrée` | entrer dans le récit | explorer les lieux | retour au repère |
| `Espace` | — | lecture automatique (5,5 s) | — |
| `Échap` | fermer le récit | revenir aux périodes | revenir au panorama |
| `?` | aide | aide | aide |
| `Tab` | navigation des boutons | navigation des boutons | navigation des boutons |

Depuis la queue du dragon, la touche `R` ouvre le récit. Le focus est piégé dans l’overlay et dans l’aide.

---

## 3. Étape 1 — périodes

Chaque carte porte :

- le nom de l’ère et sa plage de dates ;
- le nombre de repères et de lieux ;
- une image de couverture tirée d’un repère de l’ère ;
- la couleur de l’ère.

La flèche de déplacement, le surlignage et le compteur de dots disent où l’on est. `Entrée` ouvre l’ère.

---

## 4. Étape 2 — panorama

Un repère = un plan. Le plan contient :

- une **grande image** (toutes les images sont vérifiées, voir `EVENT_IMAGES.md`) ;
- l’**année** en typographie dorée ;
- le **titre** et le **sous-titre** ;
- le **résumé découpé en phrases**, révélées les unes après les autres ;
- les **tags**, le **crédit image**, les **figures et lieux** de l’ère ;
- un bouton « Explorer les lieux ».

Une pellicule en bas donne accès à tous les repères de l’ère. La lecture automatique (`Espace`) enchaîne les plans toutes les 5,5 secondes.

**Règle d’honnêteté** : le texte affiché est exactement celui des repères vérifiés. Aucune anecdote n’est fabriquée. L’écran le dit explicitement : « Récit construit à partir des repères vérifiés · aucune anecdote inventée ».

---

## 5. Étape 3 — lieux

`place-atlas.js` est généré depuis les dossiers d’audit et les **coordonnées de l’API Wikipedia** (fr puis en). **114 lieux sur 120** sont localisés ; les 6 autres gardent leur fiche mais n’ont pas de point, aucune position n’étant inventée.

La vue utilise un **fond satellite réel** (Esri World Imagery, avec attribution visible) exporté pour la zone courante. Les marqueurs viennent de l’atlas vérifié. L’emprise est calculée sur le **contour principal** du pays : les territoires d’outre-mer n’élargissent pas la carte et n’attirent pas de lieux extérieurs. Trois périmètres sont distingués : lieux liés à l’ère, contexte du pays, lieux hors territoire (non affichés par défaut).

La carte projette les lieux de l’ère, trace un chemin pointillé chronologique et anime un zoom de 1,25× vers le lieu sélectionné. Le panneau latéral donne :

- le nom actuel et les noms historiques ;
- la hiérarchie, les fonctions, les contestations de mémoire ;
- les repères qui se sont passés précisément là ;
- un lien vers la source Wikipedia de la coordonnée.

Quand une ère n’a aucun lieu associé dans le corpus, l’atlas du pays entier sert de contexte géographique, sans prétendre que tous les lieux appartiennent à l’ère.

---

## 6. Fichiers

- `story.js` — trois modes, clavier, animation, périmètres ;
- `satellite-map.js` — fond satellite, marqueurs, chemin, zoom ;
- `place-atlas.js` — coordonnées et contours générés ;
- `scripts/build-place-atlas.mjs` — générateur (`npm run build:places`) ;
- `PLACE_ATLAS.md` — couverture et lieux non localisés ;
- `styles.css` — thème des trois étapes et responsive ;
- `index.html` — bouton « Récit », overlay, aide clavier.

---

## 7. Limites

- Le récit ne réécrit pas les sources : il les met en scène.
- Les lieux sans coordonnée vérifiée ne sont pas placés sur la carte.
- Le contour du pays est une généralisation 110 m : il donne le repère géographique, pas une précision cartographique.
- La lecture automatique est un aidant, pas un automatisme : elle peut être arrêtée à tout moment.
