import { register } from './registry.js';

/*
 * Lentille E088 — Instrumentation E2E appliquée au chemin de connexion de la
 * vue Constellation (le réseau SVG de traits soleil → repère → point).
 *
 * Dix chantiers E088-01 … E088-10, tous implémentés dans CE seul module.
 * Aucun fichier partagé n'est modifié ; aucun appel réseau, aucune source
 * d'aléa, aucun journal de débogage, aucun minuteur ni boucle d'animation
 * propre. La trace est un compteur séquentiel local, l'empreinte un hachage
 * déterministe : deux rendus identiques produisent exactement la même sortie.
 */

const PROBE_ID = 'e088-probe';
const EDGE_PREFIX = 'e088-edge-';
const TRACE_MAX = 24;
const DEGENERATE_MIN = 1;
const BOUND_MIN = 0;
const BOUND_MAX = 100;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/* Trace conservée entre deux rendus du shell : sans horodatage, donc rejouable. */
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
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

register('E088', (ctx) => {
  /* Garde d'entrée : sans layout valide, aucun ajout au DOM, pas même la
     feuille de style injectée dans <head> par ctx.css. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined' || typeof ctx.css !== 'function') return;

  const layout = ctx.layout;
  const make = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  /* Feuille unique de la lentille, injectée une seule fois via ctx.css. */
  ctx.css('constellation-e088', `
/* E088-03 — surlignage du chemin actif en mode diagnostic seulement. */
.constellation-layout[data-e088="on"] .const-edge.e088-path {
  stroke-dasharray: 3 2;
}
/* E088-06 — contour des segments dégénérés ou hors cadre. */
.constellation-layout[data-e088="on"] .const-edge.e088-degen {
  stroke: var(--violet, #b28bdd) !important;
  stroke-width: 2.5 !important;
  stroke-dasharray: 1 3 !important;
}
/* E088-09 — panneau de sonde : masqué en régime nominal, visible en diagnostic. */
#e088-probe { display: none !important; }
body.constellation-diagnostics #e088-probe {
  display: block !important;
  margin: 12px 0 0; padding: 10px 12px;
  border: 1px solid var(--line, #3a4150); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
#e088-probe h2 { margin: 0 0 6px; color: var(--gold); font: 600 12px/1.3 inherit; }
#e088-probe p {
  margin: 0 0 4px; color: var(--muted); font-size: 10px; line-height: 1.45;
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
/* E088-10 — aucune transition sur la sonde ni sur les traits en mouvement réduit. */
.constellation-layout[data-e088-motion="reduce"] #e088-probe *,
.constellation-layout[data-e088-motion="reduce"] .const-edge { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  #e088-probe *, .const-edge { transition: none !important; }
}
`);

  const edges = layout.querySelector('.constellation-edges');
  if (!edges || typeof edges.querySelectorAll !== 'function') return;

  const lines = Array.prototype.slice.call(edges.querySelectorAll('line.const-edge'));
  const field = layout.querySelector('.constellation-field');

  /* Chaque trait est lu une seule fois : x1/y1/x2/y2 sont exprimés dans le
     repère 0–100 du viewBox, sans dépendance à la taille réelle du champ. */
  const segments = lines.map((line) => ({
    node: line,
    x1: numeric(line.getAttribute('x1'), 50),
    y1: numeric(line.getAttribute('y1'), 50),
    x2: numeric(line.getAttribute('x2'), 50),
    y2: numeric(line.getAttribute('y2'), 50),
    moon: line.classList.contains('is-moon'),
    path: line.classList.contains('is-path'),
  }));

  /* E088-01 — identifiants de test stables : un id unique préfixé e088- et
     une clé de nature sur chaque arête, sans recourir à :nth-child(). */
  segments.forEach((segment, index) => {
    segment.node.setAttribute('id', EDGE_PREFIX + pad(index));
    segment.node.setAttribute('data-e088-edge', segment.path
      ? (segment.moon ? 'lune-active' : 'chemin-actif')
      : (segment.moon ? 'lune' : 'liaison'));
    segment.node.setAttribute('data-e088-pair',
      segment.x1.toFixed(2) + ',' + segment.y1.toFixed(2) + '>'
      + segment.x2.toFixed(2) + ',' + segment.y2.toFixed(2));
  });

  /* E088-02 — relevé de géométrie : longueur euclidienne de chaque segment,
     plage min–max exposée sur le réseau pour une assertion de dispersion. */
  let lengthMin = Infinity;
  let lengthMax = 0;
  segments.forEach((segment) => {
    const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
    segment.length = length;
    segment.node.setAttribute('data-e088-len', length.toFixed(2));
    if (length < lengthMin) lengthMin = length;
    if (length > lengthMax) lengthMax = length;
  });
  edges.setAttribute('data-e088-geom', segments.length
    ? 'longueur ' + lengthMin.toFixed(2) + '–' + lengthMax.toFixed(2) + ' u'
    : 'aucun segment');

  /* E088-03 — recensement des segments : chemin principal, ramification
     lunaire et simples liaisons, avec le total des traits marqués actifs. */
  const pathCount = segments.filter((s) => s.path && !s.moon).length;
  const moonCount = segments.filter((s) => s.moon).length;
  const activeMoonCount = segments.filter((s) => s.moon && s.path).length;
  const linkCount = segments.length - pathCount - moonCount;
  edges.setAttribute('data-e088-census',
    'total=' + segments.length + ';chemin=' + pathCount + ';lune=' + moonCount
    + ';liaison=' + linkCount + ';actif=' + (pathCount + activeMoonCount));

  /* E088-04 — assertion de continuité de la chaîne active : l'extrémité du
     segment soleil→repère doit rejoindre l'origine du trait lunaire actif. */
  const mainPath = segments.find((s) => s.path && !s.moon) || null;
  const activeMoon = segments.find((s) => s.moon && s.path) || null;
  let gap = Infinity;
  let continuity = 0;
  if (mainPath && activeMoon) {
    gap = Math.hypot(activeMoon.x1 - mainPath.x2, activeMoon.y1 - mainPath.y2);
    continuity = gap <= 0.5 ? 1 : 0;
  }
  edges.setAttribute('data-e088-continuity',
    'ok=' + continuity + ';ecart=' + (Number.isFinite(gap) ? gap.toFixed(2) : '—'));
  if (continuity === 1 && mainPath && activeMoon) {
    mainPath.node.classList.add('e088-path');
    activeMoon.node.classList.add('e088-path');
  }

  /* E088-05 — trace d'activation déléguée : un seul écouteur par champ pour
     clic et focus, borné à 24 entrées, sans horodatage ni minuteur. */
  if (field && typeof field.addEventListener === 'function'
      && field.getAttribute('data-e088-bound') !== '1') {
    field.setAttribute('data-e088-bound', '1');
    const record = (type, target) => {
      const node = target && typeof target.closest === 'function'
        ? target.closest('[data-const-key]') : null;
      if (!node) return;
      sequence += 1;
      trace.push(sequence + ':' + type + ':' + (node.getAttribute('data-const-key') || '?'));
      if (trace.length > TRACE_MAX) trace.shift();
      field.setAttribute('data-e088-trace', String(sequence));
      const out = layout.querySelector('#e088-trace');
      if (out) out.textContent = trace.join(' · ');
    };
    field.addEventListener('click', (event) => record('clic', event.target), { passive: true });
    field.addEventListener('focusin', (event) => record('focus', event.target), { passive: true });
  }

  /* E088-06 — détection des segments dégénérés ou sortis du cadre 0–100. */
  let degenerate = 0;
  segments.forEach((segment) => {
    const inside = [segment.x1, segment.y1, segment.x2, segment.y2].every((value) =>
      value >= BOUND_MIN && value <= BOUND_MAX);
    if (segment.length < DEGENERATE_MIN || !inside) {
      degenerate += 1;
      segment.node.classList.add('e088-degen');
    }
  });
  edges.setAttribute('data-e088-degen', String(degenerate));

  /* E088-07 — cohérence du chemin lunaire : chaque point rendu doit avoir
     son trait, et un seul trait lunaire doit porter le marqueur actif. */
  const moons = layout.querySelectorAll('.const-moon').length;
  const lunarOk = moonCount === moons && activeMoonCount === 1 ? 1 : 0;
  edges.setAttribute('data-e088-lunar',
    'points=' + moons + ';traits=' + moonCount + ';actifs=' + activeMoonCount + ';ok=' + lunarOk);

  /* E088-08 — mesure pondérée du trait : 1 pour une liaison ordinaire,
     1,6 pour le chemin actif, 0,85 / 0,35 pour les lunesactive/inactive.
     La liaison ordinaire sert de référence explicite au calcul de densité. */
  let weightSum = 0;
  segments.forEach((segment) => {
    let weight = 1;
    if (segment.moon) weight = segment.path ? 0.85 : 0.35;
    else if (segment.path) weight = 1.6;
    segment.node.setAttribute('data-e088-stroke', weight.toFixed(2));
    weightSum += weight;
  });
  const density = segments.length ? weightSum / segments.length : 0;
  edges.setAttribute('data-e088-density',
    'densite=' + density.toFixed(2) + '/reference=1.00');

  /* E088-09 — panneau de sonde E2E : quatre lignes lisibles, hors du flux
     nominal mais structuré et nommé pour un lecteur d'écran. */
  let probe = layout.querySelector('#' + PROBE_ID);
  if (!probe) {
    probe = make('section', 'e088-probe');
    probe.id = PROBE_ID;
    probe.setAttribute('role', 'group');
    probe.setAttribute('aria-label', 'Sonde E2E du chemin de connexion');
    probe.setAttribute('data-constellation-diagnostic', '');
    probe.appendChild(make('h2', '', 'E088 · Sonde E2E — chemin de connexion'));
    ['e088-resume', 'e088-etat', 'e088-trace', 'e088-stamp'].forEach((id) => {
      const line = make('p', '', '');
      line.id = id;
      probe.appendChild(line);
    });
    layout.appendChild(probe);
  }
  const write = (id, text) => {
    const node = layout.querySelector('#' + id);
    if (node) node.textContent = text;
  };
  write('e088-resume', edges.getAttribute('data-e088-geom') + ' · '
    + edges.getAttribute('data-e088-census'));
  write('e088-etat', 'Continuité ' + edges.getAttribute('data-e088-continuity')
    + ' · lunaire ' + edges.getAttribute('data-e088-lunar')
    + ' · dégénérés ' + edges.getAttribute('data-e088-degen'));
  write('e088-trace', trace.length ? trace.join(' · ') : 'Aucun événement');

  /* E088-10 — empreinte de non-régression du chemin, calculée sur les seules
     données géométriques et sémantiques déjà relevées, puis couplée au
     mouvement réduit demandé par le contexte. */
  const raw = segments.map((s, index) => index + '|' + s.node.getAttribute('data-e088-edge')
    + '|' + s.node.getAttribute('data-e088-pair')
    + '|' + s.node.getAttribute('data-e088-len')).join(';');
  const stamp = fingerprint(raw);
  layout.setAttribute('data-e088', 'on');
  layout.setAttribute('data-e088-fingerprint', stamp);
  const reduce = typeof ctx.reducedMotion === 'function' && Boolean(ctx.reducedMotion());
  layout.setAttribute('data-e088-motion', reduce ? 'reduce' : 'full');
  write('e088-stamp', 'Empreinte ' + stamp + ' · mouvement '
    + (reduce ? 'réduit' : 'complet') + ' · ' + edges.getAttribute('data-e088-density'));
});
