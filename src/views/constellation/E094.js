import { register } from './registry.js';

/* Lentille E094 — structure sémantique appliquée au champ d'étoiles de la vue
 * Constellation. Module autonome et tolérant : aucune dépendance réseau, aucune
 * source d'aléa, aucun appel de débogage, aucun minuteur ni boucle d'animation
 * propre. Aucun fichier partagé n'est modifié : seul le layout transmis par ctx
 * est complété. Tous les identifiants DOM sont préfixés « e094- ».
 */

const STYLE_ID = 'constellation-e094';
const FIELD_ID = 'e094-field';
const DEFS_ID = 'e094-defs';
const TABLE_ID = 'e094-table';
const CRUMBS_ID = 'e094-crumbs';
const GLOSS_ID = 'e094-gloss';
const FIGCAP_ID = 'e094-figcaption';
const PANEL_ID = 'e094-panel';
const TOGGLE_ID = 'e094-toggle';
const METRIC_ID = 'e094-metric';

const CSS = `
/* E094-02 — ordinalité visible des couches, lue depuis l'attribut. */
.const-layer[data-e094-order]::before{
  position:absolute;top:6px;left:calc(6px + (var(--e094-order,1) - 1) * 24px);
  min-width:16px;height:16px;display:grid;place-items:center;border-radius:4px;
  background:#0b0f16;color:#f5e6c4;border:1px solid #e6b96f;
  font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;
  content:attr(data-e094-order);pointer-events:none;
}
/* E094-10 — mode schématisé : la structure devient saillante. */
.constellation-field[data-e094-schema-mode="1"]{outline:1px dashed rgba(230,185,111,.55);outline-offset:-4px}
.constellation-field[data-e094-schema-mode="1"] .const-layer[data-e094-order]::before{
  background:#e6b96f;color:#0b0f16;box-shadow:0 0 0 2px rgba(230,185,111,.25);
}
.constellation-field[data-e094-reduced="0"] .const-layer[data-e094-order]::before{transition:background .16s linear,color .16s linear}
.constellation-field[data-e094-reduced="1"] .const-layer[data-e094-order]::before{transition:none}
/* E094-03 — définitions des types de nœuds. */
#e094-defs{margin:10px 0 0;padding:8px 10px;border:1px solid rgba(230,185,111,.28);border-radius:8px;background:rgba(7,11,18,.55)}
#e094-defs dt{margin-top:6px;color:#f0cf8f;font-size:10px;font-weight:700}
#e094-defs dt:first-child{margin-top:0}
#e094-defs dd{margin:2px 0 0;color:var(--muted,#93a0b4);font-size:9px;line-height:1.4}
/* E094-06 — tableau récapitulatif sémantique. */
#e094-table{border-collapse:collapse;margin-top:10px;width:100%;font-size:9px}
#e094-table caption{text-align:left;padding:4px 0;color:#f0cf8f;font-size:10px;font-weight:700}
#e094-table th,#e094-table td{border:1px solid rgba(230,185,111,.22);padding:3px 6px;text-align:left;vertical-align:top}
#e094-table th{background:rgba(230,185,111,.10);color:#e8dcc4;font-weight:700}
#e094-table td{color:var(--muted,#93a0b4)}
/* E094-08 — fil sémantique. */
#e094-crumbs{margin:8px 0 0;padding:0}
#e094-crumbs ol{display:flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none}
#e094-crumbs li{color:var(--muted,#93a0b4);font-size:9px}
#e094-crumbs li+li::before{content:'›';margin-right:4px;color:#e6b96f}
/* E094-10 — panneau de commande de structure. */
#e094-panel{position:absolute;top:8px;right:8px;z-index:5;display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding:6px;border:1px solid rgba(230,185,111,.35);border-radius:8px;background:rgba(7,11,18,.88);pointer-events:auto}
#e094-toggle{min-width:36px;min-height:36px;padding:0 8px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:10px;cursor:pointer}
#e094-toggle[aria-pressed="true"]{border-color:#e6b96f;background:rgba(230,185,111,.16);color:#f5e6c4}
#e094-toggle:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
#e094-metric{max-width:230px;color:#cbd5e1;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;text-align:right}
/* E094-04/05/09 — texte purement sémantique, hors flux visuel. */
.e094-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){#e094-panel{top:6px;right:6px;padding:4px}#e094-metric{max-width:150px;font-size:9px}#e094-defs dd,#e094-crumbs li{font-size:8px}}
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

function mergeDescribedBy(node, id) {
  if (!node) return;
  const list = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (list.indexOf(id) < 0) {
    list.push(id);
    node.setAttribute('aria-describedby', list.join(' '));
  }
}

function short(text, max) {
  const value = String(text == null ? '' : text);
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

register('E094', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout fourni. */
  if (!ctx || !ctx.layout) return;
  const layout = ctx.layout;
  if (typeof ctx.css !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;
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

  const layers = Array.from(field.querySelectorAll('.const-layer'));
  const suns = Array.from(field.querySelectorAll('.const-layer-suns .const-sun'));
  const planets = Array.from(field.querySelectorAll('.const-layer-planets .const-planet'));
  const moons = Array.from(field.querySelectorAll('.const-layer-moons .const-moon'));
  const nodes = suns.concat(planets, moons);

  /* E094-01 — le champ reçoit une identité et un rôle description stables. */
  field.id = FIELD_ID;
  field.setAttribute('aria-roledescription', 'champ d’étoiles');
  field.dataset.e094Schema = 'constellation/v1';

  /* E094-02 — chaque couche est numérotée et annoncée dans la série. */
  layers.forEach((layer, index) => {
    layer.dataset.e094Order = String(index + 1);
    layer.style.setProperty('--e094-order', String(index + 1));
    layer.setAttribute('aria-posinset', String(index + 1));
    layer.setAttribute('aria-setsize', String(layers.length));
  });

  /* E094-03 — les trois types de nœuds sont définis dans une liste de définitions. */
  const defs = ensureNode(DEFS_ID, 'dl', null, layout, factory);
  if (!defs.childElementCount) {
    const entries = [
      ['Ère · soleil', 'Un soleil représente une ère historique ; son chiffre est le rang de l’ère dans l’ordre chronologique.'],
      ['Repère · planète', 'Une planète représente un repère daté de l’ère active ; son chiffre est son rang dans cette ère.'],
      ['Point vérifié · lune', 'Une lune représente un point vérifié du repère actif ; elle signale au moins une source locale.'],
    ];
    entries.forEach(([term, description]) => {
      defs.appendChild(factory('dt', null, term));
      defs.appendChild(factory('dd', null, description));
    });
  }

  /* E094-04 — chaque couche porte un titre réel référencé par aria-labelledby. */
  layers.forEach((layer, index) => {
    const headingId = `e094-layer-h-${index + 1}`;
    let heading = document.getElementById(headingId);
    if (!heading) {
      heading = factory('h3', 'e094-sr');
      heading.id = headingId;
    }
    heading.textContent = layer.getAttribute('aria-label') || `Couche ${index + 1}`;
    if (heading.parentNode !== layer) layer.appendChild(heading);
    layer.dataset.e094Heading = headingId;
    layer.setAttribute('aria-labelledby', headingId);
  });

  /* E094-05 — le champ est déclaré comme figure et relié à sa légende. */
  field.dataset.e094Figure = '1';
  const figcaption = ensureNode(FIGCAP_ID, 'p', 'e094-sr', layout, factory);
  figcaption.textContent = 'Figure : les soleils sont les ères, les planètes les repères de l’ère active, les lunes les points vérifiés du repère actif ; les traits relient un repère à son ère et à ses points. Les positions sont décoratives et déterministes.';
  mergeDescribedBy(field, FIGCAP_ID);
  const note = layout.querySelector('.constellation-note');
  if (note) note.dataset.e094Figcaption = '1';

  /* E094-06 — un tableau récapitulatif offre une lecture linéaire des nœuds. */
  const table = ensureNode(TABLE_ID, 'table', null, layout, factory);
  if (!table.childElementCount) {
    table.appendChild(factory('caption', null, 'Structure du champ d’étoiles'));
    const thead = factory('thead');
    const headRow = factory('tr');
    ['Type', 'Rang', 'Libellé'].forEach((label) => {
      const th = factory('th', null, label);
      th.setAttribute('scope', 'col');
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    table.appendChild(factory('tbody'));
  }
  const tbody = table.querySelector('tbody');
  if (tbody) {
    tbody.textContent = '';
    const groups = [
      ['Ère', suns],
      ['Repère', planets],
      ['Point vérifié', moons],
    ];
    groups.forEach(([type, list]) => {
      list.forEach((node, index) => {
        const row = factory('tr');
        const typeCell = factory('td', null, type);
        const rankCell = factory('td', null, String(index + 1));
        const labelCell = factory('td', null, short(node.dataset.label || node.getAttribute('aria-label') || '—', 48));
        row.append(typeCell, rankCell, labelCell);
        tbody.appendChild(row);
      });
    });
  }

  /* E094-07 — annotations sémantiques locales sur chaque nœud. */
  field.dataset.e094Vocab = 'constellation:structure';
  const vocab = [
    [suns, 'constellation:Ere'],
    [planets, 'constellation:Repere'],
    [moons, 'constellation:PointVerifie'],
  ];
  vocab.forEach(([list, term]) => {
    list.forEach((node) => {
      node.dataset.e094Vocab = term;
      node.dataset.e094Term = term.slice('constellation:'.length);
    });
  });

  /* E094-08 — fil sémantique calculé depuis le titre et les nœuds actifs. */
  const crumbs = ensureNode(CRUMBS_ID, 'nav', null, layout, factory);
  crumbs.setAttribute('aria-label', 'Fil sémantique du champ d’étoiles');
  let listNode = crumbs.querySelector('ol');
  if (!listNode) {
    listNode = factory('ol');
    crumbs.appendChild(listNode);
  }
  listNode.textContent = '';
  const titleNode = layout.querySelector('.constellation-title');
  const countryName = titleNode
    ? String(titleNode.textContent || '').replace(/^Constellation\s*·\s*/, '').trim() || '—'
    : '—';
  const activeLabel = (list) => {
    const active = list.find((node) => node.getAttribute('aria-current') === 'true');
    return active ? short(active.dataset.label || active.getAttribute('aria-label') || '—', 34) : '—';
  };
  [countryName, activeLabel(suns), activeLabel(planets), activeLabel(moons)].forEach((text) => {
    listNode.appendChild(factory('li', null, text));
  });

  /* E094-09 — glossaire des termes relié à la description du champ. */
  const gloss = ensureNode(GLOSS_ID, 'p', 'e094-sr', layout, factory);
  if (!gloss.childElementCount) {
    gloss.append(
      factory('dfn', null, 'Ère'),
      factory('span', null, ' : période historique représentée par un soleil. '),
      factory('dfn', null, 'Repère'),
      factory('span', null, ' : événement daté représenté par une planète. '),
      factory('dfn', null, 'Point vérifié'),
      factory('span', null, ' : point confirmé par une source locale, représenté par une lune. '),
      factory('dfn', null, 'Arête'),
      factory('span', null, ' : trait qui relie les nœuds entre eux.')
    );
  }
  mergeDescribedBy(field, GLOSS_ID);

  /* E094-10 — bascule de schématisation et mesure des nœuds structurés. */
  field.dataset.e094Reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '1' : '0';
  const panel = ensureNode(PANEL_ID, 'div', null, field, factory);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Commandes de structure sémantique');
  const toggle = ensureNode(TOGGLE_ID, 'button', null, panel, factory);
  if (!toggle.textContent) {
    toggle.type = 'button';
    toggle.textContent = 'Schématiser';
  }
  const metric = ensureNode(METRIC_ID, 'p', null, panel, factory);
  metric.setAttribute('role', 'status');
  metric.setAttribute('aria-live', 'polite');
  toggle.setAttribute('aria-pressed', field.dataset.e094SchemaMode === '1' ? 'true' : 'false');

  const paintMetric = () => {
    const mode = field.dataset.e094SchemaMode === '1' ? 'schématisé' : 'standard';
    metric.textContent = `${nodes.length} nœuds structurés · ${layers.length} couches · ${suns.length} ères / ${planets.length} repères / ${moons.length} points · mode ${mode}`;
  };
  if (toggle.dataset.e094Bound !== '1') {
    toggle.dataset.e094Bound = '1';
    toggle.addEventListener('click', () => {
      const on = field.dataset.e094SchemaMode !== '1';
      field.dataset.e094SchemaMode = on ? '1' : '0';
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      paintMetric();
    });
  }
  paintMetric();
});
