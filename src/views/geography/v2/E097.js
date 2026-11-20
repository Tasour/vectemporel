import { register } from './registry.js';

/* Lentille E097 (V2) — vue GEOGRAPHIE.
 * Thème : codes ISO 3166-1 des pays — alpha-2, alpha-3 et code numérique.
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E097-01 … E097-10. Aucun stub, aucune fonction vide, aucun fichier partagé
 * modifié (passe 1, registry.js, index.js et geography.js intacts).
 *
 * Contrat : un seul appel d'enregistrement avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique injectée sous l'identifiant `geography-v2-e097`.
 * Tous les identifiants sont préfixés `geography-v2-e097-`.
 *
 * Zéro sortie de débogage, zéro appel réseau, zéro tirage aléatoire,
 * zéro HTML injecté, zéro minuteur.
 * Au plus une requête d'animation en vol, suspendue quand le document est
 * masqué, hors écran ou en mouvement réduit. Tout le savoir est du texte DOM
 * sémantique lisible sans script ; le canvas n'est qu'un laboratoire qui
 * illustre des grandeurs déjà écrites en toutes lettres.
 *
 * Nouveautés V2 par rapport à la passe 1 : role="radiogroup" explicite, état
 * mémorisé dans `S` avec gardes d'écouteurs entre rendus, `ctx.reducedMotion()`
 * relu à chaque tick, IntersectionObserver suspendant le balayage hors écran,
 * cibles ≥ 36 px (boutons 44 px, radios 24 px), défi falsifiable en cinq temps
 * avec débrief révélé par aria-expanded, et une seule région live (le readout).
 */

const P = 'geography-v2-e097';

/* Identifiants, tous préfixés geography-v2-e097-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const FACTS_ID = P + '-facts';
const TABLE_ID = P + '-table';
const FORMAT_ID = P + '-format';
const SEARCH_ID = P + '-search';
const SEARCH_OUT_ID = P + '-search-result';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const STATUS_ID = P + '-status';
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

/* Constantes du laboratoire. */
const COLS = 8;
const SWEEP_MS = 6000;
const TOTAL_ASSIGNED = 249;
const FORMATS = ['alpha2', 'alpha3', 'num'];

/* Formatage français déterministe, sans Intl ni aléa. */
const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* E097-02 : référentiel ISO 3166-1 canonique (aucune valeur inventée).
   Les zéros initiaux sont conservés sous forme de chaînes. */
const PAYS = [
  ['France', 'FR', 'FRA', '250'], ['Allemagne', 'DE', 'DEU', '276'], ['États-Unis', 'US', 'USA', '840'],
  ['Royaume-Uni', 'GB', 'GBR', '826'], ['Canada', 'CA', 'CAN', '124'], ['Japon', 'JP', 'JPN', '392'],
  ['Chine', 'CN', 'CHN', '156'], ['Inde', 'IN', 'IND', '356'], ['Brésil', 'BR', 'BRA', '076'],
  ['Australie', 'AU', 'AUS', '036'], ['Italie', 'IT', 'ITA', '380'], ['Espagne', 'ES', 'ESP', '724'],
  ['Mexique', 'MX', 'MEX', '484'], ['Afrique du Sud', 'ZA', 'ZAF', '710'], ['Égypte', 'EG', 'EGY', '818'],
  ['Nigeria', 'NG', 'NGA', '566'], ['Kenya', 'KE', 'KEN', '404'], ['Maroc', 'MA', 'MAR', '504'],
  ['Suisse', 'CH', 'CHE', '756'], ['Belgique', 'BE', 'BEL', '056'], ['Pays-Bas', 'NL', 'NLD', '528'],
  ['Portugal', 'PT', 'PRT', '620'], ['Suède', 'SE', 'SWE', '752'], ['Norvège', 'NO', 'NOR', '578'],
  ['Danemark', 'DK', 'DNK', '208'], ['Finlande', 'FI', 'FIN', '246'], ['Pologne', 'PL', 'POL', '616'],
  ['Russie', 'RU', 'RUS', '643'], ['Turquie', 'TR', 'TUR', '792'], ['Ukraine', 'UA', 'UKR', '804'],
  ['Argentine', 'AR', 'ARG', '032'], ['Chili', 'CL', 'CHL', '152'], ['Colombie', 'CO', 'COL', '170'],
  ['Pérou', 'PE', 'PER', '604'], ['Corée du Sud', 'KR', 'KOR', '410'], ['Indonésie', 'ID', 'IDN', '360'],
  ['Thaïlande', 'TH', 'THA', '764'], ['Viet Nam', 'VN', 'VNM', '704'], ['Pakistan', 'PK', 'PAK', '586'],
  ['Bangladesh', 'BD', 'BGD', '050'], ['Arabie saoudite', 'SA', 'SAU', '682'], ['Israël', 'IL', 'ISR', '376'],
  ['Nouvelle-Zélande', 'NZ', 'NZL', '554'], ['Singapour', 'SG', 'SGP', '702'], ['Malaisie', 'MY', 'MYS', '458'],
  ['Philippines', 'PH', 'PHL', '608'], ['Grèce', 'GR', 'GRC', '300'], ['Autriche', 'AT', 'AUT', '040'],
  ['Irlande', 'IE', 'IRL', '372'], ['Tchéquie', 'CZ', 'CZE', '203'], ['Hongrie', 'HU', 'HUN', '348'],
  ['Roumanie', 'RO', 'ROU', '642'], ['Serbie', 'RS', 'SRB', '688'], ['Croatie', 'HR', 'HRV', '191'],
  ['Slovaquie', 'SK', 'SVK', '703'], ['Bulgarie', 'BG', 'BGR', '100'], ['Islande', 'IS', 'ISL', '352'],
  ['Luxembourg', 'LU', 'LUX', '442']
];

const LEGENDES = {
  alpha2: 'alpha-2 : deux lettres majuscules. Deux barres sous le code.',
  alpha3: 'alpha-3 : trois lettres majuscules. Trois barres sous le code.',
  num: 'Code numérique : trois chiffres indépendants de l’alphabet. Un carré pointillé. Le format est aussi donné par la marque sous le code, jamais par la seule couleur.',
};

/* État de module : survit au remplacement du stage par la coque. */
const S = {
  format: 'alpha2',
  index: 0,
  query: '',
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

/* ---------- Formules et recherches déterministes (E097-06, E097-07) ---------- */
function normalise(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function codeDu(p, f) {
  return f === 'alpha3' ? p[2] : f === 'num' ? p[3] : p[1];
}

function cherche(q) {
  const nq = normalise(q).trim();
  if (!nq) return -1;
  for (let i = 0; i < PAYS.length; i += 1) {
    const p = PAYS[i];
    if (p[1] === nq || p[2] === nq || p[3] === nq || normalise(p[0]) === nq) return i;
  }
  for (let i = 0; i < PAYS.length; i += 1) {
    if (normalise(PAYS[i][0]).indexOf(nq) >= 0) return i;
  }
  return -1;
}

/* E097-07 : chaque grandeur est dérivée d'une définition, jamais saisie à la main. */
function mesures() {
  const comb2 = 26 * 26;
  const comb3 = 26 * 26 * 26;
  return {
    total: TOTAL_ASSIGNED,
    comb2,
    comb3,
    occ2: (TOTAL_ASSIGNED / comb2) * 100,
    occ3: (TOTAL_ASSIGNED / comb3) * 100,
    dataset: PAYS.length,
  };
}

/* ---------- E097-01 : bloc CSS unique, préfixé, sans réseau ---------- */
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
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left}
#${TABLE_ID} thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${FORMAT_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${FORMAT_ID} legend{padding:0 4px;color:var(--muted)}
.${P}-choix{display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer}
.${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${SEARCH_ID}{width:100%;min-height:40px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.2);color:var(--ink);font:inherit;font-size:11px}
#${SEARCH_OUT_ID}{min-height:20px;margin:5px 0;color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
#${CANVAS_ID}{display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:none}
.${P}-legend{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${STATUS_ID}{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
#${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#${ACTIONS_ID} button,#${DEBRIEF_BTN_ID}{
  display:inline-block;width:auto;min-height:44px;padding:6px 12px;border:1px solid var(--line);
  border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;transition:border-color .18s,background-color .18s;
}
#${ACTIONS_ID} button:hover,#${DEBRIEF_BTN_ID}:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.${P}-map-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;background:rgba(8,12,18,.9);
  color:var(--gold-bright,#f4d69e);font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID} :focus-visible,#${CANVAS_ID}:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,.${P}-map-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-map-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:190px}
  .${P}-map-badge{max-width:86%}
}
`;

/* ---------- E097-01 : faits sémantiques, lisibles sans JS ---------- */
function buildFacts(ctx) {
  const wrap = ctx.el('div', P + '-facts');
  wrap.id = FACTS_ID;
  const faits = [
    'E097-01 · Définition : la norme ISO 3166-1 attribue à chaque pays ou territoire un nom, un code alpha-2 de deux lettres (FR), un code alpha-3 de trois lettres (FRA) et un code numérique de trois chiffres (250).',
    'E097-01 · Usages : le code alpha-2 sert surtout aux domaines Internet, aux plaques d’immatriculation et aux étiquettes ; le code alpha-3 est privilégié par les organisations internationales et les normes d’échange de données.',
    'E097-01 · Indépendance de l’alphabet : le code numérique reste lisible quand la langue ou l’écriture du document change. Les trois formats désignent la même entité et ne sont pas interchangeables.',
  ];
  faits.forEach((texte) => {
    const p = ctx.el('p', P + '-fait', texte);
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E097-03 : tableau d'extrait, texte réel lisible sans JS ---------- */
function buildTable(ctx) {
  const table = ctx.el('table');
  table.id = TABLE_ID;
  const caption = ctx.el('caption', '',
    'Extrait ISO 3166-1 : trois écritures d’un même pays, côte à côte. Référence : ' +
    fmtInt(TOTAL_ASSIGNED) + ' codes officiellement attribués ; ' + PAYS.length + ' pays dans cet extrait.');
  table.appendChild(caption);

  const thead = ctx.el('thead');
  const hr = ctx.el('tr');
  ['Pays', 'alpha-2', 'alpha-3', 'Numérique'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = ctx.el('tbody');
  [0, 1, 2, 3, 4, 5, 18, 19, 26, 27, 28, 30].forEach((i) => {
    const tr = ctx.el('tr');
    const p = PAYS[i];
    [p[0], p[1], p[2], p[3]].forEach((c, j) => {
      const cell = ctx.el(j === 0 ? 'th' : 'td', '', c);
      if (j === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E097-04 : sélecteur de format en radiogroup (choix unique) ---------- */
function buildFormatField(ctx) {
  const fieldset = ctx.el('fieldset');
  fieldset.id = FORMAT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  const legend = ctx.el('legend', '', 'Format de code affiché (choix unique)');
  fieldset.appendChild(legend);
  const radios = [];
  [['alpha2', 'alpha-2 (2 lettres)'], ['alpha3', 'alpha-3 (3 lettres)'], ['num', 'Numérique (3 chiffres)']].forEach(([v, l]) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = ctx.el('input');
    radio.type = 'radio';
    radio.name = P + '-format';
    radio.id = FORMAT_ID + '-' + v;
    radio.value = v;
    radio.checked = S.format === v;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(l));
    fieldset.appendChild(lab);
    radios.push(radio);
  });
  return { fieldset, radios };
}

/* ---------- E097-09 : badge textuel ancré sur la carte existante ---------- */
function addMapBadge(ctx) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MAP_BADGE_ID)) return;
  const host = ctx.layout || ctx.stage;
  const map = host && typeof host.querySelector === 'function'
    ? host.querySelector('.geo-map')
    : null;
  if (!map) return;
  if (typeof getComputedStyle === 'function' && getComputedStyle(map).position === 'static') {
    map.style.position = 'relative';
  }
  const badge = ctx.el('div', P + '-map-badge', '');
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
      radios: Array.from(existant.querySelectorAll('input[name="' + P + '-format"]')),
      search: document.getElementById(SEARCH_ID),
      searchOut: document.getElementById(SEARCH_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      legend: document.getElementById(LEGEND_ID),
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
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Codes ISO des pays — alpha-2, alpha-3 et numérique');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Un même pays possède plusieurs identifiants normalisés. Comparez alpha-2, alpha-3 et code numérique, cherchez un pays par nom ou par code, puis observez les trois formats dans un laboratoire déterministe — toutes les valeurs restent lisibles en texte.');
  lead.id = LEAD_ID;

  const subRef = ctx.el('h3', '', 'Référentiel et définitions');
  const subFmt = ctx.el('h3', '', 'Format affiché');
  const subSearch = ctx.el('h3', '', 'Rechercher un pays');
  const subLab = ctx.el('h3', '', 'Laboratoire — grille de codes');

  const format = buildFormatField(ctx);

  const searchRow = ctx.el('p');
  const searchLabel = ctx.el('label');
  searchLabel.setAttribute('for', SEARCH_ID);
  searchLabel.appendChild(document.createTextNode('Nom ou code ISO : '));
  const search = ctx.el('input');
  search.type = 'search';
  search.id = SEARCH_ID;
  search.value = S.query;
  search.setAttribute('aria-label', 'Rechercher un pays par nom ou par code ISO');
  searchRow.append(searchLabel, search);
  const searchOut = ctx.el('p', P + '-search-result');
  searchOut.id = SEARCH_OUT_ID;

  /* E097-05 — laboratoire canvas, redondant avec le texte. */
  const canvas = ctx.el('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Grille de codes ISO 3166-1. Chaque cellule porte le code dans le format choisi et une marque textuelle : deux barres pour alpha-2, trois pour alpha-3, carré pointillé pour le numérique. Flèches gauche et droite : changer de format ; flèches haut et bas : changer de pays ; Entrée : lancer ou arrêter le balayage.');
  const legend = ctx.el('p', P + '-legend', LEGENDES[S.format]);
  legend.id = LEGEND_ID;

  const status = ctx.el('p', P + '-status');
  status.id = STATUS_ID;

  /* E097-07 — unique région live. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const actions = ctx.el('div');
  actions.id = ACTIONS_ID;
  const anim = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  anim.setAttribute('aria-controls', READOUT_ID);
  const reset = ctx.el('button', '', 'Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;
  actions.append(anim, reset);

  const clavier = ctx.el('p', '',
    'E097-08 · Clavier : Tab atteint le radiogroup, le champ de recherche, les deux commandes puis le canevas. Sur le radiogroup, ← → parcourent les trois formats ; sur le canevas, ← → changent de format, ↑ ↓ changent de pays et Entrée lance ou arrête le balayage.');
  clavier.id = CLAVIER_ID;

  /* E097-10 — défi falsifiable en cinq temps, aligné sur l'angle mort. */
  const limite = ctx.el('p', '',
    'E097-10 · Limite et angle mort : la combinatoire décrit l’espace de noms disponible, pas l’usage réel des codes. Un code bien formé n’est pas nécessairement attribué, et un code attribué peut être réservé plutôt qu’utilisé. Les trois formats ne se valent pas selon le contexte : le numérique évite l’alphabet mais ne dit rien du pays, l’alpha-2 est court mais vite saturé.');
  limite.id = LIMITE_ID;

  const defi = ctx.el('p', '',
    'E097-10 · Défi en cinq temps : 1) prédire que l’espace alpha-2 (676 codes) est beaucoup plus saturé que l’espace alpha-3 (17 576 codes) ; 2) régler le format sur alpha-2 puis alpha-3 et observer les taux d’occupation ; 3) attendre un taux alpha-2 supérieur à 35 % et un taux alpha-3 inférieur à 2 % ; 4) falsifier si un pays affiché porte un code absent du référentiel ou si les deux taux se rapprochent ; 5) débrief : ouvrir le paragraphe ci-dessous pour lire pourquoi la combinatoire ne mesure pas l’usage.');
  defi.id = DEFI_ID;

  const debriefBtn = ctx.el('button', '', 'Révéler le débrief (angle mort)');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', S.debriefOpen ? 'true' : 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);

  const debrief = ctx.el('p', '',
    'Débrief : 676 et 17 576 comptent les chaînes possibles, pas les pays. La référence de 249 codes attribués est un plafond administratif, pas une mesure d’utilisation. Un taux d’occupation faible en alpha-3 ne garantit ni l’absence de collisions dans d’autres normes, ni la stabilité d’un code dans le temps — c’est la limite falsifiable de ce modèle.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = !S.debriefOpen;

  panel.append(
    title, lead, subRef, buildTable(ctx), buildFacts(ctx),
    subFmt, format.fieldset,
    subSearch, searchRow, searchOut,
    subLab, canvas, legend, status,
    readout, actions, clavier, limite, defi, debriefBtn, debrief,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: format.radios,
    search, searchOut, canvas, legend, status, readout,
    anim, reset, debrief, debriefBtn,
  };
}

/* ---------- E097-05 : laboratoire canvas (un seul canvas, dessin déterministe) ---------- */
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
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 10;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const rows = Math.ceil(PAYS.length / COLS);
  const cw = iw / COLS;
  const ch = ih / rows;
  const scan = Math.floor(S.sweep * COLS);

  for (let i = 0; i < PAYS.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = pad + col * cw;
    const y = pad + row * ch;
    const sel = i === S.index;
    const sc = col === scan;
    g.fillStyle = sel ? 'rgba(244,214,158,.16)' : (row % 2 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)');
    g.fillRect(x + 1, y + 1, cw - 2, ch - 2);
    g.strokeStyle = sel ? 'rgba(244,214,158,.95)' : (sc ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.14)');
    g.lineWidth = sel ? 2 : 1;
    if (g.setLineDash) g.setLineDash([]);
    g.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
    if (sel) { g.lineWidth = 1; g.strokeRect(x + 4, y + 4, cw - 8, ch - 8); }

    g.fillStyle = sel ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.92)';
    g.font = 'bold ' + Math.max(8, Math.min(13, Math.floor(cw / 3.2))) + 'px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(codeDu(PAYS[i], S.format), x + cw / 2, y + ch / 2 - 3);

    /* Marque de format non chromatique : deux barres, trois barres, carré pointillé. */
    const my = y + ch - 6;
    g.strokeStyle = 'rgba(244,214,158,.9)';
    g.lineWidth = 1;
    if (S.format === 'alpha2' || S.format === 'alpha3') {
      const n = S.format === 'alpha2' ? 2 : 3;
      for (let k = 0; k < n; k += 1) {
        g.beginPath();
        g.moveTo(x + cw / 2 - 6 + k * 5, my);
        g.lineTo(x + cw / 2 - 2 + k * 5, my);
        g.stroke();
      }
    } else {
      if (g.setLineDash) g.setLineDash([2, 2]);
      g.strokeRect(x + cw / 2 - 5, my - 3, 10, 6);
      if (g.setLineDash) g.setLineDash([]);
    }
  }

  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(S.format.toUpperCase() + ' — ' + PAYS[S.index][0], pad + 2, pad - 1);
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.fillText('Balayage : colonne ' + (scan + 1) + ' / ' + COLS, pad + 2, cssH - pad + 8);
}

/* ---------- E097-07 : grandeurs chiffrées comparées à une référence ---------- */
function writeReadout(origin) {
  const m = mesures();
  const n = S.nodes;
  if (n.status) {
    n.status.textContent = 'Choix actif (' + origin + ') : format ' + S.format +
      ' ; pays sélectionné ' + PAYS[S.index][1] + ' (' + PAYS[S.index][0] + ') ; ' +
      PAYS.length + ' pays dans l’extrait local.';
  }
  if (!n.readout) return;
  const strong = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.readout.textContent = '';
  n.readout.appendChild(document.createTextNode('ISO 3166-1 : '));
  n.readout.appendChild(strong(fmtInt(m.total)));
  n.readout.appendChild(document.createTextNode(' codes officiellement attribués (référence). Espace alpha-2 : 26 × 26 = '));
  n.readout.appendChild(strong(fmtInt(m.comb2)));
  n.readout.appendChild(document.createTextNode(' codes possibles, occupés à '));
  n.readout.appendChild(strong(fmt2(m.occ2) + ' %'));
  n.readout.appendChild(document.createTextNode(' ; espace alpha-3 : 26 × 26 × 26 = '));
  n.readout.appendChild(strong(fmtInt(m.comb3)));
  n.readout.appendChild(document.createTextNode(' codes possibles, occupés à '));
  n.readout.appendChild(strong(fmt2(m.occ3) + ' %'));
  n.readout.appendChild(document.createTextNode('. L’alpha-2 est donc environ '));
  n.readout.appendChild(strong(fmt2(m.occ2 / m.occ3) + ' fois'));
  n.readout.appendChild(document.createTextNode(' plus saturé que l’alpha-3 ; le code numérique, indépendant de l’alphabet, complète les deux codes de lettres.'));
}

/* ---------- E097-06 : recherche de pays (nom ou code) ---------- */
function writeSearchOut() {
  const n = S.nodes;
  if (!n || !n.searchOut) return;
  if (!S.query) { n.searchOut.textContent = 'Saisissez un nom de pays ou un code ISO.'; return; }
  const i = cherche(S.query);
  if (i < 0) { n.searchOut.textContent = 'Aucun pays trouvé pour « ' + S.query + ' ».'; return; }
  const p = PAYS[i];
  n.searchOut.textContent = 'Réponse : ' + p[0] + ' → ' + p[1] + ' / ' + p[2] + ' / ' + p[3];
}

function updateBadge() {
  const b = document.getElementById(MAP_BADGE_ID);
  if (!b) return;
  const p = PAYS[S.index];
  b.textContent = 'Norme ISO 3166-1 — ' + p[1] + ' / ' + p[2] + ' / ' + p[3] + ' (' + p[0] + ')';
}

/* ---------- Synchronisation ---------- */
function syncControls(origin) {
  const n = S.nodes;
  n.radios.forEach((radio) => { radio.checked = radio.value === S.format; });
  if (n.search && n.search.value !== S.query) n.search.value = S.query;
  if (n.legend) n.legend.textContent = LEGENDES[S.format];
  if (n.anim) {
    n.anim.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reduced() ? '1' : '0');
  if (n.debriefBtn) n.debriefBtn.setAttribute('aria-expanded', S.debriefOpen ? 'true' : 'false');
  if (n.debrief) n.debrief.hidden = !S.debriefOpen;
  writeSearchOut();
  writeReadout(origin || 'synthèse');
  updateBadge();
  drawLab();
}

/* ---------- E097-09 : unique boucle rAF, pause hors écran / masqué ---------- */
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
    if (S.playing && !isReduced) S.sweep = (S.sweep + dt / SWEEP_MS) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !isReduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E097-10 : mouvement réduit suivi en direct ---------- */
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
        syncControls('mouvement');
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function' || !canvas) return;
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.ioCanvas = canvas;
  S.onScreen = true;
  S.io = new IntersectionObserver((entries) => {
    const e = entries[0];
    S.onScreen = !e || e.isIntersecting;
    if (!S.onScreen) stopLoop();
    else if (S.playing && !reduced()) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
}

/* ---------- Changements d'état ---------- */
function changeFormat(v) {
  if (FORMATS.indexOf(v) < 0) return;
  S.format = v;
  syncControls('format');
}

function selectPays(i) {
  S.index = (i + PAYS.length) % PAYS.length;
  syncControls('pays');
}

function cycleFormat(step) {
  const k = FORMATS.indexOf(S.format);
  changeFormat(FORMATS[(k + step + FORMATS.length) % FORMATS.length]);
}

function toggleAnimation() {
  if (reduced()) { S.playing = false; stopLoop(); syncControls('animation'); return; }
  S.playing = !S.playing;
  if (!S.playing) stopLoop(); else startLoop();
  syncControls('animation');
}

function resetAll() {
  S.format = 'alpha2';
  S.index = 0;
  S.query = '';
  S.playing = false;
  S.sweep = 0;
  S.debriefOpen = false;
  stopLoop();
  syncControls('réinitialisation');
}

/* ---------- E097-08 : clavier (canevas), sans vol de focus ---------- */
function onKey(event) {
  const n = S.nodes;
  if (!n || event.target !== n.canvas) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  let used = true;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    cycleFormat(event.key === 'ArrowRight' ? 1 : -1);
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    selectPays(S.index + (event.key === 'ArrowDown' ? 1 : -1));
  } else if (event.key === 'Enter' || event.key === ' ') {
    toggleAnimation();
  } else {
    used = false;
  }
  if (used) event.preventDefault();
}

/* ---------- E097-10 : point d'entrée, garde-fous et idempotence ---------- */
register('E097', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geographyv2') return;

  /* Une seule feuille CSS, un seul enregistrement. */
  ctx.css(P, CSS);
  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  S.renders += 1;
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  ensureObserver(S.nodes.canvas);

  if (reduced()) { S.playing = false; stopLoop(); }
  syncControls('rendu');

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.panel.addEventListener('keydown', onKey);
    n.radios.forEach((radio) => {
      radio.addEventListener('change', () => { if (radio.checked) changeFormat(radio.value); });
    });
    n.search.addEventListener('input', () => {
      S.query = n.search.value;
      const i = cherche(S.query);
      if (i >= 0) S.index = i;
      syncControls('recherche');
    });
    n.anim.addEventListener('click', toggleAnimation);
    n.reset.addEventListener('click', resetAll);
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOpen = !S.debriefOpen;
      syncControls('débrief');
    });
  }

  installGlobalListeners();
  if (S.playing && !reduced()) startLoop();
});
