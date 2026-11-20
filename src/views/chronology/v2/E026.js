import { register } from './registry.js';

/* Lentille E026 — passe V2, domaine C : Détail & fiche — justification affichée en citation.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E026.md — chantiers E026-01 à E026-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/chronology.js), la coque,
 * styles.css, la passe 1 et tout autre greffon ne sont ni édités ni doublés.
 *
 * La fiche de la Chronologie affiche, pour chaque point, un Assertion (`<p>` du
 * texte), un niveau de confiance (`.confidence`) et une liste de sources
 * (`.point-sources`). Il n'existe AUCUN paragraphe `.points-justification` ici :
 * la « justification » d'un point est donc reconstruite, en lecture seule, à
 * partir des seuls signaux réellement rendus — confiance et références — puis
 * présentée comme une citation sémantique (`<blockquote>` + `<cite>`).
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou les données : chaque libellé est
 * dérivé du DOM courant. Opération ADDITIVE : aucun nœud existant n'est déplacé
 * ni renommé (E022, E025 et E027 restent maîtres de leurs cibles respectives).
 *
 * Invariants : un seul register('E026', ctx => …), un seul appel
 * ctx.css('chronology-v2-e026', …), un bloc de citation au plus par point, ids
 * préfixés chronology-v2-e026-, zéro écouteur global, zéro timer, zéro rAF,
 * zéro réseau, zéro aléa, zéro innerHTML, zéro console.*.
 */

const CSS_ID = 'chronology-v2-e026';
const PREFIX = 'chronology-v2-e026';
const SCOPE = PREFIX;
const QUOTE_CLASS = PREFIX + '-quote';
const LABEL_CLASS = PREFIX + '-label';
const TEXT_CLASS = PREFIX + '-quote-text';
const CITE_CLASS = PREFIX + '-cite';
const EMPTY_CLASS = PREFIX + '-empty';
const REDUCED_ATTR = 'data-chronology-v2-e026-reduced';
const ASIDE_ID = 'atlas-chrono-aside';

/* Toutes les règles sont préfixées par `.chronology-v2-e026`, classe posée sur
 * `.chronology-layout`. Guillemets et rail sont décoratifs ; l'étiquette
 * textuelle « Justification du point » porte l'information sans la couleur. */
const CSS = `
/* E026-04 : étiquette de nature du bloc, au-dessus du texte cité. */
.${SCOPE} .${LABEL_CLASS} {
  margin: 10px 0 3px; color: var(--gold); font: inherit;
  font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
}
/* E026-02 + E026-04 : la justification devient un bloc de citation cadré. */
.${SCOPE} blockquote.${QUOTE_CLASS} {
  margin: 4px 0 10px; padding: 8px 12px 8px 14px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 0 8px 8px 0; background: rgba(230, 185, 111, .05);
  color: var(--ink-soft); font-family: var(--serif, Georgia, serif);
  font-size: 12px; line-height: 1.55; max-width: 68ch; overflow-wrap: anywhere;
  transition: border-color .18s linear, background-color .18s linear;
}
/* E026-04 : guillemets typographiques purement décoratifs (hors textContent). */
.${SCOPE} .${TEXT_CLASS}::before { content: '« '; }
.${SCOPE} .${TEXT_CLASS}::after { content: ' »'; }
/* E026-03 + E026-05 : légende d'attribution, dérivée du DOM. */
.${SCOPE} .${CITE_CLASS} {
  margin: 6px 0 0; color: var(--muted-2); font: inherit;
  font-size: 10px; line-height: 1.45;
}
.${SCOPE} .${CITE_CLASS} cite { color: var(--gold); font-style: normal; }
/* E026-08 : repli explicite quand la justification est vide. */
.${SCOPE} .${EMPTY_CLASS} {
  margin: 4px 0 10px; padding: 8px 12px;
  border: 1px dashed var(--line-strong); border-radius: 0 8px 8px 0;
  color: var(--muted-2); font: inherit; font-size: 11px; line-height: 1.5;
}
/* E026-07 : mouvement réduit, couplage JS (attribut) ET media query. */
.${SCOPE}[${REDUCED_ATTR}="1"] blockquote.${QUOTE_CLASS} { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .${SCOPE} blockquote.${QUOTE_CLASS} { transition: none !important; }
}
/* E026-06 : mesure et taille restent lisibles en colonne étroite. */
@media (max-width: 620px) {
  .${SCOPE} blockquote.${QUOTE_CLASS} { padding: 8px 10px; font-size: 14px; max-width: none; }
  .${SCOPE} .${LABEL_CLASS}, .${SCOPE} .${CITE_CLASS} { font-size: 12px; }
}
/* E026-10 : couleurs forcées — rail, guillemets et étiquette restent
 * identifiables sans la couleur (bordure + texte). */
@media (forced-colors: active) {
  .${SCOPE} blockquote.${QUOTE_CLASS} {
    border-left-color: Highlight; background: Canvas; color: CanvasText;
  }
  .${SCOPE} .${CITE_CLASS} cite, .${SCOPE} .${LABEL_CLASS} { color: CanvasText; }
  .${SCOPE} .${EMPTY_CLASS} { border-color: CanvasText; color: CanvasText; }
}
`;

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E026-02/E026-09 : recherche d'un enfant DIRECT porteur d'une classe, sans
 * :scope (meilleure compatibilité) et sans toucher aux nœuds des autres lentilles. */
function ownChild(parent, className) {
  if (!parent) return null;
  for (let i = 0; i < parent.children.length; i += 1) {
    const child = parent.children[i];
    if (child.classList && child.classList.contains(className)) return child;
  }
  return null;
}

function pointsOf(layout) {
  const aside = document.getElementById(ASIDE_ID);
  const host = aside || (layout && typeof layout.querySelector === 'function' ? layout : null);
  if (!host || typeof host.querySelectorAll !== 'function') return [];
  return Array.from(host.querySelectorAll('.point'));
}

function confidenceOf(point) {
  return textOf(point.querySelector('.confidence'));
}

/* E026-03 : les références sont lues telles que rendues par la vue, sans
 * fabriquer d'identifiant ni de titre. Chaque <li> porte un dataset.sourceId. */
function sourcesOf(point) {
  const nodes = point.querySelectorAll('.point-sources li');
  return Array.from(nodes).map(textOf).filter(Boolean);
}

/* E026-02 : la justification est composée depuis les seuls faits présents dans
 * le DOM — confiance et appui documentaire. Chaîne vide = absence explicite. */
function justificationOf(point) {
  const parts = [];
  const confidence = confidenceOf(point);
  const sources = sourcesOf(point);
  if (confidence) parts.push(`Niveau de confiance : « ${confidence} »`);
  if (sources.length) parts.push(`Appui documentaire : ${sources.join(' ; ')}`);
  return parts.length ? `${parts.join(' · ')}.` : '';
}

/* E026-03 : attribution dérivée du DOM ; jamais de millésime ni d'ID en dur. */
function attributionOf(sources) {
  return sources.length
    ? `Sources de la justification : ${sources.join(' ; ')}.`
    : 'Aucune source déclarée pour cette justification — silence explicite (omission justifiée).';
}

/* E026-02 + E026-05 : <blockquote> sémantique, texte exact en <textContent>,
 * nom et description ancrés sur des ids réellement créés ci-dessous. */
function makeQuote(ctx, index, justification, attribution) {
  const labelId = `${PREFIX}-label-${index}`;
  const citeId = `${PREFIX}-cite-${index}`;
  const quote = ctx.el('blockquote', QUOTE_CLASS);
  quote.id = `${PREFIX}-quote-${index}`;
  quote.dataset.e026 = '1';
  quote.setAttribute('aria-labelledby', labelId);
  quote.setAttribute('aria-describedby', citeId);

  quote.appendChild(ctx.el('p', LABEL_CLASS, 'Justification du point')).id = labelId;
  quote.appendChild(ctx.el('p', TEXT_CLASS, justification));

  const caption = ctx.el('p', CITE_CLASS);
  caption.id = citeId;
  caption.appendChild(ctx.el('cite', '', attribution));
  quote.appendChild(caption);
  return quote;
}

function install(ctx) {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (viewId !== 'chronologyv2' || !layout) return;
  if (typeof css !== 'function' || typeof el !== 'function') return;

  /* E026-01 : une seule feuille, injectée une seule fois par le registre. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e026 = '1';

  /* E026-07 : la préférence pilote l'attribut en plus de la media query. */
  const reduced = typeof reducedMotion === 'function' && Boolean(reducedMotion());
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  const points = pointsOf(layout);
  points.forEach((point, position) => {
    const index = String(position + 1);

    /* E026-09 : un seul greffon par point ; un second passage ne réécrit rien. */
    if (ownChild(point, QUOTE_CLASS) || ownChild(point, EMPTY_CLASS)) return;

    const justification = justificationOf(point);
    if (!justification) {
      /* E026-08 : pas de citation vide, mais un état explicitement nommé. */
      const empty = el('p', EMPTY_CLASS,
        'Justification non renseignée pour ce point — omission justifiée.');
      empty.id = `${PREFIX}-empty-${index}`;
      point.appendChild(empty);
      return;
    }

    const attribution = attributionOf(sourcesOf(point));
    point.appendChild(makeQuote(ctx, index, justification, attribution));
  });
}

register('E026', install);
