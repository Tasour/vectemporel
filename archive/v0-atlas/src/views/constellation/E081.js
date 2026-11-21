import { register } from './registry.js';

/* Lentille E081 — Accessibilité clavier appliquée au chemin de connexion de la
 * vue Constellation. Le « chemin de connexion » est la chaîne soleil (ère) →
 * planète (repère) → lune (point vérifié), matérialisée par les segments SVG
 * `.const-edge.is-path` (constellation.js:175-183, 288-341).
 *
 * Dix chantiers, tous implémentés. La lentille n'appelle aucun setter du store :
 * ni selectEra, ni selectEvent, ni set, ni le routeur. Elle lit le DOM produit
 * par renderConstellation() et n'y ajoute que des attributs, un contour clavier,
 * un lien d'évitement, une ligne de consignes et une région live.
 *
 * Contrat : register('E081', ctx => {...}) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() } (registry.js:28-44).
 * Aucun fichier partagé modifié, aucune écriture dans la console, aucun appel
 * réseau, aucune source aléatoire, aucun minuteur, aucune boucle d'animation
 * propre, aucune ressource distante.
 */

const SKIP_ID = 'e081-skip';
const ROADMAP_ID = 'e081-roadmap';
const STATUS_ID = 'e081-status';

/* État local du module : déterministe, conservé entre les rendus successifs. */
let installs = 0;
let keyEvents = 0;
let lastKey = null;
let keyHooked = false;
let focusHooked = false;
let previousFingerprint = null;
let focusKey = null;
let tabSequence = [];

const CSS = `
.constellation-layout .e081-skip {
  position: absolute; left: 8px; top: 8px; z-index: 20;
  transform: translateY(-160%);
  padding: 4px 8px; min-height: 24px;
  border: 1px solid var(--line); border-radius: 4px;
  background: var(--bg, #101018); color: var(--text, #e9e6f2);
  font-size: 10px;
}
.constellation-layout .e081-skip:focus,
.constellation-layout .e081-skip:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--gold-bright, #e7b96a);
  outline-offset: 2px;
}
.constellation-layout .constellation-field [data-e081-in-path="1"]:focus-visible {
  outline: 3px solid var(--gold-bright, #e7b96a);
  outline-offset: 3px;
}
.constellation-layout .constellation-field [data-e081-focused="1"] {
  box-shadow: 0 0 0 2px var(--violet, #b28bdd);
}
.constellation-layout #${ROADMAP_ID} {
  margin: 6px 0 0; color: var(--muted-2, #9a94ad);
  font-size: 9px; line-height: 1.5;
}
.constellation-layout #${STATUS_ID} {
  margin: 4px 0 0; padding: 5px 8px;
  border: 1px solid var(--line, #2a2836); border-radius: 5px;
  color: var(--muted-2, #9a94ad); font-size: 9px; line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.constellation-layout[data-e081-reduced="1"] .e081-skip { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  .constellation-layout .e081-skip { transform: none; transition: none !important; }
  .constellation-layout .constellation-field [data-e081-in-path="1"] { transition: none !important; }
}`;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune écriture dans la console */ }
}

/* Empreinte FNV-1a 32 bits, sans aléa ni horloge : identifiant de version. */
function fingerprint(source) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function currentLayout() {
  return typeof document !== 'undefined'
    ? document.querySelector('.constellation-layout') : null;
}

function currentStatus() {
  return typeof document !== 'undefined'
    ? document.getElementById(STATUS_ID) : null;
}

function isPathNode(node) {
  return !!(node && node.nodeType === 1 && typeof node.closest === 'function'
    && node.closest('.constellation-field')
    && node.closest('[data-const-key]') === node);
}

/* Lecture unique du chemin : une seule passe avant toute écriture. */
function readPath(layout) {
  const field = layout.querySelector('.constellation-field');
  const nodes = field
    ? Array.prototype.slice.call(field.querySelectorAll('[data-const-key]')) : [];
  const edges = field
    ? field.querySelectorAll('.constellation-edges line.is-path') : [];
  const active = nodes.filter((node) =>
    node.classList.contains('is-active') || node.getAttribute('aria-current') === 'true');
  const level = (node) => {
    const key = node ? (node.dataset.constKey || '') : '';
    if (key.indexOf('moon:') === 0) return 3;
    if (key.indexOf('planet:') === 0) return 2;
    if (key.indexOf('sun:') === 0) return 1;
    return 0;
  };
  const chosen = active.length ? active[active.length - 1] : null;
  return {
    field,
    nodes,
    edgeCount: edges.length,
    active,
    chosen,
    depth: level(chosen),
    label: chosen
      ? (chosen.dataset.label || chosen.getAttribute('aria-label') || chosen.dataset.constKey || '')
      : '',
  };
}

/* Écouteur de capture unique : observe les touches sur les nœuds du chemin. */
function onPathKeydown(event) {
  if (!event || !isPathNode(event.target)) return;
  const key = event.key || '';
  keyEvents += 1;
  lastKey = key;
  const node = event.target;
  node.dataset.e081Key = key;
  const lay = currentLayout();
  if (lay) lay.dataset.e081LastKey = key;
  const status = currentStatus();
  if (status && status.textContent) {
    status.dataset.e081Touched = String(keyEvents);
  }
}

/* Second écouteur de capture unique : mémorise le nœud focalisé du chemin. */
function onPathFocus(event) {
  if (!event || !isPathNode(event.target)) return;
  focusKey = event.target.dataset.constKey || null;
  event.target.dataset.e081Focused = '1';
  const lay = currentLayout();
  if (lay) lay.dataset.e081Focus = focusKey || 'none';
}

/* Home/End : premier / dernier nœud du palier courant, sans toucher au store. */
function onFieldKeydown(event) {
  if (!event || !event.target || typeof event.target.closest !== 'function') return;
  const field = event.target.closest('.constellation-field');
  if (!field) return;
  const key = event.key || '';
  if (key !== 'Home' && key !== 'End') return;
  const layer = event.target.closest('.const-layer');
  const scope = layer || field;
  const nodes = Array.prototype.slice.call(scope.querySelectorAll('[data-const-key]'));
  if (!nodes.length) return;
  const target = key === 'Home' ? nodes[0] : nodes[nodes.length - 1];
  event.preventDefault();
  target.focus({ preventScroll: true });
  field.dataset.e081Jump = key;
}

/* Lien d'évitement : amène le focus au nœud actif du chemin. */
function onSkipActivate(event) {
  if (event) event.preventDefault();
  const lay = currentLayout();
  if (!lay) return;
  const field = lay.querySelector('.constellation-field');
  if (!field) return;
  const nodes = Array.prototype.slice.call(field.querySelectorAll('[data-const-key]'));
  const chosen = nodes.find((node) =>
    node.classList.contains('is-active') || node.getAttribute('aria-current') === 'true')
    || nodes[0];
  if (chosen) {
    chosen.focus({ preventScroll: true });
    field.dataset.e081SkipUsed = '1';
  }
}

register('E081', (ctx) => {
  /* Garde d'entrée : aucun ajout DOM tant que ctx.layout n'est pas exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  const reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;

  /* E081-01 — Cartographie déterministe du chemin de connexion. */
  const path = readPath(layout);
  installs += 1;
  layout.dataset.e081Nodes = String(path.nodes.length);
  layout.dataset.e081Edges = String(path.edgeCount);

  /* E081-02 — Séquence de tabulation balisée le long du chemin. */
  safe(() => {
    tabSequence = [];
    path.nodes.forEach((node, index) => {
      const key = node.dataset.constKey || '';
      const inPath = key.indexOf('sun:') === 0 || key.indexOf('planet:') === 0
        || key.indexOf('moon:') === 0;
      if (!inPath) return;
      node.dataset.e081InPath = '1';
      node.dataset.e081Seq = String(index);
      node.setAttribute('tabindex', '0');
      tabSequence.push(key);
    });
    layout.dataset.e081Sequence = tabSequence.join('|');
  });

  /* E081-03 — Profondeur atteinte et fil d'Ariane du chemin. */
  safe(() => {
    const breadcrumb = path.depth >= 3 ? 'ère → repère → point'
      : path.depth === 2 ? 'ère → repère'
      : path.depth === 1 ? 'ère' : 'aucun';
    layout.dataset.e081Depth = String(path.depth);
    layout.dataset.e081Breadcrumb = breadcrumb;
    layout.dataset.e081Choice = path.label || 'none';
  });

  /* E081-04 — Écouteur keydown de capture unique, installé une seule fois. */
  safe(() => {
    if (typeof document !== 'undefined' && !keyHooked) {
      keyHooked = true;
      window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, onPathKeydown);
    }
    layout.dataset.e081Keystrokes = String(keyEvents);
    layout.dataset.e081LastKey = lastKey || 'none';
  });

  /* E081-05 — Raccourcis Home/End : premier/dernier nœud du palier courant. */
  safe(() => {
    const field = path.field;
    if (field && field.dataset.e081JumpHook !== '1') {
      field.dataset.e081JumpHook = '1';
      field.addEventListener('keydown', onFieldKeydown);
    }
    layout.dataset.e081JumpHook = field ? '1' : '0';
  });

  /* E081-06 — Focus visible : marquage, feuille unique et mouvement réduit. */
  safe(() => {
    if (typeof document !== 'undefined' && !focusHooked) {
      focusHooked = true;
      document.addEventListener('focusin', onPathFocus, true);
    }
    path.nodes.forEach((node) => { delete node.dataset.e081Focused; });
    if (focusKey) {
      const remembered = path.nodes.find((node) => (node.dataset.constKey || '') === focusKey);
      if (remembered) remembered.dataset.e081Focused = '1';
    }
    layout.dataset.e081Reduced = reduced ? '1' : '0';
    ctx.css('constellation-e081', CSS);
  });

  /* E081-07 — Lien d'évitement : un seul bouton vers le nœud actif du chemin. */
  safe(() => {
    let skip = layout.querySelector(`#${SKIP_ID}`);
    if (!skip) {
      skip = ctx.el('button', 'e081-skip', 'Aller au chemin de connexion');
      skip.id = SKIP_ID;
      skip.type = 'button';
      skip.addEventListener('click', onSkipActivate);
      layout.insertBefore(skip, layout.firstChild);
    }
    skip.dataset.e081Ready = '1';
  });

  /* E081-08 — Consignes clavier visibles, rattachées au champ par aria-describedby. */
  safe(() => {
    let roadmap = layout.querySelector(`#${ROADMAP_ID}`);
    if (!roadmap) {
      roadmap = ctx.el('p', 'e081-roadmap',
        'Chemin de connexion : ère → repère → point. Tab parcourt les nœuds, ← → change de repère, ↑ ↓ change d’ère, Home/End vont au premier ou au dernier nœud du palier, Entrée ouvre le détail.');
      roadmap.id = ROADMAP_ID;
      const caption = layout.querySelector('.constellation-caption') || layout;
      caption.appendChild(roadmap);
    }
    const field = path.field;
    if (field) {
      const existing = field.getAttribute('aria-describedby') || '';
      if (existing.split(/\s+/).indexOf(ROADMAP_ID) === -1) {
        field.setAttribute('aria-describedby', (existing + ' ' + ROADMAP_ID).trim());
      }
      field.dataset.e081Described = '1';
    }
  });

  /* E081-09 — Région live unique : relevé clavier du chemin. */
  let status = null;
  safe(() => {
    status = layout.querySelector(`#${STATUS_ID}`);
    if (!status) {
      status = ctx.el('p', 'e081-status');
      status.id = STATUS_ID;
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      const caption = layout.querySelector('.constellation-caption') || layout;
      caption.appendChild(status);
    }
  });

  /* E081-10 — Empreinte de stabilité du chemin et relevé consolidé. */
  safe(() => {
    const source = tabSequence.join('|') + '#'
      + layout.dataset.e081Depth + '#' + layout.dataset.e081Choice;
    const empreinte = fingerprint(source);
    const stable = previousFingerprint === null || previousFingerprint === empreinte;
    layout.dataset.e081Fingerprint = empreinte;
    layout.dataset.e081Renders = String(installs);
    layout.dataset.e081Stable = stable ? '1' : '0';
    previousFingerprint = empreinte;

    if (status) {
      status.textContent = `E081 · nœuds ${path.nodes.length} · traits ${path.edgeCount} · profondeur ${path.depth} (${layout.dataset.e081Breadcrumb}) · choix ${path.label || 'aucun'} · touches ${keyEvents}${lastKey ? ', dernière ' + lastKey : ''} · focus ${focusKey || 'aucun'} · version ${empreinte} · stable ${stable ? 'oui' : 'non'} · rendus ${installs}.`;
    }
  });
});
