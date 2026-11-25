# Couverture des libellés français

Mesure au 25/11/2026, sur les 4 001 années du miroir.

| Dimension | Entités utilisées | Noms français (API + table) | Couverture des occurrences |
|---|---:|---:|---:|
| ruler | 1 747 | 1 338 | **89,8 %** |
| culture | 541 | 441 | **88,8 %** |
| religion | 63 | 62 | **99,8 %** |

Détail des sources :

- l'API fournit `ruler_fr` pour 1 305 des 1 777 dirigeants (73,4 %),
  `culture_fr` pour 416 des 551 cultures, `religion_fr` pour 43 des 63 religions ;
- `src/data/frenchNames.ts` complète les entités les plus visibles
  (33 dirigeants, 25 cultures, 19 religions) avec des libellés français publiés
  (Wikidata / Wikipédia), vérifiés pour éviter les homonymies de monuments ou de
  périodes ;
- les entités restantes conservent leur nom source : aucun libellé n'est
  inventé. Les cas non couverts sont des entités rares ou sans titre français
  établi.

Les noms officiels de l'API restent prioritaires : la table locale ne comble
que les absences.
