import { register } from './registry.js';

/* Lentille POINTS V2 E051 — passe 2 (V2) — domaine F : sémantique & données.
 * « Traçabilité des nombres : chaque chiffre recalculé depuis le DOM rendu ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E051.md — chantiers V2 E051-01 à
 * E051-10. Fichier possédé : ce module uniquement. La passe 1
 * (src/views/points/E051.js), la vue (src/views/points.js), le store, styles.css,
 * registry.js et index.js ne sont ni édités ni doublés.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) alors que la passe 1
 * cible 'points' (points.js:127). La lentille filtre donc sur 'pointsv2'. Tous
 * les identifiants, classes, clés dataset et attributs d'état sont préfixés
 * points-v2-e051 / pointsV2E051 afin de ne pas écraser ceux de la passe 1
 * (points-e051-*, data-e051-*) qui s'appliquent au même DOM.
 *
 * Périmètre strict : la TRAÇABILITÉ DES NOMBRES. Chaque grandeur affichée est
 * relue dans les nœuds réellement produits par points.js (titre, grille, titre
 * des cellules, selects, kicker du détail, métadonnée), puis recalculée. Aucun
 * total, aucun millésime, aucune valeur de données n'est codée en dur : seules
 * apparaissent des constantes structurelles (nombre de colonnes d'en-tête,
 * base 100 du pourcentage, largeur de repli) et des libellés. Ne relèvent pas
 * d'E051 : les dates (E052), la forme P=(S,R,O,T,E,D,Src,C) (E053), la légende
 * des familles (E054), le sort des points disputés (E055), l'omission de
 * source (E056), les silences (E057), les noms historiques (E058), l'échelle
 * (E059) et la couverture binaire interprétée (E060). Ce module ne dérive et
 * ne recoupe que des effectifs, des sommes et des couvertures.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } et les helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, n'écrit dans aucune région existante et affiche son état en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Invariants V2 : un seul register('E051', ctx => { … }) ; un seul appel à
 * ctx.css('points-v2-e051', …) dont TOUTES les règles sont préfixées
 * .points-v2-e051 ; des ids uniques préfixés points-v2-e051- protégés contre
 * les doublons ; du DOM statique construit par ctx.el (jamais de chaîne HTML) ;
 * zéro journalisation, zéro appel réseau, zéro source d'aléa, zéro minuteur,
 * zéro animation, zéro écouteur global, aucun vol de focus.
 */

const CSS_ID = 'points-v2-e051';
const SCOPE = 'points-v2-e051';

const ID = {
  panel: 'points-v2-e051-panel',
  title: 'points-v2-e051-title',
  lede: 'points-v2-e051-lede',
  rows: 'points-v2-e051-rows',
  metric: 'points-v2-e051-metric',
};

const DATA = {
  installs: 'pointsV2E051Installs',
  domains: 'pointsV2E051Domains',
  domainDuplicates: 'pointsV2E051DomainDuplicates',
  eras: 'pointsV2E051Eras',
  eraDuplicates: 'pointsV2E051EraDuplicates',
  malformedRows: 'pointsV2E051MalformedRows',
  sumText: 'pointsV2E051SumText',
  sumTitle: 'pointsV2E051SumTitle',
  covered: 'pointsV2E051Covered',
  cells: 'pointsV2E051Cells',
  coverage: 'pointsV2E051Coverage',
  domainDivergence: 'pointsV2E051DomainDivergence',
  visible: 'pointsV2E051Visible',
  titleTotal: 'pointsV2E051TitleTotal',
  filledMeta: 'pointsV2E051FilledMeta',
  metaCount: 'pointsV2E051MetaCount',
  coherent: 'pointsV2E051Coherent',
  derived: 'pointsV2E051Derived',
  signature: 'pointsV2E051Signature',
  reduced: 'pointsV2E051Reduced',
};

/* Feuille unique. Chaque sélecteur, y compris dans les @media, commence
 * littéralement par .points-v2-e051 : aucune fuite hors de la vue Points.
 * L'état de chaque ligne est écrit en texte (data-points-v2-e051-etat) et
 * doublé par un attribut : aucune information n'est portée par la seule
 * couleur. */
const CSS = `
  .points-v2-e051 .points-v2-e051-panel {
    margin: 14px 0 4px; padding: 11px 13px 12px;
    border: 1px solid var(--line-strong, #6b6b6b);
    border-left: 4px solid var(--gold, #c8a45c);
    border-radius: 10px; background: rgba(230, 185, 111, .04);
    color: var(--ink-soft, #cfcfcf); font: inherit; font-size: 11px;
    line-height: 1.55; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e051 .points-v2-e051-title {
    margin: 0 0 4px; color: var(--gold-bright, #f0d49a);
    font-family: var(--serif, Georgia, serif); font-size: 14px; font-weight: 600;
  }
  .points-v2-e051 .points-v2-e051-lede { margin: 0 0 10px; color: var(--muted-2, #9a9a9a); }
  .points-v2-e051 .points-v2-e051-rows { margin: 0; padding: 0; list-style: none; }
  .points-v2-e051 .points-v2-e051-row {
    margin: 0 0 5px; padding: 6px 8px 6px 10px;
    border: 1px solid var(--line-strong, #6b6b6b); border-left-width: 3px;
    border-radius: 6px; background: rgba(255, 255, 255, .015);
  }
  .points-v2-e051 .points-v2-e051-row[data-points-v2-e051-state="ok"] {
    border-left-color: var(--gold, #c8a45c);
  }
  .points-v2-e051 .points-v2-e051-row[data-points-v2-e051-state="alerte"] {
    border-left-color: var(--gold-bright, #f0d49a); border-left-style: dashed;
    background: rgba(230, 185, 111, .07);
  }
  .points-v2-e051 .points-v2-e051-row[data-points-v2-e051-state="info"] {
    border-left-color: var(--muted-2, #9a9a9a);
  }
  .points-v2-e051 .points-v2-e051-key {
    display: block; color: var(--gold-bright, #f0d49a); font-weight: 600;
  }
  .points-v2-e051 .points-v2-e051-value { display: block; color: var(--ink-soft, #cfcfcf); }
  .points-v2-e051 .points-v2-e051-source {
    display: block; color: var(--muted-2, #9a9a9a); font-size: 10px;
  }
  .points-v2-e051 .points-v2-e051-etat::before {
    content: attr(data-points-v2-e051-etat); display: inline-block;
    min-width: 66px; margin-right: 6px; color: var(--muted-2, #9a9a9a);
    font-size: 9px; font-weight: 700; letter-spacing: .06em;
  }
  .points-v2-e051 .points-v2-e051-metric {
    margin: 9px 0 0; color: var(--muted-2, #9a9a9a); font-size: 10px;
  }
  @media (max-width: 620px) {
    .points-v2-e051 .points-v2-e051-panel { padding: 10px; }
    .points-v2-e051 .points-v2-e051-etat::before {
      min-width: 0; display: block; margin: 0 0 2px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e051 .points-v2-e051-panel,
    .points-v2-e051 .points-v2-e051-row { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e051 .points-v2-e051-panel,
    .points-v2-e051 .points-v2-e051-row {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    .points-v2-e051 .points-v2-e051-title,
    .points-v2-e051 .points-v2-e051-key,
    .points-v2-e051 .points-v2-e051-etat::before { color: CanvasText; }
  }
`;

const TITLE_TEXT = 'Sémantique & données — registre de traçabilité';
const LEDE_TEXT = 'Chaque chiffre ci-dessous est relu dans les nœuds réellement présents dans la vue Points (titre, grille, titres de cellules, filtres, détail), puis recalculé. Aucune valeur n’est figée dans ce module : il documente l’origine de chaque nombre sans modifier la donnée.';

const DEFINITIONS = [
  ['E051-01', 'Domaines relevés dans l’en-tête'],
  ['E051-02', 'Ères relevées dans la grille'],
  ['E051-03', 'Rectangularité de la matrice'],
  ['E051-04', 'Somme des cellules par deux chemins'],
  ['E051-05', 'Taux de cellules documentées'],
  ['E051-06', 'Options de filtre recoupées avec la matrice'],
  ['E051-07', 'Compteur du détail borné par le titre'],
  ['E051-08', 'Total du titre recoupé avec la matrice'],
  ['E051-09', 'Complétude des champs de la fiche'],
  ['E051-10', 'Signature, idempotence et cohérence globale'],
];

let installCount = 0;
let lastSignature = '';
let reduced = false;

/* --- lecture brute : normalisation d'entiers, jamais d'invention --- */

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* Entier strict, avec espaces de millier éventuels. */
function intOf(value) {
  const cleaned = String(value == null ? '' : value).replace(/[\s\u00a0\u202f]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/* Premier entier d'une phrase du DOM (ex. « 42 points isolés »). */
function leadingInt(value) {
  const match = /(\d[\d\s\u00a0\u202f]*)/.exec(String(value == null ? '' : value));
  return match ? intOf(match[1]) : null;
}

/* Entier précédant « point(s) » dans l'attribut title d'une cellule. */
function countBeforePoint(value) {
  const match = /(\d[\d\s\u00a0\u202f]*)\s+points?\b/i.exec(String(value == null ? '' : value));
  return match ? intOf(match[1]) : null;
}

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function uniqueCount(values) {
  const seen = Object.create(null);
  let count = 0;
  values.forEach((value) => {
    if (!Object.prototype.hasOwnProperty.call(seen, value)) {
      seen[value] = true;
      count += 1;
    }
  });
  return count;
}

/* Formatage LOCALISÉ d'un rapport : la base 100 est une échelle, pas une
 * donnée. Aucun pourcentage de référence n'est écrit à la main. */
function coverage(total, retained) {
  if (!Number.isFinite(total) || total <= 0) return null;
  const ratio = retained / total;
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(ratio);
  } catch {
    return `${Math.round(ratio * 100)} %`;
  }
}

function signatureOf(data) {
  return Object.keys(data).map((key) => `${key}=${data[key]}`).join(' | ');
}

function rootOf(ctx) {
  if (!ctx || (ctx.viewId && ctx.viewId !== 'pointsv2')) return null;
  const layout = ctx.layout;
  if (layout && typeof layout.querySelector === 'function' && layout.isConnected !== false) return layout;
  const stage = ctx.stage;
  if (stage && typeof stage.querySelector === 'function') {
    return stage.querySelector('.points-layout') || stage;
  }
  return null;
}

function docOf(ctx, root) {
  if (root && root.ownerDocument) return root.ownerDocument;
  if (ctx && ctx.stage && ctx.stage.ownerDocument) return ctx.stage.ownerDocument;
  return typeof document !== 'undefined' ? document : null;
}

/* Garde d'existence : un nœud déjà présent est réutilisé, un nœud détaché
 * d'un rendu précédent n'est pas retrouvé par getElementById et est recréé. */
function ensureNode(doc, ctx, id, className, tag, parent) {
  if (!doc || !parent || typeof ctx.el !== 'function') return null;
  let node = doc.getElementById(id);
  if (node && node.tagName && node.tagName.toLowerCase() !== tag) {
    if (typeof node.remove === 'function') node.remove();
    node = null;
  }
  if (!node) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  if (node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(className)) {
    node.classList.add(className);
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : une valeur identique ne touche pas le DOM. */
function write(node, text) {
  if (!node) return;
  const value = String(text == null ? '' : text);
  if (node.textContent !== value) node.textContent = value;
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function putData(node, key, value) {
  if (node && node.dataset) node.dataset[key] = String(value);
}

/* E051-01 à E051-09 : toutes les grandeurs dérivées du DOM courant. */
function derive(root) {
  const head = root.querySelector('.points-grid-row.is-head');
  const headerCells = head ? Array.prototype.slice.call(head.children) : [];
  /* La première colonne est « Ère » : elle n'est pas un domaine. */
  const domainLabels = headerCells.slice(1).map(txt).filter((label) => label !== '');
  const domainDuplicates = domainLabels.length - uniqueCount(domainLabels);

  const eraRows = all(root, '.points-grid-row:not(.is-head)');
  const eraNames = eraRows.map((row) => txt(row.querySelector('.points-era') || row.children[0]));
  const eraDuplicates = eraNames.length - uniqueCount(eraNames);

  /* E051-03 : chaque ligne doit avoir autant d'enfants que l'en-tête. */
  const expectedColumns = headerCells.length;
  const malformedRows = eraRows.filter((row) => row.children.length !== expectedColumns).length;

  /* E051-04 / E051-05 : deux chemins de lecture indépendants par cellule. */
  const cells = all(root, '.points-cell');
  const covered = cells.filter((cell) => cell.classList && cell.classList.contains('has-points')).length;
  let sumText = 0;
  let sumTitle = 0;
  cells.forEach((cell) => {
    const fromText = intOf(txt(cell));
    const fromTitle = countBeforePoint(cell.getAttribute ? cell.getAttribute('title') : null);
    if (fromText !== null) sumText += fromText;
    if (fromTitle !== null) sumTitle += fromTitle;
  });
  const cov = coverage(cells.length, covered);

  /* E051-06 : les options utiles des selects, hors option « Tous » (*). */
  const filters = root.querySelector('.points-filters');
  const selects = filters ? Array.prototype.slice.call(filters.querySelectorAll('select')) : [];
  const usefulOptions = (select) => select
    ? Array.prototype.slice.call(select.options)
      .map((option) => String(option.value || '').trim())
      .filter((value) => value !== '*')
    : [];
  const domainOptions = usefulOptions(selects[0]);
  const familyOptions = usefulOptions(selects[1]);
  const domainDivergence = Math.abs(domainOptions.length - domainLabels.length);

  /* E051-07 / E051-08 : compteurs texte du titre et du détail. */
  const titleTotal = leadingInt(txt(root.querySelector('.points-title')));
  const visibleCount = leadingInt(txt(root.querySelector('.points-detail .view-kicker')));

  /* E051-09 : complétude de la fiche point, sans codier le nombre de champs. */
  const meta = root.querySelector('.points-detail .points-meta');
  const metaSpans = meta
    ? Array.prototype.slice.call(meta.children)
      .filter((child) => child.tagName && child.tagName.toLowerCase() === 'span')
    : [];
  const filledMeta = metaSpans.filter((span) => txt(span) !== '').length;
  const hasSources = txt(root.querySelector('.points-detail .points-sources')) !== '';
  const hasJustification = txt(root.querySelector('.points-detail .points-justification')) !== '';

  return {
    domains: domainLabels.length,
    domainDuplicates,
    eras: eraRows.length,
    eraDuplicates,
    expectedColumns,
    malformedRows,
    cells: cells.length,
    covered,
    coverage: cov,
    sumText,
    sumTitle,
    domainOptions: domainOptions.length,
    familyOptions: familyOptions.length,
    domainDivergence,
    titleTotal: titleTotal === null ? 'na' : titleTotal,
    visible: visibleCount === null ? 'na' : visibleCount,
    filledMeta,
    metaCount: metaSpans.length,
    hasSources: hasSources ? 1 : 0,
    hasJustification: hasJustification ? 1 : 0,
  };
}

/* Montage du laboratoire : un panneau, dix lignes, une par chantier. */
function mountPanel(doc, ctx, panel) {
  const title = ensureNode(doc, ctx, ID.title, 'points-v2-e051-title', 'h2', panel);
  write(title, TITLE_TEXT);
  const lede = ensureNode(doc, ctx, ID.lede, 'points-v2-e051-lede', 'p', panel);
  write(lede, LEDE_TEXT);

  const rows = ensureNode(doc, ctx, ID.rows, 'points-v2-e051-rows', 'ol', panel);
  if (rows.children.length !== DEFINITIONS.length) {
    rows.replaceChildren();
    DEFINITIONS.forEach(([code, label]) => {
      const row = ctx.el('li', 'points-v2-e051-row');
      row.setAttribute('data-points-v2-e051-chantier', code);
      row.setAttribute('data-points-v2-e051-state', 'info');
      const key = ctx.el('span', 'points-v2-e051-key', `${code} — ${label}`);
      const value = ctx.el('span', 'points-v2-e051-value');
      const source = ctx.el('span', 'points-v2-e051-source');
      const state = ctx.el('span', 'points-v2-e051-etat');
      state.setAttribute('data-points-v2-e051-etat', 'EN ATTENTE');
      row.append(key, value, source, state);
      rows.appendChild(row);
    });
  }

  const metric = ensureNode(doc, ctx, ID.metric, 'points-v2-e051-metric', 'p', panel);
  return { rows, metric };
}

/* Écriture ciblée : valeur, source et état sont trois textContent dédupliqués. */
function setRow(index, value, source, state, stateLabel) {
  const rows = document.querySelectorAll(`#${ID.rows} .points-v2-e051-row`);
  const row = rows[index];
  if (!row) return;
  write(row.querySelector('.points-v2-e051-value'), value);
  write(row.querySelector('.points-v2-e051-source'), source);
  if (row.getAttribute('data-points-v2-e051-state') !== state) {
    put(row, 'data-points-v2-e051-state', state);
  }
  const stateNode = row.querySelector('.points-v2-e051-etat');
  if (stateNode && stateNode.getAttribute('data-points-v2-e051-etat') !== stateLabel) {
    put(stateNode, 'data-points-v2-e051-etat', stateLabel);
  }
}

register('E051', (ctx) => {
  const root = rootOf(ctx);
  if (!root || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const doc = docOf(ctx, root);
  if (!doc || !doc.body) return;

  installCount += 1;
  reduced = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();

  ctx.css(CSS_ID, CSS);
  const scope = (ctx.layout && ctx.layout.classList) ? ctx.layout : root;
  scope.classList.add(SCOPE);

  const matrix = root.querySelector('.points-matrix') || root;
  const hadPanel = !!doc.getElementById(ID.panel);
  const panel = ensureNode(doc, ctx, ID.panel, 'points-v2-e051-panel', 'section', matrix);
  if (!panel) return;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', ID.title);

  const refs = mountPanel(doc, ctx, panel);
  const d = derive(root);
  const signature = signatureOf(d);
  const globalOk = d.domainDuplicates === 0 && d.eraDuplicates === 0
    && d.malformedRows === 0 && d.sumText === d.sumTitle
    && d.domainDivergence === 0
    && (d.titleTotal === 'na' || d.titleTotal === d.sumTitle)
    && (d.visible === 'na' || d.titleTotal === 'na' || d.visible <= d.titleTotal);

  /* Une signature identique sur un panneau déjà monté n'écrit aucune ligne. */
  if (!hadPanel || signature !== lastSignature) {
    lastSignature = signature;

    setRow(0,
      `${d.domains} domaine(s) relevé(s) · ${d.domainDuplicates} libellé(s) en double`,
      'Source : .points-grid-row.is-head > span (colonne « Ère » exclue)',
      d.domains === 0 ? 'info' : (d.domainDuplicates === 0 ? 'ok' : 'alerte'),
      d.domains === 0 ? 'VIDE' : (d.domainDuplicates === 0 ? 'OK' : 'DOUBLON'));

    setRow(1,
      `${d.eras} ère(s) relevée(s) · ${d.eraDuplicates} libellé(s) en double`,
      'Source : .points-grid-row:not(.is-head) .points-era',
      d.eras === 0 ? 'info' : (d.eraDuplicates === 0 ? 'ok' : 'alerte'),
      d.eras === 0 ? 'VIDE' : (d.eraDuplicates === 0 ? 'OK' : 'DOUBLON'));

    setRow(2,
      `${d.malformedRows} ligne(s) non rectangulaire(s) sur ${d.eras} (attendu ${d.expectedColumns} colonnes)`,
      'Source : nombre d’enfants de chaque ligne comparé à l’en-tête',
      d.malformedRows === 0 ? 'ok' : 'alerte',
      d.malformedRows === 0 ? 'RECTANGULAIRE' : 'DÉCALAGE');

    setRow(3,
      `Somme de la matrice : ${d.sumText} (texte des cellules) · ${d.sumTitle} (attribut title)`,
      'Source : .points-cell texte et attribut title « … N point(s) »',
      d.sumText === d.sumTitle ? 'ok' : 'alerte',
      d.sumText === d.sumTitle ? 'OK' : 'ÉCART');

    setRow(4,
      d.coverage === null
        ? 'Aucune cellule : couverture non calculable'
        : `${d.coverage} de cellules documentées (${d.covered}/${d.cells})`,
      'Source : .points-cell.has-points / .points-cell',
      d.coverage === null ? 'info' : (d.covered === d.cells ? 'ok' : 'alerte'),
      d.coverage === null ? 'VIDE' : (d.covered === d.cells ? 'COMPLET' : 'PARTIEL'));

    setRow(5,
      `${d.domainOptions} option(s) de domaine · ${d.familyOptions} option(s) de famille · écart domaines ${d.domainDivergence}`,
      'Source : options des selects de .points-filters (hors « Tous »)',
      d.domainDivergence === 0 ? 'ok' : 'alerte',
      d.domainDivergence === 0 ? 'COHÉRENT' : 'DIVERGENT');

    setRow(6,
      d.visible === 'na'
        ? 'Compteur du détail introuvable : bornage impossible'
        : (d.titleTotal === 'na'
          ? `${d.visible} point(s) visibles (total du titre indisponible)`
          : `${d.visible} visible(s) sur ${d.titleTotal} au total`),
      'Source : .points-detail .view-kicker recoupé avec .points-title',
      d.visible === 'na' ? 'alerte'
        : (d.titleTotal === 'na' ? 'info' : (d.visible <= d.titleTotal ? 'ok' : 'alerte')),
      d.visible === 'na' ? 'ABSENT'
        : (d.titleTotal === 'na' ? 'DÉRIVÉ' : (d.visible <= d.titleTotal ? 'COHÉRENT' : 'HORS CADRE')));

    setRow(7,
      d.titleTotal === 'na'
        ? 'Total du titre indisponible : recoupement impossible'
        : `${d.titleTotal} au titre · ${d.sumTitle} sommés dans la matrice`,
      'Source : .points-title vs somme des attributs title des cellules',
      d.titleTotal === 'na' ? 'alerte' : (d.titleTotal === d.sumTitle ? 'ok' : 'alerte'),
      d.titleTotal === 'na' ? 'ABSENT' : (d.titleTotal === d.sumTitle ? 'COHÉRENT' : 'ÉCART'));

    setRow(8,
      d.metaCount === 0
        ? 'Fiche vide : aucun champ de métadonnée'
        : `${d.filledMeta} / ${d.metaCount} champs renseignés · sources ${d.hasSources ? 'oui' : 'non'} · justification ${d.hasJustification ? 'oui' : 'non'}`,
      'Source : .points-meta > span, .points-sources, .points-justification',
      d.metaCount === 0 ? 'info' : (d.filledMeta === d.metaCount ? 'ok' : 'alerte'),
      d.metaCount === 0 ? 'VIDE' : (d.filledMeta === d.metaCount ? 'COMPLET' : 'PARTIEL'));

    setRow(9,
      `10 grandeurs dérivées · ${d.domains} domaines · ${d.eras} ères · ${d.cells} cellules · installations ${installCount}`,
      'Source : signaux data-points-v2-e051-* et garde d’existence du panneau',
      globalOk ? 'ok' : 'alerte',
      globalOk ? 'COHÉRENT' : 'ÉCART');
  }

  write(refs.metric,
    `Installations : ${installCount} · chiffres dérivés : 10 · domaines : ${d.domains} · ères : ${d.eras} · cellules : ${d.cells} · mouvement réduit : ${reduced ? 'oui' : 'non'} · cohérence globale : ${globalOk ? 'ok' : 'alerte'}.`);

  /* Signaux auditables : tous préfixés pointsV2E051 (data-points-v2-e051-*),
   * distincts de ceux de la passe 1 (data-e051-*). */
  const signals = [
    [DATA.installs, installCount],
    [DATA.domains, d.domains],
    [DATA.domainDuplicates, d.domainDuplicates],
    [DATA.eras, d.eras],
    [DATA.eraDuplicates, d.eraDuplicates],
    [DATA.malformedRows, d.malformedRows],
    [DATA.sumText, d.sumText],
    [DATA.sumTitle, d.sumTitle],
    [DATA.covered, d.covered],
    [DATA.cells, d.cells],
    [DATA.coverage, d.coverage === null ? '' : d.coverage],
    [DATA.domainDivergence, d.domainDivergence],
    [DATA.visible, d.visible],
    [DATA.titleTotal, d.titleTotal],
    [DATA.filledMeta, d.filledMeta],
    [DATA.metaCount, d.metaCount],
    [DATA.coherent, globalOk ? '1' : '0'],
    [DATA.derived, '10'],
    [DATA.signature, signature],
    [DATA.reduced, reduced ? '1' : '0'],
  ];
  signals.forEach(([key, value]) => {
    putData(panel, key, value);
    putData(root, key, value);
  });
});
