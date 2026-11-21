import { register } from './registry.js';

/* Lentille E010 — Mouvement et transitions appliqués aux soleils de la vue
   Constellation. Dix chantiers locaux, déterministes, sans réseau ni aléa.
   Greffon tolérant : toute anomalie neutralise la lentille sans exception
   (aucune journalisation, aucun appel réseau, aucune graine aléatoire). */
register('E010', (ctx) => {
  /* Garde d'entrée : vérification de ctx.layout avant tout ajout au DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (typeof document === 'undefined') return;

  try {
    const layout = ctx.layout;
    const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
    const suns = Array.prototype.slice.call(layout.querySelectorAll('.const-sun'));
    let motionOn = !reduced;
    let readout = null;

    /* E010-01 — Feuille de style isolée : une seule injection préfixée, zéro import. */
    ctx.css('constellation-e010', `
      /* E010 — mouvement des soleils (portée : .constellation-layout uniquement). */
      .constellation-layout .e010-sun {
        transition: transform .38s cubic-bezier(.2,.7,.2,1), filter .38s ease, box-shadow .38s ease;
        animation: e010-rise .6s ease var(--e010-delay, 0s) both;
      }
      .constellation-layout .e010-sun.e010-hover:hover,
      .constellation-layout .e010-sun.e010-hover:focus-visible {
        transform: translate(-50%, -50%) scale(1.12);
        filter: brightness(1.18);
        z-index: 5;
      }
      @keyframes e010-rise {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes e010-breathe {
        0%, 100% { box-shadow: 0 0 0 0 rgba(244,214,158,0), 0 0 12px 2px rgba(244,214,158,.26); }
        50%      { box-shadow: 0 0 0 6px rgba(244,214,158,.08), 0 0 22px 6px rgba(244,214,158,.46); }
      }
      .constellation-layout .e010-sun-active {
        border-radius: 50%;
        animation: e010-rise .6s ease var(--e010-delay, 0s) both,
                   e010-breathe 3.2s ease-in-out calc(var(--e010-delay, 0s) + .6s) infinite;
      }
      @keyframes e010-spin { to { transform: rotate(360deg); } }
      .e010-ring {
        position: absolute; inset: 2px; border-radius: 50%;
        border: 1px solid var(--era, #f4d69e); border-top-color: transparent;
        pointer-events: none;
        transition: inset .3s ease, border-width .3s ease;
        animation: e010-spin var(--e010-spin, 16s) linear var(--e010-phase, 0s) infinite;
      }
      .e010-ring.e010-reverse { animation-direction: reverse; }
      .e010-orbit {
        position: absolute; inset: -9px; border-radius: 50%; opacity: .4;
        pointer-events: none;
        background: conic-gradient(from 0deg, transparent 0 68%, rgba(244,214,158,.42) 88%, transparent 100%);
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
        mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
        transition: opacity .3s ease;
        animation: e010-spin calc(var(--e010-spin, 16s) * 1.7) linear var(--e010-phase, 0s) infinite reverse;
      }
      .constellation-layout .e010-sun.e010-engaged .e010-ring { inset: -2px; border-width: 2px; }
      .constellation-layout .e010-sun.e010-engaged .e010-orbit { opacity: 1; }
      .constellation-layout[data-e010-motion="off"] .e010-sun,
      .constellation-layout[data-e010-motion="off"] .e010-ring,
      .constellation-layout[data-e010-motion="off"] .e010-orbit {
        animation: none !important; transition: none !important;
      }
      @media (prefers-reduced-motion: reduce) {
        .constellation-layout .e010-sun,
        .constellation-layout .e010-ring,
        .constellation-layout .e010-orbit { animation: none !important; transition: none !important; }
      }
      .e010-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 10px; }
      .e010-toggle {
        min-height: 36px; padding: 0 12px;
        border: 1px solid var(--line, rgba(255,255,255,.1)); border-radius: 8px;
        background: rgba(255,255,255,.04); color: var(--ink-soft, #d7d1c6);
        font: inherit; font-size: 10px; cursor: pointer;
      }
      .e010-toggle:hover { border-color: var(--gold, #e6b96f); color: var(--gold-bright, #f4d69e); }
      .e010-toggle:focus-visible { outline: 2px solid var(--gold, #e6b96f); outline-offset: 2px; }
      .e010-readout { margin: 0; color: var(--muted-2, #8c8d91); font-size: 9px; line-height: 1.45; }
    `);
    layout.setAttribute('data-e010-motion', motionOn ? 'on' : 'off');

    /* E010-02 — Entrée en cascade : classe et délai calculé sans aléa. */
    suns.forEach((sun, index) => {
      sun.classList.add('e010-sun');
      const delay = Math.min(index * 0.09, 0.9).toFixed(2);
      sun.style.setProperty('--e010-delay', `${delay}s`);
    });

    /* E010-03 — Halo respirant réservé au soleil de l'ère active. */
    const active = layout.querySelector('.const-sun.is-active');
    if (active) active.classList.add('e010-sun-active');

    /* E010-04 — Transition de survol et de focus : classe d'activation. */
    suns.forEach((sun) => sun.classList.add('e010-hover'));

    /* E010-05 — Anneau tournant : enfant décoratif et durée calculée par ère. */
    suns.forEach((sun, index) => {
      const ring = ctx.el('span', 'e010-ring');
      ring.setAttribute('aria-hidden', 'true');
      sun.appendChild(ring);
      sun.style.setProperty('--e010-spin', `${(14 + index * 3)}s`);
    });

    /* E010-06 — Orbites décoratives : arc tournant à phase calculée. */
    suns.forEach((sun, index) => {
      const orbit = ctx.el('span', 'e010-orbit');
      orbit.setAttribute('aria-hidden', 'true');
      sun.appendChild(orbit);
      sun.style.setProperty('--e010-phase', `${(-(index % 5) * 0.4).toFixed(1)}s`);
    });

    /* E010-07 — Sens de rotation alterné selon la parité de l'index. */
    suns.forEach((sun, index) => {
      const ring = sun.querySelector('.e010-ring');
      if (ring && index % 2 === 1) ring.classList.add('e010-reverse');
    });

    /* E010-08 — Engagement pointeur/clavier : écouteurs pilotant la transition. */
    suns.forEach((sun) => {
      const engage = () => sun.classList.add('e010-engaged');
      const release = () => sun.classList.remove('e010-engaged');
      sun.addEventListener('pointerenter', engage);
      sun.addEventListener('pointerleave', release);
      sun.addEventListener('focus', engage);
      sun.addEventListener('blur', release);
    });

    /* E010-09 — Bascule mouvement réduit : bouton, aria-pressed et écouteur. */
    const bar = ctx.el('div', 'e010-bar');
    bar.id = 'e010-bar';
    const toggle = ctx.el('button', 'e010-toggle', motionOn ? 'Réduire le mouvement' : 'Rétablir le mouvement');
    toggle.id = 'e010-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', motionOn ? 'false' : 'true');
    toggle.addEventListener('click', () => {
      motionOn = !motionOn;
      layout.setAttribute('data-e010-motion', motionOn ? 'on' : 'off');
      toggle.textContent = motionOn ? 'Réduire le mouvement' : 'Rétablir le mouvement';
      toggle.setAttribute('aria-pressed', motionOn ? 'false' : 'true');
      if (readout) {
        readout.textContent = motionOn
          ? 'Mouvement actif : entrée en cascade, halo respirant et rotation des soleils.'
          : 'Mouvement réduit : animations et transitions suspendues.';
      }
    });
    bar.appendChild(toggle);

    /* E010-10 — Readout accessible : état annoncé, initialisé depuis le système. */
    readout = ctx.el('p', 'e010-readout', motionOn
      ? 'Mouvement actif : entrée en cascade, halo respirant et rotation des soleils.'
      : 'Mouvement réduit : animations et transitions suspendues.');
    readout.id = 'e010-readout';
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    bar.appendChild(readout);
    layout.appendChild(bar);
  } catch {
    return;
  }
});
