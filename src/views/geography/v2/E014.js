import { register } from './registry.js';

/* Lentille V2 E014 — vue GEOGRAPHIE.
 * Thème : déserts et zones arides, indice d'aridité AI = P / PET.
 *
 * Les dix chantiers E014-01 … E014-10 sont réellement implémentés ci-dessous :
 *  01 texte sémantique d'introduction  02 tableau UNESCO/PNUE
 *  03 radiogroup de classe             04 curseur d'indice + seuils
 *  05 transect canvas par formules     06 grandeurs chiffrées / référence
 *  07 boucle rAF unique + pause        08 codes non chromatiques
 *  09 badge textuel sur la carte       10 accessibilité / mouvement réduit
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire, aucun journal.
 * Le contenu pédagogique est du texte sémantique inséré dans le DOM : il reste
 * lisible et indexable même sans animation ni interaction. Le canvas n'est
 * qu'un laboratoire dont chaque grandeur est aussi écrite en toutes lettres.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e014';
const P = 'geography-v2-e014';

const HUMIDE_REF = 0.65; /* seuil UNESCO/PNUE : au-delà, le climat est humide. */
const SEED = 0xE014;     /* graine fixe et affichée, zéro tirage aléatoire. */

/* Classes sèches UNESCO/PNUE : plages de l'indice AI = P / PET. */
const ORDER = ['hyperaride', 'aride', 'semi-aride', 'subhumide'];
const CLASSES = {
  hyperaride: { label: 'Hyperaride', ai: 0.02, motif: 'trait plein', dash: [] },
  aride: { label: 'Aride', ai: 0.12, motif: 'tirets longs', dash: [7, 5] },
  'semi-aride': { label: 'Semi-aride', ai: 0.35, motif: 'pointillés', dash: [2, 4] },
  subhumide: { label: 'Sub-humide sec', ai: 0.58, motif: 'tiret-point', dash: [5, 2, 1, 2] },
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  ai: 0.12,
  playing: false,
  reduced: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- E014-05 : générateur déterministe (mulberry32, graine affichée) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAND = (() => {
  const r = mulberry32(SEED);
  return Array.from({ length: 24 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 1.6 }));
})();
const TUFTS = (() => {
  const r = mulberry32(SEED ^ 0x9E3779B9);
  return Array.from({ length: 28 }, () => r());
})();

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, digits = 2) => n.toFixed(digits).replace('.', ',');

function classify(ai) {
  if (ai < 0.05) return 'hyperaride';
  if (ai < 0.20) return 'aride';
  if (ai < 0.50) return 'semi-aride';
  return 'subhumide';
}

/* Couverture végétative schématique : 0 en désert extrême, 1 au seuil humide. */
function vegetation(ai) {
  return Math.max(0, Math.min(1, (ai - 0.05) / (HUMIDE_REF - 0.05)));
}

function measures(ai) {
  return {
    classe: classify(ai),
    couverture: Math.round(vegetation(ai) * 100),
    reference: Math.round((ai / HUMIDE_REF) * 100),
    pluie: Math.round(ai * 1000), /* équivalent P (mm) pour un PET de 1 000 mm. */
  };
}

function legendText() {
  const key = classify(S.ai);
  return `Classe ${CLASSES[key].label} · flèches de vent en ${CLASSES[key].motif} : `
    + 'le style de trait distingue la classe, indépendamment de la couleur. '
    + `Graine ${SEED} (${SEED.toString(16)}, ${SEED.toString(10)}).`;
}

/* ---------- E014-03 / 04 / 08 / 10 : feuille de style unique ---------- */

const CSS = `
#${P}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${P}-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${P}-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${P}-panel p{margin:5px 0;max-width:68ch}
#${P}-panel .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${P}-panel .${P}-limite{
  margin:6px 0;padding-left:9px;border-left:2px dashed var(--muted,#9a938a);
}
#${P}-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${P}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${P}-table th,#${P}-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${P}-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-classe{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${P}-classe legend{padding:0 4px;color:var(--muted)}
#${P}-panel .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${P}-panel .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${P}-ai{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${P}-ai-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-canvas{
  display:block;width:100%;height:220px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${P}-legend{font-size:10px;color:var(--muted)}
#${P}-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${P}-readout strong{color:var(--gold-bright,#f4d69e)}
#${P}-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${P}-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${P}-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${P}-panel[data-${P}-reduced="1"] button,
#${P}-panel[data-${P}-reduced="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${P}-panel button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${P}-panel{font-size:10px;padding:9px}
  #${P}-canvas{height:180px}
  #${P}-panel .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* E014-01 : trois faits + une limite, textes réels dans le DOM. */
function staticFacts() {
  const wrap = mk('div');
  const faits = [
    'Un désert se définit par un déficit d’eau, non par la chaleur : l’indice d’aridité '
      + 'AI est le rapport entre précipitations et évapotranspiration potentielle (P / PET). '
      + 'Le Gobi et l’Antarctique sont arides bien que froids.',
    'La classification internationale (UNESCO / PNUE) distingue quatre climats secs : '
      + 'hyperaride (AI < 0,05), aride (0,05 à 0,20), semi-aride (0,20 à 0,50) et '
      + 'sub-humide sec (0,50 à 0,65). Au-delà de 0,65, le climat est humide.',
    'Les zones sèches (AI < 0,65) couvrent environ 41 % des terres émergées selon le PNUE : '
      + 'l’aridité est un état courant du globe, pas une anomalie locale.',
  ];
  faits.forEach((texte) => wrap.appendChild(mk('p', P + '-fait', texte)));
  wrap.appendChild(mk('p', P + '-limite',
    'Limite du modèle : le transect illustre une formule schématique, pas une mesure de terrain. '
    + 'La couverture végétative et les dunes varient aussi avec le sol, le vent et l’usage des sols ; '
    + 'l’indice AI seul ne prédit pas la biodiversité réelle.'));
  return wrap;
}

/* E014-02 : classification UNESCO/PNUE, seuil humide 0,65 en référence. */
function staticTable() {
  const table = mk('table');
  table.id = P + '-table';
  table.appendChild(mk('caption', '',
    'Classes de climat sec selon l’indice d’aridité AI = P / PET (référence : AI ≥ 0,65 = climat humide).'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Classe', 'Plage de l’AI', 'Caractéristique'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  const lignes = [
    ['Hyperaride', '< 0,05', 'Désert extrême, végétation quasi absente'],
    ['Aride', '0,05 – 0,20', 'Dunes et sols nus dominants'],
    ['Semi-aride', '0,20 – 0,50', 'Steppe à végétation clairsemée'],
    ['Sub-humide sec', '0,50 – 0,65', 'Transition vers le climat humide'],
    ['Humide (référence)', '≥ 0,65', 'Couverture végétative continue'],
  ];
  lignes.forEach((cells) => {
    const tr = mk('tr');
    cells.forEach((c, i) => {
      const cell = mk(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const idPanel = P + '-panel';
  const existant = document.getElementById(idPanel);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radioByKey: {
        hyperaride: document.getElementById(P + '-class-hyperaride'),
        aride: document.getElementById(P + '-class-aride'),
        'semi-aride': document.getElementById(P + '-class-semi-aride'),
        subhumide: document.getElementById(P + '-class-subhumide'),
      },
      ai: document.getElementById(P + '-ai'),
      aiOut: document.getElementById(P + '-ai-value'),
      canvas: document.getElementById(P + '-canvas'),
      readout: document.getElementById(P + '-readout'),
      play: document.getElementById(P + '-play'),
      legend: document.getElementById(P + '-legend'),
    };
  }

  const panel = document.createElement('section');
  panel.id = idPanel;
  panel.setAttribute('aria-labelledby', P + '-title');

  const title = mk('h2', '', 'Déserts et zones arides');
  title.id = P + '-title';
  const lead = mk('p', '', 'Un désert n’est pas d’abord un lieu chaud : c’est un lieu où l’eau manque. '
    + 'Comparer les classes d’aridité permet de voir que le passage du désert au climat humide '
    + 'est un continuum mesurable, de l’hyperaride au seuil de référence 0,65.');

  /* E014-03 : radiogroup natif, pas d'aria-pressed sur un choix unique. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = P + '-classe';
  fieldset.setAttribute('role', 'radiogroup');
  const legendElt = mk('legend', '', 'Classe de climat sec observée (choix unique)');
  fieldset.appendChild(legendElt);
  const radioByKey = {};
  ORDER.forEach((key) => {
    const lab = mk('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-class';
    radio.id = P + '-class-' + key;
    radio.value = key;
    radio.checked = classify(S.ai) === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(CLASSES[key].label));
    fieldset.appendChild(lab);
    radioByKey[key] = radio;
  });

  const sub = mk('h3', '', 'Explorer l’indice d’aridité');
  const aiRow = mk('p');
  const aiLabel = document.createElement('label');
  aiLabel.setAttribute('for', P + '-ai');
  aiLabel.appendChild(document.createTextNode('Indice d’aridité AI = '));
  const aiOut = mk('span', '', fmt(S.ai));
  aiOut.id = P + '-ai-value';
  aiLabel.appendChild(aiOut);
  aiRow.appendChild(aiLabel);

  /* E014-04 : curseur borné au domaine des climats secs (0 à 0,65). */
  const ai = document.createElement('input');
  ai.type = 'range';
  ai.id = P + '-ai';
  ai.min = '0';
  ai.max = String(HUMIDE_REF);
  ai.step = '0.01';
  ai.value = String(S.ai);
  ai.setAttribute('aria-label', 'Indice d’aridité, de 0 à 0,65');

  /* E014-05 / 08 : canvas accessible au clavier et étiqueté. */
  const canvas = document.createElement('canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Transect éolien schématique : dunes, végétation et vent. '
    + 'Flèches gauche et droite : changer de classe ; flèches haut et bas : modifier l’indice d’aridité.');

  const legendTextNode = mk('p', P + '-legend', legendText());
  legendTextNode.id = P + '-legend';

  /* E014-06 : grandeur textuelle annoncée aux technologies d'assistance. */
  const readout = mk('p', P + '-readout');
  readout.id = P + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = mk('button', '', S.playing ? '■ Arrêter la migration' : '▶ Animer la migration du sable');
  play.type = 'button';
  play.id = P + '-play';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); /* bascule indépendante. */

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, aiRow, ai,
    canvas, legendTextNode, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radioByKey, ai, aiOut, canvas, readout, play, legend: legendTextNode };
}

/* ---------- E014-05 : rendu du laboratoire (un seul canvas, un dessin/frame) ---------- */

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

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (xn) => pad + xn * iw;
  const py = (yn) => pad + yn * ih;

  const ai = S.ai;
  const key = classify(ai);
  const veg = vegetation(ai);
  const dryness = 1 - veg;

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* E014-08 : style de trait = classe (jamais la couleur seule). */
  g.strokeStyle = 'rgba(214,207,193,.75)';
  g.lineWidth = 1.2;
  if (g.setLineDash) g.setLineDash(CLASSES[key].dash);
  [0.16, 0.28, 0.40].forEach((yn, i) => {
    const y = py(yn);
    const x1 = px(0.44 - i * 0.03);
    g.beginPath();
    g.moveTo(px(0.08), y);
    g.lineTo(x1, y);
    g.stroke();
    g.beginPath();
    g.moveTo(x1, y); g.lineTo(x1 - 7, y - 4);
    g.moveTo(x1, y); g.lineTo(x1 - 7, y + 4);
    g.stroke();
  });
  if (g.setLineDash) g.setLineDash([]);

  /* Profil de dunes : amplitude croissante avec la sécheresse. */
  const amp = 0.05 + 0.13 * dryness;
  const groundY = (xn) => 0.80 - amp * (
    0.5 * Math.sin(xn * Math.PI * 3.0 + 0.6) + 0.5 * Math.sin(xn * Math.PI * 7.0 + 1.4)
  );
  g.beginPath();
  g.moveTo(px(0), py(1));
  for (let i = 0; i <= 64; i += 1) {
    const xn = i / 64;
    g.lineTo(px(xn), py(groundY(xn)));
  }
  g.lineTo(px(1), py(1));
  g.closePath();
  g.fillStyle = 'rgba(230,185,111,.16)';
  g.fill();
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i <= 64; i += 1) {
    const xn = i / 64;
    if (i === 0) g.moveTo(px(xn), py(groundY(xn)));
    else g.lineTo(px(xn), py(groundY(xn)));
  }
  g.stroke();

  /* Crêtes : triangles, repère non chromatique. */
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1;
  [0.17, 0.50, 0.83].forEach((xn) => {
    const y = py(groundY(xn));
    g.beginPath();
    g.moveTo(px(xn) - 5, y);
    g.lineTo(px(xn), y - 7);
    g.lineTo(px(xn) + 5, y);
    g.closePath();
    g.stroke();
  });

  /* Touffes de végétation : trois branches, nombre = f(AI). */
  const count = Math.round(veg * TUFTS.length);
  g.strokeStyle = 'rgba(214,207,193,.95)';
  for (let i = 0; i < count; i += 1) {
    const xn = ((i + 0.5) + (TUFTS[i] - 0.5)) / TUFTS.length;
    const y = py(groundY(xn));
    g.beginPath();
    g.moveTo(px(xn), y); g.lineTo(px(xn) - 3, y - 8);
    g.moveTo(px(xn), y); g.lineTo(px(xn), y - 11);
    g.moveTo(px(xn), y); g.lineTo(px(xn) + 3, y - 8);
    g.stroke();
  }

  /* Grains de sable : position déterministe = f(graine, S.sweep). */
  g.fillStyle = 'rgba(244,214,158,.95)';
  SAND.forEach((p) => {
    const xn = (p.x + S.sweep * p.s) % 1;
    const yn = 0.55 + 0.23 * p.y;
    g.fillRect(px(xn), py(yn), 1.6, 1.6);
  });

  g.font = '11px sans-serif';
  g.fillText(CLASSES[key].label + ' · AI ' + fmt(ai), pad + 2, pad + 13);
  g.fillText('graine ' + SEED, pad + 2, cssH - pad - 4);
}

/* ---------- E014-06 : grandeurs chiffrées comparées à une référence ---------- */

function updateReadout() {
  const m = measures(S.ai);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Indice d’aridité AI = '));
  n.appendChild(fort(fmt(S.ai)));
  n.appendChild(document.createTextNode(' (P / PET), soit la classe '));
  n.appendChild(fort(CLASSES[m.classe].label));
  n.appendChild(document.createTextNode('. Couverture végétative schématique : '));
  n.appendChild(fort(m.couverture + ' %'));
  n.appendChild(document.createTextNode('. L’indice représente '));
  n.appendChild(fort(m.reference + ' %'));
  n.appendChild(document.createTextNode(' du seuil humide de référence (0,65). Avec un PET de 1 000 mm, '
    + 'cela équivaut à '));
  n.appendChild(fort(m.pluie + ' mm'));
  n.appendChild(document.createTextNode(' de précipitations annuelles.'));
}

function syncControls() {
  const n = S.nodes;
  const key = classify(S.ai);
  ORDER.forEach((k) => {
    const radio = n.radioByKey && n.radioByKey[k];
    if (radio) radio.checked = k === key;
  });
  if (n.ai) n.ai.value = String(S.ai);
  if (n.aiOut) n.aiOut.textContent = fmt(S.ai);
  if (n.legend) n.legend.textContent = legendText();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la migration' : '▶ Animer la migration du sable';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E014-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
    if (S.playing && !S.reduced) S.sweep = (S.sweep + dt * 0.00035) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E014-10 : écouteurs globaux installés une seule fois ---------- */

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(P + '-panel');
        if (panel) panel.setAttribute('data-' + P + '-reduced', S.reduced ? '1' : '0');
        if (S.reduced) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- E014-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  const idBadge = P + '-badge';
  if (!map || document.getElementById(idBadge)) return;
  const badge = mk('div', P + '-badge',
    'Transect éolien schématique : le paysage illustre l’indice choisi, ce n’est pas une donnée de terrain.');
  badge.id = idBadge;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E014', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.setAttribute('data-' + P + '-reduced', reduced ? '1' : '0');
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDER.forEach((key) => {
      const radio = n.radioByKey[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.ai = CLASSES[key].ai;
        syncControls();
      });
    });
    n.ai.addEventListener('input', () => {
      S.ai = Math.max(0, Math.min(HUMIDE_REF, Math.round(Number(n.ai.value) * 100) / 100));
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
        const i = ORDER.indexOf(classify(S.ai));
        S.ai = CLASSES[ORDER[(i + step + ORDER.length) % ORDER.length]].ai;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 0.05 : -0.05;
        S.ai = Math.max(0, Math.min(HUMIDE_REF, Math.round((S.ai + step) * 100) / 100));
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
  if (S.playing && !S.reduced) startLoop();
});
