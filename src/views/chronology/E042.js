import { register } from './registry.js';

/* Lentille E042 — vue CHRONOLOGIE (vectemporel-atlas).
   Thème : états vides, messages d'aide et récupération d'erreur.

   La coque reconstruisant le DOM à chaque rendu (chronology.js:539), les nœuds
   posés dans le layout disparaissent ; survivent en revanche la feuille de style
   (registry.js:13-19), la région live hors #app et les écouteurs délégués sur
   `document`. L'état de la lentille est donc mémorisé au niveau module, comme le
   filtre local de la vue (chronology.js:16) et le miroir de E062.

   Zéro réseau, zéro aléa, zéro journalisation, zéro boucle d'animation, zéro timer.
   Les identifiants créés commencent par `e042` (jamais `-e042`) pour rester hors
   du masque de diagnostics `/.*-e\d\d/`. */

const STATE = {
  renders: 0,
  inserts: 0,
  announcements: 0,
  imgErrors: 0,
  lastImgAnnounced: -1,
  helpOpen: false,
  bound: false,
  motionBound: false,
  motion: null,
  live: null,
  make: null,
  root: null,
};

const RULES = `
.e042-help-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}
.e042-help-btn{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer}
.e042-help-btn:hover{border-color:var(--gold)}
.e042-help-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e042-help-panel{margin:0 0 12px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft);font-size:11px;line-height:1.55}
.e042-help-panel[hidden]{display:none}
.e042-help-panel p{margin:0 0 6px}
.e042-help-panel p:last-child{margin-bottom:0}
.e042-empty-note{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.5}
.e042-cta{min-height:36px;margin-top:8px;padding:4px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer}
.e042-cta:hover{border-color:var(--gold)}
.e042-cta:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e042-tips{margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
.e042-tip{min-height:36px;margin:4px 4px 0 0;padding:3px 9px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--gold);font-size:9px;cursor:pointer}
.e042-tip:hover{border-color:var(--gold)}
.e042-tip:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e042 .atlas-chrono-empty button{min-height:36px;font-size:10px}
.e042-img-failed{display:none!important}
.e042-img-fallback{display:block;margin:6px 0;padding:8px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:10px;line-height:1.5}
.e042-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){.e042-help-panel{padding:8px;font-size:10px}.e042-cta,.e042-help-btn{min-height:36px;font-size:9px}}
@media (prefers-reduced-motion:reduce){.chronology-e042 *{transition:none!important;animation:none!important}}
.chronology-e042.e042-reduced *{transition:none!important;animation:none!important}
`;

/* Un seul point de création, avec garde d'existence : un nœud déjà connecté
   est réutilisé et déplacé vers le parent courant, jamais dupliqué (E042-10). */
function ensureNode(id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) node = STATE.make(tag);
  node.id = id;
  if (className) node.className = className;
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function make(tag, className, text) {
  return STATE.make(tag, className, text);
}

/* E042-07 : région live dédiée, unique et hors #app, donc insensible au
   innerHTML de la coque. Elle ne reçoit qu'un message par action explicite. */
function ensureLive() {
  if (STATE.live && STATE.live.isConnected) return STATE.live;
  const existing = document.getElementById('e042-live');
  if (existing && existing.parentNode) {
    STATE.live = existing;
    return existing;
  }
  const node = make('p', 'e042-sr-only');
  node.id = 'e042-live';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  document.body.appendChild(node);
  STATE.live = node;
  return node;
}

function say(message) {
  const live = ensureLive();
  if (!live || !message) return;
  live.textContent = message;
  STATE.announcements += 1;
  if (STATE.root && STATE.root.dataset) {
    STATE.root.dataset.e042Announcements = String(STATE.announcements);
  }
}

function focusFirst(selector) {
  const node = document.querySelector(selector);
  if (node && typeof node.focus === 'function') {
    node.focus();
    return true;
  }
  return false;
}

/* E042-01 : panneau d'aide discrétionnaire. Le bouton et le panneau sont
   pilotés par `aria-expanded` / `hidden`, sans état porté par la seule couleur. */
function buildHelp(tools) {
  if (!tools) return;

  const bar = ensureNode('e042-help-bar', 'div', 'e042-help-bar', tools);
  if (tools.firstChild !== bar) tools.insertBefore(bar, tools.firstChild);

  const button = ensureNode('e042-help-btn', 'button', 'e042-help-btn', bar);
  button.type = 'button';
  button.dataset.e042HelpToggle = '1';
  button.textContent = STATE.helpOpen ? 'Masquer l’aide' : 'Aide à la recherche';
  button.setAttribute('aria-expanded', STATE.helpOpen ? 'true' : 'false');
  button.setAttribute('aria-controls', 'e042-help-panel');

  const panel = ensureNode('e042-help-panel', 'div', 'e042-help-panel', tools);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Aide à la recherche et aux états vides');
  panel.hidden = !STATE.helpOpen;
  if (!panel.firstChild) {
    panel.appendChild(make('p', '', 'Recherche — tapez un millésime (ex. 1715), un thème ou un mot du texte des points. La recherche couvre les titres, sous-titres, résumés, années, thèmes et textes des points.'));
    panel.appendChild(make('p', '', 'Filtres — les puces de thèmes filtrent la liste ; un second clic sur la même puce retire le filtre. « Réinitialiser le filtre » efface recherche et thème en une fois.'));
    panel.appendChild(make('p', '', 'États vides — si une ère ou un repère n’a pas de contenu documenté, un bouton vous ramène aux contrôles disponibles ; aucune information n’est perdue.'));
    panel.appendChild(make('p', '', 'Clavier — → repère suivant · ↑ ère précédente · ↓ ère suivante · Entrée détail · ? aide.'));
  }
}

/* E042-02, -03, -04 : sortie explicite de chaque état vide. Le marqueur
   `data-e042-action` rend l'insertion idempotente sur un même DOM. */
function addEmptyAction(container, marker, text, note) {
  if (!container || container.querySelector(`[data-e042-action="${marker}"]`)) return false;
  if (note) container.appendChild(make('p', 'e042-empty-note', note));
  const button = make('button', 'e042-cta', text);
  button.type = 'button';
  button.dataset.e042Action = marker;
  button.setAttribute('aria-label', text);
  container.appendChild(button);
  STATE.inserts += 1;
  return true;
}

/* E042-06 : suggestions dérivées des puces déjà présentes dans la barre
   d'outils : aucune valeur inventée, aucun tirage aléatoire. */
function buildSearchTips(emptyFilter, tools) {
  if (!emptyFilter || emptyFilter.querySelector('[data-e042-tips]')) return;
  const tips = make('div', 'e042-tips');
  tips.dataset.e042Tips = '1';
  tips.appendChild(make('p', 'e042-empty-note', 'Termes présents dans ce pays — cliquez pour relancer la recherche :'));

  const tagsNode = tools ? tools.querySelectorAll('button[data-tag]') : [];
  const tags = Array.prototype.slice.call(tagsNode);
  const samples = tags.slice(0, 3).map((button) => button.dataset.tag).filter(Boolean);
  if (!samples.length) samples.push('1715');
  samples.forEach((tag) => {
    const chip = make('button', 'e042-tip', `essayer « ${tag} »`);
    chip.type = 'button';
    chip.dataset.e042Tip = tag;
    chip.setAttribute('aria-label', `Rechercher le terme ${tag}`);
    tips.appendChild(chip);
  });
  emptyFilter.appendChild(tips);
  STATE.inserts += 1;
}

/* E042-01 à -06 : un seul écouteur de clic délégué, délégué sur `document`
   pour survivre aux re-renders (chronology.js:539). */
function onClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;

  if (target.closest('[data-e042-help-toggle]')) {
    STATE.helpOpen = !STATE.helpOpen;
    const button = document.getElementById('e042-help-btn');
    const panel = document.getElementById('e042-help-panel');
    if (button) {
      button.textContent = STATE.helpOpen ? 'Masquer l’aide' : 'Aide à la recherche';
      button.setAttribute('aria-expanded', STATE.helpOpen ? 'true' : 'false');
    }
    if (panel) panel.hidden = !STATE.helpOpen;
    if (STATE.root && STATE.root.dataset) STATE.root.dataset.e042HelpOpen = STATE.helpOpen ? '1' : '0';
    say(STATE.helpOpen ? 'Aide à la recherche affichée.' : 'Aide à la recherche masquée.');
    return;
  }

  const action = target.closest('[data-e042-action]');
  if (action) {
    const kind = action.dataset.e042Action;
    if (kind === 'era') {
      focusFirst('#atlas-chrono-eras .era-band');
      say('Aucun repère dans cette ère. Choisissez une autre ère dans la bande des ères.');
    } else if (kind === 'points') {
      if (!focusFirst('#atlas-chrono-events .event-card')) focusFirst('#atlas-chrono-events');
      say('Aucun point documenté pour ce repère. Choisissez un autre repère dans la liste.');
    } else if (kind === 'aside') {
      if (!focusFirst('#atlas-chrono-search')) focusFirst('#atlas-chrono-events .event-card');
      say('Aucun repère sélectionné. Choisissez un repère dans la liste pour afficher ses points.');
    }
    return;
  }

  const tip = target.closest('[data-e042-tip]');
  if (tip) {
    const term = tip.dataset.e042Tip;
    const search = document.getElementById('atlas-chrono-search');
    if (search && term) {
      search.value = term;
      /* Le handler de la vue (chronology.js:320-325) fait le reste. */
      search.dispatchEvent(new Event('input', { bubbles: true }));
      say(`Recherche lancée sur « ${term} ».`);
    }
    return;
  }

  /* E042-05 : le bouton de la vue (chronology.js:361-370) est agrandi par le
     CSS et confirmé ici, sans toucher à son écouteur ni à son identifiant. */
  if (target.closest('#nav-c2a-empty-filter button')) {
    say('Filtre effacé : la recherche et le thème sont réinitialisés.');
  }
}

/* E042-08 : les `error` d'image ne bululent pas ; écoute en capture. Le
   repli est textuel et ne modifie jamais `src` (zéro requête réseau). */
function onError(event) {
  const img = event.target;
  if (!img || img.nodeType !== 1 || img.tagName !== 'IMG') return;
  if (typeof img.matches !== 'function' || !img.matches('.event-card img, img.aside-image')) return;
  if (img.dataset && img.dataset.e042ImgError === '1') return;
  if (img.dataset) img.dataset.e042ImgError = '1';
  img.classList.add('e042-img-failed');

  const parent = img.parentNode;
  if (!parent) return;
  const fallback = make('span', 'e042-img-fallback', 'Illustration indisponible — le titre et le texte du repère restent consultables.');
  fallback.dataset.e042ImgFallback = '1';
  parent.insertBefore(fallback, img.nextSibling);

  STATE.imgErrors += 1;
  if (STATE.root && STATE.root.dataset) STATE.root.dataset.e042ImgErrors = String(STATE.imgErrors);
  if (STATE.lastImgAnnounced !== STATE.renders) {
    STATE.lastImgAnnounced = STATE.renders;
    say('Une illustration n’a pas pu être chargée ; le texte du repère reste disponible.');
  }
}

function bindDelegates() {
  if (STATE.bound) return;
  STATE.bound = true;
  document.addEventListener('click', onClick, false);
  document.addEventListener('error', onError, true);
}

/* E042-09 : une seule écoute de préférence de mouvement, gardée au niveau
   module ; elle ne fait que rafraîchir des marqueurs, sans annonce ni rAF. */
function bindMotion() {
  if (STATE.motionBound || typeof window.matchMedia !== 'function') return;
  STATE.motionBound = true;
  try {
    STATE.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => {
      const reduced = Boolean(STATE.motion && STATE.motion.matches);
      const root = STATE.root;
      if (root && root.dataset) root.dataset.e042Reduced = reduced ? '1' : '0';
      if (root && root.classList) root.classList.toggle('e042-reduced', reduced);
    };
    if (typeof STATE.motion.addEventListener === 'function') {
      STATE.motion.addEventListener('change', refresh);
    } else if (typeof STATE.motion.addListener === 'function') {
      STATE.motion.addListener(refresh);
    }
  } catch {
    STATE.motion = null;
  }
}

register('E042', (ctx) => {
  /* E042-10 : cssOnce n'injecte qu'une feuille #chronology-e042 dans <head>. */
  ctx.css('chronology-e042', RULES);
  STATE.make = ctx.el || ((tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  });
  bindDelegates();
  bindMotion();
  ensureLive();

  const root = ctx.layout && ctx.layout.dataset ? ctx.layout : null;
  STATE.root = root;
  STATE.renders += 1;
  const reduced = Boolean(ctx.reducedMotion && ctx.reducedMotion());

  if (root) {
    root.classList.add('chronology-e042');
    root.classList.toggle('e042-reduced', reduced);
    root.dataset.e042Renders = String(STATE.renders);
    root.dataset.e042Reduced = reduced ? '1' : '0';
    root.dataset.e042HelpOpen = STATE.helpOpen ? '1' : '0';
    root.dataset.e042Inserts = String(STATE.inserts);
    root.dataset.e042ImgErrors = String(STATE.imgErrors);
    root.dataset.e042Announcements = String(STATE.announcements);
  }

  const tools = document.getElementById('atlas-chrono-tools');
  buildHelp(tools);

  addEmptyAction(
    document.getElementById('nav-c2a-empty-era'),
    'era',
    'Choisir une autre ère',
    'Cette ère ne contient aucun repère documenté. Les autres ères restent disponibles dans la bande « Ères ».'
  );
  addEmptyAction(
    document.getElementById('nav-c2a-empty-points'),
    'points',
    'Choisir un autre repère',
    'Les points vérifiés peuvent manquer pour ce repère ; le résumé et les sources restent consultables.'
  );
  addEmptyAction(
    document.getElementById('nav-c2a-empty-event'),
    'aside',
    'Aller à la liste des repères',
    'Sélectionnez un repère avec Entrée pour afficher ses points vérifiés.'
  );
  buildSearchTips(document.getElementById('nav-c2a-empty-filter'), tools);

  /* Resynchronisation après un re-rendre : l'état vit dans le module, le DOM
     est neuf. Les gardes d'existence évitent tout doublon d'identifiant. */
  const helpButton = document.getElementById('e042-help-btn');
  if (helpButton) {
    helpButton.textContent = STATE.helpOpen ? 'Masquer l’aide' : 'Aide à la recherche';
    helpButton.setAttribute('aria-expanded', STATE.helpOpen ? 'true' : 'false');
  }
  const panel = document.getElementById('e042-help-panel');
  if (panel) panel.hidden = !STATE.helpOpen;
});
