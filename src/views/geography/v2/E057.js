import { register } from './registry.js';

/* Lentille E057 (V2) — vue GEOGRAPHIE.
 * Thème : compteurs et statistiques de la vue.
 *
 * Les dix chantiers E057-01 … E057-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E057.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. La lentille relit les
 * grandeurs déjà présentes dans le DOM produit par geography.js (bandeau de
 * statut, liste des lieux, marqueurs, étiquettes « hors du cadre », nœuds du
 * chemin et viewBox du SVG), les recalcule et les compare à des références
 * explicites. Elle n'invente aucune donnée géographique.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucune
 * console, aucun fichier partagé modifié. Le texte pédagogique est du texte
 * sémantique réel (titre, paragraphes, tableau captioné, légendes, statut)
 * présent dans le DOM ; le canvas n'est qu'un laboratoire qui illustre des
 * règles déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e057- (identifiants, classes, bloc CSS).
 */

const P = 'geography-v2-e057';

/* Identifiants, tous préfixés geography-v2-e057-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const CONTEXT_ID = P + '-context';
const TABLE_ID = P + '-table';
const CANVAS_ID = P + '-canvas';
const READOUT_ID = P + '-readout';
const LEGEND_ID = P + '-legend';
const HELP_ID = P + '-help';
const LIMIT_ID = P + '-limite';
const MESURE_ID = P + '-mesure';
const SEUIL_ID = P + '-seuil';
const SEUIL_OUT_ID = P + '-seuil-value';
const REFRESH_ID = P + '-refresh';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Largeur de référence du viewBox de geography.js (constante MAP_W). */
const MAP_W = 900;
/* Durée de l'animation déterministe de la jauge, en ms. */
const ANIM_MS = 720;
/* Références explicites (aucune valeur mémorisée). */
const REF_POURCENT = 100;   // une couverture est bornée à 100 % du périmètre
const REF_ECHELLE = 1;      // vue entière de référence, notée ×1,00

/* Mesures affichables sur la jauge (choix unique → radiogroupe). */
const MESURES = {
  couvertureSim: { label: 'Couverture simulée', unite: '% du périmètre', ref: REF_POURCENT },
  couvertureReelle: { label: 'Couverture réelle', unite: '% du périmètre', ref: REF_POURCENT },
  cadres: { label: 'Part dans le cadre', unite: '% des affichés', ref: REF_POURCENT },
};
const MESURE_ORDER = ['couvertureSim', 'couvertureReelle', 'cadres'];

/* Cellules du tableau, adressées par identifiant préfixé. */
const V = {
  perimeter: P + '-v-perimeter',
  visible: P + '-v-visible',
  framed: P + '-v-framed',
  off: P + '-v-off',
  markers: P + '-v-markers',
  path: P + '-v-path',
  scale: P + '-v-scale',
  coverage: P + '-v-coverage',
  sim: P + '-v-sim',
};
const R = {
  perimeter: P + '-r-perimeter',
  visible: P + '-r-visible',
  framed: P + '-r-framed',
  off: P + '-r-off',
  markers: P + '-r-markers',
  path: P + '-r-path',
  scale: P + '-r-scale',
  coverage: P + '-r-coverage',
  sim: P + '-r-sim',
};

/* Lignes du tableau : libellé, id valeur, id référence, texte initial. */
const ROWS = [
  ['Lieux du périmètre', V.perimeter, R.perimeter, 'référence : 100 %'],
  ['Lieux affichés (filtre)', V.visible, R.visible, 'part du périmètre'],
  ['Lieux dans le cadre', V.framed, R.framed, '= marqueurs de la carte'],
  ['Lieux hors du cadre', V.off, R.off, 'listés sans déplacement fictif'],
  ['Marqueurs sur la carte', V.markers, R.markers, 'contrôle de cohérence'],
  ['Nœuds du chemin chronologique', V.path, R.path, 'amplitude en années'],
  ['Échelle de vue', V.scale, R.scale, 'référence : ×1,00'],
  ['Couverture réelle', V.coverage, R.coverage, 'bornée à 100 %'],
  ['Couverture simulée', V.sim, R.sim, 'seuil du curseur / périmètre'],
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  mesure: 'couvertureSim',
  seuil: null,          // nombre simulé d'affichés ; initialisé au relevé réel
  stats: null,
  display: 0,           // valeur affichée par la jauge (animation)
  target: 0,            // valeur cible de la jauge
  elapsed: 0,
  lastTs: 0,
  rafId: 0,
  inView: true,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Accès au DOM réel (aucune donnée inventée) ---------- */

function parseStatus() {
  const status = document.getElementById('c3b-status');
  const text = status ? (status.textContent || '') : '';
  const match = text.match(/(\d+)\s*lieu\(x\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
  return match ? { visible: Number(match[1]), total: Number(match[2]) } : null;
}

function fallbackTotal() {
  const kicker = document.querySelector('.geo-panel .view-kicker');
  const text = kicker ? (kicker.textContent || '') : '';
  const match = text.match(/\/\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function frameMode() {
  const pressed = document.querySelectorAll('#c3b-tools button.c3b-filter[aria-pressed="true"]');
  if (!pressed.length) return 'non renseigné';
  const label = (pressed[0].textContent || '').trim();
  return label || 'non renseigné';
}

function queryText() {
  const input = document.getElementById('c3b-search');
  return input ? (input.value || '').trim() : '';
}

function viewScale() {
  const svg = document.querySelector('#c3b-map .geo-svg');
  if (!svg) return null;
  const parts = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || !Number.isFinite(parts[2]) || parts[2] <= 0) return null;
  return MAP_W / parts[2];
}

function pathAmplitude() {
  const legend = document.querySelector('.geo-legend');
  if (!legend) return '';
  const text = legend.textContent || '';
  const match = text.match(/Chemin\s*:\s*(.+?)\s*\(/i);
  return match ? match[1].trim() : '';
}

/* Collecte unique de toutes les grandeurs, relue à chaque actualisation. */
function collect() {
  const parsed = parseStatus();
  const listItems = document.querySelectorAll('#c3b-places > li').length;
  const markers = document.querySelectorAll('#c3b-map .geo-marker').length;
  const off = document.querySelectorAll('#c3b-places .c3b-offtag').length;
  const pathNodes = document.querySelectorAll('#c3b-map .geo-path-node').length;

  const visible = parsed ? parsed.visible : listItems;
  const total = parsed ? parsed.total : fallbackTotal();
  const framed = markers;

  const percent = (value, base) => (base > 0 ? (value / base) * 100 : 0);
  const coverage = percent(visible, total);
  const scale = viewScale();
  const coherent = (framed + off === visible) && (markers === framed);

  return {
    total,
    visible,
    listItems,
    framed,
    off,
    markers,
    pathNodes,
    amplitude: pathAmplitude(),
    scale,
    coverage,
    framedRatio: percent(framed, visible),
    filterLabel: queryText() ? '« ' + queryText() + ' »' : 'aucune recherche',
    frame: frameMode(),
    coherent,
    statusMatchesList: visible === listItems,
  };
}

/* ---------- Formules dérivées et formatage français déterministe ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function fmtInt(n) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}
function fmt1(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}
function fmt2(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function pct(n) {
  return fmt1(n) + ' %';
}

/* Couverture simulée : seuil du curseur / périmètre, bornée à 100 %. */
function coverageSim() {
  const stats = S.stats;
  if (!stats || stats.total <= 0) return 0;
  return clamp((S.seuil / stats.total) * 100, 0, REF_POURCENT);
}

/* Valeur et référence de la mesure actuellement choisie. */
function gauge() {
  const stats = S.stats || {};
  if (S.mesure === 'couvertureReelle') {
    return { value: clamp(stats.coverage || 0, 0, REF_POURCENT), ref: REF_POURCENT };
  }
  if (S.mesure === 'cadres') {
    return { value: clamp(stats.framedRatio || 0, 0, REF_POURCENT), ref: REF_POURCENT };
  }
  return { value: coverageSim(), ref: REF_POURCENT };
}

function coherenceNote(stats) {
  if (!stats) return 'relevé en attente';
  if (!stats.statusMatchesList) return 'écart : affichés (statut) ≠ entrées de la liste';
  if (stats.framed + stats.off !== stats.visible) {
    return 'écart : dans le cadre + hors du cadre ≠ affichés';
  }
  if (stats.markers !== stats.framed) return 'écart : marqueurs ≠ lieux dans le cadre';
  return 'cohérent ✓ : les compteurs se recoupent';
}

function comparatif(valeur, reference) {
  if (valeur > reference) return 'au-dessus';
  if (valeur < reference) return 'en deçà';
  return 'égal';
}

/* ---------- E057-02 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-limite{
  margin:8px 0;padding:8px 9px;border:1px dashed var(--gold,#e6b96f);border-radius:7px;
  color:var(--ink-soft,#d7d1c6);
}
#${PANEL_ID} .${P}-context{font-variant-numeric:tabular-nums;color:var(--muted)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${MESURE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${MESURE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${PANEL_ID} input[type="range"]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} input[type="range"]::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:52px;margin:8px 0;padding:8px 9px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;min-width:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID} .${P}-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.${P}-badge{
  position:absolute;right:14px;top:14px;z-index:3;max-width:60%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
.${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
  #${CANVAS_ID}{height:210px}
}`;

/* ---------- E057-01 : contenu sémantique, lisible sans le laboratoire ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une statistique de vue est une grandeur recalculée à partir d’éléments déjà présents dans le document, jamais une donnée inventée. Le bandeau de statut annonce « X lieu(x) affiché(s) sur Y » : Y est le périmètre de référence (100 %) et X le nombre de lieux affichés après filtre. La couverture du filtre vaut X ÷ Y, exprimée en pourcentage et bornée à 100 %.',
    'Deux contrôles de cohérence doivent toujours tenir : d’une part « lieux dans le cadre + lieux hors du cadre = lieux affichés », d’autre part « marqueurs de la carte = lieux dans le cadre ». geography.js ne crée en effet un marqueur que pour un lieu visible situé dans le cadre ; les autres sont simplement listés avec une étiquette « hors du cadre », sans déplacement fictif.',
    'Deux autres grandeurs complètent le relevé. Les nœuds du chemin chronologique sont comptés dans le SVG et leur amplitude en années est lue dans la légende. L’échelle de vue se déduit du viewBox : avec une largeur de référence de 900 unités, l’échelle vaut 900 ÷ largeur, soit ×1,00 en vue entière. Chaque nombre est recalculé depuis sa formule et comparé à une référence explicite.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* Limite falsifiable : elle peut être infirmée par une mesure, et elle est
 * alignée avec la rubrique « Limites et angles morts ». */
function staticLimit() {
  const p = document.createElement('p');
  p.id = LIMIT_ID;
  p.className = P + '-limite';
  p.textContent = 'Limite falsifiable : la couverture est bornée à 100 % du périmètre. Si un relevé annonçait plus de lieux affichés que de lieux du périmètre, ou si marqueurs et lieux dans le cadre cessaient de coïncider, le contrôle signalerait explicitement l’écart au lieu de le masquer. Le curseur simulé ne peut pas dépasser le périmètre réel : tout seuil supérieur est ramené à 100 %. Cette statistique décrit l’état du filtre, non une présence géographique réelle : une couverture de 100 % ne prouve pas l’exactitude des lieux.';
  return p;
}

/* E057-03 : tableau captioné. Les valeurs par défaut sont des références
 * textuelles : le tableau reste porteur de sens avant même le relevé. */
function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Compteurs relevés dans la vue géographique et comparés à une référence explicite.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur', 'Référence / contrôle'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ROWS.forEach(([label, valueId, refId, defaut]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    tr.appendChild(th);
    const tdV = document.createElement('td');
    tdV.id = valueId;
    tdV.textContent = defaut;
    tr.appendChild(tdV);
    const tdR = document.createElement('td');
    tdR.id = refId;
    tdR.textContent = '—';
    tr.appendChild(tdR);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

/* E057-03 : mise à jour du tableau, chaque cellule recalculée. */
function renderTable(stats) {
  const sim = coverageSim();
  setText(V.perimeter, fmtInt(stats.total));
  setText(R.perimeter, 'référence : 100 %');
  setText(V.visible, fmtInt(stats.visible));
  setText(R.visible, pct(stats.coverage) + ' du périmètre');
  setText(V.framed, fmtInt(stats.framed));
  setText(R.framed, pct(stats.framedRatio) + ' des affichés');
  setText(V.off, fmtInt(stats.off));
  setText(R.off, fmtInt(stats.framed) + ' + ' + fmtInt(stats.off) + ' = ' +
    fmtInt(stats.framed + stats.off) +
    (stats.framed + stats.off === stats.visible ? ' ✓' : ' ✗'));
  setText(V.markers, fmtInt(stats.markers));
  setText(R.markers, stats.markers === stats.framed ? 'égal au cadre ✓' : 'écart ✗');
  setText(V.path, fmtInt(stats.pathNodes));
  setText(R.path, stats.amplitude || 'aucun chemin');
  setText(V.scale, stats.scale === null ? 'indisponible' : '×' + fmt2(stats.scale));
  setText(R.scale, stats.scale === null ? 'vue entière de référence' :
    (Math.abs(stats.scale - REF_ECHELLE) < 0.005 ? 'vue entière ✓' : 'écart à ×1,00'));
  setText(V.coverage, pct(stats.coverage));
  setText(R.coverage, stats.coherent ? 'cohérent ✓' : coherenceNote(stats));
  setText(V.sim, pct(sim));
  setText(R.sim, fmtInt(S.seuil) + ' / ' + fmtInt(stats.total) + ' lieux');
}

/* ---------- E057-06 / E057-07 : radiogroupe et curseur ---------- */

function mesureFieldset() {
  const fieldset = document.createElement('fieldset');
  fieldset.id = MESURE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Grandeur affichée sur la jauge (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Grandeur affichée sur la jauge (choix unique)';
  fieldset.appendChild(legend);
  MESURE_ORDER.forEach((key) => {
    const lab = document.createElement('label');
    lab.className = P + '-choix';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-mesure';
    radio.id = P + '-mesure-' + key;
    radio.value = key;
    radio.checked = S.mesure === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MESURES[key].label));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function seuilRow() {
  const row = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', SEUIL_ID);
  label.appendChild(document.createTextNode('Seuil du filtre simulé : '));
  const out = document.createElement('span');
  out.className = P + '-valeur';
  out.id = SEUIL_OUT_ID;
  label.appendChild(out);
  row.appendChild(label);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = SEUIL_ID;
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.value = '0';
  input.setAttribute('aria-label', 'Nombre simulé de lieux affichés, de 0 au périmètre relevé');
  row.appendChild(input);
  return { row, input, out };
}

/* ---------- E057-01 : assemblage du panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radios: MESURE_ORDER.map((k) => document.getElementById(P + '-mesure-' + k)),
      seuil: document.getElementById(SEUIL_ID), seuilOut: document.getElementById(SEUIL_OUT_ID),
      canvas: document.getElementById(CANVAS_ID), readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID), context: document.getElementById(CONTEXT_ID),
      refresh: document.getElementById(REFRESH_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Compteurs et statistiques de la vue (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Ce laboratoire rassemble les compteurs déjà calculés par la vue géographique, les recalcule et les compare à des références explicites. Le curseur simule un seuil de filtre ; la jauge illustre la mesure choisie. Le savoir est dans le texte : le graphique ne fait qu’illustrer des règles déterministes.');

  const context = ctx.el('p', P + '-context', 'Filtre : en attente de relevé.');
  context.id = CONTEXT_ID;

  const formule = ctx.el('p', P + '-fait',
    'Modèle déterministe : couverture simulée = min(100 ; seuil ÷ périmètre × 100) ; couverture réelle = affichés ÷ périmètre × 100 ; part dans le cadre = dans le cadre ÷ affichés × 100 ; échelle = 900 ÷ largeur_du_viewBox. Aucun nombre n’est tiré au hasard : le même relevé donne toujours les mêmes valeurs.');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de compteurs et statistiques. Flèches gauche et droite : régler le seuil du filtre ; Origine/Fin : seuil minimal ou maximal ; 1, 2, 3 : choisir la mesure affichée ; Entrée : relire les compteurs. Les valeurs chiffrées sont aussi dans le tableau et la région de statut.');

  const legendText = ctx.el('p', P + '-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', P + '-sr',
    'Commandes du laboratoire : boutons radio pour choisir la mesure affichée ; curseur pour le seuil du filtre simulé ; bouton pour relire les compteurs ; flèches gauche et droite sur le graphique pour régler le seuil, Origine et Fin pour les extréma, touches 1, 2 et 3 pour choisir la mesure, Entrée pour relire les compteurs.');
  help.id = HELP_ID;
  panel.setAttribute('aria-describedby', help.id);

  const refresh = ctx.el('button', '', '↻ Relire les compteurs');
  refresh.type = 'button';
  refresh.id = REFRESH_ID;
  refresh.setAttribute('aria-controls', READOUT_ID);

  const seuil = seuilRow();

  panel.append(title, lead, staticFacts(), staticLimit(), formule, staticTable(),
    mesureFieldset(), seuil.row, canvas, legendText, readout, help, refresh);

  const host = ctx.layout || ctx.stage;
  const anchor = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  if (anchor && typeof anchor.insertBefore === 'function') anchor.insertBefore(panel, anchor.firstChild);
  else if (anchor && typeof anchor.appendChild === 'function') anchor.appendChild(panel);

  return {
    panel, fresh: true,
    radios: MESURE_ORDER.map((k) => document.getElementById(P + '-mesure-' + k)),
    seuil: seuil.input, seuilOut: seuil.out,
    canvas, readout, legend: legendText, context, refresh,
  };
}

/* ---------- E057-04 : jauge déterministe sur un seul canvas ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  /* DPR plafonné à 2 (aucun dépassement de budget de pixels). */
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

  const pad = 22;
  const iw = Math.max(10, cssW - pad * 2);
  const barY = 74;
  const barH = 30;

  const stats = S.stats || {};
  const { value, ref } = gauge();
  const mesure = MESURES[S.mesure];

  /* Cadre et graduations (jamais la seule couleur). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.strokeRect(pad, barY, iw, barH);
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.setLineDash([2, 4]);
  for (let k = 1; k < 4; k += 1) {
    const gx = pad + (iw * k) / 4;
    g.beginPath(); g.moveTo(gx, barY); g.lineTo(gx, barY + barH); g.stroke();
  }
  g.setLineDash([]);

  /* Remplissage animé, déterministe (aucune graine). */
  const ratio = clamp(value / ref, 0, 1);
  g.fillStyle = 'rgba(230,185,111,.35)';
  g.fillRect(pad, barY, iw * ratio, barH);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillRect(pad, barY + barH - 4, iw * ratio, 4);

  /* Repère de la référence 100 % en bout de barre. */
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(pad + iw, barY - 5); g.lineTo(pad + iw, barY + barH + 5); g.stroke();

  /* Repère de la couverture réelle (texte distinct). */
  if (Number.isFinite(stats.coverage)) {
    const rx = pad + iw * clamp(stats.coverage / ref, 0, 1);
    g.strokeStyle = 'rgba(214,207,193,.9)';
    g.lineWidth = 1.5;
    g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(rx, barY - 5); g.lineTo(rx, barY + barH + 5); g.stroke();
    g.setLineDash([]);
  }

  /* Étiquettes textuelles : la valeur est lisible sans distinguer la couleur. */
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.font = 'bold 13px sans-serif';
  g.fillText(mesure.label, pad, pad + 4);
  g.font = 'bold 18px sans-serif';
  g.fillText(pct(S.display), pad, pad + 28);
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(mesure.unite + ' · référence ' + pct(ref), pad, barY + barH + 20);
  g.fillText('0 %', pad, barY + barH + 36);
  g.fillText(pct(ref), pad + iw - 34, barY + barH + 36);
  g.fillText('Tiret gris = couverture réelle relevée (' + pct(stats.coverage || 0) + ').', pad, cssH - 8);
}

/* ---------- E057-07 : lecture chiffrée (région live unique) ---------- */

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Barre dorée : mesure choisie. Filet blanc en bout de barre : référence 100 %. Tiret gris : couverture réelle relevée dans la vue. Valeurs et écarts sont aussi écrits en toutes lettres dans la région de statut, jamais portés par la seule couleur.';
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n || !S.stats) return;
  const stats = S.stats;
  const sim = coverageSim();
  const mesure = MESURES[S.mesure];
  const courante = gauge().value;
  const cmpSim = comparatif(sim, REF_POURCENT);
  const cmpSimReel = comparatif(sim, stats.coverage);

  const debut = 'Mesure : ';
  const a1 = '. Jauge à ';
  const a2 = ' (' + mesure.unite + '), référence ' + pct(mesure.ref) + ' : ' +
    comparatif(courante, mesure.ref) + '. ';
  const a3 = 'Seuil simulé ' + fmtInt(S.seuil) + ' lieux sur ' + fmtInt(stats.total) +
    ' → couverture simulée ';
  const a4 = ' (' + cmpSim + ' de la référence ' + pct(REF_POURCENT) +
    ' ; ' + cmpSimReel + ' de la couverture réelle). ';
  const a5 = 'Couverture réelle relevée ' + pct(stats.coverage) +
    ', part dans le cadre ' + pct(stats.framedRatio) + ' des affichés, échelle ' +
    (stats.scale === null ? 'indisponible' : '×' + fmt2(stats.scale)) +
    '. Contrôle : ' + coherenceNote(stats) + '.';

  const plain = debut + mesure.label + a1 + pct(courante) + a2 + a3 + pct(sim) + a4 + a5;
  if (n.textContent === plain) return; /* évite de réannoncer une valeur stable */

  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));
  add(debut); n.appendChild(strong(mesure.label));
  add(a1); n.appendChild(strong(pct(courante)));
  add(a2 + a3); n.appendChild(strong(pct(sim)));
  add(a4);
  n.appendChild(strong(pct(stats.coverage)));
  add(', part dans le cadre '); n.appendChild(strong(pct(stats.framedRatio)));
  add(' des affichés, échelle ');
  n.appendChild(strong(stats.scale === null ? 'indisponible' : '×' + fmt2(stats.scale)));
  add('. Contrôle : '); n.appendChild(strong(coherenceNote(stats)));
  add('.');
}

function updateContext() {
  const n = S.nodes.context;
  if (!n || !S.stats) return;
  n.textContent = 'Filtre : ' + S.stats.filterLabel + ' · Cadre : ' + S.stats.frame +
    ' · Contrôle : ' + coherenceNote(S.stats) + '.';
}

/* E057-09 : badge de cohérence réelle, posé sur la carte sans toucher à la donnée. */
function updateBadge() {
  const badge = document.getElementById(BADGE_ID);
  if (!badge || !S.stats) return;
  badge.textContent = 'Compteurs réels : ' + fmtInt(S.stats.visible) + '/' + fmtInt(S.stats.total) +
    ' affichés · ' + fmtInt(S.stats.framed) + ' marqueurs · ' + coherenceNote(S.stats) + '.';
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || scope.querySelector('#c3b-map') || null)
    : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', 'Compteurs réels : relevé en attente.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* E057-05 / E057-06 : synchronisation des contrôles depuis l'état. */
function syncControls() {
  const n = S.nodes;
  const total = S.stats ? S.stats.total : 100;
  S.seuil = clamp(S.seuil === null ? (S.stats ? S.stats.visible : 0) : S.seuil, 0, total);
  n.radios.forEach((radio, i) => { if (radio) radio.checked = MESURE_ORDER[i] === S.mesure; });
  if (n.seuil) {
    n.seuil.max = String(total);
    n.seuil.value = String(S.seuil);
    n.seuil.setAttribute('aria-valuetext', fmtInt(S.seuil) + ' lieux sur ' + fmtInt(total));
  }
  if (n.seuilOut) n.seuilOut.textContent = fmtInt(S.seuil) + ' / ' + fmtInt(total);
  updateLegend();
  updateContext();
  updateBadge();
}

function refreshStatic() {
  if (!S.stats) return;
  renderTable(S.stats);
  syncControls();
  updateReadout();
}

/* ---------- E057-10 : boucle rAF unique, pause et robustesse ---------- */

function cancelAnim() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function canRun() {
  return typeof document === 'undefined' ? false : (!document.hidden && S.inView);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function tick(ts) {
  S.rafId = 0;
  if (!canRun()) return;
  if (S.lastTs) S.elapsed += Math.min(80, ts - S.lastTs);
  S.lastTs = ts;
  const t = Math.min(1, S.elapsed / ANIM_MS);
  S.display = S.target * easeOut(t);
  drawLab();
  if (t < 1) S.rafId = requestAnimationFrame(tick);
  else S.display = S.target;
}

/* Démarre une seule animation de la jauge vers la mesure courante. */
function animateGauge() {
  cancelAnim();
  const g = gauge();
  S.target = g.value;
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (reduced || !canRun() || typeof requestAnimationFrame !== 'function') {
    S.display = S.target;
    drawLab();
    return;
  }
  S.elapsed = 0;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Relevé complet : données, texte, contrôles, badge et animation. */
function refresh() {
  S.stats = collect();
  if (S.seuil === null) S.seuil = S.stats.visible;
  refreshStatic();
  animateGauge();
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      /* Pause immédiate en arrière-plan ; le temps masqué ne progresse pas. */
      if (document.hidden) {
        cancelAnim();
      } else if (canRun() && S.display !== S.target) {
        S.lastTs = 0;
        if (!S.rafId && typeof requestAnimationFrame === 'function') {
          S.rafId = requestAnimationFrame(tick);
        }
      }
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) {
          cancelAnim();
          S.display = S.target;
          drawLab();
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (!S.observer && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      S.observer = new IntersectionObserver((entries) => {
        const e = entries[0];
        S.inView = !e || e.isIntersecting;
        if (!S.inView) cancelAnim();
        else if (S.display !== S.target) {
          S.lastTs = 0;
          if (!S.rafId && typeof requestAnimationFrame === 'function') {
            S.rafId = requestAnimationFrame(tick);
          }
        }
      });
      S.observer.observe(S.nodes.panel);
    } catch { /* observation indisponible : la boucle reste active. */ }
  }
}

/* ---------- Point d'entrée ---------- */

register('E057', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (!ctx.layout.querySelector('#c3b-status') && !ctx.layout.querySelector('#c3b-places')) return;

  /* E057-02 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');

  refresh();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.mesure = radio.value;
        syncControls();
        updateReadout();
        animateGauge();
      });
    });
    n.seuil.addEventListener('input', () => {
      const total = S.stats ? S.stats.total : 0;
      S.seuil = clamp(Math.round(Number(n.seuil.value)), 0, total);
      syncControls();
      renderTable(S.stats);
      updateReadout();
      animateGauge();
    });
    n.refresh.addEventListener('click', refresh);

    /* E057-08 : équivalent clavier complet du laboratoire. */
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      const total = S.stats ? S.stats.total : 0;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        S.seuil = clamp(S.seuil + step, 0, total);
      } else if (event.key === 'Home' || event.key === 'End') {
        S.seuil = event.key === 'Home' ? 0 : total;
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        S.mesure = MESURE_ORDER[Number(event.key) - 1];
      } else if (event.key === 'Enter' || event.key === ' ') {
        refresh();
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
        renderTable(S.stats);
        updateReadout();
        animateGauge();
      }
    });
  }

  installGlobalListeners();
});
