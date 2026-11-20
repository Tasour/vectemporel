import { register } from './registry.js';

/* Lentille E001 — accessibilité clavier des soleils de la vue Constellation.
   Dix chantiers locaux et complémentaires : aucun appel réseau, aucune
   source aléatoire, aucun minuteur ni boucle d'animation propre. */
register('E001', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;

  /* Feuille unique de la lentille : focus visible, aide, badge, mode sobre. */
  css('constellation-e001', `
.e001-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.const-sun:focus{outline:none}
.const-sun:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px;border-radius:50%;box-shadow:0 0 0 6px rgba(244,214,158,.18);transform:translate(-50%,-50%) scale(1.06);z-index:5}
.e001-skip{position:absolute;left:10px;top:-64px;z-index:9;min-height:36px;padding:0 12px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer;transition:top .15s ease}
.e001-skip:focus-visible{top:8px}
.const-sun::before{position:absolute;top:-15px;left:50%;transform:translateX(-50%);content:attr(data-e001-rank);color:var(--gold-bright);font-size:8px;white-space:nowrap;opacity:0;pointer-events:none}
.const-sun:focus-visible::before{opacity:1}
.e001-calm .const-sun,.e001-calm .e001-skip{transition:none}
.e001-calm .const-sun:focus-visible{box-shadow:none;transform:translate(-50%,-50%)}
@media (prefers-reduced-motion: reduce){.const-sun,.e001-skip{transition:none!important}.const-sun:focus-visible{transform:translate(-50%,-50%)}}
`);

  const sunLayer = layout.querySelector('.const-layer-suns');
  if (!sunLayer) return;
  const suns = Array.from(sunLayer.querySelectorAll('button.const-sun'));
  if (!suns.length) return;

  const activeIndex = Math.max(0, suns.findIndex(sun => sun.classList.contains('is-active')));

  /* E001-01 — Groupe à choix unique : rôle radiogroupe, rôle radio et état coché. */
  sunLayer.id = 'e001-suns';
  sunLayer.setAttribute('role', 'radiogroup');
  sunLayer.setAttribute('aria-label', `${sunLayer.getAttribute('aria-label') || 'Ères'} — un seul choix`);
  suns.forEach((sun, index) => {
    sun.setAttribute('role', 'radio');
    sun.setAttribute('aria-checked', index === activeIndex ? 'true' : 'false');
  });

  /* E001-02 — Roving tabindex : Tab n'atteint que le soleil coché du groupe. */
  suns.forEach((sun, index) => {
    sun.tabIndex = index === activeIndex ? 0 : -1;
    sun.dataset.e001Roving = index === activeIndex ? 'entree' : 'interne';
  });

  /* E001-03 — Flèches : parcours cyclique du radiogroupe, avant le routeur global. */
  const NAV_KEY = '__e001_sun_nav';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function'
      && typeof window.removeEventListener === 'function') {
    const previous = window[NAV_KEY];
    if (typeof previous === 'function') window.removeEventListener('keydown', previous, true);
    const onNav = (event) => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (!target || target.nodeType !== 1 || !sunLayer.contains(target)) return;
      if (typeof target.matches !== 'function' || !target.matches('button.const-sun')) return;
      const current = suns.indexOf(target);
      if (current < 0) return;
      let next = current;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % suns.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + suns.length) % suns.length;

      /* E001-04 — Home/End : saut direct à la première ou à la dernière ère. */
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = suns.length - 1;
      else return;

      event.preventDefault();
      event.stopPropagation();
      const destination = suns[next];
      if (destination && destination !== target) destination.click();
    };
    window[NAV_KEY] = onNav;
    window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, onNav);
  }

  /* E001-05 — Marquage du soleil focalisé : l'anneau de focus reste visible. */
  sunLayer.addEventListener('focusin', (event) => {
    const target = event && event.target;
    const sun = target && target.nodeType === 1 && typeof target.closest === 'function'
      ? target.closest('button.const-sun') : null;
    if (!sun || !sunLayer.contains(sun)) return;
    suns.forEach(node => node.removeAttribute('data-e001-focused'));
    sun.setAttribute('data-e001-focused', 'true');
  });

  /* E001-06 — Rang du soleil : badge visuel au focus, position annoncée. */
  suns.forEach((sun, index) => {
    sun.dataset.e001Rank = `${index + 1} / ${suns.length}`;
  });

  /* E001-07 — Région live : l'ère choisie est annoncée avant tout re-rendu. */
  let live = layout.querySelector('#e001-live');
  if (!live) {
    live = typeof ctx.el === 'function' ? ctx.el('p', 'e001-sr', '') : document.createElement('p');
    live.id = 'e001-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  sunLayer.addEventListener('click', (event) => {
    const target = event && event.target;
    const sun = target && target.nodeType === 1 && typeof target.closest === 'function'
      ? target.closest('button.const-sun') : null;
    if (!sun || !sunLayer.contains(sun)) return;
    live.textContent = `Ère retenue : ${sun.dataset.label || sun.getAttribute('aria-label') || ''} (${sun.dataset.e001Rank || ''}).`;
  }, true);

  /* E001-08 — Raccourci d'évitement : focus direct sur le soleil coché. */
  const field = layout.querySelector('.constellation-field');
  if (field && field.parentNode && !layout.querySelector('#e001-skip')) {
    const skip = typeof ctx.el === 'function'
      ? ctx.el('button', 'e001-skip', 'Aller aux soleils — ères')
      : document.createElement('button');
    skip.id = 'e001-skip';
    skip.type = 'button';
    skip.setAttribute('aria-controls', sunLayer.id);
    skip.addEventListener('click', () => {
      const current = sunLayer.querySelector('button.const-sun[tabindex="0"]') || suns[activeIndex];
      if (current) current.focus({ preventScroll: true });
    });
    field.parentNode.insertBefore(skip, field);
  }

  /* E001-09 — Aide contextuelle reliée au groupe et raccourcis déclarés. */
  let help = layout.querySelector('#e001-help');
  if (!help) {
    help = typeof ctx.el === 'function'
      ? ctx.el('p', 'e001-sr', 'Flèches : changer d’ère. Début et Fin : première et dernière ère. Entrée : ouvrir le détail. Tab : quitter le groupe.')
      : document.createElement('p');
    help.id = 'e001-help';
    layout.appendChild(help);
  }
  sunLayer.setAttribute('aria-describedby', help.id);
  suns.forEach(sun => sun.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End'));

  /* E001-10 — Mouvement réduit : mode sobre demandé au contexte, sans animation. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) sunLayer.classList.add('e001-calm');
  else sunLayer.classList.remove('e001-calm');
});
