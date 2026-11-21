import { register } from './registry.js';

/* Lentille V2 E010 — mouvement et transitions des soleils. Seconde passe :
   dix chantiers inédits, tous implémentés, sans réseau ni source aléatoire. */

const V2E010_CADENCES = [
  { cle: 'lente', facteur: 1.6, libelle: 'Lente' },
  { cle: 'normale', facteur: 1, libelle: 'Normale' },
  { cle: 'rapide', facteur: 0.6, libelle: 'Rapide' },
];
const v2e010Info = cle => V2E010_CADENCES.find(item => item.cle === cle) || V2E010_CADENCES[1];

let v2e010Cadence = 'normale';
let v2e010LastLayout = null;
let v2e010LastActive = null;

register('E010', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;

  /* Feuille unique de la lentille : cadence, relève, veille et ambiance. */
  css('constellation-v2-e010', `
.v2e010-root{--v2e010-tempo:1;--v2e010-density:1;--v2e010-angle:0}
.v2e010-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e010-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0 0;padding:6px 8px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
.v2e010-bar-label{margin:0;color:var(--muted);font-size:9px;letter-spacing:.08em;text-transform:uppercase}
.v2e010-cadence{display:inline-flex;flex-wrap:wrap;gap:4px}
.v2e010-cadence button{min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;transition:border-color .2s,background .2s,color .2s}
.v2e010-cadence button[aria-checked="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(244,214,158,.10)}
.v2e010-cadence button:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.v2e010-readout{margin:6px 0 0;color:var(--muted-2);font-size:9px}
.const-sun.v2e010-phased{animation:v2e010-drift calc(var(--v2e010-tempo)*var(--v2e010-density)*6s) ease-in-out infinite;animation-delay:calc(var(--v2e010-angle)*var(--v2e010-tempo)*-2s)}
@keyframes v2e010-drift{0%,100%{filter:brightness(1)}50%{filter:brightness(1.07)}}
.const-sun.v2e010-handoff{animation:v2e010-handoff calc(var(--v2e010-tempo)*.7s) ease-out 1;z-index:6}
@keyframes v2e010-handoff{0%{box-shadow:0 0 0 0 rgba(244,214,158,.55)}60%{box-shadow:0 0 0 14px rgba(244,214,158,0)}100%{box-shadow:0 0 0 0 rgba(244,214,158,0)}}
.v2e010-wave{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:0;border:1px solid rgba(244,214,158,.5);border-radius:50%;transform:translate(-50%,-50%) scale(.2);opacity:0;pointer-events:none;z-index:0}
.v2e010-wave-run{animation:v2e010-wave calc(var(--v2e010-tempo)*.9s) ease-out 1}
@keyframes v2e010-wave{0%{transform:translate(-50%,-50%) scale(.2);opacity:.7}100%{transform:translate(-50%,-50%) scale(9);opacity:0}}
.const-sun.v2e010-idle{opacity:.62;filter:saturate(.85)}
.const-sun.v2e010-idle.v2e010-phased{animation-name:v2e010-idle-drift;animation-duration:calc(var(--v2e010-tempo)*var(--v2e010-density)*9s)}
@keyframes v2e010-idle-drift{0%,100%{filter:saturate(.85) brightness(1)}50%{filter:saturate(.85) brightness(1.05)}}
.constellation-field:focus-within .v2e010-idle,
.constellation-field:focus-within .v2e010-wave,
.constellation-field:focus-within .v2e010-sheen,
.constellation-field[data-v2e010-focus="true"] .v2e010-idle,
.constellation-field[data-v2e010-focus="true"] .v2e010-wave,
.constellation-field[data-v2e010-focus="true"] .v2e010-sheen{animation-play-state:paused}
.v2e010-sheen{position:absolute;inset:0;pointer-events:none;z-index:0;background:linear-gradient(105deg,transparent 38%,rgba(244,214,158,.07) 50%,transparent 62%);transform:translateX(-60%);animation:v2e010-sweep calc(var(--v2e010-tempo)*var(--v2e010-density)*14s) linear infinite}
@keyframes v2e010-sweep{0%{transform:translateX(-60%)}100%{transform:translateX(60%)}}
.v2e010-root.v2e010-still .v2e010-sheen,
.v2e010-root.v2e010-still .v2e010-idle,
.v2e010-root.v2e010-still .v2e010-wave{animation:none!important}
@media (prefers-reduced-motion: reduce){
.v2e010-root .v2e010-sheen,.v2e010-root .v2e010-idle,.v2e010-root .v2e010-wave{animation:none!important}
.v2e010-root .v2e010-cadence button{transition:none}
}
`);

  /* Un rendu recrée le layout : on réinitialise la mémoire de relève. */
  if (v2e010LastLayout !== layout) {
    v2e010LastLayout = layout;
    v2e010LastActive = null;
  }
  layout.classList.add('v2e010-root');

  const field = layout.querySelector('.constellation-field');
  const sunLayer = layout.querySelector('.const-layer-suns');
  const suns = sunLayer ? Array.from(sunLayer.querySelectorAll('button.const-sun')) : [];

  /* E010-01 — Tempo unique piloté par une variable CSS partagée. */
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  layout.style.setProperty('--v2e010-tempo', String(v2e010Info(v2e010Cadence).facteur));
  layout.setAttribute('data-v2e010-cadence', v2e010Cadence);
  if (reduced) layout.classList.add('v2e010-still');
  else layout.classList.remove('v2e010-still');

  const majCadence = cle => {
    const info = v2e010Info(cle);
    if (info.cle !== cle) return;
    v2e010Cadence = cle;
    layout.style.setProperty('--v2e010-tempo', String(info.facteur));
    layout.setAttribute('data-v2e010-cadence', cle);
    const groupe = layout.querySelector('#v2e010-cadence');
    if (groupe) {
      Array.from(groupe.querySelectorAll('button')).forEach(button => {
        const actif = button.dataset.v2e010Cadence === cle;
        button.setAttribute('aria-checked', actif ? 'true' : 'false');
        button.tabIndex = actif ? 0 : -1;
      });
    }
    const sortie = layout.querySelector('#v2e010-readout');
    if (sortie) {
      sortie.textContent = `Cadence du mouvement : ${info.libelle.toLowerCase()}. Facteur de durée ${info.facteur.toFixed(2)}.`;
    }
  };

  /* E010-02 — Cadence sélectionnable : radiogroupe Lente / Normale / Rapide. */
  let bar = layout.querySelector('#v2e010-bar');
  if (!bar) {
    const fabriquer = (tag, cls, texte) => typeof ctx.el === 'function'
      ? ctx.el(tag, cls, texte) : document.createElement(tag);
    bar = fabriquer('div', 'v2e010-bar');
    bar.id = 'v2e010-bar';
    const titre = fabriquer('p', 'v2e010-bar-label', 'Cadence du mouvement');
    const groupe = fabriquer('div', 'v2e010-cadence');
    groupe.id = 'v2e010-cadence';
    groupe.setAttribute('role', 'radiogroup');
    groupe.setAttribute('aria-label', 'Cadence du mouvement');
    V2E010_CADENCES.forEach(info => {
      const button = fabriquer('button', 'v2e010-cad', info.libelle);
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.dataset.v2e010Cadence = info.cle;
      button.setAttribute('aria-checked', info.cle === v2e010Cadence ? 'true' : 'false');
      button.tabIndex = info.cle === v2e010Cadence ? 0 : -1;
      button.addEventListener('click', () => majCadence(info.cle));
      groupe.appendChild(button);
    });
    groupe.addEventListener('keydown', event => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const index = V2E010_CADENCES.findIndex(item => item.cle === v2e010Cadence);
      if (index < 0) return;
      let suivant = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') suivant = (index + 1) % V2E010_CADENCES.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') suivant = (index - 1 + V2E010_CADENCES.length) % V2E010_CADENCES.length;
      else if (event.key === 'Home') suivant = 0;
      else if (event.key === 'End') suivant = V2E010_CADENCES.length - 1;
      else return;
      event.preventDefault();
      event.stopPropagation();
      majCadence(V2E010_CADENCES[suivant].cle);
      const cible = groupe.querySelector(`button[data-v2e010-cadence="${V2E010_CADENCES[suivant].cle}"]`);
      if (cible) cible.focus({ preventScroll: true });
    });
    bar.append(titre, groupe);
    if (field && field.parentNode) field.parentNode.insertBefore(bar, field);
    else layout.appendChild(bar);
  }

  /* E010-03 — Readout vivant de la cadence choisie. */
  if (!layout.querySelector('#v2e010-readout')) {
    const sortie = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e010-readout') : document.createElement('p');
    sortie.id = 'v2e010-readout';
    sortie.setAttribute('role', 'status');
    sortie.setAttribute('aria-live', 'polite');
    sortie.setAttribute('aria-atomic', 'true');
    const info = v2e010Info(v2e010Cadence);
    sortie.textContent = `Cadence du mouvement : ${info.libelle.toLowerCase()}. Facteur de durée ${info.facteur.toFixed(2)}.`;
    layout.appendChild(sortie);
  }

  /* E010-04 — Phase angulaire déterministe issue de --x et --y. */
  suns.forEach(sun => {
    const x = parseFloat(sun.style.getPropertyValue('--x'));
    const y = parseFloat(sun.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const angle = (Math.atan2(y - 50, x - 50) + Math.PI) / (2 * Math.PI);
    const phase = Math.max(0, Math.min(1, angle)).toFixed(3);
    sun.style.setProperty('--v2e010-angle', phase);
    sun.dataset.v2e010Angle = phase;
    sun.classList.add('v2e010-phased');
  });

  /* E010-05 — Relève du soleil actif observée sans minuteur. */
  const declencherReleve = () => {
    const courant = sunLayer ? sunLayer.querySelector('button.const-sun.is-active') : null;
    if (!courant) return;
    const cle = courant.dataset.constKey || courant.getAttribute('aria-label') || '';
    if (cle && cle === v2e010LastActive) return;
    v2e010LastActive = cle || null;
    suns.forEach(sun => sun.classList.remove('v2e010-handoff'));
    courant.classList.add('v2e010-handoff');
    const vague = layout.querySelector('.v2e010-wave');
    if (vague) {
      vague.classList.remove('v2e010-wave-run');
      void vague.offsetWidth;
      vague.classList.add('v2e010-wave-run');
    }
    majVeille();
  };
  if (sunLayer && typeof MutationObserver !== 'undefined') {
    try {
      const observateur = new MutationObserver(declencherReleve);
      observateur.observe(sunLayer, { attributes: true, attributeFilter: ['class'], subtree: true });
    } catch { /* Observation indisponible : seule la relève initiale est appliquée. */ }
  }

  /* E010-06 — Onde de transfert : calque unique, purement décoratif. */
  if (field && !field.querySelector('.v2e010-wave')) {
    const vague = typeof ctx.el === 'function'
      ? ctx.el('span', 'v2e010-wave') : document.createElement('span');
    vague.setAttribute('aria-hidden', 'true');
    field.appendChild(vague);
  }

  /* E010-07 — Mise en veille des soleils inactifs. */
  const majVeille = () => {
    const courant = sunLayer ? sunLayer.querySelector('button.const-sun.is-active') : null;
    suns.forEach(sun => {
      if (sun === courant) sun.classList.remove('v2e010-idle');
      else sun.classList.add('v2e010-idle');
    });
  };
  majVeille();

  /* E010-08 — Pause des motions décoratives dès qu'un contrôle a le focus. */
  if (field) {
    field.addEventListener('focusin', () => field.setAttribute('data-v2e010-focus', 'true'));
    field.addEventListener('focusout', () => field.removeAttribute('data-v2e010-focus'));
  }

  /* E010-09 — Balayage lumineux ambiant sur la couche des soleils. */
  if (field && !field.querySelector('.v2e010-sheen')) {
    const sheen = typeof ctx.el === 'function'
      ? ctx.el('span', 'v2e010-sheen') : document.createElement('span');
    sheen.setAttribute('aria-hidden', 'true');
    field.appendChild(sheen);
  }

  /* E010-10 — Densité : la durée ambiante s'adapte au nombre de soleils. */
  const densite = Math.max(0.8, Math.min(1.5, 1 + (suns.length - 5) * 0.06));
  layout.style.setProperty('--v2e010-density', densite.toFixed(2));
  layout.setAttribute('data-v2e010-density', densite.toFixed(2));

  /* Amorçage initial de la relève et de l'onde. */
  declencherReleve();
});
