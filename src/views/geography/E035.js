import { register } from './registry.js';

/* Lentille E035 — vue GEOGRAPHIE.
 * Thème : méridien de Greenwich et origine des longitudes.
 *
 * Les dix chantiers E035-01 … E035-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E035.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e035';
const PANEL_ID = 'geography-e035-panel';
const TITLE_ID = 'geography-e035-title';
const ORIGIN_ID = 'geography-e035-origin';
const LAT_ID = 'geography-e035-lat';
const LAT_OUT_ID = 'geography-e035-lat-value';
const CANVAS_ID = 'geography-e035-canvas';
const READOUT_ID = 'geography-e035-readout';
const PLAY_ID = 'geography-e035-play';
const LEGEND_ID = 'geography-e035-legend';
const BADGE_ID = 'geography-e035-badge';
const TABLE_ID = 'geography-e035-table';
const ORIGIN_OUT_ID = 'geography-e035-origin-value';

/* Grandeurs canoniques (aucune donnée fabriquée). */
const PARIS_LON = 2 + 20 / 60 + 55 / 3600; /* 2°20′55″ E de Greenwich ≈ 2,3486° */
const PARIS_LAT = 48 + 50 / 60;             /* Observatoire de Paris ≈ 48°50′ N */
const R_EQ = 6378;                          /* rayon équatorial, km */
const KM_PAR_DEGRE = (Math.PI / 180) * R_EQ; /* ≈ 111,32 km par degré à l'équateur */
const DEG_PAR_HEURE = 15;                   /* 360° / 24 h */
const RAD = Math.PI / 180;

/* Origines historiques : changer l'origine décale toutes les longitudes. */
const ORIGINS = {
  greenwich: { lon: 0, label: 'Greenwich', detail: '0° — convention internationale de 1884' },
  paris: { lon: PARIS_LON, label: 'Paris', detail: '2°20′55″ E — ancien méridien national français' },
  antimeridien: { lon: 180, label: 'Anti-méridien', detail: '180° — méridien de la ligne de date' },
};
const ORIGIN_ORDER = ['greenwich', 'paris', 'antimeridien'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  origin: 'greenwich',
  lat: 48,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* Longitude ramenée dans (-180, 180]. */
function normLon(lon) {
  let x = ((lon + 180) % 360 + 360) % 360 - 180;
  if (x <= -180) x = 180;
  return x;
}

/* Longitude du lieu de référence (Paris) mesurée depuis l'origine choisie. */
function relativeLon(originKey) {
  return normLon(PARIS_LON - ORIGINS[originKey].lon);
}

/* Écart de temps : 1° = 4 minutes, 15° = 1 heure. */
function timeFromDeg(deg) {
  const totalMin = (Math.abs(deg) / DEG_PAR_HEURE) * 60;
  const h = Math.floor(totalMin / 60);
  const m = Math.floor(totalMin - h * 60 + 0.5);
  return { h, m, totalMin };
}

/* 1° de longitude à la latitude φ : le parallèle est un cercle de rayon R·cos φ. */
function kmParDegre(latDeg) {
  return KM_PAR_DEGRE * Math.cos(latDeg * RAD);
}

function cardinal(deg) {
  if (Math.abs(deg) < 1e-9) return 'sur le méridien origine';
  return deg > 0 ? 'à l’est' : 'à l’ouest';
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e035-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e035-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e035-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e035-panel p{margin:5px 0;max-width:68ch}
#geography-e035-panel .geography-e035-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e035-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e035-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e035-table th,#geography-e035-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e035-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e035-origin{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e035-origin legend{padding:0 4px;color:var(--muted)}
#geography-e035-panel .geography-e035-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e035-panel .geography-e035-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e035-lat{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e035-lat-value,#geography-e035-origin-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e035-canvas{
  display:block;width:100%;height:220px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e035-legend{font-size:10px;color:var(--muted)}
#geography-e035-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e035-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e035-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e035-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e035-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e035-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e035-panel[data-geography-e035-reduced="1"] button,
#geography-e035-panel[data-geography-e035-reduced="1"] .geography-e035-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e035-panel button,.geography-e035-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e035-panel{font-size:10px;padding:9px}
  #geography-e035-canvas{height:180px}
  #geography-e035-panel .geography-e035-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'La longitude est un angle est/ouest mesuré le long de l’équateur entre un méridien de référence et le méridien du lieu. Contrairement à l’équateur, imposé par l’axe de rotation, l’origine des longitudes est une convention : aucun phénomène physique ne la désigne.',
    'Jusqu’au XIXᵉ siècle, chaque État utilisait son propre méridien origine (Paris, Rome, Berlin…). La Conférence internationale du méridien, réunie à Washington en 1884, a retenu Greenwich, déjà majoritairement employé par les cartes marines britanniques.',
    'Choisir une origine décale toutes les longitudes du même angle : un même lieu n’a pas la même longitude selon le méridien de référence. Le décalage horaire obéit à la même convention — un tour complet de 360° correspond à 24 heures, soit 15° par heure.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e035-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Méridiens originaires historiques, repérés par rapport à Greenwich.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Méridien origine', 'Longitude par rapport à Greenwich', 'Statut historique'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Greenwich', '0° (par définition)', 'Retenue internationalement en 1884 ; GMT puis UTC.'],
    ['Paris', '2°20′55″ E (≈ 2,35°)', 'Méridien national français jusqu’à l’adoption de l’heure de Greenwich en 1891.'],
    ['Anti-méridien', '180° E/O', 'Opposé à Greenwich ; reste associé à la ligne de changement de date.'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      greenwich: document.getElementById('geography-e035-origin-greenwich'),
      paris: document.getElementById('geography-e035-origin-paris'),
      antimeridien: document.getElementById('geography-e035-origin-antimeridien'),
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      originOut: document.getElementById(ORIGIN_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e035-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Le méridien de Greenwich et l’origine des longitudes');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'La longitude compte à partir d’un méridien origine choisi. Faire varier ce choix montre qu’une coordonnée est une convention, et non une donnée de la nature.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = ORIGIN_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Méridien pris pour origine (choix unique)';
  fieldset.appendChild(legend);
  ORIGIN_ORDER.forEach((key) => {
    const lab = ctx.el('label', 'geography-e035-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e035-origin';
    radio.id = `geography-e035-origin-${key}`;
    radio.value = key;
    radio.checked = S.origin === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(ORIGINS[key].label));
    fieldset.appendChild(lab);
  });

  const originP = ctx.el('p', '');
  originP.appendChild(document.createTextNode('Origine sélectionnée : '));
  const originOut = document.createElement('span');
  originOut.id = ORIGIN_OUT_ID;
  originP.appendChild(originOut);

  const sub = ctx.el('h3', '', 'Observer l’effet du choix d’origine');
  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude d’observation : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '0';
  lat.max = '80';
  lat.step = '5';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude d’observation, de 0 à 80 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Graticule avec méridien origine en trait plein, anti-méridien en tirets et Observatoire de Paris marqué par une croix. Flèches gauche et droite : changer d’origine ; flèches haut et bas : changer la latitude.');

  const legendText = ctx.el('p', 'geography-e035-legend', 'Trait plein doré : méridien origine · tirets : anti-méridien · pointillés : parallèle observé · croix : Observatoire de Paris — le style de trait distingue les repères, indépendamment de la couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e035-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, originP, sub, latRow, lat, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    greenwich: document.getElementById('geography-e035-origin-greenwich'),
    paris: document.getElementById('geography-e035-origin-paris'),
    antimeridien: document.getElementById('geography-e035-origin-antimeridien'),
    lat, latOut, originOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (une seule grille, un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 220;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const padX = 26;
  const padY = 16;
  const iw = Math.max(10, cssW - padX * 2);
  const ih = Math.max(10, cssH - padY * 2);
  const toX = (lon) => padX + ((lon + 180) / 360) * iw;
  const toY = (lat) => padY + ((90 - lat) / 180) * ih;

  /* Graticule fixe en longitude absolue (repère de Greenwich). */
  g.strokeStyle = 'rgba(255,255,255,.13)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(padX, padY, iw, ih);
  for (let lon = -180; lon <= 180; lon += 30) {
    g.beginPath();
    g.moveTo(toX(lon), padY);
    g.lineTo(toX(lon), padY + ih);
    g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    g.moveTo(padX, toY(lat));
    g.lineTo(padX + iw, toY(lat));
    g.stroke();
  }

  /* Méridien origine : trait plein doré, repère non chromatique. */
  const originLon = ORIGINS[S.origin].lon;
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.lineWidth = 2.5;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(toX(originLon), padY);
  g.lineTo(toX(originLon), padY + ih);
  g.stroke();

  /* Anti-méridien : tirets, à 180° de l'origine. */
  g.strokeStyle = 'rgba(255,255,255,.82)';
  g.lineWidth = 1.5;
  g.setLineDash([7, 5]);
  g.beginPath();
  g.moveTo(toX(normLon(originLon + 180)), padY);
  g.lineTo(toX(normLon(originLon + 180)), padY + ih);
  g.stroke();
  g.setLineDash([]);

  /* Parallèle observé : pointillés. */
  g.strokeStyle = 'rgba(214,207,193,.7)';
  g.lineWidth = 1;
  g.setLineDash([2, 4]);
  g.beginPath();
  g.moveTo(padX, toY(S.lat));
  g.lineTo(padX + iw, toY(S.lat));
  g.stroke();
  g.setLineDash([]);

  /* Lieu de référence : croix, jamais la couleur seule. */
  const px = toX(PARIS_LON);
  const py = toY(PARIS_LAT);
  g.strokeStyle = 'rgba(244,214,158,1)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px - 6, py); g.lineTo(px + 6, py);
  g.moveTo(px, py - 6); g.lineTo(px, py + 6);
  g.stroke();

  /* Méridien balayé : seul élément animé, position déterministe = f(S.sweep). */
  const sweepLon = -180 + S.sweep * 360;
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = 1;
  g.setLineDash([3, 5]);
  g.beginPath();
  g.moveTo(toX(sweepLon), padY);
  g.lineTo(toX(sweepLon), padY + ih);
  g.stroke();
  g.setLineDash([]);

  /* Libellés textuels, y compris hors couleur. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText('Origine : ' + ORIGINS[S.origin].label, padX + 2, padY + 12);
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText('Paris (obs.)', padX + 2, cssH - padY - 4);
  g.fillText('φ = ' + fmt(S.lat, 0) + '°', padX + iw - 46, toY(S.lat) - 4);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const rel = relativeLon(S.origin);
  const t = timeFromDeg(rel);
  const km = kmParDegre(S.lat);
  const echelle = Math.cos(S.lat * RAD);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('À ' + fmt(S.lat, 0) + '° de latitude — 1° de longitude = '));
  n.appendChild(fort(fmt(km, 1) + ' km'));
  n.appendChild(document.createTextNode(' (équateur : ' + fmt(KM_PAR_DEGRE, 2) + ' km, échelle '));
  n.appendChild(fort('1,00'));
  n.appendChild(document.createTextNode(') ; ici l’échelle est '));
  n.appendChild(fort(fmt(echelle, 2) + '×'));
  n.appendChild(document.createTextNode('. Depuis ' + ORIGINS[S.origin].label + ', Paris est '));
  n.appendChild(fort(fmt(Math.abs(rel), 2) + '° ' + (rel >= 0 ? 'E' : 'O')));
  n.appendChild(document.createTextNode(' (' + cardinal(rel) + '), soit '));
  n.appendChild(fort((t.h ? t.h + ' h ' : '') + fmt(t.m, 0) + ' min'));
  n.appendChild(document.createTextNode(' de décalage (référence : 1 h = 15°).'));
}

function syncControls() {
  const n = S.nodes;
  if (n.greenwich) n.greenwich.checked = S.origin === 'greenwich';
  if (n.paris) n.paris.checked = S.origin === 'paris';
  if (n.antimeridien) n.antimeridien.checked = S.origin === 'antimeridien';
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = fmt(S.lat, 0) + '°';
  if (n.originOut) n.originOut.textContent = ORIGINS[S.origin].detail;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
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
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00007) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE035Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e035-badge', 'Origine des longitudes : méridien de Greenwich, convention internationale de 1884. Référence moderne : méridien IERS, environ 102 m à l’est du cercle de transit d’Airy.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E035', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE035Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.greenwich, n.paris, n.antimeridien].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.origin = radio.value;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = Math.max(0, Math.min(80, Math.round(Number(n.lat.value) / 5) * 5));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORIGIN_ORDER.indexOf(S.origin);
        S.origin = ORIGIN_ORDER[(i + step + ORIGIN_ORDER.length) % ORIGIN_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = Math.max(0, Math.min(80, S.lat + step));
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
  if (S.playing) startLoop();
});
