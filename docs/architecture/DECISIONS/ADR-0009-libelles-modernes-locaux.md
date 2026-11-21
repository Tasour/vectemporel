# ADR-0009 — Libellés modernes locaux

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : zéro réseau au runtime, offline PWA, budget initial < 1 Mo, cohérence avec l'interface française

## Contexte

Le mode « libellés modernes » de Chronas affiche les noms de pays du fond OpenFreeMap. Ce fond n'est pas disponible localement. Les libellés historiques et les capitales sont déjà livrés en P10. Il faut une source de noms modernes embarquée au build, sans dépendance réseau à l'exécution.

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — Natural Earth 110m (domaine public) | 177 pays, nom FR/EN et point d'étiquette, ~8 Ko une fois compacté | Géométrie non utilisée, noms génériques | Faible | Élevée |
| B — GeoNames / Wikidata en ligne | Noms très complets | Dépendance réseau et licence/quotas | Élevé | Faible |
| C — Table manuelle | Contrôle total | 177 noms à maintenir, erreurs | Moyen | Moyenne |

## Décision

Option A — importer `ne_110m_admin_0_countries` au build via `scripts/import-modern-labels.mjs`, conserver `[nomFR, nomEN, lon, lat, rang]`, et l'exposer comme troisième/quatrième mode de libellés : `Moderne`, `Les deux`. Données domaine public, aucun appel réseau au runtime.

## Conséquences

- Positives : hors ligne, 8 Ko seulement, noms français disponibles, pas de nouvelle dépendance.
- Négatives acceptées : 177 pays seulement (échelle 110m), pas de noms de villes modernes.
- À surveiller : densité des libellés en mode « Les deux », chevauchements avec la fiche.

## Preuves

- 815 562 octets bruts, 177 features, champs `LABEL_X`, `LABEL_Y`, `NAME_FR`.
- `src/data/modern-labels.js` : 7,7 Ko.
- `tests/e2e.mjs` : modes `modern` et `both` vérifiés.

## Révision

0009
