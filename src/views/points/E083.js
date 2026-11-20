import { register } from './registry.js';

/* Lentille E083 — Contrôle d'unicité des identifiants DOM (domaine I :
 * qualité & validation). Fichier possédé : ce module uniquement. La vue
 * (src/views/points.js), la coque, styles.css et les autres lentilles ne sont
 * ni édités ni doublés : E083 réserve un préfixe, vérifie l'unicité des
 * identifiants `points-e083-` présents dans le document et applique un repli
 * déterministe par suffixe `-r2`, `-r3`… en cas de collision.
 *
 * Contrat exploité : viewId, stage, layout, css, el. Aucune dépendance vers le
 * store, les filtres, le détail ni le registre des autres lentilles.
 *
 * Invariants :
 * - un seul CSS (ctx.css('points-e083', …)), un seul panneau de diagnostic ;
 * - aucun identifiant existant n'est écrasé : le premier porteur d'un ID
 *   dupliqué (celui de la vue) conserve l'ID canonique ;
 * - repli déterministe, borné et sans aléa : suffixe -rN, jamais de tirage ;
 * - références aria-labelledby / aria-controls / aria-describedby / for
 *   réécrites uniquement à l'intérieur de la vue ;
 * - installation idempotente : réconciliation avant création, pas de doublon ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e083';
const PREFIX = 'points-e083-';
const REPORT_CLASS = 'points-e083-report';
const STATUS_ATTR = 'data-e083-status';
const COUNT_ATTR = 'data-e083-collisions';
const REF_ATTRS = ['aria-labelledby', 'aria-controls', 'aria-describedby', 'for'];

const BASE = Object.freeze({
  report: PREFIX + 'report',
  title: PREFIX + 'report-title',
  status: PREFIX + 'report-status',
  list: PREFIX + 'report-list',
});

/* Aucune règle ne cible un ID : le repli par suffixe ne peut pas casser le CSS. */
const CSS = `
.points-e083 .points-e083-report {
  margin: 16px 0 0;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: rgba(11, 15, 21, .9);
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
}
.points-e083 .points-e083-report-title {
  margin: 0 0 6px;
  font-family: var(--serif);
  font-size: 14px;
  color: var(--gold-bright);
}
.points-e083 .points-e083-report-status { margin: 0 0 6px; }
.points-e083 .points-e083-report-list { margin: 0; padding-left: 18px; }
.points-e083 .points-e083-report-list li { margin-bottom: 3px; }
.points-e083 .points-e083-report:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 3px;
}
@media (max-width: 620px) {
  .points-e083 .points-e083-report { padding: 8px; font-size: 10px; }
}
@media (forced-colors: active) {
  .points-e083 .points-e083-report {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
}
`;

function isOwned(id) {
  return typeof id === 'string' && id.indexOf(PREFIX) === 0;
}

function isFallback(id, base) {
  return typeof id === 'string' && id.indexOf(base + '-r') === 0 && /-r\d+$/.test(id);
}

/* Inventaire de TOUS les IDs du document : le repli doit éviter aussi les
 * identifiants appartenant aux quatre-vingt-dix-neuf autres lentilles. */
function collectUsed() {
  const used = new Set();
  const nodes = document.querySelectorAll('[id]');
  for (let i = 0; i < nodes.length; i += 1) used.add(nodes[i].id);
  return used;
}

function collectOwned() {
  const groups = new Map();
  const nodes = document.querySelectorAll('[id]');
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (!isOwned(node.id)) continue;
    const group = groups.get(node.id);
    if (group) group.push(node);
    else groups.set(node.id, [node]);
  }
  return groups;
}

/* Repli borné et reproductible : -r2, -r3… jamais Math.random, jamais
 * d'écrasement d'un identifiant déjà porté. */
function reserve(used, base) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  let candidate = base + '-r' + n;
  while (used.has(candidate)) {
    n += 1;
    candidate = base + '-r' + n;
  }
  used.add(candidate);
  return candidate;
}

/* Duplicatas : on garde le porteur ancré dans la vue (l'ID canonique reste
 * celui que getElementById résolvait déjà), les autres reçoivent un repli. */
function reconcileDuplicates(scope, used) {
  const groups = collectOwned();
  let fixed = 0;
  groups.forEach((nodes, id) => {
    if (nodes.length < 2) return;
    let keeper = nodes[0];
    for (let i = 0; i < nodes.length; i += 1) {
      if (scope.contains(nodes[i])) { keeper = nodes[i]; break; }
    }
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i] === keeper) continue;
      nodes[i].id = reserve(used, id);
      fixed += 1;
    }
  });
  return fixed;
}

/* Réécriture ciblée : uniquement les références portées par la vue, jamais
 * un attribut appartenant à une autre lentille. */
function rewire(scope, from, to) {
  if (!scope || from === to || typeof scope.querySelectorAll !== 'function') return;
  const nodes = [scope];
  const refs = scope.querySelectorAll('[aria-labelledby], [aria-controls], [aria-describedby], [for]');
  for (let i = 0; i < refs.length; i += 1) nodes.push(refs[i]);
  nodes.forEach((node) => {
    REF_ATTRS.forEach((attr) => {
      const value = node.getAttribute(attr);
      if (!value) return;
      const tokens = value.trim().split(/\s+/);
      if (tokens.indexOf(from) === -1) return;
      node.setAttribute(attr, tokens.map((token) => (token === from ? to : token)).join(' '));
    });
  });
}

/* Attribution d'un ID attendu. Un repli déjà attribué lors d'un passage
 * précédent est conservé tant que la collision persiste : c'est la clé de
 * l'idempotence. */
function assignId(node, base, used, renames) {
  if (!node) return '';
  const current = node.id;
  const holder = document.getElementById(base);
  if (current === base && (!holder || holder === node)) {
    used.add(base);
    return base;
  }
  if (isFallback(current, base) && holder && holder !== node &&
      (!used.has(current) || document.getElementById(current) === node)) {
    used.add(current);
    return current;
  }
  const next = (!holder || holder === node) && !used.has(base) ? base : reserve(used, base);
  if (current !== next) renames.push({ from: current, to: next });
  node.id = next;
  used.add(next);
  return next;
}

function buildReport(ctx, report) {
  report.replaceChildren();
  report.setAttribute('role', 'region');
  const title = ctx.el('h3', 'points-e083-report-title', 'Contrôle d’unicité des identifiants');
  const status = ctx.el('p', 'points-e083-report-status', '');
  const list = ctx.el('ul', 'points-e083-report-list');
  report.append(title, status, list);
  return { title, status, list };
}

register('E083', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  css(CSS_ID, CSS);
  layout.classList.add('points-e083');

  /* Réconciliation d'abord : un doublon déjà présent ne doit pas être
   * réattribué une seconde fois lors d'un second passage. */
  const used = collectUsed();
  reconcileDuplicates(layout, used);

  const stale = document.querySelector('.' + REPORT_CLASS);
  if (stale && !layout.contains(stale)) stale.remove();
  let report = layout.querySelector('.' + REPORT_CLASS);
  if (!report) {
    report = el('section', REPORT_CLASS);
    const matrix = layout.querySelector('.points-matrix');
    if (matrix) matrix.appendChild(report);
    else layout.appendChild(report);
  }

  let title = report.querySelector('.points-e083-report-title');
  let status = report.querySelector('.points-e083-report-status');
  let list = report.querySelector('.points-e083-report-list');
  if (!title || !status || !list) {
    report.querySelectorAll('[id]').forEach((node) => { used.delete(node.id); });
    const built = buildReport(ctx, report);
    title = built.title;
    status = built.status;
    list = built.list;
  }

  const renames = [];
  assignId(report, BASE.report, used, renames);
  assignId(title, BASE.title, used, renames);
  assignId(status, BASE.status, used, renames);
  assignId(list, BASE.list, used, renames);
  renames.forEach(({ from, to }) => { if (from) rewire(layout, from, to); });

  /* Les références sont posées APRÈS le repli : elles pointent toujours vers
   * l'identifiant effectivement retenu, même avec un suffixe -rN. */
  report.setAttribute('aria-labelledby', title.id);
  report.setAttribute('aria-describedby', status.id);

  /* L'état affiché décrit le DOM FINAL, pas seulement la passe courante :
   * un repli conservé d'un passage précédent reste compté, d'où l'idempotence
   * du statut et du compteur. */
  let ownedCount = 0;
  let fallbackCount = 0;
  collectOwned().forEach((nodes) => {
    nodes.forEach((node) => {
      ownedCount += 1;
      if (/-r\d+$/.test(node.id)) fallbackCount += 1;
    });
  });

  status.textContent = fallbackCount
    ? `Contrôle effectué : ${fallbackCount} identifiant(s) en repli (suffixe -rN), collision(s) résorbée(s) sans écraser d’identifiant existant.`
    : 'Contrôle effectué : aucun doublon parmi les identifiants préfixés points-e083-.';
  list.replaceChildren(
    el('li', '', `Préfixe réservé : ${PREFIX} · ${ownedCount} identifiant(s) vérifié(s).`),
    el('li', '', 'Repli : suffixe -r2, -r3… attribué dans l’ordre d’apparition, sans aléa.'),
    el('li', '', 'Les références ARIA et « for » de la vue suivent l’identifiant retenu.')
  );

  layout.setAttribute(STATUS_ATTR, fallbackCount ? 'recovered' : 'ok');
  layout.setAttribute(COUNT_ATTR, String(fallbackCount));
});
