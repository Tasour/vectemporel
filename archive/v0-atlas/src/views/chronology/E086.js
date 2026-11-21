import { register } from './registry.js';

/* Lentille CHRONOLOGIE E086 — Filtrage par type d'événement et catégories multiples.
 *
 * Dix chantiers E086-01..E086-10, tous implémentés ici. Un seul register('E086').
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css.
 *
 * La vue de base (chronology.js:16) ne connaît qu'un filtre de recherche
 * (`local.query`) et un filtre de thème UNIQUE (`local.tag`, :333-341) : un
 * seul thème à la fois, combiné en OU avec la recherche, sans notion de type
 * d'événement. Cette lentille ajoute, SANS toucher au store ni à chronology.js,
 * une barre de filtrage complémentaire qui agit directement sur les cartes déjà
 * présentes dans #atlas-chrono-events (chronology.js:348-349) :
 *   - un choix unique de « type d'événement » dérivé de data-importance (:382) ;
 *   - une sélection MULTIPLE de catégories dérivée de data-tags (:383) ;
 *   - un mode d'union (OU) / intersection (ET) entre catégories.
 *
 * Zéro appel réseau, zéro générateur aléatoire, zéro instrumentation de
 * console, aucune boucle rAF propre, aucun timer. Toutes les données viennent
 * des attributs réels du DOM. L'état
 * vit dans ce module (comme `local` dans chronology.js:16) et est réaffirmé à
 * chaque rendu ; tous les identifiants sont préfixés `e086` et protégés par
 * des gardes d'existence (re-render safe).
 */

const CSS_ID = 'chronology-e086';
const SCOPE = 'chronology-e086';
const BAR_ID = 'e086-bar';
const TYPE_PREFIX = 'e086-type-';
const CAT_PREFIX = 'e086-cat-';
const MODE_ID = 'e086-mode';
const RESET_ID = 'e086-reset';
const READOUT_ID = 'e086-readout';
const EMPTY_ID = 'e086-empty';

/* Types d'événement : la vue n'expose pas de champ « type » explicite
   (chronology.js:379-383). L'importance (poids 1/2/3, :382) est le seul
   attribut discret réel ; il est utilisé comme proxy documenté, jamais
  inventé. */
const TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: '3', label: 'Majeur (3)' },
  { value: '2', label: 'Notable (2)' },
  { value: '1', label: 'Mineur (1)' },
];

/* État persistant entre deux reconstructions complètes du DOM opérées par la
   coque (shell.js:137), exactement comme `local.query` survit dans
   chronology.js:16. */
let selectedType = 'all';
let selectedCats = new Set();
let unionMode = true;

const CSS = `
.chronology-e086 .e086-bar{margin:0 0 12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
.chronology-e086 .e086-title{margin:0 0 8px;color:var(--gold);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.chronology-e086 .e086-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 8px}
.chronology-e086 .e086-row:last-of-type{margin-bottom:0}
.chronology-e086 .e086-legend{margin:0 6px 0 0;color:var(--muted);font-size:9px}
.chronology-e086 .e086-group{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0;padding:0;border:0;min-width:0}
.chronology-e086 .e086-chip{position:relative;display:inline-flex;align-items:center;min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear}
.chronology-e086 .e086-chip:hover{border-color:var(--gold)}
.chronology-e086 .e086-chip:focus-within,.chronology-e086 .e086-chip:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e086 .e086-chip input{position:absolute;width:1px;height:1px;margin:0;opacity:0}
.chronology-e086 .e086-chip.is-checked,
.chronology-e086 .e086-chip[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.chronology-e086 .e086-btn{min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink-soft);font:inherit;font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear}
.chronology-e086 .e086-btn[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.chronology-e086 .e086-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e086 .e086-readout{margin:8px 0 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.chronology-e086 .e086-empty{margin:8px 0 0;padding:8px 10px;border:1px dashed var(--line);border-radius:8px;color:var(--gold-bright);font-size:10px;line-height:1.5}
.chronology-e086 .e086-empty[hidden],
.chronology-e086 .atlas-chrono-events>li[hidden]{display:none!important}
.chronology-e086[data-e086-reduced="1"] .e086-chip,
.chronology-e086[data-e086-reduced="1"] .e086-btn{transition:none}
@media (max-width:620px){
  .chronology-e086 .e086-row{flex-direction:column;align-items:flex-start}
  .chronology-e086 .e086-chip,.chronology-e086 .e086-btn{min-height:36px}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e086 .e086-chip,.chronology-e086 .e086-btn{transition:none}
}`;

function typeLabel(value) {
  const found = TYPES.find((item) => item.value === value);
  return found ? found.label : 'Tous les types';
}

/* E086-02 / E086-03 : les catégories et les types sont lus sur les cartes
   réelles (chronology.js:379-383), jamais déduits d'une source externe. */
function gatherCategories(list) {
  const found = new Set();
  if (!list || !list.children) return found;
  Array.from(list.children).forEach((li) => {
    if (!li || !li.dataset || !li.dataset.tags) return;
    li.dataset.tags.split(/\s+/).filter(Boolean).forEach((tag) => found.add(tag));
  });
  return found;
}

function eventTags(li) {
  const raw = li && li.dataset && li.dataset.tags;
  return raw ? raw.split(/\s+/).filter(Boolean) : [];
}

/* E086-04 / E086-05 : prédicat de filtrage. Le type est un choix unique ; les
   catégories se combinent en union (OU) ou intersection (ET). Un résultat doit
   satisfaire les DEUX dimensions. */
function passes(li) {
  if (!li || !li.dataset || !li.dataset.eventId) return false;
  if (selectedType !== 'all' && li.dataset.importance !== selectedType) return false;
  if (selectedCats.size === 0) return true;
  const tags = eventTags(li);
  const wanted = Array.from(selectedCats);
  return unionMode
    ? wanted.some((cat) => tags.includes(cat))
    : wanted.every((cat) => tags.includes(cat));
}

/* E086-08 : garde d'existence. Le noeud est recherché dans `main` (et non via
   document.getElementById) pour ne jamais récupérer un noeud détaché d'un
   rendu précédent. Un second passage de runEnhancements sur le même DOM ne
   crée aucun doublon. */
function ensureBar(main, list, el, categories, onChange) {
  const existing = main.querySelector(`#${BAR_ID}`);
  if (existing) return existing;

  const bar = el('section', 'e086-bar');
  bar.id = BAR_ID;
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filtres E086 — type d’événement et catégories multiples');
  bar.appendChild(el('p', 'e086-title', 'Filtrer les repères'));

  /* E086-03 : choix unique → radios natifs dans un radiogroup (aria-pressed
     est réservé aux bascules indépendantes, voir E086-04). */
  const typeRow = el('div', 'e086-row');
  const typeGroup = el('div', 'e086-group');
  typeGroup.setAttribute('role', 'radiogroup');
  typeGroup.setAttribute('aria-label', 'Type d’événement');
  typeRow.appendChild(el('span', 'e086-legend', 'Type'));
  TYPES.forEach((type) => {
    const chip = el('label', 'e086-chip');
    const input = el('input');
    input.type = 'radio';
    input.name = 'e086-type';
    input.value = type.value;
    input.id = `${TYPE_PREFIX}${type.value}`;
    input.checked = selectedType === type.value;
    input.setAttribute('aria-controls', 'atlas-chrono-events');
    chip.appendChild(input);
    chip.appendChild(el('span', '', type.label));
    chip.classList.toggle('is-checked', input.checked);
    input.addEventListener('change', () => {
      if (!input.checked) return;
      selectedType = type.value;
      onChange();
    });
    typeGroup.appendChild(chip);
  });
  typeRow.appendChild(typeGroup);
  bar.appendChild(typeRow);

  /* E086-02 : catégories multiples → bascules indépendantes (aria-pressed).
     La puce « Toutes » réinitialise la sélection de catégories. */
  const catRow = el('div', 'e086-row');
  const catGroup = el('div', 'e086-group');
  catGroup.setAttribute('role', 'group');
  catGroup.setAttribute('aria-label', 'Catégories — sélection multiple');
  catRow.appendChild(el('span', 'e086-legend', 'Catégories'));
  const ordered = Array.from(categories).sort((a, b) => a.localeCompare(b, 'fr'));
  const allChip = el('button', 'e086-chip', 'Toutes les catégories');
  allChip.type = 'button';
  allChip.id = `${CAT_PREFIX}all`;
  allChip.dataset.e086Cat = '';
  allChip.setAttribute('aria-controls', 'atlas-chrono-events');
  allChip.addEventListener('click', () => {
    selectedCats.clear();
    onChange();
  });
  catGroup.appendChild(allChip);
  ordered.forEach((tag, index) => {
    const chip = el('button', 'e086-chip', tag);
    chip.type = 'button';
    chip.id = `${CAT_PREFIX}${index}`;
    chip.dataset.e086Cat = tag;
    chip.setAttribute('aria-controls', 'atlas-chrono-events');
    chip.addEventListener('click', () => {
      if (selectedCats.has(tag)) selectedCats.delete(tag);
      else selectedCats.add(tag);
      onChange();
    });
    catGroup.appendChild(chip);
  });
  catRow.appendChild(catGroup);
  bar.appendChild(catRow);

  /* E086-04 : bascule d'indépendance OU / ET. aria-pressed = true signifie
     « intersection (ET) active ». */
  const modeRow = el('div', 'e086-row');
  const mode = el('button', 'e086-btn', 'Mode ET (intersection)');
  mode.type = 'button';
  mode.id = MODE_ID;
  mode.setAttribute('aria-pressed', unionMode ? 'false' : 'true');
  mode.setAttribute('aria-controls', 'atlas-chrono-events');
  mode.addEventListener('click', () => {
    unionMode = !unionMode;
    onChange();
  });
  const reset = el('button', 'e086-btn', 'Réinitialiser les filtres');
  reset.type = 'button';
  reset.id = RESET_ID;
  reset.setAttribute('aria-controls', 'atlas-chrono-events');
  reset.addEventListener('click', () => {
    selectedType = 'all';
    selectedCats.clear();
    unionMode = true;
    onChange();
  });
  modeRow.append(mode, reset);
  bar.appendChild(modeRow);

  /* E086-06 : readout visible et annonçable. E086-07 : état vide distinct. */
  const readout = el('p', 'e086-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  bar.appendChild(readout);

  const empty = el('p', 'e086-empty');
  empty.id = EMPTY_ID;
  empty.hidden = true;
  bar.appendChild(empty);

  if (list && list.parentNode) list.parentNode.insertBefore(bar, list);
  else main.appendChild(bar);
  return bar;
}

register('E086', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (!layout || typeof layout.querySelector !== 'function') return;

  /* E086-01 / E086-10 : un seul bloc CSS, injecté une fois par le registre. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e086 = '1';
  layout.dataset.e086Reduced = typeof reducedMotion === 'function' && reducedMotion() ? '1' : '0';

  const main = layout.querySelector('.chronology-main') || layout;
  const list = layout.querySelector('#atlas-chrono-events');
  const categories = gatherCategories(list);

  /* E086-08 : un pays différent peut proposer d'autres thèmes ; on retire de
     la sélection mémorisée ceux qui n'existent plus, sans écraser le store. */
  Array.from(selectedCats).forEach((tag) => {
    if (!categories.has(tag)) selectedCats.delete(tag);
  });

  /* E086-05 / E086-06 : application et synchronisation. Tout est requêté à
     neuf dans `layout` pour rester juste après un re-render et après chaque
     interaction (les clics locaux ne déclenchent pas de rendu de la coque). */
  function apply() {
    layout.querySelectorAll('input[name="e086-type"]').forEach((input) => {
      input.checked = input.value === selectedType;
      const chip = input.parentNode;
      if (chip && chip.classList) chip.classList.toggle('is-checked', input.checked);
    });

    layout.querySelectorAll('[data-e086-cat]').forEach((chip) => {
      const tag = chip.dataset.e086Cat;
      const pressed = tag === '' ? selectedCats.size === 0 : selectedCats.has(tag);
      chip.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    });

    const mode = layout.querySelector(`#${MODE_ID}`);
    if (mode) {
      mode.setAttribute('aria-pressed', unionMode ? 'false' : 'true');
      mode.title = unionMode
        ? 'Union : un repère suffit qu’il porte au moins une catégorie choisie'
        : 'Intersection : un repère doit porter toutes les catégories choisies';
    }

    const cards = list
      ? Array.from(list.children).filter((li) => li && li.dataset && li.dataset.eventId)
      : [];
    let matched = 0;
    cards.forEach((li) => {
      const ok = passes(li);
      li.hidden = !ok;
      li.dataset.e086Hidden = ok ? '0' : '1';
      if (ok) matched += 1;
    });
    const total = cards.length;

    const readout = layout.querySelector(`#${READOUT_ID}`);
    if (readout) {
      readout.textContent = `${matched} / ${total} repères affichés · Type : ${typeLabel(selectedType)}`
        + ` · Catégories : ${selectedCats.size ? Array.from(selectedCats).join(', ') : 'aucune'}`
        + ` · Mode : ${unionMode ? 'OU (union)' : 'ET (intersection)'}.`;
    }

    const empty = layout.querySelector(`#${EMPTY_ID}`);
    if (empty) {
      const show = total > 0 && matched === 0;
      empty.hidden = !show;
      if (show) {
        empty.textContent = 'Aucun repère ne correspond à cette combinaison de type et de catégories.';
      }
    }

    /* Miroir d'état auditable, sans console ni couleur porteuse d'information. */
    layout.dataset.e086Type = selectedType;
    layout.dataset.e086Cats = Array.from(selectedCats).join(' ');
    layout.dataset.e086Mode = unionMode ? 'ou' : 'et';
    layout.dataset.e086Total = String(total);
    layout.dataset.e086Matched = String(matched);
  }

  ensureBar(main, list, el, categories, apply);
  apply();
});
