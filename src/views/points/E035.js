import { register } from './registry.js';

/* Lentille E035 — Navigation & clavier : raccourcis locaux documentés,
 * sans conflit routeur (domaine D : navigation & clavier).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E035.md — chantiers E035-01 à E035-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js:28-44). Le routeur clavier unique (src/platform/keyboard.js)
 * reste seul maître des touches réservées : 1–6 / m c r g s p, ? , Échap,
 * Entrée, Espace et flèches. E035 n'en détourne aucune.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul panneau, un seul bouton, une seule
 *   région live et un seul écouteur clavier (capture, installé une fois) ;
 * - les raccourcis locaux n'utilisent que des touches NON attribuées par le
 *   routeur, vérifiées à l'exécution via window.VECTEMPOREL_KEYS.map ;
 * - garde stricte : vue Points, focus dans le layout, aucune modale, aucun
 *   champ éditable, aucune combinaison Ctrl/Meta/Alt ;
 * - preventDefault() suffit : le routeur l'honore (keyboard.js:125) — aucun
 *   stopPropagation, aucune capture volée ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro rAF,
 *   zéro innerHTML, aucune donnée historique inventée.
 */

const CSS_ID = 'points-e035';
const PANEL_ID = 'points-e035-help';
const TITLE_ID = 'points-e035-title';
const BUTTON_ID = 'points-e035-help-button';
const LIVE_ID = 'points-e035-live';
const LOCAL_LIST_ID = 'points-e035-local-list';
const ROUTER_LIST_ID = 'points-e035-router-list';
const METRICS_ID = 'points-e035-metrics';
const DATA_KEY = 'data-points-e035-key';

/* E35-03/04 : les touches locales ne sont pas codées au hasard. Ce sont des
 * lettres absentes de SHORTCUT_MAP (keyboard.js:27-32 : 1–6 + m,c,r,g,s,p) et
 * le chiffre 0 (hors 1–6). Chaque entrée est validée par isFreeKey() avant
 * d'être liée, puis rendue dans l'aide depuis le DOM réellement trouvé. */
const LOCAL_KEYS = Object.freeze([
  Object.freeze({ key: 'f', action: 'focus', selector: 'select', index: 0, label: 'Aller au filtre de domaine' }),
  Object.freeze({ key: 'v', action: 'focus', selector: 'select', index: 1, label: 'Aller au filtre de famille' }),
  Object.freeze({ key: 'b', action: 'click', selector: '.points-nav button', index: 0, label: 'Point précédent' }),
  Object.freeze({ key: 'n', action: 'click', selector: '.points-nav button', index: 1, label: 'Point suivant' }),
  Object.freeze({ key: 'd', action: 'focusDetail', selector: '.points-detail', index: 0, label: 'Focus sur le détail du point' }),
  Object.freeze({ key: '0', action: 'click', selector: '.points-filters button', index: 0, label: 'Réinitialiser les filtres' }),
]);

const RESERVED = new Set(['?', 'Escape', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const VIEW_LETTERS_FALLBACK = ['m', 'c', 'r', 'g', 's', 'p'];

/* E35-01/02/10 : feuille unique, injectée par cssOnce (registry.js:13-19),
 * stable quand la coque recrée #atlas-stage. Tout est sous .points-layout ou
 * préfixé points-e035- : aucun effet hors de la vue Points. */
const CSS = `
  .points-layout :is(button, select, [tabindex="-1"]):focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px rgba(8,11,16,.9);
    scroll-margin-block: 60px;
  }
  #${BUTTON_ID} {
    min-height: 36px; padding: 0 10px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230,185,111,.08); color: var(--gold-bright, #e9c98f);
    font-size: 12px; cursor: pointer;
  }
  #${BUTTON_ID}:hover { border-color: var(--gold-bright, #e9c98f); }
  #${PANEL_ID} {
    margin: 12px 0 0; padding: 12px 14px;
    border: 1px solid var(--line-strong, #5b5b5b); border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 10px; background: rgba(8,11,16,.94);
    color: var(--ink-soft, #d8d8d8); font-size: 12px; line-height: 1.5;
  }
  #${PANEL_ID}[hidden] { display: none; }
  #${PANEL_ID}:focus-visible, #${PANEL_ID} button:focus-visible { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px; }
  #${PANEL_ID} h2 {
    margin: 0 0 6px; font-family: var(--serif, serif);
    font-size: 16px; color: var(--gold-bright, #e9c98f);
  }
  #${PANEL_ID} p { margin: 0 0 8px; }
  #${PANEL_ID} .points-e035-label { color: var(--gold, #e6b96f); font-weight: 600; letter-spacing: .03em; }
  #${PANEL_ID} .points-e035-note { color: var(--muted, #9a9a9a); font-size: 11px; font-style: italic; }
  #${PANEL_ID} ul { margin: 0 0 10px; padding: 0; list-style: none; }
  #${PANEL_ID} .points-e035-row { margin-bottom: 5px; display: flex; gap: 8px; align-items: baseline; }
  #${PANEL_ID} kbd {
    flex: 0 0 auto; min-width: 34px; text-align: center; padding: 1px 5px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 4px;
    color: var(--gold-bright, #e9c98f); font: inherit; font-size: 11px;
  }
  #${PANEL_ID} .points-e035-router kbd { color: var(--muted, #9a9a9a); }
  #${PANEL_ID} .points-e035-close {
    min-height: 36px; margin: 4px 0 6px; padding: 0 10px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230,185,111,.06); color: var(--gold-bright, #e9c98f);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .points-e035-close:hover { border-color: var(--gold-bright, #e9c98f); }
  #${PANEL_ID} .points-e035-metrics { margin: 0; color: var(--muted, #9a9a9a); font-size: 11px; }
  .points-layout .points-e035-live {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  @media (max-width: 620px) {
    #${BUTTON_ID} { width: 100%; }
    #${PANEL_ID} { padding: 10px; font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-layout :is(button, select, [tabindex="-1"]),
    #${BUTTON_ID}, #${PANEL_ID} .points-e035-close { transition: none !important; animation: none !important; }
  }
`;

/* Le registre réapplique les greffons à chaque rendu : la closure module
 * survit, le ctx courant est relu à chaque passage (jamais une copie figée). */
let latest = null;
let listenerInstalled = false;
let panel = null;
let button = null;
let open = false;
let openCount = 0;
let shortcutCount = 0;
let lastAnnouncement = '';

/* E35-08 : annonces dédupliquées dans une région live LOCALE, hors panneau
 * (donc jamais masquée par panel.hidden) et sans toucher à #nav-t2-live. */
function announce(text) {
  if (!text || text === lastAnnouncement) return;
  const live = document.getElementById(LIVE_ID);
  if (!live || !live.isConnected) return;
  lastAnnouncement = text;
  live.textContent = text;
}

function ensureLive(ctx) {
  if (document.getElementById(LIVE_ID)) return;
  const live = ctx.el('p', 'points-e035-live');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  ctx.layout.appendChild(live);
}

function writeMetrics() {
  const node = document.getElementById(METRICS_ID);
  if (node && node.isConnected) {
    node.textContent = `Ouvertures : ${openCount} · Raccourcis activés : ${shortcutCount}.`;
  }
}

/* E35-04 : ne jamais réclamer une touche que le routeur possède. La carte
 * publique VECTEMPOREL_KEYS.map (keyboard.js:202-203) est la source unique ;
 * un repli strictement identique couvre l'absence du routeur. */
function isFreeKey(key) {
  if (RESERVED.has(key)) return false;
  let published = null;
  try {
    const api = window.VECTEMPOREL_KEYS;
    if (api && api.map) published = api.map;
  } catch { /* repli ci-dessous */ }
  if (published) return !Object.prototype.hasOwnProperty.call(published, key);
  return !/^[1-6]$/.test(key) && !VIEW_LETTERS_FALLBACK.includes(key.toLowerCase());
}

/* E35-03 : liaison dérivée du DOM réel. Chaque touche n'est annoncée comme
 * disponible que si son contrôle existe dans le layout courant. */
function bindKeys(ctx) {
  const bound = [];
  LOCAL_KEYS.forEach((spec) => {
    if (!isFreeKey(spec.key)) return;
    const nodes = ctx.layout.querySelectorAll(spec.selector);
    const target = nodes[spec.index] || null;
    if (!target) return;
    target.setAttribute(DATA_KEY, spec.key);
    bound.push(spec);
  });
  return bound;
}

function modalOpen() {
  try {
    const api = window.VECTEMPOREL_KEYS;
    if (api && typeof api.modalState === 'function') {
      const state = api.modalState();
      if (state && (state.help || state.detail)) return true;
    }
  } catch { /* repli DOM ci-dessous */ }
  return Boolean(document.querySelector('[aria-modal="true"]:not([hidden])'));
}

function isEditable(node) {
  return node instanceof HTMLElement && (
    node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
  );
}

/* E35-05/06 : le garde-fou. Le routeur ignore déjà les champs éditables et les
 * combinaisons modifiées (keyboard.js:126-129) ; E035 aligne sa garde sans
 * toucher à l'événement quand elle ne s'applique pas. */
function onKeyDown(event) {
  const ctx = latest;
  if (!ctx || !ctx.layout || !ctx.layout.isConnected) return;
  if (modalOpen()) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (!target || isEditable(target)) return;
  if (!ctx.layout.contains(target) && !(ctx.stage && ctx.stage.contains(target))) return;

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const spec = LOCAL_KEYS.find((candidate) => candidate.key === key);
  if (!spec || !isFreeKey(key)) return;

  const node = ctx.layout.querySelectorAll(spec.selector)[spec.index];
  if (!node || !node.isConnected) return;

  /* E35-02/07 : un seul preventDefault suffit. keyboard.js:125 le respecte
   * (T2-10) ; aucun stopPropagation, donc aucun autre écouteur n'est privé
   * de l'événement et le routeur reste fonctionnel pour toutes ses touches. */
  event.preventDefault();

  if (spec.action === 'focus') node.focus({ preventScroll: true });
  else if (spec.action === 'click') node.click();
  else if (spec.action === 'focusDetail') {
    if (!node.hasAttribute('tabindex')) node.tabIndex = -1;
    node.focus({ preventScroll: true });
  }

  shortcutCount += 1;
  writeMetrics();
  announce(`${spec.label}. Raccourci ${key}.`);
}

function setOpen(next, restoreFocus) {
  open = !!next;
  if (panel) panel.hidden = !open;
  if (button) button.setAttribute('aria-expanded', String(open));
  if (latest && latest.layout) latest.layout.dataset.pointsE035Open = open ? '1' : '0';
  if (open) {
    openCount += 1;
    writeMetrics();
    announce('Aide clavier de la vue Points ouverte.');
    if (panel) panel.focus({ preventScroll: true });
  } else {
    if (restoreFocus && button && button.isConnected) button.focus({ preventScroll: true });
    announce('Aide clavier fermée.');
  }
}

/* E35-09 : le bloc « géré par le routeur » est dérivé du contrat public
 * helpMap() (keyboard.js:211-219), jamais d'une liste historique figée. */
function routerRows(ctx, list) {
  let rows = [];
  try {
    const api = window.VECTEMPOREL_KEYS;
    if (api && typeof api.helpMap === 'function') {
      rows = api.helpMap().map((item) => ({ key: String(item.key), label: String(item.label) }));
    }
  } catch { /* repli ci-dessous */ }
  if (!rows.length) {
    rows = [
      { key: '1–6 / m c r g s p', label: 'changer de vue' },
      { key: '← →', label: 'axe horizontal de la vue' },
      { key: '↑ ↓', label: 'axe vertical de la vue' },
      { key: 'Entrée', label: 'ouvrir le détail' },
      { key: 'Espace', label: 'lecture du récit ou périmètre' },
      { key: 'Échap', label: 'fermer la modale ou revenir au monde' },
      { key: '?', label: 'ouvrir / fermer l’aide' },
    ];
  }
  rows.forEach((row) => {
    const li = ctx.el('li', 'points-e035-row');
    li.appendChild(ctx.el('kbd', '', row.key));
    li.appendChild(document.createTextNode(` ${row.label}`));
    list.appendChild(li);
  });
}

function localRows(ctx, list, bound) {
  const available = new Set(bound.map((spec) => spec.key));
  LOCAL_KEYS.forEach((spec) => {
    const li = ctx.el('li', 'points-e035-row');
    li.appendChild(ctx.el('kbd', '', spec.key.toUpperCase()));
    li.appendChild(document.createTextNode(
      ` ${spec.label}${available.has(spec.key) ? '' : ' (contrôle indisponible)'}`));
    list.appendChild(li);
  });
}

/* E35-01 : structure statique reconstruite à chaque rendu, sans innerHTML.
 * Rôle=region non modal : aucun role=dialog, aucun aria-modal, aucun piège. */
function buildPanel(ctx, target, bound) {
  target.replaceChildren();
  target.setAttribute('role', 'region');
  target.setAttribute('aria-labelledby', TITLE_ID);
  target.tabIndex = -1;

  const title = ctx.el('h2', '', 'Raccourcis clavier de la vue Points');
  title.id = TITLE_ID;
  target.appendChild(title);

  target.appendChild(ctx.el('p', '',
    'Aide locale de la vue Points. La touche ? ouvre l’aide générale de l’application : ce panneau la complète, il ne la remplace pas.'));

  target.appendChild(ctx.el('p', 'points-e035-label', 'Raccourcis locaux (propres à cette vue)'));
  const local = ctx.el('ul', 'points-e035-list');
  local.id = LOCAL_LIST_ID;
  localRows(ctx, local, bound);
  target.appendChild(local);

  target.appendChild(ctx.el('p', 'points-e035-note',
    'Ces touches ne sont pas attribuées par le routeur : elles ne détournent ni la navigation ni les commandes globales. Elles agissent seulement quand le focus est dans la vue Points, hors champ de saisie et hors modale.'));

  target.appendChild(ctx.el('p', 'points-e035-label', 'Déjà géré par le routeur (non modifié par E035)'));
  const router = ctx.el('ul', 'points-e035-list points-e035-router');
  router.id = ROUTER_LIST_ID;
  routerRows(ctx, router);
  target.appendChild(router);

  const close = ctx.el('button', 'points-e035-close', 'Fermer l’aide clavier');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer l’aide clavier locale de la vue Points');
  close.addEventListener('click', () => setOpen(false, true));
  target.appendChild(close);

  const metrics = ctx.el('p', 'points-e035-metrics', '');
  metrics.id = METRICS_ID;
  target.appendChild(metrics);
}

/* E35-10 : installation idempotente. Un panneau, un bouton, une live region,
 * un écouteur capture unique ; les nœuds mal parentés d'un rendu précédent
 * sont retirés avant réinsertion. */
register('E035', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  latest = ctx;
  lastAnnouncement = '';
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  const found = document.getElementById(PANEL_ID);
  if (!(found && found.isConnected)) open = false;

  ensureLive(ctx);
  const bound = bindKeys(ctx);

  const oldPanel = document.getElementById(PANEL_ID);
  if (oldPanel && oldPanel.parentElement !== layout) oldPanel.remove();
  panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'points-e035-panel');
    panel.id = PANEL_ID;
  }
  buildPanel(ctx, panel, bound);
  if (panel.parentElement !== layout) layout.appendChild(panel);

  const oldButton = document.getElementById(BUTTON_ID);
  if (oldButton && oldButton.parentElement !== layout) oldButton.remove();
  button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = ctx.el('button', 'points-e035-help', '? Raccourcis');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-controls', PANEL_ID);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Afficher les raccourcis clavier locaux de la vue Points');
    button.addEventListener('click', () => setOpen(!open, !open));
  }
  const filters = layout.querySelector('.points-filters');
  const buttonParent = filters || layout;
  if (button.parentElement !== buttonParent) buttonParent.appendChild(button);

  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  writeMetrics();

  if (!listenerInstalled) {
    window.addEventListener('keydown', onKeyDown, true);
    listenerInstalled = true;
  }

  /* E35-09 : miroirs d'état auditables, sans instrumentation ni journal. */
  layout.dataset.pointsE035Css = CSS_ID;
  layout.dataset.pointsE035Keys = bound.map((spec) => spec.key).join(',');
  layout.dataset.pointsE035Motion = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
    ? 'reduce' : 'normal';
  layout.dataset.pointsE035Open = open ? '1' : '0';
});
