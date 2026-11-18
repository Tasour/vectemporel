import { register } from './registry.js';
import { state, currentCountry } from '../../domain/store.js';

/* Lentille E053 — Sémantique & données : la forme P = (S, R, O, T, E, D, Src, C)
 * rendue lisible (domaine F : sémantique & données).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E053.md — chantiers E053-01 à E053-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * le store et styles.css ne sont ni édités ni doublés. La lentille ajoute UN
 * panneau de lecture sémantique dans .points-detail, sans rien retirer ni
 * réordonner du contenu existant.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. La lecture
 * de la fiche source passe par un import en lecture seule de store.js
 * (currentCountry, state), exactement comme chronology/E020.js : aucun fichier
 * partagé n'est modifié, aucun état n'est écrit. R et O ne sont pas rendus par
 * la vue de base : ils sont relus depuis la donnée source, jamais devinés.
 *
 * Invariants : un seul register, un seul CSS (ctx.css('points-e053', …)), un
 * seul panneau sémantique par rendu, zéro écouteur global, zéro timer, zéro
 * rAF, zéro réseau, zéro aléa, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e053';
const PANEL_ID = 'points-e053-semantics';
const TITLE_ID = 'points-e053-title';
const STATUS_ID = 'points-e053-status';
const SCOPE = 'points-e053';

/* Toutes les règles sont préfixées par `.points-e053`, classe posée sur le
 * panneau : aucune fuite hors de .points-detail. Le détail fait 380 px en
 * colonne large et ~42 % de la hauteur en colonne étroite (styles.css:347,
 * :378) : le panneau reste dense et défilable, jamais plus large que le récit. */
const CSS = `
  #${PANEL_ID} {
    margin: 14px 0 0; padding: 11px 12px;
    border: 1px solid var(--line-strong); border-radius: 9px;
    background: rgba(255, 255, 255, .02);
    color: var(--ink-soft); font-size: 10px; line-height: 1.5;
  }
  #${PANEL_ID}[hidden] { display: none; }
  #${PANEL_ID} .points-e053-title {
    margin: 0 0 5px; font-family: var(--serif);
    font-size: 12px; font-weight: 500; color: var(--gold-bright);
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .points-e053-lead { margin: 0 0 8px; color: var(--muted); font-size: 9px; }
  #${PANEL_ID} .points-e053-fields {
    margin: 0; padding: 0; list-style: none;
    border-top: 1px solid var(--line);
  }
  #${PANEL_ID} .points-e053-field {
    display: grid; grid-template-columns: 26px minmax(0, 1fr);
    column-gap: 8px; padding: 6px 0;
    border-bottom: 1px solid var(--line); overflow-wrap: anywhere;
  }
  #${PANEL_ID} .points-e053-key {
    grid-row: span 2; align-self: start;
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 24px; min-height: 24px; padding: 0 3px;
    border: 1px solid var(--gold); border-radius: 5px;
    color: var(--gold-bright); font-size: 10px; font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID} .points-e053-name {
    color: var(--muted-2); font-size: 9px;
    letter-spacing: .02em; text-transform: uppercase;
  }
  #${PANEL_ID} .points-e053-val { margin-top: 1px; color: var(--ink-soft); font-size: 10px; }
  #${PANEL_ID} .points-e053-truth {
    margin: 9px 0 0; padding-left: 15px; color: var(--muted-2); font-size: 9px;
  }
  #${PANEL_ID} .points-e053-truth li { margin-bottom: 3px; }
  #${PANEL_ID} .points-e053-status {
    margin: 8px 0 0; padding-top: 7px; border-top: 1px solid var(--line);
    color: var(--gold); font-size: 9px; font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID}:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  @media (max-width: 900px) {
    #${PANEL_ID} { padding: 9px 10px; font-size: 10px; }
    #${PANEL_ID} .points-e053-field { grid-template-columns: 24px minmax(0, 1fr); column-gap: 6px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none; animation: none; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border-color: CanvasText; color: CanvasText; }
    #${PANEL_ID} .points-e053-key { border-color: CanvasText; color: CanvasText; }
  }
`;

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function familiesOf(point) {
  return Array.isArray(point && point.families) ? point.families : [];
}

/* E053-04 / E053-05 — la fiche source est lue en lecture seule. La liste
 * `visible` reproduit fidèlement points.js:23-27 (filtres domaine/famille/ère,
 * puis pointIndex avec repli sur le premier) : le point décrit est donc
 * exactement celui que le panneau de base affiche, sans invention. */
function selectedPoint() {
  try {
    const country = currentCountry();
    if (!country || !Array.isArray(country.points)) return null;
    const era = Array.isArray(country.eras) ? country.eras[state.eraIndex] : null;
    let visible = country.points;
    if (state.pointFilterDomain !== '*') {
      visible = visible.filter((point) => point && point.domain === state.pointFilterDomain);
    }
    if (state.pointFilterFamily !== '*') {
      visible = visible.filter((point) => familiesOf(point).includes(state.pointFilterFamily));
    }
    if (era) visible = visible.filter((point) => point && point.eraId === era.id);
    const index = Number.isInteger(state.pointIndex) ? state.pointIndex : 0;
    return visible[index] || visible[0] || null;
  } catch {
    return null;
  }
}

/* E053-05 — T porte une précision explicite : le signe négatif est traduit en
 * « av. J.-C. » (convention de notation, jamais une date inventée). */
function timeLabel(point) {
  const raw = point && point.time !== undefined && point.time !== null ? String(point.time).trim() : '';
  const precision = point && point.datePrecision ? String(point.datePrecision).trim() : '';
  if (!raw) return { value: '', precision: '' };
  const value = /^-\d+$/.test(raw) ? `${raw.slice(1)} av. J.-C.` : raw;
  return { value: precision ? `${value} · précision : ${precision}` : value, precision };
}

/* E053-07 — règle 7 de la méthodologie : un silence est une donnée, jamais un
 * vide masqué. L'absence de source est donc explicite et nommée. */
function sourcesLabel(point) {
  const list = point && Array.isArray(point.sources) ? point.sources.filter(Boolean) : [];
  if (!list.length) return 'Aucune référence renseignée — omission explicite.';
  return list.join(', ');
}

/* E053-02 à E053-08 — les huit champs de la forme canonique. Les valeurs
 * viennent de la fiche source ; en repli (store indisponible), seuls les champs
 * réellement présents dans le DOM sont lus, les autres sont déclarés absents. */
function fieldsOf(detail, point) {
  let subject = '', domain = '', scale = '', time = '', confidence = '', sources = '';
  let predicate = '', object = '', precision = '';

  if (point) {
    subject = text(point.subject);
    predicate = text(point.predicate);
    object = text(point.object);
    domain = text(point.domain);
    scale = text(point.scale);
    confidence = text(point.confidence);
    sources = sourcesLabel(point);
    const stamped = timeLabel(point);
    time = stamped.value;
    precision = stamped.precision;
  } else if (detail) {
    subject = text(detail.querySelector('.points-point-title'));
    const meta = Array.prototype.slice.call(detail.querySelectorAll('.points-meta span'));
    domain = text(meta[0]);
    scale = text(meta[1]);
    time = text(meta[2]);
    confidence = text(detail.querySelector('.points-meta .confidence'));
    const src = text(detail.querySelector('.points-sources')).replace(/^sources\s*:\s*/i, '');
    sources = src || 'Aucune référence renseignée — omission explicite.';
    predicate = 'Non exposé par la vue de base (fiche source indisponible).';
    object = 'Non exposé par la vue de base (fiche source indisponible).';
  }

  return [
    { key: 'S', name: 'Sujet · qui / quoi', value: subject },
    { key: 'R', name: 'Relation · prédicat', value: predicate },
    { key: 'O', name: 'Objet · complément', value: object },
    { key: 'T', name: 'Temps · ancre datée', value: time },
    { key: 'E', name: 'Échelle · portée', value: scale },
    { key: 'D', name: 'Domaine · matrice', value: domain },
    { key: 'Src', name: 'Sources · références', value: sources },
    { key: 'C', name: 'Certitude · degré', value: confidence },
  ].map((field) => ({ ...field, precision }));
}

function addTruth(ctx, list, message) {
  list.appendChild(ctx.el('li', '', message));
}

/* E053-02 — unique point d'entrée de construction. Le panneau est détruit puis
 * reconstruit à partir de zéro à chaque rendu, ce qui garantit l'idempotence
 * même si runEnhancements est rejoué sur un DOM déjà annoté. */
function buildPanel(ctx, detail, point) {
  const stale = document.getElementById(PANEL_ID);
  if (stale) stale.remove();

  const panel = ctx.el('section', SCOPE);
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('data-points-e053', 'semantics');

  const title = ctx.el('h3', 'points-e053-title', 'Lecture sémantique · P = (S, R, O, T, E, D, Src, C)');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(ctx.el('p', 'points-e053-lead',
    'Un point est la plus petite unité de connaissance démontrable, datable, localisable et transmissible. Chaque lettre ci-dessous est un champ vérifiable, pas une date résumée.'));

  const fields = fieldsOf(detail, point);
  const list = ctx.el('ol', 'points-e053-fields');
  fields.forEach((field) => {
    const li = ctx.el('li', 'points-e053-field');
    li.setAttribute('data-points-e053-field', field.key);
    li.appendChild(ctx.el('span', 'points-e053-key', field.key));
    li.appendChild(ctx.el('span', 'points-e053-name', field.name));
    li.appendChild(ctx.el('span', 'points-e053-val', field.value || 'non renseigné'));
    list.appendChild(li);
  });
  panel.appendChild(list);

  /* E053-09 — fiche de vérité en trois faits vérifiables et référencés. */
  const truth = ctx.el('ul', 'points-e053-truth');
  const precision = fields.length ? fields[0].precision : '';
  addTruth(ctx, truth, 'P = (S, R, O, T, E, D, Src, C) : huit champs définis en §1 de POINT_METHODOLOGY.md.');
  addTruth(ctx, truth, point
    ? 'R et O sont relus depuis la fiche source : la vue de base ne les affiche pas.'
    : 'Fiche source indisponible : seuls les champs visibles du détail sont reportés.');
  addTruth(ctx, truth, precision
    ? `T porte une précision explicite : ${precision} (aucune date inventée).`
    : 'T est lu tel quel dans la donnée ; aucune date ni précision n’est inventée.');
  panel.appendChild(truth);

  /* E053-09 — compteurs auditables, hors écriture d'état, dans une région live. */
  const status = ctx.el('p', 'points-e053-status', '');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const filled = fields.filter((field) => field.value).length;
  status.textContent = `Champs renseignés : ${filled}/8 · source : ${point ? 'fiche source' : 'DOM de la vue'}.`;
  panel.appendChild(status);

  /* E053-10 — placement purement additif : juste avant la navigation, sans
   * déplacer ni supprimer un seul nœud existant du détail. */
  const nav = detail.querySelector('.points-nav');
  if (nav && nav.parentElement === detail) detail.insertBefore(panel, nav);
  else detail.appendChild(panel);
  return panel;
}

function motionState(ctx) {
  if (typeof ctx.reducedMotion !== 'function') return 'full';
  try { return ctx.reducedMotion() ? 'reduced' : 'full'; }
  catch { return 'full'; }
}

/* E053-01 / E053-10 — passe unique, tolérante, appliquée à chaque rendu. */
function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const detail = layout.querySelector('.points-detail');
  if (!detail) return;

  ctx.css(CSS_ID, CSS);
  layout.dataset.pointsE053 = '1';

  const panel = buildPanel(ctx, detail, selectedPoint());
  panel.setAttribute('data-points-e053-motion', motionState(ctx));
}

register('E053', (ctx) => {
  try { apply(ctx); }
  catch { /* une structure inattendue neutralise la lentille, jamais le rendu. */ }
});
