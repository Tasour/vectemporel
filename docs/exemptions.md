# Exemptions vérifiables — 2026-11-20

Conformément au standard `code-military-grade`, tout invariant non prouvé est soit corrigé, soit documenté avec raison et date.

## V2-2 — Budget réseau 50 requêtes / 1 Mo — CLÔTURÉE partiellement (2026-11-20)

- **Mesure finale** : 169 requêtes / **1 019 Ko** à la première visite (PWA incluse) ; 0 octet en régime établi.
- **Correction** : lentilles chargées à la demande, gzip niveau 9, texture globe 2k en WebP (45 Ko au lieu de 407 Ko) et texture de picking WebP (63 Ko au lieu de 264 Ko), avec détection locale et repli PNG.
- **Preuve** : `test:perf` échoue au-dessus de 1 Mo à la première visite ; captures `screenshots/v2/` comparées avant/après (rendu conforme).
- **Reste partiel** : le seuil de 50 requêtes n'est pas atteint, le préchauffage du service worker représentant ~85 requêtes. Le gain aurait nécessité un découpage du dataset ou un bundling, jugés plus risqués que bénéfiques.
- **Statut** : exemption levée pour le critère de poids ; le critère de nombre de requêtes reste une limite connue et mesurée, pas une dette bloquante.

## V2-5 — Routeur clavier strictement unique — CLÔTURÉE (2026-11-20)

- **Mesure initiale** : 351 appels `addEventListener('keydown')`, 26 en capture sur `window`/`document`, 182 `stopPropagation()`.
- **Correction** : registre `keyboard.registerScoped()` / `clearScoped()` ; les 26 handlers globaux en capture ont été migrés (25 dans les lentilles + 2 cas inline), le registre est purgé à chaque rendu.
- **Preuve** : `verify.mjs` échoue s'il reste un `addEventListener('keydown', …, true)` sur `window`/`document` hors du routeur ; E2E vérifie la disponibilité du registre et les parcours clavier. Les 2 captures restantes sont sur des éléments locaux (`explorer.addEventListener`) et ne concurrent pas le routeur global.
- **Statut** : exemption retirée.
