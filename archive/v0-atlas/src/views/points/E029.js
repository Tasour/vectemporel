import { register } from './registry.js';

/* Lentille E029 — Détail & fiche : point suivant / précédent dans le détail
 * (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E029.md — chantiers E029-01 à E029-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * le routeur, le store et styles.css ne sont ni édités ni doublés.
 *
 * E029 enrichit les DEUX boutons natifs de `.points-nav` (« ← Point précédent »,
 * « Point suivant → ») déjà produits par points.js:115-122. Il ne crée aucun
 * second bouton, ne remplace aucun gestionnaire natif et ne touche ni les
 * filtres, ni le store, ni l'ancre de retour à la matrice (E030), ni les
 * raccourcis clavier (E035/E036) : il ne pose aucun écouteur global.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js:28-44). Le greffon reste actif avec un ctx
 * minimal : aucune dépendance vers le store, le routeur ou une autre lentille.
 *
 * Invariants :
 * - une seule feuille CSS, une seule portée, une seule paire de boutons marqués ;
 * - aucun id sur un enfant direct de .points-layout (sinon _diagnostics.js:69-79
 *   le masquerait) : la cible aria-controls est le titre de la fiche, enfant de
 *   .points-detail ;
 * - libellés accessibles STABLES : la coque (shell.js:204-290) restaure le focus
 *   par signature (tag, role, aria-label, aria-current, texte, rang) ; un
 *   aria-label qui changerait à chaque point casserait cette restauration ;
 * - aucune région live propre : la coque annonce déjà le changement de point
 *   (store.js:172-173) ; E029 ajoute un STATUT VISIBLE, jamais une seconde voix ;
 * - aucune announcement sonore, aucun timer, aucune boucle rAF, aucun
 *   MutationObserver, aucun réseau, aucun aléa, aucune sortie console, aucun
 *   innerHTML : l'état de borne est déduit par comparaison de signatures aux
 *   rendus successifs (install() est rappelé par runEnhancements à chaque rendu).
 */

const CSS_ID = 'points-e029';
const TARGET_ID = 'points-e029-target';
const PREV_ID = 'points-e029-prev';
const NEXT_ID = 'points-e029-next';
const NOTE_ID = 'points-e029-note';
const STATUS_ID = 'points-e029-status';
const METRICS_ID = 'points-e029-metrics';

/* E029-01 / E029-09 / E029-10 : toute règle est préfixée `points-e029-` et
 * accrochée à un nœud possédé par la lentille. Aucun sélecteur générique,
 * aucune fuite hors de la vue Points. */
const CSS = `
  #${PREV_ID}, #${NEXT_ID} {
    min-height: 44px; padding: 8px 14px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright, #e9c98f);
    font: inherit; font-size: 13px; line-height: 1.3; cursor: pointer;
    transition: background-color .18s linear, border-color .18s linear, opacity .18s linear;
  }
  #${PREV_ID}:hover, #${NEXT_ID}:hover { border-color: var(--gold-bright, #e9c98f); }
  #${PREV_ID}:focus-visible, #${NEXT_ID}:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  /* E029-05 : la borne est dite par le style de bordure, l'italique et un
   * suffixe textuel — jamais par la seule couleur. aria-disabled laisse le
   * bouton focusable (contrairement à disabled, exclu de focusCandidates()). */
  #${PREV_ID}[aria-disabled="true"], #${NEXT_ID}[aria-disabled="true"] {
    border-style: dashed; opacity: .68; cursor: default; font-style: italic;
  }
  #${PREV_ID}[aria-disabled="true"]::after,
  #${NEXT_ID}[aria-disabled="true"]::after {
    content: " · borne"; font-size: 10px; font-style: italic;
  }
  .points-e029-nav { display: flex; flex-wrap: wrap; gap: 8px; }
  .points-e029-note, .points-e029-status, .points-e029-metrics {
    margin: 0 0 8px; font-size: 11px; line-height: 1.45;
  }
  .points-e029-note { color: var(--muted-2, #8a8a8a); }
  .points-e029-status {
    padding-left: 8px; border-left: 3px solid var(--gold, #e6b96f);
    color: var(--ink-soft, #d8d8d8);
  }
  .points-e029-metrics {
    color: var(--muted-2, #8a8a8a); font-variant-numeric: tabular-nums;
  }
  @media (max-width: 620px) {
    #${PREV_ID}, #${NEXT_ID} { flex: 1 1 140px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PREV_ID}, #${NEXT_ID} { transition: none; }
  }
  @media (forced-colors: active) {
    #${PREV_ID}, #${NEXT_ID} {
      background: ButtonFace; color: ButtonText; border: 1px solid ButtonText;
    }
    #${PREV_ID}[aria-disabled="true"], #${NEXT_ID}[aria-disabled="true"] {
      border-style: dashed; opacity: 1;
    }
    .points-e029-status { border-left-color: Highlight; }
  }
`;

/* État de module : survit aux rendus successifs de la coque, exactement comme
 * les compteurs de E013/E030. Il ne contient aucun nœud DOM périmé. */
let pending = null;          // { dir: 'prev'|'next', fromTitle: string } — clic en attente de rendu
let lastSig = null;          // signature du périmètre au rendu précédent
let boundaryDir = null;      // direction déjà épuisée ('prev' / 'next' / null)
let movedCount = 0;          // déplacements effectifs (titre changé)
let boundaryCount = 0;       // clics restés sans changement de titre
let lastNote = '';
let lastStatus = '';
let lastMetrics = '';

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E029-02 : la vue est trouvée par le contrat, jamais par un sélecteur global. */
function findDetail(ctx) {
  const root = ctx && ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout
    : (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null);
  return root ? root.querySelector('.points-detail') : null;
}

function currentTitle(detail) {
  return textOf(detail && detail.querySelector('.points-point-title'));
}

/* E029-06 : le seul nombre affiché vient du kicker réel de points.js:96
 * (« N point(s) dans ce périmètre »). Aucun total codé en dur. */
function perimeterCount(detail) {
  const kicker = detail && detail.querySelector('.view-kicker');
  const match = /(\d+)/.exec(textOf(kicker));
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

/* E029-05 : la signature distingue un déplacement de point d'un changement de
 * filtre ou d'ère : titre + valeurs des deux selects + ère active, tous lus
 * dans le DOM. */
function perimeterSig(ctx, detail) {
  const layout = ctx && ctx.layout;
  const selects = layout && typeof layout.querySelectorAll === 'function'
    ? layout.querySelectorAll('.points-filters select') : [];
  const filters = Array.prototype.map.call(selects, (node) => node.value).join('|');
  const active = layout ? layout.querySelector('.points-grid-row.is-active .points-era') : null;
  return `${currentTitle(detail)}::${filters}::${textOf(active)}`;
}

/* E029-03 : repérage NON destructif des deux boutons natifs de .points-nav,
 * reconnus à leur libellé, avec repli positionnel. Aucun bouton n'est créé. */
function findButtons(nav) {
  const list = nav && typeof nav.querySelectorAll === 'function'
    ? nav.querySelectorAll('button') : [];
  let prev = null;
  let next = null;
  Array.prototype.forEach.call(list, (button) => {
    const label = textOf(button);
    if (!prev && /pr[eé]c[eé]dent/i.test(label)) prev = button;
    if (!next && /suivant/i.test(label)) next = button;
  });
  if (!prev) prev = list[0] || null;
  if (!next) next = list[list.length - 1] || null;
  return { prev, next };
}

/* E029-07 : nœud unique par id, relogé sans doublon. Le parent est toujours
 * .points-detail (jamais un enfant direct de layout, voir en-tête). */
function ensureNode(ctx, detail, id, className, before) {
  let node = document.getElementById(id);
  if (node && node.parentElement !== detail) node.remove();
  node = document.getElementById(id);
  if (!node) {
    node = ctx.el('p', className);
    node.id = id;
    detail.appendChild(node);
  }
  if (before && node.nextSibling !== before) detail.insertBefore(node, before);
  return node;
}

function writeNode(node, value, key) {
  if (!node || value === key) return key;
  node.textContent = value;
  return value;
}

function setBoundary(button, isBoundary) {
  if (!button) return;
  if (button.setAttribute) button.setAttribute('aria-disabled', isBoundary ? 'true' : 'false');
  if (button.dataset) button.dataset.pointsE029Boundary = isBoundary ? '1' : '0';
}

/* E029-08 : compteurs auditables, hors toute région live. */
function writeMetrics(node) {
  const value = `Déplacements : ${movedCount} · Bornes atteintes : ${boundaryCount}.`;
  lastMetrics = writeNode(node, value, lastMetrics);
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;

  /* E029-01 : cssOnce via ctx.css ; une seule feuille, réappliquée sans effet. */
  ctx.css(CSS_ID, CSS);

  const detail = findDetail(ctx);
  if (!detail) return;
  const nav = detail.querySelector('.points-nav');
  if (!nav) return;
  const { prev, next } = findButtons(nav);
  if (!prev || !next) return;

  /* E029-04 : cible aria-controls = titre de la fiche (ou, à défaut, le kicker).
   * Ces nœuds sont des ENFANTS de .points-detail : _diagnostics.js ne les
   * marque pas, contrairement à un id posé sur .points-detail lui-même. */
  const target = detail.querySelector('.points-point-title') || detail.firstElementChild;
  let targetId = '';
  if (target) {
    if (!target.id) target.id = TARGET_ID;
    targetId = target.id;
  }
  detail.classList.add('points-e029');
  if (!detail.hasAttribute('aria-label')) {
    detail.setAttribute('aria-label', 'Fiche du point sélectionné');
  }
  if (detail.dataset) detail.dataset.pointsE029 = 'ready';

  /* E029-02 / E029-03 : IDs préfixés, libellés STABLES (impératifs pour la
   * restauration de focus de la coque), title contextuel relu du DOM. Les
   * libellés visuels d'origine ne sont ni remplacés ni réécrits. */
  prev.id = PREV_ID;
  next.id = NEXT_ID;
  prev.classList.add('points-e029-navbtn');
  next.classList.add('points-e029-navbtn');
  nav.classList.add('points-e029-nav');
  prev.setAttribute('aria-label', 'Point précédent dans la fiche');
  next.setAttribute('aria-label', 'Point suivant dans la fiche');
  if (targetId) {
    prev.setAttribute('aria-controls', targetId);
    next.setAttribute('aria-controls', targetId);
  }
  const title = currentTitle(detail);
  prev.title = title ? `Point précédent — depuis ${title}` : 'Point précédent';
  next.title = title ? `Point suivant — depuis ${title}` : 'Point suivant';

  /* E029-05 : ré-applique la borne connue au nouveau bouton du rendu courant,
   * avant toute décision, pour qu'un rendu sans déplacement ne la perde pas. */
  setBoundary(prev, boundaryDir === 'prev');
  setBoundary(next, boundaryDir === 'next');

  /* E029-07 / E029-06 / E029-08 : trois nœuds de texte réel, indexables. */
  const note = ensureNode(ctx, detail, NOTE_ID, 'points-e029-note', nav);
  const statusNode = ensureNode(ctx, detail, STATUS_ID, 'points-e029-status', nav);
  const metrics = ensureNode(ctx, detail, METRICS_ID, 'points-e029-metrics', null);
  const count = perimeterCount(detail);
  lastNote = writeNode(note, count === null
    ? 'Le parcours précédent / suivant est limité aux points du périmètre affiché.'
    : `Le parcours précédent / suivant est limité aux ${count} point(s) du périmètre affiché.`, lastNote);

  /* E029-02 : un seul écouteur par bouton, même si install() repasse deux fois
   * sur le même DOM. Le gestionnaire natif de points.js reste intact : il lit
   * l'état et déclenche set() en tâche différée, notre simple enregistrement
   * local s'exécute donc avant le re-rendu. */
  [[prev, 'prev'], [next, 'next']].forEach(([button, dir]) => {
    if (!button.dataset || button.dataset.pointsE029Bound === '1') return;
    button.dataset.pointsE029Bound = '1';
    button.addEventListener('click', () => {
      pending = { dir, fromTitle: currentTitle(detail) };
    });
  });

  /* E029-05 : le cœur de la détection de borne. pending porte le titre vu au
   * clic ; au rendu suivant, title est comparé à ce titre. Titre identique →
   * la commande a été bornée (store.js:119-120) ; titre différent → déplacement
   * réel. Aucun timer, aucun observateur, aucune lecture du store. */
  const sig = perimeterSig(ctx, detail);
  if (pending) {
    const { dir, fromTitle } = pending;
    const button = dir === 'prev' ? prev : next;
    if (title !== fromTitle) {
      movedCount += 1;
      boundaryDir = null;
      setBoundary(prev, false);
      setBoundary(next, false);
      lastStatus = writeNode(statusNode, title
        ? `Dernier déplacement : point ${dir === 'prev' ? 'précédent' : 'suivant'} → ${title}.`
        : 'Dernier déplacement : fiche actualisée.', lastStatus);
    } else {
      boundaryCount += 1;
      boundaryDir = dir;
      setBoundary(button, true);
      lastStatus = writeNode(statusNode, dir === 'prev'
        ? 'Borne atteinte : aucun point précédent dans ce périmètre.'
        : 'Borne atteinte : aucun point suivant dans ce périmètre.', lastStatus);
    }
  } else if (lastSig === null) {
    /* E029-07 : premier rendu, statut initial non vide. */
    lastStatus = writeNode(statusNode, title
      ? `Fiche affichée : ${title}. Les boutons parcourent le périmètre.`
      : 'Aucune fiche affichée dans ce périmètre.', lastStatus);
  } else if (sig !== lastSig) {
    /* Filtre ou ère modifié : la borne précédente n'a plus de sens. */
    boundaryDir = null;
    setBoundary(prev, false);
    setBoundary(next, false);
    lastStatus = writeNode(statusNode, title
      ? `Périmètre actualisé : ${title}.`
      : 'Périmètre actualisé : aucune fiche affichée.', lastStatus);
  }
  pending = null;
  lastSig = sig;
  writeMetrics(metrics);
}

register('E029', install);
