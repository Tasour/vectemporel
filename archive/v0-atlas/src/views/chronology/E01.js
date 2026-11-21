import { register } from './registry.js';

/* Lentille CHRONOLOGIE E01 — Lisibilité.
 *
 * Dix chantiers purement présentationnels, appliqués à chaque rendu de la vue
 * chronologie par le registre `runEnhancements`. Aucune donnée inventée, aucun
 * appel réseau, aucun `Math.random`, aucun `console.*`, aucun fichier partagé
 * modifié. Le greffon est idempotent : le CSS est injecté une seule fois
 * (ctx.css / cssOnce), les nœuds ajoutés sont protégés par des identifiants
 * uniques et l'état de la bascule « lecture confort » vit dans ce module.
 *
 * Périmètre de lecture : src/views/chronology.js (vue possédée par la vague
 * ATLAS-CHRONO), src/views/chronology/registry.js, styles.css, UNIFIED_AUDIT/
 * NAVIGATION/views/c2-orientation-atlas.md.
 */

const CSS_ID = 'chronology-e01';
const SCOPE = 'chronology-e01';
const BTN_ID = 'chronology-e01-comfort';
const COMFORT_CLASS = 'chronology-e01-comfort';
const REDUCED_ATTR = 'data-e01-reduced';

/* État persistant entre deux re-renders complets du DOM opérés par la coque
 * (shell.js:137). La coque reconstruisant `stage`, la bascule doit survivre
 * ici, exactement comme `local.query` survit dans chronology.js:16. */
let comfort = false;

/* Toutes les règles sont préfixées par `.chronology-e01`, classe posée sur le
 * conteneur `.chronology-layout` : aucune fuite hors de cette vue, aucune
 * règle de styles.css surchargée en dehors du besoin de lisibilité. */
const CSS = `
.chronology-e01 .view-lede,
.chronology-e01 .aside-summary,
.chronology-e01 .point p,
.chronology-e01 .atlas-chrono-status{max-width:68ch}
.chronology-e01 .view-lede,
.chronology-e01 .aside-summary,
.chronology-e01 .point p{line-height:1.6}
.chronology-e01 .aside-summary{margin:10px 0 14px}
.chronology-e01 .points>li+li{margin-top:10px}
.chronology-e01 .event-year{font-variant-numeric:tabular-nums;font-weight:600;color:var(--gold-bright);letter-spacing:.02em}
.chronology-e01 .aside-year{font-variant-numeric:tabular-nums}
.chronology-e01 .atlas-chrono-era-range,
.chronology-e01 .atlas-chrono-card-era,
.chronology-e01 .atlas-chrono-tags,
.chronology-e01 .point-sources,
.chronology-e01 .atlas-chrono-count,
.chronology-e01 .nav-c2-progress{color:var(--muted);opacity:1}
.chronology-e01 .atlas-chrono-count,
.chronology-e01 .atlas-chrono-era-range,
.chronology-e01 .nav-c2-progress,
.chronology-e01 .atlas-chrono-status,
.chronology-e01 .aside-kicker{font-variant-numeric:tabular-nums}
.chronology-e01 .point{padding-left:12px;border-left:2px solid var(--line)}
.chronology-e01 .points>li+li{padding-top:10px;border-top:1px solid var(--line)}
.chronology-e01-badge{display:inline-block;margin-left:6px;padding:1px 6px;border:1px solid var(--gold);border-radius:999px;color:var(--gold-bright);font-size:8px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;opacity:0;transition:opacity .18s linear}
.era-band[aria-current="true"] .chronology-e01-badge{opacity:1}
.chronology-e01 .nav-c2-trail-list{gap:5px;font-size:11px}
.chronology-e01 .nav-c2-sep{padding:0 2px}
.chronology-e01 .nav-c2-crumb.is-current{text-decoration:underline;text-underline-offset:3px}
.chronology-e01-btn{min-height:36px;margin-left:4px;padding:5px 12px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear}
.chronology-e01-btn[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.chronology-e01-btn:hover{border-color:var(--gold)}
.chronology-e01-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e01-comfort .view-lede{font-size:13px}
.chronology-e01-comfort .atlas-chrono-hint{font-size:9px}
.chronology-e01-comfort .atlas-chrono-status,
.chronology-e01-comfort .nav-c2-progress{font-size:11px}
.chronology-e01-comfort .aside-summary,
.chronology-e01-comfort .point p{font-size:13px;line-height:1.7}
.chronology-e01-comfort .event-card{font-size:12px}
.chronology-e01-comfort .atlas-chrono-era-range,
.chronology-e01-comfort .atlas-chrono-card-era,
.chronology-e01-comfort .atlas-chrono-tags,
.chronology-e01-comfort .point-sources{font-size:9px}
.chronology-e01[${REDUCED_ATTR}="1"] .chronology-e01-badge,
.chronology-e01[${REDUCED_ATTR}="1"] .chronology-e01-btn{transition:none}
@media (max-width:620px){
  .chronology-e01 .view-lede,
  .chronology-e01 .aside-summary,
  .chronology-e01 .point p{max-width:none}
  .chronology-e01-btn{margin:4px 4px 0 0}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e01 .chronology-e01-badge,
  .chronology-e01 .chronology-e01-btn{transition:none}
}`;

register('E01', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (!layout) return;

  /* Injection unique + ancrage de portée (E01-01 à E01-06, E01-08, E01-09). */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e01 = '1';

  /* E01-10 : couplage explicite à la préférence de mouvement réduit, en plus
     de la media query CSS, pour les environnements sans matchMedia fiable. */
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E01-07 : l'ère courante est déjà marquée par aria-current="true"
     (ATLAS-CHRONO-02) ; on ajoute un badge TEXTUEL visible pour que l'état ne
     soit pas porté par la seule couleur. Garde anti-doublon pour un éventuel
     second passage de runEnhancements sur le même DOM. */
  const activeBand = layout.querySelector('.era-band[aria-current="true"]');
  if (activeBand && !activeBand.querySelector('.chronology-e01-badge')) {
    activeBand.appendChild(el('span', 'chronology-e01-badge', 'Ère courante'));
  }

  /* E01-09 : bascule « lecture confort ». Le bouton vit dans la barre d'outils
     existante (#atlas-chrono-tools) ; `aria-pressed` est réservé aux bascules
     indépendantes, ce qui est le cas ici (choix unique = aria-current ailleurs). */
  const tools = layout.querySelector('#atlas-chrono-tools');
  if (tools && !document.getElementById(BTN_ID)) {
    const btn = el('button', 'chronology-e01-btn', 'Lecture confort');
    btn.type = 'button';
    btn.id = BTN_ID;
    btn.setAttribute('aria-pressed', comfort ? 'true' : 'false');
    btn.setAttribute('aria-controls', 'atlas-chrono-main');
    btn.addEventListener('click', () => {
      comfort = !comfort;
      btn.setAttribute('aria-pressed', comfort ? 'true' : 'false');
      layout.classList.toggle(COMFORT_CLASS, comfort);
    });
    tools.appendChild(btn);
  }
  /* Le re-rendre recrée le bouton : on réapplique toujours l'état mémorisé. */
  layout.classList.toggle(COMFORT_CLASS, comfort);
});
