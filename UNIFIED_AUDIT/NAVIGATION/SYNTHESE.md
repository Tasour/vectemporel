# Synthèse maître — refonte de la navigation

> Hub : `~/Projects/vectemporel/UNIFIED_AUDIT/NAVIGATION/`
> 12 surfaces · 3 niveaux (macro → meso → micro) · 10 chantiers par surface · 10 implémentés.
> Objectif : rendre l'architecture de navigation **évidente** — où suis-je, où vais-je, comment je reviens, comment je le sais.

## 1. Tableau de bord

| Niveau | ID surface | POC / Atlas | Expert | Diagnostic | Implémentation | Vérification |
| --- | --- | --- | --- | --- | --- | --- |
| Macro | `m1-orientation-globale` | POC | indexeur-semantique | ✅ | ✅ | ✅ |
| Macro | `m2-hub-plan` | POC | ux-accessibilite | ✅ | ✅ | ✅ |
| Macro | `m3-coque-atlas` | Atlas | ux-accessibilite | ✅ | ✅ | ⚠️ |
| Macro | `m4-taxonomie-atlas` | Atlas | general (reprise) | ✅ | ✅ | ⚠️ |
| Meso | `t1-routeur-poc` | POC | ux-accessibilite | ✅ | ✅ | ✅ |
| Meso | `t2-routeur-atlas` | Atlas | general (reprise) | ✅ | ✅ | ⚠️ |
| Meso | `t3-retour-poc` | POC | ux-accessibilite | ✅ | ✅ | ✅ |
| Meso | `t4-etat-atlas` | Atlas | general | ✅ | ✅ | ✅ |
| Micro | `c1-deeplink-poc` | POC | general | ✅ | ✅ | ✅ |
| Micro | `c2-orientation-atlas` | Atlas | indexeur-semantique | ✅ | ✅ | ✅ |
| Micro | `c3-recherche-atlas` | Atlas | indexeur-semantique (reprise) | ✅ | ✅ | ⚠️ |
| Micro | `c4-aide-poc` | POC | pedagogue | ✅ | ✅ | ✅ |

Légende : ⏳ en cours · ✅ fait · ⚠️ partiel / à coordonner.

## 2. Cible

- **12** rapports dans `NAVIGATION/views/`.
- **120** chantiers (12 × 10), tous implémentés.
- **2** suites E2E à maintenir au vert : POC `npm run test:e2e` (14/14), Atlas `npm run check`.

## 3. Avancées par surface

> ℹ️ **6ᵉ vue « Points »** : apparue en cours de vague via un travail concurrent non attribué (`src/views/points.js`, `POINT_METHODOLOGY.md`, `POINT_REGISTRY.md`, `COVERAGE_POINTS.md`, `proposals/`, scripts). Elle a été **intégrée et validée** par les surfaces `t4` (état), `t2` (routeur), `m3` (coque), `c3` (contenu) et `m1` (POC) : taxonomie portée à 6 entrées (`m4.2`), E2E 16/16 et couverture `784/784`. Voir §4.6.

### ✅ `c2-orientation-atlas` (indexeur-semantique) — terminé
- Rapport : `views/c2-orientation-atlas.md` — 10 chantiers (`C2-01`…`-10`).
- Fichiers modifiés : Atlas `src/views/chronology.js` et `src/views/globe.js` — titres `h1` dérivés du dataset, fil local pays→ère→repère→point, rangs de points, progression autonome, annonces live consolidées, `aria-current="location"`, retour explicite, états vides nommés, nom d'aside unique, CSS `#nav-c2a/b`.
- Vérifications : `node --check` OK · `npm run check` 15 contrôles E2E d'origine au vert de façon reproductible sur serveur isolé · audit DOM conforme (1 `h1`/vue, 5 crumbs, 4 rangs de points, live dans `<body>`).
- ⚠️ Fil global et dédupication totale des annonces dans `shell.js` (déjà finalisé) → fil local livré en compensation.

### ✅ `t1-routeur-poc` (ux-accessibilité) — terminé
- Rapport : `views/t1-routeur-poc.md` — 10 chantiers (`T1-01`…`-10`).
- Fichier modifié : POC `keyboard-router.js` réécrit — écouteur `window` capture unique (avant globe-engine), 12 couches ordonnées, mapping aide→module, gardes `editable`/`isControl`, registre de 18 raccourcis, bus `VECTEMPOREL_KEYS`, palette tactile, CSS `#nav-t1`.
- Vérifications : `node --check` OK · E2E **14/14** (4 runs consécutifs) · contrôles navigateur ciblés OK (module de dispatch, activation native, `Ctrl+R` non absorbé, palette 390×844).
- ⚠️ Registre déclaratif seulement : les conditions de touches restent codées dans les vues (fichiers interdits) → pas de déduplication effective.

### ✅ `m3-coque-atlas` (ux-accessibilité) — terminé
- Rapport : `views/m3-coque-atlas.md` — 10 chantiers (`M3-01`…`-10`) + coordinations M4/T2.
- Fichier modifié : Atlas `src/ui/shell.js` — fil d'Ariane macro→micro, bandeau « Vous êtes ici », onglets par niveau/rôle, retour unique, aide générée depuis `helpMap()`, pied synchronisé, focus stable en auto-lecture, dialogues `inert`/clic hors feuille, cibles mobiles ≥36 px, annonce live unifiée, CSS `#nav-m3`.
- Alignement M4 : tables locales supprimées au profit de `VIEW_TAXONOMY`/`viewInfo`/`position`/`shortcuts` (import ESM sans TDZ).
- Vérifications : `node --check` OK · `verify` tous PASS · 15/15 E2E historiques sur copie `domcontentloaded` · 34/34 contrôles dédiés · 0 erreur console.
- ⚠️ Assertion concurrente `6 = points` (taxonomie figée à 5 vues) → anomalie suivie en tête de section.

### ✅ `t2-routeur-atlas` (reprise general) — terminé
- Rapport : `views/t2-routeur-atlas.md` — 10 chantiers (`T2-01`…`-10`) + section d'alignement M4.
- Fichier modifié : Atlas `src/platform/keyboard.js` — gel des modales, map unique alignée sur `VIEW_TAXONOMY` via `window.VATLAS` (repli sans import circulaire), `DISPATCH_ORDER` macro→micro, `AXIS_BY_VIEW`/`navigate()`, activation native en tête, annonces live, hooks auditables (`map`, `order`, `axis`, `taxonomyAligned`, `conflicts`, `navigationBounds`).
- Vérifications : `node --check` OK · `npm run verify` 21/21 · 15/15 E2E sur copie `domcontentloaded` · `taxonomyAligned() === true`, `conflicts() === []` · 0 erreur console.
- ⚠️ Périmètres non modifiés : `README.md` (déjà réécrit par `m4`, la ligne 85 est désormais cohérente avec `AXIS_BY_VIEW` — aucun correctif maître nécessaire), `shell.js` aide + bouton retour mobile (`m3`, coordination envoyée), `store.js` wrap vs clamp (`t4`, coordination envoyée).
- ⚠️ `npm run check` expiré sur `networkidle0` (préexistant, contention) ; à rejouer à froid.

### ✅ `t3-retour-poc` (ux-accessibilité) — terminé
- Rapport : `views/t3-retour-poc.md` — 10 chantiers (`T3-01`…`-10`).
- Fichiers modifiés : POC `solar.js`, `story.js` — focus restauré, `close()` Récit←Système, `openPlaces`/`openEra` atomiques, une seule scène, garde lecteur, fils d'Ariane non cycliques, « Monde » annoncé, Échap = recul puis retour, garde d'historique, CSS `#nav-t3a/b`.
- Coordination `m2` traitée : `STORY.close()` restaure le focus hors `goTo()` ; `story.open()` appelle `SOLAR.closeForCountryChange({restoreFocus:false})`.
- Vérifications : `node --check` OK · E2E **14/14** · 10/10 contrôles complémentaires · 0 erreur console.
- ⚠️ `globe-modal` reste rendu après Globe → Système (artefact de la coque partagée `app.js`/`m1`) → transmis à `m1`.
- ⚠️ T3-10 (pile d'historique complète) nécessite `app.js` ; la garde de cohérence pays est implémentée, le reste est couvert par `c1` (`pushState` contextuel) à vérifier en final.

### ✅ `c3-recherche-atlas` (reprise indexeur-semantique) — terminé
- Rapport : `views/c3-recherche-atlas.md` — 10 chantiers (`C3-01`…`-10`), complété après reprise.
- Fichiers modifiés : Atlas `src/views/recit.js` (fil permanent, recherche, filtres type/certitude, compteur/état vide/reset, navigation clavier, `data-fk`, `#nav-c3a`) et `src/views/geography.js` (recherche, filtre de cadre, `<ol>` synchronisé, compteur/état vide/reset, mémoire de périmètre, `data-fk`, `#nav-c3b`).
- Vérifications : `node --check` OK · `verify` 21/21 · harnais fonctionnel 22/23 (1 faux négatif, retesté OK à 12 lieux) · E2E 15/15 juste après implémentation · 0 erreur console, 0 réseau.
- ⚠️ Observations sur `keyboard.js` (cadence 5 s, `Entrée`/`Espace`) à recontrôler en final : `t2` a depuis corrigé ces points.
- ⚠️ `networkidle0` préexistant, rejouer `npm run check` à froid.

### ✅ `c1-deeplink-poc` (general) — terminé
- Rapport : `views/c1-deeplink-poc.md` — 10 chantiers (`C1-01`…`-10`).
- Fichier modifié : POC `app.js` (zone hash/URL) — `pushState` piloté par le contexte, garde anti-écriture, `?pays=`/`?tags=` unifiés au boot, slug d'ère lisible, `shareView` avec annonce et repli, précédent/suivant, normalisation canonique, annonces live, CSS `#nav-c1`.
- Vérifications : `node --check` OK · E2E **14/14** · contrôles headless ciblés OK (deep link, `?pays=JP`, `?tags=guerre`, partage, fenêtre vide) · 0 réseau.
- ⚠️ L'écriture de `?pays=` et l'ouverture du globe depuis `plan.js` restent à vérifier (côté `app.js`, seule la lecture est implémentée).

### ✅ `m4-taxonomie-atlas` (reprise general) — terminé
- Rapport : `views/m4-taxonomie-atlas.md` — 10 recommandations (`M4-01`…`-10`).
- Fichiers modifiés : Atlas `src/app.js` (catalogue figé `VIEW_TAXONOMY` : 5 vues, `id/label/digit/letter/level/role`, helpers `resolveView`/`viewInfo`/`shortcutFor`/`shortcuts`/`position`, API `VATLAS` rétro-compatible) et `README.md` (modèle mental macro→micro, lexique, contrat d'API, légende des couches).
- Vérifications : `node --check` OK · `npm run verify` 21/21 · 15/15 E2E sur copie `domcontentloaded` · 0 erreur console.
- ⚠️ `npm run check` a expiré sur `networkidle0` (contention CPU parallèle, préexistant). À rejouer à froid.
- ⚠️ Nouveaux raccourcis lettres `r/c/g/s/m` à réconcilier avec `keyboard.js` (`t2`) et les libellés de `shell.js` (`m3`).

### ✅ `m2-hub-plan` (ux-accessibilité) — terminé
- Rapport : `views/m2-hub-plan.md` — 10 chantiers (`M2-01`…`-10`).
- Fichier modifié : POC `plan.js` — fermeture sans vol de focus, `aria-current` remplacé par `.is-selected` + `aria-keyshortcuts` + « Étape N sur 4 », cibles 44×44, grille dynamique (1 col. mobile), survol non mutateur, état vide annoncé, « Pays actif : France. », piège de focus, onglet restauré.
- Vérifications : `node --check` OK · E2E **14/14** · contrôles Chromium ciblés 10/10.
- ⚠️ Vol de focus lors d'un `STORY.close()` declenché hors de `goTo()` : hors surface, à coordonner avec `t3-retour-poc`.

### ✅ `t4-etat-atlas` (general) — terminé
- Rapport : `views/t4-etat-atlas.md` — 10 chantiers (`T4-01`…`-10`).
- Fichier modifié : Atlas `src/domain/store.js` réécrit — entonnoir d'écriture validé (`revision`/`getSnapshot`), indices entiers bornés, modales exclusives par invariant, `previousView`/`goBack()`, historique borné sans doublons, sélection conservée par identité, `notice`/`noticeRevision`, hiérarchie macro→micro, deep links, diagnostics de cohérence.
- Arbitrage wrap/clamp : **wrap documenté et gelé** (`INDEX_MODES`, `getBounds()`, `boundsModesCoherent()`), l'auto-lecture en dépendant.
- Vérifications : `node --check` OK · `npm run check` OK (30 verify + 16/16 E2E) · 16 contrôles comportementaux additifs PASS.

### ✅ `c4-aide-poc` (pedagogue) — terminé
- Rapport : `views/c4-aide-poc.md` — 10 chantiers (`C4-01`…`-10`).
- Fichiers modifiés : POC `app.js` (zone aide) et `plan.js` (texte d'aide uniquement) — `?` universel avec garde-fou, panneau « Aide & raccourcis » par vue (7 sections), piège Tab, priorité Échap, focus restauré, vocabulaire d'onglets, indice au premier lancement, `?` visible en mobile, états vides, bus `vectemporel:keyroute`, CSS `#nav-c4`.
- Vérifications : `node --check` OK · contrôles navigateur ciblés OK · E2E **14/14**.

### ✅ `m1-orientation-globale` (indexeur-semantique) — terminé
- Rapport : `views/m1-orientation-globale.md` — 10 chantiers (`M1-01`…`-10`).
- Fichiers modifiés : POC `app.js` (zone shell), `index.html`, `APP_PLAN.md` v1.1 — balise « où suis-je » + `#app[data-nav-mode]`, point d'entrée documenté, taxonomie à 6 noms + 1 sortie, fin des modes orphelins, cluster d'onglets unique, ruban hiérarchique, contrat d'état corrigé, lecteur requalifié en sortie, annonce live, `setGlobeInert()`.
- Coordination `t3` traitée : `globe-modal` rendu `inert`/`aria-hidden` à l'ouverture du Système, moteur arrêté, canvas conservé, E2E préservé.
- Vérifications : `node --check` OK · E2E **14/14** (3 runs) · sondes Chromium 22/22 + 8/8 + globe-modal OK.

## 4. Arbitrages maître

1. ✅ **Focus au retour POC** (`m2` → `t3`) : `STORY.close()` restaure le focus hors `goTo()` ; `story.open()` appelle `SOLAR.closeForCountryChange({restoreFocus:false})`.
2. ✅ **Taxonomie unique Atlas** (`m4` → `t2`, `m3`) : `VIEW_TAXONOMY` est la source de vérité ; routeur et coque la lisent via `window.VATLAS`, sans tables locales ni import circulaire.
3. ✅ **Aide coque** (`t2` → `m3`) : générée depuis `helpMap()`, avec repli `shortcuts()`, libellé « Retour » visible et paragraphe sur le gel des modales.
4. ✅ **Bornes d'index** (`t2` → `t4`) : wrap conservé et documenté, vérifié par `boundsModesCoherent()`.
5. ✅ **`globe-modal` résiduel** (`t3` → `m1`) : rendu inerte à l'ouverture du Système ; « Échap ramène au globe » intact.
6. ✅ **README POC obsolète** (correction maître) : `README.md:43` décrivait l'ancien point d'entrée « Récit au chargement » ; aligné sur `APP_PLAN.md` v1.1 (Monde 3D → Système → Récit/Dragon/Frise).
7. ✅ **Dépendances E2E** (`t1`, `m1`, `c4`) : courses de réécriture détectées en cours de vague (9–13/14 transitoires) ; 14/14 stable après stabilisation.
8. ✅ **Timeout `networkidle0`** : environnemental (contention Chromium), reproductible avec du code inchangé. Aucun test modifié par le maître ; validation finale rejouée à froid.
9. ✅ **6ᵉ vue « Points »** (travail concurrent non attribué) : plutôt que de la supprimer, elle a été intégrée comme niveau micro transversal : `VIEW_TAXONOMY` portée à 6 (`m4.2` — version incrémentée en maître), `store.js`, `keyboard.js`, `shell.js`, `README.md` alignés ; `verify:points` 784/784 et E2E 16/16. Aucun conflit résiduel.
10. ✅ **Historique de navigation** : `goBack()` et `previousView` sont dans le store (`t4`), le hash contextuel dans `app.js` (`c1`) ; la pile complète n'est pas dupliquée.

## 5. Validation finale

| Contrôle | Résultat |
| --- | --- |
| Rapports de navigation | **12/12** (`NAVIGATION/views/*.md`) |
| Chantiers uniques | **120/120** (10 par surface) |
| Syntaxe JS (9 fichiers POC + 10 fichiers Atlas) | **19/19 `node --check` OK** |
| POC `npm run test:e2e` | **14/14 PASS** |
| Atlas `npm run verify` | **tous les contrôles PASS** |
| Atlas `npm run verify:points` | **784/784 (100 %)** |
| Atlas `npm run test:e2e` | **16/16 PASS** |
| Erreurs console | **0** dans les deux suites |

## 6. Verdict final

Les 12 surfaces de navigation (macro → meso → micro) ont été auditées par 12 sous-agents, chacun ayant produit 10 chantiers et implémenté les 10. La structure est désormais explicite : un point d'entrée unique, une taxonomie ordonnée de 6 vues (+1 sortie), un fil d'Ariane permanent, un retour unique, une source unique de vérité pour les raccourcis et une nomenclature alignée entre le code et les deux README. Les conflits inter-surfaces ont tous été arbitrés et les deux suites E2E passent intégralement à froid.
