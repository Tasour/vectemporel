/* Champ d'événements d'un sujet — stack d'origine Histography (jQuery + PixiJS 3).
 * Les scripts locaux sont chargés à la demande ; aucun appel réseau au runtime.
 * Les points deviennent des carrés : direction artistique demandée.
 * Mobile : en-tête visible, carrés tactiles, feuille inférieure, glissement. */
const CACHE = [];
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (CACHE.includes(src)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => { CACHE.push(src); resolve(); };
    script.onerror = () => reject(new Error(`Chargement impossible : ${src}`));
    document.head.appendChild(script);
  });
}
async function ensurePixi() {
  await loadScript('./public/histography/jquery-1.10.2.min.js');
  await loadScript('./public/histography/plugins.js');
  if (!window.PIXI) throw new Error('PixiJS indisponible');
  return window.PIXI;
}
function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
const yearLabel = (year) => year < 0 ? `${-year} av. J.-C.` : String(year);
const PERIODS = [
  ['Antiquité', -2000, 500], ['Moyen Âge', 500, 1500],
  ['Moderne', 1500, 1800], ['Contemporain', 1800, 2100],
];

export async function createSubjectField(host, data, { onArticle = () => {}, onClose = () => {} } = {}) {
  host.replaceChildren();
  const PIXI = await ensurePixi();
  const mobile = () => window.innerWidth < 760;
  const shell = document.createElement('div');
  shell.className = 'subject-shell';

  const header = document.createElement('header');
  header.className = 'subject-header';
  header.innerHTML = `<h2>${data.meta.title}</h2><p class="subject-count">${data.articles.length} articles Wikipédia · CC BY-SA 4.0</p>`;
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'subject-back';
  backButton.id = 'subject-back';
  backButton.setAttribute('aria-label', 'Retour au globe');
  backButton.textContent = '← Globe';
  backButton.addEventListener('click', onClose);
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'subject-close';
  closeButton.id = 'subject-close';
  closeButton.setAttribute('aria-label', 'Fermer le sujet');
  closeButton.textContent = '✕';
  closeButton.addEventListener('click', onClose);
  header.append(backButton, closeButton);

  const menu = document.createElement('aside');
  menu.className = 'subject-menu';
  const menuTitle = document.createElement('h3');
  menuTitle.textContent = data.meta.title;
  const menuSub = document.createElement('p');
  menuSub.className = 'subject-sub';
  menuSub.textContent = `${data.articles.length} articles Wikipédia`;
  const modeButton = document.createElement('button');
  modeButton.type = 'button';
  modeButton.className = 'subject-mode';
  modeButton.textContent = 'Lire les récits →';
  modeButton.setAttribute('aria-pressed', 'false');
  const sourceNote = document.createElement('p');
  sourceNote.className = 'subject-source';
  sourceNote.textContent = 'Articles archivés localement · CC BY-SA 4.0';
  menu.append(menuTitle, menuSub, modeButton, sourceNote);

  const stage = document.createElement('div');
  stage.className = 'subject-stage';
  const canvasHost = document.createElement('div');
  canvasHost.className = 'subject-canvas';
  canvasHost.tabIndex = 0;
  canvasHost.setAttribute('role', 'img');
  canvasHost.setAttribute('aria-label', 'Champ d’articles. Flèches pour parcourir les années, Entrée pour ouvrir un article.');
  const axis = document.createElement('div');
  axis.className = 'subject-axis';
  axis.setAttribute('aria-hidden', 'true');
  const cursor = document.createElement('div');
  cursor.className = 'subject-cursor';
  const cursorYear = document.createElement('div');
  cursorYear.className = 'subject-cursor-year';
  cursorYear.hidden = true;
  const card = document.createElement('div');
  card.className = 'subject-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Article sélectionné');
  card.hidden = true;
  const cardClose = document.createElement('button');
  cardClose.type = 'button';
  cardClose.className = 'subject-card-close';
  cardClose.setAttribute('aria-label', 'Fermer la fiche article');
  cardClose.textContent = '✕';
  cardClose.addEventListener('click', () => { card.hidden = true; });
  card.appendChild(cardClose);
  const recits = document.createElement('div');
  recits.className = 'subject-recits';
  recits.hidden = true;
  stage.append(canvasHost, axis, cursor, cursorYear, card, recits);

  const footer = document.createElement('footer');
  footer.className = 'subject-footer';
  const periods = document.createElement('div');
  periods.className = 'subject-periods';
  for (const [label, a, b] of PERIODS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'subject-period';
    button.textContent = label;
    button.addEventListener('click', () => { from = a; to = b; update(); });
    periods.appendChild(button);
  }
  const readout = document.createElement('p');
  readout.className = 'subject-range';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  footer.append(periods, readout);

  const drawer = document.createElement('button');
  drawer.type = 'button';
  drawer.className = 'subject-drawer';
  drawer.id = 'subject-drawer';
  drawer.setAttribute('aria-label', 'Afficher les options');
  drawer.textContent = '☰';
  drawer.addEventListener('click', () => document.body.classList.toggle('subject-drawer'));

  shell.append(header, menu, stage, footer, drawer);
  host.appendChild(shell);

  const years = data.articles.map((article) => article.year).filter(Number.isFinite);
  const min = years.length ? Math.min(...years) : -2000;
  const max = years.length ? Math.max(...years) : 2000;
  let from = min;
  let to = max;
  let hovered = null;
  let mode = 'field';
  let raf = null;
  let hidden = document.hidden;
  let dragStart = null;

  const renderer = PIXI.autoDetectRenderer(Math.max(320, stage.clientWidth), Math.max(240, stage.clientHeight), {
    backgroundColor: 0x9a9a9a, antialias: true,
  });
  const stagePixi = new PIXI.Stage();
  canvasHost.appendChild(renderer.view);
  const squares = [];
  const graphics = new PIXI.Graphics();
  stagePixi.addChild(graphics);

  function visible() {
    return data.articles.filter((article) => article.year >= from && article.year <= to);
  }
  function updateAxis() {
    axis.replaceChildren();
    for (let index = 0; index <= 4; index += 1) {
      const label = document.createElement('span');
      label.textContent = yearLabel(Math.round(from + (index / 4) * (to - from)));
      axis.appendChild(label);
    }
    readout.textContent = `${visible().length} articles · ${yearLabel(Math.round(from))} → ${yearLabel(Math.round(to))}`;
  }
  function draw() {
    const width = Math.max(320, stage.clientWidth);
    const height = Math.max(240, stage.clientHeight);
    renderer.resize(width, height);
    graphics.clear();
    squares.length = 0;
    const size = mobile() ? 14 : 9;
    const gap = size + 8;
    const baseline = height / 2;
    const columns = new Map();
    for (const article of visible()) {
      if (!columns.has(article.year)) columns.set(article.year, []);
      columns.get(article.year).push(article);
    }
    for (const [year, list] of columns) {
      const x = 28 + ((year - from) / Math.max(1, to - from)) * (width - 56);
      list.forEach((article, index) => {
        const level = Math.floor(index / 2) + 1;
        const sign = index % 2 === 0 ? -1 : 1;
        const y = Math.max(24, Math.min(height - 24, baseline + sign * level * gap));
        graphics.beginFill(0xffffff, hovered === article ? 1 : 0.88);
        graphics.drawRect(x - size / 2, y - size / 2, size, size);
        graphics.endFill();
        squares.push({ article, x, y });
      });
    }
    renderer.render(stagePixi);
    updateAxis();
  }
  function loop() {
    raf = null;
    if (!hidden) draw();
    if (!hidden) raf = requestAnimationFrame(loop);
  }
  function schedule() { if (raf === null && !hidden) raf = requestAnimationFrame(loop); }

  function showArticle(article, x, y) {
    card.querySelector('.subject-card-title')?.remove();
    card.querySelector('.subject-card-meta')?.remove();
    card.querySelector('.subject-card-extract')?.remove();
    card.querySelector('.subject-card-action')?.remove();
    const title = document.createElement('h3');
    title.className = 'subject-card-title';
    title.textContent = article.title;
    const meta = document.createElement('p');
    meta.className = 'subject-card-meta';
    meta.textContent = `${yearLabel(article.year)} · Wikipédia FR · CC BY-SA 4.0`;
    const extract = document.createElement('p');
    extract.className = 'subject-card-extract';
    extract.textContent = article.extract || '';
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'subject-card-action';
    action.textContent = 'Lire le récit lié';
    action.addEventListener('click', () => onArticle(article));
    card.append(title, meta, extract, action);
    card.hidden = false;
    if (mobile()) {
      card.style.left = '';
      card.style.top = '';
    } else {
      card.style.left = `${Math.min(x + 12, stage.clientWidth - 232)}px`;
      card.style.top = `${Math.min(y + 12, stage.clientHeight - 180)}px`;
    }
  }
  function renderRecits() {
    recits.replaceChildren();
    for (const article of visible().slice(0, 40)) {
      const item = document.createElement('article');
      item.className = 'subject-recit';
      const title = document.createElement('h3');
      title.textContent = article.title;
      const meta = document.createElement('p');
      meta.className = 'subject-recit-meta';
      meta.textContent = yearLabel(article.year);
      const extract = document.createElement('p');
      extract.className = 'subject-recit-extract';
      extract.textContent = article.extract || '';
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = 'Lire l’article';
      action.addEventListener('click', () => onArticle(article));
      item.append(title, meta, extract, action);
      recits.appendChild(item);
    }
  }
  function setMode(next) {
    mode = next;
    const isRecits = mode === 'recits';
    recits.hidden = !isRecits;
    canvasHost.hidden = isRecits;
    axis.hidden = isRecits;
    cursor.hidden = isRecits;
    cursorYear.hidden = isRecits;
    card.hidden = true;
    modeButton.textContent = isRecits ? '← Voir le champ' : 'Lire les récits →';
    modeButton.setAttribute('aria-pressed', String(isRecits));
    if (isRecits) renderRecits(); else schedule();
  }
  modeButton.addEventListener('click', () => setMode(mode === 'recits' ? 'field' : 'recits'));

  const nearest = (x, y) => squares.find((point) => Math.hypot(point.x - x, point.y - y) < (mobile() ? 26 : 14));
  const onPointerDown = (event) => {
    if (event.pointerType === 'touch') {
      const rect = renderer.view.getBoundingClientRect();
      dragStart = { x: event.clientX, y: event.clientY, from, to, rect };
      try { renderer.view.setPointerCapture?.(event.pointerId); } catch { /* pointeur synthétique */ }
    }
  };
  const onPointerMove = (event) => {
    const rect = renderer.view.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (dragStart && Math.abs(event.clientX - dragStart.x) > 12) {
      const ratio = (dragStart.x - event.clientX) / dragStart.rect.width;
      const span = dragStart.to - dragStart.from;
      from = dragStart.from + ratio * span;
      to = dragStart.to + ratio * span;
      card.hidden = true;
      schedule();
      return;
    }
    cursor.style.left = `${x}px`;
    cursorYear.textContent = String(Math.round(from + (x / rect.width) * (to - from)));
    cursorYear.hidden = false;
    if (event.pointerType !== 'touch') {
      const point = nearest(x, y);
      if (point?.article !== hovered) { hovered = point?.article || null; draw(); }
    }
  };
  const onPointerUp = (event) => {
    if (!dragStart) return;
    const moved = Math.abs(event.clientX - dragStart.x) > 12;
    dragStart = null;
    if (moved) return;
    const rect = renderer.view.getBoundingClientRect();
    const point = nearest(event.clientX - rect.left, event.clientY - rect.top);
    if (point) { hovered = point.article; showArticle(point.article, point.x, point.y); draw(); }
  };
  const onMove = (event) => onPointerMove(event);
  const onClick = (event) => {
    if (dragStart) return;
    const rect = renderer.view.getBoundingClientRect();
    const point = nearest(event.clientX - rect.left, event.clientY - rect.top);
    if (point) showArticle(point.article, point.x, point.y);
  };
  const onKey = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = Math.max(1, Math.round((to - from) / 20)) * (event.key === 'ArrowRight' ? 1 : -1);
      from += step; to += step;
      schedule();
    } else if (event.key === 'Escape') { card.hidden = true; }
  };
  renderer.view.addEventListener('pointerdown', onPointerDown);
  renderer.view.addEventListener('pointermove', onPointerMove);
  renderer.view.addEventListener('pointerup', onPointerUp);
  renderer.view.addEventListener('mousemove', onMove);
  renderer.view.addEventListener('click', onClick);
  canvasHost.addEventListener('keydown', onKey);
  const onVisibility = () => { hidden = document.hidden; if (!hidden) schedule(); };
  document.addEventListener('visibilitychange', onVisibility);
  const onResize = () => { schedule(); updateAxis(); };
  window.addEventListener('resize', onResize);
  schedule();

  return {
    state: () => ({
      mode, articles: visible().length, from: Math.round(from), to: Math.round(to),
      points: squares.slice(0, 3).map((point) => ({ x: point.x, y: point.y })),
    }),
    closeButton,
    destroy() {
      if (raf !== null) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      renderer.view.removeEventListener('pointerdown', onPointerDown);
      renderer.view.removeEventListener('pointermove', onPointerMove);
      renderer.view.removeEventListener('pointerup', onPointerUp);
      renderer.view.removeEventListener('mousemove', onMove);
      renderer.view.removeEventListener('click', onClick);
      renderer.destroy();
      host.replaceChildren();
    },
  };
}
