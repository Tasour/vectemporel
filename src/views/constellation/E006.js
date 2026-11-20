import { register } from './registry.js';

/* Lentille E006 — Gestion de l'état appliquée aux soleils de la Constellation.
 *
 * Dix chantiers, tous implémentés. La lentille n'appelle aucun setter du store :
 * elle observe, dérive, sérialise et instrumente l'état des soleils (`.const-sun`,
 * un bouton par ère, constellation.js:267-286). Son état propre est local au module
 * et déterministe : compteurs, historique borné, empreinte FNV-1a et deux
 * écouteurs de capture enregistrés une seule fois.
 *
 * Contrat : register('E006', ctx => {...}) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() } (registry.js:28-44).
 * Aucun fichier partagé modifié, aucune écriture dans la console, aucun appel
 * réseau, aucune source aléatoire, aucun minuteur, aucune boucle d'animation
 * propre, aucune ressource distante.
 */

const INSPECTOR_ID = 'e006-inspector';
const HISTORY_MAX = 8;

/* État local du module : déterministe, conservé entre les rendus successifs. */
let installs = 0;
let transitions = 0;
let lastActiveKey = null;
let focusKey = null;
let history = [];
let previousFingerprint = null;
let clickHooked = false;
let focusHooked = false;

const CSS = `
.constellation-layout .const-sun {
  transition: opacity .18s ease, box-shadow .18s ease;
}
.constellation-layout .const-sun[data-e006-state="inactive"] { opacity: .72; }
.constellation-layout .const-sun[data-e006-state="active"] {
  box-shadow: inset 0 0 0 2px var(--gold-bright);
}
.constellation-layout .const-sun[data-e006-focus-restored="1"] {
  outline: 2px dashed var(--violet);
  outline-offset: 2px;
}
.constellation-layout #${INSPECTOR_ID} {
  margin: 10px 0 0; padding: 6px 9px;
  border: 1px solid var(--line); border-radius: 6px;
  color: var(--muted-2); font-size: 9px; line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
@media (prefers-reduced-motion: reduce) {
  .constellation-layout .const-sun { transition: none !important; }
}`;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune écriture dans la console */ }
}

/* Empreinte FNV-1a 32 bits, sans aléa ni horloge : identifiant de version d'état. */
function fingerprint(source) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* Lecture unique des soleils : une seule passe avant toute écriture. */
function readSuns(layout) {
  const nodes = layout.querySelectorAll('.const-sun');
  return Array.prototype.map.call(nodes, (node, index) => ({
    node,
    index,
    key: node.dataset.constKey || `sun:${index}`,
    label: node.getAttribute('aria-label') || node.dataset.label || node.textContent || '',
    color: node.style.getPropertyValue('--era') || '',
    x: node.style.getPropertyValue('--x') || '',
    y: node.style.getPropertyValue('--y') || '',
    active: node.classList.contains('is-active') || node.getAttribute('aria-current') === 'true',
  }));
}

function onSunClick(event) {
  if (!event || !event.target || typeof event.target.closest !== 'function') return;
  const sun = event.target.closest('.const-sun');
  if (!sun) return;
  transitions += 1;
  sun.dataset.e006Clicked = '1';
}

function onSunFocus(event) {
  if (!event || !event.target || typeof event.target.closest !== 'function') return;
  const sun = event.target.closest('.const-sun');
  if (sun) focusKey = sun.dataset.constKey || focusKey;
}

register('E006', (ctx) => {
  /* Garde d'entrée : aucun ajout DOM tant que ctx.layout n'est pas exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;

  /* E006-01 — Magasin local : instantané déterministe des soleils, publié en attribut. */
  const suns = readSuns(layout);
  installs += 1;
  layout.dataset.e006SunCount = String(suns.length);

  /* E006-02 — Miroir d'état : clé, rang et état sérialisés sur chaque soleil. */
  safe(() => {
    suns.forEach((sun) => {
      sun.node.dataset.e006Key = sun.key;
      sun.node.dataset.e006Index = String(sun.index);
      sun.node.dataset.e006State = sun.active ? 'active' : 'inactive';
    });
  });

  /* E006-03 — État dérivé : cohérence entre le miroir DOM et l'instantané mémoire. */
  const coherent = suns.every((sun) =>
    sun.node.dataset.e006State === (sun.active ? 'active' : 'inactive') &&
    sun.node.dataset.e006Key === sun.key);
  layout.dataset.e006Coherent = coherent ? '1' : '0';

  /* E006-04 — Abonnement : un seul écouteur de capture, installé une seule fois. */
  safe(() => {
    if (typeof document !== 'undefined' && !clickHooked) {
      clickHooked = true;
      document.addEventListener('click', onSunClick, true);
    }
    layout.dataset.e006Transitions = String(transitions);
  });

  /* E006-05 — Machine à états : unicité du soleil actif et nature de la transition. */
  safe(() => {
    const actives = suns.filter((sun) => sun.active);
    const machine = actives.length === 0 ? 'empty'
      : actives.length > 1 ? 'conflict'
      : (lastActiveKey !== null && lastActiveKey !== actives[0].key) ? 'transition' : 'steady';
    layout.dataset.e006Machine = machine;
  });

  /* E006-06 — Panneau inspecteur : un seul nœud live attaché au layout, sans doublon. */
  let inspector = null;
  safe(() => {
    inspector = layout.querySelector(`#${INSPECTOR_ID}`);
    if (!inspector) {
      inspector = ctx.el('p', 'e006-inspector');
      inspector.id = INSPECTOR_ID;
      layout.appendChild(inspector);
    }
    inspector.setAttribute('role', 'status');
    inspector.setAttribute('aria-live', 'polite');
    inspector.setAttribute('aria-atomic', 'true');
  });

  /* E006-07 — Historique borné : mémoire des derniers soleils actifs (8 au plus). */
  safe(() => {
    const actives = suns.filter((sun) => sun.active);
    const key = actives.length === 1 ? actives[0].key : null;
    if (key !== null && key !== lastActiveKey) {
      if (lastActiveKey !== null) {
        history.push(lastActiveKey);
        if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX);
      }
      lastActiveKey = key;
    }
    layout.dataset.e006History = history.length ? history.join('|') : 'none';
  });

  /* E006-08 — État de focus : un écouteur de capture, restauration annotée sans voler le focus. */
  safe(() => {
    if (typeof document !== 'undefined' && !focusHooked) {
      focusHooked = true;
      document.addEventListener('focusin', onSunFocus, true);
    }
    layout.dataset.e006Focus = focusKey || 'none';
    if (focusKey) {
      const remembered = suns.find((sun) => sun.key === focusKey);
      if (remembered) remembered.node.dataset.e006FocusRestored = '1';
    }
  });

  /* E006-09 — Style piloté par l'état : feuille unique, portée à la vue, réactive aux attributs. */
  safe(() => ctx.css('constellation-e006', CSS));

  /* E006-10 — Empreinte de version : FNV-1a du state, témoin de stabilité entre rendus. */
  safe(() => {
    const source = suns.map((sun) =>
      `${sun.key}:${sun.active ? 1 : 0}:${sun.x}:${sun.y}:${sun.color}`).join('|');
    const empreinte = fingerprint(source);
    const stable = previousFingerprint === null || previousFingerprint === empreinte;
    layout.dataset.e006Fingerprint = empreinte;
    layout.dataset.e006Renders = String(installs);
    layout.dataset.e006Stable = stable ? '1' : '0';
    previousFingerprint = empreinte;

    if (inspector) {
      const actif = suns.find((sun) => sun.active);
      inspector.textContent = `E006 · soleils ${suns.length} · actif ${actif ? actif.key : 'aucun'} · transitions ${transitions} · cohérence ${coherent ? 'ok' : 'divergente'} · machine ${layout.dataset.e006Machine || '—'} · historique ${history.length} · focus ${focusKey || 'aucun'} · version ${empreinte} · stable ${stable ? 'oui' : 'non'} · rendus ${installs}.`;
    }
  });
});
