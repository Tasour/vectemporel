import { register } from './registry.js';

/*
 * Lentille E061 — SECONDE PASSE (V2) : typographie et hiérarchie visuelle.
 *
 * Les dix chantiers (E061-01 … E061-10) sont réellement implémentés ci-dessous.
 * V2 ajoute à la passe 1 : un badge de statut explicite sur la carte, un
 * tableau de mesures recalculées à chaque changement, une fiche de vérité à
 * trois faits sourcés, un défi falsifiable en cinq temps aligné sur le modèle
 * courant, une boucle rAF unique suspendue à la fois sur document.hidden,
 * hors champ (IntersectionObserver) et en mouvement réduit, et un bouton de
 * remise à zéro. Tout le contenu pédagogique est du texte sémantique
 * indexable (h2/h3/p/ol/li/table/caption/th/td) présent dans le DOM ; le
 * canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e061-` (aucune collision avec la passe 1 `geography-e061-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e061';

const ID = {
  panel: 'geography-v2-e061-panel',
  title: 'geography-v2-e061-title',
  lead: 'geography-v2-e061-lead',
  facts: 'geography-v2-e061-facts',
  formules: 'geography-v2-e061-formules',
  echelle: 'geography-v2-e061-echelle',
  interligne: 'geography-v2-e061-interligne',
  poids: 'geography-v2-e061-poids',
  base: 'geography-v2-e061-base',
  baseValue: 'geography-v2-e061-base-value',
  mesure: 'geography-v2-e061-mesure',
  mesureValue: 'geography-v2-e061-mesure-value',
  tracking: 'geography-v2-e061-tracking',
  trackingValue: 'geography-v2-e061-tracking-value',
  canvas: 'geography-v2-e061-canvas',
  canvasDesc: 'geography-v2-e061-canvas-desc',
  legend: 'geography-v2-e061-legend',
  help: 'geography-v2-e061-help',
  table: 'geography-v2-e061-table',
  mesuresTitle: 'geography-v2-e061-mesures-title',
  mesures: 'geography-v2-e061-mesures',
  defiTitle: 'geography-v2-e061-defi-title',
  defi: 'geography-v2-e061-defi',
  readout: 'geography-v2-e061-readout',
  zoom: 'geography-v2-e061-zoom',
  play: 'geography-v2-e061-play',
  reset: 'geography-v2-e061-reset',
  note: 'geography-v2-e061-note',
  badge: 'geography-v2-e061-badge',
};

/* Échelles modulaires : le facteur est appliqué à chaque pas de niveau.
   Le cas « voisinage » (1,1) est un contre-exemple falsifiable : son pas de
   10 % reste sous le seuil perceptif de 20 %. */
const ECHELLES = {
  voisin: { label: 'Voisinage (×1,1) — trop faible', ratio: 1.1 },
  tierce: { label: 'Tierce majeure (×1,25)', ratio: 1.25 },
  quarte: { label: 'Quarte parfaite (×1,333)', ratio: 4 / 3 },
  quinte: { label: 'Quinte parfaite (×1,5)', ratio: 1.5 },
};
const ECHELLE_ORDER = ['voisin', 'tierce', 'quarte', 'quinte'];

const INTERLIGNES = {
  '1.3': { label: 'Serré (1,3)', valeur: 1.3 },
  '1.5': { label: 'Courant (1,5)', valeur: 1.5 },
  '1.7': { label: 'Aéré (1,7)', valeur: 1.7 },
};
const INTERLIGNE_ORDER = ['1.3', '1.5', '1.7'];

const POIDS = {
  '400': { label: 'Normal (400)', valeur: 400 },
  '700': { label: 'Gras (700)', valeur: 700 },
};
const POIDS_ORDER = ['400', '700'];

/* Seuils pédagogiques (valeurs de référence explicites, jamais devinées). */
const SEUIL_PAS = 0.20;          /* écart relatif minimal entre deux niveaux */
const MESURE_MIN = 45;           /* caractères par ligne, borne basse */
const MESURE_MAX = 75;           /* caractères par ligne, borne haute */
const MESURE_CIBLE = 66;         /* mesure idéale couramment citée */
const CAR_LARGEUR_EM = 0.5;      /* largeur moyenne d'un caractère, en em */
const LEADING_MIN = 1.4;         /* interlignage conseillé, borne basse */
const LEADING_MAX = 1.6;         /* interlignage conseillé, borne haute */
const ZOOM_WCAG = 2;             /* WCAG 1.4.4 : texte lisible à 200 % */

/* E061-10 : défi falsifiable en cinq temps, un par échelle (texte réel). */
const DEFI = {
  voisin: {
    prediction: 'Un ratio de 1,1 donne un pas de 10 %, sous le seuil perceptif de 20 % : les niveaux vont se confondre.',
    reglage: 'Choisissez l’échelle « Voisinage (×1,1) » et laissez la taille de base à 16 px.',
    attendu: 'Titres à 16 / 17,6 / 19,4 / 21,3 px, pas de 10 %, verdict « trop faible » dans le bandeau et le tableau.',
    falsification: 'Si le verdict restait « distinct » avec un pas de 10 %, le seuil de 20 % annoncé serait contredit.',
    debrief: 'Un écart de 10 % entre niveaux est trop discret : la hiérarchie ne se voit plus, seul le texte la révèle.',
  },
  tierce: {
    prediction: 'Un ratio de 1,25 (tierce majeure) donne un pas de 25 %, au-dessus du seuil : la hiérarchie devient distincte.',
    reglage: 'Choisissez « Tierce majeure (×1,25) », base 16 px.',
    attendu: 'Titres à 16 / 20 / 25 / 31,25 px, pas de 25 %, verdict « distinct ».',
    falsification: 'Si le verdict passait « trop faible » à 25 %, le seuil de 20 % serait mal appliqué.',
    debrief: 'La tierce est le réglage de départ : un pas d’un quart suffit à séparer quatre niveaux.',
  },
  quarte: {
    prediction: 'Avec la quarte parfaite (4/3), le pas monte à 33 % et les titres s’écartent davantage.',
    reglage: 'Choisissez « Quarte parfaite (×1,333) », base 16 px.',
    attendu: 'Titres à 16 / 21,33 / 28,44 / 37,93 px, pas de 33 %, verdict « distinct ».',
    falsification: 'Si T2 n’était pas 16 × (4/3)² ≈ 28,44 px, la formule T(n) = T0 × r^n serait fausse.',
    debrief: 'Chaque cran multiplie par le même ratio : la suite est géométrique, pas additive.',
  },
  quinte: {
    prediction: 'La quinte (×1,5) donne un pas de 50 % : T3 atteint 54 px pour une base de 16 px.',
    reglage: 'Choisissez « Quinte parfaite (×1,5) », base 16 px.',
    attendu: 'Titres à 16 / 24 / 36 / 54 px, verdict « distinct », le plus grand écart du tableau.',
    falsification: 'Si doubler le ratio ne changeait pas le pas relatif r − 1, le modèle serait contredit.',
    debrief: 'Un grand ratio rend la hiérarchie très marquée, au risque d’écraser le corps de texte.',
  },
};

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  base: 16,
  echelle: 'tierce',
  interligne: '1.5',
  mesure: MESURE_CIBLE,
  poids: '700',
  tracking: 0,
  playing: false,
  sweep: 0,
  dir: 1,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: null,
};

/* ---------- Mathématiques déterministes ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function fmt0(n) {
  return String(Math.round(n));
}
function fmt1(n) {
  if (!Number.isFinite(n)) return '—';
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}
function fmt2(n) {
  if (!Number.isFinite(n)) return '—';
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}
function pct(n) {
  return fmt0(n * 100) + ' %';
}

/* E061-03 — T(n) = T0 × r^n, n étant le niveau de titre. */
function echelleSizes(base, ratio, steps) {
  const out = [];
  for (let n = 0; n <= steps; n += 1) out.push(base * Math.pow(ratio, n));
  return out;
}

/* E061-04 — mesure : un caractère moyen occupe ≈ 0,5 em. */
function largeurIdeale(base, mesure) {
  return mesure * CAR_LARGEUR_EM * base;
}

/* E061-06 — pas relatif entre deux niveaux consécutifs. */
function pasRelatif(ratio) {
  return ratio - 1;
}

/* E061-10 — facteur de zoom, 100 % → 200 % (balayage déterministe). */
function zoomFactor() {
  return S.playing ? ZOOM_WCAG - (ZOOM_WCAG - 1) * (1 - S.sweep) : 1;
}

function verdictPas(ratio) {
  return pasRelatif(ratio) >= SEUIL_PAS ? 'distinct' : 'trop faible';
}
function verdictMesure(m) {
  if (m < MESURE_MIN) return 'trop courte';
  if (m > MESURE_MAX) return 'trop longue';
  return 'dans la plage';
}
function verdictLeading(k) {
  if (k < LEADING_MIN) return 'serré';
  if (k > LEADING_MAX) return 'aéré';
  return 'conseillé';
}
function verdictZoom(z) {
  return z >= ZOOM_WCAG ? 'objectif WCAG atteint' : 'sous l’objectif';
}

/* ---------- Feuille de style unique (E061-02) ---------- */

const CSS = `
.geography-v2-e061-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e061-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e061-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e061-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e061-panel .geography-v2-e061-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e061-panel code{font-size:10px;color:var(--gold-bright,#f4d69e)}
.geography-v2-e061-panel .geography-v2-e061-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e061-panel .geography-v2-e061-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e061-panel .geography-v2-e061-table th,
.geography-v2-e061-panel .geography-v2-e061-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e061-panel .geography-v2-e061-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e061-panel .geography-v2-e061-table td.geography-v2-e061-ok{color:#bfe3b0}
.geography-v2-e061-panel .geography-v2-e061-table td.geography-v2-e061-ko{color:#f0b4a8}
.geography-v2-e061-panel .geography-v2-e061-table td.geography-v2-e061-val{color:var(--gold-bright,#f4d69e)}
.geography-v2-e061-panel fieldset.geography-v2-e061-groupe{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
.geography-v2-e061-panel fieldset.geography-v2-e061-groupe legend{
  padding:0 4px;color:var(--gold,#e6b96f);
}
.geography-v2-e061-panel .geography-v2-e061-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e061-panel .geography-v2-e061-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e061-panel .geography-v2-e061-slider-row{margin:7px 0}
.geography-v2-e061-panel .geography-v2-e061-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e061-panel .geography-v2-e061-valeur{
  color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums;
}
.geography-v2-e061-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e061-canvas{
  display:block;width:100%;height:248px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.geography-v2-e061-panel .geography-v2-e061-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e061-panel .geography-v2-e061-defi{margin:6px 0;padding-left:18px;font-size:10px}
.geography-v2-e061-panel .geography-v2-e061-defi li{margin:3px 0}
.geography-v2-e061-panel .geography-v2-e061-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e061-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e061-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e061-panel .geography-v2-e061-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e061-panel .geography-v2-e061-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e061-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e061-panel .geography-v2-e061-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.geography-v2-e061-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e061-panel[data-geography-v2-e061-reduced="1"] .geography-v2-e061-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e061-panel .geography-v2-e061-btn{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .geography-v2-e061-panel{font-size:10px;padding:9px}
  #geography-v2-e061-canvas{height:200px}
  .geography-v2-e061-panel .geography-v2-e061-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e061-panel{border:1px solid CanvasText}
}
`;

/* ---------- E061-01 / E061-03 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Une échelle modulaire fixe les tailles de titre par une relation géométrique : T(n) = T0 × r^n, où T0 est la taille de base, r le ratio et n le niveau. Avec une base de 16 px et une tierce majeure de 1,25, les trois premiers niveaux donnent 20, 25 et 31,25 px.',
    'La mesure d’une ligne est le nombre de caractères qu’elle contient. Une plage de 45 à 75 caractères est recommandée, avec une cible d’environ 66 : en deçà la lecture saccade, au-delà l’œil perd la fin de la ligne. Un caractère moyen occupant environ 0,5 em, une mesure de 66 caractères à 16 px correspond à une colonne d’environ 528 px.',
    'L’interlignage, ou leading, est la hauteur totale d’une ligne rapportée à la taille de police. Un texte courant se lit confortablement entre 1,4 et 1,6 fois la taille : plus la ligne est longue, plus il faut d’espace pour retrouver la ligne suivante sans effort.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e061-fait', texte));
  });
  return wrap;
}

function staticFormules(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.formules;
  const items = [
    ['Échelle (E061-03)', 'T(n) = T0 × r^n. Le niveau 0 est le corps de texte, les niveaux 1 à 3 sont les titres ; chaque cran multiplie la taille par le même ratio.'],
    ['Mesure (E061-04)', 'largeur idéale ≈ mesure × 0,5 × T0, car un caractère moyen vaut environ 0,5 em. La mesure reste comprise entre 45 et 75 caractères pour une lecture confortable.'],
    ['Pas perceptif (E061-06)', 'Δ = (T(n+1) − T(n)) / T(n) = r − 1. Sous un écart relatif d’environ 20 %, deux niveaux de titre se confondent à l’œil : la hiérarchie devient invisible.'],
    ['Zoom WCAG (E061-10)', 'Le critère 1.4.4 exige que le texte reste lisible et fonctionnel à 200 % de zoom, sans perte de contenu : les tailles doivent donc suivre le navigateur, pas être figées en pixels.'],
  ];
  items.forEach(([titre, texte]) => {
    const p = ctx.el('p', 'geography-v2-e061-fait');
    const t = document.createElement('strong');
    t.textContent = titre + ' — ';
    p.appendChild(t);
    p.appendChild(document.createTextNode(texte));
    wrap.appendChild(p);
  });
  return wrap;
}

/* E061-09 — tableau comparatif captioné, recalculé depuis T0 = 16 px. */
function staticTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e061-table');
  table.id = ID.table;
  table.appendChild(ctx.el('caption', '',
    'Tailles de titre calculées depuis une base de 16 px par T(n) = T0 × r^n. Le pas indique l’écart relatif entre deux niveaux : sous 20 %, la hiérarchie devient difficile à percevoir.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Échelle', 'Pas', 'T0', 'T1', 'T2', 'T3'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ECHELLE_ORDER.forEach((key) => {
    const e = ECHELLES[key];
    const sizes = echelleSizes(16, e.ratio, 3);
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = e.label;
    tr.appendChild(th);
    const tdPas = document.createElement('td');
    const ok = pasRelatif(e.ratio) >= SEUIL_PAS;
    tdPas.className = ok ? 'geography-v2-e061-ok' : 'geography-v2-e061-ko';
    tdPas.textContent = (ok ? '✓ ' : '✗ ') + pct(pasRelatif(e.ratio));
    tr.appendChild(tdPas);
    sizes.forEach((v) => {
      const td = document.createElement('td');
      td.textContent = fmt2(v) + ' px';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E061-09 (V2) — tableau des mesures, valeurs recalculées (texte réel). */
const MESURE_ROWS = [
  ['echelle', 'Échelle courante', 'T(n) = T0 × r^n'],
  ['pas', 'Pas perceptif', 'Δ = r − 1 (seuil 20 %)'],
  ['mesure', 'Largeur de ligne', 'largeur ≈ mesure × 0,5 × T0'],
  ['leading', 'Interlignage / grille', 'pas = k × T0'],
  ['zoom', 'Zoom WCAG', 'objectif 200 %'],
];

function buildMesuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e061-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les formules et les réglages courants ; le repère est annoncé dans le bandeau.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule déterministe', 'Résultat courant'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MESURE_ROWS.forEach(([key, label, formule]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const form = document.createElement('td');
    form.style.fontWeight = '400';
    form.textContent = formule;
    const value = document.createElement('td');
    value.className = 'geography-v2-e061-val';
    value.textContent = '—';
    S.cells[key] = value;
    tr.append(th, form, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillMesuresTable() {
  const c = S.cells;
  const ratio = ECHELLES[S.echelle].ratio;
  const sizes = echelleSizes(S.base, ratio, 3);
  const k = INTERLIGNES[S.interligne].valeur;
  const zoom = zoomFactor();

  if (c.echelle) c.echelle.textContent = sizes.map((v) => fmt1(v)).join(' / ') + ' px';
  if (c.pas) c.pas.textContent = pct(pasRelatif(ratio)) + ' · ' + verdictPas(ratio);
  if (c.mesure) c.mesure.textContent = fmt0(S.mesure) + ' car. → ≈ '
    + fmt0(largeurIdeale(S.base, S.mesure)) + ' px · ' + verdictMesure(S.mesure);
  if (c.leading) c.leading.textContent = fmt1(k) + ' → pas '
    + fmt0(k * S.base) + ' px · ' + verdictLeading(k);
  if (c.zoom) c.zoom.textContent = pct(zoom) + ' · ' + verdictZoom(zoom);
}

/* ---------- E061-10 : défi falsifiable en cinq temps ---------- */

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e061-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[S.echelle][key];
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

function fillDefi() {
  if (!S.defiSpans) return;
  const d = DEFI[S.echelle];
  DEFI_ETAPES.forEach(([key]) => {
    const span = S.defiSpans[key];
    if (span) span.textContent = d[key];
  });
}

/* ---------- E061-08 : contrôles accessibles ---------- */

function radioSet(ctx, id, name, legendTexte, order, dict, current) {
  const fieldset = ctx.el('fieldset', 'geography-v2-e061-groupe');
  fieldset.id = id;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', legendTexte);
  fieldset.appendChild(ctx.el('legend', '', legendTexte));
  order.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e061-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.id = id + '-' + value;
    radio.value = value;
    radio.checked = current === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(dict[value].label));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function rangeRow(ctx, labelText, id, min, max, step, value) {
  const row = ctx.el('div', 'geography-v2-e061-slider-row');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  const out = ctx.el('span', 'geography-v2-e061-valeur', '');
  out.id = id + '-value';
  label.append(document.createTextNode(labelText + ' : '), out);
  row.appendChild(label);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  row.appendChild(input);
  return { row, input, out };
}

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      echelles: ECHELLE_ORDER.map((k) => document.getElementById(ID.echelle + '-' + k)),
      interlignes: INTERLIGNE_ORDER.map((k) => document.getElementById(ID.interligne + '-' + k)),
      poids: POIDS_ORDER.map((k) => document.getElementById(ID.poids + '-' + k)),
      base: document.getElementById(ID.base),
      baseOut: document.getElementById(ID.baseValue),
      mesure: document.getElementById(ID.mesure),
      mesureOut: document.getElementById(ID.mesureValue),
      tracking: document.getElementById(ID.tracking),
      trackingOut: document.getElementById(ID.trackingValue),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      zoom: document.getElementById(ID.zoom),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e061-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);
  panel.setAttribute('aria-describedby', ID.help);

  const title = ctx.el('h2', '', 'Typographie et hiérarchie visuelle — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Une hiérarchie lisible ne s’obtient pas en changeant la couleur des titres, mais en réglant des rapports de taille, une mesure de ligne et un interlignage mesurables. '
    + 'Les définitions, les formules et les tableaux ci-dessous sont du texte réel ; le canvas ne fait qu’illustrer les calculs, tous déterministes et locaux.');
  lead.id = ID.lead;

  /* E061-08 : choix exclusifs → fieldset/radiogroup, jamais aria-pressed. */
  const echelleSet = radioSet(ctx, ID.echelle, 'geography-v2-e061-echelle-groupe',
    'Échelle modulaire (choix unique — fixe le ratio)', ECHELLE_ORDER, ECHELLES, S.echelle);
  const interligneSet = radioSet(ctx, ID.interligne, 'geography-v2-e061-interligne-groupe',
    'Interlignage (choix unique)', INTERLIGNE_ORDER, INTERLIGNES, S.interligne);
  const poidsSet = radioSet(ctx, ID.poids, 'geography-v2-e061-poids-groupe',
    'Poids du corps de texte (choix unique)', POIDS_ORDER, POIDS, S.poids);

  const baseRow = rangeRow(ctx, 'Taille de base', ID.base, 12, 24, 1, S.base);
  const mesureRow = rangeRow(ctx, 'Mesure (caractères/ligne)', ID.mesure, 30, 100, 1, S.mesure);
  const trackingRow = rangeRow(ctx, 'Espacement des lettres (em)', ID.tracking, -0.05, 0.15, 0.01, S.tracking);

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de typographie. Flèches gauche et droite : changer d’échelle ; flèches haut et bas : changer l’interlignage ; plus et moins : ajuster la taille de base ; Page précédente et Page suivante : ajuster la mesure ; Espace : lancer ou arrêter le zoom de 100 à 200 pour cent ; Origine : remise à zéro.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : ← → échelles, ↑ ↓ interlignage, + / − taille de base, Page précédente / Page suivante mesure, Espace bascule du zoom, Origine remise à zéro. Chaque résultat est énoncé dans le bandeau et repris dans le tableau des mesures.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e061-legend', '');
  legend.id = ID.legend;

  const zoomLine = ctx.el('p', 'geography-v2-e061-legend', '');
  zoomLine.appendChild(document.createTextNode('Zoom courant : '));
  const zoomSpan = ctx.el('span', '', '');
  zoomSpan.id = ID.zoom;
  zoomLine.appendChild(zoomSpan);

  const mesuresTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  mesuresTitle.id = ID.mesuresTitle;
  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Réglages initiaux : le calcul est réécrit ici à chaque changement.';

  /* E061-08 : boutons ≥ 36 px (ici 44 px) ; aria-pressed réservé à la bascule. */
  const play = ctx.el('button', 'geography-v2-e061-btn', '▶ Zoomer de 100 à 200 %');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e061-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const help = ctx.el('p', 'geography-v2-e061-sr',
    'Commandes du laboratoire : groupes de boutons radio pour l’échelle, l’interlignage et le poids ; curseurs pour la taille de base, la mesure et l’espacement des lettres ; flèches gauche et droite sur le graphique pour changer d’échelle, haut et bas pour l’interlignage, plus et moins pour la taille, Page précédente et Page suivante pour la mesure, Espace pour le zoom.');
  help.id = ID.help;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucune police, aucune donnée ni aucune valeur aléatoire n’est chargée. Les grandeurs ci-dessus sont des textes réels, lisibles et indexables même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(ctx), staticFormules(ctx), echelleSet,
    interligneSet, poidsSet, baseRow.row, mesureRow.row, trackingRow.row, canvas,
    canvasDesc, legend, zoomLine, staticTable(ctx), mesuresTitle, buildMesuresTable(ctx),
    defiTitle, buildDefi(ctx), readout, play, reset, help, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    echelles: ECHELLE_ORDER.map((k) => document.getElementById(ID.echelle + '-' + k)),
    interlignes: INTERLIGNE_ORDER.map((k) => document.getElementById(ID.interligne + '-' + k)),
    poids: POIDS_ORDER.map((k) => document.getElementById(ID.poids + '-' + k)),
    base: baseRow.input, baseOut: baseRow.out,
    mesure: mesureRow.input, mesureOut: mesureRow.out,
    tracking: trackingRow.input, trackingOut: trackingRow.out,
    canvas, legend, readout, zoom: zoomSpan, play, reset,
    fresh: true,
  };
}

/* ---------- E061-02 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e061-badge',
    'Typographie locale : échelle modulaire, mesure 45–75 caractères, interlignage 1,4–1,6, seuil perceptif 20 % et zoom WCAG 200 % — tout est calculé ici, rien n’est chargé.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- Rendu du laboratoire (E061-03 … E061-08, E061-10) ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 248;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const ratio = ECHELLES[S.echelle].ratio;
  const zoom = zoomFactor();
  const sizes = echelleSizes(S.base * zoom, ratio, 3);
  const leading = INTERLIGNES[S.interligne].valeur * S.base * zoom;
  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);

  /* E061-05 — grille de base et rythme vertical : repères tous les
     `leading` pixels, alignés sur l’interlignage courant. */
  g.strokeStyle = 'rgba(255,255,255,.06)';
  g.lineWidth = 1;
  g.setLineDash([]);
  const step = Math.max(8, leading);
  for (let y = pad; y < pad + ih; y += step) {
    g.beginPath();
    g.moveTo(pad, y);
    g.lineTo(pad + iw, y);
    g.stroke();
  }

  /* E061-03/06/07 — échelle de titres : quatre niveaux, tailles calculées,
     poids et espacement appliqués. Chaque ligne porte son libellé chiffré. */
  g.save();
  g.beginPath();
  g.rect(pad, pad, iw, ih - 46);
  g.clip();
  let y = pad + 26;
  for (let n = 3; n >= 0; n -= 1) {
    const size = sizes[n];
    g.font = POIDS[S.poids].valeur + ' ' + Math.round(size) + 'px system-ui, sans-serif';
    if (typeof g.letterSpacing === 'string') {
      g.letterSpacing = (S.tracking * size) + 'px';
    }
    g.fillStyle = n === 0 ? 'rgba(214,207,193,.92)' : 'rgba(244,214,158,' + (0.62 + 0.09 * n) + ')';
    const label = n === 0 ? 'Corps · ' + fmt1(size) + ' px' : 'T' + n + ' · ' + fmt1(size) + ' px';
    g.fillText(label, pad + 6, y);
    y += Math.max(18, size * 1.15);
    if (typeof g.letterSpacing === 'string') g.letterSpacing = '0px';
  }
  g.restore();

  /* E061-04 — mesure : une barre d’échantillon dont la largeur est
     proportionnelle à la mesure choisie, bornée à la zone disponible. */
  const barY = pad + ih - 34;
  const barW = iw * clamp(S.mesure / MESURE_MAX, 0, 1);
  g.fillStyle = 'rgba(230,185,111,.20)';
  g.fillRect(pad, barY, barW, 10);
  g.strokeStyle = 'rgba(244,214,158,.75)';
  g.lineWidth = 1;
  g.strokeRect(pad, barY, barW, 10);
  g.fillStyle = 'rgba(244,214,158,.92)';
  g.font = '10px sans-serif';
  g.fillText('Mesure ' + fmt0(S.mesure) + ' car. · largeur ≈ '
    + fmt0(largeurIdeale(S.base, S.mesure)) + ' px', pad, barY - 5);

  /* E061-10 — zoom affiché, comparé à l’objectif WCAG de 200 %. */
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText('Zoom ' + pct(zoom) + ' · ' + verdictZoom(zoom)
    + ' · pas ' + pct(pasRelatif(ratio)) + ' (' + verdictPas(ratio) + ')',
    pad, cssH - pad + 4);
}

/* ---------- Bandeau de lecture : synthèse textuelle (role=status) ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const ratio = ECHELLES[S.echelle].ratio;
  const sizes = echelleSizes(S.base, ratio, 3);
  const zoom = zoomFactor();
  const leading = INTERLIGNES[S.interligne].valeur;
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  n.textContent = '';
  add('Échelle ');
  n.appendChild(strong(sizes.map((v) => fmt1(v)).join(' / ') + ' px'));
  add('. Pas ');
  n.appendChild(strong(pct(pasRelatif(ratio))));
  add(' : hiérarchie ');
  n.appendChild(strong(verdictPas(ratio)));
  add(' (seuil ' + pct(SEUIL_PAS) + '). Mesure ');
  n.appendChild(strong(fmt0(S.mesure) + ' car.'));
  add(' — ' + verdictMesure(S.mesure) + ' (plage ' + MESURE_MIN + '–' + MESURE_MAX
    + ', cible ' + MESURE_CIBLE + '), largeur ≈ ' + fmt0(largeurIdeale(S.base, S.mesure)) + ' px. Interlignage ');
  n.appendChild(strong(fmt1(leading)));
  add(' : ' + verdictLeading(leading) + ' (conseillé ' + fmt1(LEADING_MIN)
    + '–' + fmt1(LEADING_MAX) + '). Poids ' + POIDS[S.poids].valeur
    + ', tracking ' + fmt2(S.tracking) + ' em. Zoom ');
  n.appendChild(strong(pct(zoom)));
  add(' — ' + verdictZoom(zoom) + ' (WCAG ' + pct(ZOOM_WCAG) + ').');
}

/* Zoom courant, hors région live : actualisé à chaque frame sans harceler
   les lecteurs d’écran (le bandeau role=status ne bouge qu’aux changements). */
function updateZoom() {
  const n = S.nodes && S.nodes.zoom;
  if (!n) return;
  const z = zoomFactor();
  n.textContent = pct(z) + ' — ' + verdictZoom(z);
}

function updateLegend() {
  const n = S.nodes && S.nodes.legend;
  if (!n) return;
  n.textContent = 'Quatre niveaux de titre sont dessinés du plus grand au corps de texte ; les filets horizontaux matérialisent la grille de base alignée sur l’interlignage. La barre dorée montre la mesure choisie. Les verdicts sont écrits : aucune information ne repose sur la couleur seule.';
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.base) return;

  n.echelles.forEach((radio, i) => { if (radio) radio.checked = ECHELLE_ORDER[i] === S.echelle; });
  n.interlignes.forEach((radio, i) => { if (radio) radio.checked = INTERLIGNE_ORDER[i] === S.interligne; });
  n.poids.forEach((radio, i) => { if (radio) radio.checked = POIDS_ORDER[i] === S.poids; });

  if (n.base) { n.base.value = String(S.base); if (n.baseOut) n.baseOut.textContent = fmt0(S.base) + ' px'; }
  if (n.mesure) { n.mesure.value = String(S.mesure); if (n.mesureOut) n.mesureOut.textContent = fmt0(S.mesure) + ' car.'; }
  if (n.tracking) { n.tracking.value = String(S.tracking); if (n.trackingOut) n.trackingOut.textContent = fmt2(S.tracking) + ' em'; }

  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le zoom' : '▶ Zoomer de 100 à 200 %';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E061Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) fillDefi();
  fillMesuresTable();
  updateLegend();
  updateReadout();
  updateZoom();
  drawLab();
}

function resetState() {
  S.base = 16;
  S.echelle = 'tierce';
  S.interligne = '1.5';
  S.mesure = MESURE_CIBLE;
  S.poids = '700';
  S.tracking = 0;
  S.playing = false;
  S.sweep = 0;
  S.dir = 1;
  stopLoop();
  applyState();
}

/* ---------- E061-10 : boucle rAF unique, pauses multiples ---------- */

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
    S.sweep += S.dir * dt * 0.00035;
    if (S.sweep >= 1) { S.sweep = 1; S.dir = -1; }
    if (S.sweep <= 0) { S.sweep = 0; S.dir = 1; }
  }
  S.lastTs = ts;
  drawLab();
  updateZoom();
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
        if (S.reduced) { S.playing = false; stopLoop(); } else startLoop();
        if (S.nodes) applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- E061-08 : câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.echelles.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.echelle = radio.value;
      applyState();
    });
  });
  n.interlignes.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.interligne = radio.value;
      applyState();
    });
  });
  n.poids.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.poids = radio.value;
      applyState();
    });
  });

  n.base.addEventListener('input', () => {
    S.base = clamp(Number(n.base.value) || 16, 12, 24);
    applyState();
  });
  n.mesure.addEventListener('input', () => {
    S.mesure = clamp(Number(n.mesure.value) || MESURE_CIBLE, 30, 100);
    applyState();
  });
  n.tracking.addEventListener('input', () => {
    S.tracking = clamp(Number(n.tracking.value) || 0, -0.05, 0.15);
    applyState();
  });

  n.play.addEventListener('click', () => {
    if (S.reduced) {
      S.playing = false;
      S.sweep = 1;
      stopLoop();
      applyState();
      return;
    }
    S.playing = !S.playing;
    if (!S.playing) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', resetState);

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const i = ECHELLE_ORDER.indexOf(S.echelle);
      S.echelle = ECHELLE_ORDER[(i + step + ECHELLE_ORDER.length) % ECHELLE_ORDER.length];
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const step = event.key === 'ArrowUp' ? 1 : -1;
      const i = INTERLIGNE_ORDER.indexOf(S.interligne);
      S.interligne = INTERLIGNE_ORDER[clamp(i + step, 0, INTERLIGNE_ORDER.length - 1)];
    } else if (event.key === '+' || event.key === '=') {
      S.base = clamp(S.base + 1, 12, 24);
    } else if (event.key === '-' || event.key === '−') {
      S.base = clamp(S.base - 1, 12, 24);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      S.mesure = clamp(S.mesure + (event.key === 'PageUp' ? 5 : -5), 30, 100);
    } else if (event.key === 'Home') {
      resetState();
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      if (S.reduced) {
        S.playing = false;
        S.sweep = 1;
        stopLoop();
      } else {
        S.playing = !S.playing;
        if (!S.playing) stopLoop(); else startLoop();
      }
    } else {
      used = false;
    }
    if (used) {
      event.preventDefault();
      applyState();
    }
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E061', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E061-02 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) {
    S.playing = false;
    S.sweep = 1;
  }

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
