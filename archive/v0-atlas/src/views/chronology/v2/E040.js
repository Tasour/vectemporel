import { register } from './registry.js';

/* Lentille E040 — ordre de lecture du détail et focus programmatique.
 * (domaine D : navigation et clavier de la vue Chronologie, passe V2.)
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E040.md — chantiers
 * E040-01 à E040-10. Fichier possédé : src/views/chronology/v2/E040.js.
 * Lectures seules : src/views/chronology.js, src/platform/keyboard.js,
 * src/ui/shell.js, src/views/chronology/v2/registry.js et modèles E049.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le
 * registre V2 ne fournit pas say() : la lentille n'ajoute AUCUNE région live.
 * Le déplacement de focus est strictement programmatique (cibles tabindex=-1)
 * et déclenché par un contrôle explicite : aucun vol de focus, aucun piège de
 * tabulation, aucune touche interceptée, aucun data-fk réécrit.
 *
 * Invariants : un seul register('E040', install), un seul
 * ctx.css('chronology-v2-e040', …), un seul écouteur focusin sous garde,
 * aucun timer, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 * journalisation, aucun HTML brut.
 */

const CSS_ID = 'chronology-v2-e040';
const GUIDE_ID = 'chronology-v2-e040-guide';
const TITLE_ID = 'chronology-v2-e040-title';
const ANCHOR_ID = 'chronology-v2-e040-anchor';
const OUTLINE_ID = 'chronology-v2-e040-outline';
const RESTART_ID = 'chronology-v2-e040-restart';
const PREV_POINT_ID = 'chronology-v2-e040-prev-point';
const NEXT_POINT_ID = 'chronology-v2-e040-next-point';
const POINTS_ID = 'chronology-v2-e040-points';
const FOCUS_ID = 'chronology-v2-e040-focus';
const INTEGRITY_ID = 'chronology-v2-e040-integrity';
const MOTION_ID = 'chronology-v2-e040-motion';
const ORDER_ID = 'chronology-v2-e040-order';
const PROG_ID = 'chronology-v2-e040-programmatic';
const STAT_ID = 'chronology-v2-e040-status';
const ASIDE_ID = 'atlas-chrono-aside';
const EVENT_TITLE_ID = 'atlas-chrono-event-title';

/* E040-01, -02, -03, -04, -07 et -09 : une seule feuille, injectée une fois
   par ctx.css. Le guide est un bloc en flux à la fin de la fiche : jamais une
   modale, jamais superposé, jamais focusable lui-même. Les boutons portent
   une cible de 36 px et un anneau :focus-visible ; movement réduit et
   forced-colors sont traités en fin de feuille. */
const CSS = `
  #${GUIDE_ID} {
    margin: 18px 0 0; padding: 11px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${GUIDE_ID} .e040-h {
    margin: 0 0 6px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 13px; font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${GUIDE_ID} p { margin: 5px 0 0; }
  #${GUIDE_ID} .e040-lede { color: var(--muted); }
  #${GUIDE_ID} .e040-key { color: var(--gold); font-weight: 600; }
  #${OUTLINE_ID} { margin: 6px 0 8px; padding: 0; list-style: none; }
  #${OUTLINE_ID} li { display: flex; gap: 7px; padding: 2px 0; }
  #${OUTLINE_ID} li[data-e040-present="0"] { opacity: .55; }
  #${OUTLINE_ID} .e040-step { flex: 0 0 16px; color: var(--gold-bright); }
  #${GUIDE_ID} .e040-controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
  #${GUIDE_ID} .e040-btn {
    min-height: 36px; padding: 6px 10px; border: 1px solid var(--line);
    border-radius: 8px; background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${GUIDE_ID} .e040-btn:hover { border-color: var(--gold); }
  #${GUIDE_ID} .e040-btn:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  #${GUIDE_ID} .e040-btn[disabled] { opacity: .45; cursor: not-allowed; }
  #${GUIDE_ID} .e040-readout { color: var(--muted); }
  #${GUIDE_ID} .e040-readout strong { color: var(--ink-soft); font-weight: 600; }
  @media (max-width: 620px) {
    #${GUIDE_ID} .e040-controls { flex-direction: column; align-items: stretch; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${GUIDE_ID}, #${GUIDE_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${GUIDE_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${GUIDE_ID} .e040-h, #${GUIDE_ID} .e040-key,
    #${GUIDE_ID} .e040-btn { color: CanvasText; }
  }
`;

/* E040-02 : les sept temps de lecture de la fiche, dans l'ordre réel du DOM
   produit par chronology.js:421-527. Un temps absent est signalé, jamais
   simulé : le plan décrit, il ne réécrit pas la fiche. */
const OUTLINE_STEPS = [
  ['Situation du repère', '.aside-kicker'],
  ['Titre du repère (ancre de focus)', `#${EVENT_TITLE_ID}`],
  ['Année et sous-titre', '.aside-year'],
  ['Résumé', '.aside-summary'],
  ['Thèmes', '.atlas-chrono-tags'],
  ['Points du repère', '#atlas-chrono-points-title'],
  ['Commandes précédent / suivant', '.aside-actions'],
];

let renderCount = 0;
let focusSamples = 0;
let programmaticCount = 0;
let pointIndex = -1;
let focusBound = false;
let lastProgrammatic = 'aucun';

let refs = {
  guide: null, title: null, pointsList: null, points: [],
  focusProg: null, focusCur: null, integrity: null,
  motion: null, order: null, prog: null, stat: null,
  restart: null, prev: null, next: null, reduced: false,
};

/* E040-10 : garde d'existence pour toute ID préfixée chronology-v2-e040.
   La coque reconstruisant #app, un nœud de la rendu précédent est détaché et
   n'est plus retrouvé par getElementById : il est recréé dans le nouveau
   parent. Un nœud retrouvé ailleurs est déplacé, jamais cloné. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E040-05 : la région live reste la propriété des lentilles E041 et de la
   coque. Ici, le focus est un simple témoignage visible, dédupliqué. */
function onFocusIn(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  focusSamples += 1;
  const label = target.id ? `#${target.id}` : target.tagName.toLowerCase();
  if (refs.guide && refs.guide.isConnected) refs.guide.dataset.e040Focus = label;
  write(refs.focusCur, label);
  const index = (refs.points || []).indexOf(target);
  if (index >= 0) {
    pointIndex = index;
    refreshOrder();
  }
  refreshStat();
}

/* E040-03, E040-04 et E040-07 : déplacement programmatique. La cible reçoit
   tabindex=-1 si elle ne l'a pas (elle n'entre donc pas dans l'ordre Tab),
   le focus est posé sans défilement natif, puis ramené en vue avec un
   comportement « auto » si le mouvement réduit est demandé, « smooth »
   sinon. Aucune touche interceptée, aucune annulation d'événement, aucun data-fk touché. */
function focusTarget(node, label) {
  if (!node || typeof node.focus !== 'function') return;
  if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
  node.focus({ preventScroll: true });
  if (typeof node.scrollIntoView === 'function') {
    try { node.scrollIntoView({ block: 'nearest', behavior: refs.reduced ? 'auto' : 'smooth' }); }
    catch { node.scrollIntoView(); }
  }
  lastProgrammatic = label;
  programmaticCount += 1;
  if (refs.guide && refs.guide.isConnected) {
    refs.guide.dataset.e040ProgrammaticLast = label;
    refs.guide.dataset.e040ProgrammaticCount = String(programmaticCount);
  }
  write(refs.focusProg, `Dernier focus programmatique : ${label}.`);
  refreshStat();
}

function restartReading() {
  if (refs.title) focusTarget(refs.title, 'titre du repère');
}

function stepPoint(delta) {
  const points = refs.points || [];
  if (!points.length) return;
  let next = pointIndex < 0 ? (delta > 0 ? 0 : points.length - 1) : pointIndex + delta;
  next = Math.max(0, Math.min(points.length - 1, next));
  pointIndex = next;
  focusTarget(points[next], `point ${next + 1} sur ${points.length}`);
  refreshOrder();
}

function refreshOrder() {
  const points = refs.points || [];
  const total = points.length;
  const current = pointIndex >= 0 && pointIndex < total ? pointIndex + 1 : 0;
  points.forEach((node, index) => {
    if (node.dataset.e040Order !== String(index + 1)) node.dataset.e040Order = String(index + 1);
    if (node.dataset.e040Size !== String(total)) node.dataset.e040Size = String(total);
  });
  write(refs.order, total
    ? `Points parcourables : ${current ? `point ${current} sur ${total}` : `${total} point(s), aucun focus encore posé`}.`
    : 'Points parcourables : aucun point documenté pour ce repère.');
  if (refs.guide && refs.guide.isConnected) refs.guide.dataset.e040Order = `${current}/${total}`;
}

/* E040-06 : audit en lecture seule des ancres de lecture. Les attributs
   data-fk et aria-labelledby de la vue ne sont jamais modifiés : une dérive
   est signalée, pas réparée ici (fichier non possédé). */
function refreshIntegrity() {
  const title = document.getElementById(EVENT_TITLE_ID);
  const aside = document.getElementById(ASIDE_ID);
  const checks = [];
  checks.push(title
    ? (title.getAttribute('data-fk') === 'country-title' ? 'data-fk du titre intact' : 'data-fk du titre altéré')
    : 'titre du repère absent');
  checks.push(aside
    ? (aside.getAttribute('aria-labelledby') === EVENT_TITLE_ID ? 'fiche étiquetée' : 'étiquetage de la fiche altéré')
    : 'fiche absente');
  checks.push(title
    ? (title.tabIndex === -1 ? 'titre hors ordre Tab' : 'titre dans l’ordre Tab')
    : '—');
  const ok = checks.every((item) => /intact|étiquetée|hors ordre Tab/.test(item));
  write(refs.integrity, `Ancres de lecture : ${checks.join(' · ')}.`);
  if (refs.guide && refs.guide.isConnected) refs.guide.dataset.e040Integrity = ok ? 'ok' : 'partial';
}

function refreshMotion() {
  write(refs.motion, refs.reduced
    ? 'Défilement du focus : immédiat (mouvement réduit respecté).'
    : 'Défilement du focus : doux, basculé en immédiat si le mouvement réduit est demandé.');
  if (refs.guide && refs.guide.isConnected) {
    refs.guide.dataset.e040Motion = refs.reduced ? 'reduced' : 'normal';
  }
}

/* E040-09 : seules les cibles de focus programmatique sont marquées et
   maintenues hors Tab. Le compteur distingue ces cibles des boutons, qui
   eux restent de vrais arrêts Tab. */
function refreshProgrammatic() {
  const targets = [];
  if (refs.title) targets.push(refs.title);
  targets.push(...(refs.points || []));
  targets.forEach((node) => {
    if (node.getAttribute('tabindex') !== '-1') node.setAttribute('tabindex', '-1');
    if (node.dataset.e040Programmatic !== '1') node.dataset.e040Programmatic = '1';
  });
  write(refs.prog, `Cibles de focus programmatique hors Tab : ${targets.length} (titre : ${refs.title ? 1 : 0} · points : ${(refs.points || []).length}). Dernière cible : ${lastProgrammatic}.`);
  if (refs.guide && refs.guide.isConnected) refs.guide.dataset.e040ProgrammaticTargets = String(targets.length);
}

function refreshStat() {
  write(refs.stat, `Greffon E040 — rendus : ${renderCount} · changements de focus observés : ${focusSamples} · déplacements programmatiques : ${programmaticCount} · écouteur unique : ${focusBound ? 'oui' : 'non'}.`);
  if (refs.guide && refs.guide.isConnected) {
    refs.guide.dataset.e040Renders = String(renderCount);
    refs.guide.dataset.e040FocusSamples = String(focusSamples);
  }
}

function buildOutline(make) {
  const nav = make('nav', 'e040-outline');
  nav.id = OUTLINE_ID;
  nav.setAttribute('aria-label', 'Ordre de lecture de la fiche du repère');
  const list = make('ol', 'e040-outline-list');
  OUTLINE_STEPS.forEach(([label, selector], index) => {
    const row = make('li', 'e040-outline-row');
    const present = Boolean(document.querySelector(`#${ASIDE_ID} ${selector}`));
    row.dataset.e040Present = present ? '1' : '0';
    row.dataset.e040Step = String(index + 1);
    row.append(
      make('span', 'e040-step', String(index + 1)),
      make('span', 'e040-step-label', label)
    );
    list.appendChild(row);
  });
  nav.appendChild(list);
  return nav;
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const aside = document.getElementById(ASIDE_ID) || ctx.layout;
  const guide = ensureNode(make, GUIDE_ID, 'section', 'e040-guide', aside);
  guide.setAttribute('role', 'region');
  guide.setAttribute('aria-labelledby', TITLE_ID);

  /* E040-01 : le titre du repère est l'ancre d'entrée de lecture. Un
     aria-describedby est ajouté (jamais remplacé) pour que l'annonce native
     du focus explicite le recompose ; le data-fk reste intact. */
  const eventTitle = document.getElementById(EVENT_TITLE_ID);
  const anchor = make('p', 'e040-readout');
  anchor.id = ANCHOR_ID;
  if (eventTitle) {
    const described = eventTitle.getAttribute('aria-describedby') || '';
    if (!described.split(/\s+/).includes(ANCHOR_ID)) {
      eventTitle.setAttribute('aria-describedby', `${described} ${ANCHOR_ID}`.trim());
    }
    anchor.append(
      make('span', 'e040-key', 'Entrée de lecture : '),
      document.createTextNode(`#${EVENT_TITLE_ID} · tabindex="${eventTitle.hasAttribute('tabindex') ? eventTitle.getAttribute('tabindex') : 'absent'}" · data-fk="${eventTitle.getAttribute('data-fk') || 'absent'}".`)
    );
  } else {
    anchor.append(
      make('span', 'e040-key', 'Entrée de lecture : '),
      document.createTextNode('aucun titre de repère dans cette rendu.')
    );
  }

  const title = make('h2', 'e040-h', 'Ordre de lecture du détail');
  title.id = TITLE_ID;
  const lede = make('p', 'e040-lede', 'Guide observateur : il décrit la séquence de lecture de la fiche et porte un focus programmatique explicite. Il n’ajoute ni région live, ni touche, ni déplacement automatique de focus.');

  const restart = make('button', 'e040-btn', 'Revenir au titre du détail');
  restart.id = RESTART_ID;
  restart.type = 'button';
  restart.setAttribute('aria-controls', ASIDE_ID);
  restart.addEventListener('click', restartReading);

  const prev = make('button', 'e040-btn', '← Point précédent');
  prev.id = PREV_POINT_ID;
  prev.type = 'button';
  const next = make('button', 'e040-btn', 'Point suivant →');
  next.id = NEXT_POINT_ID;
  next.type = 'button';

  const pointsList = aside.querySelector('.points');
  if (pointsList && !pointsList.id) pointsList.id = POINTS_ID;
  const pointsTarget = pointsList ? pointsList.id : ASIDE_ID;
  prev.setAttribute('aria-controls', pointsTarget);
  next.setAttribute('aria-controls', pointsTarget);
  prev.addEventListener('click', () => stepPoint(-1));
  next.addEventListener('click', () => stepPoint(1));

  const controls = make('div', 'e040-controls');
  controls.append(restart, prev, next);

  const focusLine = make('p', 'e040-readout');
  focusLine.id = FOCUS_ID;
  const focusProg = make('span', '', 'Dernier focus programmatique : aucun.');
  const focusCur = make('span', '', ' Focus courant : aucun contrôle actif.');
  focusLine.append(focusProg, focusCur);

  const integrity = make('p', 'e040-readout');
  integrity.id = INTEGRITY_ID;
  const motion = make('p', 'e040-readout');
  motion.id = MOTION_ID;
  const order = make('p', 'e040-readout');
  order.id = ORDER_ID;
  const prog = make('p', 'e040-readout');
  prog.id = PROG_ID;
  const stat = make('p', 'e040-readout');
  stat.id = STAT_ID;

  guide.replaceChildren(title, lede, anchor, buildOutline(make), controls,
    focusLine, integrity, motion, order, prog, stat);

  const points = pointsList ? Array.from(pointsList.querySelectorAll('.point')) : [];
  if (pointIndex >= points.length) pointIndex = -1;
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  refs = {
    guide, title: eventTitle, pointsList, points,
    focusProg, focusCur, integrity, motion, order, prog, stat,
    restart, prev, next, reduced,
  };

  prev.disabled = points.length === 0;
  next.disabled = points.length === 0;

  refreshIntegrity();
  refreshMotion();
  refreshProgrammatic();
  refreshOrder();
  refreshStat();
  write(focusProg, `Dernier focus programmatique : ${lastProgrammatic}.`);

  /* E040-10 : un seul écouteur documentaire, purement observationnel. */
  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E040', install);
