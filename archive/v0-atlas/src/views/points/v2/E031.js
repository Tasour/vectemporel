import { register } from './registry.js';

/* Lentille POINTS E031 — passe 2 (V2) : Navigation & clavier — ordre de
 * tabulation logique de la matrice (domaine D).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E031.md — chantiers E031-V2-01 à
 * E031-V2-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe
 * 1 (src/views/points/E031.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Le câblage réel fournit viewId 'pointsv2' (points.js:128) ;
 * 'points' est toléré pour un harnais de relecture. Tout est dérivé du DOM rendu.
 *
 * Périmètre : rendre l'ordre de tabulation EXPLICITE et BYPASSABLE, en
 * enrichissant la passe 1 (audit falsifiable, compteurs dérivés, replis robustes,
 * couplage reducedMotion, garde d'impression) sans empiéter sur E030 (ancre de
 * retour), E032 (roving tabindex et flèches), E033 (Entrée/Espace), E034 (Échap),
 * E035 (raccourcis), E037 (focus visible global), E039 (focus après filtrage)
 * ni E040 (lecture du détail). Aucun tabindex positif, aucune touche interceptée.
 *
 * Invariants : un seul greffon, une seule feuille, une seule portée, un seul
 * bandeau, deux liens, zéro écouteur global, zéro timer, zéro rAF, zéro réseau,
 * zéro aléa, zéro journalisation, zéro innerHTML.
 */

const CSS_ID = 'points-v2-e031';
const SCOPE = 'points-v2-e031';
const NAV_ID = 'points-v2-e031-nav';
const TO_FILTERS_ID = 'points-v2-e031-to-filters';
const TO_DETAIL_ID = 'points-v2-e031-to-detail';
const NOTE_ID = 'points-v2-e031-note';
const SUMMARY_ID = 'points-v2-e031-summary';
const FOCUS_CLASS = 'points-v2-e031-focused';
const REDUCED_ATTR = 'data-points-v2-e031-reduced';
const DATA_SCOPE = 'pointsV2E031';
const DATA_ORDER = 'pointsV2E031Order';
const DATA_ERAS = 'pointsV2E031Eras';
const DATA_CELLS = 'pointsV2E031Cells';
const DATA_ANOMALIES = 'pointsV2E031Anomalies';
const DATA_ENTRY = 'pointsV2E031Entry';
const VIEW_IDS = ['pointsv2', 'points'];
const NATIVE_FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]';

/* E031-V2-01 / E031-V2-08 / E031-V2-09 : chaque sélecteur commence littéralement
 * par `.points-v2-e031`, y compris à l'intérieur des @media : aucune règle ne
 * peut fuir hors de la vue. Les clés de donnée sont distinctes de la passe 1
 * (data-e031, data-e031-order, …) pour ne pas écraser ses signaux sur le DOM
 * partagé. Les cibles tactiques mesurent au moins 44 px. */
const CSS = `
  .points-v2-e031 .points-v2-e031-nav {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    margin: 0 0 10px; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(8, 11, 16, .72);
  }
  .points-v2-e031 .points-v2-e031-nav .points-v2-e031-skip {
    min-height: 44px; padding: 0 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright);
    font: inherit; font-size: 12px; cursor: pointer;
  }
  .points-v2-e031 .points-v2-e031-nav .points-v2-e031-skip:hover {
    border-color: var(--gold-bright);
  }
  .points-v2-e031 .points-v2-e031-nav .points-v2-e031-skip:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 3px;
  }
  .points-v2-e031 .points-v2-e031-summary {
    margin: 0; color: var(--gold-bright);
    font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap;
  }
  .points-v2-e031 .points-v2-e031-note {
    flex: 1 1 260px; margin: 0; color: var(--muted-2);
    font-size: 11px; line-height: 1.5;
  }
  .points-v2-e031 .points-v2-e031-focused {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 1000px) {
    .points-v2-e031 .points-v2-e031-nav { padding: 6px 8px; }
  }
  @media (max-width: 620px) {
    .points-v2-e031 .points-v2-e031-nav {
      flex-direction: column; align-items: stretch;
    }
    .points-v2-e031 .points-v2-e031-nav .points-v2-e031-skip { width: 100%; }
    .points-v2-e031 .points-v2-e031-note { flex-basis: auto; }
    .points-v2-e031 .points-v2-e031-summary { white-space: normal; }
  }
  /* E031-V2-08 : aucune transition propre, mais double neutralisation (attribut
   * couplé à reducedMotion() + media query) pour garantir l'absence d'animation
   * même si une feuille amont en ajoute une. */
  .points-v2-e031[${REDUCED_ATTR}="1"] .points-v2-e031-nav,
  .points-v2-e031[${REDUCED_ATTR}="1"] .points-v2-e031-nav .points-v2-e031-skip {
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e031 .points-v2-e031-nav,
    .points-v2-e031 .points-v2-e031-nav .points-v2-e031-skip { transition: none; }
  }
  /* E031-V2-08 : repli en couleurs forcées — nul appel à la seule couleur. */
  @media (forced-colors: active) {
    .points-v2-e031 .points-v2-e031-nav {
      background: Canvas; color: CanvasText; border-color: CanvasText;
    }
    .points-v2-e031 .points-v2-e031-nav .points-v2-e031-skip {
      background: ButtonFace; color: ButtonText; border-color: ButtonText;
    }
    .points-v2-e031 .points-v2-e031-nav .points-v2-e031-skip:focus-visible,
    .points-v2-e031 .points-v2-e031-focused { outline-color: Highlight; }
  }
  /* E031-V2-09 : le bandeau est une affordance d'écran, jamais un masquage sur
   * papier (la mise en page d'impression complète relève d'autres lentilles). */
  @media print {
    .points-v2-e031 .points-v2-e031-nav { display: none; }
  }
`;

/* E031-V2-02 : audit en lecture seule de l'ordre réellement produit par la vue.
 * Aucun chiffre codé en dur : ères, cellules et anomalies sont dérivés du DOM.
 * En plus de la passe 1 (row-major, aucun tabindex positif, en-tête sans
 * contrôle), la V2 signale les boutons d'ère absents/désactivés, les cellules
 * non-boutons et tout contrôle inattendu dans une ligne. */
function inspectOrder(layout) {
  const head = layout.querySelector('.points-grid-row.is-head');
  const rows = Array.from(layout.querySelectorAll('.points-grid-row:not(.is-head)'));
  const headFocusable = head ? head.querySelectorAll(NATIVE_FOCUSABLE).length : 0;
  const positive = Array.from(layout.querySelectorAll('.points-grid ' + NATIVE_FOCUSABLE))
    .filter((node) => (parseInt(node.getAttribute('tabindex'), 10) || 0) > 0).length;

  const anomalies = [];
  if (!head) anomalies.push('no-head');
  if (headFocusable) anomalies.push('head-control');
  if (positive) anomalies.push('positive-tabindex');

  let eraCount = 0;
  let cellCount = 0;
  rows.forEach((row, rowIndex) => {
    const kids = Array.from(row.children);
    const era = kids.find((node) => node.classList.contains('points-era'));
    const cells = kids.filter((node) => node.classList.contains('points-cell'));
    if (!era) anomalies.push('row-' + rowIndex + '-no-era');
    else {
      eraCount += 1;
      if (kids[0] !== era) anomalies.push('row-' + rowIndex + '-era-not-first');
      if (era.tagName !== 'BUTTON' || era.disabled) anomalies.push('row-' + rowIndex + '-era-invalid');
    }
    if (!cells.length) anomalies.push('row-' + rowIndex + '-no-cell');
    if (cells.some((cell) => cell.tagName !== 'BUTTON')) {
      anomalies.push('row-' + rowIndex + '-cell-not-button');
    }
    if (kids.some((node, index) => index > 0 && !node.classList.contains('points-cell'))) {
      anomalies.push('row-' + rowIndex + '-extra-control');
    }
    cellCount += cells.length;
  });

  return {
    ordered: anomalies.length === 0,
    eraCount,
    cellCount,
    headFocusable,
    positive,
    anomalies,
  };
}

/* E031-V2-04 / E031-V2-05 : déplacement de focus sans modifier le tabindex
 * natif des contrôles. Un conteneur non focusable reçoit un tabindex="-1"
 * temporaire, retiré au premier blur, afin de ne laisser aucune trace dans
 * l'ordre de tabulation. Le contour de repère est lui aussi retiré. */
function focusNode(node) {
  if (!node || typeof node.focus !== 'function') return;
  const native = node.matches(NATIVE_FOCUSABLE);
  if (!native) node.setAttribute('tabindex', '-1');
  node.classList.add(FOCUS_CLASS);
  node.focus();

  const clean = () => {
    node.removeEventListener('blur', clean);
    node.removeAttribute('tabindex');
    node.classList.remove(FOCUS_CLASS);
  };
  node.addEventListener('blur', clean);
  if (typeof document !== 'undefined' && document.activeElement !== node) clean();
}

/* E031-V2-06 : note de lecture entièrement dérivée du DOM (libellés des deux
 * premières ères + compteurs réels). Aucun compteur littéral, aucune annonce
 * live : le texte est du DOM statique, lisible sans CSS. */
function noteText(info, layout) {
  const names = Array.from(layout.querySelectorAll('.points-era'))
    .slice(0, 2)
    .map((node) => String(node.textContent || '').trim())
    .filter(Boolean);
  const sample = names.length ? ` (ici : ${names.join(' puis ')})` : '';
  const base = `Ordre de tabulation V2 : ${info.eraCount} ère(s) relevée(s), ${info.cellCount} cellule(s) — le nom d’une ère, puis les cellules de cette ère, puis l’ère suivante${sample}. Les deux liens ci-dessus quittent la matrice sans la parcourir.`;
  if (info.ordered) return base;
  const codes = info.anomalies.length > 4
    ? info.anomalies.slice(0, 4).join(', ') + ', …'
    : info.anomalies.join(', ');
  return `${base} Ordre à vérifier (${codes}).`;
}

/* E031-V2-03 à E031-V2-06 : au plus un bandeau <nav> par rendu, inséré avant
 * la grille, avec deux liens d'évitement, un résumé chiffré et une note de
 * lecture (hors région live). Le garde anti-doublon couvre le rendu courant et
 * un nœud périmé détaché, y compris via stage. */
function buildNav(ctx, matrix, grid, info, stage) {
  const root = stage && typeof stage.querySelector === 'function'
    ? stage
    : (typeof document !== 'undefined' ? document : null);
  const stale = root && root.querySelector ? root.querySelector('#' + NAV_ID) : null;
  if (stale && !matrix.contains(stale)) stale.remove();

  let nav = stale && matrix.contains(stale) ? stale : matrix.querySelector('#' + NAV_ID);
  if (!nav) {
    nav = ctx.el('nav', 'points-v2-e031-nav');
    nav.id = NAV_ID;
    nav.setAttribute('aria-label', 'Navigation clavier de la matrice (V2)');

    const toFilters = ctx.el('button', 'points-v2-e031-skip', 'Aller aux filtres ↓');
    toFilters.id = TO_FILTERS_ID;
    toFilters.type = 'button';
    toFilters.addEventListener('click', () => {
      const filters = matrix.querySelector('.points-filters');
      const target = filters && filters.querySelector(NATIVE_FOCUSABLE);
      focusNode(target || filters);
    });

    const toDetail = ctx.el('button', 'points-v2-e031-skip', 'Aller au détail du point ↓');
    toDetail.id = TO_DETAIL_ID;
    toDetail.type = 'button';
    toDetail.addEventListener('click', () => {
      const host = matrix.parentElement && matrix.parentElement.querySelector
        ? matrix.parentElement.querySelector('.points-detail')
        : null;
      const detail = host || (root && root.querySelector ? root.querySelector('.points-detail') : null);
      const title = detail && detail.querySelector('.points-point-title');
      focusNode(title || detail);
    });

    const summary = ctx.el('p', 'points-v2-e031-summary');
    summary.id = SUMMARY_ID;
    const note = ctx.el('p', 'points-v2-e031-note');
    note.id = NOTE_ID;
    nav.append(toFilters, toDetail, summary, note);
  }

  let note = nav.querySelector('#' + NOTE_ID);
  if (!note) {
    note = ctx.el('p', 'points-v2-e031-note');
    note.id = NOTE_ID;
    nav.appendChild(note);
  }
  let summary = nav.querySelector('#' + SUMMARY_ID);
  if (!summary) {
    summary = ctx.el('p', 'points-v2-e031-summary');
    summary.id = SUMMARY_ID;
    nav.insertBefore(summary, note);
  }

  /* E031-V2-10 : signature anti-écriture redondante — on n'écrit que si le
   * texte diffère, donc un rendu inchangé ne provoque aucune mutation. */
  const noteValue = noteText(info, matrix);
  if (note.textContent !== noteValue) note.textContent = noteValue;
  const summaryValue = `Ères : ${info.eraCount} · Cellules : ${info.cellCount} · Ordre : ${info.ordered ? 'row-major' : 'a-verifier'}`;
  if (summary.textContent !== summaryValue) summary.textContent = summaryValue;

  if (grid) {
    if (nav.nextSibling !== grid) matrix.insertBefore(nav, grid);
  } else if (nav.parentElement !== matrix) {
    matrix.appendChild(nav);
  }
  return nav;
}

/* E031-V2-07 : repère d'entrée sur la première cellule, sans toucher son
 * tabindex (réservé à E032) et en préservant tout aria-describedby existant —
 * y compris celui posé par la passe 1, pour que les deux lentilles coexistent. */
function markEntry(layout) {
  const first = layout.querySelector('.points-grid-row:not(.is-head) .points-cell');
  if (!first) return;
  if (first.dataset) first.dataset[DATA_ENTRY] = '1';
  const described = first.getAttribute('aria-describedby') || '';
  const tokens = described.split(/\s+/).filter(Boolean);
  if (!tokens.includes(NOTE_ID)) {
    tokens.push(NOTE_ID);
    first.setAttribute('aria-describedby', tokens.join(' '));
  }
}

function apply(ctx) {
  /* E031-V2-01 : filtre sur la vue V2 (et repli harnais) + gardes de type. */
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;

  /* E031-V2-01 : injection unique (cssOnce) et ancrage de portée sur la vue,
   * avec un signal de donnée distinct de celui de la passe 1. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA_SCOPE] = '1';

  /* E031-V2-08 : couplage explicite à reducedMotion(), en plus de la media
   * query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;
  const grid = matrix.querySelector('.points-grid');

  /* E031-V2-02 : exposition de l'audit sous forme de signaux falsifiables. */
  const info = inspectOrder(layout);
  const order = info.ordered ? 'row-major' : 'a-verifier';
  if (layout.dataset) {
    layout.dataset[DATA_ORDER] = order;
    layout.dataset[DATA_ERAS] = String(info.eraCount);
    layout.dataset[DATA_CELLS] = String(info.cellCount);
    layout.dataset[DATA_ANOMALIES] = info.anomalies.join('|');
  }
  if (grid && grid.dataset) grid.dataset[DATA_ORDER] = order;

  buildNav(ctx, matrix, grid, info, stage);
  markEntry(layout);
}

register('E031', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
