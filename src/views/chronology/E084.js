import { register } from './registry.js';

/* Lentille E084 — Synthèse d'ère et repères de lecture globaux (CHRONOLOGIE).
 *
 * Dix chantiers, tous implémentés dans ce seul module :
 *   E084-01 panneau de synthèse chiffrée de l'ère courante ;
 *   E084-02 thèmes dominants de l'ère, comptés depuis les repères affichés ;
 *   E084-03 répartition des repères par niveau d'importance ;
 *   E084-04 frise globale proportionnelle des ères, cliquable au clavier ;
 *   E084-05 boussole de lecture globale (rang, progression, région live) ;
 *   E084-06 couverture temporelle du pays et curseur de l'ère courante ;
 *   E084-07 sommaire textuel de toutes les ères ;
 *   E084-08 « en bref » du repère courant dans la fiche ;
 *   E084-09 miroir d'état auditable sur le layout (data-e084-*) ;
 *   E084-10 idempotence, re-render safe et mouvement réduit.
 *
 * Périmètre : lecture seule du DOM produit par chronology.js. Aucun fichier
 * partagé n'est édité, aucun état du store n'est importé, aucune journalisation,
 * aucun appel réseau, aucun aléa, aucun minuteur et aucune boucle d'animation.
 * Toutes les ancres créées portent le préfixe `e084-` et sont protégées
 * par une garde d'existence (E084-10).
 */

const CSS_ID = 'chronology-e084';
const PANORAMA_ID = 'e084-panorama';
const TITLE_ID = 'e084-titre';
const SYNTH_ID = 'e084-synthese';
const COMPASS_ID = 'e084-boussole';
const COVER_ID = 'e084-couverture';
const FRIEZE_ID = 'e084-frise';
const THEMES_ID = 'e084-themes';
const IMPORTANCE_ID = 'e084-importance';
const SUMMARY_ID = 'e084-sommaire';
const BRIEF_ID = 'e084-en-bref';

const CSS = `
.e084-panorama{margin:0 0 14px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
.e084-h2{margin:0 0 7px;font-family:var(--serif);font-size:14px;font-weight:450;color:var(--ink-soft)}
.e084-h3{margin:10px 0 3px;color:var(--gold);font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
.e084-list{margin:3px 0;padding-left:16px;color:var(--muted);font-size:9px;line-height:1.6}
.e084-list li{margin:1px 0}
.e084-line{margin:2px 0 5px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e084-boussole{margin:0 0 6px;padding:5px 8px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e084-frise{display:flex;flex-wrap:wrap;gap:2px;margin:5px 0;padding:0;list-style:none}
.e084-frise>li{display:flex;min-width:0;flex:1 1 0}
.e084-frise-btn{flex:1 1 0;min-width:28px;min-height:30px;padding:3px 4px;border:1px solid var(--line);border-radius:5px;background:var(--surface-2);color:var(--ink-soft);font-size:8px;line-height:1.3;text-align:left;cursor:pointer;overflow:hidden}
.e084-frise-btn:hover{border-color:var(--gold)}
.e084-frise-btn[aria-current="true"]{border-color:var(--gold);color:var(--gold-bright);box-shadow:inset 0 -2px var(--gold)}
.e084-track{position:relative;height:10px;margin:6px 0 4px;border:1px solid var(--line);border-radius:999px;background:var(--surface-2)}
.e084-cursor{position:absolute;top:-3px;width:2px;height:14px;background:var(--gold-bright);transition:left .18s ease}
.e084-panorama.is-static .e084-cursor{transition:none}
.e084-sommaire>summary{min-height:24px;padding:3px 0;color:var(--gold-bright);font-size:9px;cursor:pointer}
.e084-sommaire>summary:focus-visible,.e084-frise-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e084-en-bref{margin:10px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e084-en-bref p{margin:3px 0;color:var(--ink-soft);font-size:10px;line-height:1.5}
.e084-en-bref ul{margin:4px 0 0;padding-left:16px;color:var(--muted);font-size:9px;line-height:1.6}
@media (max-width:620px){.e084-panorama{padding:8px}.e084-frise-btn{min-width:34px}}
@media (prefers-reduced-motion:reduce){.e084-cursor{transition:none!important}}
`;

/* Pointeur module : les boutons créés lisent toujours le dernier layout, même
 * si le panneau a survécu à une reconstruction du DOM par la coque. */
let activeLayout = null;

function makeEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Garde d'existence : un nœud égaré est retiré s'il a migré hors de son parent
 * (changement de vue ou tiroir de diagnostic), ce qui garantit un seul ID
 * `e084-*` vivant à la fois, même après plusieurs rendus. */
function ensure(id, tag, className, parent, after) {
  let node = document.getElementById(id);
  if (node && !parent.contains(node)) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node = null;
  }
  if (!node) {
    node = makeEl(tag, className);
    node.id = id;
    if (after && after.parentNode === parent && after.nextSibling) {
      parent.insertBefore(node, after.nextSibling);
    } else {
      parent.appendChild(node);
    }
  }
  return node;
}

function formatYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) return 'année inconnue';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function plural(count, singular, many) {
  return `${count} ${count > 1 ? many : singular}`;
}

/* Toutes les grandeurs sont dérivées du DOM rendu : bandes d'ères
 * (chronology.js:282-305) et repères de la liste (chronology.js:375-412). */
function readContext(layout) {
  const main = layout.querySelector('.chronology-main') || document.getElementById('atlas-chrono-main');
  const aside = layout.querySelector('.chronology-aside') || document.getElementById('atlas-chrono-aside');
  const status = document.getElementById('atlas-chrono-status');
  const eraNav = document.getElementById('atlas-chrono-eras');
  const bands = eraNav ? Array.from(eraNav.querySelectorAll('.era-band')) : [];
  const currentBand = bands.find((band) => band.getAttribute('aria-current') === 'true')
    || bands.find((band) => band.classList.contains('is-active')) || null;
  const eraIndex = Math.max(0, bands.indexOf(currentBand));
  const eraId = currentBand ? (currentBand.dataset.eraId || '') : '';
  const eraName = currentBand
    ? (currentBand.querySelector('span') ? currentBand.querySelector('span').textContent : '').trim()
    : '';
  const start = currentBand ? Number(currentBand.dataset.start) : NaN;
  const end = currentBand ? Number(currentBand.dataset.end) : NaN;
  const duration = Number.isFinite(start) && Number.isFinite(end) ? end - start : 0;

  const events = Array.from(layout.querySelectorAll('#atlas-chrono-events > li[data-event-id]'));
  const currentCard = layout.querySelector('.event-card[aria-current="true"]')
    || layout.querySelector('.event-card.is-active') || null;
  const currentEvent = currentCard ? currentCard.closest('li[data-event-id]') : null;
  const inEra = events.filter((item) => !eraId || item.dataset.eraId === eraId);

  const years = inEra.map((item) => Number(item.dataset.year)).filter(Number.isFinite);
  const firstYear = years.length ? formatYear(Math.min.apply(null, years)) : 'non détaillé';
  const lastYear = years.length ? formatYear(Math.max.apply(null, years)) : 'non détaillé';
  const density = duration > 0 ? `${round1(inEra.length / (duration / 100))}` : 'non calculable';

  const spans = bands
    .map((band) => [Number(band.dataset.start), Number(band.dataset.end)])
    .filter((pair) => pair.every(Number.isFinite));
  const globalStart = spans.length ? Math.min.apply(null, spans.map((pair) => pair[0])) : NaN;
  const globalEnd = spans.length ? Math.max.apply(null, spans.map((pair) => pair[1])) : NaN;
  const globalSpan = globalEnd - globalStart;

  const counts = new Map();
  events.forEach((item) => {
    const key = item.dataset.eraId || '';
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const kicker = aside ? aside.querySelector('.aside-kicker') : null;
  let match = kicker && kicker.textContent.match(/Repère\s+(\d+)\s*\/\s*(\d+)/);
  if (!match && status) match = status.textContent.match(/rang global\s+(\d+)\s*\/\s*(\d+)/);
  const rank = match ? Number(match[1]) : (currentEvent ? events.indexOf(currentEvent) + 1 : 0);
  const rankTotal = match ? Number(match[2]) : events.length;

  const pointsNode = aside ? aside.querySelector('#atlas-chrono-points-title') : null;
  const pointsFromTitle = pointsNode && pointsNode.textContent.match(/\((\d+)\)/);
  const pointCount = pointsFromTitle
    ? Number(pointsFromTitle[1])
    : (aside ? aside.querySelectorAll('li.point').length : 0);
  const sourceCount = aside ? aside.querySelectorAll('.point-sources li').length : 0;
  const summary = aside && aside.querySelector('.aside-summary')
    ? aside.querySelector('.aside-summary').textContent.replace(/\s+/g, ' ').trim()
    : '';

  return {
    main, aside, status, bands, currentBand, eraIndex, eraId, eraName,
    start, end, duration, events, currentEvent, inEra, firstYear, lastYear,
    density, globalStart, globalEnd, globalSpan, counts, rank, rankTotal,
    pointCount, sourceCount, summary,
    filtering: Boolean(status && /^Recherche/.test(status.textContent.trim())),
  };
}

/* E084-01 : synthèse chiffrée de l'ère, calculée depuis les attributs réels. */
function buildSynthesis(node, data) {
  const list = makeEl('ul', 'e084-list');
  const rows = [
    `Repères affichés dans l'ère : ${plural(data.inEra.length, 'repère', 'repères')}${data.filtering ? ' (périmètre filtré)' : ''}.`,
    `Plage de l'ère : ${formatYear(data.start)} → ${formatYear(data.end)} (${data.duration} ans).`,
    `Densité : ${data.density} repère(s) par siècle.`,
    `Premier repère affiché : ${data.firstYear}.`,
    `Dernier repère affiché : ${data.lastYear}.`,
  ];
  rows.forEach((text) => list.appendChild(makeEl('li', '', text)));
  node.replaceChildren(makeEl('h3', 'e084-h3', `Synthèse · ${data.eraName || 'ère non documentée'}`), list);
}

/* E084-02 : thèmes dominants, triés par effectif décroissant puis par ordre
 * alphabétique français — aucun tirage au sort, aucune couleur seule. */
function buildThemes(node, data) {
  const counter = new Map();
  data.inEra.forEach((item) => {
    (item.dataset.tags || '').split(/\s+/).filter(Boolean).forEach((tag) => {
      counter.set(tag, (counter.get(tag) || 0) + 1);
    });
  });
  const ranked = Array.from(counter.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  const list = makeEl('ul', 'e084-list');
  if (!ranked.length) {
    list.appendChild(makeEl('li', '', 'Aucun thème déclaré pour les repères affichés de cette ère.'));
  } else {
    ranked.slice(0, 6).forEach(([tag, count]) => {
      list.appendChild(makeEl('li', '', `${tag} — ${plural(count, 'repère', 'repères')}.`));
    });
  }
  node.replaceChildren(makeEl('h3', 'e084-h3', 'Thèmes dominants de l’ère'), list);
}

/* E084-03 : niveaux d'importance tels que portés par data-importance
 * (chronology.js:382) ; aucune échelle sémantique n'est inventée. */
function buildImportance(node, data) {
  const counter = new Map();
  data.inEra.forEach((item) => {
    const level = item.dataset.importance || 'non précisé';
    counter.set(level, (counter.get(level) || 0) + 1);
  });
  const levels = Array.from(counter.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], 'fr', { numeric: true }));
  const list = makeEl('ul', 'e084-list');
  if (!levels.length) {
    list.appendChild(makeEl('li', '', 'Aucun repère affiché dans cette ère.'));
  } else {
    levels.forEach(([level, count]) => {
      const share = data.inEra.length ? round1((count / data.inEra.length) * 100) : 0;
      list.appendChild(makeEl('li', '', `Importance ${level} — ${plural(count, 'repère', 'repères')} (${share} % des repères affichés de l'ère).`));
    });
  }
  node.replaceChildren(makeEl('h3', 'e084-h3', 'Répartition par importance'), list);
}

/* Délégation vers la bande d'ère existante : aucun import du store, aucun
 * doublon de logique de sélection (chronology.js:298-302). */
function bindEraJump(button, eraId) {
  button.addEventListener('click', () => {
    const layout = activeLayout;
    if (!layout) return;
    const band = Array.from(layout.querySelectorAll('.era-band'))
      .find((candidate) => candidate.dataset.eraId === eraId);
    if (band && typeof band.click === 'function') band.click();
  });
}

/* E084-04 : frise proportionnelle de toutes les ères ; la largeur relative
 * vient de la durée réelle, le libellé reste du texte lisible. */
function buildFrieze(node, data) {
  const list = makeEl('ol', 'e084-frise');
  if (!data.bands.length) {
    list.appendChild(makeEl('li', '', 'Aucune ère documentée pour ce pays.'));
  } else {
    data.bands.forEach((band) => {
      const id = band.dataset.eraId || '';
      const name = band.querySelector('span') ? band.querySelector('span').textContent.trim() : '';
      const start = Number(band.dataset.start);
      const end = Number(band.dataset.end);
      const span = Number.isFinite(start) && Number.isFinite(end) ? Math.max(1, end - start) : 1;
      const count = data.counts.get(id) || 0;
      const label = `${name || 'Ère'} · ${formatYear(start)} → ${formatYear(end)}${count ? ` · ${plural(count, 'repère', 'repères')}` : ''}`;
      const button = makeEl('button', 'e084-frise-btn', label);
      button.type = 'button';
      button.title = label;
      button.dataset.e084EraId = id;
      button.style.flexGrow = String(span);
      if (band === data.currentBand) button.setAttribute('aria-current', 'true');
      bindEraJump(button, id);
      const item = makeEl('li');
      item.appendChild(button);
      list.appendChild(item);
    });
  }
  node.replaceChildren(makeEl('h3', 'e084-h3', 'Frise globale des ères'), list);
}

/* E084-06 : couverture temporelle du pays et position de l'ère courante.
 * La piste est décorative (aria-hidden) ; le chiffre est énoncé en texte. */
function buildCoverage(node, data) {
  const known = Number.isFinite(data.globalStart) && Number.isFinite(data.globalEnd) && data.globalSpan > 0;
  const line = known
    ? `Couverture du pays : ${formatYear(data.globalStart)} → ${formatYear(data.globalEnd)} (${data.globalSpan} ans). Ère courante : ${formatYear(data.start)} → ${formatYear(data.end)}.`
    : 'Couverture temporelle non calculable : ères sans bornes exploitables.';
  const track = makeEl('div', 'e084-track');
  track.setAttribute('aria-hidden', 'true');
  const cursor = makeEl('div', 'e084-cursor');
  const position = known ? ((data.start - data.globalStart) / data.globalSpan) * 100 : 0;
  cursor.style.left = `${Math.max(0, Math.min(100, round1(position)))} %`;
  track.appendChild(cursor);
  const note = known
    ? `Position de l'ère sur la frise : ${round1(position)} % du temps couvert.`
    : 'Aucun curseur de lecture affiché.';
  node.replaceChildren(
    makeEl('h3', 'e084-h3', 'Couverture temporelle'),
    makeEl('p', 'e084-line', line),
    track,
    makeEl('p', 'e084-line', note)
  );
}

/* E084-05 : boussole de lecture globale, région live prudente — le texte
 * n'est réécrit que s'il change réellement d'un rendu à l'autre. */
function buildCompass(node, data) {
  const share = data.rankTotal ? round1((data.rank / data.rankTotal) * 100) : 0;
  const text = data.bands.length
    ? `Lecture globale · ère ${data.eraIndex + 1}/${data.bands.length} · ${data.eraName || 'ère sans nom'} · rang global ${data.rank}/${data.rankTotal} (${share} % du parcours) · ${plural(data.inEra.length, 'repère affiché', 'repères affichés')} dans l'ère.`
    : 'Lecture globale · aucune ère documentée pour ce pays.';
  if (node.textContent !== text) node.textContent = text;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
}

/* E084-07 : sommaire textuel, distinct de la frise graphique ; l'état ouvert
 * du panneau est conservé d'un rendu à l'autre. */
function buildSummary(node, data) {
  const wasOpen = Boolean(node.querySelector('details') && node.querySelector('details').open);
  const details = makeEl('details', 'e084-sommaire');
  details.open = wasOpen;
  details.appendChild(makeEl('summary', '', `Sommaire global des ères (${data.bands.length})`));
  const list = makeEl('ol', 'e084-list');
  data.bands.forEach((band) => {
    const id = band.dataset.eraId || '';
    const name = band.querySelector('span') ? band.querySelector('span').textContent.trim() : '';
    const count = data.counts.get(id) || 0;
    const label = `${name || 'Ère'} · ${formatYear(band.dataset.start)} → ${formatYear(band.dataset.end)} · ${count ? plural(count, 'repère affiché', 'repères affichés') : 'repères non affichés dans cette ère'}`;
    const button = makeEl('button', 'e084-frise-btn', label);
    button.type = 'button';
    button.dataset.e084EraId = id;
    if (band === data.currentBand) button.setAttribute('aria-current', 'true');
    bindEraJump(button, id);
    const item = makeEl('li');
    item.appendChild(button);
    list.appendChild(item);
  });
  if (!data.bands.length) list.appendChild(makeEl('li', '', 'Aucune ère documentée.'));
  details.appendChild(list);
  node.replaceChildren(makeEl('h3', 'e084-h3', 'Repères de lecture'), details);
}

/* E084-08 : condensé du repère courant, ancré après le résumé existant
 * (chronology.js:439) sans réécrire la fiche ni ses sources. */
function buildBrief(node, data) {
  if (!data.currentEvent || !data.aside || !data.summary) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
    return null;
  }
  const sentence = (data.summary.match(/^[^.!?]+[.!?]?/) || [data.summary])[0];
  const short = sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence;
  const list = makeEl('ul');
  [
    `Année : ${formatYear(data.currentEvent.dataset.year)}.`,
    `Points vérifiés : ${plural(data.pointCount, 'point', 'points')}.`,
    `Sources citées : ${plural(data.sourceCount, 'source', 'sources')}.`,
  ].forEach((text) => list.appendChild(makeEl('li', '', text)));
  node.replaceChildren(
    makeEl('h3', 'e084-h3', 'Le repère en bref'),
    makeEl('p', '', short),
    list
  );
  return node;
}

/* E084-09 : miroir d'état purement déclaratif, lisible par un audit ou un
 * test sans instrumentation ni journalisation. */
function mirrorState(layout, data) {
  layout.dataset.e084EraId = data.eraId;
  layout.dataset.e084EraIndex = String(data.eraIndex + 1);
  layout.dataset.e084EraTotal = String(data.bands.length);
  layout.dataset.e084Rank = String(data.rank);
  layout.dataset.e084RankTotal = String(data.rankTotal);
  layout.dataset.e084EventsShown = String(data.events.length);
  layout.dataset.e084EraEvents = String(data.inEra.length);
  layout.dataset.e084Filtered = data.filtering ? '1' : '0';
}

register('E084', (ctx) => {
  const stage = ctx && ctx.stage;
  const layout = ctx && ctx.layout;
  if (!stage || !layout) return;

  const el = typeof ctx.el === 'function' ? ctx.el : makeEl;
  const css = typeof ctx.css === 'function' ? ctx.css : () => {};
  const data = readContext(layout);
  activeLayout = layout;

  /* E084-10 : unique bloc CSS, unique enregistrement, nœuds gardés. */
  css(CSS_ID, CSS);
  const main = data.main;
  if (!main) return;

  const anchor = main.querySelector('.nav-c2-orientation')
    || main.querySelector('.atlas-chrono-era-nav')
    || main.querySelector('.atlas-chrono-status')
    || main.firstChild;
  const panorama = ensure(PANORAMA_ID, 'section', 'e084-panorama', main, anchor);
  panorama.setAttribute('aria-labelledby', TITLE_ID);

  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    panorama.classList.add('is-static');
  } else {
    panorama.classList.remove('is-static');
  }

  const title = ensure(TITLE_ID, 'h2', 'e084-h2', panorama);
  title.textContent = 'Synthèse et repères de lecture';

  buildSynthesis(ensure(SYNTH_ID, 'div', 'e084-block', panorama), data);
  const compass = ensure(COMPASS_ID, 'p', 'e084-boussole', panorama);
  buildCompass(compass, data);
  buildCoverage(ensure(COVER_ID, 'div', 'e084-block', panorama), data);
  buildFrieze(ensure(FRIEZE_ID, 'div', 'e084-block', panorama), data);
  buildThemes(ensure(THEMES_ID, 'div', 'e084-block', panorama), data);
  buildImportance(ensure(IMPORTANCE_ID, 'div', 'e084-block', panorama), data);
  buildSummary(ensure(SUMMARY_ID, 'div', 'e084-block', panorama), data);

  let brief = document.getElementById(BRIEF_ID);
  if (!data.aside || (brief && !data.aside.contains(brief))) {
    if (brief && brief.parentNode) brief.parentNode.removeChild(brief);
    brief = null;
  }
  if (!brief && data.aside) {
    brief = el('section', 'e084-en-bref');
    brief.id = BRIEF_ID;
    brief.setAttribute('aria-label', 'Le repère en bref');
    const summaryNode = data.aside.querySelector('.aside-summary');
    if (summaryNode && summaryNode.nextSibling) {
      data.aside.insertBefore(brief, summaryNode.nextSibling);
    } else {
      data.aside.appendChild(brief);
    }
  }
  buildBrief(brief, data);

  mirrorState(layout, data);
});
