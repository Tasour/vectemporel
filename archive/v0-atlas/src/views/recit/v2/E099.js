import { register } from './registry.js';

/* V2 lentille E099 — Transitions et mouvement (complément de la passe 1).
 *
 * Thème repris de la passe 1 : les transitions d'état et le mouvement dans la
 * vue Récit. La passe 1 traitait déjà le fondu des puces de filtre, le halo du
 * champ de recherche, la révélation du crédit média, le chevron de traçabilité,
 * le glissement précédent/suivant, l'interpolation de la barre de progression,
 * le fondu des messages vides, le trait du point courant, le soulèvement de la
 * pastille de certitude et le gouverneur de mouvement. La V2 propose donc DIX
 * chantiers neufs et distincts, portant sur des cibles jamais animées par la
 * passe 1 : statut de filtrage, icône de lecture, commandes secondaires, badge
 * de type du fil, défilement du panneau, contenu de traçabilité, paragraphes de
 * légende, libellés de groupe, message « aucune image » et gouverneur V2.
 *
 * Greffon strictement additif et non destructif : aucune règle retirée, aucun
 * texte existant réécrit, aucun nœud d'origine supprimé, aucun écouteur posé
 * sur un nœud existant. Une seule feuille de style, injectée par un appel
 * unique à `css` (identifiant `recit-v2-e099`). Toutes les classes créées sont
 * préfixées `recit-v2-e099-`, tous les ids DOM créés sont préfixés `v2-e099-`
 * (jamais `e099-`, réservé à la passe 1 qui tourne sur le MÊME DOM). Zéro
 * réseau, zéro console, zéro aléa, aucun fichier partagé modifié. Sans
 * JavaScript, la vue Récit reste intégralement lisible et utilisable.
 *
 * Rapport : UNIFIED_AUDIT/RECIT/V2/views/E099.md.
 */

const CSS = `
.recit-v2-e099-root{--v2-e099-duree:300ms;--v2-e099-courbe:cubic-bezier(.22,.61,.36,1)}

/* E099-01 — Fondu du statut de filtrage (région role=status déjà présente). */
@keyframes recit-v2-e099-fondu{from{opacity:0}to{opacity:1}}
.recit-layout .recit-v2-e099-status{animation:recit-v2-e099-fondu var(--v2-e099-duree) ease-out both}

/* E099-02 — Respiration de l'icône de lecture pendant la lecture active. */
@keyframes recit-v2-e099-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:.82}}
.recit-v2-e099-play{position:relative}
.recit-v2-e099-play-icon{display:inline-block;transform-origin:center;transition:transform var(--v2-e099-duree) var(--v2-e099-courbe)}
.recit-v2-e099-play::after{content:'';position:absolute;inset:-3px;border:1px solid var(--gold);border-radius:inherit;opacity:0;pointer-events:none;transition:opacity var(--v2-e099-duree) var(--v2-e099-courbe)}
.recit-play[aria-pressed="true"].recit-v2-e099-play::after{opacity:.4}
.recit-play[aria-pressed="true"] .recit-v2-e099-play-icon{animation:recit-v2-e099-pulse 1600ms ease-in-out infinite}

/* E099-03 — Soulèvement des commandes secondaires (hors précédent/suivant). */
.recit-v2-e099-action2{transition:transform var(--v2-e099-duree) var(--v2-e099-courbe),box-shadow var(--v2-e099-duree) var(--v2-e099-courbe)}
.recit-actions .recit-v2-e099-action2:hover:not(:disabled),
.recit-actions .recit-v2-e099-action2:focus-visible:not(:disabled){transform:translateY(-2px);box-shadow:0 3px 10px rgba(230,185,111,.16)}

/* E099-04 — Badge de type du fil mis en avant au survol / focus du point. */
.recit-v2-e099-kindtag{display:inline-block;transition:transform 260ms var(--v2-e099-courbe),color 260ms var(--v2-e099-courbe)}
.recit-thread-item:hover .recit-v2-e099-kindtag,
.recit-thread-item:focus-visible .recit-v2-e099-kindtag{transform:scale(1.1);color:var(--gold-bright)}

/* E099-05 — Défilement doux du panneau de lecture. */
.recit-layout .recit-v2-e099-scroll{scroll-behavior:smooth}

/* E099-06 — Révélation du contenu de traçabilité à l'ouverture du <details>. */
@keyframes recit-v2-e099-glisse{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.recit-trace[open] .recit-v2-e099-trace-content{animation:recit-v2-e099-glisse 320ms var(--v2-e099-courbe) both}

/* E099-07 — Cascade des paragraphes de légende + compteur dérivé du DOM. */
.recit-v2-e099-legende p:not(.recit-v2-e099-legende-count):not(.recit-v2-e099-note){animation:recit-v2-e099-fondu var(--v2-e099-duree) ease-out both}
.recit-v2-e099-legende p:nth-child(2):not(.recit-v2-e099-legende-count):not(.recit-v2-e099-note){animation-delay:60ms}
.recit-v2-e099-legende p:nth-child(3):not(.recit-v2-e099-legende-count):not(.recit-v2-e099-note){animation-delay:120ms}
.recit-v2-e099-legende p:nth-child(4):not(.recit-v2-e099-legende-count):not(.recit-v2-e099-note){animation-delay:180ms}
.recit-v2-e099-readout{margin:4px 0 0;color:var(--muted-2);font-size:8px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E099-08 — Transition des libellés de groupe de filtres. */
.recit-v2-e099-grouplabel{transition:letter-spacing 260ms var(--v2-e099-courbe),color 260ms var(--v2-e099-courbe)}
.c3a-group:hover .recit-v2-e099-grouplabel,
.c3a-group:focus-within .recit-v2-e099-grouplabel{letter-spacing:.06em;color:var(--gold-bright)}

/* E099-09 — Fondu du message « aucune image vérifiée » (panneau média). */
@keyframes recit-v2-e099-fondu-lent{from{opacity:0}to{opacity:1}}
.recit-v2-e099-media-empty{animation:recit-v2-e099-fondu-lent 420ms ease-out both}

/* E099-10 — Gouverneur de mouvement réduit, limité aux seules cibles V2. */
.recit-v2-e099-note{margin:6px 0 0;color:var(--muted-2);font-size:8px;line-height:1.5;font-style:italic}
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-status,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-play::after,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-play-icon,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-action2,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-kindtag,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-trace-content,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-legende p,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-grouplabel,
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-media-empty{animation:none!important;transition:none!important}
.recit-layout[data-v2-e099-motion="reduce"] .recit-v2-e099-scroll{scroll-behavior:auto!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e099-status,.recit-v2-e099-play::after,.recit-v2-e099-play-icon,
  .recit-v2-e099-action2,.recit-v2-e099-kindtag,.recit-v2-e099-trace-content,
  .recit-v2-e099-legende p,.recit-v2-e099-grouplabel,.recit-v2-e099-media-empty{animation:none!important;transition:none!important}
  .recit-v2-e099-scroll{scroll-behavior:auto!important}
}
`;

register('E099', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;

  /* Ajoute une classe sans jamais écraser les autres classes du nœud. */
  function ajouteClasse(noeud, nom) {
    if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
  }

  /* Marqueur de cible animée : sert au comptage dérivé du DOM du chantier 10. */
  function marque(noeud) {
    if (noeud && noeud.setAttribute && !noeud.hasAttribute('data-v2-e099-cible')) {
      noeud.setAttribute('data-v2-e099-cible', '1');
    }
  }

  /* Dépose (ou réutilise) un paragraphe visible, à un emplacement stable. */
  function placeParagraphe(id, classes, parent, texte) {
    if (!parent || typeof parent.appendChild !== 'function') return null;
    let noeud = document.getElementById(id);
    if (!noeud) {
      noeud = el('p', `recit-v2-e099-readout ${classes}`);
      noeud.id = id;
    }
    noeud.textContent = texte;
    parent.appendChild(noeud); /* déplace le nœud réutilisé en fin de parent */
    return noeud;
  }

  /* Un chantier défaillant ne doit jamais interrompre le rendu. */
  function sansEchec(fn) {
    try { fn(); } catch { /* neutralisé : la vue reste lisible */ }
  }

  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;

    css('recit-v2-e099', CSS); /* un seul appel, toutes les règles du module. */
    ajouteClasse(layout, 'recit-v2-e099-root');

    /* E099-01 — Fondu du statut de filtrage : la région #c3a-status est déjà
       role=status/aria-live=polite ; seule une animation d'opacité est ajoutée,
       le texte reste dans le DOM dès le premier frame et reste annonçable. */
    sansEchec(() => {
      const statut = layout.querySelector('#c3a-status, .c3a-status');
      if (statut) { ajouteClasse(statut, 'recit-v2-e099-status'); marque(statut); }
    });

    /* E099-02 — Respiration de l'icône de lecture : on lit aria-pressed déjà
       porté par le bouton ; aucun état partagé n'est modifié, aucun écouteur
       n'est ajouté. L'anneau et la pulsation ne vivent que pendant la lecture. */
    sansEchec(() => {
      const play = layout.querySelector('.recit-play, [data-fk="c3a-play"]');
      if (!play) return;
      ajouteClasse(play, 'recit-v2-e099-play');
      marque(play);
      const icon = play.querySelector('span[aria-hidden="true"]') || play.querySelector('span');
      if (icon) { ajouteClasse(icon, 'recit-v2-e099-play-icon'); marque(icon); }
    });

    /* E099-03 — Soulèvement des commandes secondaires : repérage par data-fk
       (robuste aux traductions), sans toucher aux boutons précédent/suivant
       déjà animés par la passe 1. */
    sansEchec(() => {
      const commandes = layout.querySelectorAll(
        '.recit-actions [data-fk="c3a-restart"], ' +
        '.recit-actions [data-fk="c3a-next-event"], ' +
        '.recit-actions [data-fk="c3a-chrono"]'
      );
      commandes.forEach((commande) => {
        ajouteClasse(commande, 'recit-v2-e099-action2');
        marque(commande);
      });
    });

    /* E099-04 — Badge de type du fil : cible .thread-kind, jamais concernée
       par le trait du point courant de la passe 1. */
    sansEchec(() => {
      const badges = layout.querySelectorAll('.recit-thread-item .thread-kind');
      badges.forEach((badge) => {
        ajouteClasse(badge, 'recit-v2-e099-kindtag');
        marque(badge);
      });
    });

    /* E099-05 — Défilement doux du panneau : propriété CSS pure, ciblée sur
       .recit-body (déjà overflow-y:auto) ; aucun script de défilement. */
    sansEchec(() => {
      const corps = layout.querySelector('.recit-body');
      if (corps) { ajouteClasse(corps, 'recit-v2-e099-scroll'); marque(corps); }
    });

    /* E099-06 — Révélation du contenu de traçabilité : l'animation est portée
       par [open] ; aucun écouteur n'est posé sur le <details> et le texte des
       identifiants de source reste strictement inchangé. */
    sansEchec(() => {
      const contenus = layout.querySelectorAll('.recit-trace p');
      contenus.forEach((contenu) => {
        ajouteClasse(contenu, 'recit-v2-e099-trace-content');
        marque(contenu);
      });
    });

    /* E099-07 — Cascade des paragraphes de légende : le compteur est lu sur
       les <p> réellement présents avant insertion du paragraphe de synthèse,
       donc aucun chiffre n'est inventé. */
    sansEchec(() => {
      const legende = layout.querySelector('.recit-legend');
      if (!legende) return;
      ajouteClasse(legende, 'recit-v2-e099-legende');
      marque(legende);
      const entrees = legende.querySelectorAll('p').length;
      if (entrees > 0) {
        placeParagraphe(
          'v2-e099-legend-count', 'recit-v2-e099-legende-count', legende,
          `Légende : ${entrees} entrée${entrees > 1 ? 's' : ''} en cascade.`
        );
      }
    });

    /* E099-08 — Transition des libellés de groupe de filtres : ciblage sur
       .c3a-group-label, distinct des puces .c3a-filter de la passe 1. */
    sansEchec(() => {
      const libelles = layout.querySelectorAll('.c3a-group-label');
      libelles.forEach((libelle) => {
        ajouteClasse(libelle, 'recit-v2-e099-grouplabel');
        marque(libelle);
      });
    });

    /* E099-09 — Fondu du message « aucune image vérifiée » : état média absent
       (.media-empty), distinct des messages .recit-sources / .c3a-empty déjà
       animés par la passe 1. */
    sansEchec(() => {
      const vide = layout.querySelector('.media-empty');
      if (vide) { ajouteClasse(vide, 'recit-v2-e099-media-empty'); marque(vide); }
    });

    /* E099-10 — Gouverneur V2 : reducedMotion() est lu une seule fois par
       rendu ; l'attribut data-v2-e099-motion est propre à la V2 (la passe 1
       utilise data-e099-motion). La note, réutilisée par id, compte les cibles
       réellement marquées dans le DOM et reste aria-hidden pour ne pas doubler
       la région d'annonce #atlas-recit-live. */
    sansEchec(() => {
      let reduit = false;
      try { reduit = typeof reducedMotion === 'function' ? !!reducedMotion() : false; }
      catch { reduit = false; }
      layout.setAttribute('data-v2-e099-motion', reduit ? 'reduce' : 'normal');
      if (!reduit) return;
      const cibles = layout.querySelectorAll('[data-v2-e099-cible]').length;
      const pluriel = cibles > 1 ? 's' : '';
      const note = placeParagraphe(
        'v2-e099-motion-note', 'recit-v2-e099-note',
        layout.querySelector('.recit-legend') || layout.querySelector('.recit-body') || layout,
        `Mouvement réduit : ${cibles} effet${pluriel} animé${pluriel} désactivé${pluriel} ; l’information reste intégralement lisible.`
      );
      if (note) note.setAttribute('aria-hidden', 'true');
    });
  } catch { /* neutralisé : la vue reste lisible */ }
});
