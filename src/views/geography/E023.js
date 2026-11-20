import { register } from './registry.js';

/* Lentille E023 — vue GEOGRAPHIE.
 * Thème : détroits et canaux (passages étroits, gabarits et marge de sécurité).
 *
 * Les dix chantiers E023-01 … E023-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E023.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset, label, select) présent dans le DOM même
 * sans animation ni interaction ; le canvas n'est qu'un laboratoire qui
 * illustre des grandeurs calculées par formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e023';
const PANEL_ID = 'geography-e023-panel';
const TITLE_ID = 'geography-e023-title';
const TABLE_ID = 'geography-e023-table';
const TYPE_ID = 'geography-e023-type';
const PASSAGE_ID = 'geography-e023-passage';
const BEAM_ID = 'geography-e023-beam';
const BEAM_OUT_ID = 'geography-e023-beam-value';
const CANVAS_ID = 'geography-e023-canvas';
const READOUT_ID = 'geography-e023-readout';
const PLAY_ID = 'geography-e023-play';
const LEGEND_ID = 'geography-e023-legend';
const BADGE_ID = 'geography-e023-badge';

/* Ordres de grandeur publics, explicitement présentés comme tels dans le
 * tableau statique ; aucune valeur n'est inventée pour alimenter une animation. */
const PASSAGES = [
  { id: 'gibraltar', nom: 'Détroit de Gibraltar', type: 'detroit', largeur: 14000, gabarit: 14000, profondeur: 300, repere: 'seuil de Camarinal' },
  { id: 'bosphore', nom: 'Détroit du Bosphore', type: 'detroit', largeur: 700, gabarit: 700, profondeur: 60, repere: 'chenal le plus étroit' },
  { id: 'suez', nom: 'Canal de Suez', type: 'canal', largeur: 205, gabarit: 205, profondeur: 24, repere: 'après approfondissement (2010)' },
  /* À Panama, le chenal mesure ~150 m mais la chambre d'écluse (33,5 m)
     est le vrai gabarit limitant : c'est elle qui commande le passage. */
  { id: 'panama', nom: 'Canal de Panama (écluses)', type: 'canal', largeur: 150, gabarit: 33.5, profondeur: 12, repere: 'chambre d’écluses : 33,5 m' },
];

const MARGE = 5;          /* mètres de sécurité de chaque bord. */
const TIRANT_REF = 12;    /* tirant d'eau de référence (Panamax), en mètres. */
const BAU_REF = 32.2;     /* bau de référence (Panamax), en mètres. */
const SEED = 0xE023;      /* graine affichée : zéro tirage aléatoire. */

const TYPE_LABELS = {
  tous: 'Tous les passages',
  detroit: 'Détroits naturels',
  canal: 'Canaux artificiels',
};

const TYPE_TRAITS = {
  detroit: 'trait plein',
  canal: 'tirets longs',
};

const S = {
  type: 'tous',
  passageId: 'suez',
  beam: 32,
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes ---------- */

const fmt = (n, digits) => {
  const d = digits || 0;
  const v = Math.round(n * 10 ** d) / 10 ** d;
  return v.toFixed(d).replace('.', ',');
};

function fmtLargeur(m) {
  return m >= 1000 ? `${fmt(m / 1000, 1)} km` : `${fmt(m, 0)} m`;
}

function passesDisponibles() {
  return PASSAGES.filter((p) => S.type === 'tous' || p.type === S.type);
}

function passageCourant() {
  return PASSAGES.find((p) => p.id === S.passageId) || PASSAGES[0];
}

function mesures() {
  const p = passageCourant();
  const bau = S.beam;
  const necessaire = bau + 2 * MARGE;
  return {
    p,
    bau,
    necessaire,
    ratio: p.gabarit / bau,
    deFront: Math.floor(p.gabarit / necessaire),
    margeEau: p.profondeur - TIRANT_REF,
    passe: p.gabarit >= necessaire && p.profondeur >= TIRANT_REF,
  };
}

/* ---------- Feuille de style unique ---------- */

const CSS = `
#geography-e023-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e023-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e023-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e023-panel p{margin:5px 0;max-width:68ch}
#geography-e023-panel .geography-e023-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#geography-e023-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e023-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e023-table th,#geography-e023-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e023-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e023-type{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e023-type legend{padding:0 4px;color:var(--muted)}
#geography-e023-panel .geography-e023-choix{display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer}
#geography-e023-panel .geography-e023-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e023-ligne{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
#geography-e023-ligne label{min-height:36px;display:inline-flex;align-items:center;gap:6px}
#geography-e023-passage{min-height:36px;padding:5px 7px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink);font:inherit;font-size:10px}
#geography-e023-beam{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e023-beam-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e023-canvas{display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:none}
#geography-e023-legend{font-size:10px;color:var(--muted)}
#geography-e023-readout{min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums}
#geography-e023-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e023-panel button{display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;transition:border-color .18s,background-color .18s,color .18s}
#geography-e023-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e023-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e023-badge{position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;border:1px solid var(--gold,#e6b96f);border-radius:6px;background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);font-size:10px;line-height:1.4;pointer-events:none}
#geography-e023-panel[data-geography-e023-reduced="1"] button,
.geography-e023-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e023-panel button,.geography-e023-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e023-panel{font-size:10px;padding:9px}
  #geography-e023-canvas{height:200px}
  #geography-e023-panel .geography-e023-choix{margin-right:4px}
  #geography-e023-ligne{flex-direction:column;align-items:stretch}
}
`;

/* ---------- Construction du panneau (texte sémantique) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un détroit est un passage d’eau naturel entre deux terres ; un canal est un passage artificiel creusé pour joindre deux bassins. Les deux concentrent le trafic en un point étroit : ce sont des points de passage stratégiques.',
    'Le gabarit d’un passage est fixé par sa largeur utile et sa profondeur disponible : dans un canal à écluses, c’est la chambre d’écluse et non le chenal qui limite. Un navire ne passe que si son bau et son tirant d’eau laissent une marge de sécurité.',
    'Les valeurs citées sont des ordres de grandeur : la largeur d’un détroit varie selon l’endroit et la profondeur d’un canal évolue avec les travaux de dragage.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e023-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Ordres de grandeur. Référence : navire Panamax — bau 32,2 m, tirant d’eau 12 m. Le gabarit utile d’un canal à écluses est la largeur de la chambre.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Passage', 'Nature', 'Largeur du chenal', 'Gabarit utile', 'Profondeur', 'Repère'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PASSAGES.forEach((p) => {
    const tr = document.createElement('tr');
    const cells = [
      p.nom,
      p.type === 'detroit' ? 'Détroit naturel' : 'Canal artificiel',
      `≈ ${fmtLargeur(p.largeur)}`,
      `${fmtLargeur(p.gabarit)}`,
      `≈ ${fmt(p.profondeur, 0)} m`,
      p.repere,
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

function fillSelect(select) {
  if (!select) return;
  select.textContent = '';
  passesDisponibles().forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.nom;
    select.appendChild(option);
  });
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(document.querySelectorAll('input[name="geography-e023-type"]')),
      select: document.getElementById(PASSAGE_ID),
      beam: document.getElementById(BEAM_ID),
      beamOut: document.getElementById(BEAM_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e023-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Détroits et canaux — le gabarit des passages');
  title.id = TITLE_ID;
  const lede = ctx.el('p', '', 'Un détroit ou un canal est un goulot : la largeur et la profondeur disponibles y imposent un gabarit. Comparer Gibraltar, le Bosphore, Suez et Panama montre qu’un même navire n’y passe pas partout.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = TYPE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Nature du passage (choix unique)';
  fieldset.appendChild(legend);
  [['tous', 'Tous'], ['detroit', 'Détroits naturels'], ['canal', 'Canaux artificiels']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e023-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e023-type';
    radio.id = `geography-e023-type-${value}`;
    radio.value = value;
    radio.checked = S.type === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const ligne = ctx.el('div', '');
  ligne.id = 'geography-e023-ligne';
  const passageLabel = document.createElement('label');
  passageLabel.setAttribute('for', PASSAGE_ID);
  passageLabel.appendChild(document.createTextNode('Passage observé : '));
  const select = document.createElement('select');
  select.id = PASSAGE_ID;
  passageLabel.appendChild(select);
  ligne.appendChild(passageLabel);

  const sub = ctx.el('h3', '', 'Observer la marge de sécurité');
  const beamRow = ctx.el('p', '');
  const beamLabel = document.createElement('label');
  beamLabel.setAttribute('for', BEAM_ID);
  beamLabel.appendChild(document.createTextNode('Bau du navire : '));
  const beamOut = document.createElement('span');
  beamOut.id = BEAM_OUT_ID;
  beamLabel.appendChild(beamOut);
  beamRow.appendChild(beamLabel);

  const beam = document.createElement('input');
  beam.type = 'range';
  beam.id = BEAM_ID;
  beam.min = '10';
  beam.max = '60';
  beam.step = '1';
  beam.value = String(S.beam);
  beam.setAttribute('aria-label', 'Bau du navire, de 10 à 60 mètres');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe transversale schématique du passage. Flèches gauche et droite : changer de passage ; flèches haut et bas : changer le bau du navire.');

  const legendText = ctx.el('p', 'geography-e023-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e023-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lede, staticFacts(), staticTable(), fieldset, ligne, sub, beamRow, beam, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: Array.from(document.querySelectorAll('input[name="geography-e023-type"]')),
    select, beam, beamOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Laboratoire : coupe transversale (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const m = mesures();
  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const surface = pad + ih * 0.30;
  const fond = pad + ih * 0.86;

  /* Eau : surface pleine et fond du chenal. */
  g.fillStyle = 'rgba(86,150,178,.16)';
  g.fillRect(pad, surface, iw, fond - surface);

  /* Rives : traits pleins, jamais la couleur seule. */
  g.strokeStyle = 'rgba(214,207,193,.75)';
  g.lineWidth = 8;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(pad, surface - 8); g.lineTo(pad, fond + 8);
  g.moveTo(pad + iw, surface - 8); g.lineTo(pad + iw, fond + 8);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(pad, surface); g.lineTo(pad + iw, surface);
  g.stroke();

  /* Gabarit utile : tirets longs. À Panama il est plus étroit que le chenal
     pour montrer que la chambre d'écluse, non le chenal, fixe la limite. */
  const utilePx = Math.min(iw, Math.max(8, (m.p.gabarit / m.p.largeur) * iw));
  const gauche = pad + (iw - utilePx) / 2;
  const droite = gauche + utilePx;
  g.strokeStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 1.5;
  g.setLineDash([9, 5]);
  g.beginPath();
  g.moveTo(gauche, surface); g.lineTo(gauche, fond);
  g.moveTo(droite, surface); g.lineTo(droite, fond);
  g.stroke();

  /* Marge de sécurité de 5 m de chaque bord du gabarit : tirets courts. */
  const margePx = Math.max(1, (MARGE / m.p.gabarit) * utilePx);
  g.strokeStyle = 'rgba(230,185,111,.85)';
  g.lineWidth = 1.5;
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(gauche + margePx, surface); g.lineTo(gauche + margePx, fond);
  g.moveTo(droite - margePx, surface); g.lineTo(droite - margePx, fond);
  g.stroke();

  /* Axe médian : pointillés. */
  g.strokeStyle = 'rgba(255,255,255,.45)';
  g.setLineDash([2, 4]);
  g.beginPath();
  g.moveTo(gauche, (surface + fond) / 2); g.lineTo(droite, (surface + fond) / 2);
  g.stroke();
  g.setLineDash([]);

  /* Navire : bau et tirant d'eau d'après les réglages ; épaisseur plancher
     pour rester visible dans les très larges détroits (schéma non à l'échelle). */
  const largeurNavire = Math.max(4, (m.bau / m.p.gabarit) * utilePx);
  const tirantPx = (TIRANT_REF / m.p.profondeur) * (fond - surface);
  const course = Math.max(0, (utilePx - largeurNavire) / 2 - margePx);
  const x = (gauche + droite) / 2 + (S.phase * 2 - 1) * course;
  const yHaut = Math.max(surface + 2, (surface + fond) / 2 - tirantPx / 2);
  g.fillStyle = m.passe ? 'rgba(244,214,158,.92)' : 'rgba(206,120,110,.85)';
  g.fillRect(x - largeurNavire / 2, yHaut, largeurNavire, Math.max(3, tirantPx));
  g.strokeStyle = 'rgba(8,12,18,.85)';
  g.lineWidth = 1;
  g.strokeRect(x - largeurNavire / 2, yHaut, largeurNavire, Math.max(3, tirantPx));

  /* Libellés : le type est écrit, il ne dépend pas de la couleur. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`${m.p.nom} — ${TYPE_TRAITS[m.p.type]}`, pad + 2, pad - 4);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText(`chenal ${fmtLargeur(m.p.largeur)} · gabarit utile ${fmtLargeur(m.p.gabarit)}`, pad + 2, fond + 13);
  g.fillText(`bau ${fmt(m.bau, 0)} m · tirant ${fmt(TIRANT_REF, 0)} m`, pad + 2, fond + 25);
  g.fillText(m.passe ? 'Passage possible' : 'Gabarit insuffisant', pad + 2, surface - 6);
}

function updateReadout() {
  const m = mesures();
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`${m.p.nom} (${m.p.type === 'detroit' ? 'détroit naturel' : 'canal artificiel'}) : chenal de `));
  n.appendChild(fort(fmtLargeur(m.p.largeur)));
  n.appendChild(document.createTextNode(`, gabarit utile de `));
  n.appendChild(fort(fmtLargeur(m.p.gabarit)));
  n.appendChild(document.createTextNode(', soit '));
  n.appendChild(fort(`${fmt(m.ratio, 1)}×`));
  n.appendChild(document.createTextNode(` le bau du navire ; profondeur ${fmt(m.p.profondeur, 0)} m, marge d’eau ${fmt(m.margeEau, 0)} m sous le tirant de référence de ${fmt(TIRANT_REF, 0)} m. Bau réglé : `));
  n.appendChild(fort(`${fmt(m.bau, 0)} m`));
  n.appendChild(document.createTextNode(` (référence Panamax ${fmt(BAU_REF, 1)} m). Avec ${fmt(MARGE, 0)} m de marge de chaque bord, la largeur nécessaire est de `));
  n.appendChild(fort(`${fmt(m.necessaire, 0)} m`));
  n.appendChild(document.createTextNode(`, soit au plus `));
  n.appendChild(fort(`${fmt(m.deFront, 0)}`));
  n.appendChild(document.createTextNode(` navire(s) de front. Verdict : `));
  n.appendChild(fort(m.passe ? 'passage possible' : 'gabarit insuffisant'));
  n.appendChild(document.createTextNode(`.`));
}

function syncControls() {
  const n = S.nodes;
  const dispo = passesDisponibles();
  if (!dispo.some((p) => p.id === S.passageId)) S.passageId = dispo[0].id;
  if (n.radios) n.radios.forEach((r) => { r.checked = r.value === S.type; });
  if (n.select) {
    fillSelect(n.select);
    n.select.value = S.passageId;
  }
  if (n.beam) n.beam.value = String(S.beam);
  if (n.beamOut) n.beamOut.textContent = `${fmt(S.beam, 0)} m`;
  if (n.legend) {
    const p = passageCourant();
    n.legend.textContent = `Filtre : ${TYPE_LABELS[S.type]}. Rives en trait plein, gabarit utile en tirets longs, marge de ${fmt(MARGE, 0)} m en tirets courts, axe médian en pointillés ; type : ${TYPE_TRAITS[p.type]}. Le navire est schématisé (épaisseur plancher pour la lisibilité), les chiffres exacts sont dans le texte.`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyE023Reduced = S.reduced ? '1' : '0';
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
  if (S.reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const dt = S.lastTs ? Math.min(80, ts - S.lastTs) : 0;
  S.lastTs = ts;
  if (S.playing && !S.reduced) S.phase = (S.phase + dt * 0.00016) % 1;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

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
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE023Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e023-badge', `Détroits et canaux (graine ${SEED.toString(16)}) : largeur utile et profondeur imposent un gabarit.`);
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E023', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) {
    S.playing = false;
    stopLoop();
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.type = radio.value;
        syncControls();
      });
    });
    n.select.addEventListener('change', () => {
      S.passageId = n.select.value;
      syncControls();
    });
    n.beam.addEventListener('input', () => {
      S.beam = Math.max(10, Math.min(60, Math.round(Number(n.beam.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      const dispo = passesDisponibles();
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = dispo.findIndex((p) => p.id === S.passageId);
        S.passageId = dispo[(i + step + dispo.length) % dispo.length].id;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 2 : -2;
        S.beam = Math.max(10, Math.min(60, S.beam + step));
      } else if (event.key === 'Home' || event.key === 'End') {
        S.beam = event.key === 'Home' ? 10 : 60;
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
