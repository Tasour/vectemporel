import { register } from './registry.js';
import { currentCountry } from '../../domain/store.js';

/* Lentille E052 — vue GEOGRAPHIE.
 * Thème : filtre des lieux par époque.
 *
 * Les dix chantiers E052-01 … E052-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E052.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le panneau est du texte sémantique réel (titres, paragraphes,
 * tableau, fieldset) présent dans le DOM même sans animation ni interaction ;
 * le canvas n'est qu'un laboratoire qui illustre des données déterministes.
 *
 * Les lieux, ères, repères et années proviennent uniquement de
 * `currentCountry()` (src/domain/store.js), lui-même issu de DATASET. Aucune
 * date, aucun nom de lieu ni aucune appartenance à une ère n'est inventée.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e052';
const PANEL_ID = 'geography-e052-panel';
const TITLE_ID = 'geography-e052-title';
const TABLE_ID = 'geography-e052-table';
const ERA_ID = 'geography-e052-era';
const YEAR_ID = 'geography-e052-year';
const YEAR_OUT_ID = 'geography-e052-year-value';
const FOLLOW_ID = 'geography-e052-follow';
const PLAY_ID = 'geography-e052-play';
const CANVAS_ID = 'geography-e052-canvas';
const READOUT_ID = 'geography-e052-readout';
const LEGEND_ID = 'geography-e052-legend';
const BADGE_ID = 'geography-e052-badge';

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  index: null,
  countryKey: '',
  eraIndex: 0,
  focusYear: 0,
  followEra: true,
  playing: false,
  reduced: false,
  visible: true,
  rafId: 0,
  lastTs: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ---------- Index dérivé du jeu de données (aucune valeur fabriquée) ---------- */

/* Un repère appartient à une ère par son année : intervalle semi-ouvert
 * [début ; fin[ ; seule la dernière ère inclut sa borne finale. */
function eraContains(era, isLast, year) {
  return year >= era.start && (year < era.end || (isLast && year <= era.end));
}

function buildIndex(country) {
  const events = Array.isArray(country.events) ? country.events : [];
  const byId = new Map();
  events.forEach((event) => {
    if (event && typeof event.id === 'string') byId.set(event.id, event);
  });

  const eras = (Array.isArray(country.eras) ? country.eras : [])
    .filter((era) => era && Number.isFinite(era.start) && Number.isFinite(era.end) && era.end > era.start)
    .slice()
    .sort((a, b) => a.start - b.start);

  /* Seuls les lieux localisés sont comptés (même règle que currentPlaces()). */
  const places = (Array.isArray(country.places) ? country.places : [])
    .filter((place) => place && typeof place.id === 'string'
      && Number.isFinite(place.lat) && Number.isFinite(place.lon));

  /* Attestations d'un lieu = années de ses repères, dédupliquées et triées. */
  const placeInfo = places.map((place) => {
    const years = [];
    const ids = Array.isArray(place.eventIds) ? place.eventIds : [];
    ids.forEach((id) => {
      const event = byId.get(id);
      if (event && Number.isFinite(event.year)) years.push(Math.trunc(event.year));
    });
    const unique = Array.from(new Set(years)).sort((a, b) => a - b);
    return {
      id: place.id,
      label: place.label || place.id,
      years: unique,
      first: unique.length ? unique[0] : null,
      last: unique.length ? unique[unique.length - 1] : null,
    };
  });

  /* Emprise temporelle : domaine déclaré, repli sur les années réelles. */
  let lo = country.domain && Number.isFinite(country.domain[0]) ? country.domain[0] : null;
  let hi = country.domain && Number.isFinite(country.domain[1]) ? country.domain[1] : null;
  if (lo === null || hi === null || hi <= lo) {
    const years = events.filter((e) => Number.isFinite(e.year)).map((e) => e.year);
    if (years.length) { lo = Math.min(...years); hi = Math.max(...years); }
  }
  if (lo === null || hi === null || hi <= lo) { lo = 0; hi = 1; }
  lo = Math.trunc(lo);
  hi = Math.trunc(hi);

  const last = eras.length - 1;
  const eraInfo = eras.map((era, index) => {
    const isLast = index === last;
    const inEvents = events.filter((e) => Number.isFinite(e.year) && eraContains(era, isLast, Math.trunc(e.year))).length;
    const inPlaces = placeInfo.filter((p) => p.years.some((y) => eraContains(era, isLast, y))).length;
    return { id: era.id, name: era.name || `Ère ${index + 1}`, start: Math.trunc(era.start), end: Math.trunc(era.end), events: inEvents, places: inPlaces, index, isLast };
  });

  const counts = eraInfo.map((e) => e.places);
  const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;

  return {
    eras: eraInfo,
    places: placeInfo,
    domain: [lo, hi],
    total: placeInfo.length,
    avg,
    maxCount,
    countryName: country.name || '',
  };
}

function refreshIndexFromStore() {
  const country = currentCountry();
  const key = country ? String(country.id) : '';
  if (key === S.countryKey && S.index) return;
  S.countryKey = key;
  S.index = country ? buildIndex(country) : null;
  S.eraIndex = 0;
  const domain = S.index ? S.index.domain : [0, 1];
  S.focusYear = Math.round((domain[0] + domain[1]) / 2);
}

/* ---------- Formatage français (virgule décimale, ères avant J.-C.) ---------- */

function anneeLabel(year) {
  if (!Number.isFinite(year)) return '—';
  const y = Math.trunc(year);
  return y < 0 ? `${Math.abs(y)} av. J.-C.` : `${y} ap. J.-C.`;
}

function intervalLabel(era) {
  return era.isLast
    ? `[${anneeLabel(era.start)} ; ${anneeLabel(era.end)}]`
    : `[${anneeLabel(era.start)} ; ${anneeLabel(era.end)}[`;
}

function fr(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace('.', ',');
}

function currentEraEntry() {
  if (!S.index || !S.index.eras.length) return null;
  const i = ((S.eraIndex % S.index.eras.length) + S.index.eras.length) % S.index.eras.length;
  S.eraIndex = i;
  return S.index.eras[i];
}

function attestedAt(place, year) {
  return place.first !== null && place.last !== null && year >= place.first && year <= place.last;
}

/* ---------- Feuille de style unique ---------- */

const CSS = `
#geography-e052-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e052-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e052-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e052-panel p{margin:5px 0;max-width:68ch}
#geography-e052-panel .geography-e052-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e052-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e052-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e052-table th,#geography-e052-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e052-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e052-era{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e052-era legend{padding:0 4px;color:var(--muted)}
#geography-e052-panel .geography-e052-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e052-panel .geography-e052-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e052-year{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e052-panel .geography-e052-cursor label{display:block;margin-bottom:2px}
#geography-e052-panel .geography-e052-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e052-canvas{
  display:block;width:100%;height:270px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e052-legend{font-size:10px;color:var(--muted)}
#geography-e052-readout{
  min-height:52px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e052-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e052-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e052-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e052-panel button[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16)}
#geography-e052-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e052-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e052-panel[data-geography-e052-reduced="1"] button,
#geography-e052-panel[data-geography-e052-reduced="1"] .geography-e052-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e052-panel button,.geography-e052-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e052-panel{font-size:10px;padding:9px}
  #geography-e052-canvas{height:230px}
  #geography-e052-panel .geography-e052-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans JS ni animation ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une ère est une convention de découpage du temps : ses bornes sont des années du jeu de données, pas des vérités de nature. Le filtre proposé range chaque repère dans l’ère dont l’intervalle contient son année.',
    'Un intervalle noté [début ; fin[ inclut le début et exclut la fin : un repère tombant exactement sur une limite appartient donc à l’ère suivante. Seule la dernière ère inclut sa borne finale, afin que tous les repères soient comptés une fois.',
    'Un même lieu peut être attesté dans plusieurs ères : on compte ses repères, pas son nom. À une année donnée, on considère un lieu « présent » entre sa première et sa dernière attestation connue ; c’est une fenêtre de visibilité, pas une affirmation d’occupation continue.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e052-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable(index) {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = index
    ? `Ères de ${index.countryName}, intervalle semi-ouvert, avec le nombre de repères et de lieux distincts attestés. Référence : ${index.total} lieux localisés au total.`
    : 'Ères indisponibles : aucun pays sélectionné.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Ère', 'Intervalle', 'Repères', 'Lieux', 'Part du total'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  if (index && index.eras.length) {
    index.eras.forEach((era) => {
      const tr = document.createElement('tr');
      const part = index.total ? `${fr((era.places / index.total) * 100, 1)} %` : '—';
      const cells = [era.name, intervalLabel(era), String(era.events), String(era.places), part];
      cells.forEach((value, i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row';
        cell.textContent = value;
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'Aucune donnée temporelle disponible.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

/* ---------- Construction du panneau (réutilisé entre les rendus) ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function ensurePanel(ctx) {
  const existing = document.getElementById(PANEL_ID);
  if (existing && existing.isConnected && withinContext(existing, ctx)) {
    return {
      panel: existing,
      fresh: false,
      eras: Array.from(existing.querySelectorAll('.geography-e052-era-radio')),
      year: document.getElementById(YEAR_ID),
      yearOut: document.getElementById(YEAR_OUT_ID),
      follow: document.getElementById(FOLLOW_ID),
      play: document.getElementById(PLAY_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e052-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Filtrer les lieux par époque');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'La vue Géographie montre des lieux localisés, mais elle ne dit pas à quelle époque chacun est attesté. '
    + 'Ce laboratoire range les repères dans des intervalles de temps, puis laisse choisir une ère ou une année : '
    + 'la carte des lieux présents change, sans qu’aucune date ni aucun lieu ne soit inventé.');
  const sousTitre = ctx.el('h3', '', 'Trois faits pour lire le filtre');

  /* E052-01 : texte réel, indexable, présent même si le canvas est vide. */
  panel.append(title, lead, sousTitre, staticFacts());

  /* E052-02 : tableau calculé depuis le jeu de données. */
  panel.appendChild(staticTable(S.index));

  /* E052-03 : choix unique de l'ère (radiogroup natif, pas d'aria-pressed). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ERA_ID;
  const eraLegend = document.createElement('legend');
  eraLegend.textContent = 'Ère à afficher (choix unique)';
  fieldset.appendChild(eraLegend);
  const eras = (S.index && S.index.eras.length) ? S.index.eras : [];
  if (!eras.length) {
    fieldset.appendChild(ctx.el('p', '', 'Aucune ère disponible pour ce pays.'));
  }
  eras.forEach((era) => {
    const lab = ctx.el('label', 'geography-e052-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e052-era';
    radio.className = 'geography-e052-era-radio';
    radio.id = `geography-e052-era-${era.index}`;
    radio.value = String(era.index);
    radio.checked = era.index === S.eraIndex;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(`${era.name} · ${intervalLabel(era)}`));
    fieldset.appendChild(lab);
  });
  panel.appendChild(fieldset);

  /* E052-04 : curseur d'année, né du domaine réel du pays. */
  const domain = S.index ? S.index.domain : [0, 1];
  const cursor = document.createElement('div');
  cursor.className = 'geography-e052-cursor';
  const yearLabel = document.createElement('label');
  yearLabel.setAttribute('for', YEAR_ID);
  yearLabel.appendChild(document.createTextNode('Année de focus : '));
  const yearOut = document.createElement('span');
  yearOut.id = YEAR_OUT_ID;
  yearOut.className = 'geography-e052-val';
  yearLabel.appendChild(yearOut);
  cursor.appendChild(yearLabel);
  const year = document.createElement('input');
  year.type = 'range';
  year.id = YEAR_ID;
  year.min = String(domain[0]);
  year.max = String(domain[1]);
  year.step = '1';
  year.value = String(S.focusYear);
  year.setAttribute('aria-label', `Année de focus, de ${anneeLabel(domain[0])} à ${anneeLabel(domain[1])}`);
  cursor.appendChild(year);
  panel.appendChild(cursor);

  /* E052-06 : laboratoire canvas (surcouche, doublée en texte). */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Frise des ères : chaque bande porte le nom de l’ère et le nombre de lieux attestés ; une barre donne le compte, '
    + 'le trait en pointillés marque l’année de focus. Clavier : flèches gauche et droite pour déplacer l’année d’un an, '
    + 'Page précédente et Page suivante de dix ans, Début et Fin pour les bornes. Choisir une ère se fait avec les boutons radio ci-dessus.');

  const legend = ctx.el('p', 'geography-e052-legend', '');
  legend.id = LEGEND_ID;
  panel.appendChild(canvas);
  panel.appendChild(legend);

  /* E052-07 : unique région live, chiffrée et comparée à des références. */
  const readout = ctx.el('p', 'geography-e052-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  /* E052-05 et E052-08 : deux bascules indépendantes, aria-pressed licite. */
  const follow = ctx.el('button', '', 'Lier l’année à l’ère');
  follow.type = 'button';
  follow.id = FOLLOW_ID;
  const play = ctx.el('button', '', '▶ Balayer les années');
  play.type = 'button';
  play.id = PLAY_ID;
  panel.append(follow, play);

  const host = ctx.layout && ctx.layout.querySelector
    ? (ctx.layout.querySelector('.geo-panel') || ctx.stage) : ctx.stage;
  host.appendChild(panel);

  const radios = Array.from(panel.querySelectorAll('.geography-e052-era-radio'));
  return {
    panel, fresh: true, eras: radios,
    year, yearOut, follow, play, canvas, readout, legend,
  };
}

/* ---------- Rendu du laboratoire canvas ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 270;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const index = S.index;
  const padL = 16;
  const padR = 16;
  const padT = 30;
  const padB = 46;
  const plotX0 = padL;
  const plotX1 = cssW - padR;
  const plotY0 = padT;
  const plotY1 = cssH - padB;
  const plotW = Math.max(1, plotX1 - plotX0);
  const plotH = Math.max(1, plotY1 - plotY0);

  g.font = '9px ui-monospace, Menlo, Consolas, monospace';
  g.textBaseline = 'alphabetic';

  if (!index || !index.eras.length) {
    g.fillStyle = 'rgba(215,209,198,.8)';
    g.fillText('Aucune donnée temporelle disponible pour ce pays.', plotX0, plotY0 + 16);
    return;
  }

  const domain = index.domain;
  const span = domain[1] - domain[0] || 1;
  const xOf = (year) => plotX0 + ((year - domain[0]) / span) * plotW;
  const maxCount = Math.max(1, index.maxCount);
  const activeEra = currentEraEntry();

  /* E052-09 : bandes distinguées par hachures obliques / pointillés + libellés. */
  index.eras.forEach((era, i) => {
    const x0 = xOf(era.start);
    const x1 = xOf(era.end);
    const width = Math.max(1, x1 - x0);
    const selected = activeEra && era.index === activeEra.index;

    g.fillStyle = selected ? 'rgba(230,185,111,.14)' : (i % 2 === 0 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.012)');
    g.fillRect(x0, plotY0, width, plotH);

    g.save();
    g.beginPath();
    g.rect(x0, plotY0, width, plotH);
    g.clip();
    g.lineWidth = 1;
    if (i % 2 === 0) {
      /* Hachures obliques : un seul tracé par ère. */
      g.beginPath();
      for (let x = x0 - plotH; x < x1 + plotH; x += 12) {
        g.moveTo(x, plotY1);
        g.lineTo(x + plotH, plotY0);
      }
      g.strokeStyle = selected ? 'rgba(244,214,158,.40)' : 'rgba(215,209,198,.12)';
      g.stroke();
    } else {
      /* Pointillés : un seul remplissage par ère. */
      g.beginPath();
      for (let x = x0 + 3; x < x1; x += 12) {
        for (let y = plotY0 + 3; y < plotY1; y += 12) {
          g.rect(x, y, 1.3, 1.3);
        }
      }
      g.fillStyle = selected ? 'rgba(244,214,158,.42)' : 'rgba(215,209,198,.16)';
      g.fill();
    }
    g.restore();

    if (selected) {
      g.strokeStyle = 'rgba(244,214,158,.95)';
      g.lineWidth = 2;
      g.strokeRect(x0 + 1, plotY0 + 1, Math.max(1, width - 2), plotH - 2);
      /* Marqueur triangulaire sous l'ère choisie : repère non chromatique. */
      const mid = x0 + width / 2;
      g.fillStyle = 'rgba(244,214,158,.95)';
      g.beginPath();
      g.moveTo(mid - 5, plotY1 + 2);
      g.lineTo(mid + 5, plotY1 + 2);
      g.lineTo(mid, plotY1 + 9);
      g.closePath();
      g.fill();
    }

    /* Barre de comptage, hauteur proportionnelle au nombre de lieux. */
    const barH = (era.places / maxCount) * (plotH - 20);
    const barW = Math.min(Math.max(10, width * 0.5), 46);
    const barX = x0 + width / 2 - barW / 2;
    const barY = plotY1 - barH;
    g.fillStyle = selected ? 'rgba(244,214,158,.85)' : 'rgba(159,199,255,.55)';
    g.fillRect(barX, barY, barW, barH);
    g.strokeStyle = 'rgba(7,10,14,.8)';
    g.lineWidth = 1;
    g.strokeRect(barX, barY, barW, barH);

    g.fillStyle = selected ? 'rgba(244,214,158,.98)' : 'rgba(215,209,198,.9)';
    g.textAlign = 'center';
    const caption = era.name.length > 18 ? `${era.name.slice(0, 17)}…` : era.name;
    g.fillText(caption, x0 + width / 2, Math.max(plotY0 + 10, barY - 15));
    g.fillText(`${era.places} lieux`, x0 + width / 2, Math.max(plotY0 + 20, barY - 4));
    g.textAlign = 'left';
  });

  /* Axe des temps et bornes d'ère (années réelles). */
  g.strokeStyle = 'rgba(215,209,198,.55)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(plotX0, plotY1);
  g.lineTo(plotX1, plotY1);
  g.stroke();
  g.fillStyle = 'rgba(215,209,198,.85)';
  index.eras.forEach((era) => {
    const x = xOf(era.start);
    g.beginPath();
    g.moveTo(x, plotY1);
    g.lineTo(x, plotY1 + 4);
    g.stroke();
    g.textAlign = 'left';
    g.fillText(anneeLabel(era.start), x + 2, plotY1 + 14);
    g.textAlign = 'left';
  });

  /* E052-04 : curseur d'année, trait pointillé + triangle + étiquette. */
  const year = Math.max(domain[0], Math.min(domain[1], S.focusYear));
  const fx = xOf(year);
  g.setLineDash([4, 3]);
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(fx, plotY0 - 2);
  g.lineTo(fx, plotY1);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(fx - 5, plotY0 - 8);
  g.lineTo(fx + 5, plotY0 - 8);
  g.lineTo(fx, plotY0 - 1);
  g.closePath();
  g.fill();

  const presents = index.places.filter((p) => attestedAt(p, year));
  const topLabel = `Année : ${anneeLabel(year)}`;
  const bottomLabel = `${presents.length} lieux présents`;
  g.textAlign = fx > plotX0 + plotW * 0.72 ? 'right' : 'left';
  const labelX = fx > plotX0 + plotW * 0.72 ? fx - 7 : fx + 7;
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.fillText(topLabel, labelX, plotY0 - 11);
  g.fillText(bottomLabel, labelX, plotY1 - 6);
  g.textAlign = 'left';
}

/* ---------- Readout chiffré, comparé à des références explicites ---------- */

function updateReadout() {
  const node = S.nodes.readout;
  if (!node) return;
  const index = S.index;
  if (!index) {
    node.textContent = 'Aucune donnée temporelle disponible : sélectionnez un pays.';
    return;
  }
  const era = currentEraEntry();
  const year = S.focusYear;
  const presents = index.places.filter((p) => attestedAt(p, year));
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const ligne = (texte) => {
    const span = document.createElement('span');
    span.style.display = 'block';
    span.textContent = texte;
    return span;
  };

  node.textContent = '';
  if (!era) {
    node.appendChild(ligne('Aucune ère définie pour ce pays.'));
    return;
  }

  const l1 = document.createElement('span');
  l1.style.display = 'block';
  l1.appendChild(document.createTextNode(`Ère sélectionnée : ${era.name} · ${intervalLabel(era)} · ${era.events} repères. `));
  l1.appendChild(fort(`${era.places} lieux attestés`));
  l1.appendChild(document.createTextNode(` sur ${index.total} localisés, soit `));
  l1.appendChild(fort(`${fr(index.total ? (era.places / index.total) * 100 : 0, 1)} %`));
  l1.appendChild(document.createTextNode(' du total.'));
  node.appendChild(l1);

  const l2 = document.createElement('span');
  l2.style.display = 'block';
  l2.appendChild(document.createTextNode('Moyenne par ère (référence) : '));
  l2.appendChild(fort(`${fr(index.avg, 1)} lieux`));
  l2.appendChild(document.createTextNode(' ; écart de cette ère : '));
  const ecart = era.places - index.avg;
  l2.appendChild(fort(`${ecart >= 0 ? '+' : '−'}${fr(Math.abs(ecart), 1)}`));
  l2.appendChild(document.createTextNode('.'));
  node.appendChild(l2);

  const l3 = document.createElement('span');
  l3.style.display = 'block';
  l3.appendChild(document.createTextNode(`Année de focus : ${anneeLabel(year)}. Lieux dont la fenêtre d’attestation contient cette année : `));
  l3.appendChild(fort(`${presents.length} sur ${index.total}`));
  l3.appendChild(document.createTextNode(' (fenêtre entre première et dernière attestation connue).'));
  node.appendChild(l3);
}

function syncControls() {
  const n = S.nodes;
  if (!n || !n.panel) return;
  const index = S.index;
  const domain = index ? index.domain : [0, 1];
  S.focusYear = Math.max(domain[0], Math.min(domain[1], Math.round(S.focusYear)));

  (n.eras || []).forEach((radio) => {
    if (!radio) return;
    const value = Number(radio.value);
    radio.checked = value === ((S.eraIndex % Math.max(1, (index ? index.eras.length : 1))) + (index ? index.eras.length : 1)) % Math.max(1, index ? index.eras.length : 1);
  });
  if (n.year) {
    n.year.min = String(domain[0]);
    n.year.max = String(domain[1]);
    n.year.value = String(S.focusYear);
  }
  if (n.yearOut) n.yearOut.textContent = anneeLabel(S.focusYear);
  if (n.follow) {
    n.follow.textContent = S.followEra ? 'Lier l’année à l’ère : activé' : 'Lier l’année à l’ère : désactivé';
    n.follow.setAttribute('aria-pressed', S.followEra ? 'true' : 'false');
    n.follow.setAttribute('aria-label', 'Bascule indépendante : choisir une ère place l’année de focus au milieu de son intervalle');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Balayer les années';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.legend) {
    n.legend.textContent = index
      ? 'Bandes hachées en oblique ou en pointillés (avec leur nom) : une ère chacune ; barre : nombre de lieux attestés ; '
        + 'cadre doré et triangle : ère choisie ; trait pointillé blanc : année de focus. '
        + 'Aucune information ne repose sur la seule couleur. La part du total et la moyenne par ère servent de références.'
      : 'Aucune légende disponible.';
  }
  n.panel.dataset.geographyE052Reduced = S.reduced ? '1' : '0';
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible || S.reduced || !S.playing || !S.index) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible || S.reduced || !S.playing || !S.index) return;
  const domain = S.index.domain;
  const span = Math.max(1, domain[1] - domain[0]);
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    const before = Math.round(S.focusYear);
    /* Vitesse déterministe : environ 130 années par seconde, sans aléa. */
    S.focusYear += dt * (span / 16000);
    if (S.focusYear > domain[1]) S.focusYear = domain[0];
    if (Math.round(S.focusYear) !== before) syncControls();
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function setFocusYear(value) {
  const domain = S.index ? S.index.domain : [0, 1];
  S.focusYear = Math.max(domain[0], Math.min(domain[1], Math.round(value)));
  syncControls();
}

/* ---------- Écouteurs uniques ---------- */

function wirePanel(ctx) {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  (n.eras || []).forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const index = Number(radio.value);
      S.eraIndex = Number.isFinite(index) ? index : 0;
      if (S.followEra && S.index) {
        const era = currentEraEntry();
        if (era) setFocusYear(Math.round((era.start + era.end) / 2));
      }
      syncControls();
    });
  });

  if (n.year) n.year.addEventListener('input', () => setFocusYear(Number(n.year.value)));

  if (n.follow) n.follow.addEventListener('click', () => {
    S.followEra = !S.followEra;
    if (S.followEra && S.index) {
      const era = currentEraEntry();
      if (era) S.focusYear = Math.round((era.start + era.end) / 2);
    }
    syncControls();
  });

  if (n.play) n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing) stopLoop(); else startLoop();
    syncControls();
  });

  if (n.canvas) n.canvas.addEventListener('keydown', (event) => {
    const domain = S.index ? S.index.domain : [0, 1];
    let used = true;
    if (event.key === 'ArrowLeft') setFocusYear(S.focusYear - 1);
    else if (event.key === 'ArrowRight') setFocusYear(S.focusYear + 1);
    else if (event.key === 'PageDown') setFocusYear(S.focusYear - 10);
    else if (event.key === 'PageUp') setFocusYear(S.focusYear + 10);
    else if (event.key === 'Home') setFocusYear(domain[0]);
    else if (event.key === 'End') setFocusYear(domain[1]);
    else used = false;
    if (used) event.preventDefault();
    void ctx;
  });
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }

  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = !!mq.matches;
        if (S.reduced) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }

  if (!S.observer && typeof IntersectionObserver === 'function' && typeof document !== 'undefined') {
    const cv = S.nodes.canvas;
    if (cv) {
      S.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          S.visible = !!entry.isIntersecting;
          if (S.visible) { if (S.playing) startLoop(); }
          else stopLoop();
        }
      }, { threshold: 0.01 });
      S.observer.observe(cv);
    }
  }
}

/* E052-09 : badge textuel sur la carte existante, garde anti-doublon par id. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e052-badge',
    'Les ères et les comptes sont dérivés des années du jeu de données (intervalles semi-ouverts). La frise est schématique et non à l’échelle.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E052', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }

  refreshIndexFromStore();
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  syncControls();

  if (S.nodes.fresh) wirePanel(ctx);

  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
