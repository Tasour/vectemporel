# M17 — Nom et légende du pays

Lentille M17 — domaine B : drapeau & révélation.
Fichier possédé : `src/views/monde/M17.js`. Lectures seules : `src/views/globe.js`,
`src/views/globe-reveal.js`, `src/data/dataset.js`, `src/views/monde/registry.js`,
`styles.css`. Aucun autre fichier modifié, aucune donnée inventée, zéro réseau,
zéro `Math.random`, aucun `console.*`.

## M17-01 — Nom du pays invisible aux lecteurs d’écran pendant le survol et la révélation

- **Titre** : la légende du drapeau vit dans un sous-arbre `aria-hidden`.
- **Preuve** : `globe-reveal.js:146-147` pose `aria-hidden="true"` sur `#globe-reveal` ; `:183` n’y écrit que `caption.textContent = country.name`. Le nom affiché pendant le survol et la révélation est donc purement visuel. Le `#globe-hover-readout` de `globe.js:335` est du texte visible, mais il n’est pas une région live (cf. `UNIFIED_AUDIT/views/atlas-globe.md`, ATLAS-GLOBE-07).
- **Solution** : M17 ajoute dans la scène un nœud `#m17-legend` (`role="group"`, `aria-label="Légende du drapeau"`) dont le texte est dans le DOM ordinaire, lisible en mode navigation. `onHover` / `onLeave` maintiennent son contenu à jour, y compris pour le survol clavier déjà notifié par `highlight()`.
- **Impact** : le nom du pays est accessible sans vision, sans dépendre de la couleur ni de l’animation.
- **Risque** : doubler une annonce live existante (M20). La légende n’est **pas** `aria-live` : aucun `say()` n’est émis, donc pas de bavardage.
- **Effort** : M
- **Vérification** : `node --check src/views/monde/M17.js` ; à relecture, `#m17-legend` porte `role="group"` et son `.m17-name` contient `country.name`.

## M17-02 — Nom propre altéré par une mise en majuscules CSS

- **Titre** : `text-transform:uppercase` défigure « États-Unis », « Égypte ».
- **Preuve** : `globe-reveal.js:82-83` : `.gr-caption{… text-transform:uppercase; letter-spacing:.06em}`. La casse du nom issu du dataset (`dataset.js` : `États-Unis`, `Égypte`, `Royaume-Uni`) n’est pas respectée.
- **Solution** : la feuille `monde-m17` surcharge `#globe-reveal .gr-caption{text-transform:none; letter-spacing:.02em}` (injectée après celle de `globe-reveal`). La légende M17 affiche `country.name` verbatim.
- **Impact** : le nom propre affiché est exactement celui des données.
- **Risque** : conflit de feuilles si une autre lentille surcharge la même règle ; la sélectivité `#globe-reveal .gr-caption` est stable et documentée.
- **Effort** : S
- **Vérification** : relecture CSS — la règle `text-transform:none` est présente et le `.m17-name` ne subit aucune transformation.

## M17-03 — Légende réduite au seul nom, sans contexte chiffré vérifiable

- **Titre** : le survol ne donne ni ères ni repères dans la légende du drapeau.
- **Preuve** : `globe-reveal.js:183` n’écrit que le nom ; `:187` n’ajoute ères et repères que dans la page de révélation, elle-même `aria-hidden`. `globe.js:117-122` calcule bien ces chiffres pour le readout, mais aucune légende durable ne les porte.
- **Solution** : `.m17-detail` affiche `${count(country.eras)} ères · ${count(country.events)} repères`, recalculé depuis le pays reçu (ex. France : 9 ères · 57 repères, conformément à `dataset.js`).
- **Impact** : la légende est informative et falsifiable sans ouvrir la fiche pays.
- **Risque** : champs absents sur un pays incomplet ; `count()` renvoie 0 si la liste n’est pas un tableau, aucune donnée n’est inventée.
- **Effort** : S
- **Vérification** : relecture — les nombres de la légende recalculés depuis `dataset.js` (France 9/57, Japon 5/17).

## M17-04 — Légende non synchronisée avec la sélection courante

- **Titre** : au rendu, la légende ne reflète pas `state.countryId`.
- **Preuve** : `globe.js:313` dérive `selected` de `state.countryId` et le transmet dans le contexte (`:433-441`) ; aucun greffon n’initialise de légende avec ce pays. `globe.js:376-378` montre pourtant « Sélection courante » dans l’orientation.
- **Solution** : `setLegend(ctx.selected || null)` est appelé à chaque application ; `onLeave` revient à `ctx.selected` plutôt qu’à vide, pour rester cohérent après un retour de révélation.
- **Impact** : la légende est alignée sur l’état unique, pas sur le dernier survol fantôme.
- **Risque** : `ctx.selected` est un instantané du rendu ; les rappels périmés écrivent dans le nœud courant (M17-10) et le plus récent gagne — sans état divergent durable.
- **Effort** : S
- **Vérification** : relecture — à l’ouverture avec un pays choisi, `.m17-name` porte son nom.

## M17-05 — Hiérarchie visuelle : le nom noyé dans la ligne du bouton

- **Titre** : le nom du pays n’est pas l’élément dominant de la ligne.
- **Preuve** : `styles.css:185-190` — `.globe-country-num` 11 px, `.globe-country-flag` 15 px, `.globe-country-name` 14 px/600, `.globe-country-meta` 12 px, `.globe-country-cover` 11 px. Le drapeau et le numéro rivalisent avec le nom ; `globe.js:404-411` construit cet ordre.
- **Solution** : CSS ciblé `.globe-list .globe-country-name{font-size:16px;font-weight:700;letter-spacing:-.01em}` et `.globe-list .globe-country-num{opacity:.75}`. Aucun sélecteur de test n’est renommé ni retiré.
- **Impact** : lecture immédiate : numéro discret, drapeau repère, nom dominant, metadata subordonnée.
- **Risque** : empiètement sur M21/M22 (grille, ordre de lecture) ; la règle ne touche que la taille/opacité, pas la structure ni l’ordre du DOM.
- **Effort** : S
- **Vérification** : relecture CSS ; E2E à rejouer par l’agent maître (les boutons `.globe-country` restent inchangés).

## M17-06 — Légende sans identifiant stable

- **Titre** : le code ISO du pays n’apparaît pas dans la légende visible.
- **Preuve** : `dataset.js` fournit `code` (`FR`, `GB`, `US`…) ; `globe-reveal.js:183` ne montre que le nom et `globe.js:409` ne montre que `country.name`. Le drapeau est `aria-hidden` (`:408`), donc aucun repère textuel court ne subsiste.
- **Solution** : un `.m17-code` affiche `country.code` comme étiquette discrete à côté du nom ; masqué (`hidden`) quand le code manque. Donnée issue du pays, aucune invention.
- **Impact** : la légende reste identifiable même quand le drapeau n’est pas rendu (repli sans WebGL).
- **Risque** : doublon sémantique avec M33 (codes ISO et drapeaux) ; ici l’étiquette est purement visuelle dans la légende, sans toucher aux libellés des boutons.
- **Effort** : S
- **Vérification** : relecture — `.m17-code` vaut `FR` pour la France, et la règle `[hidden]{display:none}` empêche l’attribut d’être neutralisé par `display:inline-block`.

## M17-07 — Légende chevauchant les commandes du globe

- **Titre** : une légende en bas à gauche masquerait les boutons Zoom/Rotation.
- **Preuve** : `styles.css:150-153` place `.globe-controls` en `left:16px; bottom:16px` ; `:127` donne à `.globe-scene` `position:relative; overflow:hidden`. `#globe-reveal` est fixé au `body` avec `z-index:60` (`globe-reveal.js:69`).
- **Solution** : `#m17-legend` est ancré en `right:16px; bottom:16px`, `z-index:6` (sous l’overlay de révélation), `pointer-events:none` ; repli mobile `left:8px; right:8px; bottom:78px` pour dégager les commandes.
- **Impact** : aucune commande n’est obstruée, la révélation passe devant la légende.
- **Risque** : sur très petit écran, la légende peut couvrir une partie du HUD ; la largeur est plafonnée à `min(280px,42%)` en paysage.
- **Effort** : S
- **Vérification** : relecture CSS ; E2E 390×844 à rejouer par l’agent maître.

## M17-08 — Légende vide au leave, rien à lire en navigation

- **Titre** : un simple `remove()` de légende ne laisse aucune information.
- **Preuve** : `globe-reveal.js:213-217` `leave()` retire seulement `is-visible` de l’overlay ; sans nœud de légende persistant, le survol qui s’achève rend l’information indisponible.
- **Solution** : `setLegend(null)` réécrit un état `data-state="idle"` avec « Aucun pays survolé » et une consigne « Survolez le globe ou choisissez un pays dans la liste. » Le nœud reste dans le DOM et reste structuré.
- **Impact** : la légende est toujours présente et lisible, même sans survol.
- **Risque** : texte de consigne tapageur ; il est court, non live, et retiré dès qu’un pays est survolé.
- **Effort** : S
- **Vérification** : relecture — après `onLeave`, `data-state="idle"` et la consigne sont présents.

## M17-09 — Contraste et lisibilité de la légende sur le globe

- **Titre** : un texte posé à même la sphère serait illisible.
- **Preuve** : `.globe-host` a un fond dégradé sombre (`styles.css:128`) mais variable ; `#globe-reveal .gr-caption` s’appuie sur un `text-shadow` (`:83`) qui ne garantit pas un contraste stable.
- **Solution** : panneau opaque `rgba(8,11,16,.9)`, bordure `var(--line-strong)`, texte `var(--ink)` / `var(--muted)` / `var(--gold)`, ombre portée supprimée en `prefers-reduced-motion`.
- **Impact** : contraste stable et cohérent avec le thème, quelle que soit la texture sous-jacente.
- **Risque** : surcharge visuelle du HUD ; le panneau est compact et placé à l’opposé des commandes (M17-07).
- **Effort** : S
- **Vérification** : relecture des variables CSS employées ; E2E contraste à rejouer par l’agent maître.

## M17-10 — Rendus répétés : doublons de légende et rappels périmés

- **Titre** : le registre réapplique les greffons à chaque émission du store.
- **Preuve** : `registry.js:17-19` garde les tableaux de rappels globaux, `:45-56` appelle tous les greffons à chaque rendu ; `globe.js:427` puis `:442` montre que `runMondeEnhancements` tourne après chaque reconstruction du `stage`. Les rappels enregistrés ne sont jamais purgés.
- **Solution** : ID unique `#m17-legend` avec garde `document.getElementById` avant création ; CSS via `ctx.css('monde-m17', …)` injecté une seule fois par `cssOnce` ; les rappels réinterrogent `document.getElementById` à chaque appel au lieu de refermer un nœud détaché ; aucun écouteur événementiel ajouté, aucun état module persistant autre que les constantes.
- **Impact** : un seul panneau par rendu, aucune fuite de nœuds ni d’écouteurs, idempotence complète.
- **Risque** : un ancien rappel peut écrire un ancien `ctx.selected` ; il écrit dans le nœud courant et le rappel le plus récent s’exécute en dernier, donc l’état affiché converge.
- **Effort** : M
- **Vérification** : `node --check` PASS ; relecture — garde d’existence, `ctx.css`, absence de `addEventListener` et de `Math.random`/`console.*`/réseau.

---

## Statut d’implémentation

Les 10 chantiers sont implémentés dans `src/views/monde/M17.js` uniquement. CSS injecté via `ctx.css('monde-m17', …)`. Aucun fichier partagé, aucun sélecteur de test modifié, aucune donnée inventée.

## Blocages

Aucun. Deux points sont documentés plutôt que contournés : le titre générique « Chronologie » et le nom `aria-hidden` de `#globe-reveal` (`globe-reveal.js:146-147, 183, 186`) ne peuvent être corrigés à la source sans modifier un fichier non possédé ; M17 fournit une légende accessible équivalente dans la scène et surcharge la casse du `.gr-caption` par CSS.

## Vérification

`node --check src/views/monde/M17.js` : PASS. Les suites E2E et le contraste 390×844 sont rejoués par l’agent maître.
