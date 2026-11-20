import { register } from './registry.js';

/* Lentille V2 E092 — performance de rendu du champ d'étoiles de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   La passe 1 confinait le champ et les couches, promouvait le SVG, mettait
   en cache la géométrie, déléguait les écouteurs, groupait les positions,
   allégeait les ombres, mettait le champ en veille, reliait le mouvement
   réduit, bornait le budget des traits et scellait un audit. La V2 attaque
   d'autres leviers : nœuds, texte, pointage, largeur, calque vide.
   Préfixe exclusif : v2e092 (aucune collision avec e092- de la passe 1). */
register('E092', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : chaque règle est conditionnée à un marqueur
     posé par un chantier, donc désactivable isolément sur un DOM incomplet.
     Aucune couleur n'est le seul vecteur d'information. */
  css('constellation-v2-e092', `
.v2e092-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e092-statut{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-clip="on"]{overflow:clip}
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-node-contain="on"] .const-sun,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-node-contain="on"] .const-planet,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-node-contain="on"] .const-moon{contain:layout style}
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-text="on"] .const-sun::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-text="on"] .const-planet::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-text="on"] .const-moon::after{text-rendering:optimizeSpeed;font-synthesis:none}
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-hit="on"] .const-sun::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-hit="on"] .const-planet::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-hit="on"] .const-moon::after{pointer-events:none}
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-dense="on"] .const-sun::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-dense="on"] .const-planet::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-dense="on"] .const-moon::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-etroit="on"] .const-sun::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-etroit="on"] .const-planet::after,
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-etroit="on"] .const-moon::after{display:none}
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-vectors="on"] .constellation-edges line:not(.is-path){vector-effect:none}
.constellation-layout[data-v2e092-on] .constellation-field[data-v2e092-vide="on"] .constellation-edges{display:none}
`);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function') return;
  const edges = layout.querySelector('.constellation-edges');
  const noeuds = Array.from(field.querySelectorAll('.const-sun, .const-planet, .const-moon'));
  const total = noeuds.length;
  const dense = total > 16;

  /* Écriture paresseuse : un marqueur n'est écrit que si sa valeur diffère.
     Cela évite les invalidations de style répétées quand la lentille est
     réappliquée sur un champ inchangé. Le compteur est auditable en fin de passe. */
  const ecritures = { valeur: 0 };
  const marquer = (node, nom, valeur) => {
    if (!node || typeof node.getAttribute !== 'function'
        || typeof node.setAttribute !== 'function') return 0;
    if (node.getAttribute(nom) === valeur) return 0;
    try {
      node.setAttribute(nom, valeur);
      ecritures.valeur += 1;
      return 1;
    } catch { return 0; }
  };
  const demarquer = (node, nom) => {
    if (node && typeof node.hasAttribute === 'function' && node.hasAttribute(nom)
        && typeof node.removeAttribute === 'function') {
      try { node.removeAttribute(nom); } catch { /* repli tolérant */ }
    }
  };

  marquer(layout, 'data-v2e092-on', 'on');

  /* E092-01 — Confinement de style et de layout au niveau de chaque nœud :
     la passe 1 isolait le champ et les couches ; ici, contain: layout style
     est posé sur les boutons eux-mêmes, afin qu'un changement de classe
     is-active sur une lune n'invalide pas le style des autres étoiles. */
  marquer(field, 'data-v2e092-node-contain', noeuds.length ? 'on' : 'off');

  /* E092-02 — Défilement supprimé : overflow: clip remplace le conteneur de
     défilement implicite du champ. Le clip ne crée pas de contexte de scroll
     et réduit le coût du test de pointage, sans toucher au contenu ni au focus. */
  marquer(field, 'data-v2e092-clip', 'on');

  /* E092-03 — Façonnage de texte allégé : text-rendering: optimizeSpeed et
     font-synthesis: none sont appliqués aux seules étiquettes ::after, qui
     sont nombreuses sur un champ dense. Aucun libellé n'est modifié. */
  marquer(field, 'data-v2e092-text', noeuds.length ? 'on' : 'off');

  /* E092-04 — Étiquettes décoratives retirées du test de pointage : les ::after
     débordent largement du petit bouton (160 px pour un soleil de 42 px) et
     captaient le survol hors de la cible réelle. pointer-events: none les rend
     transparentes au pointeur sans les masquer. */
  marquer(field, 'data-v2e092-hit', 'on');

  /* E092-05 — Régime dense : au-delà de seize nœuds, les libellés ::after sont
     masqués pour réduire le coût de peinture du texte. L'information n'est pas perdue :
     elle reste dans title et aria-label de chaque bouton, et les commandes
     restent toutes cliquables. La passe 1 masquait les traits SVG, pas le texte. */
  if (dense) marquer(field, 'data-v2e092-dense', String(total));
  else demarquer(field, 'data-v2e092-dense');

  /* E092-06 — Traits décoratifs allégés en régime dense : vector-effect: none
     sur les lignes sans classe is-path évite de recalculer une largeur de trait
     non mise à l'échelle pour chaque arête décorative. Mécanisme distinct du
     shape-rendering: optimizeSpeed de la passe 1, appliqué à tout le SVG. */
  if (dense) marquer(field, 'data-v2e092-vectors', String(total));
  else demarquer(field, 'data-v2e092-vectors');

  /* E092-07 — Écriture conditionnelle des marqueurs de nœud : une seule
     traversée pose le rang ordinal de chaque étoile et consigne le nombre
     réel d'écritures. Les marqueurs déjà à jour ne sont pas réécrits, ce qui
     rend la lentille idempotente sur un champ stable. */
  noeuds.forEach((node, index) => {
    marquer(node, 'data-v2e092-ordre', String(index + 1));
  });
  marquer(field, 'data-v2e092-attrwrites', String(ecritures.valeur));

  /* E092-08 — Calque SVG vide retiré de la peinture : si aucune arête n'est
     présente, un SVG inséré mais vide consomme tout de même une couche de
     composition. Il est masqué par data-v2e092-vide ; le compteur d'arêtes est
     consigné pour l'audit. Aucun nœud n'est supprimé du DOM. */
  let lignes = 0;
  try {
    if (edges && typeof edges.querySelectorAll === 'function') {
      lignes = edges.querySelectorAll('line').length;
    }
  } catch { lignes = 0; }
  if (lignes === 0) marquer(field, 'data-v2e092-vide', 'on');
  else demarquer(field, 'data-v2e092-vide');
  marquer(field, 'data-v2e092-lignes', String(lignes));

  /* État de régime partagé entre le ResizeObserver (chantier 09) et la ligne
     de statut (chantier 10). Déclaré avant les deux pour être toujours disponible. */
  let dernierRegime = '';
  let statut = null;
  let annonce = null;
  const direRegime = () => {
    const etroit = field && typeof field.hasAttribute === 'function'
      && field.hasAttribute('data-v2e092-etroit');
    const regime = etroit ? 'étroit' : dense ? 'dense' : 'normal';
    if (regime === dernierRegime) return;
    dernierRegime = regime;
    const phrase = `Rendu local optimisé : ${total} nœud${total > 1 ? 's' : ''}, `
      + `${lignes} arête${lignes > 1 ? 's' : ''}, régime ${regime}.`;
    if (statut && statut.textContent !== phrase) statut.textContent = phrase;
    if (annonce && annonce.textContent !== phrase) annonce.textContent = phrase;
    marquer(layout, 'data-v2e092-regime', regime);
  };

  /* E092-09 — Régime étroit piloté par un ResizeObserver unique : contrairement
     à l'IntersectionObserver de la passe 1 (visibilité), celui-ci réagit à la
     largeur réelle fournie par l'entrée, sans lecture de layout forcée. En
     dessous de 520 px, les libellés sont masqués par la même règle que le
     régime dense. Un WeakSet garantit un seul observateur par champ. */
  const CHAMPS_MESURES = (typeof window !== 'undefined' && window.__v2e092_champsMesures)
    || (typeof window !== 'undefined' ? (window.__v2e092_champsMesures = new WeakSet()) : null);
  if (typeof ResizeObserver !== 'undefined' && CHAMPS_MESURES
      && !CHAMPS_MESURES.has(field)) {
    CHAMPS_MESURES.add(field);
    try {
      const observateur = new ResizeObserver(entrees => {
        for (const entree of entrees) {
          const rect = entree && entree.contentRect;
          const largeur = rect && rect.width;
          if (!Number.isFinite(largeur)) continue;
          if (largeur > 0 && largeur < 520) {
            marquer(field, 'data-v2e092-etroit', String(Math.round(largeur)));
          } else {
            demarquer(field, 'data-v2e092-etroit');
          }
          direRegime();
        }
      });
      observateur.observe(field);
      marquer(field, 'data-v2e092-ro', 'on');
    } catch { /* observation facultative : le champ reste lisible sans elle */ }
  }

  /* E092-10 — Ligne de statut réelle et annonce de changement de régime : une
     phrase en texte visible dans la légende, et une région live masquée qui
     ne parle que lorsqu'un régime change. La passe 1 entretenait un panneau
     d'audit masqué avec un compteur par chantier ; ici, l'information est
     indexable, lisible sans outil de développement et non redondante. */
  statut = layout.querySelector('#v2e092-statut');
  if (!statut) {
    statut = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e092-statut', '')
      : document.createElement('p');
    statut.id = 'v2e092-statut';
    const caption = layout.querySelector('.constellation-caption');
    if (caption && caption.appendChild) caption.appendChild(statut);
    else layout.appendChild(statut);
  }

  annonce = layout.querySelector('#v2e092-regime-live');
  if (!annonce) {
    annonce = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e092-sr', '')
      : document.createElement('p');
    annonce.id = 'v2e092-regime-live';
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');
    annonce.setAttribute('aria-atomic', 'true');
    layout.appendChild(annonce);
  }

  direRegime();
  marquer(layout, 'data-v2e092-checks',
    `noeuds:${total} arretes:${lignes} ecritures:${ecritures.valeur} `
    + `dense:${dense ? 1 : 0} vide:${lignes === 0 ? 1 : 0}`);
});
