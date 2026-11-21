import { register } from './registry.js';

/* Lentille M21 — Grille des dix pays (domaine C : ergonomie & interaction).
 *
 * Rapport : UNIFIED_AUDIT/MONDE/views/M21.md (chantiers M21-01 à M21-10).
 *
 * Périmètre strict : un seul fichier possédé, CSS injecté via
 * css('monde-m21', …). Aucun fichier partagé modifié, zéro réseau, zéro aléa,
 * zéro console.*, aucun sélecteur de test renommé : les dix
 * `.globe-list button.globe-country` restent exactement les mêmes nœuds, avec
 * leur `data-index`, leur `aria-current` et leur gestionnaire de clic d'origine.
 * Cette lentille n'émet aucune annonce live : M20 possède la région `#globe-live`.
 */

const CSS_ID = 'monde-m21';
const PANEL_ID = 'monde-m21-metrics';
const GRID_ID = 'globe-choices';       // id posé par globe.js:384
const EXPECTED = 10;                   // DATASET.meta.countries = 10

/* État module : survit aux re-render de la coque (shell.js) sans fuite.
 * Un seul rAF « one-shot » (jamais de boucle), un seul délégué focusin par
 * grille, un seul écouteur scroll par liste, un seul écouteur resize. */
let latest = null;
let metrics = null;
let gridBound = null;
let listBound = null;
let scrollTop = 0;
let raf = 0;
let resizeHooked = false;

/* M21-01/02/03/05/07/10 : une seule feuille, injectée une fois par cssOnce.
 * Sélectivité `.globe-list …` (0,2,0+) pour gagner sur styles.css et sur les
 * surcharges M17/nav-c2b injectées avant celle-ci dans l'ordre du registre. */
const CSS = `
  /* M21-01 — colonnes adaptatives : 1 à 3 selon la largeur réelle du panneau,
     y compris à zoom 200 % (min(100%, …) empêche tout débordement). */
  .globe-list .globe-choices{
    grid-template-columns:repeat(auto-fit,minmax(min(100%,176px),1fr));
    gap:clamp(7px,.8vw,10px);
    grid-auto-rows:minmax(66px,auto);
  }
  /* M21-07 — la carte remplit sa cellule pour aligner les bas de colonne. */
  .globe-choices li{display:flex;min-width:0}
  .globe-list .globe-country{
    position:relative;height:100%;scroll-margin-block:8px;
    transition:border-color .12s linear,background-color .12s linear;
  }
  /* M21-02 — le nom entier reste lisible, y compris « Royaume-Uni ». */
  .globe-list .globe-country-name{
    white-space:normal;overflow:visible;text-overflow:clip;
    overflow-wrap:anywhere;text-wrap:balance;line-height:1.2;
  }
  /* M21-07 — la couverture est repoussée en bas de carte. */
  .globe-list .globe-country-meta{margin-top:2px}
  .globe-list .globe-country-cover{margin-top:auto}
  /* M21-05 — anneau de focus détaché du voisin par un halo sombre. */
  .globe-list .globe-country:focus-visible{
    outline:3px solid var(--gold-bright);outline-offset:2px;
    box-shadow:0 0 0 5px rgba(8,11,16,.92);z-index:1;
  }
  /* M21-03 — sélection aussi perceptible sans couleur : barre + coche. */
  .globe-list .globe-country[aria-current="true"] .globe-country-top{padding-right:22px}
  .globe-list .globe-country[aria-current="true"]::before{
    content:"";position:absolute;left:0;top:0;bottom:0;width:3px;
    border-radius:9px 0 0 9px;background:var(--gold);
  }
  .globe-list .globe-country[aria-current="true"]::after{
    content:"✓";position:absolute;top:6px;right:7px;
    display:grid;place-items:center;width:18px;height:18px;border-radius:50%;
    background:var(--gold);color:#080b0f;font:700 11px/1 system-ui,sans-serif;
  }
  /* M21-08 — miroir d'audit visuel, hors région live pour ne pas doubler M20. */
  #${PANEL_ID}{
    margin:10px 0 0;padding:6px 8px;border:1px solid var(--line);
    border-radius:6px;background:rgba(8,11,16,.72);
    color:var(--muted-2);font:10px/1.4 ui-monospace,monospace;
    font-variant-numeric:tabular-nums;pointer-events:none;
  }
  @media (max-width:700px){#${PANEL_ID}{font-size:9px}}
  /* M21-10 — aucune transition résiduelle en mouvement réduit. */
  @media (prefers-reduced-motion:reduce){
    .globe-list .globe-country{transition:none!important;animation:none!important}
    .globe-list .globe-country:focus-visible{box-shadow:none!important}
  }
  /* ---- Ajouts UI/UX (M21-11 à M21-15) : CSS strictement additif.
     Aucun nœud, aucun sélecteur de test, aucun gestionnaire modifié.
     Sélectivité .globe-list … (0,2,0+) pour rester au-dessus de styles.css
     et des surcharges M29/M42 injectées plus tard dans le registre. */
  /* M21-11 — lisibilité : numéro en pastille opaque et chiffres tabulaires,
     couverture séparée par un filet + puce (repère structural non coloré). */
  .globe-list .globe-country-num{
    flex:0 0 auto;min-width:22px;padding:1px 0;border-radius:4px;
    background:rgba(230,185,111,.14);opacity:1;
    text-align:center;font-size:10px;font-weight:700;letter-spacing:.04em;
  }
  .globe-list .globe-country-meta,
  .globe-list .globe-country-cover{font-variant-numeric:tabular-nums}
  .globe-list .globe-country-cover{
    display:block;padding-top:5px;border-top:1px solid var(--line);
  }
  .globe-list .globe-country-cover::before{content:"•  ";color:var(--muted)}
  /* M21-12 — espacements : rythme vertical régulier ; espacement latéral
     généreux uniquement hors mobile (M29 garde la main sous 620 px). */
  .globe-list .globe-country{gap:5px}
  @media (min-width:621px){.globe-list .globe-country{padding:11px 12px}}
  /* M21-13 — sélection redondante : épaisseur de bordure s'ajoutant à la
     barre et à la coche ; contraste garanti en couleurs forcées. */
  .globe-list .globe-country[aria-current="true"]{border-width:2px}
  @media (forced-colors:active){
    .globe-list .globe-country[aria-current="true"]::before{background:CanvasText}
    .globe-list .globe-country[aria-current="true"]::after{
      background:Canvas;color:CanvasText;border:1px solid CanvasText;
    }
  }
  /* M21-14 — survol/focus : soulignement du nom (indice non coloré) et
     profondeur, réservés au pointeur fin sans mouvement réduit. */
  .globe-list .globe-country:hover .globe-country-name{
    text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;
  }
  @media (hover:hover) and (prefers-reduced-motion:no-preference){
    .globe-list .globe-country:hover{transform:translateY(-2px);box-shadow:0 6px 14px rgba(0,0,0,.4)}
  }
  .globe-list .globe-country:active{box-shadow:inset 0 0 0 2px var(--gold)}
  /* M21-15 — mobile : pastille et coche compactes, sans chevaucher le nom. */
  @media (max-width:620px){
    .globe-list .globe-country{gap:4px}
    .globe-list .globe-country-num{min-width:20px}
    .globe-list .globe-country[aria-current="true"] .globe-country-top{padding-right:20px}
    .globe-list .globe-country[aria-current="true"]::after{top:5px;right:5px;width:16px;height:16px;font-size:10px}
  }
`;

function gridOf(ctx) {
  const stage = ctx && ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return null;
  return stage.querySelector(`#${GRID_ID}`) || stage.querySelector('.globe-choices');
}

function buttonsOf(grid) {
  if (!grid || typeof grid.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(grid.querySelectorAll('button.globe-country'));
}

function listOf(ctx) {
  const stage = ctx && ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return null;
  return stage.querySelector('.globe-list');
}

function selectedCode(ctx) {
  const api = ctx || {};
  if (api.selected && api.selected.code) return api.selected.code;
  const id = api.state && api.state.countryId;
  if (!id || !Array.isArray(api.countries)) return '';
  const found = api.countries.find((country) => country && country.id === id);
  return found && found.code ? found.code : '';
}

/* M21-06 — le badge numérique suit le tri alphabétique réel (fr) affiché,
 * et non l'index du dataset. data-index reste intact : globe.js s'en sert
 * pour highlight(), et l'ordre du DOM reste celui de M22. */
function renumber(grid, ctx) {
  const countries = ctx && Array.isArray(ctx.countries) ? ctx.countries : [];
  if (!countries.length) return;
  const sorted = countries.slice().sort((a, b) =>
    String(a.name).localeCompare(String(b.name), 'fr'));
  const rankByIndex = new Map();
  sorted.forEach((country, rank) => {
    rankByIndex.set(String(countries.indexOf(country)), rank + 1);
  });
  buttonsOf(grid).forEach((button) => {
    const rank = rankByIndex.get(button.dataset.index);
    const badge = button.querySelector('.globe-country-num');
    if (badge && rank) badge.textContent = String(rank).padStart(2, '0');
  });
}

/* M21-08 — panneau unique, ID stable, garde d'existence, jamais un bouton
 * (le test compte exactement dix `.globe-list button`). */
function ensurePanel(ctx) {
  if (metrics && metrics.isConnected) return metrics;
  let node = document.getElementById(PANEL_ID);
  if (!node) {
    node = typeof ctx.el === 'function'
      ? ctx.el('p', 'monde-m21-metrics', '')
      : document.createElement('p');
    node.id = PANEL_ID;
    node.setAttribute('aria-hidden', 'true');
  }
  const parent = listOf(ctx) || (ctx.stage && ctx.stage.isConnected ? ctx.stage : null);
  if (parent && node.parentNode !== parent) parent.appendChild(node);
  metrics = node;
  return node;
}

function paintMetrics(grid, buttons, focus) {
  if (!metrics || !metrics.isConnected) return;
  let cols = 0;
  if (grid && typeof window !== 'undefined' && window.getComputedStyle) {
    const raw = window.getComputedStyle(grid).gridTemplateColumns;
    cols = raw && raw !== 'none' ? raw.split(/\s+/).filter(Boolean).length : 0;
  }
  const code = selectedCode(latest);
  const focusLabel = focus >= 0 ? String(focus + 1).padStart(2, '0') : '—';
  metrics.textContent = `Grille ${buttons.length}/${EXPECTED} · ${cols} colonne(s) · `
    + `sélection ${code || 'aucune'} · focus ${focusLabel}/${EXPECTED}`;
  metrics.dataset.m21Cards = String(buttons.length);
  metrics.dataset.m21Cols = String(cols);
  metrics.dataset.m21Focus = focus >= 0 ? String(focus + 1) : '';
  metrics.dataset.m21Selected = code;
}

function refreshMetrics() {
  const ctx = latest;
  if (!ctx) return;
  const grid = gridOf(ctx);
  const buttons = buttonsOf(grid);
  const focus = buttons.indexOf(document.activeElement);
  paintMetrics(grid, buttons, focus);
}

/* M21-04 — roving tabindex : le seul onglet de la grille suit le focus réel,
 * y compris après les flèches de globe.js (qui déplacent le focus sans toucher
 * à tabIndex). Délégué unique par nœud <ol>, sans toucher à onChoicesKeyDown. */
function onGridFocus(event) {
  const grid = event.currentTarget;
  const target = event.target && event.target.closest
    ? event.target.closest('button.globe-country') : null;
  const buttons = buttonsOf(grid);
  const index = target ? buttons.indexOf(target) : -1;
  if (index < 0) return;
  buttons.forEach((button) => { button.tabIndex = button === target ? 0 : -1; });
  paintMetrics(grid, buttons, index);
}

function bindRoving(grid) {
  if (!grid || grid === gridBound) return;
  if (gridBound) gridBound.removeEventListener('focusin', onGridFocus);
  grid.addEventListener('focusin', onGridFocus);
  gridBound = grid;
}

/* M21-09 — mémorisation du scroll, un seul écouteur passif par liste. */
function onListScroll(event) {
  scrollTop = event.currentTarget.scrollTop;
}

function bindScroll(ctx) {
  const list = listOf(ctx);
  if (!list || list === listBound) return;
  if (listBound) listBound.removeEventListener('scroll', onListScroll);
  list.addEventListener('scroll', onListScroll, { passive: true });
  listBound = list;
}

/* M21-08/09 — unique frame différée : restauration du scroll puis lecture des
 * métriques. Jamais de boucle : raf repasse à 0 dès la frame exécutée. */
function schedule() {
  if (raf || (typeof document !== 'undefined' && document.hidden)) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const ctx = latest;
    if (!ctx) return;
    const list = listOf(ctx);
    if (list && scrollTop > 0) {
      const max = Math.max(0, list.scrollHeight - list.clientHeight);
      list.scrollTop = Math.min(scrollTop, max);
    }
    refreshMetrics();
  });
}

register('M21', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function') return;
  latest = ctx;                         // références fraîches à chaque rendu
  ctx.css(CSS_ID, CSS);

  const grid = gridOf(ctx);
  ensurePanel(ctx);
  if (grid) {
    renumber(grid, ctx);                // M21-06
    bindRoving(grid);                   // M21-04
  }
  bindScroll(ctx);                      // M21-09
  refreshMetrics();                     // M21-08 : état lisible sans frame
  if (!resizeHooked) {                  // M21-01 : recalcul des colonnes
    resizeHooked = true;
    window.addEventListener('resize', schedule, { passive: true });
  }
  schedule();                           // M21-09 : restauration après insertion
});
