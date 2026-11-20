import { register } from './registry.js';

/*
 * Lentille E070 — historique de navigation, retour et fil d'Ariane temporel.
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E070.md.
 *
 * Dix chantiers (E070-01 … E070-10) implémentés dans CE seul module. Aucun
 * fichier partagé n'est modifié : ni le store, ni le routeur, ni la coque.
 * La pile d'historique vit au niveau module et survit aux reconstructions du
 * DOM opérées par la coque (chronology.js:539) ; les nœuds, eux, sont recréés
 * à chaque passe avec des identifiants uniques préfixés `e070-`.
 *
 * Contrat : register('E070', ctx => { … }) avec
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }.
 * Une seule feuille via ctx.css('chronology-e070', …). Zéro sortie de débogage,
 * zéro requête réseau, zéro source aléatoire, zéro timer, zéro boucle
 * d'animation propre au greffon. Français partout.
 */

const CSS_ID = 'chronology-e070';
const MAX_HISTORY = 40; // borne la pile : une session longue reste bornée

let latest = null;          // dernier contexte vu : { viewId, stage, layout, el, reducedMotion }
let clickHooked = false;    // garde de l'écouteur délégué de clic
let keyHooked = false;      // garde de l'écouteur délégué de clavier
let liveNode = null;        // région live hors du stage, gardée par isConnected
let history = [];           // [{ sig, eraId, eventId, eraName, eventTitle, year }]
let cursor = -1;            // index de l'entrée courante dans history
let suppressRecord = false; // évite qu'un retour enregistre sa propre navigation

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Tout est cadré par [data-e070="on"] posé sur
 * .chronology-layout : aucune règle ne déborde sur une autre vue.
 * ------------------------------------------------------------------------- */
const RULES = `
.e070-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.chronology-layout[data-e070="on"] .e070-panel{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.chronology-layout[data-e070="on"] .e070-panel h2{margin:0 0 6px;color:var(--gold);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.chronology-layout[data-e070="on"] .e070-trail{margin:0 0 6px}
.chronology-layout[data-e070="on"] .e070-trail-list{display:flex;flex-wrap:wrap;gap:2px;align-items:center;margin:0;padding:0;list-style:none;color:var(--muted);font-size:10px;line-height:1.6}
.chronology-layout[data-e070="on"] .e070-crumb{display:inline-flex;gap:3px;align-items:center;min-width:0}
.chronology-layout[data-e070="on"] .e070-crumb.is-current{color:var(--gold-bright);font-weight:600}
.chronology-layout[data-e070="on"] .e070-sep{color:rgba(255,255,255,.28)}
.chronology-layout[data-e070="on"] .e070-back{min-height:36px;margin:2px 6px 0 0;padding:4px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer;transition:border-color 160ms ease,background-color 160ms ease}
.chronology-layout[data-e070="on"] .e070-back:hover:not(:disabled){border-color:var(--gold);background:rgba(230,185,111,.08)}
.chronology-layout[data-e070="on"] .e070-back:disabled{opacity:.45;cursor:not-allowed}
.chronology-layout[data-e070="on"] .e070-back:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-layout[data-e070="on"] .e070-readout{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
@media (max-width:620px){
  .chronology-layout[data-e070="on"] .e070-back{min-height:44px;padding:6px 12px;font-size:12px}
  .chronology-layout[data-e070="on"] .e070-trail-list{font-size:11px}
}
@media (prefers-reduced-motion:reduce){
  .chronology-layout[data-e070="on"] .e070-back{transition:none!important}
}`;

/* ------------------------------------------------------------------------- *
 * E070-08 — gardes d'existence : la coque remplace le innerHTML du stage à
 * chaque rendu. Un identifiant hérité d'un rendu précédent est détaché ; on le
 * retire s'il est encore rattaché, puis on crée le nœud courant. Aucun doublon
 * d'ID, même après cent rendus.
 * ------------------------------------------------------------------------- */
function freeId(id) {
  const stale = document.getElementById(id);
  if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
}

/* E070-05 — région live unique, créée hors du stage pour survivre au innerHTML
   de la coque, exactement comme #nav-c2a-live (chronology.js:119-133). */
function ensureLive() {
  if (liveNode && liveNode.isConnected) return liveNode;
  liveNode = document.getElementById('e070-live');
  if (!liveNode) {
    liveNode = document.createElement('p');
    liveNode.id = 'e070-live';
    liveNode.className = 'e070-sr-only';
    liveNode.setAttribute('role', 'status');
    liveNode.setAttribute('aria-live', 'polite');
    liveNode.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveNode);
  }
  return liveNode;
}

function say(message) {
  const node = ensureLive();
  if (node) node.textContent = message;
}

/* ------------------------------------------------------------------------- *
 * E070-01 — lecture de la position courante dans le DOM réel. Les bandes
 * portent data-era-id (chronology.js:287) et les cartes data-event-id (387) ;
 * l'état courant est marqué is-active + aria-current (290, 390). Aucune
 * écriture dans le store, aucun import de store.js.
 * ------------------------------------------------------------------------- */
function readPosition(ctx) {
  const layout = ctx.layout;
  const band = layout.querySelector('.era-band.is-active')
    || layout.querySelector('.era-band[aria-current="true"]');
  const card = layout.querySelector('.event-card.is-active')
    || layout.querySelector('.event-card[aria-current="true"]');
  const eraId = band && band.dataset.eraId ? band.dataset.eraId : '';
  const eventId = card && card.dataset.eventId ? card.dataset.eventId : '';
  if (!eraId && !eventId) return null;
  const eraName = band && band.firstElementChild
    ? band.firstElementChild.textContent.trim() : '';
  const titleNode = card ? card.querySelector('strong') : null;
  const yearNode = card ? card.querySelector('.event-year') : null;
  return {
    sig: `${eraId}|${eventId}`,
    eraId,
    eventId,
    eraName,
    eventTitle: titleNode ? titleNode.textContent.trim() : '',
    year: yearNode ? yearNode.textContent.trim() : '',
  };
}

/* E070-01 — enregistrement d'une entrée seulement quand la signature change.
   Les rendus déclenchés par un filtre (chronology.js:323, 339) gardent la même
   position et n'encombrent donc pas la pile. Une navigation issue d'un retour
   est neutralisée par suppressRecord. */
function recordCurrent(ctx) {
  const pos = readPosition(ctx);
  if (!pos) return;
  const current = history[cursor];
  if (current && current.sig === pos.sig) {
    history[cursor] = { ...current, ...pos };
    return;
  }
  if (suppressRecord) {
    suppressRecord = false;
    return;
  }
  if (cursor < history.length - 1) history = history.slice(0, cursor + 1);
  history.push(pos);
  if (history.length > MAX_HISTORY) history.shift();
  cursor = history.length - 1;
}

/* ------------------------------------------------------------------------- *
 * E070-02 — fil d'Ariane temporel. La coque affiche déjà un fil spatial
 * « Monde › Pays › Ère › Repère › Points » (chronology.js:142-168) : celui-ci
 * retrace le chemin réellement parcouru, ère par ère, puis le repère courant.
 * Le séparateur est un span aria-hidden, comme dans la base (chronology.js:157).
 * ------------------------------------------------------------------------- */
function trailList(ctx) {
  const list = ctx.el('ol', 'e070-trail-list');
  const eras = [];
  history.slice(0, cursor + 1).forEach((entry) => {
    const label = entry.eraName || 'Ère';
    if (!eras.length || eras[eras.length - 1] !== label) eras.push(label);
  });
  const shown = eras.slice(-5);
  const rows = [];
  if (eras.length > shown.length) rows.push(['…', '', false]);
  shown.forEach((name, index) => {
    rows.push([name, index === shown.length - 1 ? ' is-era' : '', false]);
  });
  const current = history[cursor];
  if (current && current.eventTitle) {
    rows.push([`${current.year ? `${current.year} · ` : ''}${current.eventTitle}`, ' is-current', true]);
  } else if (eras.length) {
    rows.push([eras[eras.length - 1], ' is-current', true]);
  }
  rows.forEach(([label, extra, isCurrent], index) => {
    const li = ctx.el('li', `e070-crumb${extra}`);
    if (index) {
      const sep = ctx.el('span', 'e070-sep', '›');
      sep.setAttribute('aria-hidden', 'true');
      li.appendChild(sep);
    }
    li.appendChild(ctx.el('span', '', label));
    if (isCurrent) li.setAttribute('aria-current', 'location');
    list.appendChild(li);
  });
  return list;
}

/* ------------------------------------------------------------------------- *
 * E070-03 — retour dans l'historique. On rejoue le clic sur la carte ou la
 * bande d'origine plutôt que d'appeler selectEvent/selectEra soi-même : la
 * logique métier et la restauration de focus (chronology.js:197-205, 298-302,
 * 406-409) restent au propriétaire de la vue.
 * ------------------------------------------------------------------------- */
function goBack(ctx) {
  if (cursor <= 0) {
    say('Aucun retour disponible : vous êtes au début de l’historique.');
    return;
  }
  const target = history[cursor - 1];
  if (!target) return;
  const layout = ctx.layout;
  let node = null;
  if (target.eventId) {
    node = layout.querySelector(`.event-card[data-event-id="${target.eventId}"]`);
  }
  if (!node && target.eraId) {
    node = layout.querySelector(`.era-band[data-era-id="${target.eraId}"]`);
  }
  if (!node || typeof node.click !== 'function') {
    say('Retour impossible : la cible n’est plus affichée.');
    return;
  }
  cursor -= 1;
  suppressRecord = true;
  node.click();
  say(`Retour à ${target.eventTitle || target.eraName || 'la position précédente'}.`);
}

/* ------------------------------------------------------------------------- *
 * E070-04/-05/-06/-07 — panneau unique, construit dans le stage courant.
 * ------------------------------------------------------------------------- */
function buildPanel(ctx) {
  const main = ctx.layout.querySelector('.chronology-main');
  if (!main) return;
  const panel = ctx.el('section', 'e070-panel');
  panel.id = 'e070-panel';
  panel.setAttribute('aria-label', 'Historique de navigation et fil d’Ariane temporel');

  const heading = ctx.el('h2', '', 'Fil d’Ariane temporel');
  heading.id = 'e070-panel-title';
  panel.appendChild(heading);

  const nav = ctx.el('nav', 'e070-trail');
  nav.id = 'e070-trail';
  nav.setAttribute('aria-labelledby', 'e070-panel-title');
  panel.appendChild(nav);

  const back = ctx.el('button', 'e070-back', '← Retour dans l’historique');
  back.type = 'button';
  back.id = 'e070-back';
  back.setAttribute('aria-keyshortcuts', 'Alt+ArrowLeft');
  back.setAttribute('aria-controls', 'atlas-chrono-aside');
  back.addEventListener('click', () => goBack(latest));
  panel.appendChild(back);

  const readout = ctx.el('p', 'e070-readout', 'Historique : —');
  readout.id = 'e070-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  panel.appendChild(readout);

  const orientation = main.querySelector('.nav-c2-orientation');
  if (orientation && orientation.parentNode) orientation.parentNode.insertBefore(panel, orientation.nextSibling);
  else main.appendChild(panel);
}

function paint(ctx) {
  const layout = ctx.layout;
  const reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
  layout.dataset.e070 = 'on';
  layout.dataset.e070Motion = reduced ? 'reduced' : 'full';
  layout.dataset.e070History = String(history.length);
  layout.dataset.e070Depth = String(cursor + 1);

  const trail = document.getElementById('e070-trail');
  if (trail && trail.isConnected) {
    const old = trail.querySelector('.e070-trail-list');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    trail.appendChild(trailList(ctx));
  }
  const back = document.getElementById('e070-back');
  if (back && back.isConnected) back.disabled = cursor <= 0;
  const readout = document.getElementById('e070-readout');
  if (readout && readout.isConnected) {
    const eras = new Set(history.slice(0, cursor + 1).map((entry) => entry.eraId).filter(Boolean));
    readout.textContent = `Historique : ${cursor + 1} position(s) sur ${history.length} visitée(s) · ${eras.size} ère(s) traversée(s) · retour ${cursor > 0 ? 'disponible' : 'indisponible'} · mouvement ${reduced ? 'réduit' : 'complet'}.`;
  }
}

/* ------------------------------------------------------------------------- *
 * E070-07/-10 — deux écouteurs délégués sur document, enregistrés une seule
 * fois. document survit aux reconstructions du stage (chronology.js:539) ;
 * poser les écouteurs sur les boutons eux-mêmes les dupliquerait à chaque rendu.
 * ------------------------------------------------------------------------- */
function handleClick(event) {
  const cur = latest;
  if (!cur || cur.viewId !== 'chronology' || event.defaultPrevented) return;
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  if (target.closest('#e070-back')) return; // goBack est porté par le bouton lui-même
  if (target.closest('.atlas-chrono-band, .event-card')) {
    // Le gestionnaire de la base a déjà appelé selectEra/selectEvent ; le
    // rendu synchrone a mis à jour latest avant que cet écouteur ne bulle.
    recordCurrent(latest);
    paint(latest);
  }
}

function handleKey(event) {
  const cur = latest;
  if (!cur || cur.viewId !== 'chronology' || event.defaultPrevented) return;
  if (!event.altKey || event.key !== 'ArrowLeft') return;
  if (cursor <= 0) return;
  goBack(cur);
  event.preventDefault();
}

function install() {
  if (clickHooked || typeof document === 'undefined') return;
  clickHooked = true;
  document.addEventListener('click', handleClick);
  if (!keyHooked) {
    keyHooked = true;
    document.addEventListener('keydown', handleKey);
  }
}

register('E070', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);
  latest = {
    viewId: ctx.viewId,
    stage: ctx.stage,
    layout: ctx.layout,
    el: ctx.el,
    reducedMotion: ctx.reducedMotion,
  };
  ensureLive();
  ['e070-panel', 'e070-panel-title', 'e070-trail', 'e070-back', 'e070-readout']
    .forEach(freeId);
  buildPanel(latest);
  recordCurrent(latest);
  paint(latest);
  install();
});
