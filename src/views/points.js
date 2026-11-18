/* Vue dédiée à l'isolation de tous les points validés. */
import { state, currentCountry, selectEra } from '../domain/store.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function familiesOf(point) {
  return Array.isArray(point.families) ? point.families : [];
}

export function renderPoints(stage) {
  const country = currentCountry();
  if (!country) return;
  const points = country.points || [];
  const domains = [...new Set(points.map((point) => point.domain))].sort((a, b) => a.localeCompare(b, 'fr'));
  const families = [...new Set(points.flatMap(familiesOf))].sort((a, b) => a.localeCompare(b, 'fr'));
  const era = country.eras[state.eraIndex];
  let visible = points;
  if (state.pointFilterDomain !== '*') visible = visible.filter((point) => point.domain === state.pointFilterDomain);
  if (state.pointFilterFamily !== '*') visible = visible.filter((point) => familiesOf(point).includes(state.pointFilterFamily));
  if (era) visible = visible.filter((point) => point.eraId === era.id);
  const selected = visible[state.pointIndex] || visible[0];

  const layout = el('div', 'points-layout');
  const matrix = el('section', 'points-matrix');
  matrix.appendChild(el('div', 'view-kicker', 'Matrice de couverture · points validés'));
  matrix.appendChild(el('h2', 'points-title', `${points.length} points isolés`));
  const grid = el('div', 'points-grid');
  const header = el('div', 'points-grid-row is-head');
  header.appendChild(el('span', '', 'Ère'));
  domains.forEach((domain) => header.appendChild(el('span', '', domain)));
  grid.appendChild(header);
  country.eras.forEach((item, index) => {
    const row = el('div', `points-grid-row${index === state.eraIndex ? ' is-active' : ''}`);
    const label = el('button', 'points-era', item.name);
    label.type = 'button';
    label.addEventListener('click', () => selectEra(index));
    row.appendChild(label);
    domains.forEach((domain) => {
      const count = points.filter((point) => point.eraId === item.id && point.domain === domain).length;
      const cell = el('button', `points-cell${count ? ' has-points' : ''}`, count ? String(count) : '·');
      cell.type = 'button';
      cell.title = `${item.name} · ${domain} · ${count} point(s)`;
      cell.addEventListener('click', () => {
        selectEra(index);
        state.pointFilterDomain = domain;
        import('../domain/store.js').then(({ set }) => set({ view: 'points', pointFilterDomain: domain, pointIndex: 0 }, 'filter'));
      });
      row.appendChild(cell);
    });
    grid.appendChild(row);
  });
  matrix.appendChild(grid);

  const filters = el('div', 'points-filters');
  const domainSelect = el('select');
  domainSelect.setAttribute('aria-label', 'Filtrer par domaine');
  [['*', 'Tous les domaines'], ...domains.map((domain) => [domain, domain])].forEach(([value, label]) => {
    const option = el('option', '', label);
    option.value = value;
    if (value === state.pointFilterDomain) option.selected = true;
    domainSelect.appendChild(option);
  });
  domainSelect.addEventListener('change', () => {
    state.pointFilterDomain = domainSelect.value;
    import('../domain/store.js').then(({ set }) => set({ view: 'points', pointIndex: 0 }, 'filter'));
  });
  const familySelect = el('select');
  familySelect.setAttribute('aria-label', 'Filtrer par famille');
  [['*', 'Toutes les familles'], ...families.map((family) => [family, family])].forEach(([value, label]) => {
    const option = el('option', '', label);
    option.value = value;
    if (value === state.pointFilterFamily) option.selected = true;
    familySelect.appendChild(option);
  });
  familySelect.addEventListener('change', () => {
    state.pointFilterFamily = familySelect.value;
    import('../domain/store.js').then(({ set }) => set({ view: 'points', pointIndex: 0 }, 'filter'));
  });
  const clear = el('button', '', 'Réinitialiser les filtres');
  clear.type = 'button';
  clear.addEventListener('click', () => {
    state.pointFilterDomain = '*';
    state.pointFilterFamily = '*';
    import('../domain/store.js').then(({ set }) => set({ view: 'points', pointIndex: 0 }, 'filter'));
  });
  filters.append(domainSelect, familySelect, clear);
  matrix.appendChild(filters);

  const detail = el('aside', 'points-detail');
  detail.appendChild(el('div', 'view-kicker', `${visible.length} point(s) dans ce périmètre`));
  if (selected) {
    detail.appendChild(el('h3', 'points-point-title', selected.subject));
    detail.appendChild(el('p', 'points-point-text', selected.text));
    const meta = el('div', 'points-meta');
    meta.append(
      el('span', '', selected.domain),
      el('span', '', selected.scale),
      el('span', '', selected.time),
      el('span', `confidence is-${selected.confidence}`, selected.confidence)
    );
    detail.appendChild(meta);
    const list = el('div', 'points-families');
    familiesOf(selected).forEach((family) => detail.appendChild(el('span', '', family)));
    if (selected.sources.length) detail.appendChild(el('p', 'points-sources', `Sources : ${selected.sources.join(', ')}`));
    detail.appendChild(el('p', 'points-justification', selected.justification));
  } else {
    detail.appendChild(el('p', '', 'Aucun point validé dans ce périmètre. Les agents par ère travaillent encore à la couverture.'));
  }
  const nav = el('div', 'points-nav');
  const prev = el('button', '', '← Point précédent');
  const next = el('button', '', 'Point suivant →');
  prev.type = next.type = 'button';
  prev.addEventListener('click', () => import('../domain/store.js').then(({ set }) => set({ pointIndex: Math.max(0, state.pointIndex - 1) }, 'point')));
  next.addEventListener('click', () => import('../domain/store.js').then(({ set }) => set({ pointIndex: Math.min(visible.length - 1, state.pointIndex + 1) }, 'point')));
  nav.append(prev, next);
  detail.appendChild(nav);

  layout.append(matrix, detail);
  stage.appendChild(layout);
}
