import { register } from './registry.js';

/* Lentille E065 — passe 2 (module POINTS/V2 E065). Registre d'audit de la
 * signature déterministe produite par la passe 1.
 *
 * Dix chantiers V2, E065-V2-01 à E065-V2-10, documentés dans
 * UNIFIED_AUDIT/POINTS/V2/views/E065.md.
 *
 * La coque appelle runEnhancementsV2({ viewId: 'pointsv2', stage, layout })
 * en plus de la passe 1. Ce module est un greffon INDÉPENDANT et
 * COMPLÉMENTAIRE : la passe 1 (src/views/points/E065.js) garde la main sur
 * mulberry32, l'empreinte FNV-1a, la graine affichée et le bandeau de barres.
 * La passe 2 ne modifie aucun de ces signaux : elle les RELIT dans le DOM réel,
 * recalcule la graine de façon autonome (sans importer la passe 1) et publie
 * un registre de concordance, une fiche de vérité chiffrée et une limite
 * falsifiable. Aucune valeur n'est inventée : tout est dérivé du DOM rendu.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucun état applicatif écrit, aucun
 * écouteur global. Le seul ajout à un nœud de la passe 1 est un
 * aria-describedby complété (jamais écrasé) sur son panneau.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * identifiants préfixés points-v2-e065- ; tout DOM bâti avec ctx.el, jamais de
 * réinterprétation de balisage ; zéro réseau, zéro aléa, zéro sortie de
 * débogage, zéro minuteur, zéro boucle d'animation.
 */

const CSS_ID = 'points-v2-e065';
const SCOPE = 'points-v2-e065';
const PANEL_ID = 'points-v2-e065-panel';
const TITLE_ID = 'points-v2-e065-title';
const TABLE_ID = 'points-v2-e065-table';
const BODY_ID = 'points-v2-e065-body';
const FACTS_ID = 'points-v2-e065-facts';
const LIMIT_ID = 'points-v2-e065-limite';
const METRICS_ID = 'points-v2-e065-metrics';
const SOURCE_ID = 'points-v2-e065-source';
const NOTE_ID = 'points-v2-e065-note';
const REDUCED_ATTR = 'data-v2-e065-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Ids de la passe 1, lus en lecture seule — jamais réécrits. */
const P1_PANEL_ID = 'points-e065-panel';
const P1_SEED_ID = 'points-e065-seed';
const P1_STRIP_ID = 'points-e065-strip';
const P1_AUDIT_ID = 'points-e065-audit';

/* Miroir documenté de la borne de la passe 1 (MAX_BARS). Sert uniquement
 * d'indicateur de conformité dans le registre, jamais de source de donnée. */
const MAX_BARS = 32;

/* E065-V2-01 / V2-09 / V2-10 : feuille unique, entièrement préfixée par
 * .points-v2-e065, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. Aucune animation propre ; la seule transition est neutralisée
 * sous mouvement réduit et en couleurs forcées. */
const CSS = `
.points-v2-e065 .points-v2-e065-panel {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6);
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e065 .points-v2-e065-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e065 .points-v2-e065-intro,
.points-v2-e065 .points-v2-e065-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e065 .points-v2-e065-fait {
  margin: 0 0 6px; padding-left: 10px;
  border-left: 2px solid var(--line-strong);
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e065 .points-v2-e065-table {
  width: 100%; border-collapse: collapse; margin: 8px 0;
  font-size: 11px; line-height: 1.45;
}
.points-v2-e065 .points-v2-e065-table caption {
  text-align: left; margin: 0 0 6px;
  font-size: 11px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e065 .points-v2-e065-table th,
.points-v2-e065 .points-v2-e065-table td {
  border: 1px solid var(--line); padding: 5px 7px;
  text-align: left; vertical-align: top;
}
.points-v2-e065 .points-v2-e065-table thead th {
  color: var(--gold-bright); font-weight: 600; background: rgba(255, 255, 255, .03);
}
.points-v2-e065 .points-v2-e065-table tbody th {
  color: var(--ink); font-weight: 600; white-space: nowrap;
}
.points-v2-e065 .points-v2-e065-table .points-v2-e065-verdict {
  white-space: nowrap; transition: color .18s linear;
}
.points-v2-e065 .points-v2-e065-tr.is-ok .points-v2-e065-verdict { color: var(--gold-bright); }
.points-v2-e065 .points-v2-e065-tr.is-fail .points-v2-e065-verdict { color: var(--danger, #e08a7a); }
.points-v2-e065 .points-v2-e065-metrics,
.points-v2-e065 .points-v2-e065-source {
  margin: 6px 0 0; font-size: 10px; line-height: 1.45;
  color: var(--muted); font-variant-numeric: tabular-nums;
}
.points-v2-e065 .points-v2-e065-source { color: var(--muted-2); }
.points-v2-e065 .points-v2-e065-limite {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
}
.points-v2-e065 .points-v2-e065-limite h3 {
  margin: 0 0 6px; font-size: 12px; color: var(--gold); font-family: var(--serif);
}
.points-v2-e065 .points-v2-e065-limite ol {
  margin: 0; padding-left: 20px;
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e065 .points-v2-e065-limite li { margin-bottom: 4px; }
.points-v2-e065[` + REDUCED_ATTR + `="1"] .points-v2-e065-verdict { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e065 .points-v2-e065-verdict { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e065 .points-v2-e065-table th,
  .points-v2-e065 .points-v2-e065-table td { padding: 4px 5px; }
  .points-v2-e065 .points-v2-e065-table { font-size: 10px; }
}
@media (forced-colors: active) {
  .points-v2-e065 .points-v2-e065-panel,
  .points-v2-e065 .points-v2-e065-table th,
  .points-v2-e065 .points-v2-e065-table td { border-color: CanvasText; }
  .points-v2-e065 .points-v2-e065-verdict { color: CanvasText; }
}
@media print {
  .points-v2-e065 .points-v2-e065-panel { border-color: #666; background: transparent; }
  .points-v2-e065 .points-v2-e065-limite { break-inside: avoid; }
}
`;

/* E065-V2-06 : fiche de vérité — trois grandeurs chiffrées, dont une
 * comparée à une référence. Les faits sont des propriétés de la passe 1,
 * aucune donnée historique ni millésime n'est introduit. */
const FACTS = [
  '0 appel à la source aléatoire : la passe 1 dérive toute variation de mulberry32, semé par une empreinte FNV-1a du DOM — contre 1 seul appel qui suffirait à rendre le bandeau non reproductible.',
  '32 barres au plus : la largeur du bandeau est bornée par une constante de la passe 1, soit une borne fixe indépendante du nombre de cellules renseignées dans la matrice.',
  '3 tirages de contrôle par rendu : la séquence du bandeau est complétée de trois tirages comparés aux trois premiers, d’où un total de barres + 3 tirages.',
];

/* E065-V2-08 : limite falsifiable en cinq temps, alignée sur les angles
 * morts de la passe 1 (bandeau décoratif, signature partielle du DOM,
 * FNV-1a et mulberry32 non cryptographiques). */
const LIMIT = [
  'Prédiction : à DOM constant, la graine affichée par la passe 1 reste identique et le bandeau reproduit exactement les mêmes hauteurs et les mêmes titres.',
  'Réglage : ajouter ou retirer une cellule marquée has-points dans une ligne de la matrice, puis relancer le rendu de la vue.',
  'Résultat attendu : l’empreinte FNV-1a change, donc la graine et la texture du bandeau changent ; le registre V2 signale une divergence contrôlée, pas une erreur.',
  'Falsification : si la graine reste identique après une mutation réelle du DOM, la signature de la passe 1 est incomplète et la prétention de reproductibilité est contredite.',
  'Débrief : angles morts — FNV-1a et mulberry32 ne sont pas cryptographiques ; le bandeau est décoratif et n’encode aucune donnée ; la signature ne couvre que les ères et cellules des lignes rendues. Deux périmètres différents donnent deux graines différentes.',
];

let observer = null;          // un seul observateur, reconnecté à chaque rendu
let currentCtx = null;        // dernier ctx, pour le callback de l'observateur
let layoutRef = null;         // dernier layout, pour le callback de l'observateur
let p1Ref = null;             // panneau de la passe 1 (lecture seule + ARIA)
let panelRef = null;          // panneau V2 conservé
let bodyRef = null;           // <tbody> du registre V2
let metricsRef = null;        // compteurs V2
let sourceRef = null;         // écho de la ligne d'audit de la passe 1
let lastSignature = '';       // évite les écritures redondantes
let refreshCount = 0;         // nombre réel d'actualisations du registre V2

/* --- Utilitaires DOM (aucune création hors ctx.el) --------------------- */

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function queryAll(root, selector) {
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

function getDataset(node, key) {
  return node && node.dataset && typeof node.dataset[key] === 'string'
    ? node.dataset[key] : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

/* E065-V2-10 : garde anti-doublon — tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré, y compris un nœud détaché. */
function enforceUnique(id, keep) {
  const found = nodesById(id);
  found.forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || found[0] || null;
}

/* --- E065-V2-03 / V2-04 : PRNG et empreinte réimplémentés localement -----
 * La V2 ne importe rien de la passe 1 : elle recalcule la graine et la
 * séquence depuis le rendu, avec les mêmes algorithmes déterministes. Aucune
 * source d'entropie, aucune horloge, aucun appel à la source aléatoire. */

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function domSignature(root) {
  const parts = [];
  queryAll(root, '.points-grid-row').forEach((row) => {
    parts.push(txt(query(row, '.points-era')) || '?');
    queryAll(row, '.points-cell').forEach((cell) => {
      const classes = String(getAttr(cell, 'class') || '');
      parts.push(classes.indexOf('has-points') !== -1 ? (txt(cell) || '1') : '0');
    });
  });
  return parts.join('|');
}

function hexOf(seed) {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function matchInt(text, re) {
  const found = String(text || '').match(re);
  return found ? parseInt(found[1], 10) : null;
}

function matchText(text, re) {
  const found = String(text || '').match(re);
  return found ? found[1] : null;
}

/* E065-V2-02 : repérage NON destructif du panneau et des signaux de la
 * passe 1, par leurs ids préfixés points-e065-*. Rien n'y est écrit ici. */
function readP1(layout) {
  const panel = query(layout, '#' + P1_PANEL_ID);
  const seedLine = query(layout, '#' + P1_SEED_ID);
  const strip = query(layout, '#' + P1_STRIP_ID);
  const auditLine = query(layout, '#' + P1_AUDIT_ID);

  const seedText = txt(seedLine);
  const auditText = txt(auditLine);

  const bars = queryAll(strip, '.points-e065-bar').map((bar) => {
    const style = bar && bar.style ? bar.style.height : '';
    return {
      height: parseFloat(style),
      title: getAttr(bar, 'title') || '',
    };
  });

  return {
    panel,
    auditText,
    bars,
    barsCount: bars.length,
    displayHex: matchText(seedText, /0x([0-9a-fA-F]{8})\s*\(/),
    displayDec: matchInt(seedText, /0x[0-9a-fA-F]{8}\s*\((\d+)\)/),
    dataHex: getDataset(panel, 'pointsE065Seed'),
    dataDraws: matchInt(getDataset(panel, 'pointsE065Draws') || '', /^(\d+)$/),
    dataRepro: getDataset(panel, 'pointsE065Repro'),
    dataBars: matchInt(getDataset(panel, 'pointsE065Bars') || '', /^(\d+)$/),
    textDraws: matchInt(auditText, /mulberry32\s*:\s*(\d+)\s*tirages/),
    textRepro: matchText(auditText, /reproductibilité\s*:\s*(vérifiée|échec)/),
    textBars: matchInt(auditText, /(\d+)\s*barres/),
    filled: matchInt(auditText, /(\d+)\s*cellules renseignées/),
    randomLabel: /Math\.random\s*:\s*0 appel/.test(auditText),
  };
}

/* E065-V2-04 : vérification croisée. La V2 recalcule la graine depuis le DOM,
 * rejoue mulberry32 et compare hauteurs ET titres du bandeau, puis confronte
 * les traces texte et dataset de la passe 1. Tout est déterministe. */
function verify(recomputed, p1) {
  const hex = hexOf(recomputed);
  const seedOk = !!p1.displayHex && p1.displayHex.toUpperCase() === hex
    && (!p1.dataHex || p1.dataHex.toUpperCase() === hex)
    && (p1.displayDec === null || p1.displayDec === recomputed);
  const randomOk = p1.randomLabel;
  const drawsOk = p1.dataDraws !== null && p1.textDraws !== null
    && p1.dataDraws === p1.textDraws
    && p1.barsCount !== null && p1.dataDraws === p1.barsCount + 3;
  const barsOk = p1.dataBars !== null && p1.textBars !== null
    && p1.dataBars === p1.textBars && p1.dataBars === p1.barsCount
    && p1.barsCount >= 1 && p1.barsCount <= MAX_BARS;
  const filledOk = p1.filled !== null && p1.filled >= 0;
  const reproOk = p1.dataRepro === 'ok' && p1.textRepro === 'vérifiée';

  const next = mulberry32(recomputed);
  let matched = 0;
  let titlesMatched = 0;
  for (let i = 0; i < p1.bars.length; i += 1) {
    const value = next();
    const expectedHeight = Math.round(10 + value * 90);
    const expectedTitle = 'tirage ' + (i + 1) + ' : ' + value.toFixed(3);
    if (Math.abs(p1.bars[i].height - expectedHeight) < 0.5) matched += 1;
    if (p1.bars[i].title === expectedTitle) titlesMatched += 1;
  }
  const stripOk = p1.bars.length > 0 && matched === p1.bars.length
    && titlesMatched === p1.bars.length;

  const results = [seedOk, randomOk, drawsOk, barsOk, filledOk, reproOk, stripOk];
  return {
    hex, seedOk, randomOk, drawsOk, barsOk, filledOk, reproOk, stripOk,
    matched, titlesMatched,
    results,
    allOk: results.every(Boolean),
  };
}

/* E065-V2-09 : signature anti-écriture. Si rien n'a changé dans les signaux
 * lus, refresh() sort sans écrire. */
function signature(p1, checks) {
  return [
    p1.dataHex || '-', p1.dataDraws, p1.dataRepro, p1.dataBars,
    p1.filled, checks.hex, checks.matched, checks.titlesMatched,
    checks.results.map((ok) => (ok ? '1' : '0')).join(''),
    p1.bars.map((bar) => bar.height + '/' + bar.title).join(','),
  ].join('|');
}

/* E065-V2-05 : registre sémantique bâti avec ctx.el — aucune réinterprétation
 * de balisage. <caption> et <th scope> le rendent indexable et parcourable. */
function fillTable(ctx, body, p1, checks) {
  if (!body) return;
  const rows = [
    ['Graine affichée', p1.displayHex ? '0x' + p1.displayHex + ' (' + p1.displayDec + ')' : '—',
      checks.seedOk, checks.seedOk ? 'Concordante avec FNV-1a recalculé' : 'DIVERGENCE'],
    ['Source aléatoire', '0 appel',
      checks.randomOk, checks.randomOk ? 'Étiquette passe 1 confirmée' : 'ÉTICHETTE ABSENTE'],
    ['Tirages mulberry32', String(p1.dataDraws),
      checks.drawsOk, checks.drawsOk ? '= barres + 3' : 'INCOHÉRENT'],
    ['Barres du bandeau', String(p1.barsCount),
      checks.barsOk, checks.barsOk ? '≤ 32 (borne passe 1)' : 'HORS BORNE'],
    ['Cellules renseignées', String(p1.filled),
      checks.filledOk, checks.filledOk ? 'Lues dans la matrice' : 'NON LUES'],
    ['Reproductibilité passe 1', p1.textRepro || '—',
      checks.reproOk, checks.reproOk ? 'Cohérente avec le dataset' : 'DIVERGENCE'],
    ['Bandeau recalculé', checks.matched + '/' + p1.bars.length + ' hauteurs',
      checks.stripOk, checks.stripOk ? 'Hauteurs et titres conformes' : 'DIVERGENCE'],
  ];

  const trs = rows.map((row) => {
    const ok = row[2];
    const tr = ctx.el('tr', 'points-v2-e065-tr ' + (ok ? 'is-ok' : 'is-fail'));
    const head = ctx.el('th', '', row[0]);
    head.setAttribute('scope', 'row');
    tr.appendChild(head);
    tr.appendChild(ctx.el('td', '', row[1]));
    tr.appendChild(ctx.el('td', 'points-v2-e065-verdict', row[3]));
    return tr;
  });

  if (trs.length === 0) {
    const tr = ctx.el('tr', 'points-v2-e065-tr is-fail');
    const cell = ctx.el('td', '', 'Aucun signal de la passe 1 n’est lisible.');
    cell.colSpan = 3;
    tr.appendChild(cell);
    trs.push(tr);
  }
  body.replaceChildren(...trs);
}

/* E065-V2-07 : relation ARIA additive sur le panneau de la passe 1. Les
 * tokens déjà présents sont conservés ; l'identifiant V2 n'est ajouté
 * qu'une fois. C'est le seul ajout à un nœud de la passe 1. */
function describeP1Panel(panel) {
  if (!panel) return;
  const tokens = (getAttr(panel, 'aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.indexOf(NOTE_ID) === -1) {
    tokens.push(NOTE_ID);
    setAttr(panel, 'aria-describedby', tokens.join(' '));
  }
}

/* E065-V2-01 / V2-05 / V2-06 / V2-07 / V2-08 : structure statique construite
 * une seule fois. Seuls le <tbody>, les compteurs, l'écho et l'ARIA sont
 * actualisés par refresh(). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'points-v2-e065-title', 'Registre V2 — signature déterministe');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e065-intro',
    'Ce registre relit, sans les modifier, la graine, le bandeau et la ligne d’audit de la passe 1. Il recalcule la graine depuis le DOM rendu et rejoue la séquence pour vérifier la concordance, sans introduire la moindre source d’aléa.'));

  const facts = ctx.el('div', 'points-v2-e065-facts');
  facts.id = FACTS_ID;
  FACTS.forEach((text) => facts.appendChild(ctx.el('p', 'points-v2-e065-fait', text)));
  panel.appendChild(facts);

  const table = ctx.el('table', 'points-v2-e065-table');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Contrôles de concordance passe 1 / passe 2'));
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Contrôle', 'Valeur observée', 'Conclusion'].forEach((label) => {
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

  metricsRef = ctx.el('p', 'points-v2-e065-metrics', '');
  metricsRef.id = METRICS_ID;
  panel.appendChild(metricsRef);

  sourceRef = ctx.el('p', 'points-v2-e065-source', '');
  sourceRef.id = SOURCE_ID;
  panel.appendChild(sourceRef);

  const limite = ctx.el('div', 'points-v2-e065-limite');
  limite.id = LIMIT_ID;
  limite.appendChild(ctx.el('h3', '', 'Limite falsifiable — cinq temps'));
  const list = ctx.el('ol');
  LIMIT.forEach((text) => list.appendChild(ctx.el('li', '', text)));
  limite.appendChild(list);
  panel.appendChild(limite);

  const note = ctx.el('p', 'points-v2-e065-note',
    'Le bandeau de la passe 1 est décoratif : il n’encode aucune donnée de couverture. La V2 n’ajoute aucune région live concurrente, elle ne fait que restituer en texte un état déjà lisible et vérifiable.');
  note.id = NOTE_ID;
  panel.appendChild(note);
}

/* E065-V2-03 / V2-06 / V2-09 : graine recalculée depuis le DOM, contrôles,
 * compteurs bornés par les signaux réels, écho de la passe 1 et ARIA. */
function refresh(ctx, layout) {
  const p1 = readP1(layout);
  p1Ref = p1.panel;
  const seed = fnv1a(domSignature(layout));
  const checks = verify(seed, p1);
  const sig = signature(p1, checks);
  if (sig === lastSignature) return;
  lastSignature = sig;
  refreshCount += 1;

  fillTable(ctx, bodyRef, p1, checks);
  const okCount = checks.results.filter(Boolean).length;
  if (metricsRef) {
    metricsRef.textContent =
      `Registre V2 : ${checks.allOk ? 'concordance' : 'divergence'} · ` +
      `${okCount}/${checks.results.length} contrôles satisfaits · ` +
      `${checks.matched}/${p1.bars.length} barres reproduites · ` +
      `${refreshCount} ${refreshCount > 1 ? 'actualisations' : 'actualisation'}.`;
  }
  if (sourceRef) {
    sourceRef.textContent = p1.auditText
      ? 'Référence passe 1 : ' + p1.auditText
      : 'Référence passe 1 : aucune ligne d’audit exposée ; registre V2 seul.';
  }
  describeP1Panel(p1Ref);
}

/* E065-V2-09 : un seul observateur, jamais sur le panneau V2 ni sur ses
 * descendants (sinon boucle d'écriture). Il ne lit que le panneau de la
 * passe 1, déjà produit par celle-ci. */
function observe(ctx, layout) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx && layoutRef && layoutRef.isConnected) refresh(currentCtx, layoutRef);
  });
  const p1 = readP1(layout);
  const options = { childList: true, subtree: true, characterData: true };
  if (p1.panel) observer.observe(p1.panel, options);
}

function registerPanel(ctx, layout, p1Panel) {
  const found = nodesById(PANEL_ID);
  let panel = null;
  for (const node of found) {
    if (layout.contains(node)) { panel = node; break; }
  }
  found.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!panel) {
    panel = ctx.el('section', 'points-v2-e065-panel');
    buildPanel(ctx, panel);
    lastSignature = '';
    const parent = (p1Panel && p1Panel.parentElement)
      ? p1Panel.parentElement
      : (layout.querySelector('.points-matrix') || layout);
    if (p1Panel && p1Panel.nextSibling) parent.insertBefore(panel, p1Panel.nextSibling);
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

register('E065', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (VIEW_IDS.indexOf(viewId) === -1 || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  currentCtx = ctx;
  layoutRef = layout;

  /* E065-V2-01 : injection unique (cssOnce) et ancrage de la portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E065-V2-10 : couplement explicite à la préférence de mouvement réduit. */
  let reduced = false;
  if (typeof reducedMotion === 'function') {
    try { reduced = !!reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E065-V2-02 : cible d'insertion = le panneau de la passe 1, sinon la
   * matrice, sans jamais retirer ni réécrire un nœud de la passe 1. */
  const p1 = readP1(layout);
  p1Ref = p1.panel;
  registerPanel(ctx, layout, p1Ref);

  observe(ctx, layout);

  /* Le registre venant d'être reconstruit, sa signature est remise à zéro :
   * refresh() doit le peupler même si la donnée n'a pas changé entre rendus. */
  lastSignature = '';
  refresh(ctx, layout);
});
