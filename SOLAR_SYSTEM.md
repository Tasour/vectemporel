# Systeme solaire — carte des periodes

Design v1.0 — 17 novembre 2026.

## Principe

Le pays n'est plus une queue spiralee : c'est une carte 2D de systemes.

- un soleil = une periode (ere) ;
- une planete = un evenement en orbite de son ere ;
- une lune = personnage, lieu ou repere-cle (edit, traite, loi) autour de l'evenement.

Tout est range autour de son ere : la structure se lit sans tourbillon.

## Geometrie

soleil_i = (320 + 620*i, 360 + 130*(i mod 2))
planete_j : rayon = 86 + 29*j, angle = j*theta + 0,55*i
lune_k : rayon = 24 + 11*k, angle = k*theta

theta = pi(3 - sqrt(5)) : angle d'or, repartition sans grappe. Orbites lentes, images verifiees sur les planetes. Lunes : or = personnage, bleu = lieu, violet = repere lie.

## Navigation

Molette ou + / - : zoom. Glisser : deplacer. Fleches gauche/droite : periode. Fleches haut/bas : evenement. Entree : fiche Grokipedia. Espace : lunes. 0 : vue d'ensemble. Echap : monde 3D.

Clic sur un objet : selection et cadrage de la camera. Panneau lateral : contenu verifie.

## Liens

- Monde 3D : menu principal, selection du pays.
- Systeme : cette carte, apres le globe.
- Recit : lecture narrative (periodes, panorama, lieux satellite).
- Lecteur : sortie commune.

Fichier : solar.js. Donnees : data.js, spiral-meta.js, event-images.js, place-atlas.js.
