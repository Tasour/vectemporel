import { register } from './registry.js';

/* Lentille CHRONOLOGIE E073 — Événements simultanés, chevauchements et
 * empilement visuel.
 *
 * Dix chantiers appliqués à chaque rendu de la vue chronologie par le registre
 * `runEnhancements` (registry.js:28-44). Le thème est l'AXE TEMPOREL partagé :
 * deux repères peuvent être contemporains sans entretenir de lien de causalité
 * (chronology.js:441 rappelle que la vue ne prétend pas inventer une relation).
 * Tout est recalculé depuis le DOM rendu, notamment `data-year` posé à
 * chronology.js:380, et depuis `data-start`/`data-end` des bandes d'ères
 * (chronology.js:288-289). Aucune donnée historique n'est inventée.
 *
 * Contrat : un seul fichier possédé, CSS injecté une seule fois via
 * ctx.css('chronology-e073', …), identifiants tous préfixés `e073-` avec garde
 * d'existence, aucune trace de débogage, aucun appel réseau, aucune source
 * d'aléa, aucune boucle d'animation propre, aucun canvas, aucun minuteur,
 * aucun fichier partagé modifié.
 *
 * Lectures : src/views/chronology.js (:16, :207-256, :281-305, :330-341,
 * :378-401, :441-459, :538-539), src/views/chronology/registry.js (:13-19,
 * :28-44), styles.css (:194-205, :316, :339, :342-344).
 */

const CSS_ID = 'chronology-e073';
const SCOPE = 'chronology-e073';
const REDUCED_ATTR = 'data-e073-reduced';

const PANEL_ID = 'e073-panel';
const TITLE_ID = 'e073-title';
const METRIC_ID = 'e073-metric';
const READOUT_ID = 'e073-readout';
const WINDOW_ID = 'e073-window';
const BARS_ID = 'e073-bars';
const FORMULE_ID = 'e073-formule';
const RECALC_ID = 'e073-recalc';
const ERA_ID = 'e073-era';
const CONTEMP_ID = 'e073-contemporains';

/* Choix unique : une fenêtre de contemporanéité à la fois. Les valeurs sont
 * des distances maximales en années, pas des faits historiques. */
const WINDOWS = [
  { span: 0, label: 'Année exacte' },
  { span: 5, label: '± 5 ans' },
  { span: 25, label: '± 25 ans' },
  { span: 100, label: '± 100 ans' },
];

/* Survit aux reconstructions complètes du DOM (shell.js:137) comme le fait
 * `local.query` dans chronology.js:16. Aucun nœud DOM n'est mémorisé ici. */
let windowSpan = 0;

const CSS = `
#${PANEL_ID}{
  margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);color:var(--muted);
  font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}
#${PANEL_ID} h2{margin:0 0 5px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
#${PANEL_ID} p{margin:0 0 4px}
#${PANEL_ID} p:last-child{margin-bottom:0}
#${FORMULE_ID}{color:var(--muted-2);font-size:8px}
#${WINDOW_ID}{margin:7px 0 0;padding:0;border:0}
.e073-legend{padding:0;color:var(--gold);font-size:9px}
.e073-choice{position:relative;display:inline-flex;min-height:36px;margin:3px 5px 0 0;cursor:pointer}
.e073-radio{position:absolute;width:1px;height:1px;opacity:0}
.e073-choice-label{
  display:inline-flex;align-items:center;min-height:36px;padding:0 10px;
  border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:9px;
  transition:border-color .16s linear,background-color .16s linear,color .16s linear;
}
.e073-choice:hover .e073-choice-label{border-color:var(--gold)}
.e073-radio:checked + .e073-choice-label{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.e073-radio:focus-visible + .e073-choice-label{outline:2px solid var(--gold-bright);outline-offset:2px}
#${BARS_ID}{
  display:flex;align-items:flex-end;gap:3px;min-height:40px;margin:8px 0;
  padding:0 0 3px;border-bottom:1px solid var(--line);
}
.e073-bar{
  flex:1 1 4px;max-width:16px;min-width:3px;border-radius:2px 2px 0 0;
  border-top:2px dotted var(--gold);background:rgba(230,185,111,.22);
}
.e073-bar[data-e073-shared="1"]{border-top-style:solid;border-top-color:#fff2d2;background:rgba(244,214,158,.42)}
.e073-badge{
  align-self:flex-start;margin:0 10px 2px;padding:2px 6px;
  border:1px solid var(--line-strong);border-radius:999px;
  color:var(--gold-bright);font-size:8px;font-variant-numeric:tabular-nums;
}
.e073-btn{
  min-height:36px;margin:6px 0 0;padding:0 10px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer;
  transition:border-color .16s linear;
}
.e073-btn:hover{border-color:var(--gold)}
.e073-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#${READOUT_ID}{margin:6px 0 0;color:var(--ink-soft)}
.e073-contemporains{margin:10px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
.e073-note{margin:8px 0 0;color:var(--muted-2);font-size:8px;line-height:1.4}
[${REDUCED_ATTR}] .e073-choice-label,
[${REDUCED_ATTR}] .e073-btn{transition:none}
@media (max-width:620px){
  #${PANEL_ID}{padding:7px 8px}
  #${BARS_ID}{min-height:34px}
  .e073-choice{margin-right:4px}
  .e073-choice-label{padding:0 8px;font-size:8px}
  .e073-badge{margin:0 8px 2px}
}
@media (prefers-reduced-motion:reduce){
  .e073-choice-label,.e073-btn{transition:none}
}`;

function frNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/* Miroir de formatYear (chronology.js:26-28) : le millésime reste lisible tel
 * qu'il est déjà affiché sur les cartes (chronology.js:392). */
function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* Un repère n'est compté que s'il est présent et non masqué : E04 pose
 * `hidden` sur les <li> sans re-rendre la vue (même repli que E39.js:110-118). */
function visibleEvents(main) {
  const list = main.querySelector('#atlas-chrono-events');
  if (!list) return [];
  return Array.prototype.filter.call(list.children, (node) => (
    node.nodeType === 1 && node.hasAttribute('data-event-id') && !node.hidden
  ));
}

function eventYear(node) {
  if (!node || !node.dataset) return null;
  const value = Number.parseInt(node.dataset.year, 10);
  return Number.isFinite(value) ? value : null;
}

/* Toutes les grandeurs sont dérivées des attributs réels du DOM. Une paire
 * est comptée une seule fois (i < j) ; la pile d'un repère est le nombre de
 * repères tombant dans sa fenêtre [{année}-span ; {année}+span]. */
function analyse(main, span) {
  const events = visibleEvents(main);
  const items = [];
  events.forEach((node) => {
    const year = eventYear(node);
    if (year !== null) items.push({ node, year, pile: 0 });
  });

  items.forEach((item) => {
    item.pile = items.reduce((total, other) => (
      total + (Math.abs(other.year - item.year) <= span ? 1 : 0)
    ), 0);
  });

  let paires = 0;
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (Math.abs(items[i].year - items[j].year) <= span) paires += 1;
    }
  }

  const parAnnee = [];
  items.forEach((item) => {
    const bucket = parAnnee.find((entry) => entry.year === item.year);
    if (bucket) bucket.count += 1;
    else parAnnee.push({ year: item.year, count: 1 });
  });
  parAnnee.sort((a, b) => a.year - b.year);

  return {
    total: events.length,
    dates: items.length,
    parAnnee,
    sharedYears: parAnnee.filter((entry) => entry.count > 1).length,
    paires,
    concerne: items.filter((item) => item.pile > 1).length,
    pileMax: items.reduce((max, item) => Math.max(max, item.pile), 0),
    items,
  };
}

/* Les bandes d'ères portent data-start/data-end (chronology.js:288-289).
 * Deux intervalles se chevauchent si startA <= endB && startB <= endA. */
function eraOverlaps(main) {
  const bands = all(main, '#atlas-chrono-eras .era-band');
  const intervals = [];
  bands.forEach((band) => {
    const start = Number(band.dataset.start);
    const end = Number(band.dataset.end);
    if (Number.isFinite(start) && Number.isFinite(end)) intervals.push({ start, end });
  });
  let paires = 0;
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      const a = intervals[i];
      const b = intervals[j];
      if (a.start <= b.end && b.start <= a.end) paires += 1;
    }
  }
  return { bandes: bands.length, paires };
}

/* Repère courant = carte portant aria-current (chronology.js:390). La liste
 * des contemporains est purement temporelle : aucun lien de causalité. */
function contemporains(main, span) {
  const current = main.querySelector('.event-card[aria-current="true"]');
  if (!current) return { annee: null, titres: [], count: 0 };
  const node = current.closest('li[data-event-id]');
  const year = eventYear(node);
  if (year === null) return { annee: null, titres: [], count: 0 };

  const others = visibleEvents(main).filter((candidate) => {
    if (candidate === node) return false;
    const otherYear = eventYear(candidate);
    return otherYear !== null && Math.abs(otherYear - year) <= span;
  });
  const titres = others.slice(0, 4).map((candidate) => {
    const strong = candidate.querySelector('.event-card strong');
    return strong && strong.textContent.trim()
      ? strong.textContent.trim()
      : String(candidate.dataset.eventId || 'repère');
  });
  return { annee: year, titres, count: others.length };
}

function buildWindow(ctx, layout) {
  const group = ctx.el('fieldset', 'e073-fieldset');
  group.id = WINDOW_ID;
  group.appendChild(ctx.el('legend', 'e073-legend', 'Fenêtre de contemporanéité'));
  WINDOWS.forEach((choice) => {
    const row = ctx.el('label', 'e073-choice');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'e073-window';
    input.value = String(choice.span);
    input.id = `e073-window-${choice.span}`;
    input.className = 'e073-radio';
    input.checked = choice.span === windowSpan;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      windowSpan = choice.span;
      layout.dataset.e073Window = String(windowSpan);
      refresh(ctx, layout, true);
    });
    row.appendChild(input);
    row.appendChild(ctx.el('span', 'e073-choice-label', choice.label));
    group.appendChild(row);
  });
  return group;
}

function buildPanel(ctx, layout) {
  const panel = ctx.el('section', 'e073-panel');
  panel.id = PANEL_ID;
  const title = ctx.el('h2', 'e073-h2', 'Simultanéité et empilement');
  title.id = TITLE_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const metric = ctx.el('p', 'e073-line');
  metric.id = METRIC_ID;

  const bars = ctx.el('p', 'e073-bars');
  bars.id = BARS_ID;
  bars.setAttribute('role', 'img');

  const formule = ctx.el('p', 'e073-formule');
  formule.id = FORMULE_ID;

  const recalc = ctx.el('button', 'e073-btn', 'Recalculer depuis le DOM');
  recalc.type = 'button';
  recalc.id = RECALC_ID;
  recalc.setAttribute('aria-controls', `${METRIC_ID} ${READOUT_ID}`);
  recalc.addEventListener('click', () => refresh(ctx, layout, true));

  const readout = ctx.el('p', 'e073-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  readout.textContent = '';

  panel.append(title, metric, bars, formule, buildWindow(ctx, layout), recalc, readout);
  return panel;
}

function refresh(ctx, layout, announce) {
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return;

  const data = analyse(main, windowSpan);
  const era = eraOverlaps(main);
  const cont = contemporains(main, windowSpan);

  layout.dataset.e073 = '1';
  layout.dataset.e073Window = String(windowSpan);
  layout.dataset.e073Paires = String(data.paires);
  layout.dataset.e073PileMax = String(data.pileMax);

  WINDOWS.forEach((choice) => {
    const input = document.getElementById(`e073-window-${choice.span}`);
    if (input) input.checked = choice.span === windowSpan;
  });

  const fenetre = windowSpan === 0 ? 'année exacte' : `± ${windowSpan} ans`;
  setText(document.getElementById(METRIC_ID),
    `Repères affichés : ${data.total} · années distinctes : ${data.parAnnee.length} · `
    + `années partagées : ${data.sharedYears} · paires simultanées : ${data.paires} · `
    + `repères concernés : ${data.concerne} · pile maximale : ${data.pileMax}. Fenêtre : ${fenetre}.`);
  setText(document.getElementById(FORMULE_ID),
    `Règle falsifiable : deux repères forment une paire si |année A − année B| ≤ ${windowSpan} an(s), `
    + `comptée une seule fois (i < j). La pile est le nombre de repères dans une plage de `
    + `${windowSpan * 2 + 1} année(s) centrée sur une année présente.`);

  const bars = document.getElementById(BARS_ID);
  if (bars) {
    bars.textContent = '';
    const max = data.parAnnee.reduce((value, entry) => Math.max(value, entry.count), 0) || 1;
    data.parAnnee.forEach((entry) => {
      const bar = ctx.el('span', 'e073-bar');
      bar.style.height = `${Math.max(8, Math.round(entry.count / max * 34))}px`;
      bar.dataset.year = String(entry.year);
      bar.dataset.count = String(entry.count);
      if (entry.count > 1) bar.dataset.e073Shared = '1';
      bar.title = `${formatYear(entry.year)} : ${entry.count} repère(s)`;
      bars.appendChild(bar);
    });
    const label = data.parAnnee.slice(0, 12)
      .map((entry) => `${formatYear(entry.year)} : ${entry.count}`).join(' · ');
    bars.setAttribute('aria-label',
      `Histogramme des années : ${label || 'aucun repère affiché'}`
      + `${data.parAnnee.length > 12 ? ` · ${data.parAnnee.length - 12} autre(s)` : ''}.`);
  }

  /* E04 peut masquer des <li> sans re-render : on retire leurs badges pour
   * qu'aucun marqueur d'empilement ne subsiste sur un repère invisible. */
  all(main, 'li[data-event-id][hidden]').forEach((node) => {
    const badge = node.querySelector('.e073-badge');
    if (badge) badge.remove();
    node.removeAttribute('data-e073-pile');
  });

  data.items.forEach((item) => {
    const card = item.node.querySelector('.event-card');
    if (!card) return;
    let badge = card.querySelector('.e073-badge');
    if (item.pile > 1) {
      if (!badge) {
        badge = ctx.el('span', 'e073-badge');
        badge.setAttribute('aria-hidden', 'true');
        card.appendChild(badge);
      }
      badge.textContent = `×${item.pile} simultané(s)`;
      item.node.dataset.e073Pile = String(item.pile);
    } else {
      if (badge) badge.remove();
      item.node.removeAttribute('data-e073-pile');
    }
  });

  const nav = main.querySelector('#atlas-chrono-eras');
  let eraNote = document.getElementById(ERA_ID);
  if (nav && !eraNote) {
    eraNote = ctx.el('p', 'e073-note');
    eraNote.id = ERA_ID;
    nav.appendChild(eraNote);
  }
  setText(eraNote,
    `Chevauchements d'ères : ${era.paires} paire(s) sur ${era.bandes} bande(s). `
    + 'Deux bandes se chevauchent si leurs bornes [début, fin] se recoupent.');

  const aside = layout.querySelector('#atlas-chrono-aside');
  let contNode = document.getElementById(CONTEMP_ID);
  if (aside && !contNode) {
    contNode = ctx.el('p', 'e073-contemporains');
    contNode.id = CONTEMP_ID;
    aside.appendChild(contNode);
  }
  if (cont.annee === null) {
    setText(contNode, 'Contemporains : aucun repère courant sélectionné.');
  } else {
    const details = cont.titres.length
      ? `, dont ${cont.titres.join(' · ')}`
        + (cont.count > cont.titres.length ? ` et ${cont.count - cont.titres.length} autre(s)` : '')
      : '';
    setText(contNode,
      `Contemporains du repère (${formatYear(cont.annee)}, |Δ| ≤ ${windowSpan} an(s)) : `
      + `${cont.count} autre(s)${details}. Proximité temporelle, pas lien de causalité.`);
  }

  if (announce) {
    setText(document.getElementById(READOUT_ID),
      `${data.total} repère(s) affiché(s) : ${data.paires} paire(s) simultanée(s), `
      + `pile maximale ${data.pileMax} (fenêtre ${fenetre}).`);
  }
}

/* Aucun minuteur : les gestionnaires synchrones (recherche, filtres E04) ont
 * terminé leur mise à jour avant la relecture du DOM en micro-tâche. */
function deferRefresh(ctx, layout) {
  const read = () => refresh(ctx, layout, false);
  if (typeof queueMicrotask === 'function') queueMicrotask(read);
  else Promise.resolve().then(read);
}

register('E073', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const layout = ctx.layout
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e073 = '1';
  layout.dataset.e073Window = String(windowSpan);
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  if (!document.getElementById(PANEL_ID)) {
    const status = main.querySelector('#atlas-chrono-status');
    const panel = buildPanel(ctx, layout);
    if (status && status.nextSibling) main.insertBefore(panel, status.nextSibling);
    else main.prepend(panel);

    /* Un seul jeu d'écouteurs par rendu : ils vivent sur le `main` courant,
     * détruit avec la coque (shell.js:137), donc aucun cumul ni écouteur global. */
    main.addEventListener('input', () => deferRefresh(ctx, layout));
    main.addEventListener('change', () => deferRefresh(ctx, layout));
    main.addEventListener('click', () => deferRefresh(ctx, layout));
  }

  refresh(ctx, layout, false);
});
