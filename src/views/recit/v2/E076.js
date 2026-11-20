import { register } from './registry.js';

/* V2 lentille E076 — Mobile et reflow responsive (second regard).
 *
 * La passe 1 d'E076 traitait déjà le champ à 16 px, le text-size-adjust, le
 * touch-action, l'overscroll, le scroll-padding, le badge de largeur, le
 * retour en haut, la mosaïque du fil, la jauge interne et le clavier virtuel.
 * Cette passe V2 ne reprend AUCUN de ces chantiers : elle porte sur la
 * STABILITÉ DIMENSIONNELLE et l'ADAPTATION AU CONTEXTE D'AFFICHAGE — zones de
 * sécurité, cibles tactiles, hauteur dynamique, orientation, paysage court,
 * barre d'outils, image, largeur de colonne mesurée, césure et mouvement réduit.
 *
 * Une seule feuille `css('recit-v2-e076', …)`, une seule classe racine
 * `recit-v2-e076-root` posée sur `layout`, deux ids d'élément préfixés
 * `v2-e076-orientation` et `v2-e076-colonne` (jamais les ids `e076-…` de la
 * passe 1, qui tourne sur le même DOM). Toutes les classes sont préfixées
 * `recit-v2-e076-`. Aucun attribut existant n'est écrasé ; les deux écouteurs
 * sont installés une seule fois par session ; zéro réseau, zéro console, zéro
 * aléa, aucun fichier partagé modifié. Sans ce module la vue reste lisible.
 *
 * Les dix chantiers E076-01 … E076-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E076.md.
 */

const CSS_ID = 'recit-v2-e076';
const RACINE = 'recit-v2-e076-root';
const ORIENTATION_ID = 'v2-e076-orientation';
const COLONNE_ID = 'v2-e076-colonne';
const MOTION = 'data-v2-e076-motion';
const CLASSE_LECTURE = 'recit-v2-e076-readout';

/* Feuille unique. Les réglages purement additifs (zones de sécurité) passent
   par :where() pour rester de spécificité nulle ; les ajustements de reflow
   sont volontairement scopés sous la classe racine afin de s'appliquer
   réellement. Aucun `!important`, aucune information portée par la seule
   couleur. */
const CSS = `
/* E076-01 — Zones de sécurité (encoche, barre gestuelle) : marges intérieures
   additives sur la racine, repli 0 px si env() est inconnu. */
:where(.recit-v2-e076-root){
  padding-left:env(safe-area-inset-left, 0px);
  padding-right:env(safe-area-inset-right, 0px);
  padding-bottom:env(safe-area-inset-bottom, 0px);
}

/* E076-02 — Cibles tactiles ≥ 44 px et focus renforcé sur pointeur grossier
   (la passe 1 ne réglait que le touch-action, jamais la taille). */
@media (pointer:coarse){
  .recit-v2-e076-root .c3a-filter,
  .recit-v2-e076-root .recit-trace summary,
  .recit-v2-e076-root .recit-thread-item{min-height:44px}
  .recit-v2-e076-root .c3a-filter:focus-visible,
  .recit-v2-e076-root .recit-trace summary:focus-visible,
  .recit-v2-e076-root .recit-thread-item:focus-visible{
    outline:3px solid var(--gold-bright,#e6b96f);outline-offset:2px;
  }
}

/* E076-03 — Hauteur de lecture dynamique : unité dvh puis repli vh. */
@supports (height:100dvh){
  .recit-v2-e076-root .recit-body{max-height:100dvh}
}
@supports not (height:100dvh){
  .recit-v2-e076-root .recit-body{max-height:100vh}
}

/* E076-04 — Repère d'orientation : texte d'interface visible et discret. */
.recit-v2-e076-root .recit-v2-e076-orientation{
  margin:2px 0 0;color:var(--muted-2,#8a8a8a);
  font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}

/* E076-05 — Paysage court : rythme vertical et bande image compressés. */
@media (orientation:landscape) and (max-height:520px){
  .recit-v2-e076-root .recit-body > *{margin-top:6px;margin-bottom:6px}
  .recit-v2-e076-root .recit-media{min-height:0;max-height:14vh}
}

/* E076-06 — Barre d'outils empilée sous 480 px, sans débordement. */
@media (max-width:480px){
  .recit-v2-e076-root .c3a-tools{flex-direction:column;align-items:stretch}
  .recit-v2-e076-root .c3a-tools .c3a-search,
  .recit-v2-e076-root .c3a-tools .c3a-group{min-width:0;width:100%}
}

/* E076-07 — Média : image en bloc, largeur bornée, aucun débordement. */
.recit-v2-e076-root .recit-media img{max-width:100%;display:block}

/* E076-08 — Indicateur de largeur de colonne : chiffre issu du DOM réel. */
.recit-v2-e076-root .recit-v2-e076-colonne{
  margin:2px 0 0;color:var(--muted-2,#8a8a8a);
  font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}

/* E076-09 — Textes secondaires : césure et retour à la ligne sous 480 px. */
@media (max-width:480px){
  .recit-v2-e076-root .recit-legend,
  .recit-v2-e076-root .recit-sources,
  .recit-v2-e076-root .recit-trace p,
  .recit-v2-e076-root .recit-meta{overflow-wrap:anywhere;hyphens:auto}
}

/* E076-10 — Mouvement réduit des seules lectures chiffrées introduites ici. */
.recit-v2-e076-root .recit-v2-e076-readout{transition:opacity .2s linear}
.recit-v2-e076-root[data-v2-e076-motion="reduce"] .recit-v2-e076-readout{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e076-root .recit-v2-e076-readout{transition:none}
}
`;

/* Les deux écouteurs sont installés une seule fois par session ; les
   fonctions ciblent les nœuds courants, reconstruits à chaque rendu. */
let ecouteOrientationInstallee = false;
let ecouteResizeInstallee = false;

/* Vrai nœud d'élément (nodeType 1) : écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Sélecteur sûr : jamais appelé sur un hôte dépourvu de querySelector. */
function q(root, selector) {
  return present(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

/* Liste sûre, ramenée à un tableau pour .length et .forEach. */
function qa(root, selector) {
  return present(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector))
    : [];
}

/* Ajout de classe sous garde : n'écrase rien, reste idempotent. */
function ajouteClasse(node, name) {
  if (!present(node) || !node.classList
      || typeof node.classList.add !== 'function'
      || typeof node.classList.contains !== 'function') return;
  if (!node.classList.contains(name)) node.classList.add(name);
}

/* Abonnement homologue aux anciens navigateurs (addListener). */
function surMedia(mediaQuery, ecoute) {
  if (!mediaQuery) return;
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', ecoute);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(ecoute);
  }
}

/* E076-04 — libellé dérivé de la media query réelle d'orientation, jamais
   d'une valeur supposée ; repli explicite si matchMedia est indisponible. */
function libelleOrientation() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'Orientation : non déterminée';
  }
  try {
    return window.matchMedia('(orientation: portrait)').matches
      ? 'Orientation : portrait'
      : 'Orientation : paysage';
  } catch {
    return 'Orientation : non déterminée';
  }
}

function metAJourOrientation() {
  if (typeof document === 'undefined') return;
  const texte = libelleOrientation();
  qa(document, `#${ORIENTATION_ID}`).forEach((noeud) => { noeud.textContent = texte; });
}

function installeOrientation() {
  if (ecouteOrientationInstallee || typeof window === 'undefined'
      || typeof window.matchMedia !== 'function') return;
  ecouteOrientationInstallee = true;
  try {
    surMedia(window.matchMedia('(orientation: portrait)'), metAJourOrientation);
  } catch {
    /* Le libellé est recalculé à chaque rendu : repli sans erreur. */
  }
}

/* E076-08 — largeur réelle du corps de lecture, arrondie depuis le DOM. */
function largeurColonne(root) {
  const corps = q(root, '.recit-body');
  if (!present(corps) || typeof corps.getBoundingClientRect !== 'function') return 0;
  try { return Math.round(corps.getBoundingClientRect().width); } catch { return 0; }
}

function metAJourColonne(root) {
  const hote = present(root) ? root : (typeof document !== 'undefined' ? document : null);
  if (!hote) return;
  const px = largeurColonne(hote);
  if (!px) return; /* largeur nulle : élément non rendu, aucun chiffre inventé. */
  const texte = `Colonne de lecture : ${px} px · largeur mesurée à l'écran courant.`;
  qa(hote, `#${COLONNE_ID}`).forEach((noeud) => { noeud.textContent = texte; });
}

function installeResize() {
  if (ecouteResizeInstallee || typeof window === 'undefined'
      || typeof window.addEventListener !== 'function') return;
  ecouteResizeInstallee = true;
  try {
    window.addEventListener('resize',
      () => metAJourColonne(typeof document !== 'undefined' ? document : null),
      { passive: true });
  } catch {
    /* Repli : la largeur reste recalculée à chaque rendu. */
  }
}

function creeParagraphe(el, classe, texte) {
  if (typeof el === 'function') {
    const noeud = el('p', classe, texte);
    return present(noeud) ? noeud : null;
  }
  if (typeof document === 'undefined') return null;
  const noeud = document.createElement('p');
  noeud.className = classe;
  noeud.textContent = texte;
  return noeud;
}

/* Dépose (ou réutilise) un paragraphe visible juste après l'ancre fournie. */
function placeParagraphe(id, classe, parent, ancre, texte, el) {
  if (!present(parent) || typeof parent.insertBefore !== 'function') return null;
  let noeud = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!present(noeud)) {
    noeud = creeParagraphe(el, `${CLASSE_LECTURE} ${classe}`, texte);
    if (!present(noeud)) return null;
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E076', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, css, el, reducedMotion } = ctx;
    if (!present(layout) || typeof layout.querySelector !== 'function') return;

    /* Une seule feuille pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    ajouteClasse(layout, RACINE);

    const corps = q(layout, '.recit-body');
    const kicker = q(layout, '.view-kicker');
    const timing = q(layout, '.recit-timing');
    const parent = corps || layout;

    /* E076-04 — repère d'orientation après le kicker d'étape. */
    placeParagraphe(ORIENTATION_ID, 'recit-v2-e076-orientation',
      parent, kicker, libelleOrientation(), el);
    installeOrientation();
    metAJourOrientation();

    /* E076-08 — largeur de colonne mesurée, après le temps de lecture. */
    placeParagraphe(COLONNE_ID, 'recit-v2-e076-colonne', parent, timing, '', el);
    metAJourColonne(layout);
    installeResize();

    /* E076-10 — mouvement réduit, lu une seule fois par rendu, sur un attribut
       propre à la V2 (distinct de ceux de la passe 1). */
    try {
      const reduit = typeof reducedMotion === 'function' && reducedMotion();
      layout.setAttribute(MOTION, reduit ? 'reduce' : 'normal');
    } catch { /* attribut facultatif */ }

    /* E076-01, 02, 03, 05, 06, 07, 09 sont portés par la feuille unique et par
       la classe racine posée plus haut. */
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
