import { register } from './registry.js';

/* Lentille E029 — passe 2 (module POINTS/V2 E029). Détail & fiche :
 * panneau de lecture de l'état de la navigation précédent / suivant.
 *
 * Dix chantiers V2, E029-V2-01 à E029-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E029.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E029.js) garde
 * la main sur les deux boutons natifs, leurs libellés stables, la détection
 * de borne (aria-disabled) et le statut visible. La passe 2 ne pilote rien,
 * elle REND LISIBLE l'état courant de cette navigation. Tout identifiant,
 * classe, attribut de données et id de feuille est préfixé `points-v2-e029`
 * / `v2-e029`, pour ne jamais entrer en collision avec le panneau de la
 * passe 1 (`points-e029`, `data-points-e029-*`).
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
 * global, aucun second bouton : les signaux sont lus dans le DOM réellement
 * produit par points.js et marqué par la passe 1 (titre .points-point-title,
 * kicker .view-kicker, boutons .points-nav, aria-disabled / data-points-e029-
 * boundary) et réaffichés. Aucune position, aucun total, aucun millésime
 * n'est inventé ni codé en dur. Le seul ajout à un nœud existant est un
 * aria-describedby complété (jamais écrasé) sur les deux boutons natifs.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el (jamais
 * innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * chaque état porte un glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e029';
const SCOPE = 'points-v2-e029';
const SUMMARY_ID = 'points-v2-e029-summary';
const TITLE_ID = 'points-v2-e029-title';
const HINT_ID = 'points-v2-e029-hint';
const REDUCED_ATTR = 'data-v2-e029-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* E029-V2-05 : vocabulaire d'état. Chaque distinction est codée trois fois :
 * glyphe, mot et couleur redondante (jamais la couleur seule). */
const DOC_STATES = {
  present: { mark: '◉', word: 'fiche affichée' },
  empty: { mark: '○', word: 'aucune fiche' },
};
const PREV_STATES = {
  open: { mark: '←', word: 'précédent disponible' },
  boundary: { mark: '⊣', word: 'borne atteinte : aucun précédent' },
};
const NEXT_STATES = {
  open: { mark: '→', word: 'suivant disponible' },
  boundary: { mark: '⊢', word: 'borne atteinte : aucun suivant' },
};

/* E029-V2-01 / E029-V2-09 : feuille unique, entièrement préfixée par
 * .points-v2-e029, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. La transition ne porte que sur une couleur de glyphe. */
const CSS = `
.points-v2-e029 .points-v2-e029-summary {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-v2-e029 .points-v2-e029-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e029 .points-v2-e029-intro,
.points-v2-e029 .points-v2-e029-hint,
.points-v2-e029 .points-v2-e029-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e029 .points-v2-e029-list {
  list-style: none; margin: 0 0 8px; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 4px 10px;
}
.points-v2-e029 .points-v2-e029-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e029 .points-v2-e029-glyph {
  display: inline-block; min-width: 1.4em;
  color: var(--gold-bright); font-weight: 700;
  transition: color .18s linear;
}
.points-v2-e029 .points-v2-e029-name { color: var(--ink-soft); }
.points-v2-e029 .points-v2-e029-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px;
}
.points-v2-e029 .points-v2-e029-item.is-boundary .points-v2-e029-glyph,
.points-v2-e029 .points-v2-e029-item.is-empty .points-v2-e029-glyph {
  color: var(--muted-2);
}
.points-v2-e029 .points-v2-e029-current,
.points-v2-e029 .points-v2-e029-metrics {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e029[` + REDUCED_ATTR + `="1"] .points-v2-e029-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e029 .points-v2-e029-glyph { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e029 .points-v2-e029-list { grid-template-columns: 1fr; }
}
@media (forced-colors: active) {
  .points-v2-e029 .points-v2-e029-summary { border-color: CanvasText; }
  .points-v2-e029 .points-v2-e029-glyph,
  .points-v2-e029 .points-v2-e029-state { color: CanvasText; }
}
@media print {
  .points-v2-e029 .points-v2-e029-summary {
    border-color: #666; background: transparent;
  }
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E029-V2-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E029-V2-03 : repérage NON destructif des deux boutons natifs de .points-nav,
 * reconnus à leur libellé, avec repli sur les ids posés par la passe 1 puis
 * repli positionnel. Aucun bouton créé, aucun gestionnaire natif remplacé. */
function buttonsOf(nav) {
  const list = nodes(nav, 'button');
  let prev = query(nav, '#points-e029-prev');
  let next = query(nav, '#points-e029-next');
  list.forEach((button) => {
    const label = txt(button);
    if (!prev && /pr[eé]c[eé]dent/i.test(label)) prev = button;
    if (!next && /suivant/i.test(label)) next = button;
  });
  if (!prev) prev = list[0] || null;
  if (!next) next = list[list.length - 1] || null;
  return { prev, next };
}

/* E029-V2-03 : l'état de borne est lu dans l'aria-disabled posé par la passe 1
 * (confirmé par son marqueur data-points-e029-boundary). Aucune inférence par
 * timer, observateur ou lecture du store. */
function isBoundary(button) {
  if (!button) return false;
  if (getAttr(button, 'aria-disabled') === 'true') return true;
  return !!(button.dataset && button.dataset.pointsE029Boundary === '1');
}

/* E029-V2-04 : l'unique nombre affiché vient du kicker réel de points.js:97
 * (« N point(s) dans ce périmètre »). Aucun total codé en dur, aucune position
 * supposée : state.pointIndex n'est pas exposé par le contrat. */
function parseCount(text) {
  const match = /(\d[\d\s\u00a0]*)/.exec(String(text || ''));
  if (!match) return null;
  const value = parseInt(match[1].replace(/[\s\u00a0]/g, ''), 10);
  return isFinite(value) ? value : null;
}

function readSignals(layout) {
  const detail = query(layout, '.points-detail');
  const nav = detail ? query(detail, '.points-nav') : null;
  const buttons = buttonsOf(nav);
  const title = txt(query(detail, '.points-point-title'));
  const kicker = txt(query(detail, '.view-kicker'));
  return {
    detail,
    nav,
    prev: buttons.prev,
    next: buttons.next,
    title,
    count: parseCount(kicker),
    hasDoc: !!title,
    prevBoundary: isBoundary(buttons.prev),
    nextBoundary: isBoundary(buttons.next),
  };
}

function signatureOf(s) {
  return [s.title, s.count, s.prevBoundary ? 1 : 0, s.nextBoundary ? 1 : 0].join('|');
}

function listItem(ctx, name, glyph, state, kind) {
  const li = ctx.el('li', 'points-v2-e029-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e029-glyph', glyph),
    ctx.el('span', 'points-v2-e029-name', name),
    ctx.el('span', 'points-v2-e029-state', state)
  );
  return li;
}

/* E029-V2-02 / E029-V2-07 : le lien avec les boutons est additif : les
 * identifiants, libellés et aria-controls déjà posés par la passe 1 sont
 * conservés et dédupliqués, jamais écrasés. aria-describedby ne fait pas
 * partie de la signature de restauration de focus de la coque. */
function augmentDescribedBy(node, id) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const existing = (getAttr(node, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(node, 'aria-describedby', existing.concat(id).join(' '));
}

/* E029-V2-02 / E029-V2-06 : structure statique construite une seule fois par
 * rendu avec ctx.el (jamais innerHTML) ; seules la liste et les trois lignes
 * dynamiques sont remplacées ensuite par fill(). */
function buildSummary(ctx) {
  const summary = ctx.el('section', 'points-v2-e029-summary');
  summary.id = SUMMARY_ID;
  setAttr(summary, 'role', 'region');
  setAttr(summary, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e029-title',
    'Navigation du détail — lecture de l’état');
  title.id = TITLE_ID;
  summary.appendChild(title);

  summary.appendChild(ctx.el('p', 'points-v2-e029-intro',
    'Ce panneau relit le titre de la fiche, le kicker du périmètre et l’état des deux boutons « précédent / suivant » tels que la vue et la passe 1 les ont rendus. Il ne déplace jamais le point : les commandes restent gérées par la passe 1.'));
  summary.appendChild(ctx.el('ul', 'points-v2-e029-list', ''));
  summary.appendChild(ctx.el('p', 'points-v2-e029-current', ''));
  summary.appendChild(ctx.el('p', 'points-v2-e029-metrics', ''));

  const hint = ctx.el('p', 'points-v2-e029-hint',
    'Lecture seule : ce panneau décrit la navigation dans le périmètre affiché ; les boutons « précédent » et « suivant » restent gérés par la passe 1.');
  hint.id = HINT_ID;
  summary.appendChild(hint);

  summary.appendChild(ctx.el('p', 'points-v2-e029-note',
    'Règle de lecture : chaque état est écrit avec un signe et un mot, jamais par la couleur seule. Si le titre ou le kicker est absent, la valeur est dite « non lisible » plutôt que supposée.'));
  return summary;
}

/* E029-V2-04 / E029-V2-05 / E029-V2-08 : tout le contenu dynamique est écrit
 * ici, à partir des signaux lus dans le DOM. */
function fill(ctx, summary, signals) {
  const doc = signals.hasDoc ? DOC_STATES.present : DOC_STATES.empty;
  const prev = signals.prevBoundary ? PREV_STATES.boundary : PREV_STATES.open;
  const next = signals.nextBoundary ? NEXT_STATES.boundary : NEXT_STATES.open;
  const count = signals.count;

  const list = query(summary, '.points-v2-e029-list');
  if (list) {
    list.replaceChildren(
      listItem(ctx, 'Fiche : ' + (signals.title || 'aucune'),
        doc.mark, doc.word, signals.hasDoc ? 'open' : 'empty'),
      listItem(ctx, 'Bouton précédent',
        prev.mark, prev.word, signals.prevBoundary ? 'boundary' : 'open'),
      listItem(ctx, 'Bouton suivant',
        next.mark, next.word, signals.nextBoundary ? 'boundary' : 'open'),
      listItem(ctx, 'Périmètre',
        '◉', count === null ? 'non lisible' : count + ' point' + plural(count, '', 's'),
        count === null ? 'empty' : 'open')
    );
  }

  const current = query(summary, '.points-v2-e029-current');
  if (current) {
    current.textContent = 'Lecture : '
      + (signals.hasDoc ? '« ' + signals.title + ' »' : 'aucune fiche affichée')
      + ' · précédent ' + prev.word + ' · suivant ' + next.word + '.';
  }

  const metrics = query(summary, '.points-v2-e029-metrics');
  if (metrics) {
    metrics.textContent = 'Signaux observables : fiche '
      + (signals.hasDoc ? 'présente' : 'absente')
      + ' · périmètre ' + (count === null ? 'non lu' : count)
      + ' · précédent ' + (signals.prevBoundary ? 'borne' : 'libre')
      + ' · suivant ' + (signals.nextBoundary ? 'borne' : 'libre') + '.';
  }

  setAttr(summary, 'data-v2-e029-doc', signals.hasDoc ? '1' : '0');
  setAttr(summary, 'data-v2-e029-count', count === null ? '' : String(count));
  setAttr(summary, 'data-v2-e029-prev', signals.prevBoundary ? 'boundary' : 'open');
  setAttr(summary, 'data-v2-e029-next', signals.nextBoundary ? 'boundary' : 'open');
}

/* E029-V2-01 / E029-V2-09 / E029-V2-10 : unique point d'entrée, gardes
 * structurelles, feuille unique, portée unique, ids dédupliqués, repli
 * silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  const nav = detail ? query(detail, '.points-nav') : null;
  if (!isElement(detail) || !isElement(nav)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  setAttr(nav, 'data-v2-e029-nav', '1');

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const signals = readSignals(layout);
  const sig = signatureOf(signals);

  /* E029-V2-10 : réconciliation par id. On conserve le panneau déjà monté dans
   * le détail courant, on retire les doublons d'un rendu antérieur, puis on
   * garantit l'unicité du titre et de l'infobulle. */
  const candidates = nodesById(SUMMARY_ID);
  let summary = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      summary = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== summary) removeNode(node); });

  if (!isElement(summary)) {
    summary = buildSummary(ctx);
    detail.appendChild(summary);
  }
  enforceUnique(TITLE_ID, query(summary, '#' + TITLE_ID));
  enforceUnique(HINT_ID, query(summary, '#' + HINT_ID));

  if (getAttr(summary, 'data-v2-e029-signature') !== sig) {
    setAttr(summary, 'data-v2-e029-signature', sig);
    fill(ctx, summary, signals);
  }

  setAttr(summary, 'data-v2-e029', '1');
  augmentDescribedBy(signals.prev, HINT_ID);
  augmentDescribedBy(signals.next, HINT_ID);
}

register('E029', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
