import { register } from './registry.js';

/* Lentille E020 — Mouvement et transitions appliqués aux planètes de la vue
   Constellation. Dix chantiers (E020-01 … E020-10) réellement implémentés dans
   ce seul module : rotation orbitaire, Battement, traînée, anneau calculé,
   vitesse, entrée échelonnée, halo tournant, parallaxe, interrupteur de
   mouvement (couplé à prefers-reduced-motion) et témoin auditable.
   Zéro réseau, zéro aléa, zéro console, zéro minuteur, aucune boucle rAF
   propre, aucun fichier partagé modifié. Le mouvement est exclusivement CSS
   (transitions et @keyframes) piloté par des variables, attributs et classes
   posés ici ; le greffon reste tolérant et ne jette aucune exception. */

const CSS = `
/* E020 — panneau de commandes, posé au-dessus du champ, sans masquer le récit. */
.e020-panel{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:rgba(230,185,111,.035)}
.e020-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;margin-bottom:6px}
.e020-title{margin:0;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:600;letter-spacing:.04em}
.e020-controls{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.e020-controls label{color:var(--muted);font-size:9px}
.e020-controls button,.e020-controls select{min-height:36px;padding:4px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--ink-soft);font:inherit;font-size:9px;cursor:pointer}
.e020-controls input[type="range"]{min-height:24px;width:120px;accent-color:var(--gold);cursor:pointer}
.e020-controls button[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright)}
.e020-controls :is(button,select,input):focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e020-readout{margin:6px 0 0;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;line-height:1.5}

/* E020-01 — rotation orbitaire rigide : arêtes, soleils, planètes et lunes
   tournent ensemble autour du centre du champ ; la transition rend le geste lisible. */
.constellation-layout .constellation-edges,
.constellation-layout .const-layer{
  transform-origin:50% 50%;
  transform:rotate(calc(var(--e020-orbit,0) * 1deg));
  translate:var(--e020-px,0px) var(--e020-py,0px);
  transition:transform var(--e020-dur,520ms) cubic-bezier(.22,.61,.36,1),
             translate var(--e020-dur,520ms) ease-out;
}

/* E020-02 — battement de la planète active (box-shadow : jamais de transform,
   pour ne pas écraser le translate(-50%,-50%) posé par la vue). */
.e020-pulse .const-planet.is-active{animation:e020-pulse var(--e020-dur,520ms) ease-in-out infinite alternate}
@keyframes e020-pulse{from{box-shadow:0 0 0 0 rgba(230,185,111,.45)}to{box-shadow:0 0 0 7px rgba(230,185,111,0)}}

/* E020-03 — traînée de comète au survol ou au focus clavier d'une planète. */
.e020-trails .const-planet::before{
  content:"";position:absolute;left:50%;top:50%;width:26px;height:2px;
  transform:translate(-100%,-50%) scaleX(0);transform-origin:right center;
  background:linear-gradient(90deg,rgba(230,185,111,0),rgba(230,185,111,.55));
  border-radius:2px;opacity:0;pointer-events:none;
  transition:transform var(--e020-dur,520ms) ease,opacity var(--e020-dur,520ms) ease;
}
.e020-trails .const-planet:hover::before,
.e020-trails .const-planet:focus-visible::before{transform:translate(-100%,-50%) scaleX(1);opacity:1}

/* E020-04 — anneau orbital dont le rayon est calculé depuis les positions réelles. */
.e020-ring{
  position:absolute;left:50%;top:50%;z-index:0;pointer-events:none;
  width:calc(var(--e020-ring-x,20) * 2%);height:calc(var(--e020-ring-y,20) * 2%);
  transform:translate(-50%,-50%);border:1px dashed rgba(230,185,111,.22);
  border-radius:50%;
  transition:width var(--e020-dur,520ms) ease,height var(--e020-dur,520ms) ease;
}

/* E020-05 — la vitesse est la durée partagée --e020-dur, lue par chaque règle
   de transition et d'animation ci-dessus. */

/* E020-06 — entrée échelonnée : chaque planète reçoit son rang via --e020-i. */
.e020-enter .const-planet{animation:e020-enter var(--e020-dur,520ms) both;animation-delay:calc(var(--e020-i,0) * 45ms)}
@keyframes e020-enter{from{opacity:0;transform:translate(-50%,-50%) scale(.55)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}

/* E020-07 — halo tournant greffé sur la planète active (nœud dédié). */
.e020-halo{
  position:absolute;left:50%;top:50%;width:150%;height:150%;border-radius:50%;
  background:conic-gradient(from 0deg,rgba(230,185,111,0) 0deg,rgba(230,185,111,.55) 60deg,rgba(230,185,111,0) 120deg);
  transform:translate(-50%,-50%) rotate(0deg);pointer-events:none;
  animation:e020-spin calc(var(--e020-dur,520ms) * 3) linear infinite;
}
@keyframes e020-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}

/* E020-08 — parallaxe du pointeur : la propriété translate est distincte de
   transform, elle s'ajoute à la rotation sans l'écraser. */

/* E020-09 — interrupteur de mouvement : neutralise animations et transitions. */
.constellation-layout[data-e020-motion="0"] .constellation-edges,
.constellation-layout[data-e020-motion="0"] .const-layer,
.constellation-layout[data-e020-motion="0"] .const-planet,
.constellation-layout[data-e020-motion="0"] .const-planet::before,
.constellation-layout[data-e020-motion="0"] .e020-halo,
.constellation-layout[data-e020-motion="0"] .e020-ring{animation:none!important;transition:none!important}
@media (prefers-reduced-motion:reduce){
  .constellation-layout .constellation-edges,
  .constellation-layout .const-layer,
  .constellation-layout .const-planet,
  .constellation-layout .const-planet::before,
  .constellation-layout .e020-halo,
  .constellation-layout .e020-ring{animation:none!important;transition:none!important}
}
@media (max-width:620px){
  .e020-controls input[type="range"]{width:92px}
  .e020-readout{font-size:8px}
}
`;

/* État propre au greffon, conservé entre deux rendus complets du shell. */
const state = { orbit: 0, speed: 'normal', trails: false, pulse: false, motion: true };
const DURATIONS = { lent: '900ms', normal: '520ms', rapide: '240ms' };
const IDS = ['e020-panel', 'e020-title', 'e020-orbit', 'e020-speed', 'e020-trails',
  'e020-pulse', 'e020-motion', 'e020-readout', 'e020-ring', 'e020-halo'];

let initialized = false;
let motionQueryBound = false;

/* Un seul nœud par ID, réutilisé si le greffon est rejoué sur le même DOM. */
function ensure(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) node = ctx.el(tag, className);
  const all = document.querySelectorAll(`[id="${id}"]`);
  for (let i = 1; i < all.length; i += 1) all[i].remove();
  node.id = id;
  if (className) node.className = className;
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function uniqueIds() {
  return IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1);
}

function speedLabel() {
  if (state.speed === 'lent') return 'lent';
  if (state.speed === 'rapide') return 'rapide';
  return 'normal';
}

register('E020', (ctx) => {
  /* Contrat : sans layout, on ne touche à aucun DOM. */
  if (!ctx || !ctx.layout) return;

  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  if (!initialized) {
    initialized = true;
    state.motion = !reduced;
  }

  ctx.css('constellation-e020', CSS);
  layout.classList.add('e020-host');

  /* E020-09 — état initial du mouvement dictate par prefers-reduced-motion ;
     l'interrupteur reste néanmoins actionnable par l'utilisateur. */
  layout.dataset.e020Motion = state.motion ? '1' : '0';

  const planets = field ? Array.from(field.querySelectorAll('.const-planet')) : [];

  /* E020-04 — rayon de l'anneau : moyenne des distances au centre (50 %, 50 %)
     lues sur les variables --x / --y posées par constellation.js:303-304. */
  let sumX = 0;
  let sumY = 0;
  let measured = 0;
  planets.forEach((planet) => {
    const x = parseFloat(planet.style.getPropertyValue('--x'));
    const y = parseFloat(planet.style.getPropertyValue('--y'));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      sumX += Math.abs(x - 50);
      sumY += Math.abs(y - 50);
      measured += 1;
    }
  });
  const ringX = Math.max(8, measured ? sumX / measured : 20);
  const ringY = Math.max(8, measured ? sumY / measured : 20);
  layout.style.setProperty('--e020-ring-x', ringX.toFixed(2));
  layout.style.setProperty('--e020-ring-y', ringY.toFixed(2));

  /* E020-06 — rang de chaque planète pour l'entrée échelonnée ; l'attribut
     data-e020-rank rend l'ordre auditable sans dépendre d'un aléa. */
  planets.forEach((planet, index) => {
    planet.style.setProperty('--e020-i', String(index));
    planet.dataset.e020Rank = String(index);
  });

  /* E020-01 / E020-05 / E020-08 — variables pilotant rotation, durée et
     décalage de parallaxe ; valeurs déterministes, sans aucun aléa. */
  layout.style.setProperty('--e020-orbit', String(state.orbit));
  layout.style.setProperty('--e020-dur', DURATIONS[state.speed] || DURATIONS.normal);
  layout.style.setProperty('--e020-px', '0px');
  layout.style.setProperty('--e020-py', '0px');

  /* E020-04 — l'anneau est posé dans le champ, derrière les arêtes. */
  if (field) ensure(ctx, 'e020-ring', 'div', 'e020-ring', field);

  /* E020-07 — halo unique greffé sur la planète active. */
  const active = planets.find((planet) => planet.classList.contains('is-active'));
  if (active) ensure(ctx, 'e020-halo', 'span', 'e020-halo', active);
  else {
    const stray = document.getElementById('e020-halo');
    if (stray) stray.remove();
  }

  /* Panneau de commandes : une seule section, insérée avant le champ. */
  const panel = ensure(ctx, 'e020-panel', 'section', 'e020-panel', layout);
  panel.textContent = '';
  panel.setAttribute('aria-labelledby', 'e020-title');
  const head = ctx.el('div', 'e020-head');
  const title = ctx.el('h2', 'e020-title', 'Mouvement des planètes');
  title.id = 'e020-title';
  head.appendChild(title);
  const controls = ctx.el('div', 'e020-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Commandes de mouvement des planètes');
  head.appendChild(controls);
  panel.appendChild(head);
  /* E020-10 — témoin auditable : texte annoncé et attributs data-e020-* mis à
     jour par updateReadout(), avec contrôle d'unicité des IDs via uniqueIds(). */
  const readout = ensure(ctx, 'e020-readout', 'p', 'e020-readout', panel);
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E020-01 — curseur d'orbite : de -18 à +18 degrés, pas de 2. */
  const orbitLabel = ctx.el('label', '', 'Orbite');
  orbitLabel.htmlFor = 'e020-orbit';
  const orbit = ctx.el('input', '');
  orbit.id = 'e020-orbit';
  orbit.type = 'range';
  orbit.min = '-18';
  orbit.max = '18';
  orbit.step = '2';
  orbit.value = String(state.orbit);
  orbit.oninput = () => {
    state.orbit = Number(orbit.value) || 0;
    layout.style.setProperty('--e020-orbit', String(state.orbit));
    if (readout) updateReadout();
  };

  /* E020-05 — choix unique de vitesse : un <select> plutôt que des bascules. */
  const speedLabel = ctx.el('label', '', 'Vitesse');
  speedLabel.htmlFor = 'e020-speed';
  const speed = ctx.el('select', '');
  speed.id = 'e020-speed';
  [['lent', 'Lent'], ['normal', 'Normal'], ['rapide', 'Rapide']].forEach(([value, text]) => {
    const option = ctx.el('option', '', text);
    option.value = value;
    speed.appendChild(option);
  });
  speed.value = state.speed;
  speed.onchange = () => {
    state.speed = DURATIONS[speed.value] ? speed.value : 'normal';
    layout.style.setProperty('--e020-dur', DURATIONS[state.speed]);
    if (readout) updateReadout();
  };

  function toggleButton(id, text, label) {
    const button = ensure(ctx, id, 'button', '', controls);
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    return button;
  }

  /* E020-03 — traînée : bascule indépendante, aria-pressed dédié. */
  const trails = toggleButton('e020-trails', 'Traînée', 'Activer la traînée des planètes');
  trails.onclick = () => {
    state.trails = !state.trails;
    applyClasses();
  };

  /* E020-02 — battement : bascule indépendante, aria-pressed dédié. */
  const pulse = toggleButton('e020-pulse', 'Battement', 'Activer le battement de la planète active');
  pulse.onclick = () => {
    state.pulse = !state.pulse;
    applyClasses();
  };

  /* E020-09 — interrupteur maître de mouvement. */
  const motion = toggleButton('e020-motion', 'Mouvement', 'Suspendre ou reprendre tout mouvement');
  motion.onclick = () => {
    state.motion = !state.motion;
    layout.dataset.e020Motion = state.motion ? '1' : '0';
    if (readout) updateReadout();
    applyClasses();
  };

  controls.append(orbitLabel, orbit, speedLabel, speed, trails, pulse, motion);

  function applyClasses() {
    layout.classList.toggle('e020-trails', state.trails);
    layout.classList.toggle('e020-pulse', state.pulse);
    layout.classList.toggle('e020-enter', state.motion);
    trails.setAttribute('aria-pressed', String(state.trails));
    pulse.setAttribute('aria-pressed', String(state.pulse));
    motion.setAttribute('aria-pressed', String(state.motion));
    layout.dataset.e020Motion = state.motion ? '1' : '0';
  }

  function updateReadout() {
    if (!readout) return;
    readout.textContent = `Planètes : ${planets.length} · Rotation : ${state.orbit}° · Vitesse : ${speedLabel()} · Mouvement : ${state.motion ? 'actif' : 'suspendu'}.`;
    layout.dataset.e020Planets = String(planets.length);
    layout.dataset.e020Orbit = String(state.orbit);
    layout.dataset.e020Speed = state.speed;
    layout.dataset.e020Motion = state.motion ? '1' : '0';
    layout.dataset.e020Reduced = reduced ? '1' : '0';
    layout.dataset.e020RingX = ringX.toFixed(2);
    layout.dataset.e020RingY = ringY.toFixed(2);
    layout.dataset.e020Unique = String(uniqueIds());
  }

  applyClasses();
  updateReadout();

  /* E020-08 — parallaxe au pointeur : un seul écouteur par champ, borné à ±6 px,
     neutralisé quand le mouvement est suspendu ou réduit. */
  if (field && field.dataset.e020Parallax !== '1') {
    field.dataset.e020Parallax = '1';
    field.addEventListener('mousemove', (event) => {
      if (!state.motion || reduced) return;
      const rect = field.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dx = (event.clientX - rect.left) / rect.width - 0.5;
      const dy = (event.clientY - rect.top) / rect.height - 0.5;
      layout.style.setProperty('--e020-px', `${(dx * 12).toFixed(2)}px`);
      layout.style.setProperty('--e020-py', `${(dy * 12).toFixed(2)}px`);
    });
    field.addEventListener('mouseleave', () => {
      layout.style.setProperty('--e020-px', '0px');
      layout.style.setProperty('--e020-py', '0px');
    });
  }

  /* E020-09 (suite) — observation de la préférence système, sans minuteur ni
     rAF : un changement de préférence suspend le mouvement en cours. */
  if (!motionQueryBound) {
    motionQueryBound = true;
    try {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', (event) => {
          if (event.matches) {
            state.motion = false;
            layout.dataset.e020Motion = '0';
            applyClasses();
            updateReadout();
          }
        });
      }
    } catch {
      /* Préférence non observable : l'état initial lu plus haut reste valide. */
    }
  }
});
