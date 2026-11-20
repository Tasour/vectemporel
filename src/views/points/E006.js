import { register } from './registry.js';

/* Lentille E006 — Matrice & grille : légende domaines / familles / certitude
 * (domaine A). Dix chantiers décrits dans UNIFIED_AUDIT/POINTS/views/E006.md.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, la coque et styles.css ne sont ni édités ni doublés : E006 ajoute
 * une légende LOCALE, en lecture seule, dans .points-matrix, pour rendre la
 * matrice lisible sans infobulle. Aucune donnée historique n'est inventée :
 * - les domaines affichés sont lus dans l'en-tête réel .points-grid-row.is-head ;
 * - les huit familles et les quatre degrés de certitude sont le vocabulaire
 *   normatif de POINT_METHODOLOGY.md (§1 et §2), affiché en texte visible ;
 * - la présence d'une famille vient du <select> déjà construit par points.js ;
 * - le niveau déclaré vient du badge .points-meta .confidence du détail.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, les filtres internes ou une autre lentille.
 *
 * Invariants : un seul greffon, une seule feuille CSS, une seule légende par
 * rendu ; tout identifiant préfixé `points-e006-` ; aucun innerHTML, aucune
 * écriture destructive du balisage existant ; zéro réseau, zéro aléa, zéro
 * timer, zéro rAF, zéro console.* ; aucune information portée par la seule
 * couleur (chaque état a un glyphe ET un mot).
 */

const CSS_ID = 'points-e006';
const SCOPE = 'points-e006';
const LEGEND_ID = 'points-e006-legend';
const TITLE_ID = 'points-e006-title';
const REDUCED_ATTR = 'data-e006-reduced';

/* E006-02 / E006-04 : taxonomie canonique (POINT_METHODOLOGY.md §2). Ces slugs
 * sont le vocabulaire de la méthode, pas des faits historiques. */
const FAMILIES = [
  { id: 'evenement', label: 'Événement' },
  { id: 'processus', label: 'Processus' },
  { id: 'acteur', label: 'Acteur' },
  { id: 'groupe_social', label: 'Groupe social' },
  { id: 'lieu', label: 'Lieu' },
  { id: 'institution', label: 'Institution' },
  { id: 'repere_normatif', label: 'Repère normatif' },
  { id: 'memoire', label: 'Mémoire' },
];

/* E006-02 / E006-05 : les quatre degrés de certitude de la méthode (§1), avec
 * un glyphe, un mot et une glose fidèle aux règles d'intégrité (§3 : le disputé
 * reste disputé ; les silences sont des données). */
const CONFIDENCE = [
  { key: 'certain', label: 'Certain', mark: '■', gloss: 'établi par des sources concordantes' },
  { key: 'probable', label: 'Probable', mark: '◐', gloss: 'vraisemblable, non encore tranché' },
  { key: 'dispute', label: 'Disputé', mark: '≈', gloss: 'controverse maintenue, non résolue par un silence' },
  { key: 'non-documente', label: 'Non documenté', mark: '?', gloss: 'omission explicite : un silence est une donnée' },
];

/* E006-05 : traduction déterministe du token réellement écrit dans le détail.
 * Les alias « vérifié », « high » et « medium » reprennent les libellés déjà
 * rencontrés dans le jeu de données ; « disputed » est la variante anglaise de
 * « disputé ». Aucun token inconnu n'est forcé : il est réaffiché tel quel. */
const CONFIDENCE_ALIASES = {
  'certain': 'certain',
  'vérifié': 'certain',
  'vérifie': 'certain',
  'high': 'certain',
  'probable': 'probable',
  'medium': 'probable',
  'disputé': 'dispute',
  'disputed': 'dispute',
  'non documenté': 'non-documente',
  'non documente': 'non-documente',
};

/* E006-01 / E006-06 : feuille unique, entièrement préfixée par `.points-e006`,
 * classe posée sur .points-layout : aucune fuite hors de cette vue. Chaque état
 * porte un glyphe ET un mot ; la couleur devient redondante, jamais nécessaire. */
const CSS = `
.points-e006 .points-e006-legend {
  box-sizing: border-box;
  margin: 14px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-e006 .points-e006-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-e006 .points-e006-intro,
.points-e006 .points-e006-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-e006 .points-e006-block { margin: 0 0 10px; }
.points-e006 .points-e006-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-e006 .points-e006-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 4px 10px;
}
.points-e006 .points-e006-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-e006 .points-e006-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-e006 .points-e006-name { color: var(--ink-soft); }
.points-e006 .points-e006-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px;
}
.points-e006 .points-e006-family-item.is-absent .points-e006-glyph { color: var(--muted-2); }
.points-e006 .points-e006-confidence-item.is-current .points-e006-name {
  color: var(--gold-bright); font-weight: 600;
}
.points-e006 .points-e006-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
}
.points-e006 .points-e006-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; color: var(--muted-2);
}
.points-e006[` + REDUCED_ATTR + `="1"] .points-e006-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e006 .points-e006-glyph { transition: none; }
}
@media (max-width: 900px) {
  .points-e006 .points-e006-list { grid-template-columns: 1fr; }
}
@media (forced-colors: active) {
  .points-e006 .points-e006-legend { border-color: CanvasText; }
  .points-e006 .points-e006-glyph { color: CanvasText; }
  .points-e006 .points-e006-confidence-item.is-current .points-e006-name { color: Highlight; }
}
@media print {
  .points-e006 .points-e006-legend { border-color: #666; background: transparent; }
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

function childrenOf(node) {
  return node && node.children ? Array.prototype.slice.call(node.children) : [];
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E006-03 : les domaines sont LUS dans l'en-tête réel produit par points.js
 * (points.js:34-37) ; la première colonne « Ère » est écartée. Aucun domaine
 * n'est codé en dur, aucun total n'est supposé. */
function domainLabels(layout) {
  const head = query(layout, '.points-grid .points-grid-row.is-head');
  return childrenOf(head).slice(1).map(txt).filter(Boolean);
}

/* E006-04 : points.js:73-84 construit deux <select> dans .points-filters ; le
 * second porte les familles présentes dans le corpus du pays. */
function familySelect(layout) {
  const filters = query(layout, '.points-filters');
  if (!filters || typeof filters.querySelectorAll !== 'function') return null;
  const selects = filters.querySelectorAll('select');
  return selects.length >= 2 ? selects[1] : (selects[0] || null);
}

function presentFamilies(select) {
  const set = new Set();
  if (!select || !select.options) return set;
  for (const option of select.options) {
    const value = txt(option.value);
    if (value && value !== '*') set.add(value);
  }
  return set;
}

/* E006-05 : le token est lu dans le badge déjà rendu par points.js:105 ; E006
 * ne modifie jamais ce badge (réservé à E022). */
function currentConfidence(layout) {
  return txt(query(layout, '.points-detail .points-meta .confidence'));
}

function normalizeConfidence(token) {
  const key = txt(token).toLocaleLowerCase('fr');
  return Object.prototype.hasOwnProperty.call(CONFIDENCE_ALIASES, key)
    ? CONFIDENCE_ALIASES[key] : '';
}

function signatureOf(domains, present, token) {
  return domains.join('|') + '||' + [...present].sort().join('|') + '||' + token;
}

function listItem(ctx, className, glyph, name, state) {
  const li = ctx.el('li', className);
  li.append(
    ctx.el('span', 'points-e006-glyph', glyph),
    ctx.el('span', 'points-e006-name', name)
  );
  li.appendChild(ctx.el('span', 'points-e006-state', state));
  return li;
}

/* E006-07 : la grille déclare la légende sans écraser les relations posées par
 * E002, E003 ou E007 : les identifiants existants sont préservés et dédupliqués. */
function augmentDescribedBy(grid, id) {
  const existing = (grid.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(grid, 'aria-describedby', existing.concat(id).join(' '));
}

/* E006-02 : structure statique construite une seule fois par rendu ; seuls les
 * trois blocs et les compteurs sont remplacés par fill() (aucun innerHTML). */
function buildLegend(ctx) {
  const legend = ctx.el('section', 'points-e006-legend');
  legend.id = LEGEND_ID;
  setAttr(legend, 'role', 'region');
  setAttr(legend, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-e006-title',
    'Légende de lecture — domaines, familles, certitude');
  title.id = TITLE_ID;
  legend.appendChild(title);

  legend.appendChild(ctx.el('p', 'points-e006-intro',
    'Trois axes classent la matrice et la fiche : le domaine est une colonne, la famille est une étiquette sémantique, la certitude est le degré de confiance déclaré. Chaque état est écrit en toutes lettres et avec un signe, jamais par la couleur seule.'));

  const axes = [
    ['points-e006-domain', 'Domaines — les colonnes de la matrice', 'points-e006-domain-list'],
    ['points-e006-family', 'Familles — huit questions sur un point', 'points-e006-family-list'],
    ['points-e006-confidence', 'Certitude — quatre degrés déclarés', 'points-e006-confidence-list'],
  ];
  axes.forEach(([blockClass, label, listClass]) => {
    const block = ctx.el('div', 'points-e006-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-e006-block-title', label));
    const list = ctx.el('ul', 'points-e006-list');
    list.className = 'points-e006-list ' + listClass;
    block.appendChild(list);
    legend.appendChild(block);
  });

  legend.appendChild(ctx.el('p', 'points-e006-current', ''));
  legend.appendChild(ctx.el('p', 'points-e006-metrics', ''));
  legend.appendChild(ctx.el('p', 'points-e006-note',
    'Règle de lecture : une case donne un COMBIEN, une colonne donne un QUEL DOMAINE, la fiche donne le POURQUOI. Un point n’est jamais réduit à sa date (POINT_METHODOLOGY.md §2).'));
  return legend;
}

/* E006-03 / E006-04 / E006-05 / E006-08 : tout le contenu dynamique est écrit
 * ici par replaceChildren, à partir des signaux lus plus haut. */
function fill(ctx, legend, domains, present, token, current) {
  const domainList = query(legend, '.points-e006-domain-list');
  if (domainList) {
    domainList.replaceChildren(...domains.map((domain) =>
      listItem(ctx, 'points-e006-domain-item', '▦', domain, 'colonne')));
  }

  const known = FAMILIES.filter((family) => present.has(family.id)).length;
  const familyList = query(legend, '.points-e006-family-list');
  if (familyList) {
    familyList.replaceChildren(...FAMILIES.map((family) => {
      const on = present.has(family.id);
      return listItem(ctx, 'points-e006-family-item ' + (on ? 'is-present' : 'is-absent'),
        on ? '●' : '○', family.label, on ? 'présente' : 'absente');
    }));
  }

  const confidenceList = query(legend, '.points-e006-confidence-list');
  if (confidenceList) {
    confidenceList.replaceChildren(...CONFIDENCE.map((level) => {
      const on = current === level.key;
      const li = listItem(ctx, 'points-e006-confidence-item ' + (on ? 'is-current' : 'is-level'),
        level.mark, `${level.label} — ${level.gloss}`, on ? 'niveau affiché' : 'niveau');
      if (on) li.dataset.e006Current = '1';
      return li;
    }));
  }

  const currentLine = query(legend, '.points-e006-current');
  if (currentLine) {
    currentLine.textContent = token
      ? `Niveau déclaré dans le détail : ${token}${current ? '' : ' (libellé non normalisé)'}.`
      : 'Aucun point affiché dans le détail : aucun niveau déclaré à légender.';
  }
  legend.dataset.e006CurrentToken = token || '';

  const metrics = query(legend, '.points-e006-metrics');
  if (metrics) {
    metrics.textContent =
      `Légende : ${domains.length} domaine${plural(domains.length, '', 's')} affiché${plural(domains.length, '', 's')} en colonne · `
      + `${FAMILIES.length} familles canoniques (${known} présente${plural(known, '', 's')}) · `
      + `${CONFIDENCE.length} degrés de certitude.`;
  }
}

/* E006-01 / E006-09 / E006-10 : unique point d'entrée, gardes structurelles,
 * feuille unique, portée unique, repli silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || ctx.viewId !== 'points') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = isElement(ctx.layout) ? ctx.layout : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;
  const matrix = query(layout, '.points-matrix');
  const grid = query(layout, '.points-grid');
  if (!isElement(matrix) || !isElement(grid)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (layout.hasAttribute && layout.hasAttribute(REDUCED_ATTR)) layout.removeAttribute(REDUCED_ATTR);

  const domains = domainLabels(layout);
  const present = presentFamilies(familySelect(layout));
  const token = currentConfidence(layout);
  const current = normalizeConfidence(token);
  const sig = signatureOf(domains, present, token);

  /* Idempotence : un nœud issu d'un rendu précédent mais détaché est retiré ;
   * un nœud déjà monté dans le layout courant est réutilisé. */
  const stale = document.getElementById(LEGEND_ID);
  if (stale && !layout.contains(stale)) stale.remove();

  let legend = query(layout, '#' + LEGEND_ID);
  if (!isElement(legend)) {
    legend = buildLegend(ctx);
    matrix.appendChild(legend);
  } else if (legend.parentElement !== matrix) {
    legend.remove();
    legend = buildLegend(ctx);
    matrix.appendChild(legend);
  }

  if (legend.dataset.e006Signature !== sig) {
    legend.dataset.e006Signature = sig;
    fill(ctx, legend, domains, present, token, current);
  }

  setAttr(legend, 'data-e006', '1');
  setAttr(grid, 'data-e006-legend', '1');
  augmentDescribedBy(grid, LEGEND_ID);
}

register('E006', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
