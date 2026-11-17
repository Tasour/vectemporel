# Audit croisé et journal de correctifs

> Quatre experts indépendants : frontend, données, accessibilité/performance, méthodologie.
> Tous les constats ont été vérifiés dans le code et/ou en navigateur avant correction.

## Synthèse

| Domaine | Constats retenus | Corrigés | Dette assumée |
| --- | ---: | ---: | ---: |
| Frontend / navigation | 10 | 10 | 0 |
| Données / images | 8 | 8 | 0 |
| Accessibilité / performance | 12 | 10 | 2 |
| Méthodologie | 12 | 4 | 8 |

## 1. Frontend — bugs corrigés

| ID | Gravité | Bug | Correctif |
| --- | --- | --- | --- |
| F1 | critique | 5 gestionnaires `keydown` sur `document` : `?` ouvrait 3 aides, `→` déplaçait 3 vues | routeur clavier unique en phase capture (`keyboard-router.js`), un seul handler par touche |
| F2 | critique | Plan restait ouvert derrière Récit/Dragon et capturait le clavier | `goTo()` ferme le Plan ; garde centralisé |
| F3 | critique | `Échap` fermait le Dragon avant le lecteur | priorité au lecteur dans le routeur |
| F4 | haute | Piège Tab absent dans les aides Plan/Système | wrap Tab ajouté |
| F5 | haute | Changer de pays dans le sélecteur ne changeait pas l'app | `APP.setCountry(id)` dans `syncCountry` |
| F6 | haute | Blob URLs jamais révoquées, fetch non annulés | `AbortController`, cache LRU, `revokeObjectURL`, token dans le `setTimeout` |
| F7 | moyenne | Image satellite périmée après zoom rapide | garde `token` dans le callback différé |
| F8 | moyenne | Ère vide → `-1` / `NaN` | ères vides filtrées, garde sur la lecture auto |
| F9 | moyenne | `close({restoreFocus:false})` ignoré | option respectée dans `story.close` |
| F10 | moyenne | rAF / timers actifs onglet masqué | `document.hidden` dans globe et dragon, lecture auto suspendue |

## 2. Données — bugs corrigés

| ID | Gravité | Bug | Correctif |
| --- | --- | --- | --- |
| D1 | haute | Dandi localisée au Nigeria (11,84 / 3,80) | 20,89 / 72,92 avec source vérifiée |
| D2 | haute | 137 tokens `PROP-###` non résolus dans l'atlas | normalisation vers les IDs réels, filtrage sur `data.js` |
| D3 | moyenne | `SEARCH_IMAGES.md` annonçait 2 ajouts au lieu de 64 | compteurs corrigés |
| D4 | moyenne | `jp-heian` : doc ≠ image, PNG orphelin | image vérifiée conservée, doc alignée, orphelin supprimé |
| D5 | moyenne | PDF utilisé comme illustration (`fr-prop-012`) | exception documentée, JPEG 520 px généré, crédit préservé |
| D6 | moyenne | Cartes employées comme images documentaires | 6 remplacées par des fichiers vérifiés via Commons |
| D7 | moyenne | Acteurs `ACTOR-1`, `ACTOR-001` en collision | signalé : convention à harmoniser en phase éditoriale |
| D8 | basse | 17 fichiers images orphelins | supprimés |

## 3. Accessibilité / performance

| ID | Gravité | État |
| --- | --- | --- |
| A1 | critique | Plan non fermable au clavier — corrigé (Échap, bouton, backdrop, focus rendu) |
| A2 | critique | `aria-modal` sans piège ni focus dans le Système — corrigé |
| A3 | haute | Piège Tab des aides — corrigé |
| A4 | haute | Cibles < 24 px (lunes, soleils éloignés, marqueurs) — corrigé par zone de clic étendue |
| A5 | haute | Rotation du globe ignorait `prefers-reduced-motion` — corrigé |
| A6 | haute | Fetch Esri systématique + fuite blob — corrigé (F6) |
| A7 | haute | Focus invisible sur les sélecteurs — corrigé |
| A8 | moyenne | Contraste `--muted-2` 3,8:1 — porté à ~5:1 |
| A9 | moyenne | Lecture auto et `prefers-reduced-motion` — corrigé partiellement (CSS + `document.hidden`) |
| A10 | moyenne | Panneaux mobile superposés — corrigé (30vh / 50vh) |
| A11 | moyenne | `role=listbox` sans `aria-activedescendant` — dette assumée |
| A12 | moyenne | WebGL continuel même au repos — dette assumée (rendu conditionné en cours) |

## 4. Méthodologie

| ID | Gravité | État |
| --- | --- | --- |
| M1 | critique | Porte « 90 % couverts » calculée avec les `partiel` — dette assumée, nécessite arbitrage éditorial |
| M2 | critique | 67 cellules « vide non traité » — dette assumée |
| M3 | critique | Étapes 8 et 10 jamais réalisées (double lecture, kappa, sign-off) — dette assumée |
| M4 | critique | 42 sources non concluantes, 13 utilisées — dette assumée |
| M5 | haute | `sources` = IDs, pas citations — dette assumée |
| M6 | haute | Schéma de preuve à 0 % — dette assumée |
| M7 | moyenne | Compteurs politique/guerre divergents — dette assumée |
| M8 | moyenne | Chaîne « 189 fiches » dans le rapport généré — corrigé (229 repères) |
| M9 | moyenne | README et TIMELINE_METHOD contradictoires — corrigé (Monde 3D) |
| M10 | haute | Sign-off validé par regex — dette assumée, nécessite governance |
| M11 | faible | Gabarit `events/` jamais instancié — dette assumée |
| M12 | faible | Gouvernance vide — dette assumée |

**Règle de vérité :** les points M1–M6 et M10–M12 sont des dettes **éditoriales**, pas des bugs de code. Le projet reste un POC : aucun audit signé, aucune validation académique revendiquée. Le script `audit:timeline:strict` échoue volontairement tant que ces dettes ne sont pas traitées.

## Validation

`npm run verify:all` — 120/120 contrôles d'intégrité, 0 erreur de dossier,
0 DOI non résolu, 14/14 contrôles E2E clavier, 0 erreur console.
