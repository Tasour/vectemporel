# Spirale narrative — design systémique et implémentation

> **Version 1.0 — novembre 2026.**  
> Cette note décrit la géométrie, l’algorithme et les règles pédagogiques de la vue **Spirale narrative** de Vectemporel. **Suite :** la vue a évolué vers un canevas zoomable, la **queue du dragon** ; son design est décrit dans **[DRAGON_TIMELINE.md](DRAGON_TIMELINE.md)**. Elle s’appuie sur trois résultats de recherche : l’esthétique de la spirale dorée, l’évaluation des formes de frises et les structures de narration visuelle.

---

## 1. Pourquoi une spirale, et pourquoi pas partout

Une frise linéaire est le meilleur outil pour **chercher** une date, comparer deux événements ou parcourir un axe. Une spirale est moins efficace pour ces tâches de lecture rapide : Di Bartolomeo et al. (2020) montrent que les formes non linéaires sont plus lentes à lire et que les spirales sont perçues comme plus confuses pour la recherche d’information.

La spirale n’est donc **pas** un remplacement de la frise. C’est un mode de **narration** :

- la frise reste l’outil de consultation et de recherche ;
- la spirale devient l’outil de **mise en récit par étapes** ;
- l’utilisateur peut passer de l’une à l’autre sans perdre le pays ni les données.

Cette séparation est la première décision systémique : **ne pas demander à une forme narrative de faire le travail d’un index**.

Segel et Heer (2010) décrivent précisément ce type de dispositif comme un **slideshow interactif** : une suite de cadres avec un texte court, une visualisation qui change, une progression visible et une interaction locale. Leur modèle de la « martini glass » recommande de commencer par un parcours guidé, puis d’ouvrir l’exploration. La spirale suit ce modèle : chaque étape est guidée, mais l’utilisateur peut cliquer un repère, changer de pays ou revenir en arrière.

---

## 2. Ce que la recherche dit de la forme

### 2.1. La spirale dorée est perçue comme plus belle que son approximation

Hübner (2024) compare la spirale dorée, la spirale de Fibonacci, la spirale d’Archimède et l’approximation de Dürer. Résultat principal : la **spirale dorée est préférée** à la spirale de Fibonacci, et la spirale d’Archimède à celle de Dürer. L’explication avancée est la **continuité de la courbure** : une courbe dont la courbure change progressivement est perçue comme plus « juste » qu’une courbe composée d’arcs de courbure constante.

Conséquence pour Vectemporel : utiliser une **vraie spirale logarithmique**, pas une succession de quarts de cercle ou une approximation de Fibonacci. La courbe doit rester continue, même si le rendu est simplifié en polyligne pour la performance.

### 2.2. La spirale logarithmique

La forme générale est :

```text
r(θ) = a · e^(bθ)
```

Pour la spirale dorée, le rayon est multiplié par φ à chaque quart de tour :

```text
b = ln(φ) / (π/2) ≈ 0,30635
φ = (1 + √5) / 2 ≈ 1,618
```

Une spirale dorée non amortie fait grossir le rayon d’un facteur ≈ 6,85 par tour. Sur une histoire de 2 600 ans et 6 tours, les périodes anciennes seraient écrasées au centre. Vectemporel utilise donc une **spirale dorée amortie** :

```text
b_eff = 0,55 · b
```

La courbure reste continue, la croissance reste logarithmique, mais les boucles internes restent lisibles. C’est un compromis explicite entre beauté géométrique et lecture historique.

### 2.3. Le nombre d’or comme règle de composition, pas comme preuve

Le nombre d’or intervient à trois endroits :

1. **Croissance des spires** : `b` dérivé de φ.
2. **Répartition des satellites** : les acteurs et les lieux sont répartis par **fraction dorée** `1/φ ≈ 0,618` le long de l’arc, un principe apparenté à l’angle d’or des feuilles, pour éviter les grappes.
3. **Rythme des étapes** : les écarts de progression et les tailles de blocs suivent une échelle 1 / φ / φ² pour hiérarchiser sans rigidité.

En revanche, la largeur des bandes et la taille des points sont des **constantes de lisibilité**, pas des proportions dorées imposées. Une visualisation de données ne doit pas sacrifier l’exactitude à une esthétique numérique.

---

## 3. Géométrie de la spirale Vectemporel

### 3.1. Le temps devient un angle

Pour un pays de domaine `[start, end]` :

```text
t = (année − start) / (end − start)
θ(t) = −π/2 − 2π · N · t
```

- `t = 0` : origine au centre ;
- `t = 1` : présent à l’extérieur ;
- `N` : nombre de tours, calculé à partir du nombre d’ères.

```text
N = 4,15 + min(2,7 ; 0,18 × nombre_d_ères)
```

Pour la France (9 ères) : ≈ 5,77 tours. Pour l’Inde (4 ères) : ≈ 4,87 tours. Les pays avec peu d’ères ont des boucles plus amples ; les pays avec beaucoup d’ères ont une spirale plus dense, mais chaque ère garde une portion d’angle visible.

### 3.2. Le rayon est logarithmique

```text
r_brut(t) = (e^(b_eff · θ) − 1) / (e^(b_eff · θ_max) − 1)
r(t) = R_min + (R_max − R_min) · r_brut(t)
```

Avec `R_min ≈ 0,16` et `R_max ≈ 0,86` dans un repère normalisé. Le centre n’est pas un point invisible : il reste un espace vide, occupé par un repère doré, pour signifier l’origine.

### 3.3. Les ères sont des rubans

Chaque ère est une **bande continue** le long de la spirale :

- début et fin de l’ère → début et fin de l’arc ;
- largeur de bande constante, pour éviter une fausse précision ;
- couleur de l’ère ;
- opacité variable selon l’étape : actuelle très lumineuse, passées moyennes, futures très faibles.

La bande n’est pas une aire proportionnelle à la durée. La durée est encodée par l’**angle**, pas par l’épaisseur. Les dates exactes restent affichées dans les étiquettes et le panneau.

### 3.4. Les événements sont des points

Chaque événement est placé à `t = normalise(année)` :

- couleur = premier tag ;
- taille = importance 1–3 ;
- position = sur la spirale ;
- visibilité = progressive, selon l’étape.

Les événements futurs ne sont pas affichés ; les événements passés restent visibles mais atténués. C’est le principe **focus + contexte** : on voit d’où l’on vient sans perdre le fil.

### 3.5. Les acteurs et les lieux sont des satellites

Les dossiers pays contiennent des acteurs (`period_ids`) et des lieux (événements associés). L’algorithme les rattache à une ère :

- acteur → ère dont la période recouvre le plus sa période ;
- lieu → ère de son premier événement rattaché ;
- maximum 4 acteurs et 4 lieux par ère ;
- acteurs = losanges dorés, lieux = carrés bleus ;
- répartition par fraction dorée le long de l’arc pour éviter les grappes.

Les satellites ne remplacent pas les fiches : ils indiquent qu’un nom ou un lieu est associé à la boucle. Le panneau latéral donne le détail.

### 3.6. Les liens

Les liens `related` entre événements sont dessinés en fils dorés très fins. Les liens de l’ère courante sont plus visibles. Ils ne sont pas une preuve de causalité : ce sont des **liens éditoriaux** déjà présents dans les données.

---

## 4. Algorithme systémique pour n’importe quel pays

L’algorithme est indépendant du pays. Il ne contient aucune forme codée en dur pour la France.

### Étape 1 — Charger et normaliser

- pays : domaine, ères, événements, tags ;
- acteurs et lieux : métadonnées du dossier pays ;
- dates : normaliser dans `[0, 1]` ;
- événements hors domaine : ignorer ou signaler.

### Étape 2 — Construire les boucles

- `N` tours selon le nombre d’ères ;
- rayon logarithmique amorti ;
- ruban continu pour la ligne de temps ;
- une bande par ère.

### Étape 3 — Placer les événements

- `t` = position temporelle ;
- angle et rayon ;
- couleur du tag ;
- taille selon l’importance ;
- index par ère pour le focus.

### Étape 4 — Rattacher les acteurs et les lieux

- acteurs : période du dossier → ère de la frise ;
- lieux : événements du dossier → année → ère ;
- déduplication et plafond de 4 + 4 ;
- fraction dorée le long de l’arc pour les satellites.

### Étape 5 — Générer les étapes

```text
étape 0 : introduction du pays
étape 1 : ère 0
étape 2 : ère 1
…
étape n : dernière ère
```

Chaque étape contient :

- un titre ;
- une phrase de récit ;
- 4 repères prioritaires ;
- 3 acteurs et 3 lieux maximum ;
- les tags dominants ;
- une progression de révélation.

### Étape 6 — Rendre

- une ligne de spirale ;
- un ruban doré continu ;
- une bande par ère ;
- un `InstancedMesh` pour les événements ;
- un `LineSegments` pour les liens ;
- des étiquettes DOM pour les ères ;
- un voyageur doré qui suit la révélation.

### Étape 7 — Animer et raconter

- à chaque étape, `reveal` progresse de l’ère précédente à l’ère courante ;
- les événements apparaissent quand `t ≤ reveal` ;
- la bande courante s’allume ;
- les bandes futures restent des fantômes ;
- le panneau change de texte, d’événements, d’acteurs et de lieux.

### Étape 8 — Interagir

- `Suivant` / `Précédent` ;
- flèches gauche/droite ;
- clic sur une étiquette d’ère ;
- clic sur un repère → lecteur Grokipedia ;
- changement de pays ;
- `Échap` pour fermer.

---

## 5. Règles de narration pédagogique

1. **Une idée par étape.** Une ère = une étape. Pas de paragraphe de 500 mots.
2. **4 repères maximum** dans le panneau. Le reste est accessible par la spirale et le lecteur.
3. **3 acteurs et 3 lieux maximum** par étape. Assez pour incarner, pas assez pour saturer.
4. **Focus + contexte.** L’ère courante est lumineuse ; les autres restent visibles mais discrètes.
5. **Pas de fausse précision.** Les dates exactes sont dans le texte ; la géométrie ne prétend pas à une échelle linéaire parfaite.
6. **Couleurs stables.** Ère = couleur de l’ère ; tag = couleur du tag ; acteur = or ; lieu = bleu pays.
7. **Progression visible.** Le compteur d’étapes et la barre de progression disent toujours où l’on est.
8. **Sortie vers la preuve.** Chaque repère cliquable mène à l’article et, à terme, aux sources.
9. **Pas de spirale pour la recherche.** La frise linéaire reste le mode de consultation rapide.
10. **Accessibilité.** Navigation clavier, contraste, `prefers-reduced-motion`, alternative textuelle.

---

## 6. Application aux 10 pays

L’algorithme ne change pas ; seules les données changent.

| Pays | Ères | Tours | Étapes | Particularité |
| --- | ---: | ---: | ---: | --- |
| France | 9 | 5,77 | 10 | forte densité de périodes ; beaucoup d’acteurs et lieux |
| Royaume-Uni | 6 | 5,23 | 7 | ères longues ; acteurs impériaux |
| États-Unis | 6 | 5,23 | 7 | domaine court ; événements très denses au XXe siècle |
| Allemagne | 6 | 5,23 | 7 | ruptures politiques fortes |
| Italie | 5 | 5,05 | 6 | long Moyen Âge/Renaissance |
| Espagne | 5 | 5,05 | 6 | Al-Andalus et empire |
| Chine | 5 | 5,05 | 6 | ères impériales longues ; tail impérial |
| Inde | 4 | 4,87 | 5 | quatre grandes ères ; forte densité ancienne |
| Japon | 5 | 5,05 | 6 | préhistoire hors domaine, à traiter en extension |
| Égypte | 5 | 5,05 | 6 | très longue durée ; acteurs et lieux nombreux |

### Cas limites

- **Ère vide** : la bande reste visible, l’étape explique qu’elle n’est pas documentée. C’est le cas de la Chine avant l’intégration des événements de 1912–1949.
- **Peu d’ères** : plus de tours par ère ; la spirale peut sembler plus circulaire. On peut augmenter `N` ou réduire `R_min`.
- **Beaucoup d’ères** : risque de collision des étiquettes. L’algorithme de placement essaie plusieurs offsets radiaux et masque les étiquettes qui ne peuvent pas être placées.
- **Dates disputées** : la position reste celle de la date retenue par la frise ; le panneau et le lecteur signalent l’incertitude.
- **Pas d’acteurs/places** : le panneau affiche les repères et les tags ; les satellites sont absents, pas inventés.

---

## 7. Performance et implémentation

Le rendu Three.js est volontairement pauvre en draw calls :

- **1 ligne** pour la spirale ;
- **1 ruban** continu ;
- **1 bande par ère** (5 à 9) ;
- **1 `InstancedMesh`** pour tous les événements ;
- **1 `LineSegments`** pour les liens ;
- **1 groupe** de satellites ;
- **1 voyageur** doré ;
- étiquettes en DOM, pas en texture.

Aucun post-processing, aucune lumière dynamique, aucun shadow map. Le rendu est arrêté quand la spirale est fermée. Le pixel ratio est plafonné à 1,5. Les étiquettes ne sont recalculées qu’au changement d’étape ou de taille, pas à chaque frame.

Fichiers :

- `dragon.js` — moteur du canevas zoomable qui a succédé à ce prototype (`DRAGON_TIMELINE.md`) ;
- `spiral-meta.js` — acteurs et lieux par ère, générés depuis les dossiers ;
- `scripts/build-spiral-meta.mjs` — génération de `spiral-meta.js` ;
- `styles.css` — overlay, panneau, étiquettes, tooltip, responsive ;
- `index.html` — bouton « Spirale », overlay et chargement du module.

---

## 8. Évaluation à prévoir

La recherche sur les frises montre que la forme influence le temps de lecture mais pas nécessairement la correction. Il faut donc évaluer la spirale sur ce qu’elle prétend faire :

1. **Compréhension narrative** : après avoir avancé étape par étape, l’utilisateur peut-il raconter les grandes ruptures du pays ?
2. **Mémorisation des liens** : peut-il associer un acteur, un lieu et une ère ?
3. **Préférence** : la spirale est-elle perçue comme plus engageante que la frise linéaire ?
4. **Recherche** : est-elle plus lente que la frise pour trouver une date ? Si oui, c’est attendu : la frise reste l’outil de recherche.
5. **Accessibilité** : navigation clavier, contraste, réduction des animations.
6. **Performance** : 60 fps sur un laptop intégré, 30 fps minimum sur mobile.

Protocole suggéré : test inter-sujets (frise vs spirale), 20–30 participants, tâches « trouver », « comparer », « raconter », questionnaire de préférence. Les résultats de Di Bartolomeo et al. servent de base de comparaison.

---

## 9. Limites

- La spirale n’est pas un outil de recherche rapide ; elle doit rester un mode narratif.
- Le nombre d’or est une **règle de composition**, pas une preuve de qualité pédagogique.
- Les acteurs et lieux proviennent des dossiers et sont incomplets pour certaines ères.
- Les dates disputées ne sont pas résolues par la géométrie.
- La spirale ne remplace ni la double lecture ni les sources : elle les rend plus lisibles.
- Les 10 pays n’ont pas encore été testés avec des utilisateurs.

---

## 10. Références

- Di Bartolomeo, S., Pandey, A., Leventidis, A., Saffo, D., Syeda, U. H., Carstensdottir, E., Seif El-Nasr, M., Borkin, M. A., & Dunne, C. (2020). *Evaluating the Effect of Timeline Shape on Visualization Task Performance*. CHI ’20. DOI : [10.1145/3313831.3376237](https://doi.org/10.1145/3313831.3376237).  
  → Les frises linéaires sont plus rapides pour la recherche ; les spirales sont moins efficaces pour le lookup et exigent des repères visuels.

- Hübner, R. (2024). *Golden spiral or Fibonacci spiral: Which is more beautiful and why?* i-Perception, 15(2). DOI : [10.1177/20416695241243319](https://doi.org/10.1177/20416695241243319).  
  → La spirale dorée est préférée à la spirale de Fibonacci ; la continuité de la courbure explique une partie de cette préférence. Le facteur de croissance de la spirale dorée est `b ≈ 0,3063`.

- Segel, E., & Heer, J. (2010). *Narrative Visualization: Telling Stories with Data*. IEEE Transactions on Visualization and Computer Graphics, 16(6), 1139–1148. DOI : [10.1109/TVCG.2010.179](https://doi.org/10.1109/TVCG.2010.179).  
  → Genres de narration visuelle, slideshow interactif, structure « martini glass », progression et highlighting.

- Brehmer, M., Lee, B., Bach, B., Riche, N. H., & Munzner, T. (2017). *Timelines Revisited: A Design Space and Considerations for Expressive Storytelling*. IEEE TVCG, 23(9), 2151–2164. DOI : [10.1109/TVCG.2016.2614803](https://doi.org/10.1109/TVCG.2016.2614803).  
  → Espace de conception des frises, représentation, échelle, disposition et narration.

---

## 11. Conclusion

La spirale narrative n’est pas une décoration : c’est un **algorithme de mise en récit** qui transforme un domaine temporel, des ères, des événements, des tags, des acteurs et des lieux en une forme continue, progressive et lisible.

Le nombre d’or donne la **continuité de la courbe** ; Three.js donne le **rendu** ; la structure de slides donne la **pédagogie**. La frise linéaire reste l’index. La spirale devient le récit.

C’est cette séparation — **index vs récit** — qui permet d’appliquer la méthode à n’importe quel pays sans fabriquer une forme différente à chaque fois.
