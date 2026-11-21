import { register } from './registry.js';

/* Lentille E012 — B. Filtres & périmètre : filtrage par famille avec état visible.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E012.md — chantiers E012-01 à E012-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js`, les
 * lentilles voisines (E011 : domaine, E013 : réinitialisation) et le magasin
 * `src/domain/store.js` sont lus mais jamais modifiés ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucun appel au magasin, aucun contrôle retiré, aucune valeur
 * historique codée en dur : tout est lu dans le DOM rendu.
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS, un seul jeu de nœuds préfixés ;
 * - aucun bouton ajouté dans .points-filters (le bouton natif reste unique) ;
 * - aucune région live supplémentaire : E011 porte déjà l'annonce du périmètre ;
 * - un seul observateur, ciblé sur le kicker du détail, jamais sur nos nœuds ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro animation propre, aucun journal.
 */

const CSS_ID = 'points-e012';
const SCOPE = 'points-e012';
const STATUS_ID = 'points-e012-status';
const HELP_ID = 'points-e012-help';
const PILLS_ID = 'points-e012-pills';
const METRICS_ID = 'points-e012-metrics';

const HELP_TEXT = 'La deuxième liste filtre la matrice et le détail par famille. '
  + 'La famille retenue est signalée ci-dessous et dans le détail ; '
  + '« Réinitialiser les filtres » restaure le périmètre complet.';

/* Une seule feuille, préfixée ; aucun import ni ressource distante. Les nœuds
 * ajoutés portent tous un identifiant points-e012- ; les marques posées sur le
 * DOM existant sont réversibles (voir clearMarks). */
const CSS = `
  .${SCOPE} #${HELP_ID} {
    margin: 6px 0 2px; font-size: 11px; line-height: 1.45; color: var(--muted-2);
  }
  .${SCOPE} #${STATUS_ID} {
    margin: 2px 0; padding: 6px 9px; min-height: 24px;
    border-left: 3px solid var(--gold); border-radius: 4px;
    background: rgba(230, 185, 111, .06); color: var(--ink-soft);
    font-size: 12px; line-height: 1.45; font-variant-numeric: tabular-nums;
  }
  .${SCOPE} #${PILLS_ID} {
    display: flex; flex-wrap: wrap; gap: 5px; margin: 4px 0 2px;
  }
  .${SCOPE} #${PILLS_ID} .points-e012-pill {
    display: inline-flex; align-items: center; min-height: 24px;
    padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px;
    color: var(--muted-2); font-size: 10px; font-variant-numeric: tabular-nums;
  }
  .${SCOPE} #${PILLS_ID} .points-e012-pill.is-active {
    border-color: var(--gold-bright); color: var(--gold-bright);
    background: rgba(230, 185, 111, .14);
  }
  .${SCOPE} .points-filters select[data-points-e012-active="1"] {
    border-color: var(--gold-bright); color: var(--gold-bright);
  }
  .${SCOPE} .points-e012-family-active {
    outline: 1px solid var(--gold-bright); outline-offset: 2px;
    transition: background .15s ease, outline-color .15s ease;
  }
  .${SCOPE} #${METRICS_ID} {
    margin: 2px 0 0; font-size: 10px; color: var(--muted-2);
    font-variant-numeric: tabular-nums;
  }
  .${SCOPE} #${STATUS_ID}:focus-visible,
  .${SCOPE} .points-filters select:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 720px) {
    .${SCOPE} #${STATUS_ID}, .${SCOPE} #${METRICS_ID} { font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .${SCOPE} .points-e012-family-active { transition: none; }
  }
`;

let layout = null;          // .points-layout du rendu courant
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let familySelect = null;    // <select> de famille, repéré par son aria-label
let resetButton = null;     // bouton natif de réinitialisation, non modifié
let helpNode = null;        // #points-e012-help
let statusNode = null;      // #points-e012-status (texte visible, non live)
let pillsNode = null;       // #points-e012-pills (familles offertes)
let metricsNode = null;     // #points-e012-metrics (compteurs auditables)
let marked = [];            // marques réversibles posées sur les chips du détail
let observer = null;        // observateur unique, ciblé sur le kicker
let lastSignature = '';     // signature de l'état affiché, anti-réécriture
let updateCount = 0;        // compteur d'actualisations réelles

/* Sélecteurs défensifs : un ctx minimal ou un DOM partiel ne doit jamais
 * faire lever une exception dans la lentille. */
function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function textOf(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

/* Repérage sémantique de la famille : aria-label d'abord, libellé d'option
 * ensuite, repli sur la seconde liste. Le domaine n'est jamais marqué. */
function findFamilySelect(filters) {
  const selects = qa(filters, 'select');
  const labelled = selects.find((node) => /famille/i.test(node.getAttribute('aria-label') || ''));
  if (labelled) return labelled;
  const byOption = selects.find((node) => qa(node, 'option')
    .some((option) => /familles/i.test(textOf(option))));
  return byOption || selects[1] || null;
}

function optionLabel(select, value) {
  const found = qa(select, 'option').find((option) => option.value === value);
  return (found && textOf(found)) || value;
}

/* Le bouton natif est reconnu à son libellé : une lentille d'impression peut
 * avoir ajouté sa propre commande dans .points-filters avant notre passage. */
function findReset(filters) {
  const buttons = qa(filters, 'button');
  const labelled = buttons.find((node) => /r[eé]initialiser/i.test(textOf(node)));
  if (labelled) return labelled;
  return buttons.find((node) => !/imprim/i.test(textOf(node))) || buttons[buttons.length - 1] || null;
}

/* Aucun total codé en dur : le seul nombre affiché est relu dans le kicker
 * qu'écrit déjà points.js depuis le périmètre calculé par le store. */
function countFromKicker() {
  const kicker = q(layout, '.points-detail .view-kicker');
  const match = /(\d+)\s*point/i.exec(textOf(kicker));
  return match ? Number(match[1]) : null;
}

function eraName() {
  return textOf(q(layout, '.points-grid-row.is-active .points-era')) || '—';
}

function readState() {
  const value = familySelect && typeof familySelect.value === 'string' ? familySelect.value : '*';
  return {
    value: value || '*',
    label: optionLabel(familySelect, value),
    count: countFromKicker(),
    era: eraName(),
    isDefault: !value || value === '*',
  };
}

function statusText(state) {
  const head = state.isDefault
    ? 'Famille : toutes les familles sont affichées.'
    : `Famille retenue : ${state.label}.`;
  const scope = state.count === null
    ? 'Périmètre : détail non renseigné.'
    : `Périmètre courant : ${state.count} point(s) · ère ${state.era}.`;
  return `${head} ${scope}`;
}

/* Les chips de famille sont des <span> du détail qui portent exactement le
 * libellé d'une option. Les <span> de .points-meta sont exclus. */
function familyChips() {
  const values = qa(familySelect, 'option')
    .map((option) => option.value).filter((value) => value && value !== '*');
  if (!values.length) return [];
  return qa(layout, '.points-detail span').filter((span) => {
    const meta = typeof span.closest === 'function' ? span.closest('.points-meta') : null;
    return !meta && values.includes(textOf(span));
  });
}

/* Efface uniquement les marques posées par E012 ; aucun nœud existant n'est
 * retiré, seul un attribut et une classe réversibles sont enlevés. */
function clearMarks() {
  marked.forEach((node) => {
    node.classList.remove('points-e012-family-active');
    node.removeAttribute('data-points-e012-family');
  });
  marked = [];
}

function markChips(state) {
  familyChips().forEach((chip) => {
    chip.setAttribute('data-points-e012-family', textOf(chip));
    marked.push(chip);
    if (!state.isDefault && textOf(chip) === state.label) {
      chip.classList.add('points-e012-family-active');
    }
  });
}

/* Pastilles non interactives : aucun bouton ajouté, donc aucun conflit avec
 * l'invariant « un seul bouton dans .points-filters » de l'installation. */
function renderPills(state) {
  if (!pillsNode || !familySelect) return;
  const nodes = qa(familySelect, 'option').map((option) => {
    const value = option.value || '*';
    const pill = currentCtx.el('span', 'points-e012-pill', textOf(option) || value);
    pill.setAttribute('data-points-e012-value', value);
    if (!state.isDefault && value === state.value) pill.classList.add('is-active');
    return pill;
  });
  pillsNode.replaceChildren(...nodes);
}

/* Une seule écriture par changement d'état réel ; la signature évite les
 * réécritures provoquées par l'observateur ou par un second appel. */
function refresh(force) {
  if (!layout) return;
  const state = readState();
  const signature = JSON.stringify(state);
  if (!force && signature === lastSignature) return;
  lastSignature = signature;
  updateCount += 1;
  if (statusNode) statusNode.textContent = statusText(state);
  if (metricsNode) {
    metricsNode.textContent = `E012 · actualisations : ${updateCount}`
      + ` · famille : ${state.label}`
      + ` · ${state.count === null ? '—' : `${state.count} point(s)`}`;
  }
  if (familySelect) familySelect.dataset.pointsE012Active = state.isDefault ? '0' : '1';
  if (layout.dataset) {
    layout.dataset.pointsE012Family = state.value;
    layout.dataset.pointsE012Scope = state.isDefault ? 'full' : 'family';
  }
  renderPills(state);
  clearMarks();
  markChips(state);
}

/* Un seul observateur, posé sur le kicker du détail : nous n'écrivons jamais
 * dans ce nœud (statut, pastilles et compteurs vivent dans .points-filters),
 * donc aucune boucle d'écriture n'est possible. */
function observeKicker() {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof MutationObserver === 'undefined') return;
  const kicker = q(layout, '.points-detail .view-kicker');
  if (!kicker) return;
  observer = new MutationObserver(() => refresh(false));
  observer.observe(kicker, { childList: true, characterData: true, subtree: true });
}

function stripDuplicates(root) {
  qa(root, '[id^="points-e012-"]').forEach((node) => node.remove());
  qa(document, '[id^="points-e012-"]').forEach((node) => {
    if (!root.contains(node)) node.remove();
  });
}

/* Enrichit aria-describedby sans écraser les identifiants déjà posés par une
 * autre lentille, et sans toucher à l'aria-label natif de la liste. */
function describeSelect(select) {
  if (!select) return;
  const ids = (select.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  [HELP_ID, STATUS_ID].forEach((id) => {
    if (!ids.includes(id)) ids.push(id);
  });
  select.setAttribute('aria-describedby', ids.join(' '));
}

/* Écouteurs locaux, sans preventDefault ni stopPropagation : les gestionnaires
 * natifs de points.js et les autres lentilles restent seuls maîtres du store. */
function bindControls() {
  [[familySelect, 'change'], [resetButton, 'click']].forEach(([node, event]) => {
    if (!node || node.dataset.pointsE012Bound === '1') return;
    node.dataset.pointsE012Bound = '1';
    node.addEventListener(event, () => refresh(false));
  });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  if (typeof document === 'undefined') return;
  try {
    ctx.css(CSS_ID, CSS);                       /* E012-01 : cssOnce */
    const stage = ctx.stage;
    const currentLayout = ctx.layout && ctx.layout.isConnected
      ? ctx.layout : q(stage, '.points-layout');
    if (!currentLayout) return;
    const filters = q(currentLayout, '.points-filters');
    const detail = q(currentLayout, '.points-detail');
    if (!filters || !detail) return;

    /* Un rendu neuf recrée le layout : les références périmées sont abandonnées. */
    if (statusNode && !statusNode.isConnected) {
      statusNode = helpNode = pillsNode = metricsNode = null;
      familySelect = resetButton = null;
      lastSignature = '';
    }
    stripDuplicates(currentLayout);
    clearMarks();
    currentCtx = ctx;
    layout = currentLayout;
    layout.classList.add(SCOPE);

    familySelect = findFamilySelect(filters);
    resetButton = findReset(filters);

    helpNode = ctx.el('p', 'points-e012-help', HELP_TEXT);
    helpNode.id = HELP_ID;
    filters.appendChild(helpNode);

    statusNode = ctx.el('p', 'points-e012-status', '');
    statusNode.id = STATUS_ID;
    filters.appendChild(statusNode);

    pillsNode = ctx.el('div', 'points-e012-pills');
    pillsNode.id = PILLS_ID;
    pillsNode.setAttribute('aria-label', 'Familles disponibles et famille retenue');
    filters.appendChild(pillsNode);

    metricsNode = ctx.el('p', 'points-e012-metrics', '');
    metricsNode.id = METRICS_ID;
    filters.appendChild(metricsNode);

    describeSelect(familySelect);

    let reduced = false;
    try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); }
    catch { reduced = false; }
    if (layout.dataset) layout.dataset.pointsE012Motion = reduced ? 'reduced' : 'full';

    bindControls();
    observeKicker();
    refresh(true);
    if (layout.dataset) layout.dataset.pointsE012Ready = '1';
  } catch {
    return;
  }
}

register('E012', install);
