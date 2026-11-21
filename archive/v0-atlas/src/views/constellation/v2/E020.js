import { register } from './registry.js';

/* Lentille V2 E020 — Mouvement et transitions des planètes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau ni source aléatoire. Le module reste passif : aucun minuteur,
   aucune boucle d'animation propre, aucun journal, aucune dépendance externe.
   Seuls des attributs, classes et variables CSS sont posés sur un DOM complet
   ou partiel ; chaque chantier se dégrade sans jamais jeter d'exception. */

const IDS = [
  'v2e020-panel',
  'v2e020-title',
  'v2e020-ease',
  'v2e020-direction',
  'v2e020-readout',
  'v2e020-help',
];

const EASES = {
  douce: 'cubic-bezier(.22,.61,.36,1)',
  elastique: 'cubic-bezier(.34,1.56,.64,1)',
  lineaire: 'linear',
};

const EASE_LABELS = {
  douce: 'douce',
  elastique: 'élastique',
  lineaire: 'linéaire',
};

/* État propre à la lentille, conservé entre deux rendus complets du shell. */
const state = { ease: 'douce', direction: 'avant' };

function uniqueIds() {
  return IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1);
}

/* Un seul nœud par identifiant : réutilisation ou déduplication sans réseau. */
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

register('E020', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille V2 : tout le mouvement est déclaratif. */
  css('constellation-v2-e020', `
.v2e020-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e020-panel{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:rgba(230,185,111,.035)}
.v2e020-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;margin-bottom:6px}
.v2e020-title{margin:0;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:600;letter-spacing:.04em}
.v2e020-controls{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.v2e020-controls label{color:var(--muted);font-size:9px}
.v2e020-controls button,.v2e020-controls select{min-height:36px;padding:4px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--ink-soft);font:inherit;font-size:9px;cursor:pointer}
.v2e020-controls button[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright)}
.v2e020-controls :is(button,select):focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e020-readout{margin:6px 0 0;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;line-height:1.5}

/* E020-01 — flux lumineux continu sur l'arête reliant le soleil à la planète active. */
.v2e020-flow .constellation-edges line.is-path{stroke-dasharray:5 7;animation:v2e020-flow 1.6s linear infinite}
@keyframes v2e020-flow{to{stroke-dashoffset:-24}}

/* E020-02 — atténuation des planètes non actives ; survol et focus restaurent l'opacité. */
.v2e020-dim .const-layer-planets .const-planet{transition:opacity .3s var(--v2e020-ease,cubic-bezier(.22,.61,.36,1))}
.v2e020-dim .const-layer-planets .const-planet:not(.is-active){opacity:.42}
.v2e020-dim .const-layer-planets .const-planet:not(.is-active):hover,
.v2e020-dim .const-layer-planets .const-planet:not(.is-active):focus-visible{opacity:1}

/* E020-03 — la courbe d'accélération est la variable --v2e020-ease, lue par les transitions. */

/* E020-04 — pause des animations pendant la lecture du champ au clavier ou au pointeur. */
.v2e020-pause .constellation-field:focus-within .constellation-edges line.is-path,
.v2e020-pause .constellation-field:hover .constellation-edges line.is-path,
.v2e020-pause .constellation-field:focus-within .const-layer-moons,
.v2e020-pause .constellation-field:hover .const-layer-moons,
.v2e020-pause .constellation-field:focus-within .const-layer-moons .const-moon,
.v2e020-pause .constellation-field:hover .const-layer-moons .const-moon,
.v2e020-pause .constellation-field:focus-within .v2e020-aura,
.v2e020-pause .constellation-field:hover .v2e020-aura{animation-play-state:paused}

/* E020-05 — balancement des lunes autour de la planète active, avec contre-balancement des pastilles. */
.v2e020-moons .const-layer-moons{
  transform-origin:var(--v2e020-moon-cx,50%) var(--v2e020-moon-cy,50%);
  animation:v2e020-sway 6s ease-in-out infinite alternate;
}
@keyframes v2e020-sway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
.v2e020-moons .const-layer-moons .const-moon{animation:v2e020-counter 6s ease-in-out infinite alternate}
@keyframes v2e020-counter{from{transform:translate(-50%,-50%) rotate(5deg)}to{transform:translate(-50%,-50%) rotate(-5deg)}}

/* E020-06 — respiration échelonnée des planètes via une auréole dédiée (phase par rang). */
.v2e020-aura{
  position:absolute;left:50%;top:50%;width:132%;height:132%;
  border:1px solid rgba(230,185,111,.3);border-radius:50%;
  transform:translate(-50%,-50%) scale(.8);pointer-events:none;
  animation:v2e020-breathe 2.4s var(--v2e020-ease,cubic-bezier(.22,.61,.36,1)) infinite alternate;
  animation-delay:calc(var(--v2e020-i,0) * -180ms);
}
@keyframes v2e020-breathe{from{transform:translate(-50%,-50%) scale(.8);opacity:.25}to{transform:translate(-50%,-50%) scale(1.16);opacity:.65}}

/* E020-07 — surlignage de l'arête reliée à la planète pointée (transition d'épaisseur). */
.v2e020-edge .constellation-edges line.v2e020-linked{stroke:rgba(244,214,158,.9);stroke-width:2.6;transition:stroke-width .25s var(--v2e020-ease,cubic-bezier(.22,.61,.36,1)),stroke .25s var(--v2e020-ease,cubic-bezier(.22,.61,.36,1))}

/* E020-08 — sens de circulation réversible du flux et du balancement des lunes. */
.v2e020-reverse .constellation-edges line.is-path,
.v2e020-reverse .const-layer-moons,
.v2e020-reverse .const-layer-moons .const-moon{animation-direction:reverse}

/* E020-09 — bandeau sémantique : cibles ≥ 36 px et focus visible (règles générales ci-dessus). */

/* E020-10 — témoin V2 : texte et attributs, jamais d'information portée par la seule couleur. */
@media (prefers-reduced-motion:reduce){
  .v2e020-flow .constellation-edges line.is-path,
  .v2e020-moons .const-layer-moons,
  .v2e020-moons .const-layer-moons .const-moon,
  .v2e020-aura{animation:none!important}
  .v2e020-dim .const-layer-planets .const-planet{transition:none!important}
}
@media (max-width:620px){
  .v2e020-controls :is(button,select){min-height:36px}
  .v2e020-readout{font-size:8px}
}
  `);

  /* Lecture tolérante du DOM : chaque couche peut manquer sans compromettre
     les autres chantiers. */
  const field = layout.querySelector('.constellation-field');
  const planetLayer = field ? field.querySelector('.const-layer-planets') : null;
  const moonLayer = field ? field.querySelector('.const-layer-moons') : null;
  const edges = field ? field.querySelector('.constellation-edges') : null;
  const planets = planetLayer ? Array.from(planetLayer.querySelectorAll('.const-planet')) : [];
  const moons = moonLayer ? Array.from(moonLayer.querySelectorAll('.const-moon')) : [];
  const lines = edges ? Array.from(edges.querySelectorAll('line.const-edge:not(.is-moon)')) : [];

  /* Bandeau créé une seule fois ; le contenu précis est complété plus bas. */
  const panel = ensure(ctx, 'v2e020-panel', 'section', 'v2e020-panel', layout);
  panel.textContent = '';
  const head = ctx.el('div', 'v2e020-head');
  const title = ctx.el('h2', 'v2e020-title', 'Mouvement V2 des planètes');
  title.id = 'v2e020-title';
  head.appendChild(title);
  const controls = ctx.el('div', 'v2e020-controls');
  head.appendChild(controls);
  panel.appendChild(head);

  /* E020-01 — Flux lumineux continu : l'animation CSS court sur la seule
     arête marquée is-path, celle de la planète active. */
  layout.classList.add('v2e020-flow');
  layout.dataset.v2e020Flow = '1';

  /* E020-02 — Atténuation des planètes inactives : l'état est porté par une
     classe sur le layout, levé au survol et au focus par le CSS. */
  layout.classList.add('v2e020-dim');
  layout.dataset.v2e020Dim = '1';

  /* E020-03 — Courbe d'accélération : une seule variable partagée par toutes
     les transitions et animations de cette lentille. */
  layout.style.setProperty('--v2e020-ease', EASES[state.ease] || EASES.douce);
  layout.dataset.v2e020Ease = state.ease;
  const easeLabel = ctx.el('label', '', 'Courbe');
  easeLabel.htmlFor = 'v2e020-ease';
  const ease = ensure(ctx, 'v2e020-ease', 'select', '', controls);
  [['douce', 'Douce'], ['elastique', 'Élastique'], ['lineaire', 'Linéaire']].forEach(([value, text]) => {
    const option = ctx.el('option', '', text);
    option.value = value;
    ease.appendChild(option);
  });
  ease.value = state.ease;
  ease.onchange = () => {
    state.ease = EASES[ease.value] ? ease.value : 'douce';
    layout.style.setProperty('--v2e020-ease', EASES[state.ease]);
    layout.dataset.v2e020Ease = state.ease;
    if (typeof updateReadout === 'function') updateReadout();
  };
  controls.append(easeLabel, ease);

  /* E020-04 — Pause pendant la lecture : le CSS met en pause les animations
     dès que le champ reçoit le focus ou le pointeur, sans minuteur. */
  layout.classList.add('v2e020-pause');
  layout.dataset.v2e020Pause = '1';

  /* E020-05 — Balancement des lunes : le pivot est la position réellement
     rendue de la planète active, lue sur ses variables --x / --y. */
  layout.classList.add('v2e020-moons');
  layout.dataset.v2e020Moons = String(moons.length);
  let cx = 50;
  let cy = 50;
  const activePlanet = planets.find((planet) => planet.classList.contains('is-active'));
  if (activePlanet) {
    const x = parseFloat(activePlanet.style.getPropertyValue('--x'));
    const y = parseFloat(activePlanet.style.getPropertyValue('--y'));
    if (Number.isFinite(x)) cx = x;
    if (Number.isFinite(y)) cy = y;
  }
  layout.style.setProperty('--v2e020-moon-cx', `${cx.toFixed(2)}%`);
  layout.style.setProperty('--v2e020-moon-cy', `${cy.toFixed(2)}%`);
  layout.dataset.v2e020MoonCx = cx.toFixed(2);
  layout.dataset.v2e020MoonCy = cy.toFixed(2);

  /* E020-06 — Respiration échelonnée : une auréole dédiée par planète, avec
     un rang déterministe déphasant la phase de 180 ms. */
  layout.dataset.v2e020Planets = String(planets.length);
  planets.forEach((planet, index) => {
    planet.style.setProperty('--v2e020-i', String(index));
    planet.dataset.v2e020Rank = String(index);
    const hasAura = Array.from(planet.children)
      .some((child) => child.classList && child.classList.contains('v2e020-aura'));
    if (!hasAura) {
      const aura = ctx.el('span', 'v2e020-aura');
      aura.setAttribute('aria-hidden', 'true');
      planet.appendChild(aura);
    }
  });

  /* E020-07 — Surlignage de l'arête pointée : les lignes portent x2 / y2
     égaux aux --x / --y de leur planète, ce qui permet un appariement sûr. */
  layout.classList.add('v2e020-edge');
  function linkedLine(planet) {
    const x = parseFloat(planet.style.getPropertyValue('--x'));
    const y = parseFloat(planet.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return lines.find((line) => {
      const lx = parseFloat(line.getAttribute('x2'));
      const ly = parseFloat(line.getAttribute('y2'));
      return Math.abs(lx - x) < 0.02 && Math.abs(ly - y) < 0.02;
    }) || null;
  }
  function highlight(event) {
    const target = event && event.target;
    const planet = target && target.nodeType === 1 && typeof target.closest === 'function'
      ? target.closest('.const-planet') : null;
    lines.forEach((line) => line.classList.remove('v2e020-linked'));
    if (!planet || !planetLayer || !planetLayer.contains(planet)) return;
    const line = linkedLine(planet);
    if (line) line.classList.add('v2e020-linked');
    layout.dataset.v2e020Linked = line ? '1' : '0';
  }
  if (planetLayer && planetLayer.dataset.v2e020Edges !== '1') {
    planetLayer.dataset.v2e020Edges = '1';
    planetLayer.addEventListener('focusin', highlight);
    planetLayer.addEventListener('focusout', highlight);
    planetLayer.addEventListener('mouseover', highlight);
    planetLayer.addEventListener('mouseout', highlight);
  }

  /* E020-08 — Sens de circulation : une bascule indépendante inverse le flux
     de l'arête et le balancement des lunes via une seule classe. */
  const direction = ensure(ctx, 'v2e020-direction', 'button', '', controls);
  direction.type = 'button';
  const applyDirection = () => {
    const arriere = state.direction === 'arriere';
    layout.classList.toggle('v2e020-reverse', arriere);
    layout.dataset.v2e020Direction = state.direction;
    direction.textContent = arriere ? 'Sens : arrière' : 'Sens : avant';
    direction.setAttribute('aria-pressed', arriere ? 'true' : 'false');
    direction.setAttribute('aria-label', 'Inverser le sens du flux et du balancement des lunes');
  };
  direction.onclick = () => {
    state.direction = state.direction === 'avant' ? 'arriere' : 'avant';
    applyDirection();
    if (typeof updateReadout === 'function') updateReadout();
  };
  applyDirection();
  controls.appendChild(direction);

  /* E020-09 — Bandeau sémantique : groupe nommé, description clavier jointe,
     libellés explicites et cibles tactiles conformes. */
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-labelledby', 'v2e020-title');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Commandes de mouvement V2');
  const help = ensure(ctx, 'v2e020-help', 'p', 'v2e020-sr', panel);
  help.textContent = 'Courbe : choisir l’accélération du mouvement. Sens : inverser le flux de l’arête et le balancement des lunes. Le mouvement se met en pause dès qu’une planète ou une lune reçoit le focus ou le pointeur.';
  controls.setAttribute('aria-describedby', 'v2e020-help');
  ease.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');

  /* E020-10 — Témoin auditable : annonce polie et attributs data-v2e020-*
     reflétant l'état, avec contrôle d'unicité des identifiants. */
  const readout = ensure(ctx, 'v2e020-readout', 'p', 'v2e020-readout', panel);
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  function updateReadout() {
    const easeText = EASE_LABELS[state.ease] || EASE_LABELS.douce;
    const directionText = state.direction === 'arriere' ? 'arrière' : 'avant';
    readout.textContent = `Mouvement V2 : flux ${directionText} · courbe ${easeText} · planètes ${planets.length} · lunes ${moons.length} · arêtes ${lines.length}.`;
    layout.dataset.v2e020Lines = String(lines.length);
    layout.dataset.v2e020Unique = String(uniqueIds());
  }
  updateReadout();
});
