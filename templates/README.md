# Gabarits — méthode Vectemporel v1.0

Ce dossier rend la méthode [`TIMELINE_METHOD.md`](../TIMELINE_METHOD.md) opérationnelle. Il ne contient **aucune donnée historique** : uniquement des structures à remplir, pour éviter d’inventer des dates, des acteurs ou des sources.

## Fichiers

| Fichier | Usage |
| --- | --- |
| `country-audit.yaml` | Dossier pays complet : périmètre, historiographie, périodisations, couverture, omissions, audit, publication. |
| `event-record.yaml` | Fiche-événement ou fiche-processus, avec `TimeSpan`, acteurs, lieux, claims, sources et relations. |
| `coverage-matrix.csv` | Matrice `périodes × domaines × échelles`, à remplir pour chaque pays. |
| `source-register.csv` | Registre des sources, avec indépendance, fiabilité, DOI/URL et usage. |
| `omissions.yaml` | Registre des omissions explicites, avec raison, justification et sources vérifiées. |

## Convention de dossier

Pour un pays donné, créer :

```text
audits/<country-id>/
  country-audit.yaml       # copie remplie de templates/country-audit.yaml
  events/                  # une fiche par événement, ou un fichier events.yaml
  coverage-matrix.csv      # copie remplie de templates/coverage-matrix.csv
  source-register.csv      # copie remplie de templates/source-register.csv
  omissions.yaml           # registre des omissions explicites
```

Le champ `country.id` doit correspondre à l’identifiant utilisé dans `data.js` (`france`, `uk`, `usa`, etc.). Les identifiants d’événements doivent rester stables : un identifiant publié ne se réutilise jamais pour un autre fait.

## Statuts

### Cellule de couverture

- `couvert` : au moins une fiche avec acteur, lieu et source.
- `partiel` : fiche présente, mais acteur, lieu ou source manquant.
- `vide justifié` : absence argumentée (période non pertinente, source absente, catégorie non applicable).
- `vide non traité` : défaut bloquant.

### Fiche-événement

- `draft` : rédigée, non relue.
- `review` : en double lecture.
- `published` : validée et publiée.
- `disputed` : claims contradictoires conservées, signalées comme telles.

### Audit pays

- `pending` : dossier incomplet.
- `conditional` : publiable avec plan de correction.
- `passed` : aucun S1, score ≥ 80/100.
- `failed` : refonte nécessaire.

## Commandes

```bash
npm run audit:timeline          # audit structurel des frises présentes dans data.js
npm run audit:timeline -- --strict  # échoue aussi si la cible v1.0 est incomplète
npm run verify                  # vérifie les liens Grokipedia
```

L’audit structurel ne juge **pas** la qualité historique. Il vérifie la cohérence des ères, des liens, des tags et des audits, puis mesure la complétude du schéma cible. La validation historique reste une double lecture humaine tracée dans `country-audit.yaml`.

## Règle d’or

Aucun champ ne se remplit « pour faire complet ». Si une information n’est pas attestée, écrire `null`, `unknown` ou `disputed` avec une justification. Une omission documentée vaut mieux qu’une donnée inventée.
