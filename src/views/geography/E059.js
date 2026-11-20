import { register } from './registry.js';

/* Lentille E059 — vue GEOGRAPHIE.
 * Thème : styles d'impression (print) — du média continu à l'écran au média
 * paginé du papier : trames, tons continus, couverture d'encre, contraste et
 * ruptures de page.
 *
 * Les dix chantiers E059-01 … E059-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E059.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau) présent dans le DOM même sans animation ; le canvas
 * n'est qu'un laboratoire qui illustre des formules deterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e059';
const PANEL_ID = 'geography-e059-panel';
const TITLE_ID = 'geography-e059-title';
const TABLE_ID = 'geography-e059-table';
const MODE_ID = 'geography-e059-mode';
const DENS_ID = 'geography-e059-density';
const DENS_OUT_ID = 'geography-e059-density-value';
const CANVAS_ID = 'geography-e059-canvas';
const READOUT_ID = 'geography-e059-readout';
const PLAY_ID = 'geography-e059-play';
const LEGEND_ID = 'geography-e059-legend';
const BADGE_ID = 'geography-e059-badge';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const pct = (n) => `${fmt(n * 100)} %`;

/* Couverture maximale du modèle de trame à points : un disque inscrit dans
   une cellule carrée, soit π·(p/2)²/p² = π/4 ≈ 0,7854. */
const COUV_MAX = Math.PI / 4;
const PAGE_CONTENU = 1800; /* px de contenu simulé */
const PAGE_UTILE = 1000;   /* px imprimables par feuille */

const MODES = {
  ecran: {
    label: 'Écran — tons continus',
    detail: 'À l’écran, le pixel émet la couleur : le dégradé est continu, sans trame.',
  },
  couleur: {
    label: 'Impression couleur — repères en losange',
    detail: 'En couleur, des repères en losange figurent la séparation des encres ; le ton reste lisible en gris.',
  },
  nb: {
    label: 'Impression N&B — trame de points',
    detail: 'En noir et blanc, un disque plus ou moins gros code le ton : c’est le modèle de référence.',
  },
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'nb',
  density: 0.6,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules deterministes (aucune donnée fabriquée) ---------- */

/* Ton local sur la feuille : une tache gaussienne et une bande sinusoïdale,
   toutes deux fonction de la position normalisée — jamais de hasard. */
function toneAt(u, v, base) {
  const du = u - 0.48;
  const dv = v - 0.55;
  const blob = Math.exp(-((du * du) / 0.045 + (dv * dv) / 0.075));
  const band = 0.5 + 0.5 * Math.sin((u * 2.6 + v * 1.7) * Math.PI);
  return clamp01(base * (0.30 + 0.70 * blob) + 0.12 * band * (1 - base));
}

function measures(density) {
  const t = clamp01(density);
  const couverture = COUV_MAX * t;
  const gris = 1 - couverture;                  /* réflectance perçue, papier blanc = 1 */
  const contraste = 1.05 / (gris + 0.05);       /* gris imprimé sur blanc, référence 21:1 */
  const pages = Math.ceil(PAGE_CONTENU / PAGE_UTILE);
  return { t, couverture, gris, contraste, pages, couvMax: COUV_MAX };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e059-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e059-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e059-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e059-panel p{margin:5px 0;max-width:68ch}
#geography-e059-panel .geography-e059-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e059-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e059-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e059-table th,#geography-e059-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e059-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e059-mode{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e059-mode legend{padding:0 4px;color:var(--muted)}
#geography-e059-panel .geography-e059-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e059-panel .geography-e059-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e059-density{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e059-density-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e059-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:#f6f2ea;touch-action:none;
}
#geography-e059-legend{font-size:10px;color:var(--muted)}
#geography-e059-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e059-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e059-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e059-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e059-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e059-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e059-panel[data-geography-e059-reduced="1"] button,
#geography-e059-panel[data-geography-e059-reduced="1"] .geography-e059-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e059-panel button,.geography-e059-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e059-panel{font-size:10px;padding:9px}
  #geography-e059-canvas{height:190px}
  #geography-e059-panel .geography-e059-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

/* E059-01 — section sémantique d'introduction. */
function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une feuille imprimée est un média paginé et fini : la feuille a des bords, alors que l’écran défile sans limite. La feuille de style doit donc prévoir des ruptures (@page, break-inside) et une zone imprimable.',
    'Par défaut, les navigateurs ne impriment pas les fonds colorés : print-color-adjust permet de décider si l’on économise l’encre ou si l’on conserve les couleurs.',
    'Un ton imprimé n’est pas un dégradé continu : une trame — points en noir et blanc, repères d’encre en couleur — module la densité pour donner l’illusion du gris.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e059-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* E059-02 — tableau comparatif écran / impression (valeurs de référence). */
function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Écran et papier : grandeurs de référence (valeurs deterministes, sans mesure matérielle).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Propriété', 'Écran', 'Impression N&B', 'Remarque'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Couverture d’encre maximale', 'sans objet (pixel émis)', 'π/4 ≈ 78,5 %', 'disque inscrit dans une cellule carrée'],
    ['Contraste noir sur blanc', '21:1', '21:1', 'référence WCAG, papier vierge'],
    ['Seuil de lisibilité du texte', '4,5:1', '4,5:1', 'WCAG AA, à comparer à 21:1'],
    ['Fond coloré', 'conservé', 'souvent supprimé', 'print-color-adjust : economy exact'],
    ['Découpe du contenu', 'défilement continu', 'pagination (2 feuilles)', '1 800 px / 1 000 px par feuille'],
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
      ecran: document.getElementById('geography-e059-mode-ecran'),
      couleur: document.getElementById('geography-e059-mode-couleur'),
      nb: document.getElementById('geography-e059-mode-nb'),
      density: document.getElementById(DENS_ID),
      densityOut: document.getElementById(DENS_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e059-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Styles d’impression : de l’écran à la feuille');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Imprimer une carte ne se limite pas à changer de couleur : le média paginé, l’économie d’encre et la trame transforment le rendu. Ce laboratoire compare trois modes de sortie à partir de formules deterministes.');

  /* E059-03 — sélecteur de mode en choix unique (radiogroup natif). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Mode de sortie (choix unique)';
  fieldset.appendChild(legend);
  [['ecran', 'Écran'], ['couleur', 'Impression couleur'], ['nb', 'Impression N&B']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e059-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e059-mode';
    radio.id = `geography-e059-mode-${value}`;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  /* E059-04 — curseur de densité d'encre (tonalité). */
  const sub = ctx.el('h3', '', 'Régler la densité d’encre');
  const densRow = ctx.el('p', '');
  const densLabel = document.createElement('label');
  densLabel.setAttribute('for', DENS_ID);
  densLabel.appendChild(document.createTextNode('Tonalité du fond : '));
  const densOut = document.createElement('span');
  densOut.id = DENS_OUT_ID;
  densLabel.appendChild(densOut);
  densRow.appendChild(densLabel);

  const density = document.createElement('input');
  density.type = 'range';
  density.id = DENS_ID;
  density.min = '0';
  density.max = '100';
  density.step = '5';
  density.value = String(Math.round(S.density * 100));
  density.setAttribute('aria-label', 'Tonalité du fond, de 0 à 100 pour cent');

  /* E059-05 — laboratoire canvas (surface de dessin unique). */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Aperçu de feuille imprimée. Flèches gauche et droite : changer de mode de sortie ; flèches haut et bas : régler la densité d’encre.');

  const legendText = ctx.el('p', 'geography-e059-legend', MODES[S.mode].label + ' · ' + MODES[S.mode].detail + ' Le code graphique (rectangle plein, losange ou disque) distingue le mode indépendamment de la couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e059-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’impression' : '▶ Animer la tête d’impression');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, densRow, density, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    ecran: document.getElementById('geography-e059-mode-ecran'),
    couleur: document.getElementById('geography-e059-mode-couleur'),
    nb: document.getElementById('geography-e059-mode-nb'),
    density, densityOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- E059-05 / E059-08 : rendu du laboratoire ---------- */

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

  /* Papier : fond clair, bord de feuille et zone imprimable pointillée. */
  g.fillStyle = '#f6f2ea';
  g.fillRect(0, 0, cssW, cssH);
  const pad = 16;
  const pw = Math.max(10, cssW - pad * 2);
  const ph = Math.max(10, cssH - pad * 2);
  g.strokeStyle = 'rgba(40,34,28,.45)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad, pw, ph);
  g.save();
  if (g.setLineDash) g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(40,34,28,.28)';
  g.strokeRect(pad + 8, pad + 8, pw - 16, ph - 16);
  g.restore();

  const ix = pad + 8;
  const iy = pad + 8;
  const iw = Math.max(4, pw - 16);
  const ih = Math.max(4, ph - 16);
  const pitch = 14;
  const cols = Math.max(1, Math.floor(iw / pitch));
  const rows = Math.max(1, Math.floor(ih / pitch));

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cx = ix + (c + 0.5) * pitch;
      const cy = iy + (r + 0.5) * pitch;
      const tone = toneAt((c + 0.5) / cols, (r + 0.5) / rows, S.density);
      if (S.mode === 'ecran') {
        /* Tons continus : le pixel émet un niveau de gris pleine cellule. */
        const gray = Math.round(255 * (1 - tone));
        g.fillStyle = `rgb(${gray},${gray},${gray})`;
        g.fillRect(cx - pitch / 2 + 1, cy - pitch / 2 + 1, pitch - 2, pitch - 2);
      } else if (S.mode === 'couleur') {
        /* Repère en losange (orientation 45°) : code non chromatique de la séparation. */
        const rad = (pitch / 2) * Math.sqrt(tone);
        g.fillStyle = 'rgba(30,26,22,.82)';
        g.beginPath();
        g.moveTo(cx, cy - rad * 1.25);
        g.lineTo(cx + rad * 1.25, cy);
        g.lineTo(cx, cy + rad * 1.25);
        g.lineTo(cx - rad * 1.25, cy);
        g.closePath();
        g.fill();
      } else {
        /* Trame à points (modèle de référence) : rayon = (p/2)·√ton. */
        const rad = (pitch / 2) * Math.sqrt(tone);
        g.fillStyle = 'rgba(24,20,16,.9)';
        g.beginPath();
        g.arc(cx, cy, rad, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  /* E059-07 — tête d'impression : position deterministe = f(S.sweep). */
  const headY = iy + S.sweep * ih;
  g.save();
  if (g.setLineDash) g.setLineDash([6, 4]);
  g.strokeStyle = 'rgba(120,74,20,.9)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(ix, headY);
  g.lineTo(ix + iw, headY);
  g.stroke();
  g.restore();
  g.fillStyle = 'rgba(120,74,20,.95)';
  g.beginPath();
  g.moveTo(ix - 2, headY - 5);
  g.lineTo(ix + 6, headY);
  g.lineTo(ix - 2, headY + 5);
  g.closePath();
  g.fill();
  g.font = '9px sans-serif';
  g.fillStyle = '#4a3a24';
  g.fillText('tête d’impression', ix + 8, Math.max(iy + 9, Math.min(iy + ih - 3, headY - 5)));
  g.fillText(MODES[S.mode].label, ix + 2, iy + ih - 3);
  g.fillText('page 1/2', ix + iw - 40, iy + ih - 3);
}

/* ---------- E059-06 — grandeurs chiffrées comparées à une référence ---------- */

function updateReadout() {
  const m = measures(S.density);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`À tonalité ${pct(m.t)} — couverture d’encre (modèle à points) : `));
  n.appendChild(fort(pct(m.couverture)));
  n.appendChild(document.createTextNode(`, soit ${pct(m.couverture / m.couvMax)} de la référence π/4 = ${pct(m.couvMax)} à ton plein ; gris perçu : `));
  n.appendChild(fort(fmt(m.gris)));
  n.appendChild(document.createTextNode(' sur 1,00 (papier blanc) ; contraste du gris sur blanc : '));
  n.appendChild(fort(`${fmt(m.contraste)}:1`));
  n.appendChild(document.createTextNode(`, à comparer à 21:1 (noir sur blanc) et au seuil 4,5:1 ; pagination : `));
  n.appendChild(fort(`${m.pages} feuilles`));
  n.appendChild(document.createTextNode(` pour ${PAGE_CONTENU} px de contenu à ${PAGE_UTILE} px par feuille, contre un flux continu à l’écran.`));
}

function syncControls() {
  const n = S.nodes;
  if (n.ecran) n.ecran.checked = S.mode === 'ecran';
  if (n.couleur) n.couleur.checked = S.mode === 'couleur';
  if (n.nb) n.nb.checked = S.mode === 'nb';
  if (n.density) n.density.value = String(Math.round(S.density * 100));
  if (n.densityOut) n.densityOut.textContent = pct(S.density);
  if (n.legend) n.legend.textContent = MODES[S.mode].label + ' · ' + MODES[S.mode].detail + ' Le code graphique (rectangle plein, losange ou disque) distingue le mode indépendamment de la couleur.';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’impression' : '▶ Animer la tête d’impression';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E059-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E059-09 — badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx && (ctx.layout || ctx.stage);
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = document.createElement('div');
  badge.className = 'geography-e059-badge';
  badge.id = BADGE_ID;
  badge.textContent = 'Aperçu : style d’impression ' + MODES[S.mode].label.toLowerCase() + ' — fond paginé, trame deterministe, aucune ressource distante.';
  map.appendChild(badge);
}

function updateMapBadge() {
  const badge = document.getElementById(BADGE_ID);
  if (badge) badge.textContent = 'Aperçu : style d’impression ' + MODES[S.mode].label.toLowerCase() + ' — fond paginé, trame deterministe, aucune ressource distante.';
}

/* ---------- E059-10 : accessibilité, mouvement réduit, robustesse ---------- */

function installGlobalListeners(ctx) {
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
        if (panel) panel.dataset.geographyE059Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Point d'entrée ---------- */

register('E059', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE059Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.ecran, n.couleur, n.nb].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.mode = radio.value;
        updateMapBadge();
        syncControls();
      });
    });
    n.density.addEventListener('input', () => {
      S.density = clamp01(Math.round(Number(n.density.value) / 5) * 5 / 100);
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
        const order = ['ecran', 'couleur', 'nb'];
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = order.indexOf(S.mode);
        S.mode = order[(i + step + order.length) % order.length];
        updateMapBadge();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.density = clamp01(Math.round((S.density * 100 + step) / 5) * 5 / 100);
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing) startLoop();
});
