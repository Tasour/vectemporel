import { register } from './registry.js';

/* Lentille E052 — Confort visuel : mouvement réduit, transitions et
 * préférences utilisateur.
 *
 * La vue possède déjà une neutralisation système des transitions
 * (chronology.js:89-91) et styles.css:342-343 étouffe animations et
 * transitions sous `prefers-reduced-motion: reduce`. Il manque trois choses :
 * (a) aucune préférence utilisateur ne peut remplacer le réglage système,
 * (b) aucun état effectif n'est auditable dans le DOM, (c) le canal vocal
 * canonique (chronology.js:119-138) n'annonce jamais un changement de
 * préférence. E052 est strictement additif : il n'édite aucun fichier
 * partagé et ne possède aucun nœud de la vue.
 *
 * E052-01 feuille unique / IDs gardés · E052-02 source système unique
 * E052-03 préférence utilisateur trois états · E052-04 neutralisation CSS
 * E052-05 annonce sur action · E052-06 readout chiffré
 * E052-07 aucune info par la seule couleur · E052-08 zéro rAF / timer
 * E052-09 clavier, focus et cibles tactiles · E052-10 surface de vérification
 *
 * Zéro journalisation, zéro appel réseau, zéro aléa, aucune boucle
 * d'animation propre à la lentille, aucun timer.
 */

const CSS_ID = 'chronology-e052';
const PANEL_ID = 'e052-panel';
const TITLE_ID = 'e052-title';
const READOUT_ID = 'e052-readout';
const TOGGLE_ID = 'e052-announce';
const MODE_SYSTEM_ID = 'e052-mode-system';
const MODE_REDUCE_ID = 'e052-mode-reduce';
const MODE_FULL_ID = 'e052-mode-full';
const LIVE_ID = 'nav-c2a-live';
const STORE_KEY = 'vectemporel.e052.motion';

const CHANTIERS = Object.freeze([
  'E052-01', 'E052-02', 'E052-03', 'E052-04', 'E052-05',
  'E052-06', 'E052-07', 'E052-08', 'E052-09', 'E052-10',
]);

/* Une seule feuille, injectée une fois par cssOnce (registry.js:13-19).
   La neutralisation est conditionnée à l'attribut posé sur
   `.chronology-layout` (chronology.js:214), qui contient le récit et la
   fiche ; aucun nœud n'est déposé dans body, stage ou layout directement,
   donc _diagnostics.js:69-79 ne masque pas le panneau (E052-01). */
const CSS = `
.e052-panel{
  margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(8,11,16,.55);color:var(--muted);
  font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;
}
.e052-title{margin:0 0 6px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
.e052-fieldset{margin:0 0 7px;padding:0;border:0}
.e052-legend{margin:0 0 4px;color:var(--ink-soft);font-size:9px}
.e052-choices{display:flex;flex-wrap:wrap;gap:6px 12px}
.e052-choice{display:flex;align-items:center;gap:5px;min-height:24px;font-size:9px}
.e052-choice input{width:16px;height:16px;min-width:16px;min-height:16px;margin:0;accent-color:var(--gold)}
.e052-choice input:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e052-toggle{
  min-height:36px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer;
}
.e052-toggle[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1)}
.e052-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e052-readout{margin:7px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
.chronology-layout[data-e052-motion="reduce"] .era-band,
.chronology-layout[data-e052-motion="reduce"] .event-card,
.chronology-layout[data-e052-motion="reduce"] .atlas-chrono-tag,
.chronology-layout[data-e052-motion="reduce"] .chronology-main,
.chronology-layout[data-e052-motion="reduce"] .chronology-aside,
.chronology-layout[data-e052-motion="reduce"] .e052-panel *{
  transition:none!important;animation:none!important;scroll-behavior:auto!important;
}
@media (max-width:620px){
  .e052-panel{padding:7px 8px}
  .e052-toggle{width:100%}
  .e052-choices{gap:4px 8px}
}
@media (prefers-reduced-motion:reduce){
  .e052-panel,.e052-title,.e052-choice,.e052-toggle,.e052-readout{
    transition:none!important;animation:none!important;
  }
}`;

/* État module : réinterrogé à partir du dernier ctx, jamais un `stage`
   capturé (la coque reconstruit le DOM à chaque rendu, chronology.js:30-31). */
let latest = null;
let applies = 0;
let systemChanges = 0;
let userChanges = 0;
let neutralized = 0;
let announces = 0;
let override = readStored();
let announceEnabled = true;
let lastSystem = null;
let mediaQuery = null;
let mediaBound = false;
let pendingText = '';
let flushQueued = false;
let lastSaid = '';
let focusToken = null;

function afterCommit(fn) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else Promise.resolve().then(fn);
}

/* E052-03 : persistance locale et silencieuse. Le stockage est facultatif :
   si le navigateur le refuse, l'état module reste la source de vérité. */
function readStored() {
  try {
    if (typeof localStorage === 'undefined') return 'system';
    const raw = localStorage.getItem(STORE_KEY);
    return raw === 'reduce' || raw === 'full' ? raw : 'system';
  } catch {
    return 'system';
  }
}

function writeStored(value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, value);
  } catch {
    /* Stockage indisponible : aucun effet de bord, l'état module suffit. */
  }
}

function findMain() {
  if (!latest || !latest.stage) return null;
  return latest.stage.querySelector('.chronology-main') || latest.layout || null;
}

function findLayout() {
  if (!latest || !latest.layout) return null;
  return latest.layout;
}

/* E052-02 : une seule source système. `ctx.reducedMotion()` est la voie
   officielle (registry.js:33-35) ; le MediaQueryList ne sert qu'à recevoir
   les changements en direct, sans polling. */
function currentSystem() {
  if (mediaQuery) return Boolean(mediaQuery.matches);
  if (latest && typeof latest.reducedMotion === 'function') {
    try { return Boolean(latest.reducedMotion()); } catch { return false; }
  }
  return false;
}

function effectiveReduced() {
  if (override === 'reduce') return true;
  if (override === 'full') return false;
  return currentSystem();
}

function sourceLabel() {
  if (override === 'reduce') return 'utilisateur (réduit)';
  if (override === 'full') return 'utilisateur (complet)';
  return 'système';
}

function modeLabel(reduced) {
  return reduced ? 'réduit' : 'complet';
}

function bindMedia() {
  if (mediaBound || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  mediaBound = true;
  try {
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => {
      const reduced = Boolean(event && event.matches);
      if (lastSystem !== null && reduced === lastSystem) return;
      lastSystem = reduced;
      systemChanges += 1;
      refresh();
      if (override === 'system') announce(`Préférence du système : mouvement ${modeLabel(reduced)}.`);
    };
    lastSystem = Boolean(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onChange);
    }
  } catch {
    mediaQuery = null;
  }
}

/* E052-05 : une seule microtâche par salve, zéro timer. Le message cible
   exclusivement la région canonique `#nav-c2a-live` : aucune deuxième
   région live n'est créée (chronology.js:119-138). */
function announce(message) {
  if (!announceEnabled) return;
  const text = String(message == null ? '' : message).trim();
  if (!text) return;
  pendingText = text;
  if (flushQueued) return;
  flushQueued = true;
  afterCommit(() => {
    flushQueued = false;
    const value = pendingText;
    pendingText = '';
    if (!value) return;
    const node = document.getElementById(LIVE_ID);
    if (!node || !node.isConnected) return;
    if (node.textContent !== value) node.textContent = value;
    lastSaid = value;
    announces += 1;
  });
}

function bindOnce(node, event, handler) {
  if (!node || node.dataset.e052Bound === '1') return;
  node.dataset.e052Bound = '1';
  node.addEventListener(event, handler);
}

function keepFocus(id) {
  focusToken = id;
  const token = id;
  afterCommit(() => { if (focusToken === token) focusToken = null; });
}

function restoreFocus() {
  const id = focusToken;
  focusToken = null;
  if (!id) return;
  afterCommit(() => {
    const target = document.getElementById(id);
    if (target && typeof target.focus === 'function') target.focus();
  });
}

/* E052-03 : les trois choix forment un groupe à sélection unique ; des
   boutons radio natifs apportent gratuitement la sémantique `radiogroup`,
   les flèches du clavier et `aria-checked`. La bascule d'annonce, elle,
   est indépendante et utilise `aria-pressed` (E052-05). */
function addChoice(fieldset, id, value, labelText) {
  const wrap = latest.el('div', 'e052-choice');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'e052-mode';
  input.id = id;
  input.value = value;
  const label = latest.el('label', '', labelText);
  label.htmlFor = id;
  bindOnce(input, 'change', () => {
    if (input.value !== 'system' && input.value !== 'reduce' && input.value !== 'full') return;
    if (override === input.value) return;
    override = input.value;
    writeStored(override);
    userChanges += 1;
    refresh();
    announce(`Mouvement : ${override === 'system' ? 'selon le système' : modeLabel(effectiveReduced())}.`);
    keepFocus(id);
  });
  wrap.append(input, label);
  fieldset.appendChild(wrap);
}

function buildPanel(main) {
  if (!main || typeof latest.el !== 'function') return null;
  let panel = main.querySelector(`#${PANEL_ID}`);
  if (panel) return panel;
  panel = latest.el('section', 'e052-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Préférences de mouvement de la Chronologie');

  const title = latest.el('h2', 'e052-title', 'Confort visuel · mouvement');
  title.id = TITLE_ID;
  panel.appendChild(title);

  const fieldset = latest.el('fieldset', 'e052-fieldset');
  fieldset.appendChild(latest.el('legend', 'e052-legend', 'Préférence de mouvement'));
  const choices = latest.el('div', 'e052-choices');
  addChoice(choices, MODE_SYSTEM_ID, 'system', 'Suivre le système');
  addChoice(choices, MODE_REDUCE_ID, 'reduce', 'Toujours réduit');
  addChoice(choices, MODE_FULL_ID, 'full', 'Toujours complet');
  fieldset.appendChild(choices);
  panel.appendChild(fieldset);

  const toggle = latest.el('button', 'e052-toggle', 'Annoncer les changements de préférence');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  bindOnce(toggle, 'click', () => {
    announceEnabled = !announceEnabled;
    userChanges += 1;
    refresh();
    if (announceEnabled) announce('Annonces des préférences activées.');
    keepFocus(TOGGLE_ID);
  });
  panel.appendChild(toggle);

  const readout = latest.el('p', 'e052-readout');
  readout.id = READOUT_ID;
  panel.appendChild(readout);
  main.appendChild(panel);
  return panel;
}

/* E052-06 : texte réel, indexable, dans un `role=group` sans `aria-live`
   pour ne pas ajouter de canal vocal concurrent. E052-04 : l'état effectif
   est écrit sur le layout, ancêtre commun du récit et de la fiche. */
function updatePanel(panel) {
  if (!panel) return;
  const main = findMain();
  const layout = findLayout();
  const system = currentSystem();
  const reduced = effectiveReduced();
  lastSystem = system;

  if (main) main.dataset.e052System = system ? 'reduce' : 'full';
  if (layout) {
    layout.dataset.e052Motion = reduced ? 'reduce' : 'full';
    layout.dataset.e052Source = override;
  }
  panel.dataset.e052System = system ? 'reduce' : 'full';
  panel.dataset.e052Effective = reduced ? 'reduce' : 'full';
  panel.dataset.e052Source = override;

  const systemRadio = panel.querySelector(`#${MODE_SYSTEM_ID}`);
  const reduceRadio = panel.querySelector(`#${MODE_REDUCE_ID}`);
  const fullRadio = panel.querySelector(`#${MODE_FULL_ID}`);
  if (systemRadio) systemRadio.checked = override === 'system';
  if (reduceRadio) reduceRadio.checked = override === 'reduce';
  if (fullRadio) fullRadio.checked = override === 'full';

  const toggle = panel.querySelector(`#${TOGGLE_ID}`);
  if (toggle) {
    toggle.setAttribute('aria-pressed', announceEnabled ? 'true' : 'false');
    toggle.setAttribute('aria-label', announceEnabled
      ? 'Annonces des préférences activées — désactiver'
      : 'Annonces des préférences désactivées — activer');
  }

  const readout = panel.querySelector(`#${READOUT_ID}`);
  if (!readout) return;
  const text = `Préférences E052 : ${applies} rendu(s), ${systemChanges} changement(s) du système, `
    + `${userChanges} réglage(s) utilisateur, ${neutralized} rendu(s) neutralisé(s), `
    + `${announces} annonce(s) · préférence effective : ${modeLabel(reduced)} · `
    + `source : ${sourceLabel()} · annonces : ${announceEnabled ? 'activées' : 'désactivées'}.`;
  if (readout.textContent !== text) readout.textContent = text;
}

function refresh() {
  const main = findMain();
  if (!main) return;
  updatePanel(main.querySelector(`#${PANEL_ID}`));
}

/* E052-10 : surface de vérification en lecture seule, additivité sans
   effet au rendu — même principe que E40.js:319-330 et E050.js:300-313. */
if (typeof window !== 'undefined') {
  window.VECTEMPOREL_E052 = Object.freeze({
    chantiers: () => CHANTIERS.slice(),
    state: () => Object.freeze({
      applies,
      systemChanges,
      userChanges,
      neutralized,
      announces,
      css: typeof document !== 'undefined' && Boolean(document.getElementById(CSS_ID)),
      panels: typeof document === 'undefined' ? 0 : document.querySelectorAll(`#${PANEL_ID}`).length,
      system: currentSystem(),
      override,
      effective: effectiveReduced(),
      layout: findLayout() && findLayout().dataset
        ? (findLayout().dataset.e052Motion || '') : '',
      lastSaid,
    }),
  });
}

register('E052', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.el !== 'function') return;
  latest = ctx;
  applies += 1;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  bindMedia();

  const main = findMain();
  if (!main) return;
  const reduced = effectiveReduced();
  if (reduced) neutralized += 1;
  updatePanel(buildPanel(main));
  restoreFocus();
});
