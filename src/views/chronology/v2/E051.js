import { register } from './registry.js';

/* Lentille V2 E051 — F. Sémantique & données : tous les chiffres dérivés du DOM
 * et des attributs data-* (thème « E051 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E051.md — chantiers E051-01 à
 * E051-10. Fichier possédé : src/views/chronology/v2/E051.js uniquement.
 * Lectures seules : src/views/chronology.js, src/views/chronology/v2/registry.js,
 * src/views/chronology/v2/index.js, src/views/chronology/E049.js,
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé n'est modifié ; la passe 1 et toutes les autres
 * lentilles V2 restent intactes.
 *
 * Périmètre strict : la TRAÇABILITÉ DES NOMBRES. Chaque chiffre affiché par ce
 * module est recalculé depuis les nœuds réellement présents dans le DOM et
 * leurs attributs data-*, jamais depuis une constante éditoriale. Les dates
 * (E052), la forme P=(S,R,O,T,E,D,Src,C) (E053), la légende des familles
 * (E054), le sort des points disputés (E055), l'omission de source (E056),
 * les silences (E057), les noms historiques (E058), l'échelle (E059) et la
 * couverture binaire (E060) ne sont pas concernés : ce module ne fait que
 * dériver et recouper des effectifs, des couvertures et des bornes.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, n'écrit dans aucune région existante et affiche son état en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - exactement un register('E051', ctx => { … }) ;
 * - exactement un ctx.css('chronology-v2-e051', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e051- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro animation, zéro réseau.
 */

const PANEL_ID = 'chronology-v2-e051-panel';
const TITLE_ID = 'chronology-v2-e051-title';
const ROWS_ID = 'chronology-v2-e051-rows';
const METRIC_ID = 'chronology-v2-e051-metric';

/* Sources de dérivation : exclusivement des nœuds déjà produits par la vue
 * (chronology.js:282-306, 349-413, 467-505). Aucun sélecteur n'est renommé. */
const EVENTS_SELECTOR = '#atlas-chrono-events > li[data-event-id]';
const ERAS_SELECTOR = '#atlas-chrono-eras button[data-era-id]';
const POINTS_SELECTOR = '#atlas-chrono-aside li[data-point-id]';
const COUNT_SELECTOR = '#atlas-chrono-tools .atlas-chrono-count';
const ASIDE_ID = 'atlas-chrono-aside';

/* E051-01 à E051-10 : une seule feuille. Chaque chantier possède une ligne
 * dont l'état (data-e051-state) pilote un effet visuel distinct — aucune
 * information n'est confiée à la seule couleur : l'état est aussi en texte. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.6;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e051-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    line-height: 1.3; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e051-lede { margin: 0 0 10px; color: var(--muted); }

  /* E051-01 à E051-10 : le registre des dérivations. */
  #${ROWS_ID} { margin: 0; padding: 0; list-style: none; counter-reset: e051; }
  #${ROWS_ID} .e051-row {
    margin: 0 0 5px; padding: 6px 8px 6px 10px;
    border: 1px solid var(--line); border-left-width: 3px; border-radius: 6px;
    background: rgba(255,255,255,.015);
  }
  #${ROWS_ID} .e051-row[data-e051-state="ok"] { border-left-color: var(--gold); }
  #${ROWS_ID} .e051-row[data-e051-state="alerte"] {
    border-left-color: var(--gold-bright); border-left-style: dashed;
    background: rgba(230,185,111,.06);
  }
  #${ROWS_ID} .e051-row[data-e051-state="info"] { border-left-color: var(--muted); }
  #${ROWS_ID} .e051-key { display: block; color: var(--gold-bright); font-weight: 600; }
  #${ROWS_ID} .e051-value { display: block; color: var(--ink); }
  #${ROWS_ID} .e051-source { display: block; color: var(--muted-2); font-size: 9px; }
  #${ROWS_ID} .e051-etat::before {
    content: attr(data-e051-etat); display: inline-block;
    min-width: 58px; margin-right: 6px; color: var(--muted);
    font-size: 9px; font-weight: 600; letter-spacing: .06em;
  }

  /* Marqueurs discrets sur les nœuds sources : ils rendent visible l'origine
     DOM des chiffres sans modifier le texte ni les classes des cartes. */
  [data-e051-src] { position: relative; }
  [data-e051-rank]::after {
    content: '· dérivé ' attr(data-e051-rank);
    margin-left: 4px; color: var(--muted-2);
    font-size: 8px; font-variant-numeric: tabular-nums;
  }

  #${PANEL_ID} .e051-metric { margin: 9px 0 0; color: var(--muted-2); font-size: 9px; }

  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px; }
    #${ROWS_ID} .e051-etat::before { min-width: 0; display: block; margin: 0 0 2px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${ROWS_ID} .e051-row {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e051-title,
    #${ROWS_ID} .e051-key,
    #${ROWS_ID} .e051-etat::before { color: CanvasText; }
  }
`;

let installCount = 0;

/* E051-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
   est réutilisé et déplacé dans le parent courant : la coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché et n'est pas retrouvé
   par getElementById, mais l'idempotence reste assurée dans les deux cas. */
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

function all(selector) {
  return Array.prototype.slice.call(document.querySelectorAll(selector));
}

function distinctCount(values) {
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

function coverage(total, retained) {
  return total > 0 ? Math.round((retained / total) * 100) : 0;
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/* E051-10 : lecture du compteur texte déjà affiché par la vue
   (chronology.js:345), pour recoupement avec le décompte du DOM. */
function readDisplayedCount() {
  const node = document.querySelector(COUNT_SELECTOR);
  if (!node) return null;
  const match = /([\d]+)\s*\//.exec(node.textContent || '');
  return match ? Number(match[1]) : null;
}

/* E051-01 à E051-09 : toutes les grandeurs sont dérivées des nœuds présents.
   Aucune valeur n'est codée en dur ; les constantes sont des libellés. */
function derive() {
  const events = all(EVENTS_SELECTOR);
  const eras = all(ERAS_SELECTOR);
  const points = all(POINTS_SELECTOR);

  const eventIds = events.map((li) => li.getAttribute('data-event-id') || '');
  const eraIds = eras.map((band) => band.getAttribute('data-era-id') || '');
  const pointIds = points.map((li) => li.getAttribute('data-point-id') || '');

  const importances = events
    .map((li) => finiteNumber(li.getAttribute('data-importance')))
    .filter((value) => value !== null);
  let importanceMin = null;
  let importanceMax = null;
  importances.forEach((value) => {
    if (importanceMin === null || value < importanceMin) importanceMin = value;
    if (importanceMax === null || value > importanceMax) importanceMax = value;
  });

  const withImportance = importances.length;
  const withTags = events.filter((li) => (li.getAttribute('data-tags') || '').trim() !== '').length;
  const withKind = points.filter((li) => (li.getAttribute('data-kind') || '').trim() !== '').length;
  const withConfidence = points.filter((li) => (li.getAttribute('data-confidence') || '').trim() !== '').length;
  const illustrated = events.filter((li) => li.querySelector('img')).length;

  /* Annotation en lecture seule des nœuds sources : rang et origine. Aucune
     classe existante n'est retirée, aucun texte n'est réécrit. */
  events.forEach((li, index) => {
    li.setAttribute('data-e051-src', 'event');
    li.setAttribute('data-e051-rank', String(index + 1));
  });
  eras.forEach((band, index) => {
    band.setAttribute('data-e051-src', 'era');
    band.setAttribute('data-e051-rank', String(index + 1));
  });
  points.forEach((li, index) => {
    li.setAttribute('data-e051-src', 'point');
    li.setAttribute('data-e051-rank', String(index + 1));
  });

  return {
    events: events.length,
    eventDuplicates: events.length - distinctCount(eventIds),
    eras: eras.length,
    eraDuplicates: eras.length - distinctCount(eraIds),
    points: points.length,
    pointDuplicates: points.length - distinctCount(pointIds),
    importanceMin,
    importanceMax,
    importanceCount: withImportance,
    importancePct: coverage(events.length, withImportance),
    tagsPct: coverage(events.length, withTags),
    kindPct: coverage(points.length, withKind),
    confidencePct: coverage(points.length, withConfidence),
    illustrated,
    displayedCount: readDisplayedCount(),
  };
}

/* Montage du panneau : un laboratoire, dix lignes, une par chantier. Chaque
   ligne porte son identifiant de chantier et un état pilote par le CSS. */
function mountPanel(make, parent) {
  const panel = ensureNode(make, PANEL_ID, 'section', 'e051-panel', parent);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e051-title', 'Sémantique & données — registre de dérivation');
  title.id = TITLE_ID;

  const lede = make('p', 'e051-lede',
    'Chaque chiffre ci-dessous est recalculé depuis les nœuds et les attributs data-* réellement présents dans la vue. Aucune valeur n’est figée dans ce module : le panneau documente l’origine de chaque nombre, il ne modifie aucune donnée.');

  const rows = make('ol', 'e051-rows');
  rows.id = ROWS_ID;

  const definitions = [
    ['E051-01', 'Repères affichés'],
    ['E051-02', 'Ères déclarées'],
    ['E051-03', 'Points du repère courant'],
    ['E051-04', 'Bornes d’importance'],
    ['E051-05', 'Couverture data-importance'],
    ['E051-06', 'Couverture data-tags'],
    ['E051-07', 'Couverture data-kind'],
    ['E051-08', 'Couverture data-confidence'],
    ['E051-09', 'Repères illustrés'],
    ['E051-10', 'Cohérence du compteur affiché'],
  ];

  definitions.forEach(([code, label]) => {
    const row = make('li', 'e051-row');
    row.setAttribute('data-e051-chantier', code);
    row.setAttribute('data-e051-state', 'info');

    const key = make('span', 'e051-key', `${code} — ${label}`);
    const value = make('span', 'e051-value');
    const source = make('span', 'e051-source');
    const state = make('span', 'e051-etat');
    state.setAttribute('data-e051-etat', 'EN ATTENTE');
    row.append(key, value, source, state);
    rows.appendChild(row);
  });

  const metric = make('p', 'e051-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, rows, metric);
  return panel;
}

/* Écrit une ligne sans toucher à son libellé : valeur, source et état sont
   trois textContent ciblés, chacun dédupliqué. */
function setRow(index, value, source, state, stateLabel) {
  const row = document.querySelectorAll(`#${ROWS_ID} .e051-row`)[index];
  if (!row) return;
  const valueNode = row.querySelector('.e051-value');
  const sourceNode = row.querySelector('.e051-source');
  const stateNode = row.querySelector('.e051-etat');
  write(valueNode, value);
  write(sourceNode, source);
  if (row.getAttribute('data-e051-state') !== state) row.setAttribute('data-e051-state', state);
  if (stateNode && stateNode.getAttribute('data-e051-etat') !== stateLabel) {
    stateNode.setAttribute('data-e051-etat', stateLabel);
  }
}

register('E051', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css('chronology-v2-e051', CSS);

  const host = document.getElementById(ASIDE_ID) || ctx.layout;
  const panel = mountPanel(make, host);
  const d = derive();
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  setRow(0,
    `${d.events} repère(s) · ${d.eventDuplicates} identifiant(s) en double`,
    'Source : #atlas-chrono-events > li[data-event-id]',
    d.eventDuplicates === 0 ? 'ok' : 'alerte',
    d.eventDuplicates === 0 ? 'OK' : 'DOUBLON');

  setRow(1,
    `${d.eras} ère(s) · ${d.eraDuplicates} identifiant(s) en double`,
    'Source : #atlas-chrono-eras button[data-era-id]',
    d.eraDuplicates === 0 ? 'ok' : 'alerte',
    d.eraDuplicates === 0 ? 'OK' : 'DOUBLON');

  setRow(2,
    `${d.points} point(s) · ${d.pointDuplicates} identifiant(s) en double`,
    'Source : #atlas-chrono-aside li[data-point-id]',
    d.points === 0 ? 'info' : (d.pointDuplicates === 0 ? 'ok' : 'alerte'),
    d.points === 0 ? 'VIDE' : (d.pointDuplicates === 0 ? 'OK' : 'DOUBLON'));

  setRow(3,
    d.importanceMin === null
      ? 'Aucune importance numérique dans le DOM'
      : `Importance minimale ${d.importanceMin} · maximale ${d.importanceMax} (${d.importanceCount} valeur(s))`,
    'Source : data-importance des repères',
    d.importanceMin === null ? 'alerte' : 'ok',
    d.importanceMin === null ? 'ABSENT' : 'OK');

  setRow(4,
    `${d.importancePct} % des repères portent une importance numérique (${d.importanceCount}/${d.events})`,
    'Source : data-importance des repères',
    d.importancePct === 100 ? 'ok' : 'alerte',
    d.importancePct === 100 ? 'COMPLET' : 'PARTIEL');

  setRow(5,
    `${d.tagsPct} % des repères portent au moins un thème`,
    'Source : data-tags des repères',
    d.tagsPct === 100 ? 'ok' : 'info',
    d.tagsPct === 100 ? 'COMPLET' : 'PARTIEL');

  setRow(6,
    `${d.kindPct} % des points portent une famille`,
    'Source : data-kind des points',
    d.kindPct === 100 ? 'ok' : 'alerte',
    d.kindPct === 100 ? 'COMPLET' : 'PARTIEL');

  setRow(7,
    `${d.confidencePct} % des points portent un niveau de confiance`,
    'Source : data-confidence des points',
    d.confidencePct === 100 ? 'ok' : 'alerte',
    d.confidencePct === 100 ? 'COMPLET' : 'PARTIEL');

  setRow(8,
    `${d.illustrated} repère(s) avec illustration sur ${d.events}`,
    'Source : présence de img dans les repères',
    'info', 'DÉRIVÉ');

  setRow(9,
    d.displayedCount === null
      ? 'Compteur texte introuvable : contrôle impossible'
      : (d.displayedCount === d.events
        ? `Compteur texte (${d.displayedCount}) = repères dérivés (${d.events})`
        : `DIVERGENCE : compteur texte ${d.displayedCount} contre ${d.events} repères dérivés`),
    'Source : .atlas-chrono-count recoupé avec data-event-id',
    d.displayedCount === null ? 'alerte' : (d.displayedCount === d.events ? 'ok' : 'alerte'),
    d.displayedCount === null ? 'ABSENT' : (d.displayedCount === d.events ? 'COHÉRENT' : 'DIVERGENT'));

  write(document.getElementById(METRIC_ID),
    `Installations : ${installCount} · chiffres dérivés : 10 · repères : ${d.events} · ères : ${d.eras} · points : ${d.points} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e051Events = String(d.events);
  panel.dataset.e051Eras = String(d.eras);
  panel.dataset.e051Points = String(d.points);
  panel.dataset.e051ImportanceMin = d.importanceMin === null ? '' : String(d.importanceMin);
  panel.dataset.e051ImportanceMax = d.importanceMax === null ? '' : String(d.importanceMax);
  panel.dataset.e051TagsPct = String(d.tagsPct);
  panel.dataset.e051KindPct = String(d.kindPct);
  panel.dataset.e051ConfidencePct = String(d.confidencePct);
  panel.dataset.e051Illustrated = String(d.illustrated);
  panel.dataset.e051Coherent = d.displayedCount === d.events ? '1' : '0';
  panel.dataset.e051Derived = '10';
  panel.dataset.e051Reduced = reduced ? '1' : '0';
  panel.dataset.e051Installs = String(installCount);
});
