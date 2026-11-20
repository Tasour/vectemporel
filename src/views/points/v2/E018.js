import { register } from './registry.js';

/* Lentille POINTS E018 — passe 2 (V2) : Filtres & périmètre, combinaison
 * domaine × famille ∩ ère cohérente (chantiers E018-01 à E018-10).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E018.md. Ce module est la passe 2
 * autonome de la lentille : il ne lit ni n'écrit aucun fichier de la passe 1
 * (src/views/points/E018.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js, store, données). Seuls le registre V2 et
 * le DOM réellement rendu sont utilisés.
 *
 * Contrat exploité : viewId ('pointsv2', toléré 'points' pour un harnais),
 * stage, layout, css(id, rules), el(tag, cls, text), reducedMotion(). Aucune
 * dépendance vers le store : la synthèse et le verdict sont dérivés du DOM.
 *
 * La lentille ajoute UNE synthèse de périmètre qui rend lisible l'intersection
 * domaine × famille ∩ ère et vérifie sa cohérence en croisant deux sources
 * indépendantes déjà présentes : le compte du détail (points.js:97) et les
 * titres des cellules de la matrice (points.js:49). Elle ne modifie ni le
 * texte, ni le title, ni les gestionnaires des contrôles d'origine.
 *
 * Invariants : une seule feuille (ctx.css('points-v2-e018', …)), une seule
 * portée (.points-v2-e018), un seul panneau (ids préfixés points-v2-e018- avec
 * garde anti-doublon), un seul jeu d'écouteurs non destructifs, signature anti-
 * écriture, zéro innerHTML, zéro réseau, zéro aléa, zéro timer, zéro rAF,
 * zéro écouteur global, aucun appel à la console. Tout DOM statique passe par
 * ctx.el. Les signaux de donnée sont distincts de ceux de la passe 1
 * (data-points-e018-*) pour ne pas écraser ses marqueurs sur le DOM partagé.
 */

const CSS_ID = 'points-v2-e018';
const SCOPE = 'points-v2-e018';
const SUMMARY_ID = 'points-v2-e018-summary';
const TITLE_ID = 'points-v2-e018-title';
const NOTE_ID = 'points-v2-e018-note';
const COMBO_ID = 'points-v2-e018-combo';
const COUNT_ID = 'points-v2-e018-count';
const VERDICT_ID = 'points-v2-e018-verdict';
const METRICS_ID = 'points-v2-e018-metrics';
const REDUCED_ATTR = 'data-points-v2-e018-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

const ATTR_MATCH = 'data-points-v2-e018-match';
const ATTR_STATE = 'data-points-v2-e018-state';
const ATTR_ERA = 'data-points-v2-e018-era';
const ATTR_REFRESHES = 'data-points-v2-e018-refreshes';

/* Chaque sélecteur commence littéralement par `.points-v2-e018`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points.
 * Les attributs sont distincts de ceux de la passe 1 pour coexister avec elle. */
const CSS = `
  /* E018-04 : panneau local, non modal, étroitement cadré dans les filtres. */
  .points-v2-e018 #${SUMMARY_ID} {
    margin: 10px 0 0; padding: 10px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(8, 11, 16, .78); color: var(--ink-soft);
    font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere; max-width: 100%;
    transition: border-color .18s linear;
  }
  .points-v2-e018 #${SUMMARY_ID}:focus-visible,
  .points-v2-e018 .points-cell[${ATTR_MATCH}]:focus-visible,
  .points-v2-e018 .points-era[${ATTR_ERA}]:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 3px;
  }
  .points-v2-e018 #${SUMMARY_ID} .points-v2-e018-title {
    margin: 0 0 5px; font-family: var(--serif); font-size: 13px;
    color: var(--gold-bright);
  }
  .points-v2-e018 #${SUMMARY_ID} p { margin: 0 0 5px; }
  .points-v2-e018 #${SUMMARY_ID} p:last-child { margin-bottom: 0; }
  .points-v2-e018 #${SUMMARY_ID} .points-v2-e018-label {
    color: var(--gold); font-weight: 600; letter-spacing: .02em;
  }
  /* E018-06 : l'état est toujours textuel ; la couleur ne fait que renforcer
   * deux verdicts, doublés de l'attribut ${ATTR_STATE}. */
  .points-v2-e018 #${SUMMARY_ID} .points-v2-e018-verdict[data-state="vide"],
  .points-v2-e018 #${SUMMARY_ID} .points-v2-e018-verdict[data-state="incoherent"] {
    color: var(--gold-bright); font-weight: 600;
  }
  .points-v2-e018 #${SUMMARY_ID} .points-v2-e018-metrics {
    color: var(--muted-2); font-size: 10px;
  }
  /* E018-07 : repère non destructif sur la cellule ère × domaine et le bouton
   * d'ère ; seul le style de bordure et la graisse sont ajoutés. */
  .points-v2-e018 .points-cell[${ATTR_MATCH}="1"] { border-style: solid; }
  .points-v2-e018 .points-era[${ATTR_ERA}="1"] { font-weight: 600; }
  /* E018-09 : note SR rattachée par aria-describedby, sans région live. */
  .points-v2-e018 .points-v2-e018-sr {
    position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  /* E018-10 : repli 390×844 — pas de débordement, texte qui revient à la ligne. */
  @media (max-width: 700px) {
    .points-v2-e018 #${SUMMARY_ID} { padding: 8px 10px; font-size: 10px; }
  }
  /* E018-09 : mouvement réduit, couplage JS (attribut) ET media query. */
  .points-v2-e018[${REDUCED_ATTR}="1"] #${SUMMARY_ID} { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e018 #${SUMMARY_ID} { transition: none; }
  }
  /* E018-09 : couleurs forcées — fond, bordure et repère explicites, jamais
   * une teinte seule. */
  @media (forced-colors: active) {
    .points-v2-e018 #${SUMMARY_ID} {
      background: Canvas; color: CanvasText; border-color: CanvasText;
    }
    .points-v2-e018 #${SUMMARY_ID} .points-v2-e018-title,
    .points-v2-e018 #${SUMMARY_ID} .points-v2-e018-label { color: CanvasText; }
    .points-v2-e018 .points-cell[${ATTR_MATCH}="1"] { border-color: Highlight; }
  }
`;

let writes = 0;      // compteur auditable d'écritures réelles du panneau
let signature = '';  // signature anti-écriture, remise à zéro au rendu neuf

function byId(id) {
  return typeof document !== 'undefined' && document.getElementById
    ? document.getElementById(id)
    : null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* E018-01 : garde anti-doublon. Pour un id donné, on conserve le premier nœud
 * contenu dans root et on retire tous les autres (dispersés ou non). */
function ensureOne(id, root) {
  const found = typeof document !== 'undefined' && document.querySelectorAll
    ? Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'))
    : [];
  let kept = null;
  for (const node of found) {
    /* `contains` suffit : il marche aussi pour un panneau pas encore greffé. */
    if (!kept && root && typeof root.contains === 'function' && root.contains(node)) kept = node;
    else if (typeof node.remove === 'function') node.remove();
  }
  return kept;
}

/* E018-02 — les deux <select> sont identifiés par leur aria-label, avec repli
 * sur leur ordre dans .points-filters (points.js:62-85 : domaine puis famille).
 * Aucun libellé n'est codé en dur : tout vient du DOM. */
function selectsOf(filters) {
  const list = nodes(filters, 'select');
  const result = { domain: list[0] || null, family: list[1] || null };
  list.forEach((select) => {
    const label = (select.getAttribute('aria-label') || '').toLowerCase();
    if (label.indexOf('domaine') !== -1) result.domain = select;
    else if (label.indexOf('famille') !== -1) result.family = select;
  });
  return result;
}

/* E018-03 — ère active résiliente : ligne .is-active, puis aria-current, puis
 * première ligne. Aucun nom d'ère n'est fabriqué quand le signal manque. */
function eraOf(layout) {
  const rows = nodes(layout, '.points-grid-row:not(.is-head)');
  const active = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  let button = active ? active.querySelector('.points-era') : null;
  let row = active;
  if (!button) {
    const current = layout.querySelector('.points-era[aria-current="true"]');
    if (current) {
      button = current;
      row = current.closest('.points-grid-row');
    }
  }
  if (!button && rows.length) {
    row = rows[0];
    button = row.querySelector('.points-era');
  }
  return { name: txt(button), button: button || null, row: row || null };
}

/* E018-02 — libellé lisible des trois dimensions ; '*' signifie « tout ». */
function dimensionLabel(value, domain) {
  if (!value || value === '*') return domain ? 'tous les domaines' : 'toutes les familles';
  return value;
}

/* Domaines dans l'ordre réel de l'en-tête de la matrice (points.js:35-37). */
function domainsOf(layout) {
  return nodes(layout, '.points-grid-row.is-head > span').slice(1).map(txt);
}

/* E018-05 — comptage indépendant depuis les titres des cellules
 * (`Ère · domaine · N point(s)`, points.js:49). Sans domaine précis, on
 * additionne les cellules de la ligne de l'ère active. */
function cellTotalOf(layout, era, domainValue, domains) {
  if (!era.row) return null;
  const cells = nodes(era.row, '.points-cell');
  if (!cells.length) return null;
  const indexes = [];
  if (domainValue && domainValue !== '*') {
    const index = domains.indexOf(domainValue);
    if (index < 0 || !cells[index]) return null;
    indexes.push(index);
  } else {
    cells.forEach((_, index) => indexes.push(index));
  }
  let total = 0;
  let known = 0;
  indexes.forEach((index) => {
    const match = /(\d+)\s*point/i.exec(cells[index].getAttribute('title') || '');
    if (match) { total += Number(match[1]); known += 1; }
  });
  return known ? total : null;
}

/* E018-05 — le compte du détail vient du kicker écrit par points.js:97. */
function detailCountOf(layout) {
  const kicker = layout.querySelector('.points-detail > .view-kicker');
  const match = /(\d+)/.exec(txt(kicker));
  return match ? Number(match[1]) : null;
}

/* E018-06 — jugement de cohérence falsifiable : le détail ne doit pas dépasser
 * la cellule ère × domaine ; zéro point signale une combinaison vide ; un signal
 * manquant est dit, jamais deviné. Cinq états textuels, jamais la couleur seule. */
function verdictOf(detailCount, cellTotal, eraName) {
  if (detailCount === null) {
    return { state: 'inconnu', text: 'Cohérence non vérifiable : le détail n’expose pas de compte de points.' };
  }
  if (cellTotal === null) {
    return { state: 'partiel', text: `Périmètre déclaré : ${detailCount} point(s) visible(s). Contrôle croisé avec la matrice indisponible.` };
  }
  if (detailCount > cellTotal) {
    return { state: 'incoherent', text: `Incohérence détectée : le détail annonce ${detailCount} point(s) pour une cellule ère × domaine de ${cellTotal}.` };
  }
  if (detailCount === 0) {
    return { state: 'vide', text: `Combinaison vide : aucun point pour ce domaine, cette famille et l’ère${eraName ? ` « ${eraName} »` : ''}.` };
  }
  return { state: 'coherent', text: `Combinaison cohérente : ${detailCount} point(s) dans le périmètre, cellule ère × domaine de ${cellTotal}.` };
}

/* E018-07 — effacer puis reposer les marques : non destructif (aucun texte,
 * title ou gestionnaire de la cellule n'est touché) et idempotent. Les attributs
 * sont ceux de la V2, distincts de ceux de la passe 1. */
function markCells(layout, domainValue, domains, state) {
  nodes(layout, '[' + ATTR_MATCH + ']').forEach((node) => {
    node.removeAttribute(ATTR_MATCH);
    node.removeAttribute(ATTR_STATE);
    node.classList.remove('points-v2-e018-match');
  });
  nodes(layout, '[' + ATTR_ERA + ']').forEach((node) => node.removeAttribute(ATTR_ERA));
  const era = eraOf(layout);
  const cells = era.row ? nodes(era.row, '.points-cell') : [];
  const indexes = [];
  if (domainValue && domainValue !== '*') {
    const index = domains.indexOf(domainValue);
    if (index >= 0 && cells[index]) indexes.push(index);
  } else {
    cells.forEach((_, index) => indexes.push(index));
  }
  indexes.forEach((index) => {
    const cell = cells[index];
    put(cell, ATTR_MATCH, '1');
    put(cell, ATTR_STATE, state);
    cell.classList.add('points-v2-e018-match');
  });
  if (era.button) put(era.button, ATTR_ERA, '1');
}

/* E018-04 — structure statique du panneau, créée une seule fois par rendu avec
 * ctx.el (jamais innerHTML). Tous les identifiants sont préfixés. Le panneau est
 * atteignable au clavier (tabindex) et décrit par une note SR. */
function buildPanel(ctx) {
  const summary = ctx.el('section', 'points-v2-e018-summary');
  summary.id = SUMMARY_ID;
  put(summary, 'role', 'region');
  put(summary, 'aria-labelledby', TITLE_ID);
  put(summary, 'aria-describedby', NOTE_ID);
  put(summary, 'tabindex', '0');
  put(summary, 'data-points-v2-e018', 'summary');

  const title = ctx.el('h3', 'points-v2-e018-title', 'Périmètre cohérent');
  title.id = TITLE_ID;
  const combo = ctx.el('p', 'points-v2-e018-combo', '');
  combo.id = COMBO_ID;
  const count = ctx.el('p', 'points-v2-e018-count', '');
  count.id = COUNT_ID;
  const verdict = ctx.el('p', 'points-v2-e018-verdict', '');
  verdict.id = VERDICT_ID;
  const metrics = ctx.el('p', 'points-v2-e018-metrics', '');
  metrics.id = METRICS_ID;
  const note = ctx.el('p', 'points-v2-e018-sr',
    'Le périmètre est l’intersection du domaine et de la famille dans l’ère active. '
    + 'Le signe × compose le domaine et la famille ; le signe ∩ restreint le résultat à l’ère. '
    + 'La cellule de la matrice donne le total ère × domaine : elle ne tient pas compte de la famille.');
  note.id = NOTE_ID;

  summary.append(title, combo, count, verdict, metrics, note);
  return summary;
}

/* E018-01 / E018-04 — panneau unique, réutilisé sur un même rendu, recréé sur
 * un rendu neuf. Les trois ids internes sont dédupliqués comme le panneau. */
function summaryOf(ctx, host) {
  let summary = ensureOne(SUMMARY_ID, host);
  const needed = [TITLE_ID, COMBO_ID, COUNT_ID, VERDICT_ID, METRICS_ID, NOTE_ID];
  if (summary && !needed.every((id) => summary.querySelector('#' + id))) {
    if (typeof summary.remove === 'function') summary.remove();
    summary = null;
  }
  if (!summary) summary = buildPanel(ctx);
  /* Un panneau détaché peut traîner des doublons d'ids internes : on n'en
   * garde qu'un par id, tous contenus dans le panneau retenu. */
  needed.forEach((id) => { summary.querySelector('#' + id).id = id; ensureOne(id, summary); });
  if (summary.parentElement !== host) host.appendChild(summary);
  return summary;
}

/* E018-08 — écouteurs en phase capture, non destructifs : aucun preventDefault,
 * aucun stopPropagation, aucun retrait de gestionnaire. Le marqueur de dataset
 * évite d'en empiler à chaque passe du registre. */
function bindOnce(element, type, handler) {
  if (!element || typeof element.addEventListener !== 'function') return;
  if (element.dataset && element.dataset.pointsV2E018Bound === '1') return;
  element.addEventListener(type, handler, true);
  if (element.dataset) element.dataset.pointsV2E018Bound = '1';
}

/* E018-08 — écriture conditionnelle : une signature identique ne touche pas
 * au DOM, le compteur ne progresse que sur une écriture réelle. */
function render(ctx, summary, model) {
  const next = [
    model.domainValue, model.familyValue, model.era.name,
    model.detailCount, model.cellTotal, model.verdict.state,
  ].join('|');
  if (next === signature) return;
  signature = next;
  writes += 1;

  const combo = summary.querySelector('.points-v2-e018-combo');
  const count = summary.querySelector('.points-v2-e018-count');
  const verdictNode = summary.querySelector('.points-v2-e018-verdict');
  const metrics = summary.querySelector('.points-v2-e018-metrics');
  if (!combo || !count || !verdictNode || !metrics) return;

  combo.replaceChildren(
    ctx.el('span', 'points-v2-e018-label', 'Combinaison : '),
    ctx.el('span', '',
      `domaine « ${dimensionLabel(model.domainValue, true)} » × famille « ${dimensionLabel(model.familyValue, false)} » `
      + `∩ ère « ${model.era.name || 'ère non déterminée'} ».`)
  );
  const cellPart = model.cellTotal === null
    ? 'cellule ère × domaine non lisible'
    : `cellule ère × domaine : ${model.cellTotal}`;
  const detailPart = model.detailCount === null
    ? 'compte du détail indisponible'
    : `points visibles dans le détail : ${model.detailCount}`;
  count.replaceChildren(
    ctx.el('span', 'points-v2-e018-label', 'Mesures : '),
    ctx.el('span', '', `${detailPart} · ${cellPart}.`)
  );
  verdictNode.textContent = model.verdict.text;
  put(verdictNode, 'data-state', model.verdict.state);
  metrics.textContent = `Actualisations du périmètre : ${writes}.`;
  put(summary, ATTR_REFRESHES, String(writes));
}

/* E018-10 — idempotence multi-rendus : un seul CSS, un seul panneau réutilisé,
 * un seul jeu d'écouteurs marqué, aucune écriture redondante, aucun timer,
 * aucune rAF, aucun aléa, aucun appel réseau ni fichier partagé touché. Passe
 * unique et tolérante, appliquée à chaque rendu par runEnhancementsV2. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
  /* Garde de cohérence : le layout doit appartenir à la scène déclarée quand
   * elle est fournie (présente dans le rendu réel). */
  if (stage && typeof stage.contains === 'function' && !stage.contains(layout)) return;
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;
  const filters = layout.querySelector('.points-filters') || matrix;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset.pointsV2E018 = ctx.viewId;

  /* E018-09 — couplage à la préférence de mouvement réduite, en plus de la
   * media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* Un nœud déconnecté ou absent marque un rendu neuf. */
  const found = byId(SUMMARY_ID);
  const fresh = !(found && found.isConnected && layout.contains(found));
  const summary = summaryOf(ctx, filters);
  if (fresh) { writes = 0; signature = ''; }

  const { domain: domainSelect, family: familySelect } = selectsOf(filters);
  const era = eraOf(layout);
  const domains = domainsOf(layout);
  const domainValue = domainSelect ? domainSelect.value : '*';
  const familyValue = familySelect ? familySelect.value : '*';
  const detailCount = detailCountOf(layout);
  const cellTotal = cellTotalOf(layout, era, domainValue, domains);
  const verdict = verdictOf(detailCount, cellTotal, era.name);
  const model = { domainValue, familyValue, era, detailCount, cellTotal, verdict };

  markCells(layout, domainValue, domains, verdict.state);
  render(ctx, summary, model);

  const refresh = () => apply(ctx);
  bindOnce(domainSelect, 'change', refresh);
  bindOnce(familySelect, 'change', refresh);
  nodes(filters, 'button').forEach((button) => bindOnce(button, 'click', refresh));
  nodes(layout, '.points-era, .points-cell').forEach((button) => bindOnce(button, 'click', refresh));
}

register('E018', (ctx) => {
  try { apply(ctx); }
  catch { /* une structure inattendue neutralise la lentille, jamais le rendu. */ }
});
