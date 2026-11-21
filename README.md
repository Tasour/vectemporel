# Vectemporel — Atlas

**Application unique.** L'ancien POC est archivé dans `~/Projects/_archive/vectemporel-poc` ; ses données sources (audits, repères, images) sont rapatriées dans `source/` pour que l'app soit autonome. Un seul service : `vectemporel-atlas.service` (port 4181).

Application reconstruite de zéro selon le plan `/home/tasour/.opencode/plan/V_ATLAS_PLAN.md`.

**Règle principale :** aucun lien Grokipedia, aucun service externe dans l’interface. Les points de connaissance sont générés depuis les audits locaux.

## Lancer

```bash
npm install
npm run build:data
npm run build:points   # fusionne les 56 ères × 14 domaines
npm run report:coverage  # régénère COVERAGE_POINTS.md
node scripts/reclassify-matrix.mjs  # recalcule les statuts des matrices (deterministe)
npm start
```

Ouvrir `http://127.0.0.1:4181`.

## Vérifier

```bash
node --check src/app.js
npm run check
```

- `node --check` valide la syntaxe du point de composition et de la taxonomie publique.
- `verify` contrôle le jeu de données, les images, les identifiants et l’absence de lien externe.
- `verify:points` contrôle la couverture des 14 domaines × 56 ères et **échoue** si une cellule manque ou si une anomalie est détectée ; il ne modifie aucun fichier.
- `report:coverage` régénère explicitement `COVERAGE_POINTS.md` (artefact, hors vérification).
- `test:e2e` parcourt le globe, la chronologie, le détail, le récit, la géographie et la constellation au clavier.
- `test:guards` vérifie le serveur sur un vrai processus : whitelist, en-têtes de sécurité, entrées malformées et survie.
- `test:coverage-guard` prouve par mutation que `verify:points` échoue quand une proposition disparaît.
- `test:idempotence` exécute deux générations complètes dans un répertoire temporaire et compare les hash des artefacts.
- `test:perf` mesure le budget réseau : **48 requêtes / 746 Ko** à la première visite (PWA comprise), contre 920 / 6,1 Mo au départ. Les visites suivantes sont servies par le service worker (0 octet transféré). Les deux seuils (50 requêtes, 1 Mo) sont tenus.

Les lentilles d'audit sont chargées à la demande par vue (`src/views/lenses.js`), la texture globe 2k est servie par défaut (`?hires=1` force la haute définition).

Le serveur écoute **uniquement** sur `127.0.0.1`. Il ne sert que `index.html`, `styles.css`, `public/**` et `src/**` ; tout autre chemin renvoie 403. Les textures du globe sont chargées depuis `public/`. Le service systemd `vectemporel-atlas.service` complète cette restriction avec `IPAddressDeny=any` et `IPAddressAllow=localhost` (fichier hors dépôt, à conserver lors d'une réinstallation).

## Structure

```text
index.html
styles.css                     design system local
public/                        textures du globe, moteur Three.js, images
src/
  data/dataset.js              généré, jamais édité
  domain/store.js              état unique et sélecteurs
  platform/keyboard.js         routeur clavier unique
  ui/shell.js                  coque commune
  views/globe.js               sélecteur de pays 3D
  views/chronology.js          vue par défaut
  views/recit.js               lecture guidée des points
  views/geography.js           carte schématique locale
  views/constellation.js       vue optionnelle, figée
  views/points.js              isolation de tous les points
scripts/
  build-dataset.mjs            génère le dataset depuis les audits
  serve.mjs                    serveur statique local
  verify.mjs                   contrôles de cohérence
tests/e2e.mjs                  parcours clavier complet
```

**Lecture des couches (sens de la dépendance).** `data → domain → platform → ui/views → app.js`. `data` fournit les faits générés, `domain` possède seul l’état, `platform` porte l’unique routeur clavier, `ui/views` rendent, `app.js` assemble sans posséder d’état. Aucune couche amont n’importe une couche aval. Le vocabulaire public de navigation vit dans `src/app.js` (`VIEW_TAXONOMY`) ; les littéraux d’exécution restent dans la coque et le routeur.

## Génération des points

`scripts/build-dataset.mjs` lit :

- `source/data.js` pour les repères curatés ;
- `source/audits/<pays>/country-audit.yaml` pour ères, acteurs, lieux, claims, omissions et gouvernance ;
- `source/audits/<pays>/source-register.csv` pour les références ;
- `source/audits/<pays>/omissions.yaml` et `auto-omissions.yaml` pour les absences justifiées ;
- `source/event-images.js` pour les images vérifiées.

Il produit **229 repères** et **901 points** : phrases des résumés vérifiés, affirmations des audits, figures et lieux documentés. Chaque point garde son degré de certitude et ses identifiants de source.

## Modèle mental et taxonomie des vues

Version du modèle : **`m4.2`** (`window.VATLAS.taxonomyVersion`). La navigation est une échelle macro → micro : chaque vue répond à une question et ajoute un niveau de précision. Ce catalogue figé est exposé tel quel par `window.VATLAS.taxonomy` ; c’est la référence adressable, les libellés de la coque en sont la source d’exécution.

| Niveau | Vue | Libellé | Raccourci | Question servie |
| --- | --- | --- | --- | --- |
| 1 | `globe` | Monde | `1` / `m` | Quels pays sont documentés ? |
| 2 | `chronology` | Chronologie | `2` / `c` | Quelles ères et quels repères ? |
| 3 | `recit` | Récit | `3` / `r` | Que disent les points vérifiés ? |
| 4 | `geography` | Géographie | `4` / `g` | Où se situent les lieux ? |
| 5 | `constellation` | Constellation | `5` / `s` | Comment l’ensemble se synthétise-t-il ? |
| 6 | `points` | Points | `6` / `p` | Quels points vérifiés isoler ? |

L’**identifiant** est la forme canonique : `1`, `m` et `Monde` résolvent tous vers `globe` via `window.VATLAS.resolveView`. Règle de mise à jour : tout changement de libellé ou de raccourci doit être répercuté dans `VIEW_TAXONOMY` (`src/app.js`), dans la coque (`src/ui/shell.js`), dans le routeur (`src/platform/keyboard.js`) et dans le présent tableau — puis la version incrémentée.

## Globe — drapeau dans le contour et zoom de transition

Au survol d'un pays (sphère, flèches ou liste), son **vrai drapeau vectoriel** est dessiné directement dans le shader, à la place de la surbrillance, découpé par la texture de picking et positionné depuis les coordonnées du pays. Les 10 fichiers `public/flags/<code>.svg` sont des drapeaux officiels téléchargés depuis [FlagCDN](https://flagcdn.com/) (drapeaux de domaine public) et stockés localement : **aucun appel réseau à l'exécution**. Au clic, l'overlay DOM zoome pendant que la vue suivante (Chronologie) apparaît à l'intérieur, puis l'état bascule sans attendre l'animation. `prefers-reduced-motion` supprime l'animation ; l'effet reste utilisable au clavier.

## Navigation

| Touche | Action | Portée |
| --- | --- | --- |
| `1`–`6` | Monde, Chronologie, Récit, Géographie, Constellation, Points | partout (équivalent à `m c r g s`) |
| `r` `c` `g` `s` `m` | mêmes vues, par initiale | partout |
| `←` `→` | repère / point / lieu précédent ou suivant | hors globe et modale |
| `↑` `↓` | ère précédente / suivante en Chronologie et Constellation ; en Récit et Géographie, mêmes effets que `← →` | hors globe et modale |
| `Entrée` | ouvrir le détail d’un repère | hors globe et modale |
| `Espace` | lecture du récit ou changement de périmètre géographique | Récit / Géographie |
| `Échap` | fermer l’aide ou le détail, puis revenir au Monde | partout |
| `?` | ouvrir / fermer l’aide | partout |

La table lisible par machine est `window.VATLAS.shortcuts()`. Les boutons « ← Chronologie » des vues sont des raccourcis locaux : la commande unique de retour reste `Échap`.

## Lexique

| Terme | Définition |
| --- | --- |
| **pays** | Une des 10 entrées documentées par les audits locaux. |
| **ère** | Période d’un pays, porteuse de repères. |
| **repère** | Événement daté rattaché à une ère ; 229 au total. |
| **point** | Assertion **extraite** d’un audit local, adossée à une source ou à une omission documentée ; 845 points d’audit et 901 points de récit. Aucun n’est présenté comme « validé » : les audits sont non signés. |
| **lieu** | Repère géographique documenté, avec coordonnées locales. |
| **certitude** | Degré repris de l’audit : certain, probable, disputé, non documenté. « vérifié » ne s’applique qu’aux phrases du récit. |
| **source** | Référence du registre local, affichée sans lien externe. |

Le même lexique figé est exposé par `window.VATLAS.lexicon`. Aucun terme n’est défini autrement dans une vue.

## API publique — `window.VATLAS`

| Membre | Contrat |
| --- | --- |
| `meta` | Métadonnées du jeu de données généré. |
| `taxonomyVersion` | Version du catalogue de navigation (`m4.2`). |
| `taxonomy` | Les 6 vues ordonnées et figées : `id`, `label`, `digit`, `letter`, `level`, `role`. |
| `lexicon` | Définitions du lexique ci-dessus. |
| `views()` | Copie de la liste des identifiants de vues. |
| `isValidView(id)` | `true` si l’identifiant appartient à la taxonomie. |
| `resolveView(x)` | Identifiant canonique depuis un `id`, un chiffre, une initiale ou un libellé ; `null` sinon. |
| `viewInfo(id)` | Entrée figée de la taxonomie, ou `null`. |
| `shortcutFor(id)` / `viewForShortcut(key)` | Raccourcis d’une vue / vue d’un raccourci. |
| `shortcuts()` | Copie de la table de navigation complète (`key`, `action`, `scope`). |
| `countries()` | `{ id, code, name, events }` pour les 10 pays. |
| `position()` | Situation sémantique : vue, libellé, niveau, pays, ère, repère `i/n`, point, lieu. |
| `getState()` | Copie superficielle de l’état brut (diagnostic). |
| `openCountry(id)` | Sélectionne le pays et ouvre la Chronologie ; Promesse du résultat. |
| `goView(x)` | Accepte toute forme résolue par `resolveView` ; Promesse du résultat. |

Cette API est additive : aucun membre existant n’a été retiré. Les modules internes peuvent changer ; ces noms sont le contrat stable.

## État de validation

- Cycle en V : phases A–G réalisées (besoin, exigences, données, architecture, interaction, design, implémentation).
- Phases H–J automatisées : `npm run verify` et `npm run test:e2e`.
- Phase K (validation utilisateur, 20 participants) reste à faire.
- Dette éditoriale héritée des audits : audits non signés, schéma de preuve partiel, sources non concluantes.

Le projet reste un **POC v0.1**, pas une v1.0 académique.

## PWA et GitHub Pages

L'atlas est installable comme application web progressive : `manifest.webmanifest`, icônes 192/512 (+ maskable) et `sw.js` (cache same-origin, fonctionnement hors ligne après une première visite en ligne). Le service worker ne s'enregistre que sur HTTPS ou `localhost` et n'intercepte aucune requête externe.

- Local : `npm run test:pwa` vérifie le manifest, le cache et le rendu hors ligne sur `http://127.0.0.1:4181`.
- Public : site statique généré par `npm run build:pages` et publié sur la branche `gh-pages` → `https://tasour.github.io/vectemporel/`.

Le site public est servi sans serveur Node : seuls les fichiers nécessaires à l'exécution sont publiés (`index.html`, `styles.css`, `public/`, `src/`, `icons/`, `manifest`, `sw.js`). Les audits, sources et scripts de génération restent hors du site.

## Architecture d'interface

Les éléments partagés (kickers, badges, métriques, panneaux, états vides, barres d'outils, figures, onglets) vivent dans `src/ui/components.js` et sont stylés dans `styles.css`. Aucun composant ne possède d'état ni n'injecte de CSS.

Les panneaux produits par les lentilles d'audit sont marqués `data-lens-panel` et masqués par défaut. Le paramètre `?diagnostics=1` les révèle avec le bouton de diagnostic ; ils ne font jamais partie de l'interface de production. Le garde-fou `tools.ui.guard` vérifie ces invariants en lecture seule.

## Atlas mondial Chronas (données CC BY-SA)

`npm run import:chronas` génère `src/data/chronas-snapshot.js` depuis l'API publique de Chronas, au build uniquement (aucun appel réseau au runtime). Le snapshot est borné : 10 années, 200 aires et 300 marqueurs par année, tri déterministe, graine `20261121`. Données © Chronas sous CC BY-SA 4.0 — voir `DATA-LICENSE.md` et `ATTRIBUTION.md`.

La vue « Frise mondiale » (bouton dans la Chronologie) rejoue l'expérience d'un timeline de points à la manière de Histography, avec une réimplémentation originale : canvas statique sans boucle rAF, bandes d'ères, filtres de type, curseur d'année, « Feeling lucky » déterministe. Aucun code de Histography n'a été utilisé (projet fermé).

Les deep links au format Chronas sont acceptés : `#type=area&value=France&pos=lat,lon,zoom&year=1000`. La zone et l'année sont projetées sur la taxonomie existante (vue Chronologie, pays, ère et repère les plus proches) ; `pos` est reconnu mais non stocké.
