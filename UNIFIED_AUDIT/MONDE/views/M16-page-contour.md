# M16 — Page suivante affichée dans le contour

> Hub : `UNIFIED_AUDIT/MONDE/` · Domaine B (drapeau & révélation) · 10 chantiers, 10 implémentés.
> Fichier possédé : `src/views/monde/M16.js`. Vérification : `node --check src/views/monde/M16.js`.

## Périmètre observé

La transition est produite par `src/views/globe-reveal.js`. Lors de `reveal(country, done)`,
le contrôleur appelle `done()` immédiatement (l.220) — donc `selectCountry()` bascule l'état —
puis remplit la « page » décorative `#globe-reveal .gr-page` (l.184-191) :

- l.186 : `<strong>Chronologie</strong>` (chaîne figée) ;
- l.187 : `<span>${country.name} · ${country.eras.length} ères · ${country.events.length} repères</span>`.

L'overlay est `aria-hidden="true"`, fixé au `body` (l.147, l.154-156) : il survit au re-render
de la coque. La vue d'arrivée est toujours la chronologie (`store.js:277`), dont le titre réel
est `Chronologie · ${country.name}` (`chronology.js:226`), avec `eventIndex = 0`
(`store.js:276`), le premier repère et ses points visibles (`chronology.js:429, 461`).

## Les 10 chantiers

### M16-01 — Titre de la page aligné sur le h1 d'arrivée
- **Preuve** : `globe-reveal.js:186` affiche « Chronologie » seul ; `chronology.js:226` affiche `Chronologie · ${country.name}` ; `store.js:277` confirme la destination.
- **Solution** : le `<strong>` de `.gr-page` est réécrit en `Chronologie · ${country.name}`.
- **Impact** : la transition annonce exactement le titre qui apparaîtra.
- **Risque** : faible — texte d'une surface décorative, aucun doublage d'annonce.
- **Effort** : faible.
- **Vérification** : `node --check src/views/monde/M16.js`.

### M16-02 — Dénombrement français au singulier
- **Preuve** : `globe-reveal.js:187` produit « 1 ères », « 1 repères » dès qu'un compte vaut 1.
- **Solution** : helper `plural(n, singulier, pluriel)` appliqué aux ères, repères et points.
- **Impact** : exactitude grammaticale du contenu affiché, sans chiffre modifié.
- **Risque** : nul (aucune donnée inventée).
- **Effort** : faible.
- **Vérification** : `node --check`.

### M16-03 — Noms et libellés issus du DATASET
- **Preuve** : `globe-reveal.js:182,187` lit `country.name` ; la coque transmet `ctx.countries` (`globe.js:434`).
- **Solution** : résolution du pays par `code`/`id` dans `ctx.countries`, avec repli sur l'objet reçu ; garde d'existence.
- **Impact** : cohérence des noms avec la liste du globe et le h1 de la chronologie.
- **Risque** : nul si la garde d'existence est conservée.
- **Effort** : faible.
- **Vérification** : `node --check`.

### M16-04 — Ères annoncées = ères de la vue d'arrivée
- **Preuve** : `chronology.js:232, 281, 420` utilisent `country.eras.length` ; la page native utilise la même source (`globe-reveal.js:187`).
- **Solution** : le décompte est relu depuis `country.eras` avec garde `Array.isArray`.
- **Impact** : aucun écart entre le nombre annoncé et les bandes `atlas-chrono-eras`.
- **Risque** : faible.
- **Effort** : faible.
- **Vérification** : `node --check`.

### M16-05 — Aperçu du premier repère (titre + année réels)
- **Preuve** : `selectCountry` remet `eventIndex: 0` (`store.js:276`) ; `chronology.js:235, 429` affiche `country.events[0]` et son année via `formatYear`.
- **Solution** : ligne « Premier repère : <titre> (<année>) » construite depuis `country.events[0]`, avec le même format d'année.
- **Impact** : la transition prévisualise un contenu vérifiable au lieu de se limiter à des totaux.
- **Risque** : faible — si aucun repère, la ligne est omise.
- **Effort** : moyen.
- **Vérification** : `node --check`.

### M16-06 — Points du premier repère
- **Preuve** : `chronology.js:461` affiche `Points du repère (${event.points.length})` ; les 10 pays ont 3 à 6 points sur leur premier repère (données `src/data/dataset.js`).
- **Solution** : ligne « Points du repère : N point(s) » dérivée de `first.points.length`.
- **Impact** : cohérence avec la fiche d'arrivée et avec les 845 points validés du dataset.
- **Risque** : nul (compte réel, aucun seuil inventé).
- **Effort** : faible.
- **Vérification** : `node --check`.

### M16-07 — Nom du pays non répété dans le détail
- **Preuve** : `globe-reveal.js:186-187` affiche le nom deux fois (titre et ligne de détail).
- **Solution** : la ligne de détail ne retient que les dénombrements ; le titre porte le nom.
- **Impact** : page plus lisible dans le contour (figure `min(62%, 520px)`, `aspect-ratio: 2/1`).
- **Risque** : nul — aucune information retirée.
- **Effort** : faible.
- **Vérification** : `node --check`.

### M16-08 — Mouvement réduit préservé
- **Preuve** : `globe-reveal.js:221` retourne avant `show()` quand `prefers-reduced-motion` ; `globe-reveal.js:85` désactive les transitions.
- **Solution** : `augment()` refuse toute écriture si `ctx.reducedMotion()` est vrai ; aucun appel à `animate()`.
- **Impact** : la lentille n'introduit ni animation ni contenu fantôme en mode réduit.
- **Risque** : nul.
- **Effort** : faible.
- **Vérification** : `node --check`.

### M16-09 — Surface décorative non indexée, non annoncée
- **Preuve** : `globe-reveal.js:147` pose `aria-hidden="true"` sur l'overlay ; `chronology.js` porte seul le contenu sémantique et les annonces via `#nav-c2a-live`.
- **Solution** : intervention limitée à `is-revealing`, `aria-hidden` maintenu sur `.gr-page`, aucun `role`, aucune région live, aucun appel à `ctx.say()`.
- **Impact** : pas de double annonce ni de texte dupliqué dans l'atlas.
- **Risque** : faible.
- **Effort** : faible.
- **Vérification** : `node --check`.

### M16-10 — Injection sûre et reproductible
- **Preuve** : la coque reconstruit le stage (`globe.js:442`) tandis que l'overlay persiste sur `body` ; le registre fournit `css`/`el` et neutralise les greffons fautifs (`registry.js:50-56`).
- **Solution** : CSS unique via `ctx.css('monde-m16', …)` ; ID existant `#globe-reveal` avec garde ; un seul `MutationObserver` module pour tous les rendus ; greffe une seule fois par contrôleur ; repli déterministe sans observer ; zéro réseau, zéro `Math.random`, zéro `console.*`, aucun sélecteur de test touché.
- **Impact** : aucun effet de bord sur les 49 autres lentilles ni sur les E2E.
- **Risque** : faible (anti-boucle par marqueur `.m16-page-title`).
- **Effort** : moyen.
- **Vérification** : `node --check src/views/monde/M16.js`.

## Bilan

- 10 / 10 chantiers implémentés dans `src/views/monde/M16.js`.
- Aucune autre fichier modifié ; aucune donnée historique inventée ; français partout.
- Vérification demandée : `node --check src/views/monde/M16.js`.
