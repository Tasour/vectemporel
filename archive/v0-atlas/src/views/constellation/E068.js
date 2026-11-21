import { register } from './registry.js';

/* Lentille E068 — Instrumentation E2E appliquée aux métriques chiffrées de la
   vue Constellation. Dix chantiers locaux et complémentaires : la scène est
   mesurée, signée, comparée et tracée sans aucun appel réseau, sans aléa,
   sans minuteur ni boucle d'animation propre. */
register('E068', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function') return;

  const layout = ctx.layout;

  /* Feuille unique de la lentille : panneau, jauges, assertion, annotations. */
  ctx.css('constellation-e068', `
.e068-panel{position:relative;z-index:6;margin:10px 0 0;padding:8px 10px;border:1px solid rgba(230,185,111,.38);border-radius:8px;background:rgba(8,11,18,.92);color:#f0e4cc;font:10px/1.5 var(--sans, sans-serif)}
.e068-title{margin:0 0 6px;color:var(--gold,#e6b96f);font:600 10px/1.2 inherit;letter-spacing:.08em;text-transform:uppercase}
.e068-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:0}
.e068-cell{padding:5px 6px;border:1px solid rgba(244,214,158,.18);border-radius:6px;text-align:center;font-variant-numeric:tabular-nums}
.e068-num{display:block;font-size:14px;color:var(--gold-bright,#f4d69e)}
.e068-lab{display:block;font-size:8px;color:var(--muted,#9a968c);letter-spacing:.06em;text-transform:uppercase}
.e068-bar{position:relative;height:5px;margin-top:8px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.e068-fill{position:absolute;inset:0 auto 0 0;width:var(--e068-fill,0%);background:linear-gradient(90deg,var(--gold,#e6b96f),var(--violet,#b28bdd));transition:width .2s ease}
.e068-line{margin:6px 0 0;font-size:9px;color:var(--muted-2,#b8b2a4);font-variant-numeric:tabular-nums}
.e068-assert-ok{border-color:rgba(120,200,150,.55)}
.e068-assert-fail{border-color:rgba(220,110,110,.65)}
.e068-badge{margin-left:6px;padding:1px 5px;border:1px solid currentColor;border-radius:4px;font-size:8px;font-weight:600;letter-spacing:.06em}
.e068-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.const-moon.e068-annotated::before{position:absolute;top:-11px;left:50%;transform:translateX(-50%);content:attr(data-e068-confidence);color:var(--violet,#b28bdd);font-size:7px;white-space:nowrap;pointer-events:none;opacity:.85}
.e068-calm .e068-fill{transition:none}
@media (prefers-reduced-motion: reduce){.e068-fill{transition:none!important}}
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
  const links = pick(edges, 'line');

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
  const round1 = value => Math.round(value * 10) / 10;
  const signed = value => (value > 0 ? '+' : '') + String(round1(value));

  /* E068-01 — Snapshot métrique central : comptage des nœuds et des arêtes.
     Un panneau inspectable porte le relevé complet et son id unique e068-panel. */
  const panel = make('div', 'e068-panel');
  panel.id = 'e068-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Instrumentation E2E des métriques chiffrées de la constellation');
  const heading = make('h3', 'e068-title', 'Instrumentation E068 · snapshot métrique');
  heading.id = 'e068-title';
  panel.appendChild(heading);

  const counts = [
    ['suns', suns.length, 'Ères'],
    ['planets', planets.length, 'Repères'],
    ['moons', moons.length, 'Points'],
    ['links', links.length, 'Liens'],
  ];
  const grid = make('div', 'e068-grid');
  grid.id = 'e068-grid';
  counts.forEach(([key, value, label]) => {
    const cell = make('div', 'e068-cell');
    cell.id = `e068-cell-${key}`;
    const num = make('span', 'e068-num', String(value));
    num.id = `e068-num-${key}`;
    const lab = make('span', 'e068-lab', label);
    lab.id = `e068-lab-${key}`;
    cell.append(num, lab);
    grid.appendChild(cell);
  });
  panel.appendChild(grid);
  panel.setAttribute('data-e068-snapshot',
    counts.map(([key, value]) => `${key}:${value}`).join('|'));

  /* E068-02 — Signature déterministe du snapshot (graine fixe FNV-1a).
     Aucune source aléatoire : la signature ne change qu'avec les métriques. */
  const signature = (() => {
    const vector = counts.map(([, value]) => value).join('|');
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < vector.length; i += 1) {
      hash ^= vector.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  })();
  panel.setAttribute('data-e068-signature', signature);

  /* E068-03 — Jauge de densité angulaire des repères.
     Le rayon est recalculé depuis le nombre de planètes, puis piloté par une
     variable CSS qui donne sa largeur à la barre de remplissage. */
  const density = Math.max(18, Math.min(34, 14 + planets.length * 1.8));
  const bar = make('div', 'e068-bar');
  bar.id = 'e068-bar';
  const fill = make('div', 'e068-fill');
  fill.id = 'e068-fill';
  const fillPct = Math.max(0, Math.min(100, ((density - 18) / 16) * 100));
  fill.style.setProperty('--e068-fill', `${round1(fillPct)}%`);
  bar.appendChild(fill);
  panel.appendChild(bar);
  panel.setAttribute('data-e068-density', String(round1(density)));

  /* E068-04 — Écart angulaire minimal entre repères.
     Les positions en pourcentage sont converties en angles, triées, puis le
     plus petit intervalle cyclique est exposé en attribut. */
  const angles = planets.map(planet => {
    const x = pct(planet, '--x');
    const y = pct(planet, '--y');
    return x === null || y === null ? null : Math.atan2(y - 50, x - 50) * 180 / Math.PI;
  }).filter(value => value !== null).sort((a, b) => a - b);
  let minGap = 360;
  if (angles.length > 1) {
    for (let i = 0; i < angles.length; i += 1) {
      const gap = i === angles.length - 1
        ? angles[0] + 360 - angles[i]
        : angles[i + 1] - angles[i];
      if (gap < minGap) minGap = gap;
    }
  }
  const minGapValue = angles.length > 1 ? round1(minGap) : 0;
  panel.setAttribute('data-e068-mingap', String(minGapValue));

  /* E068-05 — Couverture des sources des points vérifiés.
     Le libellé de chaque lune porte « N src » ; le ratio couvert / total
     alimente une seconde mesure et un attribut auditable. */
  let covered = 0;
  moons.forEach(moon => {
    const label = moon.getAttribute('data-label') || '';
    if (/\b\d+\s+src\b/.test(label)) covered += 1;
  });
  const coverage = moons.length ? covered / moons.length : 0;
  panel.setAttribute('data-e068-covered', String(covered));
  panel.setAttribute('data-e068-coverage', String(round1(coverage * 100)));

  const detail = make('p', 'e068-line',
    `Écart minimal : ${minGapValue}° · Rayon : ${round1(density)}% · Sources : ${covered}/${moons.length} (${Math.round(coverage * 100)} %) · Signature ${signature}`);
  detail.id = 'e068-detail';
  panel.appendChild(detail);

  /* E068-06 — Assertion de plage façon E2E (expect).
     Cinq invariants sont vérifiés ; le résultat est à la fois attribut et
     classe CSS, sans portée portée par la seule couleur (libellé explicite). */
  const checks = [
    suns.length >= 1 && suns.length <= 12,
    planets.length >= 1 && planets.length <= 40,
    angles.length > 1 && minGap >= 0 && minGap <= 360,
    covered <= moons.length,
    links.length >= planets.length && links.length <= planets.length + moons.length + 1,
  ];
  const failed = checks.filter(ok => !ok).length;
  const passed = failed === 0;
  panel.setAttribute('data-e068-assert', passed ? 'pass' : 'fail');
  panel.classList.add(passed ? 'e068-assert-ok' : 'e068-assert-fail');
  const verdict = make('p', 'e068-line',
    `Assertion : ${passed ? 'PASS' : `FAIL (${failed} invariant${failed > 1 ? 's' : ''})`} · ${checks.length} contrôles`);
  verdict.id = 'e068-assert';
  const badge = make('span', 'e068-badge', passed ? 'PASS' : 'FAIL');
  badge.id = 'e068-badge';
  verdict.appendChild(badge);
  panel.appendChild(verdict);

  /* E068-07 — Ligne de base figée et écart signé (delta).
     Une référence nominale constants est comparée au snapshot courant. */
  const BASELINE = { suns: 9, planets: 12, moons: 8, links: 26 };
  const deltas = counts.map(([key, value]) => `${key} ${signed(value - BASELINE[key])}`).join(' · ');
  const deltaLine = make('p', 'e068-line', `Écart à la ligne de base : ${deltas}`);
  deltaLine.id = 'e068-delta';
  panel.appendChild(deltaLine);
  panel.setAttribute('data-e068-delta',
    counts.map(([key, value]) => `${key}:${signed(value - BASELINE[key])}`).join('|'));

  /* E068-08 — Traceur d'interactions : chaque activation d'un nœud incrémente
     un compteur local, sans minuteur ni envoi de données hors de la page. */
  const trace = make('p', 'e068-line', 'Clics tracés : 0');
  trace.id = 'e068-trace';
  panel.appendChild(trace);
  let traceCount = 0;
  field.addEventListener('click', event => {
    const target = event && event.target;
    const node = target && target.nodeType === 1 && typeof target.closest === 'function'
      ? target.closest('button.const-sun, button.const-planet, button.const-moon') : null;
    if (!node || !field.contains(node)) return;
    traceCount += 1;
    trace.textContent = `Clics tracés : ${traceCount}`;
    trace.setAttribute('data-e068-trace', String(traceCount));
  });

  /* E068-09 — Annotations de confiance sur les lunes.
     Le niveau lu dans l'infobulle est dupliqué en attribut et affiché par un
     pseudo-élément, pour ne jamais reposer sur la seule couleur du point. */
  moons.forEach(moon => {
    const title = moon.getAttribute('title') || moon.getAttribute('aria-label') || '';
    const match = /(?:confiance\s+)([^\s·,]+)/i.exec(title);
    const level = match ? match[1] : 'non précisée';
    moon.setAttribute('data-e068-confidence', level);
    moon.classList.add('e068-annotated');
  });

  /* E068-10 — Région live de synthèse et mode sobre.
     Le bilan chiffré est annoncé une fois au rendu, puis à chaque interaction
     tracée ; la préférence de mouvement réduit est demandée au contexte. */
  const live = make('p', 'e068-sr', '');
  live.id = 'e068-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.textContent = `Instrumentation E068 : ${suns.length} ères, ${planets.length} repères, ${moons.length} points, ${links.length} liens. Assertion ${passed ? 'réussie' : 'en échec'}.`;
  panel.appendChild(live);
  field.addEventListener('click', event => {
    const target = event && event.target;
    const node = target && target.nodeType === 1 && typeof target.closest === 'function'
      ? target.closest('button.const-sun, button.const-planet, button.const-moon') : null;
    if (!node || !field.contains(node)) return;
    live.textContent = `Trace E068 : interaction ${traceCount}, signature ${signature}, assertion ${passed ? 'réussie' : 'en échec'}.`;
  });
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) panel.classList.add('e068-calm');
  else panel.classList.remove('e068-calm');

  layout.appendChild(panel);
});
