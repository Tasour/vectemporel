import { register } from './registry.js';

/* V2 — lentille E068 (vague GEOGRAPHIE V2).
 * Thème : résolution et confusion des pictogrammes de lieux.
 *
 * Les dix chantiers E068-01 … E068-10 sont RÉELLEMENT implémentés ici :
 *   01 section sémantique isolée + CSS préfixé, lisible sans JS, idempotente ;
 *   02 rastérisation analytique déterministe des cinq formes sur une grille N×N ;
 *   03 distance de Hamming entre les dix paires + seuil de confusion explicite ;
 *   04 référence 32 px (0 paire confondable) et grandeurs relatives recalculées ;
 *   05 tableau de mesures et formule en texte (cinq grandeurs chiffrées) ;
 *   06 laboratoire canvas déterministe (quadrillage, hachures, DPR ≤ 2, graine) ;
 *   07 résolutions en radiogroupe à choix unique, cibles ≥ 36 px, focus visible ;
 *   08 repères non chromatiques (hachures, libellés, légende, forced-colors) ;
 *   09 balayage de résolution en une boucle rAF, pause sur document.hidden,
 *      reducedMotion() ;
 *   10 réversibilité, garde-fous d'état et limite falsifiable en cinq temps.
 *
 * La passe 1 (src/views/geography/E068.js) portait sur les pixels par trait.
 * La passe 2 ne la remplace pas : elle ajoute une question complémentaire et
 * mesurable — à quelle résolution deux pictogrammes distincts deviennent-ils
 * indiscernables sur une grille de pixels ? Tout est local : aucune requête
 * réseau, aucune graine imprévisible, aucun appel de journalisation, aucun
 * fichier partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (titres, paragraphes, code, table, fieldset, liste) présent dans le DOM dès
 * la construction ; le canvas n'est qu'un laboratoire dont chaque grandeur est
 * aussi écrite en toutes lettres dans le readout et dans le tableau.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e068-) ---------- */

const CSS_ID = 'geography-v2-e068';
const PANEL_ID = 'geography-v2-e068-panel';
const TITLE_ID = 'geography-v2-e068-title';
const FAIT_CLASS = 'geography-v2-e068-fait';
const FORMULE_ID = 'geography-v2-e068-formule';
const TABLE_ID = 'geography-v2-e068-table';
const READOUT_ID = 'geography-v2-e068-readout';
const STATUS_ID = 'geography-v2-e068-status';
const RES_ID = 'geography-v2-e068-res';
const RES_NAME = 'geography-v2-e068-resolution';
const CHOIX_CLASS = 'geography-v2-e068-choix';
const CANVAS_ID = 'geography-v2-e068-canvas';
const ACTIONS_ID = 'geography-v2-e068-actions';
const PLAY_ID = 'geography-v2-e068-play';
const RESET_ID = 'geography-v2-e068-reset';
const LIMITE_ID = 'geography-v2-e068-limite';
const DEFI_ID = 'geography-v2-e068-defi';

/* ---------- Modèle pédagogique explicite (conventions affichées) ---------- */

const SEED = 0xE068;      // graine du grain de numérisation, affichée en texte
const SEUIL = 12;         // cellules distinctives au plus => paire confondable
const REF_N = 32;         // grille de référence : aucune paire confondable
const SWEEP_MIN = 8;
const SWEEP_MAX = 32;
const SWEEP_MS = 2600;

const RESOLUTIONS = [
  { key: 'grossier', label: '8 px — grossier', n: 8 },
  { key: 'moyen', label: '16 px — moyen', n: 16 },
  { key: 'reference', label: '32 px — référence', n: 32 },
];

/* Cinq catégories de lieux, cinq marques géométriques distinctes. */
const FORMES = [
  { key: 'carre', nom: 'Ville', forme: 'Carré' },
  { key: 'triangleBas', nom: 'Port', forme: 'Triangle vers le bas' },
  { key: 'losange', nom: 'Aéroport', forme: 'Losange' },
  { key: 'triangleHaut', nom: 'Montagne', forme: 'Triangle vers le haut' },
  { key: 'croix', nom: 'Lieu de culte', forme: 'Croix' },
];

/* Les dix paires non ordonnées des cinq formes (5 × 4 / 2 = 10). */
const PAIRS = [];
for (let a = 0; a < FORMES.length; a += 1) {
  for (let b = a + 1; b < FORMES.length; b += 1) PAIRS.push({ a: FORMES[a], b: FORMES[b] });
}

/* État de module : survit au vidage du conteneur lors d'un nouveau rendu. */
const S = {
  ctx: null,
  n: 16,
  pair: 0,
  playing: false,
  sweep: (16 - SWEEP_MIN) / (SWEEP_MAX - SWEEP_MIN),
  lastTs: 0,
  rafId: 0,
  model: null,
  cache: new Map(),
  dom: {},
  visibilityBound: false,
  motionBound: false,
};

/* ---------- Utilitaires déterministes (aucun aléa) ---------- */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function fmt0(value) {
  if (!Number.isFinite(value)) return '—';
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function fmt1(value) {
  if (!Number.isFinite(value)) return '—';
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
}

/* Graine affichée : le grain du laboratoire est fixé une fois pour toutes,
 * donc reproductible à l'identique, sans tirage imprévisible. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grainRnd = mulberry32(SEED);
const GRAIN = Array.from({ length: 72 }, () => ({ u: grainRnd(), v: grainRnd() }));

/* ---------- [E068-02] Géométrie et rastérisation analytique ---------- */

function cross(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

function inTriangle(px, py, a, b, c) {
  const d1 = cross(a[0], a[1], b[0], b[1], px, py);
  const d2 = cross(b[0], b[1], c[0], c[1], px, py);
  const d3 = cross(c[0], c[1], a[0], a[1], px, py);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/* Appartenance d'un point (u,v) de la boîte normalisée [0,1]² à une marque.
 * Purement analytique : aucun pixel n'est lu sur la carte, aucune donnée
 * extérieure n'est chargée. */
function inside(key, u, v) {
  const x = u - 0.5;
  const y = v - 0.5;
  if (key === 'carre') return Math.abs(x) <= 0.36 && Math.abs(y) <= 0.36;
  if (key === 'losange') return Math.abs(x) + Math.abs(y) <= 0.40;
  if (key === 'croix') {
    return (Math.abs(x) <= 0.13 && Math.abs(y) <= 0.40)
      || (Math.abs(y) <= 0.13 && Math.abs(x) <= 0.40);
  }
  if (key === 'triangleBas') return inTriangle(u, v, [0.12, 0.12], [0.88, 0.12], [0.5, 0.88]);
  if (key === 'triangleHaut') return inTriangle(u, v, [0.12, 0.88], [0.88, 0.88], [0.5, 0.12]);
  return false;
}

/* Une cellule (i,j) est occupée si son centre (i+0,5)/N, (j+0,5)/N est dans
 * la forme. Le résultat est une grille binaire, donc reproductible. */
function raster(n) {
  const grid = {};
  FORMES.forEach((f) => {
    const cells = new Uint8Array(n * n);
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        cells[j * n + i] = inside(f.key, (i + 0.5) / n, (j + 0.5) / n) ? 1 : 0;
      }
    }
    grid[f.key] = cells;
  });
  return grid;
}

/* ---------- [E068-03 / E068-04] Distances et grandeurs relatives ---------- */

function computeModel(n) {
  const size = clamp(Math.round(n), SWEEP_MIN, SWEEP_MAX);
  const cached = S.cache.get(size);
  if (cached) return cached;

  const grid = raster(size);
  const pairs = PAIRS.map((pr) => {
    let diff = 0;
    for (let k = 0; k < size * size; k += 1) {
      if (grid[pr.a.key][k] !== grid[pr.b.key][k]) diff += 1;
    }
    return { a: pr.a, b: pr.b, diff, confondable: diff <= SEUIL };
  });
  const diffs = pairs.map((p) => p.diff);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  const avg = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
  const closest = pairs.reduce((best, p) => (p.diff < best.diff ? p : best), pairs[0]);
  const confus = pairs.filter((p) => p.confondable).length;

  const model = {
    n: size,
    grid,
    pairs,
    min,
    max,
    avg,
    closest,
    confus,
    taux: (confus / PAIRS.length) * 100,
  };
  S.cache.set(size, model);
  return model;
}

function refModel() {
  return computeModel(REF_N);
}

/* ---------- [E068-09] Pas de temps et résolution affichée ---------- */

function effN() {
  if (!S.playing) return S.n;
  return clamp(Math.round(SWEEP_MIN + S.sweep * (SWEEP_MAX - SWEEP_MIN)), SWEEP_MIN, SWEEP_MAX);
}

function reduced() {
  if (S.ctx && typeof S.ctx.reducedMotion === 'function') return !!S.ctx.reducedMotion();
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* ---------- [E068-05 / E068-07] Tableau, formule et radiogroupe ---------- */

function renderTable() {
  const body = S.dom.tableBody;
  if (!body) return;
  const m = S.model;
  const ref = refModel();
  const robustesse = ref.min > 0 ? (m.min / ref.min) * 100 : 0;
  const rows = [
    ['Résolution de la grille', `${m.n} × ${m.n} cellules`],
    ['Paires confondables', `${m.confus} / ${PAIRS.length} (${fmt0(m.taux)} %) — référence 32 px : 0 / 10`],
    ['Distance minimale', `${fmt0(m.min)} cellules — référence ${fmt0(ref.min)} cellules`],
    ['Distance moyenne', `${fmt1(m.avg)} cellules — référence ${fmt1(ref.avg)} cellules`],
    ['Distance maximale', `${fmt0(m.max)} cellules`],
    ['Indice de robustesse', `${fmt1(robustesse)} % de la référence (distance minimale)`],
    ['Paire la plus proche', `${m.closest.a.nom} / ${m.closest.b.nom} — ${fmt0(m.closest.diff)} cellules distinctives`],
  ];
  body.replaceChildren(...rows.map(([label, value]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    return tr;
  }));
}

function updateReadout() {
  const node = S.dom.readout;
  if (!node) return;
  const m = S.model;
  const ref = refModel();
  const robustesse = ref.min > 0 ? (m.min / ref.min) * 100 : 0;
  node.textContent =
    `Grille ${m.n} × ${m.n} : ${m.confus} paire${m.confus > 1 ? 's' : ''} confondable${m.confus > 1 ? 's' : ''} sur ${PAIRS.length} `
    + `(${fmt0(m.taux)} % ; référence 32 px : 0 %). Distance minimale ${fmt0(m.min)} cellules contre ${fmt0(ref.min)} `
    + `à la référence, soit un indice de robustesse de ${fmt1(robustesse)} %. Distance moyenne ${fmt1(m.avg)} cellules. `
    + `Paire la plus proche : ${m.closest.a.nom} / ${m.closest.b.nom} (${fmt0(m.closest.diff)} cellules distinctives, seuil ${SEUIL} au plus).`;
}

function announce(message) {
  if (S.dom.status) S.dom.status.textContent = message;
}

function syncRadios() {
  (S.dom.radios || []).forEach(({ input, n }) => {
    const on = n === S.n && !S.playing;
    input.checked = on;
    input.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function syncPlayButton() {
  const btn = S.dom.play;
  if (!btn) return;
  btn.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
  btn.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
}

function refresh(message) {
  S.model = computeModel(effN());
  if (S.dom.panel) S.dom.panel.dataset.geographyV2E068Reduced = reduced() ? '1' : '0';
  renderTable();
  updateReadout();
  drawLab();
  if (message) announce(message);
}

/* ---------- [E068-06 / E068-08] Laboratoire canvas ---------- */

function drawGrid(g, cells, other, x, y, side, n) {
  const cell = side / n;
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.fillRect(x, y, side, side);

  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const k = j * n + i;
      if (cells[k]) {
        g.fillStyle = 'rgba(230,185,111,.80)';
        g.fillRect(x + i * cell, y + j * cell, cell, cell);
      }
      /* Hachures : repère non chromatique des cellules qui séparent les deux
       * formes. Présent sur les deux grilles, donc lisible en niveaux de gris. */
      if (other && cells[k] !== other[k]) {
        g.save();
        g.beginPath();
        g.rect(x + i * cell, y + j * cell, cell, cell);
        g.clip();
        g.strokeStyle = 'rgba(255,255,255,.92)';
        g.lineWidth = Math.max(0.6, Math.min(1.1, cell / 5));
        g.beginPath();
        g.moveTo(x + i * cell, y + (j + 1) * cell);
        g.lineTo(x + (i + 1) * cell, y + j * cell);
        g.stroke();
        g.restore();
      }
    }
  }

  g.strokeStyle = 'rgba(255,255,255,.11)';
  g.lineWidth = 0.5;
  g.beginPath();
  for (let i = 1; i < n; i += 1) {
    const px = x + i * cell;
    const py = y + i * cell;
    g.moveTo(px, y); g.lineTo(px, y + side);
    g.moveTo(x, py); g.lineTo(x + side, py);
  }
  g.stroke();

  g.strokeStyle = 'rgba(244,214,158,.72)';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, side - 1, side - 1);
}

function drawLab() {
  const cv = S.dom.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = Math.max(1, cv.clientWidth || 320);
  const cssH = Math.max(1, cv.clientHeight || 260);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const m = S.model;
  if (!m) return;
  const pr = PAIRS[S.pair];
  const n = m.n;
  const diff = m.pairs.find((p) => p.a.key === pr.a.key && p.b.key === pr.b.key);
  const distinct = diff ? diff.diff : 0;

  /* Grain de numérisation fixe (graine 0xE068 affichée) : decoration
   * reproductible, sans effet sur les grandeurs calculées plus haut. */
  g.fillStyle = 'rgba(255,255,255,.035)';
  GRAIN.forEach((p) => g.fillRect(6 + p.u * (cssW - 12), 6 + p.v * (cssH - 12), 1, 1));

  g.font = '11px system-ui, sans-serif';
  g.fillStyle = 'rgba(244,214,158,.96)';
  g.textAlign = 'left';
  g.fillText(`Grille ${n} × ${n} — ${pr.a.nom} / ${pr.b.nom}`, 10, 17);
  g.font = '10px system-ui, sans-serif';
  g.fillStyle = 'rgba(215,209,198,.82)';
  g.fillText(`${fmt0(distinct)} cellules distinctives — seuil : ${SEUIL} au plus`, 10, 32);

  const gap = 16;
  const pad = 10;
  const top = 40;
  const bottom = 46;
  const side = Math.max(24, Math.min((cssW - 2 * pad - gap) / 2, cssH - top - bottom));
  const startX = (cssW - (2 * side + gap)) / 2;
  const startY = top;

  const leftCells = m.grid[pr.a.key];
  const rightCells = m.grid[pr.b.key];
  drawGrid(g, leftCells, rightCells, startX, startY, side, n);
  drawGrid(g, rightCells, leftCells, startX + side + gap, startY, side, n);

  g.font = '10px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(230,185,111,.96)';
  g.fillText(`${pr.a.nom} — ${pr.a.forme}`, startX + side / 2, cssH - 26);
  g.fillText(`${pr.b.nom} — ${pr.b.forme}`, startX + side + gap + side / 2, cssH - 26);
  g.fillStyle = 'rgba(215,209,198,.82)';
  g.fillText('Hachures = cellules où les deux formes diffèrent — jamais la couleur seule', cssW / 2, cssH - 10);
}

/* ---------- [E068-09] Boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) {
    S.playing = false;
    syncPlayButton();
    syncRadios();
    announce('Balayage mis en pause : l’onglet est caché.');
    return;
  }
  const isReduced = reduced();
  if (S.lastTs && S.playing && !isReduced) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt / SWEEP_MS) % 1;
  }
  S.lastTs = ts;
  refresh();
  if (S.playing && !isReduced) S.rafId = requestAnimationFrame(tick);
  else if (S.playing && isReduced) {
    S.playing = false;
    S.n = effN();
    syncPlayButton();
    syncRadios();
    refresh('Mouvement réduit : balayage arrêté, résolution figée.');
  }
}

function installListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      if (!S.playing) return;
      stopLoop();
      S.playing = false;
      syncPlayButton();
      syncRadios();
      announce('Balayage mis en pause : l’onglet est caché.');
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        if (S.dom.panel) S.dom.panel.dataset.geographyV2E068Reduced = mq.matches ? '1' : '0';
        if (mq.matches && S.playing) {
          stopLoop();
          S.playing = false;
          S.n = effN();
          syncPlayButton();
          syncRadios();
          refresh('Préférence de mouvement réduit détectée : balayage arrêté.');
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- [E068-01] Feuille de style unique, isolée et préfixée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:72ch}
#${PANEL_ID} .${FAIT_CLASS}{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${FORMULE_ID}{
  display:block;margin:7px 0;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.22);color:var(--ink-soft,#d7d1c6);font-size:10px;
  line-height:1.7;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${RES_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${RES_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${CHOIX_CLASS}{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${CHOIX_CLASS} input{
  min-width:24px;min-height:24px;width:24px;height:24px;accent-color:var(--gold,#e6b96f);
}
#${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 6px}
#${PANEL_ID} button{
  min-height:44px;min-width:44px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible,#${RES_ID} input:focus-visible,#${CANVAS_ID}:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
#${CANVAS_ID}{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:manipulation;
}
#${READOUT_ID}{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
#${STATUS_ID}{margin:6px 0;color:var(--muted);font-variant-numeric:tabular-nums;min-height:14px}
#${LIMITE_ID}{margin:8px 0;padding:7px 9px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}
#${DEFI_ID}{margin:6px 0;padding-left:22px;color:var(--ink-soft,#d7d1c6)}
#${DEFI_ID} li{margin:3px 0}
#${PANEL_ID}[data-geography-v2-e068-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${PANEL_ID} button{min-height:44px}
  #${CANVAS_ID}{height:230px}
  #${PANEL_ID} .${CHOIX_CLASS}{margin-right:4px}
}
@media (forced-colors:active){
  #${PANEL_ID} button,#${CANVAS_ID}{border:1px solid CanvasText}
  #${READOUT_ID}{color:Highlight}
}
`;

/* ---------- Construction du panneau sémantique ---------- */

function buildPanel(ctx) {
  const panel = ctx.el('section', '');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  /* [E068-01] Tout le texte est un nœud DOM réel, présent dès la construction. */
  const title = ctx.el('h2', '', 'Résolution et confusion des pictogrammes de lieux');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(ctx.el('p', '',
    'Sur une carte, deux lieux distincts doivent rester reconnaissables même quand le symbole est réduit à quelques pixels. Ce panneau mesure cette robustesse : il rastérise cinq marques de lieux sur une grille carrée et compte les cellules qui les séparent. Il ne charge aucune donnée : chaque nombre est recalculé depuis le modèle géométrique affiché.'));

  panel.appendChild(ctx.el('p', FAIT_CLASS,
    'Un pictogramme de lieu est un signe visuel qui remplace un nom sur la carte : ville, port, aéroport, montagne ou lieu de culte. Sa forme porte la catégorie avant la couleur, ce qui le rend lisible en niveaux de gris.'));
  panel.appendChild(ctx.el('p', FAIT_CLASS,
    'À basse résolution, deux formes proches peuvent se confondre. On rastérise chaque marque sur une grille de N × N cellules : la distance entre deux formes est le nombre de cellules où elles diffèrent (distance de Hamming). Convention explicite : à 12 cellules distinctives ou moins, la paire est dite confondable.'));
  const ref = refModel();
  panel.appendChild(ctx.el('p', FAIT_CLASS,
    `Référence affichée : sur la grille de 32 × 32 px, aucune des 10 paires n’est confondable et la distance minimale vaut ${fmt0(ref.min)} cellules. Le grain de numérisation du laboratoire est fixé par la graine ${SEED.toString(16).toUpperCase()} : le dessin est reproductible, sans tirage imprévisible.`));

  /* [E068-05] Formule lisible en texte, jamais uniquement dans le canvas. */
  const formule = ctx.el('code', '',
    'cellule (i,j) occupée si son centre ((i+0,5)/N, (j+0,5)/N) appartient à la forme ; distance(A,B) = nombre de cellules où A et B diffèrent ; paire confondable si distance ≤ 12 ; taux de confusion = paires confondables / 10 ; référence = grille 32 px (0 paire confondable) ; indice de robustesse = distance minimale / distance minimale de référence.');
  formule.id = FORMULE_ID;
  panel.appendChild(formule);

  /* [E068-04 / E068-05] Tableau de mesures, rempli dès la construction. */
  const table = ctx.el('table', '');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Mesures de discrimination des pictogrammes (recalculées à chaque action)'));
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);
  const tableBody = document.createElement('tbody');
  table.appendChild(tableBody);
  panel.appendChild(table);

  /* [E068-07] Readout chiffré, région de statut polie. */
  const readout = ctx.el('p', '', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  /* [E068-07] Résolutions en radiogroupe (choix exclusif), pas aria-pressed. */
  const res = ctx.el('fieldset', '');
  res.id = RES_ID;
  res.setAttribute('role', 'radiogroup');
  res.appendChild(ctx.el('legend', '', 'Résolution de la grille (choix unique)'));
  const radios = [];
  RESOLUTIONS.forEach((r) => {
    const label = ctx.el('label', CHOIX_CLASS);
    const input = ctx.el('input', '');
    input.type = 'radio';
    input.name = RES_NAME;
    input.id = `${RES_ID}-${r.key}`;
    input.value = r.key;
    input.checked = r.n === S.n;
    input.setAttribute('role', 'radio');
    input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    input.addEventListener('change', () => {
      if (!input.checked) return;
      setResolution(r.n, `Grille ${r.n} × ${r.n} : relecture des mesures effectuée.`);
    });
    radios.push({ input, n: r.n, label: r.label });
    label.append(input, ctx.el('span', '', r.label));
    res.appendChild(label);
  });
  panel.appendChild(res);

  /* [E068-06 / E068-08] Laboratoire canvas : illustration seulement. */
  const canvas = ctx.el('canvas', '');
  canvas.id = CANVAS_ID;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('aria-label',
    'Deux grilles de pictogrammes de lieux, avec hachures sur les cellules où les formes diffèrent. Flèches gauche et droite : changer la résolution ; flèches haut et bas : changer la paire comparée ; Entrée : lancer ou arrêter le balayage ; Origine : revenir à la référence 32 px.');
  panel.appendChild(canvas);
  panel.appendChild(ctx.el('p', '',
    'Dans le laboratoire, chaque carré est une cellule de la grille ; les cases dorées sont occupées par la forme, les hachures signalent les cellules où les deux formes diffèrent. Les libellés sous les grilles nomment la catégorie et la forme : aucune information utile n’est portée par la seule couleur.'));
  panel.appendChild(ctx.el('p', '',
    'Équivalent clavier : avec le schéma sélectionné, les flèches gauche et droite parcourent les trois résolutions, les flèches haut et bas parcourent les dix paires, Entrée lance ou arrête le balayage et Origine revient à la référence 32 px.'));

  /* [E068-09] Commandes nommées, cibles confortables. */
  const actions = ctx.el('div', '');
  actions.id = ACTIONS_ID;
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.addEventListener('click', () => { togglePlay(); });
  const reset = ctx.el('button', '', 'Revenir à la référence 32 px');
  reset.type = 'button';
  reset.id = RESET_ID;
  reset.addEventListener('click', () => {
    setResolution(REF_N, 'Retour à la référence 32 px : aucune paire confondable.');
  });
  actions.append(play, reset);
  panel.appendChild(actions);

  /* [E068-07] Statut des actions, distinct du readout chiffré. */
  const status = ctx.el('p', '', 'Panneau prêt. Choisissez une résolution ou lancez le balayage.');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);

  /* [E068-10] Limite et défi falsifiable en cinq temps. */
  panel.appendChild(ctx.el('h3', '', 'Limite et angle mort'));
  const limite = ctx.el('p', '');
  limite.id = LIMITE_ID;
  limite.textContent = 'Le modèle est une convention géométrique sur une grille carrée parfaitement nette : il ne simule ni l’anticrénelage des traces vectorielles, ni la vision humaine réelle, ni la vision déficiente des couleurs. Un seuil de 12 cellules distinctives est un choix pédagogique affiché, pas une mesure perceptive validée en laboratoire.';
  panel.appendChild(limite);

  const defi = ctx.el('ol', '');
  defi.id = DEFI_ID;
  [
    'Prédiction : en passant de 32 px à 8 px, le nombre de paires confondables doit augmenter et la distance minimale doit chuter.',
    'Réglage : choisissez « 8 px — grossier », puis « 32 px — référence », ou lancez le balayage de résolution.',
    'Résultat attendu : à 8 px, la paire aéroport / lieu de culte descend à 4 cellules distinctives (2 paires confondables) ; à 32 px, aucune paire n’est confondable et le minimum remonte à 120 cellules.',
    'Falsification : si le taux de confusion reste identique à 8 et 32 px, ou si la distance minimale n’augmente pas avec la résolution, le modèle est en défaut.',
    'Débrief : cette expérience mesure une discrimination géométrique sur grille, pas la lisibilité perçue sur une carte réelle ; le seuil et les formes sont des conventions explicites.',
  ].forEach((text) => defi.appendChild(ctx.el('li', '', text)));
  panel.appendChild(defi);

  return { panel, tableBody, readout, status, radios, canvas, play };
}

/* ---------- [E068-09 / E068-10] Actions réversibles et garde-fous ---------- */

function setResolution(n, message) {
  stopLoop();
  S.playing = false;
  S.n = clamp(Math.round(n), SWEEP_MIN, SWEEP_MAX);
  S.sweep = (S.n - SWEEP_MIN) / (SWEEP_MAX - SWEEP_MIN);
  syncPlayButton();
  syncRadios();
  refresh(message);
}

function stepResolution(direction) {
  const idx = RESOLUTIONS.findIndex((r) => r.n === S.n);
  const base = idx < 0 ? 2 : idx;
  const next = RESOLUTIONS[(base + direction + RESOLUTIONS.length) % RESOLUTIONS.length];
  setResolution(next.n, `Résolution ${next.label} appliquée au clavier.`);
}

function stepPair(direction) {
  S.pair = (S.pair + direction + PAIRS.length) % PAIRS.length;
  const pr = PAIRS[S.pair];
  refresh(`Paire comparée : ${pr.a.nom} / ${pr.b.nom}.`);
}

function togglePlay() {
  if (S.playing) {
    stopLoop();
    S.playing = false;
    S.n = effN();
    S.sweep = (S.n - SWEEP_MIN) / (SWEEP_MAX - SWEEP_MIN);
    syncPlayButton();
    syncRadios();
    refresh('Balayage arrêté : les mesures sont figées sur la résolution affichée.');
    return;
  }
  if (reduced()) {
    /* Mouvement réduit : l'action devient un pas discret, jamais une animation. */
    stepResolution(1);
    announce('Mouvement réduit : balayage remplacé par un pas discret entre résolutions.');
    return;
  }
  if (typeof requestAnimationFrame !== 'function') {
    announce('Animation indisponible : utilisez les boutons de résolution.');
    return;
  }
  S.playing = true;
  syncPlayButton();
  syncRadios();
  announce('Balayage de la résolution lancé, de 8 à 32 pixels.');
  startLoop();
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E068', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout || ctx.stage;
  if (!layout) return;

  ctx.css(CSS_ID, CSS);
  installListeners();
  stopLoop();
  S.playing = false;

  S.ctx = ctx;
  S.model = computeModel(effN());

  const nodes = buildPanel(ctx);
  S.dom = {
    panel: nodes.panel,
    tableBody: nodes.tableBody,
    readout: nodes.readout,
    status: nodes.status,
    radios: nodes.radios,
    canvas: nodes.canvas,
    play: nodes.play,
  };
  S.dom.panel.dataset.geographyV2E068Reduced = reduced() ? '1' : '0';
  syncPlayButton();

  /* Équivalent clavier complet du laboratoire. */
  nodes.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft') stepResolution(-1);
    else if (event.key === 'ArrowRight') stepResolution(1);
    else if (event.key === 'ArrowUp') stepPair(-1);
    else if (event.key === 'ArrowDown') stepPair(1);
    else if (event.key === 'Enter' || event.key === ' ') togglePlay();
    else if (event.key === 'Home') setResolution(REF_N, 'Retour à la référence 32 px.');
    else used = false;
    if (used) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  /* Idempotence : une seule instance du panneau, même après plusieurs rendus. */
  const host = layout.querySelector ? (layout.querySelector('.geo-panel') || layout) : layout;
  const previous = host.querySelector ? host.querySelector(`#${PANEL_ID}`) : null;
  if (previous && previous !== nodes.panel) previous.remove();
  host.appendChild(nodes.panel);

  refresh('Panneau prêt : choisissez une résolution ou lancez le balayage.');
});
