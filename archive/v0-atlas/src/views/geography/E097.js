import { register } from './registry.js';

/* Lentille E097 — vue GEOGRAPHIE.
 * Thème : codes ISO des pays (alpha-2 / alpha-3), norme ISO 3166-1.
 * Dix chantiers E097-01..E097-10 décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E097.md.
 * Local : zéro réseau, zéro Math.random, zéro console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel dans le DOM,
 * lisible sans animation ; le canvas n'est qu'un laboratoire déterministe.
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */
const CSS_ID = 'geography-e097';
const PANEL_ID = 'geography-e097-panel';
const TITLE_ID = 'geography-e097-title';
const FORMAT_ID = 'geography-e097-format';
const SEARCH_ID = 'geography-e097-search';
const SEARCH_OUT_ID = 'geography-e097-search-result';
const CANVAS_ID = 'geography-e097-canvas';
const READOUT_ID = 'geography-e097-readout';
const PLAY_ID = 'geography-e097-play';
const LEGEND_ID = 'geography-e097-legend';
const BADGE_ID = 'geography-e097-badge';
const TABLE_ID = 'geography-e097-table';
const COLS = 8;
const TOTAL_ASSIGNED = 249;
const SWEEP_MS = 6000;

/* E097-02 : données ISO 3166-1 canoniques (aucune valeur inventée). */
const PAYS = [
  ['France', 'FR', 'FRA', '250'], ['Allemagne', 'DE', 'DEU', '276'], ['États-Unis', 'US', 'USA', '840'],
  ['Royaume-Uni', 'GB', 'GBR', '826'], ['Canada', 'CA', 'CAN', '124'], ['Japon', 'JP', 'JPN', '392'],
  ['Chine', 'CN', 'CHN', '156'], ['Inde', 'IN', 'IND', '356'], ['Brésil', 'BR', 'BRA', '076'],
  ['Australie', 'AU', 'AUS', '036'], ['Italie', 'IT', 'ITA', '380'], ['Espagne', 'ES', 'ESP', '724'],
  ['Mexique', 'MX', 'MEX', '484'], ['Afrique du Sud', 'ZA', 'ZAF', '710'], ['Égypte', 'EG', 'EGY', '818'],
  ['Nigeria', 'NG', 'NGA', '566'], ['Kenya', 'KE', 'KEN', '404'], ['Maroc', 'MA', 'MAR', '504'],
  ['Suisse', 'CH', 'CHE', '756'], ['Belgique', 'BE', 'BEL', '056'], ['Pays-Bas', 'NL', 'NLD', '528'],
  ['Portugal', 'PT', 'PRT', '620'], ['Suède', 'SE', 'SWE', '752'], ['Norvège', 'NO', 'NOR', '578'],
  ['Danemark', 'DK', 'DNK', '208'], ['Finlande', 'FI', 'FIN', '246'], ['Pologne', 'PL', 'POL', '616'],
  ['Russie', 'RU', 'RUS', '643'], ['Turquie', 'TR', 'TUR', '792'], ['Ukraine', 'UA', 'UKR', '804'],
  ['Argentine', 'AR', 'ARG', '032'], ['Chili', 'CL', 'CHL', '152'], ['Colombie', 'CO', 'COL', '170'],
  ['Pérou', 'PE', 'PER', '604'], ['Corée du Sud', 'KR', 'KOR', '410'], ['Indonésie', 'ID', 'IDN', '360'],
  ['Thaïlande', 'TH', 'THA', '764'], ['Viet Nam', 'VN', 'VNM', '704'], ['Pakistan', 'PK', 'PAK', '586'],
  ['Bangladesh', 'BD', 'BGD', '050'], ['Arabie saoudite', 'SA', 'SAU', '682'], ['Israël', 'IL', 'ISR', '376'],
  ['Nouvelle-Zélande', 'NZ', 'NZL', '554'], ['Singapour', 'SG', 'SGP', '702'], ['Malaisie', 'MY', 'MYS', '458'],
  ['Philippines', 'PH', 'PHL', '608'], ['Grèce', 'GR', 'GRC', '300'], ['Autriche', 'AT', 'AUT', '040'],
  ['Irlande', 'IE', 'IRL', '372'], ['Tchéquie', 'CZ', 'CZE', '203'], ['Hongrie', 'HU', 'HUN', '348'],
  ['Roumanie', 'RO', 'ROU', '642'], ['Serbie', 'RS', 'SRB', '688'], ['Croatie', 'HR', 'HRV', '191'],
  ['Slovaquie', 'SK', 'SVK', '703'], ['Bulgarie', 'BG', 'BGR', '100'], ['Islande', 'IS', 'ISL', '352'],
  ['Luxembourg', 'LU', 'LUX', '442']
];

/* ---------- Formules et recherches déterministes (E097-04, E097-06) ---------- */
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const fmtInt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function normalise(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
function codeDu(p, f) {
  return f === 'alpha3' ? p[2] : f === 'num' ? p[3] : p[1];
}
function cherche(q) {
  const nq = normalise(q).trim();
  if (!nq) return -1;
  for (let i = 0; i < PAYS.length; i += 1) {
    const p = PAYS[i];
    if (p[1] === nq || p[2] === nq || p[3] === nq || normalise(p[0]) === nq) return i;
  }
  for (let i = 0; i < PAYS.length; i += 1) {
    if (normalise(PAYS[i][0]).indexOf(nq) >= 0) return i;
  }
  return -1;
}
function mesures() {
  const comb2 = 26 * 26;
  const comb3 = 26 * 26 * 26;
  return {
    total: TOTAL_ASSIGNED,
    comb2,
    comb3,
    occ2: (TOTAL_ASSIGNED / comb2) * 100,
    occ3: (TOTAL_ASSIGNED / comb3) * 100,
    dataset: PAYS.length,
  };
}
const LEGENDES = {
  alpha2: 'alpha-2 : deux lettres majuscules. Deux barres sous le code.',
  alpha3: 'alpha-3 : trois lettres majuscules. Trois barres sous le code.',
  num: 'Code numérique : trois chiffres indépendants de l\'alphabet. Un carré pointillé. Le format est aussi donné par la marque sous le code, jamais par la seule couleur.',
};

/* État de module : survit au stage.replaceChildren() de la coque. */
const S = {
  format: 'alpha2',
  index: 0,
  query: '',
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Feuille de style unique, injectée une seule fois (E097-01) ---------- */
const CSS = `
#geography-e097-panel{margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6}
#geography-e097-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e097-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e097-panel p{margin:5px 0;max-width:68ch}
#geography-e097-panel .geography-e097-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#geography-e097-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e097-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e097-table th,#geography-e097-table td{border:1px solid var(--line);padding:4px 5px;text-align:left}
#geography-e097-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e097-format{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e097-format legend{padding:0 4px;color:var(--muted)}
#geography-e097-panel .geography-e097-choix{display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer}
#geography-e097-panel .geography-e097-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e097-search{width:100%;min-height:40px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.2);color:var(--ink);font:inherit;font-size:11px}
#geography-e097-search-result{min-height:20px;margin:5px 0;color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
#geography-e097-canvas{display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:none}
#geography-e097-legend{font-size:10px;color:var(--muted)}
#geography-e097-readout{min-height:48px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums}
#geography-e097-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e097-panel button{display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;transition:border-color .18s,background-color .18s}
#geography-e097-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e097-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e097-canvas:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e097-badge{position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;border:1px solid var(--gold,#e6b96f);border-radius:6px;background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);font-size:10px;line-height:1.4;pointer-events:none}
#geography-e097-panel[data-geography-e097-reduced="1"] button,.geography-e097-badge{transition:none}
@media (prefers-reduced-motion:reduce){#geography-e097-panel button,.geography-e097-badge{transition:none!important;animation:none!important}}
@media (max-width:620px){#geography-e097-panel{font-size:10px;padding:9px}#geography-e097-canvas{height:190px}}
`;

/* ---------- Texte sémantique, présent dans le DOM sans animation (E097-01) ---------- */
function staticFacts() {
  const w = document.createElement('div');
  const faits = [
    'La norme ISO 3166-1 attribue à chaque pays ou territoire un nom, un code à deux lettres (alpha-2), un code à trois lettres (alpha-3) et un code numérique à trois chiffres.',
    'Le code alpha-2 sert surtout aux domaines Internet, aux plaques d immatriculation et aux étiquettes ; le code alpha-3 est privilégié par les organisations internationales et les normes de données.',
    'Le code numérique ne dépend pas de l\'alphabet : il reste lisible quand la langue ou l\'écriture du document change. Les trois formats désignent la même entité.',
  ];
  faits.forEach((t) => {
    const p = document.createElement('p');
    p.className = 'geography-e097-fait';
    p.textContent = t;
    w.appendChild(p);
  });
  return w;
}

/* E097-04 : tableau d'extrait, texte réel lisible sans JS. */
function staticTable() {
  const t = document.createElement('table');
  t.id = TABLE_ID;
  const cap = document.createElement('caption');
  cap.textContent = 'Extrait ISO 3166-1 (référence : 249 codes officiellement attribués).';
  t.appendChild(cap);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pays', 'alpha-2', 'alpha-3', 'Numérique'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  t.appendChild(thead);
  const tb = document.createElement('tbody');
  [0, 1, 2, 3, 4, 5, 18, 19, 26, 27, 28, 30].forEach((i) => {
    const tr = document.createElement('tr');
    const p = PAYS[i];
    [p[0], p[1], p[2], p[3]].forEach((c, j) => {
      const cell = document.createElement(j === 0 ? 'th' : 'td');
      if (j === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}

function ensurePanel(ctx) {
  const ex = document.getElementById(PANEL_ID);
  if (ex && ex.isConnected) {
    return {
      panel: ex,
      fresh: false,
      a2: document.getElementById(FORMAT_ID + '-alpha2'),
      a3: document.getElementById(FORMAT_ID + '-alpha3'),
      num: document.getElementById(FORMAT_ID + '-num'),
      search: document.getElementById(SEARCH_ID),
      searchOut: document.getElementById(SEARCH_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }
  const panel = ctx.el('section', 'geography-e097-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);
  const title = ctx.el('h2', '', 'Codes ISO des pays — alpha-2 et alpha-3');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un même pays possède plusieurs identifiants normalisés. Comparer alpha-2, alpha-3 et code numérique rend visible un choix de norme plutôt qu\'une simple étiquette.');
  const fs = document.createElement('fieldset');
  fs.id = FORMAT_ID;
  const fl = document.createElement('legend');
  fl.textContent = 'Format de code affiché (choix unique)';
  fs.appendChild(fl);
  [['alpha2', 'alpha-2 (2 lettres)'], ['alpha3', 'alpha-3 (3 lettres)'], ['num', 'Numérique (3 chiffres)']].forEach(([v, l]) => {
    const lab = ctx.el('label', 'geography-e097-choix');
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = 'geography-e097-format';
    r.id = FORMAT_ID + '-' + v;
    r.value = v;
    r.checked = S.format === v;
    lab.appendChild(r);
    lab.appendChild(document.createTextNode(l));
    fs.appendChild(lab);
  });
  const sh = ctx.el('h3', '', 'Rechercher un pays');
  const sl = document.createElement('label');
  sl.setAttribute('for', SEARCH_ID);
  sl.appendChild(document.createTextNode('Nom ou code ISO : '));
  const search = document.createElement('input');
  search.type = 'search';
  search.id = SEARCH_ID;
  search.value = S.query;
  search.setAttribute('aria-label', 'Rechercher un pays par nom ou par code ISO');
  const searchOut = ctx.el('p', 'geography-e097-search-result');
  searchOut.id = SEARCH_OUT_ID;
  searchOut.setAttribute('role', 'status');
  searchOut.setAttribute('aria-live', 'polite');
  const lh = ctx.el('h3', '', 'Laboratoire — grille de codes');
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Grille de codes ISO. Flèches gauche et droite : changer de format ; flèches haut et bas : changer de pays.');
  const legend = ctx.el('p', 'geography-e097-legend');
  legend.id = LEGEND_ID;
  const readout = ctx.el('p', 'geography-e097-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  const searchRow = ctx.el('p', '');
  searchRow.appendChild(sl);
  searchRow.appendChild(search);
  panel.append(title, lead, staticFacts(), staticTable(), fs, sh, searchRow, searchOut, lh, canvas, legend, readout, play);
  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function' ? (host.querySelector('.geo-panel') || host) : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);
  return {
    panel,
    fresh: true,
    a2: document.getElementById(FORMAT_ID + '-alpha2'),
    a3: document.getElementById(FORMAT_ID + '-alpha3'),
    num: document.getElementById(FORMAT_ID + '-num'),
    search,
    searchOut,
    canvas,
    readout,
    play,
    legend,
  };
}

/* ---------- Laboratoire canvas : grille déterministe (E097-05, E097-08) ---------- */
function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;
  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);
  const pad = 10;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const rows = Math.ceil(PAYS.length / COLS);
  const cw = iw / COLS;
  const ch = ih / rows;
  const scan = Math.floor(S.sweep * COLS);
  for (let i = 0; i < PAYS.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = pad + col * cw;
    const y = pad + row * ch;
    const sel = i === S.index;
    const sc = col === scan;
    g.fillStyle = sel ? 'rgba(244,214,158,.16)' : (row % 2 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)');
    g.fillRect(x + 1, y + 1, cw - 2, ch - 2);
    g.strokeStyle = sel ? 'rgba(244,214,158,.95)' : (sc ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.14)');
    g.lineWidth = sel ? 2 : 1;
    if (g.setLineDash) g.setLineDash([]);
    g.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
    if (sel) { g.lineWidth = 1; g.strokeRect(x + 4, y + 4, cw - 8, ch - 8); }
    g.fillStyle = sel ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.92)';
    g.font = 'bold ' + Math.max(8, Math.min(13, Math.floor(cw / 3.2))) + 'px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(codeDu(PAYS[i], S.format), x + cw / 2, y + ch / 2 - 3);
    const my = y + ch - 6;
    g.strokeStyle = 'rgba(244,214,158,.9)';
    g.lineWidth = 1;
    if (g.setLineDash) g.setLineDash([]);
    if (S.format === 'alpha2' || S.format === 'alpha3') {
      const n = S.format === 'alpha2' ? 2 : 3;
      for (let k = 0; k < n; k += 1) {
        g.beginPath();
        g.moveTo(x + cw / 2 - 6 + k * 5, my);
        g.lineTo(x + cw / 2 - 2 + k * 5, my);
        g.stroke();
      }
    } else {
      g.setLineDash([2, 2]);
      g.strokeRect(x + cw / 2 - 5, my - 3, 10, 6);
      if (g.setLineDash) g.setLineDash([]);
    }
  }
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(S.format.toUpperCase() + ' — ' + PAYS[S.index][0], pad + 2, pad - 1);
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.fillText('Balayage : colonne ' + (scan + 1) + ' / ' + COLS, pad + 2, cssH - pad + 8);
}

/* ---------- Grandeurs chiffrées comparées à une référence (E097-06) ---------- */
function updateReadout() {
  const m = mesures();
  const n = S.nodes.readout;
  if (!n) return;
  const f = (x) => { const s = document.createElement('strong'); s.textContent = x; return s; };
  n.textContent = '';
  n.appendChild(document.createTextNode('ISO 3166-1 : '));
  n.appendChild(f(fmtInt(m.total)));
  n.appendChild(document.createTextNode(' codes officiellement attribués (référence). Référence combinatoire : 26 × 26 = '));
  n.appendChild(f(fmtInt(m.comb2)));
  n.appendChild(document.createTextNode(' codes alpha-2 possibles, occupés à '));
  n.appendChild(f(fmt(m.occ2) + ' %'));
  n.appendChild(document.createTextNode(' ; 26 × 26 × 26 = '));
  n.appendChild(f(fmtInt(m.comb3)));
  n.appendChild(document.createTextNode(' codes alpha-3 possibles, occupés à '));
  n.appendChild(f(fmt(m.occ3) + ' %'));
  n.appendChild(document.createTextNode('. Le code numérique, indépendant de l\'alphabet, complète les deux codes de lettres.'));
}

/* ---------- Recherche de pays (E097-07) ---------- */
function updateSearchOut() {
  const n = S.nodes.searchOut;
  if (!n) return;
  if (!S.query) { n.textContent = 'Saisissez un nom de pays ou un code ISO.'; return; }
  const i = cherche(S.query);
  if (i < 0) { n.textContent = 'Aucun pays trouvé pour « ' + S.query + ' ».'; return; }
  const p = PAYS[i];
  n.textContent = 'Réponse : ' + p[0] + ' → ' + p[1] + ' / ' + p[2] + ' / ' + p[3];
}

/* ---------- Badge textuel sur la carte existante (E097-09) ---------- */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function' ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  /* Le badge est absolu : il doit être ancré sur la carte, pas sur la page. */
  if (typeof getComputedStyle === 'function' && getComputedStyle(map).position === 'static') {
    map.style.position = 'relative';
  }
  const b = ctx.el('div', 'geography-e097-badge', '');
  b.id = BADGE_ID;
  map.appendChild(b);
}
function updateBadge() {
  const b = document.getElementById(BADGE_ID);
  if (!b) return;
  const p = PAYS[S.index];
  b.textContent = 'Norme ISO 3166-1 — ' + p[1] + ' / ' + p[2] + ' / ' + p[3] + ' (' + p[0] + ')';
}

function syncControls() {
  const n = S.nodes;
  if (n.a2) n.a2.checked = S.format === 'alpha2';
  if (n.a3) n.a3.checked = S.format === 'alpha3';
  if (n.num) n.num.checked = S.format === 'num';
  if (n.search && n.search.value !== S.query) n.search.value = S.query;
  if (n.legend) n.legend.textContent = LEGENDES[S.format];
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateSearchOut();
  updateReadout();
  updateBadge();
  drawLab();
}

/* ---------- E097-05 : unique boucle rAF, pause sur document.hidden ---------- */
function tick(ts) {
  S.rafId = 0;
  /* Pause réelle : aucune frame calculée quand l'onglet est masqué. */
  if (!S.playing || (typeof document !== 'undefined' && document.hidden)) return;
  if (!S.lastTs) S.lastTs = ts;
  const dt = Math.min(ts - S.lastTs, 80);
  S.lastTs = ts;
  S.sweep = (S.sweep + dt / SWEEP_MS) % 1;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function startSweep() {
  if (S.playing) return;
  S.playing = true;
  if (S.reduced) {
    /* Mouvement réduit : résultat final sans aucune boucle d'animation. */
    S.sweep = 1;
    return;
  }
  if (!S.rafId) S.rafId = requestAnimationFrame(tick);
}

function stopSweep() {
  S.playing = false;
  if (S.rafId) { cancelAnimationFrame(S.rafId); S.rafId = 0; }
  S.lastTs = 0;
}

function togglePlay() {
  if (S.playing) stopSweep();
  else startSweep();
  syncControls();
}

function installVisibility() {
  if (S.visibilityBound || typeof document === 'undefined') return;
  S.visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      /* Onglet masqué : on annule la boucle et on gèle l'horodatage. */
      if (S.rafId) { cancelAnimationFrame(S.rafId); S.rafId = 0; }
      S.lastTs = 0;
      return;
    }
    /* Retour : reprise sans saut et sans jamais créer une seconde boucle. */
    if (S.playing && !S.reduced && !S.rafId) S.rafId = requestAnimationFrame(tick);
  });
}

/* ---------- E097-10 : préférence de mouvement suivie en direct ---------- */
function installMotion() {
  if (S.motionBound || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  S.motionBound = true;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onChange = (e) => {
    S.reduced = !!e.matches;
    if (S.reduced) {
      if (S.rafId) { cancelAnimationFrame(S.rafId); S.rafId = 0; }
      S.lastTs = 0;
      if (S.playing) S.sweep = 1;
    } else if (S.playing && !S.rafId) {
      S.rafId = requestAnimationFrame(tick);
    }
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.setAttribute('data-geography-e097-reduced', S.reduced ? '1' : '0');
    syncControls();
  };
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
  else if (typeof mq.addListener === 'function') mq.addListener(onChange);
}

/* ---------- E097-03 / E097-07 / E097-08 : contrôles accessibles ---------- */
function bindEvents(n) {
  if (!n) return;
  [n.a2, n.a3, n.num].forEach((r) => {
    if (!r || r.dataset.e097Bound === '1') return;
    r.dataset.e097Bound = '1';
    r.addEventListener('change', () => {
      if (!r.checked) return;
      S.format = r.value;
      syncControls();
    });
  });
  if (n.search && n.search.dataset.e097Bound !== '1') {
    n.search.dataset.e097Bound = '1';
    n.search.addEventListener('input', () => {
      S.query = n.search.value;
      const i = cherche(S.query);
      if (i >= 0) S.index = i;
      syncControls();
    });
  }
  if (n.canvas && n.canvas.dataset.e097Bound !== '1') {
    n.canvas.dataset.e097Bound = '1';
    n.canvas.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let handled = false;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const order = ['alpha2', 'alpha3', 'num'];
        let k = order.indexOf(S.format);
        k = (k + (event.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length;
        S.format = order[k];
        handled = true;
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        S.index = (S.index + (event.key === 'ArrowDown' ? 1 : -1) + PAYS.length) % PAYS.length;
        handled = true;
      }
      if (handled) { event.preventDefault(); syncControls(); }
    });
  }
  if (n.play && n.play.dataset.e097Bound !== '1') {
    n.play.dataset.e097Bound = '1';
    n.play.addEventListener('click', togglePlay);
  }
}

/* ---------- E097-10 : point d'entrée, garde-fous et idempotence ---------- */
register('E097', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  ctx.css(CSS_ID, CSS);
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  installVisibility();
  installMotion();

  const n = ensurePanel(ctx);
  S.nodes = n;
  addMapBadge(ctx);
  bindEvents(n);

  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.setAttribute('data-geography-e097-reduced', S.reduced ? '1' : '0');

  /* Un rendu en mouvement réduit annule une boucle héritée d'un état antérieur. */
  if (S.reduced && S.rafId) { cancelAnimationFrame(S.rafId); S.rafId = 0; S.lastTs = 0; }
  syncControls();

  /* Reprend une boucle déjà en cours après un re-render, sans en créer une seconde. */
  if (S.playing && !S.reduced && !S.rafId) S.rafId = requestAnimationFrame(tick);
});
