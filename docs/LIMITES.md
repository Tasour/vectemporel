# Limites et angles morts

Ce document distingue volontairement les faits observés dans les données des interprétations.

## Données

- Les populations sont des **estimations Chronas**, pas des recensements. Elles servent de poids relatif, jamais de vérité démographique.
- L'an 1 présente un artefact de bascule BCE→CE (1 023 changements de souverains) : il est exclu des ruptures et des anomalies.
- Les sauts de population de 1850 et 1950 dépassent 10 millions et sont exclus comme changements d'échelle probable.
- La table `families.csv` est éditoriale : toute culture absente est comptée en « non classé ». La part non classée est de 9 % en 1000, 8 % en 1500 et 6 % en 2000, mais reste élevée dans l'Antiquité.
- Les anomalies de capitales sont des **extraits** : un changement de capitale sans changement de souverain peut être un déménagement administratif, une erreur de source ou un changement de nom.

## Détections

- Une rupture est définie par au moins 20 provinces qui changent de souverain la même année. Cette règle manque les transitions purement culturelles ou religieuses.
- L'espacement de 25 ans et la limite de deux points par siècle sont des choix de lisibilité, pas des propriétés de la donnée.
- L'ombre solaire est **stylisée et déterministe** (direction dérivée de l'année) : ce n'est pas une éphéméride.

## Interface

- Le globe requiert WebGL ; sans WebGL, un message d'erreur remplace la scène.
- Le mode silhouette sacrifie les frontières vectorielles au profit d'un rendu plus léger.
- Les chunks d'années sont chargés à la demande ; un year très éloigné peut afficher un court état « Chargement… ».

## Ce que l'application ne prouve pas

- Aucune causalité historique : les récits sont des lectures sourcées, pas des explications.
- Aucune validation historique indépendante : les faits sont conformes à Chronas, pas certifiés par un historien.
- Aucune donnée externe au chargement : les liens Wikipédia des fiches sont des liens de lecture, pas des sources embarquées.
