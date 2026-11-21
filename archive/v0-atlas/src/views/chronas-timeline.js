/* Timeline « dots » inspirée de Histography — réimplémentation originale.
 * Aucune copie de code : canvas statique redessiné uniquement sur changement,
 * zéro boucle rAF, zéro réseau, déterminisme par graine affichée.
 * Données © Chronas, CC BY-SA 4.0 (voir DATA-LICENSE.md). */
import { CHRONAS_SNAPSHOT } from '../data/chronas-snapshot.js';

const SEED = 20261121;
const mulberry32 = (seed) => () => {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function collect() {
  const seen = new Map();
  for (const [year, data] of Object.entries(CHRONAS_SNAPSHOT.years || {})) {
    for (const marker of data.markers || []) {
      const [coo, eventYear, end, name, type] = marker;
      if (!name || !Number.isFinite(eventYear)) continue;
      const key = `${name}|${eventYear}`;
      if (seen.has(key)) continue;
      seen.set(key, { name, year: eventYear, end, type: type || 'autre', coo, sourceYear: Number(year) });
    }
  }
  return [...seen.values()].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name, 'fr'));
}

const ALL = collect();
const TYPES = [...new Set(ALL.map((item) => item.type))].sort();
const MIN_YEAR = ALL.length ? Math.min(...ALL.map((item) => item.year)) : 0;
const MAX_YEAR = ALL.length ? Math.max(...ALL.map((item) => item.year)) : 1;

export function chronasDiagnostics() {
  return {
    source: CHRONAS_SNAPSHOT.meta.source,
    license: CHRONAS_SNAPSHOT.meta.license,
    version: CHRONAS_SNAPSHOT.meta.api_version,
    years: Object.keys(CHRONAS_SNAPSHOT.years || {}).length,
    dots: ALL.length,
    seed: SEED,
  };
}

export function renderChronasTimeline(host, onPick) {
  const section = el('section', 'chronas-timeline');
  section.setAttribute('aria-label', 'Frise historique mondiale — points Chronas');
  const head = el('div', 'chronas-head');
  head.append(
    el('span', 'view-kicker', 'Atlas mondial · données Chronas CC BY-SA 4.0'),
    el('h2', 'chronas-title', 'Chaque point est un événement'),
  );
  section.appendChild(head);

  const toolbar = el('div', 'chronas-tools');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Outils de la frise mondiale');

  const year = el('input');
  year.type = 'range';
  year.id = 'chronas-year';
  year.min = String(MIN_YEAR);
  year.max = String(MAX_YEAR);
  year.value = String(MAX_YEAR);
  year.setAttribute('aria-label', 'Année de référence');
  year.setAttribute('aria-valuetext', String(MAX_YEAR));

  const category = el('select');
  category.id = 'chronas-category';
  category.setAttribute('aria-label', 'Filtrer par type');
  for (const type of ['tous', ...TYPES]) {
    const option = el('option', '', type === 'tous' ? 'Tous les types' : type);
    option.value = type;
    category.appendChild(option);
  }

  const lucky = el('button', 'chronas-lucky', '✦ Feeling lucky');
  lucky.type = 'button';
  toolbar.append(year, category, lucky);
  section.appendChild(toolbar);

  const canvas = el('canvas', 'chronas-canvas');
  canvas.id = 'chronas-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Nuage de points historiques. Flèches gauche et droite pour parcourir, Entrée pour ouvrir.');
  section.appendChild(canvas);

  const readout = el('p', 'chronas-readout');
  readout.id = 'chronas-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  section.appendChild(readout);

  const footer = el('p', 'chronas-credits', `Historical data © Chronas, CC BY-SA 4.0 · graine ${SEED} · ${ALL.length} événements · ${CHRONAS_SNAPSHOT.meta.api_version}`);
  section.appendChild(footer);

  let selected = -1;
  let dots = [];
  const ctx = canvas.getContext('2d');

  function visible() {
    const value = category.value;
    return ALL.filter((item) => value === 'tous' || item.type === value);
  }

  function draw() {
    if (!ctx) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(240, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b0f15';
    ctx.fillRect(0, 0, width, height);

    const list = visible();
    const span = Math.max(1, MAX_YEAR - MIN_YEAR);
    const random = mulberry32(SEED);
    dots = list.map((item) => {
      const x = 16 + ((item.year - MIN_YEAR) / span) * (width - 32);
      const lane = Math.max(0, TYPES.indexOf(item.type));
      const y = 18 + ((lane + 0.5) / Math.max(1, TYPES.length)) * (height - 36) + (random() - 0.5) * 18;
      return { item, x, y: Math.max(12, Math.min(height - 12, y)) };
    });

    const reference = Number(year.value);
    ctx.strokeStyle = 'rgba(230,185,111,.35)';
    ctx.beginPath();
    const markerX = 16 + ((reference - MIN_YEAR) / span) * (width - 32);
    ctx.moveTo(markerX, 8);
    ctx.lineTo(markerX, height - 8);
    ctx.stroke();

    dots.forEach((dot, index) => {
      const near = Math.abs(dot.item.year - reference) <= Math.max(20, span / 40);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, index === selected ? 7 : near ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = index === selected ? '#f4d69e' : near ? '#e6b96f' : 'rgba(127,156,255,.55)';
      ctx.fill();
    });
  }

  function announce() {
    if (selected < 0 || !dots[selected]) {
      readout.textContent = `${dots.length} événements affichés. Année ${year.value}.`;
      return;
    }
    const dot = dots[selected];
    readout.textContent = `${dot.item.name} · ${dot.item.year} · ${dot.item.type}. ${selected + 1}/${dots.length}.`;
  }

  function refresh() {
    draw();
    announce();
  }

  year.addEventListener('input', () => {
    year.setAttribute('aria-valuetext', year.value);
    refresh();
  });
  category.addEventListener('change', () => { selected = -1; refresh(); });
  lucky.addEventListener('click', () => {
    const list = visible();
    if (!list.length) return;
    const random = mulberry32(SEED + Number(year.value));
    selected = Math.floor(random() * list.length);
    refresh();
    onPick?.(dots[selected]?.item);
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best = -1;
    let distance = 144;
    dots.forEach((dot, index) => {
      const d = (dot.x - x) ** 2 + (dot.y - y) ** 2;
      if (d < distance) { distance = d; best = index; }
    });
    if (best !== selected) { selected = best; refresh(); }
  });
  canvas.addEventListener('click', () => {
    if (selected >= 0) onPick?.(dots[selected]?.item);
  });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      selected = Math.max(0, Math.min(dots.length - 1, selected + (event.key === 'ArrowRight' ? 1 : -1)));
      refresh();
    } else if (event.key === 'Enter' && selected >= 0) {
      event.preventDefault();
      event.stopPropagation();
      onPick?.(dots[selected]?.item);
    }
  });

  host.appendChild(section);
  refresh();
  return {
    node: section,
    focusTarget: canvas,
    destroy: () => section.remove(),
  };
}
