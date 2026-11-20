import { register } from './registry.js';

/* Lentille E043 — aria-pressed réservé aux bascules indépendantes.
 * Passe V2 (domaine E — accessibilité & ARIA), vue Points.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E043.md — chantiers E043-01 à E043-10.
 * Fichier possédé : ce module V2 uniquement. Ni la passe 1
 * (`src/views/points/E043.js`, `UNIFIED_AUDIT/POINTS/views/E043.md`), ni aucun
 * fichier partagé (`points.js`, `registry.js`, `index.js`, `_diagnostics.js`,
 * `store.js`, `styles.css`) n'est édité. Aucune autre lentille V2 n'est touchée.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } fourni par
 * runEnhancementsV2 (`points.js:128`), plus ctx.css(id, règles), ctx.el(balise,
 * classe, texte) et ctx.reducedMotion() fournis par `registry.js`. Le registre
 * V2 ne fournit aucun canal d'annonce : la lentille n'ajoute aucune région
 * live, n'écrit dans aucune région existante et ne publie son état qu'en texte
 * visible, dédupliqué, dans son propre panneau.
 *
 * Périmètre strict : la sémantique de aria-pressed. Les puces d'ère, les
 * cellules de la matrice, les selects de filtre, la navigation, les annonces,
 * le détail et la couleur restent hors de ce module : il les lit, ne les
 * réécrit pas. Le cœur du thème est E043-05 : un choix unique doit être un
 * radiogroupe (ou un select natif), pas une rangée de boutons pressés.
 *
 * Invariants V2 : un seul register('E043', ctx => …), un seul
 * ctx.css('points-v2-e043', …), une feuille dont TOUTES les règles sont
 * préfixées .points-v2-e043, des IDs tous préfixés points-v2-e043- protégés
 * par une garde d'existence, un seul écouteur local observationnel, zéro
 * journalisation, zéro réseau, zéro aléa, zéro écriture de balisage par
 * chaîne, zéro minuteur, zéro animation, zéro vol de focus, zéro touche
 * interceptée. Greffon tolérant : une structure inattendue le neutralise sans
 * propager d'exception.
 */

const CSS_ID = 'points-v2-e043';
const ROOT = 'points-v2-e043';

const ID = {
  panel: 'points-v2-e043-panel',
  title: 'points-v2-e043-title',
  intro: 'points-v2-e043-intro',
  inventory: 'points-v2-e043-inventory',
  inventoryMetric: 'points-v2-e043-inventory-metric',
  value: 'points-v2-e043-value',
  role: 'points-v2-e043-role',
  label: 'points-v2-e043-label',
  exclusive: 'points-v2-e043-exclusive',
  exclusiveList: 'points-v2-e043-exclusive-list',
  pointsControls: 'points-v2-e043-points-controls',
  radio: 'points-v2-e043-radio',
  radioLegend: 'points-v2-e043-radio-legend',
  independent: 'points-v2-e043-independent',
  independentLegend: 'points-v2-e043-independent-legend',
  visual: 'points-v2-e043-visual',
  group: 'points-v2-e043-group',
  metric: 'points-v2-e043-metric',
};

/* E043-01, E043-08, E043-09 : une seule feuille, injectée une fois. Chaque
 * règle commence par .points-v2-e043 : aucune fuite hors du panneau, aucune
 * ressource externe. Tout état est doublé par la forme de la bordure et par un
 * marqueur textuel, jamais par la seule couleur. Le mouvement est piloté par
 * ctx.reducedMotion() via data-v2-e043-motion, avec un repli média. */
const CSS = `
.points-v2-e043 {
  margin: 16px 0 0; padding: 12px 14px 14px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 10px; background: rgba(255,255,255,.02);
  color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  max-width: 100%;
}
.points-v2-e043 .points-v2-e043-title {
  margin: 0 0 5px; color: var(--gold-bright); font-family: var(--serif);
  font-size: 14px; font-weight: 600; letter-spacing: 0; text-transform: none;
}
.points-v2-e043 .points-v2-e043-intro { margin: 0 0 8px; color: var(--muted); }
.points-v2-e043 .points-v2-e043-sub {
  margin: 11px 0 3px; color: var(--gold-bright);
  font-family: var(--serif); font-size: 12px; font-weight: 600;
}
.points-v2-e043 .points-v2-e043-note { margin: 0 0 5px; color: var(--ink-soft); }
.points-v2-e043 .points-v2-e043-faint { color: var(--muted-2); font-size: 10px; }
.points-v2-e043 .points-v2-e043-list { margin: 5px 0 6px; padding-left: 18px; }
.points-v2-e043 .points-v2-e043-list li { margin: 0 0 3px; }
.points-v2-e043 .points-v2-e043-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px; color: var(--gold-bright);
}
.points-v2-e043 #points-v2-e043-radio {
  margin: 7px 0; padding: 8px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
}
.points-v2-e043 #points-v2-e043-radio-legend {
  padding: 0 4px; color: var(--gold-bright);
  font-family: var(--serif); font-size: 12px; font-weight: 600;
}
.points-v2-e043 .points-v2-e043-radio-row {
  display: flex; align-items: center; gap: 7px;
  min-height: 24px; margin: 3px 0;
}
.points-v2-e043 #points-v2-e043-independent {
  margin: 7px 0; padding: 8px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
}
.points-v2-e043 .points-v2-e043-independent-legend {
  margin: 0 0 4px; color: var(--gold-bright);
  font-family: var(--serif); font-size: 12px; font-weight: 600;
}
.points-v2-e043 .points-v2-e043-toggle {
  min-height: 36px; margin: 3px 5px 3px 0; padding: 5px 10px;
  border: 1px dashed var(--line-strong); border-radius: 6px;
  background: transparent; color: var(--ink-soft);
  font: inherit; font-size: 11px; cursor: pointer;
}
.points-v2-e043 .points-v2-e043-toggle[data-v2-e043-state="on"] {
  border-style: solid; border-width: 2px;
  text-decoration: underline; text-underline-offset: 3px;
}
.points-v2-e043 .points-v2-e043-toggle:focus-visible,
.points-v2-e043 input[type="radio"]:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.points-v2-e043 .points-v2-e043-state-mark {
  margin-left: 5px; color: var(--muted-2); font-size: 10px;
}
.points-v2-e043 .points-v2-e043-metric {
  margin: 10px 0 0; padding-top: 8px;
  border-top: 1px dashed var(--line); color: var(--muted); font-size: 10px;
}
.points-v2-e043[data-v2-e043-motion="full"] .points-v2-e043-toggle {
  transition: border-color .15s ease, color .15s ease;
}
.points-v2-e043[data-v2-e043-motion="reduced"] .points-v2-e043-toggle {
  transition: none;
}
@media (max-width: 620px) {
  .points-v2-e043 { margin-top: 10px; padding: 9px 10px 11px; }
  .points-v2-e043 .points-v2-e043-radio-row { flex-wrap: wrap; gap: 3px 7px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e043 .points-v2-e043-toggle { transition: none; }
}
@media (forced-colors: active) {
  .points-v2-e043 { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
  .points-v2-e043 .points-v2-e043-title,
  .points-v2-e043 .points-v2-e043-sub,
  .points-v2-e043 #points-v2-e043-radio-legend,
  .points-v2-e043 .points-v2-e043-independent-legend,
  .points-v2-e043 .points-v2-e043-code { color: CanvasText; }
  .points-v2-e043 .points-v2-e043-toggle[data-v2-e043-state="on"] { border-width: 3px; }
}
`;

const VALID = ['true', 'false'];
const STATE_WORDS = /\b(actif|active|activé|activée|inactif|inactive|désactivé|désactivée|on|off|sélectionné|sélectionnée|pressé|pressée)\b/i;

/* Repli uniquement si la matrice ne fournit aucune ère : options explicitement
 * illustratives, jamais présentées comme des données de la vue. */
const RADIO_FALLBACK = [
  { value: 'exemple-1', label: 'Option illustrative 1' },
  { value: 'exemple-2', label: 'Option illustrative 2' },
  { value: 'exemple-3', label: 'Option illustrative 3' },
];

const INDEPENDENT_OPTIONS = [
  { label: 'Afficher les légendes', pressed: true },
  { label: 'Afficher les détails', pressed: false },
];

let helper = null;
let installCount = 0;
let clickBound = false;
let reducedRef = false;
let scopeRef = null;
let panelRef = null;

/* E043-10 : une seule écriture, dédupliquée, sans région live. */
function write(target, text) {
  if (target && target.textContent !== text) target.textContent = text;
}

/* Fabrique locale : ctx.el ou, à défaut, createElement + textContent. */
function node(tagName, className, text) {
  if (typeof helper === 'function') return helper(tagName, className, text);
  const built = document.createElement(tagName);
  if (className) built.className = className;
  if (text !== undefined) built.textContent = text;
  return built;
}

function first(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* Écriture conditionnelle d'attribut : poser une valeur déjà conforme est sans
 * effet sur un DOM inchangé. */
function put(target, name, value) {
  if (!target || typeof target.setAttribute !== 'function') return;
  const next = String(value);
  if (target.getAttribute(name) !== next) target.setAttribute(name, next);
}

/* E043-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
 * le stage, un nœud de la rendu précédente est détaché : il est réutilisé et
 * déplacé dans le parent courant, jamais cloné. */
function ensureNode(make, id, tagName, className, parent) {
  let found = document.getElementById(id);
  if (!found) {
    found = make(tagName, className);
    found.id = id;
  }
  if (found.parentElement !== parent) parent.appendChild(found);
  return found;
}

/* E043-04 : le nom accessible est lu, jamais deviné. aria-labelledby est
 * prioritaire sur aria-label, lui-même prioritaire sur le texte visible. */
function nameOf(control) {
  const by = control.getAttribute('aria-labelledby');
  if (by) {
    const parts = by.split(/\s+/)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((part) => (part.textContent || '').trim());
    if (parts.length) return parts.join(' ').slice(0, 90);
  }
  return (control.getAttribute('aria-label') || control.textContent || '').trim().slice(0, 90);
}

function shortGroupLabel(group) {
  if (!group || !(group instanceof Element)) return 'racine';
  if (group.id) return `#${group.id}`;
  const name = (group.getAttribute('aria-label') || group.getAttribute('data-tag')
    || group.className || group.tagName.toLowerCase()).trim();
  return name.slice(0, 48) || group.tagName.toLowerCase();
}

/* Lecture des contrôles réels de la vue Points. Aucune valeur n'est inventée :
 * tout est dérivé du DOM produit par renderPoints (`points.js:30-126`). */
function readPoints(scope) {
  const grid = first(scope, '.points-grid');
  const eras = Array.from(grid ? grid.querySelectorAll('.points-era') : (scope && scope.querySelectorAll ? scope.querySelectorAll('.points-era') : []));
  const cells = Array.from(scope && scope.querySelectorAll ? scope.querySelectorAll('.points-cell') : []);
  const selects = Array.from(scope && scope.querySelectorAll ? scope.querySelectorAll('.points-filters select') : []);
  const actions = Array.from(scope && scope.querySelectorAll ? scope.querySelectorAll('.points-filters button, .points-nav button') : []);
  const all = eras.concat(cells, selects, actions);
  return {
    eras,
    cells,
    selects,
    actions,
    pressed: all.filter((control) => control.hasAttribute('aria-pressed')).length,
  };
}

/* E043-01 à E043-09 : un seul audit en lecture seule des porteurs de
 * aria-pressed du stage, hors panneau de la lentille. Les contrôles existants
 * ne sont ni modifiés ni déplacés : seules des données de diagnostic sont
 * calculées et affichées. */
function audit() {
  const scope = scopeRef || document;
  const all = scope && typeof scope.querySelectorAll === 'function'
    ? Array.from(scope.querySelectorAll('[aria-pressed]'))
      .filter((control) => !panelRef || !panelRef.contains(control))
    : [];

  const badValues = all.filter((control) => VALID.indexOf(control.getAttribute('aria-pressed')) === -1);
  const badRoles = all.filter((control) => control.tagName !== 'BUTTON');
  const unstable = all.filter((control) => STATE_WORDS.test(nameOf(control)));
  const visible = all.filter((control) => control.hasAttribute('data-e012-state')
    || control.hasAttribute('data-v2-e043-state')
    || Boolean(first(control, '.e043-state-mark, .points-v2-e043-state-mark')));

  const groups = new Map();
  all.forEach((control) => {
    const key = control.parentElement || scope;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(control);
  });

  const exclusive = [];
  const unnamed = [];
  groups.forEach((members, key) => {
    if (members.length < 2) return;
    const pressed = members.filter((member) => member.getAttribute('aria-pressed') === 'true').length;
    if (pressed <= 1) exclusive.push({ key, members, pressed });
    const named = key instanceof Element && (
      key.getAttribute('aria-label') || key.getAttribute('aria-labelledby')
      || key.getAttribute('role') === 'group' || key.tagName === 'FIELDSET'
    );
    if (!named) unnamed.push(key);
  });

  return { all, badValues, badRoles, unstable, visible, groups, exclusive, unnamed };
}

/* E043-06 : les libellés du radiogroupe exemplaire viennent des boutons d'ère
 * réels de la matrice, plafonnés à huit pour garder un panneau lisible. */
function radioOptions(points) {
  if (points.eras.length) {
    return {
      source: 'matrice',
      items: points.eras.slice(0, 8).map((era, index) => ({
        value: `era-${index}`,
        label: txt(era) || `Ère ${index + 1}`,
      })),
    };
  }
  return { source: 'illustratif', items: RADIO_FALLBACK.slice() };
}

/* E043-05 : l'exemplaire de radiogroupe utilise des boutons radio natifs dans
 * une fieldset légendée. Aucun gestionnaire de touche n'est installé : le
 * clavier natif des radio suffit et n'entre pas en conflit avec le routeur. */
function buildRadioExemplar(make, host, radio) {
  const fieldset = ensureNode(make, ID.radio, 'fieldset', 'points-v2-e043-fieldset', host);
  const legend = ensureNode(make, ID.radioLegend, 'legend', 'points-v2-e043-legend', fieldset);
  write(legend, radio.source === 'matrice'
    ? 'Choix unique — ères relevées dans la matrice'
    : 'Choix unique — radiogroupe illustratif');
  radio.items.forEach((option) => {
    const row = node('label', 'points-v2-e043-radio-row');
    const input = make('input');
    input.type = 'radio';
    input.name = ID.radio;
    input.value = option.value;
    row.append(input, node('span', '', option.label));
    fieldset.appendChild(row);
  });
  fieldset.dataset.v2E043RadioSource = radio.source;
}

/* E043-07 : deux bascules indépendantes, chacune avec son propre aria-pressed,
 * réunies dans un groupe nommé (E043-09). Elles ne filtrent rien : elles
 * illustrent le seul usage correct de aria-pressed. */
function buildIndependentExemplar(make, host) {
  const group = ensureNode(make, ID.independent, 'div', 'points-v2-e043-independent', host);
  put(group, 'role', 'group');
  put(group, 'aria-labelledby', ID.independentLegend);
  const legend = ensureNode(make, ID.independentLegend, 'p', 'points-v2-e043-independent-legend', group);
  write(legend, 'Bascules indépendantes — aria-pressed légitime');
  INDEPENDENT_OPTIONS.forEach((option) => {
    const button = make('button', 'points-v2-e043-toggle');
    button.type = 'button';
    put(button, 'aria-pressed', String(option.pressed));
    put(button, 'aria-label', `${option.label} : bascule indépendante des autres options.`);
    put(button, 'data-v2-e043-state', option.pressed ? 'on' : 'off');
    const mark = node('span', 'points-v2-e043-state-mark', option.pressed ? ' activé' : ' désactivé');
    mark.setAttribute('aria-hidden', 'true');
    button.append(document.createTextNode(option.label), mark);
    group.appendChild(button);
  });
}

/* E043-01 à E043-09 : construction structurelle du panneau. Les nœuds à ID
 * fixe passent par ensureNode ; les lignes de listes et les exemplaires sont
 * reconstruits à chaque rendu avec replaceChildren / de nouveaux nœuds. */
function build(make, panel, radio) {
  put(panel, 'role', 'region');
  put(panel, 'aria-labelledby', ID.title);

  const title = ensureNode(make, ID.title, 'h2', 'points-v2-e043-title', panel);
  write(title, 'Bascule ou choix unique ? — le bon usage de aria-pressed');

  const intro = ensureNode(make, ID.intro, 'p', 'points-v2-e043-intro', panel);
  write(intro, 'Panneau d’audit en lecture seule. aria-pressed décrit une bascule indépendante : son libellé ne change pas, seul son état change. Dès que les choix s’excluent mutuellement, la convention est un radiogroupe — ou un select natif —, pas une rangée de boutons pressés. Les contrôles de la vue ne sont pas modifiés.');

  const hInventory = node('h3', 'points-v2-e043-sub', 'E043-01 — Inventaire des porteurs de aria-pressed');
  const inventoryMetric = ensureNode(make, ID.inventoryMetric, 'p', 'points-v2-e043-note', panel);
  const inventory = ensureNode(make, ID.inventory, 'ul', 'points-v2-e043-list', panel);

  const hValue = node('h3', 'points-v2-e043-sub', 'E043-02 — Valeur stricte true ou false');
  const value = ensureNode(make, ID.value, 'p', 'points-v2-e043-note', panel);

  const hRole = node('h3', 'points-v2-e043-sub', 'E043-03 — aria-pressed n’a de sens que sur un bouton');
  const role = ensureNode(make, ID.role, 'p', 'points-v2-e043-note', panel);

  const hLabel = node('h3', 'points-v2-e043-sub', 'E043-04 — Libellé stable, état séparé');
  const label = ensureNode(make, ID.label, 'p', 'points-v2-e043-note', panel);

  const hExclusive = node('h3', 'points-v2-e043-sub', 'E043-05 — Choix unique : radiogroupe recommandé');
  const exclusive = ensureNode(make, ID.exclusive, 'p', 'points-v2-e043-note', panel);
  const exclusiveList = ensureNode(make, ID.exclusiveList, 'ul', 'points-v2-e043-list', panel);
  const pointsControls = ensureNode(make, ID.pointsControls, 'p', 'points-v2-e043-note points-v2-e043-faint', panel);

  const hRadio = node('h3', 'points-v2-e043-sub', 'E043-06 — Exemplaire de radiogroupe (choix unique)');
  const radioHost = node('div', 'points-v2-e043-host');
  buildRadioExemplar(make, radioHost, radio);
  const radioNote = node('p', 'points-v2-e043-note points-v2-e043-faint', radio.source === 'matrice'
    ? 'Les libellés sont lus sur les boutons d’ère de la matrice : une seule case peut être cochée. Le clavier natif des radio reste actif ; la lentille n’ajoute aucun gestionnaire de touche.'
    : 'Aucune ère relevée dans la matrice : les trois options ci-dessus sont purement illustratives et ne décrivent aucune donnée de la vue. Une seule case peut être cochée.');

  const hIndep = node('h3', 'points-v2-e043-sub', 'E043-07 — Bascules indépendantes : aria-pressed conservé');
  const indepHost = node('div', 'points-v2-e043-host');
  buildIndependentExemplar(make, indepHost);
  const indepNote = node('p', 'points-v2-e043-note points-v2-e043-faint', 'Ces deux boutons ne pilotent aucun filtre : ils montrent le seul cas où aria-pressed est correct. Leur état est indépendant l’un de l’autre.');

  const hVisual = node('h3', 'points-v2-e043-sub', 'E043-08 — État visible sans couleur seule');
  const visual = ensureNode(make, ID.visual, 'p', 'points-v2-e043-note', panel);

  const hGroup = node('h3', 'points-v2-e043-sub', 'E043-09 — Groupe nommé pour les bascules');
  const group = ensureNode(make, ID.group, 'p', 'points-v2-e043-note', panel);

  const metric = ensureNode(make, ID.metric, 'p', 'points-v2-e043-metric', panel);

  panel.replaceChildren(
    title, intro,
    hInventory, inventoryMetric, inventory,
    hValue, value,
    hRole, role,
    hLabel, label,
    hExclusive, exclusive, exclusiveList, pointsControls,
    hRadio, radioHost, radioNote,
    hIndep, indepHost, indepNote,
    hVisual, visual,
    hGroup, group,
    metric
  );
}

/* E043-01 à E043-10 : rafraîchissement textuel et attributs de diagnostic.
 * Appelé à chaque rendu et après un clic sur une bascule exemplaire. */
function refresh() {
  const panel = panelRef;
  if (!panel || !panel.isConnected) return;

  const result = audit();
  const points = readPoints(scopeRef || document);

  const inventory = document.getElementById(ID.inventory);
  if (inventory) {
    const rows = result.all.map((control) => {
      const row = node('li', 'points-v2-e043-inventory-row');
      const code = node('code', 'points-v2-e043-code', `${control.tagName.toLowerCase()}[aria-pressed="${control.getAttribute('aria-pressed')}"]`);
      const detail = node('span', '', ` — ${shortGroupLabel(control.parentElement)} — « ${nameOf(control)} »`);
      row.append(code, detail);
      return row;
    });
    if (!rows.length) rows.push(node('li', 'points-v2-e043-inventory-row', 'Aucun porteur de aria-pressed détecté dans la vue, hors panneau E043.'));
    inventory.replaceChildren(...rows);
  }

  const exclusiveList = document.getElementById(ID.exclusiveList);
  if (exclusiveList) {
    const rows = result.exclusive.map((entry) => {
      const row = node('li', 'points-v2-e043-exclusive-row');
      const names = entry.members.map(nameOf).map((name) => `« ${name} »`).join(', ');
      row.append(document.createTextNode(
        `Groupe ${shortGroupLabel(entry.key)} : ${entry.members.length} boutons aria-pressed dont ${entry.pressed} actif(s). ${names}.`
      ));
      return row;
    });
    /* Signaux propres à la vue Points, lus sans jamais être réécrits. */
    if (points.eras.length > 1) rows.push(node('li', 'points-v2-e043-exclusive-row',
      `Matrice : ${points.eras.length} boutons d’ère forment un choix unique ; la sémantique correcte est un radiogroupe (exemplaire ci-dessous).`));
    if (points.selects.length) rows.push(node('li', 'points-v2-e043-exclusive-row',
      `Filtres : ${points.selects.length} select(s) natif(s) portent déjà le choix unique : ils restent des select, sans aria-pressed ni radio.`));
    if (points.cells.length) rows.push(node('li', 'points-v2-e043-exclusive-row',
      `${points.cells.length} cellule(s) de la matrice sont des actions de filtrage, pas des bascules indépendantes.`));
    if (points.actions.length) rows.push(node('li', 'points-v2-e043-exclusive-row',
      `${points.actions.length} bouton(s) de navigation ou de réinitialisation sont des actions ponctuelles, sans état pressé.`));
    if (!rows.length) rows.push(node('li', 'points-v2-e043-exclusive-row', 'Aucun groupe à choix unique détecté.'));
    exclusiveList.replaceChildren(...rows);
  }

  write(document.getElementById(ID.inventoryMetric), `${result.all.length} contrôle(s) aria-pressed relevé(s) dans la vue, hors panneau E043.`);
  write(document.getElementById(ID.pointsControls), `Contrôles lus sur la vue : ${points.eras.length} ère(s), ${points.cells.length} cellule(s), ${points.selects.length} select(s), ${points.actions.length} action(s) — ${points.pressed} porteur(s) de aria-pressed relevé(s) sur ces contrôles.`);
  write(document.getElementById(ID.value), result.badValues.length === 0
    ? 'Valeurs conformes : aria-pressed vaut exactement "true" ou "false" partout. Aucune valeur vide, "mixed" ou approximative.'
    : `${result.badValues.length} valeur(s) non conforme(s) : seules les chaînes "true" et "false" sont valides ; les autres valeurs sont invalides sur aria-pressed.`);
  write(document.getElementById(ID.role), result.badRoles.length === 0
    ? 'Rôle conforme : tous les porteurs sont des boutons. aria-pressed n’est pas reporté sur un div, un span ou une ancre.'
    : `${result.badRoles.length} porteur(s) non-bouton : aria-pressed doit être porté par un élément à rôle button.`);
  write(document.getElementById(ID.label), result.unstable.length === 0
    ? 'Libellés stables : aucun nom accessible ne contient de mot d’état variable. Le nom décrit l’option, aria-pressed décrit l’état.'
    : `${result.unstable.length} libellé(s) contiennent un mot d’état variable (actif, désactivé, sélectionné…). La convention recommandée est un libellé fixe plus aria-pressed ; la réécriture relève du fichier possédant ces contrôles.`);
  write(document.getElementById(ID.exclusive), result.exclusive.length === 0
    ? 'Aucun groupe suspect : aucun ensemble de deux boutons aria-pressed ou plus ne se comporte comme un choix unique. Les contrôles réels de la matrice sont classés ci-dessous.'
    : `${result.exclusive.length} groupe(s) suspect(s) : au plus un bouton actif sur plusieurs. Un choix unique doit être exprimé par un radiogroupe (voir l’exemplaire ci-dessous), pas par aria-pressed.`);
  write(document.getElementById(ID.visual), `${result.visible.length} contrôle(s) audité(s) doublent déjà leur état par un marqueur textuel ou un attribut de forme. Les bascules exemplaires ci-dessus ajoutent « activé / désactivé » et une bordure pleine ou tiretée : l’état ne dépend jamais de la couleur seule.`);
  write(document.getElementById(ID.group), result.unnamed.length === 0
    ? 'Groupes nommés : chaque ensemble de bascules est porté par une fieldset légendée, un role="group" ou un aria-labelledby.'
    : `${result.unnamed.length} groupe(s) de bascules sans nom accessible. La convention est un rôle de groupe avec aria-labelledby, comme les deux exemplaires de ce panneau.`);
  write(document.getElementById(ID.metric), `Mesures : ${result.all.length} porteurs · ${result.badValues.length} valeurs invalides · ${result.badRoles.length} rôles invalides · ${result.unstable.length} libellés instables · ${result.exclusive.length} groupes exclusifs · ${result.unnamed.length} groupes sans nom · ${result.visible.length} états visibles redondants · ${points.eras.length} ères · ${points.selects.length} selects · ${points.actions.length} actions · mouvement réduit : ${reducedRef ? 'oui' : 'non'} · installations : ${installCount}.`);

  const marks = panel.querySelectorAll('[data-v2-e043-state="on"]').length;
  put(panel, 'data-v2-e043-controls', String(result.all.length));
  put(panel, 'data-v2-e043-bad-values', String(result.badValues.length));
  put(panel, 'data-v2-e043-bad-roles', String(result.badRoles.length));
  put(panel, 'data-v2-e043-unstable', String(result.unstable.length));
  put(panel, 'data-v2-e043-exclusive', String(result.exclusive.length));
  put(panel, 'data-v2-e043-unnamed', String(result.unnamed.length));
  put(panel, 'data-v2-e043-visible', String(result.visible.length));
  put(panel, 'data-v2-e043-eras', String(points.eras.length));
  put(panel, 'data-v2-e043-selects', String(points.selects.length));
  put(panel, 'data-v2-e043-actions', String(points.actions.length));
  put(panel, 'data-v2-e043-pressed-on-view', String(points.pressed));
  put(panel, 'data-v2-e043-exemplar-on', String(marks));
  put(panel, 'data-v2-e043-reduced', reducedRef ? '1' : '0');
  put(panel, 'data-v2-e043-installs', String(installCount));
}

/* E043-07 / E043-10 : un seul écouteur, LOCAL au panneau, purement
 * observationnel. Il ne fait ni preventDefault, ni stopPropagation, ni focus,
 * ni annonce live : il rafraîchit le miroir textuel après un clic. */
function onPanelClick(event) {
  const target = event.target;
  const button = target && typeof target.closest === 'function'
    ? target.closest('button.points-v2-e043-toggle') : null;
  if (button && panelRef && panelRef.contains(button)) {
    const next = button.getAttribute('aria-pressed') !== 'true';
    put(button, 'aria-pressed', String(next));
    put(button, 'data-v2-e043-state', next ? 'on' : 'off');
    const mark = first(button, '.points-v2-e043-state-mark');
    if (mark) write(mark, next ? ' activé' : ' désactivé');
  }
  refresh();
}

register('E043', (ctx) => {
  const make = ctx && ctx.el;
  const scope = ctx && (ctx.layout || ctx.stage);
  if (typeof make !== 'function' || !scope || typeof scope.querySelector !== 'function') return;

  helper = make;
  scopeRef = ctx.stage || scope;
  installCount += 1;
  try { reducedRef = Boolean(ctx.reducedMotion && ctx.reducedMotion()); }
  catch { reducedRef = false; }

  /* E043-01 — feuille unique et ancrage CSS préfixé. */
  ctx.css(CSS_ID, CSS);

  const panel = ensureNode(make, ID.panel, 'section', ROOT, scope);
  panelRef = panel;
  put(panel, 'data-v2-e043-view', txt(ctx.viewId) || 'pointsv2');
  put(panel, 'data-v2-e043-motion', reducedRef ? 'reduced' : 'full');

  const points = readPoints(scopeRef);
  const radio = radioOptions(points);
  build(make, panel, radio);
  refresh();

  if (!clickBound || !panel.dataset.v2E043Bound) {
    panel.addEventListener('click', onPanelClick, false);
    put(panel, 'data-v2-e043-bound', '1');
    clickBound = true;
  }
});
