# Inde — rapport d’audit v1.0

> Dossier de première version, non signé. `verdict: pending`, scores `null`, `signoff` vide. Les propositions sont une file de revue, pas un patch de `data.js`. Date de consultation des sources : 2026-11-13.

## 1. Verdict de périodisation

La périodisation actuelle n’est pas fausse : elle est **politiquement lisible mais historiquement déséquilibrée**. Les bornes 1206, 1757 et 1947 correspondent à des ruptures réelles, mais la première ère, `Civilisations anciennes` (-2600/1206), couvre **3 806 ans**, soit environ 82 % du domaine temporel, et réunit des mondes que tout sépare : urbanisme de l’Indus, corpus védique, empires maurya et gupta, royaumes régionaux, bouddhisme et jaïnisme, début du sultanat de Delhi. Ce n’est pas une période : c’est une catégorie résiduelle.

| Ère actuelle | Durée | Problème principal |
| --- | ---: | --- |
| Civilisations anciennes (-2600/1206) | 3 806 ans | Mélange Indus, Védas, Maurya, Gupta, royaumes régionaux et début du sultanat ; aucune unité. |
| Sultanats & Moghols (1206/1757) | 551 ans | Centrée sur Delhi ; omet Vijayanagara, les sultanats du Deccan et du Bengale, les Marathes. |
| Raj britannique (1757/1947) | 190 ans | Le label « Raj » est anachronique pour 1757-1858, période de la Compagnie. |
| Inde contemporaine (1947/2026) | 79 ans | Borne solide, mais l’indépendance et la Partition sont deux événements distincts. |

**Ce qui tient.** 1206 est une borne défendable pour l’installation du sultanat de Delhi ; 1757 marque la victoire de la Compagnie à Plassey et le début de sa domination territoriale au Bengale, confirmée par le Diwani de 1765 ; 1947 est la rupture fondatrice de l’Inde contemporaine. Ces trois bornes sont documentées par les synthèses du registre (SRC-001 à SRC-006).

**Ce qui ne tient pas.** D’abord, l’ère ancienne est trop longue pour être utile : elle ne permet pas de distinguer la cité de l’Indus de la chefferie védique, ni l’empire maurya des royaumes post-gupta. Ensuite, le label « Raj britannique » projette sur 1757-1858 un régime qui ne commence qu’en 1858, après la révolte de 1857 et le transfert de l’Inde à la Couronne. La borne 1206 coupe aussi l’empire chola (848-1279) et les réseaux de l’océan Indien, ce qui montre qu’une coupure politique ne suffit pas à périodiser le Sud. Enfin, la fiche `in-independance` confond l’indépendance du 15 août 1947 et la Partition, alors que la ligne Radcliffe et les transferts de population constituent un événement distinct, avec ses propres morts et ses propres réfugiés (SRC-007, SRC-008).

**Révision proposée.** Cinq ères politiques :

1. `Indus & Védique` (-2600/-600) : phase urbaine mature, dé-urbanisation, corpus védique, premières chefferies.
2. `Empires classiques & régionaux` (-600/1200) : seconde urbanisation, Mahajanapadas, Maurya, Gupta, royaumes du Sud, début du sultanat.
3. `Sultanats, Vijayanagara & Moghols` (1200/1757) : Delhi, Deccan, Bengale, Vijayanagara, Moghols, Marathes.
4. `Compagnie & Raj` (1757/1947) : Compagnie (1757-1858), Couronne (1858-1947), mouvement national.
5. `République & Inde contemporaine` (1947/2026) : indépendance, Constitution, démocratie, libéralisation.

Cette révision est une **proposition**, pas une décision. Les alternatives sont conservées : -1900 (dé-urbanisation de l’Indus), -1200 (Rigveda), -322 (Maurya), 320 (Gupta), 1526 (Babur), 1707 (mort d’Aurangzeb), 1858 (Couronne), 1950 (Constitution), 1991 (libéralisation).

**Trois périodisations comparées.** La périodisation politique retenue doit coexister avec deux lectures alternatives. La lecture **sociale et économique** distingue l’âge du bronze urbain, l’expansion agraire, les empires agraires et commerciaux, l’extraction coloniale, l’État développementaliste et l’économie libéralisée (SRC-002, SRC-004, SRC-006, SRC-014). La lecture **culturelle, religieuse et environnementale** distingue l’Indus et les Védas, la séquence axiale, la période puranique/bhakti/soufie, la modernité coloniale et la république séculière contestée (SRC-001, SRC-002, SRC-003, SRC-005, SRC-012). Aucune ne doit être naturalisée : la frise publiée choisit un récit principal, mais le dossier conserve les autres.

**Verdict de périodisation :** révision majeure recommandée, sans rejet des bornes 1206, 1757 et 1947. La priorité est de scinder l’ère ancienne et de distinguer Compagnie et Couronne.

## 2. Angles morts et biais de sélection

La frise actuelle compte **12 repères** pour 4 626 ans. Neuf sur douze portent le tag `politique` ou `guerre` (75 %), au-dessus du seuil de vigilance de 50 %. Trois repères seulement couvrent l’Inde ancienne, deux le monde des sultanats et des Moghols, quatre le Raj, trois l’Inde contemporaine. Cette distribution est le principal biais : elle fait de l’histoire politique du Nord et de Delhi l’armature du récit.

**Couverture de la matrice.** L’audit structurel mesure 53 % de couverture tags × ères ; notre matrice, plus stricte, compte 56 cellules (4 ères × 14 domaines) réparties en **26 cellules couvertes (46 %)**, **30 cellules partielles (54 %)**, **0 vide justifié** et **0 vide non traité**. Le seuil de 90 % n’est donc pas atteint : les 30 cellules partielles sont des dettes, pas des acquits. Une cellule est dite couverte si une fiche existante ou une proposition nomme au moins un acteur, un lieu et une source ; les propositions ne sont pas encore des fiches complètes, mais elles fournissent ces trois éléments. Les domaines les mieux couverts sont la politique, les religions, les arts et les circulations ; les plus fragiles sont les femmes, les Adivasis, les sciences, l’environnement et les migrations récentes.

**Femmes et genre.** Aucune femme n’est actrice d’un repère existant. Les femmes n’apparaissent qu’en creux, dans la Partition, et jamais comme actrices politiques, religieuses, savantes ou artistiques. Les propositions ajoutent Nur Jahan, Sarojini Naidu, Mirabai, Shah Bano et Indira Gandhi, mais l’Inde ancienne et médiévale reste très faible (OM-003). Les sources existent pourtant : Gargi et Maitreyi dans les Upanishads, les nonnes bouddhiques du Therigatha, les poétesses sangam, Mirabai, Andal, les reines et régentes. Le silence n’est pas un manque de sources ; c’est un choix de sélection.

**Castes et Dalits.** La caste traverse toute l’histoire, mais la frise n’a aucun repère dalit. Ambedkar est absent, Mahad est absent, le Poona Pact de 1932 est absent, la conversion de 1956 est absente. La caste n’apparaît pas comme sujet autonome : elle est absente des repères, alors qu’elle structure la société. Les propositions ajoutent Mahad (PROP-010), Ambedkar comme acteur et la Constitution (PROP-013), mais il manque encore une fiche sur l’intouchabilité coloniale, sur les mouvements dalits du XXe siècle et sur la violence de caste contemporaine (OM-009).

**Adivasis.** Aucun repère. Les Adivasis ne sont ni acteurs politiques ni communautés forestières dans la frise ; le vocabulaire statistique les réduit souvent à des « populations tribales ». La loi sur les droits forestiers de 2006 (PROP-018) et Niyamgiri sont proposées, mais la longue durée de la dépossession forestière, les révoltes santhal et munda, le conflit maoïste et la question de la VIe annexe restent absents (OM-004, OM-006).

**Minorités religieuses.** La frise traite l’islam principalement par les empires (sultanat, Moghols) et par la Partition ; le sikhisme est absent, alors que le Khalsa (PROP-007) et les violences de 1984 sont des jalons majeurs ; l’assassinat de Gandhi relève du nationalisme hindou. Elle ne traite ni le pluralisme quotidien, ni les chrétiens, ni les parsis, ni les jaïns, ni les bouddhistes contemporains, ni les juifs de Cochin. Il manque une histoire des coexistences, des conversions, des réformes et des droits personnels.

**Langues.** Aucun repère sur les langues, alors que la réorganisation des États de 1956 (PROP-014), les mouvements anti-hindi de 1965 et la politique du hindi sont structurants. La frise est écrite en français, mais elle ne dit rien du multilinguisme indien, des littératures tamoule, bengalie, marathi, ourdou, pendjabie, et de la hiérarchie des langues.

**Famines et environnement.** Aucun repère sur les famines, alors que celles de 1770, 1876-1878 et 1943 sont des catastrophes majeures, et que la Révolution verte (PROP-015), les barrages, la pollution et la crise de l’eau transforment l’Inde contemporaine. Les famines ne sont pas seulement des accidents naturels : elles sont produites par des politiques fiscales, des marchés et des guerres (SRC-004, SRC-013, SRC-014, SRC-017). Le dossier propose un processus 1770-1900 (PROP-009) et la famine de 1943 (PROP-012), mais l’histoire environnementale reste à construire.

**Partition et diasporas.** La Partition est fondue dans l’indépendance, alors qu’elle est un événement distinct, avec 12 à 20 millions de déplacés et 200 000 à 2 millions de morts selon les estimations (SRC-007, SRC-008, SRC-009). Les diasporas sont absentes, alors que l’engagisme (PROP-008) a façonné Maurice, les Caraïbes, Fiji, l’Afrique du Sud, et que les migrations vers le Golfe, le Royaume-Uni, les États-Unis et le Canada sont majeures.

**Nord-Est, Cachemire, Manipur.** Aucun repère. La frise est encore plus centralisée que l’État indien : elle ignore les périphéries, les régimes spéciaux, les conflits et les mémoires régionales. Une fiche sur l’accession du Cachemire (1947-1948) et une sur les régimes spéciaux du Nord-Est (VIe annexe) sont indispensables.

**Handicap, transidentité, droits LGBTQ+.** Aucun repère. La loi sur les droits des personnes trans (2019) et l’arrêt Navtej Singh Johar (2018) sur la section 377 sont des jalons récents, mais le dossier ne les traite pas (OM-015).

**Culture et sciences.** La frise a les Gupta pour les sciences et les Moghols pour les arts, mais elle ignore Aryabhata, Nalanda, les mathématiques kéralaises, la médecine ayurvédique, le cinéma, la littérature, la musique, le sport. Les sciences contemporaines (nucléaire, espace, vaccins) sont absentes, alors que l’Inde est une puissance spatiale et pharmaceutique.

**Biais de « grands hommes ».** Ashoka, Babur, Akbar et Gandhi sont traités comme des vignettes héroïques. Leurs ressources, contraintes, réseaux, contre-pouvoirs et violences ne sont pas documentés. Le dossier corrige partiellement ce biais par les fiches acteurs, mais il faut encore intégrer les paysans, les artisans, les soldats, les femmes et les groupes minorisés comme acteurs autonomes.

## 3. Propositions d’événements (12–18)

Dix-huit propositions sont déposées. Elles évitent la seule histoire politique : plusieurs portent sur la religion, les arts ou les sciences ; d’autres sur l’économie, l’environnement, les femmes, les Dalits, les Adivasis, les migrations et le droit. Les dates sont des conventions documentées ; les incertitudes sont signalées dans `proposals.yaml`.

| ID | Date | Proposition | Domaines | Sources | Confiance |
| --- | --- | --- | --- | --- | --- |
| PROP-001 | -1500/-1200 | Corpus védique | religions, arts, société | SRC-001, SRC-002 | haute |
| PROP-002 | -600/-400 | Bouddha, Mahavira et la seconde urbanisation | religions, politique, société | SRC-001, SRC-002 | haute |
| PROP-003 | -300/300 | Littérature sangam | arts, société, économie | SRC-001, SRC-002 | moyenne |
| PROP-004 | 848/1279 | Empire chola | politique, économie, arts, guerre | SRC-001, SRC-002 | haute |
| PROP-005 | 1336/1646 | Vijayanagara | politique, arts, économie | SRC-003 | moyenne |
| PROP-006 | 1200/1700 | Bhakti vernaculaire et soufisme | religions, arts, société | SRC-001, SRC-003 | haute |
| PROP-007 | 1699 | Khalsa | religions, politique, guerre | SRC-003 | moyenne |
| PROP-008 | 1834/1917 | Engagisme indien | économie, société, migrations | SRC-004, SRC-015 | haute |
| PROP-009 | 1770/1900 | Régime colonial des famines | économie, société, environnement | SRC-004, SRC-013, SRC-014, SRC-017 | haute |
| PROP-010 | 1927 | Satyagraha de Mahad | politique, société, religions | SRC-019, SRC-011 | haute |
| PROP-011 | 1930 | Marche du sel | politique, société, économie | SRC-005, SRC-012 | haute |
| PROP-012 | 1943 | Famine du Bengale | société, économie, guerre | SRC-017, SRC-014 | haute |
| PROP-013 | 1950 | Constitution de la République | politique, droit, société | SRC-020, SRC-006, SRC-019 | haute |
| PROP-014 | 1956 | Réorganisation des États | politique, langues, société | SRC-006, SRC-020 | haute |
| PROP-015 | 1966/1970 | Révolution verte | économie, sciences, environnement | SRC-006, SRC-016 | haute |
| PROP-016 | 1975/1977 | État d’urgence | politique, société, droit | SRC-006, SRC-020 | haute |
| PROP-017 | 1985 | Affaire Shah Bano | politique, femmes, religions | SRC-006, SRC-012 | haute |
| PROP-018 | 2006 | Loi sur les droits forestiers | politique, Adivasis, environnement | SRC-018, SRC-016 | haute |

**Pourquoi ces choix.** Les propositions 001-004 comblent le vide de l’Inde ancienne et donnent une place au Sud (sangam, chola). Les propositions 005-007 couvrent le monde des sultanats et des Moghols sans réduire l’époque à Delhi. Les propositions 008-012 introduisent l’économie, les famines, les migrations et les Dalits dans la période coloniale. Les propositions 013-018 couvrent l’État-nation, la démocratie, le genre, les Adivasis et l’environnement.

**Ce qui reste hors du quota.** Nalanda, les royaumes du Deccan, les Marathes, les guerres de 1962/1971/1999, Bhopal, Babri Masjid, le Gujarat 2002, la partition du Bengale de 1905, Chauri Chaura, les procès de l’INA et les migrations du Golfe ne sont pas tous dans les 18. Certaines de ces absences sont documentées dans `omissions.yaml` (OM-005, OM-006, OM-010, OM-011, OM-012, OM-013, OM-014) ; les autres, comme Chauri Chaura, les procès de l’INA ou la partition du Bengale de 1905, restent des dettes à inscrire. Le comité peut les intégrer en v1.1 sans refaire la recherche de base.

## 4. Corrections des événements existants

Douze corrections sont proposées. Elles ne visent pas à réécrire l’histoire, mais à corriger des formulations trop larges, des dates approximatives et des biais de sélection.

| ID existant | Problème | Correction proposée | Sources |
| --- | --- | --- | --- |
| in-indus | « Disparaît vers 1900 av. J.-C. » confond dé-urbanisation et disparition ; causes et écriture non déchiffrée. | Écrire « dé-urbanisation entre 1900 et 1300 av. J.-C. » et ajouter l’incertitude. | SRC-001, SRC-002 |
| in-maurya | « Premier grand empire » ignore Magadha et les Nanda ; « non-violence » omet Kalinga (261 av. J.-C.). | Préciser les précédents, Kalinga, les missions bouddhiques et la distinction dhamma/non-violence. | SRC-001, SRC-002 |
| in-gupta | « Âge d’or » est un label ; le zéro n’est pas inventé par les Gupta. | Parler de construction historiographique et dater Aryabhata (499), sans attribuer le zéro aux Gupta. | SRC-001, SRC-002 |
| in-delhi | « Dynasties turques » réduit cinq dynasties et omet les sultanats régionaux. | Préciser 1206-1526, les cinq dynasties et la pluralité des sultanats. | SRC-001, SRC-003 |
| in-moghol | « Apogée sous Akbar » confond apogée territoriale et culturelle ; Taj Mahal 1632-1653. | Distinguer Akbar, Shah Jahan et Aurangzeb ; dater le Taj Mahal et la crise de 1707. | SRC-003 |
| in-eic | 1600-1757 est comprimé ; la charte ne donne pas de comptoirs. | Décrire un processus : Surat 1613, Madras 1639, Bombay 1661/1668, Calcutta 1690, Plassey 1757, Diwani 1765. | SRC-003, SRC-004 |
| in-cipayes | « Mutinerie » sous-estime la révolte de 1857-1858 et la répression. | Renommer « Révolte de 1857-1858 » et ajouter victimes civiles et passage à la Couronne. | SRC-004, SRC-005 |
| in-congres | « Élites réformistes » ignore la diversité du premier Congrès et sa massification après 1920. | Préciser la composition, les phases et la concurrence de la Ligue musulmane. | SRC-005 |
| in-amritsar | « Centaines de morts » est vague ; estimations de 379 à plus de 1 500. | Donner une fourchette, citer la commission Hunter et le Rowlatt Act. | SRC-005 |
| in-independance | Confond indépendance et Partition ; pas d’ordres de grandeur ni de Cachemire. | Scinder en deux fiches et ajouter 1947-1948 au Cachemire. | SRC-007, SRC-008, SRC-009 |
| in-gandhi | « Nationaliste hindou » est vague ; Godse, ancien RSS, 30 janvier 1948 ; héritage non critique. | Nommer Godse, dater l’assassinat, ajouter les critiques de ses positions sur la caste et de son rôle en 1942-1947. | SRC-005, SRC-006 |
| in-liberalisation | 1991 n’est pas un point unique ; crise, Rao, Manmohan Singh, FMI, croissance inégale. | Décrire un processus 1991-2000s et ajouter des indicateurs sociaux. | SRC-006, SRC-014 |

**Priorité éditoriale.** Les corrections les plus urgentes sont `in-independance` (scinder), `in-cipayes` (renommer et documenter la répression), `in-amritsar` (chiffrer), `in-gandhi` (nommer Godse et contextualiser) et `in-liberalisation` (décrire un processus). Les autres corrections peuvent attendre une révision mineure.

## 5. Acteurs et lieux à ajouter

**Douze acteurs** sont proposés, dont trois femmes (Nur Jahan, Sarojini Naidu, Indira Gandhi), deux collectifs (Dalit Panthers, Indian National Congress) et un acteur étranger/transnational (East India Company). Les autres sont Ashoka, Akbar, Ambedkar, Gandhi, Nehru et Jinnah. Chaque fiche précise les ressources, contraintes, réseaux, contre-pouvoirs, bilan et postérité ; aucun dirigeant n’est présenté comme une vignette héroïque.

| Acteur | Type | Pourquoi | Sources |
| --- | --- | --- | --- |
| Ashoka | individu | Empereur maurya, dhamma, Kalinga, missions bouddhiques | SRC-001, SRC-002 |
| Akbar | individu | Mansabdari, alliances rajputes, empire pluriel | SRC-003 |
| Nur Jahan | individu | Pouvoir de cour, patronage, réseaux familiaux | SRC-003 |
| Sarojini Naidu | individu | Congrès, femmes, marche du sel, gouvernorat | SRC-012, SRC-005 |
| B. R. Ambedkar | individu | Droit, Dalits, Constitution, conversion | SRC-019, SRC-011, SRC-010 |
| M. K. Gandhi | individu | Non-violence, campagnes de masse, limites | SRC-005, SRC-006 |
| Jawaharlal Nehru | individu | Fédéralisme, planification, non-alignement | SRC-006, SRC-005 |
| Indira Gandhi | individu | 1971, nucléaire, État d’urgence, Blue Star | SRC-006, SRC-020 |
| Muhammad Ali Jinnah | individu | Ligue musulmane, négociations, Pakistan | SRC-009, SRC-008 |
| Dalit Panthers | collectif | Radicalisation dalite, Bombay, années 1970 | SRC-011, SRC-019 |
| Indian National Congress | collectif | Mouvement national, parti dominant | SRC-005, SRC-006 |
| East India Company | institution | Compagnie, conquête, drain, 1857 | SRC-003, SRC-004 |

**Douze lieux** sont proposés, tous hors de Delhi : Mohenjo-daro, Pataliputra, Thanjavur, Hampi, Lahore, Kolkata, Mumbai, Chennai, Dhaka, Amritsar, Dandi et Niyamgiri. Les noms historiques, la géométrie valide à l’époque et les fonctions sont datés. Lahore et Dhaka sont aujourd’hui au Pakistan et au Bangladesh ; leur inclusion est indispensable pour ne pas rétroprojeter les frontières de 1947. Mumbai/Bombay, Kolkata/Calcutta et Chennai/Madras portent leurs deux noms, avec les dates de changement.

**Delhi manque.** Le plafond de 12 lieux a conduit à privilégier les périphéries. Delhi/Shahjahanabad (1639), New Delhi (1911-1931) et la capitale de l’Union devraient être ajoutés comme treizième lieu si le comité relève le plafond. Delhi n’est pas seulement la capitale politique : c’est un lieu de mémoire de la Partition, de l’État d’urgence et des mobilisations contemporaines.

**Acteurs collectifs à ajouter en v1.1.** Les gram sabhas adivasis, les associations de femmes, les syndicats, les mouvements paysans (Kisan Sabha), les partis régionaux (DMK, AIADMK, Trinamool), les organisations de la diaspora et les mouvements LGBTQ+ ne sont pas dans les 12. Leur absence est une dette, pas une décision définitive.

## 6. Risques de biais et points disputés

**Migrations indo-européennes et « aryen ».** Le sujet est politiquement explosif en Inde. Il faut parler de migrations, pas d’« invasion », et distinguer les preuves linguistiques, archéologiques et génétiques. Les dates et les modalités sont disputées ; aucun récit ne doit transformer les Védas en texte fondateur ethnique. Les sources du registre (SRC-001, SRC-002) présentent le débat de manière critique ; les études génétiques récentes ne sont pas encore dans le registre et constituent une dette (voir section 7).

**Caste.** Deux erreurs symétriques sont à éviter : faire de la caste une invention purement coloniale, ou la présenter comme une essence immémoriale. Dirks (SRC-010) documente la codification coloniale par le recensement et le droit ; Jaffrelot (SRC-011) montre la politisation des basses castes. La thèse doit être formulée comme une interaction entre hiérarchies précoloniales et technologies coloniales, pas comme une alternative binaire.

**Partition.** Les estimations varient : 12 à 20 millions de déplacés, 200 000 à 2 millions de morts (SRC-007, SRC-008, SRC-009). Il n’y a pas un seul responsable : le gouvernement britannique, le Congrès, la Ligue musulmane et les dynamiques provinciales ont pesé. La Partition ne s’arrête pas en 1947 : les permis, les frontières et les familles séparées continuent de structurer le sous-continent. Il faut aussi traiter le Cachemire (1947-1948), Hyderabad (1948), Junagadh (1947) et Goa (1961), absents de la frise.

**Famines.** Les bilans sont contestés : 1 à 10 millions pour 1770, 5,6 à 9,6 millions pour 1876-1878, 0,8 à 3,8 millions pour 1943. Les explications ne s’excluent pas : sécheresse et El Niño, fiscalité, marchés, réquisitions, transport, guerre et politique coloniale. Il faut éviter deux caricatures : la famine purement naturelle et le génocide intentionnel. Le dossier retient la notion de « régime colonial des famines », pas celle de complot.

**« Âge d’or ».** L’expression est un lieu commun nationaliste et orientaliste. Les Gupta ont connu un essor artistique et scientifique, mais aussi des hiérarchies sociales, des conflits et des régions non contrôlées. La frise doit dire « construction d’un âge d’or » et ne pas en faire le sommet naturel de l’histoire indienne.

**1984, 1992, 2002.** L’opération Blue Star, les violences anti-sikhes de 1984, la démolition de Babri Masjid en 1992 et les violences de 2002 au Gujarat sont des sujets de mémoire et de justice. Les bilans et les responsabilités sont contestés. Ils ne sont pas dans les 18 propositions ; ils figurent dans les omissions (OM-012, OM-013). Une fiche ne peut être publiée qu’avec des sources indépendantes, des décisions judiciaires datées et les récits des victimes.

**Cachemire et Article 370.** L’accession de 1947, la ligne de contrôle, l’autonomie de 1950 et l’abrogation de l’Article 370 en 2019 sont des points disputés. La frise ne peut pas les traiter comme des détails administratifs. Une fiche processuelle, avec les positions indiennes, pakistanaises et cachemiries, est nécessaire.

**Langues et fédéralisme.** La réorganisation de 1956 a stabilisé le fédéralisme mais créé de nouvelles minorités. Les mobilisations anti-hindi de 1965, la politique du hindi et les tensions linguistiques au Tamil Nadu, au Karnataka et en Andhra Pradesh sont absentes. Il faut éviter de présenter l’Inde comme naturellement multilingue : le multilinguisme est un équilibre politique conflictuel.

**Statistiques coloniales.** Les recensements, les rapports de famine et les séries de revenu agricole sont des sources construites par l’administration coloniale. Leurs catégories (caste, tribu, religion) ne sont pas neutres. Il faut distinguer les chiffres officiels, les estimations savantes et les usages politiques.

**Présentisme.** La période 2014-2026 n’est pas couverte par la frise ; si elle est ajoutée, elle devra être traitée comme histoire immédiate, avec des sources provisoires, des bilans contestés et des mémoires vives. La frise doit s’arrêter à une date de clôture explicite (2026) et signaler les incertitudes.

## 7. Dettes documentaires et niveau de confiance

**Base documentaire.** Le dossier documente 15 omissions et 18 propositions. Le registre compte 20 sources : 18 synthèses savantes, une source primaire (Ambedkar) et une source institutionnelle (Constitution). Toutes les références ont été vérifiées par DOI, catalogue ou page éditeur ; aucune URL de DOI n’est inventée. Les métadonnées sont dans `source-register.csv`. La recherche a utilisé des outils de recherche web et des API bibliographiques (Crossref, OpenLibrary) ; aucun contenu génératif n’est utilisé comme source, et les vérifications sont tracées par les DOI, ISBN et URL du registre.

**Ce que la base permet.** Elle couvre l’Inde ancienne (Thapar, Singh), le monde persanophone et moghol (Eaton), le Raj (Bayly, Sarkar), l’Inde indépendante (Guha), la Partition (Butalia, Zamindar, Jalal), la caste (Dirks, Jaffrelot, Ambedkar), les femmes (Forbes), les famines (Davis, Sen, Mukherjee), les migrations (Amrith), l’environnement (Gadgil & Guha, Sundar) et le droit (Constitution).

**Ce qui manque.** D’abord, les **sources vernaculaires** : hindi, bengali, tamoul, marathi, pendjabi, ourdou, malayalam. Ensuite, les **archives** : recensements, répertoires géographiques, rapports de famine, dossiers judiciaires, presse d’époque, films, chansons, littérature. Puis les **voix subalternes** : Dalits, Adivasis, femmes, minorités religieuses, travailleurs. Le registre est encore très anglophone et universitaire.

**Sources primaires.** Seules deux sources primaires sont présentes : Ambedkar et la Constitution. Il manque Gandhi (Hind Swaraj, 1909), Nehru (The Discovery of India, 1946), Jinnah, Savarkar (Hindutva, 1923), les débats de l’Assemblée constituante, les rapports de la commission Hunter, les recensements de 1871-1941, les rapports des commissions de famine (1878-1880, 1945) et les archives de la Partition.

**Couverture régionale.** Le dossier est encore centré sur le Nord et le Bengale. Le Sud (sangam, chola, Vijayanagara) est proposé, mais le Deccan, le Gujarat, le Rajasthan, le Pendjab, l’Assam, le Nord-Est, le Cachemire et le Kerala restent faibles. Les histoires régionales ne sont pas des annexes : elles corrigent le récit national.

**Confiance par période.** Inde ancienne : moyenne (archéologie et textes, datations débattues). Monde des sultanats et Moghols : moyenne (sources persanes, biais de cour). Raj : haute mais biaisée (archives coloniales abondantes, voix indiennes moins représentées). Inde contemporaine : haute pour les faits politiques, moyenne pour les bilans sociaux et environnementaux. Partition et famines : moyenne à haute, avec des fourchettes à conserver.

**Audit.** Aucune double lecture, aucun kappa, aucun Delphi, aucune validation signée. Aucun S1 n’a été identifié par cette première passe, mais aucune double lecture n’a eu lieu. Les scores sont `null`, le verdict est `pending`. Le dossier est utilisable pour une revue éditoriale, pas pour une publication automatique. Les désaccords F1/F2/F3 doivent être tranchés par un lecteur pays et un arbitre.

### Points non résolus

1. La date de -600 comme borne de la seconde urbanisation est conventionnelle ; faut-il retenir -500 ou -400 ?
2. La borne 1206 doit-elle être déplacée à 1192 (seconde bataille de Tarain) ou à 1200 ?
3. Faut-il scinder la période 1757-1947 à 1858, ou conserver une seule ère « Compagnie & Raj » ?
4. Les estimations de la Partition (12-20 millions de déplacés, 200 000-2 millions de morts) doivent être vérifiées avec deux démographes.
5. Les bilans de la famine de 1770 (1-10 millions) et de 1876-1878 (5,6-9,6 millions) restent des fourchettes ; quelle valeur retenir pour l’affichage ?
6. La question des migrations indo-européennes exige une source génétique récente, absente du registre.
7. Akbar et Nur Jahan reposent sur Eaton ; les femmes mogholes manquent d’une seconde source indépendante.
8. Vijayanagara et le Khalsa reposent sur une source unique ; il faut une monographie spécialisée.
9. Les guerres de 1962, 1971 et 1999, Bhopal, Babri Masjid, le Gujarat 2002 et le Cachemire ne sont pas dans les 18 propositions ; faut-il les ajouter en v1.1 ou les traiter comme des fiches-processus ?
10. Delhi/Shahjahanabad doit-il être ajouté comme treizième lieu, et faut-il relever le plafond de 12 ?
11. Les sources vernaculaires et les archives indiennes ne sont pas encore mobilisées ; le dossier reste anglophone.
12. La période 2014-2026 n’est pas couverte ; si elle est ajoutée, il faudra des sources provisoires, une date de clôture et des règles de mise à jour validées par le comité.
