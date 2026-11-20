import { register } from './registry.js';

/* Lentille CHRONOLOGIE E39 — Densité.
 *
 * Dix chantiers appliqués à chaque rendu de la vue chronologie par le registre
 * `runEnhancements`. Le thème est la DENSITÉ DE L'INFORMATION : mesurer ce qui
 * est réellement affiché, le rendre lisible, offrir une bascule compacte, et
 * adapter la mise en page sans jamais masquer ni inventer de donnée.
 *
 * Contrat respecté : un seul fichier possédé, CSS injecté une seule fois via
 * ctx.css('chronology-e39', …), identifiants tous préfixés `e39-`, aucune trace
 * de débogage, aucun appel réseau, aucune source d'aléa, aucun fichier partagé
 * modifié, aucun sélecteur de test altéré. Les compteurs sont recalculés depuis
 * le DOM rendu, jamais saisis à la main. L'état de la bascule vit dans ce
 * module, comme `local.query` vit dans chronology.js:16.
 *
 * Lectures utilisées : src/views/chronology.js, src/views/chronology/registry.js,
 * styles.css (:194-233, :316, :339), tests/e2e.mjs,
 * UNIFIED_AUDIT/views/atlas-chronologie.md,
 * UNIFIED_AUDIT/NAVIGATION/views/c2-orientation-atlas.md.
 */

const CSS_ID = 'chronology-e39';
const SCOPE = 'chronology-e39';
const COMPACT_CLASS = 'e39-compact';
const REDUCED_ATTR = 'data-e39-reduced';

const PANEL_ID = 'e39-panel';
const TITLE_ID = 'e39-title';
const DENSITY_ID = 'e39-density';
const TAGS_ID = 'e39-tags';
const ADVICE_ID = 'e39-advice';
const ERA_ID = 'e39-era';
const PROVENANCE_ID = 'e39-provenance';
const BTN_ID = 'e39-compact-toggle';

/* Seuils purement éditoriaux de l'interface : ce ne sont PAS des faits
 * historiques et aucune donnée du jeu n'en dépend. Ils sont écrits ici, donc
 * falsifiables d'un coup d'œil, et commentés dans le rapport. */
const DENSE_REPERES = 12;
const DENSE_CHARS = 6000;

/* Survit aux reconstructions complètes du DOM opérées par la coque
 * (shell.js:137) ; aucun nœud DOM n'est mémorisé ici. */
let compact = false;

/* Toutes les règles sont portées par des identifiants `e39-` ou par la classe
 * de portée posée sur `.chronology-layout` : aucune fuite hors de cette vue.
 * La bascule compacte ne réduit QUE des espacements et des hauteurs de cartes :
 * aucune cible interactive n'est réduite, aucune information n'est retirée. */
const CSS = `
#${PANEL_ID}{
  margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);color:var(--muted);
  font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}
#${PANEL_ID} h2{margin:0 0 5px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
#${PANEL_ID} p{margin:0 0 3px}
#${PANEL_ID} p:last-child{margin-bottom:0}
#${PANEL_ID} .e39-advice{color:var(--ink-soft)}
#${PANEL_ID}[data-e39-dense="1"] .e39-advice{color:var(--gold-bright)}
.e39-note{margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e39-toggle{
  min-height:36px;padding:5px 12px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear,background-color .18s linear;
}
.e39-toggle[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.e39-toggle:hover{border-color:var(--gold)}
.e39-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.${COMPACT_CLASS} .chronology-main{padding:16px 18px 22px}
.${COMPACT_CLASS} .chronology-aside{padding:16px 16px 22px}
.${COMPACT_CLASS} #${PANEL_ID}{margin-bottom:8px;padding:6px 9px}
.${COMPACT_CLASS} .atlas-chrono-status{margin-bottom:8px}
.${COMPACT_CLASS} .nav-c2-orientation{margin-bottom:9px;padding:6px 9px}
.${COMPACT_CLASS} .atlas-chrono-era-nav{margin-bottom:10px}
.${COMPACT_CLASS} .event-list{gap:6px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.${COMPACT_CLASS} .event-card{min-height:120px}
.${COMPACT_CLASS} .event-card img{height:64px}
.${COMPACT_CLASS} .point{padding:6px 0}
.${COMPACT_CLASS} .point-sources{margin-top:2px}
.${REDUCED_ATTR} .e39-toggle,
.${REDUCED_ATTR} #${PANEL_ID} *{transition:none}
@media (max-width:620px){
  #${PANEL_ID}{padding:7px 8px}
  .${COMPACT_CLASS} .chronology-main{padding:14px 12px 18px}
  .${COMPACT_CLASS} .chronology-aside{padding:14px 12px 18px}
  .${COMPACT_CLASS} .event-list{grid-template-columns:1fr}
  .e39-toggle{margin:4px 4px 0 0}
}
@media (prefers-reduced-motion:reduce){
  .e39-toggle{transition:none}
}`;

/* Regroupement milliers en espace (fr) sans dépendre de la locale du navigateur. */
function frNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* Un repère n'est compté comme affiché que s'il est présent ET non masqué :
 * E04 (filtres structurels) pose l'attribut `hidden` sans re-rendre la vue. */
function visibleEvents(main) {
  const list = main.querySelector('#atlas-chrono-events');
  if (!list) return [];
  return Array.prototype.filter.call(list.children, (node) => (
    node.nodeType === 1 && node.hasAttribute('data-event-id') && !node.hidden
  ));
}

function visibleChars(nodes) {
  let total = 0;
  nodes.forEach((node) => {
    if (node.closest('li[hidden]')) return;
    total += (node.textContent || '').replace(/\s+/g, ' ').trim().length;
  });
  return total;
}

/* Toutes les grandeurs affichées sont dérivées du DOM courant. */
function metrics(main, aside) {
  const events = visibleEvents(main);
  const points = aside ? all(aside, '.point') : [];
  const sources = aside ? all(aside, '[data-source-id]') : [];
  const chars = visibleChars(all(main, '.event-card'))
    + visibleChars(aside ? all(aside, '.point p') : []);
  return {
    events: events.length,
    bands: all(main, '#atlas-chrono-eras .era-band').length,
    tags: all(main, '#atlas-chrono-tools .atlas-chrono-tag[data-tag]').length,
    points: points.length,
    sourced: points.filter((point) => point.querySelector('[data-source-id]')).length,
    sources: sources.length,
    chars,
  };
}

function refresh(layout) {
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return;
  const aside = layout.querySelector('#atlas-chrono-aside');
  const m = metrics(main, aside);

  setText(document.getElementById(DENSITY_ID),
    `Densité mesurée : ${m.events} repère(s) affiché(s) · ${m.points} point(s) · `
    + `${m.sources} source(s) · ${frNumber(m.chars)} caractères visibles.`);
  setText(document.getElementById(TAGS_ID),
    `Thèmes proposés : ${m.tags} · chaque thème reste un filtre indépendant.`);
  setText(document.getElementById(ERA_ID),
    `Ères rendues : ${m.bands} bande(s) · une seule ère est développée à la fois.`);
  setText(document.getElementById(PROVENANCE_ID),
    `Provenance du repère : ${m.sourced}/${m.points} point(s) sourcé(s), `
    + `${m.sources} référence(s) citée(s).`);

  const dense = m.events > DENSE_REPERES || m.chars > DENSE_CHARS;
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.dataset.e39Dense = dense ? '1' : '0';
  setText(document.getElementById(ADVICE_ID), dense
    ? `Vue dense (${m.events} repères, ${frNumber(m.chars)} caractères) : affinez avec la recherche ou les filtres structurels.`
    : `Densité modérée (${m.events} repères, ${frNumber(m.chars)} caractères) : la liste reste lisible en une vue.`);
}

/* Différé sans minuteur : les gestionnaires synchrones (recherche, E04) ont
 * terminé leur mise à jour avant la nouvelle lecture du DOM. */
function deferRefresh(layout) {
  const read = () => refresh(layout);
  if (typeof queueMicrotask === 'function') queueMicrotask(read);
  else Promise.resolve().then(read);
}

function buildPanel(ctx) {
  const panel = ctx.el('section', 'e39-panel');
  panel.id = PANEL_ID;
  const title = ctx.el('h2', 'e39-title', 'Densité de la vue');
  title.id = TITLE_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);
  const density = ctx.el('p', 'e39-line');
  density.id = DENSITY_ID;
  const tags = ctx.el('p', 'e39-line');
  tags.id = TAGS_ID;
  const advice = ctx.el('p', 'e39-advice');
  advice.id = ADVICE_ID;
  panel.append(title, density, tags, advice);
  return panel;
}

function buildToggle(ctx, layout) {
  const button = ctx.el('button', 'e39-toggle', 'Densité compacte');
  button.type = 'button';
  button.id = BTN_ID;
  button.setAttribute('aria-pressed', compact ? 'true' : 'false');
  button.setAttribute('aria-controls', 'atlas-chrono-main');
  button.addEventListener('click', () => {
    compact = !compact;
    button.setAttribute('aria-pressed', compact ? 'true' : 'false');
    layout.classList.toggle(COMPACT_CLASS, compact);
    layout.dataset.e39Compact = compact ? '1' : '0';
    refresh(layout);
  });
  return button;
}

register('E39', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const layout = ctx.layout
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e39 = '1';
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }
  layout.classList.toggle(COMPACT_CLASS, compact);
  layout.dataset.e39Compact = compact ? '1' : '0';

  if (!document.getElementById(PANEL_ID)) {
    const status = main.querySelector('#atlas-chrono-status');
    const panel = buildPanel(ctx);
    if (status && status.nextSibling) main.insertBefore(panel, status.nextSibling);
    else main.prepend(panel);

    const eraNote = ctx.el('p', 'e39-note');
    eraNote.id = ERA_ID;
    const nav = main.querySelector('#atlas-chrono-eras');
    if (nav) nav.appendChild(eraNote);

    const aside = layout.querySelector('#atlas-chrono-aside');
    if (aside) {
      const provenance = ctx.el('p', 'e39-note');
      provenance.id = PROVENANCE_ID;
      aside.appendChild(provenance);
    }

    /* Un seul jeu d'écouteurs par rendu : ils vivent sur le `main` courant,
     * détruit avec la coque, donc aucun cumul. Aucun écouteur global. */
    main.addEventListener('input', () => deferRefresh(layout));
    main.addEventListener('change', () => deferRefresh(layout));
    main.addEventListener('click', () => deferRefresh(layout));
  }

  const tools = main.querySelector('#atlas-chrono-tools');
  if (tools && !document.getElementById(BTN_ID)) tools.appendChild(buildToggle(ctx, layout));
  const toggle = document.getElementById(BTN_ID);
  if (toggle) toggle.setAttribute('aria-pressed', compact ? 'true' : 'false');

  refresh(layout);
});
