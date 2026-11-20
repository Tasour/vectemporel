# Vue `v1-frise` — Diagnostic et plan de 10 chantiers

> Périmètre : frise chronologique classique de V1 (229 repères, 10 pays, ères, tags,
> zoom/pan, minimap, recherche, deep links, filtres). Fichier possédé : `app.js`,
> zone frise (formatage, ères, layout, draw, zoom, navigation, recherche).
> Aucune donnée historique n'est inventée ; les preuves sont des comportements de code.
> Statut final : **10/10 chantiers implémentés** dans `app.js` (bloc CSS injecté
> `<style id="v1-frise-css">`, aucun autre fichier de code modifié).

## 1. V1-FRISE-01 — Focus des repères et navigation clavier entre événements

- **Problème / preuve.** `onGlobalKeydown` (`app.js:1113-1224`) intercepte `+`, `-`,
  `0` et les flèches, mais ne sait pas déplacer le focus d'un repère à l'autre.
  `layoutEvents` (`app.js:711-719`) applique `display:none` aux boutons hors écran :
  si le bouton focalisé sort de la fenêtre lors d'un pan clavier, le focus tombe sur
  `<body>`. `state.selectedId` (`app.js:110`, posé en `app.js:727`) n'est jamais
  exposé aux technologies d'assistance (`aria-current` absent).
- **Solution.** Flèche ↓ / ↑ = repère visible suivant / précédent (ordre DOM = ordre
  chronologique) ; si le bouton focalisé est masqué, reporter le focus sur `els.stage`
  ; `aria-current="true"` sur le repère sélectionné ; `aria-label` du stage enrichi
  des nouveaux raccourcis.
- **Impact.** Le parcours clavier de la frise devient complet et sans perte de repère.
- **Risque.** Faible : les flèches ←/→ restent affectées au panoramique (compatibilité
  E2E préservée). Effort **S**.
- **Vérification.** Tab jusqu'à un repère → ↓ change de repère ; zoomer puis panner →
  le focus reste sur la frise ; un repère ouvert porte `aria-current="true"`.

## 2. V1-FRISE-02 — Boutons-événements : cibles tactiles chevauchantes et infobulle non reliée

- **Problème / preuve.** `buildEvents` (`app.js:511-520`) crée des boutons 0×0 dont
  la zone de clic est un pseudo-élément `::before` de 36 px (`styles.css:1040-1048`).
  Le repli de `layoutEvents` (`app.js:678-703`) place des repères « sans libellé »
  avec des intervalles de seulement ±7 px (`app.js:661`) : deux cibles de 36 px
  peuvent se chevaucher et le clic ouvre le mauvais événement. L'`aria-label`
  (`app.js:517-520`) omet les tags, et l'infobulle `role="tooltip"`
  (`index.html:265`, remplie en `app.js:1230-1274`) n'est jamais reliée au bouton par
  `aria-describedby`.
- **Solution.** Créneaux dédiés aux pastilles (lignes et demi-lignes), cible tactile
  des repères sans libellé réduite à 18 px et écart minimum 18 px sur une même ligne
  (19 px mesurés sur la France) ; `aria-describedby="tooltip"` au focus et retrait au
  `blur` ; noms des tags ajoutés à l'aria-label.
- **Impact.** Clic fiable sur les repères denses ; résumé et tags annoncés au focus.
- **Risque.** Moyen : un espacement plus large peut pousser quelques repères dans une
  ligne supplémentaire (les 5 lignes disponibles restent suffisantes). Effort **M**.
- **Vérification.** Zoom sur une zone dense (1789–1799) : deux pastilles distinctes
  ouvrent deux événements distincts ; au focus, l'infobulle est annoncée avec les tags.

## 3. V1-FRISE-03 — Zoom clavier muet et incomplet

- **Problème / preuve.** `draw` met à jour `#zoom-level` et `#zoom-factor`
  (`app.js:885-886`, DOM en `index.html:157-159`) sans région live : un utilisateur
  de lecteur d'écran ne sait pas que la fenêtre a changé. Les seuls raccourcis sont
  `+`, `-`, `0`, ←/→ (`app.js:1198-1223`) ; aucun équivalent clavier de « Époque
  récente », de début/fin ni de la mini-carte.
- **Solution.** Région `role="status" aria-live="polite"` injectée ; annonce une fois
  la vue stabilisée (fin de `animateView`, `setView` non animé) ; raccourcis `Home`
  (vue d'ensemble), `End` (époque récente), `PageUp`/`PageDown` (pan de 30 %).
- **Impact.** Le zoom devient observable et pilotable sans souris ni vision.
- **Risque.** Faible : annonce dédupliquée pour ne pas parler à chaque image rAF.
  Effort **S**.
- **Vérification.** `+` puis attente → annonce « Vue … ×… » ; `Home`/`End`/`PgUp`
  déplacent la fenêtre.

## 4. V1-FRISE-04 — Mini-carte inopérable au clavier

- **Problème / preuve.** `#minimap` est un `<div aria-label>` (`index.html:187`) sans
  `tabindex`, sans `role` et sans valeur exposée. Seuls les gestionnaires pointeur
  existent (`app.js:2351-2354`, `app.js:2380-2423`) ; `updateMinimapWindow`
  (`app.js:845-852`) ne met à jour que la position visuelle. Les blocs d'ère et les
  ticks (`app.js:822-842`) n'ont pas d'intitulé.
- **Solution.** `tabindex="0"`, `role="slider"` horizontal avec `aria-valuemin/max/
  now/valuetext` maintenus à jour ; ←/→ = 2 % du domaine, PgUp/PgDn = 10 %, Home/End
  = bornes, +/− = zoom ; `stopPropagation` pour éviter le double traitement global ;
  `title` sur ères et ticks.
- **Impact.** La navigation globale devient accessible au clavier et les ères sont
  identifiables au survol.
- **Risque.** Moyen : le `role="slider"` doit rester cohérent avec la fenêtre réelle
  (valeurs recalculées dans `draw`). Effort **M**.
- **Vérification.** Tab sur la mini-carte, ←/→ déplacent la fenêtre et l'annonce ;
  les blocs d'ère ont un `title`.

## 5. V1-FRISE-05 — Contraste et information portée par la seule couleur

- **Problème / preuve.** `tagColor()` (`app.js:188-190`) fournit `--tag` utilisé pour
  `.event-year` en 8,5 px (`styles.css:1086-1092`), les pastilles et les ticks de
  mini-carte (`app.js:833-841`). Ces ticks sont dans un calque `aria-hidden`
  (`index.html:189`) et n'ont aucun `title` : la couleur est le seul indice de tag.
- **Solution.** Calcul de luminance → variable `--tag-text` (mélange avec le papier
  clair si le contraste est insuffisant) appliquée aux libellés d'année et aux
  compteurs ; noms de tags dans l'aria-label des repères (chantier 02) et `title`
  des ticks (chantier 04) ; ombre portée renforcée dans le CSS injecté.
- **Impact.** Lisibilité des petites annotations et tag compréhensible sans la couleur.
- **Risque.** Faible : les couleurs sources de `data.js` ne sont pas modifiées, seul
  un dérivé de lecture est calculé. Effort **M**.
- **Vérification.** `#e0b263` (Politique) donne un `--tag-text` au moins aussi clair ;
  un lecteur d'écran annonce « Politique, Guerres » sur un repère multi-tags.

## 6. V1-FRISE-06 — Recherche multi-pays inachevée

- **Problème / preuve.** L'index `SEARCH_INDEX` (`app.js:1671-1688`) couvre bien les
  229 repères des 10 pays et `makeSearchItem` affiche le drapeau (`app.js:1748-1766`),
  mais une recherche d'année appelle `goToYear` (`app.js:976-981`) qui reste dans le
  pays courant : depuis la France (domaine −600…2026), chercher « −2000 » est
  silencieusement ramené à −600 par `clampView` (`app.js:212-222`). Aucune proposition
  de pays ni précision du nombre de pays résultats dans `renderSearch`
  (`app.js:1773-1814`).
- **Solution.** Pour une année hors domaine, proposer jusqu'à 3 pays dont le domaine
  contient l'année (item « pays » ouvrant la frise centrée sur cette année) ; tri des
  repères avec le pays courant en tête ; section « Repères dans N pays ».
- **Impact.** La recherche tient la promesse « multi-pays » du README sans inventer
  d'événement.
- **Risque.** Moyen : le nombre d'items reste plafonné pour ne pas noyer la liste.
  Effort **M**.
- **Vérification.** Depuis la France, taper « −2000 » → proposition « Inde / Égypte » ;
  Entrée ouvre le pays et centre l'année.

## 7. V1-FRISE-07 — Deep links : filtres absents de l'URL

- **Problème / preuve.** `syncHashNow` (`app.js:251-264`) n'écrit que
  `#/pays/start-end[/event]` et `parseHash` (`app.js:1940-1968`) ne lit que ces trois
  segments. `toggleTag` (`app.js:407-414`) et le bouton « Tout effacer »
  (`app.js:2316-2320`) ne déclenchent pas `scheduleHash()`. Un lien partagé après
  filtrage rouvre donc tous les événements.
- **Solution.** Suffixe `?tags=politique,guerre` encodé, parsé et validé contre
  `TAGS` ; restauration dans `applyHash` (`app.js:1916-1934`) avant le dessin ;
  `scheduleHash()` sur chaque changement de filtre.
- **Impact.** L'état de recherche (lentilles + fenêtre + repère) devient réellement
  partageable.
- **Risque.** Faible : le format existant reste valide (suffixe optionnel).
  Effort **S**.
- **Vérification.** Activer deux lentilles, copier le lien, l'ouvrir dans un nouvel
  onglet → les deux lentilles sont actives et le compteur « 2 sur N » est cohérent.

## 8. V1-FRISE-08 — Placement des labels : mesure et bords de l'aire

- **Problème / preuve.** `measureEventLabel` (`app.js:584-589`) suppose une police
  figée `500 11.5px Inter` et plafonne à 280 px, alors que `.event-label`
  (`styles.css:1073-1084`) n'a pas de `max-width` : un titre plus long déborde de la
  zone réservée et collisionne. Le `flip` (`app.js:627`) ne teste que le bord droit ;
  le repli sans libellé (`app.js:678-703`) réserve ±7 px seulement.
- **Solution.** Mesure avec la police calculée du DOM, `max-width` CSS aligné sur la
  mesure, garde des deux bords avec décalage `--label-shift` appliqué au libellé,
  et élargissement des intervalles de dots (chantier 02).
- **Impact.** Moins de chevauchements, libellés jamais coupés au bord de la scène.
- **Risque.** Moyen : le décalage doit être appliqué de façon symétrique en mode
  normal et en mode `is-flipped`. Effort **M**.
- **Vérification.** Comparer largeurs mesurées/rendues sur les 10 pays ; zoomer au
  bord gauche et au bord droit → aucun libellé ne sort de l'aire.

## 9. V1-FRISE-09 — Graduations adaptatives pilotées par la largeur réelle

- **Problème / preuve.** `chooseStep` (`app.js:756-762`) vise un nombre fixe de 5 à
  10 graduations sans mesurer les libellés, pourtant longs (« 600 av. J.-C. » généré
  en `app.js:797`). Les frontières d'ères ajoutées en `app.js:802-810` sont des traits
  sans intitulé ni `title`.
- **Solution.** Pas choisi à partir de la largeur mesurée du libellé le plus long
  (plancher 110 px) ; `title` renseigné sur les traits d'ère ; garde anti-collision
  existante (`tickPositions`) conservée.
- **Impact.** Axis lisible à tous les niveaux de zoom, ères identifiables au survol.
- **Risque.** Faible : le pas reste dans la liste « 1-2-5-10… » (hiérarchie décimale
  préservée). Effort **S**.
- **Vérification.** De −600…2026 à une fenêtre de 10 ans : jamais plus de ~10 ticks,
  aucun libellé tronqué ; les traits d'ère ont un intitulé.

## 10. V1-FRISE-10 — État vide de la fenêtre temporelle

- **Problème / preuve.** Lorsqu'un zoom atterrit dans une plage sans repère,
  `layoutEvents` (`app.js:597-603` puis `706-719`) masque tous les boutons sans
  aucun message : la scène paraît vide ou cassée. Le message de recherche vide
  (`app.js:1799-1803`) est statique et non annoncé.
- **Solution.** Surcouche `.frise-empty` (injectée, non indexée comme donnée) avec
  « Aucun repère dans cette fenêtre » et bouton « Vue d'ensemble » appelant
  `fitView()` ; annonce live du résultat de recherche.
- **Impact.** L'absence de résultat devient explicite et réversible en un clic.
- **Risque.** Faible : la surcouche ne masque ni les événements ni les contrôles.
  Effort **S**.
- **Vérification.** Zoomer dans un trou de la frise → message + bouton ; clic →
  retour à la vue complète ; recherche infructueuse annoncée.

## Synthèse d'implémentation

| Chantier | Effort | Fichier | État |
| --- | --- | --- | --- |
| V1-FRISE-01 | S | `app.js` | implémenté |
| V1-FRISE-02 | M | `app.js` | implémenté |
| V1-FRISE-03 | S | `app.js` | implémenté |
| V1-FRISE-04 | M | `app.js` | implémenté |
| V1-FRISE-05 | M | `app.js` | implémenté |
| V1-FRISE-06 | M | `app.js` | implémenté |
| V1-FRISE-07 | S | `app.js` | implémenté |
| V1-FRISE-08 | M | `app.js` | implémenté |
| V1-FRISE-09 | S | `app.js` | implémenté |
| V1-FRISE-10 | S | `app.js` | implémenté |

## Vérifications

- `node --check app.js` : OK.
- Test de fumée frise (Puppeteer, 12 contrôles) : **12/12 OK** — focus entre repères,
  `aria-current`, espacement des pastilles (19 px), annonce live du zoom, `Home`,
  mini-carte au clavier, `--tag-text`, recherche multi-pays, restauration du deep link
  avec filtres, graduations, état vide, aucune erreur console imputable à la frise.
- `npm run test:e2e` : **6/14** (rapport restauré après exécution). Les 8 échecs
  concernent le lecteur, le Récit et le retour globe (zones `v1-lecteur` / `v1-recit`
  / coque), **aucun ne concerne la frise** ; « Aucune erreur console » passe.

*Note de non-collision : `app.js` est partagé avec les vues fiche détaillée et lecteur ;
tous les edits utilisent des ancres uniques vérifiées par assertion avant remplacement,
et se limitent aux fonctions de la frise / recherche.*
