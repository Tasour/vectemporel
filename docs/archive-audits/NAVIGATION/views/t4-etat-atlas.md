# T4 — État de navigation de l'Atlas (`t4-etat-atlas`)

**Surface MESO · fichier possédé exclusivement :** `~/Projects/vectemporel-atlas/src/domain/store.js`.
Aucun autre fichier de code n'est modifié. Sources lues : `src/domain/store.js`, `src/app.js`,
`src/platform/keyboard.js`, `src/ui/shell.js`, `src/views/{globe,chronology,recit,geography,constellation}.js`,
`tests/e2e.mjs`, `scripts/verify.mjs`, `README.md`, `UNIFIED_AUDIT/NAVIGATION/README.md`.

**État de départ vérifié :** `npm run check` vert — `verify` (30 contrôles) + 15 E2E.

**Convention de lecture :** les références `store.js:N` ci-dessous désignent la version
*initiale* du fichier (avant implémentation) : elles sont la preuve du diagnostic. Le fichier
livré est réécrit et expose les API décrites dans les solutions.

**Thèse :** l'atlas possède déjà un store unique, mais ce store est un *bac à sable* plutôt
qu'une machine à états : `set()` accepte n'importe quelle clé, les invariants (indices,
modales, lecture) sont répartis entre les vues, et aucune notion d'origine, d'historique
ou d'annonce n'existe. Les 10 chantiers transforment le bac à sable en autorité : une seule
porte d'écriture, des invariants garantis à l'écriture, et une API de retour / hiérarchie /
lien profond consommable par les surfaces voisines.

| Ordre | Chantier | Priorité | Effort |
| --- | --- | --- | --- |
| 1 | T4-01 Entonnoir d'écriture unique et compteur de révision | P1 | S |
| 2 | T4-02 Indices entiers bornés sur toute transition | P1 | S |
| 3 | T4-03 Exclusivité des modales garantie par le store | P1 | S |
| 4 | T4-04 Retour à la vue d'origine (`previousView`, `goBack`) | P2 | M |
| 5 | T4-05 Historique de retour borné et sans doublons | P2 | S |
| 6 | T4-06 Sélection conservée entre vues et entre niveaux | P2 | M |
| 7 | T4-07 Annonces d'état versionnées (`notice`, `noticeRevision`) | P3 | M |
| 8 | T4-08 Navigation macro → micro explicite | P3 | M |
| 9 | T4-09 Deep links : hash canonique, hydratation, réflexion | P3 | M |
| 10 | T4-10 Cohérence des transitions et diagnostics vérifiables | P4 | S |

---

<a id="t4-01"></a>
## T4-01 — Un seul propriétaire de l'état : entonnoir d'écriture validé

- **Problème (preuve) :** `src/domain/store.js:47-54` — `set(patch)` fait un `Object.assign(state, patch)` sans filtrer les clés : un appelant peut écrire `view`, `revision`, `countryId` invalide ou une clé inconnue. `src/app.js:13` renvoie `{ ...state }`, une copie *superficielle* d'un objet exporté mutable (`store.js:9`) : le store est propriétaire de fait, pas de droit. `src/views/chronology.js:203,218,244,323` appellent `set({}, 'chrono-filter')` uniquement pour forcer un rendu, sans transition explicite.
- **Solution concrète :** définir `WRITABLE_KEYS` (11 clés autorisées) et une fonction `coerce(key, value)` ; `set()` n'applique que les clés reconnues et converties, compte les rejets dans `state.rejectedWrites`, incrémente `state.revision` à chaque mutation et expose `getSnapshot()` retournant un objet gelé. Les champs internes (`revision`, `notice`, `noticeRevision`, `rejectedWrites`) deviennent non écrivables via `set()`. `emit(state, reason)` conserve sa signature : aucun abonné n'est cassé.
- **Impact sur l'évidence :** l'E2E (15/15) ne touche pas aux clés ; le `verify` reste vert. Le journal `revision` rend chaque transition datable et testable, y compris les rendus forcés `chrono-filter`.
- **Risque :** une clé légitime oubliée dans `WRITABLE_KEYS` serait silencieusement ignorée — mitigé par la liste exhaustive issue de `store.js:9-21` et par `getDiagnostics().noUnknownStateKeys`. `state` reste exporté pour `app.js` : l'usage direct en écriture reste impossible à interdire sans éditer `app.js` (blocage documenté).
- **Effort :** S.
- **Vérification :** `node --check src/domain/store.js` ; `npm run check` ; en console, `VATLAS.getState().revision` augmente d'exactement 1 par action et `set({ rogue: 1 })` est ignoré.

<a id="t4-02"></a>
## T4-02 — Indices entiers bornés sur toute transition

- **Problème (preuve) :** `src/domain/store.js:32-36` — `clamp()` accepte les flottants (`clamp(1.7, 9) === 1.7`) ; `store.js:39-45` — `normalizeIndices(keys)` n'est appelée que si le patch contient l'un des quatre indices (`store.js:50`). Un changement de `scope` (`store.js:136-138`, `src/views/geography.js:337`) ne reborne donc jamais `placeIndex` : l'index peut désigner un lieu hors du nouveau périmètre. `store.js:120` borne, `store.js:114` boucle modulo : deux sémantiques non documentées.
- **Solution concrète :** remplacer `clamp` par `boundedIndex(value, max)` = `Math.trunc` + borne `[0, max]` + repli `0` sur `NaN` ; appeler `normalizeIndices()` inconditionnellement à la fin de `set()`, après commit, sur `eraIndex`, `eventIndex`, `pointIndex`, `placeIndex`, avec `currentEvent()` et `currentPlaces()` recomputés. Les quatre modes sont désormais un contrat explicite et gelé : `INDEX_MODES = { event: 'clamp', era: 'clamp', point: 'wrap', place: 'clamp' }`, exposé avec `getBounds()` (même forme `{ mode, index, total }` que le hook du routeur). `stepPoint` garde son modulo, déclaré et vérifiable ; `stepPlace`, `stepEvent`, `stepEra` sont clampés.
- **Impact sur l'évidence :** aucun tests E2E ne pilote d'index hors bornes ; le comportement nominal (`ArrowRight` → `eventIndex === 1`) est inchangé. `getDiagnostics().indicesBounded` devient vérifiable en une ligne.
- **Risque :** un index négatif ou un grand flottant fourni par un deep link est maintenant tronqué vers `0`/borne au lieu d'être laissé tel quel — c'est l'objet du chantier. Le bornage inconditionnel après `scope` modifie l'index courant quand le nouveau périmètre est plus court ; T4-06 tente d'abord une conservation par identifiant, puis replie sur `0`.
- **Effort :** S.
- **Vérification :** `set({ eventIndex: 999, pointIndex: -3.7 })` puis `VATLAS.getState()` donne des entiers dans les bornes ; `getBounds()` renvoie les quatre modes attendus ; `npm run check` (15 E2E verts).

**Arbitrage des bornes (T4-02 × T2 — coordination de l'agent maître).** Signal : le store
utiliserait un `wrap` là où la navigation annoncerait des bornes `clamp`. Arbitrage :
**documentation explicite du wrap**, sans changer le comportement. Preuve : après finalisation
de `keyboard.js`, son propre hook `window.VECTEMPOREL_KEYS.navigationBounds()` (`keyboard.js:238-243`)
déclare `event: clamp`, `era: clamp`, `place: clamp` **et `point: wrap`** — le store est donc
déjà aligné sur le contrat du routeur. Deux raisons de conserver le wrap des points :
`keyboard.js:246-261` fait avancer l'auto-lecture par `stepPoint(1)` jusqu'à une intervention
humaine (un clamp arrêterait le récit au dernier point), et la vue Récit propose déjà un
bouton « Repère suivant » pour changer d'unité narrative. Le `wrap` reste **borné** :
`stepPoint` passe par `boundedIndex((index + delta + 2*total) % total, total - 1)`, donc
l'index produit est toujours un entier dans `[0, total-1]`. Le désaccord éventuel devient
falsifiable : `getDiagnostics().boundsModesCoherent` compare les modes du store à ceux du
routeur. Aucune modification de `keyboard.js` n'a été nécessaire ni effectuée.

<a id="t4-03"></a>
## T4-03 — Exclusivité des modales garantie par le store

- **Problème (preuve) :** `store.js:140-152` — `toggleHelp`, `toggleDetail`, `closeModal` referment l'autre modale *à la main* ; mais `set()` n'impose rien : `src/views/constellation.js:337` appelle `set({ pointIndex, detailOpen: true }, 'point')` et pourrait rouvrir le détail pendant que l'aide est ouverte. `src/ui/shell.js:124-137,350-352` suppose un état `help | detail | null` unique et rend les deux overlays simultanément si l'invariant casse.
- **Solution concrète :** `resolveModals(changes)` dans `set()` : si `helpOpen && detailOpen`, la modale explicitement demandée par le patch gagne (ou la dernière clé du patch si les deux sont demandées ; l'aide gagne en cas d'état corrompu sans demande). Ajouter `closeAllModals()` exportée ; `goView` continue de fermer les deux (`store.js:105-108`).
- **Impact sur l'évidence :** E2E « Entrée ouvre le détail » puis « Échap ferme le détail » inchangés ; `window.VATLAS_A11Y.modal()` (`shell.js:368`) reste cohérent avec l'état.
- **Risque :** la règle « dernier gagne » est conventionnelle, pas imposée par le design ; elle est documentée dans le code et couverte par `getDiagnostics().modalsExclusive`. Aucune modale d'aide ne doit être ouverte par un deep link en même temps que le détail : l'hydratation (T4-09) applique le même invariant.
- **Effort :** S.
- **Vérification :** `set({ helpOpen: true, detailOpen: true })` puis `getDiagnostics().modalsExclusive === true` ; parcours E2E détail/Échap vert.

<a id="t4-04"></a>
## T4-04 — Retour à la vue d'origine : `previousView` et `goBack()`

- **Problème (preuve) :** `store.js:105-108` — `goView(view)` remplace la vue courante sans mémoriser la précédente ; `src/platform/keyboard.js:39-43` — Échap fait toujours `goView('globe')`, même depuis `recit` ou `geography`. `README.md:70` documente « Échap : fermer le détail ou revenir au monde » : le retour à l'origine est donc perdu dès qu'on traverse plusieurs vues (monde → chronologie → récit → Échap saute directement au monde).
- **Solution concrète :** ajouter `state.previousView` ; `transition()` (utilisée par `goView` et `selectCountry`) pousse la vue quittante dans `previousView` ; `goBack()` dépile l'historique (T4-05) et revient à la vue d'origine avec un motif `back` distinct. `goView` reste idempotente sur les changements de vue et ne modifie jamais la sélection (T4-06).
- **Impact sur l'évidence :** l'E2E ne teste pas Échap hors modale : aucun test cassé. Le retour gagne une évidence nouvelle (`getHistory()`, `previousView`, motif `back`), immédiatement vérifiable via `window.VATLAS.getState()`.
- **Risque :** **blocage partiel** — `keyboard.js:42` reste en lecture seule pour cette surface : Échap continue d'appeler `goView('globe')`. Le store fournit l'API complète (`goBack`) ; le câblage de Échap et du bouton « retour » appartient à `t2-routeur-atlas` / `t3-retour-poc`. Tant que ce câblage n'est pas fait, le bénéfice utilisateur reste latent (documenté dans le rapport).
- **Effort :** M.
- **Vérification :** `goView('chronology'); goView('recit'); goBack()` → `view === 'chronology'`, `previousView === 'globe'` ; `npm run check`.

<a id="t4-05"></a>
## T4-05 — Historique de retour borné, sans doublons

- **Problème (preuve) :** `store.js:9-21` ne contient aucun historique ; `keyboard.js:42` et `shell.js:241-245` (fil d'Ariane) reconstruisent un « retour » ad hoc vers le globe ou la chronologie, sans profondeur ni limite. Une navigation répétée entre vues n'est pas annulable et l'état peut croître sans borne si un historique était naïvement ajouté.
- **Solution concrète :** pile module `history` (max 12 entrées), `pushHistory(view)` qui ignore la vue déjà au sommet, `getHistory()` (copie), `clearHistory()` (réinitialisation sur deep link) et `goBack()` qui dépile, évite le no-op `target === state.view` et recalcule `previousView`. `transition(record: true)` est le seul endroit qui pousse.
- **Impact sur l'évidence :** aucune dégradation des 15 E2E ; la profondeur d'historique devient une grandeur observable (`getHistory().length`), ce qui rend le retour falsifiable sans modifier les tests.
- **Risque :** une profondeur de 12 est un choix d'interface, pas une donnée : elle est documentée comme telle. Le fil d'Ariane de `shell.js:218-253` n'est pas câblé sur cette pile (fichier interdit) : la cohérence vis entre fil et historique reste à faire par `m3-coque-atlas`.
- **Effort :** S.
- **Vérification :** 15 allers-retours successifs → `getHistory().length <= 12` ; `goBack()` depuis `recit` après `globe → chronology → recit` → `chronology`.

<a id="t4-06"></a>
## T4-06 — Sélection conservée entre vues et entre niveaux

- **Problème (preuve) :** `store.js:73-85` (`selectEra`) et `store.js:87-94` (`selectEvent`) remettent systématiquement `pointIndex` et `placeIndex` à `0` ; `store.js:136-138` (`toggleScope`) fait de même pour `placeIndex`. `src/views/geography.js:337` contourne `toggleScope` et écrit `set({ scope, placeIndex: 0 })`. Résultat : changer de période, de repère ou de périmètre détruit la sélection fine (point, lieu) alors que le point ou le lieu existe peut-être encore dans la nouvelle collection. `goView` (`store.js:105-108`) préserve bien la sélection, mais ce comportement n'est ni garanti ni testé.
- **Solution concrète :** `selectionSnapshot()` expose une copie gelée `{countryId, eraId, eventId, pointId, placeId, scope}`. `preservedPointIndex(nextEvent)` et `preservedPlaceIn(nextPlaces)` retrouvent l'objet par son `id` dans la nouvelle collection (repli `0`). `set()` applique automatiquement cette conservation quand un patch change `scope` sans fournir `placeIndex` — ce qui couvre aussi l'appel direct de `geography.js:337`. `goView` n'écrit que `view`, `detailOpen`, `helpOpen`, `playing` : la sélection est structurellement intacte. `selectCountry` reste la seule réinitialisation légitime (pays différent).
- **Impact sur l'évidence :** E2E « flèche change de repère » (`eventIndex === 1`) inchangé ; la conservation devient mesurable par `selectionSnapshot()` avant/après un changement d'ère.
- **Risque :** les identifiants de points/lieux ne sont pas garantis uniques entre repères dans le jeu généré ; la recherche par `id` peut ne rien trouver, d'où le repli explicite sur `0` (aucune donnée inventée). La conservation par identité peut faire « sauter » l'index numérique — c'est voulu et annoncé via `notice`.
- **Effort :** M.
- **Vérification :** noter `selectionSnapshot()`, appeler `toggleScope()`, vérifier que le lieu sélectionné reste le même s'il existe dans le nouveau périmètre ; changer de vue (`goView`) puis comparer l'instantané : identique.

<a id="t4-07"></a>
## T4-07 — Annonces d'état versionnées (`notice`, `noticeRevision`)

- **Problème (preuve) :** `src/ui/shell.js:83-103` construit l'annonce depuis `state.view`, `currentCountry()`, `currentEvent()` et `pointIndex`, puis `updateLive()` déduplique *par texte only* (`if (text === lastLive) return`). Deux actions distinctes qui produisent la même phrase (bout de course, filtre `chrono-filter`, changement de périmètre sans changement de lieu) ne sont donc jamais annoncées. `shell.js` ignore le `reason` émis par `store.js:28-30,53`.
- **Solution concrète :** ajouter `state.notice` (phrase française dérivée uniquement des libellés du `DATASET` et d'étiquettes d'interface) et `state.noticeRevision` incrémenté à chaque `set()`. `buildNotice(reason)` couvre `country`, `era`, `event`, `point`, `place`, `scope`, `view`, `back`, `help`, `detail`, `play`, `autoplay`, `chrono-filter`, `deep-link`. `getNotice()` expose `{ text, revision }` gelé pour un abonné.
- **Impact sur l'évidence :** les 15 E2E ne lisent pas la région live : aucun risque de casse. `noticeRevision` fournit l'évidence manquante (une annonce par transition, même à texte identique).
- **Risque :** **blocage partiel** — `shell.js:98-103` ne consomme pas encore `noticeRevision` et continue de dédupliquer par texte ; le câblage de la région live (et le passage de `announcement()` à `getNotice()`) appartient à `m3-coque-atlas`. Le store garantit la disponibilité et la version, pas la diffusion sonore. Aucune phrase n'est inventée : seuls des libellés présents dans `dataset.js` et des termes d'interface sont assemblés.
- **Effort :** M.
- **Vérification :** deux `set({}, 'chrono-filter')` successifs → `getNotice().revision` augmente de 2 ; les textes ne contiennent aucune donnée absente du `DATASET`.

<a id="t4-08"></a>
## T4-08 — Navigation macro → micro explicite

- **Problème (preuve) :** la hiérarchie existe dans les vues mais pas dans l'état : `src/ui/shell.js:223-247` construit le fil « Monde › Pays › Ère › Repère » en dur, `src/views/recit.js:285-289` propose un bouton « Repère suivant », `src/views/geography.js:339-342` et `src/views/constellation.js:358-361` des boutons « ← Chronologie ». Aucune fonction du store ne dit quel niveau est courant ni comment descendre ou remonter d'un cran ; `selectCountry` (`store.js:56-71`) saute directement monde → chronologie sans qu'une transition soit déclarée.
- **Solution concrète :** `VIEW_LEVEL` gelé (`globe:0`, `chronology:1`, `constellation:1`, `geography:2`, `recit:2`), `viewLevel()`, `selectionTrail()` (tableau gelé `monde → pays → ère → repère → point` dérivé du `DATASET`), `goDeeper()` et `goShallower()` qui passent par `goView`/`closeModal` et refusent les transitions hors hiérarchie. Les libellés du fil viennent du pays/ère/repère courants, jamais de texte historique inventé.
- **Impact sur l'évidence :** la structure devient auditable sans lire le DOM (`selectionTrail()`), utile aux surfaces `m4-taxonomie-atlas` et `c2-orientation-atlas`. Les 15 E2E restent verts : les boutons existants continuent d'appeler `goView`.
- **Risque :** le niveau de `constellation` est un choix de taxonomie (vue optionnelle) : rangé au niveau 1 comme `chronology`, il peut être contesté par `m4`. `selectionTrail()` n'est pas encore consommé par `shell.js` (fichier interdit) : Risque de divergence visuelle si le fil de `shell.js:223-247` évolue séparément.
- **Effort :** M.
- **Vérification :** `viewLevel('globe') === 0`, `viewLevel('recit') === 2` ; depuis `chronology`, `goDeeper()` → `recit` ; `goShallower()` → `chronology` ; `selectionTrail()` contient le nom du pays sélectionné.

<a id="t4-09"></a>
## T4-09 — Deep links : hash canonique, hydratation, réflexion sans boucle

- **Problème (preuve) :** `src/app.js:7-16` — aucun routage d'URL : ni lecture de `location.hash` au chargement, ni écriture, ni abonnement à `hashchange`. `src/platform/keyboard.js:10-11` et `src/domain/store.js:105-108` définissent les vues en deux tables séparées. Un lien partagé ne peut donc pas restaurer « pays + ère + repère + point + modale » : l'évidence d'un parcours n'est pas adressable.
- **Solution concrète :** dans `store.js` uniquement : `formatDeepLink(snapshot)` (clés courtes `v,c,e,r,p,l,s,d,h`), `parseDeepLink(hash)` (validation stricte : vues connues, `countryId` existant dans le `DATASET`, entiers >= 0, `scope` énuméré, modales `1`), `hydrateFromHash()` (applique via `set(..., 'deep-link')` sans écrire d'historique) et `initDeepLinks()` (abonnement `hashchange`, hydratation initiale, réflexion par `history.replaceState` avec garde `suppressReflect` et comparaison `lastReflectedHash` pour éviter la boucle et le spam d'historique). `clearHistory()` est appelé à l'hydratation pour que le retour reparte de l'état importé.
- **Impact sur l'évidence :** l'E2E charge `index.html` sans hash : `parseDeepLink` renvoie `null`, aucun changement d'état. Le hash réfléchi rend chaque état vérifiable par URL. Aucun appel réseau : `replaceState` modifie l'URL locale uniquement.
- **Risque :** `history.replaceState` peut lever une `SecurityError` en contexte `file://` : l'appel est enveloppé dans un `try/catch` et la réflexion est silencieusement ignorée (l'hydratation, elle, reste active). Un hash invalide est rejeté en entier (pas de restauration partielle) — choix plus sûr mais à documenter. Le câblage d'un bouton « copier le lien » hors store reste aux surfaces `c1`/`t1`.
- **Effort :** M.
- **Vérification :** charger `index.html#v=recit&c=france&r=0&p=0` → `view === 'recit'` et `countryId === 'france'` ; naviguer → le hash suit sans créer d'entrée d'historique ; `#v=inconnu` est ignoré ; `npm run check` vert.

<a id="t4-10"></a>
## T4-10 — Cohérence des transitions et diagnostics vérifiables

- **Problème (preuve) :** les invariants sont aujourd'hui éparpillés : `keyboard.js:57-59` gèle le clavier si une modale est ouverte, `keyboard.js:103-109` vérifie `playing && view === 'recit' && !helpOpen && !detailOpen`, `store.js:105-108` ferme la lecture à chaque changement de vue, `geography.js:337` et `constellation.js:337` écrivent directement dans le store. Aucun endroit ne peut répondre « l'état est-il cohérent ? » sans rejouer tous ces fichiers.
- **Solution concrète :** centraliser dans `set()` la règle `playing ⇒ (view === 'recit' && aucune modale)` et l'arrêt de lecture à l'ouverture d'une modale ; exposer `getDiagnostics()` avec `indicesBounded`, `modalsExclusive`, `playingCoherent`, `previousViewCoherent`, `historyBounded`, `selectionCoherent`, `deepLinkReady`, `noUnknownStateKeys` et `allCoherent`. Le `reason` de chaque `set()` reste transmis à `emit()` pour `keyboard.js:113-115`.
- **Impact sur l'évidence :** `allCoherent === true` devient un contrôle unique réutilisable par `npm run check` ou par une nouvelle E2E, sans toucher à `tests/e2e.mjs` (fichier interdit). Les 15 E2E actuelles ne testent pas `playing` : elles restent vertes.
- **Risque :** la règle `playing ⇒ récit` interdit de lancer la lecture depuis une autre vue (elle était déjà effective dans `keyboard.js:87`) : cohérence, pas régression fonctionnelle. `getDiagnostics()` décrit l'état, il ne le répare pas : un appelant externe qui écrit directement dans `state` pourrait le rendre faux, d'où T4-01.
- **Effort :** S.
- **Vérification :** `getDiagnostics().allCoherent === true` au repos et après chaque action du parcours E2E ; `boundsModesCoherent === true` (store ↔ routeur) ; `togglePlay()` hors récit laisse `playing === false` ; `npm run check`.

---

## Blocages hors surface (fichiers non modifiés)

| Chantier | Blocage | Propriétaire suggéré |
| --- | --- | --- |
| T4-04 | `keyboard.js:42` — Échap appelle encore `goView('globe')` au lieu de `goBack()` | `t2-routeur-atlas` |
| T4-05 | `shell.js:218-253` — le fil d'Ariane ne consomme pas `getHistory()` | `m3-coque-atlas` |
| T4-07 | `shell.js:83-103` — la région live déduplique par texte, ignore `getNotice()` | `m3-coque-atlas` |
| T4-08 | `shell.js:223-247` — le fil est reconstruit en dur, ignore `selectionTrail()` | `m3-coque-atlas` |
| T4-09 | `app.js:7-16` — aucun bouton/copie de lien ; `initDeepLinks()` est auto-amorcée dans le store, donc l'hydratation fonctionne déjà sans édition | `t1-routeur-poc` / `c1-deeplink-poc` |
| T4-01 | `app.js:13` — `getState()` renvoie une copie superficielle d'un `state` exporté ; l'API `getSnapshot()` est fournie mais non consommée | `t2-routeur-atlas` |
| T4-02 / T4-08 | Vue `points` (6ᵉ vue ajoutée pendant la refonte par une surface concurrente) : le store l'admet désormais (`VIEWS`, `VIEW_LEVEL`, filtres `pointFilterDomain`/`pointFilterFamily`, bornage de `pointIndex` sur `country.points`, motifs `filter`). Le câblage « 6 = points » a été finalisé côté `app.js` (`VIEW_TAXONOMY`), `keyboard.js` (`FALLBACK_VIEWS`, `AXIS_BY_VIEW`) et `shell.js` par leurs propriétaires respectifs | résolu — aucune action restante côté état |
| T4-01 | `src/views/points.js:50,70,82,87-89` écrit directement `state.pointFilterDomain` / `state.pointFilterFamily`, court-circuitant l'unique porte `set()` (les valeurs sont néanmoins acceptées par `set()` quand la vue les transmet) | propriétaire de la vue `points` |

**État du contrôle à la livraison :** `node --check` vert ; `npm run check` vert — 30
contrôles `verify` et **16 E2E**, dont « 6 = points ». Le store accepte `view === 'points'`
et ses filtres ; les fichiers `points.js`, `POINT_METHODOLOGY.md`, `POINT_REGISTRY.md`,
`COVERAGE_POINTS.md`, `proposals/`, `scripts/merge-points.mjs`, `scripts/verify-points.mjs`
et l'assertion E2E « 6 = points » n'ont **pas** été créés par cette surface : ils
proviennent d'un agent concurrent.

Aucune donnée historique n'est inventée : tous les libellés utilisés par les annonces proviennent de `src/data/dataset.js` ou sont des termes d'interface génériques. Zéro réseau, zéro commande Git, ancres `<a id="t4-01">` … `<a id="t4-10">` uniques.
