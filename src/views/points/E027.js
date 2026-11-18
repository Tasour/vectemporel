import { register } from './registry.js';

/* Lentille E027 — Détail & fiche : texte du point en paragraphe à mesure lisible
 * (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E027.md — chantiers E027-01 à E027-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store
 * et styles.css ne sont ni édités ni doublés : la lentille pose une portée CSS
 * sur la fiche `.points-detail` et ajoute une seule note de lecture dérivée du
 * texte réellement rendu.
 *
 * Contrat exploité : viewId, layout, css, el, reducedMotion. Aucune dépendance
 * vers le store, les filtres, la grille ni la navigation : la fiche reste lisible
 * avec un ctx minimal. Aucun champ n'est fabriqué : la lentille compose le texte
 * existant, elle ne l'écrit pas.
 *
 * Invariants : un seul CSS (cssOnce), une seule portée, une seule note, zéro
 * écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro console.*.
 */

const CSS_ID = 'points-e027';
const SCOPE = 'points-e027';
const NOTE_ID = 'points-e027-note';
const REDUCED_ATTR = 'data-e027-reduced';
const SIGNATURE_ATTR = 'data-e027-signature';
const MEASURE_CH = 65; /* cible typographique, pas une donnée du jeu */

/* Toutes les règles sont préfixées par `.points-e027`, classe posée sur la
 * fiche `.points-detail` : aucune fuite hors de cette vue. Les sélecteurs
 * ciblent le DOM réel de points.js (`.points-point-title`, `.points-point-text`,
 * `.points-meta`, `.points-families`, `.points-sources`, `.points-justification`,
 * `.points-nav`). */
const CSS = `
/* E027-01 : la fiche devient l'unique portée de composition. */
.points-e027 .view-kicker {
  margin: 0 0 10px;
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.4;
  letter-spacing: .02em;
}
/* E027-03 : rythme vertical du titre, sans changer sa police ni son libellé. */
.points-e027 .points-point-title {
  margin: 0 0 12px;
  line-height: 1.2;
  overflow-wrap: break-word;
}
/* E027-02 : mesure lisible — environ 65 caractères par ligne, jamais plus
 * large que le conteneur (aucun débordement à 390 px). */
.points-e027 .points-point-text,
.points-e027 .points-justification,
.points-e027 .points-sources {
  max-width: min(${MEASURE_CH}ch, 100%);
}
.points-e027 .points-point-text {
  margin: 0 0 14px;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.65;
  overflow-wrap: break-word;
}
/* E027-06 : les champs secondaires restent lisibles, à la même mesure. */
.points-e027 .points-meta,
.points-e027 .points-families {
  margin: 12px 0;
}
.points-e027 .points-meta span,
.points-e027 .points-families span {
  min-height: 18px;
  padding: 4px 8px;
  color: var(--ink-soft);
  font-size: 9px;
  line-height: 1.3;
}
.points-e027 .points-meta .confidence.is-certain {
  color: var(--gold-bright);
}
.points-e027 .points-sources {
  margin: 0 0 10px;
  font-size: 10px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.points-e027 .points-justification {
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.6;
}
/* E027-07 : cibles tactiles et focus visible sur la navigation de la fiche. */
.points-e027 .points-nav {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.points-e027 .points-nav button {
  min-height: 40px;
  padding: 0 8px;
  line-height: 1.25;
}
.points-e027 .points-nav button:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 3px;
}
/* E027-08 : note de lecture statique, hors région live, distincte du texte. */
.points-e027-note {
  margin: 12px 0 4px;
  padding: 8px 0 0;
  border-top: 1px solid var(--line);
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.5;
  overflow-wrap: break-word;
}
/* E027-09 : points de rupture documentés ; la fiche passe en bande basse à
 * 1000 px et garde une mesure bornée par la largeur disponible à 390 px. */
@media (max-width: 1000px) {
  .points-e027 { padding: 18px 16px; }
}
@media (max-width: 620px) {
  .points-e027 { padding: 16px 14px; }
  .points-e027 .points-point-text {
    font-size: 14px;
    max-width: 100%;
  }
  .points-e027 .points-nav button { min-height: 44px; }
}
/* E027-10 : mouvement réduit (couplage JS + media query) et couleurs forcées :
 * aucun signal de la fiche ne repose sur la seule couleur. */
.points-e027[` + REDUCED_ATTR + `="1"] .points-nav button,
.points-e027[` + REDUCED_ATTR + `="1"] .points-point-text {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .points-e027 .points-nav button,
  .points-e027 .points-point-text {
    transition: none;
  }
}
@media (forced-colors: active) {
  .points-e027 .points-point-text,
  .points-e027 .points-justification,
  .points-e027 .points-sources,
  .points-e027-note {
    color: CanvasText;
  }
  .points-e027 .points-justification,
  .points-e027 .points-nav {
    border-top-color: CanvasText;
  }
  .points-e027 .points-nav button:focus-visible {
    outline-color: Highlight;
  }
}
`;

function asText(value) {
  return typeof value === 'string' ? value : '';
}

/* E027-05 : le texte est lu dans le DOM, jamais réécrit ni complété. Le
 * décompte en points Unicode reste déterministe et reproductible. */
function measure(detail) {
  const textNode = detail.querySelector('.points-point-text');
  const text = textNode ? asText(textNode.textContent).trim() : '';
  return { text, count: Array.from(text).length };
}

function noteText(m) {
  if (!m.count) return 'Fiche prête : aucun texte de point à composer dans ce périmètre.';
  return `Texte composé à mesure lisible : environ ${MEASURE_CH} caractères par ligne, ${m.count} caractères au total.`;
}

/* E027-08 : une seule note par rendu, insérée après le texte (ou le titre,
 * ou le kicker si aucun point n'est sélectionné), sans toucher au contenu. */
function ensureNote(ctx, detail) {
  let note = detail.querySelector('#' + NOTE_ID);
  if (!note) {
    const stale = document.getElementById(NOTE_ID);
    if (stale && !detail.contains(stale)) stale.remove();
    note = ctx.el('p', 'points-e027-note', '');
    note.id = NOTE_ID;
    const anchor = detail.querySelector('.points-point-text')
      || detail.querySelector('.points-point-title')
      || detail.querySelector('.view-kicker');
    if (anchor && anchor.nextSibling) detail.insertBefore(note, anchor.nextSibling);
    else detail.appendChild(note);
  }

  const signature = noteText(measure(detail));
  if (note.getAttribute(SIGNATURE_ATTR) !== signature) {
    note.textContent = signature;
    note.setAttribute(SIGNATURE_ATTR, signature);
  }
}

register('E027', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  const detail = layout.querySelector('.points-detail');
  if (!detail) return;

  /* E027-01, E027-10 : CSS unique (cssOnce) et portée idempotente. La coque
   * vide `stage` à chaque rendu : la note est recréée avec le DOM, sans doublon
   * ni écouteur accumulé. Aucun rappel n'est enregistré. */
  css(CSS_ID, CSS);
  detail.classList.add(SCOPE);
  detail.dataset.e027 = '1';

  /* E027-10 : couplage explicite à la préférence de mouvement réduit, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    detail.setAttribute(REDUCED_ATTR, '1');
  } else {
    detail.removeAttribute(REDUCED_ATTR);
  }

  ensureNote(ctx, detail);
});
