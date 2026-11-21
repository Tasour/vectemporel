import { register } from './registry.js';

/* Lentille POINTS E015 — passe 2 (V2) : compas de périmètre, lisibilité et
 * comparaison du nombre de résultats filtrés (domaine B : filtres & périmètre).
 *
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E015.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est édité. La lentille ajoute son propre
 * panneau visuel et s'appuie sur le DOM déjà produit par la vue.
 *
 * Différence contractuelle V2 : points.js:128 appelle runEnhancementsV2 avec
 * viewId 'pointsv2' (la passe 1 utilise 'points', points.js:127). Le module
 * filtre donc sur 'pointsv2'. Il ne crée AUCUNE région live : la passe 1 reste
 * l'unique source d'annonce (role=status). Le panneau V2 est purement visuel :
 * jauge, puces de filtre et note statique, tous dérivés du DOM.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Toute valeur numérique est lue dans le DOM (kicker du détail
 * points.js:97, titre points.js:33, deux <select> points.js:62-85, ère active
 * points.js:40) : aucun millésime, aucun total, aucun chiffre inventé.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e015),
 * un seul panneau (id points-v2-e015-panel), ids préfixés, gardes anti-doublon,
 * signaux V2 distincts de la passe 1, zéro innerHTML, zéro réseau, zéro aléa,
 * zéro timer, zéro rAF, zéro écouteur global, aucun appel à la console.
 */

const CSS_ID = 'points-v2-e015';
const SCOPE = 'points-v2-e015';
const VIEW_ID = 'pointsv2';
const REDUCED_ATTR = 'data-points-v2-e015-reduced';
const DATA_SCOPE = 'pointsV2E015';
const DATA_GAUGE = 'pointsV2E015Gauge';
const DATA_CHIP = 'data-points-v2-e015-chip';

const ID = {
  panel: 'points-v2-e015-panel',
  gauge: 'points-v2-e015-gauge',
  fill: 'points-v2-e015-fill',
  value: 'points-v2-e015-value',
  chips: 'points-v2-e015-chips',
  hint: 'points-v2-e015-hint',
};

/* Chaque sélecteur COMMENCE littéralement par `.points-v2-e015`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points.
 * Les signaux de donnée sont distincts de ceux de la passe 1 (points-e015-*)
 * pour ne pas écraser ses marqueurs sur le DOM partagé. La jauge et les puces
 * sont aria-hidden : la seule annonce reste la live region de la passe 1. */
const CSS = `
  /* E015-01 — panneau unique, ancré sous les filtres natifs. */
  .points-v2-e015 .points-v2-e015-panel {
    display: flex; flex-direction: column; gap: 6px;
    margin: 8px 0 4px; padding: 8px 10px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .05);
    font: inherit; font-size: 11px; line-height: 1.4;
  }
  /* E015-02 — jauge proportionnelle : la largeur du remplissage est calculée
   * depuis le DOM ; le motif en bandes et le chiffre explicite évitent toute
   * dépendance à la seule couleur. */
  .points-v2-e015 .points-v2-e015-gauge {
    position: relative; display: block; min-height: 20px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 4px;
    background: rgba(0, 0, 0, .25); overflow: hidden;
  }
  .points-v2-e015 .points-v2-e015-fill {
    display: block; height: 100%;
    background: repeating-linear-gradient(135deg,
      var(--gold, #e6b96f) 0 6px, rgba(230, 185, 111, .35) 6px 12px);
    transition: width .18s linear;
  }
  .points-v2-e015 .points-v2-e015-value {
    position: absolute; top: 0; right: 0; bottom: 0; left: 0;
    display: flex; align-items: center; justify-content: center;
    font-variant-numeric: tabular-nums; font-weight: 600;
    color: var(--ink-strong, #f5f5f5); text-shadow: 0 1px 2px #000;
  }
  /* E015-03 — puces de périmètre, construites par ctx.el. */
  .points-v2-e015 .points-v2-e015-chips {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .points-v2-e015 .points-v2-e015-chip {
    display: inline-flex; align-items: center; gap: 4px;
    min-height: 24px; padding: 2px 8px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 999px;
    font-size: 10px; font-variant-numeric: tabular-nums;
  }
  /* E015-04 — état « filtre actif » porté par le glyphe et le trait, jamais
   * par la couleur seule : ● / trait plein = actif, ○ / pointillé = complet. */
  .points-v2-e015 .points-v2-e015-chip::before { content: "○"; font-style: normal; }
  .points-v2-e015 .points-v2-e015-chip[data-points-v2-e015-chip="active"]::before { content: "●"; }
  .points-v2-e015 .points-v2-e015-chip[data-points-v2-e015-chip="context"]::before { content: "▸"; }
  .points-v2-e015 .points-v2-e015-chip[data-points-v2-e015-chip="active"] { border-style: solid; }
  .points-v2-e015 .points-v2-e015-chip[data-points-v2-e015-chip="neutral"],
  .points-v2-e015 .points-v2-e015-chip[data-points-v2-e015-chip="context"] { border-style: dashed; }
  /* E015-05 — mesure et chiffres tabulaires du panneau. */
  .points-v2-e015 .points-v2-e015-panel,
  .points-v2-e015 .points-v2-e015-chip { overflow-wrap: anywhere; }
  /* E015-06 — cibles tactiles et focus visible (aucune info par la couleur). */
  .points-v2-e015 .points-v2-e015-chip:focus-visible,
  .points-v2-e015 .points-v2-e015-panel:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 2px;
  }
  /* E015-10 — note de lecture statique, hors région live. */
  .points-v2-e015 .points-v2-e015-hint {
    margin: 0; color: var(--muted, #9aa4b2); font-size: 10px; line-height: 1.45;
  }
  /* E015-07 — mouvement réduit : couplage attribut JS + media query. */
  .points-v2-e015[data-points-v2-e015-reduced="1"] .points-v2-e015-fill { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e015 .points-v2-e015-fill { transition: none; }
  }
  /* E015-08 — points de rupture documentés. */
  @media (max-width: 700px) {
    .points-v2-e015 .points-v2-e015-chip { min-height: 44px; }
    .points-v2-e015 .points-v2-e015-gauge { min-height: 28px; }
  }
  @media print {
    .points-v2-e015 .points-v2-e015-panel { break-inside: avoid; }
    .points-v2-e015 .points-v2-e015-fill { transition: none; }
  }
  /* E015-09 — couleurs forcées et contraste renforcé. */
  @media (forced-colors: active) {
    .points-v2-e015 .points-v2-e015-gauge,
    .points-v2-e015 .points-v2-e015-chip { border-color: CanvasText; }
    .points-v2-e015 .points-v2-e015-fill { background: CanvasText !important; }
    .points-v2-e015 .points-v2-e015-value { color: Canvas; text-shadow: none; }
  }
  @media (prefers-contrast: more) {
    .points-v2-e015 .points-v2-e015-gauge,
    .points-v2-e015 .points-v2-e015-chip { border-width: 2px; }
  }
`;

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function intFrom(value, pattern) {
  const match = txt(value).match(pattern);
  if (!match) return 0;
  const number = parseInt(match[1], 10);
  return Number.isFinite(number) ? number : 0;
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E015-02 — le décompte filtré reste lu dans le kicker natif (points.js:97) :
 * c'est la seule source qui reflète le filtre de famille et de domaine. */
function filteredCount(root) {
  const kicker = root ? root.querySelector('.points-detail .view-kicker') : null;
  return intFrom(kicker, /(\d+)\s*point/i);
}

/* E015-02 — le total de référence vient du titre natif (points.js:33). */
function totalCount(root) {
  const title = root ? root.querySelector('.points-title') : null;
  return intFrom(title, /(\d+)/);
}

function selectedLabel(select) {
  if (!select) return '';
  const list = select.selectedOptions && select.selectedOptions.length
    ? select.selectedOptions
    : (select.options ? [select.options[select.selectedIndex]] : []);
  const option = list[0];
  return txt(option) || txt(select.value);
}

/* E015-03 — périmètre décrit depuis les deux <select> et l'ère active. */
function filterState(filters) {
  const selects = filters && typeof filters.querySelectorAll === 'function'
    ? filters.querySelectorAll('select') : [];
  const domainSelect = selects[0];
  const familySelect = selects[1];
  const domainValue = domainSelect ? txt(domainSelect.value) : '*';
  const familyValue = familySelect ? txt(familySelect.value) : '*';
  return {
    domainLabel: selectedLabel(domainSelect) || 'Tous les domaines',
    familyLabel: selectedLabel(familySelect) || 'Toutes les familles',
    domainActive: !!domainValue && domainValue !== '*',
    familyActive: !!familyValue && familyValue !== '*',
    filtered: (!!domainValue && domainValue !== '*') || (!!familyValue && familyValue !== '*'),
  };
}

function activeEraLabel(root) {
  const row = root ? root.querySelector('.points-grid-row.is-active') : null;
  const era = row ? row.querySelector('.points-era') : null;
  return txt(era) || 'ère non précisée';
}

/* Place un nœud sans le dupliquer, en le déplaçant si la coque a re-rendu. */
function place(parent, node, before) {
  if (!parent || typeof parent.insertBefore !== 'function') return;
  if (node.parentNode !== parent || (before && node.nextSibling !== before)) {
    parent.insertBefore(node, before || null);
  }
}

/* E015-10 — ancre unique par id, récupérée ou créée par ctx.el (jamais
 * innerHTML) puis repositionnée : idempotente après un re-rendu de la coque. */
function ensureAnchor(doc, id, className, parent, before, ctx) {
  let node = typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
  if (!node) {
    node = ctx.el('div', className);
    node.id = id;
  }
  place(parent, node, before);
  return node;
}

function chip(ctx, kind, label) {
  const node = ctx.el('span', 'points-v2-e015-chip', label);
  node.setAttribute(DATA_CHIP, kind);
  return node;
}

function apply(ctx) {
  /* E015-01 — filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
  const doc = layout.ownerDocument || (stage && stage.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* E015-01 — une seule feuille, une seule portée, signaux V2 distincts. */
  ctx.css(CSS_ID, CSS);
  if (layout.classList && typeof layout.classList.add === 'function') layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA_SCOPE] = ctx.viewId;

  /* E015-07 — mouvement réduit : signal du registre + media query CSS. */
  const still = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  if (still) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* Valeurs dérivées du DOM réel, jamais codées en dur. */
  const filters = layout.querySelector('.points-filters');
  const perimeter = filterState(filters);
  const count = filteredCount(layout);
  const total = totalCount(layout);
  const era = activeEraLabel(layout);
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((count / total) * 100))) : 0;

  /* E015-01 — le panneau prend place juste après les filtres natifs, dans la
   * matrice ; à défaut de filtres, il est ajouté au layout. */
  const parent = filters && filters.parentNode ? filters.parentNode : layout;
  const before = filters ? filters.nextSibling : null;
  const panel = ensureAnchor(doc, ID.panel, 'points-v2-e015-panel', parent, before, ctx);
  panel.setAttribute('data-view-id', ctx.viewId);
  if (panel.dataset) panel.dataset[DATA_GAUGE] = perimeter.filtered ? 'active' : 'complete';
  panel.setAttribute('aria-hidden', 'true');

  /* E015-02 — jauge : remplissage proportionnel + valeur littérale « N / M ». */
  const gauge = ensureAnchor(doc, ID.gauge, 'points-v2-e015-gauge', panel, null, ctx);
  const fill = ensureAnchor(doc, ID.fill, 'points-v2-e015-fill', gauge, null, ctx);
  const value = ensureAnchor(doc, ID.value, 'points-v2-e015-value', gauge, null, ctx);
  fill.style.width = pct + '%';
  const valueText = `${count} / ${total}`;
  if (txt(value) !== valueText) value.textContent = valueText;
  const title = `${count} résultat${plural(count, '', 's')} affiché${plural(count, '', 's')} sur ${total} points isolés (${pct} %).`;
  if (gauge.getAttribute('title') !== title) gauge.setAttribute('title', title);

  /* E015-03/04 — puces de périmètre : domaine, famille, ère. Le glyphe et le
   * style de bordure codent l'état actif, jamais la teinte seule. */
  const chips = ensureAnchor(doc, ID.chips, 'points-v2-e015-chips', panel, null, ctx);
  chips.replaceChildren(
    chip(ctx, perimeter.domainActive ? 'active' : 'neutral', `Domaine : ${perimeter.domainLabel}`),
    chip(ctx, perimeter.familyActive ? 'active' : 'neutral', `Famille : ${perimeter.familyLabel}`),
    chip(ctx, 'context', `Ère : ${era}`)
  );

  /* E015-10 — note statique, lisible sans CSS et sans annonce : elle décrit
   * intégralement le compas pour les technologies d'assistance (la jauge et
   * les puces étant aria-hidden pour ne pas doubler la live region V1). */
  const hint = ensureAnchor(doc, ID.hint, 'points-v2-e015-hint', panel, null, ctx);
  hint.setAttribute('data-view-id', ctx.viewId);
  const tone = perimeter.filtered
    ? 'Le trait plein et le glyphe plein signalent un filtre actif.'
    : 'Le trait pointillé et le glyphe creux signalent un périmètre complet, sans filtre actif.';
  const hintText = `Compas de périmètre : ${count} résultat${plural(count, '', 's')} affiché${plural(count, '', 's')} `
    + `sur ${total} points isolés (${pct} %). Domaine : ${perimeter.domainLabel} · `
    + `Famille : ${perimeter.familyLabel} · Ère : ${era}. ${tone}`;
  if (txt(hint) !== hintText) hint.textContent = hintText;
}

register('E015', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
