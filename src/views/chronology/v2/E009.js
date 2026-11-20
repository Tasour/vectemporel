import { register } from './registry.js';

/*
 * Lentille E009 (passe V2) — infobulle non modale sur bande d'ère.
 * Domaine A : frise & ères. Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E009.md.
 *
 * Dix chantiers, E009-01 … E009-10, implémentés dans CE seul module. Aucun
 * fichier partagé n'est modifié : ni chronology.js, ni registry.js, ni
 * index.js, ni styles.css, ni la passe 1. La vue reconstruisant son stage à
 * chaque rendu (chronology.js:539), les écouteurs sont posés une seule fois
 * sur document en délégation et lisent toujours le dernier contexte.
 *
 * Contrat : un seul register('E009', install), un seul
 * ctx.css('chronology-v2-e009', …), des IDs préfixés chronology-v2-e009-
 * protégés par garde d'existence. Zéro console, zéro réseau, zéro aléa, zéro
 * timer, zéro rAF, zéro innerHTML, zéro vol de focus, zéro touche interceptée.
 */

const CSS_ID = 'chronology-v2-e009';
const TIP_ID = 'chronology-v2-e009-tip';
const PANEL_ID = 'chronology-v2-e009-panel';
const PANEL_TITLE_ID = 'chronology-v2-e009-panel-title';
const NAV_SELECTOR = '#atlas-chrono-eras';
const LIST_SELECTOR = '#atlas-chrono-events';
const BAND_SELECTOR = '.era-band.atlas-chrono-band';

/* E009-01, E009-06, E009-07, E009-08, E009-09 : une feuille unique, cadrée
   par les deux IDs possédés. L'infobulle est position:fixed, pointer-events:none,
   sans tabindex : jamais de modale, jamais d'écran bloquant, jamais d'arrêt Tab. */
const CSS = `
  #${TIP_ID} {
    position: fixed; left: var(--e009-left, 0px); top: var(--e009-top, 0px);
    z-index: 40; display: none; box-sizing: border-box; width: max-content;
    max-width: min(320px, calc(100vw - 16px)); padding: 8px 11px 9px;
    border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
    border-radius: 8px; background: var(--surface-2); color: var(--ink);
    box-shadow: 0 6px 20px rgba(0,0,0,.35); font: inherit; font-size: 11px;
    line-height: 1.45; pointer-events: none; overflow-wrap: anywhere;
  }
  #${TIP_ID}[data-e009-visible="1"] { display: block; }
  #${TIP_ID} .chronology-v2-e009-name {
    display: block; color: var(--gold-bright); font-size: 12px; font-weight: 600;
  }
  #${TIP_ID} .chronology-v2-e009-range,
  #${TIP_ID} .chronology-v2-e009-count {
    display: block; color: var(--muted); font-variant-numeric: tabular-nums;
  }
  #${TIP_ID} .chronology-v2-e009-current {
    display: block; margin-top: 3px; color: var(--ink-soft); font-weight: 600;
  }
  #${TIP_ID}[data-e009-current="1"] .chronology-v2-e009-current::before { content: '★ '; }
  ${BAND_SELECTOR}[data-e009-title-off="1"] { cursor: help; }

  #${PANEL_ID} {
    margin: 18px 0 0; padding: 10px 12px 11px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .chronology-v2-e009-panel-title {
    margin: 0 0 6px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
  }
  #${PANEL_ID} p { margin: 4px 0 0; color: var(--muted); font-size: 10px; }

  @media (max-width: 620px) {
    #${TIP_ID} { max-width: calc(100vw - 16px); font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${TIP_ID}, #${TIP_ID} *, #${PANEL_ID} { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${TIP_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${TIP_ID} .chronology-v2-e009-name,
    #${TIP_ID} .chronology-v2-e009-range,
    #${TIP_ID} .chronology-v2-e009-count,
    #${TIP_ID} .chronology-v2-e009-current { color: CanvasText; }
  }
`;

let latest = null;    // dernier contexte : { layout, stage, nav, tip, panel, ... }
let bound = false;    // garde des quatre écouteurs délégués sur document
let renders = 0;      // nombre d'installations, témoin de re-render
let hovers = 0;       // survols de bande observés
let focuses = 0;      // focalisations de bande observées
let sources = { survol: null, focus: null };
let described = null; // dernière bande ayant aria-describedby

/* E009-10 : une seule fonction d'écriture, dédupliquée : deux rafraîchissements
   sans changement ne touchent à aucun textContent. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E009-10 : garde d'existence. La coque reconstruisant le stage, un nœud
   d'un rendu précédent est détaché et n'est plus trouvé par getElementById :
   on en crée un neuf ; sinon on réutilise et déplace le nœud courant. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E009-02 : même règle que chronology.js:27-31, sans aucune date codée en dur. */
function formatYear(raw) {
  const year = Number(raw);
  if (!Number.isFinite(year)) return '—';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function bandsOf(layout) {
  const nav = layout && layout.querySelector(NAV_SELECTOR);
  if (!nav) return [];
  return Array.from(nav.querySelectorAll(BAND_SELECTOR));
}

/* E009-03 : le title natif ne peut contenir ni compte ni état et échappe aux
   technologies d'assistance. On le conserve en dataset, on vide l'attribut
   pour éviter une double infobulle, on marque la bande. */
function neutralizeTitles(bands) {
  let count = 0;
  bands.forEach((band) => {
    const natif = band.getAttribute('title') || '';
    if (natif && band.dataset.e009NativeTitle === undefined) {
      band.dataset.e009NativeTitle = natif;
      count += 1;
    }
    if (band.getAttribute('title')) band.setAttribute('title', '');
    band.dataset.e009TitleOff = '1';
  });
  return count;
}

/* E009-02 : le nombre de repères est dérivé du DOM rendu, jamais d'une copie
   des données. Les li du portent data-era-id (chronology.js:378-382). */
function countRepers(layout, eraId) {
  const list = layout && layout.querySelector(LIST_SELECTOR);
  if (!list || !eraId) return 0;
  let total = 0;
  Array.from(list.children).forEach((li) => {
    if (li.dataset && li.dataset.eraId === eraId) total += 1;
  });
  return total;
}

/* E009-02 : tout le contenu est créé en texte, jamais en HTML brut. */
function fillTip(cur, band) {
  const eraId = band.dataset.eraId || '';
  const debut = formatYear(band.dataset.start);
  const fin = formatYear(band.dataset.end);
  const nom = ((band.querySelector('span') || {}).textContent || '').trim() || eraId;
  const total = countRepers(cur.layout, eraId);
  const courante = band.getAttribute('aria-current') === 'true';

  write(cur.tipName, nom);
  write(cur.tipRange, `${debut} → ${fin}`);
  write(cur.tipCount, `${total} repère(s) dans cette ère`);
  write(cur.tipCurrent, courante ? 'Ère courante' : 'Ère consultable');

  cur.tip.dataset.e009Start = band.dataset.start || '';
  cur.tip.dataset.e009End = band.dataset.end || '';
  cur.tip.dataset.e009Count = String(total);
  cur.tip.dataset.e009Current = courante ? '1' : '0';
}

/* E009-06 : position bornée au viewport, avec repli au-dessous quand la place
   manque au-dessus. Aucune animation, aucun débordement à 390 px. */
function place(cur, band) {
  const rect = band.getBoundingClientRect();
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const tipW = cur.tip.offsetWidth || 260;
  const tipH = cur.tip.offsetHeight || 80;

  const brut = rect.left + rect.width / 2 - tipW / 2;
  const left = Math.max(8, Math.min(brut, Math.max(8, vw - tipW - 8)));
  let top = rect.top - tipH - 10;
  let placement = 'au-dessus';
  if (top < 8) {
    top = Math.max(8, Math.min(rect.bottom + 10, Math.max(8, vh - tipH - 8)));
    placement = 'au-dessous';
  }
  cur.tip.style.setProperty('--e009-left', `${Math.round(left)}px`);
  cur.tip.style.setProperty('--e009-top', `${Math.round(top)}px`);
  cur.tip.dataset.e009Placement = placement;
  cur.tip.dataset.e009Clamped = Math.abs(left - brut) > 0.5 ? '1' : '0';
}

/* E009-01, E009-04, E009-05, E009-08, E009-10 : état lisible, en flux normal,
   sans tabindex ni aria-live : le panneau n'ajoute aucune annonce. */
function refreshPanel(cur) {
  write(cur.pBands, `Bandes instrumentées : ${cur.bandCount} · titres natifs neutralisés : ${cur.neutralized}.`);
  write(cur.pActive, `Bande active : ${cur.tip.dataset.e009EraId || 'aucune'} · source : ${cur.tip.dataset.e009Source || 'aucune'}.`);
  write(cur.pCount, `Repères de l’ère : ${cur.tip.dataset.e009Count || '0'} · placement : ${cur.tip.dataset.e009Placement || '—'} · bornage : ${cur.tip.dataset.e009Clamped || '0'}.`);
  write(cur.pEvents, `Survol : ${hovers} · focus : ${focuses} · rendus : ${renders} · mouvement réduit : ${cur.reduced ? 'oui' : 'non'}.`);
}

/* E009-05 : aria-describedby ne suit que la bande active ; l'infobulle est
   role="tooltip", aria-hidden=false pendant l'affichage, jamais aria-live. */
function show(band, source) {
  const cur = latest;
  if (!cur || !cur.tip || !band || !band.isConnected) return;
  fillTip(cur, band);
  place(cur, band);
  if (described && described !== band) described.removeAttribute('aria-describedby');
  band.setAttribute('aria-describedby', TIP_ID);
  described = band;
  cur.tip.dataset.e009EraId = band.dataset.eraId || '';
  cur.tip.dataset.e009Source = source;
  cur.tip.dataset.e009Visible = '1';
  cur.tip.setAttribute('aria-hidden', 'false');
  refreshPanel(cur);
}

function hide() {
  const cur = latest;
  if (!cur || !cur.tip) return;
  if (described) {
    described.removeAttribute('aria-describedby');
    described = null;
  }
  cur.tip.dataset.e009Visible = '0';
  cur.tip.dataset.e009Source = '';
  cur.tip.setAttribute('aria-hidden', 'true');
  refreshPanel(cur);
}

/* E009-04 et E009-05 : deux sources indépendantes, priorité au clavier. On ne
   cache que quand les deux sont retirées : pas de clignotement au passage de
   la souris au focus. */
function sync() {
  const band = sources.focus || sources.survol;
  if (band && band.isConnected) show(band, sources.focus ? 'focus' : 'survol');
  else hide();
}

function bandFrom(event, layout) {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const band = target.closest(BAND_SELECTOR);
  if (!band || !layout || !layout.contains(band)) return null;
  return band;
}

/* E009-04 : ouverture immédiate au survol, sans délai ni timer. */
function onOver(event) {
  const cur = latest;
  if (!cur) return;
  const band = bandFrom(event, cur.layout);
  if (!band) return;
  hovers += 1;
  sources.survol = band;
  sync();
}

function onOut(event) {
  const cur = latest;
  if (!cur) return;
  const band = bandFrom(event, cur.layout);
  if (!band) return;
  const next = event.relatedTarget;
  if (next instanceof Node && band.contains(next)) return;
  if (sources.survol === band) sources.survol = null;
  sync();
}

/* E009-05 : équivalent clavier du survol. Aucun preventDefault, aucun focus(),
   aucun écouteur de touche : le routeur garde la priorité sur Échap. */
function onFocusIn(event) {
  const cur = latest;
  if (!cur) return;
  const band = bandFrom(event, cur.layout);
  if (!band) return;
  focuses += 1;
  sources.focus = band;
  sync();
}

function onFocusOut(event) {
  const cur = latest;
  if (!cur) return;
  const band = bandFrom(event, cur.layout);
  if (!band) return;
  if (sources.focus === band) sources.focus = null;
  sync();
}

function install(ctx) {
  if (!ctx || !ctx.layout || !ctx.stage) return;
  renders += 1;
  ctx.css(CSS_ID, CSS);

  const tip = ensureNode(ctx.el, TIP_ID, 'div', 'chronology-v2-e009-tip', ctx.stage);
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');
  tip.dataset.e009Modal = '0';
  tip.dataset.e009Visible = '0';

  const tipName = ctx.el('strong', 'chronology-v2-e009-name', 'Ère');
  const tipRange = ctx.el('span', 'chronology-v2-e009-range', '—');
  const tipCount = ctx.el('span', 'chronology-v2-e009-count', '—');
  const tipCurrent = ctx.el('span', 'chronology-v2-e009-current', '');
  tip.replaceChildren(tipName, tipRange, tipCount, tipCurrent);

  const panel = ensureNode(ctx.el, PANEL_ID, 'section', 'chronology-v2-e009-panel', ctx.layout);
  panel.setAttribute('aria-labelledby', PANEL_TITLE_ID);
  const title = ctx.el('h2', 'chronology-v2-e009-panel-title', 'Infobulle des ères — état');
  title.id = PANEL_TITLE_ID;
  const pBands = ctx.el('p', '', 'Bandes instrumentées : —');
  const pActive = ctx.el('p', '', 'Bande active : —');
  const pCount = ctx.el('p', '', 'Repères de l’ère : —');
  const pEvents = ctx.el('p', '', 'Survol : —');
  panel.replaceChildren(title, pBands, pActive, pCount, pEvents);

  const bands = bandsOf(ctx.layout);
  const neutralized = neutralizeTitles(bands);
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  tip.dataset.e009Reduced = reduced ? '1' : '0';
  panel.dataset.e009Reduced = reduced ? '1' : '0';
  panel.dataset.e009Renders = String(renders);

  latest = {
    layout: ctx.layout,
    stage: ctx.stage,
    tip, panel, tipName, tipRange, tipCount, tipCurrent,
    pBands, pActive, pCount, pEvents,
    bandCount: bands.length,
    neutralized,
    reduced,
  };
  sources = { survol: null, focus: null };
  described = null;
  hide();

  /* E009-10 : délégation documentaire unique. Quatre écouteurs, une seule
     fois, valables pour tous les rendus même après reconstruction du nav. */
  if (!bound && typeof document !== 'undefined') {
    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    bound = true;
  }
}

register('E009', install);
