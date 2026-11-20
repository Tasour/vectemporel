import { register } from './registry.js';

/* Lentille V2 E003 — Laboratoire d'échelle cartographique et de conversion.
 *
 * Seconde passe sur le domaine de l'échelle : dix chantiers inédits, tous
 * réellement implémentés. À la différence de la passe 1 (barre d'échelle
 * ancrée sur la carte), cette lentille construit un laboratoire autonome dans
 * le panneau : une règle graduée dessinée sur canvas à partir de formules
 * déterministes, un radiogroupe d'échelles de référence, un curseur de
 * distance, un tableau de conversion et une annonce accessible.
 *
 * Contraintes : un seul import, un seul register, un seul identifiant CSS
 * `geography-v2-e003`, tous les id préfixés `geography-v2-e003-`, aucune
 * ressource réseau, aucun appel à la console, aucune source aléatoire, une
 * seule boucle rAF avec pause sur `document.hidden` et respect de `reducedMotion()`.
 * Le texte est sémantique (h2, p, table, fieldset, label) et reste lisible et
 * indexable sans JavaScript : le laboratoire n'est qu'un complément.
 */

const PFX = 'geography-v2-e003';
const KM_PER_MI = 1.609344;        // mile international, km
const MAX_CM = 20;                 // amplitude du curseur, centimètres carte
const MIN_CM = 1;
const BAR_W = 320;                 // largeur logique du canvas, px CSS
const BAR_H = 112;                 // hauteur logique du canvas, px CSS
const NICE = [1, 2, 5];
const PRESETS = [
  { denom: 25000, label: '1 : 25 000' },
  { denom: 50000, label: '1 : 50 000' },
  { denom: 100000, label: '1 : 100 000' },
];

/* État de module : survit aux re-renders complets de la coque. */
let ctxRef = null;
let layoutRef = null;
let rafId = 0;
let lastFrame = 0;
let denom = 50000;                 // dénominateur de l'échelle choisie
let targetCm = 5;                  // distance carte visée, cm
let shownCm = 5;                   // distance carte affichée (interpolée)
let dom = {};
let listeners = [];

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function group(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function dec(value, digits) {
  return value.toFixed(digits).replace('.', ',');
}

function fmt(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 100) return group(Math.round(value));
  if (value >= 10) return dec(value, 0);
  if (value >= 1) return dec(value, 1);
  return dec(value, 2);
}

function kmPerCm() {
  /* 1 cm sur la carte = `denom` cm au sol = denom / 100 000 km. */
  return denom / 100000;
}

function niceStep(target) {
  if (!(target > 0)) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(target)));
  let best = NICE[0] * power;
  for (let i = 0; i < NICE.length; i += 1) {
    if (NICE[i] * power <= target) best = NICE[i] * power;
  }
  return best;
}

function reduced() {
  return Boolean(ctxRef && typeof ctxRef.reducedMotion === 'function' && ctxRef.reducedMotion());
}

function on(node, type, fn) {
  if (!node || typeof node.addEventListener !== 'function') return;
  node.addEventListener(type, fn);
  listeners.push({ node, type, fn });
}

/* ---------- dessin du laboratoire (formules déterministes) ---------- */

function drawCanvas() {
  const canvas = dom.canvas;
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const pxW = Math.round(BAR_W * dpr);
  const pxH = Math.round(BAR_H * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const g = canvas.getContext('2d');
  if (!g || typeof g.setTransform !== 'function') return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, BAR_W, BAR_H);

  const kmCm = kmPerCm();
  const kmSpan = MAX_CM * kmCm;
  const x0 = 14;
  const x1 = BAR_W - 14;
  const cmToX = (cm) => x0 + (clamp(cm, 0, MAX_CM) / MAX_CM) * (x1 - x0);

  /* Fond et ligne de base. */
  g.fillStyle = 'rgba(8,12,18,0.55)';
  g.fillRect(0, 0, BAR_W, BAR_H);
  g.strokeStyle = 'rgba(244,214,158,0.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x0, 64);
  g.lineTo(x1, 64);
  g.stroke();

  /* Graduations de kilomètres : pas choisi dans la suite 1-2-5 × 10^n. */
  const step = niceStep(kmSpan / 6);
  g.fillStyle = 'rgba(214,224,236,0.78)';
  g.font = '10px sans-serif';
  g.textAlign = 'center';
  for (let km = 0; km <= kmSpan + 1e-9; km += step) {
    const x = cmToX(km / kmCm);
    const major = Math.abs(km / step - Math.round(km / step)) < 1e-6;
    g.strokeStyle = major ? 'rgba(244,214,158,0.7)' : 'rgba(214,224,236,0.3)';
    g.beginPath();
    g.moveTo(x, 64);
    g.lineTo(x, major ? 50 : 57);
    g.stroke();
    if (major) g.fillText(`${dec(km, step < 1 ? 1 : 0)} km`, x, 44);
  }

  /* Aiguille à la distance affichée — texture et position déterministes. */
  const nx = cmToX(shownCm);
  g.strokeStyle = '#e6b96f';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(nx, 30);
  g.lineTo(nx, 76);
  g.stroke();
  g.fillStyle = '#e6b96f';
  g.beginPath();
  g.moveTo(nx, 26);
  g.lineTo(nx - 5, 18);
  g.lineTo(nx + 5, 18);
  g.closePath();
  g.fill();

  const kmHere = shownCm * kmCm;
  g.fillStyle = '#f4d69e';
  g.font = 'bold 12px sans-serif';
  g.textAlign = 'center';
  g.fillText(`${dec(shownCm, 1)} cm → ${fmt(kmHere)} km`, BAR_W / 2, 98);

  /* Échelle de miles, alignée sur la même règle (jamais portée par la couleur). */
  g.fillStyle = 'rgba(214,224,236,0.6)';
  g.font = '9px sans-serif';
  g.textAlign = 'left';
  g.fillText(`équivalent : ${fmt(kmHere / KM_PER_MI)} mi`, 14, 16);
}

/* ---------- boucle rAF unique, pause et mouvement réduit ---------- */

function renderNeedle() {
  drawCanvas();
}

/* E003-06 : unique boucle rAF du module — lissage exponentiel amorti de
 * l'aiguille vers la distance cible, arrêt dès convergence (écart < 0,02 cm). */
function ensureRaf() {
  if (rafId || (typeof document !== 'undefined' && document.hidden)) return;
  /* E003-07 : mouvement réduit — on pose la valeur finale sans animation. */
  if (reduced()) { shownCm = targetCm; renderNeedle(); return; }
  lastFrame = 0;
  rafId = requestAnimationFrame(frame);
}

function frame(now) {
  rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { lastFrame = 0; return; }
  const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
  lastFrame = now;
  shownCm += (targetCm - shownCm) * (1 - Math.exp(-dt / 110));
  if (Math.abs(targetCm - shownCm) < 0.02) shownCm = targetCm;
  renderNeedle();
  if (shownCm !== targetCm) rafId = requestAnimationFrame(frame);
  else lastFrame = 0;
}

/* E003-08 : pause de la boucle sur document.hidden, reprise sans saut. */
function onVisibility() {
  if (typeof document === 'undefined') return;
  if (document.hidden) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    lastFrame = 0;
  } else if (shownCm !== targetCm) ensureRaf();
}

/* ---------- calculs et mise à jour du texte sémantique ---------- */

function updateReadout() {
  if (!dom.readout) return;
  const kmHere = targetCm * kmPerCm();
  if (dom.rangeLabel) dom.rangeLabel.textContent = `${dec(targetCm, 1)} cm sur la carte`;
  dom.readout.textContent = `Échelle 1 : ${group(denom)} — ${dec(targetCm, 1)} cm sur la carte représentent ${fmt(kmHere)} km sur le terrain, soit ${fmt(kmHere / KM_PER_MI)} miles. Mesure calculée depuis l'échelle choisie.`;
}

function updateTable() {
  if (!dom.tbody) return;
  const kmHere = targetCm * kmPerCm();
  const rows = [
    ['Centimètres sur la carte', `${dec(targetCm, 1)} cm`],
    ['Mètres sur le terrain', `${fmt(kmHere * 1000)} m`],
    ['Kilomètres sur le terrain', `${fmt(kmHere)} km`],
    ['Miles sur le terrain', `${fmt(kmHere / KM_PER_MI)} mi`],
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
  updateTable();
  updateReadout();
  if (animate) ensureRaf();
  else { shownCm = targetCm; renderNeedle(); }
}

/* ---------- interactions ---------- */

function setCm(value, animate) {
  targetCm = clamp(Math.round(value * 2) / 2, MIN_CM, MAX_CM);
  if (dom.range && String(targetCm) !== dom.range.value) dom.range.value = String(targetCm);
  recompute(animate !== false);
}

function setDenom(value) {
  denom = value;
  recompute(true);
}

function reset() {
  denom = 50000;
  if (dom.radios) {
    dom.radios.forEach((radio) => { radio.checked = Number(radio.value) === denom; });
  }
  setCm(5, true);
}

function onCanvasKey(event) {
  let next = targetCm;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = targetCm + 0.5;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = targetCm - 0.5;
  else if (event.key === 'Home') next = MIN_CM;
  else if (event.key === 'End') next = MAX_CM;
  else return;
  event.preventDefault();
  event.stopPropagation();
  setCm(next, true);
}

/* ---------- nettoyage entre deux rendus ---------- */

function teardown() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  lastFrame = 0;
  listeners.forEach(({ node, type, fn }) => {
    try { node.removeEventListener(type, fn); } catch { /* nœud déjà détaché */ }
  });
  listeners = [];
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  const roots = [layoutRef];
  roots.forEach((root) => {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    Array.from(root.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => node.remove());
  });
  dom = {};
  layoutRef = null;
}

/* ---------- greffon ---------- */

register('E003', (ctx) => {
  ctxRef = ctx;
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const el = ctx.el;
  const css = ctx.css;
  if (typeof el !== 'function' || typeof css !== 'function') return;

  /* E003-02 : feuille de style unique, tous les sélecteurs préfixés. */
  css('geography-v2-e003', `
  #${PFX}-panel{margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink)}
  #${PFX}-title{margin:0 0 6px;color:var(--gold-bright);font-size:13px;font-weight:700}
  .${PFX}-lead{margin:0 0 10px;color:var(--muted);font-size:11px;line-height:1.55}
  .${PFX}-fieldset{margin:0 0 10px;padding:8px;border:1px solid var(--line);border-radius:8px}
  .${PFX}-fieldset legend{padding:0 4px;color:var(--gold-bright);font-size:10px;font-weight:600}
  .${PFX}-choices{display:flex;flex-wrap:wrap;gap:6px}
  .${PFX}-choice{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:0 9px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:11px;cursor:pointer}
  .${PFX}-choice input{width:16px;height:16px;accent-color:var(--gold)}
  .${PFX}-choice input:checked + span{color:var(--gold-bright);font-weight:700}
  .${PFX}-choice:focus-within{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-distance-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 8px}
  #${PFX}-distance{min-height:36px;flex:1 1 160px;accent-color:var(--gold)}
  #${PFX}-distance-label{min-width:96px;color:var(--ink-soft);font-size:11px;font-variant-numeric:tabular-nums}
  #${PFX}-canvas{display:block;width:100%;max-width:${BAR_W}px;height:auto;margin:0 0 8px;border:1px solid var(--line);border-radius:8px;touch-action:none;cursor:ew-resize}
  #${PFX}-canvas:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .${PFX}-table{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:11px}
  .${PFX}-table caption{margin-bottom:4px;color:var(--gold-bright);font-size:10px;text-align:left}
  .${PFX}-table th,.${PFX}-table td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
  .${PFX}-table td{color:var(--ink-soft);text-align:right}
  #${PFX}-readout{margin:0 0 8px;padding:7px 8px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:11px;line-height:1.5;background:rgba(230,185,111,.06)}
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
  const panel = layout.querySelector('.geo-panel');
  if (!panel) return;
  layoutRef = layout;

  /* E003-01 : contenu sémantique lisible sans JavaScript. */
  const section = el('section', '');
  section.id = `${PFX}-panel`;
  section.setAttribute('aria-labelledby', `${PFX}-title`);
  const heading = el('h2', '', 'Laboratoire d’échelle cartographique');
  heading.id = `${PFX}-title`;
  const lead = el('p', `${PFX}-lead`, 'Choisissez une échelle de référence puis une distance sur la carte : la règle et le tableau ci-dessous convertissent cette distance en mètres, kilomètres et miles au sol. Toutes les valeurs sont recalculées depuis le dénominateur de l’échelle, sans donnée externe.');
  section.append(heading, lead);

  /* E003-03 : radiogroupe natif pour le choix unique d'échelle. */
  const fieldset = el('fieldset', `${PFX}-fieldset`);
  fieldset.id = `${PFX}-scale-group`;
  fieldset.appendChild(el('legend', '', 'Échelle de référence'));
  const choices = el('div', `${PFX}-choices`);
  const radios = [];
  PRESETS.forEach((preset) => {
    const labelNode = el('label', `${PFX}-choice`);
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${PFX}-scale`;
    input.value = String(preset.denom);
    input.id = `${PFX}-radio-${preset.denom}`;
    input.checked = preset.denom === denom;
    on(input, 'change', () => setDenom(preset.denom));
    labelNode.append(input, el('span', '', preset.label));
    choices.appendChild(labelNode);
    radios.push(input);
  });
  fieldset.appendChild(choices);
  section.appendChild(fieldset);

  /* E003-04 : curseur de distance carte, avec valeur textuelle visible. */
  const row = el('div', '');
  row.id = `${PFX}-distance-row`;
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(MIN_CM);
  range.max = String(MAX_CM);
  range.step = '0.5';
  range.value = String(targetCm);
  range.id = `${PFX}-distance`;
  range.setAttribute('aria-label', 'Distance sur la carte, en centimètres');
  on(range, 'input', () => setCm(Number(range.value), true));
  const rangeLabel = el('label', `${PFX}-range-label`, '5,0 cm sur la carte');
  rangeLabel.id = `${PFX}-distance-label`;
  rangeLabel.htmlFor = range.id;
  row.append(rangeLabel, range);
  section.appendChild(row);

  /* E003-05 : canvas laboratoire, tabindex et équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = `${PFX}-canvas`;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Règle graduée : appuyez sur les flèches pour ajuster la distance cartographique par pas d’un demi-centimètre, Début et Fin pour les extrémités.');
  on(canvas, 'keydown', onCanvasKey);
  section.appendChild(canvas);

  /* E003-01 : tableau de conversion en texte sémantique. */
  const table = document.createElement('table');
  table.className = `${PFX}-table`;
  table.id = `${PFX}-table`;
  const caption = el('caption', '', 'Conversion pour la distance choisie');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const h1 = document.createElement('th');
  h1.scope = 'col';
  h1.textContent = 'Grandeur';
  const h2n = document.createElement('th');
  h2n.scope = 'col';
  h2n.textContent = 'Valeur';
  headRow.append(h1, h2n);
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  tbody.id = `${PFX}-tbody`;
  /* Valeurs par défaut pour 1 : 50 000 et 5 cm, lisibles sans JavaScript. */
  [
    ['Centimètres sur la carte', '5,0 cm'],
    ['Mètres sur le terrain', '2 500 m'],
    ['Kilomètres sur le terrain', '2,5 km'],
    ['Miles sur le terrain', '1,55 mi'],
  ].forEach(([name, value]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = name;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    tbody.appendChild(tr);
  });
  table.append(caption, thead, tbody);
  section.appendChild(table);

  /* E003-09 : annonce accessible, texte visible et indexable. */
  const readout = el('p', '', 'Échelle 1 : 50 000 — 5,0 cm sur la carte représentent 2,5 km sur le terrain, soit 1,55 miles. Mesure calculée depuis l’échelle choisie.');
  readout.id = `${PFX}-readout`;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  section.appendChild(readout);

  /* E003-10 : réinitialisation et limites explicites. */
  const resetBtn = el('button', `${PFX}-btn`, 'Réinitialiser le laboratoire');
  resetBtn.type = 'button';
  resetBtn.id = `${PFX}-reset`;
  on(resetBtn, 'click', reset);
  section.appendChild(resetBtn);

  const limits = el('details', '');
  limits.id = `${PFX}-limits`;
  limits.appendChild(el('summary', '', 'Limites de cette conversion'));
  limits.appendChild(el('p', '', 'L’échelle 1 : N suppose un pixel de 0,28 mm (référence d’écran OGC) : la taille réelle de votre écran peut différer. La carte hôte utilise une projection schématique non conforme : les distances estimées à l’écran ne sont pas uniformes dans toutes les directions. Ce laboratoire calcule une conversion métrique à partir de l’échelle choisie ; il ne mesure pas le tracé affiché.'));
  section.appendChild(limits);

  panel.appendChild(section);

  dom = { panel: section, canvas, range, rangeLabel, readout, tbody, radios };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

  /* Valeurs initiales cohérentes avec le texte statique, sans animation. */
  recompute(false);
});
