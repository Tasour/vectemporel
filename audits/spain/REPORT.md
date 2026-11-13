# Espagne — rapport d’audit v1.0

**Périmètre de travail.** Frise actuelle : 711 → 2026, 5 ères, 13 repères, 5 tags. Audit réalisé le 2026-11-13. Dossier non signé : `verdict: pending`, scores `null`, `signoff` vide. Les propositions sont une file de revue, pas un patch de `data.js`.

**Ce que contient le dossier.** 20 sources vérifiées, 18 propositions d’événements, 12 acteurs, 12 lieux, 13 corrections, 13 omissions documentées, une matrice de 70 cellules (5 ères × 14 domaines).

---

## 1. Verdict de périodisation

La périodisation actuelle est **lisible mais politique et téléologique**. Elle organise l’histoire espagnole autour de cinq scansions fortes — 711, 1492, 1808, 1936, 1975 — qui sont toutes des bornes de souveraineté, de guerre ou de régime. Elle fonctionne comme récit grand public, mais elle produit quatre effets de masquage.

**Premier effet : 711 efface l’histoire antérieure.** La frise commence avec la conquête omeyyade et fait comme si l’Ibérie n’avait pas d’histoire avant l’islam. L’Hispanie romaine, les peuples ibères et celtibères, le royaume wisigoth et les conciles de Tolède disparaissent. Or 711 n’est pas une naissance : c’est la fin d’un royaume et l’installation progressive de forces arabo-berbères dans un espace déjà romain, chrétien et urbain (SRC-001, SRC-002). Le choix de 711 est donc un choix de récit, pas une évidence chronologique.

**Deuxième effet : « Al-Andalus & Reconquista » est un bloc de 781 ans et un label téléologique.** La période mélange l’émirat, le califat de Cordoue, les taïfas, les empires almoravide et almohade, le royaume nasride, les royaumes chrétiens et la Castille des Trastamare. Elle présente Al-Andalus comme une étape de la Reconquista, alors que l’histoire d’al-Andalus a ses propres périodisations, ses crises et ses productions savantes (SRC-003). Le mot « Reconquista » est lui-même une construction historiographique, pas un concept neutre (SRC-001, SRC-004).

**Troisième effet : 1492 confond trois événements.** La prise de Grenade (2 janvier), le décret d’expulsion des Juifs (31 mars) et l’arrivée de Colomb aux Caraïbes (12 octobre) sont réunis dans une même année, souvent résumée par « fin de la Reconquista ». Cette formulation masque la politique de confessionnalisation, la conversion forcée des musulmans de Castille en 1502 et la formation de la diaspora séfarade (SRC-005, SRC-008). 1492 est une charnière, mais une charnière triple.

**Quatrième effet : les bornes de 1808, 1936 et 1975 sont politiques et militaires.** Elles ne coïncident pas avec les périodisations sociales, économiques ou culturelles. 1808 ouvre une crise politique, mais l’industrialisation et l’urbanisation sont plus tardives ; 1936 ouvre la guerre, mais la dictature commence en 1939 ; 1975 est la mort de Franco, pas l’adoption de la Constitution (1978). La période 1936-1975 fusionne guerre et dictature, ce qui brouille l’analyse de la répression, de l’exil et de la transition.

### Les trois périodisations comparées

| Périodisation | Bornes principales | Ce qu’elle fait apparaître | Ce qu’elle masque |
| --- | --- | --- | --- |
| Politique | -218, 418, 711, 1492, 1808, 1874, 1931, 1939, 1975, 1978 | Souverainetés, régimes, guerres, constitutions | Travail, démographie, genre, environnement |
| Sociale et économique | Romanisation, société agraire, empire colonial, industrialisation, société de masse, tertiarisation | Paysannerie, migrations, classes populaires, précarité | Ruptures politiques et symboliques |
| Culturelle, religieuse et environnementale | 589, 711, 1492, 1609, 1808, 1939, 1975, crise environnementale | Christianisation, coexistence, confessionnalisation, sécularisation, mémoires | Économie et institutions |

La périodisation politique reste la plus adaptée à une frise grand public, mais elle doit être **corrigée par un prologue et des sous-périodes**. La proposition retenue n’est pas de tout refaire : elle est de conserver les cinq grandes scansions, d’ajouter une ère -218/711 et de subdiviser les blocs trop longs. Le détail est dans `proposals.yaml` (10 changements de périodisation).

**Recommandation prioritaire.**
1. Ajouter un prologue -218/711 (Ibérie, Hispania romaine, royaume wisigoth).
2. Renommer « Al-Andalus & Reconquista » en « Al-Andalus et royaumes chrétiens ».
3. Scinder 1936-1939 (guerre) et 1939-1975 (franquisme).
4. Scinder 1975-1986 (transition) et 1986-2026 (Espagne européenne).
5. Ajouter 1978 comme borne constitutionnelle interne à la transition.

---

## 2. Angles morts et biais de sélection

La frise actuelle est massivement politique et militaire. Sur 13 repères, **12 comportent le tag `politique` ou `guerre`**, soit 92 %. Les tags présents sont `politique` (8 occurrences), `guerre` (6), `religion` (4), `exploration` (1), `economie` (1). Les tags `societe`, `sciences` et `arts` sont absents. L’audit structurel mesure 33 % de couverture tags × ères ; la frise combine cinq tags seulement, alors que la méthode distingue quatorze domaines. Aucun événement n’est consacré aux femmes, aux minorités, à l’environnement, à la mémoire ou à la culture matérielle.

| Domaine | Repères actuels | Diagnostic |
| --- | ---: | --- |
| Politique & institutions | 8 | Surreprésenté |
| Guerres & diplomatie | 6 | Surreprésenté |
| Droit & justice | 1 (1812, implicite) | Partiel |
| Économie & travail | 1 | Faible |
| Société & démographie | 0 | Absent |
| Femmes, genre, sexualités | 0 | Absent |
| Religions & croyances | 4 | Présent mais déséquilibré |
| Sciences, techniques & santé | 0 | Absent |
| Arts & lettres | 0 | Absent |
| Environnement & territoire | 0 | Absent |
| Migrations & diasporas | 0 | Absent |
| Peuples autochtones & minorités | 0 | Absent |
| Mémoire & patrimoine | 0 | Absent |
| Circulations transnationales | 1 | Faible |

*Les colonnes ne s’additionnent pas : un même repère peut relever de plusieurs domaines.*

### Les absences principales

**Avant 711.** Aucun repère sur l’Ibérie préromaine, l’Hispanie romaine ou le royaume wisigoth. La frise commence par une conquête extérieure, ce qui naturalise l’idée que l’Espagne commencerait avec l’islam. C’est le biais le plus structurant.

**Al-Andalus.** Un seul repère (711), complété par Covadonga. Rien sur le califat de Cordoue (929-1031), les taïfas, les Almoravides, les Almohades, le royaume nasride, les Berbères, les muladíes, les mozárabes ou les esclaves. Al-Andalus apparaît surtout comme un adversaire militaire, malgré la mention de foyer culturel, pas comme une société.

**Juifs, musulmans et Roms.** L’expulsion des Juifs est mentionnée dans le résumé de 1492, mais elle n’a pas de fiche propre. Les mudéjars et les morisques sont absents, alors que l’expulsion de 1609-1614 est un événement majeur (SRC-006). Les Roms/Calé sont totalement absents, y compris la Grande Rafle de 1749 (SRC-007). La diversité religieuse est réduite à une opposition binaire.

**Femmes.** Aucun événement n’a les femmes pour sujet. Isabelle de Castille apparaît dans le mariage de 1469, mais comme épouse et non comme reine en titre. Clara Campoamor, Federica Montseny, Dolores Ibárruri et Mujeres Libres sont absentes. Le suffrage féminin de 1931 n’est pas mentionné (SRC-013, SRC-011).

**Paysans et monde du travail.** Aucun repère sur les jornaleros, les métayers, les communs, les grèves ou la CNT. L’anarchisme andalou, pourtant central dans l’histoire sociale espagnole, est absent (SRC-012). La frise donne l’impression d’une histoire faite par des gouvernements et des armées.

**Colonies et esclavage.** 1898 est présent, mais la guerre de Cuba de 1895-1898, la politique de reconcentration, l’esclavage cubain et l’abolition de 1873-1886 sont absents (SRC-010). Le colonialisme africain — Maroc, Sahara occidental, Guinée équatoriale — n’est pas traité, alors que l’Espagne y reste engagée après 1898 (SRC-009).

**Guerre civile et franquisme.** Deux repères (1936-1939, 1939-1975), mais rien sur la répression, les camps, les fosses communes, l’exil de 1939, les maquis, les Brigades internationales ou les femmes. Le franquisme est résumé par l’isolement puis un développement économique accéléré, ce qui efface le prix social et politique (SRC-014).

**Transition et mémoires.** La Constitution de 1978 est présente, mais pas la loi d’amnistie de 1977, les pactes de la Moncloa, le 23-F, les lois mémorielles, notamment celle de 2022, ni les débats sur le Valle de los Caídos. La transition apparaît comme un modèle sans coût mémoriel (SRC-015).

**Catalogne et Pays basque.** La crise catalane de 2017 est le seul repère périphérique. Rien sur 1714, la Renaixença, la Semaine tragique, la guerre civile en Catalogne, le statut basque, ETA ou le cessez-le-feu de 2011. La plurinationalité de l’Espagne est un point de débat politique et historiographique, mais elle n’est pas documentée dans la frise.

**15-M et environnement.** Aucun repère sur le mouvement des Indignés de 2011 (SRC-017) ni sur le Prestige de 2002 (SRC-019). L’histoire post-2000 est réduite à la crise catalane.

**Culture et sciences.** Aucun repère sur le Siècle d’or, les traductions de Tolède, Averroès, Maimonide, Cajal, le CSIC, le cinéma ou la littérature. La frise est une histoire politique sans production culturelle.

### Ce que la matrice montre

La matrice de couverture compte **51 cellules couvertes, 7 partielles, 12 vides justifiées, 0 vide non traitée**, soit **90 % de cellules couvertes ou justifiées** selon la définition du dossier. Ce chiffre est meilleur que la frise publiée parce qu’il inclut les propositions. Il ne signifie pas que la frise est complète : les 12 vides justifiées renvoient à des dettes documentaires (environnement, femmes, sciences, arts) ou à une non-applicabilité (guerre interétatique) ; d’autres dettes (colonies africaines, répression franquiste, immigration récente) sont documentées dans `omissions.yaml` sans correspondre à une case vide.

---

## 3. Propositions d’événements (12–18)

18 propositions, dont **6 hors politique/guerre** (Cordoue, traductions de Tolède, abolition de l’esclavage, émigration des années 1960, Prestige, loi mémorielle), **4 sur des femmes ou des groupes minorisés** (Juifs, Morisques, Roms, suffrage féminin), auxquelles s’ajoute l’exil républicain, **plusieurs hors Madrid** (Cordoue, Tolède, Grenade, Valence, Barcelone, Galice, Pays basque) et **2 sur l’environnement ou la mémoire**.

| ID | Date | Proposition | Domaines / tags | Sources | Confiance |
| --- | --- | --- | --- | --- | --- |
| PROP-001 | -218/-19 | Hispania romaine | politique, guerre | SRC-001, SRC-002 | haute |
| PROP-002 | 589 | IIIe concile de Tolède | religion, politique | SRC-001 | haute |
| PROP-003 | 929-1031 | Califat de Cordoue | politique, sciences, arts | SRC-003, SRC-001 | haute |
| PROP-004 | 1140-1280 | Traductions de Tolède | sciences, arts, religion | SRC-003, SRC-004 | moyenne |
| PROP-005 | 1492 | Expulsion des Juifs | religion, société, politique | SRC-005, SRC-008 | haute |
| PROP-006 | 1520-1521 | Révolte des Comuneros | politique, guerre | SRC-008 | haute |
| PROP-007 | 1609-1614 | Expulsion des Morisques | religion, société, politique | SRC-006, SRC-008 | haute |
| PROP-008 | 1707-1716 | Décrets de Nueva Planta | politique, société | SRC-008 | haute |
| PROP-009 | 1749 | Grande Rafle des Roms | société, politique | SRC-007 | haute |
| PROP-010 | 1873-1886 | Abolition de l’esclavage | économie, politique | SRC-011 | moyenne |
| PROP-011 | 1931 | Seconde République | politique, société | SRC-013, SRC-011 | haute |
| PROP-012 | 1931 | Suffrage féminin | politique, société | SRC-013, SRC-011 | haute |
| PROP-013 | 1939 | La Retirada | guerre, société, politique | SRC-016, SRC-014 | haute |
| PROP-014 | 1960-1973 | Émigration des années 1960 | économie, société | SRC-011 | moyenne |
| PROP-015 | 2002 | Marée noire du Prestige | société, économie | SRC-019 | haute |
| PROP-016 | 2011 | Cessez-le-feu d’ETA | politique, société | SRC-011 | haute |
| PROP-017 | 2011 | 15-M | politique, société | SRC-017 | haute |
| PROP-018 | 2022 | Loi de mémoire démocratique | politique, société | SRC-020, SRC-015 | haute |

**Justification des choix.**
- **Prologue** : PROP-001 et PROP-002 corrigent l’effacement de l’Ibérie romaine et du royaume wisigoth. Ils ne sont pas décoratifs : ils expliquent la structure romaine et chrétienne sur laquelle 711 intervient.
- **Al-Andalus** : PROP-003 et PROP-004 donnent une histoire positive de Cordoue et de Tolède, au lieu de réduire al-Andalus à la conquête et à la Reconquista.
- **Minorités religieuses** : PROP-005, PROP-007 et PROP-009 séparent l’expulsion des Juifs, l’expulsion des Morisques et la persécution des Roms. Ce sont trois histoires distinctes, avec des acteurs et des lieux différents.
- **État et territoires** : PROP-008 (Nueva Planta) documente la construction de l’État central et la mémoire de 1714 en Catalogne.
- **Société et travail** : PROP-006, PROP-010, PROP-011, PROP-012, PROP-013 et PROP-014 introduisent les Comuneros, l’esclavage colonial, la Seconde République, le suffrage féminin, l’exil et l’émigration. Ils corrigent le biais politique.
- **Contemporain** : PROP-015, PROP-016, PROP-017 et PROP-018 introduisent l’environnement, le Pays basque, le 15-M et la mémoire. Ils évitent que 2017 soit le seul repère récent.

**Ce que les propositions ne font pas.** Elles ne remplacent pas une histoire des femmes sur la longue durée, une histoire des paysans, une histoire des sciences ou une histoire de l’art. Ces domaines restent des dettes (OM-004 à OM-009). Les propositions sont des **repères**, pas des synthèses.

---

## 4. Corrections des événements existants

13 corrections sont proposées. Les plus importantes concernent 711, 1492, 1898, la guerre civile, le franquisme et la Catalogne.

| ID | Problème | Correction proposée | Sources |
| --- | --- | --- | --- |
| es-711 | « Les Omeyyades débarquent » et date unique ; le royaume wisigoth disparaît | Bataille de Guadalete (juillet 711) et conquête progressive ; forces arabo-berbères ; prologue -218/711 | SRC-001, SRC-003 |
| es-covadonga | Date de 722 et « début de la Reconquista » présentés comme des faits | « Vers 722, selon une tradition tardive » ; requalifier la Reconquista | SRC-001 |
| es-mariage | « Prépare l’unification » téléologique ; Inquisition mal datée | Mariage de Valladolid (19 octobre 1469) ; Castille et Aragon distincts ; Inquisition en 1478 | SRC-008, SRC-005 |
| es-grenade | Confond capitulation, expulsion et voyage de Colomb ; ignore 1502 | Scinder les trois repères ; ajouter la conversion forcée de 1502 | SRC-005, SRC-008 |
| es-colomb | « L’Amérique entre dans l’histoire européenne » eurocentré ; Taïnos absents | Colomb atteint Guanahani et les Caraïbes ; mentionner les Taïnos et la colonisation | SRC-008 |
| es-armada | « Invincible Armada » est un surnom anglais ; effet surestimé | Expédition de 1588 et échec ; la puissance navale espagnole continue | SRC-008 |
| es-independance | Guérilla, afrancesados et crise coloniale absents | Ajouter ces dimensions et les Cortès de Cadix | SRC-011 |
| es-1898 | « Dernières colonies » est faux ; « Désastre » est un label espagnol | Cuba, Porto Rico, Philippines, Guam ; distinguer l’empire africain | SRC-010, SRC-009 |
| es-civile | « Laboratoire » cliché ; répression, femmes et dates absentes | 17 juillet 1936-1er avril 1939 ; interventions étrangères ; répression | SRC-013, SRC-014 |
| es-franco | « Quarante ans » est faux (36 ans) ; développement présenté sans coûts | 1939-1975 ; autarcie, 1955, 1959, émigration, tourisme ; répression | SRC-014, SRC-011 |
| es-constitution | « Consolide la transition » vague ; amnistie et 23-F absents | Référendum du 6 décembre 1978 ; loi de 1977 ; pactes de 1977 ; 23-F | SRC-015, SRC-011 |
| es-catalogne | Référendum suspendu non mentionné ; crise réduite à un jour | 1er octobre 2017 ; suspension ; déclaration du 27 octobre ; élections de décembre | SRC-018 |
| es-cee | Modernisation téléologique | OTAN 1982 ; référendum 1986 ; fonds structurels ; ajustements industriels | SRC-011 |

**Priorités de correction.**
1. **es-711** : la formulation actuelle est la plus dommageable, parce qu’elle fonde la frise sur une rupture et efface l’histoire antérieure.
2. **es-grenade** : le résumé confond trois événements et empêche de comprendre 1492.
3. **es-1898** : l’expression « dernières colonies » est factuellement fausse.
4. **es-franco** : « quarante ans » est faux et le bilan est trop favorable.
5. **es-catalogne** : le résumé ne mentionne pas la suspension constitutionnelle, ce qui déséquilibre le récit.

---

## 5. Acteurs et lieux à ajouter

### Acteurs (12)

| Acteur | Type | Pourquoi | Sources |
| --- | --- | --- | --- |
| Isabelle Ire de Castille | individuelle | Reine en titre, actrice de 1469, 1492 et de la confessionnalisation | SRC-008, SRC-005 |
| Christophe Colomb | individuelle | Expédition de 1492, colonisation, controverses mémorielles | SRC-008 |
| Philippe II | individuelle | Empire, Armada, répression religieuse, limites de la puissance | SRC-008 |
| Averroès (Ibn Rushd) | individuelle | Vie savante d’al-Andalus, circulations intellectuelles | SRC-003 |
| Clara Campoamor | individuelle | Suffrage féminin de 1931 | SRC-013, SRC-011 |
| Federica Montseny | individuelle | Première femme ministre, anarchisme, guerre | SRC-013, SRC-011 |
| Dolores Ibárruri | individuelle | PCE, mobilisation républicaine, internationalisation | SRC-013, SRC-014 |
| Francisco Franco | individuelle | Dictature, répression, développement, postérité | SRC-014, SRC-013 |
| Juan Carlos Ier | individuelle | Transition, monarchie parlementaire, contestations | SRC-015, SRC-011 |
| CNT | collective | Mouvement ouvrier, grèves, guerre civile | SRC-012, SRC-013 |
| Mujeres Libres | collective | Émancipation des femmes, anarchisme | SRC-013, SRC-011 |
| Diaspora séfarade | collective | Expulsion de 1492, réseaux transnationaux, mémoire | SRC-005 |

**Équilibre.** 4 femmes, 3 acteurs collectifs, 1 acteur transnational. Les dirigeants sont documentés par leurs ressources, contraintes, réseaux, contre-pouvoirs et postérité, pas comme des vignettes héroïques. Les acteurs sans pouvoir — Taïnos, jornaleros, Roms, esclaves — sont mentionnés dans les fiches et les omissions, mais ils mériteraient des fiches propres.

### Lieux (12)

| Lieu | Hiérarchie | Pourquoi | Sources |
| --- | --- | --- | --- |
| Madrid | national | Capitale, Constitution, guerre, franquisme, 15-M | SRC-011, SRC-015 |
| Barcelone | régional | Industrie, anarchisme, 1909, 1936, 2017 | SRC-011, SRC-018 |
| Grenade | régional | Capitale nasride, 1492, mémoire | SRC-003, SRC-008 |
| Cordoue | régional | Califat, vie savante, patrimoine | SRC-003 |
| Tolède | régional | Capitale wisigothe, conciles, traductions | SRC-001, SRC-003 |
| Séville | régional | Port colonial, Casa de Contratación, archives | SRC-008, SRC-010 |
| Valence | régional | Morisques, capitale républicaine, guerre | SRC-006, SRC-011 |
| Bilbao | régional | Industrie, nationalisme basque, guerre | SRC-011, SRC-014 |
| Guernica | local | Bombardement de 1937, mémoire | SRC-014, SRC-013 |
| Cadix | régional | Constitution de 1812, port atlantique | SRC-011, SRC-010 |
| Palos de la Frontera | local | Départ de Colomb, mémoire de 1492 | SRC-008 |
| A Coruña / côte galicienne | régional | Prestige, environnement, pêche | SRC-019 |

**Équilibre.** 11 lieux sur 12 sont hors de Madrid. Les lieux sont datés : Grenade comme royaume nasride, Cordoue comme capitale califale, Tolède comme capitale wisigothe, Valence comme capitale républicaine en 1936-1937. Le dossier indique la période de validité et la fonction, sans projeter une frontière moderne.

---

## 6. Risques de biais et points disputés

**Téléologie de la Reconquista.** Le récit actuel fait de 711 une origine et de 1492 une fin. Il faut remplacer « Reconquista » par une description des conflits et des souverainetés, et rappeler que le concept est une construction historiographique (SRC-001, SRC-004).

**Idéalisation de la convivencia.** Al-Andalus n’est ni un paradis interreligieux ni une simple occupation. La coexistence, les conversions, les violences et les hiérarchies sociales doivent être documentées ensemble (SRC-003, SRC-004).

**1898 et le récit du « Désastre ».** Le mot « Désastre » est un label espagnol, pas une catégorie neutre. La perte de Cuba, Porto Rico, des Philippines et de Guam ne signifie pas la fin de l’empire : l’Espagne conserve le Río de Oro/Sahara occidental et la Guinée équatoriale, et établit un protectorat au Maroc en 1912 (SRC-009, SRC-010).

**Franquisme : fascisme ou autoritarisme ?** Le débat est structurant. Le régime combine parti unique, corporatisme, national-catholicisme et répression, mais sa qualification de « fasciste » est discutée. La fiche doit présenter les deux lectures, pas trancher par une étiquette (SRC-013, SRC-014).

**Transition : modèle ou amnésie ?** La transition négociée est souvent présentée comme un modèle. Les travaux sur la mémoire montrent qu’elle repose aussi sur l’amnistie, le silence et le report de la justice (SRC-015). Il faut distinguer la consolidation démocratique et le coût mémoriel.

**Catalogne et Pays basque.** La crise catalane de 2017 ne peut pas être isolée de 1714, du statut de 1932, de la transition et du statut de 2006. Le Pays basque ne peut pas être réduit à ETA : il faut documenter le statut de 1979, la violence, le cessez-le-feu de 2011 et les mémoires des victimes (SRC-018, SRC-011).

**Chiffres disputés.** Les estimations des expulsions (1492, 1609-1614), de la Grande Rafle de 1749, de la Retirada de 1939 et de la répression franquiste varient. Le dossier donne des ordres de grandeur, pas des chiffres définitifs. Toute précision chiffrée supplémentaire doit être sourcée.

**Biais de langue et de corpus.** Le registre est majoritairement anglophone (17 sources sur 20), avec 2 sources espagnoles et 1 française. Il manque des synthèses en espagnol sur l’histoire sociale, les femmes, les paysans et les colonies. Ce biais est documenté, pas corrigé par vraisemblance.

**Risques S1 potentiels.**
- Date de la bataille de Guadalete : jour incertain.
- Historicité de Covadonga : tradition tardive.
- Nombre de Juifs et de Morisques expulsés : estimations divergentes.
- « Dernières colonies » en 1898 : faux si on inclut l’Afrique.
- « Quarante ans » de franquisme : 36 ans.
- « Fascisme » appliqué au franquisme sans discussion : désaccord F3.
- « Modèle » de transition sans mention de l’amnistie : désaccord F4.

---

## 7. Dettes documentaires et niveau de confiance

**Base de sources.** 20 sources : 17 monographies savantes, 2 articles évalués par les pairs, 1 source primaire institutionnelle (BOE). 17 en anglais, 2 en espagnol, 1 en français. Dates de consultation : 2026-11-13. Les DOI, ISBN et URL sont dans `source-register.csv`. Les éditions originales et les rééditions sont distinguées dans les notes (Kennedy 1996/2014, Ray 2013/2020, Kaplan 1977/2015).

**Dette de schéma.** Les 18 propositions disposent d’une année ou d’un intervalle, mais pas encore d’un `TimeSpan` complet (calendrier, précision, certitude, bornes intérieure et extérieure) ni de claims par fiche. Le dossier fournit acteurs, lieux, sources et claims au niveau du pays, mais `data.js` n’a toujours pas ces champs par événement. La prochaine étape est de convertir chaque proposition en fiche-événement selon `templates/event-record.yaml`.

**Couverture.** 51 cellules couvertes, 7 partielles, 12 vides justifiées, 0 vide non traitée. Le seuil de 90 % est atteint au sens « couvertes ou justifiées », mais 7 cellules restent partielles et 12 vides justifiées sont des dettes ou des non-applicabilités. Les domaines les plus faibles sont l’environnement médiéval et moderne, les femmes avant 1931 et après 1975, les sciences, les arts et le colonialisme africain.

**Confiance des propositions.** 15 propositions à confiance haute, 3 à confiance moyenne (traductions de Tolède, abolition de l’esclavage, émigration des années 1960). Aucune proposition à confiance basse. Les exceptions de source unique sont documentées dans `proposals.yaml` : concile de Tolède (SRC-001), Comuneros (SRC-008), Nueva Planta (SRC-008), Grande Rafle (SRC-007), abolition (SRC-011), émigration (SRC-011), Prestige (SRC-019), ETA (SRC-011), 15-M (SRC-017). Les acteurs Colomb, Philippe II, Averroès et la diaspora séfarade, ainsi que les lieux Cordoue, Palos et A Coruña, reposent aussi sur une source unique ; ces exceptions sont signalées ici et devront être complétées par des sources spécialisées.

**Ce qui manque pour passer en v1.1.**
- Une histoire des femmes et du genre sur la longue durée (travail, famille, sexualité, droits).
- Une histoire des paysans, des jornaleros et des communs.
- Une histoire de l’esclavage et des populations afrodescendantes dans l’empire.
- Une histoire du colonialisme africain (Maroc, Sahara, Guinée).
- Une histoire de la répression franquiste (camps, tribunaux, fosses).
- Une histoire de la transition et des lois mémorielles.
- Une histoire environnementale (eau, forêts, mines, Prestige, Mar Menor, DANA 2024).
- Une histoire des sciences et des arts.
- Des sources en espagnol et des sources primaires d’archive.

**Ce que le dossier permet de faire.** Un éditeur peut corriger les 13 événements existants, ajouter les 18 propositions, remplacer les formulations téléologiques et documenter les absences. Il ne peut pas encore publier une frise « exhaustive » : le dossier est un audit de première version, pas une validation.

---

## Points non résolus

1. **Date exacte de la bataille de Guadalete** : juillet 711 est certain, le jour ne l’est pas.
2. **Historicité de Covadonga** : la tradition de 722 n’est pas contemporaine ; faut-il conserver le repère comme « tradition » ou le déplacer ?
3. **Nombre de Juifs expulsés en 1492** : les estimations varient fortement ; le dossier ne fixe pas de chiffre.
4. **Nombre de Morisques expulsés (1609-1614)** : les estimations varient selon les régions.
5. **Nombre de victimes de la Grande Rafle de 1749** : les chiffres de 9 000 à 12 000 circulent ; à vérifier par une source spécialisée.
6. **Bilan de l’esclavage et de l’abolition à Cuba** : nécessite une source spécialisée supplémentaire.
7. **Qualification du franquisme** : fascisme, autoritarisme ou régime hybride ? Débat F3 non tranché.
8. **Bilan mémoriel de la transition** : les thèses de l’amnésie et du pacte de silence sont discutées.
9. **Articulation des mémoires catalane, basque et nationale** : nécessite un second lecteur et une expertise sensibilité.
10. **Sources absentes** : femmes avant 1931 et après 1975, sciences, arts, environnement médiéval, colonialisme africain.

---

*Fin du rapport. Dossier non signé ; verdict `pending` ; scores `null`.*
