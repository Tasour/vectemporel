# ADR-0005 — Timeline multi-années avec chunks locaux

- Statut : accepted
- Date : 2026-11-21
- Décideurs : Tasour (validation utilisateur)
- Drivers : timeline -2000..2000, zero reseau externe, budget < 1 Mo au chargement, reversibilite

## Contexte

L'API Chronas répond pour tout entier de -2000 a 2000 (4001 ans) mais refuse les appels CORS depuis github.io. Mesures : budget initial 13 requetes / 366 Ko, marge ~630 Ko sous 1 Mo. La geometrie de 2492 provinces est partagee ; les attributs changent fortement (1000 a 2000 regions modifiees par saut de 100 ans).

## Options envisagées

| Option | Avantages | Inconvénients | Coût | Réversibilité |
|---|---|---|---|---|
| A — Snapshot unique 4001 ans | Acces direct a toutes les annees | ~500 Mo de donnees, budget impossible | Eleve | Faible |
| B — Chunks par siecle + deltas locaux | Geometrie partagee, chargement a la demande, SW cache | Import build long (~500 Mo transfert), reconstruction a implementer | Moyen | Eleve |
| C — Proxy API externe | Code amont quasi intact | CORS contourne par service tiers, dependance et cout | Moyen | Faible |

## Décision

Option B — base -2000 complete + deltas annuels groupes par siecle, charges localement a la demande.

## Conséquences

- Positives : Budget initial inchange ; Aucun appel reseau externe ; Couverture des 4001 annees
- Négatives acceptées : Import build long et reprenable ; Cache LRU et annulation des requetes a gerer
- À surveiller : Temps d'import complet ; Taille des chunks ; Temps de reconstruction d'une annee

## Preuves

- `test:perf 13 requetes / 366 Ko`
- `probe API /v1/areas/{y} -2000..2000 (2026-11-21)`
- `test navigateur CORS Failed to fetch`

## Révision

Condition de révision à définir (métrique ou date).
