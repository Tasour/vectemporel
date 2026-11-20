import { register } from './registry.js';

/* Lentille E072 — performance de rendu appliquée au survol de la vue Constellation.
 * Dix chantiers locaux et complémentaires. Aucun appel réseau, aucune source
 * d'aléa, aucun journal de débogage, aucun minuteur ni boucle d'animation
 * propre, aucun fichier partagé modifié. Greffon tolérant : le DOM n'est touché
 * qu'après validation de ctx.layout et aucune erreur n'est propagée au registre.
 */

const STYLE_ID = 'constellation-e072';
const PANEL_ID = 'e072-perf';
const METRIC_ID = 'e072-perf-metric';
const HELP_ID = 'e072-perf-help';
const NODE_SELECTOR = '.const-sun, .const-planet, .const-moon';

const CSS = `
/* E072-01 — Mouvement réduit : aucune interpolation de survol n'est calculée. */
.constellation-field[data-e072-reduced="1"] .const-sun,
.constellation-field[data-e072-reduced="1"] .const-planet,
.constellation-field[data-e072-reduced="1"] .const-moon{transition:none!important}

/* E072-02 — État de survol unique porté par le nœud, piloté par délégation. */
.const-sun[data-e072-hover="1"],
.const-planet[data-e072-hover="1"],
.const-moon[data-e072-hover="1"]{z-index:6}

/* E072-03 — Promotion GPU limitée au seul nœud survolé (jamais permanente). */
.constellation-field[data-e072-armed="1"] .const-sun[data-e072-hover="1"],
.constellation-field[data-e072-armed="1"] .const-planet[data-e072-hover="1"],
.constellation-field[data-e072-armed="1"] .const-moon[data-e072-hover="1"]{will-change:transform}

/* E072-04 — Peinture confinée à chaque calque pendant le survol. */
.constellation-field .const-layer{contain:layout paint style}

/* E072-05 — Survol par transformation composite : aucune propriété de flux. */
.constellation-field[data-e072-armed="1"][data-e072-reduced="0"] .const-sun[data-e072-hover="1"]{transform:translate(-50%,-50%) scale(1.08)}
.constellation-field[data-e072-armed="1"][data-e072-reduced="0"] .const-planet[data-e072-hover="1"]{transform:translate(-50%,-50%) scale(1.12)}
.constellation-field[data-e072-armed="1"][data-e072-reduced="0"] .const-moon[data-e072-hover="1"]{transform:translate(-50%,-50%) scale(1.25)}

/* E072-06 — Anneau de survol en outline : un repaint, sans box-shadow animée. */
.constellation-field[data-e072-armed="1"] .const-sun[data-e072-hover="1"],
.constellation-field[data-e072-armed="1"] .const-planet[data-e072-hover="1"],
.constellation-field[data-e072-armed="1"] .const-moon[data-e072-hover="1"]{outline:2px solid var(--gold-bright,#f0cf8f);outline-offset:2px}

/* E072-08 — Seuls les boutons sont survolables ; les traits restent inertes. */
.constellation-field[data-e072-armed="1"] .constellation-edges,
.constellation-field[data-e072-armed="1"] .const-layer{pointer-events:none}
.constellation-field[data-e072-armed="1"] button{pointer-events:auto}

/* E072-10 — Couleurs forcées et contraste renforcé : survol sans effet coûteux. */
@media (forced-colors:active){
  .constellation-field [data-e072-hover="1"]{outline:2px solid CanvasText!important;transform:none!important;will-change:auto!important}
}
@media (prefers-contrast:more){
  .constellation-field [data-e072-hover="1"]{outline-width:3px}
}

#e072-perf{margin-top:8px;padding:6px 9px;border:1px solid rgba(230,185,111,.28);border-radius:8px;background:rgba(7,11,18,.72);max-width:100%}
#e072-perf-metric{margin:0;color:var(--muted,#93a0b4);font:9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.e072-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){#e072-perf-metric{font-size:8px}}
`;

function ensureNode(id, tag, className, parent, factory) {
  let node = document.getElementById(id);
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Retourne le nœud interactif survolé, sans lecture de géométrie. */
function nodeFrom(target, field) {
  if (!target || typeof target.closest !== 'function') return null;
  const node = target.closest(NODE_SELECTOR);
  return node && field.contains(node) ? node : null;
}

register('E072', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout fourni. */
  if (!ctx || !ctx.layout) return;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  if (!field || typeof ctx.css !== 'function') return;

  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  /* Une seule feuille de style pour toute la lentille. */
  ctx.css(STYLE_ID, CSS);

  /* E072-01 — le réglage de mouvement est lu une seule fois, sur le champ. */
  field.dataset.e072Reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '1' : '0';

  /* E072-07 — la géométrie est comptée une seule fois, jamais dans un gestionnaire. */
  const nodes = Array.from(field.querySelectorAll(NODE_SELECTOR));
  const nodeCount = nodes.length;
  const listenerBaseline = nodeCount * 4;
  field.dataset.e072Nodes = String(nodeCount);

  /* E072-08 — le survol n'est armé que s'il existe des nœuds réels. */
  field.dataset.e072Armed = nodeCount > 0 ? '1' : '0';

  /* E072-09 — sonde locale, ajoutée au layout et non au champ survolé. */
  const panel = ensureNode(PANEL_ID, 'div', null, layout, factory);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Sonde de performance du survol');
  panel.setAttribute('aria-describedby', HELP_ID);
  const metric = ensureNode(METRIC_ID, 'p', null, panel, factory);
  metric.setAttribute('role', 'status');
  metric.setAttribute('aria-live', 'polite');
  const help = ensureNode(HELP_ID, 'p', 'e072-sr', layout, factory);
  help.textContent = 'Sonde locale de performance du survol : les états sont délégués à quatre écouteurs constants sur le champ, la mise à l’échelle passe par transform et le mouvement est supprimé lorsque prefers-reduced-motion est actif.';

  let hoverKey = '';

  /* E072-09 — mesure affichée, référencée au coût naïf d'un écouteur par nœud. */
  function paintMetric() {
    const saved = Math.max(0, listenerBaseline - 4);
    metric.textContent = `${nodeCount} nœuds · 4 écouteurs au lieu de ${listenerBaseline} (${saved} évités) · survol : ${hoverKey || 'aucun'}`;
  }

  /* E072-02 — quatre écouteurs délégués (pointeur + clavier) au lieu de 4 × N. */
  if (field.dataset.e072Delegated !== '1') {
    field.dataset.e072Delegated = '1';
    const enter = (target) => {
      const node = nodeFrom(target, field);
      if (!node || node.dataset.e072Hover === '1') return;
      node.dataset.e072Hover = '1';
      hoverKey = node.dataset.constKey || '';
      paintMetric();
    };
    const leave = (target, related) => {
      const node = nodeFrom(target, field);
      if (!node) return;
      if (related && nodeFrom(related, field) === node) return;
      node.dataset.e072Hover = '0';
      if (hoverKey === (node.dataset.constKey || '')) {
        hoverKey = '';
        paintMetric();
      }
    };
    field.addEventListener('pointerover', (event) => enter(event.target));
    field.addEventListener('pointerout', (event) => leave(event.target, event.relatedTarget));
    field.addEventListener('focusin', (event) => enter(event.target));
    field.addEventListener('focusout', (event) => leave(event.target, event.relatedTarget));
  }

  paintMetric();
});
