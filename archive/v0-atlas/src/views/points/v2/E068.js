import { register } from './registry.js';

/* Lentille E068 — passe 2 (module POINTS/V2 E068). Tableau de bord d'audit de
 * l'idempotence multi-rendus, en complément du journal de rendu produit par la
 * passe 1.
 *
 * Dix chantiers V2, E068-V2-01 à E068-V2-10, documentés dans
 * UNIFIED_AUDIT/POINTS/V2/views/E068.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E068.js) garde
 * la main sur son journal, son bouton de repli, ses compteurs et son
 * observateur. La passe 2 ne modifie aucun de ces signaux : elle les RELIT dans
 * le DOM réel et les restitue sous forme de grille de conformité, de fiche de
 * vérité et de limite falsifiable. Seul un aria-describedby complété (jamais
 * écrasé) est ajouté à la région du journal passe 1. Aucun chiffre, aucun
 * millésime et aucun nom de domaine n'est inventé : seules les valeurs
 * effectivement rendues par la passe 1 et par points.js sont citées, sinon
 * l'absence est énoncée telle quelle.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, le routeur ou une autre lentille : aucun
 * filtre, ère, index ni état applicatif n'est modifié. Zéro réseau, zéro aléa,
 * zéro sortie de débogage, zéro minutage, zéro boucle d'animation et jamais
 * de réinterprétation de balisage.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu,
 * un seul observateur reconnecté, une seule écriture par signature changée ;
 * identifiants préfixés points-v2-e068- ; tout DOM bâti avec ctx.el.
 */

const CSS_ID = 'points-v2-e068';
const SCOPE = 'points-v2-e068';
const PANEL_ID = 'points-v2-e068-panel';
const TITLE_ID = 'points-v2-e068-title';
const TABLE_ID = 'points-v2-e068-table';
const BODY_ID = 'points-v2-e068-body';
const FACTS_ID = 'points-v2-e068-facts';
const LIMIT_ID = 'points-v2-e068-limite';
const METRICS_ID = 'points-v2-e068-metrics';
const ECHO_ID = 'points-v2-e068-echo';
const NOTE_ID = 'points-v2-e068-note';
const REDUCED_ATTR = 'data-v2-e068-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Ids et signaux de la passe 1, lus en lecture seule — jamais réécrits. */
const P1_CSS_ID = 'points-e068';
const P1_LEDGER_ID = 'points-e068-ledger';
const P1_TITLE_ID = 'points-e068-ledger-title';
const P1_BODY_ID = 'points-e068-ledger-body';
const P1_TOGGLE_ID = 'points-e068-toggle';
const P1_LINE_SEL = '.points-e068-line';
const P1_SIGNATURE_SEL = '.points-e068-signature';
const P1_REDUCED_ATTR = 'data-e068-reduced';
const P1_SCOPE = 'points-e068';

/* E068-V2-05 : trois statuts nommés. Le glyphe et le mot sont portés par le
 * texte V2 ; la couleur ne fait que doubler ce texte, avec repli forced-colors.
 * Aucune information n'est confiée à la seule couleur. */
const STATES = {
  conforme: { mark: '✔', word: 'conforme' },
  aVerifier: { mark: '△', word: 'à vérifier' },
  absent: { mark: '○', word: 'absent' },
};

/* E068-V2-01 / V2-09 / V2-10 : feuille unique, entièrement préfixée par
 * .points-v2-e068, classe posée sur .points-layout : aucune fuite hors de
 * cette vue et aucune collision avec la feuille points-e068 de la passe 1. */
const CSS = `
.points-v2-e068 .points-v2-e068-panel {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6);
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e068 .points-v2-e068-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e068 .points-v2-e068-intro,
.points-v2-e068 .points-v2-e068-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e068 .points-v2-e068-fait {
  margin: 0 0 6px; padding-left: 10px;
  border-left: 2px solid var(--line-strong);
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e068 .points-v2-e068-table {
  width: 100%; border-collapse: collapse; margin: 8px 0;
  font-size: 11px; line-height: 1.45;
}
.points-v2-e068 .points-v2-e068-table caption {
  text-align: left; margin: 0 0 6px;
  font-size: 11px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e068 .points-v2-e068-table th,
.points-v2-e068 .points-v2-e068-table td {
  border: 1px solid var(--line); padding: 5px 7px;
  text-align: left; vertical-align: top;
}
.points-v2-e068 .points-v2-e068-table thead th {
  color: var(--gold-bright); font-weight: 600; background: rgba(255, 255, 255, .03);
}
.points-v2-e068 .points-v2-e068-table tbody th {
  color: var(--ink); font-weight: 600; white-space: nowrap;
}
.points-v2-e068 .points-v2-e068-table .points-v2-e068-statut {
  white-space: nowrap; transition: color .18s linear;
}
.points-v2-e068 .points-v2-e068-tr.is-conforme .points-v2-e068-statut { color: var(--gold-bright); }
.points-v2-e068 .points-v2-e068-tr.is-aVerifier .points-v2-e068-statut { color: var(--info, #9ec9e8); }
.points-v2-e068 .points-v2-e068-tr.is-absent .points-v2-e068-statut { color: var(--muted-2); }
.points-v2-e068 .points-v2-e068-preuve { white-space: normal; }
.points-v2-e068 .points-v2-e068-metrics,
.points-v2-e068 .points-v2-e068-echo {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e068 .points-v2-e068-echo { color: var(--muted-2); }
.points-v2-e068 .points-v2-e068-limite {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
}
.points-v2-e068 .points-v2-e068-limite h3 {
  margin: 0 0 6px; font-size: 12px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e068 .points-v2-e068-limite ol {
  margin: 0; padding-left: 20px;
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e068 .points-v2-e068-limite li { margin-bottom: 4px; }
.points-v2-e068[` + REDUCED_ATTR + `="1"] .points-v2-e068-statut { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e068 .points-v2-e068-statut { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e068 .points-v2-e068-table th,
  .points-v2-e068 .points-v2-e068-table td { padding: 4px 5px; }
  .points-v2-e068 .points-v2-e068-table { font-size: 10px; }
}
@media (forced-colors: active) {
  .points-v2-e068 .points-v2-e068-panel,
  .points-v2-e068 .points-v2-e068-table th,
  .points-v2-e068 .points-v2-e068-table td { border-color: CanvasText; }
  .points-v2-e068 .points-v2-e068-statut { color: CanvasText; }
}
@media print {
  .points-v2-e068 .points-v2-e068-panel { border-color: #666; background: transparent; }
  .points-v2-e068 .points-v2-e068-limite { break-inside: avoid; }
}
`;

/* E068-V2-07 : fiche de vérité — trois faits sourcés des contrats effectivement
 * lus (v2/registry.js, passe 1 E068.js). Aucune affirmation datée ni inventée. */
const FACTS = [
  'Un greffon par module : v2/registry.js:9-11 empile une entrée par appel à register(), et runEnhancements() rejoue toutes les entrées à chaque rendu (v2/registry.js:28-44).',
  'cssOnce protège la feuille par son identifiant : v2/registry.js:13-19 ne crée le <style> que s’il n’existe pas déjà — la V2 ne contourne jamais ce contrat (ctx.css).',
  'Un rendu neuf se détecte par nœud déconnecté : la passe 1 E068.js:243 teste !layout.isConnected, sans signal externe, sans aléa et sans minuteur.',
];

/* E068-V2-08 : limite falsifiable en cinq temps, alignée sur les angles morts
 * de la passe 1 (le journal rend l'écart visible, il ne le corrige pas). */
const LIMIT = [
  'Prédiction : si l’idempotence tient, après plusieurs rendus le document ne contient qu’un seul #points-e068-ledger et qu’une seule feuille #points-e068, tandis que « Rendus détectés » de la passe 1 augmente d’une unité par reconstruction de la vue.',
  'Réglage : changer d’ère, filtrer un domaine, puis quitter et rouvrir la vue Points ; lire la grille V2 et l’écho du journal de la passe 1.',
  'Résultat attendu : les lignes « Greffon unique » et « Feuille CSS unique » restent « conformes » avec la valeur 1, et « Rendu neuf détecté » affiche un nombre supérieur au rendu précédent.',
  'Falsification : si le nombre de panneaux ou de feuilles dépasse 1, ou si « Rendus détectés » reste figé alors que la vue a été reconstruite, la grille V2 doit basculer en « à vérifier » : l’idempotence est alors en défaut.',
  'Débrief : angle mort — la V2 lit le DOM et les compteurs écrits par la passe 1 ; elle ne peut pas observer directement les écouteurs ni l’observateur internes, et ne remplace pas les tests E2E de l’agent maître.',
];

let observer = null;        // un seul observateur, reconnecté à chaque rendu
let currentCtx = null;      // dernier ctx, pour le callback de l'observateur
let layoutRef = null;       // dernier layout, pour le callback de l'observateur
let panelRef = null;        // panneau V2 conservé
let bodyRef = null;         // <tbody> du tableau V2, seul bloc de lignes remplacé
let metricsRef = null;      // compteurs V2
let echoRef = null;         // écho du journal de la passe 1
let ledgerRef = null;       // région du journal passe 1, pour l'ARIA additive
let lastSignature = '';     // évite les écritures redondantes
let refreshCount = 0;       // nombre réel d'actualisations de la grille V2
let renderCount = 0;        // passages dans le greffon V2
let deduped = 0;            // panneaux V2 surnuméraires retirés depuis le chargement

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function queryAll(root, selector) {
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

function shorten(value) {
  const str = String(value || '');
  return str.length > 88 ? str.slice(0, 85) + '…' : str;
}

function closestMatch(node, selector) {
  return node && typeof node.closest === 'function' ? node.closest(selector) : null;
}

function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

/* E068-V2-10 : garde anti-doublon — tout nœud portant l'id V2 qui n'est pas
 * celui conservé est retiré du document. Le retrait ne cible que notre propre
 * ID, jamais un nœud de la passe 1 ou d'une autre lentille. */
function enforceUnique(id, keep) {
  const found = nodesById(id);
  found.forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || found[0] || null;
}

/* E068-V2-02 : repérage NON destructif du journal de la passe 1 et de ses six
 * signaux, par leurs ids/classes préfixés `points-e068-*`. Aucun nœud n'est
 * créé dans le journal, aucun compteur n'est réécrit. */
function readLedger(layout) {
  return {
    ledger: query(layout, '#' + P1_LEDGER_ID),
    title: query(layout, '#' + P1_TITLE_ID),
    body: query(layout, '#' + P1_BODY_ID),
    toggle: query(layout, '#' + P1_TOGGLE_ID),
    lines: queryAll(layout, P1_LINE_SEL),
    signature: query(layout, P1_SIGNATURE_SEL),
    reduced: getAttr(layout, P1_REDUCED_ATTR),
    scope: !!(layout.classList && layout.classList.contains(P1_SCOPE)),
  };
}

/* E068-V2-03 : relecture des compteurs réellement écrits par la passe 1 —
 * aucun chiffre n'est codé en dur dans la V2. Une valeur manquante devient 0
 * ou une chaîne vide, jamais une exception. */
function extractNumber(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? Number(match[1]) : 0;
}

function extractWord(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? match[1] : '';
}

function counters(signals) {
  const all = signals.lines.map(txt).join(' ');
  return {
    duplicates: extractNumber(all, /doublons retirés\s*:\s*(\d+)/i),
    renders: extractNumber(all, /Rendus détectés\s*:\s*(\d+)/i),
    installs: extractNumber(all, /installations sur ce rendu\s*:\s*(\d+)/i),
    connected: extractWord(all, /Nœud connecté\s*:\s*(oui|non)/i),
    writes: extractNumber(all, /écritures\s*:\s*(\d+)/i),
    signature: txt(signals.signature),
  };
}

/* E068-V2-04 : grandeurs structurelles relevées dans le document entier, sans
 * toucher aux nœuds : unicité du panneau passe 1, de sa feuille et de la nôtre. */
function domMetrics() {
  let styles1 = 0;
  let styles2 = 0;
  let panels1 = 0;
  let toggles1 = 0;
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    styles1 = document.querySelectorAll('style[id="' + P1_CSS_ID + '"]').length;
    styles2 = document.querySelectorAll('style[id="' + CSS_ID + '"]').length;
    panels1 = document.querySelectorAll('[id="' + P1_LEDGER_ID + '"]').length;
    toggles1 = document.querySelectorAll('[id="' + P1_TOGGLE_ID + '"]').length;
  }
  return { styles1, styles2, panels1, toggles1 };
}

function readReduced(ctx) {
  if (!ctx || typeof ctx.reducedMotion !== 'function') return false;
  try { return !!ctx.reducedMotion(); }
  catch { return false; }
}

/* E068-V2-04 / V2-05 : huit lignes de conformité, toutes dérivées du DOM réel.
 * Chaque ligne porte un glyphe ET un mot : la couleur ne fait que doubler le
 * texte. L'état « à vérifier » distingue un signal ambigu d'un signal absent. */
function rowsOf(signals, c, d, reduced) {
  const row = (key, label, state, value) => ({ key, label, state, value });
  const present = signals.ledger ? 'présent' : 'absent';
  const observedNode = signals.ledger
    && !closestMatch(signals.ledger, '.points-grid, .points-detail');
  const motionOk = signals.reduced === (reduced ? '1' : null);
  return [
    row('greffon', 'Greffon unique',
      d.panels1 === 1 ? 'conforme' : (d.panels1 ? 'aVerifier' : 'absent'),
      d.panels1 + ' panneau(x) #points-e068-ledger dans le document ; relevé ' + present + '.'),
    row('css', 'Feuille CSS unique',
      d.styles1 === 1 ? 'conforme' : (d.styles1 ? 'aVerifier' : 'absent'),
      d.styles1 + ' feuille(s) #points-e068 ; ' + d.styles2 + ' feuille(s) #points-v2-e068.'),
    row('rendu', 'Rendu neuf détecté',
      c.renders >= 1 && c.connected === 'oui' ? 'conforme' : (c.renders ? 'aVerifier' : 'absent'),
      c.renders + ' rendu(s) détecté(s) ; nœud connecté : ' + (c.connected || 'non lu')
        + ' ; ' + c.installs + ' installation(s) sur ce rendu.'),
    row('cablage', 'Câblage unique',
      d.toggles1 === 1 ? 'conforme' : (d.toggles1 ? 'aVerifier' : 'absent'),
      d.toggles1 + ' bouton(s) #points-e068-toggle ; aria-controls = '
        + (getAttr(signals.toggle, 'aria-controls') || 'absent') + '.'),
    row('observateur', 'Observateur hors relevé',
      observedNode ? 'conforme' : (signals.ledger ? 'aVerifier' : 'absent'),
      signals.ledger
        ? 'Relevé ancré dans .points-matrix, hors des zones observées .points-grid / .points-detail.'
        : 'Relevé passe 1 absent : observation non vérifiable.'),
    row('signature', 'Signature anti-écriture',
      c.signature ? 'conforme' : 'absent',
      (c.signature ? shorten(c.signature) : 'aucune signature lue')
        + ' ; ' + c.writes + ' écriture(s) ; ' + c.duplicates + ' doublon(s) retiré(s).'),
    row('mouvement', 'Mouvement réduit',
      motionOk ? 'conforme' : 'aVerifier',
      'attribut data-e068-reduced = ' + (signals.reduced === null ? 'absent' : signals.reduced)
        + ' ; préférence = ' + (reduced ? 'réduite' : 'pleine') + '.'),
    row('portee', 'Portée du greffon',
      signals.scope ? 'conforme' : 'aVerifier',
      'classe points-e068 sur le layout = ' + (signals.scope ? 'oui' : 'non')
        + ' ; panneau V2 = #points-v2-e068-panel.'),
  ];
}

function gridSignature(rows, c, d) {
  return rows.map((r) => r.key + ':' + r.state).join('|')
    + '#' + c.renders + ',' + c.installs + ',' + c.writes + ',' + c.duplicates + ',' + c.signature
    + '#' + d.panels1 + ',' + d.styles1 + ',' + d.toggles1;
}

/* E068-V2-04 : le tableau est bâti avec ctx.el — aucune réinterprétation de
 * balisage. <caption> et <th scope> le rendent indexable et parcourable sans
 * le moindre script d'animation. */
function fillTable(ctx, body, rows) {
  if (!body) return;
  const trs = rows.map((r) => {
    const state = STATES[r.state] || STATES.aVerifier;
    const tr = ctx.el('tr', 'points-v2-e068-tr is-' + r.state);
    tr.appendChild(ctx.el('th', 'points-v2-e068-statut', state.mark + ' ' + state.word));
    tr.appendChild(ctx.el('td', 'points-v2-e068-preuve', r.value));
    return tr;
  });
  if (trs.length === 0) {
    const tr = ctx.el('tr');
    const cell = ctx.el('td', '', 'Aucune ligne de conformité calculable pour ce rendu.');
    cell.colSpan = 2;
    tr.appendChild(cell);
    trs.push(tr);
  }
  body.replaceChildren(...trs);
}

/* E068-V2-06 : relation ARIA additive sur la région du journal passe 1. Les
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

/* E068-V2-01 / V2-04 / V2-06 / V2-07 / V2-08 : structure statique construite
 * une seule fois. Seuls le <tbody>, les compteurs, l'écho et l'ARIA sont
 * actualisés par refresh(). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'points-v2-e068-title', 'Lecture V2 — audit de l’idempotence');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e068-intro',
    'Cette grille relit, sans les modifier, les signaux que le journal de la passe 1 a rendus depuis le DOM de la vue Points. Elle n’ajoute aucune annonce live et ne remplace aucun test E2E.'));

  const facts = ctx.el('div', 'points-v2-e068-facts');
  facts.id = FACTS_ID;
  FACTS.forEach((text) => facts.appendChild(ctx.el('p', 'points-v2-e068-fait', text)));
  panel.appendChild(facts);

  const table = ctx.el('table', 'points-v2-e068-table');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Conformité observée / état / preuve lue dans le DOM'));
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Conformité observée', 'Preuve lue dans le DOM'].forEach((label) => {
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

  metricsRef = ctx.el('p', 'points-v2-e068-metrics', '');
  metricsRef.id = METRICS_ID;
  panel.appendChild(metricsRef);

  echoRef = ctx.el('p', 'points-v2-e068-echo', '');
  echoRef.id = ECHO_ID;
  panel.appendChild(echoRef);

  const limite = ctx.el('div', 'points-v2-e068-limite');
  limite.id = LIMIT_ID;
  limite.appendChild(ctx.el('h3', '', 'Limite falsifiable — cinq temps'));
  const list = ctx.el('ol');
  LIMIT.forEach((text) => list.appendChild(ctx.el('li', '', text)));
  limite.appendChild(list);
  panel.appendChild(limite);

  const note = ctx.el('p', 'points-v2-e068-note',
    'La V2 n’ajoute aucune région live : elle ne fait que restituer en texte un état déjà lisible. La grille reste lisible et le tableau construisable même si aucune animation n’est disponible.');
  note.id = NOTE_ID;
  panel.appendChild(note);
}

/* E068-V2-03 / V2-07 / V2-09 : compteurs calculés sur les lignes réelles, donc
 * bornés par les huit lignes de conformité. L'écho de la passe 1 est lu dans son
 * propre bloc de compteurs, jamais supposé. */
function refresh(ctx, layout) {
  const signals = readLedger(layout);
  const c = counters(signals);
  const d = domMetrics();
  const reduced = readReduced(ctx);
  const rows = rowsOf(signals, c, d, reduced);
  const sig = gridSignature(rows, c, d);
  if (sig === lastSignature) return;
  lastSignature = sig;
  refreshCount += 1;

  fillTable(ctx, bodyRef, rows);
  const ok = rows.filter((r) => r.state === 'conforme').length;
  const check = rows.filter((r) => r.state === 'aVerifier').length;
  const missing = rows.length - ok - check;
  if (metricsRef) {
    metricsRef.textContent =
      `Audit V2 : ${rows.length} ${plural(rows.length, 'contrôle', 'contrôles')} · `
      + `${ok} ${plural(ok, 'conforme', 'conformes')} · `
      + `${check} à vérifier · ${missing} ${plural(missing, 'absent', 'absents')} · `
      + `${renderCount} ${plural(renderCount, 'passage', 'passages')} · `
      + `${refreshCount} ${plural(refreshCount, 'actualisation', 'actualisations')} · `
      + `${deduped} ${plural(deduped, 'doublon retiré', 'doublons retirés')}.`;
  }
  if (echoRef) {
    echoRef.textContent = c.signature
      ? 'Référence passe 1 : ' + c.renders + ' rendu(s), ' + c.installs + ' installation(s), '
        + c.writes + ' écriture(s), ' + c.duplicates + ' doublon(s) ; signature « '
        + shorten(c.signature) + ' ».'
      : 'Référence passe 1 : aucun journal lisible ; lecture V2 seule.';
  }
  if (signals.ledger) ledgerRef = signals.ledger;
  describeLedger(ledgerRef);
}

/* E068-V2-09 : un seul observateur, jamais sur le panneau V2 ni sur ses
 * descendants (sinon boucle d'écriture). Il ne lit que le corps du journal de
 * la passe 1 : dix lignes au plus, en lecture seule. */
function observe(ctx, layout) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx && layoutRef && layoutRef.isConnected) refresh(currentCtx, layoutRef);
  });
  const signals = readLedger(layout);
  const options = { childList: true, subtree: true, characterData: true };
  if (signals.body) observer.observe(signals.body, options);
}

function registerPanel(ctx, layout, ledger) {
  const found = nodesById(PANEL_ID);
  let panel = null;
  for (const node of found) {
    if (layout.contains(node)) { panel = node; break; }
  }
  found.forEach((node) => { if (node !== panel) { removeNode(node); deduped += 1; } });

  if (!panel) {
    panel = ctx.el('section', 'points-v2-e068-panel');
    buildPanel(ctx, panel);
    lastSignature = '';
    /* Insertion juste après le journal passe 1, dans .points-matrix : le panel
     * échappe au marquage de _diagnostics.js (motif *-e068) dont le parent doit
     * être body/stage/layout, et aucun nœud de la passe 1 n'est déplacé. */
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

register('E068', (ctx) => {
  const { viewId, stage, layout, css, el, reducedMotion } = ctx;
  if (VIEW_IDS.indexOf(viewId) === -1 || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  currentCtx = ctx;
  layoutRef = layout;
  renderCount += 1;

  /* E068-V2-01 : injection unique (cssOnce) et ancrage de la portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E068-V2-10 : couplement explicite à la préférence de mouvement réduit. */
  if (readReduced(ctx)) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E068-V2-02 : cible d'insertion = le journal de la passe 1, sinon le layout,
   * sans jamais retirer ni réécrire un nœud de la passe 1. */
  const signals = readLedger(layout);
  ledgerRef = signals.ledger;
  registerPanel(ctx, layout, ledgerRef);
  describeLedger(ledgerRef);

  observe(ctx, layout);

  /* Le tableau venant d'être reconstruit, sa signature est remise à zéro :
   * refresh() doit le peupler même si la donnée n'a pas changé entre rendus. */
  refresh(ctx, layout);
});
