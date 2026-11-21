import { register } from './registry.js';

/* Lentille V2 E040 — mouvement et transitions appliqués aux arêtes du graphe.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau ni
   source aléatoire, sans minuteur ni boucle d'animation propre. Le mouvement
   est porté par des animations et transitions CSS pilotées par attributs. */

const CSS_ID = 'constellation-v2-e040';
const LIVE_ID = 'v2e040-live';
const TOGGLE_ID = 'v2e040-toggle';
const EDGES_ID = 'v2e040-edges';
const PREV_KEY = '__v2e040_prev_era';
const MOTION_KEY = '__v2e040_motion';
const EPS = 0.06; /* Tolérance sur des coordonnées arrondies à deux décimales. */

const CSS = `
/* Toutes les règles V2 sont préfixées v2e040 et ciblées par attribut. */
.v2e040-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e040-toggle{min-height:36px;padding:0 12px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font:600 10px/1.4 inherit;cursor:pointer}
.v2e040-toggle:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}

/* E040-01 et E040-05 — cascade puis rythme, combinés en une déclaration. */
.constellation-edges line[data-v2e040-anim="1"]{
  animation:v2e040-cascade var(--v2e040-cdur,820ms) ease-out var(--v2e040-d,0ms) both,
            v2e040-phase var(--v2e040-pdur,2400ms) ease-in-out var(--v2e040-p,0ms) infinite alternate;
}
@keyframes v2e040-cascade{0%{stroke-opacity:.2}55%{stroke-opacity:1}100%{stroke-opacity:.85}}
@keyframes v2e040-phase{from{stroke-width:1}to{stroke-width:2.1}}

/* E040-02 — fourmis marchantes, ajoutées au motif commun sur le chemin actif. */
.constellation-edges line[data-v2e040-ants="1"]{
  stroke-dasharray:.18 .12;
  animation:v2e040-cascade var(--v2e040-cdur,820ms) ease-out var(--v2e040-d,0ms) both,
            v2e040-phase var(--v2e040-pdur,2400ms) ease-in-out var(--v2e040-p,0ms) infinite alternate,
            v2e040-ants 1400ms linear infinite;
}
@keyframes v2e040-ants{from{stroke-dashoffset:0}to{stroke-dashoffset:-1}}

/* E040-03 — teinte d'ère dérivée du soleil actif, avec transition. */
.constellation-edges line[data-v2e040-tint="1"]{
  stroke:hsl(var(--v2e040-h,40) 82% 74%/.92);
  transition:stroke 420ms ease;
}

/* E040-04 — marqueurs pulsés aux extrémités des arêtes actives. */
circle.v2e040-marker{
  fill:rgba(255,227,166,.9);opacity:.2;transform-box:fill-box;transform-origin:center;
  animation:v2e040-marker 1800ms ease-in-out var(--v2e040-md,0ms) infinite alternate;
}
@keyframes v2e040-marker{from{opacity:.2;transform:scale(.55)}to{opacity:1;transform:scale(1.4)}}

/* E040-06 — gel contrôlé pendant l'inspection d'un nœud. */
.constellation-field[data-v2e040-pause="1"] .constellation-edges line,
.constellation-field[data-v2e040-pause="1"] circle.v2e040-marker{animation-play-state:paused}

/* E040-07 — accentuation ponctuelle au changement d'ère. */
.constellation-field[data-v2e040-change="1"] .constellation-edges line[data-v2e040-anim="1"]{
  animation:v2e040-flash 700ms ease-out both;
}
@keyframes v2e040-flash{from{stroke-opacity:1;stroke-width:2.3}to{stroke-opacity:.85;stroke-width:1}}

/* E040-08 — fondu d'arrivée des arêtes touchant le repère actif. */
.constellation-edges line[data-v2e040-fresh="1"]{
  animation:v2e040-fresh 560ms ease-out var(--v2e040-f,0ms) both;
}
@keyframes v2e040-fresh{from{opacity:0}to{opacity:1}}

/* E040-09 — suspension volontaire du mouvement V2 par l'utilisateur. */
.constellation-field[data-v2e040-motion="off"] .constellation-edges line,
.constellation-field[data-v2e040-motion="off"] circle.v2e040-marker{
  animation:none!important;transition:none!important;
  stroke-dasharray:none!important;stroke-dashoffset:0!important;
  stroke-opacity:1!important;opacity:1!important;
}

/* E040-10 — garde-fou : aucun effet V2 n'est imposé en mouvement réduit. */
@media (prefers-reduced-motion: reduce){
  .constellation-edges line[data-v2e040-anim="1"],
  .constellation-edges line[data-v2e040-ants="1"],
  .constellation-edges line[data-v2e040-fresh="1"],
  circle.v2e040-marker{animation:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important;opacity:1!important}
}
`;

function safe(fn) {
  try { fn(); } catch { /* Greffon neutralisé : le rendu reste intact. */ }
}

function num(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function positionOf(node) {
  if (!node || !node.style) return null;
  const x = num(node.style.getPropertyValue('--x'), NaN);
  const y = num(node.style.getPropertyValue('--y'), NaN);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function touchesEndpoint(line, point) {
  const x1 = num(line.getAttribute('x1'), NaN);
  const y1 = num(line.getAttribute('y1'), NaN);
  const x2 = num(line.getAttribute('x2'), NaN);
  const y2 = num(line.getAttribute('y2'), NaN);
  const near = (ax, ay) => Number.isFinite(ax) && Number.isFinite(ay)
    && Math.abs(ax - point.x) <= EPS && Math.abs(ay - point.y) <= EPS;
  return near(x1, y1) || near(x2, y2);
}

function hueOf(color) {
  const match = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(color || '').trim());
  if (!match) return 40;
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (!delta) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h *= 60;
  return Math.round(h < 0 ? h + 360 : h);
}

register('E040', (ctx) => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const el = typeof ctx.el === 'function' ? ctx.el : (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let live = null;

  safe(() => css(CSS_ID, CSS));

  const field = layout.querySelector('.constellation-field');
  const edges = field ? field.querySelector('.constellation-edges') : null;
  if (!field || !edges) {
    safe(() => layout.setAttribute('data-v2e040-motion',
      ctx.reducedMotion && ctx.reducedMotion() ? 'off' : 'on'));
    return;
  }

  /* Seules les vraies arêtes sont retenues : la comète de la passe 1 porte
     une autre classe et reste hors du périmètre de cette lentille. */
  const edgeLines = () => Array.from(edges.querySelectorAll('line'))
    .filter((line) => line.classList.contains('const-edge'));

  const activeSun = () => layout.querySelector('.const-sun.is-active');

  /* E040-01 — Cascade radiale : les arêtes sont ordonnées par distance
     géométrique depuis le soleil de l'ère active, non par index de création. */
  safe(() => {
    const anchor = positionOf(activeSun()) || { x: 50, y: 50 };
    const measures = edgeLines().map((line) => {
      const x1 = num(line.getAttribute('x1'), 50);
      const y1 = num(line.getAttribute('y1'), 50);
      return { line, distance: Math.hypot(x1 - anchor.x, y1 - anchor.y) };
    });
    const max = measures.reduce((memo, item) => Math.max(memo, item.distance), 0) || 1;
    measures.forEach(({ line, distance }) => {
      const rank = Math.round((distance / max) * 8);
      line.setAttribute('data-v2e040-cascade', '1');
      line.style.setProperty('--v2e040-d', `${rank * 70}ms`);
    });
    field.style.setProperty('--v2e040-cdur', `${Math.min(1100, 520 + measures.length * 12)}ms`);
    field.setAttribute('data-v2e040-maxdist', max.toFixed(2));
  });

  /* E040-02 — Fourmis marchantes : un motif de tirets animé sur les seules
     arêtes du chemin actif, dont le sens va du soleil vers le repère. */
  safe(() => {
    edgeLines().forEach((line) => {
      if (!line.classList.contains('is-path')) return;
      line.setAttribute('pathLength', '1');
      line.setAttribute('data-v2e040-ants', '1');
    });
  });

  /* E040-03 — Teinte d'ère : la couleur du soleil actif est convertie en
     teinte déterministe, puis appliquée au chemin avec transition. */
  safe(() => {
    const sun = activeSun();
    const color = sun && sun.style ? sun.style.getPropertyValue('--era') : '';
    field.style.setProperty('--v2e040-h', String(hueOf(color)));
    edgeLines().forEach((line) => {
      if (line.classList.contains('is-path')) line.setAttribute('data-v2e040-tint', '1');
      else line.removeAttribute('data-v2e040-tint');
    });
  });

  /* E040-04 — Marqueurs de destination : un point pulsé à l'extrémité de
     chaque arête active, ajouté une seule fois en coordonnées normalisées. */
  safe(() => {
    if (edges.querySelector('circle.v2e040-marker')) return;
    let rank = 0;
    edgeLines().forEach((line) => {
      if (!line.classList.contains('is-path')) return;
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('class', 'v2e040-marker');
      marker.setAttribute('cx', line.getAttribute('x2'));
      marker.setAttribute('cy', line.getAttribute('y2'));
      marker.setAttribute('r', '0.9');
      marker.setAttribute('vector-effect', 'non-scaling-stroke');
      marker.style.setProperty('--v2e040-md', `${rank * 90}ms`);
      edges.appendChild(marker);
      rank += 1;
    });
  });

  /* E040-05 — Phases alternées paires/impaires : deux rythmes opposés, décalés
     par une demi-période négative, pour une respiration en motif du graphe. */
  safe(() => {
    edgeLines().forEach((line, index) => {
      const phase = index % 2 === 0 ? 'a' : 'b';
      line.setAttribute('data-v2e040-phase', phase);
      line.setAttribute('data-v2e040-anim', '1');
      line.style.setProperty('--v2e040-p', phase === 'a' ? '0ms' : '-1200ms');
    });
  });

  /* E040-06 — Gel contrôlé : au survol ou au focus d'un nœud, les animations
     V2 sont mises en pause puis relancées, sans minuteur ni état global. */
  safe(() => {
    if (field.getAttribute('data-v2e040-pause-bound') === '1') return;
    field.setAttribute('data-v2e040-pause-bound', '1');
    edges.id = EDGES_ID;
    const nodeOf = (target) => {
      if (!target || typeof target.closest !== 'function') return null;
      const node = target.closest('[data-const-key]');
      return node && field.contains(node) ? node : null;
    };
    field.addEventListener('pointerover', (event) => {
      if (nodeOf(event.target)) field.setAttribute('data-v2e040-pause', '1');
    });
    field.addEventListener('pointerout', (event) => {
      if (!nodeOf(event.target)) return;
      if (!nodeOf(event.relatedTarget)) field.removeAttribute('data-v2e040-pause');
    });
    field.addEventListener('focusin', (event) => {
      if (nodeOf(event.target)) field.setAttribute('data-v2e040-pause', '1');
    });
    field.addEventListener('focusout', (event) => {
      if (!nodeOf(event.relatedTarget)) field.removeAttribute('data-v2e040-pause');
    });
  });

  /* E040-07 — Mémoire déterministe du changement d'ère : une clé de fenêtre
     comparée au rendu précédent déclenche une accentuation ponctuelle. */
  safe(() => {
    const title = (layout.querySelector('.constellation-title') || {}).textContent || '';
    const sun = activeSun();
    const siblings = sun && sun.parentNode ? Array.from(sun.parentNode.children) : [];
    const index = sun ? siblings.indexOf(sun) : 0;
    const key = `${String(title).trim()}|${index}`;
    const previous = typeof window !== 'undefined' ? window[PREV_KEY] : undefined;
    if (previous && previous !== key) field.setAttribute('data-v2e040-change', '1');
    else field.removeAttribute('data-v2e040-change');
    if (typeof window !== 'undefined') window[PREV_KEY] = key;
  });

  /* E040-08 — Fondu d'arrivée : les arêtes touchant le repère actif entrent
     en fondu, repérées par géométrie et non par une liste d'identifiants. */
  safe(() => {
    const point = positionOf(layout.querySelector('.const-planet.is-active'));
    if (!point) return;
    let rank = 0;
    edgeLines().forEach((line) => {
      if (!touchesEndpoint(line, point)) return;
      line.setAttribute('data-v2e040-fresh', '1');
      line.style.setProperty('--v2e040-f', `${rank * 55}ms`);
      rank += 1;
    });
  });

  /* E040-09 — Bascule accessible : bouton aria-pressed, annonce de statut et
     mémorisation déterministe de la préférence entre deux rendus. */
  safe(() => {
    if (!document.getElementById(LIVE_ID) || !document.getElementById(LIVE_ID).isConnected) {
      live = el('p', 'v2e040-sr', 'Mouvement des arêtes : actif.');
      live.id = LIVE_ID;
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
    } else {
      live = document.getElementById(LIVE_ID);
    }
    const announce = (message) => {
      if (live && live.isConnected && live.textContent !== message) live.textContent = message;
    };
    let on = true;
    try {
      const saved = typeof window !== 'undefined' ? window[MOTION_KEY] : undefined;
      on = saved !== 'off';
    } catch { on = true; }
    field.setAttribute('data-v2e040-motion', on ? 'on' : 'off');

    let toggle = document.getElementById(TOGGLE_ID);
    if (!toggle || !toggle.isConnected) {
      toggle = el('button', 'v2e040-toggle', on ? 'Mouvement des arêtes : actif' : 'Mouvement des arêtes : suspendu');
      toggle.id = TOGGLE_ID;
      toggle.type = 'button';
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.setAttribute('aria-controls', edges.id || '');
      toggle.addEventListener('click', () => {
        const next = toggle.getAttribute('aria-pressed') !== 'true';
        toggle.setAttribute('aria-pressed', next ? 'true' : 'false');
        toggle.textContent = next ? 'Mouvement des arêtes : actif' : 'Mouvement des arêtes : suspendu';
        field.setAttribute('data-v2e040-motion', next ? 'on' : 'off');
        try { if (typeof window !== 'undefined') window[MOTION_KEY] = next ? 'on' : 'off'; } catch { /* Stockage indisponible. */ }
        announce(next ? 'Mouvement des arêtes activé.' : 'Mouvement des arêtes suspendu.');
      });
      const caption = layout.querySelector('.constellation-caption');
      if (caption) caption.insertBefore(toggle, caption.firstChild);
      else layout.appendChild(toggle);
    }
  });

  /* E040-10 — Métriques de mouvement exposées pour audit : valeurs calculées
     une fois, reproductibles, sans mesure aléatoire ni horloge propre. */
  safe(() => {
    const all = edgeLines();
    const metrics = {
      aretes: all.length,
      chemin: all.filter((line) => line.classList.contains('is-path')).length,
      lunes: all.filter((line) => line.classList.contains('is-moon')).length,
      distanceMax: num(field.getAttribute('data-v2e040-maxdist'), 0),
      teinte: num(field.style.getPropertyValue('--v2e040-h'), 40),
      phase: all.length % 2 === 0 ? 'equilibre' : 'impair',
    };
    field.setAttribute('data-v2e040-metrics', JSON.stringify(metrics));
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()
        && !field.getAttribute('data-v2e040-motion-user')) {
      field.setAttribute('data-v2e040-motion', 'off');
    }
  });
});
