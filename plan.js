/* Vectemporel — Plan : point d'entrée unique.
 *
 * Quatre destinations, une grille carrée, aucun écran caché. Le Plan reste
 * ouvert derrière les vues Récit et Dragon : fermer l'une ramène ici.
 */
(() => {
  'use strict';

  const DATA = window.VECTEMPOREL_DATA;
  const COUNTRIES = (DATA?.countries || []).filter((country) => country.events?.length);
  const VIEWS = ['recit', 'dragon', 'frise', 'lecteur'];

  const state = {
    initialized: false,
    open: false,
    selected: 0,
    cards: [],
    helpOpen: false,
    lastFocus: null,
  };

  const els = {};

  function cacheElements() {
    els.overlay = document.getElementById('plan-overlay');
    els.grid = document.getElementById('plan-grid');
    els.help = document.getElementById('plan-help');
    els.helpBtn = document.getElementById('plan-help-btn');
    els.helpClose = document.getElementById('plan-help-close');
    els.mainBtn = document.getElementById('plan-main-btn');
    els.storyPlanBtn = document.getElementById('story-plan-btn');
    els.dragonPlanBtn = document.getElementById('dragon-plan-btn');
    els.cards = [...document.querySelectorAll('.plan-card')];
    state.cards = els.cards;
  }

  function updateSelection() {
    els.cards.forEach((card, index) => card.classList.toggle('is-selected', index === state.selected));
    els.cards[state.selected]?.focus({ preventScroll: true });
  }

  function open(options = {}) {
    if (!state.initialized) init();
    if (!els.overlay) return;
    state.open = true;
    state.lastFocus = document.activeElement;
    els.overlay.hidden = false;
    if (options.selected !== undefined) state.selected = Math.max(0, Math.min(3, options.selected));
    requestAnimationFrame(() => {
      updateSelection();
      if (options.help) openHelp();
    });
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    closeHelp();
    els.overlay.hidden = true;
  }

  function openHelp() {
    state.helpOpen = true;
    els.help.hidden = false;
    requestAnimationFrame(() => els.helpClose.focus({ preventScroll: true }));
  }

  function closeHelp() {
    if (!state.helpOpen) return;
    state.helpOpen = false;
    els.help.hidden = true;
    els.cards[state.selected]?.focus({ preventScroll: true });
  }

  function firstEventId() {
    const country = COUNTRIES.find((item) => item.id === (window.VECTEMPOREL_APP?.getCountryId?.() || 'france')) || COUNTRIES[0];
    return country.events[0]?.id || null;
  }

  function goTo(view) {
    if (!VIEWS.includes(view)) return;
    closeHelp();
    if (view === 'recit') {
      window.VECTEMPOREL_STORY?.open();
      return;
    }
    if (view === 'dragon') {
      window.VECTEMPOREL_DRAGON?.open(undefined, { permanent: false });
      return;
    }
    // Frise et lecteur sont des vues de la coque : le Plan s'efface.
    window.VECTEMPOREL_DRAGON?.close({ force: true });
    window.VECTEMPOREL_STORY?.close();
    close();
    if (view === 'lecteur') {
      const id = firstEventId();
      if (id) window.VECTEMPOREL_APP?.openEvent(id);
    }
  }

  function onKeyDown(event) {
    if (!state.open) return;
    if (state.helpOpen) {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault();
        closeHelp();
      }
      return;
    }
    if (event.key === '?') {
      event.preventDefault();
      openHelp();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      state.selected = (state.selected + 1) % 4;
      updateSelection();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      state.selected = (state.selected + 3) % 4;
      updateSelection();
      return;
    }
    if (/^[1-4]$/.test(event.key)) {
      event.preventDefault();
      state.selected = Number(event.key) - 1;
      updateSelection();
      return;
    }
    const shortcuts = { r: 'recit', d: 'dragon', f: 'frise', l: 'lecteur' };
    const shortcut = shortcuts[event.key.toLowerCase()];
    if (shortcut) {
      event.preventDefault();
      goTo(shortcut);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      goTo(VIEWS[state.selected]);
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...els.overlay.querySelectorAll('button:not([disabled])')]
        .filter((node) => node.offsetParent !== null && !els.help.contains(node));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function bind() {
    els.cards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => {
        state.selected = index;
        updateSelection();
      });
      card.addEventListener('click', () => goTo(card.dataset.view));
    });
    els.helpBtn?.addEventListener('click', openHelp);
    els.helpClose?.addEventListener('click', closeHelp);
    els.mainBtn?.addEventListener('click', () => open());
    els.storyPlanBtn?.addEventListener('click', () => {
      window.VECTEMPOREL_STORY?.close();
      open();
    });
    els.dragonPlanBtn?.addEventListener('click', () => {
      window.VECTEMPOREL_DRAGON?.close({ force: true });
      open();
    });
    document.addEventListener('keydown', onKeyDown);
  }

  function init() {
    if (state.initialized) return;
    cacheElements();
    if (!els.overlay) return;
    state.initialized = true;
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.VECTEMPOREL_PLAN = { open, close, goTo, state: () => ({ ...state }) };

  // Le Plan est le point de départ : il remplace l'ouverture automatique
  // du Récit et du Dragon au chargement.
  const start = () => {
    if (new URLSearchParams(window.location.search).has('classic')) return;
    window.setTimeout(() => open(), 180);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
