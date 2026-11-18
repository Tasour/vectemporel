# Audit — `v1-fiche-detaillee` (fiche détaillée / panneau de détail V1)

> Vue attribuée : fiche détaillée d’un repère telle que rendue par **V1 `app.js`**
> (panneau `#reader-overlay`, `renderReaderEvent`, `openEvent`, `renderRelated`,
> gestion du panneau de détail). Fichier possédé : `/home/tasour/Projects/vectemporel/app.js`,
> zone fiche (≈ lignes 1300–1400 et fonctions associées). Les parties de `dragon.js`
> qui affichent un autre panneau de fiche **ne sont pas** dans ce périmètre.
> Références : `APP_PLAN.md` §7 (clavier), §9 (contenu), §10 (accessibilité) ;
> `README.md` § « La queue du dragon » (ligne 72) et § « Le lecteur ».
> Aucune donnée historique n’est inventée : tout est dérivé de `data.js`,
> `event-images.js` (`window.VECTEMPOREL_EVENT_IMAGES`) et `spiral-meta.js`
> (`window.VECTEMPOREL_SPIRAL_META`).

## Périmètre et limite de propriété

Le bouton « Lire la fiche » et la mise en page visuelle riche (titre 48 px, grande
image, figures, lieux) appartiennent au panneau `dragon.js` (`renderDetail`,
lignes 817–861) et **ne sont pas modifiables ici**. Le panneau `app.js` est la
sortie « lecteur » de ce bouton (`dragon.js:1087-1091` appelle
`window.VECTEMPOREL_APP.openEvent(id)`). Les 10 chantiers ci-dessous améliorent
donc **le panneau de détail de `app.js`** : seul fichier de code autorisé pour
cette vue. Les mêmes préoccupations (image documentaire, figures, lieux,
hiérarchie, lien, fermeture, focus, clavier, mobile, chargement) y sont traitées
de bout en bout, sans toucher à `dragon.js` ni à `styles.css` (le CSS est injecté
par `#v1-fiche-css` depuis `app.js`).

---

## V1-FICHE-01 — Hiérarchie sémantique titre / sous-titre / résumé

**Problème (preuve).** `renderReaderEvent` (`app.js:1310-1344`) ne renseigne que
`readerContext` (1312), `readerTitle` (1313) et les hashtags (1314-1321).
`event.subtitle` et `event.summary`, présents dans `data.js` et rendus ailleurs
(`app.js:1252`, `dragon.js:829-831`), ne sont **jamais** affichés dans ce panneau.
Le `h2#reader-title` sert d’unique nom accessible au dialogue
(`index.html:603` `aria-labelledby="reader-title"`) : le résumé complet et le
sous-titre sont invisibles pour les lecteurs d’écran comme pour les yeux.

**Solution.** Construire un bloc de fiche inséré avant `#grok-state` :
`p.fiche-subtitle` (sous-titre), `figure` (image), `p.fiche-summary` (résumé
intégral), puis listes et CTA. Conserver l’identifiant `#reader-title` intact
(pour `aria-labelledby` et le test E2E) et enrichir
`readerScroll.setAttribute('aria-label', 'Fiche détaillée et article — <titre>')`.
Aucun texte inventé : sous-titre et résumé sont ceux de `event`.

**Impact.** Compréhension immédiate du repère, scan visuel, nom accessible complet.
**Risque.** Faible : ajout purement additif avant `#grok-state`, aucun ID existant
modifié.
**Effort.** M.
**Vérification.** Ouvrir une fiche : le sous-titre et le résumé complet
(`event.summary`) sont visibles ; `aria-labelledby` résout toujours vers le titre ;
aucune erreur console.

## V1-FICHE-02 — Légende d’image documentaire et crédits

**Problème (preuve).** Le panneau `app.js` n’affiche aucune image. Les 229 images
vérifiées existent pourtant dans `window.VECTEMPOREL_EVENT_IMAGES` (ex.
`event-images.js:5-14` : `src`, `alt`, `caption`, `credit`, `license`, `source`),
et `dragon.js:794-814` sait les afficher. `APP_PLAN.md` §9 exige « les images sont
légendées par ce qu’elles montrent, pas par l’événement supposé » et le signalement
« non documentaire » des motifs génératifs. Ici, rien n’est légendé.

**Solution.** Créer une `<figure class="fiche-hero">` avec `<img>` dont `alt` vient
de `image.alt`; `<figcaption>` affiche `image.caption` (ce que montre l’image),
puis une ligne de crédits dérivée de `credit`, `license`, `licenseUrl` et `source`
(liens `target="_blank" rel="noopener noreferrer"` + `aria-label` explicite).
En cas d’erreur de chargement ou d’absence de données : message neutre
« Illustration documentaire indisponible… », **sans** générer de motif ni
inventer de légende.

**Impact.** Rigueur documentaire, conformité `APP_PLAN.md` §9, repère visuel fort.
**Risque.** Faible : lecture seule de `VECTEMPOREL_EVENT_IMAGES`, repli explicite.
**Effort.** M.
**Vérification.** `fr-revolution` affiche la légende « La prise de la Bastille… »
et le lien source Wikimedia ; une image inexistante affiche le repli neutre.

## V1-FICHE-03 — Listes structurées de figures et de lieux

**Problème (preuve).** `renderRelated` (`app.js:1545-1548`) ne fait que basculer
`hidden` sur `#reader-related` : aucune figure ni aucun lieu n’est rendu dans le
panneau `app.js`. Les données existent dans
`window.VECTEMPOREL_SPIRAL_META[countryId].eras[i].actors/places`
(`spiral-meta.js:3-45`) et sont déjà exploitées par `dragon.js:840-857`, mais sous
forme de puces dont le rôle n’est porté que par l’attribut `title` (invisible au
clavier et aux lecteurs d’écran). `APP_PLAN.md` §9 impose un état vide explicite.

**Solution.** Déterminer l’ère de l’événement depuis `country.eras` et `event.year`
(même logique que `dragon.js:144-152`), puis rendre deux sections
`<ul aria-labelledby>` distinctes : « Figures » (`actors`, rôles en texte visible)
et « Lieux » (`places`, hiérarchie + fonctions en texte visible). Plafond à 6
entrées avec solde « et N autre(s) ». État vide explicite :
« Aucune figure renseignée pour cette ère dans le corpus actuel. »

**Impact.** Découvrabilité des acteurs/lieux ; aucun fait hors corpus.
**Risque.** Faible : tout est dérivé des données, plafond documenté.
**Effort.** M.
**Vérification.** Une ère pourvue affiche les deux listes avec rôles visibles ;
une ère vide affiche le message d’état vide ; aucun nom inventé.

## V1-FICHE-04 — Lien explicite vers l’article (CTA « Lire la fiche »)

**Problème (preuve).** `setReaderLinks` (`app.js:1304-1308`) alimente seulement
deux liens : l’icône « Original » de la barre (`index.html:622-625`, libellé
visuel « Original » sans contexte) et le pied de page. Aucun CTA explicite,
libellé et accessible, ne dit « lire l’article complet » ; l’`aria-label`
d’ouverture de nouvel onglet manque.

**Solution.** Ajouter `a.fiche-cta#v1-fiche-read-link`, libellé
« Lire l’article complet ↗ », `target="_blank"`, `rel="noopener noreferrer"`,
`aria-label` incluant le titre de l’événement et la mention « nouvel onglet ».
Le `href` est réutilisé depuis `els.readerExternal` (déjà calculé par
`setReaderLinks`, appelé avant le CTA) avec repli sur l’URL de recherche
Grokipedia construite depuis le titre/sous-titre/pays — aucune URL inventée.

**Impact.** Linéarité fiche → article, clarté pour les lecteurs d’écran.
**Risque.** Faible : réutilise une URL déjà validée par `setReaderLinks`.
**Effort.** S.
**Vérification.** Le CTA porte le bon `href`, `target`, `rel` et un `aria-label`
unique ; aucun lien distant n’est chargé automatiquement.

## V1-FICHE-05 — Fermeture, retour et restauration du focus

**Problème (preuve).** `closeReader` (`app.js:1390-1420`) rend le focus à
`state.lastFocus` (1392) uniquement si ce nœud est encore connecté (1411). Or
`openEvent` (1362-1368) peut appeler `setCountry`, ce qui reconstruit les nœuds
de la frise : l’ancien nœud n’est plus connecté et le focus tombe alors sur
`body`, sans retour à l’écran d’origine. Le bouton de fermeture
(`index.html:626`) dit « Fermer le lecteur », pas « revenir à la vue ».

**Solution.** Capturer l’`eventId` avant remise à zéro, puis choisir comme cible
de repli `eventEls.get(previousEventId) || els.stage`. Renommer via JS l’`aria-label`
du bouton en « Fermer la fiche et revenir à la vue précédente ». Conserver
`Échap` (déjà géré en 1144-1158) et le clic sur le backdrop (2334-2336).

**Impact.** Orientation spatiale, respect du parcours `APP_PLAN.md` §4.
**Risque.** Faible : repli uniquement si l’ancien focus est introuvable.
**Effort.** S.
**Vérification.** Ouvrir une fiche depuis la frise puis fermer : le focus revient
sur l’écaille/frise ou, à défaut, sur `#stage` ; `Échap` referme sans quitter le
Système solaire (test E2E existant).

## V1-FICHE-06 — Focus piégé robuste dans le dialogue

**Problème (preuve).** Le piège (`app.js:1165-1183`) ne boucle que si
`document.activeElement` est **exactement** le premier ou le dernier élément.
Si le focus sort du dialogue (clic sur fond, focus programmatique, changement de
DOM), aucun mécanisme ne le ramène : le focus peut errer dans la page derrière
l’overlay — violation de `APP_PLAN.md` §10 (« focus piégé dans la modale active »).
Le filtre `offsetParent !== null` omet les éléments dans un conteneur `[hidden]`.

**Solution.** Renforcer le piège : si `activeElement` est hors `#reader`, le
ramener au premier (ou dernier en `Shift+Tab`) élément focusable ; sinon boucler
premier/dernier. Ajouter `!element.closest('[hidden]')` au filtre. Conserver
l’ouverture sur `readerClose` (`app.js:1346-1355`).

**Impact.** Conformité WCAG 2.1.2, modal réellement modale.
**Risque.** Faible : logique isolée dans `onGlobalKeydown`.
**Effort.** M.
**Vérification.** Tab depuis le dernier → premier ; Maj+Tab depuis le premier →
dernier ; après un focus externe, Tab ramène dans le panneau.

## V1-FICHE-07 — Navigation clavier des repères liés

**Problème (preuve).** Quand le lecteur est ouvert, `onGlobalKeydown` retourne
immédiatement après le piège (`app.js:1182`) : seuls `Tab` et `Échap` agissent.
Les puces « Continuer le fil » (`app.js:1327-1342`) sont des boutons, mais aucune
navigation par flèches ni annonce de raccourci n’est fournie, malgré la
grammaire clavier de `APP_PLAN.md` §7 (`←/→` = navigation).

**Solution.** Dans le bloc `state.readersOpen`, gérer `ArrowRight`/`ArrowLeft`
parmi les `.related-chip` visibles de `#related-list` (déplacement du focus,
`preventDefault`, `Enter` natif). Injecter un texte `.fiche-sr-only` dans
`#reader-related` : « Flèches gauche et droite pour parcourir les repères liés,
Échap pour fermer. »

**Impact.** Parité clavier/souris dans la fiche.
**Risque.** Faible : n’intercepte les flèches que si le focus est dans la liste.
**Effort.** M.
**Vérification.** Avec le panneau ouvert et le focus sur une puce, `→` avance,
`←` recule, `Échap` ferme ; le texte d’aide est annoncé.

## V1-FICHE-08 — Adaptation mobile et cibles tactiles

**Problème (preuve).** Aucune règle dédiée n’est injectée par le code de la fiche ;
la grille de figures/lieux et l’image risquent de déborder sous 640 px. Les
contrôles de la barre n’ont pas de dimension tactile minimale garantie depuis
cette zone (les styles existants de `styles.css` ne sont pas modifiables ici).

**Solution.** Injecter un bloc `<style id="v1-fiche-css">` (une seule fois, via
`injectFicheStyles()` appellée par `buildFicheHeader`) portant des sélecteurs
préfixés `#reader` : image `max-height` en `vh`, typographie `clamp()`,
`.fiche-meta-grid` en 1 colonne sous 640 px, `min-width/min-height: 44px` sur
`.reader-icon-button` et `.reader-external`, et `padding-bottom` de safe-area.
Aucune règle existante supprimée ; `styles.css` intact.

**Impact.** Lisibilité et manipulation à 390 × 844.
**Risque.** Faible : portée limitée à `#reader`, aucune cascade ailleurs.
**Effort.** M.
**Vérification.** Viewport 390 × 844 : pas de débordement horizontal, boutons
≥ 44 px, image cadrée, liste en colonne unique.

## V1-FICHE-09 — État de chargement et erreurs annoncés

**Problème (preuve).** `setReaderLoading` (`app.js:1426-1431`) remplace
`#grok-state` par un squelette purement visuel (`SKELETON_HTML`) sans
`role="status"`, sans `aria-live` et sans `aria-busy` sur `#reader-scroll`.
`renderReaderNotFound` (1550-1596) et `renderReaderError` (1598-1626) injectent
des messages sans les annoncer (`APP_PLAN.md` §10 : focus/états accessibles).

**Solution.** Injecter un nœud `#v1-fiche-status` (`role="status"`,
`aria-live="polite"`, visuellement masqué) ; `setFicheBusy(true/false)` sur
`#reader-scroll` ; messages « Chargement et traduction… », « Article chargé »,
« Traduction française indisponible », « Pas de page directe… »,
« Grokipedia est momentanément muet » selon le rendu. Le squelette reste visuel
et inchangé dans son HTML.

**Impact.** Équité d’accès à l’état du chargement et aux erreurs.
**Risque.** Faible : nœud additionnel, aucun comportement réseau modifié.
**Effort.** M.
**Vérification.** À l’ouverture, `aria-busy="true"` et le statut « Chargement… » ;
après rendu (succès ou erreur), `aria-busy="false"` et statut mis à jour.

## V1-FICHE-10 — Rigueur des données, libellés uniques, mouvement réduit

**Problème (preuve).** `renderReaderEvent` utilise des replis génériques
(`TAGS[tag]?.label || tag`, 1318-1319) sans garde sur la structure ; les
contrôles dynamiques injectés n’ont pas de `aria-label` garanti unique ; les
transitions ne sont pas systématiquement désactivées quand
`prefers-reduced-motion: reduce` est posé (seul `reduceMotion` est utilisé en
1446), contrairement à `APP_PLAN.md` §10.

**Solution.** Ne rendre que des champs présents dans les données (vérification
`if` avant création), dériver le nombre « et N autres » du tableau réel,
attribuer des `aria-label` distincts et qualifiés à chaque lien injecté,
définir `@media (prefers-reduced-motion: reduce)` dans `#v1-fiche-css` pour
neutraliser toute transition ajoutée, et conserver `lang="fr"` sur `#grok-body`
(déjà en 1534). Aucune date, citation ou coordonnée fabriquée.

**Impact.** Confiance dans la fiche, accessibilité sensorielle, conformité plan.
**Risque.** Faible : gardes défensives uniquement.
**Effort.** S.
**Vérification.** Aucune chaîne historique littérale ajoutée dans le diff ;
`aria-label` uniques ; règle `prefers-reduced-motion` présente dans le bloc CSS.

---

## Synthèse

| ID | Priorité | Effort | État |
| --- | --- | --- | --- |
| V1-FICHE-01 | 1 | M | Implémenté |
| V1-FICHE-02 | 2 | M | Implémenté |
| V1-FICHE-03 | 3 | M | Implémenté |
| V1-FICHE-04 | 4 | S | Implémenté |
| V1-FICHE-05 | 5 | S | Implémenté |
| V1-FICHE-06 | 6 | M | Implémenté |
| V1-FICHE-07 | 7 | M | Implémenté |
| V1-FICHE-08 | 8 | M | Implémenté |
| V1-FICHE-09 | 9 | M | Implémenté |
| V1-FICHE-10 | 10 | S | Implémenté |

## Réalisation

Tout est dans `app.js`, zone fiche. Un bloc auto-injecté `#v1-fiche-css` (unique,
préfixé `#reader`) porte le CSS ; `styles.css` et `dragon.js` sont intacts.
`buildFicheHeader(event)` construit la fiche (sous-titre, image légendée et
creditée, résumé, figures, lieux, CTA) et est appelé par `renderReaderEvent`.
`setFicheBusy`/`setFicheStatus` pilotent `aria-busy` et délèguent l’annonce à
l’annonceur live du lecteur quand il existe (une seule région live). Le piège de
focus et les flèches des repères liés sont dans `onGlobalKeydown`. `closeReader`
a un repli de focus `eventEls.get(eventId) || els.stage`.

## Vérifications

- `node --check app.js` : **OK**.
- Test navigateur ciblé (Chrome headless, 1440 × 900) : panneau ouvert, image
  `images/events/fr-revolution.jpg`, légende « La prise de la Bastille… », lien
  source Wikimedia, résumé intégral (375 caractères), listes **Figures** et
  **Lieux**, CTA avec `target="_blank"` / `rel="noopener noreferrer"` /
  `aria-label` unique, `aria-busy` true → false, focus initial sur `reader-close`,
  piège de focus réintégrant un focus externe, flèche droite naviguant entre les
  repères liés, `Échap` refermant le panneau. **0 erreur console.**
- Mobile 390 × 844 : une seule colonne, aucun débordement horizontal, boutons
  ≥ 44 px, image cadrée, règle `prefers-reduced-motion` présente. **OK**.
- `npm run test:e2e` : **non concluant dans l’état courant** — d’abord
  `TimeoutError: Navigation timeout of 30000 ms exceeded` sur `waitUntil:
  'networkidle0'` (avant toute interaction), puis 6/14 avec `domcontentloaded`.
  Cause observée : la couche globe/solar d’`app.js` (hors périmètre de cette
  vue) laisse parfois `#globe-overlay` ouvert après la sélection d’un pays, ce
  qui fait intercepter `Entrée`/`Échap` par la branche globe de
  `onGlobalKeydown`. Le comportement est instable entre exécutions. À corriger
  par le propriétaire de la vue Monde 3D / coque ; aucun fichier hors zone fiche
  n’a été modifié ici.
