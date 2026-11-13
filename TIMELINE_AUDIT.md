# Audit structurel des frises — Vectemporel

> Généré par `npm run audit:timeline` le **2026-11-13**. Méthode cible : **v1.0**.
>
> **Ce que cet audit mesure.** La cohérence des ères, des repères, des tags, des liens et des audits prose, puis la **complétude du schéma cible**. Il ne mesure pas la qualité historique, la justesse des dates ni l’équilibre réel des récits : ces vérifications exigent une double lecture humaine.

## Synthèse

| Indicateur | Résultat |
| --- | --- |
| Pays audités | 10 |
| Repères | 189 |
| Ères | 56 |
| Intégrité POC | **120/120 contrôles** (100 %) |
| Pays avec anomalie d’intégrité | 0 |
| Couverture tags × ères | 173/448 cellules (39 %) |
| Liens `related` | 276 liens, 0 cassé(s), 67 % réciproques |
| Grokipedia | 189/189 slugs présents |
| Audits prose | 10/10 sections présentes |
| Ancres d’audit | 10/10 valides |
| Complétude cible v1.0 | **6.0/100** |

**Verdict.** 
Les 10 frises sont **cohérentes pour le POC** : ères contiguës, repères dans leur domaine, identifiants, tags et liens valides.
En revanche, la **cible v1.0 n’est pas atteinte** : le score de 6.0/100 mesure la complétude du schéma, pas la valeur historique. Aucun repère ne porte aujourd’hui d’acteurs, de lieux, de sources indépendantes, de claims ni de `TimeSpan` explicite.

## Tableau pays

| Pays | Domaine | Ères | Repères | Couverture | Politique/guerre | Intégrité | Cible | Audit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 🇫🇷 France | -600 → 2026 | 9 | 53 | 50 % | 75 % | 12/12 | 6/100 | ✅ |
| 🇬🇧 Royaume-Uni | 43 → 2026 | 6 | 20 | 38 % | 80 % | 12/12 | 6/100 | ✅ |
| 🇺🇸 États-Unis | 1607 → 2026 | 6 | 18 | 44 % | 61 % | 12/12 | 6/100 | ✅ |
| 🇩🇪 Allemagne | 962 → 2026 | 6 | 17 | 27 % | 88 % | 12/12 | 6/100 | ✅ |
| 🇮🇹 Italie | -753 → 2026 | 5 | 15 | 28 % | 93 % | 12/12 | 6/100 | ✅ |
| 🇪🇸 Espagne | 711 → 2026 | 5 | 13 | 33 % | 92 % | 12/12 | 6/100 | ✅ |
| 🇨🇳 Chine | -1600 → 2026 | 5 | 13 | 28 % | 77 % | 12/12 | 6/100 | ✅ |
| 🇮🇳 Inde | -2600 → 2026 | 4 | 12 | 53 % | 75 % | 12/12 | 6/100 | ✅ |
| 🇯🇵 Japon | 538 → 2026 | 5 | 13 | 43 % | 69 % | 12/12 | 6/100 | ✅ |
| 🇪🇬 Égypte | -3100 → 2026 | 5 | 15 | 40 % | 87 % | 12/12 | 6/100 | ✅ |

La colonne **Cible** est un score de complétude structurelle : 0 signifie que le schéma cible est absent, pas que les repères sont faux. La colonne **Audit** vérifie seulement que le lien vers `COUNTRY_AUDITS.md` pointe vers une ancre existante.

## 1. Ce qui est solide

- **Périodisations continues** : chaque ère commence là où la précédente finit, dans le domaine du pays.
- **Repères rattachés** : chaque événement tombe dans le domaine temporel et dans une ère.
- **Identifiants et tags** : pas de doublon détecté, tags limités au vocabulaire de l’application.
- **Liens éditoriaux** : 276 liens `related`, 0 cassé(s).
- **Grokipedia** : 189/189 slugs structurellement valides. Le contrôle de disponibilité en ligne reste `npm run verify`.

## 2. Lacunes structurelles

| Champ cible | Repères renseignés | Couverture | Conséquence |
| --- | ---: | ---: | --- |
| `actors` | 0/189 | 0 % | Impossible de vérifier la place des femmes, des minorités, des classes populaires ou des institutions. |
| `places` | 0/189 | 0 % | Impossible de vérifier les lieux hors capitale, les échelles et les géographies datées. |
| `sources` indépendantes | 0/189 | 0 % | Grokipedia reste un point d’entrée, pas une source probante : aucune fiche n’a deux sources indépendantes. |
| `claims` | 0/189 | 0 % | Les désaccords et les incertitudes ne sont pas modélisés. |
| `TimeSpan` | 0/189 | 0 % | Le temps est réduit à une année (et parfois `endYear`) ; pas de bornes, de calendrier ni d’incertitude. |
| `datePrecision` | 0/189 | 0 % | Aucune distinction jour / mois / année / décennie / siècle. |
| Registre d’omissions | 0/10 pays | 0 % | Les absences ne sont pas documentées : un oubli reste silencieux. |
| Matrice de couverture | 0/10 pays | 0 % | Les 14 domaines de la méthode ne sont pas remplis ni justifiés. |
| Audit expert signé | 0/10 pays | 0 % | Les audits prose ne sont ni une double lecture ni un sign-off. |

Le score de **6.0/100** est donc cohérent : le POC possède un schéma minimal (année, titre, tags, lien), pas le schéma de preuve de la méthode v1.0.

## 3. Couverture thématique

Les 8 tags actuels ne couvrent pas les 14 domaines de la méthode. Un domaine non instrumenté n’est pas nécessairement absent du récit : il est **invisible et non auditable**.

| Domaine méthode | Tag actuel | Repères | Statut |
| --- | --- | ---: | --- |
| Politique & institutions | `politique` | 113 | instrumenté |
| Guerres & diplomatie | `guerre` | 51 | instrumenté |
| Droit & justice | — | 0 | **non instrumenté** |
| Économie & travail | `economie` | 25 | instrumenté |
| Société & démographie | `societe` | 36 | instrumenté |
| Femmes, genre, sexualités | — | 0 | **non instrumenté** |
| Religions & croyances | `religion` | 26 | instrumenté |
| Sciences, techniques & santé | `sciences` | 16 | instrumenté |
| Arts & lettres | `arts` | 17 | instrumenté |
| Environnement & territoire | — | 0 | **non instrumenté** |
| Migrations & diasporas | — | 0 | **non instrumenté** |
| Peuples autochtones & minorités | — | 0 | **non instrumenté** |
| Mémoire & patrimoine | — | 0 | **non instrumenté** |
| Circulations transnationales | `exploration` | 11 | partiel |

**Six domaines n’ont aucun tag dédié** : droit et justice, femmes et genre, environnement, migrations et diasporas, peuples autochtones et minorités, mémoire et patrimoine. Le tag `exploration` (« Monde ») ne couvre que partiellement les circulations transnationales.

## 4. Équilibre politique et militaire

Seuil de vigilance de la méthode : **≤ 50 %** des repères étiquetés politique ou guerre.

| Pays | Politique/guerre | Part | Statut |
| --- | ---: | ---: | --- |
| France | 40/53 | 75 % | ⚠️ au-dessus du seuil |
| Royaume-Uni | 16/20 | 80 % | ⚠️ au-dessus du seuil |
| États-Unis | 11/18 | 61 % | ⚠️ au-dessus du seuil |
| Allemagne | 15/17 | 88 % | ⚠️ au-dessus du seuil |
| Italie | 14/15 | 93 % | ⚠️ au-dessus du seuil |
| Espagne | 12/13 | 92 % | ⚠️ au-dessus du seuil |
| Chine | 10/13 | 77 % | ⚠️ au-dessus du seuil |
| Inde | 9/12 | 75 % | ⚠️ au-dessus du seuil |
| Japon | 9/13 | 69 % | ⚠️ au-dessus du seuil |
| Égypte | 13/15 | 87 % | ⚠️ au-dessus du seuil |

**10/10 pays** dépassent le seuil : France (75 %), Royaume-Uni (80 %), États-Unis (61 %), Allemagne (88 %), Italie (93 %), Espagne (92 %), Chine (77 %), Inde (75 %), Japon (69 %), Égypte (87 %). Ce n’est pas une erreur factuelle, mais un déséquilibre de sélection à corriger par la matrice de couverture.

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

- **Liens `related`** : 276 liens, 0 cassé(s), 67 % réciproques.
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

- **Périodisation** : 9 ères, -600 → 2026 ; contiguïté ✅ ; 46 repères ponctuels, 7 avec `endYear`.
- **Couverture tags × ères** : 36/72 cellules (50 %) ; aucune ère vide.
- **Cellules vides** : Grand Siècle & Lumières × Guerres ; Révolution & Empire × Guerres ; Temps présents × Guerres ; Antiquité × Sciences ; Moyen Âge × Sciences ; Renaissance × Sciences ; Révolution & Empire × Sciences ; XIXe siècle × Sciences ; … (36 au total)
- **Liens** : 87 `related`, 0 cassé(s), 80 % réciproques ; **Grokipedia** 53/53.
- **Audit prose** : `COUNTRY_AUDITS.md#france--audit` ✅ ; résumé « 9 périodes, 53 repères. De la Gaule à la Ve République, avec les grandes césures politiques, sociales et culturelles. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 40/53 (75 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇬🇧 Royaume-Uni (`uk`)

- **Périodisation** : 6 ères, 43 → 2026 ; contiguïté ✅ ; 16 repères ponctuels, 4 avec `endYear`.
- **Couverture tags × ères** : 18/48 cellules (38 %) ; aucune ère vide.
- **Cellules vides** : Empire & industrie × Guerres ; Royaume-Uni contemporain × Guerres ; Antiquité & invasions × Sciences ; Moyen Âge × Sciences ; Renaissance & Réforme × Sciences ; Guerres mondiales × Sciences ; Royaume-Uni contemporain × Sciences ; Antiquité & invasions × Arts & lettres ; … (30 au total)
- **Liens** : 30 `related`, 0 cassé(s), 77 % réciproques ; **Grokipedia** 20/20.
- **Audit prose** : `COUNTRY_AUDITS.md#royaume-uni--audit` ✅ ; résumé « 6 périodes, 20 repères. Institutions parlementaires, empire, industrialisation, Brexit. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 16/20 (80 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇺🇸 États-Unis (`usa`)

- **Périodisation** : 6 ères, 1607 → 2026 ; contiguïté ✅ ; 16 repères ponctuels, 2 avec `endYear`.
- **Couverture tags × ères** : 21/48 cellules (44 %) ; aucune ère vide.
- **Cellules vides** : Colonisation × Politique ; Puissance mondiale × Politique ; Hyperpuissance × Politique ; Colonisation × Guerres ; Naissance d’une nation × Guerres ; Colonisation × Sciences ; Naissance d’une nation × Sciences ; Hyperpuissance × Sciences ; … (27 au total)
- **Liens** : 30 `related`, 0 cassé(s), 87 % réciproques ; **Grokipedia** 18/18.
- **Audit prose** : `COUNTRY_AUDITS.md#états-unis--audit` ✅ ; résumé « 6 périodes, 18 repères. Colonisation, indépendance, guerre civile, droits civiques, puissance mondiale. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 11/18 (61 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇩🇪 Allemagne (`germany`)

- **Périodisation** : 6 ères, 962 → 2026 ; contiguïté ✅ ; 14 repères ponctuels, 3 avec `endYear`.
- **Couverture tags × ères** : 13/48 cellules (27 %) ; aucune ère vide.
- **Cellules vides** : Réforme & guerres × Politique ; Saint-Empire × Guerres ; Deux Allemagnes × Guerres ; Allemagne réunifiée × Guerres ; Saint-Empire × Sciences ; Réforme & guerres × Sciences ; Unification × Sciences ; Guerres & divisions × Sciences ; … (35 au total)
- **Liens** : 35 `related`, 0 cassé(s), 89 % réciproques ; **Grokipedia** 17/17.
- **Audit prose** : `COUNTRY_AUDITS.md#allemagne--audit` ✅ ; résumé « 6 périodes, 17 repères. Saint-Empire, Réforme, unification, nazisme, division et réunification. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 15/17 (88 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇮🇹 Italie (`italy`)

- **Périodisation** : 5 ères, -753 → 2026 ; contiguïté ✅ ; 13 repères ponctuels, 2 avec `endYear`.
- **Couverture tags × ères** : 11/40 cellules (28 %) ; aucune ère vide.
- **Cellules vides** : Rome antique × Guerres ; République × Guerres ; Rome antique × Sciences ; Moyen Âge & Renaissance × Sciences ; Guerres & Risorgimento × Sciences ; Italie moderne × Sciences ; République × Sciences ; Rome antique × Arts & lettres ; … (29 au total)
- **Liens** : 24 `related`, 0 cassé(s), 83 % réciproques ; **Grokipedia** 15/15.
- **Audit prose** : `COUNTRY_AUDITS.md#italie--audit` ✅ ; résumé « 5 périodes, 15 repères. Rome, Renaissance, Risorgimento, fascisme, République européenne. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 14/15 (93 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇪🇸 Espagne (`spain`)

- **Périodisation** : 5 ères, 711 → 2026 ; contiguïté ✅ ; 10 repères ponctuels, 3 avec `endYear`.
- **Couverture tags × ères** : 13/40 cellules (33 %) ; aucune ère vide.
- **Cellules vides** : Démocratie × Guerres ; Al-Andalus & Reconquista × Sciences ; Empire espagnol × Sciences ; Crises & nation × Sciences ; Guerre civile & franquisme × Sciences ; Démocratie × Sciences ; Al-Andalus & Reconquista × Arts & lettres ; Empire espagnol × Arts & lettres ; … (27 au total)
- **Liens** : 21 `related`, 0 cassé(s), 76 % réciproques ; **Grokipedia** 13/13.
- **Audit prose** : `COUNTRY_AUDITS.md#espagne--audit` ✅ ; résumé « 5 périodes, 13 repères. Al-Andalus, empire, guerre civile, franquisme, transition démocratique. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 12/13 (92 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇨🇳 Chine (`china`)

- **Périodisation** : 5 ères, -1600 → 2026 ; contiguïté ✅ ; 6 repères ponctuels, 7 avec `endYear`.
- **Couverture tags × ères** : 11/40 cellules (28 %) ; ères vides : République et révolutions.
- **Cellules vides** : République et révolutions × Politique ; Réforme et puissance × Politique ; Dynasties fondatrices × Guerres ; République et révolutions × Guerres ; Chine populaire × Guerres ; Réforme et puissance × Guerres ; Dynasties fondatrices × Sciences ; République et révolutions × Sciences ; … (29 au total)
- **Liens** : 12 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 13/13.
- **Audit prose** : `COUNTRY_AUDITS.md#chine--audit` ✅ ; résumé « 5 périodes, 13 repères. Dynasties, empire, humiliations coloniales, révolution communiste, réforme économique. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 10/13 (77 %) ; **intégrité** 12/12 ; **cible** 6.0/100.
- **Avertissements** :
  - ères sans repère : République et révolutions

### 🇮🇳 Inde (`india`)

- **Périodisation** : 4 ères, -2600 → 2026 ; contiguïté ✅ ; 11 repères ponctuels, 1 avec `endYear`.
- **Couverture tags × ères** : 17/32 cellules (53 %) ; aucune ère vide.
- **Cellules vides** : Civilisations anciennes × Guerres ; Sultanats & Moghols × Guerres ; Inde contemporaine × Guerres ; Sultanats & Moghols × Sciences ; Raj britannique × Sciences ; Inde contemporaine × Sciences ; Raj britannique × Arts & lettres ; Inde contemporaine × Arts & lettres ; … (15 au total)
- **Liens** : 11 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 12/12.
- **Audit prose** : `COUNTRY_AUDITS.md#inde--audit` ✅ ; résumé « 4 périodes, 12 repères. Civilisation de l’Indus, empires, domination britannique, indépendance et libéralisation. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 9/12 (75 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇯🇵 Japon (`japan`)

- **Périodisation** : 5 ères, 538 → 2026 ; contiguïté ✅ ; 10 repères ponctuels, 3 avec `endYear`.
- **Couverture tags × ères** : 17/40 cellules (43 %) ; aucune ère vide.
- **Cellules vides** : Japon contemporain × Politique ; Antiquité & Nara × Guerres ; Époque Edo × Guerres ; Antiquité & Nara × Sciences ; Époque Edo × Sciences ; Empire du Japon × Sciences ; Époque Edo × Arts & lettres ; Empire du Japon × Arts & lettres ; … (23 au total)
- **Liens** : 12 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 13/13.
- **Audit prose** : `COUNTRY_AUDITS.md#japon--audit` ✅ ; résumé « 5 périodes, 13 repères. Shoguns, fermeture d’Edo, restauration Meiji, guerre, miracle économique. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 9/13 (69 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

### 🇪🇬 Égypte (`egypt`)

- **Périodisation** : 5 ères, -3100 → 2026 ; contiguïté ✅ ; 14 repères ponctuels, 1 avec `endYear`.
- **Couverture tags × ères** : 16/40 cellules (40 %) ; aucune ère vide.
- **Cellules vides** : Égypte pharaonique × Guerres ; Égypte islamique × Guerres ; Égypte moderne × Guerres ; Égypte gréco-romaine × Sciences ; Égypte islamique × Sciences ; Égypte contemporaine × Sciences ; Égypte gréco-romaine × Arts & lettres ; Égypte moderne × Arts & lettres ; … (24 au total)
- **Liens** : 14 `related`, 0 cassé(s), 0 % réciproques ; **Grokipedia** 15/15.
- **Audit prose** : `COUNTRY_AUDITS.md#égypte--audit` ✅ ; résumé « 5 périodes, 15 repères. Égypte pharaonique, mondes grec et romain, islam, modernité, révolution de 2011. » ✅.
- **Champs cible** : acteurs 0 %, lieux 0 %, sources 0 %, claims 0 %, TimeSpan 0 %, précision 0 %.
- **Équilibre** : politique/guerre 13/15 (87 %) ; **intégrité** 12/12 ; **cible** 6.0/100.

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

**Formule de la cible v1.0.** Acteurs 15 % + lieux 15 % + sources 20 % + claims 10 % + temps 15 % (année seule : 40 % du sous-score ; `TimeSpan` : 60 %) + précision 5 % + registre d’omissions 5 % + matrice de couverture 7,5 % + sign-off 7,5 %.

Méthode complète : [TIMELINE_METHOD.md](TIMELINE_METHOD.md). Gabarits : [templates/](templates/).

---

*Rapport généré automatiquement. Ne pas éditer à la main : modifier `scripts/audit-timeline.mjs` ou les données, puis relancer `npm run audit:timeline`.*
