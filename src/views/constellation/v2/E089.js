import { register } from './registry.js';

/* Lentille V2 E089 — audit structurel et stabilité du chemin de connexion de la
   vue Constellation (réseau de segments SVG .const-edge reliant le soleil de
   l'ère active aux planètes, puis aux lunes). Seconde passe : dix chantiers
   inédits, tous implémentés, déterministes, sans réseau ni source aléatoire,
   sans minuteur ni boucle d'animation propre, sans aucune sortie journalisée. */
register('E089', (ctx) => {
  /* Garde d'entrée : sans layout interrogeable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function'
      || typeof document === 'undefined') return;
  const css = typeof ctx.css === 'function' ? ctx.css : null;
  if (!css) return;
  const layout = ctx.layout;

  /* Utilitaires tolérants : aucune opération ne doit lever d'exception. */
  const setAttr = (node, name, value) => {
    if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
  };
  const addClass = (node, name) => {
    if (node && node.classList && typeof node.classList.add === 'function') node.classList.add(name);
  };
  const hasClass = (node, name) => !!(node && node.classList
    && typeof node.classList.contains === 'function' && node.classList.contains(name));

  /* Feuille unique de la lentille, portée par la classe v2e089-edges. */
  css('constellation-v2-e089', `
    .v2e089-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    .v2e089-edges .v2e089-elongated{stroke-dasharray:6 2;opacity:.85}
    .v2e089-edges .v2e089-duplicate{stroke-dasharray:1 3;opacity:.55}
    .v2e089-edges .v2e089-crossing{stroke-dasharray:4 1 1 1}
  `);

  /* Repérage tolérant du tracé, puis collecte des segments exploitables. */
  const edges = layout.querySelector('svg.constellation-edges');
  if (!edges || typeof edges.setAttribute !== 'function'
      || typeof edges.querySelectorAll !== 'function') return;
  addClass(edges, 'v2e089-edges');
  setAttr(edges, 'data-v2e089-present', '1');

  const segments = Array.from(edges.querySelectorAll('line.const-edge'));
  const AXES = ['x1', 'y1', 'x2', 'y2'];
  const read = (line, attr) => {
    const raw = typeof line.getAttribute === 'function' ? line.getAttribute(attr) : null;
    if (raw === null || String(raw).trim() === '') return NaN;
    const value = Number(raw);
    return Number.isFinite(value) ? value : NaN;
  };
  const sound = (line) => AXES.every(attr => Number.isFinite(read(line, attr)));
  const valid = segments.filter(sound);
  const coord = (line) => AXES.map(attr => read(line, attr).toFixed(2)).join(',');
  const point = (line, offset) => AXES.slice(offset, offset + 2)
    .map(attr => read(line, attr).toFixed(2)).join(',');
  const canonical = (line) => [point(line, 0), point(line, 2)].sort().join('|');

  /* E089-01 — Signature de stabilité entre rendus, conservée sous clé window. */
  const signature = valid.map(coord).sort().join('~');
  const hashOf = (text) => {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
  };
  const digest = hashOf(signature);
  const storeKey = '__v2e089_signature';
  let previous = null;
  if (typeof window !== 'undefined') {
    previous = window[storeKey] || null;
    window[storeKey] = digest;
  }
  setAttr(edges, 'data-v2e089-hash', digest);
  setAttr(edges, 'data-v2e089-stable', previous !== null && previous === digest ? '1' : '0');

  /* E089-02 — Longueurs recalculées et allongements anormaux signalés. */
  const lengths = valid.map((line) => {
    const dx = read(line, 'x2') - read(line, 'x1');
    const dy = read(line, 'y2') - read(line, 'y1');
    return Math.sqrt(dx * dx + dy * dy);
  });
  valid.forEach((line, index) => setAttr(line, 'data-v2e089-length', lengths[index].toFixed(2)));
  const sortedLengths = lengths.slice().sort((a, b) => a - b);
  const count = sortedLengths.length;
  const median = count === 0 ? 0 : (count % 2
    ? sortedLengths[(count - 1) / 2]
    : (sortedLengths[count / 2 - 1] + sortedLengths[count / 2]) / 2);
  const ceiling = Math.max(2, median * 4);
  let outliers = 0;
  lengths.forEach((length, index) => {
    if (length > ceiling) {
      addClass(valid[index], 'v2e089-elongated');
      setAttr(valid[index], 'data-v2e089-outlier', '1');
      outliers += 1;
    }
  });
  setAttr(edges, 'data-v2e089-length-median', median.toFixed(2));
  setAttr(edges, 'data-v2e089-length-max', count ? sortedLengths[count - 1].toFixed(2) : '0.00');
  setAttr(edges, 'data-v2e089-outlier-count', String(outliers));

  /* E089-03 — Doublons de segments détectés par paire d'extrémités. */
  const seen = new Set();
  let duplicates = 0;
  valid.forEach((line) => {
    const key = canonical(line);
    if (seen.has(key)) {
      addClass(line, 'v2e089-duplicate');
      setAttr(line, 'data-v2e089-duplicate', '1');
      duplicates += 1;
    } else {
      seen.add(key);
    }
  });
  setAttr(edges, 'data-v2e089-duplicate-count', String(duplicates));

  /* E089-04 — Composantes connexes du graphe, comptées par union-find. */
  const parent = new Map();
  const find = (node) => {
    let root = node;
    while (parent.get(root) !== root) root = parent.get(root);
    let cursor = node;
    while (parent.get(cursor) !== cursor) {
      const next = parent.get(cursor);
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  valid.forEach((line) => {
    const start = point(line, 0);
    const end = point(line, 2);
    if (!parent.has(start)) parent.set(start, start);
    if (!parent.has(end)) parent.set(end, end);
    union(start, end);
  });
  const roots = new Set();
  parent.forEach((value, key) => roots.add(find(key)));
  setAttr(edges, 'data-v2e089-components', String(roots.size));

  /* E089-05 — Répartition angulaire horizontale / verticale / diagonale. */
  let horizontal = 0;
  let vertical = 0;
  let diagonal = 0;
  valid.forEach((line) => {
    const dx = Math.abs(read(line, 'x2') - read(line, 'x1'));
    const dy = Math.abs(read(line, 'y2') - read(line, 'y1'));
    let kind = 'diagonale';
    if (dy < 0.001) kind = 'horizontale';
    else if (dx < 0.001) kind = 'verticale';
    if (kind === 'horizontale') horizontal += 1;
    else if (kind === 'verticale') vertical += 1;
    else diagonal += 1;
    setAttr(line, 'data-v2e089-angle-kind', kind);
  });
  setAttr(edges, 'data-v2e089-orient-h', String(horizontal));
  setAttr(edges, 'data-v2e089-orient-v', String(vertical));
  setAttr(edges, 'data-v2e089-orient-d', String(diagonal));

  /* E089-06 — Densité des milieux de segments dans les quatre quadrants. */
  const quadrants = [0, 0, 0, 0];
  valid.forEach((line) => {
    const mx = (read(line, 'x1') + read(line, 'x2')) / 2;
    const my = (read(line, 'y1') + read(line, 'y2')) / 2;
    let index = 0;
    if (mx >= 50) index += 1;
    if (my >= 50) index += 2;
    quadrants[index] += 1;
    setAttr(line, 'data-v2e089-quadrant', String(index + 1));
  });
  quadrants.forEach((total, index) => setAttr(edges, `data-v2e089-q${index + 1}`, String(total)));
  setAttr(edges, 'data-v2e089-empty-quadrants', String(quadrants.filter(n => n === 0).length));

  /* E089-07 — Symétrie axiale du tracé d'après un miroir autour de x = 50. */
  const coordSet = new Set(valid.map(canonical));
  let symmetric = 0;
  valid.forEach((line) => {
    const mirrored = [100 - read(line, 'x1'), read(line, 'y1'),
      100 - read(line, 'x2'), read(line, 'y2')];
    const first = `${mirrored[0].toFixed(2)},${mirrored[1].toFixed(2)}`;
    const second = `${mirrored[2].toFixed(2)},${mirrored[3].toFixed(2)}`;
    if (coordSet.has([first, second].sort().join('|'))) {
      symmetric += 1;
      setAttr(line, 'data-v2e089-symmetric', '1');
    }
  });
  setAttr(edges, 'data-v2e089-symmetry', valid.length ? (symmetric / valid.length).toFixed(2) : '0.00');

  /* E089-08 — Ordre de superposition : chemin actif avant les raccords. */
  const pathIndexes = [];
  const moonIndexes = [];
  valid.forEach((line, index) => {
    if (hasClass(line, 'is-path')) pathIndexes.push(index);
    if (hasClass(line, 'is-moon')) moonIndexes.push(index);
  });
  const lastPath = pathIndexes.length ? pathIndexes[pathIndexes.length - 1] : -1;
  const firstMoon = moonIndexes.length ? moonIndexes[0] : -1;
  const painted = lastPath < 0 || firstMoon < 0 || lastPath < firstMoon;
  setAttr(edges, 'data-v2e089-paint-order', painted ? 'chemin-avant-lunes' : 'anomalie');
  setAttr(edges, 'data-v2e089-path-index', String(lastPath));
  setAttr(edges, 'data-v2e089-moon-index', String(firstMoon));

  /* E089-09 — Croisements entre segments, extrémités partagées exclues. */
  const side = (a, b, c) => {
    const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
    if (Math.abs(value) < 1e-6) return 0;
    return value > 0 ? 1 : 2;
  };
  const crosses = (a, b, c, d) => side(a, b, c) !== side(a, b, d)
    && side(c, d, a) !== side(c, d, b);
  let crossings = 0;
  for (let i = 0; i < valid.length; i += 1) {
    for (let j = i + 1; j < valid.length; j += 1) {
      const a = valid[i];
      const b = valid[j];
      const a1 = [read(a, 'x1'), read(a, 'y1')];
      const a2 = [read(a, 'x2'), read(a, 'y2')];
      const b1 = [read(b, 'x1'), read(b, 'y1')];
      const b2 = [read(b, 'x2'), read(b, 'y2')];
      const shared = [a1, a2].some(p => [b1, b2].some(q => p[0] === q[0] && p[1] === q[1]));
      if (shared) continue;
      if (crosses(a1, a2, b1, b2)) {
        crossings += 1;
        addClass(a, 'v2e089-crossing');
        addClass(b, 'v2e089-crossing');
        setAttr(a, 'data-v2e089-crossing', '1');
        setAttr(b, 'data-v2e089-crossing', '1');
      }
    }
  }
  setAttr(edges, 'data-v2e089-crossing-count', String(crossings));

  /* E089-10 — Bilan de santé agrégé, annoncé dans une région live dédiée. */
  const anomalies = duplicates + crossings + outliers
    + (roots.size > 1 ? roots.size - 1 : 0)
    + quadrants.filter(n => n === 0).length;
  const health = anomalies === 0 ? 'sain' : (anomalies <= 3 ? 'a-surveiller' : 'degrade');
  setAttr(edges, 'data-v2e089-health', health);
  setAttr(edges, 'data-v2e089-anomaly-count', String(anomalies));
  const make = typeof ctx.el === 'function' ? ctx.el : null;
  let live = layout.querySelector('#v2e089-summary');
  if (!live) {
    live = make ? make('p', 'v2e089-sr', '') : document.createElement('p');
    if (!live.id) live.id = 'v2e089-summary';
    setAttr(live, 'role', 'status');
    setAttr(live, 'aria-live', 'polite');
    setAttr(live, 'aria-atomic', 'true');
    layout.appendChild(live);
  }
  live.textContent = `Tracé de connexion : ${valid.length} segment(s) fiable(s), `
    + `${anomalies} anomalie(s) structurelle(s) — bilan ${health}.`;
});
