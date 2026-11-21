import { register } from './registry.js';

/* Lentille POINTS E095 — Pédagogie & narration : glossaire défini à la première
 * occurrence (certitude, ère, domaine, échelle). Domaine J.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E095.md — chantiers E095-01 à E095-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css('points-e095', …), el. Le greffon
 * ne dépend ni du store, ni du routeur, ni d'une autre lentille : il lit le DOM
 * rendu par points.js (matrice, filtres, fiche) et reste actif avec un ctx minimal.
 *
 * Principe pédagogique : chaque terme du glossaire est DÉFINI à sa première
 * occurrence dans la vue (titre + description accessible + repère en exposant),
 * puis simplement SIGNALÉ (sans redéfinition) aux occurrences suivantes. Toutes
 * les définitions chiffrées sont recalculées depuis le DOM : aucun millésime,
 * aucun total, aucune valeur de certitude ou d'échelle codés en dur.
 *
 * Invariants :
 * - une seule feuille CSS, un seul glossaire, une seule région live ;
 * - tous les identifiants sont préfixés `points-e095-` ;
 * - non destructif : aucun texte, aucune classe d'origine, aucun gestionnaire
 *   natif n'est retiré ; les relations ARIA sont fusionnées, pas écrasées ;
 * - idempotent : les nœuds sont réutilisés par identifiant et relogés ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, aucune journalisation, aucune
 *   réinterprétation de balisage.
 */

const CSS_ID = 'points-e095';
const GLOSSARY_ID = 'points-e095-glossary';
const TITLE_ID = 'points-e095-title';
const LIST_ID = 'points-e095-list';
const METRICS_ID = 'points-e095-metrics';

/* E095-01 : les quatre termes du champ lexical, dans l'ordre de lecture de la
 * vue (matrice puis fiche). Le repère en exposant est un glyphe, jamais une
 * couleur : l'information survit au daltonisme et à l'impression. */
const TERMS = Object.freeze([
  Object.freeze({ key: 'ere', label: 'ère', mark: '¹' }),
  Object.freeze({ key: 'domaine', label: 'domaine', mark: '²' }),
  Object.freeze({ key: 'echelle', label: 'échelle', mark: '³' }),
  Object.freeze({ key: 'certitude', label: 'certitude', mark: '⁴' }),
]);

/* E095-03 : motifs appliqués au texte SANS accents (voir norm()). */
const RE = Object.freeze({
  ere: /\beres?\b/i,
  domaine: /\bdomaines?\b/i,
  echelle: /\bechelles?\b/i,
  certitude: /\bcertitudes?\b/i,
});

/* E095-04 : définitions courtes affichées dans le `title` de la première
 * occurrence. Ce sont des définitions de mots, jamais des données historiques. */
const SHORT = Object.freeze({
  ere: 'tranche de temps nommée qui structure le récit',
  domaine: 'champ de savoir auquel appartient un point validé',
  echelle: 'portée du point décrit, du fait local au phénomène étendu',
  certitude: 'degré de confiance attaché au point validé',
});

const CSS = `
.points-e095-glossary {
  margin: 10px 0 14px; padding: 12px 14px;
  border: 1px solid var(--line-strong, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f);
  border-radius: 10px; background: rgba(8,11,16,.94);
  color: var(--ink-soft, #d8d8d8); font-size: 12px; line-height: 1.5;
}
.points-e095-glossary[hidden] { display: none; }
.points-e095-h {
  margin: 0 0 4px; font-family: var(--serif, serif);
  font-size: 15px; color: var(--gold-bright, #e9c98f);
}
.points-e095-lead { margin: 0 0 8px; color: var(--muted, #9a9a9a); font-size: 11px; }
.points-e095-list { margin: 0; padding: 0; display: grid; gap: 6px; }
.points-e095-entry {
  display: grid; grid-template-columns: minmax(78px, auto) minmax(0, 1fr);
  gap: 8px; align-items: baseline;
}
.points-e095-entry dt { color: var(--gold, #e6b96f); font-weight: 600; }
.points-e095-entry dd { margin: 0; }
.points-e095-dfn { font-style: normal; }
.points-e095-jump {
  display: inline-flex; align-items: center; min-height: 24px;
  margin-left: 6px; color: var(--gold-bright, #e9c98f);
  font-size: 11px; text-underline-offset: 2px;
}
.points-e095-jump:focus-visible { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px; }
.points-e095-metrics {
  margin: 8px 0 0; color: var(--muted, #9a9a9a);
  font-size: 11px; font-variant-numeric: tabular-nums;
}
.points-e095-first {
  cursor: help;
  text-decoration: underline dotted var(--gold, #e6b96f);
  text-underline-offset: 3px;
}
.points-e095-first::after {
  content: attr(data-points-e095-mark); margin-left: 2px;
  font-size: .8em; vertical-align: super;
  color: var(--gold-bright, #e9c98f); text-decoration: none;
}
.points-e095-first:focus-visible { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px; }
select.points-e095-first { outline: 1px dotted var(--gold, #e6b96f); outline-offset: 2px; }
.points-e095-next {
  text-decoration: underline dotted var(--muted, #9a9a9a);
  text-underline-offset: 2px;
}
@media (max-width: 620px) {
  .points-e095-entry { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .points-e095-jump { transition: none; }
}
@media (forced-colors: active) {
  .points-e095-first, .points-e095-next,
  select.points-e095-first { text-decoration-color: Highlight; outline-color: Highlight; }
  .points-e095-first::after { color: CanvasText; }
  .points-e095-h, .points-e095-entry dt { color: CanvasText; }
}
`;

let lastMetrics = '';
let lastMetricsNode = null;

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* E095-03 : mise en forme sans accents pour une recherche de mots insensible
 * aux majuscules et aux diacritiques (« Ère » ≈ « ères » ≈ « ERE »). */
function norm(value) {
  return String(value == null ? '' : value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function elements(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function firstBy(list, predicate) {
  for (let index = 0; index < list.length; index += 1) {
    if (predicate(list[index], index)) return list[index];
  }
  return null;
}

/* E095-05 : fusion additive d'une relation ARIA, jamais écrasement d'une
 * relation posée par une autre lentille (E004, E044, E045…). */
function addDescribedBy(node, id) {
  const current = txt(node.getAttribute('aria-describedby'));
  const parts = current ? current.split(/\s+/).filter(Boolean) : [];
  if (parts.indexOf(id) === -1) parts.push(id);
  node.setAttribute('aria-describedby', parts.join(' '));
}

function setTitleIfEmpty(node, value) {
  if (!txt(node.getAttribute('title'))) node.setAttribute('title', value);
}

/* E095-03 : parcours des nœuds texte dans l'ordre du document, en excluant le
 * glossaire lui-même (sinon ses propres définitions compteraient comme
 * occurrences) et les feuilles script/style. */
function walkMatches(root, glossary, regex) {
  const found = [];
  if (!root || typeof document.createTreeWalker !== 'function') return found;
  const walker = document.createTreeWalker(root, 4, null);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    const value = norm(node.nodeValue || '');
    if (parent && value && regex.test(value)
      && !(glossary && (parent === glossary || glossary.contains(parent)))
      && !/^(SCRIPT|STYLE)$/.test(parent.tagName)
      && found.indexOf(parent) === -1) {
      found.push(parent);
    }
    node = walker.nextNode();
  }
  return found;
}

/* E095-03/06 : ancre sémantique de chaque terme et liste de ses occurrences.
 * Pour « ère » et « domaine », l'ancre est le premier support réel du mot dans
 * la lecture ; pour « échelle » et « certitude », le mot n'apparaît pas à
 * l'écran : l'ancre est la valeur de la fiche qui porte le concept. */
function findAnchors(root, glossary) {
  const occ = Object.create(null);
  TERMS.forEach((term) => { occ[term.key] = walkMatches(root, glossary, RE[term.key]); });

  const headSpans = elements(root, '.points-grid-row.is-head > span');
  const selects = elements(root, '.points-filters select');
  const metaSpans = elements(root, '.points-detail .points-meta > span');
  const confidence = firstBy(elements(root, '.points-detail .points-meta .confidence'), () => true)
    || metaSpans[3] || null;

  const anchors = Object.create(null);
  anchors.ere = firstBy(headSpans, (node) => /^ère$/i.test(txt(node)))
    || occ.ere[0] || elements(root, '.points-era')[0] || null;
  anchors.domaine = firstBy(selects, (node) => /domaine/i.test(node.getAttribute('aria-label') || ''))
    || occ.domaine[0] || selects[0] || null;
  anchors.echelle = metaSpans[1] || occ.echelle[0] || null;
  anchors.certitude = confidence || occ.certitude[0] || null;

  /* Une occurrence contenue dans l'ancre (ex. l'option « Tous les domaines »
   * du select) est déjà couverte par la définition : on ne la redéfinit pas. */
  const next = Object.create(null);
  TERMS.forEach((term) => {
    const anchor = anchors[term.key];
    next[term.key] = occ[term.key].filter((node) => node !== anchor && !(anchor && anchor.contains(node)));
  });

  return { anchors, next, occ };
}

/* E095-02 : définitions entièrement dérivées du DOM rendu. Les seuls nombres
 * affichés sont des décomptes de lignes/colonnes et les valeurs lues dans la
 * fiche ; aucun chiffre ni millésime n'est littéral. */
function definitions(root) {
  const eras = elements(root, '.points-grid-row:not(.is-head)').length;
  const headers = elements(root, '.points-grid-row.is-head > span');
  const domains = Math.max(0, headers.length - 1); // première colonne = « Ère »
  const metaSpans = elements(root, '.points-detail .points-meta > span');
  const scaleNode = metaSpans[1] || null;
  const confNode = firstBy(elements(root, '.points-detail .points-meta .confidence'), () => true)
    || metaSpans[3] || null;
  const scale = scaleNode ? txt(scaleNode) : '';
  const conf = confNode ? txt(confNode) : '';

  return {
    ere: `Une ère est une tranche de temps nommée qui structure le récit : chaque ligne de la matrice en est une. La vue en affiche ${eras} ; la ligne courante est repérée dans la matrice.`,
    domaine: `Un domaine est un champ de savoir auquel appartient un point validé : chaque colonne de la matrice en est un. La vue en affiche ${domains} ; le premier filtre permet de n'en conserver qu'un.`,
    echelle: scale
      ? `L'échelle indique la portée du point décrit, du fait local au phénomène étendu. Le point affiché porte l'échelle « ${scale} » dans sa fiche.`
      : 'L’échelle indique la portée du point décrit, du fait local au phénomène étendu. Aucun point n’est affiché dans ce périmètre : sa valeur n’est pas renseignée.',
    certitude: conf
      ? `La certitude est le degré de confiance attaché au point validé, affiché dans sa fiche. Le point affiché porte la mention « ${conf} » ; elle est aussi codée par une classe de la fiche.`
      : 'La certitude est le degré de confiance attaché au point validé, affiché dans sa fiche. Aucun point n’est affiché dans ce périmètre : sa mention n’est pas renseignée.',
  };
}

/* E095-04/06 : une seule définition par terme, posée sur la première occurrence
 * (id, repère, titre, description ARIA). Les occurrences suivantes reçoivent
 * seulement un signal discret, sans titre ni description : elles ne sont pas
 * redéfinies. Retourne les identifiants réellement utilisés pour les liens. */
function markAnchors(anchors, next) {
  const ids = Object.create(null);
  let marked = 0;

  TERMS.forEach((term) => {
    const anchor = anchors[term.key];
    if (!anchor || typeof anchor.setAttribute !== 'function') return;

    const wanted = 'points-e095-first-' + term.key;
    let id = anchor.id;
    if (!id) {
      anchor.id = wanted;
      id = wanted;
    } else if (document.getElementById(wanted) && document.getElementById(wanted) !== anchor) {
      id = ''; // collision : on garde le signal DOM, sans lien de saut
    }
    if (id) ids[term.key] = id;

    anchor.setAttribute('data-points-e095-first', term.key);
    anchor.setAttribute('data-points-e095-mark', term.mark);
    anchor.classList.add('points-e095-first');
    /* Un contrôle natif (notamment le `<select>` du filtre « domaine ») garde
     * son tabIndex : le rendre programmatiquement focusable ne doit jamais le
     * retirer de l'ordre de tabulation. Seuls les `<span>` et `<div>` sans
     * focus natif reçoivent tabIndex=-1 pour la cible du lien de saut. */
    const tag = String(anchor.tagName || '').toUpperCase();
    const nativeFocusable = /^(BUTTON|SELECT|INPUT|TEXTAREA|A)$/.test(tag) || anchor.hasAttribute('href');
    if (!nativeFocusable) {
      try { anchor.tabIndex = -1; } catch { /* repli silencieux */ }
    }
    setTitleIfEmpty(anchor, `${term.label} : ${SHORT[term.key]} (définition dans le glossaire).`);
    addDescribedBy(anchor, 'points-e095-def-' + term.key);
    marked += 1;

    next[term.key].forEach((node) => {
      if (!node || node === anchor || typeof node.setAttribute !== 'function') return;
      node.setAttribute('data-points-e095-next', term.key);
      node.classList.add('points-e095-next');
    });
  });

  return { ids, marked };
}

/* E095-01/07 : structure statique du glossaire, reconstruite par nœuds créés.
 * Rôle `region` non modal : aucun role=dialog, aucun aria-modal, aucun piège de
 * focus ; la définition de chaque terme est un `<dfn>` dans une liste `<dl>`. */
function buildGlossary(ctx, glossary, defs, ids) {
  const el = ctx.el;
  glossary.replaceChildren();
  glossary.setAttribute('role', 'region');
  glossary.setAttribute('aria-labelledby', TITLE_ID);

  const heading = el('h2', 'points-e095-h', 'Glossaire — lire la matrice Points');
  heading.id = TITLE_ID;
  glossary.appendChild(heading);

  glossary.appendChild(el('p', 'points-e095-lead',
    'Quatre mots reviennent dans cette vue. Ils sont définis dès leur première occurrence, signalée par un repère en exposant ; les occurrences suivantes sont simplement signalées, sans être redéfinies.'));

  const list = el('dl', 'points-e095-list');
  list.id = LIST_ID;
  TERMS.forEach((term) => {
    const entry = el('div', 'points-e095-entry');
    const dt = el('dt');
    const dfn = el('dfn', 'points-e095-dfn', term.label);
    dfn.id = 'points-e095-def-' + term.key;
    dt.appendChild(dfn);

    const dd = el('dd');
    dd.appendChild(el('span', 'points-e095-def', defs[term.key]));
    if (ids[term.key]) {
      const jump = el('a', 'points-e095-jump', 'Voir la première occurrence');
      jump.href = '#' + ids[term.key];
      dd.appendChild(jump);
    }
    entry.append(dt, dd);
    list.appendChild(entry);
  });
  glossary.appendChild(list);

  const metrics = el('p', 'points-e095-metrics', '');
  metrics.id = METRICS_ID;
  metrics.setAttribute('role', 'status');
  metrics.setAttribute('aria-live', 'polite');
  metrics.setAttribute('aria-atomic', 'true');
  glossary.appendChild(metrics);
}

/* E095-08 : compteurs auditables, réécrits seulement quand le nœud change ou
 * que le texte change (un même rendu réappliqué ne bavarde pas). */
function writeMetrics(glossary, marked, occ) {
  const node = glossary && glossary.querySelector('#' + METRICS_ID);
  if (!node) return;
  let total = 0;
  TERMS.forEach((term) => { total += occ[term.key] ? occ[term.key].length : 0; });
  const text = `Glossaire : ${TERMS.length} termes définis · ${marked} premières occurrences marquées · ${total} occurrences relevées.`;
  if (node === lastMetricsNode && text === lastMetrics) return;
  lastMetricsNode = node;
  lastMetrics = text;
  node.textContent = text;
}

/* E095-10 : réutilise un nœud par identifiant, le déplace s'il est mal parenté,
 * ne crée qu'un glossaire et n'écrase aucun contenu existant. */
function place(ctx, id, tag, className, parent, before) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  node = document.getElementById(id);
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  if (before && before.parentElement === parent) parent.insertBefore(node, before);
  else if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const root = rootOf(ctx);
  if (!root || typeof root.querySelector !== 'function') return;
  const matrix = root.querySelector('.points-matrix')
    || (root.classList && root.classList.contains('points-matrix') ? root : null);
  if (!matrix || typeof matrix.insertBefore !== 'function') return;

  ctx.css(CSS_ID, CSS);

  /* Le glossaire d'un rendu précédent est exclu du comptage des occurrences,
   * mais ses identifiants restent réutilisés pour l'idempotence. */
  const previous = document.getElementById(GLOSSARY_ID);
  const fresh = !(previous && previous.isConnected);
  if (fresh) {
    lastMetrics = '';
    lastMetricsNode = null;
  }

  const found = findAnchors(root, previous);
  const defs = definitions(root);
  const marked = markAnchors(found.anchors, found.next);

  const before = matrix.querySelector('.points-grid');
  const glossary = place(ctx, GLOSSARY_ID, 'section', 'points-e095-glossary', matrix, before);
  buildGlossary(ctx, glossary, defs, marked.ids);
  writeMetrics(glossary, marked.marked, found.occ);

  if (root.dataset) {
    root.dataset.pointsE095 = '1';
    root.dataset.pointsE095Terms = TERMS.map((term) => term.key).join(',');
    root.dataset.pointsE095First = Object.keys(marked.ids).join(',');
  }
}

register('E095', install);
