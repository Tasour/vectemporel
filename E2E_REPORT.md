# Rapport E2E — parcours clavier

> Généré par `npm run test:e2e`. 2026-11-17.

14/14 contrôles réussis.

| Résultat | Contrôle | Détail |
| --- | --- | --- |
| PASS | Accueil = globe 3D |  |
| PASS | Globe → Système |  |
| PASS | Flèches = période puis événement | planète 2 |
| PASS | Entrée ouvre le lecteur |  |
| PASS | Échap referme le lecteur sans quitter le Système |  |
| PASS | Échap ramène au globe |  |
| PASS | R ouvre le Récit |  |
| PASS | Maj+3 ouvre les lieux |  |
| PASS | Flèche droite change de lieu |  |
| PASS | ? ouvre l’aide |  |
| PASS | Échap ferme l’aide |  |
| PASS | Maj+4 retourne au Système |  |
| PASS | La sélection est conservée |  |
| PASS | Aucune erreur console |  |


## Protocole P4

Le test couvre le parcours : globe → recherche pays → système solaire →
événement → lecteur → retour → Récit → lieux → aide → retour système.
Il ne utilise que le clavier, validant ainsi l'exigence de navigation exclusive.

Une évaluation utilisateur (20 participants, tâches « trouver / raconter / situer »)
reste nécessaire : ce test automatique vérifie la mécanique, pas la compréhension.
