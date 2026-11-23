/* Champ d'événements d'un sujet — stack d'origine Histography (jQuery + PixiJS 3).
 * Les scripts locaux sont chargés à la demande ; aucun appel réseau au runtime.
 * Les points deviennent des carrés : direction artistique demandée. */
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

export async function createSubjectField(host, data, { onArticle = () => {} } = {}) {
  host.replaceChildren();
  const PIXI = await ensurePixi();
  const shell = document.createElement('div');
  shell.className = 'subject-shell';
  const menu = document.createElement('aside');
  menu.className = 'subject-menu';
  menu.innerHTML = `<h2>${data.title}</h2><p class="subject-sub">${data.articles.length} articles Wikipédia</p>`
    + '<button type="button" class="subject-mode" aria-pressed="false">Lire les récits →</button>'
    + '<p class="subject-source">Articles archivés localement · CC BY-SA 4.0</p>';
  const stage = document.createElement('div');
  stage.className = 'subject-stage';
  const canvasHost = document.createElement('div');
  canvasHost.className = 'subject-canvas';
  canvasHost.tabIndex = 0;
  canvasHost.setAttribute('role', 'img');
  canvasHost.setAttribute('aria-label', 'Champ d’articles. Flèches pour parcourir les années, Entrée pour ouvrir un article.');
  const cursor = document.createElement('div');
  cursor.className = 'subject-cursor';
  const cursorYear = document.createElement('div');
  cursorYear.className = 'subject-cursor-year';
  const card = document.createElement('div');
  card.className = 'subject-card';
  card.hidden = true;
  const recits = document.createElement('div');
  recits.className = 'subject-recits';
  recits.hidden = true;
  stage.append(canvasHost, cursor, cursorYear, card, recits);
  const footer = document.createElement('footer');
  footer.className = 'subject-footer';
  footer.innerHTML = '<label>De <input type="number" class="subject-from" min="-2000" max="2100" aria-label="Année de début"></label>'
    + '<label>À <input type="number" class="subject-to" min="-2000" max="2100" aria-label="Année de fin"></label>'
    + '<button type="button" class="subject-close">Fermer ✕</button>';
  const drawer = document.createElement('button');
  drawer.type = 'button';
  drawer.className = 'subject-drawer';
  drawer.setAttribute('aria-label', 'Afficher le menu');
  drawer.textContent = '☰';
  shell.append(menu, stage, footer, drawer);
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
  const fromInput = footer.querySelector('.subject-from');
  const toInput = footer.querySelector('.subject-to');
  fromInput.value = String(from);
  toInput.value = String(to);

  const app = new PIXI.Application(Math.max(320, stage.clientWidth), Math.max(240, stage.clientHeight), {
    backgroundColor: 0x9a9a9a, antialias: true,
  });
  canvasHost.appendChild(app.view);
  const squares = [];
  const graphics = new PIXI.Graphics();
  app.stage.addChild(graphics);

  function visible() {
    return data.articles.filter((article) => article.year >= from && article.year <= to);
  }
  function draw() {
    const width = Math.max(320, stage.clientWidth);
    const height = Math.max(240, stage.clientHeight);
    app.renderer.resize(width, height);
    graphics.clear();
    squares.length = 0;
    for (const article of visible()) {
      const seed = hash(article.id || article.title);
      const x = 28 + ((article.year - from) / Math.max(1, to - from)) * (width - 56);
      const lane = seed % 22;
      const y = 32 + lane * ((height - 64) / 22);
      const size = hovered === article ? 11 : 7;
      graphics.beginFill(0xffffff, hovered === article ? 1 : 0.86);
      graphics.drawRect(x - size / 2, y - size / 2, size, size);
      graphics.endFill();
      squares.push({ article, x, y });
    }
  }
  function loop() {
    raf = null;
    if (!hidden) draw();
    if (!hidden) raf = requestAnimationFrame(loop);
  }
  function schedule() { if (raf === null && !hidden) raf = requestAnimationFrame(loop); }

  function showCard(article, x, y) {
    card.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = article.title;
    const meta = document.createElement('p');
    meta.textContent = `${yearLabel(article.year)} · Wikipédia FR · CC BY-SA 4.0`;
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = 'Lire l’article';
    action.addEventListener('click', () => onArticle(article));
    card.append(title, meta, action);
    card.hidden = false;
    card.style.left = `${Math.min(x + 12, stage.clientWidth - 232)}px`;
    card.style.top = `${Math.min(y + 12, stage.clientHeight - 140)}px`;
  }
  function renderRecits() {
    recits.replaceChildren();
    for (const article of visible().slice(0, 40)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'subject-recit';
      button.textContent = `${yearLabel(article.year)} — ${article.title}`;
      button.addEventListener('click', () => onArticle(article));
      recits.appendChild(button);
    }
  }
  function setMode(next) {
    mode = next;
    const isRecits = mode === 'recits';
    recits.hidden = !isRecits;
    canvasHost.hidden = isRecits;
    cursor.hidden = isRecits;
    cursorYear.hidden = isRecits;
    card.hidden = true;
    const button = menu.querySelector('.subject-mode');
    button.textContent = isRecits ? '← Voir le champ' : 'Lire les récits →';
    button.setAttribute('aria-pressed', String(isRecits));
    if (isRecits) renderRecits(); else schedule();
  }

  const onMove = (event) => {
    const rect = app.view.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cursor.style.left = `${x}px`;
    cursorYear.textContent = String(Math.round(from + (x / rect.width) * (to - from)));
    const nearest = squares.find((point) => Math.hypot(point.x - x, point.y - y) < 14);
    if (nearest?.article !== hovered) { hovered = nearest?.article || null; draw(); }
  };
  const onClick = () => {
    const point = squares.find((item) => item.article === hovered);
    if (point) showCard(point.article, point.x, point.y);
  };
  const onKey = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = Math.max(1, Math.round((to - from) / 20)) * (event.key === 'ArrowRight' ? 1 : -1);
      from += step; to += step;
      fromInput.value = String(Math.round(from));
      toInput.value = String(Math.round(to));
      schedule();
    }
  };
  app.view.addEventListener('mousemove', onMove);
  app.view.addEventListener('click', onClick);
  canvasHost.addEventListener('keydown', onKey);
  const onFrom = () => { from = Math.min(to - 1, Number(fromInput.value) || from); schedule(); };
  const onTo = () => { to = Math.max(from + 1, Number(toInput.value) || to); schedule(); };
  fromInput.addEventListener('change', onFrom);
  toInput.addEventListener('change', onTo);
  menu.querySelector('.subject-mode').addEventListener('click', () => setMode(mode === 'recits' ? 'field' : 'recits'));
  drawer.addEventListener('click', () => document.body.classList.toggle('subject-drawer'));
  const onVisibility = () => { hidden = document.hidden; if (!hidden) schedule(); };
  document.addEventListener('visibilitychange', onVisibility);
  const onResize = () => schedule();
  window.addEventListener('resize', onResize);
  schedule();

  return {
    state: () => ({ mode, articles: visible().length, from: Math.round(from), to: Math.round(to) }),
    closeButton: footer.querySelector('.subject-close'),
    destroy() {
      if (raf !== null) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      app.view.removeEventListener('mousemove', onMove);
      app.view.removeEventListener('click', onClick);
      app.destroy();
      host.replaceChildren();
    },
  };
}
