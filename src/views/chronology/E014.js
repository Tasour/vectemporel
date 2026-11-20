import { register } from './registry.js';
import { subscribe } from '../../domain/store.js';

/* Lentille E014 — Micro-interactions de la chronologie.
 *
 * Greffon strictement local : aucun fichier partagé modifié, zéro réseau,
 * zéro aléa, zéro console, aucun écouteur `keydown` ajouté (le routeur clavier
 * de keyboard.js reste unique) — E14-08 n'observe que `keyup`, sans jamais
 * appeler preventDefault(). Toutes les ancres sont préfixées `e14micro-` :
 * ce préfixe ne satisfait pas le motif du tiroir de diagnostic
 * (/^(e\d\d[-_ ]|.*-e\d\d)/), donc les micro-interactions restent visibles
 * hors mode diagnostic. Le bloc CSS est injecté une seule fois sous
 * `chronology-e14` via ctx.css.
 *
 * Chantiers E14-01 … E14-10, détaillés dans
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E14.md.
 */

const CSS_ID = 'chronology-e14';
const TYPE_ID = 'e14micro-type';
const SCROLL_ID = 'e14micro-scroll';
const FILL_ID = 'e14micro-scroll-fill';
const TOAST_ID = 'e14micro-toast';

const TYPE_MS = 700;
const FLASH_MS = 620;
const TOAST_MS = 900;

/* État de module : survit aux reconstructions complètes du DOM opérées par
   shell.js à chaque emit(). Un seul jeu d'écouteurs pour toute la session. */
let latest = null;
let listenersAttached = false;
let scrollBar = null;
let scrollFill = null;
let toast = null;
let typeTimer = 0;
let flashTimer = 0;
let toastTimer = 0;
let scrollRaf = 0;
let lastRatio = -1;
let lastVisible = false;

const CSS = `
/* E14-01 — retour d'activation (enfoncement) sur les commandes de la vue. */
#atlas-chrono-main .era-band,
#atlas-chrono-main .atlas-chrono-tag,
#atlas-chrono-main .nav-c2-back,
#atlas-chrono-main .event-card,
#atlas-chrono-aside .atlas-chrono-tag,
#atlas-chrono-aside .aside-actions button {
  transition: transform 90ms ease-out, box-shadow 140ms ease-out, border-color 140ms ease-out;
}
#atlas-chrono-main .era-band:active,
#atlas-chrono-main .atlas-chrono-tag:active,
#atlas-chrono-main .nav-c2-back:active,
#atlas-chrono-main .event-card:active,
#atlas-chrono-aside .atlas-chrono-tag:active,
#atlas-chrono-aside .aside-actions button:active {
  transform: translateY(1px) scale(.985);
}
#atlas-chrono-main .event-card:not(.is-active):hover { box-shadow: 0 4px 14px rgba(0,0,0,.22); }
#atlas-chrono-main .era-band:not([aria-current="true"]):hover { box-shadow: inset 0 -2px var(--era), 0 4px 14px rgba(0,0,0,.22); }

/* E14-02 — halo de focus, en plus de l'outline global de styles.css:33. */
#atlas-chrono-main .era-band:focus-visible,
#atlas-chrono-main .atlas-chrono-tag:focus-visible,
#atlas-chrono-main .nav-c2-back:focus-visible,
#atlas-chrono-main .event-card:focus-visible,
#atlas-chrono-aside .atlas-chrono-tag:focus-visible,
#atlas-chrono-aside .aside-actions button:focus-visible,
#atlas-chrono-search:focus-visible {
  box-shadow: 0 0 0 4px rgba(230,185,111,.18);
}
@media (max-width:620px) {
  #atlas-chrono-main .era-band:focus-visible,
  #atlas-chrono-main .atlas-chrono-tag:focus-visible,
  #atlas-chrono-main .event-card:focus-visible,
  #atlas-chrono-aside .atlas-chrono-tag:focus-visible { box-shadow: 0 0 0 2px rgba(230,185,111,.18); }
}

/* E14-03 — pouls de frappe dans la barre d'outils (décoratif, aria-hidden). */
#${TYPE_ID} {
  display:inline-flex; align-items:center; gap:5px; min-height:24px;
  padding:2px 8px; border-radius:999px;
  border:1px solid rgba(230,185,111,.28); color:var(--muted-2);
  font-size:9px; font-variant-numeric:tabular-nums;
  opacity:0; transform:translateY(2px); pointer-events:none;
  transition:opacity .18s ease-out, transform .18s ease-out, border-color .18s ease-out;
}
#${TYPE_ID}.is-typing { opacity:1; transform:none; border-color:var(--gold); }
#${TYPE_ID}::before {
  content:''; width:5px; height:5px; border-radius:50%; background:var(--gold-bright);
  transform:scale(.6); opacity:.5;
  transition:transform .18s ease-out, opacity .18s ease-out;
}
#${TYPE_ID}.is-typing::before { transform:scale(1); opacity:1; }

/* E14-04 — ligne de survol révélée sous la carte de repère. */
#atlas-chrono-events .event-card { position:relative; }
#atlas-chrono-events .event-card::after {
  content:''; position:absolute; left:10px; right:10px; bottom:0; height:2px;
  background:linear-gradient(90deg, var(--gold), transparent);
  transform:scaleX(0); transform-origin:left center; pointer-events:none;
  transition:transform 160ms ease-out;
}
#atlas-chrono-events .event-card:hover::after,
#atlas-chrono-events .event-card:focus-visible::after { transform:scaleX(1); }

/* E14-05 — transition d'état des bascules aria-pressed (pastille interne). */
#atlas-chrono-main .atlas-chrono-tag::before,
#atlas-chrono-aside .atlas-chrono-tag::before {
  content:''; display:inline-block; width:5px; height:5px; margin-right:5px;
  border-radius:50%; background:currentColor; vertical-align:middle;
  transform:scale(.55); opacity:.45;
  transition:transform 160ms ease-out, opacity 160ms ease-out, box-shadow 160ms ease-out;
}
#atlas-chrono-main .atlas-chrono-tag[aria-pressed="true"]::before,
#atlas-chrono-aside .atlas-chrono-tag[aria-pressed="true"]::before {
  transform:scale(1); opacity:1; box-shadow:0 0 0 3px rgba(230,185,111,.18);
}

/* E14-06 — flash unique de la bande de statut après un changement de filtre. */
@keyframes e14micro-flash {
  from { background-color:rgba(230,185,111,.16); box-shadow:inset 3px 0 0 var(--gold); }
  to   { background-color:transparent; box-shadow:inset 0 0 0 transparent; }
}
#atlas-chrono-status.is-flash { animation:e14micro-flash ${FLASH_MS}ms ease-out 1; }

/* E14-07 — règle de progression du défilement interne de .chronology-main. */
#${SCROLL_ID} {
  position:fixed; top:0; left:0; right:0; height:2px; z-index:70;
  pointer-events:none; opacity:0; transition:opacity .2s ease-out;
}
#${SCROLL_ID}.is-visible { opacity:1; }
#${FILL_ID} {
  width:100%; height:100%; background:var(--gold-bright);
  transform:scaleX(0); transform-origin:left center; will-change:transform;
}

/* E14-08 — écho clavier transitoire (décoratif, aria-hidden). */
#${TOAST_ID} {
  position:fixed; left:50%; bottom:16px; z-index:71;
  transform:translate(-50%,6px); min-height:26px; padding:5px 12px;
  border-radius:999px; background:rgba(8,11,18,.9);
  border:1px solid rgba(230,185,111,.35); color:#f5e9d0;
  font:600 11px/1.2 system-ui,sans-serif;
  opacity:0; pointer-events:none;
  transition:opacity .16s ease-out, transform .16s ease-out;
}
#${TOAST_ID}.is-on { opacity:1; transform:translate(-50%,0); }

/* E14-10 — garde explicite du mouvement réduit (filet de sécurité en plus
   de la règle globale de styles.css:342). */
@media (prefers-reduced-motion:reduce) {
  #atlas-chrono-main *, #atlas-chrono-aside *,
  #atlas-chrono-main .atlas-chrono-tag::before,
  #atlas-chrono-aside .atlas-chrono-tag::before,
  #atlas-chrono-events .event-card::after,
  #${TYPE_ID}, #${TYPE_ID}::before,
  #${SCROLL_ID}, #${FILL_ID}, #${TOAST_ID} {
    animation:none !important; transition:none !important;
  }
}
`;

function reduced() {
  return !!(latest && typeof latest.reducedMotion === 'function' && latest.reducedMotion());
}

/* E14-07 / E14-09 : nœuds persistants créés une seule fois dans <body>,
   hors du stage reconstruit. Le préfixe e14micro- les exclut du tiroir
   de diagnostic. */
function ensurePersistentDom() {
  if (!scrollBar) {
    scrollBar = document.getElementById(SCROLL_ID);
    if (!scrollBar) {
      scrollBar = document.createElement('div');
      scrollBar.id = SCROLL_ID;
      scrollBar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(scrollBar);
    }
  }
  if (!scrollFill) scrollFill = document.getElementById(FILL_ID);
  if (!scrollFill && scrollBar) {
    scrollFill = document.createElement('div');
    scrollFill.id = FILL_ID;
    scrollBar.appendChild(scrollFill);
  }
  if (!toast) {
    toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('p');
      toast.id = TOAST_ID;
      toast.setAttribute('aria-hidden', 'true');
      document.body.appendChild(toast);
    }
  }
}

/* E14-03 / E14-09 : le badge de frappe vit dans la barre d'outils fraîche ;
   une reconstruction du DOM le recrée naturellement à chaque rendu. */
function ensureTypeBadge() {
  const tools = document.getElementById('atlas-chrono-tools');
  if (!tools) return;
  let badge = document.getElementById(TYPE_ID);
  if (!badge) {
    badge = document.createElement('span');
    badge.id = TYPE_ID;
    badge.setAttribute('aria-hidden', 'true');
    tools.appendChild(badge);
  }
  const search = document.getElementById('atlas-chrono-search');
  const count = search ? String(search.value || '').length : 0;
  badge.textContent = `${count} caractère${count > 1 ? 's' : ''}`;
}

/* E14-07 : le défilement de la chronologie est interne à .chronology-main
   (styles.css:195), pas celui de la fenêtre. Une seule frame rAF au plus. */
function updateScroll() {
  scrollRaf = 0;
  const main = document.getElementById('atlas-chrono-main');
  const max = main ? Math.max(0, main.scrollHeight - main.clientHeight) : 0;
  const visible = !!main && max > 8;
  const ratio = visible ? Math.min(1, Math.max(0, main.scrollTop / max)) : 0;
  /* Changement de vue : le HUD persistant ne doit pas survivre à la
     chronologie (le store émet à chaque transition). */
  if (!main && toast) toast.classList.remove('is-on');
  if (!scrollBar) return;
  if (visible !== lastVisible) {
    scrollBar.classList.toggle('is-visible', visible);
    lastVisible = visible;
  }
  if (ratio !== lastRatio) {
    if (scrollFill) scrollFill.style.transform = `scaleX(${ratio.toFixed(3)})`;
    lastRatio = ratio;
  }
}

function scheduleScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(updateScroll);
}

/* E14-06 : la bande de statut est recréée par le rendu déclenché par le clic ;
   on ajoute donc la classe sur le nœud frais, sans forcing de reflow. */
function flashStatus() {
  if (reduced()) return;
  window.clearTimeout(flashTimer);
  const status = document.getElementById('atlas-chrono-status');
  if (!status) return;
  status.classList.add('is-flash');
  flashTimer = window.setTimeout(() => {
    const node = document.getElementById('atlas-chrono-status');
    if (node) node.classList.remove('is-flash');
  }, FLASH_MS);
}

/* E14-03 : un seul timer, réarmé à chaque frappe ; aucun appel au store. */
function onInput(event) {
  const target = event.target;
  if (!target || target.id !== 'atlas-chrono-search') return;
  const count = String(target.value || '').length;
  const badge = document.getElementById(TYPE_ID);
  if (badge) {
    badge.textContent = `${count} caractère${count > 1 ? 's' : ''}`;
    if (!reduced()) badge.classList.add('is-typing');
  }
  window.clearTimeout(typeTimer);
  typeTimer = window.setTimeout(() => {
    const node = document.getElementById(TYPE_ID);
    if (node) node.classList.remove('is-typing');
  }, TYPE_MS);
}

function onClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  const button = target.closest('button');
  if (!button) return;
  if (button.matches('[data-era-id],[data-tag]')
      || /Réinitialiser le filtre/.test(button.textContent || '')) {
    flashStatus();
  }
}

const KEY_LABELS = Object.freeze({
  ArrowRight: '→ Repère suivant',
  ArrowLeft: '← Repère précédent',
  ArrowDown: '↓ Ère suivante',
  ArrowUp: '↑ Ère précédente',
  Enter: '↵ Détail du repère',
  '?': '? Aide clavier',
});

/* E14-08 : observation en keyup uniquement — le routeur unique de
   keyboard.js (keydown, capture) n'est ni modifié ni court-circuité. */
function onKeyUp(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const label = KEY_LABELS[event.key];
  if (!label || reduced() || !toast) return;
  const target = event.target;
  if (target && (target.isContentEditable
      || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
  if (!document.getElementById('atlas-chrono-main')) return;
  window.clearTimeout(toastTimer);
  toast.textContent = label;
  toast.classList.add('is-on');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-on'), TOAST_MS);
}

/* E14-09 : attachement unique, quel que soit le nombre de rendus. */
function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  document.addEventListener('input', onInput, false);
  document.addEventListener('click', onClick, false);
  document.addEventListener('keyup', onKeyUp, false);
  /* Les événements scroll ne bubblent pas : la capture document les voit
     tous, y compris ceux de .chronology-main et .chronology-aside. */
  document.addEventListener('scroll', scheduleScroll, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleScroll();
  });
  /* Une seule souscription, partagée par tous les rendus : elle masque le HUD
     quand la vue chronologie est quittée (les scroll seuls ne suffisent pas). */
  subscribe(scheduleScroll);
}

register('E014', (ctx) => {
  latest = ctx;                       // E14-09 : toujours le ctx le plus frais
  if (ctx.css) ctx.css(CSS_ID, CSS);  // une seule feuille, id unique
  ensurePersistentDom();
  ensureTypeBadge();
  attachListeners();
  updateScroll();
});
