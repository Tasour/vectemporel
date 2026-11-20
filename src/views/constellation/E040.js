import { register } from './registry.js';

/* Lentille E040 — Mouvement et transitions appliqués aux arêtes du graphe.
 * Dix chantiers locaux, déterministes et tolérants : chaque effet est injecté
 * dans le rendu courant sans jamais interrompre la vue. Zéro réseau, zéro
 * aléa, zéro horloge propre (aucune boucle rAF, aucun minuteur) : le mouvement
 * est porté par les animations et transitions CSS, pilotées par attributs. */

const CSS_ID = 'constellation-e040';
const COMET_ID = 'e040-comet';
const LIVE_ID = 'e040-live';
const EPS = 0.06; /* Tolérance sur des coordonnées arrondies à 2 décimales. */

const CSS = `
/* E040-01 — Tracé progressif normalisé : pathLength=1 posé en JS,
   chaque arête révélée par stroke-dashoffset avec un décalage indexé. */
.constellation-edges line {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: e040-draw var(--e040-dur, 900ms) cubic-bezier(.22,.61,.36,1) both;
  animation-delay: calc(var(--e040-i, 0) * var(--e040-step, 38ms));
}
@keyframes e040-draw { to { stroke-dashoffset: 0; } }

/* E040-03 — Respiration des arêtes du chemin actif (marquées en JS). */
.constellation-edges line[data-e040-pulse="1"] {
  animation:
    e040-draw var(--e040-dur, 900ms) cubic-bezier(.22,.61,.36,1) both,
    e040-breathe 2600ms ease-in-out var(--e040-dur, 900ms) infinite alternate;
}
@keyframes e040-breathe {
  from { stroke-opacity: .58; stroke-width: 1.2; }
  to   { stroke-opacity: 1;   stroke-width: 2.1; }
}

/* E040-04 — Comète glissant sur l'arête du repère actif. */
.constellation-edges line#e040-comet {
  stroke: #ffe3a6;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-dasharray: .12 .88;
  stroke-dashoffset: 1;
  opacity: .9;
  animation: e040-comet-run 1900ms linear infinite;
}
@keyframes e040-comet-run { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }

/* E040-05 — Transition des arêtes incidentes au nœud survolé ou focalisé. */
.constellation-edges line {
  transition: stroke 220ms ease, stroke-width 220ms ease,
              stroke-opacity 220ms ease, opacity 220ms ease;
}
.constellation-edges line.e040-incident {
  stroke: rgba(255, 227, 166, .95);
  stroke-width: 2;
  stroke-opacity: 1;
  opacity: 1;
}

/* E040-06 — Estompage contextuel du reste du graphe. */
.constellation-field[data-e040-dim="1"][data-e040-focus="1"] .constellation-edges line:not(.e040-incident) {
  opacity: .2;
}

/* E040-08 — Fondu d'entrée de la couche d'arêtes. */
.constellation-edges[data-e040-layer="in"] {
  animation: e040-layer-in var(--e040-dur, 900ms) ease-out both;
}
@keyframes e040-layer-in {
  from { opacity: 0; transform: scale(.985); }
  to   { opacity: 1; transform: scale(1); }
}

/* E040-10 — Dérive lente des arêtes lunaires (dasharray respirant). */
.constellation-edges[data-e040-moon="drift"] line.is-moon {
  animation:
    e040-draw var(--e040-dur, 900ms) ease-out both,
    e040-drift 3200ms ease-in-out 600ms infinite alternate;
}
@keyframes e040-drift {
  from { stroke-dasharray: .16 .84; }
  to   { stroke-dasharray: .48 .52; }
}

/* E040-07 — Mouvement réduit : bascule par attribut et par média.
   Le dashoffset est remis à zéro pour éviter des arêtes invisibles. */
[data-e040-motion="reduce"] .constellation-edges line {
  animation: none !important;
  transition: none !important;
  stroke-dashoffset: 0 !important;
  stroke-dasharray: none !important;
  opacity: 1 !important;
}
[data-e040-motion="reduce"] .constellation-edges {
  animation: none !important;
}
[data-e040-motion="reduce"] #e040-comet { display: none !important; }

@media (prefers-reduced-motion: reduce) {
  .constellation-edges line {
    animation: none !important;
    transition: none !important;
    stroke-dashoffset: 0 !important;
    stroke-dasharray: none !important;
    opacity: 1 !important;
  }
  .constellation-edges { animation: none !important; }
  #e040-comet { display: none !important; }
}

/* E040-09 — Miroir textuel du mouvement (région visuellement masquée). */
.e040-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
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

function nearEndpoint(line, point) {
  const x1 = num(line.getAttribute('x1'), NaN);
  const y1 = num(line.getAttribute('y1'), NaN);
  const x2 = num(line.getAttribute('x2'), NaN);
  const y2 = num(line.getAttribute('y2'), NaN);
  const touches = (ax, ay) => Number.isFinite(ax) && Number.isFinite(ay)
    && Math.abs(ax - point.x) <= EPS && Math.abs(ay - point.y) <= EPS;
  return touches(x1, y1) || touches(x2, y2);
}

register('E040', (ctx) => {
  /* Garde d'entrée : sans layout, aucun ajout DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const layout = ctx.layout;
  const css = typeof ctx.css === 'function' ? ctx.css : () => {};
  const el = typeof ctx.el === 'function' ? ctx.el : (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Un seul appel de stylesheet, avant toute mutation du DOM. */
  safe(() => css(CSS_ID, CSS));

  const field = layout.querySelector('.constellation-field');
  const edges = field ? field.querySelector('.constellation-edges') : null;
  let live = null;

  if (!field || !edges) {
    /* Constellation vide : la feuille de style reste inoffensive. */
    safe(() => layout.setAttribute('data-e040-motion',
      ctx.reducedMotion && ctx.reducedMotion() ? 'reduce' : 'full'));
    return;
  }

  const edgeLines = () => Array.from(edges.querySelectorAll('line'))
    .filter((line) => line.id !== COMET_ID);

  /* E040-01 — Normalise la longueur de chaque arête (pathLength=1) et pose
   * l'index de décalage --e040-i : le tracé progressif devient séquentiel. */
  safe(() => {
    edgeLines().forEach((line, index) => {
      line.setAttribute('pathLength', '1');
      line.style.setProperty('--e040-i', String(index));
      line.setAttribute('data-e040-edge', String(index));
    });
  });

  /* E040-02 — Budget de durée calculé depuis le nombre d'arêtes : plus le
   * graphe est dense, plus le pas est court, sans dépasser 1,4 s au total. */
  safe(() => {
    const count = Math.max(1, edgeLines().length);
    const duration = Math.min(1400, 420 + count * 28);
    const step = Math.max(16, Math.min(60, Math.round(620 / count)));
    field.style.setProperty('--e040-dur', `${duration}ms`);
    field.style.setProperty('--e040-step', `${step}ms`);
    field.setAttribute('data-e040-count', String(count));
  });

  /* E040-03 — Marque les arêtes du chemin actif : la respiration CSS ne
   * s'applique qu'à elles, pas aux liens secondaires du graphe. */
  safe(() => {
    edgeLines().forEach((line) => {
      const classes = line.getAttribute('class') || '';
      if (classes.split(/\s+/).includes('is-path') && !classes.split(/\s+/).includes('is-moon')) {
        line.setAttribute('data-e040-pulse', '1');
      } else {
        line.removeAttribute('data-e040-pulse');
      }
    });
  });

  /* E040-04 — Duplique l'arête active en une ligne SVG « comète » unique,
   * identifiée e040-comet, dont le point lumineux court le long du trait. */
  safe(() => {
    if (document.getElementById(COMET_ID) && document.getElementById(COMET_ID).isConnected) return;
    const source = edgeLines().find((line) => line.getAttribute('data-e040-pulse') === '1');
    if (!source) return;
    const comet = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    comet.id = COMET_ID;
    ['x1', 'y1', 'x2', 'y2'].forEach((name) => comet.setAttribute(name, source.getAttribute(name)));
    comet.setAttribute('pathLength', '1');
    comet.setAttribute('class', 'e040-comet');
    comet.setAttribute('vector-effect', 'non-scaling-stroke');
    edges.appendChild(comet);
  });

  /* E040-06 — Arme l'estompage contextuel : les arêtes non incidentes
   * s'effacent seulement pendant qu'un nœud est survolé ou focalisé. */
  safe(() => field.setAttribute('data-e040-dim', '1'));

  /* E040-09 — Région de statut visuellement masquée : le mouvement des
   * arêtes a un équivalent textuel, y compris au clavier. */
  safe(() => {
    let node = document.getElementById(LIVE_ID);
    if (!node || !node.isConnected) {
      node = el('p', 'e040-sr', 'Mise en évidence des arêtes : en attente d’interaction.');
      node.id = LIVE_ID;
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-atomic', 'true');
      layout.appendChild(node);
    }
    live = node;
  });

  /* E040-05 — Écouteurs délégués : pointer et focus sont mis en regard des
   * extrémités des traits ; les arêtes incidentes reçoivent e040-incident. */
  safe(() => {
    if (field.getAttribute('data-e040-bound') === '1') return;
    field.setAttribute('data-e040-bound', '1');

    const asNode = (target) => {
      if (!target || typeof target.closest !== 'function') return null;
      const node = target.closest('[data-const-key]');
      return node && field.contains(node) ? node : null;
    };
    const announce = (message) => {
      if (live && live.isConnected && live.textContent !== message) live.textContent = message;
    };
    const highlight = (node) => {
      const point = positionOf(node);
      if (!point) return;
      const lines = edgeLines();
      const hits = lines.filter((line) => nearEndpoint(line, point));
      lines.forEach((line) => line.classList.toggle('e040-incident', hits.includes(line)));
      field.setAttribute('data-e040-focus', '1');
      field.setAttribute('data-e040-node', node.getAttribute('data-const-key') || '');
      announce(`${hits.length} arête${hits.length > 1 ? 's' : ''} mise${hits.length > 1 ? 's' : ''} en évidence depuis ce nœud.`);
    };
    const release = () => {
      edgeLines().forEach((line) => line.classList.remove('e040-incident'));
      field.removeAttribute('data-e040-focus');
      field.removeAttribute('data-e040-node');
      announce('Mise en évidence des arêtes terminée.');
    };

    field.addEventListener('pointerover', (event) => {
      const node = asNode(event.target);
      if (node) highlight(node);
    });
    field.addEventListener('pointerout', (event) => {
      const node = asNode(event.target);
      if (!node) return;
      const next = asNode(event.relatedTarget);
      if (next && next !== node) highlight(next);
      else release();
    });
    field.addEventListener('focusin', (event) => {
      const node = asNode(event.target);
      if (node) highlight(node);
    });
    field.addEventListener('focusout', (event) => {
      const node = asNode(event.target);
      if (!node) return;
      const next = asNode(event.relatedTarget);
      if (!next) release();
    });
  });

  /* E040-07 — Bascule de mouvement réduit réactive : ctx.reducedMotion() est
   * lu à chaque rendu, puis suivi sans minuteur via MediaQueryList. */
  safe(() => {
    let reduced = false;
    try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); } catch { reduced = false; }
    layout.setAttribute('data-e040-motion', reduced ? 'reduce' : 'full');
    if (layout.getAttribute('data-e040-bound-motion') === '1') return;
    layout.setAttribute('data-e040-bound-motion', '1');
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => layout.setAttribute('data-e040-motion', event.matches ? 'reduce' : 'full');
    if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
    else if (typeof query.addListener === 'function') query.addListener(onChange);
  });

  /* E040-08 — Marque la couche SVG comme entrante : le fondu d'ensemble
   * accompagne le tracé des arêtes, sans toucher aux boutons de nœuds. */
  safe(() => edges.setAttribute('data-e040-layer', 'in'));

  /* E040-10 — Active la dérive des seules arêtes lunaires (repères
   * secondaires), distincte de la respiration du chemin principal. */
  safe(() => edges.setAttribute('data-e040-moon', 'drift'));
});
