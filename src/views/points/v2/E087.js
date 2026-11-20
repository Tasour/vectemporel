import { register } from './registry.js';

/* Lentille E087 — passe 2 (module POINTS/V2 E087). Qualité & validation :
   * contrôle de conformité des preuves traçables.
   *
   * Dix chantiers V2, E087-V2-01 à E087-V2-10, décrits dans
   * UNIFIED_AUDIT/POINTS/V2/views/E087.md.
   *
   * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
   * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
   * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E087.js) garde
   * la main sur le marquage data-e087-chantier / data-e087-line et sur son index
   * local ; la passe 2 ne réécrit aucun de ces attributs. Elle relit le DOM vivant
   * produit par points.js et les marqueurs posés par la passe 1, puis affiche un
   * tableau de conformité qui vérifie la chaîne de preuves : préfixage et unicité
   * des identifiants, couverture de l'index, unicité et validité des numéros de
   * ligne, non-destructivité du DOM natif, idempotence, accessibilité, feuille
   * unique et repli silencieux.
   *
   * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
   * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
   * global. Aucun libellé de point, aucune ère, aucune source n'est fabriqué :
   * les dix identifiants attendus et l'exigence de préfixe sont des conventions
   * de ce greffon, pas des faits du jeu. Tout DOM statique est bâti avec ctx.el
   * (jamais de balisage injecté), tous les identifiants sont préfixés
   * `points-v2-e087-` et la feuille unique est injectée via
   * ctx.css('points-v2-e087', …) : aucune collision avec la passe 1.
   *
   * Invariants : un seul register, une seule feuille, un seul tableau de bord
   * par rendu ; ids dédupliqués ; zéro réseau, zéro aléa, zéro timer, zéro rAF,
   * zéro sortie de débogage ; chaque état porte un glyphe ET un mot, jamais la
   * couleur seule.
   */

const CSS_ID = 'points-v2-e087';
const SCOPE = 'points-v2-e087';
const PANEL_ID = 'points-v2-e087-panel';
const TITLE_ID = 'points-v2-e087-title';
const VIEW_IDS = ['pointsv2', 'points'];
const PREFIX = 'points-v2-e087-';

/* Conventions déclarées du contrôle : identifiants de chantiers attendus et
   * sélecteurs natifs que la passe 2 doit retrouver intactes. Ce ne sont pas
   * des données issues du jeu : la V2 vérifie une structure, elle n'invente
   * aucun historique. */
const EXPECTED_CHANTIERS = Object.freeze([
  'E087-01', 'E087-02', 'E087-03', 'E087-04', 'E087-05',
  'E087-06', 'E087-07', 'E087-08', 'E087-09', 'E087-10',
]);
const NATIVE_SELECTORS = Object.freeze([
  '.points-title', '.points-grid', '.points-filters', '.points-detail', '.points-nav',
]);

/* E087-V2-09 / E087-V2-10 : feuille unique, préfixée par .points-v2-e087, posée
   * sur .points-detail : aucune fuite. Aucun contrôle interactif ajouté — la région
   * est étiquetée et chaque état est un texte (glyphe + mot). Mouvement réduit,
   * couleurs forcées, impression, repli 620 px (390×844), sans animation propre. */
const CSS = `
.points-v2-e087 .points-v2-e087-panel {
  box-sizing: border-box;
  margin: 16px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-v2-e087 .points-v2-e087-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e087 .points-v2-e087-intro,
.points-v2-e087 .points-v2-e087-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
  overflow-wrap: break-word;
}
.points-v2-e087 .points-v2-e087-block { margin: 0 0 10px; }
.points-v2-e087 .points-v2-e087-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e087 .points-v2-e087-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 4px 10px;
}
.points-v2-e087 .points-v2-e087-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
  overflow-wrap: anywhere;
}
.points-v2-e087 .points-v2-e087-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e087 .points-v2-e087-name { color: var(--ink-soft); }
.points-v2-e087 .points-v2-e087-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px; white-space: nowrap;
}
.points-v2-e087 .points-v2-e087-item.is-absent .points-v2-e087-glyph { color: var(--muted-2); }
.points-v2-e087 .points-v2-e087-item.is-empty .points-v2-e087-glyph { color: var(--gold); }
.points-v2-e087 .points-v2-e087-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
  overflow-wrap: anywhere;
}
.points-v2-e087 .points-v2-e087-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; line-height: 1.5; color: var(--muted-2);
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e087 .points-v2-e087-glyph { transition: none; }
}
@media (max-width: 620px) {
  .points-v2-e087 .points-v2-e087-list { grid-template-columns: 1fr; }
  .points-v2-e087 .points-v2-e087-panel { padding: 10px 12px; }
}
@media (forced-colors: active) {
  .points-v2-e087 .points-v2-e087-panel { border-color: CanvasText; }
  .points-v2-e087 .points-v2-e087-glyph { color: CanvasText; }
}
@media print {
  .points-v2-e087 .points-v2-e087-panel { border-color: #666; background: transparent; }
}
`;

/* E087-V2-10 : gardes structurelles, réutilisées dans tout le module. */
function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E087-V2-01 / E087-V2-02 : garde anti-doublon. Tout nœud portant un id préfixé
   * qui n'est pas celui conservé est retiré du document (un nœud détaché d'un
   * rendu antérieur n'est pas ciblé par querySelectorAll, donc inoffensif). */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E087-V2-01 / E087-V2-02 : audit des identifiants du tableau de bord. On
   * vérifie que chaque id du sous-arbre est préfixé et unique, mesure relevée
   * sur le DOM vivant et non supposée au moment de la construction. */
function auditIds(panel) {
  const all = [panel].concat(nodes(panel, '[id]'));
  const ids = all
    .map((node) => getAttr(node, 'id'))
    .filter((id) => typeof id === 'string' && id.length > 0);
  let duplicates = 0;
  let offPrefix = 0;
  const seen = new Set();
  ids.forEach((id) => {
    if (seen.has(id)) duplicates += 1;
    seen.add(id);
    if (id.indexOf(PREFIX) !== 0) offPrefix += 1;
  });
  return { total: ids.length, duplicates, offPrefix };
}

/* E087-V2-04 : lecture SEULE des marqueurs de la passe 1. Aucune écriture, aucun
   * déplacement : la V2 ne fait que relire data-e087-chantier / data-e087-line
   * tels que la passe 1 les a posés. Le repli est un tableau vide. */
function readPass1(layout) {
  const markers = nodes(layout, '[data-e087-chantier]');
  const chantiers = markers
    .map((node) => getAttr(node, 'data-e087-chantier'))
    .filter((value) => typeof value === 'string' && value.length > 0);
  const panel = document.getElementById('points-e087-panel');
  const entries = nodes(panel, 'li[data-e087-chantier]').map((li) => ({
    id: txt(getAttr(li, 'data-e087-chantier')),
    line: txt(getAttr(li, 'data-e087-line')),
  }));
  return { markers: markers.length, chantiers, entries };
}

/* E087-V2-05 / E087-V2-06 : conformité de l'index et des numéros de ligne. */
function auditIndex(entries) {
  const ids = entries.map((entry) => entry.id);
  const lines = entries.map((entry) => entry.line);
  const distinctIds = new Set(ids);
  const distinctLines = new Set(lines);
  const lineDuplicates = lines.length - distinctLines.size;
  const validLines = lines.filter((line) => /^\d+$/.test(line) && Number(line) > 0).length;
  const expectedCovered = EXPECTED_CHANTIERS.filter((id) => distinctIds.has(id)).length;
  const unknownIds = ids.filter((id) => EXPECTED_CHANTIERS.indexOf(id) === -1).length;
  return {
    count: entries.length,
    distinctIds: distinctIds.size,
    distinctLines: distinctLines.size,
    lineDuplicates,
    validLines,
    expectedCovered,
    unknownIds,
    allHaveLine: entries.length > 0 && validLines === entries.length && lineDuplicates === 0,
    complete: entries.length === EXPECTED_CHANTIERS.length && expectedCovered === EXPECTED_CHANTIERS.length && unknownIds === 0,
  };
}

/* E087-V2-07 : non-destructivité — les sélecteurs natifs de points.js doivent
   * rester présents dans le layout courant. */
function auditNative(layout) {
  const present = NATIVE_SELECTORS.filter((selector) => !!query(layout, selector)).length;
  return { present, expected: NATIVE_SELECTORS.length };
}

/* E087-V2-03 : conformité de construction — aucun attribut de style en chaîne
   * dans le tableau de bord ; la mise en forme vient de la feuille unique. */
function auditInlineStyles(panel) {
  return nodes(panel, '[style]').length;
}

/* E087-V2-08 : signature déterministe — un contenu identique n'entraîne aucune
   * réécriture de la liste ni greffe structurelle supplémentaire. */
function signatureOf(signals) {
  return [
    signals.ids.total, signals.ids.duplicates, signals.ids.offPrefix,
    signals.pass1.markers, signals.index.count, signals.index.distinctIds,
    signals.index.distinctLines, signals.index.validLines,
    signals.index.allHaveLine ? '1' : '0', signals.index.complete ? '1' : '0',
    signals.native.present, signals.inlineStyles,
  ].join('|');
}

function listItem(ctx, glyph, name, state, kind) {
  const li = ctx.el('li', 'points-v2-e087-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e087-glyph', glyph),
    ctx.el('span', 'points-v2-e087-name', name),
    ctx.el('span', 'points-v2-e087-state', state)
  );
  return li;
}

/* E087-V2-09 : structure statique construite une seule fois par rendu avec
   * ctx.el (jamais de balisage injecté) ; seules les listes et les deux lignes
   * dynamiques sont remplacées ensuite par fill() via replaceChildren. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e087-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e087-title', 'Contrôle de conformité des preuves');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e087-intro',
    'Ce tableau relit les marqueurs de traçabilité et l’index de la passe 1 tels qu’ils sont rendus dans le DOM. Il ne réécrit aucun marqueur, ne remplace aucun texte et ne pilote pas l’index : la passe 1 reste maître de la preuve, la V2 en vérifie la conformité.'));

  const blocks = [
    ['points-v2-e087-ids', 'Identifiants', 'points-v2-e087-ids-list'],
    ['points-v2-e087-proof', 'Chaîne de preuves', 'points-v2-e087-proof-list'],
    ['points-v2-e087-dom', 'DOM & rendu', 'points-v2-e087-dom-list'],
  ];
  blocks.forEach(([blockClass, label, listClass]) => {
    const block = ctx.el('div', 'points-v2-e087-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e087-block-title', label));
    block.appendChild(ctx.el('ul', 'points-v2-e087-list ' + listClass));
    panel.appendChild(block);
  });

  panel.appendChild(ctx.el('p', 'points-v2-e087-current', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e087-metrics', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e087-note',
    'Règle de lecture : les dix identifiants attendus, le préfixe du greffon et les cinq sélecteurs natifs sont des conventions déclarées, pas des faits du jeu. Les relevés sont mesurés sur le DOM vivant. Chaque état est écrit avec un signe et un mot, jamais par la couleur seule.'));
  return panel;
}

/* V2-01 à V2-08 : tout le contenu dynamique est écrit ici, à partir des signaux
   * lus plus haut. Chaque ligne porte un glyphe et un mot. */
function fill(ctx, panel, signals) {
  const idsList = query(panel, '.points-v2-e087-ids-list');
  if (idsList) {
    const off = signals.ids.offPrefix;
    const dup = signals.ids.duplicates;
    idsList.replaceChildren(
      listItem(ctx, off ? '!' : '✓', 'Préfixe ' + PREFIX,
        off ? off + ' hors préfixe' : 'conforme', off ? 'absent' : 'present'),
      listItem(ctx, dup ? '!' : '✓', 'Unicité des identifiants',
        dup ? dup + ' doublon(s)' : 'aucun doublon', dup ? 'absent' : 'present'),
      listItem(ctx, '◇', 'Feuille injectée : ' + CSS_ID,
        'une seule', 'present')
    );
  }

  const proofList = query(panel, '.points-v2-e087-proof-list');
  if (proofList) {
    const idx = signals.index;
    proofList.replaceChildren(
      listItem(ctx, idx.complete ? '✓' : '!', 'Index des preuves : ' + idx.count + ' entrée(s)',
        idx.complete ? 'complet' : 'incomplet', idx.complete ? 'present' : 'absent'),
      listItem(ctx, idx.allHaveLine ? '✓' : '!', 'Numéros de ligne : ' + idx.distinctLines + ' distinct(s)',
        idx.allHaveLine ? 'valides et uniques' : 'incohérents', idx.allHaveLine ? 'present' : 'absent'),
      listItem(ctx, '↳', 'Marqueurs relus (lecture seule) : ' + signals.pass1.markers,
        'non réécrits', 'present')
    );
  }

  const domList = query(panel, '.points-v2-e087-dom-list');
  if (domList) {
    const nat = signals.native;
    const nativeOk = nat.present === nat.expected;
    domList.replaceChildren(
      listItem(ctx, nativeOk ? '✓' : '!', 'Sélecteurs natifs : ' + nat.present + '/' + nat.expected,
        nativeOk ? 'intacts' : 'altérés', nativeOk ? 'present' : 'absent'),
      listItem(ctx, signals.inlineStyles ? '!' : '✓', 'Styles en chaîne : ' + signals.inlineStyles,
        signals.inlineStyles ? 'présents' : 'aucun', signals.inlineStyles ? 'absent' : 'present'),
      listItem(ctx, '▤', 'Repli mobile & couleurs forcées',
        'déclarés', 'present')
    );
  }

  const currentLine = query(panel, '.points-v2-e087-current');
  if (currentLine) {
    currentLine.textContent = signals.index.complete && signals.index.allHaveLine
      ? 'Chaîne de preuves conforme : lecture seule, aucune marque réécrite.'
      : 'Chaîne de preuves partielle : l’index ou les numéros de ligne sont incomplets.';
  }

  const metrics = query(panel, '.points-v2-e087-metrics');
  if (metrics) {
    metrics.textContent = 'Conformité : ' + signals.ids.total + ' identifiant'
      + plural(signals.ids.total, '', 's') + ' · ' + signals.ids.duplicates + ' doublon'
      + plural(signals.ids.duplicates, '', 's') + ' · index ' + signals.index.count + '/'
      + EXPECTED_CHANTIERS.length + ' · ' + signals.index.distinctLines + ' ligne'
      + plural(signals.index.distinctLines, '', 's') + ' unique'
      + plural(signals.index.distinctLines, '', 's') + ' · ' + signals.native.present + '/'
      + signals.native.expected + ' sélecteurs natifs · ' + signals.inlineStyles + ' style'
      + plural(signals.inlineStyles, '', 's') + ' en chaîne.';
  }

  setAttr(panel, 'data-v2-e087-ids', String(signals.ids.total));
  setAttr(panel, 'data-v2-e087-duplicates', String(signals.ids.duplicates));
  setAttr(panel, 'data-v2-e087-offprefix', String(signals.ids.offPrefix));
  setAttr(panel, 'data-v2-e087-markers', String(signals.pass1.markers));
  setAttr(panel, 'data-v2-e087-index', String(signals.index.count));
  setAttr(panel, 'data-v2-e087-lines', String(signals.index.distinctLines));
  setAttr(panel, 'data-v2-e087-complete', signals.index.complete ? '1' : '0');
  setAttr(panel, 'data-v2-e087-valid', signals.index.allHaveLine ? '1' : '0');
  setAttr(panel, 'data-v2-e087-native', String(signals.native.present));
  setAttr(panel, 'data-v2-e087-inline', String(signals.inlineStyles));
}

/* E087-V2-01 / E087-V2-08 / E087-V2-10 : unique point d'entrée, gardes
   * structurelles, feuille unique, portée unique, ids dédupliqués, repli
   * silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  if (!isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  detail.classList.add(SCOPE);

  const pass1 = readPass1(layout);
  const signals = {
    ids: { total: 0, duplicates: 0, offPrefix: 0 },
    pass1: { markers: pass1.markers },
    index: auditIndex(pass1.entries),
    native: auditNative(layout),
    inlineStyles: 0,
  };

  /* E087-V2-02 : réconciliation par id. On conserve le tableau déjà monté dans
    * le détail courant, on retire les doublons d'un rendu antérieur, puis on
    * garantit l'unicité du titre. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    detail.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));

  /* Les compteurs d'identifiants et de styles sont mesurés après la greffe du
   * panneau, puis la signature est recalculée pour refléter l'état réel. */
  signals.ids = auditIds(panel);
  signals.inlineStyles = auditInlineStyles(panel);
  const finalSig = signatureOf(signals);

  if (getAttr(panel, 'data-v2-e087-signature') !== finalSig) {
    setAttr(panel, 'data-v2-e087-signature', finalSig);
    fill(ctx, panel, signals);
  }

  setAttr(panel, 'data-v2-e087', '1');
}

register('E087', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
