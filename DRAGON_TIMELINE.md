# Queue du dragon — canevas temporel zoomable

> **Note de design v1.0 — 17 novembre 2026.**
> Mode de narration de Vectemporel : un canevas vectoriel infini où le zoom est le temps. Chaque écaille de la queue est un repère daté, illustré, relié à son ère, à des figures et à des lieux.

---

## 1. L’intuition : une conférence que l’on traverse

Les présentations associées aux conférences d’Idriss Aberkane relèvent du genre du **canevas zoomable** (le modèle Prezi) : il n’y a pas de pile de diapositives, mais un espace dans lequel on avance par zooms successifs. Prezi décrit son produit comme une « toile ouverte et zoomable ». La recherche sur les présentations à canevas (Lichtschlag et al., CHI 2012) montre que ce format change la manière d’organiser et de recevoir une présentation : la structure spatiale devient le fil du récit.

Vectemporel reprend ce principe, mais le contraint par les données historiques :

- la forme n’est pas libre ; elle est une **spirale logarithmique** ;
- l’ordre des tuiles est **chronologique** ;
- chaque tuile est un **repère vérifié** du corpus ;
- le zoom n’est pas un effet : c’est **le déplacement dans le temps**.

La métaphore est celle d’une **queue de dragon** : une colonne vertébrale dorée, des écailles alternées, et une tête qui se déplace vers le présent quand on zoome. La queue se déplie à l’infini ; les écailles non documentées sont explicitement marquées comme telles.

---

## 2. Pourquoi un canevas et pas une frise

La frise linéaire de Vectemporel reste l’outil de **recherche** : trouver une date, comparer deux repères, filtrer par tags. Le canevas dragon est l’outil de **récit** : parcourir une histoire dans l’ordre, une écaille après l’autre, en voyant les ères et les acteurs se succéder.

Cette séparation vient de la recherche sur la narration visuelle (Segel & Heer, 2010) et sur les frises (Brehmer et al., 2017) : un même dispositif ne peut pas optimiser également la lecture rapide et l’immersion narrative. Le modèle du **slideshow interactif** de Segel et Heer s’applique ici : une suite de cadres guidés, mais avec interaction locale et sortie possible vers l’exploration.

| Mode | Question servie | Forme | Action dominante |
| --- | --- | --- | --- |
| Frise | « Quand ? Comparer. » | ligne horizontale | chercher, filtrer |
| Spirale narrative | « Quelles ruptures ? » | spirale dorée amortie | avancer par ère |
| Queue du dragon | « Raconte-moi, écaille par écaille. » | canevas zoomable | zoomer dans le temps |

---

## 3. Géométrie

### 3.1 Spirale logarithmique

Pour un repère d’indice `u` :

```text
θ(u) = φ₀ + Δθ · u
r(u) = e^(−b · Δθ · u)
P(u) = r(u) · (cos θ(u), sin θ(u))
```

- `Δθ = 0,58` rad : un repère tous les 33° ;
- `b = 0,55 · ln(φ)/(π/2) ≈ 0,168` : croissance dorée amortie ;
- `φ₀ = −1,74` rad : le repère courant part avec une tangente horizontale ; le futur est à droite, le passé à gauche ;
- `r` décroît avec le temps : **le futur est vers le centre de la spirale, le passé vers l’extérieur**.

Le facteur d’échelle entre deux écailles consécutives est :

```text
r(u+1)/r(u) = e^(−b·Δθ) ≈ 0,906
```

Chaque écaille est donc environ 10 % plus petite que la précédente : c’est cette décroissance geométrique qui produit la sensation de zoom infini.

### 3.2 Le zoom est le temps

La caméra est centrée sur `P(p)` où `p` est l’indice courant, avec une hauteur de vue :

```text
h(p) = 2 · VIEW · r(p)
```

Ainsi la taille à l’écran d’une écaille `j` ne dépend que de `j − p` :

```text
taille_écran(j) ∝ r(j)/r(p) = e^(−b·Δθ·(j−p))
```

Conséquence importante : **la disposition des écailles autour du repère courant est invariante**. Avancer d’une écaille revient exactement à zoomer d’un facteur `e^(b·Δθ) ≈ 1,10` et à translater la caméra. Il n’y a pas de saut d’échelle, pas de rechargement, pas de transition entre « niveaux de détail » : la même géométrie se répète à l’infini.

### 3.3 Écailles et colonne vertébrale

- la colonne vertébrale est un **ruban doré continu** (halo + corps + âme sombre) ;
- chaque ère est une **bande colorée** sur ce ruban ;
- chaque repère porte un **tiret perpendiculaire** (une vertèbre) ;
- les écailles sont des tuiles DOM alternées de part et d’autre du ruban, reliées à la vertèbre par un fil pointillé ;
- l’écaille courante est cerclée d’or, les autres s’atténuent avec la distance.

Le fond est un dégradé sombre avec halo or, halo couleur pays, grain animé et balayage conique très lent : la même ambiance que le lecteur et la frise.

---

## 4. Anatomie d’une écaille

Chaque écaille contient, dans l’ordre de lecture :

1. **une image** : photographie ou œuvre vérifiée, sinon motif génératif signalé ;
2. **une ère** et sa plage de dates ;
3. **un repère** : titre, année, sous-titre, résumé ;
4. **des tags** ;
5. **des figures et des lieux** issus du dossier pays (maximum 2 + 2 dans la fiche).

C’est la réponse à la demande « lier personnages, lieux, époques, événements, tags en un seul objet » : l’écaille est l’unité de connaissance. Le clic ouvre la fiche Grokipedia intégrée.

---

## 5. Images : règle d’or

Grokipedia publiant peu ou pas d’images, Vectemporel doit imager lui-même. Deux sources sont autorisées :

### 5.1 Images documentaires vérifiées

`images/event-images.curation.json` liste des fichiers Wikimedia Commons choisis un par un. `scripts/build-event-images.mjs` :

1. interroge l’API Commons pour **confirmer le fichier** ;
2. lit le nom de licence, l’auteur et l’URL de licence dans `extmetadata` ;
3. télécharge une vignette de 800 px ;
4. écrit `event-images.js` avec `src`, `alt`, `caption`, `credit`, `license`, `licenseUrl`, `source`.

**10 repères** sont ainsi illustrés par des images documentaires : Révolution et 1944 (France), Révolution industrielle (Royaume-Uni), Civil Rights Act (États-Unis), chute du Mur (Allemagne), Grenade (Espagne), Qin (Chine), Moghols (Inde), Edo (Japon), Khéops (Égypte). Le registre complet est dans `EVENT_IMAGES.md`.

### 5.2 Motifs génératifs

Les autres repères reçoivent un **motif SVG déterministe** : palette du tag, couleur de l’ère, couleur du pays, année en typographie, et un motif par domaine (colonnes, chevrons, orbites, arches, réseaux, compas…). Il est affine par hachage de l’identifiant : même repère, même image.

> Ces motifs sont explicitement étiquetés **« motif génératif · non documentaire »**. Aucune image historique n’est fabriquée, aucun crédit n’est supposé.

Cette distinction est essentielle : la beauté du canevas ne doit jamais faire croire à une source qui n’existe pas.

---

## 6. Algorithme systémique (tous pays)

```text
1. Charger le pays : domaine, ères, repères, tags, acteurs, lieux.
2. Trier les repères par année ; leur attribuer une ère.
3. Calculer startIndex/endIndex de chaque ère.
4. Construire le ruban, les bandes d’ères et les vertèbres.
5. Pour chaque repère visible :
     d = j − p
     position = P(p+d) − P(p), projetée à l’échelle r(p)
     taille ∝ r(j)/r(p)
5. Pour l’écaille courante : image, ère, résumé, tags, figures, lieux.
6. Animer p vers la cible ; recalculer les 15 écailles visibles.
7. Arrêter le rendu dès que p est stabilisé.
```

L’algorithme est identique pour les 10 pays. Seules changent les données.

| Pays | Repères | Ères | Particularité |
| --- | ---: | ---: | --- | --- |
| France | 57 | 9 | forte densité, nombreuses figures et lieux |
| Royaume-Uni | 24 | 6 | longues ères impériales |
| États-Unis | 22 | 6 | domaine court, densité au XXe siècle |
| Allemagne | 21 | 6 | ruptures politiques fortes |
| Italie | 19 | 5 | longue durée antique et médiévale |
| Espagne | 17 | 5 | Al-Andalus et empire |
| Chine | 17 | 5 | ères impériales longues |
| Inde | 16 | 4 | forte densité ancienne |
| Japon | 17 | 5 | préhistoire hors domaine |
| Égypte | 19 | 5 | très longue durée |

---

## 7. Interaction

| Geste | Effet |
| --- | --- |
| Molette vers le haut | zoom avant, une fraction d’écaille vers le présent |
| Molette vers le bas | zoom arrière vers le passé |
| Pincement | même navigation sur mobile |
| Glisser verticalement | parcourir la queue |
| `+` / `-`, flèches | avancer / reculer d’une écaille |
| `Début` / `Fin` | première / dernière écaille |
| Clic sur une écaille lointaine | la rejoindre |
| Clic sur l’écaille courante | ouvrir la fiche |
| Clic sur une bande du rail | sauter à l’ère |
| `Échap` | fermer |

La barre de droite est une **carte de profondeur** : chaque segment est une ère, proportionnelle au nombre de repères ; le curseur doré indique l’écaille courante.

---

## 8. Performance

- **1 renderer Three.js**, scène statique par pays : 3 rubans pour la queue, 1 ruban par ère, 1 `LineSegments` pour les vertèbres.
- **15 écailles DOM** recyclées, pas 229 : seules les écailles visibles existent.
- **15 connectors SVG**, un par écaille visible.
- Rendu **à la demande** : le moteur s’arrête dès que l’animation est terminée ; au repos, aucun frame n’est dessiné.
- Pixel ratio plafonné à 1,6 ; pas de lumière, pas d’ombre, pas de post-processing.
- Images : vignettes 800 px, chargement différé ; motifs SVG mis en cache.

Le facteur limitant reste la fréquence de l’écran : 60 fps sur 60 Hz, 120 fps sur 120 Hz, et un coût nul au repos.

---

## 9. Limites

- Le zoom infini est **géométrique**, pas documentaire : la queue continue au-delà du corpus, avec des écailles « hors corpus » explicitement marquées.
- Une écaille ne prétend pas résumer toute une ère : elle est un repère, avec son contexte.
- Les acteurs et lieux proviennent des dossiers et restent incomplets pour certaines ères.
- 10 repères seulement ont une image documentaire vérifiée ; les autres ont un motif génératif signalé.
- La lecture rapide reste le rôle de la frise linéaire.
- Le mode n’a pas encore été évalué auprès d’utilisateurs.

---

## 10. Références

- Prezi, *Product — zoomable open canvas* : <https://prezi.com/fr/product>.  \n  → Référence de genre pour le canevas zoomable ; aucun lien d’affiliation avec Vectemporel.
- Lichtschlag, L., Hess, T., Karrer, T., & Borchers, J. (2012). *Canvas Presentations in the Wild*. CHI ’12 Extended Abstracts. <https://hci.rwth-aachen.de/publications/lichtschlag2012b.pdf>.  \n  → Les outils à canevas zoomable organisent la présentation comme un espace et non comme une suite de diapositives.
- Segel, E., & Heer, J. (2010). *Narrative Visualization: Telling Stories with Data*. IEEE TVCG, 16(6), 1139–1148. DOI : [10.1109/TVCG.2010.179](https://doi.org/10.1109/TVCG.2010.179).
- Brehmer, M., Lee, B., Bach, B., Riche, N. H., & Munzner, T. (2017). *Timelines Revisited*. IEEE TVCG, 23(9), 2151–2164. DOI : [10.1109/TVCG.2016.2614803](https://doi.org/10.1109/TVCG.2016.2614803).
- Di Bartolomeo, S., et al. (2020). *Evaluating the Effect of Timeline Shape on Visualization Task Performance*. CHI ’20. DOI : [10.1145/3313831.3376237](https://doi.org/10.1145/3313831.3376237).  \n  → Les formes non linéaires sont plus lentes pour la recherche : la frise linéaire reste l’outil de consultation.
- Hübner, R. (2024). *Golden spiral or Fibonacci spiral: Which is more beautiful and why?* i-Perception, 15(2). DOI : [10.1177/20416695241243319](https://doi.org/10.1177/20416695241243319).

---

## 11. Fichiers

- `dragon.js` — moteur du canevas, géométrie, images, fiche, navigation ;
- `event-images.js` — images documentaires générées (`npm run build:event-images`) ;
- `images/event-images.curation.json` — curation des fichiers Commons ;
- `EVENT_IMAGES.md` — registre des crédits et licences ;
- `spiral-meta.js` — figures et lieux par ère (`npm run build:spiral-meta`) ;
- `styles.css` — thème du canevas, écailles, fiche, rail, responsive ;
- `index.html` — bouton « Dragon » et overlay.
