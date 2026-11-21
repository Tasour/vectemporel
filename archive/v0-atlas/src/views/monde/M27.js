import { register } from './registry.js';

/* Lentille M27 — Recherche et filtrage des pays (domaine C : ergonomie).
 * Tous les contrôles restent des éléments de formulaire natifs, réunis dans
 * une barre unique insérée avant #globe-choices. Le filtrage ne touche que
 * l'attribut `hidden` des <li> : les dix boutons .globe-country, leurs
 * data-index et leur ordre restent intacts (contrat E2E : .globe-list button
 * === 10). La remise à zéro est un <input type="reset"> : sémantique et
 * clavier natifs, sans être compté par ce sélecteur. Zéro réseau, zéro aléa,
 * zéro console, aucune donnée inventée. */

const CSS_ID = 'monde-m27';
const BAR_ID = 'm27-toolbar';
const SEARCH_ID = 'm27-search';
const FILTER_ID = 'm27-filter';
const RESET_ID = 'm27-reset';
const STATUS_ID = 'm27-status';
const EMPTY_ID = 'm27-empty';
const HELP_ID = 'm27-help';

/* Une seule feuille via ctx.css (cssOnce). Aucune règle ne vise
   .globe-country ni un autre sélecteur utilisé par les tests. */
const CSS = `
  #${BAR_ID}{
    display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    gap:8px 10px;margin:0 0 12px;padding:10px;
    border:1px solid var(--line-strong);border-radius:9px;
    background:rgba(255,255,255,.02);
  }
  #${BAR_ID} .m27-field{min-width:0}
  #${BAR_ID} .m27-label{
    display:block;margin:0 0 4px;color:var(--muted);
    font-size:11px;font-weight:600;letter-spacing:.04em;
  }
  #${BAR_ID} .m27-input{
    min-width:0;width:100%;min-height:40px;padding:8px 10px;
    border:1px solid var(--line);border-radius:7px;
    background:var(--surface-2);color:var(--ink);
    font:inherit;font-size:16px;
  }
  #${BAR_ID} .m27-input::placeholder{color:var(--muted-2)}
  #${BAR_ID} .m27-input:hover{border-color:var(--line-strong)}
  #${BAR_ID} .m27-input:focus-visible,
  #${BAR_ID} .m27-reset:focus-visible{
    outline:2px solid var(--gold-bright);outline-offset:2px;
  }
  #${BAR_ID} input[type="search"]::-webkit-search-cancel-button{cursor:pointer}
  #${BAR_ID} .m27-reset{
    min-height:36px;padding:7px 12px;justify-self:end;
    border:1px solid var(--line-strong);border-radius:7px;
    background:transparent;color:var(--gold-bright);
    font:inherit;font-size:12px;font-weight:600;cursor:pointer;
  }
  #${BAR_ID} .m27-reset:hover:not(:disabled){background:rgba(230,185,111,.1)}
  #${BAR_ID} .m27-reset:disabled{opacity:.45;cursor:default}
  #${BAR_ID} .m27-help,
  #${BAR_ID} .m27-status,
  #${BAR_ID} .m27-empty,
  #${BAR_ID} .m27-reset{grid-column:1/-1}
  #${BAR_ID} .m27-help{
    margin:0;color:var(--muted-2);font-size:11px;line-height:1.45;
  }
  #${BAR_ID} .m27-status{
    margin:2px 0 0;padding:6px 9px;
    border:1px solid var(--line);border-radius:7px;
    color:var(--gold-bright);font-size:12px;font-weight:600;
    line-height:1.4;font-variant-numeric:tabular-nums;
  }
  #${BAR_ID} .m27-empty{
    margin:2px 0 0;padding:9px 11px;
    border:1px solid var(--line-strong);border-radius:7px;
    background:rgba(221,113,101,.06);color:var(--ink-soft);
    font-size:12px;line-height:1.5;
  }
  #${BAR_ID} .m27-empty[hidden]{display:none}
  .globe-choices li[hidden]{display:none!important}
  @media (max-width:1000px){
    #${BAR_ID}{grid-template-columns:minmax(0,1fr);gap:6px;padding:8px}
    #${BAR_ID} .m27-reset{justify-self:stretch}
  }
`;

/* Chaque filtre porte sa formule, calculée sur des champs réels du dataset
   (domain, eras, points). Aucun seuil n'est présenté comme une donnée
   historique : ce sont des critères structurels explicites et nommés. */
const FILTERS = Object.freeze([
  Object.freeze({ value: 'all', label: 'Tous les pays', test: () => true }),
  Object.freeze({
    value: 'ancient',
    label: 'Couverture dès l’Antiquité (avant l’an 0)',
    test: (country) => domainStart(country) < 0,
  }),
  Object.freeze({
    value: 'recent',
    label: 'Couverture débutant après 1500',
    test: (country) => domainStart(country) > 1500,
  }),
  Object.freeze({
    value: 'eras6',
    label: 'Au moins 6 ères documentées',
    test: (country) => count(country && country.eras) >= 6,
  }),
  Object.freeze({
    value: 'points90',
    label: 'Au moins 90 points vérifiés',
    test: (country) => count(country && country.points) >= 90,
  }),
]);

/* État de lecture, conservé entre les rendus (la coque reconstruit le DOM) ;
   aucun nœud DOM n'est mémorisé. */
const local = { query: '', filter: 'all' };
let catalog = [];

function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

function domainStart(country) {
  const domain = country && country.domain;
  return Array.isArray(domain) && domain.length ? Number(domain[0]) : NaN;
}

/* Repli accent/casse, appliqué au champ et à l'index. « Égypte »,
   « egypte » et « EG » désignent la même entrée. */
function fold(value) {
  return String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/* L'index ne contient que des champs présents dans dataset.js :
   name, code, id, noms d'ères et titres de repères. Aucun texte rédigé. */
function searchText(country) {
  if (!country) return '';
  const eras = Array.isArray(country.eras) ? country.eras.map((era) => era && era.name) : [];
  const events = Array.isArray(country.events) ? country.events.map((event) => event && event.title) : [];
  return fold([country.name, country.code, country.id, ...eras, ...events]
    .filter(Boolean).join(' '));
}

/* Recherche (ET entre termes) et filtre structurel. */
function matches(country, query, filterValue) {
  const rule = FILTERS.find((item) => item.value === filterValue) || FILTERS[0];
  if (!rule.test(country)) return false;
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = searchText(country);
  return terms.every((term) => text.includes(term));
}

function buildToolbar(ctx) {
  const bar = ctx.el('div', 'm27-toolbar');
  bar.id = BAR_ID;
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Rechercher et filtrer les pays documentés');

  const searchField = ctx.el('div', 'm27-field');
  const searchLabel = ctx.el('label', 'm27-label', 'Rechercher un pays');
  searchLabel.htmlFor = SEARCH_ID;
  const search = ctx.el('input', 'm27-input');
  search.type = 'search';
  search.id = SEARCH_ID;
  search.dataset.fk = 'm27-search';
  search.placeholder = 'Nom, code, ère ou repère (ex. FR)';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.setAttribute('aria-controls', 'globe-choices');
  search.setAttribute('aria-describedby', HELP_ID);
  searchField.append(searchLabel, search);

  const filterField = ctx.el('div', 'm27-field');
  const filterLabel = ctx.el('label', 'm27-label', 'Filtrer les pays');
  filterLabel.htmlFor = FILTER_ID;
  const select = ctx.el('select', 'm27-input');
  select.id = FILTER_ID;
  select.dataset.fk = 'm27-filter';
  select.setAttribute('aria-controls', 'globe-choices');
  FILTERS.forEach((rule) => {
    const option = ctx.el('option', '', rule.label);
    option.value = rule.value;
    select.appendChild(option);
  });
  filterField.append(filterLabel, select);

  /* <input type="reset"> : vrai bouton pour l'accessibilité et le clavier,
     mais absent du sélecteur .globe-list button (contrat E2E préservé). */
  const resetButton = ctx.el('input', 'm27-reset');
  resetButton.type = 'reset';
  resetButton.id = RESET_ID;
  resetButton.value = 'Réinitialiser';
  resetButton.disabled = true;

  const help = ctx.el('p', 'm27-help',
    'Recherche insensible aux accents et à la casse : nom, code, ère ou repère. Plusieurs mots : tous doivent correspondre. Flèche bas : premier résultat · flèche haut : dernier · Échap : tout effacer.');
  help.id = HELP_ID;

  const status = ctx.el('p', 'm27-status');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const empty = ctx.el('p', 'm27-empty',
    'Aucun pays ne correspond aux critères actuels. Modifiez la recherche ou choisissez « Tous les pays ».');
  empty.id = EMPTY_ID;
  empty.hidden = true;

  bar.append(searchField, filterField, resetButton, status, help, empty);
  return bar;
}

/* Le statut visible est la seule région live ajoutée par la lentille.
   Les compteurs sont recalculés à chaque appel depuis les <li> réellement
   affichés et depuis ctx.countries ; aucun nombre n'est codé en dur. */
function apply() {
  const choices = document.getElementById('globe-choices');
  const search = document.getElementById(SEARCH_ID);
  const select = document.getElementById(FILTER_ID);
  const resetButton = document.getElementById(RESET_ID);
  const status = document.getElementById(STATUS_ID);
  const empty = document.getElementById(EMPTY_ID);
  if (!choices || !search || !select || !status || !empty) return;

  local.query = search.value;
  local.filter = select.value;

  let shown = 0;
  const matched = [];
  Array.from(choices.children).forEach((li) => {
    if (!li || li.nodeType !== 1) return;
    const button = li.querySelector('.globe-country'); /* lecture seule */
    const index = button ? Number(button.dataset.index) : NaN;
    const country = Number.isInteger(index) ? catalog[index] : null;
    const visible = country ? matches(country, local.query, local.filter) : true;
    li.hidden = !visible; /* seul l'attribut du <li> change */
    if (visible) {
      shown += 1;
      if (country && country.name) matched.push(country.name);
    }
  });

  const rule = FILTERS.find((item) => item.value === local.filter) || FILTERS[0];
  const query = local.query.trim();
  const filtered = Boolean(query) || local.filter !== 'all';
  const total = catalog.length || shown;
  const parts = [`${shown} pays affiché${shown > 1 ? 's' : ''} sur ${total}`];
  if (query) parts.push(`recherche « ${query} »`);
  if (local.filter !== 'all') parts.push(`filtre : ${rule.label}`);
  if (!filtered) parts.push('vue complète');
  /* Résultats nommés quand la sélection est courte : compréhensible à l'oral
     comme à l'écrit, sans lire les cartes une par une. */
  if (filtered && shown > 0 && shown <= 5) parts.push(matched.join(', '));
  status.textContent = parts.join(' · ');

  if (shown === 0) {
    const criteria = [];
    if (query) criteria.push(`à la recherche « ${query} »`);
    if (local.filter !== 'all') criteria.push(`au filtre « ${rule.label} »`);
    const suffix = criteria.length ? ` ${criteria.join(' et ')}` : ' aux critères actuels';
    empty.textContent = `Aucun pays ne correspond${suffix}. `
      + 'Modifiez la recherche, choisissez « Tous les pays » ou réinitialisez les critères.';
  }
  empty.hidden = shown !== 0;
  if (resetButton) resetButton.disabled = !filtered;

  const active = document.activeElement;
  if (active && choices.contains(active) && active.closest('li[hidden]')) {
    search.focus({ preventScroll: true });
  }
}

function reset() {
  local.query = '';
  local.filter = 'all';
  const search = document.getElementById(SEARCH_ID);
  const select = document.getElementById(FILTER_ID);
  if (search) search.value = '';
  if (select) select.value = 'all';
  apply();
}

/* Le routeur global (keyboard.js:59) ignore les éléments INPUT et SELECT :
   aucun écouteur documentaire, aucun stopPropagation, aucun bouton ajouté
   à .globe-list. */
function onSearchKey(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    reset();
    const search = document.getElementById(SEARCH_ID);
    if (search) search.focus({ preventScroll: true });
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const choices = document.getElementById('globe-choices');
  if (!choices) return;
  const buttons = Array.from(choices.querySelectorAll('li:not([hidden]) .globe-country'));
  if (!buttons.length) return;
  event.preventDefault();
  const target = event.key === 'ArrowDown' ? buttons[0] : buttons[buttons.length - 1];
  target.focus({ preventScroll: true }); /* focus seul : aucun attribut modifié */
}

function wire() {
  const search = document.getElementById(SEARCH_ID);
  const select = document.getElementById(FILTER_ID);
  const resetButton = document.getElementById(RESET_ID);
  if (search) {
    search.addEventListener('input', () => {
      local.query = search.value;
      apply();
    });
    search.addEventListener('keydown', onSearchKey);
  }
  if (select) {
    select.addEventListener('change', () => {
      local.filter = select.value;
      apply();
    });
    select.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      reset();
      select.focus({ preventScroll: true });
    });
  }
  if (resetButton) {
    resetButton.addEventListener('click', (event) => {
      event.preventDefault();
      reset();
      if (search) search.focus({ preventScroll: true });
    });
  }
}

register('M27', (ctx) => {
  if (!ctx || !ctx.el) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const choices = document.getElementById('globe-choices');
  if (!choices) return; /* le globe n'est pas rendu : la lentille est inactive */
  catalog = Array.isArray(ctx.countries) ? ctx.countries : [];

  const list = choices.parentElement;
  if (!list) return;

  /* Garde d'existence sur un ID unique : la coque reconstruit le DOM à chaque
     rendu (shell.js:533), donc la barre est recréée avec lui. Elle reste un
     enfant de .globe-list : hors de la grille .globe-view et hors du marquage
     diagnostics (registry.js:71-82). */
  if (!document.getElementById(BAR_ID)) {
    list.insertBefore(buildToolbar(ctx), choices);
    wire();
  }

  const search = document.getElementById(SEARCH_ID);
  const select = document.getElementById(FILTER_ID);
  if (search) search.value = local.query;
  if (select) select.value = local.filter;
  apply();

  /* Le survol clavier du globe peut désigner un pays masqué par le filtre.
     On réinitialise alors les critères pour que l'annonce live et la liste
     restent cohérentes. Les rappels sont purgés à chaque rendu par
     registry.js:48-50 : on les enregistre donc à chaque application. */
  if (typeof ctx.onHover === 'function') {
    ctx.onHover(({ country } = {}) => {
      if (!country) return;
      const searchNode = document.getElementById(SEARCH_ID);
      const selectNode = document.getElementById(FILTER_ID);
      if (!searchNode || !selectNode) return;
      if (matches(country, searchNode.value, selectNode.value)) return;
      reset();
    });
  }
});
