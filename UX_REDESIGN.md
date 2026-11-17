# Recette 5 étoiles — structure UX/UI unifiée

> **Version 1.0 — 17 novembre 2026.** Conserve les idées fortes (frise, globe,
> spirale, Récit, lecteur) et les organise en un seul système.

---

## 1. Le diagnostic

Les bonnes idées existaient, mais vivaient dans des écrans séparés : frise linéaire,
globe, spirale narrative, queue du dragon, puis Récit. Chaque mode avait sa propre
barre, ses propres raccourcis et sa propre logique de sélection. La vue « Lieux »
avait en plus trois défauts concrets :

- des lieux **hors territoire** (Alger) mélangés aux lieux de France ;
- des **coordonnées absentes** masquées par un repli silencieux ;
- un fond abstrait sans échelle géographique, avec des étiquettes qui se chevauchent.

La recette ci-dessous corrige la structure, pas seulement la couleur.

---

## 2. Les trois verbes

Toute l’application se résume à trois verbes, dans cet ordre :

| Verbe | Question | Vue | Touche |
| --- | --- | --- | --- |
| **Raconter** | Que s’est-il passé ? | Récit : période → panorama → lieux | `R` |
| **Explorer** | Comment ça se relie ? | Queue du dragon | `D` / `Échap` |
| **Consulter** | Quand, précisément ? | Frise classique (`?classic=1`) | — |

Le globe devient un **sélecteur de pays** disponible dans la frise classique ; il
n’est plus une destination. Le lecteur Grokipedia reste une **sortie** depuis le
dragon, pas un mode à part entière.

---

## 3. Une seule coque

Les deux vues actives partagent la même barre supérieure :

```
[ Récit | Dragon ]   [ pays ▾ ]        [ ? ] [ × ]
```

- les onglets basculent d’un mode à l’autre sans perdre le pays ni le repère ;
- le sélecteur de pays est **le même** partout ;
- `R` ouvre le Récit, `Échap` revient au Dragon, `D` y retourne ;
- le fil narratif (Périodes › Panorama › Lieux) est cliquable et accessible avec `Maj+1/2/3`.

Plus de double barre, plus de bouton « fermer » qui change de sens selon l’écran.

---

## 4. Le récit, en trois temps

1. **Périodes** — une carte par ère, avec couverture, dates et densité. `1`–`9` pour sauter, `Entrée` pour entrer.
2. **Panorama** — un plan par repère : grande image, récit découpé en phrases, pellicule, lecture automatique. `←/→`, `Espace`.
3. **Lieux** — une **carte satellite réelle** (Esri World Imagery) avec marqueurs vérifiés, chemin chronologique et zoom cinématographique. `←/→`, `+/-`, `0`.

Le texte est toujours celui des repères vérifiés : aucune anecdote n’est fabriquée.

---

## 5. La carte satellite

- fond image exporté pour la zone courante, avec attribution visible ;
- marqueurs issus de l’atlas vérifié (114/120 coordonnées) ;
- emprise calculée sur le **contour principal** du pays, pour ne pas inclure les territoires d’outre-mer ;
- séparation explicite entre **lieux liés à la période**, **contexte du pays** et **lieux hors territoire** ;
- si une ère n’a aucun lieu lié, un état vide le dit et propose de voir le pays ;
- étiquettes limitées au lieu actif et à ses deux voisins, pour éviter le chevauchement ;
- repli schématique si le fond distant est indisponible.

---

## 6. Règles transversales

1. **Clavier complet** : chaque action a un raccourci ; l’aide `?` est contextuelle.
2. **Focus visible et piégé** dans l’overlay actif.
3. **Le pays ne se perd jamais** : sélecteur commun, état conservé entre Récit et Dragon.
4. **Aucune donnée inventée** : ni date, ni citation, ni coordonnée, ni anecdote.
5. **Une seule sortie vers la preuve** : le lecteur et les crédits image, accessibles depuis la fiche détaillée.
6. **Hiérarchie typographique forte** : serif pour les titres, sans pour les métadonnées, or pour l’action.
7. **Densité progressive** : période → repère → lieu ; jamais trois niveaux sur le même écran.
8. **Animation au service du sens** : transition de plan, survol de marqueur, jamais d’effet gratuit.
9. **Performance** : rendu WebGL à la demande, une image satellite par vue, pas de tuiles.
10. **Honnêteté visuelle** : les motifs génératifs et les états vides sont étiquetés.

---

## 7. Ce qui reste outside

- La frise et le globe restent dans le code mais hors du parcours par défaut (`?classic=1`).
- 6 lieux n’ont pas de coordonnée vérifiée et ne sont pas cartographiés.
- Le fond satellite dépend du service Esri ; un repli existe.
- L’évaluation utilisateur reste à faire.
