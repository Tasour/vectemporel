# Todo — intégration des fixes pays

## Phase 0 — Baseline

- [x] 10 dossiers pays produits et contrôlés.
- [x] 200 sources enregistrées et testées.
- [x] 180 propositions, 120 corrections, 148 omissions documentées.
- [x] `audit:dossiers` : 0 erreur, 0 avertissement.
- [x] `audit:timeline` : 120/120 intégrité, cible 17,9/100.
- [x] État poussé sur `main`.

## Phase 1 — Préparation des patches

- [x] Brief des fixers.
- [x] Lancement des 10 fixers en parallèle.
- [x] Collecte des `audits/<pays>/fixes.yaml`.
- [x] Validation YAML, identifiants, tags, bornes temporelles.
- [x] Script `scripts/apply-country-fixes.mjs` (dry-run + application).
- [x] Audit adapté aux nouveaux événements avec `sources` et fallback Grokipedia.

## Phase 2 — Application des corrections

- [x] Appliquer les 121 corrections aux événements existants.
- [x] Appliquer les renommages d’ères sûrs (sans scission) : 22 renommages.
- [x] Ajouter 4 événements prioritaires par pays, dont l’ère chinoise 1912–1949 : 40 ajouts.
- [x] Ajouter les champs `sources` aux nouveaux événements.
- [x] Régénérer `data.js` : 229 repères.
- [x] Mettre à jour les compteurs de `scripts/build-atlas.mjs` et `COUNTRY_AUDITS.md`.

## Phase 3 — Validation

- [x] `npm run audit:dossiers` : 0 erreur, 0 avertissement.
- [x] `npm run audit:timeline` : 120/120, 0 anomalie, 229 repères.
- [x] `npm run verify:sources` : 0 DOI non résolu, 0 URL introuvable.
- [x] `npm run verify` : 189/189 pages Grokipedia directes.
- [x] Test navigateur : frise 57 repères, lecteur fallback, globe 1 draw call.
- [x] Vérifier les nouveaux événements sans `grok` (fallback recherche).

## Phase 4 — Documentation et publication

- [x] Mettre à jour `README.md`, `AUDIT_SYNTHESIS.md`, `COUNTRY_AUDITS.md`, `CONCEPT.md`, `TIMELINE_METHOD.md`.
- [x] Écrire `INTEGRATION_REPORT.md` : corrections appliquées, ajouts, restes.
- [ ] Commit et push sur `main`.

## Restes assumés

- [x] Scissions d’ères lourdes documentées en `unresolved` (56 points).
- [x] 180 propositions non intégrées en totalité : 40 ajouts, le reste en file.
- [ ] Double lecture, kappa, Delphi et sign-off.
- [ ] 42 sources non concluantes à vérifier humainement.
