import { register } from './registry.js';

/* Lentille E054 — passe 2 (module POINTS/V2 E054). Tableau de lecture de la
 * légende sémantique des huit familles de points produite par la passe 1.
 *
 * Dix chantiers V2, E054-V2-01 à E054-V2-10, documentés dans
 * UNIFIED_AUDIT/POINTS/V2/views/E054.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E054.js) garde
 * la main sur la légende, ses trois états, ses compteurs et son observateur.
 * La passe 2 ne modifie aucun de ces signaux : elle les RELIT dans le DOM réel
 * et les restitue sous forme de tableau sémantique, de fiche de vérité et de
 * limite falsifiable. Aucune donnée historique n'est inventée : familles,
 * questions et états sont lus dans la légende de la passe 1, elle-même dérivée
 * de POINT_METHODOLOGY.md §1 et §2 et du corpus rendu par points.js.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état applicative, aucun
 * écouteur global, aucune région live supplémentaire. Le seul ajout à un nœud
 * de la passe 1 est un aria-describedby complété (jamais écrasé) sur la région
 * de la légende.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * identifiants préfixés points-v2-e054- ; tout DOM bâti avec ctx.el, jamais de
 * réinterprétation de balisage ; zéro réseau, zéro aléa, zéro sortie de
 * débogage, zéro minutage, zéro boucle d'animation ; chaque état porte un
 * glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e054';
const SCOPE = 'points-v2-e054';
const PANEL_ID = 'points-v2-e054-panel';
const TITLE_ID = 'points-v2-e054-title';
const TABLE_ID = 'points-v2-e054-table';
const BODY_ID = 'points-v2-e054-body';
const FACTS_ID = 'points-v2-e054-facts';
const LIMIT_ID = 'points-v2-e054-limite';
const METRICS_ID = 'points-v2-e054-metrics';
const SOURCE_ID = 'points-v2-e054-source';
const NOTE_ID = 'points-v2-e054-note';
const REDUCED_ATTR = 'data-v2-e054-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Ids de la passe 1, lus en lecture seule — jamais réécrits. */
const P1_LEGEND_ID = 'points-e054-legend';
const P1_LIST_ID = 'points-e054-list';
const P1_METRICS_ID = 'points-e054-metrics';

/* E054-V2-05 : trois états nommés. La clé est lue dans la classe is-* posée par
 * la passe 1 ; le glyphe et le mot sont lus dans le texte de la passe 1. La
 * table ci-dessous ne sert que de repli si ce texte était absent, pour ne
 * jamais afficher un état muet. */
const STATES = {
  point: { mark: '◆', word: 'dans ce point' },
  present: { mark: '●', word: 'présente dans le corpus' },
  absent: { mark: '○', word: 'absente du corpus' },
};
const STATE_KEYS = ['point', 'present', 'absent'];

/* E054-V2-01 / V2-09 / V2-10 : feuille unique, entièrement préfixée par
 * .points-v2-e054, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. Les transitions ne portent que sur la couleur des marqueurs. */
const CSS = `
.points-v2-e054 .points-v2-e054-panel {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6);
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e054 .points-v2-e054-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e054 .points-v2-e054-intro,
.points-v2-e054 .points-v2-e054-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e054 .points-v2-e054-fait {
  margin: 0 0 6px; padding-left: 10px;
  border-left: 2px solid var(--line-strong);
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e054 .points-v2-e054-table {
  width: 100%; border-collapse: collapse; margin: 8px 0;
  font-size: 11px; line-height: 1.45;
}
.points-v2-e054 .points-v2-e054-table caption {
  text-align: left; margin: 0 0 6px;
  font-size: 11px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e054 .points-v2-e054-table th,
.points-v2-e054 .points-v2-e054-table td {
  border: 1px solid var(--line); padding: 5px 7px;
  text-align: left; vertical-align: top;
}
.points-v2-e054 .points-v2-e054-table thead th {
  color: var(--gold-bright); font-weight: 600; background: rgba(255, 255, 255, .03);
}
.points-v2-e054 .points-v2-e054-table tbody th {
  color: var(--ink); font-weight: 600; white-space: nowrap;
}
.points-v2-e054 .points-v2-e054-table .points-v2-e054-etat {
  white-space: nowrap; transition: color .18s linear;
}
.points-v2-e054 .points-v2-e054-tr.is-point .points-v2-e054-etat { color: var(--gold-bright); }
.points-v2-e054 .points-v2-e054-tr.is-present .points-v2-e054-etat { color: var(--gold); }
.points-v2-e054 .points-v2-e054-tr.is-absent .points-v2-e054-etat { color: var(--muted-2); }
.points-v2-e054 .points-v2-e054-metrics,
.points-v2-e054 .points-v2-e054-source {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e054 .points-v2-e054-source { color: var(--muted-2); }
.points-v2-e054 .points-v2-e054-limite {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
}
.points-v2-e054 .points-v2-e054-limite h3 {
  margin: 0 0 6px; font-size: 12px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e054 .points-v2-e054-limite ol {
  margin: 0; padding-left: 20px;
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e054 .points-v2-e054-limite li { margin-bottom: 4px; }
.points-v2-e054[` + REDUCED_ATTR + `="1"] .points-v2-e054-etat { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e054 .points-v2-e054-etat { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e054 .points-v2-e054-table th,
  .points-v2-e054 .points-v2-e054-table td { padding: 4px 5px; }
  .points-v2-e054 .points-v2-e054-table { font-size: 10px; }
}
@media (forced-colors: active) {
  .points-v2-e054 .points-v2-e054-panel,
  .points-v2-e054 .points-v2-e054-table th,
  .points-v2-e054 .points-v2-e054-table td { border-color: CanvasText; }
  .points-v2-e054 .points-v2-e054-etat { color: CanvasText; }
}
@media print {
  .points-v2-e054 .points-v2-e054-panel { border-color: #666; background: transparent; }
  .points-v2-e054 .points-v2-e054-limite { break-inside: avoid; }
}
`;

/* E054-V2-07 : fiche de vérité — trois faits sourcés de POINT_METHODOLOGY.md
 * (vocabulaire normatif, aucun fait daté). Trois grandeurs chiffrées, dont une
 * comparée à une référence : huit familles contre un seul champ de date. */
const FACTS = [
  '§2 — Taxonomie normative : huit familles de points — événement, processus, acteur, groupe social, lieu, institution, repère normatif, mémoire. Ce sont des questions sémantiques, pas des faits datés.',
  '§2 — Un point ne se réduit pas à une date : l’ère et le champ temporel mesurent QUAND, la famille dit QUOI et COMMENT. Une seule date ne remplace pas huit questions de lecture.',
  '§1 — Huit critères définissent un point valide : sujet, prédicat, complément, ancre temporelle, échelle, domaine, source vérifiable ou omission justifiée, degré de certitude.',
];

/* E054-V2-08 : limite falsifiable en cinq temps, alignée sur les angles morts
 * de la passe 1 (la légende rend l’écart visible, elle ne le corrige pas). */
const LIMIT = [
  'Prédiction : si la légende reflète le corpus, toute famille dite « présente » doit figurer dans le filtre des familles de la passe 1.',
  'Réglage : filtrer le corpus sur une seule famille, puis lire la ligne correspondante du tableau ci-dessus.',
  'Résultat attendu : les autres familles passent à « absente du corpus » ; celle retenue reste « présente dans le corpus ».',
  'Falsification : si une famille écartée du filtre reste marquée « présente », la lecture du contrôle est en défaut et la légende est contredite.',
  'Débrief : angle mort — un point mal étiqueté ou une option erronée reste invisible ; la V2 ne juge pas le corpus, elle expose l’écart entre vocabulaire normatif et données réelles.',
];

let observer = null;       // un seul observateur, reconnecté à chaque rendu
let currentCtx = null;     // dernier ctx, pour le callback de l'observateur
let layoutRef = null;      // dernier layout, pour le callback de l'observateur
let panelRef = null;       // panneau V2 conservé
let bodyRef = null;        // <tbody> du tableau V2, seul bloc de lignes remplacé
let metricsRef = null;     // compteurs V2
let sourceRef = null;      // écho du bloc de compteurs de la passe 1
let legendRef = null;      // région de la passe 1, pour l'ARIA additive
let lastSignature = '';    // évite les écritures redondantes
let refreshCount = 0;      // nombre réel d'actualisations du tableau V2

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
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

/* E054-V2-10 : garde anti-doublon — tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document, y compris un nœud détaché. */
function enforceUnique(id, keep) {
  const found = nodesById(id);
  found.forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || found[0] || null;
}

/* E054-V2-02 : repérage NON destructif de la légende de la passe 1 et de ses
 * trois signaux, par leurs ids préfixés `points-e054-*`. Aucun nœud n'est créé
 * dans la légende, aucun état n'est réécrit. */
function readLegend(layout) {
  const legend = query(layout, '#' + P1_LEGEND_ID);
  const list = query(layout, '#' + P1_LIST_ID);
  const metrics = query(layout, '#' + P1_METRICS_ID);
  return { legend, list, metrics };
}

/* E054-V2-03 / V2-04 / V2-05 : la borne et le contenu du tableau sont lus dans
 * les <li> réellement rendus par la passe 1 — aucun total, aucun libellé et
 * aucune question ne sont codés en dur dans la V2. */
function readItems(list) {
  if (!list || typeof list.children === 'undefined') return [];
  const nodes = Array.prototype.slice.call(list.children);
  return nodes.map((li) => {
    const classes = String(getAttr(li, 'class') || '');
    let key = 'absent';
    for (const candidate of STATE_KEYS) {
      if (classes.indexOf('is-' + candidate) !== -1) { key = candidate; break; }
    }
    const fallback = STATES[key];
    const state = txt(query(li, '.points-e054-state'));
    return {
      id: txt(getAttr(li, 'data-family')),
      label: txt(query(li, '.points-e054-label')),
      question: txt(query(li, '.points-e054-question')),
      key,
      state: state || (fallback.mark + ' ' + fallback.word),
    };
  });
}

function signature(items, sourceText) {
  return items.map((item) => item.id + ':' + item.key + ':' + item.state).join('|')
    + '#' + sourceText;
}

/* E054-V2-04 : le tableau est bâti avec ctx.el — aucune réinterprétation de
 * balisage. <caption>, <th scope="col"> et <th scope="row"> le rendent
 * indexable et parcourable sans le moindre script d'animation. */
function fillTable(ctx, body, items) {
  if (!body) return;
  const rows = items.map((item) => {
    const tr = ctx.el('tr', 'points-v2-e054-tr is-' + item.key);
    tr.appendChild(ctx.el('th', '', item.label || item.id || '—'));
    tr.appendChild(ctx.el('td', '', item.question || '—'));
    tr.appendChild(ctx.el('td', 'points-v2-e054-etat', item.state));
    return tr;
  });
  if (rows.length === 0) {
    const tr = ctx.el('tr', 'points-v2-e054-tr is-absent');
    const cell = ctx.el('td', '', 'Aucune famille lisible dans la légende de la passe 1.');
    cell.colSpan = 3;
    tr.appendChild(cell);
    rows.push(tr);
  }
  body.replaceChildren(...rows);
}

/* E054-V2-06 : relation ARIA additive sur la région de la passe 1. Les tokens
 * déjà présents sont conservés ; l'identifiant V2 n'est ajouté qu'une fois. */
function describeLegend(legend) {
  if (!legend) return;
  const tokens = (getAttr(legend, 'aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.indexOf(NOTE_ID) === -1) {
    tokens.push(NOTE_ID);
    setAttr(legend, 'aria-describedby', tokens.join(' '));
  }
}

/* E054-V2-01 / V2-04 / V2-06 / V2-07 / V2-08 : structure statique construite
 * une seule fois. Seuls le <tbody>, les compteurs, l'écho et l'ARIA sont
 * actualisés par refresh(). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'points-v2-e054-title', 'Lecture V2 — les huit familles de points');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e054-intro',
    'Ce tableau relit, sans les modifier, les familles, leurs questions et leurs états tels que la légende de la passe 1 les a rendus depuis le corpus et POINT_METHODOLOGY.md §2.'));

  const facts = ctx.el('div', 'points-v2-e054-facts');
  facts.id = FACTS_ID;
  FACTS.forEach((text) => facts.appendChild(ctx.el('p', 'points-v2-e054-fait', text)));
  panel.appendChild(facts);

  const table = ctx.el('table', 'points-v2-e054-table');
  table.id = TABLE_ID;
  const caption = ctx.el('caption', '', 'Correspondance famille / question canonique / état courant');
  table.appendChild(caption);
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Famille', 'Question canonique', 'État courant'].forEach((label) => {
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

  metricsRef = ctx.el('p', 'points-v2-e054-metrics', '');
  metricsRef.id = METRICS_ID;
  panel.appendChild(metricsRef);

  sourceRef = ctx.el('p', 'points-v2-e054-source', '');
  sourceRef.id = SOURCE_ID;
  panel.appendChild(sourceRef);

  const limite = ctx.el('div', 'points-v2-e054-limite');
  limite.id = LIMIT_ID;
  limite.appendChild(ctx.el('h3', '', 'Limite falsifiable — cinq temps'));
  const list = ctx.el('ol');
  LIMIT.forEach((text) => list.appendChild(ctx.el('li', '', text)));
  limite.appendChild(list);
  panel.appendChild(limite);

  const note = ctx.el('p', 'points-v2-e054-note',
    'La V2 n’ajoute aucune région live : elle ne fait que restituer en texte un état déjà lisible. Le panneau reste lisible et le tableau construisable même si aucune animation n’est disponible.');
  note.id = NOTE_ID;
  panel.appendChild(note);
}

/* E054-V2-03 / V2-07 / V2-09 : compteurs calculés sur les lignes réelles, donc
 * bornés par le nombre de <li> de la passe 1. L'écho de la passe 1 est lu dans
 * son bloc de compteurs, jamais supposé. */
function refresh(ctx, layout) {
  const signals = readLegend(layout);
  const items = readItems(signals.list);
  const sourceText = txt(signals.metrics);
  const sig = signature(items, sourceText);
  if (sig === lastSignature) return;
  lastSignature = sig;
  refreshCount += 1;

  fillTable(ctx, bodyRef, items);
  const count = (key) => items.filter((item) => item.key === key).length;
  if (metricsRef) {
    metricsRef.textContent =
      `Lecture V2 : ${items.length} ${plural(items.length, 'famille canonique', 'familles canoniques')} · ` +
      `${count('present')} ${plural(count('present'), 'présente', 'présentes')} · ` +
      `${count('absent')} ${plural(count('absent'), 'absente', 'absentes')} · ` +
      `${count('point')} dans ce point · ` +
      `${refreshCount} ${plural(refreshCount, 'actualisation', 'actualisations')}.`;
  }
  if (sourceRef) {
    sourceRef.textContent = sourceText
      ? 'Référence passe 1 : ' + sourceText
      : 'Référence passe 1 : aucun compteur exposé ; lecture V2 seule.';
  }
  if (signals.legend && signals.legend !== legendRef) legendRef = signals.legend;
  describeLegend(legendRef);
}

/* E054-V2-09 : un seul observateur, jamais sur le panneau V2 ni sur ses
 * descendants (sinon boucle d'écriture). Il ne lit que les deux signaux déjà
 * produits par la passe 1 : la liste des familles et son bloc de compteurs. */
function observe(ctx, layout) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx && layoutRef && layoutRef.isConnected) refresh(currentCtx, layoutRef);
  });
  const signals = readLegend(layout);
  const options = { childList: true, subtree: true, characterData: true };
  if (signals.list) observer.observe(signals.list, options);
  if (signals.metrics) observer.observe(signals.metrics, options);
}

function registerPanel(ctx, layout, legend) {
  const found = nodesById(PANEL_ID);
  let panel = null;
  for (const node of found) {
    if (layout.contains(node)) { panel = node; break; }
  }
  found.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!panel) {
    panel = ctx.el('section', 'points-v2-e054-panel');
    buildPanel(ctx, panel);
    lastSignature = '';
    const parent = (legend && legend.parentElement)
      ? legend.parentElement
      : (layout.querySelector('.points-matrix') || layout);
    if (legend && legend.nextSibling) parent.insertBefore(panel, legend.nextSibling);
    else parent.appendChild(panel);
  }

  panelRef = panel;
  bodyRef = query(panel, '#' + BODY_ID);
  metricsRef = query(panel, '#' + METRICS_ID);
  sourceRef = query(panel, '#' + SOURCE_ID);
  if (!bodyRef || !metricsRef || !sourceRef) {
    buildPanel(ctx, panel);
    lastSignature = '';
    bodyRef = query(panel, '#' + BODY_ID);
    metricsRef = query(panel, '#' + METRICS_ID);
    sourceRef = query(panel, '#' + SOURCE_ID);
  }
  return panel;
}

register('E054', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (VIEW_IDS.indexOf(viewId) === -1 || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  currentCtx = ctx;
  layoutRef = layout;

  /* E054-V2-01 : injection unique (cssOnce) et ancrage de la portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E054-V2-10 : couplement explicite à la préférence de mouvement réduit. */
  let reduced = false;
  if (typeof reducedMotion === 'function') {
    try { reduced = !!reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E054-V2-02 : cible d'insertion = la légende de la passe 1, sinon la
   * matrice, sans jamais retirer ni réécrire un nœud de la passe 1. */
  const signals = readLegend(layout);
  legendRef = signals.legend;
  registerPanel(ctx, layout, legendRef);

  observe(ctx, layout);

  /* Le tableau venant d'être reconstruit, sa signature est remise à zéro :
   * refresh() doit le peupler même si la donnée n'a pas changé entre rendus. */
  refresh(ctx, layout);
});
