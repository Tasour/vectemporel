# ADR 0001 — Archivage du POC Vectemporel

- **Date** : 2026-11-20
- **Statut** : acceptée
- **Contexte** : le projet historique (`~/Projects/_archive/vectemporel-poc`, branche `main` du dépôt GitHub) contient un atlas complet mais non desservi : système solaire, dragon, plan/hub, récit trois étapes, carte satellite, lecteur Grokipedia, frise zoomable, 196 pays. L'application active (`vectemporel-atlas`) est une réécriture à périmètre réduit, sans historique Git commun avec le POC.

## Décision

1. Le POC est **gelé** : aucun correctif nouveau n'est appliqué, aucun service nouveau n'est créé. Les 250 chantiers d'accessibilité déjà livrés dans l'archive restent à leur place.
2. `public/globe-engine.js` (Atlas) est la **seule source du moteur globe** ; le fork de l'archive est marqué obsolète.
3. Les fonctionnalités du POC sont classées dans le tableau de parité ci-dessous. Seules la **recherche inter-pays** et la **fiche image/crédit/licence** sont restaurées dans l'Atlas (V3-10).
4. Les anciens deep links `#/pays/periode/slug` restent acceptés via un adaptateur local (V3-9).
5. Les 59 modules de lentilles non atteignables sont archivés dans `archive/lenses/` et ne font plus partie du graphe d'exécution (V3-7).

## Tableau de parité

| Fonctionnalité POC | Sort dans l'Atlas | Motivation |
|---|---|---|
| Globe 3D, drapeaux, zoom | Portée et améliorée | Cœur de l'orientation |
| 10 pays / 229 repères / 901+845 points | Porté | Données canoniques |
| Navigation clavier, coque, live, focus | Réécrite plus strictement | Accessibilité |
| Recherche inter-pays | Restaurée (V3-10) | Question « et pendant ce temps, ailleurs ? » |
| Fiche image + crédit + licence | Restaurée (V3-10) | Obligation de licence et pédagogie |
| Récit trois étapes | Remplacé par récit + géographie séparées | Séparation des questions |
| Carte satellite Esri | Remplacée par SVG local | Contrainte zéro réseau |
| Lecteur Grokipedia | Abandonné | Règle principale : aucun service externe |
| Frise zoomable / mini-carte | Archivée | Coût de maintenance, faible usage observé |
| Système solaire, dragon, spirale | Archivés | Découvertes spectaculaires mais non vérifiables |
| 196 pays | Réduit à 10 documentés + état « à auditer » à prévoir | Rigueur des audits |

## Conséquences

- Un seul service actif (`vectemporel-atlas.service`, port 4181) plus le site statique GitHub Pages.
- Les synthèses de l'ancien `UNIFIED_AUDIT/` sont des archives : leurs chemins `v1/`/`v2/` ne sont plus rejouables.
- Toute réactivation d'une fonctionnalité archivée nécessite une nouvelle ADR et un portage explicite, pas une réactivation du POC.
