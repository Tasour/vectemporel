import { register } from './registry.js';

/* Lentille E070 — Mouvement et transitions appliqués aux métriques chiffrées
 * de la vue Constellation. Dix chantiers, tous implémentés : les nombres déjà
 * produits par renderConstellation() (numéraux des soleils/planètes, taille des
 * nœuds, rayon planétaire, progression des points, confiance, sources, angle)
 * deviennent des grandeurs animables sans toucher au rendu de base.
 *
 * Le mouvement est exclusivement déclaratif (transitions et keyframes CSS),
 * piloté par des attributs data-e070-* déterministes : aucune boucle d'animation
 * propre, aucun minuteur, aucune horloge, aucun tirage aléatoire, aucun appel
 * réseau, aucun journal texte émis. Le module ne possède aucun setter du store ;
 * son état local (compteurs, tendance, empreinte) est borné.
 *
 * Contrat : register('E070', ctx => {...}) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() } (registry.js:28-44).
 */

/* État local du module : déterministe, conservé entre les rendus successifs. */
let renderCount = 0;
let clickCount = 0;
let clickHooked = false;
let lastTicked = null;
let lastCounts = null;
let lastFingerprint = null;
let lastFlash = '0';

const CSS = `
.constellation-layout .const-sun,
.constellation-layout .const-planet {
  font-variant-numeric: tabular-nums;
  transition: letter-spacing .18s ease, opacity .18s ease, transform .22s ease;
}
.constellation-layout .const-sun[data-e070-digits="2"],
.constellation-layout .const-planet[data-e070-digits="2"] { letter-spacing: .08em; }

.constellation-layout .constellation-field[data-e070-size-tier="compact"] .const-planet {
  transform: translate(-50%, -50%) scale(.88);
}
.constellation-layout .constellation-field[data-e070-size-tier="large"] .const-planet {
  transform: translate(-50%, -50%) scale(1.08);
}
.constellation-layout .constellation-field[data-e070-size-tier="medium"] .const-planet {
  transform: translate(-50%, -50%) scale(1);
}

.constellation-layout .const-layer-planets[data-e070-breathe="1"] .const-planet.is-active {
  animation: e070-breathe 2.2s ease-in-out infinite alternate;
}
@keyframes e070-breathe {
  from { transform: translate(-50%, -50%) scale(1); }
  to { transform: translate(-50%, -50%) scale(1.1); }
}

.constellation-layout #e070-progress {
  display: block; width: 132px; height: 3px;
  border: 1px solid var(--line); border-radius: 3px;
  background: rgba(255,255,255,.04); overflow: hidden;
}
.constellation-layout #e070-progress-fill {
  display: block; height: 100%;
  width: calc(var(--e070-ratio, 0) * 100%);
  background: linear-gradient(90deg, var(--gold), var(--violet));
  transition: width .32s ease;
}

.constellation-layout .e070-trend::after {
  content: '→'; display: inline-block;
  color: var(--gold-bright); font-size: 11px;
  transition: transform .24s ease;
}
.constellation-layout .e070-trend[data-e070-trend="up"]::after { transform: rotate(-45deg); }
.constellation-layout .e070-trend[data-e070-trend="down"]::after { transform: rotate(45deg); }

.constellation-layout .const-sun[data-e070-tick="1"],
.constellation-layout .const-planet[data-e070-tick="1"],
.constellation-layout .const-moon[data-e070-tick="1"] { animation: e070-tick .34s ease-out; }
@keyframes e070-tick {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  45% { transform: translate(-50%, -50%) scale(1.14); }
}

.constellation-layout .const-moon::before {
  content: ''; position: absolute; left: 50%; top: 50%;
  width: 22px; height: 22px; margin: -11px 0 0 -11px;
  border: 1px solid var(--violet); border-radius: 50%;
  opacity: calc(.12 + .6 * var(--e070-confidence, 0));
  transform: scale(calc(.5 + .5 * var(--e070-confidence, 0)));
  transition: transform .3s ease, opacity .3s ease;
  pointer-events: none;
}
.constellation-layout .const-moon[data-e070-confidence-tier="high"]::before { border-color: var(--gold-bright); }

.constellation-layout .const-moon > .e070-src-jauge {
  position: absolute; bottom: 2px; left: 50%; margin-left: -6px;
  width: calc(var(--e070-sources, 0) * 12px); height: 2px;
  background: var(--gold); opacity: .8; pointer-events: none;
  transition: width .3s ease, opacity .3s ease;
}

.constellation-layout #e070-angle {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--gold); font-size: 9px; font-variant-numeric: tabular-nums;
}
.constellation-layout #e070-angle-needle {
  display: inline-block; width: 1px; height: 12px;
  background: var(--gold-bright); transform-origin: 50% 100%;
  transform: rotate(var(--e070-angle, 137.5deg));
  transition: transform .5s ease;
}
.constellation-layout #e070-angle[data-e070-sweep="1"] #e070-angle-needle {
  animation: e070-sweep .7s ease-out;
}
@keyframes e070-sweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(var(--e070-angle, 137.5deg)); }
}

.constellation-layout #e070-readout {
  flex: 1 1 100%; margin: 2px 0 0;
  color: var(--muted-2); font-size: 9px; line-height: 1.45;
  font-variant-numeric: tabular-nums;
  transition: opacity .28s ease, transform .28s ease;
}
.constellation-layout #e070-readout[data-e070-flash="1"] {
  opacity: .45; transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .constellation-layout #e070-progress-fill,
  .constellation-layout .e070-trend::after,
  .constellation-layout .const-sun,
  .constellation-layout .const-planet,
  .constellation-layout .const-moon::before,
  .constellation-layout .const-moon > .e070-src-jauge,
  .constellation-layout #e070-angle-needle,
  .constellation-layout #e070-readout { transition: none !important; }
  .constellation-layout .const-layer-planets[data-e070-breathe="1"] .const-planet.is-active,
  .constellation-layout .const-sun[data-e070-tick="1"],
  .constellation-layout .const-planet[data-e070-tick="1"],
  .constellation-layout .const-moon[data-e070-tick="1"],
  .constellation-layout #e070-angle[data-e070-sweep="1"] #e070-angle-needle { animation: none !important; }
}`;

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

/* Empreinte FNV-1a 32 bits : témoin de version, sans horloge ni aléa. */
function fingerprint(source) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* Lecture unique des métriques chiffrées avant toute écriture de la lentille. */
function readMetrics(layout) {
  const suns = Array.from(layout.querySelectorAll('.const-sun'));
  const planets = Array.from(layout.querySelectorAll('.const-planet'));
  const moons = Array.from(layout.querySelectorAll('.const-moon'));
  const field = layout.querySelector('.constellation-field');
  const planetLayer = layout.querySelector('.const-layer-planets');
  const note = layout.querySelector('.constellation-note');
  const size = num(field ? field.style.getPropertyValue('--const-node-size') : '', 28);
  const digits = suns.concat(planets).reduce((sum, node) =>
    sum + String(node.textContent || '').replace(/\D/g, '').length, 0);

  const moonData = moons.map((moon) => {
    const title = moon.getAttribute('title') || '';
    const label = moon.dataset.label || '';
    let confidence = num((title.match(/confiance\s+([0-9]+(?:[.,][0-9]+)?)/i) || [])[1], 0);
    if (confidence > 1 && confidence <= 100) confidence /= 100;
    confidence = clamp(confidence, 0, 1);
    const match = label.match(/(\d+)\s*src/i) || title.match(/(\d+)\s+source/i);
    const sources = match ? clamp(num(match[1], 0), 0, 99) : 0;
    return { node: moon, confidence, sources };
  });

  const activeMoon = moons.findIndex((moon) =>
    moon.classList.contains('is-active') || moon.getAttribute('aria-current') === 'true');
  const ratio = moons.length ? clamp((activeMoon < 0 ? 0 : activeMoon + 1) / moons.length, 0, 1) : 0;
  const angleMatch = note ? String(note.textContent || '').match(/(\d+)[ ,](\d+)\s*°/) : null;
  const angle = angleMatch ? num(`${angleMatch[1]}.${angleMatch[2]}`, 137.5) : 137.5;

  return {
    suns, planets, moons, moonData, field, planetLayer, size, digits, ratio, angle,
    radius: clamp(14 + planets.length * 1.8, 18, 34),
    confidenceMax: moonData.reduce((max, item) => Math.max(max, item.confidence), 0),
    sourcesTotal: moonData.reduce((sum, item) => sum + item.sources, 0),
    counts: { sun: suns.length, planet: planets.length, moon: moons.length },
  };
}

/* Un seul écouteur de capture, installé une fois pour toute la session. */
function onMetricClick(event) {
  if (!event || !event.target || typeof event.target.closest !== 'function') return;
  const node = event.target.closest('.const-sun, .const-planet, .const-moon');
  if (!node) return;
  clickCount += 1;
  if (lastTicked && lastTicked !== node && typeof lastTicked.removeAttribute === 'function') {
    lastTicked.removeAttribute('data-e070-tick');
  }
  node.setAttribute('data-e070-tick', '1');
  lastTicked = node;
}

register('E070', (ctx) => {
  /* Garde d'entrée : aucun ajout DOM tant que ctx.layout n'est pas exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  const m = readMetrics(layout);
  renderCount += 1;

  /* E070-01 — Numéraux tabulaires : largeur des chiffres pilotée par attribut. */
  safe(() => {
    m.suns.concat(m.planets).forEach((node) => {
      const raw = String(node.textContent || '').replace(/\D/g, '');
      node.dataset.e070Num = String(num(raw, 0));
      node.dataset.e070Digits = String(raw.length || 1);
    });
    layout.dataset.e070Digits = String(m.digits);
  });

  /* E070-02 — Paliers de taille : la métrique --const-node-size devient un gradient d'échelle. */
  const sizeTier = m.size <= 18 ? 'compact' : m.size <= 22 ? 'medium' : 'large';
  safe(() => {
    if (m.field) {
      m.field.dataset.e070SizeTier = sizeTier;
      m.field.dataset.e070NodeSize = String(m.size);
    }
    layout.dataset.e070SizeTier = sizeTier;
  });

  /* E070-03 — Respiration du rayon : le rayon calculé commande une pulsation de la planète active. */
  const radius = Math.round(m.radius * 10) / 10;
  const radiusTier = m.radius < 24 ? 'near' : m.radius < 30 ? 'mid' : 'far';
  safe(() => {
    if (m.planetLayer) {
      m.planetLayer.dataset.e070Radius = String(radius);
      m.planetLayer.dataset.e070RadiusTier = radiusTier;
      const active = m.planets.some((planet) => planet.classList.contains('is-active'));
      const breathe = Boolean(active) && ctx.reducedMotion() !== true;
      m.planetLayer.dataset.e070Breathe = breathe ? '1' : '0';
    }
    layout.dataset.e070Radius = String(radius);
  });

  /* E070-04 — Progression des points : une barre dont la largeur transitionne selon le ratio. */
  safe(() => {
    const caption = layout.querySelector('.constellation-caption') || layout;
    let bar = caption.querySelector('#e070-progress');
    if (!bar) {
      bar = ctx.el('div', 'e070-progress');
      bar.id = 'e070-progress';
      bar.setAttribute('aria-hidden', 'true');
      const fill = ctx.el('span', 'e070-progress-fill');
      fill.id = 'e070-progress-fill';
      bar.appendChild(fill);
      caption.appendChild(bar);
    }
    const fill = bar.querySelector('#e070-progress-fill');
    if (fill) fill.style.setProperty('--e070-ratio', m.ratio.toFixed(3));
    bar.dataset.e070Ratio = m.ratio.toFixed(3);
    layout.dataset.e070Ratio = m.ratio.toFixed(3);
  });

  /* E070-05 — Tendance : le delta du total de nœuds fait pivoter une flèche. */
  const totalNow = m.counts.sun + m.counts.planet + m.counts.moon;
  const totalBefore = lastCounts
    ? lastCounts.sun + lastCounts.planet + lastCounts.moon : totalNow;
  const delta = Math.sign(totalNow - totalBefore);
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady';
  lastCounts = { ...m.counts };
  safe(() => {
    const caption = layout.querySelector('.constellation-caption') || layout;
    let arrow = caption.querySelector('#e070-trend');
    if (!arrow) {
      arrow = ctx.el('span', 'e070-trend');
      arrow.id = 'e070-trend';
      arrow.setAttribute('aria-hidden', 'true');
      caption.appendChild(arrow);
    }
    arrow.dataset.e070Trend = trend;
    layout.dataset.e070Trend = trend;
    layout.dataset.e070Delta = String(delta);
  });

  /* E070-06 — Tick de clic : chaque changement de métrique déclenche une impulsion. */
  safe(() => {
    if (typeof document !== 'undefined' && !clickHooked) {
      clickHooked = true;
      document.addEventListener('click', onMetricClick, true);
    }
    layout.dataset.e070Clicks = String(clickCount);
  });

  /* E070-07 — Confiance : la valeur numérique pilote un halo de taille variable. */
  safe(() => {
    m.moonData.forEach((item) => {
      const moon = item.node;
      moon.dataset.e070Confidence = item.confidence.toFixed(2);
      moon.dataset.e070ConfidenceTier =
        item.confidence >= 0.8 ? 'high' : item.confidence >= 0.5 ? 'mid' : 'low';
      moon.style.setProperty('--e070-confidence', item.confidence.toFixed(3));
    });
    layout.dataset.e070ConfidenceMax = m.confidenceMax.toFixed(2);
  });

  /* E070-08 — Sources : le décompte se prolonge par une jauge animée sous la lune. */
  safe(() => {
    m.moonData.forEach((item, index) => {
      const moon = item.node;
      moon.dataset.e070Sources = String(item.sources);
      moon.style.setProperty('--e070-sources', (Math.min(item.sources, 5) / 5).toFixed(3));
      let gauge = moon.querySelector('.e070-src-jauge');
      if (!gauge) {
        gauge = ctx.el('span', 'e070-src-jauge');
        gauge.setAttribute('aria-hidden', 'true');
        moon.appendChild(gauge);
      }
      gauge.dataset.e070Index = String(index);
    });
    layout.dataset.e070Sources = String(m.sourcesTotal);
  });

  /* E070-09 — Angle : l'aiguille tourne vers la valeur 137,5° extraite de la note. */
  safe(() => {
    const caption = layout.querySelector('.constellation-caption') || layout;
    let badge = caption.querySelector('#e070-angle');
    if (!badge) {
      badge = ctx.el('span', 'e070-angle');
      badge.id = 'e070-angle';
      const needle = ctx.el('span', 'e070-angle-needle');
      needle.id = 'e070-angle-needle';
      const value = ctx.el('span', 'e070-angle-value');
      badge.appendChild(needle);
      badge.appendChild(value);
      caption.appendChild(badge);
    }
    badge.dataset.e070Sweep = ctx.reducedMotion() === true ? '0' : '1';
    badge.style.setProperty('--e070-angle', `${m.angle.toFixed(1)}deg`);
    const value = badge.querySelector('.e070-angle-value');
    if (value) value.textContent = `${fr(m.angle.toFixed(1))}°`;
    layout.dataset.e070Angle = m.angle.toFixed(1);
  });

  /* E070-10 — Relevé live : feuille unique, empreinte de version et transition d'annonce. */
  safe(() => ctx.css('constellation-e070', CSS));
  safe(() => {
    const caption = layout.querySelector('.constellation-caption') || layout;
    let readout = caption.querySelector('#e070-readout');
    if (!readout) {
      readout = ctx.el('p', 'e070-readout');
      readout.id = 'e070-readout';
      readout.setAttribute('role', 'status');
      readout.setAttribute('aria-live', 'polite');
      readout.setAttribute('aria-atomic', 'true');
      caption.appendChild(readout);
    }
    const source = [
      m.counts.sun, m.counts.planet, m.counts.moon, m.size, radius,
      m.ratio.toFixed(3), m.digits, m.confidenceMax.toFixed(2), m.sourcesTotal,
      m.angle.toFixed(1), clickCount, trend, sizeTier,
    ].join('|');
    const stamp = fingerprint(source);
    const stable = lastFingerprint === null || lastFingerprint === stamp;
    lastFingerprint = stamp;
    lastFlash = lastFlash === '1' ? '0' : '1';
    readout.dataset.e070Flash = lastFlash;
    layout.dataset.e070Fingerprint = stamp;
    layout.dataset.e070Renders = String(renderCount);
    layout.dataset.e070Stable = stable ? '1' : '0';
    const progression = m.counts.moon
      ? `${Math.round(m.ratio * m.counts.moon)}/${m.counts.moon}` : '0/0';
    readout.textContent = `E070 · ères ${m.counts.sun} · repères ${m.counts.planet} · points ${m.counts.moon} · nœuds ${m.size} px · rayon ${fr(radius)} · progression ${progression} · chiffres ${m.digits} · confiance max ${fr(m.confidenceMax.toFixed(2))} · sources ${m.sourcesTotal} · angle ${fr(m.angle.toFixed(1))}° · clics ${clickCount} · tendance ${trend} · palier ${sizeTier} · version ${stamp} · stable ${stable ? 'oui' : 'non'} · rendus ${renderCount}.`;
  });
});
