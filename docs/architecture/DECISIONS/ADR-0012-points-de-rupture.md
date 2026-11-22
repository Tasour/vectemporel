# ADR-0012 — Détection des points de rupture depuis les séries Chronas

- Statut : proposed
- Date : 2026-11-22
- Décideurs : à valider
- Drivers : repères dans la frise, traçabilité des chiffres, budget < 1 Mo, zéro réseau

## Contexte

La frise contient 560 épiques Chronas et la minimap montre leur densité. Ces repères sont des **événements** catalogués par Chronas, pas des ruptures détectées dans les séries annuelles. Les 41 chunks `src/data/years/c*.json` portent, pour chaque année, les changements de souverain, culture, religion, capitale et population de chaque province. Une rupture globale peut être définie de façon falsifiable à partir de ces seules données.

Mesures préalables (recalculables) : 3 960 années avec deltas ; médiane 0 changement de souverain par an ; p90 = 19 ; maximum 1 023 en l'an 1. Deux artefacts sont visibles : l'an 1 (1 023 changements sur 2 401 provinces, probable bascule BCE→CE) et les sauts de population de 1950 (+296 millions) et 1850 (+34 millions), vraisemblablement des changements d'échelle de la source.

## Options envisagées

| Option | Avantages | Inconvénients | Réversibilité |
|---|---|---|---|
| A — Rupture = changement de souverain dans ≥ 20 provinces, score pondéré par la population, artefacts exclus | Règle simple, chiffres recalculables, aucun texte inventé | Ignore les ruptures purement culturelles | Élevée |
| B — Rupture = tout changement de population | Très exhaustif | 3 960 faux positifs, artefacts dominants | Élevée |
| C — Catalogue historique rédigé à la main | Récit plus lisible | Non vérifiable depuis les données, dérive éditoriale | Faible |

## Décision

Option A. Un point de rupture est une année où **au moins 20 provinces changent de souverain** (`ruler[0]` diffère de l'année précédente), avec un score = `changements + min(|Δpopulation| / 5 000, 40)` où la population ne sert qu'à départager deux années au nombre de changements proche. Sont exclues : l'année 1 (artefact de bascule d'ère) et toute année dont le delta de population dépasse 10 000 000 (artefact d'échelle). Chaque point porte le nombre de provinces concernées et jusqu'à 5 noms de provinces : le libellé est généré depuis ces chiffres, jamais depuis un récit externe.

## Conséquences

- Positives : chaque badge affiche un chiffre prouvable ; le build recalcule la règle et casse en cas de divergence ; aucune donnée supplémentaire au runtime.
- Négatives acceptées : la règle ne capte pas les bascules culturelles sans changement de souverain ; les artefacts sont exclus par une liste explicite et documentée.
- À surveiller : stabilité de la règle si Chronas réimporte les chunks ; densité des badges dans la frise ; chevauchement avec les épiques existants.

## Preuves

- Comptage préalable : `node /tmp/opencode/analyze-turns.mjs` (hors dépôt), 3 960 années avec deltas, p90 19, top 1 023 en l'an 1.
- Jeu de données : `src/data/years/c*.json`, 41 chunks locaux CC BY-SA 4.0.
