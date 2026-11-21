import { register } from './registry.js';

/* Lentille POINTS E024 — passe 2 (V2) : familles du point en puces sémantiques
 * (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E024.md — chantiers E024-01 à E024-10.
 * Fichier possédé : ce module uniquement. La passe 1 (`src/views/points/E024.js`),
 * la vue `points.js`, les lentilles voisines (E012, E023, E025, E027, E054,
 * E099), le registre, `index.js` et `styles.css` sont lus mais jamais modifiés.
 *
 * Différence contractuelle V2 : `points.js:128` appelle
 * `runEnhancementsV2({ viewId: 'pointsv2', stage, layout })` après la passe 1
 * (`points.js:127`). Le greffon filtre donc sur `'pointsv2'`. La passe 1 a
 * déjà transformé les <span> de familles en liste ARIA `#points-e024-list` :
 * la V2 **lit** cette liste (avec repli sur les <span> directs), enrichit les
 * listitems d'attributs additifs et dépose son propre panneau de lecture
 * `points-v2-e024-summary`. Aucun nœud existant n'est déplacé, recréé ou réécrit.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Toute valeur affichée est dérivée du DOM : aucun libellé de
 * famille, aucun millésime, aucun total n'est codé en dur.
 *
 * Invariants : une seule feuille CSS (cssOnce), une seule portée
 * `.points-v2-e024`, un seul panneau, identifiants préfixés `points-v2-e024-`,
 * signaux de donnée distincts de la passe 1, garde anti-doublon, zéro
 * innerHTML, zéro réseau, zéro aléa, zéro minuteur, zéro rAF, zéro écouteur
 * global, aucun appel à la console.
 */

const CSS_ID = 'points-v2-e024';
const SCOPE = 'points-v2-e024';
const SUMMARY_ID = 'points-v2-e024-summary';
const NOTE_ID = 'points-v2-e024-note';
const REDUCED_ATTR = 'data-points-v2-e024-reduced';
const DATA_SCOPE = 'pointsV2E024';
const DATA_SCOPE_ATTR = 'data-points-v2-e024';
const DATA_COUNT = 'pointsV2E024Count';
const DATA_STATE = 'pointsV2E024State';
const DATA_FILTER = 'pointsV2E024Filter';
const INDEX_ATTR = 'data-points-v2-e024-index';
const VALUE_ATTR = 'data-points-v2-e024-value';
const STATE_ATTR = 'data-points-v2-e024-state';
const SIGNATURE_ATTR = 'data-points-v2-e024-signature';
const VIEW_ID = 'pointsv2';

/* Chaque sélecteur commence littéralement par `.points-v2-e024`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points V2.
 * Les signaux sont distincts de ceux de la passe 1 (`data-e024-*`) afin de ne
 * pas écraser ses marqueurs sur le DOM partagé. */
const CSS = `
  /* E024-01 / E024-06 : le détail reste une mesure bornée, le panneau et sa note
   * sont des frères de la liste, jamais des enfants (ARIA valide, E099 intact). */
  .points-v2-e024 .points-detail { min-width: 0; }
  .points-v2-e024 #${SUMMARY_ID} {
    margin: 7px 0 0;
    color: var(--text-2, var(--muted-2, inherit));
    font-size: 10px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  .points-v2-e024 #${NOTE_ID} {
    margin: 4px 0 0;
    color: var(--muted-2);
    font-size: 9px;
    line-height: 1.45;
  }
  /* E024-04 : l'ordre de lecture est doublé par un repère géométrique posé sur
   * la puce existante, sans toucher à son texte ni à ses classes. */
  .points-v2-e024 .points-families [role="listitem"] {
    border-left: 2px solid transparent;
    padding-left: 7px;
  }
  .points-v2-e024 .points-families [role="listitem"][${STATE_ATTR}="active"] {
    border-left-color: var(--gold-bright, var(--gold, currentColor));
    font-weight: 600;
  }
  /* E024-05 : l'ordinal est une décoration issue d'un attribut ; l'information
   * est aussi écrite en texte réel dans le panneau, jamais portée seule ici. */
  .points-v2-e024 .points-families [role="listitem"][${INDEX_ATTR}]::before {
    content: attr(${INDEX_ATTR}) " · ";
    color: var(--muted-2);
    font-variant-numeric: tabular-nums;
  }
  /* E024-09 : mouvement réduit, couplage JS (attribut) ET media query. */
  .points-v2-e024[${REDUCED_ATTR}="1"] .points-families [role="listitem"] {
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e024 .points-families [role="listitem"] { transition: none; }
  }
  /* E024-08 : couleurs forcées — le libellé, le rail et l'ordinal portent
   * l'information, aucune famille n'est reconnue par sa seule couleur. */
  @media (forced-colors: active) {
    .points-v2-e024 .points-families [role="listitem"] {
      border-left-color: CanvasText;
      color: CanvasText;
    }
    .points-v2-e024 .points-families [role="listitem"][${STATE_ATTR}="active"] {
      border-left-color: Highlight;
    }
    .points-v2-e024 #${SUMMARY_ID},
    .points-v2-e024 #${NOTE_ID} { color: CanvasText; }
  }
  /* E024-10 : repli mobile — le panneau reste dans le flux, sans débordement. */
  @media (max-width: 620px) {
    .points-v2-e024 #${SUMMARY_ID},
    .points-v2-e024 #${NOTE_ID} { overflow-wrap: anywhere; }
  }
  /* E024-10 : garde d'impression — le panneau est du texte statique, imprimable
   * sans décoration d'écran (les styles papier complets relèvent de E010). */
  @media print {
    .points-v2-e024 .points-families [role="listitem"] { border-left: 0; padding-left: 0; }
    .points-v2-e024 .points-families [role="listitem"][${INDEX_ATTR}]::before { content: none; }
  }
`;

/* E024-01 : requêtes défensives — un ctx minimal ou un DOM partiel ne doit
 * jamais faire lever d'exception dans la lentille. */
function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function queryAll(root, selector) {
  return isElement(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (value && typeof value.textContent === 'string') return value.textContent.replace(/\s+/g, ' ').trim();
  return '';
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function datasetOf(node) {
  return node && node.dataset && typeof node.dataset === 'object' ? node.dataset : null;
}

/* E024-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est pas
 * celui conservé est retiré ; un nœud détaché d'un rendu précédent est
 * inoffensif puisqu'il n'est plus dans le document. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E024-02 : le vocabulaire des familles vient des <option> du filtre rendu par
 * points.js:74-81, jamais d'une table codée en dur. Le filtre est repéré par son
 * aria-label, puis par le libellé d'option, avec repli sur la seconde liste. */
function familySelect(layout) {
  const selects = queryAll(layout, '.points-filters select');
  const labelled = selects.find((node) => /famille/i.test(getAttr(node, 'aria-label') || ''));
  if (labelled) return labelled;
  const byOption = selects.find((node) => queryAll(node, 'option')
    .some((option) => /famille/i.test(txt(option))));
  return byOption || selects[1] || null;
}

function optionPairs(select) {
  return queryAll(select, 'option')
    .map((option) => ({ value: txt(option.value), label: txt(option) }))
    .filter((pair) => pair.value && pair.value !== '*');
}

function valueFor(pairs, name) {
  const found = pairs.find((pair) => pair.label === name || pair.value === name);
  return found ? found.value : '';
}

function activeValue(select) {
  if (!select) return '';
  const value = txt(select.value);
  return value === '*' ? '' : value;
}

function activeLabel(select, value) {
  if (!value || !select) return '';
  const found = queryAll(select, 'option').find((option) => txt(option.value) === value);
  return found ? txt(found) : value;
}

/* E024-02 / E024-05 : source de vérité en trois replis, tous en lecture seule.
 * La passe 1 a déjà déplacé les <span> dans `#points-e024-list` en leur donnant
 * role=listitem ; on les lit là d'abord, puis dans toute liste `.points-families`,
 * enfin sur les <span> directs du détail si la passe 1 est absente. */
function familyItems(detail) {
  const fromList = queryAll(detail, '#points-e024-list [role="listitem"]')
    .filter((node) => !getAttr(node, 'data-points-e024-empty') && txt(node));
  if (fromList.length) return fromList;
  const fromGeneric = queryAll(detail, '.points-families [role="listitem"]').filter((node) => txt(node));
  if (fromGeneric.length) return fromGeneric;
  const values = optionPairs(familySelectFromDetail(detail)).map((pair) => pair.value);
  return Array.prototype.slice.call(detail.children || [])
    .filter((node) => node.tagName === 'SPAN' && txt(node)
      && (!values.length || values.indexOf(txt(node)) !== -1));
}

function familySelectFromDetail(detail) {
  const layout = detail && detail.parentElement ? detail.parentElement : null;
  return familySelect(layout) || familySelect(typeof document !== 'undefined' ? document : null);
}

function listContainer(detail) {
  return query(detail, '#points-e024-list') || query(detail, '.points-families');
}

/* E024-03 : compléter aria-describedby sans écraser les relations posées par la
 * passe 1 (`points-e024-note`) ni par une autre lentille. */
function augmentDescribedBy(list, id) {
  const existing = (getAttr(list, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(list, 'aria-describedby', existing.concat(id).join(' '));
}

/* E024-06 : panneau de lecture statique, créé au plus une fois par rendu avec
 * ctx.el (jamais innerHTML), inséré comme frère après la liste. */
function ensurePanel(ctx, detail, list) {
  let summary = enforceUnique(SUMMARY_ID, query(detail, '#' + SUMMARY_ID));
  let note = enforceUnique(NOTE_ID, query(detail, '#' + NOTE_ID));
  if (!summary) {
    summary = ctx.el('p', 'points-v2-e024-summary', '');
    summary.id = SUMMARY_ID;
    if (list && list.parentNode === detail) detail.insertBefore(summary, list.nextSibling);
    else detail.appendChild(summary);
  }
  if (!note) {
    note = ctx.el('p', 'points-v2-e024-note',
      'Une famille est un axe de lecture du point ; elle est active quand elle correspond au filtre courant. Le dénombrement est lu dans la fiche, non saisi à la main.');
    note.id = NOTE_ID;
    detail.insertBefore(note, summary.nextSibling);
  }
  return { summary, note };
}

/* E024-04 / E024-05 / E024-08 : enrichissement additif des puces existantes.
 * On ne touche ni au texte, ni aux classes, ni aux marques posées par E012 ou
 * par la passe 1 : seuls des attributs préfixés et aria-posinset/aria-setsize
 * sont ajoutés, ce qui renforce la sémantique de liste sans la réécrire. */
function decorateItems(items, pairs, value) {
  const total = items.length;
  items.forEach((item, index) => {
    const family = txt(item);
    const matched = valueFor(pairs, family);
    setAttr(item, INDEX_ATTR, (index + 1) + '/' + total);
    setAttr(item, VALUE_ATTR, matched);
    setAttr(item, STATE_ATTR, matched && matched === value ? 'active' : 'available');
    setAttr(item, 'aria-posinset', String(index + 1));
    setAttr(item, 'aria-setsize', String(total));
  });
}

/* E024-07 : une seule écriture par changement réel. La signature porte sur les
 * noms, leur ordre et le filtre actif ; elle est stockée sur le panneau lui-même,
 * donc aucun état de module ne survive à un rendu périmé. */
function signatureOf(names, value) {
  return names.join(' | ') + '||' + value;
}

function refresh(summary, layout, names, value, activeCount) {
  const signature = signatureOf(names, value);
  if (getAttr(summary, SIGNATURE_ATTR) === signature) return;
  setAttr(summary, SIGNATURE_ATTR, signature);

  const total = names.length;
  const lead = total
    ? 'Familles déclarées (' + total + ') : ' + names.join(', ') + '.'
    : 'Aucune famille déclarée pour ce point.';
  const state = value
    ? ' Filtre actif : ' + activeLabelFromPairs(layout, value) + ' (' + activeCount + ' puce'
      + (activeCount > 1 ? 's' : '') + ' correspondante' + (activeCount > 1 ? 's' : '') + ').'
    : ' Aucun filtre de famille actif.';
  summary.textContent = lead + state;

  const data = datasetOf(layout);
  if (data) {
    data[DATA_COUNT] = String(total);
    data[DATA_STATE] = total ? 'named' : 'empty';
    data[DATA_FILTER] = value || 'none';
  }
}

function activeLabelFromPairs(layout, value) {
  const select = familySelect(layout);
  return activeLabel(select, value) || value;
}

/* E024-09 : couplage explicite à la préférence de mouvement réduite, en plus de
 * la media query, pour les environnements sans matchMedia fiable. */
function applyReducedMotion(ctx, layout) {
  const reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.removeAttribute === 'function') layout.removeAttribute(REDUCED_ATTR);
}

function apply(ctx) {
  /* E024-01 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!isElement(layout)) return;
  const detail = query(layout, '.points-detail');
  if (!isElement(detail)) return;

  /* E024-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  const data = datasetOf(layout);
  if (data) data[DATA_SCOPE] = '1';
  setAttr(layout, DATA_SCOPE_ATTR, '1');

  const select = familySelect(layout);
  const pairs = optionPairs(select);
  const value = activeValue(select);
  const items = familyItems(detail);
  const names = items.map(txt).filter(Boolean);
  const list = listContainer(detail);
  const panel = ensurePanel(ctx, detail, list);
  const matched = items.map((item) => valueFor(pairs, txt(item)));
  const activeCount = matched.filter((entry) => entry && entry === value).length;

  decorateItems(items, pairs, value);
  augmentDescribedBy(list, NOTE_ID);
  refresh(panel.summary, layout, names, value, activeCount);
  applyReducedMotion(ctx, layout);
}

/* E024-10 : un seul greffon, enveloppé dans un try/catch muet : une lentille
 * défaillante est neutralisée par le registre, jamais fatale au rendu. */
register('E024', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
