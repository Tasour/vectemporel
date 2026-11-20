import { register } from './registry.js';

/* Lentille E039 — passe 2 (module POINTS/V2 E039). Navigation & clavier :
 * circuit de tabulation lisible et indicateur du contrôle courant dans les filtres.
 *
 * Dix chantiers V2 inédits, E039-V2-01 à E039-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E039.md. Ils sont DIFFÉRENTS de ceux de la
 * passe 1 (src/views/points/E039.js), qui restaure le focus après filtrage :
 * la passe 2 ne déplace jamais le focus, elle REND LISIBLE le circuit de
 * tabulation des filtres et SIGNale le contrôle qui détient le focus. Les deux
 * passes sont complémentaires et coexistent sans collision d'espace de noms.
 *
 * points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage, layout })
 * en plus de la passe 1 (points.js:127). Contrat exploité :
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion }.
 * Aucune dépendance vers le store, le routeur, ctx.say() ou une autre lentille.
 *
 * Invariants : un seul register, une seule feuille `points-v2-e039` entièrement
 * préfixée .points-v2-e039, ids préfixés points-v2-e039- et dédupliqués, tout
 * DOM bâti avec ctx.el (jamais innerHTML) ; zéro réseau, zéro aléa, zéro timer,
 * zéro rAF, zéro console.* ; aucun appel à focus() (pas de vol de focus) ;
 * aucun raccourci consommé ; chaque état porte un glyphe ET un mot, jamais la
 * couleur seule. Les écouteurs focusin/focusout sont locaux à .points-filters.
 */

const CSS_ID = 'points-v2-e039';
const SCOPE = 'points-v2-e039';
const PANEL_ID = 'points-v2-e039-panel';
const TITLE_ID = 'points-v2-e039-title';
const LIST_ID = 'points-v2-e039-circuit';
const STATUS_ID = 'points-v2-e039-status';
const METRICS_ID = 'points-v2-e039-metrics';
const REDUCED_ATTR = 'data-v2-e039-reduced';
const CURRENT_ATTR = 'data-v2-e039-current';
const INDEX_ATTR = 'data-v2-e039-index';
const VIEW_IDS = ['pointsv2', 'points'];

/* E039-V2-01 : feuille unique, intégralement préfixée .points-v2-e039, y
 * compris dans les quatre requêtes @media. Aucun sélecteur nu, aucun effet
 * hors de la vue Points V2. */
const CSS = `
.points-v2-e039 .points-v2-e039-panel {
  box-sizing: border-box;
  margin: 12px 0 4px; padding: 10px 12px;
  border: 1px solid var(--line); border-radius: 10px;
  background: rgba(8, 11, 16, .55);
}
.points-v2-e039 .points-v2-e039-title {
  margin: 0 0 4px; font-family: var(--serif);
  font-size: 14px; color: var(--gold-bright);
}
.points-v2-e039 .points-v2-e039-intro,
.points-v2-e039 .points-v2-e039-metrics {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e039 .points-v2-e039-circuit {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 4px;
}
.points-v2-e039 .points-v2-e039-step {
  display: flex; align-items: baseline; gap: 8px;
  min-height: 24px; padding: 3px 6px; border-radius: 6px;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e039 .points-v2-e039-glyph {
  display: inline-block; min-width: 1.2em; color: var(--muted-2);
}
.points-v2-e039 .points-v2-e039-rank {
  font-variant-numeric: tabular-nums; color: var(--muted-2);
}
.points-v2-e039 .points-v2-e039-name { color: var(--ink); }
.points-v2-e039 .points-v2-e039-state {
  margin-left: auto; font-size: 10px; color: var(--muted-2);
}
.points-v2-e039 .points-v2-e039-step.is-current {
  border: 1px solid var(--gold); background: rgba(180, 150, 70, .08);
}
.points-v2-e039 .points-v2-e039-step.is-current .points-v2-e039-glyph,
.points-v2-e039 .points-v2-e039-step.is-current .points-v2-e039-state {
  color: var(--gold-bright);
}
.points-v2-e039 .points-v2-e039-status {
  margin: 8px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
}
.points-v2-e039 .points-filters select,
.points-v2-e039 .points-filters button { min-height: 40px; }
.points-v2-e039 .points-filters select:focus-visible,
.points-v2-e039 .points-filters button:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.points-v2-e039[` + REDUCED_ATTR + `="1"] .points-v2-e039-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e039 .points-v2-e039-glyph { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e039 .points-v2-e039-step { gap: 6px; }
}
@media (forced-colors: active) {
  .points-v2-e039 .points-v2-e039-panel,
  .points-v2-e039 .points-v2-e039-step.is-current { border-color: CanvasText; }
  .points-v2-e039 .points-v2-e039-glyph,
  .points-v2-e039 .points-v2-e039-state { color: CanvasText; }
}
@media print {
  .points-v2-e039 .points-v2-e039-panel { border-color: #666; background: transparent; }
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function isDomNode(node) {
  return !!node && node.nodeType === 1;
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  return isElement(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function removeAttr(node, name) {
  if (node && typeof node.removeAttribute === 'function') node.removeAttribute(name);
}

function removeNode(node) {
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

/* E039-V2-10 : réconciliation par id constant (jamais interpolé depuis une
 * donnée externe) pour dédupliquer les nœuds d'un rendu antérieur. */
function nodesById(id) {
  if (typeof document === 'undefined') return [];
  return nodes(document, '[id="' + id + '"]');
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
}

/* E039-V2-03 : libellé lu dans le DOM réel — aria-label, puis title, puis
 * <label for>, puis texte visible. Aucun libellé de domaine/famille codé en dur.
 * Aucune interpolation de sélecteur : les <label> sont comparés par attribut. */
function labelOf(control) {
  const aria = getAttr(control, 'aria-label');
  if (aria && aria.trim()) return aria.trim();
  const title = getAttr(control, 'title');
  if (title && title.trim()) return title.trim();
  const id = getAttr(control, 'id');
  if (id && typeof document !== 'undefined') {
    const labels = nodes(document, 'label');
    for (const label of labels) {
      if (getAttr(label, 'for') === id && label.textContent && label.textContent.trim()) {
        return label.textContent.trim();
      }
    }
  }
  const text = control && control.textContent;
  if (text && text.trim()) return text.trim();
  return 'Commande sans libellé';
}

/* E039-V2-02 : l'ordre du circuit est lu dans le DOM (document order) ; aucun
 * rang n'est supposé. Les contrôles désactivés sont écartés. */
function focusablesOf(filters) {
  if (!isElement(filters)) return [];
  const selector = 'select, button, a[href], input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])';
  const found = [];
  for (const candidate of nodes(filters, selector)) {
    if (candidate.disabled) continue;
    if (found.indexOf(candidate) === -1) found.push(candidate);
  }
  return found;
}

/* E039-V2-09 : signature du circuit. Le panneau n'est repeuplé que si l'ordre
 * ou un libellé change réellement ; évite les écritures redondantes. */
function signatureOf(controls) {
  return controls.map((control, index) => index + ':'
    + String(control.tagName || '').toLowerCase() + ':' + labelOf(control)).join('|');
}

/* E039-V2-02 / E039-V2-03 / E039-V2-07 / E039-V2-08 : coquille statique,
 * bâtie uniquement avec ctx.el. Région titrée, liste ordonnée sémantique,
 * statut attaché, métriques hors région live. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e039-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');

  const title = ctx.el('h3', 'points-v2-e039-title', 'Circuit de tabulation des filtres');
  title.id = TITLE_ID;
  panel.appendChild(title);
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  panel.appendChild(ctx.el('p', 'points-v2-e039-intro',
    'Ordre réel des contrôles dans la zone de filtres. Le signe ▸ désigne le contrôle qui détient le focus ; le mot « actuel » le redouble.'));

  const list = ctx.el('ol', 'points-v2-e039-circuit');
  list.id = LIST_ID;
  panel.appendChild(list);

  const status = ctx.el('p', 'points-v2-e039-status', '');
  status.id = STATUS_ID;
  setAttr(status, 'role', 'status');
  setAttr(status, 'aria-live', 'polite');
  panel.appendChild(status);

  const metrics = ctx.el('p', 'points-v2-e039-metrics', '');
  metrics.id = METRICS_ID;
  panel.appendChild(metrics);

  return panel;
}

/* E039-V2-02 / E039-V2-03 : remplit la liste à partir des contrôles réels.
 * Chaque ligne porte rang, glyphe et mot : jamais la couleur seule. */
function fillPanel(ctx, panel, controls) {
  const list = query(panel, '#' + LIST_ID);
  if (list) {
    while (list.firstChild) list.removeChild(list.firstChild);
    controls.forEach((control, index) => {
      const item = ctx.el('li', 'points-v2-e039-step');
      setAttr(item, INDEX_ATTR, String(index));
      item.appendChild(ctx.el('span', 'points-v2-e039-glyph', '○'));
      item.appendChild(ctx.el('span', 'points-v2-e039-rank', String(index + 1)));
      item.appendChild(ctx.el('span', 'points-v2-e039-name', labelOf(control)));
      item.appendChild(ctx.el('span', 'points-v2-e039-state', 'à parcourir'));
      list.appendChild(item);
    });
  }
  const metrics = query(panel, '#' + METRICS_ID);
  if (metrics) {
    metrics.textContent = 'Circuit de ' + controls.length + ' commande'
      + (controls.length > 1 ? 's' : '') + '. Aucun contrôle visité pour l’instant.';
  }
}

/* E039-V2-03 / E039-V2-04 : pose ou retire l'état « actuel » sur chaque ligne
 * (glyphe ▸, mot « actuel », aria-current et classe), sans toucher au focus. */
function setStepCurrent(step, current) {
  const glyph = query(step, '.points-v2-e039-glyph');
  const state = query(step, '.points-v2-e039-state');
  if (current) {
    step.classList.add('is-current');
    setAttr(step, 'aria-current', 'step');
    if (glyph) glyph.textContent = '▸';
    if (state) state.textContent = 'actuel';
  } else {
    step.classList.remove('is-current');
    removeAttr(step, 'aria-current');
    if (glyph) glyph.textContent = '○';
    if (state) state.textContent = 'à parcourir';
  }
}

/* E039-V2-04 / E039-V2-05 / E039-V2-06 : reflète le contrôle entré, annonce son
 * rang dans la région de statut (mise à jour seulement si le contrôle change)
 * et compte les entrées. Aucun appel à focus(), aucun raccourci consommé. */
function reflectFocus(panel, controls, index) {
  if (index < 0 || index >= controls.length) return;
  const current = getAttr(panel, CURRENT_ATTR);
  const steps = nodes(panel, '.points-v2-e039-step');
  steps.forEach((step) => {
    setStepCurrent(step, getAttr(step, INDEX_ATTR) === String(index));
  });
  setAttr(panel, CURRENT_ATTR, String(index));

  if (current !== String(index)) {
    const status = query(panel, '#' + STATUS_ID);
    if (status) {
      status.textContent = 'Contrôle ' + (index + 1) + ' sur ' + controls.length
        + ' : ' + labelOf(controls[index]) + '.';
    }
    const raw = parseInt(getAttr(panel, 'data-v2-e039-visits') || '0', 10);
    const visits = (isNaN(raw) ? 0 : raw) + 1;
    setAttr(panel, 'data-v2-e039-visits', String(visits));
    const metrics = query(panel, '#' + METRICS_ID);
    if (metrics) {
      metrics.textContent = 'Contrôles parcourus : ' + visits + ' · circuit de '
        + controls.length + ' commande' + (controls.length > 1 ? 's' : '') + '.';
    }
  }
}

/* E039-V2-04 : effacement purement visuel à la sortie de la zone de filtres ;
 * aucune annonce n'est émise, pour éviter le bavardage. */
function clearFocus(panel) {
  nodes(panel, '.points-v2-e039-step').forEach((step) => setStepCurrent(step, false));
  removeAttr(panel, CURRENT_ATTR);
}

/* E039-V2-04 : écouteurs LOCAUX, un seul jeu par conteneur de filtres. Le
 * drapeau vit sur le nœud courant : un re-render recrée .points-filters et
 * donc un jeu neuf, sans écouteur global ni fuite. */
function bind(filters, layout, controls) {
  if (getAttr(filters, 'data-v2-e039-bound') === '1') return;
  setAttr(filters, 'data-v2-e039-bound', '1');

  const onFocusIn = (event) => {
    const target = isDomNode(event.target) ? event.target : null;
    if (!target) return;
    const index = controls.indexOf(target);
    if (index === -1) return;
    const panel = query(layout, '#' + PANEL_ID);
    if (panel) reflectFocus(panel, controls, index);
  };
  const onFocusOut = (event) => {
    const next = isDomNode(event.relatedTarget) ? event.relatedTarget : null;
    if (next && filters.contains(next)) return;
    const panel = query(layout, '#' + PANEL_ID);
    if (panel) clearFocus(panel);
  };

  filters.addEventListener('focusin', onFocusIn);
  filters.addEventListener('focusout', onFocusOut);
}

/* E039-V2-01 / E039-V2-07 / E039-V2-09 / E039-V2-10 : point d'entrée unique,
 * gardes structurelles, feuille unique, portée unique, repli silencieux sur
 * structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const filters = query(layout, '.points-filters');
  if (!isElement(filters)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else removeAttr(layout, REDUCED_ATTR);

  const controls = focusablesOf(filters);
  if (!controls.length) return;

  const sig = signatureOf(controls);

  /* E039-V2-10 : on conserve le panneau déjà monté dans les filtres courants,
   * on retire les doublons d'un rendu antérieur, puis on garantit l'unicité de
   * chaque id interne. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (layout.contains(candidate) && candidate.parentElement === filters) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });
  enforceUnique(TITLE_ID, panel ? query(panel, '#' + TITLE_ID) : null);
  enforceUnique(LIST_ID, panel ? query(panel, '#' + LIST_ID) : null);
  enforceUnique(STATUS_ID, panel ? query(panel, '#' + STATUS_ID) : null);
  enforceUnique(METRICS_ID, panel ? query(panel, '#' + METRICS_ID) : null);

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    filters.appendChild(panel);
  }

  if (getAttr(panel, 'data-v2-e039-signature') !== sig) {
    setAttr(panel, 'data-v2-e039-signature', sig);
    setAttr(panel, CURRENT_ATTR, '');
    removeAttr(panel, 'data-v2-e039-visits');
    fillPanel(ctx, panel, controls);
  }

  setAttr(panel, 'data-v2-e039', '1');
  setAttr(panel, 'data-v2-e039-total', String(controls.length));
  bind(filters, layout, controls);
}

register('E039', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
