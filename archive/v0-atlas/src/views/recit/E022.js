import { register } from './registry.js';

/* Lentille E022 — Hiérarchie visuelle et informationnelle, vue Récit.
 *
 * Fichier possédé : src/views/recit/E022.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/RECIT/views/E022.md (E022-01 à E022-10).
 *
 * La lentille ne supprime aucun nœud et ne réécrit aucun texte : elle rééquilibre
 * l'échelle typographique produite par recit.js, regroupe les métadonnées en
 * niveau secondaire, distingue les étiquettes tertiaires, et ajoute un marqueur
 * de forme au point courant pour que son état ne dépende pas de la seule couleur.
 * Tout est piloté par une feuille unique injectée via ctx.css('recit-e022', …).
 *
 * Garde-fous : une seule feuille, une seule clé, un seul register, ids créés
 * préfixés « e022- » et uniques, classes préfixées « recit-e022- ». Zéro réseau,
 * zéro console, zéro Math.random, zéro minuteur, zéro canvas, zéro boucle rAF.
 * Les nœuds sont retrouvés à partir du contexte courant (le stage est reconstruit
 * à chaque rendu) : aucune référence n'est mémorisée entre deux rendus.
 *
 * Note _diagnostics.js : les ids /^e\d\d/ sont marqués puis masqués par défaut,
 * mais seulement quand leur parent direct est body/stage/layout. Le marqueur
 * créé ici vit dans un bouton du fil (parent = .recit-thread-item), il échappe
 * donc au marquage ; la feuille elle-même vit dans <head>.
 */

const STYLE_ID = 'recit-e022';
const GLOBAL_KEY = 'VECTEMPOREL_E022';
const VERSION = '1.0.0';
const SCOPE = 'recit-e022-scope';
const STILL = 'recit-e022-still';
const MARK_ID = 'e022-current-mark';

/* E022-01 à E022-09 : une seule feuille. Toutes les règles sont portées par
   `.recit-layout.recit-e022-scope` (spécificité stable 0-2-0 et plus) afin de
   rester dominantes quel que soit l'ordre d'injection des autres lentilles. */
const CSS = `
/* E022-01 — primauté typographique du point (titre unique). */
.recit-layout.recit-e022-scope #recit-point-title.recit-title{
  text-transform:none;letter-spacing:-.012em;
  font-size:clamp(22px,2.1vw,32px);font-weight:600;line-height:1.16;
  color:var(--ink);text-wrap:balance;overflow-wrap:anywhere;
  margin:6px 0 10px;
}

/* E022-02 — chaîne sur-titre → titre → contexte, échelle descendante. */
.recit-layout.recit-e022-scope .view-kicker{
  display:block;font-size:10px;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;color:var(--gold-bright);
  padding-left:8px;border-left:3px solid var(--gold);line-height:1.3;
}
.recit-layout.recit-e022-scope #recit-context.recit-context{
  font-size:14px;line-height:1.6;color:var(--muted);
  padding-left:12px;border-left:2px solid var(--line-strong);
  margin:0 0 14px;
}

/* E022-03 — métadonnées regroupées en niveau secondaire. */
.recit-layout.recit-e022-scope .recit-meta{
  font-size:10px;color:var(--muted);line-height:1.5;
}
.recit-layout.recit-e022-scope .recit-timing{
  font-size:10px;color:var(--muted-2);margin:4px 0 12px;
}
.recit-layout.recit-e022-scope .recit-meta .recit-conf{font-size:10px}

/* E022-04 — plancher de 10 px sur tout texte porteur d'information. */
.recit-layout.recit-e022-scope .recit-timing,
.recit-layout.recit-e022-scope .recit-conf,
.recit-layout.recit-e022-scope .recit-thread-title,
.recit-layout.recit-e022-scope .recit-thread-item,
.recit-layout.recit-e022-scope .thread-kind,
.recit-layout.recit-e022-scope .recit-legend,
.recit-layout.recit-e022-scope .recit-legend p,
.recit-layout.recit-e022-scope .recit-media-credit,
.recit-layout.recit-e022-scope .recit-trace,
.recit-layout.recit-e022-scope .c3a-status,
.recit-layout.recit-e022-scope .c3a-group-label,
.recit-layout.recit-e022-scope .c3a-filter,
.recit-layout.recit-e022-scope .c3a-search,
.recit-layout.recit-e022-scope .c3a-reset,
.recit-layout.recit-e022-scope .recit-sources{font-size:10px}

/* E022-05 — marqueur de forme du point courant (état non porté par la couleur). */
.recit-layout.recit-e022-scope .recit-e022-current{
  display:inline-flex;align-items:center;
  margin-right:6px;padding:1px 6px;border-radius:4px;
  font-size:10px;font-weight:700;letter-spacing:.04em;
  color:var(--gold-bright);background:rgba(230,185,111,.14);
  white-space:nowrap;
}
.recit-layout.recit-e022-scope .recit-thread-item[aria-current="step"]{
  border-left:3px solid var(--gold);
}

/* E022-06 — étiquettes de type et de certitude comme métadonnées tertiaires. */
.recit-layout.recit-e022-scope .thread-kind{
  display:inline-block;margin-right:6px;padding:1px 6px;
  border:1px solid var(--line);border-radius:4px;
  font-size:10px;text-transform:uppercase;letter-spacing:.06em;
  color:var(--muted-2);background:rgba(255,255,255,.04);
}
.recit-layout.recit-e022-scope .recit-conf{
  border:1px solid var(--line-strong);border-radius:999px;font-size:10px;
}

/* E022-07 — traçabilité érigée en niveau « preuve » distinct. */
.recit-layout.recit-e022-scope .recit-trace{
  margin-top:14px;padding:8px 10px;
  border-left:3px solid var(--line-strong);border-radius:0 6px 6px 0;
  background:rgba(255,255,255,.03);font-size:10px;
}
.recit-layout.recit-e022-scope .recit-trace summary{font-weight:700;color:var(--muted)}
.recit-layout.recit-e022-scope .recit-trace p,
.recit-layout.recit-e022-scope .recit-sources{
  font-size:10px;line-height:1.5;color:var(--muted-2);
}

/* E022-08 — hiérarchie des actions : primaire vs secondaire (sans changer l'ordre). */
.recit-layout.recit-e022-scope .recit-actions button[data-fk="c3a-prev"],
.recit-layout.recit-e022-scope .recit-actions button[data-fk="c3a-next"],
.recit-layout.recit-e022-scope .recit-actions button[data-fk="c3a-play"]{
  min-height:40px;font-weight:600;border-color:var(--gold);color:var(--gold-bright);
}
.recit-layout.recit-e022-scope .recit-actions button[data-fk="c3a-restart"],
.recit-layout.recit-e022-scope .recit-actions button[data-fk="c3a-next-event"],
.recit-layout.recit-e022-scope .recit-actions button[data-fk="c3a-chrono"]{
  min-height:36px;font-weight:400;color:var(--muted);
}

/* E022-09 — l'échelle survit au seuil d'empilement. */
@media (max-width:620px){
  .recit-layout.recit-e022-scope #recit-point-title.recit-title{font-size:clamp(22px,6.5vw,28px)}
  .recit-layout.recit-e022-scope #recit-context.recit-context{font-size:14px}
  .recit-layout.recit-e022-scope .recit-actions{flex-wrap:wrap;gap:8px}
  .recit-layout.recit-e022-scope .recit-actions button{min-height:40px}
}
@media (prefers-reduced-motion:reduce){
  .recit-layout.recit-e022-scope .recit-e022-current{transition:none}
}
.recit-layout.recit-e022-still .recit-e022-current{transition:none}
@media (forced-colors:active){
  .recit-layout.recit-e022-scope .recit-e022-current,
  .recit-layout.recit-e022-scope .thread-kind{border:1px solid CanvasText;color:CanvasText}
}
`;

function makeEl(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function injectCss(ctx) {
  if (ctx && typeof ctx.css === 'function') {
    ctx.css(STYLE_ID, CSS);
    return;
  }
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/* Le stage est reconstruit à chaque rendu : le layout courant est toujours
   retrouvé depuis le contexte, jamais mémorisé. */
function currentLayout(ctx) {
  if (ctx && ctx.layout && ctx.layout.classList) return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') {
    const found = ctx.stage.querySelector('.recit-layout');
    if (found) return found;
  }
  if (typeof document !== 'undefined' && document.querySelector) {
    return document.querySelector('.recit-layout');
  }
  return null;
}

/* E022-05 : une seule pastille sur l'item courant, idempotente si apply est
   rejoué sur un DOM non reconstruit. L'id n'est posé que sur le premier marqueur
   pour rester unique même si, par anomalie, plusieurs items portent aria-current. */
function markCurrent(ctx, layout) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  const items = layout.querySelectorAll('.recit-thread-item[aria-current="step"]');
  let idPlaced = false;
  Array.from(items).forEach((item) => {
    if (item.querySelector('.recit-e022-current')) return;
    const badge = makeEl(ctx, 'span', 'recit-e022-current', '▸ en cours');
    badge.setAttribute('aria-hidden', 'true');
    if (!idPlaced && typeof document !== 'undefined' && !document.getElementById(MARK_ID)) {
      badge.id = MARK_ID;
      idPlaced = true;
    }
    item.insertBefore(badge, item.firstChild);
  });
}

function fontOf(node) {
  if (!node || typeof window === 'undefined' || !window.getComputedStyle) return 0;
  const value = parseFloat(window.getComputedStyle(node).fontSize);
  return Number.isFinite(value) ? value : 0;
}

/* E022-10 : observabilité en lecture seule. Tout est recalculé depuis le DOM
   courant : l'API ne mémorise aucun nœud et reste valide après chaque rendu. */
function audit() {
  const layout = (typeof document !== 'undefined' && document.querySelector)
    ? document.querySelector('.recit-layout') : null;
  const first = (root, selector) => (root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null);
  const count = (root, selector) => (root && typeof root.querySelectorAll === 'function'
    ? root.querySelectorAll(selector).length : 0);

  const title = first(layout, '#recit-point-title');
  const kicker = first(layout, '.view-kicker');
  const context = first(layout, '#recit-context');
  const meta = first(layout, '.recit-meta');
  const timing = first(layout, '.recit-timing');
  const conf = first(layout, '.recit-conf');
  const legend = first(layout, '.recit-legend');
  const kind = first(layout, '.thread-kind');

  const levels = {
    title: fontOf(title), kicker: fontOf(kicker), context: fontOf(context),
    meta: fontOf(meta), timing: fontOf(timing), conf: fontOf(conf),
    legend: fontOf(legend), kind: fontOf(kind),
  };
  const floorSelectors = [
    '.recit-timing', '.recit-conf', '.recit-thread-title', '.recit-thread-item',
    '.thread-kind', '.recit-legend', '.recit-legend p', '.recit-media-credit',
    '.recit-trace', '.c3a-status', '.c3a-group-label', '.c3a-filter',
    '.c3a-search', '.recit-sources',
  ];
  const floorSizes = floorSelectors
    .map((selector) => fontOf(first(layout, selector)))
    .filter((size) => size > 0);
  const minInformative = floorSizes.length ? Math.min(...floorSizes) : 0;

  const order = levels.title > 0 && levels.context > 0 && levels.meta > 0
    && levels.title > levels.context && levels.context >= levels.meta;
  const markers = count(layout, '.recit-e022-current');
  const scope = Boolean(layout && layout.classList && layout.classList.contains(SCOPE));
  const still = Boolean(layout && layout.classList && layout.classList.contains(STILL));
  const distinct = Boolean(title && getComputedStyleSafe(title, 'textTransform') === 'none');

  const checks = {
    'E022-01': distinct && levels.title >= 22,
    'E022-02': levels.kicker >= 10 && (!levels.context || levels.title > levels.context),
    'E022-03': levels.meta >= 10 && levels.timing >= 10,
    'E022-04': minInformative >= 10,
    'E022-05': markers >= 1,
    'E022-06': levels.kind >= 10 && levels.kind <= levels.title,
    'E022-07': Boolean(first(layout, '.recit-trace, .recit-sources')),
    'E022-08': Boolean(first(layout, '.recit-actions button[data-fk="c3a-prev"]')),
    'E022-09': scope,
    'E022-10': Boolean(typeof window !== 'undefined' && window[GLOBAL_KEY]
      && window[GLOBAL_KEY].version === VERSION),
  };
  const passed = Object.values(checks).filter(Boolean).length;

  return {
    version: VERSION,
    styleId: STYLE_ID,
    levels,
    minInformative,
    order,
    markers,
    scope,
    still,
    checks,
    passed,
  };
}

function getComputedStyleSafe(node, property) {
  if (!node || typeof window === 'undefined' || !window.getComputedStyle) return '';
  try { return window.getComputedStyle(node)[property] || ''; }
  catch { return ''; }
}

function exposeApi() {
  if (typeof window === 'undefined') return;
  const current = window[GLOBAL_KEY];
  if (current && current.version === VERSION) return;
  window[GLOBAL_KEY] = Object.freeze({
    version: VERSION,
    styleId: STYLE_ID,
    audit,
  });
}

register('E022', (ctx) => {
  if (!ctx || !ctx.stage) return;
  injectCss(ctx);
  const layout = currentLayout(ctx);
  if (!layout || !layout.classList) return;
  layout.classList.add(SCOPE);

  if (typeof ctx.reducedMotion === 'function') {
    let still = false;
    try { still = ctx.reducedMotion(); }
    catch { still = false; }
    if (still) layout.classList.add(STILL);
  }

  markCurrent(ctx, layout);
  exposeApi();
});
