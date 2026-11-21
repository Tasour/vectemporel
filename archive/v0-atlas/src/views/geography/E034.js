import { register } from './registry.js';

/* Lentille E034 — vue GEOGRAPHIE.
 * Thème : couverture végétale — indice NDVI calculé localement, sans réseau.
 *
 * Les dix chantiers E034-01 … E034-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E034.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre une formule déterministe.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PANEL_ID = 'geography-e034-panel';
const TITLE_ID = 'geography-e034-title';
const SCENARIO_ID = 'geography-e034-scenario';
const RED_ID = 'geography-e034-red';
const RED_OUT_ID = 'geography-e034-red-value';
const NIR_ID = 'geography-e034-nir';
const NIR_OUT_ID = 'geography-e034-nir-value';
const CANVAS_ID = 'geography-e034-canvas';
const READOUT_ID = 'geography-e034-readout';
const PLAY_ID = 'geography-e034-play';
const LEGEND_ID = 'geography-e034-legend';
const BADGE_ID = 'geography-e034-badge';
const TABLE_ID = 'geography-e034-table';

/* Scénarios de référence : réflectances en centièmes (ex. 3 = 0,03). */
const PRESETS = {
  eau: { label: 'Eau / non végétalisé', redH: 3, nirH: 1 },
  sol: { label: 'Sol nu', redH: 20, nirH: 24 },
  prairie: { label: 'Végétation clairsemée', redH: 10, nirH: 22 },
  foret: { label: 'Forêt saine', redH: 3, nirH: 39 },
};
const PRESET_ORDER = ['eau', 'sol', 'prairie', 'foret'];

/* Tableau statique : chaque ligne est recalculée par la même formule. */
const ROWS = [
  ['Eau / non végétalisé', 3, 1, 'Réflexion faible dans le proche infrarouge'],
  ['Sol nu', 20, 24, 'Rouge et infrarouge proches, indice près de zéro'],
  ['Végétation clairsemée', 10, 22, 'Couvert incomplet, sol encore visible'],
  ['Végétation dense', 5, 35, 'Forte absorption du rouge, fort retour infrarouge'],
  ['Forêt saine (référence)', 3, 39, 'Couvert continu et feuillage actif'],
];

const CLASS_RANGES = [
  { max: 0, key: 'eau', label: 'Eau / surface non végétalisée', motif: 'ondes horizontales', aria: 'Surface non végétalisée, indice négatif, dessinée avec des ondes horizontales.' },
  { max: 0.1, key: 'sol', label: 'Sol nu', motif: 'hachures diagonales clairsemées', aria: 'Sol nu, indice proche de zéro, dessiné avec des hachures diagonales.' },
  { max: 0.4, key: 'clairsemee', label: 'Végétation clairsemée', motif: 'quelques touffes', aria: 'Végétation clairsemée, quelques touffes espacées.' },
  { max: 0.8, key: 'dense', label: 'Végétation dense', motif: 'touffes nombreuses', aria: 'Végétation dense, touffes nombreuses et hautes.' },
  { max: Infinity, key: 'foret', label: 'Forêt saine', motif: 'touffes serrées et hautes', aria: 'Forêt saine, couvert continu de touffes serrées.' },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  redH: PRESETS.foret.redH,
  nirH: PRESETS.foret.nirH,
  preset: 'foret',
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const pct = (n) => `${Math.round(n * 100)} %`;
const reflectance = (h) => h / 100;
const ndvi = (red, nir) => (nir - red) / (nir + red);
const ndviVal = () => ndvi(reflectance(S.redH), reflectance(S.nirH));
const REF_NDVI = ndvi(reflectance(PRESETS.foret.redH), reflectance(PRESETS.foret.nirH));

function classe(nd) {
  for (let i = 0; i < CLASS_RANGES.length; i += 1) {
    if (nd < CLASS_RANGES[i].max) return CLASS_RANGES[i];
  }
  return CLASS_RANGES[CLASS_RANGES.length - 1];
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e034-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e034-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e034-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e034-panel p{margin:5px 0;max-width:70ch}
#geography-e034-panel .geography-e034-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e034-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e034-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e034-table th,#geography-e034-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e034-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e034-scenario{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e034-scenario legend{padding:0 4px;color:var(--muted)}
#geography-e034-panel .geography-e034-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e034-panel .geography-e034-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
.geography-e034-curseur{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-e034-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e034-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e034-legend{font-size:10px;color:var(--muted)}
#geography-e034-readout{
  min-height:46px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e034-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e034-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e034-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e034-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e034-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e034-panel[data-geography-e034-reduced="1"] button,
#geography-e034-panel[data-geography-e034-reduced="1"] .geography-e034-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e034-panel button,.geography-e034-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e034-panel{font-size:10px;padding:9px}
  #geography-e034-canvas{height:200px}
  #geography-e034-panel .geography-e034-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'L’indice NDVI (Normalized Difference Vegetation Index) compare la réflectance dans le rouge (RED, autour de 0,66 µm) et dans le proche infrarouge (NIR, autour de 0,86 µm). Les feuilles absorbent le rouge pour la photosynthèse et réfléchissent le proche infrarouge : plus le couvert est dense et sain, plus l’écart est grand.',
    'La formule est NDVI = (NIR − RED) / (NIR + RED). L’indice varie de −1 à +1 : l’eau donne une valeur négative, un sol nu reste proche de zéro, une forêt saine dépasse 0,8. Toutes les valeurs de ce panneau sont calculées localement à partir de réflectances choisies, sans image satellite ni requête réseau.',
    'Un NDVI élevé traduit une forte absorption du rouge et un fort retour du proche infrarouge. La référence retenue ici est la forêt saine, soit un NDVI d’environ 0,86 ; elle sert de repère explicite pour comparer chaque surface.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e034-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Classes de couverture végétale. Le NDVI de chaque ligne est recalculé par (NIR − RED) / (NIR + RED) à partir des deux réflectances indiquées ; la forêt saine sert de référence.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Classe', 'Rouge (RED)', 'Infrarouge (NIR)', 'NDVI calculé', 'Interprétation'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ROWS.forEach((row) => {
    const tr = document.createElement('tr');
    const cells = [
      row[0],
      fmt2(reflectance(row[1])),
      fmt2(reflectance(row[2])),
      fmt2(ndvi(reflectance(row[1]), reflectance(row[2]))),
      row[3],
    ];
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

function scenarioFieldset() {
  const fieldset = document.createElement('fieldset');
  fieldset.id = SCENARIO_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Scénario de surface (choix unique)';
  fieldset.appendChild(legend);
  const radios = {};
  PRESET_ORDER.forEach((key) => {
    const lab = document.createElement('label');
    lab.className = 'geography-e034-choix';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e034-scenario';
    radio.id = `geography-e034-scenario-${key}`;
    radio.value = key;
    radio.checked = S.preset === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(PRESETS[key].label));
    fieldset.appendChild(lab);
    radios[key] = radio;
  });
  return { fieldset, radios };
}

function rangeControl(id, label, minH, maxH, valueH, outId) {
  const row = document.createElement('p');
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(`${label} : `));
  const out = document.createElement('span');
  out.id = outId;
  out.className = 'geography-e034-valeur';
  lab.appendChild(out);
  row.appendChild(lab);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.className = 'geography-e034-curseur';
  input.min = String(minH);
  input.max = String(maxH);
  input.step = '1';
  input.value = String(valueH);
  input.setAttribute('aria-valuetext', fmt2(reflectance(valueH)));
  return { row, input, out };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: {
        eau: document.getElementById('geography-e034-scenario-eau'),
        sol: document.getElementById('geography-e034-scenario-sol'),
        prairie: document.getElementById('geography-e034-scenario-prairie'),
        foret: document.getElementById('geography-e034-scenario-foret'),
      },
      red: document.getElementById(RED_ID),
      redOut: document.getElementById(RED_OUT_ID),
      nir: document.getElementById(NIR_ID),
      nirOut: document.getElementById(NIR_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = document.createElement('h2');
  title.id = TITLE_ID;
  title.textContent = 'Couverture végétale et indice NDVI';
  const lead = document.createElement('p');
  lead.textContent = 'Comparer des surfaces à partir de deux réflectances permet de comprendre comment on estime une couverture végétale sans image satellite : l’indice NDVI se calcule localement, une formule et des curseurs suffisent.';

  const sub = document.createElement('h3');
  sub.textContent = 'Choisir une surface et régler les réflectances';
  const scenario = scenarioFieldset();
  const red = rangeControl(RED_ID, 'Rouge (RED)', 1, 50, S.redH, RED_OUT_ID);
  const nir = rangeControl(NIR_ID, 'Proche infrarouge (NIR)', 1, 90, S.nirH, NIR_OUT_ID);
  red.input.setAttribute('aria-label', 'Réflectance dans le rouge, de 0,01 à 0,50');
  nir.input.setAttribute('aria-label', 'Réflectance dans le proche infrarouge, de 0,01 à 0,90');

  const subLab = document.createElement('h3');
  subLab.textContent = 'Laboratoire : transect et jauge NDVI';
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Transect de couverture végétale et jauge NDVI. Flèches gauche et droite : modifier le rouge ; flèches haut et bas : modifier le proche infrarouge.');

  const legendText = document.createElement('p');
  legendText.id = LEGEND_ID;
  legendText.className = 'geography-e034-legend';

  const readout = document.createElement('p');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = document.createElement('button');
  play.type = 'button';
  play.id = PLAY_ID;
  play.textContent = S.playing ? '■ Arrêter l’échantillonnage' : '▶ Animer l’échantillonnage';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), sub, scenario.fieldset,
    red.row, red.input, nir.row, nir.input, subLab, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios: scenario.radios,
    red: red.input, redOut: red.out, nir: nir.input, nirOut: nir.out,
    canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas déterministe) ---------- */

function tuft(g, x, baseY, h) {
  g.save();
  g.strokeStyle = 'rgba(190,222,160,.9)';
  g.lineWidth = 1.5;
  if (g.setLineDash) g.setLineDash([]);
  g.beginPath();
  g.moveTo(x, baseY); g.lineTo(x, baseY - h);
  g.moveTo(x, baseY - h * 0.55); g.lineTo(x - h * 0.42, baseY - h * 0.95);
  g.moveTo(x, baseY - h * 0.62); g.lineTo(x + h * 0.42, baseY - h);
  g.stroke();
  g.restore();
}

function waterLines(g, L, R, y, n) {
  g.save();
  g.strokeStyle = 'rgba(130,180,215,.85)';
  g.lineWidth = 1.2;
  if (g.setLineDash) g.setLineDash([]);
  for (let i = 0; i < n; i += 1) {
    const yy = y + i * 5;
    g.beginPath();
    for (let x = L; x <= R; x += 6) {
      const dy = Math.sin((x + i * 9) / 14) * 1.5;
      if (x === L) g.moveTo(x, yy + dy);
      else g.lineTo(x, yy + dy);
    }
    g.stroke();
  }
  g.restore();
}

function hatch(g, L, R, y0, y1, n) {
  g.save();
  g.strokeStyle = 'rgba(214,207,193,.42)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  for (let i = 0; i < n; i += 1) {
    const x = L + (i + 0.5) * (R - L) / n;
    g.beginPath();
    g.moveTo(x, y1);
    g.lineTo(x + 7, y0);
    g.stroke();
  }
  g.restore();
}

function gauge(g, L, R, y, nd) {
  g.save();
  if (g.setLineDash) g.setLineDash([]);
  g.strokeStyle = 'rgba(214,207,193,.65)';
  g.lineWidth = 1;
  g.strokeRect(L, y, R - L, 8);
  const posX = (v) => L + ((v + 1) / 2) * (R - L);
  [0, 0.1, 0.4, 0.8].forEach((v) => {
    g.beginPath();
    g.moveTo(posX(v), y - 3);
    g.lineTo(posX(v), y + 11);
    g.stroke();
  });
  g.fillStyle = 'rgba(244,214,158,.95)';
  const mx = posX(Math.max(-1, Math.min(1, nd)));
  g.beginPath();
  g.moveTo(mx, y - 8);
  g.lineTo(mx - 5, y - 2);
  g.lineTo(mx + 5, y - 2);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '9px sans-serif';
  g.fillText('−1', L, y + 21);
  g.fillText('0', posX(0) - 2, y + 21);
  g.fillText('+1', R - 12, y + 21);
  g.restore();
}

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

  const pad = 14;
  const L = pad;
  const R = cssW - pad;
  const T = pad;
  const B = cssH - pad;
  const surfaceY = T + (B - T) * 0.52;
  const gaugeY = B - 26;
  const nd = ndviVal();
  const cl = classe(nd);

  g.fillStyle = 'rgba(90,130,170,.10)';
  g.fillRect(L, T, R - L, surfaceY - T);
  g.fillStyle = 'rgba(130,85,45,.15)';
  g.fillRect(L, surfaceY, R - L, gaugeY - 6 - surfaceY);

  if (cl.key === 'eau') {
    waterLines(g, L + 4, R - 4, T + 18, 4);
  } else if (cl.key === 'sol') {
    hatch(g, L + 4, R - 4, surfaceY + 4, gaugeY - 10, 14);
  } else {
    const count = Math.max(2, Math.min(18, Math.round(Math.max(0, nd) * 22)));
    const h = 7 + Math.max(0, nd) * 24;
    for (let i = 0; i < count; i += 1) {
      const denom = Math.max(1, count - 1);
      const x = L + 12 + i * (R - L - 24) / denom;
      tuft(g, x, surfaceY, h);
    }
  }

  gauge(g, L, R, gaugeY, nd);

  g.save();
  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.lineWidth = 1.5;
  if (g.setLineDash) g.setLineDash([4, 4]);
  const sx = L + S.phase * (R - L);
  g.beginPath();
  g.moveTo(sx, T);
  g.lineTo(sx, gaugeY - 6);
  g.stroke();
  g.restore();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`${cl.label} · NDVI ${fmt2(nd)}`, L + 2, T + 10);
  g.font = '9px sans-serif';
  g.fillText('Échantillon local (ligne pointillée)', L + 2, gaugeY - 10);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const nd = ndviVal();
  const cl = classe(nd);
  const red = reflectance(S.redH);
  const nir = reflectance(S.nirH);
  const rapport = REF_NDVI === 0 ? 0 : nd / REF_NDVI;
  const ecart = nd - REF_NDVI;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('NDVI = (NIR − RED) / (NIR + RED) = '));
  n.appendChild(fort(`(${fmt2(nir)} − ${fmt2(red)}) / (${fmt2(nir)} + ${fmt2(red)}) = ${fmt2(nd)}`));
  n.appendChild(document.createTextNode(`. Classe : ${cl.label} (${cl.motif}). Soit `));
  n.appendChild(fort(pct(rapport)));
  n.appendChild(document.createTextNode(` de la référence « forêt saine » (NDVI ${fmt2(REF_NDVI)}), écart de `));
  n.appendChild(fort(`${fmt2(ecart).replace('-', '−')}`));
  n.appendChild(document.createTextNode('. Aucune image satellite ni requête réseau : les valeurs proviennent uniquement des deux réflectances réglées.'));
}

function syncControls() {
  const n = S.nodes;
  PRESET_ORDER.forEach((key) => {
    if (n.radios && n.radios[key]) n.radios[key].checked = S.preset === key;
  });
  if (n.red) {
    n.red.value = String(S.redH);
    n.red.setAttribute('aria-valuetext', fmt2(reflectance(S.redH)));
  }
  if (n.nir) {
    n.nir.value = String(S.nirH);
    n.nir.setAttribute('aria-valuetext', fmt2(reflectance(S.nirH)));
  }
  if (n.redOut) n.redOut.textContent = fmt2(reflectance(S.redH));
  if (n.nirOut) n.nirOut.textContent = fmt2(reflectance(S.nirH));
  const nd = ndviVal();
  const cl = classe(nd);
  if (n.legend) {
    n.legend.textContent = `${cl.label} — motif distinctif : ${cl.motif}. Les seuils de la jauge sont 0, 0,10, 0,40 et 0,80 ; un réglage manuel des curseurs désélectionne les scénarios.`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’échantillonnage' : '▶ Animer l’échantillonnage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.canvas) {
    n.canvas.setAttribute('aria-label', `${cl.aria} NDVI ${fmt2(nd)}, soit ${pct(REF_NDVI === 0 ? 0 : nd / REF_NDVI)} de la référence forêt saine (${fmt2(REF_NDVI)}). Flèches gauche et droite : modifier le rouge ; flèches haut et bas : modifier le proche infrarouge.`);
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
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.phase = (S.phase + dt * 0.00022) % 1;
  }
  S.lastTs = ts;
  updateReadout();
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReduced = null;

function installGlobalListeners(ctx) {
  ctxReduced = ctx.reducedMotion;
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
        if (panel) panel.dataset.geographyE034Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); syncControls(); }
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
  const badge = document.createElement('div');
  badge.className = 'geography-e034-badge';
  badge.id = BADGE_ID;
  badge.textContent = 'NDVI calculé localement à partir de réflectances choisies — aucune image satellite, aucun réseau. Valeurs indicatives, non mesurées sur le terrain.';
  map.appendChild(badge);
}

/* ---------- Point d'entrée : les dix chantiers sont branchés ici ---------- */

register('E034', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css('geography-e034', CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE034Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    PRESET_ORDER.forEach((key) => {
      const radio = n.radios[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.preset = key;
        S.redH = PRESETS[key].redH;
        S.nirH = PRESETS[key].nirH;
        syncControls();
      });
    });
    n.red.addEventListener('input', () => {
      S.redH = Math.max(1, Math.min(50, Math.round(Number(n.red.value))));
      S.preset = null;
      syncControls();
    });
    n.nir.addEventListener('input', () => {
      S.nirH = Math.max(1, Math.min(90, Math.round(Number(n.nir.value))));
      S.preset = null;
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
        S.redH = Math.max(1, Math.min(50, S.redH + step));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.nirH = Math.max(1, Math.min(90, S.nirH + step));
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        S.preset = null;
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing && !reduced) startLoop();
});
