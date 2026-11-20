# Audit complet — Vectemporel (Atlas + données sources + archive POC)

> **Date** : 2026-11-20 · **Version du projet auditée** : `vectemporel-atlas` 0.1.0, service actif depuis le 18/11 sur `:4181`
> **Périmètre** : `~/Projects/vectemporel-atlas` (Atlas, `source/`, `scripts/`, `public/`, `tests/`, documentation, 1 165 rapports Markdown) + `~/Projects/_archive/vectemporel-poc` (224 Mo, 8 527 fichiers) + service systemd et lanceur desktop.
> **Méthode** : 7 audits parallèles en lecture seule (données, architecture/performance, accessibilité, sécurité, tests/dette, visuel/contenu, parité fonctionnelle) + sondes navigateur/HTTP indépendantes. **Aucun fichier du projet, aucun service et aucun rapport d'audit n'ont été modifiés.** Aucune commande d'écriture (`build:data`, `build:points`, `verify:points`, Git) n'a été exécutée ; le test de crash du serveur n'a pas été joué pour ne pas perturber le service (démonstration statique).

---

## 1. Verdict

L'Atlas est **structurellement propre mais fonctionnellement fragile**. La couche de données est remarquablement saine (unicité des ids, dates cohérentes, 229/229 images présentes, zéro erreur console) ; l'interface est navigable et le service tourne. Mais quatre fondations ne tiennent pas :

1. **L'exposition** : le serveur écoute sur `*:4181` et sert tout le dépôt, y compris `.git/` et `node_modules/`.
2. **La vérification est un théâtre partiel** : `verify:points` ne peut pas échouer et réécrit un document suivi ; `merge-points` corrompt les compteurs au second lancement ; `taxonomyAligned()` est faux à l'exécution et personne ne le teste.
3. **La rigueur affichée n'est pas la rigueur mesurée** : « 100 % de couverture » recouvre 399 cellules encore `partiel` ou `vide non traité` ; 845 points sont dits « validés » alors qu'aucun audit n'est signé (deux sont bloqués) ; 135 points n'ont aucune source, dont 44 marqués `certain`.
4. **Le produit a été réécrit à périmètre réduit sans décision écrite** : système solaire, dragon, plan, frise zoomable, carte satellite, lecteur et 186 pays ont disparu ; 1 050 modules de « lentilles » et 1 165 rapports documentent surtout l'audit lui-même.

Priorité absolue : **P0-1 à P0-8** (exposition, vérification, données). Le reste peut être planifié.

---

## 2. État des lieux mesuré

| Grandeur | Valeur mesurée | Source |
|---|---|---|
| Service | `active (running)`, `*:4181`, HTTP 200 | `systemctl`, `ss -tlnp`, `curl` |
| Erreurs console / pageerror | **0** | sonde Puppeteer 1440×900 |
| Chargement | **2 134 ms**, **920 requêtes**, **6,1 Mo** transférés (250 ressources dans l'API Performance) | sonde Puppeteer |
| Source sur disque | `src/` = **23 Mo**, **1 167 fichiers `.js`**, 20,9 Mo de JS | `du`, `find` |
| Modules importés au démarrage | **1 001** (501 v1 + 500 v2 + 50 Monde) | comptage des `import` dans 11 `index.js` |
| DOM au repos | globe **1 041 nœuds**, autres vues **170 nœuds** | sonde Puppeteer |
| Feuilles de style injectées | **56 `<style>` / 591 règles**, stable après 12 changements de vue | sonde Puppeteer |
| Bouton Diagnostics | **1**, visible sur toutes les vues, libellé « Diagnostics · 50 » | sonde Puppeteer |
| Liens externes `<a href^="http">` | **0 dans le DOM par défaut** (mais productibles par du code, voir P1-12) | sonde Puppeteer + `E025.js:185-188` |
| Compteurs dataset | 10 pays · 56 ères · **229 repères** · **901 points de récit** + **845 points validés** = **1 746** | import direct de `dataset.js` |
| Couverture déclarée | **784/784** couples ère×domaine (avec ≥ 1 proposition) | `verify-points.mjs:41-47` |
| Couverture réelle des matrices | 265 `couvert` + 120 `vide justifié` + **332 `partiel` + 67 `vide non traité`** = 399 non résolues | `source/audits/*/coverage-matrix.csv` |
| Rapports Markdown | **1 165**, ~18 Mo ; 1 168 fichiers dans `UNIFIED_AUDIT/` | `find` |
| `node_modules` suivis par Git | **3 714 fichiers** | `git ls-files node_modules \| wc -l` |

### Arbitrages des divergences entre audits

Les agents ont produit quelques chiffres incompatibles ; les mesures directes prévalent :

- **Charge initiale** : l'analyse statique annonçait « ~1 169 requêtes / 22,9 Mo » (taille des sources). La sonde mesure **920 requêtes / 6,1 Mo transférés / 2,1 s**. Le problème reste réel (aucun lazy-loading, HTTP/1.1 nu), mais le chiffre à retenir est **6,1 Mo transférés**.
- **Accumulation CSS** : l'analyse statique comptait 919 appels `ctx.css()` et annonçait ~1 000 `<style>` ; la sonde montre **56 `<style>` constants**, y compris après activation de Diagnostics et 12 changements de vue. La surcharge visuelle redoutée n'est donc **pas** avérée au repos ; en revanche l'activation du mode diagnostics fait passer le DOM de 170 à **720 nœuds** en Chronologie (état singleton, voir P1-15).
- **Écouteurs clavier** : 26 (comptage `document.addEventListener`) à 57 (comptage global) selon les périmètres ; un agent en dénombre 224 handlers locaux de lentilles. Fait vérifié sans ambiguïté : `window.VECTEMPOREL_KEYS.taxonomyAligned()` renvoie **`false`**, `conflicts()` renvoie `[]`, `taxonomyVersion = "m4.2"`, libellés réels `Monde / Chrono / Récit / Géo / Const / Points`.
- **`POINT_METHODOLOGY.md.tmp`** est un **répertoire vide** (d'où un 404 HTTP), pas un fichier de 0 octet.
- **`meta.points = 1746` est arithmétiquement correct** (901 + 845) ; le défaut est l'idempotence (`+=`) et l'étiquetage, pas l'addition.

---

## 3. Tableau P0 — bloquants

| # | Constat | `fichier:ligne` | Impact concret | Correctif | Test manquant |
|---|---|---|---|---|---|
| **P0-1** | Serveur sans host explicite : `*:4181` (log annonce faussement `127.0.0.1`). Aucune auth, aucun TLS. | `scripts/serve.mjs:39` ; `~/.config/systemd/user/vectemporel-atlas.service:5-13` | Tout appareil du LAN accède à l'atlas **et au dépôt entier** | `.listen(PORT, '127.0.0.1')` + `IPAddressDeny=any`/`IPAddressAllow=localhost` ; corriger le log | `ss -tlnp \| grep 4181` doit afficher `127.0.0.1:4181` ; `curl --interface <IP_LAN>` doit échouer |
| **P0-2** | Fuite du dépôt : `.git/config`, `.git/HEAD`, `package-lock.json`, `scripts/verify.mjs`, `source/audits/**`, `node_modules/**` servis en **200** | `scripts/serve.mjs:6,23,28` | Source, historique Git (email personnel), versions des dépendances et brouillons exposés | Whitelist `index.html`, `styles.css`, `public/**`, `src/**` ; ou servir un `dist/` dédié | Tableau d'assertions HTTP 200/403 sur ~8 chemins sensibles |
| **P0-3** | Crash par entrée client : `decodeURIComponent` sans `try/catch` (`/%` → `URIError`), `Host` invalide → `TypeError` ; `Restart=on-failure` crée une boucle | `scripts/serve.mjs:20-39` | Une requête fait tomber le service et grossit les journaux | Envelopper le handler dans `try/catch → 400` ; base d'URL fixe `'http://localhost'` | Requêtes `/%`, `/%ZZ`, `Host: [` → 400 et PID inchangé |
| **P0-4** | `verify:points` n'a **aucun `exit`/`exitCode`** et réécrit `COVERAGE_POINTS.md` (suivi par Git) | `scripts/verify-points.mjs:50-56` ; `package.json:12` ; `POINT_METHODOLOGY.md:66` | À 0 % de couverture le script sort 0 et `npm run check` reste vert ; vérifier modifie l'arbre de travail | `process.exitCode = 1` si manquants/anomalies ; sortir l'écriture dans `report:coverage` | Test de mutation : retirer un YAML → sortie 1 ; `git status --porcelain` vide après `check` |
| **P0-5** | `merge-points.mjs:96` fait `data.meta.points += merged` et réécrit `generated` à la date du jour | `scripts/merge-points.mjs:39,96-100` | `1746 → 2591 → 3436` au 2ᵉ/3ᵉ lancement ; génération non reproductible | `meta.points = basePoints + merged` en une passe ; figer `generated` ; séparer `eventPoints`/`validatedPoints` | Exécuter la chaîne 2× dans un répertoire temporaire et comparer les SHA-256 |
| **P0-6** | Taxonomie publique déjà divergente : `taxonomyAligned() === false` ; 3 libellés diffèrent entre `app.js`, `keyboard.js` et README ; `m4.2` vs `m4.1` ; « 5 vues » vs 6 | `src/app.js:17,21-28` ; `src/platform/keyboard.js:14-21,226-231` ; `README.md:71,73-80,122-123` (mesure navigateur confirmée) | La règle de synchronisation en 4 endroits est violée ; aide et coque affichent des noms différents ; aucun contrôle ne le voit | Source unique de vérité ; dériver README et `FALLBACK_VIEWS` ; élever `taxonomyAligned()` en assertion bloquante | `check('taxonomie alignée', …)` + tests de parité README ↔ `window.VATLAS` |
| **P0-7** | « 100 % de couverture » faux au sens de la méthode : 332 `partiel` + 67 `vide non traité` = **399 cellules non résolues** dans les matrices ; `verify-points` ne considère que l'existence d'une proposition `validated` | `COVERAGE_POINTS.md:3` ; `scripts/verify-points.mjs:41-47` ; `source/audits/*/coverage-matrix.csv` ; `POINT_METHODOLOGY.md:61-66` | ~51 % des cellules restent ouvertes alors que l'interface affiche 100 % ; exemple Chine 70/70, USA 54/84 | Mettre à jour les matrices **ou** renommer la métrique en « couples avec ≥ 1 proposition » et réécrire la méthode | `assert(!rows.some(r => ['partiel','vide non traité'].includes(r.status)))` |
| **P0-8** | 845 points « validés » issus d'audits **tous `verdict: pending`**, `signed_by: []`, et `blocked: true` pour Chine et Égypte ; le merge ne vérifie pas le verdict | `dataset.js` (`audit.verdict`, `signoff`) ; `scripts/merge-points.mjs:54` ; `README.md:181` | Aucun acte de validation derrière le statut ; des points promus malgré des blocages explicites | Conditionner à `verdict === 'accepted' && signed_by.length > 0 && !blocked`, ou renommer en `extrait`/`proposé` | Échec du merge si un pays est `pending` ou `blocked` |
| **P0-9** | **135 points validés sans source**, dont **44 `certain`** (43 FR, 1 DE) et 13 `probable` ; un point a une omission (`OM-002`) comme unique « preuve » | `scripts/merge-points.mjs:50,56` ; `proposals/france/france-era-2.yaml:23-26` ; `POINT_METHODOLOGY.md:17,52` | Des affirmations présentées comme certaines sont invérifiables ; violation de « aucune affirmation sans source » | Rejeter `sources: []` sauf `non documenté` avec ID `OM-xxx` ; exiger 2 sources pour `certain` | Assertion sur tous les points + contrôle du préfixe `OM-` |
| **P0-10** | Dialogues non hermétiques : l'inertie ne couvre que les enfants de `#app`, alors que le bouton Diagnostics et des panneaux sont dans `<body>` ; deep-link `#v=points&d=1` rend **tout le fond inerte sans dialogue** | `src/ui/shell.js:317-322,476,487-489,557-559` ; `src/views/monde/registry.js:121-146` ; `src/domain/store.js:606-627,384-387` | Tab sort de la modale ; lecteur d'écran annonce un modal qui ne fige pas le document ; page inerte sans issue sauf Échap | Inerter tous les frères du dialogue ; neutraliser `detailOpen` si `!currentEvent()` ; poser l'inertie seulement si une modale existe | 40 Tab/Shift+Tab dans le dialogue ; charger `d=1` sans repère et assérer zéro `[inert]` |
| **P0-11** | Graphe de modules chargé intégralement : 1 001 imports statiques, 920 requêtes, 6,1 Mo, 2,1 s, HTTP/1.1 sans gzip/ETag, `Cache-Control: no-cache` | `index.html:13-15` ; `src/app.js:6-12` ; `src/ui/shell.js:13-17` ; 11 `index.js` ; `scripts/serve.mjs:33-36` | Coût de parse ~1–3 s sur desktop, plusieurs dizaines de secondes sur mobile 4G ; re-téléchargement intégral à chaque rechargement | Lazy-`import()` des lentilles par vue, ou bundling esbuild ; gzip/brotli + ETag + cache immutable ; texture 2k par défaut | `< 50` requêtes et `< 1 Mo` avant premier rendu ; aucun `E*.js` dans le graphe initial |
| **P0-12** | Réécriture à périmètre réduit non documentée : solaire, dragon, plan, frise zoomable, carte satellite, lecteur, 186 pays, 15 scripts de génération absents de l'Atlas ; les 250 chantiers V1 corrigés sont dans l'archive non desservie | `APP_PLAN.md:33-40` ; `CONCEPT.md:237-254` ; `src/app.js:21-28` ; `package.json:7-15` ; `UNIFIED_AUDIT/SYNTHESE.md:39,59-62,98` (chemins `v1/`/`v2/` inexistants) | Un utilisateur du POC perd ses parcours principaux ; impossible de dire ce qui a été livré, abandonné et pourquoi | ADR d'archivage + § « Périmètre volontairement réduit » dans le README avec le sort de chaque feature | Sonde des ports 4173/4181 + checklist machine des marqueurs de feature |

---

## 4. P1 — à planifier (5 workstreams sur fichiers disjoints)

### WS A — Serveur, sécurité et hygiène des dépendances

| Constat | `fichier:ligne` | Correctif |
|---|---|---|
| En-têtes absents : CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | `scripts/serve.mjs:33-36` | CSP avec `connect-src 'self'` (le `fetch` local de `globe-engine.js:896` est légitime) + `nosniff` + `no-referrer` |
| Garde `file.startsWith(ROOT)` sans séparateur : un sibling `vectemporel-atlas-old` serait servi | `scripts/serve.mjs:6,23-24` | `path.relative(ROOT, file)` + refus de `..` et absolu ; `fileURLToPath` pour `ROOT` |
| `Host` client utilisé comme base d'URL ; absent/invalide = crash | `scripts/serve.mjs:21` | Base fixe `http://localhost` |
| `yaml` (build) et `puppeteer-core` (tests) sont des dépendances de production déclarées ; caret versions ; `node_modules/.package-lock.json` porte `name: vectemporel-v2` vs `vectemporel-atlas` | `package.json:16-21` ; `package-lock.json:1-16` ; `node_modules/.package-lock.json:2` | Passer en `devDependencies`, épingler, `engines.node`, régénérer le lockfile |
| **3 714 fichiers `node_modules` suivis par Git**, aucun `.gitignore` | dépôt entier | `.gitignore` puis `git rm -r --cached node_modules` en commit séparé |
| `vm.runInContext()` exécute `source/*.js` et `dataset.js` au build | `scripts/build-dataset.mjs:26-29,82-85` ; `merge-points.mjs:17` | JSON validé ou import ESM contrôlé + hash d'intégrité |
| Email personnel dans l'historique Git (via `/.git/logs/HEAD`) | `.git/logs/HEAD` | Résolu par P0-2 ; aucun réécriture d'historique nécessaire pour un dépôt local |

### WS B — Vérification, données et éditorial

| Constat | `fichier:ligne` | Correctif |
|---|---|---|
| `verify.mjs` = 12 sites d'appel (`≥ 900` sans borne haute ; `countryEraValid` absent du dataset → test toujours vrai) ; import `vm` mort | `scripts/verify.mjs:4,20,22,27` | Égalités exactes sur `meta`, suppression du test illusoire et de l'import, contrôles AST |
| E2E = 16 assertions, desktop 1440×900 uniquement, 10 `setTimeout` fixes ; `2` jamais pressée (Chrono atteinte par clic) ; `m c r g s p`, `?`, `Espace`, `↑/↓` non testés | `tests/e2e.mjs:17-62` ; `README.md:90-101` | 2 viewports (390×844, 1658×1150), `waitForFunction`, parcours chiffres **et** lettres, assertions API et a11y |
| Lexique de certitude divergent : `certainty` UI « vérifié/certain/probable/contesté » vs données `certain/probable/non documenté/disputé/disputed` (3 valeurs anglaises) ; `datePrecision` = 18 valeurs dont 13 textes libres | `dataset.js` ; `README.md:112` ; `POINT_METHODOLOGY.md:18` | Énumérations fermées + migration |
| 168 points `non documenté` (20 %) comptés comme couverture, textes génériques concaténés, 14 groupes de justifications dupliqués entre pays | `scripts/merge-points.mjs:76` ; `POINT_METHODOLOGY.md:130` | `status: omitted` distinct, exclusion du décompte, réécriture des phrases |
| Omissions : 138 `to_fill`, 7 `documented`, 3 `accepted` ; aucun `reviewer` ; tous les points des 56 YAML sont déjà `validated`, aucune trace `proposed → validated` | `source/audits/*/omissions.yaml` ; `proposals/*/*.yaml` | Conserver `proposed`, ajouter `validated_by`/`validated_at` et un journal d'arbitrage |
| `fixes.yaml`, `proposals.yaml` et `REPORT.md` jamais consommés par les scripts ; `REPORT.md` annonce 53 repères FR là où `data.js` en contient 57 | `scripts/build-dataset.mjs:90-109` ; `source/audits/france/REPORT.md:3` | Intégrer les corrections ou les déclarer archivées ; régénérer les blocs chiffrés |
| 42 sources « non concluantes » et `audit.signoff` exposé mais jamais affiché ; aucune double lecture/kappa | `BUG_AUDIT.md:66-73` ; `build-dataset.mjs:269` ; `shell.js:506-508` | Badge « audit non signé » et compte des sources non concluantes dans l'UI |
| Règle « aucun lien externe » violée de façon **latente** : `E025.js:185-188` crée `<a href>` avec URL du dataset (550 occurrences) ; `E055`, `geography/E077` idem. DOM par défaut = 0 lien externe (mesuré) | `src/views/chronology/v2/E025.js:185-188` ; `index.html:6` ; `verify.mjs:26` (ne scanne que `index.html`) | Supprimer les `<a>` ou documenter l'exception « citation DOI » ; scanner tout `src/**/*.js` |
| Synthèses d'audit non reproductibles : 130, 5 000, 10 000 chantiers ; 14/14, 15/15, 16/16 E2E ; 189/189 Grokipedia ; validation finale non sourcée | `UNIFIED_AUDIT/SYNTHESE*.md` ; `SYNTHESE.md:126-142` | Régénérer depuis les sorties réelles (commande + horodatage + code de sortie) |

### WS C — Accessibilité et interaction

| Constat | `fichier:ligne` | Correctif |
|---|---|---|
| 3 vues sur 6 n'ont aucun `<h1>` (Constellation, Géographie, Points utilisent `<h2>`) ; ~100 panneaux de lentilles ajoutent des `<h2>` | `constellation.js:229` ; `geography.js:433` ; `points.js:33` | Promouvoir le titre de vue en `<h1>`, panneaux en `<h3>`+ |
| Cibles < 36 px : lunes 14 px, planètes 18–28 px, tags 30 px, bouton retour 30 px | `constellation.js:244,89` ; `chronology.js:54,111` ; `styles.css:355` | Zones tactiles 44 px via `::before { inset:-15px }` si le visuel doit rester petit |
| Routeur unique contourné par des dizaines d'écouteurs globaux, dont certains en capture avec `stopPropagation()` ; garde `defaultPrevented` en capture donc inefficace | `keyboard.js:125,171-177,199` ; `constellation/E001.js:73,78` ; ~26–57 écouteurs | Registre `registerScoped()`, interdire `stopPropagation` global, déplacer la garde en bulle |
| 3–5 annonces concurrentes pour une seule sélection de pays ; régions live créées avec leur texte déjà présent (non annoncé) | `shell.js:121-129,181-186` ; `keyboard.js:75-101` ; `globe.js:70-84` ; `recit.js:342-344` | Une façade `announce()` dédupliquée, ≤ 2 régions, texte affecté après insertion |
| Typographie 7–9 px sur des informations porteuses de sens (certitude, crédits, libellés de lunes) | `styles.css:59,69,91,230` ; `constellation.js:98,136` ; `recit.js:86,90` | Plancher 11 px, corps 13–14 px, titre display 24–40 px |
| Alt/légendes d'images majoritairement en anglais dans une UI `lang="fr"` | `dataset.js:218,302,386,…` ; `recit.js:261-266` | Traduire les 229 alt/captions |
| Matrice Points défilable sans `role="region"` ni nom accessible à 390 px | `styles.css:350-355` ; `points.js:34` | `role="region" tabindex="0" aria-label` |
| `aria-label` et `aria-pressed` changent ensemble sur la rotation du globe | `globe.js:359-370` | Nom constant + `aria-pressed` seul |
| Aucune assertion d'accessibilité dans E2E (ni 390×844, ni 1658 px, ni zoom 200 %, ni `prefers-reduced-motion`) | `tests/e2e.mjs` | Ajouter les assertions + `axe-core` local |

### WS D — Architecture, performance et robustesse

| Constat | `fichier:ligne` | Correctif |
|---|---|---|
| `shell.render()` vide `#app` et relance 200 enhancers à chaque `set()`, y compris l'auto-lecture toutes les 5 s | `shell.js:529-564` ; `chronology.js:540-541` ; `keyboard.js:251-263` | Séparer `renderShell`/`renderStage`/`updateSelection` ; lentilles une fois par montée de vue |
| Boucles rAF de lentilles non arrêtées à la sortie de vue (état module survivant au `innerHTML=''`) | `geography/E001.js:460-489`, `E002.js:313-340`, `E007/E008/E009`, `chronology/E009.js:212-222` | `ctx.onLeave()` / `AbortController` dans `registry.js` |
| 185 observers instanciés, 102 `.disconnect()`, 79 fichiers sans déconnexion ; `recit/E018.js:246-249` en crée un sur `document.body` à chaque rendu | `recit/E018.js:246-249` ; `constellation/E012.js:194-205` | Helper `observe()` centralisé lié au signal d'abort |
| État singleton du mode Diagnostics partagé entre 10 registres : le bouton créé au premier rendu pilote toujours la première vue ; mesuré : Chronologie passe de 170 à 720 nœuds après activation | `src/views/_diagnostics.js:5-8,39-51,81-103` ; 10 `registry.js` | `Map<viewId, state>`, bouton par vue, purge à la sortie |
| Erreurs de lentilles silencieuses hors Chronologie ; tableaux de diagnostics jamais vidés ni consommés | `registry.js:6-7,39-48` ; `chronology.js:540-541` | `diagnostics.length = 0` en tête, `VATLAS_A11Y.lensFailures()`, `console.warn` en dev |
| ~224 handlers locaux de flèches en phase bulle vs routeur global en capture → double navigation et focus perdu | `keyboard.js:199` ; `chronology/E043.js:206-232`, `E041.js:366-394` | Routeur en bulle + garde `isControl(target)` |
| 52 `document.body.appendChild` persistants sans démontage ; ids dupliqués (`e070-readout`, `e074-live`) | `chronology/E013.js:71`, `E014.js:180`, `E088.js:247,274,282` | Conteneur `#atlas-persistent` + `ctx.mountPersistent(id, factory)` |
| Globe : aucun handler `webglcontextlost/restored` ; `dispose()` ne libère ni renderer ni textures et ne réinitialise pas `state.ready` | `public/globe-engine.js:834-862` | Gestion des événements de contexte + `dispose()` complet (points positifs : DPR ≤ 1,5, pause `document.hidden`, `setAnimationLoop` avec sommeil) |
| Doublon de clés `pointFilterDomain`/`pointFilterFamily` dans l'état initial | `src/domain/store.js:48-49,56-57` | Supprimer la paire redondante + test d'unicité |
| 59 modules `E*.js` non atteignables depuis `app.js` (182 fichiers dans `chronology/`, 123 atteignables) | `chronology/index.js:1-101` ; `chronology/E001.js:5` | Script `check-imports.mjs` dans `npm run check` |
| Texture 1,28 Mo chargée sur desktop alors qu'une version 417 Ko existe ; détection `deviceMemory` absente sur iOS | `globe-engine.js:844-851,892-895` | `(pointer: coarse)` + `deviceMemory ?? 4`, précharger `globe-pick.png`, charger la 2k en tâche de fond |

### WS E — Produit, portage et identité visuelle

| Constat | `fichier:ligne` | Correctif |
|---|---|---|
| Deep links incompatibles : `#/france/1789-1799/fr-revolution` (POC) vs `#v=…&c=…&e=…` (Atlas) ; `replaceState` au lieu de `pushState` | `app.js:299,3430-3465` ; `store.js:544-664` | Adaptateur dans `parseDeepLink` + bouton de partage |
| Recherche inter-pays perdue (la question « et pendant ce temps, ailleurs ? ») | `CONCEPT.md:229-235` ; `chronology.js:179-196` ; `recit.js:296-311` | Étendre le filtre à `DATASET.countries` avec `countryId` |
| Fiche détail sans image, crédit ni licence (obligation CC BY-SA) | `shell.js:484-512` ; `chronology.js:433-438` | Ajouter `<img>` + caption + credit + license |
| Retombée 196 → 10 pays sans état « audit à venir » | `countries.js:2` ; `dataset.js:11` | Réimporter la liste avec 186 entrées `aria-disabled` |
| Bouton « Diagnostics · 50 » permanent, `position:fixed; z-index:80` par-dessus le fil d'Ariane, singleton cassé hors globe | `_diagnostics.js:8-11,20,45` ; `monde/registry.js:92,127,154` | Flag `?diagnostics=1`, instance par vue, libellé réel |
| Données de démonstration factices dans le bundle (`Rang 1 — assise`, `Colonne A/B/C`, « Exemple sous le seuil »), masquées par défaut mais accessibles via Diagnostics | `chronology/v2/E001.js:39-46`, `E047.js:74`, `E050.js:235`, `E027.js:20` | Déplacer hors du bundle de production ou préfixer `[DÉMO — non historique]` |
| Aucune capture du build audité : les 2 PNG datent du 18/11 10:05, les modules V2 du 18/11 21:58 | `screenshots/globe-*.png` ; `package.json:10-14` | Commande `capture:all` (6 vues × 1658×1150 et 390×844) + comparaison perceptuelle |
| Identité visuelle perdue : pas de hero/accueil, corps 8–9 px, Georgia/system-ui à la place de Fraunces/Newsreader, dragon et solaire disparus | `styles.css:17-18` ; `index.html:6-9` ; `shell.js:47-75` ; captures de l'archive | Réintroduire un accueil et une hiérarchie typographique ; sortir les artefacts d'audit de l'UI |
| `themes.json` est un registre d'audit jamais importé ; les lentilles codent des couleurs en dur et contournent les 18 variables de `:root` | `styles.css:2-20` ; `UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json` ; `M14.js:33-47` | Lint CSS interdisant les hex hors `:root` dans `src/views/**` |

---

## 5. P2 — dette et bruit

1. **`UNIFIED_AUDIT/README.md` corrompu** : 40 lignes parasite `# App unique : …` intercalées (lignes 1, 3, 5…). → nettoyer, garder une seule notice.
2. **511 fichiers Markdown** référencent `v1/` ou `v2/`, répertoires inexistants ; `README.md:62-65` documente `../vectemporel/data.js` au lieu de `source/data.js`. → script `doc:paths` d'existence des chemins cités.
3. **`POINT_METHODOLOGY.md.tmp`** : répertoire vide résiduel. → supprimer.
4. **Artefacts générés suivis par Git** : `COVERAGE_POINTS.md`, `POINT_REGISTRY.md`, `dataset.js`. → générer dans `report:*` et vérifier la stabilité en CI.
5. **~13 Mo d'images dupliquées** : `public/images/**` = `source/images/**` = archive `images/events/**` (hash identiques) ; 4 fichiers globe doublés racine ↔ `public/`.
6. **1 165 rapports Markdown, ~18 Mo, signal/bruit estimé ~1/10** : 229 rapports répètent « Contrat exploité », 170 « Zéro console » ; `UNIFIED_AUDIT/CHRONOLOGIE/V2/verify-v2.mjs` (contrôle textuel uniquement) n'est câblé dans aucun script npm. → intégrer dans `check`, convertir les « vérifications » en assertions Puppeteer, réduire à un index + captures.
7. **Artefacts de génération dans la prose** : `GLOBE_LAYOUT.md:45` « 第一款 carte », `POINT_METHODOLOGY.md:50` « 日期 approchée », titre `## 5.hiérarchie des écailles` ; `README.md:14` « 56 dossiers d'ères » au lieu de « 56 ères × 14 domaines ».
8. **Deux moteurs globe divergents** (archive 30 Ko vs Atlas 38,5 Ko) sans mécanisme de synchronisation ; setter `autoRotate` absent contourné par `open()/close()` (`globe.js:153-157`). → déclarer le fork Atlas source unique.
9. **Idées non réalisées à statuer** (valeur élevée) : comparaison de deux pays (`CONCEPT.md:683-685`), parcours guidés pédagogiques (`:675`), quiz et répétition espacée (`:676-677`), recherche serveur full-text (`:663-671`), URLs serveur + meta dynamiques (`:598-606`), 186 pays auditables.
10. **Phase K jamais réalisée** : 20 participants, aucune instrumentation ni protocole (`README.md:143`).

---

## 6. Points positifs vérifiés

À conserver tels quels ; ils montrent que la refonte n'est pas un travail superficiel :

- **0 erreur console / pageerror** au chargement et après 12 changements de vue (mesuré).
- **0 id dupliqué, 0 référence de source introuvable, 0 date hors ère, 0 ère chevauchante, 229/229 images présentes** avec alt/credit/license.
- **DOM stable** : 56 `<style>` / 591 règles / 1 041 nœuds (globe) avant et après 12 cycles de navigation ; pas d'accumulation CSS mesurée.
- `lang="fr"`, un seul `<main>`, skip link, piège Tab et focus restauré, garde `document.hidden` sur l'auto-lecture, DPR plafonné à 1,5, `IntersectionObserver` du globe, `prefers-reduced-motion` en CSS.
- Architecture des couches globalement respectée : les lentilles passent par `registry.js` et ne mutent pas `ctx.state`.
- Une seule affectation `innerHTML` non vide sur 1 632 modules, avec une chaîne littérale (« zéro eval », « zéro Function() » confirmés).
- Zéro appel réseau externe au chargement (mesuré) ; le seul `fetch` est local (`globe-engine.js:896`).
- Textures globe byte-identiques entre archive et Atlas ; 229 JPG byte-identiques.
- Service sous l'utilisateur `tasour` (pas de root), `WorkingDirectory` correct, `Restart=on-failure`.

---

## 7. Vagues d'implémentation suggérées (non appliquées)

| Vague | Workstreams | Fichiers touchés | Prérequis |
|---|---|---|---|
| **V0 — arrêt de l'hémorragie** | WS A (P0-1→P0-3), P0-4, P0-5 | `scripts/serve.mjs`, service systemd, `scripts/verify-points.mjs`, `scripts/merge-points.mjs` | Aucun |
| **V1 — vérité des chiffres** | WS B (P0-6→P0-9), P0-12 | `src/app.js`, `keyboard.js`, `README.md`, matrices CSV, `merge-points.mjs` | V0 |
| **V2 — utilisabilité** | WS C + P0-10, P0-11 | vues, `shell.js`, `keyboard.js`, `styles.css`, `tests/e2e.mjs` | V1 |
| **V3 — dette et identité** | WS D + WS E + P2 | `registry.js`, lentilles, `_diagnostics.js`, `globe-engine.js`, captures | V2 |

**Règle de non-collision** : chaque vague porte sur des fichiers disjoints ; aucun correctif n'a été appliqué pendant cet audit. La remédiation doit faire l'objet d'un feu vert séparé.
