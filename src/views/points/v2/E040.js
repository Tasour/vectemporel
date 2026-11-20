import { register } from './registry.js';

/* Lentille V2 E040 — Laboratoire d'ordre de lecture et de cible de focus.
 *
 * Seconde passe sur le domaine D (navigation & clavier) de la vue Points. La
 * passe 1 (`src/views/points/E040.js`) place le focus sur le titre du détail
 * après une navigation réelle. Cette V2 n'y touche pas : elle ajoute un
 * laboratoire autonome, entièrement dérivé du DOM réellement rendu par
 * `points.js`, qui rend l'ordre de lecture du détail mesurable et explorable.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E040.md — chantiers E040-01 à E040-10.
 * Fichier possédé : src/views/points/v2/E040.js uniquement. Lectures seules :
 * la passe 1, `points.js` et `v2/registry.js`. Aucun fichier partagé édité.
 *
 * Contrat exploité : viewId ('pointsv2', repli 'points'), stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion(). Aucune dépendance vers
 * le store, les filtres, le routeur clavier ou une autre lentille. Aucune
 * donnée historique inventée : blocs, libellés, compteurs et position du titre
 * sont recalculés depuis `.points-detail` à chaque lecture.
 *
 * Invariants :
 * - un seul register, une seule feuille ctx.css('points-v2-e040', …) ;
 * - TOUS les sélecteurs CSS préfixés par `.points-v2-e040` ;
 * - tous les identifiants préfixés `points-v2-e040-`, avec garde anti-doublon ;
 * - tout DOM statique créé par ctx.el, jamais innerHTML ;
 * - zéro réseau, zéro aléa, zéro console, zéro timer, zéro rAF, zéro écouteur
 *   global : seulement des écouteurs locaux, indexés et retirables ;
 * - non destructif : les attributs existants sont complétés, jamais écrasés ;
 *   aucun focus n'est déplacé au rendu initial, seulement sur activation locale.
 */

const PFX = 'points-v2-e040';
const CSS_ID = 'points-v2-e040';
const SCOPE = 'points-v2-e040';
const FOCUSABLE = 'button, select, a[href], input, textarea, [tabindex="0"]';

const ID = {
  panel: `${PFX}-panel`,
  title: `${PFX}-title`,
  lead: `${PFX}-lead`,
  metrics: `${PFX}-metrics`,
  mBlocks: `${PFX}-metric-blocks`,
  mFocus: `${PFX}-metric-focus`,
  mPos: `${PFX}-metric-pos`,
  mDesc: `${PFX}-metric-desc`,
  modeGroup: `${PFX}-mode-group`,
  modeSemantic: `${PFX}-mode-semantic`,
  modeFocusable: `${PFX}-mode-focusable`,
  modeTarget: `${PFX}-mode-target`,
  steps: `${PFX}-steps`,
  progress: `${PFX}-progress`,
  thumb: `${PFX}-thumb`,
  prev: `${PFX}-prev`,
  next: `${PFX}-next`,
  start: `${PFX}-start`,
  end: `${PFX}-end`,
  readout: `${PFX}-readout`,
  motion: `${PFX}-motion`,
  challenge: `${PFX}-challenge`,
  prediction: `${PFX}-prediction`,
  verify: `${PFX}-verify`,
  verdict: `${PFX}-verdict`,
  hint: `${PFX}-hint`,
};

/* E040-V2-10 — état par rendu, indexé par le nœud de layout (jamais une
 * variable module périmée) : un rendu neuf produit un état neuf, sans fuite
 * d'écouteurs. */
const stateByLayout = new WeakMap();

/* E040-V2-02 — feuille unique, intégralement préfixée par `.points-v2-e040`.
 * Aucun sélecteur nu, aucun identifiant nu : la portée est le laboratoire lui-
 * même, posé en fin de `.points-layout`, jamais la page ni la vue entière. */
const CSS = `
.points-v2-e040 { margin: 14px 0 2px; padding: 0; font: inherit; font-size: 11px; line-height: 1.55; color: var(--ink-soft, #d8d8d8); overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.points-v2-e040-panel { margin: 0; padding: 12px; border: 1px solid var(--line, #5b5b5b); border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px; background: rgba(8,11,16,.45); }
.points-v2-e040-h2 { margin: 0 0 6px; color: var(--gold-bright, #e9c98f); font-family: var(--serif, serif); font-size: 13px; font-weight: 700; }
.points-v2-e040-lead { margin: 0 0 10px; color: var(--muted, #9a9a9a); font-size: 11px; }
.points-v2-e040-metrics { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; padding: 8px; border: 1px solid var(--line, #5b5b5b); border-radius: 8px; }
.points-v2-e040-metric { display: inline-flex; flex-direction: column; min-width: 128px; gap: 2px; padding: 4px 6px; }
.points-v2-e040-metric dt { color: var(--muted-2, #9a9a9a); font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
.points-v2-e040-metric dd { margin: 0; color: var(--ink-soft, #d8d8d8); font-size: 12px; }
.points-v2-e040-fieldset { margin: 0 0 10px; padding: 8px; border: 1px solid var(--line, #5b5b5b); border-radius: 8px; }
.points-v2-e040-fieldset legend { padding: 0 4px; color: var(--gold-bright, #e9c98f); font-size: 10px; font-weight: 600; }
.points-v2-e040-choices { display: flex; flex-wrap: wrap; gap: 6px; }
.points-v2-e040-choice { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 1px solid var(--line, #5b5b5b); border-radius: 7px; color: var(--muted, #9a9a9a); font-size: 11px; cursor: pointer; }
.points-v2-e040-choice input { width: 16px; height: 16px; accent-color: var(--gold, #e6b96f); }
.points-v2-e040-choice:focus-within { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px; }
.points-v2-e040-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.points-v2-e040-btn { min-height: 36px; min-width: 36px; padding: 6px 10px; border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px; background: rgba(230,185,111,.07); color: var(--ink-soft, #d8d8d8); font: inherit; font-size: 11px; cursor: pointer; }
.points-v2-e040-btn:hover:not(:disabled) { border-color: var(--gold, #e6b96f); color: var(--gold-bright, #e9c98f); }
.points-v2-e040-btn:disabled { opacity: .5; cursor: not-allowed; }
.points-v2-e040-progress { position: relative; height: 8px; margin: 0 0 8px; border: 1px solid var(--line-strong, #5b5b5b); border-radius: 6px; background: rgba(255,255,255,.03); overflow: hidden; }
.points-v2-e040-thumb { display: block; height: 100%; width: 0; background: var(--gold, #e6b96f); }
.points-v2-e040-steps { margin: 0 0 8px; padding: 6px 8px 6px 26px; border: 1px solid var(--line, #5b5b5b); border-radius: 8px; }
.points-v2-e040-step { margin: 2px 0; color: var(--muted, #9a9a9a); }
.points-v2-e040-step[aria-current="step"] { color: var(--gold-bright, #e9c98f); font-weight: 600; }
.points-v2-e040-readout { margin: 0 0 8px; padding: 7px 8px; border-left: 2px solid var(--gold, #e6b96f); background: rgba(230,185,111,.06); color: var(--ink-soft, #d8d8d8); font-size: 11px; }
.points-v2-e040-motion { margin: 0 0 8px; color: var(--muted, #9a9a9a); font-size: 10px; }
.points-v2-e040-challenge { margin-top: 10px; border-top: 1px solid var(--line, #5b5b5b); padding-top: 8px; }
.points-v2-e040-challenge summary { min-height: 36px; display: flex; align-items: center; color: var(--gold-bright, #e9c98f); font-size: 11px; cursor: pointer; }
.points-v2-e040-challenge ol { margin: 8px 0; padding-left: 20px; color: var(--muted, #9a9a9a); font-size: 10px; line-height: 1.6; }
.points-v2-e040-challenge label { display: block; margin: 6px 0; color: var(--ink-soft, #d8d8d8); font-size: 10px; }
.points-v2-e040-challenge select { min-height: 36px; max-width: 100%; padding: 4px 6px; border: 1px solid var(--line, #5b5b5b); border-radius: 7px; background: transparent; color: var(--ink, #e8e8e8); font: inherit; font-size: 11px; }
.points-v2-e040-verdict { margin: 8px 0 0; color: var(--ink-soft, #d8d8d8); font-size: 10px; }
.points-v2-e040-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.points-v2-e040-btn:focus-visible,
.points-v2-e040-challenge select:focus-visible,
.points-v2-e040-challenge summary:focus-visible,
.points-v2-e040-steps:focus-visible { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px; }
@media (max-width: 620px) {
  .points-v2-e040-btn { min-height: 44px; }
  .points-v2-e040-metric { flex-basis: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e040, .points-v2-e040 * { transition: none !important; animation: none !important; }
}
@media (forced-colors: active) {
  .points-v2-e040-panel { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
  .points-v2-e040-btn:disabled { opacity: 1; }
}
`;

function set(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

/* E040-V2-03 — libellé dérivé de la classe réelle du bloc, jamais codé en dur
 * comme donnée historique : il décrit la structure rendue, pas un contenu. */
function labelFor(node) {
  const cls = typeof node.className === 'string' ? node.className : '';
  if (cls.indexOf('view-kicker') >= 0) return 'Compteur du périmètre';
  if (cls.indexOf('points-point-title') >= 0) return 'Titre du point';
  if (cls.indexOf('points-point-text') >= 0) return 'Texte du point';
  if (cls.indexOf('points-meta') >= 0) return 'Métadonnées';
  if (cls.indexOf('points-families') >= 0) return 'Familles';
  if (cls.indexOf('points-sources') >= 0) return 'Sources';
  if (cls.indexOf('points-justification') >= 0) return 'Justification';
  if (cls.indexOf('points-nav') >= 0) return 'Navigation';
  if (cls.indexOf('points-e040-order') >= 0) return 'Consigne de lecture (passe 1)';
  if (cls.indexOf('points-e040-live') >= 0) return 'Région live (passe 1)';
  if (cls.indexOf('points-e040-metrics') >= 0) return 'Compteurs (passe 1)';
  const tag = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : 'bloc';
  return cls ? `${tag}.${cls.split(/\s+/)[0]}` : tag;
}

/* E040-V2-03/04 — relevé de l'ordre de lecture réel : un bloc par enfant
 * direct de `.points-detail`, avec ses contrôles focalisables, son rôle de
 * cible programmatique (posé par la passe 1) et ses liens ARIA. */
function readOrder(detail) {
  const blocks = [];
  if (!detail || typeof detail.children === 'undefined') return blocks;
  Array.prototype.slice.call(detail.children).forEach((node) => {
    const inner = node.querySelectorAll ? Array.prototype.slice.call(node.querySelectorAll(FOCUSABLE)) : [];
    const own = node.matches && node.matches(FOCUSABLE) ? 1 : 0;
    const desc = node.getAttribute ? String(node.getAttribute('aria-describedby') || '') : '';
    const isTarget = Boolean(
      node.getAttribute && (
        node.getAttribute('data-points-e040-target') === '1' ||
        node.id === 'points-e040-title'
      )
    );
    blocks.push({
      node,
      label: labelFor(node),
      focusables: inner.length + own,
      isTarget,
      described: desc ? desc.split(/\s+/).filter(Boolean).length : 0,
      named: Boolean(node.hasAttribute && node.hasAttribute('aria-labelledby')),
    });
  });
  return blocks;
}

function targetIndex(blocks) {
  let found = -1;
  blocks.forEach((block, index) => { if (found < 0 && block.isTarget) found = index; });
  if (found < 0) {
    blocks.forEach((block, index) => { if (found < 0 && block.label === 'Titre du point') found = index; });
  }
  return found;
}

/* E040-V2-05 — modes de lecture : choix unique, donc radiogroupe natif et non
 * aria-pressed (réservé aux bascules indépendantes). */
function stepsFor(refs, blocks) {
  if (refs.mode === 'focusable') return blocks.filter((block) => block.focusables > 0);
  if (refs.mode === 'target') {
    const index = targetIndex(blocks);
    return index >= 0 ? [blocks[index]] : [];
  }
  return blocks.slice();
}

function modeLabel(mode) {
  if (mode === 'focusable') return 'contrôles focalisables';
  if (mode === 'target') return 'cible de focus';
  return 'blocs sémantiques';
}

function stepText(refs, block, index, total) {
  if (!block) return 'Aucune étape à explorer dans ce périmètre.';
  const role = block.isTarget ? ' · cible de focus de la passe 1' : '';
  return `Étape ${index + 1}/${total} — ${block.label} · ${block.focusables} contrôle(s) focalisable(s)${role}. Vue : ${modeLabel(refs.mode)}.`;
}

/* E040-V2-10 — réutilise un nœud par identifiant, répare un mauvais parent et
 * purge les nœuds orphelins d'un rendu précédent : garde anti-doublon. */
function purgeStale(layout) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  Array.prototype.slice.call(document.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => {
    const owner = typeof node.closest === 'function' ? node.closest('.points-layout') : null;
    if (owner && owner !== layout) node.remove();
  });
}

function ensureNode(ctx, id, tag, className, parent) {
  let node = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

/* Écouteurs strictement locaux, enregistrés dans l'état pour être retirés lors
 * d'un re-rendu. Aucun écouteur sur document, window ou le routeur. */
function onLocal(node, type, fn, refs, flag) {
  if (!node || typeof node.addEventListener !== 'function') return;
  if (flag && refs[flag]) return;
  node.addEventListener(type, fn);
  if (flag) refs[flag] = true;
  refs.listeners.push({ node, type, fn });
}

function appendDescribedBy(node, ids) {
  const current = String(node.getAttribute('aria-describedby') || '').trim();
  const list = current ? current.split(/\s+/).filter(Boolean) : [];
  ids.forEach((id) => { if (list.indexOf(id) < 0) list.push(id); });
  set(node, 'aria-describedby', list.join(' '));
}

function teardown(layout) {
  const refs = stateByLayout.get(layout);
  if (refs) {
    refs.listeners.forEach(({ node, type, fn }) => {
      try { node.removeEventListener(type, fn); } catch { /* nœud déjà détaché */ }
    });
    stateByLayout.delete(layout);
  }
  if (layout && typeof layout.querySelectorAll === 'function') {
    Array.prototype.slice.call(layout.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => node.remove());
  }
}

/* E040-V2-04/06 — unique point de déplacement de focus du laboratoire : un
 * bloc reçoit tabindex=-1 (complété, jamais écrasé) puis le focus, avec
 * preventScroll et repli. Aucun focus au rendu initial : l'appel est toujours
 * consécutif à une activation locale (bouton, clavier, défi). */
function focusStep(refs, index) {
  const steps = stepsFor(refs, refs.order);
  if (!steps.length) return;
  refs.index = clamp(index, 0, steps.length - 1);
  const block = steps[refs.index];
  const node = block.node;
  if (!node || !node.isConnected) return;
  if (!node.hasAttribute('tabindex')) set(node, 'tabindex', '-1');
  set(node, 'data-points-v2-e040-step', String(refs.index + 1));
  try { node.focus({ preventScroll: true }); }
  catch { node.focus(); }
  refs.readoutSignature = '';
  apply(refs);
}

/* E040-V2-04 — grandeurs signées : le statut et la liste ne sont réécrits que
 * quand leur signature change, ce qui évite le bavardage de la région live.
 * Trois redondances non colorées : liste numérotée, texte du statut, ARIA. */
function apply(refs) {
  const blocks = refs.order;
  const steps = stepsFor(refs, blocks);
  const pos = targetIndex(blocks);
  const totalFocus = blocks.reduce((sum, block) => sum + block.focusables, 0);
  const described = pos >= 0 ? blocks[pos].described : 0;

  const geoSignature = [blocks.length, totalFocus, pos, described].join(':');
  if (geoSignature !== refs.geoSignature) {
    refs.geoSignature = geoSignature;
    setText(refs.mBlocks, String(blocks.length));
    setText(refs.mFocus, `${totalFocus} (dont 1 cible)`);
    setText(refs.mPos, pos >= 0 ? `${pos + 1} / ${blocks.length}` : 'aucune');
    setText(refs.mDesc, String(described));
  }

  refs.index = steps.length ? clamp(refs.index, 0, steps.length - 1) : -1;
  const listSignature = [refs.mode, steps.map((block) => block.label).join('|'), refs.index].join(':');
  if (listSignature !== refs.listSignature) {
    refs.listSignature = listSignature;
    refs.steps.replaceChildren();
    steps.forEach((block, index) => {
      const item = ctxEl(refs.ctx, 'li', 'points-v2-e040-step',
        `${index === refs.index ? '▶ ' : '· '}${index + 1}. ${block.label} — ${block.focusables} contrôle(s)`);
      if (index === refs.index) set(item, 'aria-current', 'step');
      refs.steps.appendChild(item);
    });
    if (!steps.length) {
      refs.steps.appendChild(ctxEl(refs.ctx, 'li', 'points-v2-e040-step', 'Aucune étape à explorer.'));
    }
  }

  const block = refs.index >= 0 ? steps[refs.index] : null;
  const text = stepText(refs, block, refs.index, steps.length);
  const readoutSignature = `${text}`;
  if (readoutSignature !== refs.readoutSignature) {
    refs.readoutSignature = readoutSignature;
    setText(refs.readout, text);
    set(refs.progress, 'aria-valuetext', text);
  }

  const atStart = refs.index <= 0;
  const atEnd = refs.index < 0 || refs.index >= steps.length - 1;
  refs.prev.disabled = atStart;
  refs.start.disabled = atStart;
  refs.next.disabled = atEnd;
  refs.end.disabled = atEnd;

  const percent = steps.length <= 1 ? 100 : Math.round((Math.max(0, refs.index) / (steps.length - 1)) * 100);
  if (percent !== refs.percent) {
    refs.percent = percent;
    refs.thumb.style.width = `${percent}%`;
    set(refs.progress, 'aria-valuenow', String(percent));
  }
  set(refs.progress, 'aria-valuemin', '0');
  set(refs.progress, 'aria-valuemax', '100');
  set(refs.panel, 'data-points-v2-e040-mode', refs.mode);
  set(refs.panel, 'data-points-v2-e040-target', pos >= 0 ? String(pos + 1) : '0');
  set(refs.detail, 'data-points-v2-e040-read', steps.length ? String(refs.index + 1) : '0');
}

function ctxEl(ctx, tag, className, text) {
  return ctx.el(tag, className, text);
}

function makeMetric(ctx, parent, id, term) {
  const wrap = ctx.el('div', 'points-v2-e040-metric');
  wrap.appendChild(ctx.el('dt', '', term));
  const dd = ctx.el('dd', '', '—');
  dd.id = id;
  wrap.appendChild(dd);
  parent.appendChild(wrap);
  return dd;
}

function makeButton(ctx, refs, id, label, ariaLabel, deltaOf) {
  const button = ensureNode(ctx, id, 'button', 'points-v2-e040-btn', refs.buttons);
  setText(button, label);
  button.type = 'button';
  set(button, 'aria-label', ariaLabel);
  onLocal(button, 'click', () => focusStep(refs, refs.index + deltaOf()), refs, null);
  return button;
}

/* E040-V2-01/03/05/06/08/09 — construction du laboratoire, tout par ctx.el. */
function buildPanel(ctx, refs) {
  const el = ctx.el;
  const panel = ensureNode(ctx, ID.panel, 'section', `${SCOPE} points-v2-e040-panel`, refs.layout);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ensureNode(ctx, ID.title, 'h2', 'points-v2-e040-h2', panel);
  setText(title, 'Laboratoire d’ordre de lecture et de cible de focus');
  panel.setAttribute('aria-labelledby', title.id);

  const lead = ensureNode(ctx, ID.lead, 'p', 'points-v2-e040-lead', panel);
  setText(lead, 'Ordre de lecture, contrôles focalisables et cible programmatique sont relevés sur le détail réellement affiché. Le navigateur d’étapes déplace le focus uniquement après une activation locale ; aucune navigation du routeur n’est interceptée.');

  /* E040-V2-03 — quatre grandeurs chiffrées, dont deux comparées à une
   * référence : 1 cible pour N contrôles, position du titre sur N blocs. */
  const metrics = ensureNode(ctx, ID.metrics, 'dl', 'points-v2-e040-metrics', panel);
  metrics.replaceChildren();
  refs.mBlocks = makeMetric(ctx, metrics, ID.mBlocks, 'Blocs de lecture');
  refs.mFocus = makeMetric(ctx, metrics, ID.mFocus, 'Contrôles focalisables');
  refs.mPos = makeMetric(ctx, metrics, ID.mPos, 'Position du titre');
  refs.mDesc = makeMetric(ctx, metrics, ID.mDesc, 'Liens aria-describedby');

  /* E040-V2-05 — radiogroupe natif pour le mode de lecture. */
  const fieldset = ensureNode(ctx, ID.modeGroup, 'fieldset', 'points-v2-e040-fieldset', panel);
  fieldset.replaceChildren();
  fieldset.appendChild(el('legend', '', 'Portée du navigateur d’étapes'));
  const choices = el('div', 'points-v2-e040-choices');
  const modes = [
    [ID.modeSemantic, 'semantic', 'Blocs sémantiques'],
    [ID.modeFocusable, 'focusable', 'Contrôles focalisables'],
    [ID.modeTarget, 'target', 'Cible de focus'],
  ];
  modes.forEach(([id, value, label]) => {
    const labelNode = el('label', 'points-v2-e040-choice');
    const input = el('input', '');
    input.type = 'radio';
    input.name = `${PFX}-mode`;
    input.value = value;
    input.id = id;
    input.checked = value === refs.mode;
    labelNode.append(input, el('span', '', label));
    onLocal(input, 'change', () => {
      refs.mode = value;
      refs.listSignature = '';
      refs.readoutSignature = '';
      apply(refs);
    }, refs, null);
    choices.appendChild(labelNode);
  });
  fieldset.appendChild(choices);

  /* E040-V2-06 — commandes pas à pas et sauts aux extrémités, bornées. */
  refs.buttons = ensureNode(ctx, ID.buttons, 'div', 'points-v2-e040-buttons', panel);
  refs.buttons.replaceChildren();
  refs.prev = makeButton(ctx, refs, ID.prev, '← Étape précédente',
    'Passer à l’étape de lecture précédente', () => -1);
  refs.next = makeButton(ctx, refs, ID.next, 'Étape suivante →',
    'Passer à l’étape de lecture suivante', () => 1);
  refs.start = makeButton(ctx, refs, ID.start, 'Début',
    'Aller à la première étape de lecture', () => -Infinity);
  refs.end = makeButton(ctx, refs, ID.end, 'Fin',
    'Aller à la dernière étape de lecture', () => Infinity);

  /* E040-V2-04 — liste numérotée et statut : la lecture est redondée (texte,
   * aria-current, aria-valuetext) sans reposer sur la seule couleur. */
  refs.progress = ensureNode(ctx, ID.progress, 'div', 'points-v2-e040-progress', panel);
  refs.progress.setAttribute('role', 'progressbar');
  refs.progress.setAttribute('aria-label', 'Progression dans l’ordre de lecture du détail');
  refs.thumb = ensureNode(ctx, ID.thumb, 'span', 'points-v2-e040-thumb', refs.progress);
  refs.steps = ensureNode(ctx, ID.steps, 'ol', 'points-v2-e040-steps', panel);
  if (!refs.steps.hasAttribute('tabindex')) set(refs.steps, 'tabindex', '0');
  refs.readout = ensureNode(ctx, ID.readout, 'p', 'points-v2-e040-readout', panel);
  refs.readout.setAttribute('role', 'status');
  refs.readout.setAttribute('aria-live', 'polite');
  refs.readout.setAttribute('aria-atomic', 'true');

  /* E040-V2-09 — mouvement réduit lu une fois, affiché et porté par l'attribut ;
   * la lentille n'anime jamais le déplacement de focus. */
  refs.motion = ensureNode(ctx, ID.motion, 'p', 'points-v2-e040-motion', panel);
  setText(refs.motion, refs.reduced
    ? 'Mouvement réduit actif : déplacement de focus instantané, sans animation propre à la lentille.'
    : 'Déplacement de focus instantané, sans animation déclenchée par la lentille.');

  /* E040-V2-08 — défi falsifiable en cinq temps, en texte sémantique visible. */
  const challenge = ensureNode(ctx, ID.challenge, 'details', 'points-v2-e040-challenge', panel);
  challenge.replaceChildren();
  challenge.appendChild(el('summary', '', 'Défi : prédire la cible de focus du détail'));
  const steps = el('ol', '');
  [
    'Prédiction : désignez le bloc qui, d’après vous, recevra le focus après une navigation.',
    'Réglage : parcourez les étapes et observez la cible portée par la passe 1.',
    'Résultat attendu : votre choix doit coïncider avec le bloc marqué comme cible dans le détail.',
    'Falsification : le verdict compare votre prédiction à la cible réellement relevée dans le DOM ; un écart la réfute.',
    'Débrief : relisez la position du titre et les liens aria-describedby pour expliquer l’écart.',
  ].forEach((text) => steps.appendChild(el('li', '', text)));
  challenge.appendChild(steps);
  const label = el('label', '', 'Votre prédiction (bloc du détail)');
  label.htmlFor = ID.prediction;
  challenge.appendChild(label);
  refs.prediction = el('select', '');
  refs.prediction.id = ID.prediction;
  refs.order.forEach((block, index) => {
    const option = el('option', '', `${index + 1}. ${block.label}`);
    option.value = String(index + 1);
    refs.prediction.appendChild(option);
  });
  if (!refs.order.length) {
    const option = el('option', '', 'Aucun bloc');
    option.value = '0';
    refs.prediction.appendChild(option);
  }
  challenge.appendChild(refs.prediction);
  refs.verify = el('button', 'points-v2-e040-btn', 'Vérifier ma prédiction');
  refs.verify.type = 'button';
  refs.verify.id = ID.verify;
  refs.verdict = el('p', 'points-v2-e040-verdict', 'Verdict : en attente d’une prédiction.');
  refs.verdict.id = ID.verdict;
  refs.verdict.setAttribute('role', 'status');
  refs.verdict.setAttribute('aria-live', 'polite');
  onLocal(refs.verify, 'click', () => {
    const predicted = Number(refs.prediction.value);
    const pos = targetIndex(refs.order);
    if (pos < 0) {
      setText(refs.verdict, 'Prédiction réfutée : aucun bloc ne porte de cible de focus dans ce détail.');
      return;
    }
    if (predicted === pos + 1) {
      setText(refs.verdict, `Prédiction confirmée : le bloc ${pos + 1} (${refs.order[pos].label}) est bien la cible relevée à la position ${pos + 1}/${refs.order.length}.`);
    } else {
      setText(refs.verdict, `Prédiction réfutée : vous annonciez le bloc ${predicted || '—'} ; la cible relevée est le bloc ${pos + 1} (${refs.order[pos].label}) sur ${refs.order.length}.`);
    }
  }, refs, null);
  challenge.append(refs.verify, refs.verdict);

  /* E040-V2-07 — aide masquée, reliée par aria-describedby complété (jamais
   * écrasé) au navigateur d'étapes. */
  refs.hint = ensureNode(ctx, ID.hint, 'p', 'points-v2-e040-sr', panel);
  setText(refs.hint, 'Navigateur d’étapes : la liste est focusable. Flèche gauche et flèche droite parcourent les étapes, Début et Fin atteignent les extrémités. Le statut annonce le bloc courant, son nombre de contrôles et la cible de focus de la passe 1.');
  appendDescribedBy(refs.steps, [ID.hint]);

  /* Insertion additive : le laboratoire suit le détail, avant toute lentille
   * ajoutée plus tard en fin de layout. */
  const detail = refs.detail;
  if (detail.nextElementSibling !== panel) refs.layout.insertBefore(panel, detail.nextElementSibling);
}

function install(ctx) {
  /* E040-V2-01 — viewId exploité : la V2 n'agit que sur la famille Points. */
  if (!ctx || (ctx.viewId !== 'pointsv2' && ctx.viewId !== 'points')) return;
  const stage = ctx.stage;
  const layout = ctx.layout || (stage && typeof stage.querySelector === 'function'
    ? stage.querySelector('.points-layout') : null);
  if (!stage || !layout || typeof layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;

  const detail = layout.querySelector('.points-detail');
  if (!detail || typeof detail.children === 'undefined') return;

  /* E040-V2-02/10 — une seule feuille, puis nettoyage et état neuf par layout. */
  ctx.css(CSS_ID, CSS);
  purgeStale(layout);
  teardown(layout);
  layout.classList.add(SCOPE);
  set(detail, 'data-points-v2-e040', '1');

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const refs = {
    ctx, stage, layout, detail, reduced,
    order: readOrder(detail),
    mode: 'semantic', index: 0, listeners: [], percent: -1,
    geoSignature: '', listSignature: '', readoutSignature: '',
  };
  buildPanel(ctx, refs);
  stateByLayout.set(layout, refs);

  /* E040-V2-07 — clavier strictement local : le garde `event.target === steps`
   * laisse les flèches aux cellules, au détail et aux boutons du routeur.
   * Aucune touche réservée n'est interceptée, aucun écouteur global. */
  onLocal(refs.steps, 'keydown', (event) => {
    if (event.target !== refs.steps) return;
    if (event.key === 'ArrowRight') { focusStep(refs, refs.index + 1); event.preventDefault(); }
    else if (event.key === 'ArrowLeft') { focusStep(refs, refs.index - 1); event.preventDefault(); }
    else if (event.key === 'Home') { focusStep(refs, 0); event.preventDefault(); }
    else if (event.key === 'End') { focusStep(refs, Infinity); event.preventDefault(); }
  }, refs, 'boundKeys');

  apply(refs);
}

/* E040-V2-01 — enregistrement unique, repli silencieux : une lentille
 * défaillante ne doit jamais interrompre le rendu de la vue. */
register('E040', (ctx) => {
  try {
    install(ctx);
  } catch {
    return;
  }
});
