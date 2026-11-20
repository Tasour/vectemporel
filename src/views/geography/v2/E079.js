import { register } from './registry.js';

/* Lentille E079 (V2) — vue GEOGRAPHIE.
 * Thème : densité de population — population, superficie et densité comparée.
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E079-01 … E079-10. Aucun stub, aucune fonction vide, aucun fichier partagé
 * modifié (passe 1, registry.js et index.js intacts).
 *
 * Contrat : register('E079', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-v2-e079`.
 * Tous les identifiants, classes et attributs sont préfixés
 * `geography-v2-e079-`. Zéro console, zéro réseau, zéro aléa, au plus une
 * requête d'animation en vol (suspendue quand le document est masqué, hors
 * écran, ou en mouvement réduit). Tout le savoir est du texte DOM sémantique
 * lisible sans script ; le canvas n'est qu'un laboratoire qui illustre des
 * grandeurs déjà écrites en toutes lettres.
 *
 * Nouveautés V2 par rapport à la passe 1 : état mémorisé dans `S` et gardes
 * d'écouteurs entre rendus, `role="radiogroup"` explicite, `aria-valuetext`
 * maintenu sur le curseur de densité, `ctx.reducedMotion()` relu à chaque
 * tick, IntersectionObserver suspendant le balayage hors écran, cibles ≥ 36 px
 * (boutons 44 px, radios et pouces 24 px), badge de schématisme dans .geo-map
 * et défi falsifiable en cinq temps avec débrief révélé par aria-expanded.
 */

const P = 'geography-v2-e079';

/* Identifiants, tous préfixés geography-v2-e079-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const FACTS_ID = P + '-facts';
const TABLE_ID = P + '-table';
const REGION_FIELD_ID = P + '-region';
const CLASS_GROUP_ID = P + '-classes';
const THRESHOLD_ID = P + '-threshold';
const THRESHOLD_OUT_ID = P + '-threshold-value';
const READOUT_ID = P + '-readout';
const STATUS_ID = P + '-status';
const CANVAS_ID = P + '-canvas';
const CAPTION_ID = P + '-caption';
const LEGEND_ID = P + '-legend';
const LIST_ID = P + '-list';
const ACTIONS_ID = P + '-actions';
const ANIM_ID = P + '-anim';
const RESET_ID = P + '-reset';
const CLAVIER_ID = P + '-clavier';
const LIMITE_ID = P + '-limite';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Bornes et pas du curseur de densité (hab./km²). */
const MIN_THRESHOLD = 0;
const MAX_THRESHOLD = 1200;
const STEP = 20;

/* Formatage français déterministe, sans Intl ni aléa. */
const NARROW = '\u202f';
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);

/* Corpus local, déterministe et sans invention de source : les noms de
   territoires sont des exemples pédagogiques. La population est en millions
   d'habitants, la superficie en milliers de km² ; la densité se déduit de ces
   deux nombres par une formule unique, jamais saisie à la main. */
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

/* État de module : survit au `stage.innerHTML = ''` de la coque. Les écouteurs
   globaux et l'observateur sont posés une seule fois (gardes anti-doublon). */
const S = {
  region: 'all',
  classes: new Set(CLASSES.map((c) => c.id)),
  threshold: MIN_THRESHOLD,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  debriefOpen: false,
  renders: 0,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;
const reduced = () => (typeof ctxReduced === 'function' && !!ctxReduced());

/* ---------- Formules déterministes (aucune donnée fabriquée à la volée) ---------- */

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

/* ---------- E079-01 / E079-02 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
.${P}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} tfoot th,#${TABLE_ID} tfoot td{color:var(--gold-bright,#f4d69e);font-weight:600}
#${REGION_FIELD_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${REGION_FIELD_ID} legend{padding:0 4px;color:var(--muted)}
.${P}-choix{display:inline-flex;align-items:center;gap:6px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer}
.${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${CLASS_GROUP_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#${CLASS_GROUP_ID} button{
  min-height:44px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
}
#${CLASS_GROUP_ID} button[aria-pressed="true"]{border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.1)}
#${THRESHOLD_ID}{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${THRESHOLD_OUT_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:none}
.${P}-legend{font-size:10px;color:var(--muted)}
.${P}-status{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
#${LIST_ID}{list-style:none;margin:6px 0;padding:0}
#${LIST_ID} li+li{margin-top:3px}
#${LIST_ID} li{padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:rgba(255,255,255,.02);font-size:10px;font-variant-numeric:tabular-nums}
#${LIST_ID} li.${P}-vide{border-style:dashed;color:var(--muted)}
#${READOUT_ID}{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#${ACTIONS_ID} button{
  display:inline-block;width:auto;min-height:44px;padding:6px 12px;border:1px solid var(--line);
  border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;transition:border-color .18s,background-color .18s;
}
#${ACTIONS_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${DEBRIEF_BTN_ID}{min-height:44px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer}
.${P}-map-badge{
  position:absolute;left:6px;bottom:6px;max-width:62%;padding:4px 7px;border:1px solid var(--line);
  border-radius:6px;background:rgba(0,0,0,.55);color:var(--muted);font-size:9px;line-height:1.35;
  pointer-events:none;z-index:2;
}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  .${P}-choix{margin-right:4px}
  .${P}-map-badge{max-width:86%}
}
`;

/* ---------- E079-01 : faits sémantiques, lisibles sans JS ---------- */

function buildFacts(ctx) {
  const wrap = ctx.el('div', P + '-facts');
  wrap.id = FACTS_ID;
  const faits = [
    'E079-01 · Définition : la densité de population est le nombre d’habitants rapporté à une superficie — densité = population ÷ superficie — et s’exprime en habitants par kilomètre carré (hab./km²).',
    'E079-01 · Grandeur relative : un territoire très peuplé n’est pas forcément dense. Le Canada et l’Inde comptent des populations comparables, mais des densités très différentes parce que leurs superficies ne le sont pas.',
    'E079-01 · Grandeur pondérée : la densité moyenne d’un ensemble vaut population totale ÷ superficie totale. Ce n’est pas la moyenne arithmétique des densités locales, qui donnerait un résultat trompeur.',
  ];
  faits.forEach((texte) => {
    const p = ctx.el('p', P + '-fait', texte);
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E079-02 : tableau de référence (densité par territoire) ---------- */

function buildTable(ctx) {
  const table = ctx.el('table');
  table.id = TABLE_ID;
  const caption = ctx.el('caption',
    'Corpus de référence : population en millions d’habitants, superficie en milliers de km², densité calculée. La ligne « Ensemble de référence » donne la densité pondérée du corpus entier.');
  table.appendChild(caption);

  const thead = ctx.el('thead');
  const hr = ctx.el('tr');
  ['Territoire', 'Région', 'Population (M)', 'Superficie (milliers km²)', 'Densité (hab./km²)'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = ctx.el('tbody');
  TERRITORIES.forEach((t) => {
    const tr = ctx.el('tr');
    const cells = [
      [t.name, true],
      [REGION_NAME[t.region], false],
      [String(t.pop), false],
      [fmtInt(t.area), false],
      [fmt1(density(t)), false],
    ];
    cells.forEach(([texte, estEnTete]) => {
      const cell = ctx.el(estEnTete ? 'th' : 'td', '', texte);
      if (estEnTete) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tfoot = ctx.el('tfoot');
  const fr = ctx.el('tr');
  ['Ensemble de référence', '—', fmtInt(TOTAL_POP), fmtInt(TOTAL_AREA), fmt1(REFERENCE_DENSITY)].forEach((texte, i) => {
    const cell = ctx.el(i === 0 ? 'th' : 'td', '', texte);
    if (i === 0) cell.scope = 'row';
    fr.appendChild(cell);
  });
  tfoot.appendChild(fr);
  table.appendChild(tfoot);
  return table;
}

/* ---------- E079-03 : sélecteur de région en radiogroup (choix unique) ---------- */

function buildRegionField(ctx) {
  const fieldset = ctx.el('fieldset');
  fieldset.id = REGION_FIELD_ID;
  fieldset.setAttribute('role', 'radiogroup');
  const legend = ctx.el('legend', '', 'Région à afficher (choix unique)');
  fieldset.appendChild(legend);
  const radios = [];
  REGIONS.forEach((r) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = ctx.el('input');
    radio.type = 'radio';
    radio.name = P + '-region';
    radio.id = P + '-region-' + r.id;
    radio.value = r.id;
    radio.checked = S.region === r.id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(r.name));
    fieldset.appendChild(lab);
    radios.push(radio);
  });
  return { fieldset, radios };
}

/* ---------- E079-04 : bascules de classes (aria-pressed indépendant) ---------- */

function buildClassGroup(ctx) {
  const group = ctx.el('div');
  group.id = CLASS_GROUP_ID;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Classes de densité (bascule indépendante)');
  const intro = ctx.el('p', '', 'E079-04 · Classes de densité retenues (plusieurs réponses possibles) :');
  group.appendChild(intro);
  const buttons = [];
  CLASSES.forEach((c) => {
    const button = ctx.el('button', '', c.label);
    button.type = 'button';
    button.dataset[P + 'Class'] = c.id;
    button.setAttribute('aria-pressed', S.classes.has(c.id) ? 'true' : 'false');
    button.setAttribute('aria-label', 'Classe ' + c.label + ' : inclure ou exclure cette classe');
    group.appendChild(button);
    buttons.push(button);
  });
  return { group, buttons };
}

/* ---------- E079-05 : curseur de densité minimale ---------- */

function buildThreshold(ctx) {
  const wrap = ctx.el('div');
  const row = ctx.el('p');
  const label = ctx.el('label');
  label.setAttribute('for', THRESHOLD_ID);
  label.appendChild(document.createTextNode('E079-05 · Densité minimale : '));
  const out = ctx.el('span', '', fmt1(S.threshold));
  out.id = THRESHOLD_OUT_ID;
  label.appendChild(out);
  label.appendChild(document.createTextNode(' hab./km²'));
  row.appendChild(label);

  const input = ctx.el('input');
  input.type = 'range';
  input.id = THRESHOLD_ID;
  input.min = String(MIN_THRESHOLD);
  input.max = String(MAX_THRESHOLD);
  input.step = String(STEP);
  input.value = String(S.threshold);
  input.setAttribute('aria-label', 'Densité minimale, de 0 à 1200 habitants par kilomètre carré');
  input.setAttribute('aria-valuetext', fmt1(S.threshold) + ' habitants par kilomètre carré');

  wrap.append(row, input);
  return { wrap, input, out };
}

/* ---------- E079-10 : badge de schématisme dans .geo-map ---------- */

function addMapBadge(ctx) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MAP_BADGE_ID)) return;
  const host = ctx.layout || ctx.stage;
  const map = host && typeof host.querySelector === 'function'
    ? host.querySelector('.geo-map')
    : null;
  if (!map) return;
  const badge = ctx.el('div', P + '-map-badge',
    'Nuage schématique : territoires d’exemple et densités calculées (population ÷ superficie), sans fond de carte réel chargé.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('input[name="' + P + '-region"]')),
      classButtons: Array.from(existant.querySelectorAll('[data-' + P + 'Class]')),
      threshold: document.getElementById(THRESHOLD_ID),
      thresholdOut: document.getElementById(THRESHOLD_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      list: document.getElementById(LIST_ID),
      status: document.getElementById(STATUS_ID),
      readout: document.getElementById(READOUT_ID),
      anim: document.getElementById(ANIM_ID),
      reset: document.getElementById(RESET_ID),
      debrief: document.getElementById(DEBRIEF_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  /* E079-01 — amorce textuelle, lisible sans aucune interaction. */
  const title = ctx.el('h2', '', 'Comprendre la densité de population');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'La densité relie la population à l’espace. Fixez une région, choisissez des classes de densité et un seuil minimal, puis observez combien de territoires restent retenus : le dessin illustre une relation, les chiffres restent lisibles en texte.');
  lead.id = LEAD_ID;

  const subRef = ctx.el('h3', '', 'Référentiel du corpus');
  const subFiltre = ctx.el('h3', '', 'Réglages du filtre');
  const subListe = ctx.el('h3', '', 'Territoires retenus');

  const region = buildRegionField(ctx);
  const classes = buildClassGroup(ctx);
  const threshold = buildThreshold(ctx);

  /* E079-07 — laboratoire canvas, redondant avec le texte. */
  const canvas = ctx.el('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Nuage des territoires : axe horizontal = superficie, axe vertical = population, taille du disque = densité. Plein = retenu, vide et pointillé = exclu. Flèches gauche et droite : changer de région ; flèches haut et bas : modifier la densité minimale ; Entrée : lancer ou arrêter l’animation.');
  const caption = ctx.el('p', P + '-legend',
    'E079-07 · Chaque disque est un territoire : plus il est grand, plus la densité est forte. Plein = retenu, vide et pointillé = exclu. La droite tiretée représente la densité minimale : les points au-dessus sont retenus, ceux au-dessous sont exclus.');
  caption.id = CAPTION_ID;

  const legend = ctx.el('p', P + '-legend',
    'E079-07 · Codes à deux lettres : FR France · DE Allemagne · GB Royaume-Uni · RU Russie · IN Inde · CN Chine · JP Japon · ID Indonésie · PK Pakistan · BD Bangladesh · EG Égypte · NG Nigeria · US États-Unis · BR Brésil · CA Canada · AU Australie.');
  legend.id = LEGEND_ID;

  const status = ctx.el('p', P + '-status');
  status.id = STATUS_ID;

  const list = ctx.el('ul');
  list.id = LIST_ID;
  list.setAttribute('aria-label', 'Liste des territoires retenus par le filtre');

  /* E079-08 — unique région live. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const actions = ctx.el('div');
  actions.id = ACTIONS_ID;
  const anim = ctx.el('button', '', '▶ Animer la sélection');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', 'false');
  anim.setAttribute('aria-controls', READOUT_ID);
  const reset = ctx.el('button', '', 'Réinitialiser les filtres');
  reset.type = 'button';
  reset.id = RESET_ID;
  actions.append(anim, reset);

  const clavier = ctx.el('p', P + '-ligne',
    'E079-09 · Clavier : Tab atteint le radiogroup région, les quatre classes, le curseur de densité, les deux commandes puis le canevas. Sur le radiogroup, ← → parcourent les six régions ; sur le curseur, ← → ajustent le seuil par pas de 20 ; sur le canevas, ← → changent de région, ↑ ↓ modifient le seuil et Entrée lance ou arrête l’animation.');
  clavier.id = CLAVIER_ID;

  /* E079-10 — limite falsifiable en cinq temps, alignée sur l'angle mort. */
  const limite = ctx.el('p', P + '-ligne',
    'E079-10 · Limite et vérification : 1) prédire qu’en fixant une densité minimale égale à la densité de référence du corpus, le Bangladesh, l’Inde et le Japon restent seuls retenus ; ' +
    `2) régler le curseur sur ${fmt1(REFERENCE_DENSITY)} hab./km² (arrondi au pas de ${STEP}) ; ` +
    `3) attendre une densité moyenne de la sélection supérieure à ${fmt1(REFERENCE_DENSITY)} hab./km², la sélection ne gardant que les territoires les plus denses ; ` +
    '4) falsifier si un territoire retenu a une densité inférieure au seuil affiché, ou si la moyenne de la sélection n’excède pas celle du corpus ; ' +
    '5) débrief : ouvrir le paragraphe ci-dessous pour lire l’angle mort de la densité moyenne.');
  limite.id = LIMITE_ID;

  const debriefBtn = ctx.el('button', '', 'Révéler le débrief (angle mort)');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);

  const debrief = ctx.el('p', P + '-ligne',
    `Débrief : une densité moyenne (${fmt1(REFERENCE_DENSITY)} hab./km² sur ${fmtInt(TOTAL_POP)} M hab. et ${fmtInt(TOTAL_AREA)} milliers de km²) est alourdie par les très grands territoires peu denses. Elle ne dit rien de la répartition interne : à superficie et population égales, deux pays ont la même densité mais des peuplements très différents. C’est la limite falsifiable du modèle.`);
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(
    title, lead, subRef, buildTable(ctx), buildFacts(ctx),
    subFiltre, region.fieldset, classes.group, threshold.wrap,
    canvas, caption, legend, status,
    subListe, list, readout, actions, clavier, limite, debriefBtn, debrief,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: region.radios,
    classButtons: classes.buttons,
    threshold: threshold.input,
    thresholdOut: threshold.out,
    canvas, list, status, readout, anim, reset, debrief, debriefBtn,
  };
}

/* ---------- E079-06 : liste textuelle des territoires retenus ---------- */

function renderList() {
  const list = S.nodes.list;
  if (!list) return;
  const retenus = filteredTerritories();
  list.textContent = '';
  if (!retenus.length) {
    const li = ctxEl('li', P + '-vide',
      'Aucun territoire ne satisfait cette combinaison de filtres. Réinitialisez ou élargissez un critère.');
    list.appendChild(li);
    return;
  }
  retenus.forEach((t) => {
    const li = ctxEl('li', '',
      t.name + ' — ' + fmt1(density(t)) + ' hab./km² · ' + CLASS_LABEL[classOf(t)] + ' · ' +
      REGION_NAME[t.region] + ' · ' + t.pop + ' M hab. sur ' + fmtInt(t.area) + ' milliers de km²');
    list.appendChild(li);
  });
}

/* Petit fabriceur local, indépendant de ctx (utilisé hors du point d'entrée). */
function ctxEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- E079-08 : grandeurs chiffrées comparées à une référence ---------- */

function writeReadout(origin) {
  const m = measures();
  const n = S.nodes;
  if (n.status) {
    n.status.textContent = 'Filtre actif (' + origin + ') : région = ' + REGION_NAME[S.region] +
      ' ; classes = ' + (CLASSES.filter((c) => S.classes.has(c.id)).map((c) => c.label).join(', ') || 'aucune') +
      ' ; densité ≥ ' + fmt1(S.threshold) + ' hab./km².';
  }
  if (!n.readout) return;
  const strong = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.readout.textContent = '';
  n.readout.appendChild(document.createTextNode('Résultat : '));
  n.readout.appendChild(strong(m.shown + ' territoires retenus'));
  n.readout.appendChild(document.createTextNode(' sur '));
  n.readout.appendChild(strong(m.all + ' au total'));
  n.readout.appendChild(document.createTextNode(' (référence : 100 %, '));
  n.readout.appendChild(strong(fmt1(m.part) + ' %'));
  n.readout.appendChild(document.createTextNode(' du corpus), sur '));
  n.readout.appendChild(strong(m.regions + ' régions sur ' + m.totalRegions));
  n.readout.appendChild(document.createTextNode('. Densité moyenne pondérée : '));
  n.readout.appendChild(strong(fmt1(m.avg) + ' hab./km²'));
  n.readout.appendChild(document.createTextNode(' contre '));
  n.readout.appendChild(strong(fmt1(m.reference) + ' hab./km²'));
  n.readout.appendChild(document.createTextNode(' pour l’ensemble de référence ; densité maximale retenue : '));
  n.readout.appendChild(strong(fmt1(m.max) + ' hab./km²'));
  n.readout.appendChild(document.createTextNode('. Population couverte : '));
  n.readout.appendChild(strong(fmtInt(m.popShown) + ' M hab.'));
  n.readout.appendChild(document.createTextNode(' sur '));
  n.readout.appendChild(strong(fmtInt(m.totalPop) + ' M hab.'));
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
  g.fillText(fmtInt(MAX_POP), 2, padT + 8);
  g.fillText('0', 20, padT + ih);
  g.fillText(fmtInt(MAX_AREA), cssW - padR - 40, padT + ih - 4);

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
  g.fillText('densité ≥ ' + fmt1(S.threshold), padL + 3, padT + 10);

  const retenus = new Set(filteredTerritories().map((t) => t.id));
  TERRITORIES.forEach((t) => {
    const x = xFor(t.area);
    const y = yFor(t.pop);
    const r = rayonFor(density(t));
    drawPoint(g, x, y, r, retenus.has(t.id));
    g.fillStyle = retenus.has(t.id) ? 'rgba(255,255,255,.95)' : 'rgba(214,207,193,.55)';
    g.fillText(t.code, x + r + 2, y - 2);
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
    g.fillText((idx + 1) + '/' + liste.length, padL + 3, padT + 22);
  }
}

/* ---------- E079-09 : unique boucle rAF, pause hors écran / masqué ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') {
    if (!S.rafId) drawLab();
    return;
  }
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  const isReduced = reduced();
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !isReduced) S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !isReduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E079-10 : mouvements réduits, observateur, listeners globaux ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !reduced()) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.playing = false; stopLoop(); }
        else if (S.playing) startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* IntersectionObserver : suspend le balayage hors écran. */
function ensureObserver(canvas) {
  if (S.io || typeof IntersectionObserver !== 'function') return;
  S.ioCanvas = canvas;
  S.io = new IntersectionObserver((entries) => {
    const e = entries[0];
    S.onScreen = !e || e.isIntersecting;
    if (!S.onScreen) stopLoop();
    else if (S.playing && !reduced()) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
}

/* ---------- Synchronisation et changements d'état ---------- */

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio) => { radio.checked = radio.value === S.region; });
  n.classButtons.forEach((b) => {
    b.setAttribute('aria-pressed', S.classes.has(b.dataset[P + 'Class']) ? 'true' : 'false');
  });
  if (n.threshold) {
    n.threshold.value = String(S.threshold);
    n.threshold.setAttribute('aria-valuetext', fmt1(S.threshold) + ' habitants par kilomètre carré');
  }
  if (n.thresholdOut) n.thresholdOut.textContent = fmt1(S.threshold);
  if (n.anim) {
    n.anim.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la sélection';
    n.anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  const panel = n.panel;
  if (panel) {
    panel.setAttribute(REDUCED_ATTR, reduced() ? '1' : '0');
    const host = panel.parentNode;
    if (host && host.setAttribute) {
      host.setAttribute('data-' + P + '-render', String(S.renders));
      host.setAttribute('data-' + P + '-threshold', String(S.threshold));
    }
  }
  if (n.debriefBtn) n.debriefBtn.setAttribute('aria-expanded', S.debriefOpen ? 'true' : 'false');
  if (n.debrief) n.debrief.hidden = !S.debriefOpen;
  writeReadout('synthèse');
  renderList();
  drawLab();
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
  const n = Math.round(Number(value) / STEP) * STEP;
  S.threshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, Number.isFinite(n) ? n : MIN_THRESHOLD));
  S.sweep = 0;
  syncControls();
}

function cycleRegion(step) {
  const i = REGIONS.findIndex((r) => r.id === S.region);
  changeRegion(REGIONS[(i + step + REGIONS.length) % REGIONS.length].id);
}

function toggleAnimation() {
  if (reduced()) { S.playing = false; stopLoop(); syncControls(); return; }
  S.playing = !S.playing;
  if (!S.playing) stopLoop(); else startLoop();
  syncControls();
}

/* ---------- E079-09 / E079-10 : clavier (panneau et canevas) ---------- */

function onKey(event) {
  const n = S.nodes;
  const cible = event.target;
  if (cible === n.canvas) {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      cycleRegion(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      setThreshold(S.threshold + (event.key === 'ArrowUp' ? 100 : -100));
    } else if (event.key === 'Enter' || event.key === ' ') {
      toggleAnimation();
    } else {
      used = false;
    }
    if (used) event.preventDefault();
    return;
  }
  if (cible === n.threshold) {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') setThreshold(S.threshold - STEP);
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') setThreshold(S.threshold + STEP);
    else used = false;
    if (used) event.preventDefault();
  }
}

/* ---------- Point d'entrée ---------- */

register('E079', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E079-01 / E079-02 — bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css('geography-v2-e079', CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  const layout = ctx.layout || ctx.stage;
  S.renders += 1;
  layout.setAttribute('data-' + P + '-render', String(S.renders));
  layout.setAttribute('data-' + P + '-threshold', String(S.threshold));

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  if (reduced()) { S.playing = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.panel.addEventListener('keydown', onKey);
    n.radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) changeRegion(radio.value);
      });
    });
    n.classButtons.forEach((button) => {
      button.addEventListener('click', () => toggleClass(button.dataset[P + 'Class']));
    });
    n.threshold.addEventListener('input', () => setThreshold(n.threshold.value));
    n.anim.addEventListener('click', toggleAnimation);
    n.reset.addEventListener('click', () => {
      S.region = 'all';
      S.classes = new Set(CLASSES.map((c) => c.id));
      S.threshold = MIN_THRESHOLD;
      S.sweep = 0;
      S.playing = false;
      S.debriefOpen = false;
      stopLoop();
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOpen = !S.debriefOpen;
      syncControls();
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reduced()) startLoop();
});
