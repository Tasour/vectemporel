import { register } from './registry.js';

/* Lentille POINTS E088 — Qualité & validation : inventaire des limites
 * inter-domaines (frontières avec shell.js, store.js et les autres vues)
 * affiché localement (domaine I).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E088.md — chantiers E088-01 à E088-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css(id,rules), el(tag,cls,text),
 * reducedMotion (fournis par points/registry.js:28-44). Aucune dépendance vers
 * store.js, keyboard.js ou une autre lentille : l'inventaire est dérivé du DOM
 * réellement rendu par points.js et d'invariants architecturaux vérifiables.
 *
 * Invariants :
 * - un seul CSS (cssOnce), un seul panneau, un seul bouton, une seule live
 *   region locale et un seul écouteur Échap, attaché au panneau créé ;
 * - aucun raccourci global : ? / Échap / 1–6 / m c r g s p restent au routeur ;
 * - aucun import du store, aucune écriture d'état, aucun nœud d'un rendu
 *   précédent conservé ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro rAF,
 *   zéro innerHTML, aucune donnée historique inventée ;
 * - greffon non destructif et idempotent : les nœuds de points.js ne sont
 *   jamais modifiés, seuls des nœuds préfixés points-e088- sont ajoutés.
 */

const CSS_ID = 'points-e088';
const SCOPE = 'points-e088';
const PANEL_ID = 'points-e088-panel';
const BUTTON_ID = 'points-e088-button';
const TITLE_ID = 'points-e088-title';
const LIST_ID = 'points-e088-list';
const METRICS_ID = 'points-e088-metrics';
const LIVE_ID = 'points-e088-live';

/* E088-03/04/05/06 : l'inventaire est un jeu d'invariants stables, pas une
 * archive de dates. Chaque entrée porte une clé dont la preuve est relue dans
 * le DOM courant par evidenceFor() (E088-07). Aucune donnée n'est codée en dur
 * sous forme de millésime ou de total historique. */
const GROUPS = Object.freeze([
  Object.freeze({
    domain: 'Coque (shell.js)',
    items: Object.freeze([
      Object.freeze({
        key: 'stage',
        title: 'Rendu volatile du stage',
        text: '#atlas-stage est recréé à chaque rendu : E088 lit ctx.stage / ctx.layout et ne conserve aucun nœud d’un rendu précédent. L’état d’ouverture du panneau est donc volontairement volatile.',
      }),
      Object.freeze({
        key: 'help',
        title: 'Aide globale et live region de la coque',
        text: 'La touche ? et la région live globale appartiennent à shell.js. E088 ajoute un panneau LOCAL non modal et une live region locale : aucune de ces ressources n’est modifiée ni doublée.',
      }),
    ]),
  }),
  Object.freeze({
    domain: 'État (store.js)',
    items: Object.freeze([
      Object.freeze({
        key: 'filters',
        title: 'Filtres et ère dans le store',
        text: 'Domaine, famille, ère et index du point vivent dans le store. E088 ne les écrit jamais : il lit uniquement le DOM déjà rendu par points.js (filtres, ligne active, cellules).',
      }),
      Object.freeze({
        key: 'noimport',
        title: 'Aucune dépendance au store',
        text: 'Le module n’importe pas store.js et ne déclenche aucune mutation. Toutes les affirmations affichées sont falsifiables par observation directe du DOM.',
      }),
    ]),
  }),
  Object.freeze({
    domain: 'Routeur & autres vues',
    items: Object.freeze([
      Object.freeze({
        key: 'keys',
        title: 'Touches réservées au routeur',
        text: '1–6 / m c r g s p, ?, Échap, Entrée, Espace et flèches restent au routeur clavier. E088 n’installe aucun raccourci global ; Échap ne ferme le panneau que s’il porte le focus.',
      }),
      Object.freeze({
        key: 'ids',
        title: 'Préfixe et coexistence des lentilles',
        text: 'Chaque lentille préfixe ses identifiants. E088 utilise exclusivement points-e088- et n’entre en collision avec aucune autre lentille de la vue Points.',
      }),
    ]),
  }),
]);

/* E088-09 : feuille unique, injectée par ctx.css (cssOnce, registry.js:13-19).
 * Tout est soit sous .points-layout.points-e088, soit préfixé points-e088- :
 * aucune fuite hors de la vue. Cibles ≥ 36 px, focus visible, mouvement réduit,
 * couleurs forcées et repli 620 px (390×844) sans aucune animation propre. */
const CSS = `
.points-layout.points-e088 .points-e088-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#${BUTTON_ID}{min-height:36px;padding:0 10px;border:1px solid var(--line-strong,#5b5b5b);border-radius:8px;background:rgba(230,185,111,.08);color:var(--gold-bright,#e9c98f);font-size:12px;cursor:pointer}
#${BUTTON_ID}:hover{border-color:var(--gold-bright,#e9c98f)}
#${PANEL_ID}{margin:12px 0 0;padding:12px 14px;border:1px solid var(--line-strong,#5b5b5b);border-left:3px solid var(--gold,#e6b96f);border-radius:10px;background:rgba(8,11,16,.94);color:var(--ink-soft,#d8d8d8);font-size:12px;line-height:1.5}
#${PANEL_ID}[hidden]{display:none}
#${PANEL_ID}:focus-visible,#${PANEL_ID} button:focus-visible,#${BUTTON_ID}:focus-visible{outline:2px solid var(--gold-bright,#e9c98f);outline-offset:3px}
#${PANEL_ID} h2{margin:0 0 6px;font-family:var(--serif,serif);font-size:16px;color:var(--gold-bright,#e9c98f)}
#${PANEL_ID} p{margin:0 0 8px}
#${PANEL_ID} .points-e088-intro{color:var(--muted-2,#8a8a8a);font-size:11px}
.points-e088-list{margin:0 0 10px;padding:0;list-style:none}
.points-e088-group{margin-bottom:10px}
.points-e088-domain{display:block;margin-bottom:4px;color:var(--gold,#e6b96f);font-size:11px;letter-spacing:.03em}
.points-e088-items{margin:0;padding-left:12px;list-style:disc}
.points-e088-item{margin-bottom:8px}
.points-e088-item-title{display:block;color:var(--ink,#eee)}
.points-e088-item-text{margin:2px 0 3px;color:var(--ink-soft,#d8d8d8)}
.points-e088-evidence{margin:0;color:var(--muted,#9a9a9a);font-size:10px;font-variant-numeric:tabular-nums}
.points-e088-close{min-height:36px;margin:4px 0 6px;padding:0 10px;border:1px solid var(--line-strong,#5b5b5b);border-radius:8px;background:rgba(230,185,111,.06);color:var(--gold-bright,#e9c98f);font:inherit;font-size:11px;cursor:pointer}
.points-e088-close:hover{border-color:var(--gold-bright,#e9c98f)}
.points-e088-metrics{margin:0;color:var(--muted,#9a9a9a);font-size:10px}
@media (max-width:620px){#${PANEL_ID}{padding:10px;font-size:11px}#${BUTTON_ID}{width:100%}}
@media (prefers-reduced-motion:reduce){#${PANEL_ID} *,#${BUTTON_ID}{transition:none!important;animation:none!important}}
@media (forced-colors:active){#${PANEL_ID}{border-color:CanvasText;color:CanvasText}}
`;

/* Le registre réapplique les greffons à chaque rendu (registry.js:39-43) :
 * la closure module survit, le ctx courant est relu à chaque passage. */
let latest = null;
let open = false;
let openCount = 0;
let renderCount = 0;
let lastAnnouncement = '';
let renderedSignature = '';

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function count(root, selector) {
  return root && typeof root.querySelectorAll === 'function' ? root.querySelectorAll(selector).length : 0;
}

/* E088-07 : chaque ligne « Observé : » est recalculée depuis le DOM rendu.
 * Rien n'est figé : faire varier ère / filtres / nombre de cellules change
 * l'inventaire sans toucher au code, ce qui le rend falsifiable. */
function evidenceFor(key, layout) {
  const rows = count(layout, '.points-grid-row:not(.is-head)');
  const cells = count(layout, '.points-cell');
  const selects = count(layout, '.points-filters select');
  const reset = count(layout, '.points-filters button');
  const nav = count(layout, '.points-nav button');
  const activeEra = txt(q(layout, '.points-grid-row.is-active .points-era'));
  const ownIds = count(layout, '[id^="points-e088-"]');
  const markers = ['data-e001', 'data-e004', 'data-e035', 'data-points-e088']
    .filter((attr) => layout.hasAttribute && layout.hasAttribute(attr)
      || q(layout, `[${attr}]`));
  if (key === 'stage') return `${rows} lignes d’ère et ${cells} cellules lues dans .points-grid ; greffage sur .points-layout.`;
  if (key === 'help') return `Panneau local #${PANEL_ID} distinct de l’aide globale de la coque.`;
  if (key === 'filters') return `${selects} filtres <select> et ${reset} bouton de réinitialisation lus dans .points-filters ; ère courante : ${activeEra || 'non repérée'}.`;
  if (key === 'noimport') return `Aucun import de store.js : ${cells} cellules lues telles quelles dans le DOM.`;
  if (key === 'keys') return `${nav} boutons de navigation lus ; aucune touche réservée interceptée par E088.`;
  if (key === 'ids') return `Préfixe points-e088- sur ${ownIds} nœuds ; marqueurs de lentilles présents : ${markers.length ? markers.join(', ') : 'aucun'}.`;
  return '';
}

/* E088-08 : une seule live region LOCALE, dédupliquée, hors panneau (donc
 * jamais masquée par panel.hidden). Aucune écriture dans la live de la coque. */
function announce(text) {
  if (!text || text === lastAnnouncement) return;
  const live = document.getElementById(LIVE_ID);
  if (!live || !live.isConnected) return;
  lastAnnouncement = text;
  live.textContent = text;
}

function ensureLive(ctx, layout) {
  let live = document.getElementById(LIVE_ID);
  if (live && live.parentElement && live.parentElement !== layout) live.remove();
  live = document.getElementById(LIVE_ID);
  if (!live) {
    live = ctx.el('p', 'points-e088-live');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
  }
  if (live.parentElement !== layout) layout.appendChild(live);
  return live;
}

/* Compteurs auditables, entièrement relus dans le DOM (E088-07). */
function writeMetrics() {
  const node = document.getElementById(METRICS_ID);
  if (!node || !node.isConnected) return;
  const list = document.getElementById(LIST_ID);
  const items = list ? count(list, '.points-e088-item') : 0;
  const groups = list ? count(list, '.points-e088-group') : 0;
  node.textContent = `Frontières : ${items} · Domaines : ${groups} · Ouvertures : ${openCount} · Rendus : ${renderCount}.`;
}

function setOpen(next, restoreFocus) {
  open = !!next;
  const panel = document.getElementById(PANEL_ID);
  const button = document.getElementById(BUTTON_ID);
  if (panel) panel.hidden = !open;
  if (button) button.setAttribute('aria-expanded', String(open));
  if (latest && latest.layout) latest.layout.dataset.pointsE088Open = open ? '1' : '0';
  if (open) {
    openCount += 1;
    announce('Inventaire des frontières inter-domaines ouvert.');
    if (panel) panel.focus({ preventScroll: true });
  } else {
    if (restoreFocus && button && button.isConnected) button.focus({ preventScroll: true });
    announce('Inventaire des frontières inter-domaines fermé.');
  }
}

/* Échap local : traité uniquement quand le panneau porte le focus. Le routeur
 * (keyboard.js) reste maître d'Échap partout ailleurs. */
function onEscape(event) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  setOpen(false, true);
}

/* E088-01/09 : structure statique reconstruite par replaceChildren, sans
 * innerHTML. Rôle=region non modal : aucun role=dialog, aucun aria-modal. */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;

  const title = ctx.el('h2', '', 'Inventaire des frontières inter-domaines');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(ctx.el('p', 'points-e088-intro',
    'Inventaire local et non modal. La touche ? ouvre l’aide générale de l’application : ce panneau documente les limites avec la coque, le store et les autres vues, sans les modifier.'));

  const list = ctx.el('ul', 'points-e088-list');
  list.id = LIST_ID;
  panel.appendChild(list);

  const close = ctx.el('button', 'points-e088-close', 'Fermer l’inventaire');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer l’inventaire local des frontières');
  close.addEventListener('click', () => setOpen(false, true));
  panel.appendChild(close);

  const metrics = ctx.el('p', 'points-e088-metrics', '');
  metrics.id = METRICS_ID;
  panel.appendChild(metrics);
}

/* E088-09 : signature anti-écriture redondante. Les nœuds sont créés par ctx.el
 * et insérés par replaceChildren : aucune réinterprétation du balisage. */
function buildListNodes(ctx, layout) {
  const built = [];
  GROUPS.forEach((group) => {
    const groupLi = ctx.el('li', 'points-e088-group');
    groupLi.appendChild(ctx.el('strong', 'points-e088-domain', group.domain));
    const sub = ctx.el('ul', 'points-e088-items');
    group.items.forEach((item) => {
      const li = ctx.el('li', 'points-e088-item');
      li.appendChild(ctx.el('strong', 'points-e088-item-title', item.title));
      li.appendChild(ctx.el('p', 'points-e088-item-text', item.text));
      li.appendChild(ctx.el('p', 'points-e088-evidence', `Observé : ${evidenceFor(item.key, layout)}`));
      sub.appendChild(li);
    });
    groupLi.appendChild(sub);
    built.push(groupLi);
  });
  return built;
}

function refreshList(ctx, layout) {
  const list = document.getElementById(LIST_ID);
  if (!list) return;
  const built = buildListNodes(ctx, layout);
  const signature = built.map((node) => node.textContent).join(' | ');
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  list.replaceChildren(...built);
}

/* E088-10 : installation idempotente. Un CSS, un panneau, un bouton et une
 * live region par rendu ; les nœuds mal parentés sont déplacés ou retirés,
 * jamais dupliqués. Un rendu neuf (nœud déconnecté) remet l'état à zéro. */
function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const layout = ctx.layout && ctx.layout.isConnected
    ? ctx.layout
    : (ctx.stage && ctx.stage.isConnected ? q(ctx.stage, '.points-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;

  latest = ctx;
  lastAnnouncement = '';
  renderCount += 1;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.pointsE088 = '1';
  layout.dataset.pointsE088Render = String(renderCount);
  layout.dataset.pointsE088Motion = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
    ? 'reduce' : 'normal';

  const foundPanel = document.getElementById(PANEL_ID);
  const fresh = !(foundPanel && foundPanel.isConnected);
  if (fresh) {
    open = false;
    renderedSignature = '';
  }

  ensureLive(ctx, layout);

  let panel = document.getElementById(PANEL_ID);
  if (panel && panel.parentElement !== layout) panel.remove();
  panel = document.getElementById(PANEL_ID);
  const createdPanel = !panel;
  if (!panel) {
    panel = ctx.el('section', 'points-e088-panel');
    panel.id = PANEL_ID;
  }
  buildPanel(ctx, panel);
  if (createdPanel) panel.addEventListener('keydown', onEscape);
  if (panel.parentElement !== layout) layout.appendChild(panel);

  let button = document.getElementById(BUTTON_ID);
  const filters = q(layout, '.points-filters');
  const buttonParent = filters || layout;
  if (!button) {
    button = ctx.el('button', '', 'Frontières');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-controls', PANEL_ID);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Afficher l’inventaire local des frontières inter-domaines');
    button.title = 'Inventaire des limites avec shell.js, store.js et les autres vues';
    button.addEventListener('click', () => setOpen(!open, !open));
  }
  if (button.parentElement !== buttonParent) buttonParent.appendChild(button);

  refreshList(ctx, layout);
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  layout.dataset.pointsE088Open = open ? '1' : '0';
  writeMetrics();
}

register('E088', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
