import { register } from './registry.js';

/* Lentille CHRONOLOGIE E37 — Non-invention (domaine D : données & sémantique).
 *
 * Dix chantiers appliqués à chaque rendu de la vue chronologie par le registre
 * `runEnhancements`. Le panneau ajouté ne restitue que des champs réellement
 * présents dans le DOM rendu par `chronology.js` (lui-même dérivé du jeu de
 * données) : aucun fait, millésime, nom, relation ni source n'est fabriqué.
 * Chaque champ absent ou vide produit un état vide explicite, jamais une valeur
 * de comblement. Zéro réseau, zéro aléa, zéro journalisation, aucun fichier
 * partagé modifié, aucun sélecteur de test touché. */

const CSS_ID = 'chronology-e37';
const PANEL_ID = 'chronology-e37-garantie';

/* E37-09, E37-10 : feuille unique injectée par ctx.css (cssOnce), sans
 * transition animée sous prefers-reduced-motion, sans dépendance externe.
 * Toutes les règles sont ciblées sur l'ancre unique du panneau. */
const CSS = `
  #${PANEL_ID}{
    margin:10px 0 2px;padding:8px 10px;
    border:1px solid var(--line);border-radius:8px;
    background:rgba(255,255,255,.02);color:var(--ink);
    font:inherit;font-size:10px;line-height:1.45;
  }
  #${PANEL_ID} .e37-kicker{
    margin:0 0 4px;color:var(--gold);font-size:8px;font-weight:600;
    letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .e37-note{margin:0 0 6px;color:var(--muted-2);font-size:9px;line-height:1.4}
  #${PANEL_ID} .e37-grid{
    display:grid;grid-template-columns:minmax(0,1fr) auto;
    gap:2px 10px;margin:0;font-size:10px;
  }
  #${PANEL_ID} .e37-grid dt{color:var(--muted);min-width:0}
  #${PANEL_ID} .e37-grid dd{
    margin:0;color:var(--ink);font-variant-numeric:tabular-nums;text-align:right;
  }
  #${PANEL_ID} .e37-row{margin:5px 0 0;color:var(--muted);font-size:9px;line-height:1.4}
  #${PANEL_ID} .e37-row strong{color:var(--gold-bright);font-weight:600}
  #${PANEL_ID} .e37-empty{font-style:italic}
  @media (max-width:620px){
    #${PANEL_ID}{padding:7px 8px}
    #${PANEL_ID} .e37-grid{grid-template-columns:minmax(0,1fr) auto}
  }
  @media (prefers-reduced-motion:reduce){#${PANEL_ID}{transition:none}}
`;

/* E37-07 : seules les chaînes et les chaînes de nombres finis sont laissées
 * passer jusqu'au DOM. Aucun NaN, aucun « undefined », aucun « [object Object] ». */
function asText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function nodeList(selector) {
  return Array.prototype.slice.call(document.querySelectorAll(selector));
}

/* E37-02 : compteurs dérivés du seul DOM courant. Les <li> masqués par les
 * filtres structurels (E04) sont exclus à l'appel : le panneau décrit ce qui
 * est réellement affiché, jamais un total supposé. */
function count(selector) {
  return nodeList(selector).length;
}

/* E37-03, E37-04 : distribution dérivée des seules valeurs présentes dans
 * data-confidence / data-kind des points rendus. Aucune catégorie ajoutée,
 * aucune traduction inventée ; ordre déterministe (décroissant, puis tri
 * alphabétique français), donc reproductible. */
function tally(selector, attribute) {
  const found = new Map();
  nodeList(selector).forEach((node) => {
    const key = asText(node.getAttribute(attribute)).trim();
    if (!key) return;
    found.set(key, (found.get(key) || 0) + 1);
  });
  return Array.from(found.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'fr'));
}

function formatTally(entries) {
  return entries.length ? entries.map(([key, n]) => `${key} ${n}`).join(' · ') : '';
}

/* E37-05 : seuls les identifiants réellement portés par data-source-id sont
 * repris. Aucune URL n'est construite, aucun titre n'est supposé, aucun lien
 * n'est créé (pas même une ancre interne). */
function sourceIds() {
  return nodeList('#atlas-chrono-aside .point-sources li[data-source-id]')
    .map((node) => asText(node.getAttribute('data-source-id')).trim())
    .filter(Boolean);
}

/* E37-06 : seuls les thèmes réellement portés par data-tags des repères
 * affichés sont repris. Aucun attribut relationnel n'est produit : le panneau
 * ne suggère ni influence, ni contemporanéité, ni rupture. */
function tags() {
  const found = [];
  nodeList('#atlas-chrono-events > li[data-event-id]').forEach((item) => {
    if (item.hidden) return;
    asText(item.getAttribute('data-tags')).split(/\s+/).forEach((tag) => {
      if (tag && found.indexOf(tag) === -1) found.push(tag);
    });
  });
  return found.sort((a, b) => a.localeCompare(b, 'fr'));
}

function build(ctx) {
  const root = ctx.el('section', 'e37-garantie');
  root.id = PANEL_ID;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Garantie de non-invention — données réellement affichées');

  const kicker = ctx.el('p', 'e37-kicker', 'Non-invention · données vérifiables');
  const note = ctx.el('p', 'e37-note',
    'Ce bloc ne restitue que des valeurs déjà présentes dans la vue ; il n’ajoute aucun fait, aucune date ni aucune source.');
  const grid = ctx.el('dl', 'e37-grid');
  const confidence = ctx.el('p', 'e37-row e37-confidence');
  const kinds = ctx.el('p', 'e37-row e37-kinds');
  const themes = ctx.el('p', 'e37-row e37-themes');
  const sources = ctx.el('p', 'e37-row e37-sources');
  root.append(kicker, note, grid, confidence, kinds, themes, sources);
  return root;
}

function addStat(ctx, grid, label, value) {
  grid.append(ctx.el('dt', '', label), ctx.el('dd', '', value));
}

function addRow(ctx, node, label, value, emptyValue) {
  node.replaceChildren();
  node.append(ctx.el('strong', '', `${label} : `));
  node.append(ctx.el('span', value ? '' : 'e37-empty', value || emptyValue));
}

/* E37-01, E37-05, E37-06 : toute écriture passe par textContent. Le nœud est
 * retrouvé à chaque appel (le registre rejoue la lentille à chaque rendu). */
function render(ctx) {
  const node = document.getElementById(PANEL_ID);
  if (!node) return;
  const grid = node.querySelector('.e37-grid');
  const confidence = node.querySelector('.e37-confidence');
  const kinds = node.querySelector('.e37-kinds');
  const themes = node.querySelector('.e37-themes');
  const sources = node.querySelector('.e37-sources');
  if (!grid || !confidence || !kinds || !themes || !sources) return;

  const points = nodeList('#atlas-chrono-aside .points > li.point');
  const shownEvents = nodeList('#atlas-chrono-events > li[data-event-id]')
    .filter((item) => !item.hidden);
  const sourceList = sourceIds();
  const themeList = tags();
  const confTally = tally('#atlas-chrono-aside .points > li.point', 'data-confidence');
  const kindTally = tally('#atlas-chrono-aside .points > li.point', 'data-kind');
  const eras = count('#atlas-chrono-eras .era-band');
  const countryId = (ctx.layout && asText(ctx.layout.getAttribute('data-country-id')).trim()) || '';

  node.dataset.state = (shownEvents.length || points.length || eras) ? 'active' : 'empty';

  grid.replaceChildren();
  addStat(ctx, grid, 'Pays (identifiant)', countryId || 'non renseigné');
  addStat(ctx, grid, 'Ères affichées', String(eras));
  addStat(ctx, grid, 'Repères affichés', String(shownEvents.length));
  addStat(ctx, grid, 'Points du repère', String(points.length));
  addStat(ctx, grid, 'Sources citées', String(sourceList.length));

  addRow(ctx, confidence, 'Confiance déclarée', formatTally(confTally), 'non renseignée');
  addRow(ctx, kinds, 'Types de points', formatTally(kindTally), 'non renseignés');
  addRow(ctx, themes, 'Thèmes', themeList.join(' · '), 'aucun thème déclaré');
  if (sourceList.length) {
    const shown = sourceList.slice(0, 3).join(', ');
    const more = sourceList.length > 3 ? ` · +${sourceList.length - 3}` : '';
    addRow(ctx, sources, 'Identifiants de sources', shown + more, '');
  } else {
    addRow(ctx, sources, 'Identifiants de sources', '', 'aucune référence renseignée');
  }
}

register('E37', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function') return;

  /* E37-08, E37-10 : CSS unique (cssOnce) et ancre unique protégée par son id.
   * La coque vide `stage` à chaque rendu : le panneau est recréé avec le DOM,
   * sans doublon ni écouteur accumulé. Aucun rappel n'est enregistré. */
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  const layout = ctx.layout || null;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const host = layout.querySelector('.chronology-main') || layout;
  if (!document.getElementById(PANEL_ID)) {
    const tools = document.getElementById('atlas-chrono-tools');
    const panel = build(ctx);
    if (tools && tools.parentNode === host && tools.nextSibling) {
      host.insertBefore(panel, tools.nextSibling);
    } else {
      host.appendChild(panel);
    }
  }
  render(ctx);
});
