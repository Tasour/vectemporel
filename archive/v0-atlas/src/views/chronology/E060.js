import { register } from './registry.js';

/* Lentille E060 — accessibilité lecteur d'écran : landmarks, régions nommées
   et navigation rapide. Dix chantiers, tous implémentés dans ce module.

   Contrat exploité : ctx.viewId, ctx.stage, ctx.layout, ctx.css(id, rules),
   ctx.el(tag, cls, text), ctx.reducedMotion(). La lentille est déclarative et
   événementielle : zéro réseau, zéro console.*, zéro Math.random, aucune
   boucle requestAnimationFrame, aucun timer. Tout identifiant est préfixé
   `e060` et créé sous garde d'existence (cssOnce + ensureNode), afin qu'un
   re-render de la vue ne laisse aucun doublon dans le document. */

const CSS_ID = 'chronology-e060';
const LIVE_ID = 'nav-c2a-live';
const SKIP_ID = 'e060-landmarks';
const SEARCH_HELP_ID = 'e060-search-help';
const EVENTS_DESC_ID = 'e060-events-desc';
const ASIDE_DESC_ID = 'e060-aside-desc';

/* E060-09 : la feuille de styles de la vue (styles.css:33-35) ne couvre que
   `button` et `[tabindex]` ; les liens d'évitement ont donc leur propre règle
   de focus, injectée une seule fois avec le reste. */
const CSS = `
.e060-skip{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.e060-skip:focus-within{position:fixed;top:8px;left:8px;z-index:60;width:auto;height:auto;margin:0;padding:8px 10px;overflow:visible;clip:auto;clip-path:none;white-space:normal;background:var(--surface-2);border:1px solid var(--gold);border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,.6)}
.e060-skip-list{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.e060-skip a{display:inline-flex;align-items:center;min-height:36px;padding:7px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font-size:11px;text-decoration:none}
.e060-skip a:hover{border-color:var(--gold)}
.e060-skip a:focus-visible{outline:2px solid var(--gold-bright);outline-offset:3px}
.e060-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){.e060-skip:focus-within{right:8px;left:8px}.e060-skip-list{gap:4px}.e060-skip a{font-size:10px}}
@media (prefers-reduced-motion:reduce){.e060-skip a{transition:none}}
`;

/* Cibles de la carte des régions : identifiants réels de chronology.js et
   libellés d'annonce, en français. */
const REGIONS = [
  ['atlas-chrono-main', 'Aller au contenu principal', 'contenu principal'],
  ['atlas-chrono-eras', 'Aller aux ères', 'ères'],
  ['atlas-chrono-events', 'Aller aux repères', 'repères'],
  ['atlas-chrono-aside', 'Aller à la fiche du repère', 'fiche du repère'],
];

function find(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  return typeof root.querySelector === 'function'
    ? root.querySelector('[id="' + id + '"]')
    : null;
}

/* E060-10 : un nœud existant est réutilisé et déplacé dans le conteneur
   courant ; jamais de doublon d'ID, même si apply() est rejoué sur un stage
   déjà enrichi. */
function ensureNode(ctx, doc, id, tag, className, text, parent) {
  if (!parent) return null;
  let node = doc.getElementById(id);
  if (!node) {
    node = typeof ctx.el === 'function'
      ? ctx.el(tag, className, text)
      : doc.createElement(tag);
    node.id = id;
    if (className && !node.className) node.className = className;
    if (text !== undefined && !node.textContent) node.textContent = text;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Union idempotente des identifiants de description : on n'écrase jamais
   l'aria-describedby posé par une autre lentille (cf. M01-03). */
function describe(node, id) {
  if (!node || !id) return;
  const ids = (node.getAttribute('aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
  if (ids.indexOf(id) === -1) ids.push(id);
  node.setAttribute('aria-describedby', ids.join(' '));
}

/* Nommer une région sans voler un nom déjà posé par la vue. */
function nameRegion(node, role, label) {
  if (!node) return;
  if (role && !node.getAttribute('role')) node.setAttribute('role', role);
  if (label && !node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby')) {
    node.setAttribute('aria-label', label);
  }
}

/* E060-07 : `list-style:none` (chronology.js:41, :59, :67) fait perdre la
   sémantique de liste à VoiceOver ; on la rétablit explicitement. */
function restoreListRoles(list) {
  if (!list) return;
  if (list.getAttribute('role') !== 'list') list.setAttribute('role', 'list');
  Array.prototype.forEach.call(list.children, (child) => {
    if (child && child.tagName && child.tagName.toLowerCase() === 'li'
      && child.getAttribute('role') !== 'listitem') {
      child.setAttribute('role', 'listitem');
    }
  });
}

/* E060-08 : la région live unique est celle de chronology.js:119-138. On ne
   la recrée pas ; on écrit dedans uniquement sur action explicite. */
function announce(doc, message) {
  const live = doc.getElementById(LIVE_ID);
  if (live && message) live.textContent = message;
}

register('E060', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function' || !ctx.stage) return;
  const doc = ctx.stage.ownerDocument || document;
  const layout = (ctx.layout && ctx.layout.isConnected)
    ? ctx.layout
    : (typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout')
      : null);

  /* La feuille est injectée une seule fois par cssOnce, avant tout test de
     présence du layout : elle survit au innerHTML de la coque. */
  ctx.css(CSS_ID, CSS);
  if (!layout) return;

  const main = find(layout, 'atlas-chrono-main');
  const aside = find(layout, 'atlas-chrono-aside');
  const eras = find(layout, 'atlas-chrono-eras');
  const events = find(layout, 'atlas-chrono-events');
  const search = find(layout, 'atlas-chrono-search');
  const status = find(layout, 'atlas-chrono-status');
  const tools = find(layout, 'atlas-chrono-tools');
  const situation = layout.querySelector('.nav-c2-orientation');
  const eraList = layout.querySelector('.atlas-chrono-era-list');
  const points = find(layout, 'atlas-chrono-points');

  /* E060-01 — carte des régions / liens d'évitement. */
  const skip = ensureNode(ctx, doc, SKIP_ID, 'nav', 'e060-skip', '', layout);
  if (skip) {
    skip.setAttribute('aria-label', 'Régions de la chronologie — navigation rapide');
    let list = skip.querySelector('.e060-skip-list');
    if (!list) {
      list = ctx.el('ol', 'e060-skip-list');
      skip.appendChild(list);
    }
    list.textContent = '';
    REGIONS.forEach(([targetId, label, regionName]) => {
      const target = find(layout, targetId);
      if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      const item = ctx.el('li');
      const link = ctx.el('a', '', label);
      link.href = '#' + targetId;
      link.addEventListener('click', () => {
        announce(doc, 'Région « ' + regionName + ' » atteinte.');
      });
      item.appendChild(link);
      list.appendChild(item);
    });
    if (skip.parentNode === layout && layout.firstChild !== skip) {
      layout.insertBefore(skip, layout.firstChild);
    }
    skip.dataset.e060Links = String(REGIONS.length);
  }

  /* E060-02 et E060-03 — nommer les régions qui n'en ont pas. Le main,
     l'aside, la nav des ères et la liste des repères sont déjà nommés par la
     vue (chronology.js:220, :223, :280, :350) : nameRegion ne les écrase pas.
     L'aside garde son rôle implicite `complementary` : on ne lui impose aucun
     role explicite, seule sa description est complétée plus bas. */
  nameRegion(main, 'region', 'Contenu principal de la chronologie');
  nameRegion(aside, null, null);
  nameRegion(eras, 'navigation', 'Ères de la chronologie');
  nameRegion(situation, 'region', 'Situation dans la chronologie');
  nameRegion(tools, 'group', 'Outils de filtrage des repères');

  /* E060-04 — la recherche sait ce qu'elle porte et où lire le résultat. */
  if (search) {
    const help = ensureNode(ctx, doc, SEARCH_HELP_ID, 'p', 'e060-sr',
      'La recherche porte sur les titres, les années, les thèmes et les points du pays courant. Le décompte est annoncé après filtrage.',
      layout);
    describe(search, SEARCH_HELP_ID);
    if (help && status) describe(search, 'atlas-chrono-status');
  }

  /* E060-05 — portée de la liste des repères. */
  if (events) {
    const desc = ensureNode(ctx, doc, EVENTS_DESC_ID, 'p', 'e060-sr',
      'Liste ordonnée des repères du pays courant. Activez le bouton d’un repère pour afficher sa fiche et ses points vérifiés.',
      layout);
    if (desc) describe(events, EVENTS_DESC_ID);
  }

  /* E060-06 — description stable de la fiche, même quand son nom bascule
     entre aria-label et aria-labelledby (chronology.js:223, :418-419). */
  if (aside) {
    const desc = ensureNode(ctx, doc, ASIDE_DESC_ID, 'p', 'e060-sr',
      'Fiche du repère sélectionné : contexte, points vérifiés et sources. Le nom de cette région suit le repère affiché.',
      layout);
    if (desc) describe(aside, ASIDE_DESC_ID);
  }

  /* E060-07 — sémantique de liste restaurée sur les trois <ol> à puces
     supprimées. */
  restoreListRoles(eraList);
  restoreListRoles(events);
  restoreListRoles(points);

  /* E060-08 et E060-10 — miroir d'audit : la lentille n'a pas créé de
     seconde région live et expose son état dans le DOM, sans console. */
  layout.dataset.e060 = '1';
  layout.dataset.e060Live = doc.getElementById(LIVE_ID) ? 'reused' : 'absent';
  layout.dataset.e060Regions = String(REGIONS.length);
});
