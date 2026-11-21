import { register } from './registry.js';

/* Lentille E069 — Budget de rendu : jauge « ≤ 6 canvas par frame » (domaine G).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E069.md — chantiers E069-01 à E069-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute UNE jauge de
 * budget, locale à la vue, et s'appuie sur le DOM déjà produit par points.js
 * (.points-layout, .points-matrix, .points-title). Aucun canvas n'est créé.
 *
 * Contrat exploité : viewId, layout, css, el, reducedMotion. Aucune dépendance
 * vers le store, les filtres ou le détail : la jauge reste lisible avec un ctx
 * minimal. Aucune région live d'autrui n'est utilisée ni modifiée.
 *
 * Invariants :
 * - une seule feuille CSS, une seule jauge, un seul observateur par rendu ;
 * - aucun rAF, aucun timer, aucune boucle continue : la jauge est habitée par
 *   le rendu et par les mutations du DOM, jamais par une horloge ;
 * - comptage borné (on s'arrête dès le dépassement), signature anti-écriture ;
 * - zéro réseau, zéro aléa, zéro innerHTML, zéro console.*, zéro fichier partagé.
 */

const CSS_ID = 'points-e069';
const SCOPE = 'points-e069';
const GAUGE_ID = 'points-e069-budget';
const READOUT_ID = 'points-e069-budget-readout';
const BAR_ID = 'points-e069-budget-bar';
const DETAIL_ID = 'points-e069-budget-detail';
const BUDGET = 6;            /* référence normative : ≤ 6 canvas dessinés par frame. */
const REDUCED_ATTR = 'data-e069-reduced';

/* E069-01 — Feuille unique (cssOnce) et portée ancrée sur la vue. Aucune rule
 * générique, aucun @import, aucune url() distante. Les segments portent un
 * chiffre visible : l'occupation ne repose jamais sur la seule couleur. */
const CSS = `
.points-e069 .points-e069-gauge {
  display: flex; flex-direction: column; gap: 4px;
  margin: 0 0 10px; padding: 7px 9px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(8, 11, 16, .55); color: var(--muted-2);
  font-size: 10px; line-height: 1.4; font-variant-numeric: tabular-nums;
}
.points-e069-kicker {
  letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft);
}
.points-e069-readout { font-weight: 600; color: var(--gold-bright); }
.points-e069-gauge[data-budget="over"] .points-e069-readout { color: var(--red); }
.points-e069-bar { display: flex; gap: 3px; }
.points-e069-seg {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; min-height: 20px;
  border: 1px dashed var(--line-strong); border-radius: 4px;
  color: var(--muted-2);
  transition: background-color .18s linear, border-color .18s linear;
}
.points-e069-seg[data-on="1"] {
  border-style: solid; border-color: var(--gold);
  background: rgba(230, 185, 111, .12); color: var(--gold-bright);
}
.points-e069-detail { color: var(--muted-2); font-size: 9px; }
.points-e069[` + REDUCED_ATTR + `="1"] .points-e069-seg { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e069 .points-e069-seg { transition: none; }
}
@media (max-width: 620px) {
  .points-e069 .points-e069-gauge { padding: 6px; }
  .points-e069 .points-e069-seg { min-width: 18px; min-height: 24px; }
}
@media (forced-colors: active) {
  .points-e069-seg { border-color: CanvasText; color: CanvasText; }
  .points-e069-seg[data-on="1"] { border-style: solid; outline: 1px solid Highlight; }
  .points-e069-gauge[data-budget="over"] .points-e069-readout { color: CanvasText; }
}
`;

/* État module : références du rendu courant et compteurs auditables. L'ancien
 * observateur est déconnecté avant d'être remplacé ; aucun nœud périmé n'est
 * conservé plus longtemps qu'un rendu. */
let observer = null;
let gauge = null;
let readout = null;
let bar = null;
let detail = null;
let currentLayout = null;
let renderedSignature = '';
let refreshCount = 0;

/* E069-02 — Comptage déterministe des canvas attachés à la vue. Aucun tirage,
 * aucune horloge : on lit le DOM réel. E069-05 — arrêt borné dès le seuil
 * franchi (BUDGET+1 suffit à qualifier un dépassement). */
function countCanvases(layout) {
  let count = 0;
  let nodes;
  try { nodes = layout.querySelectorAll('canvas'); }
  catch { return { count: 0, over: false, capped: false }; }
  const total = nodes.length;
  for (let index = 0; index < total; index += 1) {
    count += 1;
    if (count > BUDGET) break;
  }
  return { count, over: count > BUDGET, capped: total > count };
}

/* E069-07 — Libellé comparé à une référence explicite. Le signe « ≥ » rend
 * compte d'un comptage arrêté au seuil, sans inventer le total exact. */
function readoutText(measure) {
  const shown = measure.capped ? '≥' + measure.count : String(measure.count);
  const state = measure.over
    ? 'au-delà du budget (référence : ' + BUDGET + ')'
    : 'dans le budget (référence : ' + BUDGET + ')';
  return shown + ' / ' + BUDGET + ' canvas par frame · ' + state;
}

/* E069-03 / E069-06 / E069-07 — Jauge unique, ancrée sous le titre de la
 * matrice. Six segments discrets numérotés ; la barre est aria-hidden, toute
 * l'information utile est portée par le texte de la région live. */
function buildGauge(ctx, matrix) {
  const node = ctx.el('div', 'points-e069-gauge');
  node.id = GAUGE_ID;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  node.title = 'Jauge de budget : canvas attachés à la vue, comparés à la limite de '
    + BUDGET + ' par frame.';

  node.appendChild(ctx.el('span', 'points-e069-kicker', 'Budget de rendu · canvas par frame'));
  const value = ctx.el('span', 'points-e069-readout', readoutText({ count: 0, over: false, capped: false }));
  value.id = READOUT_ID;
  node.appendChild(value);

  const segments = ctx.el('span', 'points-e069-bar');
  segments.id = BAR_ID;
  segments.setAttribute('aria-hidden', 'true');
  for (let rank = 1; rank <= BUDGET; rank += 1) {
    const segment = ctx.el('span', 'points-e069-seg', String(rank));
    segment.dataset.on = '0';
    segments.appendChild(segment);
  }
  node.appendChild(segments);

  const note = ctx.el('span', 'points-e069-detail', '');
  note.id = DETAIL_ID;
  node.appendChild(note);

  const title = matrix.querySelector('.points-title');
  if (title && title.nextSibling) matrix.insertBefore(node, title.nextSibling);
  else matrix.appendChild(node);
  return node;
}

/* E069-08 / E069-10 — Peinture idempotente : signature anti-écriture, état de
 * dépassement explicite (attribut + texte, jamais la couleur seule), compteur
 * d'actualisations lisible pour l'audit. */
function paint(ctx) {
  if (!gauge || !readout || !bar || !detail || !currentLayout) return;
  const measure = countCanvases(currentLayout);
  const text = readoutText(measure);
  const signature = text + '|' + measure.count + '|' + (measure.over ? '1' : '0');
  if (signature === renderedSignature) return;   /* E069-06 : pas d'écriture redondante. */
  renderedSignature = signature;
  refreshCount += 1;

  readout.textContent = text;
  gauge.dataset.budget = measure.over ? 'over' : 'ok';
  gauge.dataset.canvas = String(measure.count);
  const segments = bar.children;
  for (let index = 0; index < segments.length; index += 1) {
    segments[index].dataset.on = index < measure.count ? '1' : '0';
  }
  const occupied = Math.min(measure.count, BUDGET);
  detail.textContent = 'Segments occupés : ' + occupied + '/' + BUDGET
    + ' · actualisations : ' + refreshCount + ' · mesure sans rAF ni timer.';
}

/* E069-04 — Un seul MutationObserver, déconnecté puis reconnecté à chaque
 * rendu, ciblé sur les insertions/retraits de canvas dans la vue. La zone
 * écrite (la jauge) est explicitement ignorée : jamais de boucle d'écriture. */
function observe(layout, ctx) {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((records) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    for (let index = 0; index < records.length; index += 1) {
      const target = records[index].target;
      if (gauge && gauge.contains(target)) continue;   /* zone écrite écartée. */
      paint(ctx);
      return;
    }
  });
  observer.observe(layout, { childList: true, subtree: true });
}

/* E069-09 — Mouvement réduit : couplage explicite à la préférence, en plus de
 * la media query, pour les environnements sans matchMedia fiable. */
function syncReducedMotion(ctx, layout) {
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);
}

/* E069-10 — Idempotence multi-rendus : garde par ID, retrait d'un nœud mal
 * parenté ou périmé, réinitialisation des compteurs seulement sur rendu neuf.
 * Aucun canvas n'est créé : le greffon reste non destructif en toute circonstance. */
register('E069', (ctx) => {
  if (!ctx || ctx.viewId !== 'points') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;

  try {
    ctx.css(CSS_ID, CSS);                       /* E069-01 : cssOnce, une seule feuille. */
    layout.classList.add(SCOPE);
    layout.dataset.e069 = '1';

    syncReducedMotion(ctx, layout);             /* E069-09 */

    const matrix = layout.querySelector('.points-matrix');
    if (!matrix) return;

    let node = layout.querySelector('#' + GAUGE_ID);
    if (node && node.parentElement !== matrix) node.remove();
    const orphan = document.getElementById(GAUGE_ID);
    if (orphan && orphan !== node && !layout.contains(orphan)) orphan.remove();
    if (!node) node = buildGauge(ctx, matrix);

    gauge = node;
    readout = gauge.querySelector('#' + READOUT_ID) || gauge.querySelector('.points-e069-readout');
    bar = gauge.querySelector('#' + BAR_ID) || gauge.querySelector('.points-e069-bar');
    detail = gauge.querySelector('#' + DETAIL_ID) || gauge.querySelector('.points-e069-detail');

    if (currentLayout !== layout) {
      currentLayout = layout;
      renderedSignature = '';
      refreshCount = 0;
    }
    paint(ctx);
    observe(layout, ctx);
  } catch {
    /* Greffon tolérant : une anomalie neutralise E069 sans toucher au rendu. */
    return;
  }
});
