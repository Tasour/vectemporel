import { register } from './registry.js';

/* Lentille POINTS E058 — passe 2 (V2) : noms historiques conservés avec leur
 * ère (domaine F : sémantique & données).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E058.md — chantiers E058-01 à
 * E058-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E058.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registre ou index) n'est modifié : la lentille V2 ajoute sa propre
 * portée CSS et son propre encadré, à côté de celui de la passe 1.
 *
 * points.js appelle runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) en
 * plus de la passe 1 : la vue ciblée est donc 'pointsv2'. L'encadré V2 porte des
 * identifiants et des signaux distincts de la passe 1 ; les deux lentilles
 * peuvent coexister sur le même DOM sans s'écraser ni se dupliquer.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Toutes les valeurs affichées sont dérivées du DOM rendu :
 * ère de la ligne active, ancrage de .points-meta, noms de .points-point-title
 * et .points-point-text. Aucun nom, aucune date, aucun millésime codé en dur.
 *
 * Invariants : un seul greffon, une seule feuille, un seul encadré V2, une
 * seule région d'annonce locale ; identifiants préfixés et dédupliqués ; tout
 * le DOM est bâti avec ctx.el ; aucune journalisation, aucun appel réseau,
 * aucun aléa, aucun timer, aucune animation image par image, aucun écouteur
 * global.
 */

const CSS_ID = 'points-v2-e058';
const SCOPE = 'points-v2-e058';
const PANEL_ID = 'points-v2-e058-panel';
const HEADING_ID = 'points-v2-e058-heading';
const ERA_ID = 'points-v2-e058-era';
const TIME_ID = 'points-v2-e058-time';
const VARIANTS_ID = 'points-v2-e058-variants';
const STATUS_ID = 'points-v2-e058-status';
const REDUCED_ATTR = 'data-points-v2-e058-reduced';
const VIEW_ID = 'pointsv2';

/* Signaux de test, tous préfixés et distincts de ceux de la passe 1
 * (data-points-e058-*) : la coexistence des deux lentilles est sans collision. */
const DATA_SCOPE = 'data-points-v2-e058';
const DATA_ERA = 'data-points-v2-e058-era';
const DATA_TIME = 'data-points-v2-e058-time';
const DATA_VARIANTS = 'data-points-v2-e058-variants';
const DATA_CHARTER = 'data-points-v2-e058-charter';
const DATA_SIGNATURE = 'data-points-v2-e058-signature';

/* Feuille unique, entièrement préfixée : chaque sélecteur, y compris dans les
 * requêtes @media, commence par `.points-v2-e058`. Aucune règle ne fuit hors de
 * la vue Points. Aucune animation propre ; la garde « réduit » ne neutralise
 * qu'une transition de couleur. */
const CSS = `
.points-v2-e058 .points-v2-e058-panel {
  box-sizing: border-box;
  margin: 12px 0 0; padding: 10px 12px;
  border: 1px solid var(--line-strong, #6b6b6b);
  border-left: 3px solid var(--gold, #e6b96f);
  border-radius: 8px;
  background: rgba(230, 185, 111, .05);
  color: var(--ink-soft, #d8dde6);
  font-size: 11px; line-height: 1.5;
  transition: border-color .18s linear;
}
.points-v2-e058 .points-v2-e058-heading {
  margin: 0 0 6px; font-family: var(--serif, Georgia, serif);
  font-size: 13px; color: var(--gold-bright, #f0d49a);
}
.points-v2-e058 .points-v2-e058-charte { margin: 0 0 8px; }
.points-v2-e058 .points-v2-e058-anchor {
  margin: 0; display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 4px 10px;
}
.points-v2-e058 .points-v2-e058-anchor dt {
  color: var(--muted, #9aa4b2); font-weight: 600;
}
.points-v2-e058 .points-v2-e058-anchor dd { margin: 0; overflow-wrap: anywhere; }
.points-v2-e058 .points-v2-e058-names { margin: 0; padding-left: 16px; }
.points-v2-e058 .points-v2-e058-name { margin: 0 0 3px; }
.points-v2-e058 .points-v2-e058-none { color: var(--muted-2, #8a94a3); }
.points-v2-e058 .points-v2-e058-status {
  margin: 8px 0 0; color: var(--gold, #e6b96f);
  font-variant-numeric: tabular-nums;
}
.points-v2-e058[data-points-v2-e058-reduced="1"] .points-v2-e058-panel { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e058 .points-v2-e058-panel { transition: none; }
}
@media (max-width: 620px) {
  .points-v2-e058 .points-v2-e058-anchor { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .points-v2-e058 .points-v2-e058-anchor dd { margin-bottom: 4px; }
  .points-v2-e058 .points-v2-e058-charte { font-size: 12px; }
}
@media (forced-colors: active) {
  .points-v2-e058 .points-v2-e058-panel {
    background: Canvas; color: CanvasText;
    border-color: CanvasText; border-left-color: Highlight;
  }
  .points-v2-e058 .points-v2-e058-anchor dt,
  .points-v2-e058 .points-v2-e058-status { color: CanvasText; }
}
@media print {
  .points-v2-e058 .points-v2-e058-panel { background: none; border-color: #999; }
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  return isElement(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function rootOf(ctx) {
  if (isElement(ctx.layout)) return ctx.layout;
  if (isElement(ctx.stage)) return ctx.stage;
  return null;
}

/* E058-04 : un contenu entre parenthèses n'est un nom conservé que s'il porte
 * au moins deux lettres et autant de lettres que de chiffres. Les groupes
 * purement numériques ou datés (« 1911 », « 1897–1904 ») et les expressions
 * de bornes (« jusqu'en… », « vers… », « environ… », « siècle », « année »)
 * sont écartés : ils ne deviennent jamais des noms historiques inventés. */
function isNameLike(value) {
  if (!value) return false;
  if (/^(?:jusqu|vers|environ|env|après|apr|avant|av|ca|c)\b/i.test(value)) return false;
  if (/\b(?:siècle|millénaire|année|annee|ans|date|environ|jusqu|vers)\b/i.test(value)) return false;
  const letters = (value.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
  const digits = (value.match(/\d/g) || []).length;
  return letters >= 2 && letters >= digits;
}

/* E058-04 / E058-05 : collecte des segments conservés tels quels dans le titre
 * et le texte du point. Deux sources seulement, toutes deux lues dans le DOM :
 * variante entre parenthèses et nom propre introduit par un qualificatif
 * d'époque (ancien/ancienne/autrefois/jadis/alors) suivi d'une majuscule.
 * La déduplication préserve l'ordre d'apparition ; aucune valeur n'est traduite,
 * corrigée ou coupée. */
function detectNames(root) {
  const found = [];
  const seen = new Set();
  const add = (value, source) => {
    const clean = String(value || '').trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    found.push({ value: clean, source });
  };

  const title = query(root, '.points-point-title');
  const text = query(root, '.points-point-text');
  [['titre', title], ['texte', text]].forEach(([source, node]) => {
    const value = txt(node);
    if (!value) return;
    const parens = /\(([^()]*)\)/g;
    let match = parens.exec(value);
    while (match) {
      if (isNameLike(match[1])) add(match[1], source);
      match = parens.exec(value);
    }
    const marked = /\b(?:[Aa]ncien(?:ne)?s?|[Aa]utrefois|[Jj]adis|[Aa]lors)\s+([A-ZÀ-ÖØ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*)/g;
    match = marked.exec(value);
    while (match) {
      add(match[1], source);
      match = marked.exec(value);
    }
  });
  return found;
}

/* E058-02 : l'ère est celle de la ligne active de la matrice ; points.js filtre
 * en effet les points visibles sur eraId === era.id. Repli sur l'aria-current
 * écrit par E004 si présent, puis sur une phrase explicite plutôt qu'un nom
 * supposé. Aucune ère n'est écrite en dur dans le module. */
function eraOf(root) {
  const active = query(root, '.points-grid-row.is-active .points-era');
  if (active) return txt(active);
  const current = query(root, '.points-era[aria-current="true"]');
  return current ? txt(current) : '';
}

/* E058-03 : l'ancrage temporel est le troisième span de `.points-meta`
 * (domaine, échelle, temps, certitude). Repli : premier span contenant un
 * chiffre. Si la fiche n'affiche rien, on le dit au lieu d'inventer une date. */
function timeOf(root) {
  const meta = query(root, '.points-meta');
  if (!meta) return '';
  const spans = nodes(meta, 'span');
  if (spans.length >= 3) {
    const value = txt(spans[2]);
    if (value) return value;
  }
  const numeric = spans.map(txt).find((value) => /\d/.test(value));
  return numeric || '';
}

function signatureOf(era, time, names) {
  return [era, time, names.map((name) => name.source + ':' + name.value).join('|')].join('~');
}

/* E058-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est pas
 * celui conservé est retiré du document ; un nœud détaché d'un rendu antérieur
 * n'est pas ciblé par la recherche et reste inoffensif. Seuls les identifiants
 * V2 sont visités : l'encadré de la passe 1 n'est jamais inquiété. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function panelById(id, detail) {
  const candidates = nodesById(id);
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) return candidate;
  }
  return null;
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
}

/* E058-01 : charte statique, toujours affichée, sans modale ni région live
 * supplémentaire. Elle énonce la règle avant même qu'un nom soit détecté. */
function buildPanel(ctx, panel) {
  put(panel, 'role', 'region');
  put(panel, 'aria-labelledby', HEADING_ID);

  const heading = ctx.el('h4', 'points-v2-e058-heading', 'Noms historiques et leur ère');
  heading.id = HEADING_ID;
  panel.appendChild(heading);

  panel.appendChild(ctx.el('p', 'points-v2-e058-charte',
    'Charte : un nom d’époque est conservé tel que la source le donne — il n’est ni modernisé ni traduit. Une variante entre parenthèses est un nom historique, pas une correction : elle reste attachée à son ère et à l’ancrage du point. Un groupe purement numérique ou daté n’est pas traité comme un nom. Cette lecture n’efface ni ne réécrit la fiche.'));

  const anchor = ctx.el('dl', 'points-v2-e058-anchor');
  [['Ère du point', ERA_ID],
    ['Ancrage temporel', TIME_ID],
    ['Noms / variantes conservés', VARIANTS_ID]].forEach(([label, id]) => {
    anchor.appendChild(ctx.el('dt', '', label));
    const dd = ctx.el('dd', '');
    dd.id = id;
    anchor.appendChild(dd);
  });
  panel.appendChild(anchor);

  /* E058-07 : une seule région live LOCALE, dédiée au V2, distincte de celle
   * de la passe 1 (l'api de cette vue n'expose pas de say()). */
  const status = ctx.el('p', 'points-v2-e058-status', '');
  status.id = STATUS_ID;
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');
  put(status, 'aria-atomic', 'true');
  panel.appendChild(status);
}

/* E058-03 / E058-05 : chaque variante est copiée verbatim depuis le DOM, avec
 * son ère et son ancrage ajoutés autour, jamais à l'intérieur du nom. */
function fillPanel(ctx, panel, era, time, names) {
  const eraNode = query(panel, '#' + ERA_ID);
  const timeNode = query(panel, '#' + TIME_ID);
  const variants = query(panel, '#' + VARIANTS_ID);
  const status = query(panel, '#' + STATUS_ID);
  if (!eraNode || !timeNode || !variants || !status) return false;

  eraNode.textContent = era || 'Ère non précisée dans la matrice';
  timeNode.textContent = time || 'Ancrage non affiché dans cette fiche';

  variants.replaceChildren();
  if (!names.length) {
    variants.appendChild(ctx.el('span', 'points-v2-e058-none',
      'Aucune variante détectée : le nom du point est conservé tel quel avec son ère.'));
  } else {
    const list = ctx.el('ul', 'points-v2-e058-names');
    names.forEach((name) => {
      const suffix = time ? ' · ancrage : ' + time : '';
      list.appendChild(ctx.el('li', 'points-v2-e058-name',
        '« ' + name.value + ' » — conservé tel quel · ère : '
        + (era || 'non précisée') + suffix + ' · relevé dans le ' + name.source + '.'));
    });
    variants.appendChild(list);
  }

  status.textContent = 'Ancrage historique : ère ' + (era || 'non précisée')
    + ' · ' + names.length + ' nom(s) ou variante(s) conservé(s) tel(s) quel(s).';
  return true;
}

/* E058-01 / E058-08 / E058-09 / E058-10 : unique point d'entrée, gardes
 * structurelles, feuille unique, portée unique, réconciliation par identifiant
 * et repli silencieux sur une structure inattendue. */
function apply(ctx) {
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const root = rootOf(ctx);
  if (!root) return;

  /* E058-09 : CSS unique et portée ancrée sur la vue réellement rendue. */
  ctx.css(CSS_ID, CSS);
  root.classList.add(SCOPE);
  put(root, DATA_SCOPE, '1');

  /* E058-09 : couplage explicite à la préférence de mouvement réduite, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) put(root, REDUCED_ATTR, '1');
  else if (typeof root.hasAttribute === 'function' && root.hasAttribute(REDUCED_ATTR)) {
    root.removeAttribute(REDUCED_ATTR);
  }

  const detail = query(root, '.points-detail');
  if (!isElement(detail)) return;

  const era = eraOf(root);
  const time = timeOf(root);
  const names = detectNames(root);
  const signature = signatureOf(era, time, names);

  /* E058-10 : réconciliation par identifiant, jamais de doublon ; les nœuds
   * V2 périmés sont retirés, l'encadré de la passe 1 est laissé intact. */
  let panel = panelById(PANEL_ID, detail);
  nodesById(PANEL_ID).forEach((node) => { if (node !== panel) removeNode(node); });
  if (!panel) {
    panel = ctx.el('section', 'points-v2-e058-panel');
    panel.id = PANEL_ID;
    buildPanel(ctx, panel);
    const nav = query(detail, '.points-nav');
    if (isElement(nav) && nav.parentElement === detail) detail.insertBefore(panel, nav);
    else detail.appendChild(panel);
  }
  enforceUnique(HEADING_ID, query(panel, '#' + HEADING_ID));
  enforceUnique(ERA_ID, query(panel, '#' + ERA_ID));
  enforceUnique(TIME_ID, query(panel, '#' + TIME_ID));
  enforceUnique(VARIANTS_ID, query(panel, '#' + VARIANTS_ID));
  enforceUnique(STATUS_ID, query(panel, '#' + STATUS_ID));

  /* E058-10 : signature portée par l'encadré (aucun état global de module) —
   * aucun live bavard, aucune réécriture si l'ancrage n'a pas changé. */
  if (getAttr(panel, DATA_SIGNATURE) !== signature) {
    if (!fillPanel(ctx, panel, era, time, names)) return;
    put(panel, DATA_SIGNATURE, signature);
  }

  /* E058-08 : signaux DOM préfixés, lisibles par un harnais ou une autre
   * lentille sans occuper de nom générique ni écraser la passe 1. */
  put(detail, DATA_ERA, era);
  put(detail, DATA_TIME, time);
  put(detail, DATA_VARIANTS, String(names.length));
  put(detail, DATA_CHARTER, '1');
}

register('E058', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return; // une structure inattendue neutralise la lentille, jamais la vue.
  }
});
