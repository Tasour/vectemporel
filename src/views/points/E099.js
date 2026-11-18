import { register } from './registry.js';

/* Lentille POINTS E099 — Alternative textuelle complète de la matrice
 * (domaine J : pédagogie & narration).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E099.md — chantiers E099-01 à E099-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, le store, la coque, styles.css et toute autre lentille ne sont ni
 * édités ni doublés. E099 ajoute un sous-arbre SÉMANTIQUE et VISIBLE qui
 * restitue en texte la totalité de la matrice, afin qu'elle reste lisible et
 * Compréhensible quand la feuille de style est absente.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion() (tels que fournis par points/registry.js:28-44). Tout est
 * dérivé du DOM rendu par points.js : .points-title, .points-grid,
 * .points-grid-row.is-head, .points-era, .points-cell (.has-points),
 * .points-filters (2 <select> + bouton de réinitialisation) et .points-detail
 * (.points-point-title, .points-point-text, .points-meta, .points-families,
 * .points-sources, .points-justification, .points-nav). Aucune valeur
 * historique n'est inventée, aucun chiffre n'est codé en dur.
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS (cssOnce), un seul bloc d'alternative ;
 * - tous les identifiants préfixés `points-e099-` ;
 * - le texte est dans le DOM, dans des éléments <p>/<li>/<caption>/<th>/<td>
 *   VISIBLES : ni .sr-only, ni aria-hidden, ni hidden, ni display:none ;
 * - aucun innerHTML / outerHTML / insertAdjacentHTML ; aucun contenu existant
 *   n'est remplacé : les ids et aria-describedby sont FUSIONNÉS, jamais écrasés ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * - installation idempotente : nœud réutilisé par identifiant, nœud périmé retiré.
 */

const CSS_ID = 'points-e099';

const ID = {
  section: 'points-e099-alt',
  heading: 'points-e099-alt-title',
  intro: 'points-e099-intro',
  table: 'points-e099-table',
  narrative: 'points-e099-narrative',
  current: 'points-e099-current',
  filters: 'points-e099-filters',
  metrics: 'points-e099-metrics',
  grid: 'points-e099-grid',
};

/* Feuille unique. Aucune règle ne MASQUE le texte : l'alternative reste lisible
 * et structurée même si cette feuille n'est pas chargée (le <table> et les <p>
 * portent seuls le sens). Les règles ne visent que le bloc préfixé. */
const CSS = `
  #${ID.section} {
    margin: 12px 0 4px; padding: 12px 14px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
    background: rgba(8,11,16,.94); color: var(--ink-soft, #d8d8d8);
    font-size: 12px; line-height: 1.55;
  }
  #${ID.section} h3 {
    margin: 0 0 6px; font-family: var(--serif, serif);
    font-size: 15px; color: var(--gold-bright, #e9c98f);
  }
  #${ID.section} p { margin: 0 0 8px; }
  #${ID.section} .points-e099-label {
    color: var(--gold, #e6b96f); font-weight: 600; letter-spacing: .03em;
  }
  #${ID.section} .points-e099-narrative { margin: 0 0 10px; padding-left: 18px; }
  #${ID.section} .points-e099-narrative li { margin-bottom: 4px; }
  #${ID.section} table {
    width: 100%; border-collapse: collapse; margin: 0 0 10px;
    font-variant-numeric: tabular-nums;
  }
  #${ID.section} caption {
    text-align: left; font-weight: 600; color: var(--gold-bright, #e9c98f);
    padding: 0 0 6px;
  }
  #${ID.section} th, #${ID.section} td {
    border: 1px solid var(--line-strong, #5b5b5b);
    padding: 4px 7px; text-align: left;
  }
  #${ID.section} thead th {
    color: var(--gold-bright, #e9c98f); background: rgba(230,185,111,.08);
  }
  #${ID.section} tbody th { color: var(--gold, #e6b96f); font-weight: 600; }
  #${ID.section} a.points-e099-back {
    display: inline-block; min-height: 24px; padding: 2px 6px;
    color: var(--gold-bright, #e9c98f);
  }
  #${ID.section} a.points-e099-back:focus-visible,
  #${ID.section}:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  #${ID.section} .points-e099-metrics {
    margin: 0; color: var(--muted, #9a9a9a); font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 620px) {
    #${ID.section} { padding: 10px; font-size: 11px; }
    #${ID.section} th, #${ID.section} td { padding: 3px 5px; }
  }
  @media (forced-colors: active) {
    #${ID.section} th, #${ID.section} td { border: 1px solid CanvasText; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${ID.section}, #${ID.section} * { transition: none !important; animation: none !important; }
  }
`;

/* ---------- utilitaires de lecture (aucune écriture hors du sous-arbre) ---------- */

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

function cellValue(cell) {
  const value = txt(cell);
  return cell.classList.contains('has-points') && /^\d+$/.test(value) ? value : '0';
}

/* Le domaine vient de l'en-tête réel ; à défaut, du title posé par points.js
 * (points.js:48), jamais d'une valeur fabriquée. */
function domainOf(cell, index, domains) {
  if (domains[index]) return domains[index];
  const parts = (cell.getAttribute('title') || '').split('·').map((part) => part.trim());
  return parts[1] || `colonne ${index + 1}`;
}

/* E099-02 / E099-03 / E099-04 : lecture intégrale de la matrice depuis le DOM. */
function readMatrix(ctx) {
  const layout = ctx.layout;
  const grid = layout.querySelector('.points-grid');
  const title = txt(layout.querySelector('.points-title'));
  const header = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const headerSpans = header
    ? Array.prototype.slice.call(header.children).filter((child) => child.tagName === 'SPAN')
    : [];
  const domains = headerSpans.slice(1).map(txt).filter(Boolean);
  const rows = [];

  if (grid) {
    nodes(grid, '.points-grid-row:not(.is-head)').forEach((row) => {
      const era = txt(row.querySelector('.points-era'));
      const entries = nodes(row, '.points-cell').map((cell, index) => ({
        domain: domainOf(cell, index, domains),
        value: cellValue(cell),
        filled: cell.classList.contains('has-points'),
      }));
      rows.push({ era, entries });
    });
  }
  return { title, domains, rows };
}

function rowSentence(row) {
  const era = row.era || 'ère non nommée';
  if (!row.entries.length) return `Ère ${era} : aucune colonne de domaine renseignée.`;
  const parts = row.entries.map((entry) => {
    if (!entry.filled) return `${entry.domain} : aucun point`;
    const n = /^\d+$/.test(entry.value) ? Number(entry.value) : 1;
    return `${entry.domain} : ${entry.value} point${plural(n, '', 's')}`;
  });
  return `Ère ${era} — ${parts.join(' ; ')}.`;
}

/* E099-05 : le point courant est relu depuis .points-detail, y compris les
 * familles qui, dans points.js:108-109, sont des <span> enfants directs du
 * détail (le conteneur .points-families n'est pas rempli par la vue). */
function currentPointText(layout) {
  const detail = layout.querySelector('.points-detail');
  if (!detail) return 'Aucun détail de point n’est disponible dans le rendu courant.';

  const title = txt(detail.querySelector('.points-point-title'));
  if (!title) {
    const empty = txt(detail.querySelector('p'));
    return empty || 'Aucun point validé dans ce périmètre.';
  }

  const parts = [`Point courant : ${title}.`];
  const body = txt(detail.querySelector('.points-point-text'));
  if (body) parts.push(body);

  const meta = detail.querySelector('.points-meta');
  if (meta) {
    const values = nodes(meta, 'span').map(txt).filter(Boolean);
    if (values.length) parts.push(`Domaine, échelle, temps et confiance : ${values.join(' · ')}.`);
  }

  const families = [];
  nodes(detail, '.points-families span').forEach((node) => families.push(txt(node)));
  Array.prototype.slice.call(detail.children).forEach((child) => {
    if (child.tagName === 'SPAN') families.push(txt(child));
  });
  const unique = families.map(txt).filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
  if (unique.length) parts.push(`Famille${plural(unique.length, '', 's')} : ${unique.join(', ')}.`);

  const sources = txt(detail.querySelector('.points-sources'));
  if (sources) parts.push(sources);
  const justification = txt(detail.querySelector('.points-justification'));
  if (justification) parts.push(`Justification : ${justification}`);

  return parts.join(' ');
}

/* E099-06 : l'état des filtres est lu sur les deux <select> réels et sur le
 * bouton de réinitialisation, sans supposer leur libellé. */
function filtersText(layout) {
  const filters = layout.querySelector('.points-filters');
  if (!filters) return 'Aucun filtre n’est disponible dans le rendu courant.';
  const selects = nodes(filters, 'select');
  const labels = selects.map((select) => {
    const option = select && select.selectedOptions ? select.selectedOptions[0] : null;
    return txt(option) || txt(select && select.value);
  }).filter(Boolean);
  const hasReset = nodes(filters, 'button').some((button) => /réinitialiser/i.test(txt(button)));
  let text = 'Filtres actifs : ';
  text += labels.length ? `${labels.join(' · ')}.` : 'aucun filtre sélectionné.';
  if (hasReset) text += ' Le bouton « Réinitialiser les filtres » rétablit l’affichage complet.';
  return text;
}

function metricsOf(data) {
  let cells = 0;
  let filled = 0;
  data.rows.forEach((row) => row.entries.forEach((entry) => {
    cells += 1;
    if (entry.filled) filled += 1;
  }));
  return { eras: data.rows.length, domains: data.domains.length, cells, filled, empty: cells - filled };
}

/* E099-01 / E099-03 / E099-04 / E099-05 / E099-06 / E099-08 : construction
 * d'un seul bloc, exclusivement avec ctx.el et des nœuds texte. Le contenu est
 * visible, sémantique et indexable ; aucune écriture n'est destructive. */
function buildAlternative(ctx, section, data, metrics) {
  section.replaceChildren();
  section.setAttribute('role', 'region');
  section.setAttribute('aria-labelledby', ID.heading);
  if (!section.hasAttribute('tabindex')) section.tabIndex = -1;

  const heading = ctx.el('h3', '', 'Alternative textuelle de la matrice (lecture sans style)');
  heading.id = ID.heading;
  section.appendChild(heading);

  const back = ctx.el('a', 'points-e099-back', 'Aller à la grille visuelle');
  back.href = `#${data.gridId}`;
  section.appendChild(back);

  const intro = ctx.el('p', 'points-e099-intro',
    `${data.title || 'Matrice de couverture'} — lecture de la matrice : chaque ligne correspond à une ère, `
    + `chaque colonne à un domaine. Le chiffre indique le nombre de points validés ; la mention « aucun point » `
    + `signale une case vide. Le tableau et les phrases qui suivent restituent la totalité de ces données en texte, `
    + `afin de rester lisibles et compréhensibles même sans feuille de style.`);
  intro.id = ID.intro;
  section.appendChild(intro);

  /* Équivalent tabulaire réel : caption + portées de colonne et de ligne. */
  const table = ctx.el('table', 'points-e099-table');
  table.id = ID.table;
  table.appendChild(ctx.el('caption', '', 'Matrice de couverture — équivalent textuel'));
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  const corner = ctx.el('th', '', 'Ère');
  put(corner, 'scope', 'col');
  headRow.appendChild(corner);
  data.domains.forEach((domain) => {
    const th = ctx.el('th', '', domain);
    put(th, 'scope', 'col');
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = ctx.el('tbody');
  data.rows.forEach((row) => {
    const tr = ctx.el('tr');
    const rowHead = ctx.el('th', '', row.era || 'ère non nommée');
    put(rowHead, 'scope', 'row');
    tr.appendChild(rowHead);
    row.entries.forEach((entry) => {
      const cell = ctx.el('td', '', entry.value);
      put(cell, 'title', `${entry.domain} : ${entry.filled ? entry.value + ' point(s)' : 'aucun point'}`);
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  section.appendChild(table);

  section.appendChild(ctx.el('p', 'points-e099-label', 'Lecture ère par ère'));
  const narrative = ctx.el('ul', 'points-e099-narrative');
  narrative.id = ID.narrative;
  data.rows.forEach((row) => narrative.appendChild(ctx.el('li', '', rowSentence(row))));
  section.appendChild(narrative);

  section.appendChild(ctx.el('p', 'points-e099-label', 'Point courant'));
  const current = ctx.el('p', 'points-e099-current', data.currentText);
  current.id = ID.current;
  section.appendChild(current);

  section.appendChild(ctx.el('p', 'points-e099-label', 'Filtres actifs'));
  const filters = ctx.el('p', 'points-e099-filters', data.filtersText);
  filters.id = ID.filters;
  section.appendChild(filters);

  const caption = data.title
    ? `${data.title} · ${metrics.eras} ère${plural(metrics.eras, '', 's')} · `
      + `${metrics.domains} domaine${plural(metrics.domains, '', 's')} · `
      + `${metrics.cells} cellule${plural(metrics.cells, '', 's')}, `
      + `${metrics.filled} remplie${plural(metrics.filled, '', 's')} et `
      + `${metrics.empty} vide${plural(metrics.empty, '', 's')}.`
    : 'Aucune cellule dans la matrice.';
  const metricsNode = ctx.el('p', 'points-e099-metrics', caption);
  metricsNode.id = ID.metrics;
  section.appendChild(metricsNode);
}

/* E099-07 : liaison non destructive entre la grille visuelle et l'alternative.
 * L'id n'est posé que s'il manque et les références aria-describedby sont
 * fusionnées avec celles déjà portées par une autre lentille. */
function linkGrid(ctx, data) {
  const grid = ctx.layout.querySelector('.points-grid');
  if (!grid) return;
  const gridId = grid.getAttribute('id') || ID.grid;
  if (!grid.getAttribute('id')) put(grid, 'id', gridId);
  data.gridId = gridId;

  const existing = (grid.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const refs = [ID.intro, ID.narrative].filter((id) => document.getElementById(id));
  const merged = Array.from(new Set(existing.concat(refs))).join(' ');
  if (merged) put(grid, 'aria-describedby', merged);
}

function ensureSection(ctx, matrix) {
  let section = document.getElementById(ID.section);
  if (section && section.parentNode !== matrix) section.remove();
  if (!section || !section.isConnected) {
    section = ctx.el('section', 'points-e099-alt');
    section.id = ID.section;
  }
  return section;
}

/* E099-10 : installation idempotente. La feuille est unique (cssOnce), le bloc
 * est réutilisé par identifiant, aucun nœud existant n'est supprimé hors d'un
 * bloc E099 périmé, et aucun timer ni rAF n'est introduit. */
function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const matrix = layout.querySelector('.points-matrix');
  const grid = layout.querySelector('.points-grid');
  if (!matrix || !grid || typeof matrix.appendChild !== 'function') return;

  ctx.css(CSS_ID, CSS);

  const data = readMatrix(ctx);
  data.currentText = currentPointText(layout);
  data.filtersText = filtersText(layout);
  data.gridId = grid.getAttribute('id') || ID.grid;
  const metrics = metricsOf(data);

  const section = ensureSection(ctx, matrix);
  buildAlternative(ctx, section, data, metrics);
  if (section.parentNode !== matrix) matrix.appendChild(section);

  linkGrid(ctx, data);

  /* E099-09 : miroirs d'état auditables, dérivés du DOM réel. */
  if (layout.dataset) {
    layout.dataset.pointsE099Css = CSS_ID;
    layout.dataset.pointsE099Eras = String(metrics.eras);
    layout.dataset.pointsE099Domains = String(metrics.domains);
    layout.dataset.pointsE099Cells = String(metrics.cells);
    layout.dataset.pointsE099Filled = String(metrics.filled);
    layout.dataset.pointsE099Motion = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
      ? 'reduce' : 'normal';
  }
}

register('E099', (ctx) => {
  apply(ctx);
});
