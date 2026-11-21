import { register } from './registry.js';

/* Lentille E096 (V2) — vue GEOGRAPHIE.
 * Thème : découpage administratif et codes ISO — de FR à 75056.
 *
 * Les dix chantiers E096-01 … E096-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E096.md et réellement implémentés ici :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau,
 * aucune graine aléatoire, aucune journalisation, aucun fichier partagé modifié.
 * Le contenu pédagogique est du texte sémantique réel (h2, h3, p, ul, tableaux,
 * fieldset radiogroupe, vérificateur, défi) présent dans le DOM même sans
 * animation : le panneau reste lisible et indexable sans JavaScript. Le canvas
 * n'est qu'un laboratoire qui illustre l'emboîtement des six niveaux.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e096- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e096';

/* Identifiants, tous préfixés geography-v2-e096-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const FAITS_ID = P + '-faits';
const NOTE_ID = P + '-note';
const LEVELS_TABLE_ID = P + '-levels-table';
const COUNTRIES_TABLE_ID = P + '-countries-table';
const FORMAT_GROUP_ID = P + '-formats';
const FORMAT_PREFIX = P + '-format-';
const MEASURES_ID = P + '-mesures';
const CODE_LABEL_ID = P + '-code-label';
const CODE_INPUT_ID = P + '-code-input';
const CHECK_BTN_ID = P + '-check-btn';
const CHECK_RESULT_ID = P + '-check-result';
const CANVAS_ID = P + '-canvas';
const CANVAS_LABEL_ID = P + '-canvas-label';
const LEGEND_ID = P + '-legend';
const CLAVIER_ID = P + '-clavier';
const READOUT_ID = P + '-readout';
const PLAY_ID = P + '-play';
const DEFI_ID = P + '-defi';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const DEBRIEF_ID = P + '-debrief';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const NARROW = '\u202f'; // espace fine (milliers)
const VITESSE = 1 / 6000; // progression par milliseconde : 6 s pour 6 niveaux

/* Écran virtuel du laboratoire (dimensions choisies pour l'exercice). */
const VIRTUAL_W = 360;
const VIRTUAL_H = 260;

/* Référentiel ISO 3166-1 local, recopié tel quel : aucune valeur inventée,
 * aucun téléchargement. Dix pays suffisent à illustrer les trois écritures. */
const COUNTRIES = [
  { a2: 'FR', a3: 'FRA', num: '250', nom: 'France' },
  { a2: 'DE', a3: 'DEU', num: '276', nom: 'Allemagne' },
  { a2: 'IT', a3: 'ITA', num: '380', nom: 'Italie' },
  { a2: 'ES', a3: 'ESP', num: '724', nom: 'Espagne' },
  { a2: 'BE', a3: 'BEL', num: '056', nom: 'Belgique' },
  { a2: 'CH', a3: 'CHE', num: '756', nom: 'Suisse' },
  { a2: 'GB', a3: 'GBR', num: '826', nom: 'Royaume-Uni' },
  { a2: 'US', a3: 'USA', num: '840', nom: 'États-Unis' },
  { a2: 'CA', a3: 'CAN', num: '124', nom: 'Canada' },
  { a2: 'JP', a3: 'JPN', num: '392', nom: 'Japon' },
];

/* Les six niveaux du découpage administratif français, du pays à la commune.
 * Le canton est signalé comme format illustratif pour ne pas prétendre à un
 * code réel précis. Les motifs de trait codent le niveau sans la couleur. */
const LEVELS = [
  { niveau: 'État / pays', format: 'ISO 3166-1 alpha-2 (2 lettres)', code: 'FR', exemple: 'France', motif: [] },
  { niveau: 'Région', format: 'COG (2 caractères)', code: '11', exemple: 'Île-de-France', motif: [9, 4] },
  { niveau: 'Département', format: 'COG (2 caractères)', code: '75', exemple: 'Paris', motif: [6, 3] },
  { niveau: 'Arrondissement', format: 'COG (3 caractères)', code: '751', exemple: 'Paris', motif: [3, 3] },
  { niveau: 'Canton', format: 'COG (4 caractères)', code: '7501', exemple: 'format illustratif', motif: [1, 3] },
  { niveau: 'Commune', format: 'COG (5 caractères)', code: '75056', exemple: 'Paris', motif: [2, 1, 6, 1] },
];

/* Quatre formats de code explorables en radiogroupe (choix unique). */
const FORMATS = [
  { key: 'a2', label: 'Alpha-2', example: 'FR', desc: 'Deux lettres majuscules (ISO 3166-1).' },
  { key: 'a3', label: 'Alpha-3', example: 'FRA', desc: 'Trois lettres majuscules (ISO 3166-1).' },
  { key: 'num', label: 'Numérique', example: '250', desc: 'Trois chiffres (ISO 3166-1).' },
  { key: 'cog', label: 'COG communal', example: '75056', desc: 'Cinq chiffres du Code officiel géographique.' },
];
const FORMAT_ORDER = FORMATS.map((f) => f.key);

/* État de module : survit au vidage du `stage` par la coque. */
const S = {
  format: 'a2',
  decoded: 'Aucun code vérifié pour l’instant.',
  lastMessage: 'Panneau prêt : explorez les niveaux administratifs et les codes ISO.',
  progress: 0,
  playing: false,
  rafId: 0,
  lastTs: 0,
  elapsed: 0,
  base: 0,
  onScreen: true,
  visibilityBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  debriefOuvert: false,
  readoutText: '',
  nodes: {},
};

/* ---------- Formats, mesures et utilitaires déterministes ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function num(value, digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? '\u2212' : ''}${grouped}${parts[1] ? ',' + parts[1] : ''}`;
}

function formatByKey(key) {
  return FORMATS.find((f) => f.key === key) || FORMATS[0];
}

function findByA2(code) {
  return COUNTRIES.find((c) => c.a2 === code) || null;
}

/* Valeurs de référence recalculées une seule fois depuis les données. */
const DEMO = {
  combos: 26 * 26,
  ratio: 5 / 2,
  levels: LEVELS.length,
  countries: COUNTRIES.length,
};

function currentLevelIndex() {
  return Math.min(LEVELS.length - 1, Math.floor(S.progress * LEVELS.length));
}

/* ---------- E096-04 / E096-05 : validation et décodage d'un code ---------- */

function validateCode(raw) {
  const value = String(raw == null ? '' : raw).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) {
    S.decoded = 'Format invalide : saisissez exactement deux lettres majuscules (ex. FR).';
    S.lastMessage = 'Code saisi invalide.';
  } else {
    const country = findByA2(value);
    if (!country) {
      S.decoded = `Code ${value} correctement formaté, mais absent du référentiel local (${DEMO.countries} pays recensés).`;
      S.lastMessage = 'Code hors référentiel.';
    } else {
      S.decoded = `${value} → ${country.nom} ; alpha-3 ${country.a3} ; code numérique ${country.num}.`;
      S.lastMessage = `Code vérifié : ${value}.`;
    }
  }
  renderCheckResult();
  updateReadout();
}

function renderCheckResult() {
  const node = document.getElementById(CHECK_RESULT_ID);
  if (node) node.textContent = S.decoded;
  const input = document.getElementById(CODE_INPUT_ID);
  if (input) input.setAttribute('aria-invalid', /^Format invalide/.test(S.decoded) ? 'true' : 'false');
}

/* ---------- E096-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = FAITS_ID;
  const faits = [
    'La norme ISO 3166-1 identifie les États par trois écritures simultanées : alpha-2 (deux lettres, FR), alpha-3 (trois lettres, FRA) et numérique (trois chiffres, 250). Les trois codes désignent le même pays ; leur longueur change, pas l’identité du territoire.',
    'Le Code officiel géographique (COG) identifie les subdivisions françaises, de la région à la commune : 11 pour l’Île-de-France, 75 pour Paris, 75056 pour la commune de Paris. Le découpage suit six niveaux emboîtés, du pays à la commune. (Référence : ISO 3166-1 ; COG de l’INSEE.)',
    'Un code est une convention de nommage, pas le territoire lui-même. Le code de canton indiqué dans le tableau illustre un format (quatre caractères) sans désigner un canton précis : le confondre avec un canton réel serait une erreur d’interprétation.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  const note = document.createElement('p');
  note.id = NOTE_ID;
  note.textContent = 'Tout le texte de ce panneau est lisible sans interaction : les tableaux, les mesures et le défi sont du texte sémantique. Le schéma ci-dessous est un laboratoire ; chaque grandeur qu’il montre est aussi écrite en toutes lettres.';
  wrap.appendChild(note);
  return wrap;
}

/* ---------- E096-02 : tableau des six niveaux administratifs ---------- */

function staticLevelsTable() {
  const table = document.createElement('table');
  table.id = LEVELS_TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Les six niveaux du découpage administratif français, du pays à la commune.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Niveau', 'Format du code', 'Exemple', 'Libellé'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  LEVELS.forEach((level) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = level.niveau;
    tr.appendChild(th);
    [level.format, level.code, level.exemple].forEach((valeur) => {
      const td = document.createElement('td');
      td.textContent = valeur;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E096-03 : référentiel ISO 3166-1 local ---------- */

function staticCountriesTable() {
  const table = document.createElement('table');
  table.id = COUNTRIES_TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Référentiel ISO 3166-1 local : dix pays et leurs trois codes.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pays', 'Alpha-2', 'Alpha-3', 'Numérique'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  COUNTRIES.forEach((country) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = country.nom;
    tr.appendChild(th);
    [country.a2, country.a3, country.num].forEach((valeur) => {
      const td = document.createElement('td');
      td.textContent = valeur;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E096-07 : mesures chiffrées recalculées depuis les données ---------- */

function staticMeasures() {
  const list = document.createElement('ul');
  list.id = MEASURES_ID;
  const entrees = [
    'Un code alpha-2 utilise 2 lettres sur 26 : 26 × 26 = ' + num(DEMO.combos, 0) + ' combinaisons possibles.',
    'Un code COG communal utilise 5 chiffres, soit 5 / 2 = ' + num(DEMO.ratio) +
      ' fois la longueur d’un code alpha-2 (référence : alpha-2 = 2 caractères).',
    'Le découpage de la France compte ' + num(DEMO.levels, 0) + ' niveaux, de l’État à la commune.',
    'Le référentiel local recense ' + num(DEMO.countries, 0) +
      ' pays, chacun avec 3 écritures (alpha-2, alpha-3, numérique).',
  ];
  entrees.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    list.appendChild(li);
  });
  return list;
}

/* ---------- Feuille de style unique, injectée une seule fois via ctx.css ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);
  border-left:3px solid var(--gold,#e6b96f);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p,#${PANEL_ID} ul{margin:5px 0;max-width:70ch}
#${PANEL_ID} ul{padding-left:18px}
#${PANEL_ID} li{margin:3px 0}
#${PANEL_ID} .${P}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-note{color:var(--muted);font-style:italic}
#${LEVELS_TABLE_ID},#${COUNTRIES_TABLE_ID}{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums;
}
#${LEVELS_TABLE_ID} caption,#${COUNTRIES_TABLE_ID} caption{
  text-align:left;margin-bottom:4px;color:var(--muted);
}
#${LEVELS_TABLE_ID} th,#${LEVELS_TABLE_ID} td,
#${COUNTRIES_TABLE_ID} th,#${COUNTRIES_TABLE_ID} td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#${LEVELS_TABLE_ID} th,#${COUNTRIES_TABLE_ID} th{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#${FORMAT_GROUP_ID}{
  margin:8px 0;padding:7px 9px 9px;border:1px solid var(--line);border-radius:8px;
}
#${FORMAT_GROUP_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;margin-right:6px;
  padding:3px 8px;border:1px solid transparent;border-radius:8px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix:hover{border-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-value{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#${PANEL_ID} .${P}-check{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 4px}
#${CODE_INPUT_ID}{
  min-height:44px;min-width:110px;padding:7px 9px;border:1px solid var(--line);
  border-radius:8px;background:transparent;color:var(--ink);
  font:inherit;font-size:12px;letter-spacing:.08em;
}
#${CODE_INPUT_ID}[aria-invalid="true"]{border-color:#d98b7a}
#${CHECK_RESULT_ID}{
  min-height:16px;color:var(--ink);font-size:10px;line-height:1.6;font-variant-numeric:tabular-nums;
}
#${CANVAS_ID}{
  display:block;width:100%;max-width:360px;height:auto;aspect-ratio:360 / 260;
  margin:8px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.28);touch-action:manipulation;
}
#${LEGEND_ID},#${CLAVIER_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID},#${DEBRIEF_ID}{
  min-height:34px;padding:7px 8px;margin:6px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink);font-size:10px;
  line-height:1.6;font-variant-numeric:tabular-nums;
}
#${DEBRIEF_ID}[hidden]{display:none}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;min-width:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{
  border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.14);
}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-map-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-map-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-map-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{max-width:240px}
  #${LEVELS_TABLE_ID},#${COUNTRIES_TABLE_ID}{font-size:9px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E096-06 : sync du radiogroupe (choix unique) ---------- */

function syncRadios() {
  const nodes = S.nodes.radios || [];
  nodes.forEach((radio, i) => {
    if (radio) radio.checked = FORMAT_ORDER[i] === S.format;
  });
}

function selectFormat(key) {
  if (!FORMAT_ORDER.includes(key)) return;
  S.format = key;
  const format = formatByKey(key);
  S.lastMessage = `Format ${format.label.toLowerCase()} sélectionné : ${format.example}.`;
  syncRadios();
  updateReadout();
}

/* ---------- E096-08 : laboratoire canvas unique et déterministe ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const largeur = Math.max(180, Math.min(360, cv.clientWidth || 360));
  const hauteur = Math.round(largeur * (VIRTUAL_H / VIRTUAL_W));
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(largeur * dpr);
  const pxH = Math.round(hauteur * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, largeur, hauteur);

  const pad = Math.max(16, Math.round(largeur * 0.08));
  const trackH = Math.max(26, Math.round(hauteur * 0.14));
  const iw = Math.max(10, largeur - pad * 2);
  const ih = Math.max(10, hauteur - pad * 2 - trackH);
  const reveal = S.progress * LEVELS.length;
  const gap = Math.min(iw, ih) * 0.062;

  /* Six rectangles emboîtés : un par niveau. Le motif de trait code le niveau,
     l'intensité code l'état (franchi ou non) : aucune information par couleur seule. */
  LEVELS.forEach((level, i) => {
    const x = pad + i * gap;
    const y = pad + i * gap;
    const w = iw - 2 * i * gap;
    const h = ih - 2 * i * gap;
    if (!(w > 4) || !(h > 4)) return;
    const atteint = i < reveal;
    g.setLineDash(level.motif || []);
    g.lineWidth = atteint ? 2 : 1;
    g.strokeStyle = atteint ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.32)';
    g.strokeRect(x, y, w, h);
    g.setLineDash([]);
    g.fillStyle = atteint ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.45)';
    const fs = Math.max(7, Math.round(largeur * 0.028));
    g.font = fs + 'px sans-serif';
    g.textAlign = 'left';
    g.fillText((i + 1) + ' ' + LEVELS[i].niveau, x + 3, y + fs + 2);
  });

  /* Niveau courant, écrit en toutes lettres dans le canvas. */
  const idx = currentLevelIndex();
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.font = Math.max(9, Math.round(largeur * 0.034)) + 'px sans-serif';
  g.textAlign = 'left';
  g.fillText('Descente ' + Math.round(S.progress * 100) + ' % · ' + LEVELS[idx].niveau, 4, hauteur - 6);

  /* Barre de progression avec repères aux sixièmes. */
  const barY = hauteur - trackH + 4;
  const barW = largeur - 8;
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.strokeRect(4, barY, barW, 7);
  for (let k = 1; k < LEVELS.length; k += 1) {
    const tx = 4 + (k / LEVELS.length) * barW;
    g.beginPath(); g.moveTo(tx, barY); g.lineTo(tx, barY + 7); g.stroke();
  }
  g.fillStyle = 'rgba(230,185,111,.85)';
  g.fillRect(4, barY, barW * S.progress, 7);
}

/* ---------- E096-07 / E096-09 : région de statut unique ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const format = formatByKey(S.format);
  const pct = Math.round(S.progress * 100);
  const niveau = LEVELS[currentLevelIndex()].niveau;
  const texte = 'Format ' + format.label.toLowerCase() + ' : ' + format.example +
    ' (' + format.example.length + ' caractères). Descente : ' + pct + ' % — niveau atteint : ' +
    niveau + '. ' + S.decoded + ' ' + S.lastMessage;
  if (texte === S.readoutText) return; // évite de saturer la région live.
  S.readoutText = texte;
  n.textContent = texte;
}

/* ---------- Construction du panneau (texte sémantique) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radios: FORMAT_ORDER.map((k) => document.getElementById(FORMAT_PREFIX + k)),
      codeInput: document.getElementById(CODE_INPUT_ID),
      checkBtn: document.getElementById(CHECK_BTN_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Découpage administratif et codes ISO : de FR à 75056');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une carte affiche des lieux, mais ce sont des codes qui les identifient. Ce panneau explique les trois écritures de l’ISO 3166-1, les six niveaux du Code officiel géographique, et rend visible l’emboîtement du pays vers la commune dans un laboratoire déterministe.');
  lead.id = LEAD_ID;

  /* E096-01, E096-02, E096-03 : faits, niveaux et référentiel en texte. */
  const faits = staticFacts();
  const levelsTitle = ctx.el('h3', '', 'Les six niveaux administratifs français');
  const levelsTable = staticLevelsTable();
  const countriesTitle = ctx.el('h3', '', 'Référentiel ISO 3166-1 (données locales)');
  const countriesTable = staticCountriesTable();

  /* E096-06 : quatre formats, choix unique -> fieldset role=radiogroup. */
  const group = document.createElement('fieldset');
  group.id = FORMAT_GROUP_ID;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Format de code à explorer, choix unique');
  const legend = document.createElement('legend');
  legend.textContent = 'Format de code à explorer (choix unique)';
  group.appendChild(legend);
  const radios = FORMAT_ORDER.map((key) => {
    const format = formatByKey(key);
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-format';
    radio.id = FORMAT_PREFIX + key;
    radio.value = key;
    radio.checked = S.format === key;
    radio.title = format.desc;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(format.label));
    group.appendChild(lab);
    return radio;
  });

  /* E096-07 : mesures chiffrées recalculées. */
  const measuresTitle = ctx.el('h3', '', 'Mesures chiffrées');
  const measures = staticMeasures();

  /* E096-04 / E096-05 : vérificateur de code. */
  const checkTitle = ctx.el('h3', '', 'Vérifier un code alpha-2');
  const codeLabel = ctx.el('label', '', 'Saisissez un code à deux lettres (ex. FR) : ');
  codeLabel.id = CODE_LABEL_ID;
  codeLabel.htmlFor = CODE_INPUT_ID;
  const check = ctx.el('div', P + '-check');
  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.id = CODE_INPUT_ID;
  codeInput.maxLength = 2;
  codeInput.autocomplete = 'off';
  codeInput.value = 'FR';
  codeInput.setAttribute('aria-labelledby', CODE_LABEL_ID);
  codeInput.setAttribute('aria-invalid', 'false');
  const checkBtn = ctx.el('button', '', 'Vérifier le code');
  checkBtn.type = 'button';
  checkBtn.id = CHECK_BTN_ID;
  check.append(codeInput, checkBtn);
  const checkResult = ctx.el('p', '', S.decoded);
  checkResult.id = CHECK_RESULT_ID;

  /* E096-08 : laboratoire canvas, focalisable et étiqueté. */
  const labTitle = ctx.el('h3', '', 'Laboratoire : la descente des six niveaux');
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Six rectangles emboîtés représentant l’État, la région, le département, l’arrondissement, le canton et la commune. Flèche droite ou haut : franchir un niveau ; flèche gauche ou bas : revenir d’un niveau ; Début : remettre à zéro ; Fin : afficher les six niveaux.');
  canvas.setAttribute('aria-describedby', CLAVIER_ID);
  const canvasLabel = ctx.el('p', '', 'Chaque rectangle porte un motif de trait distinct et le nom du niveau : le trait, pas la couleur, distingue les niveaux. La barre inférieure est graduée en six parts.');
  canvasLabel.id = CANVAS_LABEL_ID;

  /* E096-09 : légende non chromatique, readout, clavier. */
  const legendText = ctx.el('p', '', 'Repères sans couleur : trait plein, tirets longs, tirets moyens, tirets courts, pointillés puis motif point-tiret désignent respectivement les niveaux 1 à 6. Un rectangle clair est déjà franchi, un rectangle pâle ne l’est pas ; le nom du niveau et le pourcentage sont toujours écrits.');
  legendText.id = LEGEND_ID;
  const readout = ctx.el('p', '', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  const clavier = ctx.el('p', '', 'Clavier : Tab atteint les quatre formats, le champ de code, le bouton de vérification, le bouton de descente, le schéma puis le débrief. Sur le schéma, ← → et ↑ ↓ franchissent un niveau, Début remet à zéro et Fin affiche les six niveaux. La descente est une bascule indépendante : son état est toujours écrit.');
  clavier.id = CLAVIER_ID;

  /* E096-10 : bascule de descente + défi en cinq temps. */
  const play = ctx.el('button', '', '▶ Lancer la descente des niveaux');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  const defi = ctx.el('p', '', 'À vous de jouer — 1) Prédire : combien de combinaisons alpha-2 existe-t-il, et combien de niveaux compte le découpage ? 2) Réglage : choisissez le format COG communal et lancez la descente jusqu’à la commune. 3) Résultat attendu : 676 combinaisons, 6 niveaux, un code COG communal 2,5 fois plus long qu’un alpha-2. 4) Falsification : si un pays du référentiel avait un code alpha-2 de trois lettres, l’affirmation « alpha-2 = 2 lettres » serait réfutée — vérifiez les dix lignes du tableau. 5) Débrief : confrontez votre raisonnement ci-dessous.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : les mesures découlent des données (26 × 26 = 676 ; 5 / 2 = 2,5 ; 6 niveaux ; 10 pays). Elles ne dépendent d’aucune animation. Les codes sont des conventions : ils identifient des territoires sans les remplacer. Le canton du tableau illustre un format, non un canton précis. Si un alpha-2 de trois lettres apparaissait dans le référentiel, la règle serait bien réfutée : c’est ce qui rend l’hypothèse testable.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, faits, levelsTitle, levelsTable, countriesTitle, countriesTable,
    group, measuresTitle, measures,
    checkTitle, codeLabel, check, checkResult, labTitle, canvas, canvasLabel, legendText,
    readout, clavier, play, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios, codeInput, checkBtn, canvas, readout,
    play, debriefBtn, debrief,
  };
}

/* ---------- Synchronisation de tous les contrôles et du dessin ---------- */

function reducedNow() { return !!reducedProvider(); }

function syncControls() {
  const n = S.nodes;
  syncRadios();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la descente' : '▶ Lancer la descente des niveaux';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reducedNow() ? '1' : '0');
  updateReadout();
  drawLab();
}

/* ---------- E096-10 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (!S.onScreen || reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reducedNow()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.elapsed += dt * VITESSE;
    S.progress = clamp(S.base + S.elapsed, 0, 1);
  }
  S.lastTs = ts;
  syncControls();
  if (S.progress >= 1) {
    S.playing = false;
    stopLoop();
    S.lastMessage = 'Descente terminée : six niveaux franchis, de l’État à la commune.';
    syncControls();
    return;
  }
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

/* Source unique de la préférence de mouvement (ctx.reducedMotion + repli). */
let reducedProvider = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};

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
        if (mq.matches) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* IntersectionObserver : on suspend la boucle hors écran. */
function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.playing) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* Badge non bloquant sur la carte réelle. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(MAP_BADGE_ID)) return;
  const badge = ctx.el('div', P + '-map-badge', 'Décodage pédagogique : les codes et les six niveaux sont écrits en texte dans le panneau.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E096', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && !/^geography/.test(String(ctx.viewId))) return;

  /* E096-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(P, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  if (reducedNow()) S.playing = false;
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (radio.checked) selectFormat(FORMAT_ORDER[i]);
      });
    });
    n.codeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        validateCode(n.codeInput.value);
      }
    });
    n.checkBtn.addEventListener('click', () => validateCode(n.codeInput.value));
    n.play.addEventListener('click', () => {
      if (reducedNow() || typeof requestAnimationFrame !== 'function') {
        S.playing = false;
        stopLoop();
        S.progress = 1;
        S.base = 1;
        S.elapsed = 0;
        S.lastMessage = 'Descente affichée instantanément (mouvement réduit).';
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) {
        stopLoop();
        S.lastMessage = 'Descente arrêtée.';
      } else {
        if (S.progress >= 1) S.progress = 0;
        S.base = S.progress;
        S.elapsed = 0;
        S.lastMessage = 'Descente des niveaux lancée.';
        startLoop();
      }
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      const pas = 1 / LEVELS.length;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        S.progress = clamp(S.progress + pas, 0, 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        S.progress = clamp(S.progress - pas, 0, 1);
      } else if (event.key === 'Home') {
        S.progress = 0;
      } else if (event.key === 'End') {
        S.progress = 1;
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        S.playing = false;
        stopLoop();
        S.base = S.progress;
        S.elapsed = 0;
        S.lastMessage = 'Niveau ajusté au clavier.';
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reducedNow()) startLoop();
});
