import { register } from './registry.js';
import { currentCountry, currentPlaces } from '../../domain/store.js';

/* Lentille E085 — vue GEOGRAPHIE.
 * Thème : points hors cadre et limites de la fenêtre.
 *
 * Dix chantiers E085-01 … E085-10, tous réellement implémentés (aucun stub),
 * décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E085.md. La lentille ajoute un
 * panneau pédagogique autonome consacré à la différence entre un point et la
 * fenêtre qui le contient : un lieu « hors cadre » n'est pas un lieu déplacé,
 * c'est un lieu dont les coordonnées tombent hors des limites de la fenêtre
 * affichée (le viewBox de la carte). Elle ne modifie ni la vue ni le store :
 * elle pose une couche locale par-dessus le DOM produit par geography.js.
 *
 * Le savoir est du texte sémantique réel (h2, h3, p, dl, ol, table) inséré
 * dans le DOM : il reste lisible même quand le laboratoire est à l'arrêt.
 * Le canvas n'est qu'un laboratoire déterministe : il projecte les lieux réels
 * du jeu de données (aucune coordonnée inventée) dans une fenêtre réglable.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() } (registry.js).
 */

const P = 'geography-e085';
const CSS_ID = P;

const PANEL_ID = `${P}-panel`;
const TITLE_ID = `${P}-title`;
const DEFS_ID = `${P}-defs`;
const FORM_ID = `${P}-formules`;
const GLOSSAIRE_ID = `${P}-glossaire`;
const TABLE_ID = `${P}-tableau`;
const LIMITE_ID = `${P}-limite`;
const CANVAS_ID = `${P}-canvas`;
const MARGE_ID = `${P}-marge`;
const MARGE_VAL_ID = `${P}-marge-val`;
const READOUT_ID = `${P}-readout`;
const RADIOS_ID = `${P}-scenarios`;
const LEGENDE_ID = `${P}-legende`;

/* Marge relative à l'emprise, en fraction de l'étendue (un côté par bout). */
const BORNE = { min: -0.6, max: 0.6 };
const MONDE = 0.7; /* rectangle dessiné : élargi de 70 % de part et d'autre. */

const SCENARIOS = [
  { key: 'serre', label: 'Fenêtre resserrée', marge: -0.3 },
  { key: 'strict', label: 'Cadre strict', marge: 0 },
  { key: 'large', label: 'Fenêtre élargie', marge: 0.3 },
];

const DEFINITIONS = [
  'Un point est dit « hors cadre » lorsque sa latitude ou sa longitude vérifiée tombe en dehors des limites de la fenêtre affichée. Le lieu lui-même n’a pas bougé : c’est la fenêtre qui est plus étroite que lui.',
  'Les limites de la fenêtre sont définies par le viewBox de la carte : un rectangle en coordonnées de projection. Le faire grandir ou rétrécir ne modifie aucune coordonnée de lieu, seulement quels lieux tombent à l’intérieur du rectangle.',
  'L’emprise est le rectangle de référence du pays (longitude et latitude minimales et maximales). La marge de fenêtre s’exprime en fraction de cette emprise : elle est nulle au cadre strict, négative quand on resserre, positive quand on élargit.',
];

const FORMULES = [
  'Fenêtre(b, m) : minLon′ = minLon − m·(maxLon − minLon)/2 ; maxLon′ = maxLon + m·(maxLon − minLon)/2 ; mêmes relations en latitude. À m = 0, la fenêtre coïncide exactement avec l’emprise.',
  'horsCadre(p, F) = (lat < minLat′) ou (lat > maxLat′) ou (lon < minLon′) ou (lon > maxLon′). Le prédicat porte sur la fenêtre F, pas sur le point p : changer F peut changer le résultat sans changer p.',
  'projection(p, F) : x = (lon − minLon′) / (maxLon′ − minLon′) × largeur ; y = (maxLat′ − lat) / (maxLat′ − minLat′) × hauteur. La projection est une transformation affine, sans tuile ni donnée externe.',
  'part hors cadre = nombre de lieux hors fenêtre / nombre total de lieux projetables. La référence 1,00 signifie « tous les lieux hors fenêtre » ; 0,00 « aucun lieu hors fenêtre ».',
];

const GLOSSAIRE = [
  ['Fenêtre (viewBox)', 'Rectangle de projection effectivement affiché à l’écran ; ses quatre bornes sont les limites de la fenêtre.'],
  ['Emprise', 'Rectangle de référence du pays, défini par ses latitudes et longitudes minimales et maximales dans le jeu de données.'],
  ['Point hors cadre', 'Lieu vérifié dont les coordonnées réelles tombent hors des limites de la fenêtre ; il est listé sans déplacement fictif.'],
  ['Marge de fenêtre', 'Décalage des limites de la fenêtre par rapport à l’emprise, exprimé en fraction de l’étendue : négatif = resserrement, positif = élargissement.'],
  ['Projection affine', 'Transformation linéaire des coordonnées lat/lon vers l’écran ; elle ne prétend pas être une carte fidèle du terrain.'],
];

const LIMITE = [
  'Prédiction — à marge −0,30, un lieu proche du bord de l’emprise (Marseille, 43,296346 / 5,369889) doit sortir de la fenêtre ; en revenant à marge 0, il doit rentrer sans que ses coordonnées changent.',
  'Réglage — déplacer le curseur de marge de −0,60 à +0,60, ou choisir un des trois scénarios de fenêtre, puis lire le compteur de lieux hors cadre et le canvas.',
  'Résultat attendu — le nombre de points creux et la part hors cadre diminuent quand la fenêtre s’élargit ; les points pleins et creux gardent exactement les mêmes positions relatives.',
  'Falsification — si les coordonnées affichées d’un lieu changent quand on bouge la marge, ou si le compte ne bouge jamais, alors le prédicat horsCadre() ou la projection est faux.',
  'Débrief — classer un lieu « hors cadre » décrit la fenêtre choisie, pas le lieu. Élargir la fenêtre rétablit la visibilité, pas les faits : la limite est un choix de cadrage, pas une frontière du territoire.',
];

/* État de module : survit au `stage.innerHTML = ''` de la coque.
 * Chantiers : E085-01 texte statique · E085-02 CSS/préfixe · E085-03 détection store ·
 * E085-04 canvas · E085-05 marge/scénarios · E085-06 tableau · E085-07 mesures ·
 * E085-08 accessibilité · E085-09 défi · E085-10 boucle/robustesse. */
const S = {
  marge: -0.3,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visible: true,
  visBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

const WIRED = new WeakSet();

const fmt = (n, d = 2) => {
  const f = Math.pow(10, d);
  return (Math.round(n * f) / f).toFixed(d).replace('.', ',');
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ---------- Données réelles, lues en lecture seule (E085-03) ---------- */

function donnees() {
  const country = currentCountry();
  const bounds = country && country.bounds ? country.bounds : null;
  const places = currentPlaces().filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  return { country, bounds, places };
}

function fenetre(bounds, marge) {
  if (!bounds) return null;
  const spanLon = bounds.maxLon - bounds.minLon;
  const spanLat = bounds.maxLat - bounds.minLat;
  if (!Number.isFinite(spanLon) || !Number.isFinite(spanLat) || spanLon <= 0 || spanLat <= 0) return null;
  return {
    minLon: bounds.minLon - marge * spanLon / 2,
    maxLon: bounds.maxLon + marge * spanLon / 2,
    minLat: bounds.minLat - marge * spanLat / 2,
    maxLat: bounds.maxLat + marge * spanLat / 2,
    spanLon,
    spanLat,
  };
}

function horsCadre(point, fen) {
  if (!point || !fen) return false;
  return point.lat < fen.minLat || point.lat > fen.maxLat
    || point.lon < fen.minLon || point.lon > fen.maxLon;
}

function project(point, fen, width, height) {
  if (!point || !fen) return null;
  return {
    x: ((point.lon - fen.minLon) / fen.spanLon) * width,
    y: ((fen.maxLat - point.lat) / fen.spanLat) * height,
  };
}

function monde(bounds) {
  return fenetre(bounds, MONDE * 2);
}

function mesures(marge) {
  const d = donnees();
  const fen = fenetre(d.bounds, marge);
  const places = d.places;
  const dehors = places.filter((p) => horsCadre(p, fen));
  const total = places.length;
  return {
    country: d.country,
    bounds: d.bounds,
    fen,
    places,
    dehors,
    total,
    part: total ? dehors.length / total : 0,
    margeDegLon: fen ? fen.maxLon - d.bounds.maxLon : 0,
    margeDegLat: fen ? fen.maxLat - d.bounds.maxLat : 0,
  };
}

/* ---------- Feuille de style unique (E085-02) ---------- */

const CSS = `
#${PANEL_ID}[hidden]{display:none!important}
#${PANEL_ID}{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-lede{color:var(--muted)}
#${PANEL_ID} .${P}-formule{padding-left:10px;border-left:2px solid var(--gold,#e6b96f);font-variant-numeric:tabular-nums}
#${PANEL_ID} dl{margin:6px 0;padding:0}
#${PANEL_ID} dt{margin-top:7px;color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} dd{margin:2px 0 0;padding-left:10px;border-left:2px solid var(--gold,#e6b96f)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 6px;text-align:left;font-variant-numeric:tabular-nums}
#${TABLE_ID} thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${LIMITE_ID}{margin:6px 0;padding-left:22px}
#${LIMITE_ID} li{margin:4px 0}
#${CANVAS_ID}{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(8,12,18,.72);touch-action:none;
}
#${CANVAS_ID}:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-cmd{margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px;background:rgba(230,185,111,.05)}
.${P}-cmd-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:4px 0}
.${P}-cmd label{color:var(--muted)}
#${MARGE_ID}{flex:1;min-width:160px;min-height:28px;accent-color:var(--gold,#e6b96f)}
.${P}-scenario{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:2px 8px;border:1px solid var(--line);border-radius:8px;cursor:pointer}
.${P}-scenario input{min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${MARGE_VAL_ID}{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums;min-width:9ch}
#${READOUT_ID}{
  min-height:38px;margin-top:8px;padding:7px 9px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${LEGENDE_ID}{margin:4px 0;color:var(--muted);font-size:10px}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} *{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:210px}
}
`;

/* ---------- Contenu statique, lisible sans laboratoire (E085-01, E085-06, E085-09) ---------- */

function paragraphe(classe, texte) {
  const n = document.createElement('p');
  if (classe) n.className = classe;
  n.textContent = texte;
  return n;
}

function construireGlossaire() {
  const dl = document.createElement('dl');
  dl.id = GLOSSAIRE_ID;
  GLOSSAIRE.forEach(([terme, definition]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = definition;
    dl.append(dt, dd);
  });
  return dl;
}

function construireTableau() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Comparaison des trois fenêtres, recalculée par la même fonction horsCadre() que le laboratoire (référence : part 1,00 = tous les lieux hors fenêtre).';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Fenêtre', 'Marge', 'Lieux hors fenêtre', 'Part'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  SCENARIOS.forEach((sc) => {
    const tr = document.createElement('tr');
    tr.dataset.scenario = sc.key;
    ['—', '—', '—', '—'].forEach((t) => {
      const td = document.createElement('td');
      td.textContent = t;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function construireLimite() {
  const ol = document.createElement('ol');
  ol.id = LIMITE_ID;
  LIMITE.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  return ol;
}

/* E085-05 et E085-08 : curseur de marge, scénarios radio, canvas focusable. */
function construireCommandes() {
  const cmd = document.createElement('div');
  cmd.className = `${P}-cmd`;

  const rowMarge = document.createElement('div');
  rowMarge.className = `${P}-cmd-row`;
  const label = document.createElement('label');
  label.htmlFor = MARGE_ID;
  label.textContent = 'Marge de la fenêtre';
  const range = document.createElement('input');
  range.type = 'range';
  range.id = MARGE_ID;
  range.min = String(BORNE.min * 100);
  range.max = String(BORNE.max * 100);
  range.step = '5';
  range.value = String(S.marge * 100);
  const val = document.createElement('span');
  val.id = MARGE_VAL_ID;
  rowMarge.append(label, range, val);

  const rowScen = document.createElement('div');
  rowScen.className = `${P}-cmd-row`;
  rowScen.setAttribute('role', 'radiogroup');
  rowScen.id = RADIOS_ID;
  rowScen.setAttribute('aria-label', 'Scénario de fenêtre (choix unique)');
  SCENARIOS.forEach((sc) => {
    const wrap = document.createElement('label');
    wrap.className = `${P}-scenario`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${P}-scenario`;
    radio.value = sc.key;
    radio.dataset.marge = String(sc.marge);
    radio.checked = Math.abs(S.marge - sc.marge) < 0.001;
    wrap.append(radio, document.createTextNode(sc.label));
    rowScen.appendChild(wrap);
  });

  cmd.append(rowMarge, rowScen);
  return cmd;
}

function construirePanel() {
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = document.createElement('h2');
  titre.id = TITLE_ID;
  titre.textContent = 'Points hors cadre et limites de la fenêtre';

  const lede = paragraphe(
    `${P}-lede`,
    'Un lieu hors cadre n’est pas un lieu égaré : ce sont les limites de la fenêtre qui l’excluent. Faites varier la marge et observez que les points restent immobiles tandis que le rectangle de la fenêtre change.',
  );
  const hDef = document.createElement('h3');
  hDef.textContent = 'Définitions';
  const hForm = document.createElement('h3');
  hForm.textContent = 'Formules du laboratoire';
  const hGlossaire = document.createElement('h3');
  hGlossaire.textContent = 'Glossaire';
  const hTable = document.createElement('h3');
  hTable.textContent = 'Les trois fenêtres en chiffres';
  const hLimite = document.createElement('h3');
  hLimite.textContent = 'Limite et angle mort — défi en cinq temps';

  const defs = document.createElement('div');
  defs.id = DEFS_ID;
  DEFINITIONS.forEach((t) => defs.appendChild(paragraphe('', t)));

  const form = document.createElement('div');
  form.id = FORM_ID;
  FORMULES.forEach((t) => form.appendChild(paragraphe(`${P}-formule`, t)));

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'Laboratoire : fenêtre de projection réglable et lieux réels du jeu de données. Flèche gauche ou droite : resserrer ou élargir la fenêtre ; Début : cadre strict ; touches 1, 2, 3 : fenêtre resserrée, stricte ou élargie.',
  );

  const legende = paragraphe('', '');
  legende.id = LEGENDE_ID;
  legende.textContent = 'Lecture du canvas : point plein = dans la fenêtre ; point creux = hors fenêtre (limite matérialisée par le rectangle doré). Les positions ne changent jamais avec la marge.';

  const commandes = construireCommandes();

  const readout = paragraphe('', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  panel.append(
    titre, lede,
    hDef, defs,
    hForm, form,
    hGlossaire, construireGlossaire(),
    hTable, construireTableau(),
    hLimite, construireLimite(),
    hTexteCanvas(), canvas, legende, commandes, readout,
  );
  return panel;
}

function hTexteCanvas() {
  const h = document.createElement('h3');
  h.textContent = 'Laboratoire — la fenêtre se déplace, pas les points';
  return h;
}

function hostCible(ctx) {
  const layout = ctx.layout || ctx.stage;
  const panel = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.geo-panel') : null;
  return panel || layout || ctx.stage;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      canvas: document.getElementById(CANVAS_ID),
      range: document.getElementById(MARGE_ID),
      val: document.getElementById(MARGE_VAL_ID),
      readout: document.getElementById(READOUT_ID),
      table: document.getElementById(TABLE_ID),
      group: document.getElementById(RADIOS_ID),
    };
  }
  const panel = construirePanel();
  const host = hostCible(ctx);
  if (host && typeof host.insertBefore === 'function') host.insertBefore(panel, host.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);
  return {
    panel,
    fresh: true,
    canvas: document.getElementById(CANVAS_ID),
    range: document.getElementById(MARGE_ID),
    val: document.getElementById(MARGE_VAL_ID),
    readout: document.getElementById(READOUT_ID),
    table: document.getElementById(TABLE_ID),
    group: document.getElementById(RADIOS_ID),
  };
}

/* ---------- Mises à jour du texte et du tableau (E085-06, E085-07, E085-05) ---------- */

function majReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = mesures(S.marge);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const sens = S.marge < 0 ? 'resserrée' : S.marge > 0 ? 'élargie' : 'stricte';
  n.textContent = '';
  n.append(
    document.createTextNode('Fenêtre '),
    fort(sens),
    document.createTextNode(' — marge '),
    fort(fmt(S.marge)),
    document.createTextNode(' de l’emprise, soit '),
    fort(`${fmt(Math.abs(m.margeDegLon))}°`),
    document.createTextNode(' de longitude : '),
    fort(String(m.dehors.length)),
    document.createTextNode(' lieu(x) hors fenêtre sur '),
    fort(String(m.total)),
    document.createTextNode(' projetables, part '),
    fort(fmt(m.part)),
    document.createTextNode(' (référence 1,00 = tous hors fenêtre). Les coordonnées des lieux ne varient pas avec la marge.'),
  );
  const val = S.nodes.val;
  if (val) val.textContent = `marge ${fmt(S.marge)}`;
}

function majTable() {
  const table = S.nodes.table;
  if (!table || !table.tBodies.length) return;
  const tbody = table.tBodies[0];
  Array.from(tbody.rows).forEach((tr) => {
    const sc = SCENARIOS.find((s) => s.key === tr.dataset.scenario);
    if (!sc) return;
    const m = mesures(sc.marge);
    const cells = tr.cells;
    if (cells.length < 4) return;
    cells[0].textContent = sc.label;
    cells[1].textContent = fmt(sc.marge);
    cells[2].textContent = `${m.dehors.length} / ${m.total}`;
    cells[3].textContent = fmt(m.part);
  });
}

function majScenarios() {
  const group = S.nodes.group;
  if (!group) return;
  Array.from(group.querySelectorAll('input[type="radio"]')).forEach((radio) => {
    radio.checked = Math.abs(Number(radio.dataset.marge) - S.marge) < 0.001;
  });
}

function appliquerMarge(v) {
  S.marge = clamp(v, BORNE.min, BORNE.max);
  if (S.nodes.range) S.nodes.range.value = String(Math.round(S.marge * 100));
  majScenarios();
  majReadout();
  draw();
}

/* ---------- Laboratoire canvas (E085-04, un seul canvas, une seule passe) ---------- */

function resizeCanvas() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return null;
  const largeur = Math.max(240, cv.clientWidth || 480);
  const hauteur = Math.max(180, cv.clientHeight || 250);
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const w = Math.round(largeur * dpr);
  const h = Math.round(hauteur * dpr);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const g = cv.getContext('2d');
  if (!g) return null;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, largeur, hauteur };
}

function draw() {
  const surf = resizeCanvas();
  if (!surf) return;
  const { g, largeur, hauteur } = surf;
  const m = mesures(S.marge);
  const fen = m.fen;
  const bounds = m.bounds;
  g.clearRect(0, 0, largeur, hauteur);
  if (!fen || !bounds) {
    g.fillStyle = '#d7d1c6';
    g.font = '12px sans-serif';
    g.fillText('Emprise indisponible : le laboratoire reste vide, le texte ci-dessus demeure lisible.', 12, 24);
    return;
  }

  const pad = 22;
  const W = largeur - pad * 2;
  const H = hauteur - pad * 2 - 14;
  const world = monde(bounds);
  const sx = (lon) => pad + ((lon - world.minLon) / world.spanLon) * W;
  const sy = (lat) => pad + ((world.maxLat - lat) / world.spanLat) * H;

  /* Monde dessiné : limite extérieure fixe (référence visuelle). */
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(215,209,198,.30)';
  g.strokeRect(sx(world.minLon), sy(world.maxLat), W, H);

  /* Emprise du pays : pointillés gris, référence non mobile. */
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(215,209,198,.55)';
  g.strokeRect(
    sx(bounds.minLon), sy(bounds.maxLat),
    sx(bounds.maxLon) - sx(bounds.minLon), sy(bounds.minLat) - sy(bounds.maxLat),
  );
  g.setLineDash([]);

  /* Fenêtre active : rectangle doré, ses bords sont les limites de la fenêtre. */
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fillRect(sx(fen.minLon), sy(fen.maxLat), sx(fen.maxLon) - sx(fen.minLon), sy(fen.minLat) - sy(fen.maxLat));
  g.lineWidth = 2;
  g.strokeStyle = '#e6b96f';
  g.strokeRect(sx(fen.minLon), sy(fen.maxLat), sx(fen.maxLon) - sx(fen.minLon), sy(fen.minLat) - sy(fen.maxLat));

  /* Lieux réels : le point ne bouge jamais ; seul son appartenance change. */
  const pulsation = 0.5 + 0.5 * Math.sin(S.phase * Math.PI * 2);
  m.places.forEach((place) => {
    const x = sx(place.lon);
    const y = sy(place.lat);
    if (horsCadre(place, fen)) {
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fillStyle = `rgba(8,12,18,${0.7 + 0.25 * pulsation})`;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = `rgba(244,214,158,${0.55 + 0.45 * pulsation})`;
      g.stroke();
      g.beginPath();
      g.moveTo(x - 2.5, y - 2.5);
      g.lineTo(x + 2.5, y + 2.5);
      g.moveTo(x + 2.5, y - 2.5);
      g.lineTo(x - 2.5, y + 2.5);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(x, y, 4.5, 0, Math.PI * 2);
      g.fillStyle = '#f4d69e';
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(8,12,18,.85)';
      g.stroke();
    }
  });

  g.fillStyle = '#d7d1c6';
  g.font = '11px sans-serif';
  g.fillText(
    `Cadre ${S.marge === 0 ? 'strict' : S.marge < 0 ? 'resserré' : 'élargi'} · marge ${fmt(S.marge)} · hors fenêtre ${m.dehors.length}/${m.total}`,
    12, hauteur - 8,
  );
}

/* ---------- Boucle rAF unique, pause et mouvement réduit (E085-10) ---------- */

function arreterBoucle() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function demarrerBoucle() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || !S.visible) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || !S.visible) return;
  if (S.lastTs) {
    const dt = Math.min(64, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.00045) % 1;
  }
  S.lastTs = ts;
  draw();
  S.rafId = requestAnimationFrame(tick);
}

function installerGlobal(ctx) {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) arreterBoucle();
      else demarrerBoucle();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset[`${P}Reduced`] = S.reduced ? '1' : '0';
        if (S.reduced) { S.phase = 0; draw(); }
        if (S.reduced) arreterBoucle(); else demarrerBoucle();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

function installerObservateur() {
  if (typeof IntersectionObserver !== 'function' || S.observer) return;
  const cv = S.nodes.canvas;
  if (!cv) return;
  S.observer = new IntersectionObserver((entries) => {
    S.visible = entries.length ? entries[0].isIntersecting : true;
    if (S.visible) demarrerBoucle(); else arreterBoucle();
  }, { threshold: 0.05 });
  S.observer.observe(cv);
}

/* ---------- Contrôles (E085-08) ---------- */

function lierUneFois(node, type, fn) {
  if (!node || WIRED.has(node)) return;
  WIRED.add(node);
  node.addEventListener(type, fn);
}

function installerControles() {
  const n = S.nodes;
  lierUneFois(n.range, 'input', () => appliquerMarge(Number(n.range.value) / 100));
  const group = n.group;
  if (group && !WIRED.has(group)) {
    WIRED.add(group);
    group.addEventListener('change', (e) => {
      const radio = e.target instanceof Element ? e.target.closest('input[type="radio"]') : null;
      if (radio && radio.dataset.marge !== undefined) appliquerMarge(Number(radio.dataset.marge));
    });
  }
  const cv = n.canvas;
  if (cv && !WIRED.has(cv)) {
    WIRED.add(cv);
    cv.addEventListener('keydown', (event) => {
      let pas = 0;
      if (event.key === 'ArrowRight') pas = 0.05;
      else if (event.key === 'ArrowLeft') pas = -0.05;
      else if (event.key === 'Home') { appliquerMarge(0); event.preventDefault(); return; }
      else if (event.key === 'End') { appliquerMarge(BORNE.min); event.preventDefault(); return; }
      else if (event.key === '1') { appliquerMarge(SCENARIOS[0].marge); event.preventDefault(); return; }
      else if (event.key === '2') { appliquerMarge(SCENARIOS[1].marge); event.preventDefault(); return; }
      else if (event.key === '3') { appliquerMarge(SCENARIOS[2].marge); event.preventDefault(); return; }
      else return;
      appliquerMarge(S.marge + pas);
      event.preventDefault();
    });
  }
  if (typeof window !== 'undefined') {
    lierUneFois(window, 'resize', () => { draw(); });
  }
}

/* ---------- Point d'entrée ---------- */

register('E085', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  S.nodes = ensurePanel(ctx);
  const { panel, canvas } = S.nodes;
  if (!panel || !canvas) return;

  panel.dataset[`${P}Reduced`] = S.reduced ? '1' : '0';
  majTable();
  majReadout();
  majScenarios();

  installerControles();
  installerGlobal(ctx);
  installerObservateur();

  draw();
  if (S.reduced) { S.phase = 0; arreterBoucle(); } else demarrerBoucle();
});
