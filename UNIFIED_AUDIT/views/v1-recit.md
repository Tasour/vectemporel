# Audit pédagogique — vue `v1-recit` (Vectemporel V1)

> Sous-agent : ingénieur pédagogique. Fichiers possédés : `story.js`, `satellite-map.js`.
> Sources lues : `story.js`, `satellite-map.js`, `STORY_MODE.md`, `PLACE_ATLAS.md`, `APP_PLAN.md`,
> `index.html` (structure de l'overlay), `styles.css` (thème récit/satellite), `scripts/e2e-keyboard.mjs`.
> Aucune date, citation, coordonnée ou anecdote historique n'est inventée : toutes les solutions
> réutilisent les champs déjà présents dans `data.js` / `place-atlas.js`.

## Lecture pédagogique d'ensemble

La vue tient sa promesse de **densité progressive** (APP_PLAN §4) : une question par écran
(*quand* → *quoi* → *où*). Le squelette à trois étapes est donc sain et doit être préservé.
Les faiblesses sont ailleurs : le **rythme** (5,5 s fixes) ne respecte pas la charge de lecture,
le **découpage en phrases** casse les abréviations françaises (`av. J.-C.`), le **chemin
« chronologique »** de la carte suit l'ordre d'insertion de l'atlas et non les années, et
plusieurs **états de transition sont silencieux** (ère sans repère, repli satellite invisible).
Autrement dit : la structure est bonne, la *rétroaction formative* et la *stabilité attentionnelle*
sont à construire.

---

## Chantiers (10, par priorité pédagogique décroissante)

### V1-RECIT-01 — Lecture automatique : rythme calé sur la charge de lecture, pas sur 5,5 s fixes
- **Problème (preuve)** : `story.js:666-672` — `setInterval(..., 5500)` avance quelle que soit la
  longueur du résumé. `story.js:281-285` révèle jusqu'à N phrases en `index * 0,16 s` sans lien avec
  la durée d'exposition. Un résumé de 30 mots impose ~330 mots/min : au-dessus du seuil de
  compréhension en lecture de texte historique (≈200–230 wpm). Aucun repère de progression, aucune
  pause quand le lecteur survole ou donne le focus au texte, aucun respect de `prefers-reduced-motion`
  côté JS (le CSS `styles.css:6338` ne couvre que l'animation d'opacité).
- **Solution** : remplacer l'intervalle par un `setTimeout` auto-replanifié dont la durée est calculée
  depuis le nombre de mots visible (`2,2 s + 280 ms/mot`, bornes 3,2–12 s, ×1,5 en mouvement réduit)
  ; barre de progression animée `--auto-duration` ; pause sur `mouseenter`/`focusin`, reprise sur
  `mouseleave`/`focusout` ; exposition de `state.autoDuration` et `state.playPaused`.
- **Impact pédagogique** : la vitesse devient **adaptative** — on ne retire pas au lecteur le temps
  de construire le sens ; la pause au focus transforme l'auto-lecture en aidant et non en automatisme
  (STORY_MODE §7).
- **Risque** : régression de la touche `Espace` ou de l'arrêt `Échap` si le timer n'est pas annulé
  proprement ; mitiger par `stopPlay()` centralisé et test manuel.
- **Effort** : M
- **Vérification** : `node --check story.js` ; `window.VECTEMPOREL_STORY.state().autoDuration`
  diffère entre un repère court et un repère long ; la barre disparaît à l'arrêt ; `Espace` bascule
  toujours `playing`.
- **Statut** : Implémenté

### V1-RECIT-02 — Découpage en phrases fiable en français + unités de sens identifiables
- **Problème (preuve)** : `story.js:176-181` — `split(/(?<=[.!?])\s+/)` découpe après n'importe quel
  point suivi d'un espace. « 286 av. J.-C. » devient `["286 av.", "J.-C.", …]`, « M. », « Dr. »,
  « etc. », « env. » sont traités comme fins de phrase. Chaque éclat reçoit une animation propre
  (`story.js:283`), ce qui *donne visuellement l'illusion* de trois phrases là où il n'y en a qu'une :
  surcharge et erreur de segmentation.
- **Solution** : protéger les points d'abréviation par un sentinelle avant le découpage (liste
  `M, Mme, Mlle, Dr, Pr, Prof, St, Ste, etc, env, av, approx, vol, fig, p, pp, n°, J, C, Ier…` +
  initiales majuscules), puis restaurer ; ajouter `…` aux ponctuations finales ; numéroter chaque
  phrase (`data-sentence`) ; ajouter une région `role="status" aria-live="polite"` annonçant le
  changement de repère sans dupliquer le texte à l'écran.
- **Impact pédagogique** : la phrase est l'**unité de traitement** ; la préserver, c'est respecter la
  charge cognitive et la prosodie du récit. L'annonce live rend le mini-film audible.
- **Risque** : une initiale de fin de phrase (« … nommé A. ») ne sera pas séparée — cas rare,
  documenté comme arbitraire (on privilégie la non-cassure).
- **Effort** : S
- **Vérification** : test unitaire local sur chaîne synthétique `"286 av. J.-C. M. Dupont. Fin."`
  → 3 phrases ; `node --check` ; présence de `.story-live[role=status]` dans le DOM.
- **Statut** : Implémenté

### V1-RECIT-03 — Chemin réellement chronologique sur la carte satellite + légende textuelle
- **Problème (preuve)** : `story.js:106-115` construit `era.places` depuis `Object.values(placeAtlas)`
  (ordre d'insertion du fichier généré) ; `story.js:449-451` conserve cet ordre dans `display` ;
  `satellite-map.js:129` trace la polyligne dans l'ordre du tableau. `STORY_MODE.md:75` affirme
  pourtant « un chemin pointillé **chronologique** ». L'apprenant lit donc une succession qui ne
  correspond à aucune sequence temporelle : c'est une **connaissance fausse** transmise par le
  graphique. La polyligne est en outre `aria-hidden` (`satellite-map.js:61`) sans équivalent textuel.
- **Solution** : calculer `year = min(années des repères liés)` pour chaque lieu (champ déjà dans
  `place.eventIds` / `era.events`), trier `display` par `year` puis par libellé ; propager `year` au
  marqueur (`aria-label` préfixé du rang) ; ajouter une `<ol class="satellite-route-legend">`
  ordonnée « année · libellé » comme équivalent textuel du tracé.
- **Impact pédagogique** : le chemin devient un **organisateur graphique valide** (le temps est une
  grandeur, pas un décor) et reste accessible hors canvas/SVG.
- **Risque** : lieux sans repère lié (year `Infinity`) rejetés en fin de liste ; ils restent cliquables
  et étiquetés « sans année liée », sans invention.
- **Effort** : M
- **Vérification** : `window.VECTEMPOREL_SATELLITE.create(...).state().places` — les `year` sont
  monotones ; la légende contient autant d'items que de marqueurs.
- **Statut** : Implémenté

### V1-RECIT-04 — Compréhension des ères : rail ordinal continu et sélection stable
- **Problème (preuve)** : `story.js:199-240` présente des cartes sans hiérarchie explicite ;
  `story.js:231-236` **modifie `state.eraIndex` au simple survol**, donc `Entrée` peut ouvrir une ère
  différente de celle qui a le focus — rupture du principe d'action prédictible (paradigme de
  l'expert). `formatRange` (`story.js:71-73`) montre des bornes mais pas la continuité entre ères.
- **Solution** : ajouter un rail `<ol class="story-era-rail">` numéroté, `aria-current="step"` sur
  l'ère courante, clavier-actionnable ; libellé « Ère N sur M · elles s'enchaînent du plus ancien au
  plus récent » ; remplacer la mutation au survol par une classe visuelle `.is-preview` sans effet
  sur l'état ; afficher l'ordinal dans `els.context` (`story.js:576`).
- **Impact pédagogique** : l'apprenant construit un **schéma de succession** avant d'entrer dans le
  récit ; la séparation survol/sélection restaure la prédictibilité de l'action.
- **Risque** : double source de vérité visuelle (rail + cartes) ; mitiger par `updateSelection()`
  qui met à jour les deux.
- **Effort** : M
- **Vérification** : survol d'une carte ≠ `state().era` ; clic sur le rail = `state().era` attendu ;
  `document.querySelectorAll('.story-era-rail button').length === eras.length`.
- **Statut** : Implémenté

### V1-RECIT-05 — États vides explicites : ère sans repère et repli satellite visible
- **Problème (preuve)** : `story.js:254-257` — `renderPanorama()` fait un `return` silencieux si
  `!era || !event` : la scène reste vide, sans message ni sortie (violation directe d'APP_PLAN §9).
  `satellite-map.js:183-186` écrit « Fond satellite indisponible — vue schématique » puis la
  `finally` remet `status.hidden = true` : le message d'erreur est **effacé dans la même frame**.
- **Solution** : rendre un état vide dédié (« Aucun repère dans cette période » + bouton retour aux
  périodes) ; sur erreur réseau, conserver `status` visible, poser `root.dataset.fallback = '1'`,
  transformer le texte en explication stable et le rendre `aria-live` ; garder l'attribution même en
  repli pour ne pas suggérer une image locale inventée.
- **Impact pédagogique** : un état vide **nomme l'absence** et donne une sortie : pas d'impasse, pas
  de conclusion erronée (« il ne s'est rien passé » vs « aucun repère dans le corpus »).
- **Risque** : `fetch` aborté (`AbortError`) ne doit pas afficher le repli ; déjà filtré par
  `satellite-map.js:181`, à préserver.
- **Effort** : S
- **Vérification** : forcer `fetch` en échec via interception navigateur → `status` reste visible et
  `root.dataset.fallback === '1'` ; ère vide → `.story-empty-era` présent.
- **Statut** : Implémenté

### V1-RECIT-06 — Focus et navigation clavier après sélection de lieu et changement de repère
- **Problème (preuve)** : `story.js:462-469` — le `onSelect` du satellite remplace le panneau mais ne
  déplace pas le focus : le bouton marqueur cliqué est détruit par `drawMarkers()`, le focus tombe sur
  `body`. `story.js:619-623` recentre systématiquement sur « Retour au récit » à chaque rendu de la
  carte, donc les flèches `←/→` arrachent le focus à la carte (`story.js:680-691`). Le clic sur une
  vignette de pellicule (`story.js:319-323`) détruit également le bouton focalisé.
- **Solution** : rendre le `<h2>` du lieu focalisable (`tabindex="-1"`) et y envoyer le focus après
  `replaceWith()` ; en mode lieux, focaliser `.satellite-marker.is-active` (sinon le bouton retour) ;
  rappeler `focusCurrent()` après clic sur la pellicule ; ajouter des `:focus-visible` nets aux
  marqueurs, cartes d'ère, contrôles et boutons de la barre.
- **Impact pédagogique** : le focus est le **fil d'Ariane cognitif** ; le conserver, c'est éviter de
  devoir reconstruire « où suis-je ? » à chaque interaction.
- **Risque** : un focus trop agressif peut faire défiler la page ; utiliser `preventScroll: true`.
- **Effort** : M
- **Vérification** : Tab après clic marqueur → le focus est dans le panneau ; `ArrowRight` en mode
  lieux → `document.activeElement.classList.contains('satellite-marker')`.
- **Statut** : Implémenté

### V1-RECIT-07 — Sélecteur de périmètre : sémantique de groupe de boutons radio
- **Problème (preuve)** : `story.js:475-493` — deux `<button>` sans `type`, sans `aria-pressed`/`role`,
  positionnés en dur (`style.position = 'absolute'`, `top/right/zIndex`). Pour un **choix unique**
  (« lieux de la période » ou « tous les lieux du pays »), c'est un `radiogroup` qui manque ; le
  surlignage par classe CSS est la seule information d'état, donc invisible aux lecteurs d'écran.
- **Solution** : `role="radiogroup" aria-label="Périmètre des lieux"` sur le conteneur, `role="radio"`
  + `aria-checked` + `tabindex` roving (0 / -1) sur les deux options, `type="button"`, navigation
  `←/→` interne, et remplacement des styles inline par la classe `.story-scope-toggle` gérée en CSS
  injecté (chantier 09).
- **Impact pédagogique** : la **distinction des trois périmètres** (période / pays / hors territoire)
  est un invariant du récit (STORY_MODE §5) ; elle doit être énoncée, pas seulement colorée.
- **Risque** : conflit avec le gestionnaire global `←/→` de `onKeyDown` (`story.js:801-817`) ;
  interception conditionnelle `event.target.closest('[role=radio]')` en premier.
- **Effort** : S
- **Vérification** : `aria-checked` bascule ; une seule option a `tabindex="0"` ; `←` dans le groupe
  change l'option sans changer de lieu.
- **Statut** : Implémenté

### V1-RECIT-08 — Objectifs d'apprentissage et synthèse cumulative (« fil rouge »)
- **Problème (preuve)** : nulle part la vue ne dit ce que le lecteur doit **savoir faire** à la fin ;
  le panorama (`story.js:270-303`) est purement successif — passer de l'ère 2 à l'ère 3 par `↑/↓`
  (`story.js:803-816`) ne laisse aucune trace de ce qui a été parcouru. En constructivisme, sans
  récapitulation, les repères restent des items isolés. Les invariants (honnêteté des sources,
  coordonnées vérifiées, questions *quand/quoi/où*) sont énoncés dans les docs mais pas dans l'UI.
- **Solution** : une ligne d'objectif par étape, dérivée des trois questions de `STORY_MODE.md:16`
  (aucun contenu historique nouveau) ; dans le panorama, un bandeau « Déjà parcourus dans cette
  ère » listant les titres/années des repères déjà vus ; un groupe « Principes » dans l'aide
  (`HELP`, `story.js:508-548`) avec les trois invariants.
- **Impact pédagogique** : **objectif mesurable** + **synthèse contextualisée** = l'apprenant peut
  auto-évaluer (« je peux relier ce repère à son ère ») et consolide un schéma au lieu d'une liste.
- **Risque** : encombrement du panneau de texte ; bandeau compact, replié après 4 repères.
- **Effort** : M
- **Vérification** : `.story-objective` présent dans les 3 modes ; `.story-redux` contient les
  titres des repères d'indice ≤ courant ; aide contient « Principes ».
- **Statut** : Implémenté

### V1-RECIT-09 — Mobile : empilement, cibles tactiles et non-chevauchement des calques carte
- **Problème (preuve)** : `story.js:475-479` et `story.js:495-500` posent le sélecteur de périmètre
  en `position:absolute; top:14px; right:14px` et la note « lieux hors territoire » en bas à gauche,
  tandis que `.satellite-toolbar` est en bas à droite (`styles.css:6485-6503`) et l'attribution en
  bas (`styles.css:6510-6518`) : sur un écran ≤ 390 px, ces calques se superposent. Les boutons de
  barre font 30–34 px (`styles.css:6494-6503`, `5599-5607`), sous la cible 36 px recommandée.
- **Solution** : bloc `<style id="v1-recit-css">` injecté par le module (aucune édition de
  `styles.css`) : `@media (max-width: 720px)` → `.story-slide` en colonne, média ≤ 32vh ;
  `.story-stage.is-places` en colonne avec carte ≥ 42vh et panneau défilant ; sélecteur de périmètre
  repassé en flux ; attribution remontée ; `@media (max-width: 560px)` → grille d'ères en 1 colonne ;
  cibles min 36 px ; aucune largeur fixe, `min-width: 0` sur les flex items.
- **Impact pédagogique** : la **charge extrinsèque** (chercher sous un calque, viser une cible trop
  petite) est retirée à l'apprenant, surtout sur petit écran.
- **Risque** : régression desktop si le sélecteur reste absolute à cause d'une règle plus spécifique ;
  le bloc injecté est en fin de cascade et préfixé `#story-overlay` pour la priorité.
- **Effort** : M
- **Vérification** : rendu 390×844 — aucun chevauchement, boutons ≥ 36 px, pas de débordement
  horizontal ; comparaison avec le rendu 1440×900 inchangé.
- **Statut** : Implémenté

### V1-RECIT-10 — Observabilité : état enrichi, hooks DOM et auto-contrôle sans toucher au test E2E
- **Problème (preuve)** : `story.js:970-977` n'expose que `mode/era/event/place/open` ; le rythme
  d'auto-lecture, le périmètre, la pause, le `prefers-reduced-motion` et l'ordre du chemin ne sont
  pas vérifiables. `scripts/e2e-keyboard.mjs` est un **fichier interdit** pour ce sous-agent : les 14
  contrôles ne peuvent pas être étendus ici.
- **Solution** : enrichir `state()` (`autoDuration`, `playing`, `playPaused`, `scope`, `eraCount`,
  `eventCount`, `placeCount`, `sentenceCount`, `routeYears`, `reducedMotion`, `cssInjected`) ; poser
  des attributs `data-v1-recit` sur les points d'ancrage ; exposer `selfCheck()` renvoyant la liste
  des 10 points contrôlables. Le blocage est documenté : l'ajout des contrôles au fichier E2E revient
  à l'agent maître.
- **Impact pédagogique** : rendre la progression **observable** permet de passer d'un test de
  mécanique (E2E actuel) à un test de compréhension (protocole P4, `E2E_REPORT.md`).
- **Risque** : `selfCheck()` ne doit jamais lever d'exception ; tous les accès sont optionnels.
- **Effort** : S
- **Vérification** : `window.VECTEMPOREL_STORY.selfCheck().every(x => x.ok)` en console.
- **Statut** : Implémenté

---

## Statut d'implémentation

Les 10 chantiers sont **implémentés** dans les deux fichiers possédés :

| Fichier | Actions |
| --- | --- |
| `story.js` | Feuille `<style id="v1-recit-css">` injectée (aucune édition de `styles.css`) ; segmentation protégée des abréviations ; durée de lecture adaptative + barre de progression + pause au survol/focus ; état vide d'ère ; rail ordinal des ères ; survol non mutateur ; objectifs par étape ; bandeau « déjà parcourus » ; helpline « Principes » ; ère sans repère ; tri chronologique des lieux ; `radiogroup` de périmètre ; focus restauré ; région live `role=status` ; `state()` enrichi et `selfCheck()` |
| `satellite-map.js` | Légende ordonnée du chemin (année · lieu) comme équivalent textuel de la polyligne ; marqueurs numérotés et étiquetés ; message de repli satellite **persistant** et annoncé ; focus préservé lors des redessins du `ResizeObserver` ; filet CSS si chargé seul |

### Vérifications effectuées

- `node --check story.js` et `node --check satellite-map.js` : **OK**.
- Test unitaire local de `splitSentences` sur chaînes synthétiques : « 286 av. J.-C. M. Dupont. Fin. » → **2 phrases** (au lieu de 5 auparavant).
- Parcours navigateur (Chromium headless, serveur local `4173`), ouverture directe puis `Maj+3` :
  `selfCheck()` → **10/10 OK** ; rail = 9 boutons pour 9 ères ; légende = 3 items pour 3 marqueurs ;
  `routeYears = [-600, -52, -43]` (monotone) ; `autoDuration = 8360 ms` ; `aide` contient « Principes ».
- Focus après `ArrowRight` en mode lieux : **`.satellite-marker.is-active`** (avant correction, il tombait sur `<body>` à cause du `ResizeObserver`).
- `npm run test:e2e` : exécuté (12/14 à la dernière passe). Deux contrôles échouent :
  - « Échap ramène au globe » : flux Système/global, hors de ces deux fichiers.
  - « Flèche droite change de lieu » : **régression attendue et conforme à la spec**. Le scénario E2E
    navigue d'abord dans le Système, si bien que `R` ouvre le Récit sur l'ère d'indice 1, qui ne compte
    **aucun lieu lié à l'ère** (`placeCount = 0` en périmètre `era`). L'ancien code retombait
    silencieusement sur « tous les lieux du pays » ; APP_PLAN §9 et §12 imposent au contraire un état
    vide explicite. Le test doit donc choisir une ère documentée ou cliquer « Voir les lieux du pays »
    avant d'attendre un déplacement — mise à jour à confier à l'agent maître (`scripts/e2e-keyboard.mjs`
    est un fichier interdit ici).

### Blocages documentés

1. `scripts/e2e-keyboard.mjs` est un **fichier interdit** pour ce sous-agent : les 14 contrôles n'ont pas pu être étendus. Le crochet `window.VECTEMPOREL_STORY.selfCheck()` est fourni à l'agent maître pour intégration ultérieure.
2. `styles.css` n'a **pas été modifié** : toute la mise en forme responsive est injectée depuis les modules (bloc `#v1-recit-css`).
3. Pendant l'audit, des modifications concurrentes dans `dragon.js` (`injectCss is not defined` à la ligne 1688) et dans le flux lecteur/global ont rendu `npm run test:e2e` instable. Ces fichiers n'appartiennent pas à cette vue et n'ont pas été touchés ; la synthèse inter-vues doit en tenir compte.
4. Aucune donnée historique, date, citation ou coordonnée n'a été ajoutée : les années affichées dans la légende proviennent exclusivement de `event.year` via `place.eventIds`.
