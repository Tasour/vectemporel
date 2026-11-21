import { register } from './registry.js';

/* Lentille E037 — passe V2, domaine D : focus visible renforcé sur tous les
 * contrôles de la vue Chronologie.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E037.md — chantiers E037-01 à
 * E037-10. Fichier possédé : src/views/chronology/v2/E037.js uniquement.
 * Lectures seules : src/views/chronology.js, src/views/chronology/v2/registry.js,
 * src/views/chronology/v2/index.js, styles.css, src/platform/keyboard.js,
 * src/views/chronology/E049.js et son rapport. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, ctx.css(id, règles), ctx.el(),
 * ctx.reducedMotion(). Une seule feuille CSS : ctx.css('chronology-v2-e037', …).
 * Un seul register('E037', install). Tous les IDs DOM créés sont préfixés
 * 'chronology-v2-e037-' et protégés par ensureNode (idempotence multi-rendus).
 *
 * Invariants :
 * - aucun vol de focus, aucun preventDefault, aucun gestionnaire de touche ;
 * - aucun timer, aucune boucle d'animation, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut ;
 * - un seul écouteur documentaire focusin, purement observationnel, sous garde ;
 * - le panneau est un bloc en flux normal : il n'ajoute aucun arrêt Tab.
 */

const CSS_ID = 'chronology-v2-e037';
const PANEL_ID = 'chronology-v2-e037-panel';
const TITLE_ID = 'chronology-v2-e037-title';
const LIST_ID = 'chronology-v2-e037-list';
const CURRENT_ID = 'chronology-v2-e037-current';
const METRIC_ID = 'chronology-v2-e037-metric';
const MAIN_ID = 'atlas-chrono-main';
const LAYOUT_CLASS = 'chronology-layout';

/* E037-01 à E037-10 : une seule feuille, injectée une fois par ctx.css.
   Chaque chantier possède son bloc CSS dédié, commenté et repérable, plus une
   marque data-e037-NN sur le panneau et sur sa ligne de liste. */
const CSS = `
  /* E037-10 : panneau de diagnostic, bloc en flux, non modal, non tabulable. */
  #${PANEL_ID} {
    margin: 14px 0 2px; padding: 10px 12px 11px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e037-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
  }
  #${PANEL_ID} .e037-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e037-list { margin: 0 0 7px; padding: 0; list-style: none; }
  #${PANEL_ID} .e037-item { display: flex; gap: 8px; margin: 0 0 3px; }
  #${PANEL_ID} .e037-num { flex: 0 0 62px; color: var(--gold-bright); }
  #${PANEL_ID} .e037-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e037-état { color: var(--gold-bright); }
  #${PANEL_ID} .e037-current { margin: 5px 0 0; color: var(--gold-bright); }
  #${PANEL_ID} .e037-metric { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }

  /* E037-01 : anneau renforcé générique (outline + halo), réservé au clavier
     par :focus-visible. :is() couvre boutons, liens, champs et tabulables sans
     modifier aucun tabindex existant. */
  .${LAYOUT_CLASS} :is(button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])):focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--bg), 0 0 0 5px rgba(230,185,111,.32);
  }

  /* E037-02 : bandes d'ère — l'anneau englobe toute la bande tandis que le
     trait d'ère (--era) reste lisible, y compris sous aria-current. */
  .${LAYOUT_CLASS} .era-band.atlas-chrono-band:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 2px;
    box-shadow: inset 0 -3px var(--era), 0 0 0 4px rgba(230,185,111,.30);
  }

  /* E037-03 : cartes de repère — anneau non rogné, image et texte inclus. */
  .${LAYOUT_CLASS} .event-card:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    overflow: visible;
    box-shadow: 0 0 0 1px var(--bg), 0 0 0 6px rgba(230,185,111,.28);
  }

  /* E037-04 : puces de filtre — anneau sur cible réduite, état aria-pressed
     porté par l'attribut et non par la seule couleur. */
  .${LAYOUT_CLASS} .atlas-chrono-tag:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 2px;
    box-shadow: 0 0 0 2px var(--bg);
  }

  /* E037-05 : champ de recherche — anneau externe et bordure interne, sans
     ombre qui masquerait le texte saisi ni le placeholder. */
  .${LAYOUT_CLASS} #atlas-chrono-search:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 2px;
    border-color: var(--gold-bright);
    box-shadow: none;
  }

  /* E037-06 : actions de l'aside, retour et réinitialisation ; les boutons
     désactivés ne reçoivent aucun anneau afin de ne pas suggérer d'action. */
  .${LAYOUT_CLASS} .aside-actions button:focus-visible,
  .${LAYOUT_CLASS} #nav-c2a-back:focus-visible,
  .${LAYOUT_CLASS} #nav-c2a-empty-filter button:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--bg);
  }
  .${LAYOUT_CLASS} button:disabled:focus-visible { outline: none; box-shadow: none; }

  /* E037-07 : cible de focus programmatique (titre du repère, tabindex=-1) —
     pointillé distinctif, sans toucher au tabindex ni au data-fk de la vue. */
  .${LAYOUT_CLASS} [data-fk][tabindex="-1"]:focus-visible {
    outline: 3px dashed var(--gold-bright);
    outline-offset: 4px;
  }

  /* E037-08 : repli forced-colors — couleur système, jamais la teinte du thème. */
  @media (forced-colors: active) {
    .${LAYOUT_CLASS} :is(button, a[href], input, select, textarea, [tabindex]):focus-visible,
    .${LAYOUT_CLASS} [data-fk][tabindex="-1"]:focus-visible {
      outline: 3px solid Highlight;
      outline-offset: 2px;
      box-shadow: none;
    }
  }

  /* E037-09 : mouvement réduit (anneau statique) et contraste renforcé
     (anneau plus épais, couleur système à fort contraste). */
  @media (prefers-reduced-motion: reduce) {
    .${LAYOUT_CLASS} :is(button, a[href], input, select, textarea, [tabindex]):focus-visible {
      transition: none !important;
      animation: none !important;
    }
  }
  @media (prefers-contrast: more) {
    .${LAYOUT_CLASS} :is(button, a[href], input, select, textarea, [tabindex]):focus-visible {
      outline-width: 4px;
      outline-color: CanvasText;
    }
  }

  /* E037-10 : lisibilité mobile du panneau, sans recouvrir la frise. */
  @media (max-width: 620px) {
    #${PANEL_ID} .e037-num { flex-basis: 52px; }
    #${PANEL_ID} .e037-item { flex-wrap: wrap; gap: 2px 8px; }
  }
`;

/* Libellés des dix chantiers, affichés en texte réel dans le panneau. */
const CHANTIERS = [
  ['01', 'Anneau renforcé sur tous les contrôles (outline + halo)'],
  ['02', 'Bandes d’ère : anneau englobant et marque d’ère conservée'],
  ['03', 'Cartes de repère : anneau non rogné, image incluse'],
  ['04', 'Puces de filtre : anneau sur cible réduite, aria-pressed intact'],
  ['05', 'Champ de recherche : anneau externe et bordure interne'],
  ['06', 'Actions : retour, précédent/suivant, réinitialisation ; désactivés exclus'],
  ['07', 'Cible de focus programmatique (titre du repère) : anneau en pointillé'],
  ['08', 'Repli forced-colors : anneau en couleur système'],
  ['09', 'Mouvement réduit et contraste renforcé : anneau statique et épais'],
  ['10', 'Panneau de diagnostic et idempotence multi-rendus'],
];

let installCount = 0;
let focusSamples = 0;
let focusBound = false;
let refs = { panel: null, current: null, metric: null, reduced: false, root: null };

/* repli local si ctx.el n'était pas fourni : mêmes garanties de texte sûr. */
function fallbackEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* E037-10 : garde d'existence pour toute ID préfixée chronology-v2-e037-.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la
   coque reconstruisant le stage, un nœud de la rendu précédente est détaché
   et n'est donc pas retrouvé par getElementById. */
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

function describeFocus(target) {
  if (!(target instanceof Element)) return 'Focus courant : aucun contrôle actif.';
  const name = target.id ? `#${target.id}` : target.tagName.toLowerCase();
  const label = target.getAttribute('aria-label')
    || target.getAttribute('title')
    || (target.textContent || '').trim().slice(0, 40);
  const pressed = target.getAttribute('aria-pressed');
  const state = pressed !== null ? ` · aria-pressed=${pressed}` : '';
  return `Focus courant : ${name}${label ? ` — « ${label} »` : ''}${state} · anneau renforcé applicable.`;
}

/* E037-06 et E037-10 : décompte en lecture seule des contrôles concernés.
   Les boutons disabled sont exclus : l'E037-06 leur refuse l'anneau. */
function countControls(root) {
  if (!root) return { total: 0, disabled: 0 };
  const nodes = root.querySelectorAll(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [data-fk][tabindex="-1"]'
  );
  let total = 0;
  let disabled = 0;
  nodes.forEach((node) => {
    if (node.disabled) { disabled += 1; return; }
    total += 1;
  });
  return { total, disabled };
}

/* E037-10 : rafraîchissement dédupliqué. Aucune écriture dans une région live,
   aucun déplacement de focus, aucun gestionnaire de touche. */
function refresh() {
  const { panel, current, metric, reduced, root } = refs;
  if (!panel || !panel.isConnected) return;

  const active = document.activeElement;
  write(current, describeFocus(active));
  mark(panel, 'focus', active instanceof Element ? (active.id || active.tagName.toLowerCase()) : 'aucun');
  mark(panel, 'reduced', reduced ? '1' : '0');

  const counts = countControls(root);
  mark(panel, 'controls', String(counts.total));
  const sheets = document.querySelectorAll(`style[id="${CSS_ID}"]`).length;
  mark(panel, 'sheets', String(sheets));

  write(metric, `Installations : ${installCount} · changements de focus : ${focusSamples}`
    + ` · contrôles à anneau renforcé : ${counts.total} (désactivés exclus : ${counts.disabled})`
    + ` · feuilles E037 : ${sheets} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
}

/* E037-10 : un seul écouteur, observationnel. Il ne fait ni preventDefault,
   ni stopPropagation, ni focus(), ni annonce live. */
function onFocusIn() {
  focusSamples += 1;
  refresh();
}

function install(ctx) {
  const make = typeof ctx.el === 'function' ? ctx.el : fallbackEl;
  if (!ctx || !ctx.layout) return;

  installCount += 1;
  ctx.css('chronology-v2-e037', CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e037-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e037-title', 'Focus visible — contrôles de la Chronologie');
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
      make('span', 'e037-état', 'actif')
    );
    list.appendChild(item);
  });

  const current = make('p', 'e037-current');
  current.id = CURRENT_ID;
  const metric = make('p', 'e037-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, list, current, metric);
  CHANTIERS.forEach(([num]) => mark(panel, num, '1'));

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, current, metric, reduced, root: ctx.layout };
  refresh();

  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E037', install);
