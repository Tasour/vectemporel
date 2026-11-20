import { register } from './registry.js';

/*
 * Lentille E009 — « mobile 390 px » (rapport UNIFIED_AUDIT/CHRONOLOGIE/views/E09.md).
 *
 * Dix chantiers (E09-01 … E09-10) implémentés dans CE seul module : aucun
 * fichier partagé n'est modifié. La vue reconstruisant son DOM à chaque rendu,
 * apply() recrée ses nœuds dans le stage courant ; les écouteurs, eux, sont
 * posés une seule fois au niveau module et lisent toujours le dernier contexte.
 *
 * CSS unique : ctx.css('chronology-e09', …). Préfixes DOM : `e09-` (panneau de
 * mesure, collecté par le tiroir de diagnostics de la coque) et `cm09-`
 * (commandes de navigation visibles sur mobile uniquement). Zéro console,
 * zéro réseau, zéro aléa, aucune dépendance à une librairie externe.
 */

const CSS_ID = 'chronology-e09';
const TARGET_MIN = 44; // px — WCAG 2.5.5, cible tactile AAA
const FONT_MIN = 11;   // px — plancher de lisibilité retenu pour la vue
const MOBILE_MAX = 620; // px — aligné sur le breakpoint mobile de chronology.js

let latest = null;    // dernier contexte vu : { stage, layout, reducedMotion, nodes }
let installed = false; // garde des écouteurs globaux
let frame = 0;         // au plus une requête d'animation en vol

/* ------------------------------------------------------------------------- *
 * Feuille de styles E09-02 … E09-09. Tout est cadré par [data-e09="on"] posé
 * sur .chronology-layout : aucune règle ne déborde sur une autre vue.
 * ------------------------------------------------------------------------- */
const RULES = `
/* E09-01 — panneau de mesure : un seul tiroir de diagnostics, celui de la coque. */
.e09-panel { display: none !important; }
body.chronology-diagnostics .e09-panel {
  display: block !important; margin: 0 0 12px; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.e09-panel h2 { margin: 0 0 6px; color: var(--gold); font-size: 12px; font-weight: 600; }
.e09-panel p {
  margin: 0 0 4px; color: var(--muted); font-size: 11px;
  line-height: 1.45; font-variant-numeric: tabular-nums;
}

/* E09-07 — commandes de saut entre panneaux : masquées sur grand écran. */
.chronology-layout[data-e09="on"] .cm09-jump { display: none; }

@media (max-width: 620px) {
  /* E09-03 — largeur contenue, aucun débordement horizontal à 390 px. */
  .chronology-layout[data-e09="on"],
  .chronology-layout[data-e09="on"] .chronology-main,
  .chronology-layout[data-e09="on"] .chronology-aside { box-sizing: border-box; }
  .chronology-layout[data-e09="on"] { max-width: 100%; overflow-x: hidden; }
  .chronology-layout[data-e09="on"] .chronology-main,
  .chronology-layout[data-e09="on"] .chronology-aside {
    min-width: 0; max-width: 100%; overflow-x: hidden;
    overflow-wrap: anywhere; padding: 14px 14px 24px;
  }
  .chronology-layout[data-e09="on"] .nav-c2-trail,
  .chronology-layout[data-e09="on"] .nav-c2-trail-list,
  .chronology-layout[data-e09="on"] .nav-c2-trail-item,
  .chronology-layout[data-e09="on"] .nav-c2-orientation,
  .chronology-layout[data-e09="on"] .atlas-chrono-tools,
  .chronology-layout[data-e09="on"] .point-sources { min-width: 0; max-width: 100%; }

  /* E09-02 — cibles tactiles portées à 44 px (WCAG 2.5.5). */
  .chronology-layout[data-e09="on"] .atlas-chrono-tag,
  .chronology-layout[data-e09="on"] .atlas-chrono-tags .atlas-chrono-tag,
  .chronology-layout[data-e09="on"] .nav-c2-back,
  .chronology-layout[data-e09="on"] .aside-actions button,
  .chronology-layout[data-e09="on"] .atlas-chrono-empty button,
  .chronology-layout[data-e09="on"] .era-band.atlas-chrono-band {
    min-height: 44px; padding-left: 12px; padding-right: 12px;
    font-size: 12px; line-height: 1.25;
  }
  .chronology-layout[data-e09="on"] .cm09-jump {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; min-width: 44px; margin: 0 0 8px; padding: 0 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230,185,111,.08); color: var(--gold-bright);
    font: inherit; font-size: 12px; cursor: pointer;
  }
  .chronology-layout[data-e09="on"] .cm09-jump:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }

  /* E09-04 — deux bandes d'ère par rangée, plages temporelles lisibles. */
  .chronology-layout[data-e09="on"] .atlas-chrono-era-list { gap: 6px; }
  .chronology-layout[data-e09="on"] .atlas-chrono-era-list > li {
    flex: 1 1 46%; min-width: 0;
  }
  .chronology-layout[data-e09="on"] .era-band.atlas-chrono-band {
    min-height: 48px; gap: 2px; padding: 6px 10px; font-size: 11px;
  }
  .chronology-layout[data-e09="on"] .atlas-chrono-era-range { font-size: 11px; }

  /* E09-05 — cartes compactes : le texte n'est plus rogné par une hauteur fixe. */
  .chronology-layout[data-e09="on"] .event-list.atlas-chrono-events { gap: 8px; }
  .chronology-layout[data-e09="on"] .event-card {
    min-height: 0; gap: 4px; padding-bottom: 12px;
  }
  .chronology-layout[data-e09="on"] .event-card img { height: 64px; }
  .chronology-layout[data-e09="on"] .event-card strong { font-size: 15px; }
  .chronology-layout[data-e09="on"] .aside-image { height: 120px; }

  /* E09-06 — plancher typographique 11 px, chiffres en colonnes. */
  .chronology-layout[data-e09="on"] .atlas-chrono-hint,
  .chronology-layout[data-e09="on"] .atlas-chrono-status,
  .chronology-layout[data-e09="on"] .atlas-chrono-count,
  .chronology-layout[data-e09="on"] .atlas-chrono-card-era,
  .chronology-layout[data-e09="on"] .atlas-chrono-tags,
  .chronology-layout[data-e09="on"] .nav-c2-crumb,
  .chronology-layout[data-e09="on"] .nav-c2-progress,
  .chronology-layout[data-e09="on"] .nav-c2-sep,
  .chronology-layout[data-e09="on"] .aside-kicker,
  .chronology-layout[data-e09="on"] .aside-credit,
  .chronology-layout[data-e09="on"] .event-subtitle,
  .chronology-layout[data-e09="on"] .point-kind,
  .chronology-layout[data-e09="on"] .confidence,
  .chronology-layout[data-e09="on"] .atlas-chrono-section-title { font-size: 11px; }
  .chronology-layout[data-e09="on"] .point p,
  .chronology-layout[data-e09="on"] .aside-summary,
  .chronology-layout[data-e09="on"] .point-sources,
  .chronology-layout[data-e09="on"] .atlas-chrono-empty,
  .chronology-layout[data-e09="on"] .atlas-chrono-search { font-size: 12px; }
  .chronology-layout[data-e09="on"] .event-year,
  .chronology-layout[data-e09="on"] .atlas-chrono-status,
  .chronology-layout[data-e09="on"] .nav-c2-progress,
  .chronology-layout[data-e09="on"] .atlas-chrono-count,
  .chronology-layout[data-e09="on"] .atlas-chrono-era-range {
    font-variant-numeric: tabular-nums;
  }

  /* E09-08 — ancrage : le repère visé n'est jamais collé au bord du panneau. */
  .chronology-layout[data-e09="on"] .chronology-main,
  .chronology-layout[data-e09="on"] .chronology-aside { scroll-padding-block: 16px; }
  .chronology-layout[data-e09="on"] .point,
  .chronology-layout[data-e09="on"] .nav-c2-orientation { scroll-margin-block: 16px; }
}

/* E09-09 — mouvement réduit : pas de transition ni de défilement animé. */
@media (prefers-reduced-motion: reduce) {
  .chronology-layout[data-e09="on"] .cm09-jump,
  .chronology-layout[data-e09="on"] .atlas-chrono-tag { transition: none !important; }
  .chronology-layout[data-e09="on"] .chronology-main,
  .chronology-layout[data-e09="on"] .chronology-aside {
    scroll-behavior: auto !important;
  }
}
`;

/* ------------------------------------------------------------------------- *
 * E09-01 — témoin de largeur / débordement, E09-02 — audit tactile,
 * E09-06 — audit typographique : une seule mesure, une seule écriture.
 * ------------------------------------------------------------------------- */
function paint() {
  const cur = latest;
  if (!cur || !cur.nodes) return;
  const nodes = cur.nodes;
  const set = (node, text) => { if (node) node.textContent = text; };

  const winW = typeof window === 'undefined' ? 0 : (window.innerWidth || 0);
  const docW = (document.documentElement && document.documentElement.clientWidth) || 0;
  const stageW = (cur.stage && cur.stage.clientWidth) || 0;
  const layout = cur.layout;
  const layoutW = (layout && layout.clientWidth) || 0;
  const scrollW = (layout && layout.scrollWidth) || 0;
  const mobile = winW > 0 && winW <= MOBILE_MAX;
  const frameW = Math.max(layoutW, docW);
  const overflow = (layoutW > 0 && scrollW > layoutW + 1) ||
    (docW > 0 && scrollW > docW + 1);

  let small = 0, total = 0, tiny = 0;
  if (mobile && layout && typeof layout.querySelectorAll === 'function') {
    layout.querySelectorAll('button, input, select, [role="button"]').forEach((node) => {
      if (node.disabled || node.getAttribute('aria-hidden') === 'true') return;
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      total += 1;
      if (rect.height < TARGET_MIN - 0.5 || rect.width < TARGET_MIN - 0.5) small += 1;
    });
    if (typeof getComputedStyle === 'function') {
      layout.querySelectorAll('p, li, span, strong, button, label').forEach((node) => {
        if (node.hasAttribute('aria-hidden') || node.classList.contains('sr-only')) return;
        if (node.children.length || !(node.textContent || '').trim()) return;
        const rect = node.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        let size = 0;
        try { size = parseFloat(getComputedStyle(node).fontSize) || 0; }
        catch { return; }
        if (size && size < FONT_MIN - 0.5) tiny += 1;
      });
    }
  }

  set(nodes.viewport, `Largeur : fenêtre ${winW} px · document ${docW} px · scène ${stageW} px · panneau ${layoutW} px.`);
  set(nodes.overflow, overflow
    ? `Débordement horizontal : contenu ${scrollW} px > cadre ${frameW} px.`
    : `Aucun débordement horizontal : contenu ${scrollW} px dans un cadre de ${frameW} px.`);
  set(nodes.targets, mobile
    ? `Cibles tactiles : ${total} mesurées, ${small} sous ${TARGET_MIN} px.`
    : `Audit tactile actif seulement à ≤ ${MOBILE_MAX} px (largeur courante ${winW} px).`);
  set(nodes.fonts, mobile
    ? `Texte sous ${FONT_MIN} px : ${tiny} nœud(s), décorations exclues.`
    : `Audit typographique actif seulement à ≤ ${MOBILE_MAX} px.`);
  const reduced = cur.reducedMotion && cur.reducedMotion();
  set(nodes.state, `État : ${mobile ? 'mobile' : 'large'} · mouvement ${reduced ? 'réduit' : 'complet'} · rAF ${frame ? 'en attente' : 'au repos'}.`);
}

/* Une seule frame pour resize, orientationchange, visibilité et préférence. */
function schedule() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { paint(); return; }
  frame = requestAnimationFrame(() => { frame = 0; paint(); });
}

/* E09-10 — installation unique, silencieuse et réversible au repos. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') {
        query.addEventListener('change', schedule);
      }
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

/* ------------------------------------------------------------------------- *
 * E09-07 — deux commandes de navigation entre panneaux, visibles en mobile.
 * Le défilement est instantané (pas de smooth) : le mouvement réduit est
 * respecté sans tester de media-query supplémentaire.
 * ------------------------------------------------------------------------- */
function reveal(pane, focusId) {
  if (!pane) return;
  const target = focusId ? document.getElementById(focusId) : null;
  if (target && typeof target.focus === 'function') {
    try { target.focus({ preventScroll: true }); }
    catch { target.focus(); }
  }
  pane.scrollTop = 0;
}

function addJumpControls(ctx) {
  const main = ctx.layout.querySelector('.chronology-main');
  const aside = ctx.layout.querySelector('.chronology-aside');
  if (!main && !aside) return;

  if (main) {
    const toDetail = ctx.el('button', 'cm09-jump cm09-jump-detail', 'Détail du repère ↓');
    toDetail.type = 'button';
    toDetail.id = 'cm09-jump-detail';
    toDetail.setAttribute('aria-controls', 'atlas-chrono-aside');
    toDetail.addEventListener('click', () => reveal(aside, 'atlas-chrono-event-title'));
    const orientation = main.querySelector('.nav-c2-orientation');
    if (orientation && orientation.nextSibling) main.insertBefore(toDetail, orientation.nextSibling);
    else main.appendChild(toDetail);
  }
  if (aside) {
    const toList = ctx.el('button', 'cm09-jump cm09-jump-list', '↑ Liste des repères');
    toList.type = 'button';
    toList.id = 'cm09-jump-list';
    toList.setAttribute('aria-controls', 'atlas-chrono-events');
    toList.addEventListener('click', () => reveal(main, 'atlas-chrono-search'));
    aside.insertBefore(toList, aside.firstChild || null);
  }
}

/* ------------------------------------------------------------------------- *
 * E09-01 — panneau de mesures, unique et indexable ; masqué par défaut par la
 * feuille E09, puis collecté dans le tiroir de la coque quand on l'ouvre.
 * ------------------------------------------------------------------------- */
function addAuditPanel(ctx) {
  const panel = ctx.el('section', 'e09-panel');
  panel.id = 'e09-mobile-audit';
  panel.setAttribute('aria-label', 'Mesures de la vue chronologie sur mobile');
  const heading = ctx.el('h2', '', 'Mobile 390 px — mesures');
  heading.id = 'e09-mobile-audit-title';
  panel.appendChild(heading);

  const fields = [
    ['viewport', 'Largeur : —'],
    ['overflow', 'Débordement : —'],
    ['targets', 'Cibles tactiles : —'],
    ['fonts', 'Texte sous 11 px : —'],
    ['state', 'État : —'],
  ];
  const nodes = {};
  fields.forEach(([key, text]) => {
    const line = ctx.el('p', '', text);
    line.id = `e09-mobile-${key}`;
    panel.appendChild(line);
    nodes[key] = line;
  });
  ctx.stage.appendChild(panel);
  return nodes;
}

register('E009', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  /* E09-10 — garde d'existence : la coque reconstruisant le stage, on ne
     réutilise jamais un nœud d'un rendu précédent. */
  ctx.layout.dataset.e09 = 'on';
  latest = {
    stage: ctx.stage,
    layout: ctx.layout,
    reducedMotion: ctx.reducedMotion,
    nodes: null,
  };
  addJumpControls(ctx);
  latest.nodes = addAuditPanel(ctx);
  install();
  schedule();
});
