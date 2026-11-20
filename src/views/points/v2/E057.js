import { register } from './registry.js';

/* Lentille E057 — passe 2 (module POINTS/V2 E057). Lecture sémantique des
 * silences de la matrice rendus par la passe 1 (src/views/points/E057.js).
 *
 * Dix chantiers V2, E057-V2-01 à E057-V2-10, documentés dans
 * UNIFIED_AUDIT/POINTS/V2/views/E057.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 garde la main sur le marquage des
 * cellules, les étiquettes, l'encart, le résumé, la légende et les badges d'ère.
 * La V2 ne modifie aucun de ces signaux : elle les RELIT dans le DOM réel et les
 * restitue sous forme de tableau ère / silences / couverture, de vocabulaire
 * d'états, de fiche de vérité et de limite falsifiable. Aucune donnée
 * historique n'est inventée : ères, cellules, silences et libellés proviennent
 * du DOM produit par la passe 1, lui-même dérivé de la grille de points.js et
 * de POINT_METHODOLOGY.md §3 et §4.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état applicative, aucun
 * écouteur global, aucune région live supplémentaire. Les seules écritures sur
 * un nœud de la passe 1 sont des aria-describedby complétés (jamais écrasés)
 * sur son résumé et sa légende.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * identifiants préfixés points-v2-e057- ; tout DOM bâti avec ctx.el, jamais de
 * réinterprétation de balisage ; zéro réseau, zéro aléa, zéro sortie de
 * débogage, zéro minutage, zéro boucle d'animation ; chaque état porte un
 * glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e057';
const SCOPE = 'points-v2-e057';
const PANEL_ID = 'points-v2-e057-panel';
const TITLE_ID = 'points-v2-e057-title';
const TABLE_ID = 'points-v2-e057-table';
const BODY_ID = 'points-v2-e057-body';
const FACTS_ID = 'points-v2-e057-facts';
const STATES_ID = 'points-v2-e057-etats';
const LIMIT_ID = 'points-v2-e057-limite';
const METRICS_ID = 'points-v2-e057-metrics';
const SOURCE_ID = 'points-v2-e057-source';
const NOTE_ID = 'points-v2-e057-note';
const REDUCED_ATTR = 'data-v2-e057-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Ids et classes de la passe 1, lus en lecture seule — jamais réécrits. */
const P1_NOTE_ID = 'points-e057-note';
const P1_SUMMARY_ID = 'points-e057-summary';
const P1_LEGEND_ID = 'points-e057-legend';
const P1_GLYPH_CLASS = 'points-e057-glyph';

/* E057-V2-05 : trois états nommés, lus dans la légende de la passe 1. La table
 * ci-dessous ne sert que de repli si le texte de la légende était absent, pour
 * ne jamais afficher un état muet. Elle ne codifie aucun état nouveau. */
const STATES = [
  { mark: '■', word: 'Cellule avec points : au moins un point validé.' },
  { mark: '·', word: 'Silence : aucune donnée pour cette ère × ce domaine.' },
  { mark: '◇', word: 'Omission justifiée : silence documenté par un ID d’omission.' },
];

/* E057-V2-01 / V2-09 / V2-10 : feuille unique, entièrement préfixée par
 * .points-v2-e057, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. La seule transition porte sur la couleur des marqueurs. */
const CSS = `
.points-v2-e057 .points-v2-e057-panel {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6);
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e057 .points-v2-e057-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e057 .points-v2-e057-intro,
.points-v2-e057 .points-v2-e057-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e057 .points-v2-e057-fait {
  margin: 0 0 6px; padding-left: 10px;
  border-left: 2px solid var(--line-strong);
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e057 .points-v2-e057-etats {
  margin: 8px 0; padding: 0; list-style: none;
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e057 .points-v2-e057-etats li { margin-bottom: 3px; }
.points-v2-e057 .points-v2-e057-glyph {
  display: inline-block; min-width: 1.2em; font-weight: 700;
}
.points-v2-e057 .points-v2-e057-table {
  width: 100%; border-collapse: collapse; margin: 8px 0;
  font-size: 11px; line-height: 1.45;
}
.points-v2-e057 .points-v2-e057-table caption {
  text-align: left; margin: 0 0 6px;
  font-size: 11px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e057 .points-v2-e057-table th,
.points-v2-e057 .points-v2-e057-table td {
  border: 1px solid var(--line); padding: 5px 7px;
  text-align: left; vertical-align: top;
}
.points-v2-e057 .points-v2-e057-table thead th {
  color: var(--gold-bright); font-weight: 600; background: rgba(255, 255, 255, .03);
}
.points-v2-e057 .points-v2-e057-table tbody th {
  color: var(--ink); font-weight: 600; white-space: nowrap;
}
.points-v2-e057 .points-v2-e057-table .points-v2-e057-etat {
  color: var(--gold-bright); transition: color .18s linear;
}
.points-v2-e057 .points-v2-e057-metrics,
.points-v2-e057 .points-v2-e057-source {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e057 .points-v2-e057-source { color: var(--muted-2); }
.points-v2-e057 .points-v2-e057-limite {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
}
.points-v2-e057 .points-v2-e057-limite h3 {
  margin: 0 0 6px; font-size: 12px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e057 .points-v2-e057-limite ol {
  margin: 0; padding-left: 20px;
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e057 .points-v2-e057-limite li { margin-bottom: 4px; }
.points-v2-e057[` + REDUCED_ATTR + `="1"] .points-v2-e057-etat { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e057 .points-v2-e057-etat { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e057 .points-v2-e057-table th,
  .points-v2-e057 .points-v2-e057-table td { padding: 4px 5px; }
  .points-v2-e057 .points-v2-e057-table { font-size: 10px; }
}
@media (forced-colors: active) {
  .points-v2-e057 .points-v2-e057-panel,
  .points-v2-e057 .points-v2-e057-table th,
  .points-v2-e057 .points-v2-e057-table td { border-color: CanvasText; }
  .points-v2-e057 .points-v2-e057-etat { color: CanvasText; }
}
@media print {
  .points-v2-e057 .points-v2-e057-panel { border-color: #666; background: transparent; }
  .points-v2-e057 .points-v2-e057-limite { break-inside: avoid; }
}
`;

/* E057-V2-07 : fiche de vérité — trois faits sourcés de POINT_METHODOLOGY.md
 * (règles 4 et 7, §4), aucun fait daté. Trois grandeurs chiffrées, dont une
 * comparée à une référence : la couverture mesurée rapportée aux 100 % du §4. */
const FACTS = [
  '§3 — Règle 7 : les silences sont des données ; `aucune source` doit être explicite, jamais un vide masqué. Un « · » est une absence nommée, pas un manque à taire.',
  '§3 — Règle 4 : pour chaque ère × domaine, il faut au moins un point valide ou un vide justifié. La cellule est donc l’unité de mesure, pas le point isolé.',
  '§4 — Couverture 100 % : chaque domaine est couvert par un point valide ou vide justifié avec ID d’omission ; aucun statut partiel ni vide non traité ne subsiste. La couverture est explicite et binaire.',
];

/* E057-V2-08 : limite falsifiable en cinq temps, alignée sur les angles morts
 * de la passe 1 (elle rend le silence visible, elle ne décide pas s'il est
 * justifié ; elle mesure des cellules, pas des points). */
const LIMIT = [
  'Prédiction : si un silence est bien documenté, chaque cellule sans point porte une étiquette, un badge d’ère et une description associée dans la passe 1.',
  'Réglage : filtrer la matrice sur une seule ère, puis lire la ligne correspondante du tableau V2 et le badge `data-silences` de cette ère.',
  'Résultat attendu : le nombre de silences de la ligne V2 et le badge de la passe 1 restent égaux ; le total global recount les mêmes cellules.',
  'Falsification : si une cellule sans `has-points` n’est pas marquée `is-silence`, ou si le badge et le tableau divergent, la lecture V2 est contredite par le DOM.',
  'Débrief : angle mort — la V2 ne décide pas si un silence est une omission justifiée avec ID (donnée absente du DOM) ; elle ne mesure qu’un taux de cellules, pas un taux de points.',
];

let observer = null;       // un seul observateur, reconnecté à chaque rendu
let currentCtx = null;     // dernier ctx, pour le callback de l'observateur
let layoutRef = null;      // dernier layout, pour le callback de l'observateur
let panelRef = null;       // panneau V2 conservé
let bodyRef = null;        // <tbody> du tableau V2, seul bloc de lignes remplacé
let statesRef = null;      // vocabulaire d'états V2
let metricsRef = null;     // compteurs V2
let sourceRef = null;      // écho du résumé de la passe 1
let lastSignature = '';    // évite les écritures redondantes
let refreshCount = 0;      // nombre réel d'actualisations du tableau V2

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function all(root, selector) {
  return isElement(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
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

function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

/* E057-V2-10 : garde anti-doublon — tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document, y compris un nœud détaché. */
function enforceUnique(id, keep) {
  const found = nodesById(id);
  found.forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || found[0] || null;
}

/* E057-V2-02 : repérage NON destructif des signaux de la passe 1, par leurs
 * ids préfixés `points-e057-*` et la classe de portée. Rien n'y est écrit. */
function readSignals(layout) {
  return {
    summary: query(layout, '#' + P1_SUMMARY_ID),
    note: query(layout, '#' + P1_NOTE_ID),
    legend: query(layout, '#' + P1_LEGEND_ID),
    grid: query(layout, '.points-grid'),
    rows: all(layout, '.points-grid-row:not(.is-head)'),
  };
}

/* E057-V2-05 : le glyphe et le mot sont lus dans le texte de la légende de la
 * passe 1 (le glyphe y est un span aria-hidden). Repli sur STATES si vide. */
function readStates(legend) {
  const items = all(legend, 'li');
  const states = items.map((li) => {
    const raw = txt(li.textContent);
    const glyphNode = query(li, '.' + P1_GLYPH_CLASS);
    const mark = glyphNode ? txt(glyphNode.textContent) : raw.charAt(0);
    const word = glyphNode ? raw.slice(txt(glyphNode.textContent).length).trim() : raw.slice(1).trim();
    return { mark: mark || '·', word: word || 'état non documenté.' };
  });
  return states.length ? states : STATES;
}

/* Le nom de l'ère est lu dans les nœuds texte du bouton : le badge de la passe
 * 1 est un enfant <span>, il ne doit pas polluer le libellé du tableau V2. */
function eraName(btn) {
  if (!btn || !btn.childNodes) return '';
  let name = '';
  for (let i = 0; i < btn.childNodes.length; i += 1) {
    const child = btn.childNodes[i];
    if (child.nodeType === 3) name += child.nodeValue || '';
  }
  return txt(name) || txt(btn.textContent).replace(/\d+\s*$/, '').trim();
}

/* E057-V2-03 / V2-04 / V2-09 : la borne et chaque valeur sont lues dans les
 * cellules et les boutons d'ère réellement rendus par la passe 1 — aucun total,
 * aucun libellé, aucun millésime n'est codé en dur dans la V2. */
function readEras(rows) {
  return rows.map((row) => {
    const btn = query(row, '.points-era');
    const cells = all(row, '.points-cell');
    let points = 0;
    let silences = 0;
    cells.forEach((cell) => {
      const state = getAttr(cell, 'data-e057State');
      if (state === 'point') points += 1;
      else if (state === 'silence' || getAttr(cell, 'data-silence') === '1') silences += 1;
    });
    const declared = getAttr(btn, 'data-silences');
    return {
      name: eraName(btn) || 'Ère sans nom',
      cells: cells.length,
      points,
      silences,
      declared: declared === null ? null : Number(declared),
      coverage: cells.length ? Math.round((points / cells.length) * 100) : 0,
    };
  });
}

function signature(eras, states, summaryText) {
  return eras.map((era) => era.name + ':' + era.silences + ':' + era.cells + ':' + era.coverage).join('|')
    + '#' + states.map((state) => state.mark + state.word).join('|')
    + '#' + summaryText;
}

/* E057-V2-04 : le tableau est bâti avec ctx.el — aucune réinterprétation de
 * balisage. <caption>, <th scope="col"> et <th scope="row"> le rendent
 * indexable et parcourable sans le moindre script d'animation. */
function fillTable(ctx, body, eras) {
  if (!body) return;
  const rows = eras.map((era) => {
    const tr = ctx.el('tr', 'points-v2-e057-tr');
    const th = ctx.el('th', '', era.name);
    th.setAttribute('scope', 'row');
    tr.appendChild(th);
    tr.appendChild(ctx.el('td', '', String(era.silences)));
    tr.appendChild(ctx.el('td', '', String(era.cells)));
    tr.appendChild(ctx.el('td', 'points-v2-e057-etat', era.coverage + ' %'));
    return tr;
  });
  if (rows.length === 0) {
    const tr = ctx.el('tr');
    const cell = ctx.el('td', '', 'Aucune ère lisible dans la matrice de la passe 1.');
    cell.colSpan = 4;
    tr.appendChild(cell);
    rows.push(tr);
  }
  body.replaceChildren(...rows);
}

/* E057-V2-05 : vocabulaire d'états restitué en texte, glyphes aria-hidden. */
function fillStates(ctx, holder, states) {
  if (!holder) return;
  const rows = states.map((state) => {
    const li = ctx.el('li');
    const mark = ctx.el('span', 'points-v2-e057-glyph', state.mark);
    mark.setAttribute('aria-hidden', 'true');
    li.appendChild(mark);
    li.appendChild(ctx.el('span', '', ' ' + state.word));
    return li;
  });
  holder.replaceChildren(...rows);
}

/* E057-V2-06 : relations ARIA additives sur la passe 1. Les tokens déjà
 * présents sont conservés ; l'identifiant V2 n'est ajouté qu'une fois. */
function describeP1(nodes) {
  nodes.forEach((node) => {
    if (!node) return;
    const tokens = (getAttr(node, 'aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
    if (tokens.indexOf(NOTE_ID) === -1) {
      tokens.push(NOTE_ID);
      setAttr(node, 'aria-describedby', tokens.join(' '));
    }
  });
}

/* E057-V2-01 / V2-04 / V2-06 / V2-07 / V2-08 : structure statique construite
 * une seule fois. Seuls le <tbody>, le vocabulaire, les compteurs, l'écho et
 * l'ARIA sont actualisés par refresh(). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'points-v2-e057-title', 'Lecture V2 — les silences de la matrice');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e057-intro',
    'Ce tableau relit, sans les modifier, les ères, les cellules et les silences tels que la passe 1 les a rendus depuis la grille de points. Un silence y est une donnée explicite, jamais un vide masqué.'));

  const facts = ctx.el('div', 'points-v2-e057-facts');
  facts.id = FACTS_ID;
  FACTS.forEach((text) => facts.appendChild(ctx.el('p', 'points-v2-e057-fait', text)));
  panel.appendChild(facts);

  const etats = ctx.el('ul', 'points-v2-e057-etats');
  etats.id = STATES_ID;
  etats.setAttribute('aria-label', 'États de cellule (vocabulaire de la passe 1)');
  statesRef = etats;
  panel.appendChild(etats);

  const table = ctx.el('table', 'points-v2-e057-table');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Silences par ère / cellules / couverture de cellules'));
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Ère', 'Silences', 'Cellules', 'Couverture'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const body = ctx.el('tbody');
  body.id = BODY_ID;
  table.appendChild(body);
  panel.appendChild(table);
  bodyRef = body;

  metricsRef = ctx.el('p', 'points-v2-e057-metrics', '');
  metricsRef.id = METRICS_ID;
  panel.appendChild(metricsRef);

  sourceRef = ctx.el('p', 'points-v2-e057-source', '');
  sourceRef.id = SOURCE_ID;
  panel.appendChild(sourceRef);

  const limite = ctx.el('div', 'points-v2-e057-limite');
  limite.id = LIMIT_ID;
  limite.appendChild(ctx.el('h3', '', 'Limite falsifiable — cinq temps'));
  const list = ctx.el('ol');
  LIMIT.forEach((text) => list.appendChild(ctx.el('li', '', text)));
  limite.appendChild(list);
  panel.appendChild(limite);

  const note = ctx.el('p', 'points-v2-e057-note',
    'La V2 n’ajoute aucune région live : elle ne fait que restituer en texte un état déjà lisible. Le panneau reste lisible et le tableau construisable même si aucune animation n’est disponible.');
  note.id = NOTE_ID;
  panel.appendChild(note);
}

/* E057-V2-03 / V2-07 / V2-09 : compteurs calculés sur les cellules réelles,
 * donc bornés par la grille de la passe 1. La couverture mesurée est comparée
 * à la référence explicite de 100 % du §4. L'écho du résumé passe 1 est lu,
 * jamais supposé. */
function refresh(ctx, layout) {
  const signals = readSignals(layout);
  const eras = readEras(signals.rows);
  const states = readStates(signals.legend);
  const summaryText = txt(signals.summary);
  const sig = signature(eras, states, summaryText);
  if (sig === lastSignature) return;
  lastSignature = sig;
  refreshCount += 1;

  fillTable(ctx, bodyRef, eras);
  fillStates(ctx, statesRef, states);

  let cells = 0;
  let silences = 0;
  eras.forEach((era) => { cells += era.cells; silences += era.silences; });
  const filled = cells - silences;
  const coverage = cells ? Math.round((filled / cells) * 100) : 0;

  if (metricsRef) {
    metricsRef.textContent =
      `Lecture V2 : ${eras.length} ${plural(eras.length, 'ère', 'ères')} · ` +
      `${silences} ${plural(silences, 'silence', 'silences')} sur ${cells} ${plural(cells, 'cellule', 'cellules')} · ` +
      `${filled} avec points · couverture ${coverage} % (référence §4 : 100 %) · ` +
      `${refreshCount} ${plural(refreshCount, 'actualisation', 'actualisations')}.`;
  }
  if (sourceRef) {
    const global = layout && layout.dataset ? layout.dataset.e057Silences : '';
    sourceRef.textContent = summaryText
      ? 'Référence passe 1 : ' + summaryText + (global !== '' ? ` Signal global : ${global} silence(s).` : '')
      : 'Référence passe 1 : aucun compteur exposé ; lecture V2 seule.';
  }
  describeP1([signals.summary, signals.legend]);
}

/* E057-V2-09 : un seul observateur, jamais sur le panneau V2 ni sur ses
 * descendants (sinon boucle d'écriture). Il ne lit que des nœuds déjà produits
 * par la passe 1 : résumé, légende et grille. */
function observe(ctx, layout) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx && layoutRef && layoutRef.isConnected) refresh(currentCtx, layoutRef);
  });
  const signals = readSignals(layout);
  const options = { childList: true, subtree: true, characterData: true };
  if (signals.summary) observer.observe(signals.summary, options);
  if (signals.legend) observer.observe(signals.legend, options);
  if (signals.grid) observer.observe(signals.grid, options);
}

function registerPanel(ctx, layout, anchor) {
  const found = nodesById(PANEL_ID);
  let panel = null;
  for (const node of found) {
    if (layout.contains(node)) { panel = node; break; }
  }
  found.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!panel) {
    panel = ctx.el('section', 'points-v2-e057-panel');
    buildPanel(ctx, panel);
    lastSignature = '';
    const parent = (anchor && anchor.parentElement)
      ? anchor.parentElement
      : (layout.querySelector('.points-matrix') || layout);
    if (anchor && anchor.nextSibling) parent.insertBefore(panel, anchor.nextSibling);
    else parent.appendChild(panel);
  }
  panelRef = panel;
  bodyRef = query(panel, '#' + BODY_ID);
  statesRef = query(panel, '#' + STATES_ID);
  metricsRef = query(panel, '#' + METRICS_ID);
  sourceRef = query(panel, '#' + SOURCE_ID);
  if (!bodyRef || !statesRef || !metricsRef || !sourceRef) {
    buildPanel(ctx, panel);
    lastSignature = '';
    bodyRef = query(panel, '#' + BODY_ID);
    statesRef = query(panel, '#' + STATES_ID);
    metricsRef = query(panel, '#' + METRICS_ID);
    sourceRef = query(panel, '#' + SOURCE_ID);
  }
  return panel;
}

register('E057', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (VIEW_IDS.indexOf(viewId) === -1 || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  currentCtx = ctx;
  layoutRef = layout;

  /* E057-V2-01 : injection unique (cssOnce = points-v2-e057) et ancrage de
   * la portée sur .points-layout. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E057-V2-10 : couplement explicite à la préférence de mouvement réduit. */
  let reduced = false;
  if (typeof reducedMotion === 'function') {
    try { reduced = !!reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E057-V2-02 : cible d'insertion = la légende de la passe 1, sinon son
   * résumé, sinon la matrice, sans jamais retirer ni réécrire un nœud P1. */
  const signals = readSignals(layout);
  registerPanel(ctx, layout, signals.legend || signals.summary || query(layout, '.points-matrix'));

  observe(ctx, layout);

  /* Le tableau venant d'être reconstruit, sa signature est remise à zéro :
   * refresh() doit le peupler même si la donnée n'a pas changé entre rendus. */
  refresh(ctx, layout);
});
