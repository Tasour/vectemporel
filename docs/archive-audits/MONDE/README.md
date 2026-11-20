# Vague « Monde » — 50 lentilles d'audit

50 sous-agents, un par lentille, sur **l'unique vue Monde** de l'app unifiée.
Méthode identique : 10 chantiers par lentille, **les 10 implémentés**, synthèse maître.

## Architecture anti-collision

Chaque lentille possède **un seul fichier** : `src/views/monde/Mxx.js`.
Le stub initial est remplacé par son sous-agent. Le registre `src/views/monde/registry.js`
applique les 50 greffons à chaque rendu du globe, sans toucher aux fichiers partagés.
Contrat : `register('Mxx', (ctx) => { … })` avec `ctx = { stage, scene, host, selected,
countries, state, selectCountry, reveal, reducedMotion, say, css, el, onReady, onHover, onLeave }`.

## Les 50 lentilles

| Domaine | IDs |
| --- | --- |
| A. Rendu & moteur WebGL | M01–M10 |
| B. Drapeau & révélation | M11–M20 |
| C. Ergonomie & interaction | M21–M30 |
| D. Données & sémantique | M31–M40 |
| E. Qualité & validation | M41–M50 |

| ID | Lentille | ID | Lentille |
| --- | --- | --- | --- |
| M01 | Ombres et éclairage | M26 | Sélection courante |
| M02 | Textures du globe | M27 | Recherche de pays |
| M03 | Palette de picking | M28 | Aide contextuelle |
| M04 | Caméra et rotation | M29 | Mobile et reflow |
| M05 | Zoom et bornes | M30 | États vides |
| M06 | DPR et budget pixels | M31 | Modèle de données pays |
| M07 | Boucle rAF et pause | M32 | Noms et libellés |
| M08 | IntersectionObserver | M33 | Codes ISO et drapeaux |
| M09 | Contexte WebGL | M34 | Ères et repères |
| M10 | Mouvement réduit | M35 | Couverture et points |
| M11 | Masque de découpe | M36 | Provenance des sources |
| M12 | Drapeaux locaux | M37 | Non-invention |
| M13 | Survol clavier | M38 | Deep links pays |
| M14 | Survol pointeur | M39 | Taxonomie du Monde |
| M15 | Animation de zoom | M40 | Cohérence inter-vues |
| M16 | Page dans le contour | M41 | ARIA et rôles |
| M17 | Nom et légende | M42 | Contraste |
| M18 | Exactitude du drapeau | M43 | Focus et piège |
| M19 | Repli sans WebGL | M44 | Performance perçue |
| M20 | Annonces live | M45 | Tests E2E du globe |
| M21 | Grille des dix pays | M46 | Vérification statique |
| M22 | Ordre de lecture | M47 | Diagnostics |
| M23 | Cibles tactiles | M48 | Documentation |
| M24 | Raccourcis clavier | M49 | Non-régression |
| M25 | Navigation flèches | M50 | Synthèse et dettes |

## Règles pour les lentilles

- Un seul fichier modifié : son module `Mxx.js`. Aucun `styles.css`, `globe.js`, `store.js`, etc.
- CSS via `ctx.css('monde-mxx', …)` ; éléments avec IDs uniques et garde d'existence (rendu répété).
- Ne pas toucher aux sélecteurs utilisés par les tests (`.globe-list button`, `.globe-country`, `#globe-reveal`, `.event-card`, …).
- Zéro réseau, zéro `Math.random`, aucune donnée historique inventée, aucun `console.*` (0 erreur console exigée).
- Vérification par lentille : `node --check src/views/monde/Mxx.js` uniquement. Les suites E2E sont rejouées par l'agent maître à la fin.
