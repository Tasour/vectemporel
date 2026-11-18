import { register } from './registry.js';

/* Lentille M13 — Survol clavier (domaine B : drapeau & révélation).
 * Équivalence clavier du survol pointeur : annonce dédiée, miroir textuel du
 * drapeau, sortie de survol (focusout / Échap) et gardes d'idempotence.
 * Un seul fichier possédé, aucun sélecteur de test modifié, aucun réseau. */

const CSS_ID = 'monde-m13';
const LIVE_ID = 'monde-m13-live';
const DESC_ID = 'monde-m13-desc';
const PANEL_ID = 'monde-m13-panel';
const TABLE_ID = 'monde-m13-table';
const FALLBACK_LABEL = 'Globe local des pays documentés. Flèches pour parcourir les pays, Entrée pour ouvrir.';

/* État du rendu courant. Les abonnements onHover/onLeave du registre sont
 * accumulés (registry.js:50-52) : tous les callbacks lisent ce pointeur module
 * plutôt qu'une closure locale, afin qu'un rendu précédent ne mette jamais à
 * jour des nœuds déconnectés. */
let current = null;
let baseLabel = null;
let documentBound = false;

function byId(id) {
  return document.getElementById(id);
}

function ensureBodyNode(tag, id, className, text) {
  let node = byId(id);
  if (node && node.isConnected) return node;
  node = document.createElement(tag);
  node.id = id;
  node.className = className;
  if (text) node.textContent = text;
  document.body.appendChild(node);
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function metaFor(country) {
  const points = country.points || [];
  const domains = new Set(points.map((point) => point.domain)).size;
  const domain = country.domain;
  const range = Array.isArray(domain) && domain.length === 2
    ? `${formatYear(domain[0])} → ${formatYear(domain[1])}` : '—';
  return {
    Pays: country.name || '—',
    Code: country.code || '—',
    Ères: String(country.eras ? country.eras.length : 0),
    Repères: String(country.events ? country.events.length : 0),
    Points: String(points.length),
    Couverture: `${domains}/14 domaines`,
    Plage: range,
  };
}

const ROWS = ['Pays', 'Code', 'Ères', 'Repères', 'Points', 'Couverture', 'Plage'];

function buildPanel(scene, el) {
  let panel = byId(PANEL_ID);
  if (panel && panel.isConnected && panel.parentElement === scene) return panel;
  panel = el('div', 'monde-m13-sr');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Aperçu clavier du survol');
  panel.setAttribute('aria-describedby', DESC_ID);
  const table = el('table');
  table.id = TABLE_ID;
  const body = el('tbody');
  const rows = {};
  ROWS.forEach((label) => {
    const tr = el('tr');
    const th = el('th', '', label);
    th.scope = 'row';
    const td = el('td', '', '—');
    tr.append(th, td);
    body.appendChild(tr);
    rows[label] = td;
  });
  table.appendChild(body);
  panel.appendChild(table);
  scene.appendChild(panel);
  panel.m13rows = rows;
  return panel;
}

function updateMirror(state, country) {
  const panel = state.panel;
  if (!panel || !panel.isConnected || !panel.m13rows) return;
  const values = country ? metaFor(country) : null;
  ROWS.forEach((label) => {
    panel.m13rows[label].textContent = values ? values[label] : '—';
  });
}

function positionOf(state, code) {
  if (!code) return '';
  const list = state.countries || [];
  const index = list.findIndex((country) => country && country.code === code);
  return index >= 0 ? `Pays ${index + 1} sur ${list.length}` : '';
}

function messageFor(state, country) {
  const meta = metaFor(country);
  const position = positionOf(state, country.code);
  const prefix = `${country.name}${position ? `, ${position}` : ''}`;
  return `${prefix}. Drapeau dans le contour : ${meta['Ères']} ères, ${meta['Repères']} repères, ${meta['Points']} points, ${meta.Couverture}.${state.reduced ? ' Aperçu statique.' : ''} Entrée pour ouvrir.`;
}

function announce(state, message) {
  if (!state || !state.live || !state.live.isConnected) return;
  if (state.lastMessage === message) return;
  state.lastMessage = message;
  state.live.textContent = message;
}

function isHost(state, node) {
  return !!(state && state.host && node && (node === state.host || state.host.contains(node)));
}

function isCountryButton(state, node) {
  if (!node || typeof node.closest !== 'function' || !state || !state.stage) return false;
  const button = node.closest('button[data-index]');
  return !!(button && button.isConnected && state.stage.contains(button));
}

function keyboardSource(state) {
  const active = document.activeElement;
  return isHost(state, active) || isCountryButton(state, active);
}

function clearHover(state, reason) {
  if (!state) return;
  state.active = false;
  state.lastCode = null;
  updateMirror(state, null);
  if (state.reveal && typeof state.reveal.leave === 'function') state.reveal.leave();
  if (state.host && baseLabel && state.host.getAttribute('aria-label') !== baseLabel) {
    state.host.setAttribute('aria-label', baseLabel);
  }
  announce(state, reason === 'escape' ? 'Aperçu du drapeau annulé.' : 'Aperçu du drapeau refermé.');
}

function onDocumentFocusIn(event) {
  const state = current;
  if (!state) return;
  const button = isCountryButton(state, event.target) ? event.target.closest('button[data-index]') : null;
  if (!button) return;
  const country = (state.countries || [])[Number(button.dataset.index)];
  if (!country) return;
  state.active = true;
  state.lastCode = country.code || null;
  /* Le miroir accessible suit le focus même si notifyMondeHover() n'a pas été
   * émis (par exemple si highlight() a été neutralisé par une autre lentille). */
  updateMirror(state, country);
  if (keyboardSource(state)) announce(state, messageFor(state, country));
  /* Repli : highlight() (globe.js:419) porte déjà le drapeau ; on ne le réclame
   * que si un rendu concurrent ne l'a pas fait. */
  if (state.reveal && typeof state.reveal.hover === 'function'
    && (!state.reveal.current || state.reveal.current() !== country)) {
    state.reveal.hover(country);
  }
}

function onDocumentFocusOut(event) {
  const state = current;
  if (!state || !state.active) return;
  const next = event.relatedTarget;
  if (isCountryButton(state, next) || isHost(state, next)) return;
  clearHover(state, 'focusout');
}

function onDocumentKeyDown(event) {
  const state = current;
  if (!state || event.key !== 'Escape' || !state.active) return;
  if (!keyboardSource(state)) return;
  clearHover(state, 'escape');
  /* Volontairement aucun preventDefault()/stopPropagation() : Échap reste géré
   * par le routeur unique (globe.js:226-227). */
}

function bindDocument() {
  if (documentBound) return;
  documentBound = true;
  document.addEventListener('focusin', onDocumentFocusIn);
  document.addEventListener('focusout', onDocumentFocusOut);
  document.addEventListener('keydown', onDocumentKeyDown);
}

register('M13', (ctx) => {
  const { host, scene, stage, countries, reveal, el, css, onHover, onLeave } = ctx || {};
  if (!host || !scene) return;

  css(CSS_ID, `
    .monde-m13-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
      overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  `);

  const live = ensureBodyNode('p', LIVE_ID, 'monde-m13-sr');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  ensureBodyNode('p', DESC_ID, 'monde-m13-sr',
    'Le drapeau du pays apparaît découpé dans son contour sur le globe ; les mêmes données sont données dans le tableau « Aperçu clavier du survol ».');

  if (!baseLabel) {
    const observed = host.getAttribute('aria-label') || '';
    baseLabel = observed && !observed.includes('mis en évidence') ? observed : FALLBACK_LABEL;
  }

  let reduced = false;
  try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); } catch { reduced = false; }

  current = {
    host, scene, stage, countries, reveal, el, live,
    panel: buildPanel(scene, el),
    reduced,
    active: false,
    lastCode: null,
    lastMessage: '',
  };

  /* Le registre vide ses tableaux à chaque rendu : on réarme exactement un
   * onHover et un onLeave par appel. Les callbacks lisent le pointeur module
   * `current`, donc un abonnement réarmé ne touche jamais un nœud déconnecté. */
  if (typeof onHover === 'function') {
    onHover((payload) => {
      const state = current;
      if (!state) return;
      const country = payload && payload.country;
      if (!country) { clearHover(state, 'leave'); return; }
      state.active = true;
      state.lastCode = country.code || null;
      updateMirror(state, country);
      /* Le pointeur voit le drapeau : on met le miroir à jour sans annoncer.
       * Seul le focus dans le host ou un bouton pays déclenche la voix. */
      if (keyboardSource(state)) announce(state, messageFor(state, country));
    });
  }
  if (typeof onLeave === 'function') {
    onLeave(() => {
      const state = current;
      if (!state) return;
      /* Le focus clavier prime sur un leave() issu de la souris. */
      if (state.active && keyboardSource(state)) return;
      clearHover(state, 'leave');
    });
  }

  bindDocument();
});
