import { register } from './registry.js';

/* Lentille E020 (passe V2, domaine B — Filtres & périmètre) : ÉQUIVALENT
 * CLAVIER POUR CHAQUE FILTRE de la vue Chronologie.
 *
 * Périmètre : les contrôles de filtre créés par chronology.js — le champ
 * #atlas-chrono-search (`:313-327`), les puces .atlas-chrono-tag de la barre
 * d'outils (`:329-344`) et de la fiche (`:443-459`), ainsi que le bouton de
 * réinitialisation de l'état vide (`:361-372`). Le registre V2 fournit
 * ctx = { viewId:'chronologyv2', stage, layout } et les helpers css/el/
 * reducedMotion (registry.js:28-44) ; il n'expose pas say().
 *
 * Dix chantiers, tous implémentés ici, sans empiéter sur les autres lentilles :
 *  E020-01 « / » focalise la recherche ; E020-02 « t », « [ », « ] » parcourent
 *  les puces ; E020-03 activation native documentée sur les puces de la barre ;
 *  E020-04 « a » retire le thème actif ; E020-05 « v » vide recherche + thème ;
 *  E020-06 bouton « Réinitialiser le filtre » annoté ; E020-07 puces de la fiche
 *  annotées ; E020-08 priorité du routeur préservée ; E020-09 légende non modale
 *  hors flux Tab ; E020-10 idempotence, mouvement réduit et contraste forcé.
 *
 * Invariants : un seul register, un seul ctx.css, un seul écouteur clavier
 * (document, phase bouillante, posé après celui du routeur en capture). Aucune
 * touche réservée par keyboard.js n'est réimplémentée : les raccourcis locaux
 * sont tous absents de sa map (keyboard.js:27-32, 127, 134-196). Aucun état du
 * store n'est modifié : les actions passent par .focus() / .click() / l'événement
 * input natif des contrôles existants, donc par leurs propres gestionnaires.
 * Zéro journalisation, zéro réseau, zéro aléa, zéro timer, aucun HTML brut.
 */

const CSS_ID = 'chronology-v2-e020';
const PANEL_ID = 'chronology-v2-e020-panel';
const TITLE_ID = 'chronology-v2-e020-title';
const LEGEND_ID = 'chronology-v2-e020-legend';
const STATUS_ID = 'chronology-v2-e020-status';
const COVERAGE_ID = 'chronology-v2-e020-coverage';
const HINT_ID = 'chronology-v2-e020-search-hint';
const MAIN_ID = 'atlas-chrono-main';
const TOOLS_ID = 'atlas-chrono-tools';
const ASIDE_ID = 'atlas-chrono-aside';
const SEARCH_ID = 'atlas-chrono-search';
const CHIP_SELECTOR = 'button.atlas-chrono-tag[data-tag]';
const EMPTY_RESET_SELECTOR = '#nav-c2a-empty-filter button';

/* E020-09 et E020-10 : une feuille unique, en flux normal en fin de colonne
 * gauche. Le panneau n'est ni modale ni superposé, il n'ajoute aucun arrêt Tab
 * (pas de tabindex) et ne masque ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e020-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
  }
  #${PANEL_ID} .e020-lede,
  #${PANEL_ID} .e020-note { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e020-legend { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e020-row { display: flex; gap: 8px; margin: 0 0 4px; }
  #${PANEL_ID} .e020-key {
    flex: 0 0 104px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 9px; text-align: center;
  }
  #${PANEL_ID} .e020-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e020-status { margin: 6px 0 0; color: var(--gold-bright); }
  #${PANEL_ID} .e020-coverage { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }
  #${HINT_ID} {
    flex: 1 1 100%; margin: 0; color: var(--muted-2);
    font-size: 9px; line-height: 1.4;
  }
  #${HINT_ID}[data-e020-active="1"] { color: var(--gold-bright); }
  @media (max-width: 620px) {
    #${PANEL_ID} .e020-key { flex-basis: 88px; }
    #${PANEL_ID} .e020-row { flex-wrap: wrap; gap: 2px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${HINT_ID} {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e020-title, #${PANEL_ID} .e020-key,
    #${PANEL_ID} .e020-status { color: CanvasText; }
  }
`;

/* E020-08 : touches déjà prises par le routeur (keyboard.js:127 pour les
 * modificateurs, :134-166 pour ?/Échap/1-6/c-m-r-g-s-p, :171-196 pour les
 * flèches et Entrée/Espace). Aucune de nos touches locales n'en fait partie. */
const RESERVED = new Set([
  '?', 'Escape', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  '1', '2', '3', '4', '5', '6', 'c', 'm', 'r', 'g', 's', 'p',
]);

const LOCAL_KEYS = ['/', 't', '[', ']', 'a', 'v'];

/* E020-01 à E020-07 : légende visible. Les touches natives (Tab, Entrée,
 * Espace) sont décrites, jamais réimplémentées. */
const LEGEND = [
  ['/', 'placer le focus dans le champ de recherche.'],
  ['t', 'placer le focus sur la première puce de thème de la barre d’outils.'],
  ['[ / ]', 'puce de thème précédente / suivante, avec retour en début de liste.'],
  ['Entrée / Espace', 'activer nativement la puce focalisée : équivalent clavier du clic.'],
  ['a', 'retirer le thème actif et revenir à « tous les thèmes ».'],
  ['v', 'vider la recherche et le thème, comme « Réinitialiser le filtre ».'],
  ['Tab / Maj+Tab', 'parcourir les contrôles sans quitter la vue.'],
];

let bound = false;
let last = 'aucun pour l’instant';
let refs = { panel: null, status: null, coverage: null, hint: null, stage: null, reduced: false };
const stats = { search: 0, chipFirst: 0, chipCycle: 0, tagClear: 0, reset: 0, activations: 0 };

/* E020-10 : garde d'existence pour toute ID préfixée chronology-v2-e020-. Un
 * nœud déjà présent est réutilisé et déplacé dans le parent courant : la coque
 * reconstruisant #app (shell.js:533), un nœud de la rendu précédente est détaché
 * et n'est plus retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function mark(label) {
  last = label;
  if (refs.panel && refs.panel.isConnected) refs.panel.dataset.e020Last = label;
}

function chipsIn(root) {
  return root ? Array.from(root.querySelectorAll(CHIP_SELECTOR)) : [];
}

function chipState() {
  const bar = chipsIn(document.getElementById(TOOLS_ID));
  const aside = chipsIn(document.getElementById(ASIDE_ID));
  return {
    bar,
    aside,
    pressed: bar.find((chip) => chip.getAttribute('aria-pressed') === 'true') || null,
  };
}

/* E020-03 et E020-07 : annotation non destructive des puces existantes. On ne
 * remplace jamais un aria-keyshortcuts déjà posé par une autre lentille. */
function annotate(chip, scope) {
  if (!chip.hasAttribute('aria-keyshortcuts')) chip.setAttribute('aria-keyshortcuts', 'Enter Space');
  chip.dataset.e020Scope = scope;
}

/* E020-01 à E020-10 : tout l'état observable est recalculé depuis le DOM réel,
 * en texte visible et en attributs data-, jamais dans une région live (E019 et
 * E041 gardent la propriété des annonces). */
function refresh() {
  const { panel, status, coverage, hint, reduced } = refs;
  if (!panel || !panel.isConnected) return;

  const { bar, aside, pressed } = chipState();
  bar.forEach((chip) => annotate(chip, 'barre'));
  aside.forEach((chip) => annotate(chip, 'fiche'));
  const totalChips = bar.length + aside.length;
  const annotated = [...bar, ...aside]
    .filter((chip) => chip.getAttribute('aria-keyshortcuts') === 'Enter Space').length;

  /* E020-06 : le bouton de l'état vide n'a pas d'ID dans la vue de base ; on
     l'atteint par son conteneur sémantique et on lui donne le même raccourci
     documenté que la touche « v ». */
  const emptyReset = document.querySelector(EMPTY_RESET_SELECTOR);
  if (emptyReset) {
    if (!emptyReset.hasAttribute('aria-keyshortcuts')) emptyReset.setAttribute('aria-keyshortcuts', 'v');
    emptyReset.dataset.e020Scope = 'etat-vide';
  }

  const conflicts = LOCAL_KEYS.filter((key) => RESERVED.has(key)).length;
  const search = document.getElementById(SEARCH_ID);
  const active = search && document.activeElement === search ? '1' : '0';
  if (hint && hint.dataset.e020Active !== active) hint.dataset.e020Active = active;

  write(status, `Dernier raccourci observé : ${last}.`);
  write(coverage, `Puces annotées : ${annotated}/${totalChips} (barre ${bar.length} · fiche ${aside.length}) · `
    + `thème actif : ${pressed ? pressed.textContent : 'aucun'} · conflit avec le routeur : ${conflicts} · `
    + `actions clavier : recherche ${stats.search}, puces ${stats.chipFirst + stats.chipCycle}, `
    + `retrait ${stats.tagClear}, vidage ${stats.reset} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e020Chips = String(totalChips);
  panel.dataset.e020Annotated = String(annotated);
  panel.dataset.e020Conflicts = String(conflicts);
  panel.dataset.e020Resets = String(stats.reset);
  panel.dataset.e020Reduced = reduced ? '1' : '0';
  if (hint) {
    write(hint, 'Raccourcis des filtres : « / » recherche · « t » première puce · « [ » / « ] » puces · « a » tous les thèmes · « v » vider. Tab et Maj+Tab restent disponibles.');
  }
}

/* E020-08 : unique écouteur, en phase bouillante : le routeur (capture,
 * keyboard.js:199) a donc toujours le premier mot. On s'efface dès qu'il a
 * consommé l'événement, qu'une modale est ouverte, qu'un champ est éditable,
 * que des modificateurs sont pressés ou que le focus est hors de la vue. */
function onKeyDown(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!refs.stage || !refs.stage.isConnected) return;
  if (document.querySelector('[aria-modal="true"], [role="dialog"]')) return;
  const target = event.target;
  if (target instanceof HTMLElement
      && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
  const focused = document.activeElement;
  if (focused && focused !== document.body && !refs.stage.contains(focused)) return;

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  /* E020-01 : le « / » ne figure dans aucune map du routeur. */
  if (key === '/') {
    const search = document.getElementById(SEARCH_ID);
    if (!search) return;
    event.preventDefault();
    search.focus();
    stats.search += 1;
    mark('recherche ( / )');
    refresh();
    return;
  }

  /* E020-02 : focus seulement ; l'activation reste native (E020-03). */
  if (key === 't' || key === '[' || key === ']') {
    const chips = chipsIn(document.getElementById(TOOLS_ID));
    if (!chips.length) return;
    event.preventDefault();
    let index = 0;
    if (key !== 't') {
      const current = focused instanceof Element ? chips.indexOf(focused) : -1;
      index = key === ']' ? (current + 1) % chips.length : (current <= 0 ? chips.length - 1 : current - 1);
      stats.chipCycle += 1;
    } else {
      stats.chipFirst += 1;
    }
    chips[index].focus();
    mark(key === 't' ? 'première puce ( t )' : (key === ']' ? 'puce suivante ( ] )' : 'puce précédente ( [ )'));
    refresh();
    return;
  }

  /* E020-04 : « a » désélectionne la puce pressée en laissant son gestionnaire
     de clic d'origine mettre à jour le filtre et restaurer le focus. */
  if (key === 'a') {
    const pressed = chipState().pressed;
    if (!pressed) return;
    event.preventDefault();
    pressed.click();
    stats.tagClear += 1;
    stats.activations += 1;
    mark('thème retiré ( a )');
    refresh();
    return;
  }

  /* E020-05 : « v » vide les deux filtres. Le DOM étant reconstruit entre les
     deux actions, chaque contrôle est relu après le rendu. */
  if (key === 'v') {
    const search = document.getElementById(SEARCH_ID);
    const pressed = chipState().pressed;
    const emptyReset = document.querySelector(EMPTY_RESET_SELECTOR);
    if ((!search || !search.value) && !pressed && !emptyReset) return;
    event.preventDefault();
    if (search && search.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const pressedAfter = chipState().pressed;
    if (pressedAfter) pressedAfter.click();
    else {
      const resetAfter = document.querySelector(EMPTY_RESET_SELECTOR);
      if (resetAfter) resetAfter.click();
    }
    stats.reset += 1;
    stats.activations += 1;
    mark('filtres vidés ( v )');
    refresh();
  }
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout || ctx.viewId !== 'chronologyv2') return;

  ctx.css(CSS_ID, CSS);

  const stage = ctx.stage || ctx.layout;
  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e020-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e020-title', 'Équivalents clavier des filtres');
  title.id = TITLE_ID;
  const lede = make('p', 'e020-lede', 'Chaque filtre de la vue a son équivalent clavier : les contrôles natifs restent la source de vérité, la légende ci-dessous les rend découvrables sans souris.');

  const legend = make('ul', 'e020-legend');
  legend.id = LEGEND_ID;
  LEGEND.forEach(([key, label]) => {
    const row = make('li', 'e020-row');
    row.append(make('kbd', 'e020-key', key), make('span', 'e020-label', label));
    legend.appendChild(row);
  });

  const note = make('p', 'e020-note', 'Le routeur garde la priorité : « ? », Échap, les flèches, Entrée, Espace, 1–6 et c/m/r/g/s/p ne sont pas détournés. Les raccourcis locaux s’effacent dans un champ de texte ou une modale.');
  const status = make('p', 'e020-status');
  status.id = STATUS_ID;
  const coverage = make('p', 'e020-coverage');
  coverage.id = COVERAGE_ID;

  panel.replaceChildren(title, lede, legend, note, status, coverage);

  const tools = document.getElementById(TOOLS_ID);
  let hint = null;
  if (tools) hint = ensureNode(make, HINT_ID, 'p', 'e020-hint', tools);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, status, coverage, hint, stage, reduced };
  refresh();

  if (!bound) {
    document.addEventListener('keydown', onKeyDown, false);
    bound = true;
  }
}

register('E020', install);
