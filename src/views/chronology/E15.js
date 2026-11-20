import { register } from './registry.js';
import { set } from '../../domain/store.js';

/* Lentille E15 — focus et piège (vague CHRONOLOGIE).
 * Fichier possédé : src/views/chronology/E15.js (appelé aussi E015.js par la
 * convention à trois chiffres du registre ; E015.js importe ce module).
 * Lectures seules : src/views/chronology.js, src/ui/shell.js,
 * src/platform/keyboard.js, src/views/_diagnostics.js, src/domain/store.js,
 * styles.css. 10 chantiers E15-01..10, tous implémentés ici.
 * Zéro console, zéro réseau, zéro aléa, aucun écouteur keydown ajouté
 * (contrat verify.mjs:27 : routeur clavier unique). */

const CSS_ID = 'chronology-e15';
const PANEL_ID = 'chronology-focuslab-panel';
const TITLE_ID = 'chronology-focuslab-title';
const NOTE_ID = 'chronology-focuslab-note';
const READOUT_ID = 'chronology-focuslab-readout';
const RENDER_BTN_ID = 'chronology-focuslab-render';
const ANNOUNCE_BTN_ID = 'chronology-focuslab-announce';
const SEARCH_ID = 'atlas-chrono-search';
const LIVE_ID = 'nav-c2a-live';
const COUNTRY_TITLE_KEY = 'country-title';

const CSS = `
.chronology-focuslab{margin:18px 0 2px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:rgba(127,156,255,.04)}
.chronology-focuslab-title{margin:0 0 6px;color:var(--gold-bright);font-family:var(--serif);font-size:13px;font-weight:450}
.chronology-focuslab-note{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.55}
.chronology-focuslab-readout{margin:0 0 8px;padding:7px 9px;border-left:2px solid var(--blue);background:rgba(8,11,16,.5);color:var(--ink-soft);font-size:9px;line-height:1.6;font-variant-numeric:tabular-nums}
.chronology-focuslab-actions{display:flex;flex-wrap:wrap;gap:6px}
.chronology-focuslab-actions button{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.chronology-focuslab-actions button:hover{border-color:var(--gold)}
.chronology-focuslab-actions button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#atlas-chrono-aside [data-fk="${COUNTRY_TITLE_KEY}"]{scroll-margin-block:60px}
#atlas-chrono-aside [data-fk="${COUNTRY_TITLE_KEY}"]:focus-visible{outline:2px solid var(--gold-bright);outline-offset:3px}
@media (max-width:620px){.chronology-focuslab{padding:8px}.chronology-focuslab-actions button{flex:1 1 100%}}
@media (prefers-reduced-motion:reduce){.chronology-focuslab-actions button{transition:none}}
`;

/* État de module : survit aux `root.innerHTML = ''` de la coque (shell.js:533). */
let expectedId = null;
let observedId = '';
let witness = '';
let caret = null;
let generation = 0;
let renderCount = 0;
let inputBound = false;
let focusBound = false;

function ensureNode(id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function activeName() {
  const active = document.activeElement;
  if (!active) return 'aucun';
  return active.id || active.getAttribute('data-fk') || active.tagName.toLowerCase();
}

function pressedCount() {
  return document.querySelectorAll(
    '#atlas-chrono-tools [aria-pressed="true"], #atlas-chrono-aside [aria-pressed="true"]'
  ).length;
}

function say(message) {
  /* E15-08 : aucune région live supplémentaire ; réemploi de #nav-c2a-live. */
  const node = document.getElementById(LIVE_ID);
  if (node) node.textContent = message;
}

function updateReadout() {
  const panel = document.getElementById(PANEL_ID);
  const node = document.getElementById(READOUT_ID);
  if (!panel || !node) return;
  const frozen = Boolean(document.querySelector('.help-overlay, .detail-overlay'));
  const parts = [
    `Focus courant : ${activeName()}.`,
    `Dernière cible observée : ${observedId || 'aucune'}.`,
    `Restauration : ${witness || 'non testée'}.`,
    `Caret du champ : ${caret ? `${caret.start}–${caret.end}` : 'non saisi'}.`,
    `Thèmes actifs : ${pressedCount()} (un filtre, deux commandes).`,
    frozen ? 'Modale ouverte : contrôles gelés, aucun piège ajouté.' : 'Modale fermée : Tab reste dans la page.',
  ];
  node.textContent = parts.join(' ');
  panel.dataset.e15Active = activeName();
  panel.dataset.e15Frozen = frozen ? '1' : '0';
  panel.dataset.e15Pressed = String(pressedCount());
  panel.dataset.e15Caret = caret ? `${caret.start}-${caret.end}` : '';
  panel.dataset.e15Witness = witness;
}

register('E15', (ctx) => {
  const { stage, layout } = ctx;
  if (!stage || !layout) return;
  const main = layout.querySelector('.chronology-main') || stage;
  if (!main) return;

  /* E15-07 : ids sans motif `-e15`, donc pas happés par le tiroir de
     _diagnostics.js (`/^(e\d\d[-_ ]|.*-e\d\d)/`) ; le panneau reste dans
     #atlas-stage et reçoit bien `inert` quand une modale s'ouvre (E15-09). */
  ctx.css(CSS_ID, CSS);

  const panel = ensureNode(PANEL_ID, 'section', 'chronology-focuslab', main);
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('aria-describedby', NOTE_ID);

  const title = ensureNode(TITLE_ID, 'h2', 'chronology-focuslab-title', panel);
  title.textContent = 'Laboratoire E15 — focus et piège';

  const note = ensureNode(NOTE_ID, 'p', 'chronology-focuslab-note', panel);
  note.textContent = 'La coque reconstruit le DOM à chaque changement d’état : le nœud focalisé disparaît, puis la restauration du focus et le routeur clavier se succèdent. Ce laboratoire rend ces mécanismes lisibles. Aucun gestionnaire de touche n’est ajouté : les flèches restent celles du routeur unique.';

  ensureNode(READOUT_ID, 'p', 'chronology-focuslab-readout', panel);

  const actions = ensureNode('chronology-focuslab-actions', 'div', 'chronology-focuslab-actions', panel);
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Commandes du laboratoire de focus');

  /* E15-01 / E15-02 : provoquer un rendu sans changer la sélection ; la
     cible attendue est mémorisée hors DOM puis comparée après manageFocus. */
  const renderBtn = ensureNode(RENDER_BTN_ID, 'button', null, actions);
  renderBtn.type = 'button';
  renderBtn.textContent = 'Tester la restauration';
  renderBtn.dataset.fk = RENDER_BTN_ID;
  renderBtn.setAttribute('aria-keyshortcuts', 'Enter');

  /* E15-08 : annonce explicite sur action, jamais sur survol ni au rendu. */
  const announceBtn = ensureNode(ANNOUNCE_BTN_ID, 'button', null, actions);
  announceBtn.type = 'button';
  announceBtn.textContent = 'Annoncer l’état du focus';
  announceBtn.dataset.fk = ANNOUNCE_BTN_ID;

  if (renderBtn.dataset.e15Bound !== '1') {
    renderBtn.dataset.e15Bound = '1';
    renderBtn.addEventListener('click', () => {
      expectedId = RENDER_BTN_ID;
      witness = 'attente du rendu…';
      const before = renderCount;
      set({}, 'chrono-filter');
      if (renderCount === before) witness = 'rendu non observé';
      updateReadout();
    });
  }
  if (announceBtn.dataset.e15Bound !== '1') {
    announceBtn.dataset.e15Bound = '1';
    announceBtn.addEventListener('click', () => {
      say(`Laboratoire E15 : focus sur ${activeName()}, thèmes actifs ${pressedCount()}.`);
      updateReadout();
    });
  }

  /* E15-03 : capturer le caret en phase de capture, avant le handler `input`
     de chronology.js:320 qui déclenche le rendu synchrone. Un seul écouteur
     documentaire, installé une fois, sans keydown. */
  if (!inputBound) {
    inputBound = true;
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (target && target.id === SEARCH_ID) {
        caret = { start: target.selectionStart, end: target.selectionEnd };
        updateReadout();
      }
    }, true);
  }

  /* E15-04 : observer les entrées de focus sans écouter les touches. */
  if (!focusBound) {
    focusBound = true;
    document.addEventListener('focusin', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      observedId = target.id || target.getAttribute('data-fk') || target.tagName.toLowerCase();
      updateReadout();
    });
  }

  updateReadout();

  /* Le rendu de la coque continue après runEnhancements (manageFocus à
     shell.js:562, modales à :560-561) : la vérification est donc différée
     d'une microtâche. Le compteur de génération écarte les microtâches
     périmées quand plusieurs rendus ont lieu dans le même tick. */
  renderCount += 1;
  const gen = ++generation;
  queueMicrotask(() => {
    if (gen !== generation) return;
    if (expectedId) {
      witness = activeName() === expectedId
        ? `cible ${expectedId} restaurée`
        : `cible réaffectée : ${activeName()}`;
      expectedId = null;
    }
    const search = document.getElementById(SEARCH_ID);
    if (search && caret && document.activeElement === search) {
      const end = Math.min(caret.end, search.value.length);
      const start = Math.min(caret.start, end);
      search.setSelectionRange(start, end);
    }
    updateReadout();
  });
});
