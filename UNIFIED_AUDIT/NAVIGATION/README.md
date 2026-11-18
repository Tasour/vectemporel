# Refonte de la navigation — Vectemporel (POC + Atlas)

Hub de coordination pour la deuxième vague d'audit : **la structure de navigation elle-même**, du plus macro au plus micro. Objectif : rendre l'architecture évidente — où suis-je, où puis-je aller, comment je reviens, comment je le sais.

## Méthode (identique à la vague 1)

Un sous-agent expert par surface, **10 chantiers** par surface, **les 10 implémentés**, rapport dans `views/<id>.md`, synthèse maître dans `SYNTHESE.md`.

## Les 3 niveaux

| Niveau | Question servie | Surfaces |
| --- | --- | --- |
| **Macro** | Quel est le modèle mental ? | `m1-orientation-globale`, `m2-hub-plan`, `m3-coque-atlas`, `m4-taxonomie-atlas` |
| **Meso** | Comment circule-t-on ? | `t1-routeur-poc`, `t2-routeur-atlas`, `t3-retour-poc`, `t4-etat-atlas` |
| **Micro** | Comment le voit-on / le comprend-on ? | `c1-deeplink-poc`, `c2-orientation-atlas`, `c3-recherche-atlas`, `c4-aide-poc` |

## Règles de non-collision

- `app.js` du POC est partagé par 3 surfaces (m1, c1, c4) : zones de fonctions distinctes, ancres uniques, relecture avant chaque `edit`.
- CSS : bloc `<style id="nav-...">` injecté depuis le module possédé ; `styles.css` intact.
- Aucune donnée historique inventée, aucune commande Git, zéro réseau.
- Les suites E2E doivent rester au vert : POC `npm run test:e2e` (14/14), Atlas `npm run check`.
