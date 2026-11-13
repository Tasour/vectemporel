# Chine — rapport d’audit v1.0

**Périmètre audité.** Objet `china` de `data.js` : domaine -1600 → 2026, 5 ères, 13 repères, 7 tags. Audit structurel de référence : intégrité 12/12, couverture tags × ères 28 %, politique/guerre 77 %, ère « République et révolutions » vide, aucun champ acteur, lieu, source, claim ou TimeSpan. Date de consultation : 2026-11-13. Audit non signé ; `verdict: pending`, scores `null`.

**Ce que ce dossier établit.** La frise chinoise est un récit politique dynastique cohérent, mais ce n’est pas encore une frise historique au sens de la méthode : 0 cellule de la matrice est « couverte » (fiche avec acteur, lieu et source), 51 sont « partielles » et 19 « non traitées ». Les 13 repères existants n’ont ni acteurs, ni lieux, ni sources structurées. Le problème principal n’est donc pas l’exactitude des grandes dates, mais l’absence de preuve, de pluralité sociale et de périodisation fine.

## 1. Verdict de périodisation

**Verdict : révision majeure, pas de validation en l’état.** Les cinq macro-ères sont utilisables pour la navigation, mais elles ne constituent pas une périodisation savante : elles mélangent des ruptures politiques, des durées impériales et des téléologies nationales.

### 1.1. Les cinq ères actuelles

| Ère | Bornes | Ce qui tient | Ce qui ne tient pas |
| --- | --- | --- | --- |
| Dynasties fondatrices | -1600/-221 | Shang et Zhou sont des repères majeurs ; l’écriture oraculaire et le mandat du Ciel structurent la culture politique. | « Fondatrices » est téléologique ; -1600 est une convention, pas une date certaine ; la période couvre 1 379 ans et ignore les Royaumes combattants comme système politique. |
| Empire unifié | -221/1912 | L’unification Qin et l’abdication Qing encadrent bien l’histoire impériale. | 2 133 ans en une ère : les divisions de 220-589, 907-960 et 1127-1279, les régimes concurrents et les conquêtes sont effacés. « Unifié » est une prétention, pas une continuité. |
| République et révolutions | 1912/1949 | La séquence est pertinente : chute de l’empire, parti-État, guerre sino-japonaise, guerre civile. | Elle est **vide dans les données**. C’est le défaut le plus grave : la période qui explique 1949 n’a aucun repère. |
| Chine populaire | 1949/1978 | La fondation de la RPC et le troisième plénum de 1978 encadrent une séquence politique distincte. | Une seule fiche (cn-1949) pour 29 ans ; la famine, la Révolution culturelle, le hukou et les campagnes de masse sont absents. |
| Réforme et puissance | 1978/2026 | L’ouverture et la croissance sont centrales. | Une seule fiche (cn-deng) pour 48 ans ; 1989, 1997, 2001, 2008 et 2020 sont absents. Le label « puissance » est téléologique. |

### 1.2. Cinq périodisations comparées

1. **Politique (actuelle, POL-1).** Souveraineté, dynasties, régimes. Lisible, mais survalorise la continuité de l’État et la capitale.
2. **Dynastique et impériale (POL-2).** Shang, Zhou, Qin, Han, divisions, Sui-Tang, Song, Yuan, Ming, Qing. Plus fidèle aux institutions impériales, mais masque les continuités sociales.
3. **République et révolutions (POL-3).** 1895-1949 comme séquence autonome (défaite sino-japonaise, réformes, révolution, parti-État, guerre, guerre civile) ; à l’intérieur, 1912-1927, 1927-1937, 1937-1949. Plus fidèle à la République et à la guerre.
4. **Sociale/économique (SOC-1).** Révolution commerciale Song, croissance démographique Qing, industrialisation tardive, collectivisation, réformes, urbanisation. Fait apparaître les paysans, les migrants et les inégalités.
5. **Culturelle/religieuse/environnementale (CULT-1).** Bouddhisme, synthèse néo-confucéenne, sécularisation, Révolution culturelle, recompositions religieuses, crises du fleuve Jaune et pollution. Fait apparaître les croyances et la nature.

**Recommandation.** Conserver les cinq macro-ères pour l’interface, mais : (a) renommer l’ère 1 « Shang, Zhou et Royaumes combattants » ; (b) renommer l’ère 2 « Empires et divisions » et y ajouter des sous-périodes Qin-Han / Division / Sui-Tang / Song-Yuan / Ming-Qing ; (c) remplir l’ère 3 avec les propositions 001-009 ; (d) sous-périodiser les ères 4 et 5 (1949-1957, 1958-1965, 1966-1976 ; 1978-1992, 1992-2001, 2001-2012, 2012-2026). Le nombre d’ères peut rester à cinq : ce sont les sous-périodes qui portent la précision historique.

### 1.3. La borne de -1600 et les « dynasties fondatrices »

-1600 est la date conventionnelle du début des Shang dans les chronologies traditionnelles et dans le projet Xia-Shang-Zhou. Elle n’est pas une date d’archive : les plus anciennes écritures chinoises abondantes sont les os oraculaires d’Anyang, vers -1250. L’identification d’Erlitou (vers -1900/-1500) comme capitale Xia ou Shang reste contestée. La frise devrait écrire « vers -1600 » avec une certitude `probable` ou `disputed`, et présenter la Xia comme une entité débattue, pas comme un fait établi (SRC-001).

« Dynasties fondatrices » projette une origine nationale sur un millénaire et demi de formations politiques diverses : cités-États, royautés Zhou, principautés des Royaumes combattants, peuples non-Han. Le label doit être remplacé, pas seulement daté.

## 2. Angles morts et biais de sélection

### 2.1. Le biais politique et militaire

10 des 13 repères sont politiques ou militaires (77 %), alors que la méthode fixe un seuil de vigilance à 50 %. Les domaines sociaux, économiques, environnementaux et mémoriels sont sous-instrumentés :

- **Femmes** : aucune femme n’est nommée dans les 13 repères. Qiu Jin, Soong Ching-ling, Ding Ling, les femmes rurales et les femmes du 4 Mai sont absentes.
- **Minorités** : les Mongols et les Mandchous apparaissent seulement comme dynasties (Yuan, Qing), pas comme populations ; le Tibet, le Xinjiang, le Guangxi zhuang et la Mongolie-Intérieure n’ont aucun repère.
- **Paysans et travailleurs** : la réforme agraire, les communes, la famine, les ouvriers de Shanghai et les mingong sont absents ou réduits à des conséquences économiques.
- **Environnement** : aucune fiche sur le fleuve Jaune, la déforestation, les Trois Gorges, la pollution ou le climat. La crue de 1938 est la seule proposition dont l’environnement est le cœur.
- **Migrations** : aucune fiche sur les migrations han vers le sud, les Chinois d’outre-mer, le hukou, l’exode rural ou les diasporas.
- **Mémoire** : Nanjing, la famine, la Révolution culturelle et 1989 ne sont pas traités comme objets mémoriels ; les commémorations et la censure sont absentes.
- **Sciences et santé** : une seule fiche (cn-song) pour les techniques ; la médecine, les mathématiques, les Deux Bombes, les médecins aux pieds nus et la COVID-19 sont absents.

### 2.2. Le trou de 1912-1949

L’ère 3 est vide, alors qu’elle contient : la chute des Qing, la République de Nanjing, la Seconde Révolution, la Nouvelle Culture, le 4 Mai, la fondation du PCC, la purge de Shanghai, la décennie de Nanjing, Mukden, la Longue Marche, Yan’an, la guerre sino-japonaise, Nanjing, la crue de 1938 et la guerre civile. Le dossier propose neuf fiches pour cette seule ère (PROP-001 à PROP-009). C’est la priorité absolue.

### 2.3. Le saut 1978-2026

Une seule fiche pour 48 ans. Manquent 1989, la rétrocession de Hong Kong, l’entrée à l’OMC, les Jeux de 2008, le séisme du Sichuan, la Belt and Road, la pandémie de 2020, les protestations de 2022 et les politiques de sécurité contestées au Xinjiang et à Hong Kong. La frise donne donc l’image d’une croissance sans ruptures, ce qui est un biais téléologique majeur.

### 2.4. Les récits à ne pas naturaliser

- **« Siècle d’humiliation »** : catégorie nationaliste chinoise utile pour comprendre les mobilisations, pas un cadre neutre. La guerre de l’opium doit être décrite par ses clauses, ses acteurs et l’agency chinoise (Lin Zexu, négociateurs, marchands), pas seulement comme une agression unilatérale.
- **« Empire unifié »** : l’unité est intermittente ; les conquêtes Qing, Yuan et Ming sont des processus violents, pas des retours naturels à l’ordre.
- **« Cinq mille ans de civilisation »** : récit de continuité ; il faut distinguer les cultures néolithiques, Erlitou, Shang, Zhou et les formations impériales.
- **Traités inégaux et ports ouverts.** La frise ne retient que 1839-1842. Le corpus des traités (Nanjing 1842, Tianjin 1858, Pékin 1860, Shimonoseki 1895, protocole Boxer 1901) et l’ouverture des ports (Shanghai, Guangzhou, Xiamen, Fuzhou, Ningbo, puis d’autres) structurent un siècle de relations inégales ; ils doivent être traités comme un processus, avec les concessions, les douanes et les missionnaires (SRC-001).
- **« Peuple chinois »** : la catégorie Han elle-même est le produit d’une histoire, et la classification des 56 nationalités date des années 1950 (SRC-020).

## 3. Propositions d’événements (12–18)

18 propositions, dont 9 pour l’ère 1912-1949, 4 pour 1949-1978, 5 pour 1978-2026. Au moins six sont hors politique/guerre (Nouvelle Culture, loi sur le mariage, enfant unique, crue de 1938, OMC, COVID), au moins quatre concernent des femmes ou des groupes minorisés (4 Mai, mariage, enfant unique, Tibet), et trois portent sur l’environnement ou la mémoire (crue de 1938, Nanjing, Tiananmen). Les lieux proposés incluent Nanjing, Shanghai, Wuhan, Chongqing, Yan’an, Hong Kong, Lhassa, Ürümqi et Nanning, soit onze lieux hors de Pékin sur douze.

| ID | Date | Titre | Domaines | Sources |
| --- | --- | --- | --- | --- |
| PROP-001 | 1912-1913 | République de Chine et Seconde Révolution | politique, guerre | SRC-002, SRC-001 |
| PROP-002 | 1915-1923 | Mouvement de la Nouvelle Culture | arts, politique, sciences | SRC-003, SRC-001 |
| PROP-003 | 1919-05-04 | Mouvement du 4 Mai | politique, arts | SRC-003, SRC-001 |
| PROP-004 | 1921-07 | Fondation du PCC | politique | SRC-002, SRC-001 |
| PROP-005 | 1927-04-12 | Purge de Shanghai | politique, guerre | SRC-002, SRC-001 |
| PROP-006 | 1931-1945 | Guerre sino-japonaise | guerre, politique | SRC-004, SRC-002 |
| PROP-007 | 1934-1935 | Longue Marche et Yan’an | guerre, politique | SRC-006, SRC-001 |
| PROP-008 | 1937-1938 | Massacre de Nanjing | guerre, mémoire | SRC-005, SRC-004 |
| PROP-009 | 1938-06 | Crue du fleuve Jaune | guerre, environnement, société | SRC-017, SRC-004 |
| PROP-010 | 1950-05-01 | Loi sur le mariage | droit, femmes, société | SRC-011, SRC-001 |
| PROP-011 | 1951-05-23 | Accord en dix-sept points sur le Tibet | politique, minorités, religion | SRC-016, SRC-001 |
| PROP-012 | 1958-1962 | Grand Bond et Grande Famine | économie, société, environnement | SRC-009, SRC-010, SRC-008 |
| PROP-013 | 1966-1976 | Révolution culturelle | politique, société, mémoire | SRC-007, SRC-008 |
| PROP-014 | 1979-2015 | Politique de l’enfant unique | femmes, droit, société | SRC-012, SRC-001 |
| PROP-015 | 1989-06-04 | Tiananmen 1989 | politique, mémoire | SRC-018, SRC-001 |
| PROP-016 | 1997-07-01 | Rétrocession de Hong Kong | politique, transnational | SRC-013, SRC-001 |
| PROP-017 | 2001-12-11 | Entrée à l’OMC | économie, transnational | SRC-014, SRC-013 |
| PROP-018 | 2020-01-23 | Confinement de Wuhan | sciences, société, transnational | SRC-019 (source unique, exception) |

**Sélection.** Les propositions privilégient les ruptures structurelles, la couverture des ères vides, les groupes sociaux absents et les lieux hors Pékin. Elles ne prétendent pas à l’exhaustivité : le registre des omissions (OM-001 à OM-015) documente les manques restants, notamment le hukou, les migrations, les guerres de la période maoïste, les sciences, les arts et l’environnement contemporain. Les tags `droit`, `femmes`, `societe`, `environnement`, `minorites`, `memoire` et `transnational` ne sont pas encore instrumentés dans l’application : leur ajout est une condition de publication.

## 4. Corrections des événements existants

| Repère | Problème | Correction proposée | Sources |
| --- | --- | --- | --- |
| cn-shang | -1600 présenté comme certain ; débat Xia/Erlitou et Anyang absent. | « Vers -1600 », certitude probable/disputée ; ajouter Anyang et les os oraculaires (vers -1250). | SRC-001 |
| cn-zhou | -1046 conventionnel ; « longue domination » masque -771 et les Royaumes combattants. | Distinguer Zhou occidentaux/orientaux ; ajouter Muye et -771 ; présenter le mandat du Ciel comme légitimation. | SRC-001 |
| cn-qin | « Premiers grands travaux défensifs » suggère une création ex nihilo de la Grande Muraille. | Qin relie et étend des murs antérieurs ; ajouter standardisation, recensement, routes, brièveté du régime. | SRC-001 |
| cn-han | « Ouvrent les routes » confond -206 et les missions de Zhang Qian (138-126 av. J.-C.) ; papier attribué à tout le Han. | Dater l’ouverture vers -130 ; distinguer Han occidentaux/orientaux ; préciser Cai Lun (vers 105 apr. J.-C.). | SRC-001 |
| cn-tang | « Âge d’or » et « apogée » évaluatifs ; An Lushan (755-763) absent. | Qualifier le label ; ajouter An Lushan, raids tibétains, chute de 907. | SRC-001 |
| cn-song | « Développent » l’imprimerie, la poudre et la boussole surestime l’invention song ; la Chine n’est pas unifiée. | « Perfectionnent et diffusent » ; distinguer Song du Nord/Sud, Liao, Jin, Xia occidentaux. | SRC-001 |
| cn-yuan | « Intègre la Chine à l’empire mongol » en 1271 : l’empire est déjà fragmenté ; conquête du Sud en 1279. | « Khanat Yuan, successeur de l’empire mongol » ; ajouter 1279. | SRC-001 |
| cn-ming | « Restaurent un pouvoir chinois » reprend un récit ethnique ; Cité interdite non datée. | Nuancer la restauration ; dater 1406-1420 et Zheng He 1405-1433 ; distinguer interdiction maritime et commerce réel. | SRC-001 |
| cn-qing | « Étend l’empire » et « réformes tardives » vagues ; conquête 1644-1662/1683 non datée. | Ajouter 1683, Xinjiang 1755-1759, autorenforcement 1861-1895, Nouvelles Politiques 1901-1911. | SRC-001 |
| cn-opium | Le traité ouvrirait le commerce de l’opium ; « siècle d’humiliation » présenté comme fait neutre. | Préciser les cinq ports, Hong Kong, l’indemnité ; l’opium n’est légalisé qu’en 1858 ; attribuer le récit national. | SRC-001 |
| cn-1911 | Confond Wuchang (10 octobre 1911), République (1er janvier 1912) et abdication (12 février 1912). | Remplacer par PROP-001 ou par une fiche 1911-1912 ; ajouter Sun, Yuan, Nanjing. | SRC-002, SRC-001 |
| cn-1949 | Compresse 1949-1978 ; victoire présentée comme achevée en 1949. | Dater le 1er octobre 1949 ; ajouter retraite du KMT à Taïwan, réforme agraire 1950-1952, famine, Révolution culturelle. | SRC-001, SRC-008 |
| cn-deng | 1978 sans le troisième plénum (décembre) ; conclusion téléologique « puissance industrielle mondiale ». | Dater décembre 1978 ; ajouter 1989, 1997, 2001, 2020. | SRC-013, SRC-014 |

**Correction transversale.** Les 13 fiches doivent recevoir un `TimeSpan` (précision, certitude, calendrier), des acteurs, des lieux datés, deux sources indépendantes et des claims. La correction n’est pas seulement rédactionnelle : elle change le schéma de données.

**Erreur bloquante S1 identifiée.** `cn-1911` situe la proclamation de la République en 1911 ; elle a lieu le 1er janvier 1912. Cette erreur de date justifie à elle seule que la frise ne soit pas publiée en l’état. Le verdict du dossier reste `pending` parce que la double lecture n’a pas eu lieu, mais la correction est prioritaire (SRC-002, SRC-001).

## 5. Acteurs et lieux à ajouter

### 5.1. Acteurs (12)

| Acteur | Type | Pourquoi | Sources |
| --- | --- | --- | --- |
| Sun Yat-sen | individu | Fondateur de la République, mais pouvoir fragile et dépendant de compromis. | SRC-001, SRC-002 |
| Soong Ching-ling | individu, femme | Passeuse entre KMT de gauche et RPC ; sortir d’une histoire masculine. | SRC-001, SRC-008 |
| Qiu Jin | individu, femme | Révolutionnaire et féministe exécutée en 1907, avant 1911. | SRC-001, SRC-002 |
| Ding Ling | individu, femme | Écrivaine féministe, purgée puis réhabilitée ; littérature, genre et politique. | SRC-001, SRC-007 |
| Mao Zedong | individu | Dirigeant central, à documenter par ses ressources, contraintes et violences. | SRC-001, SRC-008, SRC-009 |
| Chiang Kai-shek | individu | Chef du KMT et de l’État républicain, adversaire du PCC. | SRC-001, SRC-002 |
| Deng Xiaoping | individu | Réformes et répression de 1989 ; acteur de la période post-1978. | SRC-013, SRC-014 |
| 14e dalaï-lama | individu, minorité | Autorité religieuse et acteur politique tibétain. | SRC-016 |
| PCC | collectif | Parti-État, appareil et réseau ; acteur central du XXe siècle. | SRC-001, SRC-008, SRC-013 |
| Nongmingong | collectif | Travailleurs migrants, acteurs de l’industrialisation et de l’urbanisation. | SRC-014 |
| Femmes rurales | collectif | Collectivisation, famine, mémoires ; histoire orale. | SRC-011 |
| Komintern | institution transnationale | Fondation du PCC et mouvement communiste international. | SRC-001, SRC-002 |

**Manques assumés.** Ulanhu (Mongolie-Intérieure), Saifuddin Azizi (Xinjiang) et Wei Guoqing (Zhuang) ne sont pas retenus faute de sources vérifiées dans le registre ; le Tibet, le Xinjiang et le Guangxi sont traités par les lieux et les omissions, tandis que la Mongolie-Intérieure reste un angle mort. Qiu Jin n’a pas de lieu dans la liste des 12 : Shaoxing et Tokyo manquent, dette signalée.

### 5.2. Lieux (12)

| Lieu | Hiérarchie | Fonction / période | Sources |
| --- | --- | --- | --- |
| Pékin | nationale | Capitale impériale (1421-1912), capitale de la RPC (1949-) | SRC-001, SRC-008 |
| Nanjing | nationale | Capitale Ming (1368-1421), capitale républicaine (1927-1937, 1946-1949), massacre de 1937 | SRC-001, SRC-002, SRC-005 |
| Shanghai | nationale | Port ouvert (1842), industrie, fondation du PCC (1921), purge (1927) | SRC-001, SRC-002, SRC-013 |
| Wuhan | régionale | Wuchang 1911, gouvernement de 1927, confinement de 2020 | SRC-001, SRC-019 |
| Chongqing | nationale | Capitale de guerre (1937-1946), bombardements | SRC-004, SRC-001 |
| Xi’an / Chang’an | régionale | Capitale Tang (618-907), carrefour d’Asie centrale | SRC-001, SRC-002 |
| Guangzhou | régionale | Système de Canton, port ouvert, KMT (1924-1927) | SRC-001, SRC-002 |
| Yan’an | régionale | Base communiste (1935-1947), rectification de 1942 | SRC-006, SRC-001 |
| Hong Kong | transnationale | Colonie britannique (1842-1997), rétrocession (1997) | SRC-013, SRC-001 |
| Lhassa | régionale | Capitale tibétaine, accord de 1951, soulèvement de 1959 | SRC-016, SRC-001 |
| Ürümqi | régionale | Capitale du Xinjiang, autonomie de 1955, émeutes de 2009 | SRC-015, SRC-001 |
| Nanning | régionale | Capitale du Guangxi, région autonome zhuang (1958) | SRC-020, SRC-001 |

**Manques assumés.** Shenzhen (zone économique spéciale), Hohhot (Mongolie-Intérieure) et Shaoxing (Qiu Jin) ne tiennent pas dans la limite de 12 lieux. Shenzhen est mentionnée dans la correction de cn-deng ; Hohhot reste une omission, comme Shaoxing, signalée dans l’acteur Qiu Jin. La date de 1958 pour le Guangxi est attestée par des ouvrages de référence mais reste à vérifier dans une source institutionnelle chinoise.

## 6. Risques de biais et points disputés

### 6.1. Chiffres de masse

- **Famine 1958-1961.** Les estimations vont d’environ 15 à 46 millions de morts. Ashton et al. (SRC-010) proposent environ 30 millions ; Dikötter (SRC-009) au moins 45 millions ; Walder (SRC-008) discute les mécanismes et les chiffres. Le dossier présente une fourchette, pas un chiffre unique. Risque : utiliser Dikötter comme consensus, ou utiliser les chiffres officiels chinois comme neutralité.
- **Nanjing 1937-1938.** Le tribunal militaire international de Tokyo retient environ 200 000 morts ; des travaux récents proposent 100 000 à 200 000 ; les mémoires chinoises vont jusqu’à 300 000 ; des estimations basses descendent à 40 000. Fogel (SRC-005) est la référence pour l’historiographie. Risque : chiffre unique, ou révisionnisme japonais.
- **Révolution culturelle.** Le bilan humain est disputé ; les violences de masse, les persécutions et les destructions sont établies, mais les chiffres varient. MacFarquhar et Walder (SRC-007, SRC-008) sont les sources de cadrage. Risque : réduire la Révolution culturelle à un accident ou à une simple manipulation.
- **1989.** Le bilan humain est disputé et l’événement est censuré en RPC. Lim (SRC-018) est une enquête documentée, non évaluée par les pairs. Risque : chiffres non corroborés, ou silence par peur de la censure.

### 6.2. Souverainetés contestées

- **Tibet.** L’accord de 1951 est présenté par Pékin comme une « libération pacifique » et par le gouvernement tibétain en exil comme une annexion. Shakya (SRC-016) donne le récit critique ; il faut citer aussi des sources institutionnelles chinoises, absentes du registre.
- **Xinjiang.** L’autonomie de 1955, les émeutes de 2009 et les politiques des années 2010 sont contestées. Millward (SRC-015) donne le contexte ; les qualifications « internement », « rééducation » ou « centres de formation professionnelle » doivent être présentées comme des claims concurrentes, pas comme des évidences.
- **Taïwan.** L’histoire de Taïwan après 1949 (incident 228, loi martiale, démocratisation) n’est pas traitée. Le dossier ne préjuge pas du statut politique ; il documente l’absence de sources taïwanaises et chinoises croisées.
- **Hong Kong.** La rétrocession de 1997 est traitée ; les mouvements de 2019 et la loi de sécurité nationale de 2020 sont documentés comme omission (OM-012), pas comme récit stabilisé.

### 6.3. Biais de récit

- **Téléologie de la puissance.** « Réforme et puissance » suggère que 1978 mène nécessairement à 2026. Il faut afficher les bifurcations, 1989, les inégalités, la pollution et les tensions.
- **Nationalisme méthodologique.** La frise prend l’État-nation comme unité ; les diasporas, les territoires contestés, les minorités transfrontalières et les circulations sont sous-représentés.
- **Han-centrisme.** Les dynasties non-Han (Yuan, Qing) sont traitées comme des exceptions ou des conquêtes, pas comme des régimes légitimes ayant leurs propres institutions.
- **Genre.** Les femmes apparaissent comme victimes ou symboles, rarement comme actrices politiques et économiques.
- **COVID-19.** Les origines du virus et la chronologie précoce sont politisées. Le dossier s’en tient au rapport conjoint OMS-Chine (SRC-019) et signale l’absence de sources indépendantes.

## 7. Dettes documentaires et niveau de confiance

### 7.1. Ce qui a été vérifié

20 sources ont été enregistrées. Les métadonnées ont été vérifiées par DOI/Crossref, notices d’éditeur, catalogue Open Library et page institutionnelle de l’OMS. Les dates des événements majeurs ont été recoupées par des notices encyclopédiques et des synthèses savantes ; Grokipedia et Wikipédia ont servi de points d’entrée, jamais de sources probantes. **Cela ne signifie pas que les 20 ouvrages ont été lus intégralement page à page** : les claims sont de niveau synthèse, et les pages ne sont pas citées.

### 7.2. Dettes principales

1. **Aucune source primaire.** Pas d’archives centrales chinoises, d’Academia Historica, d’archives britanniques, tibétaines ou ouïghoures. Les points contestés restent dépendants de la littérature secondaire (OM-015).
2. **Pas de sources chinoises contemporaines.** Le registre est presque entièrement anglophone. Il manque des travaux chinois, taïwanais et hongkongais, des gazetiers locaux, des mémoires et des enquêtes de terrain.
3. **Pas de sources taïwanaises.** Taïwan après 1949 est une omission majeure (OM-011).
4. **Pas de sources sur le Xinjiang et le Tibet contemporains.** Millward et Shakya s’arrêtent largement avant les politiques des années 2010 ; les qualifications et les chiffres sont disputés (OM-010).
5. **Pas de fiche ni de source spécialisée sur le hukou et les migrations.** Naughton en donne le cadre économique, mais l’histoire sociale des migrations reste à faire (OM-005, OM-009).
6. **Pas de sources sur les sciences, la santé, les arts et l’environnement contemporain.** Ces domaines sont des angles morts (OM-006, OM-007, OM-008).
7. **Pas de vérification page à page.** Les références sont exactes au niveau du livre, pas de la page. Une double lecture humaine doit reprendre les citations. Les corrections des repères impériaux et de la guerre de l’opium (cn-shang à cn-opium) reposent sur SRC-001 seul ; une seconde synthèse (Cambridge History of China) est nécessaire.
8. **Couverture nulle au sens strict.** 0 cellule « couverte » : les 13 fiches existantes n’ont ni acteur, ni lieu, ni source structurée. Les 51 cellules « partielles » reposent sur des repères ou des propositions, pas sur des fiches complètes.

### 7.3. Niveau de confiance

- **Élevé** : dates des grandes ruptures politiques (1911-1912, 1919, 1921, 1927, 1931, 1937, 1949, 1978, 1997, 2001, 2020), cadre général des dynasties.
- **Moyen** : histoire sociale et économique, femmes, minorités, environnement ; les sources existent mais les fiches et la couverture restent incomplètes.
- **Faible** : bilans humains contestés (famine, Nanjing, Révolution culturelle, 1989), politiques contemporaines au Xinjiang/Tibet/Hong Kong, histoire de Taïwan.

### 7.4. Points non résolus

- La datation exacte des Shang et le statut de la Xia/Erlitou.
- La date de création de la région autonome zhuang du Guangxi (1958) dans une source institutionnelle.
- Le nombre de victimes de la famine, de Nanjing, de la Révolution culturelle et de 1989.
- Le statut du Tibet et du Xinjiang : récits chinois, tibétains, ouïghours et internationaux inconciliables.
- Taïwan après 1949 : absence de sources et de cadre éditorial.
- Hong Kong après 1997 : mouvement de 2019 et loi de sécurité nationale de 2020.
- Les migrations intérieures, le hukou et les diasporas.
- Les guerres de la période maoïste (Corée, Inde, URSS, Vietnam).
- Les sciences, la santé, les arts et l’environnement contemporain.
- La place des femmes rurales et des minorités dans les 18 propositions.
- La vérification page à page de toutes les sources.
- La double lecture humaine, le kappa et le Delphi, non réalisés.

**Conclusion.** Le dossier ne valide pas la frise actuelle. Il fournit une base de correction : 18 propositions datées et sourcées, 12 acteurs, 12 lieux, 13 corrections, 15 omissions explicites. La priorité éditoriale est de remplir 1912-1949, puis de sortir du récit dynastique pour intégrer femmes, minorités, paysans, travailleurs, migrations et environnement. Le verdict reste `pending` jusqu’à double lecture et arbitrage.
