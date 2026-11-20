import { register } from './registry.js';

/* Lentille E035 — Focus clavier (concentration sur le contrôle courant).
 *
 * Fichier possédé : ce module uniquement. Lectures seules :
 *   src/views/chronology.js (structure du DOM, ids, focusIntent),
 *   src/ui/shell.js (manageFocus, captureFocusKey, reconstruction du DOM),
 *   src/platform/keyboard.js (routeur clavier unique),
 *   src/views/chronology/registry.js (cssOnce, el, runEnhancements).
 *
 * La coque gère déjà la restauration du focus après la reconstruction du DOM
 * (shell.js:531-575, manageFocus) et la vue porte son propre `focusIntent`
 * (chronology.js:197-205, 539-540). E035 ne reprend donc jamais la main sur
 * le focus : elle se contente de RENDRE LE FOCUS LISIBLE et AUDITABLE —
 * anneau de focus, témoin visuel, marquage réversible, miroirs d'état.
 *
 * Dix chantiers E35-01 … E35-10 : voir
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E35.md.
 *
 * Zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro canvas,
 * aucun écouteur clavier (le routeur de keyboard.js reste unique), aucune
 * donnée historique inventée, aucun fichier partagé modifié.
 */

const CSS_ID = 'chronology-e35';
const READOUT_ID = 'chronology-e35-readout';
const VALUE_ID = 'chronology-e35-readout-value';
const MAX_LABEL = 80;

/* E35-01/02/03/04/10 : une seule feuille, injectée une fois par cssOnce
 * (registry.js:13-19), donc stable quand la coque recrée #atlas-stage.
 * Toutes les règles sont sous `.chronology-layout` : aucun effet hors vue. */
const CSS = `
  .chronology-layout :is(button, input, [tabindex]:not([tabindex="-1"])):focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px rgba(8,11,16,.9);
    scroll-margin-block: 60px;
  }
  .chronology-layout .event-card:focus-visible,
  .chronology-layout .era-band:focus-visible,
  .chronology-layout .atlas-chrono-tag:focus-visible { outline-width: 3px; }
  .chronology-layout [aria-current="true"]:focus-visible,
  .chronology-layout [aria-pressed="true"]:focus-visible {
    box-shadow: inset 0 0 0 2px var(--gold-bright, #e9c98f), 0 0 0 1px rgba(8,11,16,.9);
  }
  .chronology-layout [data-e35-focus="true"] { filter: brightness(1.08); }
  .chronology-layout .e35-readout {
    margin: 0 0 10px; padding: 5px 8px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 6px; background: rgba(255,255,255,.02);
    color: var(--muted); font-size: 9px; line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .chronology-layout .e35-readout-label { color: var(--gold); font-weight: 600; }
  .chronology-layout .e35-readout-value { color: var(--ink); }
  @media (max-width: 620px) {
    .chronology-layout .e35-readout { padding: 4px 6px; font-size: 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .chronology-layout :is(button, input, [tabindex]:not([tabindex="-1"])):focus-visible,
    .chronology-layout .e35-readout { transition: none !important; animation: none !important; }
  }
`;

/* Le registre purge puis réapplique les greffons à chaque rendu : la closure
 * module survit, le ctx courant est relu à chaque passage (jamais une copie). */
let latest = null;
let listenerInstalled = false;
let marked = null;

function collapse(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\s+/g, ' ').trim();
}

/* E35-07 : le libellé est dérivé du DOM réel (aria-label, texte visible,
 * title), jamais d'une phrase historique saisie à la main. */
function labelOf(node) {
  const aria = collapse(node.getAttribute('aria-label'));
  if (aria) return aria.slice(0, MAX_LABEL);
  const text = collapse(node.textContent);
  if (text) return text.slice(0, MAX_LABEL);
  const title = collapse(node.getAttribute('title'));
  if (title) return title.slice(0, MAX_LABEL);
  const tag = (node.tagName || '').toLowerCase();
  if (tag === 'input') return 'Champ de saisie';
  if (tag === 'a') return 'Lien';
  if (tag === 'button') return 'Bouton';
  return 'Contrôle';
}

function setValue(value) {
  const out = document.getElementById(VALUE_ID);
  if (out && out.isConnected) out.textContent = value;
}

function clearMark() {
  if (marked && marked.isConnected) marked.removeAttribute('data-e35-focus');
  marked = null;
}

/* E35-06 : une seule paire d'écouteurs, posée une fois, sans garde par rendu.
 * focusin/focusout ne font que lire l'état : aucun focus() n'est appelé ici. */
function onFocusIn(event) {
  const ctx = latest;
  const layout = ctx && ctx.layout;
  if (!layout || !layout.isConnected) return;
  const node = event.target;
  if (!node || node.nodeType !== 1 || typeof node.getAttribute !== 'function') return;

  const inLayout = layout.contains(node);
  const inStage = Boolean(ctx.stage && ctx.stage.contains(node));
  if (!inLayout && !inStage) {
    clearMark();
    delete layout.dataset.e35Focus;
    setValue('Hors de la chronologie');
    return;
  }

  if (inLayout) {
    if (marked && marked !== node) clearMark();
    marked = node;
    node.setAttribute('data-e35-focus', 'true');
    layout.dataset.e35Focus = node.id || 'sans-id';
  } else {
    clearMark();
    delete layout.dataset.e35Focus;
  }
  setValue(node.id === 'atlas-stage' ? 'Scène de la chronologie' : labelOf(node));
}

function onFocusOut(event) {
  /* Le focusin du contrôle suivant gère le remplacement. On ne vide que
   * lorsque le focus quitte réellement le document (relatedTarget nul). */
  if (event.relatedTarget !== null) return;
  clearMark();
  const layout = latest && latest.layout;
  if (layout && layout.isConnected) delete layout.dataset.e35Focus;
  setValue('aucun contrôle');
}

/* E35-05 : témoin visuel unique, reconstruit avec le layout à chaque rendu.
 * `aria-hidden` évite de doubler l'annonce native du focus et la région live
 * de la coque ; les lecteurs d'écran n'ont donc aucun message redondant. */
function ensureReadout(ctx) {
  const main = document.getElementById('atlas-chrono-main')
    || (ctx.layout && ctx.layout.querySelector('.chronology-main'));
  if (!main || !main.isConnected || document.getElementById(READOUT_ID)) return;

  const readout = ctx.el('p', 'e35-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('aria-hidden', 'true');
  const label = ctx.el('span', 'e35-readout-label', 'Focus clavier : ');
  const value = ctx.el('span', 'e35-readout-value', 'aucun contrôle');
  value.id = VALUE_ID;
  readout.append(label, value);

  /* Juste après le h1 (premier enfant), avant la ligne de statut. */
  const first = main.firstElementChild;
  const next = first && first.nextSibling;
  if (next) main.insertBefore(readout, next);
  else main.appendChild(readout);
}

register('E035', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  latest = ctx;

  ctx.css(CSS_ID, CSS);
  ensureReadout(ctx);

  if (!listenerInstalled) {
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    listenerInstalled = true;
  }

  /* E35-09 : miroirs d'état, lisibles sans instrumentation ni journal. */
  const layout = ctx.layout;
  layout.dataset.e35Listeners = '1';
  layout.dataset.e35Css = CSS_ID;
  layout.dataset.e35Motion = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()
    ? 'reduce' : 'normal';

  /* Un marqueur issu d'un rendu précédent est détaché : on le libère. */
  if (marked && !marked.isConnected) clearMark();
});
