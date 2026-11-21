import { register } from './registry.js';

/* Lentille E042 — aria-label unique par contrôle.
 * Passe V2, domaine E (Accessibilité & ARIA). Thème : themes.json, clé E042.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E042.md — chantiers E042-01 à E042-10.
 * Fichier possédé : src/views/chronology/v2/E042.js uniquement. Aucun fichier
 * partagé n'est modifié : ni registry.js, ni index.js, ni styles.css, ni
 * src/views/chronology.js, ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 ne fournit pas say() : la lentille n'ajoute AUCUNE région live
 * et n'écrit dans aucune région existante (le domaine E041 porte les annonces).
 *
 * Périmètre strictement délimité : les contrôles de la vue de base — bandes
 * d'ère, cartes de repère, puces de filtre des outils et de la fiche, champ de
 * recherche, retour au monde, commandes précédent/suivant. Les panneaux ajoutés
 * par les autres lentilles ne sont ni scannés ni modifiés. La lentille ne touche
 * ni à aria-pressed (E043), ni aux listes sémantiques (E044), ni aux libellés
 * <label> (E046), ni aux couleurs de badges (E047).
 *
 * Invariants : un seul register('E042', …), un seul
 * ctx.css('chronology-v2-e042', …), des IDs tous préfixés chronology-v2-e042-
 * avec gardes d'existence, zéro console.*, zéro réseau, zéro Math.random,
 * zéro innerHTML, zéro timer, zéro animation, zéro vol de focus.
 */

const CSS_ID = 'chronology-v2-e042';
const PANEL_ID = 'chronology-v2-e042-panel';
const TITLE_ID = 'chronology-v2-e042-title';
const TABLE_ID = 'chronology-v2-e042-table';
const SUMMARY_ID = 'chronology-v2-e042-summary';
const NOTE_ID = 'chronology-v2-e042-note';
const METRIC_ID = 'chronology-v2-e042-metric';
const MAIN_ID = 'atlas-chrono-main';
const ASIDE_ID = 'atlas-chrono-aside';
const TOOLS_ID = 'atlas-chrono-tools';

/* E042-07, E042-09, E042-10 : une seule feuille, injectée une fois par ctx.css.
   Le registre est un bloc en flux normal en fin de colonne : il ne recouvre ni
   la frise ni la fiche, il n'est pas tabulable et il n'ajoute aucun arrêt Tab.
   Tableau à largeur fixe, cellules à retour automatique : pas de débordement
   horizontal à 390 px. Aucune transition, aucune animation. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.45;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e042-title {
    margin: 0 0 6px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 14px; font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e042-lede,
  #${PANEL_ID} .e042-summary,
  #${PANEL_ID} .e042-note,
  #${PANEL_ID} .e042-metric { margin: 0 0 6px; }
  #${PANEL_ID} .e042-summary { color: var(--gold-bright); font-variant-numeric: tabular-nums; }
  #${PANEL_ID} .e042-note,
  #${PANEL_ID} .e042-metric { color: var(--muted-2); font-size: 9px; }
  #${TABLE_ID} {
    width: 100%; margin: 8px 0; border-collapse: collapse;
    table-layout: fixed; font-size: 9px; font-variant-numeric: tabular-nums;
  }
  #${TABLE_ID} caption {
    padding: 0 0 5px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 11px; text-align: left;
  }
  #${TABLE_ID} th,
  #${TABLE_ID} td {
    padding: 4px 5px; border-bottom: 1px solid var(--line);
    text-align: left; vertical-align: top; overflow-wrap: anywhere;
  }
  #${TABLE_ID} thead th { color: var(--gold-bright); border-bottom: 1px solid var(--line-strong); }
  #${TABLE_ID} tbody th { width: 24%; color: var(--muted); font-weight: 600; }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 8px 9px 9px; }
    #${TABLE_ID} { font-size: 9px; }
    #${TABLE_ID} tbody th { width: 32%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e042-title,
    #${PANEL_ID} .e042-summary,
    #${TABLE_ID} caption,
    #${TABLE_ID} thead th { color: CanvasText; }
    #${TABLE_ID} th, #${TABLE_ID} td { border-bottom: 1px solid CanvasText; }
  }
`;

let installCount = 0;

/* E042-10 : une seule écriture textuelle, dédupliquée. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E042-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché et n'est plus trouvé :
   il est alors recréé. Un nœud retrouvé est déplacé dans le bon parent. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function textOf(node) {
  return node && node.textContent ? node.textContent.trim() : '';
}

/* Comparaison insensible à la casse et aux espaces : deux noms qui ne
   diffèrent que par la casse sont encore un doublon pour un lecteur d'écran. */
function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/* E042-01 : recensement des contrôles de la vue de base, par catégories
   explicites. Aucun sélecteur générique « button » : les panneaux des autres
   lentilles ne sont donc jamais scannés ni modifiés. Toutes les valeurs de nom
   sont dérivées du DOM existant (dataset, texte visible, identifiant). */
function controlList() {
  const rows = [];
  const push = (node, group, candidate) => {
    if (node && !rows.some((row) => row.node === node)) {
      rows.push({ node, group, candidate, id: node.id || '' });
    }
  };

  /* E042-02 — bandes d'ère : rang, intitulé et amplitude déjà portés par le DOM. */
  const bands = document.querySelectorAll(`#${MAIN_ID} button.era-band`);
  bands.forEach((band, index) => {
    const name = textOf(band.querySelector('span')) || textOf(band) || 'Ère sans intitulé';
    const start = band.dataset.start || '';
    const end = band.dataset.end || '';
    const span = start && end ? ` (${start} → ${end})` : '';
    push(band, 'ère', `Ère ${index + 1} sur ${bands.length} : ${name}${span}`);
  });

  /* E042-03 — cartes de repère : année, titre et rang global issus des données. */
  const cards = document.querySelectorAll(`#${MAIN_ID} button.event-card`);
  cards.forEach((card, index) => {
    const year = card.dataset.year || textOf(card.querySelector('.event-year'));
    const title = textOf(card.querySelector('strong')) || textOf(card) || 'Repère sans titre';
    push(card, 'repère', `Repère ${index + 1} sur ${cards.length} : ${year ? `${year} — ` : ''}${title}`);
  });

  /* E042-04 — deux familles de puces partagent un même data-tag : le contexte
     les distingue (filtre global dans les outils, filtre local dans la fiche). */
  const filters = document.querySelectorAll(`#${TOOLS_ID} button.atlas-chrono-tag[data-tag]`);
  filters.forEach((chip) => {
    push(chip, 'filtre', `Filtre de repères : ${chip.dataset.tag || textOf(chip)}`);
  });
  const facets = document.querySelectorAll(`#${ASIDE_ID} button.atlas-chrono-tag[data-tag]`);
  facets.forEach((chip) => {
    push(chip, 'fiche', `Fiche du repère — filtre : ${chip.dataset.tag || textOf(chip)}`);
  });

  /* E042-05 — recherche et commandes de navigation. Le champ possède déjà un
     aria-label : E042-08 le conservera s'il est unique. */
  const search = document.getElementById('atlas-chrono-search');
  if (search) push(search, 'recherche', 'Rechercher parmi les repères et les points de ce pays');
  const back = document.querySelector(`#${MAIN_ID} button.nav-c2-back`);
  if (back) push(back, 'navigation', 'Retour au monde depuis la chronologie');
  const steps = document.querySelectorAll(`#${ASIDE_ID} .aside-actions button`);
  steps.forEach((step) => {
    push(step, 'navigation', `Fiche du repère : ${textOf(step) || 'Commande de repère'}`);
  });

  return rows;
}

function install(ctx) {
  const make = ctx.el;
  const layout = ctx.layout;
  if (typeof make !== 'function' || !layout) return;

  const host = document.getElementById(MAIN_ID) || layout;
  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const panel = ensureNode(make, PANEL_ID, 'section', 'e042-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'e042-title', panel);
  write(title, 'Noms accessibles uniques des contrôles');

  const lede = ensureNode(make, `${PANEL_ID}-lede`, 'p', 'e042-lede', panel);
  write(lede, 'Chaque contrôle de la frise et de la fiche porte un nom accessible distinct. Les libellés sont dérivés des données déjà présentes dans le DOM : aucun texte visible n’est renommé, aucune information n’est inventée.');

  const table = ensureNode(make, TABLE_ID, 'table', 'e042-table', panel);
  const summary = ensureNode(make, SUMMARY_ID, 'p', 'e042-summary', panel);
  const note = ensureNode(make, NOTE_ID, 'p', 'e042-note', panel);
  const metric = ensureNode(make, METRIC_ID, 'p', 'e042-metric', panel);
  panel.replaceChildren(title, lede, table, summary, note, metric);

  const entries = controlList().map((ctrl, index) => ({
    ...ctrl,
    index,
    existing: ctrl.node.getAttribute('aria-label') || '',
    collision: false,
    final: '',
    source: '',
  }));

  /* E042-06 : un libellé existant répété sur plusieurs contrôles est une
     collision, au même titre qu'un nom généré deux fois. */
  const existingCounts = new Map();
  entries.forEach((row) => {
    if (row.existing) {
      const key = normalize(row.existing);
      existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
    }
  });

  const used = new Map();
  const reserve = (label) => {
    const key = normalize(label);
    const count = (used.get(key) || 0) + 1;
    used.set(key, count);
    return count;
  };

  /* E042-08 : les libellés existants et uniques sont conservés tels quels. */
  entries.forEach((row) => {
    if (row.existing && existingCounts.get(normalize(row.existing)) === 1) {
      row.final = row.existing;
      row.source = 'conservé';
      reserve(row.final);
    }
  });

  /* E042-02 à E042-05, E042-06 : attribution d'un nom unique. L'identifiant
     du contrôle sert de critère de désambiguïsation déterministe : jamais
     d'aléa, jamais de date codée en dur. */
  const candidates = new Map();
  entries.forEach((row) => {
    if (row.source) return;
    const key = normalize(row.candidate);
    const repeated = candidates.has(key);
    candidates.set(key, (candidates.get(key) || 0) + 1);
    const duplicatedExisting = row.existing && existingCounts.get(normalize(row.existing)) > 1;
    row.collision = Boolean(repeated || duplicatedExisting);

    let label = row.collision
      ? `${row.candidate} — identifiant ${row.id || `contrôle ${row.index + 1}`}`
      : row.candidate;
    const count = reserve(label);
    if (count > 1) {
      label = `${label} (${count})`;
      row.collision = true;
      reserve(label);
    }
    row.final = label;
    row.source = row.existing || row.collision ? 'désambiguïsé' : 'ajouté';
  });

  /* E042-01, E042-06, E042-07 : écriture observable sur chaque contrôle et
     construction du registre visible. Les attributs d'origine (id, data-tag,
     aria-pressed, aria-controls, écouteurs) ne sont pas modifiés. */
  const body = document.createElement('tbody');
  const names = new Set();
  let missing = 0;
  let collisions = 0;
  let preserved = 0;
  entries.forEach((row) => {
    const node = row.node;
    if (node.getAttribute('aria-label') !== row.final) node.setAttribute('aria-label', row.final);
    if (node.dataset.e042Name !== row.final) node.dataset.e042Name = row.final;
    if (node.dataset.e042Group !== row.group) node.dataset.e042Group = row.group;
    if (node.dataset.e042Source !== row.source) node.dataset.e042Source = row.source;
    if (row.collision) {
      collisions += 1;
      node.dataset.e042Collision = '1';
    } else if (node.dataset.e042Collision) {
      delete node.dataset.e042Collision;
    }
    if (row.source === 'conservé') preserved += 1;
    if (!row.existing) missing += 1;
    names.add(normalize(row.final));

    const tr = make('tr', 'e042-row');
    const th = make('th', 'e042-cell', row.group);
    th.scope = 'row';
    tr.append(
      th,
      make('td', 'e042-cell', row.final),
      make('td', 'e042-cell', `${row.source}${row.collision ? ' · collision résolue' : ''}`)
    );
    body.appendChild(tr);
  });

  const caption = make('caption', 'e042-caption', 'Contrôles de la vue Chronologie et nom accessible retenu');
  const thead = make('thead', 'e042-head');
  const headRow = make('tr', 'e042-head-row');
  ['Contrôle', 'Nom accessible unique', 'Origine'].forEach((label) => {
    const th = make('th', 'e042-cell', label);
    th.scope = 'col';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.replaceChildren(caption, thead, body);

  write(summary, `${entries.length} contrôles recensés : ${missing} sans libellé auparavant, ${preserved} libellé(s) existant(s) conservé(s), ${collisions} collision(s) de noms désambiguïsée(s). Noms distincts après traitement : ${names.size} sur ${entries.length}.`);
  write(note, 'Règle : un nom accessible par contrôle, unique dans la vue. Le texte visible, les identifiants, les catégories d’état et les écouteurs d’origine ne sont pas modifiés. Le panneau n’ajoute aucun arrêt de tabulation et aucune région live.');
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  write(metric, `Installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'} · rejeu sans doublon.`);

  panel.dataset.e042Controls = String(entries.length);
  panel.dataset.e042Missing = String(missing);
  panel.dataset.e042Preserved = String(preserved);
  panel.dataset.e042Collisions = String(collisions);
  panel.dataset.e042Unique = names.size === entries.length ? '1' : '0';
  panel.dataset.e042Reduced = reduced ? '1' : '0';
  panel.dataset.e042Installs = String(installCount);
}

register('E042', (ctx) => {
  install(ctx);
});
