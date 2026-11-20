import { register } from './registry.js';

/* Lentille E043 — aria-pressed réservé aux bascules indépendantes.
 * Passe V2, domaine E (Accessibilité & ARIA). Thème : themes.json, clé E043.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E043.md — chantiers E043-01 à E043-10.
 * Fichier possédé : src/views/chronology/v2/E043.js uniquement. Aucun fichier
 * partagé n'est modifié : ni registry.js, ni index.js, ni styles.css, ni
 * src/views/chronology.js, ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion(). Le
 * registre V2 ne fournit pas say() : la lentille n'ajoute AUCUNE région live,
 * n'écrit dans aucune région existante et n'affiche son état qu'en texte
 * visible, dédupliqué, dans son propre panneau.
 *
 * Périmètre strict : la sémantique de aria-pressed. Les puces de type de point
 * (E012), la recherche (E011), le compte de résultats (E015), les annonces
 * (E019), les libellés uniques (E042), les listes sémantiques (E044) et la
 * couleur seule (E048) restent hors de ce module : il les lit, ne les réécrit
 * pas. Le cœur du thème est E043-05 : un choix unique doit être un radiogroup,
 * pas une rangée de boutons aria-pressed.
 *
 * Invariants : un seul register('E043', ctx => …), un seul
 * ctx.css('chronology-v2-e043', …), des IDs tous préfixés chronology-v2-e043-
 * avec garde d'existence, un seul écouteur de clic observationnel, zéro
 * journalisation, zéro réseau, zéro aléa, zéro HTML brut, zéro timer, zéro
 * animation, zéro vol de focus, zéro gestionnaire de touche.
 */

const CSS_ID = 'chronology-v2-e043';

const PANEL_ID = 'chronology-v2-e043-panel';
const TITLE_ID = 'chronology-v2-e043-title';
const INTRO_ID = 'chronology-v2-e043-intro';
const INVENTORY_ID = 'chronology-v2-e043-inventory';
const INVENTORY_METRIC_ID = 'chronology-v2-e043-inventory-metric';
const VALUE_ID = 'chronology-v2-e043-value';
const ROLE_ID = 'chronology-v2-e043-role';
const LABEL_ID = 'chronology-v2-e043-label';
const EXCLUSIVE_ID = 'chronology-v2-e043-exclusive';
const EXCLUSIVE_LIST_ID = 'chronology-v2-e043-exclusive-list';
const RADIO_ID = 'chronology-v2-e043-radio';
const RADIO_LEGEND_ID = 'chronology-v2-e043-radio-legend';
const INDEP_ID = 'chronology-v2-e043-independent';
const INDEP_LEGEND_ID = 'chronology-v2-e043-independent-legend';
const VISUAL_ID = 'chronology-v2-e043-visual';
const GROUP_ID = 'chronology-v2-e043-group';
const METRIC_ID = 'chronology-v2-e043-metric';

/* E043-01, E043-07, E043-08, E043-09 : une seule feuille, injectée une fois.
   Le panneau est un bloc en flux normal ajouté à ctx.layout : il ne recouvre
   ni la frise, ni la fiche, ni les outils. Tout état est doublé par la forme
   de la bordure (tirets pleins) et par un marqueur textuel, jamais par la
   seule couleur. Aucune transition n'est définie. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e043-title {
    margin: 0 0 5px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 14px; font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e043-intro { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} h3.e043-sub {
    margin: 11px 0 3px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${PANEL_ID} .e043-note { margin: 0 0 5px; color: var(--ink-soft); }
  #${PANEL_ID} .e043-faint { color: var(--muted-2); font-size: 10px; }
  #${PANEL_ID} .e043-list { margin: 5px 0 6px; padding-left: 18px; }
  #${PANEL_ID} .e043-list li { margin: 0 0 3px; }
  #${PANEL_ID} .e043-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px; color: var(--gold-bright);
  }
  #${PANEL_ID} fieldset.e043-fieldset {
    margin: 7px 0; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
  }
  #${PANEL_ID} legend.e043-legend {
    padding: 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${PANEL_ID} .e043-radio-row {
    display: flex; align-items: center; gap: 7px;
    min-height: 24px; margin: 3px 0;
  }
  #${PANEL_ID} .e043-toggle {
    min-height: 36px; margin: 3px 5px 3px 0; padding: 5px 10px;
    border: 1px dashed var(--line-strong); border-radius: 6px;
    background: transparent; color: var(--ink-soft);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .e043-toggle[data-e043-state="on"] {
    border-style: solid; border-width: 2px;
    text-decoration: underline; text-underline-offset: 3px;
  }
  #${PANEL_ID} .e043-toggle:focus-visible,
  #${PANEL_ID} input[type="radio"]:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${PANEL_ID} .e043-state-mark {
    margin-left: 5px; color: var(--muted-2); font-size: 10px;
  }
  #${PANEL_ID} .e043-metric {
    margin: 10px 0 0; padding-top: 8px;
    border-top: 1px dashed var(--line); color: var(--muted); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { margin-top: 10px; padding: 9px 10px 11px; }
    #${PANEL_ID} .e043-radio-row { flex-wrap: wrap; gap: 3px 7px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e043-title, #${PANEL_ID} h3.e043-sub,
    #${PANEL_ID} legend.e043-legend, #${PANEL_ID} .e043-code { color: CanvasText; }
    #${PANEL_ID} .e043-toggle[data-e043-state="on"] { border-width: 3px; }
  }
`;

const VALID = ['true', 'false'];
const STATE_WORDS = /\b(actif|active|activé|activée|inactif|inactive|désactivé|désactivée|on|off|sélectionné|sélectionnée|pressé|pressée)\b/i;

const RADIO_OPTIONS = [
  { value: 'annee', label: 'Par année' },
  { value: 'siecle', label: 'Par siècle' },
  { value: 'millenaire', label: 'Par millénaire' },
];

const INDEPENDENT_OPTIONS = [
  { label: 'Afficher les légendes', pressed: true },
  { label: 'Afficher les dimensions', pressed: false },
];

let installCount = 0;
let clickBound = false;
let helper = null;
let panelRef = null;
let scopeRef = null;
let reducedRef = false;

/* E043-10 : une seule écriture, dédupliquée, sans région live. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E043-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché : il est recréé. Un
   nœud retrouvé est déplacé dans le parent courant, jamais cloné. */
function ensureNode(make, id, tagName, className, parent) {
  let found = document.getElementById(id);
  if (!found) {
    found = make(tagName, className);
    found.id = id;
  }
  if (found.parentElement !== parent) parent.appendChild(found);
  return found;
}

/* E043-10 : fabrique locale utilisée par les rafraîchissements, qui ne
   dépendent pas du ctx d'origine tout en restant du createElement + textContent. */
function node(tagName, className, text) {
  if (typeof helper === 'function') return helper(tagName, className, text);
  const built = document.createElement(tagName);
  if (className) built.className = className;
  if (text !== undefined) built.textContent = text;
  return built;
}

/* E043-04 : le nom accessible est lu, jamais deviné. aria-labelledby est
   prioritaire sur aria-label, lui-même prioritaire sur le texte visible. */
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

/* E043-01 à E043-09 : un seul audit en lecture seule de tous les porteurs de
   aria-pressed du stage, hors panneau de la lentille. Les contrôles existants
   ne sont ni modifiés ni déplacés : seules des données de diagnostic sont
   calculées et affichées. */
function audit() {
  const scope = scopeRef || document;
  const all = Array.from(scope.querySelectorAll('[aria-pressed]'))
    .filter((control) => !panelRef || !panelRef.contains(control));

  const badValues = all.filter((control) => VALID.indexOf(control.getAttribute('aria-pressed')) === -1);
  const badRoles = all.filter((control) => control.tagName !== 'BUTTON');
  const unstable = all.filter((control) => STATE_WORDS.test(nameOf(control)));
  const visible = all.filter((control) => control.hasAttribute('data-e012-state')
    || control.hasAttribute('data-e043-state')
    || Boolean(control.querySelector('.e012-chip-state, .e043-state-mark')));

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

/* E043-06 et E043-08 : une bascule indépendante légitime garde aria-pressed.
   Son libellé accessible est stable ; seul le marqueur visible et la forme de
   la bordure changent. Le clic ne touche à aucun contrôle de la vue. */
function bindToggle(button) {
  if (button.dataset.e043Bound) return;
  button.dataset.e043Bound = '1';
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(next));
    button.dataset.e043State = next ? 'on' : 'off';
    const mark = button.querySelector('.e043-state-mark');
    if (mark) write(mark, next ? ' activé' : ' désactivé');
    refresh();
  });
}

/* E043-05 : l'exemplaire de radiogroupe utilise des boutons radio natifs dans
   une fieldset légendée. Aucun gestionnaire de touche n'est installé : le
   clavier natif des radio suffit et n'entre pas en conflit avec le routeur. */
function buildRadioExemplar(make, parent) {
  const fieldset = node('fieldset', 'e043-fieldset');
  fieldset.id = RADIO_ID;
  const legend = node('legend', 'e043-legend', 'Choix unique — radiogroupe');
  legend.id = RADIO_LEGEND_ID;
  fieldset.appendChild(legend);
  RADIO_OPTIONS.forEach((option) => {
    const row = node('label', 'e043-radio-row');
    const input = make('input');
    input.type = 'radio';
    input.name = RADIO_ID;
    input.value = option.value;
    row.append(input, node('span', '', option.label));
    fieldset.appendChild(row);
  });
  parent.appendChild(fieldset);
}

/* E043-07 : deux bascules indépendantes, chacune avec son propre aria-pressed,
   réunies dans un groupe nommé (E043-09). Elles ne filtrent rien : elles
   illustrent le seul usage correct de aria-pressed. */
function buildIndependentExemplar(make, parent) {
  const group = node('div', 'e043-independent');
  group.id = INDEP_ID;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', INDEP_LEGEND_ID);

  const legend = node('p', 'e043-legend', 'Bascules indépendantes — aria-pressed légitime');
  legend.id = INDEP_LEGEND_ID;
  group.appendChild(legend);

  INDEPENDENT_OPTIONS.forEach((option) => {
    const button = make('button', 'e043-toggle');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(option.pressed));
    button.setAttribute('aria-label', `${option.label} : bascule indépendante des autres options.`);
    button.dataset.e043State = option.pressed ? 'on' : 'off';
    const mark = node('span', 'e043-state-mark', option.pressed ? ' activé' : ' désactivé');
    mark.setAttribute('aria-hidden', 'true');
    button.append(document.createTextNode(option.label), mark);
    bindToggle(button);
    group.appendChild(button);
  });
  parent.appendChild(group);
}

/* E043-01 à E043-09 : construction structurelle du panneau. Les nœuds à ID
   fixe passent par ensureNode ; les lignes d'inventaire sont reconstruites à
   chaque rafraîchissement avec replaceChildren. */
function build(make, panel) {
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'e043-title', panel);
  write(title, 'Bascule ou choix unique ? — le bon usage de aria-pressed');

  const intro = ensureNode(make, INTRO_ID, 'p', 'e043-intro', panel);
  write(intro, 'Panneau d’audit en lecture seule. aria-pressed décrit une bascule indépendante : son libellé ne change pas, seul son état change. Dès que les choix s’excluent mutuellement, la convention est un radiogroupe, pas une rangée de boutons pressés. Les contrôles de la vue ne sont pas modifiés.');

  const hInventory = node('h3', 'e043-sub', 'E043-01 — Inventaire des porteurs de aria-pressed');
  const inventoryMetric = ensureNode(make, INVENTORY_METRIC_ID, 'p', 'e043-note', panel);
  const inventory = ensureNode(make, INVENTORY_ID, 'ul', 'e043-list', panel);

  const hValue = node('h3', 'e043-sub', 'E043-02 — Valeur stricte true ou false');
  const value = ensureNode(make, VALUE_ID, 'p', 'e043-note', panel);

  const hRole = node('h3', 'e043-sub', 'E043-03 — aria-pressed n’a de sens que sur un bouton');
  const role = ensureNode(make, ROLE_ID, 'p', 'e043-note', panel);

  const hLabel = node('h3', 'e043-sub', 'E043-04 — Libellé stable, état séparé');
  const label = ensureNode(make, LABEL_ID, 'p', 'e043-note', panel);

  const hExclusive = node('h3', 'e043-sub', 'E043-05 — Choix unique détecté : radiogroupe recommandé');
  const exclusive = ensureNode(make, EXCLUSIVE_ID, 'p', 'e043-note', panel);
  const exclusiveList = ensureNode(make, EXCLUSIVE_LIST_ID, 'ul', 'e043-list', panel);

  const hRadio = node('h3', 'e043-sub', 'E043-06 — Exemplaire de radiogroupe (choix unique)');
  const radioHost = node('div', 'e043-radio-host');
  buildRadioExemplar(make, radioHost);
  const radioNote = node('p', 'e043-note e043-faint', 'Trois radio natifs dans une fieldset légendée : une seule case peut être cochée. Le clavier natif des radio reste actif ; la lentille n’ajoute aucun gestionnaire de touche.');

  const hIndep = node('h3', 'e043-sub', 'E043-07 — Bascules indépendantes : aria-pressed conservé');
  const indepHost = node('div', 'e043-indep-host');
  buildIndependentExemplar(make, indepHost);

  const hVisual = node('h3', 'e043-sub', 'E043-08 — État visible sans couleur seule');
  const visual = ensureNode(make, VISUAL_ID, 'p', 'e043-note', panel);

  const hGroup = node('h3', 'e043-sub', 'E043-09 — Groupe nommé pour les bascules');
  const group = ensureNode(make, GROUP_ID, 'p', 'e043-note', panel);

  const metric = ensureNode(make, METRIC_ID, 'p', 'e043-metric', panel);

  panel.replaceChildren(
    title, intro,
    hInventory, inventoryMetric, inventory,
    hValue, value,
    hRole, role,
    hLabel, label,
    hExclusive, exclusive, exclusiveList,
    hRadio, radioHost, radioNote,
    hIndep, indepHost,
    hVisual, visual,
    hGroup, group,
    metric
  );
}

/* E043-01 à E043-10 : rafraîchissement textuel et attributs de diagnostic.
   Appelé à chaque rendu et après un clic sur une bascule exemplaire. */
function refresh() {
  const panel = panelRef;
  if (!panel || !panel.isConnected) return;

  const result = audit();
  const inventory = document.getElementById(INVENTORY_ID);
  const inventoryMetric = document.getElementById(INVENTORY_METRIC_ID);
  const exclusiveList = document.getElementById(EXCLUSIVE_LIST_ID);

  if (inventory) {
    const rows = result.all.map((control) => {
      const row = node('li', 'e043-inventory-row');
      const code = node('code', 'e043-code', `${control.tagName.toLowerCase()}[aria-pressed="${control.getAttribute('aria-pressed')}"]`);
      const detail = node('span', '', ` — ${shortGroupLabel(control.parentElement)} — « ${nameOf(control)} »`);
      row.append(code, detail);
      return row;
    });
    if (!rows.length) rows.push(node('li', 'e043-inventory-row', 'Aucun porteur de aria-pressed détecté dans la vue.'));
    inventory.replaceChildren(...rows);
  }

  if (exclusiveList) {
    const rows = result.exclusive.map((entry) => {
      const row = node('li', 'e043-exclusive-row');
      const names = entry.members.map(nameOf).map((name) => `« ${name} »`).join(', ');
      row.append(document.createTextNode(
        `Groupe ${shortGroupLabel(entry.key)} : ${entry.members.length} boutons aria-pressed dont ${entry.pressed} actif(s). ${names}.`
      ));
      return row;
    });
    if (!rows.length) rows.push(node('li', 'e043-exclusive-row', 'Aucun groupe à choix unique détecté.'));
    exclusiveList.replaceChildren(...rows);
  }

  write(inventoryMetric, `${result.all.length} contrôle(s) aria-pressed relevé(s) dans la vue, hors panneau E043.`);
  write(document.getElementById(VALUE_ID), result.badValues.length === 0
    ? 'Valeurs conformes : aria-pressed vaut exactement "true" ou "false" partout. Aucune valeur vide, "mixed" ou approximative.'
    : `${result.badValues.length} valeur(s) non conforme(s) : seules les chaînes "true" et "false" sont valides ; "mixed" et la casse variable sont invalides sur aria-pressed.`);
  write(document.getElementById(ROLE_ID), result.badRoles.length === 0
    ? 'Rôle conforme : tous les porteurs sont des boutons. aria-pressed n’est pas reporté sur un div, un span ou une ancre.'
    : `${result.badRoles.length} porteur(s) non-bouton : aria-pressed doit être porté par un élément à rôle button.`);
  write(document.getElementById(LABEL_ID), result.unstable.length === 0
    ? 'Libellés stables : aucun nom accessible ne contient de mot d’état variable. Le nom décrit l’option, aria-pressed décrit l’état.'
    : `${result.unstable.length} libellé(s) contiennent un mot d’état variable (actif, désactivé, sélectionné…). La convention recommandée est un libellé fixe plus aria-pressed ; la réécriture relève du fichier possédant ces contrôles.`);
  write(document.getElementById(EXCLUSIVE_ID), result.exclusive.length === 0
    ? 'Aucun groupe suspect : aucun ensemble de deux boutons aria-pressed ou plus ne se comporte comme un choix unique.'
    : `${result.exclusive.length} groupe(s) suspect(s) : au plus un bouton actif sur plusieurs. Un choix unique doit être exprimé par un radiogroupe (voir l’exemplaire ci-dessous), pas par aria-pressed.`);
  write(document.getElementById(VISUAL_ID), `${result.visible.length} contrôle(s) audité(s) doublent déjà leur état par un marqueur textuel ou un attribut de forme. Les bascules exemplaires ci-dessus ajoutent « activé / désactivé » et une bordure pleine ou tiretée : l’état ne dépend jamais de la couleur seule.`);
  write(document.getElementById(GROUP_ID), result.unnamed.length === 0
    ? 'Groupes nommés : chaque ensemble de bascules est porté par une fieldset légendée, un role="group" ou un aria-labelledby.'
    : `${result.unnamed.length} groupe(s) de bascules sans nom accessible. La convention est un rôle de groupe avec aria-labelledby, comme les deux exemplaires de ce panneau.`);

  write(document.getElementById(METRIC_ID), `Mesures : ${result.all.length} porteurs · ${result.badValues.length} valeurs invalides · ${result.badRoles.length} rôles invalides · ${result.unstable.length} libellés instables · ${result.exclusive.length} groupes exclusifs · ${result.unnamed.length} groupes sans nom · ${result.visible.length} états visibles redondants · mouvement réduit : ${reducedRef ? 'oui' : 'non'} · installations : ${installCount}.`);

  panel.dataset.e043Controls = String(result.all.length);
  panel.dataset.e043BadValues = String(result.badValues.length);
  panel.dataset.e043BadRoles = String(result.badRoles.length);
  panel.dataset.e043Unstable = String(result.unstable.length);
  panel.dataset.e043Exclusive = String(result.exclusive.length);
  panel.dataset.e043Unnamed = String(result.unnamed.length);
  panel.dataset.e043Visible = String(result.visible.length);
  panel.dataset.e043Reduced = reducedRef ? '1' : '0';
  panel.dataset.e043Installs = String(installCount);
}

/* E043-10 : un seul écouteur documentaire, purement observationnel. Il ne
   fait ni preventDefault, ni stopPropagation, ni focus, ni annonce live : il
   rafraîchit seulement le miroir textuel après un changement d'état. */
function onClick() {
  refresh();
}

register('E043', (ctx) => {
  const make = ctx.el;
  const layout = ctx.layout;
  if (typeof make !== 'function' || !layout) return;

  helper = make;
  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const panel = ensureNode(make, PANEL_ID, 'section', 'e043-panel', layout);
  panel.dataset.e043View = ctx.viewId || 'chronologyv2';

  scopeRef = ctx.stage || document;
  reducedRef = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  panelRef = panel;

  build(make, panel);
  refresh();

  if (!clickBound) {
    document.addEventListener('click', onClick, false);
    clickBound = true;
  }
});
