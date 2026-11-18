# M12 — Drapeaux SVG locaux

Lentille **M12 — Drapeaux SVG locaux**, domaine B (drapeau & révélation).
Fichier possédé : `src/views/monde/M12.js`. Lectures seules : `public/flags/*.svg`,
`src/views/globe-reveal.js`, `src/data/dataset.js`, `src/views/globe.js`,
`src/views/monde/registry.js`, `styles.css`.
Contrat : `register('M12', (ctx) => { … })` ; CSS via `ctx.css('monde-m12', …)` ;
IDs uniques et gardes d'existence. Aucun autre fichier modifié, aucune donnée
inventée, zéro réseau, zéro `Math.random`, zéro `console.*`.

---

## M12-01 — Trois listes de codes sans contrôle d'égalité

- **Preuve** : `dataset.js` porte les codes `FR` (l.21), `GB` (l.9310), `US` (l.16090), `DE` (l.21925), `IT` (l.27640), `ES` (l.33140), `CN` (l.38926), `IN` (l.44491), `JP` (l.50057), `EG` (l.55045). `globe-reveal.js:11-22` duplique ces dix codes dans `PALETTE`. `public/flags/` contient dix SVG (`CN, DE, EG, ES, FR, GB, IN, IT, JP, US`). Rien ne vérifie l'égalité des trois ensembles : un fichier absent ou un code ajouté passe inaperçu.
- **Solution** : au `onReady`, dériver la liste attendue de la source unique `ctx.countries`, sonder chaque `./public/flags/<code>.svg` avec `new Image()` (chemin relatif local, aucun réseau) et publier `host.dataset.m12Flags` (`ok`/`loading`/`partial`/`fail`) avec `m12FlagsMissing`. Passe unique mémorisée par signature des codes.
- **Impact** : une dérive est détectée au chargement sans casser le rendu ni la révélation.
- **Risque** : dix sondages mis en cache ; neutraliser si `Image` est absent ; ne jamais bloquer `onReady` ni lever d'exception (les crochets du registre sont déjà isolés par `safe()`).
- **Effort** : M.
- **Vérification** : `node --check` ; avec les dix fichiers présents, `host.dataset.m12Flags` vaut `ok` après stabilisation et `m12FlagsOk = 10`.

## M12-02 — Aucun repli visuel si le SVG échoue à charger

- **Preuve** : `globe-reveal.js:182` pose `flagLayer.style.backgroundImage = url("./public/flags/<code>.svg")` sans gestion d'erreur ; un SVG manquant laisse `.gr-flag` transparent, donc un contour de pays révélé vide. `leave()` (l.213-217) ne réinitialise pas non plus ce fond.
- **Solution** : un `MutationObserver` sur l'attribut `style` de `#globe-reveal .gr-flag` (créé une seule fois) détecte le code de drapeau demandé ; si le sondage l'a marqué `missing`, M12 ajoute la classe `m12-flag-fallback` définie dans `monde-m12`, avec motif neutre et `background-color` pris dans `country.color` (donnée réelle de `dataset.js:20` etc.). La classe est retirée au changement de drapeau et à `onLeave`.
- **Impact** : le contour révélé reste lisible et identifiable même sans fichier SVG.
- **Risque** : ne pas écraser un `background-image` valide ; n'appliquer le repli qu'après échec confirmé ; ne jamais écrire dans le `style` de fond possédé par `globe-reveal.js`.
- **Effort** : M.
- **Vérification** : forcer un code manquant (fichier temporairement indisponible) ; `host.dataset.m12FlagFallback` porte le code et le calque porte `m12-flag-fallback` ; aucun `console.*`.

## M12-03 — Drapeau révélé sans équivalent accessible

- **Preuve** : `globe-reveal.js:143-147` crée `#globe-reveal` avec `aria-hidden="true"` ; le drapeau est un `background-image` CSS (l.182), donc aucun nœud texte ; `.gr-caption` (nom du pays) est dans cet overlay aria-hidden. Un lecteur d'écran n'a aucun accès au drapeau révélé.
- **Solution** : M12 crée hors de l'overlay, dans `document.body`, un nœud `#monde-m12-flag-status` avec `role="status"`, `aria-live="polite"` et `aria-atomic="true"`, mis à jour via `ctx.onHover`/`ctx.onLeave` avec le nom réel et le code ISO du pays (« Drapeau : France (FR) »). Le visuel reste aria-hidden.
- **Impact** : équivalent fonctionnel du drapeau pour les non-voyants, sans altérer la révélation.
- **Risque** : éviter le bavardage : une clé `code|ère` déduplique les mises à jour ; le live reste dédié au drapeau, laissant les annonces de sélection à M20.
- **Effort** : S.
- **Vérification** : contrôle DOM — après survol, `#monde-m12-flag-status` contient le nom du pays ; lecture AT manuelle ; vidage à la sortie.

## M12-04 — Drapeau national moderne appliqué à des ères antiques

- **Preuve** : `dataset.js:22-25` donne à la France un domaine démarrant à `-600` ; Inde (`-2600`) et Égypte (`-3100`) sont dans le même cas. Les SVG locaux sont des drapeaux nationaux modernes (ex. `FR.svg` = tricolore bleu/blanc/rouge, `IN.svg` = safran/blanc/vert avec roue). Aucune mention n'accompagne l'icône.
- **Solution** : quand `country.domain[0] < 0` (donnée réelle, aucune date d'adoption inventée), M12 ajoute la mention générique « drapeau national moderne (l'atlas couvre aussi des époques antérieures) » dans le statut accessible et un badge visuel `#monde-m12-era-badge` (aria-hidden, `pointer-events:none`) dans le host. Sinon, rien n'est affiché.
- **Impact** : l'utilisateur n'est pas induit en erreur sur l'époque que représente l'icône.
- **Risque** : formulation strictement générique, aucun fait historique nouveau ; le badge ne masque jamais le drapeau et ne capte pas le pointeur.
- **Effort** : S.
- **Vérification** : survol d'un pays à domaine négatif → `host.dataset.m12FlagEra = 'ancienne'` et badge visible ; pays récent → badge masqué.

## M12-05 — Emoji de drapeau non fiable selon la police du système

- **Preuve** : `globe.js:407` rend `country.flag` (séquence régionale, par ex. `🇫🇷`) dans `.globe-country-flag` avec `aria-hidden="true"` ; `styles.css:187` ne fixe que `font-size:15px`. Sur une plate-forme sans police d'emoji couleur, la séquence s'affiche en deux lettres et l'identification visuelle se dégrade.
- **Solution** : la feuille `monde-m12` donne à `.globe-country-flag` une pile de polices d'emoji de secours (Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif). En complément, M12 pose `data-m12-code` sur chaque span (nouvel attribut, aucune modification du bouton ni de son sélecteur de test) à partir du nom réel trouvé dans `ctx.countries`.
- **Impact** : identification du pays stable même quand le glyphe emoji ne s'affiche pas ; aucun téléchargement de police.
- **Risque** : cibler uniquement le span enfant, jamais `.globe-country` (sélecteur de test) ; le code restant textuel dans le DOM, aucun réseau.
- **Effort** : S.
- **Vérification** : `data-m12-code` présent sur les dix spans après rendu (ex. `FR`) ; aucune règle CSS ajoutée à `styles.css`.

## M12-06 — URL de drapeau interpolée sans validation du code

- **Preuve** : `globe-reveal.js:182` construit `url("./public/flags/${country.code}.svg")` directement depuis `country.code`, sans contrôle de forme. La palette `PALETTE` (l.11-22) filtre l'affichage, mais aucun garde-fou ne vérifie que les codes de `ctx.countries` sont bien deux lettres majuscules avant de produire une URL.
- **Solution** : le sondage M12 n'interpole un chemin que si `/^[A-Z]{2}$/` accepte le code ; sinon le code est classé `invalid`, exposé dans `host.dataset.m12FlagsInvalid`, et aucune image n'est instanciée. L'observateur de drapeau n'applique aucun repli à un code invalide.
- **Impact** : aucun chemin mal formé ne peut être produit depuis cette lentille ; la dérive devient auditable.
- **Risque** : ne pas refuser les dix codes réels (tous conformes) ; le garde-fou reste local et ne modifie pas `globe-reveal.js`.
- **Effort** : S.
- **Vérification** : avec les dix codes réels, `m12FlagsInvalid` est vide ; tout code injecté non conforme est listé sans qu'aucune URL ne soit construite.

## M12-07 — Premier survol en course avec le chargement du SVG

- **Preuve** : `globe-reveal.js:196-212` ne déclenche le chargement du SVG qu'au moment du survol, via l'affectation de `background-image` ; le masque, lui, est préchargé séparément depuis `globe-pick.png` (l.24, l.96). Le tout premier survol peut donc afficher un contour avec un drapeau encore vide.
- **Solution** : le sondage de M12-01 réutilise `new Image()` pour réchauffer le cache navigateur des dix SVG locaux dès `onReady`, avant toute interaction. Le nombre de fichiers effectivement chargés est publié dans `host.dataset.m12FlagsWarm`.
- **Impact** : révélation visuellement stable dès le premier survol, sans changer le code de `globe-reveal.js`.
- **Risque** : trois à dix requêtes locales au chargement (aucune requête distante) ; une seule passe par signature des codes, sans duplicata.
- **Effort** : S.
- **Vérification** : après `onReady`, `m12FlagsWarm = 10` avec les dix fichiers présents ; aucun appel réseau sortant.

## M12-08 — SVG locaux sans titre ni description accessibles

- **Preuve** : les dix fichiers de `public/flags/` sont de la forme `<svg xmlns=… viewBox="0 0 60 40">` suivie de `<rect>`, `<circle>` ou `<polygon>` : aucun `<title>`, aucun `<desc>`, aucun `role="img"`. Utilisés comme fond CSS, ils n'ont aucun nom accessible, y compris en dehors de l'overlay aria-hidden.
- **Solution** : M12 ne modifie pas les SVG (fichiers non possédés) ; il ajoute dans chaque `.globe-country-top` un span visuellement masqué `.m12-flag-sr` portant « Drapeau : <nom réel> », avec garde d'existence par `data-m12-enhanced`. Le drapeau de la liste obtient ainsi un équivalent textuel anatomisé du nom.
- **Impact** : le drapeau cesse d'être une information purement graphique dans la liste, même si le SVG manque de métadonnées.
- **Risque** : le span est `position:absolute` et ne perturbe pas la mise en page ; le nom provient de `ctx.countries`, aucune invention.
- **Effort** : S.
- **Vérification** : dix spans `.m12-flag-sr` après rendu ; aucun attribut `aria-hidden` ajouté à un élément porteur de sens.

## M12-09 — `background-size: cover` peut recadrer un drapeau

- **Preuve** : tous les SVG locaux ont `viewBox="0 0 60 40"` (ratio 2:1) et le masque utilise `maskSize: contain` (`globe-reveal.js:168-173`), mais `globe-reveal.js:74` impose `background-size:cover` sur `.gr-flag`. `cover` recadre dès que le ratio du visuel diffère de celui du conteneur.
- **Solution** : la feuille `monde-m12` surcharge `.gr-flag` en `background-size:contain`, `background-repeat:no-repeat`, `background-position:center`, cohérent avec le masque et avec le ratio réel des dix SVG.
- **Impact** : le drapeau est toujours affiché en entier, non déformé et non recadré, quelle que soit la taille du contour.
- **Risque** : surcharge CSS ciblée sur un sélecteur possédé par l'autre module, sans modifier son fichier ; vérifier visuellement que le masque et le fond restent alignés.
- **Effort** : S.
- **Vérification** : comparaison visuelle survol d'un pays ; le drapeau entier est visible dans le contour ; `node --check` passe.

## M12-10 — Aucun diagnostic silencieux de la santé des drapeaux

- **Preuve** : `globe-reveal.js:219-232` enveloppe le chargement dans des `.catch(() => …)` qui avalent l'erreur ; `registry.js` n'enregistre dans `mondeDiagnostics()` que les exceptions levées par les greffons. Un drapeau manquant ne laisse donc aucune trace vérifiable, et la règle du projet interdit d'ajouter un `console.*` pour compenser.
- **Solution** : M12 maintient un rapport déterministe sur `host.dataset.m12FlagsReport` (`ok=N;missing=…;invalid=…;pending=N`) et le réplique dans un nœud masqué `#monde-m12-flags-report` (`aria-hidden="true"`, `hidden`), créé avec garde d'existence. Le rapport est republié à chaque résultat de sondage.
- **Impact** : état des drapeaux auditable sans console, compatible avec l'exigence zéro erreur console et avec les suites E2E rejouées par l'agent maître.
- **Risque** : nœud hors flux et aria-hidden, aucune annonce live supplémentaire ; aucun sélecteur de test existant n'est touché.
- **Effort** : S.
- **Vérification** : lecture du dataset et du nœud après `onReady` ; chaîne stable et reproductible (aucun aléa).

---

## Statut d'implémentation

Les dix chantiers sont implémentés dans `src/views/monde/M12.js`. Le CSS est injecté uniquement via `ctx.css('monde-m12', …)`. Les éléments créés portent des IDs uniques (`monde-m12-flag-status`, `monde-m12-flags-report`, `monde-m12-era-badge`) et sont protégés par garde d'existence ; les crochets du registre sont enregistrés une seule fois malgré les rendus répétés.

Aucun blocage. Les fichiers SVG et `globe-reveal.js` n'ont pas été modifiés : les correctifs de repli, de cadrage et d'accessibilité passent par l'observation du DOM et une feuille de style injectée.

## Vérification

`node --check src/views/monde/M12.js` : PASS. Aucune autre commande n'a été lancée, conformément à la consigne.
