import { register } from './registry.js';

/* Lentille E056 — F. Sémantique & données — omission de source explicite
 * (ID d'omission). Rapport : UNIFIED_AUDIT/POINTS/views/E056.md.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store,
 * la coque, styles.css et les autres lentilles ne sont ni édités ni doublés.
 * E056 ajoute un registre LOCAL, non modal, dans .points-detail : il rend
 * explicite le statut des sources du point affiché (source réelle, ID
 * d'omission déclaré, silence sans ID dédié) au lieu de laisser un vide masqué.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, le routeur, le jeu de données ou une autre lentille
 * : tout est dérivé du DOM déjà rendu par points.js.
 *
 * Invariants :
 * - un seul CSS (ctx.css), un seul registre, un seul observateur par rendu ;
 * - aucune écriture si la signature est inchangée ; aucun ID, millésime, auteur
 *   ou DOI inventé : seuls les jetons OM-\d+ / SRC-\d+ réellement rendus sont
 *   cités, sinon l'absence d'ID est énoncée telle quelle ;
 * - zéro innerHTML, zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*.
 */

const CSS_ID = 'points-e056';
const SCOPE = 'points-e056';
const LEDGER_ID = 'points-e056-ledger';
const TITLE_ID = 'points-e056-title';
const REDUCED_ATTR = 'data-e056-reduced';

/* Toutes les règles sont préfixées par `.points-e056`, classe posée sur
 * .points-layout : aucune fuite hors de la vue Points. Le registre vit dans
 * .points-detail, jamais directement sous stage/layout (où _diagnostics.js
 * le marquerait comme nœud de lentille et le déplacerait dans le tiroir). */
const CSS = `
.points-e056 .points-e056-ledger {
  margin: 10px 0 4px; padding: 10px 12px;
  border: 1px solid var(--line-strong, #6b6b6b);
  border-left: 3px solid var(--gold, #e6b96f); border-radius: 8px;
  background: rgba(230, 185, 111, .05); color: var(--ink-soft, #d8d2c4);
  font-size: 11px; line-height: 1.45;
}
.points-e056 .points-e056-ledger[hidden] { display: none; }
.points-e056 .points-e056-ledger:focus-visible {
  outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px;
}
.points-e056 .points-e056-title {
  margin: 0 0 6px; font-family: var(--serif, Georgia, serif);
  font-size: 13px; color: var(--gold-bright, #f0d49a);
}
.points-e056 .points-e056-summary { margin: 0 0 6px; font-variant-numeric: tabular-nums; }
.points-e056 .points-e056-items { margin: 0 0 6px; padding-left: 16px; }
.points-e056 .points-e056-item { margin-bottom: 3px; }
.points-e056 .points-e056-key { color: var(--gold, #e6b96f); font-weight: 600; }
.points-e056 .points-e056-metrics {
  margin: 0; color: var(--muted-2, #9a9488); font-variant-numeric: tabular-nums;
}
@media (max-width: 620px) {
  .points-e056 .points-e056-ledger { font-size: 10px; padding: 8px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e056 .points-e056-ledger { transition: none; }
}
@media (forced-colors: active) {
  .points-e056 .points-e056-ledger {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e056 .points-e056-key { color: Highlight; }
}
`;

let layout = null;        // .points-layout courant, réutilisé d'un rendu à l'autre
let detail = null;        // .points-detail courant (cible d'insertion)
let ledger = null;        // registre unique, relogé si mal parenté
let summaryNode = null;   // phrase de synthèse
let itemsNode = null;     // lignes détaillées
let metricsNode = null;   // compteurs, hors région live
let observer = null;      // unique MutationObserver, jamais sur le registre
let currentCtx = null;    // dernier ctx reçu, pour l'observateur
let lastSignature = '';   // dernière signature réellement écrite
let writes = 0;           // écritures de registre réalisées
let silences = 0;         // silences rendus explicites

/* E056-02 : lecture défensive. Un sélecteur manquant ne doit jamais faire
 * échouer la lentille ; repli sur stage si layout n'est pas connecté. */
function root(ctx) {
  if (ctx && ctx.layout && ctx.layout.isConnected) return ctx.layout;
  if (ctx && ctx.stage && ctx.stage.isConnected) return ctx.stage;
  return null;
}

function qs(node, selector) {
  return node && typeof node.querySelector === 'function' ? node.querySelector(selector) : null;
}

function text(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function pushUnique(list, value) {
  if (value && list.indexOf(value) === -1) list.push(value);
}

/* E056-03 / E056-05 : seuls les jetons réellement rendus sont collectés.
 * Aucun ID n'est fabriqué : OM-\d+ vient du texte de la justification,
 * SRC-\d+ / OM-\d+ du champ Sources tel qu'écrit par points.js:110. */
function tokens(source, pattern) {
  const found = [];
  if (!source) return found;
  const matches = String(source).match(pattern);
  if (matches) matches.forEach((value) => pushUnique(found, value));
  return found;
}

/* E056-03 à E056-06 : l'analyse est purement dérivée du DOM de la fiche.
 * 'declared' = ID d'omission effectivement déclaré comme source du point ;
 * 'mentioned' = ID simplement mentionné dans la justification (ex. correction
 * d'une référence croisée) : les deux sont affichés avec des libellés distincts. */
function analyze(currentDetail) {
  const titleNode = qs(currentDetail, '.points-point-title');
  const sourcesNode = qs(currentDetail, '.points-sources');
  const justification = text(qs(currentDetail, '.points-justification'));
  const confidence = text(qs(currentDetail, '.points-meta .confidence'));
  const hasPoint = !!titleNode;
  const title = text(titleNode);
  const sourcesText = text(sourcesNode);

  const real = [];
  tokens(sourcesText, /\bSRC-\d+\b/g).forEach((id) => pushUnique(real, id));
  const declared = tokens(sourcesText, /\bOM-\d+\b/g);
  const mentioned = tokens(justification, /\bOM-\d+\b/g).filter((id) => declared.indexOf(id) === -1);
  const explicitNoId = /aucun\s+ID\s+d['’]omission|sans\s+ID\s+d['’]omission/i.test(justification);

  let mode;
  if (!hasPoint) mode = 'vide';
  else if (real.length) mode = 'source';
  else if (declared.length) mode = 'omission';
  else mode = 'silence';

  return {
    hasPoint, title, sourcesText, justification, confidence,
    real, declared, mentioned, explicitNoId, mode,
  };
}

function signatureOf(a) {
  return [
    a.mode, a.title, a.real.join(','), a.declared.join(','),
    a.mentioned.join(','), a.explicitNoId ? '1' : '0',
    a.confidence, a.sourcesText, a.justification,
  ].join(' | ');
}

/* E056-04 / E056-06 : le silence n'est plus un vide masqué. Quand aucun ID
 * d'omission n'existe dans les données rendues, on l'énonce explicitement au
 * lieu d'inventer un identifiant (POINT_METHODOLOGY.md §3.7 et §9). */
function summaryOf(a) {
  const name = a.title ? `Point « ${a.title} » : ` : 'Point courant : ';
  if (a.mode === 'vide') {
    return 'Aucun point validé dans ce périmètre : aucun silence de source à qualifier.';
  }
  if (a.mode === 'source') {
    return `${name}${a.real.length} source(s) réelle(s) déclarée(s)`
      + `${a.declared.length ? `, ${a.declared.length} ID d'omission déclaré(s)` : ''}.`;
  }
  if (a.mode === 'omission') {
    return `${name}aucune source réelle ; l'entrée de source est un ID d'omission (${a.declared.join(', ')}).`;
  }
  return `${name}aucune source ni ID d'omission déclaré : le silence est rendu explicite, non masqué.`;
}

function linesOf(a) {
  const lines = [];
  if (a.real.length) lines.push(['Sources réelles', a.real.join(', ') + '.']);
  if (a.declared.length) lines.push(['IDs d’omission déclarés', a.declared.join(', ') + '.']);
  if (a.mentioned.length) lines.push(['IDs d’omission mentionnés dans la justification', a.mentioned.join(', ') + '.']);
  if (!a.real.length && !a.declared.length && !a.mentioned.length) {
    lines.push(['ID d’omission', 'aucun dans les données rendues — omission explicite sans ID dédié.']);
  }
  if (a.explicitNoId) {
    lines.push(['Justification', 'elle déclare explicitement l’absence d’ID d’omission dédié.']);
  }
  lines.push(['Certitude', a.confidence || 'non renseignée dans la fiche.']);
  lines.push(['Règle', 'les silences sont des données : aucun vide masqué, aucune source ni ID inventé.']);
  return lines;
}

function writeMetrics() {
  if (!metricsNode) return;
  const value = `Écritures du registre : ${writes} · Silences rendus explicites : ${silences}.`;
  if (metricsNode.textContent !== value) metricsNode.textContent = value;
}

/* E056-07 : le registre n'est réécrit que si la signature diffère. Les lignes
 * sont construites par ctx.el et textContent, jamais par innerHTML. */
function render(a) {
  summaryNode.textContent = summaryOf(a);
  itemsNode.replaceChildren(...linesOf(a).map(([key, value]) => {
    const li = ctxEl('li', 'points-e056-item');
    li.appendChild(ctxEl('span', 'points-e056-key', key));
    li.appendChild(document.createTextNode(' ' + value));
    return li;
  }));
  writeMetrics();
}

/* ctx.el n'est disponible qu'à l'installation : on le mémorise ici pour que
 * l'observateur puisse reconstruire des nœuds sans réimplémenter el(). */
let makeEl = null;
function ctxEl(tag, className, value) {
  return makeEl(tag, className, value);
}

function refresh(ctx, currentDetail) {
  if (!ctx || !currentDetail || !currentDetail.isConnected) return;
  currentCtx = ctx;
  detail = currentDetail;
  const a = analyze(currentDetail);
  const signature = signatureOf(a);
  if (signature === lastSignature) return;
  lastSignature = signature;
  writes += 1;
  if (a.mode === 'silence' || a.mode === 'omission') silences += 1;
  render(a);
}

/* E056-08 : un seul observateur, déconnecté puis reconnecté. Il braque sur les
 * quatre nœuds en lecture seule et JAMAIS sur le registre (sinon boucle). */
function observe(currentDetail) {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => refresh(currentCtx, detail));
  const targets = [
    qs(currentDetail, '.points-point-title'),
    qs(currentDetail, '.points-sources'),
    qs(currentDetail, '.points-justification'),
    qs(currentDetail, '.points-meta'),
  ];
  const options = {
    childList: true, characterData: true, subtree: true,
    attributes: true, attributeFilter: ['class'],
  };
  targets.forEach((target) => {
    if (target) observer.observe(target, options);
  });
}

/* E056-01 : structure statique construite une seule fois par rendu, dans le
 * détail, en position non modale. role=region + aria-labelledby + tabIndex=-1. */
function build(ctx) {
  const node = ctx.el('section', 'points-e056-ledger');
  node.id = LEDGER_ID;
  node.setAttribute('role', 'region');
  node.setAttribute('aria-labelledby', TITLE_ID);
  node.tabIndex = -1;

  const title = ctx.el('h3', 'points-e056-title', 'Sémantique des sources · omission explicite');
  title.id = TITLE_ID;
  node.appendChild(title);
  summaryNode = ctx.el('p', 'points-e056-summary', '');
  itemsNode = ctx.el('ul', 'points-e056-items');
  metricsNode = ctx.el('p', 'points-e056-metrics', '');
  node.append(summaryNode, itemsNode, metricsNode);
  return node;
}

/* E056-10 : installation idempotente. Un nœud déconnecté signale un rendu
 * neuf : on reloge le registre orphelin, on remet la signature à zéro et on
 * réobserve. cssOnce garantit l'unicité de la feuille. */
function install(ctx) {
  if (!ctx || ctx.viewId !== 'points') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const current = root(ctx);
  const currentDetail = qs(current, '.points-detail');
  if (!current || !currentDetail) return;

  makeEl = ctx.el;
  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);
  current.classList.add(SCOPE);
  current.setAttribute('data-e056', '1');
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    current.setAttribute(REDUCED_ATTR, '1');
  } else {
    current.removeAttribute(REDUCED_ATTR);
  }

  const fresh = !layout || !layout.isConnected || layout !== current || detail !== currentDetail;
  layout = current;
  detail = currentDetail;

  const stale = document.getElementById(LEDGER_ID);
  if (stale && !currentDetail.contains(stale)) stale.remove();

  ledger = qs(currentDetail, '#' + LEDGER_ID);
  if (!ledger) {
    ledger = build(ctx);
  } else {
    summaryNode = qs(ledger, '.points-e056-summary');
    itemsNode = qs(ledger, '.points-e056-items');
    metricsNode = qs(ledger, '.points-e056-metrics');
    if (!summaryNode || !itemsNode || !metricsNode) {
      ledger = build(ctx);
    }
  }
  if (ledger.parentNode !== currentDetail) currentDetail.appendChild(ledger);

  observe(currentDetail);
  if (fresh) lastSignature = '';
  refresh(ctx, currentDetail);
}

register('E056', (ctx) => { install(ctx); });
