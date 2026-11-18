import { register } from './registry.js';

/* Lentille E022 — Péninsules et caps (vue GEOGRAPHIE).
 * Dix chantiers, tous implémentés : E022-01 … E022-10.
 * Un panneau pédagogique autonome, un schéma géomorphologique déterministe sur
 * un seul canvas et une seule boucle rAF, suspendue quand l'onglet est masqué.
 * Zéro réseau, zéro aléa, zéro sortie de débogage. Tout le texte utile est du
 * texte DOM lisible sans animation ni script ; le canvas n'est qu'un
 * laboratoire. Aucun fichier partagé n'est modifié. */

const PREFIX = 'geography-e022';
const PANEL_ID = PREFIX + '-panel';

/* Constantes de modèle (E022-04, E022-06, E022-09). Ordres de grandeur
 * pédagogiques explicites, jamais des mesures de terrain prétendues exactes. */
const MAX_YEARS = 120000;   // durée simulée, en années
const YEARS_PER_MS = 10;    // vitesse de lecture : 12 s pour parcourir MAX_YEARS
const RATE_M_PER_YEAR = 0.05; // recul de référence des roches tendres, en m/an
const KM_PER_PX = 0.4;      // échelle schématique du canvas
const BODY_HALF_PX = 35;    // demi-largeur maximale du corps de la péninsule
const X0_PX = 26;           // abscisse de l'isthme dans le canvas
const CANVAS_W = 360;
const CANVAS_H = 230;

/* Mécanismes dominants : facteur appliqué au taux de recul (E022-07). */
const MECHANISMS = [
  { key: 'erosion', label: 'Érosion marine', factor: 1,
    note: 'La houle attaque les roches tendres des baies ; le cap dur résiste.' },
  { key: 'tectonique', label: 'Tectonique', factor: 0.25,
    note: 'Le soulèvement relatif réduit l’emprise de la mer sur le littoral.' },
  { key: 'sedimentation', label: 'Sédimentation', factor: 0.4,
    note: 'Les dépôts comblent les baies et ralentissent leur recul apparent.' },
  { key: 'volcanisme', label: 'Volcanisme', factor: 0.1,
    note: 'Une lave récente, plus dure, consolide le promontoire.' },
];

const GLOSSARY = [
  ['Péninsule', 'Étendue de terre avançant dans l’eau, entourée sur trois côtés par le mer et reliée au continent par un isthme.'],
  ['Isthme', 'Voie de terre étroite qui rattache la péninsule au reste du continent ; sa largeur commande le degré d’isolement.'],
  ['Cap (ou promontoire)', 'Extrémité avancée de la péninsule : une langue de terre qui pointe dans la mer et forme un repère pour la navigation.'],
  ['Baie', 'Partie de mer qui entre dans les terres ; creusée dans une roche tendre, elle recule plus vite que le cap voisin.'],
  ['Érosion différentielle', 'Processus par lequel une roche dure résiste à l’abrasion tandis que les roches tendres environnantes reculent, laissant saillir un cap.'],
];

const EXAMPLES = [
  ['Bretagne (France)', 'Cap de la Chèvre', 'Mer d’Iroise', 'Érosion différentielle'],
  ['Péninsule Ibérique', 'Cabo de São Vicente', 'Océan Atlantique', 'Érosion de plateaux'],
  ['Scandinavie', 'Nordkapp (Norvège)', 'Océan Arctique', 'Érosion glaciaire puis marine'],
  ['Afrique australe', 'Cap de Bonne-Espérance', 'Atlantique / Indien', 'Érosion de grès'],
  ['Floride (États-Unis)', 'Cap Canaveral', 'Océan Atlantique', 'Accumulation sédimentaire'],
  ['Anatolie (Turquie)', 'Cap Baba', 'Égée / Méditerranée', 'Tectonique active'],
];

/* État vivant au niveau du module : survit au remplacement du panneau. */
const S = {
  reduced: false,
  panel: null,
  canvas: null,
  ctx2d: null,
  observer: null,
  onScreen: true,
  visibilityReady: false,
  rafId: 0,
  lastTs: 0,
  playing: false,
  timeYears: 0,
  hardness: 0.6,
  isthmusPx: 24,
  tipAngle: 45,
  mechanism: 'erosion',
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fr = (n, digits = 0) => n.toLocaleString('fr-FR', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});

function mech() {
  return MECHANISMS.find((m) => m.key === S.mechanism) || MECHANISMS[0];
}

/* Grandeurs calculées depuis les réglages, jamais stockées en dur. */
function metrics() {
  const factor = mech().factor;
  const bayM = RATE_M_PER_YEAR * factor * S.timeYears;
  const capM = RATE_M_PER_YEAR * factor * (1 - S.hardness) * 0.25 * S.timeYears;
  const refM = RATE_M_PER_YEAR * MAX_YEARS;
  const capRecessionPx = capM / (KM_PER_PX * 1000);
  const bayRecessionPx = bayM / (KM_PER_PX * 1000);
  return { bayM, capM, refM, bayRecessionPx, capRecessionPx };
}

/* E022-10 : une seule boucle rAF, gardée par un identifiant unique. */
function stopLoop() {
  if (S.rafId) cancelAnimationFrame(S.rafId);
  S.rafId = 0;
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || S.reduced || !S.onScreen || document.hidden || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  if (!S.playing || document.hidden) { stopLoop(); return; }
  const dt = S.lastTs ? ts - S.lastTs : 0;
  S.lastTs = ts;
  S.timeYears = clamp(S.timeYears + dt * YEARS_PER_MS, 0, MAX_YEARS);
  paint();
  if (S.timeYears >= MAX_YEARS) {
    S.playing = false;
    stopLoop();
    syncPlayButton();
    announce('Simulation terminée : 120 000 années écoulées.');
    return;
  }
  S.rafId = requestAnimationFrame(tick);
}

/* E022-06 / E022-10 : pause sur changement de visibilité, installée une fois. */
function installVisibilityWatch() {
  if (S.visibilityReady || typeof document === 'undefined') return;
  S.visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (S.playing && S.onScreen && !S.reduced) startLoop();
  });
}

/* E022-10 : le dessin s'arrête hors écran ; repli sans IntersectionObserver. */
function ensureObserver() {
  if (!S.canvas || typeof IntersectionObserver === 'undefined') return;
  if (S.observer) S.observer.disconnect();
  S.observer = new IntersectionObserver((entries) => {
    S.onScreen = entries.some((entry) => entry.isIntersecting);
    if (!S.onScreen) stopLoop();
    else if (S.playing && !S.reduced && !document.hidden) startLoop();
  }, { threshold: 0.05 });
  S.observer.observe(S.canvas);
}

function announce(message) {
  const node = document.getElementById(PREFIX + '-readout-detail');
  if (node) node.textContent = message;
}

/* E022-08 : un seul readout live, texte et chiffres, jamais la couleur seule. */
function updateReadout() {
  const m = metrics();
  const percent = (m.bayM / m.refM) * 100;
  const indice = S.isthmusPx / (BODY_HALF_PX * 2);
  const elong = lerp(1.2, 3, (S.tipAngle - 20) / 70);
  const readout = document.getElementById(PREFIX + '-readout');
  if (readout) {
    readout.replaceChildren();
    const parts = [
      ['Années simulées : ', fr(S.timeYears) + ' ans'],
      [' · Recul des baies : ', fr(m.bayM) + ' m'],
      [' (', fr(percent) + ' % du recul de référence de 6 000 m)'],
      [' · Avancée relative du cap : ', fr(m.bayM - m.capM) + ' m'],
      [' · Indice de péninsularité : ', fr(indice, 2)],
      [' (référence : 0,30 pour une péninsule bien détachée)'],
    ];
    parts.forEach(([label, value], i) => {
      readout.appendChild(document.createTextNode(label));
      if (i % 2 === 1) {
        const strong = document.createElement('strong');
        strong.textContent = value;
        readout.appendChild(strong);
      }
    });
  }
  const time = document.getElementById(PREFIX + '-time');
  if (time && document.activeElement !== time) time.value = String(Math.round(S.timeYears));
  const detail = document.getElementById(PREFIX + '-detail');
  if (detail) {
    detail.textContent = `Mécanisme : ${mech().label}. ${mech().note}`
      + ` Dureté du cap : ${fr(S.hardness * 100)} %.`
      + ` Élancement : ${fr(elong, 2)} (longueur / largeur).`;
  }
}

function syncPlayButton() {
  const b = document.getElementById(PREFIX + '-play');
  if (!b) return;
  b.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  b.textContent = S.playing ? 'Mettre en pause' : 'Lancer l’érosion';
}

function syncControlsFromState() {
  const hardness = document.getElementById(PREFIX + '-hardness');
  const isthmus = document.getElementById(PREFIX + '-isthmus');
  const angle = document.getElementById(PREFIX + '-angle');
  if (hardness) hardness.value = String(Math.round(S.hardness * 100));
  if (isthmus) isthmus.value = String(S.isthmusPx);
  if (angle) angle.value = String(S.tipAngle);
  MECHANISMS.forEach((m) => {
    const radio = document.getElementById(PREFIX + '-mech-' + m.key);
    if (radio) radio.checked = (m.key === S.mechanism);
  });
  syncPlayButton();
}

/* E022-05 : schéma top-down déterministe, un seul canvas, DPR plafonné à 2. */
function paint() {
  const canvas = S.canvas;
  const c = S.ctx2d;
  if (!canvas || !c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = CANVAS_W;
  const h = CANVAS_H;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);

  const m = metrics();
  const cy = h / 2;
  const elong = lerp(1.2, 3, (S.tipAngle - 20) / 70);
  const lengthPx = BODY_HALF_PX * 2 * elong;
  const capLen = m.capRecessionPx;
  const tipX = X0_PX + Math.max(20, lengthPx) - capLen;
  const span = tipX - X0_PX;
  const exponent = clamp(2 - (S.tipAngle - 20) / 70 * 1.6, 0.4, 2);
  const uAt = (x) => clamp((x - X0_PX) / span, 0, 1);

  function halfWidth(u) {
    if (u <= 0.25) return lerp(S.isthmusPx / 2, BODY_HALF_PX, u / 0.25);
    if (u >= 0.8) return BODY_HALF_PX * Math.pow((1 - u) / 0.2, exponent);
    return BODY_HALF_PX;
  }
  function indent(u) {
    const g1 = Math.exp(-Math.pow((u - 0.45) / 0.12, 2));
    const g2 = Math.exp(-Math.pow((u - 0.58) / 0.10, 2));
    return m.bayRecessionPx * (0.85 * g1 + 0.7 * g2);
  }

  /* Mer (fond) et ligne d'isthme. */
  c.fillStyle = '#0f2230';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(140,190,210,.22)';
  c.lineWidth = 1;
  for (let y = 14; y < h; y += 22) {
    c.beginPath();
    c.moveTo(0, y + 4);
    c.quadraticCurveTo(w / 4, y - 2, w / 2, y + 4);
    c.quadraticCurveTo(3 * w / 4, y + 10, w, y + 4);
    c.stroke();
  }

  /* Terre : continent à gauche, péninsule et cap à droite. */
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(X0_PX, cy - S.isthmusPx / 2);
  for (let x = X0_PX; x < tipX; x += 2) {
    const u = uAt(x);
    const hw = Math.max(1, halfWidth(u) - indent(u));
    c.lineTo(x, cy - hw);
  }
  c.lineTo(tipX, cy);
  for (let x = tipX; x > X0_PX; x -= 2) {
    const u = uAt(x);
    const hw = Math.max(1, halfWidth(u) - indent(u));
    c.lineTo(x, cy + hw);
  }
  c.lineTo(0, h);
  c.closePath();
  c.fillStyle = '#6b5a3c';
  c.fill();
  c.strokeStyle = '#e6b96f';
  c.lineWidth = 1.6;
  c.stroke();

  /* E022-08 : hachures du cap dur — information distincte de la couleur. */
  const capStartX = X0_PX + 0.82 * span;
  c.save();
  c.beginPath();
  c.moveTo(tipX, cy);
  c.lineTo(capStartX, cy - halfWidth(0.82));
  c.lineTo(capStartX, cy + halfWidth(0.82));
  c.closePath();
  c.clip();
  c.strokeStyle = 'rgba(255,242,214,.75)';
  c.lineWidth = 1;
  for (let d = -h; d < w + h; d += 7) {
    c.beginPath();
    c.moveTo(d, 0);
    c.lineTo(d + h, h);
    c.stroke();
  }
  c.restore();

  /* Repères textuels du schéma (toujours lisibles, même sans couleur). */
  c.fillStyle = '#f4e6c8';
  c.font = '11px sans-serif';
  c.fillText('Continent', 6, 16);
  c.fillText('Isthme', X0_PX - 8, cy - S.isthmusPx / 2 - 6);
  c.fillText('Baie tendre', X0_PX + 0.42 * span - 26, cy - BODY_HALF_PX - 8);
  c.fillText('Baie tendre', X0_PX + 0.55 * span - 26, cy + BODY_HALF_PX + 16);
  c.fillText('Cap (roche dure)', Math.max(4, tipX - 74), cy - 4);

  /* Échelle schématique et flèche du nord. */
  c.strokeStyle = '#e6b96f';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(12, h - 18);
  c.lineTo(62, h - 18);
  c.moveTo(12, h - 22);
  c.lineTo(12, h - 14);
  c.moveTo(62, h - 22);
  c.lineTo(62, h - 14);
  c.stroke();
  c.fillStyle = '#e6b96f';
  c.font = '10px sans-serif';
  c.fillText('≈ 20 km (schéma)', 12, h - 26);
  c.fillText('N ↑', w - 30, 18);
}

function refresh() {
  paint();
  updateReadout();
}

/* E022-01 à E022-09 : construction du panneau, une seule fois par rendu. */
function buildPanel(ctx) {
  const section = ctx.el('section', PREFIX + '-panel');
  section.id = PANEL_ID;
  section.setAttribute('aria-labelledby', PREFIX + '-title');

  /* E022-01 — titre et introduction en texte sémantique. */
  const title = ctx.el('h2', PREFIX + '-title', 'Péninsules et caps : quand la terre avance dans la mer');
  title.id = PREFIX + '-title';
  section.appendChild(title);
  section.appendChild(ctx.el('p', PREFIX + '-lead',
    'Une péninsule est une langue de terre reliée au continent par un isthme et bordée par l’eau sur trois côtés. Son extrémité, le cap, est un promontoire souvent formé par une roche plus dure que celle des baies voisines. Ce laboratoire montre comment l’érosion différentielle fait saillir le cap au fil du temps.'));

  /* E022-02 — glossaire : chaque terme est défini à sa première occurrence. */
  section.appendChild(ctx.el('h3', PREFIX + '-subtitle', 'Vocabulaire'));
  const dl = ctx.el('dl', PREFIX + '-glossary');
  GLOSSARY.forEach(([term, definition]) => {
    dl.appendChild(ctx.el('dt', '', term));
    dl.appendChild(ctx.el('dd', '', definition));
  });
  section.appendChild(dl);

  /* E022-03 — typologie en tableau, avec en-têtes explicites. */
  section.appendChild(ctx.el('h3', PREFIX + '-subtitle', 'Péninsules et caps dans le monde'));
  const table = ctx.el('table', PREFIX + '-table');
  const caption = ctx.el('caption', '', 'Exemples de péninsules et de leur cap, avec le mécanisme dominant');
  table.appendChild(caption);
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Péninsule', 'Cap remarquable', 'Eau bordante', 'Mécanisme dominant'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = ctx.el('tbody');
  EXAMPLES.forEach((row) => {
    const tr = ctx.el('tr');
    row.forEach((cell) => tr.appendChild(ctx.el('td', '', cell)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  section.appendChild(table);

  /* E022-04 — formules de morphométrie, calculées et non recopiées. */
  section.appendChild(ctx.el('h3', PREFIX + '-subtitle', 'Deux grandeurs pour décrire une péninsule'));
  const f1 = ctx.el('p', PREFIX + '-noted',
    'Indice de péninsularité = largeur de l’isthme ÷ largeur maximale du corps. Un indice faible (≈ 0,30) signale une péninsule bien détachée du continent.');
  const f2 = ctx.el('p', PREFIX + '-noted',
    'Élancement = longueur de la péninsule ÷ largeur maximale du corps. Un élancement élevé désigne une langue de terre allongée.');
  section.append(f1, f2);

  /* E022-05 / E022-06 / E022-07 / E022-08 — laboratoire. */
  section.appendChild(ctx.el('h3', PREFIX + '-subtitle', 'Laboratoire : érosion différentielle d’un cap'));
  const intro = ctx.el('p', PREFIX + '-noted',
    'Réglez la dureté de la roche, la largeur de l’isthme et l’ouverture du cap, puis lancez le temps. Les baies tendres reculent, le cap dur résiste : sa relative avancée se lit dans le cadre chiffré.');
  section.appendChild(intro);

  const fieldset = ctx.el('fieldset', PREFIX + '-fieldset');
  const legend = ctx.el('legend', '', 'Mécanisme dominant (choix unique)');
  fieldset.appendChild(legend);
  MECHANISMS.forEach((m) => {
    const row = ctx.el('label', PREFIX + '-radio');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = PREFIX + '-mechanism';
    radio.value = m.key;
    radio.id = PREFIX + '-mech-' + m.key;
    radio.checked = m.key === S.mechanism;
    radio.addEventListener('change', () => {
      S.mechanism = m.key;
      refresh();
      announce('Mécanisme sélectionné : ' + m.label + '.');
    });
    row.append(radio, document.createTextNode(' ' + m.label));
    fieldset.appendChild(row);
  });
  section.appendChild(fieldset);

  const sliders = ctx.el('div', PREFIX + '-sliders');
  const makeSlider = (id, labelText, min, max, value, onInput) => {
    const wrap = ctx.el('div', PREFIX + '-slider');
    const lab = ctx.el('label', PREFIX + '-slider-label', labelText);
    lab.setAttribute('for', id);
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.addEventListener('input', () => onInput(Number(input.value)));
    wrap.append(lab, input);
    sliders.appendChild(wrap);
    return input;
  };
  makeSlider(PREFIX + '-time', 'Temps écoulé (années)', 0, MAX_YEARS, Math.round(S.timeYears), (v) => {
    S.timeYears = v;
    refresh();
  });
  makeSlider(PREFIX + '-hardness', 'Dureté de la roche du cap (%)', 0, 100, Math.round(S.hardness * 100), (v) => {
    S.hardness = v / 100;
    refresh();
  });
  makeSlider(PREFIX + '-isthmus', 'Largeur de l’isthme (unités du schéma)', 10, 60, S.isthmusPx, (v) => {
    S.isthmusPx = v;
    refresh();
  });
  makeSlider(PREFIX + '-angle', 'Ouverture du cap (degrés)', 20, 90, S.tipAngle, (v) => {
    S.tipAngle = v;
    refresh();
  });
  section.appendChild(sliders);

  const canvas = ctx.el('canvas', PREFIX + '-canvas');
  canvas.id = PREFIX + '-canvas';
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Schéma d’une péninsule avec un isthme à gauche, deux baies tendres et un cap haché à droite. '
    + 'Flèche gauche ou droite : reculer ou avancer le temps de 2 000 ans ; Début : revenir à zéro ; Fin : 120 000 ans.');
  canvas.addEventListener('keydown', (event) => {
    const step = 2000;
    if (event.key === 'ArrowRight') S.timeYears = clamp(S.timeYears + step, 0, MAX_YEARS);
    else if (event.key === 'ArrowLeft') S.timeYears = clamp(S.timeYears - step, 0, MAX_YEARS);
    else if (event.key === 'Home') S.timeYears = 0;
    else if (event.key === 'End') S.timeYears = MAX_YEARS;
    else return;
    event.preventDefault();
    refresh();
    announce('Temps réglé à ' + fr(S.timeYears) + ' ans.');
  });
  section.appendChild(canvas);

  const actions = ctx.el('div', PREFIX + '-actions');
  const play = ctx.el('button', PREFIX + '-play', 'Lancer l’érosion');
  play.type = 'button';
  play.id = PREFIX + '-play';
  play.setAttribute('aria-pressed', 'false');
  play.addEventListener('click', () => {
    if (S.playing) {
      S.playing = false;
      stopLoop();
      syncPlayButton();
      announce('Simulation en pause à ' + fr(S.timeYears) + ' ans.');
    } else if (S.reduced) {
      S.timeYears = MAX_YEARS;
      S.playing = false;
      refresh();
      syncPlayButton();
      announce('Mouvement réduit : résultat affiché directement à 120 000 ans.');
    } else {
      S.playing = true;
      syncPlayButton();
      startLoop();
      announce('Simulation lancée.');
    }
  });
  const reset = ctx.el('button', PREFIX + '-reset', 'Réinitialiser');
  reset.type = 'button';
  reset.id = PREFIX + '-reset';
  reset.addEventListener('click', () => {
    S.playing = false;
    stopLoop();
    S.timeYears = 0;
    S.hardness = 0.6;
    S.isthmusPx = 24;
    S.tipAngle = 45;
    S.mechanism = 'erosion';
    syncControlsFromState();
    refresh();
    announce('Réglages réinitialisés.');
  });
  actions.append(play, reset);
  section.appendChild(actions);

  const readout = ctx.el('p', PREFIX + '-readout');
  readout.id = PREFIX + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  section.appendChild(readout);
  const detail = ctx.el('p', PREFIX + '-detail');
  detail.id = PREFIX + '-detail';
  section.appendChild(detail);
  const detailStatus = ctx.el('p', PREFIX + '-detail-status');
  detailStatus.id = PREFIX + '-readout-detail';
  detailStatus.setAttribute('role', 'status');
  detailStatus.setAttribute('aria-live', 'polite');
  section.appendChild(detailStatus);

  /* E022-09 — fiche de vérité : trois faits ou conventions et leurs limites. */
  section.appendChild(ctx.el('h3', PREFIX + '-subtitle', 'Repères chiffrés et limites du modèle'));
  const facts = ctx.el('ul', PREFIX + '-facts');
  [
    'Le recul de l’ordre de 0,05 m par an est un ordre de grandeur pédagogique pour une falaise tendre ; il sert de référence au calcul.',
    'Sur 120 000 ans à ce rythme, le recul de référence atteint 6 000 m : c’est la valeur à laquelle le laboratoire compare chaque résultat.',
    'Un indice de péninsularité de 0,30 est une convention de lecture, pas une mesure de terrain : il fixe le seuil « bien détachée ».',
  ].forEach((text) => facts.appendChild(ctx.el('li', '', text)));
  section.appendChild(facts);
  section.appendChild(ctx.el('p', PREFIX + '-limit',
    'Limite : le schéma est top-down et sans échelle réelle (1 pixel = 0,4 km de façon arbitraire). '
    + 'Il ignore les marées, la lithologie détaillée et les variations du niveau marin : il illustre une relation, il ne prédit pas un littoral.'));

  const host = (ctx.layout && ctx.layout.querySelector('.geo-panel')) || ctx.layout || ctx.stage;
  if (!host) return null;
  host.appendChild(section);

  S.panel = section;
  S.canvas = canvas;
  try { S.ctx2d = canvas.getContext('2d'); } catch { S.ctx2d = null; }
  S.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
  ensureObserver();
  syncControlsFromState();
  refresh();
  if (S.playing && !S.reduced) startLoop();

  /* E022-09 — lecture seule du lieu actif affiché par la vue de base. */
  const cross = document.getElementById(PREFIX + '-crossref') || ctx.el('p', PREFIX + '-crossref');
  cross.id = PREFIX + '-crossref';
  const placeTitle = host.querySelector('.geo-title');
  cross.textContent = placeTitle
    ? `Repère affiché par la carte : ${placeTitle.textContent}. Cette lentille ne modifie ni le lieu actif ni le store.`
    : 'Aucun lieu actif affiché par la carte ; le laboratoire reste autonome.';
  section.appendChild(cross);

  return section;
}

/* E022-10 — enregistrement unique, CSS isolé, garde anti-doublon. */
register('E022', (ctx) => {
  if (!ctx || !ctx.layout) return;
  installVisibilityWatch();
  ctx.css(PREFIX, `
  #${PREFIX}-panel { margin-top:14px; padding:12px; border-top:1px solid var(--line); }
  .${PREFIX}-title { margin:0 0 6px; font-size:14px; color:var(--gold-bright); }
  .${PREFIX}-subtitle { margin:12px 0 4px; font-size:11px; color:var(--gold-bright); font-weight:normal; }
  .${PREFIX}-lead, .${PREFIX}-noted, .${PREFIX}-limit, .${PREFIX}-crossref {
    margin:5px 0; font-size:11px; line-height:1.55; color:var(--muted);
  }
  .${PREFIX}-limit { font-style:italic; }
  .${PREFIX}-glossary { margin:6px 0; font-size:11px; line-height:1.5; }
  .${PREFIX}-glossary dt { color:var(--gold-bright); font-weight:bold; margin-top:6px; }
  .${PREFIX}-glossary dd { margin:1px 0 0 12px; color:var(--muted); }
  .${PREFIX}-table { width:100%; border-collapse:collapse; margin:6px 0; font-size:10px; }
  .${PREFIX}-table caption { text-align:left; color:var(--muted); font-size:10px; margin-bottom:4px; }
  .${PREFIX}-table th, .${PREFIX}-table td { border:1px solid var(--line); padding:4px 5px; text-align:left; }
  .${PREFIX}-table th { color:var(--gold-bright); font-weight:bold; }
  .${PREFIX}-fieldset { margin:8px 0; padding:6px 8px; border:1px solid var(--line); border-radius:8px; }
  .${PREFIX}-fieldset legend { font-size:10px; color:var(--gold-bright); padding:0 4px; }
  .${PREFIX}-radio { display:inline-flex; align-items:center; gap:3px; min-height:24px; margin:2px 8px 2px 0; font-size:10px; color:var(--muted); cursor:pointer; }
  .${PREFIX}-radio input { width:18px; height:18px; accent-color:var(--gold); }
  .${PREFIX}-sliders { display:grid; gap:6px; margin:8px 0; }
  .${PREFIX}-slider { display:flex; flex-direction:column; gap:2px; }
  .${PREFIX}-slider-label { font-size:10px; color:var(--muted); }
  .${PREFIX}-slider input[type="range"] { width:100%; min-height:24px; accent-color:var(--gold); }
  .${PREFIX}-canvas { display:block; width:100%; max-width:360px; height:auto; margin:8px auto;
    border:1px solid var(--line); border-radius:8px; background:#0f2230; }
  .${PREFIX}-canvas:focus-visible, .${PREFIX}-play:focus-visible, .${PREFIX}-reset:focus-visible,
  .${PREFIX}-radio input:focus-visible, .${PREFIX}-slider input:focus-visible {
    outline:2px solid var(--gold-bright); outline-offset:2px;
  }
  .${PREFIX}-actions { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 4px; }
  .${PREFIX}-play, .${PREFIX}-reset { min-height:44px; padding:8px 12px; border:1px solid var(--line);
    border-radius:8px; background:transparent; color:var(--muted); font-size:11px; cursor:pointer; }
  .${PREFIX}-play[aria-pressed="true"] { border-color:var(--gold); color:var(--gold-bright); background:rgba(230,185,111,.10); }
  .${PREFIX}-readout, .${PREFIX}-detail, .${PREFIX}-detail-status {
    margin:5px 0; font-size:11px; line-height:1.55; color:var(--muted); font-variant-numeric:tabular-nums;
  }
  .${PREFIX}-readout strong { color:var(--gold-bright); }
  .${PREFIX}-facts { margin:6px 0; padding-left:18px; font-size:11px; line-height:1.55; color:var(--muted); }
  @media (max-width:620px) {
    .${PREFIX}-play, .${PREFIX}-reset { min-height:44px; }
    .${PREFIX}-radio { min-height:28px; }
  }`);

  const existing = document.getElementById(PANEL_ID);
  if (existing && existing.isConnected) {
    S.panel = existing;
    S.canvas = existing.querySelector('#' + PREFIX + '-canvas');
    try { S.ctx2d = S.canvas ? S.canvas.getContext('2d') : null; } catch { S.ctx2d = null; }
    S.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
    ensureObserver();
    syncControlsFromState();
    refresh();
    return;
  }
  buildPanel(ctx);
});
