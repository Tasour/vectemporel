# France — rapport d’audit v1.0

> Audit réalisé le **2026-11-13** sur l’objet `france` de `data.js` (9 ères, 53 repères). Les sources sont vérifiées via Crossref, le catalogue de la BnF et les pages institutionnelles ; aucune page Grokipedia ou Wikipédia n’est utilisée comme autorité. Le dossier est une **file de revue**, pas un patch : `verdict: pending`, scores `null`, signoff vide.

## 1. Verdict de périodisation

La périodisation actuelle est **lisible, continue et utile pour une vue d’ensemble**, mais elle reste une **périodisation politique et européenne** appliquée à une histoire qui ne l’est pas entièrement. Elle ne devient pas fausse pour autant : elle est un récit parmi d’autres, et ce récit doit être explicité.

| Ère | Bornes | Verdict | Raison principale |
| --- | --- | --- | --- |
| Antiquité | -600 / 476 | **garder avec réserve** | Massalia est un bon point de départ régional ; 476 est une convention européenne, pas une rupture gauloise. 486 (Soissons) est plus pertinent pour le royaume franc. |
| Moyen Âge | 476 / 1492 | **garder avec réserve** | 1492 est la prise de Grenade et le premier voyage de Colomb, pas un événement français. 1453, 1494 ou 1515 sont plus structurants. |
| Renaissance | 1492 / 1610 | **renommer et déplacer** | 1492 ne structure pas l’histoire française ; 1494 ouvre les guerres d’Italie, 1539 Villers-Cotterêts, 1562 les guerres de Religion. |
| Grand Siècle & Lumières | 1610 / 1789 | **scinder** | Le label fusionne l’absolutisme louis-quatorzien et les Lumières. 1661, 1715 et 1750 sont des alternatives sérieuses. |
| Révolution & Empire | 1789 / 1815 | **garder** | 1789 et 1815 sont des ruptures politiques documentées, même si 1792, 1799 et 1804 sont des alternatives. |
| XIXe siècle | 1815 / 1914 | **garder avec réserve** | 1815 est une borne politique ; un « long XIXe siècle » commençant en 1789 est défendable. |
| Guerres mondiales | 1914 / 1945 | **renommer ou scinder** | Le label réduit l’entre-deux-guerres à une préparation de 1939 et masque les crises sociales, coloniales et mémorielles. |
| Trente Glorieuses | 1945 / 1989 | **scinder** | Fourastié borne les Trente Glorieuses à 1946-1975. L’ère 1945-1989 inclut les crises de 1975-1989, le chômage de masse et la désindustrialisation. |
| Temps présents | 1989 / 2026 | **renommer et interroger** | 1989 est la chute du mur de Berlin ; aucun repère français n’est daté de 1989 dans la frise. L’affaire de Creil (octobre 1989) est le candidat français le plus évident. |

### 1.1. Les quatre césures les plus fragiles

**Renaissance (1492-1610).** 1492 est un événement ibérique et atlantique. Pour la France, les bornes candidates sont 1494 (début des guerres d’Italie), 1515 (Marignan), 1539 (ordonnance de Villers-Cotterêts) et 1562 (début des guerres de Religion). La frise actuelle ne contient que Marignan (1515), Villers-Cotterêts (1539), Saint-Barthélemy (1572) et l’édit de Nantes (1598) : elle raconte surtout les guerres et la langue, pas la Renaissance artistique et intellectuelle. Le renommage proposé — « Guerres d’Italie et Réforme (1494-1610) » — est plus honnête, à condition d’ajouter des repères culturels.

**Grand Siècle & Lumières (1610-1789).** Le label est commode mais il fusionne deux moments : l’affirmation de l’État louis-quatorzien et la critique philosophique du XVIIIe siècle. 1610 (assassinat d’Henri IV), 1661 (gouvernement personnel de Louis XIV), 1715 (mort de Louis XIV) et 1750 (milieu des Lumières) sont des bornes concurrentes. La frise ne contient que cinq repères pour 179 ans : quatre liés à Paris ou Versailles (Académie française, Louis XIV, Académie des sciences, Encyclopédie) et la révocation signée à Fontainebleau ; la province, les femmes et les mondes coloniaux sont absents.

**Trente Glorieuses (1945-1989).** C’est le point le plus problématique. Jean Fourastié forge l’expression en 1979 pour désigner la croissance de **1946 à 1975** (SRC-019). L’ère actuelle utilise la même étiquette pour **1945-1989**, alors que la crise de 1973-1975, le chômage de masse, la désindustrialisation et les plans de rigueur ouvrent une autre séquence. La frise contient l’événement `fr-trente` (1945-1975) à l’intérieur d’une ère 1945-1989 : la contradiction est interne. Il faut soit scinder l’ère en 1945-1975 / 1975-1989, soit la renommer « Après-guerre, croissance et crises (1945-1989) ».

**Temps présents (1989-2026).** La borne 1989 est européenne. La frise ne contient **aucun repère français daté de 1989** : le premier événement après 1981 est Maastricht (1992). L’affaire des foulards de Creil (octobre 1989) est un événement français majeur, mais il n’est pas dans la frise ; il est proposé ici (PROP-015). Les alternatives 1981 (alternance), 1992 (Maastricht), 1995 (discours de Chirac), 2002 (euro) et 2015 (attentats) sont plus françaises. Le label « Temps présents » pour 37 ans est lui-même discutable : ce n’est plus le présent de 2026, c’est déjà de l’histoire.

### 1.2. Trois périodisations comparées

La périodisation **politique** (POL-1) est celle de la frise. Elle est lisible mais téléologique : elle prépare la Ve République et fait de 1789 le centre de gravité. La périodisation **sociale et économique** (SOC-1) déplacerait les bornes vers 1830-1880 (industrialisation), 1945-1975 (société salariale) et 1975 (chômage de masse) ; elle contesterait 1989. La périodisation **culturelle, religieuse et environnementale** (CULT-1) ferait apparaître 496 (baptême de Clovis), 1562-1598 (guerres de Religion), 1685 (révocation et Code noir), 1905 (séparation) et 1960-1970 (essor de l’écologie). Les trois sont conservées dans `country-audit.yaml`.

**Verdict.** Conserver les neuf ères comme récit principal pour la vue d’ensemble, mais : (1) renommer la Renaissance et déplacer sa borne à 1494 ; (2) scinder « Grand Siècle & Lumières » ; (3) scinder ou renommer « Trente Glorieuses » ; (4) renommer « Temps présents » et expliciter 1989 ; (5) afficher 476 et 1492 comme conventions. Aucune de ces césures n’est naturelle. Les sources du registre ne documentent pas spécifiquement 1492, 1610, 1815 et 1914 : c’est une dette explicite, pas une validation.

## 2. Angles morts et biais de sélection

### 2.1. Le déséquilibre politique et militaire

L’audit structurel compte **40 repères politique/guerre sur 53 (75 %)**, au-dessus du seuil de vigilance de 50 %. Le déséquilibre n’est pas une erreur factuelle : c’est un biais de sélection. Il produit une histoire de l’État et des guerres, pas une histoire de la société française. Les domaines `Droit & justice`, `Femmes, genre, sexualités`, `Environnement & territoire`, `Migrations & diasporas`, `Peuples autochtones & minorités` et `Mémoire & patrimoine` n’ont **aucun tag dédié** dans `data.js` ; ils sont donc invisibles et non auditables.

### 2.2. Le tableau des angles morts

| Domaine | État actuel dans la frise | Angle mort principal | Propositions |
| --- | --- | --- | --- |
| Politique & institutions | Surreprésenté (présent dans les 9 ères) | Institutions locales, parlement, administration, outre-mer | Corrections de formulations ; pas de nouvelle proposition politique pure |
| Guerres & diplomatie | Surreprésenté | Guerres coloniales, interventions extérieures après 1962, diplomatie européenne | PROP-003, PROP-010, PROP-017 |
| Droit & justice | Quasi absent | Code noir, statut des femmes, droit du travail, justice coloniale | PROP-001, PROP-002, PROP-012, PROP-018 |
| Économie & travail | Faible | Industrialisation, chemins de fer, crise de 1975, chômage, précarité | Corrections `fr-trente`, `fr-euro` ; à compléter |
| Société & démographie | Partiel | Banlieues, classes populaires, ruralités, vieillissement | PROP-013, PROP-016 |
| Femmes, genre, sexualités | 2 repères (1944, 1975) | Olympe de Gouges, Curie, Morisot, contraception, IVG 2024, LGBTQ+ | PROP-002, PROP-004, PROP-005, PROP-012, PROP-018 |
| Religions & croyances | 10 repères, surtout médiévaux et modernes (1572, 1598, 1685, 1905) | Islam, judaïsme, laïcité conflictuelle, sécularisation | PROP-007, PROP-015 |
| Sciences, techniques & santé | 2 repères (1666, 2020) | Pasteur, Curie, radiologie, VIH, TGV, Concorde, santé publique | PROP-005 ; à compléter |
| Arts & lettres | 3 repères (1144, 1635, 1968) | Impressionnisme, surréalisme, Malraux, Pompidou, cinéma, littérature | PROP-004, PROP-006 |
| Environnement & territoire | **0 repère** | Parcs nationaux, ministère de l’Environnement, COP21, canicule, nucléaire | PROP-011, PROP-017 |
| Migrations & diasporas | Seulement l’Algérie | Immigration du XIXe siècle, 1961, 1983, 2005, Calais, diasporas | PROP-009, PROP-013, PROP-016 |
| Peuples autochtones & minorités | Partiel (Dreyfus, protestants, Algérie) | Colonisés, outre-mer, Roms, LGBTQ+, handicap | PROP-001, PROP-006, PROP-007, PROP-009 |
| Mémoire & patrimoine | Absent comme domaine | 1942, 1995, loi Taubira, Notre-Dame, musées | PROP-007, PROP-014 |
| Circulations transnationales | Maastricht et euro | Schuman, traité de Rome, référendum de 2005, COP21, diasporas | PROP-008, PROP-017 |

### 2.3. L’angle mort colonial

C’est le plus structurant. La frise ne donne à l’empire qu’un seul événement explicitement colonial : la **guerre d’Algérie (1954-1962)**. Elle ne contient ni le **Code noir (1685)**, ni la **prise d’Alger (1830)**, ni l’**Exposition coloniale de 1931**, ni l’Indochine, ni l’Afrique subsaharienne, ni les Caraïbes, ni l’océan Indien, ni le Pacifique. La colonisation apparaît donc comme une **annexe tardive et militaire**, pas comme un fait économique, juridique, culturel et social qui a duré plusieurs siècles. Les populations colonisées ne sont jamais actrices ; elles sont au mieux un contexte de guerre.

Cette omission fausse plusieurs lectures : la citoyenneté (qui est Français ?), la nationalité (droit du sol, 1889), les migrations postcoloniales, la mémoire (Vichy, Algérie, esclavage), la laïcité (islam colonial et postcolonial), l’économie (sucre, coton, plantations) et les guerres mondiales (tirailleurs, travailleurs indochinois). Les propositions PROP-001, PROP-003, PROP-006, PROP-009 et PROP-010 ne suffisent pas : elles ouvrent la porte, elles ne remplacent pas une histoire impériale.

### 2.4. L’angle mort des femmes

Deux repères seulement : le vote de 1944 et la loi Veil de 1975. Jeanne d’Arc est une femme, mais la fiche la traite comme figure militaire et religieuse, pas comme histoire des femmes. Olympe de Gouges, Berthe Morisot, Marie Curie, Simone Veil comme actrice, la contraception de 1967 et l’IVG constitutionnelle de 2024 sont absentes. Le problème n’est pas d’ajouter des « femmes illustres » : c’est de documenter le travail, la citoyenneté, la maternité, la sexualité, l’éducation et les rapports de genre. Les propositions 002, 004, 005, 012 et 018 sont un début, pas une histoire des femmes.

### 2.5. L’angle mort des « Trente Glorieuses » et des « Temps présents »

La période 1945-1989 ne contient que **7 repères** : Sécurité sociale, Trente Glorieuses, guerre d’Algérie, Ve République, Mai 68, loi Veil, abolition de la peine de mort. C’est une histoire politique et institutionnelle, avec un seul repère culturel (Mai 68) et aucun repère environnemental, religieux, scientifique ou migratoire. Les propositions ajoutent Schuman (1950), le 17 octobre 1961, l’indépendance algérienne (1962), la Vanoise (1963), la loi Neuwirth (1967) et la marche de 1983 : six repères, dont trois ne sont ni politique ni guerre au sens strict (Vanoise, Neuwirth, Marche) et deux articulent décolonisation et société (1961, 1962).

La période 1989-2026 ne contient que **5 repères** : Maastricht, l’euro, Charlie Hebdo, le Covid et les JO. Elle est presque entièrement parisienne, européenne ou globale. Les propositions ajoutent Creil (1989), le discours de Chirac (1995), les révoltes de 2005, la COP21 (2015) et l’IVG constitutionnelle (2024). Il manque encore : les attentats de 2015-2016 dans leur diversité, les mobilisations sociales (1995, 2019-2023), le mouvement #MeToo, les migrations de Calais, la crise du logement, la désindustrialisation, les outre-mer, la mémoire de l’esclavage (loi Taubira de 2001) et la pandémie dans ses inégalités.

### 2.6. Le biais parisien et le biais présentiste

Les résumés existants sont massivement parisiens : Bastille, Commune, Front populaire, Mai 68, Charlie, JO. Les lieux hors Paris existent (Massalia, Alésia, Lyon, Reims, Rouen, Alger, Verdun), mais ils ne sont pas structurés comme lieux datés. Les propositions apportent **11 lieux hors Paris sur 12** : Alésia, Marseille, Lyon, Versailles, Fort-de-France, Alger, Évian, Vanoise, Clichy-sous-Bois, Creil, Le Bourget. C’est un correctif, pas une solution : la carte reste dominée par l’Île-de-France.

Le biais présentiste est réel : la frise se termine sur les JO 2024 et le Covid, deux événements médiatiques, alors que des transformations plus lentes (désindustrialisation, précarisation, vieillissement, ségrégation urbaine, transition écologique) sont absentes. Les propositions 016, 017 et 018 introduisent des événements récents, mais elles doivent être lues avec la distance critique qui manque aux deux dernières.

## 3. Propositions d’événements (12–18)

Les 18 propositions sont détaillées dans `proposals.yaml`. Chaque proposition a au moins une source du registre ; neuf en ont deux. `confidence: high` signifie que l’événement est attesté, pas que son interprétation est consensuelle.

| ID | Date | Titre | Domaine / échelle | Sources | Pourquoi |
| --- | --- | --- | --- | --- | --- |
| PROP-001 | 1685 | Code noir | Droit, empire | SRC-002 | Codification juridique de l’esclavage colonial, absente de la frise. |
| PROP-002 | 1791 | Olympe de Gouges | Femmes, droits, arts | SRC-003 | Droits des femmes pendant la Révolution, absents. |
| PROP-003 | 1830 | Prise d’Alger | Guerre, empire | SRC-004 | Début de la conquête coloniale, absent. |
| PROP-004 | 1874 | Première exposition impressionniste | Arts, société | SRC-005 | Arts du XIXe siècle et femme peintre (Morisot), absents. |
| PROP-005 | 1898 | Marie et Pierre Curie | Sciences, genre | SRC-006 | Sciences après 1666 et femme scientifique, absentes. |
| PROP-006 | 1931 | Exposition coloniale internationale | Arts, empire, mémoire | SRC-007 | Représentation et contestation de l’empire, absentes. |
| PROP-007 | 1942 | Rafle du Vél’ d’Hiv | Guerre, religion, mémoire | SRC-008, SRC-009 | Distinguer Vichy, la police française et la Shoah. |
| PROP-008 | 1950 | Déclaration Schuman | Europe, économie | SRC-010 | Construction européenne avant Maastricht, absente. |
| PROP-009 | 1961 | 17 octobre 1961 | Migrations, minorités, mémoire | SRC-011, SRC-015 | Guerre d’Algérie dans ses effets métropolitains. |
| PROP-010 | 1962 | Indépendance de l’Algérie | Décolonisation, migrations | SRC-012, SRC-015 | Fin de la guerre et recomposition de la France. |
| PROP-011 | 1963 | Parc national de la Vanoise | Environnement, territoire | SRC-013 | Premier parc national, hors Paris ; environnement absent. |
| PROP-012 | 1967 | Loi Neuwirth | Femmes, droit, santé | SRC-014 | Contraception, entre 1944 et 1975. |
| PROP-013 | 1983 | Marche pour l’égalité | Migrations, société | SRC-015, SRC-016 | Immigration postcoloniale et antiracisme, absents. |
| PROP-015 | 1989 | Affaire des foulards de Creil | Religion, laïcité, genre | SRC-017, SRC-015 | Donner un contenu français à la borne 1989. |
| PROP-014 | 1995 | Discours de Jacques Chirac | Mémoire, politique | SRC-009, SRC-008 | Distinguer événement (1942) et mémoire (1995). |
| PROP-016 | 2005 | Révoltes des banlieues | Société, minorités | SRC-016, SRC-015 | Ségrégation, discriminations, violences policières. |
| PROP-017 | 2015 | Accord de Paris | Environnement, transnational | SRC-018, SRC-013 | Diplomatie climatique, absente. |
| PROP-018 | 2024 | IVG dans la Constitution | Femmes, droit | SRC-020, SRC-014 | Droits des femmes après 1975. |

**Répartition.** 16 propositions portent au moins un tag hors politique/guerre ; 8 concernent des femmes ou des groupes minorisés (002, 005, 009, 012, 013, 015, 016, 018) ; 10 se déroulent principalement hors de Paris ; 5 concernent l’empire ou la décolonisation (001, 003, 006, 009, 010) ; 2 concernent l’environnement (011, 017) ; 2 concernent la mémoire (007, 014). Les propositions 011 et 016 sont en `confidence: medium` : la date de la Vanoise doit être confirmée sur le texte officiel, et la causalité des révoltes de 2005 est disputée.

## 4. Corrections des événements existants

Dix corrections sont proposées. Aucune ne supprime un repère : elles précisent des formulations, corrigent des anachronismes et ajoutent des acteurs ou des limites.

| ID existant | Problème | Correction proposée | Sources |
| --- | --- | --- | --- |
| `fr-code-civil` | « Égalité civile » présentée comme générale. | Préciser l’égalité des hommes majeurs et propriétaires, la subordination des femmes et l’exclusion de l’esclavage colonial. | SRC-003, SRC-002 |
| `fr-revolution` | Droits de l’homme présentés comme universels. | Mentionner l’exclusion des femmes et des esclaves, l’abolition de 1794 et le rétablissement de 1802. | SRC-003, SRC-002 |
| `fr-ww2` | Occupation, Vichy, Résistance et Shoah fondus en un bloc. | Distinguer 1940, 1942 (rafle), 1944 (Libération) ; préciser le rôle des Alliés et des troupes coloniales. | SRC-008, SRC-009 |
| `fr-trente` | Événement 1945-1975 dans une ère 1945-1989. | Conserver 1945-1975 pour l’expansion, renommer l’ère ou ajouter 1975-1989. | SRC-019 |
| `fr-veil` | « Dépénalise » l’IVG sans conditions ni durée. | Écrire : autorise sous conditions pour cinq ans, puis reconduction et régime définitif. | SRC-014 |
| `fr-algerie` | FLN, civils algériens, torture, harkis et effets métropolitains absents. | Ajouter ces acteurs et distinguer guerre d’indépendance et histoire métropolitaine. | SRC-011, SRC-012 |
| `fr-laicite` | Laïcité présentée comme consensus intemporel. | Rappeler les conflits de 1905, l’application progressive et les débats sur le voile (1989, 2004). | SRC-017 |
| `fr-maastricht` | Intégration présentée comme nécessaire. | Mentionner le référendum de 1992 et les clivages, sans présenter l’approbation comme une évidence. | SRC-010 |
| `fr-euro` | Euro présenté comme simple continuité technique. | Rappeler qu’il s’inscrit dans un choix de politique économique et monétaire discuté. | SRC-010 |
| `fr-charlie` | Attentats réduits à la liberté d’expression. | Mentionner Charlie Hebdo, Montrouge, l’Hyper Cacher, le policier tué, l’antisémitisme et la laïcité. | SRC-017 |

**Corrections non retenues faute de source dans le registre.** Le baptême de Clovis (496/498/499), la formule impériale de Charlemagne, les « voûtes brisées » de Saint-Denis, l’expression « langue officielle » de Villers-Cotterêts, la date de la peste noire, le « sentiment national » de la guerre de Cent Ans et le caractère « inédit » du confinement de 2020 doivent être vérifiés sur des sources spécifiques avant correction. Elles sont listées comme points non résolus.

## 5. Acteurs et lieux à ajouter

### 5.1. Acteurs (11)

| ID | Acteur | Type | Pourquoi | Sources |
| --- | --- | --- | --- | --- |
| ACTOR-PROP-001 | Vercingétorix | individu | Donner un acteur à Alésia, absent du champ acteurs. | SRC-001 |
| ACTOR-PROP-002 | Olympe de Gouges | individu | Droits des femmes et abolitionnisme pendant la Révolution. | SRC-003 |
| ACTOR-PROP-003 | Berthe Morisot | individu | Femme peintre dans l’impressionnisme. | SRC-005 |
| ACTOR-PROP-004 | Marie Curie | individu | Sciences, genre, circulation internationale. | SRC-006 |
| ACTOR-PROP-005 | Simone Veil | individu | Porteuse de la loi de 1975, absente comme actrice. | SRC-014 |
| ACTOR-PROP-006 | Robert Schuman | individu | Déclaration du 9 mai 1950, Europe. | SRC-010 |
| ACTOR-PROP-007 | Frantz Fanon | individu transnational | Décolonisation, racialisation, FLN. | SRC-012 |
| ACTOR-PROP-008 | FLN et immigrés algériens | collectif | 17 octobre 1961, migrations. | SRC-011, SRC-015 |
| ACTOR-PROP-009 | Collectif de la Marche de 1983 | collectif | Antiracisme, immigration postcoloniale. | SRC-015, SRC-016 |
| ACTOR-PROP-010 | Habitants de Clichy-sous-Bois | collectif | Révoltes de 2005, ségrégation. | SRC-016, SRC-015 |
| ACTOR-PROP-011 | Jacques Chirac | individu | Mémoire de Vichy, discours de 1995. | SRC-009, SRC-008 |

Quatre femmes, trois collectifs, un acteur transnational. Ce n’est pas un quota : c’est un correctif à une frise où les acteurs sont presque tous des dirigeants masculins. Les acteurs sont documentés par leurs ressources, contraintes, réseaux, contre-pouvoirs, bilan et postérité dans `country-audit.yaml`.

### 5.2. Lieux (12)

| ID | Lieu | Échelle | Pourquoi | Sources |
| --- | --- | --- | --- | --- |
| PLACE-PROP-001 | Paris | national | Capitale, lieu de nombreux événements ; géométries à dater. | SRC-005, SRC-008, SRC-009, SRC-010, SRC-011 |
| PLACE-PROP-002 | Alésia (Alise-Sainte-Reine) | local | Oppidum, siège, lieu de mémoire. | SRC-001 |
| PLACE-PROP-003 | Marseille (Massalia) | régional | Cité grecque, port, départ de la marche de 1983. | SRC-001, SRC-015 |
| PLACE-PROP-004 | Lyon (Lugdunum) | régional | Colonie romaine, capitale des Gaules. | SRC-001 |
| PLACE-PROP-005 | Versailles | national | Résidence royale, Code noir, Congrès de 2024. | SRC-002, SRC-020 |
| PLACE-PROP-006 | Fort-de-France | impérial | Ville coloniale, Code noir, mémoire de l’esclavage. | SRC-002 |
| PLACE-PROP-007 | Alger | impérial | Conquête de 1830, indépendance de 1962. | SRC-004, SRC-012 |
| PLACE-PROP-008 | Évian-les-Bains | local | Accords de 1962. | SRC-012 |
| PLACE-PROP-009 | Parc national de la Vanoise | régional | Premier parc national, conflits d’usages. | SRC-013 |
| PLACE-PROP-010 | Clichy-sous-Bois | local | Révoltes de 2005. | SRC-016, SRC-015 |
| PLACE-PROP-011 | Creil | local | Affaire des foulards de 1989. | SRC-017, SRC-015 |
| PLACE-PROP-012 | Le Bourget | transnational | COP21 de 2015. | SRC-018, SRC-013 |

Onze lieux hors de Paris. Les noms historiques, les géométries datées et les fonctions sont détaillés dans `country-audit.yaml`. Les lieux ne sont pas des points modernes : Alésia, Lugdunum, Massalia, Fort-Royal et Alger ont des noms et des géométries d’époque.

## 6. Risques de biais et points disputés

### 6.1. Risques de biais

- **Biais politique** : la frise reste majoritairement une histoire de l’État, des régimes et des guerres. Les propositions sociales et culturelles ne corrigent pas la structure ; elles ajoutent des exceptions.
- **Biais parisien** : 11 lieux hors Paris dans les propositions, mais Paris reste le centre de gravité (Révolution, Commune, 1961, 1995, 2024). Il faut une géographie systématique, pas une liste.
- **Biais colonial** : l’Algérie sert de proxy à tout l’empire. Le Code noir et l’Exposition de 1931 ouvrent le dossier, mais l’Indochine, l’Afrique subsaharienne, les Caraïbes et l’océan Indien restent absents.
- **Biais de genre** : ajouter Olympe, Morisot, Curie et Veil peut produire un tokenisme si l’on ne documente pas le travail, la maternité, la citoyenneté, la sexualité et les rapports de pouvoir.
- **Biais présentiste** : les JO 2024, le Covid et l’IVG 2024 sont proches ; leur place doit être justifiée par leur impact, pas par l’actualité.
- **Biais de source** : les sources sont majoritairement anglophones et universitaires ; les archives françaises, les sources orales et les mémoires des groupes dominés sont sous-représentées.
- **Biais de période** : la frise est plus dense au XIXe-XXe siècle qu’à l’Antiquité et au Moyen Âge, ce qui est normal pour la documentation mais doit être signalé.

### 6.2. Points disputés

- **Bilan du 17 octobre 1961** : les estimations varient de plusieurs dizaines à plus de 200 morts. La fiche doit rester `disputed`.
- **Bilan de la rafle du Vél’ d’Hiv** : environ 13 000 arrestations, mais les catégories et les transferts doivent être vérifiés.
- **Date du baptême de Clovis** : 496, 498 ou 499 ; la frise doit utiliser un `TimeSpan` incertain.
- **Portée de la loi Neuwirth** : autorisation, prescription, publicité et remboursement sont des questions distinctes.
- **Nature de la garantie constitutionnelle de 2024** : « droit » ou « liberté » ; le débat juridique est ouvert.
- **Interprétation du plan Schuman** : fédéralisme européen ou consolidation des États-nations (SRC-010).
- **Causalité des révoltes de 2005** : ségrégation, chômage, contrôles policiers, racisme ; aucune cause unique.
- **Label « Trente Glorieuses »** : 1946-1975 chez Fourastié, 1945-1989 dans la frise ; l’écart est structurant.
- **Bornes 1492 et 1989** : conventions européennes, pas des ruptures françaises.
- **Vichy et la Résistance** : la frise fond les deux dans un bloc ; la distinction est pourtant essentielle.
- **Laïcité** : principe conflictuel, pas consensus intemporel ; 1905, 1989 et 2004 doivent être articulés.
- **Mémoire coloniale** : la loi Taubira (2001), la loi Mekachera (2005) et les débats sur les statues ne sont pas dans la frise.

## 7. Dettes documentaires et niveau de confiance

### 7.1. Ce qui est vérifié

**20 sources** sont enregistrées dans `source-register.csv`. Toutes ont été vérifiées le 2026-11-13 via Crossref (DOI), le catalogue de la BnF (notices, ISBN) ou une page institutionnelle. Les sources sont de niveaux différents : synthèses savantes (Woolf, Scott, Sessions, Higonnet, Morton, Paxton, Rousso, Milward, House & MacMaster, Shepard, Bess, Pavard, Hargreaves, Fassin, Bowen), article évalué (Bojovic et Stanisljevic), ouvrage d’économie historique (Fourastié), source primaire (UNFCCC), page institutionnelle (Nobel). Aucune source n’est inventée ; aucune citation n’est forgée.

### 7.2. Ce qui n’est pas vérifié

- **Deux sources indépendantes par fiche** : la règle n’est pas atteinte pour plusieurs propositions (Code noir, Olympe, Alger, Impressionnisme, Curie, Exposition, Schuman, Vanoise, Neuwirth). Une seule source savante soutient parfois l’essentiel. C’est une exception documentée, pas une validation.
- **Césures 1492, 1610, 1815, 1914** : aucune source spécifique du registre ne les documente. Elles sont conservées comme conventions, avec alternatives.
- **Antiquité, Moyen Âge, Renaissance** : les sources sont rares ; Woolf couvre la Gaule romaine, mais pas Clovis, Charlemagne, les cathédrales ou la Pléiade. Les cellules correspondantes sont `partiel` ou `vide justifié`, pas `couvert`.
- **Handicap, LGBTQ+, diasporas non algériennes, outre-mer** : aucune source du registre ; omissions documentées, dettes à combler.
- **Double lecture, kappa, Delphi** : non réalisés. `verdict: pending`, scores `null`, signoff vide. Le dossier n’est pas publiable en l’état.
- **Grokipedia** : les 53 liens de `data.js` n’ont pas été vérifiés dans cet audit ; ils restent des points d’entrée, pas des preuves.

### 7.3. Couverture

La matrice `coverage-matrix.csv` contient **126 cellules** (9 ères × 14 domaines) : **30 couvertes**, **62 partielles**, **34 vides justifiées**, **0 vide non traité**. Les 30 cellules couvertes le sont au titre des propositions structurées (acteurs, lieu, sources) ; aucune fiche existante n’atteint le seuil `couvert` du schéma v1.0, faute d’acteurs, de lieux et de sources. Le taux « couvert ou justifié » est donc de **64/126 (50,8 %)**, très en dessous de la cible de 90 %. Ce n’est pas un échec de méthode : c’est la mesure honnête d’une frise POC qui n’a pas encore de schéma de preuve.

### 7.4. Niveau de confiance

- **Élevé** : Code noir, Olympe, Alger, Impressionnisme, Curie, Exposition coloniale, Rafle, Schuman, 1961, 1962, Neuwirth, Marche, Chirac, Creil, COP21, IVG.
- **Moyen** : Vanoise (date et acteurs locaux à confirmer), 2005 (causalité disputée), euro (interprétation), Charlie (cadrage) ; l’interprétation de Maastricht est discutée, mais la correction factuelle est solide.
- **Faible / à instruire** : Antiquité non romaine, Moyen Âge juridique et scientifique, Renaissance artistique, migrations du XIXe siècle, environnement du XIXe siècle, sciences de la Grande Guerre, religions de 1945-1989, arts contemporains, handicap, LGBTQ+, diasporas.

## Points non résolus

1. Date exacte du baptême de Clovis (496, 498 ou 499) et statut de l’année 496 dans la frise.
2. Bilan exact du 17 octobre 1961 ; maintien du statut `disputed`.
3. Nombre exact de victimes de la rafle du Vél’ d’Hiv et catégories de victimes.
4. Date et portée du décret de création du parc national de la Vanoise (6 juillet 1963 à confirmer sur le texte officiel).
5. Rôle exact des acteurs locaux et associatifs dans la marche de 1983.
6. Causalité des révoltes de 2005 : confronter Fassin, Hargreaves et les rapports parlementaires.
7. Portée juridique exacte de la loi Neuwirth (autorisation, prescription, publicité, remboursement).
8. Limites coloniales du droit de vote des femmes en 1944 (Algérie, colonies, statuts personnels).
9. Place de la Shoah et de Vichy : une seule fiche « Seconde Guerre mondiale » est insuffisante.
10. Absence de sources sur l’histoire LGBTQ+, le handicap, les diasporas non algériennes et les outre-mer.
11. Formulation constitutionnelle de 2024 : « droit » ou « liberté » ; vérifier le débat juridique.
12. Arbitrage de la période 1945-1989 : ère unique, scission 1945-1975 / 1975-1989, ou périodisation sociale plus longue.
13. Vérifier les 53 liens Grokipedia et remplacer progressivement les résumés éditoriaux par des fiches sourcées.
14. Faire une double lecture humaine (100 % des fiches sensibles, 25 % des autres) et calculer le kappa avant tout `verdict` autre que `pending`.
