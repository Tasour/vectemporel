import { register } from './registry.js';

/* Lentille E018 — B. Filtres & périmètre : combinaison domaine × famille ∩ ère
 * cohérente (chantiers E018-01 à E018-10, rapport
 * UNIFIED_AUDIT/POINTS/views/E018.md).
 *
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le module
 * lit le DOM construit par points.js (filtres, matrice, détail) et ajoute UNE
 * synthèse de périmètre, sans modifier les contrôles existants, sans écrire
 * d'état et sans import vers le store.
 *
 * Invariants : un seul register, un seul CSS (ctx.css('points-e018', …)), un
 * seul panneau de synthèse, un seul jeu d'écouteurs (non destructifs, phase
 * capture), zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*.
 */

const CSS_ID = 'points-e018';
const SUMMARY_ID = 'points-e018-summary';
const TITLE_ID = 'points-e018-title';
const NOTE_ID = 'points-e018-note';

/* Feuille unique, strictement cadrée sur les ancres points-e018. Aucune
 * animation : le mouvement réduit est respecté par construction. */
const CSS = `
  #${SUMMARY_ID} {
    margin: 10px 0 0; padding: 10px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(255, 255, 255, .02); color: var(--ink-soft);
    font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere; max-width: 100%;
  }
  #${SUMMARY_ID} .points-e018-title {
    margin: 0 0 5px; font-family: var(--serif); font-size: 13px;
    color: var(--gold-bright);
  }
  #${SUMMARY_ID} p { margin: 0 0 5px; }
  #${SUMMARY_ID} p:last-child { margin-bottom: 0; }
  #${SUMMARY_ID} .points-e018-label { color: var(--gold); font-weight: 600; letter-spacing: .02em; }
  #${SUMMARY_ID} .points-e018-verdict[data-state="vide"],
  #${SUMMARY_ID} .points-e018-verdict[data-state="incoherent"] { color: var(--gold-bright); font-weight: 600; }
  #${SUMMARY_ID} .points-e018-metrics { color: var(--muted-2); font-size: 10px; }
  /* E018-08 — état toujours textuel (verdict + data-state), jamais la seule
   * couleur ; focus visible ; note SR rattachée par aria-describedby. */
  .points-e018-sr {
    position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  #${SUMMARY_ID}:focus-visible, .points-cell[data-points-e018-match]:focus-visible,
  .points-era[data-points-e018-era]:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 3px;
  }
  .points-cell[data-points-e018-match="1"] { border-style: solid; }
  /* E018-09 — repli 390×844 : pas de débordement, texte qui revient à la ligne. */
  @media (max-width: 700px) {
    #${SUMMARY_ID} { padding: 8px 10px; font-size: 10px; }
  }
  /* E018-08 — aucun mouvement propre : même le repli neutralise les transitions. */
  @media (prefers-reduced-motion: reduce) {
    #${SUMMARY_ID}, .points-cell[data-points-e018-match], .points-era[data-points-e018-era] { transition: none; }
  }
`;

let writes = 0;      // compteur auditable d'écritures réelles du panneau
let signature = '';  // signature anti-écriture redondante, remise à zéro au rendu neuf

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

/* E018-02 — les deux <select> sont identifiés par leur aria-label, avec repli
 * sur leur ordre dans .points-filters (points.js:61-84 : domaine puis famille). */
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

/* E018-04 — ère active résiliente : ligne .is-active, puis aria-current, puis
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

/* Domaines dans l'ordre réel de l'en-tête de la matrice (points.js:35-36). */
function domainsOf(layout) {
  return nodes(layout, '.points-grid-row.is-head > span').slice(1).map(txt);
}

/* E018-03 — comptage indépendant depuis les titres des cellules
 * (`Ère · domaine · N point(s)`, points.js:48). Sans domaine précis, on
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

/* E018-03 — le compte du détail vient du kicker écrit par points.js:96. */
function detailCountOf(layout) {
  const kicker = layout.querySelector('.points-detail > .view-kicker');
  const match = /(\d+)/.exec(txt(kicker));
  return match ? Number(match[1]) : null;
}

/* E018-03 / E018-05 — jugement de cohérence falsifiable : le détail ne doit
 * pas dépasser la cellule ère × domaine ; zéro point signale une combinaison
 * vide ; un signal manquant est dit, jamais deviné. */
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

/* E018-05 — effacer puis reposer les marques : non destructif (aucun texte,
 * title ou gestionnaire de la cellule n'est touché) et idempotent. */
function markCells(layout, domainValue, domains, state) {
  nodes(layout, '[data-points-e018-match]').forEach((node) => {
    delete node.dataset.pointsE018Match;
    delete node.dataset.pointsE018State;
    node.classList.remove('points-e018-match');
  });
  nodes(layout, '[data-points-e018-era]').forEach((node) => {
    delete node.dataset.pointsE018Era;
  });
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
    put(cell, 'data-points-e018-match', '1');
    put(cell, 'data-points-e018-state', state);
    cell.classList.add('points-e018-match');
  });
  if (era.button) put(era.button, 'data-points-e018-era', '1');
}

/* E018-01 — panneau local, non modal, créé une seule fois et réutilisé. */
function summaryOf(ctx, host) {
  let summary = document.getElementById(SUMMARY_ID);
  if (summary && !summary.isConnected) summary = null;
  if (summary && summary.parentElement !== host) summary.remove();
  if (!summary) {
    summary = ctx.el('section', 'points-e018-summary');
    summary.id = SUMMARY_ID;
    put(summary, 'role', 'region');
    put(summary, 'aria-labelledby', TITLE_ID);
    put(summary, 'aria-describedby', NOTE_ID);
    put(summary, 'data-points-e018', 'summary');
    const title = ctx.el('h3', 'points-e018-title', 'Périmètre cohérent');
    title.id = TITLE_ID;
    summary.appendChild(title);
    summary.appendChild(ctx.el('p', 'points-e018-combo', ''));
    summary.appendChild(ctx.el('p', 'points-e018-count', ''));
    summary.appendChild(ctx.el('p', 'points-e018-verdict', ''));
    summary.appendChild(ctx.el('p', 'points-e018-metrics', ''));
    const note = ctx.el('p', 'points-e018-sr',
      'Le périmètre est l’intersection du domaine et de la famille dans l’ère active. '
      + 'Le signe × compose le domaine et la famille ; le signe ∩ restreint le résultat à l’ère. '
      + 'La cellule de la matrice donne le total ère × domaine : elle ne tient pas compte de la famille.');
    note.id = NOTE_ID;
    summary.appendChild(note);
    writes = 0;
    signature = '';
  }
  if (summary.parentElement !== host) host.appendChild(summary);
  return summary;
}

/* E018-06 — écouteurs en phase capture, non destructifs : aucun
 * preventDefault, aucun stopPropagation, aucun retrait de gestionnaire. Le
 * marqueur de dataset évite d'en empiler à chaque passe du registre. */
function bindOnce(element, type, handler) {
  if (!element || !element.addEventListener) return;
  if (element.dataset && element.dataset.pointsE018Bound === '1') return;
  element.addEventListener(type, handler, true);
  if (element.dataset) element.dataset.pointsE018Bound = '1';
}

/* E018-07 — écriture conditionnelle : une signature identique ne touche pas
 * au DOM, le compteur ne progresse que sur une écriture réelle. */
function render(ctx, summary, model) {
  const next = [
    model.domainValue, model.familyValue, model.era.name,
    model.detailCount, model.cellTotal, model.verdict.state,
  ].join('|');
  if (next === signature) return;
  signature = next;
  writes += 1;

  const combo = summary.querySelector('.points-e018-combo');
  const count = summary.querySelector('.points-e018-count');
  const verdictNode = summary.querySelector('.points-e018-verdict');
  const metrics = summary.querySelector('.points-e018-metrics');
  if (!combo || !count || !verdictNode || !metrics) return;

  combo.replaceChildren(
    ctx.el('span', 'points-e018-label', 'Combinaison : '),
    document.createTextNode(
      `domaine « ${dimensionLabel(model.domainValue, true)} » × famille « ${dimensionLabel(model.familyValue, false)} » `
      + `∩ ère « ${model.era.name || 'ère non déterminée'} ».`
    )
  );
  const cellPart = model.cellTotal === null
    ? 'cellule ère × domaine non lisible'
    : `cellule ère × domaine : ${model.cellTotal}`;
  const detailPart = model.detailCount === null
    ? 'compte du détail indisponible'
    : `points visibles dans le détail : ${model.detailCount}`;
  count.replaceChildren(
    ctx.el('span', 'points-e018-label', 'Mesures : '),
    document.createTextNode(`${detailPart} · ${cellPart}.`)
  );
  verdictNode.textContent = model.verdict.text;
  put(verdictNode, 'data-state', model.verdict.state);
  metrics.textContent = `Actualisations du périmètre : ${writes}.`;
}

/* E018-10 — idempotence multi-rendus : un seul CSS, un seul panneau réutilisé,
 * un seul jeu d'écouteurs marqué, aucune écriture redondante, aucun timer,
 * aucune rAF, aucun aléa, aucun appel réseau ni fichier partagé touché. Passe
 * unique et tolérante, appliquée à chaque rendu par runEnhancements (points.js:126). */
function apply(ctx) {
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;
  const filters = layout.querySelector('.points-filters') || matrix;
  ctx.css(CSS_ID, CSS);

  const summary = summaryOf(ctx, filters);
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
