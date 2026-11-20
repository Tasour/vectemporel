import { register } from './registry.js';

/* Lentille POINTS E094 — passe 2 (V2) : défi en 5 temps — carnet de bord,
 * glossaire de falsifiabilité et reproductibilité (domaine J).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E094.md — chantiers V2 E094-01 à
 * E094-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E094.js), aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js, store, routeur) n'est modifié.
 *
 * La passe 1 conduit un défi interactif (prédiction → réglage → résultat
 * attendu → falsification → débrief). La V2 ne le rejoue pas et ne le remplace
 * pas : elle ajoute un CARNET DE BORD complémentaire, en lecture pour l'essentiel,
 * qui rend explicites le protocole, son vocabulaire, ses grandeurs et sa limite.
 * Les dix chantiers sont donc neufs et distincts de ceux de la passe 1, tout en
 * restant dans le même thème (défi en 5 temps, prédiction → falsification).
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) ;
 * le filtre accepte aussi 'points' pour rester inoffensif si la coque l'appelle
 * avec l'identifiant de la passe 1. Aucune dépendance vers le store.
 *
 * Invariants : un seul register, une seule feuille (ctx.css), une seule portée
 * (.points-v2-e094), un seul panneau par rendu, une seule région live locale,
 * ids tous préfixés points-v2-e094- et dédupliqués, tout DOM bâti avec ctx.el
 * (jamais d'injection de balisage), aucune écriture dans les miroirs de la passe 1.
 * Zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro écouteur global, zéro
 * MutationObserver, aucune sortie de débogage. Chiffres recalculés depuis le DOM.
 */

const CSS_ID = 'points-v2-e094';
const SCOPE = 'points-v2-e094';
const VIEW_IDS = Object.freeze(['pointsv2', 'points']);

const PANEL_ID = 'points-v2-e094-panel';
const TITLE_ID = 'points-v2-e094-title';
const PROTOCOL_ID = 'points-v2-e094-protocol';
const GLOSSARY_ID = 'points-v2-e094-glossary';
const WITNESS_ID = 'points-v2-e094-witness';
const SILENCE_ID = 'points-v2-e094-silence';
const METRICS_ID = 'points-v2-e094-metrics';
const REFRAME_ID = 'points-v2-e094-reframe';
const TOGGLE_ID = 'points-v2-e094-toggle';
const DETAIL_ID = 'points-v2-e094-detail';
const STATUS_ID = 'points-v2-e094-status';

const REDUCED_ATTR = 'data-points-v2-e094-reduced';
const DATA_SCOPE = 'pointsV2E094';
const DATA_PANEL = 'pointsV2E094Panel';

/* Le protocole statique est la source unique des cinq temps affichés (V2-03). */
const STEPS = Object.freeze([
  Object.freeze({ label: 'Prédiction', detail: 'Énoncer une affirmation réfutable avant toute observation.' }),
  Object.freeze({ label: 'Réglage', detail: 'Modifier une seule chose dans la vue, un filtre natif de préférence.' }),
  Object.freeze({ label: 'Résultat attendu', detail: 'Dire ce qui devrait être observé si l’affirmation était vraie.' }),
  Object.freeze({ label: 'Falsification', detail: 'Confronter l’attente au relevé : une seule contradiction suffit.' }),
  Object.freeze({ label: 'Débrief', detail: 'Conclure depuis les faits relevés et nommer l’angle mort.' }),
]);

/* Glossaire : chaque terme est défini à sa première occurrence (V2-04). */
const GLOSSARY = Object.freeze([
  Object.freeze(['Affirmation falsifiable', 'Énoncé que l’observation peut contredire ; s’il ne peut jamais être contredit, il n’apprend rien.']),
  Object.freeze(['Prédiction', 'Ce que l’on annonce avant de regarder le résultat, pour ne pas raisonner après coup.']),
  Object.freeze(['Réfutation', 'Observation qui invalide la prédiction ; elle est plus informative qu’une confirmation.']),
  Object.freeze(['Relevé', 'Valeur lue dans le DOM rendu, datée du moment de l’observation, jamais estimée.']),
  Object.freeze(['Référence', 'Grandeur de comparaison choisie avant le test, ici le total des cellules de la matrice.']),
  Object.freeze(['Angle mort', 'Ce que le test ne mesure pas et qui reste vrai ou faux sans être tranché ici.']),
]);

/* Mémo dévoilé par la bascule (V2-09) : règles de lecture, pas des chiffres. */
const MEMO = Object.freeze([
  'Un test n’a de valeur que si l’on a dit à l’avance ce qui le ferait échouer.',
  'Changer plusieurs réglages à la fois empêche d’attribuer la différence.',
  'Une stabilité observée n’est pas une preuve : elle peut venir d’un réglage sans effet.',
  'La conclusion porte sur l’affichage, pas sur la vérité historique des points.',
]);

/* Traduction déterministe des miroirs de la passe 1 (V2-05) : lecture seule. */
const STEP_NAMES = Object.freeze({ '1': 'Prédiction', '2': 'Réglage', '3': 'Résultat attendu', '4': 'Falsification', '5': 'Débrief' });
const PREDICTION_NAMES = Object.freeze({ change: 'chiffres modifiés', same: 'chiffres identiques' });
const OUTCOME_NAMES = Object.freeze({ confirmed: 'confirmée', refuted: 'infirmée', pending: 'en attente' });

/* Feuille unique. Tout sélecteur commence littéralement par `.points-v2-e094`,
 * y compris dans les @media : aucune règle ne peut fuir hors de la vue Points V2.
 * Aucune ressource externe, aucune animation continue, cibles tactiles ≥ 36 px. */
const CSS = `
  /* E094-V2-01 : portée unique, ancrée sur .points-layout. */
  .points-v2-e094 { --v2-e094-accent: var(--gold-bright, #e9c98f); }
  /* E094-V2-02 : panneau en flux, non modal, ancré dans .points-matrix. */
  .points-v2-e094 .points-v2-e094-panel {
    box-sizing: border-box;
    margin: 12px 0 4px; padding: 12px 14px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
    background: rgba(8, 11, 16, .72); color: var(--ink-soft, #d8d8d8);
    font-size: 11px; line-height: 1.55; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .points-v2-e094 .points-v2-e094-title {
    margin: 0 0 6px; font-family: var(--serif, serif);
    font-size: 15px; font-weight: 600; color: var(--v2-e094-accent);
  }
  .points-v2-e094 .points-v2-e094-intro,
  .points-v2-e094 .points-v2-e094-note {
    margin: 0 0 8px; font-size: 11px; line-height: 1.5;
    color: var(--muted-2, #808080);
  }
  .points-v2-e094 .points-v2-e094-block { margin: 0 0 10px; }
  .points-v2-e094 .points-v2-e094-block-title {
    margin: 0 0 4px; font-size: 11px; font-weight: 700;
    letter-spacing: .03em; color: var(--gold, #e6b96f);
  }
  /* E094-V2-03 : protocole statique, lisible sans JS. */
  .points-v2-e094 .points-v2-e094-protocol {
    list-style: none; margin: 0; padding: 0;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 4px 10px;
  }
  .points-v2-e094 .points-v2-e094-step {
    min-height: 24px; padding: 3px 0; color: var(--ink-soft, #d8d8d8);
    font-size: 11px; line-height: 1.4;
  }
  .points-v2-e094 .points-v2-e094-step-index {
    display: inline-block; min-width: 1.6em; color: var(--v2-e094-accent);
    font-weight: 700;
  }
  .points-v2-e094 .points-v2-e094-step-detail { color: var(--muted, #9a9a9a); }
  /* E094-V2-04 / E094-V2-05 : listes de définitions, valeurs tabulaires. */
  .points-v2-e094 .points-v2-e094-glossary,
  .points-v2-e094 .points-v2-e094-witness {
    display: grid; grid-template-columns: minmax(110px, auto) minmax(0, 1fr);
    gap: 3px 10px; margin: 0; font-size: 11px;
  }
  .points-v2-e094 .points-v2-e094-glossary dt,
  .points-v2-e094 .points-v2-e094-witness dt {
    color: var(--muted, #9a9a9a); font-weight: 600;
  }
  .points-v2-e094 .points-v2-e094-glossary dd,
  .points-v2-e094 .points-v2-e094-witness dd { margin: 0; overflow-wrap: anywhere; }
  /* E094-V2-06 / E094-V2-07 : grandeurs et encadré « silence ». */
  .points-v2-e094 .points-v2-e094-metrics {
    margin: 0 0 8px; padding: 6px 9px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    color: var(--v2-e094-accent); font-size: 11px;
  }
  .points-v2-e094 .points-v2-e094-silence {
    margin: 0 0 8px; padding: 6px 9px;
    border-left: 2px solid var(--gold, #e6b96f);
    background: rgba(230, 185, 111, .06); color: var(--ink, #f5e9d0);
  }
  /* E094-V2-08 : aide à la reformulation, toujours visible. */
  .points-v2-e094 .points-v2-e094-reframe {
    margin: 0 0 8px; padding: 6px 9px;
    border: 1px dashed var(--line-strong, #5b5b5b); border-radius: 8px;
    color: var(--ink-soft, #d8d8d8);
  }
  /* E094-V2-09 : bascule et mémo, cible ≥ 36 px et focus visible. */
  .points-v2-e094 .points-v2-e094-toggle {
    min-height: 36px; margin: 2px 0 6px; padding: 7px 12px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--v2-e094-accent);
    font: inherit; font-size: 11px; cursor: pointer;
    transition: background-color .18s linear;
  }
  .points-v2-e094 .points-v2-e094-toggle:hover { border-color: var(--v2-e094-accent); }
  .points-v2-e094 .points-v2-e094-detail {
    margin: 0 0 8px; padding: 6px 9px;
    border-left: 2px solid var(--line-strong, #5b5b5b);
    color: var(--ink-soft, #d8d8d8);
    transition: opacity .18s linear;
  }
  .points-v2-e094 .points-v2-e094-detail[hidden] { display: none; }
  .points-v2-e094 .points-v2-e094-detail li { min-height: 24px; margin: 0 0 3px; }
  /* E094-V2-09 : région live locale, masquée mais hors du bloc remplacé. */
  .points-v2-e094 .points-v2-e094-status {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  .points-v2-e094 .points-v2-e094-panel:focus-visible,
  .points-v2-e094 .points-v2-e094-toggle:focus-visible {
    outline: 2px solid var(--v2-e094-accent); outline-offset: 3px;
  }
  /* E094-V2-10 : repli responsive. */
  @media (max-width: 620px) {
    .points-v2-e094 .points-v2-e094-panel { padding: 10px; }
    .points-v2-e094 .points-v2-e094-glossary,
    .points-v2-e094 .points-v2-e094-witness { grid-template-columns: minmax(0, 1fr); }
    .points-v2-e094 .points-v2-e094-protocol { grid-template-columns: minmax(0, 1fr); }
    .points-v2-e094 .points-v2-e094-toggle {
      width: 100%; min-height: 44px;
    }
  }
  /* E094-V2-10 : mouvement réduit, couplage JS ET media query. */
  .points-v2-e094[data-points-v2-e094-reduced="1"] .points-v2-e094-toggle,
  .points-v2-e094[data-points-v2-e094-reduced="1"] .points-v2-e094-detail { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e094 .points-v2-e094-toggle,
    .points-v2-e094 .points-v2-e094-detail { transition: none; }
  }
  /* E094-V2-10 : couleurs forcées, aucun état porté par la seule couleur. */
  @media (forced-colors: active) {
    .points-v2-e094 .points-v2-e094-panel,
    .points-v2-e094 .points-v2-e094-metrics,
    .points-v2-e094 .points-v2-e094-toggle {
      border-color: CanvasText; color: CanvasText; background: Canvas;
    }
    .points-v2-e094 .points-v2-e094-silence { border-left-color: Highlight; }
  }
`;

/* État volatile propre à la V2 : aucune écriture dans les miroirs de la passe 1. */
let lastAnnouncement = '';
let detailOpen = false;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function byId(root, id) {
  return root && typeof root.querySelector === 'function' ? root.querySelector('#' + id) : null;
}

/* Toutes les grandeurs sont recomputées depuis le DOM rendu (V2-06, V2-07). */
function measures(matrix) {
  const cells = nodes(matrix, '.points-grid .points-cell');
  const rows = nodes(matrix, '.points-grid .points-grid-row');
  const eras = rows.filter((row) => !row.classList.contains('is-head')).length;
  const active = rows.find((row) => row.classList.contains('is-active'));
  const era = txt(active ? active.querySelector('.points-era') : null) || 'ère courante';
  let filled = 0;
  let total = 0;
  cells.forEach((cell) => {
    if (cell.classList.contains('has-points')) filled += 1;
    const value = parseInt(txt(cell), 10);
    if (Number.isFinite(value) && value > 0) total += value;
  });
  const silent = cells.length - filled;
  const share = cells.length ? Math.round((filled / cells.length) * 100) : 0;
  return { cells: cells.length, filled, silent, total, eras, era, share };
}

/* Lecture seule des miroirs écrits par la passe 1 sur .points-matrix (V2-05). */
function witnessOf(matrix) {
  const data = matrix && matrix.dataset ? matrix.dataset : {};
  const rawStep = data.pointsE094Step || '';
  const rawPrediction = data.pointsE094Prediction || '';
  const rawFilter = data.pointsE094Filter || '';
  const rawOutcome = data.pointsE094Outcome || '';
  return [
    ['Temps du défi', STEP_NAMES[rawStep] || (rawStep || 'non renseigné')],
    ['Prédiction', PREDICTION_NAMES[rawPrediction] || (rawPrediction || 'non renseignée')],
    ['Filtre observé', rawFilter && rawFilter !== 'none' ? rawFilter : 'non renseigné'],
    ['Confrontation', OUTCOME_NAMES[rawOutcome] || (rawOutcome || 'non renseignée')],
  ];
}

function fillPairs(dl, ctx, pairs, termClass, valueClass) {
  dl.replaceChildren();
  pairs.forEach(([key, value]) => {
    dl.appendChild(ctx.el('dt', termClass, key));
    dl.appendChild(ctx.el('dd', valueClass, value));
  });
}

function announce(panel, text) {
  if (!text || text === lastAnnouncement) return;
  const status = byId(panel, STATUS_ID);
  if (!status || !status.isConnected) return;
  lastAnnouncement = text;
  status.textContent = text;
}

function onToggle(panel, toggle, detail) {
  detailOpen = !detailOpen;
  detail.hidden = !detailOpen;
  put(toggle, 'aria-expanded', detailOpen ? 'true' : 'false');
  announce(panel, detailOpen ? 'Mémo du protocole affiché.' : 'Mémo du protocole masqué.');
}

/* Structure statique construite une seule fois par rendu neuf (V2-02). */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e094-panel');
  panel.id = PANEL_ID;
  put(panel, 'role', 'region');
  put(panel, 'aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;

  const title = ctx.el('h2', 'points-v2-e094-title', 'Carnet de bord du défi — comprendre la falsification');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(ctx.el('p', 'points-v2-e094-intro',
    'Ce carnet accompagne le défi en 5 temps sans le rejouer : il rend lisibles le protocole, son vocabulaire, ses grandeurs et sa limite. Tout est relevé dans la vue ; aucun résultat n’est deviné.'));

  /* V2-03 : protocole statique, visible sans JavaScript. */
  const protocolBlock = ctx.el('div', 'points-v2-e094-block');
  protocolBlock.appendChild(ctx.el('p', 'points-v2-e094-block-title', 'Le protocole en cinq temps'));
  const protocol = ctx.el('ol', 'points-v2-e094-protocol');
  protocol.id = PROTOCOL_ID;
  STEPS.forEach((step, index) => {
    const item = ctx.el('li', 'points-v2-e094-step');
    item.appendChild(ctx.el('span', 'points-v2-e094-step-index', String(index + 1) + '.'));
    item.appendChild(ctx.el('span', 'points-v2-e094-step-name', step.label));
    item.appendChild(ctx.el('span', 'points-v2-e094-step-detail', ' — ' + step.detail));
    protocol.appendChild(item);
  });
  protocolBlock.appendChild(protocol);
  panel.appendChild(protocolBlock);

  /* V2-04 : glossaire, chaque terme défini à sa première occurrence. */
  const glossaryBlock = ctx.el('div', 'points-v2-e094-block');
  glossaryBlock.appendChild(ctx.el('p', 'points-v2-e094-block-title', 'Glossaire de la falsifiabilité'));
  const glossary = ctx.el('dl', 'points-v2-e094-glossary');
  glossary.id = GLOSSARY_ID;
  fillPairs(glossary, ctx, GLOSSARY, 'points-v2-e094-term', 'points-v2-e094-def');
  glossaryBlock.appendChild(glossary);
  panel.appendChild(glossaryBlock);

  /* E094-V2-05 : miroir témoin en lecture seule des signaux de la passe 1. */
  const witnessBlock = ctx.el('div', 'points-v2-e094-block');
  witnessBlock.appendChild(ctx.el('p', 'points-v2-e094-block-title', 'Miroir témoin du défi (lecture seule)'));
  const witness = ctx.el('dl', 'points-v2-e094-witness');
  witness.id = WITNESS_ID;
  witnessBlock.appendChild(witness);
  panel.appendChild(witnessBlock);

  /* E094-V2-06 / E094-V2-07 : grandeurs et encadré « silence ». */
  const metrics = ctx.el('p', 'points-v2-e094-metrics', '');
  metrics.id = METRICS_ID;
  panel.appendChild(metrics);
  const silence = ctx.el('p', 'points-v2-e094-silence', '');
  silence.id = SILENCE_ID;
  panel.appendChild(silence);

  /* V2-08 : aide à la reformulation, toujours visible. */
  const reframe = ctx.el('p', 'points-v2-e094-reframe',
    'Pour reformuler : « si je change exactement ce réglage, alors je devrais voir … ; si je vois contraire, mon affirmation est fausse. » Une prédiction sans condition de défaite n’est pas testable.');
  reframe.id = REFRAME_ID;
  panel.appendChild(reframe);

  /* V2-09 : bascule de dévoilement (aria-expanded) et mémo. */
  const toggle = ctx.el('button', 'points-v2-e094-toggle', 'Afficher le mémo du protocole');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  put(toggle, 'aria-controls', DETAIL_ID);
  put(toggle, 'aria-expanded', 'false');

  const detail = ctx.el('div', 'points-v2-e094-detail');
  detail.id = DETAIL_ID;
  detail.hidden = true;
  const memoList = ctx.el('ul', 'points-v2-e094-memo');
  MEMO.forEach((rule) => memoList.appendChild(ctx.el('li', 'points-v2-e094-memo-item', rule)));
  detail.appendChild(memoList);
  toggle.addEventListener('click', () => onToggle(panel, toggle, detail));

  panel.appendChild(toggle);
  panel.appendChild(detail);

  const status = ctx.el('p', 'points-v2-e094-status', '');
  status.id = STATUS_ID;
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');
  put(status, 'aria-atomic', 'true');
  panel.appendChild(status);

  return panel;
}

/* Rafraîchit uniquement les parties dérivées du DOM (V2-05/06/07/09/10). */
function refresh(ctx, matrix, panel) {
  const m = measures(matrix);
  const metrics = byId(panel, METRICS_ID);
  if (metrics) {
    metrics.textContent = 'Grandeurs relevées : ' + m.cells + ' cellules · ' + m.filled
      + ' cellules renseignées (' + m.share + ' % du total des cellules, référence) · '
      + m.total + ' points comptés · ' + m.eras + ' ères, en cours : ' + m.era + '.';
  }
  const silence = byId(panel, SILENCE_ID);
  if (silence) {
    silence.textContent = 'Un silence est une donnée : ' + m.silent
      + ' cellule(s) sans point sur ' + m.cells
      + '. Une case vide ne dit pas « aucun point n’existe », seulement qu’aucun point validé n’est compté ici.';
  }
  const witness = byId(panel, WITNESS_ID);
  if (witness) fillPairs(witness, ctx, witnessOf(matrix), 'points-v2-e094-term', 'points-v2-e094-value');

  const detail = byId(panel, DETAIL_ID);
  const toggle = byId(panel, TOGGLE_ID);
  if (detail) detail.hidden = !detailOpen;
  if (toggle) {
    put(toggle, 'aria-expanded', detailOpen ? 'true' : 'false');
    const label = detailOpen ? 'Masquer le mémo du protocole' : 'Afficher le mémo du protocole';
    if (txt(toggle) !== label) toggle.textContent = label;
  }
}

function apply(ctx) {
  /* V2-01 : gardes de type et filtre sur l'identifiant de la passe V2. */
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout && typeof ctx.layout.querySelector === 'function' ? ctx.layout : null;
  if (!layout) return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;

  /* V2-01 : une seule feuille (cssOnce) et une seule portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA_SCOPE] = '1';

  /* V2-10 : mouvement réduit, signalé sans écraser les autres attributs. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;

  /* V2-02 / V2-10 : un seul panneau par rendu, réutilisé par id. Un nœud
   * périmé laissé par un rendu précédent est retiré avant reconstruction. */
  let panel = byId(matrix, PANEL_ID);
  if (!panel) {
    const root = stage || (typeof document !== 'undefined' ? document : null);
    const stale = root && root.querySelector ? root.querySelector('#' + PANEL_ID) : null;
    if (stale && stale.parentElement !== matrix) stale.remove();
    lastAnnouncement = '';
    panel = buildPanel(ctx);
    matrix.appendChild(panel);
  } else if (panel.parentElement !== matrix) {
    matrix.appendChild(panel);
  }

  if (panel.dataset) panel.dataset[DATA_PANEL] = '1';
  refresh(ctx, matrix, panel);
}

/* Un seul register, enveloppé dans un try/catch : une lentille défaillante ne
 * doit jamais interrompre le rendu des quatre-vingt-dix-neuf autres. */
register('E094', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
