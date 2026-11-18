# Synthèse maître — audit unifié Vectemporel (V1 + Atlas)

> Hub : `~/Projects/vectemporel-atlas/UNIFIED_AUDIT/`
> 13 vues · 13 sous-agents experts · 10 chantiers par vue · 10 chantiers implémentés par vue.
> Mis à jour par l'agent maître au fil des retours de sous-agents.

## 1. Tableau de bord

| # | ID vue | Version | Expert | Diagnostic | Implémentation | Vérification |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `v1-monde-3d` | V1 | ux-accessibilite | ✅ | ✅ | ✅ |
| 2 | `v1-systeme-solaire` | V1 | ux-accessibilite | ✅ | ✅ | ✅ |
| 3 | `v1-recit` | V1 | pedagogue | ✅ | ✅ | ✅ |
| 4 | `v1-dragon` | V1 | ux-accessibilite | ✅ | ✅ | ✅ |
| 5 | `v1-frise` | V1 | indexeur-semantique | ✅ | ✅ | ✅ |
| 6 | `v1-fiche-detaillee` | V1 | general | ✅ | ✅ | ✅ |
| 7 | `v1-lecteur` | V1 | pedagogue | ✅ | ✅ | ✅ |
| 8 | `atlas-globe` | Atlas | ux-accessibilite | ✅ | ✅ | ✅ |
| 9 | `atlas-chronologie` | Atlas | indexeur-semantique | ✅ | ✅ | ✅ |
| 10 | `atlas-recit` | Atlas | pedagogue | ✅ | ✅ | ✅ |
| 11 | `atlas-geographie` | Atlas | indexeur-semantique | ✅ | ✅ | ✅ |
| 12 | `atlas-constellation` | Atlas | general | ✅ | ✅ | ✅ |
| 13 | `atlas-coque-navigation` | Atlas | ux-accessibilite | ✅ | ✅ | ✅ |

Légende : ⏳ en cours · ✅ fait · ⚠️ partiel / bloqué.

## 2. Comptage cible

- **13** rapports de diagnostic attendus dans `views/`.
- **130** chantiers au total (13 × 10), tous à implémenter.
- **2** codes de vérification : V1 `npm run test:e2e`, Atlas `npm run check`.

## 3. Avancées par vue

> Les `⚠️` ci-dessous sont des observations **intermédiaires** relevées au moment de chaque livraison. Elles ont été arbitrées et corrigées en §4 ; la validation finale est en §5.

### ✅ `atlas-coque-navigation` (ux-accessibilité) — terminé
- Rapport : `views/atlas-coque-navigation.md` — 10 chantiers (`ATLAS-COQUE-01`…`-10`) + 3 coordinations intégrées.
- Fichiers modifiés : `v2/src/ui/shell.js`, `v2/src/domain/store.js`, `v2/src/platform/keyboard.js`.
- Shell réécrit (CSS injecté, skip link, `<main>`, dialogues `aria-modal` + `inert` + piège Tab, pied view-aware, focus restauré, live, `VATLAS_A11Y`) ; store (helpOpen, autoplayMs, bornage, actions centralisées) ; clavier (garde `isControl`, timer relançable, `↓` = ère suivante, un seul listener).
- Coordinations traitées : cadence configurable (recit), `Entrée`/`Espace` natifs + overflow 3 px (geographie), `↑/↓` alignés sur `README.md:67` (chronologie).
- Vérifications : `node --check` OK · `npm run verify` OK (routeur clavier unique = 1) · 15/15 E2E sur copie `domcontentloaded` · 0 erreur console.
- ⚠️ Phrase obsolète dans `chronology.js` sur l'ancien mapping `↓` → à corriger par l'agent maître.

### ✅ `atlas-constellation` (general) — terminé
- Rapport : `views/atlas-constellation.md` — 10 chantiers (`ATLAS-CONSTELL-01`…`-10`).
- Fichier modifié : `v2/src/views/constellation.js` (lunes des points, note figée/décorative, connecteurs `aria-hidden`, soleils répartis, étiquettes visibles, sémantique ARIA, focus restauré, états vides, traçabilité hors ligne, `Map` d'index).
- Vérifications : `node --check` OK · `npm run verify` 21/21 · parcours navigateur 32 PASS / 0 FAIL · 0 requête externe.
- ⚠️ `npm run check` a expiré sur `networkidle0` (préexistant, contention CPU parallèle) ; le sous-agent `atlas-globe` a obtenu `npm run check` PASS complet une fois la contention retombée. À rejouer en final.

### ✅ `atlas-globe` (ux-accessibilité) — terminé
- Rapport : `views/atlas-globe.md` — 10 chantiers (`ATLAS-GLOBE-01`…`-10`).
- Fichier modifié : `v2/src/views/globe.js` (arrêt rAF hors vue, substitut sémantique du canvas, pilotage clavier, `aria-current`, cibles 44 px, focus restauré, mouvement réduit, retour textuel du survol, cohérence `state.countryId`, zoom tactile/mobile).
- Vérifications : `node --check` OK · `npm run verify` 21 PASS · `npm run test:e2e` 15 PASS · **`npm run check` PASS complet** · 31 tests complémentaires PASS.
- ⚠️ Chantier 06 partiel : `public/globe-engine.js` (non possédé) n'expose pas de setter `autoRotate` → contourné par `open()`/`close()`.
- ℹ️ Les timeouts `networkidle0` précédents étaient une contention CPU due aux tests parallèles, pas un défaut de code.

### ✅ `v1-monde-3d` (ux-accessibilité) — terminé
- Rapport : `views/v1-monde-3d.md` — 10 chantiers (`V1-MONDE-01`…`-10`).
- Fichiers modifiés : `v1/globe-engine.js`, `v1/plan.js` — clavier picking du centre + live, repaint sur survol (`needsRender`), navigation 2D du Plan, rAF annulable 0 frame au repos, deep link `?pays=XX`, zoom 44 px, context loss, mouvement réduit, DPR/budget 2,2 Mpx.
- Vérifications : `node --check` OK · sonde Chromium 11/11 PASS (dont 0 frame/700 ms, WebGL loss/restore, exclusion Plan ↔ Globe) · E2E copie isolée 6/14, échecs post-Système liés à la réécriture concurrente de `solar.js`.
- ⚠️ Conflit transmis à `v1-systeme-solaire` : `solar.js:917` appelle `openGlobe()` dans `close()` → double overlay `is-open` lors d'un changement de pays (cause de l'échec « Échap ramène au globe »).

### ✅ `v1-recit` (pedagogue) — terminé
- Rapport : `views/v1-recit.md` — 10 chantiers (`V1-RECIT-01`…`-10`).
- Fichiers modifiés : `v1/story.js`, `v1/satellite-map.js` — rythme adaptatif + barre + pause, segmentation sûre des `av. J.-C.`, rail ordinal des ères, état vide explicite, focus préservé, radiogroup de périmètre, fil rouge, mobile, `selfCheck()` ; légende ordonnée « année · lieu » et marqueurs numérotés côté carte.
- Vérifications : `node --check` OK · `selfCheck()` 10/10 en Chromium · E2E 12/14.
- ⚠️ Écart E2E « Flèche droite change de lieu » : le scénario ouvre le Récit sur une ère sans lieu lié ; l'état vide explicite (APP_PLAN §9/§12) remplace volontairement l'ancien repli silencieux. Décision maître à trancher : adapter le scénario de test ou la donnée de départ.
- ℹ️ Erreur transitoire `injectCss is not defined` (dragon.js) vérifiée corrigée (`injectCss()` défini en 205, appelé en 1697).

### ✅ `v1-dragon` (ux-accessibilité) — terminé
- Rapport : `views/v1-dragon.md` — 10 chantiers (`V1-DRAGON-01`…`-10`).
- Fichier modifié : `v1/dragon.js` — rAF unique + `visibilitychange`, `IntersectionObserver`/`MutationObserver`, DPR borné, pool de 15 écailles, focus/`aria-current`, live dédié, légendes non inventées, mouvement réduit, zoom/pan borné, cibles 24–44 px, état vide.
- Vérifications : `node --check` OK · sondes Puppeteer OK (15 tuiles, recyclage, focus sur 12 pas, DPR 1,6, mobile 390×844) · 0 erreur console.
- ⚠️ E2E 6/14 préexistant et hors vue : `Entrée` n'ouvre pas le lecteur, focus resté sur `world-btn` → à remonter aux vues `v1-systeme-solaire` / clavier V1.

### ✅ `v1-fiche-detaillee` (general) — terminé
- Rapport : `views/v1-fiche-detaillee.md` — 10 chantiers (`V1-FICHE-01`…`-10`).
- Fichier modifié : `v1/app.js` (zone fiche uniquement) — `buildFicheHeader()` (image légendée + crédits, résumé, listes Figures/Lieux, CTA), `aria-busy`/live, focus restauré, piège robuste, flèches sur repères liés, mobile 44 px.
- Vérifications : `node --check` OK · navigateur 1440×900 et 390×844 OK, 0 erreur console.
- ⚠️ Observation hors zone : `#globe-overlay` parfois laissé ouvert après sélection d'un pays (branche globe de `onGlobalKeydown`) — à examiner en validation finale.

### ✅ `v1-frise` (indexeur-semantique) — terminé
- Rapport : `views/v1-frise.md` — 10 chantiers (`V1-FRISE-01`…`-10`).
- Fichier modifié : `v1/app.js` (zone frise) — créneaux pastilles/cibles 18 px, `aria-describedby`/`aria-current`, live, raccourcis zoom, mini-carte slider, `--tag-text` calculé, recherche multi-pays, deep links `?tags=`, état vide.
- Vérifications : `node --check` OK · test de fumée Puppeteer frise 12/12, 0 erreur console imputable.
- ⚠️ E2E global 6/14 : échecs dans lecteur/récit/globe (zones d'autres agents), aucun dans la frise.

### ✅ `v1-lecteur` (pedagogue) — terminé
- Rapport : `views/v1-lecteur.md` — 10 chantiers (`V1-LECTEUR-01`…`-10`).
- Fichiers modifiés : `v1/app.js` (zone lecteur/recherche uniquement), `v1/server.mjs`, `v1/UNIFIED_AUDIT/views/v1-lecteur.md`.
- 12 helpers ajoutés : CSS injecté, provenance datée/licence, avertissement de traduction, sommaire, progression, tableaux défilables, annonces live, `lang="en"`, confidentialité (`credentials:'omit'`, `referrerPolicy`, en-tête d'API), cache `refresh=1`.
- Vérifications : `node --check` OK (app.js + server.mjs) · `npm run verify` OK (189/189 Grokipedia) · Puppeteer ciblé OK, 0 erreur applicative.
- ⚠️ E2E V1 6/14 : échecs **avant** l'entrée dans le lecteur (chaîne clavier/solar.js modifiée concurrentiellement) → à rejouer après stabilisation. `E2E_REPORT.md` régénéré par le script (artefact).

### ✅ `atlas-chronologie` (indexeur-semantique) — terminé
- Rapport : `views/atlas-chronologie.md` — 10 chantiers (`ATLAS-CHRONO-01`…`-10`).
- Fichier modifié : `v2/src/views/chronology.js` (titres sémantiques, bandes d'ères `aria-current`, liste `<ol>`, focus restauré, recherche locale sur 229 repères/901 points, sources titrées sans `href`, états vides, compteurs, CSS injecté).
- Vérifications : `node --check` OK · `npm run verify` OK · harnais de substitution 14/14 E2E + 14/14 chantiers · 0 ancre dupliquée.
- ⚠️ Asymétrie `↑`/`↓` du routeur (`keyboard.js`) vs `README.md:67` — dépendance coque.

### ✅ `atlas-geographie` (indexeur-semantique) — terminé
- Rapport : `views/atlas-geographie.md` — 10 chantiers (`ATLAS-GEO-01`…`-10`).
- Fichier modifié : `v2/src/views/geography.js` (réécriture : `project()` robuste, contour filtré, chemin chronologique trié, marqueurs accessibles roving tabindex, légende SVG, zoom clavier, CSS injecté).
- Vérifications : `node --check` OK · `npm run verify` 21/21 · test isolé via `window.VATLAS` tout passe · 0 requête externe, 0 `NaN`.
- ⚠️ E2E `networkidle0` timeout préexistant (reproduit avec le code d'origine), hors module.

### ✅ `atlas-recit` (pedagogue) — terminé
- Rapport : `views/atlas-recit.md` — 10 chantiers (`ATLAS-RECIT-01`…`-10`).
- Fichier modifié : `vectemporel-atlas/src/views/recit.js` (réécriture : CSS injecté, région live, fil narratif, progression, bornes, garde clavier, gloses certitude/type, traçabilité `<details>`).
- Vérifications : `node --check` OK · `npm run verify` 21/21 · harness Puppeteer 15/15 · 0 lien externe, 1 seul `.recit-title`.
- ⚠️ **Partiel** : cadence d'auto-lecture fixe à 5 s dans `keyboard.js:83` (vue `atlas-coque-navigation`) — dépendance inter-vues.

## 4. Arbitages maître — résolus

1. ✅ **Cadence de lecture Atlas** (`atlas-recit` → coque) : `autoplayMs` / `DEFAULT_AUTOPLAY_MS = 5000` placés dans le store, timer relançable à chaud dans `keyboard.js`.
2. ✅ **`Entrée`/`Espace` Atlas** (`atlas-geographie` → coque) : garde `isControl()` dans `keyboard.js` ; activation native des marqueurs préservée.
3. ✅ **Débordement mobile Atlas** : `.shell-tab` corrigé (53 × 36 px, `scrollWidth === innerWidth` à 390 px).
4. ✅ **`↑`/`↓` Atlas** : arbitrés en faveur de `README.md:67` (`↓` = ère suivante) ; indice obsolète corrigé dans `v2/src/views/chronology.js:120` et vérifié par `node --check`.
5. ✅ **Double overlay V1** : `solar.js:917` n'appelle plus `openGlobe()` dans `close()` ; seul `returnToGlobe()` (×, fond, onglet Monde, `Échap`, fil d'Ariane, `↑` racine) rouvre le globe, avec `countryEpoch` et garde différée. Vérifié par harnais de coordination 3/3.
6. ✅ **Priorité des modales V1** (correction maître) : `app.js` — la branche `state.globeOpen` de `onGlobalKeydown()` ne s'exécute plus quand le lecteur, la recherche ou « Le concept » est ouvert. `Échap` ferme d'abord la modale, puis le globe. **Les deux écarts E2E disparaissent** : plus besoin de modifier `scripts/e2e-keyboard.mjs`.
7. ✅ **Timeouts `networkidle0`** : contention CPU des tests parallèles, reproductibles avec le code d'origine. Aucun fichier de test modifié ; validation finale rejouée à froid : V1 `npm run test:e2e` **14/14**, Atlas `npm run check` **tous PASS**.
8. ✅ **Dette `globe-engine.js` Atlas** : le moteur non possédé n'expose pas de setter `autoRotate` ; la vue `atlas-globe` contourne par `open()`/`close()` avec une frame statique en mouvement réduit. Dette technique documentée, non bloquante.
9. ⚠️ **Propriété de `playing` (décision de conception)** : `APP_PLAN.md:97` attribue `playing` au Récit. Une visite guidée démarrée dans le Système doit donc céder la main au Récit sur le repère sélectionné, sans survie du timer. À trancher si le comportement inverse est souhaité ; aucun changement appliqué.

## 5. Validation finale

| Contrôle | Résultat |
| --- | --- |
| Rapports de diagnostic | **13/13** (`UNIFIED_AUDIT/views/*.md`) |
| Chantiers uniques | **130/130** (10 par vue, vérifié par comptage) |
| Syntaxe JS (8 fichiers V1 + 8 fichiers Atlas) | **16/16 `node --check` OK** |
| V1 `npm run test:e2e` | **14/14 PASS** |
| V1 `npm run verify` | **189/189 pages Grokipedia valides** |
| Atlas `npm run check` (`verify` + `test:e2e`) | **tous les contrôles PASS** (21 verify + 15 E2E) |
| Erreurs console | **0** dans les deux suites |

## 6. Verdict final

Les 13 vues de l'app unifiée Vectemporel (V1 + Atlas) ont été auditées par 13 sous-agents experts, chacun ayant produit 10 chantiers et implémenté les 10. Les conflits inter-vues détectés en cours de route (double overlay, priorité `Échap`, cadence de lecture, interception clavier, asymétrie des flèches, débordement mobile) ont été arbitrés et corrigés par l'agent maître. Les deux suites E2E et les contrôles de cohérence passent intégralement à froid.

Dettes restantes, non bloquantes : setter `autoRotate` absent du moteur globe Atlas, et la question de la propriété de `playing` entre Système et Récit (point 4.9).
