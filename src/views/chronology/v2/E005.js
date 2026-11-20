import { register } from './registry.js';

/* Lentille E005 (passe V2) — A. Frise & ères : densité des cartes et mesure
 * de lecture. Dix chantiers E005-01 à E005-10, tous sans chevauchement avec
 * les autres lentilles : ce module ne touche ni aux filtres, ni au détail, ni
 * au clavier, ni aux annonces live, ni aux données.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E005.md.
 * Un seul greffon register('E005', install), une seule feuille CSS
 * ctx.css('chronology-v2-e005', CSS), des IDs tous préfixés
 * 'chronology-v2-e005-', des gardes d'existence pour chaque nœud.
 *
 * Contrat : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css, ctx.el, ctx.reducedMotion. Aucun console.*, aucun fetch/XHR,
 * aucun import distant, aucun Math.random, aucun innerHTML, aucun timer,
 * aucune boucle d'animation, aucun aléa, aucun réseau.
 *
 * Invariants de non-interférence : le panneau est un bloc en flux normal en
 * fin de colonne (jamais modale, jamais superposé, jamais tabulable) ; les
 * boutons de densité sont des <input type="radio"> natifs dans un <fieldset>
 * (le routeur ignore les contrôles de formulaire) ; aucune touche n'est
 * interceptée, aucun focus n'est volé, aucune région live n'est ajoutée.
 */

const CSS_ID = 'chronology-v2-e005';

const PANEL_ID = 'chronology-v2-e005-panel';
const TITLE_ID = 'chronology-v2-e005-title';
const INTRO_ID = 'chronology-v2-e005-intro';
const FIELDSET_ID = 'chronology-v2-e005-density-fieldset';
const LEGEND_ID = 'chronology-v2-e005-density-legend';
const RADIO_AIR_ID = 'chronology-v2-e005-density-air';
const RADIO_COMPACT_ID = 'chronology-v2-e005-density-compact';
const LABEL_AIR_ID = 'chronology-v2-e005-label-air';
const LABEL_COMPACT_ID = 'chronology-v2-e005-label-compact';
const MEASURE_ID = 'chronology-v2-e005-measure';
const COLUMNS_ID = 'chronology-v2-e005-columns';
const OVERFLOW_ID = 'chronology-v2-e005-overflow';
const STATUS_ID = 'chronology-v2-e005-status';

const MAIN_ID = 'atlas-chrono-main';
const LIST_ID = 'atlas-chrono-events';

/* E005-01, E005-02, E005-03, E005-04, E005-05, E005-06, E005-07, E005-09 :
 * une seule feuille, injectée une seule fois. Toutes les règles de densité
 * sont portées par l'attribut data-e005-density posé sur #atlas-chrono-main ;
 * retirer l'attribut restaure strictement la mise en page d'origine. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e005-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
  }
  #${PANEL_ID} .e005-intro { margin: 0 0 8px; color: var(--muted); }
  #${FIELDSET_ID} {
    margin: 0 0 8px; padding: 7px 9px 8px;
    border: 1px solid var(--line); border-radius: 8px;
  }
  #${LEGEND_ID} { padding: 0 5px; color: var(--gold); font-size: 9px; font-weight: 600; }
  .e005-choice { display: inline-flex; align-items: center; gap: 6px; margin: 2px 12px 0 0; }
  .e005-choice input {
    width: 16px; height: 16px; margin: 0; accent-color: var(--gold); cursor: pointer;
  }
  .e005-choice label { min-height: 24px; color: var(--ink-soft); cursor: pointer; }
  .e005-choice input:checked + label { color: var(--gold-bright); font-weight: 600; }
  .e005-choice input:focus-visible + label { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  #${PANEL_ID} .e005-measure,
  #${PANEL_ID} .e005-columns,
  #${PANEL_ID} .e005-overflow,
  #${PANEL_ID} .e005-status { margin: 5px 0 0; }
  #${PANEL_ID} .e005-measure,
  #${PANEL_ID} .e005-columns { color: var(--muted); }
  #${PANEL_ID} .e005-overflow { color: var(--ink-soft); }
  #${PANEL_ID} .e005-status { color: var(--muted-2); font-size: 9px; }

  /* E005-02 : plafond de colonne — une carte ne dépasse jamais ~20 rem,
     soit une mesure de lecture compatible avec 60–75 caractères. */
  #${MAIN_ID}[data-e005-density] .event-list.atlas-chrono-events {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)) !important;
  }
  /* E005-07 : respiration réglable entre cartes. */
  #${MAIN_ID}[data-e005-density="air"] .event-list.atlas-chrono-events { gap: 14px !important; }
  #${MAIN_ID}[data-e005-density="compact"] .event-list.atlas-chrono-events { gap: 8px !important; }
  /* E005-06 : plus de hauteur fixe ni de rotation du contenu : la carte
     grandit avec son texte, le compteur de troncature doit rester à zéro. */
  #${MAIN_ID}[data-e005-density] .event-card {
    overflow: visible !important;
  }
  #${MAIN_ID}[data-e005-density="air"] .event-card {
    min-height: 0 !important; padding-bottom: 12px !important;
  }
  #${MAIN_ID}[data-e005-density="compact"] .event-card {
    min-height: 118px !important; padding-bottom: 8px !important;
  }
  /* E005-05 : la hauteur d'image suit la densité, jamais le contraire. */
  #${MAIN_ID}[data-e005-density="air"] .event-card img { height: 92px !important; }
  #${MAIN_ID}[data-e005-density="compact"] .event-card img { height: 56px !important; }
  /* E005-04 : équilibrage des titres et césure contrôlée. */
  #${MAIN_ID}[data-e005-density] .event-card strong {
    text-wrap: balance !important;
    line-height: 1.25 !important;
    hyphens: auto;
    overflow-wrap: anywhere;
  }
  /* E005-03 : le sous-titre quitte le 9 px d'origine pour une lecture
     soutenue ; la mesure reste plafonnée en caractères. */
  #${MAIN_ID}[data-e005-density="air"] .event-card .event-subtitle {
    font-size: 11px !important; line-height: 1.45 !important;
    max-width: 68ch; text-wrap: pretty;
  }
  #${MAIN_ID}[data-e005-density="compact"] .event-card .event-subtitle {
    font-size: 10px !important; line-height: 1.35 !important;
    max-width: 68ch; text-wrap: pretty;
  }
  /* E005-09 : repli documenté en écran étroit, sans débordement. */
  @media (max-width: 860px) {
    #${MAIN_ID}[data-e005-density] .event-list.atlas-chrono-events {
      grid-template-columns: 1fr !important;
    }
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e005-choice { display: flex; margin-right: 0; }
    #${PANEL_ID} { padding: 9px 10px 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${FIELDSET_ID} { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${FIELDSET_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e005-title, #${LEGEND_ID}, #${PANEL_ID} .e005-status { color: CanvasText; }
  }
`;

/* E005-01 : deux densités, jamais trois états ambigus. Valeur par défaut
   « aérée » ; conservée en mémoire de module entre deux rendus. */
const DENSITY_AIR = 'air';
const DENSITY_COMPACT = 'compact';
let density = DENSITY_AIR;
let installCount = 0;
let changeBound = false;

/* E005-10 : garde d'existence. La coque reconstruisant #app, un nœud du rendu
   précédent est détaché : getElementById ne le retrouve pas et un neuf est
   créé. Si le nœud existe encore, il est réutilisé et déplacé, jamais cloné. */
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

function setData(node, key, value) {
  const attribute = `data-e005-${key}`;
  if (node && node.getAttribute(attribute) !== String(value)) node.setAttribute(attribute, String(value));
}

/* E005-02, E005-03, E005-06, E005-08 : mesures en lecture seule du DOM réel.
   Le facteur 0,52 est une approximation typographique (largeur moyenne d'un
   glyphe latin rapportée à la taille de police) ; le résultat est une
   estimation affichée comme telle, jamais une donnée inventée. */
function measureCards(panel) {
  const list = document.getElementById(LIST_ID);
  const style = list ? window.getComputedStyle(list) : null;
  const template = style ? style.gridTemplateColumns : '';
  const columns = template && template !== 'none' ? template.split(/\s+/).filter(Boolean) : [];
  const columnPx = columns.length ? (Number.parseFloat(columns[0]) || 0) : 0;
  const gapPx = style ? (Number.parseFloat(style.columnGap) || 0) : 0;

  const sample = list ? list.querySelector('.event-subtitle') : null;
  const fontPx = sample ? (Number.parseFloat(window.getComputedStyle(sample).fontSize) || 11) : 11;
  const chars = columnPx > 0 ? Math.round(columnPx / (fontPx * 0.52)) : 0;

  let clipped = 0;
  const cards = list ? list.querySelectorAll('.event-card') : [];
  cards.forEach((card) => {
    if (card.scrollHeight > card.clientHeight + 1) clipped += 1;
  });

  const responsive = window.matchMedia('(max-width: 860px)').matches;
  setData(panel, 'density', density);
  setData(panel, 'columns', columns.length);
  setData(panel, 'chars', chars);
  setData(panel, 'clipped', clipped);
  setData(panel, 'responsive', responsive ? '1' : '0');
  setData(panel, 'installs', installCount);

  return { columnPx, columns: columns.length, gapPx, fontPx, chars, clipped, cards: cards.length, responsive };
}

function refresh(refs, viewId, reduced) {
  const { panel, measure, columns, overflow, status } = refs;
  if (!panel || !panel.isConnected) return;
  const m = measureCards(panel);

  write(measure, `Mesure estimée : colonne de ${Math.round(m.columnPx)} px, soit environ ${m.chars} caractères par ligne au corps ${Math.round(m.fontPx)} px (référence de lisibilité : 60–75).`);
  write(columns, `Grille : ${m.columns} colonne(s) · écart ${Math.round(m.gapPx)} px · plafond de colonne 20 rem (320 px) · repli étroit ${m.responsive ? 'actif' : 'inactif'}.`);
  write(overflow, `Cartes tronquées : ${m.clipped} sur ${m.cards} · la hauteur s'adapte au contenu dans les deux densités.`);
  write(status, `Densité ${density === DENSITY_AIR ? 'aérée' : 'compacte'} · vue ${viewId} · mouvement réduit : ${reduced ? 'oui' : 'non'} · installations : ${installCount}.`);
}

/* E005-01 : un seul écouteur documentaire, enregistré sous garde de module.
   Les <input type="radio"> natifs fournissent le clavier (flèches, Tab,
   Espace) : aucun gestionnaire de touche n'est installé ici. */
function onDensityChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.id !== RADIO_AIR_ID && target.id !== RADIO_COMPACT_ID) return;
  density = target.id === RADIO_AIR_ID ? DENSITY_AIR : DENSITY_COMPACT;
  const main = document.getElementById(MAIN_ID);
  if (main) setData(main, 'density', density);
  if (refs.panel && refs.panel.isConnected) refresh(refs, refs.viewId, refs.reduced);
}

let refs = { panel: null, measure: null, columns: null, overflow: null, status: null, viewId: 'chronologyv2', reduced: false };

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const main = document.getElementById(MAIN_ID);
  if (main) setData(main, 'density', density);

  const panel = ensureNode(make, PANEL_ID, 'section', 'e005-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e005-title', 'Densité des cartes et mesure de lecture');
  title.id = TITLE_ID;

  const intro = make('p', 'e005-intro', 'Deux densités au choix pour la frise : « aérée » privilégie la respiration, « compacte » le nombre de repères visibles. Les mesures ci-dessous sont relevées dans la grille réelle ; ce panneau ne modifie ni les filtres ni le détail.');
  intro.id = INTRO_ID;

  const fieldset = make('fieldset', 'e005-fieldset');
  fieldset.id = FIELDSET_ID;
  const legend = make('legend', '', 'Densité des cartes');
  legend.id = LEGEND_ID;

  const choiceAir = make('span', 'e005-choice');
  const radioAir = make('input');
  radioAir.type = 'radio';
  radioAir.id = RADIO_AIR_ID;
  radioAir.name = 'chronology-v2-e005-density';
  radioAir.value = DENSITY_AIR;
  radioAir.checked = density === DENSITY_AIR;
  const labelAir = make('label', '', 'Aérée');
  labelAir.id = LABEL_AIR_ID;
  labelAir.setAttribute('for', RADIO_AIR_ID);
  choiceAir.append(radioAir, labelAir);

  const choiceCompact = make('span', 'e005-choice');
  const radioCompact = make('input');
  radioCompact.type = 'radio';
  radioCompact.id = RADIO_COMPACT_ID;
  radioCompact.name = 'chronology-v2-e005-density';
  radioCompact.value = DENSITY_COMPACT;
  radioCompact.checked = density === DENSITY_COMPACT;
  const labelCompact = make('label', '', 'Compacte');
  labelCompact.id = LABEL_COMPACT_ID;
  labelCompact.setAttribute('for', RADIO_COMPACT_ID);
  choiceCompact.append(radioCompact, labelCompact);

  fieldset.replaceChildren(legend, choiceAir, choiceCompact);

  const measure = make('p', 'e005-measure');
  measure.id = MEASURE_ID;
  const columns = make('p', 'e005-columns');
  columns.id = COLUMNS_ID;
  const overflow = make('p', 'e005-overflow');
  overflow.id = OVERFLOW_ID;
  const status = make('p', 'e005-status');
  status.id = STATUS_ID;

  panel.replaceChildren(title, intro, fieldset, measure, columns, overflow, status);

  const viewId = typeof ctx.viewId === 'string' ? ctx.viewId : 'chronologyv2';
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  setData(panel, 'reduced', reduced ? '1' : '0');

  refs = { panel, measure, columns, overflow, status, viewId, reduced };
  refresh(refs, viewId, reduced);

  if (!changeBound) {
    document.addEventListener('change', onDensityChange, true);
    changeBound = true;
  }
}

register('E005', install);
