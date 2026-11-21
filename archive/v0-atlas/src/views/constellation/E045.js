import { register } from './registry.js';

/* Lentille E045 — adaptabilité responsive appliquée à la légende de la vue
 * Constellation. Dix chantiers concrets et variés, aucun fichier partagé
 * modifié. Module autonome et tolérant : zéro réseau, zéro source d'aléa,
 * zéro appel de débogage, aucun minuteur ni boucle d'animation propre.
 * Seul le layout transmis par ctx est complété.
 */

const PANEL_ID = 'e045-panel';
const TOGGLE_ID = 'e045-compact-toggle';
const STATUS_ID = 'e045-status';
const BADGE_ID = 'e045-badge';
const HELP_ID = 'e045-help';

/* Formes abrégées et pastilles déterminées par le libellé d'origine. */
const SHORTS = {
  'Ère': 'Ère',
  'Repère': 'Repère',
  'Point vérifié du repère': 'Point vérifié',
};
const GLYPHS = {
  'legend-sun': '☼',
  'legend-planet': '◆',
  'legend-moon': '○',
};

const CSS = `
/* E045-01 — conteneur de légende structuré, sans déplacer les nœuds d'origine. */
.constellation-legend.e045-legend{position:relative;align-items:center;margin:0;padding:2px 0}
.constellation-legend.e045-legend[role="list"]{list-style:none}
/* E045-02 — entrées alignées, numéro d'ordre calé sur la pastille. */
.e045-item{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;line-height:1.3}
/* E045-03 — grille auto-fit entre 621 et 980 px : la légende se répartit
   en colonnes égales au lieu de déborder d'une seule rangée. */
@media (min-width:621px) and (max-width:980px){
  .e045-legend[data-e045-grid="auto-fit"]{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));
    grid-auto-rows:min-content;align-items:start;
  }
}
/* E045-04 — espacement et corps de texte fluides, pilotés par --e045-fluid. */
.e045-legend{
  row-gap:clamp(4px,1vw,10px);
  column-gap:var(--e045-fluid,10px);
  font-size:clamp(8px,1.05vw,10px);
}
/* E045-05 — sous 620 px, le libellé court remplace le libellé intégral ;
   l'aria-label posé en JS conserve le nom accessible complet. */
.e045-item::after{content:none}
@media (max-width:620px){
  .e045-legend .e045-item{font-size:0}
  .e045-legend .e045-item::after{content:attr(data-e045-short);font-size:9px}
}
/* E045-06 — pastille-glyphe lue depuis l'attribut, dimensionnée en clamp(). */
.e045-item::before{
  content:attr(data-e045-glyph);
  display:inline-grid;place-items:center;
  width:clamp(12px,1.6vw,16px);height:clamp(12px,1.6vw,16px);
  border:1px solid rgba(230,185,111,.55);border-radius:4px;
  background:rgba(230,185,111,.08);color:#e6b96f;
  font-size:9px;line-height:1;
}
/* E045-07 — densité observée : on resserre les gouttières et les pastilles. */
.e045-legend[data-e045-density="compacte"]{row-gap:3px;column-gap:6px}
.e045-legend[data-e045-density="compacte"] .e045-item::before{width:11px;height:11px;font-size:8px}
.e045-legend[data-e045-density="large"]{column-gap:clamp(10px,2vw,22px)}
/* E045-08 — forçage manuel du mode compact ou du mode étendu. */
.e045-legend[data-e045-force="compact"]{display:flex;flex-wrap:wrap;gap:3px 6px}
.e045-legend[data-e045-force="compact"] .e045-item{font-size:0}
.e045-legend[data-e045-force="compact"] .e045-item::after{content:attr(data-e045-short);font-size:9px}
.e045-legend[data-e045-force="large"]{display:flex;flex-wrap:wrap;gap:8px 18px}
.e045-legend[data-e045-force="large"] .e045-item{font-size:10px}
.e045-legend[data-e045-force="large"] .e045-item::after{content:none}
/* Panneau, commande, mesure et badge, tous préfixés e045-. */
#e045-panel{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;
  margin:6px 0 2px;padding:6px 8px;
  border:1px solid rgba(230,185,111,.30);border-radius:8px;
  background:rgba(9,13,20,.80);
}
#e045-compact-toggle{
  min-width:36px;min-height:36px;padding:0 10px;
  border:1px solid var(--line,#3a4150);border-radius:7px;
  background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);
  font-size:10px;cursor:pointer;
}
#e045-compact-toggle[aria-pressed="true"]{
  border-color:#e6b96f;background:rgba(230,185,111,.16);color:#f5e6c4;
}
#e045-compact-toggle:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
#e045-status{
  flex:1 1 220px;margin:0;color:#cbd5e1;
  font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
  font-variant-numeric:tabular-nums;
}
#e045-badge{
  padding:1px 5px;border:1px solid rgba(178,139,221,.45);border-radius:5px;
  color:#c3a6e6;font-size:8px;font-variant-numeric:tabular-nums;white-space:nowrap;
}
.e045-sr{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
/* Transition douce par défaut. */
.e045-item{transition:background-color .18s linear,color .18s linear}
/* E045-10 — mouvement réduit : aucune transition, aucune animation. */
.e045-legend[data-e045-motion="reduce"] .e045-item,
.e045-legend[data-e045-motion="reduce"] .e045-item::before{transition:none}
@media (max-width:620px){
  #e045-panel{padding:4px 6px}
  #e045-status{flex-basis:100%;font-size:9px}
}
`;

function ensureNode(id, tag, className, parent, factory) {
  let node = null;
  try { node = document.getElementById(id); } catch (error) { node = null; }
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Trois paliers de densité, déterministes et référencés en pixels. */
function densityFor(width) {
  if (!Number.isFinite(width)) return 'large';
  if (width < 320) return 'compacte';
  if (width < 560) return 'moyenne';
  return 'large';
}

function widthOf(node) {
  if (!node || typeof node.getBoundingClientRect !== 'function') return NaN;
  return node.getBoundingClientRect().width;
}

/* Observateur partagé entre rendus : un seul par lentille, jamais de doublon. */
let resizeObserver = null;
let observedLegend = null;

register('E045', (ctx) => {
  /* Garde d'entrée : vérification de ctx.layout avant tout ajout DOM. */
  if (!ctx || !ctx.layout) return;
  if (typeof ctx.css !== 'function') return;
  const layout = ctx.layout;
  const legend = layout.querySelector ? layout.querySelector('.constellation-legend') : null;
  if (!legend) return;
  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  /* Unique feuille de style de la lentille. */
  ctx.css('constellation-e045', CSS);

  /* E045-01 — la légende existante reçoit sa classe, un rôle de liste et un
     nom accessible, sans écraser un rôle déjà posé par une autre lentille. */
  legend.classList.add('e045-legend');
  if (!legend.hasAttribute('role')) legend.setAttribute('role', 'list');
  if (!legend.hasAttribute('aria-label')) {
    legend.setAttribute('aria-label', 'Légende de la constellation, adaptable à la largeur');
  }

  const items = Array.from(legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon'));

  /* E045-02 — chaque entrée devient un élément de liste numéroté et nommé. */
  items.forEach((item, index) => {
    if (!item.hasAttribute('role')) item.setAttribute('role', 'listitem');
    item.classList.add('e045-item');
    item.dataset.e045Index = String(index + 1);
  });
  legend.dataset.e045Items = String(items.length);

  /* E045-03 — mode de disposition déclaré explicitement sur le conteneur ;
     la règle auto-fit ne s'active qu'entre 621 et 980 px. */
  legend.dataset.e045Grid = 'auto-fit';

  /* E045-04 — pas de gouttière calculé depuis le nombre d'entrées, puis
     exposé en variable CSS pour la règle fluide. */
  const fluid = Math.max(6, Math.min(16, Math.round(18 - items.length * 3)));
  legend.style.setProperty('--e045-fluid', `${fluid}px`);

  /* E045-05 — libellé intégral mémorisé, forme abrégée prête au repli et
     aria-label stable : le nom accessible ne dépend jamais de la largeur. */
  items.forEach((item) => {
    const full = (item.textContent || '').trim() || 'Élément de légende';
    item.dataset.e045Full = full;
    item.dataset.e045Short = SHORTS[full] || (full.split(/\s+/)[0] || 'Élément');
    item.setAttribute('aria-label', full);
  });

  /* E045-06 — pastille-glyphe attribuée par la classe d'origine de l'entrée. */
  items.forEach((item) => {
    let glyph = '•';
    Object.keys(GLYPHS).forEach((key) => {
      if (item.classList.contains(key)) glyph = GLYPHS[key];
    });
    item.dataset.e045Glyph = glyph;
  });

  /* E045-09 — description vocale unique, référencée sans écraser les
     identifiants déjà présents dans aria-describedby. */
  const help = ensureNode(HELP_ID, 'p', 'e045-sr', layout, factory);
  help.textContent = 'Légende adaptable : trois entrées — ère, repère et point vérifié. Sous 620 pixels, les libellés sont abrégés ; entre 621 et 980 pixels, ils se répartissent en grille ; au-delà, ils restent sur une rangée. Une commande permet de forcer le mode compact. Les seuils sont 320, 620 et 980 pixels.';
  const described = (legend.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (described.indexOf(HELP_ID) < 0) {
    described.push(HELP_ID);
    legend.setAttribute('aria-describedby', described.join(' '));
  }

  /* E045-08 — panneau de commande, bascule indépendante et mesure annoncée. */
  const panel = ensureNode(PANEL_ID, 'div', null, layout, factory);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Commandes d’adaptabilité de la légende');
  const toggle = ensureNode(TOGGLE_ID, 'button', null, panel, factory);
  if (!toggle.textContent) {
    toggle.type = 'button';
    toggle.textContent = 'Forcer le mode compact';
    toggle.setAttribute('aria-pressed', 'false');
  }
  const status = ensureNode(STATUS_ID, 'p', null, panel, factory);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  /* E045-10 — badge chiffré et couplage au mouvement réduit de l'hôte. */
  const badge = ensureNode(BADGE_ID, 'span', null, panel, factory);
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = `${items.length} entrées · seuils 320/620/980 px`;
  const reduced = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  legend.dataset.e045Motion = reduced ? 'reduce' : 'on';

  function paint(width) {
    const normalized = Number.isFinite(width) ? width : widthOf(legend);
    const density = densityFor(normalized);
    legend.dataset.e045Density = density;
    const forced = legend.dataset.e045Force === 'compact';
    status.textContent = `${items.length} entrées · largeur ${Math.round(normalized)} px · densité ${density} · mode ${forced ? 'compact forcé' : 'automatique'} (repères 320/620/980 px)`;
  }

  toggle.setAttribute('aria-pressed', legend.dataset.e045Force === 'compact' ? 'true' : 'false');
  if (toggle.dataset.e045Bound !== '1') {
    toggle.dataset.e045Bound = '1';
    toggle.addEventListener('click', () => {
      const on = legend.dataset.e045Force !== 'compact';
      legend.dataset.e045Force = on ? 'compact' : 'auto';
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      paint(widthOf(legend));
    });
  }

  /* E045-07 — observation de la largeur réelle du conteneur, sans horloge,
     sans rAF propre et sans exception si l'API est absente. */
  if (typeof ResizeObserver !== 'undefined') {
    try {
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver((records) => {
          for (let index = 0; index < records.length; index += 1) {
            const record = records[index];
            const target = record && record.target;
            if (target && target.dataset && target.dataset.e045Watch === '1') {
              const rect = record.contentRect;
              paint(rect && Number.isFinite(rect.width) ? rect.width : widthOf(target));
            }
          }
        });
      }
      if (observedLegend && observedLegend !== legend
          && typeof resizeObserver.unobserve === 'function') {
        resizeObserver.unobserve(observedLegend);
      }
      legend.dataset.e045Watch = '1';
      resizeObserver.observe(legend);
      observedLegend = legend;
    } catch (error) {
      /* Greffon tolérant : la mesure initiale reste affichée, sans remonter
         d'exception au registre. */
    }
  }
  paint(widthOf(legend));
});
