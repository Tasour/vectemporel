/* Vue Histomap : répartition de la population estimée par famille culturelle.
 * D3 local (ISC), aucune requête externe, un seul rendu par changement.
 * Les familles et la table miroir viennent du même jeu de données. */
import {
  select, stack, stackOrderInsideOut, stackOffsetWiggle, area, curveBasis, scaleLinear, max, format,
} from '../../public/d3-bundle.js';
import { MIN_YEAR, MAX_YEAR, yearToRatio } from '../timeline/scale.js';

const COLORS = {
  'Chinois': '#dd8159',
  'Indien': '#d6b24d',
  'Islamique': '#6bbf9b',
  'Européen': '#7fa8e0',
  'Amériques': '#c07ad0',
  'Asie orientale et du Sud-Est': '#59b9c4',
  'non classé': '#6d7683',
};
const TICKS = [-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000];
const pct = (value) => `${Math.round(value * 100)} %`;
const hab = format(',d');

export function createHistomap(host, data, { onYear = () => {}, onTrail = () => {} } = {}) {
  const families = data.meta.families;
  const years = data.years;
  /* Métrique = part de la population estimée, pas valeur absolue : chaque
   * année a la même hauteur, les quatre millénaires restent lisibles. */
  const wide = years.map((year, index) => {
    const row = { year };
    const total = data.totals[index] || 1;
    for (const family of families) row[family] = data.series[family][index] / total;
    return row;
  });
  const stackGen = stack().keys(families).order(stackOrderInsideOut).offset(stackOffsetWiggle);
  const layers = stackGen(wide);
  let mode = 'linear';
  let currentYear = 1000;
  let width = 900;
  const height = 260;
  const margin = { top: 12, right: 148, bottom: 30, left: 8 };

  host.replaceChildren();
  const figure = document.createElement('figure');
  figure.className = 'hm-figure';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'histomap-svg';
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-label', 'Flux des familles culturelles de -2000 à 2000. Flèches gauche et droite pour changer d’année, Début et Fin pour les bornes.');
  const caption = document.createElement('figcaption');
  caption.className = 'hm-caption';
  caption.textContent = `Part de la population estimée par famille, tous les 25 ans. Familles non cataloguées regroupées en « non classé » (${pct(data.meta.max_unclassified_share)} au maximum). Données © Chronas, CC BY-SA 4.0.`;
  figure.append(svg, caption);

  const minimap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  minimap.id = 'histomap-minimap';
  minimap.setAttribute('viewBox', '0 0 900 56');
  minimap.setAttribute('role', 'img');
  minimap.setAttribute('tabindex', '0');
  minimap.setAttribute('aria-label', 'Vue d’ensemble de la population totale. Cliquer pour choisir une année.');

  const tip = document.createElement('div');
  tip.id = 'histomap-tip';
  tip.className = 'hm-tip';
  tip.setAttribute('role', 'status');
  tip.setAttribute('aria-live', 'polite');
  tip.hidden = true;

  const table = document.createElement('table');
  table.id = 'histomap-table';
  table.className = 'hm-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of ['Famille', 'Part', 'Population']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  table.append(thead, tbody);
  const hmYear = document.createElement('p');
  hmYear.className = 'hm-year';
  hmYear.id = 'histomap-year';
  host.append(figure, minimap, tip, hmYear, table);

  const x = (year) => (mode === 'recent' ? yearToRatio(year, 'recent') : (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR))
    * (width - margin.left - margin.right) + margin.left;
  const yMax = max(layers, (layer) => max(layer, (point) => point[1]));
  const yMin = Math.min(0, ...layers.flat().map((point) => point[0]));
  const y = scaleLinear().domain([yMin, yMax]).range([height - margin.bottom, margin.top]);

  function indexForYear(year) {
    let best = 0;
    let distance = Infinity;
    for (let index = 0; index < years.length; index += 1) {
      const delta = Math.abs(years[index] - year);
      if (delta < distance) { distance = delta; best = index; }
    }
    return best;
  }

  function showTip(family, value, total, year) {
    const share = total ? value / total : 0;
    tip.textContent = `${family} · ${hab(value)} habitants · ${pct(share)} de la population estimée en ${year} · Chronas CC BY-SA 4.0`;
    tip.hidden = false;
  }

  function render(year = currentYear) {
    currentYear = year;
    const index = indexForYear(year);
    const total = data.totals[index] || 1;
    const svgSel = select(svg);
    svgSel.selectAll('*').remove();
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const defs = svgSel.append('defs');
    const pattern = defs.append('pattern')
      .attr('id', 'hm-hatch').attr('width', 6).attr('height', 6)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern.append('rect').attr('width', 6).attr('height', 6).attr('fill', COLORS['non classé']);
    pattern.append('path').attr('d', 'M0 6 L6 0').attr('stroke', '#aab3c0').attr('stroke-width', 1.2);

    const generator = area()
      .x((point) => x(point.data.year))
      .y0((point) => y(point[0]))
      .y1((point) => y(point[1]))
      .curve(curveBasis);

    for (const layer of layers) {
      const family = layer.key;
      svgSel.append('path')
        .attr('class', 'hm-band')
        .attr('d', generator(layer))
        .attr('fill', family === 'non classé' ? 'url(#hm-hatch)' : COLORS[family])
        .attr('fill-opacity', 0.88)
        .attr('data-key', family)
        .attr('data-tip', `${family} · ${hab(data.series[family][index])} habitants · ${pct(data.series[family][index] / total)} en ${years[index]}`)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', `${family} : ${hab(data.series[family][index])} habitants, ${pct(data.series[family][index] / total)} en ${years[index]}`)
        .on('pointerenter focus', () => showTip(family, data.series[family][index], total, years[index]))
        .on('pointerleave blur', () => { tip.hidden = true; })
        .on('click keydown', (event) => {
          if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onYear(years[index]);
          onTrail(family, years[index]);
        });
      const last = layer[layer.length - 1];
      const labelY = (y(last[0]) + y(last[1])) / 2;
      svgSel.append('text')
        .attr('class', 'hm-label')
        .attr('x', width - margin.right + 8)
        .attr('y', Math.max(14, Math.min(height - margin.bottom, labelY)))
        .attr('fill', family === 'non classé' ? '#c6ced9' : COLORS[family])
        .text(family === 'Asie orientale et du Sud-Est' ? 'Asie orientale' : family);
    }

    for (const tick of TICKS) {
      svgSel.append('line')
        .attr('class', 'hm-grid')
        .attr('x1', x(tick)).attr('x2', x(tick))
        .attr('y1', margin.top).attr('y2', height - margin.bottom);
      svgSel.append('text')
        .attr('class', 'hm-tick')
        .attr('x', x(tick))
        .attr('y', height - 8)
        .attr('text-anchor', 'middle')
        .text(tick < 0 ? `−${-tick}` : String(tick));
    }
    svgSel.append('line')
      .attr('class', 'hm-cursor')
      .attr('x1', x(years[index])).attr('x2', x(years[index]))
      .attr('y1', margin.top - 6).attr('y2', height - margin.bottom + 4);

    /* Minimap : population totale en échelle linéaire, repère mobile. */
    const miniSel = select(minimap);
    miniSel.selectAll('*').remove();
    const mx = scaleLinear().domain([MIN_YEAR, MAX_YEAR]).range([4, 896]);
    const my = scaleLinear().domain([0, yMax]).range([50, 6]);
    const points = years.map((year, position) => `${mx(year)},${my(data.totals[position])}`).join(' ');
    miniSel.append('polyline').attr('class', 'hm-mini-line').attr('points', points);
    miniSel.append('line')
      .attr('class', 'hm-mini-cursor')
      .attr('x1', mx(years[index])).attr('x2', mx(years[index]))
      .attr('y1', 2).attr('y2', 54);

    hmYear.textContent = `Année ${years[index]} · population estimée ${hab(total)} habitants · échelle ${mode === 'recent' ? 'récents' : 'linéaire'}.`;
    tbody.replaceChildren();
    for (const family of families) {
      const row = document.createElement('tr');
      row.dataset.key = family;
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = family;
      const share = document.createElement('td');
      share.textContent = pct(data.series[family][index] / total);
      const value = document.createElement('td');
      value.textContent = `${hab(data.series[family][index])} hab`;
      row.append(th, share, value);
      tbody.appendChild(row);
    }
    /* Mobile : le graphique défile horizontalement ; on amène l'année
     * courante dans la zone visible sans réduire le texte. */
    const figureEl = host.querySelector('.hm-figure');
    if (figureEl && figureEl.scrollWidth > figureEl.clientWidth + 4) {
      const rendered = svg.getBoundingClientRect().width || width;
      const position = x(years[index]) * (rendered / width) - figureEl.clientWidth / 2;
      figureEl.scrollLeft = Math.max(0, Math.min(figureEl.scrollWidth, position));
    }
  }

  function setMode(next) {
    mode = next === 'recent' ? 'recent' : 'linear';
    render();
  }

  function go(delta) {
    const index = indexForYear(currentYear);
    const next = Math.max(0, Math.min(years.length - 1, index + delta));
    onYear(years[next]);
    render(years[next]);
  }

  svg.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
    else if (event.key === 'Home') { event.preventDefault(); onYear(MIN_YEAR); render(MIN_YEAR); }
    else if (event.key === 'End') { event.preventDefault(); onYear(MAX_YEAR); render(MAX_YEAR); }
    else if (event.key === 'Escape') { tip.hidden = true; }
  });
  minimap.addEventListener('click', (event) => {
    const rect = minimap.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const year = Math.round(MIN_YEAR + ratio * (MAX_YEAR - MIN_YEAR));
    onYear(year);
    render(year);
  });
  minimap.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-4); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); go(4); }
  });

  const observer = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver((entries) => {
      const next = Math.max(320, Math.round(entries[0].contentRect.width));
      if (Math.abs(next - width) < 8) return;
      width = next;
      render();
    })
    : null;
  observer?.observe(host);

  render();
  return {
    render,
    setMode,
    getState: () => ({ open: true, year: currentYear, mode, samples: years.length }),
    destroy() {
      observer?.disconnect();
      host.replaceChildren();
    },
  };
}
