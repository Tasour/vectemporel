import { register } from './registry.js';

/*
 * Lentille E077 — SECONDE PASSE (V2) : export local de la carte (SVG/PNG), sans réseau.
 *
 * Les dix chantiers (E077-01 … E077-10) sont RÉELLEMENT implémentés ci-dessous.
 * V2 ajoute à la passe 1 : une fiche de vérité à trois faits sourcés, deux
 * tableaux (comparaison statique + mesures recalculées), des contrôles
 * accessibles (radiogroupe, curseur, boutons 44 px, clavier canvas, focus),
 * un badge de statut sur la carte, une vraie sérialisation SVG autonome, une
 * rastérisation PNG par Blob local, un laboratoire canvas déterministe à codes
 * visuels non chromatiques, un bandeau role="status" aria-live="polite", un
 * défi falsifiable en cinq temps et une boucle rAF unique suspendue sur trois
 * garde-fous (document.hidden, hors champ, mouvement réduit).
 *
 * Tout le contenu pédagogique est du texte sémantique indexable (h2/h3/p/ol/
 * li/table/caption/th/td/fieldset/label) présent dans le DOM : le panneau reste
 * lisible et l’export reste compréhensible sans aucune animation ni interaction.
 * Le canvas n’est qu’une surcouche redondante, jamais la source exclusive d’une
 * information.
 *
 * Un seul register, une seule feuille CSS injectée sous `geography-v2-e077`,
 * tous les identifiants préfixés `geography-v2-e077-` (aucune collision avec la
 * passe 1 `geography-e077-`). Zéro console.*, zéro réseau, zéro Math.random,
 * une seule boucle rAF. Français intégral.
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 *
 * Note réseau : le seul « http » du fichier est l’identifiant de namespace XML
 * « http://www.w3.org/2000/svg » ; c’est un nom, jamais une requête résolue.
 */

const CSS_ID = 'geography-v2-e077';

const ID = {
  panel: 'geography-v2-e077-panel',
  title: 'geography-v2-e077-title',
  lead: 'geography-v2-e077-lead',
  facts: 'geography-v2-e077-facts',
  comparison: 'geography-v2-e077-comparison',
  measures: 'geography-v2-e077-measures',
  format: 'geography-v2-e077-format',
  formatLegend: 'geography-v2-e077-format-legend',
  scaleLabel: 'geography-v2-e077-scale-label',
  scaleValue: 'geography-v2-e077-scale-value',
  scale: 'geography-v2-e077-scale',
  canvas: 'geography-v2-e077-canvas',
  canvasDesc: 'geography-v2-e077-canvas-desc',
  legend: 'geography-v2-e077-legend',
  defi: 'geography-v2-e077-defi',
  readout: 'geography-v2-e077-readout',
  download: 'geography-v2-e077-download',
  play: 'geography-v2-e077-play',
  reset: 'geography-v2-e077-reset',
  note: 'geography-v2-e077-note',
  badge: 'geography-v2-e077-badge',
};

/* Attribut posé sur le panneau : distinct de la passe 1 pour éviter tout doublon. */
const REDUCED_ATTR = 'data-geography-v2-e077-reduced';
const FORMAT_ATTR = 'data-geography-v2-e077-format';

/* Géométrie schématique déterministe, explicitement présentée comme telle :
 * il ne s’agit pas de coordonnées géographiques réelles (fiche de vérité). */
const MAP_W = 900;
const MAP_H = 620;
const CONTOUR = [
  [118, 176], [226, 96], [368, 118], [508, 72], [660, 112],
  [752, 226], [730, 358], [638, 470], [470, 528], [300, 498], [176, 396],
];
const CHEMIN = [[250, 300], [380, 252], [520, 330], [650, 272]];
const NOEUDS = [
  { x: 250, y: 300, l: 'Nœud A' },
  { x: 380, y: 252, l: 'Nœud B' },
  { x: 520, y: 330, l: 'Nœud C' },
  { x: 650, y: 272, l: 'Nœud D' },
];
const SWEEP_MS = 2400; // durée d’un balayage complet de la tête d’export
const NARROW = '\u202f';
const MINUS = '\u2212';

/* État de module : survit au remplacement du DOM par la coque. */
const S = {
  format: 'svg',       // choix unique → radiogroupe, jamais aria-pressed
  echelle: 1,          // facteur d’export entier 1..4
  playing: false,      // bascule indépendante → aria-pressed licite
  sweep: 0,            // position déterministe de la tête, dans [0,1)
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  wired: false,
  lastAction: '',
  svgSource: '',       // cache du SVG autonome, indépendant de l’échelle
  nodes: null,
  measureCells: {},
};

/* ---------- Formatage français, sans dépendance ---------- */

function num(value, digits) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

const ko = (bytes) => num(bytes / 1024, 1);

function dprCap() {
  const raw = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  return Math.min(2, Math.max(1, raw));
}

/* E077-05 — comptage réel des octets UTF-8 du SVG sérialisé. */
function utf8Bytes(str) {
  let n = 0;
  for (let i = 0; i < str.length; i += 1) {
    const c = str.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i += 1; }
    else n += 3;
  }
  return n;
}

/* E077-05 — SVG autonome : déclaration XML, namespace, viewBox, title/desc et
 * bloc <style> inliné. Aucun href, src, @import ni url(http…). */
function buildStandaloneSvg() {
  if (S.svgSource) return S.svgSource;
  const pts = CONTOUR.map((p) => `${p[0]},${p[1]}`).join(' ');
  const line = CHEMIN.map((p) => `${p[0]},${p[1]}`).join(' ');
  let noeuds = '';
  NOEUDS.forEach((n, i) => {
    noeuds += `<circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 7 : 4}" fill="#e6b96f" stroke="#141414" stroke-width="1"/>`
      + `<text x="${n.x + 9}" y="${n.y + 3}" fill="#f4ead6" font-family="sans-serif" font-size="12">${n.l}</text>`;
  });
  const style = '.cadre{fill:#0b1017;stroke:#6b7280;stroke-width:2}'
    + '.contour{fill:none;stroke:#e6b96f;stroke-width:2;stroke-dasharray:7 5}'
    + '.chemin{fill:none;stroke:#f4d69e;stroke-width:2}';
  S.svgSource = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" role="img" aria-labelledby="geography-v2-e077-export-title geography-v2-e077-export-desc">',
    '<title id="geography-v2-e077-export-title">Carte schématique — export local</title>',
    '<desc id="geography-v2-e077-export-desc">Aperçu schématique autonome : contour, chemin et quatre nœuds. Aucune donnée géographique réelle, aucune ressource distante.</desc>',
    `<style>${style}</style>`,
    '<rect class="cadre" x="2" y="2" width="896" height="616" rx="8"/>',
    `<polygon class="contour" points="${pts}"/>`,
    `<polyline class="chemin" points="${line}"/>`,
    `<g>${noeuds}</g>`,
    '</svg>',
  ].join('\n');
  return S.svgSource;
}

/* E077-02 / E077-06 — grandeurs recalculées depuis leur formule. */
function measureAt(s, dprOverride) {
  const dpr = (typeof dprOverride === 'number' && Number.isFinite(dprOverride))
    ? Math.min(2, Math.max(1, dprOverride)) : dprCap();
  const Wpx = Math.round(MAP_W * s * dpr);
  const Hpx = Math.round(MAP_H * s * dpr);
  const pixels = Wpx * Hpx;
  const rawBytes = pixels * 4;                 // RGBA non compressé
  const estPng = Math.round(rawBytes / 12);    // ordre de grandeur : compression 12:1
  const linear = s * dpr;
  return {
    s, dpr, Wpx, Hpx, pixels, rawBytes, estPng,
    linear, pixelFactor: linear * linear,
    svgBytes: utf8Bytes(buildStandaloneSvg()),
  };
}

const measures = () => measureAt(S.echelle);

/* ---------- E077-01 : feuille de style isolée, une seule injection ---------- */

const CSS = `
.geography-v2-e077-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold);
  border-radius:10px;background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e077-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e077-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e077-panel p{margin:5px 0;max-width:74ch;overflow-wrap:anywhere}
.geography-v2-e077-panel .geography-v2-e077-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e077-panel .geography-v2-e077-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e077-panel .geography-v2-e077-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e077-panel .geography-v2-e077-table th,
.geography-v2-e077-panel .geography-v2-e077-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e077-panel .geography-v2-e077-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e077-panel .geography-v2-e077-table td{color:var(--ink-soft,#d7d1c6)}
.geography-v2-e077-panel .geography-v2-e077-table td.geography-v2-e077-num{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e077-format{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e077-format legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e077-panel .geography-v2-e077-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e077-panel .geography-v2-e077-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e077-slider-row{margin:7px 0}
.geography-v2-e077-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e077-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e077-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e077-canvas{
  display:block;width:100%;max-width:340px;height:auto;aspect-ratio:900 / 620;
  margin:8px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.30);touch-action:manipulation;cursor:default;
}
.geography-v2-e077-panel .geography-v2-e077-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e077-panel .geography-v2-e077-defi{margin:6px 0;padding-left:18px;font-size:10px}
.geography-v2-e077-panel .geography-v2-e077-defi li{margin:3px 0}
.geography-v2-e077-panel .geography-v2-e077-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e077-readout{
  min-height:36px;padding:7px 8px;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e077-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e077-panel .geography-v2-e077-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e077-panel .geography-v2-e077-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e077-panel [aria-pressed="true"].geography-v2-e077-btn{
  border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.14);
}
.geography-v2-e077-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e077-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e077-panel[${REDUCED_ATTR}="1"] .geography-v2-e077-btn{transition:none}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e077-panel .geography-v2-e077-btn,
  .geography-v2-e077-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .geography-v2-e077-panel{font-size:10px;padding:9px}
  #geography-v2-e077-canvas{max-width:240px}
  .geography-v2-e077-panel .geography-v2-e077-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e077-panel{border:1px solid CanvasText}
}
`;

/* ---------- E077-01 : fiche de vérité à trois faits sourcés (texte réel) ---------- */

function buildFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'La vue GEOGRAPHIE construit sa carte par une transformation affine lat/lon dans un viewBox '
      + 'de 900 × 620 (MAP_W, MAP_H). Exporter revient à sérialiser cette géométrie : le SVG décrit '
      + 'des formes vectorielles nettes à tout zoom, le PNG décrit une matrice de pixels à taille fixe.',
    'Un SVG autonome inliningue son style et ne référence aucune image, police ou feuille distante : '
      + 'il s’ouvre hors ligne. La chaîne « http://www.w3.org/2000/svg » y est un identifiant de '
      + 'namespace XML, jamais une requête réseau résolue.',
    'Le PNG est rastérisé sur un canvas puis encodé localement en Blob ; ses dimensions suivent '
      + 'W = 900 · échelle · DPR et H = 620 · échelle · DPR (DPR plafonné à 2), sa surface '
      + '(échelle · DPR)². Le téléchargement passe par une URL d’objet révoquée : aucun octet ne quitte l’appareil.',
  ];
  faits.forEach((texte) => wrap.appendChild(ctx.el('p', 'geography-v2-e077-fait', texte)));
  return wrap;
}

/* ---------- E077-02 : tableau comparatif statique (référence commune) ---------- */

function buildComparison(ctx) {
  const table = ctx.el('table', 'geography-v2-e077-table');
  table.id = ID.comparison;
  table.appendChild(ctx.el('caption', '',
    'Comparaison à référence égale : viewBox natif 900 × 620. Valeurs de référence à échelle ×2 et DPR 2.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Propriété', 'SVG (vecteur)', 'PNG (matrice)', 'Remarque'].forEach((label) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const ref = measureAt(2, 2);
  const svg0 = utf8Bytes(buildStandaloneSvg());
  const tbody = document.createElement('tbody');
  [
    ['Cadre natif', 'viewBox 900 × 620', '900 × 620 px', 'référence commune'],
    ['Échelle ×2, DPR 2', 'viewBox inchangé',
      `${num(ref.Wpx, 0)} × ${num(ref.Hpx, 0)} px`, '×4 linéaire, ×16 surface'],
    ['Taille estimée', `${num(svg0, 0)} octets`, `≈ ${ko(ref.estPng)} Ko`, 'PNG = brut RGBA / 12'],
    ['Zoom après export', 'net à tout zoom', 'pixellise au-delà de 100 %', 'matrice figée'],
  ].forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((text, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.setAttribute('scope', 'row');
      cell.textContent = text;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E077-02 : tableau de mesures recalculées (colonne courante) ---------- */

const MEASURE_ROWS = [
  ['dimensions', 'Dimensions PNG', 'référence native 900 × 620 px'],
  ['pixels', 'Pixels', 'surface native 558 000 px'],
  ['brut', 'Brut RGBA', '4 octets par pixel'],
  ['estime', 'PNG estimé', 'hypothèse de compression 12 pour 1'],
  ['lineaire', 'Facteur linéaire', 'échelle × DPR'],
  ['surface', 'Facteur de surface', '(échelle × DPR)²'],
  ['svg', 'Octets SVG sérialisés', 'viewBox constant, indépendant de l’échelle'],
];

function buildMeasuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e077-table');
  table.id = ID.measures;
  table.appendChild(ctx.el('caption', '',
    'Mesures du réglage courant, recalculées depuis les formules — jamais saisies à la main.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Résultat courant', 'Référence'].forEach((label) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  S.measureCells = {};
  MEASURE_ROWS.forEach(([key, label, ref]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const value = document.createElement('td');
    value.className = 'geography-v2-e077-num';
    const reference = document.createElement('td');
    reference.textContent = ref;
    tr.append(th, value, reference);
    tbody.appendChild(tr);
    S.measureCells[key] = value;
  });
  table.appendChild(tbody);
  return table;
}

function fillMeasuresTable() {
  const m = measures();
  const c = S.measureCells;
  if (c.dimensions) c.dimensions.textContent = `${num(m.Wpx, 0)} × ${num(m.Hpx, 0)} px`;
  if (c.pixels) c.pixels.textContent = `${num(m.pixels, 0)} px`;
  if (c.brut) c.brut.textContent = `${ko(m.rawBytes)} Ko`;
  if (c.estime) c.estime.textContent = `${ko(m.estPng)} Ko`;
  if (c.lineaire) c.lineaire.textContent = `×${num(m.linear, 2)}`;
  if (c.surface) c.surface.textContent = `×${num(m.pixelFactor, 2)}`;
  if (c.svg) c.svg.textContent = `${num(m.svgBytes, 0)} octets`;
}

/* ---------- E077-09 : défi falsifiable en cinq temps (texte réel) ---------- */

const DEFI = {
  prediction: 'À données égales, le SVG reste net et de taille constante quand on augmente l’échelle, '
    + 'alors que le PNG grossit en surface et finit par pixelliser.',
  reglage: 'Régler l’échelle de ×1 à ×4, puis changer de format dans le radiogroupe et lire le tableau de mesures.',
  attendu: 'Le viewBox (900 × 620) et les octets SVG restent identiques ; les pixels PNG suivent (échelle × DPR)².',
  falsification: 'Exporter le PNG à ×4 puis le zoomer : si aucun pixel n’apparaît, ou si les octets SVG changent '
    + 'avec l’échelle, l’hypothèse est réfutée.',
  debrief: 'Le « brut / 12 » n’est qu’un ordre de grandeur du compresseur PNG ; le SVG autonome n’embarque '
    + 'ni polices ni images de la vraie carte, et l’aperçu reste schématique.',
};

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e077-defi');
  list.id = ID.defi;
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    li.appendChild(ctx.el('strong', '', label + ' : '));
    li.appendChild(document.createTextNode(DEFI[key]));
    list.appendChild(li);
  });
  return list;
}

/* ---------- E077-03 / E077-09 : panneau sémantique et contrôles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: ['svg', 'png'].map((v) => document.getElementById(ID.format + '-' + v)),
      scale: document.getElementById(ID.scale),
      scaleOut: document.getElementById(ID.scaleValue),
      scaleLabel: document.getElementById(ID.scaleLabel),
      canvas: document.getElementById(ID.canvas),
      readout: document.getElementById(ID.readout),
      download: document.getElementById(ID.download),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e077-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  /* E077-01 : titre et lede (texte indexable, lisible sans interaction). */
  const title = ctx.el('h2', '', 'Exporter la carte localement — SVG et PNG, sans réseau (V2)');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Cette lentille montre comment emporter la carte hors du navigateur. Le format est choisi dans '
    + 'un radiogroupe, l’échelle réglée au curseur, et toutes les grandeurs sont écrites en toutes '
    + 'lettres dans le tableau de mesures et le bandeau de lecture : le dessin ne fait qu’illustrer '
    + 'le calcul.');
  lead.id = ID.lead;

  /* E077-03 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.format;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-labelledby', ID.formatLegend);
  const formatLegend = ctx.el('legend', '', 'Format d’export (choix unique)');
  formatLegend.id = ID.formatLegend;
  fieldset.appendChild(formatLegend);
  [['svg', 'SVG — vecteur'], ['png', 'PNG — matrice']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-v2-e077-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e077-format';
    radio.id = ID.format + '-' + value;
    radio.value = value;
    radio.checked = S.format === value;
    radio.title = value === 'svg'
      ? 'Vecteur : contour net, netteté à tout zoom, taille constante.'
      : 'Matrice : pixels figés, dimensions et surface fonction de l’échelle.';
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  /* E077-04 : curseur d’échelle — grandeur chiffrée déterministe. */
  const scaleRow = ctx.el('div', 'geography-v2-e077-slider-row');
  const scaleLabel = document.createElement('label');
  scaleLabel.id = ID.scaleLabel;
  scaleLabel.setAttribute('for', ID.scale);
  const scaleOut = ctx.el('span', 'geography-v2-e077-valeur', '');
  scaleOut.id = ID.scaleValue;
  scaleLabel.append(document.createTextNode('Échelle d’export : '), scaleOut);
  const scale = document.createElement('input');
  scale.type = 'range';
  scale.id = ID.scale;
  scale.min = '1';
  scale.max = '4';
  scale.step = '1';
  scale.value = String(S.echelle);
  scale.setAttribute('aria-label', 'Échelle d’export, de 1 à 4, valeur affichée dans le libellé');
  scaleRow.append(scaleLabel, scale);

  /* E077-07 / E077-08 : canvas déterministe et légende non chromatique. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Aperçu de l’export : contour, chemin et quatre nœuds. Un contour net et un trait plein signalent '
    + 'le vecteur ; une trame de points signale la matrice. Flèches gauche et droite : changer de '
    + 'format ; flèches haut et bas : changer l’échelle ; Origine restaure les réglages ; '
    + 'Entrée réénonce le bandeau.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite changent de format, les flèches '
    + 'haut et bas règlent l’échelle de 1 à 4, Origine restaure les valeurs par défaut et Entrée '
    + 'réénonce le résultat. Aucune information n’est portée par la seule couleur : le vecteur est '
    + 'un contour net, la matrice une trame de points, et le format est aussi écrit dans le bandeau.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e077-legend',
    'Contour tireté + trame absente : vecteur (SVG). Trame de points réguliers : matrice (PNG). '
    + 'La ligne pointillée mobile est la tête de balayage de l’export ; sa position est une fonction '
    + 'du temps écoulé, jamais d’un tirage aléatoire.');
  legend.id = ID.legend;

  /* E077-09 : unique région live. */
  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  readout.textContent = 'Réglage initial prêt : format SVG, échelle ×1.';

  /* E077-05 / E077-06 : téléchargement local et bascule d’animation. */
  const download = ctx.el('button', 'geography-v2-e077-btn', '');
  download.type = 'button';
  download.id = ID.download;

  const play = ctx.el('button', 'geography-v2-e077-btn', '▶ Lancer le balayage d’export');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', ID.readout);

  const reset = ctx.el('button', 'geography-v2-e077-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : même géométrie pour l’aperçu, le SVG sérialisé et '
    + 'le PNG rastérisé, aucun tirage aléatoire et aucune ressource externe. Les textes ci-dessus '
    + 'sont réels, lisibles et indexables même sans animation ; la carte d’origine reste utilisable '
    + 'sans ce panneau.');
  note.id = ID.note;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  const measuresTitle = ctx.el('h3', '', 'Mesures du réglage courant');

  panel.append(title, lead, buildFacts(ctx), buildComparison(ctx), fieldset, scaleRow,
    canvas, canvasDesc, legend, measuresTitle, buildMeasuresTable(ctx), defiTitle,
    buildDefi(ctx), readout, download, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: ['svg', 'png'].map((v) => document.getElementById(ID.format + '-' + v)),
    scale, scaleOut, scaleLabel, canvas, readout, download, play, reset,
    fresh: true,
  };
}

/* ---------- E077-04 : badge sur la carte existante, garde anti-doublon ---------- */

function badgeText() {
  const m = measures();
  const nom = S.format === 'svg' ? 'SVG autonome' : 'PNG rastérisé';
  return `Export local : ${nom}, échelle ×${m.s}, DPR ${num(m.dpr, 0)}. Aperçu schématique, zéro réseau.`;
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e077-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

function updateMapBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) badge.textContent = badgeText();
}

/* ---------- E077-07 : dessin déterministe partagé (aperçu et PNG) ---------- */

function drawScene(painter, X, Y, sc) {
  painter.lineJoin = 'round';
  painter.strokeStyle = '#6b7280';
  painter.lineWidth = 1.5;
  painter.setLineDash([]);
  painter.strokeRect(X(2), Y(2), MAP_W * sc - 4, MAP_H * sc - 4);

  painter.strokeStyle = '#e6b96f';
  painter.lineWidth = 1.6;
  painter.setLineDash([7, 5]);
  painter.beginPath();
  CONTOUR.forEach((p, i) => { if (i === 0) painter.moveTo(X(p[0]), Y(p[1])); else painter.lineTo(X(p[0]), Y(p[1])); });
  painter.closePath();
  painter.stroke();

  painter.strokeStyle = '#f4d69e';
  painter.setLineDash([]);
  painter.beginPath();
  CHEMIN.forEach((p, i) => { if (i === 0) painter.moveTo(X(p[0]), Y(p[1])); else painter.lineTo(X(p[0]), Y(p[1])); });
  painter.stroke();

  NOEUDS.forEach((n, i) => {
    painter.fillStyle = '#e6b96f';
    painter.beginPath();
    painter.arc(X(n.x), Y(n.y), i === 0 ? 5 : 3.2, 0, Math.PI * 2);
    painter.fill();
    painter.fillStyle = '#f4ead6';
    painter.font = '10px sans-serif';
    painter.fillText(n.l, X(n.x) + 8, Y(n.y) + 3);
  });
}

/* E077-08 — codes visuels non chromatiques : vecteur = contour net, matrice =
 * trame de points. Chaque code est doublé par une étiquette texte. */
function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = Math.max(180, Math.min(340, cv.clientWidth || 300));
  const cssH = Math.round(cssW * (MAP_H / MAP_W));
  const dpr = dprCap();
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);
  g.fillStyle = '#0b1017';
  g.fillRect(0, 0, cssW, cssH);

  const sc = Math.min((cssW - 14) / MAP_W, (cssH - 14) / MAP_H);
  const ox = (cssW - MAP_W * sc) / 2;
  const oy = (cssH - MAP_H * sc) / 2;
  const X = (x) => ox + x * sc;
  const Y = (y) => oy + y * sc;

  drawScene(g, X, Y, sc);

  if (S.format === 'png') {
    g.fillStyle = 'rgba(244,214,158,.55)';
    for (let gx = 24; gx < MAP_W - 10; gx += 36) {
      for (let gy = 24; gy < MAP_H - 10; gy += 36) {
        g.fillRect(X(gx), Y(gy), 1.5, 1.5);
      }
    }
    g.fillStyle = '#f4ead6';
    g.font = '9px sans-serif';
    g.fillText('Matrice · points', 8, cssH - 7);
  } else {
    g.fillStyle = '#f4ead6';
    g.font = '9px sans-serif';
    g.fillText('Vecteur · contour', 8, cssH - 7);
  }

  /* Tête de balayage : trait pointillé, position déterministe, jamais couleur seule. */
  const sx = ox + S.sweep * MAP_W * sc;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 1.4;
  g.setLineDash([3, 3]);
  g.beginPath();
  g.moveTo(sx, oy);
  g.lineTo(sx, oy + MAP_H * sc);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#ffffff';
  g.font = '9px sans-serif';
  g.fillText('tête d’export', Math.min(cssW - 70, sx + 4), oy + 10);
}

/* ---------- E077-06 : rastérisation PNG (même géométrie, Blob local) ---------- */

function downloadBlob(blob, filename) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  if (a.parentNode) a.parentNode.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function exportSvg() {
  if (typeof Blob === 'undefined') {
    announce('Export SVG indisponible (Blob absent).');
    return;
  }
  const text = buildStandaloneSvg();
  const ok = downloadBlob(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }),
    'carte-schematique-export.svg');
  announce(ok
    ? `SVG téléchargé : ${num(utf8Bytes(text), 0)} octets, styles inlinés, zéro ressource distante.`
    : 'Export SVG indisponible dans ce contexte.');
}

function exportPng() {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') {
    announce('Export PNG indisponible (contexte inadapté).');
    return;
  }
  const m = measures();
  const off = document.createElement('canvas');
  off.width = m.Wpx;
  off.height = m.Hpx;
  const painter = off.getContext('2d');
  if (!painter) {
    announce('Export PNG indisponible (canvas 2D absent).');
    return;
  }
  painter.fillStyle = '#0b1017';
  painter.fillRect(0, 0, m.Wpx, m.Hpx);
  const sc = Math.min(m.Wpx / MAP_W, m.Hpx / MAP_H);
  drawScene(painter, (x) => x * sc, (y) => y * sc, sc);

  const finish = (blob) => {
    const ok = blob && downloadBlob(blob, 'carte-schematique-export.png');
    announce(ok
      ? `PNG téléchargé : ${num(m.Wpx, 0)} × ${num(m.Hpx, 0)} px, ${num(m.pixels, 0)} pixels, ${ko(m.estPng)} Ko estimés.`
      : 'Export PNG indisponible dans ce contexte.');
  };
  if (typeof off.toBlob === 'function') {
    off.toBlob(finish, 'image/png');
  } else if (typeof off.toDataURL === 'function') {
    try {
      const data = off.toDataURL('image/png');
      const bytes = Math.round((data.length * 3) / 4);
      const ok = downloadBlob(new Blob([data], { type: 'image/png' }), 'carte-schematique-export.png');
      announce(ok
        ? `PNG téléchargé : ${num(m.Wpx, 0)} × ${num(m.Hpx, 0)} px, ${num(bytes, 0)} octets (repli data URL).`
        : 'Export PNG indisponible dans ce contexte.');
    } catch {
      announce('Export PNG indisponible (échec du repli).');
    }
  } else {
    announce('Export PNG indisponible (aucun encodeur).');
  }
}

/* ---------- E077-09 : bandeau de lecture (role=status, aria-live=polite) ---------- */

function announce(message) {
  S.lastAction = message || '';
  updateReadout();
}

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const m = measures();
  const nom = S.format === 'svg' ? 'SVG (vecteur)' : 'PNG (matrice)';
  n.textContent = '';
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.appendChild(document.createTextNode('Format '));
  put(nom);
  n.appendChild(document.createTextNode(' · échelle ×'));
  put(String(m.s));
  n.appendChild(document.createTextNode(' · DPR '));
  put(num(m.dpr, 0));
  n.appendChild(document.createTextNode('. PNG : '));
  put(`${num(m.Wpx, 0)} × ${num(m.Hpx, 0)} px`);
  n.appendChild(document.createTextNode(' (référence native 900 × 620 px ; facteur linéaire ×'));
  put(num(m.linear, 2));
  n.appendChild(document.createTextNode(', surface ×'));
  put(num(m.pixelFactor, 2));
  n.appendChild(document.createTextNode('). Taille PNG estimée ≈ '));
  put(`${ko(m.estPng)} Ko`);
  n.appendChild(document.createTextNode(' (brut non compressé '));
  put(`${ko(m.rawBytes)} Ko`);
  n.appendChild(document.createTextNode(', hypothèse 12 pour 1). SVG : viewBox 900 × 620 constant, '));
  put(`${num(m.svgBytes, 0)} octets sérialisés`);
  n.appendChild(document.createTextNode(', net à tout zoom.'));
  if (S.lastAction) n.appendChild(document.createTextNode(' Dernière action : ' + S.lastAction));
}

/* ---------- Application de l’état ---------- */

function applyState(message) {
  const n = S.nodes;
  if (!n) return;
  n.radios.forEach((r) => { if (r) r.checked = r.value === S.format; });
  if (n.scale) {
    n.scale.min = '1';
    n.scale.max = '4';
    n.scale.step = '1';
    n.scale.value = String(S.echelle);
  }
  if (n.scaleOut) n.scaleOut.textContent = `×${S.echelle}`;
  if (n.download) {
    n.download.textContent = S.format === 'svg'
      ? '⬇ Télécharger le SVG autonome'
      : '⬇ Télécharger le PNG raster';
    n.download.setAttribute('aria-label', S.format === 'svg'
      ? 'Télécharger la carte au format SVG vectoriel autonome, sans réseau'
      : 'Télécharger la carte au format PNG matriciel, sans réseau');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage d’export' : '▶ Lancer le balayage d’export';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, S.reduced ? '1' : '0');
  if (n.panel) n.panel.setAttribute(FORMAT_ATTR, S.format);
  if (message) S.lastAction = message;
  fillMeasuresTable();
  updateMapBadge();
  updateReadout();
  drawLab();
}

function selectFormat(value, message) {
  if (value !== 'svg' && value !== 'png') return;
  S.format = value;
  applyState(message || (value === 'svg'
    ? 'Format SVG sélectionné : vecteur, net à tout zoom.'
    : 'Format PNG sélectionné : matrice de pixels.'));
}

function setEchelle(value) {
  const next = Math.max(1, Math.min(4, Math.round(Number(value))));
  if (!Number.isFinite(next)) return;
  S.echelle = next;
  applyState(`Échelle réglée à ×${next}.`);
}

/* ---------- E077-10 : boucle rAF unique, pauses multiples, remise à zéro ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.playing) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt / SWEEP_MS) % 1;
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function resetState() {
  S.format = 'svg';
  S.echelle = 1;
  S.playing = false;
  S.sweep = 0;
  stopLoop();
  applyState('Valeurs par défaut restaurées : format SVG, échelle ×1, balayage arrêté.');
}

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l’écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité de l’onglet reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) stopLoop(); else startLoop();
        if (S.nodes) applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source vivante */ }
  }
}

/* ---------- Câblage des contrôles (une seule fois par panneau frais) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;
  S.wired = true;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      selectFormat(radio.value);
    });
  });

  n.scale.addEventListener('input', () => setEchelle(n.scale.value));

  n.download.addEventListener('click', () => {
    if (S.format === 'svg') exportSvg(); else exportPng();
  });

  n.play.addEventListener('click', () => {
    if (S.reduced || typeof requestAnimationFrame !== 'function') {
      S.playing = false;
      stopLoop();
      S.sweep = (S.sweep + 0.25) % 1;
      applyState('Mouvement réduit : balayage remplacé par un pas fixe.');
      return;
    }
    S.playing = !S.playing;
    if (!S.playing) stopLoop(); else startLoop();
    applyState();
  });

  n.reset.addEventListener('click', () => resetState());

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      selectFormat(S.format === 'svg' ? 'png' : 'svg');
    } else if (event.key === 'ArrowUp') {
      setEchelle(S.echelle + 1);
    } else if (event.key === 'ArrowDown') {
      setEchelle(S.echelle - 1);
    } else if (event.key === 'Home') {
      setEchelle(1);
    } else if (event.key === 'End') {
      setEchelle(4);
    } else if (event.key === 'Enter') {
      updateReadout();
    } else {
      used = false;
    }
    if (used) event.preventDefault();
  });
}

/* ---------- Point d’entrée unique ---------- */

register('E077', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  /* E077-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  try { S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { S.reduced = false; }
  if (S.reduced) { S.playing = false; stopLoop(); }

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
