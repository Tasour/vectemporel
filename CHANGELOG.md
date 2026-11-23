# Changelog

## 0.3.0 — 2026-11-23

### Ajouté
- Cinq récits supplémentaires (10 parcours, 70 jalons) avec difficulté, durée, tags et filtres.
- Rapport de qualité des données, index de référence et snapshot `data-snapshot.sha256`.
- Contrôle automatisé des mentions de licence.
- Outils d'affichage (recentrage, retour à 1000, copie de lien, plein écran, mode zen) et panneau unique.
- Onboarding non modal, indicateur de panneau, cartes UI et tutoriel en cinq écrans.
- Ergonomie : barre d'actions pouce sur mobile, tiroir des ruptures, roving tabindex, palette de commandes étendue.

### Annulé
- 20 épiques supplémentaires : l'API Chronas ne publie que 561 épiques et 560 sont déjà importés. Aucune donnée n'a été fabriquée.
- Refonte du HUD en navigation principale et réduction à six boutons : les raccourcis et panneaux validés seraient cassés.
- Audit axe-core externe : licence MPL, validation humaine requise avant intégration.

## 0.2.0 — 2026-11-23

### Ajouté
- Frise : minimap de densité, échelle linéaire/récents, zoom siècle, filtre d'épiques, points de rupture.
- Globe : arcs de simultanéité avec marqueurs interactifs, focus empire, ombre solaire stylisée, mode fil de fer.
- Récits : cinq parcours prouvés (35 jalons), raccourcis de province, récits à trous, pont depuis l'Histomap.
- Histomap : streamgraph D3 des familles culturelles, minimap, table miroir, navigation clavier.
- Apprentissage : cinq défis locaux branchés sur le SRS Leitner.
- Outils : comparaison A/B, recherche par souverain/culture, historique Alt+←/→, anomalies de capitales, widget budget en dev.
- Preuves : `audit.mjs --advanced` 40/40 et `roast.mjs` 0 défaut pour le dashboard Histomap.

### Vérifié
- `npm run check` : 1 386 PASS / 0 échec.
- Budget : 35 requêtes / 507 Ko à la première visite, 56 Ko en régime établi.
- Captures 1658×1150 et 390×844 relues.

## 0.1.0 — 2026-11-21

- Première version : globe vectoriel local, frise 4 001 ans, fiches provinciales, PWA hors ligne.
