import { register } from './registry.js';

/* Lentille V2 E002 — performance de rendu de la constellation (ères, repères,
   points et arêtes). Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e002 (aucune collision avec la passe 1). */
register('E002', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  css('constellation-v2-e002', `
    /* E002-01 — confinement des couches planètes et lunes, en plus des soleils. */
    .constellation-layout .const-layer-planets,
    .constellation-layout .const-layer-moons {
      contain: layout paint style;
      isolation: isolate;
    }
    /* E002-02 — arêtes SVG : rendu net, aucun filtre, non interactives. */
    .constellation-layout .constellation-edges line {
      shape-rendering: crispEdges;
      filter: none;
      pointer-events: none;
    }
    /* E002-03 — légende différée hors écran avec taille réservée. */
    @supports (content-visibility: auto) {
      .constellation-layout .constellation-caption {
        content-visibility: auto;
        contain-intrinsic-size: auto 48px;
      }
    }
    /* E002-05 — budget de nœuds visible, chiffres tabulaires. */
    .constellation-layout .v2e002-budget {
      margin: 0; color: var(--muted-2); font-size: 9px;
      font-variant-numeric: tabular-nums;
    }
    /* E002-06 — survol groupé des planètes et des lunes : opacité composable. */
    .constellation-layout .const-planet[data-v2e002-hover="1"],
    .constellation-layout .const-moon[data-v2e002-hover="1"] { opacity: .8; }
    /* E002-07 — détail des lunes : étiquette compacte pour les secondaires. */
    .constellation-layout .const-moon[data-v2e002-moon-detail="0"]::after {
      max-width: 64px; font-size: 7px;
    }
    /* E002-08 — halo de la lune active remplacé par un liseré (anti-flou). */
    .constellation-layout .const-moon[data-v2e002-halo="flat"].is-active {
      box-shadow: none;
      outline: 2px solid var(--violet);
      outline-offset: 1px;
    }
    /* E002-09 — allègement des arêtes lunaires en cas de forte densité. */
    .constellation-layout[data-v2e002-edge-lod="light"] .constellation-edges line.is-moon:not(.is-path) {
      display: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .constellation-layout .const-planet,
      .constellation-layout .const-moon { transition: none !important; }
    }
  `);

  const field = layout.querySelector('.constellation-field');
  if (!field) return;
  const sunLayer = field.querySelector('.const-layer-suns');
  const planetLayer = field.querySelector('.const-layer-planets');
  const moonLayer = field.querySelector('.const-layer-moons');
  const edges = field.querySelector('.constellation-edges');
  const caption = layout.querySelector('.constellation-caption');

  const collect = (root, selector) => root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
  const suns = collect(sunLayer, 'button.const-sun');
  const planets = collect(planetLayer, 'button.const-planet');
  const moons = collect(moonLayer, 'button.const-moon');
  const lines = collect(edges, 'line');

  const plural = (count, one, many) => `${count} ${count > 1 ? many : one}`;
  const isActive = node => !!(node && node.classList && node.classList.contains('is-active'));
  const closestOf = (target, selector, root) => {
    if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
    const node = target.closest(selector);
    return node && root && root.contains(node) ? node : null;
  };

  /* E002-01 — marquage des deux couches confinées ; la règle vive est ci-dessus. */
  if (planetLayer && planetLayer.dataset) planetLayer.dataset.v2e002Confined = '1';
  if (moonLayer && moonLayer.dataset) moonLayer.dataset.v2e002Confined = '1';

  /* E002-02 — marquage du traitement des arêtes, sans toucher au SVG d'origine. */
  if (edges && edges.dataset) edges.dataset.v2e002Edges = 'crisp';

  /* E002-03 — activation conditionnelle de la légende différée. */
  if (field.dataset) field.dataset.v2e002CaptionDelay = '1';

  /* E002-04 — lecture groupée des positions : on ne lit rien après avoir écrit. */
  const allNodes = suns.concat(planets, moons);
  const snapshot = allNodes.map(node => {
    const style = node.style;
    return {
      node: node,
      x: style && typeof style.getPropertyValue === 'function'
        ? style.getPropertyValue('--x') : '',
      y: style && typeof style.getPropertyValue === 'function'
        ? style.getPropertyValue('--y') : ''
    };
  });
  let mirrored = 0;
  snapshot.forEach(item => {
    if (!item.node.dataset || !item.x || !item.y) return;
    item.node.dataset.v2e002X = item.x;
    item.node.dataset.v2e002Y = item.y;
    mirrored += 1;
  });
  if (field.dataset) field.dataset.v2e002Batch = String(mirrored);

  /* E002-05 — budget de complexité du champ, compteur visible unique. */
  const budget = `${plural(suns.length, 'ère', 'ères')} · ${plural(planets.length, 'repère', 'repères')} · ${plural(moons.length, 'point', 'points')} · ${plural(lines.length, 'arête', 'arêtes')}`;
  if (field.dataset) field.dataset.v2e002Budget = budget;
  if (caption && typeof caption.querySelector === 'function'
      && typeof ctx.el === 'function' && !caption.querySelector('#v2e002-node-budget')) {
    const meter = ctx.el('p', 'v2e002-budget', `Budget du champ : ${budget}.`);
    meter.id = 'v2e002-node-budget';
    caption.appendChild(meter);
  }

  /* E002-06 — un seul couple d'écouteurs sur le champ pour planètes et lunes. */
  if (field.dataset && field.dataset.v2e002HoverBound !== '1') {
    field.dataset.v2e002HoverBound = '1';
    if (typeof field.addEventListener === 'function') {
      field.addEventListener('pointerover', event => {
        const node = closestOf(event.target, '.const-planet, .const-moon', field);
        if (node) node.setAttribute('data-v2e002-hover', '1');
      }, { passive: true });
      field.addEventListener('pointerout', event => {
        const node = closestOf(event.target, '.const-planet, .const-moon', field);
        if (node) node.removeAttribute('data-v2e002-hover');
      }, { passive: true });
    }
  }

  /* E002-07 — hiérarchie de détail des lunes : l'active et deux premières. */
  const activeMoon = moons.findIndex(isActive);
  moons.forEach((moon, index) => {
    moon.dataset.v2e002MoonDetail = (index === activeMoon || index < 2) ? '1' : '0';
  });

  /* E002-08 — encre sans flou sur la lune active, liseré à la place du halo. */
  moons.forEach(moon => { moon.dataset.v2e002Halo = 'flat'; });

  /* E002-09 — niveau de détail des arêtes lunaires au-delà de douze points. */
  if (field.dataset) {
    field.dataset.v2e002EdgeLod = moons.length > 12 ? 'light' : 'full';
    field.dataset.v2e002MoonTotal = String(moons.length);
  }

  /* E002-10 — compteur de passes et marqueur global d'idempotence. */
  let passes = 0;
  try {
    if (typeof window !== 'undefined') {
      passes = Number(window.__v2e002_passes) || 0;
      passes += 1;
      window.__v2e002_passes = passes;
    }
  } catch (error) { passes = 1; }
  layout.dataset.v2e002Passes = String(passes);
  layout.dataset.v2e002Applied = '1';
});
