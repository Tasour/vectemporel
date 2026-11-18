import { register } from './registry.js';

/* Lentille E046 — « Mobile et reflow responsive » (vue Récit).
 *
 * Fichier possédé : src/views/recit/E046.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/RECIT/views/E046.md (E046-01 à E046-10).
 *
 * Dix chantiers concrets et distincts, tous centrés sur la tenue de la vue
 * Récit sur petit écran et lors des changements de largeur / d'orientation :
 *   01 grille fluide et largeur minimale nulle (anti-débordement) ;
 *   02 média fluide (ratio, object-fit, hauteur bornée) ;
 *   03 mesure de lecture fluide (60–75 caractères) ;
 *   04 actions tactiles en grille adaptative ;
 *   05 fil en grille auto-fill avec troncature ;
 *   06 témoin de mode d'affichage (mobile / tablette / bureau) ;
 *   07 zones de sécurité des encoches (safe-area-inset) ;
 *   08 mouvement neutralisé lors du reflow si préférence réduite ;
 *   09 barre d'outils repliée plus tôt (recherche pleine largeur) ;
 *   10 panneau de mesures falsifiable dans le tiroir diagnostic.
 *
 * Une seule feuille (ctx.css('recit-e046', …)), une seule clé, un seul
 * register. Toutes les classes créées sont préfixées `recit-e046-`, tous les
 * ids `e046-` et uniques. Zéro console, zéro réseau, zéro Math.random, zéro
 * minuteur, zéro boucle rAF multiple. Un seul écouteur par type, posé une fois
 * au niveau module et lisant le dernier contexte mémorisé. Tout en français,
 * gardes d'existence partout, enrichissement non destructif : sans JS, la vue
 * reste lisible. Toute la feuille est cadrée par `.recit-layout[data-e046="on"]`.
 */

const CSS_ID = 'recit-e046';
const PANEL_ID = 'e046-measures';
const BADGE_ID = 'e046-viewport-badge';

/* État module — survit aux reconstructions du DOM, jamais écrit ailleurs. */
let latest = null;      // dernier contexte enrichi
let installed = false;  // garde des écouteurs globaux
let frame = 0;          // au plus une requête d'animation en vol

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Cadrée par [data-e046="on"] posé sur la grille :
 * aucune règle ne déborde sur une autre vue ni sur un autre greffon.
 * ------------------------------------------------------------------------- */
const RULES = `
/* E046-01 — grille fluide et largeur minimale nulle (anti-débordement). */
.recit-layout[data-e046="on"]{
  width:100%;max-width:100%;min-width:0;
  overflow-x:clip;overscroll-behavior-x:contain;
}
.recit-layout[data-e046="on"] > .recit-media,
.recit-layout[data-e046="on"] > .recit-body{min-width:0;max-width:100%}
.recit-layout[data-e046="on"] #recit-point-title.recit-title{
  overflow-wrap:anywhere;word-break:normal
}
@media (max-width:1000px){
  .recit-layout[data-e046="on"]{grid-template-columns:minmax(0,1fr)}
}

/* E046-02 — média fluide : aucune déformation, hauteur bornée au mobile. */
.recit-layout[data-e046="on"] .recit-media{overflow:hidden;min-width:0}
.recit-layout[data-e046="on"] .recit-media img{
  display:block;max-width:100%;height:auto
}
@media (max-width:620px){
  .recit-layout[data-e046="on"] .recit-media{
    min-height:clamp(96px,20vh,180px);max-height:28vh
  }
  .recit-layout[data-e046="on"] .recit-media img{
    width:100%;height:auto;max-height:22vh;object-fit:contain
  }
}

/* E046-03 — mesure de lecture fluide (60–75 caractères par ligne). */
.recit-layout[data-e046="on"] > .recit-body{
  max-width:74ch;margin-inline:auto;padding-inline:clamp(16px,4vw,32px)
}
@media (max-width:620px){
  .recit-layout[data-e046="on"] > .recit-body{max-width:none;padding-inline:16px}
}

/* E046-04 — commandes tactiles en grille adaptative, cibles ≥ 44 px. */
.recit-layout[data-e046="on"] .recit-actions{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px
}
.recit-layout[data-e046="on"] .recit-actions button{
  min-height:44px;min-width:0;width:100%;overflow-wrap:anywhere;line-height:1.2
}
@media (max-width:360px){
  .recit-layout[data-e046="on"] .recit-actions{grid-template-columns:1fr}
}

/* E046-05 — fil en grille auto-fill, libellés tronqués sans débordement. */
.recit-layout[data-e046="on"] .recit-thread-list{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,172px),1fr));gap:6px
}
.recit-layout[data-e046="on"] .recit-thread-item{
  min-width:0;max-width:100%;min-height:40px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap
}
@media (max-width:620px){
  .recit-layout[data-e046="on"] .recit-thread-item{min-height:44px}
}

/* E046-06 — témoin de mode d'affichage (texte, jamais la seule couleur). */
.recit-e046-badge{
  display:inline-flex;align-items:center;gap:6px;margin:0 0 10px;
  padding:4px 9px;border:1px solid var(--line-strong);border-radius:999px;
  color:var(--muted);font-size:10px;line-height:1.3;font-variant-numeric:tabular-nums
}
.recit-e046-badge::before{content:"◫";color:var(--gold);font-size:11px}

/* E046-07 — zones de sécurité des écrans à encoche (repli à 0 px). */
@media (max-width:620px){
  .recit-layout[data-e046="on"] > .recit-body{
    padding-left:max(16px,env(safe-area-inset-left,0px));
    padding-right:max(16px,env(safe-area-inset-right,0px));
    padding-top:max(12px,env(safe-area-inset-top,0px));
    padding-bottom:max(28px,env(safe-area-inset-bottom,0px))
  }
}

/* E046-08 — mouvement neutralisé au reflow si préférence système réduite. */
.recit-layout[data-e046="on"] .recit-e046-badge,
.recit-layout[data-e046="on"] .recit-media img{transition:opacity 200ms ease}
.recit-layout[data-e046="on"].recit-e046-still .recit-e046-badge,
.recit-layout[data-e046="on"].recit-e046-still .recit-media img,
.recit-layout[data-e046="on"].recit-e046-still .recit-thread-item,
.recit-layout[data-e046="on"].recit-e046-still .recit-actions button{
  transition:none !important;scroll-behavior:auto !important
}
@media (prefers-reduced-motion:reduce){
  .recit-layout[data-e046="on"] .recit-e046-badge,
  .recit-layout[data-e046="on"] .recit-media img,
  .recit-layout[data-e046="on"] .recit-thread-item{
    transition:none !important;animation:none !important
  }
}

/* E046-09 — barre d'outils repliée dès 760 px, recherche pleine largeur. */
.recit-layout[data-e046="on"] .c3a-tools{min-width:0}
.recit-layout[data-e046="on"] .c3a-group{min-width:0;flex-wrap:wrap}
.recit-layout[data-e046="on"] .c3a-search{min-width:0;flex:1 1 220px}
@media (max-width:760px){
  .recit-layout[data-e046="on"] .c3a-tools{flex-direction:column;align-items:stretch}
  .recit-layout[data-e046="on"] .c3a-search{width:100%;flex:1 1 auto}
  .recit-layout[data-e046="on"] .c3a-group{width:100%}
}

/* E046-10 — panneau de mesures, masqué puis remonté dans le tiroir diagnostic. */
.recit-e046-panel{display:none !important}
body.recit-diagnostics .recit-e046-panel{
  display:block !important;margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)
}
.recit-e046-panel h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600}
.recit-e046-panel p{
  margin:0 0 4px;color:var(--muted);font-size:11px;
  line-height:1.45;font-variant-numeric:tabular-nums
}
`;

/* ------------------------------------------------------------------------- *
 * Lecture de la fenêtre : seuils alignés sur la feuille (620 / 1000 px).
 * ------------------------------------------------------------------------- */
function readViewport() {
  let w = 1000;
  try { if (typeof window !== 'undefined' && window.innerWidth) w = window.innerWidth; }
  catch { /* fenêtre indisponible : valeur de repli */ }
  let mode, seuil;
  if (w <= 620) { mode = 'mobile'; seuil = '≤ 620 px'; }
  else if (w <= 1000) { mode = 'tablette'; seuil = '621 – 1000 px'; }
  else { mode = 'bureau'; seuil = '> 1000 px'; }
  return { w, mode, seuil };
}

function badgeText(vp) {
  return `Affichage : ${vp.mode} (${vp.seuil}) · largeur ${vp.w} px · `
    + `colonnes ${vp.mode === 'bureau' ? '2' : '1'}.`;
}

/* ------------------------------------------------------------------------- *
 * E046-06 — témoin de mode, inséré après la barre de progression.
 * ------------------------------------------------------------------------- */
function addBadge(el, layout, body, vp) {
  let badge = layout.querySelector(`#${BADGE_ID}`);
  if (!badge) {
    badge = el('p', 'recit-e046-badge', '');
    badge.id = BADGE_ID;
    badge.setAttribute('role', 'note');
    const progress = layout.querySelector('.recit-progress');
    if (progress && progress.parentNode) progress.parentNode.insertBefore(badge, progress.nextSibling);
    else if (body.firstChild) body.insertBefore(badge, body.firstChild);
    else body.appendChild(badge);
  }
  badge.textContent = badgeText(vp);
  return badge;
}

/* ------------------------------------------------------------------------- *
 * E046-10 — panneau de mesures, texte réel et falsifiable.
 * ------------------------------------------------------------------------- */
function addPanel(el, stage) {
  let panel = null;
  try { panel = document.getElementById(PANEL_ID); } catch { /* document absent */ }
  if (panel && panel.parentNode) {
    try { panel.parentNode.removeChild(panel); } catch { /* déjà détaché */ }
  }
  panel = el('section', 'recit-e046-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('data-recit-diagnostic', '');
  panel.setAttribute('aria-label', 'Mesures de mise en page mobile et reflow');
  const heading = el('h2', '', 'E046 — Mobile et reflow responsive · mesures');
  heading.id = 'e046-mes-titre';
  panel.appendChild(heading);
  const fields = [
    ['viewport', 'Fenêtre : —'],
    ['mode', 'Mode : —'],
    ['grille', 'Grille : —'],
    ['debordement', 'Débordement horizontal : —'],
    ['tactile', 'Cibles tactiles : —'],
    ['mouvement', 'Mouvement : —'],
    ['securite', 'Zones de sécurité : —'],
  ];
  const nodes = {};
  fields.forEach(([key, text]) => {
    const line = el('p', '', text);
    line.id = `e046-mes-${key}`;
    panel.appendChild(line);
    nodes[key] = line;
  });
  stage.appendChild(panel);
  return nodes;
}

/* ------------------------------------------------------------------------- *
 * Peinture unique : témoin, drapeaux de mode/mouvement et mesures.
 * ------------------------------------------------------------------------- */
function paint() {
  const cur = latest;
  if (!cur || !cur.layout || !cur.layout.isConnected) return;
  const set = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };

  const vp = readViewport();
  cur.vp = vp;
  cur.layout.dataset.e046Mode = vp.mode;

  const sys = typeof cur.reducedMotion === 'function' ? Boolean(cur.reducedMotion()) : false;
  cur.layout.classList.toggle('recit-e046-still', sys);
  cur.layout.dataset.e046Motion = sys ? 'off' : 'on';
  set(cur.badge, badgeText(vp));

  let overflow = 'indisponible';
  try {
    const doc = document.documentElement;
    overflow = doc && doc.scrollWidth > vp.w + 1 ? 'détecté' : 'aucun';
  } catch { /* mesure indisponible */ }

  if (cur.nodes) {
    set(cur.nodes.viewport, `Fenêtre : ${vp.w} px de large · ruptures à ≤ 620 px (mobile) et ≤ 1000 px (tablette).`);
    set(cur.nodes.mode, `Mode : ${vp.mode} (${vp.seuil}).`);
    set(cur.nodes.grille, `Grille : ${vp.mode === 'bureau'
      ? '2 colonnes (média + texte)' : '1 colonne (média puis texte)'} · largeur minimale nulle.`);
    set(cur.nodes.debordement, `Débordement horizontal : ${overflow} (scrollWidth comparé à innerWidth).`);
    set(cur.nodes.tactile, 'Cibles tactiles : plancher 44 px sur les actions, 40–44 px sur le fil, 32 px sur les filtres.');
    set(cur.nodes.mouvement, `Mouvement : ${sys ? 'réduit (préférence système)' : 'complet'} · `
      + `transitions ${sys ? 'neutralisées' : 'actives'}.`);
    set(cur.nodes.securite, 'Zones de sécurité : env(safe-area-inset-*) appliquées au padding du texte sur mobile.');
  }
}

/* Une seule frame pour resize, orientation et retour de visibilité. */
function schedule() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { paint(); return; }
  frame = requestAnimationFrame(() => { frame = 0; paint(); });
}

/* Installation unique, silencieuse et bornée. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E046', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof css === 'function') css(CSS_ID, RULES);
  const body = layout.querySelector('.recit-body');
  if (!body || typeof el !== 'function') return;

  layout.dataset.e046 = 'on';
  const vp = readViewport();
  const sys = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  layout.classList.toggle('recit-e046-still', sys);
  layout.dataset.e046Motion = sys ? 'off' : 'on';
  layout.dataset.e046Mode = vp.mode;

  latest = { stage, layout, reducedMotion, badge: null, nodes: null, vp };
  latest.badge = addBadge(el, layout, body, vp);
  latest.nodes = addPanel(el, stage);
  install();
  paint();
});
