import { register } from './registry.js';
import { currentCountry } from '../../../domain/store.js';

/* Lentille E052 — passe V2, vue GEOGRAPHIE.
 * Thème : filtrer les lieux par époque (ères, intervalles semi-ouverts,
 * fenêtres d'attestation).
 *
 * Les dix chantiers E052-01 … E052-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E052.md. Tout est
 * local : zéro réseau, zéro journalisation, zéro générateur aléatoire, aucun
 * fichier partagé ni module de la passe 1 modifié. Le contenu pédagogique est du
 * texte sémantique réel (h2, h3, p, dl, table, fieldset, label, ol) inséré dans
 * le DOM : il reste lisible et indexable même sans animation ni interaction.
 * Le canvas n'est qu'un laboratoire qui illustre des données déterministes.
 *
 * Toutes les ères, années, lieux et comptages proviennent de currentCountry()
 * (src/domain/store.js), lui-même issu de DATASET. Aucune date, aucun nom de
 * lieu et aucune appartenance à une ère n'est inventée.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e052- (identifiants, classes, attributs, bloc CSS).
 */

const P = 'geography-v2-e052';

/* Identifiants, tous préfixés geography-v2-e052-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const GLOSSARY_ID = P + '-glossary';
const TABLE_ID = P + '-table';
const ERA_ID = P + '-era';
const ERA_RADIO_PREFIX = P + '-era-';
const YEAR_ID = P + '-year';
const YEAR_NUM_ID = P + '-year-number';
const YEAR_OUT_ID = P + '-year-value';
const FOLLOW_ID = P + '-follow';
const PLAY_ID = P + '-play';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const DEFI_ID = P + '-defi';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const ERA_RADIO_NAME = P + '-era';
const SWEEP_MS = 16000; /* tour complet du domaine en ~16 s, sans aléa. */

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  index: null,
  countryKey: '',
  eraIndex: 0,
  focusYear: 0,
  followEra: true,
  playing: false,
  reduced: false,
  offscreen: false,
  rafId: 0,
  lastTs: 0,
  visibilityBound: false,
  motionBound: false,
  observedCanvas: null,
  intersection: null,
  resize: null,
  nodes: {},
};

/* Alias de ctx.el, initialisé au point d'entrée (les helpers l'utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- Formules et index dérivé du jeu de données (rien n'est fabriqué) ---------- */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
    return {
      id: era.id, name: era.name || `Ère ${index + 1}`,
      start: Math.trunc(era.start), end: Math.trunc(era.end),
      events: inEvents, places: inPlaces, index, isLast,
    };
  });

  const counts = eraInfo.map((e) => e.places);
  const totalPlaces = placeInfo.length;
  const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;
  const totalDated = events.filter((e) => Number.isFinite(e.year)).length;
  const sumEraEvents = eraInfo.reduce((a, e) => a + e.events, 0);

  return {
    eras: eraInfo,
    places: placeInfo,
    domain: [lo, hi],
    total: totalPlaces,
    avg,
    maxCount,
    totalDated,
    sumEraEvents,
    /* Contrôle falsifiable : le découpage doit compter chaque repère daté
     * exactement une fois (aucun trou, aucun double comptage). */
    coherent: sumEraEvents === totalDated,
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

function signe(value, digits) {
  return `${value >= 0 ? '+' : '−'}${fr(Math.abs(value), digits)}`;
}

function currentEraEntry() {
  if (!S.index || !S.index.eras.length) return null;
  const total = S.index.eras.length;
  const i = ((S.eraIndex % total) + total) % total;
  S.eraIndex = i;
  return S.index.eras[i];
}

function attestedAt(place, year) {
  return place.first !== null && place.last !== null && year >= place.first && year <= place.last;
}

function presenceCount(year) {
  if (!S.index) return 0;
  return S.index.places.filter((p) => attestedAt(p, year)).length;
}

function setFocusYear(value) {
  const domain = S.index ? S.index.domain : [0, 1];
  S.focusYear = clamp(Math.round(value), domain[0], domain[1]);
  syncControls();
}

/* ---------- E052-01 : feuille de style unique, préfixée, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${GLOSSARY_ID}{margin:6px 0;max-width:70ch}
#${GLOSSARY_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:5px}
#${GLOSSARY_ID} dd{margin:1px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} tfoot td,#${TABLE_ID} tfoot th{color:var(--ink-soft,#d7d1c6);font-weight:600}
#${ERA_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${ERA_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${YEAR_ID}{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${YEAR_ID}::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${YEAR_ID}::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${YEAR_ID}::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${YEAR_ID}::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
#${YEAR_NUM_ID}{
  width:92px;min-height:36px;margin-left:8px;padding:4px 6px;border:1px solid var(--line);
  border-radius:6px;background:rgba(0,0,0,.25);color:var(--ink);font:inherit;
  font-variant-numeric:tabular-nums;
}
#${PANEL_ID} .${P}-annee label{display:block;margin-bottom:2px}
#${YEAR_OUT_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:270px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:52px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEFI_ID} ol{margin:5px 0;padding-left:20px}
#${DEFI_ID} li{margin:3px 0;max-width:70ch}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:230px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
  #${YEAR_NUM_ID}{width:80px}
}
`;

/* ---------- E052-01 : section sémantique et lexique (lisibles sans JS) ---------- */

function staticGlossary() {
  const wrap = E('div', P + '-groupe');
  wrap.appendChild(E('h3', '', 'Lexique — définitions à la première occurrence'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Ère', 'Convention de découpage du temps : ses bornes sont des années du jeu de données, pas des vérités de nature.'],
    ['Intervalle semi-ouvert', 'Intervalle [début ; fin[ qui inclut le début et exclut la fin ; seule la dernière ère inclut sa borne finale.'],
    ['Attestation', 'Repère daté relié à un lieu par son identifiant : on compte les repères d’un lieu, pas seulement son nom.'],
    ['Fenêtre de visibilité', 'Entre la première et la dernière attestation connue d’un lieu, on le considère « présent » ; ce n’est pas une preuve d’occupation continue.'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', definition));
  });
  wrap.appendChild(dl);
  return wrap;
}

function staticFacts() {
  const wrap = E('div', P + '-groupe');
  wrap.appendChild(E('h3', '', 'Trois faits pour lire le filtre'));
  const faits = [
    'Une ère est une convention : ses bornes proviennent du jeu de données. Le filtre range chaque repère dans l’ère dont l’intervalle contient son année, sans inventer de date.',
    'Un intervalle [début ; fin[ inclut le début et exclut la fin : un repère tombant exactement sur une limite appartient à l’ère suivante. Seule la dernière ère inclut sa borne finale, afin que chaque repère soit compté une fois.',
    'Un même lieu peut être attesté dans plusieurs ères : on compte ses repères, pas son nom. À une année donnée, la fenêtre entre première et dernière attestation est un outil de visibilité, pas une affirmation d’occupation continue.',
  ];
  faits.forEach((texte) => wrap.appendChild(E('p', P + '-fait', texte)));
  return wrap;
}

/* ---------- E052-02 : tableau des ères recalculé depuis le jeu de données ---------- */

function staticTable(index) {
  const table = E('table');
  table.id = TABLE_ID;
  table.appendChild(E('caption', '',
    index
      ? `Ères de ${index.countryName} : intervalle semi-ouvert, repères et lieux distincts attestés. Référence : ${index.total} lieux localisés au total ; ${index.totalDated} repères datés.`
      : 'Ères indisponibles : aucun pays sélectionné.'));

  const thead = E('thead');
  const hr = E('tr');
  ['Ère', 'Intervalle', 'Repères', 'Lieux', 'Part du total'].forEach((h) => {
    const th = E('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = E('tbody');
  if (index && index.eras.length) {
    index.eras.forEach((era) => {
      const tr = E('tr');
      const part = index.total ? `${fr((era.places / index.total) * 100, 1)} %` : '—';
      const cells = [era.name, intervalLabel(era), String(era.events), String(era.places), part];
      cells.forEach((value, i) => {
        const cell = E(i === 0 ? 'th' : 'td', '', value);
        if (i === 0) cell.scope = 'row';
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
  } else {
    const tr = E('tr');
    const td = E('td', '', 'Aucune donnée temporelle disponible.');
    td.colSpan = 5;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  /* Ligne de référence : contrôle de partition et total des lieux. */
  const tfoot = E('tfoot');
  const frRow = E('tr');
  const frHead = E('th', '', index && index.coherent ? 'Total — partition cohérente' : 'Total — partition à vérifier');
  frHead.scope = 'row';
  const frCells = [
    index ? `${index.sumEraEvents} repères comptés / ${index.totalDated} repères datés` : '—',
    index ? `${index.total} lieux localisés` : '—',
    index ? `${fr(index.avg, 1)} lieux par ère (moyenne)` : '—',
  ];
  frRow.appendChild(frHead);
  frCells.forEach((value) => frRow.appendChild(E('td', '', value)));
  tfoot.appendChild(frRow);
  table.appendChild(tfoot);
  return table;
}

/* ---------- E052-06 : défi falsifiable en cinq temps ---------- */

function staticDefi() {
  const wrap = E('section', P + '-groupe');
  wrap.id = DEFI_ID;
  wrap.appendChild(E('h3', '', 'Défi falsifiable — le découpage compte-t-il chaque repère une fois ?'));
  const ol = E('ol');
  const etapes = [
    'Prédiction : une ère courte, comme la Révolution & Empire (1789–1815), doit-elle forcément attestater moins de lieux qu’une ère longue ?',
    'Réglage : parcourir les ères avec les boutons radio, puis déplacer l’année de focus avec le curseur ou les flèches du clavier.',
    'Résultat attendu : la somme des repères par ère égale le total des repères datés ; l’ère la plus riche porte la barre la plus haute de la frise.',
    'Falsification : si cette somme diffère du total daté, le découpage par intervalles semi-ouverts est défectueux (trou ou double comptage) ; si un lieu dit « présent » n’a aucune attestation dans sa fenêtre, le comptage est faux.',
    'Débrief : le tableau statique, le readout et la frise doivent donner les mêmes nombres, tous issus du même index déterministe.',
  ];
  etapes.forEach((t) => ol.appendChild(E('li', '', t)));
  wrap.appendChild(ol);
  return wrap;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      eras: Array.from(existant.querySelectorAll('.' + P + '-era-radio')),
      year: document.getElementById(YEAR_ID),
      yearNum: document.getElementById(YEAR_NUM_ID),
      yearOut: document.getElementById(YEAR_OUT_ID),
      follow: document.getElementById(FOLLOW_ID),
      play: document.getElementById(PLAY_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = E('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Filtrer les lieux par époque');
  title.id = TITLE_ID;
  const lead = E('p', '',
    'La vue Géographie montre des lieux localisés, mais elle ne dit pas à quelle époque chacun est attesté. '
    + 'Ce laboratoire range les repères dans des intervalles de temps, puis laisse choisir une ère ou une année : '
    + 'la carte des lieux présents change, sans qu’aucune date ni aucun lieu ne soit inventé.');

  /* E052-03 : radiogroupe natif, rôle explicite, aucun aria-pressed ici. */
  const fieldset = E('fieldset');
  fieldset.id = ERA_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Ère à afficher (choix unique)');
  fieldset.appendChild(E('legend', '', 'Ère à afficher (choix unique)'));
  const eras = (S.index && S.index.eras.length) ? S.index.eras : [];
  if (!eras.length) fieldset.appendChild(E('p', '', 'Aucune ère disponible pour ce pays.'));
  eras.forEach((era) => {
    const lab = E('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = ERA_RADIO_NAME;
    radio.className = P + '-era-radio';
    radio.id = ERA_RADIO_PREFIX + era.index;
    radio.value = String(era.index);
    radio.checked = era.index === S.eraIndex;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(`${era.name} · ${intervalLabel(era)}`));
    fieldset.appendChild(lab);
  });

  /* E052-04 : curseur d'année et saisie numérique, issus du domaine réel. */
  const sub = E('h3', '', 'Observer les lieux présents');
  const domain = S.index ? S.index.domain : [0, 1];
  const anneeRow = E('p', P + '-annee');
  const anneeLabel = document.createElement('label');
  anneeLabel.setAttribute('for', YEAR_ID);
  anneeLabel.appendChild(document.createTextNode('Année de focus : '));
  const yearOut = document.createElement('span');
  yearOut.id = YEAR_OUT_ID;
  anneeLabel.appendChild(yearOut);
  anneeRow.appendChild(anneeLabel);

  const year = document.createElement('input');
  year.type = 'range';
  year.id = YEAR_ID;
  year.min = String(domain[0]);
  year.max = String(domain[1]);
  year.step = '1';
  year.value = String(S.focusYear);
  year.setAttribute('aria-label', `Année de focus, de ${anneeLabelText(domain[0])} à ${anneeLabelText(domain[1])}`);

  const yearNum = document.createElement('input');
  yearNum.type = 'number';
  yearNum.id = YEAR_NUM_ID;
  yearNum.min = String(domain[0]);
  yearNum.max = String(domain[1]);
  yearNum.step = '1';
  yearNum.value = String(S.focusYear);
  yearNum.setAttribute('aria-label', 'Année de focus, saisie numérique');

  /* E052-05 / E052-06 : canvas surcouche, doublé en texte. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Frise des ères : chaque bande porte le nom de l’ère et le nombre de lieux attestés ; une barre donne le compte, '
    + 'le trait en pointillés marque l’année de focus. Clavier : flèches gauche et droite pour déplacer l’année d’un an, '
    + 'Page précédente et Page suivante de dix ans, Début et Fin pour les bornes. Choisir une ère se fait avec les boutons radio ci-dessus.');

  const legendText = E('p', P + '-legend');
  legendText.id = LEGEND_ID;

  /* E052-07 : unique région live, chiffrée et comparée à des références. */
  const readout = E('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E052-05 et E052-08 : deux bascules indépendantes, aria-pressed licite. */
  const follow = E('button', '', 'Lier l’année à l’ère : activé');
  follow.type = 'button';
  follow.id = FOLLOW_ID;
  follow.setAttribute('aria-pressed', S.followEra ? 'true' : 'false');
  follow.setAttribute('aria-label', 'Bascule indépendante : choisir une ère place l’année de focus au milieu de son intervalle');

  const play = E('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Balayer les années');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(
    title, lead, staticGlossary(), staticFacts(), staticTable(S.index), fieldset,
    sub, anneeRow, year, yearNum, canvas, legendText, readout, follow, play, staticDefi(),
  );

  const host = ctx.layout || ctx.stage;
  const cible = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  cible.insertBefore(panel, cible.firstChild);

  return {
    panel, fresh: true,
    eras: Array.from(panel.querySelectorAll('.' + P + '-era-radio')),
    year, yearNum, yearOut, follow, play, canvas, readout, legend: legendText,
  };
}

/* anneeLabel() sert au texte courant ; cet alias évite de confondre le nom de
 * la balise <label> avec la fonction dans ensurePanel. */
function anneeLabelText(year) {
  return anneeLabel(year);
}

/* ---------- E052-06 : dessin déterministe, un seul canvas, une seule frame ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 270;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
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

  /* E052-09 : hachures obliques (ères paires), pointillés (ères impaires),
   * nom et compte écrits : aucune information ne repose sur la seule couleur. */
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
      /* Un seul tracé de hachures par ère. */
      g.beginPath();
      for (let x = x0 - plotH; x < x1 + plotH; x += 12) {
        g.moveTo(x, plotY1);
        g.lineTo(x + plotH, plotY0);
      }
      g.strokeStyle = selected ? 'rgba(244,214,158,.40)' : 'rgba(215,209,198,.12)';
      g.stroke();
    } else {
      /* Un seul remplissage de pointillés par ère. */
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
      /* Cadre doré ET triangle : double repère non chromatique. */
      g.strokeStyle = 'rgba(244,214,158,.95)';
      g.lineWidth = 2;
      g.strokeRect(x0 + 1, plotY0 + 1, Math.max(1, width - 2), plotH - 2);
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
    g.fillText(anneeLabel(era.start), x + 2, plotY1 + 14);
  });

  /* E052-04 : trait pointillé + triangle + étiquette pour l'année de focus. */
  const year = clamp(S.focusYear, domain[0], domain[1]);
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

  const presents = presenceCount(year);
  g.textAlign = fx > plotX0 + plotW * 0.72 ? 'right' : 'left';
  const labelX = fx > plotX0 + plotW * 0.72 ? fx - 7 : fx + 7;
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.fillText(`Année : ${anneeLabel(year)}`, labelX, plotY0 - 11);
  g.fillText(`${presents} lieux présents`, labelX, plotY1 - 6);
  g.textAlign = 'left';
  g.fillStyle = index.coherent ? 'rgba(244,214,158,.95)' : 'rgba(255,160,140,.95)';
  g.fillText(index.coherent ? 'Partition vérifiée' : 'Partition à vérifier', plotX0, cssH - 6);
}

/* ---------- E052-07 : readout chiffré, comparé à des références explicites ---------- */

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
  const presents = presenceCount(year);
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
  l2.appendChild(fort(`${signe(era.places - index.avg, 1)}`));
  l2.appendChild(document.createTextNode('.'));
  node.appendChild(l2);

  const l3 = document.createElement('span');
  l3.style.display = 'block';
  l3.appendChild(document.createTextNode(`Année de focus : ${anneeLabel(year)}. Lieux dont la fenêtre contient cette année : `));
  l3.appendChild(fort(`${presents} sur ${index.total}`));
  l3.appendChild(document.createTextNode(' (fenêtre entre première et dernière attestation connue).'));
  node.appendChild(l3);

  node.appendChild(ligne(index.coherent
    ? `Contrôle de partition : ${index.sumEraEvents} repères comptés = ${index.totalDated} repères datés — cohérent.`
    : `Contrôle de partition : ${index.sumEraEvents} repères comptés ≠ ${index.totalDated} repères datés — découpage à vérifier.`));
}

/* ---------- Synchronisation des contrôles et du laboratoire ---------- */

function syncControls() {
  const n = S.nodes;
  if (!n || !n.panel) return;
  const index = S.index;
  const domain = index ? index.domain : [0, 1];
  S.focusYear = clamp(Math.round(S.focusYear), domain[0], domain[1]);

  (n.eras || []).forEach((radio) => {
    if (!radio) return;
    const value = Number(radio.value);
    radio.checked = value === currentEraIndex();
  });
  if (n.year) {
    n.year.min = String(domain[0]);
    n.year.max = String(domain[1]);
    if (document.activeElement !== n.year) n.year.value = String(S.focusYear);
    n.year.setAttribute('aria-valuetext', anneeLabel(S.focusYear));
  }
  if (n.yearNum) {
    n.yearNum.min = String(domain[0]);
    n.yearNum.max = String(domain[1]);
    if (document.activeElement !== n.yearNum) n.yearNum.value = String(S.focusYear);
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
      ? 'Bandes hachées en oblique (ères paires) ou en pointillés (ères impaires), avec leur nom : une ère chacune ; '
        + 'barre : nombre de lieux attestés ; cadre doré et triangle : ère choisie ; trait pointillé blanc et triangle : année de focus. '
        + 'Aucune information ne repose sur la seule couleur. La part du total et la moyenne par ère servent de références.'
      : 'Aucune légende disponible.';
  }
  if (n.canvas) {
    const era = currentEraEntry();
    n.canvas.setAttribute('aria-label',
      `Frise des ères de ${index ? index.countryName : 'ce pays'}. `
      + (era ? `Ère choisie : ${era.name}, ${era.places} lieux attestés, ${intervalLabel(era)}. ` : '')
      + `Année de focus : ${anneeLabel(S.focusYear)}, ${presenceCount(S.focusYear)} lieux présents. `
      + (index ? `Partition ${index.coherent ? 'cohérente' : 'à vérifier'}. ` : '')
      + 'Clavier : flèches gauche et droite pour déplacer l’année d’un an, Page précédente et Page suivante de dix ans, Début et Fin pour les bornes. Choisir une ère se fait avec les boutons radio ci-dessus.');
  }
  n.panel.setAttribute(REDUCED_ATTR, S.reduced ? '1' : '0');
  updateReadout();
  drawLab();
}

function currentEraIndex() {
  if (!S.index || !S.index.eras.length) return -1;
  const total = S.index.eras.length;
  return ((S.eraIndex % total) + total) % total;
}

/* ---------- E052-08 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || S.offscreen || !S.playing || !S.index) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || S.offscreen || !S.playing || !S.index) return;
  const domain = S.index.domain;
  const span = Math.max(1, domain[1] - domain[0]);
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    const before = Math.round(S.focusYear);
    /* Vitesse déterministe : un tour du domaine en ~16 s, sans aléa. */
    S.focusYear += dt * (span / SWEEP_MS);
    if (S.focusYear > domain[1]) S.focusYear = domain[0];
    if (Math.round(S.focusYear) !== before) syncControls();
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

/* ---------- E052-10 : mouvement réduit, garde-fous d'écouteurs et observateurs ---------- */

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : !!mq.matches;
        if (S.reduced) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function installObservers() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected) return;
  if (typeof IntersectionObserver === 'function') {
    if (!S.intersection) {
      S.intersection = new IntersectionObserver((entrees) => {
        const e = entrees[entrees.length - 1];
        S.offscreen = !e.isIntersecting;
        if (S.offscreen) stopLoop(); else startLoop();
      }, { rootMargin: '40px' });
    }
    if (S.observedCanvas !== cv) {
      if (S.observedCanvas) S.intersection.unobserve(S.observedCanvas);
      S.observedCanvas = cv;
      S.intersection.observe(cv);
    }
  }
  if (typeof ResizeObserver === 'function' && !S.resize) S.resize = new ResizeObserver(() => drawLab());
  if (S.resize && S.observedCanvas !== null) S.resize.observe(S.observedCanvas);
}

/* E052-09 : badge textuel sur la carte existante, garde anti-doublon par id. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('.geo-map') : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = E('div', P + '-badge',
    'Les ères et les comptes sont dérivés des années du jeu de données (intervalles semi-ouverts). La frise est schématique et non à l’échelle.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E052', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  E = typeof ctx.el === 'function' ? ctx.el : E;
  ctx.css(P, CSS);

  refreshIndexFromStore();
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  installObservers();

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) { S.playing = false; stopLoop(); }
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    (n.eras || []).forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        const value = Number(radio.value);
        S.eraIndex = Number.isFinite(value) ? value : 0;
        if (S.followEra && S.index) {
          const era = currentEraEntry();
          if (era) S.focusYear = Math.round((era.start + era.end) / 2);
        }
        syncControls();
      });
    });
    if (n.year) n.year.addEventListener('input', () => setFocusYear(Number(n.year.value)));
    if (n.yearNum) n.yearNum.addEventListener('change', () => {
      const value = Number(n.yearNum.value);
      if (Number.isFinite(value)) setFocusYear(value);
      else syncControls();
    });
    n.follow.addEventListener('click', () => {
      S.followEra = !S.followEra;
      if (S.followEra && S.index) {
        const era = currentEraEntry();
        if (era) S.focusYear = Math.round((era.start + era.end) / 2);
      }
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
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
    });
  }

  installGlobalListeners(ctx);
  startLoop();
});
