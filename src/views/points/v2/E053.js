import { register } from './registry.js';
import { state, currentCountry } from '../../../domain/store.js';

/* Lentille POINTS E053 — passe 2 (V2) : grille d'audit de la forme
 * P = (S, R, O, T, E, D, Src, C) rendue lisible et vérifiable (domaine F).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E053.md — chantiers
 * E053-V2-01 à E053-V2-10.
 *
 * Fichier possédé : ce module uniquement. Ni la passe 1
 * (src/views/points/E053.js), ni la vue points.js, ni la coque, ni store.js,
 * ni registry.js, ni une feuille partagée ne sont modifiés. La V2 ajoute UN
 * panneau d'audit distinct dans .points-detail, à côté du panneau de lecture
 * de la passe 1, sans rien retirer ni réordonner du contenu natif.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc strictement sur 'pointsv2'. Tous ses signaux sont préfixés
 * points-v2-e053 / pointsV2E053 / data-points-v2-e053, distincts de ceux de la
 * passe 1 (points-e053, data-points-e053*, pointsE053*).
 *
 * La passe 1 montre les huit champs ; la V2 les AUDITE : chaque valeur porte
 * son origine (fiche source ou DOM de la vue) et son état (renseigné, non
 * exposé, silence explicite), avec un compteur N/8 dérivé des valeurs réelles.
 * Aucune date littérale, aucun total, aucune relation approximative n'est
 * codé en dur. La lecture de la fiche source reste un import seul, en lecture
 * uniquement : aucun état n'est écrit, aucun fichier partagé n'est touché.
 *
 * Invariants : un seul register, une seule feuille (ctx.css), un seul panneau
 * par rendu, un seul marqueur live. Zéro injection de balisage, zéro appel à
 * la console, zéro réseau, zéro aléa, zéro timer, zéro boucle d'animation,
 * aucun écouteur global.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e053';
const SCOPE = 'points-v2-e053';
const PANEL_ID = 'points-v2-e053-audit';
const TITLE_ID = 'points-v2-e053-title';
const LIST_ID = 'points-v2-e053-fields';
const TRUTH_ID = 'points-v2-e053-truth';
const METRICS_ID = 'points-v2-e053-metrics';
const LIVE_ID = 'points-v2-e053-live';

const REDUCED_ATTR = 'data-points-v2-e053-reduced';
const DATA_SCOPE = 'data-points-v2-e053';
const DATA_SIGNATURE = 'data-points-v2-e053-signature';
const DATA_STATE = 'data-points-v2-e053-state';
const DATA_FIELD = 'data-points-v2-e053-field';

/* E053-V2-06 : chaque distinction est codée trois fois — glyphe, mot et
 * renfort de couleur — pour qu'aucune information ne repose sur la couleur
 * seule. Le mot est toujours écrit dans le DOM, y compris en contraste forcé. */
const STATE_VOCAB = {
  filled: { glyph: '■', word: 'renseigné' },
  hidden: { glyph: '◇', word: 'non exposé' },
  silence: { glyph: '∅', word: 'silence explicite' },
};

const HIDDEN_TEXT = 'Non exposé par la vue de base (fiche source indisponible).';
const SILENCE_TEXT = 'Aucune référence renseignée — omission explicite.';

/* E053-V2-08 : mémoire de la dernière signature réellement annoncée. Une
 * navigation vers le même point ne réécrit pas la région live. */
let lastSignature = '';

/* E053-V2-01 : chaque sélecteur commence littéralement par .points-v2-e053,
 * y compris dans les requêtes @media : aucune règle ne peut fuir hors de la
 * vue Points ni recouvrir la feuille points-e053 de la passe 1. */
const CSS = `
  .points-v2-e053 .points-v2-e053-audit {
    box-sizing: border-box;
    margin: 14px 0 0; padding: 11px 12px;
    border: 1px solid var(--line-strong, #3a4252); border-radius: 9px;
    background: rgba(8, 11, 16, .55);
    color: var(--ink-soft, #d7dde6); font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  .points-v2-e053 .points-v2-e053-title {
    margin: 0 0 5px; font-family: var(--serif);
    font-size: 12px; font-weight: 500; color: var(--gold-bright, #e9c98f);
    overflow-wrap: anywhere;
  }
  .points-v2-e053 .points-v2-e053-intro {
    margin: 0 0 8px; color: var(--muted, #9aa4b2); font-size: 9px;
  }
  .points-v2-e053 .points-v2-e053-list {
    margin: 0; padding: 0; list-style: none;
    border-top: 1px solid var(--line, #333b49);
  }
  .points-v2-e053 .points-v2-e053-row {
    display: grid; grid-template-columns: 26px minmax(0, 1fr);
    column-gap: 8px; padding: 6px 0;
    border-bottom: 1px solid var(--line, #333b49); overflow-wrap: anywhere;
  }
  .points-v2-e053 .points-v2-e053-key {
    grid-row: span 2; align-self: start;
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 24px; min-height: 24px; padding: 0 3px;
    border: 1px solid var(--gold, #e6b96f); border-radius: 5px;
    color: var(--gold-bright, #e9c98f); font-size: 10px; font-weight: 600;
  }
  .points-v2-e053 .points-v2-e053-name {
    color: var(--muted-2, #9aa4b2); font-size: 9px;
    letter-spacing: .02em; text-transform: uppercase;
  }
  .points-v2-e053 .points-v2-e053-value {
    margin-top: 1px; color: var(--ink-soft, #d7dde6); font-size: 10px;
  }
  .points-v2-e053 .points-v2-e053-meta {
    display: flex; flex-wrap: wrap; gap: 4px 8px;
    margin-top: 3px; font-size: 9px; color: var(--muted, #9aa4b2);
  }
  .points-v2-e053 .points-v2-e053-glyph { min-width: 1em; font-weight: 700; }
  .points-v2-e053 .points-v2-e053-word { color: var(--ink-soft, #d7dde6); }
  .points-v2-e053 .points-v2-e053-origin { color: var(--muted, #9aa4b2); }
  .points-v2-e053 .points-v2-e053-row.is-filled .points-v2-e053-glyph { color: var(--gold-bright, #e9c98f); }
  .points-v2-e053 .points-v2-e053-row.is-hidden .points-v2-e053-glyph { color: var(--muted-2, #9aa4b2); }
  .points-v2-e053 .points-v2-e053-row.is-silence .points-v2-e053-glyph { color: var(--gold, #e6b96f); }
  .points-v2-e053 .points-v2-e053-truth {
    margin: 9px 0 0; padding-left: 15px; color: var(--muted-2, #9aa4b2); font-size: 9px;
  }
  .points-v2-e053 .points-v2-e053-truth li { margin-bottom: 3px; }
  .points-v2-e053 .points-v2-e053-metrics {
    margin: 8px 0 0; padding-top: 7px; border-top: 1px solid var(--line, #333b49);
    color: var(--gold, #e6b96f); font-size: 9px;
  }
  .points-v2-e053 .points-v2-e053-live {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  .points-v2-e053[data-points-v2-e053-reduced="1"] .points-v2-e053-glyph { transition: none; }
  @media (max-width: 900px) {
    .points-v2-e053 .points-v2-e053-audit { padding: 9px 10px; font-size: 10px; }
    .points-v2-e053 .points-v2-e053-row { grid-template-columns: 24px minmax(0, 1fr); column-gap: 6px; }
    .points-v2-e053 .points-v2-e053-meta { gap: 2px 6px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e053 .points-v2-e053-glyph { transition: none; animation: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e053 .points-v2-e053-audit { border-color: CanvasText; color: CanvasText; }
    .points-v2-e053 .points-v2-e053-key { border-color: CanvasText; color: CanvasText; }
    .points-v2-e053 .points-v2-e053-word,
    .points-v2-e053 .points-v2-e053-value { color: CanvasText; }
  }
  @media print {
    .points-v2-e053 .points-v2-e053-live { display: none; }
    .points-v2-e053 .points-v2-e053-audit { border-color: #666; background: transparent; }
  }
`;

function isBox(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isBox(root) ? root.querySelector(selector) : null;
}

function queryAll(root, selector) {
  return isBox(root) ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function appendAll(node, children) {
  children.forEach((child) => { if (child) node.appendChild(child); });
}

function byId(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

/* E053-V2-09 : réconciliation par id — tout panneau d'un rendu antérieur est
 * retiré avant reconstruction, ce qui interdit le doublon après navigation. */
function clearId(id) {
  byId(id).forEach(removeNode);
}

function familiesOf(point) {
  return Array.isArray(point && point.families) ? point.families : [];
}

/* E053-V2-03 / E053-V2-04 : la fiche source est lue en lecture seule. La
 * liste `visible` reproduit fidèlement points.js:23-28 (filtres domaine,
 * famille, ère, puis pointIndex avec repli sur le premier) : le point audité
 * est exactement celui que le panneau de base affiche. */
function selectedPoint() {
  try {
    const country = currentCountry();
    if (!country || !Array.isArray(country.points)) return null;
    const era = Array.isArray(country.eras) ? country.eras[state.eraIndex] : null;
    let visible = country.points;
    if (state.pointFilterDomain !== '*') {
      visible = visible.filter((point) => point && point.domain === state.pointFilterDomain);
    }
    if (state.pointFilterFamily !== '*') {
      visible = visible.filter((point) => familiesOf(point).indexOf(state.pointFilterFamily) !== -1);
    }
    if (era) visible = visible.filter((point) => point && point.eraId === era.id);
    const index = Number.isInteger(state.pointIndex) ? state.pointIndex : 0;
    return visible[index] || visible[0] || null;
  } catch {
    return null;
  }
}

/* E053-V2-05 : aucun millésime n'est codé en dur. Un signe négatif est une
 * convention de notation traduite en « av. J.-C. », jamais une date inventée. */
function timeValue(point) {
  let raw = point && point.time !== undefined && point.time !== null
    ? String(point.time).trim() : '';
  const precision = point && point.datePrecision
    ? String(point.datePrecision).trim() : '';
  if (!raw) return { value: '', precision: '' };
  if (/^-\d+$/.test(raw)) raw = raw.slice(1) + ' av. J.-C.';
  return {
    value: precision ? raw + ' · précision : ' + precision : raw,
    precision,
  };
}

/* E053-V2-07 : l'absence de source est un état nommé, jamais un vide masqué. */
function sourceValue(point, detail) {
  if (point) {
    const list = Array.isArray(point.sources) ? point.sources.filter(Boolean) : [];
    if (!list.length) return { value: SILENCE_TEXT, stateKey: 'silence' };
    return { value: list.join(', '), stateKey: 'filled' };
  }
  const raw = txt(query(detail, '.points-sources')).replace(/^sources\s*:\s*/i, '');
  if (raw) return { value: raw, stateKey: 'filled' };
  return { value: SILENCE_TEXT, stateKey: 'silence' };
}

/* E053-V2-03 / E053-V2-04 / E053-V2-05 / E053-V2-06 : les huit champs de la
 * forme canonique, chacun avec son origine et son état vérifiables. En repli
 * sans fiche source, seuls les champs réellement présents dans le DOM sont
 * lus ; R et O sont déclarés non exposés, jamais reconstruits heuristiquement. */
function fieldsOf(detail, point) {
  const metas = queryAll(detail, '.points-meta span');
  const metaAt = (index) => txt(metas[index]);
  const stamped = point ? timeValue(point) : { value: metaAt(2), precision: '' };
  const sources = sourceValue(point, detail);
  const origin = point ? 'fiche source' : 'DOM de la vue';
  const predicate = point ? txt(point.predicate) : '';
  const object = point ? txt(point.object) : '';
  const subject = point ? txt(point.subject) : txt(query(detail, '.points-point-title'));
  const scale = point ? txt(point.scale) : metaAt(1);
  const domain = point ? txt(point.domain) : metaAt(0);
  const confidence = point
    ? txt(point.confidence)
    : txt(query(detail, '.points-meta .confidence'));

  return [
    { key: 'S', name: 'Sujet · qui / quoi', value: subject, stateKey: subject ? 'filled' : 'hidden' },
    { key: 'R', name: 'Relation · prédicat', value: predicate || HIDDEN_TEXT, stateKey: predicate ? 'filled' : 'hidden' },
    { key: 'O', name: 'Objet · complément', value: object || HIDDEN_TEXT, stateKey: object ? 'filled' : 'hidden' },
    { key: 'T', name: 'Temps · ancre datée', value: stamped.value, stateKey: stamped.value ? 'filled' : 'hidden' },
    { key: 'E', name: 'Échelle · portée', value: scale, stateKey: scale ? 'filled' : 'hidden' },
    { key: 'D', name: 'Domaine · matrice', value: domain, stateKey: domain ? 'filled' : 'hidden' },
    { key: 'Src', name: 'Sources · références', value: sources.value, stateKey: sources.stateKey },
    { key: 'C', name: 'Certitude · degré', value: confidence, stateKey: confidence ? 'filled' : 'hidden' },
  ].map((field) => ({ ...field, origin, precision: stamped.precision }));
}

function signatureOf(rows) {
  return rows.map((row) => [row.key, row.value, row.origin, row.stateKey].join('~')).join('|');
}

function addTruth(ctx, list, message) {
  list.appendChild(ctx.el('li', '', message));
}

function truthFacts(rows) {
  const first = rows.length ? rows[0] : { origin: 'DOM de la vue', precision: '', stateKey: 'hidden' };
  const sources = rows.filter((row) => row.key === 'Src')[0];
  const sourceFact = sources && sources.stateKey === 'silence'
    ? 'Sources absentes de la fiche : omission explicite, aucun identifiant inventé.'
    : 'Sources : identifiants reportés tels quels depuis la donnée, sans ajout.';
  const precisionFact = first.precision
    ? ' T porte la précision « ' + first.precision + ' » lue dans la donnée.'
    : ' T est lu tel quel dans la donnée, sans millésime codé en dur.';
  return [
    'P = (S, R, O, T, E, D, Src, C) : huit champs définis en §1 de POINT_METHODOLOGY.md.',
    first.origin === 'fiche source'
      ? 'R et O sont relus depuis la fiche source (predicate / object) : la vue de base ne les affiche pas.'
      : 'Fiche source indisponible : R et O sont déclarés non exposés, jamais déduits du texte.',
    sourceFact + precisionFact,
  ];
}

/* E053-V2-02 / E053-V2-08 : le panneau statique est bâti une seule fois par
 * rendu avec ctx.el uniquement. Aucun nœud natif n'est réécrit. */
function buildPanel(ctx, detail, point) {
  clearId(PANEL_ID);

  const audit = ctx.el('section', 'points-v2-e053-audit');
  audit.id = PANEL_ID;
  setAttr(audit, 'role', 'region');
  setAttr(audit, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e053-title',
    'Grille d’audit sémantique · P = (S, R, O, T, E, D, Src, C)');
  title.id = TITLE_ID;
  audit.appendChild(title);
  audit.appendChild(ctx.el('p', 'points-v2-e053-intro',
    'Cette grille vérifie la forme canonique du point affiché. Chaque champ porte son origine et son état : un champ non exposé ou un silence reste explicite, jamais masqué.'));

  const rows = fieldsOf(detail, point);
  const list = ctx.el('ol', 'points-v2-e053-list');
  list.id = LIST_ID;
  rows.forEach((row) => {
    const li = ctx.el('li', 'points-v2-e053-row is-' + row.stateKey);
    setAttr(li, DATA_FIELD, row.key);
    const body = ctx.el('span', 'points-v2-e053-body');
    const meta = ctx.el('span', 'points-v2-e053-meta');
    const vocab = STATE_VOCAB[row.stateKey];
    appendAll(meta, [
      ctx.el('span', 'points-v2-e053-glyph', vocab.glyph),
      ctx.el('span', 'points-v2-e053-word', vocab.word),
      ctx.el('span', 'points-v2-e053-origin', row.origin),
    ]);
    appendAll(body, [
      ctx.el('span', 'points-v2-e053-name', row.name),
      ctx.el('span', 'points-v2-e053-value', row.value || 'non renseigné'),
      meta,
    ]);
    appendAll(li, [ctx.el('span', 'points-v2-e053-key', row.key), body]);
    list.appendChild(li);
  });
  audit.appendChild(list);

  const truth = ctx.el('ul', 'points-v2-e053-truth');
  truth.id = TRUTH_ID;
  truthFacts(rows).forEach((fact) => addTruth(ctx, truth, fact));
  audit.appendChild(truth);

  const filled = rows.filter((row) => row.stateKey === 'filled').length;
  const silences = rows.filter((row) => row.stateKey === 'silence').length;
  const origin = rows.length ? rows[0].origin : 'DOM de la vue';
  const metrics = ctx.el('p', 'points-v2-e053-metrics',
    'Champs vérifiables : ' + filled + '/8 · origine : ' + origin
      + ' · silences explicites : ' + silences + '.');
  metrics.id = METRICS_ID;
  audit.appendChild(metrics);

  const live = ctx.el('p', 'points-v2-e053-live', '');
  live.id = LIVE_ID;
  setAttr(live, 'role', 'status');
  setAttr(live, 'aria-live', 'polite');
  setAttr(live, 'aria-atomic', 'true');
  audit.appendChild(live);

  /* E053-V2-09 : placement purement additif, juste avant la navigation. Aucun
   * nœud existant n'est déplacé ni supprimé ; le panneau passe 1 reste en place. */
  const nav = query(detail, '.points-nav');
  if (nav && nav.parentElement === detail) detail.insertBefore(audit, nav);
  else detail.appendChild(audit);

  return { audit, rows, live, metrics };
}

/* E053-V2-01 / E053-V2-10 : unique point d'entrée, gardes de type, feuille
 * unique, portée unique, ids dédupliqués et repli silencieux sur structure
 * inattendue — une lentille défaillante ne doit jamais casser le rendu. */
function apply(ctx) {
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isBox(ctx.layout) ? ctx.layout : (isBox(ctx.stage) ? ctx.stage : null);
  if (!isBox(layout)) return;
  const detail = query(layout, '.points-detail');
  if (!isBox(detail)) return;

  ctx.css(CSS_ID, CSS);
  if (layout.classList) layout.classList.add(SCOPE);
  setAttr(layout, DATA_SCOPE, '1');

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (layout.hasAttribute && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const panel = buildPanel(ctx, detail, selectedPoint());
  const signature = signatureOf(panel.rows);
  setAttr(panel.audit, DATA_SIGNATURE, signature);
  setAttr(panel.audit, DATA_STATE, 'ready');

  /* E053-V2-08 : la région live reste vide tant que le point audité n'a pas
   * changé ; une navigation vers le même point n'annonce rien de plus. */
  if (signature !== lastSignature) {
    lastSignature = signature;
    panel.live.textContent = panel.metrics.textContent;
  }
}

register('E053', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
