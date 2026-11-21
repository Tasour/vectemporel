import { register } from './registry.js';

/* Lentille E067 — diagnostic textuel appliqué aux métriques chiffrées de la
   vue Constellation. Dix chantiers locaux : aucun appel réseau, aucune source
   aléatoire, aucun minuteur ni boucle d'animation propre. */

register('E067', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : bandeau de diagnostic, états et mode sobre. */
  css('constellation-e067', `
.e067-strip{margin-top:10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);font-size:9px;line-height:1.5;color:var(--ink-soft)}
.e067-row{display:flex;flex-wrap:wrap;gap:4px 10px;margin:0 0 3px}
.e067-label{flex:0 0 96px;color:var(--gold);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.e067-value{color:var(--ink);font-variant-numeric:tabular-nums}
.e067-summary{margin:6px 0 0;padding-top:6px;border-top:1px solid var(--line);color:var(--gold-bright)}
.e067-toggle{min-height:36px;padding:0 10px;margin-bottom:6px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold);font-size:9px;cursor:pointer;transition:border-color .15s ease}
.e067-toggle:hover{border-color:var(--gold)}
.e067-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e067-collapsed .e067-row{display:none}
.e067-gap .const-sun{box-shadow:0 0 0 2px var(--violet)}
.e067-size-ok .const-planet{box-shadow:inset 0 0 0 1px rgba(230,185,111,.35)}
.const-moon[data-e067-low="true"]{border-color:var(--gold-bright);box-shadow:0 0 0 2px rgba(244,214,158,.25)}
.e067-calm .e067-toggle{transition:none}
@media (prefers-reduced-motion: reduce){.e067-toggle{transition:none!important}}
`);

  /* Lecture du DOM déjà rendu par constellation.js : aucune donnée inventée. */
  const head = layout.querySelector('.constellation-head');
  const field = layout.querySelector('.constellation-field');
  const caption = layout.querySelector('.constellation-caption');
  const stateLine = layout.querySelector('.constellation-state');
  const sunLayer = layout.querySelector('.const-layer-suns');
  const planetLayer = layout.querySelector('.const-layer-planets');
  const moonLayer = layout.querySelector('.const-layer-moons');
  const edges = layout.querySelector('.constellation-edges');
  const suns = sunLayer ? Array.from(sunLayer.querySelectorAll('button.const-sun')) : [];
  const planets = planetLayer ? Array.from(planetLayer.querySelectorAll('button.const-planet')) : [];
  const moons = moonLayer ? Array.from(moonLayer.querySelectorAll('button.const-moon')) : [];

  const metrics = {};

  /* Helpers déterministes : lecture de nombres, formatage français, bandeau. */
  function num(value, fallback) {
    const n = parseFloat(String(value));
    return Number.isFinite(n) ? n : fallback;
  }
  function fmt(value) {
    return String(value).replace('.', ',');
  }
  function pct(part, whole) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
  }
  function setData(node, key, value) {
    if (node && node.nodeType === 1 && node.setAttribute) {
      node.setAttribute('data-e067-' + key, String(value));
    }
  }
  function strip() {
    let node = layout.querySelector('#e067-strip');
    if (!node) {
      const anchor = caption || layout;
      node = typeof ctx.el === 'function'
        ? ctx.el('div', 'e067-strip')
        : document.createElement('div');
      node.id = 'e067-strip';
      node.setAttribute('role', 'group');
      node.setAttribute('aria-label', 'Diagnostic textuel des métriques chiffrées');
      anchor.appendChild(node);
    }
    return node;
  }
  function writeRow(key, label, value) {
    const bar = strip();
    let row = bar.querySelector('[data-e067-key="' + key + '"]');
    if (!row) {
      row = typeof ctx.el === 'function'
        ? ctx.el('p', 'e067-row')
        : document.createElement('p');
      row.id = 'e067-m-' + key;
      row.setAttribute('data-e067-key', key);
      const labelNode = typeof ctx.el === 'function'
        ? ctx.el('span', 'e067-label', label) : document.createElement('span');
      const valueNode = typeof ctx.el === 'function'
        ? ctx.el('span', 'e067-value') : document.createElement('span');
      labelNode.className = 'e067-label';
      valueNode.className = 'e067-value';
      valueNode.id = 'e067-v-' + key;
      row.appendChild(labelNode);
      row.appendChild(valueNode);
      bar.appendChild(row);
    }
    const valueNode = row.querySelector('.e067-value');
    if (valueNode) valueNode.textContent = String(value);
    return row;
  }
  function diagnostic(key, label, compute) {
    let value;
    try { value = compute(); }
    catch { value = 'mesure indisponible'; }
    writeRow(key, label, value);
    return value;
  }

  /* E067-01 — Recensement des nœuds numérotés : total soleils + repères + points. */
  diagnostic('01', 'Nœuds', () => {
    const total = suns.length + planets.length + moons.length;
    metrics.total = total;
    setData(field, 'total', total);
    return 'Soleils ' + suns.length + ' · repères ' + planets.length +
      ' · points ' + moons.length + ' · total ' + total + ' nœuds';
  });

  /* E067-02 — Décryptage de la progression « point i / n » de la ligne d'état. */
  diagnostic('02', 'Progression', () => {
    const text = stateLine ? String(stateLine.textContent) : '';
    const match = text.match(/Point\s*:\s*(\d+)\s*\/\s*(\d+)/);
    if (!match) return 'progression non renseignée';
    const i = parseInt(match[1], 10);
    const n = parseInt(match[2], 10);
    const ratio = pct(i, n);
    metrics.progress = ratio;
    setData(stateLine, 'progress', ratio + '%');
    return 'Point ' + i + ' / ' + n + ' — avancement ' + ratio + ' %';
  });

  /* E067-03 — Contrôle de la contiguïté des rangs affichés sur les soleils. */
  diagnostic('03', 'Rangs soleils', () => {
    const ranks = suns.map(sun => num(sun.textContent, -1));
    let contiguous = ranks.length > 0;
    for (let k = 0; k < ranks.length; k++) {
      if (ranks[k] !== k + 1) contiguous = false;
    }
    setData(sunLayer, 'ranks', contiguous ? 'contigus' : 'ecart');
    if (sunLayer) sunLayer.classList.toggle('e067-gap', !contiguous);
    metrics.ranksOk = contiguous;
    return 'Rangs ' + (ranks.length ? '1..' + ranks.length : 'vides') +
      ' — suite ' + (contiguous ? 'contigue' : 'non contigue');
  });

  /* E067-04 — Indice de répartition : rayon moyen des soleils depuis le centre. */
  diagnostic('04', 'Répartition', () => {
    const rays = suns.map(sun => {
      const x = num(sun.style.getPropertyValue('--x'), 50);
      const y = num(sun.style.getPropertyValue('--y'), 50);
      return Math.sqrt((x - 50) * (x - 50) + (y - 50) * (y - 50));
    });
    if (!rays.length) return 'aucun soleil à mesurer';
    const mean = rays.reduce((a, b) => a + b, 0) / rays.length;
    const min = Math.min.apply(null, rays);
    const max = Math.max.apply(null, rays);
    const spread = max - min;
    metrics.spread = spread;
    setData(sunLayer, 'spread', fmt(spread.toFixed(1)));
    return 'Rayon moyen ' + fmt(mean.toFixed(1)) + ' % — écart ' + fmt(spread.toFixed(1)) + ' pt';
  });

  /* E067-05 — Conformité du seuil de taille des nœuds au nombre de repères. */
  diagnostic('05', 'Taille nœuds', () => {
    const raw = field ? field.style.getPropertyValue('--const-node-size') : '';
    const actual = parseInt(String(raw), 10);
    const count = planets.length;
    const expected = count > 16 ? 18 : count > 9 ? 22 : 28;
    const ok = Number.isFinite(actual) && actual === expected;
    setData(field, 'node-size', (Number.isFinite(actual) ? actual : '?') + '/' + expected);
    if (field) field.classList.toggle('e067-size-ok', ok);
    return count + ' repères — nœud ' + (Number.isFinite(actual) ? actual + ' px' : 'non lu') +
      ' (attendu ' + expected + ' px) — ' + (ok ? 'conforme' : 'à vérifier');
  });

  /* E067-06 — Analyse des confidences des lunes : min, max, moyenne et plus faible. */
  diagnostic('06', 'Confiance', () => {
    const read = moon => {
      const title = String(moon.getAttribute('title') || '');
      const match = title.match(/confiance\s+([\d.,]+)/i);
      return match ? num(match[1].replace(',', '.'), 0) : null;
    };
    const values = moons.map(read).filter(value => value !== null);
    if (!values.length) return 'confiance non renseignée';
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    metrics.confidenceMin = min;
    let lowest = -1;
    moons.forEach((moon, index) => {
      if (read(moon) === min && lowest < 0) lowest = index;
    });
    if (lowest >= 0) moons[lowest].setAttribute('data-e067-low', 'true');
    return 'Confiance min ' + fmt(String(min)) + ' · max ' + fmt(String(max)) +
      ' · moyenne ' + fmt(mean.toFixed(2));
  });

  /* E067-07 — Inventaire des sources locales et des points non sourcés. */
  diagnostic('07', 'Sources', () => {
    let total = 0;
    let without = 0;
    moons.forEach(moon => {
      const label = String(moon.getAttribute('data-label') || '');
      const match = label.match(/(\d+)\s*src/);
      if (match) total += parseInt(match[1], 10);
      else without += 1;
    });
    metrics.sources = total;
    setData(moonLayer, 'sources', total);
    return 'Sources locales ' + total + ' · points sans source ' + without;
  });

  /* E067-08 — Bilan des liaisons du SVG : total, chemin et lunes. */
  diagnostic('08', 'Liaisons', () => {
    const lines = edges ? edges.querySelectorAll('line') : [];
    const path = edges ? edges.querySelectorAll('line.is-path').length : 0;
    const moonLines = edges ? edges.querySelectorAll('line.is-moon').length : 0;
    const ratio = pct(path, lines.length);
    metrics.links = lines.length;
    setData(edges, 'links', lines.length);
    return 'Liaisons ' + lines.length + ' · chemin ' + path + ' (' + ratio + ' %) · lune ' + moonLines;
  });

  /* E067-09 — Plage temporelle couverte, « av. J.-C. » compris. */
  diagnostic('09', 'Plage temporelle', () => {
    function parseYear(token) {
      const source = String(token);
      const match = source.match(/(\d{1,4})/);
      if (!match) return null;
      let year = parseInt(match[1], 10);
      if (/av\.?\s*j/i.test(source)) year = -year;
      return year;
    }
    const years = [];
    suns.forEach(sun => {
      const label = String(sun.getAttribute('data-label') || '');
      const dates = label.split('·').slice(1).join('·');
      dates.split(/[–—]/).forEach(part => {
        const year = parseYear(part);
        if (year !== null) years.push(year);
      });
    });
    planets.forEach(planet => {
      const label = String(planet.getAttribute('data-label') || '');
      const year = parseYear(label.split('·')[0]);
      if (year !== null) years.push(year);
    });
    if (!years.length) return 'plage non calculable';
    const min = Math.min.apply(null, years);
    const max = Math.max.apply(null, years);
    const span = max - min;
    metrics.span = span;
    setData(head, 'span', span);
    const start = min < 0 ? Math.abs(min) + ' av. J.-C.' : String(min);
    return 'Plage ' + start + ' → ' + max + ' — amplitude ' + span + ' ans';
  });

  /* E067-10 — Synthèse consolidée, bascule du bandeau et mouvement réduit. */
  diagnostic('10', 'Synthèse', () => {
    const parts = [];
    if (metrics.total !== undefined) parts.push(metrics.total + ' nœuds');
    if (metrics.progress !== undefined) parts.push('avancement ' + metrics.progress + ' %');
    if (metrics.ranksOk !== undefined) parts.push('rangs ' + (metrics.ranksOk ? 'conformes' : 'irréguliers'));
    if (metrics.sources !== undefined) parts.push(metrics.sources + ' sources');
    if (metrics.span !== undefined) parts.push('amplitude ' + metrics.span + ' ans');
    const summary = parts.length
      ? 'Bilan : ' + parts.join(' · ') + '.'
      : 'Bilan : métriques indisponibles.';
    metrics.summary = summary;

    let summaryNode = layout.querySelector('#e067-summary');
    if (!summaryNode) {
      summaryNode = typeof ctx.el === 'function'
        ? ctx.el('p', 'e067-summary') : document.createElement('p');
      summaryNode.id = 'e067-summary';
      summaryNode.setAttribute('role', 'status');
      summaryNode.setAttribute('aria-live', 'polite');
      strip().appendChild(summaryNode);
    }
    summaryNode.textContent = summary;

    const bar = strip();
    let toggle = bar.querySelector('#e067-toggle');
    if (!toggle) {
      toggle = typeof ctx.el === 'function'
        ? ctx.el('button', 'e067-toggle', 'Réduire le diagnostic')
        : document.createElement('button');
      toggle.id = 'e067-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-controls', 'e067-strip');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.addEventListener('click', () => {
        const collapsed = bar.classList.toggle('e067-collapsed');
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        toggle.textContent = collapsed ? 'Afficher le diagnostic' : 'Réduire le diagnostic';
      });
      bar.insertBefore(toggle, bar.firstChild);
    }

    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
      bar.classList.add('e067-calm');
    } else {
      bar.classList.remove('e067-calm');
    }
    return summary;
  });
});
