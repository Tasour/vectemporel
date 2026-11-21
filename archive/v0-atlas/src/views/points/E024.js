import { register } from './registry.js';

/* Lentille E024 — Détail & fiche : familles du point en puces sémantiques
 * (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E024.md — chantiers E024-01 à E024-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js`, les
 * lentilles voisines (E012 : pilules de filtre, E054 : légende des familles,
 * E027 : composition du texte, E099 : alternative textuelle) et `styles.css`
 * sont lus mais jamais modifiés ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucun appel au magasin, aucun contrôle retiré, aucune valeur
 * historique ni aucun libellé de famille codé en dur : tout est lu dans le DOM
 * rendu (les <span> de points.js:108-109 et les <option> de la liste familles).
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS, un seul conteneur de familles ;
 * - les <span> d'origine sont DÉPLACÉS, jamais recréés ni réécrits (zéro
 *   innerHTML, zéro textContent sur une puce existante) ;
 * - aucune région live supplémentaire : E041 porte déjà l'annonce unique ;
 * - un seul observateur, ciblé sur des signaux en lecture seule, jamais sur
 *   notre liste (sinon boucle d'écriture) ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro rAF, zéro console.*.
 */

const CSS_ID = 'points-e024';
const SCOPE = 'points-e024';
const LIST_ID = 'points-e024-list';
const LABEL_ID = 'points-e024-label';
const NOTE_ID = 'points-e024-note';
const METRICS_ID = 'points-e024-metrics';

/* Une seule feuille, préfixée par `.points-e024` (classe posée sur .points-layout).
 * Les règles ciblent le DOM réel de points.js : .points-detail, .points-families,
 * .points-meta, .points-point-title, .points-point-text, .points-sources,
 * .points-justification, .points-nav. Aucune ressource distante, aucun @import. */
const CSS = `
/* E024-01 / E024-03 : le conteneur hérite de la présentation en pilules déjà
 * définie par styles.css (.points-families span) ; nous n'ajoutons que la
 * sémantique et les repères, sans redéfinir les couleurs des familles. */
.${SCOPE} .points-detail .points-families {
  margin: 12px 0;
  min-width: 0;
}
/* E024-04 : libellé visible du groupe, attaché à la liste par aria-labelledby.
 * C'est un <p> et non un <span> : E099 lit les <span> enfants directs du détail. */
.${SCOPE} #${LABEL_ID} {
  margin: 0 0 5px;
  color: var(--muted-2);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
}
/* E024-03 : chaque puce est le <span role=listitem> d'origine, déplacé ; on
 * garantit une cible et une mesure lisibles sans toucher à son libellé. */
.${SCOPE} #${LIST_ID} [role="listitem"] {
  min-height: 24px;
  padding: 4px 9px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
/* E024-04 : la note explicative reste hors région live, comme les compteurs. */
.${SCOPE} #${NOTE_ID} {
  margin: 5px 0 0;
  color: var(--muted-2);
  font-size: 9px;
  line-height: 1.45;
}
/* E024-07 : compteurs auditables, texte brut (pas de role=status : E041). */
.${SCOPE} #${METRICS_ID} {
  margin: 4px 0 0;
  color: var(--muted-2);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}
/* E024-06 : état vide explicite, jamais une liste fantôme. */
.${SCOPE} #${LIST_ID}.is-empty [data-points-e024-empty] {
  color: var(--muted-2);
  font-size: 10px;
  font-style: italic;
}
/* E024-09 : mouvement réduit, couplé au signal JS et à la media query. */
.${SCOPE}[data-e024-motion="reduced"] #${LIST_ID} [role="listitem"] {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .${SCOPE} #${LIST_ID} [role="listitem"] { transition: none; }
}
/* E024-09 : couleurs forcées — libellé et bordure portent l'information,
 * aucune famille n'est reconnue par sa seule couleur de fond. */
@media (forced-colors: active) {
  .${SCOPE} #${LIST_ID} [role="listitem"] {
    border: 1px solid CanvasText;
    color: CanvasText;
  }
  .${SCOPE} #${LABEL_ID} { color: CanvasText; }
}
/* E024-09 : repli mobile — la liste reste dans le flux, sans débordement. */
@media (max-width: 620px) {
  .${SCOPE} #${LIST_ID} { flex-wrap: wrap; }
  .${SCOPE} #${LIST_ID} [role="listitem"] { max-width: 100%; }
}
`;

let layout = null;          // .points-layout du rendu courant
let currentCtx = null;       // dernier ctx reçu, pour l'observateur
let detail = null;           // .points-detail du rendu courant
let familySelect = null;     // <select> des familles (source des valeurs)
let listNode = null;         // #points-e024-list (conteneur role=list)
let metricsNode = null;      // #points-e024-metrics (compteurs)
let observer = null;         // observateur unique, hors de notre liste
let renderedSignature = '';  // signature anti-écriture redondante
let updateCount = 0;         // actualisations réelles
let emptyNode = null;        // texte d'état vide, créé une seule fois

/* Sélecteurs défensifs : un ctx minimal ou un DOM partiel ne doit jamais faire
 * lever d'exception dans la lentille (E024-01). */
function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function textOf(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

/* E024-02 : la liste des familles offertes vient des <option> de la vue, jamais
 * d'une table codée en dur. Le libellé d'une puce est comparé à ces valeurs. */
function findFamilySelect(filters) {
  const selects = qa(filters, 'select');
  const labelled = selects.find((node) => /famille/i.test(node.getAttribute('aria-label') || ''));
  if (labelled) return labelled;
  const byOption = selects.find((node) => qa(node, 'option')
    .some((option) => /familles/i.test(textOf(option))));
  return byOption || selects[1] || null;
}

function familyValues(select) {
  const values = qa(select, 'option')
    .map((option) => String(option.value || '').trim())
    .filter((value) => value && value !== '*');
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr'));
}

/* E024-02 / E024-05 : au premier passage, les familles sont des <span> enfants
 * directs de .points-detail (points.js:108-109). Aux passages suivants, elles
 * sont déjà dans notre liste : on les relit là, sans en créer de nouvelles. */
function familySpans() {
  if (listNode && listNode.isConnected) {
    return qa(listNode, '[role="listitem"]').filter((n) => !n.hasAttribute('data-points-e024-empty') && textOf(n));
  }
  if (!detail) return [];
  const values = familyValues(familySelect);
  const direct = Array.from(detail.children || []).filter((node) => node.tagName === 'SPAN');
  if (!values.length) return direct.filter((node) => textOf(node));
  return direct.filter((node) => values.includes(textOf(node)));
}

function familyNames() {
  return familySpans().map(textOf).filter(Boolean);
}

/* E024-06 : état vide explicite. Le nœud est créé une seule fois et réutilisé
 * (aucune écriture répétée). */
function ensureEmptyNode(ctx) {
  if (emptyNode) return emptyNode;
  emptyNode = ctx.el('span', '', 'Aucune famille déclarée pour ce point.');
  emptyNode.setAttribute('role', 'listitem');
  emptyNode.setAttribute('data-points-e024-empty', '1');
  return emptyNode;
}

/* E024-03 / E024-04 / E024-05 / E024-06 / E024-07 : construction statique
 * unique. Les puces d'origine sont DÉPLACÉES dans le conteneur via appendChild :
 * le nœud et son texte survivent, ainsi que les marques posées par E012.
 * Le conteneur ne contient QUE des listitems (ARIA valide) ; libellé, note et
 * compteurs sont des <p> frères, donc invisibles pour E099. */
function buildList(ctx, spans) {
  const box = ctx.el('div', 'points-families');
  box.id = LIST_ID;
  box.setAttribute('role', 'list');
  box.setAttribute('aria-labelledby', LABEL_ID);
  box.setAttribute('aria-describedby', NOTE_ID);

  /* Insertion à la place de la première puce, pour préserver l'ordre de la
   * fiche (titre, texte, meta, familles, sources, justification, nav). L'ancre
   * est capturée AVANT le déplacement des puces dans le conteneur. */
  const anchor = spans[0] || null;
  if (anchor && anchor.parentElement === detail) detail.insertBefore(box, anchor);
  else detail.appendChild(box);

  spans.forEach((span) => {
    span.setAttribute('role', 'listitem');
    span.setAttribute('data-points-e024-family', textOf(span));
    box.appendChild(span); /* déplacement, pas de copie */
  });

  const label = ctx.el('p', '', 'Familles du point');
  label.id = LABEL_ID;
  const note = ctx.el('p', '', 'Une famille dit quelle question le point éclaire ; un point peut en porter plusieurs.');
  note.id = NOTE_ID;
  metricsNode = ctx.el('p', 'points-e024-metrics', '');
  metricsNode.id = METRICS_ID;

  detail.insertBefore(label, box);
  const after = box.nextSibling;
  detail.insertBefore(note, after);
  detail.insertBefore(metricsNode, after);
  listNode = box;
  return box;
}

/* E024-07 : une seule écriture par changement réel. La signature porte sur les
 * noms de familles, pas sur le nombre d'appels. */
function refresh(force) {
  if (!layout || !listNode) return;
  const names = familyNames();
  const signature = names.join(' | ');
  if (!force && signature === renderedSignature) return;
  renderedSignature = signature;
  updateCount += 1;

  /* On ne touche qu'au conteneur d'état vide et aux compteurs : jamais aux
   * puces existantes (E024-05). */
  if (!names.length) {
    const empty = ensureEmptyNode(currentCtx);
    if (empty.parentNode !== listNode) listNode.appendChild(empty);
  } else if (emptyNode && emptyNode.parentNode === listNode) {
    emptyNode.remove();
  }
  listNode.classList.toggle('is-empty', names.length === 0);
  listNode.setAttribute('aria-label',
    names.length ? `Familles du point : ${names.join(', ')}.` : 'Aucune famille déclarée pour ce point.');

  if (metricsNode) {
    metricsNode.textContent = `E024 · familles : ${names.length}`
      + ` · ${names.length ? names.join(', ') : 'aucune'}`
      + ` · actualisations : ${updateCount}.`;
  }
  if (layout.dataset) {
    layout.dataset.e024Families = String(names.length);
    layout.dataset.e024State = names.length ? 'named' : 'empty';
  }
}

/* E024-08 : un seul observateur, posé sur le kicker et le titre du détail —
 * deux signaux en lecture seule que points.js écrit. Notre liste n'est jamais
 * observée : aucune boucle d'écriture n'est possible. */
function observeDetail() {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => refresh(false));
  const kicker = q(detail, '.view-kicker');
  const title = q(detail, '.points-point-title');
  if (kicker) observer.observe(kicker, { childList: true, characterData: true, subtree: true });
  if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
}

/* E024-10 : retire les nœuds périmés ou mal parentés, sans toucher au DOM de
 * la vue ni aux marques des autres lentilles. */
function stripDuplicates(root) {
  qa(document, '[id^="points-e024-"]').forEach((node) => {
    if (!root.contains(node)) node.remove();
  });
  qa(root, '#points-e024-list').forEach((node, index) => {
    if (index > 0 || node.parentElement !== detail) node.remove();
  });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  if (typeof document === 'undefined') return;
  try {
    ctx.css(CSS_ID, CSS);                        /* E024-01 : cssOnce */
    const stage = ctx.stage;
    const currentLayout = ctx.layout && ctx.layout.isConnected
      ? ctx.layout : q(stage, '.points-layout');
    if (!currentLayout) return;
    const currentDetail = q(currentLayout, '.points-detail');
    const filters = q(currentLayout, '.points-filters');
    if (!currentDetail) return;

    /* E024-10 : un rendu neuf recrée le layout : on abandonne les références
     * périmées et on repart d'une signature vierge. */
    if (listNode && !listNode.isConnected) {
      listNode = metricsNode = emptyNode = null;
      renderedSignature = '';
    }
    stripDuplicates(currentLayout);
    currentCtx = ctx;
    layout = currentLayout;
    detail = currentDetail;
    layout.classList.add(SCOPE);
    familySelect = findFamilySelect(filters);

    /* E024-05 : soit la liste existe déjà (second passage), soit on la crée en
     * déplaçant les puces d'origine. */
    listNode = q(detail, `#${LIST_ID}`);
    if (!listNode || listNode.parentElement !== detail) {
      if (listNode) listNode.remove();
      qa(detail, `[id^="points-e024-"]`).forEach((node) => node.remove());
      listNode = null;
      metricsNode = null;
      emptyNode = null;
      const spans = familySpans();
      buildList(ctx, spans);
    } else {
      metricsNode = q(listNode, `#${METRICS_ID}`) || q(detail, `#${METRICS_ID}`);
      emptyNode = q(listNode, '[data-points-e024-empty]');
    }

    let reduced = false;
    try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); }
    catch { reduced = false; }
    if (layout.dataset) layout.dataset.e024Motion = reduced ? 'reduced' : 'full';

    observeDetail();
    refresh(true);
    if (layout.dataset) layout.dataset.e024Ready = '1';
  } catch {
    /* Une lentille défaillante est neutralisée par le registre, jamais fatal. */
    return;
  }
}

register('E024', install);
