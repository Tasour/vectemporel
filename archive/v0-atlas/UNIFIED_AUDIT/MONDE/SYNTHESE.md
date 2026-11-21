# Synthèse maître — vague Monde (50 lentilles)

> Hub : `~/Projects/vectemporel-atlas/UNIFIED_AUDIT/MONDE/`
> 50 lentilles · 10 chantiers chacune · 500 chantiers cibles.

## Tableau de bord

| Domaine | IDs | État |
| --- | --- | --- |
| A. Rendu & moteur | M01–M10 | ✅ |
| B. Drapeau & révélation | M11–M20 | ✅ |
| C. Ergonomie & interaction | M21–M30 | ✅ |
| D. Données & sémantique | M31–M40 | ✅ |
| E. Qualité & validation | M41–M50 | ✅ |

## Comptage

- Rapports attendus : **50** (`views/Mxx-*.md`).
- Modules attendus : **50** (`src/views/monde/Mxx.js`).
- Chantiers : **500** (10 × 50).

## Retours groupés (lot 2)

| Lentille | Livrable | Point saillant |
| --- | --- | --- |
| M01 | module + `views/M01-ombres-eclairage.md` | Terminateur 72/28, ombre portée alpha, azimut borné ±25° |
| M12 | module + `views/M12-drapeaux-locaux.md` | Sonde code↔palette↔SVG, repli coloré, préchauffage des 10 SVG |
| M22 | module + `views/M22.md` | Lien d'évitement, roving tabindex normalisé, ordinal dans l'aria-label |
| M25 | module + `views/M25.md` | Flèches observées, zéro `keydown`, rail de pips, équivalents pointeur |
| M29 | module + `views/M29.md` | 7 media queries, zones sûres, cartes 54 px, `forced-colors` |
| M30 | module + `views/M30.md` | 9 états vides dérivés du DOM, priorité déterministe, `MutationObserver` unique |
| M34 | module + `views/M34.md` | Ères/repères en panneau, références non navigantes (`data-chrono-anchor`) |
| M36 | module + `views/M36.md` | Provenance locale, dette 587/901, sources orphelines (SRC-002 Espagne) |
| M38 | module + `views/M38.md` | Deep link local, copie avec repli focalisé, annonce d'arrivée |
| M42 | module + `views/M42.md` | Contraste 1,18:1 → 14,69:1, `prefers-contrast`/`forced-colors` |
| M44 | module + `views/M44.md` | `t0` unique, PerformanceObserver, latence survol plafonnée 45 ms |
| M46 | module + `views/M46.md` | 10 contrôles DOM déterministes, signature stable, rapport sr-only |
| M48 | module + `views/M48.md` | Aide affichable + lexique public ; a signalé `1–5` figé → **corrigé en maître** (`1–6 / r c g s m p`) |
| M49 | module + `views/M49.md` | Sentinelle passive, 10 contrôles en lecture seule |

## Arbitrages maître

### ✅ `M07` — boucle rAF et pause (terminé)
- Module `M07.js` + rapport `views/M07-raf-pause.md`.
- 10 chantiers : capture moteur via `onReady`, zéro rAF/timer propre, `visibilitychange` unique, miroir `data-m07-raf-phase`, reprise sans saut, pas de second `IntersectionObserver`, condition `data-globe-active`, arrêt au repos, mesure `getInfo().calls`.
- `node --check` OK. Aucune suite lancée par la lentille (volontaire).

### ✅ `M20` — annonces live (terminé)
- Module `M20.js` + rapport `views/M20.md`.
- Diagnostic : le survol clavier annonce via `say()`, le survol pointeur était muet. Comble ce vide avec l'unique région `#globe-live`, callbacks enregistrés une fois, dédup par code, annonce synchrone, silence sur `document.hidden`, miroirs `data-m20-*`, robustesse aux payloads partiels.

### ✅ `M08` — IntersectionObserver (terminé)
- Module `M08.js` + rapport `views/M08-intersectionobserver.md`.
- Témoin DOM `data-m08-*`, multi-seuils + hystérésis, `document.hidden` mesuré, antirebond d'une frame, réveil via `invalidate()`, accès défensif, `MutationObserver` sur `data-globe-active`, pas de réveil en mouvement réduit, région dédiée throttlée, `WeakMap` anti-doublons.

### ✅ `M05` — zoom et bornes (terminé)
- Module `M05.js` + rapport `views/M05-zoom-bornes.md`.
- Modèle d'ombre du zoom, annonce de borne throttlée, boutons désactivés aux bornes, badge de pourcentage, raccourcis `+`/`−`/PgUp/PgDn, normalisation `deltaMode`, suivi du pincement, bouton de réinitialisation, consigne visible, robustesse multi-rendus.

### ✅ `M16` — page dans le contour (terminé)
- Module `M16.js` + rapport `views/M16-page-contour.md`.
- Greffe de `ctx.reveal.reveal` + `MutationObserver` unique sur `.gr-page` : titre aligné sur le `h1` d'arrivée, pluriels français, noms/ères/repères/points issus du `DATASET`, movement réduit respecté, `aria-hidden`, anti-boucle.

### ✅ `M13` — survol clavier (terminé)
- Module `M13.js` + rapport `views/M13-survol-clavier.md`.
- Région live dédiée, miroir sr-only du drapeau, description stable, `focusin`/`focusout` délégués, Échap annule l'aperçu, source clavier déduite de `activeElement`, mouvement réduit, idempotence. ⚠️ A signalé `notifyMondeLeave()` absent du `ctx` → **ajouté en maître** au registre.

### ✅ `M10` — mouvement réduit (terminé)
- Module `M10.js` + rapport `views/M10-mouvement-reduit.md`.
- `matchMedia` live, écouteur `change` persistant, `aria-pressed` véridique, SVG DPR-indépendant, zoom 5 paliers, annonce post-render, CSS `!important`, 4 canaux + `figcaption`, fail-safe `reduce = true`.

### ✅ `M02` — textures du globe (terminé)
- Module `M02.js` + rapport `views/M02-textures-globe.md`.
- Resource Timing, repli 2k, latences, critère 4k, framebuffer vs carte 8,39 Mpx, alpha, mipmaps, compteur de textures, filtres, tableau accessible.

### ✅ `M14` — survol au pointeur (terminé)
- Module `M14.js` + rapport `views/M14-survol-pointeur.md`.
- Coalescence rAF, séquence monotone anti-stale, dédup par code, suspension pendant révélation, position bornée au viewport, HUD `aria-hidden`, idempotence multi-rendus, masque unique en cache, mouvement réduit, nettoyage `leave`/`onReady`.
- ⚠️ A signalé l'accumulation des callbacks du registre → **corrigée en maître** (`registry.js` : purge des tableaux à chaque `runMondeEnhancements`).

### ✅ `M15` — animation de zoom (terminé)
- Module `M15.js` + rapport `views/M15-animation-zoom.md`.
- Durée bornée 620 ms, easing décéléré, `scale(6)`, couche compositée, `will-change` cyclé, annulation par jeton, wrappers `reveal/hover/leave`, mouvement réduit 1 ms, gardes d'idempotence.

### ✅ `M06` — DPR et budget pixels (terminé)
- Module `M06.js` + rapport `views/M06-dpr-budget.md`.
- Panneau `#monde-m06-budget`, badge de budget 2,2 Mpx, sonde DPR réarmée, scheduler rAF unique, plancher DPR, cohérence picking, draw calls, mémoire GPU, repli sans WebGL, zéro boucle continue.

### ✅ `M09` — contexte WebGL (terminé)
- Module `M09.js` + rapport `views/M09-contexte-webgl.md`.
- Écouteurs `webglcontextlost/restored`, `preventDefault()` sans `stopPropagation`, badge live 5 états, `close()`/`open()` conditionné, réapplication `setSelected`, garde anti-rafale 180 ms, attributs `data-m09-*`, CSS mouvement réduit, `syncCanvas()` anti-fuite.

## Arbitrages maître (correctifs appliqués)

1. ✅ **Registre** : purge de `readyCallbacks`/`hoverCallbacks`/`leaveCallbacks` à chaque `runMondeEnhancements` (signalé par M14/M34/M47).
2. ✅ **Contrat `ctx`** : ajout de `notifyMondeHover`, `notifyMondeLeave`, `flushMondeReady` (signalé par M13).
3. ✅ **`NAV_SHORTCUTS`** : `1–5 / r c g s m` → `1–6 / r c g s m p` (signalé par M48).
4. ✅ **M12** : appel `css(STYLE_ID, …)` sans `ctx` → `ctx.css(...)` (erreur runtime `css is not defined`).
5. ✅ **M38 / M48** : panneaux déplacés de `.globe-list` vers `.globe-view` (le compte E2E `.globe-list button === 10` était passé à 12).
6. ✅ **M30** : `MutationObserver` en boucle (`childList`/`subtree` sur la scène, le panneau s'auto-redéclenchait) → déconnexion pendant l'écriture + reconnexion en microtâche. C'était la cause du blocage du clic E2E.
7. ✅ **M35** : lentille initialement refusée par son agent (rôle Noeta) → relancée avec un agent généraliste.
8. ⚠️ **Dettes documentées non bloquantes** : moteur `globe-engine.js` hors `ctx` (M09/M44), palette de picking figée à 10 codes (M11/M03), `id: "uk"` vs `code: "GB"` (M32), vocabulaires de confiance hétérogènes (M31/M37), multiplicité des régions live (M41).

## Validation finale

| Contrôle | Résultat |
| --- | --- |
| Modules de lentilles | **50/50** implémentés, `node --check` OK |
| Rapports de lentilles | **50/50** (`views/Mxx*.md`) |
| Chantiers | **500** (10 × 50) |
| `window.VATLAS.mondeDiagnostics()` | **50 entrées, 0 erreur runtime** |
| DOM `.globe-list button` | **10** (contrat E2E préservé) |
| `npm run verify` | tous PASS |
| `npm run verify:points` | **784/784 (100 %)** |
| `npm run test:e2e` | **16/16 PASS** |
| Effet drapeau/zoom | survol + masque + flag FR + transition « Chronologie · France » OK |
| Erreurs console | **0** |

### ✅ Nettoyage visuel final (arbitrage maître)
- Constat capture à l'appui : les 50 panneaux de diagnostic s'affichaient tous dans `.globe-scene` et se superposaient.
- Correctif dans `registry.js` : marquage `data-monde-diagnostic` des panneaux de premier niveau (y compris ceux attachés au host), masqués par défaut ; bouton **« Diagnostics · 50 »** qui regroupe les panneaux dans un tiroir défilant (`aria-pressed`), avec restauration à leur parent d'origine à la fermeture.
- Interface par défaut conservée : globe, HUD, commandes de zoom, légende de survol (M17), raccourcis clavier, recherche/filtre, liste des 10 pays, aide contextuelle.
- M17 : légende remontée (`bottom:125px`) pour ne plus chevaucher les annonces de zoom M05.
- Vérifié : 8 enfants visibles dans la scène (au lieu de 33), tiroir 50 panneaux + titre, 10 boutons dans `.globe-list`, E2E 16/16, effet de révélation intact.

## Verdict final

Les 50 lentilles ont été livrées par 50 sous-agents, chacune avec 10 chantiers implémentés dans son module dédié. Le registre `src/views/monde/registry.js` les applique sans toucher aux fichiers partagés. Les conflits détectés (callbacks cumulés, boutons surnuméraires, variable `css` non définie, boucle `MutationObserver`) ont été corrigés par l'agent maître. Les deux suites et l'effet de révélation passent intégralement à froid.
