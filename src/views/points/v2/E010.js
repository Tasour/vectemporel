import { register } from './registry.js';

/* Lentille V2 E010 — Matrice & grille : tirage papier enrichi (seconde passe).
 *
 * Domaine identique à la passe 1 (styles d'impression / export papier de la
 * matrice), mais dix chantiers INÉDITS : bandeau de tirage, numérotation par
 * compteurs, colophon, bascule photocopie, index des domaines, filets de
 * lecture, signature déterministe, annonce d'état et audit d'idempotence.
 *
 * Fichier possédé : ce module uniquement. La passe 1 (src/views/points/E010.js),
 * la vue, la coque, styles.css et toute autre lentille ne sont ni édités ni
 * doublés. La seconde passe cohabite avec la première sans collision : feuille
 * `points-v2-e010`, portée `.points-v2-e010`, identifiants `points-v2-e010-*`.
 *
 * Contrat exploité : viewId ('pointsv2', toléré 'points'), stage, layout, css,
 * el. Aucune dépendance vers le store, les filtres ou le détail ; aucun chiffre
 * de couverture codé en dur, toute grandeur est recomptée sur le DOM courant.
 *
 * Invariants : un seul CSS, cinq nœuds uniques, un seul écouteur local, aucune
 * méthode d'écriture de balisage en chaîne, aucune journalisation, aucune
 * requête, aucune graine aléatoire, aucun minuteur ni boucle d'animation.
 * Le greffon reste passif : l'impression n'est jamais déclenchée de lui-même.
 */

const CSS_ID = 'points-v2-e010';
const SCOPE = 'points-v2-e010';
const MASTHEAD_ID = 'points-v2-e010-masthead';
const INDEX_ID = 'points-v2-e010-index';
const COLOPHON_ID = 'points-v2-e010-colophon';
const PHOTOCOPY_ID = 'points-v2-e010-photocopy';
const STATUS_ID = 'points-v2-e010-status';

/* E010-V2-01 — Une seule feuille, préfixée, sans import ni ressource distante.
 * Toutes les règles d'écran précèdent le @media print ; aucun @page global n'est
 * émis (le format reste celui du navigateur et des réglages de l'utilisateur). */
const CSS = `
/* E010-V2-02 / E010-V2-04 / E010-V2-06 — artefacts papier masqués à l'écran. */
.points-v2-e010 .points-v2-e010-masthead,
.points-v2-e010 .points-v2-e010-index,
.points-v2-e010 .points-v2-e010-colophon { display: none; }

/* E010-V2-05 — Bascule « Mode photocopie » : cible ≥ 36 px, focus visible.
 * aria-pressed est réservé à cette bascule indépendante. */
.points-v2-e010 #points-v2-e010-photocopy {
  min-height: 36px; padding: 0 10px;
  border: 1px solid #8a6d2f; border-radius: 8px;
  background: #0b0f15; color: #f0e6cf;
  font: inherit; font-size: 11px; cursor: pointer;
}
.points-v2-e010 #points-v2-e010-photocopy:hover { border-color: #f0c96b; }
.points-v2-e010 #points-v2-e010-photocopy:focus-visible { outline: 2px solid #f0c96b; outline-offset: 2px; }
.points-v2-e010 #points-v2-e010-photocopy[aria-pressed="true"] { border-width: 2px; }

/* E010-V2-09 — Annonce d'état : retirée du flux visuel, exposée aux lecteurs. */
.points-v2-e010 #points-v2-e010-status {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media print {
  /* E010-V2-02 — Bandeau de tirage, solidaire du haut de la matrice. */
  .points-v2-e010 .points-v2-e010-masthead {
    display: block; margin: 0 0 8pt; padding: 6pt 8pt;
    border: .6pt solid #000; background: #fff; color: #000;
    break-after: avoid; page-break-after: avoid;
  }
  .points-v2-e010 .points-v2-e010-kicker,
  .points-v2-e010 .points-v2-e010-scope {
    margin: 0 0 2pt; color: #000; font-size: 8pt; line-height: 1.3;
  }
  .points-v2-e010 .points-v2-e010-title {
    margin: 0 0 3pt; color: #000; font-size: 13pt; font-weight: 700;
  }

  /* E010-V2-06 — Index des domaines : un compte par colonne, dérivé du DOM. */
  .points-v2-e010 .points-v2-e010-index {
    display: block; margin: 8pt 0 0; padding: 0;
    background: #fff; color: #000; break-inside: avoid; page-break-inside: avoid;
  }
  .points-v2-e010 .points-v2-e010-index-title {
    margin: 0 0 3pt; color: #000; font-size: 9pt; font-weight: 700;
  }
  .points-v2-e010 .points-v2-e010-index-list { display: table; width: 100%; }
  .points-v2-e010 .points-v2-e010-index-item { display: table-row; }
  .points-v2-e010 .points-v2-e010-index-name,
  .points-v2-e010 .points-v2-e010-index-value {
    display: table-cell; padding: 1pt 4pt;
    border-bottom: .4pt solid #000; color: #000;
    font-size: 8pt; line-height: 1.25; vertical-align: top;
  }
  .points-v2-e010 .points-v2-e010-index-value {
    width: 12%; text-align: right; font-variant-numeric: tabular-nums;
  }
  .points-v2-e010 .points-v2-e010-index-empty {
    margin: 0; color: #000; font-size: 8pt;
  }

  /* E010-V2-04 — Colophon de fin de matrice : signature et conseil d'orientation. */
  .points-v2-e010 .points-v2-e010-colophon {
    display: block; margin: 8pt 0 0; padding: 4pt 0 0;
    border-top: .6pt solid #000; background: #fff; color: #000;
    break-inside: avoid; page-break-inside: avoid;
  }
  .points-v2-e010 .points-v2-e010-signature,
  .points-v2-e010 .points-v2-e010-advice {
    margin: 0 0 2pt; color: #000; font-size: 8pt; line-height: 1.3;
  }
  .points-v2-e010 .points-v2-e010-signature {
    font-weight: 700; font-variant-numeric: tabular-nums;
  }

  /* E010-V2-03 — Numérotation des ères par compteur CSS : aucun texte ajouté
   * au DOM, aucune colonne supplémentaire, pagination native préservée. */
  .points-v2-e010 .points-grid { counter-reset: v2e010era; }
  .points-v2-e010 .points-grid-row:not(.is-head) { counter-increment: v2e010era; }
  .points-v2-e010 .points-grid-row:not(.is-head) > .points-era::before {
    content: counter(v2e010era, decimal-leading-zero) " · ";
    font-variant-numeric: tabular-nums;
  }

  /* E010-V2-07 — Filets de lecture et hiérarchie de l'ère active, sans couleur. */
  .points-v2-e010 .points-grid-row:not(.is-head) { border-bottom: .5pt solid #000; }
  .points-v2-e010 .points-grid-row > :first-child { border-right: .8pt solid #000; }
  .points-v2-e010 .points-grid-row.is-active > .points-era { border-top: 1.5pt double #000; }

  /* E010-V2-05 — Photocopie : traits renforcés par spécificité supérieure,
   * sans !important, y compris face à la feuille de la passe 1. */
  .points-v2-e010.points-v2-e010-photocopy .points-grid .points-cell { border: 1.25pt solid #000; }
  .points-v2-e010.points-v2-e010-photocopy .points-grid .points-cell.has-points { border: 2pt solid #000; }

  /* E010-V2-05 / E010-V2-09 — contrôles d'écran et annonce absent du papier. */
  .points-v2-e010 #points-v2-e010-photocopy,
  .points-v2-e010 #points-v2-e010-status { display: none !important; }
}
`;

function textOf(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

function kids(parent, tag) {
  const out = [];
  if (!parent) return out;
  for (let i = 0; i < parent.children.length; i += 1) {
    if (parent.children[i].tagName === tag) out.push(parent.children[i]);
  }
  return out;
}

/* Toutes les grandeurs imprimées sont recomptées sur le DOM courant : ères,
 * domaines, cellules pourvues/vides et compte par colonne. Aucun total figé. */
function collect(layout) {
  const grid = layout.querySelector('.points-grid');
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const headSpans = kids(head, 'SPAN');
  const domains = Math.max(0, headSpans.length - 1);
  const domainNames = headSpans.slice(1).map(textOf);
  const rows = [];
  if (grid) {
    for (let i = 0; i < grid.children.length; i += 1) {
      const row = grid.children[i];
      if (row !== head && row.classList && row.classList.contains('points-grid-row')) rows.push(row);
    }
  }
  const perDomain = [];
  for (let d = 0; d < domains; d += 1) perDomain.push(0);
  let total = 0;
  let filled = 0;
  rows.forEach((row) => {
    const cells = kids(row, 'BUTTON').filter((node) => node.classList && node.classList.contains('points-cell'));
    const list = cells.length ? cells : Array.prototype.slice.call(row.children, 1);
    list.forEach((cell, j) => {
      total += 1;
      if (cell.classList && cell.classList.contains('has-points')) {
        filled += 1;
        if (j < perDomain.length) perDomain[j] += 1;
      }
    });
  });
  const title = textOf(layout.querySelector('.points-title'))
    || textOf(layout.querySelector('.view-kicker'))
    || 'Matrice de couverture';
  return { eras: rows.length, domains, domainNames, perDomain, total, filled, title };
}

function scopeLine(m) {
  return m.eras + ' ères · ' + m.domains + ' domaines · ' + m.filled + '/' + m.total + ' cellules pourvues';
}

/* E010-V2-08 — Signature stable, sans aléa ni horodatage : deux rendus du même
 * DOM produisent la même référence, ce qui permet d'apparier papier et écran. */
function signature(m) {
  return 'Réf. E010-V2 · ' + scopeLine(m);
}

/* E010-V2-10 — Un nœud par identifiant, réutilisé s'il est déjà dans le layout,
 * sinon recréé après retrait d'un éventuel orphelin hors du layout. */
function uniqueNode(ctx, layout, id, tag, className) {
  let node = layout.querySelector('#' + id);
  if (node) return node;
  const orphan = document.getElementById(id);
  if (orphan && orphan.parentElement) orphan.parentElement.removeChild(orphan);
  node = ctx.el(tag, className);
  node.id = id;
  return node;
}

function placeFirst(parent, node) {
  if (node.parentElement !== parent || parent.firstChild !== node) parent.insertBefore(node, parent.firstChild);
}

function placeAfter(parent, node, ref) {
  const want = ref ? ref.nextSibling : null;
  if (node.parentElement !== parent || node.nextSibling !== want) {
    if (want) parent.insertBefore(node, want);
    else parent.appendChild(node);
  }
}

function matrixOf(layout) {
  return layout.querySelector('.points-matrix') || layout;
}

function filtersOf(layout) {
  return layout.querySelector('.points-filters') || matrixOf(layout);
}

/* E010-V2-02 — Bandeau de tirage : titre et périmètre lus dans le DOM. */
function ensureMasthead(ctx, layout, m) {
  const node = uniqueNode(ctx, layout, MASTHEAD_ID, 'section', 'points-v2-e010-masthead');
  node.setAttribute('aria-label', 'Bandeau de tirage de la matrice');
  node.replaceChildren(
    ctx.el('p', 'points-v2-e010-kicker', 'Tirage papier · seconde passe'),
    ctx.el('p', 'points-v2-e010-title', m.title),
    ctx.el('p', 'points-v2-e010-scope', scopeLine(m))
  );
  placeFirst(matrixOf(layout), node);
  return node;
}

/* E010-V2-04 — Colophon solidaire de la fin de la matrice, avant toute annexe. */
function ensureColophon(ctx, layout, m) {
  const node = uniqueNode(ctx, layout, COLOPHON_ID, 'section', 'points-v2-e010-colophon');
  node.setAttribute('aria-label', 'Pied de tirage de la matrice');
  node.replaceChildren(
    ctx.el('p', 'points-v2-e010-signature', signature(m)),
    ctx.el('p', 'points-v2-e010-advice', 'Fin du tirage · orientation A4 paysage conseillée pour la largeur de la matrice.')
  );
  const matrix = matrixOf(layout);
  placeAfter(matrix, node, layout.querySelector('#' + INDEX_ID) || layout.querySelector('.points-grid'));
  return node;
}

/* E010-V2-05 — Bascule indépendante : un seul écouteur, posé une seule fois. */
function ensurePhotocopy(ctx, layout) {
  const btn = uniqueNode(ctx, layout, PHOTOCOPY_ID, 'button', 'points-v2-e010-photocopy-btn');
  btn.type = 'button';
  btn.textContent = 'Mode photocopie';
  btn.setAttribute('aria-label', 'Renforcer les traits pour une photocopie ou une impression monochrome');
  if (!btn.getAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');
  if (!btn.getAttribute('data-points-v2-e010-bound')) {
    btn.setAttribute('data-points-v2-e010-bound', '1');
    btn.addEventListener('click', () => {
      const on = !layout.classList.contains('points-v2-e010-photocopy');
      layout.classList.toggle('points-v2-e010-photocopy', on);
      layout.setAttribute('data-points-v2-e010-photocopy', on ? '1' : '0');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  const parent = filtersOf(layout);
  if (btn.parentElement !== parent) parent.appendChild(btn);
  return btn;
}

/* E010-V2-06 — Index colonne par colonne, obtenu depuis l'en-tête et les
 * cellules ; aucun domaine n'est inventé quand l'en-tête est absent. */
function ensureIndex(ctx, layout, m) {
  const node = uniqueNode(ctx, layout, INDEX_ID, 'section', 'points-v2-e010-index');
  node.setAttribute('aria-label', 'Index des domaines du tirage');
  const list = ctx.el('div', 'points-v2-e010-index-list');
  if (!m.domains) {
    list.appendChild(ctx.el('p', 'points-v2-e010-index-empty', 'Aucun domaine détecté dans la matrice.'));
  } else {
    m.domainNames.forEach((name, i) => {
      const item = ctx.el('div', 'points-v2-e010-index-item');
      item.appendChild(ctx.el('span', 'points-v2-e010-index-name', name));
      item.appendChild(ctx.el('span', 'points-v2-e010-index-value', String(m.perDomain[i] || 0)));
      list.appendChild(item);
    });
  }
  node.replaceChildren(ctx.el('p', 'points-v2-e010-index-title', 'Index des domaines — cellules pourvues'), list);
  placeAfter(matrixOf(layout), node, layout.querySelector('.points-grid'));
  return node;
}

/* E010-V2-09 — Annonce d'état : aucun minuteur, aucun changement différé. */
function ensureStatus(ctx, layout, m) {
  const node = uniqueNode(ctx, layout, STATUS_ID, 'p', 'points-v2-e010-status');
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.textContent = 'Matrice prête pour l’impression — ' + scopeLine(m) + '.';
  const parent = filtersOf(layout);
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

register('E010', (ctx) => {
  if (!ctx || typeof document === 'undefined') return;
  if (ctx.viewId && ctx.viewId !== 'pointsv2' && ctx.viewId !== 'points') return;
  if (!ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;

  /* Greffon tolérant : toute anomalie neutralise la seconde passe sans
   * exception remontée, sans journalisation et sans effusion de nœuds. */
  try {
    /* E010-V2-01 — Feuille unique, portée et marqueur de coexistence. */
    ctx.css(CSS_ID, CSS);
    layout.classList.add(SCOPE);
    layout.setAttribute('data-points-v2-e010', '1');

    const m = collect(layout);
    const grid = layout.querySelector('.points-grid');

    /* E010-V2-02 — Bandeau de tirage dérivé du DOM. */
    ensureMasthead(ctx, layout, m);

    /* E010-V2-03 — Trace de la numérotation par compteurs CSS. */
    if (grid) grid.setAttribute('data-points-v2-e010-numbered', '1');

    /* E010-V2-04 — Colophon de fin de tirage. */
    ensureColophon(ctx, layout, m);

    /* E010-V2-05 — Bascule « Mode photocopie ». */
    ensurePhotocopy(ctx, layout);

    /* E010-V2-06 — Index des domaines. */
    ensureIndex(ctx, layout, m);

    /* E010-V2-07 — Trace des filets de lecture. */
    if (grid) grid.setAttribute('data-points-v2-e010-guides', '1');

    /* E010-V2-08 — Signature déterministe exposée pour rapprochement. */
    layout.setAttribute('data-points-v2-e010-signature', signature(m));

    /* E010-V2-09 — Annonce d'état accessible. */
    ensureStatus(ctx, layout, m);

    /* E010-V2-10 — Audit d'idempotence : un seul nœud par identifiant. */
    const ids = [MASTHEAD_ID, INDEX_ID, COLOPHON_ID, PHOTOCOPY_ID, STATUS_ID];
    let unique = 0;
    ids.forEach((id) => {
      if (layout.querySelectorAll('#' + id).length === 1) unique += 1;
    });
    layout.setAttribute(
      'data-points-v2-e010-audit',
      unique + '/' + ids.length + ' nœuds uniques · ' + scopeLine(m)
    );
  } catch {
    return;
  }
});
