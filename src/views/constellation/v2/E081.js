import { register } from './registry.js';

/* Lentille V2 E081 — accessibilité clavier du chemin de connexion de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, qui
   complètent la passe 1 sans la recopier. Le module est passif : il lit le DOM
   produit par renderConstellation(), n'appelle aucun setter du store, ne fait
   aucun appel réseau, n'utilise aucune source aléatoire et n'installe ni
   minuteur ni boucle d'animation propre. Identifiants et attributs réservés au
   préfixe v2e081. */

const OUTLINE_ID = 'v2e081-outline';
const LEAFNOTE_ID = 'v2e081-leafnote';
const REPORT_ID = 'v2e081-report';
const PEER_KEY = '__v2e081_peer';

const LEVELS = ['sun', 'planet', 'moon'];
const LEVEL_TEXT = { sun: 'ère', planet: 'repère', moon: 'point vérifié' };

let installs = 0;
let peerHooked = false;
let keysHooked = false;
let previousSignature = null;
let originKey = null;
let lastPeerMove = 'aucun';
let keyByLevel = { sun: 0, planet: 0, moon: 0 };

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune écriture dans la console */ }
}

/* Empreinte FNV-1a 32 bits : identifiant de version déterministe, sans horloge. */
function fingerprint(source) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function keyOf(node) {
  return node ? (node.dataset.constKey || '') : '';
}

function levelOf(node) {
  const key = keyOf(node);
  if (key.indexOf('sun:') === 0) return 'sun';
  if (key.indexOf('planet:') === 0) return 'planet';
  if (key.indexOf('moon:') === 0) return 'moon';
  return 'none';
}

function labelOf(node) {
  if (!node) return '';
  return node.dataset.label || node.getAttribute('aria-label') || keyOf(node);
}

function isActive(node) {
  return !!(node && (node.classList.contains('is-active')
    || node.getAttribute('aria-current') === 'true'));
}

function currentLayout() {
  return typeof document !== 'undefined'
    ? document.querySelector('.constellation-layout') : null;
}

/* Lecture unique du chemin : une seule passe avant toute écriture. */
function readTree(layout) {
  const field = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.constellation-field') : null;
  const nodes = field && typeof field.querySelectorAll === 'function'
    ? Array.prototype.slice.call(field.querySelectorAll('[data-const-key]')) : [];
  const byLevel = { sun: [], planet: [], moon: [] };
  nodes.forEach((node) => {
    const level = levelOf(node);
    if (byLevel[level]) byLevel[level].push(node);
  });
  const edges = field && typeof field.querySelectorAll === 'function'
    ? Array.prototype.slice.call(field.querySelectorAll('.constellation-edges line.is-path')) : [];
  return {
    field,
    nodes,
    byLevel,
    edges,
    activeSun: byLevel.sun.find(isActive) || null,
    activePlanet: byLevel.planet.find(isActive) || null,
    activeMoon: byLevel.moon.find(isActive) || null,
  };
}

/* Feuille unique de la lentille, installée une seule fois par cssOnce. */
const CSS = `
.constellation-layout .v2e081-leafnote,
.constellation-layout .v2e081-report {
  margin: 4px 0 0; color: var(--muted-2, #9a94ad);
  font-size: 9px; line-height: 1.5; font-variant-numeric: tabular-nums;
}
.constellation-layout .v2e081-outline {
  margin: 6px 0 0; padding-left: 18px;
  color: var(--text, #e9e6f2); font-size: 10px; line-height: 1.6;
}
.constellation-layout .v2e081-outline-item { margin: 2px 0; }
.constellation-layout .v2e081-outline-btn {
  min-height: 36px; padding: 4px 8px;
  border: 1px solid var(--line, #2a2836); border-radius: 5px;
  background: var(--surface-2, #17151f); color: var(--text, #e9e6f2);
  font-size: 10px; cursor: pointer;
}
.constellation-layout .v2e081-outline-btn:focus-visible {
  outline: 3px solid var(--gold-bright, #e7b96a); outline-offset: 2px;
}
.constellation-layout .constellation-field .v2e081-badge {
  position: absolute; top: -1.7em; left: 50%;
  transform: translateX(-50%);
  padding: 1px 4px; border: 1px solid var(--line, #2a2836); border-radius: 3px;
  background: var(--surface-2, #17151f); color: var(--gold-bright, #e7b96a);
  font-size: 8px; white-space: nowrap; opacity: 0; pointer-events: none;
}
.constellation-layout .constellation-field [data-const-key]:focus-visible > .v2e081-badge {
  opacity: 1;
}
.constellation-layout[data-v2e081-reduced="1"] .v2e081-outline-btn,
.constellation-layout[data-v2e081-reduced="1"] .v2e081-badge { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  .constellation-layout .v2e081-outline-btn,
  .constellation-layout .constellation-field .v2e081-badge { transition: none !important; }
}`;

register('E081', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function') return;
  const layout = ctx.layout;
  const reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
  const tree = readTree(layout);
  installs += 1;

  ctx.css('constellation-v2-e081', CSS);
  layout.dataset.v2e081Renders = String(installs);
  layout.dataset.v2e081Reduced = reduced ? '1' : '0';

  /* E081-01 — Graphe de structure : parent et enfants de chaque nœud du chemin. */
  safe(() => {
    const parents = new Map();
    const children = new Map();
    const sunKey = tree.activeSun ? keyOf(tree.activeSun) : 'none';
    const planetKey = tree.activePlanet ? keyOf(tree.activePlanet) : 'none';
    tree.nodes.forEach((node) => {
      const level = levelOf(node);
      const parent = level === 'sun' ? 'none' : level === 'planet' ? sunKey : planetKey;
      parents.set(node, parent);
      if (parent !== 'none') {
        if (!children.has(parent)) children.set(parent, []);
        children.get(parent).push(keyOf(node));
      }
    });
    tree.nodes.forEach((node) => {
      node.dataset.v2e081Parent = parents.get(node) || 'none';
      node.dataset.v2e081Children = (children.get(keyOf(node)) || []).join('|');
    });
    layout.dataset.v2e081Graph = tree.nodes.length
      ? tree.nodes.map(node => keyOf(node) + '>' + (parents.get(node) || 'none')).join('|')
      : 'vide';
  });

  /* E081-02 — Ordinal dans le palier et badge de position au focus. */
  safe(() => {
    LEVELS.forEach((level) => {
      const list = tree.byLevel[level];
      list.forEach((node, index) => {
        node.dataset.v2e081Ordinal = `${index + 1}/${list.length}`;
        const badges = Array.prototype.slice.call(node.children || []);
        let badge = badges.find(child => child.classList && child.classList.contains('v2e081-badge'));
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'v2e081-badge';
          badge.setAttribute('aria-hidden', 'true');
          node.appendChild(badge);
        }
        badge.textContent = `${LEVEL_TEXT[level]} ${index + 1} sur ${list.length}`;
      });
    });
    layout.dataset.v2e081Sizes = `ère:${tree.byLevel.sun.length}|repère:${tree.byLevel.planet.length}|point:${tree.byLevel.moon.length}`;
  });

  /* E081-03 — Terminaisons du chemin : nœuds sans suite et note visible. */
  safe(() => {
    const leaves = tree.nodes.filter(node => !node.dataset.v2e081Children);
    leaves.forEach(node => { node.dataset.v2e081Leaf = '1'; });
    layout.dataset.v2e081Leaves = String(leaves.length);
    layout.dataset.v2e081LeafList = leaves.length ? leaves.map(keyOf).join('|') : 'aucune';
    let note = layout.querySelector(`#${LEAFNOTE_ID}`);
    if (!note) {
      note = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e081-leafnote', '') : document.createElement('p');
      note.id = LEAFNOTE_ID;
      const caption = layout.querySelector('.constellation-caption') || layout;
      caption.appendChild(note);
    }
    note.textContent = `Terminaisons du chemin : ${leaves.length} nœud(s) sans suite — ${layout.dataset.v2e081LeafList}.`;
  });

  /* E081-04 — Cohérence des traits actifs avec les nœuds sélectionnés. */
  safe(() => {
    const activeKeys = tree.nodes.filter(isActive).map(keyOf);
    const activeEdges = tree.edges.filter(line => line.classList.contains('is-path'));
    const expected = Math.max(0, activeKeys.length - 1);
    const coherent = activeEdges.length >= expected;
    const orphans = activeKeys.filter((key, index) => index > 0 && activeEdges.length < index);
    activeEdges.forEach((line, index) => { line.dataset.v2e081Rank = String(index + 1); });
    layout.dataset.v2e081Coherent = coherent ? '1' : '0';
    layout.dataset.v2e081ActiveEdges = String(activeEdges.length);
    layout.dataset.v2e081ExpectedEdges = String(expected);
    layout.dataset.v2e081Orphans = orphans.length ? orphans.join('|') : 'aucun';
  });

  /* E081-05 — Parcours des pairs d'un même palier avec les crochets. */
  safe(() => {
    const field = tree.field;
    if (field && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      if (!peerHooked) {
        peerHooked = true;
        const previous = window[PEER_KEY];
        if (typeof previous === 'function' && typeof window.removeEventListener === 'function') {
          window.removeEventListener('keydown', previous, true);
        }
        const onPeer = (event) => {
          if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
          const target = event.target;
          if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return;
          const node = target.closest('[data-const-key]');
          if (!node || !node.closest('.constellation-field')) return;
          const key = event.key || '';
          if (key !== '[' && key !== ']' && key !== 'PageUp' && key !== 'PageDown') return;
          const level = levelOf(node);
          const list = (readTree(currentLayout() || document).byLevel[level]) || [];
          const index = list.indexOf(node);
          if (index < 0 || list.length < 2) return;
          const step = (key === ']' || key === 'PageDown') ? 1 : -1;
          const destination = list[(index + step + list.length) % list.length];
          event.preventDefault();
          event.stopPropagation();
          lastPeerMove = `${level}:${key}`;
          originKey = keyOf(node);
          if (destination && destination !== node) destination.focus({ preventScroll: true });
          const lay = currentLayout();
          if (lay) {
            lay.dataset.v2e081PeerMove = lastPeerMove;
            lay.dataset.v2e081Origin = originKey || 'none';
          }
        };
        window[PEER_KEY] = onPeer;
        window.addEventListener('keydown', onPeer, true);
      }
    }
    layout.dataset.v2e081PeerHook = field ? '1' : '0';
    layout.dataset.v2e081PeerMove = lastPeerMove;
    layout.dataset.v2e081Origin = originKey || 'none';
  });

  /* E081-06 — Table des matières linéaire et focusable du chemin. */
  safe(() => {
    let outline = layout.querySelector(`#${OUTLINE_ID}`);
    if (!outline) {
      outline = document.createElement('ol');
      outline.id = OUTLINE_ID;
      outline.className = 'v2e081-outline';
      outline.setAttribute('aria-label', 'Chemin de connexion en liste linéaire');
      const caption = layout.querySelector('.constellation-caption') || layout;
      caption.appendChild(outline);
    }
    while (outline.firstChild) outline.removeChild(outline.firstChild);
    tree.nodes.forEach((node) => {
      const item = document.createElement('li');
      item.className = 'v2e081-outline-item';
      const button = typeof ctx.el === 'function'
        ? ctx.el('button', 'v2e081-outline-btn', labelOf(node)) : document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `${LEVEL_TEXT[levelOf(node)]} : ${labelOf(node)} — ${node.dataset.v2e081Ordinal || ''}`);
      button.dataset.v2e081Target = keyOf(node);
      button.addEventListener('click', () => {
        const lay = currentLayout();
        const current = lay ? readTree(lay) : tree;
        const target = current.nodes.find(candidate => keyOf(candidate) === button.dataset.v2e081Target);
        if (!target) return;
        originKey = keyOf(target);
        target.focus({ preventScroll: true });
        const updated = currentLayout();
        if (updated) updated.dataset.v2e081Origin = originKey || 'none';
      });
      item.appendChild(button);
      outline.appendChild(item);
    });
    layout.dataset.v2e081OutlineN = String(tree.nodes.length);
  });

  /* E081-07 — Position et taille de chaque palier annoncées aux lecteurs d'écran. */
  safe(() => {
    LEVELS.forEach((level) => {
      const list = tree.byLevel[level];
      list.forEach((node, index) => {
        node.setAttribute('aria-posinset', String(index + 1));
        node.setAttribute('aria-setsize', String(list.length));
      });
    });
    layout.dataset.v2e081Semantic = 'aria-posinset,aria-setsize';
  });

  /* E081-08 — Libellé augmenté du contexte du palier parent. */
  safe(() => {
    tree.nodes.forEach((node) => {
      if (!node.dataset.v2e081LabelOrig) node.dataset.v2e081LabelOrig = node.getAttribute('aria-label') || '';
      const parent = node.dataset.v2e081Parent || 'none';
      const context = parent === 'none' ? '' : `, rattaché à ${parent}`;
      node.setAttribute('aria-label', `${node.dataset.v2e081LabelOrig}${context}`);
    });
    layout.dataset.v2e081Labelled = String(tree.nodes.length);
  });

  /* E081-09 — Relevé des frappes clavier réparties par palier. */
  safe(() => {
    if (typeof document !== 'undefined' && !keysHooked) {
      keysHooked = true;
      document.addEventListener('keydown', (event) => {
        if (!event || !event.target || typeof event.target.closest !== 'function') return;
        const node = event.target.closest('[data-const-key]');
        if (!node || !node.closest('.constellation-field')) return;
        const level = levelOf(node);
        if (LEVELS.indexOf(level) === -1) return;
        keyByLevel[level] += 1;
        const lay = currentLayout();
        if (lay) lay.dataset.v2e081Keys = `ère:${keyByLevel.sun}|repère:${keyByLevel.planet}|point:${keyByLevel.moon}`;
      }, true);
    }
    layout.dataset.v2e081Keys = `ère:${keyByLevel.sun}|repère:${keyByLevel.planet}|point:${keyByLevel.moon}`;
  });

  /* E081-10 — Signature de navigabilité et rapport consolidé V2. */
  safe(() => {
    const source = [layout.dataset.v2e081Graph, layout.dataset.v2e081Sizes,
      layout.dataset.v2e081LeafList, layout.dataset.v2e081Coherent].join('#');
    const signature = fingerprint(source);
    const stable = previousSignature === null || previousSignature === signature;
    previousSignature = signature;
    layout.dataset.v2e081Signature = signature;
    layout.dataset.v2e081Stable = stable ? '1' : '0';
    let report = layout.querySelector(`#${REPORT_ID}`);
    if (!report) {
      report = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e081-report', '') : document.createElement('p');
      report.id = REPORT_ID;
      const caption = layout.querySelector('.constellation-caption') || layout;
      caption.appendChild(report);
    }
    report.textContent = `V2 · ${tree.nodes.length} nœuds · ${tree.edges.length} traits · paliers ${layout.dataset.v2e081Sizes} · feuilles ${layout.dataset.v2e081Leaves} · cohérence ${layout.dataset.v2e081Coherent} · déplacement ${lastPeerMove} · origine ${originKey || 'aucune'} · frappes ${layout.dataset.v2e081Keys} · signature ${signature} · stable ${stable ? 'oui' : 'non'} · rendus ${installs}.`;
  });
});
