import { register } from './registry.js';

/* Lentille E029 — passe V2 de la vue Chronologie (viewId « chronologyv2 »).
 * Thème : repère suivant / précédent dans le détail (domaine C — Détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E029.md — chantiers E029-01 à E029-10.
 * Fichier possédé : src/views/chronology/v2/E029.js uniquement. Modèles de lecture
 * autorisés : src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé n'est modifié (registry.js, index.js, styles.css,
 * src/views/chronology.js), ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Une seule feuille CSS via ctx.css('chronology-v2-e029', …), un seul greffon
 * register('E029', (ctx) => { … }). Le registre V2 n'expose pas de say() : la
 * lentille n'ajoute AUCUNE région live, n'écrit dans aucune région existante et
 * se contente d'afficher son état en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants : zéro console.*, zéro fetch/XHR, zéro import distant, zéro
 * Math.random, zéro innerHTML, zéro timer, zéro requestAnimationFrame. Tous les
 * IDs DOM sont préfixés « chronology-v2-e029- » et protégés par une garde
 * d'existence (ensureNode) pour survivre aux rendus successifs de la coque.
 */

const CSS_ID = 'chronology-v2-e029';

const PANEL_ID = 'chronology-v2-e029-panel';
const TITLE_ID = 'chronology-v2-e029-title';
const LEDE_ID = 'chronology-v2-e029-lede';
const PREVIEW_ID = 'chronology-v2-e029-preview';
const DESC_ID = 'chronology-v2-e029-desc';
const METRIC_IDS = {
  preview: 'chronology-v2-e029-metric-preview',
  position: 'chronology-v2-e029-metric-position',
  boundary: 'chronology-v2-e029-metric-boundary',
  keyboard: 'chronology-v2-e029-metric-keyboard',
  semantic: 'chronology-v2-e029-metric-semantic',
  era: 'chronology-v2-e029-metric-era',
  focus: 'chronology-v2-e029-metric-focus',
  motion: 'chronology-v2-e029-metric-motion',
};

/* E029-09 : une seule feuille, injectée une fois. Les règles ciblent la classe
   posée sur les boutons réels et le panneau local ; elles ne remplacent pas la
   grille de la vue et ne masquent ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 14px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px;
    line-height: 1.55; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e029-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e029-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e029-preview { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e029-preview-row {
    display: flex; align-items: baseline; gap: 8px;
    margin: 0; padding: 5px 0;
  }
  #${PANEL_ID} .e029-preview-row + .e029-preview-row {
    border-top: 1px dashed var(--line);
  }
  #${PANEL_ID} .e029-arrow {
    flex: 0 0 14px; color: var(--gold-bright); font-size: 13px;
  }
  #${PANEL_ID} .e029-kind {
    flex: 0 0 62px; color: var(--muted);
    font-size: 9px; letter-spacing: .04em; text-transform: uppercase;
  }
  #${PANEL_ID} .e029-target { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e029-target-name { display: block; color: var(--ink); font-weight: 600; }
  #${PANEL_ID} .e029-target-name[data-e029-limit="1"] {
    color: var(--muted-2); font-style: italic; font-weight: 400;
  }
  #${PANEL_ID} .e029-target-year { display: block; color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e029-metric { margin: 4px 0 0; }
  #${PANEL_ID} .e029-desc { margin: 6px 0 0; color: var(--muted); font-size: 10px; }
  #${PANEL_ID} .e029-metric:last-child { color: var(--muted-2); font-size: 9px; }

  .chronology-v2-e029-nav-btn {
    min-height: 44px; padding: 8px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    color: var(--ink); font: inherit; font-size: 11px; cursor: pointer;
  }
  .chronology-v2-e029-nav-btn:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  .chronology-v2-e029-nav-btn[data-e029-boundary="1"] {
    border-style: dashed; color: var(--muted-2);
  }
  .chronology-v2-e029-nav-btn[data-e029-cross-era="1"] {
    border-bottom-style: double; border-bottom-width: 3px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e029-preview-row { flex-wrap: wrap; gap: 2px 8px; }
    #${PANEL_ID} .e029-kind { flex-basis: 100%; }
    .chronology-v2-e029-nav-btn { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .chronology-v2-e029-nav-btn {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e029-title, #${PANEL_ID} .e029-arrow,
    #${PANEL_ID} .e029-target-name { color: CanvasText; }
    .chronology-v2-e029-nav-btn {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    .chronology-v2-e029-nav-btn[data-e029-cross-era="1"] { text-decoration: underline; }
  }
`;

/* Sélecteurs tolérants : la passe V2 peut nommer autrement la fiche, la liste
   et les boutons. On ne fait que lire et annoter, jamais renommer ni supprimer. */
const ASIDE_IDS = ['atlas-chrono-aside', 'atlas-chronov2-aside', 'atlas-chronology-aside'];
const LIST_IDS = ['atlas-chrono-events', 'atlas-chronov2-events', 'atlas-chronology-events'];

let installCount = 0;
let lastMove = 'aucun';
let refs = { panel: null, metrics: {}, reduced: false };

/* E029-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant : la coque reconstruisant le stage,
   un nœud de la rendu précédente est détaché et n'est pas retrouvé ailleurs. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
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

/* E029-02, E029-03, E029-07 : lecture des cartes réelles, dans l'ordre du DOM.
   Aucune date ni titre n'est inventé : tout vient du texte et des data-* déjà
   présents dans la passe 1. La carte « courante » est celle portant aria-current
   ou la classe is-active. */
function collectCards(hosts) {
  const found = [];
  const seen = new Set();
  hosts.forEach((host) => {
    host.querySelectorAll('[data-event-id]').forEach((node) => {
      let card = node;
      if (!(node.classList && node.classList.contains('event-card'))) {
        const inner = node.querySelector ? node.querySelector('.event-card') : null;
        if (inner) card = inner;
      }
      const id = node.dataset.eventId || (card.dataset && card.dataset.eventId) || '';
      if (!id || seen.has(id)) return;
      seen.add(id);
      const yearNode = card.querySelector('.event-year, [class*="year"]');
      const titleNode = card.querySelector('strong, [class*="title"]');
      found.push({
        id,
        year: ((yearNode && yearNode.textContent) || '').trim(),
        title: ((titleNode && titleNode.textContent) || '').trim()
          || ((card.textContent || '').trim().slice(0, 60)),
        eraId: node.dataset.eraId || (card.dataset && card.dataset.eraId) || '',
        current: card.getAttribute('aria-current') === 'true'
          || Boolean(card.classList && card.classList.contains('is-active')),
      });
    });
  });
  return found;
}

/* Repli quand aucune carte ne porte aria-current : le kicker « Repère X / Y »
   de la fiche donne le rang courant (chronology.js:421). */
function rankFromKicker(hosts) {
  let rank = 0;
  hosts.forEach((host) => {
    host.querySelectorAll('.aside-kicker').forEach((kicker) => {
      const match = ((kicker.textContent || '').trim()).match(/Repère\s+(\d+)\s*\/\s*\d+/);
      if (match && !rank) rank = Number(match[1]) - 1;
    });
  });
  return rank;
}

/* E029-01, E029-04, E029-05, E029-06, E029-07, E029-08, E029-09 : repérage
   des boutons réels « Repère précédent / suivant » (chronology.js:509-510). */
function findNavButtons(hosts) {
  let prev = null;
  let next = null;
  hosts.forEach((host) => {
    host.querySelectorAll('button').forEach((button) => {
      const text = (button.textContent || '').toLowerCase();
      if (/précédent|precedent/.test(text) && !prev) prev = button;
      if (/suivant/.test(text) && !next) next = button;
    });
  });
  return { prev, next };
}

function targetLabel(target, kind) {
  if (!target) return kind === 'prev' ? 'Début de la frise' : 'Fin de la frise';
  return target.title || `Repère ${target.id}`;
}

function annotateButton(button, target, kind, current, stats) {
  if (!(button instanceof Element)) return;
  button.classList.add('chronology-v2-e029-nav-btn');

  /* E029-01 : aria-label unique, incluant le repère cible et son année. */
  const name = targetLabel(target, kind);
  const detail = target && target.year ? ` (${target.year})` : '';
  const label = `${kind === 'prev' ? 'Repère précédent' : 'Repère suivant'} : ${name}${detail}.`;
  if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);

  /* E029-05 : équivalence clavier documentée, sans aucun écouteur de touche. */
  const shortcut = kind === 'prev' ? 'ArrowLeft' : 'ArrowRight';
  if (button.getAttribute('aria-keyshortcuts') !== shortcut) {
    button.setAttribute('aria-keyshortcuts', shortcut);
  }

  /* E029-06 : liaison vers la description locale du panneau. */
  if (button.getAttribute('aria-describedby') !== DESC_ID) {
    button.setAttribute('aria-describedby', DESC_ID);
  }

  /* E029-04 : état aux bornes, doublé en texte visible dans le panneau. */
  button.dataset.e029Boundary = target ? '0' : '1';
  if (!target) stats.boundary += 1;

  /* E029-07 : franchissement d'ère déduit des data-era-id des cartes. */
  const crosses = Boolean(target && current && target.eraId && current.eraId
    && target.eraId !== current.eraId);
  button.dataset.e029CrossEra = crosses ? '1' : '0';
  if (crosses) stats.crossEra += 1;

  /* E029-08 : observation du dernier déplacement, sans preventDefault ni focus. */
  if (button.dataset.e029Observed !== '1') {
    button.dataset.e029Observed = '1';
    button.addEventListener('click', () => {
      lastMove = kind === 'prev' ? 'précédent' : 'suivant';
      refresh();
    });
  }
  stats.annotated += 1;
}

function renderPreview(make, preview, prevTarget, nextTarget) {
  const rows = [
    { kind: 'précédent', arrow: '←', target: prevTarget },
    { kind: 'suivant', arrow: '→', target: nextTarget },
  ].map((entry) => {
    const row = make('li', 'e029-preview-row');
    const name = make('span', 'e029-target-name', targetLabel(entry.target, entry.arrow === '←' ? 'prev' : 'next'));
    name.dataset.e029Limit = entry.target ? '0' : '1';
    const year = make('span', 'e029-target-year', entry.target && entry.target.year
      ? entry.target.year : 'aucune borne au-delà');
    const target = make('span', 'e029-target');
    target.append(name, year);
    row.append(
      make('span', 'e029-arrow', entry.arrow),
      make('span', 'e029-kind', entry.kind),
      target
    );
    return row;
  });
  preview.replaceChildren(...rows);
  return rows.length;
}

function refresh() {
  const { panel, metrics, reduced } = refs;
  if (!panel || !panel.isConnected) return;
  const data = panel.dataset;

  write(metrics.preview,
    `Aperçu des cibles : ${data.e029Prev || '—'} ← · → ${data.e029Next || '—'}. Les deux étiquettes sont lues sur les cartes, aucune donnée n'est inventée.`);
  write(metrics.position,
    `Position : repère ${data.e029Rank || '0'} sur ${data.e029Total || '0'} · chaque bouton avance d'un rang dans l'ordre global des repères.`);
  write(metrics.boundary,
    `Bornes : ${Number(data.e029Boundary || 0)} bouton(s) désactivé(s) en bout de frise — l'état est doublé par un texte et un style de lisière en pointillés.`);
  write(metrics.keyboard,
    `Clavier : ← repère précédent · → repère suivant (raccourcis du routeur, documentés via aria-keyshortcuts) — aucune touche n'est interceptée.`);
  write(metrics.semantic,
    `Sémantique : aria-label nomme la cible, aria-describedby pointe vers la notice locale, aria-controls vise la fiche déjà mise à jour par la vue.`);
  write(metrics.era,
    `Ère : ${Number(data.e029CrossEra || 0)} franchissement(s) signalé(s) — l'info est portée par un attribut, un soulignement et un texte, jamais par la couleur seule.`);
  write(metrics.focus,
    `Dernier déplacement observé : ${lastMove} · le focus reste géré par la vue (carte du repère cible) ; aucune focalisation n'est forcée.`);
  write(metrics.motion,
    `Greffon installé ${installCount} fois · une seule feuille CSS · mouvement réduit : ${reduced ? 'oui' : 'non'} (aucune animation ajoutée).`);
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function') return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const asideHosts = firstById(ASIDE_IDS, ctx);
  const listHosts = firstById(LIST_IDS, ctx);
  const allHosts = [];
  asideHosts.concat(listHosts).forEach((host) => {
    if (!allHosts.includes(host)) allHosts.push(host);
  });
  if (!allHosts.length) return;
  const host = asideHosts[0] || allHosts[0];

  const panel = ensureNode(make, PANEL_ID, 'section', 'e029-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e029-title', 'Suivant / précédent — navigation dans le détail');
  title.id = TITLE_ID;
  const lede = make('p', 'e029-lede', 'Diagnostic local de la navigation entre repères : il nomme la cible des boutons, affiche leur aperçu et leur position, et signale les bornes et les changements d’ère. Il ne déplace aucun repère et ne remplace aucun contrôle.');
  lede.id = LEDE_ID;

  const preview = make('ul', 'e029-preview');
  preview.id = PREVIEW_ID;

  const desc = make('p', 'e029-desc', 'Navigation entre repères : le bouton ouvre le repère adjacent et met à jour la fiche. Le focus revient à la carte du repère cible, comme le prévoit la vue.');
  desc.id = DESC_ID;

  const metrics = {};
  const nodes = [];
  Object.keys(METRIC_IDS).forEach((key) => {
    const node = make('p', 'e029-metric');
    node.id = METRIC_IDS[key];
    metrics[key] = node;
    nodes.push(node);
  });

  panel.replaceChildren(title, lede, preview, desc, ...nodes);

  const cards = collectCards(allHosts);
  let currentIndex = cards.findIndex((card) => card.current);
  if (currentIndex < 0) currentIndex = Math.max(0, Math.min(cards.length - 1, rankFromKicker(asideHosts)));
  const current = cards[currentIndex] || null;
  const prevTarget = currentIndex > 0 ? cards[currentIndex - 1] : null;
  const nextTarget = currentIndex >= 0 && currentIndex < cards.length - 1 ? cards[currentIndex + 1] : null;

  const stats = { annotated: 0, boundary: 0, crossEra: 0 };
  const buttons = findNavButtons(asideHosts.length ? asideHosts : allHosts);
  annotateButton(buttons.prev, prevTarget, 'prev', current, stats);
  annotateButton(buttons.next, nextTarget, 'next', current, stats);

  const rows = renderPreview(make, preview, prevTarget, nextTarget);

  panel.dataset.e029Prev = targetLabel(prevTarget, 'prev');
  panel.dataset.e029Next = targetLabel(nextTarget, 'next');
  panel.dataset.e029Rank = String(currentIndex + 1);
  panel.dataset.e029Total = String(cards.length);
  panel.dataset.e029Boundary = String(stats.boundary);
  panel.dataset.e029CrossEra = String(stats.crossEra);
  panel.dataset.e029Annotated = String(stats.annotated);
  panel.dataset.e029PreviewRows = String(rows);
  panel.dataset.e029Installs = String(installCount);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, metrics, reduced };
  refresh();
}

/* Un seul enregistrement, avec le ctx explicite imposé par le contrat V2. */
register('E029', (ctx) => {
  install(ctx);
});
