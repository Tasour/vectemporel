import { register } from './registry.js';

/* Lentille E098 — Performance et sobriété de la vue Récit.
 *
 * Angle distinct de la lentille E008 (qui mesure et confine les indicateurs) :
 * E098 vise la STABILITÉ DU RENDU et le COÛT DE PEINTURE. Dix chantiers
 * E098-01 … E098-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/views/E098.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js,
 * src/views/_diagnostics.js.
 *
 * Greffon strictement non destructif : aucun nœud créé, aucun nœud retiré,
 * aucun texte modifié, aucun écouteur, timer, observateur, rAF, aléa, réseau
 * ni journal. Toutes les modifications passent par : une feuille de style
 * unique, des classes préfixées recit-e098-, et deux attributs de données
 * préfixés e098- posés sur le conteneur. La coque reconstruisant #app à
 * chaque rendu, la garde `data-e098-passe` est portée par le nœud lui-même :
 * une passe au plus par rendu, sans effet accumulé.
 *
 * Sobriété des identifiants : E098 ne crée aucun nœud DOM, donc aucun id
 * n'est introduit — aucune collision possible avec les 99 autres lentilles.
 * Le seul id ajouté au document est celui de la feuille `recit-e098`, unique.
 */

const MARQUE = 'data-e098-passe';
const SEUIL_FIL_LONG = 30;

/* Une seule feuille, une seule règle par besoin. Aucun sélecteur universel,
   aucun `will-change` positif, aucune couche GPU imposée : au contraire,
   E098-08 neutralise les promotions inutiles. Aucune information n'est
   portée par la seule couleur. */
const CSS = `
/* E098-01 — passe unique : la garde est en JS, aucun style dédié. */

/* E098-02 — isolation du coût de mise en page du corps de lecture. */
.recit-layout .recit-body.recit-e098-corps {
  contain: layout style;
}

/* E098-03 — gouttière de défilement réservée : zéro saut horizontal. */
.recit-layout .recit-body.recit-e098-gouttiere {
  scrollbar-gutter: stable;
}

/* E098-04 — coupure de la chaîne de défilement vers le document. */
.recit-layout .recit-body.recit-e098-scroll {
  overscroll-behavior: contain;
}

/* E098-05 — stabilité typographique : pas d'inflation ni de synthèse de police. */
.recit-layout .recit-body.recit-e098-type {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  font-synthesis: none;
}

/* E098-06 — fil long : peinture différée des items lointains, sans retrait. */
.recit-layout .recit-thread-list.recit-e098-fil-long .recit-thread-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 30px;
}

/* E098-07 — sobriété d'animation : état explicite + préférence système. */
.recit-layout[data-e098-motion="reduce"] .recit-media img,
.recit-layout[data-e098-motion="reduce"] .recit-progress > span,
.recit-layout[data-e098-motion="reduce"] .recit-thread-item,
.recit-layout[data-e098-motion="reduce"] .recit-actions button {
  transition: none !important;
  animation: none !important;
}
@media (prefers-reduced-motion: reduce) {
  .recit-layout .recit-media img,
  .recit-layout .recit-progress > span,
  .recit-layout .recit-thread-item,
  .recit-layout .recit-actions button {
    transition: none !important;
    animation: none !important;
  }
  .recit-layout .recit-body { scroll-behavior: auto !important; }
}

/* E098-08 — anti-promotion de couche GPU et calques sans filtre coûteux. */
.recit-layout .recit-media,
.recit-layout .recit-progress > span,
.recit-layout .recit-thread-item {
  will-change: auto;
}
.recit-layout .recit-media-credit,
.recit-layout .media-caption {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* E098-09 — miroir de budget : attribut en JS, aucun style dédié. */
/* E098-10 — sobriété structurelle : aucune règle supplémentaire. */
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && typeof noeud.classList.contains === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* E098-06 — au-delà du seuil, la liste porte la classe qui diffère la
   peinture des items ; aucun item n'est retiré, aucun index décalé. */
function filLong(root) {
  const liste = q(root, '.recit-thread-list');
  const items = qa(root, '.recit-thread-item').length;
  if (items > SEUIL_FIL_LONG && liste && liste.classList
      && typeof liste.classList.add === 'function'
      && typeof liste.classList.contains === 'function'
      && !liste.classList.contains('recit-e098-fil-long')) {
    liste.classList.add('recit-e098-fil-long');
    return 1;
  }
  return 0;
}

/* E098-07 — préférence de mouvement, interrogée une seule fois par rendu. */
function motion(root, reducedMotion) {
  let reduit = false;
  try { reduit = typeof reducedMotion === 'function' && Boolean(reducedMotion()); }
  catch { reduit = false; }
  if (root && typeof root.setAttribute === 'function') {
    root.setAttribute('data-e098-motion', reduit ? 'reduce' : 'normal');
  }
  return reduit ? 1 : 0;
}

/* E098-09 — budget compact d'entrée, dérivé du DOM réel, sans journal. */
function budget(root) {
  const fil = qa(root, '.recit-thread-item').length;
  const boutons = qa(root, '.recit-actions button').length;
  const image = q(root, '.recit-media img') ? 1 : 0;
  return `fil:${fil} btn:${boutons} img:${image}`;
}

register('E098', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  void el; /* E098 ne crée aucun nœud : aucun id DOM introduit. */
  try {
    if (typeof document === 'undefined') return;
    if (typeof css === 'function') css('recit-e098', CSS); /* une seule feuille. */

    const root = layout || stage;
    if (!root || typeof root.querySelector !== 'function') return;

    /* E098-01 — garde d'idempotence portée par le nœud : une passe par rendu. */
    if (typeof root.hasAttribute === 'function' && root.hasAttribute(MARQUE)) return;
    if (typeof root.setAttribute === 'function') root.setAttribute(MARQUE, '1');

    /* E098-02 … E098-05 — quatre classes indépendantes sur le corps. */
    const corps = q(root, '.recit-body');
    ajouteClasse(corps, 'recit-e098-corps');
    ajouteClasse(corps, 'recit-e098-gouttiere');
    ajouteClasse(corps, 'recit-e098-scroll');
    ajouteClasse(corps, 'recit-e098-type');

    /* E098-06 — fil long : classe conditionnelle, lecture de structure seule. */
    filLong(root);

    /* E098-07 — état de mouvement explicitement observable. */
    motion(root, reducedMotion);

    /* E098-08 — purement CSS (aucune écriture JS supplémentaire). */

    /* E098-09 — une seule écriture de budget, tokens courts, jamais de texte. */
    if (typeof root.setAttribute === 'function') root.setAttribute('data-e098-budget', budget(root));

    /* E098-10 — aucune lecture géométrique, aucun nœud, aucune erreur levée. */
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
