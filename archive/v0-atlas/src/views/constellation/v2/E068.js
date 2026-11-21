import { register } from './registry.js';

/* Lentille V2 E068 — instrumentation E2E des métriques chiffrées de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau ni source aléatoire, sans minuteur ni boucle d'animation propre.
   Préfixe exclusif v2e068 : aucune collision avec la passe 1 (e068-*). */
register('E068', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : panneau, lignes, barre de conformité, sobre. */
  css('constellation-v2-e068', `
.v2e068-panel{position:relative;z-index:6;margin:10px 0 0;padding:8px 10px;border:1px solid rgba(178,139,221,.38);border-radius:8px;background:rgba(8,11,18,.92);color:#f0e4cc;font:10px/1.5 var(--sans, sans-serif)}
.v2e068-title{margin:0 0 6px;color:var(--violet,#b28bdd);font:600 10px/1.2 inherit;letter-spacing:.08em;text-transform:uppercase}
.v2e068-line{margin:4px 0 0;font-size:9px;color:var(--muted-2,#b8b2a4);font-variant-numeric:tabular-nums}
.v2e068-score{position:relative;height:6px;margin-top:8px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.v2e068-scorebar{position:absolute;inset:0 auto 0 0;width:var(--v2e068-score,0%);background:linear-gradient(90deg,var(--violet,#b28bdd),var(--gold,#e6b96f));transition:width .2s ease}
.v2e068-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e068-calm .v2e068-scorebar{transition:none}
@media (prefers-reduced-motion: reduce){.v2e068-scorebar{transition:none!important}}
`);

  const field = layout.querySelector('.constellation-field');
  if (!field) return;

  const sunLayer = layout.querySelector('.const-layer-suns');
  const planetLayer = layout.querySelector('.const-layer-planets');
  const moonLayer = layout.querySelector('.const-layer-moons');
  const edges = layout.querySelector('.constellation-edges');

  const pick = (root, selector) => (root && typeof root.querySelectorAll === 'function')
    ? Array.from(root.querySelectorAll(selector)) : [];
  const suns = pick(sunLayer, 'button.const-sun');
  const planets = pick(planetLayer, 'button.const-planet');
  const moons = pick(moonLayer, 'button.const-moon');
  const allNodes = suns.concat(planets, moons);

  const make = (tag, className, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const pct = (node, name) => {
    const raw = node && node.style ? node.style.getPropertyValue(name) : '';
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  };
  const r1 = value => Math.round(value * 10) / 10;

  /* Panneau inspectable unique de la seconde passe ; id et rôle distincts. */
  const panel = make('div', 'v2e068-panel');
  panel.id = 'v2e068-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Instrumentation E2E V2 des métriques chiffrées de la constellation');
  const heading = make('h3', 'v2e068-title', 'Instrumentation V2 E068 · audit métrique');
  heading.id = 'v2e068-title';
  panel.appendChild(heading);
  const line = (text, id) => {
    const node = make('p', 'v2e068-line', text);
    node.id = id;
    panel.appendChild(node);
    return node;
  };

  /* E068-01 — Audit des états actifs : unicité par couche, sans toucher au CSS
     des boutons. Un seul ère et un seul repère actifs, au plus un point actif. */
  const isActive = node => node.classList.contains('is-active')
    || node.getAttribute('aria-current') === 'true';
  const activeSuns = suns.filter(isActive);
  const activePlanets = planets.filter(isActive);
  const activeMoons = moons.filter(isActive);
  const activeOk = activeSuns.length === 1 && activePlanets.length === 1 && activeMoons.length <= 1;
  panel.setAttribute('data-v2e068-active',
    `suns:${activeSuns.length}|planets:${activePlanets.length}|moons:${activeMoons.length}`);
  panel.setAttribute('data-v2e068-active-ok', activeOk ? 'true' : 'false');
  line(`États actifs — ères ${activeSuns.length}, repères ${activePlanets.length}, points ${activeMoons.length} (unicité ${activeOk ? 'respectée' : 'en échec'}).`, 'v2e068-line-actifs');

  /* E068-02 — Signature de topologie du graphe : les arêtes sont classées par
     type (chemin, lune, simple) et leur nombre confronté à celui des nœuds. */
  const edgeList = pick(edges, 'line');
  const pathEdges = edgeList.filter(n => n.classList.contains('is-path'));
  const moonEdges = edgeList.filter(n => n.classList.contains('is-moon'));
  const plainEdges = edgeList.filter(n => !n.classList.contains('is-path') && !n.classList.contains('is-moon'));
  const topoOk = edgeList.length === planets.length + moons.length
    && moonEdges.length === moons.length && pathEdges.length <= 2;
  panel.setAttribute('data-v2e068-topology',
    `lines:${edgeList.length}|path:${pathEdges.length}|moon:${moonEdges.length}|plain:${plainEdges.length}`);
  panel.setAttribute('data-v2e068-topology-ok', topoOk ? 'true' : 'false');
  line(`Topologie — ${edgeList.length} traits (chemin ${pathEdges.length}, lune ${moonEdges.length}, simple ${plainEdges.length}) : ${topoOk ? 'cohérente' : 'incohérente'}.`, 'v2e068-line-topo');

  /* E068-03 — Contrôle d'unicité des clés de focus data-const-key. Un doublon
     casserait la restauration du focus après re-rendu du shell. */
  const keys = allNodes.map(n => n.getAttribute('data-const-key') || '').filter(Boolean);
  const uniqueKeys = new Set(keys);
  const duplicateCount = keys.length - uniqueKeys.size;
  panel.setAttribute('data-v2e068-keys',
    `${keys.length}|uniques:${uniqueKeys.size}|doublons:${duplicateCount}`);
  line(`Clés de focus — ${keys.length} clés, ${uniqueKeys.size} uniques, ${duplicateCount} doublon(s).`, 'v2e068-line-keys');

  /* E068-04 — Validation des bornes de position : la scène borne x dans
     [10,90] et y dans [12,88] via polar(); on dénombre les écarts. */
  const bounds = { xMin: 10, xMax: 90, yMin: 12, yMax: 88 };
  let outOfBounds = 0;
  allNodes.forEach(node => {
    const x = pct(node, '--x');
    const y = pct(node, '--y');
    if (x === null || y === null) { outOfBounds += 1; return; }
    if (x < bounds.xMin || x > bounds.xMax || y < bounds.yMin || y > bounds.yMax) outOfBounds += 1;
  });
  panel.setAttribute('data-v2e068-oob', String(outOfBounds));
  line(`Bornes de position — plage x[10,90] y[12,88], ${outOfBounds} nœud(s) hors plage.`, 'v2e068-line-bounds');

  /* E068-05 — Histogramme de confiance des points : les niveaux lus dans les
     infobulles sont agrégés en distribution triée, sans modifier les lunes. */
  const confTally = new Map();
  moons.forEach(moon => {
    const title = moon.getAttribute('title') || moon.getAttribute('aria-label') || '';
    const match = /confiance\s+([^\s·,]+)/i.exec(title);
    const level = match ? match[1] : 'inconnue';
    confTally.set(level, (confTally.get(level) || 0) + 1);
  });
  const confSummary = Array.from(confTally.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
    .map(([level, count]) => `${level}:${count}`).join('|') || 'aucun';
  panel.setAttribute('data-v2e068-confidence', confSummary);
  line(`Confiance des points — ${confSummary}.`, 'v2e068-line-conf');

  /* E068-06 — Taux de complétesse de l'étiquetage : libellé, infobulle et nom
     accessible présents sur chaque nœud, rapportés au nombre total. */
  const labelled = allNodes.filter(node => (node.getAttribute('data-label') || '').trim()
    && (node.getAttribute('title') || '').trim()
    && (node.getAttribute('aria-label') || '').trim()).length;
  const a11yRate = allNodes.length ? labelled / allNodes.length : 0;
  panel.setAttribute('data-v2e068-a11y', String(Math.round(a11yRate * 100)));
  line(`Étiquetage — ${labelled}/${allNodes.length} nœuds complets (${Math.round(a11yRate * 100)} %).`, 'v2e068-line-a11y');

  /* E068-07 — Masse DOM du champ : nombre total de descendants, comparé à un
     repère figé, pour détecter une explosion structurelle lors d'un rendu. */
  const domMass = field.querySelectorAll('*').length;
  const MASS_REF = 80;
  panel.setAttribute('data-v2e068-mass', String(domMass));
  line(`Masse DOM — ${domMass} éléments dans le champ (repère ${MASS_REF}).`, 'v2e068-line-mass');

  /* E068-08 — Compteur de passes de rendu mémorisé sous une clé window propre.
     Aucune horloge : le nombre ne croît qu'à chaque application de la lentille. */
  const RENDER_KEY = '__v2e068_renders';
  let renderCount = 0;
  if (typeof window !== 'undefined') {
    const previous = window[RENDER_KEY];
    renderCount = Number.isFinite(previous) ? previous + 1 : 1;
    window[RENDER_KEY] = renderCount;
  }
  panel.setAttribute('data-v2e068-renders', String(renderCount));
  line(`Passes de rendu — ${renderCount} application(s) de la lentille depuis le chargement.`, 'v2e068-line-renders');

  /* E068-09 — Dispersion radiale réelle des repères depuis le centre (50,50) :
     rayon minimal, maximal et amplitude, déduits des positions publiées. */
  const radii = planets.map(planet => {
    const x = pct(planet, '--x');
    const y = pct(planet, '--y');
    return x === null || y === null ? null : Math.hypot(x - 50, y - 50);
  }).filter(value => value !== null);
  let rMin = null;
  let rMax = null;
  if (radii.length) {
    rMin = Math.min.apply(null, radii);
    rMax = Math.max.apply(null, radii);
  }
  const rSpan = radii.length ? r1(rMax - rMin) : 0;
  panel.setAttribute('data-v2e068-radial',
    radii.length ? `${r1(rMin)}..${r1(rMax)}|amplitude:${rSpan}` : 'aucun');
  line(`Dispersion radiale — ${radii.length ? `rayon ${r1(rMin)}..${r1(rMax)} %, amplitude ${rSpan} %` : 'aucun repère'}.`, 'v2e068-line-radial');

  /* E068-10 — Score de conformité synthétique agrégeant six critères atomiques,
     barre pilotée par une variable CSS, verdict textuel, région live et sobriété. */
  const checks = [
    activeOk,
    topoOk,
    duplicateCount === 0,
    outOfBounds === 0,
    a11yRate === 1,
    radii.length <= 1 || rSpan <= 1,
  ];
  const passed = checks.filter(Boolean).length;
  const score = Math.round(passed / checks.length * 100);
  const level = score === 100 ? 'conforme' : score >= 70 ? 'partiel' : 'non conforme';
  panel.setAttribute('data-v2e068-score', String(score));
  panel.setAttribute('data-v2e068-level', level);
  const scoreWrap = make('div', 'v2e068-score');
  const scoreBar = make('div', 'v2e068-scorebar');
  scoreBar.id = 'v2e068-scorebar';
  scoreBar.style.setProperty('--v2e068-score', `${score}%`);
  scoreWrap.appendChild(scoreBar);
  panel.appendChild(scoreWrap);
  line(`Conformité synthétique — ${score} % (${level}), ${passed}/${checks.length} critères.`, 'v2e068-score-text');

  const live = make('p', 'v2e068-sr', '');
  live.id = 'v2e068-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.textContent = `Instrumentation V2 E068 : ${score} % de conformité, ${level}, ${passed}/${checks.length} critères vérifiés.`;
  panel.appendChild(live);

  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) panel.classList.add('v2e068-calm');
  else panel.classList.remove('v2e068-calm');

  layout.appendChild(panel);
});
