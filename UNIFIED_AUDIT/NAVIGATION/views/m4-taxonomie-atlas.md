# M4 — Taxonomie de l’Atlas (`m4-taxonomie-atlas`)

Spécialité : indexation sémantique — le modèle mental de la navigation, son vocabulaire et son adressabilité.
Fichiers possédés : `~/Projects/vectemporel-atlas/src/app.js`, `~/Projects/vectemporel-atlas/README.md` (seuls fichiers modifiés).
Fichiers lus sans modification : `src/ui/shell.js`, `src/domain/store.js`, `src/platform/keyboard.js`, `src/views/*.js`, `index.html`, `styles.css`, `scripts/verify.mjs`, `tests/e2e.mjs`.
Périmètre MACRO : « Quel est le modèle mental ? » (hub `NAVIGATION/README.md:13`).
Question directrice : où suis-je dans l’échelle Monde → Chronologie → Récit → Géographie → Constellation, et comment ce modèle est-il nommé, documenté et adressable ?

## Diagnostic — 10 recommandations

### M4-01 — Aucune taxonomie des vues dans l’API publique

**Observation.** `app.js:11-16` expose `window.VATLAS` avec seulement `meta`, `getState`, `openCountry` et `goView`. L’ensemble des vues n’existe comme donnée que dans `shell.js:12-20` (`TABS`) et `keyboard.js:10` (`VIEWS`), deux fichiers non possédés. Le catalogue des vues — donc le modèle mental — n’est ni explicite, ni ordonné, ni inspectable depuis le point d’entrée public.
**Solution.** Définir dans `app.js` une constante canonique `VIEW_TAXONOMY` : tableau ordonné figé de 5 entrées figées `{ id, label, digit, letter, level, role }`, exposée via `window.VATLAS.taxonomy`. Ajouter dans `README.md` la section « Modèle mental et taxonomie des vues » avec l’échelle macro→micro et le tableau des cinq niveaux.
**Effet.** Le modèle mental devient une donnée vérifiable : un outil ou un test peut énumérer les vues, leur ordre et la question qu’elles servent, sans lire le code de la coque. Aucune information portée par la seule couleur (WCAG 1.3.1).
**Effort.** S.
**Vérification.** `window.VATLAS.taxonomy.length === 5`, `Object.isFrozen(taxonomy)`, identifiants uniques et ordre `globe, chronology, recit, geography, constellation` ; le tableau README contient les mêmes cinq lignes.

### M4-02 — Raccourcis de vue dispersés : les initiales absentes du vocabulaire public

**Observation.** Les chiffres `1`–`5` vivent dans `shell.js:191-200` et `keyboard.js:45-49` ; les initiales `r c g s m` dans `keyboard.js:11` uniquement. `README.md:65` ne documente que les chiffres (lacune déjà signalée par `atlas-coque-navigation.md`, chantier 07, à l’époque bloquée car README non possédé). Deux systèmes de raccourcis coexistent donc sans source commune.
**Solution.** Porter `digit` et `letter` dans chaque entrée de `VIEW_TAXONOMY` ; exposer `shortcutFor(id)` et `viewForShortcut(key)`. Compléter la table `README.md` « Navigation » d’une ligne `r c g s m` et d’une colonne de portée, et faire de `window.VATLAS.shortcuts()` le jumeau lisible par machine de cette table.
**Effet.** Chaque vue a une identité de raccourci unique et bidirectionnelle ; la documentation et l’API ne peuvent plus diverger sur les touches de vue.
**Effort.** S.
**Vérification.** `shortcutFor('recit')` → `{ digit: '3', letter: 'r' }` ; `viewForShortcut('s') === 'constellation'` ; la table README contient `r c g s m`.

### M4-03 — Hiérarchie macro→micro implicite : le niveau n’est jamais nommé

**Observation.** `shell.js` affine les libellés (« Vues de l’atlas ») mais ne dit nulle part que les cinq vues forment une échelle de précision croissante. `README.md:61-71` liste des touches, pas un modèle : un lecteur ne peut pas déduire pourquoi `Récit` précède `Géographie`, ni ce que chacune apporte.
**Solution.** Ajouter `level` (1 à 5) et `role` (la question servie) à chaque entrée de la taxonomie ; exposer `viewInfo(id)`. Rédiger dans le README l’échelle commentée : Monde = quels pays ? · Chronologie = quelles ères et repères ? · Récit = que disent les points ? · Géographie = où ? · Constellation = comment tout se tient ?
**Effet.** La progression est énoncée, pas seulement suggérée par l’ordre des onglets. `position()` (M4-05) peut restituer le niveau courant dans le même vocabulaire.
**Effort.** S.
**Vérification.** `viewInfo('geography').level === 4` et `role` non vide pour les 5 vues ; la section README « Modèle mental » contient les cinq questions.

### M4-04 — Adressage des vues sans contrat : `goView` reçoit une chaîne opaque

**Observation.** `app.js:15` délègue `goView(view)` au store, qui filtre silencieusement (`store.js:105-108`). Aucune fonction ne répond à « quelles vues existe-t-il ? », « ce libellé est-il valide ? », « quels pays puis-je ouvrir ? ». Un appelant ne peut donc pas construire une navigation correcte sans lire trois modules.
**Solution.** Exposer `views()`, `isValidView(id)` et `countries()` dérivés de `VIEW_TAXONOMY` et `DATASET.countries` ; faire passer `goView` par un garde-fou qui normalise l’entrée (M4-06) et retourne une Promesse de résultat. Documenter le contrat complet dans le README (section « API publique »).
**Effet.** API auto-documentante : erreurs détectables au lieu d’être absorbées, et surface publique stable même si les modules internes bougent.
**Effort.** S.
**Vérification.** `views().length === 5`, `isValidView('recit') === true`, `isValidView('nope') === false`, `countries().length === 10`, `await goView('nope') === false`.

### M4-05 — Aucune position sémantique adressable depuis l’API

**Observation.** `getState()` (`app.js:13`) retourne des indices brute (`eraIndex`, `eventIndex`, `pointIndex`, `placeIndex`) sans les résoudre en noms. Pour répondre à « où suis-je ? », un appelant doit lui-même recombiner l’état et `DATASET` — exactement le travail que fait la coque pour son fil d’Ariane, mais sans le exposer.
**Solution.** Ajouter `position()` qui dérive de `state` et `DATASET` un snapshot lisible : `view`, `label`, `level`, `role`, `countryId`, `countryName`, `eraName`, `eventIndex`, `eventCount`, `eventTitle`, `pointIndex`, `placeIndex`. La décrire dans le README comme l’équivalent programmatique de la situation visible.
**Effet.** Un seul test peut confronter situation visible, annonce vocale et état interne ; la taxonomie devient observable en lecture seule, sans import de module interne.
**Effort.** M.
**Vérification.** Au chargement, `position().label === 'Monde'` et `countryName === null` ; après `openCountry(id)`, `position().view === 'chronology'` et `eventCount` égal au nombre de repères du pays.

### M4-06 — Les synonymes d’une vue ne résolvent pas vers la forme canonique

**Observation.** `globe`, `1`, `m` et `Monde` désignent la même vue, mais aucun mécanisme public ne le dit. `goView('Monde')` est aujourd’hui ignoré sans diagnostic. Cette absence de normalisation est une source directe d’ambiguïté sémantique dans toute commande externe (console, test, futur deep-link).
**Solution.** Implémenter `resolveView(input)` : accepte l’identifiant, le chiffre, l’initiale (insensible à la casse) ou le libellé (insensible aux accents et à la casse), retourne l’identifiant canonique ou `null`. L’utiliser comme unique point d’entrée de `goView`. Documenter la règle « un identifiant est la forme canonique » dans le README.
**Effet.** Vocabulaire clos et réversible : toute entrée connue a exactement une sortie, toute entrée inconnue est explicitement rejetée.
**Effort.** S.
**Vérification.** `resolveView('3') === resolveView('r') === resolveView('Récit') === resolveView('recit') === 'recit'` ; `resolveView('inconnu') === null`.

### M4-07 — `app.js` importe deux fois la coque : le point de composition n’est pas documenté

**Observation.** `app.js:1` importe `mount`, `app.js:3` importe `render` du même module `shell.js`. `openCountry` et `goView` passent par des imports dynamiques (`app.js:14-15`) bien que le store soit déjà importé statiquement (`app.js:2`). Le rôle de `app.js` — assembler les couches, pas posséder d’état — n’est écrit nulle part.
**Solution.** Fusionner les imports de `shell.js` et du store, importer les actions `selectCountry`/`goView` une seule fois, ajouter un en-tête de module qui nomme le rôle de composition root et la direction des dépendances. Compléter le README d’une légende des couches `data → domain → platform → ui/views → app.js`.
**Effet.** Une seule source d’import par module, et une architecture lisible : le lecteur sait immédiatement où vit l’état (le store) et où vit le vocabulaire (la taxonomie).
**Effort.** S.
**Vérification.** `grep` : un seul `from './ui/shell.js'`, un seul `from './domain/store.js'` ; `node --check src/app.js` passe ; le README contient la chaîne `data → domain → platform → ui/views → app.js`.

### M4-08 — Lexique métier non défini : repère, ère, point, lieu, certitude, source

**Observation.** `README.md:50-59` parle de « repères » et de « points » sans les définir, alors que ces six termes structurent toute l’interface (bandes d’ères, cartes de repères, points du détail, marqueurs de lieux, pastilles de confiance, références). Un terme non défini à sa première occurrence est une taxonomie fragile : chaque vue peut l’employer dans un sens légèrement différent.
**Solution.** Ajouter une section « Lexique » dans le README avec sept définitions courtes et sourcées depuis le jeu de données (10 pays, 229 repères, 901 points) ; exposer le même objet figé via `window.VATLAS.lexicon`.
**Effet.** Vocabulaire normatif unique, partagé par la documentation et l’API ; les chiffres cités restent ceux de `verify.mjs`, rien n’est inventé.
**Effort.** S.
**Vérification.** `Object.keys(VATLAS.lexicon).length === 7` ; le README définit « repère » (229) et « point » (901) ; `npm run verify` reste au vert.

### M4-09 — Table de navigation sans portée : les touches sont décrites hors contexte

**Observation.** `README.md:63-71` donne sept lignes de touches sans dire quand elles agissent. Or `keyboard.js:63-90` module l’effet des flèches selon la vue (repères, points ou lieux) et des `↑/↓` selon le contexte (ères en Chronologie/Constellation, mêmes effets que `←/→` en Récit/Géographie) ; `Échap` ferme aussi l’aide (`keyboard.js:39-44`), ce que la README omet.
**Solution.** Réécrire la table avec une colonne « Portée » : `1`–`5`/`m c r g s` partout ; `← →` hors globe et modale ; `↑ ↓` ères en Chronologie/Constellation et points/lieux ailleurs ; `Entrée` détail ; `Espace` récit/géographie ; `Échap` aide → détail → Monde ; `?` aide. Exposer la même table via `shortcuts()` et préciser que les boutons « ← Chronologie » des vues sont des raccourcis locaux.
**Effet.** La navigation est décrite comme un système de portées, pas comme une liste plate : on sait quoi attendre d’une touche dans chaque vue.
**Effort.** S.
**Vérification.** `shortcuts().length === 7`, chaque entrée a `key`, `action`, `scope` ; la table README contient « Échap », « aide », « détail » et « Monde ».

### M4-10 — Aucune version ni traçabilité du modèle de navigation

**Observation.** Ni `app.js` ni le README ne datent ou ne versionnent le vocabulaire de navigation. Quand une vue, un libellé ou un raccourci change, rien ne permet de dire quelle révision du modèle est en service — alors que `SYNTHESE.md` coordonne douze surfaces susceptibles de le modifier.
**Solution.** Introduire `TAXONOMY_VERSION = 'm4.1'`, l’exposer via `window.VATLAS.taxonomyVersion`, et ouvrir la section README « Modèle mental » par la version et la règle de mise à jour (toute modification d’un libellé ou d’un raccourci doit être répercutée dans `VIEW_TAXONOMY`, la coque, le routeur et le README).
**Effet.** Traçabilité du modèle : un désaccord entre surface se diagnostique en comparant une version, pas en relisant quatre fichiers. API additive, aucun membre existant retiré.
**Effort.** S.
**Vérification.** `VATLAS.taxonomyVersion === 'm4.1'` ; le README mentionne `m4.1` et la règle de répercussion ; `window.VATLAS.meta` reste inchangé.

## Coordination et blocages

- `shell.js` (`TABS`, `VIEW_META`) et `keyboard.js` (`VIEWS`, `SHORTCUTS`, `handle`) conservent leurs littéraux d’exécution : fichiers non possédés. `VIEW_TAXONOMY` dans `app.js` est le **catalogue public** ; tout changement de libellé doit être répercuté des deux côtés (règle M4-10).
- `config/verify.mjs:27` impose un seul `addEventListener('keydown')` : aucune modification du routeur clavier, donc aucun risque sur ce contrôle.
- `tests/e2e.mjs` non possédé : l’API `window.VATLAS` reste rétro-compatible (`meta`, `getState`, `openCountry`, `goView` conservés), les ajouts sont purement additifs.
- Aucune donnée historique inventée : 10 pays / 229 repères / 901 points sont repris de `README.md` et vérifiés par `scripts/verify.mjs`.

## Statut d’implémentation

Les 10 recommandations sont appliquées dans `src/app.js` et `README.md` uniquement. Vérifications : `node --check src/app.js` et `npm run check`.
