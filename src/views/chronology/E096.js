import { register } from './registry.js';

/* Lentille CHRONOLOGIE E096 — Accessibilité cognitive, simplification et
 * réduction de la charge mentale.
 *
 * Dix chantiers appliqués à chaque rendu de la vue chronologie par le registre
 * `runEnhancements` (chronology.js:539). Le principe directeur : externaliser la
 * mémoire de travail (récapitulatif unique), procéder par divulgation
 * progressive (détails natifs), et réduire le nombre de décisions simultanées
 * sans jamais retirer d'information ni inventer de donnée historique.
 *
 * Contrat respecté : un seul fichier possédé, CSS injecté une seule fois via
 * ctx.css('chronology-e096', …), identifiants tous préfixés `e096-` et protégés
 * par getElementById, zéro trace de débogage, zéro appel réseau, zéro source
 * d'aléa, aucune boucle d'animation propre, aucun minuteur, aucun fichier
 * partagé modifié, aucun sélecteur de test altéré. Aucune région live ajoutée :
 * les annonces restent celles de #nav-c2a-live (chronology.js:119-138).
 *
 * Lectures utilisées : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css, UNIFIED_AUDIT/MONDE/views/M07.md,
 * UNIFIED_AUDIT/MONDE/views/M01.md.
 */

const CSS_ID = 'chronology-e096';
const SCOPE = 'chronology-e096';
const FOCUS_CLASS = 'e096-focus';
const REDUCED_ATTR = 'data-e096-reduced';

const BRIEF_ID = 'e096-brief';
const HELP_ID = 'e096-help';
const TAGS_ID = 'e096-tags-details';
const POINTS_ID = 'e096-points-details';
const RESET_ID = 'e096-reset';
const FOCUS_ID = 'e096-focus-btn';

/* Survit aux reconstructions complètes du DOM opérées par la coque
 * (shell.js:137) : aucun nœud n'est mémorisé, seulement ces préférences. */
let focusMode = false;
const opened = { tags: false, help: false, points: false };

/* Toutes les règles sont portées par des identifiants `e096-` ou par la classe
 * de portée posée sur `.chronology-layout`. Le mode concentration ne masque
 * aucun texte : il ne désature que les vignettes décoratives. */
const CSS = `
#${BRIEF_ID}{
  margin:0 0 12px;padding:9px 11px;
  border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:8px;
  background:rgba(255,255,255,.02);color:var(--ink-soft);
  font-size:11px;line-height:1.6;
}
.e096-details{
  margin:8px 0 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.e096-summary{
  min-height:36px;padding:8px 10px;color:var(--gold-bright);
  font-size:10px;cursor:pointer;
}
.e096-summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e096-body{padding:0 10px 10px;color:var(--muted);font-size:10px;line-height:1.6}
.e096-body p{margin:0 0 6px}
.e096-body ul{margin:0;padding-left:18px}
.e096-tip{margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
.e096-btn{
  min-height:36px;padding:5px 11px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .16s linear,color .16s linear;
}
.e096-btn:hover{border-color:var(--gold)}
.e096-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e096-btn[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1)}
.e096-focus .event-card img{opacity:.3;filter:grayscale(1)}
.e096-focus .event-card{box-shadow:none}
[data-e096-reduced="1"] .e096-btn{transition:none}
@media (max-width:620px){
  #${BRIEF_ID}{padding:7px 9px;font-size:10px}
  .e096-btn{margin:4px 4px 0 0}
}
@media (prefers-reduced-motion:reduce){.e096-btn{transition:none}}`;

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* Réutilise un nœud déjà présent dans le rendu courant, sinon le crée ; le
 * déplace si nécessaire. C'est la garde d'existence qui rend la lentille
 * idempotente quand `apply` est rejoué sur le même `stage`. */
function ensure(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function pointsSummary(list) {
  const count = list ? list.children.length : 0;
  return opened.points
    ? `Masquer les ${count} point(s) du repère`
    : `Voir les ${count} point(s) du repère`;
}

/* E096-02 — divulgation progressive : le texte de tous les points reste dans
 * le DOM et dans <ol class="points">, seul l'affichage est replié. */
function wrapPoints(ctx, layout) {
  const aside = layout.querySelector('#atlas-chrono-aside');
  const list = aside ? aside.querySelector('ol.points') : null;
  if (!list) return;

  const previous = document.getElementById(POINTS_ID);
  if (previous) {
    previous.open = opened.points;
    setText(previous.querySelector('summary'), pointsSummary(list));
    return;
  }
  if (list.parentNode && list.parentNode.id === POINTS_ID) return;

  const wrap = ctx.el('details', 'e096-details e096-points');
  wrap.id = POINTS_ID;
  const summary = ctx.el('summary', 'e096-summary', pointsSummary(list));
  wrap.appendChild(summary);
  const parent = list.parentNode;
  if (!parent) return;
  parent.insertBefore(wrap, list);
  wrap.appendChild(list);
  wrap.open = opened.points;
  wrap.addEventListener('toggle', () => {
    opened.points = wrap.open;
    setText(summary, pointsSummary(list));
  });
}

/* E096-01 — un seul récapitulatif, relu depuis le DOM courant : pays, ère,
 * repère, nombre de points. Aucune région live : pas de bavardage vocal. */
function refreshBrief(layout) {
  const brief = document.getElementById(BRIEF_ID);
  if (!brief) return;
  const main = layout.querySelector('#atlas-chrono-main');
  const title = main ? main.querySelector('#atlas-chrono-title') : null;
  const country = title
    ? title.textContent.replace(/^Chronologie\s*·\s*/, '').trim() : '';
  const band = main
    ? main.querySelector('#atlas-chrono-eras .era-band[aria-current="true"]') : null;
  const firstSpan = band ? band.querySelector('span') : null;
  const era = firstSpan ? firstSpan.textContent.trim() : '';
  const aside = layout.querySelector('#atlas-chrono-aside');
  const eventTitle = aside ? aside.querySelector('#atlas-chrono-event-title') : null;
  const points = aside ? all(aside, '.point').length : 0;
  const text = eventTitle
    ? `En bref : ${country || 'Pays non sélectionné'} · ${era || 'Ère non sélectionnée'} · `
      + `${eventTitle.textContent.trim()} · ${points} point(s) à lire.`
    : 'En bref : aucun repère sélectionné. Choisissez une carte pour afficher ses points.';
  setText(brief, text);
}

function buildBrief(ctx, layout, main) {
  const brief = ensure(ctx, BRIEF_ID, 'p', 'e096-brief', main);
  const status = main.querySelector('#atlas-chrono-status');
  const anchor = status && status.nextSibling ? status.nextSibling : null;
  if (anchor && brief.nextSibling !== anchor) main.insertBefore(brief, anchor);
  /* lecture différée sans minuteur : les filtres E04 posent `hidden` sans
   * re-rendre la vue ; la micro-tâche relit le DOM après les gestionnaires. */
  if (!brief.dataset.e096Bound) {
    brief.dataset.e096Bound = '1';
    const read = () => refreshBrief(layout);
    main.addEventListener('input', () => {
      if (typeof queueMicrotask === 'function') queueMicrotask(read);
      else Promise.resolve().then(read);
    });
    main.addEventListener('click', () => {
      if (typeof queueMicrotask === 'function') queueMicrotask(read);
      else Promise.resolve().then(read);
    });
  }
  refreshBrief(layout);
}

/* E096-04 — regroupe les boutons de thème de la barre d'outils dans un détail
 * repliable. Les boutons ne sont pas retirés : ils restent dans le DOM avec
 * leurs data-tag et aria-pressed d'origine. */
function groupTags(ctx, main) {
  const tools = main.querySelector('#atlas-chrono-tools');
  if (!tools) return;
  const tags = Array.prototype.filter.call(tools.children, (child) => (
    child.nodeType === 1 && child.classList
    && child.classList.contains('atlas-chrono-tag') && child.hasAttribute('data-tag')
  ));
  if (!tags.length) return;

  let box = document.getElementById(TAGS_ID);
  if (!box) {
    box = ctx.el('details', 'e096-details e096-tags');
    box.id = TAGS_ID;
    box.appendChild(ctx.el('summary', 'e096-summary', ''));
    tools.appendChild(box);
    const summary = box.querySelector('summary');
    box.addEventListener('toggle', () => {
      opened.tags = box.open;
      setText(summary, `Thèmes (${tags.length}) — `
        + (box.open ? 'masquer les filtres' : 'afficher les filtres'));
    });
  }
  if (box.parentNode !== tools) tools.appendChild(box);
  setText(box.querySelector('summary'), `Thèmes (${tags.length}) — `
    + (opened.tags ? 'masquer les filtres' : 'afficher les filtres'));
  tags.forEach((tag) => box.appendChild(tag));
  box.open = opened.tags;
}

/* E096-05 — aide mémoire en langage clair, adossée aux commandes réellement
 * présentes (chronology.js:231, :312-326, :508-524). Aucune donnée inventée. */
function buildHelp(ctx, main) {
  const help = ensure(ctx, HELP_ID, 'details', 'e096-details e096-help', main);
  const hint = main.querySelector('.atlas-chrono-hint');
  const anchor = hint && hint.nextSibling ? hint.nextSibling : null;
  if (anchor && help.nextSibling !== anchor) main.insertBefore(help, anchor);
  if (help.querySelector('.e096-body')) {
    help.open = opened.help;
    return;
  }
  help.appendChild(ctx.el('summary', 'e096-summary', 'Aide mémoire — commandes de la vue'));
  const body = ctx.el('div', 'e096-body');
  body.appendChild(ctx.el('p', '', 'Recherche : saisissez un mot pour trouver un repère, une année ou un point.'));
  body.appendChild(ctx.el('p', '', 'Thèmes : cliquez sur un thème pour filtrer, recliquez dessus pour l’enlever.'));
  body.appendChild(ctx.el('p', '', 'Ères : une bande ouvre une ère ; une seule ère est développée à la fois.'));
  body.appendChild(ctx.el('p', '', 'Repère : une carte ouvre ses points ; les boutons en fin de fiche changent de repère.'));
  const keys = ctx.el('ul', '');
  [
    '→ : repère suivant',
    '↑ : ère précédente',
    '↓ : ère suivante',
    'Entrée : détail du repère',
    '? : aide',
  ].forEach((line) => keys.appendChild(ctx.el('li', '', line)));
  body.appendChild(keys);
  help.appendChild(body);
  help.open = opened.help;
  help.addEventListener('toggle', () => { opened.help = help.open; });
}

/* E096-06 — « Tout effacer » passe exclusivement par les contrôles existants :
 * aucun import du store, aucun état parallèle. local.query et local.tag vivent
 * dans chronology.js:16 et sont réinitialisés par leurs propres gestionnaires
 * (chronology.js:320-325 et :336-341). */
function buildReset(ctx, main) {
  const tools = main.querySelector('#atlas-chrono-tools');
  if (!tools) return;
  const button = ensure(ctx, RESET_ID, 'button', 'e096-btn', tools);
  button.type = 'button';
  setText(button, 'Tout effacer');
  button.setAttribute('aria-controls', 'atlas-chrono-events');
  if (!button.dataset.e096Bound) {
    button.dataset.e096Bound = '1';
    button.addEventListener('click', () => {
      const tag = tools.querySelector('.atlas-chrono-tag[data-tag][aria-pressed="true"]');
      if (tag) tag.click();
      const search = main.querySelector('#atlas-chrono-search');
      if (search && search.value) {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
}

/* E096-03 — mode concentration : bascule indépendante (aria-pressed légitime),
 * état mémorisé dans le module comme local.query dans chronology.js:16. */
function buildFocus(ctx, layout, main) {
  const tools = main.querySelector('#atlas-chrono-tools');
  if (!tools) return;
  const button = ensure(ctx, FOCUS_ID, 'button', 'e096-btn', tools);
  button.type = 'button';
  setText(button, 'Concentration');
  button.setAttribute('aria-controls', 'atlas-chrono-main');
  button.setAttribute('aria-pressed', focusMode ? 'true' : 'false');
  if (!button.dataset.e096Bound) {
    button.dataset.e096Bound = '1';
    button.addEventListener('click', () => {
      focusMode = !focusMode;
      button.setAttribute('aria-pressed', focusMode ? 'true' : 'false');
      layout.classList.toggle(FOCUS_CLASS, focusMode);
      layout.dataset.e096Focus = focusMode ? '1' : '0';
    });
  }
}

/* E096-07 — les états vides (chronology.js:353-373, :468-471, :527-535)
 * reçoivent une consigne d'action en langage clair, sans remplacer le texte. */
function guideEmpty(ctx, layout) {
  const tips = {
    'nav-c2a-empty-filter': 'Retirez un thème ou changez de mot-clé pour retrouver des repères.',
    'nav-c2a-empty-era': 'Choisissez une autre ère dans la barre des ères.',
    'nav-c2a-empty-points': 'Consultez un autre repère : celui-ci n’a pas de point documenté.',
    'nav-c2a-empty-event': 'Sélectionnez une carte de la liste pour afficher ses points vérifiés.',
  };
  all(layout, '.atlas-chrono-empty').forEach((empty) => {
    if (empty.querySelector('.e096-tip')) return;
    empty.appendChild(ctx.el('p', 'e096-tip', tips[empty.id] || 'Essayez une autre sélection.'));
  });
}

/* E096-08 — les boutons « précédent / suivant » (chronology.js:508-524) ne
 * disent pas où ils mènent. Le rang est lu dans le kicker réel (`:420`), donc
 * l'étiquette reste juste même quand un filtre réduit la liste affichée. */
function labelNav(aside) {
  if (!aside) return;
  const kicker = aside.querySelector('.aside-kicker');
  const match = kicker && /Repère\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  const actions = aside.querySelector('.aside-actions');
  if (!match || !actions) return;
  const rank = Number(match[1]);
  const total = Number(match[2]);
  const buttons = actions.querySelectorAll('button');
  if (buttons[0]) {
    const label = rank > 1
      ? `Repère précédent : repère ${rank - 1} sur ${total}`
      : 'Repère précédent : aucun repère avant';
    buttons[0].setAttribute('aria-label', label);
    buttons[0].title = label;
  }
  if (buttons[1]) {
    const label = rank < total
      ? `Repère suivant : repère ${rank + 1} sur ${total}`
      : 'Repère suivant : aucun repère après';
    buttons[1].setAttribute('aria-label', label);
    buttons[1].title = label;
  }
}

register('E096', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'chronology') return;
  const layout = ctx.layout
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e096 = '1';
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }
  layout.classList.toggle(FOCUS_CLASS, focusMode);
  layout.dataset.e096Focus = focusMode ? '1' : '0';

  buildBrief(ctx, layout, main);
  buildHelp(ctx, main);
  groupTags(ctx, main);
  buildReset(ctx, main);
  buildFocus(ctx, layout, main);
  wrapPoints(ctx, layout);
  guideEmpty(ctx, layout);
  labelNav(layout.querySelector('#atlas-chrono-aside'));
});
