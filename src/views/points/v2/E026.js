import { register } from './registry.js';

/* Lentille E026 — passe 2 (module POINTS E026). Appareil critique de la
 * justification (domaine C : détail & fiche). Dix chantiers V2, E026-01 à
 * E026-10, décrits dans UNIFIED_AUDIT/POINTS/V2/views/E026.md.
 *
 * La vue points.js appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (:127-128). Ce module est donc un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE de la passe 1 : là où `points-e026` convertit
 * le paragraphe en citation sémantique, `points-v2-e026` ajoute un appareil
 * critique en lecture seule qui mesure cette citation et nomme ses silences.
 *
 * Espace de noms dédié : identifiants `points-v2-e026-`, attributs
 * `data-v2-e026-*`, classe de portée `.points-v2-e026`, feuille injectée sous
 * l'id `points-v2-e026`. Aucune collision avec la passe 1 ni avec une autre
 * lentille. Le bloc de citation de la passe 1 n'est jamais modifié : il est
 * lu, puis l'appareil est inséré comme frère, juste avant la navigation.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, les filtres internes ou une autre lentille.
 * Aucune donnée historique n'est inventée : le texte, les sources et les
 * compteurs sont dérivés du seul DOM rendu par points.js.
 *
 * Invariants : un seul enregistrement, une seule feuille, un seul appareil par
 * rendu ; tous les ids préfixés et dédupliqués ; tout DOM bâti avec ctx.el
 * (jamais d'injection de balisage) ; zéro réseau, zéro aléa, zéro timer, zéro
 * rAF, zéro écouteur global, aucune journalisation ; chaque état porte un
 * glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e026';
const SCOPE = 'points-v2-e026';
const PANEL_ID = 'points-v2-e026-apparatus';
const TITLE_ID = 'points-v2-e026-title';
const REDUCED_ATTR = 'data-v2-e026-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* E026-06 : seuil de référence explicite, non pas un fait historique mais une
 * convention de lecture énoncée dans l'appareil. Une justification « étayée »
 * atteint au moins 30 mots. Le rapport compare le nombre réel à ce seuil. */
const WORD_REFERENCE = 30;

/* E026-05 : trois états d'intégrité, chacun avec un glyphe et un mot. La
 * couleur ne fait que redoubler le signe et le mot, jamais les remplacer. */
const STATES = {
  ok: { glyph: '✓', word: 'renseignée' },
  empty: { glyph: '✗', word: 'vide — silence nommé' },
  sourced: { glyph: '✓', word: 'sourcée' },
  unsourced: { glyph: '○', word: 'non sourcée' },
  strong: { glyph: '✓', word: 'étayée' },
  brief: { glyph: '○', word: 'brève' },
  verbatim: { glyph: '=', word: 'verbatim conservé' },
};

/* E026-01 / E026-10 : feuille unique, entièrement préfixée par
 * `.points-v2-e026`, classe posée sur .points-layout : aucune fuite hors de la
 * vue Points. L'appareil reste lisible en niveaux de gris, en couleurs forcées
 * et sur papier. La seule transition est neutralisée sous mouvement réduit. */
const CSS = `
.points-v2-e026 .points-v2-e026-apparatus {
  box-sizing: border-box;
  margin: 14px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-v2-e026 .points-v2-e026-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e026 .points-v2-e026-intro,
.points-v2-e026 .points-v2-e026-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e026 .points-v2-e026-list {
  list-style: none; margin: 0 0 8px; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 4px 10px;
}
.points-v2-e026 .points-v2-e026-check {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e026 .points-v2-e026-glyph {
  display: inline-block; min-width: 1.2em; font-weight: 700;
  color: var(--gold-bright);
  transition: color .18s linear;
}
.points-v2-e026 .points-v2-e026-check.is-warn .points-v2-e026-glyph { color: var(--muted-2); }
.points-v2-e026 .points-v2-e026-check.is-bad .points-v2-e026-glyph { color: var(--danger, #c96); }
.points-v2-e026 .points-v2-e026-word { color: var(--ink-soft); }
.points-v2-e026 .points-v2-e026-metrics {
  margin: 4px 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 11px; line-height: 1.5; color: var(--ink-soft);
  overflow-wrap: anywhere;
}
.points-v2-e026 .points-v2-e026-sources {
  margin: 4px 0 8px; font-size: 11px; line-height: 1.5;
  color: var(--muted-2); overflow-wrap: anywhere;
}
.points-v2-e026 .points-v2-e026-sources.is-none { font-style: italic; }
.points-v2-e026[` + REDUCED_ATTR + `="1"] .points-v2-e026-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e026 .points-v2-e026-glyph { transition: none; }
}
@media (max-width: 620px) {
  .points-v2-e026 .points-v2-e026-list { grid-template-columns: 1fr; }
  .points-v2-e026 .points-v2-e026-intro,
  .points-v2-e026 .points-v2-e026-note,
  .points-v2-e026 .points-v2-e026-metrics,
  .points-v2-e026 .points-v2-e026-sources { font-size: 12px; }
}
@media (forced-colors: active) {
  .points-v2-e026 .points-v2-e026-apparatus { border-color: CanvasText; }
  .points-v2-e026 .points-v2-e026-glyph { color: CanvasText; }
  .points-v2-e026 .points-v2-e026-title { color: CanvasText; }
}
@media print {
  .points-v2-e026 .points-v2-e026-apparatus {
    border-color: #666; background: transparent;
  }
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E026-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est pas
 * celui conservé est retiré du document (un nœud détaché d'un rendu précédent
 * n'est pas ciblé par querySelectorAll, donc inoffensif). */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E026-03 : le texte est LU dans le nœud réellement rendu. La passe 1 a pu
 * remplacer <p class="points-justification"> par un <blockquote> contenant un
 * enfant .points-e026-quote-text : on privilégie cet enfant pour lire le
 * verbatim exact, sinon on retombe sur le textContent du nœu de justification.
 * Aucune écriture, aucune chaîne historique codée en dur. */
function justificationText(detail) {
  const anchor = query(detail, '.points-justification');
  if (!anchor) return '';
  const verbatim = query(anchor, '.points-e026-quote-text');
  return txt(verbatim || anchor);
}

/* E026-04 : les sources sont lues dans .points-sources tel que rendu par
 * points.js (:111), séparées par des virgules. Aucun identifiant SRC n'est
 * inventé ; un silence reste un silence. */
function sourcesOf(detail) {
  const raw = txt(query(detail, '.points-sources')).replace(/^sources\s*:\s*/i, '');
  if (!raw) return [];
  return raw.split(',').map((part) => part.trim()).filter(Boolean);
}

function wordsOf(text) {
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function signatureOf(text, sources) {
  return text + '||' + sources.join('|');
}

function checkItem(ctx, state, tone, label) {
  const li = ctx.el('li', 'points-v2-e026-check is-' + tone);
  li.appendChild(ctx.el('span', 'points-v2-e026-glyph', STATES[state].glyph));
  li.appendChild(ctx.el('span', 'points-v2-e026-word', label + ' — ' + STATES[state].word));
  return li;
}

/* E026-07 : l'appareil est une région annotée. Le describedby du détail est
 * COMPLÉTÉ, jamais écrasé, afin de préserver les relations posées par la passe
 * 1 et par les autres lentilles. */
function augmentDescribedBy(detail, id) {
  const existing = (getAttr(detail, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(detail, 'aria-describedby', existing.concat(id).join(' '));
}

/* E026-02 : structure statique construite une seule fois par rendu avec ctx.el
 * (jamais d'injection de balisage). Seuls les trois nœuds dynamiques sont
 * remplacés ensuite par fill() via replaceChildren. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e026-apparatus');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e026-title',
    'Appareil critique de la justification');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e026-intro',
    'Cet appareil ne modifie pas la citation : il la mesure et nomme ses silences. Chaque état est écrit avec un signe et un mot, jamais par la couleur seule.'));

  panel.appendChild(ctx.el('ul', 'points-v2-e026-list'));
  panel.appendChild(ctx.el('p', 'points-v2-e026-metrics', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e026-sources', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e026-note',
    'Règle de lecture : une justification est une ASSERTION appuyée sur des sources, pas une date. Un silence de source est une donnée explicite, pas une preuve (POINT_METHODOLOGY.md §3.7).'));
  return panel;
}

/* E026-03 / E026-04 / E026-05 / E026-06 / E026-08 : tout le contenu dynamique
 * est écrit ici à partir des signaux lus dans le DOM réel. */
function fill(ctx, panel, text, sources) {
  const words = wordsOf(text);
  const chars = text.length;
  const strong = words >= WORD_REFERENCE;

  const list = query(panel, '.points-v2-e026-list');
  if (list) {
    list.replaceChildren(
      checkItem(ctx, text ? 'ok' : 'empty', text ? 'ok' : 'bad', 'Présence'),
      checkItem(ctx, sources.length ? 'sourced' : 'unsourced',
        sources.length ? 'ok' : 'warn', 'Attribution'),
      checkItem(ctx, strong ? 'strong' : 'brief', strong ? 'ok' : 'warn', 'Étayage'),
      checkItem(ctx, 'verbatim', 'ok', 'Intégrité')
    );
  }

  const ratio = (words / WORD_REFERENCE).toFixed(1).replace('.', ',');
  const metrics = query(panel, '.points-v2-e026-metrics');
  if (metrics) {
    metrics.textContent = 'Mesure : ' + chars + ' caractère' + plural(chars, '', 's')
      + ' · ' + words + ' mot' + plural(words, '', 's')
      + ' · référence ' + WORD_REFERENCE + ' mots → ' + ratio + '× ('
      + (strong ? 'au-dessus' : 'en dessous') + ' du seuil).';
  }

  const sourcesLine = query(panel, '.points-v2-e026-sources');
  if (sourcesLine) {
    sourcesLine.classList.toggle('is-none', sources.length === 0);
    sourcesLine.textContent = sources.length
      ? 'Sources déclarées (' + sources.length + ') : ' + sources.join(' · ') + '.'
      : 'Aucune source déclarée — silence explicite (un silence est une donnée).';
  }

  setAttr(panel, 'data-v2-e026-words', String(words));
  setAttr(panel, 'data-v2-e026-sources', String(sources.length));
}

/* E026-01 / E026-09 / E026-10 : unique point d'entrée, gardes structurelles,
 * feuille unique, portée unique, ids dédupliqués, repli silencieux sur
 * structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  if (!isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const text = justificationText(detail);
  const sources = sourcesOf(detail);
  const sig = signatureOf(text, sources);

  /* E026-09 : réconciliation par id. On conserve l'appareil déjà correctement
   * monté dans le détail courant, on retire tout doublon d'un rendu antérieur,
   * puis on garantit l'unicité du titre. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    const nav = query(detail, '.points-nav');
    if (isElement(nav) && nav.parentElement === detail) detail.insertBefore(panel, nav);
    else detail.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));

  if (getAttr(panel, 'data-v2-e026-signature') !== sig) {
    setAttr(panel, 'data-v2-e026-signature', sig);
    fill(ctx, panel, text, sources);
  }

  setAttr(panel, 'data-v2-e026', '1');
  augmentDescribedBy(detail, PANEL_ID);
}

register('E026', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
