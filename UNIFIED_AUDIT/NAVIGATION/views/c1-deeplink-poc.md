# C1 — URLs, deep links, partage et restauration de contexte (POC)

> Surface MICRO `c1-deeplink-poc`. Périmètre possédé : la **zone hash/URL de
> `app.js`** (`scheduleHash`, `syncHashNow`, `shareView`, `applyHash`,
> `onHashChange`, `parseHash`, câblage `hashchange`, parsing au boot).
> Aucun autre fichier de code modifié. `plan.js` (`?pays=`) et `index.html`
> sont hors zone : leur part est documentée en blocage.

## État relevé (preuves)

- `app.js:250-253` `scheduleHash()` : debounce 220 ms, aucun mode (toujours
  « remplacer »).
- `app.js:255-272` `syncHashNow()` : `history.replaceState` uniquement
  (`app.js:267`) ; format `#/<pays>/<début>-<fin>[/<repère>][?tags=…]` ;
  silence si `!country` ; aucun garde-fou de réentrance.
- `app.js:2745-2766` `shareView()` : `navigator.clipboard.writeText` puis
  `toast()` générique ; repli `document.execCommand('copy')` déprécié ; aucun
  état visible sur le bouton `#share-btn`, aucune annonce dédiée.
- `app.js:2768-2789` `applyHash()` / `2791-2793` `onHashChange()` /
  `2795-2831` `parseHash()` : parsing du hash seulement, pas de `?pays=` ni
  de `?tags=` dans `location.search`, pas de slug d'ère, aucune garde pendant
  l'application (les `draw()`/`syncHashNow()` réécrivent l'URL).
- `app.js:3213` : seul `hashchange` est écouté ; pas de `popstate`.
- `app.js:3458-3495` `boot()` : chemin de restauration **différent** de
  `applyHash()` (appel direct à `setCountry` + `openEvent`, `3471-3486`).
- `app.js:382, 425, 985, 2103, 2133, 3183` : six appelants de
  `scheduleHash`/`syncHashNow` sans coordination.
- `plan.js:328-347` : `?pays=XX` est lu et appliqué **après** le boot, sans
  écriture de hash ; `README.md:118-119` documente
  `#/france/1789-1799/fr-revolution` ; `index.html:149` bouton de partage.

---

## C1-01 — Retour navigateur : créer des points d'historique (pushState)

**Problème.** `syncHashNow()` n'appelle que `replaceState` (`app.js:267`) :
l'entrée d'historique ne change jamais. Le bouton « précédent » du navigateur
quitte l'application au lieu de revenir à la vue, au repère ou au filtre
précédent ; « suivant » n'a rien à restaurer.

**Solution.** Distinguer le *contexte* (pays / repère ouvert / filtres), qui
crée un point d'historique via `history.pushState`, de la *fenêtre temporelle*
(zoom, pan, mini-carte, redimensionnement), qui continue d'utiliser
`replaceState`. Une clé de contexte `countryId|eventId|tags triés` pilote le
choix : changement de clé → `push`, sinon `replace`. Écouter `hashchange`
**et** `popstate` avec une déduplication par microtâche.

**Impact sur l'évidence.** Le bouton du navigateur devient un vrai « retour en
arrière » de l'exploration : on peut partir d'un repère, revenir au filtre,
puis au pays, sans quitter la page. Démontrable en 3 clics.

**Risque.** Inondation de l'historique si la clé inclut la vue (exclue
volontairement) ; double traitement `popstate`+`hashchange` (neutralisé par la
déduplication) ; `pushState` refusé en `file://` (encadré par `try/catch`).

**Effort.** M.

**Vérification.** Ouvrir un repère, changer un tag, zoomer : un seul `push`
par changement de contexte, zéro pour le zoom ; « précédent » restaure
l'état antérieur ; « suivant » le rejoue ; `npm run test:e2e` reste 14/14.

## C1-02 — Compatibilité `?pays=` (actuellement géré hors zone)

**Problème.** `plan.js:329-337` lit `?pays=FR` et appelle `setCountry`
**après** le boot, tandis que `app.js:3471-3474` ne lit que le hash et
retombe sur `france`. Un lien `?pays=JP` affiche donc d'abord la France puis
saute au Japon, et l'URL ne porte aucun hash cohérent avec le pays affiché.

**Solution.** Dans `parseHash()`, ajouter un repli : si le hash ne fournit pas
de pays valide, lire `pays` dans `location.search`, valider le code à deux
lettres, le résoudre via `ATLAS_BY_CODE` (`app.js:17`) vers un `appId`
présent dans `COUNTRY_BY_ID`. L'état est ainsi posé **une seule fois** au
boot ; `plan.js` ne fait plus que confirmer le même pays et ouvrir le globe.

**Impact sur l'évidence.** Un lien `?pays=JP` arrive directement sur la frise
japonaise, sans flash de la France, avec un hash canonique aligné.

**Risque.** Restriction de périmètre : l'**écriture** de `?pays=` et l'ouverture
du globe restent dans `plan.js` (fichier interdit) — documenté en blocage.
Double action bénigne si les deux modules s'accordent sur le même `appId`.

**Effort.** S.

**Vérification.** Charger `index.html?pays=JP` : un seul `setCountry('japon')`
au boot, hash `#/japon/…`, aucune erreur console.

## C1-03 — URL lisible : accepter un slug d'ère, garder le format canonique

**Problème.** `README.md:119` montre `#/france/1789-1799/fr-revolution` et
présente le second segment comme une « ère », mais `parseHash()`
(`app.js:2812-2821`) n'accepte qu'une plage numérique `^(-?\d+)-(-?\d+)$` :
`#/france/revolution-empire` est rejeté (retombée sur la France). Rien n'est
écrit pour rendre l'URL auto-descriptive au-delà des identifiants.

**Solution.** Conserver la plage numérique comme forme canonique écrite
(rétro-compatibilité avec l'exemple du README et avec les autres surfaces),
et **accepter en lecture** un slug d'ère : normaliser le segment
(`normalizeText`, `app.js:181`), le comparer au slug du `name` de chaque
`country.eras`, et adopter ses bornes `[start, end]` comme vue. Le repère
(`fr-revolution`) et le pays restent dans le chemin.

**Impact sur l'évidence.** On peut partager/copier une URL qui « se lit »
(`#/france/revolution-empire/fr-revolution`) et qui restaure la même vue que
la forme numérique — l'URL devient un titre, pas un code opaque.

**Risque.** Colision de slugs entre ères d'un même pays (important le
premier match) ; aucun `id`/`slug` dans `data.js:79-109`, le slug est donc
dérivé du libellé et sensible à sa reformulation (dégradation gracieuse :
vue nulle → vue d'ensemble).

**Effort.** S.

**Vérification.** `#/france/revolution-empire/fr-revolution` et
`#/france/1789-1815/fr-revolution` mènent au même état ; aucune erreur.

## C1-04 — `?tags=` : une seule source, validation stricte

**Problème.** Les filtres ne sont écrits que dans la query du hash
(`app.js:261-264`, `?tags=a,b`) et lus uniquement là (`app.js:2825-2829`).
Un `?tags=` dans la vraie `location.search` est ignoré (`app.js:3471-3473`),
et les tags inconnus ou dupliqués ne sont pas normalisés avant écriture.

**Solution.** Lire les tags depuis **les deux** sources (query du hash et
`location.search`), les décoder avec un `safeDecode` sans exception, les
filtrer contre `TAGS`, les dédupliquer dans un `Set`. La forme écrite reste
canonique et unique (query du hash, triée, `encodeURIComponent`) ; un tag
invalide disparaît sans casser la restauration.

**Impact sur l'évidence.** Le filtre fait partie intégrante du lien partagé :
le destinataire voit exactement la même sélection de repères, quel que soit
le point d'entrée (`?tags=` ou `#…?tags=`).

**Risque.** Deux sources contradictoires : l'union est choisie (documentée)
plutôt qu'une priorité arbitraire ; virgules encodées gérées par décodage
unitaire ; aucune écriture dans `location.search` (qui rechargerait la page).

**Effort.** S.

**Vérification.** `#/france/-600-2026?tags=guerres` et
`index.html?tags=guerres#/france/-600-2026` donnent le même `activeTags` ;
un tag inconnu est ignoré silencieusement.

## C1-05 — Bouton « Copier le lien » : annonce et état visible

**Problème.** `shareView()` (`app.js:2745-2766`) affiche un `toast()` générique
(`app.js:243-248`), ne modifie pas l'état du bouton `#share-btn`
(`index.html:149`) et repose sur `document.execCommand('copy')` déprécié en
repli. Le résultat n'est ni confirmé visuellement sur le bouton, ni annoncé
par une région dédiée ; si le presse-papiers est indisponible, le lien reste
inaccessible.

**Solution.** Avant copie, forcer l'écriture synchrone du hash puis lire
`location.href`. Ajouter une région live `role="status" aria-live="polite"`
`#nav-c1-status` qui énonce « Lien copié — <pays>, <période>. » ; basculer le
bouton en état « copié » (coche visuelle, ~2,4 s) ; si
`navigator.clipboard.writeText` est absent ou échoue, révéler le lien dans un
champ texte en lecture seule, focalisé et sélectionné, avec message explicite.

**Impact sur l'évidence.** Le partage donne une confirmation immédiate,
visible et vocalisée ; en environnement contraint (http, `file://`), le lien
reste toujours récupérable — l'évidence du partage ne dépend plus du
navigateur.

**Risque.** Le `await clipboard.writeText` doit rester dans un `try/catch`
(souvent refusé hors contexte sécurisé) ; l'injection CSS via
`<style id="nav-c1">` doit être idempotente pour ne pas écraser les autres
surfaces.

**Effort.** M.

**Vérification.** Cliquer « partager » : le bouton change d'état, la région
live est mise à jour, le presse-papiers contient l'URL complète ; forcer
l'échec du clipboard : le champ de repli apparaît et est sélectionné.

## C1-06 — Restauration au boot : un seul chemin, atomique

**Problème.** `boot()` (`app.js:3471-3486`) réimplémente la restauration en
appelant directement `setCountry()` puis `openEvent()`, alors que
`applyHash()` (`app.js:2768-2789`) fait la même chose autrement (gestion du
`view` issu de l'événement, `resetView`, fermeture du lecteur). Deux chemins
divergents produisent des états différents selon qu'on charge ou qu'on
modifie l'URL, avec un risque de flash « vue d'ensemble → vue du repère ».

**Solution.** Faire de `boot()` un simple appel à
`applyHash(parseHash() || état par défaut france/vue d'ensemble)`, après
avoir posé le garde de réentrance. `applyHash` applique pays, vue, filtres et
lecteur en une seule passe, puis n'écrit qu'une forme canonique.

**Impact sur l'évidence.** Ouvrir un lien froid ( nouvel onglet ) et modifier
le hash à la main mènent exactement au même écran : la restauration devient
prévisible, ce qui est la base d'un deep link partageable.

**Risque.** `applyHash` appelle `updateTagsUi()` qui suppose les puces de tags
construites par `setCountry()` — l'ordre est respecté ; l'animation de
`setView` est désactivée en restauration (appel non animé).

**Effort.** M.

**Vérification.** Comparer l'état après chargement direct et après
`hashchange` manuel sur la même URL : identiques ; pas de flash visible.

## C1-07 — Zéro écriture concurrente pendant l'application

**Problème.** Six sites écrivent ou planifient le hash (`app.js:382, 425, 985,
2103, 2133, 3183`) ; `applyHash` déclenche `setView()`→`draw()`→
`scheduleHash()` et `openEvent()`→`syncHashNow()` (`app.js:2103`), donc
restaurer une URL réécrit l'URL en cours de lecture. Le timer de 220 ms et les
appels synchrones peuvent se chevaucher.

**Solution.** Un garde unique `hashApplying` neutralise `scheduleHash()` et
`syncHashNow()` pendant `applyHash` ; le timer est annulé et le drapeau de
`push` en attente est remis à zéro à la fin ; une seule écriture canonique
(`replaceState`) clôt la restauration et resynchronise la clé de contexte.

**Impact sur l'évidence.** Le hash n'est plus « tremblant » : une seule
valeur stable par état, ce qui rend le lien copié fiable et le retour
navigateur reproductible.

**Risque.** Si le garde reste levé (exception), le hash ne s'écrit plus —
d'où un `finally` systématique ; `shareView()` annule le `push` en attente
pour ne pas créer d'entrée d'historique lors d'une simple copie.

**Effort.** S.

**Vérification.** Surveiller `history.replaceState`/`pushState` pendant un
`applyHash` : une seule écriture, aucune pendant le `try` ; E2E sans erreur
console.

## C1-08 — Précédent/suivant et repli sur état vide

**Problème.** Sans historique (C1-01), précédent/suivant sont muets. En outre,
un hash pointant une fenêtre sans repère visible est restauré tel quel :
`ensureEmptyState()` (`app.js:3377-3397`) affiche « Aucun repère… » sur un
lien partagé, sans que l'URL ne propose de sortie.

**Solution.** Les entrées d'historique créées en C1-01 restaurent contexte
complet (pays, filtres, repère, vue). Après application, si aucun événement
n'est visible dans la fenêtre et qu'aucun repère n'est ouvert, repli
automatique vers une vue valide (vue du repère si fourni, sinon vue
d'ensemble) puis réécriture canonique ; l'annonce live précise le repli.

**Impact sur l'évidence.** Aucun lien partagé n'ouvre sur un écran vide : le
destinataire tombe toujours sur une vue qui « montre quelque chose », et
« précédent » reste un geste de navigation utile.

**Risque.** Le repli ne doit pas écraser un filtre intentionnellement
sélectif ; condition limitée à « zéro repère visible » ; le calcul s'appuie
sur `isEventVisible()` (`app.js:200-202`) et `updateEmptyState()`.

**Effort.** M.

**Vérification.** Partager `#/france/900-950` (fenêtre vide) : ouverture sur
la vue d'ensemble avec annonce ; aller-retour précédent/suivant conserve les
filtres.

## C1-09 — Validation et normalisation robustes du hash

**Problème.** `parseHash()` (`app.js:2795-2831`) est permissif et sans limite :
`decodeURIComponent` peut produire des segments surprenants, les paramètres
inconnus sont ignorés sans canonicalisation, la longueur du hash n'est pas
bornée, et l'identité du repère est vérifiée mais pas sa cohérence avec la vue.

**Solution.** Décodage via `safeDecode` (jamais d'exception), borne de
longueur du hash, rejet des segments vides/inconnus, slug d'ère validé contre
`country.eras`, `eventId` accepté seulement s'il appartient au pays, tags
filtrés et triés. Toute forme entrante est **réécrite** en forme canonique
(par `replaceState`, sans `hashchange`) à la fin de `applyHash`.

**Impact sur l'évidence.** Coller une URL bricolée ou obsolète ne casse pas
l'application : elle est nettoyée en silence et le lien affiché devient la
référence unique, ce qui renforce la confiance dans le partage.

**Risque.** Une canonicalisation trop agressive pourrait masquer une faute de
saisine utile (slug d'ère) — d'où l'acceptation large en lecture et
l'écriture délibérément conservatrice (plage numérique).

**Effort.** S.

**Vérification.** Injecter un hash surlong, un tag inconnu, un repère
d'un autre pays : aucun `pageerror`, URL finalement canonique, état cohérent.

## C1-10 — Annonce de restauration et état vide du partage

**Problème.** Aucune annonce n'indique qu'un deep link a été restauré ; le
`toast` de partage (`app.js:243-248`) est le seul retour, et il disparaît.
Pour une personne utilisant un lecteur d'écran, « je suis arrivé quelque
part » et « mon lien a été copié » ne sont pas établis.

**Solution.** Réutiliser `#nav-c1-status` pour énoncer la restauration
(« Vue restaurée — <pays>, <période>, repère ouvert ») et le résultat du
partage. Le panneau de repli du presse-papiers porte un texte explicite et un
champ focalisé (C1-05). Le CSS de ces deux éléments est injecté par le bloc
`<style id="nav-c1">`, idempotent, sans ressource externe.

**Impact sur l'évidence.** L'accessibilité n'est plus un supplément : l'état
de navigation (arrivée, retour, copie) est énoncé et visible, donc auditable
sans regarder l'écran ni lire le code.

**Risque.** Éviter les annonces redondantes avec `friseAnnounce()`
(`app.js:3359-3363`) : messages distincts et ciblés ; le panneau reste `hidden`
par défaut et ne modifie pas la mise en page.

**Effort.** S.

**Vérification.** Charger un deep link avec lecteur d'écran actif : annonce
de restauration ; déclencher un échec de copie : annonce + champ visible ;
aucun `fetch`/`url(http…)` introduit, `node --check app.js` vert.

---

## Synthèse des dépendances

- **C1-01 ↔ C1-07** : l'historique n'est sûr que si une seule écriture est
  autorisée à la fois (garde `hashApplying`).
- **C1-02 ↔ C1-03 ↔ C1-04** : les trois sources d'entrée (hash, `?pays=`,
  `?tags=`) convergent vers un `parseHash()` unique puis une forme canonique.
- **C1-05 ↔ C1-10** : mêmes région live et panneau de repli, injectés une
  seule fois.
- **C1-08** consomme l'historique de C1-01 et la validation de C1-09.

## Blocages de périmètre (documentés, non implémentés ici)

1. `plan.js:328-347` : l'écriture de `?pays=` et l'ouverture automatique du
   globe appartiennent à une autre surface. Seule la **lecture** de
   compatibilité est implémentée dans `app.js` (C1-02).
2. `index.html:149` : le libellé/icône du bouton de partage n'est pas modifié ;
   l'état « copié » est appliqué dynamiquement via CSS `#nav-c1` (C1-05).
3. `styles.css` intact : tout style nouveau passe par `<style id="nav-c1">`.

## Vérification exécutée

- `node --check app.js` : **OK**.
- `npm run test:e2e` : **14/14**, aucune erreur console (E2E_REPORT.md régénéré).
- Contrôles ciblés (navigateur headless, hors dépôt) : deep link
  `#/france/1789-1799/fr-revolution` ouvre le repère et annonce la
  restauration ; précédent/suivant naviguent entre repères ; `?pays=JP`
  restaure `japan` avec hash aligné ; `?tags=guerre` active le filtre et est
  réécrit dans le hash ; le partage annonce « Lien copié » et marque le bouton ;
  le slug `#/france/revolution-empire` donne `1789 — 1815` ; une fenêtre vide
  (`900-950`) replie sur la vue d'ensemble avec annonce dédiée.
