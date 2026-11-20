import { register } from './registry.js';

/* Lentille E051 — vue CHRONOLOGIE : adaptation mobile et points de rupture
 * responsifs. Strictement additive : aucun fichier partagé modifié, aucune
 * règle de styles.css réécrite, aucun gestionnaire global de touche volé.
 *
 * E051-01 détection des ruptures · E051-02 feuille unique ciblée
 * E051-03 cibles tactiles · E051-04 liste monoc colonne anti-débordement
 * E051-05 scroll unique sur mobile · E051-06 outils de recherche fluides
 * E051-07 typographie lisible · E051-08 bandes d'ères en grille
 * E051-09 mouvement réduit · E051-10 re-render safe
 *
 * Zéro journalisation, zéro réseau, zéro aléa, aucune boucle d'animation,
 * aucun timer : les seules réactions sont des événements `matchMedia`.
 *
 * Les nœuds visibles vivent dans `.chronology-main` (jamais en enfant direct
 * de `body`, `stage` ou `layout`, cf. _diagnostics.js:72) et portent le
 * préfixe `e051-`. L'identifiant `chronology-e051` est réservé au <style>
 * injecté dans <head> par cssOnce (registry.js:13-19).
 */

const CSS_ID = 'chronology-e051';
const PANEL_ID = 'e051-panel';
const READOUT_ID = 'e051-readout';
const MOBILE_QUERY = '(max-width: 620px)';
const TABLET_QUERY = '(max-width: 1000px)';
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const CHANTIERS = Object.freeze([
  'E051-01', 'E051-02', 'E051-03', 'E051-04', 'E051-05',
  'E051-06', 'E051-07', 'E051-08', 'E051-09', 'E051-10',
]);

/* E051-02 : une seule feuille, injectée une fois. Toutes les règles sont
   ciblées par `.chronology-layout[data-e051="1"]` (spécificité 0,2,0) pour
   l'emporter sur les règles de chronology.js:37-91 et styles.css:194-196 sans
   toucher à ces fichiers. Les deux seuils (1000 px, 620 px) reprennent ceux de
   styles.css:312 et :333 : aucune nouvelle rupture n'est introduite. */
const CSS = `
.chronology-layout[data-e051="1"]{min-width:0}
.chronology-layout[data-e051="1"] .chronology-main,
.chronology-layout[data-e051="1"] .chronology-aside{min-width:0;max-width:100%}
.chronology-layout[data-e051="1"] .event-list,
.chronology-layout[data-e051="1"] .atlas-chrono-tools{min-width:0;max-width:100%}
.chronology-layout[data-e051="1"] .event-card strong,
.chronology-layout[data-e051="1"] .event-subtitle,
.chronology-layout[data-e051="1"] .atlas-chrono-status,
.chronology-layout[data-e051="1"] .nav-c2-progress,
.chronology-layout[data-e051="1"] .atlas-chrono-era-range{overflow-wrap:anywhere}
.e051-panel{
  margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(8,11,16,.5);color:var(--muted);
  font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}
.e051-readout{margin:0}
.e051-sr-only{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
.chronology-layout[data-e051="1"] :is(button,input,[tabindex]):focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
@media (max-width:1000px){
  .chronology-layout[data-e051="1"]{grid-template-rows:minmax(0,1fr) minmax(0,45%)}
  .chronology-layout[data-e051="1"] .chronology-aside{padding:14px 16px 24px}
  .chronology-layout[data-e051="1"] .event-list{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
  .chronology-layout[data-e051="1"] .atlas-chrono-tools{gap:10px}
}
@media (max-width:620px){
  .chronology-layout[data-e051="1"]{
    display:block;height:100%;overflow-x:hidden;overflow-y:auto;
    scroll-behavior:auto;-webkit-overflow-scrolling:touch;
  }
  .chronology-layout[data-e051="1"] .chronology-main,
  .chronology-layout[data-e051="1"] .chronology-aside{
    overflow:visible;padding:16px 12px 24px;
  }
  .chronology-layout[data-e051="1"] .event-list{grid-template-columns:minmax(0,1fr);gap:10px}
  .chronology-layout[data-e051="1"] .event-card{min-height:44px}
  .chronology-layout[data-e051="1"] .era-band.atlas-chrono-band{min-height:44px}
  .chronology-layout[data-e051="1"] .atlas-chrono-era-list > li{flex:1 1 45%}
  .chronology-layout[data-e051="1"] .atlas-chrono-tools{
    flex-direction:column;align-items:stretch;gap:8px;
  }
  .chronology-layout[data-e051="1"] .atlas-chrono-search{
    width:100%;min-width:0;box-sizing:border-box;min-height:44px;font-size:16px;
  }
  .chronology-layout[data-e051="1"] .atlas-chrono-tag,
  .chronology-layout[data-e051="1"] .atlas-chrono-tags .atlas-chrono-tag{
    min-height:36px;padding:6px 10px;font-size:10px;
  }
  .chronology-layout[data-e051="1"] .aside-actions button{
    flex:1 1 0;min-height:44px;padding:8px 6px;font-size:10px;
  }
  .chronology-layout[data-e051="1"] :is(button,input){
    touch-action:manipulation;
  }
  .chronology-layout[data-e051="1"] .atlas-chrono-h1{font-size:20px}
  .chronology-layout[data-e051="1"] .view-lede{font-size:12px}
  .chronology-layout[data-e051="1"] .atlas-chrono-hint,
  .chronology-layout[data-e051="1"] .atlas-chrono-card-era{font-size:10px}
  .chronology-layout[data-e051="1"] .atlas-chrono-status,
  .chronology-layout[data-e051="1"] .nav-c2-progress{font-size:10px;line-height:1.5}
  .chronology-layout[data-e051="1"] .event-card strong{font-size:18px}
  .chronology-layout[data-e051="1"] .event-subtitle{font-size:11px}
  .chronology-layout[data-e051="1"] .aside-title{font-size:26px}
  .chronology-layout[data-e051="1"] .aside-summary{font-size:15px}
  .chronology-layout[data-e051="1"] .point p{font-size:12px;line-height:1.55}
  .chronology-layout[data-e051="1"] .point-sources{font-size:10px}
  .e051-panel{font-size:10px}
}
@media (prefers-reduced-motion:reduce){
  .chronology-layout[data-e051="1"],
  .chronology-layout[data-e051="1"] *{scroll-behavior:auto!important;transition:none!important;animation:none!important}
}`;

/* État module : réinterrogé à partir du dernier ctx, jamais une capture
   périmée par la reconstruction du stage (chronology.js:207-212, shell.js). */
let latest = null;
let applies = 0;
let mediaBound = false;
let mobileMql = null;
let tabletMql = null;
let motionMql = null;

function matches(query) {
  try { return Boolean(query && query.matches); }
  catch { return false; }
}

function setData(node, key, value) {
  if (node && node.dataset && node.dataset[key] !== value) node.dataset[key] = value;
}

/* E051-10 : le panneau est réutilisé s'il existe déjà, déplacé sinon, et
   toujours inséré dans .chronology-main — jamais en enfant direct du stage. */
function ensurePanel(main) {
  if (!main || typeof latest.el !== 'function') return null;
  let panel = main.querySelector(`#${PANEL_ID}`);
  if (!panel) {
    panel = main.ownerDocument ? main.ownerDocument.getElementById(PANEL_ID) : null;
    if (panel && panel.isConnected) main.appendChild(panel);
  }
  if (!panel) {
    panel = latest.el('div', 'e051-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Diagnostic de l’adaptation mobile de la Chronologie');
  }
  let readout = panel.querySelector(`#${READOUT_ID}`);
  if (!readout) {
    readout = latest.el('p', 'e051-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    panel.appendChild(readout);
  }
  const status = main.querySelector('#atlas-chrono-status');
  if (status && status.nextElementSibling !== panel) status.after(panel);
  else if (!status && main.firstElementChild !== panel) main.prepend(panel);
  return panel;
}

/* E051-01 : trois requêtes média, un seul enregistrement d'écouteur par
   requête (garde module `mediaBound`), avec repli `addListener` pour les
   moteurs anciens. Aucun timer, aucune boucle rAF : l'état est recalculé
   uniquement au rendu et aux changements de rupture. */
function onMediaChange() {
  update();
}

function bindMedia() {
  if (mediaBound || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  mediaBound = true;
  try {
    mobileMql = window.matchMedia(MOBILE_QUERY);
    tabletMql = window.matchMedia(TABLET_QUERY);
    motionMql = window.matchMedia(MOTION_QUERY);
  } catch {
    mobileMql = tabletMql = motionMql = null;
  }
  [mobileMql, tabletMql, motionMql].forEach((query) => {
    if (!query) return;
    try {
      if (typeof query.addEventListener === 'function') query.addEventListener('change', onMediaChange);
      else if (typeof query.addListener === 'function') query.addListener(onMediaChange);
    } catch {
      /* Un moteur qui refuse l'écoute garde le recalcul au rendu. */
    }
  });
}

/* E051-01, E051-03, E051-09 : mise à jour déclarative du DOM, sans écrire
   d'information seulement dans la couleur. Le readout est le miroir chiffré
   des ruptures et de la préférence de mouvement. */
function update() {
  if (!latest || !latest.stage) return;
  const layout = latest.stage.querySelector('.chronology-layout') || latest.layout;
  if (!layout || !layout.isConnected) return;
  const main = layout.querySelector('.chronology-main') || layout;

  const mobile = matches(mobileMql);
  const tablet = matches(tabletMql);
  const reduced = typeof latest.reducedMotion === 'function'
    ? Boolean(latest.reducedMotion())
    : matches(motionMql);
  const breakpoint = mobile ? 'mobile' : tablet ? 'tablette' : 'large';
  const threshold = mobile ? '620' : tablet ? '1000' : 'aucun';

  setData(layout, 'e051', '1');
  setData(layout, 'e051Bp', breakpoint);
  setData(layout, 'e051Reduced', reduced ? '1' : '0');

  const cards = layout.querySelectorAll('.event-card').length;
  const bands = layout.querySelectorAll('.era-band').length;
  setData(layout, 'e051Cards', String(cards));
  setData(layout, 'e051Bands', String(bands));

  const panel = ensurePanel(main);
  if (!panel) return;
  const readout = panel.querySelector(`#${READOUT_ID}`);
  if (!readout) return;
  const width = typeof window === 'undefined' ? 0 : Math.max(0, Math.floor(window.innerWidth || 0));
  const target = mobile ? 44 : 36;
  const text = `Adaptation mobile E051 : ${applies} rendu(s) · fenêtre ${width} px · rupture ${breakpoint} (seuil ${threshold} px) · ${cards} carte(s) et ${bands} bande(s) · cible tactile ${target} px pour une référence de 44 px · mouvement réduit : ${reduced ? 'oui' : 'non'}.`;
  if (readout.textContent !== text) readout.textContent = text;
}

/* Surface de vérification en lecture seule, sans effet sur le rendu. */
if (typeof window !== 'undefined') {
  window.VECTEMPOREL_E051 = Object.freeze({
    chantiers: () => CHANTIERS.slice(),
    state: () => Object.freeze({
      applies,
      css: typeof document !== 'undefined' && Boolean(document.getElementById(CSS_ID)),
      mediaBound,
      panels: typeof document === 'undefined' ? 0 : document.querySelectorAll(`#${PANEL_ID}`).length,
      readouts: typeof document === 'undefined' ? 0 : document.querySelectorAll(`#${READOUT_ID}`).length,
      breakpoint: typeof document === 'undefined' ? '' : (document.querySelector('.chronology-layout')?.dataset.e051Bp || ''),
    }),
  });
}

register('E051', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.el !== 'function') return;
  latest = ctx;
  applies += 1;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  const layout = ctx.layout || ctx.stage.querySelector('.chronology-layout');
  if (!layout) return;
  bindMedia();
  update();
});
