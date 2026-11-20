import { register } from './registry.js';

/* Lentille V2 E030 — Mouvement et transitions appliqués aux lunes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau ni source aléatoire, sans minuteur ni boucle d'animation propre. Tout
   est piloté par des attributs `data-v2e030-*` et des variables CSS calculées
   depuis le balisage réel. Préfixe exclusif : `v2e030`. */

const CSS_ID = 'constellation-v2-e030';
const SCOPE = 'v2e030';
const LAST_KEY = '__v2e030_last';

/* Feuille unique, portée par la classe `.v2e030` posée sur ctx.layout. Aucune
   URL distante, aucune règle d'import, aucune police externe. Les effets V2
   utilisent des enfants `<span>` dédiés pour ne pas écraser les pseudo-éléments
   de la passe 1. */
const CSS = `
.v2e030 .const-moon{transition:transform .24s cubic-bezier(.2,.8,.2,1),background-color .2s linear,box-shadow .2s linear,opacity .2s linear}
/* 01 — reflet directionnel au pointeur. */
.v2e030 .v2e030-glint{
  position:absolute;inset:0;border-radius:50%;pointer-events:none;z-index:1;
  background:radial-gradient(circle at var(--v2e030-glint-x,50%) var(--v2e030-glint-y,50%),rgba(255,255,255,.6),transparent 62%);
  opacity:0;transform:scale(.7);
  transition:opacity .18s ease-out,transform .18s ease-out;
}
.v2e030 .const-moon[data-v2e030-glint="1"] .v2e030-glint{opacity:.85;transform:scale(1)}
/* 02 — anneau de confiance en dégradé conique. */
.v2e030 .v2e030-gauge{
  position:absolute;inset:-6px;border-radius:50%;pointer-events:none;
  background:conic-gradient(var(--violet) calc(var(--v2e030-confidence,0)*1turn),transparent 0);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1px));
  opacity:.5;transform:rotate(-90deg);
  transition:opacity .3s linear,transform .4s ease-out;
}
/* 03 — recul radial des lunes voisines au survol. */
.v2e030 .const-moon[data-v2e030-recede="1"]{
  transform:translate(calc(-50% + var(--v2e030-rx,0px)),calc(-50% + var(--v2e030-ry,0px)));
}
/* 04 — profondeur radiale portée par un noyau interne. */
.v2e030 .v2e030-core{
  position:absolute;inset:2px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,255,255,calc(.08 + var(--v2e030-depth,0)*.32)),transparent 66%);
  transform:scale(calc(1 + var(--v2e030-depth,0)*.18));
  transition:transform .3s ease-out;
}
/* 05 — boussole d'orientation vers la lune active. */
.v2e030 .v2e030-compass{
  position:absolute;left:50%;top:50%;width:2px;height:38%;
  transform-origin:50% 0;transform:rotate(var(--v2e030-bearing,0deg));
  background:linear-gradient(to bottom,var(--gold-bright),transparent);
  opacity:.16;pointer-events:none;
  transition:transform .45s cubic-bezier(.2,.7,.2,1),opacity .3s linear;
}
.v2e030 .const-layer-moons[data-v2e030-orient="1"] .v2e030-compass{opacity:.34}
/* 06 — phase lunaire pleine ou croissante. */
.v2e030 .v2e030-phase{
  position:absolute;inset:0;border-radius:50%;pointer-events:none;
  background:var(--surface-2);opacity:.92;
  transform:translateX(calc(var(--v2e030-fill,0)*78%));
  transition:transform .4s ease-out;
}
/* 07 — tracé progressif du trait d'attache. */
.v2e030 .constellation-edges line[data-v2e030-draw]{
  stroke-dasharray:100;stroke-dashoffset:100;
  transition:stroke-dashoffset .5s ease-out;
}
.v2e030 .constellation-edges line[data-v2e030-draw="1"]{stroke-dashoffset:0}
/* 08 — vague de confirmation depuis la lune active. */
.v2e030 .v2e030-wave{
  position:absolute;inset:-3px;border-radius:50%;pointer-events:none;
  border:1px solid var(--gold-bright);opacity:0;transform:scale(.6);
}
.v2e030 .const-moon[data-v2e030-wave="1"] .v2e030-wave{
  animation:v2e030-wave .5s ease-out both;
  animation-delay:var(--v2e030-wave,0ms);
}
@keyframes v2e030-wave{
  from{opacity:.9;transform:scale(.6)}
  to{opacity:0;transform:scale(1.9)}
}
/* 09 — poussée radiale au focus clavier. */
.v2e030 .const-moon[data-v2e030-focus="1"]{
  transform:translate(calc(-50% + var(--v2e030-frx,0px)),calc(-50% + var(--v2e030-fry,0px)));
}
/* 10 — sillage de la dernière lune active. */
.v2e030 .v2e030-trail{
  position:absolute;inset:-9px;border-radius:50%;pointer-events:none;
  border:1px dashed var(--muted);opacity:0;
  transition:opacity .6s ease-out;
}
.v2e030 .const-moon[data-v2e030-trail="1"] .v2e030-trail{opacity:.7}
/* Neutralisation en mouvement réduit, sans perte d'information textuelle. */
.v2e030[data-v2e030-motion="off"] .const-moon,
.v2e030[data-v2e030-motion="off"] .const-moon span,
.v2e030[data-v2e030-motion="off"] .v2e030-compass,
.v2e030[data-v2e030-motion="off"] .constellation-edges line[data-v2e030-draw]{
  animation:none !important;transition:none !important;
}
@media (prefers-reduced-motion:reduce){
  .v2e030 .const-moon,.v2e030 .const-moon span,.v2e030 .v2e030-compass,
  .v2e030 .constellation-edges line[data-v2e030-draw]{animation:none;transition:none}
}
@media (max-width:620px){
  .v2e030 .v2e030-gauge{inset:-4px}
  .v2e030 .v2e030-trail{inset:-6px}
  .v2e030 .v2e030-compass{height:30%}
}
`;

/* Préférence de mouvement : contexte d'abord, media query en repli. */
function motionReduced(ctx) {
  try {
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) return true;
  } catch { /* environnement sans matchMedia fiable : repli ci-dessous. */ }
  try {
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch { /* repli silencieux. */ }
  return false;
}

/* Confiance catégorielle → fraction déterministe pour l'anneau conique. */
function confidenceValue(label) {
  const text = String(label || '').toLowerCase();
  if (text.indexOf('vérifié') >= 0 || text.indexOf('certain') >= 0) return 1;
  if (text.indexOf('probable') >= 0) return 0.7;
  if (text.indexOf('disput') >= 0) return 0.45;
  if (text.indexOf('non documenté') >= 0) return 0.2;
  return 0.5;
}

/* Coordonnées --x/--y de la vue, lues sans supposition sur leur présence. */
function parsePosition(node) {
  let x = 50;
  let y = 50;
  try {
    const px = parseFloat(node.style.getPropertyValue('--x'));
    const py = parseFloat(node.style.getPropertyValue('--y'));
    if (Number.isFinite(px)) x = px;
    if (Number.isFinite(py)) y = py;
  } catch { /* position par défaut : centre de la scène. */ }
  return { x, y };
}

register('E030', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans le conteneur de la vue. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const soft = (fn) => { try { fn(); } catch { /* effet non applicable : neutralisé. */ } };
  const makeSpan = (className) => typeof ctx.el === 'function'
    ? ctx.el('span', className)
    : document.createElement('span');
  const ensureChild = (parent, className) => {
    let node = null;
    try { node = parent.querySelector('.' + className); } catch { /* DOM partiel : on recrée. */ }
    if (!node) {
      node = makeSpan(className);
      if (node && typeof parent.appendChild === 'function') parent.appendChild(node);
    }
    return node;
  };
  const isActive = (moon) => moon.classList.contains('is-active') ||
    moon.getAttribute('aria-current') === 'true';

  /* Feuille unique, protégée par cssOnce dans le registre. */
  soft(() => { css(CSS_ID, CSS); });

  const reduced = motionReduced(ctx);
  let moons = [];
  let moonLayer = null;
  let edges = null;
  try {
    moons = Array.from(layout.querySelectorAll('.const-moon'));
    moonLayer = layout.querySelector('.const-layer-moons');
    edges = layout.querySelector('.constellation-edges');
  } catch { /* collections vides : le greffon reste inoffensif. */ }

  soft(() => { layout.classList.add(SCOPE); });
  soft(() => { layout.dataset.v2e030Motion = reduced ? 'off' : 'on'; });

  /* E030-01 — Reflet directionnel : un écouteur pointermove délégué place un
     reflet radial selon la direction du pointeur, sans horloge ni animation propre. */
  soft(() => {
    if (!moonLayer || typeof moonLayer.addEventListener !== 'function') return;
    moons.forEach((moon) => { if (ensureChild(moon, 'v2e030-glint')) moon.dataset.v2e030GlintReady = '1'; });
    moonLayer.addEventListener('pointermove', (event) => {
      const moon = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (!moon || !moonLayer.contains(moon)) return;
      let box;
      try { box = moon.getBoundingClientRect(); } catch { return; }
      if (!box || !box.width || !box.height) return;
      const px = ((event.clientX - box.left) / box.width) * 100;
      const py = ((event.clientY - box.top) / box.height) * 100;
      moon.style.setProperty('--v2e030-glint-x', `${Math.max(-20, Math.min(120, px)).toFixed(1)}%`);
      moon.style.setProperty('--v2e030-glint-y', `${Math.max(-20, Math.min(120, py)).toFixed(1)}%`);
      moon.dataset.v2e030Glint = '1';
    });
    moonLayer.addEventListener('pointerout', (event) => {
      const moon = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (moon) moon.removeAttribute('data-v2e030-glint');
    });
    moonLayer.dataset.v2e030GlintDelegated = '1';
  });

  /* E030-02 — Anneau de confiance conique : la catégorie lue dans l'aria-label
     devient une fraction de tour, déposée dans --v2e030-confidence. */
  soft(() => {
    moons.forEach((moon) => {
      const gauge = ensureChild(moon, 'v2e030-gauge');
      if (!gauge) return;
      const label = moon.getAttribute('aria-label') || moon.title || moon.dataset.label || '';
      const value = confidenceValue(label);
      gauge.style.setProperty('--v2e030-confidence', value.toFixed(2));
      gauge.setAttribute('aria-hidden', 'true');
      moon.dataset.v2e030Confidence = value.toFixed(2);
    });
  });

  /* E030-03 — Recul des voisines : au survol d'une lune, ses deux voisines
     s'écartent radialement d'un vecteur calculé depuis l'angle d'index. */
  soft(() => {
    if (!moonLayer || typeof moonLayer.addEventListener !== 'function') return;
    moons.forEach((moon, index) => {
      const angle = (index * 360) / Math.max(1, moons.length);
      const rad = (angle * Math.PI) / 180;
      moon.style.setProperty('--v2e030-rx', `${(Math.cos(rad) * 7).toFixed(2)}px`);
      moon.style.setProperty('--v2e030-ry', `${(Math.sin(rad) * 7).toFixed(2)}px`);
      moon.dataset.v2e030Angle = angle.toFixed(2);
    });
    const clear = () => moons.forEach((moon) => moon.removeAttribute('data-v2e030-recede'));
    moonLayer.addEventListener('pointerover', (event) => {
      const moon = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (!moon || !moonLayer.contains(moon)) return;
      clear();
      const at = moons.indexOf(moon);
      if (at < 0) return;
      [at - 1, at + 1].forEach((index) => {
        if (moons[index]) moons[index].dataset.v2e030Recede = '1';
      });
    });
    moonLayer.addEventListener('pointerleave', clear);
    moonLayer.dataset.v2e030RecedeDelegated = '1';
  });

  /* E030-04 — Profondeur radiale : la distance au centre de la scène, lue sur
     --x/--y, module l'éclat et l'échelle d'un noyau interne réutilisé. */
  soft(() => {
    moons.forEach((moon) => {
      const core = ensureChild(moon, 'v2e030-core');
      if (!core) return;
      const pos = parsePosition(moon);
      const distance = Math.sqrt((pos.x - 50) ** 2 + (pos.y - 50) ** 2);
      const depth = Math.max(0, Math.min(1, 1 - distance / 50));
      core.style.setProperty('--v2e030-depth', depth.toFixed(3));
      core.setAttribute('aria-hidden', 'true');
      moon.dataset.v2e030Depth = depth.toFixed(3);
    });
  });

  /* E030-05 — Boussole : une aiguille unique sur le calque pointe vers la
     lune active, avec un cap calculé en atan2 et une transition CSS. */
  soft(() => {
    if (!moonLayer) return;
    let compass = null;
    try { compass = moonLayer.querySelector('.v2e030-compass'); } catch { /* on recrée. */ }
    if (!compass) {
      compass = makeSpan('v2e030-compass');
      if (compass) moonLayer.appendChild(compass);
    }
    if (!compass) return;
    compass.setAttribute('aria-hidden', 'true');
    const active = moons.find(isActive);
    if (active) {
      const pos = parsePosition(active);
      const bearing = (Math.atan2(pos.x - 50, 50 - pos.y) * 180 / Math.PI + 360) % 360;
      compass.style.setProperty('--v2e030-bearing', `${bearing.toFixed(2)}deg`);
      moonLayer.dataset.v2e030Bearing = bearing.toFixed(2);
    } else {
      compass.style.setProperty('--v2e030-bearing', '0deg');
      moonLayer.removeAttribute('data-v2e030-bearing');
    }
    moonLayer.dataset.v2e030Orient = '1';
  });

  /* E030-06 — Phase lunaire : un voile décalé figure la lune pleine pour
     l'active et un croissant pour les autres, sans toucher à l'étiquette. */
  soft(() => {
    moons.forEach((moon) => {
      const phase = ensureChild(moon, 'v2e030-phase');
      if (!phase) return;
      const fill = isActive(moon) ? 1 : 0.18;
      phase.style.setProperty('--v2e030-fill', String(fill));
      phase.setAttribute('aria-hidden', 'true');
      moon.dataset.v2e030Fill = String(fill);
    });
  });

  /* E030-07 — Tracé progressif : chaque attache lunaire reçoit pathLength=100
     et un état de dessin, la transition portant sur stroke-dashoffset. */
  soft(() => {
    if (!edges || typeof edges.querySelectorAll !== 'function') return;
    const lines = Array.from(edges.querySelectorAll('line.is-moon'));
    lines.forEach((line, index) => {
      const moon = moons[index];
      line.setAttribute('pathLength', '100');
      line.setAttribute('data-v2e030-draw', moon && isActive(moon) ? '1' : '0');
      line.setAttribute('data-v2e030-order', String(index));
    });
    edges.dataset.v2e030Draw = String(lines.length);
  });

  /* E030-08 — Vague de confirmation : un anneau unique par lune se propage
     depuis l'active, avec un délai proportionnel à la distance cyclique. */
  soft(() => {
    const total = Math.max(1, moons.length);
    const activeIndex = Math.max(0, moons.findIndex(isActive));
    moons.forEach((moon, index) => {
      const wave = ensureChild(moon, 'v2e030-wave');
      if (!wave) return;
      const diff = Math.abs(index - activeIndex);
      const steps = Math.min(diff, total - diff);
      const delay = steps * 45;
      wave.style.setProperty('--v2e030-wave', `${delay}ms`);
      wave.setAttribute('aria-hidden', 'true');
      moon.dataset.v2e030Wave = '1';
      moon.dataset.v2e030WaveDelay = `${delay}ms`;
    });
  });

  /* E030-09 — Poussée au focus : deux écouteurs délégués déplacent doucement
     la lune focalisée selon un vecteur radial déterministe par index. */
  soft(() => {
    if (!moonLayer || typeof moonLayer.addEventListener !== 'function') return;
    moons.forEach((moon, index) => {
      const angle = (index * 360) / Math.max(1, moons.length);
      const rad = (angle * Math.PI) / 180;
      moon.style.setProperty('--v2e030-frx', `${(Math.cos(rad) * 5).toFixed(2)}px`);
      moon.style.setProperty('--v2e030-fry', `${(Math.sin(rad) * 5).toFixed(2)}px`);
    });
    moonLayer.addEventListener('focusin', (event) => {
      const moon = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (!moon || !moonLayer.contains(moon)) return;
      moons.forEach((node) => node.removeAttribute('data-v2e030-focus'));
      moon.dataset.v2e030Focus = '1';
    });
    moonLayer.addEventListener('focusout', (event) => {
      const moon = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (moon) moon.removeAttribute('data-v2e030-focus');
    });
    moonLayer.dataset.v2e030FocusPush = '1';
  });

  /* E030-10 — Sillage : la lune précédemment active garde un repère en pointillé
     dont la mémoire vit dans une clé window préfixée, sans minuteur. */
  soft(() => {
    let previous = '';
    try { if (typeof window !== 'undefined') previous = String(window[LAST_KEY] || ''); } catch { /* mémoire indisponible. */ }
    moons.forEach((moon) => {
      const trail = ensureChild(moon, 'v2e030-trail');
      if (!trail) return;
      trail.setAttribute('aria-hidden', 'true');
      const id = String(moon.dataset.constKey || '');
      if (previous && id && id === previous) moon.dataset.v2e030Trail = '1';
      else moon.removeAttribute('data-v2e030-trail');
    });
    const active = moons.find(isActive);
    const next = active ? String(active.dataset.constKey || '') : '';
    try { if (typeof window !== 'undefined') window[LAST_KEY] = next; } catch { /* mémoire indisponible. */ }
    if (moonLayer) moonLayer.dataset.v2e030Trail = previous ? '1' : '0';
  });
});
