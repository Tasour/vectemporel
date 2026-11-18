import { register } from './registry.js';

/* Lentille E062 — vue CHRONOLOGIE.
   Thème : persistance du filtre local à travers les re-renders.

   Le filtre de la vue vit dans `local` (chronology.js:16), variable privée non
   exportée : une lentille ne peut ni l'importer (cycle + second propriétaire)
   ni s'y abonner. Elle maintient donc SON PROPRE miroir, alimenté par des
   écouteurs délégués sur `document` (qui survivent au innerHTML de la coque),
   puis le réapplique au DOM reconstruit à chaque rendu (chronology.js:539).

   Zéro réseau, zéro `Math.random`, zéro `console.*`, zéro boucle rAF, zéro timer.
   Les identifiants créés commencent par `e062` (jamais `-e062`) afin de ne pas
   tomber sous le masque de diagnostics `/.*-e\d\d/`. */

const MIRROR = {
  ready: false,
  bound: false,
  query: '',
  tag: null,
  hasQuery: false,
  hasTag: false,
  caret: null,
  caretDirty: false,
  renders: 0,
  restorations: 0,
  lastAnnounced: 0,
  lastOrphanAnnounced: null,
  suppressRestore: false,
  root: null,
  bar: null,
  motionQuery: null,
};

const RULES = `
.e062-filter-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(230,185,111,.06);font-size:10px;color:var(--ink-soft)}
.e062-label{color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
.e062-value{color:var(--ink);min-width:0;overflow-wrap:anywhere}
.e062-count{color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
.e062-filter-bar.e062-orphan{border-color:rgba(230,185,111,.5);background:rgba(230,185,111,.1)}
.e062-orphan-text{color:var(--gold-bright);font-size:9px;line-height:1.4}
.e062-reset{min-height:32px;margin-left:auto;padding:3px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.e062-reset:hover{border-color:var(--gold)}
.e062-reset:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e062-filter-bar.e062-reduced,.e062-filter-bar.e062-reduced *{transition:none!important;animation:none!important}
@media (max-width:620px){.e062-filter-bar{padding:6px 7px;font-size:9px}.e062-reset{margin-left:0}}
`;

/* E062-08 : un seul point de création, avec garde d'existence. Un nœud déjà
   connecté est réutilisé et déplacé vers le parent courant, jamais dupliqué. */
function ensureNode(id, tag, className, parent, make) {
  let node = document.getElementById(id);
  if (!node) node = make();
  node.id = id;
  if (className) node.className = className;
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function allTagButtons(scope) {
  if (!scope || typeof scope.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(scope.querySelectorAll('button[data-tag]'));
}

function pressedTag(scope) {
  const nodes = allTagButtons(scope).filter((button) => button.getAttribute('aria-pressed') === 'true');
  return nodes.length ? nodes[0].dataset.tag || null : null;
}

function setPressedTag(scope, tag) {
  let changed = 0;
  allTagButtons(scope).forEach((button) => {
    const wanted = Boolean(tag) && button.dataset.tag === tag;
    if ((button.getAttribute('aria-pressed') === 'true') !== wanted) {
      button.setAttribute('aria-pressed', wanted ? 'true' : 'false');
      changed += 1;
    }
  });
  return changed;
}

function describeFilter() {
  const parts = [];
  if (MIRROR.query.trim()) parts.push(`requête « ${MIRROR.query.trim()} »`);
  if (MIRROR.tag) parts.push(`thème « ${MIRROR.tag} »`);
  return parts.length ? parts.join(' et ') : 'aucun filtre';
}

/* E062-01 : les écouteurs sont délégués sur `document`, qui survit au
   innerHTML de la coque. Captures : elles voient l'état AVANT le handler de la
   vue (chronology.js:320, 336, 450), donc la nouvelle valeur du miroir est
   disponible avant le re-render déclenché par `set({}, 'chrono-filter')`. */
function bindDelegates() {
  if (MIRROR.bound) return;
  MIRROR.bound = true;

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!target || target.id !== 'atlas-chrono-search') return;
    MIRROR.query = typeof target.value === 'string' ? target.value : '';
    MIRROR.hasQuery = true;
    MIRROR.suppressRestore = false;
    try {
      MIRROR.caret = typeof target.selectionStart === 'number' ? target.selectionStart : null;
      MIRROR.caretDirty = MIRROR.caret !== null;
    } catch {
      MIRROR.caret = null;
      MIRROR.caretDirty = false;
    }
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    if (target.closest('[data-e062-reset]') || target.closest('#nav-c2a-empty-filter button')) {
      MIRROR.query = '';
      MIRROR.tag = null;
      MIRROR.hasQuery = true;
      MIRROR.hasTag = true;
      MIRROR.caret = null;
      MIRROR.caretDirty = false;
      MIRROR.suppressRestore = false;
      return;
    }
    const button = target.closest('button[data-tag]');
    if (!button) return;
    const tag = button.dataset.tag || null;
    if (!tag) return;
    const wasPressed = button.getAttribute('aria-pressed') === 'true';
    MIRROR.tag = wasPressed ? null : tag;
    MIRROR.hasTag = true;
    MIRROR.suppressRestore = false;
  }, true);
}

/* E062-09 : une seule écoute de préférence de mouvement, gardée au niveau
   module ; elle ne fait que rafraîchir des marqueurs, sans annonce ni rAF. */
function bindMotion() {
  if (MIRROR.motionQuery || typeof window.matchMedia !== 'function') return;
  try {
    MIRROR.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => {
      const reduced = Boolean(MIRROR.motionQuery && MIRROR.motionQuery.matches);
      if (MIRROR.root && MIRROR.root.dataset) MIRROR.root.dataset.e062Reduced = reduced ? '1' : '0';
      if (MIRROR.bar) MIRROR.bar.classList.toggle('e062-reduced', reduced);
    };
    if (typeof MIRROR.motionQuery.addEventListener === 'function') {
      MIRROR.motionQuery.addEventListener('change', refresh);
    } else if (typeof MIRROR.motionQuery.addListener === 'function') {
      MIRROR.motionQuery.addListener(refresh);
    }
  } catch {
    MIRROR.motionQuery = null;
  }
}

/* E062-05 et E062-06 : bandeau persistant, reconstruit à chaque passe mais
   identifié une seule fois. Il rend le filtre visible même quand la liste a
   des résultats (le reset de la vue n'existe que dans l'état vide, :361). */
function buildBar(ctx, tools, state) {
  const bar = ensureNode('e062-filter-bar', 'div', 'e062-filter-bar', tools, () => ctx.el('div'));
  if (!state.active && !state.orphan) {
    if (bar.parentNode) bar.parentNode.removeChild(bar);
    MIRROR.bar = null;
    return;
  }
  if (tools.firstChild !== bar) tools.insertBefore(bar, tools.firstChild);
  bar.textContent = '';

  const reduced = Boolean(ctx.reducedMotion && ctx.reducedMotion());
  bar.classList.toggle('e062-reduced', reduced);
  bar.classList.toggle('e062-orphan', Boolean(state.orphan));

  bar.appendChild(ctx.el('span', 'e062-label', 'Filtre local actif'));
  bar.appendChild(ctx.el('span', 'e062-value', describeFilter()));
  bar.appendChild(ctx.el('span', 'e062-count', `Restaurations : ${MIRROR.restorations}`));
  if (state.orphan) {
    bar.appendChild(ctx.el('span', 'e062-orphan-text', `Thème « ${MIRROR.tag} » absent de ce pays — filtre conservé.`));
  }

  /* Garde d'existence : le contenu du bandeau vient d'être vidé, donc un
     éventuel ancien bouton est soit déjà parti, soit déplacé ici — jamais
     deux #e062-reset connectés. */
  const reset = ensureNode('e062-reset', 'button', 'e062-reset', bar, () => ctx.el('button'));
  reset.textContent = 'Effacer le filtre';
  reset.type = 'button';
  reset.dataset.e062Reset = '1';
  reset.setAttribute('aria-label', 'Effacer le filtre local de la chronologie');
  MIRROR.bar = bar;
}

register('E062', (ctx) => {
  /* E062-08 : cssOnce injecte une seule feuille #chronology-e062 dans <head>,
     qui survit à la reconstruction du stage. */
  ctx.css('chronology-e062', RULES);
  bindDelegates();
  bindMotion();

  const tools = document.getElementById('atlas-chrono-tools');
  const scope = ctx.stage || tools;
  const root = ctx.layout && ctx.layout.dataset ? ctx.layout : null;
  MIRROR.root = root;
  MIRROR.renders += 1;
  if (root) root.dataset.e062Renders = String(MIRROR.renders);

  if (!tools) return; // re-render sans zone d'outils : le miroir reste intact

  const search = tools.querySelector('#atlas-chrono-search');
  const domQuery = search && typeof search.value === 'string' ? search.value : '';
  const domTag = pressedTag(scope);

  /* E062-01 : première passe — on adopte l'état que la vue a déjà restauré
     depuis son `local` (chronology.js:319, 334, 449) comme ligne de base. */
  if (!MIRROR.ready) {
    MIRROR.ready = true;
    MIRROR.query = domQuery;
    MIRROR.hasQuery = true;
    MIRROR.tag = domTag;
    MIRROR.hasTag = true;
  }

  /* E062-02 : si un re-render a laissé la recherche vide alors que le miroir
     garde une requête, on la réinjecte. Une valeur DOM non vide est au
     contraire plus récente (saisie utilisateur) : elle est adoptée. */
  let restored = false;
  if (search && MIRROR.query !== domQuery) {
    if (domQuery === '' && MIRROR.query !== '' && !MIRROR.suppressRestore) {
      search.value = MIRROR.query;
      MIRROR.restorations += 1;
      restored = true;
      MIRROR.caretDirty = true;
    } else {
      MIRROR.query = domQuery;
    }
  }

  /* E062-03 : le input est recréé à chaque frappe (set({}, 'chrono-filter'),
     :323) ; sans restauration le curseur saute en fin de chaîne. On ne
     réapplique la sélection qu'après une saisie réelle (caretDirty). */
  if (search && MIRROR.caretDirty && MIRROR.caret !== null && search.value === MIRROR.query) {
    try {
      const position = Math.max(0, Math.min(MIRROR.caret, search.value.length));
      search.setSelectionRange(position, position);
    } catch {
      /* navigateur : sélection non applicable sur ce type de champ */
    }
    MIRROR.caretDirty = false;
  }

  /* E062-04 : les puces de la barre (:334) ET celles de la fiche (:449)
     doivent refléter le même tag, sinon l'état `aria-pressed` diverge. */
  const buttons = allTagButtons(scope);
  const matching = MIRROR.tag ? buttons.filter((button) => button.dataset.tag === MIRROR.tag) : [];
  if (MIRROR.tag && MIRROR.tag !== domTag) {
    if (matching.length && !MIRROR.suppressRestore && setPressedTag(scope, MIRROR.tag)) {
      MIRROR.restorations += 1;
      restored = true;
    }
  } else if (!MIRROR.tag && domTag && !MIRROR.suppressRestore && setPressedTag(scope, null)) {
    MIRROR.restorations += 1;
    restored = true;
  }

  /* E062-05 : `local.tag` survit à un changement de pays (:16, :337, :451).
     Si aucune puce ne porte plus ce tag, le filtre est fantôme : on le signale
     au lieu de laisser une liste filtrée sans cause visible. */
  const orphan = Boolean(MIRROR.tag) && matching.length === 0;

  /* E062-06 : bandeau + bouton « Effacer le filtre » toujours accessibles. */
  buildBar(ctx, tools, { active: Boolean(MIRROR.query.trim() || MIRROR.tag), orphan });

  /* E062-07 : annonce via la région C2 hors #app (:121-138), une seule fois
     par passe de restauration, sans bavardage sur les rendus ordinaires. */
  const live = document.getElementById('nav-c2a-live');
  if (restored && MIRROR.restorations > MIRROR.lastAnnounced) {
    if (live) live.textContent = `Filtre local restauré après actualisation : ${describeFilter()}.`;
    MIRROR.lastAnnounced = MIRROR.restorations;
  }
  if (orphan && MIRROR.lastOrphanAnnounced !== MIRROR.tag) {
    if (live) live.textContent = `Thème « ${MIRROR.tag} » indisponible pour ce pays. Le filtre est conservé ; utilisez « Effacer le filtre ».`;
    MIRROR.lastOrphanAnnounced = MIRROR.tag;
  } else if (!orphan) {
    MIRROR.lastOrphanAnnounced = null;
  }

  /* E062-10 : miroir auditable et garde de dérive. Une boucle de restaurations
     (plus de deux fois le nombre de rendus) désactive la réinjection auto
     jusqu'à une nouvelle intention explicite de l'utilisateur. */
  const drift = MIRROR.restorations > Math.max(2, MIRROR.renders * 2);
  if (drift) MIRROR.suppressRestore = true;
  if (root) {
    root.dataset.e062Query = MIRROR.query;
    root.dataset.e062Tag = MIRROR.tag || '';
    root.dataset.e062Restores = String(MIRROR.restorations);
    root.dataset.e062Orphan = orphan ? '1' : '0';
    root.dataset.e062Drift = drift ? '1' : '0';
    root.dataset.e062Reduced = ctx.reducedMotion && ctx.reducedMotion() ? '1' : '0';
  }
});
