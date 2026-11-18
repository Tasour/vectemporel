import { register } from './registry.js';

/* Lentille E043 — Accessibilité & ARIA : aria-pressed réservé aux bascules
 * indépendantes, choix unique = radiogroup (domaine E : accessibilité).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E043.md — chantiers E043-01 à E043-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et les autres lentilles ne sont ni édités ni doublés : la lentille
 * ajoute des attributs ARIA, un radiogroupe de repli et une note statique, et
 * s'appuie sur le DOM déjà produit par la vue.
 *
 * Règle exploitée : `aria-pressed` ne qualifie qu'une bascule indépendante
 * (bouton dont l'état « enfoncé / non enfoncé » est autonome). Dès qu'un ensemble
 * de contrôles représente UN choix parmi plusieurs, la sémantique correcte est
 * `radiogroup` + `radio` + `aria-checked` (ou un `<select>` natif). Aucun contrôle
 * de cette vue n'est une bascule indépendante : le greffon n'introduit donc
 * AUCUN `aria-pressed`, il corrige les détournements et expose le choix d'ère
 * sous forme de radiogroupe.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : l'accessibilité reste
 * correcte même avec un ctx minimal.
 *
 * Invariants : un seul CSS, un seul radiogroupe, une seule note, zéro écouteur
 * global, zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro console.*, aucun
 * innerHTML, aucune suppression d'écouteur ou d'attribut existant autre qu'un
 * aria-pressed détourné.
 */

const CSS_ID = 'points-e043';
const SCOPE = 'points-e043';
const NOTE_ID = 'points-e043-note';
const GROUP_ID = 'points-e043-era-group';
const REDUCED_ATTR = 'data-e043-reduced';
const NOTE_REF = 'points-e043-filter-note';

/* Sélecteurs des contrôles qui ne sont JAMAIS des bascules indépendantes :
 * - .points-era / .points-cell : choix unique (ère, domaine) ;
 * - .points-filters select : choix unique natif ;
 * - .points-filters button : action de réinitialisation ;
 * - .points-nav button : actions précédent / suivant.
 * Un aria-pressed trouvé ici est un détournement à normaliser. */
const SINGLE_OR_ACTION = [
  '.points-era',
  '.points-cell',
  '.points-filters select',
  '.points-filters button',
  '.points-nav button',
];

const CSS = `
/* E043-09 : portée unique, préfixée .points-e043 — aucune fuite hors de la vue. */
.points-e043 .points-e043-era-bar {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  margin: 0 0 10px; padding: 0;
}
.points-e043 .points-e043-radio {
  min-height: 36px; min-width: 36px; padding: 6px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: #0b0f15; color: var(--ink-soft);
  font: inherit; font-size: 12px; cursor: pointer;
}
.points-e043 .points-e043-radio:hover { border-color: var(--gold); }
/* E043-05 : l'état coché est porté par aria-checked, jamais par la seule couleur. */
.points-e043 .points-e043-radio[aria-checked="true"] {
  border: 2px solid var(--gold-bright);
  color: var(--gold-bright); font-weight: 600;
}
.points-e043 .points-e043-radio[aria-checked="true"]::before {
  content: '\\2713\\00a0';
}
.points-e043 .points-e043-radio:focus-visible,
.points-e043 .points-filters button:focus-visible,
.points-e043 .points-nav button:focus-visible,
.points-e043 .points-filters select:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
/* E043-06 : transition courte neutralisée sous mouvement réduit (couplage JS + CSS). */
.points-e043 .points-e043-radio { transition: border-color .16s linear, color .16s linear; }
.points-e043[` + REDUCED_ATTR + `="1"] .points-e043-radio { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e043 .points-e043-radio { transition: none; }
}
/* E043-09 : note de lecture, statique et hors région live. */
.points-e043-note {
  margin: 0 0 10px; color: var(--muted-2); font-size: 10px; line-height: 1.45;
}
/* E043-08 : l'ère courante est repérée par aria-current, pas par une bascule. */
.points-e043 .points-era[aria-current="true"] { font-weight: 600; }
@media (max-width: 620px) {
  .points-e043 .points-e043-radio { min-height: 44px; }
}
@media (forced-colors: active) {
  .points-e043 .points-e043-radio[aria-checked="true"] { border-color: Highlight; outline: 1px solid Highlight; }
}
`;

/* E043-02 : classifie les contrôles réels de la vue. Aucun n'est une bascule
 * indépendante : le résultat est documenté dans data-e043-kind pour audit. */
function classifyControls(layout) {
  const groups = {
    'single-choice': ['.points-era', '.points-cell', '.points-filters select'],
    action: ['.points-filters button', '.points-nav button'],
  };
  Object.keys(groups).forEach((kind) => {
    groups[kind].forEach((selector) => {
      layout.querySelectorAll(selector).forEach((node) => {
        node.dataset.e043Kind = kind;
        node.dataset.e043Aria = kind === 'single-choice' ? 'radiogroup-or-native' : 'action';
      });
    });
  });
  return groups;
}

/* E043-03 : normalisation non destructive — retire UNIQUEMENT un aria-pressed
 * détourné d'un contrôle à choix unique ou d'une action. Idempotent : sans
 * attribut, l'opération est un no-op. Les écouteurs et les autres attributs
 * ne sont jamais touchés. */
function normalizePressed(layout) {
  let corrected = 0;
  SINGLE_OR_ACTION.forEach((selector) => {
    layout.querySelectorAll(selector).forEach((node) => {
      if (node.hasAttribute('aria-pressed')) {
        node.removeAttribute('aria-pressed');
        corrected += 1;
      }
    });
  });
  layout.dataset.e043Corrected = String(corrected);
  return corrected;
}

/* E043-07 : les <select> restent des choix uniques natifs. On préserve leur
 * aria-label existant, on n'ajoute aucun aria-pressed, et on rattache (sans
 * écraser une valeur existante) la note statique via aria-describedby. */
function labelSelects(layout) {
  const selects = [...layout.querySelectorAll('.points-filters select')];
  selects.forEach((select) => {
    if (!select.getAttribute('aria-label')) {
      select.setAttribute('aria-label', 'Choix unique');
    }
    select.dataset.e043NativeSingle = '1';
    const described = select.getAttribute('aria-describedby');
    if (!described || !described.split(/\s+/).includes(NOTE_REF)) {
      select.setAttribute('aria-describedby', described ? `${described} ${NOTE_REF}` : NOTE_REF);
    }
  });
  return selects.length;
}

/* E043-08 : les boutons d'action (nav, reset, cellules, ère source) ne portent
 * ni aria-pressed ni role=radio. Un nom accessible est ajouté seulement s'il
 * manque ; l'ère active est marquée par aria-current. */
function markActions(layout) {
  const actions = [...layout.querySelectorAll('.points-nav button'), ...layout.querySelectorAll('.points-filters button')];
  actions.forEach((button) => {
    button.dataset.e043Action = '1';
    if (!button.getAttribute('aria-label') && !(button.textContent || '').trim()) {
      button.setAttribute('aria-label', 'Action');
    }
  });
  return actions.length;
}

/* E043-09 : une seule note de lecture par rendu, hors région live, sans
 * innerHTML. Garde anti-doublon + retrait d'un nœud périmé détaché. */
function buildNote(layout) {
  let note = layout.querySelector('#' + NOTE_ID);
  const stale = document.getElementById(NOTE_ID);
  if (stale && stale !== note) stale.remove();

  if (!note) {
    note = document.createElement('p');
    note.className = 'points-e043-note';
    note.id = NOTE_ID;
    note.textContent = 'Choix unique : « Choisir une ère » est un radiogroupe, ' +
      'parcourez-le avec les flèches. Les filtres domaine et famille sont des ' +
      'choix uniques natifs. Les boutons de navigation et de réinitialisation ' +
      'sont des actions : aucun ne porte d’état aria-pressed.';
    note.setAttribute('data-e043-note', '1');
    const noteRef = document.createElement('span');
    noteRef.id = NOTE_REF;
    noteRef.className = 'points-e043-note-ref';
    noteRef.textContent = '';
    note.appendChild(noteRef);
    const matrix = layout.querySelector('.points-matrix');
    if (matrix) {
      const title = matrix.querySelector('.points-title');
      if (title && title.nextSibling) matrix.insertBefore(note, title.nextSibling);
      else matrix.appendChild(note);
    }
  }
  return note;
}

/* E043-04 : construction du radiogroupe de repli. Chaque radio délègue son
 * activation au bouton .points-era réel (source de vérité), sans dupliquer la
 * logique de sélection ni toucher à ses écouteurs. Idempotent par GROUP_ID. */
function buildEraGroup(layout, el) {
  const eraButtons = [...layout.querySelectorAll('.points-era')];
  if (!eraButtons.length) return null;

  let group = layout.querySelector('#' + GROUP_ID);
  const stale = document.getElementById(GROUP_ID);
  if (stale && stale !== group) stale.remove();

  if (!group) {
    group = el('div', 'points-e043-era-bar');
    group.id = GROUP_ID;
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Choisir une ère');

    const pairs = [];
    eraButtons.forEach((source, index) => {
      const radio = el('button', 'points-e043-radio', (source.textContent || '').trim());
      radio.type = 'button';
      radio.id = 'points-e043-era-radio-' + index;
      radio.setAttribute('role', 'radio');
      radio.setAttribute('aria-checked', 'false');
      radio.tabIndex = -1;
      radio.dataset.e043Era = String(index);
      radio.addEventListener('click', () => {
        /* Le clic radio reproduit l'activation du vrai bouton : selectEra →
         * set → emit → rendu neuf, puis E043 se réinstalle et resynchronise. */
        source.click();
        group.querySelectorAll('[role="radio"]').forEach((r) => {
          r.setAttribute('aria-checked', r === radio ? 'true' : 'false');
          r.tabIndex = r === radio ? 0 : -1;
        });
      });
      group.appendChild(radio);
      pairs.push({ radio, source });
    });
    group._e043Pairs = pairs;

    /* E043-06 : navigation clavier ARIA — flèches + Home/End, roving tabindex. */
    group.addEventListener('keydown', (event) => {
      const radios = [...group.querySelectorAll('[role="radio"]')];
      if (!radios.length) return;
      const current = radios.indexOf(document.activeElement);
      let target = -1;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown': target = current < 0 ? 0 : (current + 1) % radios.length; break;
        case 'ArrowLeft':
        case 'ArrowUp': target = current < 0 ? 0 : (current - 1 + radios.length) % radios.length; break;
        case 'Home': target = 0; break;
        case 'End': target = radios.length - 1; break;
        default: return;
      }
      event.preventDefault();
      if (target >= 0) {
        radios[target].focus();
        radios[target].click();
      }
    });

    const matrix = layout.querySelector('.points-matrix');
    const grid = layout.querySelector('.points-grid');
    if (matrix && grid && group.parentElement !== matrix) matrix.insertBefore(group, grid);
    else if (matrix && !grid && group.parentElement !== matrix) matrix.appendChild(group);
  }
  return group;
}

/* E043-05 : aria-checked et aria-current sont dérivés du DOM réel (ligne
 * .is-active), jamais d'un état supposé. Un seul radio porte le tabindex 0. */
function syncChecked(layout, group) {
  if (!group || !Array.isArray(group._e043Pairs)) return;
  let checkedIndex = -1;
  group._e043Pairs.forEach((pair, index) => {
    const active = pair.source.closest('.points-grid-row')
      && pair.source.closest('.points-grid-row').classList.contains('is-active');
    if (active) checkedIndex = index;
    if (active) pair.source.setAttribute('aria-current', 'true');
    else pair.source.removeAttribute('aria-current');
  });
  if (checkedIndex < 0) checkedIndex = 0;
  group._e043Pairs.forEach((pair, index) => {
    const checked = index === checkedIndex;
    pair.radio.setAttribute('aria-checked', checked ? 'true' : 'false');
    pair.radio.tabIndex = checked ? 0 : -1;
  });
  group.dataset.e043Checked = String(checkedIndex);
}

register('E043', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E043-01 : injection CSS unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e043 = '1';

  /* E043-02 : recenser puis E043-03 normaliser les détournements. */
  classifyControls(layout);
  normalizePressed(layout);

  /* E043-07 / E043-08 / E043-09 : sémantique des contrôles non-radio + note. */
  labelSelects(layout);
  markActions(layout);
  buildNote(layout);

  /* E043-04 / E043-05 / E043-06 : radiogroupe, synchronisation, clavier. */
  const group = buildEraGroup(layout, el);
  syncChecked(layout, group);

  /* E043-10 : couplage mouvement réduit, en plus de la media query CSS. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }
});
