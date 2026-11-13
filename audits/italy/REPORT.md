# Italie — rapport d’audit v1.0

**Objet.** Audit de la frise `italy` de Vectemporel : 5 ères, 15 repères, domaine -753 → 2026. Dossier de première version, non signé, destiné à une revue éditoriale. Date de consultation des sources : 2026-11-13.

## 1. Verdict de périodisation

La périodisation actuelle est **lisible mais étatique et militaire**. Elle découpe l’histoire italienne en cinq blocs de souveraineté : Rome, Moyen Âge/Renaissance, guerres et Risorgimento, Italie libérale et fasciste, République. Ce récit a l’avantage de la continuité avec l’interface et de la simplicité pour le grand public. Il a un coût : les continuités sociales, religieuses, environnementales et migratoires passent sous les césures.

Trois constats quantitatifs suffisent à le montrer.

1. **15 repères pour 2 779 ans**, soit un repère tous les 185 ans en moyenne. Mais la distribution est très inégale : 4 repères pour l’ère romaine, **1 seul pour l’ère 2 (476-1494)**, 3 pour l’ère 3 (1494-1871), 3 pour l’ère 4 (1871-1945), 4 pour l’ère 5 (1945-2026).
2. **14 des 15 repères sont tagués `politique` ou `guerre`** ; un seul (`it-euro`) ne l’est pas. Les tags `societe` (1 occurrence), `arts` (1), `economie` (2) sont marginaux.
3. **Un seul lieu non romain est explicitement nommé** dans les titres ou sous-titres : Florence pour les Médicis (1434). Les autres repères sont nationaux, romains ou péninsulaires.

La césure de **1494** est le point le plus discutable. Elle correspond au début des guerres d’Italie et à l’entrée de Charles VIII : c’est une borne **politique et militaire**, pas une rupture sociale ou culturelle. La Renaissance commence avant 1494 et se prolonge après ; l’économie d’Ancien Régime, les dominations espagnole puis autrichienne (1559-1796), les Lumières et les réformes des Habsbourg et des Bourbons ne sont représentées par aucun repère. L’ère 3 couvre 377 ans avec trois événements, dont deux (1861, 1870) à la fin.

La césure de **1945** est également ambiguë. 1945 est la fin de la guerre et de l’occupation, pas la fondation institutionnelle de la République : le référendum a lieu le 2 juin 1946, la Constitution entre en vigueur le 1er janvier 1948. Le récit actuel mélange trois dates distinctes.

**Verdict provisoire.** Conserver l’architecture en cinq ères pour la vue d’ensemble, mais :

- renommer les ères pour expliciter leur contenu politique ;
- ajouter des marqueurs internes 1000, 1348, 1559, 1796, 1861, 1870, 1922, 1943, 1946, 1948, 1968-1978, 1992 ;
- envisager de scinder l’ère 2 à 1348 (peste noire) et l’ère 3 à 1796 (invasion napoléonienne) ;
- conserver les périodisations alternatives (sociale/économique, culturelle/religieuse/environnementale) dans `country-audit.yaml`, sans les imposer à l’interface.

Les bornes ne sont pas également solides. 476 est une convention historiographique (déposition de Romulus Augustulus), pas une fin instantanée. 1871 est solide comme achèvement territorial, mais 1861 et 1870 sont plus parlants pour l’Unité. 1922 est une rupture interne majeure que l’ère 4 ne signale pas.

## 2. Angles morts et biais de sélection

### 2.1. Les femmes

**Aucune femme n’est présente dans les 15 repères.** Le seul événement tagué `societe` est la fondation légendaire de Rome. Les propositions introduisent Catherine de Sienne (1377-1380), Anita Garibaldi (Risorgimento), Nilde Iotti (République) et les partigiane (1943-1945). Ce n’est pas un quota : ces figures permettent de traiter l’autorité religieuse féminine, le volontariat transnational, l’entrée des femmes dans les institutions et la participation à la Résistance. D’autres chantiers restent ouverts : travail féminin, maternité sous le fascisme, histoire de la sexualité, divorces et avortement.

### 2.2. Les travailleurs et les classes populaires

Aucun repère ne porte sur le travail, l’esclavage, le servage, les métiers urbains, les grèves ou les conditions ouvrières. Les propositions Spartacus (73-71 av. J.-C.), Ciompi (1378), 1968-1969 et le miracle économique (1958-1963) comblent partiellement ce vide. Le monde rural, les métayers et les journaliers restent absents.

### 2.3. Le Mezzogiorno

Le Sud apparaît seulement à travers l’unification (1861) et la prise de Rome (1870), comme périphérie d’un récit septentrional. Le brigandage post-unitaire (1861-1865), la mafia (maxi-procès de 1986-1987), l’émigration et les migrations internes sont proposés. La construction du stéréotype méridional est un objet d’histoire en soi : elle oppose un Nord moderne à un Sud arriéré et masque les formes de pouvoir locales.

### 2.4. Religion

Aucun repère religieux. La papauté traverse pourtant toute la chronologie, des États pontificaux à la question romaine, des accords du Latran (1929) au concile Vatican II. Les propositions Édit de Milan (313), Catherine de Sienne (1377), ghetto de Venise (1516) et concile de Trente (1545-1563) ouvrent le dossier. Les rapports Église-État contemporains, la sécularisation et le pluralisme religieux restent à traiter.

### 2.5. Arts, sciences et environnement

La Renaissance est réduite aux Médicis (1434), sans Dante, Giotto, Masaccio, Léonard, Michel-Ange, l’imprimerie ni les cours. Aucun repère scientifique ; le procès de Galilée (1633) est proposé. Aucun repère environnemental ; la catastrophe du Vajont (1963) est proposée, mais l’histoire agraire, les séismes, la pollution industrielle (ILVA de Tarente, Terra dei Fuochi) et le climat restent des dettes.

### 2.6. Migrations et minorités

Aucun repère migratoire. L’Italie est pourtant un pays d’émigration de masse (1876-1915), un pays d’immigration depuis les années 1970-1980, et un territoire de migrations internes du Sud vers le Nord. Les propositions couvrent l’émigration, les migrations internes et l’immigration/citoyenneté (loi 91/1992). Les minorités linguistiques (Südtirol, slovène, arbëreshë, grecque, ladine) ne sont pas encore des fiches : c’est une omission documentée, pas un oubli silencieux.

### 2.7. Colonialisme et mémoire

L’empire colonial italien (Érythrée, Somalie, Libye, Éthiopie) est absent. Les lois raciales de 1938 sont proposées, mais la Shoah en Italie, les camps, les déportations de 1943-1945 et la mémoire coloniale restent à documenter. Les foibe et l’exode istro-dalmate sont signalés comme sujet disputé, avec un besoin de sources italiennes, slovènes et croates.

### 2.8. Lieux et échelles

La frise est massivement romaine et nationale. Les propositions ajoutent Milan, Florence, Venise, Naples, Palerme, Turin, Trente, Sienne, Longarone, Lampedusa et Gênes. Il ne s’agit pas d’une collection de vignettes : chaque lieu est daté et associé à une fonction (capitale, port, ville industrielle, frontière, lieu de mémoire).

## 3. Propositions d’événements (18)

Les 18 propositions sont détaillées dans `proposals.yaml`. Le tableau ci-dessous donne la logique éditoriale.

| ID | Date | Proposition | Domaine principal | Pourquoi |
| --- | --- | --- | --- | --- |
| PROP-001 | -73/-71 | Révolte de Spartacus | Économie & travail | Esclavage, peur sociale, répression romaine. |
| PROP-002 | 313 | Édit de Milan | Religions | Tolérance religieuse, Constantin et Licinius, Milan hors Rome. |
| PROP-003 | 1347-1351 | Peste noire | Société & démographie | Mortalité, travail, mesures sanitaires. |
| PROP-004 | 1378 | Révolte des Ciompi | Économie & travail | Conflit du travail dans la Florence communale. |
| PROP-005 | 1377-1380 | Catherine de Sienne | Femmes, genre | Autorité religieuse et politique d’une femme. |
| PROP-006 | 1516 | Ghetto de Venise | Peuples & minorités | Ségrégation urbaine des Juifs. |
| PROP-007 | 1545-1563 | Concile de Trente | Religions | Réforme catholique, institutions, arts. |
| PROP-008 | 1633 | Procès de Galilée | Sciences | Science, cour, censure. |
| PROP-009 | 1861-1865 | Brigandage post-unitaire | Guerres & société | Face violente de l’Unité, stéréotype méridional. |
| PROP-010 | 1876-1915 | Émigration de masse | Migrations | Diasporas, familles, économie des remises. |
| PROP-011 | 1938 | Lois raciales | Droit & minorités | Persécution antisémite d’État. |
| PROP-012 | 1943-1945 | Résistance | Guerre & société | Guerre civile, libération, rôle des femmes. |
| PROP-013 | 1958-1963 | Miracle économique et migrations internes | Économie & société | Industrialisation, urbanisation, Sud/Nord. |
| PROP-014 | 1968-1969 | 1968 et l’automne chaud | Société & travail | Étudiants, ouvriers, féministes. |
| PROP-015 | 1978 | Affaire Moro | Politique & mémoire | Violence politique, état d’exception. |
| PROP-016 | 1986-1992 | Mafia et maxi-procès | Justice & mémoire | Cosa Nostra, Falcone et Borsellino. |
| PROP-017 | 1963 | Catastrophe du Vajont | Environnement & techniques | Risque industriel, responsabilité publique. |
| PROP-018 | 1980-2000 | Immigration et citoyenneté | Migrations & droit | Loi 91/1992, jus sanguinis, société multiculturelle. |

**Équilibre.** 4 propositions sont hors politique/guerre au sens des tags (peste noire, Catherine de Sienne, émigration, Vajont), 5 concernent des femmes ou des groupes minorisés (Catherine, ghetto, lois raciales, Résistance, immigration), douze lieux sont proposés dont onze hors de Rome, et le Vajont couvre l’environnement et la mémoire. Les 18 propositions ne remplacent pas les 15 repères existants : elles les complètent et les contestent.

## 4. Corrections des événements existants

Neuf corrections sont argumentées dans `proposals.yaml`. Les principales :

- **`it-476`** : 476 est une convention, pas une fin instantanée. La déposition de Romulus Augustulus par Odoacre laisse intactes les continuités byzantines, gothiques et lombardes.
- **`it-medicis`** : 1434 est le retour d’exil et la consolidation de Cosme de Médicis, pas un « début » de la Renaissance. Le mécénat est un instrument de pouvoir, et Florence n’est pas toute l’Italie.
- **`it-guerres`** : les guerres d’Italie (1494-1559) ne sont pas seulement un choc culturel. Il faut nommer Charles VIII, Louis XII, François Ier, Charles Quint, les papes, la paix de Cateau-Cambrésis (1559), Naples, Milan et Florence.
- **`it-unification`** : 1861 est incomplet (Veneto en 1866, Rome en 1870). L’Unité s’accompagne de plébiscites, de volontaires, mais aussi du brigandage et de sa répression dans le Mezzogiorno.
- **`it-rome-capitale`** : la « fin du pouvoir temporel » de 1870 ne règle pas la question romaine, réglée en 1929 par les accords du Latran.
- **`it-mussolini`** : la marche sur Rome (27-29 octobre 1922) aboutit à une nomination royale (30 octobre), suivie de la construction progressive de la dictature (Aventin, lois fascistissimes de 1925-1926).
- **`it-ww2`** : pour l’Italie, la guerre commence le 10 juin 1940, non en 1939. L’armistice du 8 septembre 1943 ouvre l’occupation allemande, la guerre civile et la Résistance, jusqu’à la Libération du 25 avril 1945.
- **`it-republique`** : distinguer le référendum du 2 juin 1946, l’élection de la Constituante, la promulgation de 1947 et l’entrée en vigueur de la Constitution le 1er janvier 1948.
- **`it-rome-traite`** : les traités de Rome sont signés le 25 mars 1957 et entrent en vigueur le 1er janvier 1958. La CEE ne « naît » pas en 1957 au sens juridique.

**Non corrigés faute de source dans ce registre** : `it-rome` (fondation légendaire), `it-rep-romaine` (date traditionnelle de -509), `it-empire` (-27), `it-ww1` (1915), `it-tangentopoli` (1992), `it-euro` (1999-2002). Ces corrections sont renvoyées à la seconde lecture.

## 5. Acteurs et lieux à ajouter

### 5.1. Acteurs (12)

| Acteur | Type | Période | Apport |
| --- | --- | --- | --- |
| Catherine de Sienne | individuelle | ERA-2 | Autorité religieuse et politique, lettres, retour de la papauté à Rome. |
| Anita Garibaldi | individuelle | ERA-3 | Volontariat transnational, Brésil/Uruguay/Italie, mémoire du Risorgimento. |
| Nilde Iotti | individuelle | ERA-5 | Constituante, première femme présidente de la Chambre (1979). |
| Partigiane e partigiani | collective | ERA-4 | Résistance, rôle des femmes, choix individuels. |
| Operai FIAT | collective | ERA-5 | Automne chaud, syndicalisme, conflits du travail. |
| Migranti meridionali | collective | ERA-5 | Migrations internes, urbanisation, miracle économique. |
| Giuseppe Garibaldi | individuelle | ERA-3 | Volontaires, guerre, mémoire disputée. |
| Camillo Benso di Cavour | individuelle | ERA-3 | Diplomatie, État, contraintes et contre-pouvoirs. |
| Benito Mussolini | individuelle | ERA-4 | Régime, violence, consentement, guerre, mémoire. |
| Alcide De Gasperi | individuelle | ERA-5 | Reconstruction, Europe, Atlantique, coalitions. |
| Giovanni Falcone | individuelle | ERA-5 | Justice antimafia, maxi-procès, mémoire civique. |
| Paul III | individuelle | ERA-3 | Concile de Trente, Réforme catholique, diplomatie. |

Trois femmes individuelles (Catherine, Anita, Nilde), un collectif mixte (partigiane e partigiani), trois collectifs au total (partigiani, ouvriers FIAT, migrants méridionaux) et une figure transnationale (Anita Garibaldi) sont représentés. Les dirigeants sont documentés par leurs ressources, contraintes, réseaux, contre-pouvoirs et postérité, pas comme des vignettes héroïques.

### 5.2. Lieux (12)

| Lieu | Hiérarchie | Fonctions | Période |
| --- | --- | --- | --- |
| Rome | impériale | Capitale impériale, siège papal, capitale nationale | ERA-1 à ERA-5 |
| Milan | régionale | Résidence impériale, industrie, ville ouvrière | ERA-1, ERA-5 |
| Florence | régionale | Commune, banque, mécénat, Ciompi, Galilée | ERA-2, ERA-3 |
| Venise | régionale | République maritime, port, ghetto | ERA-2, ERA-3 |
| Naples | régionale | Capitale des Deux-Siciles, port, Mezzogiorno | ERA-3, ERA-4 |
| Palerme | régionale | Capitale sicilienne, mafia, maxi-procès | ERA-5 |
| Turin | régionale | Capitale savoyarde, FIAT, migrations | ERA-3, ERA-5 |
| Trente | régionale | Ville conciliaire, principauté épiscopale | ERA-3 |
| Sienne | locale | Cité-État, ville de Catherine | ERA-2 |
| Longarone | locale | Ville détruite, lieu de mémoire | ERA-5 |
| Lampedusa | locale | Frontière maritime, accueil | ERA-5 |
| Gênes | régionale | Port, émigration, industrie | ERA-3, ERA-4, ERA-5 |

Onze lieux sur douze sont hors de Rome. Les noms historiques et les fonctions sont datés ; les géométries modernes ne sont pas rétroprojetées.

## 6. Risques de biais et points disputés

1. **Biais politique et militaire.** La frise actuelle est un récit de souveraineté. Les propositions corrigent partiellement, mais le comité doit décider si le récit principal reste politique ou devient social/culturel.
2. **Biais septentrional.** Le Mezzogiorno est traité comme une périphérie. Le brigandage et la mafia ne doivent pas devenir les seuls prismes : il faut aussi l’économie, les villes, les migrations et les cultures politiques du Sud.
3. **Biais élitiste et masculin.** Les acteurs proposés incluent des femmes et des collectifs, mais les sources disponibles sont souvent produites par des élites. Le risque de tokenisme est réel : une figure féminine par ère ne suffit pas.
4. **Téléologie de la Renaissance et du « miracle ».** La Renaissance n’est pas un bloc homogène, et le miracle économique des années 1958-1963 masque les inégalités, les bidonvilles et les coûts sociaux.
5. **Fascisme et Résistance.** Le fascisme ne se réduit pas à Mussolini ; la Résistance ne se réduit pas à une guerre de libération. Le débat consensus/coercition et guerre civile/guerre patriotique doit rester ouvert.
6. **Colonialisme et mémoire.** L’empire colonial, les lois raciales, la Shoah, les foibe et les monuments fascistes sont des sujets sensibles. Ils exigent des sources multiples et une expertise de sensibilité.
7. **Mafia et État.** Le récit de la mafia comme extériorité archaïque est un stéréotype ; l’historiographie insiste sur son imbrication avec l’économie et la politique.
8. **Migrations.** L’Italie est à la fois pays d’émigration, d’immigration et de migrations internes. Ces trois histoires ne doivent pas être fusionnées.
9. **Citoyenneté.** La loi 91/1992 et le débat sur le jus soli sont des objets politiques contemporains ; il faut éviter l’anachronisme et distinguer droit, pratiques administratives et représentations.
10. **Sources anglo-saxonnes.** Le registre est majoritairement composé de synthèses en anglais. Il faut des sources italiennes, régionales, archivistiques et féministes pour la seconde lecture.

## 7. Dettes documentaires et niveau de confiance

### 7.1. Couverture

La matrice compte 70 cellules (5 ères × 14 domaines) :

- **27 `couvert`** (38,6 %), dont la plupart reposent sur des propositions non intégrées ;
- **18 `partiel`** (25,7 %) ;
- **2 `vide justifié`** (2,9 %) ;
- **23 `vide non traité`** (32,9 %).

En l’état publié, **aucune des 15 fiches existantes ne remplit le critère strict `couvert`** (acteur + lieu + source) : elles n’ont ni acteurs, ni lieux, ni sources, ni TimeSpan, ni claims. Les 27 cellules couvertes le sont donc provisoirement, grâce aux propositions. Le seuil de 90 % n’est pas atteint.

### 7.2. Sources

Le registre contient **20 sources vérifiées** : 17 ouvrages universitaires, 2 sources primaires (Plutarque ; loi 91/1992) et 1 source institutionnelle (Protection civile italienne). Les DOI et URL d’éditeur ont été vérifiés par Crossref ou page éditeur ; les pages et ISBN connus sont renseignés. Les références sans DOI sont signalées comme telles.

Le registre est **anglo-saxon et synthétique**. Il ne contient ni archives, ni articles de revue évalués, ni sources italiennes régionales en nombre suffisant. C’est une base de première version, pas un corpus de preuve définitif.

### 7.3. Omissions

`omissions.yaml` documente **15 omissions** : Haut Moyen Âge, guerres communales, droit romain, Renaissance artistique, dominations espagnole et autrichienne, Lumières, femmes du Risorgimento, colonialisme, fascisme quotidien, Shoah, foibe, minorités linguistiques, Basaglia, COVID-19, environnement industriel. Une seule est marquée `disputed` (foibe) ; les autres sont des dettes `to_fill`.

### 7.4. Niveau de confiance

- **Élevé** : existence et datation des événements proposés, cadres institutionnels, textes de loi.
- **Moyen** : causalité (miracle économique, mafia/État, 1968-1978), chiffres de migration, poids du consentement fasciste.
- **Faible** : mémoire, usages publics du passé, histoire des minorités linguistiques, foibe, COVID-19.

Le dossier n’a fait l’objet **ni de double lecture, ni de kappa, ni de Delphi**. `verdict: pending`, scores `null`, `signoff` vide. Aucune publication automatique.

## Points non résolus

1. La date de -753 est une tradition littéraire ; aucune source primaire n’est entrée dans le registre.
2. La borne de 1494 doit-elle structurer une frise grand public, ou n’être qu’un marqueur interne ?
3. Faut-il commencer l’ère républicaine en 1945, 1946 ou 1948 ?
4. Les chiffres de l’émigration (1876-1915) et des migrations internes (1951-1971) ne sont pas vérifiés à l’unité près.
5. La Shoah en Italie et les foibe exigent des sources supplémentaires, notamment slovènes et croates.
6. Les minorités linguistiques (Südtirol, slovène, arbëreshë, grecque, ladine) ne sont pas encore des fiches.
7. Basaglia, COVID-19 et l’environnement industriel restent des omissions documentées.
8. Tangentopoli (1992), l’euro (1999-2002) et les gouvernements contemporains ne sont pas corrigés faute de sources dans ce registre.
9. La mémoire coloniale et les monuments fascistes ne sont pas traités comme objets d’histoire publique.
10. Anita Garibaldi, Nilde Iotti et les partigiane exigent des biographies et des archives spécifiques, pas seulement des synthèses générales.
11. Le registre reste majoritairement anglophone ; une seconde lecture doit intégrer l’historiographie italienne récente.
12. Aucune double lecture, aucun kappa, aucun Delphi : le dossier reste au statut `draft`.
