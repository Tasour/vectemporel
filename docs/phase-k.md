# Phase K — protocole de validation utilisateur

> **Statut** : protocole prêt, **aucune donnée de validation collectée**. Aucun résultat ne doit être rapporté avant qu'une session réelle avec des participants ait eu lieu.

## Objectif

Vérifier avec 20 participants que l'Atlas permet de répondre aux cinq questions de la taxonomie sans aide, et que les garanties (clavier, hors ligne, partage) sont effectivement perceptibles.

## Modalités

- **Participants** : 20 personnes, dont au moins 5 utilisant uniquement le clavier et 5 sur mobile 390×844.
- **Environnement** : site public `https://tasour.github.io/vectemporel/` ou service local `http://127.0.0.1:4181`. Aucun compte, aucun service externe.
- **Durée** : 20 à 30 minutes par participant.
- **Consentement** : présenté en début de session ; aucune donnée personnelle n'est requise (âge tranche, usage occasionnel/professionnel suffisent).
- **Collecte** : formulaire local (fichier Markdown ou CSV généré par le participant), aucun envoi réseau. Les réponses sont stockées dans `docs/phase-k-results/` si le participant le souhaite.

## Scénarios

| # | Question posée au participant | Tâche | Critère de réussite |
|---|---|---|---|
| 1 | Quels pays sont documentés ? | Depuis le globe, sélectionner l'Égypte puis ouvrir sa chronologie | Pays trouvé en moins de 30 s, vue correcte |
| 2 | Et pendant ce temps, ailleurs ? | Trouver un repère de 1789 hors de France | Résultat inter-pays trouvé et ouvert |
| 3 | Peut-on naviguer sans souris ? | Avec le clavier seul : changer de vue, parcourir des repères, ouvrir et fermer le détail | Aucune impasse, focus toujours visible |
| 4 | L'atlas fonctionne-t-il hors ligne ? | Après une première visite, couper le réseau et recharger | Globe rendu, 10 pays listés, 0 erreur visible |
| 5 | Peut-on partager ce que l'on voit ? | Copier le lien d'un repère, l'ouvrir dans un nouvel onglet | Même vue, même pays, même repère restaurés |

Chaque scénario est noté : **réussi / partiel / échec / non tenté**, avec une remarque libre facultative.

## Grille de synthèse (à remplir après les sessions)

| Scénario | Réussis | Partiels | Échecs | Non tentés | Remarques récurrentes |
|---|---:|---:|---:|---:|---|
| 1 Orientation | — | — | — | — | — |
| 2 Recherche inter-pays | — | — | — | — | — |
| 3 Clavier | — | — | — | — | — |
| 4 Hors ligne | — | — | — | — | — |
| 5 Deep link | — | — | — | — | — |

## Règles d'honnêteté

- Ne pas transformer une observation informelle en résultat (« ça marche chez moi » n'est pas un test).
- Ne pas rapporter de pourcentage tant que les 20 fiches ne sont pas collectées.
- Consigner les échecs et les contours de compréhension, même s'ils sont gênants.
- Toute correction issue de la phase K doit être tracée dans un commit séparé avec `Refs: phase-k`.

## Livrable final attendu

`docs/phase-k-resultats.md` : synthèse des 20 fiches, écarts prioritaires, décisions de correction, et date des sessions. Ce fichier n'existe pas encore.
