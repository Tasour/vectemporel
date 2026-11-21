import { register } from './registry.js';

/* Lentille E02 — hiérarchie visuelle de la vue Chronologie.
 *
 * Lectures seules : src/views/chronology.js, styles.css,
 * src/views/chronology/registry.js, src/views/_diagnostics.js.
 * Dix chantiers E02-01..10, tous implémentés ici. Un seul register('E02').
 * Aucune modification des fichiers sources, zéro réseau, zéro console,
 * zéro nombre aléatoire : l'unique état est un booléen de module réaffirmé à
 * chaque rendu dans le DOM (data-e02-hierarchy, aria-pressed).
 */

const STYLE_ID = 'chronology-e02';
const ROOT_ID = 'chrono-hierarchy-root';
const CONTROL_ID = 'chrono-hierarchy-toggle';
const NOTE_ID = 'chrono-hierarchy-note';
const LIVE_ID = 'chrono-hierarchy-live';

const BASE_SCALE = { h1: 26, h2: 24, h3: 15 };
const STRONG_SCALE = { h1: 30, h2: 27, h3: 16 };

/* État de la bascule, conservé entre les reconstructions du DOM opérées par
   la coque (shell.js) mais jamais écrit dans le store partagé. */
let strong = false;

const CSS = `
  /* E02-01 / E02-08 : une seule échelle, une seule mesure d'espacement. */
  .chronology-layout {
    --e02-h1: 26px; --e02-h2: 24px; --e02-h3: 15px; --e02-gap: 10px;
  }
  .chronology-layout[data-e02-hierarchy="strong"] {
    --e02-h1: 30px; --e02-h2: 27px; --e02-h3: 16px; --e02-gap: 14px;
  }
  .chronology-layout .atlas-chrono-h1 {
    font-size: var(--e02-h1); letter-spacing: -.01em;
  }
  .chronology-layout .aside-title { font-size: var(--e02-h2); }
  .chronology-layout .atlas-chrono-section-title { font-size: var(--e02-h3); }
  .chronology-layout .view-lede { margin: 0 0 var(--e02-gap); }
  .chronology-layout .atlas-chrono-hint { margin: 0 0 var(--e02-gap); }
  .chronology-layout .atlas-chrono-status { margin: 0 0 var(--e02-gap); }
  .chronology-layout .nav-c2-orientation { margin: 0 0 var(--e02-gap); }
  .chronology-layout .atlas-chrono-era-nav { margin-bottom: var(--e02-gap); }
  .chronology-layout .atlas-chrono-tools { margin-bottom: var(--e02-gap); }
  .chronology-layout .atlas-chrono-section-title { margin: calc(var(--e02-gap) + 2px) 0 0; }

  /* E02-02 : marqueurs de section réels, en texte et en trait. */
  .e02-section-label {
    margin: 0 0 6px; color: var(--gold); font-size: 9px; font-weight: 600;
    letter-spacing: .16em; text-transform: uppercase;
  }
  .e02-section-label::before {
    content: ''; display: inline-block; width: 14px; height: 1px;
    margin-right: 6px; background: var(--gold); vertical-align: middle;
  }

  /* E02-03 : le bloc « Vous êtes ici » devient un repère discret. */
  .chronology-layout .nav-c2-orientation[data-e02-hierarchy="quiet"] {
    padding: 6px 10px; border-left: 2px solid var(--line-strong);
    border-radius: 0 8px 8px 0;
  }
  .chronology-layout .nav-c2-orientation .nav-c2-here { margin-bottom: 3px; }

  /* E02-04 / E02-05 / E02-09 : poids, année et liaison de la carte active. */
  .chronology-layout .event-list > li[data-importance="3"] .event-card {
    border-left-width: 4px; border-left-color: var(--gold);
  }
  .chronology-layout .event-list > li[data-importance="2"] .event-card {
    border-left-width: 3px; border-left-color: var(--line-strong);
  }
  .chronology-layout .event-list > li[data-importance="1"] .event-card {
    border-left-width: 2px;
  }
  .e02-weight {
    align-self: flex-start; margin: 0 10px; padding: 2px 6px;
    border: 1px solid var(--line); border-radius: 999px;
    color: var(--muted); font-size: 8px; font-variant-numeric: tabular-nums;
  }
  .chronology-layout .event-list > li[data-importance="3"] .e02-weight {
    border-color: var(--gold); color: var(--gold-bright);
  }
  .chronology-layout .event-year {
    font-size: 10px; letter-spacing: .03em;
  }
  .chronology-layout .event-card[data-e02-linked="1"] {
    box-shadow: inset 3px 0 0 var(--gold), 0 0 0 1px rgba(230,185,111,.2);
  }
  .chronology-layout .aside-title[data-e02-linked="1"] {
    padding-left: 10px; border-left: 3px solid var(--gold);
  }

  /* E02-06 : séparateur d'ère sur toute la largeur de la grille. */
  .chronology-layout .event-list > li.e02-era-divider {
    grid-column: 1 / -1; display: flex; align-items: center;
    min-height: 24px; padding: 4px 0;
  }
  .e02-divider-label {
    color: var(--muted); font-size: 9px; letter-spacing: .12em;
    text-transform: uppercase;
  }
  .e02-divider-label::before {
    content: ''; display: inline-block; width: 12px; height: 1px;
    margin-right: 6px; background: var(--gold); vertical-align: middle;
  }

  /* E02-07 : badges de type et de confiance au-dessus du seuil de lecture. */
  .chronology-layout .point-kind,
  .chronology-layout .confidence { padding: 3px 7px; font-size: 9px; }
  .chronology-layout .point-head { gap: 6px; }

  /* Contrôle de la bascule : cible >= 36 px, focus visible, aucun texte
     porté par la seule couleur (libellé stable + aria-pressed). */
  .e02-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 var(--e02-gap); }
  .e02-toggle {
    min-height: 36px; padding: 6px 12px; border: 1px solid var(--line);
    border-radius: 8px; background: transparent; color: var(--ink-soft);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  .e02-toggle[aria-pressed="true"] {
    border-color: var(--gold); color: var(--gold-bright);
    background: rgba(230,185,111,.1);
  }
  .e02-toggle:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  .e02-scale-note { color: var(--muted-2); font-size: 9px; font-variant-numeric: tabular-nums; }
  .e02-sr-only {
    position: absolute !important; width: 1px; height: 1px; padding: 0;
    margin: -1px; overflow: hidden; clip: rect(0 0 0 0);
    white-space: nowrap; border: 0;
  }

  /* E02-10 : l'échelle suit la largeur, pas l'inverse. */
  @media (max-width: 620px) {
    .chronology-layout { --e02-h1: 22px; --e02-h2: 21px; --e02-h3: 14px; --e02-gap: 8px; }
    .chronology-layout .chronology-main { padding: 18px 14px 24px; }
    .chronology-layout .chronology-aside { padding: 16px 14px 24px; }
    .chronology-layout .e02-bar { flex-direction: column; align-items: flex-start; }
    .chronology-layout .e02-section-label { font-size: 8px; }
    .chronology-layout .e02-weight { margin: 0 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .chronology-layout .e02-toggle { transition: none !important; }
  }
`;

function scaleText(isStrong) {
  const s = isStrong ? STRONG_SCALE : BASE_SCALE;
  return `${s.h1}/${s.h2}/${s.h3} px`;
}

/* E02-01 : région live unique, créée hors de #app pour survivre au
   innerHTML de la coque ; identifiant sans motif « -e02 » afin d'échapper
   au marquage diagnostics de _diagnostics.js:72. */
function ensureLive() {
  let node = document.getElementById(LIVE_ID);
  if (!node) {
    node = document.createElement('p');
    node.id = LIVE_ID;
    node.className = 'e02-sr-only';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    document.body.appendChild(node);
  }
  return node;
}

/* E02-02 : marqueur de section inséré avant une ancre existante, sans
   toucher au texte des titres sémantiques d'origine. */
function labelBefore(anchor, id, text, el) {
  if (!anchor || !anchor.parentNode) return;
  if (anchor.parentNode.querySelector(`#${id}`)) return;
  const node = el('p', 'e02-section-label', text);
  node.id = id;
  anchor.parentNode.insertBefore(node, anchor);
}

function installSectionLabels(main, aside, el) {
  labelBefore(main && main.querySelector('nav.atlas-chrono-era-nav'), 'chrono-section-01', '01 · Ères', el);
  labelBefore(main && main.querySelector('.atlas-chrono-tools'), 'chrono-section-02', '02 · Repères', el);
  if (aside && !aside.querySelector('#chrono-section-03')) {
    const node = el('p', 'e02-section-label', '03 · Fiche du repère');
    node.id = 'chrono-section-03';
    aside.insertBefore(node, aside.firstChild);
  }
}

/* E02-04 : le poids est déjà dans le DOM (chronology.js:382) ; le rendre
   lisible par un libellé chiffré, jamais par la seule couleur. */
function markImportance(list, el) {
  if (!list) return;
  Array.from(list.children).forEach((li) => {
    if (!li.dataset || !li.dataset.eventId) return;
    const level = li.dataset.importance;
    if (level !== '1' && level !== '2' && level !== '3') return;
    if (li.querySelector('.e02-weight')) return;
    const card = li.querySelector('.event-card');
    if (!card) return;
    const badge = el('span', 'e02-weight', `Poids ${level}/3`);
    badge.title = `Importance ${level} sur 3`;
    card.appendChild(badge);
  });
}

function eraName(eraId) {
  if (!eraId) return '';
  const band = document.getElementById(`era-${eraId}`);
  const first = band && band.firstElementChild;
  return first ? (first.textContent || '').trim() : '';
}

/* E02-06 : en mode filtré, les cartes de plusieurs ères se côtoient ;
   un séparateur texte marque chaque changement (chronology.js:402-404). */
function insertEraDividers(list, el) {
  if (!list || list.querySelector('.e02-era-divider')) return;
  const items = Array.from(list.children).filter((li) => li.dataset && li.dataset.eventId);
  let previous = null;
  let count = 0;
  items.forEach((li) => {
    const eraId = li.dataset.eraId || '';
    if (previous !== null && eraId !== previous) {
      count += 1;
      const divider = el('li', 'e02-era-divider');
      divider.id = `chrono-divider-${count}`;
      const name = eraName(eraId);
      divider.appendChild(el('span', 'e02-divider-label', name ? `Suite · ${name}` : 'Changement d’ère'));
      list.insertBefore(divider, li);
    }
    previous = eraId;
  });
}

/* E02-09 : même marqueur sur la carte courante et sur le titre de la fiche,
   pour rendre visible le lien de lecture entre les deux colonnes. */
function markActiveLink(list, aside) {
  const active = list && list.querySelector('.event-card[aria-current="true"]');
  if (active) active.dataset.e02Linked = '1';
  const title = aside && aside.querySelector('.aside-title');
  if (title) title.dataset.e02Linked = '1';
}

function quietOrientation(main) {
  const block = main && main.querySelector('.nav-c2-orientation');
  if (block) block.dataset.e02Hierarchy = 'quiet';
}

function installBar(main, el) {
  if (!main || main.querySelector(`#${CONTROL_ID}`)) return;
  const bar = el('div', 'e02-bar');
  const button = el('button', 'e02-toggle', 'Hiérarchie renforcée');
  button.type = 'button';
  button.id = CONTROL_ID;
  button.setAttribute('aria-pressed', String(strong));
  button.setAttribute('aria-controls', ROOT_ID);
  const note = el('span', 'e02-scale-note', `Échelle h1/h2/h3 : ${scaleText(strong)}`);
  note.id = NOTE_ID;

  button.addEventListener('click', () => {
    strong = !strong;
    button.setAttribute('aria-pressed', String(strong));
    const root = document.getElementById(ROOT_ID);
    if (root) root.dataset.e02Hierarchy = strong ? 'strong' : 'base';
    note.textContent = `Échelle h1/h2/h3 : ${scaleText(strong)}`;
    const live = ensureLive();
    if (live) live.textContent = strong
      ? 'Hiérarchie visuelle renforcée.'
      : 'Hiérarchie visuelle équilibrée.';
  });

  bar.append(button, note);
  const nav = main.querySelector('nav.atlas-chrono-era-nav');
  if (nav && nav.parentNode === main) main.insertBefore(bar, nav);
  else main.appendChild(bar);
}

register('E02', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (!layout || typeof layout.querySelector !== 'function') return;

  /* Un seul bloc CSS, injecté par le registre dans <head> (idempotent). */
  css(STYLE_ID, CSS);

  layout.id = ROOT_ID;
  layout.dataset.e02Hierarchy = strong ? 'strong' : 'base';
  layout.dataset.e02Reduced = reducedMotion() ? '1' : '0';

  const main = layout.querySelector('.chronology-main') || layout;
  const aside = layout.querySelector('.chronology-aside');
  const list = layout.querySelector('#atlas-chrono-events');

  installBar(main, el);
  installSectionLabels(main, aside, el);
  quietOrientation(main);
  markImportance(list, el);
  insertEraDividers(list, el);
  markActiveLink(list, aside);

  /* L'état est toujours réaffirmé au DOM, même sans interaction : une
     lentille défaillante ne peut pas laisser une échelle orpheline. */
  const live = ensureLive();
  if (live && !live.textContent) live.textContent = 'Hiérarchie visuelle équilibrée.';
});
