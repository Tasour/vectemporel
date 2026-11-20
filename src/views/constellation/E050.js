import { register } from './registry.js';

/* Lentille E050 — Mouvement et transitions appliqués à la légende de la vue
   Constellation. Dix chantiers concrets, documentés dans
   UNIFIED_AUDIT/CONSTELLATION/views/E050.md. Le mouvement est déclaratif (CSS)
   ou piloté par des attributs et des écouteurs : aucun minuteur, aucune boucle
   rAF propre, aucun appel réseau, aucune valeur aléatoire, aucune écriture
   console. Toutes les règles sont préfixées par `.constellation-e050`, classe
   posée sur le `.constellation-layout` transmis par la vue. */

const SCOPE = 'constellation-e050';
const CURSOR_ID = 'e050-cursor';
const TOGGLE_ID = 'e050-toggle';
const STATUS_ID = 'e050-status';

/* État de module : la coque reconstruisant le DOM à chaque set(), la bascule
   d'animation doit survivre aux rendus, exactement comme focusMemory dans la
   vue. L'ensemble des entrées déjà liées évite tout écouteur en doublon. */
let motionOn = true;
let initialized = false;
const boundEntries = new WeakSet();

const LABELS = {
  sun: 'Ère active',
  planet: 'Repère actif',
  moon: 'Point vérifié actif',
};
const SELECTORS = {
  sun: '.legend-sun',
  planet: '.legend-planet',
  moon: '.legend-moon',
};

const CSS = `
/* E050-06 — retrait animé des couches non ciblées : la feuille pilote l'opacité
   des couches sœurs via l'attribut data-e050-focus posé par E050-05. */
@keyframes e050-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes e050-pulse{0%,100%{transform:scale(1);opacity:.65}50%{transform:scale(1.35);opacity:1}}
.constellation-e050 .constellation-legend{position:relative}
.constellation-e050 .legend-sun,
.constellation-e050 .legend-planet,
.constellation-e050 .legend-moon{
  display:inline-block;
  transition:color .2s ease,transform .2s ease;
  animation:e050-in .42s ease both;
}
.constellation-e050 .legend-sun{animation-delay:0ms}
.constellation-e050 .legend-planet{animation-delay:var(--e050-stagger,80ms)}
.constellation-e050 .legend-moon{animation-delay:calc(var(--e050-stagger,80ms) * 2)}
.constellation-e050 .legend-sun:hover,
.constellation-e050 .legend-planet:hover,
.constellation-e050 .legend-moon:hover{transform:translateY(-2px)}
.constellation-e050 .legend-sun[data-e050-active="true"],
.constellation-e050 .legend-planet[data-e050-active="true"],
.constellation-e050 .legend-moon[data-e050-active="true"]{
  color:var(--gold-bright);font-weight:600
}
.e050-cursor{
  position:absolute;left:0;bottom:-4px;height:2px;border-radius:2px;
  width:var(--e050-w,0px);transform:translateX(var(--e050-x,0px));
  background:linear-gradient(90deg,transparent,var(--gold-bright),transparent);
  pointer-events:none;
  transition:transform .28s ease,width .28s ease,opacity .2s ease
}
.constellation-e050[data-e050-active="none"] .e050-cursor{opacity:0}
.e050-dot{
  display:inline-block;width:6px;height:6px;margin-left:5px;border-radius:50%;
  background:var(--violet,#b28bdd);vertical-align:middle;
  animation:e050-pulse 1.8s ease-in-out infinite
}
.constellation-e050 .const-layer{transition:opacity .22s ease}
.constellation-e050[data-e050-focus="sun"] .const-layer-planets,
.constellation-e050[data-e050-focus="sun"] .const-layer-moons,
.constellation-e050[data-e050-focus="planet"] .const-layer-suns,
.constellation-e050[data-e050-focus="planet"] .const-layer-moons,
.constellation-e050[data-e050-focus="moon"] .const-layer-suns,
.constellation-e050[data-e050-focus="moon"] .const-layer-planets{opacity:.25}
.e050-toggle{
  min-height:36px;padding:4px 10px;margin-left:auto;
  border:1px solid var(--line);border-radius:999px;background:transparent;
  color:var(--muted);font:inherit;font-size:9px;cursor:pointer;
  transition:border-color .18s ease,color .18s ease,background-color .18s ease
}
.e050-toggle[aria-pressed="true"]{
  border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)
}
.e050-toggle:hover{border-color:var(--gold)}
.e050-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e050-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0
}
.constellation-e050[data-e050-motion="off"] :is(.legend-sun,.legend-planet,.legend-moon,.e050-cursor,.e050-dot),
.constellation-e050[data-e050-reduced="1"] :is(.legend-sun,.legend-planet,.legend-moon,.e050-cursor,.e050-dot){
  animation:none!important;transition:none!important
}
@media (prefers-reduced-motion:reduce){
  .constellation-e050 :is(.legend-sun,.legend-planet,.legend-moon,.e050-cursor,.e050-dot){
    animation:none!important;transition:none!important
  }
}
`;

register('E050', (ctx) => {
  /* Contrat : le layout est vérifié avant la moindre insertion dans le DOM. */
  if (!ctx || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const { layout, css, el } = ctx;

  /* E050-08 — couplage à prefers-reduced-motion : la préférence est lue via
     ctx.reducedMotion(), reportée en attribut data-e050-reduced sur le layout,
     et la feuille annule animations et transitions (media query + attribut). */
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (!initialized) {
    initialized = true;
    if (reduced) motionOn = false;
  }
  if (reduced) layout.setAttribute('data-e050-reduced', '1');
  else layout.removeAttribute('data-e050-reduced');
  layout.setAttribute('data-e050-motion', motionOn ? 'on' : 'off');

  /* E050-01 — fondu d'entrée en cascade : l'ancrage de portée active les
     @keyframes e050-in et les animation-delay de la feuille sur les trois
     entrées .legend-* ; effet purement CSS, aucun script animé. */
  css('constellation-e050', CSS);
  layout.classList.add(SCOPE);

  const legend = layout.querySelector('.constellation-legend');
  if (!legend) return;
  const head = layout.querySelector('.constellation-head') || legend.parentNode;

  /* E050-10 — rythme de cascade adaptatif : le nombre réel d'entrées présentes
     fixe l'espacement (240/n ms, plancher 60 ms) dans la variable CSS
     --e050-stagger consommée par les animation-delay de E050-01. */
  const entries = Array.prototype.slice.call(
    legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon')
  );
  const count = Math.max(1, entries.length);
  legend.style.setProperty('--e050-stagger', `${Math.max(60, Math.round(240 / count))}ms`);

  /* E050-04 — pastille pulsée « point vérifié » : un point décoratif est
     injecté une seule fois dans l'entrée .legend-moon ; l'animation e050-pulse
     de la feuille le fait respirer, sans minuteur ni boucle propre. */
  const moonEntry = legend.querySelector('.legend-moon');
  if (moonEntry && !moonEntry.querySelector('.e050-dot')) {
    const dot = el('span', 'e050-dot');
    dot.setAttribute('aria-hidden', 'true');
    moonEntry.appendChild(dot);
  }

  /* E050-03 — marquage de l'entrée active : la catégorie est déduite des nœuds
     .is-active réellement présents dans le champ (priorité lune > planète >
     soleil), puis reportée en attribut data-e050-active sur chaque entrée. */
  const field = layout.querySelector('.constellation-field');
  let category = '';
  if (field) {
    if (field.querySelector('.const-moon.is-active')) category = 'moon';
    else if (field.querySelector('.const-planet.is-active')) category = 'planet';
    else if (field.querySelector('.const-sun.is-active')) category = 'sun';
  }
  Object.keys(SELECTORS).forEach((key) => {
    const entry = legend.querySelector(SELECTORS[key]);
    if (!entry) return;
    if (key === category) entry.setAttribute('data-e050-active', 'true');
    else entry.removeAttribute('data-e050-active');
  });
  if (category) legend.setAttribute('data-e050-active', category);
  else legend.setAttribute('data-e050-active', 'none');

  /* E050-02 — souligneur glissant : un trait décoratif unique est créé dans la
     légende ; sa position et sa largeur sont calculées depuis l'entrée active
     (offsetLeft/offsetWidth) puis passées en variables CSS, la transition
     transform/width de la feuille assurant le glissement. */
  let cursor = document.getElementById(CURSOR_ID);
  if (!cursor || !legend.contains(cursor)) {
    cursor = el('span', 'e050-cursor');
    cursor.id = CURSOR_ID;
    cursor.setAttribute('aria-hidden', 'true');
    legend.appendChild(cursor);
  }
  const activeEntry = category ? legend.querySelector(SELECTORS[category]) : null;
  if (activeEntry && activeEntry.offsetWidth > 0) {
    legend.style.setProperty('--e050-x', `${activeEntry.offsetLeft}px`);
    legend.style.setProperty('--e050-w', `${activeEntry.offsetWidth}px`);
  } else {
    legend.style.setProperty('--e050-w', '0px');
  }

  /* E050-09 — région live de catégorie : un texte visuellement masqué mais
     exposé aux lecteurs d'écran annonce uniquement le changement de catégorie,
     détecté par comparaison avec le texte courant de la région. */
  let status = document.getElementById(STATUS_ID);
  if (!status || !status.isConnected) {
    status = el('p', 'e050-sr');
    status.id = STATUS_ID;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    if (head && head.appendChild) head.appendChild(status);
  }
  const message = category ? `Légende : ${LABELS[category]}.` : '';
  if (status && status.textContent !== message) status.textContent = message;

  /* E050-05 — survol croisé légende ↔ couches : un écouteur par entrée, posé
     une seule fois, reporte la catégorie survolée dans data-e050-focus du
     layout ; la feuille réduit alors l'opacité des autres couches. */
  entries.forEach((entry) => {
    if (boundEntries.has(entry)) return;
    boundEntries.add(entry);
    const key = entry.classList.contains('legend-sun') ? 'sun'
      : entry.classList.contains('legend-planet') ? 'planet' : 'moon';
    entry.addEventListener('mouseenter', () => layout.setAttribute('data-e050-focus', key));
    entry.addEventListener('mouseleave', () => layout.removeAttribute('data-e050-focus'));
  });

  /* E050-06 — retrait animé des couches non ciblées : effet porté par la règle
     `.constellation-e050[data-e050-focus="…"] .const-layer-… {opacity:.25}`
     de la feuille, avec `transition:opacity .22s` sur `.const-layer`. */

  /* E050-07 — bascule « Animations de la légende » : bouton unique à
     aria-pressed inséré dans l'en-tête ; l'état vit dans ce module, survit aux
     re-renders et pilote data-e050-motion (la feuille annule alors animations
     et transitions). */
  let toggle = document.getElementById(TOGGLE_ID);
  if (!toggle || !toggle.isConnected) {
    toggle = el('button', 'e050-toggle', 'Animations de la légende');
    toggle.id = TOGGLE_ID;
    toggle.type = 'button';
    if (head && head.appendChild) head.appendChild(toggle);
    toggle.addEventListener('click', () => {
      motionOn = !motionOn;
      toggle.setAttribute('aria-pressed', motionOn ? 'true' : 'false');
      const currentLayout = toggle.closest('.constellation-e050') || layout;
      currentLayout.setAttribute('data-e050-motion', motionOn ? 'on' : 'off');
      toggle.textContent = motionOn
        ? 'Animations de la légende' : 'Animations de la légende : coupées';
    });
  }
  toggle.setAttribute('aria-pressed', motionOn ? 'true' : 'false');
  toggle.textContent = motionOn
    ? 'Animations de la légende' : 'Animations de la légende : coupées';
});
