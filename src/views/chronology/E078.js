import { register } from './registry.js';

/* Lentille E078 — structure de document, niveaux de titres et plan accessible.
 *
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css. Un seul register('E078'), un seul
 * css('chronology-e078', …), aucun fichier partagé modifié. Aucun appel réseau,
 * aucune source d'aléa, aucun affichage dans la console, aucune boucle
 * d'animation propre au greffon.
 *
 * Les dix chantiers E078-01..E078-10 sont tous implémentés ici. Le plan est
 * construit depuis les titres réellement présents dans le DOM : aucune donnée
 * n'est inventée, aucun sélecteur de test de la vue n'est renommé.
 */

const LIVE_ID = 'e078-live';
const BTN_ID = 'e078-outline-btn';
const PANEL_ID = 'e078-outline-panel';
const LIST_ID = 'e078-outline-list';
const NOTE_ID = 'e078-outline-note';
const BAR_ID = 'e078-outline-bar';
const H2 = {
  situation: 'e078-h2-situation',
  eras: 'e078-h2-eras',
  reperes: 'e078-h2-reperes',
  fiche: 'e078-h2-fiche',
};

let expanded = false;
let currentLayout = null;

const CSS = `
  .e078-sr-only {
    position: absolute !important; width: 1px; height: 1px; padding: 0;
    margin: -1px; overflow: hidden; clip: rect(0 0 0 0);
    white-space: nowrap; border: 0;
  }
  .chronology-layout .e078-bar {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 8px;
  }
  .chronology-layout .e078-toggle {
    min-height: 36px; padding: 6px 10px; border: 1px solid var(--line);
    border-radius: 8px; background: transparent; color: var(--ink-soft);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  .chronology-layout .e078-toggle[aria-expanded="true"] {
    border-color: var(--gold); color: var(--gold-bright);
    background: rgba(230, 185, 111, .1);
  }
  .chronology-layout .e078-outline-note {
    color: var(--muted); font-size: 9px; font-variant-numeric: tabular-nums;
  }
  .chronology-layout .e078-panel {
    margin: 0 0 10px; padding: 8px 10px; border: 1px solid var(--line);
    border-radius: 8px; background: var(--surface-2);
  }
  .chronology-layout .e078-panel[hidden] { display: none; }
  .chronology-layout .e078-outline-list { margin: 0; padding: 0; list-style: none; }
  .chronology-layout .e078-outline-item + .e078-outline-item { margin-top: 4px; }
  .chronology-layout .e078-outline-item[data-e078-level="2"] { padding-left: 10px; }
  .chronology-layout .e078-outline-item[data-e078-level="3"] { padding-left: 20px; }
  .chronology-layout .e078-outline-item[data-e078-level="4"] { padding-left: 30px; }
  .chronology-layout .e078-outline-link {
    display: flex; align-items: baseline; width: 100%; min-height: 30px;
    padding: 4px 8px; border: 1px solid transparent; border-radius: 6px;
    background: transparent; color: var(--ink-soft);
    font: inherit; font-size: 10px; text-align: left; cursor: pointer;
  }
  .chronology-layout .e078-outline-link:hover {
    border-color: var(--line); color: var(--ink);
  }
  .chronology-layout .e078-outline-level {
    margin-right: 8px; color: var(--gold); font-size: 9px; font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .chronology-layout .e078-outline-label { min-width: 0; }
  .chronology-layout .e078-toggle:focus-visible,
  .chronology-layout .e078-outline-link:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    .chronology-layout .e078-bar { flex-direction: column; align-items: flex-start; }
    .chronology-layout .e078-toggle { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .chronology-layout .e078-toggle,
    .chronology-layout .e078-outline-link { transition: none !important; }
  }
  .chronology-layout[data-e078-reduced="1"] .e078-toggle,
  .chronology-layout[data-e078-reduced="1"] .e078-outline-link {
    transition: none !important;
  }
`;

function byId(id) {
  return document.getElementById(id) || null;
}

/* E078-06 : réutilise un nœud existant (ou le recrée) sans jamais dupliquer
   d'identifiant. Les nœuds de la lentille sont tous préfixés « e078 ». */
function ensureNode(parent, id, tag, className, text, el) {
  if (!parent || typeof parent.querySelector !== 'function') return null;
  let node = byId(id);
  if (node && String(node.tagName).toLowerCase() !== String(tag).toLowerCase()) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node = null;
  }
  if (!node) {
    node = el(tag, className, text);
    node.id = id;
  }
  return node;
}

function place(node, parent, before) {
  if (!node || !parent) return;
  const anchor = before && before.parentNode === parent ? before : null;
  if (anchor) parent.insertBefore(node, anchor);
  else if (node.parentNode !== parent) parent.appendChild(node);
}

/* E078-01 / E078-02 / E078-03 : titre de section réel, en texte, inséré avant
   la région qu'il nomme. Le texte est toujours réaffirmé (re-render safe). */
function ensureHeading(parent, id, level, text, before, el) {
  const node = ensureNode(parent, id, level, 'e078-sr-only', text, el);
  if (!node) return null;
  if (node.textContent !== text) node.textContent = text;
  place(node, parent, before);
  return node;
}

function countryName(layout, h1) {
  const raw = h1 ? (h1.textContent || '') : '';
  const cleaned = raw.replace(/^Chronologie\s*[·\-–]\s*/, '').trim();
  return cleaned || layout.dataset.countryId || 'ce pays';
}

/* E078-10 : région live unique, hors de #app pour survivre au innerHTML de la
   coque. Annonce uniquement sur action explicite (aucun bavardage). */
function ensureLive(el) {
  let node = byId(LIVE_ID);
  if (!node) {
    node = el('p', 'e078-sr-only');
    node.id = LIVE_ID;
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    document.body.appendChild(node);
  }
  return node;
}

function say(message) {
  const node = ensureLive(currentEl);
  if (node) node.textContent = message;
}

let currentEl = null;

/* E078-05 : résout chaque référence ARIA vers un identifiant réellement
   présent ; retire les références mortes et publie le compte dans le DOM. */
function auditAria(layout) {
  const attrs = ['aria-labelledby', 'aria-controls', 'aria-describedby'];
  const nodes = [layout].concat(Array.from(layout.querySelectorAll('[aria-labelledby],[aria-controls],[aria-describedby]')));
  let broken = 0;
  nodes.forEach((node) => {
    attrs.forEach((attr) => {
      const value = node.getAttribute(attr);
      if (!value) return;
      const refs = value.split(/\s+/).filter(Boolean);
      const valid = refs.filter((ref) => byId(ref));
      if (valid.length === refs.length) return;
      broken += 1;
      if (valid.length) node.setAttribute(attr, valid.join(' '));
      else node.removeAttribute(attr);
    });
  });
  layout.dataset.e078BrokenRefs = String(broken);
  return broken;
}

/* E078-06 : détecte les identifiants dupliqués sans jamais renommer un id de
   la vue (les sélecteurs de test restent intacts). */
function auditIds(layout) {
  const counts = new Map();
  Array.from(layout.querySelectorAll('[id]')).forEach((node) => {
    counts.set(node.id, (counts.get(node.id) || 0) + 1);
  });
  const duplicates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();
  layout.dataset.e078DuplicateIds = duplicates.length ? duplicates.join(' ') : '';
  return duplicates;
}

/* E078-04 : chaque point reçoit un titre de niveau 4, réel mais visuellement
   masqué, dérivé de son rang et de son type (chronology.js:477). */
function titlePoints(layout, el) {
  const list = layout.querySelector('ol.points') || layout.querySelector('#atlas-chrono-events');
  if (!list) return 0;
  const points = Array.from(list.children).filter((li) => li.classList && li.classList.contains('point'));
  points.forEach((li, index) => {
    const id = `e078-point-title-${index + 1}`;
    let node = byId(id);
    if (!node || !li.contains(node)) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
      const kind = li.dataset.kind || 'information';
      const confidence = li.dataset.confidence || '';
      node = el('h4', 'e078-sr-only', `Point ${index + 1} — ${kind}${confidence ? ` · ${confidence}` : ''}`);
      node.id = id;
    }
    if (li.firstChild !== node) li.insertBefore(node, li.firstChild);
  });
  return points.length;
}

/* E078-07 : le h1 devient toujours cible de focus programmatique ; le marqueur
   « country-title » n'est posé qu'en l'absence de titre de repère, pour ne pas
   voler la cible explicite de chronology.js:427-428. */
function ensureFocusTarget(layout) {
  const h1 = layout.querySelector('#atlas-chrono-title') || layout.querySelector('h1');
  if (!h1) return;
  if (h1.tabIndex < 0) h1.tabIndex = -1;
  const hasEventTitle = Boolean(layout.querySelector('#atlas-chrono-event-title') || layout.querySelector('.aside-title'));
  if (hasEventTitle) delete h1.dataset.fk;
  else h1.dataset.fk = 'country-title';
}

/* E078-09 : le plan est dérivé des titres du DOM, jamais d'une liste figée. */
function buildOutline(layout, list, el) {
  if (!list) return 0;
  list.textContent = '';
  const headings = Array.from(layout.querySelectorAll('h1, h2, h3, h4'));
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `e078-heading-${index + 1}`;
    if (heading.tabIndex < 0) heading.tabIndex = -1;
    const level = Number(heading.tagName.substring(1));
    const item = el('li', 'e078-outline-item');
    item.dataset.e078Level = String(level);
    const button = el('button', 'e078-outline-link');
    button.type = 'button';
    button.dataset.e078Target = heading.id;
    button.append(
      el('span', 'e078-outline-level', `H${level}`),
      el('span', 'e078-outline-label', heading.textContent || 'Titre sans texte')
    );
    button.addEventListener('click', () => {
      const target = byId(heading.id);
      if (!target) return;
      if (target.tabIndex < 0) target.tabIndex = -1;
      if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
      say(`Plan du document : ${heading.textContent || 'titre'} (niveau ${level}).`);
    });
    item.appendChild(button);
    list.appendChild(item);
  });
  return headings.length;
}

function installPanel(layout, tools, el) {
  const panel = ensureNode(layout, PANEL_ID, 'nav', 'e078-panel', undefined, el) || el('nav', 'e078-panel');
  if (!panel.id) panel.id = PANEL_ID;
  panel.setAttribute('aria-label', 'Plan de la chronologie');
  panel.hidden = !expanded;
  let list = panel.querySelector(`#${LIST_ID}`);
  if (!list) {
    list = el('ol', 'e078-outline-list');
    list.id = LIST_ID;
    panel.appendChild(list);
  }
  const anchor = tools && tools.parentNode ? tools.nextSibling : null;
  if (anchor) {
    if (panel !== anchor) layout.insertBefore(panel, anchor);
  } else if (panel.parentNode !== layout) {
    layout.appendChild(panel);
  }
  return { panel, list };
}

function installBar(layout, tools, el) {
  if (!tools) return null;
  let bar = byId(BAR_ID);
  if (!bar || bar.parentNode !== tools) {
    bar = el('div', 'e078-bar');
    bar.id = BAR_ID;
  }
  let button = byId(BTN_ID);
  if (!button || !bar.contains(button)) {
    button = el('button', 'e078-toggle', 'Plan du document');
    button.id = BTN_ID;
  }
  button.type = 'button';
  button.setAttribute('aria-controls', PANEL_ID);
  button.setAttribute('aria-expanded', String(expanded));
  let note = byId(NOTE_ID);
  if (!note || !bar.contains(note)) {
    note = el('span', 'e078-outline-note');
    note.id = NOTE_ID;
  }
  if (!button.dataset.e078Bound) {
    button.dataset.e078Bound = '1';
    button.addEventListener('click', () => {
      expanded = !expanded;
      const target = byId(BTN_ID);
      if (target) target.setAttribute('aria-expanded', String(expanded));
      const panel = byId(PANEL_ID);
      if (panel) panel.hidden = !expanded;
      const root = currentLayout;
      const list = byId(LIST_ID);
      if (expanded && root && list) buildOutline(root, list, currentEl);
      const count = root ? Number(root.dataset.e078OutlineCount || 0) : 0;
      say(expanded ? `Plan du document ouvert : ${count} titre(s).` : 'Plan du document fermé.');
    });
  }
  if (bar.firstChild !== button) bar.insertBefore(button, bar.firstChild);
  if (!bar.contains(note)) bar.appendChild(note);
  if (tools.firstChild !== bar) tools.insertBefore(bar, tools.firstChild);
  return { button, note };
}

register('E078', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (!layout || typeof layout.querySelector !== 'function') return;

  /* E078-10 : un seul bloc CSS, injecté une seule fois par le registre. */
  css('chronology-e078', CSS);
  currentLayout = layout;
  currentEl = el;
  layout.dataset.e078 = '1';
  layout.dataset.e078Reduced = reducedMotion() ? '1' : '0';

  const main = layout.querySelector('.chronology-main') || layout;
  const aside = layout.querySelector('.chronology-aside');
  const h1 = layout.querySelector('#atlas-chrono-title') || main.querySelector('h1');
  const name = countryName(layout, h1);

  const trail = main.querySelector('.nav-c2-orientation');
  const eras = main.querySelector('nav.atlas-chrono-era-nav');
  const tools = main.querySelector('#atlas-chrono-tools') || main.querySelector('.atlas-chrono-tools');
  const eventTitle = aside && (aside.querySelector('#atlas-chrono-event-title') || aside.querySelector('.aside-title'));

  /* E078-01 : plan hiérarchique explicite — quatre titres de section. */
  const hSituation = ensureHeading(main, H2.situation, 'h2', 'Situation dans la chronologie', trail, el);
  const hEras = ensureHeading(main, H2.eras, 'h2', `Ères de ${name}`, eras, el);
  const hRepères = ensureHeading(main, H2.reperes, 'h2', 'Repères et recherche', tools, el);
  const hFiche = ensureHeading(aside, H2.fiche, 'h2', 'Fiche du repère', aside && aside.firstChild, el);

  /* E078-02 / E078-08 : un seul mécanisme de nommage par région, sans
     remplacer les aria-label déjà portés par la nav des ères et la liste. */
  if (trail && hSituation) {
    trail.setAttribute('role', 'region');
    trail.setAttribute('aria-labelledby', hSituation.id);
  }
  if (tools && hRepères) {
    tools.setAttribute('role', 'region');
    tools.setAttribute('aria-labelledby', hRepères.id);
  }
  if (hEras && eras) eras.setAttribute('aria-describedby', hEras.id);
  if (aside && hFiche) {
    aside.removeAttribute('aria-label');
    aside.setAttribute('aria-labelledby', hFiche.id);
    if (eventTitle) aside.setAttribute('aria-describedby', eventTitle.id);
    else aside.removeAttribute('aria-describedby');
  }

  const points = titlePoints(layout, el);
  ensureFocusTarget(layout);
  const broken = auditAria(layout);
  const duplicates = auditIds(layout);

  const { panel, list } = installPanel(layout, tools, el);
  const headings = buildOutline(layout, list, el);
  layout.dataset.e078OutlineCount = String(headings);
  layout.dataset.e078PointCount = String(points);

  const bar = installBar(layout, tools, el);
  if (bar && bar.note) {
    bar.note.textContent = `${headings} titres · ${points} points titrés · ${broken} référence(s) orpheline(s) · ${duplicates.length} id(s) dupliqué(s)`;
  }
  if (panel) panel.hidden = !expanded;
  const button = byId(BTN_ID);
  if (button) button.setAttribute('aria-expanded', String(expanded));

  /* E078-10 : l'état est réaffirmé à chaque rendu ; aucune annonce n'est
     émise sans action explicite de l'utilisateur. */
  ensureLive(el);
});
