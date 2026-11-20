import { register } from './registry.js';

/* Lentille E080 — vue GEOGRAPHIE.
 * Thème : étiquettes de lieux (placement, collisions, lisibilité).
 *
 * Les dix chantiers E080-01 … E080-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E080.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire (générateur linéaire à graine fixe), aucune
 * console, aucun fichier partagé modifié. Le contenu pédagogique est du texte
 * sémantique réel (titres, paragraphes, tableau, liste) présent dans le DOM ;
 * le canvas n'est qu'un laboratoire qui illustre un placement déterministe.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e080';
const PANEL_ID = 'geography-e080-panel';
const TITLE_ID = 'geography-e080-title';
const STRATEGY_ID = 'geography-e080-strategy';
const DENSITY_ID = 'geography-e080-density';
const DENSITY_OUT_ID = 'geography-e080-density-value';
const HALO_ID = 'geography-e080-halo';
const CANVAS_ID = 'geography-e080-canvas';
const READOUT_ID = 'geography-e080-readout';
const PLAY_ID = 'geography-e080-play';
const LEGEND_ID = 'geography-e080-legend';
const BADGE_ID = 'geography-e080-badge';

/* Espace logique fixe : les mesures ne dépendent pas de la taille de l'écran. */
const W = 320;
const H = 220;
const PAD = 14;
const LABEL_H = 13;

const KINDS = [
  'right', 'left', 'top', 'bottom',
  'topright', 'topleft', 'bottomright', 'bottomleft',
];
const KIND_LABELS = {
  right: 'droite', left: 'gauche', top: 'dessus', bottom: 'dessous',
  topright: 'haut-droite', topleft: 'haut-gauche',
  bottomright: 'bas-droite', bottomleft: 'bas-gauche',
};

/* Noms schématiques : le laboratoire simule des marqueurs, il n'invente
   aucune coordonnée ni aucun lieu vérifié du jeu de données. */
const NAMES = [
  'Aubrac', 'Béarn', 'Correz', 'Durance', 'Esson', 'Franche',
  'Garon', 'Hérault', 'Isère', 'Jura', 'Landes', 'Marne',
  'Nièvre', 'Orne', 'Périg', 'Quercy', 'Rhône', 'Savoie',
  'Tarn', 'Uzes', 'Vendée', 'Westh', 'Yonne', 'Zéland',
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  strategy: 'adaptive',
  density: 14,
  halo: true,
  playing: false,
  reduced: false,
  reveal: 1,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Utilitaires déterministes (zéro Math.random) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* E080-05 : générateur linéaire congruentiel à graine fixe, sans hasard. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildPlaces(count) {
  const rng = makeRng(0x5EED080);
  const places = [];
  for (let i = 0; i < count; i += 1) {
    places.push({
      name: NAMES[i % NAMES.length],
      nx: 0.08 + rng() * 0.84,
      ny: 0.10 + rng() * 0.80,
    });
  }
  return places;
}

function pointOf(place) {
  return {
    x: PAD + place.nx * (W - 2 * PAD),
    y: PAD + place.ny * (H - 2 * PAD),
  };
}

function labelWidth(name) {
  return 8 + name.length * 6.2;
}

/* E080-02 : huit positions candidates autour du point, dans un ordre fixe. */
function boxFor(kind, px, py, lw, lh) {
  let left;
  let top = py - lh / 2;
  if (kind === 'right') left = px + 8;
  else if (kind === 'left') left = px - 8 - lw;
  else if (kind === 'top') { left = px - lw / 2; top = py - lh - 8; }
  else if (kind === 'bottom') { left = px - lw / 2; top = py + 8; }
  else if (kind === 'topright') { left = px + 8; top = py - lh - 6; }
  else if (kind === 'topleft') { left = px - 8 - lw; top = py - lh - 6; }
  else if (kind === 'bottomright') { left = px + 8; top = py + 6; }
  else { left = px - 8 - lw; top = py + 6; }
  return { left, top, right: left + lw, bottom: top + lh };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function outOfBounds(box) {
  let d = 0;
  if (box.left < 2) d += 2 - box.left;
  if (box.right > W - 2) d += box.right - (W - 2);
  if (box.top < 2) d += 2 - box.top;
  if (box.bottom > H - 2) d += box.bottom - (H - 2);
  return d;
}

/* E080-04 : placement glouton déterministe (ordre trié y puis x, sans hasard).
   Le score pénalise une collision (poids fort), un débordement, puis l'ordre
   de la position : les égalités se résolvent toujours de la même façon. */
function computeLayout(strategy) {
  const places = buildPlaces(S.density);
  const chosen = [];
  let collisions = 0;
  let clean = 0;
  const order = places.map((p, i) => i).sort((a, b) => (
    places[a].ny - places[b].ny || places[a].nx - places[b].nx
  ));
  const kinds = strategy === 'naive' ? ['right'] : KINDS;

  order.forEach((index) => {
    const place = places[index];
    const point = pointOf(place);
    const lw = labelWidth(place.name);
    let best = null;
    kinds.forEach((kind, ki) => {
      const box = boxFor(kind, point.x, point.y, lw, LABEL_H);
      let hits = 0;
      chosen.forEach((c) => { if (overlaps(box, c.box)) hits += 1; });
      const score = hits * 1000 + outOfBounds(box) + ki * 0.01;
      if (!best || score < best.score) best = { box, score, hits, kind };
    });
    collisions += best.hits;
    if (best.hits === 0) clean += 1;
    chosen.push({ index, box: best.box, kind: best.kind, place, point, lw });
  });

  return { places, chosen, collisions, clean, total: places.length };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e080-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e080-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e080-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e080-panel p{margin:5px 0;max-width:68ch}
#geography-e080-panel .geography-e080-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e080-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e080-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e080-table th,#geography-e080-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e080-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e080-rules{margin:6px 0;padding-left:20px;max-width:68ch}
#geography-e080-rules li{margin:3px 0}
#geography-e080-strategy{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e080-strategy legend{padding:0 4px;color:var(--muted)}
#geography-e080-panel .geography-e080-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e080-panel .geography-e080-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e080-density{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e080-density-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e080-panel .geography-e080-halo{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;cursor:pointer;
}
#geography-e080-panel .geography-e080-halo input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e080-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e080-legend{font-size:10px;color:var(--muted)}
#geography-e080-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e080-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e080-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e080-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e080-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e080-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e080-panel[data-geography-e080-reduced="1"] button,
#geography-e080-panel[data-geography-e080-reduced="1"] .geography-e080-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e080-panel button,.geography-e080-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e080-panel{font-size:10px;padding:9px}
  #geography-e080-canvas{height:190px}
  #geography-e080-panel .geography-e080-choix{margin-right:4px}
}
`;

/* ---------- Textes sémantiques, lisibles sans JS ni canvas ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une étiquette de lieu est un texte attaché à un point : la difficulté n’est pas d’écrire le nom, mais de choisir où le placer sans recouvrir les autres étiquettes ni le point lui-même.',
    'La stratégie naïve place toutes les étiquettes à droite du marqueur : simple, mais les noms s’empilent dès que les lieux se rapprochent.',
    'Une stratégie adaptative essaie huit positions autour du point et retient celle qui heurte le moins d’étiquettes déjà posées ; un contour clair (halo) améliore la lisibilité sur fond sombre.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e080-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e080-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Huit positions candidates, énumérées dans un ordre fixe (référence : la première est celle de la stratégie naïve).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Rang', 'Position', 'Décalage', 'Usage typique'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const usages = {
    right: 'référence, toujours à droite',
    left: 'point proche du bord droit',
    top: 'espace libre au-dessus',
    bottom: 'espace libre au-dessous',
    topright: 'voisin immédiat à droite',
    topleft: 'voisin immédiat à gauche',
    bottomright: 'chevauchement en haut à droite',
    bottomleft: 'chevauchement en haut à gauche',
  };
  const tbody = document.createElement('tbody');
  KINDS.forEach((kind, i) => {
    const tr = document.createElement('tr');
    const cells = [
      String(i + 1),
      KIND_LABELS[kind],
      kind.indexOf('top') === 0 ? 'haut' : (kind.indexOf('bottom') === 0 ? 'bas' : 'médian'),
      usages[kind],
    ];
    cells.forEach((c, j) => {
      const cell = document.createElement(j === 0 ? 'th' : 'td');
      if (j === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function staticRules() {
  const list = document.createElement('ol');
  list.id = 'geography-e080-rules';
  [
    'On traite les lieux dans un ordre déterministe fixe (ordonné par latitude puis longitude simulées), jamais au hasard.',
    'Pour chaque lieu, on calcule la boîte englobante du texte pour chaque position candidate.',
    'On retient la boîte qui heurte le moins de boîtes déjà placées ; un débordement du cadre est pénalisé.',
    'Une collision est un recouvrement de deux rectangles : elle se détecte sans couleur, par comparaison de bornes.',
  ].forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    list.appendChild(li);
  });
  return list;
}

/* ---------- Construction du panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      naive: document.getElementById('geography-e080-strat-naive'),
      adaptive: document.getElementById('geography-e080-strat-adaptive'),
      density: document.getElementById(DENSITY_ID),
      densityOut: document.getElementById(DENSITY_OUT_ID),
      halo: document.getElementById(HALO_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e080-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Étiquettes de lieux : placer sans se chevaucher');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Sur une carte, le nom d’un lieu doit rester lisible même quand les points se serrent : le laboratoire ci-dessous compare une placement naïve à une recherche de position parmi huit candidats.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = STRATEGY_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Stratégie de placement (choix unique)';
  fieldset.appendChild(legend);
  [['naive', 'Naïve — toujours à droite'], ['adaptive', 'Adaptative — 8 positions']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e080-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e080-strat';
    radio.id = `geography-e080-strat-${value}`;
    radio.value = value;
    radio.checked = S.strategy === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Règles de placement');
  const densityRow = ctx.el('p', '');
  const densityLabel = document.createElement('label');
  densityLabel.setAttribute('for', DENSITY_ID);
  densityLabel.appendChild(document.createTextNode('Nombre de lieux simulés : '));
  const densityOut = document.createElement('span');
  densityOut.id = DENSITY_OUT_ID;
  densityLabel.appendChild(densityOut);
  densityRow.appendChild(densityLabel);

  const density = document.createElement('input');
  density.type = 'range';
  density.id = DENSITY_ID;
  density.min = '4';
  density.max = '24';
  density.step = '1';
  density.value = String(S.density);
  density.setAttribute('aria-label', 'Nombre de lieux simulés, de 4 à 24');

  const haloLabel = ctx.el('label', 'geography-e080-halo');
  const halo = document.createElement('input');
  halo.type = 'checkbox';
  halo.id = HALO_ID;
  halo.checked = S.halo;
  haloLabel.appendChild(halo);
  haloLabel.appendChild(document.createTextNode(' Contour clair (halo) autour des noms'));

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire de placement d’étiquettes. Flèches gauche et droite : changer de stratégie ; flèches haut et bas : changer le nombre de lieux ; H : basculer le halo ; Entrée : lancer ou arrêter l’apparition progressive.');

  const legendText = ctx.el('p', 'geography-e080-legend');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e080-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’apparition' : '▶ Animer l’apparition');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(
    title, lead, staticFacts(), staticTable(), sub, staticRules(),
    fieldset, densityRow, density, haloLabel, canvas, legendText, readout, play,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    naive: document.getElementById('geography-e080-strat-naive'),
    adaptive: document.getElementById('geography-e080-strat-adaptive'),
    density, densityOut, halo, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule grille) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform((cssW * dpr) / W, 0, 0, (cssH * dpr) / H, 0, 0);
  g.clearRect(0, 0, W, H);

  const layout = computeLayout(S.strategy);
  const cadres = [
    { x: PAD, y: PAD, w: W - 2 * PAD, h: H - 2 * PAD },
  ];
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  cadres.forEach((c) => g.strokeRect(c.x, c.y, c.w, c.h));

  const shown = S.playing ? Math.floor(clamp(S.reveal, 0, 1) * layout.chosen.length) : layout.chosen.length;

  /* Points : le carré distingue la stratégie naïve du cercle adaptatif,
     indépendamment de la couleur. */
  layout.chosen.forEach((item) => {
    g.strokeStyle = 'rgba(214,207,193,.65)';
    g.lineWidth = 1;
    if (S.strategy === 'naive') {
      g.strokeRect(item.point.x - 3, item.point.y - 3, 6, 6);
    } else {
      g.beginPath();
      g.arc(item.point.x, item.point.y, 3.5, 0, Math.PI * 2);
      g.stroke();
    }
  });

  /* Étiquettes : fil unique vers la boîte, puis texte avec halo optionnel. */
  for (let i = 0; i < shown; i += 1) {
    const item = layout.chosen[i];
    const box = item.box;
    const anchorX = clamp(item.point.x, box.left, box.right);
    const anchorY = clamp(item.point.y, box.top, box.bottom);
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.lineWidth = 1;
    g.setLineDash([2, 3]);
    g.beginPath();
    g.moveTo(item.point.x, item.point.y);
    g.lineTo(anchorX, anchorY);
    g.stroke();
    g.setLineDash([]);

    const textX = box.left + 1;
    const textY = box.bottom - 3;
    if (S.halo) {
      g.strokeStyle = 'rgba(6,9,14,.95)';
      g.lineWidth = 3;
      g.lineJoin = 'round';
      g.strokeText(item.place.name, textX, textY);
    }
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText(item.place.name, textX, textY);
  }

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(S.strategy === 'naive' ? 'Naïve : carrés, tout à droite' : 'Adaptative : cercles, 8 positions', PAD + 2, PAD + 12);
  g.fillText(`${layout.chosen.length} lieux · ${shown} étiquettes affichées`, PAD + 2, H - PAD - 3);
}

/* ---------- Grandeurs chiffrées et statut textuel ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const naive = computeLayout('naive');
  const adaptive = computeLayout('adaptive');
  const active = S.strategy === 'naive' ? naive : adaptive;
  const taux = active.total > 0 ? (active.clean / active.total) * 100 : 0;

  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Sur ${active.total} étiquettes : placement naïf (toutes à droite) `));
  n.appendChild(fort(`${naive.collisions} collision(s)`));
  n.appendChild(document.createTextNode(' ; placement adaptatif (8 positions) '));
  n.appendChild(fort(`${adaptive.collisions} collision(s)`));
  n.appendChild(document.createTextNode('. Référence : 0 collision, cas idéal. Stratégie active : '));
  n.appendChild(fort(`${active.clean}/${active.total} sans recouvrement`));
  n.appendChild(document.createTextNode(`, soit un taux de réussite de `));
  n.appendChild(fort(`${fmt(taux)} %`));
  n.appendChild(document.createTextNode('. Le halo améliore la lisibilité sans changer ces mesures.'));
}

function syncControls() {
  const n = S.nodes;
  if (n.naive) n.naive.checked = S.strategy === 'naive';
  if (n.adaptive) n.adaptive.checked = S.strategy === 'adaptive';
  if (n.density) n.density.value = String(S.density);
  if (n.densityOut) n.densityOut.textContent = String(S.density);
  if (n.halo) n.halo.checked = S.halo;
  if (n.legend) {
    n.legend.textContent = S.strategy === 'naive'
      ? 'Référence : toutes les étiquettes à droite, marqueurs carrés. Les collisions sont comptées par recouvrement de boîtes, jamais par couleur.'
      : 'Huit positions essayées dans un ordre fixe, marqueurs ronds ; le fil en tirets relie le point à l’étiquette retenue.';
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’apparition' : '▶ Animer l’apparition';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
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
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !S.reduced) S.reveal = (S.reveal + dt * 0.0004) % 1.25;
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
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE080Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* E080-09 : badge textuel sur la carte existante, sans toucher au SVG. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e080-badge', 'Étiquettes des lieux : texte SVG placé à droite du marqueur (décalage de 9 px), sans recherche anti-collision. Ce laboratoire illustre une alternative à huit positions.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E080', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.dataset.geographyE080Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.naive, n.adaptive].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.strategy = radio.value;
        syncControls();
      });
    });
    n.density.addEventListener('input', () => {
      S.density = clamp(Math.round(Number(n.density.value)), 4, 24);
      syncControls();
    });
    n.halo.addEventListener('change', () => {
      S.halo = !!n.halo.checked;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) { stopLoop(); S.reveal = 1; }
      else if (reduced) { S.reveal = 1; }
      else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.strategy = event.key === 'ArrowRight' ? 'adaptive' : 'naive';
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        S.density = clamp(S.density + (event.key === 'ArrowUp' ? 2 : -2), 4, 24);
      } else if (event.key === 'h' || event.key === 'H') {
        S.halo = !S.halo;
      } else if (event.key === 'Enter' || event.key === ' ') {
        S.playing = !S.playing;
        if (!S.playing) { stopLoop(); S.reveal = 1; }
        else if (!reduced) startLoop();
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing && !reduced) startLoop();
});
