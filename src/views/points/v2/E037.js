import { register } from './registry.js';

/* Lentille E037 — passe V2, domaine D : focus visible renforcé sur tous les
 * contrôles de la vue Points.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E037.md — chantiers E037-01 à
 * E037-10. Fichier possédé : src/views/points/v2/E037.js uniquement.
 * Lectures seules : src/views/points.js, src/views/points/registry.js,
 * src/views/points/v2/index.js, styles.css et la passe 1
 * (src/views/points/E037.js). Aucun fichier partagé n'est modifié.
 *
 * Complémentarité : la passe 1 pose déjà un anneau générique épais et un
 * panneau local. La V2 n'efface rien : elle spécialise l'anneau par type de
 * contrôle réellement rendu (boutons d'ère, cellules, sélecteurs, réglage,
 * navigation, cible programmatique), ajoute les replis forced-colors /
 * contraste / mouvement et un panneau de diagnostic mesuré sur le DOM.
 *
 * Contrat exploité : ctx.viewId ('pointsv2'), ctx.stage, ctx.layout,
 * ctx.css(id, règles), ctx.el(tag, classe, texte) et ctx.reducedMotion().
 * Une seule feuille : ctx.css('points-v2-e037', …), dont TOUTES les règles
 * sont préfixées par '.points-v2-e037', classe posée sur .points-layout.
 * Un seul register('E037', install). Tous les IDs CRÉÉS sont préfixés
 * 'points-v2-e037-'. Toutes les valeurs affichées sont dérivées du DOM rendu :
 * aucun libellé d'ère, aucun chiffre, aucune date codés en dur.
 *
 * Invariants :
 * - aucun vol de focus, aucun preventDefault, aucun gestionnaire de touche ;
 * - aucun timer, aucune boucle d'animation, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun innerHTML, aucun texte injecté par chaîne ;
 * - un seul écouteur documentaire focusin, purement observationnel, sous garde ;
 * - le panneau est un bloc en flux normal, non modal et non tabulable : il
 *   n'ajoute aucun arrêt Tab, aucune région live et aucun raccourci ;
 * - greffon idempotent et tolérant : une structure inattendue neutralise la
 *   lentille sans propager d'exception.
 */

const CSS_ID = 'points-v2-e037';
const PANEL_ID = 'points-v2-e037-panel';
const TITLE_ID = 'points-v2-e037-title';
const LIST_ID = 'points-v2-e037-list';
const CURRENT_ID = 'points-v2-e037-current';
const METRIC_ID = 'points-v2-e037-metric';
const LAYOUT_CLASS = 'points-layout';
const ANCHOR = `.${CSS_ID}.${LAYOUT_CLASS}[data-points-v2-e037="1"]`;

/* E037-01 à E037-10 : une seule feuille, injectée une fois par ctx.css.
 * Chaque chantier possède son bloc CSS commenté et repérable, plus une marque
 * data-e037-NN sur le panneau et sur sa ligne de liste. La spécificité des
 * sélecteurs vient de l'ancre préfixée et du conteneur réel de la vue ; aucun
 * !important n'est utilisé, la passe 1 n'est donc pas neutralisée. */
const CSS = `
  /* E037-10 : panneau de diagnostic, bloc en flux, non modal, non tabulable. */
  .${CSS_ID} #${PANEL_ID} {
    margin: 14px 0 2px; padding: 10px 12px 11px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .${CSS_ID} #${PANEL_ID} .e037-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
  }
  .${CSS_ID} #${PANEL_ID} .e037-lede { margin: 0 0 8px; color: var(--muted); }
  .${CSS_ID} #${PANEL_ID} .e037-list { margin: 0 0 7px; padding: 0; list-style: none; }
  .${CSS_ID} #${PANEL_ID} .e037-item { display: flex; gap: 8px; margin: 0 0 3px; }
  .${CSS_ID} #${PANEL_ID} .e037-num { flex: 0 0 62px; color: var(--gold-bright); }
  .${CSS_ID} #${PANEL_ID} .e037-label { flex: 1 1 auto; min-width: 0; }
  .${CSS_ID} #${PANEL_ID} .e037-etat { color: var(--gold-bright); }
  .${CSS_ID} #${PANEL_ID} .e037-current { margin: 5px 0 0; color: var(--gold-bright); }
  .${CSS_ID} #${PANEL_ID} .e037-metric { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }

  /* E037-01 : anneau V2 à trois couches (contour, liseré sombre, halo),
     réservé au clavier par :focus-visible. :is() couvre boutons, sélecteurs,
     liens et tabulables, sans modifier aucun tabindex existant. */
  ${ANCHOR} :is(button, select, a[href], [tabindex]:not([tabindex="-1"])):focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--bg), 0 0 0 5px rgba(230,185,111,.30);
  }

  /* E037-02 : boutons d'ère — l'anneau englobe toute la commande tandis que
     le repère de ligne active reste un trait interne, jamais la seule couleur. */
  ${ANCHOR} .points-grid .points-grid-row .points-era:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 2px;
    box-shadow: inset 0 -3px var(--gold), 0 0 0 1px var(--bg), 0 0 0 5px rgba(230,185,111,.32);
  }
  ${ANCHOR} .points-grid .points-grid-row[data-v2-e037-current="true"] .points-era {
    box-shadow: inset 0 -3px var(--gold);
  }

  /* E037-03 : cellules denses — anneau non rogné, halo plein pour une cellule
     renseignée, halo neutre et liseré renforcé pour une cellule vide. */
  ${ANCHOR} .points-grid .points-grid-row .points-cell:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    overflow: visible;
    box-shadow: 0 0 0 1px var(--bg), 0 0 0 6px rgba(230,185,111,.30);
  }
  ${ANCHOR} .points-grid .points-grid-row .points-cell[data-v2-e037-cell="empty"]:focus-visible {
    box-shadow: 0 0 0 1px var(--bg), 0 0 0 6px rgba(168,161,152,.28);
  }

  /* E037-04 : sélecteurs de filtre — anneau externe et bordure interne, sans
     ombre qui recouvrirait le texte choisi ni le libellé de l'option. */
  ${ANCHOR} .points-filters select:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 2px;
    border-color: var(--gold-bright);
    box-shadow: none;
    min-height: 36px;
  }

  /* E037-05 : réinitialisation — anneau sur la cible nominale ; un bouton
     désactivé n'affiche aucun anneau afin de ne pas suggérer d'action. */
  ${ANCHOR} .points-filters button:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--bg);
    min-height: 36px;
  }
  ${ANCHOR} .points-filters button:disabled:focus-visible { outline: none; box-shadow: none; }

  /* E037-06 : navigation précédent/suivant — même niveau de visibilité pour
     les deux commandes, disabled exclu comme en E037-05. */
  ${ANCHOR} .points-nav button:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--bg), 0 0 0 4px rgba(230,185,111,.28);
    min-height: 36px;
  }
  ${ANCHOR} .points-nav button:disabled:focus-visible { outline: none; box-shadow: none; }

  /* E037-07 : cible de focus programmatique (tabindex="-1") — pointillé
     distinctif, sans toucher au tabindex ni à la vue. */
  ${ANCHOR} [data-v2-e037-programmatic][tabindex="-1"]:focus-visible {
    outline: 3px dashed var(--gold-bright);
    outline-offset: 4px;
    box-shadow: none;
  }

  /* E037-08 : repli forced-colors — couleur système, jamais la teinte du
     thème ; les ombres translucides sont inopérantes dans ce mode. */
  @media (forced-colors: active) {
    ${ANCHOR} :is(button, select, a[href], [tabindex]):focus-visible,
    ${ANCHOR} [data-v2-e037-programmatic][tabindex="-1"]:focus-visible {
      outline: 3px solid Highlight;
      outline-offset: 2px;
      box-shadow: none;
    }
  }

  /* E037-09 : mouvement réduit (anneau statique) et contraste renforcé
     (anneau plus épais, couleur système à fort contraste). */
  @media (prefers-reduced-motion: reduce) {
    ${ANCHOR} :is(button, select, a[href], [tabindex]):focus-visible {
      transition: none;
      animation: none;
    }
  }
  ${ANCHOR}[data-v2-e037-motion="reduce"] :is(button, select, a[href], [tabindex]) {
    transition: none;
  }
  @media (prefers-contrast: more) {
    ${ANCHOR} :is(button, select, a[href], [tabindex]):focus-visible {
      outline-width: 4px;
      outline-color: CanvasText;
    }
  }

  /* E037-10 : lisibilité mobile du panneau, sans recouvrir la matrice. */
  @media (max-width: 620px) {
    .${CSS_ID} #${PANEL_ID} .e037-num { flex-basis: 52px; }
    .${CSS_ID} #${PANEL_ID} .e037-item { flex-wrap: wrap; gap: 2px 8px; }
  }
`;

/* Libellés des dix chantiers, affichés en texte réel dans le panneau. */
const CHANTIERS = [
  ['01', 'Anneau V2 à trois couches sur tous les contrôles (contour, liseré, halo)'],
  ['02', 'Boutons d’ère : anneau englobant et repère de ligne active conservé'],
  ['03', 'Cellules denses : anneau non rogné, halo doré ou neutre selon la cellule'],
  ['04', 'Sélecteurs de filtre : anneau externe, bordure interne, cible ≥ 36 px'],
  ['05', 'Réinitialisation : anneau sur la cible nominale, désactivés exclus'],
  ['06', 'Navigation précédent/suivant : anneau uniforme, désactivés exclus'],
  ['07', 'Cible de focus programmatique (tabindex="-1") : anneau en pointillé'],
  ['08', 'Repli forced-colors : anneau en couleur système, ombres neutralisées'],
  ['09', 'Mouvement réduit et contraste renforcé : anneau statique et épais'],
  ['10', 'Panneau de diagnostic et idempotence multi-rendus'],
];

let installCount = 0;
let focusSamples = 0;
let focusBound = false;
let refs = { panel: null, current: null, metric: null, reduced: false, root: null };

/* Repli local si ctx.el n'était pas fourni : mêmes garanties de texte sûr. */
function fallbackEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* E037-10 : garde d'existence pour toute ID préfixée points-v2-e037-.
 * La coque reconstruisant le stage, un nœud du rendu précédent est détaché
 * et n'est donc pas retrouvé par getElementById : on le déplace, jamais on ne
 * le clone, afin d'éviter doublons et IDs dupliqués. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function mark(node, suffix, value) {
  const attribute = `data-e037-${suffix}`;
  if (node && node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function plural(count, one, many) {
  return `${count} ${count > 1 ? many : one}`;
}

function describeFocus(target) {
  if (!(target instanceof Element)) return 'Focus courant : aucun contrôle actif.';
  const name = target.id ? `#${target.id}` : target.tagName.toLowerCase();
  const label = target.getAttribute('aria-label')
    || target.getAttribute('title')
    || (target.textContent || '').trim().slice(0, 40);
  const pressed = target.getAttribute('aria-pressed');
  const state = pressed !== null ? ` · aria-pressed=${pressed}` : '';
  return `Focus courant : ${name}${label ? ` — « ${label} »` : ''}${state} · anneau V2 applicable.`;
}

/* E037-05 / -06 : décompte en lecture seule. Les boutons disabled sont exclus
 * du total de cibles à anneau et comptés à part : l'E037-05/-06 leur refuse
 * l'anneau sans modifier leur attribut disabled. */
function countControls(root) {
  if (!root) return { total: 0, disabled: 0, programmatic: 0 };
  const focusables = nodes(root, 'button, select, a[href], [tabindex]:not([tabindex="-1"])');
  let total = 0;
  let disabled = 0;
  focusables.forEach((node) => {
    if (node.disabled) { disabled += 1; return; }
    total += 1;
  });
  const programmatic = nodes(root, '[tabindex="-1"]').length;
  return { total, disabled, programmatic };
}

/* E037-10 : rafraîchissement dédupliqué. Aucune écriture dans une région live,
 * aucun déplacement de focus, aucun gestionnaire de touche. */
function refresh() {
  const { panel, current, metric, reduced, root } = refs;
  if (!panel || !panel.isConnected) return;

  const active = document.activeElement;
  write(current, describeFocus(active));
  mark(panel, 'focus', active instanceof Element ? (active.id || active.tagName.toLowerCase()) : 'aucun');
  mark(panel, 'reduced', reduced ? '1' : '0');

  const counts = countControls(root);
  mark(panel, 'controls', String(counts.total));
  mark(panel, 'disabled', String(counts.disabled));
  mark(panel, 'programmatic', String(counts.programmatic));
  const sheets = document.querySelectorAll(`style[id="${CSS_ID}"]`).length;
  mark(panel, 'sheets', String(sheets));

  write(metric, `Installations : ${installCount} · changements de focus : ${focusSamples}`
    + ` · contrôles à anneau V2 : ${counts.total} (désactivés exclus : ${counts.disabled})`
    + ` · cibles programmatiques : ${counts.programmatic}`
    + ` · feuilles E037 V2 : ${sheets} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
}

/* E037-10 : un seul écouteur, observationnel. Il ne fait ni preventDefault,
 * ni stopPropagation, ni focus(), ni annonce live. */
function onFocusIn() {
  focusSamples += 1;
  refresh();
}

function install(ctx) {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const make = typeof ctx.el === 'function' ? ctx.el : fallbackEl;
  const layout = ctx.layout;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  /* Ancres CSS uniques : toutes les règles sont préfixées par cette classe.
   * L'attribut de données verrouille l'ancre de spécificité de l'E037-01. */
  if (!layout.classList.contains(CSS_ID)) layout.classList.add(CSS_ID);
  put(layout, 'data-points-v2-e037', '1');

  const matrix = layout.querySelector('.points-matrix') || layout;

  /* Exploitation de ctx.reducedMotion() : pilote l'attribut reflété par la
   * feuille, avec un repli CSS @media. Aucun mouvement n'est créé. */
  let reduced = false;
  try { reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false; }
  catch { reduced = false; }
  put(layout, 'data-v2-e037-motion', reduced ? 'reduce' : 'normal');

  /* Exploitation de ctx.viewId : trace stable et dérivée du contrat. */
  put(matrix, 'data-v2-e037-view', txt(ctx.viewId) || 'pointsv2');

  /* E037-02 — repère de ligne active lu sur .is-active, sans modifier cette
   * classe ni poser d'ARIA concurrent avec la passe V2 E004. */
  const rows = nodes(layout, '.points-grid .points-grid-row:not(.is-head)');
  const activeRow = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  rows.forEach((row) => {
    put(row, 'data-v2-e037-current', row === activeRow ? 'true' : 'false');
  });

  /* E037-03 — nature des cellules lue sur .has-points, jamais supposée. */
  nodes(layout, '.points-grid .points-cell').forEach((cell) => {
    put(cell, 'data-v2-e037-cell', cell.classList.contains('has-points') ? 'filled' : 'empty');
  });

  /* E037-07 — marquage des cibles de focus programmatique déjà présentes. */
  nodes(layout, '[tabindex="-1"]').forEach((target) => {
    put(target, 'data-v2-e037-programmatic', '1');
  });

  /* E037-10 — panneau local non modal, construit uniquement avec ctx.el. */
  const panel = ensureNode(make, PANEL_ID, 'section', 'e037-panel', matrix);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e037-title', 'Focus visible — contrôles des Points');
  title.id = TITLE_ID;
  const lede = make('p', 'e037-lede', 'Dix chantiers rendent le focus clavier visible sur chaque contrôle. Ce panneau décrit et mesure : il ne capte aucun focus, n’ajoute aucun raccourci et n’écrit dans aucune région live.');

  const list = make('ul', 'e037-list');
  list.id = LIST_ID;
  CHANTIERS.forEach(([num, label]) => {
    const item = make('li', 'e037-item');
    mark(item, num, '1');
    item.append(
      make('span', 'e037-num', `E037-${num}`),
      make('span', 'e037-label', label),
      make('span', 'e037-etat', 'actif')
    );
    list.appendChild(item);
  });

  const current = make('p', 'e037-current');
  current.id = CURRENT_ID;
  const metric = make('p', 'e037-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, list, current, metric);
  CHANTIERS.forEach(([num]) => mark(panel, num, '1'));

  put(layout, 'data-v2-e037-chantiers', String(CHANTIERS.length));
  put(layout, 'data-v2-e037-rows', String(rows.length));

  refs = { panel, current, metric, reduced, root: layout };
  refresh();

  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E037', (ctx) => {
  try {
    install(ctx);
  } catch {
    return;
  }
});
