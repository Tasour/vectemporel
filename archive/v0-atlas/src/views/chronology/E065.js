/* Lentille E065 — typographie, hiérarchie visuelle et mesure de lecture.
   Dix chantiers E065-01..E065-10, tous implémentés ici. Un seul register, un
   seul ctx.css, aucun fichier partagé modifié. Zéro journalisation, zéro
   réseau, zéro tirage au sort, zéro boucle d'animation, zéro timer. Tout le
   texte est en français.

   La coque reconstruit le DOM à chaque rendu (chronology.js:30-33, 92, 537-539) :
   les nœuds sont donc réutilisés par ID avec garde d'existence, et l'état de
   la bascule vit dans une variable de module, pas dans le DOM détruit. */
import { register } from './registry.js';

const CSS_ID = 'chronology-e065';
const ROOT_CLASS = 'e065-type';
const COMFORT_CLASS = 'e065-comfort';
const PANEL_ID = 'e065-type-panel';
const BUTTON_ID = 'e065-type-btn';
const READOUT_ID = 'e065-type-readout';

let comfort = false;
let currentLayout = null;
let currentReadout = null;

const CSS = `
.chronology-layout.e065-type {
  --e065-xs:11px; --e065-sm:12px; --e065-base:14px;
  --e065-md:16px; --e065-lg:18px; --e065-xl:22px; --e065-2xl:28px;
  --e065-measure:68ch;
}
.chronology-layout.e065-type.e065-comfort {
  --e065-xs:12px; --e065-sm:13px; --e065-base:16px;
  --e065-lg:20px; --e065-xl:24px; --e065-2xl:30px;
  --e065-measure:60ch;
}
/* E065-01 — échelle : le h1 de la vue redevient le plus grand titre, devant le
   h2 de la fiche (30 px dans styles.css:220) et le h3 des points (14 px,
   chronology.js:66). */
.chronology-layout.e065-type .atlas-chrono-h1 { margin:0 0 8px; font-size:var(--e065-2xl); font-weight:450; line-height:1.15; letter-spacing:-.02em; }
.chronology-layout.e065-type .aside-title { margin:6px 0 8px; font-size:var(--e065-xl); font-weight:450; line-height:1.18; }
.chronology-layout.e065-type .atlas-chrono-section-title { margin:18px 0 6px; font-size:var(--e065-lg); line-height:1.3; }
.chronology-layout.e065-type .event-card strong { padding:0 10px; font-size:var(--e065-md); line-height:1.25; }
/* E065-02 — plancher : aucun texte lisible ne descend sous 11 px. */
.chronology-layout.e065-type .view-lede,
.chronology-layout.e065-type .aside-summary { font-size:var(--e065-base); line-height:1.6; }
.chronology-layout.e065-type .point p,
.chronology-layout.e065-type .nav-c2-trail-list { font-size:var(--e065-sm); line-height:1.55; }
.chronology-layout.e065-type .atlas-chrono-hint,
.chronology-layout.e065-type .atlas-chrono-status,
.chronology-layout.e065-type .nav-c2-here,
.chronology-layout.e065-type .nav-c2-progress,
.chronology-layout.e065-type .nav-c2-back,
.chronology-layout.e065-type .nav-c2-point-rank,
.chronology-layout.e065-type .atlas-chrono-era-range,
.chronology-layout.e065-type .atlas-chrono-card-era,
.chronology-layout.e065-type .atlas-chrono-tags,
.chronology-layout.e065-type .atlas-chrono-count,
.chronology-layout.e065-type .point-sources,
.chronology-layout.e065-type .aside-credit,
.chronology-layout.e065-type .aside-kicker,
.chronology-layout.e065-type .aside-year,
.chronology-layout.e065-type .aside-actions button,
.chronology-layout.e065-type .event-year,
.chronology-layout.e065-type .event-subtitle,
.chronology-layout.e065-type .atlas-chrono-empty,
.chronology-layout.e065-type .atlas-chrono-empty button,
.chronology-layout.e065-type .point-kind,
.chronology-layout.e065-type .confidence { font-size:var(--e065-xs); line-height:1.5; }
.chronology-layout.e065-type .atlas-chrono-tag { font-size:var(--e065-xs); line-height:1.4; }
/* E065-03 — mesure de lecture : 60 à 75 caractères par ligne, jamais la
   largeur pleine de la colonne de 1fr (chronology.js:214). */
.chronology-layout.e065-type .view-lede,
.chronology-layout.e065-type .atlas-chrono-status,
.chronology-layout.e065-type .nav-c2-progress,
.chronology-layout.e065-type .aside-summary,
.chronology-layout.e065-type .point p,
.chronology-layout.e065-type .atlas-chrono-empty { max-width:var(--e065-measure); }
/* E065-04 — rythme vertical : on corrige les interlignages serrés (1,1 et
   1,05) et les marges irrégulières du lede et du statut. */
.chronology-layout.e065-type .view-lede { margin:8px 0 14px; }
.chronology-layout.e065-type .atlas-chrono-status { min-height:18px; margin:0 0 12px; }
.chronology-layout.e065-type .event-subtitle { margin-top:2px; line-height:1.45; }
.chronology-layout.e065-type .point { padding:12px 0; }
.chronology-layout.e065-type .point-sources { margin-top:6px; line-height:1.5; }
/* E065-05 — les années, rangs et compteurs restent-alignés sur une même
   colonne (la recherche et le statut les écrivent en texte, chronology.js:254,
   266, 344, 392). */
.chronology-layout.e065-type .atlas-chrono-status,
.chronology-layout.e065-type .nav-c2-progress,
.chronology-layout.e065-type .nav-c2-point-rank,
.chronology-layout.e065-type .atlas-chrono-count,
.chronology-layout.e065-type .atlas-chrono-era-range,
.chronology-layout.e065-type .event-year,
.chronology-layout.e065-type .aside-kicker,
.chronology-layout.e065-type .point-head { font-variant-numeric:tabular-nums; }
/* E065-07 — l'état courant et le type de point ne reposent pas sur la seule
   couleur (chronology.js:45, styles.css:231-234). */
.chronology-layout.e065-type .era-band[aria-current="true"] { font-weight:600; text-decoration:underline; text-underline-offset:3px; }
.chronology-layout.e065-type .point-kind.is-audit::before { content:'◆ '; }
.chronology-layout.e065-type .point-kind.is-figure::before { content:'▲ '; }
.chronology-layout.e065-type .point-kind.is-lieu::before { content:'● '; }
/* E065-08 — cibles tactiles et focus : 30/24/32 px dans chronology.js:54,65,79. */
.chronology-layout.e065-type .atlas-chrono-tag,
.chronology-layout.e065-type .atlas-chrono-tags .atlas-chrono-tag,
.chronology-layout.e065-type .nav-c2-back,
.chronology-layout.e065-type .atlas-chrono-empty button,
.chronology-layout.e065-type .aside-actions button { min-height:36px; }
.chronology-layout.e065-type button:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
/* E065-09 et E065-10 — panneau d'audit, placé en haut de la colonne de lecture. */
.e065-type-panel { margin:0 0 12px; padding:8px 10px; border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.02); }
.e065-type-title { margin:0 0 4px; color:var(--gold); font-size:var(--e065-xs,11px); font-weight:600; letter-spacing:.08em; text-transform:uppercase; }
.e065-type-readout { margin:0 0 6px; color:var(--muted); font-size:var(--e065-xs,11px); line-height:1.5; font-variant-numeric:tabular-nums; }
.e065-type-btn { min-height:36px; padding:4px 10px; border:1px solid var(--line); border-radius:8px; background:transparent; color:var(--gold-bright); font-size:var(--e065-xs,11px); cursor:pointer; }
.e065-type-btn[aria-pressed="true"] { border-color:var(--gold); background:rgba(230,185,111,.1); }
.e065-type-btn:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
@media (max-width:620px) {
  .chronology-layout.e065-type { --e065-measure:52ch; }
  .chronology-layout.e065-type .atlas-chrono-hint { font-size:var(--e065-xs); }
}`;

/* Garde d'existence : réutilise le nœud d'un rendu précédent, le déplace dans
   le nouveau parent, et ne crée qu'un seul élément par ID e065. */
function ensureNode(ctx, parent, id, tag, className, text) {
  let node = document.getElementById(id);
  if (!node || node.tagName.toLowerCase() !== tag.toLowerCase()) {
    node = ctx.el(tag, className, text);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.insertBefore(node, parent.firstChild);
  return node;
}

function fontSizeOf(node) {
  if (!node) return 0;
  const value = parseFloat(getComputedStyle(node).fontSize);
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

/* Mesure estimée en caractères : avance moyenne de 0,5 em pour les piles
   sans/serif utilisées par la vue (styles.css:17-18). */
function measureOf(node) {
  if (!node) return 0;
  const width = node.getBoundingClientRect().width;
  const size = parseFloat(getComputedStyle(node).fontSize) || 14;
  return width > 0 ? Math.round(width / (size * 0.5)) : 0;
}

function belowFloorCount(layout) {
  const selector = '.view-lede, .atlas-chrono-status, .nav-c2-progress, .point p, .aside-summary, '
    + '.atlas-chrono-tag, .nav-c2-back, .atlas-chrono-hint, .aside-kicker, .event-year, .event-subtitle';
  let count = 0;
  layout.querySelectorAll(selector).forEach((node) => {
    const size = parseFloat(getComputedStyle(node).fontSize);
    if (Number.isFinite(size) && size < 11) count += 1;
  });
  return count;
}

/* Une seule mesure, à la demande (aucun timer, aucune boucle rAF). */
function audit(ctx) {
  const layout = currentLayout;
  if (!layout || !currentReadout) return;
  const h1 = fontSizeOf(document.getElementById('atlas-chrono-title'));
  const h2 = fontSizeOf(document.getElementById('atlas-chrono-event-title'));
  const h3 = fontSizeOf(document.getElementById('atlas-chrono-points-title'));
  const measure = measureOf(document.querySelector('.chronology-layout.e065-type .atlas-chrono-status'));
  const below = belowFloorCount(layout);
  const reduced = ctx.reducedMotion() ? 'oui' : 'non';
  const hierarchy = h2 > 0 && h3 > 0 ? (h1 > h2 && h2 > h3 ? 'ok' : 'inversée') : 'partielle';

  layout.dataset.e065Scale = `${h1}/${h2}/${h3}`;
  layout.dataset.e065Measure = String(measure);
  layout.dataset.e065BelowFloor = String(below);
  layout.dataset.e065Hierarchy = hierarchy;
  layout.dataset.e065Comfort = comfort ? '1' : '0';
  layout.dataset.e065Reduced = reduced === 'oui' ? '1' : '0';

  const detail = hierarchy === 'partielle'
    ? 'titre de fiche absent'
    : `hiérarchie ${h1} > ${h2} > ${h3} px`;
  currentReadout.textContent = `Échelle : ${detail}. Mesure ≈ ${measure} caractères. `
    + `${below} texte(s) sous 11 px. Mouvement réduit : ${reduced}. `
    + `${comfort ? 'Lecture confortable activée.' : 'Lecture standard.'}`;
}

function syncButton(button) {
  if (!button) return;
  button.setAttribute('aria-pressed', comfort ? 'true' : 'false');
  button.textContent = comfort ? 'Revenir à la lecture standard' : 'Activer la lecture confortable';
}

register('E065', (ctx) => {
  const layout = ctx.layout;
  if (!layout || !ctx.stage || (ctx.viewId && ctx.viewId !== 'chronology')) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(ROOT_CLASS);
  currentLayout = layout;

  /* Le panneau entre dans la colonne de lecture (la grille du layout attend
     exactement deux enfants : chronology.js:537). */
  const main = layout.querySelector('.chronology-main') || ctx.stage;
  const panel = ensureNode(ctx, main, PANEL_ID, 'div', 'e065-type-panel');
  const title = ensureNode(ctx, panel, `${PANEL_ID}-title`, 'p', 'e065-type-title', 'Typographie et mesure de lecture');
  title.id = `${PANEL_ID}-title`;
  const readout = ensureNode(ctx, panel, READOUT_ID, 'p', 'e065-type-readout');
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  currentReadout = readout;

  const button = ensureNode(ctx, panel, BUTTON_ID, 'button', 'e065-type-btn');
  button.type = 'button';
  button.setAttribute('aria-controls', READOUT_ID);
  if (button.dataset.e065Bound !== '1') {
    button.dataset.e065Bound = '1';
    button.addEventListener('click', () => {
      comfort = !comfort;
      if (currentLayout) {
        currentLayout.classList.toggle(COMFORT_CLASS, comfort);
        currentLayout.dataset.e065Comfort = comfort ? '1' : '0';
      }
      syncButton(document.getElementById(BUTTON_ID));
      audit(ctx);
    });
  }

  layout.classList.toggle(COMFORT_CLASS, comfort);
  syncButton(button);
  audit(ctx);
});
