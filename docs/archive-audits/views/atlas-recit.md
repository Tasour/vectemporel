# atlas-recit — Récit guidé de V-ATLAS (Atlas)

> Expert : ingénieur pédagogique (progression, charge cognitive, clarté du récit, accessibilité de la lecture).
> Fichier possédé : `~/Projects/vectemporel-atlas/src/views/recit.js`. Lecture seule : `src/domain/store.js`, `src/data/dataset.js`, `README.md`.
> Données : 229 repères / 901 points ; `kind ∈ {récit, figure, lieu, audit}` ; `confidence ∈ {vérifié, certain, probable, disputed}` ; 587 points sans identifiant de source.
> Statut : **10/10 chantiers implémentés**, dont **1 partiel** (ATLAS-RECIT-01 : cadence détenue par `keyboard.js`).
> Ancres uniques utilisées : `#atlas-recit-css`, `#atlas-recit-live`, `#recit-point-title`, `#recit-context`. Zéro réseau ajouté.

---

## ATLAS-RECIT-01 — Rythme de lecture : état visible, durée estimée et contrôle Lire/Pause

- **Problème + preuve.** Le récit n'affiche qu'une phrase informative (`recit.js:47` avant audit : « Lecture automatique : Espace… ») : aucun état « lecture en cours / en pause » lisible dans la vue, alors que la coque affiche un état concurrent (`shell.js:152`). La cadence réelle est un `setInterval` de 5 000 ms aveugle à la longueur du texte (`keyboard.js:77-83`) : un point de ~15 mots et un de ~25 mots obtiennent le même temps, ce qui force le lecteur à courir après l'avance automatique (charge extrinsèque) ou à la subir en boucle.
- **Solution concrète.** Ajout d'un `p.recit-timing` (« Lecture estimée : ≈ N s », N = `clamp(ceil(mots/3), 4, 12)`, `recit.js:52-54`), d'un bouton bascule `aria-pressed` à libellé stable « Lecture automatique » (`recit.js:298`, icône `aria-hidden`), et d'une barre `.recit-progress` qui indique la position dans le repère (`recit.js:203-206`).
- **Impact pédagogique.** Restitue le contrôle métacognitif à l'apprenant (il sait si la lecture avance et peut l'arrêter) et rend le rythme prévisible avant l'effort de lecture.
- **Risque.** L'estimation pourrait laisser croire que le défilement l'adopte ; le libellé dit « estimée » et la légende rappelle les touches. **Blocage partiel :** la cadence effective de 5 s est dans `src/platform/keyboard.js` (possédé par `atlas-coque-navigation`) : non modifiable ici sans collision.
- **Effort.** M.
- **Vérification.** Harness Puppeteer : `aria-pressed` passe `false → true` et le libellé coque devient « lecture en cours » après `Espace` ; `.recit-timing` non vide. Cadence 5 s à arbitrer par l'agent maître.

## ATLAS-RECIT-02 — Enchaînement des points : contexte affiché une fois, fil narratif permanent

- **Problème + preuve.** `event.summary` était recopié à l'identique sur *chaque* point (`recit.js:35` avant audit), donc 4 lectures du même paragraphe pour un repère de 4 points : redundancy qui écrase la différence entre les points et décourage la relecture. Aucun moyen de revoir un point déjà traversé sans revenir à l'état global.
- **Solution concrète.** Le `p.recit-context` n'est rendu qu'au premier point (`recit.js:225-228`) ; aux points suivants, un `<nav class="recit-thread" aria-label="Fil du repère">` liste les `N` points avec numéro, type, texte tronqué à 72 caractères, `aria-current="step"` sur l'actuel et clic de retour (`recit.js:231-252`). La troncature est dérivée du texte source, jamais rédigée.
- **Impact pédagogique.** Construit le schéma du repère : l'apprenant voit la trajectoire (déjà lu → ici → à venir) au lieu d'une succession d'écrans sans mémoire.
- **Risque.** Le fil peut devenir long si un repère contient beaucoup de points ; il est en `flex-wrap` et chaque item porte un `aria-label` complet pour ne pas perdre l'information tronquée.
- **Effort.** M.
- **Vérification.** Harness : au point 3, `.recit-thread-item` = 4, `.recit-context` = 0, un seul `aria-current="step"`.

## ATLAS-RECIT-03 — Reprise et orientation : progression, recommencer, focus sur le point

- **Problème + preuve.** Seul le kicker « Étape X / N » existait (`recit.js:32` avant audit) : aucune progression graphique, aucun retour au début, et le focus restait sur le bouton cliqué après un changement de point (l'utilisateur clavier ne savait pas où il était retombé).
- **Solution concrète.** Barre de progression à largeur calculée (`recit.js:203`), bouton « ↺ Recommencer » désactivé au premier point (`recit.js:302-303`), `focusTitle()` après chaque action explicite qui place le focus sur le `h1#recit-point-title` (`tabindex="-1"`, `recit.js:158-165`), et annonce polie du nouveau point.
- **Impact pédagogique.** La reprise est une compétence à part entière : l'apprenant peut repartir du début d'un repère sans changer de vue et retrouve immédiatement le fil là où il l'a quitté.
- **Risque.** Un focus déplacé à chaque avance automatique serait intrusif : il n'est déclenché que par les actions explicites (boutons), pas par la lecture automatique.
- **Effort.** S.
- **Vérification.** Harness : après clic sur « Point suivant », `document.activeElement.id === 'recit-point-title'` et `pointIndex` incrémenté.

## ATLAS-RECIT-04 — Compréhension des certitudes : gloses contextualisées et encodage texte + symbole

- **Problème + preuve.** La certitude était affichée brute (`recit.js:34` avant audit : `${point.confidence}`), avec la valeur anglaise `disputed` au milieu d'une interface française et sans explication. Un lecteur ne pouvait pas distinguer « vérifié » de « certain », ni comprendre « disputed ».
- **Solution concrète.** Table `CONFIDENCE` (`recit.js:6-11`) : ✓ Vérifié, ■ Certain, ◐ Probable, ≈ Contesté (« disputed » traduit et signalé comme terme source). Chaque mention porte un `title` et sa glose est visible dans `.recit-timing` ; une légende explicite est ajoutée en fin de vue (`recit.js:311`). Aucune hiérarchie ni aucun fait historique inventé : les gloses restent des descriptions de mentions d'audit.
- **Impact pédagogique.** Rend l'épistémologie lisible : l'apprenant sait que le degré de certitude est une propriété de l'affirmation, pas une opinion du lecteur — condition d'une lecture critique.
- **Risque.** Une traduction trop interprétative pourrait sur-affirmer ; « Contesté » est accompagné du terme source entre guillemets.
- **Effort.** M.
- **Vérification.** Contrôle DOM : `.recit-conf` contient un symbole + un libellé ; la chaîne « disputed » apparaît dans la légende ; aucun appel réseau.

## ATLAS-RECIT-05 — Accessibilité du texte : structure sémantique et annonce du changement

- **Problème + preuve.** Le `h1.recit-title` n'avait ni `id` ni description associée, et la coque reconstruisant tout le DOM à chaque `set` (`shell.js:137`), un lecteur d'écran n'était jamais averti du changement de point : les flèches et la lecture automatique produisaient un silence.
- **Solution concrète.** `h1#recit-point-title` avec `aria-describedby="recit-context"` au premier point (`recit.js:209-216`), région d'annonce **persistante** `#atlas-recit-live` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) créée une fois dans `<body>` et mise à jour à chaque rendu (`recit.js:105-123`, `recit.js:320`) — elle survit au `innerHTML` de la coque. `aria-label` complets sur les items du fil, `aria-keyshortcuts` sur les commandes.
- **Impact pédagogique.** Équité de lecture : le point changeant est annoncé avec son numéro, son type, sa certitude et son texte ; l'orientation reste disponible sans visualisation de la page.
- **Risque.** Annonce trop verbeuse en lecture automatique (5 s) ;.Register `polite` et `aria-atomic` limitent la redondance, et la durée est calibrée sur le texte.
- **Effort.** M.
- **Vérification.** Harness : un seul `#atlas-recit-live` après 3 changements de point (pas de duplication), texte d'annonce conforme au point courant, zéro erreur console.

## ATLAS-RECIT-06 — Cohérence avec l'état partagé : commandes bornées et continuation inter-repères

- **Problème + preuve.** « Point précédent » et « Point suivant » restaient actifs partout et étaient des no-ops aux bornes (`recit.js:42-43` ancien : `Math.max(0, …)` / `Math.min(length-1, …)`), tandis que le clavier boucle au dernier point (`keyboard.js:47`) : deux modèles de fin de séquence coexistaient. Aucun moyen de continuer vers le repère suivant depuis le récit.
- **Solution concrète.** Calcul `isFirst` / `isLast` / `isLastEvent` (`recit.js:180-184`), `disabled` + `aria-disabled` aux bornes via `makeButton` (`recit.js:142-151`), et bouton « Repère suivant ↗ » qui appelle `stepEvent(1)` du store partagé (`recit.js:4`, `recit.js:306-308`), désactivé au dernier repère du pays. Le store réinitialise `pointIndex` à 0 via `selectEvent` (`store.js:62-69`).
- **Impact pédagogique.** La progression du récit s'inscrit dans l'atlas entier : la fin d'un repère ouvre naturellement le suivant, sans rupture ni retour arrière.
- **Risque.** `stepEvent` modifie aussi `eraIndex` et `placeIndex` : c'est le comportement attendu du store, documenté, pas une surprise pour l'utilisateur.
- **Effort.** M.
- **Vérification.** Harness : au point 1, « Point précédent » est `disabled` ; au dernier point, « Point suivant » est `disabled` ; clic sur « Repère suivant » → `eventIndex + 1` et `pointIndex === 0`.

## ATLAS-RECIT-07 — Navigation clavier : suppression de l'activation double sur les boutons

- **Problème + preuve.** Le routeur global intercepte `Entrée` (ouvre le détail) et `Espace` (bascule la lecture) en phase de capture sur `document` (`keyboard.js:60-70`, enregistré avec `true` en `keyboard.js:73`). Un focus sur « Point suivant » puis `Entrée` déclenchait **à la fois** l'ouverture du détail et l'avancement du point — comportement imprévisible et non annoncé.
- **Solution concrète.** Garde-fou installé une seule fois en capture sur `window` (`recit.js:125-140`) qui arrête la propagation de `Entrée`/`Espace` uniquement quand la cible est un bouton du récit (`.recit-actions button`, `.recit-thread-item`, `.recit-trace summary`). Les flèches, les touches de vue et `?` restent sous la responsabilité du routeur global ; aucun autre fichier n'est modifié.
- **Impact pédagogique.** Le clavier devient un mode de lecture fiable : la même touche produit toujours la même action, condition d'un parcours sans effort attentionnel supplémentaire.
- **Risque.** Un écouteur `window` est global : il est strictement conditionné à `state.view === 'recit'` et à une liste de cibles, et ne bloque pas `preventDefault()` l'activation native du bouton. À signaler à l'agent `atlas-coque-navigation` pour fusion éventuelle dans le routeur.
- **Effort.** M.
- **Vérification.** Harness : focus sur « Point suivant » + `Entrée` → `pointIndex` incrémenté, `detailOpen === false`, aucun `.detail-overlay` ; `Espace` hors bouton bascule bien `playing`.

## ATLAS-RECIT-08 — Mobile : reflow de la colonne de lecture et cibles tactiles

- **Problème + preuve.** À ≤ 1 000 px, `styles.css:258` imposait `grid-template-rows: 32% minmax(0,1fr)` : l'image garde une hauteur fixe proportionnelle à l'écran et le texte long reste compressé dans le tiers inférieur, avec des paddings de `clamp(24px,4vw,52px)` (`.recit-body`, `styles.css:185`) qui réduisent encore la mesure sur téléphone.
- **Solution concrète.** Bloc `<style id="atlas-recit-css">` injecté depuis le module (`recit.js:55-99`), ajouté en fin de `<head>` donc prioritaire à spécificité égale, sans toucher à `styles.css` : à ≤ 1 000 px, lignes `minmax(110px,26%) minmax(0,1fr)` et corps limité à `80ch` ; à ≤ 620 px, image `min-height:96px / max-height:20vh`, corps `padding:16px`, titre `clamp(24px,7vw,34px)`, texte `14px / 1.65`, boutons ≥ 40 px, crédits image masqués pour laisser la place au texte. `prefers-reduced-motion` respecté.
- **Impact pédagogique.** La lisibilité est une condition de la compréhension : sur mobile, le texte redevient l'élément principal et les cibles restent actionnables sans zoom.
- **Risque.** Aucune suppression de règle existante ; le bloc est idempotent (un seul `<style>` injecté) et ne vise que les classes du récit.
- **Effort.** M.
- **Vérification.** Contrôle DOM : `document.getElementById('atlas-recit-css')` unique ; emulation 390×844 → `.recit-body` visible, un seul `.recit-title`, aucun débordement horizontal.

## ATLAS-RECIT-09 — Charge cognitive : traçabilité repliée et crédit d'image lisible

- **Problème + preuve.** Les identifiants de sources étaient affichés en permanence (`recit.js:36` ancien : `Sources du point : SRC-001, SRC-015`) alors que 587 des 901 points n'en ont aucun : information de second niveau (bruit) placée au même plan que l'affirmation. Le crédit et la licence de l'image (`dataset.js`, champs `credit` / `license`) n'étaient jamais montrés, alors que la légende l'était.
- **Solution concrète.** `<details class="recit-trace">` replié par défaut avec `<summary>Traçabilité · N référence(s) locale(s)` et les identifiants en texte (aucun lien) ; à défaut, phrase explicite « Aucun identifiant de source attaché à ce point… » (`recit.js:254-260`). Crédit et licence affichés en texte nu dans `.recit-media-credit` (`recit.js:193-195`).
- **Impact pédagogique.** Hiérarchise l'information : l'affirmation et sa certitude d'abord, la preuve accessible à la demande — c'est exactement la distinction entre lire et vérifier.
- **Risque.** Le `<details>` doit rester indexable et actionnable au clavier : `summary` reçoit le focus visible via le CSS injecté.
- **Effort.** S.
- **Vérification.** Harness : `.recit-trace` absent au point sans source, présent au point avec source ; `a[href^="http"]` = 0 dans la vue.

## ATLAS-RECIT-10 — Provenance des points : légende des types et transparence éditoriale

- **Problème + preuve.** Le type de point apparaissait brut dans le kicker (`recit.js:32` ancien : `${point.kind}`), sans dire ce qu'il signifie, alors que le README (`README.md:59`) définit précisément les quatre origines : phrases des résumés vérifiés, affirmations des audits, figures, lieux documentés.
- **Solution concrète.** Table `KIND` (`recit.js:13-18`) et légende visible (`recit.js:312`) : « récit = phrase de la synthèse vérifiée · figure = affirmation sur un acteur · lieu = repère géographique documenté · audit = affirmation issue de l’audit ». La légende des certitudes rappelle que les mentions sont « reprises des audits, sans réécriture » ; l'en-tête du module déclare qu'aucune donnée historique n'est ajoutée.
- **Impact pédagogique.** Développe la vigilance épistémique : l'apprenant peut classifier ce qu'il lit (synthèse, acteur, lieu, audit) et sait que l'interface n'invente rien.
- **Risque.** Les gloses doivent rester calquées sur le README, pas sur une interprétation des données ; c'est le cas.
- **Effort.** S.
- **Vérification.** Comparaison littérale des quatre gloses avec `README.md:59` ; `node --check` et `npm run verify` sans régression.

---

## Vérifications globales

| Commande | Résultat |
| --- | --- |
| `node --check src/views/recit.js` | OK |
| `npm run verify` | 21/21 PASS (dont « aucun lien externe », « ids uniques », « routeur clavier unique ») |
| `npm run test:e2e` | **Bloqué avant navigation** : `Navigation timeout of 30000 ms exceeded` sur `page.goto(..., waitUntil:'networkidle0')` (`tests/e2e.mjs:20`). Toutes les requêtes se terminent pourtant (journal réseau) : le blocage vient du démarrage WebGL du globe, hors périmètre `recit.js`. |
| Harness équivalent (`domcontentloaded`) | 15/15 PASS, including « un point affiché » (`.recit-title` unique) et « aucune erreur console ». |
| Contrôles ciblés | CSS injecté unique, région live unique, focus clavier, garde anti-double-activation, bornes des boutons, fil narratif, aucun lien externe : OK. |

**Blocage remonté à l'agent maître :** (a) cadence de lecture fixe de 5 s (`keyboard.js:83`, vue `atlas-coque-navigation`) → adapter la durée au texte ou prévoir un réglage ; (b) `waitUntil:'networkidle0'` dans `tests/e2e.mjs` rend `npm run check` rouge dans cet environnement → remplacer par `domcontentloaded` + attente explicite (fichier de test non possédé par ce sous-agent).
