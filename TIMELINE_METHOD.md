# Vectemporel — méthode systémique de création d’une frise pays

> **Version 1.0 — novembre 2026.**  
> Cette méthode sert à produire la frise d’un pays sans **silences involontaires** : elle ne prétend pas à l’exhaustivité — impossible — mais elle rend explicites le périmètre, les périodisations, les acteurs, les lieux, les sources, les incertitudes et les absences.
>
> Elle a été construite à partir de quatre revues expertes externes : historiographie et périodisation ; humanités numériques et données temporelles ; histoire sociale, genre et mémoire ; audit expert et assurance qualité.

---

## 0. Principe fondateur

Une frise n’est pas une liste de dates. C’est un **système de sélection** qui répond à quatre questions :

1. **Qu’est-ce qui compte ?** — et selon quels critères, pour qui, à quelle échelle ?
2. **Quand commence et finit une période ?** — et quelles continuités cette césure masque-t-elle ?
3. **Qui agit ?** — dirigeants, institutions, collectifs, femmes, minorités, populations ordinaires, acteurs étrangers.
4. **Où ?** — capitale, périphérie, région, colonie, diaspora, espace transfrontalier.

> **Règle d’or : aucun oubli silencieux.** Toute absence doit être soit couverte, soit justifiée dans un registre d’omissions. Une case vide non expliquée est un défaut de méthode, pas une neutralité.

---

## 1. Vue d’ensemble : le pipeline en 11 étapes (0 à 10)

```text
[0] Cadrage du pays
      ↓
[1] Cartographie historiographique
      ↓
[2] Corpus de sources
      ↓
[3] Inventaire multi-échelles
      ↓
[4] Périodisations candidates
      ↓
[5] Matrice de couverture
      ↓
[6] Sélection éditoriale et scoring
      ↓
[7] Qualification des données
      ↓
[8] Audit expert
      ↓
[9] Mise en scène temporelle
      ↓
[10] Publication, versionnage, maintenance
```

Chaque étape a un **livrable** et une **porte de qualité**. On ne passe pas à l’étape suivante si la porte est fermée.

| Étape | Livrable | Porte |
| --- | --- | --- |
| 0. Cadrage | Charte de périmètre v1.0 | Périmètre, bornes, populations incluses/exclues signés |
| 1. Historiographie | Carte des écoles, récits, controverses, périodisations concurrentes | Au moins 3 synthèses savantes et 2 périodisations comparées |
| 2. Corpus | Registre de sources + fiches de critique | 2 sources indépendantes par fiche, ou exception documentée |
| 3. Inventaire | Base d’événements, acteurs, lieux, processus, institutions | 100 % des domaines de la matrice ont été examinés |
| 4. Périodisation | Périodisation éditoriale + alternatives conservées | Justification de chaque rupture, aucune téléologie |
| 5. Couverture | Matrice périodes × domaines × échelles + registre d’omissions | ≥ 90 % des cellules couvertes ou justifiées |
| 6. Sélection | 10–20 repères centraux, 20–40 étendus, scoring | Équilibre et critères explicites |
| 7. Données | TimeSpan, claims, sources, acteurs, lieux, relations | Aucune date nue ; provenance complète |
| 8. Audit | Double lecture, désaccords, scores, sign-off | Aucun S1 ; score ≥ 80/100 |
| 9. Mise en scène | Frise sémantique, labels, tags, lecteur | Lisibilité testée et accessibilité |
| 10. Publication | Release, changelog, note publique de qualité | Version datée et procédure de correction |

---

## 2. Cadrer le pays

### 2.1. Charte de périmètre

Avant de chercher une seule date, écrire une charte de 2 à 4 pages :

- **Nom du pays et noms historiques** : nom officiel actuel, noms d’époque, endonymes, exonymes, translittérations.
- **Territoire** : frontières actuelles, territoires ultramarins, colonies, protectorats, États prédécesseurs, territoires contestés, régions autonomes.
- **Populations** : nationaux, minorités, peuples autochtones, diasporas, migrations, populations frontalières.
- **Bornes temporelles** : date de début et de fin, justifiées ; règle de mise à jour de la période récente.
- **Unité d’analyse** : la **fiche-événement** ; les processus longs sont traités comme des fiches « processus » ou découpés.
- **Critères d’inclusion et d’exclusion**.
- **Périodisations candidates**.
- **Public et usage** : grand public, scolaire, diasporas, enseignant.
- **Niveau de preuve et seuils de publication**.
- **Gouvernance** : rédacteur, lecteurs, arbitre, data steward, expert sensibilité.

### 2.2. Décision de périmètre

Le périmètre national est **une hypothèse de travail**, pas une évidence. Deux erreurs à éviter :

- projeter les frontières modernes sur le passé ;
- réduire l’histoire du pays à celle de son État.

La frise doit pouvoir afficher une couche « hors cadre » : migrations, diasporas, empires, circulations, organisations internationales.

---

## 3. Cartographier l’historiographie

### 3.1. Carte des récits

Pour chaque pays, produire une fiche :

| Champ | Contenu |
| --- | --- |
| Écoles et courants | Histoire politique, sociale, Annales, histoire culturelle, genre, subaltern studies, histoire globale, histoire environnementale |
| Récits nationaux dominants | Fondation, âge d’or, décadence, renaissance, unification, indépendance |
| Contre-récits | Régionalismes, minorités, diasporas, mémoires contestées |
| Débats structurants | Dates fondatrices, frontières, violences de masse, colonisation, religion, régime politique |
| Périodisations concurrentes | Périodisation officielle, périodisation universitaire, périodisation régionale |
| Angles morts | Classes populaires, femmes, peuples autochtones, minorités religieuses, handicap, migrations |

### 3.2. Règle des trois périodisations

Pour chaque pays, proposer **au moins trois périodisations candidates** :

1. une périodisation **politique** (régimes, souveraineté, guerres) ;
2. une périodisation **sociale/économique** (travail, démographie, techniques) ;
3. une périodisation **culturelle, religieuse ou environnementale**.

La frise publiée en choisit une comme récit principal, mais **conserve les alternatives** dans le dossier d’audit. Une périodisation n’est jamais « naturelle ».

### 3.3. Tests anti-téléologie

- Remplacer « vers », « prémisses de », « annonce de » par des formulations conditionnelles.
- Afficher les alternatives non advenues, les échecs et les bifurcations.
- Distinguer la signification **à l’époque** et la signification **pour nous**.
- Vérifier que le récit ne prépare pas artificiellement le présent.

---

## 4. Construire le corpus de sources

### 4.1. Hiérarchie

| Niveau | Type | Usage |
| --- | --- | --- |
| 1 | Source primaire (archive, traité, chronique, presse d’époque) | Établir un fait, un contexte, une formulation |
| 2 | Synthèse savante (article évalué, monographie universitaire) | Interprétation, sélection, mise en perspective |
| 3 | Ouvrage de référence spécialisé | Terminologie, orientation, périodisation |
| 4 | Encyclopédie généraliste, chronologie en ligne | Point de départ, jamais source probante |

**Règles :**
- Deux sources **indépendantes** par fiche-événement, ou exception documentée.
- Wikipédia et Grokipedia sont des **points d’entrée de lecture**, pas des autorités de validation.
- Aucun contenu génératif n’est une source. Toute aide IA doit être vérifiée et signalée.
- Vérifier la date de la source, de l’édition et du fac-similé.

### 4.2. Registre de sources

Chaque source reçoit un identifiant et les champs : auteur, titre, édition, année, pages, DOI/URL, date de consultation, langue, type, indépendance, fiabilité, usage.

### 4.3. Critique de source

Authenticité, provenance, datation, auteur, contexte de production, cohérence interne, corroboration, transmission, biais. Une source unique ne suffit jamais pour un fait contesté.

---

## 5. Inventorier sans oublier les acteurs et les lieux

### 5.1. Types d’entités à inventorier

| Entité | Exemples | Champs minimaux |
| --- | --- | --- |
| **Événement** | bataille, traité, loi, fondation, catastrophe | date/TimeSpan, acteurs, lieux, type, résumé, sources |
| **Processus** | industrialisation, urbanisation, colonisation, sécularisation | bornes, mécanismes, acteurs, indicateurs, sources |
| **Acteur individuel** | dirigeant, savant, artiste, réformateur, militant | rôles, pouvoirs, contraintes, réseaux, lieux, sources |
| **Acteur collectif** | parti, syndicat, peuple, minorité, armée, Église | composition, intérêts, répertoires d’action, sources |
| **Institution** | État, parlement, université, entreprise, temple | compétences, période, siège, sources |
| **Lieu** | capitale, ville, région, site, frontière, colonie | noms datés, géométrie datée, hiérarchie, sources |
| **Objet mémoriel** | monument, commémoration, musée, loi mémorielle | commanditaire, public, controverse, source |
| **Source** | archive, chronique, traité, article | création, publication, fac-similé, auteur, langue |

### 5.2. Dossier « hommes forts »

Un dirigeant ne doit jamais être une vignette héroïque. Pour chaque figure majeure, documenter :

- **Ressources** : institutionnelles, militaires, économiques, symboliques.
- **Contraintes** : opposition, droit, religion, dépendance extérieure, opinion.
- **Réseaux** : alliés, conseillers, clientèles, adversaires.
- **Contre-pouvoirs** : parlement, tribunaux, Église, syndicats, mouvements sociaux.
- **Bilan** : décisions, réussites, échecs, violences, controverses.
- **Postérité** : mémoire, commémorations, usages politiques.
- **Altérité** : qui n’a pas eu accès à la parole, et pourquoi ?

> Un « grand homme » n’explique pas une période : il est un point d’entrée dans un système de pouvoirs, de contraintes et de représentations.

### 5.3. Dossier « lieux »

- Nom actuel et noms historiques.
- Géométrie et **période de validité** ; ne jamais appliquer une frontière moderne à un événement ancien.
- Hiérarchie : local, régional, national, impérial, transnational.
- Fonctions : capitale, port, frontière, site industriel, lieu de culte, lieu de mémoire.
- Acteurs et événements associés.
- Contestations et récits concurrents.
- Au moins un lieu **hors capitale** par période, ou justification.

### 5.4. Matrice de couverture

Remplir une matrice **périodes × domaines × échelles**. Chaque cellule doit contenir un événement, un acteur, un lieu ou une justification.

| Domaine | Antiquité | Médiéval | Moderne | Contemporain | Aujourd’hui |
| --- | --- | --- | --- | --- | --- |
| Politique & institutions |  |  |  |  |  |
| Guerres & diplomatie |  |  |  |  |  |
| Droit & justice |  |  |  |  |  |
| Économie & travail |  |  |  |  |  |
| Société & démographie |  |  |  |  |  |
| Femmes, genre, sexualités |  |  |  |  |  |
| Religions & croyances |  |  |  |  |  |
| Sciences, techniques & santé |  |  |  |  |  |
| Arts & lettres |  |  |  |  |  |
| Environnement & territoire |  |  |  |  |  |
| Migrations & diasporas |  |  |  |  |  |
| Peuples autochtones & minorités |  |  |  |  |  |
| Mémoire & patrimoine |  |  |  |  |  |
| Circulations transnationales |  |  |  |  |  |

**Statuts de cellule :**
- `couvert` : au moins une fiche, avec acteur/lieu/source.
- `partiel` : fiche présente mais acteur ou lieu manquant.
- `vide justifié` : absence argumentée (période non pertinente, source absente, catégorie non applicable).
- `vide non traité` : **défaut bloquant**.

**Seuils de vigilance — pas des quotas de vérité :**
- événements politiques/militaires ≤ 50 % de la frise ;
- figures d’élite ≤ 30 % des acteurs ;
- au moins une entrée hors capitale par période ;
- au moins une connexion transfrontalière par période ;
- au moins une femme actrice par grande période, ou justification ;
- au moins un groupe minoritaire/colonisé/autochtone par période pertinente, sans tokenisme.

---

## 6. Périodiser

### 6.1. Choix des bornes

Une borne doit être :

- **documentée** par au moins deux synthèses ;
- **nommée** (rupture politique, économique, culturelle, environnementale) ;
- **discutable** : la justification et les alternatives sont conservées ;
- **datée avec précision** : année, mois, jour ou intervalle.

### 6.2. Règles

- Ne pas confondre **date de l’événement**, **date de la source**, **date de la commémoration** et **date de la claim**.
- Ne pas découper une période uniquement pour équilibrer visuellement la frise.
- Conserver les continuités qui traversent les césures.
- Afficher les chevauchements de périodes quand ils existent.

### 6.3. Modèle PeriodO

Chaque période est une **assertion savante** sourcée : libellé, définition, extension temporelle, portée spatiale, source, auteur, statut. Une collection de périodes n’est pas une périodisation cohérente : les deux niveaux doivent être distincts.

---

## 7. Sélectionner les repères

### 7.1. Nombre cible

- **10 à 20 repères centraux** pour la vue d’ensemble.
- **20 à 40 repères étendus** pour la frise complète.
- Au-delà, prévoir un mode « inventaire exhaustif » distinct de la frise narrative.

### 7.2. Grille de signification

Noter chaque candidat de 0 à 4 :

| Critère | Question |
| --- | --- |
| Impact structurel | L’événement modifie-t-il des institutions, des rapports de force ou des structures ? |
| Portée | Combien de personnes, de territoires, de groupes sont concernés ? |
| Durée | Les effets durent-ils des décennies ou des siècles ? |
| Rupture / nouveauté | Introduit-il une discontinuité réelle ? |
| Résonance documentaire et mémorielle | Est-il attesté, discuté, commémoré, contesté ? |
| Valeur explicative | Aide-t-il à comprendre d’autres événements ou processus ? |

**Correction d’équilibre :** vérifier ensuite la distribution par domaine, période, échelle, genre, groupe social et lieu. Un score élevé ne dispense pas de corriger un déséquilibre systémique.

### 7.3. Fiche-événement

Chaque fiche contient : identifiant, titre court, sous-titre, date/TimeSpan, type, acteurs, lieux, tags, importance, résumé, critères de sélection, sources, claims, controverses, relations (cause, conséquence, parallèle, commémoration), statut.

### 7.4. Relations

- **Causes / conséquences** : documentées, pas déduites automatiquement.
- **Parallèles** : même période, autre pays ou domaine.
- **Appartenance** : événement dans un processus.
- **Commémoration** : événement mémoriel distinct de l’événement commémoré.
- **Contestation** : claims concurrentes conservées.

---

## 8. Qualifier les données

### 8.1. Le temps comme intervalle

Utiliser des `TimeSpan` inspirés de CIDOC CRM et EDTF :

- `edtf` : `1789`, `1789-07`, `1789-07-14`, `1789/1799`, `1789~`, `1789?` ;
- `calendar` et `calendar_original` ;
- `precision` : jour, mois, année, décennie, siècle, indéterminé ;
- `certainty` : certain, probable, possible, incertain, disputé ;
- bornes intérieure/extérieure (`inner_start`, `inner_end`, `outer_start`, `outer_end`) ;
- **rôle de la date** : événement, création de source, publication, fac-similé, commémoration, validité de claim, attestation de lieu, validité de géométrie.

**Interdit :** une date sans rôle et sans source.

### 8.2. Claim-first

Ne pas stocker un « fait » isolé. Stocker :

- une **claim** (sujet, prédicat, objet, texte) ;
- ses **sources** ;
- son **auteur** / son statut ;
- sa **valeur de croyance** ;
- sa **période de validité** ;
- ses **révisions**.

Deux claims contradictoires ne sont jamais fusionnées silencieusement. Elles sont signalées comme `disputed`.

### 8.3. Provenance

Chaque entité doit avoir : identifiant persistant, source(s), auteur de la saisie, date de saisie, méthode, version, licence. Les releases sont versionnées et archivées.

### 8.4. Lieux attestés

Un lieu n’est pas un point moderne. Stocker :

- toponymes datés ;
- géométries valides par période ;
- hiérarchie ;
- source de chaque nom et de chaque géométrie ;
- incertitude et méthode (gazetteer moderne, reconstruction, source primaire).

---

## 9. Audit expert

### 9.1. Rôles

| Rôle | Mission |
| --- | --- |
| Rédacteur | Produit les fiches et le registre de sources |
| Lecteur pays | Expertise historiographique et factualité |
| Lecteur méthode | Chronologie, sources, incertitude, cohérence |
| Arbitre | Tranche les désaccords, ne rédige pas |
| Data steward | Versionnage, provenance, qualité des données |
| Expert sensibilité | Contenus coloniaux, génocides, frontières, minorités |
| Éditeur responsable | Décision de publication |

### 9.2. Double lecture

- 100 % des fiches sensibles et à source unique ;
- 25 % des autres fiches, échantillon stratifié ;
- codage indépendant, puis concertation ;
- kappa de Cohen ≥ 0,70 (≥ 0,80 sur les catégories sensibles) ;
- si kappa < 0,60 : arrêt, formation, recodage.

### 9.3. Types de désaccords

| Type | Objet | Règlement |
| --- | --- | --- |
| F1 factuel | date, acteur, lieu, issue | vérification à la source |
| F2 sources divergentes | sources contradictoires | critique de source, corroboration |
| F3 interprétatif | signification, causalité, périodisation | panel / Delphi |
| F4 normatif | nommage, qualification, mémoire | expert sensibilité + juriste |
| F5 éditorial | longueur, granularité | décision éditoriale |

### 9.4. Delphi

Pour les questions structurelles, pas pour vérifier une date :

- 7 à 15 experts, diversité institutionnelle et géographique ;
- 2 à 3 tours anonymes avec feedback contrôlé ;
- seuil de consensus pré-enregistré, par exemple ≥ 75 % de notes 4–5/5 et IQR ≤ 1 ;
- les positions minoritaires sont publiées si le consensus n’est pas atteint.

### 9.5. Notation

| Dimension | Poids | Objet |
| --- | ---: | --- |
| Couverture | 20 % | matrice périodes × domaines × échelles |
| Exactitude | 30 % | dates, acteurs, lieux, causalité, citations |
| Équilibre | 15 % | pluralité, proportionnalité, absences |
| Provenance | 20 % | deux sources indépendantes, pages, critique |
| Lisibilité | 15 % | conventions, incertitude, accessibilité |

**Score global = 0,20 C + 0,30 E + 0,15 B + 0,20 P + 0,15 L**.

| Niveau | Score | Décision |
| --- | ---: | --- |
| A | ≥ 85 | publication |
| B | 80–84,9 | publication conditionnelle + plan de correction |
| C | 70–79,9 | révision majeure |
| D | < 70 | refonte |

**Erreurs bloquantes S1 :** fait inventé, date/acteur/lieu faux, citation qui ne soutient pas l’affirmation, anachronisme structurant, plagiat, cadrage discriminatoire, désaccord factuel présenté comme certitude.

---

## 10. Mise en scène temporelle

Une frise n’est pas un dump de données. La méthode distingue :

| Niveau | Contenu |
| --- | --- |
| **Vue d’ensemble** | 10–15 repères, ères, continuités majeures, acteurs structurels |
| **Vue pays** | 20–40 repères, tags, liens, lieux |
| **Vue zoom** | événements secondaires, processus, sources, incertitudes |
| **Vue inventaire** | corpus complet, exportable, filtrable |

Règles :

- labels prioritaires, pas de collision ;
- pas de fausse précision graphique ;
- incertitude visible ;
- tags comme lentilles, pas comme vérité ;
- un clic = un dossier (contexte, acteurs, lieux, sources, controverses) ;
- toujours un lien vers la source ;
- accessibilité : liste alternative, clavier, contraste, réduction des animations.

---

## 11. Publier et maintenir

### 11.1. Dossier de publication

- frise ;
- charte de périmètre ;
- note méthodologique ;
- registre de sources ;
- matrice de couverture ;
- registre des omissions ;
- journal des désaccords ;
- rapport d’audit ;
- note publique de qualité ;
- changelog ;
- licence et citation ;
- contact de correction.

### 11.2. Versions

- **Majeure** : changement de périmètre, de périodisation ou de corpus structurant → ré-audit complet.
- **Mineure** : ajout de fiches, corrections substantielles → audit ciblé.
- **Corrective** : coquilles, liens, formats → contrôle éditorial.
- Chaque release est immuable et archivée.

### 11.3. Délais de correction

- S1 : 7 jours ;
- S2 : 30 jours ;
- S3 : prochaine version.

### 11.4. Note publique

Formulation recommandée : « Frise auditée selon le protocole v1.0 le [date] ; échantillon de X fiches ; points disputés signalés. »  
À éviter : « exhaustive » ou « certifiée exacte ».

---

## 12. Application à Vectemporel

### 12.1. Ce qui est déjà en place

- 196 pays dans l’atlas, 10 pays disponibles, 186 audits à venir.
- 229 événements, 8 tags couvrant 8 des 14 domaines de la méthode ; 6 domaines ne sont pas instrumentés.
- Un audit éditorial prose pour 10 pays dans `COUNTRY_AUDITS.md`.
- Une liste complète dans `COUNTRIES.md`.
- Un validateur de liens Grokipedia (`npm run verify`).
- Un **audit structurel automatisé** des frises (`npm run audit:timeline`), qui produit `TIMELINE_AUDIT.md`.
- Des **gabarits opérationnels** dans `templates/` : dossier pays, fiche-événement, matrice de couverture, registre de sources.

**Dernier état mesuré** (audit structurel) : **229 repères**, **120/120 contrôles d’intégrité**, **27,6/100 de complétude cible**, **49 % de couverture tags × ères**, **10/10 pays au-dessus du seuil politique/guerre**. Les **10 dossiers pays** sont produits : **200 sources enregistrées et testées**, **180 propositions**, **148 omissions** ; **121 corrections et 40 ajouts** sont intégrés. Autrement dit : la couche documentaire et une première passe de correction sont là, mais le schéma de preuve des fiches-événements reste à construire.

### 12.2. Ce qui manque pour passer en v2

- champs **acteurs** et **lieux** dans chaque événement ;
- **TimeSpan** avec précision, calendrier, incertitude ;
- **sources indépendantes** distinctes de la page Grokipedia ;
- **claims** et controverses ;
- **registre d’omissions** par pays ;
- **audit expert** signé (double lecture, kappa) ;
- **matrice de couverture** remplie pour chaque pays.

**Priorité :** remplir le gabarit `templates/country-audit.yaml` pour les 10 pays pilotes, puis instrumenter le schéma de données avant d’ouvrir de nouveaux pays.

### 12.3. Fichiers opérationnels

- `templates/country-audit.yaml` — dossier pays complet.
- `templates/event-record.yaml` — fiche-événement.
- `templates/coverage-matrix.csv` — matrice de couverture.
- `templates/source-register.csv` — registre de sources.
- `templates/omissions.yaml` — registre des omissions explicites.
- `templates/country-proposals.yaml` — file de revue des propositions.
- `audits/<pays>/` — dossiers de première version des 10 pays pilotes.
- `scripts/audit-timeline.mjs` — contrôle structurel et rapport.
- `scripts/check-audit-dossiers.mjs` — contrôle des six livrables d’un dossier pays.
- `scripts/verify-sources.mjs` — vérification DOI/URL des registres de sources.
- `TIMELINE_AUDIT.md` — rapport généré.
- `SOURCE_VERIFICATION.md` — vérification des 200 sources.
- `AUDIT_SYNTHESIS.md` — synthèse comparative des 10 dossiers.
- `INTEGRATION_REPORT.md` — corrections et ajouts effectivement intégrés.
- `TODO_INTEGRATION.md` — suivi de l’intégration.

---

## 13. Corpus scientifique de référence

> Les liens ont été vérifiés lors de la recherche (novembre 2026). Certains textes sont payants ; la référence reste exacte. Les sources sont classées par fonction, pas par prestige.

### 13.1. Temps, périodisation, récit national

| Référence | Apport pour la méthode |
| --- | --- |
| Braudel, F. (1958). « Histoire et sciences sociales : La longue durée ». *Annales* 13(4), 725–753. [DOI](https://doi.org/10.3406/ahess.1958.2781) | Distinguer événement, conjoncture, structure ; refuser une temporalité unique. |
| Koselleck, R. (1979/2016). *Le futur passé*. Éditions de l’EHESS. [Notice](https://editions.ehess.fr/fr/ouvrages/ouvrage/le-futur-passe/) | Espace d’expérience et horizon d’attente ; temporalités hétérogènes. |
| Hartog, F. (2003). *Régimes d’historicité*. Seuil. [Notice](https://www.seuil.com/ouvrage/regimes-d-historicite-presentisme-et-experiences-du-temps-francois-hartog/9782020593281) | Expliciter le rapport passé/présent/futur que la frise présuppose. |
| Nora, P. (1989). « Between Memory and History: Les Lieux de Mémoire ». *Representations* 26, 7–24. [DOI](https://doi.org/10.2307/2928520) | Traiter lieux et commémorations comme constructions mémorielles. |
| Wimmer, A., & Glick Schiller, N. (2002). « Methodological Nationalism and Beyond ». *Global Networks* 2(4), 301–334. [DOI](https://doi.org/10.1111/1471-0374.00043) | Ne pas naturaliser la nation comme unité d’analyse. |
| Berger, S., & Conrad, C. (2015). *The Past as History*. Palgrave Macmillan. [Notice](https://link.springer.com/book/9780230500099) | Identifier les topoï du récit national et les institutions qui les canonisent. |
| Seixas, P., & Morton, T. (2013). *The Big Six Historical Thinking Concepts*. Nelson. [Archive](https://archive.org/details/bigsixhistorical0000seix) | Raisonner la signification, les causes, les continuités et les preuves. |
| Chakrabarty, D. (2009). « The Climate of History: Four Theses ». *Critical Inquiry* 35(2), 197–222. [DOI](https://doi.org/10.1086/596640) | Ajouter une temporalité environnementale et planétaire. |

### 13.2. Histoire sociale, genre, mémoire, critique du récit héroïque

| Référence | Apport |
| --- | --- |
| Thompson, E. P. (1963). *The Making of the English Working Class*. Penguin. [Notice](https://www.penguin.co.uk/books/13539/the-making-of-the-english-working-class-by-thompson-e-p/9780141976952) | Les classes populaires comme acteurs et expériences collectives. |
| Scott, J. W. (1986). « Gender: A Useful Category of Historical Analysis ». *AHR* 91(5), 1053–1075. [DOI](https://doi.org/10.1086/ahr/91.5.1053) | Le genre comme rapport de pouvoir transversal. |
| Perrot, M. (1998). *Les femmes ou les silences de l’histoire*. Flammarion. [Notice](https://editions.flammarion.com/les-femmes-ou-les-silences-de-lhistoire/9782080489920) | Chercher les traces et documenter les silences. |
| Trouillot, M.-R. (1995). *Silencing the Past*. Beacon Press. [Notice](https://www.penguinrandomhouse.com/books/246609/silencing-the-past-by-michel-rolph-trouillot/) | Le silence est produit par des rapports de pouvoir. |
| Spivak, G. C. (1988). « Can the Subaltern Speak? ». In *Marxism and the Interpretation of Culture*. [Notice](https://www.press.uillinois.edu/books?id=p014017) | Ne pas parler à la place des dominés ; expliciter les médiations. |
| Wolfe, P. (2006). « Settler Colonialism and the Elimination of the Native ». *Journal of Genocide Research* 8(4), 387–409. [DOI](https://doi.org/10.1080/14623520601056240) | Inscrire la dépossession dans la longue durée, pas seulement à la conquête. |
| Subrahmanyam, S. (1997). « Connected Histories ». *Modern Asian Studies* 31(3), 735–762. [DOI](https://doi.org/10.1017/S0026749X00017133) | Circulations et histoires connectées contre le vase clos national. |
| Guha, R. (1983). *Elementary Aspects of Peasant Insurgency in Colonial India*. Duke UP. [Notice](https://www.dukeupress.edu/elementary-aspects-of-peasant-insurgency-in-colonial-india) | Révoltes rurales, conscience politique et savoirs subalternes. |

### 13.3. Données, temps, lieux, provenance

| Référence | Apport |
| --- | --- |
| Golden, P., & Shaw, R. (2016). « Nanopublication beyond the sciences: the PeriodO period gazetteer ». *PeerJ CS* 2, e44. [DOI](https://doi.org/10.7717/peerj-cs.44) | La période est une assertion savante sourcée. |
| CIDOC CRM SIG (2024). *CIDOC CRM 7.1.3*. [Spécification](https://cidoc-crm.org/Version/version-7.1.3) | Événements, TimeSpan, sources, incertitude. |
| CIDOC CRM SIG (2026). *CRMinf 1.2.1*. [Spécification](https://cidoc-crm.org/crminf/) | Claims, argumentation, croyance, révision. |
| Linked Pasts (2024). *Linked Places Format 1.3*. [Spécification](https://github.com/LinkedPasts/linked-places-format) | Lieux attestés, noms et géométries datés. |
| Grossner, K., Grunewald, S., & Mostern, R. (2023). « Bringing places from the distant past to the present ». *IJDL* 24(3). [DOI](https://doi.org/10.1007/s00799-022-00341-2) | Gazetteer historique, réconciliation, provenance. |
| Plewe, B. (2002). « The nature of uncertainty in historical geographic information ». *Transactions in GIS* 6(4), 431–456. [DOI](https://doi.org/10.1111/1467-9671.00121) | Incertitude du phénomène vs de l’assertion. |
| Kaše, V., Sobotková, A., & Heřmánková, P. (2023). « Modeling temporal uncertainty in historical datasets ». CHR 2023. [PDF](https://ceur-ws.org/Vol-3558/paper5123.pdf) | Intervalle, point médian, biais des dates fabriquées. |
| Library of Congress (2019). *EDTF*. [Spécification](https://www.loc.gov/standards/datetime/) | Dates incertaines, approximatives, intervalles ouverts. |
| Lebo, T., Sahoo, S., & McGuinness, D. (2013). *PROV-O*. W3C. [Spécification](https://www.w3.org/TR/prov-o/) | Provenance, révision, génération. |
| Wilkinson, M. D., et al. (2016). « The FAIR Guiding Principles ». *Scientific Data* 3, 160018. [DOI](https://doi.org/10.1038/sdata.2016.18) | Identifiants, métadonnées, licence, provenance. |
| Brehmer, M., et al. (2017). « Timelines revisited ». *IEEE TVCG* 23(9), 2151–2164. [DOI](https://doi.org/10.1109/TVCG.2016.2614803) | Espace de conception des frises : représentation, échelle, disposition. |

### 13.4. Audit, consensus, qualité

| Référence | Apport |
| --- | --- |
| Hasson, F., Keeney, S., & McKenna, H. (2000). « Research guidelines for the Delphi survey technique ». *JAN* 32(4), 1008–1015. [DOI](https://doi.org/10.1046/j.1365-2648.2000.t01-1-01567.x) | Cadre du Delphi. |
| Diamond, I. R., et al. (2014). « Defining consensus ». *J Clin Epidemiol* 67(4), 401–409. [DOI](https://doi.org/10.1016/j.jclinepi.2013.12.002) | Critères de reporting et seuils de consensus. |
| Landis, J. R., & Koch, G. G. (1977). « The measurement of observer agreement for categorical data ». *Biometrics* 33(1), 159–174. [DOI](https://doi.org/10.2307/2529310) | Kappa et fiabilité de la double lecture. |
| Howell, M. C., & Prevenier, W. (2001). *From Reliable Sources*. Cornell UP. [Notice](https://www.cornellpress.cornell.edu/book/9780801485602/from-reliable-sources/) | Critique externe et interne des sources. |
| Geddes, B. (1990). « How the cases you choose affect the answers you get ». *Political Analysis* 2, 131–150. [DOI](https://doi.org/10.1093/pan/2.1.131) | Biais de sélection des cas et des absences. |
| Conseil de l’Europe (2001). *Recommendation Rec(2001)15 on History Teaching*. [Texte](https://rm.coe.int/0900001680909e91) | Multiperspectivité, sources, questions controversées. |

---

## 14. Checklist finale

### Périmètre
- [ ] Nom, territoire, populations et diasporas définis.
- [ ] Bornes temporelles justifiées.
- [ ] Territoires contestés et héritages impériaux nommés.

### Périodes
- [ ] Trois périodisations candidates comparées.
- [ ] Chaque rupture est sourcée.
- [ ] Aucune téléologie.
- [ ] Alternatives conservées.

### Sources
- [ ] Deux sources indépendantes par fiche, ou exception.
- [ ] Grokipedia/Wikipédia non utilisés comme autorité.
- [ ] Dates de source, d’édition et de fac-similé distinctes.
- [ ] Registre de sources complet.

### Acteurs
- [ ] Dirigeants documentés par leurs contraintes et réseaux.
- [ ] Femmes, minorités, autochtones, diasporas et classes populaires inclus.
- [ ] Pas de tokenisme ; absence justifiée.
- [ ] Acteurs collectifs et institutions représentés.

### Lieux
- [ ] Au moins un lieu hors capitale par période.
- [ ] Noms et géométries datés.
- [ ] Pas de frontières modernes rétroprojectées.
- [ ] Lieux de mémoire traités comme objets d’histoire.

### Temps et données
- [ ] TimeSpan, calendrier, précision, incertitude.
- [ ] Claims sourcées et révisables.
- [ ] Provenance, version, licence.
- [ ] Aucune date nue.

### Audit
- [ ] Double lecture et kappa.
- [ ] Désaccords documentés.
- [ ] Aucun S1.
- [ ] Score ≥ 80/100.
- [ ] Note publique de qualité.
- [ ] Changelog et procédure de correction.

---

**Conclusion.** La méthode ne promet pas une frise sans oubli. Elle garantit qu’aucun oubli ne soit **silencieux** : chaque période, chaque acteur, chaque lieu, chaque source et chaque incertitude a une place, et chaque absence peut être auditée.
