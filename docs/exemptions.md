# Exemptions vérifiables — 2026-11-20

Conformément au standard `code-military-grade`, tout invariant non prouvé est soit corrigé, soit documenté avec raison et date.

## V2-2 — Budget réseau 50 requêtes / 1 Mo — CLÔTURÉE (2026-11-20)

- **Mesure finale** : **48 requêtes / 746 Ko** à la première visite (PWA incluse) ; 0 octet en régime établi.
- **Corrections** : lentilles des vues chargées à la demande, 50 lentilles du globe réservées à `?diagnostics=1`, drapeaux chargés au survol, gzip niveau 9, textures WebP (45 Ko et 63 Ko) avec détection locale et repli PNG, préchauffage PWA limité aux 23 ressources essentielles.
- **Preuve** : `test:perf` échoue au-dessus de 50 requêtes ou 1 Mo ; captures `screenshots/v2/` comparées avant/après (rendu conforme, overlays de diagnostic disparus de la production).
- **Statut** : exemption totalement levée.

## V2-5 — Routeur clavier strictement unique — CLÔTURÉE (2026-11-20)

- **Mesure initiale** : 351 appels `addEventListener('keydown')`, 26 en capture sur `window`/`document`, 182 `stopPropagation()`.
- **Correction** : registre `keyboard.registerScoped()` / `clearScoped()` ; les 26 handlers globaux en capture ont été migrés (25 dans les lentilles + 2 cas inline), le registre est purgé à chaque rendu.
- **Preuve** : `verify.mjs` échoue s'il reste un `addEventListener('keydown', …, true)` sur `window`/`document` hors du routeur ; E2E vérifie la disponibilité du registre et les parcours clavier. Les 2 captures restantes sont sur des éléments locaux (`explorer.addEventListener`) et ne concurrent pas le routeur global.
- **Statut** : exemption retirée.
