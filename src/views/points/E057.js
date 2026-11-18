import { register } from './registry.js';

/* Lentille E057 — Silences de la matrice traités comme données (domaine F :
 * sémantique & données).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E057.md — chantiers E057-01 à E057-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store,
 * les filtres, le détail, styles.css et la coque ne sont ni édités ni doublés :
 * la lentille lit le DOM réel déjà produit par la vue et y ajoute une portée CSS
 * et quelques nœuds sémantiques, sans détruire le contenu existant.
 *
 * Règle méthodologique appliquée (POINT_METHODOLOGY.md, règle 7) :
 *   « Les silences sont des données : aucune source doit être explicite,
 *     jamais un vide masqué. »
 * Une cellule `.points-cell` sans classe `has-points` affiche « · » dans la vue :
 * c'est un silence (ère × domaine sans point validé). E057 le rend lisible,
 * étiqueté, compté et documenté au lieu de le laisser passer pour un vide.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ni le détail : les silences restent
 * décrits même avec un ctx minimal.
 *
 * Invariants : un seul CSS (cssOnce), une seule portée, un seul encart, un seul
 * résumé, une seule légende par rendu ; zéro écouteur global ; zéro timer ; zéro
 * rAF ; zéro réseau ; zéro aléa ; zéro journalisation console ; aucun fichier partagé.
 */

const CSS_ID = 'points-e057';
const SCOPE = 'points-e057';
const NOTE_ID = 'points-e057-note';
const SUMMARY_ID = 'points-e057-summary';
const LEGEND_ID = 'points-e057-legend';
const REDUCED_ATTR = 'data-e057-reduced';

/* Toutes les règles sont préfixées par `.points-e057`, classe posée sur
 * `.points-layout`, ou portent un nom de classe unique : aucune fuite hors de
 * cette vue. Les silences se distinguent par la FORME (bordure en pointillé,
 * glyphe, badge), par le TEXTE et par la structure — jamais par la couleur seule. */
const CSS = `
/* E057-02 : une cellule vide est un silence explicite, pas un vide masqué. */
.points-e057 .points-cell.is-silence {
  border-style: dashed;
  color: var(--muted-2);
  font-variant-numeric: tabular-nums;
}
.points-e057 .points-cell.has-points { border-style: solid; }
/* E057-03 / E057-07 : le glyphe de légende ne parle pas aux seuls lecteurs d'écran. */
.points-e057-glyph { display: inline-block; min-width: 1.2em; font-weight: 700; }
/* E057-08 : badge de silence par ère, texte et pointillé, jamais couleur seule. */
.points-e057-era-badge {
  display: inline-block; margin-left: 6px; padding: 0 4px;
  border: 1px dashed var(--line-strong); border-radius: 4px;
  color: var(--muted-2); font-size: 10px; font-variant-numeric: tabular-nums;
}
/* E057-04 : encart « un silence est une donnée », statique et visible. */
.points-e057-note {
  margin: 8px 0; padding: 8px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(230, 185, 111, .06);
  color: var(--ink-soft); font-size: 11px; line-height: 1.5;
}
/* E057-06 : résumé chiffré dérivé du DOM, sous le titre. */
.points-e057-summary {
  margin: 0 0 10px; color: var(--gold-bright);
  font-size: 11px; font-variant-numeric: tabular-nums; line-height: 1.4;
}
/* E057-07 : légende des trois états de cellule. */
.points-e057-legend {
  margin: 8px 0; padding: 0; list-style: none;
  color: var(--muted-2); font-size: 10px; line-height: 1.5;
}
.points-e057-legend li { margin-bottom: 2px; }
/* E057-10 : mouvement réduit, couplage JS (attribut) ET media query. */
.points-e057[` + REDUCED_ATTR + `="1"] .points-cell,
.points-e057[` + REDUCED_ATTR + `="1"] .points-e057-era-badge { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e057 .points-cell,
  .points-e057 .points-e057-era-badge { transition: none; }
}
/* E057-10 : couleurs forcées — le pointillé et le texte portent l'information. */
@media (forced-colors: active) {
  .points-e057 .points-cell.is-silence {
    border-style: dashed; border-color: CanvasText; color: CanvasText;
  }
  .points-e057 .points-cell.has-points { border-color: CanvasText; }
  .points-e057-era-badge { border-color: CanvasText; color: CanvasText; }
}
@media (max-width: 620px) {
  .points-e057-note, .points-e057-summary, .points-e057-legend { font-size: 10px; }
}
`;

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E057-09 : un nœud périmé (rendu précédent) est retiré avant réinsertion,
 * ce qui rend la lentille idempotente sur un DOM neuf comme sur un second
 * passage. Les nœuds encore présents dans `layout` sont réutilisés. */
function scopedNode(id, layout) {
  let node = layout.querySelector('#' + id);
  if (node) return node;
  const stale = document.getElementById(id);
  if (stale && !layout.contains(stale)) stale.remove();
  return null;
}

/* E057-02/03 : une cellule sans `has-points` est un silence. On lit l'ère dans
 * le premier enfant de la ligne et le domaine dans l'en-tête de colonne : aucun
 * chiffre ni millésime n'est codé en dur, tout vient du DOM. */
function describeSilence(eraName, domain) {
  if (eraName && domain) {
    return `Silence de la matrice : aucun point validé pour « ${eraName} » × « ${domain} ». Vide à documenter ou omission justifiée.`;
  }
  return 'Silence de la matrice : aucun point validé dans cette cellule. Vide à documenter ou omission justifiée.';
}

register('E057', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (viewId && viewId !== 'points') return;
  if (!layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E057-01 : injection CSS unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e057 = '1';

  const matrix = layout.querySelector('.points-matrix')
    || (layout.querySelector('.points-grid') && layout.querySelector('.points-grid').parentElement);
  const grid = layout.querySelector('.points-grid');
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const domainNames = qa(head, 'span').slice(1).map(textOf);
  const rows = qa(grid, '.points-grid-row:not(.is-head)');

  let total = 0;
  let filled = 0;
  let silences = 0;
  const silenceCells = [];

  rows.forEach((row) => {
    const eraBtn = row.querySelector('.points-era');
    const eraName = textOf(eraBtn);
    let rowSilences = 0;

    qa(row, '.points-cell').forEach((cell, index) => {
      total += 1;
      const domain = domainNames[index] || '';
      if (cell.classList.contains('has-points')) {
        filled += 1;
        cell.dataset.e057State = 'point';
        return;
      }
      /* E057-02 : marquage structurel du silence. */
      silences += 1;
      rowSilences += 1;
      cell.dataset.silence = '1';
      cell.dataset.e057State = 'silence';
      cell.classList.add('is-silence');

      /* E057-03 : étiquette sémantique dérivée du DOM, ajoutée sans écraser
       * une étiquette déjà posée par une autre lentille. */
      const sentence = describeSilence(eraName, domain);
      const prevLabel = cell.getAttribute('aria-label') || '';
      if (!prevLabel.includes(sentence)) {
        cell.setAttribute('aria-label', prevLabel ? `${prevLabel} ${sentence}` : sentence);
      }
      const prevTitle = cell.getAttribute('title') || '';
      if (!prevTitle.includes(sentence)) {
        cell.setAttribute('title', prevTitle ? `${prevTitle} — ${sentence}` : sentence);
      }
      silenceCells.push(cell);
    });

    /* E057-08 : le silence devient une grandeur mesurable par ère. */
    if (eraBtn) {
      eraBtn.dataset.silences = String(rowSilences);
      if (!eraBtn.querySelector('.points-e057-era-badge')) {
        const badge = el('span', 'points-e057-era-badge', String(rowSilences));
        badge.setAttribute('aria-hidden', 'true');
        eraBtn.appendChild(badge);
      }
      eraBtn.setAttribute('aria-label',
        `${eraName} — ${rowSilences} silence(s) de la matrice.`);
    }
  });

  layout.dataset.e057Silences = String(silences);

  /* E057-04 : encart explicatif, nœud statique visible, une seule fois. */
  let note = scopedNode(NOTE_ID, layout);
  if (!note) {
    note = el('p', 'points-e057-note',
      'Un silence est une donnée : une cellule sans point n’est pas un vide masqué mais une absence explicite — « vide justifié » ou « omission justifiée » selon la méthodologie. Elle se lit, se compte et se documente.');
    note.id = NOTE_ID;
    const filters = layout.querySelector('.points-filters');
    if (matrix && filters && filters.parentElement === matrix) matrix.insertBefore(note, filters);
    else if (matrix) matrix.appendChild(note);
  }

  /* E057-05 : chaque silence est décrit par l'encart via aria-describedby,
   * en préservant les identifiants déjà référencés par ailleurs. */
  silenceCells.forEach((cell) => {
    const ids = (cell.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!ids.includes(NOTE_ID)) ids.push(NOTE_ID);
    cell.setAttribute('aria-describedby', ids.join(' '));
  });

  /* E057-06 : résumé chiffré entièrement dérivé du comptage du DOM. */
  let summary = scopedNode(SUMMARY_ID, layout);
  if (!summary) {
    summary = el('p', 'points-e057-summary', '');
    summary.id = SUMMARY_ID;
    const title = matrix && matrix.querySelector('.points-title');
    if (matrix && title && title.nextSibling) matrix.insertBefore(summary, title.nextSibling);
    else if (matrix) matrix.appendChild(summary);
  }
  const coverage = total ? Math.round((filled / total) * 100) : 0;
  summary.textContent = `Silences de la matrice : ${silences} cellule(s) vide(s) sur ${total} (${filled} avec points, couverture ${coverage} %). Un silence se documente, il ne se masque pas.`;

  /* E057-07 : légende des trois états de cellule, formes + texte. */
  let legend = scopedNode(LEGEND_ID, layout);
  if (!legend) {
    legend = el('ul', 'points-e057-legend');
    legend.id = LEGEND_ID;
    [
      ['■', 'Cellule avec points : au moins un point validé.'],
      ['·', 'Silence : aucune donnée pour cette ère × ce domaine.'],
      ['◇', 'Omission justifiée : silence documenté par un ID d’omission.'],
    ].forEach(([glyph, sentence]) => {
      const li = el('li');
      const mark = el('span', 'points-e057-glyph', glyph);
      mark.setAttribute('aria-hidden', 'true');
      li.append(mark, document.createTextNode(' ' + sentence));
      legend.appendChild(li);
    });
    const gridParent = grid && grid.parentElement;
    if (matrix && gridParent === matrix && grid.nextSibling) matrix.insertBefore(legend, grid.nextSibling);
    else if (matrix) matrix.appendChild(legend);
  }

  /* E057-10 : couplage mouvement réduit (JS + media query déjà dans la feuille). */
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }
});
