import { register } from './registry.js';

/* Lentille E010 — styles d'impression et export papier de la frise
 * (domaine A : frise & ères de la vue Chronologie, passe V2).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E010.md — chantiers E010-01 à E010-10.
 * Fichier possédé : src/views/chronology/v2/E010.js uniquement. Lectures seules :
 * src/views/chronology.js, styles.css, src/views/chronology/v2/registry.js,
 * src/views/chronology/v2/index.js, src/views/chronology/E049.js,
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el,
 * reducedMotion. Le registre V2 ne fournit pas say() : la lentille n'ajoute
 * AUCUNE région live (E041 reste propriétaire des annonces) et n'écrit dans
 * aucune région existante ; son état est un texte visible ordinaire.
 *
 * Invariants :
 * - un seul register('E010', install), un seul ctx.css('chronology-v2-e010', …) ;
 * - une seule feuille, contenant toutes les règles @page et @media print ;
 * - aucun timer, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun innerHTML, aucun print() hors activation explicite ;
 * - tous les IDs sont préfixés chronology-v2-e010- et protégés par ensureNode ;
 * - aucune information n'est portée par la seule couleur sur le papier.
 */

const CSS_ID = 'chronology-v2-e010';
const PANEL_ID = 'chronology-v2-e010-panel';
const TITLE_ID = 'chronology-v2-e010-title';
const LIST_ID = 'chronology-v2-e010-list';
const STATE_ID = 'chronology-v2-e010-state';
const LEGEND_ID = 'chronology-v2-e010-print-legend';
const FOOT_ID = 'chronology-v2-e010-print-footer';
const SUMMARY_ID = 'chronology-v2-e010-print-summary';
const BUTTON_ID = 'chronology-v2-e010-print-button';

/* Une seule feuille : le bloc d'écran (panneau d'audit) et toutes les règles
   papier. Chaque chantier est repérable par son commentaire E010-0N. */
const CSS = `
  /* E010-10 — panneau d'audit en flux normal, jamais modal, jamais superposé. */
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e010-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e010-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e010-list { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e010-item { display: flex; gap: 8px; margin: 0 0 3px; }
  #${PANEL_ID} .e010-code {
    flex: 0 0 66px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 9px; text-align: center;
  }
  #${PANEL_ID} .e010-item-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e010-state { margin: 6px 0 0; color: var(--gold-bright); }
  #${PANEL_ID} .e010-note { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e010-actions { display: flex; margin-top: 9px; }
  #${BUTTON_ID} {
    min-height: 36px; padding: 0 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  #${BUTTON_ID}:hover { border-color: var(--gold); }
  #${BUTTON_ID}:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 3px; }

  /* E010-09 — blocs de papier masqués à l'écran, révélés seulement en print. */
  #${LEGEND_ID}, #${FOOT_ID} { display: none; }

  /* E010-04 — format de page et marges : une feuille A4 prévisible. */
  @page { size: A4 portrait; margin: 14mm 12mm 16mm; }

  @media print {
    /* E010-01 — périmètre : coque, contrôles et panneau d'audit hors papier. */
    .shell-bar, .shell-trail, .shell-footer, .help-overlay, .detail-sheet,
    .atlas-chrono-tools, .nav-c2-back, .aside-actions, .atlas-chrono-hint,
    #${PANEL_ID} { display: none !important; }

    /* E010-02 — encre noire sur fond blanc, quel que soit le thème sombre. */
    html, body, #app, .shell-stage, .chronology-layout,
    .chronology-main, .chronology-aside, .era-band, .event-card,
    .point, .point-sources, #${LEGEND_ID}, #${FOOT_ID}, #${SUMMARY_ID} {
      background: #fff !important;
      background-image: none !important;
      color: #000 !important;
      box-shadow: none !important;
      text-shadow: none !important;
      print-color-adjust: economy;
    }
    .chronology-layout * { color: #000 !important; text-shadow: none !important; }

    /* E010-03 — déroulement intégral : plus de hauteur ni de zone défilante. */
    html, body, #app { height: auto !important; min-height: 0 !important; overflow: visible !important; display: block !important; }
    .shell-stage { height: auto !important; min-height: 0 !important; overflow: visible !important; position: static !important; }
    .chronology-layout { display: block !important; height: auto !important; }
    .chronology-main, .chronology-aside {
      height: auto !important; max-height: none !important;
      overflow: visible !important; padding: 0 0 6mm !important;
    }
    .chronology-aside { border-left: 0 !important; border-top: 1px solid #000 !important; margin-top: 6mm !important; }
    .event-list { display: block !important; columns: 2; column-gap: 6mm; }
    .event-list > li { display: block !important; width: 100% !important; }

    /* E010-04 — pagination douce : aucun bloc coupé, pas de saut forcé. */
    .chronology-main h1, #${SUMMARY_ID} { break-after: avoid; page-break-after: avoid; }
    .era-band, .event-card, .point, .point-sources li,
    #${SUMMARY_ID}, #${LEGEND_ID}, #${FOOT_ID} {
      break-inside: avoid; page-break-inside: avoid;
    }

    /* E010-05 — bandes d'ère : bordure, épaisseur et symbole, jamais la couleur seule. */
    .era-band {
      border: 1px solid #000 !important;
      border-left: 4px solid #000 !important;
      border-radius: 0 !important;
      padding: 2mm !important;
    }
    .era-band::before { content: '○ '; }
    .era-band[aria-current="true"] { outline: 1px solid #000; outline-offset: 1px; }
    .era-band[aria-current="true"]::before { content: '◆ ÈRE COURANTE — '; font-weight: 700; }

    /* E010-06 — amplitude et ère courante en texte réel (les title/n'ont pas d'encre). */
    #${LEGEND_ID} {
      display: block !important;
      margin: 0 0 5mm; padding: 0 0 3mm;
      border-bottom: 1px solid #000; font-size: 9pt;
    }
    #${LEGEND_ID} h2 { margin: 0 0 2mm; font-size: 11pt; font-family: var(--serif); }
    #${LEGEND_ID} ol { margin: 0; padding-left: 6mm; }
    #${LEGEND_ID} li { margin: 0 0 1mm; }

    /* E010-07 — provenance : chaque source reste lisible et datée sur papier. */
    .point-sources { display: block !important; margin-top: 1mm !important; }
    .point-sources li { display: inline !important; margin-right: 4mm !important; font-size: 8pt !important; }
    .point-sources li::before { content: '↳ '; }
    .point-kind, .confidence { border: 1px solid #000 !important; color: #000 !important; }

    /* E010-08 — images bornées et crédits conservés, sans débordement de page. */
    .event-card img { max-height: 25mm !important; object-fit: contain !important; }
    .aside-image { max-height: 45mm !important; object-fit: contain !important; }
    .aside-credit { display: block !important; font-size: 8pt !important; }

    /* E010-09 — bandeau de pied reproductible, dérivé du DOM (aucune date codée en dur). */
    #${FOOT_ID} {
      display: block !important;
      position: fixed; left: 0; right: 0; bottom: 0;
      margin: 0; padding: 2mm 0 0;
      border-top: 1px solid #000; background: #fff !important;
      font-size: 8pt; color: #000 !important;
    }
    #${SUMMARY_ID} { display: block !important; margin: 0 0 4mm; font-size: 9pt; font-weight: 700; }
  }

  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${BUTTON_ID} { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e010-title, #${PANEL_ID} .e010-code,
    #${PANEL_ID} .e010-state, #${BUTTON_ID} { color: CanvasText; }
  }
`;

/* E010-06 et E010-09 : libellés fidèles au contrat de la lentille. Aucune
   bride n'est promise qui ne soit pas vérifiable dans le DOM de la frise. */
const CHANTIERS = [
  ['E010-01', 'Périmètre papier : coque et contrôles masqués, frise et fiche conservées'],
  ['E010-02', 'Encre noire sur fond blanc : neutralisation du thème sombre'],
  ['E010-03', 'Déroulement intégral : hauteur, défilement et grille désactivés'],
  ['E010-04', 'Page A4 et pagination douce : aucun repère, point ou titre coupé'],
  ['E010-05', 'Bandes d’ère imprimables : bordure, épaisseur et symbole, pas la couleur seule'],
  ['E010-06', 'Amplitude et ère courante révélées en texte (au lieu de title/aria)'],
  ['E010-07', 'Sources de chaque point imprimables et adversatives en clair'],
  ['E010-08', 'Images bornées et crédits lisibles, sans débordement de page'],
  ['E010-09', 'Bandeau de pied et récapitulatif dérivés du DOM, sans date codée en dur'],
  ['E010-10', 'Commande d’impression au clic, gardes d’existence et une seule feuille CSS'],
];

let installCount = 0;
let printRequests = 0;
let refs = { panel: null, state: null, legend: null, foot: null, summary: null, button: null, reduced: false };

/* E010-10 : garde d'existence pour toute ID préfixée chronology-v2-e010-.
   Un nœud déjà présent est réutilisé puis déplacé dans le parent courant :
   la coque reconstruisant #app, un nœud de la rendu précédent est détaché
   et n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent pas au DOM. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E010-06 : les amplitudes viennent des dataset posés par chronology.js:289-290,
   jamais d'une table codée en dur. */
function formatYearFromDataset(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw || '?';
  return value < 0 ? `${Math.abs(value)} av. J.-C.` : String(value);
}

/* E010-01 à E010-09 : relevé en lecture seule de la frise réelle. Le module ne
   modifie ni les bandes ni les cartes : il n'ajoute que ses propres blocs. */
function measure() {
  const layout = refs.panel ? refs.panel.closest('.chronology-layout') : null;
  const root = layout || document.querySelector('.chronology-layout');
  const bands = root ? Array.from(root.querySelectorAll('.era-band')) : [];
  const cards = root ? root.querySelectorAll('.event-card').length : 0;
  const points = root ? root.querySelectorAll('.point').length : 0;
  const sources = root ? root.querySelectorAll('.point-sources li').length : 0;
  const images = root ? Array.from(root.querySelectorAll('img')) : [];
  const untitled = images.filter((img) => !img.getAttribute('alt')).length;
  const title = document.getElementById('atlas-chrono-title');
  const country = (title && title.textContent || '').trim() || 'Chronologie';
  return { bands, cards, points, sources, images: images.length, untitled, country };
}

function buildLegend(bands) {
  const wrap = refs.legend;
  if (!wrap) return;
  const signature = bands.map((band) => [
    band.id,
    band.dataset.start || '',
    band.dataset.end || '',
    band.getAttribute('aria-current') === 'true' ? '1' : '0',
  ].join('|')).join(';');
  if (wrap.dataset.e010Signature === signature) return;
  wrap.dataset.e010Signature = signature;

  const heading = document.createElement('h2');
  heading.textContent = 'Amplitude des ères et repère courant';
  const list = document.createElement('ol');
  bands.forEach((band) => {
    const item = document.createElement('li');
    const label = (band.querySelector('span') && band.querySelector('span').textContent || '').trim();
    const range = `${formatYearFromDataset(band.dataset.start)} → ${formatYearFromDataset(band.dataset.end)}`;
    const current = band.getAttribute('aria-current') === 'true';
    item.textContent = `${label || band.id} — ${range}${current ? ' — ère courante' : ''}.`;
    list.appendChild(item);
  });
  wrap.replaceChildren(heading, list);
}

function refresh() {
  const { panel, state, foot, summary } = refs;
  if (!panel || !panel.isConnected) return;
  const data = measure();

  write(state, `Papier prêt · ères ${data.bands.length} · repères ${data.cards} · points ${data.points} · sources ${data.sources} · images ${data.images} (sans alt ${data.untitled}) · mouvement réduit ${refs.reduced ? 'oui' : 'non'}.`);
  write(summary, `${data.country} — ${data.bands.length} ère(s), ${data.cards} repère(s), ${data.points} point(s), ${data.sources} source(s) documentée(s).`);
  write(foot, `${data.country} · frise chronologique — ${data.bands.length} ère(s) · ${data.cards} repère(s) · ${data.points} point(s) · ${data.sources} source(s).`);
  buildLegend(data.bands);

  panel.dataset.e01001 = '1'; // périmètre d'impression
  panel.dataset.e01002 = '1'; // encre noire sur blanc
  panel.dataset.e01003 = '1'; // déroulement intégral
  panel.dataset.e01004 = '1'; // page A4 et pagination
  panel.dataset.e01005 = String(data.bands.length); // bandes imprimables
  panel.dataset.e01006 = String(data.bands.length); // amplitudes en texte
  panel.dataset.e01007 = String(data.sources); // sources imprimables
  panel.dataset.e01008 = String(data.untitled); // images sans alt
  panel.dataset.e01009 = '1'; // bandeau dérivé du DOM
  panel.dataset.e01010 = String(installCount); // installations
  panel.dataset.e010PrintRequests = String(printRequests);
}

/* E010-10 : l'impression n'est déclenchée que par une activation explicite.
   La garde dataset évite de lier deux fois le même bouton réutilisé. */
function onPrintClick() {
  printRequests += 1;
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
  if (refs.panel && refs.panel.isConnected) {
    refs.panel.dataset.e010PrintRequests = String(printRequests);
  }
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById('atlas-chrono-main') || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e010-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e010-title', 'Papier, impression et export de la frise');
  title.id = TITLE_ID;

  const lede = make('p', 'e010-lede', 'Dix chantiers rendent la frise imprimable. Ce panneau décrit le périmètre papier ; les règles @media print vivent dans une feuille unique et ne modifient ni la vue ni la coque.');

  const list = make('ul', 'e010-list');
  list.id = LIST_ID;
  CHANTIERS.forEach(([code, label]) => {
    const row = make('li', 'e010-item');
    row.dataset.e010Chantier = code;
    row.append(make('span', 'e010-code', code), make('span', 'e010-item-label', label));
    list.appendChild(row);
  });

  const state = make('p', 'e010-state');
  state.id = STATE_ID;
  const note = make('p', 'e010-note', 'L’impression n’est jamais automatique : le bouton ci-dessous est le seul déclencheur. Sur papier, les ères se distinguent par un symbole et une bordure, jamais par une couleur.');

  const actions = make('div', 'e010-actions');
  const button = ensureNode(make, BUTTON_ID, 'button', 'e010-print-button', panel);
  button.type = 'button';
  button.textContent = 'Imprimer / exporter en PDF';
  if (!button.dataset.e010Bound) {
    button.addEventListener('click', onPrintClick);
    button.dataset.e010Bound = '1';
  }
  actions.appendChild(button);

  panel.replaceChildren(title, lede, list, state, note, actions);

  /* E010-06 et E010-09 : blocs de papier greffés dans le layout courant. */
  const legend = ensureNode(make, LEGEND_ID, 'section', 'e010-print-legend', ctx.layout);
  legend.setAttribute('aria-label', 'Amplitude des ères pour l’export papier');
  const summary = ensureNode(make, SUMMARY_ID, 'p', 'e010-print-summary', ctx.layout);
  const foot = ensureNode(make, FOOT_ID, 'p', 'e010-print-footer', ctx.layout);

  refs = {
    panel, state, legend, foot, summary, button,
    reduced: typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false,
  };
  refresh();
}

register('E010', install);
