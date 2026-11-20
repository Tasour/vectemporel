import { register } from './registry.js';

/* Lentille V2 E096 — J. Pédagogie & narration : comparaison chiffrée
 * (couverture vs référence).
 *
 * Thème canonique : « J. Pédagogie & narration — comparaison chiffrée
 * (couverture vs référence) » (UNIFIED_AUDIT/POINTS/themes.json, clé E096).
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E096.md — chantiers E096-01 à
 * E096-10. Fichier possédé : src/views/points/v2/E096.js uniquement.
 * Lectures seules : src/views/points.js, points/registry.js, points/v2/registry.js
 * et la passe 1 (src/views/points/E096.js, UNIFIED_AUDIT/POINTS/views/E096.md).
 * Aucun fichier partagé n'est modifié : la passe 1, les autres lentilles V2,
 * registry.js, index.js, styles.css et la vue ne sont ni édités ni doublés.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, n'écrit dans aucune région existante et affiche son état en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Périmètre strict : expliciter en nombre la couverture de la matrice par
 * rapport à une référence de couverture nommée. Toute grandeur est dérivée des
 * cellules réellement rendues par points.js : aucun « 784 », aucun « 845 »,
 * aucun total de couverture codé en dur. Les références (grille complète,
 * seuil 80 %, moitié) et le seuil de complétude sont des conventions
 * pédagogiques de comparaison, jamais des données de l'atlas.
 *
 * Invariants :
 * - exactement un register('E096', ctx => { … }) ;
 * - exactement un ctx.css('points-v2-e096', …), toute règle préfixée
 *   `.points-v2-e096` ;
 * - tous les IDs DOM préfixés points-v2-e096- et gardés par ensureNode ;
 * - zéro console.*, zéro fetch/XHR/import distant, zéro Math.random, zéro
 *   innerHTML, zéro timer, zéro animation, zéro boucle rAF.
 */

const CSS_ID = 'points-v2-e096';
const PREFIX = 'points-v2-e096-';
const SCOPE = 'points-v2-e096';

/* E096-01 à E096-10 : un identifiant par effet observable, tous préfixés. */
const IDS = {
  panel: PREFIX + 'panel',
  title: PREFIX + 'title',
  lede: PREFIX + 'lede',
  refs: PREFIX + 'refs',
  note: PREFIX + 'note',
  coverage: PREFIX + 'coverage',
  reference: PREFIX + 'reference',
  ratio: PREFIX + 'ratio',
  dimensions: PREFIX + 'dimensions',
  silences: PREFIX + 'silences',
  echelle: PREFIX + 'echelle',
  active: PREFIX + 'active',
  bar: PREFIX + 'bar',
  barTrack: PREFIX + 'bar-track',
  barDesc: PREFIX + 'bar-description',
  bilan: PREFIX + 'bilan',
  metric: PREFIX + 'metric',
};

/* Sources de dérivation : exclusivement la matrice produite par la vue. */
const GRID_SELECTOR = '.points-grid';
const MATRIX_SELECTOR = '.points-matrix';
const HEAD_SELECTOR = '.points-grid-row.is-head';
const ROW_SELECTOR = '.points-grid-row';
const CELL_SELECTOR = '.points-cell';
const COVERED_SELECTOR = '.points-cell.has-points';
const ACTIVE_SELECTOR = '.points-grid-row.is-active';

/* E096-02 : références de couverture nommées. Leur ratio est une convention
   pédagogique de comparaison, jamais une mesure de l'atlas. */
const REFERENCES = Object.freeze([
  { key: 'complet', inputId: PREFIX + 'ref-complet', labelId: PREFIX + 'ref-complet-label', label: 'grille complète', ratio: 1 },
  { key: 'seuil80', inputId: PREFIX + 'ref-seuil80', labelId: PREFIX + 'ref-seuil80-label', label: 'seuil cible 80 %', ratio: 0.8 },
  { key: 'moitie', inputId: PREFIX + 'ref-moitie', labelId: PREFIX + 'ref-moitie-label', label: 'moitié de la grille', ratio: 0.5 },
]);
const RADIO_NAME = 'e096-reference';

/* E096-05 : seuil au-delà duquel la complétude est qualifiée de majoritaire. */
const COMPLETUDE_SEUIL = 50;

/* E096-03, E096-06, E096-08 : une seule feuille, entièrement préfixée. Les
   largeurs de barres et l'état de complétude sont doublés par du texte et des
   attributs de données : aucune information n'est confiée à la seule couleur. */
const CSS = `
  .${SCOPE} {
    margin: 12px 0 4px; padding: 11px 13px 13px;
    border: 1px solid var(--line, #3a3a3a);
    border-left: 4px solid var(--gold, #c8a24a);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #d6d6d6); font: inherit; font-size: 11px;
    line-height: 1.55; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .${SCOPE} .e096-title {
    margin: 0 0 5px; color: var(--gold-bright, #f0d27a);
    font-family: var(--serif, Georgia, serif); font-size: 15px;
    font-weight: 600; line-height: 1.3; letter-spacing: 0;
    text-transform: none;
  }
  .${SCOPE} .e096-lede { margin: 0 0 9px; color: var(--muted, #9b9b9b); }
  .${SCOPE} .e096-refs {
    display: flex; flex-wrap: wrap; gap: 5px 14px; margin: 0 0 6px;
    padding: 6px 8px; border: 1px solid var(--line, #3a3a3a); border-radius: 6px;
  }
  .${SCOPE} .e096-choice { display: inline-flex; align-items: center; gap: 6px; }
  .${SCOPE} .e096-radio {
    width: 18px; height: 18px; margin: 0;
    accent-color: var(--gold, #c8a24a);
  }
  .${SCOPE} .e096-label { cursor: pointer; color: var(--ink-soft, #d6d6d6); font-size: 10px; }
  .${SCOPE} .e096-note { margin: 0 0 8px; color: var(--muted-2, #8a8a8a); font-size: 9px; }
  .${SCOPE} .e096-rows { margin: 0; }
  .${SCOPE} .e096-row {
    display: flex; gap: 10px; margin: 0 0 4px; padding: 0 0 4px;
    border-bottom: 1px solid var(--line, #3a3a3a);
  }
  .${SCOPE} .e096-key {
    flex: 0 0 150px; margin: 0; color: var(--muted, #9b9b9b); font-size: 10px;
  }
  .${SCOPE} .e096-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--ink, #f2f2f2); }
  /* E096-05 : l'état est porté par le texte « MAJORITAIRE / MINORITAIRE » et
     par l'attribut data-e096-completude, jamais par la seule teinte. */
  .${SCOPE}[data-e096-completude="minoritaire"] .e096-val-completude {
    color: var(--gold-bright, #f0d27a); font-weight: 600;
  }
  /* E096-08 : barre de couverture empilée ; chaque segment porte son libellé. */
  .${SCOPE} .e096-bar {
    position: relative; display: flex; min-height: 26px; margin: 6px 0 3px;
    overflow: hidden; border: 1px solid var(--line-strong, #6a6a6a); border-radius: 4px;
  }
  .${SCOPE} .e096-seg {
    display: flex; align-items: center; justify-content: center;
    min-width: 0; overflow: hidden; padding: 0 3px;
    font-size: 9px; color: var(--ink, #f2f2f2); white-space: nowrap;
  }
  .${SCOPE} .e096-seg-covered {
    border-right: 1px solid var(--line-strong, #6a6a6a);
    background: repeating-linear-gradient(45deg, rgba(200,162,74,.26) 0 5px, rgba(200,162,74,.06) 5px 10px);
  }
  .${SCOPE} .e096-seg-silence {
    background: repeating-linear-gradient(135deg, rgba(120,130,150,.20) 0 5px, rgba(120,130,150,.04) 5px 10px);
  }
  .${SCOPE} .e096-refmark {
    position: absolute; top: 0; bottom: 0; width: 2px;
    background: var(--gold-bright, #f0d27a); pointer-events: none;
  }
  .${SCOPE} .e096-bar-desc { margin: 0 0 8px; color: var(--muted, #9b9b9b); font-size: 9px; }
  .${SCOPE} .e096-bilan {
    margin: 9px 0 0; padding-top: 7px; border-top: 1px solid var(--line, #3a3a3a);
    color: var(--ink-soft, #d6d6d6);
  }
  .${SCOPE} .e096-metric { margin: 7px 0 0; color: var(--muted-2, #8a8a8a); font-size: 9px; }
  .${SCOPE} :focus-visible { outline: 2px solid var(--gold-bright, #f0d27a); outline-offset: 2px; }
  @media (max-width: 620px) {
    .${SCOPE} .e096-row { flex-wrap: wrap; gap: 1px 8px; }
    .${SCOPE} .e096-key { flex-basis: 100%; }
    .${SCOPE} .e096-refs { gap: 4px 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .${SCOPE}, .${SCOPE} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .${SCOPE} { border: 1px solid CanvasText; border-left: 4px solid CanvasText; background: Canvas; color: CanvasText; }
    .${SCOPE} .e096-title, .${SCOPE} .e096-val, .${SCOPE} .e096-bilan,
    .${SCOPE} .e096-seg { color: CanvasText; }
    .${SCOPE} .e096-seg { background: Canvas; border: 1px solid CanvasText; }
    .${SCOPE} .e096-refmark { background: CanvasText; }
  }
  @media print {
    .${SCOPE} { border: 1px solid #000; background: #fff; color: #000; break-inside: avoid; }
    .${SCOPE} .e096-title, .${SCOPE} .e096-val, .${SCOPE} .e096-key,
    .${SCOPE} .e096-bilan, .${SCOPE} .e096-metric, .${SCOPE} .e096-seg { color: #000; }
    .${SCOPE} .e096-seg {
      background-image: repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 5px) !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
  }
`;

let installCount = 0;
let referenceKey = 'complet';
let boundGroup = null;
let refs = null;

/* E096-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   le stage, un nœud de la rendu précédent est détaché : on le réutilise et on
   le déplace dans le parent courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écritures dédupliquées : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

/* Lecture tolérante d'un compte de point, sans nombre de couverture figé. */
function readCount(cell) {
  const direct = parseInt(String(cell.textContent || '').trim(), 10);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const title = cell && cell.getAttribute ? String(cell.getAttribute('title') || '') : '';
  const found = title.match(/(\d+)\s*point/i);
  if (found) {
    const value = parseInt(found[1], 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

/* Premier entier lisible dans un libellé (titres « N points isolés »,
   « N point(s) dans ce périmètre »). */
function firstNumber(node) {
  if (!node) return NaN;
  const found = String(node.textContent || '').match(/\d+/);
  return found ? parseInt(found[0], 10) : NaN;
}

function toArray(list) {
  return Array.prototype.slice.call(list || []);
}

/* Formatage français déterministe (espace comme séparateur de milliers). */
function formatEntier(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded));
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ' ';
    out += digits[i];
  }
  return sign + out;
}

function formatDecimal(value, places) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(places).replace('.', ',');
}

function currentReference() {
  return REFERENCES.find((item) => item.key === referenceKey) || REFERENCES[0];
}

function emptyMeasure() {
  const ref = currentReference(); return {
    grid: null, total: 0, coveredCount: 0, silences: 0, points: 0,
    domains: 0, eras: 0, eraStats: [], active: null,
    isolatedPoints: NaN, perimeterPoints: NaN,
    percent: NaN, ref: ref, refCells: NaN, refPercent: ref.ratio * 100,
    ecart: NaN, ratioCover: NaN,
    cmParCas: NaN, cmCouvert: NaN, cmSilence: NaN, activeShare: NaN,
  };
}

/* E096-01, E096-04, E096-07 : toutes les grandeurs sont mesurées sur la
   matrice rendue. La référence de complétude est la grille elle-même, jamais
   un chiffre mémorisé : c'est une comparaison « observé vs référence ». */
function derive(host) {
  if (!host || typeof host.querySelector !== 'function') return emptyMeasure();
  const grid = host.querySelector(GRID_SELECTOR);
  if (!grid) return emptyMeasure();

  const cells = toArray(grid.querySelectorAll(CELL_SELECTOR));
  const coveredCells = toArray(grid.querySelectorAll(COVERED_SELECTOR));
  const total = cells.length;
  const coveredCount = coveredCells.length;
  const silences = Math.max(0, total - coveredCount);
  let points = 0;
  coveredCells.forEach((cell) => { points += readCount(cell); });

  const head = grid.querySelector(HEAD_SELECTOR);
  const domains = head ? Math.max(0, head.children.length - 1) : 0; // « Ère » n'est pas un domaine
  const rowNodes = toArray(grid.querySelectorAll(ROW_SELECTOR))
    .filter((row) => !row.classList.contains('is-head'));
  const eras = rowNodes.length;
  const eraStats = rowNodes.map((row) => {
    const nameNode = row.querySelector('.points-era');
    const name = nameNode ? String(nameNode.textContent || '').trim() : 'Ère sans nom';
    const rowCells = toArray(row.querySelectorAll(CELL_SELECTOR));
    const rowCovered = toArray(row.querySelectorAll(COVERED_SELECTOR));
    let rowPoints = 0;
    rowCovered.forEach((cell) => { rowPoints += readCount(cell); });
    return { name, total: rowCells.length, covered: rowCovered.length, points: rowPoints };
  });

  const activeRow = grid.querySelector(ACTIVE_SELECTOR);
  let active = null;
  if (activeRow) {
    const nameNode = activeRow.querySelector('.points-era');
    active = {
      name: nameNode ? String(nameNode.textContent || '').trim() : 'Ère courante',
      total: activeRow.querySelectorAll(CELL_SELECTOR).length,
      covered: activeRow.querySelectorAll(COVERED_SELECTOR).length,
    };
  }

  const isolatedPoints = firstNumber(host.querySelector('.points-title'));
  const perimeterPoints = firstNumber(host.querySelector('.points-detail .view-kicker'));
  const percent = total > 0 ? Math.round((coveredCount / total) * 100) : NaN;

  const ref = currentReference();
  const refCells = total > 0 ? Math.round(total * ref.ratio) : NaN;
  const refPercent = ref.ratio * 100;
  const ecart = Number.isFinite(refCells) ? coveredCount - refCells : NaN;
  const ratioCover = Number.isFinite(refCells) && refCells > 0 ? coveredCount / refCells : NaN;

  const cmParCas = total > 0 ? 100 / total : NaN;
  const cmCouvert = Number.isFinite(cmParCas) ? coveredCount * cmParCas : NaN;
  const cmSilence = Number.isFinite(cmParCas) ? silences * cmParCas : NaN;
  const activeShare = active && coveredCount > 0 ? (active.covered / coveredCount) * 100 : NaN;

  return {
    grid, total, coveredCount, silences, points, domains, eras, eraStats, active,
    isolatedPoints, perimeterPoints, percent, ref, refCells, refPercent,
    ecart, ratioCover, cmParCas, cmCouvert, cmSilence, activeShare,
  };
}

/* Montage du panneau : un laboratoire, huit lignes (une par chantier
   chiffré), une barre, une synthèse et un témoin d'idempotence. */
function mountPanel(make, parent) {
  const panel = ensureNode(make, IDS.panel, 'section', SCOPE, parent);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', IDS.title);

  const title = ensureNode(make, IDS.title, 'h2', 'e096-title', panel);
  write(title, 'Couverture vs référence — comparaison chiffrée');
  const lede = ensureNode(make, IDS.lede, 'p', 'e096-lede', panel);
  write(lede, 'Laboratoire de lecture : la couverture observée de la matrice est comparée à une référence nommée. Chaque nombre est recalculé depuis les cellules réellement rendues ; le panneau décrit, il ne modifie aucune donnée.');

  const refsGroup = ensureNode(make, IDS.refs, 'div', 'e096-refs', panel);
  refsGroup.setAttribute('role', 'radiogroup');
  refsGroup.setAttribute('aria-label', 'Référence de couverture');
  refsGroup.replaceChildren();
  REFERENCES.forEach((item) => {
    const choice = make('span', 'e096-choice');
    const input = ensureNode(make, item.inputId, 'input', 'e096-radio', choice);
    input.setAttribute('type', 'radio');
    input.setAttribute('name', RADIO_NAME);
    input.setAttribute('value', item.key);
    const label = ensureNode(make, item.labelId, 'label', 'e096-label', choice);
    label.setAttribute('for', item.inputId);
    write(label, item.label + ' (' + formatEntier(item.ratio * 100) + ' %)');
    choice.appendChild(input);
    choice.appendChild(label);
    refsGroup.appendChild(choice);
  });

  const note = ensureNode(make, IDS.note, 'p', 'e096-note', panel);
  write(note, 'La référence est une convention de mesure pédagogique, pas une donnée de l’atlas : « seuil cible 80 % » et « moitié » sont des repères choisis pour rendre la comparaison parlante.');

  const rows = make('dl', 'e096-rows');
  const definitions = [
    ['coverage', 'E096-01 · Couverture observée', 'val'],
    ['reference', 'E096-02 · Référence', 'val'],
    ['ratio', 'E096-03 · Rapport C ÷ R', 'val'],
    ['dimensions', 'E096-04 · Dimensions de la matrice', 'val'],
    ['silences', 'E096-05 · Silences & complétude', 'val-completude'],
    ['echelle', 'E096-06 · Échelle 1 mètre', 'val'],
    ['active', 'E096-07 · Part de l’ère courante', 'val'],
  ];
  const cells = {};
  definitions.forEach((definition) => {
    const id = definition[0];
    const labelText = definition[1];
    const valueClass = definition[2];
    const row = make('div', 'e096-row');
    row.appendChild(make('dt', 'e096-key', labelText));
    const value = make('dd', 'e096-' + valueClass);
    value.id = IDS[id];
    row.appendChild(value);
    rows.appendChild(row);
    cells[id] = value;
  });

  const bar = ensureNode(make, IDS.bar, 'div', 'e096-bar', panel);
  bar.setAttribute('role', 'img');
  const barTrack = ensureNode(make, IDS.barTrack, 'div', 'e096-bar-track', bar);
  const barDesc = ensureNode(make, IDS.barDesc, 'p', 'e096-bar-desc', panel);
  const bilan = ensureNode(make, IDS.bilan, 'p', 'e096-bilan', panel);
  const metric = ensureNode(make, IDS.metric, 'p', 'e096-metric', panel);

  panel.replaceChildren(title, lede, refsGroup, note, rows, bar, barDesc, bilan, metric);
  return {
    panel, title, lede, refsGroup, note, rows, cells, bar,
    barTrack, barDesc, bilan, metric,
  };
}

/* E096-08 : barre de couverture empilée, déterministe, sans aléa. Deux
   segments (couvert / silence) dont les largeurs sont calculées depuis le DOM,
   plus un repère de référence positionné au pourcentage nommé. Chaque segment
   porte son libellé et un attribut de données : la couleur n'est jamais seule. */
function paintBar(make, track, d) {
  track.replaceChildren();
  if (!(d.total > 0) || !Number.isFinite(d.percent)) {
    setData(track, 'e096Segments', '0');
    return false;
  }
  const coveredPct = Math.max(0, Math.min(100, d.percent));
  const silencePct = 100 - coveredPct;
  const covered = make('div', 'e096-seg e096-seg-covered');
  covered.style.width = coveredPct + '%';
  covered.style.flexBasis = coveredPct + '%';
  covered.textContent = 'couvert ' + coveredPct + ' %';
  covered.setAttribute('data-e096-seg', 'couvert');
  const silence = make('div', 'e096-seg e096-seg-silence');
  silence.style.width = silencePct + '%';
  silence.style.flexBasis = silencePct + '%';
  silence.textContent = 'silence ' + formatDecimal(100 - d.percent, 1) + ' %';
  silence.setAttribute('data-e096-seg', 'silence');
  track.appendChild(covered);
  track.appendChild(silence);
  if (Number.isFinite(d.refPercent)) {
    const mark = make('span', 'e096-refmark');
    mark.style.left = Math.max(0, Math.min(100, d.refPercent)) + '%';
    mark.setAttribute('data-e096-refmark', d.ref.key);
    track.appendChild(mark);
  }
  setData(track, 'e096Segments', '2');
  return true;
}

function paint() {
  const r = refs;
  if (!r || !r.panel || !r.panel.isConnected) return;

  const d = derive(r.host);
  const hasGrid = d.total > 0;
  const c = r.cells;

  /* E096-01 — couverture observée, dérivée des cellules has-points. */
  write(c.coverage, hasGrid
    ? `Lecture de la matrice : ${d.coveredCount}/${d.total} case(s) portent un nombre, ${d.silences} affichent « · » (silence documenté), soit ${d.percent} % de couverture. Couverture = couvertes ÷ total = ${d.coveredCount} ÷ ${d.total}.`
    : 'Lecture de la matrice : aucune case mesurable pour le moment ; le panneau se tait plutôt que d’inventer un chiffre.');

  /* E096-02 — référence nommée, valeur et nature de convention. */
  write(c.reference, hasGrid
    ? `Référence R = « ${d.ref.label} » : ${formatEntier(d.refPercent)} % de la grille, soit ${formatEntier(d.refCells)} case(s) sur ${formatEntier(d.total)}. C’est une convention de mesure, pas une donnée de l’atlas.`
    : `Référence R = « ${d.ref.label} » (${formatEntier(d.refPercent)} %) : le nombre de cases de référence sera calculé dès que la grille sera rendue.`);

  /* E096-03 — rapport explicite avec sa formule et l'écart signé. */
  write(c.ratio, Number.isFinite(d.ratioCover)
    ? `C ÷ R = ${d.coveredCount} ÷ ${formatEntier(d.refCells)} ≈ ${formatDecimal(d.ratioCover, 2)} fois la référence. Écart à la référence : ${d.ecart >= 0 ? '+' : ''}${d.ecart} case(s).`
    : 'Rapport indisponible : aucune case de référence calculable sans grille rendue.');

  /* E096-04 — dimensions de la matrice et comptage des points, tout lu dans
     le DOM : ères × domaines, points comptés, points annoncés, périmètre. */
  write(c.dimensions, hasGrid
    ? `La matrice croise ${d.eras} ère(s) et ${d.domains} domaine(s), soit ${d.total} case(s). ${d.coveredCount} case(s) cumulent ${formatEntier(d.points)} point(s) validé(s) ; le titre en annonce ${formatEntier(d.isolatedPoints)} en tout${Number.isFinite(d.perimeterPoints) ? ' et le périmètre affiché en contient ' + formatEntier(d.perimeterPoints) : ''}.`
    : 'Dimensions indisponibles : en-tête et lignes de la matrice absents.');

  /* E096-05 — silences documentés et complétude qualifiée, doublée en attribut. */
  const majoritaire = Number.isFinite(d.percent) && d.percent >= COMPLETUDE_SEUIL;
  write(c.silences, Number.isFinite(d.percent)
    ? `${d.silences} case(s) affichent « · » (silence documenté), soit ${formatDecimal(100 - d.percent, 1)} % de la grille. Complétude ${majoritaire ? 'MAJORITAIRE' : 'MINORITAIRE'} (seuil pédagogique de ${COMPLETUDE_SEUIL} %).`
    : 'Silences non mesurables sans grille rendue.');

  /* E096-06 — mise à l'échelle fictive, explicitement annoncée comme telle. */
  write(c.echelle, Number.isFinite(d.cmParCas)
    ? `Si la grille complète occupait 1 mètre (100 cm), 1 case vaudrait ${formatDecimal(d.cmParCas, 2)} cm : les ${d.coveredCount} case(s) couvertes mesureraient ${formatDecimal(d.cmCouvert, 1)} cm et les ${d.silences} silence(s) ${formatDecimal(d.cmSilence, 1)} cm.`
    : 'Échelle indisponible : aucune case à convertir.');

  /* E096-07 — part de l'ère courante dans la couverture observée. */
  write(c.active, Number.isFinite(d.activeShare)
    ? `L’ère courante « ${d.active.name} » concentre ${d.active.covered}/${d.coveredCount} case(s) couvertes, soit ${formatDecimal(d.activeShare, 1)} % de la couverture observée (sur ${d.active.total} case(s) dans cette ligne).`
    : (d.active
      ? 'Aucune case couverte dans l’ère courante : part non calculable.'
      : 'Aucune ère active repérée dans la matrice.'));

  /* E096-08 — repère visuel, toujours légendé en texte et en aria-label. */
  const barOk = paintBar(r.make, r.barTrack, d);
  write(r.barDesc, barOk
    ? `Repère visuel : ${formatEntier(d.coveredCount)} case(s) couvertes (${d.percent} %) face à ${formatEntier(d.silences)} silence(s) (${formatDecimal(100 - d.percent, 1)} %) ; le trait marque la référence « ${d.ref.label} » à ${formatEntier(d.refPercent)} %. Le texte ci-dessus donne les valeurs exactes.`
    : 'Repère visuel indisponible : les lignes chiffrées ci-dessus restent seules sources.');
  r.bar.setAttribute('aria-label', barOk
    ? `Barre de couverture : ${formatEntier(d.coveredCount)} case(s) couvertes sur ${formatEntier(d.total)} (${d.percent} %), ${formatEntier(d.silences)} silence(s), avec un repère de référence à ${formatEntier(d.refPercent)} %. Le détail chiffré figure dans la liste.`
    : 'Barre de couverture indisponible ; voir les lignes chiffrées.');

  /* E096-09 — synthèse pédagogique en une phrase, toutes grandeurs comprises. */
  write(r.bilan, Number.isFinite(d.percent) && Number.isFinite(d.ecart)
    ? `À retenir : la couverture observée est de ${d.coveredCount}/${d.total} (${d.percent} %), soit ${formatDecimal(d.ratioCover, 2)} × la référence « ${d.ref.label} » et un écart de ${d.ecart >= 0 ? '+' : ''}${d.ecart} case(s) ; ${d.silences} silence(s) restent documentés sur ${d.eras} ère(s) et ${d.domains} domaine(s). Ces nombres sont recalculés depuis la matrice, jamais figés.`
    : 'À retenir : la matrice ne fournit pas encore les grandeurs nécessaires à la comparaison ; aucun chiffre n’est inventé pour combler le vide.');

  /* E096-10 — diagnostic de rendu, témoin d'idempotence. */
  write(r.metric, `Rendus : ${installCount} · couverture : ${hasGrid ? d.coveredCount + '/' + d.total : 'indisponible'} · référence : ${d.ref.key} · silence : ${d.silences} · mouvement réduit : ${r.reduced ? 'oui' : 'non'}.`);

  /* Attributs de données : preuves mécaniques, consultables sans la couleur. */
  setData(r.panel, 'e096Coverage', hasGrid ? String(d.coveredCount) : '');
  setData(r.panel, 'e096Total', hasGrid ? String(d.total) : '');
  setData(r.panel, 'e096Silences', hasGrid ? String(d.silences) : '');
  setData(r.panel, 'e096Points', hasGrid ? String(d.points) : '');
  setData(r.panel, 'e096Domains', String(d.domains));
  setData(r.panel, 'e096Eras', String(d.eras));
  setData(r.panel, 'e096Percent', Number.isFinite(d.percent) ? String(d.percent) : '');
  setData(r.panel, 'e096Reference', d.ref.key);
  setData(r.panel, 'e096ReferenceCells', Number.isFinite(d.refCells) ? String(d.refCells) : '');
  setData(r.panel, 'e096Ecart', Number.isFinite(d.ecart) ? String(d.ecart) : '');
  setData(r.panel, 'e096Ratio', Number.isFinite(d.ratioCover) ? d.ratioCover.toFixed(4) : '');
  setData(r.panel, 'e096Completude', Number.isFinite(d.percent) ? (majoritaire ? 'majoritaire' : 'minoritaire') : '');
  setData(r.panel, 'e096CmParCas', Number.isFinite(d.cmParCas) ? d.cmParCas.toFixed(4) : '');
  setData(r.panel, 'e096ActiveShare', Number.isFinite(d.activeShare) ? d.activeShare.toFixed(2) : '');
  setData(r.panel, 'e096Reduced', r.reduced ? '1' : '0');
  setData(r.panel, 'e096Renders', String(installCount));
}

/* E096-02 : un seul écouteur « change » sur le groupe de références, réattaché
   uniquement si la coque a reconstruit le nœud. Aucun timer, aucun aléa. */
function onReferenceChange(event) {
  const target = event.target;
  if (!target || target.getAttribute('name') !== RADIO_NAME) return;
  if (!REFERENCES.some((item) => item.key === target.value)) return;
  if (target.value === referenceKey) return;
  referenceKey = target.value;
  paint();
}

/* E096-10 : enregistrement unique, CSS unique, panneau unique. */
register('E096', ctx => {
  const make = ctx && typeof ctx.el === 'function' ? ctx.el : null;
  if (!make || !ctx || typeof ctx.css !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points' && ctx.viewId !== 'pointsv2') return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const root = (ctx.layout && typeof ctx.layout.querySelector === 'function')
    ? ctx.layout
    : ((ctx.stage && typeof ctx.stage.querySelector === 'function') ? ctx.stage : null);
  if (!root) return;
  const host = root.querySelector(MATRIX_SELECTOR) || root;
  if (!host || typeof host.appendChild !== 'function') return;

  const mounted = mountPanel(make, host);
  if (boundGroup !== mounted.refsGroup) {
    mounted.refsGroup.addEventListener('change', onReferenceChange);
    boundGroup = mounted.refsGroup;
  }
  REFERENCES.forEach((item) => {
    const input = document.getElementById(item.inputId);
    if (input) input.checked = item.key === referenceKey;
  });

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { make, host, reduced, ...mounted };
  paint();
});
