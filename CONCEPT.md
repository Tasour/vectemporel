# Vectemporel — note de concept

> **L’Histoire, à portée de zoom.**
> POC v0.2 — novembre 2026
> Nom de travail : **Vectemporel** — vecteur + temporel : un temps orienté, fait de repères et de trajectoires.

---

## 1. En une page

**Le constat.** Les dates apprises isolément ne produisent pas de compréhension. Les encyclopédies expliquent bien un sujet, mais on y perd le fil du temps. Les frises existantes montrent souvent des points sur une ligne, sans lecture intégrée, sans filtres utiles et sans vraie navigation pays par pays.

**La proposition.** Vectemporel est une frise historique **zoomable**, **pays par pays**, dont chaque repère possède des **tags** et une **page Grokipedia lisible dans l’application**. On commence par la France, on dézoome pour voir les grandes périodes, on zoome pour lire un événement, on filtre pour suivre un fil (guerres, sciences, société…), puis on ouvre l’article sans quitter la frise.

**La promesse.** *Comprendre le temps, pas le mémoriser.*

**La boucle produit.** Explorer → Zoomer → Filtrer → Lire → Relier → Revenir.

**Ce que le POC démontre.**
- Une frise réellement zoomable, du millénaire à l’année, avec placement automatique des labels.
- 10 pays, 229 événements curatés, 8 tags transversaux.
- Un atlas de 196 pays, avec 10 frises disponibles et 186 audits à venir.
- 189/229 pages Grokipedia directes ; 40 repères utilisent la recherche en fallback.
- Un lecteur Grokipedia intégré, avec résumé français, article source, liens internes et navigation retour.
- Recherche globale, deep links partageables, interface responsive.

**Ce que le POC ne démontre pas encore.** Comptes, quiz, carte historique, back-office éditorial, comparaison de pays, clustering avancé des événements, validation humaine des traductions. C’est volontaire : le POC cherche à valider la **boucle de lecture historique**, pas à simuler un produit fini.

---

## 2. Le problème

### 2.1 Le problème du public

L’Histoire est enseignée comme une succession de dates, alors qu’elle se comprend comme un **système de contextes, de durées et de causalités**. Un lecteur curieux qui ouvre une page sur la Révolution française comprend les faits, mais ne sait pas forcément :
- ce qui se passait avant ;
- ce qui se passait ailleurs ;
- combien de temps cela a duré ;
- quels autres domaines (sciences, arts, société) évoluaient en même temps.

Les outils actuels répondent partiellement :
- **Wikipédia / Grokipedia** : profondeur encyclopédique, mais pas de carte mentale chronologique.
- **Frises statiques** : lisibles, mais figées, non filtrables, non reliées à la lecture.
- **Applications de quiz** : mémorisation de dates, souvent décontextualisée.
- **Timelines globales** : impressionnantes, mais difficiles à lire et à relier à un pays.

### 2.2 Le problème de la lecture

La lecture d’un article est un **aller-retour constant** : on ouvre un onglet, on perd le fil, on ferme. Le lien entre le repère chronologique et l’article est rarement conservé. Vectemporel fait de l’article une **couche du produit**, pas une sortie.

### 2.3 L’angle pays par pays

Une frise mondiale unique est séduisante mais saturée. Un **point d’entrée national** réduit la charge cognitive et donne un cadre clair. Les tags permettent ensuite de comparer des fils transversaux (les révolutions, les guerres, les sciences) à l’intérieur d’un pays, puis entre pays.

---

## 3. Promesse et principes

### 3.1 Principes d’expérience

1. **Le temps est l’interface.** Le zoom est le geste principal, pas un réglage caché. La frise doit répondre comme une carte : on zoome là où on regarde.
2. **Le pays est le point d’entrée, pas la frontière.** On explore un pays, mais les tags et les liens préparent les comparaisons.
3. **Les tags sont des lentilles, pas des catégories administratives.** Ils servent à suivre un fil de lecture, pas à classer pour classer.
4. **Lire sans sortir.** L’article doit rester accessible dans le contexte de la frise, avec un retour évident.
5. **La profondeur progressive.** À l’échelle du millénaire, on montre les ères et les dates majeures. En zoomant, on révèle les événements secondaires, les durées et les liens.
6. **Toujours situé.** Chaque événement est daté, rattaché à une ère, à un pays, à des tags et à des voisins.
7. **Pas de fausse précision.** Une date approximative, un événement contesté ou une période doivent pouvoir être représentés honnêtement.
8. **Le calme avant le jeu.** Pas de points, de streaks ou de confettis dans le socle. La motivation vient de la compréhension ; la gamification viendra plus tard, comme couche optionnelle.

### 3.2 Positionnement

Vectemporel n’est ni une encyclopédie généraliste, ni un cours d’histoire. C’est une **interface de lecture chronologique** : un globe pour choisir un pays, une carte du temps pour le parcourir, une source profonde pour lire.

Par rapport aux frises existantes, la différence tient à trois choses :
- **la profondeur sémantique du zoom** (les labels et les niveaux d’information changent avec l’échelle) ;
- **le pays comme contexte** et les tags comme fils transversaux ;
- **la lecture intégrée** de l’article, avec retour direct à la frise.

### 3.3 Le nom

**Vectemporel** est la fusion de **vecteur** et de **temporel**. Le vecteur apporte la direction, la flèche, la mesure ; le temporel apporte la durée, la mémoire, les périodes. Ensemble, ils décrivent exactement l’objet : un temps orienté, fait de repères et de trajectoires. Le nom est un mot-valise, français, mémorable, et il prolonge naturellement le logo en forme de flèche.

---

## 4. Personas et moments d’usage

### Le curieux (18–40 ans)

Il lit des articles, regarde des vidéos d’histoire, prépare un voyage. Il veut **comprendre un contexte en 10–15 minutes**, sans suivre un cours. Il arrive par une recherche (« Révolution française »), un deep link ou une page pays.

**Besoin :** une entrée rapide, des repères clairs, une lecture confortable, des liens vers les voisins.

### L’étudiant (15–25 ans)

Il doit réviser une période ou préparer un exposé. Il connaît les dates mais veut **les organiser mentalement**. Il utilise les tags pour isoler un thème et les liens pour relier les événements.

**Besoin :** vue d’ensemble, filtres, mode « dates clés », futur mode quiz.

### L’enseignant / le parent

Il cherche un support visuel pour expliquer une période. Il veut **montrer la chronologie en classe** et ouvrir un article sans perdre la frise.

**Besoin :** fiabilité, lisibilité projetée, parcours guidés, export ou partage.

### Le voyageur

Il prépare un séjour et veut comprendre ce qu’il va voir : un monument, une ville, une région.

**Besoin :** entrée thématique ou géographique, pas seulement nationale. À terme : carte, lieux, monuments.

---

## 5. La boucle d’apprentissage

### 5.1 Maintenant

**Explorer.** Choisir un pays, voir la flèche entière, comprendre les grandes ères.

**Zoomer.** Passer du millénaire à la décennie ; les labels se révèlent, les événements secondaires apparaissent.

**Filtrer.** Activer une ou plusieurs lentilles ; la frise se réduit aux événements pertinents. Les autres restent absents pour éviter le bruit.

**Lire.** Ouvrir un repère ; le lecteur montre d’abord un résumé français court, puis l’article Grokipedia intégré.

**Relier.** Terminer l’article par des événements voisins (même pays ou autre pays). Le fil continue.

### 5.2 Ensuite

- **Raconter** : « remets ces 5 événements dans l’ordre ».
- **Retrouver** : quiz de dates, de causes, de conséquences.
- **Relier** : questions de type « quel événement a rendu celui-ci possible ? ».
- **Réviser** : répétition espacée sur les repères ouverts.
- **Comparer** : deux pays côte à côte sur la même échelle de temps.

Le POC ne fait que la première moitié de la boucle. C’est la partie qui doit être solide avant d’ajouter du jeu.

---

## 6. Expérience produit

### 6.1 La page d’entrée

Une seule surface, pas un tunnel d’onboarding :

- **En-tête** : marque, sélecteur de pays, recherche globale, accès au concept.
- **Colonne de contexte** : pays, introduction, nombre d’événements, tags, périodes.
- **Frise** : la flèche zoomable, l’axe, les repères, les ères.
- **Mini-carte** : la vue complète du pays et la fenêtre courante.
- **Lecteur** : panneau latéral de lecture, ouvert par-dessus la frise.

La frise occupe l’essentiel de l’écran. Les contrôles sont secondaires.

### 6.2 La flèche zoomable

La flèche matérialise trois idées : le temps avance, il a une direction, et on peut s’y déplacer.

**Interactions du POC :**
- molette / trackpad : zoom centré sur le curseur ;
- pincement : zoom sur mobile ;
- glisser : déplacement dans le temps ;
- mini-carte : saut et déplacement de la fenêtre ;
- boutons `−` / `+` / « Vue d’ensemble » ;
- double-clic : zoom avant ;
- clavier : `←` / `→`, `+`, `−`, `0` ;
- clic sur une ère : zoom sur la période ;
- « Époque récente » : aller aux 100 dernières années.

**Niveaux sémantiques :**

| Échelle visible | Ce que l’on montre | Ce que l’on cache |
| --- | --- | --- |
| > 1 000 ans | ères, dates majeures (importance 3) | labels secondaires, détails |
| 200–1 000 ans | grandes périodes, événements importants | détails, dates précises |
| 50–200 ans | événements, durées, dates clés | micro-événements |
| 10–50 ans | presque tous les événements, années | bruit inutile |
| < 10 ans | années, mois (à terme) | agrégats |

Le POC implémente les niveaux par seuils d’importance et par placement de labels. Le clustering visuel des événements très proches et l’échelle mensuelle restent à faire.

**Placement des labels.** Les événements sont placés dans des couloirs au-dessus et au-dessous de l’axe. Un algorithme glouton réserve l’espace horizontal, priorise les événements importants, retourne les labels près des bords et masque ceux qui ne tiennent pas. Les points restent visibles même sans label ; le survol donne le contexte.

**Repères éditorialisés.** Au niveau d’ensemble, afficher tous les labels est illisible. Chaque pays possède donc une petite sélection `featuredIds` (5 à 8 repères) qui vise à garantir une couverture du début, du milieu et de la fin de la période. Les autres labels apparaissent en zoomant. C’est un choix éditorial, pas seulement un choix d’algorithme : il faudra le réviser avec des historiens.

**Pourquoi une échelle linéaire ?** Elle est honnête et prévisible : 1789 est toujours à la même distance relative de 1800, quel que soit le zoom. Le prix est une forte densité sur les périodes récentes. C’est assumé pour le POC ; le clustering et la sélection éditoriale compenseront.

### 6.3 Les lentilles (tags)

Huit tags dans le POC :

| Tag | Usage |
| --- | --- |
| Politique | pouvoirs, institutions, régimes |
| Guerres | conflits, batailles, occupations |
| Sciences | découvertes, techniques, santé |
| Arts & lettres | œuvres, courants, langue |
| Religions | croyances, institutions religieuses |
| Société | mœurs, droits, démographie |
| Économie | commerce, industrie, crises |
| Monde | explorations, contacts, empires |

**Règles du POC :**
- logique **OU** : un événement apparaît s’il possède au moins un tag actif ;
- les comptes affichés sont les événements du pays pour chaque tag ;
- les tags sans événement sont désactivés ;
- les tags actifs sont conservés d’un pays à l’autre, puis élagués si le pays n’a rien dans ce tag ;
- le résumé de filtre indique « X sur Y événements ».

**Évolutions :**
- presets éditoriaux : « révolutions », « construction de l’État », « sciences et société » ;
- logique ET / OU explicite ;
- intensité du tag (principal / secondaire) ;
- tags temporels (siècle, période) ;
- tags géographiques (ville, région).

### 6.4 Le lecteur Grokipedia

Le lecteur est un panneau latéral qui s’ouvre par-dessus la frise. Le haut de l’article est volontairement **direct** :

1. **Le titre français** de l’événement.
2. **Les hashtags** issus des tags (`#guerres`, `#politique`…).
3. **Le texte de l’article**, traduit automatiquement en français, sans titre dupliqué ni résumé intercalé.

Le pays et la date restent visibles dans la barre du lecteur. En bas de page : les liens voisins, le lien vers la source originale et la mention de traduction.

Le lecteur permet de naviguer vers une autre page Grokipedia via les liens internes de l’article, avec un bouton retour.

**Pourquoi ce choix ?** Parce que la promesse du produit est la lecture. Le résumé éditorial reste dans la frise (infobulle) ; une fois l’article ouvert, on entre directement dans le texte. La première ouverture peut prendre quelques secondes, puis la traduction est mise en cache.

### 6.5 Recherche

Deux modes dans une seule barre :
- **année** : « 1789 », « 52 av. J.-C. » → recentrer la frise sur l’année ;
- **événement** : titre, sous-titre, résumé, tags, pays → ouvrir le repère et son lecteur.

La recherche est **globale** : un résultat peut venir d’un autre pays, ce qui déclenche le changement de pays et le zoom. C’est un début de réponse au problème « et pendant ce temps, ailleurs ? ».

### 6.6 Navigation pays : le globe

Le sélecteur principal est un **globe 3D interactif**, accessible depuis le bouton « Choisir un pays » de l’en-tête. On peut le faire tourner, zoomer, cliquer sur un pays ou utiliser la liste et la recherche.

Le globe distingue trois états :
- **frise disponible** (or) : le pays ouvre sa timeline ;
- **audit à venir** (gris-bleu) : le pays est référencé, mais sa frise n’est pas publiée ;
- **pays survolé/sélectionné** : sa fiche s’affiche dans le panneau latéral.

Le panneau contient la région, la capitale, le statut, le résumé d’audit, la périodisation, le nombre de repères et un lien vers l’audit complet. Les 10 pays pilotes sont disponibles ; les 186 autres sont listés avec le statut « à auditer ».

Chaque pays possède :
- un domaine temporel propre (France : 600 av. J.-C. → 2026 ; Chine : 1600 av. J.-C. → 2026 ; etc.) ;
- ses propres ères ;
- ses événements et ses tags ;
- un audit éditorial tracé dans `COUNTRY_AUDITS.md`.

**Pourquoi un globe plutôt que des onglets ?** Parce que la sélection pays est un moment de découverte, pas un menu technique. Le globe donne une échelle mondiale immédiate, y compris pour les pays qui n’ont pas encore de frise. La liste et la recherche restent disponibles pour l’accessibilité et les petits territoires.

### 6.7 Deep links

Une vue est partageable :
`#/france/1789-1799/fr-revolution`

Cela encode le pays, la fenêtre temporelle et, éventuellement, l’événement ouvert. Le POC synchronise l’URL à chaque mouvement (avec un léger debounce) et restaure l’état au chargement. C’est la base du partage enseignant, des liens éditoriaux et du référencement.

### 6.8 Ce que le POC n’inclut pas

- carte historique et géolocalisation des événements ;
- comptes et synchronisation ;
- quiz et répétition espacée ;
- comparaison de pays ;
- back-office ;
- validation éditoriale des traductions ;
- mode hors-ligne ;
- notifications ;
- monétisation.

### 6.9 Récit et queue du dragon

Le **Plan** est la porte d’entrée ; le **Récit** en est la première destination : période → panorama → lieux, entièrement au clavier (`STORY_MODE.md`). La touche `Échap` mène à la queue du dragon, canevas libre où plonger remonte le temps.

#### Queue du dragon

La queue du dragon est la **vue principale et unique** de Vectemporel : un canevas zoomable de type Prezi, ouvert au chargement. Plonger vers le centre remonte le temps ; remonter vers l’extérieur avance vers le présent. Chaque écaille est un repère avec son image, son ère, ses tags, ses figures et ses lieux. La frise linéaire reste accessible via `?classic=1`.

- **Géométrie** : spirale logarithmique auto-similaire `r = e^(b·Δθ·u)` ; le passé est au centre, le présent à l’extérieur.
- **Zoom = temps** : la caméra suit `r(u)` ; zoomer vers le centre recule d’une écaille sans saut d’échelle.
- **Rendu** : Three.js statique (ruban, bandes d’ères, vertèbres) + écailles DOM recyclées et connecteurs SVG ; rendu arrêté au repos.
- **Images** : 229/229 repères illustrés par des fichiers vérifiés via les API Wikipedia/Commons, avec crédit et licence ; motif génératif seulement en secours.
- **Interaction** : molette, pincement, glisser, flèches, rail de profondeur, clic sur une écaille → fiche détaillée → lecteur.
- **Systémique** : le même algorithme s’applique aux 10 pays ; seules les données changent.
- **Limite** : la navigation est bornée aux repères vérifiés ; aucune écaille vide ni continuation fictive.

Les notes complètes sont dans **[SPIRAL_TIMELINE.md](SPIRAL_TIMELINE.md)** (recherche sur la forme) et **[DRAGON_TIMELINE.md](DRAGON_TIMELINE.md)** (design du canevas).

---

## 7. Contenu et modèle de données

### 7.1 Anatomie d’un événement

Un événement n’est pas une date. C’est un **repère** avec :

- un identifiant stable ;
- un pays ;
- une année (négative pour av. J.-C.) ;
- éventuellement une année de fin (période) ;
- un titre court ;
- un sous-titre ;
- un résumé français de 2–3 phrases ;
- des tags ;
- une importance (1–3) ;
- une référence Grokipedia ;
- des liens vers d’autres événements.

### 7.2 Modèle TypeScript cible

> Ce modèle est celui du **POC**. Le modèle de preuve complet — acteurs, lieux datés, sources indépendantes, claims, `TimeSpan`, omissions — est décrit au **7.6** et dans **[TIMELINE_METHOD.md](TIMELINE_METHOD.md)**.

```ts
type Year = number; // négatif = av. J.-C. ; 0 = convention interne

type Country = {
  id: string;
  name: string;
  flag: string;
  color: string;
  domain: [Year, Year];
  eras: Era[];
  intro: string;
  featuredIds?: string[]; // repères affichés au niveau d'ensemble
};

type Era = {
  id: string;
  name: string;
  start: Year;
  end: Year;
  color: string;
};

type HistoricEvent = {
  id: string;
  countryId: string;
  year: Year;
  endYear?: Year;
  title: string;
  subtitle: string;
  summary: string;
  tags: TagId[];
  importance: 1 | 2 | 3;
  article?: {
    source: 'grokipedia';
    slug: string;
    title?: string;
    language?: 'en' | 'fr';
  };
  related?: string[];
  // à terme
  causes?: string[];
  consequences?: string[];
  places?: PlaceRef[];
  sources?: SourceRef[];
  datePrecision?: 'year' | 'month' | 'day';
  certainty?: 'certain' | 'approximate' | 'disputed';
};
```

### 7.3 Dates et incertitude

Le POC utilise une année entière et affiche `An 1` à la place de l’année 0 (convention d’affichage). Les périodes sont représentées par `endYear` et un trait horizontal derrière le repère.

Pour la production :
- date précise (année / mois / jour) ;
- fourchette ;
- incertitude ;
- calendriers (julien / grégorien) pour les périodes anciennes ;
- gestion des événements qui traversent plusieurs pays.

### 7.4 Taxonomie des tags

La taxonomie doit rester **petite et stable**. Huit tags suffisent pour le POC. Au-delà de 12, les filtres deviennent un menu. Les tags doivent être :
- mutuellement compréhensibles pour un non-historien ;
- applicables à tous les pays ;
- non idéologiques dans leur libellé ;
- documentés par des exemples.

### 7.5 Éditorialisation

**Ton.** Clair, adulte, non condescendant. Pas de « il était une fois ». Pas de jugement moral anachronique. Les faits sensibles (Shoah, colonisation, guerres civiles, attentats) sont nommés avec précision et sans sensationnalisme.

**Règles.**
- une date = une source vérifiable ;
- les résumés font 2–3 phrases, pas 3 paragraphes ;
- chaque événement doit avoir au moins un tag ;
- un événement sans page Grokipedia directe doit être signalé et relié à une recherche ;
- les liens « related » doivent être éditorialement justifiés, pas automatiques ;
- les zones grises (dates approximatives, bilans contestés) sont explicites.

**Validation.** Pour le POC, les données ont été écrites à la main. En production : double lecture (historien + éditeur), versionnage, journal des modifications, sources affichées.

### 7.6 Méthode de production et audit

La méthode complète est dans **[TIMELINE_METHOD.md](TIMELINE_METHOD.md)**. Elle part d’un constat : une frise nationale ne peut pas être exhaustive. Elle peut en revanche être **systématique** et rendre chaque omission visible.

Le pipeline comporte 11 étapes (0 à 10) :

| Étape | Question | Livrable |
| --- | --- | --- |
| 0. Cadrage | Quel pays, quel territoire, quelles populations, quelles bornes ? | Charte de périmètre |
| 1. Historiographie | Quels récits, quelles écoles, quelles controverses ? | Carte des récits |
| 2. Corpus | Quelles sources, avec quelle indépendance ? | Registre de sources |
| 3. Inventaire | Quels événements, processus, acteurs, lieux, institutions ? | Base multi-échelles |
| 4. Périodisation | Quelles ruptures, et quelles alternatives ? | 3 périodisations candidates |
| 5. Couverture | Quels domaines et quelles échelles restent vides ? | Matrice 14 domaines + omissions |
| 6. Sélection | Quels repères centraux, avec quels critères ? | 10–20 centraux, 20–40 étendus |
| 7. Qualification | Quelles dates, incertitudes, claims, provenances ? | Fiches `TimeSpan` / claims |
| 8. Audit | Quels désaccords, quels scores, quel sign-off ? | Double lecture + rapport |
| 9. Mise en scène | Quels niveaux de lecture, quels labels, quelle accessibilité ? | Frise sémantique testée |
| 10. Publication | Quelle version, quelle maintenance ? | Release, changelog, note publique |

**Modèle de preuve.** Le POC stocke une année, un titre, des tags et un lien Grokipedia. La cible distingue :

- `TimeSpan` : bornes, calendrier, précision, certitude, rôle de la date ;
- `Actor` : individus, collectifs, institutions, avec ressources, contraintes et réseaux ;
- `Place` : noms et géométries datés, hiérarchie, fonctions ;
- `Source` : type, indépendance, fiabilité, DOI/URL, usage ;
- `Claim` : affirmation sourcée, révisable, avec statut `disputed` conservé ;
- `PeriodDefinition` : périodisation comme assertion savante, pas comme conteneur naturel ;
- `TimelineView` : vue générée, pas stockée comme vérité.

**Audit structurel.** `npm run audit:timeline` produit **[TIMELINE_AUDIT.md](TIMELINE_AUDIT.md)**. Dernier état : **229 repères**, **120/120 contrôles d’intégrité**, **27,6/100 de complétude cible**, **49 % de couverture tags × ères**, **10/10 pays au-dessus du seuil politique/guerre**. Les **10 dossiers pays** sont produits (**200 sources**, **180 propositions**, **148 omissions**) ; **121 corrections et 40 ajouts** sont intégrés. Voir **[INTEGRATION_REPORT.md](INTEGRATION_REPORT.md)** et **[AUDIT_SYNTHESIS.md](AUDIT_SYNTHESIS.md)**. Les gabarits sont dans **[templates/](templates/)**.

**Garde-fous.** Pas de récit téléologique, pas de frontières modernes rétroprojetées, pas de « grands hommes » sans contraintes ni contre-pouvoirs, pas de Grokipedia utilisé comme autorité, pas de date sans rôle ni source, pas d’omission silencieuse.

---

## 8. Grokipedia : faisabilité et cadre

### 8.1 Pourquoi Grokipedia

Les articles sont longs, structurés et adaptés à une lecture approfondie. Le lien entre un repère et une page existante est direct. Grokipedia est donc un bon laboratoire pour tester la promesse « lire dans l’application ».

### 8.2 Contraintes techniques constatées

- **Iframe impossible** : Grokipedia renvoie `Content-Security-Policy: frame-ancestors 'none'`. On ne peut pas l’intégrer tel quel.
- **Pages rendues côté serveur** : le corps de l’article est présent dans le HTML, ce qui permet une extraction propre.
- **Pas d’API officielle identifiée** : le POC ne suppose pas d’API. Il extrait les pages publiques à des fins de démonstration.
- **Langue** : les pages sont en anglais. Le POC ajoute une couche de traduction automatique (Google Translate via un endpoint non officiel) et affiche l’article en français par défaut, avec la source originale accessible.
- **Latence** : un article peut peser plusieurs centaines de kilo-octets et mettre 1–3 secondes à charger.

### 8.3 Ce que fait le POC

Un petit serveur Node :
1. reçoit `/api/grokipedia?slug=...` ;
2. récupère la page publique ;
3. extrait `article .article-body` ;
4. retire les boutons, icônes, notes de bas de page et références ;
5. convertit les paragraphes de Grokipedia en `<p>` ;
6. nettoie le HTML avec `sanitize-html` ;
7. traduit les blocs de texte en français et harmonise les dates ;
8. met en cache 6 heures ;
9. renvoie le titre, la langue, le HTML traduit et l’URL source.

Si la page n’existe pas, le serveur renvoie une recherche Grokipedia et des candidats. Le client affiche un repli élégant.

### 8.4 Ce qu’il faudrait pour la production

- **Accord ou API** avec Grokipedia, ou contenu sous licence ;
- **traduction** relue ou validée, avec mention et glossaire ;
- **cache distribué** et respect des limites de débit ;
- **monitoring** des erreurs et des changements de structure HTML ;
- **attribution** claire et lien vers la source ;
- **politique de contenu** et gestion des pages sensibles ;
- **fallback** systématique vers la page originale.

Le POC est explicitement **non affilié** à Grokipedia.

### 8.5 Risques liés à la dépendance

- changement de structure HTML ;
- indisponibilité ou blocage ;
- qualité ou biais d’une page ;
- coût et qualité de la traduction ;
- dépendance au service de traduction ;
- externalisation du texte des articles vers un service tiers ;
- perception d’une dépendance à une source unique.

**Mitigation :** couche d’abstraction `ArticleProvider`, plusieurs sources possibles (Grokipedia, Wikipédia, sources partenaires), et toujours le résumé Vectemporel comme socle.

---

## 9. Architecture technique

### 9.1 Architecture du POC

```text
Navigateur
  index.html
  styles.css
  app.js          → état, frise, recherche, lecteur
  data.js         → 10 pays, 229 événements
  globe-engine.js → moteur Three.js (1 sphère, 1 draw call)
  story.js       → récit période/panorama/lieux
  place-atlas.js → coordonnées vérifiées des lieux
  dragon.js      → canevas zoomable Three.js
  dragon art     → motifs génératifs SVG
  event-images.js → 229 images vérifiées avec crédits
  spiral-meta.js → acteurs et lieux par ère
  globe-map.png / globe-pick.png → textures visuelle et de picking
        │
        │ fetch /api/grokipedia
        ▼
Node HTTP (server.mjs)
  ├─ fichiers statiques
  ├─ proxy Grokipedia
  ├─ extraction cheerio
  ├─ sanitisation sanitize-html
  └─ cache mémoire (6 h)
        │
        ▼
grokipedia.com
```

**Choix du POC :** pas de framework, pas de build. Trois fichiers front, un serveur Node. Objectif : rendre la démonstration facile à lancer et à modifier.

### 9.2 Architecture cible

```text
Frontend (React/Svelte + TypeScript)
  ├─ Timeline Engine (SVG/Canvas)
  ├─ Reader
  ├─ Search
  └─ Learning layer
API
  ├─ content service
  ├─ search (Meilisearch / Postgres FTS)
  ├─ article provider (Grokipedia + fallbacks)
  └─ analytics privacy-first
Postgres
  ├─ countries, eras, events, tags
  ├─ event_tags, event_relations
  ├─ article_refs, revisions
  └─ collections
CMS éditorial
  ├─ workflow brouillon → relecture → publié
  ├─ sources et citations
  └─ prévisualisation
CDN
  └─ images, articles mis en cache
```

**Recommandation.** Ne pas utiliser une bibliothèque de timeline généraliste pour le cœur. Le moteur de zoom et de placement est le produit. En revanche, utiliser des bibliothèques pour le lecteur, le routage, l’accessibilité et les formulaires.

### 9.3 Moteur de frise

Le POC implémente :
- projection linéaire année → pixels ;
- zoom ancré sur le curseur ;
- clamp du domaine ;
- ticks « ronds » (1, 2, 5, 10, 25, 50, 100…) ;
- ères en fond, grille, axe fléché ;
- placement des labels en couloirs avec priorité d’importance ;
- culling des événements hors viewport ;
- mini-carte avec fenêtre ;
- synchronisation d’URL.

À l’échelle de 10 000 événements :
- rendu canvas pour les points, DOM/SVG pour les labels ;
- index spatial par année ;
- clustering à faible zoom ;
- virtualisation des labels ;
- calcul des ticks en Web Worker si nécessaire ;
- tests de performance par pays.

### 9.4 Performance

Le POC redessine la frise à chaque frame de zoom. Avec 53 événements et quelques dizaines de nœuds, c’est instantané. Ce ne le sera plus avec 1 000 événements visibles. La cible devra séparer :
- la couche points (canvas) ;
- la couche labels (DOM, nombre limité) ;
- la couche décor (SVG ou canvas).

**Globe.** Le sélecteur 3D n’est pas un maillage par pays : c’est **une seule sphère texturée**, avec une texture visuelle et une texture de picking. Résultat mesuré : **1 draw call, ~5 000 triangles, 2 textures**. Aucun shadow map, aucune lumière dynamique, aucun post-processing. Le picking se fait par lecture d’un pixel de la texture de sélection, pas par raycast sur 200 meshes. La résolution est plafonnée par un budget de pixels (DPR max 1,5 et ~2,2 Mpx), les textures passent en 2K sur mobile, et le rendu est **suspendu** quand l’atlas est fermé ou l’onglet caché. La cible 120 fps reste limitée par la fréquence de l’écran : 120 fps sur un écran 120 Hz, 60 fps sur un écran 60 Hz.

### 9.5 Accessibilité

Le POC fournit :
- des boutons natifs pour les événements ;
- des labels ARIA sur les repères ;
- une navigation clavier (`/`, `+`, `−`, `0`, flèches, Échap) ;
- une réduction des animations via `prefers-reduced-motion` ;
- un lecteur avec focus trap et fermeture au clavier.

À renforcer :
- alternative textuelle complète de la frise ;
- liste des événements accessible sans interaction ;
- contraste et taille de police réglables ;
- lecteur d’écran sur les ères et les ticks ;
- navigation clavier de la mini-carte.

### 9.6 URL et SEO

Les deep links sont un prérequis pour :
- le partage ;
- les liens depuis un article ou un cours ;
- l’indexation de pages pays/période ;
- les campagnes éditoriales.

Le POC utilise le hash pour rester simple. Une version production devrait utiliser des URLs serveur (`/france/1789-1799`) avec meta tags et pré-rendu.

---

## 10. Design

### 10.1 Direction

Un **musée de nuit** : fond encre, or discret, typographie éditoriale, lecteur sombre cohérent avec l’ambiance. La frise est un instrument de mesure, pas un dashboard.

- **Fond** : `#090b0f`, dégradés très doux, grain léger.
- **Accent** : or `#e6b96f` pour le temps, la marque et les actions.
- **Pays** : couleur propre (France bleu, Royaume-Uni corail, États-Unis turquoise, Allemagne ambre, Italie vert, Espagne orange) utilisée avec parcimonie.
- **Tags** : couleurs distinctes pour les points et les années.
- **Lecteur** : fond encre `#090b0f`, halos or/pays, grain animé, serif Newsreader, lettrine. Le papier chaud reste réservé aux images et aux documents anciens.
- **Typographie** : Fraunces pour les titres, Inter pour l’interface, Newsreader pour la lecture.

### 10.2 Motifs

- **La flèche** : cercle + flèche, présente dans le logo et l’axe.
- **Le trait** : chaque événement est relié à sa date exacte par un stem vertical.
- **Le point** : taille selon l’importance, couleur selon le premier tag.
- **Les couloirs** : les labels respirent au-dessus et en dessous de l’axe.
- **La fenêtre** : la mini-carte montre toujours où l’on est.

### 10.3 Motion

- zoom animé pour les boutons, les ères et les liens ;
- zoom direct pour la molette et le pincement (réactivité) ;
- transitions courtes sur les labels et le lecteur ;
- respect de `prefers-reduced-motion`.

### 10.4 Queue du dragon

- **Temps → angle** : `θ(u) = φ₀ + Δθ·u`, avec `Δθ = 0,58 rad` et `φ₀ = −1,74 rad`.
- **Rayon logarithmique** : `r(u) = e^(b·Δθ·u)`, avec `b = ln(φ)/(π/2) × 0,55` ; le centre est l’origine la plus ancienne.
- **Zoom = temps** : hauteur de vue `h(p) = 2·VIEW·r(p)` ; la taille écran d’une écaille ne dépend que de `j − p`.
- **Écailles** : tuiles DOM alternées autour du ruban, reliées par des connecteurs SVG ; l’écaille sélectionnée est agrandie et cerclée d’or.
- **Contenu** : image vérifiée ou motif génératif signalé, ère, repère, tags, figures et lieux.
- **Étapes** : une écaille par repère ; le clic ouvre une fiche détaillée (grande image, résumé, tags, figures, lieux) avant le lecteur Grokipedia.
- **Performance** : scène Three.js statique, 15 écailles recyclées, rendu à la demande et arrêté au repos.
- **Accessibilité** : clavier, contraste, `prefers-reduced-motion`, focus piégé dans l’overlay et dans la fiche détaillée.

---

## 11. Roadmap

### M0 — POC (fait)

- 10 pays, 229 événements, 8 tags.
- Queue du dragon : canevas zoomable, 229 écailles, images vérifiées et motifs génératifs.
- Atlas 3D de 196 pays, 10 frises disponibles, 186 audits à venir.
- Frise zoomable et mini-carte.
- Filtres, recherche, deep links.
- Lecteur Grokipedia intégré, avec traduction automatique en français.
- Responsive desktop / tablette / mobile.

### M1 — MVP éditorial

- 20–30 pays, 600–1 000 repères.
- Back-office avec workflow de relecture.
- Recherche full-text serveur.
- Validation éditoriale des traductions et glossaire historique.
- Fiches pays, périodes, auteurs.
- URLs serveur et SEO.
- Analytics privacy-first.

### M2 — Apprentissage

- Parcours guidés (« 10 dates pour comprendre la Révolution »).
- Quiz d’ordre, de dates, de causes.
- Répétition espacée.
- Collections personnelles.
- Mode enseignant / classe.

### M3 — Échelle et comparaison

- Carte historique et couches géographiques.
- Comparaison de deux pays sur la même échelle.
- Clustering avancé, événements multi-pays.
- Partenariats de contenu et API.
- Applications mobiles ou PWA.

---

## 12. Métriques

### North star

**Le nombre de repères ouverts puis reliés à un autre repère par session.** Cela mesure la boucle de compréhension, pas le temps passé.

### Métriques d’activation

- % de sessions avec au moins un article ouvert ;
- temps avant le premier article ;
- % de sessions avec au moins un zoom ;
- % de sessions avec un filtre activé.

### Profondeur

- nombre médian d’événements lus par session ;
- nombre de sauts « related » par session ;
- taux de retour à la frise après lecture ;
- taux d’utilisation de la recherche.

### Apprentissage (M2)

- progression avant/après sur un quiz de 10 questions ;
- rétention à 7 jours des repères révisés ;
- capacité à ordonner une séquence ;
- sentiment de compréhension déclaré.

### Guardrails

- taux d’erreur du lecteur ;
- p95 de chargement d’un article ;
- taux de pages Grokipedia indisponibles ;
- fraîcheur des données ;
- accessibilité (contrastes, clavier).

---

## 13. Risques et questions ouvertes

### Risques

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Erreur factuelle | Confiance | double relecture, sources, versionnage |
| Biais éditorial | Crédibilité | comité, diversité des sources, transparence |
| Dépendance Grokipedia | Continuité | abstraction fournisseur, fallback Wikipédia |
| Blocage / CGU | Légal | accord, API, cache autorisé |
| Surcharge visuelle | Compréhension | zoom sémantique, clustering, labels prioritaires |
| Maintenance des données | Coût | CMS, schémas stricts, tests de cohérence |
| Périmètre trop large | Retard | pays par pays, profondeur inégale assumée |
| Qualité de la traduction automatique | Compréhension | source visible, glossaire, relecture humaine progressive |

### Questions à trancher

1. **Public prioritaire** : grand public curieux ou scolaire ? Le POC sert les deux, mais la roadmap diffère.
2. **Ordre des pays** : France, Royaume-Uni, Allemagne, Italie, Espagne… ou d’abord les pays où Grokipedia a le plus de contenu ?
3. **Grokipedia** : simple lien, lecteur proxy, ou partenariat officiel ? Le POC montre le potentiel, pas le contrat.
4. **Langue** : quelle qualité de traduction viser — automatique, relue, ou éditoriale ? Le choix change le coût et l’expérience.
5. **Vue initiale** : domaine complet ou période par défaut ? Le POC ouvre sur le domaine complet pour montrer la flèche ; un produit grand public pourrait ouvrir sur 1500–2026.
6. **Tags** : 8 tags suffisent-ils ? Faut-il des sous-tags, des presets, une logique ET ?
7. **Liens entre événements** : éditoriaux ou générés ? Les deux, mais avec validation humaine.
8. **Gamification** : à partir de quand ? Probablement après la validation de la lecture et des parcours.
9. **Modèle économique** : gratuit + premium enseignant, partenariats, institutions.
10. **Gouvernance éditoriale** : qui valide, qui arbitre les sujets sensibles, comment corriger ?

---

## 14. Annexes POC

### 14.1 Périmètre livré

| Élément | État |
| --- | --- |
| Globe 3D / atlas 196 pays | ✅ |
| Frise zoomable France | ✅ |
| 9 autres pays | ✅ |
| Audits pays | ✅ 10 pays |
| 229 événements | ✅ |
| 8 tags filtrables | ✅ |
| Recherche événement / année | ✅ |
| Lecteur Grokipedia | ✅ |
| Navigation interne dans le lecteur | ✅ |
| Deep links | ✅ |
| Responsive | ✅ |
| Mini-carte | ✅ |
| Quiz / comptes / carte historique | ❌ |
| Traduction automatique FR | ✅ |
| Back-office | ❌ |
| API officielle Grokipedia | ❌ |

### 14.2 Chiffres

- **10 pays** : France, Royaume-Uni, États-Unis, Allemagne, Italie, Espagne, Chine, Inde, Japon, Égypte.
- **229 événements** : France 57, Royaume-Uni 24, États-Unis 22, Allemagne 21, Italie 19, Espagne 17, Chine 17, Inde 16, Japon 17, Égypte 19.
- **8 tags**.
- **9 périodes** pour la France.
- **189/189** slugs Grokipedia directs validés par `npm run verify` ; 40 repères utilisent la recherche en fallback.
- **Traduction française à la volée** des articles, avec cache mémoire.

### 14.3 Lancement

```bash
npm install
npm start
# http://localhost:4173
```

### 14.4 Raccourcis

- `/` ou `Ctrl/Cmd + K` : recherche.
- `+` / `−` : zoom.
- `0` : vue d’ensemble.
- `←` / `→` : déplacement.
- `Échap` : fermer la recherche, le lecteur ou le concept.
- `?` : ouvrir la note de concept.

### 14.5 Inspirations

- Les frises murales et les atlas historiques.
- Les interfaces de cartes : zoom centré sur le curseur, minimap, niveaux de détail.
- Les lecteurs de presse : contexte court, article long, typographie confortable.
- Les encyclopédies : profondeur, liens, sources.

---

**Conclusion.** Le POC valide la promesse principale : une frise historique peut être **un espace de lecture**, pas seulement une image. La prochaine décision n’est pas technique, elle est éditoriale : choisir le public, la profondeur de contenu et le rapport à Grokipedia. Le socle est prêt pour cette discussion.
