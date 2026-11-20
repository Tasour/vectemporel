import { register } from './registry.js';

/* Lentille E055 — passe 2 (module POINTS/V2 E055). Registre de controverse :
 * restitution sémantique des signaux de désaccord produits par la passe 1.
 *
 * Dix chantiers V2, E055-V2-01 à E055-V2-10, documentés dans
 * UNIFIED_AUDIT/POINTS/V2/views/E055.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E055.js) garde
 * la main sur la détection, le bloc de controverse, le lien vers la pastille,
 * le registre des désaccords et ses compteurs. La passe 2 ne modifie aucun de
 * ces signaux : elle les RELIT dans le DOM réel et les restitue sous forme de
 * tableau sémantique, de fiche de vérité et de limite falsifiable. Aucune
 * donnée historique n'est inventée : états, certitude brute et grandeurs sont
 * lus dans les miroirs `data-points-e055-*` écrits par la passe 1, eux-mêmes
 * dérivés du détail rendu par points.js et de POINT_METHODOLOGY.md §1, §3.6
 * et §3.7.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état applicative, aucun
 * écouteur global, aucune région live supplémentaire. Le seul ajout à un nœud
 * de la passe 1 est un aria-describedby complété (jamais écrasé) sur le bloc
 * de controverse.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * identifiants préfixés points-v2-e055- ; tout DOM bâti avec ctx.el, jamais de
 * réinterprétation de balisage ; zéro réseau, zéro aléa, zéro sortie de
 * débogage, zéro minutage, zéro boucle d'animation ; chaque état porte un
 * glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e055';
const SCOPE = 'points-v2-e055';
const PANEL_ID = 'points-v2-e055-panel';
const TITLE_ID = 'points-v2-e055-title';
const TABLE_ID = 'points-v2-e055-table';
const BODY_ID = 'points-v2-e055-body';
const FACTS_ID = 'points-v2-e055-facts';
const LIMIT_ID = 'points-v2-e055-limite';
const METRICS_ID = 'points-v2-e055-metrics';
const ECHO_ID = 'points-v2-e055-echo';
const RAW_ID = 'points-v2-e055-raw';
const NOTE_ID = 'points-v2-e055-note';
const REDUCED_ATTR = 'data-v2-e055-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Ids de la passe 1, lus en lecture seule — jamais réécrits. */
const P1_NOTE_ID = 'points-e055-note';
const P1_SUMMARY_ID = 'points-e055-summary';

/* Attributs miroirs de la passe 1, lus en lecture seule et seuls surveillés. */
const P1_MIRRORS = [
  'data-points-e055-state',
  'data-points-e055-raw',
  'data-points-e055-silences',
  'data-points-e055-signature',
  'data-points-e055-observed',
  'data-points-e055-active',
];

/* E055-V2-05 (avec E055-V2-03) : trois états nommés. La clé est lue dans le miroir
 * `data-points-e055-state` posé par la passe 1 ; le glyphe et le mot sont
 * portés par la table ci-dessous pour ne jamais afficher un état muet. La
 * couleur V2 ne fait que doubler ce texte, elle ne le remplace pas. */
const STATES = {
  'dispute-explicite': {
    mark: '⚖',
    word: 'Désaccord explicite',
    badge: 'pastille « disputé » ou « disputed »',
    dossier: 'La controverse est écrite dans la pastille de certitude elle-même.',
    issue: 'Non résolu — le doute est affiché tel quel.',
  },
  'dispute-silencieux': {
    mark: '◐',
    word: 'Désaccord silencieux',
    badge: 'autre certitude affichée (ex. « vérifié »)',
    dossier: 'Le texte ou la justification mentionne un désaccord.',
    issue: 'Non résolu — le silence ne tranche pas la controverse.',
  },
  aucun: {
    mark: '○',
    word: 'Aucun signal',
    badge: 'certitude stable',
    dossier: 'Ni pastille disputée, ni mention de dispute dans le dossier.',
    issue: 'Aucun désaccord détecté par la lentille.',
  },
};
const STATE_KEYS = ['dispute-explicite', 'dispute-silencieux', 'aucun'];

/* E055-V2-01 / V2-09 / V2-10 : feuille unique, entièrement préfixée par
 * .points-v2-e055, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. Le glyphe et le mot portent l'information ; la couleur ne fait
 * que la doubler et la transition se limite à cette couleur. */
const CSS = `
.points-v2-e055 .points-v2-e055-panel {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6);
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e055 .points-v2-e055-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e055 .points-v2-e055-intro,
.points-v2-e055 .points-v2-e055-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e055 .points-v2-e055-fait {
  margin: 0 0 6px; padding-left: 10px;
  border-left: 2px solid var(--line-strong);
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e055 .points-v2-e055-table {
  width: 100%; border-collapse: collapse; margin: 8px 0;
  font-size: 11px; line-height: 1.45;
}
.points-v2-e055 .points-v2-e055-table caption {
  text-align: left; margin: 0 0 6px;
  font-size: 11px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e055 .points-v2-e055-table th,
.points-v2-e055 .points-v2-e055-table td {
  border: 1px solid var(--line); padding: 5px 7px;
  text-align: left; vertical-align: top;
}
.points-v2-e055 .points-v2-e055-table thead th {
  color: var(--gold-bright); font-weight: 600; background: rgba(255, 255, 255, .03);
}
.points-v2-e055 .points-v2-e055-table tbody th {
  color: var(--ink); font-weight: 600; white-space: nowrap;
}
.points-v2-e055 .points-v2-e055-table .points-v2-e055-signal {
  white-space: nowrap; transition: color .18s linear;
}
.points-v2-e055 .points-v2-e055-tr.is-dispute-explicite .points-v2-e055-signal { color: var(--gold-bright); }
.points-v2-e055 .points-v2-e055-tr.is-dispute-silencieux .points-v2-e055-signal { color: var(--gold); }
.points-v2-e055 .points-v2-e055-tr.is-aucun .points-v2-e055-signal { color: var(--muted-2); }
.points-v2-e055 .points-v2-e055-table .points-v2-e055-courant { white-space: nowrap; }
.points-v2-e055 .points-v2-e055-metrics,
.points-v2-e055 .points-v2-e055-echo,
.points-v2-e055 .points-v2-e055-raw {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e055 .points-v2-e055-echo { color: var(--muted-2); }
.points-v2-e055 .points-v2-e055-limite {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
}
.points-v2-e055 .points-v2-e055-limite h3 {
  margin: 0 0 6px; font-size: 12px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e055 .points-v2-e055-limite ol {
  margin: 0; padding-left: 20px;
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e055 .points-v2-e055-limite li { margin-bottom: 4px; }
.points-v2-e055[` + REDUCED_ATTR + `="1"] .points-v2-e055-signal { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e055 .points-v2-e055-signal { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e055 .points-v2-e055-table th,
  .points-v2-e055 .points-v2-e055-table td { padding: 4px 5px; }
  .points-v2-e055 .points-v2-e055-table { font-size: 10px; }
}
@media (forced-colors: active) {
  .points-v2-e055 .points-v2-e055-panel,
  .points-v2-e055 .points-v2-e055-table th,
  .points-v2-e055 .points-v2-e055-table td { border-color: CanvasText; }
  .points-v2-e055 .points-v2-e055-signal { color: CanvasText; }
}
@media print {
  .points-v2-e055 .points-v2-e055-panel { border-color: #666; background: transparent; }
  .points-v2-e055 .points-v2-e055-limite { break-inside: avoid; }
}
`;

/* E055-V2-07 : fiche de vérité — trois faits sourcés de POINT_METHODOLOGY.md
 * (§1 critère 8, §3.6 règle 6, §3.7 règle 7). Trois grandeurs chiffrées, dont
 * une comparée à une référence : quatre degrés de certitude, deux sources
 * indépendantes minimum pour un point contesté, une controverse non résolue
 * par un silence. */
const FACTS = [
  '§1 — Critère 8 : un degré de certitude parmi « certain », « probable », « disputé » et « non documenté ». Le disputé est une valeur canonique, pas un défaut de saisie.',
  '§3.6 (règle 6) — Le disputé reste disputé : on ne résout pas une controverse par un silence. Une seule pastille « vérifié » ne clôt pas un dossier qui dit « reste disputé ».',
  '§3.7 (règle 7) — Les silences sont des données : « aucune source » doit être explicite, jamais un vide masqué. Rapporté à la règle 5, un point contesté dit « certain » exige deux sources indépendantes minimum.',
];

/* E055-V2-08 : limite falsifiable en cinq temps, alignée sur les angles morts
 * de la passe 1 (lexique strict sur la racine `disput`, compteur volatile,
 * aucun décompte global du dataset). */
const LIMIT = [
  'Prédiction : si la controverse est correctement rendue, toute pastille « disputé / disputed » ouvre un dossier nommé, et tout dossier disant « reste disputé » est signalé même avec une pastille « vérifié ».',
  'Réglage : parcourir les points du périmètre avec « Point précédent / suivant », puis lire l’état data-points-e055-state et la certitude brute data-points-e055-raw portés par le détail.',
  'Résultat attendu : l’état passe à « dispute-explicite » ou « dispute-silencieux » selon le cas ; le tableau V2 coche la ligne correspondante et le compteur de désaccords distincts augmente.',
  'Falsification : si un dossier contenant « reste disputé » reste à l’état « aucun » avec une pastille « vérifié », la détection par la racine « disput » est en défaut — la règle §3.6 est contredite.',
  'Débrief : angle mort — le lexique est volontairement strict. Une controverse écrite « contesté », « débattu » ou « thèse discutée » échappe à la lentille ; son élargissement relève de la méthodologie, pas de cette V2. Le compteur observed est volatile : il ne survit pas à un rechargement.',
];

let observer = null;       // un seul observateur, reconnecté à chaque rendu
let currentCtx = null;     // dernier ctx, pour le callback de l'observateur
let layoutRef = null;      // dernier layout, pour le callback de l'observateur
let panelRef = null;       // panneau V2 conservé
let bodyRef = null;        // <tbody> du tableau V2, seul bloc de lignes remplacé
let metricsRef = null;     // compteurs V2
let echoRef = null;        // écho du récapitulatif de la passe 1
let rawRef = null;         // certitude brute lue dans le miroir passe 1
let noteRef = null;        // bloc de controverse de la passe 1, pour l'ARIA additive
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

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
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

/* E055-V2-02 : repérage NON destructif des signaux de la passe 1. Aucun nœud
 * n'est créé dans le détail, aucun miroir n'est réécrit : la V2 lit l'état
 * `data-points-e055-*` et le bloc `#points-e055-note` tels que la passe 1 les
 * a posés, et s'en tient là. */
function readP1(layout) {
  const detail = query(layout, '.points-detail');
  const note = query(layout, '#' + P1_NOTE_ID);
  const summary = query(layout, '#' + P1_SUMMARY_ID);
  const state = txt(getAttr(detail, 'data-points-e055-state')) || 'aucun';
  return {
    detail,
    note,
    summary,
    state: STATE_KEYS.indexOf(state) !== -1 ? state : 'aucun',
    raw: txt(getAttr(detail, 'data-points-e055-raw')),
    silences: txt(getAttr(detail, 'data-points-e055-silences')),
    signature: txt(getAttr(detail, 'data-points-e055-signature')),
    observed: txt(getAttr(detail, 'data-points-e055-observed')),
    active: txt(getAttr(detail, 'data-points-e055-active')),
    summaryText: txt(summary),
  };
}

/* E055-V2-03 / V2-09 : signature déterministe, sans aléa. Elle joint l'état,
 * la certitude brute, les compteurs et le récapitulatif de la passe 1 : deux
 * rendus identiques ne provoquent aucune réécriture du panneau V2. */
function signature(signals) {
  return [
    signals.state,
    signals.raw,
    signals.silences,
    signals.observed,
    signals.active,
    signals.summaryText,
  ].join('\u241f');
}

/* E055-V2-04 : le tableau est bâti avec ctx.el — aucune réinterprétation de
 * balisage. <caption>, <th scope="col"> et <th scope="row"> le rendent
 * indexable et parcourable sans le moindre script d'animation. Chaque ligne
 * porte une classe d'état et un glyphe + un mot, jamais la couleur seule. */
function fillTable(ctx, body, state) {
  if (!body) return;
  const rows = STATE_KEYS.map((key) => {
    const meta = STATES[key];
    const current = key === state;
    const tr = ctx.el('tr', 'points-v2-e055-tr is-' + key);

    const signal = ctx.el('th', 'points-v2-e055-signal', meta.mark + ' ' + meta.word);
    signal.setAttribute('scope', 'row');
    tr.appendChild(signal);

    tr.appendChild(ctx.el('td', '', meta.badge));
    tr.appendChild(ctx.el('td', '', meta.dossier + ' ' + meta.issue));
    tr.appendChild(ctx.el('td', 'points-v2-e055-courant',
      (current ? '● actif' : '○ inactif') + (current ? ' — lecture courante' : '')));
    return tr;
  });
  body.replaceChildren(...rows);
}

/* E055-V2-06 : relation ARIA additive sur le bloc de controverse de la passe
 * 1. Les tokens déjà présents sont conservés ; l'identifiant V2 n'est ajouté
 * qu'une fois. C'est le seul ajout à un nœud de la passe 1. */
function describeP1(note) {
  if (!note) return;
  const tokens = (getAttr(note, 'aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.indexOf(NOTE_ID) === -1) {
    tokens.push(NOTE_ID);
    setAttr(note, 'aria-describedby', tokens.join(' '));
  }
}

/* E055-V2-01 / V2-04 / V2-06 / V2-07 / V2-08 : structure statique construite
 * une seule fois. Seuls le <tbody>, les compteurs, l'écho, la certitude brute
 * et l'ARIA sont actualisés par refresh(). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'points-v2-e055-title', 'Registre V2 — le disputé reste disputé');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e055-intro',
    'Ce registre relit, sans les modifier, l’état de controverse, la certitude affichée et les compteurs tels que la lentille de la passe 1 les a rendus depuis le détail et POINT_METHODOLOGY.md §1, §3.6 et §3.7.'));

  const facts = ctx.el('div', 'points-v2-e055-facts');
  facts.id = FACTS_ID;
  FACTS.forEach((text) => facts.appendChild(ctx.el('p', 'points-v2-e055-fait', text)));
  panel.appendChild(facts);

  const table = ctx.el('table', 'points-v2-e055-table');
  table.id = TABLE_ID;
  const caption = ctx.el('caption', '', 'Trois lectures possibles d’un désaccord — signal, pastille, dossier et état courant');
  table.appendChild(caption);
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Signal', 'Pastille affichée', 'Dossier et portée', 'Lecture courante'].forEach((label) => {
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

  rawRef = ctx.el('p', 'points-v2-e055-raw', '');
  rawRef.id = RAW_ID;
  panel.appendChild(rawRef);

  metricsRef = ctx.el('p', 'points-v2-e055-metrics', '');
  metricsRef.id = METRICS_ID;
  panel.appendChild(metricsRef);

  echoRef = ctx.el('p', 'points-v2-e055-echo', '');
  echoRef.id = ECHO_ID;
  panel.appendChild(echoRef);

  const limite = ctx.el('div', 'points-v2-e055-limite');
  limite.id = LIMIT_ID;
  limite.appendChild(ctx.el('h3', '', 'Limite falsifiable — cinq temps'));
  const list = ctx.el('ol');
  LIMIT.forEach((text) => list.appendChild(ctx.el('li', '', text)));
  limite.appendChild(list);
  panel.appendChild(limite);

  const note = ctx.el('p', 'points-v2-e055-note',
    'La V2 n’ajoute aucune région live : elle ne fait que restituer en texte un état déjà lisible. Le registre reste lisible et la controverse construisable même si aucune animation n’est disponible.');
  note.id = NOTE_ID;
  panel.appendChild(note);
}

/* E055-V2-03 / V2-07 / V2-09 : compteurs calculés sur les miroirs réels, donc
 * bornés par ce que la passe 1 a effectivement observé. L'écho de la passe 1
 * est lu dans son récapitulatif, jamais supposé. */
function refresh() {
  const signals = readP1(layoutRef);
  const sig = signature(signals);
  if (sig === lastSignature) return;
  lastSignature = sig;
  refreshCount += 1;

  fillTable(currentCtx, bodyRef, signals.state);

  if (rawRef) {
    rawRef.textContent = signals.raw
      ? 'Certitude affichée (miroir passe 1) : « ' + signals.raw + ' » — conservée sans traduction.'
      : 'Certitude affichée (miroir passe 1) : aucune valeur lisible.';
  }
  if (metricsRef) {
    const state = STATES[signals.state];
    metricsRef.textContent =
      `Lecture V2 : ${state.mark} ${state.word} · ` +
      `${signals.silences || 'non lu'} cellule(s) vide(s) · ` +
      `${signals.observed || '0'} désaccord(s) distinct(s) observé(s) · ` +
      `${refreshCount} ${plural(refreshCount, 'actualisation', 'actualisations')}.`;
  }
  if (echoRef) {
    echoRef.textContent = signals.summaryText
      ? 'Référence passe 1 : ' + signals.summaryText
      : 'Référence passe 1 : aucun récapitulatif exposé ; lecture V2 seule.';
  }
  noteRef = signals.note;
  describeP1(noteRef);
}

/* E055-V2-09 : un seul observateur, jamais sur le panneau V2 ni sur ses
 * descendants (sinon boucle d'écriture). Il ne surveille que les ATTRIBUTS
 * miroirs posés par la passe 1 sur le détail ; les écritures V2 (enfants du
 * détail, ARIA sur le bloc, attributs sur le layout) ne le déclenchent pas. */
function observe(ctx, layout, detail) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined' || !detail) return;
  observer = new MutationObserver(() => {
    if (currentCtx && layoutRef && layoutRef.isConnected) refresh();
  });
  observer.observe(detail, { attributes: true, attributeFilter: P1_MIRRORS });
}

/* E055-V2-10 : garde anti-doublon — tout nœud portant l'id du panneau qui n'est
 * pas celui conservé dans ce layout est retiré, y compris un nœud détaché. */
function registerPanel(ctx, layout, reference) {
  const found = nodesById(PANEL_ID);
  let panel = null;
  for (const node of found) {
    if (layout.contains(node)) { panel = node; break; }
  }
  found.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!panel) {
    panel = ctx.el('section', 'points-v2-e055-panel');
    buildPanel(ctx, panel);
    lastSignature = '';
    const parent = (reference && reference.parentElement)
      ? reference.parentElement
      : (layout.querySelector('.points-detail') || layout);
    if (reference && reference.nextSibling) parent.insertBefore(panel, reference.nextSibling);
    else parent.appendChild(panel);
  }

  panelRef = panel;
  bodyRef = query(panel, '#' + BODY_ID);
  metricsRef = query(panel, '#' + METRICS_ID);
  echoRef = query(panel, '#' + ECHO_ID);
  rawRef = query(panel, '#' + RAW_ID);
  if (!bodyRef || !metricsRef || !echoRef || !rawRef) {
    buildPanel(ctx, panel);
    lastSignature = '';
    bodyRef = query(panel, '#' + BODY_ID);
    metricsRef = query(panel, '#' + METRICS_ID);
    echoRef = query(panel, '#' + ECHO_ID);
    rawRef = query(panel, '#' + RAW_ID);
  }
  return panel;
}

register('E055', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (VIEW_IDS.indexOf(viewId) === -1 || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  currentCtx = ctx;
  layoutRef = layout;

  /* E055-V2-01 : injection unique (cssOnce) et ancrage de la portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E055-V2-10 : couplement explicite à la préférence de mouvement réduit. */
  let reduced = false;
  if (typeof reducedMotion === 'function') {
    try { reduced = !!reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E055-V2-02 : cible d'insertion = le bloc de controverse de la passe 1,
   * sinon le détail, sans jamais retirer ni réécrire un nœud de la passe 1. */
  const signals = readP1(layout);
  noteRef = signals.note;
  registerPanel(ctx, layout, noteRef || signals.detail);

  observe(ctx, layout, signals.detail);

  /* Le tableau venant d'être reconstruit, sa signature est remise à zéro :
   * refresh() doit le peupler même si la donnée n'a pas changé entre rendus. */
  refresh();
});
