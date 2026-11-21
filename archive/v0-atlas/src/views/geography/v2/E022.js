import { register } from './registry.js';

/* Lentille V2 E022 — Dynamique littorale et dérive sédimentaire.
 *
 * Seconde passe sur la lentille E022 (vue GÉOGRAPHIE). Dix chantiers inédits,
 * tous réellement implémentés : E022-01 … E022-10. Là où la passe 1 montrait
 * l'érosion différentielle d'un cap au fil du temps, cette lentille s'intéresse
 * au fonctionnement actuel du littoral : réfraction de la houle, courant de
 * dérive, transport sédimentaire, zone de balancement des marées et évolution
 * séquentielle d'une côte rocheuse (grotte → arche → stack → rocher résiduel).
 *
 * Un seul import, un seul register('E022', …), un seul identifiant CSS
 * `geography-v2-e022`, tous les id préfixés `geography-v2-e022-`, aucun réseau,
 * aucune sortie de débogage, aucune source aléatoire. Le texte est sémantique et reste
 * lisible et indexable sans JavaScript : le canvas n'est qu'un laboratoire
 * déterministe qui illustre des formules recalculées depuis l'état.
 */

const PFX = 'geography-v2-e022';
const PANEL_ID = PFX + '-panel';

/* Constantes pédagogiques (ordres de grandeur, jamais des mesures de terrain). */
const H_REF = 2;              // hauteur de référence au brisement (m)
const V_REF = 0.5;            // vitesse de dérive de référence (m/s)
const SHOAL = 1.3;            // facteur de shoaling H_b / H_0
const REFRACTION = 0.65;      // sin(theta_b)/sin(theta_0), loi de Snell approchée
const G = 9.81;               // accélération de la pesanteur (m/s²)
const K_V = 0.22;             // coefficient du courant de dérive
const CANVAS_W = 320;         // largeur logique du canvas, px CSS
const CANVAS_H = 212;         // hauteur logique du canvas, px CSS

const MODES = [
  { key: 'derive', label: 'Dérive littorale (plan)' },
  { key: 'profil', label: 'Profil de plage et marée' },
  { key: 'evolution', label: 'Évolution d’une côte rocheuse' },
];
const MODE_KEYS = MODES.map((m) => m.key);

/* État de module : survit aux re-renders complets de la coque. */
let ctxRef = null;
let layoutRef = null;
let rafId = 0;
let lastFrame = 0;
let playing = false;
let phase = 0.25;             // phase de houle déterministe, dans [0,1)
let inView = true;
let observer = null;
let dom = {};
let listeners = [];

let mode = 'derive';
let houle = 2;                // H_0, hauteur de houle au large (m)
let angle = 25;               // theta_0, incidence au large (degrés)
let pente = 8;                // pente de plage tan(beta), en pourcentage
let maree = 3;                // amplitude de marée (m)
let mareeHaute = true;        // bascule indépendante : état de la marée

/* ---------- utilitaires déterministes (aucun aléa, aucune console) ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dec(value, digits) {
  return Number(value).toFixed(digits).replace('.', ',');
}

function group(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function reduced() {
  return Boolean(ctxRef && typeof ctxRef.reducedMotion === 'function' && ctxRef.reducedMotion());
}

function on(node, type, fn) {
  if (!node || typeof node.addEventListener !== 'function') return;
  node.addEventListener(type, fn);
  listeners.push({ node, type, fn });
}

/* ---------- formules du littoral (E022-04, E022-06, E022-08, E022-09) ---------- */

/* Hauteur au brisement : H_b = SHOAL × H_0 (shoaling simplifié). */
function hauteurBrisement() {
  return SHOAL * houle;
}

/* Angle au brisement, radians : sin(theta_b) = REFRACTION × sin(theta_0). */
function angleBrisementRad() {
  const t0 = (angle * Math.PI) / 180;
  return Math.asin(clamp(REFRACTION * Math.sin(t0), 0, 1));
}

function angleBrisementDeg() {
  return (angleBrisementRad() * 180) / Math.PI;
}

/* Courant de dérive : v ∝ sqrt(g·H_b)·sin(2 theta_b) ( forme CERC simplifiée ). */
function vitesseDerive() {
  const hb = hauteurBrisement();
  return K_V * Math.sqrt(G * hb) * Math.sin(2 * angleBrisementRad());
}

/* Indice de transport normalisé : I = (H_b/H_ref)² · sin(2 theta_b). */
function indiceTransport() {
  const hb = hauteurBrisement();
  return Math.pow(hb / H_REF, 2) * Math.sin(2 * angleBrisementRad());
}

/* Largeur de la zone de balancement : L = amplitude de marée / tan(beta). */
function largeurBalancement() {
  const tanBeta = Math.max(0.001, pente / 100);
  return maree / tanBeta;
}

/* Stade d'évolution d'une côte rocheuse, fonction de la houle (1…4). */
function stadeEvolution() {
  return clamp(1 + Math.floor((houle - 0.5) / 1.0), 1, 4);
}

/* ---------- dessin du laboratoire (E022-05, E022-06, E022-10) ---------- */

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
  g.fillStyle = 'rgba(9,20,29,0.82)';
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (mode === 'derive') drawDerive(g);
  else if (mode === 'profil') drawProfil(g);
  else drawEvolution(g);
}

/* Repère non coloré : croix et étiquette (E022-08). */
function cross(g, x, y) {
  g.strokeStyle = '#f4d69e';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - 5, y); g.lineTo(x + 5, y);
  g.moveTo(x, y - 5); g.lineTo(x, y + 5);
  g.stroke();
}

function label(g, text, x, y, align) {
  g.fillStyle = '#f4d69e';
  g.font = '10px sans-serif';
  g.textAlign = align || 'left';
  g.fillText(text, x, y);
  g.textAlign = 'left';
}

/* Mode 1 : plan du littoral, crêtes réfractées et flèche de dérive. */
function drawDerive(g) {
  const yCoast = CANVAS_H * 0.72;
  const tb = angleBrisementRad();

  /* Mer et crêtes de houle inclinées de theta_b par rapport à la côte. */
  g.fillStyle = 'rgba(20,52,70,0.75)';
  g.fillRect(0, 0, CANVAS_W, yCoast);
  g.save();
  g.translate(CANVAS_W / 2, CANVAS_H * 0.32);
  g.rotate(tb);
  g.strokeStyle = 'rgba(180,224,238,0.75)';
  g.lineWidth = 2;
  for (let k = -4; k <= 4; k += 1) {
    const y = k * 20 + phase * 20;
    g.beginPath();
    g.moveTo(-CANVAS_W, y);
    g.lineTo(CANVAS_W, y);
    g.stroke();
  }
  g.restore();

  /* Terre et ligne de rivage. */
  g.fillStyle = 'rgba(107,90,60,0.85)';
  g.fillRect(0, yCoast, CANVAS_W, CANVAS_H - yCoast);
  g.strokeStyle = '#e6b96f';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, yCoast);
  g.lineTo(CANVAS_W, yCoast);
  g.stroke();

  /* Flèche de dérive : longueur ∝ vitesse, jamais la couleur seule. */
  const v = vitesseDerive();
  const arrowLen = clamp(28 + v * 90, 28, CANVAS_W - 56);
  const ay = yCoast - 16;
  g.strokeStyle = '#f4d69e';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(24, ay); g.lineTo(24 + arrowLen, ay);
  g.moveTo(24 + arrowLen - 7, ay - 4); g.lineTo(24 + arrowLen, ay);
  g.lineTo(24 + arrowLen - 7, ay + 4);
  g.stroke();

  /* Traceur sédimentaire animé le long de la côte. */
  const tx = 24 + phase * arrowLen;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(tx, yCoast - 5, 3.2, 0, Math.PI * 2); g.fill();
  cross(g, tx, yCoast - 5);

  label(g, 'Houle H_b = ' + dec(hauteurBrisement(), 1) + ' m', 8, 16, 'left');
  label(g, 'θ_b = ' + dec(angleBrisementDeg(), 1) + '°', CANVAS_W - 8, 16, 'right');
  label(g, 'Dérive → ' + dec(v, 2) + ' m/s', 24, ay - 8, 'left');
  label(g, 'Rivage', CANVAS_W - 8, CANVAS_H - 8, 'right');
  label(g, 'N ↑', CANVAS_W - 8, 32, 'right');
}

/* Mode 2 : profil de plage, deux lignes d'eau et zone de balancement. */
function drawProfil(g) {
  const largeurPx = clamp((largeurBalancement() / 60) * (CANVAS_W - 90), 6, CANVAS_W - 90);
  const xDune = 34;
  const xHigh = CANVAS_W * 0.44;
  const xLow = xHigh + largeurPx;
  const yDune = CANVAS_H * 0.30;
  const yWater = CANVAS_H * 0.70;
  const tanBeta = pente / 100;

  /* Profil du sol : dune → plage → offshore. */
  g.strokeStyle = '#e6b96f';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(8, yDune - 26);
  g.lineTo(xDune, yDune);
  g.lineTo(xHigh, yWater - 16);
  g.lineTo(xLow, yWater);
  g.lineTo(CANVAS_W - 6, yWater + clamp(tanBeta * 120, 6, 26));
  g.stroke();
  g.fillStyle = 'rgba(107,90,60,0.55)';
  g.beginPath();
  g.moveTo(8, yDune - 26);
  g.lineTo(xDune, yDune);
  g.lineTo(xHigh, yWater - 16);
  g.lineTo(xLow, yWater);
  g.lineTo(CANVAS_W - 6, yWater + clamp(tanBeta * 120, 6, 26));
  g.lineTo(CANVAS_W - 6, CANVAS_H);
  g.lineTo(8, CANVAS_H);
  g.closePath();
  g.fill();

  /* Bande de balancement entre marée haute et marée basse. */
  g.fillStyle = 'rgba(70,140,170,0.28)';
  g.fillRect(xHigh, yWater - 18, largeurPx, 22);
  g.strokeStyle = 'rgba(180,224,238,0.85)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(xHigh, yWater - 18); g.lineTo(xLow, yWater - 18);
  g.moveTo(xHigh, yWater + 4); g.lineTo(xLow, yWater + 4);
  g.stroke();

  /* Ligne d'eau active selon l'état de la marée (bascule indépendante). */
  const xActive = mareeHaute ? xHigh : xLow;
  g.fillStyle = 'rgba(40,110,150,0.55)';
  g.fillRect(xActive, yWater - 16, CANVAS_W - xActive, 20);
  cross(g, xActive, yWater - 16);

  /* Swash animé entre les deux lignes d'eau. */
  const xSwash = xHigh + phase * largeurPx;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(xSwash, yWater - 16, 6, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();

  label(g, 'Dune', xDune - 4, yDune - 32, 'left');
  label(g, 'Marée haute', xHigh, yWater - 24, 'center');
  label(g, 'Marée basse', xLow, CANVAS_H - 8, 'center');
  label(g, 'Balancement = ' + dec(largeurBalancement(), 1) + ' m', xHigh + 6, yWater + 24, 'left');
  label(g, 'tan β = ' + dec(tanBeta, 2), CANVAS_W - 8, 16, 'right');
}

/* Mode 3 : évolution séquentielle d'une côte rocheuse (repères non colorés). */
function drawEvolution(g) {
  const stage = stadeEvolution();
  const names = ['1 Grotte', '2 Arche', '3 Stack', '4 Rocher résiduel'];
  const cellW = CANVAS_W / 4;
  const baseY = CANVAS_H * 0.74;

  for (let i = 0; i < 4; i += 1) {
    const cx = cellW * (i + 0.5);
    /* Socle rocheux commun. */
    g.fillStyle = 'rgba(107,90,60,0.9)';
    g.fillRect(cellW * i + 6, baseY, cellW - 12, 14);
    g.strokeStyle = '#e6b96f';
    g.lineWidth = 1.5;

    if (i === 0) {
      /* Grotte : échancrure à la base du promontoire. */
      g.beginPath();
      g.moveTo(cx - 22, baseY); g.lineTo(cx - 22, baseY - 30);
      g.lineTo(cx + 22, baseY - 30); g.lineTo(cx + 22, baseY);
      g.stroke();
      g.fillStyle = 'rgba(9,20,29,0.95)';
      g.fillRect(cx - 9, baseY - 14, 18, 14);
    } else if (i === 1) {
      /* Arche : ouverture traversante sous un pont de roche. */
      g.beginPath();
      g.moveTo(cx - 22, baseY); g.lineTo(cx - 22, baseY - 34);
      g.lineTo(cx + 22, baseY - 34); g.lineTo(cx + 22, baseY);
      g.stroke();
      g.fillStyle = 'rgba(9,20,29,0.95)';
      g.fillRect(cx - 13, baseY - 17, 26, 17);
    } else if (i === 2) {
      /* Stack : pilier isolé, traces de l'arche effondrée. */
      g.fillStyle = 'rgba(107,90,60,0.9)';
      g.fillRect(cx - 9, baseY - 40, 18, 40);
      g.strokeStyle = '#e6b96f';
      g.strokeRect(cx - 9, baseY - 40, 18, 40);
      g.fillStyle = 'rgba(9,20,29,0.95)';
      g.fillRect(cx - 24, baseY - 5, 10, 5);
      g.fillRect(cx + 14, baseY - 5, 10, 5);
    } else {
      /* Rocher résiduel : moignon bas (stump). */
      g.fillStyle = 'rgba(107,90,60,0.9)';
      g.fillRect(cx - 12, baseY - 12, 24, 12);
      g.strokeStyle = '#e6b96f';
      g.strokeRect(cx - 12, baseY - 12, 24, 12);
    }

    /* Repère du stade courant : crochet plein, distinct de la couleur. */
    if (i + 1 === stage) {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx - 24, baseY + 20);
      g.lineTo(cx + 24, baseY + 20);
      g.moveTo(cx - 24, baseY + 16);
      g.lineTo(cx - 24, baseY + 24);
      g.moveTo(cx + 24, baseY + 16);
      g.lineTo(cx + 24, baseY + 24);
      g.stroke();
    }
    label(g, names[i], cx, 22, 'center');
  }
  label(g, 'Stade ' + stage + '/4 — houle ' + dec(houle, 1) + ' m', CANVAS_W / 2, CANVAS_H - 10, 'center');
}

/* ---------- boucle rAF unique, pause et mouvement réduit (E022-06/10) ---------- */

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
    phase = (phase + dt * 0.00035) % 1;
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

/* ---------- mise à jour du texte sémantique (E022-01, E022-04, E022-08) ---------- */

function updateReadout() {
  if (!dom.readout) return;
  const hb = hauteurBrisement();
  const tb = angleBrisementDeg();
  const v = vitesseDerive();
  const pct = (v / V_REF) * 100;
  const I = indiceTransport();
  const L = largeurBalancement();
  const contexte = mareeHaute ? 'marée haute' : 'marée basse';

  const parts = [
    `Houle au large H₀ = ${dec(houle, 1)} m ; hauteur au brisement H_b = ${dec(hb, 1)} m (facteur ${dec(SHOAL, 1)}).`,
    `Incidence θ₀ = ${dec(angle, 0)}° ; après réfraction θ_b = ${dec(tb, 1)}° (facteur ${dec(REFRACTION, 2)}).`,
    `Courant de dérive v = ${dec(v, 2)} m/s, soit ${dec(pct, 0)} % de la référence ${dec(V_REF, 2)} m/s.`,
    `Indice de transport I = ${dec(I, 2)} (maximum théorique à θ_b = 45°).`,
    `Zone de balancement (${contexte}) = ${dec(L, 1)} m pour une marée de ${dec(maree, 1)} m et une pente de ${dec(pente, 0)} %.`,
  ];
  const lecture = mode === 'derive'
    ? 'Lecture : les crêtes sont inclinées de θ_b et le traceur suit la flèche de dérive.'
    : mode === 'profil'
      ? 'Lecture : la bande entre les deux lignes d’eau est la zone de balancement.'
      : `Lecture : le stade ${stadeEvolution()}/4 est atteint pour cette houle.`;
  parts.push(lecture);
  dom.readout.textContent = parts.join(' ');

  if (dom.valHoule) dom.valHoule.textContent = dec(houle, 1) + ' m';
  if (dom.valAngle) dom.valAngle.textContent = dec(angle, 0) + '°';
  if (dom.valPente) dom.valPente.textContent = dec(pente, 0) + ' %';
  if (dom.valMaree) dom.valMaree.textContent = dec(maree, 1) + ' m';
}

function updateTable() {
  if (!dom.tbody) return;
  const rows = [
    ['Hauteur au brisement H_b', dec(hauteurBrisement(), 2) + ' m'],
    ['Angle réfracté θ_b', dec(angleBrisementDeg(), 1) + ' °'],
    ['Vitesse de dérive v', dec(vitesseDerive(), 2) + ' m/s'],
    ['Référence de vitesse', dec(V_REF, 2) + ' m/s'],
    ['Indice de transport I', dec(indiceTransport(), 2)],
    ['Zone de balancement', dec(largeurBalancement(), 1) + ' m'],
    ['Stade de côte rocheuse', stadeEvolution() + ' / 4'],
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
  else drawCanvas();
}

/* ---------- interactions ---------- */

function setMode(next) {
  if (MODE_KEYS.indexOf(next) === -1) return;
  mode = next;
  if (dom.radios) dom.radios.forEach((r) => { r.checked = r.value === mode; });
  recompute(false);
}

function setHoule(value) {
  houle = clamp(Math.round(value * 10) / 10, 0.5, 4);
  if (dom.houle && String(houle) !== dom.houle.value) dom.houle.value = String(houle);
  recompute(false);
}

function setAngle(value) {
  angle = clamp(Math.round(value), 0, 60);
  if (dom.angle && String(angle) !== dom.angle.value) dom.angle.value = String(angle);
  recompute(false);
}

function setPente(value) {
  pente = clamp(Math.round(value), 2, 20);
  if (dom.pente && String(pente) !== dom.pente.value) dom.pente.value = String(pente);
  recompute(false);
}

function setMaree(value) {
  maree = clamp(Math.round(value * 2) / 2, 0, 8);
  if (dom.maree && String(maree) !== dom.maree.value) dom.maree.value = String(maree);
  recompute(false);
}

function setMareeHaute(value) {
  mareeHaute = Boolean(value);
  if (dom.mareeHaute) dom.mareeHaute.checked = mareeHaute;
  recompute(false);
}

function reset() {
  setMode('derive');
  setHoule(2);
  setAngle(25);
  setPente(8);
  setMaree(3);
  setMareeHaute(true);
  playing = false;
  stopLoop();
  phase = 0.25;
  if (dom.play) {
    dom.play.textContent = '▶ Animer la houle';
    dom.play.setAttribute('aria-pressed', 'false');
  }
  recompute(false);
}

function onCanvasKey(event) {
  let used = true;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const i = MODE_KEYS.indexOf(mode);
    setMode(MODE_KEYS[(i + step + MODE_KEYS.length) % MODE_KEYS.length]);
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    setAngle(angle + (event.key === 'ArrowUp' ? 5 : -5));
  } else if (event.key === 'Home') {
    setAngle(0);
  } else if (event.key === 'End') {
    setAngle(60);
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
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibility);
    const root = layoutRef;
    if (root && typeof root.querySelectorAll === 'function') {
      Array.from(root.querySelectorAll('[id^="' + PFX + '-"]')).forEach((node) => node.remove());
    }
  }
  dom = {};
  layoutRef = null;
  inView = true;
}

/* ---------- greffon ---------- */

register('E022', (ctx) => {
  ctxRef = ctx;
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const el = ctx.el;
  const css = ctx.css;
  if (typeof el !== 'function' || typeof css !== 'function') return;

  /* E022-02 : feuille de style unique, tous les sélecteurs préfixés. */
  css('geography-v2-e022', `
  #${PFX}-panel{margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink)}
  #${PFX}-title{margin:0 0 6px;color:var(--gold-bright);font-size:13px;font-weight:700}
  .${PFX}-subtitle{margin:12px 0 4px;color:var(--gold-bright);font-size:11px;font-weight:600}
  .${PFX}-lead{margin:0 0 10px;color:var(--muted);font-size:11px;line-height:1.55}
  .${PFX}-fact{margin:0 0 6px;padding-left:9px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:11px;line-height:1.5}
  .${PFX}-glossary{margin:6px 0;font-size:11px;line-height:1.5}
  .${PFX}-glossary dt{margin-top:6px;color:var(--gold-bright);font-weight:700}
  .${PFX}-glossary dd{margin:1px 0 0 12px;color:var(--muted)}
  .${PFX}-table{width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:11px}
  .${PFX}-table caption{margin-bottom:4px;color:var(--gold-bright);font-size:10px;text-align:left}
  .${PFX}-table th,.${PFX}-table td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
  .${PFX}-table td{color:var(--ink-soft);text-align:right}
  .${PFX}-fieldset{margin:0 0 10px;padding:8px;border:1px solid var(--line);border-radius:8px}
  .${PFX}-fieldset legend{padding:0 4px;color:var(--gold-bright);font-size:10px;font-weight:600}
  .${PFX}-choices{display:flex;flex-wrap:wrap;gap:6px}
  .${PFX}-choice{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:0 9px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:11px;cursor:pointer}
  .${PFX}-choice input{width:16px;height:16px;accent-color:var(--gold)}
  .${PFX}-choice:focus-within{outline:2px solid var(--gold-bright);outline-offset:2px}
  .${PFX}-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 8px}
  .${PFX}-row input[type="range"]{min-height:36px;flex:1 1 160px;accent-color:var(--gold)}
  .${PFX}-row-label{min-width:150px;color:var(--ink-soft);font-size:11px;font-variant-numeric:tabular-nums}
  #${PFX}-maree-haute-row input{width:18px;height:18px;min-height:18px;accent-color:var(--gold)}
  #${PFX}-canvas{display:block;width:100%;max-width:${CANVAS_W}px;height:auto;margin:0 0 8px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:none}
  #${PFX}-canvas:focus-visible,.${PFX}-btn:focus-visible,#${PFX}-reset:focus-visible,
  .${PFX}-row input:focus-visible,#${PFX}-limits summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-readout{margin:0 0 8px;padding:7px 8px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:11px;line-height:1.55;background:rgba(230,185,111,.06)}
  .${PFX}-btn{min-height:44px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:11px;cursor:pointer}
  .${PFX}-btn:hover{border-color:var(--gold)}
  #${PFX}-limits{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
  #${PFX}-limits summary{min-height:36px;display:flex;align-items:center;color:var(--gold-bright);font-size:11px;cursor:pointer}
  #${PFX}-limits p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.55}
  #${PFX}-crossref{margin:8px 0 0;color:var(--muted);font-size:10px;font-style:italic;line-height:1.5}`);

  teardown();
  const layout = ctx.layout;
  const panel = layout.querySelector('.geo-panel') || layout;
  layoutRef = layout;

  /* E022-01 : contenu sémantique lisible sans JavaScript. */
  const section = el('section', '');
  section.id = `${PFX}-panel`;
  section.setAttribute('aria-labelledby', `${PFX}-title`);
  const heading = el('h2', '', 'Dynamique littorale et dérive sédimentaire (V2)');
  heading.id = `${PFX}-title`;
  section.append(heading);
  section.appendChild(el('p', `${PFX}-lead`,
    'Le littoral est une interface mobile : la houle, réfractée en approchant de la côte, met en mouvement un courant de dérive qui transporte les sédiments parallèlement au rivage. Les marées déplacent la zone de balancement des vagues et, sur une côte rocheuse, l’érosion successive transforme une grotte en arche, puis en stack et en rocher résiduel. Ce laboratoire calcule ces grandeurs depuis trois réglages, sans donnée externe.'));

  /* E022-02 : glossaire en liste de définitions, réel, indexable. */
  section.appendChild(el('h3', `${PFX}-subtitle`, 'Vocabulaire du littoral'));
  const dl = document.createElement('dl');
  dl.className = `${PFX}-glossary`;
  [
    ['Dérive littorale', 'Transport de sédiments le long de la côte, provoqué par un courant oblique créé par la houle.'],
    ['Réfraction', 'Déviation des crêtes de houle en eaux peu profondes : l’angle d’incidence au brisement devient plus faible qu’au large.'],
    ['Zone de balancement', 'Bande de littoral parcourue par la mer entre marée haute et marée basse ; sa largeur dépend de l’amplitude de la marée et de la pente.'],
    ['Stack', 'Pilier rocheux isolé, reste d’une arche dont le toit s’est effondré.'],
  ].forEach(([term, definition]) => {
    dl.appendChild(el('dt', '', term));
    dl.appendChild(el('dd', '', definition));
  });
  section.appendChild(dl);

  /* E022-03 : typologie en tableau à en-têtes explicites. */
  section.appendChild(el('h3', `${PFX}-subtitle`, 'Grands types de côtes'));
  const table = document.createElement('table');
  table.className = `${PFX}-table`;
  table.appendChild(el('caption', '', 'Exemples de côtes, leur localisation et le processus dominant (ordre de grandeur).'));
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Côte', 'Localisation', 'Type', 'Forme dominante'].forEach((text) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbodyTypo = document.createElement('tbody');
  [
    ['Falaises de Normandie', 'France', 'Érosion', 'Falaise, plateforme d’abrasion'],
    ['Camargue', 'France', 'Accumulation', 'Delta, étangs'],
    ['Côte basque', 'France / Espagne', 'Érosion + dérive', 'Falaises, plages'],
    ['Îles barrière', 'Floride (États-Unis)', 'Accumulation', 'Cordons, lagunes'],
    ['Côte volcanique', 'La Réunion', 'Volcanique', 'Falaises, sables noirs'],
    ['Fjords', 'Norvège', 'Glaciaire', 'Fjords, dalles rocheuses'],
  ].forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => tr.appendChild(el('td', '', cell)));
    tbodyTypo.appendChild(tr);
  });
  table.appendChild(tbodyTypo);
  section.appendChild(table);

  /* E022-04 : formules énoncées en texte, calculées et non recopiées. */
  section.appendChild(el('h3', `${PFX}-subtitle`, 'Trois relations calculées'));
  [
    'H_b = 1,3 × H₀ : la houle grandit en approchant du rivage (shoaling).',
    'sin θ_b = 0,65 × sin θ₀ : la réfraction réduit l’angle d’incidence au brisement.',
    'v ∝ √(g·H_b) × sin(2 θ_b) : le courant de dérive est maximal vers θ_b = 45°.',
  ].forEach((text) => section.appendChild(el('p', `${PFX}-fact`, text)));

  /* E022-07 : radiogroupe natif pour le choix unique du mode. */
  const fieldset = el('fieldset', `${PFX}-fieldset`);
  fieldset.id = `${PFX}-view-group`;
  fieldset.setAttribute('role', 'radiogroup');
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

  /* E022-07 : curseurs étiquetés, valeurs textuelles visibles. */
  const makeRange = (id, labelText, min, max, step, value, setState, store) => {
    const row = el('div', `${PFX}-row`);
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(value);
    range.id = `${PFX}-${id}`;
    const lab = el('label', `${PFX}-row-label`, labelText);
    lab.htmlFor = range.id;
    on(range, 'input', () => setState(Number(range.value)));
    row.append(lab, range);
    section.appendChild(row);
    dom[store] = range;
    return lab;
  };
  dom.valHoule = makeRange('houle', `Houle H₀ = ${dec(houle, 1)} m`, 0.5, 4, 0.1, houle, setHoule, 'houle');
  dom.valAngle = makeRange('angle', `Incidence θ₀ = ${dec(angle, 0)}°`, 0, 60, 1, angle, setAngle, 'angle');
  dom.valPente = makeRange('pente', `Pente = ${dec(pente, 0)} %`, 2, 20, 1, pente, setPente, 'pente');
  dom.valMaree = makeRange('maree', `Marée = ${dec(maree, 1)} m`, 0, 8, 0.5, maree, setMaree, 'maree');

  /* E022-07 : bascule indépendante, pas un choix unique. */
  const tideRow = el('div', `${PFX}-row`);
  tideRow.id = `${PFX}-maree-haute-row`;
  const tideBox = document.createElement('input');
  tideBox.type = 'checkbox';
  tideBox.id = `${PFX}-maree-haute`;
  tideBox.checked = mareeHaute;
  on(tideBox, 'change', () => setMareeHaute(tideBox.checked));
  const tideLabel = el('label', `${PFX}-row-label`, 'Marée haute (sinon marée basse)');
  tideLabel.htmlFor = tideBox.id;
  tideRow.append(tideBox, tideLabel);
  section.appendChild(tideRow);

  /* E022-05 : canvas laboratoire, tabindex et équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = `${PFX}-canvas`;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de dynamique littorale. Flèches gauche et droite : changer de vue ; flèches haut et bas : modifier l’angle d’incidence de 5 degrés ; Début : angle nul ; Fin : 60 degrés.');
  on(canvas, 'keydown', onCanvasKey);
  section.appendChild(canvas);

  /* Tableau dynamique, pré-rempli au rendu sans JavaScript. */
  const dynTable = document.createElement('table');
  dynTable.className = `${PFX}-table`;
  dynTable.id = `${PFX}-table`;
  dynTable.appendChild(el('caption', '', 'Grandeurs calculées depuis les réglages courants.'));
  const dynHead = document.createElement('thead');
  const dynHeadRow = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((text) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    dynHeadRow.appendChild(th);
  });
  dynHead.appendChild(dynHeadRow);
  dynTable.appendChild(dynHead);
  const tbody = document.createElement('tbody');
  tbody.id = `${PFX}-tbody`;
  dynTable.appendChild(tbody);
  section.appendChild(dynTable);

  /* E022-08 : annonce accessible unique, texte visible et indexable. */
  const readout = el('p', '',
    'Houle au large H₀ = 2,0 m ; hauteur au brisement H_b = 2,6 m (facteur 1,3). Incidence θ₀ = 25° ; après réfraction θ_b = 16,3° (facteur 0,65). Courant de dérive v = 0,59 m/s, soit 118 % de la référence 0,50 m/s. Indice de transport I = 0,43 (maximum théorique à θ_b = 45°). Zone de balancement (marée haute) = 37,5 m pour une marée de 3,0 m et une pente de 8 %. Lecture : les crêtes sont inclinées de θ_b et le traceur suit la flèche de dérive.');
  readout.id = `${PFX}-readout`;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  section.appendChild(readout);

  /* Boutons : aria-pressed réservé à la bascule indépendante d'animation. */
  const play = el('button', `${PFX}-btn`, '▶ Animer la houle');
  play.type = 'button';
  play.id = `${PFX}-play`;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', canvas.id);
  on(play, 'click', () => {
    playing = !playing;
    if (!playing) stopLoop(); else ensureRaf();
    play.textContent = playing ? '■ Arrêter l’animation' : '▶ Animer la houle';
    play.setAttribute('aria-pressed', playing ? 'true' : 'false');
  });
  section.appendChild(play);

  const resetBtn = el('button', `${PFX}-btn`, 'Réinitialiser le laboratoire');
  resetBtn.type = 'button';
  resetBtn.id = `${PFX}-reset`;
  on(resetBtn, 'click', reset);
  section.appendChild(resetBtn);

  /* E022-09 : fiche de vérité — trois faits sourcés et limites falsifiables. */
  section.appendChild(el('h3', `${PFX}-subtitle`, 'Repères chiffrés'));
  [
    'Le transport sédimentaire littoral suit Q ∝ H_b² · sin(2 θ_b) : il est maximal pour un angle de brisement de 45°.',
    'Un courant de dérive modéré est de l’ordre de 0,5 m/s : c’est la référence à laquelle le laboratoire compare chaque résultat.',
    'La réfraction suit sin θ_b / sin θ₀ = 0,65 (loi de Snell approchée) : l’angle au brisement reste toujours plus faible que l’angle au large.',
  ].forEach((text) => section.appendChild(el('p', `${PFX}-fact`, text)));

  const limits = el('details', '');
  limits.id = `${PFX}-limits`;
  limits.appendChild(el('summary', '', 'Limites et angles morts du modèle'));
  limits.appendChild(el('p', '',
    'Le schéma est sans échelle réelle : les pixels ne valent pas des mètres. Les coefficients 1,3 (shoaling), 0,65 (réfraction) et 0,22 (courant) sont des ordres de grandeur pédagogiques, pas des constantes de terrain. Le modèle ignore la densité et le tri des sédiments, le vent local, la stochasticité des vagues et les surcotes de tempête. Il illustre une relation ; il ne prédit pas l’évolution d’un littoral.'));
  section.appendChild(limits);

  /* E022-09 : lecture seule du lieu actif affiché par la vue de base. */
  const cross = el('p', `${PFX}-crossref`);
  cross.id = `${PFX}-crossref`;
  const placeTitle = panel.querySelector('.geo-title');
  cross.textContent = placeTitle
    ? 'Repère affiché par la carte : ' + placeTitle.textContent + '. Cette lentille ne modifie ni le lieu actif ni le store.'
    : 'Aucun lieu actif affiché par la carte ; le laboratoire reste autonome.';
  section.appendChild(cross);

  panel.appendChild(section);

  dom.panel = section;
  dom.canvas = canvas;
  dom.radios = radios;
  dom.mareeHaute = tideBox;
  dom.play = play;
  dom.tbody = tbody;

  /* E022-10 : une seule boucle rAF, pauses visibilité et sortie d'écran. */
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
