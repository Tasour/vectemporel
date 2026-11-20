# Exemptions vérifiables — 2026-11-20

Conformément au standard `code-military-grade`, tout invariant non prouvé est soit corrigé, soit documenté avec raison et date.

## V2-2 — Budget réseau 50 requêtes / 1 Mo

- **Mesuré** : 81 requêtes / 1,58 Mo en régime établi ; ~168 requêtes lors de la première visite (préchauffage PWA, 85 ressources).
- **Raison** : `dataset.js` pèse 2,5 Mo brut (400 Ko gzip), `globe-map-2k.png` 407 Ko, `globe-pick.png` 264 Ko, `three.min.js` 154 Ko gzip. Le service worker rend les visites suivantes à 0 octet transféré.
- **Ce qui a été fait** : lentilles chargées à la demande, gzip serveur, texture 2k par défaut, test `test:perf` (installation < 200 requêtes, régime établi < 64 Ko).
- **Non fait** : découpage du dataset par pays ou bundling esbuild (changements de contrat plus risqués que le gain attendu).
- **Réévaluation** : lors de la vague suivante si le budget devient bloquant.

## V2-5 — Routeur clavier strictement unique

- **Mesuré** : 351 appels `addEventListener('keydown')` et 182 `stopPropagation()` dans `src/**/*.js`, dont 101 fichiers combinant les deux.
- **Ce qui a été fait** : garde `isControl(target)` sur les flèches dans le routeur global (`keyboard.js`), tests de focus sur les contrôles locaux.
- **Non fait** : migration complète vers un registre `registerScoped()` et suppression des `stopPropagation()` globaux dans les lentilles générées.
- **Raison** : 101 fichiers générés par audits, sans comportement observé de conflit dans les parcours E2E ; migration de masse à risque de régression visuelle.
- **Réévaluation** : avant toute modification du routeur clavier.
