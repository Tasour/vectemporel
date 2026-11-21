# Risques et angles morts — sphère WebGL

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| WebGL indisponible (mobile ancien, navigateur verrouillé) | Moyenne | Élevé | Détection explicite + message de repli, pas d'écran noir silencieux |
| Couture de la texture équirectangulaire aux pôles | Élevée | Faible | Convention UV unique documentée dans `lonlat.js` ; test visuel aux pôles |
| Picking imprécis au raycast (bord de polygone, dos de la sphère) | Moyenne | Moyen | Raycast sur la sphère puis `pointInFeature()` ; rejet du côté arrière |
| +~160 Ko gzip de Three.js fait dépasser 1 Mo | Faible | Élevé | Mesure `test:perf` ; snapshot déjà optimisé (593 Ko) |
| `console.warn` de dépréciation r152 | Certaine | Faible | Documenté, non traité comme erreur par les harnais |
| HUD trop minimal pour l'accessibilité | Moyenne | Moyen | Recherche `/`, aide `?`, `aria-live`, cibles 44 px, focus visible |
| Rotation auto inconfortable | Moyenne | Faible | Arrêt au premier geste, `prefers-reduced-motion`, touche d'arrêt |
| Service worker qui sert une ancienne version de `three.min.js` | Moyenne | Moyen | Bump du cache à `vectemporel-v4` et précache de l'actif |

## Angles morts

- Aucun test utilisateur : le rendu « jeu vidéo » est validé par captures uniquement.
- Palette de couleurs dérivée des tokens locaux : la palette Chronas n'est pas copiable légalement.
- Le snapshot ne couvre que l'année 1000 ; le HUD l'affiche explicitement.
- Le raccourci Omarchy et l'URL Pages ne changent pas : aucun test spécifique au menu dans ce dépôt.
