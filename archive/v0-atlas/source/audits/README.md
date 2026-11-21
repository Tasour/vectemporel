# Dossiers pays — méthode Vectemporel v1.0

Ce dossier contient les **dossiers d’audit de première version** des 10 pays pilotes. Chaque dossier applique la méthode [`TIMELINE_METHOD.md`](../TIMELINE_METHOD.md) et utilise les gabarits de [`templates/`](../templates/).

## Index

Dernière vérification structurelle : **10/10 dossiers complets**, 200 sources, 180 propositions d’événements.

| Pays | Dossier | Sources | Propositions | Statut |
| --- | --- | ---: | ---: | --- |
| France | [`france/`](france/) | 20 | 18 | ✅ première version |
| Royaume-Uni | [`uk/`](uk/) | 20 | 18 | ✅ première version |
| États-Unis | [`usa/`](usa/) | 20 | 18 | ✅ première version |
| Allemagne | [`germany/`](germany/) | 20 | 18 | ✅ première version |
| Italie | [`italy/`](italy/) | 20 | 18 | ✅ première version |
| Espagne | [`spain/`](spain/) | 20 | 18 | ✅ première version |
| Chine | [`china/`](china/) | 20 | 18 | ✅ première version |
| Inde | [`india/`](india/) | 20 | 18 | ✅ première version |
| Japon | [`japan/`](japan/) | 20 | 18 | ✅ première version |
| Égypte | [`egypt/`](egypt/) | 20 | 18 | ✅ première version |

Synthèse comparative : [`AUDIT_SYNTHESIS.md`](../AUDIT_SYNTHESIS.md). Rapport d’intégration : [`INTEGRATION_REPORT.md`](../INTEGRATION_REPORT.md). Vérification des sources : [`SOURCE_VERIFICATION.md`](../SOURCE_VERIFICATION.md).

> Les dossiers sont des **premières versions expertes non signées** : `verdict: pending`, scores `null`, `signoff` vide. Les propositions sont une file de revue, pas un patch automatique de `data.js`.

## Contenu attendu d’un dossier

```text
audits/<pays>/
  country-audit.yaml       # périmètre, historiographie, périodisations, acteurs, lieux, claims, audit
  coverage-matrix.csv      # périodes × 14 domaines × échelles
  source-register.csv      # sources vérifiées, avec indépendance et fiabilité
  omissions.yaml           # omissions explicites, justifiées
  proposals.yaml           # ARCHIVE HISTORIQUE : file de revue, non consommée par le build
  fixes.yaml               # CORRECTIONS ACTIVES : appliquées en mémoire par build-dataset.mjs
  auto-omissions.yaml      # absences dérivées des justifications existantes (généré)
  REPORT.md                # ARCHIVE HISTORIQUE : synthèse experte, chiffres non recalculés
```

`fixes.yaml` est appliqué de façon déterministe lors de `npm run build:data` (aucune écriture dans `source/data.js`) et chaque correction appliquée est tracée dans `meta.appliedFixes`, contrôlée par `npm run verify`. `proposals.yaml` et `REPORT.md` sont conservés pour la traçabilité mais ne sont pas des sources d'exécution : leurs chiffres et leurs files de revue n'ont pas été rejoués.

## Règles

- **Aucune source inventée.** Un DOI, une URL, une date ou un titre non vérifié reste vide et devient une dette documentée.
- **Aucun audit signé automatiquement.** `verdict: pending`, scores `null`, `signoff` vide tant qu’une double lecture humaine n’a pas eu lieu.
- **Aucune publication automatique.** `proposals.yaml` est une file de revue, pas un patch de `data.js`.
- **Les absences sont documentées.** Une case vide non justifiée est un défaut bloquant.
- **Grokipedia et Wikipédia** sont des points d’entrée de lecture, jamais des autorités de validation.

## Commandes

```bash
npm run build:data              # régénère dataset.js en appliquant fixes.yaml
npm run build:points            # fusionne les propositions validées
npm run verify                  # contrôle les données, les fixes appliqués et les légendes
npm run report:omissions        # régénère docs/arbitrage-omissions.md
```
