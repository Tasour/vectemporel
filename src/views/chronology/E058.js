import { register } from './registry.js';

/* Lentille CHRONOLOGIE E058 — Repère temporel visuel, frise et ligne de temps
 * continue.
 *
 * Dix chantiers E058-01 … E058-10, tous implémentés dans ce module. Un seul
 * register('E058'), un seul ctx.css('chronology-e058', …), aucun fichier
 * partagé modifié. Toutes les grandeurs sont dérivées du DOM réel construit
 * par chronology.js (bandes d'ères `data-start`/`data-end`, repères
 * `li[data-year]`) : aucune donnée inventée, aucun réseau, aucun
 * `Math.random`, aucun `console.*`, aucune boucle rAF, aucun timer.
 *
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css.
 * Le rapport est dans UNIFIED_AUDIT/CHRONOLOGIE/views/E058.md.
 */

const CSS_ID = 'chronology-e058';
const SCOPE = 'chronology-e058';
const FRISE_ID = 'e058-frise';
const TITLE_ID = 'e058-title';
const TOGGLE_ID = 'e058-toggle';
const AXIS_ID = 'e058-axis';
const DESC_ID = 'e058-axis-desc';
const READOUT_ID = 'e058-readout';
const REDUCED_ATTR = 'data-e058-reduced';

/* État de module : il survit aux reconstructions complètes du `stage`
   opérées par la coque (chronology.js:539 appelle runEnhancements à chaque
   rendu). Jamais écrit dans le store partagé. */
let visible = true;

const CSS = `
.chronology-e058 #${FRISE_ID}{
  margin:10px 0 14px;padding:10px 12px 12px;border:1px solid var(--line);
  border-radius:8px;background:rgba(255,255,255,.02);
}
.chronology-e058 .e058-head{
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
  gap:8px;margin-bottom:16px;
}
.chronology-e058 .e058-title{
  margin:0;color:var(--ink-soft);font-family:var(--serif);font-size:14px;font-weight:450;
}
.chronology-e058 .e058-toggle{
  min-height:36px;padding:5px 12px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear;
}
.chronology-e058 .e058-toggle[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright)}
.chronology-e058 .e058-toggle:hover{border-color:var(--gold)}
.chronology-e058 .e058-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e058 .e058-axis{position:relative;margin:0;padding:2px 0 0}
.chronology-e058 .e058-track{position:relative;height:64px}
.chronology-e058 .e058-track::before{
  content:"";position:absolute;left:0;right:0;top:38px;height:2px;
  background:linear-gradient(90deg,var(--line),var(--gold),var(--line));
}
.chronology-e058 .e058-eras{position:absolute;left:0;right:0;top:4px;height:22px}
.chronology-e058 .e058-era{
  position:absolute;top:0;height:20px;box-sizing:border-box;padding:2px 5px;
  border:1px solid var(--era,var(--line));border-radius:4px;
  background:color-mix(in srgb,var(--era,var(--muted)) 16%,transparent);
  color:var(--ink-soft);font-size:9px;line-height:16px;
  transition:left .2s linear,border-color .2s linear;
}
.chronology-e058 .e058-era.is-current{
  border-color:var(--gold-bright);box-shadow:inset 0 0 0 1px rgba(244,214,158,.35);
}
.chronology-e058 .e058-era-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chronology-e058 .e058-era-badge{
  position:absolute;left:0;top:-13px;padding:0 5px;border:1px solid var(--gold);
  border-radius:999px;background:rgba(8,11,16,.94);color:var(--gold-bright);
  font-size:8px;white-space:nowrap;
}
.chronology-e058 .e058-marks{position:absolute;left:0;right:0;top:32px;height:10px}
.chronology-e058 .e058-mark{
  position:absolute;left:var(--e058-pos);top:0;width:1px;height:8px;
  background:var(--muted-2);transition:left .2s linear,background-color .2s linear;
}
.chronology-e058 .e058-mark.is-current{width:2px;height:10px;background:var(--gold-bright)}
.chronology-e058 .e058-cursor{
  position:absolute;left:var(--e058-pos);top:26px;width:0;height:22px;
  transition:left .2s linear;
}
.chronology-e058 .e058-cursor::before{
  content:"";position:absolute;left:-4px;top:0;border-left:4px solid transparent;
  border-right:4px solid transparent;border-top:7px solid var(--gold-bright);
}
.chronology-e058 .e058-cursor-label{
  position:absolute;left:0;top:9px;transform:translateX(-50%);white-space:nowrap;
  padding:1px 5px;border:1px solid var(--gold);border-radius:5px;
  background:rgba(8,11,16,.94);color:var(--gold-bright);
  font-size:9px;font-variant-numeric:tabular-nums;
}
.chronology-e058 .e058-ticks{position:absolute;left:0;right:0;top:50px;height:18px}
.chronology-e058 .e058-tick{position:absolute;left:var(--e058-pos);top:0;width:0}
.chronology-e058 .e058-tick::before{
  content:"";position:absolute;left:0;top:0;width:1px;height:5px;background:var(--line-strong);
}
.chronology-e058 .e058-tick-label{
  position:absolute;left:0;top:6px;transform:translateX(-50%);white-space:nowrap;
  color:var(--muted);font-size:8px;font-variant-numeric:tabular-nums;
}
.chronology-e058 .e058-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
.chronology-e058 .e058-readout{
  margin:6px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
.chronology-e058[${REDUCED_ATTR}="1"] .e058-era,
.chronology-e058[${REDUCED_ATTR}="1"] .e058-mark,
.chronology-e058[${REDUCED_ATTR}="1"] .e058-cursor,
.chronology-e058[${REDUCED_ATTR}="1"] .e058-toggle{transition:none}
@media (max-width:620px){
  .chronology-e058 #${FRISE_ID}{padding:8px 8px 10px}
  .chronology-e058 .e058-title{font-size:12px}
  .chronology-e058 .e058-era{font-size:8px}
  .chronology-e058 .e058-tick:nth-child(even) .e058-tick-label{display:none}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e058 .e058-era,
  .chronology-e058 .e058-mark,
  .chronology-e058 .e058-cursor,
  .chronology-e058 .e058-toggle{transition:none}
}`;

/* same convention que formatYear (chronology.js:26-28) : aucune donnée
   supplémentaire n'est fabriquée, seul le millésime lu est reformatté. */
function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/* Pas de graduation choisi dans une liste fixe, donc déterministe et sans
   aléa : on vise environ cinq repères lisibles sur la période couverte. */
function tickStep(span) {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const target = span / 5;
  return steps.find((step) => step >= target) || steps[steps.length - 1];
}

function tickYears(min, max) {
  const step = tickStep(max - min);
  const years = [];
  const first = Math.ceil(min / step) * step;
  for (let year = first, guard = 0; year <= max && guard < 40; year += step, guard += 1) {
    years.push(year);
  }
  if (!years.length) years.push(min);
  if (years.length === 1 && years[0] !== max) years.push(max);
  return years;
}

register('E058', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (!layout || (viewId && viewId !== 'chronology')) return;
  const main = layout.querySelector('#atlas-chrono-main');
  const list = layout.querySelector('#atlas-chrono-events');
  if (!main || !list) return;

  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e058 = visible ? '1' : '0';

  /* E058-08 : couplage explicite à la préférence, en plus de la media query. */
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E058-01 : lecture des bandes d'ères (chronology.js:282-305) et des
     repères (chronology.js:375-412). Tout est dérivé d'attributs déjà posés. */
  const eras = Array.from(layout.querySelectorAll('.era-band[data-start][data-end]'))
    .map((band) => {
      const start = Number(band.dataset.start);
      const end = Number(band.dataset.end);
      const nameNode = band.querySelector('span');
      return {
        start,
        end,
        name: nameNode ? (nameNode.textContent || '').trim() : '',
        color: band.style.getPropertyValue('--era').trim(),
        current: band.getAttribute('aria-current') === 'true',
      };
    })
    .filter((era) => Number.isFinite(era.start) && Number.isFinite(era.end));

  const events = Array.from(list.querySelectorAll('li[data-year]'))
    .map((item) => {
      const year = Number(item.dataset.year);
      const yearNode = item.querySelector('.event-year');
      const titleNode = item.querySelector('strong');
      return {
        year,
        yearText: yearNode ? (yearNode.textContent || '').trim() : formatYear(year),
        title: titleNode ? (titleNode.textContent || '').trim() : '',
        current: Boolean(item.querySelector('.event-card[aria-current="true"]')),
      };
    })
    .filter((event) => Number.isFinite(event.year));

  const allYears = eras.reduce((acc, era) => acc.concat([era.start, era.end]), [])
    .concat(events.map((event) => event.year));
  if (!allYears.length) return;
  const min = Math.min.apply(null, allYears);
  const max = Math.max.apply(null, allYears);
  const span = max - min;
  const position = (year) => (span > 0 ? clamp(((year - min) / span) * 100, 0, 100) : 50);
  const currentEvent = events.find((event) => event.current) || null;
  const currentEra = eras.find((era) => era.current) || null;
  const ticks = tickYears(min, max);
  const titleText = (main.querySelector('#atlas-chrono-title') || {}).textContent || 'Chronologie';

  /* E058-09 : le conteneur est réutilisé si runEnhancements repasse sur le
     même DOM, recréé sinon après un rendu complet de la coque. */
  let frise = document.getElementById(FRISE_ID);
  if (!frise) {
    frise = el('section', 'e058-frise');
    frise.id = FRISE_ID;
    list.parentNode.insertBefore(frise, list);
  }
  frise.textContent = '';
  frise.setAttribute('aria-labelledby', TITLE_ID);

  const head = el('div', 'e058-head');
  const title = el('h2', 'e058-title', 'Repère temporel continu');
  title.id = TITLE_ID;
  head.appendChild(title);
  const toggle = el('button', 'e058-toggle', visible ? 'Masquer la frise' : 'Afficher la frise');
  toggle.type = 'button';
  toggle.id = TOGGLE_ID;
  toggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
  toggle.setAttribute('aria-controls', AXIS_ID);
  toggle.addEventListener('click', () => {
    visible = !visible;
    toggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
    toggle.textContent = visible ? 'Masquer la frise' : 'Afficher la frise';
    const axis = document.getElementById(AXIS_ID);
    if (axis) axis.hidden = !visible;
    if (frise.isConnected) frise.dataset.e058 = visible ? '1' : '0';
    if (layout.isConnected) layout.dataset.e058 = visible ? '1' : '0';
  });
  head.appendChild(toggle);
  frise.appendChild(head);

  /* E058-02 à E058-05 : une seule ligne continue, trois calques superposés
     (frise d'ères, marques de repères, curseur) et des graduations. */
  const axis = el('figure', 'e058-axis');
  axis.id = AXIS_ID;
  axis.setAttribute('role', 'img');
  axis.setAttribute('aria-label', `Frise chronologique continue — ${(titleText || '').trim()}`);
  axis.setAttribute('aria-describedby', DESC_ID);
  axis.hidden = !visible;

  const track = el('div', 'e058-track');
  const ribbon = el('div', 'e058-eras');
  eras.forEach((era) => {
    const segment = el('span', `e058-era${era.current ? ' is-current' : ''}`);
    segment.style.left = `${position(era.start)}%`;
    segment.style.width = `${Math.max(0, position(era.end) - position(era.start))}%`;
    if (era.color) segment.style.setProperty('--era', era.color);
    segment.title = `${formatYear(era.start)} → ${formatYear(era.end)}`;
    segment.appendChild(el('span', 'e058-era-name', era.name || 'Ère'));
    if (era.current) {
      segment.appendChild(el('span', 'e058-era-badge', 'Ère courante'));
    }
    ribbon.appendChild(segment);
  });
  track.appendChild(ribbon);

  const marks = el('div', 'e058-marks');
  events.forEach((event) => {
    const mark = el('span', `e058-mark${event.current ? ' is-current' : ''}`);
    mark.style.setProperty('--e058-pos', `${position(event.year)}%`);
    mark.title = event.yearText + (event.title ? ` — ${event.title}` : '');
    mark.setAttribute('aria-hidden', 'true');
    marks.appendChild(mark);
  });
  track.appendChild(marks);

  if (currentEvent) {
    const cursor = el('div', 'e058-cursor');
    cursor.style.setProperty('--e058-pos', `${position(currentEvent.year)}%`);
    cursor.setAttribute('aria-hidden', 'true');
    cursor.appendChild(el('span', 'e058-cursor-label', currentEvent.yearText));
    track.appendChild(cursor);
  }

  const tickLayer = el('div', 'e058-ticks');
  ticks.forEach((year) => {
    const tick = el('span', 'e058-tick');
    tick.style.setProperty('--e058-pos', `${position(year)}%`);
    tick.setAttribute('aria-hidden', 'true');
    tick.appendChild(el('span', 'e058-tick-label', formatYear(year)));
    tickLayer.appendChild(tick);
  });
  track.appendChild(tickLayer);
  axis.appendChild(track);
  frise.appendChild(axis);

  /* E058-07 : équivalent textuel complet, hors de l'élément role="img"
     (ses descendants sont présents seulement visuellement). */
  const eraLength = currentEra ? currentEra.end - currentEra.start : 0;
  const eraShare = currentEra ? Math.round((100 * eraLength) / (span || 1)) : 0;
  const meanGap = events.length && span > 0 ? Math.round(span / events.length) : null;
  const desc = el('p', 'e058-sr');
  desc.id = DESC_ID;
  desc.textContent = `Axe continu couvrant ${formatYear(min)} à ${formatYear(max)}, soit ${span} ans. `
    + `${events.length} repères sont répartis sur cet axe. `
    + (currentEvent
      ? `Repère courant ${currentEvent.yearText}, à ${Math.round(position(currentEvent.year))} % de l'axe. `
      : 'Aucun repère courant. ')
    + (currentEra
      ? `Ère courante ${currentEra.name}, de ${formatYear(currentEra.start)} à ${formatYear(currentEra.end)}, soit ${eraLength} ans, ${eraShare} % de la période couverte.`
      : 'Aucune ère courante.');
  frise.appendChild(desc);

  /* E058-10 : mesure chiffrée audible, non portée par la couleur. */
  const readout = el('p', 'e058-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  readout.textContent = `Frise continue : ${span} ans de ${formatYear(min)} à ${formatYear(max)}`
    + ` · ${events.length} repères`
    + (meanGap !== null ? ` (1 repère pour ${meanGap} ans en moyenne)` : '')
    + (currentEvent
      ? ` · repère courant ${currentEvent.yearText} à ${Math.round(position(currentEvent.year))} % de l'axe`
      : '')
    + (currentEra
      ? ` · ère courante ${currentEra.name} : ${eraLength} ans, soit ${eraShare} % de la période couverte`
      : '')
    + '.';
  frise.appendChild(readout);
});
