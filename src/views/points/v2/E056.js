import { register } from './registry.js';

/* Lentille E056 — passe 2 (module POINTS/V2 E056). Grille de qualification des
 * statuts de source, en complément du registre local produit par la passe 1.
 *
 * Dix chantiers V2, E056-V2-01 à E056-V2-10, documentés dans
 * UNIFIED_AUDIT/POINTS/V2/views/E056.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E056.js) garde
 * la main sur son registre, ses jetons SRC-/OM-, ses compteurs et son
 * observateur. La passe 2 ne modifie aucun de ces signaux : elle les RELIT dans
 * le DOM réel et les restitue sous forme de grille de qualification, de fiche
 * de vérité et de limite falsifiable. Aucun ID, millésime, auteur ou DOI n'est
 * inventé : seuls les jetons et libellés réellement rendus par la passe 1 sont
 * cités, sinon l'absence est énoncée telle quelle.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état applicative, aucun
 * écouteur global, aucune région live supplémentaire. Le seul ajout à un nœud
 * de la passe 1 est un aria-describedby complété (jamais écrasé) sur la région
 * du registre.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * identifiants préfixés points-v2-e056- ; tout DOM bâti avec ctx.el, jamais de
 * réinterprétation de balisage ; zéro réseau, zéro aléa, zéro sortie de
 * débogage, zéro minutage, zéro boucle d'animation ; chaque statut porte un
 * glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e056';
const SCOPE = 'points-v2-e056';
const PANEL_ID = 'points-v2-e056-panel';
const TITLE_ID = 'points-v2-e056-title';
const TABLE_ID = 'points-v2-e056-table';
const BODY_ID = 'points-v2-e056-body';
const FACTS_ID = 'points-v2-e056-facts';
const LIMIT_ID = 'points-v2-e056-limite';
const METRICS_ID = 'points-v2-e056-metrics';
const ECHO_ID = 'points-v2-e056-echo';
const NOTE_ID = 'points-v2-e056-note';
const REDUCED_ATTR = 'data-v2-e056-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Ids de la passe 1, lus en lecture seule — jamais réécrits. */
const P1_LEDGER_ID = 'points-e056-ledger';
const P1_TITLE_ID = 'points-e056-title';
const P1_SUMMARY_SEL = '.points-e056-summary';
const P1_ITEMS_SEL = '.points-e056-items';
const P1_METRICS_SEL = '.points-e056-metrics';
const P1_KEY_SEL = '.points-e056-key';

/* E056-V2-05 : quatre statuts nommés. Le glyphe et le mot sont portés par le
 * texte V2 ; la clé de correspondance est relue dans les <li> de la passe 1.
 * La couleur ne fait que doubler ce texte, avec repli forced-colors. */
const STATUS_KEYS = ['real', 'declared', 'mentioned', 'silence'];
const STATES = {
  real: { mark: '●', word: 'source réelle déclarée' },
  declared: { mark: '◆', word: 'ID d’omission déclaré' },
  mentioned: { mark: '◇', word: 'ID mentionné dans la justification' },
  silence: { mark: '○', word: 'silence explicite sans ID dédié' },
};

/* E056-V2-01 / V2-09 / V2-10 : feuille unique, entièrement préfixée par
 * .points-v2-e056, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. La seule transition porte sur la couleur des marqueurs. */
const CSS = `
.points-v2-e056 .points-v2-e056-panel {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6);
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e056 .points-v2-e056-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e056 .points-v2-e056-intro,
.points-v2-e056 .points-v2-e056-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e056 .points-v2-e056-fait {
  margin: 0 0 6px; padding-left: 10px;
  border-left: 2px solid var(--line-strong);
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e056 .points-v2-e056-table {
  width: 100%; border-collapse: collapse; margin: 8px 0;
  font-size: 11px; line-height: 1.45;
}
.points-v2-e056 .points-v2-e056-table caption {
  text-align: left; margin: 0 0 6px;
  font-size: 11px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e056 .points-v2-e056-table th,
.points-v2-e056 .points-v2-e056-table td {
  border: 1px solid var(--line); padding: 5px 7px;
  text-align: left; vertical-align: top;
}
.points-v2-e056 .points-v2-e056-table thead th {
  color: var(--gold-bright); font-weight: 600; background: rgba(255, 255, 255, .03);
}
.points-v2-e056 .points-v2-e056-table tbody th {
  color: var(--ink); font-weight: 600; white-space: nowrap;
}
.points-v2-e056 .points-v2-e056-table .points-v2-e056-statut {
  white-space: nowrap; transition: color .18s linear;
}
.points-v2-e056 .points-v2-e056-tr.is-real .points-v2-e056-statut { color: var(--gold-bright); }
.points-v2-e056 .points-v2-e056-tr.is-declared .points-v2-e056-statut { color: var(--gold); }
.points-v2-e056 .points-v2-e056-tr.is-mentioned .points-v2-e056-statut { color: var(--info, #9ec9e8); }
.points-v2-e056 .points-v2-e056-tr.is-silence .points-v2-e056-statut { color: var(--muted-2); }
.points-v2-e056 .points-v2-e056-presence { white-space: nowrap; }
.points-v2-e056 .points-v2-e056-tr.is-present .points-v2-e056-presence { color: var(--gold); }
.points-v2-e056 .points-v2-e056-tr.is-absent .points-v2-e056-presence { color: var(--muted-2); }
.points-v2-e056 .points-v2-e056-metrics,
.points-v2-e056 .points-v2-e056-echo {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e056 .points-v2-e056-echo { color: var(--muted-2); }
.points-v2-e056 .points-v2-e056-limite {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
}
.points-v2-e056 .points-v2-e056-limite h3 {
  margin: 0 0 6px; font-size: 12px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e056 .points-v2-e056-limite ol {
  margin: 0; padding-left: 20px;
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e056 .points-v2-e056-limite li { margin-bottom: 4px; }
.points-v2-e056[` + REDUCED_ATTR + `="1"] .points-v2-e056-statut { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e056 .points-v2-e056-statut { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e056 .points-v2-e056-table th,
  .points-v2-e056 .points-v2-e056-table td { padding: 4px 5px; }
  .points-v2-e056 .points-v2-e056-table { font-size: 10px; }
}
@media (forced-colors: active) {
  .points-v2-e056 .points-v2-e056-panel,
  .points-v2-e056 .points-v2-e056-table th,
  .points-v2-e056 .points-v2-e056-table td { border-color: CanvasText; }
  .points-v2-e056 .points-v2-e056-statut,
  .points-v2-e056 .points-v2-e056-presence { color: CanvasText; }
}
@media print {
  .points-v2-e056 .points-v2-e056-panel { border-color: #666; background: transparent; }
  .points-v2-e056 .points-v2-e056-limite { break-inside: avoid; }
}
`;

/* E056-V2-07 : fiche de vérité — trois faits sourcés de POINT_METHODOLOGY.md
 * (vocabulaire normatif, aucun fait daté). Trois grandeurs chiffrées, dont une
 * comparée à une référence : quatre statuts de source, huit règles d'intégrité,
 * une source réelle qui ne remplace pas une omission documentée. */
const FACTS = [
  '§3 règle 7 — Les silences sont des données : « aucune source » doit être explicite, jamais un vide masqué.',
  '§3 règle 2 — Aucune affirmation sans source : Src peut être un ID du registre (SRC-…) ou une omission documentée (OM-…).',
  '§9 — Ce que l’agent ne peut pas faire : dire « sans source » sans ID d’omission, ni inventer une date, un DOI, un auteur ou un titre.',
];

/* E056-V2-08 : limite falsifiable en cinq temps, alignée sur les angles morts
 * de la passe 1 (le registre rend l'écart visible, il ne le corrige pas). */
const LIMIT = [
  'Prédiction : si le registre de la passe 1 est exact, chaque ID affiché dans la grille V2 figure aussi dans la fiche de points.js (.points-sources ou .points-justification).',
  'Réglage : naviguer vers un point dont la fiche n’écrit pas de .points-sources, puis lire la ligne « silence explicite sans ID dédié » de la grille.',
  'Résultat attendu : la ligne « silence » passe à « présent » et les lignes « source réelle » / « ID d’omission déclaré » passent à « absent ».',
  'Falsification : si une ligne « source réelle » reste « présent » alors que la fiche n’affiche aucun SRC-, la lecture V2 est en défaut et le registre passe 1 est contredit.',
  'Débrief : angle mort — la V2 ne consulte ni source-register.csv ni omissions.yaml ; elle expose le statut tel que la passe 1 l’a qualifié, sans juger la vérité du corpus.',
];

let observer = null;       // un seul observateur, reconnecté à chaque rendu
let currentCtx = null;     // dernier ctx, pour le callback de l'observateur
let layoutRef = null;      // dernier layout, pour le callback de l'observateur
let panelRef = null;       // panneau V2 conservé
let bodyRef = null;        // <tbody> du tableau V2, seul bloc de lignes remplacé
let metricsRef = null;     // compteurs V2
let echoRef = null;        // écho du bloc de compteurs de la passe 1
let ledgerRef = null;      // région du registre passe 1, pour l'ARIA additive
let lastSignature = '';    // évite les écritures redondantes
let refreshCount = 0;      // nombre réel d'actualisations de la grille V2

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

/* E056-V2-03 : normalisation des apostrophes pour lire indifféremment les
 * clés courbes (' — U+2019) de la passe 1 et leur forme droite. */
function norm(value) {
  return txt(value).replace(/['’]/g, "'").replace(/\s+/g, ' ');
}

/* E056-V2-03 / V2-05 : classification d'une ligne du registre passe 1 par sa
 * clé, jamais par une valeur supposée. L'ordre des tests distingue un ID
 * « déclaré » d'un ID simplement « mentionné » d'un silence sans ID. */
function classify(key) {
  const k = norm(key);
  if (k.indexOf('Sources réelles') !== -1) return 'real';
  if (k.indexOf('déclar') !== -1) return 'declared';
  if (k.indexOf('mentionn') !== -1) return 'mentioned';
  if (k.indexOf("ID d'omission") !== -1 || k.indexOf('omission') !== -1) return 'silence';
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

/* E056-V2-10 : garde anti-doublon — tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document, y compris un nœud détaché. */
function enforceUnique(id, keep) {
  const found = nodesById(id);
  found.forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || found[0] || null;
}

/* E056-V2-02 : repérage NON destructif du registre de la passe 1 et de ses
 * quatre signaux, par leurs ids/classes préfixés `points-e056-*`. Aucun nœud
 * n'est créé dans le registre, aucun état n'est réécrit. */
function readLedger(layout) {
  return {
    ledger: query(layout, '#' + P1_LEDGER_ID),
    title: query(layout, '#' + P1_TITLE_ID),
    summary: query(layout, P1_SUMMARY_SEL),
    items: query(layout, P1_ITEMS_SEL),
    metrics: query(layout, P1_METRICS_SEL),
  };
}

/* E056-V2-03 / V2-05 : lecture des <li> réellement rendus par la passe 1 —
 * aucun jeton SRC-/OM- n'est codé en dur dans la V2. La valeur est le texte de
 * la ligne moins sa clé, c'est-à-dire exactement ce que points.js a affiché. */
function readItems(itemsNode) {
  if (!itemsNode || typeof itemsNode.children === 'undefined') return [];
  return Array.prototype.slice.call(itemsNode.children).map((li) => {
    const keyNode = query(li, P1_KEY_SEL);
    const key = txt(keyNode);
    const value = txt(li).replace(key, '').replace(/^[\s:·—-]+/, '').trim();
    return { status: classify(key), key, value };
  });
}

/* E056-V2-04 / V2-05 : une ligne par statut, dans l'ordre normatif fixe. Un
 * statut est « présent » quand la passe 1 a rendu une ligne correspondante
 * porteuse de texte ; sinon il est « absent » et l'absence est énoncée. */
function rowsOf(items) {
  return STATUS_KEYS.map((status) => {
    const state = STATES[status];
    const found = items.filter((item) => item.status === status && item.value);
    const present = found.length > 0;
    return {
      status,
      mark: state.mark,
      word: state.word,
      present,
      presence: present ? 'présent' : 'absent',
      value: found.map((item) => item.value).join(' · ') || 'aucune ligne rendue par la passe 1',
    };
  });
}

function signature(rows, summaryText, metricsText) {
  return rows.map((row) => row.status + ':' + (row.present ? '1' : '0') + ':' + row.value).join('|')
    + '#' + summaryText + '#' + metricsText;
}

/* E056-V2-04 : le tableau est bâti avec ctx.el — aucune réinterprétation de
 * balisage. <caption>, <th scope="col"> et <th scope="row"> le rendent
 * indexable et parcourable sans le moindre script d'animation. */
function fillTable(ctx, body, rows) {
  if (!body) return;
  const trs = rows.map((row) => {
    const tr = ctx.el('tr', 'points-v2-e056-tr is-' + row.status
      + (row.present ? ' is-present' : ' is-absent'));
    tr.appendChild(ctx.el('th', 'points-v2-e056-statut', row.mark + ' ' + row.word));
    tr.appendChild(ctx.el('td', 'points-v2-e056-presence', row.presence));
    tr.appendChild(ctx.el('td', '', row.value));
    return tr;
  });
  if (trs.length === 0) {
    const tr = ctx.el('tr', 'points-v2-e056-tr is-absent');
    const cell = ctx.el('td', '', 'Aucune ligne lisible dans le registre de la passe 1.');
    cell.colSpan = 3;
    tr.appendChild(cell);
    trs.push(tr);
  }
  body.replaceChildren(...trs);
}

/* E056-V2-06 : relation ARIA additive sur la région du registre passe 1. Les
 * tokens déjà présents sont conservés ; l'identifiant V2 n'est ajouté qu'une
 * fois. C'est le seul ajout à un nœud de la passe 1. */
function describeLedger(ledger) {
  if (!ledger) return;
  const tokens = (getAttr(ledger, 'aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.indexOf(NOTE_ID) === -1) {
    tokens.push(NOTE_ID);
    setAttr(ledger, 'aria-describedby', tokens.join(' '));
  }
}

/* E056-V2-01 / V2-04 / V2-06 / V2-07 / V2-08 : structure statique construite
 * une seule fois. Seuls le <tbody>, les compteurs, l'écho et l'ARIA sont
 * actualisés par refresh(). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'points-v2-e056-title', 'Lecture V2 — qualification des sources');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e056-intro',
    'Cette grille relit, sans les modifier, les statuts de source que le registre de la passe 1 a rendus depuis la fiche et POINT_METHODOLOGY.md §3 et §9.'));

  const facts = ctx.el('div', 'points-v2-e056-facts');
  facts.id = FACTS_ID;
  FACTS.forEach((text) => facts.appendChild(ctx.el('p', 'points-v2-e056-fait', text)));
  panel.appendChild(facts);

  const table = ctx.el('table', 'points-v2-e056-table');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Correspondance statut / état dans ce point / preuve lue'));
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Statut de source', 'État dans ce point', 'Preuve lue dans la passe 1'].forEach((label) => {
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

  metricsRef = ctx.el('p', 'points-v2-e056-metrics', '');
  metricsRef.id = METRICS_ID;
  panel.appendChild(metricsRef);

  echoRef = ctx.el('p', 'points-v2-e056-echo', '');
  echoRef.id = ECHO_ID;
  panel.appendChild(echoRef);

  const limite = ctx.el('div', 'points-v2-e056-limite');
  limite.id = LIMIT_ID;
  limite.appendChild(ctx.el('h3', '', 'Limite falsifiable — cinq temps'));
  const list = ctx.el('ol');
  LIMIT.forEach((text) => list.appendChild(ctx.el('li', '', text)));
  limite.appendChild(list);
  panel.appendChild(limite);

  const note = ctx.el('p', 'points-v2-e056-note',
    'La V2 n’ajoute aucune région live : elle ne fait que restituer en texte un état déjà lisible. La grille reste lisible et le tableau construisable même si aucune animation n’est disponible.');
  note.id = NOTE_ID;
  panel.appendChild(note);
}

/* E056-V2-03 / V2-07 / V2-09 : compteurs calculés sur les lignes réelles, donc
 * bornés par les quatre statuts normatifs. L'écho de la passe 1 est lu dans son
 * bloc de compteurs, jamais supposé. */
function refresh(ctx, layout) {
  const signals = readLedger(layout);
  const items = readItems(signals.items);
  const rows = rowsOf(items);
  const summaryText = txt(signals.summary);
  const metricsText = txt(signals.metrics);
  const sig = signature(rows, summaryText, metricsText);
  if (sig === lastSignature) return;
  lastSignature = sig;
  refreshCount += 1;

  fillTable(ctx, bodyRef, rows);
  const presentCount = rows.filter((row) => row.present).length;
  const absentCount = rows.length - presentCount;
  if (metricsRef) {
    metricsRef.textContent =
      `Lecture V2 : ${rows.length} ${plural(rows.length, 'statut de source', 'statuts de source')} · ` +
      `${presentCount} ${plural(presentCount, 'présent', 'présents')} · ` +
      `${absentCount} ${plural(absentCount, 'absent', 'absents')} · ` +
      `${refreshCount} ${plural(refreshCount, 'actualisation', 'actualisations')}.`;
  }
  if (echoRef) {
    echoRef.textContent = metricsText
      ? 'Référence passe 1 : ' + metricsText
      : 'Référence passe 1 : aucun compteur exposé ; lecture V2 seule.';
  }
  if (signals.ledger && signals.ledger !== ledgerRef) ledgerRef = signals.ledger;
  describeLedger(ledgerRef);
}

/* E056-V2-09 : un seul observateur, jamais sur le panneau V2 ni sur ses
 * descendants (sinon boucle d'écriture). Il ne lit que les deux signaux déjà
 * produits par la passe 1 : la liste des lignes et son bloc de compteurs. */
function observe(ctx, layout) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx && layoutRef && layoutRef.isConnected) refresh(currentCtx, layoutRef);
  });
  const signals = readLedger(layout);
  const options = { childList: true, subtree: true, characterData: true };
  if (signals.items) observer.observe(signals.items, options);
  if (signals.metrics) observer.observe(signals.metrics, options);
}

function registerPanel(ctx, layout, ledger) {
  const found = nodesById(PANEL_ID);
  let panel = null;
  for (const node of found) {
    if (layout.contains(node)) { panel = node; break; }
  }
  found.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!panel) {
    panel = ctx.el('section', 'points-v2-e056-panel');
    buildPanel(ctx, panel);
    lastSignature = '';
    /* Insertion dans .points-detail, jamais sous body/stage/layout : le panel
     * échappe ainsi au marquage de _diagnostics.js (motif *-e056). */
    const parent = (ledger && ledger.parentElement) ? ledger.parentElement : layout;
    if (ledger && ledger.nextSibling) parent.insertBefore(panel, ledger.nextSibling);
    else parent.appendChild(panel);
  }

  panelRef = panel;
  bodyRef = query(panel, '#' + BODY_ID);
  metricsRef = query(panel, '#' + METRICS_ID);
  echoRef = query(panel, '#' + ECHO_ID);
  if (!bodyRef || !metricsRef || !echoRef) {
    buildPanel(ctx, panel);
    lastSignature = '';
    bodyRef = query(panel, '#' + BODY_ID);
    metricsRef = query(panel, '#' + METRICS_ID);
    echoRef = query(panel, '#' + ECHO_ID);
  }
  enforceUnique(PANEL_ID, panel);
  return panel;
}

register('E056', (ctx) => {
  const { viewId, stage, layout, css, el, reducedMotion } = ctx;
  if (VIEW_IDS.indexOf(viewId) === -1 || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  currentCtx = ctx;
  layoutRef = layout;

  /* E056-V2-01 : injection unique (cssOnce) et ancrage de la portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E056-V2-10 : couplement explicite à la préférence de mouvement réduit. */
  let reduced = false;
  if (typeof reducedMotion === 'function') {
    try { reduced = !!reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E056-V2-02 : cible d'insertion = le registre de la passe 1, sinon le
   * layout, sans jamais retirer ni réécrire un nœud de la passe 1. */
  const signals = readLedger(layout);
  ledgerRef = signals.ledger;
  registerPanel(ctx, layout, ledgerRef);
  /* Relation ARIA posée à chaque rendu, même si refresh() sort sans écrire. */
  describeLedger(ledgerRef);

  observe(ctx, layout);

  /* Le tableau venant d'être reconstruit, sa signature est remise à zéro :
   * refresh() doit le peupler même si la donnée n'a pas changé entre rendus. */
  refresh(ctx, layout);
});
