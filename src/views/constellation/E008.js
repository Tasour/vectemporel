import { register } from './registry.js';

/*
 * Lentille E008 — Instrumentation E2E appliquée aux soleils de la Constellation.
 *
 * Dix chantiers (E008-01 … E008-10) implémentés dans CE seul module : aucun
 * fichier partagé n'est modifié. Aucun appel réseau, aucun aléa, aucun journal
 * d'exécution, aucune boucle d'animation. La trace est un compteur séquentiel
 * local ; l'empreinte est un hachage déterministe des soleils rendus.
 */

const CSS_ID = 'constellation-e008';
const PROBE_ID = 'e008-probe';
const FLAG = 'data-e008';
const SUN_PREFIX = 'e008-sun-';
const TRACE_MAX = 24;
const HIT_MIN = 36;
const COLLISION_MIN = 12;

/* Trace mémorisée entre deux rendus du shell : aucun horodatage, donc rejouable. */
const trace = [];
let sequence = 0;

function pad(value) {
  return String(value).padStart(2, '0');
}

function numeric(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/* FNV-1a 32 bits : pure, sans graine aléatoire, stable d'un rendu à l'autre. */
function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* Feuille unique des dix chantiers, injectée une seule fois via ctx.css. */
const CSS = `
/* E008-03 — contour des soleils en collision, révélé avec le diagnostic. */
.constellation-layout[${FLAG}="on"] .const-sun.e008-collision { outline: 2px dashed var(--violet); outline-offset: 2px; }
/* E008-08 — plancher de cible tactile si une régression est mesurée. */
.constellation-layout[${FLAG}="on"] .const-sun.e008-hit-small { min-width: 44px; min-height: 44px; }
/* E008-09 — panneau de sonde : masqué par défaut, visible en diagnostic. */
#${PROBE_ID} { display: none !important; }
body.constellation-diagnostics #${PROBE_ID} {
  display: block !important; margin: 12px 0 0; padding: 10px 12px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
#${PROBE_ID} h2 { margin: 0 0 6px; color: var(--gold); font: 600 12px/1.3 inherit; }
#${PROBE_ID} p {
  margin: 0 0 4px; color: var(--muted); font-size: 10px; line-height: 1.45;
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
/* E008-10 — aucune transition sur la sonde quand le mouvement est réduit. */
.constellation-layout[data-e008-motion="reduce"] #${PROBE_ID} *,
.constellation-layout[data-e008-motion="reduce"] .e008-collision { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  #${PROBE_ID} *, .e008-collision { transition: none !important; }
}
`;

register('E008', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (!layout || typeof layout.querySelector !== 'function' || typeof el !== 'function') return;

  css(CSS_ID, CSS);
  const suns = Array.prototype.slice.call(layout.querySelectorAll('.const-sun'));
  const layer = layout.querySelector('.const-layer-suns');
  const field = layout.querySelector('.constellation-field');

  /* E008-01 — identifiants de test stables : id unique et clé E2E par soleil. */
  suns.forEach((sun, index) => {
    const key = sun.dataset && sun.dataset.constKey ? sun.dataset.constKey : 'sun:' + index;
    sun.id = SUN_PREFIX + pad(index);
    sun.setAttribute('data-e008-sun', key);
  });

  /* E008-02 — relevé de géométrie : positions lisibles et rayon min/max calculé. */
  const positions = suns.map((sun) => {
    const style = sun.style;
    const x = numeric(style.getPropertyValue('--x'), 50);
    const y = numeric(style.getPropertyValue('--y'), 50);
    sun.setAttribute('data-e008-pos', x.toFixed(2) + ',' + y.toFixed(2));
    return { x, y };
  });
  const radii = positions.map((point) => Math.hypot(point.x - 50, point.y - 50));
  const geometryLine = radii.length
    ? 'Géométrie : rayon ' + Math.min(...radii).toFixed(2) + '–' + Math.max(...radii).toFixed(2) + ' %, soleils ' + suns.length
    : 'Géométrie : aucun soleil';
  if (layer) layer.setAttribute('data-e008-geom', radii.length ? Math.max(...radii).toFixed(2) : '0');

  /* E008-03 — détection déterministe des chevauchements entre paires de soleils. */
  let collisions = 0;
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const distance = Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y);
      if (distance < COLLISION_MIN) {
        collisions += 1;
        suns[i].classList.add('e008-collision');
        suns[j].classList.add('e008-collision');
      }
    }
  }
  if (layer) layer.setAttribute('data-e008-collision', String(collisions));
  const collisionLine = 'Chevauchements : ' + collisions + ' paire(s) sous ' + COLLISION_MIN + ' %';

  /* E008-04 — recensement : le soleil d'index maximal fixe le nombre attendu. */
  let maxIndex = -1;
  suns.forEach((sun) => {
    const match = /^sun:(\d+)$/.exec(sun.getAttribute('data-e008-sun') || '');
    if (match) maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
  });
  const expected = maxIndex + 1;
  const censusOk = expected === suns.length;
  if (field) field.setAttribute('data-e008-census', 'attendu=' + expected + ';rendu=' + suns.length + ';ok=' + (censusOk ? '1' : '0'));
  const censusLine = 'Recensement : ' + expected + ' attendu(s), ' + suns.length + ' rendu(s)';

  /* E008-05 — trace d'interactions : un écouteur délégué par couche, borné à 24. */
  if (layer && layer.getAttribute('data-e008-bound') !== '1') {
    layer.setAttribute('data-e008-bound', '1');
    const record = (type, target) => {
      const sun = target && typeof target.closest === 'function' ? target.closest('.const-sun') : null;
      if (!sun) return;
      sequence += 1;
      trace.push(sequence + ':' + type + ':' + (sun.getAttribute('data-e008-sun') || '?'));
      if (trace.length > TRACE_MAX) trace.shift();
      layer.setAttribute('data-e008-trace', String(sequence));
      const out = layout.querySelector('#e008-trace');
      if (out) out.textContent = trace.join(' · ');
    };
    layer.addEventListener('click', (event) => record('clic', event.target));
    layer.addEventListener('focusin', (event) => record('focus', event.target));
  }

  /* E008-06 — contrôle d'unicité des noms accessibles des soleils. */
  const labels = new Set();
  let labelDefects = 0;
  suns.forEach((sun) => {
    const label = sun.getAttribute('aria-label') || '';
    if (!label) {
      sun.setAttribute('data-e008-aria', 'vide');
      labelDefects += 1;
    } else if (labels.has(label)) {
      sun.setAttribute('data-e008-aria', 'doublon');
      labelDefects += 1;
    } else {
      labels.add(label);
    }
  });
  if (layer) layer.setAttribute('data-e008-aria-dup', String(labelDefects));
  const ariaLine = 'Étiquettes : ' + labelDefects + ' vide(s) ou doublon(s)';

  /* E008-07 — témoin de cohérence de l'état actif (un seul aria-current). */
  const active = suns.filter((sun) => sun.getAttribute('aria-current') === 'true');
  const activeKey = active.length ? active[0].getAttribute('data-e008-sun') : 'aucun';
  if (layer) {
    layer.setAttribute('data-e008-active', activeKey);
    layer.setAttribute('data-e008-current', String(active.length));
  }
  const activeLine = 'Actif : ' + activeKey + ' (' + active.length + ' marqueur(s))';

  /* E008-08 — mesure des cibles tactiles et signalement sous le plancher. */
  let smallest = Infinity;
  suns.forEach((sun) => {
    let width = 0;
    let height = 0;
    if (typeof sun.getBoundingClientRect === 'function') {
      const rect = sun.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
    }
    sun.setAttribute('data-e008-hit', width + 'x' + height);
    if (width > 0 && height > 0) smallest = Math.min(smallest, width, height);
    if ((width > 0 && width < HIT_MIN) || (height > 0 && height < HIT_MIN)) {
      sun.classList.add('e008-hit-small');
    }
  });
  layout.setAttribute('data-e008-hit-min', Number.isFinite(smallest) ? String(smallest) : 'aucun');
  const hitLine = 'Cibles : minimum ' + (Number.isFinite(smallest) ? smallest + ' px' : 'non mesuré');

  /* E008-09 — panneau de sonde E2E : cinq lignes lisibles, hors flux nominal. */
  let probe = layout.querySelector('#' + PROBE_ID);
  if (!probe) {
    probe = el('section', 'e008-probe');
    probe.id = PROBE_ID;
    probe.setAttribute('role', 'group');
    probe.setAttribute('aria-label', 'Sonde E2E des soleils de la constellation');
    probe.setAttribute('data-constellation-diagnostic', '');
    probe.appendChild(el('h2', '', 'E008 · Sonde E2E — soleils'));
    ['e008-resume', 'e008-etat', 'e008-cibles', 'e008-trace', 'e008-stamp'].forEach((id) => {
      const line = el('p');
      line.id = id;
      probe.appendChild(line);
    });
    layout.appendChild(probe);
  }
  const write = (id, text) => {
    const node = layout.querySelector('#' + id);
    if (node) node.textContent = text;
  };
  write('e008-resume', geometryLine + ' · ' + collisionLine + ' · ' + censusLine);
  write('e008-etat', ariaLine + ' · ' + activeLine);
  write('e008-cibles', hitLine);
  const traceNode = layout.querySelector('#e008-trace');
  if (traceNode && !traceNode.textContent) traceNode.textContent = 'Aucun événement';
  if (layer) layer.setAttribute('data-e008-probe', '1');

  /* E008-10 — empreinte de non-régression et couplage au mouvement réduit. */
  const raw = suns.map((sun, index) => index + '|' + (sun.getAttribute('data-e008-sun') || '')
    + '|' + (sun.getAttribute('data-e008-pos') || '')
    + '|' + (sun.getAttribute('aria-label') || '')).join(';');
  const stamp = fingerprint(raw);
  layout.setAttribute(FLAG, 'on');
  layout.setAttribute('data-e008-fingerprint', stamp);
  const reduce = typeof reducedMotion === 'function' && reducedMotion();
  layout.setAttribute('data-e008-motion', reduce ? 'reduce' : 'full');
  write('e008-stamp', 'Empreinte ' + stamp + ' · mouvement ' + (reduce ? 'réduit' : 'complet'));
});
