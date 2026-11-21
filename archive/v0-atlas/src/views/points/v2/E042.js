import { register } from './registry.js';

/* Lentille POINTS E042 — passe 2 (V2) : accessibilité & ARIA, nom accessible
 * unique par contrôle, mesuré et auditable (domaine E).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E042.md — chantiers E042-01 à E042-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1 ni aucun
 * fichier partagé (vue points.js, coque, styles.css, v2/registry.js,
 * v2/index.js) n'est modifié.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, règles),
 * el(balise, classe, texte), reducedMotion(). Tout est dérivé du DOM rendu et
 * des libellés déjà posés : aucun nom n'est inventé, aucun compteur réécrit.
 *
 * Invariants : une seule feuille, une seule portée, des identifiants préfixés
 * points-v2-e042-, des marqueurs de donnée distincts de la passe 1, aucun
 * doublon, aucune région d'annonce ajoutée, aucun état de bascule écrit, aucune
 * injection HTML, aucun appel réseau, aucune source aléatoire, aucun minuteur,
 * aucune boucle d'animation, aucun message de journalisation. Installation
 * idempotente.
 */

const CSS_ID = 'points-v2-e042';
const SCOPE = 'points-v2-e042';
const SUMMARY_ID = 'points-v2-e042-summary';
const REGISTRY_ID = 'points-v2-e042-registry';
const TABLE_ID = 'points-v2-e042-registry-table';
const BODY_ID = 'points-v2-e042-registry-body';
const CAPTION_ID = 'points-v2-e042-registry-caption';
const REDUCED_ATTR = 'data-points-v2-e042-reduced';

/* Marqueurs de donnée : volontairement distincts de ceux de la passe 1
 * (data-e042, data-e042-current, data-e042-reduced). Les clés camelCase
 * deviennent des attributs data-points-v2-e042-* en HTML. */
const DATA = {
  scope: 'pointsV2E042',
  controls: 'pointsV2E042Controls',
  missing: 'pointsV2E042Missing',
  collisions: 'pointsV2E042Collisions',
  preserved: 'pointsV2E042Preserved',
  unique: 'pointsV2E042Unique',
  installs: 'pointsV2E042Installs',
};

/* Chaque sélecteur commence littéralement par `.points-v2-e042`, y compris à
 * l'intérieur des blocs @media : aucune règle ne peut fuir hors de la vue. */
const CSS = `
  /* Cibles tactiles et anneau de focus visibles, quel que soit le pointeur. */
  .points-v2-e042 .points-era,
  .points-v2-e042 .points-cell,
  .points-v2-e042 .points-filters select,
  .points-v2-e042 .points-filters button,
  .points-v2-e042 .points-nav button {
    min-height: 44px;
    min-width: 44px;
    transition: background-color .16s linear, border-color .16s linear;
  }
  .points-v2-e042 .points-era:focus-visible,
  .points-v2-e042 .points-cell:focus-visible,
  .points-v2-e042 .points-filters select:focus-visible,
  .points-v2-e042 .points-filters button:focus-visible,
  .points-v2-e042 .points-nav button:focus-visible,
  .points-v2-e042 .points-v2-e042-registry summary:focus-visible {
    outline: 3px solid var(--gold-bright, #e6b96f);
    outline-offset: 2px;
  }
  /* Résumé d'audit et registre : texte ordinaire, hors région d'annonce. */
  .points-v2-e042 .points-v2-e042-summary {
    margin: 0 0 8px;
    padding: 6px 8px;
    border-left: 3px solid var(--gold, #b98a3d);
    color: var(--muted-2, #98a2b3);
    font-size: 11px;
    line-height: 1.45;
  }
  .points-v2-e042 .points-v2-e042-registry {
    margin: 0 0 10px;
    border: 1px solid var(--line, #2b323d);
    border-radius: 4px;
    background: var(--panel, #10151d);
  }
  .points-v2-e042 .points-v2-e042-registry summary {
    padding: 7px 10px;
    cursor: pointer;
    color: var(--text, #e9edf2);
    font-size: 11px;
    font-weight: 600;
  }
  .points-v2-e042 .points-v2-e042-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10px;
    line-height: 1.35;
  }
  .points-v2-e042 .points-v2-e042-table caption {
    padding: 4px 10px 8px;
    text-align: left;
    color: var(--muted-2, #98a2b3);
  }
  .points-v2-e042 .points-v2-e042-table th,
  .points-v2-e042 .points-v2-e042-table td {
    padding: 5px 8px;
    border-top: 1px solid var(--line, #2b323d);
    text-align: left;
    overflow-wrap: anywhere;
    vertical-align: top;
  }
  .points-v2-e042 .points-v2-e042-table thead th {
    color: var(--gold-bright, #e6b96f);
    font-weight: 600;
  }
  /* Mouvement réduit : neutralisation par attribut JS et par media query. */
  .points-v2-e042[data-points-v2-e042-reduced="1"] .points-era,
  .points-v2-e042[data-points-v2-e042-reduced="1"] .points-cell,
  .points-v2-e042[data-points-v2-e042-reduced="1"] .points-filters button,
  .points-v2-e042[data-points-v2-e042-reduced="1"] .points-nav button { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e042 .points-era,
    .points-v2-e042 .points-cell,
    .points-v2-e042 .points-filters button,
    .points-v2-e042 .points-nav button { transition: none; }
  }
  /* Écran étroit 390 px : le registre reste lisible, les cibles restent atteignables. */
  @media (max-width: 620px) {
    .points-v2-e042 .points-era,
    .points-v2-e042 .points-cell,
    .points-v2-e042 .points-filters button,
    .points-v2-e042 .points-nav button { min-height: 44px; }
    .points-v2-e042 .points-v2-e042-table { font-size: 9px; }
    .points-v2-e042 .points-v2-e042-table th,
    .points-v2-e042 .points-v2-e042-table td { padding: 4px 5px; }
  }
  /* Couleurs forcées : bordures et focus portés par les couleurs système. */
  @media (forced-colors: active) {
    .points-v2-e042 .points-v2-e042-summary,
    .points-v2-e042 .points-v2-e042-registry { border-color: CanvasText; }
    .points-v2-e042 .points-v2-e042-table th,
    .points-v2-e042 .points-v2-e042-table td { border-top-color: CanvasText; }
    .points-v2-e042 :focus-visible { outline-color: Highlight; }
  }
  /* Papier : le registre d'audit est une affordance d'écran, pas un contenu à imprimer. */
  @media print {
    .points-v2-e042 .points-v2-e042-summary,
    .points-v2-e042 .points-v2-e042-registry { display: none; }
    .points-v2-e042 :focus-visible { outline: none; }
  }
`;

function txt(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/* Normalisation stable pour la détection de collision : casse et diacritiques
 * ignorés, espaces fusionnés. Aucune source aléatoire n'intervient. */
function norm(value) {
  return txt(value)
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function setData(node, key, value) {
  if (node && node.dataset) node.dataset[key] = String(value);
}

/* Fusion additive d'une relation ARIA : les identifiants d'autrui survivent. */
function addRef(node, attr, id) {
  if (!node || !id || typeof node.getAttribute !== 'function') return;
  const current = txt(node.getAttribute(attr)).split(/\s+/).filter(Boolean);
  const next = [...new Set([...current, id])];
  if (next.length) node.setAttribute(attr, next.join(' '));
}

/* Un libellé déjà présent et unique est conservé ; sinon un nom de repli est
 * généré puis suffixé jusqu'à ce que sa forme normalisée soit inédite. */
function labeller(entries) {
  const used = new Set();
  return function label(node, fallback, category, key) {
    if (!node || typeof node.getAttribute !== 'function') return '';
    const existing = txt(node.getAttribute('aria-label'));
    const existingKey = existing ? norm(existing) : '';
    let name;
    let origin = 'ajouté';
    if (existing && !used.has(existingKey)) {
      name = existing;
      origin = 'conservé';
    } else {
      const base = txt(fallback) || 'Contrôle sans nom';
      name = base;
      let n = 2;
      while (used.has(norm(name))) name = `${base} (${n++})`;
      if (existing) origin = 'désambiguïsé';
    }
    used.add(norm(name));
    if (name !== existing) node.setAttribute('aria-label', name);
    entries.push({ category, key, name, origin });
    return name;
  };
}

/* Au plus un nœud par identifiant. Un nœud périmé retrouvé hors du layout est
 * retiré, jamais cloné ; la création passe toujours par ctx.el. */
function ensureNode(ctx, parent, root, id, tag, className, text) {
  if (!parent || typeof parent.querySelector !== 'function') return null;
  let node = parent.querySelector('#' + id);
  if (node) return node;
  const scope = root && typeof root.querySelector === 'function'
    ? root
    : (typeof document !== 'undefined' ? document : null);
  const stale = scope && scope.querySelector ? scope.querySelector('#' + id) : null;
  if (stale && typeof stale.remove === 'function') stale.remove();
  node = ctx.el(tag, className || '', text);
  node.id = id;
  return node;
}

function apply(ctx) {
  /* E042-01 — contrat V2, feuille unique, portée ancrée et signaux cloisonnés. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  setData(layout, DATA.scope, '1');
  setData(layout, DATA.installs, Number(layout.dataset[DATA.installs] || 0) + 1);

  const matrix = layout.querySelector('.points-matrix');
  const grid = layout.querySelector('.points-grid');
  const filters = layout.querySelector('.points-filters');
  const nav = layout.querySelector('.points-nav');

  /* E042-02 — recensement chiffré des contrôles nommables, depuis le DOM rendu. */
  const eras = layout.querySelectorAll('.points-era');
  const cells = layout.querySelectorAll('.points-cell');
  const selects = filters ? filters.querySelectorAll('select') : [];
  const reset = filters ? filters.querySelector('button') : null;
  const navButtons = nav ? nav.querySelectorAll('button') : [];
  const groups = [
    ...Array.from(eras).map((node) => ({ node, category: 'ère', key: '' })),
    ...Array.from(cells).map((node) => ({ node, category: 'cellule', key: '' })),
    ...Array.from(selects).map((node, i) => ({ node, category: 'filtre', key: i === 0 ? 'domaine' : 'famille' })),
    ...(reset ? [{ node: reset, category: 'filtre', key: 'réinitialisation' }] : []),
    ...Array.from(navButtons).map((node, i) => ({ node, category: 'navigation', key: i === 0 ? 'précédent' : 'suivant' })),
  ];
  const missingInitial = groups.filter(({ node }) => !txt(node.getAttribute('aria-label'))).length;
  setData(layout, DATA.controls, groups.length);
  setData(layout, DATA.missing, missingInitial);

  /* E042-03 — générateur unique : unicité vérifiée, normalisée, déterministe. */
  const entries = [];
  const label = labeller(entries);
  let preserved = 0;
  let collisions = 0;

  /* E042-04 — ères : nom rang/total enrichi du nombre de domaines renseignés. */
  const eraTotal = eras.length;
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const domainTotal = head ? Math.max(0, head.children.length - 1) : 0;
  eras.forEach((button, index) => {
    const row = typeof button.closest === 'function' ? button.closest('.points-grid-row') : null;
    const filled = row ? row.querySelectorAll('.points-cell.has-points').length : 0;
    const visible = txt(button.textContent) || 'Ère sans nom';
    label(button, `Ère ${index + 1} sur ${eraTotal} : ${visible} · ${filled}/${domainTotal} domaines renseignés`,
      'ère', `ere-${index + 1}`);
  });

  /* E042-05 — cellules : nom rang/total issu du title natif de la vue. */
  cells.forEach((cell, index) => {
    const title = txt(cell.getAttribute('title'));
    const parsed = title.match(/^(.+?)\s*·\s*(.+?)\s*·\s*(\d+)\s*point/);
    let detail = title || 'Cellule sans description';
    if (parsed) {
      const count = Number(parsed[3]);
      detail = `${txt(parsed[1])} · ${txt(parsed[2])} · ${count === 0 ? 'aucun point' : `${count} point(s)`}`;
    }
    label(cell, `Cellule ${index + 1} sur ${cells.length} : ${detail}`, 'cellule', `cell-${index + 1}`);
  });

  /* E042-06 — filtres et réinitialisation : noms contextualisés et distincts. */
  if (selects[0]) label(selects[0], 'Filtrer la matrice de points par domaine', 'filtre', 'domaine');
  if (selects[1]) label(selects[1], 'Filtrer la matrice de points par famille', 'filtre', 'famille');
  if (reset) label(reset, 'Réinitialiser les filtres de la matrice de points', 'filtre', 'réinitialisation');

  /* E042-07 — navigation : noms sans glyphes décoratifs, contextualisés. */
  if (navButtons[0]) label(navButtons[0], 'Point précédent dans la matrice de points', 'navigation', 'précédent');
  if (navButtons[1]) label(navButtons[1], 'Point suivant dans la matrice de points', 'navigation', 'suivant');

  preserved = entries.filter((entry) => entry.origin === 'conservé').length;
  collisions = entries.filter((entry) => entry.origin === 'désambiguïsé').length;
  setData(layout, DATA.preserved, preserved);
  setData(layout, DATA.collisions, collisions);
  setData(layout, DATA.unique, new Set(entries.map((entry) => norm(entry.name))).size === entries.length ? 1 : 0);

  /* E042-08 — registre visible : contrôle → nom accessible → origine. */
  /* E042-09 — résumé statique, relation ARIA additive, attributs d'origine
   * (title, aria-current, aria-controls, gestionnaires) laissés intacts. */
  if (matrix && typeof matrix.insertBefore === 'function') {
    const summaryText = `Audit E042 V2 — ${groups.length} contrôles recensés, `
      + `${missingInitial} sans nom initial, ${collisions} collision(s) résolue(s), `
      + `${preserved} libellé(s) conservé(s).`;
    const summary = ensureNode(ctx, layout, stage, SUMMARY_ID, 'p', 'points-v2-e042-summary', summaryText);
    summary.textContent = summaryText;
    if (!summary.parentNode || !layout.contains(summary)) {
      const title = matrix.querySelector('.points-title');
      if (title && title.nextSibling) matrix.insertBefore(summary, title.nextSibling);
      else matrix.insertBefore(summary, matrix.firstChild);
    }

    /* Le résumé est un texte ordinaire : la relation ci-dessous l'annonce sans
     * créer de région supplémentaire ni modifier les attributs d'origine. */
    addRef(matrix, 'aria-describedby', SUMMARY_ID);

    const registry = ensureNode(ctx, layout, stage, REGISTRY_ID, 'details', 'points-v2-e042-registry');
    if (!registry.parentNode || !layout.contains(registry)) matrix.insertBefore(registry, summary.nextSibling);

    let disclosure = registry.querySelector('summary');
    if (!disclosure) {
      disclosure = ctx.el('summary', 'points-v2-e042-registry-label',
        'Registre des noms accessibles (contrôle → nom → origine)');
      registry.insertBefore(disclosure, registry.firstChild);
    }

    const table = ensureNode(ctx, registry, stage, TABLE_ID, 'table', 'points-v2-e042-table');
    if (!table.parentNode || !registry.contains(table)) registry.appendChild(table);

    const caption = ensureNode(ctx, table, stage, CAPTION_ID, 'caption', '',
      'Noms accessibles relevés après installation de la lentille E042 V2.');
    if (!caption.parentNode || !table.contains(caption)) table.insertBefore(caption, table.firstChild);

    let thead = table.querySelector('thead');
    if (!thead) {
      thead = ctx.el('thead');
      const headRow = ctx.el('tr');
      ['Contrôle', 'Nom accessible unique', 'Origine'].forEach((heading) => {
        const th = ctx.el('th', '', heading);
        th.scope = 'col';
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.insertBefore(thead, caption.nextSibling);
    }

    const tbody = ensureNode(ctx, table, stage, BODY_ID, 'tbody');
    if (!tbody.parentNode || !table.contains(tbody)) table.appendChild(tbody);
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    entries.forEach((entry) => {
      const row = ctx.el('tr');
      const th = ctx.el('th', '', `${entry.category} — ${entry.key || 'rang'}`);
      th.scope = 'row';
      row.appendChild(th);
      row.appendChild(ctx.el('td', '', entry.name));
      row.appendChild(ctx.el('td', '', entry.origin));
      tbody.appendChild(row);
    });

    /* Un seul registre, un seul résumé, un seul corps de tableau reconstruit
     * à chaque passage : aucun doublon après un aller-retour de rendu. */
  }

  /* E042-10 — mouvement réduit couplé au signal du registre, en plus de la
   * media query, et idempotence multi-rendus par ensureNode et compteur. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }
}

register('E042', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
