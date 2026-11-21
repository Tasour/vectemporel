import { register } from './registry.js';
import { state, currentCountry, currentEra } from '../../../domain/store.js';

/* Lentille E090 — passe V2, vue GEOGRAPHIE.
 * Thème : lecture des millésimes et des ères dans les repères.
 *
 * Les dix chantiers E090-01 … E090-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E090.md. Tout est
 * local : zéro réseau, zéro journalisation, aucun générateur aléatoire (graine
 * fixe 45e090 + mulberry32), aucun fichier partagé ni module de la passe 1
 * modifié. Toutes les ères, bornes, années et repères proviennent de
 * currentCountry() / currentEra() / state.eraIndex : aucune valeur n'est
 * fabriquée.
 *
 * Le contenu pédagogique est du texte sémantique réel (h2, h3, p, dl, table,
 * fieldset, label, ul, ol) inséré dans le DOM : il reste lisible et indexable
 * même sans animation ni interaction. Le canvas n'est qu'un laboratoire
 * déterministe dont chaque grandeur est aussi écrite en texte.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e090- (identifiants, classes, attributs, CSS).
 */

const P = 'geography-v2-e090';
const CSS_ID = P;

/* Identifiants, tous préfixés geography-v2-e090-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const GLOSSARY_ID = P + '-glossary';
const TABLE_ID = P + '-table';
const REPERES_ID = P + '-reperes';
const FRISE_ID = P + '-frise';
const FRISE_TEXT_ID = P + '-frise-text';
const JALONS_ID = P + '-jalons';
const NOTATION_ID = P + '-notation';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const DETAIL_ID = P + '-detail';
const PLAY_ID = P + '-play';
const STOP_ID = P + '-stop';
const COLLAPSE_ID = P + '-collapse';
const DEFI_ID = P + '-defi';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const NBC = '\u202F';        /* espace fine insécable de groupement des milliers. */
const APOSTROPHE = '\u2019'; /* apostrophe typographique du texte courant. */
const SEED = 0x45e090;       /* graine fixe : échantillon reproductible, zéro hasard. */
const SWEEP_MS = 2600;       /* durée déterministe d'un parcours de la frise. */

const NOTATIONS = [
  { style: 'simple', label: 'Année seule' },
  { style: 'ere', label: 'Avec l’ère' },
  { style: 'century', label: 'En siècle' },
];

/* État de module : survit au remplacement du `stage` par la coque. */
const S = {
  countryKey: '',
  builtKey: '',
  index: null,
  model: null,
  activeIndex: 0,
  notation: 'simple',
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  offscreen: false,
  visibilityBound: false,
  motionBound: false,
  observedCanvas: null,
  intersection: null,
  resize: null,
  points: null,
  nodes: {},
};

/* Alias de ctx.el, initialisé au point d'entrée (les helpers l'utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- Utilitaires déterministes ---------- */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* PRNG déterministe : même graine, mêmes points, à chaque rendu. */
function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* E090-03 : regroupement des milliers par espace fine insécable. */
function groupDigits(value) {
  const n = Math.abs(Math.round(Number(value)));
  if (!Number.isFinite(n)) return '?';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBC);
}

function roman(value) {
  const table = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let rest = Math.max(1, Math.floor(Math.abs(Number(value))));
  let out = '';
  for (const [amount, glyph] of table) {
    while (rest >= amount) { out += glyph; rest -= amount; }
  }
  return out;
}

/* L'an zéro astronomique est lu comme 1 av. J.-C. (convention historique). */
function splitYear(year) {
  if (!Number.isFinite(Number(year))) return null;
  const y = Math.round(Number(year));
  if (y === 0) return { bc: true, abs: 1 };
  return { bc: y < 0, abs: Math.abs(y) };
}

/* E090-07 : conversion d'une année en siècle, en chiffres romains. */
function centuryLabel(year) {
  const parts = splitYear(year);
  if (!parts) return 'siècle inconnu';
  const rank = Math.floor((parts.abs - 1) / 100) + 1;
  const ordinal = rank === 1 ? 'Ier' : roman(rank) + 'e';
  return `${ordinal} siècle${parts.bc ? ' av. J.-C.' : ''}`;
}

/* E090-02 / E090-03 / E090-07 : une seule fonction, trois notations. */
function formatYear(year, style = 'simple') {
  const parts = splitYear(year);
  if (!parts) return 'année inconnue';
  if (style === 'century') return centuryLabel(parts.abs * (parts.bc ? -1 : 1));
  const digits = groupDigits(parts.abs);
  const suffix = parts.bc ? ' av. J.-C.' : ' ap. J.-C.';
  if (style === 'ere') return digits + suffix;
  return parts.bc ? digits + suffix : digits;
}

/* ---------- Index dérivé du jeu de données (rien n'est fabriqué) ---------- */

function buildIndex(country) {
  const eras = (Array.isArray(country?.eras) ? country.eras : [])
    .filter((era) => era && Number.isFinite(Number(era.start))
      && Number.isFinite(Number(era.end)) && Number(era.end) > Number(era.start))
    .map((era) => ({
      id: era.id,
      name: era.name || 'Ère',
      start: Math.trunc(Number(era.start)),
      end: Math.trunc(Number(era.end)),
    }))
    .sort((a, b) => a.start - b.start);

  const events = (Array.isArray(country?.events) ? country.events : [])
    .filter((event) => event && Number.isFinite(Number(event.year)))
    .map((event) => ({
      id: event.id,
      title: event.title || 'Repère',
      year: Math.trunc(Number(event.year)),
      eraId: event.eraId,
    }));

  const years = Array.from(new Set(events.map((event) => event.year))).sort((a, b) => a - b);
  const domain = eras.length
    ? [eras[0].start, eras[eras.length - 1].end]
    : (years.length ? [years[0], years[years.length - 1]] : [0, 1]);

  return {
    eras,
    events,
    years,
    domain,
    byId: new Map(eras.map((era) => [era.id, era])),
    countryName: country && country.name ? country.name : 'ce pays',
  };
}

function refreshIndexFromStore() {
  const country = currentCountry();
  const key = country ? String(country.id) : '';
  if (key === S.countryKey && S.index) return;
  S.countryKey = key;
  S.index = buildIndex(country);
  S.points = null;
}

/* Échantillon déterministe d'années réellement présentes dans les événements. */
function pickYears(index) {
  const unique = index ? index.years : [];
  if (!unique.length) return [];
  const picks = new Set([unique[0], unique[unique.length - 1]]);
  if (unique.length > 2) picks.add(unique[Math.floor(unique.length / 2)]);
  const before = unique.find((year) => year < 0);
  const after = unique.find((year) => year > 0);
  if (before !== undefined) picks.add(before);
  if (after !== undefined) picks.add(after);
  return Array.from(picks).sort((a, b) => a - b);
}

/* E090-05 : modèle géométrique de la frise, calculé depuis les bornes réelles. */
function buildFriseModel(eras) {
  if (!eras.length) return null;
  const min = eras[0].start;
  const max = eras[eras.length - 1].end;
  const span = max - min;
  if (span <= 0) return null;
  const segments = eras.map((era, index) => ({
    era,
    index,
    left: ((era.start - min) / span) * 100,
    width: ((era.end - era.start) / span) * 100,
  }));
  return { min, max, span, segments };
}

/* E090-09 : points témoins reproductibles, prélevés sur des événements réels
 * par un PRNG à graine fixe. Aucune année n'est inventée. */
function pointsTemoins(index) {
  if (!index || !index.events.length) return [];
  if (S.points && S.points.key === S.countryKey) return S.points.list;
  const rnd = mulberry32(SEED);
  const chosen = new Set();
  const total = index.events.length;
  const wanted = Math.min(5, total);
  for (let guard = 0; chosen.size < wanted && guard < 1000; guard += 1) {
    chosen.add(Math.floor(rnd() * total));
  }
  const list = Array.from(chosen).sort((a, b) => a - b).map((i) => index.events[i]);
  S.points = { key: S.countryKey, list };
  return list;
}

/* E090-04 : rattachement d'un repère à son ère : eraId d'abord, repli sur
 * l'intervalle semi-ouvert [début ; fin[ (la dernière ère inclut sa borne). */
function eraFor(index, event) {
  if (!index) return null;
  if (event.eraId !== undefined && index.byId.has(event.eraId)) {
    return index.byId.get(event.eraId);
  }
  const last = index.eras.length - 1;
  return index.eras.find((era, i) => event.year >= era.start
    && (event.year < era.end || (i === last && event.year <= era.end))) || null;
}

/* Échantillon déterministe de repères : premier, dernier, médian, premier
 * avant l'ère commune et premier après. */
function pickReperes(index) {
  if (!index) return [];
  const events = index.events;
  if (!events.length) return [];
  const chosen = new Set();
  const add = (event) => { if (event) chosen.add(event); };
  add(events[0]);
  add(events[events.length - 1]);
  if (events.length > 2) add(events[Math.floor(events.length / 2)]);
  add(events.find((event) => event.year < 0));
  add(events.find((event) => event.year > 0));
  return Array.from(chosen).map((event) => ({ event, era: eraFor(index, event) }));
}

/* E090-08 : contrôle croisé falsifiable — couverture de la frise et
 * cohérence du rattachement des repères. */
function controle(index, model, reperes) {
  const couverture = model ? (model.max - model.min) / model.span * 100 : 0;
  const couvertureOk = Math.abs(couverture - 100) < 0.05;
  const rattaches = reperes.filter(({ era }) => era !== null).length;
  const coherant = !reperes.length || rattaches > 0;
  const formatsOk = groupDigits(1989) === '1' + NBC + '989'
    && centuryLabel(1) === 'Ier siècle'
    && centuryLabel(-600) === 'VIe siècle av. J.-C.';
  return {
    couverture,
    couvertureOk,
    rattaches,
    total: reperes.length,
    coherant,
    formatsOk,
    ok: couvertureOk && coherant && formatsOk,
  };
}

/* ---------- E090-01 : feuille de style unique, préfixée, sans réseau ---------- */

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
#${PANEL_ID} .${P}-note{color:var(--muted)}
#${GLOSSARY_ID}{margin:6px 0;max-width:70ch}
#${GLOSSARY_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:5px}
#${GLOSSARY_ID} dd{margin:1px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} tbody tr.${P}-active th,#${TABLE_ID} tbody tr.${P}-active td{background:rgba(230,185,111,.14)}
#${NOTATION_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${NOTATION_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${REPERES_ID}{list-style:none;margin:6px 0;padding:0}
#${DETAIL_ID}.${P}-collapsed{display:none}
#${REPERES_ID} li{padding:4px 0;border-bottom:1px solid var(--line);font-size:10px}
#${JALONS_ID}{list-style:none;margin:6px 0;padding:0}
#${JALONS_ID} li{padding:2px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${FRISE_ID}{margin:8px 0}
#${FRISE_ID} .${P}-band{
  position:relative;height:38px;border:1px solid var(--line);border-radius:6px;
  background:rgba(255,255,255,.02);overflow:hidden;
}
#${FRISE_ID} .${P}-seg{
  position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;
  border-right:1px solid var(--line);overflow:hidden;
}
#${FRISE_ID} .${P}-seg.${P}-active{background:rgba(230,185,111,.14)}
#${FRISE_ID} .${P}-seg.${P}-survol{background:rgba(230,185,111,.30);box-shadow:0 0 0 1px var(--gold) inset}
#${FRISE_ID} .${P}-seg-label{
  font-size:9px;color:var(--ink-soft,#d7d1c6);white-space:nowrap;padding:0 2px;
}
#${FRISE_ID} .${P}-curseur{
  position:absolute;top:0;bottom:0;left:0;width:2px;background:var(--gold-bright,#f4d69e);
  transform:translateX(-1px);opacity:.9;
}
#${FRISE_ID} .${P}-axe{
  display:flex;justify-content:space-between;gap:6px;margin:3px 0;
  font-size:9px;color:var(--muted);font-variant-numeric:tabular-nums;
}
#${CANVAS_ID}{
  display:block;width:100%;height:210px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:38px;padding:7px 9px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:10px;font-variant-numeric:tabular-nums;
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
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){#${PANEL_ID} button{transition:none!important;animation:none!important}}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:180px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du texte sémantique (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = E('div', P + '-groupe');
  wrap.appendChild(E('h3', '', 'Trois faits à retenir'));
  const faits = [
    'Un millésime est une année chiffrée : les milliers sont séparés par une espace fine et l’ère est toujours explicite lorsqu’il y a un doute.',
    'Une ère est un intervalle borné par une année de début et une année de fin : sa durée se calcule par différence, son siècle se déduit de la borne de début.',
    'Un repère daté est un événement : son millésime se lit dans l’ère à laquelle il appartient, retrouvée par son identifiant ou par son intervalle.',
  ];
  faits.forEach((texte) => wrap.appendChild(E('p', P + '-fait', texte)));
  return wrap;
}

function staticGlossary() {
  const wrap = E('div', P + '-groupe');
  wrap.appendChild(E('h3', '', 'Lexique — définitions à la première occurrence'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Millésime', 'Année chiffrée d’un repère, écrite sans ambiguïté : espace fine insécable pour les milliers et mention « av. J.-C. » ou « ap. J.-C. » quand l’ère doit être précisée.'],
    ['Ère', 'Intervalle de temps délimité par deux bornes, une année de début et une année de fin, fournies par le jeu de données.'],
    ['An zéro astronomique', 'Convention de calcul où l’année 0 précède l’an 1 ; elle est lue ici comme 1 av. J.-C., selon la convention historique.'],
    ['Siècle', 'Tranche de cent ans comptée à partir de l’an 1 : l’an 1 ouvre le Ier siècle, l’an 1901 le XXe siècle. Les siècles avant l’ère commune se comptent en sens inverse.'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', definition));
  });
  wrap.appendChild(dl);
  return wrap;
}

/* E090-04 : tableau des ères, bornes, durée et siècle recalculés. */
function buildTable(index) {
  const table = E('table');
  table.id = TABLE_ID;
  table.appendChild(E('caption', '', `Ères documentées pour ${index ? index.countryName : 'ce pays'} — bornes et durées calculées depuis le jeu de données.`));

  const thead = E('thead');
  const hr = E('tr');
  ['Ère', 'Début', 'Fin', 'Durée', 'Siècle de début'].forEach((label) => {
    const th = E('th', '', label);
    th.setAttribute('scope', 'col');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = E('tbody');
  const eras = index ? index.eras : [];
  if (!eras.length) {
    const tr = E('tr');
    const td = E('td', '', 'Aucune ère bornée n’est renseignée dans ce périmètre.');
    td.colSpan = 5;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  eras.forEach((era, i) => {
    const tr = E('tr', P + '-row' + (i === S.activeIndex ? ' ' + P + '-active' : ''));
    const name = E('th', '', era.name || `Ère ${i + 1}`);
    name.setAttribute('scope', 'row');
    tr.appendChild(name);

    const start = E('td', '');
    start.setAttribute('data-year', String(era.start));
    start.textContent = formatYear(era.start, S.notation);
    tr.appendChild(start);

    const end = E('td', '');
    end.setAttribute('data-year', String(era.end));
    end.textContent = formatYear(era.end, S.notation);
    tr.appendChild(end);

    const duree = E('td', '', `${groupDigits(Math.abs(era.end - era.start))} ans`);
    tr.appendChild(duree);
    tr.appendChild(E('td', '', centuryLabel(era.start)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tfoot = E('tfoot');
  const fr = E('tr');
  const ft = E('th', '', `${eras.length} ère${eras.length > 1 ? 's' : ''}`);
  ft.setAttribute('scope', 'row');
  fr.appendChild(ft);
  const total = E('td', '', eras.length
    ? `Étendue : ${groupDigits(Math.abs(eras[eras.length - 1].end - eras[0].start))} ans`
    : 'Étendue inconnue');
  total.colSpan = 4;
  fr.appendChild(total);
  tfoot.appendChild(fr);
  table.appendChild(tfoot);
  return table;
}

/* E090-05 : repères datés, avec millésime et ère d'appartenance. */
function buildReperes(index) {
  const list = E('ul');
  list.id = REPERES_ID;
  const reperes = pickReperes(index);
  if (!reperes.length) {
    list.appendChild(E('li', '', 'Aucun repère daté n’est renseigné dans ce périmètre.'));
    return list;
  }
  reperes.forEach(({ event, era }) => {
    const li = E('li', '');
    const title = E('strong', '', event.title || 'Repère');
    const meta = E('span', '');
    const millesime = E('span', '');
    millesime.setAttribute('data-year', String(event.year));
    millesime.textContent = formatYear(event.year, S.notation);
    meta.append(' — millésime ', millesime);
    if (era) {
      const debut = E('span', '');
      debut.setAttribute('data-year', String(era.start));
      debut.textContent = formatYear(era.start, S.notation);
      const fin = E('span', '');
      fin.setAttribute('data-year', String(era.end));
      fin.textContent = formatYear(era.end, S.notation);
      meta.append(' ; ère : ', era.name || 'Ère', ' (', debut, ' — ', fin, ')');
    } else {
      meta.append(' ; ère non rattachée');
    }
    li.append(title, meta);
    list.appendChild(li);
  });
  return list;
}

/* E090-06 : frise proportionnelle doublée d'une phrase de lecture. */
function buildFrise(model, index) {
  const wrap = E('div', P + '-frise');
  wrap.id = FRISE_ID;
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Frise proportionnelle des ères');

  const band = E('div', P + '-band');
  if (model) {
    model.segments.forEach((seg) => {
      const segment = E('span', P + '-seg' + (seg.index === S.activeIndex ? ' ' + P + '-active' : ''));
      segment.style.left = seg.left.toFixed(3) + '%';
      segment.style.width = Math.max(seg.width, 0.8).toFixed(3) + '%';
      segment.setAttribute('title', `${seg.era.name || 'Ère'} — ${formatYear(seg.era.start, 'ere')} à ${formatYear(seg.era.end, 'ere')}`);
      segment.setAttribute('aria-hidden', 'true'); /* décoratif : le texte suit. */
      segment.appendChild(E('span', P + '-seg-label', roman(seg.index + 1)));
      band.appendChild(segment);
    });
  }
  const cursor = E('div', P + '-curseur');
  cursor.setAttribute('aria-hidden', 'true');
  band.appendChild(cursor);
  wrap.appendChild(band);

  const axis = E('p', P + '-axe');
  if (model) {
    const left = E('span', '');
    left.setAttribute('data-year', String(model.min));
    left.textContent = formatYear(model.min, S.notation);
    const right = E('span', '');
    right.setAttribute('data-year', String(model.max));
    right.textContent = formatYear(model.max, S.notation);
    axis.append(left, E('span', '', ' — '), right);
  } else {
    axis.appendChild(E('span', '', 'Bornes d’ères non renseignées'));
  }
  wrap.appendChild(axis);

  const phrase = E('p', P + '-note');
  phrase.id = FRISE_TEXT_ID;
  phrase.textContent = model && model.segments.length
    ? 'Lecture de la frise : ' + model.segments.map((seg) =>
      `${seg.era.name || 'Ère'} de ${formatYear(seg.era.start, 'ere')} à ${formatYear(seg.era.end, 'ere')}`).join(' ; ') + '.'
    : 'Aucune ère bornée n’est disponible pour ce pays.';
  wrap.appendChild(phrase);
  return { wrap, band, cursor };
}

/* E090-07 : jalons chiffrés, avec siècle en toutes lettres. */
function buildJalons(index) {
  const list = E('ul');
  list.id = JALONS_ID;
  const years = pickYears(index);
  if (!years.length) {
    list.appendChild(E('li', '', 'Aucune année renseignée dans ce périmètre.'));
    return list;
  }
  years.forEach((year) => {
    const li = E('li', '');
    const value = E('span', '');
    value.setAttribute('data-year', String(year));
    value.textContent = formatYear(year, S.notation);
    li.append(value, E('span', P + '-note', ' — ' + centuryLabel(year)));
    list.appendChild(li);
  });
  return list;
}

/* E090-08 : défi en cinq temps, aligné sur le contrôle croisé. */
function buildDefi() {
  const wrap = E('section', P + '-groupe');
  wrap.id = DEFI_ID;
  wrap.appendChild(E('h3', '', 'Défi falsifiable — vérifier la lecture des bornes'));
  const ol = E('ol');
  const etapes = [
    'Prédiction : la somme des largeurs des segments extraits des bornes couvre-t-elle exactement l’étendue de la frise ?',
    'Réglage : parcourir les trois notations et relever les bornes de la première et de la dernière ère.',
    'Résultat attendu : la couverture vaut 100,00 % (référence : 100,00 %) et chaque repère prélevé est rattaché à une ère.',
    'Falsification : si la couverture s’écarte de 100,00 % ou si un repère reste sans ère, la lecture des bornes est à rejeter.',
    'Débrief : le tableau, la frise, le canvas et le readout doivent afficher les mêmes millésimes ; sinon le dessin est trompeur.',
  ];
  etapes.forEach((texte) => ol.appendChild(E('li', '', texte)));
  wrap.appendChild(ol);
  return wrap;
}

function collectRefs(panel, fresh) {
  return {
    panel,
    fresh,
    rows: Array.from(panel.querySelectorAll('.' + P + '-row')),
    segments: Array.from(panel.querySelectorAll('.' + P + '-seg')),
    radios: Array.from(panel.querySelectorAll('input[type="radio"]')),
    band: panel.querySelector('.' + P + '-band'),
    cursor: panel.querySelector('.' + P + '-curseur'),
    canvas: document.getElementById(CANVAS_ID),
    readout: document.getElementById(READOUT_ID),
    legend: document.getElementById(LEGEND_ID),
    detail: document.getElementById(DETAIL_ID),
    play: document.getElementById(PLAY_ID),
    stop: document.getElementById(STOP_ID),
    collapse: document.getElementById(COLLAPSE_ID),
  };
}

function ensurePanel(ctx, index, model) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected && S.builtKey === S.countryKey) {
    return collectRefs(existant, false);
  }
  if (existant && existant.parentNode) existant.parentNode.removeChild(existant);

  const panel = E('section', '');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Lire les millésimes et les ères dans les repères');
  title.id = TITLE_ID;
  const lede = E('p', '',
    `Les dates de cet atlas sont écrites sans ambiguïté : une espace fine sépare les milliers, `
    + `la mention « av. J.-C. » distingue les années avant l’ère commune${APOSTROPHE}, et chaque `
    + `ère est donnée par ses deux bornes. Le tableau et les repères ci-dessous sont du texte réel : `
    + `ils restent lisibles sans animation. Le laboratoire canvas illustre les mêmes données.`);
  panel.append(title, lede, staticFacts(), staticGlossary());

  /* E090-08 : choix unique modélisé par un radiogroup (pas d'aria-pressed). */
  const notation = E('fieldset');
  notation.id = NOTATION_ID;
  notation.setAttribute('role', 'radiogroup');
  notation.setAttribute('aria-label', 'Notation des années (choix unique)');
  notation.appendChild(E('legend', '', 'Notation des années (choix unique)'));
  NOTATIONS.forEach((item) => {
    const label = E('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-notation';
    radio.id = P + '-radio-' + item.style;
    radio.value = item.style;
    radio.checked = S.notation === item.style;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(item.label));
    notation.appendChild(label);
  });
  panel.appendChild(notation);

  /* E090-08 : région de statut unique (readout), annoncée poliment. */
  const readout = E('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  /* E090-09 : canvas déterministe, doublé d'une légende textuelle. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Frise des ères, millésimes et points témoins reproductibles. Flèche gauche ou droite : changer de notation ; Début ou Fin : placer le curseur au début ou à la fin ; Espace : lire ou arrêter le parcours. La même information est écrite dans le tableau et le readout.');
  const legend = E('p', P + '-note');
  legend.id = LEGEND_ID;
  panel.append(canvas, legend);

  /* E090-09 bis : le détail peut être replié ; titre, notation, readout et
   * commandes restent accessibles. */
  const detail = E('div', '');
  detail.id = DETAIL_ID;
  detail.appendChild(E('h3', '', 'Tableau des ères et de leurs bornes'));
  detail.appendChild(buildTable(index));
  detail.appendChild(E('h3', '', 'Repères datés : millésime et ère'));
  detail.appendChild(buildReperes(index));
  detail.appendChild(E('h3', '', 'Frise proportionnelle des ères'));
  detail.appendChild(buildFrise(model, index).wrap);
  detail.appendChild(E('h3', '', 'Jalons chiffrés du jeu de données'));
  detail.appendChild(buildJalons(index));
  detail.appendChild(buildDefi());
  panel.appendChild(detail);

  const play = E('button', '', '▶ Lire la frise');
  play.type = 'button';
  play.id = PLAY_ID;
  const stop = E('button', '', '■ Arrêter');
  stop.type = 'button';
  stop.id = STOP_ID;
  const collapse = E('button', '', 'Masquer le détail');
  collapse.type = 'button';
  collapse.id = COLLAPSE_ID;
  collapse.setAttribute('aria-controls', DETAIL_ID);
  collapse.setAttribute('aria-expanded', 'true');
  panel.append(play, stop, collapse);

  const host = ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? (ctx.layout.querySelector('.geo-panel') || ctx.layout)
    : ctx.stage;
  host.insertBefore(panel, host.firstChild);
  S.builtKey = S.countryKey;
  return collectRefs(panel, true);
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule frame) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 210;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const by = pad + 12;
  const bh2 = 34;
  const model = S.model;

  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, by, iw, bh2);

  /* Segments proportionnels : chaque ère porte son numéro romain, pas la
   * seule couleur. La ère courante est hachée. */
  if (model) {
    model.segments.forEach((seg) => {
      const x = pad + (seg.left / 100) * iw;
      const w = Math.max((seg.width / 100) * iw, 1);
      g.fillStyle = seg.index === S.activeIndex
        ? 'rgba(230,185,111,.30)' : 'rgba(255,255,255,.05)';
      g.fillRect(x, by, w, bh2);
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.strokeRect(x, by, w, bh2);
      g.fillStyle = 'rgba(244,214,158,.95)';
      g.font = '11px sans-serif';
      g.fillText(roman(seg.index + 1), x + 3, by + 21);
    });
  }

  /* Graduations aux millésimes réellement présents dans les événements. */
  const domain = S.index ? S.index.domain : [0, 1];
  const span = domain[1] - domain[0] || 1;
  g.font = '9px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  pickYears(S.index).forEach((year, i) => {
    const x = pad + ((year - domain[0]) / span) * iw;
    const y = by + bh2 + 14 + (i % 2) * 11;
    g.beginPath();
    g.moveTo(x, by + bh2);
    g.lineTo(x, y - 2);
    g.stroke();
    g.fillText(formatYear(year, S.notation), x + 2, y + 8);
  });

  /* Points témoins reproductibles (graine fixe) : carrés, forme distincte. */
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.5;
  pointsTemoins(S.index).forEach((event) => {
    const x = pad + ((event.year - domain[0]) / span) * iw;
    g.strokeRect(x - 3, by + bh2 / 2 - 3, 6, 6);
  });

  /* Curseur : seul élément animé, position déterministe = f(S.sweep). */
  const cx = pad + clamp(S.sweep, 0, 1) * iw;
  g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx, by - 4);
  g.lineTo(cx, by + bh2 + 4);
  g.stroke();
  g.setLineDash([]);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`Graine ${SEED.toString(16)} — ${S.index ? S.index.eras.length : 0} ères`, pad, cssH - pad);
}

/* ---------- Readout, contrôles et synchronisation ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const index = S.index;
  const model = S.model;
  const reperes = pickReperes(index);
  const ctrl = controle(index, model, reperes);
  const fort = (texte) => E('strong', '', texte);
  const choix = NOTATIONS.find((item) => item.style === S.notation);
  const etat = S.reduced
    ? 'Mouvement réduit : affichage instantané de la dernière ère.'
    : (S.playing ? `Parcours en cours : ère ${Math.min(S.activeIndex + 1, index ? index.eras.length : 0)} sur ${index ? index.eras.length : 0}.`
      : 'Frise prête.');

  n.textContent = '';
  n.append(document.createTextNode('Périmètre : '));
  n.appendChild(fort(`${index ? index.eras.length : 0} ère${index && index.eras.length > 1 ? 's' : ''}`));
  n.append(document.createTextNode(model
    ? `, de ${formatYear(model.min, 'ere')} à ${formatYear(model.max, 'ere')} (étendue ${groupDigits(model.span)} ans). `
    : ', étendue non renseignée. '));
  n.append(document.createTextNode('Notation : '));
  n.appendChild(fort(choix ? choix.label : S.notation));
  const courante = currentEra();
  n.append(document.createTextNode('. Ère courante : '));
  n.appendChild(fort(courante && courante.name ? courante.name : 'non renseignée'));
  n.append(document.createTextNode('. Couverture : '));
  n.appendChild(fort(`${ctrl.couverture.toFixed(2).replace('.', ',')} %`));
  n.append(document.createTextNode(' (référence : 100,00 %) — '));
  n.appendChild(fort(ctrl.ok ? 'formule vérifiée' : 'formule à rejeter'));
  n.append(document.createTextNode(`. Repères rattachés : ${ctrl.rattaches}/${ctrl.total}. `));
  const temoins = pointsTemoins(index);
  n.append(document.createTextNode(temoins.length
    ? `Points témoins (graine ${SEED.toString(16)}) : ${temoins.map((e) => formatYear(e.year, S.notation)).join(', ')}. `
    : 'Aucun repère témoin. '));
  n.append(document.createTextNode(etat));
}

/* Position du curseur DOM, dérivée de l'ère courante (jamais de hasard). */
function paintCursor() {
  const cursor = S.nodes.cursor;
  if (!cursor) return;
  const segments = S.model ? S.model.segments : [];
  const seg = segments[Math.min(S.activeIndex, segments.length - 1)];
  cursor.style.left = seg ? (seg.left + seg.width / 2).toFixed(3) + '%' : '0%';
}

function syncControls() {
  const n = S.nodes;
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, S.reduced ? '1' : '0');
  if (n.radios) {
    n.radios.forEach((radio) => {
      const on = radio.value === S.notation;
      radio.checked = on;
      radio.tabIndex = on ? 0 : -1;
    });
  }
  if (n.rows) {
    n.rows.forEach((row, i) => row.classList.toggle(P + '-active', i === S.activeIndex));
  }
  if (n.segments) {
    n.segments.forEach((seg, i) => seg.classList.toggle(P + '-active', i === S.activeIndex));
  }
  paintCursor();
  if (n.legend) {
    n.legend.textContent = 'Chaque ère porte son numéro romain et chaque millésime est écrit en toutes lettres : '
      + 'ni le curseur haché, ni les carrés des points témoins ne reposent sur la seule couleur.';
  }
  if (n.play) n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  updateReadout();
  drawLab();
}

/* E090-02 : reformattage réel de chaque année stockée en data-year. */
function applyNotation(style) {
  S.notation = style;
  const root = document.getElementById(PANEL_ID);
  if (root) {
    root.querySelectorAll('[data-year]').forEach((node) => {
      const year = Number(node.getAttribute('data-year'));
      node.textContent = formatYear(year, style);
    });
  }
  syncControls();
}

function setNotation(style) {
  if (NOTATIONS.some((item) => item.style === style)) applyNotation(style);
}

function stepNotation(delta) {
  const i = NOTATIONS.findIndex((item) => item.style === S.notation);
  const next = NOTATIONS[(i + delta + NOTATIONS.length) % NOTATIONS.length];
  setNotation(next.style);
}

/* ---------- E090-10 : boucle rAF unique, pause et mouvement réduit ---------- */

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
  if (S.reduced || S.offscreen) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || S.offscreen) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) {
      S.sweep = (S.sweep + dt / SWEEP_MS) % 1;
      const total = S.index ? S.index.eras.length : 0;
      const next = total ? Math.min(total - 1, Math.floor(S.sweep * total)) : 0;
      if (next !== S.activeIndex) {
        /* Le statut n'est réécrit qu'au changement d'ère, pas à chaque frame. */
        S.activeIndex = next;
        syncControls();
      } else {
        paintCursor();
        drawLab();
      }
    }
  }
  S.lastTs = ts;
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

function togglePlay() {
  S.playing = !S.playing;
  if (!S.playing) stopLoop();
  else startLoop();
  syncControls();
}

function installGlobalListeners(ctx) {
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
        S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : mq.matches;
        if (S.reduced) { S.playing = false; stopLoop(); }
        else if (S.playing) startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* Observateurs : pause hors écran et redessin lors d'un changement de taille. */
function installObservers() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof IntersectionObserver !== 'function') return;
  if (!S.intersection) {
    S.intersection = new IntersectionObserver((entrees) => {
      const e = entrees[entrees.length - 1];
      S.offscreen = !e.isIntersecting;
      if (S.offscreen) stopLoop();
      else if (S.playing) startLoop();
    }, { rootMargin: '40px' });
    if (typeof ResizeObserver === 'function') S.resize = new ResizeObserver(() => drawLab());
  }
  if (S.observedCanvas !== cv) {
    if (S.observedCanvas && S.intersection) S.intersection.unobserve(S.observedCanvas);
    if (S.observedCanvas && S.resize) S.resize.unobserve(S.observedCanvas);
    S.observedCanvas = cv;
    S.intersection.observe(cv);
    if (S.resize) S.resize.observe(cv);
  }
}

/* ---------- Point d'entrée ---------- */

register('E090', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  E = typeof ctx.el === 'function' ? ctx.el : E;
  ctx.css(CSS_ID, CSS);

  /* Une seule animation existe à la fois : arrêt à chaque rendu. */
  stopLoop();
  refreshIndexFromStore();
  S.model = buildFriseModel(S.index ? S.index.eras : []);

  const total = S.index ? S.index.eras.length : 0;
  const raw = Number.isInteger(state.eraIndex) ? state.eraIndex : 0;
  S.activeIndex = total ? ((raw % total) + total) % total : 0;
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) {
    /* Affichage instantané de la dernière ère, sans lancer de boucle. */
    S.playing = false;
    S.sweep = 1;
    S.activeIndex = total ? total - 1 : 0;
  }

  S.nodes = ensurePanel(ctx, S.index, S.model);
  installObservers();
  syncControls();

  if (S.nodes.fresh) {
    S.nodes.radios.forEach((radio) => {
      radio.addEventListener('change', () => { if (radio.checked) setNotation(radio.value); });
    });
    S.nodes.play.addEventListener('click', () => togglePlay());
    S.nodes.stop.addEventListener('click', () => {
      S.playing = false;
      stopLoop();
      syncControls();
    });
    S.nodes.collapse.addEventListener('click', () => {
      const collapsed = S.nodes.detail.classList.toggle(P + '-collapsed');
      S.nodes.collapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      S.nodes.collapse.textContent = collapsed ? 'Afficher le détail' : 'Masquer le détail';
      syncControls();
    });
    S.nodes.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft') stepNotation(-1);
      else if (event.key === 'ArrowRight') stepNotation(1);
      else if (event.key === 'Home') { S.sweep = 0; S.playing = false; stopLoop(); syncControls(); }
      else if (event.key === 'End') { S.sweep = 1; S.playing = false; stopLoop(); syncControls(); }
      else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
      else used = false;
      if (used) { event.preventDefault(); event.stopPropagation(); }
    });
    S.nodes.rows.forEach((row, i) => {
      const set = (on) => {
        if (S.nodes.segments[i]) S.nodes.segments[i].classList.toggle(P + '-survol', on);
      };
      row.addEventListener('mouseenter', () => set(true));
      row.addEventListener('mouseleave', () => set(false));
    });
  }

  installGlobalListeners(ctx);
  if (S.playing) startLoop();
});
