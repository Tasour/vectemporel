# Spécification comportementale — mode Histographie

Analyse du source public de https://histography.io/ (script.js et style.css consultés le 2026-11-23). **Aucun code ni asset n'est copié** : le site ne publie pas de licence. Réimplémentation originale dans Vectemporel.

## Interactions observées

- Un événement = un point ; les points sont répartis horizontalement selon l'année et verticalement par grappes.
- Deux poignées bornent la plage visible ; le titre du menu indique la durée choisie (« N years », « the Nth century »).
- La molette zoome autour du curseur ; le curseur affiche l'année correspondant à sa position x.
- Survol : les points proches grossissent ; un clic ouvre une fiche d'événement.
- Le menu latéral liste des catégories avec compteurs ; deux filtres maximum sont actifs.
- Le pied affiche une liste d'époques cliquables qui déplacent la plage.
-Une ligne verticale suit la souris ; une infobulle « WE KNOW VERY LITTLE ABOUT THIS TIME PERIOD » apparaît aux époques très anciennes.
- Deux modes : graphe linéaire et vue circulaire « Editorial Stories ».

## Adaptation Vectemporel

- Plage : -2000 → 2000 (au lieu de 13,8 milliards d'années).
- Points : 560 épiques Chronas + 49 ruptures + transitions de l'item sélectionné.
- Catégories : guerre, empire, personne, rupture, province, religion.
- Fiche d'événement : texte sémantique local, source Chronas CC BY-SA 4.0, lien vers le rapport Noeta de l'item.
- Mode « Récits » : adaptation originale de « Editorial Stories » — un flux éditorial groupé par époque, construit depuis les mêmes événements (ruptures et faits de province prioritaires, puis échantillonnage régulier), sans disposition circulaire ni code copié. Le bouton du menu bascule entre frise et récits.
- Aucun son, aucun appel réseau, aucune image externe ; disposition déterministe (graine 20261121).
- Mobile : menu en tiroir, pied compact, zone de points réduite.
