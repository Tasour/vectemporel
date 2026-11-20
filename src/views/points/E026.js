import { register } from './registry.js';

/* Lentille E026 — Détail & fiche : justification affichée en citation (domaine C).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E026.md — chantiers E026-01 à E026-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille transforme le
 * paragraphe `.points-justification` déjà produit par la vue en une citation
 * sémantique (`<blockquote>` + `<cite>`), et s'appuie sur le DOM réel du détail.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres, ni aucune donnée du point : le libellé
 * d'attribution est dérivé du seul DOM (`.points-sources`, `.points-point-title`).
 *
 * Non destructif : le texte exact de la justification est conservé et la classe
 * `.points-justification` est reportée sur le `<blockquote>`, de sorte que tout
 * sélecteur existant continue de trouver le même nœud de lecture.
 *
 * Invariants : un seul CSS, un seul blockquote, une seule légende `<cite>` par
 * rendu ; zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa,
 * zéro innerHTML, zéro console.*.
 */

const CSS_ID = 'points-e026';
const SCOPE = 'points-e026';
const QUOTE_ID = 'points-e026-quote';
const CITE_ID = 'points-e026-cite';
const LABEL_ID = 'points-e026-label';
const REDUCED_ATTR = 'data-e026-reduced';

/* Toutes les règles sont préfixées par `.points-e026`, classe posée sur
 * `.points-layout`. Guillemets et rail sont décoratifs (pseudo-éléments) et
 * l'étiquette « Justification » porte l'information sans recourir à la couleur. */
const CSS = `
/* E026-04 : étiquette de nature du bloc, au-dessus de la citation. */
.points-e026 .points-e026-label {
  margin: 12px 0 4px; font-size: 10px; letter-spacing: .08em;
  text-transform: uppercase; color: var(--gold); font-weight: 600;
}
/* E026-02 + E026-04 : la justification devient un bloc de citation cadré. */
.points-e026 blockquote.points-justification {
  margin: 0; padding: 8px 12px 8px 14px;
  border-left: 3px solid var(--gold);
  background: rgba(230, 185, 111, .05);
  color: var(--ink-soft); font-family: var(--serif, Georgia, serif);
  font-style: italic; font-size: 13px; line-height: 1.6;
  max-width: 68ch; overflow-wrap: anywhere;
  transition: border-color .18s linear, background-color .18s linear;
}
/* E026-04 : guillemets typographiques purement décoratifs. */
.points-e026 .points-e026-quote-text::before { content: '« '; }
.points-e026 .points-e026-quote-text::after { content: ' »'; }
/* E026-03 + E026-05 : légende d'attribution, dérivée du DOM. */
.points-e026 .points-e026-cite {
  margin: 6px 0 0; font-size: 11px; line-height: 1.4; color: var(--muted-2);
}
.points-e026 .points-e026-cite cite { color: var(--gold); font-style: normal; }
/* E026-08 : repli explicite quand la justification est vide. */
.points-e026 .points-e026-empty {
  margin: 12px 0 0; padding: 8px 12px; font-size: 12px; line-height: 1.5;
  border-left: 3px dashed var(--line-strong); color: var(--muted-2);
}
/* E026-07 : mouvement réduit, couplage JS (attribut) ET media query. */
.points-e026[` + REDUCED_ATTR + `="1"] blockquote.points-justification,
.points-e026[` + REDUCED_ATTR + `="1"] .points-e026-label { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e026 blockquote.points-justification,
  .points-e026 .points-e026-label { transition: none; }
}
/* E026-06 : mesure et taille restent lisibles en colonne étroite. */
@media (max-width: 620px) {
  .points-e026 blockquote.points-justification {
    padding: 8px 10px; font-size: 14px; max-width: none;
  }
  .points-e026 .points-e026-label,
  .points-e026 .points-e026-cite { font-size: 12px; }
}
/* E026-10 : couleurs forcées — le rail, les guillemets et l'étiquette restent
 * identifiables sans la couleur (bordure + texte). */
@media (forced-colors: active) {
  .points-e026 blockquote.points-justification {
    border-left-color: Highlight; background: Canvas; color: CanvasText;
  }
  .points-e026 .points-e026-cite cite,
  .points-e026 .points-e026-label { color: CanvasText; }
}
`;

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function detailOf(layout) {
  return layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.points-detail')
    : null;
}

function quoteOf(detail) {
  return detail ? detail.querySelector('.' + SCOPE + '-quote') : null;
}

function justificationOf(detail) {
  return detail ? detail.querySelector('.points-justification') : null;
}

/* E026-03 : aucune chaîne historique codée en dur — l'attribution vient du
 * bloc `.points-sources` rendu par la vue, sinon d'un silence explicite. */
function attributionOf(detail) {
  const sources = detail ? detail.querySelector('.points-sources') : null;
  const value = textOf(sources).replace(/^sources\s*:\s*/i, '');
  return value
    ? `Sources de la justification : ${value}`
    : 'Aucune source déclarée pour cette justification — silence explicite.';
}

/* E026-02 : le texte exact est déplacé dans un enfant <p>, sans innerHTML. */
function makeQuote(ctx, justification) {
  const quote = ctx.el('blockquote', 'points-justification ' + SCOPE + '-quote');
  quote.id = QUOTE_ID;
  quote.dataset.e026 = '1';
  quote.setAttribute('aria-labelledby', LABEL_ID);
  quote.setAttribute('aria-describedby', CITE_ID);
  quote.appendChild(ctx.el('p', SCOPE + '-quote-text', textOf(justification)));
  return quote;
}

/* E026-05 : étiquette visible et ancre ARIA du bloc de citation. */
function ensureLabel(ctx, detail, quote) {
  let label = detail.querySelector('#' + LABEL_ID);
  if (!label) {
    label = ctx.el('p', SCOPE + '-label', 'Justification du point');
    label.id = LABEL_ID;
    detail.insertBefore(label, quote);
  }
  return label;
}

/* E026-03 : la légende <cite> est un frère du blockquote, hors du nœud
 * `.points-justification`, dont le textContent reste la justification exacte. */
function ensureCaption(ctx, detail, quote) {
  let caption = detail.querySelector('#' + CITE_ID);
  if (!caption) {
    caption = ctx.el('p', SCOPE + '-cite');
    caption.id = CITE_ID;
    caption.appendChild(ctx.el('cite', '', attributionOf(detail)));
    if (quote.nextSibling) detail.insertBefore(caption, quote.nextSibling);
    else detail.appendChild(caption);
  }
  return caption;
}

register('E026', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E026-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e026 = '1';

  const detail = detailOf(layout);
  if (!detail) return;

  /* E026-09 : un seul blockquote par rendu ; un nœud mal parenté est retiré. */
  let quote = quoteOf(detail);
  if (quote && quote.parentElement !== detail) quote.remove();
  quote = quoteOf(detail);

  if (!quote) {
    const justification = justificationOf(detail);
    if (!justification) return;
    const text = textOf(justification);
    if (!text) {
      /* E026-08 : pas de citation vide, mais un état explicitement nommé. */
      if (!detail.querySelector('.' + SCOPE + '-empty')) {
        detail.appendChild(el('p', SCOPE + '-empty',
          'Justification non renseignée pour ce point.'));
      }
      return;
    }
    quote = makeQuote(ctx, justification);
    justification.replaceWith(quote);
  }

  ensureLabel(ctx, detail, quote);
  ensureCaption(ctx, detail, quote);

  /* E026-07 : la préférence de mouvement pilote l'attribut en plus de la
   * media query, pour les environnements sans matchMedia fiable. */
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }
});
