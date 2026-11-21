import { register } from './registry.js';

/* Lentille E25 — Navigation clavier de la Chronologie.
 * Fichier d'implémentation : src/views/chronology/E25.js. Le point d'entrée
 * historique E025.js se contente de l'importer ; index.js continue de charger
 * E001.js … E100.js et le cache des modules ES garantit un seul register('E25').
 * Dix chantiers (E25-01 … E25-10) : focus après flèches, cap live dédié,
 * mode clavier/pointeur, Home/End, Échap dans la recherche, liens
 * d'évitement, métadonnées clavier, idempotence, confinement.
 *
 * Contrat : le routeur unique de src/platform/keyboard.js reste l'autorité.
 * E25 n'écrit jamais l'état, n'appelle ni stepEvent ni stepEra, ne consomme
 * aucune touche qu'il possède (?, Échap global, 1–6, a/c/r/g/s/p/m,
 * ← → ↑ ↓, Entrée, Espace) et n'ajoute ni journalisation, ni réseau, ni aléa.
 * Un seul pointeur module, un seul jeu d'écoutes document, un seul CSS. */

const CSS_ID = 'chronology-e25';
const LIVE_ID = 'chronology-nav-live';
const HELP_ID = 'chronology-nav-help';
const SKIP_EVENT_ID = 'chronology-nav-skip-event';
const SKIP_POINTS_ID = 'chronology-nav-skip-points';

const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
const NAV_KEYS = new Set([...ARROWS, 'Home', 'End', 'Tab']);

/* Pointeur module : tous les callbacks lisent `current`, jamais une closure
 * locale, afin qu'un rendu mort ne mette jamais à jour un nœud détaché. */
let current = null;
let documentBound = false;
let keyboardMode = false;
let lastMessage = '';

function byId(id) {
  return document.getElementById(id);
}

function stageOf(state) {
  const stage = state && state.stage;
  if (stage && stage.isConnected) return stage;
  const live = document.getElementById('atlas-stage');
  return live && live.isConnected ? live : null;
}

function isChronologyActive() {
  const main = byId('atlas-chrono-main');
  if (!main || !main.isConnected) return false;
  const stage = byId('atlas-stage');
  return !!(stage && stage.isConnected && stage.querySelector('[data-view="chronology"]'));
}

function ensureBodyNode(tag, id, className, text) {
  let node = byId(id);
  if (node && node.isConnected) return node;
  node = document.createElement(tag);
  node.id = id;
  if (className) node.className = className;
  if (text) node.textContent = text;
  document.body.appendChild(node);
  return node;
}

function announce(state, message) {
  if (!message || !state || !state.live || !state.live.isConnected) return;
  if (message === lastMessage) return;
  lastMessage = message;
  state.live.textContent = message;
}

/* E25-01 : recentrage du focus sur le contrôle courant après une flèche.
 * La coque (shell.js:532,562) capture une signature de focus ; l'attribut
 * `aria-current` changé par le rendu invalide cette signature et le focus
 * retombe sur #atlas-stage. On récupère le nouveau bouton courant en phase
 * de bouillonnement : le routeur capture a déjà muté l'état et rendu le DOM. */
function focusCurrent(state, axis) {
  const stage = stageOf(state);
  if (!stage) return false;
  const selector = axis === 'vertical'
    ? '.era-band[aria-current="true"]'
    : '.event-card[aria-current="true"]';
  const target = stage.querySelector(selector);
  if (!target || typeof target.focus !== 'function') return false;
  const active = document.activeElement;
  const stealable = !active || active === document.body || active === stage || !stage.contains(active);
  if (!stealable) return false;
  try { target.focus({ preventScroll: !!state.reduced }); }
  catch { target.focus(); }
  return true;
}

/* E25-02 : description du contrôle réellement focalisé, distincte de la
 * région live de la coque (shell.js:167-186) qui annonce le changement
 * d'état, et de #nav-c2a-live qui annonce le filtrage. */
function listRank(node) {
  const li = node.closest('li');
  const list = li && li.parentElement;
  if (!list) return { index: 0, total: 0 };
  const items = Array.from(list.children).filter((child) => child.querySelector('button'));
  return { index: items.indexOf(li) + 1, total: items.length };
}

function describeFocus(node) {
  if (!(node instanceof Element)) return '';
  if (node.id === SKIP_EVENT_ID) return 'Lien d’évitement : aller au repère courant.';
  if (node.id === SKIP_POINTS_ID) return 'Lien d’évitement : aller aux points du repère.';
  if (node.id === 'atlas-chrono-search') {
    return 'Recherche locale. Échap vide le champ, un second Échap quittent la vue.';
  }
  if (node.matches('.event-card')) {
    const { index, total } = listRank(node);
    const year = node.querySelector('.event-year')?.textContent || '';
    const title = node.querySelector('strong')?.textContent || '';
    return `Repère ${index} sur ${total} ciblé. ${year} ${title}. Flèche droite : repère suivant.`;
  }
  if (node.matches('.era-band')) {
    const { index, total } = listRank(node);
    const name = node.querySelector('span')?.textContent || '';
    return `Ère ${index} sur ${total} ciblée. ${name}. Flèche bas : ère suivante.`;
  }
  return '';
}

/* E25-03 : ne parler que lorsque le focus vient du clavier. Un pointerdown
 * désarme le mode ; Tab/flèches/Home/End le réarment. Les clics souris ne
 * produisent donc aucune annonce redondante avec la région de la coque. */
function onDocumentKeyDown(event) {
  const state = current;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (NAV_KEYS.has(event.key)) keyboardMode = true;

  /* E25-01 : le routeur n'a prévenu le défaut que s'il a réellement agi
   * (handle() :171-177). On n'intercepte rien, on ne modifie aucun événement. */
  if (ARROWS.includes(event.key) && event.defaultPrevented && state && isChronologyActive()) {
    focusCurrent(state, event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'horizontal' : 'vertical');
    return;
  }

  /* E25-04 : Home/End ne sont pas possédés par le routeur unique
   * (keyboard.js:233). Ils déplacent le focus dans la liste, sans changer
   * l'état : Entrée (activation native du bouton, keyboard.js:132) sélectionne. */
  if (event.key !== 'Home' && event.key !== 'End') return;
  if (!state || !isChronologyActive() || event.defaultPrevented) return;
  const origin = event.target;
  if (!(origin instanceof Element)) return;
  const group = origin.closest('#atlas-chrono-eras, #atlas-chrono-events');
  if (!group) return;
  const buttons = Array.from(group.querySelectorAll('button:not([disabled])'));
  if (!buttons.length) return;
  event.preventDefault();
  const next = event.key === 'Home' ? buttons[0] : buttons[buttons.length - 1];
  next.focus();
}

function onDocumentPointerDown() {
  keyboardMode = false;
}

function onDocumentFocusIn(event) {
  const state = current;
  if (!state || !keyboardMode || !isChronologyActive()) return;
  const stage = stageOf(state);
  if (!stage || !stage.contains(event.target)) return;
  announce(state, describeFocus(event.target));
}

/* E25-05 : Échap en deux temps dans le champ de recherche. Le routeur
 * ignore les cibles éditables (keyboard.js:59-63,129) : tant que le focus y
 * est, Échap ne peut pas revenir au monde. On vide d'abord le champ via un
 * événement `input` (chronology.js:320-325 possède la logique de filtre), puis
 * on rend la main : un second Échap atteint une cible non éditable et le
 * routeur le traite à nouveau. Aucune écriture directe dans l'état. */
function onDocumentKeyDownSearch(event) {
  if (event.key !== 'Escape') return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.id !== 'atlas-chrono-search') return;
  if (!isChronologyActive()) return;
  event.preventDefault();
  if (input.value) {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    announce(current, 'Recherche effacée.');
  } else {
    input.blur();
    announce(current, 'Champ quitté. Échap pour revenir au monde.');
  }
}

function bindDocument() {
  if (documentBound) return;
  documentBound = true;
  document.addEventListener('keydown', onDocumentKeyDown);
  document.addEventListener('keydown', onDocumentKeyDownSearch);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  document.addEventListener('focusin', onDocumentFocusIn);
}

/* E25-06 / E25-07 : liens d'évitement locaux. Ils ciblent le repère courant
 * et les points vérifiés de l'aside, sans toucher à l'ordre de Tab des
 * boutons existants ni aux sélecteurs testés. */
function ensureSkip(el, id, label) {
  const node = el('button', 'chronology-e25-skip', label);
  node.id = id;
  node.type = 'button';
  node.setAttribute('aria-describedby', HELP_ID);
  return node;
}

register('E25', (ctx) => {
  const { stage, layout, el, css, reducedMotion } = ctx || {};
  if (!stage || !layout || typeof el !== 'function') return;

  let reduced = false;
  try { reduced = !!(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduced = false; }

  if (typeof css === 'function') {
    css(CSS_ID, `
.chronology-e25-skip{position:absolute;left:-9999px;top:0;z-index:60;padding:6px 10px;
  border:1px solid var(--gold);border-radius:8px;background:#0b0f15;color:var(--gold-bright);font-size:10px}
.chronology-e25-skip:focus{left:8px;top:8px}
.chronology-e25-skip:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e25-skip[disabled]{opacity:.45}
.chronology-e25-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    `);
  }

  const live = ensureBodyNode('p', LIVE_ID, 'chronology-e25-sr');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');

  /* E25-08 : description stable des touches locales, hors #app donc
   * persistante, référencée par les deux liens d'évitement. */
  ensureBodyNode('p', HELP_ID, 'chronology-e25-sr',
    'Navigation clavier de la chronologie : flèche droite ou gauche pour changer de repère, flèche bas ou haut pour changer d’ère, Home et Fin aux extrémités de la liste, Entrée pour ouvrir le détail, Échap pour quitter la recherche puis revenir au monde, point d’interrogation pour l’aide.');

  const skipEvent = ensureSkip(el, SKIP_EVENT_ID, 'Aller au repère courant');
  skipEvent.addEventListener('click', () => {
    const target = stageOf(current)?.querySelector('.event-card[aria-current="true"]');
    if (target) { target.focus(); announce(current, 'Repère courant ciblé.'); }
  });
  const skipPoints = ensureSkip(el, SKIP_POINTS_ID, 'Aller aux points du repère');
  const currentCard = stage.querySelector('.event-card[aria-current="true"]');
  skipPoints.disabled = !currentCard || !stage.querySelector('#atlas-chrono-points-title');
  skipPoints.setAttribute('aria-disabled', String(skipPoints.disabled));
  skipPoints.addEventListener('click', () => {
    const title = stageOf(current)?.querySelector('#atlas-chrono-points-title');
    if (title) { title.focus(); announce(current, 'Points du repère ciblés.'); }
  });
  layout.insertBefore(skipEvent, layout.firstChild);
  layout.insertBefore(skipPoints, skipEvent.nextSibling);

  /* Métadonnées : on annonce les touches sans modifier classes, ids ni
   * listeners des boutons existants (E25-08). */
  if (currentCard && !currentCard.hasAttribute('aria-keyshortcuts')) {
    currentCard.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight');
  }
  const currentBand = stage.querySelector('.era-band[aria-current="true"]');
  if (currentBand && !currentBand.hasAttribute('aria-keyshortcuts')) {
    currentBand.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
  }

  /* E25-09 : un seul pointeur, gardé à jour à chaque rendu. Les écoutes
   * document sont posées une seule fois ; les boutons créés ci-dessus sont
   * neufs à chaque rendu et donc sans accumulateur de listeners. */
  current = { stage, layout, el, live, reduced };
  bindDocument();
});
