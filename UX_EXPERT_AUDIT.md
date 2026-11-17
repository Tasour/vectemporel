# Audit UX/UI externe — Système solaire Vectemporel

Date : 17 novembre 2026. Méthode : trois agents experts indépendants, sans communication entre eux, avec des grilles de lecture distinctes. Tous ont rendu un avis écrit avant toute modification.

- Agent A — interaction design, architecture de l'information, wayfinding.
- Agent B — charge cognitive, lisibilité, modèle mental.
- Agent C — accessibilité (WCAG) et pédagogie.

## 1. Convergence des trois audits

| Constat | A | B | C | Gravité |
| --- | --- | --- | --- | --- |
| Rotation continue : cibles mobiles, ancrage spatial détruit, attention captée | X | X | X | Critique |
| Métaphore opaque : ère/événement/lune non définie à l'écran | X | X | X | Critique |
| Aucun ordre chronologique explicite, ni rang, ni « où suis-je ? » | X | X | X | Critique |
| 233 objets simultanés (France) : pas de divulgation progressive | - | X | X | Critique |
| Pas d'équivalent textuel / ARIA pour la carte | X | - | X | Majeur |
| Remontée de niveau non documentée (Échap seul) | X | - | X | Majeur |
| Trois modes avec modèles mentaux incompatibles | X | X | - | Majeur |
| Images sans alternative textuelle sur les planètes | - | - | X | Majeur |

**Verdict unanime :** conserver la hiérarchie ère → événement → détails, mais déclasser la métaphore solaire en **illustration figée** et faire d'un **tableau de décision textuel et ordonné** la voie de navigation principale.

## 2. Ce que les agents ont dit (extraits synthétiques)

A : « Le problème n'est pas le manque de fonctionnalités, c'est l'absence de structure discrète. La métaphore est exploratoire ; la tâche est séquentielle et décisionnelle. »

B : « 233 objets, c'est ~50 fois la capacité de mémoire de travail. Le passage globe → pays n'a filtré qu'un pays, pas la profondeur. »

C : « Sans équivalent textuel, la hiérarchie reste purement visuelle : un lecteur d'écran annonce un graphique vide. »

## 3. Les cinq chantiers prioritaires

### Chantier 1 — Figer la carte et rendre la sélection visible (fait)
Supprimer toute rotation ; positions canoniques ; anneau et ombre sur l'objet actif ; libellés horizontaux ; légende permanente soleil/planète/lune.
Acceptation : 0 animation sur les orbites ; contraste ≥ 4,5:1 ; aucun libellé penché ; l'objet revient aux mêmes coordonnées après un aller-retour.
*Statut : livré.*

### Chantier 2 — Tableau de décision hiérarchique (fait)
Rail gauche avec fil d'Ariane cliquable, rang (« 2 / 3 événements · 52 av. J.-C. »), arbre ordonné périodes → événements → lunes, et boutons précédent / suivant / remonter. La carte devient un aperçu.
Acceptation : 100 % des événements atteignables sans la carte ; l'actif est visible dans l'arbre ; navigation à l'événement suivant en ≤ 2 s.
*Statut : livré.*

### Chantier 3 — Divulgation progressive (fait)
Ne plus afficher qu'une ère à la fois dans la carte ; les autres êtres réduits à des points ; un bouton « une seule ère » par défaut, « toutes les ères » optionnel. Cible : ≤ 15 objets nommés simultanément.
Acceptation : moins de 15 libellés visibles ; zoom resserré par défaut ; test utilisateur : trouver un repère nommé en ≤ 5 s.
*Statut : livré — une seule ère nommée par défaut, les huit autres réduites à des points ; bascule « Toutes les ères ».*

### Chantier 4 — Accessibilité et équivalent textuel (partiel)
Rôles ARIA `tree`/`treeitem`, `aria-selected`, focus visible, `aria-pressed` sur le basculement des lunes, alternatives textuelles sur les images des planètes, annonce du rang à la sélection.
Acceptation : WCAG 2.1.1 / 2.4.7 / 1.1.1 ; parcours complet clavier souris éteinte, 0 erreur.
*Statut : partiel — rôles `tree`/`treeitem`, `aria-selected`, `role=status`, `aria-pressed`, focus visible et alternatives textuelles en place ; relecture lecteur d’écran à faire.*

### Chantier 5 — Cohérence des trois modes (partiel)
Un seul état partagé entre Monde, Système et Récit ; même fil d'Ariane, même sélection, même vocabulaire (ère / événement / détail). Aiguillage par intention : « suivre la chronologie », « écouter le récit », « voir la carte ».
Acceptation : changer de mode conserve pays, ère et événement ; l'utilisateur peut énoncer où il est dans n'importe quel mode.
*Statut : partiel — le Système transmet pays, ère et événement au Récit ; le retour Récit → Système reste à synchroniser.*

## 4. Ordre recommandé

1 et 2 sont livrés. Enchaîner avec **3** (divulgation progressive), puis **4** (accessibilité), puis **5** (cohérence inter-modes). Le chantier 3 est celui qui réduit le plus la charge cognitive ; le 4 est non négociable ; le 5 évite la multiplication des modèles mentaux.
