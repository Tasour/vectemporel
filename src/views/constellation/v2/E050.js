import { register } from './registry.js';

/* Lentille V2 E050 — Mouvement et transitions de la légende, seconde passe.
   Dix chantiers inédits, tous implémentés ici : aucune dépendance externe,
   aucun réseau, aucune valeur aléatoire, aucun minuteur ni boucle d'animation
   propre. Tout identifiant DOM/CSS porte le préfixe v2e050 ; l'unique feuille
   est constellation-v2-e050. */

const SCOPE = 'v2e050';
const CSS_ID = 'constellation-v2-e050';
const TEMPO_ID = 'v2e050-tempo';
const STATUS_ID = 'v2e050-status';
const NORMAL_MS = 220;

/* État de module : la coque reconstruisant le DOM à chaque rendu, la cadence
   choisie et l'observateur d'intersection doivent survivre aux set(). */
let slowTempo = false;
let observer = null;
let observedLegend = null;
const boundEntries = new WeakSet();

const LABELS = {
  sun: 'Ère',
  planet: 'Repère',
  moon: 'Point vérifié',
};
const MARKER_SEL = {
  sun: '.const-sun',
  planet: '.const-planet',
  moon: '.const-moon',
};

const CSS = `
/* 01 — portée et tempo unifié : toutes les durées V2 passent par --v2e050-dur. */
.v2e050 .constellation-legend{position:relative;overflow:hidden}
.v2e050 :is(.legend-sun,.legend-planet,.legend-moon){
  transform:translateX(var(--v2e050-dir,0px));
  opacity:var(--v2e050-op,1);
  transition:transform var(--v2e050-dur,220ms) ease,
             opacity var(--v2e050-dur,220ms) ease,
             letter-spacing var(--v2e050-dur,220ms) ease,
             box-shadow var(--v2e050-dur,220ms) ease;
  transition-delay:var(--v2e050-i,0ms);
}
/* 03 — rebond au focus clavier : ressort, contour et léger agrandissement. */
.v2e050 :is(.legend-sun,.legend-planet,.legend-moon):focus-visible{
  outline:2px solid var(--gold-bright);
  outline-offset:3px;
  transform:translateX(var(--v2e050-dir,0px)) translateY(-3px) scale(1.08);
  transition-timing-function:cubic-bezier(.2,1.5,.35,1);
}
/* 04 — espacement respirant de l'entrée active. */
.v2e050 :is(.legend-sun,.legend-planet,.legend-moon)[data-v2e050-active="true"]{
  letter-spacing:.08em;
}
/* 05 — ondée de sélection, rejouée à chaque changement de catégorie. */
@keyframes v2e050-wave{
  0%,100%{transform:translateX(var(--v2e050-dir,0px)) scale(1)}
  45%{transform:translateX(var(--v2e050-dir,0px)) scale(1.12)}
}
.v2e050 .constellation-legend[data-v2e050-wave] :is(.legend-sun,.legend-planet,.legend-moon){
  animation:v2e050-wave var(--v2e050-dur,220ms) ease both;
  animation-delay:var(--v2e050-wave-delay,0ms);
}
/* 06 — balayage lumineux : trait décoratif qui traverse la légende. */
.v2e050 .constellation-legend::after{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(100deg,transparent 35%,rgba(244,214,158,.22) 50%,transparent 65%);
  transform:translateX(-120%);opacity:0;
}
.v2e050 .constellation-legend[data-v2e050-sweep]::after{
  animation:v2e050-sweep var(--v2e050-dur,220ms) ease-out both;
}
@keyframes v2e050-sweep{
  0%{transform:translateX(-120%);opacity:1}
  100%{transform:translateX(120%);opacity:0}
}
/* 09 — suspension hors écran : l'attribut idle neutralise mouvements et
   transitions sans modifier le DOM ni installer de boucle propre. */
.v2e050 .constellation-legend[data-v2e050-idle="1"] :is(.legend-sun,.legend-planet,.legend-moon),
.v2e050 .constellation-legend[data-v2e050-idle="1"]::after{
  animation:none!important;transition:none!important
}
/* 10 — bascule de cadence, bouton et annonce accessibles. */
.v2e050-tempo{
  min-height:36px;padding:4px 10px;margin-left:8px;
  border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:9px;
  cursor:pointer;
  transition:border-color var(--v2e050-dur,220ms) ease,color var(--v2e050-dur,220ms) ease;
}
.v2e050-tempo[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright)}
.v2e050-tempo:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e050-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0
}
`;

register('E050', ctx => {
  /* Garde d'entrée : sans layout courant ni API de feuille, aucun ajout. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const el = typeof ctx.el === 'function' ? ctx.el : null;
  const layout = ctx.layout;

  /* E050-01 — Feuille unique, ancrage de portée et tempo CSS unifié : la
     durée est écrite une fois dans --v2e050-dur et consommée par toutes les
     transitions/animations V2. Aucun minuteur, aucune mesure du temps réel. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  const legend = layout.querySelector('.constellation-legend');
  if (!legend) return;
  const head = layout.querySelector('.constellation-head') || legend.parentNode;
  legend.style.setProperty('--v2e050-dur', `${slowTempo ? NORMAL_MS * 2 : NORMAL_MS}ms`);

  /* E050-02 — Dérive directionnelle : la catégorie active est déduite des
     marqueurs réellement .is-active du champ (priorité lune > planète >
     soleil), puis chaque entrée reçoit un décalage vers l'extérieur selon
     qu'elle précède ou suit l'entrée active. */
  const field = layout.querySelector('.constellation-field');
  let category = '';
  if (field) {
    if (field.querySelector('.const-moon.is-active')) category = 'moon';
    else if (field.querySelector('.const-planet.is-active')) category = 'planet';
    else if (field.querySelector('.const-sun.is-active')) category = 'sun';
  }
  const order = ['sun', 'planet', 'moon'];
  const activeIndex = order.indexOf(category);
  const entries = Array.prototype.slice.call(
    legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon')
  );

  /* E050-03 — Rebond au focus clavier : les entrées deviennent atteignables,
     reçoivent un libellé français et un ressort CSS au focus ; Entrée/Espace
     active le marqueur correspondant du champ. Garde WeakSet anti-doublon. */
  entries.forEach((entry, index) => {
    const key = entry.classList.contains('legend-sun') ? 'sun'
      : entry.classList.contains('legend-planet') ? 'planet' : 'moon';
    if (!entry.hasAttribute('tabindex')) entry.setAttribute('tabindex', '0');
    entry.setAttribute('aria-label', `${LABELS[key]} — légende`);
    if (boundEntries.has(entry)) return;
    boundEntries.add(entry);
    entry.addEventListener('keydown', (event) => {
      if (!event || (event.key !== 'Enter' && event.key !== ' ')) return;
      const marker = field && field.querySelector(MARKER_SEL[key]);
      if (!marker) return;
      event.preventDefault();
      marker.click();
    });
  });

  /* E050-04 — Espacement respirant et état actif : chaque entrée porte son
     état dans data-v2e050-active, consommé par la règle letter-spacing. */
  /* E050-07 — Cascade de retour : le délai de transition croît avec la
     distance à l'entrée active, si bien que le retour s'ordonne du centre
     vers les bords, sans minuteur. */
  /* E050-08 — Opacité selon la distance : l'atténuation est portée par
     --v2e050-op et transitionne avec la même durée unifiée. */
  entries.forEach((entry, index) => {
    const key = entry.classList.contains('legend-sun') ? 'sun'
      : entry.classList.contains('legend-planet') ? 'planet' : 'moon';
    const distance = activeIndex < 0 ? index : Math.abs(index - activeIndex);
    const side = activeIndex < 0 || index === activeIndex
      ? 'actif' : (index < activeIndex ? 'avant' : 'apres');
    const dir = side === 'avant' ? '-4px' : (side === 'apres' ? '4px' : '0px');
    entry.setAttribute('data-v2e050-side', side);
    entry.setAttribute('data-v2e050-active', key === category ? 'true' : 'false');
    entry.style.setProperty('--v2e050-dir', dir);
    entry.style.setProperty('--v2e050-i', `${distance * 20}ms`);
    entry.style.setProperty('--v2e050-wave-delay', `${index * 20}ms`);
    entry.style.setProperty('--v2e050-op', `${Math.max(0.6, 1 - distance * 0.12).toFixed(2)}`);
  });

  /* E050-05 — Ondée de sélection rejouée : le changement de catégorie est
     détecté par comparaison avec la valeur mémorisée ; un reflow synchrone
     relance l'animation, sans minuteur ni boucle d'animation. */
  /* E050-06 — Balayage lumineux : le même reflow relance le trait décoratif
     qui traverse la légende, purement piloté par la feuille de style. */
  const previous = legend.getAttribute('data-v2e050-prev') || '';
  if (category && category !== previous) {
    legend.removeAttribute('data-v2e050-wave');
    legend.removeAttribute('data-v2e050-sweep');
    void legend.offsetWidth;
    legend.setAttribute('data-v2e050-wave', category);
    legend.setAttribute('data-v2e050-sweep', '1');
  }
  legend.setAttribute('data-v2e050-prev', category);

  /* E050-09 — Suspension hors écran via IntersectionObserver : la légende
     hors champ passe en data-v2e050-idle="1" et la feuille gèle ses
     transitions. Repli silencieux si l'API n'existe pas. */
  if (typeof IntersectionObserver === 'function') {
    if (observer && observedLegend !== legend) {
      observer.disconnect();
      observer = null;
      observedLegend = null;
    }
    if (!observer) {
      observer = new IntersectionObserver((items) => {
        const visible = items.some((item) => item.isIntersecting);
        legend.setAttribute('data-v2e050-idle', visible ? '0' : '1');
      }, { threshold: 0.01 });
      observedLegend = legend;
      observer.observe(legend);
    }
  } else {
    legend.removeAttribute('data-v2e050-idle');
  }

  /* E050-10 — Bascule de cadence : bouton unique à aria-pressed (bascule
     indépendante) inséré dans l'en-tête, état conservé dans le module, et
     région live qui annonce le changement sans bruit répétitif. */
  let status = document.getElementById(STATUS_ID);
  if (!status || !status.isConnected) {
    status = el ? el('p', 'v2e050-sr') : document.createElement('p');
    status.id = STATUS_ID;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    if (head && head.appendChild) head.appendChild(status);
  }
  let tempo = document.getElementById(TEMPO_ID);
  if (!tempo || !tempo.isConnected) {
    tempo = el ? el('button', 'v2e050-tempo', 'Cadence : normale')
      : document.createElement('button');
    tempo.id = TEMPO_ID;
    tempo.type = 'button';
    if (head && head.appendChild) head.appendChild(tempo);
    tempo.addEventListener('click', () => {
      slowTempo = !slowTempo;
      tempo.setAttribute('aria-pressed', slowTempo ? 'true' : 'false');
      tempo.textContent = slowTempo ? 'Cadence : lente' : 'Cadence : normale';
      tempo.setAttribute('aria-label', slowTempo
        ? 'Accélérer les transitions de la légende'
        : 'Ralentir les transitions de la légende');
      const currentLayout = tempo.closest(`.${SCOPE}`) || layout;
      currentLayout.setAttribute('data-v2e050-tempo', slowTempo ? 'lent' : 'normal');
      const currentLegend = currentLayout.querySelector('.constellation-legend') || legend;
      currentLegend.style.setProperty('--v2e050-dur', `${slowTempo ? NORMAL_MS * 2 : NORMAL_MS}ms`);
      const currentStatus = currentLayout.querySelector(`#${STATUS_ID}`) || status;
      if (currentStatus) {
        currentStatus.textContent = slowTempo
          ? 'Cadence des transitions : lente.' : 'Cadence des transitions : normale.';
      }
    });
  }
  tempo.setAttribute('aria-pressed', slowTempo ? 'true' : 'false');
  tempo.textContent = slowTempo ? 'Cadence : lente' : 'Cadence : normale';
  tempo.setAttribute('aria-label', slowTempo
    ? 'Accélérer les transitions de la légende'
    : 'Ralentir les transitions de la légende');
  layout.setAttribute('data-v2e050-tempo', slowTempo ? 'lent' : 'normal');
});
