import { register } from './registry.js';

/* V2 lentille E049 — Transitions et mouvement (second regard).
 *
 * La passe 1 anime les points focaux (titre, progression, fil, traçabilité,
 * média, lecture, piste d'étapes, vague du fil) et pose un gouverneur
 * `matchMedia`. La V2 complète sans recouvrir : elle chorégraphie les
 * éléments de SOUTIEN encore immobiles — métadonnées, barre d'outils, statut,
 * commandes, légende — et ajoute des micro-transitions d'état (pastille de
 * certitude, bouton désactivé, filtre actif, message vide, focus clavier).
 *
 * Dix chantiers neufs et distincts (E049-01 … E049-10), tous implémentés ici.
 * Rapport détaillé : UNIFIED_AUDIT/RECIT/V2/views/E049.md.
 *
 * Greffon strictement additif : aucune donnée inventée, aucun texte supprimé,
 * aucun attribut existant réécrit, aucun fichier partagé touché. Le mouvement
 * est décrit en CSS (aucun timer, aucune boucle rAF) ; le JS ne fait que poser
 * des classes, un attribut de gouvernance V2, des délais-inline et — pour la
 * cascade — un paragraphe de synthèse dont le chiffre est dérivé du DOM réel.
 * Préfixes : classes `recit-v2-e049-`, ids DOM `v2-e049-` (jamais les ids
 * `e049-` de la passe 1 qui tourne sur le MÊME DOM). Zéro réseau, zéro
 * console, zéro aléa. Chaque chantier est isolé dans le `try/catch` global et
 * toute absence de nœud est une sortie silencieuse : sans ce module, la vue
 * Récit reste intégralement lisible et utilisable.
 */

const CSS = `
/* E049-01 — entrée échelonnée de .recit-meta et .recit-timing. */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-meta{
  animation:v2-e049-meta-in .38s ease-out both;
}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-timing{
  animation:v2-e049-meta-in .38s ease-out .09s both;
}
@keyframes v2-e049-meta-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* E049-02 — entrée glissante de la barre d'outils et du statut. */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-tools{
  animation:v2-e049-tools-in .42s ease-out .04s both;
}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-status{
  animation:v2-e049-tools-in .42s ease-out .11s both;
}
@keyframes v2-e049-tools-in{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}

/* E049-03 — cascade d'entrée des six commandes, délai croissant par bouton. */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-cmd{
  animation:v2-e049-cmd-in .34s ease-out both;
  animation-delay:var(--v2-e049-cmd-delay,0ms);
}
@keyframes v2-e049-cmd-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}

/* E049-04 — entrée de la légende puis de ses paragraphes. */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-legend{
  animation:v2-e049-meta-in .45s ease-out .14s both;
}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-leg-p{
  animation:v2-e049-meta-in .36s ease-out both;
}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-leg-p:nth-child(1){animation-delay:.17s}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-leg-p:nth-child(2){animation-delay:.23s}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-leg-p:nth-child(3){animation-delay:.29s}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-leg-p:nth-child(4){animation-delay:.35s}

/* E049-05 — micro-lift de la pastille de certitude au survol. */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-conf{
  transition:transform .16s ease,border-color .16s ease,background-color .16s ease;
}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-conf:hover{
  transform:translateY(-1px);
}

/* E049-06 — estompage animé des commandes désactivées (état lu du DOM). */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-cmd-off{
  animation:v2-e049-dim-in .3s ease-out both;
}
@keyframes v2-e049-dim-in{from{opacity:1}to{opacity:.35}}

/* E049-07 — soulignement animé du filtre actif (aria-pressed réel). */
.recit-v2-e049-root .recit-v2-e049-filter{position:relative}
.recit-v2-e049-root .recit-v2-e049-filter::after{
  content:'';position:absolute;left:8px;right:8px;bottom:2px;height:1px;
  background:var(--gold-bright,#f5e9d0);transform:scaleX(0);transform-origin:left center;
}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-filter[aria-pressed="true"]::after{
  animation:v2-e049-underline-in .24s ease-out both;
}
@keyframes v2-e049-underline-in{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* E049-08 — entrée du message « aucun résultat » quand les filtres sont vides. */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-empty{
  animation:v2-e049-empty-in .4s ease-out both;
}
@keyframes v2-e049-empty-in{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}

/* E049-09 — gouverneur V2 : filet de sécurité indépendant du JS. */
@media (prefers-reduced-motion:reduce){
  .recit-v2-e049-root .recit-v2-e049-meta,
  .recit-v2-e049-root .recit-v2-e049-timing,
  .recit-v2-e049-root .recit-v2-e049-tools,
  .recit-v2-e049-root .recit-v2-e049-status,
  .recit-v2-e049-root .recit-v2-e049-cmd,
  .recit-v2-e049-root .recit-v2-e049-legend,
  .recit-v2-e049-root .recit-v2-e049-leg-p,
  .recit-v2-e049-root .recit-v2-e049-conf,
  .recit-v2-e049-root .recit-v2-e049-cmd-off,
  .recit-v2-e049-root .recit-v2-e049-empty,
  .recit-v2-e049-root .recit-v2-e049-item{animation:none!important;transition:none!important}
  .recit-v2-e049-root .recit-v2-e049-filter::after{animation:none!important}
}

/* E049-10 — transition du repère de focus clavier dans le fil. */
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-item{
  transition:box-shadow .16s ease;
}
.recit-v2-e049-root[data-v2-e049-motion="full"] .recit-v2-e049-item:focus-visible{
  box-shadow:0 0 0 3px rgba(245,233,208,.25);
}

/* Paragraphes de synthèse V2 : transition douce, annulée en mouvement réduit. */
.recit-v2-e049-readout{transition:opacity .2s linear}
.recit-v2-e049-root[data-v2-e049-motion="reduce"] .recit-v2-e049-readout{transition:none}
`;

/* Limite de la cascade : borne le coût quelle que soit la taille du DOM. */
const LIMITE_CASCADE = 8;
const PAS_CASCADE = 55;

function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Ajoute une classe sans jamais écraser les classes existantes du nœud. */
function marquer(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    if (!node.classList.contains(className)) node.classList.add(className);
  }
}

/* Dépose (ou réutilise par id) un paragraphe visible à emplacement stable. */
function placeParagraphe(el, id, classe, parent, ancre, texte) {
  if (typeof el !== 'function' || !parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `recit-v2-e049-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E049', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, css, el, reducedMotion } = ctx;
    if (!present(layout) || typeof layout.querySelector !== 'function') return;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') css('recit-v2-e049', CSS);

    /* E049-09 — gouverneur V2 : un attribut propre, lu une fois par rendu. */
    let reduce = false;
    try { reduce = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false; }
    catch { reduce = false; }
    layout.setAttribute('data-v2-e049-motion', reduce ? 'reduce' : 'full');
    marquer(layout, 'recit-v2-e049-root');

    const corps = layout.querySelector('.recit-body');
    if (!present(corps)) return;

    /* --- E049-01 : métadonnées et timing ---------------------------------- */
    marquer(corps.querySelector('.recit-meta'), 'recit-v2-e049-meta');
    marquer(corps.querySelector('.recit-timing'), 'recit-v2-e049-timing');

    /* --- E049-02 : outils et statut --------------------------------------- */
    marquer(corps.querySelector('.c3a-tools'), 'recit-v2-e049-tools');
    marquer(corps.querySelector('.c3a-status'), 'recit-v2-e049-status');

    /* --- E049-03 : cascade des commandes + synthèse dérivée du DOM --------- */
    const cmds = Array.prototype.slice.call(corps.querySelectorAll('.recit-actions > button'));
    cmds.slice(0, LIMITE_CASCADE).forEach((bouton, index) => {
      marquer(bouton, 'recit-v2-e049-cmd');
      if (bouton.style && typeof bouton.style.setProperty === 'function') {
        bouton.style.setProperty('--v2-e049-cmd-delay', `${index * PAS_CASCADE}ms`);
      }
    });
    if (cmds.length) {
      const actions = corps.querySelector('.recit-actions');
      const pluriel = cmds.length > 1 ? 's' : '';
      placeParagraphe(el, 'v2-e049-cascade', 'recit-v2-e049-cascade', corps, actions,
        `Cascade d'entrée : ${cmds.length} commande${pluriel} animée${pluriel}.`);
    }

    /* --- E049-04 : légende ------------------------------------------------- */
    const legende = corps.querySelector('.recit-legend');
    if (present(legende)) {
      marquer(legende, 'recit-v2-e049-legend');
      Array.prototype.forEach.call(legende.querySelectorAll('p'), (p) => {
        marquer(p, 'recit-v2-e049-leg-p');
      });
    }

    /* --- E049-05 : pastille de certitude ----------------------------------- */
    marquer(corps.querySelector('.recit-conf'), 'recit-v2-e049-conf');

    /* --- E049-06 : commandes désactivées ----------------------------------- */
    Array.prototype.forEach.call(corps.querySelectorAll('.recit-actions > button[disabled]'),
      (bouton) => marquer(bouton, 'recit-v2-e049-cmd-off'));

    /* --- E049-07 : filtres, état actif issu de aria-pressed ---------------- */
    Array.prototype.forEach.call(corps.querySelectorAll('.c3a-filter'),
      (filtre) => marquer(filtre, 'recit-v2-e049-filter'));

    /* --- E049-08 : message « aucun résultat » ------------------------------ */
    marquer(corps.querySelector('.c3a-empty'), 'recit-v2-e049-empty');

    /* --- E049-10 : items du fil, repère de focus --------------------------- */
    Array.prototype.forEach.call(corps.querySelectorAll('#c3a-thread .c3a-thread-item'),
      (item) => marquer(item, 'recit-v2-e049-item'));
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
