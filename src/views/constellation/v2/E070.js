import { register } from './registry.js';

/* Lentille V2 E070 — Mouvement et transitions appliqués aux métriques chiffrées
   de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau ni source aléatoire, sans minuteur ni boucle
   d'animation propre. Le mouvement reste purement déclaratif (transitions CSS)
   piloté par des attributs data-v2e070-* déterministes. */

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune écriture dans la console */ }
}

function num(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function fr(value) { return String(value).replace('.', ','); }

function isActive(node) {
  return Boolean(node && node.classList && node.classList.contains('is-active'))
    || node.getAttribute('aria-current') === 'true';
}

/* Lecture unique des métriques, avant toute écriture de la lentille. */
function readV2(layout) {
  const suns = Array.from(layout.querySelectorAll('.const-sun'));
  const planets = Array.from(layout.querySelectorAll('.const-planet'));
  const moons = Array.from(layout.querySelectorAll('.const-moon'));
  const field = layout.querySelector('.constellation-field');
  const edges = layout.querySelector('svg.constellation-edges');
  const edgeLines = edges ? Array.from(edges.querySelectorAll('line')) : [];
  const caption = layout.querySelector('.constellation-caption') || layout;

  const yearSource = suns.concat(planets).map((node) => node.dataset.label || '').join(' ');
  const years = (yearSource.match(/\d{4}/g) || []).map(Number);
  const yearSpan = years.length > 1 ? Math.max(...years) - Math.min(...years) : 0;

  const activeSun = Math.max(0, suns.findIndex(isActive));
  const activePlanet = planets.findIndex(isActive);

  let azimuth = 0;
  if (activePlanet >= 0) {
    const planet = planets[activePlanet];
    const x = num(planet.style.getPropertyValue('--x'), 50);
    const y = num(planet.style.getPropertyValue('--y'), 50);
    const deg = Math.atan2(y - 50, x - 50) * 180 / Math.PI;
    azimuth = Math.round(((deg + 360) % 360) * 10) / 10;
  }

  const moonData = moons.map((moon) => {
    const title = moon.getAttribute('title') || '';
    const found = num((title.match(/confiance\s+([0-9]+(?:[.,][0-9]+)?)/i) || [])[1], 0);
    const confidence = clamp(found > 1 && found <= 100 ? found / 100 : found, 0, 1);
    const sourceMatch = (moon.dataset.label || '').match(/(\d+)\s*src/i)
      || title.match(/(\d+)\s+source/i);
    const sources = sourceMatch ? clamp(num(sourceMatch[1], 0), 0, 99) : 0;
    return { node: moon, confidence, sources };
  });

  return {
    suns, planets, moons, moonData, field, edges, edgeLines, caption,
    yearSpan, activeSun, azimuth,
    eraRatio: suns.length ? (activeSun + 1) / suns.length : 0,
    yearRatio: clamp(yearSpan / 200, 0, 1),
    confidenceMax: moonData.reduce((max, item) => Math.max(max, item.confidence), 0),
    sourcesTotal: moonData.reduce((sum, item) => sum + item.sources, 0),
  };
}

/* Fabrique un nœud décoratif masqué aux technologies d'assistance. */
function decor(ctx, tag, className, id) {
  const node = typeof ctx.el === 'function' ? ctx.el(tag, className) : document.createElement(tag);
  if (className && !node.className) node.className = className;
  if (id) node.id = id;
  node.setAttribute('aria-hidden', 'true');
  return node;
}

/* Retourne un hôte décoratif unique, créé au premier rendu seulement. */
function host(ctx, caption, id, className) {
  let node = caption.querySelector('#' + id);
  if (!node) {
    node = decor(ctx, 'span', className, id);
    caption.appendChild(node);
  }
  return node;
}

const CSS = `
.v2e070-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout #v2e070-density{display:flex;align-items:center;gap:2px;margin:2px 0}
.constellation-layout .v2e070-seg{display:block;width:4px;height:9px;border:1px solid var(--line);border-radius:1px;background:rgba(255,255,255,.05);opacity:.3;transform:scaleY(.5);transition:opacity .3s ease,transform .3s ease,background .3s ease}
.constellation-layout .v2e070-seg[data-v2e070-lit="1"]{opacity:1;transform:scaleY(1);background:var(--gold)}
.constellation-layout #v2e070-rings{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:0}
.constellation-layout .v2e070-ring{position:absolute;left:0;top:0;border:1px solid var(--violet);border-radius:50%;opacity:.18;transform:translate(-50%,-50%) scale(var(--v2e070-ring-scale,1));transition:transform .45s ease,opacity .45s ease}
.constellation-layout .v2e070-ring:nth-child(1){width:56px;height:56px;margin:-28px 0 0 -28px}
.constellation-layout .v2e070-ring:nth-child(2){width:88px;height:88px;margin:-44px 0 0 -44px}
.constellation-layout .v2e070-ring:nth-child(3){width:120px;height:120px;margin:-60px 0 0 -60px}
.constellation-layout .constellation-edges line{stroke-dasharray:6 4;stroke-dashoffset:var(--v2e070-edge-offset,0);transition:stroke-dashoffset .55s ease}
.constellation-layout #v2e070-eraprog,.constellation-layout #v2e070-cadence,.constellation-layout #v2e070-years,.constellation-layout #v2e070-azimuth{display:flex;align-items:center;gap:5px;margin:2px 0;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
.constellation-layout .v2e070-cap{color:var(--muted-2);font-size:8px}
.constellation-layout .v2e070-meter{display:block;width:104px;height:4px;border:1px solid var(--line);border-radius:3px;background:rgba(255,255,255,.04);overflow:hidden}
.constellation-layout .v2e070-meter>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--violet),var(--gold));transition:width .35s ease}
.constellation-layout #v2e070-eraprog-fill{width:calc(var(--v2e070-era-ratio,0)*100%)}
.constellation-layout #v2e070-cadence-fill{width:calc(var(--v2e070-cadence,0)*100%)}
.constellation-layout #v2e070-years-fill{width:calc(var(--v2e070-year-ratio,0)*100%)}
.constellation-layout #v2e070-azimuth-needle{display:inline-block;width:1px;height:10px;background:var(--gold-bright);transform-origin:50% 100%;transform:rotate(var(--v2e070-azimuth,0deg));transition:transform .4s ease}
.constellation-layout .v2e070-conf{position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);display:flex;gap:1px;pointer-events:none}
.constellation-layout .v2e070-conf i{display:block;width:3px;height:3px;border-radius:1px;background:var(--violet);opacity:.25;transform:scale(.7);transition:opacity .3s ease,transform .3s ease}
.constellation-layout .v2e070-conf i[data-v2e070-on="1"]{opacity:1;transform:scale(1);background:var(--gold-bright)}
.constellation-layout .v2e070-pips{position:absolute;left:50%;top:-7px;transform:translateX(-50%);display:flex;gap:1px;pointer-events:none}
.constellation-layout .v2e070-pips i{display:block;width:3px;height:3px;border:1px solid var(--gold);border-radius:50%;opacity:.25;transition:opacity .3s ease,transform .3s ease}
.constellation-layout .v2e070-pips i[data-v2e070-on="1"]{opacity:1;background:var(--gold);transform:scale(1.2)}
.constellation-layout #v2e070-readout{color:var(--muted-2);font-size:9px;line-height:1.45;transition:opacity .28s ease,transform .28s ease}
.constellation-layout #v2e070-readout[data-v2e070-flash="1"]{opacity:.5;transform:translateY(-2px)}
@media (prefers-reduced-motion: reduce){.constellation-layout [class^="v2e070-"],.constellation-layout [id^="v2e070-"],.constellation-layout .constellation-edges line{transition:none!important;animation:none!important}}
.constellation-layout.v2e070-calm [class^="v2e070-"],.constellation-layout.v2e070-calm [id^="v2e070-"],.constellation-layout.v2e070-calm .constellation-edges line{transition:none!important;animation:none!important}`;

/* Compteurs déterministes, bornés, conservés entre les rendus successifs. */
let renderCount = 0;
let lastFlash = '0';

register('E070', ctx => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof document === 'undefined') return;
  const layout = ctx.layout;
  const m = readV2(layout);
  renderCount += 1;

  /* Feuille unique de la lentille, installée une seule fois par cssOnce. */
  safe(() => ctx.css('constellation-v2-e070', CSS));
  safe(() => layout.classList.toggle('v2e070-calm',
    typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() === true));

  /* E070-01 — Densité segmentée : le nombre de repères allume des segments. */
  safe(() => {
    const bar = host(ctx, m.caption, 'v2e070-density', 'v2e070-density');
    while (bar.children.length < 20) bar.appendChild(decor(ctx, 'i', 'v2e070-seg'));
    const lit = clamp(m.planets.length, 0, 20);
    Array.from(bar.children).forEach((seg, index) => {
      seg.dataset.v2e070Lit = index < lit ? '1' : '0';
    });
    bar.dataset.v2e070Density = String(m.planets.length);
    layout.dataset.v2e070Density = String(lit);
  });

  /* E070-02 — Anneaux de distance : le rayon pilote l'échelle de trois cercles. */
  safe(() => {
    if (!m.field) return;
    let rings = m.field.querySelector('#v2e070-rings');
    if (!rings) {
      rings = decor(ctx, 'span', 'v2e070-rings', 'v2e070-rings');
      m.field.appendChild(rings);
    }
    while (rings.children.length < 3) rings.appendChild(decor(ctx, 'i', 'v2e070-ring'));
    const radius = clamp(14 + m.planets.length * 1.8, 18, 34);
    rings.style.setProperty('--v2e070-ring-scale', (radius / 28).toFixed(3));
    rings.dataset.v2e070Radius = radius.toFixed(1);
    layout.dataset.v2e070RingScale = (radius / 28).toFixed(3);
  });

  /* E070-03 — Tracé des arêtes : le décompte des traits décale les tirets. */
  safe(() => {
    if (!m.edges) return;
    const count = m.edgeLines.length;
    m.edges.style.setProperty('--v2e070-edge-offset', String(count * 3));
    m.edges.dataset.v2e070Edges = String(count);
    layout.dataset.v2e070Edges = String(count);
  });

  /* E070-04 — Progression d'ère : l'ère active remplit une jauge dédiée. */
  safe(() => {
    const badge = host(ctx, m.caption, 'v2e070-eraprog', 'v2e070-eraprog');
    const label = decor(ctx, 'span', 'v2e070-cap');
    label.textContent = 'Ère';
    const meter = decor(ctx, 'span', 'v2e070-meter');
    let fill = meter.querySelector('#v2e070-eraprog-fill');
    if (!fill) {
      fill = decor(ctx, 'i', 'v2e070-fill', 'v2e070-eraprog-fill');
      meter.appendChild(fill);
    }
    if (!badge.querySelector('.v2e070-cap')) badge.appendChild(label);
    if (!badge.querySelector('.v2e070-meter')) badge.appendChild(meter);
    badge.style.setProperty('--v2e070-era-ratio', m.eraRatio.toFixed(3));
    badge.dataset.v2e070Era = `${m.activeSun + 1}/${m.suns.length}`;
    layout.dataset.v2e070EraRatio = m.eraRatio.toFixed(3);
  });

  /* E070-05 — Boussole d'azimuth : la position du repère actif oriente l'aiguille. */
  safe(() => {
    const badge = host(ctx, m.caption, 'v2e070-azimuth', 'v2e070-azimuth');
    const label = decor(ctx, 'span', 'v2e070-cap');
    label.textContent = 'Cap';
    let needle = badge.querySelector('#v2e070-azimuth-needle');
    if (!needle) {
      needle = decor(ctx, 'i', 'v2e070-needle', 'v2e070-azimuth-needle');
      badge.appendChild(needle);
    }
    if (!badge.querySelector('.v2e070-cap')) badge.insertBefore(label, badge.firstChild);
    badge.style.setProperty('--v2e070-azimuth', `${m.azimuth.toFixed(1)}deg`);
    badge.dataset.v2e070Azimuth = m.azimuth.toFixed(1);
    layout.dataset.v2e070Azimuth = m.azimuth.toFixed(1);
  });

  /* E070-06 — Micro-barres de confiance : cinq traits s'allument par lune. */
  safe(() => {
    m.moonData.forEach((item) => {
      const moon = item.node;
      let bars = moon.querySelector('.v2e070-conf');
      if (!bars) {
        bars = decor(ctx, 'span', 'v2e070-conf');
        for (let i = 0; i < 5; i += 1) bars.appendChild(decor(ctx, 'i'));
        moon.appendChild(bars);
      }
      const level = Math.round(item.confidence * 5);
      Array.from(bars.children).forEach((bar, index) => {
        bar.dataset.v2e070On = index < level ? '1' : '0';
      });
      moon.dataset.v2e070ConfLevel = String(level);
    });
    layout.dataset.v2e070ConfMax = m.confidenceMax.toFixed(2);
  });

  /* E070-07 — Pastilles de sources : un point par source locale, jusqu'à cinq. */
  safe(() => {
    m.moonData.forEach((item) => {
      const moon = item.node;
      let pips = moon.querySelector('.v2e070-pips');
      if (!pips) {
        pips = decor(ctx, 'span', 'v2e070-pips');
        for (let i = 0; i < 5; i += 1) pips.appendChild(decor(ctx, 'i'));
        moon.appendChild(pips);
      }
      const level = Math.min(item.sources, 5);
      Array.from(pips.children).forEach((pip, index) => {
        pip.dataset.v2e070On = index < level ? '1' : '0';
      });
      moon.dataset.v2e070Pips = String(level);
    });
    layout.dataset.v2e070Sources = String(m.sourcesTotal);
  });

  /* E070-08 — Cadence de rendu : une jauge bornée boucle sur dix positions. */
  safe(() => {
    const badge = host(ctx, m.caption, 'v2e070-cadence', 'v2e070-cadence');
    const label = decor(ctx, 'span', 'v2e070-cap');
    label.textContent = 'Rendus';
    const meter = decor(ctx, 'span', 'v2e070-meter');
    let fill = meter.querySelector('#v2e070-cadence-fill');
    if (!fill) {
      fill = decor(ctx, 'i', 'v2e070-fill', 'v2e070-cadence-fill');
      meter.appendChild(fill);
    }
    if (!badge.querySelector('.v2e070-cap')) badge.appendChild(label);
    if (!badge.querySelector('.v2e070-meter')) badge.appendChild(meter);
    const step = ((renderCount - 1) % 10 + 1) / 10;
    badge.style.setProperty('--v2e070-cadence', step.toFixed(3));
    badge.dataset.v2e070Cadence = String(renderCount);
    layout.dataset.v2e070Cadence = String(renderCount);
  });

  /* E070-09 — Amplitude temporelle : l'écart des années étire une jauge. */
  safe(() => {
    const badge = host(ctx, m.caption, 'v2e070-years', 'v2e070-years');
    const label = decor(ctx, 'span', 'v2e070-cap');
    label.textContent = 'Écart';
    const meter = decor(ctx, 'span', 'v2e070-meter');
    let fill = meter.querySelector('#v2e070-years-fill');
    if (!fill) {
      fill = decor(ctx, 'i', 'v2e070-fill', 'v2e070-years-fill');
      meter.appendChild(fill);
    }
    if (!badge.querySelector('.v2e070-cap')) badge.appendChild(label);
    if (!badge.querySelector('.v2e070-meter')) badge.appendChild(meter);
    badge.style.setProperty('--v2e070-year-ratio', m.yearRatio.toFixed(3));
    badge.dataset.v2e070YearSpan = String(m.yearSpan);
    layout.dataset.v2e070YearSpan = String(m.yearSpan);
  });

  /* E070-10 — Bandeau live v2 : synthèse des nouvelles métriques, sans empreinte. */
  safe(() => {
    const caption = m.caption;
    let readout = caption.querySelector('#v2e070-readout');
    if (!readout) {
      readout = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e070-sr')
        : document.createElement('p');
      readout.id = 'v2e070-readout';
      readout.setAttribute('role', 'status');
      readout.setAttribute('aria-live', 'polite');
      readout.setAttribute('aria-atomic', 'true');
      caption.appendChild(readout);
    }
    lastFlash = lastFlash === '1' ? '0' : '1';
    readout.dataset.v2e070Flash = lastFlash;
    const progression = `${m.activeSun + 1}/${m.suns.length}`;
    readout.textContent = `E070 V2 · repères ${m.planets.length} · ère ${progression} · `
      + `azimuth ${fr(m.azimuth.toFixed(1))}° · écart ${m.yearSpan} ans · `
      + `traits ${m.edgeLines.length} · confiance max ${fr(m.confidenceMax.toFixed(2))} · `
      + `sources ${m.sourcesTotal} · rendus ${renderCount}.`;
    layout.dataset.v2e070Flash = lastFlash;
  });
});
