import { register } from './registry.js';

/* Lentille V2 E015 — nombre de résultats en role=status (unique).
 *
 * Thème : « B. Filtres & périmètre — nombre de résultats en role=status
 * (unique) ». Dix chantiers E015-01 à E015-10, tous implémentés ici, chacun
 * avec un effet DOM ou CSS observable.
 *
 * Périmètre possédé : ce module uniquement. Lectures seules : chronology.js,
 * chronology/v2/registry.js, chronology/E049.js, _diagnostics.js. Aucun fichier
 * partagé n'est modifié : ni la vue, ni le CSS global, ni le routeur, ni le
 * registre, ni une autre lentille.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * V2 ne fournit pas say() : la lentille n'écrit dans aucune région live
 * existante et ne crée qu'UN seul role="status", dédié au compte de résultats.
 *
 * Invariants : une seule inscription au registre sous l'identifiant E015,
 * une seule feuille de style (identifiant chronology-v2-e015), des ids tous
 * préfixés chronology-v2-e015-, une garde d'existence par nœud, zéro
 * journalisation, zéro réseau, zéro aléa, zéro HTML injecté, zéro timer,
 * zéro écouteur superflu.
 * Le greffon se contente de relire le DOM déjà rendu : chaque filtre déclenche
 * un rendu complet (chronology.js:321-325 → store.js:216 → shell.js:533), donc
 * une simple relecture à l'installation suffit ; aucun écouteur n'est ajouté.
 */

const CSS_ID = 'chronology-v2-e015';
const PANEL_ID = 'chronology-v2-e015-panel';
const TITLE_ID = 'chronology-v2-e015-title';
const STATUS_ID = 'chronology-v2-e015-result-status';
const PERIMETER_ID = 'chronology-v2-e015-perimeter';
const FILTER_ID = 'chronology-v2-e015-filter';
const CURRENT_ID = 'chronology-v2-e015-current';
const AUDIT_ID = 'chronology-v2-e015-audit';

/* Cibles observées, jamais possédées. */
const LIST_ID = 'atlas-chrono-events';
const COUNT_ID = 'atlas-chrono-count';
const VIEW_STATUS_ID = 'atlas-chrono-status';
const SEARCH_ID = 'atlas-chrono-search';
const MAIN_ID = 'atlas-chrono-main';

/* E015-01, E015-05, E015-09 : une seule feuille, injectée une fois par ctx.css.
   Le compte est un bloc visible en flux normal, jamais une modale ni un
   toilettage absolu : il n'ajoute aucun arrêt Tab et ne recouvre ni la frise ni
   la fiche. Aucune règle distante, aucun chargement externe. */
const CSS = `
  #${PANEL_ID} {
    margin: 10px 0 0; padding: 9px 11px 10px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 9px; background: rgba(255,255,255,.02);
    color: var(--muted); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .chronology-v2-e015-title {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${STATUS_ID} {
    min-height: 1.5em; margin: 0 0 6px; padding: 5px 7px;
    border: 1px solid var(--line); border-radius: 6px;
    background: var(--surface-2, transparent); color: var(--ink);
    font-size: 11px; font-weight: 600;
  }
  #${STATUS_ID}.is-empty {
    border-style: dashed; color: var(--muted); font-weight: 400;
  }
  #${PANEL_ID} .chronology-v2-e015-line { margin: 3px 0 0; }
  #${PANEL_ID} .chronology-v2-e015-audit { color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} :focus-visible, #${STATUS_ID}:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 7px 8px 8px; }
    #${STATUS_ID} { font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${STATUS_ID} {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
  }
  @media print {
    #${PANEL_ID} { border-color: #444; background: #fff; color: #111; }
    #${STATUS_ID} { border-color: #666; color: #111; }
  }
`;

let installCount = 0;
let updateCount = 0;
let refs = null;

/* E015-10 : garde d'existence pour toute id préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant : la coque reconstruisant #app
   (shell.js:533), un nœud de la rendu précédent est détaché et n'est donc pas
   retrouvé par getElementById. Le greffon est rejoué à chaque rendu
   (chronology.js:541) : sans cette garde, les ids se dupliqueraient. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rafraîchissements sans changement ne touchent à
   aucun textContent. C'est le garde-fou E015-06 contre le bavardage. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, name, value) {
  const text = String(value);
  if (node.getAttribute(name) !== text) node.setAttribute(name, text);
}

/* E015-02 : le compte est lu dans le DOM réellement rendu, jamais dans une
   variable de la vue. La liste vide n'a pas de li[data-event-id] : le compte
   tombe alors à 0, ce qui est précisément le cas E015-05. */
function countRendered() {
  const list = document.getElementById(LIST_ID);
  if (!list || typeof list.querySelectorAll !== 'function') return 0;
  return list.querySelectorAll('li[data-event-id]').length;
}

/* E015-03 : le dénominateur est relu depuis le bandeau de la vue
   (chronology.js:345, puis :255 en repli). Aucune date ni aucun total codé en
   dur dans la lentille : si la source manque, le libellé affiche « — ». */
function parseTotal() {
  const chip = document.getElementById(COUNT_ID);
  const pair = /(\d+)\s*\/\s*(\d+)/.exec(chip ? chip.textContent || '' : '');
  if (pair) return Number(pair[2]);
  const banner = document.getElementById(VIEW_STATUS_ID);
  const fallback = /sur\s+(\d+)\s+repères?/i.exec(banner ? banner.textContent || '' : '');
  return fallback ? Number(fallback[1]) : null;
}

/* E015-04 : l'aria-label de la liste (chronology.js:351-353) dit si le rendu
   porte sur l'ère courante ou sur le pays entier. C'est la seule source de
   vérité du périmètre, sans réimplémenter le filtre local. */
function readPerimeter() {
  const list = document.getElementById(LIST_ID);
  const label = list && list.getAttribute ? (list.getAttribute('aria-label') || '') : '';
  return /filtr/i.test(label) ? 'pays' : 'ere';
}

/* E015-07 : recherche et thème sont lus dans les contrôles réels :
   #atlas-chrono-search (chronology.js:313-320) et les boutons [data-tag]
   des deux conteneurs (chronology.js:330-343 et :445-456). Un même thème
   apparaît deux fois : il est dédupliqué avant affichage. */
function readFilter() {
  const search = document.getElementById(SEARCH_ID);
  const query = search && typeof search.value === 'string' ? search.value.trim() : '';
  const pressed = document.querySelectorAll(
    '#atlas-chrono-tools [data-tag][aria-pressed="true"], '
    + '#atlas-chrono-aside [data-tag][aria-pressed="true"]'
  );
  const tags = [];
  pressed.forEach((node) => {
    const tag = node.getAttribute('data-tag');
    if (tag && tags.indexOf(tag) === -1) tags.push(tag);
  });
  return { query: query, tags: tags };
}

/* E015-08 : le rang est lu sur les cartes rendues, via aria-current posé par
   la vue (chronology.js:391). Il est relatif à la liste affichée, pas au pays
   entier : le libellé le dit explicitement pour éviter toute ambiguïté. */
function readCurrent() {
  const list = document.getElementById(LIST_ID);
  if (!list || typeof list.querySelectorAll !== 'function') {
    return { rank: 0, total: 0 };
  }
  const cards = Array.from(list.querySelectorAll('.event-card'));
  const rank = cards.findIndex((card) => card.getAttribute('aria-current') === 'true') + 1;
  return { rank: rank, total: cards.length };
}

/* E015-01, E015-03, E015-05 : un seul message, court, formé uniquement de
   grandeurs relevées dans le DOM. Le singulier et le pluriel sont explicites :
   aucune information n'est portée par la seule couleur de l'état vide. */
function messageFor(count, total, perimeter) {
  const plural = count > 1 ? 's' : '';
  let message = `Résultats : ${count} repère${plural} affiché${plural}`;
  if (total !== null) message += ` sur ${total}`;
  message += perimeter === 'pays' ? ' dans tout le pays.' : " dans l'ère courante.";
  return message;
}

/* E015-01 à E015-09 : unique point de rafraîchissement. Toutes les écritures
   passent par write() ou par une comparaison de texte : le role=status ne
   change que lorsque le compte, le total ou le périmètre changent réellement. */
function refresh(ctx) {
  const r = refs;
  if (!r || !r.status || !r.status.isConnected) return;

  const count = countRendered();
  const total = parseTotal();
  const perimeter = readPerimeter();
  const filter = readFilter();
  const current = readCurrent();
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  const message = messageFor(count, total, perimeter);
  if (r.status.textContent !== message) {
    r.status.textContent = message;
    updateCount += 1;
  }
  if (r.status.classList.contains('is-empty') !== (count === 0)) {
    r.status.classList.toggle('is-empty', count === 0);
  }

  write(r.perimeter, perimeter === 'pays'
    ? 'Périmètre : recherche dans tous les repères du pays.'
    : "Périmètre : ère courante, bandes d'ère conservées.");
  write(r.filter, filter.query || filter.tags.length
    ? `Filtre : ${filter.query ? `« ${filter.query} »` : 'aucune recherche'}`
      + `${filter.tags.length ? ` · thème${filter.tags.length > 1 ? 's' : ''} : ${filter.tags.join(', ')}` : ''}.`
    : 'Filtre : aucun (vue ère par ère).');
  write(r.current, current.rank
    ? `Repère courant : ${current.rank} / ${current.total} dans la liste affichée.`
    : `Repère courant : aucun dans la liste affichée (${current.total}).`);
  write(r.audit, `Relecture DOM : ${count} repère(s) · total ${total === null ? '—' : total}`
    + ` · mouvement réduit : ${reduced ? 'oui' : 'non'} · rendus : ${installCount}`
    + ` · messages renouvelés : ${updateCount}.`);

  /* Un attribut par chantier : chaque effet est vérifiable sans outil. */
  setData(r.panel, 'data-e015-dom-count', count);
  setData(r.panel, 'data-e015-total', total === null ? '—' : total);
  setData(r.panel, 'data-e015-perimeter', perimeter);
  setData(r.panel, 'data-e015-empty', count === 0 ? '1' : '0');
  setData(r.panel, 'data-e015-updates', updateCount);
  setData(r.panel, 'data-e015-query', filter.query);
  setData(r.panel, 'data-e015-tag', filter.tags.join(' '));
  setData(r.panel, 'data-e015-current', `${current.rank}/${current.total}`);
  setData(r.panel, 'data-e015-reduced', reduced ? '1' : '0');
  setData(r.panel, 'data-e015-renders', installCount);
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout || typeof document === 'undefined') return;

  ctx.css(CSS_ID, CSS);
  installCount += 1;

  /* Le panneau vit dans .chronology-main, enfant de ctx.layout : il échappe
     au marquage de _diagnostics.js:69-78 (seuls les parents body/stage/layout
     sont marqués) et hérite de l'inert des modales de la coque. */
  const host = document.getElementById(MAIN_ID)
    || ctx.layout.querySelector('.chronology-main')
    || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'chronology-v2-e015-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'chronology-v2-e015-title', 'Compte des résultats');
  title.id = TITLE_ID;

  /* E015-01 : LE seul role="status" créé par la lentille. Aucune écriture dans
     #nav-c2a-live, #nav-t2-live ou la région de la coque. */
  const status = make('p', 'chronology-v2-e015-status', 'Résultats : en attente du rendu.');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const perimeter = make('p', 'chronology-v2-e015-line');
  perimeter.id = PERIMETER_ID;
  const filter = make('p', 'chronology-v2-e015-line');
  filter.id = FILTER_ID;
  const current = make('p', 'chronology-v2-e015-line');
  current.id = CURRENT_ID;
  const audit = make('p', 'chronology-v2-e015-line chronology-v2-e015-audit');
  audit.id = AUDIT_ID;

  /* replaceChildren, jamais d'affectation de HTML brut : aucun balisage ne
     traverse la lentille, y compris pour la requête de recherche. */
  panel.replaceChildren(title, status, perimeter, filter, current, audit);
  refs = { panel: panel, status: status, perimeter: perimeter, filter: filter, current: current, audit: audit };
  refresh(ctx);
}

register('E015', (ctx) => {
  install(ctx);
});
