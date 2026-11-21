import { register } from './registry.js';

/* Lentille E062 — vue GEOGRAPHIE.
 * Thème : légende interactive, bascule de couches.
 *
 * Les dix chantiers E062-01 … E062-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E062.md. Tout est local : aucune requête
 * réseau, aucun tirage aléatoire, aucune sortie de débogage, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (titres, paragraphes, tableau, légende, étiquettes) présent dans le DOM
 * même sans animation ni interaction ; le canvas n'est qu'un laboratoire
 * qui illustre des couches dessinées par des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e062';
const PANEL_ID = 'geography-e062-panel';
const TITLE_ID = 'geography-e062-title';
const TABLE_ID = 'geography-e062-table';
const LEGEND_ID = 'geography-e062-legend';
const CANVAS_ID = 'geography-e062-canvas';
const READOUT_ID = 'geography-e062-readout';
const ORDER_ID = 'geography-e062-order';
const SOLO_ID = 'geography-e062-solo-note';
const OPACITY_ID = 'geography-e062-opacity';
const OPACITY_OUT_ID = 'geography-e062-opacity-value';
const PLAY_ID = 'geography-e062-play';

/* Référentiel des cinq couches. Le poids est une complexité visuelle
   conventionnelle, servant uniquement au calcul de densité comparée. */
const LAYERS = [
  { id: 'relief', nom: 'Relief', code: 'Hachures diagonales', glyphe: '╱╱╱', poids: 3, graine: 101 },
  { id: 'hydro', nom: 'Hydrographie', code: 'Tirets ondulés', glyphe: '– – –', poids: 2, graine: 211 },
  { id: 'routes', nom: 'Routes', code: 'Pointillés réguliers', glyphe: '· · ·', poids: 2, graine: 307 },
  { id: 'villes', nom: 'Villes', code: 'Carrés à croix', glyphe: '■', poids: 1, graine: 401 },
  { id: 'limites', nom: 'Limites', code: 'Trait plein épais + gradins', glyphe: '━ ┃', poids: 2, graine: 509 },
];
const BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
const REF_IDS = ['relief', 'hydro', 'villes'];
const REF_WEIGHT = REF_IDS.reduce((s, id) => s + BY_ID[id].poids, 0);

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  visible: { relief: true, hydro: true, routes: false, villes: true, limites: false },
  order: ['relief', 'hydro', 'routes', 'villes', 'limites'],
  solo: null,
  opacity: 100,
  active: 'relief',
  playing: true,
  reduced: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  bound: false,
  nodes: {},
};

/* ---------- Outils déterministes ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* Hachage entier pur : même résultat à chaque rendu, sans graine tirée au hasard. */
function hash01(seed, i) {
  let x = (seed ^ Math.imul(i + 1, 2654435761)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function estAffiche(id) {
  return S.solo ? S.solo === id : !!S.visible[id];
}

function visibles() {
  return S.order.filter(estAffiche);
}

function poidsVisible() {
  return visibles().reduce((s, id) => s + BY_ID[id].poids, 0);
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e062-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e062-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e062-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e062-panel p{margin:5px 0;max-width:68ch}
#geography-e062-panel .geography-e062-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e062-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e062-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e062-table th,#geography-e062-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e062-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e062-legend{border:1px solid var(--line);border-radius:8px;margin:10px 0;padding:8px}
#geography-e062-legend legend{padding:0 5px;color:var(--muted)}
.geography-e062-row{
  display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-height:38px;
  padding:3px 4px;border-bottom:1px dashed var(--line);
}
.geography-e062-row:last-child{border-bottom:0}
.geography-e062-row[data-actif="1"]{background:rgba(230,185,111,.10);border-radius:5px}
.geography-e062-legend-item{
  display:flex;align-items:center;gap:5px;flex:1 1 190px;min-width:0;cursor:pointer;
}
.geography-e062-legend-item input{
  width:18px;height:18px;min-width:18px;accent-color:var(--gold,#e6b96f);
}
.geography-e062-swatch{
  display:inline-block;min-width:40px;padding:0 3px;border:1px solid var(--line);
  border-radius:4px;font-family:monospace;font-size:10px;white-space:nowrap;
  color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums;
}
.geography-e062-nom{min-width:78px;font-weight:600}
.geography-e062-code{color:var(--muted);font-size:10px}
.geography-e062-etat{font-size:10px;color:var(--ink-soft,#d7d1c6)}
.geography-e062-row button{
  min-width:36px;min-height:36px;padding:4px 7px;border:1px solid var(--line);
  border-radius:7px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;
}
.geography-e062-row button:hover:not(:disabled){border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.geography-e062-row button:disabled{opacity:.4;cursor:not-allowed}
.geography-e062-row button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.20);
}
.geography-e062-btn{
  min-height:44px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;
}
#geography-e062-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e062-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e062-opacity{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e062-opacity-value{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e062-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e062-readout,#geography-e062-order,#geography-e062-solo-note{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e062-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e062-panel[data-reduit="1"] .geography-e062-swatch,
#geography-e062-panel[data-reduit="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e062-panel button,#geography-e062-panel .geography-e062-swatch{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  #geography-e062-panel{font-size:10px;padding:9px}
  #geography-e062-canvas{height:190px}
  .geography-e062-row{gap:3px}
  .geography-e062-nom{min-width:68px}
}
`;

/* ---------- E062-01 : texte sémantique lisible sans interaction ---------- */

function buildFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une légende n’est pas une simple liste d’étiquettes : elle décrit les variables visuelles (trait, hachure, pointillé, symbole) qui distinguent les couches d’une carte.',
    'Une couche est un thème indépendant — relief, hydrographie, routes, villes, limites — que l’on peut afficher ou masquer sans modifier les autres.',
    'L’ordre de superposition compte autant que la visibilité : une couche dessinée après une autre peut la recouvrir partiellement.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e062-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E062-02 : tableau de référence statique ---------- */

function buildTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Référentiel des cinq couches. Référence : la vue de base affiche le Relief, l’Hydrographie et les Villes, soit un poids de 6.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Couche', 'Variable visuelle', 'Poids', 'Visibilité initiale'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  LAYERS.forEach((l) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = l.nom;
    tr.appendChild(th);
    [l.code, String(l.poids), S.visible[l.id] ? 'Affichée' : 'Masquée'].forEach((v) => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E062-03 et E062-07 : légende interactive et pile ---------- */

function buildLegend(ctx) {
  const fieldset = document.createElement('fieldset');
  fieldset.id = LEGEND_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Légende interactive — cochez une couche pour l’afficher, décochez pour la masquer';
  fieldset.appendChild(legend);

  LAYERS.forEach((l) => {
    const row = ctx.el('div', 'geography-e062-row');
    row.dataset.layer = l.id;

    const label = ctx.el('label', 'geography-e062-legend-item');
    label.setAttribute('for', `geography-e062-cb-${l.id}`);

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `geography-e062-cb-${l.id}`;
    cb.checked = !!S.visible[l.id];
    cb.value = l.id;

    const swatch = ctx.el('span', 'geography-e062-swatch', l.glyphe);
    swatch.setAttribute('aria-hidden', 'true');
    const nom = ctx.el('span', 'geography-e062-nom', l.nom);
    const code = ctx.el('span', 'geography-e062-code', l.code);
    const etat = ctx.el('span', 'geography-e062-etat', '');
    etat.id = `geography-e062-etat-${l.id}`;
    label.append(cb, swatch, nom, code, etat);

    const up = ctx.el('button', '', '▲');
    up.type = 'button';
    up.id = `geography-e062-up-${l.id}`;
    up.setAttribute('aria-label', `Monter la couche ${l.nom} dans l’ordre de superposition`);

    const down = ctx.el('button', '', '▼');
    down.type = 'button';
    down.id = `geography-e062-down-${l.id}`;
    down.setAttribute('aria-label', `Descendre la couche ${l.nom} dans l’ordre de superposition`);

    const solo = ctx.el('button', '', 'Isoler');
    solo.type = 'button';
    solo.id = `geography-e062-solo-${l.id}`;
    solo.setAttribute('aria-label', `Isoler la couche ${l.nom}, ou quitter l’isolation`);
    solo.setAttribute('aria-pressed', 'false');

    row.append(label, up, down, solo);
    fieldset.appendChild(row);
  });

  return fieldset;
}

/* ---------- Collecte des nœuds (tableau de référence du panneau) ---------- */

function collect() {
  const n = {};
  n.panel = document.getElementById(PANEL_ID);
  n.canvas = document.getElementById(CANVAS_ID);
  n.readout = document.getElementById(READOUT_ID);
  n.order = document.getElementById(ORDER_ID);
  n.soloNote = document.getElementById(SOLO_ID);
  n.opacity = document.getElementById(OPACITY_ID);
  n.opacityOut = document.getElementById(OPACITY_OUT_ID);
  n.play = document.getElementById(PLAY_ID);
  n.tout = document.getElementById('geography-e062-tout');
  n.rien = document.getElementById('geography-e062-rien');
  n.ref = document.getElementById('geography-e062-ref');
  n.cb = {};
  n.etat = {};
  n.up = {};
  n.down = {};
  n.solo = {};
  n.row = {};
  LAYERS.forEach((l) => {
    n.cb[l.id] = document.getElementById(`geography-e062-cb-${l.id}`);
    n.etat[l.id] = document.getElementById(`geography-e062-etat-${l.id}`);
    n.up[l.id] = document.getElementById(`geography-e062-up-${l.id}`);
    n.down[l.id] = document.getElementById(`geography-e062-down-${l.id}`);
    n.solo[l.id] = document.getElementById(`geography-e062-solo-${l.id}`);
    n.row[l.id] = n.panel && n.panel.querySelector(`[data-layer="${l.id}"]`);
  });
  return n;
}

/* ---------- E062-04 : commandes globales ---------- */

function buildGlobalControls(ctx) {
  const wrap = ctx.el('div', 'geography-e062-commandes');
  const tout = ctx.el('button', 'geography-e062-btn', 'Tout afficher');
  tout.type = 'button';
  tout.id = 'geography-e062-tout';
  const rien = ctx.el('button', 'geography-e062-btn', 'Tout masquer');
  rien.type = 'button';
  rien.id = 'geography-e062-rien';
  const ref = ctx.el('button', 'geography-e062-btn', 'Vue de référence');
  ref.type = 'button';
  ref.id = 'geography-e062-ref';
  wrap.append(tout, rien, ref);
  return wrap;
}

/* ---------- E062-08 : opacité et isolation ---------- */

function buildOpacity(ctx) {
  const wrap = ctx.el('div', 'geography-e062-opacite');
  const label = document.createElement('label');
  label.setAttribute('for', OPACITY_ID);
  label.appendChild(document.createTextNode('Opacité des couches : '));
  const out = document.createElement('span');
  out.id = OPACITY_OUT_ID;
  label.appendChild(out);
  const range = document.createElement('input');
  range.type = 'range';
  range.id = OPACITY_ID;
  range.min = '20';
  range.max = '100';
  range.step = '10';
  range.value = String(S.opacity);
  range.setAttribute('aria-label', 'Opacité des couches, de 20 à 100 pour cent');
  wrap.append(label, range);
  return wrap;
}

/* ---------- Construction du panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (!existant || !existant.isConnected) {
    const panel = ctx.el('section', 'geography-e062-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = ctx.el('h2', '', 'Légende interactive et bascule de couches');
    title.id = TITLE_ID;
    const lead = ctx.el('p', '', 'Une carte thématique se lit couche par couche. La légende ci-dessous n’est pas décorative : chaque case commande réellement le dessin, et l’ordre des lignes commande l’ordre de superposition.');

    const hFait = ctx.el('h3', '', 'Trois principes de lecture');
    const hRef = ctx.el('h3', '', 'Couches de référence');
    const hLeg = ctx.el('h3', '', 'Afficher, masquer, réordonner');
    const legend = buildLegend(ctx);
    const globalControls = buildGlobalControls(ctx);
    const opacity = buildOpacity(ctx);

    const hLab = ctx.el('h3', '', 'Laboratoire : la carte reconstruite');
    const canvas = document.createElement('canvas');
    canvas.id = CANVAS_ID;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Carte schématique à cinq couches. Flèches gauche et droite : changer la couche mise en évidence. Début et Fin : première et dernière couche. Entrée : isoler ou quitter l’isolation.');

    const order = ctx.el('p', 'geography-e062-order');
    order.id = ORDER_ID;
    const soloNote = ctx.el('p', 'geography-e062-solo-note');
    soloNote.id = SOLO_ID;
    const readout = ctx.el('p', 'geography-e062-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');

    const play = ctx.el('button', 'geography-e062-btn', S.playing ? '■ Arrêter la mise en évidence animée' : '▶ Animer la mise en évidence');
    play.type = 'button';
    play.id = PLAY_ID;
    play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

    panel.append(title, lead, hFait, buildFacts(), hRef, buildTable(),
      hLeg, legend, globalControls, opacity, hLab, canvas,
      order, soloNote, readout, play);

    const host = ctx.layout || ctx.stage;
    const aside = host && typeof host.querySelector === 'function'
      ? (host.querySelector('.geo-panel') || host)
      : ctx.stage;
    aside.insertBefore(panel, aside.firstChild);
  }
  return collect();
}

/* ---------- E062-05 : dessin déterministe des couches ---------- */

function drawBase(g, w, h, pad) {
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  g.strokeStyle = 'rgba(214,207,193,.10)';
  for (let k = 1; k < 6; k += 1) {
    const x = pad + ((w - pad * 2) * k) / 6;
    const y = pad + ((h - pad * 2) * k) / 6;
    g.beginPath();
    g.moveTo(x, pad); g.lineTo(x, h - pad);
    g.moveTo(pad, y); g.lineTo(w - pad, y);
    g.stroke();
  }
}

function drawRelief(g, w, h, pad) {
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.4;
  g.setLineDash([]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let i = 0; i < 6; i += 1) {
    const cx = pad + 30 + hash01(101, i) * (iw - 60);
    const cy = pad + 26 + hash01(102, i) * (ih - 52);
    const r = 10 + hash01(103, i) * 13;
    for (let j = 0; j < 3; j += 1) {
      g.beginPath();
      g.arc(cx, cy, r - j * 3.2, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(cx - r, cy + 2); g.lineTo(cx + r, cy + 2);
    g.stroke();
  }
}

function drawHydro(g, w, h, pad) {
  g.strokeStyle = 'rgba(214,207,193,.85)';
  g.lineWidth = 1.4;
  if (g.setLineDash) g.setLineDash([6, 4]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let k = 0; k < 3; k += 1) {
    const base = pad + ih * (0.25 + k * 0.25);
    const phase = hash01(211, k) * 6.28;
    g.beginPath();
    for (let step = 0; step <= 40; step += 1) {
      const t = step / 40;
      const x = pad + t * iw;
      const y = base + Math.sin(t * 9 + phase) * 7;
      if (step === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);
}

function drawRoutes(g, w, h, pad) {
  g.strokeStyle = 'rgba(244,214,158,.8)';
  g.lineWidth = 1.6;
  if (g.setLineDash) g.setLineDash([2, 4]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let k = 0; k < 2; k += 1) {
    const x0 = pad + iw * (0.18 + k * 0.36);
    const y0 = pad + ih * (0.10 + k * 0.18);
    g.beginPath();
    g.moveTo(x0, pad + ih * 0.92);
    g.lineTo(x0 + iw * 0.06, pad + ih * 0.55);
    g.lineTo(x0 + iw * 0.02, y0);
    g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);
}

function drawVilles(g, w, h, pad) {
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let i = 0; i < 8; i += 1) {
    const x = pad + 24 + hash01(401, i) * (iw - 48);
    const y = pad + 20 + hash01(402, i) * (ih - 40);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillRect(x - 3, y - 3, 6, 6);
    g.strokeStyle = 'rgba(8,12,18,.9)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x + 6, y);
    g.moveTo(x, y - 6); g.lineTo(x, y + 6);
    g.stroke();
  }
}

function drawLimites(g, w, h, pad) {
  g.strokeStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 2.5;
  g.setLineDash([]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let k = 0; k < 2; k += 1) {
    const x = pad + iw * (0.4 + k * 0.28);
    g.beginPath();
    g.moveTo(x, pad + 4);
    g.lineTo(x + (k ? -8 : 6), pad + ih * 0.5);
    g.lineTo(x + (k ? 4 : -4), pad + ih - 4);
    g.stroke();
    for (let t = 1; t < 7; t += 1) {
      const y = pad + (ih * t) / 7;
      g.beginPath();
      g.moveTo(x - 4, y); g.lineTo(x + 4, y);
      g.stroke();
    }
  }
}

const DRAWERS = {
  relief: drawRelief, hydro: drawHydro, routes: drawRoutes,
  villes: drawVilles, limites: drawLimites,
};

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);
  const pad = 16;
  drawBase(g, cssW, cssH, pad);

  /* L'ordre de la pile est respecté : le dernier dessiné est au-dessus. */
  S.order.forEach((id) => {
    if (!estAffiche(id)) return;
    g.save();
    g.globalAlpha = S.opacity / 100;
    DRAWERS[id](g, cssW, cssH, pad);
    g.restore();
  });

  /* Mise en évidence : cadre en pointillés, jamais la couleur seule. */
  const pulse = S.reduced ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(S.phase));
  g.save();
  g.globalAlpha = pulse;
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.setLineDash([6, 4]);
  g.strokeRect(pad - 5, pad - 5, cssW - (pad - 5) * 2, cssH - (pad - 5) * 2);
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`Mise en évidence : ${BY_ID[S.active].nom} — ${estAffiche(S.active) ? 'affichée' : 'masquée'}`, pad + 2, pad + 13);
  g.restore();
}

/* ---------- E062-06 : grandeurs chiffrées et référence ---------- */

function updateReadout() {
  const n = S.nodes;
  if (!n || !n.readout) return;
  const ids = visibles();
  const poids = poidsVisible();
  const densite = REF_WEIGHT ? poids / REF_WEIGHT : 0;
  const fort = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    return s;
  };
  const p = n.readout;
  p.textContent = '';
  p.appendChild(document.createTextNode('Couches affichées : '));
  p.appendChild(fort(`${ids.length} sur ${LAYERS.length}`));
  p.appendChild(document.createTextNode(' (référence : '));
  p.appendChild(fort(String(REF_IDS.length)));
  p.appendChild(document.createTextNode('). Densité visuelle : '));
  p.appendChild(fort(`${fmt(densite)}×`));
  p.appendChild(document.createTextNode(' la vue de référence, soit un poids de '));
  p.appendChild(fort(`${poids} sur ${REF_WEIGHT}`));
  p.appendChild(document.createTextNode('. Opacité : '));
  p.appendChild(fort(`${S.opacity} %`));
  p.appendChild(document.createTextNode('. Couche mise en évidence : '));
  p.appendChild(fort(BY_ID[S.active].nom));
  p.appendChild(document.createTextNode('. '));
  p.appendChild(document.createTextNode(S.solo
    ? `Isolation active : ${BY_ID[S.solo].nom} ; les quatre autres couches sont temporairement masquées.`
    : 'Aucune isolation : la bascule de chaque couche est indépendante.'));

  if (n.order) {
    n.order.textContent = 'Ordre de superposition (du fond vers le dessus) : '
      + S.order.map((id) => `${BY_ID[id].nom} (${estAffiche(id) ? 'affichée' : 'masquée'})`).join(' → ') + '.';
  }
  if (n.soloNote) {
    n.soloNote.textContent = S.solo
      ? `Isolation : ${BY_ID[S.solo].nom} uniquement. La vue de référence reste disponible par le bouton dédié.`
      : 'Isolation : aucune. Utilisez « Isoler » sur une ligne pour n’afficher que cette couche.';
  }
  for (let i = 0; i < LAYERS.length; i += 1) {
    const id = LAYERS[i].id;
    if (n.cb[id]) n.cb[id].checked = !!S.visible[id];
    if (n.etat[id]) n.etat[id].textContent = estAffiche(id) ? 'affiché' : 'masqué';
    if (n.solo[id]) n.solo[id].setAttribute('aria-pressed', S.solo === id ? 'true' : 'false');
    if (n.row[id]) n.row[id].dataset.actif = S.active === id ? '1' : '0';
    const pos = S.order.indexOf(id);
    if (n.up[id]) n.up[id].disabled = pos <= 0;
    if (n.down[id]) n.down[id].disabled = pos >= S.order.length - 1;
  }
  if (n.opacityOut) n.opacityOut.textContent = `${S.opacity} %`;
  if (n.opacity) n.opacity.value = String(S.opacity);
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la mise en évidence animée' : '▶ Animer la mise en évidence';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  drawLab();
}

/* ---------- E062-07 : réordonnancement de la pile ---------- */

function deplacer(id, pas) {
  const i = S.order.indexOf(id);
  const j = i + pas;
  if (i < 0 || j < 0 || j >= S.order.length) return;
  const tmp = S.order[i];
  S.order[i] = S.order[j];
  S.order[j] = tmp;
  updateReadout();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

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
  if (S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.004) % (Math.PI * 2);
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.reduit = S.reduced ? '1' : '0';
        if (S.reduced) stopLoop(); else startLoop();
        drawLab();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E062-09 : synchronisation légende / canvas / clavier ---------- */

function bindEvents() {
  const n = S.nodes;
  if (S.bound || !n.panel) return;
  S.bound = true;

  LAYERS.forEach((l) => {
    const cb = n.cb[l.id];
    if (cb) cb.addEventListener('change', () => {
      if (S.solo === l.id) S.solo = null;
      S.visible[l.id] = cb.checked;
      S.active = l.id;
      updateReadout();
    });
    if (n.up[l.id]) n.up[l.id].addEventListener('click', () => deplacer(l.id, -1));
    if (n.down[l.id]) n.down[l.id].addEventListener('click', () => deplacer(l.id, 1));
    if (n.solo[l.id]) n.solo[l.id].addEventListener('click', () => {
      S.solo = S.solo === l.id ? null : l.id;
      S.active = l.id;
      updateReadout();
    });
    if (n.row[l.id]) {
      n.row[l.id].addEventListener('mouseenter', () => { S.active = l.id; updateReadout(); });
      n.row[l.id].addEventListener('focusin', () => { S.active = l.id; updateReadout(); });
    }
  });

  if (n.tout) n.tout.addEventListener('click', () => {
    LAYERS.forEach((l) => { S.visible[l.id] = true; });
    S.solo = null;
    updateReadout();
  });
  if (n.rien) n.rien.addEventListener('click', () => {
    LAYERS.forEach((l) => { S.visible[l.id] = false; });
    S.solo = null;
    updateReadout();
  });
  if (n.ref) n.ref.addEventListener('click', () => {
    LAYERS.forEach((l) => { S.visible[l.id] = REF_IDS.indexOf(l.id) >= 0; });
    S.solo = null;
    S.order = ['relief', 'hydro', 'routes', 'villes', 'limites'];
    S.opacity = 100;
    S.active = 'relief';
    updateReadout();
  });
  if (n.opacity) n.opacity.addEventListener('input', () => {
    S.opacity = Math.max(20, Math.min(100, Math.round(Number(n.opacity.value) / 10) * 10));
    updateReadout();
  });
  if (n.play) n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (S.playing) startLoop(); else stopLoop();
    updateReadout();
  });
  if (n.canvas) n.canvas.addEventListener('keydown', (event) => {
    const liste = visibles().length ? visibles() : S.order;
    const i = liste.indexOf(S.active);
    let used = true;
    if (event.key === 'ArrowRight') S.active = liste[(i + 1 + liste.length) % liste.length];
    else if (event.key === 'ArrowLeft') S.active = liste[(i - 1 + liste.length) % liste.length];
    else if (event.key === 'Home') S.active = liste[0];
    else if (event.key === 'End') S.active = liste[liste.length - 1];
    else if (event.key === 'Enter') S.solo = S.solo === S.active ? null : S.active;
    else used = false;
    if (used) {
      event.preventDefault();
      updateReadout();
    }
  });
}

/* ---------- Point d'entrée ---------- */

register('E062', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) {
    S.playing = false;
    stopLoop();
  }
  if (S.nodes.panel) S.nodes.panel.dataset.reduit = S.reduced ? '1' : '0';

  updateReadout();
  bindEvents();
  installGlobalListeners();
  startLoop();
});
