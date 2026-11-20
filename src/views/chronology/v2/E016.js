import { register } from './registry.js';

/* Lentille E016 — état vide explicite quand zéro événement est affiché
 * (domaine B : filtres & périmètre, passe V2 de la vue Chronologie).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E016.md — chantiers E016-01 à E016-10.
 * Fichier possédé : src/views/chronology/v2/E016.js uniquement. Lectures seules :
 * src/views/chronology.js, src/views/chronology/v2/registry.js,
 * src/views/chronology/v2/index.js, UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout }, avec
 * ctx.css, ctx.el et ctx.reducedMotion. Un seul appel au registre (E016),
 * une seule feuille CSS. Aucun fichier partagé n'est modifié : la vue, le
 * registre, l'index, styles.css et les autres lentilles restent intacts.
 *
 * La lentille n'ajoute AUCUNE région live : les annonces restent portées par
 * #nav-c2a-live de la vue et par les lentilles dédiées E015 / E019. Elle rend
 * seulement visible, textuel et mesurable un état vide déjà produit par la vue.
 *
 * Invariants : aucune journalisation, aucun réseau, aucun import distant,
 * aucun aléa, aucun HTML brut, aucun timer, aucune animation. Toutes les
 * écritures passent par textContent via ctx.el ; tous les IDs sont préfixés
 * chronology-v2-e016- et protégés par une garde d'existence.
 */

const PANEL_ID = 'chronology-v2-e016-panel';
const TITLE_ID = 'chronology-v2-e016-title';
const BADGE_ID = 'chronology-v2-e016-badge';
const BADGE_SYMBOL_ID = 'chronology-v2-e016-badge-symbol';
const BADGE_LABEL_ID = 'chronology-v2-e016-badge-label';
const STATE_ID = 'chronology-v2-e016-state';
const CAUSE_ID = 'chronology-v2-e016-cause';
const CRITERIA_ID = 'chronology-v2-e016-criteria';
const COUNT_ID = 'chronology-v2-e016-count';
const STEPS_ID = 'chronology-v2-e016-steps';
const RESET_ID = 'chronology-v2-e016-reset';
const NORMAL_ID = 'chronology-v2-e016-normal';
const METRIC_ID = 'chronology-v2-e016-metric';

const LIST_ID = 'atlas-chrono-events';
const COUNT_SOURCE_ID = 'atlas-chrono-count';
const SEARCH_ID = 'atlas-chrono-search';
const EMPTY_FILTER_ID = 'nav-c2a-empty-filter';
const EMPTY_ERA_ID = 'nav-c2a-empty-era';
const MAIN_ID = 'atlas-chrono-main';

const REINFORCED_CLASS = 'chronology-v2-e016-empty-reinforced';

/* E016-08 : une seule feuille, sans ressource distante, sans transition
   inutile. Replis mouvement réduit, couleurs forcées et écran étroit. */
const CSS = `
  #${PANEL_ID} {
    margin: 10px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e016-title {
    margin: 0 0 7px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e016-badge {
    display: inline-flex; align-items: center; gap: 6px;
    margin: 0 0 7px; padding: 3px 9px;
    border: 2px dashed var(--gold); border-radius: 6px;
    color: var(--gold-bright); font-size: 9px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
  }
  #${PANEL_ID} .e016-badge-symbol { font-size: 13px; line-height: 1; }
  #${PANEL_ID} .e016-state,
  #${PANEL_ID} .e016-cause,
  #${PANEL_ID} .e016-criteria,
  #${PANEL_ID} .e016-count,
  #${PANEL_ID} .e016-normal,
  #${PANEL_ID} .e016-metric { margin: 4px 0 0; }
  #${PANEL_ID} .e016-cause { color: var(--ink); }
  #${PANEL_ID} .e016-criteria,
  #${PANEL_ID} .e016-count,
  #${PANEL_ID} .e016-metric { color: var(--muted); }
  #${PANEL_ID} .e016-steps {
    margin: 7px 0 0; padding-left: 20px;
    color: var(--ink-soft); font-size: 10px; line-height: 1.5;
  }
  #${PANEL_ID} .e016-step { margin: 0 0 2px; }
  #${PANEL_ID} .e016-reset {
    min-height: 36px; margin: 9px 0 2px; padding: 6px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  #${PANEL_ID} .e016-reset:hover { border-color: var(--gold); }
  #${PANEL_ID} .e016-reset:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${PANEL_ID}[data-e016-empty="0"] .e016-empty-only { display: none; }
  #${PANEL_ID}[data-e016-empty="1"] .e016-normal-only { display: none; }
  .${REINFORCED_CLASS} {
    border-style: dashed; border-width: 2px;
    color: var(--ink); line-height: 1.6;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${PANEL_ID} .e016-reset { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .${REINFORCED_CLASS} {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, .${REINFORCED_CLASS} {
      border: 2px dashed CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e016-title,
    #${PANEL_ID} .e016-badge,
    #${PANEL_ID} .e016-cause,
    #${PANEL_ID} .e016-reset { color: CanvasText; }
  }
`;

/* E016-06 : trois consignes concrètes, ordonnées, lues sans CSS. */
const STEP_ROWS = [
  'Vérifier l’orthographe et les accents du terme recherché.',
  'Élargir le périmètre : retirer un type de point sélectionné.',
  'Réinitialiser le filtre pour retrouver tous les repères du pays.',
];

const CAUSE_LABELS = {
  filtre: 'filtre trop restrictif (recherche ou type de point)',
  ere: 'ère sans repère documenté',
  indetermine: 'cause non déterminée depuis le DOM',
  aucun: 'aucune',
};

/* E016-09 : le signal d'état vide et son compteur survivent aux rendus,
   car ils vivent dans le module et non dans le DOM reconstruit par la coque. */
let emptyObservations = 0;
let lastEmptyKey = '';

/* E016-10 : un nœud retrouvé est réutilisé et déplacé dans le parent courant ;
   un nœud d'un rendu détaché n'est pas retrouvé et est recréé. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rendus identiques ne touchent pas textContent. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function readText(id) {
  const node = document.getElementById(id);
  return node ? (node.textContent || '').trim() : '';
}

/* E016-05 : le total est lu dans le libellé de la vue, jamais codé en dur. */
function parseTotal(source) {
  const match = source.match(/(\d+)\s*\/\s*(\d+)/);
  return match ? match[2] : null;
}

/* E016-03 : critères effectivement actifs, lus dans le DOM courant. */
function activeCriteria(layout) {
  const search = document.getElementById(SEARCH_ID);
  const query = search ? (search.value || '').trim() : '';
  const chips = layout
    ? Array.from(layout.querySelectorAll('.atlas-chrono-tag[aria-pressed="true"]'))
    : [];
  const tags = chips
    .map((chip) => (chip.textContent || '').trim())
    .filter(Boolean);
  return { query, tags };
}

register('E016', (ctx) => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  ctx.css('chronology-v2-e016', CSS);

  const layout = ctx.layout;
  const list = document.getElementById(LIST_ID);
  const emptyFilter = document.getElementById(EMPTY_FILTER_ID);
  const emptyEra = document.getElementById(EMPTY_ERA_ID);
  const emptyNode = emptyFilter || emptyEra;
  const shown = list ? list.querySelectorAll('.event-card').length : 0;
  const isEmpty = Boolean(emptyNode) || (Boolean(list) && shown === 0);
  const cause = emptyFilter ? 'filtre' : emptyEra ? 'ere' : (isEmpty ? 'indetermine' : 'aucun');

  const host = document.getElementById(MAIN_ID) || layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e016-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const child = (id, tagName, className) => ensureNode(make, id, tagName, className, panel);
  const title = child(TITLE_ID, 'h2', 'e016-title');
  const badge = child(BADGE_ID, 'p', 'e016-badge e016-empty-only');
  const badgeSymbol = ensureNode(make, BADGE_SYMBOL_ID, 'span', 'e016-badge-symbol', badge);
  const badgeLabel = ensureNode(make, BADGE_LABEL_ID, 'span', 'e016-badge-label', badge);
  const state = child(STATE_ID, 'p', 'e016-state');
  const causeLine = child(CAUSE_ID, 'p', 'e016-cause e016-empty-only');
  const criteria = child(CRITERIA_ID, 'p', 'e016-criteria');
  const countLine = child(COUNT_ID, 'p', 'e016-count');
  const steps = child(STEPS_ID, 'ol', 'e016-steps e016-empty-only');
  const reset = child(RESET_ID, 'button', 'e016-reset e016-empty-only');
  const normal = child(NORMAL_ID, 'p', 'e016-normal e016-normal-only');
  const metric = child(METRIC_ID, 'p', 'e016-metric');

  if (steps.childElementCount !== STEP_ROWS.length) {
    steps.replaceChildren(...STEP_ROWS.map((row) => make('li', 'e016-step', row)));
  }

  reset.type = 'button';
  reset.setAttribute('aria-label', 'Réinitialiser le filtre depuis l’état vide');
  write(reset, 'Réinitialiser le filtre');
  if (reset.dataset.e016Bound !== '1') {
    /* E016-04 : délégation au bouton de réinitialisation de la vue, dont on
       ne duplique ni l'état local ni l'annonce live. */
    reset.addEventListener('click', () => {
      const baseReset = document.querySelector(`#${EMPTY_FILTER_ID} button`);
      if (baseReset && typeof baseReset.click === 'function') {
        baseReset.click();
        return;
      }
      const search = document.getElementById(SEARCH_ID);
      if (search) {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    reset.dataset.e016Bound = '1';
  }

  const { query, tags } = activeCriteria(layout);
  const total = parseTotal(readText(COUNT_SOURCE_ID));
  const criteriaText = `Critères actifs — recherche : ${query ? `« ${query} »` : 'aucune'}`
    + ` · type : ${tags.length ? tags.join(', ') : 'aucun'}.`;
  const totalText = total === null ? 'un total non lisible' : total;

  const countryId = layout.dataset ? (layout.dataset.countryId || '') : '';
  const emptyKey = [countryId, cause, String(shown), String(total), query, tags.join(',')].join('|');
  if (isEmpty && emptyKey !== lastEmptyKey) {
    emptyObservations += 1;
    lastEmptyKey = emptyKey;
  }
  if (!isEmpty) lastEmptyKey = '';

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  panel.dataset.e016Empty = isEmpty ? '1' : '0';
  panel.dataset.e016Cause = cause;
  panel.dataset.e016Shown = String(shown);
  panel.dataset.e016Total = total === null ? 'inconnu' : total;
  panel.dataset.e016Renders = String(emptyObservations);
  panel.dataset.e016Reduced = reduced ? '1' : '0';
  layout.dataset.e016EmptySignal = isEmpty ? '1' : '0';

  /* E016-02 : la cause est aussi portée par le bloc vide d'origine, sans le
     modifier structurellement (aucun texte remplacé, aucune classe retirée). */
  if (emptyNode) {
    emptyNode.classList.add(REINFORCED_CLASS);
    emptyNode.dataset.e016Cause = cause;
  }

  write(title, 'État vide et périmètre — diagnostic');
  write(badgeSymbol, isEmpty ? '∅' : '✓');
  write(badgeLabel, isEmpty ? 'Zéro résultat' : 'Repères affichés');
  write(state, isEmpty
    ? 'État vide explicite : zéro événement n’est affiché dans la liste des repères.'
    : `État normal : ${shown} repère(s) affiché(s) dans la liste.`);
  write(causeLine, isEmpty
    ? `Cause identifiée : ${CAUSE_LABELS[cause] || CAUSE_LABELS.indetermine}.`
    : 'Cause : aucune ; la liste contient des repères.');
  write(criteria, criteriaText);
  write(countLine, `Mesure : ${shown} repère(s) affiché(s) sur ${totalText} dans le périmètre déclaré.`);
  write(normal, 'La liste des repères est non vide : aucun diagnostic d’état vide n’est requis.');
  write(metric, `Observations d’état vide conservées entre rendus : ${emptyObservations}.`
    + ` Rendu courant : ${isEmpty ? 'vide' : 'non vide'} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
});
