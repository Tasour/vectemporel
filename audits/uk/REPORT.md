# Royaume-Uni — rapport d’audit v1.0

**Périmètre.** 43–2026. Le dossier traite les quatre nations (Angleterre, Écosse, pays de Galles, Irlande du Nord), l’empire, les colonies, les diasporas et les populations qui y sont liées. La nation est ici une hypothèse de travail : « Royaume-Uni » désigne des formations politiques successives (Grande-Bretagne en 1707, Royaume-Uni de Grande-Bretagne et d’Irlande en 1801, Royaume-Uni de Grande-Bretagne et d’Irlande du Nord à partir de 1927), pas une essence immémoriale.

**Méthode.** Audit de première version au 13 novembre 2026, fondé sur 20 sources vérifiées (18 savantes ou de référence, une institutionnelle, une primaire), une matrice de 84 cellules (6 ères × 14 domaines), 15 omissions documentées et 18 propositions d’événements. Aucune double lecture, aucun Delphi, aucun sign-off : `verdict: pending`.

---

## 1. Verdict de périodisation

La périodisation actuelle est **cohérente mais insuffisante**. Les six ères sont contiguës et couvrent 43–2026 sans trou, mais quatre problèmes structurants apparaissent.

**1.1. « Empire & industrie » (1688–1914) est une ère fourre-tout.** 226 ans en une seule case confondent l’union de 1707, la traite atlantique, la perte des Treize Colonies, les guerres napoléoniennes, l’industrialisation, la famine irlandaise, l’empire victorien et la naissance du suffrage. Le récit qui en sort est Londres-centré et téléologique : il fait de l’industrialisation le centre du monde britannique, alors que l’Écosse, le pays de Galles, l’Irlande et les colonies ont des chronologies propres [SRC-002, SRC-009]. La césure de **1815** (fin des guerres napoléoniennes) ou de **1832** (Reform Act) est plus opérante que 1688–1914. Le dossier propose de scinder en « Grande-Bretagne et premier empire (1688–1815) » et « Industrialisation et empire victorien (1815–1914) ».

**1.2. « Royaume-Uni contemporain » (1945–2026) est trop large.** 81 ans confondent l’État-providence, la décolonisation, la guerre froide, le tournant thatchérien, la dévolution, les sociétés multiculturelles et le Brexit. La césure de **1979** (élection de Margaret Thatcher) est la plus utilisée, mais **1973** (choc pétrolier, entrée dans la CEE) et **2008** (crise financière) sont des alternatives défendables [SRC-012]. Le dossier propose de scinder en « État-providence, décolonisation et guerre froide (1945–1979) » et « Néolibéralisme, nations et Brexit (1979–2026) ».

**1.3. Les libellés sont anglais et chargés.** « Antiquité & invasions » met au même plan la conquête romaine, les installations anglo-saxonnes et les raids vikings ; « Renaissance & Réforme » est peu adapté aux îles Britanniques ; « Guerres mondiales » masque la révolution irlandaise de 1916–1922 et la famine du Bengale de 1943 [SRC-002, SRC-016]. Il faut renommer, pas seulement déplacer les bornes.

**1.4. La césure de 1922 manque.** La partition de l’Irlande et la création de l’État libre d’Irlande ne sont pas nommées dans la frise. Or 1922 est une borne majeure pour l’Irlande, l’Ulster et le Royaume-Uni. Le dossier propose une **couche transversale « Irlande, 1801–1998 »** plutôt qu’une nouvelle ère, pour ne pas casser la continuité des guerres mondiales.

**Verdict.** La périodisation actuelle **n’est pas publiable en l’état**, non parce que les dates seraient fausses, mais parce que les libellés et les granularités produisent un récit anglais, impérial et londonien. La proposition à 8 ères (43–1066, 1066–1485, 1485–1688, 1688–1815, 1815–1914, 1914–1945, 1945–1979, 1979–2026) est préférable. Les alternatives 1832, 1922, 1973 et 2008 sont conservées dans `country-audit.yaml` et `proposals.yaml`.

---

## 2. Angles morts et biais de sélection

**2.1. Le déséquilibre politique est massif.** 16 des 20 repères de `data.js` portent le tag `politique` ou `guerre`, soit 80 %, alors que le seuil de vigilance de la méthode est de 50 %. Le problème n’est pas seulement le nombre : il est dans la **taxonomie**. Six tags pour quatorze domaines, et un tag `politique` qui absorbe des événements sociaux, coloniaux ou mémoriels. Tant que la taxonomie ne distingue pas `institutions`, `colonisation`, `travail`, `migrations`, `genre`, `environnement` et `mémoire`, le seuil restera artificiellement élevé. Une révision des tags est aussi importante qu’un ajout d’événements.

**2.2. Un seul repère est explicitement situé hors d’Angleterre.** `uk-good-friday` (Belfast) est le seul événement dont le lieu nommé n’est pas anglais. Aucun repère ne nomme Manchester, Liverpool, Glasgow, Cardiff, Dublin, Bristol ou Édimbourg. L’union de 1707 est le seul événement écossais ; le pays de Galles est absent ; l’Irlande n’apparaît qu’en 1998. C’est un biais de capitale et de nation dominante, pas une neutralité.

**2.3. Les femmes sont traitées de manière tokeniste.** Un seul repère est explicitement consacré aux femmes (`uk-vote`, 1918), et il est formulé comme un élargissement du suffrage, sans actrices, sans clivages de classe et sans le mouvement suffragiste radical [SRC-014]. Margaret Thatcher est la seule autre femme nommée, et elle est traitée comme une dirigeante individuelle, pas comme une actrice de genre. Le genre, les sexualités et le handicap sont absents.

**2.4. L’Irlande est réduite à 1998.** Il n’y a ni union de 1801, ni famine de 1845–1852, ni insurrection de 1916, ni guerre d’indépendance, ni partition de 1922, ni Troubles. L’accord du Vendredi saint arrive sans l’histoire qui le rend intelligible. C’est le plus grand angle mort du dossier [SRC-005].

**2.5. L’Écosse et le pays de Galles sont des annexes.** L’Écosse n’apparaît qu’en 1707 dans la frise ; le pays de Galles n’apparaît pas. Ni les clearances, ni l’agitation crofters, ni Tryweryn, ni la dévolution, ni les référendums de 2014 ne sont présents. Le récit reproduit la critique classique du « British history » anglais [SRC-002, SRC-004, SRC-006].

**2.6. L’empire est une décoration.** Deux repères seulement ont l’empire pour sujet principal (`uk-esclavage`, `uk-expo`), et aucun ne traite la violence coloniale, la famine, la partition ou la décolonisation. Amritsar (1919), le Bengale (1943), la partition de l’Inde (1947) et le Kenya sont absents. L’empire apparaît comme une puissance commerciale, pas comme un système de coercition et de gouvernement des populations [SRC-009, SRC-015, SRC-016].

**2.7. Les migrations, l’environnement et la mémoire sont absents.** Aucun repère sur l’émigration irlandaise, la migration caribéenne, les Juifs d’Europe de l’Est, les Sud-Asiatiques ou les Polonais. Aucun repère sur le smog de 1952, le Clean Air Act de 1956, les paysages industriels ou le climat. Aucun repère sur les statues, musées et guerres de mémoire, alors que le pays en est plein.

**2.8. Le résultat de couverture.** La matrice compte **26 cellules couvertes**, **33 partielles**, **25 vides justifiées**, **0 non traitée**. Autrement dit : 84/84 cellules sont documentées, mais seulement 26 (31 %) sont adossées à une proposition sourcée avec acteurs ou lieux identifiés ; aucune fiche n’est encore publiée. La cible de 90 % couvertes n’est pas atteinte. C’est un résultat honnête : le dossier ne prétend pas combler les lacunes, il les rend visibles.

---

## 3. Propositions d’événements (18)

Les propositions sont détaillées dans `proposals.yaml`. Les plus structurantes :

1. **1801 — Union avec l’Irlande.** Les Actes d’Union de 1800 entrent en vigueur le 1er janvier 1801 ; l’Irlande perd son parlement, 100 députés siègent à Westminster. L’union est contestée et ne règle pas la question catholique [SRC-005, SRC-002]. Comble un trou majeur entre 1707 et 1833.
2. **1833–1838 — Abolition de l’esclavage.** Après des décennies de campagnes abolitionnistes, l’acte de 1833 entre en vigueur le 1er août 1834 ; les personnes asservies passent par l’apprentissage avant 1838. Les propriétaires reçoivent £20 millions, les personnes asservies ne reçoivent aucune indemnisation [SRC-008, SRC-020]. Transforme un acte isolé en processus, avec la compensation et les limites de l’émancipation.
3. **1819 — Peterloo.** Le 16 août 1819, à St Peter's Fields (Manchester), la yeomanry charge une foule de 60 000 personnes ; au moins 18 morts et plusieurs centaines de blessés [SRC-007, SRC-001]. Ancre l’histoire ouvrière et régionale.
4. **1838–1848 — Chartisme.** La Charte du peuple (1838) réclame six réformes, dont le suffrage universel masculin ; les pétitions de 1839, 1842 et 1848 sont rejetées [SRC-007, SRC-001]. Montre un mouvement de masse, pas une simple agitation.
5. **1845–1852 — Grande famine irlandaise.** Environ un million de morts et plus d’un million d’émigrés ; la responsabilité britannique, les marchés et l’aide publique sont au cœur du débat [SRC-011, SRC-005]. Événement impérial et migratoire majeur.
6. **1882–1886 — Agitation crofters.** Les crofters des Highlands se mobilisent ; la commission Napier (1883) et le Crofters Holdings (Scotland) Act (1886) accordent sécurité d’occupation et loyers équitables [SRC-004, SRC-002]. Écosse rurale, classes populaires, question de la terre.
7. **1919 — Amritsar.** Le 13 avril 1919, le général Dyer fait tirer sur la foule de Jallianwala Bagh ; bilan officiel de 379 morts, estimations supérieures [SRC-015, SRC-009]. Violence coloniale et mémoire.
8. **1943 — Famine du Bengale.** Environ 2 à 3 millions de morts dans le contexte de la guerre, des réquisitions et de la politique coloniale [SRC-016, SRC-009]. Environnement, empire, populations colonisées.
9. **1947 — Partition de l’Inde.** 10 à 15 millions de déplacés, peut-être un million de morts ; fin précipitée du Raj [SRC-010, SRC-005]. Décolonisation, migrations, minorités.
10. **1948 — Windrush.** Le HMT Empire Windrush arrive à Tilbury le 22 juin 1948 avec environ 1 000 passagers, dont plus de 800 Caribéens ; le British Nationality Act 1948 réorganise la nationalité impériale [SRC-012, SRC-001]. Symbole de la migration caribéenne et de la société multiculturelle.
11. **1965 — Tryweryn.** Le village gallois de Capel Celyn est inondé pour alimenter Liverpool ; l’événement stimule le nationalisme gallois [SRC-006, SRC-002]. Environnement, mémoire, pays de Galles.
12. **1976–1978 — Grunwick.** Des ouvrières majoritairement sud-asiatiques se mettent en grève à Willesden ; la défaite n’empêche pas un tournant pour les travailleuses migrantes [SRC-017, SRC-012]. Classe, race et genre.
13. **1984–1985 — Grève des mineurs.** La grève nationale contre les fermetures de puits dure un an ; Women Against Pit Closures organise le soutien et politise les femmes des communautés minières [SRC-018, SRC-012]. Désindustrialisation, classes populaires, femmes.
14. **1993–1999 — Stephen Lawrence.** Le meurtre de 1993 et le rapport Macpherson (1999) imposent la notion de racisme institutionnel [SRC-019, SRC-012]. Justice, minorités, mémoire.
15. **1997–1999 — Dévolution.** Les référendums du 11 septembre 1997 (Écosse) et du 18 septembre 1997 (pays de Galles) ouvrent la voie au Parlement écossais et à l’Assemblée galloise [SRC-004, SRC-006, SRC-001]. Institutions, quatre nations.
16. **1916–1922 — Révolution irlandaise.** Insurrection de Pâques, guerre d’indépendance, traité de 1921, État libre d’Irlande en 1922, partition [SRC-005, SRC-001]. Comble le trou irlandais et complète 1998.
17. **2016–2020 — Brexit (correction de `uk-brexit`).** Référendum du 23 juin 2016 : 51,9 % Leave, 72,2 % de participation ; retrait le 31 janvier 2020, fin de la transition le 31 décembre 2020 [SRC-013, SRC-001]. Transforme un événement ponctuel en processus.
18. **1948–1951 — National Health Service (correction de `uk-nhs`).** Ouverture le 5 juillet 1948, financement principalement fiscal, charges introduites à partir de 1951 ; acteurs : Aneurin Bevan, professions médicales, hôpitaux volontaires, personnels du Commonwealth [SRC-012, SRC-001]. Transforme un acte de naissance en processus et corrige la vision d’un service intemporellement gratuit.

**Équilibre.** 18 propositions : 10 relèvent de l’histoire sociale, économique, environnementale ou mémorielle ; au moins 8 concernent des femmes ou des groupes minorisés ; au moins 12 sont situées hors de Londres ou hors d’Angleterre ; 3 portent sur l’environnement ou la mémoire. Le compte dépend de la taxonomie : plusieurs événements sont à la fois politiques et sociaux.

---

## 4. Corrections des événements existants

Les 15 corrections sont dans `proposals.yaml`. Les plus urgentes :

1. **`uk-410` — la fin de la Bretagne romaine n’est pas un événement ponctuel.** 410 est la date d’une rescription impériale, pas le jour où « les légions quittent l’île » ; l’installation anglo-saxonne s’étale sur les Ve–VIe siècles [SRC-001, SRC-002]. Remplacer par un TimeSpan 410~ et une formulation processuelle.
2. **`uk-magna` — « charte de droits » est anachronique.** Le texte de 1215 est un règlement féodal entre Jean sans Terre et les barons, annulé par Innocent III, puis réédité en 1216, 1217 et 1225. La mémoire constitutionnelle est postérieure au texte [SRC-001, SRC-002].
3. **`uk-peste` — « un tiers » est une estimation basse présentée comme certitude.** Les estimations de mortalité vont de 30 à 60 % ; l’origine portuaire exacte est incertaine [SRC-001, SRC-002]. Écrire « mortalité massive, estimations de 30 à 60 % ».
4. **`uk-civil` — « guerre civile » au singulier masque les guerres des Trois Royaumes.** Le conflit englobe l’Écosse, l’Irlande et l’Angleterre (1639–1653), avec la conquête cromwellienne de l’Irlande et l’exécution de Charles Ier en 1649 [SRC-002, SRC-005].
5. **`uk-glorieuse` — « Déclaration des droits » est une traduction inexacte.** Le Bill of Rights est une loi de 1689 ; la révolution est aussi une invasion hollandaise et un compromis politique, pas l’installation spontanée du parlementarisme [SRC-001, SRC-003].
6. **`uk-union` — 1707 n’est pas le Royaume-Uni.** Les Actes d’Union créent le Royaume de Grande-Bretagne ; l’Irlande reste un royaume séparé jusqu’en 1801. L’union est contestée, avec des émeutes et une opposition populaire ; le Parlement écossais vote sa propre disparition [SRC-003, SRC-004].
7. **`uk-industrie` — le récit technologique anglais est trop étroit.** La période 1760–1840 sous-estime les continuités, le charbon, le travail des femmes et des enfants, l’esclavage et les marchés impériaux ; la géographie est régionale (Lancashire, West Riding, Clyde, Midlands) [SRC-007, SRC-009].
8. **`uk-esclavage` — « Abolition » est trop large.** L’acte de 1833 reçoit l’assentiment royal le 28 août 1833, entre en vigueur le 1er août 1834, vise les colonies britanniques avec des exceptions et impose un apprentissage jusqu’en 1838. Les propriétaires reçoivent £20 millions ; les personnes asservies ne reçoivent rien [SRC-020, SRC-008].
9. **`uk-vote` — 1918 n’est pas l’égalité.** Le vote est accordé aux femmes de plus de 30 ans remplissant une condition de propriété, et aux hommes de plus de 21 ans ; l’égalité est atteinte en 1928. Les suffragistes radicales du Lancashire et la National Union of Women's Suffrage Societies (NUWSS) sont absentes du récit [SRC-014, SRC-001].
10. **`uk-ww2` — « résiste seul » est faux au sens strict.** Le Royaume-Uni et son empire, avec les dominions et les Alliés, résistent ; le Blitz dure de septembre 1940 à mai 1941, suivi des V1/V2 en 1944–1945. Le terme « résistance » est inapproprié pour un pays non occupé (sauf les îles Anglo-Normandes) [SRC-012, SRC-001].
11. **`uk-nhs` — « accessible à tous » simplifie.** Le NHS est gratuit au point d’usage et financé principalement par l’impôt, mais des charges sont introduites dès 1951 ; le personnel vient aussi du Commonwealth [SRC-012, SRC-001].
12. **`uk-thatcher` — « tournant néolibéral » est une étiquette.** Elle est utile, mais il faut préciser le 4 mai 1979, les privatisations des années 1980, le monétarisme, la grève des mineurs, la poll tax, la Section 28 et la démission de novembre 1990 [SRC-012, SRC-001].
13. **`uk-good-friday` — « met fin » est téléologique.** L’accord du 10 avril 1998 ouvre un processus ; il est approuvé par référendums le 22 mai 1998, mais l’attentat d’Omagh (15 août 1998) et les suspensions de l’Assemblée (2002–2007) montrent que la paix n’est pas linéaire [SRC-001].
14. **`uk-brexit` — le référendum n’est pas le Brexit.** Le Brexit est un processus 2016–2020 : référendum, article 50, élection de 2019, retrait du 31 janvier 2020, fin de la transition du 31 décembre 2020. L’Écosse et l’Irlande du Nord votent Remain ; la question irlandaise reste centrale [SRC-013, SRC-001].
15. **`uk-rome` — l’invasion de 43 est présentée comme une conquête achevée.** Elle ouvre un processus de plusieurs décennies ; l’Écosse n’est pas conquise et Hadrian's Wall fixe une frontière. Ajouter Aulus Plautius, Claude et la dimension provinciale [SRC-001, SRC-002].

---

## 5. Acteurs et lieux à ajouter

**Acteurs (12).** Cinq femmes (Emmeline Pankhurst, Jayaben Desai, Margaret Thatcher, Doreen Lawrence, Selina Cooper), quatre acteurs collectifs ou institutionnels (Chartistes, Women Against Pit Closures, TUC, génération Windrush), deux acteurs transnationaux (East India Company, Indian National Congress) et un réformateur (William Beveridge). Les fiches détaillées sont dans `country-audit.yaml` et `proposals.yaml`.

- **Emmeline Pankhurst** : figure de la Women's Social and Political Union (WSPU), à replacer dans un mouvement plus large, avec les ouvrières du Lancashire et la National Union of Women's Suffrage Societies (NUWSS) [SRC-014].
- **Jayaben Desai** : porte-parole de Grunwick, intersection classe/race/genre [SRC-017].
- **Margaret Thatcher** : première ministre 1979–1990, à documenter par ses ressources, ses contraintes et ses contre-pouvoirs, pas comme une vignette [SRC-012].
- **Doreen Lawrence** : campagne pour Stephen Lawrence, rapport Macpherson, racisme institutionnel [SRC-019].
- **Selina Cooper** : suffragiste radicale et ouvrière du textile, contre le récit londonien [SRC-014].
- **Chartistes** : mouvement de masse, pétitions, presse, répression [SRC-007].
- **Women Against Pit Closures** : organisation de femmes, survie matérielle et politisation de la grève [SRC-018].
- **Trades Union Congress (TUC)** : acteur du compromis social, mais frein à la solidarité avec les travailleuses migrantes à Grunwick [SRC-017].
- **East India Company** : compagnie chartée, armée, fiscalité, empire en Inde [SRC-009].
- **Indian National Congress** : mouvement anticolonial, acteur étranger/transnational [SRC-010].
- **Génération Windrush** : migration caribéenne, travail, citoyenneté contestée [SRC-012].
- **William Beveridge** : cadre intellectuel de l’État-providence [SRC-012].

**Lieux (12).** Onze hors de Londres : Manchester, Liverpool, Glasgow, Belfast, Cardiff, Bristol, Édimbourg, Dublin, Kolkata, Amritsar, Capel Celyn/Tryweryn ; Londres reste présent comme capitale impériale. Les lieux sont datés : Manchester industrielle du XIXe siècle, Liverpool port atlantique des XVIIIe–XIXe siècles, Glasgow des chantiers navals, Belfast du lin et de la partition, Cardiff du charbon, Bristol du commerce colonial, Édimbourg de l’union et des Lumières, Dublin de 1801 et 1916, Kolkata de la famine de 1943, Amritsar de 1919, Capel Celyn avant 1965.

**Pourquoi ces lieux.** Ils corrigent le biais de capitale et permettent de traiter des histoires régionales sans les réduire à des « provinces ». Ils sont aussi des lieux de mémoire : Peterloo à Manchester, Colston à Bristol, Tryweryn au pays de Galles, Jallianwala Bagh à Amritsar.

---

## 6. Risques de biais et points disputés

**6.1. La périodisation est une interprétation.** 1815, 1832, 1922, 1973, 1979 et 2008 sont des césures défendables ; aucune n’est « naturelle ». Le dossier doit conserver les alternatives et expliquer les choix. Un Delphi sur la césure contemporaine est recommandé.

**6.2. L’empire n’est ni une célébration ni un pur récit de victimes.** Il faut distinguer les niveaux d’agence : colons, administrateurs, militaires, marchands, élites locales, populations colonisées, résistants. Les violences (Amritsar, Kenya, famines) doivent être nommées, mais sans homogénéiser les sociétés colonisées ni effacer les collaborations et les clivages internes [SRC-009, SRC-015, SRC-016].

**6.3. Les chiffres sont disputés.** Famine irlandaise : environ un million de morts, mais les estimations varient [SRC-011]. Bengale 1943 : 2–3 millions [SRC-016]. Amritsar : 379 morts officiels, estimations supérieures [SRC-015]. Partition : 10–15 millions de déplacés, 0,5–2 millions de morts [SRC-010]. Il faut afficher des fourchettes et la source, pas un chiffre unique.

**6.4. L’Irlande du Nord est un sujet sensible.** « Met fin au conflit » est téléologique ; l’accord de 1998 n’a pas supprimé toute violence (Omagh), et les institutions ont été suspendues. La partition de 1922, les discriminations, les grèves de la faim et les commémorations doivent être traités avec précision [SRC-005, SRC-001].

**6.5. L’Écosse et le pays de Galles ne sont pas des variantes de l’Angleterre.** La dévolution n’est pas l’indépendance ; le référendum de 2014 et le Brexit ont recomposé les clivages. Le pays de Galles n’est pas réductible au Labour ou au nationalisme ; la langue, les vallées industrielles et les migrations ont leurs histoires [SRC-004, SRC-006].

**6.6. Thatcher est un objet polarisé.** « Néolibéralisme » est une étiquette utile mais réductrice ; il faut distinguer le programme, les résultats, les résistances et les effets régionaux. La grève des mineurs, la poll tax (capitation) et la Section 28 sont des points de conflictualité, pas des illustrations [SRC-012].

**6.7. Le Brexit n’est pas un événement unique.** Le référendum de 2016 est un moment d’un processus plus long : euroscepticisme, crise de 2008, austérité, campagne, article 50, négociations, accord de commerce, protocole nord-irlandais. Le résultat est étroit (51,9 %) et divise l’Écosse et l’Irlande du Nord [SRC-013].

**6.8. Risque de tokenisme.** Ajouter une femme ou une personne racisée sans structure d’analyse ne corrige pas le biais. Les propositions sur Grunwick, les mineurs, Windrush et Stephen Lawrence sont des événements collectifs, pas des vignettes. Il faut encore documenter les femmes ordinaires, le travail domestique, le handicap et les sexualités.

**6.9. Risque de présentisme.** La frise ne doit pas préparer le Brexit ou la dévolution comme un aboutissement. Les alternatives non advenues (indépendance écossaise en 2014, Home Rule irlandais, fédéralisme impérial) doivent être conservées.

---

## 7. Dettes documentaires et niveau de confiance

**7.1. Couverture.** 84 cellules : 26 couvertes, 33 partielles, 25 vides justifiées, 0 non traitée. Les ères 1–3 sont les plus faibles (0 cellule couverte au sens strict) ; l’ère 6 est la mieux couverte (11 cellules). Les domaines les plus faibles sont les femmes, les arts et les sciences ; les migrations et l’environnement sont mieux couverts mais restent partiels.

**7.2. Sources.** 20 sources vérifiées, dont 18 savantes ou de référence, une institutionnelle (Macpherson) et une primaire (Acte de 1833). Les dates, les actes et les résultats électoraux sont bien étayés. Les points faibles sont les sources locales, les sources orales, les statistiques de population et les sources institutionnelles pour le NHS, la dévolution et Tryweryn.

**7.3. Exceptions à la règle des deux sources.** Tryweryn repose principalement sur Davies [SRC-006], avec Kearney [SRC-002] pour le contexte ; une source institutionnelle (National Library of Wales) est nécessaire. L’accord du Vendredi saint repose sur Morgan [SRC-001], car Foster s’arrête en 1972 [SRC-005] ; une source institutionnelle (accord de 1998, référendums) est nécessaire. Le NHS et Windrush reposent sur Edgerton et Morgan, qui sont des synthèses générales ; des sources spécialisées (Webster, ONS, Williams) manquent.

**7.4. Niveau de confiance.** Élevé pour les dates des actes, les résultats du référendum de 2016, le suffrage de 1918/1928, l’abolition de 1833 et la chronologie des guerres. Moyen pour les chiffres de famine, d’Amritsar et de partition, pour la chronologie de Tryweryn et pour le statut juridique du référendum de 2016. Disputé pour la périodisation, le bilan de Thatcher, la nature de l’empire et les causes du Brexit.

**7.5. Ce que le dossier permet de faire.** Un éditeur peut corriger les 20 fiches existantes, ajouter ou corriger 18 entrées, ajouter 12 acteurs et 12 lieux, et remplacer la périodisation à 6 ères par une périodisation à 8 ères. Il peut aussi voir, cellule par cellule, ce qui manque et pourquoi.

---

## Points non résolus

1. **Statut juridique du référendum de 2016** et chronologie exacte de l’article 50 : à vérifier avec l’Electoral Commission et la House of Commons Library.
2. **Chiffres des famines et des massacres** (Irlande, Bengale, Amritsar, partition) : fourchettes à valider par une seconde lecture et des sources démographiques.
3. **Date exacte de l’ouverture du réservoir de Tryweryn** : 21 ou 28 octobre 1965 selon les sources ; à trancher avec le National Library of Wales.
4. **Statut des passagers du Windrush avant le British Nationality Act 1948** : le droit d’entrée reposait sur le statut de sujet britannique ; à documenter avec une source juridique.
5. **Chronologie des charges du NHS** : 1951 ou 1952 selon les prestations ; à préciser avec Webster ou les archives du ministère de la Santé.
6. **Deuxième source pour l’accord du Vendredi saint** : Foster s’arrête en 1972 ; utiliser l’accord de 1998, les référendums et les archives nord-irlandaises.
7. **Césure contemporaine** : 1979, 1973 ou 2008 ; à trancher par Delphi ou décision éditoriale documentée.
8. **Taxonomie des tags** : six tags pour quatorze domaines ; `politique` absorbe des événements sociaux et fausse le seuil de 50 %. Une révision est nécessaire avant d’évaluer l’équilibre.
9. **Sources locales** : Manchester, Liverpool, Glasgow, Belfast, Cardiff, Bristol, Édimbourg et Dublin manquent de monographies locales dans le registre.
10. **Sources spécialisées manquantes** : Webster pour le NHS, Brown pour la sécularisation, ONS pour les statistiques ethniques, National Library of Wales pour Tryweryn, archives WAPC pour les mineurs.
11. **Label « Renaissance » et borne 1485** : à discuter avec les historiens des quatre nations ; 1485 est une borne anglaise.
12. **Scission de « Empire & industrie »** : 1815 ou 1832 ; les deux sont documentés, mais le choix doit être explicité.
13. **Place de l’Irlande du Nord dans la période 1914–1945** : la partition de 1922 est présente dans les propositions, mais pas encore dans la matrice actuelle.
14. **Mémoire impériale** : statues, musées, restitutions et commémorations ne sont pas encore des fiches ; l’audit les signale sans les traiter.
15. **Signature et double lecture** : aucune. Le dossier reste `pending`.
