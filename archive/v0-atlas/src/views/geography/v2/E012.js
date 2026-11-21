import { register } from './registry.js';

/* Lentille V2 E012 — Bassin versant et bilan hydrique.
 *
 * Seconde passe sur le domaine des fleuves et cours d'eau : dix chantiers
 * inédits, tous réellement implémentés. Là où la passe 1 mesurait le débit
 * (Q = S·v), le profil en long, le régime, le tarage et l'ordre de Strahler,
 * cette lentille s'intéresse au bassin qui alimente le cours et au bilan
 * hydrique qui l'entretient : lame d'écoulement, débit spécifique,
 * coefficient de ruissellement, onde de crue, hydrogramme, densité de
 * drainage et effet d'une surface urbanisée.
 *
 * Contraintes : un seul import, un seul register, un seul identifiant CSS
 * `geography-v2-e012`, tous les id préfixés `geography-v2-e012-`, aucune
 * ressource réseau, aucun appel à la console, aucun `Math.random`, une seule
 * boucle rAF avec pause sur `document.hidden` et sortie d'écran, respect de
 * `ctx.reducedMotion()`. Le texte est sémantique (h2, p, table, fieldset,
 * label, details) et reste lisible et indexable sans JavaScript : le canvas
 * n'est qu'un laboratoire qui illustre des formules déterministes.
 */

const PFX = 'geography-v2-e012';

/* Constantes hydrologiques de référence (ordres de grandeur, déterministes). */
const AIRE_KM2 = 12000;          // aire du bassin versant de référence (km²)
const ETR_NAT = 450;             // évapotranspiration réelle, bassin naturel (mm/an)
const ETR_URB = 300;             // évapotranspiration réelle, bassin urbanisé (mm/an)
const PREC_MIN = 400;            // précipitations annuelles minimales (mm/an)
const PREC_MAX = 1600;           // précipitations annuelles maximales (mm/an)
const LONGUEUR_KM = 850;         // longueur du cours principal (km)
const VITESSE_ONDE = 2.5;        // vitesse de propagation de l'onde de crue (m/s)
const L_TOTAL_KM = 3600;         // longueur cumulée du réseau hydrographique (km)
const QS_RHIN = 12.6;            // débit spécifique de référence (L/s/km², Rhin)
const SEC_PER_YEAR = 365.25 * 86400;
const PIC_HEURES = 24;           // temps de pic du modèle d'hydrogramme (h)
const CANVAS_W = 320;            // largeur logique du canvas, px CSS
const CANVAS_H = 204;            // hauteur logique du canvas, px CSS

const MODES = [
  { key: 'bilan', label: 'Bilan hydrique' },
  { key: 'onde', label: 'Onde de crue' },
  { key: 'hydro', label: 'Hydrogramme' },
];
const MODE_KEYS = MODES.map((m) => m.key);

/* État de module : survit aux re-renders complets de la coque. */
let ctxRef = null;
let layoutRef = null;
let rafId = 0;
let lastFrame = 0;
let mode = 'bilan';
let prec = 900;                  // précipitations annuelles (mm/an)
let dist = 425;                  // distance depuis la source (km)
let urban = false;               // bascule indépendante : bassin urbanisé
let playing = false;
let sweep = 0;                   // phase de l'animation, déterministe, dans [0,1)
let inView = true;
let observer = null;
let dom = {};
let listeners = [];

/* ---------- utilitaires déterministes (aucun aléa, aucune console) ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function group(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function dec(value, digits) {
  return Number(value).toFixed(digits).replace('.', ',');
}

function reduced() {
  return Boolean(ctxRef && typeof ctxRef.reducedMotion === 'function' && ctxRef.reducedMotion());
}

function on(node, type, fn) {
  if (!node || typeof node.addEventListener !== 'function') return;
  node.addEventListener(type, fn);
  listeners.push({ node, type, fn });
}

/* ---------- formules du bilan hydrique (E012-03 … E012-08) ---------- */

function etr() {
  return urban ? ETR_URB : ETR_NAT;
}

/* Lame d'écoulement annuelle P − E, planifiée sur l'année (ΔS ≈ 0). */
function lameMm() {
  return Math.max(0, prec - etr());
}

/* Débit moyen dérivé de la lame : 1 mm sur 1 km² = 1000 m³/an. */
function debitM3s() {
  return (lameMm() * AIRE_KM2 * 1000) / SEC_PER_YEAR;
}

/* Débit spécifique en L/s/km² : Qs = lame(mm) × 10⁶ / secondes/an. */
function debitSpecifique() {
  return (lameMm() * 1e6) / SEC_PER_YEAR;
}

/* Coefficient de ruissellement Cr = (P − E) / P. */
function coefficientRuissellement() {
  return prec > 0 ? lameMm() / prec : 0;
}

/* Densité de drainage Dd = longueur cumulée / aire (km/km²). */
function densiteDrainage() {
  return L_TOTAL_KM / AIRE_KM2;
}

/* Temps de propagation de l'onde de crue sur `distanceKm`, en heures. */
function tempsPropagation(distanceKm) {
  return (distanceKm * 1000) / VITESSE_ONDE / 3600;
}

/* Hydrogramme normalisé q(u) = u^a · exp(a·(1−u)), pic en u = 1. */
function hydroforme(u) {
  if (u < 0) return 0;
  const a = 3;
  return Math.pow(u, a) * Math.exp(a * (1 - u));
}

/* ---------- dessin du laboratoire (E012-06, E012-07, E012-09) ---------- */

function drawCanvas() {
  const canvas = dom.canvas;
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const pxW = Math.round(CANVAS_W * dpr);
  const pxH = Math.round(CANVAS_H * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const g = canvas.getContext('2d');
  if (!g || typeof g.setTransform !== 'function') return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, CANVAS_W, CANVAS_H);

  g.fillStyle = 'rgba(8,12,18,0.55)';
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const padL = 34;
  const padR = 12;
  const padT = 26;
  const padB = 26;
  const x0 = padL;
  const x1 = CANVAS_W - padR;
  const y0 = padT;
  const y1 = CANVAS_H - padB;
  const iw = x1 - x0;
  const ih = y1 - y0;

  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 1;
  g.strokeRect(x0, y0, iw, ih);

  /* Repère en croix : jamais la couleur seule (E012-10). */
  const cross = (x, y) => {
    g.strokeStyle = '#f4d69e';
    g.beginPath();
    g.moveTo(x - 5, y); g.lineTo(x + 5, y);
    g.moveTo(x, y - 5); g.lineTo(x, y + 5);
    g.stroke();
  };
  const label = (text, x, y, align) => {
    g.fillStyle = '#f4d69e';
    g.font = '10px sans-serif';
    g.textAlign = align || 'left';
    g.fillText(text, x, y);
  };

  if (mode === 'bilan') {
    /* E012-03 : bilan P = E + Q sous forme de barres horizontales. */
    const rows = [
      { name: 'P précipitations', value: prec, color: 'rgba(214,224,236,0.85)' },
      { name: 'E évapotranspiration', value: etr(), color: 'rgba(230,185,111,0.85)' },
      { name: 'Q lame écoulée', value: lameMm(), color: 'rgba(244,214,158,0.95)' },
    ];
    const scale = (v) => (clamp(v, 0, PREC_MAX) / PREC_MAX) * (iw - 8);
    label('Bilan hydrique annuel (mm)', x0, y0 - 10, 'left');
    rows.forEach((row, i) => {
      const by = y0 + 16 + i * ((ih - 22) / 3);
      g.fillStyle = 'rgba(214,224,236,0.78)';
      g.font = '10px sans-serif';
      g.textAlign = 'left';
      g.fillText(row.name, x0, by - 4);
      g.fillStyle = row.color;
      g.fillRect(x0, by, Math.max(1, scale(row.value)), 9);
      g.fillStyle = '#f4d69e';
      g.textAlign = 'right';
      g.fillText(`${dec(row.value, 0)} mm`, x1, by + 9);
    });
    /* Curseur de lecture animé : position déterministe = fonction du temps. */
    const sx = x0 + sweep * iw;
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(sx, y0); g.lineTo(sx, y1); g.stroke();
    g.setLineDash([]);
  } else if (mode === 'onde') {
    /* E012-06 : t = L / v, droite de temps de propagation. */
    const tMax = tempsPropagation(LONGUEUR_KM);
    const X = (km) => x0 + (clamp(km, 0, LONGUEUR_KM) / LONGUEUR_KM) * iw;
    const Y = (h) => y1 - (clamp(h, 0, tMax) / tMax) * ih;
    g.strokeStyle = 'rgba(244,214,158,0.95)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(X(0), Y(0));
    g.lineTo(X(LONGUEUR_KM), Y(tMax));
    g.stroke();
    label('Temps de propagation (h)', x0, y0 - 10, 'left');
    label('distance (km)', x0, y1 + 14, 'left');
    /* Croix au curseur de distance. */
    cross(X(dist), Y(tempsPropagation(dist)));
    /* Goutte animée à la distance = sweep × L. */
    const gx = X(sweep * LONGUEUR_KM);
    const gy = Y(tempsPropagation(sweep * LONGUEUR_KM));
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(gx, gy, 3.5, 0, Math.PI * 2); g.fill();
  } else {
    /* E012-07 : hydrogramme de crue q(u) = u³·exp(3(1−u)), pic en u = 1. */
    const TMAX = 2 * PIC_HEURES;
    const X = (h) => x0 + (clamp(h, 0, TMAX) / TMAX) * iw;
    const Y = (q) => y1 - clamp(q, 0, 1.05) * ih;
    g.strokeStyle = 'rgba(244,214,158,0.95)';
    g.lineWidth = 2;
    g.beginPath();
    for (let h = 0; h <= TMAX; h += 0.5) {
      const q = hydroforme(h / PIC_HEURES);
      if (h === 0) g.moveTo(X(h), Y(q));
      else g.lineTo(X(h), Y(q));
    }
    g.stroke();
    label('Hydrogramme — débit relatif au pic', x0, y0 - 10, 'left');
    label('temps (h)', x0, y1 + 14, 'left');
    /* Croix au temps de lecture issu du curseur de distance. */
    const th = (dist / LONGUEUR_KM) * TMAX;
    cross(X(th), Y(hydroforme(th / PIC_HEURES)));
    /* Goutte animée au temps = sweep × 2·pic. */
    const gh = sweep * TMAX;
    const gx = X(gh);
    const gy = Y(hydroforme(gh / PIC_HEURES));
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(gx, gy, 3.5, 0, Math.PI * 2); g.fill();
  }
}

/* ---------- boucle rAF unique, pause et mouvement réduit (E012-09/10) ---------- */

function canRun() {
  return typeof document === 'undefined' ? false : (!document.hidden && inView);
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  lastFrame = 0;
}

function ensureRaf() {
  if (rafId || !canRun()) return;
  if (reduced() || !playing) { drawCanvas(); return; }
  lastFrame = 0;
  rafId = requestAnimationFrame(frame);
}

function frame(now) {
  rafId = 0;
  if (!canRun()) { lastFrame = 0; return; }
  const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
  lastFrame = now;
  if (playing && !reduced()) {
    sweep = (sweep + dt * 0.00009) % 1;
  }
  drawCanvas();
  if (playing && !reduced()) rafId = requestAnimationFrame(frame);
  else lastFrame = 0;
}

function onVisibility() {
  if (typeof document === 'undefined') return;
  if (document.hidden) stopLoop();
  else if (playing) ensureRaf();
}

/* ---------- mise à jour du texte sémantique (E012-01, E012-04, E012-10) ---------- */

function updateReadout() {
  if (!dom.readout) return;
  const e = etr();
  const lame = lameMm();
  const q = debitM3s();
  const qs = debitSpecifique();
  const cr = coefficientRuissellement();
  const dd = densiteDrainage();
  const tp = tempsPropagation(dist);
  const pctRhin = Math.round((qs / QS_RHIN) * 100);
  const contexte = urban ? 'bassin urbanisé' : 'bassin naturel';

  const parts = [
    `Bilan (${contexte}) : P = ${dec(prec, 0)} mm/an, E = ${dec(e, 0)} mm/an, lame écoulée Q = ${dec(lame, 0)} mm/an.`,
    `Débit moyen = ${group(Math.round(q))} m³/s sur ${group(AIRE_KM2)} km² ; débit spécifique ${dec(qs, 1)} L/s/km², soit ${pctRhin} % du Rhin (${dec(QS_RHIN, 1)} L/s/km²).`,
    `Coefficient de ruissellement Cr = ${dec(cr, 2)} ; densité de drainage ${dec(dd, 2)} km/km².`,
    `À ${group(dist)} km, l'onde de crue met ${dec(tp, 1)} h (${dec(tp / 24, 1)} j) à ${dec(VITESSE_ONDE, 1)} m/s.`,
  ];
  if (mode === 'bilan') parts.push('Lecture : les barres comparent précipitations, évapotranspiration et lame écoulée.');
  else if (mode === 'onde') parts.push('Lecture : la droite donne le temps de propagation en fonction de la distance.');
  else parts.push(`Lecture : l'hydrogramme culmine à ${PIC_HEURES} h puis décroît (modèle déterministe).`);
  dom.readout.textContent = parts.join(' ');

  if (dom.precLabel) dom.precLabel.textContent = `${dec(prec, 0)} mm/an`;
  if (dom.distLabel) dom.distLabel.textContent = `${group(dist)} km`;
}

function updateTable() {
  if (!dom.tbody) return;
  const rows = [
    ['Précipitations P', `${dec(prec, 0)} mm/an`],
    ['Évapotranspiration E', `${dec(etr(), 0)} mm/an`],
    ['Lame d’écoulement Q = P − E', `${dec(lameMm(), 0)} mm/an`],
    ['Débit moyen', `${group(Math.round(debitM3s()))} m³/s`],
    ['Débit spécifique', `${dec(debitSpecifique(), 1)} L/s/km²`],
    ['Coefficient de ruissellement', dec(coefficientRuissellement(), 2)],
    ['Densité de drainage', `${dec(densiteDrainage(), 2)} km/km²`],
    ['Temps de propagation', `${dec(tempsPropagation(dist), 1)} h`],
  ];
  while (dom.tbody.firstChild) dom.tbody.removeChild(dom.tbody.firstChild);
  rows.forEach(([name, value]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = name;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    dom.tbody.appendChild(tr);
  });
}

function recompute(animate) {
  updateReadout();
  updateTable();
  if (animate) ensureRaf();
  else { drawCanvas(); }
}

/* ---------- interactions ---------- */

function setMode(next) {
  if (MODE_KEYS.indexOf(next) === -1) return;
  mode = next;
  if (dom.radios) dom.radios.forEach((r) => { r.checked = r.value === mode; });
  recompute(false);
}

function setPrec(value) {
  prec = clamp(Math.round(value / 50) * 50, PREC_MIN, PREC_MAX);
  if (dom.prec && String(prec) !== dom.prec.value) dom.prec.value = String(prec);
  recompute(false);
}

function setDist(value) {
  dist = clamp(Math.round(value / 25) * 25, 0, LONGUEUR_KM);
  if (dom.dist && String(dist) !== dom.dist.value) dom.dist.value = String(dist);
  recompute(false);
}

function setUrban(value) {
  urban = Boolean(value);
  if (dom.urban) dom.urban.checked = urban;
  recompute(false);
}

function reset() {
  setMode('bilan');
  setPrec(900);
  setDist(425);
  setUrban(false);
  if (playing) {
    playing = false;
    stopLoop();
  }
  if (dom.play) {
    dom.play.textContent = '▶ Animer la crue';
    dom.play.setAttribute('aria-pressed', 'false');
  }
  sweep = 0;
  recompute(false);
}

function onCanvasKey(event) {
  let used = true;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const i = MODE_KEYS.indexOf(mode);
    setMode(MODE_KEYS[(i + step + MODE_KEYS.length) % MODE_KEYS.length]);
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    setDist(dist + (event.key === 'ArrowUp' ? 25 : -25));
  } else if (event.key === 'Home') {
    setDist(0);
  } else if (event.key === 'End') {
    setDist(LONGUEUR_KM);
  } else {
    used = false;
  }
  if (used) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/* ---------- nettoyage entre deux rendus ---------- */

function teardown() {
  stopLoop();
  if (observer) {
    try { observer.disconnect(); } catch { /* déjà déconnecté */ }
    observer = null;
  }
  listeners.forEach(({ node, type, fn }) => {
    try { node.removeEventListener(type, fn); } catch { /* nœud déjà détaché */ }
  });
  listeners = [];
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  const root = layoutRef;
  if (root && typeof root.querySelectorAll === 'function') {
    Array.from(root.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => node.remove());
  }
  dom = {};
  layoutRef = null;
  inView = true;
}

/* ---------- greffon ---------- */

register('E012', (ctx) => {
  ctxRef = ctx;
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const el = ctx.el;
  const css = ctx.css;
  if (typeof el !== 'function' || typeof css !== 'function') return;

  /* E012-02 : feuille de style unique, tous les sélecteurs préfixés. */
  css('geography-v2-e012', `
  #${PFX}-panel{margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink)}
  #${PFX}-title{margin:0 0 6px;color:var(--gold-bright);font-size:13px;font-weight:700}
  .${PFX}-lead{margin:0 0 10px;color:var(--muted);font-size:11px;line-height:1.55}
  .${PFX}-fact{margin:0 0 6px;padding-left:9px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:11px;line-height:1.5}
  .${PFX}-fieldset{margin:0 0 10px;padding:8px;border:1px solid var(--line);border-radius:8px}
  .${PFX}-fieldset legend{padding:0 4px;color:var(--gold-bright);font-size:10px;font-weight:600}
  .${PFX}-choices{display:flex;flex-wrap:wrap;gap:6px}
  .${PFX}-choice{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:0 9px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:11px;cursor:pointer}
  .${PFX}-choice input{width:16px;height:16px;accent-color:var(--gold)}
  .${PFX}-choice:focus-within{outline:2px solid var(--gold-bright);outline-offset:2px}
  .${PFX}-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 8px}
  .${PFX}-row input[type="range"]{min-height:36px;flex:1 1 160px;accent-color:var(--gold)}
  .${PFX}-row-label{min-width:150px;color:var(--ink-soft);font-size:11px;font-variant-numeric:tabular-nums}
  #${PFX}-urban-row input{width:18px;height:18px;min-height:18px;accent-color:var(--gold)}
  #${PFX}-canvas{display:block;width:100%;max-width:${CANVAS_W}px;height:auto;margin:0 0 8px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:none}
  #${PFX}-canvas:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .${PFX}-table{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:11px}
  .${PFX}-table caption{margin-bottom:4px;color:var(--gold-bright);font-size:10px;text-align:left}
  .${PFX}-table th,.${PFX}-table td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
  .${PFX}-table td{color:var(--ink-soft);text-align:right}
  #${PFX}-readout{margin:0 0 8px;padding:7px 8px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:11px;line-height:1.55;background:rgba(230,185,111,.06)}
  .${PFX}-btn{min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:11px;cursor:pointer}
  .${PFX}-btn:hover{border-color:var(--gold)}
  .${PFX}-btn:focus-visible,#${PFX}-reset:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-limits{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
  #${PFX}-limits summary{min-height:36px;display:flex;align-items:center;color:var(--gold-bright);font-size:11px;cursor:pointer}
  #${PFX}-limits summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-limits p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.55}
  @media (prefers-reduced-motion:reduce){#${PFX}-canvas{cursor:default}}`);

  teardown();
  const layout = ctx.layout;
  const panel = layout.querySelector('.geo-panel') || layout;
  layoutRef = layout;

  /* E012-01 : contenu sémantique lisible sans JavaScript. */
  const section = el('section', '');
  section.id = `${PFX}-panel`;
  section.setAttribute('aria-labelledby', `${PFX}-title`);
  const heading = el('h2', '', 'Bassin versant et bilan hydrique');
  heading.id = `${PFX}-title`;
  const lead = el('p', `${PFX}-lead`, 'Un fleuve est alimenté par un bassin versant dont le bilan hydrique règle le débit. Les précipitations P se partagent entre évapotranspiration E et lame d’écoulement Q (P = E + Q, à stock annuel constant). Choisissez une vue, ajustez les précipitations et la distance, puis lisez les grandeurs calculées : tout est recalculé depuis ces formules, sans donnée externe.');
  section.append(heading, lead);

  /* Lexique sémantique : définitions réelles, indexables. */
  [
    'Un bassin versant est la surface dont toutes les eaux convergent vers un même exutoire ; sa limite est la ligne de partage des eaux.',
    'Le débit spécifique rapporte le débit à l’aire du bassin (L/s/km²) : il permet de comparer des cours de tailles très différentes.',
    'L’onde de crue est la propagation du surplus d’eau le long du cours ; sa vitesse (ici 2,5 m/s) donne le temps disponible pour l’alerte.',
  ].forEach((texte) => section.appendChild(el('p', `${PFX}-fact`, texte)));

  /* E012-01 : tableau sémantique des longueurs (différent du tableau de débits de la passe 1). */
  const lengths = document.createElement('table');
  lengths.className = `${PFX}-table`;
  lengths.appendChild(el('caption', '', 'Longueurs approximatives de grands fleuves (ordres de grandeur, km).'));
  const theadL = document.createElement('thead');
  const headL = document.createElement('tr');
  ['Fleuve', 'Longueur (km)'].forEach((text) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    headL.appendChild(th);
  });
  theadL.appendChild(headL);
  lengths.appendChild(theadL);
  const tbodyL = document.createElement('tbody');
  [
    ['Nil', '≈ 6 670'], ['Amazonie', '≈ 6 400'], ['Yangzi Jiang', '≈ 6 300'],
    ['Mississippi', '≈ 6 262'], ['Danube', '≈ 2 850'], ['Rhin', '≈ 1 230'],
    ['Loire', '≈ 1 006'],
  ].forEach(([name, value], i) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = name;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    tbodyL.appendChild(tr);
    void i;
  });
  lengths.appendChild(tbodyL);
  section.appendChild(lengths);

  /* E012-09 : radiogroupe natif pour le choix unique de la vue. */
  const fieldset = el('fieldset', `${PFX}-fieldset`);
  fieldset.id = `${PFX}-view-group`;
  fieldset.appendChild(el('legend', '', 'Vue du laboratoire (choix unique)'));
  const choices = el('div', `${PFX}-choices`);
  const radios = [];
  MODES.forEach((m) => {
    const labelNode = el('label', `${PFX}-choice`);
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${PFX}-view`;
    input.value = m.key;
    input.id = `${PFX}-radio-${m.key}`;
    input.checked = m.key === mode;
    on(input, 'change', () => { if (input.checked) setMode(m.key); });
    labelNode.append(input, el('span', '', m.label));
    choices.appendChild(labelNode);
    radios.push(input);
  });
  fieldset.appendChild(choices);
  section.appendChild(fieldset);

  /* Curseur de précipitations, avec valeur textuelle visible. */
  const precRow = el('div', `${PFX}-row`);
  const precRange = document.createElement('input');
  precRange.type = 'range';
  precRange.min = String(PREC_MIN);
  precRange.max = String(PREC_MAX);
  precRange.step = '50';
  precRange.value = String(prec);
  precRange.id = `${PFX}-prec`;
  precRange.setAttribute('aria-label', 'Précipitations annuelles, de 400 à 1 600 millimètres par an');
  on(precRange, 'input', () => setPrec(Number(precRange.value)));
  const precLabel = el('label', `${PFX}-row-label`, '900 mm/an');
  precLabel.id = `${PFX}-prec-label`;
  precLabel.htmlFor = precRange.id;
  precRow.append(precLabel, precRange);
  section.appendChild(precRow);

  /* Curseur de distance, avec valeur textuelle visible. */
  const distRow = el('div', `${PFX}-row`);
  const distRange = document.createElement('input');
  distRange.type = 'range';
  distRange.min = '0';
  distRange.max = String(LONGUEUR_KM);
  distRange.step = '25';
  distRange.value = String(dist);
  distRange.id = `${PFX}-dist`;
  distRange.setAttribute('aria-label', 'Distance depuis la source, de 0 à 850 kilomètres');
  on(distRange, 'input', () => setDist(Number(distRange.value)));
  const distLabel = el('label', `${PFX}-row-label`, '425 km');
  distLabel.id = `${PFX}-dist-label`;
  distLabel.htmlFor = distRange.id;
  distRow.append(distLabel, distRange);
  section.appendChild(distRow);

  /* E012-08 : bascule indépendante (case à cocher), pas un choix unique. */
  const urbanRow = el('div', `${PFX}-row`);
  urbanRow.id = `${PFX}-urban-row`;
  const urbanBox = document.createElement('input');
  urbanBox.type = 'checkbox';
  urbanBox.id = `${PFX}-urban`;
  urbanBox.checked = urban;
  on(urbanBox, 'change', () => setUrban(urbanBox.checked));
  const urbanLabel = el('label', `${PFX}-row-label`, 'Bassin urbanisé (évapotranspiration réduite)');
  urbanLabel.htmlFor = urbanBox.id;
  urbanRow.append(urbanBox, urbanLabel);
  section.appendChild(urbanRow);

  /* E012-09 : canvas laboratoire, tabindex et équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = `${PFX}-canvas`;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire hydrologique. Flèches gauche et droite : changer de vue ; flèches haut et bas : déplacer le curseur de distance ; Début et Fin pour les extrémités.');
  on(canvas, 'keydown', onCanvasKey);
  section.appendChild(canvas);

  /* Tableau dynamique du bilan, pré-rempli avec les valeurs par défaut. */
  const table = document.createElement('table');
  table.className = `${PFX}-table`;
  table.id = `${PFX}-table`;
  table.appendChild(el('caption', '', 'Bilan hydrique calculé pour le bassin de 12 000 km².'));
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((text) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  tbody.id = `${PFX}-tbody`;
  table.appendChild(tbody);
  section.appendChild(table);

  /* E012-10 : annonce accessible, texte visible et indexable. */
  const readout = el('p', '', 'Bilan (bassin naturel) : P = 900 mm/an, E = 450 mm/an, lame écoulée Q = 450 mm/an. Débit moyen = 171 m³/s sur 12 000 km² ; débit spécifique 14,3 L/s/km², soit 113 % du Rhin (12,6 L/s/km²). Coefficient de ruissellement Cr = 0,50 ; densité de drainage 0,30 km/km². À 425 km, l’onde de crue met 47,2 h (2,0 j) à 2,5 m/s. Lecture : les barres comparent précipitations, évapotranspiration et lame écoulée.');
  readout.id = `${PFX}-readout`;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  section.appendChild(readout);

  /* Boutons : aria-pressed réservé à la bascule indépendante d'animation. */
  const play = el('button', `${PFX}-btn`, '▶ Animer la crue');
  play.type = 'button';
  play.id = `${PFX}-play`;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', canvas.id);
  on(play, 'click', () => {
    playing = !playing;
    if (!playing) stopLoop(); else ensureRaf();
    play.textContent = playing ? '■ Arrêter l’animation' : '▶ Animer la crue';
    play.setAttribute('aria-pressed', playing ? 'true' : 'false');
  });
  section.appendChild(play);

  const resetBtn = el('button', `${PFX}-btn`, 'Réinitialiser le laboratoire');
  resetBtn.type = 'button';
  resetBtn.id = `${PFX}-reset`;
  on(resetBtn, 'click', reset);
  section.appendChild(resetBtn);

  /* Limites explicites : schéma déterministe, pas une mesure de terrain. */
  const limits = el('details', '');
  limits.id = `${PFX}-limits`;
  limits.appendChild(el('summary', '', 'Limites de ce modèle hydrologique'));
  limits.appendChild(el('p', '', 'Le stock annuel ΔS est supposé nul : le bilan P = E + Q est un ordre de grandeur, pas un relevé. L’évapotranspiration est fixée (450 mm/an en milieu naturel, 300 mm/an en milieu urbanisé) et ne dépend pas de la température. L’onde de crue est propagée à vitesse constante (2,5 m/s), sans atténuation ni diffusivité, et l’hydrogramme suit une loi gamma normalisée de pic 24 h : la forme réelle d’une crue dépend du bassin et de l’averse.'));
  section.appendChild(limits);

  panel.appendChild(section);

  dom = {
    panel: section, canvas, prec: precRange, precLabel, dist: distRange,
    distLabel, urban: urbanBox, readout, tbody, radios, play,
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof IntersectionObserver === 'function') {
      try {
        observer = new IntersectionObserver((entries) => {
          const entry = entries[0];
          inView = !entry || entry.isIntersecting;
          if (!inView) stopLoop();
          else if (playing) ensureRaf();
        });
        observer.observe(section);
      } catch { /* observation indisponible : la boucle reste active. */ }
    }
  }

  /* Valeurs initiales cohérentes avec le texte statique, sans animation. */
  recompute(false);
});
