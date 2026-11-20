# Exemptions vérifiables — 2026-11-20

Conformément au standard `code-military-grade`, tout invariant non prouvé est soit corrigé, soit documenté avec raison et date.

## V2-2 — Budget réseau 50 requêtes / 1 Mo

- **Mesuré** : 81 requêtes / 1,58 Mo en régime établi ; ~168 requêtes lors de la première visite (préchauffage PWA, 85 ressources).
- **Raison** : `dataset.js` pèse 2,5 Mo brut (400 Ko gzip), `globe-map-2k.png` 407 Ko, `globe-pick.png` 264 Ko, `three.min.js` 154 Ko gzip. Le service worker rend les visites suivantes à 0 octet transféré.
- **Ce qui a été fait** : lentilles chargées à la demande, gzip serveur, texture 2k par défaut, test `test:perf` (installation < 200 requêtes, régime établi < 64 Ko).
- **Non fait** : découpage du dataset par pays ou bundling esbuild (changements de contrat plus risqués que le gain attendu).
- **Réévaluation** : lors de la vague suivante si le budget devient bloquant.

## V2-5 — Routeur clavier strictement unique — CLÔTURÉE (2026-11-20)

- **Mesure initiale** : 351 appels `addEventListener('keydown')`, 26 en capture sur `window`/`document`, 182 `stopPropagation()`.
- **Correction** : registre `keyboard.registerScoped()` / `clearScoped()` ; les 26 handlers globaux en capture ont été migrés (25 dans les lentilles + 2 cas inline), le registre est purgé à chaque rendu.
- **Preuve** : `verify.mjs` échoue s'il reste un `addEventListener('keydown', …, true)` sur `window`/`document` hors du routeur ; E2E vérifie la disponibilité du registre et les parcours clavier. Les 2 captures restantes sont sur des éléments locaux (`explorer.addEventListener`) et ne concurrent pas le routeur global.
- **Statut** : exemption retirée.
