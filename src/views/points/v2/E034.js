import { register } from './registry.js';

/* Lentille E034 — passe 2 (module POINTS/V2 E034). Navigation & clavier :
 * registre de parcours Tab et de retour de focus.
 *
 * Dix chantiers V2, E034-V2-01 à E034-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E034.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E034.js) garde
 * la main sur son panneau d'aide local et sur le retour de focus Échap vers son
 * déclencheur ; la passe 2 ne pilote aucun focus, n'installe aucun écouteur et
 * ne modifie aucun état — elle REND LISIBLE le parcours clavier réellement
 * rendu et le chemin de retour de focus. Tout identifiant, attribut de données
 * et id de feuille est préfixé `points-v2-e034` / `v2-e034`, pour ne jamais
 * entrer en collision avec le panneau `points-e034` déjà monté par la passe 1.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
 * global : les signaux sont lus dans le DOM produit par points.js (boutons,
 * <select>, .points-era, .points-cell, .points-nav) et dans le panneau d'aide
 * de la passe 1 (lecture seule). Aucun nombre de contrôles n'est codé en dur.
 *
 * Invariants : un seul register ('E034'), une seule feuille, un seul panneau
 * par rendu ; ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el
 * (jamais innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro
 * console.* ; chaque état porte un glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e034';
const SCOPE = 'points-v2-e034';
const PANEL_ID = 'points-v2-e034-summary';
const TITLE_ID = 'points-v2-e034-title';
const REDUCED_ATTR = 'data-v2-e034-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Lecture seule des marqueurs de la passe 1 (aucune écriture). */
const P1_TRIGGER_ID = 'points-e034-help-trigger';
const P1_PANEL_ID = 'points-e034-help-panel';

/* E034-V2-03 / E034-V2-06 : vocabulaire d'état. Chaque distinction est codée
 * trois fois : glyphe, mot et couleur redondante (jamais la couleur seule). */
const DOOR_STATES = {
  open: { mark: '◉', word: 'ouvert' },
  closed: { mark: '○', word: 'fermé' },
  absent: { mark: '—', word: 'absent' },
};

const TARGET_KINDS = {
  era: 'ère',
  cell: 'cellule',
  select: 'liste',
  nav: 'navigation',
  button: 'bouton',
  link: 'lien',
  other: 'contrôle',
};

/* E034-V2-01 : feuille unique, entièrement préfixée par .points-v2-e034,
 * classe posée sur .points-layout : aucune fuite hors de cette vue. */
const CSS = `
.points-v2-e034 .points-v2-e034-summary {
  box-sizing: border-box;
  margin: 12px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-v2-e034 .points-v2-e034-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e034 .points-v2-e034-intro,
.points-v2-e034 .points-v2-e034-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e034 .points-v2-e034-block { margin: 0 0 10px; }
.points-v2-e034 .points-v2-e034-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e034 .points-v2-e034-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 4px 10px;
}
.points-v2-e034 .points-v2-e034-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e034 .points-v2-e034-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e034 .points-v2-e034-name { color: var(--ink-soft); }
.points-v2-e034 .points-v2-e034-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px;
}
.points-v2-e034 .points-v2-e034-item.is-open .points-v2-e034-glyph { color: var(--gold-bright); }
.points-v2-e034 .points-v2-e034-item.is-closed .points-v2-e034-glyph { color: var(--muted-2); }
.points-v2-e034 .points-v2-e034-item.is-absent .points-v2-e034-glyph { color: var(--muted-2); }
.points-v2-e034 .points-v2-e034-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.5; color: var(--muted);
}
.points-v2-e034 .points-v2-e034-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; color: var(--muted-2);
}
.points-v2-e034[` + REDUCED_ATTR + `="1"] .points-v2-e034-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e034 .points-v2-e034-glyph { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e034 .points-v2-e034-list { grid-template-columns: 1fr; }
}
@media (forced-colors: active) {
  .points-v2-e034 .points-v2-e034-summary { border-color: CanvasText; }
  .points-v2-e034 .points-v2-e034-glyph { color: CanvasText; }
}
@media print {
  .points-v2-e034 .points-v2-e034-summary { border-color: #666; background: transparent; }
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

function hasClass(node, name) {
  return !!(node && node.classList && node.classList.contains(name));
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E034-V2-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document (un nœud détaché d'un rendu
 * antérieur n'est pas ciblé par querySelectorAll, donc inoffensif). */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E034-V2-02 : l'ordre de parcours est lu dans le DOM réellement rendu par
 * points.js (boutons, selects, ères, cellules, navigation), sans ordinal ni
 * effectif codé en dur. Les contrôles désactivés et ceux à tabindex négatif
 * sont écartés, comme le ferait le moteur de tabulation. */
const FOCUSABLE = 'button, select, a[href], input, [tabindex]:not([tabindex="-1"])';

function readableLabel(node) {
  const aria = txt(getAttr(node, 'aria-label'));
  if (aria) return aria;
  const title = txt(getAttr(node, 'title'));
  if (title) return title;
  const value = txt(node.value);
  if (node.tagName && node.tagName.toLowerCase() === 'select' && value) return value;
  const content = txt(node);
  return content.length > 34 ? content.slice(0, 33) + '…' : content;
}

function targetKind(node) {
  const tag = node.tagName ? node.tagName.toLowerCase() : '';
  if (tag === 'select' || tag === 'input') return 'select';
  if (tag === 'a') return 'link';
  if (hasClass(node, 'points-era')) return 'era';
  if (hasClass(node, 'points-cell')) return 'cell';
  const nav = node.closest ? node.closest('.points-nav') : null;
  if (nav) return 'nav';
  if (tag === 'button') return 'button';
  return 'other';
}

function focusTargets(layout) {
  const result = [];
  nodes(layout, FOCUSABLE).forEach((node) => {
    if (!isElement(node)) return;
    if (getAttr(node, 'disabled') !== null || getAttr(node, 'aria-disabled') === 'true') return;
    const ti = getAttr(node, 'tabindex');
    if (ti !== null && isFinite(parseInt(ti, 10)) && parseInt(ti, 10) < 0) return;
    result.push({ kind: targetKind(node), label: readableLabel(node) || TARGET_KINDS[targetKind(node)] });
  });
  return result;
}

function countKinds(targets) {
  const counts = { era: 0, cell: 0, select: 0, nav: 0, button: 0, link: 0, other: 0 };
  targets.forEach((target) => { if (counts[target.kind] !== undefined) counts[target.kind] += 1; });
  return counts;
}

/* E034-V2-03 / E034-V2-05 : lecture seule du panneau d'aide de la passe 1.
 * L'état ouvert/fermé est déduit de aria-expanded ; aucun attribut n'est écrit
 * ici. Si la passe 1 est absente, on retombe sur « absent » sans erreur. */
function readHelpState(layout) {
  const inLayout = (id) => nodesById(id).filter((node) => layout.contains(node))[0] || null;
  const trigger = inLayout(P1_TRIGGER_ID);
  const panel = inLayout(P1_PANEL_ID);
  let state = DOOR_STATES.absent;
  if (trigger) {
    const expanded = getAttr(trigger, 'aria-expanded') === 'true';
    const hidden = panel ? getAttr(panel, 'hidden') !== null : null;
    if (expanded && hidden !== true) state = DOOR_STATES.open;
    else state = DOOR_STATES.closed;
  }
  return { trigger: !!trigger, panel: !!panel, state, key: state === DOOR_STATES.open ? 'open' : (state === DOOR_STATES.closed ? 'closed' : 'absent') };
}

function readSignals(layout) {
  const targets = focusTargets(layout);
  return {
    targets,
    counts: countKinds(targets),
    total: targets.length,
    help: readHelpState(layout),
  };
}

/* E034-V2-08 : signature déterministe — on ne repeuple que si le parcours ou
 * l'état du panneau change. Aucune région live n'est créée : E034 V2 est purement
 * informative et ne concurrence pas le role=status dédupliqué de la passe 1. */
function signatureOf(signals) {
  const c = signals.counts;
  return [
    signals.total, c.era, c.cell, c.select, c.nav, c.button, c.link, c.other,
    signals.help.key,
  ].join('|');
}

function listItem(ctx, name, glyph, state, kind) {
  const li = ctx.el('li', 'points-v2-e034-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e034-glyph', glyph),
    ctx.el('span', 'points-v2-e034-name', name),
    ctx.el('span', 'points-v2-e034-state', state)
  );
  return li;
}

/* E034-V2-07 : lien avec le déclencheur de la passe 1 additif : les identifiants
 * déjà posés sont conservés et dédupliqués, jamais écrasés. */
function augmentDescribedBy(node, id) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const existing = (getAttr(node, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(node, 'aria-describedby', existing.concat(id).join(' '));
}

/* E034-V2-02 / E034-V2-03 : structure statique construite une seule fois par
 * rendu avec ctx.el (jamais innerHTML) ; seules les listes et les lignes
 * dynamiques sont remplacées ensuite par fill() via replaceChildren. */
function buildSummary(ctx) {
  const summary = ctx.el('section', 'points-v2-e034-summary');
  summary.id = PANEL_ID;
  setAttr(summary, 'role', 'region');
  setAttr(summary, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e034-title',
    'Parcours clavier — lecture du focus');
  title.id = TITLE_ID;
  summary.appendChild(title);

  summary.appendChild(ctx.el('p', 'points-v2-e034-intro',
    'Ce panneau relit les contrôles réellement rendus par la vue et le chemin de retour du focus. Il ne déplace aucun focus et n’installe aucun raccourci : la passe 1 reste seule maître de l’aide locale et de la touche Échap.'));

  const blocks = [
    ['points-v2-e034-path', 'Ordre de parcours Tab', 'points-v2-e034-path-list'],
    ['points-v2-e034-return', 'Retour de focus', 'points-v2-e034-return-list'],
  ];
  blocks.forEach(([blockClass, label, listClass]) => {
    const block = ctx.el('div', 'points-v2-e034-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e034-block-title', label));
    block.appendChild(ctx.el('ul', 'points-v2-e034-list ' + listClass));
    summary.appendChild(block);
  });

  summary.appendChild(ctx.el('p', 'points-v2-e034-current', ''));
  summary.appendChild(ctx.el('p', 'points-v2-e034-metrics', ''));
  summary.appendChild(ctx.el('p', 'points-v2-e034-note',
    'Règle de lecture : Tab avance d’un contrôle à l’autre ; Échap, depuis le panneau d’aide ouvert, rend le focus au bouton qui l’a ouvert. Chaque état est écrit avec un signe et un mot, jamais par la couleur seule.'));
  return summary;
}

/* E034-V2-02 / E034-V2-03 / E034-V2-04 / E034-V2-05 / E034-V2-08 : tout le
 * contenu dynamique est écrit ici, à partir des signaux lus plus haut. */
function fill(ctx, summary, signals) {
  const c = signals.counts;
  const help = signals.help;

  const pathList = query(summary, '.points-v2-e034-path-list');
  if (pathList) {
    const parts = [
      ['Ères', c.era], ['Cellules', c.cell], ['Listes', c.select],
      ['Navigation', c.nav], ['Boutons', c.button],
    ];
    pathList.replaceChildren.apply(pathList, parts.map(([name, count]) =>
      listItem(ctx, name + ' : ' + count,
        count > 0 ? '■' : '□', count > 0 ? 'présentes' : 'aucune',
        count > 0 ? 'open' : 'absent')
    ));
  }

  const returnList = query(summary, '.points-v2-e034-return-list');
  if (returnList) {
    returnList.replaceChildren.apply(returnList, [
      listItem(ctx, 'Panneau d’aide : ' + (help.trigger ? 'déclencheur présent' : 'déclencheur non rendu'),
        help.state.mark, help.state.word, help.key),
      listItem(ctx, 'Échap → focus au déclencheur', '↩',
        help.key === 'open' ? 'actif' : 'en attente',
        help.key === 'open' ? 'open' : 'closed'),
    ]);
  }

  const currentLine = query(summary, '.points-v2-e034-current');
  if (currentLine) {
    currentLine.textContent = 'Cibles Tab dans la vue : ' + signals.total
      + ' contrôle' + plural(signals.total, '', 's')
      + ' · ' + c.era + ' ère' + plural(c.era, '', 's')
      + ' · ' + c.cell + ' cellule' + plural(c.cell, '', 's') + '.';
  }

  const metrics = query(summary, '.points-v2-e034-metrics');
  if (metrics) {
    metrics.textContent = 'Aide clavier : '
      + (help.trigger ? 'déclencheur ' + help.state.word : 'panneau non rendu')
      + ' · retour de focus '
      + (help.key === 'open' ? 'actif quand le panneau est ouvert' : 'non observé en lecture seule')
      + ' · ' + signals.total + ' cible' + plural(signals.total, '', 's') + ' au total.';
  }

  setAttr(summary, 'data-v2-e034-targets', String(signals.total));
  setAttr(summary, 'data-v2-e034-eras', String(c.era));
  setAttr(summary, 'data-v2-e034-cells', String(c.cell));
  setAttr(summary, 'data-v2-e034-help', help.key);
  setAttr(summary, 'data-v2-e034-trigger', help.trigger ? '1' : '0');
}

/* E034-V2-01 / E034-V2-09 / E034-V2-10 : unique point d'entrée, gardes
 * structurelles, feuille unique, portée unique, ids dédupliqués, repli
 * silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const filters = query(layout, '.points-filters');
  const detail = query(layout, '.points-detail');
  if (!isElement(filters) || !isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

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

  /* E034-V2-10 : réconciliation par id. On conserve le panneau déjà monté dans
   * le détail courant, on retire les doublons d'un rendu antérieur, puis on
   * garantit l'unicité du titre. */
  const candidates = nodesById(PANEL_ID);
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

  if (getAttr(summary, 'data-v2-e034-signature') !== sig) {
    setAttr(summary, 'data-v2-e034-signature', sig);
    fill(ctx, summary, signals);
  }

  setAttr(summary, 'data-v2-e034', '1');
  augmentDescribedBy(
    nodesById(P1_TRIGGER_ID).filter((node) => layout.contains(node))[0] || null,
    PANEL_ID
  );
}

register('E034', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
