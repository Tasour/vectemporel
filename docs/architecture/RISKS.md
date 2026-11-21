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
| Service worker qui sert une ancienne version de `three.min.js` | Faible | Moyen | Cache versionné automatiquement par hash de contenu (P8), anciens caches supprimés à l'activation |

## Angles morts

- Aucun test utilisateur : le rendu « jeu vidéo » est validé par captures uniquement.
- Palette de couleurs dérivée des tokens locaux : la palette Chronas n'est pas copiable légalement.
- Le snapshot ne couvre que l'année 1000 ; le HUD l'affiche explicitement.
- Le raccourci Omarchy et l'URL Pages ne changent pas : aucun test spécifique au menu dans ce dépôt.

## Risques du plan de features (P0–P5)

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Import 4 001 ans trop long / throttlé | Élevée | Élevé | Concurrence bornée à 4, retries 429/503, checkpoint reprenable |
| Chunks de deltas trop volumineux | Moyenne | Moyen | Découpage par siècle, mesure `test:perf`, compression serveur |
| Reconstruction d'année inexacte | Moyenne | Élevé | Test F09 : `getYear(1000)` identique au snapshot actuel + checksums |
| VRAM 4096×2048 (~43 Mo) | Moyenne | Élevé | Repli automatique 2048×1024 (F11) |
| Scrubbing rapide → chargements multiples | Élevée | Moyen | Debounce 120 ms + `AbortController` (F08) |
| Rotation manuelle oubliée si l'auto reste | Faible | Moyen | Test e2e : aucun mouvement après 60 s (F13) |
| Dérive du budget initial | Faible | Élevé | Gate `test:perf` < 50 req / < 1 Mo à chaque phase |
| Polygones concaves ou dégénérés (ADR-0007) | Moyenne | Moyen | `ShapeUtils.triangulateShape`, 2 anneaux ignorés sur 2 492 mesurés |
| Antiméridien −180/+180 (ADR-0007) | Faible | Moyen | Normalisation autour du centroïde ; 0 anneau concerné mesuré |
| Z-fighting sphère/maillage | Faible | Moyen | Rayon 1.003 pour le maillage, 1.004 pour les contours |
| Reconstruction lente à chaque année | Moyenne | Moyen | 44 ms mesurés à chaud, seuil 2 s dans `test:vector` pour les démarrages à froid |
| Mode « libellés modernes » indisponible | Certaine | Faible | Noms modernes absents du snapshot local ; mode remplacé par Capitales, tracé en P11 |
| 400 Chromium sur les chunks via SW | Faible (corrigé) | Moyen | Le SW sert les chunks précachés et laisse les autres au fetch navigateur sans réécriture |
