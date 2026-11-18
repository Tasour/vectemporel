# Audit v1-lecteur — Lecteur de source (Grokipedia traduit), navigation, recherche, replis

**Vue :** `v1-lecteur` (V1 POC). **Fichiers possédés :** `app.js` (zone lecteur/recherche), `server.mjs`.
**Expertise appliquée :** ingénierie pédagogique et éditoriale — qualité de lecture, provenance, clarté des sources, replis robustes.
**Règle :** 10 chantiers exactement, classés par priorité décroissante (P1 > P2 > P3). Aucune donnée inventée ; toute formulation proposée s'appuie sur des champs déjà renvoyés par le serveur (`fetchedAt`, `url`, `slug`, `titleOriginal`, `translationProvider`, `language`) ou sur des faits documentés dans `README.md`.

---

## V1-LECTEUR-01 — [P1] Provenance datée et licence : l'article ne dit pas ce qu'il est ni quand il a été vu

**Problème (preuve).** Le pied de page affiche une mention **statique et générique** : « Traduction automatique via Google Translate. Source originale : Grokipedia. Vectemporel est un prototype indépendant, non affilié à Grokipedia. » (`index.html:659`), tandis que les données riches renvoyées par le proxy — `fetchedAt` (`server.mjs:196`), `url`, `slug`, `language`, `translated`, `translationProvider`, `titleOriginal` (`server.mjs:345-355`) — sont **ignorées** par `renderReaderArticle` (`app.js:1525-1543`), qui ne fait qu'injecter `data.html`. Résultat : aucun lecteur ne peut dire *quelle page* est affichée, *quand* elle a été consultée, ni dans *quelle langue* elle a été écrite. Pédagogiquement, c'est un obstacle à l'esprit critique : la source est « Grokipedia » en abstraction, pas un document daté et identifié. `README.md:305` reconnaît l'absence d'accord/licence ; rien ne le dit au point de lecture.

**Solution concrète.** Générer depuis `renderReaderArticle` un bloc `<aside class="reader-provenance">` inséré en fin de `grokBody`, construit avec `textContent` (jamais d'HTML issu de la source) :
- `Source : Grokipedia — page « <slug> » · <url>`
- `Consultée le <Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short'}).format(new Date(data.fetchedAt))>` (uniquement si le champ existe)
- `Langue originale : anglais · Titre original : « <titleOriginal> »` (si présent)
- `Traduction : Google Translate, automatique — l'original fait foi.`
- `Contenu source externe, non affilié ; licence non vérifiée dans ce prototype (voir README, « Limites assumées »).`
Côté serveur, exposer `sourceNotice` et `privacyNotice` dans les réponses d'article (`server.mjs:345-355` et branche `translated:false` de `getArticle`, `server.mjs:386-390`) pour que l'UI ne porte pas seule la charge de la formulation.

**Impact.** Élève la traçabilité de la lecture : le lecteur sait What/When/Who avant de croire le contenu. Répond directement à la exigence de « mention de source » du README tout en la rendant *contextuelle* et non décorative.

**Risque.** Faible : champs optionnels à guarder (`if (data.fetchedAt)`), aucune date inventée. Le bloc allonge l'article de quelques lignes en fin de lecture.

**Effort.** S.

**Vérification.** Ouvrir un repère à slug connu (ex. via la recherche) → le bloc affiche le slug réel et une date conforme à `data.fetchedAt` ; comparer avec `curl -s 'http://127.0.0.1:4173/api/grokipedia?slug=...' | jq .fetchedAt`. Aucune date n'apparaît si le champ manque.

---

## V1-LECTEUR-02 — [P1] Avertissement de traduction relégué en bas de page, hors du champ de lecture

**Problème (preuve).** L'avertissement n'existe que dans `index.html:659`, après un article potentiellement long (des centaines de `<p>` injectés en `app.js:1535`). Le champ `translationNotice` produit par le serveur (`server.mjs:354`) n'est jamais consommé. Un lecteur qui s'arrête au premier écran lit une traduction automatique **sans le savoir** : c'est un manquement classique au « placement du signal » (information de qualité placée loin du point d'usage). Le cas `translated:false` est, lui, correctement signalé en tête (`renderReaderTranslationUnavailable`, `app.js:1483-1523`) — l'asymétrie est flagrante.

**Solution concrète.** Insérer en **premier enfant** de `grokBody`, dès que `data.translated === true`, un bandeau `<div class="reader-translation-notice" role="note">` : « Traduction automatique depuis l'anglais (Google Translate) — l'article original fait foi. » ;
Utiliser `data.translationNotice || 'Traduction automatique depuis l’anglais.'` et `data.translationProvider` pour composer le texte, afin que l'UI reste synchronisée avec le serveur. Ne pas utiliser de `<p>` (pour ne pas déclencher le `::first-letter` de `styles.css:1866`).

**Impact.** L'information de fiabilité est vue **au moment où l'on commence à lire**, pas après. Effet pédagogique maximal pour un coût minimal.

**Risque.** Très faible ; doublon partiel avec le pied de page, assumé (redondance utile en début/fin de lecture).

**Effort.** S.

**Vérification.** Ouvrir un article traduit : le bandeau est le premier élémentVisible de `.grok-body`, avant le sommaire et le premier paragraphe. Forcer `translated:false` (réponse API) : aucun bandeau, écran de traduction indisponible conservé.

---

## V1-LECTEUR-03 — [P1] Navigation interne : le titre du dialogue et le contexte restent ceux de l'événement d'origine

**Problème (preuve).** `renderReaderEvent` (`app.js:1310-1344`) fixe une fois `readerTitle`, `readerContext`, `readerTags` et les chips « Continuer le fil ». `onGrokLink` (`app.js:1641-1665`) charge un **autre** article dans le même panneau sans jamais mettre à jour cet en-tête ; `renderReaderArticle` (`app.js:1525-1543`) ne touche qu'à `grokBody`. Le dialogue `aria-labelledby="reader-title"` (`index.html:603`) annonce donc le titre de l'événement alors que le corps parle d'un autre sujet — erreur d'étiquetage et désorientation. `onReaderBack` (`app.js:1628-1639`) dépile le slug mais ne restaure pas le contexte de l'événement de départ ; de plus `openEvent` écrase `state.readerStack` à chaque appel (`app.js:1379`), donc passer par un chip « Continuer le fil » efface l'historique.

**Solution concrète.** Ajouter `state.readerBaseEventId` (événement ayant ouvert le panneau) et `state.readerCurrentEventId` (événement actuellement représenté, `null` pour un article lié). Dans `onGrokLink`, passer `readerCurrentEventId = null` ; dans `renderReaderArticle`, si `readerCurrentEventId === null`, remplacer `readerTitle` par `data.title`, `readerContext` par `Article lié · <slug>`, vider `readerTags` et masquer `readerRelated`. Dans `onReaderBack`, détecter le retour au slug de base (`baseEvent.grok === previous`) et rappeler `renderReaderEvent(baseEvent)` pour restaurer titre/contexte/chips ; sinon laisser `renderReaderArticle` étiqueter l'article. Réinitialiser les deux champs dans `closeReader`.

**Impact.** Le fil narratif reste lisible : on sait toujours *où l'on est* dans la hiérarchie « événement → article → article lié → retour ». Corrige aussi l'accessibilité du dialogue.

**Risque.** Moyen : `renderReaderEvent` réinitialise `readerScroll.scrollTop` et les liens externes — l'appeler uniquement sur le retour explicite au slug de base, pas à chaque rendu d'article.

**Effort.** M.

**Vérification.** Ouvrir un événement, cliquer un lien `/page/` dans l'article → le titre devient celui de l'article, le bouton « Retour » apparaît ; cliquer « Retour » → le titre, le contexte et les chips de l'événement d'origine sont restaurés. Vérifier avec un lecteur d'écran que le nom du dialogue correspond au contenu.

---

## V1-LECTEUR-04 — [P2] Liens internes : interception de tous les clics, y compris modifiés, sans annonce ni focus

**Problème (preuve).** `onGrokLink` (`app.js:1650-1651`) fait `event.preventDefault()` sur **tout** lien `grokipedia.com/page/`, sans tester `event.metaKey/ctrlKey/shiftKey/altKey` ni `button !== 0` ni `target`. L'utilisateur ne peut donc pas ouvrir un article lié dans un nouvel onglet, comportement standard des liens. Aucun retour auditif n'est prévu après la navigation (pas de `aria-live`, cf. chantier 05) et le focus reste sur un lien qui vient d'être retiré du DOM par `setReaderLoading` (`app.js:1429-1430`), ce qui le renvoie sur `<body>`.

**Solution concrète.** Garde dans `onGrokLink` : si `event.button !== 0` ou l'un des modificateurs est actif ou `anchor.target === '_blank'`, retourner sans intercepter (laisser le navigateur agir). Pour un clic simple : mémoriser le slug, appeler `loadReaderArticle`, puis déplacer le focus vers `els.readerScroll` (`tabindex="0"` déjà présent, `index.html:632`) et annoncer « Ouverture de l’article <slug> ». Ajouter via le CSS injecté un style de focus visible sur les liens du corps.

**Impact.** Restaure le modèle mental du navigateur (clic simple = navigation dans le panneau ; Ctrl+clic = nouvel onglet) et évite la perte de focus, critique pour les utilisateurs clavier.

**Risque.** Faible ; la logique d'interception reste inchangée pour le clic simple, seul le chemin modifié est laissé au navigateur.

**Effort.** S.

**Vérification.** Ctrl+clic (ou clic molette) sur un lien interne : nouvel onglet ouvert, panneau inchangé. Clic simple : panneau mis à jour, `document.activeElement === els.readerScroll`.

---

## V1-LECTEUR-05 — [P2] États de chargement et d'erreur muets pour les technologies d'assistance

**Problème (preuve).** Le squelette (`index.html:638-645`, recapturé dans `SKELETON_HTML`, `app.js:99`) n'a ni `role="status"` ni `aria-live`, et `setReaderLoading` (`app.js:1426-1431`) le réinjecte sans attributs. Aucune région live n'existe dans le panneau. Quand la traduction échoue (`server.mjs:384-393`) ou quand la page est introuvable (`renderReaderNotFound`, `app.js:1550-1596`), rien n'est annoncé. Le délai peut être long : 18 s de fetch (`server.mjs:65`) + 32 s par lot de traduction avec 2 workers (`server.mjs:205-208`, `220`), soit une attente sans feedback évolutif au-delà du squelette statique.

**Solution concrète.** Créer une région `<div id="reader-status-live" role="status" aria-live="polite">` discrète dans `els.reader` ; l'alimenter à chaque transition : « Chargement de l’article en cours », « Article chargé : <titre> », « Aucune page directe pour ce repère », « Grokipedia est momentanément muet ». Poser `aria-busy="true"` sur `grokState` pendant le chargement et le retirer dans chaque rendu. Après 5 s sans réponse, remplacer la légende du squelette par « La traduction peut prendre quelques instants… » (message vrai, aucune donnée inventée) via un timer annulé à la fin du chargement.

**Impact.** Équité d'accès à l'information d'état ; réduction de l'incertitude pendant une attente longue (facteur de stress et d'abandon).

**Risque.** Faible ; veiller à annuler le timer sur fermeture du panneau et sur changement de requête (`state.readerRequest`) pour éviter une légende obsolète.

**Effort.** M.

**Vérification.** Activer NVDA/VoiceOver ou un inspecteur d'accessibilité : chaque changement d'état est annoncé ; `aria-busy` passe de `true` à `false` ; aucune annonce après fermeture du lecteur.

---

## V1-LECTEUR-06 — [P2] Repli 404 : titres de recherche anglais présentés sans indication de langue

**Problème (preuve).** Côté serveur, `searchGrok` (`server.mjs:401-427`) renvoie des `title` extraits de Grokipedia, donc en anglais, sans champ de langue. Côté client, `renderReaderNotFound` (`app.js:1564-1580`) les injecte tels quels dans des boutons `.reader-candidate` (`label.textContent = candidate.title`), sans intitulé de section, sans `lang="en"` et sans explication. Un lecteur francophone croit voir des propositions françaises ; l'attribut `lang` manquant perturbe aussi la prononciation par synthèse vocale.

**Solution concrète.** Ajouter `language: 'en'` (et `source: 'Grokipedia'`) aux résultats de `searchGrok` (`server.mjs:424`). Dans `renderReaderNotFound`, faire précéder la liste d'un libellé « Résultats de recherche — titres originaux en anglais » et d'une phrase « Ces propositions n'ont pas été traduites. » ; poser `label.lang = candidate.language || 'en'` et `button.title = 'Ouvrir sur Grokipedia : ' + candidate.title`. Conserver l'intégralité du comportement de chargement au clic.

**Impact.** Le repli devient compréhensible : on sait que l'on quitte la langue de lecture et pourquoi.

**Risque.** Très faible ; aucun titre n'est modifié, seule l'étiquette change.

**Effort.** S.

**Vérification.** Ouvrir un repère sans slug direct (les 40 repères de repli signalés dans `README.md:158`) → les candidats sont précédés du libellé, prononcés avec une voix anglaise par le lecteur d'écran, et le clic charge toujours l'article.

---

## V1-LECTEUR-07 — [P2] Confidentialité : l'envoi du texte au traducteur est documenté dans le README, pas dans l'interface

**Problème (preuve).** `README.md:304` admet explicitement : « ce qui implique d'envoyer le texte de l'article à ce service ». `fetchTranslationBatch` (`server.mjs:214-228`) POSTEffectivement chaque bloc à `https://clients5.google.com/translate_a/t` via un endpoint non officiel. Le panneau, lui, ne le dit nulle part : l'utilisateur consent sans information. Par ailleurs, `loadReaderArticle` (`app.js:1457-1460`) envoie au proxy un `q` composite (titre + sous-titre + pays) qui est transmis à Grokipedia en cas de 404 (`server.mjs:438-449`), sans que cela soit dit. Enfin, le `fetch` same-origin envoie les cookies du site au proxy (`credentials` par défaut `same-origin`) et les liens externes générés n'ont pas de `referrerPolicy`.

**Solution concrète.** (a) Intégrer au bloc de provenance (chantier 01) une ligne « Confidentialité : le texte de cet article est transmis à Google Translate pour la traduction. » alimentée par `data.privacyNotice`. (b) Ajouter `credentials: 'omit'` et `referrerPolicy: 'no-referrer'` au `fetch` de `/api/grokipedia`. (c) Poser `referrerPolicy = 'no-referrer'` sur les ancres externes créées dans `renderReaderTranslationUnavailable`, `renderReaderNotFound` et `renderReaderError`. (d) Exposer un en-tête `x-vectemporel-disclosure` sur les réponses API pour rendre le fait testable sans lecture du code.

**Impact.** Consentement éclairé et réduction de la surface de données transmises (cookies, referrer). Cohérence entre la documentation et l'interface.

**Risque.** Très faible : le proxy ne dépend d'aucun cookie ; `referrerPolicy` n'affecte pas l'ouverture des liens.

**Effort.** S.

**Vérification.** Dans l'article, la ligne de confidentialité est visible ; `curl -I` sur `/api/grokipedia?slug=...` montre l'en-tête de disclosure ; les onglets ouverts via « Original » n'envoient pas de `Referer`.

---

## V1-LECTEUR-08 — [P2] Articles longs : aucun sommaire, aucune progression, tableaux non défilables sur mobile

**Problème (preuve).** `renderReaderArticle` injecte `data.html` en une seule fois (`app.js:1535`) sans post-traitement. Les titres `h2/h3` produits par `cleanArticleHtml` (`server.mjs:103-107`) ne reçoivent pas d'`id`, donc pas d'ancrage. Aucun sommaire, aucun indicateur de progression. Sur petit écran, les `<table>` autorisées par le sanitizer (`server.mjs:124-127`) débordent horizontalement sans conteneur défilable. Charge cognitive et orientation spatiale en souffrent sur des articles longs.

**Solution concrète.** Après injection : (1) attribuer des `id` uniques (`reader-sec-1`, …) aux `h2/h3` et construire un `<nav class="reader-toc" aria-label="Sommaire de l’article">` avec une liste de liens ; intercepter le clic sur ces liens pour faire `scrollIntoView` + `focus({preventScroll:true})` **sans changer `location.hash`** (le hash pilote le deep-link de l'app, `app.js:256`). (2) Envelopper chaque `<table>` dans `<div class="reader-table-scroll" tabindex="0" role="region" aria-label="Tableau, faire défiler horizontalement">`. (3) Mettre à jour une variable CSS `--reader-progress` sur `els.reader` auscroll de `readerScroll` et dessiner une barre fine via `.reader-bar::after` (le `.reader-bar` est déjà `position:relative`, `styles.css:3918-3928`). Styles ajoutés uniquement via le bloc `<style id="v1-lecteur-css">` injecté depuis `app.js`.

**Impact.** Repères de lecture, navigation rapide, lisibilité mobile : c'est le chantier le plus « pédagogique » de la liste après la provenance.

**Risque.** Moyen : le piège de focus (`app.js:1165-1183`) doit inclure les nouveaux éléments focalisables (déjà le cas via la requête `a[href], button, [tabindex]`). Ne jamais modifier le hash de la page.

**Effort.** M.

**Vérification.** Article avec ≥ 3 titres : sommaire présent, clic sur une entrée = défilement sans changement d'URL ; barre de progression de 0 à 1 ; sur 390×844, un tableau se fait défiler horizontalement sans casser la largeur du panneau.

---

## V1-LECTEUR-09 — [P3] Cache client sans expiration ni actualisation manuelle malgré le support serveur `refresh=1`

**Problème (preuve).** `articleCache` (`app.js:1302`) conserve les articles **pour toute la session**, sans TTL. Le serveur a pourtant un TTL de 6 h (`server.mjs:12`) et accepte `?refresh=1` (`server.mjs:438`) — mais le client ne l'utilise jamais (`app.js:1458-1460`). Un article traduit il y a plusieurs heures peut donc rester affiché indéfiniment dans l'onglet, et la date de consultation n'étant pas montrée (chantier 01), le lecteur ne peut pas s'en rendre compte. Le cas `translated:false` est correctement exclu du cache (`app.js:1475`).

**Solution concrète.** Ajouter dans `loadReaderArticle` : `options.force` contourne `articleCache.get(slug)` et le supprime ; `options.refresh` ajoute `&refresh=1` à l'URL. Placer un bouton « Actualiser cet article » dans le bloc de provenance (chantier 01) qui appelle `loadReaderArticle(slug, { force:true, refresh:true, query, event })` ; annoncer « Actualisation en cours » dans la région live. Afficher la date `fetchedAt` mise à jour après actualisation. Aucun TTL client n'est nécessaire si la date est visible et l'action disponible.

**Impact.** Donne le contrôle au lecteur et rend visible la fraîcheur de la source, sans dépendre d'un rechargement de page.

**Risque.** Faible ; un clic sur « Actualiser » déclenche un appel réseau supplémentaire — comportement attendu et explicite.

**Effort.** S.

**Vérification.** Après actualisation, `fetchedAt` affiché change et une nouvelle requête `refresh=1` apparaît dans l'onglet Réseau ; sans actualisation, une seconde ouverture du même repère utilise bien le cache client (aucune requête).

---

## V1-LECTEUR-10 — [P3] Accessibilité globale du panneau : focus visible, piège et cohérence des libellés d'action

**Problème (preuve).** Le piège de focus (`app.js:1165-1183`) filtre sur `offsetParent !== null`, ce qui omet les éléments rendus invisibles par d'autres moyens, et ne couvre pas les contrôles créés *après* ouverture (sommaire, bouton d'actualisation, tableaux) — il les recalcule à chaque Tab, donc les inclut, mais sans style de focus dédié. Les liens externes générés n'ont pas d'`aria-label` contextualisé : « Original », « Lire l'original sur Grokipedia ↗ », « Ouvrir sur Grokipedia ↗ » sont ambigus hors contexte (`app.js:1512-1517`, `1584-1590`, `1616-1622`). Enfin, `announceReader` n'existe pas (chantier 05) et le focus n'est pas ramené en haut de l'article après une navigation interne (chantier 04).

**Solution concrète.** Dans le bloc CSS injecté : `:focus-visible` contrasté pour `#grok-body a`, `.reader-toc a`, `.reader-candidate`, `.reader-retry`, `.reader-refresh`, `.reader-table-scroll` ; `prefers-reduced-motion` pour la barre de progression. Pose `aria-label` explicite sur chaque ancre externe générée, du type `Ouvrir la source originale sur Grokipedia dans un nouvel onglet — <slug>`. Garder le piège existant mais ajouter un `reader-status-live` dans la liste des éléments à ne pas piéger (il est `sr-only`, donc non focalisable). Vérifier que `readerClose` reçoit le focus à l'ouverture (`app.js:1352-1354`) et que `closeReader` le restitue (`app.js:1411-1419`).

**Impact.** Parcours clavier complet et libellés explicites : le panneau devient utilisable sans souris ni vue.

**Risque.** Très faible ; uniquement des attributs et du CSS additionnels.

**Effort.** S.

**Vérification.** Tab / Maj+Tab à l'intérieur du panneau : le focus reste dans le dialogue et chaque élément a un anneau visible ; les trois liens externes ont un libellé distinct annoncé ; Échap ferme et rend le focus à l'élément d'origine.

---

## Synthèse d'implémentation (à compléter par l'agent)

| Chantier | Fichiers | Statut | Vérification |
| --- | --- | --- | --- |
| 01 Provenance | `app.js` (`buildReaderProvenance`), `server.mjs` (`sourceNotice`) | ✅ | Test navigateur : date/titre original/slug affichés |
| 02 Avertissement traduction | `app.js` (`renderReaderArticle`) | ✅ | `.reader-translation-notice` = 1er enfant de `#grok-body` |
| 03 Retour / titre | `app.js` (`state.readerBaseEventId`, `onReaderBack`, `updateReaderArticleHeading`) | ✅ | Test : lien interne → titre article ; retour → « Alésia » + contexte d'origine |
| 04 Liens modifiés | `app.js` (`onGrokLink`) | ✅ | Garde `button/modificateurs/target` ; focus → `reader-scroll` |
| 05 États / live | `app.js` (`announceReader`, `setReaderLoading`, timer 5 s) | ✅ | `aria-busy` true→false ; `#reader-status-live` announcé |
| 06 Repli 404 | `server.mjs` (`language:'en'`), `app.js` (`renderReaderNotFound`) | ✅ | Libellé « titres originaux en anglais » + `lang="en"` |
| 07 Confidentialité | `server.mjs` (notices + en-tête), `app.js` (`credentials:'omit'`, `referrerPolicy`) | ✅ | En-tête `x-vectemporel-disclosure` ; ligne visible dans l'article |
| 08 Sommaire / progression / mobile | `app.js` (`buildReaderToc`, `wrapReaderTables`, `setupReadingProgress`, CSS injecté) | ✅ | Test : 2 entrées de sommaire, tableau enveloppé, `--reader-progress` |
| 09 Cache / actualisation | `app.js` (`options.force`, `options.refresh`, bouton) | ✅ | Test : requête `&refresh=1` émise au clic |
| 10 Accessibilité clavier | `app.js` (CSS `:focus-visible`, `aria-label` des liens externes) | ✅ | Test : `aria-label` présent, piège de focus existant conservé |

**Vérifications globales :** `node --check app.js` ✅ · `node --check server.mjs` ✅ · `npm run verify` ✅ (189/189).
**Test ciblé (Puppeteer local, API stubée) :** lecteur ouvert, sommaire/provenance/avertissement présents, navigation interne + retour corrects, actualisation déclenchée, **0 erreur applicative**.
**E2E clavier (`npm run test:e2e`) :** 6/14 — les échecs commencent à « Entrée ouvre le lecteur », c.-à-d. **avant** l'entrée dans le code du lecteur (chaîne Système solaire/clavier, `solar.js` modifié simultanément par un autre sous-agent) ; « Aucune erreur console » est PASS. Non imputable aux chantiers v1-lecteur, à réévaluer après stabilisation des vues concurrentes.
