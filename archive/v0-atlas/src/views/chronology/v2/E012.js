import { register } from './registry.js';

/* Lentille E012 — Puces de filtre par type de point avec état explicite.
 * Passe V2, domaine B (filtres & périmètre). Theme : themes.json, clé E012.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E012.md — chantiers E012-01 à E012-10.
 * Fichier possédé : src/views/chronology/v2/E012.js uniquement. Aucun fichier
 * partagé n'est modifié : ni chronology.js, ni registry.js, ni index.js, ni
 * styles.css, ni la passe 1, ni une autre lentille.
 *
 * Contrat exploité : ctx = { viewId, stage, layout } ; helpers ctx.css(),
 * ctx.el(), ctx.reducedMotion(). Le registre V2 ne fournit pas say() : la
 * lentille n'ajoute AUCUNE région live et n'écrit dans aucune région existante.
 *
 * Périmètre strictement délimité : les puces « type de point » (les boutons
 * .atlas-chrono-tag[data-tag] de #atlas-chrono-tools). La recherche (E011),
 * la réinitialisation globale (E013), le badge de périmètre (E014), le compte
 * de résultats (E015), l'état vide (E016), la persistance du signal (E017),
 * la combinaison recherche × type (E018), l'annonce (E019) et l'équivalent
 * clavier général (E020) restent hors de ce module.
 *
 * Invariants : un seul register('E012', install), un seul
 * ctx.css('chronology-v2-e012', …), des IDs tous préfixés chronology-v2-e012-
 * avec garde d'existence, zéro console.*, zéro réseau, zéro Math.random,
 * zéro innerHTML, zéro timer, zéro animation, zéro role="status"/aria-live.
 */

const CSS_ID = 'chronology-v2-e012';
const PANEL_ID = 'chronology-v2-e012-panel';
const TITLE_ID = 'chronology-v2-e012-group-title';
const GROUP_ID = 'chronology-v2-e012-chip-group';
const INVENTORY_ID = 'chronology-v2-e012-inventory';
const ACTIVE_ID = 'chronology-v2-e012-active';
const MODE_ID = 'chronology-v2-e012-mode';
const ALL_ID = 'chronology-v2-e012-all';
const TOOLS_ID = 'atlas-chrono-tools';

/* E012-01, E012-04, E012-09 : une seule feuille, injectée une fois par ctx.css.
   Le panneau est un bloc en flux Ajouté à la fin des outils : il ne recouvre ni
   la recherche, ni les cartes, ni la fiche. L'état des puces est porté par des
   canaux visuels non coloriels (bordure pleine/tirets, soulignement, marqueur
   textuel) pilotés par data-e012-state, jamais par la seule couleur. */
const CSS = `
  #${PANEL_ID} {
    flex: 1 1 100%; margin: 4px 0 0; padding: 9px 11px 10px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 9px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.45;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e012-title {
    margin: 0 0 4px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 13px; font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e012-legend,
  #${PANEL_ID} .e012-note { margin: 0 0 5px; color: var(--muted); }
  #${PANEL_ID} .e012-note { font-size: 9px; color: var(--muted-2); }
  #${GROUP_ID} { display: flex; flex-wrap: wrap; gap: 6px; margin: 7px 0; }
  #${GROUP_ID} .atlas-chrono-tag {
    min-height: 36px; border-style: dashed; border-width: 1px;
    font-variant-numeric: tabular-nums;
  }
  #${GROUP_ID} .atlas-chrono-tag[data-e012-state="on"] {
    border-style: solid; border-width: 2px;
    text-decoration: underline; text-underline-offset: 3px;
  }
  #${GROUP_ID} .e012-chip-state {
    margin-left: 5px; font-size: 9px; font-variant-numeric: tabular-nums;
  }
  #${ALL_ID} {
    min-height: 36px; padding: 4px 10px; border: 1px dashed var(--line-strong);
    border-radius: 999px; background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 9px; cursor: pointer;
  }
  #${ALL_ID}:disabled { opacity: .6; cursor: default; }
  #${ALL_ID}:focus-visible,
  #${GROUP_ID} .atlas-chrono-tag:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    #${GROUP_ID} { gap: 5px; }
    #${PANEL_ID} { padding: 8px 9px 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e012-title, #${ALL_ID} { color: CanvasText; }
    #${GROUP_ID} .atlas-chrono-tag[data-e012-state="on"] { border-width: 3px; }
  }
`;

let installCount = 0;

/* E012-10 : une seule écriture textuelle, dédupliquée, sans aria-live. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E012-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché et n'est plus trouvé :
   il est alors recréé. Un nœud retrouvé est déplacé dans le bon parent. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function chipList(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll('button.atlas-chrono-tag[data-tag]'));
}

/* E012-02, -04, -06, -07 : chaque puce reçoit quatre channels redondants
   d'état — marqueur textuel, attribut data-e012-state, aria-label et title —
   tous dérivés de aria-pressed, source de vérité posée par chronology.js.
   Aucune valeur n'est inventée : le type vient de data-tag. */
function decorateChip(make, chip, order, total) {
  const tag = chip.getAttribute('data-tag') || (chip.textContent || '').trim();
  const pressed = chip.getAttribute('aria-pressed') === 'true';
  const state = pressed ? 'on' : 'off';

  let marker = chip.querySelector('.e012-chip-state');
  if (!marker) {
    marker = make('span', 'e012-chip-state');
    marker.setAttribute('aria-hidden', 'true');
    chip.appendChild(marker);
  }
  write(marker, pressed ? ' ✓ actif' : ' ○ inactif');

  if (chip.dataset.e012State !== state) chip.dataset.e012State = state;
  if (chip.dataset.e012Tag !== tag) chip.dataset.e012Tag = tag;
  if (chip.dataset.e012Order !== String(order)) chip.dataset.e012Order = String(order);
  if (chip.dataset.e012Total !== String(total)) chip.dataset.e012Total = String(total);

  const label = pressed
    ? `Type de point « ${tag} » actif. Cliquer pour retirer ce filtre.`
    : `Type de point « ${tag} » inactif. Cliquer pour filtrer sur ce type.`;
  if (chip.getAttribute('aria-label') !== label) chip.setAttribute('aria-label', label);

  const tip = `Filtrer les repères par type de point : ${tag} (état courant : ${pressed ? 'actif' : 'inactif'}).`;
  if (chip.getAttribute('title') !== tip) chip.setAttribute('title', tip);

  if (chip.getAttribute('type') !== 'button') chip.setAttribute('type', 'button');
  return { tag, pressed };
}

function install(ctx) {
  const make = ctx.el;
  const layout = ctx.layout;
  if (typeof make !== 'function' || !layout) return;

  const tools = document.getElementById(TOOLS_ID);
  if (!tools) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  /* E012-01 : le groupe nommé est créé une fois et contient toutes les puces. */
  const panel = ensureNode(make, PANEL_ID, 'div', 'e012-panel', tools);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'e012-title', panel);
  title.textContent = 'Filtrer par type de point';

  const legend = ensureNode(make, `${PANEL_ID}-legend`, 'p', 'e012-legend', panel);
  legend.textContent = 'Chaque puce correspond à une famille de points d’un repère. Son état est écrit en toutes lettres et par la forme de sa bordure, jamais par la couleur seule.';

  const inventory = ensureNode(make, INVENTORY_ID, 'p', 'e012-note', panel);
  const active = ensureNode(make, ACTIVE_ID, 'p', 'e012-note', panel);
  const mode = ensureNode(make, MODE_ID, 'p', 'e012-note', panel);

  const group = ensureNode(make, GROUP_ID, 'div', 'e012-group', panel);
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', TITLE_ID);

  panel.replaceChildren(title, legend, inventory, group, active, mode);

  /* Les puces restent les boutons d'origine : IDs, data-tag et écouteurs de
     chronology.js sont préservés, seul leur parent change. */
  const chips = chipList(tools);
  chips.forEach((chip) => { if (chip.parentElement !== group) group.appendChild(chip); });

  const described = chips.map((chip, index) => decorateChip(make, chip, index + 1, chips.length));
  const pressedRows = described.filter((row) => row.pressed);
  const tags = described.map((row) => row.tag);

  /* E012-05 : inventaire dérivé du DOM, ordre alphabétique vérifié. */
  const sorted = tags.every((tag, index) => index === 0 || tags[index - 1].localeCompare(tag) <= 0);
  panel.dataset.e012Sorted = sorted ? '1' : '0';
  write(inventory, `${tags.length} types de points proposés, classés par ordre alphabétique : ${tags.join(' · ')}.`);

  /* E012-03 : nombre de types actifs, 0 signifiant « tous affichés ». */
  write(active, `Types actifs : ${pressedRows.length} sur ${tags.length}.`
    + (pressedRows.length === 0
      ? ' Aucun type n’est filtré : tous les types sont affichés.'
      : ` Type sélectionné : ${pressedRows.map((row) => row.tag).join(', ')}.`));

  /* E012-09 : la règle d'exclusivité est énoncée, pas seulement suggérée. */
  write(mode, pressedRows.length === 0
    ? 'Règle : aucun type n’est actif, la vue montre tous les repères de l’ère. Activer une puce restreint l’affichage au type choisi.'
    : 'Règle : un seul type peut être actif à la fois. Activer une autre puce remplace ce choix ; « Tous les types » le retire.');

  /* E012-08 : bouton de référence « tous », non destructif. Il ne touche ni à
     la recherche (E011) ni à la réinitialisation globale (E013) : il délègue
     au bouton actif son propre basculement, donc au gestionnaire de la vue. */
  const all = ensureNode(make, ALL_ID, 'button', 'e012-all', group);
  all.type = 'button';
  all.setAttribute('aria-controls', 'atlas-chrono-events');
  write(all, 'Tous les types');
  all.disabled = pressedRows.length === 0;
  all.dataset.e012AllState = all.disabled ? 'none' : 'clear';
  const allLabel = all.disabled
    ? 'Aucun type sélectionné : tous les types sont déjà affichés.'
    : 'Retirer le filtre de type et afficher tous les types de points.';
  if (all.getAttribute('aria-label') !== allLabel) all.setAttribute('aria-label', allLabel);
  if (!all.dataset.e012Bound) {
    all.dataset.e012Bound = '1';
    all.addEventListener('click', () => {
      const current = chipList(group).find((chip) => chip.getAttribute('aria-pressed') === 'true');
      if (current) current.click();
    });
  }

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  panel.dataset.e012Reduced = reduced ? '1' : '0';
  panel.dataset.e012Installs = String(installCount);
  panel.dataset.e012ChipCount = String(chips.length);
  panel.dataset.e012Pressed = String(pressedRows.length);
}

register('E012', install);
