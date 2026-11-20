import { register } from './registry.js';

/* Lentille E043 — Filtres par thèmes, états aria-pressed et choix unique.
 *
 * La vue possède deux groupes de boutons de thème :
 *   - la barre d'outils (#atlas-chrono-tools), chronology.js:328-343 ;
 *   - la fiche du repère (#atlas-chrono-aside), chronology.js:442-459.
 * Les deux utilisent `aria-pressed` (chronology.js:334, :449) alors que le
 * filtre est une valeur scalaire unique (`local.tag`, chronology.js:16,
 * :337, :451) : les choix sont mutuellement exclusifs. `aria-pressed` décrit
 * des bascules indépendantes, pas un choix unique.
 *
 * E043 n'édite pas la vue possédée : elle ajoute un groupe de choix unique
 * canonique (role=radiogroup / role=radio / aria-checked) dérivé du DOM rendu,
 * et délègue le changement réel de filtre aux boutons existants via un clic.
 * Aucun store, aucune donnée inventée, aucun réseau, aucun aléa, aucun
 * appel à la console, aucune boucle rAF propre. Tous les identifiants sont préfixés
 * `e043-` et protégés par une garde d'existence (re-render safe).
 */

const CSS_ID = 'chronology-e043';
const PANEL_ID = 'e043-theme-filter';
const LABEL_ID = 'e043-label';
const GROUP_ID = 'e043-theme-group';
const STATUS_ID = 'e043-status';
const HELP_ID = 'e043-help';
const ALL_ID = 'e043-radio-all';
const PREFIX_ID = 'e043-radio-';
const RADIO_CLASS = 'e043-radio';
const BOUND_FLAG = 'e043Bound';

/* Feuille unique (ctx.css → cssOnce, registry.js:13-19), injectée dans <head>
   qui survit au innerHTML de la coque. Tout est ciblé sous `.e043-panel`. */
const CSS = `
.e043-panel{margin:0 0 12px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e043-label{margin:0 0 6px;color:var(--muted);font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.e043-group{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0}
.e043-radio{
  min-height:36px;display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
  border:1px solid var(--line);border-radius:999px;background:transparent;
  color:var(--muted);font:inherit;font-size:10px;line-height:1.3;cursor:pointer;
  transition:border-color .16s linear,color .16s linear,background-color .16s linear;
}
.e043-radio::before{content:"○";width:9px;text-align:center;color:var(--muted-2);font-size:10px;font-weight:700}
.e043-radio[aria-checked="true"]::before{content:"✓";color:var(--gold-bright)}
.e043-radio[aria-checked="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright);font-weight:600}
.e043-radio:hover{border-color:var(--gold)}
.e043-radio:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e043-status{margin:7px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5}
.e043-help{margin:4px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}
.e043-panel[data-e043-reduced="1"] .e043-radio{transition:none}
@media (prefers-reduced-motion:reduce){.e043-radio{transition:none}}
@media (max-width:620px){
  .e043-panel{padding:8px}
  .e043-group{gap:5px}
  .e043-radio{flex:1 1 45%;justify-content:center}
}
`;

/* État local conservé entre deux reconstructions du DOM par la coque.
   Aucun nœud DOM n'est mémorisé : tout est relu du document courant. */
let focusIntent = null;

/* Les boutons de thème de la barre d'outils sont la source de vérité : ils
   portent `data-tag` (chronology.js:333) et `aria-pressed` (chronology.js:334).
   On les lit, on ne modifie ni leur texte ni leurs attributs. */
function tagButtons() {
  const tools = document.getElementById('atlas-chrono-tools');
  if (!tools) return [];
  return Array.prototype.filter.call(
    tools.querySelectorAll('.atlas-chrono-tag[data-tag]'),
    (node) => node.nodeType === 1
  );
}

function currentTag() {
  const active = tagButtons().find((button) => button.getAttribute('aria-pressed') === 'true');
  return active ? active.getAttribute('data-tag') : null;
}

function availableTags() {
  const tags = [];
  tagButtons().forEach((button) => {
    const tag = button.getAttribute('data-tag');
    if (tag && tags.indexOf(tag) === -1) tags.push(tag);
  });
  return tags;
}

function makeRadio(ctx, id, tag, label, checked) {
  const radio = ctx.el('button', RADIO_CLASS, label);
  radio.type = 'button';
  radio.id = id;
  radio.setAttribute('role', 'radio');
  radio.setAttribute('aria-checked', checked ? 'true' : 'false');
  radio.tabIndex = checked ? 0 : -1;
  radio.setAttribute('aria-controls', 'atlas-chrono-events');
  if (tag !== null) radio.setAttribute('data-tag', tag);
  return radio;
}

function buildPanel(ctx) {
  const tags = availableTags();

  const panel = ctx.el('section', 'e043-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', LABEL_ID);

  const label = ctx.el('p', 'e043-label', 'Filtrer par thèmes — choix unique');
  label.id = LABEL_ID;
  panel.appendChild(label);

  const group = ctx.el('div', 'e043-group');
  group.id = GROUP_ID;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', LABEL_ID);
  group.setAttribute('aria-describedby', HELP_ID);
  group.appendChild(makeRadio(ctx, ALL_ID, null, 'Tous les thèmes', true));
  tags.forEach((tag, index) => {
    group.appendChild(makeRadio(ctx, `${PREFIX_ID}${index}`, tag, tag, false));
  });
  panel.appendChild(group);

  const status = ctx.el('p', 'e043-status');
  status.id = STATUS_ID;
  panel.appendChild(status);

  const help = ctx.el('p', 'e043-help', tags.length
    ? 'Choix unique : sélectionner un thème remplace le précédent. « Tous les thèmes » retire le filtre. Flèches gauche/droite pour parcourir les thèmes.'
    : 'Aucun thème documenté pour ce pays : le filtre de thème reste inactif.');
  help.id = HELP_ID;
  panel.appendChild(help);

  return panel;
}

/* Le changement est délégué au bouton existant : son gestionnaire
   (chronology.js:336-341) met à jour `local.tag`, appelle `set({}, 'chrono-filter')`
   (chronology.js:339) puis `announceFilter()` (chronology.js:340). La vue
   reconstruit alors le DOM avec des `aria-pressed` cohérents. */
function applyView(tag) {
  const buttons = tagButtons();
  if (!buttons.length) return false;
  const active = buttons.find((button) => button.getAttribute('aria-pressed') === 'true');
  if (tag === null) {
    if (active) {
      active.click();
      return true;
    }
    return false;
  }
  const target = buttons.find((button) => button.getAttribute('data-tag') === tag);
  if (!target || active === target) return false;
  target.click();
  return true;
}

function sync(panel) {
  const group = document.getElementById(GROUP_ID);
  const status = document.getElementById(STATUS_ID);
  if (!group || !status || !panel.contains(group)) return;

  const active = currentTag();
  const radios = Array.prototype.filter.call(
    group.querySelectorAll(`.${RADIO_CLASS}[role="radio"]`),
    (node) => node.nodeType === 1
  );
  radios.forEach((radio) => {
    const tag = radio.getAttribute('data-tag');
    const checked = tag === null ? active === null : tag === active;
    radio.setAttribute('aria-checked', checked ? 'true' : 'false');
    radio.tabIndex = checked ? 0 : -1; /* tabindex itinérant du radiogroupe */
  });

  status.textContent = active === null
    ? 'Aucun filtre de thème actif : tous les repères rendus restent visibles.'
    : `Thème sélectionné : ${active}. Les repères des autres thèmes sont masqués.`;
}

/* La vue restaure son propre focus sur le bouton de thème cliqué
   (chronology.js:17, :199-205) après `runEnhancements()` (chronology.js:539),
   via `applyFocusIntent()` (chronology.js:540). Un microtask (pas un timer, pas
   de rAF) replace le focus sur le radio choisi une fois ce rendu terminé. */
function restoreFocus(id) {
  const put = () => {
    const node = document.getElementById(id);
    if (node && typeof node.focus === 'function') node.focus({ preventScroll: true });
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(put);
  else put();
}

function select(id, tag) {
  focusIntent = id;
  applyView(tag);
  const panel = document.getElementById(PANEL_ID);
  if (panel && panel.isConnected) {
    /* Aucun re-rendu déclenché : l'intention de focus n'est plus nécessaire. */
    focusIntent = null;
    sync(panel);
  }
  restoreFocus(id);
}

function onKey(event, radios, index) {
  const key = event.key;
  const forward = key === 'ArrowRight' || key === 'ArrowDown';
  const backward = key === 'ArrowLeft' || key === 'ArrowUp';
  if (!forward && !backward && key !== 'Home' && key !== 'End') return;
  event.preventDefault();
  event.stopPropagation(); /* les flèches de la vue naviguent ères/repères (chronology.js:231) */
  if (!radios.length) return;
  let next = index;
  if (forward) next = (index + 1) % radios.length;
  else if (backward) next = (index - 1 + radios.length) % radios.length;
  else if (key === 'Home') next = 0;
  else next = radios.length - 1;
  const target = radios[next];
  if (target) select(target.id, target.getAttribute('data-tag'));
}

function wire(panel) {
  const group = panel.querySelector(`#${GROUP_ID}`);
  if (!group || group.dataset[BOUND_FLAG] === '1') return;
  group.dataset[BOUND_FLAG] = '1';
  const radios = Array.prototype.filter.call(
    group.querySelectorAll(`.${RADIO_CLASS}[role="radio"]`),
    (node) => node.nodeType === 1
  );
  radios.forEach((radio, index) => {
    radio.addEventListener('click', () => select(radio.id, radio.getAttribute('data-tag')));
    radio.addEventListener('keydown', (event) => onKey(event, radios, index));
  });
}

register('E043', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function') return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  /* La vue chronologie n'est pas rendue : aucun effet de bord. */
  const tools = document.getElementById('atlas-chrono-tools');
  if (!tools) return;
  const parent = tools.parentNode;
  if (!parent) return;

  /* Garde d'existence sur un ID unique : la coque reconstruit le DOM à chaque
     rendu (chronology.js:539), le panneau est donc recréé sans doublon ni
     écouteur accumulé. Aucun nœud n'est conservé entre deux passes. */
  let panel = document.getElementById(PANEL_ID);
  if (!panel || !panel.isConnected) {
    panel = buildPanel(ctx);
    parent.insertBefore(panel, tools.nextElementSibling);
    wire(panel);
  }

  sync(panel);

  /* Mouvement réduit : couplage explicite en plus de la media query CSS. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    panel.setAttribute('data-e043-reduced', '1');
  } else {
    panel.removeAttribute('data-e043-reduced');
  }

  if (focusIntent) {
    const id = focusIntent;
    focusIntent = null;
    const node = document.getElementById(id);
    if (node && typeof node.focus === 'function') node.focus({ preventScroll: true });
  }
});
