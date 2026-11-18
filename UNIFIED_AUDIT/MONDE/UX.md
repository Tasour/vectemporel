# Vague UI/UX — vue Monde (12 agents)

12 sous-agents améliorent les éléments visibles de la vue Monde, chacun dans **son module exclusif**. Le moteur (`public/globe-engine.js`) et `globe-reveal.js` sont réservés à l'agent maître (mapping « cover » du drapeau déjà appliqué).

| Agent | Fichier | Focus |
| --- | --- | --- |
| ✅ M17 | `M17.js` | Légende du pays survolé — hiérarchie serif/ISO/chiffres, liseré pays, position non chevauchante, planchers mobile/zoom |
| M21 | `M21.js` | Grille des 10 pays |
| ✅ M27 | `M27.js` | Recherche / filtre — champs libellés, compteur segmenté, état vide contextualisé, reset natif |
| ✅ M48 | `M48.js` | Aide et vocabulaire — disclosure explicite, 3 sections courtes, filtre accent-insensible, focus restitué |
| ✅ M25 | `M25.js` | Navigation ◀ ▶ / rail — cibles 44 px, readout ordinal + nom, pips agrandis, transitions réduites |
| ✅ M05 | `M05.js` | Zoom — chiffre dominant + jauge, raccourcis en pastilles, bornes explicites, boutons disabled, carte unique placée sous M17 |
| ✅ M24 | `M24.js` | Légende des raccourcis — décalée des commandes, `<kbd>` lisibles, mobile une colonne |
| ✅ M29 | `M29.js` | Mobile 390×844 — bas de scène désempilé, recherche compacte (189→114 px), aide hors grille (liste 293→366 px), cibles 59×48, 0 chevauchement |
| ✅ M42 | `M42.js` | Contraste / typographie — légende sous la figure (plus de chevauchement), focus 3 px, `forced-colors` étendu, état sélectionné sans couleur, interlignes |
| ✅ M38 | `M38.js` | Lien local du pays — panneau compact, champ monospace, bouton Copier évident, état « Copié ✓ », anti-chevauchement |
| M30 | `M30.js` | États vides |
| ✅ M23 | `M23.js` | Cibles tactiles — commandes sans débordement, focus 3 px sur boutons et cartes, panneau mobile repositionné |

## Validation finale (agent maître)

- 12/12 agents livrés, `node --check` OK sur les 12 modules.
- `npm run check` : **tout PASS**, 16/16 E2E, 0 erreur console.
- Desktop 1440×900 : 7 éléments visibles dans la scène, panneaux diagnostics dans le tiroir, aucun chevauchement légende/zoom/commandes.
- Mobile 390×844 (contrôlé par M29) : 0 chevauchement, 0 débordement horizontal, cibles ≥48 px.
- Drapeau « cover » sur le pays survolé : intact après les retouches UI/UX (capture France).
