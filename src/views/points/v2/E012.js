import { register } from './registry.js';

/* Lentille POINTS V2 E012 — Tableau de bord de périmètre : lecture du filtre de
 * famille et de son intersection avec le domaine et l'ère.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E012.md — chantiers E012-01 à E012-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1 ni aucun
 * fichier partagé (vue points.js, coque, styles.css, registry.js, index.js,
 * lentilles E011 et E013) n'est modifié. La passe 1 (src/views/points/E012.js)
 * reste intacte : ses nœuds utilisent le préfixe points-e012-, les nôtres le
 * préfixe réservé points-v2-e012-, sans collision ni écrasement.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion(). Tout est dérivé du DOM rendu : options
 * des deux listes, bouton d'ère active, kicker du détail. Aucun chiffre n'est
 * calculé ni inventé, aucun appel au magasin, aucun contrôle natif retiré.
 *
 * Invariants V2 : un seul register, une seule feuille ctx.css, ids préfixés,
 * tout le DOM statique créé par ctx.el (jamais de balisage par chaîne), garde anti-doublon,
 * zéro réseau, zéro aléa, zéro minuteur, zéro rAF, zéro écouteur global, zéro
 * région live concurrente (E011 et E013 gardent l'annonce), zéro journal.
 */

const CSS_ID = 'points-v2-e012';
const SCOPE = 'points-v2-e012';

const ID = {
  summary: 'points-v2-e012-summary',
  fingerprint: 'points-v2-e012-fingerprint',
  families: 'points-v2-e012-families',
  note: 'points-v2-e012-note',
  coherence: 'points-v2-e012-coherence',
  metrics: 'points-v2-e012-metrics',
};

/* Feuille unique. Chaque sélecteur COMMENCE littéralement par
 * `.points-v2-e012`, y compris à l'intérieur des @media : aucune règle ne peut
 * fuir hors de la vue Points. Les attributs de donnée (data-points-v2-e012-*)
 * sont distincts de ceux de la passe 1 (data-points-e012-*), eux-mêmes
 * distincts de data-e011-* / data-e013-*. L'état « retenue » est porté par le
 * texte et un glyphe, jamais par la couleur seule (E012-07). */
const CSS = `
  .points-v2-e012 .points-v2-e012-summary,
  .points-v2-e012 .points-v2-e012-fingerprint,
  .points-v2-e012 .points-v2-e012-note,
  .points-v2-e012 .points-v2-e012-coherence,
  .points-v2-e012 .points-v2-e012-metrics {
    margin: 3px 0; color: var(--ink-soft); font-size: 11px;
    line-height: 1.45; font-variant-numeric: tabular-nums;
  }
  .points-v2-e012 .points-v2-e012-summary {
    padding: 5px 8px; min-height: 24px;
    border-left: 3px solid var(--gold); border-radius: 4px;
    background: rgba(230, 185, 111, .05);
    transition: background-color .16s linear;
  }
  .points-v2-e012 .points-v2-e012-fingerprint { color: var(--muted-2); font-size: 10px; }
  .points-v2-e012 .points-v2-e012-families {
    margin: 4px 0; display: grid; grid-template-columns: auto 1fr;
    column-gap: 10px; row-gap: 2px; font-size: 10px; line-height: 1.4;
  }
  .points-v2-e012 .points-v2-e012-dt { color: var(--muted-2); }
  .points-v2-e012 .points-v2-e012-dd { margin: 0; color: var(--muted-2); }
  .points-v2-e012 .points-v2-e012-dd[data-points-v2-e012-active="1"] {
    color: var(--gold-bright); font-weight: 700;
  }
  .points-v2-e012 .points-v2-e012-dd[data-points-v2-e012-active="1"]::before {
    content: "\\2713\\00A0"; font-style: normal;
  }
  .points-v2-e012 .points-filters { border-radius: 6px; }
  .points-v2-e012 .points-filters select:focus-visible,
  .points-v2-e012 .points-v2-e012-summary:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 720px) {
    .points-v2-e012 .points-v2-e012-summary,
    .points-v2-e012 .points-v2-e012-coherence,
    .points-v2-e012 .points-v2-e012-metrics { font-size: 12px; }
    .points-v2-e012 .points-v2-e012-families { grid-template-columns: 1fr; }
  }
  .points-v2-e012[data-points-v2-e012-reduced="1"] .points-v2-e012-summary { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e012 .points-v2-e012-summary { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e012 .points-v2-e012-summary {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    .points-v2-e012 .points-v2-e012-dd[data-points-v2-e012-active="1"] {
      border: 1px solid Highlight; color: CanvasText;
    }
  }
  @media print {
    .points-v2-e012 .points-v2-e012-summary {
      background: none; border-left-color: #000; transition: none;
    }
  }
`;

/* Sélecteurs défensifs : un DOM partiel ne doit jamais lever d'exception. */
function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (value && typeof value.textContent === 'string') {
    return value.textContent.replace(/\s+/g, ' ').trim();
  }
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function drop(node, name) {
  if (node && typeof node.removeAttribute === 'function') node.removeAttribute(name);
}

/* Récupère ou crée une ancre unique, puis la place juste avant le premier
 * contrôle de .points-filters. insertBefore déplace un nœud périmé d'un rendu
 * précédent : aucun doublon d'id même après navigation aller-retour. */
function anchor(doc, id, tag, className, filters, before, ctx) {
  let node = doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
  if (!node) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  if (node.parentNode !== filters || (before && node.nextSibling !== before)) {
    filters.insertBefore(node, before || null);
  }
  return node;
}

/* Position et libellé de l'option retenue, lus dans le DOM (jamais codés). */
function selectedInfo(select) {
  if (!select) return { index: 0, value: '*', label: '' };
  const raw = typeof select.selectedIndex === 'number' ? select.selectedIndex : -1;
  const index = raw >= 0 ? raw : 0;
  const options = qa(select, 'option');
  const option = options[index] || null;
  const value = (option && typeof option.value === 'string' ? option.value : '') || '*';
  return { index, value, label: option ? txt(option) : '' };
}

/* Ère active et sa position parmi les lignes non-en-tête de la grille. */
function activeEra(grid) {
  const row = q(grid, '.points-grid-row.is-active');
  if (!row) return { index: 0, label: '' };
  const rows = qa(grid, '.points-grid-row:not(.is-head)');
  const at = rows.indexOf(row);
  return { index: at >= 0 ? at : 0, label: txt(q(row, '.points-era')) || txt(row.firstElementChild) };
}

/* Le seul compte affiché est relu dans le kicker écrit par la vue. */
function kickerCount(layout) {
  const match = /(\d+)\s*point/i.exec(txt(q(layout, '.points-detail .view-kicker')));
  return match ? Number(match[1]) : null;
}

function apply(ctx) {
  /* E012-01 — Greffe unique, portée V2 et gardes défensifs. Le filtre sur
   * viewId laisse passer un ctx sans identifiant (harnais) mais refuse une
   * autre vue ; cssOnce rend l'injection de feuille idempotente. */
  if (!ctx || (ctx.viewId && ctx.viewId !== 'pointsv2')) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const filters = q(layout, '.points-filters');
  if (!filters || typeof filters.insertBefore !== 'function') return;
  const doc = layout.ownerDocument || document;
  if (!doc || typeof doc.getElementById !== 'function') return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  put(layout, 'data-points-v2-e012', '1');

  /* E012-02 — Ciblage sémantique des deux listes : aria-label d'abord, position
   * en repli. Le domaine est lu pour le résumé mais jamais marqué ni modifié. */
  const selects = qa(filters, 'select');
  const domainSelect = selects.find((s) => /domaine/i.test(s.getAttribute('aria-label') || '')) || selects[0] || null;
  const familySelect = selects.find((s) => /famille/i.test(s.getAttribute('aria-label') || '')) || selects[1] || null;
  const grid = q(layout, '.points-grid');
  const d = selectedInfo(domainSelect);
  const f = selectedInfo(familySelect);
  const era = activeEra(grid);
  const count = kickerCount(layout);

  /* E012-03 — Six ancres préfixées, réutilisées et repositionnées à chaque
   * rendu, créées exclusivement par ctx.el (aucun balisage par chaîne). Leur ordre est
   * stable car elles sont toutes insérées devant le même premier contrôle. */
  const before = filters.firstChild;
  const summary = anchor(doc, ID.summary, 'p', 'points-v2-e012-summary', filters, before, ctx);
  const fingerprint = anchor(doc, ID.fingerprint, 'p', 'points-v2-e012-fingerprint', filters, before, ctx);
  const families = anchor(doc, ID.families, 'dl', 'points-v2-e012-families', filters, before, ctx);
  const note = anchor(doc, ID.note, 'p', 'points-v2-e012-note', filters, before, ctx);
  const coherence = anchor(doc, ID.coherence, 'p', 'points-v2-e012-coherence', filters, before, ctx);
  const metrics = anchor(doc, ID.metrics, 'p', 'points-v2-e012-metrics', filters, before, ctx);

  /* E012-04 — Résumé de périmètre combiné : domaine, famille et ère sont
   * assemblés en langage naturel, contrairement au statut V1 qui ne décrivait
   * que la famille. Le compte n'est ajouté que s'il est renseigné. */
  const domLabel = d.value === '*' ? 'tous les domaines' : (d.label || d.value);
  const famLabel = f.value === '*' ? 'toutes les familles' : (f.label || f.value);
  const eraLabel = era.label || 'inconnue';
  summary.textContent = `Périmètre actif — domaine : ${domLabel} · famille : ${famLabel} · ère : ${eraLabel}`
    + `${count === null ? '' : ` · ${count} point(s) annoncé(s)`}.`;

  /* E012-05 — Empreinte de configuration déterministe : la position des
   * options retenues dans chaque liste et de l'ère active, sans aléa ni date,
   * offre un repère d'audit stable pour une même configuration. */
  fingerprint.textContent = `Empreinte de configuration : D${d.index}·F${f.index}·E${era.index}`
    + ' — positions des options retenues dans les deux listes et de l’ère active.';

  /* E012-06 — Définition des familles en liste <dl> : une paire terme/
   * définition par option réelle, la retenue étant déclarée par son texte. */
  const optionList = qa(familySelect, 'option');
  const pairs = [];
  optionList.forEach((option) => {
    const value = (option && typeof option.value === 'string' ? option.value : '') || '*';
    const term = ctx.el('dt', 'points-v2-e012-dt', txt(option) || value);
    const isActive = f.value === value;
    const def = ctx.el('dd', 'points-v2-e012-dd', isActive ? 'retenue' : 'disponible');
    put(def, 'data-points-v2-e012-active', isActive ? '1' : '0');
    pairs.push(term, def);
  });
  families.replaceChildren(...pairs);

  /* E012-07 — L'état « retenue » est doublement porté : le mot « retenue »
   * et le glyphe ✓ inséré en CSS, plus une bordure en couleurs forcées.
   * On ajoute un titre explicite aux définitions actives : aucune information
   * ne repose sur la seule teinte, y compris sans feuille de style. */
  qa(families, '.points-v2-e012-dd[data-points-v2-e012-active="1"]').forEach((def) => {
    put(def, 'title', 'Famille retenue — signal textuel et glyphe ✓, indépendant de la couleur.');
  });

  /* E012-08 — Note pédagogique statique, texte sémantique indexable et
   * imprimable : elle explique l'intersection des trois filtres et l'origine
   * des nombres, sans écrire dans une région live concurrente. */
  note.textContent = 'Le filtre de famille s’intersecte avec le domaine et l’ère : '
    + 'un point n’est affiché que s’il appartient aux trois. Les nombres affichés '
    + 'proviennent du périmètre calculé par la vue, jamais d’une estimation locale.';

  /* E012-09 — Diagnostic de cohérence entre le compte du kicker et la
   * présence effective d'un point dans le détail, avec repli si le kicker
   * manque : aucune incohérence n'est masquée par un chiffre inventé. */
  const hasPoint = !!q(layout, '.points-detail .points-point-title');
  let verdict;
  if (count === null) verdict = 'Kicker absent : cohérence non vérifiable.';
  else if (count === 0) verdict = 'Périmètre vide : aucun point à afficher dans le détail.';
  else if (!hasPoint) verdict = `${count} point(s) annoncé(s) mais détail non renseigné.`;
  else verdict = `Cohérent : ${count} point(s) annoncé(s), détail renseigné.`;
  coherence.textContent = `Diagnostic — ${verdict}`;

  /* E012-10 — Repères chiffrés tabulaires et groupement accessible : les
   * effectifs sont décomptés depuis les options et les lignes réelles, puis
   * les deux listes reçoivent une description additive (sans écraser E011 ni
   * la passe 1) et .points-filters devient un groupe nommé. */
  const realOptions = (select) => qa(select, 'option')
    .filter((o) => { const v = (o && typeof o.value === 'string' ? o.value : '') || '*'; return v !== '*'; }).length;
  const eraRows = qa(grid, '.points-grid-row:not(.is-head)').length;
  metrics.textContent = `Comptes V2 — familles : ${realOptions(familySelect)}`
    + ` · domaines : ${realOptions(domainSelect)} · ères : ${eraRows}`
    + ` · ère active : ${era.label || '—'}.`;

  [domainSelect, familySelect].forEach((select) => {
    if (!select) return;
    const ids = (select.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    [ID.summary, ID.note].forEach((id) => { if (ids.indexOf(id) === -1) ids.push(id); });
    put(select, 'aria-describedby', ids.join(' '));
  });
  put(filters, 'role', 'group');
  put(filters, 'aria-label', 'Filtres du périmètre — domaine, famille et ère');

  /* Couplage défensif au mouvement réduit, en plus de la media query. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    put(layout, 'data-points-v2-e012-reduced', '1');
  } else {
    drop(layout, 'data-points-v2-e012-reduced');
  }
}

register('E012', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
