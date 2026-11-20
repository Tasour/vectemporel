import { register } from './registry.js';

/*
 * Lentille E062 — SECONDE PASSE (V2) : légende interactive et bascule de couches.
 *
 * Les dix chantiers (E062-01 … E062-10) sont réellement implémentés ci-dessous.
 * V2 ajoute à la passe 1 : un badge de statut schématique, un tableau de mesures
 * recalculées à chaque changement, une fiche de vérité à trois faits sourcés,
 * un radiogroup de scénarios (choix unique), un défi falsifiable en cinq temps,
 * une boucle rAF unique suspendue sur document.hidden, hors champ
 * (IntersectionObserver) et en mouvement réduit, et un bouton de remise à zéro.
 * Tout le contenu pédagogique est du texte sémantique indexable (h2/h3/p/ol/li/
 * table/caption/th/td/fieldset/legend/label) présent dans le DOM : le canvas
 * n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e062-` (aucune collision avec la passe 1).
 * Zéro sortie de débogage, zéro réseau, zéro tirage aléatoire, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e062';

const ID = {
  panel: 'geography-v2-e062-panel',
  title: 'geography-v2-e062-title',
  lead: 'geography-v2-e062-lead',
  facts: 'geography-v2-e062-facts',
  refTable: 'geography-v2-e062-reference',
  measures: 'geography-v2-e062-measures',
  scenario: 'geography-v2-e062-scenario',
  legend: 'geography-v2-e062-legend',
  tout: 'geography-v2-e062-tout',
  rien: 'geography-v2-e062-rien',
  ref: 'geography-v2-e062-ref',
  reset: 'geography-v2-e062-reset',
  opacity: 'geography-v2-e062-opacity',
  opacityValue: 'geography-v2-e062-opacity-value',
  canvas: 'geography-v2-e062-canvas',
  canvasDesc: 'geography-v2-e062-canvas-desc',
  order: 'geography-v2-e062-order',
  soloNote: 'geography-v2-e062-solo-note',
  readout: 'geography-v2-e062-readout',
  play: 'geography-v2-e062-play',
  defi: 'geography-v2-e062-defi',
  badge: 'geography-v2-e062-badge',
};

/* Référentiel des cinq couches. Le poids est une complexité visuelle
   conventionnelle, servant uniquement au calcul de densité comparée. */
const LAYERS = [
  { id: 'relief', nom: 'Relief', code: 'Hachures diagonales', glyphe: '╱╱╱', poids: 3, graine: 101 },
  { id: 'hydro', nom: 'Hydrographie', code: 'Tirets ondulés', glyphe: '– – –', poids: 2, graine: 211 },
  { id: 'routes', nom: 'Routes', code: 'Pointillés réguliers', glyphe: '· · ·', poids: 2, graine: 307 },
  { id: 'villes', nom: 'Villes', code: 'Carrés à croix', glyphe: '■', poids: 1, graine: 401 },
  { id: 'limites', nom: 'Limites', code: 'Trait plein épais + gradins', glyphe: '━ ┃', poids: 2, graine: 509 },
];
const BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
const REF_IDS = ['relief', 'hydro', 'villes'];
const REF_WEIGHT = REF_IDS.reduce((s, id) => s + BY_ID[id].poids, 0);
const ORDRE_INITIAL = ['relief', 'hydro', 'routes', 'villes', 'limites'];

/* E062-04 : scénarios de démonstration, choix unique (radiogroup natif).
   Le scénario « libre » ne modifie rien : il étiquette l'état personnalisé. */
const SCENARIOS = {
  reference: {
    titre: 'Vue de référence (Relief + Hydrographie + Villes)',
    visible: { relief: true, hydro: true, routes: false, villes: true, limites: false },
  },
  dense: {
    titre: 'Vue dense (les cinq couches)',
    visible: { relief: true, hydro: true, routes: true, villes: true, limites: true },
  },
  minimal: {
    titre: 'Vue minimale (Villes + Limites)',
    visible: { relief: false, hydro: false, routes: false, villes: true, limites: true },
  },
  libre: {
    titre: 'Personnalisé (réglage manuel des cases)',
    visible: null,
  },
};
const SCENARIO_ORDER = ['reference', 'dense', 'minimal', 'libre'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  visible: Object.assign({}, SCENARIOS.reference.visible),
  order: ORDRE_INITIAL.slice(),
  solo: null,
  opacity: 100,
  active: 'relief',
  scenario: 'reference',
  playing: true,
  reduced: false,
  inView: true,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  listenersInstalled: false,
  bound: false,
  nodes: {},
};

/* ---------- Outils déterministes ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* Hachage entier pur : même résultat à chaque rendu, sans graine tirée au hasard. */
function hash01(seed, i) {
  let x = (seed ^ Math.imul(i + 1, 2654435761)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function estAffiche(id) {
  return S.solo ? S.solo === id : !!S.visible[id];
}

function visibles() {
  return S.order.filter(estAffiche);
}

function poidsVisible() {
  return visibles().reduce((s, id) => s + BY_ID[id].poids, 0);
}

function densite() {
  return REF_WEIGHT ? poidsVisible() / REF_WEIGHT : 0;
}

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

/* ---------- E062-01…10 : feuille de style unique ---------- */

const CSS = `
#geography-v2-e062-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e062-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e062-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e062-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e062-panel fieldset{margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e062-panel legend{padding:0 5px;color:var(--muted)}
.geography-v2-e062-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e062-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
.geography-v2-e062-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
.geography-v2-e062-table th,.geography-v2-e062-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e062-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
.geography-v2-e062-choix{
  display:flex;align-items:center;gap:7px;min-height:36px;padding:3px 5px;cursor:pointer;
}
.geography-v2-e062-choix input{width:18px;height:18px;min-width:18px;accent-color:var(--gold,#e6b96f)}
.geography-v2-e062-ligne{
  display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-height:38px;
  padding:3px 4px;border-bottom:1px dashed var(--line);
}
.geography-v2-e062-ligne:last-child{border-bottom:0}
.geography-v2-e062-ligne[data-actif="1"]{background:rgba(230,185,111,.10);border-radius:5px}
.geography-v2-e062-legend-item{
  display:flex;align-items:center;gap:5px;flex:1 1 190px;min-width:0;cursor:pointer;
}
.geography-v2-e062-legend-item input{
  width:18px;height:18px;min-width:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e062-swatch{
  display:inline-block;min-width:40px;padding:0 3px;border:1px solid var(--line);
  border-radius:4px;font-family:monospace;font-size:10px;white-space:nowrap;
  color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums;
}
.geography-v2-e062-nom{min-width:78px;font-weight:600}
.geography-v2-e062-code{color:var(--muted);font-size:10px}
.geography-v2-e062-etat{font-size:10px;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e062-ligne button{
  min-width:36px;min-height:36px;padding:4px 7px;border:1px solid var(--line);
  border-radius:7px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;
}
.geography-v2-e062-ligne button:hover:not(:disabled){
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e062-ligne button:disabled{opacity:.4;cursor:not-allowed}
.geography-v2-e062-ligne button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.20);
}
.geography-v2-e062-btn{
  min-height:44px;padding:6px 12px;margin:3px 4px 3px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;
}
#geography-v2-e062-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e062-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-v2-e062-opacity{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e062-opacity-value{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-v2-e062-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-v2-e062-readout,#geography-v2-e062-order,#geography-v2-e062-solo-note{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e062-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e062-defi{margin:6px 0;padding-left:20px}
.geography-v2-e062-defi li{margin:4px 0}
.geography-v2-e062-defi strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e062-badge{
  position:absolute;left:8px;bottom:8px;max-width:62%;padding:5px 8px;
  border:1px solid var(--line);border-radius:6px;background:rgba(8,12,18,.78);
  color:var(--ink-soft,#d7d1c6);font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-v2-e062-panel[data-reduit="1"] .geography-v2-e062-swatch,
#geography-v2-e062-panel[data-reduit="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e062-panel button,#geography-v2-e062-panel .geography-v2-e062-swatch{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  #geography-v2-e062-panel{font-size:10px;padding:9px}
  #geography-v2-e062-canvas{height:190px}
  .geography-v2-e062-ligne{gap:3px}
  .geography-v2-e062-nom{min-width:68px}
  .geography-v2-e062-badge{max-width:86%;font-size:9px}
}
`;

/* ---------- E062-03 : fiche de vérité à trois faits sourcés ---------- */

function buildFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Fait 1 — Une couche thématique est un thème indépendant (Relief, Hydrographie, Routes, '
      + 'Villes, Limites) que l’on affiche ou masque sans modifier les autres. Une légende active '
      + 'décrit les variables visuelles — trait, hachure, pointillé, symbole — qui les distinguent.',
    'Fait 2 — Bertin, dans « Sémiologie graphique » (1967), distingue sept variables visuelles : '
      + 'position, taille, valeur, teinte, orientation, forme et texture. Cette légende en mobilise '
      + 'au moins quatre (orientation, forme, valeur, texture) : chaque thème reste reconnaissable '
      + 'par la forme de son trait, indépendamment de la couleur.',
    'Fait 3 — La vue de référence affiche 3 couches sur 5 (Relief, Hydrographie, Villes) pour un '
      + 'poids de 6 : sa densité vaut 1,00× par définition. Isoler les Villes (poids 1 sur 6) la '
      + 'ramène à 0,17× ; le chiffre est recalculé, jamais choisi à l’avance.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e062-fait', texte));
  });
  return wrap;
}

/* ---------- E062-02 : tableau de référence statique ---------- */

function buildRefTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e062-table');
  table.id = ID.refTable;
  table.appendChild(ctx.el('caption', '',
    'Référentiel des cinq couches. La vue de base affiche Relief, Hydrographie et Villes, '
    + 'soit un poids de 6 et une densité de référence de 1,00×.'));
  const thead = ctx.el('thead', '');
  const hr = ctx.el('tr', '');
  ['Couche', 'Variable visuelle', 'Poids', 'Visibilité initiale'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = ctx.el('tbody', '');
  LAYERS.forEach((l) => {
    const tr = ctx.el('tr', '');
    const th = ctx.el('th', '', l.nom);
    th.scope = 'row';
    tr.appendChild(th);
    [l.code, String(l.poids), S.visible[l.id] ? 'Affichée' : 'Masquée'].forEach((v) => {
      tr.appendChild(ctx.el('td', '', v));
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E062-02 : tableau de mesures recalculées ---------- */

const MESURE_LIGNES = [
  { key: 'nb', nom: 'Couches affichées', repere: '3 sur 5' },
  { key: 'poids', nom: 'Poids visuel', repere: '6' },
  { key: 'densite', nom: 'Densité visuelle', repere: '1,00×' },
  { key: 'opacite', nom: 'Opacité des couches', repere: '100 %' },
  { key: 'dessus', nom: 'Couche au-dessus', repere: 'Villes' },
];

function buildMeasuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e062-table');
  table.id = ID.measures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées à chaque changement de la légende ; la colonne « Repère » donne la vue de référence.'));
  const thead = ctx.el('thead', '');
  const hr = ctx.el('tr', '');
  ['Grandeur', 'Valeur courante', 'Repère'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = ctx.el('tbody', '');
  MESURE_LIGNES.forEach((m) => {
    const tr = ctx.el('tr', '');
    const th = ctx.el('th', '', m.nom);
    th.scope = 'row';
    const value = ctx.el('td', '', '—');
    value.id = `geography-v2-e062-mesure-${m.key}`;
    tr.append(th, value, ctx.el('td', '', m.repere));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E062-04 : radiogroup de scénarios (choix unique) ---------- */

function buildScenarios(ctx) {
  const fieldset = ctx.el('fieldset', '');
  fieldset.id = ID.scenario;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Scénario de démonstration, choix unique');
  fieldset.appendChild(ctx.el('legend', '', 'Scénario de démonstration (choix unique)'));
  SCENARIO_ORDER.forEach((key) => {
    const lab = ctx.el('label', 'geography-v2-e062-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e062-scen';
    radio.id = `geography-v2-e062-scen-${key}`;
    radio.value = key;
    radio.checked = S.scenario === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(SCENARIOS[key].titre));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

/* ---------- E062-03 / 07 / 08 / 09 : légende interactive ---------- */

function buildLegend(ctx) {
  const fieldset = ctx.el('fieldset', '');
  fieldset.id = ID.legend;
  fieldset.appendChild(ctx.el('legend', '',
    'Légende interactive — cochez une couche pour l’afficher, décochez pour la masquer'));

  LAYERS.forEach((l) => {
    const row = ctx.el('div', 'geography-v2-e062-ligne');
    row.dataset.layer = l.id;

    const label = ctx.el('label', 'geography-v2-e062-legend-item');
    label.setAttribute('for', `geography-v2-e062-cb-${l.id}`);

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `geography-v2-e062-cb-${l.id}`;
    cb.checked = !!S.visible[l.id];
    cb.value = l.id;

    const swatch = ctx.el('span', 'geography-v2-e062-swatch', l.glyphe);
    swatch.setAttribute('aria-hidden', 'true');
    const nom = ctx.el('span', 'geography-v2-e062-nom', l.nom);
    const code = ctx.el('span', 'geography-v2-e062-code', l.code);
    const etat = ctx.el('span', 'geography-v2-e062-etat', '');
    etat.id = `geography-v2-e062-etat-${l.id}`;
    label.append(cb, swatch, nom, code, etat);

    const up = ctx.el('button', '', '▲');
    up.type = 'button';
    up.id = `geography-v2-e062-up-${l.id}`;
    up.setAttribute('aria-label', `Monter la couche ${l.nom} dans l’ordre de superposition`);

    const down = ctx.el('button', '', '▼');
    down.type = 'button';
    down.id = `geography-v2-e062-down-${l.id}`;
    down.setAttribute('aria-label', `Descendre la couche ${l.nom} dans l’ordre de superposition`);

    const solo = ctx.el('button', '', 'Isoler');
    solo.type = 'button';
    solo.id = `geography-v2-e062-solo-${l.id}`;
    solo.setAttribute('aria-label', `Isoler la couche ${l.nom}, ou quitter l’isolation`);
    solo.setAttribute('aria-pressed', 'false');

    row.append(label, up, down, solo);
    fieldset.appendChild(row);
  });
  return fieldset;
}

/* ---------- E062-04 / 08 : commandes globales et opacité ---------- */

function buildGlobalControls(ctx) {
  const wrap = ctx.el('div', '');
  const defs = [
    { id: ID.tout, txt: 'Tout afficher' },
    { id: ID.rien, txt: 'Tout masquer' },
    { id: ID.ref, txt: 'Vue de référence' },
    { id: ID.reset, txt: '↺ Remise à zéro' },
  ];
  defs.forEach((d) => {
    const b = ctx.el('button', 'geography-v2-e062-btn', d.txt);
    b.type = 'button';
    b.id = d.id;
    wrap.appendChild(b);
  });
  return wrap;
}

function buildOpacity(ctx) {
  const wrap = ctx.el('div', '');
  const label = document.createElement('label');
  label.setAttribute('for', ID.opacity);
  label.appendChild(document.createTextNode('Opacité des couches : '));
  const out = ctx.el('span', '', '');
  out.id = ID.opacityValue;
  label.appendChild(out);
  const range = document.createElement('input');
  range.type = 'range';
  range.id = ID.opacity;
  range.min = '20';
  range.max = '100';
  range.step = '10';
  range.value = String(S.opacity);
  range.setAttribute('aria-label', 'Opacité des couches, de 20 à 100 pour cent');
  wrap.append(label, range);
  return wrap;
}

/* ---------- E062-10 : défi falsifiable en cinq temps ---------- */

const DEFI = [
  { tag: 'Prédiction', txt: 'Isoler la couche Villes (poids 1 sur 6) doit faire tomber la densité visuelle à 0,17× la référence.' },
  { tag: 'Réglage', txt: 'Cliquez sur « Isoler » de la ligne Villes, sans toucher aux autres cases.' },
  { tag: 'Résultat attendu', txt: 'Le bandeau et le tableau affichent 1 couche sur 5, un poids de 1 sur 6 et une densité de 0,17×.' },
  { tag: 'Falsification', txt: 'Si la densité reste à 1,00×, si le poids reste à 6 ou si les autres couches restent dessinées, l’isolation est contredite.' },
  { tag: 'Débrief', txt: 'L’isolation ne détruit pas les cases à cocher : elle masque temporairement les quatre autres couches. Un second clic sur « Isoler » ou sur « Vue de référence » restaure l’état initial.' },
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e062-defi');
  list.id = ID.defi;
  DEFI.forEach((d) => {
    const li = ctx.el('li', '');
    li.appendChild(ctx.el('strong', '', `${d.tag} — `));
    li.appendChild(document.createTextNode(d.txt));
    list.appendChild(li);
  });
  return list;
}

/* ---------- Construction du panneau et collecte des nœuds ---------- */

function collect(ctx) {
  const panel = document.getElementById(ID.panel);
  const n = { panel: panel && panel.isConnected && withinContext(panel, ctx) ? panel : null };
  if (!n.panel) return n;
  n.canvas = document.getElementById(ID.canvas);
  n.readout = document.getElementById(ID.readout);
  n.order = document.getElementById(ID.order);
  n.soloNote = document.getElementById(ID.soloNote);
  n.opacity = document.getElementById(ID.opacity);
  n.opacityOut = document.getElementById(ID.opacityValue);
  n.play = document.getElementById(ID.play);
  n.tout = document.getElementById(ID.tout);
  n.rien = document.getElementById(ID.rien);
  n.ref = document.getElementById(ID.ref);
  n.reset = document.getElementById(ID.reset);
  n.radios = SCENARIO_ORDER.map((k) => document.getElementById(`geography-v2-e062-scen-${k}`));
  n.mesures = {};
  MESURE_LIGNES.forEach((m) => {
    n.mesures[m.key] = document.getElementById(`geography-v2-e062-mesure-${m.key}`);
  });
  n.cb = {}; n.etat = {}; n.up = {}; n.down = {}; n.solo = {}; n.row = {};
  LAYERS.forEach((l) => {
    n.cb[l.id] = document.getElementById(`geography-v2-e062-cb-${l.id}`);
    n.etat[l.id] = document.getElementById(`geography-v2-e062-etat-${l.id}`);
    n.up[l.id] = document.getElementById(`geography-v2-e062-up-${l.id}`);
    n.down[l.id] = document.getElementById(`geography-v2-e062-down-${l.id}`);
    n.solo[l.id] = document.getElementById(`geography-v2-e062-solo-${l.id}`);
    n.row[l.id] = n.panel.querySelector(`[data-layer="${l.id}"]`);
  });
  return n;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(ID.panel);
  if (!existant || !existant.isConnected || !withinContext(existant, ctx)) {
    const panel = ctx.el('section', 'geography-v2-e062-panel');
    panel.id = ID.panel;
    panel.setAttribute('aria-labelledby', ID.title);

    const title = ctx.el('h2', '', 'Légende interactive et bascule de couches — laboratoire V2');
    title.id = ID.title;
    const lead = ctx.el('p', '',
      'Une carte thématique se lit couche par couche. La légende ci-dessous n’est pas décorative : '
      + 'chaque case commande réellement le dessin, l’ordre des lignes commande l’ordre de '
      + 'superposition, et les grandeurs sont recalculées à chaque geste. Le canvas ne fait '
      + 'qu’illustrer : tout est aussi écrit en texte dans le bandeau et le tableau.');
    lead.id = ID.lead;

    const canvas = document.createElement('canvas');
    canvas.id = ID.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label',
      'Carte schématique à cinq couches. Flèches gauche et droite : changer la couche mise en '
      + 'évidence. Début et Fin : première et dernière couche. Entrée : isoler ou quitter '
      + 'l’isolation. Le détail est aussi donné en texte dans le bandeau de lecture.');
    const canvasDesc = ctx.el('p', '',
      'Lecture clavier du laboratoire : flèches gauche et droite pour parcourir les couches, '
      + 'Début et Fin pour aller aux extrémités, Entrée pour isoler la couche courante. '
      + 'Les mêmes informations sont écrites dans le bandeau « role=status » et dans le tableau de mesures.');
    canvasDesc.id = ID.canvasDesc;

    const order = ctx.el('p', '', '');
    order.id = ID.order;
    const soloNote = ctx.el('p', '', '');
    soloNote.id = ID.soloNote;
    const readout = ctx.el('p', '', 'Chargement des mesures…');
    readout.id = ID.readout;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');

    const play = ctx.el('button', 'geography-v2-e062-btn', '▶ Animer la mise en évidence');
    play.type = 'button';
    play.id = ID.play;
    play.setAttribute('aria-pressed', 'false');

    const note = ctx.el('p', '',
      'Laboratoire déterministe : aucune donnée géographique mesurée n’est chargée, aucun tirage '
      + 'aléatoire n’intervient et aucune information n’est portée par la seule couleur. Les textes '
      + 'ci-dessus restent lisibles et indexables sans animation ; la carte d’origine reste '
      + 'utilisable sans ce panneau.');

    panel.append(title, lead,
      ctx.el('h3', '', 'Fiche de vérité : trois faits sourcés'), buildFacts(ctx),
      ctx.el('h3', '', 'Couches de référence'), buildRefTable(ctx),
      ctx.el('h3', '', 'Mesures vérifiables du modèle'), buildMeasuresTable(ctx),
      ctx.el('h3', '', 'Scénario de démonstration'), buildScenarios(ctx),
      ctx.el('h3', '', 'Afficher, masquer, réordonner, isoler'), buildLegend(ctx),
      buildGlobalControls(ctx), buildOpacity(ctx),
      ctx.el('h3', '', 'Laboratoire : la carte reconstruite'), canvas, canvasDesc,
      order, soloNote, readout, play,
      ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même'), buildDefi(ctx), note);

    const host = ctx.layout || ctx.stage;
    const aside = host && typeof host.querySelector === 'function'
      ? (host.querySelector('.geo-panel') || host)
      : ctx.stage;
    aside.insertBefore(panel, aside.firstChild);
  }
  return collect(ctx);
}

/* ---------- E062-01 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('.geo-map') : null;
  if (!map || typeof map.querySelector !== 'function') return;
  if (map.querySelector(`#${ID.badge}`)) return;
  if (typeof map.style !== 'undefined' && getComputedStyle(map).position === 'static') {
    map.style.position = 'relative';
  }
  const badge = ctx.el('div', 'geography-v2-e062-badge',
    'Couches thématiques : schémas déterministes (hachures, tirets, pointillés, carrés, gradins), '
    + 'sans fond de carte réel chargé.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E062-05 : dessin déterministe des couches ---------- */

function drawBase(g, w, h, pad) {
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  g.strokeStyle = 'rgba(214,207,193,.10)';
  for (let k = 1; k < 6; k += 1) {
    const x = pad + ((w - pad * 2) * k) / 6;
    const y = pad + ((h - pad * 2) * k) / 6;
    g.beginPath();
    g.moveTo(x, pad); g.lineTo(x, h - pad);
    g.moveTo(pad, y); g.lineTo(w - pad, y);
    g.stroke();
  }
}

function drawRelief(g, w, h, pad, graine) {
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.4;
  g.setLineDash([]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let i = 0; i < 6; i += 1) {
    const cx = pad + 30 + hash01(graine, i) * (iw - 60);
    const cy = pad + 26 + hash01(graine + 1, i) * (ih - 52);
    const r = 10 + hash01(graine + 2, i) * 13;
    for (let j = 0; j < 3; j += 1) {
      g.beginPath();
      g.arc(cx, cy, r - j * 3.2, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(cx - r, cy + 2); g.lineTo(cx + r, cy + 2);
    g.stroke();
  }
}

function drawHydro(g, w, h, pad, graine) {
  g.strokeStyle = 'rgba(214,207,193,.85)';
  g.lineWidth = 1.4;
  if (g.setLineDash) g.setLineDash([6, 4]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let k = 0; k < 3; k += 1) {
    const base = pad + ih * (0.25 + k * 0.25);
    const phase = hash01(graine, k) * 6.28;
    g.beginPath();
    for (let step = 0; step <= 40; step += 1) {
      const t = step / 40;
      const x = pad + t * iw;
      const y = base + Math.sin(t * 9 + phase) * 7;
      if (step === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);
}

function drawRoutes(g, w, h, pad) {
  g.strokeStyle = 'rgba(244,214,158,.8)';
  g.lineWidth = 1.6;
  if (g.setLineDash) g.setLineDash([2, 4]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let k = 0; k < 2; k += 1) {
    const x0 = pad + iw * (0.18 + k * 0.36);
    const y0 = pad + ih * (0.10 + k * 0.18);
    g.beginPath();
    g.moveTo(x0, pad + ih * 0.92);
    g.lineTo(x0 + iw * 0.06, pad + ih * 0.55);
    g.lineTo(x0 + iw * 0.02, y0);
    g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);
}

function drawVilles(g, w, h, pad, graine) {
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let i = 0; i < 8; i += 1) {
    const x = pad + 24 + hash01(graine, i) * (iw - 48);
    const y = pad + 20 + hash01(graine + 1, i) * (ih - 40);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillRect(x - 3, y - 3, 6, 6);
    g.strokeStyle = 'rgba(8,12,18,.9)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x + 6, y);
    g.moveTo(x, y - 6); g.lineTo(x, y + 6);
    g.stroke();
  }
}

function drawLimites(g, w, h, pad) {
  g.strokeStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 2.5;
  g.setLineDash([]);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  for (let k = 0; k < 2; k += 1) {
    const x = pad + iw * (0.4 + k * 0.28);
    g.beginPath();
    g.moveTo(x, pad + 4);
    g.lineTo(x + (k ? -8 : 6), pad + ih * 0.5);
    g.lineTo(x + (k ? 4 : -4), pad + ih - 4);
    g.stroke();
    for (let t = 1; t < 7; t += 1) {
      const y = pad + (ih * t) / 7;
      g.beginPath();
      g.moveTo(x - 4, y); g.lineTo(x + 4, y);
      g.stroke();
    }
  }
}

const DRAWERS = {
  relief: drawRelief, hydro: drawHydro, routes: drawRoutes,
  villes: drawVilles, limites: drawLimites,
};

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
  const pad = 16;
  drawBase(g, cssW, cssH, pad);

  /* L'ordre de la pile est respecté : le dernier dessiné est au-dessus. */
  S.order.forEach((id) => {
    if (!estAffiche(id)) return;
    g.save();
    g.globalAlpha = S.opacity / 100;
    DRAWERS[id](g, cssW, cssH, pad, BY_ID[id].graine);
    g.restore();
  });

  /* Mise en évidence : cadre en pointillés + libellé, jamais la couleur seule. */
  const pulse = S.reduced ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(S.phase));
  g.save();
  g.globalAlpha = pulse;
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.setLineDash([6, 4]);
  g.strokeRect(pad - 5, pad - 5, cssW - (pad - 5) * 2, cssH - (pad - 5) * 2);
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`Mise en évidence : ${BY_ID[S.active].nom} — ${estAffiche(S.active) ? 'affichée' : 'masquée'}`, pad + 2, pad + 13);
  g.restore();
}

/* ---------- E062-06 : readout chiffré et tableau de mesures ---------- */

function updateReadout() {
  const n = S.nodes;
  if (!n || !n.readout) return;
  const ids = visibles();
  const poids = poidsVisible();
  const d = densite();
  const fort = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    return s;
  };
  const p = n.readout;
  p.textContent = '';
  p.appendChild(document.createTextNode('Couches affichées : '));
  p.appendChild(fort(`${ids.length} sur ${LAYERS.length}`));
  p.appendChild(document.createTextNode(' (référence : '));
  p.appendChild(fort(String(REF_IDS.length)));
  p.appendChild(document.createTextNode('). Densité visuelle : '));
  p.appendChild(fort(`${fmt(d)}×`));
  p.appendChild(document.createTextNode(' la vue de référence, soit un poids de '));
  p.appendChild(fort(`${poids} sur ${REF_WEIGHT}`));
  p.appendChild(document.createTextNode('. Opacité : '));
  p.appendChild(fort(`${S.opacity} %`));
  p.appendChild(document.createTextNode('. Couche mise en évidence : '));
  p.appendChild(fort(BY_ID[S.active].nom));
  p.appendChild(document.createTextNode('. '));
  p.appendChild(document.createTextNode(S.solo
    ? `Isolation active : ${BY_ID[S.solo].nom} ; les quatre autres couches sont temporairement masquées.`
    : 'Aucune isolation : la bascule de chaque couche est indépendante.'));

  if (n.order) {
    n.order.textContent = 'Ordre de superposition (du fond vers le dessus) : '
      + S.order.map((id) => `${BY_ID[id].nom} (${estAffiche(id) ? 'affichée' : 'masquée'})`).join(' → ') + '.';
  }
  if (n.soloNote) {
    n.soloNote.textContent = S.solo
      ? `Isolation : ${BY_ID[S.solo].nom} uniquement. La vue de référence reste disponible par le bouton dédié.`
      : 'Isolation : aucune. Utilisez « Isoler » sur une ligne pour n’afficher que cette couche.';
  }

  const mesures = {
    nb: `${ids.length} sur ${LAYERS.length}`,
    poids: String(poids),
    densite: `${fmt(d)}×`,
    opacite: `${S.opacity} %`,
    dessus: BY_ID[S.order[S.order.length - 1]].nom,
  };
  MESURE_LIGNES.forEach((m) => {
    if (n.mesures[m.key]) n.mesures[m.key].textContent = mesures[m.key];
  });

  for (let i = 0; i < LAYERS.length; i += 1) {
    const id = LAYERS[i].id;
    if (n.cb[id]) n.cb[id].checked = !!S.visible[id];
    if (n.etat[id]) n.etat[id].textContent = estAffiche(id) ? 'affiché' : 'masqué';
    if (n.solo[id]) n.solo[id].setAttribute('aria-pressed', S.solo === id ? 'true' : 'false');
    if (n.row[id]) n.row[id].dataset.actif = S.active === id ? '1' : '0';
    const pos = S.order.indexOf(id);
    if (n.up[id]) n.up[id].disabled = pos <= 0;
    if (n.down[id]) n.down[id].disabled = pos >= S.order.length - 1;
  }
  if (n.radios) n.radios.forEach((r) => {
    if (r) r.checked = r.value === S.scenario;
  });
  if (n.opacityOut) n.opacityOut.textContent = `${S.opacity} %`;
  if (n.opacity) n.opacity.value = String(S.opacity);
  if (n.panel) n.panel.dataset.reduit = S.reduced ? '1' : '0';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la mise en évidence animée' : '▶ Animer la mise en évidence';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  drawLab();
}

/* ---------- E062-07 / 08 : actions sur la pile et scénarios ---------- */

function deplacer(id, pas) {
  const i = S.order.indexOf(id);
  const j = i + pas;
  if (i < 0 || j < 0 || j >= S.order.length) return;
  const tmp = S.order[i];
  S.order[i] = S.order[j];
  S.order[j] = tmp;
  updateReadout();
}

function applyScenario(key) {
  const cfg = SCENARIOS[key];
  if (!cfg) return;
  S.scenario = key;
  if (cfg.visible) {
    LAYERS.forEach((l) => { S.visible[l.id] = !!cfg.visible[l.id]; });
    S.solo = null;
    S.order = ORDRE_INITIAL.slice();
    S.opacity = 100;
    S.active = S.order.find((id) => estAffiche(id)) || ORDRE_INITIAL[0];
  }
  updateReadout();
}

function toutAfficher() {
  LAYERS.forEach((l) => { S.visible[l.id] = true; });
  S.solo = null;
  S.scenario = 'libre';
  updateReadout();
}

function toutMasquer() {
  LAYERS.forEach((l) => { S.visible[l.id] = false; });
  S.solo = null;
  S.scenario = 'libre';
  updateReadout();
}

function remiseAZero() {
  LAYERS.forEach((l) => { S.visible[l.id] = !!SCENARIOS.reference.visible[l.id]; });
  S.solo = null;
  S.order = ORDRE_INITIAL.slice();
  S.opacity = 100;
  S.active = 'relief';
  S.scenario = 'reference';
  S.phase = 0;
  updateReadout();
}

/* ---------- E062-10 : boucle rAF unique, pauses multiples ---------- */

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
    S.phase = (S.phase + dt * 0.004) % (Math.PI * 2);
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l'écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) stopLoop(); else startLoop();
        updateReadout();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- E062-09 : synchronisation légende / canvas / clavier ---------- */

function wirePanel() {
  const n = S.nodes;
  if (S.bound || !n.panel) return;
  S.bound = true;

  LAYERS.forEach((l) => {
    const cb = n.cb[l.id];
    if (cb) cb.addEventListener('change', () => {
      if (S.solo === l.id) S.solo = null;
      S.visible[l.id] = cb.checked;
      S.active = l.id;
      S.scenario = 'libre';
      updateReadout();
    });
    if (n.up[l.id]) n.up[l.id].addEventListener('click', () => deplacer(l.id, -1));
    if (n.down[l.id]) n.down[l.id].addEventListener('click', () => deplacer(l.id, 1));
    if (n.solo[l.id]) n.solo[l.id].addEventListener('click', () => {
      S.solo = S.solo === l.id ? null : l.id;
      S.active = l.id;
      updateReadout();
    });
    if (n.row[l.id]) {
      n.row[l.id].addEventListener('mouseenter', () => { S.active = l.id; updateReadout(); });
      n.row[l.id].addEventListener('focusin', () => { S.active = l.id; updateReadout(); });
    }
  });

  if (n.radios) n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      applyScenario(radio.value);
    });
  });

  if (n.tout) n.tout.addEventListener('click', toutAfficher);
  if (n.rien) n.rien.addEventListener('click', toutMasquer);
  if (n.ref) n.ref.addEventListener('click', () => applyScenario('reference'));
  if (n.reset) n.reset.addEventListener('click', remiseAZero);
  if (n.opacity) n.opacity.addEventListener('input', () => {
    S.opacity = Math.max(20, Math.min(100, Math.round(Number(n.opacity.value) / 10) * 10));
    S.scenario = 'libre';
    updateReadout();
  });
  if (n.play) n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    updateReadout();
  });
  if (n.canvas) n.canvas.addEventListener('keydown', (event) => {
    const liste = visibles().length ? visibles() : S.order;
    const i = liste.indexOf(S.active);
    let used = true;
    if (event.key === 'ArrowRight') S.active = liste[(i + 1 + liste.length) % liste.length];
    else if (event.key === 'ArrowLeft') S.active = liste[(i - 1 + liste.length) % liste.length];
    else if (event.key === 'Home') S.active = liste[0];
    else if (event.key === 'End') S.active = liste[liste.length - 1];
    else if (event.key === 'Enter') S.solo = S.solo === S.active ? null : S.active;
    else used = false;
    if (used) {
      event.preventDefault();
      updateReadout();
    }
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E062', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  if (S.nodes.panel) S.nodes.panel.dataset.reduit = S.reduced ? '1' : '0';
  updateReadout();
  wirePanel();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
