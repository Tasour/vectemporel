import { register } from './registry.js';

/* Lentille V2 E030 — domaine C (détail & fiche) de la passe V2 de la vue
 * Chronologie (thème « E030 » de UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json) :
 * « ancre locale de retour à la frise ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E030.md — chantiers E030-01 à E030-10.
 * Fichier possédé : src/views/chronology/v2/E030.js uniquement. Modèles de lecture
 * autorisés : src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé n'est modifié (registry.js, index.js, styles.css,
 * src/views/chronology.js), ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Une seule feuille CSS via ctx.css('chronology-v2-e030', …), un seul greffon
 * register('E030', (ctx) => { … }). Le registre V2 n'expose pas de say() : la
 * lentille n'ajoute AUCUNE région live, n'écrit dans aucune région existante et
 * affiche son état en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants : zéro console.*, zéro fetch/XHR, zéro import distant, zéro
 * Math.random, zéro innerHTML, zéro timer, zéro rAF, zéro écouteur de touche.
 * Tous les IDs DOM sont préfixés « chronology-v2-e030- » et protégés par une
 * garde d'existence (ensureNode) pour survivre aux rendus successifs de la coque.
 */

const CSS_ID = 'chronology-v2-e030';
const PANEL_ID = 'chronology-v2-e030-panel';
const TITLE_ID = 'chronology-v2-e030-title';
const LEDE_ID = 'chronology-v2-e030-lede';
const TARGET_ID = 'chronology-v2-e030-target';
const LINK_TOP_ID = 'chronology-v2-e030-link-top';
const LINK_BOTTOM_ID = 'chronology-v2-e030-link-bottom';
const NOTICE_ID = 'chronology-v2-e030-notice';
const STATUS_ID = 'chronology-v2-e030-status';
const TARGET_CLASS = 'chronology-v2-e030-cible';

const METRIC_IDS = Object.freeze({
  target: 'chronology-v2-e030-metric-target',
  label: 'chronology-v2-e030-metric-label',
  available: 'chronology-v2-e030-metric-available',
  distinction: 'chronology-v2-e030-metric-distinction',
  bottom: 'chronology-v2-e030-metric-bottom',
  highlight: 'chronology-v2-e030-metric-highlight',
  motion: 'chronology-v2-e030-metric-motion',
  renders: 'chronology-v2-e030-metric-renders',
});
const METRIC_LABELS = Object.freeze({
  target: 'Cible d’ancrage',
  label: 'Libellé du lien',
  available: 'Disponibilité',
  distinction: 'Retour local / retour global',
  bottom: 'Emplacements',
  highlight: 'Repère visuel sur la frise',
  motion: 'Mouvement',
  renders: 'Cycle de vie',
});

/* Sélecteurs tolérants : la passe V2 peut nommer différemment la fiche, la
 * liste de repères et le bouton global. On ne fait que lire et annoter, jamais
 * renommer ni supprimer un nœud existant. */
const ASIDE_IDS = ['atlas-chrono-aside', 'atlas-chronov2-aside', 'atlas-chronology-aside'];
const LIST_IDS = ['atlas-chrono-events', 'atlas-chronov2-events', 'atlas-chronology-events'];
const BACK_IDS = ['nav-c2a-back', 'atlas-chrono-back'];
const CURRENT_SELECTORS = [
  '.event-card[aria-current="true"]',
  '.event-card[aria-current="page"]',
  '.event-card.is-active',
  '[data-event-id][aria-current="true"]',
  '[data-event-id].is-active',
];

/* E030-02, E030-03, E030-04, E030-06, E030-07, E030-08, E030-09 : une seule
   feuille. L'ancre est un bloc en flux normal de la fiche : elle n'ajoute aucune
   modale, ne recouvre rien et ne détourne aucun gestionnaire de la vue. */
const CSS = `
  #${PANEL_ID} {
    margin: 12px 0 4px; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px;
    line-height: 1.5; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e030-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e030-lede { margin: 0 0 7px; color: var(--muted); }
  #${PANEL_ID} .e030-target {
    margin: 0 0 6px; padding: 5px 8px;
    border: 1px dashed var(--line); border-radius: 7px;
    color: var(--ink); font-size: 10px;
  }
  /* E030-01 et E030-06 : deux ancres natives, haut et bas de la fiche.
     La hauteur minimale de 44 px garantit une cible tactile utilisable. */
  #${PANEL_ID} .e030-link {
    display: flex; align-items: center; justify-content: center;
    min-height: 44px; margin: 6px 0; padding: 8px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 11px; text-align: center;
    text-decoration: none; cursor: pointer;
  }
  #${PANEL_ID} .e030-link:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  /* E030-04 : état indisponible porté par la lisière en pointillés ET par le
     texte « indisponible », jamais par la seule couleur. */
  #${PANEL_ID} .e030-link[aria-disabled="true"] {
    border-style: dashed; color: var(--muted-2); cursor: default;
  }
  #${PANEL_ID} .e030-notice { margin: 2px 0 8px; color: var(--muted); font-size: 10px; }
  #${PANEL_ID} .e030-metrics { margin: 6px 0 0; }
  #${PANEL_ID} .e030-key {
    margin: 0; color: var(--muted); font-size: 9px;
    letter-spacing: .02em; text-transform: uppercase;
  }
  #${PANEL_ID} .e030-val { margin: 0 0 5px; color: var(--ink); font-size: 10px; }
  #${PANEL_ID} .e030-status {
    margin: 7px 0 2px; padding-top: 6px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  /* E030-07 : la carte cible de la frise reçoit un repère de forme
     (lisière en pointillés + soulignement pointillé), doublé par le texte
     métrique de la fiche : aucune information ne dépend de la teinte seule. */
  .${TARGET_CLASS} { outline: 2px dashed var(--gold); outline-offset: 2px; }
  .${TARGET_CLASS} strong {
    text-decoration: underline; text-decoration-style: dotted;
    text-underline-offset: 3px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e030-link { width: 100%; }
    #${PANEL_ID} .e030-target { overflow-wrap: anywhere; }
  }
  /* E030-08 : neutralisation défensive. Aucun mouvement n'est créé ici ;
     scroll-behavior est forcé à « auto », jamais à « smooth ». */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .${TARGET_CLASS} {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  /* E030-09 : lisibilité en couleurs forcées par le texte et la bordure. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e030-title, #${PANEL_ID} .e030-key, #${PANEL_ID} .e030-val,
    #${PANEL_ID} .e030-target, #${PANEL_ID} .e030-status,
    #${PANEL_ID} .e030-notice, #${PANEL_ID} .e030-lede { color: CanvasText; }
    #${PANEL_ID} .e030-link {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    .${TARGET_CLASS} { outline: 2px dashed CanvasText; }
    .${TARGET_CLASS} strong { text-decoration: underline; }
  }
`;

let installs = 0;
let clicks = 0;
const observed = new WeakSet();
let refs = {
  panel: null, links: [], notice: null, status: null, target: null,
  metrics: {}, info: null, reduced: false,
};

/* E030-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédente est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écritures dédupliquées : deux rendus sans changement ne touchent aucun texte
   ni aucun attribut. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function attribute(node, name, value) {
  if (!node) return;
  if (value === null || value === undefined || value === '') {
    if (node.hasAttribute(name)) node.removeAttribute(name);
    return;
  }
  const text = String(value);
  if (node.getAttribute(name) !== text) node.setAttribute(name, text);
}

function firstById(ids, ctx) {
  const found = [];
  ids.forEach((id) => {
    const node = document.getElementById(id);
    if (node instanceof Element && !found.includes(node)) found.push(node);
  });
  if (ctx) {
    [ctx.stage, ctx.layout].forEach((node) => {
      if (node instanceof Element && !found.includes(node)) found.push(node);
    });
  }
  return found;
}

function cardFrom(node) {
  if (node.classList && node.classList.contains('event-card')) return node;
  return node.querySelector ? (node.querySelector('.event-card') || node) : node;
}

/* E030-02 : la cible est dérivée de la carte courante réellement présente dans
   le DOM (aria-current puis is-active, repli sur la première carte). Aucun id,
   aucune année ni aucun titre n'est codé en dur dans le module. */
function findCurrentCard(hosts) {
  for (const host of hosts) {
    for (const selector of CURRENT_SELECTORS) {
      const node = host.querySelector(selector);
      if (node instanceof Element) return { card: cardFrom(node), source: selector };
    }
  }
  for (const host of hosts) {
    const node = host.querySelector('.event-card, [data-event-id]');
    if (node instanceof Element) return { card: cardFrom(node), source: 'première carte' };
  }
  return { card: null, source: 'aucune' };
}

function targetFor(card) {
  if (!(card instanceof Element)) return null;
  let id = card.id || '';
  if (!id && typeof card.closest === 'function') {
    const li = card.closest('li[id]');
    if (li) id = li.id;
  }
  const titleNode = card.querySelector('strong, [class*="title"]');
  const yearNode = card.querySelector('.event-year, [class*="year"]');
  const label = ((titleNode && titleNode.textContent) || (card.textContent || '')).trim().slice(0, 80)
    || 'Repère sans titre';
  const year = ((yearNode && yearNode.textContent) || '').trim();
  return { id, href: id ? `#${id}` : '', label, year };
}

function findList(hosts) {
  for (const id of LIST_IDS) {
    const node = document.getElementById(id);
    if (node instanceof Element) return node;
  }
  for (const host of hosts) {
    const node = host.querySelector('.event-list, [id*="events"]');
    if (node instanceof Element) return node;
  }
  return null;
}

/* E030-05 : le bouton global « Retour au monde » est lu, jamais modifié. Sa
   présence et son identifiant sont publiés pour documenter la distinction. */
function findBackButton(hosts) {
  for (const id of BACK_IDS) {
    const node = document.getElementById(id);
    if (node instanceof Element) return node;
  }
  for (const host of hosts) {
    const buttons = host.querySelectorAll('button');
    for (const button of buttons) {
      if (/retour\s+au\s+monde/i.test((button.textContent || ''))) return button;
    }
  }
  return null;
}

/* E030-07 : annotation de la carte cible. On retire d'abord la marque des
   cartes qui ne sont plus la cible, puis on pose classe et attribut sur la
   bonne : l'opération est idempotente d'un rendu à l'autre. */
function highlightTarget(hosts, card) {
  hosts.forEach((host) => {
    host.querySelectorAll(`.${TARGET_CLASS}`).forEach((node) => {
      if (node !== card) {
        node.classList.remove(TARGET_CLASS);
        if (node.dataset) delete node.dataset.e030Target;
      }
    });
  });
  if (!(card instanceof Element)) return false;
  card.classList.add(TARGET_CLASS);
  if (card.dataset) card.dataset.e030Target = '1';
  return true;
}

function labelFor(info) {
  if (!info.available) return 'Retour à la frise : cible indisponible.';
  return `Retour à la frise : ${info.label}${info.year ? ` (${info.year})` : ''}.`;
}

/* E030-01, E030-03 et E030-04 : le contenu et les attributs des deux ancres
   sont réécrits ici, de façon dédupliquée, à chaque rafraîchissement. */
function paintLinks() {
  const { links, info, notice, target } = refs;
  const available = Boolean(info && info.available);
  const href = available ? info.href : '';
  links.forEach((link) => {
    if (!(link instanceof Element)) return;
    if (href) attribute(link, 'href', href);
    else attribute(link, 'href', '');
    attribute(link, 'aria-disabled', available ? 'false' : 'true');
    attribute(link, 'aria-label', labelFor(info));
    attribute(link, 'aria-controls', info.listId || '');
    attribute(link, 'aria-describedby', NOTICE_ID);
    if (link.dataset) link.dataset.e030Available = available ? '1' : '0';
    write(link, available ? `↑ Retour à la frise — ${info.label}` : '↑ Retour à la frise — cible indisponible');
  });
  write(notice, available
    ? 'Lien natif : Entrée active le retour vers la carte du repère courant ; aucune touche n’est interceptée. Ce retour reste dans la Chronologie.'
    : 'Aucune carte de la frise n’est adressable : le lien est désactivé et ne contient pas de cible. Le bouton global « Retour au monde » reste inchangé.');
  write(target, available
    ? `Cible : ${info.label}${info.year ? ` · ${info.year}` : ''} · source : ${info.source}.`
    : 'Cible : non déterminée · source : aucune carte adressable.');
}

/* E030-02 à E030-09 : toute l'état est affiché en texte visible ordinaire, sans
   role="status", sans aria-live et sans écriture dans une région existante. */
function refresh() {
  const { panel, metrics, status, info, reduced } = refs;
  if (!panel || !panel.isConnected || !info) return;
  const available = Boolean(info.available);
  const d = panel.dataset;

  paintLinks();

  write(metrics.target, `Cible d’ancrage : ${info.href || 'aucune'} — dérivée de ${info.source}, jamais codée en dur.`);
  write(metrics.label, `Libellé : ${labelFor(info)} Le nom et l’année sont lus sur la carte, sans donnée inventée.`);
  write(metrics.available, `Disponibilité : ${available ? 'ancre active avec href' : 'ancre désactivée, sans href'} — état doublé par le texte et la lisière en pointillés.`);
  write(metrics.distinction, `Retour local / retour global : l’ancre revient à la frise dans la même vue ; le bouton ${info.backId ? `#${info.backId}` : 'global absent'} (« ${info.backLabel} ») change de vue et n’est pas modifié.`);
  write(metrics.bottom, `Emplacements : ${refs.links.length} ancres (haut et bas de la fiche) partageant la même cible, chacune avec un identifiant unique préfixé.`);
  write(metrics.highlight, `Repère visuel : ${info.highlighted ? 'la carte cible est marquée' : 'aucune carte à marquer'} — lisière en pointillés et soulignement pointillé, jamais la couleur seule.`);
  write(metrics.motion, `Mouvement réduit : ${reduced ? 'oui' : 'non'} · aucun défilement fluide ni animation n’est introduit.`);
  write(metrics.renders, `Greffon installé ${installs} fois · ${clicks} retour(s) observé(s) · une seule feuille CSS, aucun minuteur.`);
  write(status, `Retour local : ${info.href || '—'} · ${available ? 'disponible' : 'indisponible'} · ${clicks} activation(s) observée(s).`);

  d.e030Target = info.href || '';
  d.e030Source = info.source;
  d.e030Available = available ? '1' : '0';
  d.e030Back = info.backId || 'none';
  d.e030Links = String(refs.links.length);
  d.e030Highlight = info.highlighted ? '1' : '0';
  d.e030Reduced = reduced ? '1' : '0';
  d.e030Clicks = String(clicks);
  d.e030Installs = String(installs);
}

/* Observation purement documentaire des activations : aucun preventDefault,
   aucun stopPropagation, aucun focus() — la navigation fragmentaire reste
   native au navigateur et la restauration de focus reste à la vue. */
function bindReturn(link) {
  if (!(link instanceof Element) || observed.has(link)) return;
  observed.add(link);
  link.addEventListener('click', () => {
    clicks += 1;
    refresh();
  });
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function') return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const hosts = firstById(ASIDE_IDS, ctx);
  if (!hosts.length) return;
  const host = hosts[0];

  const panel = ensureNode(make, PANEL_ID, 'section', 'e030-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e030-title', 'Retour à la frise — ancre locale de la fiche');
  title.id = TITLE_ID;
  const lede = make('p', 'e030-lede', 'Diagnostic local de la fiche : il place un lien de retour vers la frise en haut et en bas du détail, nomme sa cible d’après le repère courant et distingue ce retour du bouton global « Retour au monde ». Il ne déplace aucun repère et ne remplace aucun contrôle.');
  lede.id = LEDE_ID;
  const target = make('p', 'e030-target');
  target.id = TARGET_ID;
  const linkTop = ensureNode(make, LINK_TOP_ID, 'a', 'e030-link', panel);
  const notice = make('p', 'e030-notice');
  notice.id = NOTICE_ID;

  const list = make('dl', 'e030-metrics');
  const metrics = {};
  Object.keys(METRIC_IDS).forEach((key) => {
    const dt = make('dt', 'e030-key', METRIC_LABELS[key]);
    const dd = make('dd', 'e030-val');
    dd.id = METRIC_IDS[key];
    metrics[key] = dd;
    list.append(dt, dd);
  });

  const status = make('p', 'e030-status');
  status.id = STATUS_ID;
  const linkBottom = ensureNode(make, LINK_BOTTOM_ID, 'a', 'e030-link', panel);

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, target, linkTop, notice, list, status, linkBottom);

  const found = findCurrentCard(hosts);
  const cardList = findList(hosts);
  const back = findBackButton(hosts);
  const t = targetFor(found.card);
  const highlighted = highlightTarget(hosts, found.card);
  const info = {
    available: Boolean(t && t.href),
    href: t && t.href ? t.href : '',
    label: t ? t.label : 'Repère non déterminé',
    year: t ? t.year : '',
    source: found.source,
    listId: cardList && cardList.id ? cardList.id : '',
    backId: back && back.id ? back.id : '',
    backLabel: back ? (back.textContent || '').trim() : 'absent',
    highlighted,
  };

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, links: [linkTop, linkBottom], notice, status, target, metrics, info, reduced };
  refresh();
  refs.links.forEach(bindReturn);
}

/* Un seul enregistrement, avec le ctx explicite imposé par le contrat V2. */
register('E030', (ctx) => {
  install(ctx);
});
