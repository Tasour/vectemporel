/* Mode « Histographie » — réimplémentation originale du comportement observé sur
 * histography.io (aucun code ni asset copié, voir docs/architecture/HISTOGRAPHE-SPEC.md).
 * Canvas local, disposition déterministe, zéro réseau, aucune boucle continue. */
import { EPICS, epicYear, categoryOf } from '../timeline/epics.js';
import { TURNING_POINTS } from '../data/turning-points.js';
import { MIN_YEAR, MAX_YEAR } from '../timeline/scale.js';

const CATEGORY_LABELS = {
  guerre: 'Guerres', empire: 'Empires', personne: 'Personnes', autre: 'Autres',
  rupture: 'Ruptures', province: 'Provinces', religion: 'Religions',
};
const ERAS = [
  ['Antiquité', -2000, 500], ['Moyen Âge', 500, 1500],
  ['Moderne', 1500, 1800], ['Contemporain', 1800, 2000],
];

function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function createHistography(host, { province = null, onEvent = () => {} } = {}) {
  host.replaceChildren();
  const shell = document.createElement('div');
  shell.className = 'histo-shell';
  const menu = document.createElement('aside');
  menu.className = 'histo-menu';
  menu.innerHTML = '<h2>HISTOGRAPHIE</h2><p class="histo-sub">Chaque point est un événement.</p>'
    + '<button type="button" id="histo-mode" class="histo-mode" aria-pressed="false">Lire les récits →</button>'
    + '<ul class="histo-categories"></ul>';
  const stage = document.createElement('div');
  stage.className = 'histo-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'histo-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Champ d’événements historiques. Flèches pour parcourir les années, Entrée pour ouvrir un événement.');
  const cursor = document.createElement('div');
  cursor.className = 'histo-cursor';
  const cursorYear = document.createElement('div');
  cursorYear.className = 'histo-cursor-year';
  const card = document.createElement('div');
  card.className = 'histo-card';
  card.hidden = true;
  const recits = document.createElement('div');
  recits.className = 'histo-recits';
  recits.hidden = true;
  recits.setAttribute('role', 'region');
  recits.setAttribute('aria-label', 'Récits éditoriaux');
  stage.append(canvas, cursor, cursorYear, card, recits);
  const footer = document.createElement('footer');
  footer.className = 'histo-footer';
  footer.innerHTML = '<div class="histo-eras"></div><div class="histo-range"><input type="number" id="histo-from" aria-label="Année de début" min="-2000" max="2000"><input type="number" id="histo-to" aria-label="Année de fin" min="-2000" max="2000"></div>';
  shell.append(menu, stage, footer);
  host.appendChild(shell);

  const events = [];
  for (const epic of EPICS) {
    events.push({
      id: epic[0], year: epicYear(epic), title: epic[1],
      category: categoryOf(epic[4]), source: 'Chronas CC BY-SA 4.0',
    });
  }
  for (const point of TURNING_POINTS.points) {
    events.push({
      id: `turn-${point.year}`, year: point.year,
      title: `Rupture · ${point.provinces[0] || 'région'}`,
      category: 'rupture', source: 'Extrait Chronas CC BY-SA 4.0',
    });
  }
  if (province) {
    for (const point of TURNING_POINTS.points.filter((item) => item.provinces.includes(province))) {
      events.push({
        id: `prov-${point.year}`, year: point.year,
        title: `${province} · ${point.rulers} souverains`,
        category: 'province', source: 'Extrait Chronas CC BY-SA 4.0',
      });
    }
  }

  let from = MIN_YEAR;
  let to = MAX_YEAR;
  let activeCategory = null;
  let hovered = null;
  let points = [];
  let mode = 'frise';
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  function visibleEvents() {
    return events.filter((event) => event.year >= from && event.year <= to
      && (!activeCategory || event.category === activeCategory));
  }

  /* Sélection éditoriale déterministe : ruptures et faits de province en priorité,
   * puis échantillonnage régulier des autres épiques pour couvrir toute la plage. */
  function curatedStories() {
    const shown = visibleEvents().slice().sort((a, b) => a.year - b.year);
    const limit = Math.min(40, shown.length);
    const priority = shown
      .filter((event) => event.category === 'rupture' || event.category === 'province')
      .slice(0, 12);
    const rest = shown.filter((event) => !priority.includes(event));
    const quota = Math.max(0, limit - priority.length);
    const step = quota ? Math.max(1, Math.ceil(rest.length / quota)) : Infinity;
    const sampled = rest.filter((_, index) => index % step === 0).slice(0, quota);
    return [...priority, ...sampled].sort((a, b) => a.year - b.year).slice(0, limit);
  }

  function renderRecits() {
    recits.replaceChildren();
    for (const [label, a, b] of ERAS) {
      const stories = curatedStories().filter((event) => event.year >= a && event.year < b);
      if (!stories.length) continue;
      const section = document.createElement('section');
      section.className = 'histo-recit-era';
      const heading = document.createElement('h3');
      heading.textContent = label;
      const list = document.createElement('ul');
      for (const event of stories) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'histo-recit';
        const year = document.createElement('span');
        year.className = 'histo-recit-year';
        year.textContent = event.year < 0 ? `${-event.year} av. J.-C.` : `${event.year}`;
        const title = document.createElement('span');
        title.className = 'histo-recit-title';
        title.textContent = event.title;
        const category = document.createElement('span');
        category.className = 'histo-recit-cat';
        category.textContent = CATEGORY_LABELS[event.category] || event.category;
        button.append(year, title, category);
        button.addEventListener('click', () => onEvent(event));
        item.appendChild(button);
        list.appendChild(item);
      }
      section.append(heading, list);
      recits.appendChild(section);
    }
  }

  function setMode(next) {
    mode = next === 'recits' ? 'recits' : 'frise';
    const isRecits = mode === 'recits';
    recits.hidden = !isRecits;
    canvas.hidden = isRecits;
    cursor.hidden = isRecits;
    cursorYear.hidden = isRecits;
    card.hidden = true;
    const toggle = menu.querySelector('#histo-mode');
    toggle.textContent = isRecits ? '← Voir la frise' : 'Lire les récits →';
    toggle.setAttribute('aria-pressed', String(isRecits));
    refresh();
  }

  function refresh() {
    if (mode === 'recits') renderRecits();
    else draw();
  }

  function draw() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, 0, width, height);
    points = [];
    const shown = visibleEvents();
    for (const event of shown) {
      const seed = hash(event.id);
      const x = 30 + ((event.year - from) / Math.max(1, to - from)) * (width - 60);
      const lane = seed % 24;
      const y = 40 + lane * ((height - 80) / 24);
      const size = hovered === event ? 7 : 3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = hovered === event ? '#ffffff' : 'rgba(255,255,255,.82)';
      ctx.fill();
      points.push({ event, x, y });
    }
  }

  function renderCategories() {
    const counts = new Map();
    for (const event of events) counts.set(event.category, (counts.get(event.category) || 0) + 1);
    const list = menu.querySelector('.histo-categories');
    list.replaceChildren();
    for (const [category, count] of [...counts].sort((a, b) => b[1] - a[1])) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'histo-category';
      button.textContent = `${CATEGORY_LABELS[category] || category} — ${count}`;
      button.setAttribute('aria-pressed', String(activeCategory === category));
      button.addEventListener('click', () => {
        activeCategory = activeCategory === category ? null : category;
        hovered = null;
        card.hidden = true;
        renderCategories();
        refresh();
      });
      item.appendChild(button);
      list.appendChild(item);
    }
  }

  function renderEras() {
    const hostEras = footer.querySelector('.histo-eras');
    hostEras.replaceChildren();
    for (const [label, a, b] of ERAS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        from = a; to = b;
        footer.querySelector('#histo-from').value = String(a);
        footer.querySelector('#histo-to').value = String(b);
        refresh();
      });
      hostEras.appendChild(button);
    }
  }

  function showCard(event, x, y) {
    card.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = event.title;
    const meta = document.createElement('p');
    meta.textContent = `${event.year < 0 ? `${-event.year} av. J.-C.` : `${event.year} apr. J.-C.`} · ${event.source}`;
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = 'Ouvrir le récit lié';
    action.addEventListener('click', () => onEvent(event));
    card.append(title, meta, action);
    card.hidden = false;
    card.style.left = `${Math.min(x + 12, stage.clientWidth - 220)}px`;
    card.style.top = `${Math.min(y + 12, stage.clientHeight - 120)}px`;
  }

  const onMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cursor.style.left = `${x}px`;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    cursorYear.textContent = String(Math.round(from + ratio * (to - from)));
    const nearest = points.find((point) => Math.hypot(point.x - x, point.y - y) < 12);
    if (nearest !== hovered) { hovered = nearest?.event || null; draw(); }
  };
  const onLeave = () => { hovered = null; card.hidden = true; draw(); };
  const onClick = () => { if (hovered) showCard(hovered, points.find((p) => p.event === hovered).x, points.find((p) => p.event === hovered).y); };
  const onKey = (event) => {
    if (event.key === 'ArrowRight') { to = Math.min(MAX_YEAR, to + 25); from = Math.min(from, to - 25); draw(); }
    else if (event.key === 'ArrowLeft') { from = Math.max(MIN_YEAR, from - 25); draw(); }
  };
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('keydown', onKey);
  const onFrom = (event) => { from = Math.min(to - 1, Math.max(MIN_YEAR, Number(event.target.value) || MIN_YEAR)); refresh(); };
  const onTo = (event) => { to = Math.max(from + 1, Math.min(MAX_YEAR, Number(event.target.value) || MAX_YEAR)); refresh(); };
  footer.querySelector('#histo-from').addEventListener('change', onFrom);
  footer.querySelector('#histo-to').addEventListener('change', onTo);
  footer.querySelector('#histo-from').value = String(from);
  footer.querySelector('#histo-to').value = String(to);
  const onResize = () => draw();
  window.addEventListener('resize', onResize);

  menu.querySelector('#histo-mode').addEventListener('click', () => {
    setMode(mode === 'recits' ? 'frise' : 'recits');
  });

  renderCategories();
  renderEras();
  draw();

  return {
    destroy() {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('keydown', onKey);
      host.replaceChildren();
    },
    state: () => ({ from, to, category: activeCategory, mode, events: visibleEvents().length, stories: mode === 'recits' ? curatedStories().length : 0 }),
  };
}
