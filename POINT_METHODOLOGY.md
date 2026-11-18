# Méthodologie avancée — qu’est-ce qu’un point d’histoire ?

> Version 1.0 — 18 novembre 2026. Applicable aux 10 pays et à toutes leurs ères.

## 1. Définition opératoire

Un **point d’histoire** est la plus petite unité de connaissance **démontrable, datable, localisable et transmissible**. Il ne se confond ni avec un événement, ni avec une opinion, ni avec une simple mention.

Un point est valide seulement s’il possède :

1. **un sujet** : qui ou quoi ? (acteur, groupe, institution, objet, lieu, texte) ;
2. **un prédicat** : que s’est-il passé ? (action, transformation, rupture, continuité, contestation) ;
3. **un complément** : quoi, où, avec qui, contre qui ? ;
4. **une ancre temporelle** : année, intervalle ou précision explicite ;
5. **une échelle** : local / régional / national / impérial / global ;
6. **un domaine** : un des 14 domaines de la matrice ;
7. **une source vérifiable** ou une omission explicitement justifiée ;
8. **un degré de certitude** : `certain` / `probable` / `disputé` / `non documenté`.

Forme minimale :

```text
P = (S, R, O, T, E, D, Src, C)
```

- `S` sujet, `R` relation/prédicat, `O` objet ;
- `T` temps avec précision ;
- `E` échelle ;
- `D` domaine ;
- `Src` références ;
- `C` certitude.

## 2. Les huit familles de points

| Famille | Question | Exemple |
| --- | --- | --- |
| **Événement** | Quand l’événement a-t-il eu lieu ? | 1789 : prise de la Bastille |
| **Processus** | Quel changement lent ? | romanisation, islamisation, industrialisation |
| **Acteur** | Qui a agi ? | Vercingétorix, Olympe de Gouges, un groupe |
| **Groupe social** | Quel collectif ? | paysans, ouvrières, minorité, diaspora |
| **Lieu** | Où ? | Alésia, Paris, Le Caire, Kyoto |
| **Institution** | Quelle structure ? | Parlement, Église, armée, compagnie |
| **Repère normatif** | Quelle règle ? | édit, loi, traité, constitution |
| **Mémoire** | Comment le passé est-il raconté ? | statue, commémoration, contestation |

Un point ne doit jamais être réduit à une date : la date est un **champ**, pas le contenu.

## 3. Règles d’intégrité

1. **Aucune date sans rôle** : toute année doit dire ce qu’elle mesure (début, fin, borne conventionnelle,日期 approchée).
2. **Aucune affirmation sans source** : `Src` peut être un ID du registre ou une omission documentée.
3. **Aucun point invisible** : un point absent de la matrice n’existe pas pour le système.
4. **Un point par cellule minimum** : pour chaque ère × domaine, il faut au moins un point ou un `vide justifié`.
5. **Deux sources indépendantes minimum** pour un point marqué `certain` lorsqu’il est contesté.
6. **Le disputé reste disputé** : on ne résout pas une controverse par un silence.
7. **Les silences sont des données** : `aucune source` doit être explicite, jamais un vide masqué.
8. **Les noms historiques sont conservés** avec leur époque d’usage.

## 4. Couverture 100 %

Un pays est à **100 % de couverture** quand, pour chacune de ses ères :

- chaque domaine de la matrice est soit `couvert` par au moins un point valide, soit `vide justifié` avec omission ID ;
- aucun statut `partiel` ni `vide non traité` ne subsiste ;
- les acteurs, lieux, groupes, institutions, repères normatifs et mémoires sont représentés quand le corpus le permet ;
- le script `npm run verify:points` confirme le résultat.

La couverture est donc **explicite et binaire**, pas une impression de complétude.

## 5.hiérarchie des écailles

```text
Monde → Pays → Ère → Point → Sous-point
```

Un point peut avoir des sous-points (acteurs, lieux, sources) mais il ne doit jamais dépendre d’un autre pays pour être compris.

## 6. Processus par ère

Chaque ère est traitée par un agent dédié qui :

1. lit `audits/<pays>/country-audit.yaml`, `coverage-matrix.csv`, `source-register.csv`, `omissions.yaml`, `proposals.yaml` ;
2. repère les cellules `partiel`, `vide non traité` et `vide justifié` ;
3. produit des propositions de points dans `proposals/<pays>/<ere>.yaml` ;
4. ne modifie jamais `src/data/dataset.js` ;
5. marque chaque proposition `status: proposed` jusqu’à validation.

## 7. Format d’une proposition

```yaml
- id: fr-era1-pol-001
  era_id: france-era-1
  domain: Politique & institutions
  scale: national
  subject: "..."
  predicate: "..."
  object: "..."
  time: "-600"
  time_precision: year
  families: [evenement, acteur]
  actors: ["..."]
  places: ["..."]
  groups: ["..."]
  institutions: ["..."]
  normative: []
  memory: []
  sources: ["SRC-001"]
  confidence: certain
  status: proposed
  justification: "..."
  TODO: []
```

## 8. Porte qualité

Une proposition est acceptée seulement si :

- son domaine et son échelle existent dans la matrice ;
- sa date est compatible avec l’ère ;
- ses sources existent dans le registre du pays ;
- sa famille est renseignée ;
- elle ne contient aucun lien Grokipedia ;
- elle ne modifie pas une source existante sans justification.

## 9. Ce que l’agent ne peut pas faire

- inventer une date, un DOI, un auteur ou un titre ;
- transformer un `probable` en `certain` ;
- dire « sans source » sans ID d’omission ;
- remplir une cellule avec du texte générique ;
- ajouter un point hors de l’ère traitée.

## 10. Objectif final

Atteindre **100 % de couverture explicite** dans les 56 ères, avec un registre de points auditable, puis régénérer `dataset.js` pour que l’interface affiche réellement les points validés.
