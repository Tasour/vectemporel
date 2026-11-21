import { register } from './registry.js';

/* Lentille CHRONOLOGIE E059 — Comparaison d'échelles, siècles et millénaires,
 * proportions temporelles.
 *
 * Dix chantiers E059-01 … E059-10, tous implémentés dans ce module. Un seul
 * un seul appel à register sous l'identifiant E059, un seul appel à ctx.css
 * avec l'identifiant chronology-e059, aucun fichier partagé modifié. Toutes
 * les grandeurs sont dérivées du DOM réel construit par chronology.js
 * (bandes d'ères `data-start`/`data-end`, repères `li[data-year]`) : aucune
 * donnée inventée, aucun réseau, aucune valeur aléatoire, aucun journal
 * d'erreur, aucune boucle ni timer.
 *
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css.
 * Le rapport est dans UNIFIED_AUDIT/CHRONOLOGIE/views/E059.md.
 */

const CSS_ID = 'chronology-e059';
const SCOPE = 'chronology-e059';
const PANEL_ID = 'e059-scales';
const TITLE_ID = 'e059-title';
const UNITS_ID = 'e059-units';
const LOG_ID = 'e059-log';
const FIG_ID = 'e059-compare';
const RULER_ID = 'e059-ruler';
const DESC_ID = 'e059-desc';
const READOUT_ID = 'e059-readout';
const REDUCED_ATTR = 'data-e059-reduced';

/* État de module : il survit aux reconstructions complètes du `stage`
   opérées par la coque (chronology.js:539 appelle runEnhancements à chaque
   rendu). Jamais écrit dans le store partagé. */
let unit = 'siecle';
let logarithmic = false;

const UNITS = {
  an: { label: 'Années', short: 'an' },
  siecle: { label: 'Siècles', short: 'siècle' },
  millenaire: { label: 'Millénaires', short: 'millénaire' },
};
const UNIT_KEYS = ['an', 'siecle', 'millenaire'];
const DIVISOR = { an: 1, siecle: 100, millenaire: 1000 };

const CSS = `
.chronology-e059 #${PANEL_ID}{
  margin:10px 0 14px;padding:10px 12px 12px;border:1px solid var(--line);
  border-radius:8px;background:rgba(255,255,255,.02);
}
.chronology-e059 .e059-title{
  margin:0;color:var(--ink-soft);font-family:var(--serif);font-size:14px;font-weight:450;
}
.chronology-e059 .e059-controls{
  display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0 12px;
}
.chronology-e059 .e059-units{display:flex;flex-wrap:wrap;gap:4px}
.chronology-e059 .e059-unit,.chronology-e059 .e059-log{
  min-height:36px;padding:5px 11px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear;
}
.chronology-e059 .e059-unit[aria-checked="true"],
.chronology-e059 .e059-log[aria-pressed="true"]{
  border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.08);
}
.chronology-e059 .e059-unit:hover,.chronology-e059 .e059-log:hover{border-color:var(--gold)}
.chronology-e059 .e059-unit:focus-visible,.chronology-e059 .e059-log:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.chronology-e059 .e059-fig{margin:0}
.chronology-e059 .e059-ruler{
  display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;padding:6px 8px;
  border:1px dashed var(--line);border-radius:6px;
}
.chronology-e059 .e059-ruler-step{
  padding:2px 7px;border:1px solid var(--line);border-radius:4px;
  color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;
}
.chronology-e059 .e059-row{
  display:grid;grid-template-columns:minmax(78px,116px) 1fr auto;
  align-items:center;gap:8px;margin:5px 0;font-size:9px;
}
.chronology-e059 .e059-row-name{
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-soft);
}
.chronology-e059 .e059-row.is-current .e059-row-name{color:var(--gold-bright);font-weight:600}
.chronology-e059 .e059-track{
  position:relative;height:12px;border:1px solid var(--line);
  border-radius:6px;background:rgba(255,255,255,.04);
}
.chronology-e059 .e059-bar{
  position:absolute;left:0;top:0;bottom:0;width:var(--e059-w);min-width:2px;
  border:1px solid var(--era,var(--gold));border-radius:6px;
  background:color-mix(in srgb,var(--era,var(--gold)) 45%,transparent);
  transition:width .2s linear;
}
.chronology-e059 .e059-bar.is-current{box-shadow:inset 0 0 0 1px rgba(244,214,158,.5)}
.chronology-e059 .e059-row-value{
  color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap;
}
.chronology-e059 .e059-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
.chronology-e059 .e059-readout{
  margin:6px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
.chronology-e059[${REDUCED_ATTR}="1"] .e059-unit,
.chronology-e059[${REDUCED_ATTR}="1"] .e059-log,
.chronology-e059[${REDUCED_ATTR}="1"] .e059-bar{transition:none}
@media (max-width:620px){
  .chronology-e059 .e059-row{grid-template-columns:minmax(64px,86px) 1fr}
  .chronology-e059 .e059-row-value{grid-column:2}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e059 .e059-unit,
  .chronology-e059 .e059-log,
  .chronology-e059 .e059-bar{transition:none}
}`;

/* Même convention que formatYear (chronology.js:26-28) : aucun millésime
   supplémentaire n'est fabriqué, seul le nombre lu est reformatté. */
function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/* Séparateur décimal français, sans dépendance à une locale et sans aléa. */
function formatNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace('.', ',');
}

register('E059', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (!layout || (viewId && viewId !== 'chronology')) return;
  const doc = layout.ownerDocument || document;
  const list = layout.querySelector('#atlas-chrono-events');
  const main = layout.querySelector('#atlas-chrono-main');
  if (!list || !list.parentNode || !main) return;

  /* Reconstruit le comparateur à partir du DOM courant. `focusId` restaure
     le focus sur le contrôle qui vient d'être activé après reconstruction. */
  function rebuild(focusId) {
    /* E059-01 : lecture des bandes d'ères (chronology.js:282-305) et des
       repères (chronology.js:375-412), tous deux dérivés d'attributs réels. */
    const eras = Array.from(layout.querySelectorAll('.era-band[data-start][data-end]'))
      .map((band) => {
        const a = Number(band.dataset.start);
        const b = Number(band.dataset.end);
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        const nameNode = band.querySelector('span');
        return {
          start,
          end,
          duration: Math.max(0, end - start),
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
    let panel = doc.getElementById(PANEL_ID);
    if (!allYears.length) {
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      return;
    }

    const min = Math.min.apply(null, allYears);
    const max = Math.max.apply(null, allYears);
    const span = Math.max(0, max - min);
    const durations = eras.map((era) => era.duration);
    const minDuration = durations.length ? Math.min.apply(null, durations) : 0;
    const maxDuration = durations.length ? Math.max.apply(null, durations) : 0;
    const currentEvent = events.find((event) => event.current) || null;
    const currentEra = eras.find((era) => era.current) || null;
    const unitInfo = UNITS[unit] || UNITS.siecle;
    const divisor = DIVISOR[unit] || 1;
    const logDenominator = Math.log10(maxDuration + 1) || 1;

    /* E059-02 : deux échelles déterministes. Linéaire = part de la période
       couverte ; logarithmique = log10(durée+1) normalisé, plancher à 2 %. */
    function widthFor(duration) {
      if (logarithmic) {
        return clamp((Math.log10(duration + 1) / logDenominator) * 100, 2, 100);
      }
      return span > 0 ? clamp((duration / span) * 100, 0, 100) : 0;
    }

    /* E059-04 : proportion temporelle, exprimée en pourcentage de la période. */
    function shareOf(duration) {
      return span > 0 ? Math.round((duration / span) * 100) : 0;
    }

    /* E059-03 : granularité en siècles et millénaires, décomptée par bornes. */
    function centuriesOf(era) {
      return Math.max(1, Math.floor(era.end / 100) - Math.floor(era.start / 100) + 1);
    }
    function millenniaOf(era) {
      return Math.max(1, Math.floor(era.end / 1000) - Math.floor(era.start / 1000) + 1);
    }

    /* E059-10 : rapport à une référence explicite, l'ère la plus courte. */
    function ratioTo(duration) {
      return minDuration > 0 ? Math.round((duration / minDuration) * 10) / 10 : null;
    }

    css(CSS_ID, CSS);
    layout.classList.add(SCOPE);

    /* E059-08 : double protection — media query et marqueur calculé depuis
       ctx.reducedMotion() (registry.js:33-36). */
    if (typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute(REDUCED_ATTR, '1');
    } else {
      layout.removeAttribute(REDUCED_ATTR);
    }

    /* E059-09 : le conteneur est réutilisé s'il existe, sinon créé et inséré
       avant la liste ; son contenu est vidé puis reconstruit à chaque passage. */
    if (!panel) {
      panel = el('section', 'e059-panel');
      panel.id = PANEL_ID;
      list.parentNode.insertBefore(panel, list);
    }
    panel.textContent = '';
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const head = el('div', 'e059-head');
    const title = el('h2', 'e059-title', 'Comparateur d’échelles temporelles');
    title.id = TITLE_ID;
    head.appendChild(title);

    /* E059-06 : le choix d'unité est unique → radiogroup et aria-checked,
       pas aria-pressed (cf. contrat et E058-06). */
    const controls = el('div', 'e059-controls');
    const group = el('div', 'e059-units');
    group.id = UNITS_ID;
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Unité de comparaison des durées');
    UNIT_KEYS.forEach((key, index) => {
      const button = el('button', 'e059-unit', UNITS[key].label);
      button.type = 'button';
      button.id = `e059-unit-${key}`;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', unit === key ? 'true' : 'false');
      button.tabIndex = unit === key ? 0 : -1;
      button.addEventListener('click', () => {
        if (unit !== key) {
          unit = key;
          rebuild(button.id);
        }
      });
      button.addEventListener('keydown', (event) => {
        let targetIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          targetIndex = (index + 1) % UNIT_KEYS.length;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          targetIndex = (index - 1 + UNIT_KEYS.length) % UNIT_KEYS.length;
        }
        if (targetIndex === null) return;
        event.preventDefault();
        const nextKey = UNIT_KEYS[targetIndex];
        unit = nextKey;
        rebuild(`e059-unit-${nextKey}`);
      });
      group.appendChild(button);
    });
    controls.appendChild(group);

    /* E059-02 : bascule indépendante du choix d'unité, donc aria-pressed. */
    const logButton = el('button', 'e059-log', logarithmic
      ? 'Échelle logarithmique activée'
      : 'Échelle logarithmique désactivée');
    logButton.type = 'button';
    logButton.id = LOG_ID;
    logButton.setAttribute('aria-pressed', logarithmic ? 'true' : 'false');
    logButton.addEventListener('click', () => {
      logarithmic = !logarithmic;
      rebuild(LOG_ID);
    });
    controls.appendChild(logButton);
    head.appendChild(controls);
    panel.appendChild(head);

    /* E059-01, -03, -04, -05 : figure unique, règle des unités et une barre
       proportionnelle par ère, jamais portée par la seule couleur. */
    const figureEl = el('figure', 'e059-fig');
    figureEl.id = FIG_ID;
    figureEl.setAttribute('role', 'img');
    const titleText = ((main.querySelector('#atlas-chrono-title') || {}).textContent || '').trim() || 'Chronologie';
    figureEl.setAttribute('aria-label', `Comparateur d’échelles temporelles — ${titleText}`);
    figureEl.setAttribute('aria-describedby', DESC_ID);

    const ruler = el('div', 'e059-ruler');
    ruler.id = RULER_ID;
    ruler.append(
      el('span', 'e059-ruler-step', '1 an'),
      el('span', 'e059-ruler-step', '1 siècle = 100 ans'),
      el('span', 'e059-ruler-step', '1 millénaire = 1 000 ans = 10 siècles')
    );
    figureEl.appendChild(ruler);

    eras.forEach((era) => {
      const row = el('div', `e059-row${era.current ? ' is-current' : ''}`);
      const name = el('span', 'e059-row-name', era.name || 'Ère');
      name.title = `${formatYear(era.start)} → ${formatYear(era.end)}`;
      const track = el('span', 'e059-track');
      const bar = el('span', `e059-bar${era.current ? ' is-current' : ''}`);
      bar.style.setProperty('--e059-w', `${widthFor(era.duration)}%`);
      if (era.color) bar.style.setProperty('--era', era.color);
      track.appendChild(bar);
      const ratio = ratioTo(era.duration);
      const value = el('span', 'e059-row-value',
        `${formatNumber(era.duration / divisor)} ${unitInfo.short}(s) · ${shareOf(era.duration)} %`
        + (ratio !== null ? ` · ×${formatNumber(ratio)}` : ''));
      row.append(name, track, value);
      figureEl.appendChild(row);
    });
    panel.appendChild(figureEl);

    /* E059-07 : équivalent textuel complet, hors de l'élément role="img"
       (ses descendants sont présents seulement visuellement). */
    const spanCenturies = Math.ceil(span / 100);
    const spanMillennia = Math.ceil(span / 1000);
    const desc = el('p', 'e059-sr');
    desc.id = DESC_ID;
    desc.textContent = `Comparateur d’échelles : période de ${formatYear(min)} à ${formatYear(max)}, soit ${span} ans, `
      + `${spanCenturies} siècle(s) ou ${spanMillennia} millénaire(s). `
      + `${eras.length} ère(s) et ${events.length} repère(s). `
      + `Unité de comparaison : ${unitInfo.label}. Échelle ${logarithmic ? 'logarithmique' : 'linéaire'}. `
      + eras.map((era) => `Ère ${era.name || 'sans nom'} : ${formatNumber(era.duration / divisor)} ${unitInfo.short}(s), `
          + `${centuriesOf(era)} siècle(s), ${millenniaOf(era)} millénaire(s), ${shareOf(era.duration)} % de la période.`).join(' ')
      + (currentEvent ? ` Repère courant ${currentEvent.yearText}.` : ' Aucun repère courant.');
    panel.appendChild(desc);

    /* E059-10 : mesure chiffrée audible, comparée à une référence explicite. */
    const readout = el('p', 'e059-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    const maxRatio = maxDuration > 0 ? ratioTo(maxDuration) : null;
    readout.textContent = `Échelles : ${span} ans (${spanMillennia} millénaire(s), ${spanCenturies} siècles)`
      + ` · unité ${unitInfo.label.toLowerCase()}`
      + ` · ${eras.length} ères / ${events.length} repères`
      + (currentEra
        ? ` · ère courante : ${formatNumber(currentEra.duration / divisor)} ${unitInfo.short}(s), ${shareOf(currentEra.duration)} % de la période, ${centuriesOf(currentEra)} siècles et ${millenniaOf(currentEra)} millénaires`
        : '')
      + (maxRatio !== null
        ? ` · référence : ère la plus courte ${minDuration} ans, rapport maximal ×${formatNumber(maxRatio)}`
        : '')
      + '.';
    panel.appendChild(readout);

    if (focusId) {
      const target = doc.getElementById(focusId);
      if (target && typeof target.focus === 'function') target.focus();
    }
  }

  rebuild(null);
});
