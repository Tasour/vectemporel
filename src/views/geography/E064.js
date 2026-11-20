import { register } from './registry.js';

/* Lentille E064 — vue GEOGRAPHIE.
 * Thème : animations douces et respect de la boucle rAF unique.
 *
 * Les dix chantiers E064-01 … E064-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E064.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Une seule horloge requestAnimationFrame pilote tous les éléments
 * animés ; le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau) présent dans le DOM même sans animation ; le canvas
 * n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e064';
const PANEL_ID = 'geography-e064-panel';
const TITLE_ID = 'geography-e064-title';
const EASE_ID = 'geography-e064-easing';
const DUR_ID = 'geography-e064-duration';
const DUR_OUT_ID = 'geography-e064-duration-value';
const CANVAS_ID = 'geography-e064-canvas';
const READOUT_ID = 'geography-e064-readout';
const PLAY_ID = 'geography-e064-play';
const NOTE_ID = 'geography-e064-note';

const EASINGS = ['linear', 'inout', 'out'];
const EASE_LABELS = {
  linear: 'Linéaire — vitesse constante',
  inout: 'Ease-in-out cubique — départ et arrivée doux',
  out: 'Ease-out quadratique — arrivée amortie',
};

/* Repères géographiques réels, coordonnées arrondies au 1/10000e de degré. */
const A = { name: 'Paris', lat: 48.8566, lon: 2.3522 };
const B = { name: 'Lyon', lat: 45.7640, lon: 4.8357 };
const EARTH_R_KM = 6371;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  easing: 'inout',
  duration: 4000,
  playing: false,
  elapsed: 0,
  lastPct: -1,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 2) => {
  const f = Math.pow(10, d);
  return (Math.round(n * f) / f).toFixed(d).replace('.', ',');
};

const RAD = Math.PI / 180;

function ease(kind, t) {
  const x = Math.max(0, Math.min(1, t));
  if (kind === 'linear') return x;
  if (kind === 'out') return 1 - (1 - x) * (1 - x);
  /* ease-in-out cubique */
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function distanceKm(p, q) {
  const dLat = (q.lat - p.lat) * RAD;
  const dLon = (q.lon - p.lon) * RAD;
  const lat1 = p.lat * RAD;
  const lat2 = q.lat * RAD;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return EARTH_R_KM * c;
}

const TOTAL_KM = distanceKm(A, B);

function positionAt(p) {
  return {
    lat: A.lat + (B.lat - A.lat) * p,
    lon: A.lon + (B.lon - A.lon) * p,
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e064-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e064-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e064-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e064-panel p{margin:5px 0;max-width:68ch}
#geography-e064-panel .geography-e064-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e064-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e064-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e064-table th,#geography-e064-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e064-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e064-easing{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e064-easing legend{padding:0 4px;color:var(--muted)}
#geography-e064-panel .geography-e064-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e064-panel .geography-e064-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e064-duration{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e064-duration-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e064-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e064-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e064-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e064-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e064-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e064-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e064-note{font-size:10px;color:var(--muted);margin:6px 0 0}
#geography-e064-panel[data-geography-e064-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e064-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e064-panel{font-size:10px;padding:9px}
  #geography-e064-canvas{height:190px}
  #geography-e064-panel .geography-e064-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une animation fluide utilise une seule horloge : tous les éléments animés lisent le même temps, sinon ils se désynchronisent.',
    'Le déplacement doit être indépendant du taux de rafraîchissement : on avance selon le temps écoulé entre deux images, pas d’un pas fixe par image.',
    'Une fonction d’interpolation (ou « easing ») module la vitesse pour adoucir le départ et l’arrivée ; sans elle, le mouvement paraît mécanique.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e064-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e064-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Progression normalisée selon la fonction d’interpolation. Référence : t = 1 donne toujours 1,00 (destination atteinte).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Interpolation', 't = 0,25', 't = 0,50', 't = 0,75', 't = 1,00'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Linéaire', '0,25', '0,50', '0,75', '1,00'],
    ['Ease-in-out cubique', '0,06', '0,50', '0,94', '1,00'],
    ['Ease-out quadratique', '0,44', '0,75', '0,94', '1,00'],
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
      linear: document.getElementById('geography-e064-ease-linear'),
      inout: document.getElementById('geography-e064-ease-inout'),
      out: document.getElementById('geography-e064-ease-out'),
      duration: document.getElementById(DUR_ID),
      durationOut: document.getElementById(DUR_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      note: document.getElementById(NOTE_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e064-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Animations douces et horloge unique');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', `Un repère se déplace de ${A.name} vers ${B.name} selon une interpolation choisie. Tous les éléments animés — repère, anneau, traînée et barre de progression — sont pilotés par une seule boucle rAF : ils partagent le même temps et ne peuvent pas se désynchroniser.`);

  const fieldset = document.createElement('fieldset');
  fieldset.id = EASE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Interpolation (choix unique)';
  fieldset.appendChild(legend);
  [['linear', 'Linéaire'], ['inout', 'Ease-in-out'], ['out', 'Ease-out']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e064-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e064-ease';
    radio.id = `geography-e064-ease-${value}`;
    radio.value = value;
    radio.checked = S.easing === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Réglage de la durée');
  const durRow = ctx.el('p', '');
  const durLabel = document.createElement('label');
  durLabel.setAttribute('for', DUR_ID);
  durLabel.appendChild(document.createTextNode('Durée d’un trajet : '));
  const durOut = document.createElement('span');
  durOut.id = DUR_OUT_ID;
  durLabel.appendChild(durOut);
  durRow.appendChild(durLabel);

  const duration = document.createElement('input');
  duration.type = 'range';
  duration.id = DUR_ID;
  duration.min = '1000';
  duration.max = '6000';
  duration.step = '500';
  duration.value = String(S.duration);
  duration.setAttribute('aria-label', 'Durée d’un trajet, de 1 à 6 secondes');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Trajet ${A.name} vers ${B.name} animé. Flèche gauche ou droite : changer d’interpolation ; flèche haut ou bas : changer la durée ; Entrée : lancer ou arrêter l’animation.`);

  const readout = ctx.el('p', 'geography-e064-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter' : '▶ Animer le trajet');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const note = ctx.el('p', 'geography-e064-note', 'Une seule boucle rAF avec pause sur onglet masqué ; le mouvement réduit fige le repère à destination.');
  note.id = NOTE_ID;

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, durRow, duration, canvas, readout, play, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    linear: document.getElementById('geography-e064-ease-linear'),
    inout: document.getElementById('geography-e064-ease-inout'),
    out: document.getElementById('geography-e064-ease-out'),
    duration, durationOut: durOut, canvas, readout, play, note,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule passe) ---------- */

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
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const p = ease(S.easing, S.elapsed / S.duration);
  const here = positionAt(p);

  const pad = 26;
  const barH = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - barH - 10);
  const latMin = 45, latMax = 50, lonMin = 1.5, lonMax = 5.5;
  const toPx = (lat, lon) => [
    pad + ((lon - lonMin) / (lonMax - lonMin)) * iw,
    pad + ((latMax - lat) / (latMax - latMin)) * ih,
  ];
  const [ax, ay] = toPx(A.lat, A.lon);
  const [bx, by] = toPx(B.lat, B.lon);
  const [mx, my] = toPx(here.lat, here.lon);

  /* Cadre et graticule — repères non chromatiques (tirets). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.20)';
  g.setLineDash([2, 5]);
  for (let k = 1; k < 4; k++) {
    const gy = pad + (ih * k) / 4;
    g.beginPath(); g.moveTo(pad, gy); g.lineTo(pad + iw, gy); g.stroke();
    const gx = pad + (iw * k) / 4;
    g.beginPath(); g.moveTo(gx, pad); g.lineTo(gx, pad + ih); g.stroke();
  }
  g.setLineDash([]);

  /* Trajet complet en tirets, portion parcourue en trait plein. */
  g.strokeStyle = 'rgba(214,207,193,.45)';
  g.lineWidth = 1.5;
  g.setLineDash([6, 5]);
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx, my); g.stroke();

  /* Anneau pulsé : rayon déterministe function de p, jamais aléatoire. */
  g.strokeStyle = 'rgba(244,214,158,.35)';
  g.lineWidth = 1;
  g.beginPath(); g.arc(mx, my, 6 + 13 * p, 0, Math.PI * 2); g.stroke();

  /* Extrémités en croix, indépendantes de la couleur. */
  const cross = (x, y, r) => {
    g.beginPath();
    g.moveTo(x - r, y); g.lineTo(x + r, y);
    g.moveTo(x, y - r); g.lineTo(x, y + r);
    g.stroke();
  };
  g.strokeStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 1.5;
  cross(ax, ay, 5);
  cross(bx, by, 5);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath(); g.arc(mx, my, 4.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(8,12,18,.9)';
  g.lineWidth = 1;
  cross(mx, my, 8);

  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText(A.name, ax + 8, ay - 6);
  g.fillText(B.name, bx - 8 - g.measureText(B.name).width, by - 6);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`${EASE_LABELS[S.easing]} · p = ${fmt(p)}`, pad + 2, pad + 13);

  /* Barre de progression, alimentée par la même valeur p. */
  const barY = cssH - pad - barH + 6;
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(pad, barY, iw, barH);
  g.fillStyle = 'rgba(244,214,158,.55)';
  g.fillRect(pad + 1, barY + 1, (iw - 2) * p, barH - 2);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const pct = Math.round((S.elapsed / S.duration) * 100);
  /* Écriture seulement quand le pourcentage change : moins de DOM et moins
     d'annonces indiscrètes pour les lecteurs d'écran (aria-live poli). */
  if (pct === S.lastPct) return;
  S.lastPct = pct;
  const p = ease(S.easing, S.elapsed / S.duration);
  const km = TOTAL_KM * p;
  const sec = Math.min(S.duration, S.elapsed) / 1000;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Progression '));
  n.appendChild(fort(`${pct} %`));
  n.appendChild(document.createTextNode(' · distance « à vol d’oiseau » '));
  n.appendChild(fort(`${fmt(km, 1)} km`));
  n.appendChild(document.createTextNode(` sur ${fmt(TOTAL_KM, 1)} km (référence : trajet complet) · t écoulé ${fmt(sec)} s sur ${fmt(S.duration / 1000)} s · ${EASE_LABELS[S.easing]}.`));
}

function updateNote() {
  const n = S.nodes.note;
  if (!n) return;
  const reduced = S.nodes.panel && S.nodes.panel.dataset.geographyE064Reduced === '1';
  n.textContent = reduced
    ? 'Mouvement réduit actif : une seule image est dessinée, repère figé à destination, aucune boucle rAF.'
    : 'Une seule boucle rAF avec pause sur onglet masqué ; le mouvement réduit fige le repère à destination.';
}

function syncControls() {
  const n = S.nodes;
  if (n.linear) n.linear.checked = S.easing === 'linear';
  if (n.inout) n.inout.checked = S.easing === 'inout';
  if (n.out) n.out.checked = S.easing === 'out';
  if (n.duration) n.duration.value = String(S.duration);
  if (n.durationOut) n.durationOut.textContent = `${fmt(S.duration / 1000)} s`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter' : '▶ Animer le trajet';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateNote();
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
  if (typeof ctxReducedMotionNow === 'function' && ctxReducedMotionNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Horloge unique : une seule fonction tick, un seul identifiant rafId.
   Tous les éléments animés lisent la même valeur de elapsed. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof ctxReducedMotionNow === 'function' && ctxReducedMotionNow();
  if (reduced) return;
  if (S.lastTs) {
    /* dt plafonné : un retour d'onglet ou une image lente ne provoque pas
       de saut ; la vitesse reste indépendante du taux de rafraîchissement. */
    const dt = Math.min(64, Math.max(0, ts - S.lastTs));
    S.elapsed = (S.elapsed + dt) % S.duration;
  }
  S.lastTs = ts;
  drawLab();
  updateReadout();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

/* Source de vérité pour la préférence de mouvement, fournie par la coque. */
let reducedMotionFn = null;
function ctxReducedMotionNow() {
  if (typeof reducedMotionFn === 'function') {
    try { return !!reducedMotionFn(); } catch { return false; }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }
  return false;
}

function applyReduced(reduced) {
  const panel = S.nodes.panel;
  if (panel) panel.dataset.geographyE064Reduced = reduced ? '1' : '0';
  if (reduced) {
    stopLoop();
    S.playing = false;
    S.elapsed = S.duration; /* repère figé à destination */
    S.lastPct = -1;
    syncControls();
  } else if (S.playing) {
    startLoop();
  } else {
    drawLab();
    updateNote();
  }
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !ctxReducedMotionNow()) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => applyReduced(mq.matches);
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Point d'entrée ---------- */

register('E064', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  if (typeof ctx.reducedMotion === 'function') reducedMotionFn = ctx.reducedMotion;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.dataset.geographyE064Reduced = ctxReducedMotionNow() ? '1' : '0';

  const reduced = ctxReducedMotionNow();
  if (reduced) {
    stopLoop();
    S.playing = false;
    S.elapsed = S.duration;
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.linear, n.inout, n.out].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.easing = radio.value;
        S.elapsed = 0;
        S.lastPct = -1;
        syncControls();
      });
    });
    n.duration.addEventListener('input', () => {
      S.duration = Math.max(1000, Math.min(6000, Math.round(Number(n.duration.value) / 500) * 500));
      S.elapsed = 0;
      S.lastPct = -1;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (ctxReducedMotionNow()) {
        /* Mouvement réduit : on affiche la fin sans lancer de boucle. */
        S.playing = false;
        S.elapsed = S.duration;
        S.lastPct = -1;
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = EASINGS.indexOf(S.easing);
        S.easing = EASINGS[(i + step + EASINGS.length) % EASINGS.length];
        S.elapsed = 0;
        S.lastPct = -1;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 500 : -500;
        S.duration = Math.max(1000, Math.min(6000, S.duration + step));
        S.elapsed = 0;
        S.lastPct = -1;
      } else if (event.key === 'Enter' || event.key === ' ') {
        n.play.click();
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
  if (S.playing && !ctxReducedMotionNow()) startLoop();
});
