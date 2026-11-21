import { register } from './registry.js';

/* Lentille CHRONOLOGIE E072 — vue CHRONOLOGIE : tri chronologique, ordre
 * inverse et bascule de sens de lecture (E072-01 … E072-10).
 *
 * Dix chantiers appliqués à chaque rendu de la vue par runEnhancements :
 *  01 mesurer l'ordre réellement rendu ; 02 tri croissant stable ;
 *  03 ordre décroissant ; 04 radiogroup à choix unique ; 05 sens de lecture
 *  horizontal indépendant ; 06 sélection et focus préservés ; 07 readout live
 *  non porté par la seule couleur ; 08 idempotence et gardes d'existence ;
 *  09 mobilité et mouvement réduit ; 10 non-collision avec E04/E05/E08/E39.
 *
 * Périmètre de lecture : src/views/chronology.js, registry.js, index.js,
 * styles.css. Aucun fichier partagé modifié. Aucune donnée historique inventée :
 * les années viennent de `data-year` (chronology.js:380) et sont reformatées
 * exactement comme `formatYear` (chronology.js:26-28). Aucun appel réseau,
 * aucune trace de débogage, aucune source d'aléa, aucune boucle d'animation
 * ni de minuterie propre à la lentille.
 */

const CSS_ID = 'chronology-e072';
const SCOPE = 'chronology-e072';
const REDUCED_ATTR = 'data-e072-reduced';

const PANEL_ID = 'e072-panel';
const TITLE_ID = 'e072-title';
const GROUP_ID = 'e072-group';
const ASC_ID = 'e072-order-asc';
const DESC_ID = 'e072-order-desc';
const DIR_ID = 'e072-direction';
const READOUT_ID = 'e072-readout';
const NOTE_ID = 'e072-note';

/* État de lecture local, conservé entre deux reconstructions complètes du DOM
 * opérées par la coque (shell.js:137), exactement comme `local.query` dans
 * chronology.js:16. Aucun nœud DOM n'est mémorisé ici. */
let order = 'asc'; /* 'asc' = ancien → récent, 'desc' = récent → ancien */
let rtl = false;   /* sens de lecture horizontal, bascule indépendante */

/* Feuille unique, injectée une seule fois par ctx.css / cssOnce
 * (registry.js:13-19). Tout est ciblé sous .chronology-e072 ou par ID préfixé. */
const CSS = `
.chronology-e072 #${PANEL_ID}{
  box-sizing:border-box;max-width:100%;margin:0 0 12px;padding:9px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);
}
.chronology-e072 #${TITLE_ID}{
  margin:0 0 6px;color:var(--gold);font-size:8px;font-weight:600;
  letter-spacing:.16em;text-transform:uppercase;
}
.chronology-e072 .e072-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.chronology-e072 #${GROUP_ID}{display:inline-flex;flex-wrap:wrap;gap:4px}
.chronology-e072 .e072-radio,
.chronology-e072 .e072-dir{
  min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;
  cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear;
}
.chronology-e072 .e072-radio[aria-checked="true"]{
  border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright);
}
.chronology-e072 .e072-dir[aria-pressed="true"]{
  border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright);
}
.chronology-e072 .e072-radio:hover,
.chronology-e072 .e072-dir:hover{border-color:var(--gold)}
.chronology-e072 .e072-radio:focus-visible,
.chronology-e072 .e072-dir:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e072 #${READOUT_ID}{
  margin:6px 0 0;color:var(--gold-bright);font-size:10px;font-weight:600;
  line-height:1.45;font-variant-numeric:tabular-nums;
}
.chronology-e072 #${NOTE_ID}{margin:4px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}
/* E072-05 : le sens de lecture inversé ne s'applique qu'au flux de la grille.
   Le texte des cartes reste de gauche à droite, donc le français reste lisible. */
.chronology-e072[data-e072-rtl="1"] #atlas-chrono-events{direction:rtl}
.chronology-e072[data-e072-rtl="1"] .event-card{direction:ltr;text-align:left}
@media (max-width:620px){
  .chronology-e072 #${PANEL_ID}{padding:8px}
  .chronology-e072 .e072-row{flex-direction:column;align-items:stretch}
  .chronology-e072 #${GROUP_ID}{width:100%}
  .chronology-e072 .e072-radio,
  .chronology-e072 .e072-dir{width:100%}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e072 .e072-radio,
  .chronology-e072 .e072-dir{transition:none}
}
.chronology-e072[${REDUCED_ATTR}="1"] .e072-radio,
.chronology-e072[${REDUCED_ATTR}="1"] .e072-dir{transition:none}`;

/* E072-01 : même formatage que chronology.js:26-28 (les années négatives sont
 * des années avant J.-C.), avec un repli explicite si l'attribut est illisible. */
function formatYear(year) {
  if (!Number.isFinite(year)) return 'année inconnue';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function currentLayout() {
  const panel = document.getElementById(PANEL_ID);
  const fromPanel = panel && typeof panel.closest === 'function'
    ? panel.closest('.chronology-layout') : null;
  if (fromPanel) return fromPanel;
  return document.querySelector('.chronology-layout') || null;
}

/* E072-02 / E072-03 : les repères sont lus depuis le DOM rendu. Le départage
 * par position d'origine rend le tri stable : deux repères d'une même année
 * gardent leur ordre relatif dans les deux sens. Aucune donnée n'est triée
 * dans le store : seul l'ordre des <li> change. Les écouteurs sont posés sur
 * le panneau courant, donc détruits avec lui au prochain rendu (E072-08). */
function sortedItems(list) {
  const entries = [];
  Array.prototype.forEach.call(list.children, (node, index) => {
    if (node.nodeType !== 1 || !node.hasAttribute('data-event-id')) return;
    const year = Number(node.getAttribute('data-year'));
    entries.push({
      node,
      year: Number.isFinite(year) ? year : 0,
      index,
    });
  });
  const sign = order === 'asc' ? 1 : -1;
  entries.sort((a, b) => {
    if (a.year !== b.year) return sign * (a.year - b.year);
    return a.index - b.index;
  });
  return entries;
}

/* E072-06 : appendChild déplace les nœuds existants — ils ne sont ni clonés
 * ni recréés. Les attributs `hidden` posés par E04, `aria-current` posé par la
 * vue (chronology.js:390) et les écouteurs des cartes survivent donc au tri.
 * On évite un déplacement inutile quand l'ordre est déjà le bon. */
function applyOrder(list, entries) {
  if (entries.length < 2 || entries.length !== list.children.length) return;
  let unchanged = true;
  for (let i = 0; i < entries.length; i += 1) {
    if (list.children[i] !== entries[i].node) { unchanged = false; break; }
  }
  if (unchanged) return;
  entries.forEach((entry) => list.appendChild(entry.node));
}

/* E072-07 : une seule région live locale, en texte réel. Elle n'annonce que
 * les changements de cette lentille, jamais la navigation (réservée à
 * #nav-c2a-live, chronology.js:119-138). Les compteurs sont recalculés depuis
 * le DOM : `hidden` est la propriété utilisée par E04.js:219. */
function updateReadout(entries) {
  const readout = document.getElementById(READOUT_ID);
  if (!readout) return;
  const total = entries.length;
  const shown = entries.filter((entry) => !entry.node.hidden).length;
  let range = '';
  if (total) {
    const years = entries.map((entry) => entry.year);
    range = ` · années de ${formatYear(Math.min.apply(null, years))}`
      + ` à ${formatYear(Math.max.apply(null, years))}`;
  }
  const label = order === 'asc' ? 'croissant (ancien → récent)' : 'décroissant (récent → ancien)';
  const sense = rtl ? 'droite → gauche' : 'gauche → droite';
  readout.textContent = `Ordre ${label} · sens de lecture ${sense}`
    + ` · ${total} repère(s) trié(s), ${shown} affiché(s)${range}.`;
}

/* E072-04 / E072-05 : aria-checked sur un radiogroup (choix unique),
 * aria-pressed uniquement sur la bascule indépendante de sens de lecture —
 * conformément à la règle rappelée par E08 (E08.js:186-188). */
function syncControls(layout) {
  const asc = document.getElementById(ASC_ID);
  const desc = document.getElementById(DESC_ID);
  const dir = document.getElementById(DIR_ID);
  if (asc) {
    const on = order === 'asc';
    asc.setAttribute('aria-checked', on ? 'true' : 'false');
    asc.tabIndex = on ? 0 : -1; /* tabindex itinérant : un seul arrêt de tab */
  }
  if (desc) {
    const on = order === 'desc';
    desc.setAttribute('aria-checked', on ? 'true' : 'false');
    desc.tabIndex = on ? 0 : -1;
  }
  if (dir) dir.setAttribute('aria-pressed', rtl ? 'true' : 'false');
  if (layout && layout.dataset) {
    layout.dataset.e072Order = order;
    layout.dataset.e072Rtl = rtl ? '1' : '0';
  }
}

function applyAll(layout) {
  const target = layout || currentLayout();
  syncControls(target);
  const scope = target && typeof target.querySelector === 'function' ? target : document;
  const list = scope.querySelector('#atlas-chrono-events') || document.getElementById('atlas-chrono-events');
  if (!list) return;
  const entries = sortedItems(list);
  applyOrder(list, entries);
  updateReadout(entries);
}

function setOrder(next) {
  if (next !== 'asc' && next !== 'desc') return;
  if (next === order) return;
  order = next;
  applyAll(currentLayout());
}

function buildPanel(ctx) {
  const panel = ctx.el('section', 'e072-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'e072-title', 'Ordre de lecture');
  title.id = TITLE_ID;

  const row = ctx.el('div', 'e072-row');

  const group = ctx.el('div', 'e072-group');
  group.id = GROUP_ID;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Ordre chronologique des repères');

  const asc = ctx.el('button', 'e072-radio', 'Croissant · ancien → récent');
  asc.type = 'button';
  asc.id = ASC_ID;
  asc.setAttribute('role', 'radio');
  asc.setAttribute('aria-checked', order === 'asc' ? 'true' : 'false');
  asc.tabIndex = order === 'asc' ? 0 : -1;

  const desc = ctx.el('button', 'e072-radio', 'Décroissant · récent → ancien');
  desc.type = 'button';
  desc.id = DESC_ID;
  desc.setAttribute('role', 'radio');
  desc.setAttribute('aria-checked', order === 'desc' ? 'true' : 'false');
  desc.tabIndex = order === 'desc' ? 0 : -1;
  group.append(asc, desc);

  const dir = ctx.el('button', 'e072-dir', 'Sens de lecture : droite → gauche');
  dir.type = 'button';
  dir.id = DIR_ID;
  dir.setAttribute('aria-pressed', rtl ? 'true' : 'false');
  dir.setAttribute('aria-controls', 'atlas-chrono-events');

  const readout = ctx.el('p', 'e072-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E072-06 : note textuelle sur ce que la lentille ne modifie pas. */
  const note = ctx.el('p', 'e072-note',
    'Le tri change l’ordre d’affichage des cartes, pas la sélection : les boutons « repère précédent / suivant » de la vue suivent toujours le rang du repère. Le sens de lecture inverse la disposition, pas le texte des cartes.');
  note.id = NOTE_ID;

  row.append(group, dir);
  panel.append(title, row, readout, note);
  return panel;
}

/* E072-06 : le focus reste sur le contrôle actionné après le réordonnancement.
 * E072-04 : les flèches parcourent le radiogroup comme le prévoit le rôle radio.
 * E072-10 : Entrée/Espace sont laissés au clic natif du <button>, donc aucune
 * double bascule (E05 ne lie Home/End qu'à la liste, aux ères et aux puces). */
function wirePanel(panel) {
  const asc = document.getElementById(ASC_ID);
  const desc = document.getElementById(DESC_ID);
  const dir = document.getElementById(DIR_ID);

  [[asc, 'asc'], [desc, 'desc']].forEach((entry) => {
    const node = entry[0];
    const value = entry[1];
    if (!node) return;
    node.addEventListener('click', () => { setOrder(value); });
    node.addEventListener('keydown', (event) => {
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(event.key) < 0) return;
      event.preventDefault();
      const next = value === 'asc' ? 'desc' : 'asc';
      setOrder(next);
      const target = document.getElementById(next === 'asc' ? ASC_ID : DESC_ID);
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
    });
  });

  if (dir) {
    dir.addEventListener('click', () => {
      rtl = !rtl;
      applyAll(currentLayout());
    });
  }

  if (panel && panel.dataset) panel.dataset.e072Wired = '1';
}

register('E072', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function') return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const layout = ctx.layout || currentLayout();
  if (!layout || typeof layout.querySelector !== 'function') return;
  const list = layout.querySelector('#atlas-chrono-events')
    || document.getElementById('atlas-chrono-events');
  if (!list) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  /* E072-08 / E072-09 : une seule portée, un seul jeu d'attributs, une seule
     feuille. Le re-rendre recrée le panneau avec la coque, sans doublon. */
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset.e072 = '1';
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  if (!document.getElementById(PANEL_ID)) {
    const panel = buildPanel(ctx);
    const tools = layout.querySelector('#atlas-chrono-tools');
    if (tools && tools.parentNode) {
      tools.parentNode.insertBefore(panel, tools.nextElementSibling);
    } else if (list.parentNode) {
      list.parentNode.insertBefore(panel, list);
    } else if (typeof layout.insertBefore === 'function' && layout.firstChild) {
      layout.insertBefore(panel, layout.firstChild);
    } else {
      layout.appendChild(panel);
    }
    wirePanel(panel);
  }

  applyAll(layout);
});
