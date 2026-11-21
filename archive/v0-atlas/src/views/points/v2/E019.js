import { register } from './registry.js';

/* Lentille POINTS E019 — passe 2 (V2) : Filtres & périmètre — état de
 * périmètre lisible, vérifiable et annoncé sans bavardage (domaine B).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E019.md — chantiers E019-01 à E019-10.
 * Fichier possédé : src/views/points/v2/E019.js uniquement. Ni la passe 1
 * (src/views/points/E019.js), ni la vue points.js, ni la coque, ni registry.js,
 * ni index.js ne sont modifiés. La lentille s'appuie sur le DOM déjà rendu.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2'. Tous ses signaux (CSS, ids, data-*) sont préfixés
 * points-v2-e019 / pointsV2E019 pour ne pas écraser ceux de la passe 1
 * (points-e019, data-points-e019*).
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance au store : tout est dérivé du DOM rendu.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée
 * (.points-v2-e019), un seul panneau (id points-v2-e019-panel), une seule
 * région live (id points-v2-e019-live), zéro innerHTML, zéro réseau, zéro
 * aléa, zéro timer, zéro rAF, aucun écouteur global, aucun appel à la console.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e019';
const SCOPE = 'points-v2-e019';
const PANEL_ID = 'points-v2-e019-panel';
const LIVE_ID = 'points-v2-e019-live';
const DOMAIN_ID = 'points-v2-e019-domain';
const FAMILY_ID = 'points-v2-e019-family';
const SCOPE_VALUE_ID = 'points-v2-e019-scope';
const DATA_SCOPE = 'pointsV2E019';
const DATA_STATE = 'pointsV2E019State';
const DATA_COUNT = 'pointsV2E019Count';
const DATA_ANNOUNCED = 'pointsV2E019Announced';
const REDUCED_ATTR = 'data-points-v2-e019-reduced';

let initialized = false;   // premier rendu muet : jamais d'annonce au montage
let lastSignature = '';    // dernière synthèse annoncée, stable entre rendus
let announceCount = 0;     // compteur auditable (hors région live)

/* E019-01 / E019-08 : feuille unique. Chaque sélecteur commence littéralement
 * par `.points-v2-e019` (y compris les classes du panneau et de la région live
 * sr-only), donc aucune règle ne peut fuir hors de la vue Points. Les signaux
 * de donnée sont distincts de ceux de la passe 1. */
const CSS = `
  /* E019-08 : cibles tactiles et focus visible des deux selects natifs. */
  .points-v2-e019 .points-filters select { min-height: 36px; padding: 4px 8px; }
  .points-v2-e019 .points-filters select:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  /* E019-02 : panneau statique, indexable, placé devant les filtres. */
  .points-v2-e019 .points-v2-e019-panel {
    display: flex; flex-wrap: wrap; gap: 8px 16px;
    margin: 0 0 10px; padding: 8px 10px;
    border: 1px solid var(--line-strong, #3a4252); border-radius: 4px;
    font-size: 11px; line-height: 1.4;
  }
  .points-v2-e019 .points-v2-e019-item {
    display: inline-flex; gap: 4px; align-items: baseline;
  }
  .points-v2-e019 .points-v2-e019-key {
    color: var(--muted-2, #9aa4b2); text-transform: uppercase;
    font-size: 9px; letter-spacing: .04em;
  }
  .points-v2-e019 .points-v2-e019-value {
    color: var(--text, #e6e9ee); font-weight: 600;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e019 .points-v2-e019-note {
    flex-basis: 100%; margin: 0; color: var(--muted-2, #9aa4b2); font-size: 10px;
  }
  /* E019-05 : région live sr-only, créée avant la première écriture. */
  .points-v2-e019-live {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  /* E019-08 : point de rupture mobile — cibles 44 px, panneau en colonne. */
  @media (max-width: 620px) {
    .points-v2-e019 .points-filters select { min-height: 44px; width: 100%; }
    .points-v2-e019 .points-v2-e019-panel { flex-direction: column; gap: 4px; }
  }
  /* E019-08 : mouvement réduit, couplage JS (attribut) et media query. */
  .points-v2-e019[data-points-v2-e019-reduced="1"] .points-filters select { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e019 .points-filters select { transition: none !important; animation: none !important; }
  }
  /* E019-08 : contraste forcé — libellés et valeurs gardés par le texte. */
  @media (forced-colors: active) {
    .points-v2-e019 .points-v2-e019-panel { border-color: CanvasText; color: CanvasText; }
    .points-v2-e019 .points-v2-e019-key,
    .points-v2-e019 .points-v2-e019-value,
    .points-v2-e019 .points-v2-e019-note { color: CanvasText; }
  }
  /* E019-08 : la région live n'a pas sa place sur papier. */
  @media print {
    .points-v2-e019-live { display: none; }
    .points-v2-e019 .points-v2-e019-panel { border: none; padding: 0; }
  }
`;

function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

/* E019-03 : les deux selectifs sont lus tels qu'ils sont dans le DOM, dans
 * l'ordre où points.js les a attachés (0 = domaine, 1 = famille). */
function selectsOf(root) {
  const filters = root ? root.querySelector('.points-filters') : null;
  if (!filters || typeof filters.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(filters.querySelectorAll('select'));
}

/* E019-03 : le libellé annoncé vient de l'<option> réellement sélectionnée,
 * jamais d'une table codée en dur. */
function optionLabel(select) {
  if (!select || !select.options) return '';
  const option = select.options[select.selectedIndex];
  return option ? String(option.textContent || option.label || '').trim() : '';
}

/* E019-04 : le nombre de points est relu dans le compteur réel du détail.
 * Aucun chiffre n'est calculé ni inventé par la lentille. */
function scopeCount(root) {
  const detail = root ? root.querySelector('.points-detail') : null;
  if (!detail) return '';
  const kicker = detail.querySelector('.view-kicker');
  const text = String((kicker || detail).textContent || '');
  const match = text.match(/(\d+)\s*point\(s\)\s*dans ce périmètre/i);
  return match ? match[1] : '';
}

/* E019-05 : région live unique et CRÉÉE AVANT la première écriture. Elle est
 * persistante sur document.body : le re-render de points.js remplace le layout,
 * pas cette région. Construite par ctx.el, jamais par innerHTML. */
function ensureLive(ctx) {
  if (typeof document === 'undefined' || !document.body) return null;
  let live = document.getElementById(LIVE_ID);
  if (live && live.isConnected) return live;
  if (live && typeof live.remove === 'function') live.remove();
  live = ctx.el('p', 'points-v2-e019-live');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
  return live;
}

/* E019-02 : panneau statique construit par ctx.el, avec des valeurs identifiées
 * (points-v2-e019-*). Texte indexable, lisible sans CSS, hors région live. */
function makePanel(ctx) {
  const panel = ctx.el('div', 'points-v2-e019-panel');
  panel.id = PANEL_ID;
  const fields = [
    ['Domaine', DOMAIN_ID],
    ['Famille', FAMILY_ID],
    ['Périmètre', SCOPE_VALUE_ID],
  ];
  fields.forEach(([label, id]) => {
    const item = ctx.el('span', 'points-v2-e019-item');
    item.appendChild(ctx.el('span', 'points-v2-e019-key', label));
    const value = ctx.el('span', 'points-v2-e019-value', '—');
    value.id = id;
    item.appendChild(value);
    panel.appendChild(item);
  });
  panel.appendChild(ctx.el('p', 'points-v2-e019-note',
    'État du périmètre : domaine, famille et nombre de points affichés. '
    + 'Aucune valeur n’est inventée : tout est relu dans la vue.'));
  return panel;
}

function updatePanel(panel, domainLabel, familyLabel, count) {
  const domain = panel.querySelector('#' + DOMAIN_ID);
  const family = panel.querySelector('#' + FAMILY_ID);
  const scope = panel.querySelector('#' + SCOPE_VALUE_ID);
  if (domain) domain.textContent = domainLabel || '—';
  if (family) family.textContent = familyLabel || '—';
  if (scope) scope.textContent = count ? `${count} point(s)` : 'non chiffré';
}

/* E019-09 : un seul message court, composé depuis le DOM. Le repli dit
 * seulement ce qui est observable, sans fabriquer de zéro. */
function buildMessage(domainLabel, familyLabel, count) {
  const head = `Filtres : ${domainLabel || 'domaine non précisé'} / ${familyLabel || 'famille non précisée'}.`;
  return count ? `${head} ${count} point(s) dans ce périmètre.`
               : `${head} Périmètre actualisé.`;
}

function apply(ctx) {
  /* E019-01 : filtre strict sur la vue V2 et gardes de type pour un ctx
   * minimal. Un viewId étranger ou absent neutralise la lentille. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = rootOf(ctx);
  if (!root) return;

  /* E019-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout && ctx.layout.classList ? ctx.layout : root;
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA_SCOPE] = '1';

  /* E019-08 : couplage explicite à la préférence de mouvement réduite, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E019-03 / E019-04 : valeurs dérivées du DOM rendu. */
  const selects = selectsOf(root);
  const domainLabel = optionLabel(selects[0]);
  const familyLabel = optionLabel(selects[1]);
  const count = scopeCount(root);

  /* E019-02 / E019-10 : au plus un panneau par rendu. Le garde anti-doublon
   * couvre le rendu courant et le nettoyage d'un nœud périmé via stage. */
  let panel = root.querySelector('#' + PANEL_ID);
  if (!panel) {
    const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
    const stale = stage ? stage.querySelector('#' + PANEL_ID) : null;
    if (stale && !root.contains(stale)) stale.remove();
    const matrix = root.querySelector('.points-matrix');
    if (matrix) {
      panel = makePanel(ctx);
      const filters = matrix.querySelector('.points-filters');
      if (filters && filters.parentNode) matrix.insertBefore(panel, filters);
      else matrix.appendChild(panel);
    }
  }
  if (!panel) return;

  updatePanel(panel, domainLabel, familyLabel, count);

  /* E019-07 : miroir auditable hors région live. */
  if (panel.dataset) {
    panel.dataset[DATA_STATE] = `${domainLabel}|${familyLabel}`;
    panel.dataset[DATA_COUNT] = count || '0';
    panel.dataset[DATA_ANNOUNCED] = String(announceCount);
  }

  /* E019-05 : la région existe dès le premier rendu, mais reste vide :
   * aucun bavardage au montage, seulement l'registration du live. */
  ensureLive(ctx);

  /* E019-06 : dédup stricte de la synthèse dérivée. Premier rendu muet ;
   * ensuite une seule écriture par changement réel de domaine, famille ou
   * compteur. Aucun timer, aucun écouteur, aucune annonce fantôme. */
  const signature = `${domainLabel}|${familyLabel}|${count}`;
  if (!initialized) {
    initialized = true;
    lastSignature = signature;
    return;
  }
  if (signature === lastSignature) return;
  lastSignature = signature;

  const live = ensureLive(ctx);
  if (live && live.isConnected) {
    live.textContent = buildMessage(domainLabel, familyLabel, count);
    announceCount += 1;
  }
}

/* E019-10 : enregistrement unique, isolé par un try/catch — une lentille
 * défaillante ne doit jamais interrompre le rendu des quatre-vingt-dix-neuf
 * autres modules V2. */
register('E019', (ctx) => {
  try { apply(ctx); } catch { return; }
});
