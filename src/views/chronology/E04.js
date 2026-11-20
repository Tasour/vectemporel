import { register } from './registry.js';

/* Lentille E04 — Filtres structurels de la chronologie (domaine : ergonomie).
 * La vue possède déjà une recherche textuelle et un filtre de thème unique
 * (chronology.js:310-344). E04 ajoute trois critères structurels — ère,
 * importance, période — dérivés des seules données réellement présentes dans
 * le DOM rendu. Aucun texte historique n'est inventé, aucun état partagé n'est
 * modifié : la lentille ne touche que l'attribut `hidden` des <li> de repères.
 * Zéro réseau, zéro aléa, zéro console, aucun fichier partagé modifié. */

const CSS_ID = 'chronology-e04';
const BAR_ID = 'e04-toolbar';
const ERA_ID = 'e04-era';
const IMPORTANCE_ID = 'e04-importance';
const PERIOD_ID = 'e04-period';
const HELP_ID = 'e04-help';
const STATUS_ID = 'e04-status';
const EMPTY_ID = 'e04-empty';
const RESET_ID = 'e04-reset';

/* Feuille unique via ctx.css (cssOnce). Tout est ciblé sous #e04-toolbar, à
   l'exception d'une seule règle nécessaire : le style de la vue impose
   `display:flex` aux <li> (chronology.js:60), ce qui annulerait l'attribut
   `hidden`. La règle ciblée restaure l'effet du masquage. */
const CSS = `
  #${BAR_ID}{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
    gap:8px 10px;margin:0 0 10px;padding:9px 10px;
    border:1px solid var(--line);border-radius:8px;
    background:rgba(255,255,255,.02);
  }
  #${BAR_ID} .e04-field{min-width:0}
  #${BAR_ID} .e04-label{
    display:block;margin:0 0 4px;color:var(--muted);
    font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  }
  #${BAR_ID} .e04-select{
    width:100%;min-width:0;min-height:36px;padding:6px 8px;
    border:1px solid var(--line);border-radius:7px;
    background:var(--surface-2);color:var(--ink);
    font:inherit;font-size:16px;
  }
  #${BAR_ID} .e04-select:focus-visible,
  #${BAR_ID} .e04-reset:focus-visible{
    outline:2px solid var(--gold-bright);outline-offset:2px;
  }
  #${BAR_ID} .e04-help,
  #${BAR_ID} .e04-status,
  #${BAR_ID} .e04-empty,
  #${BAR_ID} .e04-reset{grid-column:1/-1}
  #${BAR_ID} .e04-help{margin:0;color:var(--muted-2);font-size:9px;line-height:1.5}
  #${BAR_ID} .e04-status{
    margin:2px 0 0;padding:6px 9px;border:1px solid var(--line);
    border-radius:7px;color:var(--gold-bright);font-size:10px;font-weight:600;
    line-height:1.4;font-variant-numeric:tabular-nums;
  }
  #${BAR_ID} .e04-empty{
    margin:2px 0 0;padding:9px 10px;border:1px solid var(--line);
    border-radius:7px;background:rgba(221,113,101,.06);
    color:var(--ink-soft);font-size:10px;line-height:1.5;
  }
  #${BAR_ID} .e04-empty[hidden]{display:none}
  #${BAR_ID} .e04-reset{
    min-height:36px;justify-self:start;padding:6px 12px;
    border:1px solid var(--line);border-radius:7px;
    background:transparent;color:var(--gold-bright);
    font:inherit;font-size:10px;font-weight:600;cursor:pointer;
  }
  #${BAR_ID} .e04-reset:hover:not(:disabled){background:rgba(230,185,111,.1)}
  #${BAR_ID} .e04-reset:disabled{opacity:.45;cursor:default}
  .event-list.atlas-chrono-events > li[data-event-id][hidden]{display:none!important}
  @media (max-width:620px){
    #${BAR_ID}{grid-template-columns:minmax(0,1fr);gap:6px;padding:8px}
    #${BAR_ID} .e04-reset{justify-self:stretch}
  }
`;

/* Crises purement structurelles : aucun seuil n'est présenté comme un fait
   historique. Les années négatives (av. J.-C.) ont leur propre classe. */
const PERIODS = Object.freeze([
  Object.freeze({ value: 'all', label: 'Toutes les périodes', test: () => true }),
  Object.freeze({ value: 'ancient', label: 'Avant l’an 0', test: (y) => y < 0 }),
  Object.freeze({ value: 'first', label: 'De 0 à 999', test: (y) => y >= 0 && y <= 999 }),
  Object.freeze({ value: 'middle', label: 'De 1000 à 1499', test: (y) => y >= 1000 && y <= 1499 }),
  Object.freeze({ value: 'modern', label: 'De 1500 à 1799', test: (y) => y >= 1500 && y <= 1799 }),
  Object.freeze({ value: 'recent', label: '1800 et après', test: (y) => y >= 1800 }),
]);

/* État de lecture local, conservé entre les rendus de la coque. Aucun nœud
   DOM n'y est mémorisé : toutes les fonctions réinterrogent le DOM courant. */
const local = { era: 'all', importance: 'all', period: 'all' };
/* Valeurs d'importance déjà observées, accumulées pour que la liste
   d'options reste stable quand la vue ne rend qu'une ère. */
const knownImportance = new Set();

function addOption(select, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function eventItems() {
  const list = document.getElementById('atlas-chrono-events');
  if (!list) return [];
  return Array.prototype.filter.call(list.children, (node) => (
    node.nodeType === 1 && node.hasAttribute('data-event-id')
  ));
}

function selectedLabel(select) {
  if (!select || !select.options || !select.options.length) return '';
  const option = select.options[select.selectedIndex];
  return option ? option.textContent.trim() : '';
}

function buildToolbar(ctx) {
  const bar = ctx.el('div', 'e04-toolbar');
  bar.id = BAR_ID;
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filtres structurels des repères');

  const eraField = ctx.el('div', 'e04-field');
  const eraLabel = ctx.el('label', 'e04-label', 'Ère');
  eraLabel.htmlFor = ERA_ID;
  const era = ctx.el('select', 'e04-select');
  era.id = ERA_ID;
  era.dataset.fk = 'e04-era';
  era.setAttribute('aria-controls', 'atlas-chrono-events');
  addOption(era, 'all', 'Toutes les ères affichées');
  document.querySelectorAll('#atlas-chrono-eras .era-band').forEach((band) => {
    const id = band.getAttribute('data-era-id');
    if (!id) return;
    const nameNode = band.querySelector('span');
    const name = nameNode ? nameNode.textContent.trim() : '';
    addOption(era, id, name || id);
  });
  eraField.append(eraLabel, era);

  const importanceField = ctx.el('div', 'e04-field');
  const importanceLabel = ctx.el('label', 'e04-label', 'Importance');
  importanceLabel.htmlFor = IMPORTANCE_ID;
  const importance = ctx.el('select', 'e04-select');
  importance.id = IMPORTANCE_ID;
  importance.dataset.fk = 'e04-importance';
  importance.setAttribute('aria-controls', 'atlas-chrono-events');
  eventItems().forEach((item) => {
    const value = item.getAttribute('data-importance');
    if (value !== null && value !== '') knownImportance.add(value);
  });
  addOption(importance, 'all', 'Toutes les importances');
  Array.from(knownImportance).sort((a, b) => Number(a) - Number(b))
    .forEach((value) => addOption(importance, value, `Importance ${value}`));
  importanceField.append(importanceLabel, importance);

  const periodField = ctx.el('div', 'e04-field');
  const periodLabel = ctx.el('label', 'e04-label', 'Période');
  periodLabel.htmlFor = PERIOD_ID;
  const period = ctx.el('select', 'e04-select');
  period.id = PERIOD_ID;
  period.dataset.fk = 'e04-period';
  period.setAttribute('aria-controls', 'atlas-chrono-events');
  PERIODS.forEach((rule) => addOption(period, rule.value, rule.label));
  periodField.append(periodLabel, period);

  const help = ctx.el('p', 'e04-help',
    'Ces critères s’ajoutent à la recherche et aux thèmes de la vue ; ils se combinent entre eux. '
    + 'Ils ne déplacent ni la sélection ni l’ère courante : un repère sans donnée pour un critère actif est masqué.');
  help.id = HELP_ID;

  const status = ctx.el('p', 'e04-status');
  status.id = STATUS_ID;

  const empty = ctx.el('p', 'e04-empty',
    'Aucun repère affiché ne correspond à ces critères. Modifiez un filtre ou réinitialisez-les.');
  empty.id = EMPTY_ID;
  empty.hidden = true;

  const reset = ctx.el('button', 'e04-reset', 'Réinitialiser les filtres');
  reset.type = 'button';
  reset.id = RESET_ID;
  reset.disabled = true;

  bar.append(eraField, importanceField, periodField, help, status, empty, reset);
  return bar;
}

function matches(item) {
  if (local.era !== 'all' && item.getAttribute('data-era-id') !== local.era) return false;
  if (local.importance !== 'all' && item.getAttribute('data-importance') !== local.importance) return false;
  const rule = PERIODS.find((candidate) => candidate.value === local.period) || PERIODS[0];
  if (rule.value !== 'all') {
    const year = Number(item.getAttribute('data-year'));
    if (!Number.isFinite(year) || !rule.test(year)) return false;
  }
  return true;
}

function apply() {
  const list = document.getElementById('atlas-chrono-events');
  const bar = document.getElementById(BAR_ID);
  if (!list || !bar) return;
  const era = document.getElementById(ERA_ID);
  const importance = document.getElementById(IMPORTANCE_ID);
  const period = document.getElementById(PERIOD_ID);
  const status = document.getElementById(STATUS_ID);
  const empty = document.getElementById(EMPTY_ID);
  const reset = document.getElementById(RESET_ID);
  if (!era || !importance || !period || !status || !empty || !reset) return;

  era.value = local.era;
  importance.value = local.importance;
  period.value = local.period;

  let shown = 0;
  const items = eventItems();
  items.forEach((item) => {
    const visible = matches(item);
    item.hidden = !visible; /* seul l'attribut du <li> change */
    if (visible) shown += 1;
  });

  const criteria = [];
  if (local.era !== 'all') criteria.push(`ère : ${selectedLabel(era)}`);
  if (local.importance !== 'all') criteria.push(`importance ${local.importance}`);
  if (local.period !== 'all') criteria.push(`période : ${selectedLabel(period)}`);
  const filtered = criteria.length > 0;
  const total = items.length;
  status.textContent = `${shown} repère${shown > 1 ? 's' : ''} affiché${shown > 1 ? 's' : ''} sur ${total}`
    + ` · ${filtered ? criteria.join(' · ') : 'aucun filtre structurel actif'}.`;

  reset.disabled = !filtered;
  empty.hidden = !(filtered && total > 0 && shown === 0);

  const focused = document.activeElement;
  if (focused && list.contains(focused) && focused.closest('li[hidden]')) {
    era.focus({ preventScroll: true });
  }
}

function resetFilters() {
  local.era = 'all';
  local.importance = 'all';
  local.period = 'all';
  apply();
}

function wire() {
  const bind = (id, key) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.addEventListener('change', () => {
      local[key] = select.value;
      apply();
    });
    select.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      resetFilters();
      select.focus({ preventScroll: true });
    });
  };
  bind(ERA_ID, 'era');
  bind(IMPORTANCE_ID, 'importance');
  bind(PERIOD_ID, 'period');

  const reset = document.getElementById(RESET_ID);
  if (reset) {
    reset.addEventListener('click', (event) => {
      event.preventDefault();
      resetFilters();
      const era = document.getElementById(ERA_ID);
      if (era) era.focus({ preventScroll: true });
    });
  }
}

register('E04', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function') return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const tools = document.getElementById('atlas-chrono-tools');
  if (!tools) return; /* la vue chronologie n'est pas rendue : lentille inactive */
  if (!document.getElementById('atlas-chrono-events')) return;

  /* Garde d'existence sur un ID unique : la coque reconstruit le DOM à chaque
     rendu (shell.js), donc la barre est recréée avec lui, sans doublon ni
     écouteur accumulé. */
  if (!document.getElementById(BAR_ID)) {
    const parent = tools.parentNode;
    if (!parent) return;
    parent.insertBefore(buildToolbar(ctx), tools.nextElementSibling);
    wire();
  }
  apply();
});
