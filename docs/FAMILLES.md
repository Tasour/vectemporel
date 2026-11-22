# Règles de mapping culture → famille

`scripts/families.csv` est la table éditoriale qui associe un code de culture Chronas à une famille. Elle est lue au build par `scripts/build-histomap.mjs`. **Toute culture absente de la table est comptée dans « non classé »** : aucune culture n'est répartie arbitrairement.

## Principes

1. Le code source (`culture`) et le libellé localisé (`CHRONAS_LABELS`) sont conservés tels quels dans la table : la ligne est auditable.
2. Le regroupement est **civilisationnel et linguistique large**, pas religieux ni politique.
3. Les cultures Antiques sans équivalent moderne restent souvent « non classé » plutôt que d'être forcées dans une famille anachronique.
4. Les variantes régionales d'une même aire linguistique sont regroupées (ex. `romagnan`, `wallonian`, `tuscan`, `umbrian`, `swabian` → **Européen**).
5. La troisième colonne (`population_cumulee_M`) est un indicateur de l'importance de la culture dans les 41 chunks ; elle sert au tri de la table, pas au calcul de l'Histomap.

## Familles

| Famille | Critères dominants | Exemples de codes |
|---|---|---|
| Chinois | langues et groupes de Chine continentale | `chihan`, `wu`, `cantonese`, `hakka`, `khitan`, `tangut` |
| Indien | langues indo-aryennes et dravidiennes | `bengali`, `tamil`, `gujarati`, `panjabi`, `gondi`, `malvi` |
| Islamique | aires arabophones, persanes, turciques et africaines musulmanes | `al_misr_arabic`, `turkish`, `persian`, `berber`, `gulf_arabic`, `uzbehk` |
| Européen | langues et variantes européennes, y compris slaves et régionales | `russian`, `english`, `greek`, `franconian`, `occitain`, `novgorodian` |
| Amériques | cultures autochtones et iberian_* | `american`, `iberian_mexican`, `maya`, `inca`, `quechua`, `aztek` |
| Asie orientale et du Sud-Est | Japon, Corée, Asie du Sud-Est, steppe orientale | `japanese`, `korean`, `vietnamese`, `javanese`, `mongol`, `uyghur` |
| non classé | absence de règle ou ambiguïté volontaire | `roman`, `medians`, `armenian`, etc. |

## Mesure de couverture

Après extension de la table à **301 cultures** :

| Année | Part « non classé » |
|---|---|
| 1000 | 9 % |
| 1500 | 8 % |
| 2000 | 6 % |

L'Antiquité reste plus incertaine : les cultures très anciennes sont souvent absentes de la table et restent visibles comme bande hachurée dans l'Histomap.

## Modifier la table

1. Ajouter ou corriger une ligne `culture,famille,population_cumulee_M` (une culture par ligne).
2. `npm run histomap:build` régénère `src/data/histomap.json` et son SHA-256.
3. `npm run test:histomap` vérifie le budget (< 80 Ko) et la cohérence des totaux.
4. `npm run snapshot:make` met à jour `data-snapshot.sha256`.

Aucune modification manuelle de `src/data/histomap.json` n'est autorisée.
