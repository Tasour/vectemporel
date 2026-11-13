/* Vectemporel — jeu de données (POC 0.2).
   Généré par scripts/apply-country-fixes.mjs à partir de data.js et des
   dossiers audits/<pays>/fixes.yaml. Ne pas éditer à la main : relancer
   le script après modification des patches. */

window.VECTEMPOREL_DATA = {
  "meta": {
    "name": "Vectemporel",
    "tagline": "L'Histoire, à portée de zoom",
    "version": "POC · 0.2",
    "generated": "2026-11",
    "integratedAt": "2026-11-13"
  },
  "tags": {
    "politique": {
      "label": "Politique",
      "color": "#e0b263",
      "hashtag": "#politique"
    },
    "guerre": {
      "label": "Guerres",
      "color": "#dd7165",
      "hashtag": "#guerres"
    },
    "sciences": {
      "label": "Sciences",
      "color": "#67bdce",
      "hashtag": "#sciences"
    },
    "arts": {
      "label": "Arts & lettres",
      "color": "#b28bdd",
      "hashtag": "#arts"
    },
    "religion": {
      "label": "Religions",
      "color": "#8b9ad9",
      "hashtag": "#religions"
    },
    "societe": {
      "label": "Société",
      "color": "#83bf8b",
      "hashtag": "#société"
    },
    "economie": {
      "label": "Économie",
      "color": "#d3bd69",
      "hashtag": "#économie"
    },
    "exploration": {
      "label": "Monde",
      "color": "#63b09e",
      "hashtag": "#monde"
    }
  },
  "countries": [
    {
      "id": "france",
      "name": "France",
      "articleName": "l'Histoire de France",
      "flag": "🇫🇷",
      "color": "#7f9cff",
      "domain": [
        -600,
        2026
      ],
      "tagline": "De la Gaule à la République",
      "featuredIds": [
        "fr-alesia",
        "fr-clovis",
        "fr-charlemagne",
        "fr-louis14",
        "fr-revolution",
        "fr-ww1",
        "fr-ww2",
        "fr-mai68"
      ],
      "intro": "De la fondation de Marseille à la Ve République, 2 600 ans d’une histoire qui a façonné l’Europe.",
      "eras": [
        {
          "name": "Antiquité",
          "start": -600,
          "end": 476,
          "color": "#6f7fd0"
        },
        {
          "name": "Moyen Âge",
          "start": 476,
          "end": 1492,
          "color": "#8a6fb2"
        },
        {
          "name": "Renaissance",
          "start": 1492,
          "end": 1610,
          "color": "#c2855c"
        },
        {
          "name": "Grand Siècle & Lumières",
          "start": 1610,
          "end": 1789,
          "color": "#c7a257"
        },
        {
          "name": "Révolution & Empire",
          "start": 1789,
          "end": 1815,
          "color": "#ce6a58"
        },
        {
          "name": "XIXe siècle",
          "start": 1815,
          "end": 1914,
          "color": "#7f9a72"
        },
        {
          "name": "Guerres mondiales",
          "start": 1914,
          "end": 1945,
          "color": "#b35e5e"
        },
        {
          "name": "Après-guerre, croissance et crises",
          "start": 1945,
          "end": 1989,
          "color": "#5d9c97"
        },
        {
          "name": "Temps présents",
          "start": 1989,
          "end": 2026,
          "color": "#6c8db3"
        }
      ],
      "events": [
        {
          "id": "fr-massalia",
          "year": -600,
          "title": "Massalia",
          "subtitle": "Naissance de Marseille",
          "tags": [
            "exploration"
          ],
          "importance": 1,
          "grok": "Marseille",
          "summary": "Des marins grecs de Phocée fondent Massalia sur la côte méditerranéenne. Le port devient une porte d’entrée du monde grec en Gaule.",
          "related": [
            "fr-lugdunum"
          ]
        },
        {
          "id": "fr-alesia",
          "year": -52,
          "title": "Alésia",
          "subtitle": "Vercingétorix capitule",
          "tags": [
            "guerre"
          ],
          "importance": 3,
          "grok": "Battle_of_Alesia",
          "summary": "Après la révolte des Gaules, Vercingétorix est encerclé à Alésia par Jules César. Sa reddition scelle la conquête romaine de la Gaule.",
          "related": [
            "fr-massalia",
            "fr-lugdunum"
          ]
        },
        {
          "id": "fr-lugdunum",
          "year": -43,
          "title": "Lugdunum",
          "subtitle": "Naissance de Lyon",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 1,
          "grok": "Lugdunum",
          "summary": "Le général Munatius Plancus fonde une colonie romaine sur la colline de Fourvière. Lugdunum devient la capitale des Gaules.",
          "related": [
            "fr-alesia"
          ]
        },
        {
          "id": "fr-clovis",
          "year": 496,
          "title": "Baptême de Clovis",
          "subtitle": "Le roi des Francs choisit Rome",
          "tags": [
            "religion",
            "politique"
          ],
          "importance": 3,
          "grok": "Clovis_I",
          "summary": "Clovis, roi des Francs saliens, se fait baptiser à Reims, probablement vers 496. Ce geste rapproche le pouvoir franc de l’Église et de l’héritage romain.",
          "related": [
            "fr-charlemagne"
          ]
        },
        {
          "id": "fr-poitiers",
          "year": 732,
          "title": "Poitiers",
          "subtitle": "Charles Martel arrête les Omeyyades",
          "tags": [
            "guerre",
            "religion"
          ],
          "importance": 2,
          "grok": "Battle_of_Tours",
          "summary": "Charles Martel remporte une victoire sur une armée omeyyade venue d’Al-Andalus. L’événement devient un symbole de la défense du royaume franc.",
          "related": [
            "fr-charlemagne"
          ]
        },
        {
          "id": "fr-charlemagne",
          "year": 800,
          "title": "Charlemagne",
          "subtitle": "Un empereur à Rome",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 3,
          "grok": "Charlemagne",
          "summary": "Le pape Léon III couronne Charlemagne empereur des Romains à Saint-Pierre. Le roi des Francs devient le maître d’un empire européen.",
          "related": [
            "fr-clovis",
            "fr-verdun"
          ]
        },
        {
          "id": "fr-verdun",
          "year": 843,
          "title": "Verdun",
          "subtitle": "Partage de l’empire carolingien",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Treaty_of_Verdun",
          "summary": "Les petits-fils de Charlemagne se partagent l’empire à Verdun. La Francie occidentale pose l’une des bases du royaume de France.",
          "related": [
            "fr-charlemagne",
            "fr-capet"
          ]
        },
        {
          "id": "fr-capet",
          "year": 987,
          "title": "Hugues Capet",
          "subtitle": "Les Capétiens au pouvoir",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Hugh_Capet",
          "summary": "Hugues Capet est élu roi des Francs après la mort de Louis V. Sa dynastie règne, directement ou par ses branches, pendant près de huit siècles.",
          "related": [
            "fr-verdun"
          ]
        },
        {
          "id": "fr-croisade",
          "year": 1095,
          "title": "Clermont",
          "subtitle": "L’appel à la première croisade",
          "tags": [
            "religion",
            "guerre"
          ],
          "importance": 2,
          "grok": "Pope_Urban_II",
          "summary": "Au concile de Clermont, le pape Urbain II appelle les chrétiens d’Occident à partir en Terre sainte. La prédication mobilise des seigneurs venus de toute la France.",
          "related": [
            "fr-gothique"
          ]
        },
        {
          "id": "fr-gothique",
          "year": 1144,
          "title": "Saint-Denis",
          "subtitle": "Naissance de l’art gothique",
          "tags": [
            "arts",
            "religion"
          ],
          "importance": 2,
          "grok": "Gothic_architecture",
          "summary": "L’abbé Suger consacre le chœur de la basilique de Saint-Denis. La lumière et les voûtes brisées inaugurent un style qui gagne toute l’Europe.",
          "related": [
            "fr-croisade"
          ]
        },
        {
          "id": "fr-albigeois",
          "year": 1209,
          "title": "Albigeois",
          "subtitle": "Croisade contre les cathares",
          "tags": [
            "religion",
            "guerre"
          ],
          "importance": 1,
          "grok": "Albigensian_Crusade",
          "summary": "Le pape Innocent III lance une croisade contre les cathares du Languedoc. Elle se prolonge pendant vingt ans et renforce le pouvoir royal dans le Midi.",
          "related": [
            "fr-etats-generaux"
          ]
        },
        {
          "id": "fr-etats-generaux",
          "year": 1302,
          "title": "États généraux",
          "subtitle": "Philippe le Bel convoque les trois ordres",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Estates_General_(France)",
          "summary": "Le roi Philippe IV le Bel réunit pour la première fois les représentants du clergé, de la noblesse et des villes. L’assemblée soutient le roi face au pape.",
          "related": [
            "fr-albigeois",
            "fr-cent-ans"
          ]
        },
        {
          "id": "fr-cent-ans",
          "year": 1337,
          "endYear": 1453,
          "title": "Guerre de Cent Ans",
          "subtitle": "La France et l’Angleterre s’affrontent",
          "tags": [
            "guerre"
          ],
          "importance": 3,
          "grok": "Hundred_Years'_War",
          "summary": "La querelle successorale autour du trône de France dégénère en un conflit de plus d’un siècle. La guerre transforme les armées, les impôts et le sentiment national.",
          "related": [
            "fr-peste",
            "fr-jeanne"
          ]
        },
        {
          "id": "fr-peste",
          "year": 1348,
          "title": "Peste noire",
          "subtitle": "La Grande Peste ravage le royaume",
          "tags": [
            "societe"
          ],
          "importance": 2,
          "grok": "Black_Death",
          "summary": "La peste noire atteint la France par le port de Marseille. En quelques années, elle emporte une part considérable de la population européenne.",
          "related": [
            "fr-cent-ans"
          ]
        },
        {
          "id": "fr-jeanne",
          "year": 1429,
          "title": "Jeanne d’Arc",
          "subtitle": "Orléans et le sacre de Charles VII",
          "tags": [
            "guerre",
            "religion"
          ],
          "importance": 3,
          "grok": "Joan_of_Arc",
          "summary": "Jeanne d’Arc délivre Orléans et conduit Charles VII à Reims pour son sacre. Figure de la résistance, elle est brûlée à Rouen en 1431.",
          "related": [
            "fr-cent-ans"
          ]
        },
        {
          "id": "fr-marignan",
          "year": 1515,
          "title": "Marignan",
          "subtitle": "François Ier vainc les Suisses",
          "tags": [
            "guerre"
          ],
          "importance": 2,
          "grok": "Battle_of_Marignano",
          "summary": "François Ier remporte une victoire difficile contre les Confédérés suisses en Lombardie. Elle consolide la puissance française en Italie du Nord.",
          "related": [
            "fr-villers"
          ]
        },
        {
          "id": "fr-villers",
          "year": 1539,
          "title": "Villers-Cotterêts",
          "subtitle": "Le français devient langue officielle",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Ordinance_of_Villers-Cotterêts",
          "summary": "François Ier impose le français dans les actes administratifs et juridiques du royaume. L’ordonnance accélère l’unification linguistique du pays.",
          "related": [
            "fr-marignan"
          ]
        },
        {
          "id": "fr-stbarth",
          "year": 1572,
          "title": "Saint-Barthélemy",
          "subtitle": "Massacre des protestants à Paris",
          "tags": [
            "religion",
            "guerre"
          ],
          "importance": 3,
          "grok": "St._Bartholomew's_Day_massacre",
          "summary": "Après l’assassinat de dirigeants huguenots, des massacres se déroulent à Paris puis en province. L’événement radicalise les guerres de Religion.",
          "related": [
            "fr-nantes"
          ]
        },
        {
          "id": "fr-nantes",
          "year": 1598,
          "title": "Édit de Nantes",
          "subtitle": "Henri IV tolère les protestants",
          "tags": [
            "religion",
            "politique"
          ],
          "importance": 2,
          "grok": "Edict_of_Nantes",
          "summary": "Henri IV accorde aux protestants une liberté de culte encadrée et des places de sûreté. L’édit met fin, pour un temps, aux guerres de Religion.",
          "related": [
            "fr-stbarth",
            "fr-revocation"
          ]
        },
        {
          "id": "fr-academie",
          "year": 1635,
          "title": "Académie française",
          "subtitle": "La langue sous contrôle",
          "tags": [
            "arts",
            "politique"
          ],
          "importance": 2,
          "grok": "Académie_Française",
          "summary": "Richelieu fonde l’Académie française pour codifier la langue et les lettres. Elle devient un instrument du rayonnement culturel du royaume.",
          "related": [
            "fr-louis14"
          ]
        },
        {
          "id": "fr-louis14",
          "year": 1643,
          "endYear": 1715,
          "title": "Louis XIV",
          "subtitle": "Le Roi-Soleil et l’absolutisme",
          "tags": [
            "politique",
            "arts"
          ],
          "importance": 3,
          "grok": "Louis_XIV",
          "summary": "Louis XIV règne pendant 72 ans et fait de Versailles le théâtre du pouvoir absolu. Guerres, mécénat et centralisation marquent durablement la monarchie.",
          "related": [
            "fr-academie",
            "fr-academie-sciences",
            "fr-revocation"
          ]
        },
        {
          "id": "fr-academie-sciences",
          "year": 1666,
          "title": "Académie des sciences",
          "subtitle": "La science devient institution",
          "tags": [
            "sciences"
          ],
          "importance": 2,
          "grok": "French_Academy_of_Sciences",
          "summary": "Colbert fonde l’Académie royale des sciences à Paris. Elle organise la recherche et relie savants, État et grands projets techniques.",
          "related": [
            "fr-louis14",
            "fr-encyclopedie"
          ]
        },
        {
          "id": "fr-prop-001",
          "year": 1685,
          "title": "Code noir",
          "subtitle": "L’esclavage codifié dans les colonies",
          "tags": [
            "politique",
            "religion",
            "societe"
          ],
          "importance": 3,
          "summary": "L’édit de mars 1685, dit Code noir, fixe le statut des esclaves dans les colonies françaises : police des plantations, châtiments, obligations religieuses et restrictions de déplacement. Dans la continuité de la politique coloniale de Colbert, il est promulgué par Louis XIV et s’applique notamment aux Antilles, où il structure l’économie sucrière et inscrit l’esclavage dans le droit royal.",
          "related": [
            "fr-revocation",
            "fr-1848"
          ],
          "sources": [
            "SRC-002"
          ]
        },
        {
          "id": "fr-revocation",
          "year": 1685,
          "title": "Révocation",
          "subtitle": "Les protestants fuient le royaume",
          "tags": [
            "religion",
            "politique"
          ],
          "importance": 2,
          "grok": "Edict_of_Fontainebleau",
          "summary": "Louis XIV révoque l’édit de Nantes et interdit le culte protestant. Des dizaines de milliers de huguenots quittent la France, emportant savoir-faire et capitaux.",
          "related": [
            "fr-nantes",
            "fr-louis14"
          ]
        },
        {
          "id": "fr-encyclopedie",
          "year": 1751,
          "title": "Encyclopédie",
          "subtitle": "Le savoir des Lumières circule",
          "tags": [
            "arts",
            "societe"
          ],
          "importance": 3,
          "grok": "Encyclopédie",
          "summary": "Diderot et d’Alembert publient le premier volume de l’Encyclopédie. L’entreprise rassemble les savoirs et diffuse les idées des Lumières à travers l’Europe.",
          "related": [
            "fr-revolution"
          ]
        },
        {
          "id": "fr-revolution",
          "year": 1789,
          "title": "Révolution",
          "subtitle": "La Bastille et la fin de l’Ancien Régime",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "French_Revolution",
          "summary": "La crise financière et politique provoque la réunion des États généraux, puis la prise de la Bastille le 14 juillet 1789. La Déclaration des droits de l’homme proclame l’égalité et la souveraineté nationale, mais la citoyenneté exclut les femmes et l’esclavage subsiste dans les colonies. L’abolition de 1794 est suivie du rétablissement de l’esclavage par Bonaparte en 1802.",
          "related": [
            "fr-terreur",
            "fr-brumaire"
          ],
          "sources": [
            "SRC-003",
            "SRC-002"
          ]
        },
        {
          "id": "fr-prop-002",
          "year": 1791,
          "title": "Olympe de Gouges",
          "subtitle": "La Déclaration des droits de la femme",
          "tags": [
            "societe",
            "politique",
            "arts"
          ],
          "importance": 2,
          "summary": "En septembre 1791, Olympe de Gouges publie la Déclaration des droits de la femme et de la citoyenne, qui reprend et retourne la Déclaration de 1789. Elle y réclame l’égalité civile et politique des femmes, critique le mariage et l’esclavage ; elle est guillotinée en 1793.",
          "related": [
            "fr-revolution",
            "fr-terreur"
          ],
          "sources": [
            "SRC-003"
          ]
        },
        {
          "id": "fr-terreur",
          "year": 1793,
          "title": "La Terreur",
          "subtitle": "La République menacée se radicalise",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Reign_of_Terror",
          "summary": "La Convention instaure un gouvernement révolutionnaire et multiplie les exécutions. Louis XVI est guillotiné en janvier 1793 ; la Terreur prend fin en 1794.",
          "related": [
            "fr-revolution",
            "fr-brumaire"
          ]
        },
        {
          "id": "fr-brumaire",
          "year": 1799,
          "title": "Brumaire",
          "subtitle": "Bonaparte prend le pouvoir",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Coup_of_18_Brumaire",
          "summary": "Le général Bonaparte renverse le Directoire lors du coup d’État du 18 brumaire. Il installe le Consulat et concentre progressivement le pouvoir.",
          "related": [
            "fr-code-civil",
            "fr-terreur"
          ]
        },
        {
          "id": "fr-code-civil",
          "year": 1804,
          "title": "Code civil",
          "subtitle": "L’égalité civile et ses limites",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Napoleonic_Code",
          "summary": "Le Code civil des Français unifie le droit, garantit la propriété et organise le mariage civil. L’égalité civile qu’il consacre est celle des hommes majeurs ; les femmes restent sous l’autorité de leur mari et l’esclavage colonial demeure hors de son champ. Il inspire encore de nombreux systèmes juridiques.",
          "related": [
            "fr-brumaire",
            "fr-waterloo"
          ],
          "sources": [
            "SRC-003",
            "SRC-002"
          ]
        },
        {
          "id": "fr-waterloo",
          "year": 1815,
          "title": "Waterloo",
          "subtitle": "Chute définitive de Napoléon",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 3,
          "grok": "Battle_of_Waterloo",
          "summary": "Napoléon est battu par les coalisés en Belgique. Il abdique une seconde fois et part en exil à Sainte-Hélène ; la Restauration revient.",
          "related": [
            "fr-code-civil",
            "fr-1830"
          ]
        },
        {
          "id": "fr-1830",
          "year": 1830,
          "title": "Trois Glorieuses",
          "subtitle": "La monarchie de Juillet",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "July_Revolution",
          "summary": "Trois journées d’émeute parisienne renversent Charles X. Louis-Philippe devient roi des Français, sous une monarchie constitutionnelle plus libérale.",
          "related": [
            "fr-1848"
          ]
        },
        {
          "id": "fr-1848",
          "year": 1848,
          "title": "Révolution de 1848",
          "subtitle": "La IIe République et le suffrage universel",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "French_Revolution_of_1848",
          "summary": "La monarchie de Juillet tombe en février. La IIe République instaure le suffrage universel masculin et abolit l’esclavage dans les colonies.",
          "related": [
            "fr-1830",
            "fr-1870"
          ]
        },
        {
          "id": "fr-1870",
          "year": 1870,
          "title": "Guerre de 1870",
          "subtitle": "Sedan et la chute du Second Empire",
          "tags": [
            "guerre"
          ],
          "importance": 2,
          "grok": "Franco-Prussian_War",
          "summary": "La France déclare la guerre à la Prusse et subit une défaite rapide. Napoléon III capitule à Sedan ; la République est proclamée à Paris.",
          "related": [
            "fr-commune",
            "fr-1848"
          ]
        },
        {
          "id": "fr-commune",
          "year": 1871,
          "title": "Commune de Paris",
          "subtitle": "Une révolution sociale écrasée",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "Paris_Commune",
          "summary": "Après la défaite, Paris se soulève et instaure une Commune ouvrière et républicaine. La répression de la Semaine sanglante fait des milliers de victimes.",
          "related": [
            "fr-1870",
            "fr-ferry"
          ]
        },
        {
          "id": "fr-ferry",
          "year": 1881,
          "endYear": 1882,
          "title": "Lois Ferry",
          "subtitle": "L’école gratuite et obligatoire",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 2,
          "grok": "Jules_Ferry_laws",
          "summary": "Les lois Jules Ferry rendent l’enseignement primaire gratuit, laïque et obligatoire. L’école devient un pilier de la République et de l’unité nationale.",
          "related": [
            "fr-laicite"
          ]
        },
        {
          "id": "fr-dreyfus",
          "year": 1894,
          "title": "Affaire Dreyfus",
          "subtitle": "Un capitaine juif condamné à tort",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "grok": "Dreyfus_affair",
          "summary": "Le capitaine Alfred Dreyfus est condamné pour haute trahison sur des preuves falsifiées. L’affaire déchire la France entre dreyfusards et antidreyfusards, et révèle l’antisémitisme de l’époque.",
          "related": [
            "fr-laicite"
          ]
        },
        {
          "id": "fr-laicite",
          "year": 1905,
          "title": "Loi de 1905",
          "subtitle": "Séparation des Églises et de l’État",
          "tags": [
            "religion",
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "1905_French_law_on_the_Separation_of_the_Churches_and_the_State",
          "summary": "La loi du 9 décembre 1905 met fin au régime des cultes reconnus et garantit la liberté de conscience. Son application est progressive et souvent conflictuelle, notamment lors des inventaires de 1906. La laïcité devient un principe structurant de la République, réactivé par les débats sur le voile à Creil en 1989 et par la loi de 2004 sur les signes religieux à l’école.",
          "related": [
            "fr-ferry",
            "fr-dreyfus"
          ],
          "sources": [
            "SRC-017"
          ]
        },
        {
          "id": "fr-ww1",
          "year": 1914,
          "endYear": 1918,
          "title": "Grande Guerre",
          "subtitle": "La France dans les tranchées",
          "tags": [
            "guerre"
          ],
          "importance": 3,
          "grok": "World_War_I",
          "summary": "La Première Guerre mondiale mobilise des millions de Français et dévaste le nord du pays. L’armistice du 11 novembre 1918 laisse une société traumatisée.",
          "related": [
            "fr-versailles",
            "fr-ww2",
            "uk-ww1",
            "de-ww1"
          ]
        },
        {
          "id": "fr-versailles",
          "year": 1919,
          "title": "Versailles",
          "subtitle": "Le traité qui humilie l’Allemagne",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Treaty_of_Versailles",
          "summary": "Les vainqueurs imposent à l’Allemagne des réparations et des pertes territoriales. Le traité nourrit un ressentiment durable et fragilise la jeune République de Weimar.",
          "related": [
            "fr-ww1",
            "de-weimar"
          ]
        },
        {
          "id": "fr-front-populaire",
          "year": 1936,
          "title": "Front populaire",
          "subtitle": "Congés payés et 40 heures",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 2,
          "grok": "Popular_Front_(France)",
          "summary": "La coalition de gauche menée par Léon Blum remporte les élections. Les accords Matignon accordent congés payés et hausse des salaires, dans un climat de grèves.",
          "related": [
            "fr-ww2"
          ]
        },
        {
          "id": "fr-ww2",
          "year": 1939,
          "endYear": 1945,
          "title": "Seconde Guerre mondiale",
          "subtitle": "Occupation, Vichy, Shoah, Libération",
          "tags": [
            "guerre",
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "World_War_II",
          "summary": "La défaite de 1940 conduit à l’Occupation et au régime de Vichy, qui prend part à la persécution des Juifs. Les 16 et 17 juillet 1942, la police française organise, avec l’occupant allemand, la rafle du Vél’ d’Hiv ; en 1944, la Résistance, les Alliés et les troupes coloniales contribuent à la libération du pays. La guerre révèle l’ampleur des crimes nazis et de la collaboration.",
          "related": [
            "fr-vote-femmes",
            "fr-secu",
            "de-ww2",
            "it-ww2"
          ],
          "sources": [
            "SRC-008",
            "SRC-009"
          ]
        },
        {
          "id": "fr-vote-femmes",
          "year": 1944,
          "title": "Vote des femmes",
          "subtitle": "Les Françaises deviennent électrices",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "grok": "Women's_suffrage",
          "summary": "Une ordonnance du gouvernement d’Alger accorde le droit de vote aux femmes. Elles votent pour la première fois aux municipales de 1945.",
          "related": [
            "fr-ww2",
            "fr-secu"
          ]
        },
        {
          "id": "fr-secu",
          "year": 1945,
          "title": "Sécurité sociale",
          "subtitle": "La protection sociale pour tous",
          "tags": [
            "societe",
            "economie"
          ],
          "importance": 2,
          "grok": "Social_security_in_France",
          "summary": "Les ordonnances de 1945 jettent les bases d’un système de protection sociale unifié. Maladie, vieillesse et famille deviennent des risques couverts par la collectivité.",
          "related": [
            "fr-trente",
            "fr-vote-femmes"
          ]
        },
        {
          "id": "fr-trente",
          "year": 1945,
          "endYear": 1975,
          "title": "Trente Glorieuses",
          "subtitle": "Croissance et modernisation",
          "tags": [
            "economie",
            "societe"
          ],
          "importance": 2,
          "grok": "Trente_Glorieuses",
          "summary": "La reconstruction et l’industrialisation transforment la France en société de consommation entre 1945 et 1975. Les villes, les transports et les modes de vie changent profondément. La croissance s’essouffle avec la crise de 1973-1975, qui ouvre une période de chômage de masse et de désindustrialisation.",
          "related": [
            "fr-secu",
            "fr-mai68"
          ],
          "sources": [
            "SRC-019"
          ]
        },
        {
          "id": "fr-algerie",
          "year": 1954,
          "endYear": 1962,
          "title": "Guerre d’Algérie",
          "subtitle": "Décolonisation et crise politique",
          "tags": [
            "guerre",
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Algerian_War",
          "summary": "La guerre d’indépendance algérienne oppose l’armée française au FLN et à ses réseaux, et touche aussi les civils algériens. La torture, les déplacements de populations et la répression policière en métropole, dont celle du 17 octobre 1961, divisent durablement la France. Les accords d’Évian mettent fin au conflit en 1962 ; l’exode des pieds-noirs et l’arrivée des harkis recomposent la société française.",
          "related": [
            "fr-ve-rep",
            "fr-mai68"
          ],
          "sources": [
            "SRC-011",
            "SRC-012"
          ]
        },
        {
          "id": "fr-ve-rep",
          "year": 1958,
          "title": "Ve République",
          "subtitle": "De Gaulle fonde un régime stable",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "French_Fifth_Republic",
          "summary": "Appelé au pouvoir pendant la crise algérienne, de Gaulle fait adopter une nouvelle Constitution. Le régime présidentiel renforce l’exécutif et stabilise la vie politique.",
          "related": [
            "fr-algerie",
            "fr-mai68"
          ]
        },
        {
          "id": "fr-prop-009",
          "year": 1961,
          "title": "17 octobre 1961",
          "subtitle": "La répression de la manifestation du FLN",
          "tags": [
            "guerre",
            "societe",
            "politique"
          ],
          "importance": 3,
          "summary": "Le 17 octobre 1961, des dizaines de milliers d’Algériens manifestent à Paris contre le couvre-feu imposé par la préfecture de police. La répression, conduite sous l’autorité de Maurice Papon, fait plusieurs dizaines de morts ; le bilan exact reste disputé. L’événement est longtemps occulté avant de devenir un enjeu majeur de mémoire.",
          "related": [
            "fr-algerie",
            "fr-ve-rep"
          ],
          "sources": [
            "SRC-011",
            "SRC-015"
          ]
        },
        {
          "id": "fr-prop-012",
          "year": 1967,
          "title": "Loi Neuwirth",
          "subtitle": "La contraception autorisée",
          "tags": [
            "societe",
            "politique",
            "sciences"
          ],
          "importance": 3,
          "summary": "La loi du 28 décembre 1967, portée par le député Lucien Neuwirth, autorise la contraception et met fin à l’interdiction héritée de 1920. Elle ne garantit ni l’accès réel ni le remboursement, et son application se heurte à l’opposition catholique et aux résistances administratives.",
          "related": [
            "fr-vote-femmes",
            "fr-veil"
          ],
          "sources": [
            "SRC-014"
          ]
        },
        {
          "id": "fr-mai68",
          "year": 1968,
          "title": "Mai 68",
          "subtitle": "Révolte étudiante et grève générale",
          "tags": [
            "societe",
            "arts"
          ],
          "importance": 3,
          "grok": "May_1968",
          "summary": "La contestation étudiante parisienne débouche sur une grève générale. Au-delà de la crise politique, Mai 68 transforme les mœurs et les rapports d’autorité.",
          "related": [
            "fr-veil",
            "fr-trente"
          ]
        },
        {
          "id": "fr-veil",
          "year": 1975,
          "title": "Loi Veil",
          "subtitle": "L’IVG autorisée sous conditions",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 2,
          "grok": "Abortion_in_France",
          "summary": "La loi du 17 janvier 1975, portée par Simone Veil, autorise l’interruption volontaire de grossesse sous conditions, pour une durée de cinq ans. Elle est reconduite et rendue définitive. Elle marque une étape majeure des droits des femmes en France.",
          "related": [
            "fr-mai68",
            "fr-peine-mort"
          ],
          "sources": [
            "SRC-014"
          ]
        },
        {
          "id": "fr-peine-mort",
          "year": 1981,
          "title": "Peine de mort abolie",
          "subtitle": "Badinter et la justice française",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "Capital_punishment_in_France",
          "summary": "La France abolit la peine de mort sous l’impulsion de Robert Badinter. La mesure devient un symbole de l’engagement français pour les droits humains.",
          "related": [
            "fr-veil",
            "fr-maastricht"
          ]
        },
        {
          "id": "fr-maastricht",
          "year": 1992,
          "title": "Maastricht",
          "subtitle": "Le traité et le référendum de 1992",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 2,
          "grok": "Maastricht_Treaty",
          "summary": "Le traité de Maastricht crée l’Union européenne et prépare la monnaie unique. Approuvé de justesse par référendum le 20 septembre 1992, il révèle un clivage durable entre partisans de l’intégration et défenseurs de la souveraineté nationale. Sa ratification ne va pas de soi et divise partis et électorats.",
          "related": [
            "fr-euro"
          ],
          "sources": [
            "SRC-010"
          ]
        },
        {
          "id": "fr-euro",
          "year": 2002,
          "title": "L’euro",
          "subtitle": "La monnaie unique entre en circulation",
          "tags": [
            "economie",
            "politique"
          ],
          "importance": 1,
          "grok": "Euro",
          "summary": "Le 1er janvier 2002, les pièces et billets en euros remplacent le franc. La monnaie unique prolonge un choix de politique économique et monétaire discuté, qui implique de renoncer à une part de souveraineté nationale. Elle approfondit l’intégration européenne mais reste associée à des débats sur la croissance, l’inflation et les règles budgétaires.",
          "related": [
            "fr-maastricht"
          ],
          "sources": [
            "SRC-010"
          ]
        },
        {
          "id": "fr-charlie",
          "year": 2015,
          "title": "Charlie Hebdo",
          "subtitle": "Les attentats de janvier 2015",
          "tags": [
            "societe",
            "politique",
            "religion"
          ],
          "importance": 2,
          "grok": "January_2015_Île-de-France_attacks",
          "summary": "Du 7 au 9 janvier 2015, les attentats contre Charlie Hebdo et l’Hyper Cacher, ainsi que le meurtre d’une policière à Montrouge, font dix-sept victimes. Une immense marche républicaine défend la liberté d’expression, tandis que les débats portent aussi sur l’antisémitisme et la laïcité. Les attentats relancent les questions sur la place de l’islam et sur les libertés publiques.",
          "related": [
            "fr-covid"
          ],
          "sources": [
            "SRC-017"
          ]
        },
        {
          "id": "fr-covid",
          "year": 2020,
          "title": "Covid-19",
          "subtitle": "Confinement et crise sanitaire",
          "tags": [
            "societe",
            "sciences"
          ],
          "importance": 1,
          "grok": "COVID-19_pandemic",
          "summary": "La pandémie de Covid-19 conduit à un confinement national inédit. Elle bouleverse l’économie, l’école et les sociabilités, et accélère la numérisation.",
          "related": [
            "fr-jo2024"
          ]
        },
        {
          "id": "fr-jo2024",
          "year": 2024,
          "title": "Jeux de Paris",
          "subtitle": "La France accueille les JO",
          "tags": [
            "societe"
          ],
          "importance": 1,
          "grok": "2024_Summer_Olympics",
          "summary": "Paris accueille les Jeux olympiques d’été, un siècle après 1924. L’événement mobilise le pays et met en scène une nouvelle image de la France.",
          "related": [
            "fr-covid"
          ]
        }
      ]
    },
    {
      "id": "uk",
      "name": "Royaume-Uni",
      "articleName": "l'Histoire du Royaume-Uni",
      "flag": "🇬🇧",
      "color": "#ef8b7d",
      "domain": [
        43,
        2026
      ],
      "tagline": "De la Bretagne romaine au Brexit",
      "featuredIds": [
        "uk-hastings",
        "uk-magna",
        "uk-industrie",
        "uk-ww1",
        "uk-ww2",
        "uk-brexit"
      ],
      "intro": "Une île, quatre nations et un empire : deux millénaires d’une histoire qui a exporté ses institutions et sa langue.",
      "eras": [
        {
          "name": "Bretagne romaine, Anglo-Saxons et Vikings",
          "start": 43,
          "end": 1066,
          "color": "#6f7fd0"
        },
        {
          "name": "Moyen Âge des quatre nations",
          "start": 1066,
          "end": 1485,
          "color": "#8a6fb2"
        },
        {
          "name": "Réforme, guerres des Trois Royaumes et Révolution",
          "start": 1485,
          "end": 1688,
          "color": "#c2855c"
        },
        {
          "name": "Empire & industrie",
          "start": 1688,
          "end": 1914,
          "color": "#c7a257"
        },
        {
          "name": "Guerres totales et crise impériale",
          "start": 1914,
          "end": 1945,
          "color": "#b35e5e"
        },
        {
          "name": "Royaume-Uni contemporain",
          "start": 1945,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "uk-rome",
          "year": 43,
          "title": "Conquête romaine",
          "subtitle": "Une conquête progressive",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 2,
          "grok": "Roman_conquest_of_Britain",
          "summary": "En 43, l’empereur Claude lance l’invasion de la Bretagne, conduite par Aulus Plautius, et la conquête se poursuit pendant plusieurs décennies. Une grande partie de l’île est intégrée à la province romaine, mais l’Écosse n’est pas conquise et le mur d’Hadrien fixe une frontière. La Bretagne romaine se construit par l’armée, la fiscalité et l’administration, au prix de violences et de résistances.",
          "related": [
            "uk-410"
          ]
        },
        {
          "id": "uk-410",
          "year": 410,
          "title": "Fin de la Bretagne romaine",
          "subtitle": "Une autorité qui s’éteint, des sociétés qui se recomposent",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "End_of_Roman_rule_in_Britain",
          "summary": "Vers 410, l’autorité romaine cesse durablement de s’exercer en Bretagne ; la date ne marque pas un départ unique des légions. Les sociétés locales se recomposent tandis que l’installation anglo-saxonne s’étale sur les Ve et VIe siècles. Les royaumes anglo-saxons qui émergent ne résultent pas d’une invasion homogène, mais de processus politiques et militaires divers.",
          "related": [
            "uk-rome",
            "uk-hastings"
          ],
          "sources": [
            "SRC-001",
            "SRC-002"
          ]
        },
        {
          "id": "uk-hastings",
          "year": 1066,
          "title": "Hastings",
          "subtitle": "Guillaume de Normandie conquiert l’Angleterre",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 3,
          "grok": "Battle_of_Hastings",
          "summary": "Guillaume, duc de Normandie, bat Harold II à Hastings. La conquête normande transforme la noblesse, la langue et l’administration du royaume.",
          "related": [
            "uk-magna"
          ]
        },
        {
          "id": "uk-magna",
          "year": 1215,
          "title": "Magna Carta",
          "subtitle": "Un règlement féodal devenu référence constitutionnelle",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Magna_Carta",
          "summary": "Le 15 juin 1215, Jean sans Terre accepte une charte négociée avec les barons, qui règle des griefs féodaux et limite certains abus royaux. Innocent III l’annule peu après ; le texte est réédité en 1216, 1217 et 1225. Sa mémoire comme charte des libertés se construit bien après 1215, dans les conflits politiques des siècles suivants.",
          "related": [
            "uk-hastings",
            "uk-glorieuse"
          ],
          "sources": [
            "SRC-001",
            "SRC-002"
          ]
        },
        {
          "id": "uk-peste",
          "year": 1348,
          "title": "Peste noire",
          "subtitle": "Une mortalité massive, des estimations de 30 à 60 %",
          "tags": [
            "societe",
            "economie"
          ],
          "importance": 2,
          "grok": "Black_Death",
          "summary": "La peste atteint les îles Britanniques en 1348 et se prolonge en 1349 ; son origine portuaire exacte reste incertaine. Les estimations de mortalité vont de 30 à 60 % de la population, avec des variations régionales. L’épidémie bouleverse l’économie agraire, le travail et les rapports sociaux.",
          "related": [
            "uk-civil"
          ],
          "endYear": 1349,
          "sources": [
            "SRC-001",
            "SRC-002"
          ]
        },
        {
          "id": "uk-suprematie",
          "year": 1534,
          "title": "Acte de suprématie",
          "subtitle": "Henri VIII rompt avec Rome",
          "tags": [
            "religion",
            "politique"
          ],
          "importance": 3,
          "grok": "Acts_of_Supremacy",
          "summary": "Le Parlement reconnaît Henri VIII comme chef suprême de l’Église d’Angleterre. La rupture avec Rome ouvre la voie à la Réforme anglaise.",
          "related": [
            "uk-armada"
          ]
        },
        {
          "id": "uk-armada",
          "year": 1588,
          "title": "Armada",
          "subtitle": "L’Espagne échoue à envahir l’Angleterre",
          "tags": [
            "guerre"
          ],
          "importance": 2,
          "grok": "Spanish_Armada",
          "summary": "La grande flotte de Philippe II est défaite dans la Manche. La victoire renforce l’Angleterre protestante et son ambition maritime.",
          "related": [
            "uk-suprematie",
            "uk-industrie"
          ]
        },
        {
          "id": "uk-civil",
          "year": 1639,
          "endYear": 1653,
          "title": "Guerres des Trois Royaumes",
          "subtitle": "Écosse, Irlande et Angleterre (1639–1653)",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 3,
          "grok": "English_Civil_War",
          "summary": "Les guerres des Trois Royaumes commencent en Écosse en 1639 et s’étendent à l’Irlande et à l’Angleterre. Charles Ier est exécuté en 1649 ; la république puis le Protectorat de Cromwell précèdent la restauration de 1660. La conquête cromwellienne de l’Irlande (1649–1653) y laisse des traces durables.",
          "related": [
            "uk-glorieuse"
          ],
          "sources": [
            "SRC-002",
            "SRC-005",
            "SRC-001"
          ]
        },
        {
          "id": "uk-glorieuse",
          "year": 1688,
          "title": "Glorieuse Révolution",
          "subtitle": "Une invasion hollandaise et un compromis politique",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Glorious_Revolution",
          "summary": "En 1688, Guillaume III débarque avec une armée hollandaise et Jacques II est renversé, avec le soutien d’une large partie des élites protestantes. Le Bill of Rights, adopté en décembre 1689 après une déclaration de février, est une loi qui limite le pouvoir royal et fixe des droits parlementaires. La révolution est aussi un compromis politique, et non l’installation spontanée du parlementarisme.",
          "related": [
            "uk-magna",
            "uk-union"
          ],
          "sources": [
            "SRC-001",
            "SRC-003"
          ]
        },
        {
          "id": "uk-union",
          "year": 1707,
          "title": "Actes d’Union (1707)",
          "subtitle": "Naissance du Royaume de Grande-Bretagne",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Acts_of_Union_1707",
          "summary": "Les parlements d’Angleterre et d’Écosse adoptent les Actes d’Union, en vigueur le 1er mai 1707 ; ils créent le Royaume de Grande-Bretagne, et non le Royaume-Uni. Le Parlement écossais vote sa propre dissolution au terme d’un marchandage politique contesté, accompagné de pétitions et d’émeutes. L’Église d’Écosse et le droit écossais sont préservés.",
          "related": [
            "uk-glorieuse",
            "uk-industrie"
          ],
          "sources": [
            "SRC-003",
            "SRC-004",
            "SRC-002"
          ]
        },
        {
          "id": "uk-industrie",
          "year": 1750,
          "endYear": 1850,
          "title": "Révolution industrielle",
          "subtitle": "Un processus régional et impérial (1750–1850)",
          "tags": [
            "economie",
            "sciences",
            "societe"
          ],
          "importance": 3,
          "grok": "Industrial_Revolution",
          "summary": "L’industrialisation se déploie vers 1750–1850 dans des régions précises : Lancashire, West Riding, Clyde et Midlands. Le charbon, le textile, les manufactures, les marchés impériaux et les capitaux liés à la traite et à l’esclavage transforment le travail, y compris celui des femmes et des enfants, et accélèrent l’urbanisation. L’expression « révolution industrielle » est une métaphore commode, contestée par les historiens qui insistent sur les continuités et la diversité régionale.",
          "related": [
            "uk-expo",
            "uk-esclavage"
          ],
          "sources": [
            "SRC-007",
            "SRC-009",
            "SRC-001"
          ]
        },
        {
          "id": "uk-prop-001",
          "year": 1801,
          "title": "Union avec l’Irlande",
          "subtitle": "Naissance du Royaume-Uni de Grande-Bretagne et d’Irlande",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 3,
          "summary": "Les Actes d’Union adoptés par les parlements de Grande-Bretagne et d’Irlande entrent en vigueur le 1er janvier 1801. L’Irlande perd son parlement ; 100 députés irlandais siègent à Westminster. L’union est contestée par les catholiques et les patriotes irlandais, et ne règle pas la question de l’émancipation catholique.",
          "related": [
            "uk-union",
            "uk-prop-005"
          ],
          "sources": [
            "SRC-005",
            "SRC-002",
            "SRC-003"
          ]
        },
        {
          "id": "uk-esclavage",
          "year": 1833,
          "title": "Abolition de l’esclavage (1833–1838)",
          "subtitle": "Loi, compensation et apprentissage",
          "tags": [
            "societe",
            "politique",
            "economie"
          ],
          "importance": 3,
          "grok": "Slavery_Abolition_Act_1833",
          "summary": "Le Slavery Abolition Act reçoit l’assentiment royal le 28 août 1833 et entre en vigueur le 1er août 1834 dans les colonies britanniques, avec des exceptions. Les personnes asservies passent par une période d’apprentissage avant 1838 ; les propriétaires reçoivent £20 millions, sans indemnisation pour les personnes libérées. L’abolition couronne des décennies de campagnes, mais elle laisse subsister des formes de coercition et de dépendance.",
          "related": [
            "uk-industrie"
          ],
          "endYear": 1838,
          "sources": [
            "SRC-020",
            "SRC-008"
          ]
        },
        {
          "id": "uk-prop-005",
          "year": 1845,
          "title": "Grande famine irlandaise",
          "subtitle": "Mortalité, émigration et responsabilité impériale",
          "tags": [
            "societe",
            "economie"
          ],
          "importance": 3,
          "summary": "La maladie de la pomme de terre détruit les récoltes à partir de 1845 ; la famine dure jusqu’en 1852. Environ un million de personnes meurent et plus d’un million émigrent. La gestion britannique, les marchés et l’aide publique sont au cœur des débats historiographiques.",
          "related": [
            "uk-prop-001",
            "uk-industrie"
          ],
          "sources": [
            "SRC-011",
            "SRC-005"
          ],
          "endYear": 1852
        },
        {
          "id": "uk-expo",
          "year": 1851,
          "title": "Crystal Palace",
          "subtitle": "La première Exposition universelle",
          "tags": [
            "economie",
            "sciences"
          ],
          "importance": 1,
          "grok": "Great_Exhibition",
          "summary": "Londres accueille une exposition mondiale dans un palais de verre et d’acier. L’événement célèbre la puissance industrielle et impériale britannique.",
          "related": [
            "uk-industrie"
          ]
        },
        {
          "id": "uk-ww1",
          "year": 1914,
          "endYear": 1918,
          "title": "Grande Guerre",
          "subtitle": "Guerre totale, empire et front intérieur",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "grok": "World_War_I",
          "summary": "Le Royaume-Uni mobilise son empire, lève une armée de volontaires puis instaure la conscription en 1916, et subit des pertes massives sur le front occidental. Le front intérieur, les usines de munitions et le travail des femmes transforment la société ; l’insurrection de Pâques 1916 ouvre la crise irlandaise. Le déclin relatif de la puissance britannique après 1918 est une thèse débattue, pas une conséquence automatique de la guerre.",
          "related": [
            "uk-vote",
            "fr-ww1"
          ],
          "sources": [
            "SRC-012",
            "SRC-001"
          ]
        },
        {
          "id": "uk-vote",
          "year": 1918,
          "title": "Vote des femmes",
          "subtitle": "Un suffrage limité, puis l’égalité en 1928",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "grok": "Representation_of_the_People_Act_1918",
          "summary": "La Representation of the People Act reçoit l’assentiment royal le 6 février 1918 ; elle accorde le vote aux femmes de plus de 30 ans remplissant une condition de propriété, et aux hommes de plus de 21 ans. Environ 8,5 millions de femmes deviennent électrices, et les femmes peuvent se présenter aux élections dès 1918 ; l’égalité électorale avec les hommes n’est atteinte qu’en 1928. Le vote de 1918 est le produit des campagnes de la WSPU, de la NUWSS et des suffragistes radicales, notamment dans le Lancashire.",
          "related": [
            "uk-ww1"
          ],
          "sources": [
            "SRC-014",
            "SRC-001"
          ]
        },
        {
          "id": "uk-prop-007",
          "year": 1919,
          "title": "Amritsar",
          "subtitle": "Le massacre de Jallianwala Bagh",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 3,
          "summary": "Le 13 avril 1919, le général Dyer ordonne de tirer sur une foule réunie à Jallianwala Bagh, à Amritsar. Le bilan officiel est de 379 morts, mais les estimations sont plus élevées. L’événement nourrit le mouvement nationaliste indien et la critique de l’empire britannique.",
          "related": [
            "uk-ww1",
            "uk-prop-009"
          ],
          "sources": [
            "SRC-015",
            "SRC-009"
          ]
        },
        {
          "id": "uk-ww2",
          "year": 1939,
          "endYear": 1945,
          "title": "Seconde Guerre mondiale",
          "subtitle": "Le Royaume-Uni, son empire et la guerre totale",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "grok": "World_War_II",
          "summary": "Le Royaume-Uni et son empire combattent l’Allemagne nazie aux côtés des dominions et des Alliés ; après la défaite française de 1940, le pays tient avec son empire jusqu’à l’entrée en guerre de l’URSS et des États-Unis en 1941. La bataille d’Angleterre (1940) et le Blitz (septembre 1940–mai 1941) frappent les villes, puis les V1 et V2 bombardent le pays en 1944–1945, tandis que les îles Anglo-Normandes restent occupées. Le rapport Beveridge de 1942 prépare l’État-providence, et la famine du Bengale de 1943 rappelle le coût impérial du conflit.",
          "related": [
            "uk-nhs",
            "de-ww2"
          ],
          "sources": [
            "SRC-012",
            "SRC-016",
            "SRC-001"
          ]
        },
        {
          "id": "uk-prop-009",
          "year": 1947,
          "title": "Partition de l’Inde",
          "subtitle": "Indépendance, partition et déplacements",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "summary": "L’Inde et le Pakistan deviennent indépendants en août 1947. La partition du Bengale et du Pendjab provoque le déplacement de 10 à 15 millions de personnes et des violences qui tuent peut-être un million de personnes. Le Royaume-Uni met fin à son empire indien dans une précipitation controversée.",
          "related": [
            "uk-ww2",
            "uk-prop-007"
          ],
          "sources": [
            "SRC-010",
            "SRC-005"
          ]
        },
        {
          "id": "uk-nhs",
          "year": 1948,
          "title": "NHS",
          "subtitle": "Fondation, financement et premières charges",
          "tags": [
            "societe"
          ],
          "importance": 3,
          "grok": "National_Health_Service",
          "summary": "Le National Health Service ouvre le 5 juillet 1948 sous la direction du ministre de la Santé Aneurin Bevan ; il est gratuit au point d’usage et financé principalement par l’impôt. Des charges pour les prescriptions, les lunettes et les soins dentaires sont introduites à partir de 1951. La profession médicale, les hôpitaux volontaires et les personnels du Commonwealth sont des acteurs clés de sa construction.",
          "related": [
            "uk-ww2",
            "uk-thatcher"
          ],
          "endYear": 1951,
          "sources": [
            "SRC-012",
            "SRC-001"
          ]
        },
        {
          "id": "uk-thatcher",
          "year": 1979,
          "title": "Thatcher",
          "subtitle": "1979–1990 : privatisations, conflits sociaux et divisions territoriales",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 3,
          "grok": "Margaret_Thatcher",
          "summary": "Margaret Thatcher devient Première ministre le 4 mai 1979 et engage un programme de monétarisme, de privatisations et de réduction du pouvoir syndical. La grève des mineurs de 1984–1985, la poll tax et la Section 28 cristallisent les oppositions ; elle démissionne en novembre 1990. Le programme transforme l’économie et creuse les divisions régionales, mais ses effets varient selon les secteurs et les territoires.",
          "related": [
            "uk-brexit"
          ],
          "endYear": 1990,
          "sources": [
            "SRC-012",
            "SRC-001"
          ]
        },
        {
          "id": "uk-good-friday",
          "year": 1998,
          "title": "Vendredi saint",
          "subtitle": "Un accord qui ouvre un processus de paix",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Good_Friday_Agreement",
          "summary": "L’accord du Vendredi saint est signé le 10 avril 1998 ; il organise un partage du pouvoir en Irlande du Nord et est approuvé par référendum le 22 mai 1998. L’attentat d’Omagh, le 15 août 1998, et les suspensions de l’Assemblée entre 2002 et 2007 montrent que la paix n’est pas linéaire. L’accord s’inscrit dans l’histoire de la partition de 1921–1922 et des Troubles, qu’il ne clôt pas entièrement.",
          "related": [
            "uk-brexit"
          ],
          "sources": [
            "SRC-001",
            "SRC-005"
          ]
        },
        {
          "id": "uk-brexit",
          "year": 2016,
          "title": "Brexit",
          "subtitle": "Référendum, retrait et accord de commerce",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 3,
          "grok": "Brexit",
          "summary": "Le référendum du 23 juin 2016 donne 51,9 % des voix au Leave, avec une participation de 72,2 % ; l’Écosse et l’Irlande du Nord votent majoritairement Remain. Le Royaume-Uni active l’article 50 en 2017, et l’élection de 2019 permet l’adoption de l’accord de retrait ; il quitte l’Union européenne le 31 janvier 2020. La période de transition s’achève le 31 décembre 2020, dans un contexte de divisions territoriales et de questions sur le protocole nord-irlandais.",
          "related": [
            "uk-thatcher",
            "uk-good-friday"
          ],
          "endYear": 2020,
          "sources": [
            "SRC-013",
            "SRC-001"
          ]
        }
      ]
    },
    {
      "id": "usa",
      "name": "États-Unis",
      "articleName": "l'Histoire des États-Unis",
      "flag": "🇺🇸",
      "color": "#65c7bb",
      "domain": [
        1607,
        2026
      ],
      "tagline": "De Jamestown à l’hyperpuissance",
      "featuredIds": [
        "us-independance",
        "us-civil-war",
        "us-crash",
        "us-hiroshima",
        "us-civil-rights",
        "us-apollo",
        "us-911"
      ],
      "intro": "Quatre siècles de colonisation, de révolution, de guerre civile et de construction d’une puissance mondiale.",
      "eras": [
        {
          "name": "Colonies atlantiques et empires",
          "start": 1607,
          "end": 1776,
          "color": "#c2855c"
        },
        {
          "name": "Indépendance et république esclavagiste",
          "start": 1776,
          "end": 1861,
          "color": "#c7a257"
        },
        {
          "name": "Guerre civile & reconstruction",
          "start": 1861,
          "end": 1900,
          "color": "#b35e5e"
        },
        {
          "name": "Puissance mondiale",
          "start": 1900,
          "end": 1945,
          "color": "#6f7fd0"
        },
        {
          "name": "Guerre froide, guerres et droits civiques",
          "start": 1945,
          "end": 1991,
          "color": "#7f9a72"
        },
        {
          "name": "Après-guerre froide, sécurité et polarisation",
          "start": 1991,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "us-jamestown",
          "year": 1607,
          "title": "Jamestown",
          "subtitle": "Première colonie anglaise durable en Amérique du Nord",
          "tags": [
            "exploration",
            "societe"
          ],
          "importance": 2,
          "grok": "Jamestown,_Virginia",
          "summary": "Des colons anglais fondent Jamestown en 1607, première colonie anglaise durable en Amérique du Nord. La colonie survit difficilement, portée par le tabac et le travail forcé, tandis que les Powhatans occupent déjà la région. Saint Augustine (1565) et Santa Fe (1610) rappellent que la présence européenne précède Jamestown et que l’histoire du territoire ne commence pas avec elle.",
          "related": [
            "us-mayflower"
          ],
          "sources": [
            "SRC-006"
          ]
        },
        {
          "id": "us-prop-001",
          "year": 1619,
          "title": "Premiers Africains en Virginie",
          "subtitle": "Point Comfort, août 1619",
          "tags": [
            "societe",
            "economie"
          ],
          "importance": 3,
          "summary": "À la fin du mois d’août 1619, une vingtaine d’Africains capturés par le White Lion sont vendus à Point Comfort, en Virginie. Leur statut initial n’est pas uniformément l’esclavage héréditaire, codifié plus tard dans la colonie, mais leur arrivée ouvre la longue histoire de l’esclavage racial en Amérique du Nord britannique. Elle s’inscrit dans la traite atlantique et dans l’économie coloniale qui se met en place depuis Jamestown.",
          "related": [
            "us-jamestown",
            "us-13e"
          ],
          "sources": [
            "SRC-007"
          ]
        },
        {
          "id": "us-mayflower",
          "year": 1620,
          "title": "Mayflower",
          "subtitle": "Les pèlerins débarquent à Plymouth",
          "tags": [
            "exploration",
            "religion"
          ],
          "importance": 2,
          "grok": "Mayflower",
          "summary": "Le Mayflower transporte des dissidents religieux vers l’Amérique du Nord. Leur pacte de gouvernement devient un mythe fondateur de la démocratie américaine.",
          "related": [
            "us-jamestown",
            "us-independance"
          ]
        },
        {
          "id": "us-independance",
          "year": 1776,
          "title": "Indépendance",
          "subtitle": "La Déclaration du 4 juillet",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "United_States_Declaration_of_Independence",
          "summary": "Les treize colonies proclament leur indépendance de la Grande-Bretagne le 4 juillet 1776. La Déclaration affirme des droits naturels et l’égalité des hommes, mais plusieurs signataires possèdent des esclaves et les nations autochtones sont exclues de cet univers de droits. Le texte fonde une république où l’esclavage et l’expansion territoriale restent centraux.",
          "related": [
            "us-constitution",
            "us-mayflower"
          ],
          "sources": [
            "SRC-007",
            "SRC-006"
          ]
        },
        {
          "id": "us-constitution",
          "year": 1787,
          "title": "Constitution",
          "subtitle": "Compromis fondateurs et exclusions",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Constitution_of_the_United_States",
          "summary": "La Convention de Philadelphie rédige en 1787 une Constitution fédérale qui organise la séparation des pouvoirs et le fédéralisme. Le texte intègre le compromis des trois cinquièmes, qui compte les personnes réduites en esclavage pour une partie de la représentation sans leur donner de droits, et protège l’esclavage par plusieurs dispositions. Les femmes, les peuples autochtones et les personnes esclavisées sont exclus de la citoyenneté politique; la Constitution ne fonde pas une démocratie achevée.",
          "related": [
            "us-independance",
            "us-civil-war"
          ],
          "sources": [
            "SRC-007",
            "SRC-008"
          ]
        },
        {
          "id": "us-louisiane",
          "year": 1803,
          "title": "Louisiane",
          "subtitle": "Haïti, esclavage et expansion",
          "tags": [
            "politique",
            "exploration",
            "economie"
          ],
          "importance": 2,
          "grok": "Louisiana_Purchase",
          "summary": "Napoléon vend la Louisiane aux États-Unis en 1803, alors que l’expédition de Saint-Domingue échoue face à la révolution haïtienne et que les ambitions françaises sur l’île sont perdues. Le territoire double la superficie du pays et accélère l’expansion de la plantation esclavagiste et la dépossession des peuples autochtones. La vente ne se réduit donc pas à un besoin de financement militaire.",
          "related": [
            "us-railroad"
          ],
          "sources": [
            "SRC-007"
          ]
        },
        {
          "id": "us-prop-003",
          "year": 1830,
          "title": "Indian Removal Act",
          "subtitle": "La déportation des nations de l’Est",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "summary": "Le président Andrew Jackson signe le 28 mai 1830 une loi qui autorise la négociation de traités d’échange de terres à l’est du Mississippi contre des terres à l’ouest. Environ 100 000 personnes sont visées par les traités de déplacement; la déportation des Cherokees de 1838-1839 devient la Trail of Tears. La loi fait de la dépossession autochtone une politique fédérale et ouvre la voie à l’expansion territoriale des États-Unis.",
          "related": [
            "us-louisiane",
            "us-railroad"
          ],
          "sources": [
            "SRC-006"
          ]
        },
        {
          "id": "us-prop-005",
          "year": 1848,
          "title": "Convention de Seneca Falls",
          "subtitle": "La Déclaration des sentiments",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "summary": "Les 19 et 20 juillet 1848, Elizabeth Cady Stanton, Lucretia Mott, Frederick Douglass et d’autres réclament l’égalité des droits, dont le vote, à Seneca Falls, dans l’État de New York. La convention est un moment fondateur du mouvement des femmes, mais son universalisme exclut de fait les femmes noires et autochtones. Le droit de vote des femmes n’est reconnu au niveau fédéral qu’en 1920 avec le 19e amendement, et les femmes noires du Sud restent soumises à de nombreux obstacles.",
          "related": [
            "us-independance",
            "us-civil-rights"
          ],
          "sources": [
            "SRC-013"
          ]
        },
        {
          "id": "us-civil-war",
          "year": 1861,
          "endYear": 1865,
          "title": "Guerre de Sécession",
          "subtitle": "L’Union, l’esclavage et l’émancipation",
          "tags": [
            "guerre",
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "American_Civil_War",
          "summary": "La sécession des États esclavagistes déclenche en 1861 une guerre civile meurtrière. La Proclamation d’émancipation de 1863 et le 13e amendement de 1865 inscrivent l’abolition dans un processus politique, mais la victoire de l’Union ne suffit pas à reconstruire la nation. La Reconstruction (1865-1877) est renversée par la violence blanche et les compromis politiques de 1877, puis les lois Jim Crow consolident la ségrégation.",
          "related": [
            "us-13e",
            "us-constitution"
          ],
          "sources": [
            "SRC-008"
          ]
        },
        {
          "id": "us-13e",
          "year": 1865,
          "title": "Abolition",
          "subtitle": "Le 13e amendement abolit l’esclavage",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "grok": "Thirteenth_Amendment_to_the_United_States_Constitution",
          "summary": "Le 13e amendement est ratifié en décembre 1865; il abolit l’esclavage sauf comme sanction pénale, une exception qui permet le travail forcé des condamnés. Les Black Codes, le travail forcé des prisonniers (convict leasing) et les lois Jim Crow prolongent ensuite la ségrégation légale et le désfranchisement des Afro-Américains. L’abolition ne met donc pas fin à la domination raciale dans le Sud.",
          "related": [
            "us-civil-war",
            "us-civil-rights"
          ],
          "sources": [
            "SRC-008"
          ]
        },
        {
          "id": "us-railroad",
          "year": 1869,
          "title": "Transcontinental",
          "subtitle": "Travail, dépossession et expansion",
          "tags": [
            "economie",
            "sciences",
            "societe"
          ],
          "importance": 2,
          "grok": "First_transcontinental_railroad",
          "summary": "Le premier chemin de fer transcontinental est achevé à Promontory Summit en 1869. Sa construction mobilise des travailleurs chinois et irlandais dans des conditions dangereuses; elle ouvre à la colonisation des terres autochtones et accélère la destruction des bisons. Le chemin de fer relie les deux océans et transforme l’économie de l’Ouest, mais son coût humain et écologique est indissociable de la dépossession.",
          "related": [
            "us-louisiane",
            "us-industry"
          ],
          "sources": [
            "SRC-010",
            "SRC-006"
          ]
        },
        {
          "id": "us-industry",
          "year": 1900,
          "title": "Puissance industrielle",
          "subtitle": "L’Amérique entre dans le XXe siècle",
          "tags": [
            "economie",
            "sciences"
          ],
          "importance": 1,
          "grok": "Industrial_Revolution",
          "summary": "Au tournant du siècle, les États-Unis deviennent la première puissance industrielle mondiale. Acier, pétrole et électricité nourrissent une croissance rapide.",
          "related": [
            "us-railroad",
            "us-crash"
          ]
        },
        {
          "id": "us-ww1",
          "year": 1917,
          "title": "Entrée en guerre",
          "subtitle": "Les États-Unis basculent le conflit",
          "tags": [
            "guerre"
          ],
          "importance": 2,
          "grok": "American_entry_into_World_War_I",
          "summary": "Après des attaques de sous-marins allemands, les États-Unis rejoignent les Alliés. Leur puissance industrielle et humaine pèse sur l’issue de la guerre.",
          "related": [
            "us-crash",
            "fr-ww1"
          ]
        },
        {
          "id": "us-prop-010",
          "year": 1921,
          "title": "Massacre de Tulsa",
          "subtitle": "La destruction de Greenwood",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "summary": "Les 31 mai et 1er juin 1921, une foule blanche attaque le quartier noir de Greenwood, à Tulsa, et détruit 35 pâtés de maisons. Le bilan officiel de l’époque est de 36 morts, mais les historiens estiment aujourd’hui qu’il a pu atteindre 300 personnes; aucune réparation collective d’ampleur n’a été versée. Le massacre est longtemps occulté dans la mémoire publique avant de devenir un enjeu de reconnaissance.",
          "related": [
            "us-13e",
            "us-civil-rights"
          ],
          "sources": [
            "SRC-015"
          ]
        },
        {
          "id": "us-crash",
          "year": 1929,
          "title": "Krach de 1929",
          "subtitle": "La Grande Dépression commence",
          "tags": [
            "economie"
          ],
          "importance": 3,
          "grok": "Wall_Street_Crash_of_1929",
          "summary": "Le krach boursier de Wall Street précipite une dépression mondiale. Le New Deal de Roosevelt transforme le rôle économique de l’État fédéral.",
          "related": [
            "us-ww1",
            "us-pearl"
          ]
        },
        {
          "id": "us-pearl",
          "year": 1941,
          "title": "Pearl Harbor",
          "subtitle": "L’Amérique entre dans la guerre",
          "tags": [
            "guerre"
          ],
          "importance": 3,
          "grok": "Attack_on_Pearl_Harbor",
          "summary": "L’attaque japonaise contre Pearl Harbor entraîne l’entrée des États-Unis dans la Seconde Guerre mondiale. Le pays devient l’arsenal des démocraties.",
          "related": [
            "us-hiroshima",
            "us-crash"
          ]
        },
        {
          "id": "us-hiroshima",
          "year": 1945,
          "title": "Hiroshima",
          "subtitle": "L’arme atomique met fin à la guerre",
          "tags": [
            "guerre",
            "sciences"
          ],
          "importance": 3,
          "grok": "Atomic_bombings_of_Hiroshima_and_Nagasaki",
          "summary": "Les bombes atomiques larguées sur Hiroshima et Nagasaki provoquent des destructions inouïes. Elles ouvrent l’ère nucléaire et restent un sujet de débat moral.",
          "related": [
            "us-pearl",
            "us-cold-war"
          ]
        },
        {
          "id": "us-cold-war",
          "year": 1947,
          "endYear": 1991,
          "title": "Guerre froide",
          "subtitle": "Rivalité nucléaire et guerres réelles",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "Cold_War",
          "summary": "États-Unis et Union soviétique se disputent le monde à partir de 1947, mais la rivalité nucléaire n’exclut pas les guerres réelles — Corée (1950-1953), Vietnam (1955-1975) —, les interventions par procuration ni les dictatures soutenues. Un réseau mondial de bases et d’alliances soutient la projection de puissance américaine. La course aux armements et la rivalité idéologique structurent quatre décennies.",
          "related": [
            "us-apollo",
            "us-hiroshima"
          ],
          "sources": [
            "SRC-009"
          ]
        },
        {
          "id": "us-civil-rights",
          "year": 1964,
          "title": "Civil Rights Act",
          "subtitle": "Fin de la ségrégation dans les lieux publics et l’emploi",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "grok": "Civil_Rights_Act_of_1964",
          "summary": "La loi de 1964 interdit la discrimination fondée sur la race, la couleur, la religion, le sexe ou l’origine dans les lieux publics, l’emploi et les programmes fédéraux. Elle ne met pas fin à la ségrégation de fait dans le logement, les écoles ni aux violences policières, et le Voting Rights Act de 1965 reste nécessaire pour garantir le vote. La loi couronne des années de mobilisation, mais son application rencontre une résistance durable.",
          "related": [
            "us-13e"
          ],
          "sources": [
            "SRC-004",
            "SRC-005"
          ]
        },
        {
          "id": "us-apollo",
          "year": 1969,
          "title": "Apollo 11",
          "subtitle": "L’homme marche sur la Lune",
          "tags": [
            "sciences",
            "exploration"
          ],
          "importance": 3,
          "grok": "Apollo_11",
          "summary": "Neil Armstrong et Buzz Aldrin se posent sur la Lune. La mission symbolise la course spatiale et la supériorité technologique américaine.",
          "related": [
            "us-cold-war"
          ]
        },
        {
          "id": "us-911",
          "year": 2001,
          "title": "11-Septembre",
          "subtitle": "Le monde entre dans la guerre contre le terrorisme",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "grok": "September_11_attacks",
          "summary": "Des attentats islamistes détruisent les tours jumelles à New York. Les États-Unis lancent une « guerre contre le terrorisme » qui redessine la géopolitique mondiale.",
          "related": [
            "us-civil-rights"
          ]
        },
        {
          "id": "us-2008",
          "year": 2008,
          "title": "Crise de 2008",
          "subtitle": "Effondrement financier mondial",
          "tags": [
            "economie"
          ],
          "importance": 2,
          "grok": "2007–2008_financial_crisis",
          "summary": "La faillite de Lehman Brothers déclenche une crise financière mondiale. Les États interviennent massivement pour sauver le système bancaire.",
          "related": [
            "us-crash"
          ]
        }
      ]
    },
    {
      "id": "germany",
      "name": "Allemagne",
      "articleName": "l'Histoire de l'Allemagne",
      "flag": "🇩🇪",
      "color": "#e3c266",
      "domain": [
        962,
        2026
      ],
      "tagline": "Du Saint-Empire à la réunification",
      "featuredIds": [
        "de-luther",
        "de-unification",
        "de-hitler",
        "de-ww2",
        "de-mur",
        "de-1990"
      ],
      "intro": "Mille ans d’un espace politique morcelé, traversé par la Réforme, les guerres mondiales et la division Est-Ouest.",
      "eras": [
        {
          "name": "Reich médiéval",
          "start": 962,
          "end": 1517,
          "color": "#8a6fb2"
        },
        {
          "name": "Réforme & guerres",
          "start": 1517,
          "end": 1815,
          "color": "#c2855c"
        },
        {
          "name": "Unification",
          "start": 1815,
          "end": 1914,
          "color": "#c7a257"
        },
        {
          "name": "Guerres & divisions",
          "start": 1914,
          "end": 1945,
          "color": "#b35e5e"
        },
        {
          "name": "Occupation et deux Allemagnes",
          "start": 1945,
          "end": 1990,
          "color": "#6f7fd0"
        },
        {
          "name": "Allemagne réunifiée",
          "start": 1990,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "de-otto",
          "year": 962,
          "title": "Otton Ier couronné empereur",
          "subtitle": "Un Empire composite, non un État allemand",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Otto_the_Great",
          "summary": "Le 2 février 962, Otton Ier est couronné empereur à Rome. Sa royauté repose sur un consensus princier et épiscopal ; l’Empire est composite et réunit, au fil des siècles, des composantes germaniques, italiennes et bourguignonnes. Les titulatures « saint », « romain » et « de la nation allemande » ne se fixent que bien plus tard.",
          "related": [
            "de-luther"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "de-luther",
          "year": 1517,
          "title": "Luther",
          "subtitle": "Une controverse théologique devient une rupture européenne",
          "tags": [
            "religion",
            "societe"
          ],
          "importance": 3,
          "grok": "Martin_Luther",
          "summary": "Le 31 octobre 1517, Luther adresse ses thèses sur les indulgences à l’archevêque de Mayence et à l’évêque de Brandebourg. Leur diffusion imprimée ouvre une controverse qui devient la Réforme. L’affichage à la porte de la Schlosskirche de Wittenberg est une tradition tardive, non attestée par un témoin oculaire.",
          "related": [
            "de-30ans",
            "de-otto"
          ],
          "sources": [
            "SRC-002",
            "SRC-016"
          ]
        },
        {
          "id": "de-30ans",
          "year": 1618,
          "endYear": 1648,
          "title": "Guerre de Trente Ans",
          "subtitle": "Une guerre européenne dans l’Empire",
          "tags": [
            "guerre",
            "religion"
          ],
          "importance": 3,
          "grok": "Thirty_Years'_War",
          "summary": "La défenestration de Prague (1618) ouvre un conflit qui implique les Habsbourg, les princes allemands, le Danemark, la Suède et la France. Les populations de l’Empire subissent pillages, épidémies et famines. Les traités de Westphalie (1648) redéfinissent l’ordre impérial et européen.",
          "related": [
            "de-luther",
            "de-leipzig"
          ],
          "sources": [
            "SRC-003"
          ]
        },
        {
          "id": "de-leipzig",
          "year": 1813,
          "title": "Leipzig",
          "subtitle": "Napoléon battu en Allemagne",
          "tags": [
            "guerre"
          ],
          "importance": 2,
          "grok": "Battle_of_Leipzig",
          "summary": "La coalition prussienne, russe, autrichienne et suédoise écrase Napoléon à Leipzig. La défaite accélère la fin de l’Empire français et réveille les nationalismes allemands.",
          "related": [
            "de-30ans",
            "de-1848"
          ]
        },
        {
          "id": "de-1848",
          "year": 1848,
          "title": "Révolution de 1848",
          "subtitle": "Le rêve d’une nation libérale",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "German_revolutions_of_1848–1849",
          "summary": "Les révolutions de mars réclament liberté et unité nationale. Le Parlement de Francfort, élu au suffrage masculin, rédige une constitution et des droits fondamentaux ; les femmes en sont exclues, tandis que Louise Otto-Peters intervient publiquement sur la condition des ouvrières. La campagne militaire de 1849 met fin aux dernières insurrections et Frédéric-Guillaume IV refuse la couronne impériale.",
          "related": [
            "de-unification",
            "de-leipzig"
          ],
          "sources": [
            "SRC-004",
            "SRC-017"
          ]
        },
        {
          "id": "de-prop-001",
          "year": 1865,
          "title": "Fondation de l’ADF",
          "subtitle": "La première organisation nationale du mouvement féministe allemand",
          "tags": [
            "societe"
          ],
          "importance": 2,
          "summary": "En octobre 1865, une conférence réunit des femmes à Leipzig et fonde le 18 octobre l’Allgemeiner Deutscher Frauenverein (ADF). Louise Otto-Peters en devient présidente, avec Auguste Schmidt comme vice-présidente. Le programme porte sur l’éducation, l’accès aux métiers et à l’université, ainsi que le droit des femmes au travail.",
          "related": [
            "de-1848"
          ],
          "sources": [
            "SRC-017"
          ]
        },
        {
          "id": "de-unification",
          "year": 1871,
          "title": "Proclamation de l’Empire allemand",
          "subtitle": "Les princes allemands à Versailles",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "Unification_of_Germany",
          "summary": "Le 18 janvier 1871, les princes allemands proclament l’Empire allemand à Versailles, après la victoire sur la France. La proclamation couronne un processus diplomatique et militaire de plusieurs années, conduit par Bismarck et les princes allemands. L’Empire est une fédération de monarchies et de villes libres, dotée d’un Reichstag élu au suffrage masculin et d’un pouvoir impérial fort.",
          "related": [
            "de-ww1",
            "de-1848"
          ],
          "sources": [
            "SRC-004"
          ]
        },
        {
          "id": "de-prop-002",
          "year": 1904,
          "title": "Génocide des Herero et Nama",
          "subtitle": "La guerre coloniale du Sud-Ouest africain",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "summary": "Dans le Sud-Ouest africain allemand (aujourd’hui Namibie), les troupes du général Lothar von Trotha mènent une guerre d’extermination contre les Herero et les Nama. Les historiens estiment qu’environ 65 000 Herero et au moins 10 000 Nama ont été tués. En 2021, le gouvernement allemand reconnaît ces événements comme un génocide et annonce son intention de demander pardon, sans reconnaissance juridique de réparations.",
          "related": [],
          "sources": [
            "SRC-013",
            "SRC-020"
          ],
          "endYear": 1908
        },
        {
          "id": "de-ww1",
          "year": 1914,
          "endYear": 1918,
          "title": "Grande Guerre",
          "subtitle": "L’Empire s’effondre",
          "tags": [
            "guerre"
          ],
          "importance": 3,
          "grok": "World_War_I",
          "summary": "L’Allemagne combat sur deux fronts et subit le blocus allié. La défaite de 1918 provoque la chute de l’Empire et la révolution de novembre.",
          "related": [
            "de-weimar",
            "fr-ww1"
          ]
        },
        {
          "id": "de-weimar",
          "year": 1919,
          "title": "Weimar",
          "subtitle": "Proclamation et constitution",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "Weimar_Republic",
          "summary": "La République est proclamée le 9 novembre 1918, dans une Allemagne vaincue, après l’annonce de l’abdication de Guillaume II. L’Assemblée nationale de Weimar adopte la Constitution le 11 août 1919, dans un pays marqué par la défaite, les réparations et le traité de Versailles. Crises économiques et violences politiques minent la légitimité du régime.",
          "related": [
            "de-inflation",
            "de-hitler",
            "fr-versailles"
          ],
          "sources": [
            "SRC-006"
          ]
        },
        {
          "id": "de-inflation",
          "year": 1923,
          "title": "Hyperinflation",
          "subtitle": "La monnaie s’effondre",
          "tags": [
            "economie",
            "politique"
          ],
          "importance": 2,
          "grok": "Hyperinflation_in_the_Weimar_Republic",
          "summary": "L’hyperinflation résulte de causes fiscales, monétaires et politiques : déficits publics, création monétaire et charge des réparations. L’occupation de la Ruhr en janvier 1923 est un déclencheur majeur, non la cause unique. Le mark s’effondre, l’épargne est anéantie et la stabilisation monétaire de novembre 1923 rétablit la monnaie au prix d’une crise sociale et politique.",
          "related": [
            "de-weimar",
            "de-hitler"
          ],
          "sources": [
            "SRC-006"
          ]
        },
        {
          "id": "de-hitler",
          "year": 1933,
          "title": "Hitler au pouvoir",
          "subtitle": "La démocratie cède à la dictature",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Adolf_Hitler",
          "summary": "Hitler devient chancelier et impose rapidement un régime nazi totalitaire. Les opposants sont réprimés, les Juifs persécutés et la guerre préparée.",
          "related": [
            "de-ww2",
            "de-wannsee",
            "de-weimar"
          ]
        },
        {
          "id": "de-ww2",
          "year": 1939,
          "endYear": 1945,
          "title": "Seconde Guerre mondiale",
          "subtitle": "Guerre totale et génocide",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "grok": "World_War_II",
          "summary": "L’Allemagne nazie déclenche la guerre et organise l’extermination des Juifs d’Europe ; environ six millions sont assassinés. Le régime persécute et tue aussi les Sinti et Roma, les personnes handicapées et les prisonniers soviétiques, tandis que la guerre totale dévaste l’Europe. La défaite de 1945 laisse un pays occupé, divisé et confronté à la Shoah.",
          "related": [
            "de-wannsee",
            "de-nuremberg",
            "fr-ww2"
          ],
          "sources": [
            "SRC-007",
            "SRC-018"
          ]
        },
        {
          "id": "de-prop-003",
          "year": 1939,
          "title": "Travail forcé dans le Reich nazi",
          "subtitle": "Douze millions de travailleurs déportés",
          "tags": [
            "economie",
            "guerre",
            "societe"
          ],
          "importance": 3,
          "summary": "À partir de 1939, le régime nazi déporte vers le Reich des millions de civils, de prisonniers de guerre et de détenus de camps. Les estimations retiennent plus de 12 millions de personnes, avec un pic de 7,8 millions en août 1944. Les travailleurs polonais et soviétiques sont soumis à une ségrégation et à une violence spécifiques ; des entreprises allemandes en profitent.",
          "related": [
            "de-ww2"
          ],
          "sources": [
            "SRC-008",
            "SRC-009"
          ],
          "endYear": 1945
        },
        {
          "id": "de-wannsee",
          "year": 1942,
          "title": "Wannsee",
          "subtitle": "Coordonner un génocide déjà engagé",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "grok": "Wannsee_Conference",
          "summary": "Le 20 janvier 1942, des hauts responsables nazis se réunissent à Wannsee sous la présidence de Reinhard Heydrich. La conférence ne décide pas le génocide, déjà engagé après l’invasion de l’URSS ; elle coordonne l’administration de la « solution finale » et organise la déportation des Juifs d’Europe. Le protocole rédigé par Adolf Eichmann documente cette planification bureaucratique.",
          "related": [
            "de-ww2",
            "de-hitler"
          ],
          "sources": [
            "SRC-007"
          ]
        },
        {
          "id": "de-prop-004",
          "year": 1944,
          "title": "Liquidation du camp des familles rom à Auschwitz-Birkenau",
          "subtitle": "Le Porajmos et sa mémoire",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "summary": "Dans la nuit du 2 au 3 août 1944, la SS assassine environ 4 300 Sinti et Roma du « camp des familles » d’Auschwitz-Birkenau. Environ 21 000 des 23 000 Sinti et Roma déportés à Auschwitz y sont morts. Les estimations du génocide européen varient de 250 000 à 500 000 victimes ; la date est devenue le jour européen de commémoration du Porajmos.",
          "related": [
            "de-ww2",
            "de-wannsee"
          ],
          "sources": [
            "SRC-018"
          ]
        },
        {
          "id": "de-nuremberg",
          "year": 1945,
          "title": "Nuremberg",
          "subtitle": "Juger les responsables nazis",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "Nuremberg_trials",
          "summary": "Les procès de Nuremberg jugent les dirigeants nazis pour crimes de guerre et crimes contre l’humanité. Ils fondent une partie du droit pénal international.",
          "related": [
            "de-ww2"
          ]
        },
        {
          "id": "de-rfa",
          "year": 1949,
          "title": "RFA & RDA",
          "subtitle": "Deux États, deux blocs",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "West_Germany",
          "summary": "La République fédérale d’Allemagne est fondée le 23 mai 1949 dans les zones d’occupation occidentales ; la République démocratique allemande est proclamée le 7 octobre 1949 dans la zone soviétique. La Sarre reste séparée de la RFA jusqu’à son rattachement en 1957. Les deux États s’inscrivent dans les blocs opposés de la Guerre froide.",
          "related": [
            "de-mur",
            "de-1990"
          ],
          "sources": [
            "SRC-010"
          ]
        },
        {
          "id": "de-mur",
          "year": 1961,
          "title": "Mur de Berlin",
          "subtitle": "La ville coupée en deux",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Berlin_Wall",
          "summary": "La RDA érige un mur pour empêcher la fuite de ses habitants vers l’Ouest. Le Mur devient le symbole le plus visible de la Guerre froide.",
          "related": [
            "de-1989",
            "de-rfa"
          ]
        },
        {
          "id": "de-1989",
          "year": 1989,
          "title": "Chute du Mur",
          "subtitle": "La fin de la Guerre froide",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Fall_of_the_Berlin_Wall",
          "summary": "Le 9 octobre 1989, environ 70 000 personnes manifestent à Leipzig après les prières pour la paix. Le 9 novembre, lors d’une conférence de presse, Günter Schabowski annonce une nouvelle réglementation des voyages ; des milliers de personnes se pressent aux postes-frontières et les gardes ouvrent les barrières. Le Mur de Berlin tombe, mais cette ouverture ne résulte pas d’une décision planifiée.",
          "related": [
            "de-1990",
            "de-mur"
          ],
          "sources": [
            "SRC-012"
          ]
        },
        {
          "id": "de-1990",
          "year": 1990,
          "title": "Réunification",
          "subtitle": "L’accession des Länder de la RDA",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "German_reunification",
          "summary": "Après les élections libres du 18 mars 1990, les Länder de la RDA rejoignent la RFA le 3 octobre 1990 en vertu de l’article 23 de la Loi fondamentale. Il s’agit d’une accession, non d’une fusion de deux États égaux. La réunification pose de nouveaux défis économiques et sociaux.",
          "related": [
            "de-1989",
            "de-rfa"
          ],
          "sources": [
            "SRC-012"
          ]
        }
      ]
    },
    {
      "id": "italy",
      "name": "Italie",
      "articleName": "l'Histoire de l'Italie",
      "flag": "🇮🇹",
      "color": "#9bc97a",
      "domain": [
        -753,
        2026
      ],
      "tagline": "De Rome au Risorgimento",
      "featuredIds": [
        "it-empire",
        "it-medicis",
        "it-unification",
        "it-ww2",
        "it-rome-traite"
      ],
      "intro": "De la fondation légendaire de Rome aux institutions européennes, l’Italie est un laboratoire politique et artistique de l’Occident.",
      "eras": [
        {
          "name": "Rome antique et Italie romaine",
          "start": -753,
          "end": 476,
          "color": "#6f7fd0"
        },
        {
          "name": "Moyen Âge & Renaissance",
          "start": 476,
          "end": 1494,
          "color": "#8a6fb2"
        },
        {
          "name": "Guerres & Risorgimento",
          "start": 1494,
          "end": 1871,
          "color": "#c2855c"
        },
        {
          "name": "Italie libérale et fasciste (1871-1945)",
          "start": 1871,
          "end": 1945,
          "color": "#b35e5e"
        },
        {
          "name": "République",
          "start": 1945,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "it-rome",
          "year": -753,
          "title": "Fondation de Rome",
          "subtitle": "La légende de Romulus",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "Founding_of_Rome",
          "summary": "La tradition fixe en 753 av. J.-C. la fondation de Rome par Romulus. La cité devient le cœur d’un immense empire.",
          "related": [
            "it-rep-romaine"
          ]
        },
        {
          "id": "it-rep-romaine",
          "year": -509,
          "title": "République romaine",
          "subtitle": "Le Sénat et le peuple",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Roman_Republic",
          "summary": "La monarchie est renversée et Rome se dote d’institutions républicaines. Sénat, consulats et assemblées structurent la vie politique romaine.",
          "related": [
            "it-empire",
            "it-rome"
          ]
        },
        {
          "id": "it-empire",
          "year": -27,
          "title": "Empire romain",
          "subtitle": "Auguste seul au pouvoir",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Roman_Empire",
          "summary": "Octave reçoit le titre d’Auguste et concentre les pouvoirs. L’Empire romain domine la Méditerranée pendant des siècles.",
          "related": [
            "it-476"
          ]
        },
        {
          "id": "it-476",
          "year": 476,
          "title": "Chute de Rome",
          "subtitle": "Une césure conventionnelle",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "Fall_of_the_Western_Roman_Empire",
          "summary": "En 476, Odoacre dépose Romulus Augustulus, dernier empereur d'Occident, et renvoie les insignes impériaux à Constantinople. La date est une convention historiographique: l'Empire d'Orient subsiste et les dominations ostrogothe, byzantine puis lombarde assurent la continuité des institutions et des sociétés italiennes.",
          "related": [
            "it-medicis",
            "it-empire"
          ],
          "sources": [
            "SRC-003"
          ]
        },
        {
          "id": "it-prop-005",
          "year": 1377,
          "title": "Catherine de Sienne",
          "subtitle": "Une femme entre papauté et politique",
          "tags": [
            "religion",
            "politique",
            "societe"
          ],
          "importance": 2,
          "summary": "Tertiaire dominicaine, Catherine de Sienne (1347-1380) intervient par ses lettres et ses réseaux dans la politique des cités toscanes et de l'Église. Elle joue un rôle dans le retour de Grégoire XI d'Avignon à Rome en 1377, avant de mourir en 1380. Son autorité, exercée hors des institutions sacerdotales, montre les marges d'action des femmes religieuses.",
          "related": [],
          "sources": [
            "SRC-005"
          ],
          "endYear": 1380
        },
        {
          "id": "it-prop-004",
          "year": 1378,
          "title": "Révolte des Ciompi",
          "subtitle": "Les ouvriers de la laine à Florence",
          "tags": [
            "politique",
            "economie",
            "societe"
          ],
          "importance": 2,
          "summary": "En juillet 1378, les ouvriers non qualifiés de la laine, les Ciompi, se soulèvent à Florence et obtiennent la création de trois arts populaires. Leur pouvoir est bref: la révolte est réprimée et les conquêtes annulées. L'épisode reste un cas majeur de conflit du travail dans l'Europe médiévale.",
          "related": [
            "it-medicis"
          ],
          "sources": [
            "SRC-004"
          ]
        },
        {
          "id": "it-medicis",
          "year": 1434,
          "title": "Cosme de Médicis à Florence",
          "subtitle": "Banque, pouvoir et mécénat",
          "tags": [
            "politique",
            "economie",
            "arts"
          ],
          "importance": 2,
          "grok": "Cosimo_de'_Medici",
          "summary": "En 1434, Cosme de Médicis rentre d'exil et consolide à Florence un pouvoir fondé sur la banque, les réseaux de clientèle et le contrôle des institutions. Son mécénat accompagne cette domination politique et ne résume pas la Renaissance, qui se développe dans plusieurs cours et cités italiennes.",
          "related": [
            "it-guerres"
          ],
          "sources": [
            "SRC-004"
          ]
        },
        {
          "id": "it-guerres",
          "year": 1494,
          "endYear": 1559,
          "title": "Guerres d'Italie",
          "subtitle": "L'Italie, champ de bataille européen",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 2,
          "grok": "Italian_Wars",
          "summary": "De 1494 à 1559, Charles VIII, Louis XII et François Ier interviennent en Italie, tandis que Charles Quint et les papes disputent Naples, Milan et Florence. La paix de Cateau-Cambrésis, en 1559, consacre la prépondérance espagnole dans la péninsule. Les guerres révèlent la richesse culturelle des cités italiennes autant que la fragilité de leurs États.",
          "related": [
            "it-medicis",
            "it-unification"
          ],
          "sources": [
            "SRC-004"
          ]
        },
        {
          "id": "it-prop-009",
          "year": 1861,
          "title": "Brigandage post-unitaire",
          "subtitle": "La répression dans le Mezzogiorno",
          "tags": [
            "guerre",
            "politique",
            "societe"
          ],
          "importance": 3,
          "summary": "Après l'unification, des bandes armées et des révoltes paysannes se multiplient dans le Mezzogiorno; l'armée italienne répond par une répression massive, des exécutions et des déportations. Le « brigandage » devient un stéréotype national opposant un Nord moderne à un Sud arriéré. Cette violence de 1861-1865 pèse durablement sur la mémoire de l'Unité.",
          "related": [
            "it-unification"
          ],
          "sources": [
            "SRC-010"
          ],
          "endYear": 1865
        },
        {
          "id": "it-unification",
          "year": 1861,
          "title": "Unification italienne",
          "subtitle": "Une unité inachevée, 1861-1870",
          "tags": [
            "politique",
            "guerre",
            "societe"
          ],
          "importance": 3,
          "grok": "Unification_of_Italy",
          "summary": "En 1861, Victor-Emmanuel II est proclamé roi d'Italie après les campagnes de Garibaldi et la diplomatie de Cavour, au terme de plébiscites et de combats de volontaires. L'unité reste incomplète: la Vénétie est annexée en 1866 et Rome en 1870. Dans le Mezzogiorno, l'annexion s'accompagne d'une répression du brigandage et de violences qui pèsent durablement sur la mémoire de l'Unité.",
          "related": [
            "it-rome-capitale",
            "it-guerres"
          ],
          "endYear": 1870,
          "sources": [
            "SRC-009",
            "SRC-010"
          ]
        },
        {
          "id": "it-rome-capitale",
          "year": 1870,
          "title": "Rome capitale",
          "subtitle": "La prise de Rome et la question romaine",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 2,
          "grok": "Capture_of_Rome",
          "summary": "Le 20 septembre 1870, les troupes italiennes entrent dans Rome après la défaite française à Sedan; la capitale est transférée de Florence à Rome en 1871. La fin de l'État pontifical ne règle pas la question romaine, réglée seulement par les accords du Latran de 1929. Le pape refuse alors de reconnaître le royaume et se déclare prisonnier au Vatican.",
          "related": [
            "it-unification"
          ],
          "sources": [
            "SRC-009"
          ]
        },
        {
          "id": "it-ww1",
          "year": 1915,
          "title": "Entrée en guerre",
          "subtitle": "L’Italie rejoint les Alliés",
          "tags": [
            "guerre"
          ],
          "importance": 2,
          "grok": "Military_history_of_Italy_during_World_War_I",
          "summary": "L’Italie quitte la Triple-Alliance et rejoint l’Entente en 1915. La guerre coûte cher et nourrit la crise politique d’après-guerre.",
          "related": [
            "it-mussolini"
          ]
        },
        {
          "id": "it-mussolini",
          "year": 1922,
          "title": "Marche sur Rome",
          "subtitle": "La nomination royale et la construction de la dictature",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "March_on_Rome",
          "summary": "Du 27 au 29 octobre 1922, les chemises noires convergent vers Rome; le 30, Victor-Emmanuel III nomme Mussolini président du Conseil sans que l'armée intervienne. La violence squadriste et la loi Acerbo de 1923 consolident le pouvoir; après le meurtre de Matteotti et la sécession de l'Aventin en 1924, les lois fascistissimes de 1925-1926 achèvent la suppression des libertés politiques.",
          "related": [
            "it-ww2",
            "it-ww1"
          ],
          "sources": [
            "SRC-012",
            "SRC-013"
          ]
        },
        {
          "id": "it-ww2",
          "year": 1940,
          "endYear": 1945,
          "title": "Seconde Guerre mondiale",
          "subtitle": "De l'entrée en guerre à la Libération",
          "tags": [
            "guerre",
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "World_War_II",
          "summary": "L'Italie entre en guerre le 10 juin 1940 aux côtés de l'Allemagne. Après l'armistice du 8 septembre 1943, l'occupation allemande et la République sociale italienne ouvrent une guerre civile et une Résistance armée, jusqu'à la Libération du 25 avril 1945.",
          "related": [
            "it-republique",
            "it-mussolini",
            "de-ww2"
          ],
          "sources": [
            "SRC-014",
            "SRC-015"
          ]
        },
        {
          "id": "it-republique",
          "year": 1946,
          "title": "République",
          "subtitle": "Référendum, Constituante et Constitution",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "1946_Italian_institutional_referendum",
          "summary": "Le 2 juin 1946, les électeurs abolissent la monarchie par référendum et élisent une Assemblée constituante; les femmes votent pour la première fois lors d'élections nationales. La Constitution est promulguée le 27 décembre 1947 et entre en vigueur le 1er janvier 1948. La République naît ainsi d'un double vote, avant que ses institutions ne soient pleinement établies.",
          "related": [
            "it-ww2",
            "it-rome-traite"
          ],
          "sources": [
            "SRC-015"
          ]
        },
        {
          "id": "it-rome-traite",
          "year": 1957,
          "title": "Traité de Rome",
          "subtitle": "Signature en 1957, entrée en vigueur en 1958",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 3,
          "grok": "Treaty_of_Rome",
          "summary": "Le 25 mars 1957, six États signent à Rome les traités instituant la Communauté économique européenne et Euratom, après une négociation marquée par le rapport Spaak, Jean Monnet et Konrad Adenauer. La CEE entre en vigueur le 1er janvier 1958 et s'inscrit aux côtés de l'OECE et de l'OTAN dans le bloc occidental. L'Italie, engagée de longue date dans la construction européenne avec De Gasperi, figure parmi les membres fondateurs.",
          "related": [
            "it-republique",
            "it-euro"
          ],
          "sources": [
            "SRC-015"
          ]
        },
        {
          "id": "it-prop-017",
          "year": 1963,
          "title": "Catastrophe du Vajont",
          "subtitle": "La montagne, le barrage et l'État",
          "tags": [
            "sciences",
            "societe",
            "economie"
          ],
          "importance": 3,
          "summary": "Le 9 octobre 1963, une masse rocheuse se détache du mont Toc et s'abat dans le lac artificiel du Vajont. L'onde submerge Longarone et plusieurs villages, faisant 1 917 victimes selon les chiffres officiels. Le désastre, précédé d'avertissements ignorés, devient un symbole des risques industriels et de la responsabilité publique.",
          "related": [],
          "sources": [
            "SRC-019"
          ]
        },
        {
          "id": "it-tangentopoli",
          "year": 1992,
          "title": "Tangentopoli",
          "subtitle": "La corruption révélée",
          "tags": [
            "politique"
          ],
          "importance": 1,
          "grok": "Mani_pulite",
          "summary": "L’opération Mani pulite révèle un vaste système de corruption politique. Elle provoque l’effondrement des partis traditionnels italiens.",
          "related": [
            "it-euro"
          ]
        },
        {
          "id": "it-euro",
          "year": 2002,
          "title": "L’euro",
          "subtitle": "Monnaie unique en circulation",
          "tags": [
            "economie"
          ],
          "importance": 1,
          "grok": "Euro",
          "summary": "L’Italie abandonne la lire pour l’euro. La monnaie unique s’inscrit dans l’approfondissement de l’intégration européenne.",
          "related": [
            "it-rome-traite"
          ]
        }
      ]
    },
    {
      "id": "spain",
      "name": "Espagne",
      "articleName": "l'Histoire de l'Espagne",
      "flag": "🇪🇸",
      "color": "#e6a35e",
      "domain": [
        711,
        2026
      ],
      "tagline": "D’Al-Andalus à la démocratie",
      "featuredIds": [
        "es-711",
        "es-grenade",
        "es-colomb",
        "es-civile",
        "es-franco",
        "es-constitution"
      ],
      "intro": "Huit siècles de coexistence et de conflits entre mondes chrétien, juif et musulman, puis la construction d’un empire et d’une démocratie.",
      "eras": [
        {
          "name": "Al-Andalus et royaumes chrétiens",
          "start": 711,
          "end": 1492,
          "color": "#8a6fb2"
        },
        {
          "name": "Empire espagnol",
          "start": 1492,
          "end": 1808,
          "color": "#c7a257"
        },
        {
          "name": "Révolution libérale et nation en crise",
          "start": 1808,
          "end": 1936,
          "color": "#c2855c"
        },
        {
          "name": "Guerre civile & franquisme",
          "start": 1936,
          "end": 1975,
          "color": "#b35e5e"
        },
        {
          "name": "Démocratie",
          "start": 1975,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "es-711",
          "year": 711,
          "title": "Conquête musulmane",
          "subtitle": "Guadalete et la conquête progressive",
          "tags": [
            "guerre",
            "religion"
          ],
          "importance": 3,
          "grok": "Al-Andalus",
          "summary": "En juillet 711, une armée arabo-berbère venue du Maghreb bat le roi wisigoth Rodéric à la bataille de Guadalete. La conquête ne se réduit pas à ce combat : elle progresse par accords, capitulations et installations militaires pendant des décennies, jusqu'à couvrir l'essentiel de la péninsule. Elle met fin au royaume wisigoth et ouvre la période d'al-Andalus.",
          "related": [
            "es-covadonga"
          ],
          "sources": [
            "SRC-001",
            "SRC-003"
          ]
        },
        {
          "id": "es-covadonga",
          "year": 722,
          "title": "Covadonga",
          "subtitle": "Vers 722, selon une tradition tardive",
          "tags": [
            "guerre",
            "religion"
          ],
          "importance": 2,
          "grok": "Battle_of_Covadonga",
          "summary": "Vers 722, selon une tradition tardive, une victoire chrétienne dans les montagnes asturiennes est attribuée à Pelage et à ses partisans. L'épisode, connu par des récits postérieurs, fonde le royaume des Asturies dans la mémoire médiévale. Son rôle de « début de la Reconquista » relève d'une construction historiographique, non d'un fait contemporain.",
          "related": [
            "es-grenade",
            "es-711"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "es-mariage",
          "year": 1469,
          "title": "Isabelle & Ferdinand",
          "subtitle": "Valladolid, 1469 : deux couronnes distinctes",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 2,
          "grok": "Catholic_Monarchs_of_Spain",
          "summary": "Le 19 octobre 1469, Isabelle de Castille épouse Ferdinand d'Aragon à Valladolid. Les deux couronnes restent distinctes, avec leurs institutions, leurs lois et leurs finances ; le mariage ne réalise pas l'unification politique de l'Espagne. Leurs règnes sont marqués par la création de l'Inquisition en 1478 et par la conquête de Grenade en 1492.",
          "related": [
            "es-grenade",
            "es-colomb"
          ],
          "sources": [
            "SRC-008",
            "SRC-005"
          ]
        },
        {
          "id": "es-colomb",
          "year": 1492,
          "title": "Colomb",
          "subtitle": "Guanahani, 12 octobre 1492",
          "tags": [
            "exploration",
            "societe"
          ],
          "importance": 3,
          "grok": "Christopher_Columbus",
          "summary": "Le 12 octobre 1492, Colomb atteint Guanahani, dans l'archipel des Bahamas, puis les Grandes Antilles. Les Taïnos qu'il rencontre subissent rapidement la domination des colons, les maladies et les déplacements forcés ; l'expédition ouvre la colonisation européenne des Amériques. Colomb, convaincu d'atteindre l'Asie, meurt sans avoir compris qu'il avait abordé un autre continent.",
          "related": [
            "es-grenade",
            "es-mariage"
          ],
          "sources": [
            "SRC-008"
          ]
        },
        {
          "id": "es-prop-001",
          "year": 1492,
          "title": "Expulsion des Juifs",
          "subtitle": "Le décret de l'Alhambra, 31 mars 1492",
          "tags": [
            "religion",
            "societe",
            "politique"
          ],
          "importance": 3,
          "summary": "Le 31 mars 1492, les Rois catholiques signent à Grenade le décret d'expulsion des Juifs de leurs royaumes, qui doit prendre effet avant la fin du mois de juillet. Des dizaines de milliers de personnes partent, se convertissent ou périssent en route ; les estimations varient fortement. La diaspora séfarade qui en résulte s'installe en Méditerranée, aux Pays-Bas et plus tard dans les Amériques.",
          "related": [
            "es-grenade",
            "es-colomb"
          ],
          "sources": [
            "SRC-005",
            "SRC-008"
          ]
        },
        {
          "id": "es-grenade",
          "year": 1492,
          "title": "Grenade",
          "subtitle": "2 janvier 1492 : la capitulation nasride",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 3,
          "grok": "the_conquest_of_granada",
          "summary": "Le 2 janvier 1492, le royaume nasride de Grenade capitule devant les Rois catholiques, mettant fin au dernier État musulman de la péninsule. La reddition ouvre une politique de confessionnalisation, avec le décret d'expulsion des Juifs le 31 mars et la conversion forcée des musulmans de Castille en 1502. L'arrivée de Colomb aux Caraïbes, le 12 octobre, relève d'un autre événement de la même année.",
          "related": [
            "es-colomb",
            "es-covadonga"
          ],
          "sources": [
            "SRC-005",
            "SRC-008"
          ]
        },
        {
          "id": "es-armada",
          "year": 1588,
          "title": "Armada",
          "subtitle": "L'expédition de 1588 et son échec",
          "tags": [
            "guerre"
          ],
          "importance": 2,
          "grok": "Spanish_Armada",
          "summary": "En 1588, Philippe II lance une grande expédition navale contre l'Angleterre, destinée à débarquer une armée venue des Flandres. La flotte est malmenée par les combats, les tempêtes et les difficultés logistiques, et l'opération échoue. Cet échec n'arrête pas la puissance maritime espagnole, qui reste active dans l'Atlantique et en Méditerranée pendant des décennies.",
          "related": [
            "es-1898"
          ],
          "sources": [
            "SRC-008"
          ]
        },
        {
          "id": "es-prop-002",
          "year": 1749,
          "title": "Grande Rafle des Roms",
          "subtitle": "La prison générale de 1749",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 2,
          "summary": "Le 30 juillet 1749, une opération générale ordonnée sous Ferdinand VI arrête des milliers de Roms à travers l'Espagne. Hommes, femmes et enfants sont envoyés dans des prisons et des arsenaux, et l'épisode devient central dans l'histoire de l'antitsiganisme espagnol. Les estimations du nombre de personnes arrêtées varient fortement selon les sources.",
          "related": [],
          "sources": [
            "SRC-007"
          ]
        },
        {
          "id": "es-independance",
          "year": 1808,
          "endYear": 1814,
          "title": "Guerre d’indépendance",
          "subtitle": "Guerre, guérilla et révolution libérale",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 2,
          "grok": "Peninsular_War",
          "summary": "L'invasion napoléonienne de 1808 provoque un soulèvement général, une guérilla longue et une crise de la monarchie. Les Cortès de Cadix adoptent la Constitution de 1812 tandis que les afrancesados soutiennent le régime de Joseph Bonaparte. La guerre affaiblit durablement la monarchie espagnole et ouvre la crise des empires américains.",
          "related": [
            "es-1898"
          ],
          "sources": [
            "SRC-011"
          ]
        },
        {
          "id": "es-1898",
          "year": 1898,
          "title": "Désastre de 1898",
          "subtitle": "Cuba, Porto Rico, Philippines et Guam",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 2,
          "grok": "Spanish–American_War",
          "summary": "La défaite face aux États-Unis en 1898 coûte à l'Espagne Cuba, Porto Rico, les Philippines et Guam. L'Espagne conserve le Río de Oro et la Guinée équatoriale, puis établit un protectorat au Maroc en 1912 : 1898 ne marque donc pas la fin de l'empire. Le mot « Désastre », employé en Espagne, désigne une crise nationale autant qu'une défaite militaire.",
          "related": [
            "es-civile",
            "es-armada"
          ],
          "sources": [
            "SRC-010",
            "SRC-009"
          ]
        },
        {
          "id": "es-prop-003",
          "year": 1931,
          "title": "Suffrage féminin",
          "subtitle": "Clara Campoamor et le vote du 1er octobre 1931",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "summary": "Le 1er octobre 1931, les Cortès constituantes adoptent le droit de vote des femmes après un débat tendu. Clara Campoamor, députée radicale, défend le texte face à une partie de la gauche qui craint le poids des femmes catholiques. Le suffrage est exercé pour la première fois aux élections de 1933.",
          "related": [
            "es-civile"
          ],
          "sources": [
            "SRC-013",
            "SRC-011"
          ]
        },
        {
          "id": "es-civile",
          "year": 1936,
          "endYear": 1939,
          "title": "Guerre civile",
          "subtitle": "17 juillet 1936 – 1er avril 1939",
          "tags": [
            "guerre",
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Spanish_Civil_War",
          "summary": "Le 17 juillet 1936, un soulèvement militaire contre la République échoue partiellement et débouche sur une guerre de près de trois ans, jusqu'à la victoire de Franco le 1er avril 1939. L'Allemagne et l'Italie soutiennent les nationalistes, tandis que l'URSS et les Brigades internationales aident la République. Les deux camps mènent une répression violente, qui touche aussi les femmes et les populations civiles.",
          "related": [
            "es-franco",
            "es-constitution"
          ],
          "sources": [
            "SRC-013",
            "SRC-014"
          ]
        },
        {
          "id": "es-franco",
          "year": 1939,
          "endYear": 1975,
          "title": "Franquisme",
          "subtitle": "1939-1975 : trente-six ans de dictature",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 3,
          "grok": "Francisco_Franco",
          "summary": "De 1939 à 1975, Franco gouverne un régime autoritaire fondé sur l'armée, l'Église et le parti unique, qui réprime les opposants et emprisonne des milliers de personnes. Après l'autarcie des années 1940, l'entrée à l'ONU en 1955 et le Plan de stabilisation de 1959 accompagnent une croissance rapide, financée aussi par l'émigration et le tourisme. Ce développement s'accompagne de répression, d'inégalités et de migrations massives.",
          "related": [
            "es-constitution",
            "es-civile"
          ],
          "sources": [
            "SRC-014",
            "SRC-011"
          ]
        },
        {
          "id": "es-constitution",
          "year": 1978,
          "title": "Constitution",
          "subtitle": "6 décembre 1978 : référendum et État des autonomies",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Constitution_of_Spain",
          "summary": "Le 6 décembre 1978, une Constitution démocratique est approuvée par référendum et organise une monarchie parlementaire et l'État des autonomies. Elle s'inscrit dans une transition négociée, marquée par la loi d'amnistie de 1977 et les pactes de la Moncloa sur la crise économique. La tentative de coup d'État du 23 février 1981 éprouve le régime sans l'interrompre.",
          "related": [
            "es-franco",
            "es-cee"
          ],
          "sources": [
            "SRC-015",
            "SRC-011"
          ]
        },
        {
          "id": "es-cee",
          "year": 1986,
          "title": "Entrée dans la CEE",
          "subtitle": "La CEE après l'OTAN",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 1,
          "grok": "1986_enlargement_of_the_European_Communities",
          "summary": "En 1986, l'Espagne adhère à la Communauté économique européenne, après son entrée à l'OTAN en 1982, confirmée par référendum en 1986. Les fonds structurels européens soutiennent des infrastructures et des régions en retard, tandis que l'ouverture expose l'industrie et l'agriculture à une concurrence nouvelle. L'intégration accélère la transformation économique sans en effacer les coûts sociaux.",
          "related": [
            "es-constitution"
          ],
          "sources": [
            "SRC-011"
          ]
        },
        {
          "id": "es-catalogne",
          "year": 2017,
          "title": "Catalogne",
          "subtitle": "Le référendum suspendu et ses suites",
          "tags": [
            "politique"
          ],
          "importance": 1,
          "grok": "2017_Catalan_independence_referendum",
          "summary": "Le 1er octobre 2017, la Catalogne organise malgré la suspension du Tribunal constitutionnel un référendum d'indépendance, dans un climat de forte tension et d'affrontements avec la police. Le Parlement catalan proclame l'indépendance le 27 octobre, sans reconnaissance internationale ; Madrid répond par l'article 155 et la convocation d'élections en décembre. La crise se poursuit depuis dans le cadre européen.",
          "related": [
            "es-constitution"
          ],
          "sources": [
            "SRC-018"
          ]
        },
        {
          "id": "es-prop-004",
          "year": 2022,
          "title": "Loi de mémoire démocratique",
          "subtitle": "Reconnaître les victimes du franquisme",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "summary": "La loi 20/2022, promulguée le 19 octobre 2022, renforce les politiques publiques de mémoire de la guerre civile et du franquisme. Elle reconnaît les victimes, prévoit des mesures sur le Valle de los Caídos et encadre les exhumations des fosses communes. Elle prolonge un débat ouvert sur l'amnistie de 1977 et la place de la mémoire dans la démocratie espagnole.",
          "related": [
            "es-franco",
            "es-constitution"
          ],
          "sources": [
            "SRC-020",
            "SRC-015"
          ]
        }
      ]
    },
    {
      "id": "china",
      "name": "Chine",
      "articleName": "l'Histoire de la Chine",
      "flag": "🇨🇳",
      "color": "#e3a65b",
      "domain": [
        -1600,
        2026
      ],
      "tagline": "Des dynasties à la puissance mondiale",
      "featuredIds": [
        "cn-qin",
        "cn-han",
        "cn-tang",
        "cn-song",
        "cn-ming",
        "cn-opium",
        "cn-1911",
        "cn-1949",
        "cn-deng"
      ],
      "intro": "Trois millénaires de dynasties, d’inventions et de révolutions, jusqu’à la Chine contemporaine.",
      "eras": [
        {
          "name": "Shang, Zhou et Royaumes combattants",
          "start": -1600,
          "end": -221,
          "color": "#8a6fb2"
        },
        {
          "name": "Empires et divisions",
          "start": -221,
          "end": 1912,
          "color": "#c7a257"
        },
        {
          "name": "République et révolutions",
          "start": 1912,
          "end": 1949,
          "color": "#c2855c"
        },
        {
          "name": "Chine populaire",
          "start": 1949,
          "end": 1978,
          "color": "#b35e5e"
        },
        {
          "name": "Réforme et puissance",
          "start": 1978,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "cn-shang",
          "year": -1600,
          "title": "Shang",
          "subtitle": "Anyang, os oraculaires et bronze",
          "tags": [
            "politique",
            "arts",
            "religion"
          ],
          "importance": 2,
          "grok": "Shang_dynasty",
          "summary": "Vers -1600, les Shang constituent la première dynastie chinoise dont l'écriture est abondamment attestée, mais la datation reste conventionnelle. Les inscriptions oraculaires d'Anyang, vers -1250, et les bronzes rituels documentent une royauté et un culte des ancêtres ; l'identification d'Erlitou à une capitale Xia ou Shang reste débattue.",
          "related": [
            "cn-zhou"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-zhou",
          "year": -1046,
          "title": "Zhou",
          "subtitle": "Muye, mandat du Ciel et Zhou orientaux",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 2,
          "grok": "Zhou_dynasty",
          "summary": "Vers -1046, les Zhou renversent les Shang à Muye et légitiment leur pouvoir par le mandat du Ciel. Après le sac de Hao en -771, les Zhou orientaux ne contrôlent plus qu'un domaine réduit, tandis que les principautés s'affrontent jusqu'aux Royaumes combattants.",
          "related": [
            "cn-qin"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-qin",
          "year": -221,
          "title": "Qin",
          "subtitle": "Unification, standardisation et murs reliés",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "Qin_dynasty",
          "summary": "En -221, Qin Shi Huang achève l'unification et impose une administration centralisée, l'écriture, la monnaie et les mesures standardisées, ainsi qu'un recensement et un réseau routier. Il relie et étend des murs défensifs antérieurs ; le régime, très coercitif, s'effondre en -206, peu après sa mort en -210.",
          "related": [
            "cn-han"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-han",
          "year": -206,
          "endYear": 220,
          "title": "Han",
          "subtitle": "Han occidentaux et orientaux, Route de la soie",
          "tags": [
            "economie",
            "exploration",
            "sciences"
          ],
          "importance": 3,
          "grok": "Han_dynasty",
          "summary": "Les Han occidentaux consolident l'empire ; les missions de Zhang Qian, de -138 à -126, ouvrent vers -130 les routes commerciales d'Asie centrale. Après l'usurpation de Wang Mang (9-23) et la restauration des Han orientaux en 25, l'administration lettrée se diffuse ; le papier est généralement associé à Cai Lun (vers 105), qui en perfectionne la fabrication.",
          "related": [
            "cn-tang"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-tang",
          "year": 618,
          "endYear": 907,
          "title": "Tang",
          "subtitle": "Chang'an, An Lushan et la chute de 907",
          "tags": [
            "arts",
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "Tang_dynasty",
          "summary": "Chang'an, capitale cosmopolite ouverte aux marchands et aux religions, est souvent décrite comme un âge d'or de la poésie et des échanges, un label historiographique plus qu'une réalité uniforme. L'empire est ravagé par la rébellion d'An Lushan (755-763), puis par des raids tibétains et des révoltes régionales ; la dynastie s'effondre en 907.",
          "related": [
            "cn-song"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-song",
          "year": 960,
          "endYear": 1279,
          "title": "Song",
          "subtitle": "Song du Nord et du Sud, techniques diffusées",
          "tags": [
            "sciences",
            "economie"
          ],
          "importance": 3,
          "grok": "Song_dynasty",
          "summary": "Les Song du Nord (960-1127) gouvernent une partie de la Chine, tandis que les Liao puis les Jin contrôlent le Nord et que les Xia occidentaux tiennent le Nord-Ouest. L'imprimerie, la poudre et la boussole sont perfectionnées et diffusées à grande échelle ; après 1127, les Song du Sud poursuivent à Hangzhou une économie urbaine et marchande jusqu'à la conquête mongole de 1279.",
          "related": [
            "cn-yuan"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-yuan",
          "year": 1271,
          "endYear": 1368,
          "title": "Yuan",
          "subtitle": "Khanat mongol et conquête de 1279",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 2,
          "grok": "Yuan_dynasty",
          "summary": "Kubilai Khan proclame le khanat Yuan en 1271, successeur de l'empire mongol alors fragmenté, et achève la conquête de la Chine du Sud en 1279. Les Mongols occupent les postes militaires et une partie de l'administration, tandis que des lettrés chinois et des intermédiaires d'Asie centrale dirigent les finances ; les révoltes paysannes renversent le régime en 1368.",
          "related": [
            "cn-ming"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-ming",
          "year": 1368,
          "endYear": 1644,
          "title": "Ming",
          "subtitle": "Cité interdite, Zheng He et commerce maritime",
          "tags": [
            "politique",
            "arts",
            "exploration"
          ],
          "importance": 3,
          "grok": "Ming_dynasty",
          "summary": "Les Ming chassent les Mongols et reconstruisent un État centralisé, tout en héritant de plusieurs institutions Yuan. La Cité interdite est édifiée de 1406 à 1420 et les expéditions de Zheng He se déploient de 1405 à 1433 ; l'interdiction du commerce maritime n'empêche pas les échanges côtiers et clandestins.",
          "related": [
            "cn-qing"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-qing",
          "year": 1644,
          "endYear": 1912,
          "title": "Qing",
          "subtitle": "Conquêtes, réformes et fin de l'empire",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 2,
          "grok": "Qing_dynasty",
          "summary": "La conquête mandchoue prend 1644-1662 en Chine propre et s'achève à Taïwan en 1683 ; elle est marquée par des violences et des mesures de coercition. Les Qing conquièrent le Xinjiang en 1755-1759, puis tentent l'autorenforcement (1861-1895) et les Nouvelles Politiques (1901-1911), sans enrayer les pressions coloniales et les révoltes.",
          "related": [
            "cn-opium"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-opium",
          "year": 1839,
          "endYear": 1842,
          "title": "Guerre de l’opium",
          "subtitle": "Canton, traité de Nanjing et cinq ports",
          "tags": [
            "guerre",
            "economie"
          ],
          "importance": 3,
          "grok": "First_Opium_War",
          "summary": "En 1839, Lin Zexu fait détruire l'opium saisi à Canton ; le Royaume-Uni riposte par la force (1839-1842) et impose le traité de Nanjing. Celui-ci ouvre cinq ports, cède Hong Kong et fixe une indemnité, mais l'opium n'est légalisé qu'en 1858 ; le récit du « siècle d'humiliation » est une catégorie nationale chinoise, pas un cadre neutre.",
          "related": [
            "cn-1911"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "cn-1911",
          "year": 1911,
          "title": "Révolution de 1911-1912",
          "subtitle": "Wuchang, République et abdication",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "1911_Revolution",
          "summary": "Le soulèvement de Wuchang, le 10 octobre 1911, déclenche la chute des Qing. La République de Chine est proclamée à Nanjing le 1er janvier 1912, avec Sun Yat-sen comme président provisoire ; Puyi abdique le 12 février 1912 et Yuan Shikai devient président. La mort de Yuan en 1916 ouvre la fragmentation des seigneurs de la guerre.",
          "related": [
            "cn-1949"
          ],
          "endYear": 1912,
          "sources": [
            "SRC-002",
            "SRC-001"
          ]
        },
        {
          "id": "cn-prop-001",
          "year": 1919,
          "title": "Mouvement du 4 Mai",
          "subtitle": "Étudiants, Versailles et nation",
          "tags": [
            "politique",
            "arts",
            "societe"
          ],
          "importance": 3,
          "summary": "Le 4 mai 1919, des étudiants de Pékin manifestent contre le transfert au Japon des concessions allemandes du Shandong décidé à Versailles. Le mouvement gagne les villes, les ouvriers et les femmes, et devient un moment fondateur du nationalisme chinois et de la Nouvelle Culture.",
          "related": [
            "cn-1911"
          ],
          "sources": [
            "SRC-003",
            "SRC-001"
          ]
        },
        {
          "id": "cn-prop-002",
          "year": 1921,
          "title": "Fondation du Parti communiste chinois",
          "subtitle": "Shanghai, Komintern et organisation centralisée",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "summary": "En juillet 1921, treize délégués environ tiennent à Shanghai le premier congrès du Parti communiste chinois, avec l'aide du Komintern. Le parti adopte une organisation centralisée et s'implante dans les milieux ouvriers et intellectuels.",
          "related": [
            "cn-prop-001"
          ],
          "sources": [
            "SRC-002",
            "SRC-001"
          ]
        },
        {
          "id": "cn-prop-003",
          "year": 1937,
          "title": "Massacre de Nanjing",
          "subtitle": "Violences de masse et mémoires disputées",
          "tags": [
            "guerre",
            "societe"
          ],
          "importance": 3,
          "summary": "Après la prise de Nanjing en décembre 1937, l'armée japonaise commet des massacres, des viols et des pillages pendant plusieurs semaines. Le tribunal militaire international de Tokyo retient environ 200 000 morts ; des travaux récents proposent 100 000 à 200 000 et les mémoires chinoises vont jusqu'à 300 000. Les catégories de victimes et les méthodes de comptage restent disputées.",
          "related": [],
          "sources": [
            "SRC-005",
            "SRC-004"
          ],
          "endYear": 1938
        },
        {
          "id": "cn-1949",
          "year": 1949,
          "title": "République populaire",
          "subtitle": "Fondation de la RPC, guerre civile et consolidation",
          "tags": [
            "politique",
            "guerre",
            "societe"
          ],
          "importance": 3,
          "grok": "Chinese_Communist_Revolution",
          "summary": "Le 1er octobre 1949, Mao Zedong proclame la République populaire à Pékin ; le gouvernement nationaliste se replie à Taïwan et la guerre civile continue, avec la prise de Hainan en 1950. La consolidation comprend la réforme agraire (1950-1952), la loi sur le mariage (1950) et l'accord en dix-sept points sur le Tibet (1951), après l'entrée de l'armée populaire au Tibet en 1950. Le Grand Bond en avant, la famine de 1959-1961 et la Révolution culturelle marquent ensuite la période maoïste.",
          "related": [
            "cn-deng"
          ],
          "sources": [
            "SRC-001",
            "SRC-008"
          ]
        },
        {
          "id": "cn-prop-004",
          "year": 1950,
          "title": "Loi sur le mariage",
          "subtitle": "Égalité des époux et fin du mariage arrangé",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "summary": "Le 1er mai 1950, la loi sur le mariage interdit le mariage arrangé, la polygamie et le concubinage, et proclame l'égalité des époux. Sa mise en œuvre se heurte aux pratiques locales et aux campagnes de propagande, et son application varie selon les régions.",
          "related": [
            "cn-1949"
          ],
          "sources": [
            "SRC-011",
            "SRC-001"
          ]
        },
        {
          "id": "cn-deng",
          "year": 1978,
          "title": "Réformes de Deng",
          "subtitle": "Troisième plénum, zones spéciales et ouverture",
          "tags": [
            "economie",
            "politique"
          ],
          "importance": 3,
          "grok": "Deng_Xiaoping",
          "summary": "En décembre 1978, le troisième plénum du XIe Comité central lance les réformes : le démantèlement progressif des communes, le système de responsabilité familiale et les zones économiques spéciales (Shenzhen, Zhuhai, Shantou, Xiamen). L'ouverture attire les investissements et accélère la croissance, tandis que la répression de 1989, la rétrocession de Hong Kong (1997), l'entrée à l'OMC (2001) et le confinement de Wuhan (2020) scandent la période. La trajectoire s'accompagne d'inégalités, de migrations massives et de coûts environnementaux.",
          "related": [],
          "sources": [
            "SRC-013",
            "SRC-014"
          ]
        }
      ]
    },
    {
      "id": "india",
      "name": "Inde",
      "articleName": "l'Histoire de l'Inde",
      "flag": "🇮🇳",
      "color": "#e6a35e",
      "domain": [
        -2600,
        2026
      ],
      "tagline": "De l’Indus à la plus grande démocratie",
      "featuredIds": [
        "in-indus",
        "in-maurya",
        "in-moghol",
        "in-cipayes",
        "in-independance",
        "in-liberalisation"
      ],
      "intro": "Une mosaïque de civilisations, d’empires et de religions, de la vallée de l’Indus à l’Inde moderne.",
      "eras": [
        {
          "name": "Civilisations anciennes",
          "start": -2600,
          "end": 1206,
          "color": "#8a6fb2"
        },
        {
          "name": "Sultanats, Vijayanagara & Moghols",
          "start": 1206,
          "end": 1757,
          "color": "#c2855c"
        },
        {
          "name": "Compagnie & Raj",
          "start": 1757,
          "end": 1947,
          "color": "#b35e5e"
        },
        {
          "name": "Inde contemporaine",
          "start": 1947,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "in-indus",
          "year": -2600,
          "title": "Indus",
          "subtitle": "Harappa et Mohenjo-daro",
          "tags": [
            "societe",
            "exploration"
          ],
          "importance": 3,
          "grok": "Indus_Valley_Civilisation",
          "summary": "Des cités planifiées et des réseaux d’irrigation caractérisent la civilisation de l’Indus, dont l’écriture n’est pas déchiffrée. Sa dé-urbanisation s’étend entre 1900 et 1300 av. J.-C. ; le climat, les cours d’eau et le commerce figurent parmi les causes discutées, sans disparition brutale des sociétés.",
          "related": [
            "in-maurya"
          ],
          "endYear": -1300,
          "sources": [
            "SRC-001",
            "SRC-002"
          ]
        },
        {
          "id": "in-maurya",
          "year": -322,
          "title": "Maurya",
          "subtitle": "Magadha, Kalinga et le dhamma",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 3,
          "grok": "Maurya_Empire",
          "summary": "Chandragupta renverse les Nanda et bâtit un empire qui prolonge la puissance du Magadha. Ashoka se convertit au bouddhisme et promeut le dhamma, un programme de gouvernement moral, après la conquête meurtrière du Kalinga en 261 av. J.-C. ; son action ne se réduit pas à la non-violence et ses missions bouddhiques touchent surtout l’Asie du Sud et l’Asie centrale.",
          "related": [
            "in-gupta"
          ],
          "sources": [
            "SRC-001",
            "SRC-002"
          ]
        },
        {
          "id": "in-gupta",
          "year": 320,
          "endYear": 550,
          "title": "Gupta",
          "subtitle": "Un âge d’or construit",
          "tags": [
            "sciences",
            "arts"
          ],
          "importance": 2,
          "grok": "Gupta_Empire",
          "summary": "Les Gupta favorisent les arts, la littérature et les sciences, et leur règne est devenu un « âge d’or » de l’historiographie. Aryabhata compose son traité d’astronomie en 499 ; le zéro et la numération décimale se développent sur plusieurs siècles, sans être des inventions gupta.",
          "related": [
            "in-delhi"
          ],
          "sources": [
            "SRC-001",
            "SRC-002"
          ]
        },
        {
          "id": "in-delhi",
          "year": 1206,
          "title": "Sultanat de Delhi",
          "subtitle": "Cinq dynasties, un sultanat",
          "tags": [
            "politique",
            "religion"
          ],
          "importance": 2,
          "grok": "Delhi_Sultanate",
          "summary": "De 1206 à 1526, cinq dynasties — Mamelouks, Khalji, Tughlaq, Sayyid et Lodi — gouvernent depuis Delhi. Le sultanat développe l’iqta, la monnaie et une administration persanophone, mais il coexiste avec les sultanats du Deccan, du Bengale et du Gujarat.",
          "related": [
            "in-moghol"
          ],
          "endYear": 1526,
          "sources": [
            "SRC-001",
            "SRC-003"
          ]
        },
        {
          "id": "in-moghol",
          "year": 1526,
          "title": "Moghols",
          "subtitle": "De Babur à Aurangzeb",
          "tags": [
            "politique",
            "arts"
          ],
          "importance": 3,
          "grok": "Mughal_Empire",
          "summary": "Babur fonde l’empire en 1526 ; Akbar le consolide par le mansabdari et des alliances rajputes, tandis que Shah Jahan porte l’apogée culturelle et fait construire le Taj Mahal entre 1632 et 1653. L’expansion territoriale culmine sous Aurangzeb, mais sa mort en 1707 ouvre une crise successorale et un long déclin.",
          "related": [
            "in-eic"
          ],
          "endYear": 1707,
          "sources": [
            "SRC-003"
          ]
        },
        {
          "id": "in-eic",
          "year": 1600,
          "title": "Compagnie des Indes",
          "subtitle": "Du comptoir à la souveraineté",
          "tags": [
            "economie",
            "politique",
            "guerre"
          ],
          "importance": 2,
          "grok": "East_India_Company",
          "summary": "La Compagnie anglaise des Indes orientales reçoit sa charte en 1600, mais elle n’obtient son premier comptoir qu’à Surat en 1613, puis s’installe à Madras, Bombay et Calcutta. La victoire de Plassey en 1757, celle de Buxar en 1764 et le Diwani de 1765 la transforment en puissance territoriale et fiscale au Bengale.",
          "related": [
            "in-cipayes"
          ],
          "endYear": 1765,
          "sources": [
            "SRC-003",
            "SRC-004"
          ]
        },
        {
          "id": "in-cipayes",
          "year": 1857,
          "title": "Révolte de 1857-1858",
          "subtitle": "Une révolte, une répression",
          "tags": [
            "guerre",
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Indian_Rebellion_of_1857",
          "summary": "La révolte éclate en 1857 parmi les sepoys du Bengale et s’étend aux paysans, aux villes et à plusieurs princes, avec des violences des deux camps. La répression britannique est massive et fait de nombreuses victimes civiles ; en 1858, Londres retire ses pouvoirs à la Compagnie et place l’Inde sous l’administration directe de la Couronne.",
          "related": [
            "in-congres"
          ],
          "endYear": 1858,
          "sources": [
            "SRC-004",
            "SRC-005"
          ]
        },
        {
          "id": "in-congres",
          "year": 1885,
          "title": "Congrès national",
          "subtitle": "Des notables au parti de masse",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 2,
          "grok": "Indian_National_Congress",
          "summary": "Fondé à Bombay en 1885, le Congrès rassemble d’abord avocats, journalistes, propriétaires et marchands, dans une phase modérée de pétitions et de réformes. Il devient un parti de masse après 1920, sous l’impulsion de Gandhi, et doit compter avec la concurrence de la Ligue musulmane.",
          "related": [
            "in-amritsar"
          ],
          "sources": [
            "SRC-005"
          ]
        },
        {
          "id": "in-amritsar",
          "year": 1919,
          "title": "Amritsar",
          "subtitle": "Le massacre de Jallianwala Bagh",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 3,
          "grok": "Jallianwala_Bagh_massacre",
          "summary": "Le 13 avril 1919, le général Dyer fait tirer sur une foule réunie à Jallianwala Bagh, à Amritsar, en marge des protestations contre le Rowlatt Act. Les estimations vont de 379 à plus de 1 500 morts et environ 1 200 blessés ; la commission Hunter, instituée en 1919, critique dans son rapport la conduite de l’armée, et le massacre discrédite le Raj.",
          "related": [
            "in-independance"
          ],
          "sources": [
            "SRC-005"
          ]
        },
        {
          "id": "in-prop-001",
          "year": 1927,
          "title": "Satyagraha de Mahad",
          "subtitle": "Ambedkar et le droit à l’eau",
          "tags": [
            "politique",
            "societe",
            "religion"
          ],
          "importance": 3,
          "summary": "Le 20 mars 1927, Ambedkar et des milliers de Dalits boivent l’eau du réservoir Chavdar à Mahad pour affirmer l’égalité d’accès aux espaces publics. La campagne ouvre une décennie de luttes pour les droits des intouchables et nourrit la politisation dalite.",
          "related": [
            "in-gandhi"
          ],
          "sources": [
            "SRC-019",
            "SRC-011"
          ]
        },
        {
          "id": "in-prop-002",
          "year": 1930,
          "title": "Marche du sel",
          "subtitle": "Gandhi, Dandi et la désobéissance civile",
          "tags": [
            "politique",
            "societe",
            "economie"
          ],
          "importance": 3,
          "summary": "Du 12 mars au 6 avril 1930, Gandhi et ses compagnons marchent de Sabarmati à Dandi pour produire du sel illégalement, en défi au monopole britannique. Sarojini Naidu et des milliers de femmes rejoignent le mouvement ; la répression touche environ 60 000 personnes.",
          "related": [
            "in-amritsar",
            "in-independance"
          ],
          "sources": [
            "SRC-005",
            "SRC-012"
          ]
        },
        {
          "id": "in-independance",
          "year": 1947,
          "title": "Indépendance",
          "subtitle": "La fin du Raj britannique",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Partition_of_India",
          "summary": "L’Inde devient indépendante le 15 août 1947, au terme de négociations constitutionnelles et de décennies de mobilisations. La Partition du sous-continent, tracée par la ligne Radcliffe en août 1947, constitue un événement distinct, avec ses propres réfugiés et ses propres violences.",
          "related": [
            "in-gandhi"
          ],
          "sources": [
            "SRC-007",
            "SRC-008",
            "SRC-009"
          ]
        },
        {
          "id": "in-prop-003",
          "year": 1947,
          "title": "Partition",
          "subtitle": "Ligne Radcliffe, réfugiés et Cachemire",
          "tags": [
            "politique",
            "societe",
            "guerre"
          ],
          "importance": 3,
          "summary": "La ligne Radcliffe, publiée en août 1947, partage le Pendjab et le Bengale entre l’Inde et le Pakistan ; les transferts de population et les violences déplacent entre 12 et 20 millions de personnes et font entre 200 000 et 2 millions de morts selon les estimations. Le conflit du Cachemire, né de l’accession contestée de 1947, débouche sur la première guerre indo-pakistanaise de 1947-1948.",
          "related": [
            "in-independance",
            "in-gandhi"
          ],
          "sources": [
            "SRC-007",
            "SRC-008",
            "SRC-009"
          ],
          "endYear": 1948
        },
        {
          "id": "in-gandhi",
          "year": 1948,
          "title": "Gandhi",
          "subtitle": "L’assassinat du Mahatma",
          "tags": [
            "politique",
            "religion",
            "societe"
          ],
          "importance": 2,
          "grok": "Mahatma_Gandhi",
          "summary": "Mohandas Gandhi est assassiné le 30 janvier 1948 à Delhi par Nathuram Godse, ancien militant du RSS. Figure centrale de la non-violence et du mouvement national, il est aussi critiqué pour ses positions sur la caste et pour son rôle dans les négociations de 1942-1947, notamment face à la Ligue musulmane ; son héritage reste contesté.",
          "related": [
            "in-liberalisation"
          ],
          "sources": [
            "SRC-005",
            "SRC-006"
          ]
        },
        {
          "id": "in-liberalisation",
          "year": 1991,
          "title": "Libéralisation",
          "subtitle": "Une crise, des réformes, des inégalités",
          "tags": [
            "economie",
            "societe"
          ],
          "importance": 2,
          "grok": "Economic_liberalisation_in_India",
          "summary": "En 1991, une crise de balance des paiements pousse le gouvernement Rao et son ministre des Finances Manmohan Singh à engager des réformes sous conditions du FMI. La libéralisation, partielle et progressive, s’étend sur les années 1990 et se poursuit après 2000 ; elle accélère la croissance des services mais laisse subsister de fortes inégalités sociales et régionales.",
          "related": [],
          "endYear": 2000,
          "sources": [
            "SRC-006",
            "SRC-014"
          ]
        },
        {
          "id": "in-prop-004",
          "year": 2006,
          "title": "Loi sur les droits forestiers",
          "subtitle": "Adivasis, gram sabhas et environnement",
          "tags": [
            "politique",
            "societe",
            "economie"
          ],
          "importance": 3,
          "summary": "La loi de 2006 reconnaît les droits individuels et collectifs des communautés forestières, notamment des Adivasis, sur les terres et les ressources qu’elles occupent. Son application reste inégale ; le conflit de Niyamgiri, où les gram sabhas rejettent en 2013 le projet minier, en devient un cas emblématique.",
          "related": [
            "in-liberalisation"
          ],
          "sources": [
            "SRC-018",
            "SRC-016"
          ]
        }
      ]
    },
    {
      "id": "japan",
      "name": "Japon",
      "articleName": "l'Histoire du Japon",
      "flag": "🇯🇵",
      "color": "#e6b36f",
      "domain": [
        538,
        2026
      ],
      "tagline": "Des shoguns au Japon contemporain",
      "featuredIds": [
        "jp-kamakura",
        "jp-edo",
        "jp-meiji",
        "jp-hiroshima",
        "jp-1964"
      ],
      "intro": "Un archipel qui absorbe, transforme et réinvente les influences extérieures, de l’époque des shoguns à la puissance technologique.",
      "eras": [
        {
          "name": "Antiquité, Asuka & Nara",
          "start": 538,
          "end": 794,
          "color": "#8a6fb2"
        },
        {
          "name": "Heian & shoguns",
          "start": 794,
          "end": 1603,
          "color": "#c2855c"
        },
        {
          "name": "Époque Edo",
          "start": 1603,
          "end": 1868,
          "color": "#c7a257"
        },
        {
          "name": "Empire et guerres mondiales",
          "start": 1868,
          "end": 1945,
          "color": "#b35e5e"
        },
        {
          "name": "Japon contemporain",
          "start": 1945,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "jp-bouddhisme",
          "year": 538,
          "title": "Bouddhisme",
          "subtitle": "538/552, une date conventionnelle",
          "tags": [
            "religion",
            "arts"
          ],
          "importance": 2,
          "grok": "Buddhism_in_Japan",
          "summary": "Le bouddhisme est introduit depuis le royaume de Baekje, selon une tradition datée de 538 et, dans le Nihon Shoki, de 552. L'empereur Kinmei et le clan Soga figurent parmi les acteurs de cette introduction, associée à Asuka. La date de 538 est une convention religieuse: elle ne marque ni le début de l'écriture chinoise, ni celui du peuplement de l'archipel.",
          "related": [
            "jp-nara"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "jp-nara",
          "year": 710,
          "title": "Nara",
          "subtitle": "Grande capitale modèle, 710–784",
          "tags": [
            "politique",
            "arts",
            "religion"
          ],
          "importance": 2,
          "grok": "Nara_period",
          "summary": "Nara (Heijō-kyō) est fondée en 710 sur le modèle des capitales chinoises et reste le siège du pouvoir jusqu'en 784. Le bouddhisme d'État, les chroniques impériales et l'architecture monumentale y structurent le pouvoir. La cour se transfère ensuite à Nagaoka-kyō (784–794), avant l'installation à Heian-kyō en 794; Nara n'est pas la première capitale fixe, Fujiwara-kyō l'ayant précédée de 694 à 710.",
          "related": [
            "jp-heian"
          ],
          "endYear": 784,
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "jp-heian",
          "year": 794,
          "title": "Heian",
          "subtitle": "La cour, les Fujiwara et le Genji",
          "tags": [
            "arts",
            "politique"
          ],
          "importance": 2,
          "grok": "Heian_period",
          "summary": "La cour impériale s'installe à Heian-kyō (Kyoto) en 794 et y développe une culture raffinée jusqu'à la fin du XIIe siècle. La régence Fujiwara structure la vie politique, tandis que les femmes de cour occupent une place centrale dans la production littéraire; Murasaki Shikibu compose le Dit du Genji vers 1008. L'ère s'achève en 1185 avec la mise en place du bakufu de Kamakura, qui ouvre une longue période dominée par les guerriers.",
          "related": [
            "jp-kamakura"
          ],
          "endYear": 1185,
          "sources": [
            "SRC-002"
          ]
        },
        {
          "id": "jp-kamakura",
          "year": 1185,
          "title": "Kamakura",
          "subtitle": "Le premier bakufu, 1185/1192",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "Kamakura_shogunate",
          "summary": "Après la victoire sur les Taira, Minamoto no Yoritomo met en place un gouvernement militaire à Kamakura en 1185; il ne reçoit le titre de shogun qu'en 1192. Le bakufu s'appuie sur les guerriers et sur les régents Hōjō, tandis que la cour impériale conserve une autorité symbolique. Les samouraïs ne forment pas une classe dirigeante homogène: leur pouvoir se construit par étapes, entre services militaires, domaines et liens personnels.",
          "related": [
            "jp-mongols"
          ],
          "sources": [
            "SRC-003"
          ]
        },
        {
          "id": "jp-mongols",
          "year": 1274,
          "endYear": 1281,
          "title": "Invasions mongoles",
          "subtitle": "Deux invasions et le mythe du kamikaze",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 2,
          "grok": "Mongol_invasions_of_Japan",
          "summary": "Les armées de Kubilai Khan tentent d'envahir le Japon en 1274 et en 1281; les deux expéditions échouent. Les tempêtes ont joué un rôle, mais la logistique, la résistance japonaise et les difficultés de combat expliquent aussi les défaites. La mythification ultérieure en « kamikaze » (vent divin) masque ces causes multiples; le coût de la défense affaiblit financièrement et politiquement le bakufu de Kamakura.",
          "related": [
            "jp-edo"
          ],
          "sources": [
            "SRC-003"
          ]
        },
        {
          "id": "jp-portugais",
          "year": 1543,
          "title": "Portugais",
          "subtitle": "Armes à feu et missionnaires",
          "tags": [
            "sciences",
            "religion",
            "economie"
          ],
          "importance": 2,
          "grok": "Nanban_trade",
          "summary": "Des marchands portugais atteignent Tanegashima en 1543 et introduisent les armes à feu, rapidement adoptées par les seigneurs de Kyūshū. En 1549, François Xavier et les Jésuites arrivent à Kagoshima et commencent la mission chrétienne. Commerce, technologie et religion sont des phénomènes distincts, portés par des acteurs différents, même s'ils se recoupent dans les ports de Kyūshū.",
          "related": [
            "jp-edo"
          ],
          "sources": [
            "SRC-004"
          ]
        },
        {
          "id": "jp-edo",
          "year": 1603,
          "endYear": 1868,
          "title": "Edo",
          "subtitle": "Contrôle des échanges et société urbaine",
          "tags": [
            "politique",
            "economie",
            "societe"
          ],
          "importance": 3,
          "grok": "Edo_period",
          "summary": "Le shogunat Tokugawa instaure une paix longue et un contrôle strict de la société, avec Edo pour capitale politique. Le terme sakoku, forgé au XIXe siècle, masque la diversité des échanges: Nagasaki avec les Hollandais et les Chinois, Satsuma via Ryūkyū, Matsumae avec les Ainu, et le commerce avec la Corée. Des famines et des révoltes paysannes traversent la période, tandis qu'une culture urbaine prospère.",
          "related": [
            "jp-perry"
          ],
          "sources": [
            "SRC-004"
          ]
        },
        {
          "id": "jp-perry",
          "year": 1853,
          "title": "Perry",
          "subtitle": "Canonnières et convention de Kanagawa",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 3,
          "grok": "Perry_Expedition",
          "summary": "Le commodore Matthew Perry arrive dans la baie d'Edo en juillet 1853 avec une flotte de guerre et exige l'ouverture de ports. La menace des canonnières et les divisions du bakufu conduisent à la convention de Kanagawa en mars 1854, qui ouvre Shimoda et Hakodate. L'ouverture résulte donc d'une pression militaire et d'une négociation, pas d'un simple décret.",
          "related": [
            "jp-meiji"
          ],
          "sources": [
            "SRC-005"
          ]
        },
        {
          "id": "jp-meiji",
          "year": 1868,
          "title": "Meiji",
          "subtitle": "Restauration, réformes et construction impériale",
          "tags": [
            "politique",
            "economie"
          ],
          "importance": 3,
          "grok": "Meiji_Restoration",
          "summary": "La restauration de Meiji est menée en 1868 par une oligarchie de jeunes samouraïs au nom de l'empereur, qui règne mais ne gouverne pas seul. La Charte du serment, l'abolition des domaines en 1871, la conscription de 1873 et la réforme foncière de 1873 transforment l'État, l'armée et la propriété. Cette modernisation autoritaire et impériale s'accompagne d'une industrialisation rapide, mais les coûts sociaux et les inégalités sont importants.",
          "related": [
            "jp-russie"
          ],
          "sources": [
            "SRC-005"
          ]
        },
        {
          "id": "jp-prop-006",
          "year": 1869,
          "title": "Colonisation de Hokkaidō et dépossession ainu",
          "subtitle": "De l'Ézo à la loi de 1899",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "summary": "En 1869, le nouveau gouvernement de Meiji crée la Commission de développement de Hokkaidō et encourage la colonisation japonaise de l'île, rebaptisée Hokkaidō. Les terres ainu sont progressivement privatisées et les pratiques culturelles interdites; la loi de 1899 sur les « anciens aborigènes » impose l'assimilation. La dépossession foncière et les maladies infectieuses réduisent fortement la population ainu.",
          "related": [
            "jp-meiji"
          ],
          "sources": [
            "SRC-016",
            "SRC-010"
          ],
          "endYear": 1899
        },
        {
          "id": "jp-russie",
          "year": 1904,
          "endYear": 1905,
          "title": "Guerre russo-japonaise",
          "subtitle": "Un conflit impérial en Asie du Nord-Est",
          "tags": [
            "guerre",
            "politique"
          ],
          "importance": 2,
          "grok": "Russo-Japanese_War",
          "summary": "La guerre russo-japonaise (1904–1905) oppose deux empires pour le contrôle de la Mandchourie et de la Corée. La victoire japonaise, consacrée par le traité de Portsmouth, modifie le rapport de forces régional et ouvre la voie à l'annexion de la Corée en 1910. Elle est souvent présentée comme une « première victoire asiatique », mais le Japon avait déjà vaincu la Chine en 1895 et poursuivait sa propre expansion impériale.",
          "related": [
            "jp-hiroshima"
          ],
          "sources": [
            "SRC-005",
            "SRC-009"
          ]
        },
        {
          "id": "jp-prop-010",
          "year": 1910,
          "title": "Annexion de la Corée",
          "subtitle": "Colonisation, migration et résistances",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "summary": "Le traité d'annexion japonais-coréen de 1910 fait de la Corée une colonie japonaise, administrée depuis Keijō (Séoul) par le gouvernement général de Corée. La colonisation s'accompagne de confiscations, de travail forcé, de migrations japonaises et de politiques d'assimilation; le mouvement du 1er mars 1919 et les résistances indépendantistes la contestent durablement.",
          "related": [
            "jp-russie",
            "jp-meiji"
          ],
          "sources": [
            "SRC-009",
            "SRC-010"
          ]
        },
        {
          "id": "jp-prop-014",
          "year": 1945,
          "title": "Constitution de 1947 et suffrage des femmes",
          "subtitle": "L'occupation américaine et la refondation démocratique",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "summary": "Après la capitulation, l'occupation dirigée par le général MacArthur impose une démilitarisation et une démocratisation du Japon. La nouvelle Constitution, promulguée en 1946 et entrée en vigueur en 1947, garantit l'égalité des sexes, le suffrage universel et l'article 9 qui renonce à la guerre. Les femmes votent pour la première fois en avril 1946; des militantes comme Ichikawa Fusae jouent un rôle dans la conquête de ce droit.",
          "related": [
            "jp-hiroshima"
          ],
          "sources": [
            "SRC-007",
            "SRC-012"
          ],
          "endYear": 1947
        },
        {
          "id": "jp-hiroshima",
          "year": 1945,
          "title": "Hiroshima et Nagasaki",
          "subtitle": "Bombardements atomiques, 6 et 9 août 1945",
          "tags": [
            "guerre",
            "sciences",
            "societe"
          ],
          "importance": 3,
          "grok": "Atomic_bombings_of_Hiroshima_and_Nagasaki",
          "summary": "Les États-Unis lancent une bombe atomique sur Hiroshima le 6 août 1945, puis sur Nagasaki le 9 août; les deux villes sont détruites et les victimes civiles se comptent par dizaines de milliers. Le Japon annonce sa capitulation le 15 août et la signe le 2 septembre, sous occupation américaine. La Constitution de 1947, avec son article 9, est un acte distinct de la capitulation; la mémoire des hibakusha et le débat sur les bombardements se poursuivent.",
          "related": [
            "jp-1964"
          ],
          "sources": [
            "SRC-007"
          ]
        },
        {
          "id": "jp-prop-015",
          "year": 1956,
          "title": "Maladie de Minamata",
          "subtitle": "Pollution industrielle et lutte des victimes",
          "tags": [
            "sciences",
            "societe"
          ],
          "importance": 2,
          "summary": "À Minamata, la firme Chisso rejette dans la mer des composés de mercure qui contaminent les poissons et provoquent une maladie neurologique grave, dont les premiers cas sont identifiés en 1956. Les victimes et leurs soutiens affrontent longtemps l'entreprise et l'État avant que des indemnisations ne soient obtenues en 1973. L'affaire devient un symbole de la pollution industrielle et de la mobilisation citoyenne au Japon.",
          "related": [
            "jp-1964",
            "jp-fukushima"
          ],
          "sources": [
            "SRC-015",
            "SRC-008"
          ],
          "endYear": 1973
        },
        {
          "id": "jp-1964",
          "year": 1964,
          "title": "JO de Tokyo",
          "subtitle": "JO, shinkansen et croissance urbaine",
          "tags": [
            "economie",
            "societe"
          ],
          "importance": 2,
          "grok": "1964_Summer_Olympics",
          "summary": "Les Jeux olympiques de Tokyo se tiennent du 10 au 24 octobre 1964, quelques jours après l'ouverture du shinkansen Tokyo–Osaka le 1er octobre. Ils célèbrent la reconstruction et la croissance, mais ne la causent pas: la télévision existe depuis 1953 et les infrastructures olympiques s'inscrivent dans une transformation urbaine plus large. Les travaux et la pollution suscitent aussi des contestations, notamment à Tokyo.",
          "related": [
            "jp-fukushima"
          ],
          "sources": [
            "SRC-006"
          ]
        },
        {
          "id": "jp-fukushima",
          "year": 2011,
          "title": "Séisme, tsunami et accident de Fukushima Daiichi",
          "subtitle": "11 mars 2011 et désastre social",
          "tags": [
            "sciences",
            "societe"
          ],
          "importance": 2,
          "grok": "Fukushima_nuclear_accident",
          "summary": "Le 11 mars 2011, un séisme de magnitude 9 au large du Tōhoku déclenche un tsunami qui ravage la côte nord-est et provoque l'accident de la centrale de Fukushima Daiichi. Les évacuations, la contamination et les indemnisations transforment la catastrophe en crise sociale durable; les enquêtes distinguent l'aléa naturel, les défaillances de conception et de régulation, et les responsabilités de TEPCO et de l'État. La mémoire locale et le débat sur l'énergie nucléaire restent vifs.",
          "related": [],
          "sources": [
            "SRC-018",
            "SRC-008"
          ]
        }
      ]
    },
    {
      "id": "egypt",
      "name": "Égypte",
      "articleName": "l'Histoire de l'Égypte",
      "flag": "🇪🇬",
      "color": "#d9b06f",
      "domain": [
        -3100,
        2026
      ],
      "tagline": "Des pharaons à la place Tahrir",
      "featuredIds": [
        "eg-unification",
        "eg-kheops",
        "eg-ramses",
        "eg-cleopatre",
        "eg-arabes",
        "eg-suez",
        "eg-nasser",
        "eg-tahrir"
      ],
      "intro": "Cinq millénaires au carrefour de l’Afrique, de la Méditerranée et du monde arabe.",
      "eras": [
        {
          "name": "Égypte pharaonique",
          "start": -3100,
          "end": -332,
          "color": "#c7a257"
        },
        {
          "name": "Égypte gréco-romaine",
          "start": -332,
          "end": 641,
          "color": "#8a6fb2"
        },
        {
          "name": "Égypte islamique",
          "start": 641,
          "end": 1798,
          "color": "#c2855c"
        },
        {
          "name": "Égypte moderne et coloniale",
          "start": 1798,
          "end": 1952,
          "color": "#b35e5e"
        },
        {
          "name": "Égypte contemporaine",
          "start": 1952,
          "end": 2026,
          "color": "#5d9c97"
        }
      ],
      "events": [
        {
          "id": "eg-unification",
          "year": -3100,
          "title": "Unification",
          "subtitle": "Naissance de l’Égypte pharaonique, vers 3100 av. J.-C.",
          "tags": [
            "politique"
          ],
          "importance": 3,
          "grok": "Ancient_Egypt",
          "summary": "Vers 3100 av. J.-C., la Haute et la Basse-Égypte sont réunies sous un même souverain, au terme d’un processus politique progressif. La date de 3100 av. J.-C. est une convention des égyptologues, qui situent l’unification dans une fourchette de 3200 à 3000 av. J.-C. L’écriture hiéroglyphique, l’administration et l’idéologie pharaonique structurent ensuite une civilisation de trois millénaires.",
          "related": [
            "eg-kheops"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "eg-kheops",
          "year": -2560,
          "title": "Khéops",
          "subtitle": "La Grande Pyramide",
          "tags": [
            "arts",
            "sciences"
          ],
          "importance": 3,
          "grok": "Great_Pyramid_of_Giza",
          "summary": "La pyramide de Khéops est édifiée à Gizeh. Sa conception et sa construction témoignent d’une maîtrise exceptionnelle de l’organisation et de la géométrie.",
          "related": [
            "eg-ramses"
          ]
        },
        {
          "id": "eg-akhenaton",
          "year": -1350,
          "title": "Akhenaton",
          "subtitle": "Aton, Amarna et le débat sur le monothéisme",
          "tags": [
            "religion",
            "politique"
          ],
          "importance": 2,
          "grok": "Akhenaten",
          "summary": "Vers 1350 av. J.-C., Akhenaton impose le culte du disque solaire Aton et fonde une nouvelle capitale, Akhetaton, sur le site d’Amarna. Son règne religieux radical est suivi d’un retour à l’ordre traditionnel. Les historiens discutent de la nature exacte de ce culte et du bien-fondé du terme monothéisme.",
          "related": [
            "eg-ramses"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "eg-ramses",
          "year": -1279,
          "endYear": -1213,
          "title": "Ramsès II",
          "subtitle": "Qadesh, Abou Simbel et le traité hittite",
          "tags": [
            "politique",
            "guerre",
            "arts"
          ],
          "importance": 3,
          "grok": "Ramesses_II",
          "summary": "Ramsès II règne de 1279 à 1213 av. J.-C., soit environ 66 ans. Il affronte les Hittites à Qadesh vers 1274, puis conclut avec eux un traité de paix, et fait construire de nombreux monuments, dont Abou Simbel. Son règne est marqué par une propagande royale intense et par les limites de la puissance égyptienne en Syrie.",
          "related": [
            "eg-alexandrie"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "eg-alexandrie",
          "year": -331,
          "title": "Alexandrie",
          "subtitle": "Fondation d’Alexandre, essor ptolémaïque",
          "tags": [
            "politique",
            "exploration",
            "sciences"
          ],
          "importance": 3,
          "grok": "Alexandria",
          "summary": "Alexandre le Grand fonde Alexandrie en 331 av. J.-C., après son entrée en Égypte à la fin de 332 av. J.-C. La ville devient un grand centre culturel et commercial sous les Ptolémées, qui y développent la bibliothèque et le phare. Ces institutions sont postérieures à la fondation et ne doivent pas être attribuées à Alexandre.",
          "related": [
            "eg-cleopatre"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "eg-cleopatre",
          "year": -30,
          "title": "Mort de Cléopâtre et annexion romaine de l’Égypte",
          "subtitle": "Actium, Alexandrie et la fin du royaume ptolémaïque",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 3,
          "grok": "Cleopatra",
          "summary": "La flotte de Cléopâtre et d’Antoine est défaite à Actium en 31 av. J.-C. En 30 av. J.-C., Octave prend Alexandrie ; Cléopâtre se donne la mort et l’Égypte devient une province romaine. La défaite navale, la prise de la capitale et l’annexion sont trois moments distincts.",
          "related": [
            "eg-arabes"
          ],
          "sources": [
            "SRC-001"
          ]
        },
        {
          "id": "eg-arabes",
          "year": 641,
          "title": "Conquête arabe",
          "subtitle": "L’Égypte entre dans l’empire arabe",
          "tags": [
            "religion",
            "politique"
          ],
          "importance": 3,
          "grok": "Arab_conquest_of_Egypt",
          "summary": "Les armées arabes entrent en Égypte en 639 et achèvent la conquête en 642 ; la prise d’Alexandrie en 641 en est un épisode. L’Égypte devient une province de l’empire arabe, mais l’islamisation et l’arabisation restent des processus pluriséculaires. Les estimations de bascule démographique entre coptes et musulmans varient selon les méthodes, du IXe au XIVe siècle.",
          "related": [
            "eg-caire"
          ],
          "sources": [
            "SRC-007",
            "SRC-006"
          ]
        },
        {
          "id": "eg-caire",
          "year": 969,
          "title": "Le Caire",
          "subtitle": "Fondation fatimide, capitale et al-Azhar",
          "tags": [
            "politique",
            "arts",
            "religion"
          ],
          "importance": 2,
          "grok": "Cairo",
          "summary": "Les Fatimides fondent al-Qahira en 969 et al-Azhar l’année suivante. En 973, le calife al-Muizz s’y installe et la ville devient la capitale du califat fatimide. Fondation urbaine, capitale califale et institution religieuse sont trois faits distincts.",
          "related": [
            "eg-bonaparte"
          ],
          "sources": [
            "SRC-007"
          ]
        },
        {
          "id": "eg-bonaparte",
          "year": 1798,
          "title": "Bonaparte",
          "subtitle": "Expédition militaire et savante, 1798-1801",
          "tags": [
            "sciences",
            "politique"
          ],
          "importance": 2,
          "grok": "Napoleon",
          "summary": "Bonaparte débarque en Égypte en 1798 avec une expédition militaire et scientifique. La pierre de Rosette est découverte en 1799 à Rachid, puis cédée aux Britanniques en 1801 après la capitulation française. L’expédition se retire la même année, mais ses savants et leurs publications nourrissent durablement l’égyptologie.",
          "related": [
            "eg-suez"
          ],
          "sources": [
            "SRC-011"
          ]
        },
        {
          "id": "eg-suez",
          "year": 1869,
          "title": "Suez",
          "subtitle": "Inauguration du canal, corvée et dette",
          "tags": [
            "economie",
            "sciences",
            "politique"
          ],
          "importance": 3,
          "grok": "Suez_Canal",
          "summary": "Le canal de Suez est inauguré en 1869 ; il raccourcit la route maritime entre l’Europe et l’Asie, sans la créer. Sa construction mobilise la corvée de travailleurs égyptiens, dans des conditions sanitaires dures, avec une mortalité mal documentée. La dette du khédivat conduit à la vente des actions égyptiennes en 1875, puis à l’occupation britannique en 1882.",
          "related": [
            "eg-independance"
          ],
          "sources": [
            "SRC-011",
            "SRC-012"
          ]
        },
        {
          "id": "eg-prop-012",
          "year": 1882,
          "title": "Occupation britannique de l’Égypte",
          "subtitle": "Urabi, Alexandrie et Tell el-Kebir",
          "tags": [
            "guerre",
            "politique",
            "economie"
          ],
          "importance": 3,
          "summary": "Le mouvement d’Ahmed Urabi conteste la tutelle européenne et l’absolutisme khédivial. En juillet 1882, les Britanniques bombardent Alexandrie ; le 13 septembre, ils écrasent l’armée égyptienne à Tell el-Kebir. L’occupation britannique commence et dure, sous des formes variables, jusqu’au retrait de 1956.",
          "related": [
            "eg-suez",
            "eg-independance"
          ],
          "sources": [
            "SRC-011",
            "SRC-012"
          ]
        },
        {
          "id": "eg-prop-013",
          "year": 1919,
          "title": "Révolution de 1919",
          "subtitle": "Le Wafd, les paysans et la rue égyptienne",
          "tags": [
            "politique",
            "societe",
            "economie"
          ],
          "importance": 3,
          "summary": "L’arrestation de Saad Zaghloul et des dirigeants du Wafd en mars 1919 déclenche une révolution nationale. Étudiants, ouvriers, paysans, femmes et coptes participent au mouvement ; la répression tue au moins 800 personnes. La révolution force Londres à proclamer l’indépendance en 1922, avec quatre points réservés.",
          "related": [
            "eg-independance"
          ],
          "sources": [
            "SRC-013",
            "SRC-011"
          ]
        },
        {
          "id": "eg-independance",
          "year": 1922,
          "title": "Indépendance",
          "subtitle": "Fin du protectorat et quatre points réservés",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Kingdom_of_Egypt",
          "summary": "Le 28 février 1922, Londres proclame unilatéralement la fin du protectorat et l’Égypte devient un royaume indépendant. Quatre matières restent réservées à la Grande-Bretagne : les communications impériales, la défense, la protection des intérêts étrangers et des minorités, et le Soudan. La souveraineté reste incomplète jusqu’en 1936, et la présence militaire britannique se maintient dans la zone du canal jusqu’en 1956.",
          "related": [
            "eg-nasser"
          ],
          "sources": [
            "SRC-011"
          ]
        },
        {
          "id": "eg-prop-014",
          "year": 1923,
          "title": "Union féministe égyptienne",
          "subtitle": "Suffrage, statut personnel et nationalisme",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 2,
          "summary": "En mars 1923, Hoda Shaarawi et des femmes de l’élite fondent l’Union féministe égyptienne. L’organisation revendique le droit de vote, la réforme du statut personnel et l’éducation des filles. La Constitution de 1923 ne garantit pas le suffrage des femmes, qui ne l’obtiennent qu’en 1956, de façon restrictive jusqu’en 1979.",
          "related": [
            "eg-independance",
            "eg-nasser"
          ],
          "sources": [
            "SRC-014",
            "SRC-013"
          ]
        },
        {
          "id": "eg-nasser",
          "year": 1952,
          "title": "Les officiers libres au pouvoir",
          "subtitle": "Coup d’État, réforme agraire et avènement de Nasser",
          "tags": [
            "politique",
            "societe"
          ],
          "importance": 3,
          "grok": "Gamal_Abdel_Nasser",
          "summary": "Le 23 juillet 1952, les Officiers libres renversent le roi Farouk ; le régime présente l’opération comme une révolution, tandis que les historiens la qualifient de coup d’État. Le général Naguib devient président de la République en 1953, puis Nasser s’impose après la crise de 1954 et est confirmé président par référendum en 1956. La réforme agraire de septembre 1952 plafonne les propriétés à 200 feddans, tandis que les femmes obtiennent le droit de vote en 1956.",
          "related": [
            "eg-suez-crise"
          ],
          "sources": [
            "SRC-015",
            "SRC-011"
          ]
        },
        {
          "id": "eg-suez-crise",
          "year": 1956,
          "title": "Crise de Suez",
          "subtitle": "Nationalisation, invasion et retrait",
          "tags": [
            "politique",
            "guerre"
          ],
          "importance": 2,
          "grok": "Suez_Crisis",
          "summary": "Le 26 juillet 1956, Nasser nationalise le canal de Suez. Israël envahit le Sinaï le 29 octobre ; la France et le Royaume-Uni débarquent à Port-Saïd en novembre. Les pressions américaine et soviétique imposent un retrait de décembre 1956 à mars 1957, qui renforce Nasser.",
          "related": [
            "eg-paix"
          ],
          "sources": [
            "SRC-011"
          ]
        },
        {
          "id": "eg-prop-015",
          "year": 1963,
          "title": "Déplacement des Nubiens",
          "subtitle": "Le haut barrage d’Assouan et la fin de la Nubie égyptienne",
          "tags": [
            "societe",
            "economie",
            "sciences"
          ],
          "importance": 2,
          "summary": "La construction du haut barrage d’Assouan inonde la vallée nubienne entre Assouan et la frontière soudanaise. Environ 50 000 Nubiens égyptiens sont relogés à Kom Ombo en 1963-1964 ; 44 villages et des millions de palmiers disparaissent. L’UNESCO sauve les monuments, mais pas les villages.",
          "related": [
            "eg-nasser"
          ],
          "sources": [
            "SRC-018",
            "SRC-011"
          ],
          "endYear": 1964
        },
        {
          "id": "eg-paix",
          "year": 1979,
          "title": "Paix avec Israël",
          "subtitle": "Camp David, prix Nobel et traité de Washington",
          "tags": [
            "politique"
          ],
          "importance": 2,
          "grok": "Egypt–Israel_peace_treaty",
          "summary": "Les accords de Camp David sont signés en septembre 1978 et valent à Sadate et Begin le prix Nobel de la paix la même année. Le traité de paix égypto-israélien est signé à Washington le 26 mars 1979. Cette paix séparée isole l’Égypte dans le monde arabe et entraîne sa suspension de la Ligue arabe.",
          "related": [
            "eg-tahrir"
          ],
          "sources": [
            "SRC-011"
          ]
        },
        {
          "id": "eg-tahrir",
          "year": 2011,
          "title": "Tahrir",
          "subtitle": "Révolution, transition et coup militaire",
          "tags": [
            "societe",
            "politique"
          ],
          "importance": 2,
          "grok": "2011_Egyptian_revolution",
          "summary": "Des manifestations massives place Tahrir provoquent la chute de Hosni Moubarak en février 2011. Mohamed Morsi, élu président en 2012 et premier civil à occuper la fonction, est déposé par l’armée le 3 juillet 2013. Le 14 août, les forces de sécurité dispersent le sit-in de Rabaa al-Adawiya, tuant au moins 817 personnes selon Human Rights Watch.",
          "related": [],
          "sources": [
            "SRC-019",
            "SRC-020"
          ]
        }
      ]
    }
  ]
};
