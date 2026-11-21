import { register } from './registry.js';

/* Lentille POINTS V2 E013 — passe 2 (V2) — domaine B : filtres & périmètre.
 * Réinitialisation des filtres : bouton natif + annonce lestée, de façon
 * NON destructive et distincte de la passe 1.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E013.md — chantiers V2 E013-01 à
 * E013-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E013.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est édité.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2' (et non 'points' en passe 1). Les identifiants, classes,
 * attributs et signaux sont TOUS préfixés points-v2-e013 / data-points-v2-e013
 * afin de ne pas écraser ceux de la passe 1 (points-e013-*, data-points-e013*)
 * qui s'appliquent au même DOM. Le ctx n'expose toujours pas say() : l'annonce
 * passe par un <p role=status aria-live=polite> local, accroché à document.body
 * pour survivre au re-render asynchrone déclenché par set().
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Toutes les valeurs annoncées sont DÉRIVÉES DU DOM rendu
 * (deux <select>, matrice .points-grid, ligne .is-active) : aucun chiffre,
 * aucun millésime, aucun total codé en dur, aucun import du store.
 *
 * Invariants V2 : un seul greffon register('E013', ctx => …), une seule feuille
 * ctx.css('points-v2-e013', CSS) dont TOUS les sélecteurs commencent par
 * .points-v2-e013, des ids uniques points-v2-e013-* protégés contre les
 * doublons, le DOM statique créé par ctx.el (jamais innerHTML), un seul
 * écouteur par bouton, une seule région live, zéro console, zéro réseau, zéro
 * aléa, zéro timer, zéro rAF, zéro écouteur global.
 */

const CSS_ID = 'points-v2-e013';
const SCOPE = 'points-v2-e013';
const RESET_CLASS = 'points-v2-e013-reset';
const HINT_CLASS = 'points-v2-e013-hint';
const LIVE_CLASS = 'points-v2-e013-live';
const STILL_CLASS = 'points-v2-e013-still';

const ID = {
  hint: 'points-v2-e013-hint',
  live: 'points-v2-e013-live',
};

/* Les clés dataset sont distinctes de la passe 1 (pointsE013,
 * pointsE013Bound, pointsE013Last) : les deux lentilles coexistent sans
 * s'écraser sur les nœuds partagés. */
const DATA = {
  scope: 'pointsV2E013',
  marked: 'pointsV2E013Marked',
  bound: 'pointsV2E013Bound',
  last: 'pointsV2E013Last',
};

/* Feuille unique. Chaque sélecteur COMMENCE littéralement par .points-v2-e013
 * (y compris la classe de la région live, hors flux mais préfixée, et y compris
 * à l'intérieur des @media) : aucune règle ne peut fuir hors de la vue Points.
 * La cible tactile est de 44 px, le focus est visible, le mouvement réduit est
 * neutralisé deux fois (classe pilotée par ctx.reducedMotion() ET media query)
 * et les couleurs forcées gardent une bordure explicite. */
const CSS = `
  .points-v2-e013 .points-v2-e013-reset {
    min-height: 44px; padding: 8px 12px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright, #f0d49a);
    font: inherit; cursor: pointer;
  }
  .points-v2-e013 .points-v2-e013-reset:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px;
  }
  .points-v2-e013 .points-v2-e013-hint {
    flex-basis: 100%; margin: 6px 0 0;
    color: var(--muted-2, #9a9a9a); font-size: 10px; line-height: 1.4;
  }
  .points-v2-e013-live {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  .points-v2-e013.points-v2-e013-still .points-v2-e013-reset { transition: none; }
  @media (max-width: 620px) {
    .points-v2-e013 .points-v2-e013-reset { min-height: 44px; padding: 10px 12px; }
    .points-v2-e013 .points-v2-e013-hint { font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e013 .points-v2-e013-reset { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e013 .points-v2-e013-reset {
      border: 2px solid ButtonText; color: ButtonText; background: ButtonFace;
    }
    .points-v2-e013 .points-v2-e013-reset:focus-visible { outline-color: Highlight; }
  }
`;

/* Dernière phrase émise : garde anti-bavardage, remis à zéro à chaque rendu. */
let lastAnnouncement = '';

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function docOf(ctx, root) {
  if (root && root.ownerDocument) return root.ownerDocument;
  if (ctx && ctx.stage && ctx.stage.ownerDocument) return ctx.stage.ownerDocument;
  return typeof document !== 'undefined' ? document : null;
}

/* E013-01 — ancrage de lecture : layout d'abord, repli sur le .points-layout
 * contenu dans stage. Le filtre sur viewId 'pointsv2' neutralise la lentille
 * hors de la passe 2. */
function rootOf(ctx) {
  if (!ctx || (ctx.viewId && ctx.viewId !== 'pointsv2')) return null;
  const layout = ctx.layout;
  if (layout && typeof layout.querySelector === 'function' && layout.isConnected !== false) return layout;
  const stage = ctx.stage;
  if (stage && typeof stage.querySelector === 'function') {
    return (stage.querySelector('.points-layout') || stage);
  }
  return null;
}

/* E013-01 — repérage NON destructif du bouton natif. On ne crée jamais de
 * second bouton : on réutilise celui de points.js (points.js:86-92), reconnu à
 * son libellé « Réinitialiser les filtres ». Le marqueur V2 sert à le retrouver
 * au rendu suivant sans dépendre de l'id posé par la passe 1. */
function findReset(filters) {
  if (!filters || typeof filters.querySelectorAll !== 'function') return null;
  const marked = filters.querySelector('[data-points-v2-e013-bound]');
  if (marked) return marked;
  const buttons = filters.querySelectorAll('button');
  for (const button of buttons) {
    if (/r[eé]initialiser/i.test(button.textContent || '')) return button;
  }
  return buttons.length ? buttons[buttons.length - 1] : null;
}

/* E013-04 — les deux <select> sont lus tels qu'ils sont dans le DOM. Le
 * gestionnaire natif a déjà mis state à '*' mais n'a pas encore re-rendu le DOM
 * au moment où notre écouteur s'exécute : les valeurs restent celles d'avant la
 * réinitialisation, seules sources de vérité pour l'annonce. */
function selectValues(filters) {
  const list = filters && typeof filters.querySelectorAll === 'function'
    ? filters.querySelectorAll('select') : [];
  return { domain: list[0] ? list[0].value : '', family: list[1] ? list[1].value : '' };
}

function activeFilterCount(filters) {
  const { domain, family } = selectValues(filters);
  let count = 0;
  if (domain && domain !== '*') count += 1;
  if (family && family !== '*') count += 1;
  return count;
}

/* E013-05 — ère courante et décompte des points issus de la matrice. La somme
 * porte sur les cellules has-points de la ligne active (la réinitialisation ne
 * touche pas l'ère), avec repli sur toute la matrice si aucune ligne n'est
 * active. Aucune constante, aucun millésime. */
function activeEra(root) {
  if (!root || typeof root.querySelector !== 'function') return '';
  const row = root.querySelector('.points-grid-row.is-active');
  if (!row) return '';
  const label = row.querySelector('.points-era');
  return txt(label || (row.children && row.children[0]));
}

function visibleAfterReset(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;
  const activeCells = root.querySelectorAll('.points-grid-row.is-active .points-cell.has-points');
  const cells = activeCells.length
    ? activeCells
    : root.querySelectorAll('.points-cell.has-points');
  let total = 0;
  cells.forEach((cell) => {
    const value = parseInt(txt(cell), 10);
    if (Number.isFinite(value) && value > 0) total += value;
  });
  return total;
}

/* E013-06 — deux messages distincts et véridifiables, enrichis du nom de l'ère
 * lu dans le DOM. Le seul nombre vient de visibleAfterReset(). */
function buildMessage(root, filters) {
  if (activeFilterCount(filters) === 0) {
    return 'Aucun filtre actif : la réinitialisation ne change rien au périmètre (ère courante conservée).';
  }
  const count = visibleAfterReset(root);
  const era = activeEra(root);
  const where = era ? ` dans l’ère ${era}` : '';
  const suffix = count > 0
    ? ` ${count} point(s) redeviennent visibles${where}.`
    : ` Le périmètre est à nouveau complet${where}.`;
  return `Filtres réinitialisés : domaine et famille tous affichés.${suffix}`;
}

/* E013-03 — région live unique et persistante, créée avant toute écriture.
 * Identifiant ET classe préfixés ; le document est réutilisé s'il existe déjà
 * (un nœud surnuméraire de même id mais de balise différente est retiré). */
function ensureLive(doc, ctx) {
  if (!doc || !doc.body || typeof doc.getElementById !== 'function') return null;
  let live = doc.getElementById(ID.live);
  if (live && live.tagName && live.tagName.toLowerCase() !== 'p') {
    if (live.remove) live.remove();
    live = null;
  }
  if (live) return live;
  live = ctx.el('p', LIVE_CLASS);
  live.id = ID.live;
  put(live, 'role', 'status');
  put(live, 'aria-live', 'polite');
  put(live, 'aria-atomic', 'true');
  doc.body.appendChild(live);
  return live;
}

/* E013-07 — dédup : une phrase identique n'est jamais réécrite dans la live. */
function announce(doc, ctx, message) {
  if (!message || message === lastAnnouncement) return;
  const live = ensureLive(doc, ctx);
  if (!live) return;
  live.textContent = message;
  lastAnnouncement = message;
}

/* E013-02 — note statique, construite par ctx.el (jamais innerHTML), placée
 * dans .points-filters juste après le bouton. Elle sert de cible à
 * aria-describedby et rend le périmètre de la réinitialisation explicite sans
 * dépendre du CSS ni d'une annonce. Garde anti-doublon par identifiant. */
function ensureHint(doc, ctx, filters) {
  let hint = doc.getElementById(ID.hint);
  if (hint && hint.parentNode && hint.parentNode !== filters) hint.remove();
  if (hint && hint.tagName && hint.tagName.toLowerCase() !== 'p') {
    if (hint.remove) hint.remove();
    hint = null;
  }
  if (!hint) {
    hint = ctx.el('p', HINT_CLASS,
      'Réinitialisation : le domaine et la famille sont tous réaffichés ; l’ère courante est conservée.');
    hint.id = ID.hint;
  }
  const button = findReset(filters);
  if (button && button.nextSibling) filters.insertBefore(hint, button.nextSibling);
  else filters.appendChild(hint);
  return hint;
}

/* E013-02 — fusion additive de aria-describedby : toute relation posée par la
 * passe 1 ou une autre lentille est conservée, puis dédupliquée. */
function mergeDescribedBy(node, id) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const before = node.getAttribute('aria-describedby') || '';
  const existing = before.split(/\s+/).filter(Boolean);
  const merged = Array.from(new Set(existing.concat([id]))).join(' ');
  if (merged && merged !== before) put(node, 'aria-describedby', merged);
}

function apply(ctx) {
  const root = rootOf(ctx);
  if (!root) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const doc = docOf(ctx, root);
  if (!doc || typeof doc.getElementById !== 'function') return;

  const filters = root.querySelector('.points-filters');
  if (!filters) return;
  const reset = findReset(filters);
  if (!reset) return;

  /* E013-01 / E013-08 — une seule feuille, une seule portée, des signaux
   * distincts de la passe 1. Le layout sert de racine CSS ; stage reste l'ancre
   * de repli utilisée par rootOf(). */
  ctx.css(CSS_ID, CSS);
  const layout = (ctx.layout && ctx.layout.classList && typeof ctx.layout.classList.add === 'function')
    ? ctx.layout : root;
  layout.classList.add(SCOPE);
  if (filters.dataset) filters.dataset[DATA.scope] = 'ready';
  if (layout.dataset) layout.dataset[DATA.scope] = 'grafted';

  /* E013-10 — couplage défensif à la préférence de mouvement réduit, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (layout.classList && typeof layout.classList.toggle === 'function') {
    const still = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
    layout.classList.toggle(STILL_CLASS, still);
  }

  /* E013-02 — marquage accessible ADDITIF : on enrichit sans jamais écraser
   * l'id, l'aria-label ou le title posés par la passe 1. */
  reset.classList.add(RESET_CLASS);
  if (!reset.getAttribute('aria-label')) {
    put(reset, 'aria-label', 'Réinitialiser les filtres de domaine et de famille');
  }
  if (!reset.getAttribute('type')) put(reset, 'type', 'button');
  const hint = ensureHint(doc, ctx, filters);
  mergeDescribedBy(reset, ID.hint);
  if (reset.dataset) reset.dataset[DATA.marked] = '1';

  /* E013-03 — la région existe avant le premier clic, sinon l'AT peut manquer
   * la première annonce. On la vide et on remet le garde à zéro à chaque rendu. */
  const live = ensureLive(doc, ctx);
  if (live) live.textContent = '';
  lastAnnouncement = '';

  /* E013-09 — idempotence : un seul écouteur par bouton, même si apply() est
   * appelé deux fois sur le même DOM. Le marqueur vit sur l'élément et meurt
   * avec lui au re-render. Le gestionnaire natif qui remet state à '*' et
   * déclenche set() n'est ni retiré ni remplacé. */
  if (reset.dataset && reset.dataset[DATA.bound] === '1') return;
  if (reset.dataset) reset.dataset[DATA.bound] = '1';
  reset.addEventListener('click', () => {
    const message = buildMessage(root, filters);
    if (filters.dataset) filters.dataset[DATA.last] = 'reset';
    announce(doc, ctx, message);
  });
}

register('E013', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
