import { register } from './registry.js';

/* Lentille E079 — vue GEOGRAPHIE.
 * Thème : densité de population.
 *
 * Les dix chantiers E079-01 … E079-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E079.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, liste) présent dans le DOM même sans animation ni
 * interaction ; le canvas n'est qu'un laboratoire qui illustre une relation
 * mathématique déterministe : densité = population / superficie.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PANEL_ID = 'geography-e079-panel';
const TITLE_ID = 'geography-e079-title';
const REGION_FIELD_ID = 'geography-e079-region';
const CLASS_GROUP_ID = 'geography-e079-classes';
const THRESHOLD_ID = 'geography-e079-threshold';
const THRESHOLD_OUT_ID = 'geography-e079-threshold-value';
const CANVAS_ID = 'geography-e079-canvas';
const LIST_ID = 'geography-e079-list';
const STATUS_ID = 'geography-e079-status';
const READOUT_ID = 'geography-e079-readout';
const LEGEND_ID = 'geography-e079-legend';
const TABLE_ID = 'geography-e079-table';
const RESET_ID = 'geography-e079-reset';
const ANIM_ID = 'geography-e079-anim';

const MIN_THRESHOLD = 0;
const MAX_THRESHOLD = 1200;

/* Corpus local, déterministe et sans invention de source : les noms de
   territoires sont des exemples pédagogiques. La population est en millions
   d'habitants, la superficie en milliers de km² ; la densité se déduit de
   ces deux nombres par une formule unique, jamais saisie à la main. */
const TERRITORIES = [
  { id: 'fr', code: 'FR', name: 'France', region: 'europe', pop: 68, area: 632 },
  { id: 'de', code: 'DE', name: 'Allemagne', region: 'europe', pop: 84, area: 358 },
  { id: 'gb', code: 'GB', name: 'Royaume-Uni', region: 'europe', pop: 67, area: 244 },
  { id: 'ru', code: 'RU', name: 'Russie', region: 'europe', pop: 144, area: 17098 },
  { id: 'in', code: 'IN', name: 'Inde', region: 'asie', pop: 1428, area: 3287 },
  { id: 'cn', code: 'CN', name: 'Chine', region: 'asie', pop: 1410, area: 9600 },
  { id: 'jp', code: 'JP', name: 'Japon', region: 'asie', pop: 125, area: 378 },
  { id: 'id', code: 'ID', name: 'Indonésie', region: 'asie', pop: 278, area: 1905 },
  { id: 'pk', code: 'PK', name: 'Pakistan', region: 'asie', pop: 240, area: 796 },
  { id: 'bd', code: 'BD', name: 'Bangladesh', region: 'asie', pop: 173, area: 148 },
  { id: 'eg', code: 'EG', name: 'Égypte', region: 'afrique', pop: 112, area: 1000 },
  { id: 'ng', code: 'NG', name: 'Nigeria', region: 'afrique', pop: 223, area: 924 },
  { id: 'us', code: 'US', name: 'États-Unis', region: 'americas', pop: 335, area: 9834 },
  { id: 'br', code: 'BR', name: 'Brésil', region: 'americas', pop: 216, area: 8516 },
  { id: 'ca', code: 'CA', name: 'Canada', region: 'americas', pop: 40, area: 9985 },
  { id: 'au', code: 'AU', name: 'Australie', region: 'oceanie', pop: 27, area: 7692 },
];

const REGIONS = [
  { id: 'all', name: 'Toutes les régions' },
  { id: 'europe', name: 'Europe' },
  { id: 'asie', name: 'Asie' },
  { id: 'afrique', name: 'Afrique' },
  { id: 'americas', name: 'Amériques' },
  { id: 'oceanie', name: 'Océanie' },
];

const CLASSES = [
  { id: 'tres-dense', label: 'Très dense (> 200)' },
  { id: 'dense', label: 'Dense (50 à 200)' },
  { id: 'clairsemee', label: 'Clairsemée (5 à 50)' },
  { id: 'tres-clairsemee', label: 'Très clairsemée (< 5)' },
];

const REGION_NAME = {};
REGIONS.forEach((r) => { REGION_NAME[r.id] = r.name; });
const CLASS_LABEL = {};
CLASSES.forEach((c) => { CLASS_LABEL[c.id] = c.label; });

const TOTAL_POP = TERRITORIES.reduce((sum, t) => sum + t.pop, 0);
const TOTAL_AREA = TERRITORIES.reduce((sum, t) => sum + t.area, 0);
const MAX_POP = TERRITORIES.reduce((max, t) => Math.max(max, t.pop), 0);
const MAX_AREA = TERRITORIES.reduce((max, t) => Math.max(max, t.area), 0);

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  region: 'all',
  classes: new Set(CLASSES.map((c) => c.id)),
  threshold: MIN_THRESHOLD,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée à la volée) ---------- */

const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

/* Densité en habitants par km² : pop en millions × 10^6 / (superficie en
   milliers de km² × 10^3) = pop × 1000 / superficie. */
function density(t) {
  return t.area > 0 ? (t.pop * 1000) / t.area : 0;
}

function classOf(t) {
  const d = density(t);
  if (d > 200) return 'tres-dense';
  if (d > 50) return 'dense';
  if (d >= 5) return 'clairsemee';
  return 'tres-clairsemee';
}

function filteredTerritories() {
  return TERRITORIES.filter((t) =>
    (S.region === 'all' || t.region === S.region)
    && S.classes.has(classOf(t))
    && density(t) >= S.threshold);
}

/* Densité moyenne pondérée par la population : somme des populations / somme
   des superficies — jamais la moyenne arithmétique de densités. */
function weightedDensity(list) {
  const pop = list.reduce((sum, t) => sum + t.pop, 0);
  const area = list.reduce((sum, t) => sum + t.area, 0);
  return area > 0 ? (pop * 1000) / area : 0;
}

const REFERENCE_DENSITY = weightedDensity(TERRITORIES);

function measures() {
  const all = TERRITORIES.length;
  const shown = filteredTerritories();
  return {
    all,
    shown: shown.length,
    part: all ? Math.round((shown.length / all) * 1000) / 10 : 0,
    regions: new Set(shown.map((t) => t.region)).size,
    totalRegions: REGIONS.length - 1,
    popShown: shown.reduce((sum, t) => sum + t.pop, 0),
    totalPop: TOTAL_POP,
    avg: weightedDensity(shown),
    reference: REFERENCE_DENSITY,
    max: shown.reduce((m, t) => Math.max(m, density(t)), 0),
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e079-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e079-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e079-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e079-panel p{margin:5px 0;max-width:68ch}
#geography-e079-panel .geography-e079-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e079-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e079-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e079-table th,#geography-e079-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e079-table thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e079-table tfoot th,#geography-e079-table tfoot td{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e079-region{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e079-region legend{padding:0 4px;color:var(--muted)}
#geography-e079-panel .geography-e079-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e079-panel .geography-e079-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e079-classes{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#geography-e079-classes button{
  min-height:44px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
}
#geography-e079-classes button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.1);
}
#geography-e079-threshold{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e079-threshold-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e079-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e079-legend{font-size:10px;color:var(--muted)}
#geography-e079-status{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
#geography-e079-list{list-style:none;margin:6px 0;padding:0}
#geography-e079-list li+li{margin-top:3px}
#geography-e079-list li{
  padding:5px 8px;border:1px solid var(--line);border-radius:7px;
  background:rgba(255,255,255,.02);font-size:10px;font-variant-numeric:tabular-nums;
}
#geography-e079-list li.geography-e079-vide{border-style:dashed;color:var(--muted)}
#geography-e079-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e079-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e079-panel .geography-e079-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#geography-e079-panel button.geography-e079-action{
  display:inline-block;width:auto;min-height:44px;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e079-panel button.geography-e079-action:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e079-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e079-panel[data-geography-e079-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e079-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e079-panel{font-size:10px;padding:9px}
  #geography-e079-canvas{height:200px}
  #geography-e079-panel .geography-e079-choix{margin-right:4px}
}
`;

/* ---------- E079-01 : section sémantique d'introduction (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'La densité de population est le nombre d’habitants rapporté à une superficie : densité = population ÷ superficie. Elle s’exprime en habitants par kilomètre carré (hab./km²).',
    'Un territoire très peuplé n’est pas forcément dense : la densité dépend autant de la superficie que de la population. Le Canada et l’Inde comptent des populations comparables mais des densités très différentes.',
    'Une densité moyenne est une grandeur pondérée : on divise la population totale par la superficie totale. Ce n’est pas la moyenne arithmétique des densités locales, qui donnerait un résultat trompeur.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e079-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E079-02 : tableau de référence (densité par territoire) ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Corpus de référence : population en millions d’habitants, superficie en milliers de km², densité calculée. La ligne « Ensemble de référence » donne la densité pondérée du corpus entier.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Territoire', 'Région', 'Population (M)', 'Superficie (milliers km²)', 'Densité (hab./km²)'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  TERRITORIES.forEach((t) => {
    const tr = document.createElement('tr');
    const cells = [
      [t.name, true],
      [REGION_NAME[t.region], false],
      [String(t.pop), false],
      [String(t.area), false],
      [fmt1(density(t)), false],
    ];
    cells.forEach(([texte, estEnTete], i) => {
      const cell = document.createElement(estEnTete ? 'th' : 'td');
      if (estEnTete) cell.scope = 'row';
      cell.textContent = texte;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tfoot = document.createElement('tfoot');
  const fr = document.createElement('tr');
  ['Ensemble de référence', '—', String(TOTAL_POP), String(TOTAL_AREA), fmt1(REFERENCE_DENSITY)].forEach((texte, i) => {
    const cell = document.createElement(i === 0 ? 'th' : 'td');
    if (i === 0) cell.scope = 'row';
    cell.textContent = texte;
    fr.appendChild(cell);
  });
  tfoot.appendChild(fr);
  table.appendChild(tfoot);
  return table;
}

/* ---------- E079-03 : sélecteur de région en choix unique (radios) ---------- */

function buildRegionField() {
  const fieldset = document.createElement('fieldset');
  fieldset.id = REGION_FIELD_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Région à afficher (choix unique)';
  fieldset.appendChild(legend);
  REGIONS.forEach((r) => {
    const lab = document.createElement('label');
    lab.className = 'geography-e079-choix';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e079-region';
    radio.id = `geography-e079-region-${r.id}`;
    radio.value = r.id;
    radio.checked = S.region === r.id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(r.name));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

/* ---------- E079-04 : bascules de classes de densité (aria-pressed) ---------- */

function buildClassGroup() {
  const group = document.createElement('div');
  group.id = CLASS_GROUP_ID;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Classes de densité (bascule indépendante)');
  const intro = document.createElement('p');
  intro.textContent = 'Classes de densité retenues (plusieurs réponses possibles) :';
  group.appendChild(intro);
  CLASSES.forEach((c) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.geographyE079Class = c.id;
    button.setAttribute('aria-pressed', S.classes.has(c.id) ? 'true' : 'false');
    button.setAttribute('aria-label', `Classe ${c.label} : inclure ou exclure cette classe`);
    button.textContent = c.label;
    group.appendChild(button);
  });
  return group;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('input[name="geography-e079-region"]')),
      classButtons: Array.from(existant.querySelectorAll('[data-geography-e079-class]')),
      threshold: document.getElementById(THRESHOLD_ID),
      thresholdOut: document.getElementById(THRESHOLD_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      list: document.getElementById(LIST_ID),
      status: document.getElementById(STATUS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      reset: document.getElementById(RESET_ID),
      anim: document.getElementById(ANIM_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e079-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Comprendre la densité de population');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'La densité relie la population à l’espace. Fixez une région, choisissez des classes de densité et un seuil minimal, puis observez combien de territoires restent retenus : le dessin illustre une relation, les chiffres restent lisibles en texte.');

  const subRef = ctx.el('h3', '', 'Référentiel du corpus');
  const subFiltre = ctx.el('h3', '', 'Réglages du filtre');
  const subListe = ctx.el('h3', '', 'Territoires retenus');

  /* E079-05 : curseur de densité minimale. */
  const thresholdRow = ctx.el('p', '');
  const thresholdLabel = document.createElement('label');
  thresholdLabel.setAttribute('for', THRESHOLD_ID);
  thresholdLabel.appendChild(document.createTextNode('Densité minimale : '));
  const thresholdOut = document.createElement('span');
  thresholdOut.id = THRESHOLD_OUT_ID;
  thresholdLabel.appendChild(thresholdOut);
  thresholdLabel.appendChild(document.createTextNode(' hab./km²'));
  thresholdRow.appendChild(thresholdLabel);

  const threshold = document.createElement('input');
  threshold.type = 'range';
  threshold.id = THRESHOLD_ID;
  threshold.min = String(MIN_THRESHOLD);
  threshold.max = String(MAX_THRESHOLD);
  threshold.step = '20';
  threshold.value = String(S.threshold);
  threshold.setAttribute('aria-label', `Densité minimale, de ${MIN_THRESHOLD} à ${MAX_THRESHOLD} habitants par kilomètre carré`);

  /* E079-07 : laboratoire canvas. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Nuage des territoires : axe horizontal = superficie, axe vertical = population, taille du disque = densité. Flèches gauche et droite : changer de région ; flèches haut et bas : modifier la densité minimale ; Entrée : lancer ou arrêter l’animation.');

  const legend = ctx.el('p', 'geography-e079-legend');
  legend.id = LEGEND_ID;
  legend.textContent = 'Chaque disque est un territoire : plus il est grand, plus la densité est forte. Plein = retenu, vide et pointillé = exclu. La droite tiretée représente la densité minimale : les points au-dessus sont retenus, ceux au-dessous sont exclus.';

  const status = ctx.el('p', 'geography-e079-status');
  status.id = STATUS_ID;

  const list = document.createElement('ul');
  list.id = LIST_ID;
  list.setAttribute('aria-label', 'Liste des territoires retenus par le filtre');

  /* E079-08 : lecture chiffrée et annoncée. */
  const readout = ctx.el('p', 'geography-e079-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const actions = ctx.el('div', 'geography-e079-actions');
  const reset = ctx.el('button', 'geography-e079-action', 'Réinitialiser les filtres');
  reset.type = 'button';
  reset.id = RESET_ID;
  const anim = ctx.el('button', 'geography-e079-action', '▶ Animer la sélection');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', 'false');
  actions.append(reset, anim);

  panel.append(
    title, lead,
    subRef, staticTable(), staticFacts(),
    subFiltre, buildRegionField(), buildClassGroup(), thresholdRow, threshold,
    canvas, legend,
    subListe, status, list, readout, actions,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: Array.from(panel.querySelectorAll('input[name="geography-e079-region"]')),
    classButtons: Array.from(panel.querySelectorAll('[data-geography-e079-class]')),
    threshold, thresholdOut, canvas, list, status, readout, legend, reset, anim,
  };
}

/* ---------- E079-06 : liste textuelle des territoires retenus ---------- */

function renderList() {
  const list = S.nodes.list;
  if (!list) return;
  const retenus = filteredTerritories();
  list.textContent = '';
  if (!retenus.length) {
    const li = document.createElement('li');
    li.className = 'geography-e079-vide';
    li.textContent = 'Aucun territoire ne satisfait cette combinaison de filtres. Réinitialisez ou élargissez un critère.';
    list.appendChild(li);
    return;
  }
  retenus.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = `${t.name} — ${fmt1(density(t))} hab./km² · ${CLASS_LABEL[classOf(t)]} · ${REGION_NAME[t.region]} · ${t.pop} M hab. sur ${t.area} milliers de km²`;
    list.appendChild(li);
  });
}

/* ---------- E079-08 : grandeurs chiffrées comparées à une référence ---------- */

function updateReadout() {
  const m = measures();
  const n = S.nodes;
  if (n.status) {
    n.status.textContent = `Filtre actif : région = ${REGION_NAME[S.region]} ; classes = ${CLASSES.filter((c) => S.classes.has(c.id)).map((c) => c.label).join(', ') || 'aucune'} ; densité ≥ ${fmt1(S.threshold)} hab./km².`;
  }
  if (!n.readout) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.readout.textContent = '';
  n.readout.appendChild(document.createTextNode('Résultat : '));
  n.readout.appendChild(fort(`${m.shown} territoires retenus`));
  n.readout.appendChild(document.createTextNode(' sur '));
  n.readout.appendChild(fort(`${m.all} au total`));
  n.readout.appendChild(document.createTextNode(' (référence : 100 %, '));
  n.readout.appendChild(fort(`${fmt1(m.part)} %`));
  n.readout.appendChild(document.createTextNode(' du corpus), sur '));
  n.readout.appendChild(fort(`${m.regions} régions sur ${m.totalRegions}`));
  n.readout.appendChild(document.createTextNode('. Densité moyenne pondérée : '));
  n.readout.appendChild(fort(`${fmt1(m.avg)} hab./km²`));
  n.readout.appendChild(document.createTextNode(' contre '));
  n.readout.appendChild(fort(`${fmt1(m.reference)} hab./km²`));
  n.readout.appendChild(document.createTextNode(' pour l’ensemble de référence ; densité maximale retenue : '));
  n.readout.appendChild(fort(`${fmt1(m.max)} hab./km²`));
  n.readout.appendChild(document.createTextNode('. Population couverte : '));
  n.readout.appendChild(fort(`${m.popShown} M hab.`));
  n.readout.appendChild(document.createTextNode(' sur '));
  n.readout.appendChild(fort(`${m.totalPop} M hab.`));
  n.readout.appendChild(document.createTextNode('. Le filtre ne modifie jamais le corpus de départ.'));
}

/* ---------- E079-07 : laboratoire canvas (un seul canvas, dessin déterministe) ---------- */

function drawPoint(g, x, y, rayon, retenu) {
  if (g.setLineDash) g.setLineDash(retenu ? [] : [2, 2]);
  g.lineWidth = retenu ? 1.6 : 1;
  g.strokeStyle = retenu ? 'rgba(244,214,158,.95)' : 'rgba(214,207,193,.4)';
  g.fillStyle = 'rgba(244,214,158,.85)';
  g.beginPath();
  g.arc(x, y, rayon, 0, Math.PI * 2);
  if (retenu) g.fill();
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);
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

  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const iw = Math.max(10, cssW - padL - padR);
  const ih = Math.max(10, cssH - padT - padB);
  const xFor = (area) => padL + (area / MAX_AREA) * iw;
  const yFor = (pop) => padT + ih - (pop / MAX_POP) * ih;
  const rayonFor = (d) => Math.max(2.5, Math.min(13, Math.sqrt(Math.max(0, d)) * 0.55));

  /* Cadre et axes. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.strokeRect(padL, padT, iw, ih);
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.font = '9px sans-serif';
  g.fillText('population (M)', padL - 2, padT - 4);
  g.fillText('superficie (milliers km²)', padL, cssH - 4);
  g.fillText(String(MAX_POP), 2, padT + 8);
  g.fillText('0', 20, padT + ih);
  g.fillText(String(MAX_AREA), cssW - padR - 34, padT + ih - 4);

  /* E079-05 : droite de densité constante — pop = seuil × superficie / 1000.
     Les points au-dessus de cette droite ont une densité ≥ seuil. */
  const ySeuil = (area) => yFor((S.threshold * area) / 1000);
  if (g.setLineDash) g.setLineDash([4, 3]);
  g.strokeStyle = 'rgba(244,214,158,.8)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(xFor(0), ySeuil(0));
  g.lineTo(xFor(MAX_AREA), Math.max(padT, Math.min(padT + ih, ySeuil(MAX_AREA))));
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillText(`densité ≥ ${fmt1(S.threshold)}`, padL + 3, padT + 10);

  const retenus = new Set(filteredTerritories().map((t) => t.id));
  TERRITORIES.forEach((t) => {
    const x = xFor(t.area);
    const y = yFor(t.pop);
    drawPoint(g, x, y, rayonFor(density(t)), retenus.has(t.id));
    g.fillStyle = retenus.has(t.id) ? 'rgba(255,255,255,.95)' : 'rgba(214,207,193,.55)';
    g.fillText(t.code, x + rayonFor(density(t)) + 2, y - 2);
  });

  /* E079-09 : anneau animé, position déterministe = f(S.sweep). */
  if (S.playing && retenus.size) {
    const liste = filteredTerritories();
    const idx = Math.floor(S.sweep * liste.length) % liste.length;
    const cible = liste[idx];
    const x = xFor(cible.area);
    const y = yFor(cible.pop);
    const r = rayonFor(density(cible)) + 5;
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.fillText(`${idx + 1}/${liste.length}`, padL + 3, padT + 22);
  }
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio) => { radio.checked = radio.value === S.region; });
  n.classButtons.forEach((b) => {
    b.setAttribute('aria-pressed', S.classes.has(b.dataset.geographyE079Class) ? 'true' : 'false');
  });
  if (n.threshold) n.threshold.value = String(S.threshold);
  if (n.thresholdOut) n.thresholdOut.textContent = fmt1(S.threshold);
  if (n.anim) {
    n.anim.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la sélection';
    n.anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  renderList();
  drawLab();
}

/* ---------- E079-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  const reduced = typeof ctxReducedMotion === 'function' ? !!ctxReducedMotion() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* Référence à la préférence de mouvement, fournie par ctx à l'entrée. */
let ctxReducedMotion = null;

/* ---------- E079-10 : accessibilité, mouvement réduit, robustesse d'état ---------- */

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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE079Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function changeRegion(id) {
  if (!REGION_NAME[id]) return;
  S.region = id;
  S.sweep = 0;
  syncControls();
}

function toggleClass(id) {
  if (!CLASS_LABEL[id]) return;
  if (S.classes.has(id)) S.classes.delete(id);
  else S.classes.add(id);
  S.sweep = 0;
  syncControls();
}

function setThreshold(value) {
  const n = Math.round(Number(value) / 20) * 20;
  S.threshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, Number.isFinite(n) ? n : MIN_THRESHOLD));
  S.sweep = 0;
  syncControls();
}

function toggleAnimation() {
  S.playing = !S.playing;
  if (!S.playing) stopLoop(); else startLoop();
  syncControls();
}

/* ---------- Point d'entrée ---------- */

register('E079', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxReducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  ctx.css('geography-e079', CSS);

  S.nodes = ensurePanel(ctx);

  const reduced = ctxReducedMotion ? !!ctxReducedMotion() : false;
  S.nodes.panel.dataset.geographyE079Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    S.nodes.radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) changeRegion(radio.value);
      });
    });
    S.nodes.classButtons.forEach((button) => {
      button.addEventListener('click', () => toggleClass(button.dataset.geographyE079Class));
    });
    S.nodes.threshold.addEventListener('input', () => setThreshold(S.nodes.threshold.value));
    S.nodes.reset.addEventListener('click', () => {
      S.region = 'all';
      S.classes = new Set(CLASSES.map((c) => c.id));
      S.threshold = MIN_THRESHOLD;
      S.sweep = 0;
      S.playing = false;
      stopLoop();
      syncControls();
    });
    S.nodes.anim.addEventListener('click', toggleAnimation);
    S.nodes.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = REGIONS.findIndex((r) => r.id === S.region);
        changeRegion(REGIONS[(i + step + REGIONS.length) % REGIONS.length].id);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 100 : -100;
        setThreshold(S.threshold + step);
      } else if (event.key === 'Enter' || event.key === ' ') {
        toggleAnimation();
      } else {
        used = false;
      }
      if (used) event.preventDefault();
    });
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
