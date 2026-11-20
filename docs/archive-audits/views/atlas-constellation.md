# Audit — `atlas-constellation` (Constellation, Vectemporel Atlas)

> Périmètre : `src/views/constellation.js` (fichier possédé exclusivement).
> Lectures autorisées : `src/domain/store.js`, `src/data/dataset.js`, `README.md`,
> `styles.css`, `src/ui/shell.js`, `src/platform/keyboard.js`, `tests/e2e.mjs`.
> Références de lignes : **état avant implémentation**. Aucune donnée historique
> inventée ; aucun appel réseau ; aucune commande Git.

## Priorité des chantiers

| Chantier | Titre | Effort |
| --- | --- | --- |
| ATLAS-CONSTELL-01 | Légende et lunes fantômes | M |
| ATLAS-CONSTELL-02 | Nature figée / non documentaire non énoncée | S |
| ATLAS-CONSTELL-03 | Aucun lien ère → repère → point dessiné | M |
| ATLAS-CONSTELL-04 | Géométrie : soleils empilés, planètes débordantes | M |
| ATLAS-CONSTELL-05 | Planètes sans étiquette visible | S |
| ATLAS-CONSTELL-06 | Sémantique ARIA absente | S |
| ATLAS-CONSTELL-07 | Focus perdu au re-render clavier | M |
| ATLAS-CONSTELL-08 | États vides muets | S |
| ATLAS-CONSTELL-09 | Traçabilité hors ligne implicite et vocabulaire inexact | S |
| ATLAS-CONSTELL-10 | Coût de rendu évitable | S |

---

## ATLAS-CONSTELL-01 — Légende et lunes fantômes

- **Problème / preuve.** La légende annonce `el('span', 'legend-moon', 'Point issu de l’audit')`
  (`constellation.js:20-24`) et la note affirme « chaque lune est un point vérifié visible dans le détail »
  (`constellation.js:47`). Or aucun `.const-moon` n'est jamais créé : la boucle ne produit que des
  `.const-sun` et `.const-planet` (`constellation.js:27-45`). Aucune règle `.const-moon` n'existe non plus
  (`styles.css:214-235`). La vue promet donc un objet qu'elle ne rend pas, et `state.pointIndex` reste sans
  représentation visuelle alors que le détail (`shell.js:117-123`) affiche bien les points.
- **Solution.** Rendre les points du repère actif comme lunes sélectionnables, avec `data-const-key`,
  `aria-label` incluant `kind`, `confidence` et le nombre de sources, et synchronisation de
  `state.pointIndex` via `set({ pointIndex, detailOpen: true })`. Aligner légende et note sur le vocabulaire
  réel (« repère », « point vérifié ») sans prétendre que tous les points sont « issus de l'audit » :
  le dataset contient des points `sources: []` (`dataset.js:229,236`).
- **Impact.** Véracité de la vue, exploitation des points déjà présents (901 au total), cohérence avec
  l'état partagé et le détail. Effort **M**.
- **Risque.** Surcharge visuelle autour de la planète active ; dérive sémantique si l'on conserve
  « issu de l'audit ». Mitigation : au plus 8 lunes (maximum mesuré dans le dataset) et libellé neutralisé.
- **Vérification.** Le nombre de `.const-moon` égale `event.points.length` du repère courant ; un clic sur
  une lune met `pointIndex` à sa position et ouvre `.detail-sheet` ; aucune mention de lune sans lune rendue.

## ATLAS-CONSTELL-02 — Nature figée / non documentaire non énoncée

- **Problème / preuve.** La note (`constellation.js:47`) dit seulement « aucune orbite animée ». Les positions
  sont en réalité `planetIndex * 137.5deg` et `70 + planetIndex * 22px` (`constellation.js:39-40`) : ce sont
  des choix décoratifs indexés, qui ne codent ni la date (`event.year`, `dataset.js:207`), ni l'importance
  (`importance`, `dataset.js:214`), ni un lieu. Rien ne l'indique à la lecture.
- **Solution.** Ajouter un encart visible : « positions déterministes décoratives (angle 137,5°, rayon calculé
  depuis le nombre de repères) : elles ne codent ni date, ni importance, ni lieu ; la date figure dans
  l'étiquette, l'infobulle et le détail ». Conserver le déterminisme (pas de `Math.random`, pas d'animation).
- **Impact.** Lecture correcte de la vue, absente de sur-interprétation chronologique ou géographique.
  Effort **S**.
- **Risque.** Texte plus long sur mobile. Mitigation : `font-size` réduit et retour à la ligne autorisé.
- **Vérification.** La mention est visible dans `.constellation-note` ; aucun `Math.random`, `animation` ou
  `requestAnimationFrame` dans le module ; l'e2e « orbites figées » (`tests/e2e.mjs:50`) reste vert.

## ATLAS-CONSTELL-03 — Aucun lien ère → repère → point dessiné

- **Problème / preuve.** Les nœuds sont simplement ajoutés au champ (`field.appendChild(sun)`,
  `constellation.js:33` ; `field.appendChild(planet)`, `constellation.js:43`) : aucun trait ne relie le soleil
  à ses planètes, ni la planète active à ses lunes. Le mot « constellation » et la hiérarchie
  ère → repère → point ne sont donc pas lisibles ; seule la couleur du soleil (`--era`, `constellation.js:30`)
  porte une information, ce qui enfreint l'accessibilité (info par la seule couleur).
- **Solution.** Insérer un `<svg class="constellation-edges" viewBox="0 0 100 100" aria-hidden="true">` avec
  `vector-effect="non-scaling-stroke"` : une ligne de chaque soleil vers les planètes de l'ère active, et de
  la planète active vers ses lunes. Style discret pour les liens ordinaires, trait renforcé sur le chemin
  actif. Coordonnées en pourcentage partagées avec les boutons (voir ATLAS-CONSTELL-04).
- **Impact.** Lisibilité de la structure et du chemin sélectionné. Effort **M**.
- **Risque.** Bruit visuel, traits traversant les étiquettes, focus SVG indésirable. Mitigation :
  `pointer-events: none`, `aria-hidden="true"`, `focusable="false"`, opacité faible, trait fin.
- **Vérification.** Présence de `svg.constellation-edges line` ; le chemin actif porte une classe distincte ;
  le SVG est `aria-hidden` et non focalisable ; aucun trait ne sort du `viewBox`.

## ATLAS-CONSTELL-04 — Géométrie : soleils empilés, planètes débordantes

- **Problème / preuve.** Chaque soleil est créé avec la même position absolue
  (`constellation.js:28-33`) et la règle unique `.const-sun { left:50%; top:50% }`
  (`styles.css:221-225`) les empile tous au centre : pour la France (9 ères, `dataset.js:129-201`),
  8 soleils sont masqués. Le rayon `70 + planetIndex * 22px` (`constellation.js:40`) n'est pas borné :
  12 repères dans `france-era-2` donnent 312 px, et davantage dépasseraient le `min-height:460px`
  du champ (`styles.css:220`) sans `overflow` ni adaptation mobile (`styles.css:263-270`).
- **Solution.** Répartir les soleils sur un cercle intérieur déterministe, borner les rayons en pourcentage,
  calculer `left`/`top` en `%` pour boutons **et** connecteurs, ajouter `overflow:hidden` et
  `contain:layout paint` au champ, adapter `min-height` et la taille des nœuds à la densité et au mobile.
- **Impact.** Lisibilité, accès à toutes les ères, tenue en 390×844. Effort **M**.
- **Risque.** Changement d'apparence, collisions résiduelles sur écran étroit. Mitigation : taille de nœud
  réduite quand le nombre de repères augmente, positions bornées à `[12 % ; 88 %]`.
- **Vérification.** Les 9 soleils de la France ont des positions distinctes ; en 1440×900 et 390×844,
  tous les nœuds restent dans le champ (aucun débordement mesuré sur `.constellation-field`).

## ATLAS-CONSTELL-05 — Planètes sans étiquette visible

- **Problème / preuve.** `.const-sun` et `.const-planet` sont en `color: transparent`
  (`styles.css:225,231`) ; seul le soleil possède un `::after` dérivé de `attr(title)`
  (`styles.css:227`). Les planètes n'ont donc aucune étiquette visible : leur nom n'apparaît que dans
  l'infobulle native (`planet.title = formatYear(event.year)`, `constellation.js:41`), inaccessible au toucher.
- **Solution.** Afficher un numéro d'ordre dans chaque planète et une étiquette courte (année + titre tronqué)
  via `data-label` et `::after`, avec un `aria-label` complet et unique (« Repère n : titre, année »).
  Étiquettes du soleil recentrées et dérivées de `data-label` (ère + bornes).
- **Impact.** Lisibilité immédiate, accessibilité, usage tactile. Effort **S**.
- **Risque.** Encombrement, double annonce au lecteur d'écran. Mitigation : texte tronqué en CSS,
  `aria-label` faisant foi, `::after` non dupliqué dans le nom accessible.
- **Vérification.** À l'écran, chaque planète porte un numéro et une étiquette lisible ; chaque planète a un
  `aria-label` unique contenant l'année ; aucun texte n'est porté uniquement par `title`.

## ATLAS-CONSTELL-06 — Sémantique ARIA absente

- **Problème / preuve.** Aucun `role`, `aria-label` ou `aria-current` n'est posé : l'état sélectionné est
  uniquement visuel via `is-active` (`constellation.js:28,37`). Les boutons n'ont pas de nom explicite
  (« Ère… », « Repère… »), le champ n'est pas annoncé comme groupe et la note n'est pas reliée au champ.
- **Solution.** `role="group"` + `aria-label` sur le champ et sur trois couches (ères / repères / points),
  `aria-current="true"` sur le nœud actif de chaque couche (pas `aria-pressed` : la sélection est exclusive),
  `aria-describedby` pointant vers la note, conservation du focus visible global (`styles.css:33-36`).
- **Impact.** Accessibilité, cohérence d'état, compréhension de la structure. Effort **S**.
- **Risque.** Verbosité excessive. Mitigation : un seul `aria-current` par couche et libellés concis.
- **Vérification.** Inspection du DOM : un seul `aria-current="true"` par couche ; le champ a
  `aria-describedby="constellation-note"` ; l'anneau de focus reste visible au Tab.

## ATLAS-CONSTELL-07 — Focus perdu au re-render clavier

- **Problème / preuve.** Tout changement d'état déclenche `render()` via `subscribe` (`app.js:8`) qui
  exécute `root.innerHTML = ''` (`shell.js:137`). Les flèches (`keyboard.js:45-59`) changent `eventIndex` /
  `eraIndex` et détruisent le bouton focalisé : le focus retombe sur `<body>` et la navigation Tab repart du
  début. Le README annonce pourtant un « parcours clavier complet » (`README.md:25`).
- **Solution.** Mémoriser dans le module la clé `data-const-key` du dernier contrôle focalisé (délégation
  `focusin`), puis restaurer le focus sur le nœud équivalent après rendu, uniquement si
  `state.view === 'constellation'` et qu'aucun panneau n'est ouvert. Rappeler les raccourcis dans la note.
- **Impact.** Navigation clavier utilisable, continuité après ←/→/↑/↓. Effort **M**.
- **Risque.** Vol de focus lors d'un changement de vue ou d'un panneau ouvert. Mitigation : gardes sur
  `state.view`, `state.detailOpen`, `state.helpOpen`, et `preventScroll`.
- **Vérification.** Tab sur une planète, ←, Tab : le focus revient sur la planète du repère courant ;
  en changeant de vue, aucun focus n'est volé ; l'e2e reste vert.

## ATLAS-CONSTELL-08 — États vides muets

- **Problème / preuve.** `if (!country) return;` (`constellation.js:17`) laisse une scène blanche si
  `countryId` est invalide. Si le pays n'a aucune ère, ou si l'ère active n'a aucun repère, les boucles
  (`constellation.js:27-35`) ne produisent aucun nœud et le champ reste vide sans explication. Le shell ne
  couvre que le cas `!state.countryId` (`shell.js:143-144`).
- **Solution.** Rendre un message explicite (« Aucune ère définie », « Aucun repère dans cette ère ») et un
  bouton de retour (globe ou chronologie) ; ne pas annoncer de points quand le repère n'en contient pas.
- **Impact.** Orientation, robustesse, accessibilité. Effort **S**.
- **Risque.** Messages jamais visibles avec le dataset actuel (10 pays ont tous des ères). Mitigation :
  rester des états de repli sans impact sur le rendu nominal.
- **Vérification.** Simulation en console d'un pays sans ère et d'une ère sans repère : message et bouton
  présents ; en conditions normales, aucun message parasite.

## ATLAS-CONSTELL-09 — Traçabilité hors ligne implicite et vocabulaire inexact

- **Problème / preuve.** Le module ne contient ni `fetch` ni URL externe (`constellation.js:1-49`), mais la
  note (`constellation.js:47`) ne l'affirme pas. Surtout, « point issu de l'audit » (`constellation.js:23`)
  est inexact : des points ont `sources: []` (`dataset.js:229,236`) et sont des récits curatés, pas des
  affirmations d'audit. La règle principale du README (`README.md:5`) est « aucun service externe ».
- **Solution.** Énoncer « données locales, zéro appel réseau » dans la note, distinguer dans `aria-label`
  des lunes les points avec et sans source (`N source(s) locale(s)` / `aucune source associée`), maintenir
  zéro `href`, `src`, `fetch` ou URL dans le module et documenter l'intention en commentaire de tête.
- **Impact.** Conformité à la règle hors ligne, honnêteté éditoriale. Effort **S**.
- **Risque.** Nul identifié. Mitigation : aucun nouveau libellé ne modifie le contenu historique.
- **Vérification.** Aucun `fetch`/XHR/`href`/`src`/URL de ressource dans `constellation.js` (le seul
  `http://www.w3.org/2000/svg` est le namespace XML du SVG, sans requête) ; la mention « zéro appel réseau »
  est visible ; les lunes sans source sont étiquetées comme telles.

## ATLAS-CONSTELL-10 — Coût de rendu évitable

- **Problème / preuve.** `country.events.indexOf(event)` est appelé deux fois par planète
  (`constellation.js:37,42`) : recherche linéaire répétée pour un résultat déjà connu (O(n²)). Le rendu complet
  est recréé à chaque `set()` (`app.js:8`, `shell.js:137`) et le champ n'est pas confiné (`styles.css:220`).
  Mesure sur le dataset : 12 repères maximum dans une ère (`france-era-2`) et 8 points maximum par repère,
  soit au plus 21 nœuds par rendu — le plafond est donc atteignable sans virtualisation.
- **Solution.** Construire une seule `Map` `id → index global` et réutiliser l'index (suppression des
  `indexOf`) ; ajouter `contain: layout paint` au champ ; ne créer qu'un SVG et les nœuds réellement
  nécessaires ; aucun canvas, aucune boucle rAF (cohérent avec la nature figée).
- **Impact.** Rendu plus stable et prévisible, pas de régression de performance sur les re-renders clavier.
  Effort **S**.
- **Risque.** `content-visibility` masquerait le contenu hors écran : ne pas l'utiliser ici ; seul
  `contain: layout paint` est retenu. Mitigation : champ déjà visible et de faible hauteur.
- **Vérification.** Aucun `indexOf` restant ; nombre de nœuds ≤ 21 sur tous les pays (16 observés pour la
  France : 9 ères + 3 repères + 4 points) ; aucun `requestAnimationFrame`/canvas ; `npm run verify` vert.

---

## Synthèse d'implémentation

- **Fichier possédé modifié :** `src/views/constellation.js` (les 10 chantiers).
- **CSS :** bloc injecté `<style id="atlas-constellation-css">` depuis le module ; `styles.css` non modifié.
- **Fichiers en lecture seule :** `src/domain/store.js`, `src/data/dataset.js`, `README.md` — inchangés.
- **Blocages :** aucun sur l'implémentation. Les chantiers 07 et 09 dépendent de `shell.js` /
  `keyboard.js`, mais restent implémentables dans le seul module possédé (restitution de focus locale,
  garde hors ligne locale). En revanche, `npm run check` échoue sur `test:e2e` : `page.goto(...)` avec
  `waitUntil: 'networkidle0'` (`tests/e2e.mjs:20`) expire après 30 s dans cet environnement. Reproduction
  confirmée avec le `constellation.js` d'origine remis en place temporairement : le blocage est
  **préexistant et indépendant de ce chantier** (les fichiers interdits `tests/e2e.mjs` et `scripts/serve.mjs`
  n'ont pas été modifiés).
- **Vérifications :**
  - `node --check src/views/constellation.js` → OK.
  - `npm run verify` (partie `check` de `npm run check`) → 21/21 PASS.
  - Parcours navigateur équivalent avec `waitUntil: 'domcontentloaded'` (script temporaire hors dépôt) →
    **32 PASS / 0 FAIL** : parcours clavier d'origine, lunes = points du repère, connecteurs, 9 soleils à
    positions distinctes, `contain`/`overflow`, CSS injecté unique, étiquettes, `aria-label`/`aria-current`,
    focus restauré après ←, clic lune → `pointIndex` + détail, 16 nœuds dans le champ en 390×844,
    zéro requête externe, état vide pays invalide.
