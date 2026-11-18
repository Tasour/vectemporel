import { register } from './registry.js';

/* Lentille E093 — Pédagogie & narration : les huit familles de points en carte
 * illustrative (domaine J : pédagogie & narration).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E093.md — chantiers E093-01 à E093-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css, POINT_METHODOLOGY.md et les autres lentilles ne sont ni édités ni
 * doublés : E093 ajoute une carte illustrative LOCALE au DOM déjà produit par
 * renderPoints (points.js:29-126), sans reconstruire la matrice, les filtres,
 * le détail ni la navigation.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion
 * (registry.js:29-37). Aucune dépendance vers le store, les filtres, le détail
 * ni ctx.say : la carte reste lisible avec le ctx minimal et ne modifie aucun
 * état partagé.
 *
 * Invariants : un seul CSS, une seule portée, une seule carte, un seul bouton,
 * aucun écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro
 * console.*, zéro innerHTML. Les huit familles et leurs questions sont celles
 * de POINT_METHODOLOGY.md §2 ; aucune date n'est codée en dur : la date est un
 * champ du point, jamais son contenu.
 */

const CSS_ID = 'points-e093';
const SCOPE = 'points-e093';
const MAP_ID = 'points-e093-map';
const TITLE_ID = 'points-e093-title';
const LIST_ID = 'points-e093-list';
const TOGGLE_ID = 'points-e093-toggle';
const METRICS_ID = 'points-e093-metrics';
const NOTE_ID = 'points-e093-note';
const REDUCED_ATTR = 'data-e093-reduced';

/* E093-03 / E093-04 : les huit familles, leurs questions et leurs exemples sont
 * ceux du tableau §2 de POINT_METHODOLOGY.md. `key` reprend le vocabulaire des
 * slugs déjà présents dans dataset.js et dans le format de proposition du §7 :
 * c'est un identifiant de vocabulaire, jamais une donnée historique. */
const FAMILIES = [
  { key: 'evenement', name: 'Événement', question: 'Quand l’événement a-t-il eu lieu ?', examples: 'prise de la Bastille' },
  { key: 'processus', name: 'Processus', question: 'Quel changement lent ?', examples: 'romanisation, islamisation, industrialisation' },
  { key: 'acteur', name: 'Acteur', question: 'Qui a agi ?', examples: 'Vercingétorix, Olympe de Gouges, un groupe' },
  { key: 'groupe', name: 'Groupe social', question: 'Quel collectif ?', examples: 'paysans, ouvrières, minorité, diaspora' },
  { key: 'lieu', name: 'Lieu', question: 'Où ?', examples: 'Alésia, Paris, Le Caire, Kyoto' },
  { key: 'institution', name: 'Institution', question: 'Quelle structure ?', examples: 'Parlement, Église, armée, compagnie' },
  { key: 'normatif', name: 'Repère normatif', question: 'Quelle règle ?', examples: 'édit, loi, traité, constitution' },
  { key: 'memoire', name: 'Mémoire', question: 'Comment le passé est-il raconté ?', examples: 'statue, commémoration, contestation' },
];

/* E093-06 : la leçon pédagogique est écrite en toutes lettres dans le DOM
 * statique ; elle ne dépend ni du CSS ni du JavaScript. */
const INTRO = 'Carte pédagogique : les huit familles de points définies en §2 de la méthodologie. Une famille est une question posée au passé, pas une étiquette exclusive : un même point peut en porter plusieurs. La date est un champ du point, jamais son contenu.';
const NOTE = 'Exemples tirés de la méthodologie (§2), donnés à titre d’illustration : ils ne constituent pas des points validés de ce pays. La présence indiquée est calculée depuis le filtre « famille » déjà rendu par la vue.';

/* E093-01 / E093-07 / E093-10 : feuille unique, entièrement préfixée par
 * .points-e093 (classe posée sur .points-layout). Aucun sélecteur nu, aucune
 * fuite hors de la vue Points, aucune transition à neutraliser sinon par
 * précaution, aucun canvas, aucune image distante. */
const CSS = `
  .points-e093 { min-width: 0; }
  .points-e093 .points-e093-map {
    margin: 10px 0 14px;
    padding: 10px 12px 12px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: rgba(230, 185, 111, .05);
    color: var(--ink-soft);
    font-size: 11px;
    line-height: 1.45;
  }
  .points-e093 .points-e093-map:focus-visible,
  .points-e093 .points-e093-toggle:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  .points-e093 .points-e093-title {
    margin: 0 0 6px; font-family: var(--serif); font-size: 15px;
    color: var(--gold-bright);
  }
  .points-e093 .points-e093-intro { margin: 0 0 8px; color: var(--ink-soft); }
  .points-e093 .points-e093-note { margin: 0 0 8px; color: var(--muted-2); }
  .points-e093 .points-e093-metrics {
    margin: 2px 0 0; color: var(--ink-soft); font-variant-numeric: tabular-nums;
  }
  .points-e093 .points-e093-toggle {
    min-height: 36px; margin: 0 0 8px; padding: 0 10px;
    border: 1px solid var(--line-strong); border-radius: 6px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  .points-e093 .points-e093-list {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 8px; margin: 0; padding: 0; list-style: none;
  }
  .points-e093 .points-e093-list[hidden] { display: none; }
  .points-e093 .points-e093-family {
    display: grid; grid-template-columns: 26px 1fr;
    column-gap: 6px; row-gap: 2px; padding: 8px;
    border: 1px solid var(--line); border-radius: 6px;
    background: rgba(8, 11, 16, .55);
  }
  .points-e093 .points-e093-num {
    grid-row: 1 / span 4; color: var(--gold);
    font-weight: 700; font-size: 12px; font-variant-numeric: tabular-nums;
  }
  .points-e093 .points-e093-name { color: var(--ink); font-size: 12px; }
  .points-e093 .points-e093-question,
  .points-e093 .points-e093-example,
  .points-e093 .points-e093-presence { display: block; }
  .points-e093 .points-e093-example { color: var(--muted-2); }
  .points-e093 .points-e093-presence {
    margin-top: 2px; padding-top: 3px; font-size: 10px;
    border-top: 1px solid var(--line);
  }
  /* E093-05 : la couleur ne fait que redoubler un texte explicite. */
  .points-e093 .points-e093-family[data-e093-presence="yes"] .points-e093-presence { color: var(--gold-bright); }
  .points-e093 .points-e093-family[data-e093-presence="no"] .points-e093-presence { color: var(--muted-2); }
  @media (max-width: 620px) {
    .points-e093 .points-e093-list { grid-template-columns: 1fr; }
    .points-e093 .points-e093-toggle { min-height: 44px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e093 .points-e093-toggle,
    .points-e093 .points-e093-family { transition: none; }
  }
  .points-e093[` + REDUCED_ATTR + `="1"] .points-e093-toggle,
  .points-e093[` + REDUCED_ATTR + `="1"] .points-e093-family { transition: none; }
  @media (forced-colors: active) {
    .points-e093 .points-e093-map,
    .points-e093 .points-e093-family,
    .points-e093 .points-e093-toggle {
      border: 1px solid CanvasText; background: Canvas;
      color: CanvasText; forced-color-adjust: auto;
    }
    .points-e093 .points-e093-map:focus-visible,
    .points-e093 .points-e093-toggle:focus-visible { outline: 2px solid Highlight; }
  }
  @media print {
    .points-e093 .points-e093-toggle { display: none; }
    .points-e093 .points-e093-list { grid-template-columns: repeat(2, 1fr); }
  }
`;

let renderedSignature = '';   // signature anti-écriture redondante (E093-09)

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/* E093-05 : normalisation sans dépendance de données — « Repère normatif » et
 * le slug `normatif` se comparent sur des caractères alphanumériques seuls. */
function norm(value) {
  return clean(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/* E093-05 : le <select> « famille » est déjà rendu par points.js:73-84 ; ses
 * options portent exactement les slugs présents dans le corpus du pays. */
function familySelect(layout) {
  const selects = layout.querySelectorAll('.points-filters select');
  for (const select of selects) {
    if (/famille/i.test(clean(select.getAttribute('aria-label')))) return select;
  }
  return null;
}

function presentKeys(select) {
  const result = new Set();
  if (!select) return result;
  Array.from(select.options || []).forEach((option) => {
    const key = norm(option.value);
    if (key && key !== 'all' && key !== '*') result.add(key);
  });
  return result;
}

/* E093-06 : les familles du point affiché sont lues dans le détail
 * (points.js:108-110), jamais supposées. */
function shownKeys(layout) {
  const result = new Set();
  const box = layout.querySelector('.points-detail .points-families');
  if (!box) return result;
  Array.from(box.children).forEach((child) => {
    const key = norm(child.textContent);
    if (key) result.add(key);
  });
  return result;
}

/* E093-02 / E093-03 / E093-04 / E093-08 : la structure statique est construite
 * une seule fois par ctx.el ; seul le badge de présence est réécrit ensuite. */
function buildMap(ctx, map) {
  map.replaceChildren();
  map.setAttribute('role', 'region');
  map.setAttribute('aria-labelledby', TITLE_ID);
  map.tabIndex = -1;

  const title = ctx.el('h3', 'points-e093-title', 'Carte illustrative : les huit familles de points');
  title.id = TITLE_ID;
  map.appendChild(title);
  map.appendChild(ctx.el('p', 'points-e093-intro', INTRO));

  /* E093-08 : commande locale, sans touche globale ni annonce live. */
  const toggle = ctx.el('button', 'points-e093-toggle', 'Masquer la carte des familles');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', LIST_ID);
  toggle.setAttribute('aria-expanded', 'true');
  toggle.addEventListener('click', () => {
    const list = map.querySelector('#' + LIST_ID);
    if (!list) return;
    const collapse = !list.hidden;
    list.hidden = collapse;
    toggle.setAttribute('aria-expanded', String(!collapse));
    toggle.textContent = collapse
      ? 'Afficher la carte des familles'
      : 'Masquer la carte des familles';
  });
  map.appendChild(toggle);

  const list = ctx.el('ul', 'points-e093-list');
  list.id = LIST_ID;
  FAMILIES.forEach((family, index) => {
    const item = ctx.el('li', 'points-e093-family');
    item.dataset.key = family.key;
    item.dataset.e093Presence = 'unknown';

    const num = ctx.el('span', 'points-e093-num', String(index + 1).padStart(2, '0'));
    num.setAttribute('aria-hidden', 'true');
    const name = ctx.el('strong', 'points-e093-name', family.name);
    name.id = `points-e093-name-${family.key}`;
    const question = ctx.el('span', 'points-e093-question', family.question);
    const examples = ctx.el('span', 'points-e093-example', `Exemples : ${family.examples}.`);
    const badge = ctx.el('span', 'points-e093-presence',
      'Présence non vérifiable dans ce périmètre');

    item.append(num, name, question, examples, badge);
    list.appendChild(item);
  });
  map.appendChild(list);

  const note = ctx.el('p', 'points-e093-note', NOTE);
  note.id = NOTE_ID;
  map.appendChild(note);

  const metrics = ctx.el('p', 'points-e093-metrics', '');
  metrics.id = METRICS_ID;
  map.appendChild(metrics);
}

/* E093-05 / E093-09 : une seule écrivain, pilotée par une signature ; l'absence
 * de signal est un état explicite, jamais une affirmation d'absence. */
function refresh(map, layout) {
  const select = familySelect(layout);
  const known = !!select;
  const present = presentKeys(select);
  const shown = shownKeys(layout);
  const signature = [
    known ? '1' : '0',
    Array.from(present).sort().join(','),
    Array.from(shown).sort().join(','),
  ].join('|');
  if (signature === renderedSignature) return;
  renderedSignature = signature;

  FAMILIES.forEach((family) => {
    const item = map.querySelector(`.points-e093-family[data-key="${family.key}"]`);
    if (!item) return;
    const badge = item.querySelector('.points-e093-presence');
    const isPresent = present.has(family.key);
    const state = !known ? 'unknown' : (isPresent ? 'yes' : 'no');
    if (item.dataset.e093Presence !== state) item.dataset.e093Presence = state;
    if (badge) {
      const text = !known
        ? 'Présence non vérifiable dans ce périmètre'
        : (isPresent ? 'Présente dans le corpus de ce pays' : 'Absente du corpus de ce pays');
      if (badge.textContent !== text) badge.textContent = text;
    }
  });

  const metrics = map.querySelector('#' + METRICS_ID);
  if (metrics) {
    const count = FAMILIES.filter((family) => present.has(family.key)).length;
    const text = known
      ? `${FAMILIES.length} familles décrites · ${count} présentes dans ce pays · ${shown.size} sur le point affiché.`
      : `${FAMILIES.length} familles décrites · présence non vérifiable (filtre « famille » absent).`;
    if (metrics.textContent !== text) metrics.textContent = text;
  }
}

/* E093-01 / E093-07 / E093-10 : installation idempotente, sans fichier
 * partagé, sans timer, sans rAF, sans réseau, sans aléa. */
register('E093', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset.e093 !== '1') layout.dataset.e093 = '1';

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  const matrix = layout.querySelector('.points-matrix') || layout;
  let map = document.getElementById(MAP_ID);
  if (map && !layout.contains(map)) map.remove();
  if (!map) {
    map = el('section', 'points-e093-map');
    map.id = MAP_ID;
    buildMap(ctx, map);
    renderedSignature = '';   // une carte neuve doit toujours être repeuplée
  }
  if (map.parentElement !== matrix) matrix.appendChild(map);

  const grid = layout.querySelector('.points-grid');
  if (grid && grid.dataset.e093Ready !== '1') grid.dataset.e093Ready = '1';

  refresh(map, layout);
});
