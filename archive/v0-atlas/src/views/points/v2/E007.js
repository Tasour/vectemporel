import { register } from './registry.js';

/* Lentille V2 E007 — Laboratoire de lecture matricielle et d'indice quintile.
 *
 * Seconde passe sur le domaine A (matrice & grille). La passe 1 fournit le
 * défilement borné de base ; cette V2 ajoute un laboratoire autonome, entièrement
 * dérivé du DOM réellement rendu par points.js : géométrie mesurée, indice à
 * cinq crans, choix du pas par radiogroupe natif, commandes bornées, équivalent
 * clavier local, défi falsifiable en cinq temps, prise en compte explicite du
 * mouvement réduit, et garde anti-doublon.
 *
 * Contrat exploité : viewId ('pointsv2', repli 'points'), stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion(). Aucune dépendance vers
 * le store, les filtres, le détail ou une autre lentille. Aucune valeur n'est
 * inventée : domaines, largeurs, pas, pourcentage et crans sont recalculés
 * depuis .points-grid / .points-grid-row.is-head à chaque lecture.
 *
 * Invariants :
 * - une seule feuille CSS, injectée par ctx.css('points-v2-e007', …) ;
 * - TOUTES les règles CSS préfixées par `.points-v2-e007` ;
 * - tous les identifiants préfixés `points-v2-e007-` avec garde anti-doublon ;
 * - tout DOM statique créé par ctx.el, jamais innerHTML ;
 * - zéro réseau, zéro aléa, zéro console, zéro timer, zéro rAF, zéro écouteur
 *   global : seulement des écouteurs locaux, indexés et retirables ;
 * - greffon non destructif : les attributs existants sont complétés, jamais
 *   écrasés ; un second passage sur le même DOM ne duplique rien.
 */

const PFX = 'points-v2-e007';
const CSS_ID = 'points-v2-e007';
const SCOPE = 'points-v2-e007';

const ID = {
  panel: `${PFX}-panel`,
  title: `${PFX}-title`,
  lead: `${PFX}-lead`,
  metrics: `${PFX}-metrics`,
  mView: `${PFX}-metric-view`,
  mTotal: `${PFX}-metric-total`,
  mMax: `${PFX}-metric-max`,
  mCount: `${PFX}-metric-count`,
  mStep: `${PFX}-metric-step`,
  modeGroup: `${PFX}-mode-group`,
  modeColumn: `${PFX}-mode-column`,
  modeHalf: `${PFX}-mode-half`,
  modePage: `${PFX}-mode-page`,
  buttons: `${PFX}-buttons`,
  prev: `${PFX}-prev`,
  next: `${PFX}-next`,
  start: `${PFX}-start`,
  end: `${PFX}-end`,
  readout: `${PFX}-readout`,
  progress: `${PFX}-progress`,
  thumb: `${PFX}-thumb`,
  hint: `${PFX}-hint`,
  challenge: `${PFX}-challenge`,
  prediction: `${PFX}-prediction`,
  verify: `${PFX}-verify`,
  verdict: `${PFX}-verdict`,
  motion: `${PFX}-motion`,
  reset: `${PFX}-reset`,
};

/* État par rendu, indexé par le nœud de layout (jamais une variable module
 * périmée) : un rendu neuf produit un état neuf, sans fuite d'écouteurs. */
const stateByLayout = new WeakMap();

/* E007-V2-02 — feuille unique, intégralement préfixée par `.points-v2-e007`.
 * Aucun sélecteur nu, aucun identifiant nu : la portée est le laboratoire lui-
 * même plus la classe posée sur la grille, jamais la page ni la vue entière. */
const CSS = `
.points-v2-e007 { margin: 12px 0 4px; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(255,255,255,.02); color: var(--ink); }
.points-v2-e007 .points-v2-e007-h2 { margin: 0 0 6px; color: var(--gold-bright); font-size: 13px; font-weight: 700; }
.points-v2-e007 .points-v2-e007-lead { margin: 0 0 10px; color: var(--muted); font-size: 11px; line-height: 1.55; }
.points-v2-e007 .points-v2-e007-metrics { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; padding: 8px; border: 1px solid var(--line); border-radius: 8px; }
.points-v2-e007 .points-v2-e007-metric { display: inline-flex; flex-direction: column; min-width: 104px; gap: 2px; padding: 4px 6px; }
.points-v2-e007 .points-v2-e007-metric dt { color: var(--muted-2); font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
.points-v2-e007 .points-v2-e007-metric dd { margin: 0; color: var(--ink-soft); font-size: 12px; font-variant-numeric: tabular-nums; }
.points-v2-e007 .points-v2-e007-fieldset { margin: 0 0 10px; padding: 8px; border: 1px solid var(--line); border-radius: 8px; }
.points-v2-e007 .points-v2-e007-fieldset legend { padding: 0 4px; color: var(--gold-bright); font-size: 10px; font-weight: 600; }
.points-v2-e007 .points-v2-e007-choices { display: flex; flex-wrap: wrap; gap: 6px; }
.points-v2-e007 .points-v2-e007-choice { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 1px solid var(--line); border-radius: 7px; color: var(--muted); font-size: 11px; cursor: pointer; }
.points-v2-e007 .points-v2-e007-choice input { width: 16px; height: 16px; accent-color: var(--gold); }
.points-v2-e007 .points-v2-e007-choice:focus-within { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
.points-v2-e007 .points-v2-e007-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.points-v2-e007 .points-v2-e007-btn { min-height: 36px; min-width: 36px; padding: 6px 10px; border: 1px solid var(--line-strong); border-radius: 8px; background: rgba(230,185,111,.07); color: var(--ink-soft); font: inherit; font-size: 11px; cursor: pointer; }
.points-v2-e007 .points-v2-e007-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold-bright); }
.points-v2-e007 .points-v2-e007-btn:disabled { opacity: .5; cursor: not-allowed; }
.points-v2-e007 .points-v2-e007-progress { position: relative; flex: 0 0 min(180px, 38vw); height: 8px; margin: 0 0 8px; border: 1px solid var(--line-strong); border-radius: 6px; background: rgba(255,255,255,.03); overflow: hidden; }
.points-v2-e007 .points-v2-e007-thumb { display: block; height: 100%; width: 0; background: var(--gold); }
.points-v2-e007 .points-v2-e007-readout { margin: 0 0 8px; padding: 7px 8px; border-left: 2px solid var(--gold); color: var(--ink-soft); font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums; background: rgba(230,185,111,.06); }
.points-v2-e007 .points-v2-e007-motion { margin: 0 0 8px; color: var(--muted); font-size: 10px; line-height: 1.5; }
.points-v2-e007 .points-v2-e007-challenge { margin-top: 10px; border-top: 1px solid var(--line); padding-top: 8px; }
.points-v2-e007 .points-v2-e007-challenge summary { min-height: 36px; display: flex; align-items: center; color: var(--gold-bright); font-size: 11px; cursor: pointer; }
.points-v2-e007 .points-v2-e007-challenge ol { margin: 8px 0; padding-left: 20px; color: var(--muted); font-size: 10px; line-height: 1.6; }
.points-v2-e007 .points-v2-e007-challenge label { display: block; margin: 6px 0; color: var(--ink-soft); font-size: 10px; }
.points-v2-e007 .points-v2-e007-challenge select { min-height: 36px; max-width: 100%; padding: 4px 6px; border: 1px solid var(--line); border-radius: 7px; background: transparent; color: var(--ink); font: inherit; font-size: 11px; }
.points-v2-e007 .points-v2-e007-verdict { margin: 8px 0 0; color: var(--ink-soft); font-size: 10px; line-height: 1.5; }
.points-v2-e007 .points-v2-e007-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.points-v2-e007-grid { scroll-snap-type: x proximity; }
.points-v2-e007-grid[data-motion="reduced"] { scroll-snap-type: none; }
.points-v2-e007 .points-v2-e007-btn:focus-visible,
.points-v2-e007 .points-v2-e007-challenge select:focus-visible,
.points-v2-e007 .points-v2-e007-challenge summary:focus-visible,
.points-v2-e007-grid:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
@media (max-width: 620px) {
  .points-v2-e007 .points-v2-e007-btn { min-height: 44px; }
  .points-v2-e007 .points-v2-e007-progress { flex-basis: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e007-grid { scroll-snap-type: none; }
}
@media (forced-colors: active) {
  .points-v2-e007 .points-v2-e007-thumb { background: Highlight; }
  .points-v2-e007 .points-v2-e007-btn:disabled { opacity: 1; }
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

/* E007-V2-03 — géométrie lue sur la matrice rendue, sans constante ni donnée
 * externe : fenêtre, largeur totale, course maximale, nombre de domaines, pas
 * d'une colonne, colonnes réellement visibles, pourcentage et cran quintile. */
function readGeometry(grid) {
  const head = grid && typeof grid.querySelector === 'function'
    ? grid.querySelector('.points-grid-row.is-head') : null;
  const columns = head ? Array.prototype.slice.call(head.children).slice(1) : [];
  const viewport = Math.max(0, grid ? (grid.clientWidth || 0) : 0);
  const total = Math.max(0, grid ? (grid.scrollWidth || 0) : 0);
  const maxScroll = Math.max(0, total - viewport);
  const left = clamp(grid ? (grid.scrollLeft || 0) : 0, 0, maxScroll);
  const right = left + viewport;
  let first = -1;
  let last = -1;
  columns.forEach((column, index) => {
    const cLeft = column.offsetLeft || 0;
    const cRight = cLeft + (column.offsetWidth || 0);
    if (cRight > left && cLeft < right) {
      if (first < 0) first = index;
      last = index;
    }
  });
  const stepColumn = columns.length ? Math.max(1, columns[0].offsetWidth || 0) : (viewport || 1);
  const percent = maxScroll > 0 ? Math.round((left / maxScroll) * 100) : 100;
  const bucket = maxScroll > 0 ? clamp(Math.floor(percent / 20) + 1, 1, 5) : 5;
  return {
    columns: columns.length, viewport, total, maxScroll, left, first, last,
    stepColumn, percent, bucket, overflow: maxScroll > 0,
  };
}

function stepFor(mode, geometry) {
  if (mode === 'half') return Math.max(1, Math.round(geometry.viewport / 2));
  if (mode === 'page') return Math.max(1, geometry.viewport);
  return geometry.stepColumn;
}

function modeLabel(mode) {
  if (mode === 'half') return 'demi-fenêtre';
  if (mode === 'page') return 'fenêtre entière';
  return 'colonne';
}

function readoutText(geometry, mode) {
  if (!geometry.overflow) {
    return `Lecture linéaire : ${geometry.columns} domaine${geometry.columns > 1 ? 's' : ''} tiennent dans la fenêtre (${geometry.viewport} px sur ${geometry.total} px) ; aucun défilement horizontal requis.`;
  }
  const first = geometry.first >= 0 ? geometry.first + 1 : 1;
  const last = geometry.last >= 0 ? geometry.last + 1 : Math.max(first, geometry.columns);
  return `Cran ${geometry.bucket}/5 — domaines ${first}–${last} sur ${geometry.columns} · ${geometry.percent} % du parcours (${geometry.left}/${geometry.maxScroll} px). Pas actuel : ${modeLabel(mode)}.`;
}

/* E007-V2-10 — réutilise un nœud par identifiant, répare un mauvais parent et
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

function appendDescribedBy(grid, ids) {
  const current = (grid.getAttribute('aria-describedby') || '').trim();
  const list = current ? current.split(/\s+/).filter(Boolean) : [];
  ids.forEach((id) => { if (list.indexOf(id) < 0) list.push(id); });
  set(grid, 'aria-describedby', list.join(' '));
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

/* E007-V2-04 — indice quintile et géométrie écrits sous signature : le statut
 * ne parle que quand la plage visible ou le cran change, la barre ne bouge
 * qu'au pourcentage près. Trois redondances non colorées (texte, ARIA, pouce). */
function apply(refs) {
  const geometry = readGeometry(refs.grid);
  refs.geometry = geometry;

  const geoSignature = [geometry.viewport, geometry.total, geometry.maxScroll, geometry.columns, geometry.stepColumn].join(':');
  if (geoSignature !== refs.geoSignature) {
    refs.geoSignature = geoSignature;
    setText(refs.mView, `${geometry.viewport} px`);
    setText(refs.mTotal, `${geometry.total} px`);
    setText(refs.mMax, `${geometry.maxScroll} px`);
    setText(refs.mCount, String(geometry.columns));
    setText(refs.mStep, `${geometry.stepColumn} px`);
  }

  const readoutSignature = geometry.overflow
    ? `${geometry.bucket}:${geometry.first}:${geometry.last}:${geometry.percent}:${refs.mode}`
    : `all:${geometry.columns}:${geometry.viewport}:${geometry.total}`;
  if (readoutSignature !== refs.readoutSignature) {
    refs.readoutSignature = readoutSignature;
    const text = readoutText(geometry, refs.mode);
    setText(refs.readout, text);
    set(refs.progress, 'aria-valuetext', text);
  }

  if (geometry.percent !== refs.percent) {
    refs.percent = geometry.percent;
    refs.thumb.style.width = `${geometry.percent}%`;
    set(refs.progress, 'aria-valuenow', String(geometry.percent));
  }

  const atStart = geometry.left <= 0;
  const atEnd = geometry.left >= geometry.maxScroll - 1;
  refs.prev.disabled = atStart;
  refs.start.disabled = atStart;
  refs.next.disabled = atEnd;
  refs.end.disabled = atEnd;

  set(refs.grid, 'data-points-v2-e007-position', String(geometry.percent));
  set(refs.grid, 'data-points-v2-e007-cran', String(geometry.bucket));
}

/* E007-V2-06 — déplacement borné, réutilisé par les quatre boutons, le clavier
 * et la réinitialisation : aucune seconde logique de scroll, ±Infinity ramené
 * à la borne par clamp(). */
function move(refs, delta) {
  const geometry = readGeometry(refs.grid);
  if (!geometry.overflow) return;
  refs.grid.scrollLeft = clamp(geometry.left + delta, 0, geometry.maxScroll);
  apply(refs);
}

function makeButton(ctx, refs, id, label, ariaLabel, deltaOf) {
  const button = ensureNode(ctx, id, 'button', 'points-v2-e007-btn', refs.buttons);
  setText(button, label);
  button.type = 'button';
  set(button, 'aria-label', ariaLabel);
  onLocal(button, 'click', () => move(refs, deltaOf()), refs, null);
  return button;
}

function makeMetric(ctx, parent, id, term, defaultValue) {
  const wrap = ctx.el('div', 'points-v2-e007-metric');
  const dt = ctx.el('dt', '', term);
  const dd = ctx.el('dd', '', defaultValue);
  dd.id = id;
  wrap.append(dt, dd);
  parent.appendChild(wrap);
  return dd;
}

function buildPanel(ctx, refs) {
  const el = ctx.el;
  const panel = ensureNode(ctx, ID.panel, 'section', SCOPE, refs.matrix);

  const title = ensureNode(ctx, ID.title, 'h2', 'points-v2-e007-h2', panel);
  setText(title, 'Laboratoire de lecture matricielle');
  panel.setAttribute('aria-labelledby', title.id);

  const lead = ensureNode(ctx, ID.lead, 'p', 'points-v2-e007-lead', panel);
  setText(lead, 'Cinq grandeurs mesurées sur la grille, un indice de position en cinq crans et un défi falsifiable : tout est recalculé depuis la matrice affichée. Aucune valeur n’est codée en dur et aucun mouvement n’est animé par la lentille.');

  /* E007-V2-03 / E007-V2-08 — texte sémantique et grandeurs chiffrées, dont
   * une comparée à une référence (fenêtre / largeur totale). Lisible sans
   * défilement : les valeurs par défaut sont celles du DOM mesuré. */
  const metrics = ensureNode(ctx, ID.metrics, 'dl', 'points-v2-e007-metrics', panel);
  metrics.replaceChildren();
  refs.mView = makeMetric(ctx, metrics, ID.mView, 'Fenêtre', `${refs.geometry.viewport} px`);
  refs.mTotal = makeMetric(ctx, metrics, ID.mTotal, 'Largeur totale', `${refs.geometry.total} px`);
  refs.mMax = makeMetric(ctx, metrics, ID.mMax, 'Course max.', `${refs.geometry.maxScroll} px`);
  refs.mCount = makeMetric(ctx, metrics, ID.mCount, 'Domaines', String(refs.geometry.columns));
  refs.mStep = makeMetric(ctx, metrics, ID.mStep, 'Pas colonne', `${refs.geometry.stepColumn} px`);

  /* E007-V2-05 — choix du pas par radiogroupe natif (fieldset + legend + radios)
   * et non par aria-pressed, réservé aux bascules indépendantes. */
  const fieldset = ensureNode(ctx, ID.modeGroup, 'fieldset', 'points-v2-e007-fieldset', panel);
  fieldset.replaceChildren();
  fieldset.appendChild(el('legend', '', 'Pas de défilement'));
  const choices = el('div', 'points-v2-e007-choices');
  const modes = [
    [ID.modeColumn, 'column', 'Une colonne'],
    [ID.modeHalf, 'half', 'Demi-fenêtre'],
    [ID.modePage, 'page', 'Fenêtre entière'],
  ];
  refs.radios = [];
  modes.forEach(([id, value, label]) => {
    const labelNode = el('label', 'points-v2-e007-choice');
    const input = el('input', '');
    input.type = 'radio';
    input.name = `${PFX}-mode`;
    input.value = value;
    input.id = id;
    input.checked = value === refs.mode;
    labelNode.append(input, el('span', '', label));
    onLocal(input, 'change', () => {
      refs.mode = value;
      refs.readoutSignature = '';
      apply(refs);
    }, refs, null);
    choices.appendChild(labelNode);
    refs.radios.push(input);
  });
  fieldset.appendChild(choices);

  /* E007-V2-06 — commandes pas à pas et sauts aux extrémités. */
  refs.buttons = ensureNode(ctx, ID.buttons, 'div', 'points-v2-e007-buttons', panel);
  refs.buttons.replaceChildren();
  refs.prev = makeButton(ctx, refs, ID.prev, '← Colonne précédente',
    'Reculer d’un pas selon le mode choisi', () => -stepFor(refs.mode, readGeometry(refs.grid)));
  refs.next = makeButton(ctx, refs, ID.next, 'Pas suivant →',
    'Avancer d’un pas selon le mode choisi', () => stepFor(refs.mode, readGeometry(refs.grid)));
  refs.start = makeButton(ctx, refs, ID.start, 'Début',
    'Aller à la première colonne de la matrice', () => -Infinity);
  refs.end = makeButton(ctx, refs, ID.end, 'Fin',
    'Aller à la dernière colonne de la matrice', () => Infinity);

  /* E007-V2-04 — progression redondée : texte, ARIA et largeur du pouce. */
  refs.progress = ensureNode(ctx, ID.progress, 'div', 'points-v2-e007-progress', panel);
  refs.progress.setAttribute('role', 'progressbar');
  refs.progress.setAttribute('aria-valuemin', '0');
  refs.progress.setAttribute('aria-valuemax', '100');
  refs.progress.setAttribute('aria-label', 'Progression du parcours horizontal de la matrice');
  refs.thumb = ensureNode(ctx, ID.thumb, 'div', 'points-v2-e007-thumb', refs.progress);
  refs.readout = ensureNode(ctx, ID.readout, 'p', 'points-v2-e007-readout', panel);
  refs.readout.setAttribute('role', 'status');
  refs.readout.setAttribute('aria-live', 'polite');

  /* E007-V2-09 — mouvement réduit : l'état est lu une fois et porté par la
   * grille, la lentille n'anime jamais le défilement (affectation directe). */
  refs.motion = ensureNode(ctx, ID.motion, 'p', 'points-v2-e007-motion', panel);
  setText(refs.motion, refs.reduced
    ? 'Mouvement réduit actif : défilement instantané, aimantation désactivée, aucune animation propre à la lentille.'
    : 'Défilement natif, sans animation déclenchée par la lentille ; l’aimantation suit le réglage du navigateur.');

  /* E007-V2-08 — défi falsifiable en cinq temps, en texte sémantique. */
  const challenge = ensureNode(ctx, ID.challenge, 'details', 'points-v2-e007-challenge', panel);
  challenge.replaceChildren();
  challenge.appendChild(el('summary', '', 'Défi : prédire le cran de position'));
  const steps = el('ol', '');
  [
    'Prédiction : annoncez le cran (1 à 5) où vous pensez que la grille se trouve.',
    'Réglage : placez la grille avec les boutons, les flèches ou le défilement natif.',
    'Résultat attendu : votre cran prédit doit correspondre au pourcentage lu dans le statut.',
    'Falsification : le verdict compare votre prédiction au cran réellement calculé ; un écart la réfute.',
    'Débrief : relisez la géométrie mesurée pour comprendre pourquoi le cran a changé.',
  ].forEach((text) => steps.appendChild(el('li', '', text)));
  challenge.appendChild(steps);
  const predictionLabel = el('label', '', 'Votre prédiction (cran de 1 à 5)');
  predictionLabel.htmlFor = ID.prediction;
  challenge.appendChild(predictionLabel);
  refs.prediction = el('select', '');
  refs.prediction.id = ID.prediction;
  [1, 2, 3, 4, 5].forEach((value) => {
    const option = el('option', '', `Cran ${value} sur 5`);
    option.value = String(value);
    if (value === 3) option.selected = true;
    refs.prediction.appendChild(option);
  });
  challenge.appendChild(refs.prediction);
  refs.verify = el('button', 'points-v2-e007-btn', 'Vérifier ma prédiction');
  refs.verify.type = 'button';
  refs.verify.id = ID.verify;
  refs.verdict = el('p', 'points-v2-e007-verdict', 'Verdict : en attente d’une prédiction et d’un défilement.');
  refs.verdict.id = ID.verdict;
  refs.verdict.setAttribute('role', 'status');
  refs.verdict.setAttribute('aria-live', 'polite');
  onLocal(refs.verify, 'click', () => {
    const predicted = Number(refs.prediction.value);
    const geometry = readGeometry(refs.grid);
    if (!geometry.overflow) {
      setText(refs.verdict, `Prédiction réfutée : la grille tient en entier, le seul cran possible est 5/5 ; vous annonciez ${predicted}/5.`);
      return;
    }
    if (predicted === geometry.bucket) {
      setText(refs.verdict, `Prédiction confirmée : à ${geometry.percent} % du parcours, le cran calculé est bien ${geometry.bucket}/5.`);
    } else {
      setText(refs.verdict, `Prédiction réfutée : vous annonciez le cran ${predicted}/5 ; à ${geometry.percent} % du parcours, le cran calculé est ${geometry.bucket}/5.`);
    }
  }, refs, null);
  challenge.append(refs.verify, refs.verdict);

  /* E007-V2-07 — remise à zéro locale, sans état parallèle. */
  refs.reset = ensureNode(ctx, ID.reset, 'button', 'points-v2-e007-btn', panel);
  setText(refs.reset, 'Réinitialiser le laboratoire');
  refs.reset.type = 'button';
  onLocal(refs.reset, 'click', () => {
    refs.mode = 'column';
    refs.radios.forEach((radio) => { radio.checked = radio.value === 'column'; });
    refs.prediction.value = '3';
    setText(refs.verdict, 'Verdict : en attente d’une prédiction et d’un défilement.');
    refs.readoutSignature = '';
    move(refs, -Infinity);
    apply(refs);
  }, refs, null);

  /* E007-V2-07 — texte d'aide masqué, relié par aria-describedby complété. */
  refs.hint = ensureNode(ctx, ID.hint, 'p', 'points-v2-e007-sr', panel);
  setText(refs.hint, 'Laboratoire de lecture matricielle : la grille est focusable. Flèche gauche et flèche droite déplacent d’un pas, Début et Fin atteignent les extrémités. Le statut annonce le cran, les domaines visibles et le pourcentage du parcours.');

  /* Commandes placées juste après la grille, avant les filtres : lecture
   * matrice → laboratoire → filtres → détail. Insertion additive uniquement. */
  const filters = refs.matrix.querySelector('.points-filters');
  if (filters && panel.nextElementSibling !== filters) refs.matrix.insertBefore(panel, filters);
}

function install(ctx) {
  /* E007-V2-01 — le contrat viewId est exploité : la V2 n'agit que sur la
   * famille Points (identifiant 'pointsv2' posé par points.js, repli 'points'). */
  if (!ctx || (ctx.viewId !== 'pointsv2' && ctx.viewId !== 'points')) return;
  const stage = ctx.stage;
  const layout = ctx.layout || (stage && typeof stage.querySelector === 'function'
    ? stage.querySelector('.points-layout') : null);
  if (!stage || !layout || typeof layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;

  const grid = layout.querySelector('.points-grid');
  if (!grid || typeof grid.scrollWidth !== 'number') return;
  const matrix = layout.querySelector('.points-matrix') || grid.parentElement;
  if (!matrix || typeof matrix.appendChild !== 'function') return;
  const head = grid.querySelector('.points-grid-row.is-head');
  if (!head || typeof head.children === 'undefined') return;

  /* E007-V2-02 — une seule feuille, puis nettoyage et état neuf par layout. */
  ctx.css(CSS_ID, CSS);
  purgeStale(layout);
  teardown(layout);
  layout.classList.add(SCOPE);
  set(grid, 'data-points-v2-e007', '1');
  grid.classList.add('points-v2-e007-grid');
  if (!grid.hasAttribute('tabindex')) set(grid, 'tabindex', '0');

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  set(grid, 'data-motion', reduced ? 'reduced' : 'normal');

  const refs = {
    ctx, stage, layout, grid, matrix, reduced,
    mode: 'column', listeners: [], geoSignature: '', readoutSignature: '',
    percent: -1, geometry: null, boundScroll: false, boundKeys: false,
  };
  refs.geometry = readGeometry(grid);
  buildPanel(ctx, refs);
  appendDescribedBy(grid, [ID.hint]);

  stateByLayout.set(layout, refs);

  /* E007-V2-07 — clavier strictement local : le garde `event.target === grid`
   * laisse les flèches aux cellules et aux boutons de navigation. Aucune touche
   * réservée au routeur n'est interceptée, aucun écouteur global. */
  onLocal(grid, 'scroll', () => apply(refs), refs, 'boundScroll');
  onLocal(grid, 'keydown', (event) => {
    if (event.target !== grid) return;
    const step = stepFor(refs.mode, readGeometry(grid));
    if (event.key === 'ArrowRight') { move(refs, step); event.preventDefault(); }
    else if (event.key === 'ArrowLeft') { move(refs, -step); event.preventDefault(); }
    else if (event.key === 'Home') { move(refs, -Infinity); event.preventDefault(); }
    else if (event.key === 'End') { move(refs, Infinity); event.preventDefault(); }
  }, refs, 'boundKeys');

  apply(refs);
}

register('E007', (ctx) => {
  try {
    install(ctx);
  } catch {
    /* Lentille défaillante neutralisée sans interrompre le rendu. */
    return;
  }
});
