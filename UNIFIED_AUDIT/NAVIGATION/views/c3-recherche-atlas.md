# c3-recherche-atlas — Navigation fine dans le contenu de l'Atlas (niveau MICRO)

> Surface : c3-recherche-atlas · POC + Atlas traités comme une seule app.
> Fichiers possédés exclusivement : ~/Projects/vectemporel-atlas/src/views/recit.js et ~/Projects/vectemporel-atlas/src/views/geography.js.
> Lecture seule : src/domain/store.js, src/platform/keyboard.js, src/ui/shell.js, src/views/chronology.js, README.md, tests/e2e.mjs.
> CSS : blocs injectés <style id=nav-c3a> (récit) et <style id=nav-c3b> (géographie). styles.css intact.
> Aucune donnée historique inventée : seuls les champs réels de DATASET et des compteurs calculés sont affichés. Zéro réseau. Ancres préfixées c3a- / c3b-.
> Référence de cohérence : la vue Chronologie (src/views/chronology.js), déjà auditée — recherche, filtres, compteur, état vide, restauration de focus.

## Synthèse

| ID | Priorité | Titre | Fichier | Effort |
| --- | --- | --- | --- | --- |
| C3-01 | P1 | Recherche locale des points, ancrée et toujours visible | recit.js | M |
| C3-02 | P1 | Filtres compréhensibles par type et certitude | recit.js | M |
| C3-03 | P1 | Résultats comptés, état vide et réinitialisation | recit.js | S |
| C3-04 | P1 | Navigation clavier dans le fil (roving + flèches / Home / End) | recit.js | M |
| C3-05 | P1 | Recherche locale des lieux et filtre de périmètre | geography.js | L |
| C3-06 | P1 | Liste ordonnée unifiée des lieux et navigation clavier | geography.js | L |
| C3-07 | P1 | Résultats comptés, état vide et réinitialisation (géographie) | geography.js | M |
| C3-08 | P2 | Sélection conservée et retour au point d'origine | recit.js | M |
| C3-09 | P2 | Retour à l'origine de périmètre et focus restauré | geography.js | M |
| C3-10 | P3 | Contrat C3 commun de cohérence avec la Chronologie | les deux | M |

---

## C3-01 (P1) — Recherche locale des points, ancrée et toujours visible (Récit)

- **Problème + preuve.** `recit.js:225` : `if (isFirst) { …contexte… } else { …fil… }`. Le fil des points n'existe qu'à partir du deuxième point : au premier point, aucune liste, aucun moyen de joindre un point par son texte. Aucun champ de recherche n'existe dans la vue, alors que la Chronologie en a un (`chronology.js:192-205`). Le `h1` porte le texte du seul point courant (`recit.js:211`), donc les 900 autres points du repère sont inatteignables autrement qu'en avançant un par un.
- **Solution concrète.** Rendre le fil permanent (contexte au point 1 **et** fil affiché) et ajouter une barre d'outils fixe juste après le kicker : `input[type=search]#c3a-search` avec `aria-controls=c3a-thread`, `data-fk=c3a-search`, valeur restaurée depuis un état local de module `c3aLocal.query`. Le filtrage porte sur `point.text` et `formatYear`, jamais sur une donnée rédigée. `set({}, 'c3a-filter')` déclenche le rendu ; la coque restaure le focus via `data-fk` (`shell.js:105-116`).
- **Impact sur l'évidence.** La recherche indexe les 901 textes réels des audits : aucun point n'est masqué définitivement, la preuve reste joignable directement et le résultat est dérivé du texte source.
- **Risque.** Le `input` est reconstruit à chaque frappe (comme `chronology.js:200-204`) ; la valeur est réappliquée et le focus restauré, mais le caret revient en fin de champ — comportement identique à la Chronologie, documenté.
- **Effort.** M.
- **Vérification.** À chaque point, un seul `#c3a-search` ; saisir un fragment de `point.text` réduit `.c3a-thread-item` ; le compteur de C3-03 suit ; focus rendu au champ après frappe.

## C3-02 (P1) — Filtres compréhensibles par type et certitude (Récit)

- **Problème + preuve.** `recit.js:294-298` affiche une légende explicative des 4 types (`KIND`, `recit.js:13-18`) et des 4 degrés (`CONFIDENCE`, `recit.js:6-11`), mais ces libellés ne filtrent rien. Le kicker `recit.js:208` montre `kind` brut. Un lecteur qui veut ne voir que les « figures » ou les points « contestés » doit lire tout le fil.
- **Solution concrète.** Dans la même barre que C3-01, deux groupes de boutons `aria-pressed` : type (`tous`, puis les 4 clés de `KIND`) et certitude (`toutes`, puis les 4 clés de `CONFIDENCE`). Libellés et gloses repris des tables existantes, aucune traduction nouvelle. Chaque bouton porte `data-fk=c3a-kind-<clé>` / `c3a-conf-<clé>` et `aria-controls=c3a-thread`. État dans `c3aLocal.kind` / `c3aLocal.conf`.
- **Impact sur l'évidence.** Les filtres s'appuient sur les métadonnées d'audit déjà présentes (type de provenance, degré de certitude) : filtrer, c'est rendre visible la structure épistémique au lieu de la décrire.
- **Risque.** Combinaison recherche + 2 filtres = AND ; documenté dans le statut (C3-03) pour éviter l'illusion d'un « ou ».
- **Effort.** M.
- **Vérification.** Cliquer « figure » → tous les `.c3a-thread-item` visibles portent `data-kind=figure` ; « Contesté » + recherche → intersection ; `aria-pressed` exactement `true` sur les boutons actifs.

## C3-03 (P1) — Résultats comptés, état vide et réinitialisation (Récit)

- **Problème + preuve.** `recit.js:208` affiche « Étape X / N » (position dans la séquence) mais jamais « combien de points correspondent au filtre » ; si la recherche ne trouve rien, le `<ol>` du fil serait vide sans explication. La Chronologie a, elle, un statut `role=status` (`chronology.js:143-156`), un compteur (`chronology.js:222`) et un état vide avec bouton de reset (`chronology.js:231-249`).
- **Solution concrète.** Une ligne `.c3a-status#c3a-status` (`role=status`, `aria-live=polite`) : `« N point(s) affiché(s) sur M · recherche « … » · type : … · certitude : … »`, avec `N/M` calculés. Quand `N=0`, remplacer la liste par `.c3a-empty#c3a-empty` : « Aucun point de ce repère ne correspond à ces critères. » + bouton « Réinitialiser les filtres » (`data-fk=c3a-reset`) qui remet `c3aLocal` à zéro.
- **Impact sur l'évidence.** Le dénominateur `M` est `event.points.length`, donc le compteur prouve que l'exhaustivité du repère est conservée ; l'état vide dit explicitement que l'absence vient du filtre, pas d'un manque de données.
- **Risque.** Ne pas réutiliser `#atlas-recit-live` (déjà dédié à l'annonce du point, `recit.js:105-123`) : deux régions live distinctes, rôles distincts.
- **Effort.** S.
- **Vérification.** Recherche sans résultat → `#c3a-empty` visible, reset ramène `N=M`, statut annoncé une seule fois, aucun doublon d'id.

## C3-04 (P1) — Navigation clavier dans le fil (Récit)

- **Problème + preuve.** `recit.js:236-250` crée des boutons tous focalisables, mais `recit.js:164-167` `goPoint()` appelle systématiquement `focusTitle()` : le focus quitte la liste à chaque activation. Le routeur global (`keyboard.js:63-79`) intercepte les 4 flèches pour `stepPoint`, donc aucune navigation interne à la liste n'est possible. `aria-current=step` est posé (`recit.js:247`) mais ne sert pas de repère de focus.
- **Solution concrète.** Roving tabindex sur `.c3a-thread-item` (`tabindex=0` pour l'item courant, `-1` sinon) ; écouteur `keydown` sur `#c3a-thread` gérant `ArrowDown`, `ArrowUp`, `Home`, `End` avec `preventDefault()` + `stopPropagation()` (les flèches gauche/droite restent au routeur global, conformément au README:66). Entrée/Espace gardent l'activation native du bouton ; le garde-fou `recit.js:130-140` est étendu aux nouveaux boutons pour éviter l'ouverture concurrente du détail.
- **Impact sur l'évidence.** Le repère courant reste matérialisé par `aria-current=step` et le focus suit la sélection : on peut auditer point par point sans perdre sa place, condition d'une lecture critique continue.
- **Risque.** `stopPropagation` est limité à 4 touches et au seul `<ol>` ; les raccourcis de vue (1–5, r/c/g/s/m) et `?` ne sont pas touchés. À signaler au domaine `atlas-coque-navigation` pour fusion éventuelle.
- **Effort.** M.
- **Vérification.** Tab amène sur l'item courant ; `ArrowDown` déplace le focus (pas `pointIndex`) ; `Entrée` change de point ; `Home`/`End` vont au premier/dernier item affiché ; une seule touche = une seule action.

---

## C3-05 (P1) — Recherche locale des lieux et filtre de périmètre (Géographie)

- **Problème + preuve.** `geography.js` n'a aucun champ de recherche : les lieux ne sont accessibles que par les marqueurs SVG (`geography.js:203-232`) ou la courte liste « hors du cadre » (`geography.js:311-324`). Le panneau (`geography.js:297-309`) n'affiche que le lieu actif. Le bouton de périmètre (`geography.js:335-338`) bascule era/country sans filtre complémentaire.
- **Solution concrète.** Barre d'outils fixe dans le panneau, avant la liste : `input[type=search]#c3b-search` (`data-fk=c3b-search`, `aria-controls=c3b-places`) et filtre « tous / dans le cadre / hors du cadre » (`aria-pressed`). Etat local `c3bLocal.query` et `c3bLocal.frame`; recherche sur `label`, `hierarchy`, `historical`, `functions`, champs reels du jeu de donnees. `set({}, 'c3b-filter')` redessine carte et liste; le lieu selectionne reste affiche dans le panneau.
- **Impact sur l'évidence.** La recherche porte sur les champs reels des lieux documentes; aucun lieu n'est invente ni deplace, le filtre ne fait que reduire l'affichage.
- **Risque.** Le filtre « hors du cadre » doit preserveler la note d'honnetete de ATLAS-GEO-03 (aucun deplacement fictif).
- **Effort.** L.
- **Vérification.** Saisir un fragment de `place.label` reduit les marqueurs et la liste; le filtre cadre/hors cadre ne change aucune coordonnee; focus rendu au champ.

## C3-06 (P1) — Liste ordonnée unifiée des lieux et navigation clavier (Géographie)

- **Problème + preuve.** `geography.js:311-324` produit une liste `ul.geo-offlist` de boutons nus : pas de `aria-current`, pas de `data-fk`, pas de navigation interne, pas de compteur, et elle n'existe que pour les lieux hors du cadre. Les lieux dans le cadre ne sont joignables que par les marqueurs (`geography.js:208-211`, roving tabindex) ou les fleches globales (`keyboard.js:74-75`).
- **Solution concrète.** Remplacer cette liste par un `<ol id=c3b-places>` unique concordant avec les marqueurs : un `<li>` par lieu filtre avec `button[data-fk=c3b-place-<index>]`, `aria-current` sur l'actif, `tabindex` roving, mention textuelle « hors du cadre affiche » pour les lieux non projectables. Ecouteur `keydown` local pour ArrowUp/ArrowDown/Home/End avec stopPropagation; clic/focus selectionne via `set({ placeIndex })`.
- **Impact sur l'évidence.** Un seul index de selection (`state.placeIndex`) pilote marqueur, panneau et liste : la liste fait foi pour verifier quel lieu est retenu, sans doublon d'etat.
- **Risque.** Deux surfaces de selection (marqueur + liste) doivent rester synchronisees; elles partagent le meme `set`.
- **Effort.** L.
- **Vérification.** Tab atteint l'item actif; fleches haut/bas deplacent le focus; Entree selectionne; `aria-current` suit `placeIndex`; le compte `.geo-marker` reste correct.

## C3-07 (P1) — Résultats comptés, état vide et réinitialisation (Géographie)

- **Problème + preuve.** `geography.js:298` affiche « Lieu X / N » (rang de la selection) mais jamais « combien de lieux correspondent au filtre ». `geography.js:236-239` pose un `.geo-empty` sans `role=status`, et `geography.js:308` un message generique. Aucun bouton de reinitialisation quand une recherche ne donne rien.
- **Solution concrète.** Ligne `.c3b-status#c3b-status` (`role=status`, `aria-live=polite`) : « N lieu(x) affiche(s) sur M · ... », avec M = `currentPlaces().length`. Etat vide `.c3b-empty#c3b-empty` distinct selon le cas : aucun lieu dans le perimetre / aucun resultat pour le filtre. Bouton « Reinitialiser les filtres » (`data-fk=c3b-reset`) qui remet `c3bLocal` a zero.
- **Impact sur l'évidence.** Le denominateur M est le nombre reel de lieux du perimetre; l'etat vide distingue une donnee absente d'un filtre trop strict.
- **Risque.** Ne pas confondre avec le `geo-empty` de la carte (conservé, mais statue `<div role=status>`).
- **Effort.** M.
- **Vérification.** Recherche sans resultat → `#c3b-empty` visible + reset; N=M apres reset; statut unique.

## C3-08 (P2) — Sélection conservée et retour au point d'origine (Récit)

- **Problème + preuve.** `recit.js:164-167` `goPoint()` appelle `focusTitle()` apres chaque action : le focus quitte systematiquement le controle active. Les boutons (`recit.js:267-290`) n'ont aucun `data-fk`, donc la coque (`shell.js:105-138`) ne peut pas restaurer le focus apres reconstruction du DOM. Apres ouverture du detail (Entree) puis Escape, le focus tombe sur la scene.
- **Solution concrète.** Ajouter des `data-fk` stables (`c3a-prev`, `c3a-next`, `c3a-play`, `c3a-restart`, `c3a-next-event`, `c3a-point-<index>`, `c3a-title`). `goPoint(index, options)` n'appelle plus `focusTitle()` quand `options.keepFocus` est vrai (activation depuis le fil) : la coque restaure alors le focus sur l'item d'origine. Les actions sequentielles (precedent/suivant) gardent `focusTitle()` pour l'annonce du nouveau point.
- **Impact sur l'évidence.** Le retour au point d'origine est verifiable : l'item du fil redevient actif apres aller-retour dans le detail, sans perdre la position de lecture.
- **Risque.** La restauration depend de la coque (fichier interdit) ; aucun changement de son cote, simples attributs `data-fk` ajoutes.
- **Effort.** M.
- **Vérification.** Focus sur un item du fil, Entree, puis detail/Escape → `document.activeElement` est l'item d'origine; `pointIndex` inchange.

## C3-09 (P2) — Retour à l'origine de périmètre et focus restauré (Géographie)

- **Problème + preuve.** `geography.js:335-338` : la bascule de perimetre ecrit `placeIndex: 0` et ecrase le lieu selectionne; revenir au perimetre precedent ne restaure pas le lieu d'origine. Les boutons de zoom (`geography.js:251-255`), de perimetre et de retour (`geography.js:339-342`) n'ont pas de `data-fk`.
- **Solution concrète.** Memoire locale `c3bOrigin = { era: 0, country: 0 }` : avant bascule, enregistrer `placeIndex` pour le perimetre courant; apres bascule, restaurer celui du nouveau perimetre via `set({ scope, placeIndex }, 'scope')`. Ajouter `data-fk` (`c3b-scope`, `c3b-back`, `c3b-zoom-in`, `c3b-zoom-out`, `c3b-zoom-reset`).
- **Impact sur l'évidence.** Le retour a l'origine est une donnee de navigation, pas uneCOORDONNEE inventee : aucun point geographique n'est modifie, seul l'index de selection est restaure.
- **Risque.** Memoire de vue (coherent avec ATLAS-GEO-05 : transformation locale au module), perdue au rechargement — documente.
- **Effort.** M.
- **Vérification.** Selectionner le lieu 3 en ere, basculer pays, revenir → lieu 3 actif; focus restaure sur le bouton de perimetre.

## C3-10 (P3) — Contrat C3 commun de cohérence avec la Chronologie

- **Problème + preuve.** La Chronologie (`chronology.js:190-223`, `231-249`, `91-97`) expose un triptyque Recherche / Filtres / Compteur, un statut `role=status`, un etat vide avec reset et une restauration de focus par identifiant. Le Récit et la Geographie n'en avaient aucun, et le focus y etait deplace brutalement (`recit.js:164-167`).
- **Solution concrète.** Contrat C3 applique aux deux vues : (1) recherche `input[type=search]` avec `aria-controls` vers la liste; (2) filtres `aria-pressed`; (3) statut `role=status aria-live=polite` avec compte N/M; (4) etat vide explicite + reset; (5) `data-fk` sur chaque controlo pour restauration par la coque; (6) CSS isole dans `#nav-c3a` / `#nav-c3b`, aucun `styles.css`.
- **Impact sur l'évidence.** Un meme vocabulaire de navigation rend controlable la maniere dont on accede a la preuve dans les trois vues de consultation.
- **Risque.** Le theme visuel reste propre a chaque vue (pas de partage de classes avec `atlas-chrono-*`); seule la semantique est alignee. Coordination inter-domaines a signaler.
- **Effort.** M.
- **Vérification.** Les deux vues exposent recherche + statut + compteur + etat vide + `data-fk`; `npm run check` vert; ancres uniques prefixees.

---

## Etat d'implementation

10/10 chantiers implémentes dans les deux fichiers possedes. Aucune donnee historique ajoutee, aucun appel reseau, aucun fichier tiers modifie. CSS injecte par `<style id=nav-c3a>` (recit) et `<style id=nav-c3b>` (geographie). Ancres uniques prefixees `c3a-` / `c3b-`. La cadence d'auto-lecture (5 s, `keyboard.js:99-111`) et le piege global Entree/Espace restent de la responsabilite de `atlas-coque-navigation` : non modifies ici.

## Vérifications

| Commande / contrôle | Résultat |
| --- | --- |
| `node --check src/views/recit.js` | OK |
| `node --check src/views/geography.js` | OK |
| `npm run check` — `verify` | 21/21 PASS |
| `npm run check` — `test:e2e` | 15/15 PASS |
| Harnais fonctionnel (Puppeteer, `domcontentloaded`) | Récit : recherche unique, fil permanent au point 1, statut compté, état vide + reset, flèche bas = déplacement du focus sans changement de `pointIndex`, `Entrée` = changement de point avec focus conservé sur l'item, `#nav-c3a` unique : PASS |
| Harnais fonctionnel — Géographie | Recherche unique, liste ordonnée, statut compté, filtre « hors du cadre », état vide + reset, navigation `ArrowDown` / `End` / `Home` sur 12 lieux, bascule et retour de périmètre, `#nav-c3b` unique : PASS |
| Retour depuis le détail (C3-08) | `Entrée` sur `#recit-point-title` ouvre le détail, `Échap` le ferme, focus restauré sur `data-fk=c3a-title` : PASS |
| Aucune erreur console | PASS |

**Blocages / limites inter-domaines :** la cadence d'auto-lecture (`keyboard.js:99-111`) et le piège global `Entrée`/`Espace` (`keyboard.js:61`, `93`) appartiennent à `atlas-coque-navigation` : non modifiés ici. Le harnais a dû utiliser `waitUntil:'domcontentloaded'` (le `networkidle0` de `tests/e2e.mjs:20` expire par intermittence dans cet environnement WebGL) . Un faux négatif initial sur la flèche de la liste géographie venait d'un repère à un seul lieu : retesté en périmètre « pays » (12 lieux), navigation conforme. La suite officielle a été verte (15/15) juste après l'implémentation ; les exécutions ultérieures ont de nouveau expiré sur `page.goto(..., waitUntil:'networkidle0')` (`tests/e2e.mjs:20`) alors qu'aucune requête ne reste pendante (17 requêtes locales, 0 pending) : blocage environnemental WebGL préexistant, confirmé par les deux audits précédents `atlas-recit.md` et `atlas-geographie.md`, et par des éditions concurrentes sur `globe.js` / `chronology.js` postérieures au vert. Fichier de test non possédé par ce sous-agent.
