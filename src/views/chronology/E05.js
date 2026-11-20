import { register } from './registry.js';

/* Lentille CHRONOLOGIE E05 — navigation clavier.
 * Dix chantiers E05-01 … E05-10, tous implémentés dans ce module :
 *   E05-01 aide clavier contextuelle (détails/summary natif) ;
 *   E05-02 aria-keyshortcuts sur les widgets ;
 *   E05-03 rôles et groupes nommés (listes, outils) ;
 *   E05-04 liens d'évitement vers repères et fiche ;
 *   E05-05 Début/Fin dans la barre d'ères ;
 *   E05-06 Début/Fin dans la liste des repères ;
 *   E05-07 Début/Fin dans les puces de filtres ;
 *   E05-08 recherche : Échap efface, Entrée/↓ mène au premier résultat ;
 *   E05-09 annonce clavier (région live dédiée) et readout visible ;
 *   E05-10 restauration sémantique du focus après reconstruction du DOM.
 *
 * Contrat : un seul register('E05', ctx), CSS via ctx.css('chronology-e05', …),
 * identifiants uniques (préfixe `chrono-kbd-`, volontairement sans `-e05` pour
 * ne pas être confondu avec un panneau de diagnostic — voir _diagnostics.js:72),
 * zéro console, zéro réseau, zéro aléa, zéro timer, aucun écouteur global
 * supplémentaire (un seul focusin sur document, armé une fois).
 */

const CSS_ID = 'chronology-e05';
const HELP_ID = 'chrono-kbd-help';
const SKIP_EVENTS_ID = 'chrono-kbd-skip-events';
const SKIP_ASIDE_ID = 'chrono-kbd-skip-aside';
const READOUT_ID = 'chrono-kbd-readout';
const LIVE_ID = 'chrono-kbd-live';

const KEYS_ERAS = 'ArrowUp ArrowDown Home End Enter';
const KEYS_EVENTS = 'ArrowRight ArrowLeft Home End Enter';
const KEYS_SEARCH = 'Escape Enter ArrowDown';

const CSS = `
.chrono-kbd-help{margin:-4px 0 10px;color:var(--muted);font-size:9px;line-height:1.5}
.chrono-kbd-help summary{min-height:24px;padding:2px 0;color:var(--gold-bright);cursor:pointer}
.chrono-kbd-help ul{margin:4px 0 0;padding-left:16px}
.chrono-kbd-help strong{color:var(--ink-soft);font-weight:600}
.chrono-kbd-readout{min-height:12px;margin:0 0 9px;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
.chrono-kbd-skip{position:absolute;left:-9999px;top:0;z-index:60;min-height:32px;padding:6px 10px;border:1px solid var(--gold);border-radius:6px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;text-decoration:none}
.chrono-kbd-skip:focus{left:8px;top:8px}
.chrono-kbd-help summary:focus-visible,.chrono-kbd-skip:focus-visible,
.atlas-chrono-tools button:focus-visible,.atlas-chrono-search:focus-visible,
.era-band:focus-visible,.event-card:focus-visible,.nav-c2-back:focus-visible,
#atlas-chrono-events:focus,#atlas-chrono-aside:focus{outline:2px solid var(--gold-bright);outline-offset:2px}
.chrono-kbd-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (prefers-reduced-motion:reduce){.chrono-kbd-skip,.chrono-kbd-help summary{transition:none!important}}
`;

/* Pointeurs module : la coque reconstruisant #app à chaque rendu (shell.js:533),
 * les écouteurs de document lisent ces pointeurs et jamais une closure périmée. */
let currentLayout = null;
let trackedFocus = null;
let focusBound = false;

function createEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function byId(id, root) {
  const scope = root && typeof root.querySelector === 'function' ? root : document;
  return scope.getElementById ? scope.getElementById(id) : scope.querySelector(`#${id}`);
}

/* E05-09 : une région live dédiée, distincte de #nav-c2a-live (chronology.js:121)
 * et de #nav-t2-live (keyboard.js:76) pour ne jamais écraser leurs annonces. */
function ensureLive(el) {
  let node = document.getElementById(LIVE_ID);
  if (!node) {
    node = el('p', 'chrono-kbd-sr');
    node.id = LIVE_ID;
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    if (document.body) document.body.appendChild(node);
  }
  return node;
}

function announce(message) {
  if (!message) return;
  const node = document.getElementById(LIVE_ID);
  if (node && node.isConnected && node.textContent !== message) node.textContent = message;
  const readout = document.getElementById(READOUT_ID);
  if (readout && readout.isConnected) readout.textContent = `Clavier · ${message}`;
}

/* E05-01 : aide contextuelle réellement accessible au clavier (summary natif),
 * insérée après l'indice existant de chronology.js:231. */
function buildHelp(main, el) {
  let help = document.getElementById(HELP_ID);
  if (!help || !main.contains(help)) {
    help = el('details', 'chrono-kbd-help');
    help.id = HELP_ID;
    const summary = el('summary', '', 'Raccourcis clavier — détails');
    const list = el('ul');
    const rows = [
      ['→ / ←', 'repère suivant / précédent'],
      ['↑ / ↓', 'ère précédente / suivante'],
      ['Début / Fin', 'premier / dernier élément de la liste focalisée'],
      ['Entrée', 'ouvrir le détail ou activer le contrôle focalisé'],
      ['Échap', 'retour au monde ; dans la recherche, effacer le filtre'],
      ['?', 'ouvrir / fermer l’aide générale'],
    ];
    rows.forEach(([key, label]) => {
      const li = el('li');
      li.append(el('strong', '', key), el('span', '', ` : ${label}`));
      list.appendChild(li);
    });
    help.append(summary, list);
    const hint = main.querySelector('.atlas-chrono-hint');
    if (hint && hint.nextSibling) main.insertBefore(help, hint.nextSibling);
    else main.appendChild(help);
  }
  return help;
}

/* E05-09 : miroir visible des annonces, en texte réel (jamais une région live
 * supplémentaire). */
function buildReadout(main, el) {
  let node = document.getElementById(READOUT_ID);
  if (!node || !main.contains(node)) {
    node = el('p', 'chrono-kbd-readout');
    node.id = READOUT_ID;
    node.textContent = 'Clavier prêt · flèches pour naviguer · ? pour l’aide.';
    const help = document.getElementById(HELP_ID);
    if (help && help.nextSibling) main.insertBefore(node, help.nextSibling);
    else main.appendChild(node);
  }
  return node;
}

/* E05-04 : deux liens d'évitement, visibles au focus, cibles rendues
 * focalisées de manière idempotente. */
function buildSkipLinks(main, el) {
  const targets = [
    [SKIP_EVENTS_ID, 'atlas-chrono-events', 'Aller aux repères'],
    [SKIP_ASIDE_ID, 'atlas-chrono-aside', 'Aller à la fiche du repère'],
  ];
  targets.forEach(([id, targetId, label]) => {
    let link = document.getElementById(id);
    if (!link || !main.contains(link)) {
      link = el('a', 'chrono-kbd-skip', label);
      link.id = id;
      link.href = `#${targetId}`;
      link.setAttribute('data-chrono-kbd-role', 'skip');
      main.insertBefore(link, main.firstChild);
    }
    const target = document.getElementById(targetId);
    if (target && !target.hasAttribute('tabindex')) target.tabIndex = -1;
  });
}

/* E05-02 / E05-03 : métadonnées ARIA purement additives et idempotentes. */
function applyAria(eraNav, eraList, tools, search, list, help, back) {
  const described = (node, ids) => {
    if (!node) return;
    const existing = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    const wanted = [...new Set([...existing, ...ids.filter(Boolean)])].join(' ');
    if (wanted && node.getAttribute('aria-describedby') !== wanted) {
      node.setAttribute('aria-describedby', wanted);
    }
  };
  if (eraNav && !eraNav.hasAttribute('aria-keyshortcuts')) eraNav.setAttribute('aria-keyshortcuts', KEYS_ERAS);
  if (list && !list.hasAttribute('aria-keyshortcuts')) list.setAttribute('aria-keyshortcuts', KEYS_EVENTS);
  if (search && !search.hasAttribute('aria-keyshortcuts')) search.setAttribute('aria-keyshortcuts', KEYS_SEARCH);
  if (back && !back.hasAttribute('aria-keyshortcuts')) back.setAttribute('aria-keyshortcuts', 'Escape');

  /* list-style:none (chronology.js:41,59) fait perdre la sémantique de liste
     sous Safari/VoiceOver : role="list" la restaure sans rien supprimer. */
  if (eraList && eraList.getAttribute('role') !== 'list') eraList.setAttribute('role', 'list');
  if (list && list.getAttribute('role') !== 'list') list.setAttribute('role', 'list');
  if (tools && tools.getAttribute('role') !== 'group') {
    tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', 'Outils de recherche et de filtres');
    if (!tools.hasAttribute('aria-keyshortcuts')) tools.setAttribute('aria-keyshortcuts', 'Home End');
  }
  described(search, help ? [HELP_ID, READOUT_ID] : [READOUT_ID]);
  described(eraNav, help ? [HELP_ID] : []);
}

/* E05-10 : suit la catégorie sémantique du dernier contrôle focalisé afin de
 * retrouver son équivalent après innerHTML (le simple aria-current changeant,
 * findBySignature de shell.js:230 ne le retrouve pas). */
function onFocusIn(event) {
  const node = event.target;
  if (!(node instanceof Element)) return;
  const role = node.getAttribute && node.getAttribute('data-chrono-kbd-role');
  if (role && currentLayout && currentLayout.contains(node)) {
    trackedFocus = { role, tag: node.getAttribute('data-chrono-kbd-tag') || '' };
    return;
  }
  /* La coque ramène souvent le focus sur #atlas-stage, ANCÊTRE du layout,
   * entre deux rendus : ce n'est pas une sortie de vue, on conserve le suivi.
   * Seul un focus réellement hors de la scène l'efface. */
  const inStage = typeof node.closest === 'function' && node.closest('#atlas-stage');
  if (!currentLayout || !inStage) trackedFocus = null;
}

function bindFocusTracking() {
  if (focusBound) return;
  focusBound = true;
  document.addEventListener('focusin', onFocusIn, true);
}

function mark(nodes, role) {
  nodes.forEach((node) => {
    if (!node.hasAttribute('data-chrono-kbd-role')) node.setAttribute('data-chrono-kbd-role', role);
  });
}

function restoreFocus() {
  const tracked = trackedFocus;
  if (!tracked) return;
  const root = document.querySelector('.chronology-layout');
  if (!root) return; /* l'utilisateur a quitté la vue : on ne vole pas le focus */
  const active = document.activeElement;
  if (active && active !== document.body && active.id !== 'atlas-stage' && root.contains(active)) return;

  let target = null;
  const byTag = (selector) => Array.from(root.querySelectorAll(selector))
    .find((node) => node.getAttribute('data-chrono-kbd-tag') === tracked.tag) || null;
  if (tracked.role === 'current-event') {
    /* Le repère courant ayant changé, le focus suit la sélection. */
    target = root.querySelector('.event-card[aria-current="true"]') || root.querySelector('.event-card.is-active');
  } else if (tracked.role === 'event') {
    target = byTag('.event-card');
  } else if (tracked.role === 'current-era') {
    target = root.querySelector('.era-band[aria-current="true"]') || root.querySelector('.era-band.is-active');
  } else if (tracked.role === 'era') {
    target = byTag('.era-band');
  } else if (tracked.role === 'search') {
    target = root.querySelector('#atlas-chrono-search');
  } else if (tracked.role === 'tag') {
    const tags = Array.from(root.querySelectorAll('.atlas-chrono-tools button.atlas-chrono-tag'));
    target = tags.find((node) => node.getAttribute('data-chrono-kbd-tag') === tracked.tag) || tags[0] || null;
  } else if (tracked.role === 'back') {
    target = root.querySelector('#nav-c2a-back');
  } else if (tracked.role === 'skip') {
    target = root.querySelector('.chrono-kbd-skip');
  }
  if (target && !target.disabled && typeof target.focus === 'function') {
    target.focus({ preventScroll: true });
  }
}

/* E05-05 / E05-06 / E05-07 : même geste (Début/Fin) dans chaque sous-liste. */
function bindHomeEnd(container, selector, role, describe) {
  if (!container) return;
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Home' && event.key !== 'End') return;
    /* Ne détourne Début/Fin que si le focus est déjà dans un élément de la
       sous-liste (par exemple pas dans le champ de recherche des outils). */
    const origin = event.target instanceof Element ? event.target.closest(selector) : null;
    if (!origin || !container.contains(origin)) return;
    const nodes = Array.from(container.querySelectorAll(selector)).filter((node) => !node.disabled);
    if (!nodes.length) return;
    /* Touches non gérées par le routeur global (keyboard.js:171) : on peut
       les consommer sans empiéter sur les flèches documentées de la vue. */
    event.preventDefault();
    event.stopPropagation();
    const target = event.key === 'Home' ? nodes[0] : nodes[nodes.length - 1];
    target.focus();
    announce(describe(target, nodes));
  }, true);
}

/* E05-08 : la recherche est un champ éditable, donc ignoré par le routeur
 * global — ces touches restent strictement locales. */
function bindSearch(search, list) {
  if (!search) return;
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!search.value) return;
      event.preventDefault();
      event.stopPropagation();
      search.value = '';
      /* Réutilise le gestionnaire de chronology.js:320 : l'état local et le
         filtre sont recalculés par la vue, sans import du store ici. */
      search.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      const first = list && list.querySelector('.event-card');
      if (!first) return;
      event.preventDefault();
      event.stopPropagation();
      first.focus();
      announce(`Premier repère affiché : ${(first.textContent || '').trim().slice(0, 72)}. Entrée pour ouvrir le détail.`);
    }
  }, true);
}

register('E05', (ctx) => {
  const stage = ctx && ctx.stage;
  const layout = ctx && ctx.layout;
  if (!stage || !layout) return;
  const el = ctx && typeof ctx.el === 'function' ? ctx.el : createEl;
  const css = ctx && typeof ctx.css === 'function' ? ctx.css : () => {};

  css(CSS_ID, CSS); /* E05-01 à E05-10 : grille de focus unique de la lentille */

  const main = layout.querySelector('.chronology-main') || byId('atlas-chrono-main');
  if (!main) return;
  currentLayout = layout;
  bindFocusTracking();

  const eraNav = byId('atlas-chrono-eras', layout);
  const eraList = eraNav ? eraNav.querySelector('.atlas-chrono-era-list') : null;
  const tools = byId('atlas-chrono-tools', layout);
  const search = byId('atlas-chrono-search', layout);
  const list = byId('atlas-chrono-events', layout);
  const back = byId('nav-c2a-back', layout);

  ensureLive(el);                                   /* E05-09 */
  const help = buildHelp(main, el);                 /* E05-01 */
  buildReadout(main, el);                           /* E05-09 */
  buildSkipLinks(main, el);                         /* E05-04 */
  applyAria(eraNav, eraList, tools, search, list, help, back); /* E05-02, E05-03 */

  const eras = eraNav ? Array.from(eraNav.querySelectorAll('.era-band')) : [];
  const cards = list ? Array.from(list.querySelectorAll('.event-card')) : [];
  const tags = tools ? Array.from(tools.querySelectorAll('button.atlas-chrono-tag')) : [];

  /* E05-03 : chaque contrôle porte son rôle sémantique de restauration. */
  eras.forEach((node, index) => {
    mark([node], node.getAttribute('aria-current') === 'true' ? 'current-era' : 'era');
    node.setAttribute('data-chrono-kbd-tag', `${index + 1}/${eras.length}`);
  });
  cards.forEach((node, index) => {
    mark([node], node.getAttribute('aria-current') === 'true' ? 'current-event' : 'event');
    node.setAttribute('data-chrono-kbd-tag', `${index + 1}/${cards.length}`);
  });
  tags.forEach((node) => {
    mark([node], 'tag');
    node.setAttribute('data-chrono-kbd-tag', node.getAttribute('data-tag') || '');
  });
  mark(search ? [search] : [], 'search');
  mark(back ? [back] : [], 'back');

  /* E05-05 : ères — l'état courant est déjà seul marqué aria-current. */
  bindHomeEnd(eraNav, '.era-band', 'era', (node, nodes) => {
    const index = nodes.indexOf(node) + 1;
    return `Ère ${index} sur ${nodes.length} : ${(node.textContent || '').trim().slice(0, 60)}.`;
  });

  /* E05-06 : repères. */
  bindHomeEnd(list, '.event-card', 'event', (node, nodes) => {
    const index = nodes.indexOf(node) + 1;
    return `Repère ${index} sur ${nodes.length} : ${(node.textContent || '').trim().slice(0, 60)}. Entrée pour ouvrir le détail.`;
  });

  /* E05-07 : puces de filtre — la bascule reste indépendante (aria-pressed
     existant non modifié) ; seul le déplacement du focus est ajouté. */
  bindHomeEnd(tools, 'button.atlas-chrono-tag', 'tag', (node, nodes) => {
    const pressed = node.getAttribute('aria-pressed') === 'true';
    return `Thème ${node.textContent.trim()}, ${pressed ? 'actif' : 'inactif'}, ${nodes.indexOf(node) + 1} sur ${nodes.length}.`;
  });

  bindSearch(search, list); /* E05-08 */

  /* E05-10 : la micro-tâche s'exécute après la restoration de la coque
     (shell.js:562) ; elle ne touche qu'un focus réellement perdu. */
  queueMicrotask(restoreFocus);
});
