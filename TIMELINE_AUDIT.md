# Audit structurel des frises — Vectemporel

> Généré par `npm run audit:timeline` le **2026-11-17**. Méthode cible : **v1.0**.
>
> **Ce que cet audit mesure.** La cohérence des ères, des repères, des tags, des liens et des audits prose, puis la **complétude du schéma cible**. Il ne mesure pas la qualité historique, la justesse des dates ni l’équilibre réel des récits : ces vérifications exigent une double lecture humaine.

## Synthèse

| Indicateur | Résultat |
| --- | --- |
| Pays audités | 10 |
| Repères | 229 |
| Ères | 56 |
| Intégrité POC | **120/120 contrôles** (100 %) |
| Pays avec anomalie d’intégrité | 0 |
| Couverture tags × ères | 219/448 cellules (49 %) |
| Matrice pays | 265 couvertes, 332 partielles, 120 justifiées, 67 non traitées |
| Liens `related` | 332 liens, 0 cassé(s), 57 % réciproques |
| Grokipedia | 189/229 slugs directs ; 40 avec fallback recherche |
| Audits prose | 10/10 sections présentes |
| Ancres d’audit | 10/10 valides |
| Complétude cible v1.0 | **27.6/100** |

**Verdict.** 
Les 10 frises sont **cohérentes pour le POC** : ères contiguës, repères dans leur domaine, identifiants, tags et liens valides.
En revanche, la **cible v1.0 n’est pas atteinte** : le score de 27.6/100 mesure la complétude du schéma, pas la valeur historique. 160/229 repères disposent de références de sources, mais les acteurs, lieux, claims et `TimeSpan` restent absents ou très incomplets.

## Tableau pays

| Pays | Domaine | Ères | Repères | Couverture | Politique/guerre | Intégrité | Cible | Audit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 🇫🇷 France | -600 → 2026 | 9 | 57 | 54 % | 82 % | 12/12 | 22/100 | ✅ |
| 🇬🇧 Royaume-Uni | 43 → 2026 | 6 | 24 | 44 % | 79 % | 12/12 | 34/100 | ✅ |
| 🇺🇸 États-Unis | 1607 → 2026 | 6 | 22 | 54 % | 64 % | 12/12 | 23/100 | ✅ |
| 🇩🇪 Allemagne | 962 → 2026 | 6 | 21 | 29 % | 90 % | 12/12 | 27/100 | ✅ |
| 🇮🇹 Italie | -753 → 2026 | 5 | 19 | 48 % | 89 % | 12/12 | 23/100 | ✅ |
| 🇪🇸 Espagne | 711 → 2026 | 5 | 17 | 45 % | 94 % | 12/12 | 34/100 | ✅ |
| 🇨🇳 Chine | -1600 → 2026 | 5 | 17 | 45 % | 88 % | 12/12 | 29/100 | ✅ |
| 🇮🇳 Inde | -2600 → 2026 | 4 | 16 | 66 % | 81 % | 12/12 | 36/100 | ✅ |
| 🇯🇵 Japon | 538 → 2026 | 5 | 17 | 53 % | 71 % | 12/12 | 31/100 | ✅ |
| 🇪🇬 Égypte | -3100 → 2026 | 5 | 19 | 55 % | 89 % | 12/12 | 31/100 | ✅ |

La colonne **Cible** est un score de complétude structurelle : 0 signifie que le schéma cible est absent, pas que les repères sont faux. La colonne **Audit** vérifie seulement que le lien vers `COUNTRY_AUDITS.md` pointe vers une ancre existante.

## 1. Ce qui est solide

- **Périodisations continues** : chaque ère commence là où la précédente finit, dans le domaine du pays.
- **Repères rattachés** : chaque événement tombe dans le domaine temporel et dans une ère.
- **Identifiants et tags** : pas de doublon détecté, tags limités au vocabulaire de l’application.
- **Liens éditoriaux** : 332 liens `related`, 0 cassé(s).
- **Grokipedia** : 189/229 slugs structurellement valides. Le contrôle de disponibilité en ligne reste `npm run verify`.

## 2. Lacunes structurelles

| Champ cible | Repères renseignés | Couverture | Conséquence |
| --- | ---: | ---: | --- |
| `actors` | 0/229 | 0 % | Impossible de vérifier la place des femmes, des minorités, des classes populaires ou des institutions. |
| `places` | 0/229 | 0 % | Impossible de vérifier les lieux hors capitale, les échelles et les géographies datées. |
| `sources` (≥ 1) | 160/229 | 70 % | Références de dossier ; une seule source ne suffit pas à valider une fiche. |
| `sources` (≥ 2) | 80/229 | 35 % | Deux sources indépendantes par fiche : condition non atteinte pour l’essentiel du corpus. |
| `claims` | 0/229 | 0 % | Les désaccords et les incertitudes ne sont pas modélisés. |
| `TimeSpan` | 0/229 | 0 % | Le temps est réduit à une année (et parfois `endYear`) ; pas de bornes, de calendrier ni d’incertitude. |
| `datePrecision` | 0/229 | 0 % | Aucune distinction jour / mois / année / décennie / siècle. |
| Registre d’omissions | 10/10 pays | 100 % | Les absences sont documentées au niveau pays ; il reste à les relier à chaque fiche-événement. |
| Matrice de couverture | 10/10 pays | 100 % | Les 14 domaines sont remplis au niveau pays (265 couvertes, 332 partielles, 120 justifiées, 67 non traitées) ; il reste à les relier aux fiches. |
| Audit expert signé | 0/10 pays | 0 % | Les audits prose ne sont ni une double lecture ni un sign-off. |

Le score de **27.6/100** est donc cohérent : le POC possède un schéma minimal (année, titre, tags, lien), pas le schéma de preuve de la méthode v1.0.

**Matrice, lecture stricte.** Sur 784 cellules : **265 couvertes (34 %)**, 332 partielles, 120 vides justifiées et 67 non traitées. Le sous-score « matrice » récompense le traitement (couvert, partiel ou justifié), pas la couverture stricte.

## 3. Couverture thématique

Les 8 tags actuels ne couvrent pas les 14 domaines de la méthode. Un domaine non instrumenté n’est pas nécessairement absent du récit : il est **invisible et non auditable**.

| Domaine méthode | Tag actuel | Repères | Statut |
| --- | --- | ---: | --- |
| Politique & institutions | `politique` | 157 | instrumenté |
| Guerres & diplomatie | `guerre` | 68 | instrumenté |
| Droit & justice | — | 0 | **non instrumenté** |
| Économie & travail | `economie` | 43 | instrumenté |
| Société & démographie | `societe` | 100 | instrumenté |
| Femmes, genre, sexualités | — | 0 | **non instrumenté** |
| Religions & croyances | `religion` | 37 | instrumenté |
| Sciences, techniques & santé | `sciences` | 22 | instrumenté |
| Arts & lettres | `arts` | 19 | instrumenté |
| Environnement & territoire | — | 0 | **non instrumenté** |
| Migrations & diasporas | — | 0 | **non instrumenté** |
| Peuples autochtones & minorités | — | 0 | **non instrumenté** |
| Mémoire & patrimoine | — | 0 | **non instrumenté** |
| Circulations transnationales | `exploration` | 10 | partiel |

**Six domaines n’ont aucun tag dédié** : droit et justice, femmes et genre, environnement, migrations et diasporas, peuples autochtones et minorités, mémoire et patrimoine. Le tag `exploration` (« Monde ») ne couvre que partiellement les circulations transnationales.

## 4. Équilibre politique et militaire

Seuil de vigilance de la méthode : **≤ 50 %** des repères étiquetés politique ou guerre.

| Pays | Politique/guerre | Part | Statut |
| --- | ---: | ---: | --- |
| France | 47/57 | 82 % | ⚠️ au-dessus du seuil |
| Royaume-Uni | 19/24 | 79 % | ⚠️ au-dessus du seuil |
| États-Unis | 14/22 | 64 % | ⚠️ au-dessus du seuil |
| Allemagne | 19/21 | 90 % | ⚠️ au-dessus du seuil |
| Italie | 17/19 | 89 % | ⚠️ au-dessus du seuil |
| Espagne | 16/17 | 94 % | ⚠️ au-dessus du seuil |
| Chine | 15/17 | 88 % | ⚠️ au-dessus du seuil |
| Inde | 13/16 | 81 % | ⚠️ au-dessus du seuil |
| Japon | 12/17 | 71 % | ⚠️ au-dessus du seuil |
| Égypte | 17/19 | 89 % | ⚠️ au-dessus du seuil |

**10/10 pays** dépassent le seuil : France (82 %), Royaume-Uni (79 %), États-Unis (64 %), Allemagne (90 %), Italie (89 %), Espagne (94 %), Chine (88 %), Inde (81 %), Japon (71 %), Égypte (89 %). Ce n’est pas une erreur factuelle, mais un déséquilibre de sélection à corriger par la matrice de couverture.

## 5. Angles morts non mesurables

Ces angles morts ne sont pas déclarés absents : ils sont **impossibles à auditer** avec le schéma actuel.

- **Femmes et genre** : aucun champ acteur, donc aucune vérification possible de la présence, de l’absence ou du rôle des femmes.
- **Minorités, peuples autochtones, populations colonisées** : aucun acteur collectif ni claim, donc aucune traçabilité.
- **Lieux hors capitale** : aucun lieu daté, donc aucune vérification de l’échelle locale, régionale ou frontalière.
- **Mémoire et commémorations** : aucun objet mémoriel distinct de l’événement commémoré.
- **Incertitude et controverses** : aucun `TimeSpan`, aucune précision, aucun statut de claim.
- **Sources** : Grokipedia est un point d’entrée de lecture ; la méthode exige deux sources indépendantes par fiche.

> Une omission non mesurée n’est pas une omission niée : c’est une **dette d’audit**.

## 6. Liens, audits et cohérence documentaire

- **Liens `related`** : 332 liens, 0 cassé(s), 57 % réciproques.
- **Ancres d’audit** : 10/10 valides.
- **Résumés d’audit** : 10/10 cohérents avec le nombre d’ères et de repères.
- **Audit prose vs audit expert** : les sections de `COUNTRY_AUDITS.md` sont des notes éditoriales ; aucun pays ne dispose de double lecture chiffrée (kappa) ni de sign-off.

## 7. Plan de correction priorisé

| Priorité | Action | Livrable |
| --- | --- | --- |
| P0 | Définir le schéma v2 : `Actor`, `Place`, `Source`, `Claim`, `TimeSpan`, `datePrecision`. | Spécification + migration de `data.js`. |
| P0 | Ajouter un `TimeSpan` minimal à chaque repère, avec rôle de date et source. | 189 fiches avec bornes, précision et certitude. |
| P1 | Remplir `templates/country-audit.yaml` pour les 10 pays pilotes. | `audits/<pays>/country-audit.yaml`. |
| P1 | Remplir la matrice de couverture et le registre d’omissions. | `coverage-matrix.csv` + `omissions.yaml` par pays. |
| P1 | Ajouter deux sources indépendantes par fiche-événement. | `source-register.csv` + `sources` dans les fiches. |
| P2 | Double lecture, kappa, arbitrage et sign-off. | Rapport d’audit signé, score ≥ 80/100. |

## 8. Détail par pays

### 🇫🇷 France (`france`)

- **Périodisation** : 9 ères, -600 → 2026 ; contiguïté ✅ ; 50 repères ponctuels, 7 avec `endYear`.
- **Couverture tags × ères** : 39/72 cellules (54 %) ; aucune ère vide.
- **Matrice pays** : 30 couvertes, 62 partielles, 34 justifiées, 0 non traitées (126 cellules).
- **Cellules vides** : Grand Siècle & Lumières × Guerres ; Révolution & Empire × Guerres ; Temps présents × Guerres ; Antiquité × Sciences ; Moyen Âge × Sciences ; Renaissance × Sciences ; Révolution & Empire × Sciences ; XIXe siècle × Sciences ; … (33 au total)
- **Liens** : 95 `related`, 0 cassé(s), 74 % réciproques ; **Grokipedia** 53/57.
- **Audit prose** : `COUNTRY_AUDITS.md#france--audit` ✅ ; résumé « 9 périodes, 57 repères. De la Gaule à la Ve République, avec les grandes césures politiques, sociales et culturelles. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 25 %, sources ≥2 9 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 47/57 (82 %) ; **intégrité** 12/12 ; **cible** 21.5/100.

### 🇬🇧 Royaume-Uni (`uk`)

- **Périodisation** : 6 ères, 43 → 2026 ; contiguïté ✅ ; 14 repères ponctuels, 10 avec `endYear`.
- **Couverture tags × ères** : 21/48 cellules (44 %) ; aucune ère vide.
- **Matrice pays** : 26 couvertes, 33 partielles, 25 justifiées, 0 non traitées (84 cellules).
- **Cellules vides** : Empire & industrie × Guerres ; Royaume-Uni contemporain × Guerres ; Bretagne romaine, Anglo-Saxons et Vikings × Sciences ; Moyen Âge des quatre nations × Sciences ; Réforme, guerres des Trois Royaumes et Révolution × Sciences ; Guerres totales et crise impériale × Sciences ; Royaume-Uni contemporain × Sciences ; Bretagne romaine, Anglo-Saxons et Vikings × Arts & lettres ; … (27 au total)
- **Liens** : 38 `related`, 0 cassé(s), 71 % réciproques ; **Grokipedia** 20/24.
- **Audit prose** : `COUNTRY_AUDITS.md#royaume-uni--audit` ✅ ; résumé « 6 périodes, 24 repères. Institutions parlementaires, empire, industrialisation, Brexit. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 79 %, sources ≥2 79 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 19/24 (79 %) ; **intégrité** 12/12 ; **cible** 34.3/100.

### 🇺🇸 États-Unis (`usa`)

- **Périodisation** : 6 ères, 1607 → 2026 ; contiguïté ✅ ; 20 repères ponctuels, 2 avec `endYear`.
- **Couverture tags × ères** : 26/48 cellules (54 %) ; aucune ère vide.
- **Matrice pays** : 30 couvertes, 32 partielles, 0 justifiées, 22 non traitées (84 cellules).
- **Cellules vides** : Colonies atlantiques et empires × Politique ; Après-guerre froide, sécurité et polarisation × Politique ; Colonies atlantiques et empires × Guerres ; Indépendance et république esclavagiste × Guerres ; Colonies atlantiques et empires × Sciences ; Indépendance et république esclavagiste × Sciences ; Après-guerre froide, sécurité et polarisation × Sciences ; Colonies atlantiques et empires × Arts & lettres ; … (22 au total)
- **Liens** : 38 `related`, 0 cassé(s), 68 % réciproques ; **Grokipedia** 18/22.
- **Audit prose** : `COUNTRY_AUDITS.md#états-unis--audit` ✅ ; résumé « 6 périodes, 22 repères. Colonisation, indépendance, guerre civile, droits civiques, puissance mondiale. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 59 %, sources ≥2 18 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 14/22 (64 %) ; **intégrité** 12/12 ; **cible** 23.4/100.

### 🇩🇪 Allemagne (`germany`)

- **Périodisation** : 6 ères, 962 → 2026 ; contiguïté ✅ ; 16 repères ponctuels, 5 avec `endYear`.
- **Couverture tags × ères** : 14/48 cellules (29 %) ; aucune ère vide.
- **Matrice pays** : 8 couvertes, 38 partielles, 38 justifiées, 0 non traitées (84 cellules).
- **Cellules vides** : Réforme & guerres × Politique ; Reich médiéval × Guerres ; Occupation et deux Allemagnes × Guerres ; Allemagne réunifiée × Guerres ; Reich médiéval × Sciences ; Réforme & guerres × Sciences ; Unification × Sciences ; Guerres & divisions × Sciences ; … (34 au total)
- **Liens** : 39 `related`, 0 cassé(s), 79 % réciproques ; **Grokipedia** 17/21.
- **Audit prose** : `COUNTRY_AUDITS.md#allemagne--audit` ✅ ; résumé « 6 périodes, 21 repères. Saint-Empire, Réforme, unification, nazisme, division et réunification. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 76 %, sources ≥2 24 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 19/21 (90 %) ; **intégrité** 12/12 ; **cible** 27.5/100.

### 🇮🇹 Italie (`italy`)

- **Périodisation** : 5 ères, -753 → 2026 ; contiguïté ✅ ; 14 repères ponctuels, 5 avec `endYear`.
- **Couverture tags × ères** : 19/40 cellules (48 %) ; aucune ère vide.
- **Matrice pays** : 27 couvertes, 18 partielles, 2 justifiées, 23 non traitées (70 cellules).
- **Cellules vides** : Rome antique et Italie romaine × Guerres ; République × Guerres ; Rome antique et Italie romaine × Sciences ; Moyen Âge & Renaissance × Sciences ; Guerres & Risorgimento × Sciences ; Italie libérale et fasciste (1871-1945) × Sciences ; Rome antique et Italie romaine × Arts & lettres ; Guerres & Risorgimento × Arts & lettres ; … (21 au total)
- **Liens** : 26 `related`, 0 cassé(s), 77 % réciproques ; **Grokipedia** 15/19.
- **Audit prose** : `COUNTRY_AUDITS.md#italie--audit` ✅ ; résumé « 5 périodes, 19 repères. Rome, Renaissance, Risorgimento, fascisme, République européenne. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 68 %, sources ≥2 16 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 17/19 (89 %) ; **intégrité** 12/12 ; **cible** 23.4/100.

### 🇪🇸 Espagne (`spain`)

- **Périodisation** : 5 ères, 711 → 2026 ; contiguïté ✅ ; 14 repères ponctuels, 3 avec `endYear`.
- **Couverture tags × ères** : 18/40 cellules (45 %) ; aucune ère vide.
- **Matrice pays** : 51 couvertes, 7 partielles, 12 justifiées, 0 non traitées (70 cellules).
- **Cellules vides** : Démocratie × Guerres ; Al-Andalus et royaumes chrétiens × Sciences ; Empire espagnol × Sciences ; Révolution libérale et nation en crise × Sciences ; Guerre civile & franquisme × Sciences ; Démocratie × Sciences ; Al-Andalus et royaumes chrétiens × Arts & lettres ; Empire espagnol × Arts & lettres ; … (22 au total)
- **Liens** : 26 `related`, 0 cassé(s), 62 % réciproques ; **Grokipedia** 13/17.
- **Audit prose** : `COUNTRY_AUDITS.md#espagne--audit` ✅ ; résumé « 5 périodes, 17 repères. Al-Andalus, empire, guerre civile, franquisme, transition démocratique. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 100 %, sources ≥2 59 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 16/17 (94 %) ; **intégrité** 12/12 ; **cible** 33.6/100.

### 🇨🇳 Chine (`china`)

- **Périodisation** : 5 ères, -1600 → 2026 ; contiguïté ✅ ; 8 repères ponctuels, 9 avec `endYear`.
- **Couverture tags × ères** : 18/40 cellules (45 %) ; aucune ère vide.
- **Matrice pays** : 0 couvertes, 51 partielles, 0 justifiées, 19 non traitées (70 cellules).
- **Cellules vides** : Shang, Zhou et Royaumes combattants × Guerres ; Réforme et puissance × Guerres ; Shang, Zhou et Royaumes combattants × Sciences ; République et révolutions × Sciences ; Chine populaire × Sciences ; Réforme et puissance × Sciences ; Chine populaire × Arts & lettres ; Réforme et puissance × Arts & lettres ; … (22 au total)
- **Liens** : 15 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 13/17.
- **Audit prose** : `COUNTRY_AUDITS.md#chine--audit` ✅ ; résumé « 5 périodes, 17 repères. Dynasties, empire, humiliations coloniales, révolution communiste, réforme économique. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 100 %, sources ≥2 41 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 15/17 (88 %) ; **intégrité** 12/12 ; **cible** 29.4/100.

### 🇮🇳 Inde (`india`)

- **Périodisation** : 4 ères, -2600 → 2026 ; contiguïté ✅ ; 8 repères ponctuels, 8 avec `endYear`.
- **Couverture tags × ères** : 21/32 cellules (66 %) ; aucune ère vide.
- **Matrice pays** : 26 couvertes, 30 partielles, 0 justifiées, 0 non traitées (56 cellules).
- **Cellules vides** : Civilisations anciennes × Guerres ; Sultanats, Vijayanagara & Moghols × Sciences ; Compagnie & Raj × Sciences ; Inde contemporaine × Sciences ; Compagnie & Raj × Arts & lettres ; Inde contemporaine × Arts & lettres ; Sultanats, Vijayanagara & Moghols × Société ; Civilisations anciennes × Économie ; … (11 au total)
- **Liens** : 17 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 12/16.
- **Audit prose** : `COUNTRY_AUDITS.md#inde--audit` ✅ ; résumé « 4 périodes, 16 repères. Civilisation de l’Indus, empires, domination britannique, indépendance et libéralisation. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 100 %, sources ≥2 81 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 13/16 (81 %) ; **intégrité** 12/12 ; **cible** 36.3/100.

### 🇯🇵 Japon (`japan`)

- **Périodisation** : 5 ères, 538 → 2026 ; contiguïté ✅ ; 9 repères ponctuels, 8 avec `endYear`.
- **Couverture tags × ères** : 21/40 cellules (53 %) ; aucune ère vide.
- **Matrice pays** : 35 couvertes, 29 partielles, 6 justifiées, 0 non traitées (70 cellules).
- **Cellules vides** : Antiquité, Asuka & Nara × Guerres ; Époque Edo × Guerres ; Antiquité, Asuka & Nara × Sciences ; Époque Edo × Sciences ; Empire et guerres mondiales × Sciences ; Époque Edo × Arts & lettres ; Empire et guerres mondiales × Arts & lettres ; Japon contemporain × Arts & lettres ; … (19 au total)
- **Liens** : 18 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 13/17.
- **Audit prose** : `COUNTRY_AUDITS.md#japon--audit` ✅ ; résumé « 5 périodes, 17 repères. Shoguns, fermeture d’Edo, restauration Meiji, guerre, miracle économique. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 100 %, sources ≥2 35 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 12/17 (71 %) ; **intégrité** 12/12 ; **cible** 30.7/100.

### 🇪🇬 Égypte (`egypt`)

- **Périodisation** : 5 ères, -3100 → 2026 ; contiguïté ✅ ; 17 repères ponctuels, 2 avec `endYear`.
- **Couverture tags × ères** : 22/40 cellules (55 %) ; aucune ère vide.
- **Matrice pays** : 32 couvertes, 32 partielles, 3 justifiées, 3 non traitées (70 cellules).
- **Cellules vides** : Égypte islamique × Guerres ; Égypte islamique × Sciences ; Égypte gréco-romaine × Arts & lettres ; Égypte moderne et coloniale × Arts & lettres ; Égypte contemporaine × Arts & lettres ; Égypte gréco-romaine × Religions ; Égypte moderne et coloniale × Religions ; Égypte contemporaine × Religions ; … (18 au total)
- **Liens** : 20 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 15/19.
- **Audit prose** : `COUNTRY_AUDITS.md#égypte--audit` ✅ ; résumé « 5 périodes, 19 repères. Égypte pharaonique, mondes grec et romain, islam, modernité, révolution de 2011. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources ≥1 95 %, sources ≥2 42 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 17/19 (89 %) ; **intégrité** 12/12 ; **cible** 30.8/100.

## 9. Reproduire et interpréter

```bash
npm run audit:timeline
npm run audit:timeline -- --strict   # échoue aussi si la cible v1.0 est incomplète
npm run verify                       # vérifie la disponibilité des 189 pages Grokipedia
```

**Lecture des scores.**
- **Intégrité POC** : contrôles de cohérence internes. Un échec est un défaut à corriger immédiatement.
- **Cible v1.0** : part du schéma de preuve effectivement renseignée. Un score faible n’est pas une condamnation des contenus : c’est la mesure de ce qui manque pour rendre les frises auditables.
- **Couverture tags × ères** : mesure la présence d’au moins un repère par tag et par ère. Elle ne mesure ni la qualité, ni la proportion, ni l’absence de biais.

**Formule de la cible v1.0.** Acteurs 15 % + lieux 15 % + sources 20 % (≥ 1 source : 40 % du sous-score ; ≥ 2 sources : 60 %) + claims 10 % + temps 15 % (année seule : 40 % du sous-score ; `TimeSpan` : 60 %) + précision 5 % + registre d’omissions 5 % + matrice de couverture 7,5 % (cellules traitées : couvertes, partielles ou justifiées ; la couverture stricte est indiquée séparément) + sign-off 7,5 %.

Méthode complète : [TIMELINE_METHOD.md](TIMELINE_METHOD.md). Gabarits : [templates/](templates/).

---

*Rapport généré automatiquement. Ne pas éditer à la main : modifier `scripts/audit-timeline.mjs` ou les données, puis relancer `npm run audit:timeline`.*
