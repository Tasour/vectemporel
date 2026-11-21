import { register } from './registry.js';

/* Lentille V2 E044 — E. Accessibilité & ARIA : listes sémantiques pour ères
 * et repères (thème « E044 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E044.md — chantiers E044-01 à E044-10.
 * Fichier possédé : src/views/chronology/v2/E044.js uniquement. La passe 1,
 * registry.js, index.js, styles.css, src/views/chronology.js et toute autre
 * lentille restent intacts : aucune écriture hors de ce module.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live et n'écrit dans aucune région existante. Son état est affiché en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E044', install), un seul ctx.css('chronology-v2-e044', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e044- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - lecture et annotation en place : aucun nœud existant n'est supprimé,
 *   renommé ou déplacé, aucun rôle préexistant n'est écrasé ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro animation, zéro réseau.
 */

const CSS_ID = 'chronology-v2-e044';
const PANEL_ID = 'chronology-v2-e044-panel';
const TITLE_ID = 'chronology-v2-e044-title';
const TREE_ID = 'chronology-v2-e044-tree';
const COUNTS_ID = 'chronology-v2-e044-counts';
const INTEGRITY_ID = 'chronology-v2-e044-integrity';
const MOTION_ID = 'chronology-v2-e044-motion';
const METRIC_ID = 'chronology-v2-e044-metric';
const MARKER_LIST_PREFIX = 'chronology-v2-e044-markers-';

/* Sélecteurs tolérants : la passe 2 peut nommer différemment ses bandes et
 * ses repères. On ne fait que détecter et annoter, jamais renommer. */
const ERA_SELECTOR = '[class*="era-band"], [class*="era_band"], [data-era], [data-era-id]';
const MARKER_SELECTOR = '[class*="event-card"], [class*="event_card"], [class*="marker"], [data-event-id], [data-point-id]';
const MAX_ERAS = 12;
const MAX_MARKERS = 64;

/* E044-03, E044-05, E044-07, E044-09 : une seule feuille. Les listes restent
 * des listes visibles (numéros, puces, tirets) : aucune information n'est
 * portée par la seule couleur, y compris en couleurs forcées. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e044-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
    line-height: 1.3; letter-spacing: .01em; text-transform: none;
  }
  #${PANEL_ID} .e044-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e044-tree {
    margin: 0 0 10px; padding: 8px 10px 8px 26px;
    border: 1px dashed var(--line); border-radius: 8px;
  }
  #${PANEL_ID} .e044-tree-eras { margin: 0; padding-left: 22px; list-style: decimal; }
  #${PANEL_ID} .e044-tree-era { margin: 0 0 8px; padding: 0; }
  #${PANEL_ID} .e044-tree-era-label {
    display: block; color: var(--ink); font-family: var(--serif);
    font-size: 13px; font-weight: 600;
  }
  #${PANEL_ID} .e044-tree-markers {
    margin: 4px 0 0; padding-left: 22px; list-style: disc;
  }
  #${PANEL_ID} .e044-tree-marker { margin: 2px 0; padding: 0; color: var(--muted); }
  #${PANEL_ID} .e044-tree-number {
    display: inline-block; min-width: 20px; margin-right: 6px;
    padding: 0 4px; border: 1px solid var(--line-strong); border-radius: 3px;
    color: var(--gold-bright); font-size: 10px; text-align: center;
  }
  #${PANEL_ID} .e044-tree-name { color: var(--ink-soft); }
  #${PANEL_ID} .e044-tree-empty { color: var(--muted-2); font-style: italic; }
  #${PANEL_ID} .e044-counts,
  #${PANEL_ID} .e044-integrity,
  #${PANEL_ID} .e044-motion { margin: 5px 0 0; }
  #${PANEL_ID} .e044-integrity,
  #${PANEL_ID} .e044-motion { color: var(--muted); }
  #${PANEL_ID} .e044-counts { color: var(--gold-bright); }
  #${PANEL_ID} .e044-metric { margin: 7px 0 0; color: var(--muted-2); font-size: 9px; }

  /* E044-01, E044-02, E044-04, E044-07 : les attributs posés sur la frise
     réelle produisent un repère visuel redondant (lisière + numéro). */
  [data-e044-list] { border-left: 2px solid var(--gold); }
  [data-e044-era] { padding-left: 6px; border-left: 3px solid var(--gold); }
  [data-e044-marker] { position: relative; padding-left: 16px; }
  [data-e044-marker] .e044-ordinal {
    position: absolute; left: 0; top: 0;
    color: var(--gold-bright); font-size: 9px; font-weight: 700;
  }
  [data-e044-item="preserve"] { outline: 1px dotted var(--line-strong); outline-offset: 1px; }

  @media (max-width: 620px) {
    #${PANEL_ID} .e044-tree { padding-left: 18px; }
    #${PANEL_ID} .e044-tree-eras,
    #${PANEL_ID} .e044-tree-markers { padding-left: 18px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *,
    [data-e044-era], [data-e044-marker] { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e044-tree,
    [data-e044-list], [data-e044-era] {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e044-title,
    #${PANEL_ID} .e044-counts,
    #${PANEL_ID} .e044-tree-number,
    [data-e044-marker] .e044-ordinal { color: CanvasText; }
  }
`;

let installCount = 0;
let refs = {
  panel: null, tree: null, counts: null, integrity: null,
  motion: null, metric: null, reduced: false,
};

/* E044-10 : garde d'existence pour toute ID préfixée. Un nœud retrouvé dans
 * un ancien parent détaché est déplacé dans le parent courant, jamais cloné. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function tagOf(node) {
  return node && node.tagName ? node.tagName.toLowerCase() : '';
}

function isOurs(node) {
  return !!(node && node.closest && node.closest(`#${PANEL_ID}`));
}

function labelOf(node, fallback) {
  if (!node) return fallback;
  const aria = node.getAttribute ? node.getAttribute('aria-label') : '';
  if (aria && aria.trim()) return aria.trim().slice(0, 48);
  const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 48) : fallback;
}

/* E044-08 : on relève le rôle présent avant toute annotation. Un rôle déjà
 * porté est préservé et signalé ; un <li> natif n'est pas affublé de role. */
function annotateRole(node, role, markerKey) {
  if (tagOf(node) === 'li') {
    node.dataset[markerKey] = 'native';
    return 'preserve';
  }
  const existing = node.getAttribute('role');
  if (existing && existing.trim()) {
    node.dataset[markerKey] = 'preserve';
    return 'preserve';
  }
  node.setAttribute('role', role);
  node.dataset[markerKey] = 'role';
  return 'added';
}

/* E044-01 : le conteneur d'ères devient une liste explicite. E044-05 : il
 * reçoit un aria-label dérivé du seul nombre d'ères observé, sans aucune date
 * ni donnée historique inventée. */
function annotateEraContainers(eras) {
  let ajoutes = 0;
  let preserves = 0;
  eras.forEach((era, index) => {
    const container = era.parentElement;
    if (!container || isOurs(container)) return;
    const natif = tagOf(container) === 'ul' || tagOf(container) === 'ol';
    if (natif) {
      container.dataset.e044List = 'native';
    } else if (annotateRole(container, 'list', 'e044List') === 'added') {
      ajoutes += 1;
    } else {
      preserves += 1;
    }
    if (!container.hasAttribute('aria-label')) {
      container.setAttribute('aria-label', `Liste des ères de la frise chronologique (${eras.length})`);
    }
    era.dataset.e044EraOrdinal = String(index + 1);
  });
  return { ajoutes, preserves, total: eras.length };
}

/* E044-02 : chaque bande d'ère devient un élément de liste annoté (rôle,
 * position et taille de l'ensemble) sans toucher à son texte ni à sa classe. */
function annotateEras(eras) {
  let ajoutes = 0;
  let preserves = 0;
  eras.forEach((era, index) => {
    const result = annotateRole(era, 'listitem', 'e044EraItem');
    if (result === 'added') ajoutes += 1;
    else preserves += 1;
    if (era.getAttribute('role') === 'listitem') {
      era.setAttribute('aria-posinset', String(index + 1));
      era.setAttribute('aria-setsize', String(eras.length));
    }
    era.dataset.e044Era = String(index + 1);
  });
  return { ajoutes, preserves };
}

/* E044-03 : regroupement en lecture des repères par ère. Les repères sans
 * ère identifiable forment un dernier groupe explicite, jamais un silence. */
function buildGroups(eras, markers) {
  const groups = eras.map((era, index) => ({
    era,
    label: labelOf(era, `Ère ${index + 1}`),
    markers: [],
    noms: [],
  }));
  const orphelins = [];
  const nomsOrphelins = [];

  markers.forEach((marker, index) => {
    const parentEra = marker.closest ? marker.closest(ERA_SELECTOR) : null;
    const position = parentEra ? eras.indexOf(parentEra) : -1;
    const cible = position >= 0 ? groups[position] : null;
    const nom = labelOf(marker, `Repère ${index + 1}`);
    if (cible) {
      cible.markers.push(marker);
      cible.noms.push(nom);
    } else {
      orphelins.push(marker);
      nomsOrphelins.push(nom);
    }
  });

  if (orphelins.length) {
    groups.push({
      era: null,
      label: 'Repères non rattachés à une ère',
      markers: orphelins,
      noms: nomsOrphelins,
    });
  }
  return groups;
}

/* E044-04 et E044-07 : chaque repère devient un élément de liste, reçoit sa
 * position ARIA et un numéro visible en texte (jamais une couleur seule). */
function annotateMarkers(make, groups) {
  let ajoutes = 0;
  let preserves = 0;
  let ordinales = 0;
  groups.forEach((group, groupIndex) => {
    group.listId = `${MARKER_LIST_PREFIX}${groupIndex}`;
    group.markers.forEach((marker, markerIndex) => {
      const result = annotateRole(marker, 'listitem', 'e044MarkerItem');
      if (result === 'added') ajoutes += 1;
      else preserves += 1;
      if (marker.getAttribute('role') === 'listitem') {
        marker.setAttribute('aria-posinset', String(markerIndex + 1));
        marker.setAttribute('aria-setsize', String(group.markers.length));
      }
      marker.dataset.e044Marker = `${groupIndex + 1}-${markerIndex + 1}`;
      if (!marker.querySelector('.e044-ordinal')) {
        const ordinal = make('span', 'e044-ordinal', String(markerIndex + 1));
        ordinal.setAttribute('aria-hidden', 'true');
        marker.appendChild(ordinal);
        ordinales += 1;
      }
    });
  });
  return { ajoutes, preserves, ordinales };
}

/* E044-03, E044-05 : arborescence <ol> d'ères → <ul> de repères, rendue dans
 * le panneau. Chaque sous-liste porte un ID unique préfixé et un aria-label. */
function renderTree(make, tree, groups) {
  const racine = make('ol', 'e044-tree-eras');
  racine.setAttribute('aria-label', `Ères et repères de la frise (${groups.length})`);

  groups.forEach((group, groupIndex) => {
    const item = make('li', 'e044-tree-era');
    item.append(make('span', 'e044-tree-era-label', group.label));

    const sousListe = make('ul', 'e044-tree-markers');
    sousListe.id = group.listId;
    sousListe.setAttribute('aria-label', `Repères — ${group.label}`);

    group.markers.forEach((marker, markerIndex) => {
      const repere = make('li', 'e044-tree-marker');
      repere.append(
        make('span', 'e044-tree-number', String(markerIndex + 1)),
        make('span', 'e044-tree-name', group.noms[markerIndex])
      );
      sousListe.appendChild(repere);
    });
    if (!group.markers.length) {
      sousListe.appendChild(make('li', 'e044-tree-empty', 'Aucun repère repéré pour cette ère.'));
    }

    item.appendChild(sousListe);
    racine.appendChild(item);
    if (group.era) group.era.dataset.e044TreeTarget = group.listId;
  });

  tree.replaceChildren(racine);
  return groups.length;
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e044-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e044-title', 'Ères et repères — listes sémantiques');
  title.id = TITLE_ID;
  const lede = make('p', 'e044-lede',
    'Lecture de la structure : les ères forment une liste ordonnée, les repères une sous-liste par ère. Numéros, puces et libellés doublent le rôle ARIA : la couleur n’est jamais le seul indice.');

  const tree = make('div', 'e044-tree');
  tree.id = TREE_ID;
  const counts = make('p', 'e044-counts');
  counts.id = COUNTS_ID;
  const integrity = make('p', 'e044-integrity');
  integrity.id = INTEGRITY_ID;
  const motion = make('p', 'e044-motion');
  motion.id = MOTION_ID;
  const metric = make('p', 'e044-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, tree, counts, integrity, motion, metric);

  const scope = ctx.stage && ctx.stage.querySelectorAll ? ctx.stage : document;
  const eras = Array.prototype.slice.call(scope.querySelectorAll(ERA_SELECTOR), 0, MAX_ERAS)
    .filter((node) => !isOurs(node));
  const markers = Array.prototype.slice.call(scope.querySelectorAll(MARKER_SELECTOR), 0, MAX_MARKERS)
    .filter((node) => !isOurs(node));

  const containers = annotateEraContainers(eras);
  const eraRoles = annotateEras(eras);
  const groups = buildGroups(eras, markers);
  const markerRoles = annotateMarkers(make, groups);
  const groupesRendus = renderTree(make, tree, groups);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, tree, counts, integrity, motion, metric, reduced };

  write(counts, `Structure observée : ${eras.length} ère(s), ${markers.length} repère(s), ${groupesRendus} groupe(s) de liste.`);
  write(integrity, `Intégrité : ${containers.preserves + eraRoles.preserves + markerRoles.preserves} rôle(s) préexistant(s) conservé(s) ; ${containers.ajoutes + eraRoles.ajoutes + markerRoles.ajoutes} rôle(s) ajouté(s) sans écraser le DOM.`);
  write(motion, reduced
    ? 'Mouvement réduit actif : les listes restent lisibles sans transition ni animation.'
    : 'Mouvement normal : la structure des listes ne dépend d’aucune animation.');
  write(metric, `Numéros visibles ajoutés : ${markerRoles.ordinales} · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e044Eras = String(eras.length);
  panel.dataset.e044Markers = String(markers.length);
  panel.dataset.e044Groups = String(groupesRendus);
  panel.dataset.e044Preserved = String(containers.preserves + eraRoles.preserves + markerRoles.preserves);
  panel.dataset.e044Added = String(containers.ajoutes + eraRoles.ajoutes + markerRoles.ajoutes);
  panel.dataset.e044Reduced = reduced ? '1' : '0';
  panel.dataset.e044Installs = String(installCount);
}

register('E044', install);
