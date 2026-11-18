import { register } from './registry.js';

/* Lentille M10 — Mouvement réduit et image statique (domaine A : rendu WebGL).
 * Tout est local : aucune requête, aucun aléa, aucune modification des fichiers
 * partagés. Le panneau M10 est un substitut vectoriel au canvas : il reste net
 * au redimensionnement et reste lisible quand le moteur Three.js est fermé.
 *
 * Les 10 chantiers sont décrits dans
 * UNIFIED_AUDIT/MONDE/views/M10-mouvement-reduit.md.
 */

const PANEL_ID = 'm10-motion-panel';
const STATUS_ID = 'm10-motion-status';
const TOGGLE_ID = 'm10-freeze-toggle';
const ZOOM_IN_ID = 'm10-zoom-in';
const ZOOM_OUT_ID = 'm10-zoom-out';
const GLOBE_ID = 'm10-static-globe';
const CAPTION_ID = 'm10-static-caption';
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const ZOOMS = [1, 1.5, 2.25, 3.4, 4];
const SVG_NS = 'http://www.w3.org/2000/svg';

/* État module : survit aux re-renders de la coque (shell.js reconstruit #app).
 * Les écouteurs globaux ne sont installés qu'une fois ; les nœuds sont
 * re-liés à chaque passage de register(). */
const M = {
  reduce: false,
  manualFreeze: false,
  engine: null,
  reveal: null,
  say: null,
  countries: [],
  zoom: 0,
  activeCode: null,
  selectedId: null,
  prevSelectedId: null,
  nodes: {},
  resizeRaf: 0,
};

let watcherInstalled = false;
let resizeInstalled = false;
let visibilityInstalled = false;

const CSS = `
#m10-motion-panel{position:absolute;right:16px;bottom:16px;z-index:6;width:min(190px,46%);
  padding:8px 9px;border:1px solid var(--line,#334);border-radius:9px;
  background:rgba(8,11,16,.92);color:var(--ink-soft,#cbd5e1);font-size:11px;line-height:1.35}
#m10-motion-panel .m10-title{margin:0 0 4px;font-size:11px;font-weight:600;
  color:var(--gold-bright,#f5d99a);letter-spacing:.02em}
#m10-motion-panel .m10-status{margin:0 0 6px;font-variant-numeric:tabular-nums}
#m10-motion-panel .m10-row{display:flex;gap:5px;margin-bottom:5px}
#m10-motion-panel button.m10-btn{flex:1 1 0;min-width:36px;min-height:36px;padding:4px 6px;
  border:1px solid var(--line,#334);border-radius:7px;background:var(--surface-2,#111a26);
  color:inherit;font:inherit;cursor:pointer;touch-action:manipulation}
#m10-motion-panel button.m10-btn[aria-pressed="true"],
#m10-motion-panel button.m10-btn[data-m10-active="true"]{
  border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f5d99a)}
#m10-motion-panel button.m10-btn:focus-visible{outline:3px solid var(--gold-bright,#f5d99a);outline-offset:2px}
#m10-motion-panel button.m10-btn[aria-disabled="true"]{opacity:.45;cursor:not-allowed}
#m10-motion-panel figure{margin:0}
#m10-static-globe{display:block;width:100%;max-height:104px;pointer-events:none}
#m10-static-globe .m10-disc{fill:none;stroke:var(--line-strong,#556);stroke-width:1.1}
#m10-static-globe .m10-grid{fill:none;stroke:var(--line,#334);stroke-width:.6}
#m10-static-globe .m10-equator{fill:none;stroke:var(--line-strong,#556);stroke-width:.9}
#m10-static-globe .m10-dot{fill:var(--muted,#8aa);stroke:none}
.m10-caption{margin-top:3px;font-size:10px;color:var(--muted,#8aa)}
#m10-motion-panel .m10-help{margin:4px 0 0;font-size:10px;color:var(--muted,#8aa)}
@media (max-width:700px){
  #m10-motion-panel{width:150px;right:8px;bottom:8px;padding:6px}
  #m10-static-globe{max-height:78px}
}
@media (prefers-reduced-motion:reduce){
  #globe-reveal,#globe-reveal .gr-page{transition:none !important}
  #globe-reveal .gr-figure{will-change:auto !important;filter:none !important}
  #m10-motion-panel *,#m10-static-globe *{animation:none !important;transition:none !important}
}
html[data-m10-motion="reduce"] #globe-reveal,
html[data-m10-motion="reduce"] #globe-reveal .gr-page{transition:none !important}
html[data-m10-motion="reduce"] #globe-reveal .gr-figure{will-change:auto !important;filter:none !important}
`;

function svg(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    Object.keys(attrs).forEach((key) => node.setAttribute(key, String(attrs[key])));
  }
  return node;
}

function buildStaticGlobe(countries) {
  const list = Array.isArray(countries) ? countries : [];
  const root = svg('svg', {
    id: GLOBE_ID,
    viewBox: '0 0 100 100',
    role: 'img',
    'aria-label': 'Globe statique : positions schématiques des pays documentés',
  });
  const title = svg('title');
  title.textContent = 'Globe statique';
  const desc = svg('desc');
  desc.textContent = `${list.length} pays documentés. Les points atténués et pointillés sont sur la face arrière. Ce dessin schématique ne remplace pas la liste des pays.`;
  root.append(title, desc);

  root.appendChild(svg('circle', { cx: 50, cy: 50, r: 42, class: 'm10-disc' }));
  root.appendChild(svg('ellipse', { cx: 50, cy: 50, rx: 42, ry: 15, class: 'm10-grid' }));
  root.appendChild(svg('ellipse', { cx: 50, cy: 50, rx: 42, ry: 29, class: 'm10-grid' }));
  root.appendChild(svg('ellipse', { cx: 50, cy: 50, rx: 15, ry: 42, class: 'm10-grid' }));
  root.appendChild(svg('ellipse', { cx: 50, cy: 50, rx: 29, ry: 42, class: 'm10-grid' }));
  root.appendChild(svg('line', { x1: 8, y1: 50, x2: 92, y2: 50, class: 'm10-equator' }));
  root.appendChild(svg('line', { x1: 50, y1: 8, x2: 50, y2: 92, class: 'm10-grid' }));

  const dots = svg('g', { class: 'm10-dots' });
  const n = Math.max(1, list.length);
  const golden = Math.PI * (3 - Math.sqrt(5));
  list.forEach((country, index) => {
    const y = n === 1 ? 0 : 1 - (2 * index) / (n - 1);
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = golden * index;
    const back = Math.sin(angle) * ring < 0;
    const dot = svg('circle', {
      cx: (50 + Math.cos(angle) * ring * 38).toFixed(2),
      cy: (50 - y * 38).toFixed(2),
      r: back ? 1.5 : 2.1,
      class: back ? 'm10-dot is-back' : 'm10-dot',
      'data-m10-code': country.code || '',
      'stroke-width': back ? 0.5 : 0,
    });
    const name = svg('title');
    name.textContent = `${country.name || country.code || 'Pays'}${back ? ' (face arrière)' : ''}`;
    dot.appendChild(name);
    dots.appendChild(dot);
  });
  root.appendChild(dots);
  return root;
}

function announce(message) {
  if (message && typeof M.say === 'function') M.say(message);
}

function queryReduce(ctx) {
  /* Repli « fail-safe » : sans matchMedia, on fige (aucune animation). */
  if (typeof window.matchMedia !== 'function') return true;
  try {
    return !!ctx.reducedMotion();
  } catch {
    return true;
  }
}

function setActiveDot() {
  const svgRoot = M.nodes.svg;
  if (!svgRoot) return;
  const dots = svgRoot.querySelectorAll('.m10-dot');
  for (let i = 0; i < dots.length; i += 1) {
    const dot = dots[i];
    const active = !!M.activeCode && dot.getAttribute('data-m10-code') === M.activeCode;
    const back = dot.classList.contains('is-back');
    dot.classList.toggle('is-active', active);
    dot.setAttribute('r', active ? '3.4' : (back ? '1.5' : '2.1'));
    dot.setAttribute('stroke-width', active ? '1.4' : (back ? '0.5' : '0'));
  }
}

function updateCaption() {
  const caption = M.nodes.caption;
  if (!caption) return;
  const code = M.activeCode || (M.countries.find((c) => c.id === M.selectedId) || {}).code;
  const country = M.countries.find((c) => c.code === code);
  if (!country) {
    caption.textContent = 'Aucun pays mis en évidence — choisissez un pays dans la liste.';
    return;
  }
  const origin = M.activeCode ? 'survol' : 'sélection';
  caption.textContent = `${country.name} · ${country.eras.length} ères · ${(country.events || []).length} repères (${origin})`;
}

function applyZoom(withAnnouncement) {
  const svgRoot = M.nodes.svg;
  if (!svgRoot) return;
  const z = ZOOMS[M.zoom];
  const half = 50 / z;
  svgRoot.setAttribute('viewBox',
    `${(50 - half).toFixed(2)} ${(50 - half).toFixed(2)} ${(2 * half).toFixed(2)} ${(2 * half).toFixed(2)}`);
  const zoomIn = M.nodes.zoomIn;
  const zoomOut = M.nodes.zoomOut;
  if (zoomIn) zoomIn.setAttribute('aria-disabled', String(M.zoom >= ZOOMS.length - 1));
  if (zoomOut) zoomOut.setAttribute('aria-disabled', String(M.zoom <= 0));
  if (withAnnouncement) {
    announce(`Zoom de la vue statique : niveau ${M.zoom + 1} sur ${ZOOMS.length}.`);
  }
}

function stepZoom(direction) {
  const next = Math.min(ZOOMS.length - 1, Math.max(0, M.zoom + direction));
  if (next === M.zoom) {
    announce(direction > 0 ? 'Zoom statique maximal atteint.' : 'Zoom statique minimal atteint.');
    return;
  }
  M.zoom = next;
  applyZoom(true);
}

function reconcileEngine(staticMode) {
  const engine = M.engine;
  /* M10 ne relance jamais la rotation : un gel explicite peut seulement la
     couper. L'activation reste réservée au bouton « Rotation » de globe.js. */
  if (staticMode && engine && typeof engine.setAutoRotate === 'function') {
    try {
      engine.setAutoRotate(false);
      if (typeof engine.invalidate === 'function') engine.invalidate();
    } catch {
      /* Moteur indisponible : le SVG statique reste la source de vérité. */
    }
  }
  if (staticMode && M.reveal && typeof M.reveal.leave === 'function') {
    try { M.reveal.leave(); } catch { /* overlay déjà retiré */ }
  }
}

function applyState(announcement) {
  const staticMode = M.reduce || M.manualFreeze;
  document.documentElement.dataset.m10Motion = M.reduce ? 'reduce' : 'full';

  const status = M.nodes.status;
  if (status) {
    status.textContent = `Préférence système : ${M.reduce ? 'mouvement réduit' : 'mouvement complet'} · `
      + `figement manuel : ${M.manualFreeze ? 'actif' : 'inactif'} · `
      + `rendu : ${staticMode ? 'statique' : 'animé'}`;
  }
  const toggle = M.nodes.toggle;
  if (toggle) {
    toggle.textContent = M.manualFreeze ? 'Réactiver' : 'Figer';
    toggle.setAttribute('aria-pressed', String(M.manualFreeze));
    toggle.setAttribute('aria-label', M.manualFreeze
      ? 'Réactiver les transitions du globe'
      : 'Figer les transitions du globe');
  }
  if (M.nodes.svg) M.nodes.svg.dataset.m10Static = staticMode ? '1' : '0';
  applyZoom(false);
  setActiveDot();
  updateCaption();
  reconcileEngine(staticMode);
  if (announcement) announce(announcement);
}

function installWatcher(ctx) {
  if (watcherInstalled || typeof window.matchMedia !== 'function') return;
  let query = null;
  try { query = window.matchMedia(MOTION_QUERY); } catch { return; }
  if (!query) return;
  const onChange = (event) => {
    M.reduce = typeof event.matches === 'boolean' ? !!event.matches : !!query.matches;
    applyState(M.reduce
      ? 'Mouvement réduit détecté : rotation et transitions désactivées, vue statique disponible.'
      : 'Mouvement réduit désactivé : rendu animé rétabli ; la rotation reste gérée par le bouton « Rotation ».');
  };
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
  watcherInstalled = true;
}

function installGlobalListeners() {
  if (!resizeInstalled) {
    window.addEventListener('resize', () => {
      if (M.resizeRaf) return;
      M.resizeRaf = requestAnimationFrame(() => {
        M.resizeRaf = 0;
        if (M.engine && typeof M.engine.resize === 'function') {
          try { M.engine.resize(); } catch { /* moteur fermé */ }
        }
        applyZoom(false);
        updateCaption();
      });
    }, { passive: true });
    resizeInstalled = true;
  }
  if (!visibilityInstalled) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      /* Le moteur peut avoir relancé sa boucle au retour d'onglet : on
         réaffirme la préférence sans ajouter de nouvelle région live. */
      applyState('');
    });
    visibilityInstalled = true;
  }
}

function buildPanel(ctx) {
  let panel = document.getElementById(PANEL_ID);
  let created = false;
  if (!panel) {
    panel = ctx.el('section', 'm10-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-label', 'Mouvement et vue statique du globe');
    panel.append(
      ctx.el('h2', 'm10-title', 'Vue statique'),
      (() => { const node = ctx.el('p', 'm10-status'); node.id = STATUS_ID; return node; })()
    );
    const row = ctx.el('div', 'm10-row');
    const toggle = ctx.el('button', 'm10-btn');
    toggle.type = 'button';
    toggle.id = TOGGLE_ID;
    const zoomOut = ctx.el('button', 'm10-btn', '−');
    zoomOut.type = 'button';
    zoomOut.id = ZOOM_OUT_ID;
    zoomOut.setAttribute('aria-label', 'Dézoomer la vue statique');
    const zoomIn = ctx.el('button', 'm10-btn', '+');
    zoomIn.type = 'button';
    zoomIn.id = ZOOM_IN_ID;
    zoomIn.setAttribute('aria-label', 'Zoomer la vue statique');
    row.append(toggle, zoomOut, zoomIn);
    panel.appendChild(row);
    const figure = ctx.el('figure', 'm10-figure');
    const caption = ctx.el('figcaption', 'm10-caption');
    caption.id = CAPTION_ID;
    figure.append(buildStaticGlobe(M.countries), caption);
    panel.appendChild(figure);
    panel.appendChild(ctx.el('p', 'm10-help',
      'Dessin vectoriel : net à tout zoom, lisible sans WebGL et sans service externe.'));
    ctx.scene.appendChild(panel);
    created = true;
  }
  return {
    panel,
    created,
    status: document.getElementById(STATUS_ID),
    toggle: document.getElementById(TOGGLE_ID),
    zoomIn: document.getElementById(ZOOM_IN_ID),
    zoomOut: document.getElementById(ZOOM_OUT_ID),
    svg: document.getElementById(GLOBE_ID),
    caption: document.getElementById(CAPTION_ID),
  };
}

register('M10', (ctx) => {
  if (!ctx || !ctx.scene || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css('monde-m10', CSS);

  M.say = typeof ctx.say === 'function' ? ctx.say : null;
  M.countries = Array.isArray(ctx.countries) ? ctx.countries : [];
  M.reveal = ctx.reveal || null;
  M.selectedId = ctx.selected && ctx.selected.id ? ctx.selected.id
    : (ctx.state && ctx.state.countryId ? ctx.state.countryId : null);
  M.reduce = queryReduce(ctx);
  if (!M.engine && typeof window.VECTEMPOREL_GLOBE !== 'undefined' && window.VECTEMPOREL_GLOBE) {
    M.engine = window.VECTEMPOREL_GLOBE;
  }

  M.nodes = buildPanel(ctx);
  applyState('');

  if (M.nodes.created) {
    M.nodes.toggle.addEventListener('click', () => {
      M.manualFreeze = !M.manualFreeze;
      applyState(M.manualFreeze
        ? 'Transitions figées manuellement : vue statique active.'
        : 'Figement manuel désactivé : rendu animé rétabli ; la rotation reste gérée par le bouton « Rotation ».');
    });
    M.nodes.zoomIn.addEventListener('click', () => stepZoom(1));
    M.nodes.zoomOut.addEventListener('click', () => stepZoom(-1));
  }

  ctx.onReady((payload) => {
    M.engine = (payload && payload.engine) || M.engine;
    applyState('');
  });
  ctx.onHover((payload) => {
    M.activeCode = payload && payload.code ? payload.code : null;
    setActiveDot();
    updateCaption();
  });
  ctx.onLeave(() => {
    M.activeCode = null;
    setActiveDot();
    updateCaption();
  });

  installWatcher(ctx);
  installGlobalListeners();

  /* Navigation instantanée (reveal appelle done() avant tout test de
     reduced-motion) : on annonce la destination après le re-render. */
  if (M.selectedId && M.selectedId !== M.prevSelectedId) {
    const country = M.countries.find((c) => c.id === M.selectedId);
    if (country) {
      announce(`Pays sélectionné : ${country.name} · ${country.eras.length} ères · ${(country.events || []).length} repères.`);
    }
  }
  M.prevSelectedId = M.selectedId;
});
