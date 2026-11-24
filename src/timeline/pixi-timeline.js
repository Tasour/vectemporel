/* PixiTimeline — moteur temporel unique de Vectemporel.
 * Un canvas Pixi, des colonnes de points empilées symétriquement autour de
 * l'axe y=0, aucun positionnement aléatoire. Les entrées déterminisent le rendu :
 * mode 'years' (frise), 'province', 'events' (Histographie), 'articles' (sujet),
 * 'families' (Histomap). Le visuel est tout en Pixi ; l'accessibilité passe par
 * un canvas nommé, focusable, et un statut live hors écran.
 */
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
const PALETTES = {
  light: { background: 0xf0a6bd, dot: 0x2b2b2b, active: 0xffffff, axis: 0xffffff, text: 0x2b2b2b },
  dark: { background: 0x151922, dot: 0xe7eef6, active: 0x4ade80, axis: 0x4ade80, text: 0xe7eef6 },
};
const yearText = (year) => year < 0 ? `${-year} av. J.-C.` : String(year);

export class PixiTimeline {
  constructor(host, options = {}) {
    this.host = host;
    this.events = options.events || [];
    this.title = options.title || 'Frise';
    this.mode = options.mode || 'years';
    this.from = options.from ?? Math.min(...this.events.map((event) => event.year), -2000);
    this.to = options.to ?? Math.max(...this.events.map((event) => event.year), 2000);
    this.onSelect = options.onSelect || (() => {});
    this.onYear = options.onYear || (() => {});
    this.theme = options.theme || (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    this.palette = PALETTES[this.theme] || PALETTES.dark;
    this.selected = null;
    this.year = options.year ?? this.from;
    this.points = [];
    this.raf = null;
    this.hidden = document.hidden;
    this.ready = this.#build();
  }

  async #build() {
    const PIXI = await ensurePixi();
    this.PIXI = PIXI;
    this.root = document.createElement('div');
    this.root.className = `pixi-timeline pixi-timeline--${this.mode}`;
    this.canvas = document.createElement('div');
    this.canvas.className = 'pixi-timeline-canvas';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'application');
    this.canvas.setAttribute('aria-label', `${this.title}. Flèches pour parcourir les années, Entrée pour ouvrir un événement, Échap pour quitter.`);
    this.status = document.createElement('p');
    this.status.className = 'sr-only';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.root.append(this.canvas, this.status);
    this.host.replaceChildren(this.root);

    this.renderer = PIXI.autoDetectRenderer(Math.max(320, this.host.clientWidth), Math.max(200, this.host.clientHeight), {
      backgroundColor: this.palette.background, antialias: true,
    });
    this.stage = new PIXI.Stage();
    this.canvas.appendChild(this.renderer.view);
    this.graphics = new PIXI.Graphics();
    this.stage.addChild(this.graphics);

    this.onKeyDown = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const step = Math.max(1, Math.round((this.to - this.from) / 50));
        this.setRange(this.from + step * (event.key === 'ArrowRight' ? 1 : -1),
          this.to + step * (event.key === 'ArrowRight' ? 1 : -1));
      } else if (event.key === 'Enter' && this.points.length) {
        event.preventDefault();
        this.#select(this.points[0].event);
      }
    };
    this.onPointerDown = (event) => {
      this.drag = {
        x: event.clientX, from: this.from, to: this.to, year: this.year,
        last: Math.round(this.year), rect: this.renderer.view.getBoundingClientRect(),
        mode: null, moved: false,
      };
      try { this.renderer.view.setPointerCapture?.(event.pointerId); } catch { /* pointeur synthétique */ }
    };
    this.onPointerMove = (event) => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x;
      if (Math.abs(dx) < 3) return;
      this.drag.moved = true;
      if (!this.drag.mode) this.drag.mode = 'year';
      if (Math.abs(dx) > 64) this.drag.mode = 'range';
      if (this.drag.mode === 'year') {
        const span = this.drag.to - this.drag.from;
        this.year = this.drag.year + (dx / this.drag.rect.width) * span;
        const step = Math.round(this.year);
        if (step !== this.drag.last) {
          this.drag.last = step;
          if (navigator.vibrate) navigator.vibrate(8);
        }
        this.canvas.setAttribute('aria-valuetext', yearText(step));
      } else {
        const shift = (dx / this.drag.rect.width) * (this.drag.to - this.drag.from);
        this.from = this.drag.from - shift;
        this.to = this.drag.to - shift;
        this.year = this.drag.year - shift;
        this.canvas.setAttribute('aria-valuetext', `${yearText(Math.round(this.from))} → ${yearText(Math.round(this.to))}`);
      }
      this.schedule();
    };
    this.onPointerUp = (event) => {
      if (!this.drag) return;
      const moved = Boolean(this.drag.moved);
      this.drag = null;
      if (moved) return;
      const rect = this.renderer.view.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nearest = this.points.find((point) => Math.hypot(point.x - x, point.y - y) < 18);
      if (nearest) this.#select(nearest.event);
    };
    this.renderer.view.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.view.addEventListener('pointermove', this.onPointerMove);
    this.renderer.view.addEventListener('pointerup', this.onPointerUp);
    this.canvas.setAttribute('aria-valuenow', String(Math.round(this.year)));
    this.onVisibility = () => { this.hidden = document.hidden; if (!this.hidden) this.schedule(); };
    this.onResize = () => this.schedule();
    this.canvas.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('resize', this.onResize);
    this.schedule();
    return this;
  }

  #layout() {
    const width = Math.max(320, this.host.clientWidth);
    const height = Math.max(200, this.host.clientHeight);
    const baseline = height / 2;
    const size = width < 760 ? 12 : 8;
    const gap = size + 4;
    const columns = new Map();
    for (const event of this.events) {
      if (!Number.isFinite(event.year) || event.year < this.from || event.year > this.to) continue;
      if (!columns.has(event.year)) columns.set(event.year, []);
      columns.get(event.year).push(event);
    }
    const points = [];
    const padding = 28;
    for (const [year, list] of columns) {
      const x = padding + ((year - this.from) / Math.max(1, this.to - this.from)) * (width - 2 * padding);
      list.forEach((event, index) => {
        const level = Math.floor(index / 2) + 1;
        const sign = index % 2 === 0 ? -1 : 1;
        points.push({ event, x, y: baseline + sign * level * gap, size });
      });
    }
    return { width, height, baseline, points };
  }

  draw() {
    if (!this.renderer) return;
    const { width, height, baseline, points } = this.#layout();
    const palette = this.palette;
    this.renderer.resize(width, height);
    this.graphics.clear();
    this.graphics.lineStyle(1, palette.axis, 0.8);
    this.graphics.moveTo(16, baseline);
    this.graphics.lineTo(width - 16, baseline);
    this.points = points;
    for (const point of points) {
      const active = this.selected && point.event.id === this.selected.id;
      this.graphics.beginFill(active ? palette.active : palette.dot, active ? 1 : 0.9);
      this.graphics.drawRect(point.x - point.size / 2, point.y - point.size / 2, point.size, point.size);
      this.graphics.endFill();
    }
    const cursorX = 16 + ((this.year - this.from) / Math.max(1, this.to - this.from)) * (width - 32);
    this.graphics.lineStyle(2, palette.active, 0.9);
    this.graphics.moveTo(cursorX, 12);
    this.graphics.lineTo(cursorX, height - 12);
    this.renderer.render(this.stage);
    this.status.textContent = `${this.title} : ${points.length} événements, ${yearText(Math.round(this.year))}`;
    this.canvas.setAttribute('aria-valuenow', String(Math.round(this.year)));
  }

  #tick() {
    this.raf = null;
    if (!this.hidden) this.draw();
    if (!this.hidden) this.raf = requestAnimationFrame(() => this.#tick());
  }

  schedule() {
    if (this.raf === null && !this.hidden) this.raf = requestAnimationFrame(() => this.#tick());
  }

  #select(event) {
    this.selected = event;
    this.year = event.year;
    this.status.textContent = `${event.title}, ${yearText(event.year)}`;
    this.onSelect(event);
    this.schedule();
  }

  setYear(year) {
    this.year = Math.max(this.from, Math.min(this.to, Number(year) || this.from));
    this.onYear(Math.round(this.year));
    this.schedule();
    return this;
  }

  setRange(from, to) {
    this.from = Math.min(from, to - 1);
    this.to = Math.max(to, this.from + 1);
    this.year = Math.max(this.from, Math.min(this.to, this.year ?? this.from));
    this.schedule();
    return this;
  }

  setData(events) {
    this.events = events || [];
    this.schedule();
    return this;
  }

  setTheme(theme) {
    this.theme = theme;
    this.palette = PALETTES[theme] || PALETTES.dark;
    this.schedule();
    return this;
  }

  state() {
    return {
      mode: this.mode, from: this.from, to: this.to, year: Math.round(this.year ?? this.from),
      events: this.events.length, visible: this.points.length, selected: this.selected?.id ?? null,
    };
  }

  destroy() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('keydown', this.onKeyDown);
    this.renderer.view.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.view.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.view.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('resize', this.onResize);
    this.renderer.destroy();
    this.host.replaceChildren();
  }
}
