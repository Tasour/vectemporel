import { register } from './registry.js';

/* Lentille V2 E067 — diagnostic chiffré de second passage appliqué aux métriques
   de la vue Constellation. Dix chantiers inédits, tous implémentés, sans réseau
   ni source aléatoire. Les mesures sont lues sur le DOM déjà rendu, jamais
   inventées, et restituées sous forme de texte dans un panneau local. */
register('E067', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : panneau, états et mode sobre. */
  css('constellation-v2-e067', `
.v2e067-panel{margin-top:10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);font-size:9px;line-height:1.5;color:var(--ink-soft)}
.v2e067-row{display:flex;flex-wrap:wrap;gap:4px 10px;margin:0 0 3px}
.v2e067-label{flex:0 0 116px;color:var(--gold);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.v2e067-value{color:var(--ink);font-variant-numeric:tabular-nums}
.v2e067-summary{margin:6px 0 0;padding-top:6px;border-top:1px solid var(--line);color:var(--gold-bright)}
.v2e067-toggle{min-height:36px;padding:0 12px;margin-bottom:6px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold);font-size:9px;cursor:pointer;transition:border-color .15s ease}
.v2e067-toggle:hover{border-color:var(--gold)}
.v2e067-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e067-collapsed .v2e067-row{display:none}
.v2e067-oob{outline:2px dashed var(--violet);outline-offset:2px}
.v2e067-crowded .const-planet{outline:1px dotted var(--gold-bright);outline-offset:1px}
.const-moon[data-v2e067-conflict="true"]{outline:2px solid var(--violet);outline-offset:2px}
.v2e067-calm .v2e067-toggle{transition:none}
@media (prefers-reduced-motion: reduce){.v2e067-toggle{transition:none!important}}
`);

  /* Lecture du DOM rendu par constellation.js : aucune donnée inventée. */
  const field = layout.querySelector('.constellation-field');
  const caption = layout.querySelector('.constellation-caption');
  const sunLayer = layout.querySelector('.const-layer-suns');
  const planetLayer = layout.querySelector('.const-layer-planets');
  const moonLayer = layout.querySelector('.const-layer-moons');
  const suns = sunLayer ? Array.from(sunLayer.querySelectorAll('button.const-sun')) : [];
  const planets = planetLayer ? Array.from(planetLayer.querySelectorAll('button.const-planet')) : [];
  const moons = moonLayer ? Array.from(moonLayer.querySelectorAll('button.const-moon')) : [];
  const nodes = suns.concat(planets, moons);

  /* score mémorise les contrôles binaires pour l'indice de complétude (10). */
  const score = {};

  /* Helpers déterministes : lecture de nombres, formatage, écriture du panneau. */
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
      node.setAttribute('data-v2e067-' + key, String(value));
    }
  }
  function pos(node) {
    return {
      x: num(node.style.getPropertyValue('--x'), 50),
      y: num(node.style.getPropertyValue('--y'), 50),
    };
  }
  function year(token) {
    const source = String(token);
    const match = source.match(/(\d{1,4})/);
    if (!match) return null;
    let value = parseInt(match[1], 10);
    if (/av\.?\s*j/i.test(source)) value = -value;
    return value;
  }
  function median(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function panel() {
    let node = layout.querySelector('#v2e067-panel');
    if (!node) {
      const anchor = caption || layout;
      node = typeof ctx.el === 'function'
        ? ctx.el('div', 'v2e067-panel')
        : document.createElement('div');
      node.id = 'v2e067-panel';
      node.setAttribute('role', 'group');
      node.setAttribute('aria-label', 'Diagnostic chiffré de second passage des métriques');
      anchor.appendChild(node);
    }
    return node;
  }
  function writeRow(key, label, value) {
    const bar = panel();
    let row = bar.querySelector('[data-v2e067-key="' + key + '"]');
    if (!row) {
      row = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e067-row')
        : document.createElement('p');
      row.id = 'v2e067-m-' + key;
      row.setAttribute('data-v2e067-key', key);
      const labelNode = typeof ctx.el === 'function'
        ? ctx.el('span', 'v2e067-label', label) : document.createElement('span');
      const valueNode = typeof ctx.el === 'function'
        ? ctx.el('span', 'v2e067-value') : document.createElement('span');
      labelNode.className = 'v2e067-label';
      valueNode.className = 'v2e067-value';
      valueNode.id = 'v2e067-v-' + key;
      row.appendChild(labelNode);
      row.appendChild(valueNode);
      bar.appendChild(row);
    }
    const valueNode = row.querySelector('.v2e067-value');
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

  /* E067-01 — Conformité des positions au cadre du viewBox (10–90 / 12–88). */
  diagnostic('01', 'Cadre', () => {
    let out = 0;
    nodes.forEach(node => {
      const p = pos(node);
      if (p.x < 10 || p.x > 90 || p.y < 12 || p.y > 88) out += 1;
    });
    score.bounds = out === 0;
    setData(field, 'hors-cadre', out);
    if (field) field.classList.toggle('v2e067-oob', out > 0);
    return 'Nœuds dans le cadre : ' + (nodes.length - out) + ' / ' + nodes.length +
      ' — hors cadre ' + out;
  });

  /* E067-02 — Régularité angulaire des soleils autour du centre (50, 50). */
  diagnostic('02', 'Angles soleils', () => {
    if (suns.length < 2) return 'angles non comparables (moins de deux soleils)';
    const angles = suns.map(sun => {
      const p = pos(sun);
      const deg = Math.atan2(p.y - 50, p.x - 50) * 180 / Math.PI;
      return (deg + 360) % 360;
    }).sort((a, b) => a - b);
    const expected = 360 / suns.length;
    let maxDeviation = 0;
    for (let k = 0; k < angles.length; k++) {
      const next = k === angles.length - 1 ? angles[0] + 360 : angles[k + 1];
      const gap = next - angles[k];
      maxDeviation = Math.max(maxDeviation, Math.abs(gap - expected));
    }
    score.angles = maxDeviation <= 1;
    setData(sunLayer, 'ecart-angulaire', fmt(maxDeviation.toFixed(1)));
    return 'Écart angulaire max ' + fmt(maxDeviation.toFixed(1)) + '° — attendu ' +
      fmt(expected.toFixed(1)) + '°';
  });

  /* E067-03 — Unicité de l'état actif (aria-current) dans chaque couche. */
  diagnostic('03', 'États actifs', () => {
    const count = layer => layer
      ? layer.querySelectorAll('[aria-current="true"]').length : 0;
    const a = count(sunLayer);
    const b = count(planetLayer);
    const c = count(moonLayer);
    setData(sunLayer, 'actifs', a);
    setData(planetLayer, 'actifs', b);
    setData(moonLayer, 'actifs', c);
    const coherent = (suns.length === 0 || a === 1) &&
      (planets.length === 0 || b === 1) && (moons.length === 0 || c === 1);
    score.actifs = coherent;
    setData(field, 'actifs-coherents', coherent ? 'oui' : 'non');
    return 'Actifs — ères ' + a + ', repères ' + b + ', points ' + c +
      ' — cohérence ' + (coherent ? 'oui' : 'non');
  });

  /* E067-04 — Distance minimale entre repères : risque de chevauchement. */
  diagnostic('04', 'Espacement repères', () => {
    if (planets.length < 2) return 'espacement non mesurable (moins de deux repères)';
    const points = planets.map(pos);
    let min = Infinity;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        min = Math.min(min, Math.sqrt(dx * dx + dy * dy));
      }
    }
    score.spacing = min >= 5;
    setData(planetLayer, 'distance-min', fmt(min.toFixed(1)));
    if (planetLayer) planetLayer.classList.toggle('v2e067-crowded', min < 5);
    return 'Distance min entre repères ' + fmt(min.toFixed(1)) +
      ' pt — seuil 5 pt — ' + (min >= 5 ? 'aéré' : 'rapproché');
  });

  /* E067-05 — Constance de la confiance entre title et aria-label des lunes. */
  diagnostic('05', 'Confiance title/aria', () => {
    const read = (moon, attr) => {
      const match = String(moon.getAttribute(attr) || '').match(/confiance\s+([\d.,]+)/i);
      return match ? match[1].replace(',', '.') : null;
    };
    let ok = 0;
    let conflict = 0;
    moons.forEach(moon => {
      const a = read(moon, 'title');
      const b = read(moon, 'aria-label');
      if (a !== null && b !== null && num(a, -1) === num(b, -2)) ok += 1;
      else {
        conflict += 1;
        moon.setAttribute('data-v2e067-conflict', 'true');
      }
    });
    score.confiance = conflict === 0;
    setData(moonLayer, 'confiance-divergences', conflict);
    return 'Confiance concordante ' + ok + ' · divergente ' + conflict;
  });

  /* E067-06 — Sources annoncées : cohérence aria-label / data-label. */
  diagnostic('06', 'Sources aria/data', () => {
    let totalAria = 0;
    let diverge = 0;
    moons.forEach(moon => {
      const aria = String(moon.getAttribute('aria-label') || '');
      const data = String(moon.getAttribute('data-label') || '');
      const a = aria.match(/(\d+)\s+source/);
      const d = data.match(/(\d+)\s*src/);
      const av = a ? parseInt(a[1], 10) : 0;
      const dv = d ? parseInt(d[1], 10) : 0;
      totalAria += av;
      if (av !== dv) diverge += 1;
    });
    score.sources = diverge === 0;
    setData(moonLayer, 'sources-aria', totalAria);
    setData(moonLayer, 'sources-divergences', diverge);
    return 'Sources annoncées ' + totalAria + ' · divergences data-label ' + diverge;
  });

  /* E067-07 — Répartition avant / après notre ère des repères, année médiane. */
  diagnostic('07', 'Ères des repères', () => {
    const years = [];
    let bc = 0;
    planets.forEach(planet => {
      const value = year(String(planet.getAttribute('data-label') || '').split('·')[0]);
      if (value === null) return;
      years.push(value);
      if (value < 0) bc += 1;
    });
    if (!years.length) return 'années de repères non lisibles';
    const med = median(years);
    setData(planetLayer, 'repères-avj', bc);
    setData(planetLayer, 'annee-mediane', fmt(String(med)));
    return 'Repères : ' + bc + ' av. J.-C. · ' + (years.length - bc) + ' apr. J.-C.' +
      ' — année médiane ' + fmt(String(med));
  });

  /* E067-08 — Répartition des niveaux de confiance en trois bandes. */
  diagnostic('08', 'Bandes confiance', () => {
    let high = 0;
    let mid = 0;
    let low = 0;
    moons.forEach(moon => {
      const match = String(moon.getAttribute('title') || '').match(/confiance\s+([\d.,]+)/i);
      if (!match) return;
      const value = num(match[1].replace(',', '.'), 0);
      if (value >= 0.8) high += 1;
      else if (value >= 0.5) mid += 1;
      else low += 1;
    });
    setData(moonLayer, 'bandes', high + '/' + mid + '/' + low);
    return 'Confiance — élevée ' + high + ' · moyenne ' + mid + ' · faible ' + low +
      ' (sur ' + moons.length + ')';
  });

  /* E067-09 — Intégrité des clés de focus (data-const-key) du champ. */
  diagnostic('09', 'Clés de focus', () => {
    const keys = field
      ? Array.from(field.querySelectorAll('[data-const-key]'))
          .map(node => String(node.getAttribute('data-const-key') || ''))
      : [];
    const unique = new Set(keys);
    const duplicates = keys.length - unique.size;
    const malformed = keys.filter(key => !/^(sun|planet|moon):\d+$/.test(key)).length;
    score.keys = duplicates === 0 && malformed === 0;
    setData(field, 'cles-uniques', unique.size);
    setData(field, 'cles-doublons', duplicates);
    return 'Clés ' + keys.length + ' · uniques ' + unique.size + ' · doublons ' +
      duplicates + ' · hors format ' + malformed;
  });

  /* E067-10 — Indice de complétude, synthèse annoncée et bascule du détail. */
  diagnostic('10', 'Complétude', () => {
    const checks = ['bounds', 'angles', 'actifs', 'spacing', 'confiance',
      'sources', 'keys'];
    const passed = checks.filter(key => score[key] === true).length;
    const total = checks.length;
    const rate = pct(passed, total);
    setData(layout, 'completude', rate + '%');

    let summary = layout.querySelector('#v2e067-summary');
    if (!summary) {
      summary = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e067-summary') : document.createElement('p');
      summary.id = 'v2e067-summary';
      summary.setAttribute('role', 'status');
      summary.setAttribute('aria-live', 'polite');
      summary.setAttribute('aria-atomic', 'true');
      panel().appendChild(summary);
    }
    summary.textContent = 'Indice de complétude : ' + rate + ' % (' + passed +
      ' / ' + total + ' contrôles) — ' + nodes.length + ' nœuds examinés.';

    const bar = panel();
    let toggle = bar.querySelector('#v2e067-toggle');
    if (!toggle) {
      toggle = typeof ctx.el === 'function'
        ? ctx.el('button', 'v2e067-toggle', 'Réduire le détail chiffré')
        : document.createElement('button');
      toggle.id = 'v2e067-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-controls', 'v2e067-panel');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.addEventListener('click', () => {
        const collapsed = bar.classList.toggle('v2e067-collapsed');
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        toggle.textContent = collapsed
          ? 'Afficher le détail chiffré' : 'Réduire le détail chiffré';
      });
      bar.insertBefore(toggle, bar.firstChild);
    }

    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
      bar.classList.add('v2e067-calm');
    } else {
      bar.classList.remove('v2e067-calm');
    }
    return summary.textContent;
  });
});
