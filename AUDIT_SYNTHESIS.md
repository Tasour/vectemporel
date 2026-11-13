# Synthèse des 10 audits pays — Vectemporel v1.0

> **Date.** 13 novembre 2026.
> **Source.** Les 10 dossiers de [`audits/`](audits/), produits par des agents experts avec la méthode [`TIMELINE_METHOD.md`](TIMELINE_METHOD.md).
> **Statut.** Premières versions expertes, **non signées**. `verdict: pending`, scores `null`, `signoff` vide. Les propositions sont une file de revue, pas un patch automatique de `data.js`.

---

## 1. Résultat en un coup d’œil

| Indicateur | Résultat |
| --- | ---: |
| Dossiers complets | **10/10** |
| Sources enregistrées | **200** |
| Sources avec DOI/URL valide ou protégée | **158** |
| Sources non concluantes (timeout, blocage éditeur) | 42 |
| DOI non résolus / URL introuvables / sans lien | **0** |
| Propositions d’événements | **180** |
| Acteurs proposés | **118** |
| Lieux proposés | **120** |
| Corrections d’événements existants | **120** |
| Omissions documentées | **148** |
| Cellules de matrice | **784** |
| Cellules couvertes au sens strict | **265 (34 %)** |
| Cellules partielles | 332 (42 %) |
| Cellules vides justifiées | 120 (15 %) |
| Cellules non traitées | **67 (9 %)** |
| Intégrité POC des frises | **120/120 contrôles** |
| Complétude cible v1.0 | **17,9/100** (contre 6,0 avant les dossiers) |
| Audits signés | **0/10** |

**Lecture.** Les dossiers ne rendent pas les frises « complètes » : ils rendent leurs lacunes **visibles, localisées et argumentées**. La couche pays est désormais documentée ; la couche événement reste à instrumenter dans `data.js` (acteurs, lieux, sources, claims, `TimeSpan`).

### Vérification des sources

`npm run verify:sources` a testé les 200 sources :

- **154** DOI/URL valides ;
- **4** pages protégées mais joignables ;
- **42** non concluantes (timeout ou blocage éditeur), sans indication de source inventée ;
- **0** DOI non résolu, **0** URL 404/410, **0** source sans lien.

Le détail est dans [`SOURCE_VERIFICATION.md`](SOURCE_VERIFICATION.md). Les résultats des URL peuvent varier d’une passe à l’autre selon les timeouts des éditeurs. Une source « non concluante » n’est pas une source validée : elle exige une vérification humaine.

---

## 2. Diagnostic transversal

### 2.1. Un récit politique et militaire partout au-dessus du seuil

La méthode fixe un seuil de vigilance : **≤ 50 %** de repères politiques ou militaires. Les 10 pays le dépassent.

| Pays | Politique/guerre | Couverture stricte de la matrice | Propositions |
| --- | ---: | ---: | ---: |
| France | 75 % | 30/126 (24 %) | 18 |
| Royaume-Uni | 80 % | 26/84 (31 %) | 18 |
| États-Unis | 61 % | 30/84 (36 %) | 18 |
| Allemagne | 88 % | 8/84 (10 %) | 18 |
| Italie | 93 % | 27/70 (39 %) | 18 |
| Espagne | 92 % | 51/70 (73 %) | 18 |
| Chine | 77 % | 0/70 (0 %) | 18 |
| Inde | 75 % | 26/56 (46 %) | 18 |
| Japon | 69 % | 35/70 (50 %) | 18 |
| Égypte | 87 % | 32/70 (46 %) | 18 |

Moyenne : **79,7 %**. Le problème n’est pas seulement quantitatif : les tags `politique` et `guerre` absorbent des phénomènes sociaux, coloniaux, religieux ou mémoriels. Une révision de la taxonomie est donc aussi importante qu’un ajout d’événements.

### 2.2. Huit angles morts communs

1. **Femmes et genre.** Les femmes sont absentes ou tokenisées dans les frises existantes. L’Allemagne, l’Italie et la Chine n’en nomment aucune ; l’Inde n’a aucune actrice ; la France les fait apparaître surtout par les institutions. Les propositions ajoutent Olympe de Gouges, Marie Curie, Emmeline Pankhurst, Jayaben Desai, Rosa Luxemburg, Clara Zetkin, Qiu Jin, Ambedkar, Hatshepsout, Murasaki Shikibu, etc.
2. **Travail et classes populaires.** Ouvriers, paysans, domestiques, artisans et travailleurs forcés sont sous-représentés. Les dossiers proposent Peterloo, le chartisme, Grunwick, la grève des mineurs, Haymarket, Tulsa, les Ciompi, le brigandage post-unitaire, les émeutes du riz, le travail forcé nazi.
3. **Minorités et peuples autochtones.** Aïnous, Ryūkyūens, Coréens du Japon, burakumin, Sinti et Roma, Sorbs, Dalits, Adivasis, Nubiens, Coptes, peuples autochtones des États-Unis, Juifs et Morisques d’Espagne, populations colonisées de France et du Royaume-Uni : les absences sont structurelles.
4. **Migrations et diasporas.** Windrush, Gastarbeiter, Bracero, immigration chinoise exclue, migrations italiennes, espagnoles, égyptiennes, Nubiens déplacés, rapatriés japonais : presque aucun de ces phénomènes n’est fiché.
5. **Environnement et territoire.** Le Dust Bowl, Silent Spring, le Vajont, Minamata, Fukushima, la Vanoise, le Prestige, la crue du fleuve Jaune, le Nil et le GERD sont absents ou réduits à un décor.
6. **Mémoire et commémorations.** Les monuments, lois mémorielles, excuses officielles, négationnismes et usages publics du passé ne sont pas traités comme des objets historiques distincts.
7. **Lieux hors capitale.** Paris, Londres, Berlin, Rome, Madrid, Pékin, Delhi, Tokyo et Le Caire dominent. Les dossiers proposent Manchester, Glasgow, Belfast, Cardiff, Bristol, Wuppertal, Leipzig, Bautzen, Naples, Palerme, Barcelone, Bilbao, Shanghai, Nanjing, Mumbai, Kolkata, Okinawa, Alexandrie, Assouan, etc.
8. **Histoire coloniale et impériale.** France (Algérie surtout), Royaume-Uni (Irlande, Inde, Kenya, Bengale), Allemagne (Herero/Nama), Italie (Libye, Éthiopie), Espagne (Cuba, Philippines, Sahara), États-Unis (Porto Rico, Philippines, Hawaï), Japon (Corée, Taïwan, Hokkaidō, Ryūkyū), Chine (traités inégaux, Tibet, Xinjiang) : l’empire est souvent une décoration, pas un système de coercition.

### 2.3. Périodisations : le national et la capitale comme cadre par défaut

| Pays | Verdict | Direction proposée |
| --- | --- | --- |
| France | Lisible mais politique et européenne ; 1492, 1610–1789 et 1945–1989 sont fragiles. | Garder 9 ères, renommer la Renaissance et la déplacer à 1494, scinder « Grand Siècle & Lumières », scinder ou renommer « Trente Glorieuses », expliciter 1989. |
| Royaume-Uni | Non publiable en l’état : récit anglais, impérial et londonien. | 8 ères ; scinder 1688–1914 à 1815 et 1945–2026 à 1979 ; ajouter une couche Irlande 1801–1998 ; renommer les libellés. |
| États-Unis | Lisible mais anglo-coloniale et téléologique. | Module pré-1607 ou borne à 1565 ; scinder 1861–1900 à 1877 ; scinder 1991–2026 à 2001 ; requalifier « hyperpuissance ». |
| Allemagne | Six ères cohérentes mais trop larges. | 9 séquences ; scinder 1517–1815 à 1648, 1815–1914 à 1871, 1914–1945 à 1933 ; requalifier 962 ; renommer 1945–1990. |
| Italie | Lisible mais étatique et militaire ; 1494 et 1945 sont des césures de guerre. | Garder 5 ères, renommer ; scinder l’ère 2 à 1348 et l’ère 3 à 1796 ; ajouter des marqueurs 1861, 1870, 1922, 1943, 1946, 1948, 1968–1978, 1992. |
| Espagne | Politique et téléologique ; 711 efface l’Ibérie antérieure, 1492 confond trois événements. | Ajouter un prologue -218/711 ; renommer « Al-Andalus & Reconquista » ; scinder 1936–1939/1939–1975 et 1975–1986/1986–2026 ; ajouter 1978. |
| Chine | Révision majeure : ère 1 téléologique, ère 2 longue de 2 133 ans, ère 3 vide. | Garder 5 macro-ères, renommer et sous-périodiser ; remplir 1912–1949 ; sous-périodes 1949–1957, 1958–1965, 1966–1976, 1978–1992, 1992–2001, 2001–2012, 2012–2026. |
| Inde | Révision majeure : « Civilisations anciennes » couvre 3 806 ans ; « Raj » est anachronique avant 1858. | 5 ères : Indus & Védique, empires classiques & régionaux, sultanats/Vijayanagara/Moghols, Compagnie & Raj, République. |
| Japon | Insuffisante : 538 efface la préhistoire, 794–1603 fusionne 809 ans. | 7 périodes avec préhistoire ; scinder 794–1603 à 1185 ; sous-périodiser 1945–2026. |
| Égypte | Lisible mais non savante : ère islamique de 1 157 ans, 1798 européocentrée. | Garder 5 ères ; scinder 641–1517/1517–1798 ; renommer « moderne et coloniale » ; sous-périodiser 1952–2026. |

### 2.4. Corrections factuelles à fort enjeu

Les 120 corrections ne sont pas toutes du même niveau. Une trentaine touchent des formulations qui peuvent induire en erreur :

- **Allemagne** : « Naissance du Saint-Empire » en 962 ; l’affichage des 95 thèses en 1517 ; Wannsee comme décision du génocide ; « ouverture » planifiée de la frontière en 1989 ; modalité d’unification de 1990.
- **Italie** : `it-ww2` commence en 1939 alors que l’Italie entre en guerre en juin 1940 ; la République est datée de 1946 alors que la Constitution entre en vigueur en 1948 ; la CEE est datée de 1957 alors que les traités entrent en vigueur en 1958.
- **Espagne** : 1898 ne fait pas perdre « les dernières colonies » (le Río de Oro/Sahara reste espagnol) ; Franco a gouverné 36 ans, pas 40 ; 711 et Covadonga sont présentés comme des commencements téléologiques.
- **Chine** : confusion 1911/1912 ; 1949 compresse 1949–1978 ; -1600 est une convention, pas une date certaine.
- **Inde** : `in-independance` confond indépendance et Partition ; « mutinerie des cipayes » sous-estime la révolte de 1857–1858 ; 1991 n’est pas un point unique.
- **Japon** : 538/552 ; Nara s’achève en 784, pas 794 ; Hiroshima confond bombardements, capitulation et occupation ; Fukushima confond séisme, tsunami et accident nucléaire.
- **Égypte** : Alexandrie -332/-331 ; Nasser n’est pas au pouvoir en 1952 ; Camp David 1978, traité 1979 ; l’indépendance de 1922 comporte quatre points réservés.
- **Royaume-Uni** : 410 est un processus, pas une fin ponctuelle ; Magna Carta n’est pas une « charte de droits » moderne ; le suffrage de 1918 est limité ; « résiste seul » ignore l’empire et les Alliés.
- **États-Unis** : Jamestown n’est pas l’origine nationale ; le 13e amendement comporte une exception pénale ; le Civil Rights Act de 1964 ne met pas fin à toute ségrégation ; la guerre froide n’est pas « sans conflit direct ».
- **France** : le Code civil est présenté comme une égalité générale sans ses limites genrées et coloniales ; la Révolution occulte les exclusions des femmes et des esclaves ; « Trente Glorieuses » 1945–1975 est placé dans une ère 1945–1989 ; la loi Veil est présentée comme une dépénalisation simple ; l’Algérie omet le FLN, les civils, la torture et les harkis.

### 2.5. Ce que les 180 propositions apportent

Les propositions ne sont pas un ajout uniforme : elles se répartissent en grands chantiers.

- **Femmes et genre** : Olympe de Gouges (1791), Marie Curie (1898), Emmeline Pankhurst, Jayaben Desai, Louise Otto-Peters, Rosa Luxemburg, Clara Zetkin, Qiu Jin, Hatshepsout, Shajar al-Durr, Hoda Shaarawi, Murasaki Shikibu, Clara Campoamor, Dolores Ibárruri, etc.
- **Colonialisme et empires** : Code noir (1685), prise d’Alger (1830), exposition coloniale (1931), génocide Herero/Nama (1904–1908), Amritsar (1919), famine du Bengale (1943), partition de l’Inde (1947), Hokkaidō/Aïnous (1869), annexion de la Corée (1910), occupation britannique de l’Égypte (1882), guerre hispano-américaine (1898).
- **Travail et classes populaires** : Peterloo (1819), chartisme (1838), Grunwick (1976), grève des mineurs (1984), Haymarket (1886), Tulsa (1921), Ciompi (1378), brigandage post-unitaire (1861), émeutes du riz (1918), travail forcé nazi (1939–1945).
- **Migrations** : Windrush (1948), Gastarbeiter (1961), Bracero (1942), Chinese Exclusion Act (1882), émigration italienne (1876), émigration espagnole (1960), Nubiens déplacés (1963), rapatriés japonais.
- **Environnement** : Vanoise (1963), Silent Spring (1962), Vajont (1963), Minamata (1956), Fukushima (2011), Prestige (2002), Dust Bowl (1930), crue du fleuve Jaune (1938), Nil et GERD.
- **Mémoire** : Vél’ d’Hiv (1942), discours de Chirac (1995), 17 octobre 1961, foulards de Creil (1989), révoltes de 2005, accord de Paris (2015), IVG constitutionnelle (2024), loi espagnole de mémoire démocratique (2022), mémoire coloniale allemande, mémoire de 1945 au Japon.
- **Politique et institutions** : union avec l’Irlande (1801), NHS (1948), dévolution (1997), Brexit (2016), 19e amendement (1920), Voting Rights Act (1965), Constitution indienne (1950), État d’urgence (1975), République de Chine (1912), 4 Mai (1919), Nanjing (1937), RPC (1949), etc.

---

## 3. Synthèse pays par pays

### France

- **Périodisation.** Garder les 9 ères, mais renommer la Renaissance et la déplacer à 1494 ; scinder « Grand Siècle & Lumières » ; scinder ou renommer « Trente Glorieuses » (1945–1975 / 1975–1989) ; renommer « Temps présents » et expliciter 1989, absent des repères français.
- **Angles morts.** Femmes, histoire coloniale (l’Algérie est la seule colonie représentée), immigration, environnement, arts et culture de masse, religion vécue, mémoire. 75 % de repères politiques ou militaires.
- **Priorités.** Code noir (1685), Olympe de Gouges (1791), prise d’Alger (1830), exposition coloniale (1931), Vél’ d’Hiv (1942), 17 octobre 1961, indépendance de l’Algérie (1962), Vanoise (1963), loi Neuwirth (1967), Marche pour l’égalité (1983), foulards de Creil (1989), révoltes de 2005, accord de Paris (2015), IVG dans la Constitution (2024).
- **Corrections.** Code civil, Révolution, Seconde Guerre mondiale, Trente Glorieuses, loi Veil, guerre d’Algérie, laïcité, Maastricht, euro, attentats de 2015.
- **Chiffres.** 20 sources, 18 propositions, 11 acteurs, 12 lieux, 15 omissions, matrice 30/62/34/0 sur 126 cellules.

### Royaume-Uni

- **Périodisation.** Non publiable en l’état : récit anglais, impérial et londonien. 8 ères proposées ; scinder 1688–1914 à 1815 et 1945–2026 à 1979 ; ajouter une couche Irlande 1801–1998 ; renommer « Antiquité & invasions » et « Renaissance & Réforme ».
- **Angles morts.** Irlande (1801, famine, 1916, partition, Troubles), Écosse et pays de Galles, empire et violence coloniale (Amritsar, Bengale, Kenya, partition de l’Inde), femmes tokenisées, migrations, environnement, mémoire.
- **Priorités.** Union avec l’Irlande (1801), abolition de l’esclavage (1833), Peterloo (1819), chartisme (1838), grande famine irlandaise (1845), agitation des crofters (1882), Amritsar (1919), famine du Bengale (1943), partition de l’Inde (1947), Windrush (1948), Tryweryn (1965), Grunwick (1976), grève des mineurs (1984), Stephen Lawrence (1993), dévolution (1997), Brexit (2016).
- **Corrections.** 410, Magna Carta, peste noire, guerres des Trois Royaumes, Bill of Rights, 1707/1801, révolution industrielle, abolition, Première Guerre mondiale, suffrage de 1918, Seconde Guerre mondiale, NHS, Thatcher, accord du Vendredi saint, Brexit.
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 15 omissions, matrice 26/33/25/0 sur 84 cellules.

### États-Unis

- **Périodisation.** Six ères lisibles mais anglo-coloniales et téléologiques. Ajouter un module pré-1607 ou une borne à 1565 ; scinder 1861–1900 à 1877 (Reconstruction / Jim Crow) ; scinder 1991–2026 à 2001 ; requalifier « hyperpuissance ».
- **Angles morts.** Peuples autochtones, esclavage avant 1861, femmes, travail, migrations, territoires et empire insulaire, environnement, après-11-Septembre, mémoire.
- **Priorités.** 1619, révolte des Pueblo (1680), Indian Removal Act (1830), Guadalupe Hidalgo (1848), Seneca Falls (1848), Chinese Exclusion Act (1882), Haymarket (1886), guerre hispano-américaine (1898), 19e amendement (1920), Tulsa (1921), Dust Bowl (1930), internement des Japonais-Américains (1942), Bracero (1942), Montgomery (1955), Silent Spring (1962), Voting Rights Act (1965), Stonewall (1969), Katrina (2005).
- **Corrections.** Jamestown, indépendance, Constitution, Louisiane, guerre civile, 13e amendement, chemin de fer, guerre froide, Civil Rights Act.
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 15 omissions, matrice 30/32/0/22 sur 84 cellules. **22 cellules non traitées**, le plus grand chantier avec l’Italie et la Chine.

### Allemagne

- **Périodisation.** Garder 962 mais requalifier : couronnement d’Otton Ier, Empire composite, pas naissance d’un État allemand. 9 séquences ; scinder 1517–1815 à 1648, 1815–1914 à 1871, 1914–1945 à 1933 ; renommer 1945–1990 « Occupation et deux Allemagnes ».
- **Angles morts.** Femmes (aucune nommée), travail et travail forcé, migrations et Gastarbeiter, Sinti et Roma, Sorbs, mémoire coloniale (Herero/Nama), environnement, histoire régionale.
- **Priorités.** 95 thèses et Réforme (1517), guerre des Paysans (1524–1525), guerre de Trente Ans (1618–1648), Assemblée de Francfort (1848), social-démocratie (1863–1891), ADF (1865), génocide Herero/Nama (1904–1908), droit de vote des femmes (1918–1919), lois de Nuremberg (1935), travail forcé (1939–1945), Shoah, Porajmos (1944), expulsions (1945–1950), 17 juin 1953, accord germano-turc (1961), 1968, 1989–1990, sortie du nucléaire (2011).
- **Corrections.** `de-otto`, `de-luther`, `de-30ans`, `de-1848`, `de-unification`, `de-weimar`, `de-inflation`, `de-ww2`, `de-wannsee`, `de-rfa`, `de-1989`, `de-1990`.
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 15 omissions, matrice 8/38/38/0 sur 84 cellules.

### Italie

- **Périodisation.** Garder 5 ères mais renommer ; scinder l’ère 2 à 1348 (peste noire) et l’ère 3 à 1796 (invasion napoléonienne) ; ajouter des marqueurs 1861, 1870, 1922, 1943, 1946, 1948, 1968–1978, 1992. 1494 et 1945 sont des césures de guerre, pas des ruptures sociales.
- **Angles morts.** Femmes (aucune), travailleurs, Mezzogiorno, religions, sciences, environnement, migrations, minorités linguistiques, citoyenneté.
- **Priorités.** Spartacus (73–71 av. J.-C.), édit de Milan (313), peste noire (1347), Ciompi (1378), Catherine de Sienne (1377), ghetto de Venise (1516), concile de Trente (1545–1563), Galilée (1633), brigandage post-unitaire (1861–1865), émigration de masse (1876–1915), lois raciales (1938), Résistance (1943–1945), miracle économique (1958–1963), 1968, affaire Moro (1978), maxi-procès (1986–1987), Vajont (1963), immigration et loi 91/1992.
- **Corrections.** `it-476`, `it-medicis`, `it-guerres`, `it-unification`, `it-rome-capitale`, `it-mussolini`, `it-ww2` (1940–1945), `it-republique` (1946/1948), `it-rome-traite` (1957/1958).
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 15 omissions, matrice 27/18/2/23 sur 70 cellules. **23 cellules non traitées.**

### Espagne

- **Périodisation.** Ajouter un prologue -218/711 (Ibérie, Hispanie romaine, royaume wisigoth) ; renommer « Al-Andalus & Reconquista » en « Al-Andalus et royaumes chrétiens » ; scinder 1936–1939 (guerre) et 1939–1975 (franquisme) ; scinder 1975–1986 (transition) et 1986–2026 (Espagne européenne) ; ajouter 1978.
- **Angles morts.** Histoire antérieure à 711, pluralité d’Al-Andalus, juifs séfarades, Morisques, Roms, femmes, anarchisme, colonies et 1898, guerre civile, répression, exil, mémoires concurrentes, Catalogne et Pays basque, 15-M.
- **Priorités.** Hispanie romaine (-218), concile de Tolède (589), califat de Cordoue (929), traductions de Tolède (1140), expulsion des Juifs (1492), Comuneros (1520), expulsion des Morisques (1609), Nueva Planta (1707), rafle des Roms (1749), abolition de l’esclavage (1873), Seconde République (1931), suffrage féminin (1931), Retirada (1939), émigration (1960), Prestige (2002), cessez-le-feu d’ETA (2011), 15-M (2011), loi de mémoire démocratique (2022).
- **Corrections.** `es-711`, `es-covadonga`, `es-mariage`, `es-grenade`, `es-colomb`, `es-armada`, `es-independance`, `es-1898`, `es-civile`, `es-franco` (36 ans, pas 40), `es-constitution`, `es-catalogne`, `es-cee`.
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 13 omissions, matrice 51/7/12/0 sur 70 cellules.

### Chine

- **Périodisation.** Révision majeure : garder 5 macro-ères pour la navigation, mais renommer « Shang, Zhou et Royaumes combattants », « Empires et divisions », remplir 1912–1949, sous-périodiser 1949–1978 et 1978–2026. -1600 est une convention ; la Xia est débattue.
- **Angles morts.** Ère 1912–1949 vide, femmes, minorités ethniques (Tibet, Xinjiang, Mongols, Zhuang), paysans, famine, Révolution culturelle, environnement, migrations et hukou, traités inégaux, ports ouverts.
- **Priorités.** République de Chine et Seconde Révolution (1912), Nouvelle Culture (1915), 4 Mai (1919), fondation du PCC (1921), purge de Shanghai (1927), Mukden (1931), Longue Marche (1934), Nanjing (1937), crue du fleuve Jaune (1938), loi sur le mariage (1950), Tibet (1951), Grand Bond et famine (1958), Révolution culturelle (1966), enfant unique (1979), Tiananmen (1989), Hong Kong (1997), OMC (2001), Wuhan (2020).
- **Corrections.** `cn-shang`, `cn-zhou`, `cn-qin`, `cn-han`, `cn-tang`, `cn-song`, `cn-yuan`, `cn-ming`, `cn-qing`, `cn-opium`, `cn-1911`, `cn-1949`, `cn-deng`.
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 15 omissions, matrice 0/50/0/20 sur 70 cellules. **Aucune cellule strictement couverte ; 20 non traitées.**

### Inde

- **Périodisation.** Révision majeure : scinder « Civilisations anciennes » en Indus & Védique (-2600/-600) et empires classiques & régionaux (-600/1200) ; renommer « Raj britannique » en « Compagnie & Raj » (1757–1858 / 1858–1947) ; cinq ères proposées.
- **Angles morts.** Castes et Dalits, Adivasis, femmes, minorités religieuses, Partition, langues, environnement, histoire du Sud et du Deccan.
- **Priorités.** Corpus védique (-1500), Bouddha et Mahavira (-600), littérature sangam (-300), empire chola (848), Vijayanagara (1336), bhakti et soufisme (1200), Khalsa (1699), engagisme (1834), régime colonial des famines (1770), satyagraha de Mahad (1927), marche du sel (1930), famine du Bengale (1943), Constitution (1950), réorganisation des États (1956), révolution verte (1966), État d’urgence (1975), affaire Shah Bano (1985), droits forestiers (2006).
- **Corrections.** `in-indus`, `in-maurya`, `in-gupta`, `in-delhi`, `in-moghol`, `in-eic`, `in-cipayes`, `in-congres`, `in-amritsar`, `in-independance`, `in-gandhi`, `in-liberalisation`.
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 15 omissions, matrice 26/30/0/0 sur 56 cellules.

### Japon

- **Périodisation.** Ajouter une ère « Préhistoire & Protohistoire » (-14 000/538) ; scinder « Heian & shoguns » à 1185 (Heian / Japon médiéval) ; sous-périodiser 1945–2026. 538 est une convention religieuse, pas une origine.
- **Angles morts.** Préhistoire, femmes, Aïnous, Ryūkyūens/Okinawaïens, Coréens, burakumin, colonialisme et guerre (Nanjing), catastrophes et environnement, migrations, mémoire, vieillissement.
- **Priorités.** Jōmon, Yayoi, Murasaki Shikibu et les femmes de Heian, édit de libération et Suiheisha (1871), invasions de la Corée (1592), colonisation de Hokkaidō et dépossession ainu (1869), annexion de Ryūkyū (1879), filature de Tomioka (1872), guerre sino-japonaise (1894), annexion de la Corée (1910), émeutes du riz (1918), séisme du Kantō (1923), guerre de Quinze Ans (1931), Constitution et suffrage des femmes (1945–1947), Minamata (1956), réversion d’Okinawa (1972), bulle (1991), vieillissement (2008).
- **Corrections.** `jp-bouddhisme` (538/552), `jp-nara` (784), `jp-heian` (1185), `jp-kamakura` (1185/1192), `jp-mongols`, `jp-portugais`, `jp-edo`, `jp-perry`, `jp-meiji`, `jp-russie`, `jp-hiroshima`, `jp-1964`, `jp-fukushima`.
- **Chiffres.** 20 sources, 18 propositions, 11 acteurs, 12 lieux, 15 omissions, matrice 35/29/6/0 sur 70 cellules.

### Égypte

- **Périodisation.** Garder 5 ères mais scinder l’ère islamique en 641–1517 et 1517–1798 ; renommer l’ère moderne « Égypte moderne et coloniale » et expliciter 1798 ; sous-périodiser 1952–1970, 1970–1981, 1981–2011, 2011–2026.
- **Angles morts.** 1919, 1882, islam médiéval, paysans, femmes non élitaires, Coptes, Nubiens, environnement/Nil, arts et culture de masse.
- **Priorités.** Crise du Nil (-2200), expédition de Pount (-1470), grève de Deir el-Médineh (-1157), temple juif d’Éléphantine (-410), Hypatie (415), concile de Chalcédoine (451), famine fatimide (1065), septième croisade (1249), peste noire (1347), conquête ottomane (1517), Muhammad Ali (1805), occupation britannique (1882), révolution de 1919, Union féministe égyptienne (1923), déplacement des Nubiens (1963), guerre des Six Jours (1967), émeutes du pain (1977), Rabaa (2013).
- **Corrections.** `eg-unification`, `eg-alexandrie` (-331), `eg-cleopatre`, `eg-arabes`, `eg-caire`, `eg-bonaparte`, `eg-suez`, `eg-independance`, `eg-nasser`, `eg-suez-crise`, `eg-paix`, `eg-tahrir`, `eg-ramses`, `eg-akhenaton`.
- **Chiffres.** 20 sources, 18 propositions, 12 acteurs, 12 lieux, 15 omissions, matrice 32/32/3/3 sur 70 cellules.

---

## 4. Plan d’intégration

### P0 — Consolider la couche documentaire

- Les 10 dossiers sont complets et passent `npm run audit:dossiers` (0 erreur, 0 avertissement).
- Les 200 sources passent `npm run verify:sources` sans DOI non résolu ni URL introuvable.
- Mettre à jour l’index [`audits/README.md`](audits/README.md) et archiver cette synthèse.

### P1 — Corriger les erreurs factuelles les plus visibles

Commencer par les corrections qui changent le sens d’un repère, pas par les ajouts :

- France : `fr-code-civil`, `fr-revolution`, `fr-trente`, `fr-veil`, `fr-algerie`, `fr-laicite`, `fr-charlie`.
- Royaume-Uni : `uk-magna`, `uk-vote`, `uk-ww1`, `uk-ww2`, `uk-union`, `uk-esclavage`.
- États-Unis : `us-jamestown`, `us-constitution`, `us-civil-war`, `us-13e`, `us-civil-rights`, `us-cold-war`.
- Allemagne : `de-otto`, `de-luther`, `de-30ans`, `de-wannsee`, `de-1989`, `de-1990`.
- Italie : `it-ww2`, `it-republique`, `it-rome-traite`.
- Espagne : `es-711`, `es-covadonga`, `es-1898`, `es-franco`.
- Chine : `cn-shang`, `cn-1911`, `cn-1949`, `cn-deng`.
- Inde : `in-independance`, `in-cipayes`, `in-liberalisation`.
- Japon : `jp-bouddhisme`, `jp-nara`, `jp-heian`, `jp-hiroshima`, `jp-fukushima`.
- Égypte : `eg-alexandrie`, `eg-nasser`, `eg-paix`, `eg-independance`.

### P1 — Ajouter un premier lot d’événements

Deux à quatre par pays, choisis pour combler les angles morts les plus structurants :

| Pays | Premier lot proposé |
| --- | --- |
| France | Code noir (1685), Olympe de Gouges (1791), 17 octobre 1961, indépendance de l’Algérie (1962) |
| Royaume-Uni | Union avec l’Irlande (1801), famine irlandaise (1845), Amritsar (1919), partition de l’Inde (1947) |
| États-Unis | 1619, Indian Removal Act (1830), Seneca Falls (1848), Tulsa (1921) |
| Allemagne | ADF (1865), Herero/Nama (1904–1908), droit de vote des femmes (1918), travail forcé (1939–1945) |
| Italie | Ciompi (1378), brigandage (1861–1865), émigration (1876–1915), Résistance (1943–1945) |
| Espagne | Hispanie romaine (-218), expulsion des Juifs (1492), suffrage féminin (1931), 15-M (2011) |
| Chine | République de Chine (1912), 4 Mai (1919), Nanjing (1937), RPC (1949) |
| Inde | Mahad (1927), marche du sel (1930), famine du Bengale (1943), Constitution (1950) |
| Japon | Jōmon, Hokkaidō/Aïnous (1869), annexion de la Corée (1910), Minamata (1956) |
| Égypte | Occupation britannique (1882), révolution de 1919, Union féministe (1923), Nubiens (1963) |

### P2 — Instrumenter le schéma de preuve

Les dossiers fournissent déjà les acteurs, lieux, sources et claims. Il reste à :

1. ajouter `actors`, `places`, `sources`, `claims` et `time` (`TimeSpan`) dans `data.js` ;
2. convertir les propositions retenues en fiches `templates/event-record.yaml` ;
3. relier chaque fiche à au moins deux sources indépendantes ;
4. remplacer `grok` comme lien de lecture par un champ `article` distinct des `sources` ;
5. conserver les claims contradictoires en statut `disputed`.

### P3 — Double lecture et sign-off

- Faire relire chaque dossier par un lecteur pays et un lecteur méthode.
- Arbitrer les points disputés signalés dans les rapports : 962, 1517, Wannsee, 1990, 1494, 1798, 1911, 538/552, Alexandrie -331, etc.
- Mesurer le kappa sur un échantillon stratifié.
- Renseigner `verdict: passed|conditional`, les scores et `signoff`.
- Ne publier qu’après un score ≥ 80/100 et aucun S1.

### P4 — Étendre à de nouveaux pays

Ne pas ouvrir de nouveaux pays avant que les 10 pilotes aient :

- une couche événement instrumentée ;
- une double lecture ;
- un registre de sources vérifié ;
- un sign-off explicite.

---

## 5. Limites

- **Première version, non signée.** Les 10 dossiers sont des travaux experts, pas des validations académiques. Aucun kappa, aucun Delphi, aucun sign-off.
- **Sources non concluantes.** 42 sources n’ont pas pu être testées automatiquement lors de la dernière passe (timeout, blocage éditeur). Elles ne sont pas invalidées, mais elles ne sont pas confirmées.
- **Dates disputées.** Les rapports signalent eux-mêmes des incertitudes : 962, 1517, 1798, 1911, 538/552, Alexandrie -331, Nara 784, etc.
- **Propositions non publiées.** Les 180 événements, 118 acteurs et 120 lieux sont une **file de revue**. Ils ne sont pas dans `data.js` et ne doivent pas y entrer sans arbitrage éditorial.
- **Biais des agents.** Chaque agent a ses angles morts. La méthode prévoit précisément une double lecture et un expert de sensibilité pour les corriger.
- **Couverture stricte.** 34 % seulement des cellules de matrice sont couvertes au sens strict (acteur + lieu + source). Les 42 % de cellules partielles sont des dettes, pas des acquits.

---

## 6. Fichiers et commandes

### Dossiers

```text
audits/<pays>/
  country-audit.yaml
  coverage-matrix.csv
  source-register.csv
  omissions.yaml
  proposals.yaml
  REPORT.md
```

### Rapports

- [`TIMELINE_AUDIT.md`](TIMELINE_AUDIT.md) — audit structurel des frises.
- [`SOURCE_VERIFICATION.md`](SOURCE_VERIFICATION.md) — vérification DOI/URL des 200 sources.
- [`AUDIT_SYNTHESIS.md`](AUDIT_SYNTHESIS.md) — cette synthèse.

### Commandes

```bash
npm run audit:timeline          # audit structurel global
npm run audit:timeline:strict   # échoue si la cible v1.0 est < 80/100
npm run audit:dossiers          # contrôle des 10 dossiers pays
npm run verify:sources          # vérifie DOI et URL des sources
npm run verify                  # vérifie les 189 pages Grokipedia
```

---

**Conclusion.** Les 10 pays pilotes disposent désormais d’une **première version experte, sourcée et auditables**. Le résultat majeur n’est pas le score de 17,9/100 : c’est que les 148 omissions, 120 corrections et 180 propositions sont nommées, localisées et vérifiables. La frise peut maintenant être corrigée sans prétendre qu’elle était complète.
