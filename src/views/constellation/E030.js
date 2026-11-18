import { register } from './registry.js';

/* Lentille E030 — Mouvement et transitions appliqués aux lunes de la vue
   Constellation. Dix chantiers déterministes et décoratifs : aucune horloge,
   aucune boucle d'animation propre, aucun tirage aléatoire, aucun appel réseau
   et aucun journal d'exécution. Le greffon vérifie ctx.layout avant toute insertion, réutilise
   ses nœuds et neutralise ses effets en mouvement réduit. Périmètre possédé :
   src/views/constellation/E030.js uniquement ; aucun fichier partagé touché. */

const CSS_ID = 'constellation-e030';
const SCOPE = 'e030';
const NOTE_ID = 'e030-motion-note';

/* Feuille unique, préfixée `.e030` (classe posée sur ctx.layout) pour éviter
   toute fuite hors de la vue. Aucune URL distante, aucune règle d'import, aucune police externe. */
const CSS = `
.e030 .const-moon{
  transform:translate(-50%,-50%) scale(var(--e030-hover,1));
  transition:transform .2s cubic-bezier(.2,.8,.2,1),background-color .2s linear,box-shadow .2s linear;
}
.e030 .const-moon:hover{--e030-hover:1.28}
.e030 .const-moon:active{--e030-hover:.92}
.e030 .const-moon[data-e030-enter="1"]{
  animation:e030-enter .42s cubic-bezier(.2,.8,.2,1) backwards;
  animation-delay:var(--e030-delay,0ms);
}
@keyframes e030-enter{
  from{opacity:0;transform:translate(-50%,-42%) scale(.68)}
  to{opacity:1;transform:translate(-50%,-50%) scale(1)}
}
.e030 .const-moon::before{
  content:"";position:absolute;inset:-5px;border-radius:50%;
  border:1px solid var(--violet);opacity:0;transform:scale(.55);
  transition:transform .24s ease-out,opacity .24s ease-out;pointer-events:none;
}
.e030 .const-moon[data-e030-active="1"]::before{opacity:1;transform:scale(1)}
.e030 .const-moon[data-e030-focus="1"]{outline:2px solid var(--gold-bright);outline-offset:4px}
.e030 .const-moon[data-e030-focus="1"]::before{opacity:1;transform:scale(1.18)}
.e030 .const-moon[data-e030-pulse="1"]::before{animation:e030-pulse 1.1s ease-out 2}
@keyframes e030-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(178,139,221,0)}
  50%{box-shadow:0 0 0 5px rgba(178,139,221,.16)}
}
.e030 .e030-phase{
  position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;
  border-radius:50%;background:var(--violet);opacity:.5;
  transform:rotate(var(--e030-phase,0deg)) translateY(-12px);
  transition:transform .38s cubic-bezier(.2,.7,.2,1),opacity .2s linear;
  pointer-events:none;
}
.e030 .const-moon[data-e030-active="1"] .e030-phase{
  opacity:1;transform:rotate(var(--e030-phase,0deg)) translateY(-14px);
}
.e030 .constellation-edges line[data-e030-tether]{
  transition:stroke .26s linear,stroke-width .26s linear,opacity .26s linear;
}
.e030 .constellation-edges line[data-e030-tether][data-e030-active="1"]{
  stroke:rgba(178,139,221,.95);stroke-width:2.1;opacity:1;
}
.e030 .const-moon::after{
  transition:opacity .2s ease-out,transform .2s ease-out;
  transform:translateX(-50%) translateY(2px);
}
.e030 .const-moon[data-e030-hover="1"]::after,
.e030 .const-moon:focus-visible::after{opacity:1;transform:translateX(-50%) translateY(0)}
.e030-note{
  flex:1 1 100%;margin:2px 0 0;color:var(--muted);font-size:9px;
  line-height:1.45;font-variant-numeric:tabular-nums;
}
.e030[data-e030-motion="off"] .const-moon,
.e030[data-e030-motion="off"] .const-moon::before,
.e030[data-e030-motion="off"] .const-moon::after,
.e030[data-e030-motion="off"] .e030-phase,
.e030[data-e030-motion="off"] .constellation-edges line[data-e030-tether]{
  animation:none !important;transition:none !important;
}
.e030[data-e030-motion="off"] .const-moon{opacity:1}
@media (prefers-reduced-motion:reduce){
  .e030 .const-moon,.e030 .const-moon::before,.e030 .const-moon::after,
  .e030 .e030-phase,.e030 .constellation-edges line[data-e030-tether]{
    animation:none;transition:none;
  }
  .e030 .const-moon{opacity:1}
}
@media (max-width:620px){
  .e030 .e030-phase{width:3px;height:3px;margin:-1.5px;transform:rotate(var(--e030-phase,0deg)) translateY(-10px)}
  .e030-note{font-size:8px}
}
`;

/* Préférence de mouvement : ctx d'abord, media query en repli, faux par défaut. */
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

register('E030', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans le conteneur de la vue. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;

  const layout = ctx.layout;
  const soft = (fn) => { try { fn(); } catch { /* effet non applicable : neutralisé. */ } };

  /* Un seul appel css(), protégé par cssOnce dans le registre. */
  soft(() => { if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS); });

  let moons = [];
  let moonLayer = null;
  let edges = null;
  let caption = null;
  let field = null;
  let tethers = [];
  try {
    moons = Array.from(layout.querySelectorAll('.const-moon'));
    moonLayer = layout.querySelector('.const-layer-moons');
    edges = layout.querySelector('.constellation-edges');
    caption = layout.querySelector('.constellation-caption');
    field = layout.querySelector('.constellation-field');
    tethers = edges ? Array.from(edges.querySelectorAll('line.is-moon')) : [];
  } catch { /* collections vides : le greffon reste inoffensif. */ }

  const reduced = motionReduced(ctx);
  soft(() => { layout.classList.add(SCOPE); });

  /* E030-01 — Entrée en cascade des lunes : délai calculé depuis l'index
     (45 ms par lune), sans horloge ni tirage ; `backwards` libère la transform
     après l'apparition pour laisser jouer le survol. */
  soft(() => {
    moons.forEach((moon, index) => {
      moon.style.setProperty('--e030-delay', `${index * 45}ms`);
      moon.dataset.e030Enter = '1';
    });
  });

  /* E030-02 — Anneau de sélection : attribut miroir de is-active / aria-current,
     qui pilote en CSS l'ouverture d'un anneau Réglé par transition. */
  soft(() => {
    moons.forEach((moon) => {
      const active = moon.classList.contains('is-active') ||
        moon.getAttribute('aria-current') === 'true';
      moon.dataset.e030Active = active ? '1' : '0';
    });
  });

  /* E030-03 — Lévitation au survol : une seule transformation réutilisant le
     translate(-50%,-50%) de la vue, modulée par la variable --e030-hover. */
  soft(() => {
    moons.forEach((moon) => { moon.dataset.e030Lift = '1'; });
  });

  /* E030-04 — Phase d'orbite déterministe (angle d'or 137,5°), déposée sur un
     satellite dominant ; aucun tirage aléatoire, la phase est recalculée depuis l'index. */
  soft(() => {
    moons.forEach((moon, index) => {
      if (typeof ctx.el !== 'function') return;
      let marker = moon.querySelector('.e030-phase');
      if (!marker) {
        marker = ctx.el('span', 'e030-phase');
        moon.appendChild(marker);
      }
      marker.id = `e030-phase-${index}`;
      marker.setAttribute('aria-hidden', 'true');
      const phase = (index * 137.5) % 360;
      marker.style.setProperty('--e030-phase', `${phase.toFixed(2)}deg`);
      moon.dataset.e030Phase = phase.toFixed(2);
    });
  });

  /* E030-05 — Arêtes lunaires appariées aux lunes par leur ordre de création :
     attribut d'indice et d'activité, avec transition de stroke en CSS. */
  soft(() => {
    tethers.forEach((line, index) => {
      line.setAttribute('data-e030-tether', String(index));
      line.setAttribute('data-e030-active', moons[index] && moons[index].dataset.e030Active === '1' ? '1' : '0');
    });
    if (edges) edges.dataset.e030Tethers = String(tethers.length);
  });

  /* E030-06 — Couplage explicite à la préférence de mouvement réduit :
     attributs de portée sur le layout et le champ, neutralisés par la feuille. */
  soft(() => {
    const state = reduced ? 'off' : 'on';
    layout.dataset.e030Motion = state;
    if (field) field.dataset.e030Motion = state;
  });

  /* E030-07 — Halo de focus clavier : deux écouteurs délégués sur le calque,
     aucun écouteur par lune, et garde :focus-visible pour ne pas révéler au pointeur. */
  soft(() => {
    if (!moonLayer || typeof moonLayer.addEventListener !== 'function') return;
    moonLayer.addEventListener('focusin', (event) => {
      const node = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (!node || !moonLayer.contains(node)) return;
      let visible = true;
      try { visible = node.matches(':focus-visible'); } catch { /* repli : halo prudent. */ }
      if (visible) node.dataset.e030Focus = '1';
    });
    moonLayer.addEventListener('focusout', (event) => {
      const node = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (node) node.removeAttribute('data-e030-focus');
    });
    moonLayer.dataset.e030FocusDelegated = '1';
  });

  /* E030-08 — Révélation du libellé au pointeur : attribut posé/retiré par
     délégation, la transition d'opacité et de translation étant portée par la CSS. */
  soft(() => {
    if (!moonLayer || typeof moonLayer.addEventListener !== 'function') return;
    moonLayer.addEventListener('pointerover', (event) => {
      const node = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (node && moonLayer.contains(node)) node.dataset.e030Hover = '1';
    });
    moonLayer.addEventListener('pointerout', (event) => {
      const node = event.target && event.target.closest ? event.target.closest('.const-moon') : null;
      if (node) node.removeAttribute('data-e030-hover');
    });
    moonLayer.dataset.e030LabelDelegated = '1';
  });

  /* E030-09 — Respiration bornée de la lune active : animation finie (2 cycles)
     sur l'anneau, redémarrée naturellement par la reconstruction du DOM. */
  soft(() => {
    moons.forEach((moon) => {
      const active = moon.dataset.e030Active === '1' ||
        moon.classList.contains('is-active') ||
        moon.getAttribute('aria-current') === 'true';
      if (active) moon.dataset.e030Pulse = '1';
      else moon.removeAttribute('data-e030-pulse');
    });
  });

  /* E030-10 — Badge textuel unique récapitulant lunes, attaches et état de
     mouvement ; réutilisé d'un rendu à l'autre, sans effacer la légende existante. */
  soft(() => {
    if (!caption || typeof ctx.el !== 'function') return;
    let note = document.getElementById(NOTE_ID);
    if (!note || note.parentNode !== caption) {
      note = ctx.el('p', 'e030-note');
      note.id = NOTE_ID;
      caption.appendChild(note);
    }
    const plural = moons.length > 1 ? 's' : '';
    const mode = reduced ? 'désactivées (mouvement réduit)' : 'actives';
    note.textContent = `Mouvement des lunes : ${moons.length} point${plural} vérifié${plural} · phase d'or 137,5° · ${tethers.length} attache${tethers.length > 1 ? 's' : ''} · transitions ${mode}.`;
    layout.dataset.e030Note = 'ready';
  });
});
