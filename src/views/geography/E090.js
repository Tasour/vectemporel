import { register } from './registry.js';
import { state, currentCountry, currentEra } from '../../domain/store.js';

/* Lentille E090 — vue GEOGRAPHIE.
 * Thème : lecture des millésimes et des ères dans les repères.
 *
 * Les dix chantiers E090-01 … E090-10 sont tous implémentés et décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E090.md. Les ères, les bornes et les années
 * proviennent du jeu de données local (aucune valeur fabriquée, aucun appel
 * réseau, aucun aléa, aucune console). Tout le contenu informatif est du texte
 * DOM réel : le panneau reste lisible et indexable sans animation ni
 * interaction.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }. */

const PREFIX = 'geography-e090';
const NBC = '\u202F';       /* espace fine insécable : groupement des milliers. */
const APOSTROPHE = '\u2019'; /* apostrophe typographique du texte courant. */
const SWEEP_MS = 2600;      /* durée déterministe d'un parcours de la frise. */

/* API d'injection mémorisée à l'entrée pour rester disponible dans les helpers. */
let A = null;

/* État de module : UNE seule boucle rAF au plus pour toute la lentille.
   Elle est arrêtée à chaque rendu et suspendue quand l'onglet est masqué. */
let anim = null;
let visibilityBound = false;

const el = (tag, cls, text) => A.el(tag, cls, text);

/* ------------------------------------------------------------------ */
/* Utilitaires de formatage — déterministes, sans aucune dépendance.    */
/* ------------------------------------------------------------------ */

/* E090-03 : regroupement des milliers par espace fine insécable.
   L'espace est insécable pour éviter qu'un nombre soit coupé en fin de ligne. */
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

/* E090-06 : conversion d'une année en siècle, en chiffres romains. */
function centuryLabel(year) {
  const parts = splitYear(year);
  if (!parts) return 'siècle inconnu';
  const rank = Math.floor((parts.abs - 1) / 100) + 1;
  const ordinal = rank === 1 ? 'Ier' : roman(rank) + 'e';
  return `${ordinal} siècle${parts.bc ? ' av. J.-C.' : ''}`;
}

/* E090-02 / E090-03 : une seule fonction de formatage, trois notations.
   « simple »  → 600 av. J.-C. / 1 989
   « ere »     → 600 av. J.-C. / 1 989 ap. J.-C.
   « century » → VIe siècle av. J.-C. / XXe siècle */
function formatYear(year, style = 'simple') {
  const parts = splitYear(year);
  if (!parts) return 'année inconnue';
  if (style === 'century') return centuryLabel(parts.abs * (parts.bc ? -1 : 1));
  const digits = groupDigits(parts.abs);
  const suffix = parts.bc ? ' av. J.-C.' : ' ap. J.-C.';
  if (style === 'ere') return digits + suffix;
  return parts.bc ? digits + suffix : digits;
}

const NOTATIONS = [
  { style: 'simple', label: 'Année seule' },
  { style: 'ere', label: 'Avec l’ère' },
  { style: 'century', label: 'En siècle' },
];

/* ------------------------------------------------------------------ */
/* Lecture des données réelles (jamais de valeur inventée).             */
/* ------------------------------------------------------------------ */

function collectData() {
  const country = currentCountry();
  const eras = (Array.isArray(country?.eras) ? country.eras : []).slice();
  const events = (Array.isArray(country?.events) ? country.events : []).slice();
  const activeIndex = Number.isInteger(state.eraIndex) ? state.eraIndex : 0;
  return { country, eras, events, activeIndex, current: currentEra() };
}

/* E090-05 : modèle géométrique de la frise, calculé depuis les bornes réelles. */
function buildFriseModel(eras) {
  const valid = eras.filter((era) => {
    const s = Number(era?.start);
    const t = Number(era?.end);
    return Number.isFinite(s) && Number.isFinite(t) && t > s;
  });
  if (!valid.length) return null;
  const min = Math.min(...valid.map((e) => Number(e.start)));
  const max = Math.max(...valid.map((e) => Number(e.end)));
  const span = max - min;
  const segments = eras.map((era) => {
    const s = Number(era?.start);
    const t = Number(era?.end);
    const ok = Number.isFinite(s) && Number.isFinite(t) && t > s;
    return {
      era,
      valid: ok,
      left: ok ? ((s - min) / span) * 100 : 0,
      width: ok ? ((t - s) / span) * 100 : 0,
    };
  }).filter((seg) => seg.valid);
  return { min, max, span, segments };
}

/* Échantillon déterministe d'années réellement présentes dans les événements. */
function pickYears(events) {
  const years = events
    .map((event) => Number(event?.year))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.round(value));
  if (!years.length) return [];
  const unique = Array.from(new Set(years)).sort((a, b) => a - b);
  const picks = new Set([unique[0], unique[unique.length - 1]]);
  if (unique.length > 2) picks.add(unique[Math.floor(unique.length / 2)]);
  const before = unique.find((y) => y < 0);
  const after = unique.find((y) => y > 0);
  if (before !== undefined) picks.add(before);
  if (after !== undefined) picks.add(after);
  return Array.from(picks).sort((a, b) => a - b);
}

/* E090-04 : repères datés — chaque millésime d'événement est relu dans son
   ère réelle (rattachement par eraId). Échantillon déterministe, sans aléa :
   premier, dernier, médian, premier avant l'ère commune et premier après.
   Aucune année n'est inventée : tout provient du jeu de données. */
function pickReperes(data) {
  const erasById = new Map(data.eras.map((era) => [era.id, era]));
  const events = data.events.filter((event) => Number.isFinite(Number(event?.year)));
  if (!events.length) return [];
  const chosen = new Set();
  const add = (event) => { if (event) chosen.add(event); };
  add(events[0]);
  add(events[events.length - 1]);
  if (events.length > 2) add(events[Math.floor(events.length / 2)]);
  add(events.find((event) => Number(event.year) < 0));
  add(events.find((event) => Number(event.year) > 0));
  return Array.from(chosen).map((event) => ({ event, era: erasById.get(event.eraId) || null }));
}

/* ------------------------------------------------------------------ */
/* CSS isolé, préfixé, sans ressource externe (E090-01).                */
/* ------------------------------------------------------------------ */

const CSS = `
  #${PREFIX}-panel { margin:14px 0 6px; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.02); color:var(--muted); font-size:10px; line-height:1.7; }
  .${PREFIX}-title { margin:0 0 6px; font-size:12px; color:var(--gold-bright); }
  .${PREFIX}-intro, .${PREFIX}-note, .${PREFIX}-frise-text { margin:6px 0; font-size:10px; line-height:1.7; color:var(--muted); }
  .${PREFIX}-subtitle { margin:12px 0 4px; font-size:11px; color:var(--gold-bright); font-weight:normal; }
  .${PREFIX}-notation { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
  .${PREFIX}-radio, .${PREFIX}-play, .${PREFIX}-stop, .${PREFIX}-collapse {
    min-height:36px; min-width:36px; padding:5px 10px; border:1px solid var(--line);
    border-radius:8px; background:transparent; color:var(--muted); font-size:10px;
    line-height:1.4; text-align:center; cursor:pointer;
  }
  .${PREFIX}-radio[aria-checked="true"] { border-color:var(--gold); color:var(--gold-bright); background:rgba(230,185,111,.10); }
  .${PREFIX}-radio:hover, .${PREFIX}-play:hover, .${PREFIX}-stop:hover, .${PREFIX}-collapse:hover { border-color:var(--gold); color:var(--gold-bright); }
  .${PREFIX}-radio:focus-visible, .${PREFIX}-play:focus-visible, .${PREFIX}-stop:focus-visible, .${PREFIX}-collapse:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
  .${PREFIX}-status, .${PREFIX}-progress { margin:4px 0; min-height:14px; font-size:10px; color:var(--gold-bright); font-variant-numeric:tabular-nums; }
  .${PREFIX}-detail { margin-top:6px; }
  .${PREFIX}-collapsed .${PREFIX}-detail { display:none; }
  .${PREFIX}-table { width:100%; border-collapse:collapse; margin:4px 0 8px; font-size:10px; font-variant-numeric:tabular-nums; }
  .${PREFIX}-table caption { text-align:left; padding:2px 0 6px; color:var(--muted-2); font-size:9px; }
  .${PREFIX}-table th, .${PREFIX}-table td { padding:4px 6px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  .${PREFIX}-table thead th { color:var(--gold-bright); font-weight:normal; }
  .${PREFIX}-active > * { background:rgba(230,185,111,.12); }
  .${PREFIX}-active th { color:var(--gold-bright); }
  .${PREFIX}-duration, .${PREFIX}-century-cell { color:var(--muted-2); }
  .${PREFIX}-frise { margin:4px 0 6px; }
  .${PREFIX}-band { position:relative; height:34px; border:1px solid var(--line); border-radius:6px; background:rgba(255,255,255,.02); overflow:hidden; }
  .${PREFIX}-seg { position:absolute; top:0; bottom:0; display:flex; align-items:center; justify-content:center; border-right:1px solid var(--line); overflow:hidden; }
  .${PREFIX}-seg-label { font-size:8px; line-height:1.1; text-align:center; color:var(--muted-2); padding:0 2px; white-space:nowrap; }
  .${PREFIX}-seg.${PREFIX}-seg-active { background:rgba(230,185,111,.10); }
  .${PREFIX}-seg.${PREFIX}-seg-play { background:rgba(230,185,111,.28); box-shadow:0 0 0 1px var(--gold) inset; }
  .${PREFIX}-seg.${PREFIX}-seg-play .${PREFIX}-seg-label { color:var(--gold-bright); }
  .${PREFIX}-cursor { position:absolute; top:0; bottom:0; left:0; width:2px; background:var(--gold-bright); transform:translateX(-1px); opacity:.9; }
  .${PREFIX}-axis { display:flex; justify-content:space-between; gap:6px; margin:2px 0; font-size:9px; color:var(--muted-2); font-variant-numeric:tabular-nums; }
  .${PREFIX}-axis-sep { opacity:.5; }
  .${PREFIX}-samples { list-style:none; margin:4px 0; padding:0; }
  .${PREFIX}-sample { padding:2px 0; font-variant-numeric:tabular-nums; }
  .${PREFIX}-sample-year { color:var(--gold-bright); }
  .${PREFIX}-sample-century { color:var(--muted-2); }
  .${PREFIX}-repere-list { list-style:none; margin:4px 0; padding:0; }
  .${PREFIX}-repere { padding:4px 0; border-bottom:1px solid var(--line); font-size:10px; line-height:1.6; }
  .${PREFIX}-repere-title { color:var(--gold-bright); }
  .${PREFIX}-repere-meta { color:var(--muted-2); font-variant-numeric:tabular-nums; }
  .${PREFIX}-actions { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:10px 0 2px; }
  .${PREFIX}-actions .${PREFIX}-progress { flex:1 1 100%; }
  @media (max-width:620px) {
    .${PREFIX}-radio, .${PREFIX}-play, .${PREFIX}-stop, .${PREFIX}-collapse { min-height:40px; }
    .${PREFIX}-seg-label { font-size:7px; }
  }`;

/* ------------------------------------------------------------------ */
/* Construction du panneau sémantique (contenu lisible sans JS).        */
/* ------------------------------------------------------------------ */

/* E090-04 : les repères datés, avec millésime et ère d'appartenance. */
function buildReperes(data) {
  const list = el('ul', PREFIX + '-repere-list');
  list.id = PREFIX + '-reperes';
  const reperes = pickReperes(data);
  if (!reperes.length) {
    list.appendChild(el('li', PREFIX + '-repere', 'Aucun repère daté n’est renseigné dans ce périmètre.'));
    return list;
  }
  reperes.forEach(({ event, era }) => {
    const li = el('li', PREFIX + '-repere');
    const title = el('span', PREFIX + '-repere-title', event.title || 'Repère');
    const meta = el('span', PREFIX + '-repere-meta');
    const year = Number(event.year);
    const millesime = el('span', PREFIX + '-repere-year');
    millesime.setAttribute('data-year', String(year));
    millesime.textContent = formatYear(year, 'ere');
    meta.append(' — millésime ', millesime);
    if (era) {
      meta.append(' ; ère : ' + (era.name || 'Ère') + ' ('
        + formatYear(era.start, 'ere') + ' — ' + formatYear(era.end, 'ere') + ')');
    } else {
      meta.append(' ; ère non rattachée');
    }
    li.append(title, meta);
    list.appendChild(li);
  });
  return list;
}

/* E090-04 : tableau des ères et de leurs bornes réelles. */
function buildTable(data) {
  const table = el('table', PREFIX + '-table');
  table.id = PREFIX + '-table';
  const countryName = data.country && data.country.name ? data.country.name : 'ce pays';
  table.appendChild(el('caption', '', `Ères documentées pour ${countryName}`));

  const head = el('thead', '');
  const headRow = el('tr', '');
  ['Ère', 'Début', 'Fin', 'Durée', 'Siècle de début'].forEach((label) => {
    const th = el('th', '', label);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const body = el('tbody', '');
  data.eras.forEach((era, index) => {
    const isActive = index === data.activeIndex;
    const tr = el('tr', PREFIX + '-row' + (isActive ? ' ' + PREFIX + '-active' : ''));
    const nameCell = el('th', '', era.name || `Ère ${index + 1}`);
    nameCell.setAttribute('scope', 'row');
    tr.appendChild(nameCell);

    const start = el('td', PREFIX + '-year');
    start.setAttribute('data-year', String(era.start));
    start.textContent = formatYear(era.start, 'simple');
    tr.appendChild(start);

    const end = el('td', PREFIX + '-year');
    end.setAttribute('data-year', String(era.end));
    end.textContent = formatYear(era.end, 'simple');
    tr.appendChild(end);

    const s = Number(era.start);
    const t = Number(era.end);
    const duration = Number.isFinite(s) && Number.isFinite(t)
      ? `${groupDigits(Math.abs(t - s))} ans`
      : 'durée inconnue';
    tr.appendChild(el('td', PREFIX + '-duration', duration));
    tr.appendChild(el('td', PREFIX + '-century-cell', formatYear(era.start, 'century')));
    body.appendChild(tr);
  });
  table.appendChild(body);
  return table;
}

/* E090-05 : frise proportionnelle doublée d'une phrase de lecture. */
function buildFrise(model, data) {
  const wrap = el('div', PREFIX + '-frise');
  wrap.id = PREFIX + '-frise';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Frise proportionnelle des ères');

  const band = el('div', PREFIX + '-band');
  band.id = PREFIX + '-band';
  if (model) {
    model.segments.forEach((seg, index) => {
      const segment = el('span', PREFIX + '-seg'
        + (index === data.activeIndex ? ' ' + PREFIX + '-seg-active' : ''));
      segment.style.left = seg.left.toFixed(3) + '%';
      segment.style.width = Math.max(seg.width, 0.8).toFixed(3) + '%';
      segment.setAttribute('title', `${seg.era.name || 'Ère'} — ${formatYear(seg.era.start, 'ere')} à ${formatYear(seg.era.end, 'ere')}`);
      segment.setAttribute('aria-hidden', 'true'); /* décoratif : le texte suit. */
      segment.appendChild(el('span', PREFIX + '-seg-label', seg.era.name || `Ère ${index + 1}`));
      band.appendChild(segment);
    });
  }
  const cursor = el('div', PREFIX + '-cursor');
  cursor.id = PREFIX + '-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  band.appendChild(cursor);
  wrap.appendChild(band);

  const axis = el('p', PREFIX + '-axis');
  if (model) {
    const left = el('span', PREFIX + '-axis-year');
    left.setAttribute('data-year', String(model.min));
    left.textContent = formatYear(model.min, 'simple');
    const right = el('span', PREFIX + '-axis-year');
    right.setAttribute('data-year', String(model.max));
    right.textContent = formatYear(model.max, 'simple');
    axis.append(left, el('span', PREFIX + '-axis-sep', ' — '), right);
  } else {
    axis.appendChild(el('span', PREFIX + '-axis-year', 'Bornes d’ères non renseignées'));
  }
  wrap.appendChild(axis);
  return { wrap, band, cursor };
}

function buildPanel(ctx, data, model) {
  const host = ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? (ctx.layout.querySelector('.geo-panel') || ctx.layout)
    : ctx.stage;

  const root = el('section', PREFIX + '-panel');
  root.id = PREFIX + '-panel';
  root.setAttribute('aria-labelledby', PREFIX + '-title');

  /* E090-01 : titre et paragraphe sémantiques, lisibles sans aucune interaction. */
  const title = el('h2', PREFIX + '-title', 'Lire les millésimes et les ères');
  title.id = PREFIX + '-title';
  const intro = el('p', PREFIX + '-intro',
    `Les dates de cet atlas sont écrites sans ambiguïté : une espace fine sépare les milliers, `
    + `la mention « av. J.-C. » distingue les années avant l’ère commune${APOSTROPHE}, et chaque `
    + `ère est donnée par ses deux bornes. Les repères associent chaque millésime à son ère. `
    + `Choisissez une notation : les mêmes années sont alors reformattées dans le tableau, `
    + `les repères et la frise.`);
  intro.id = PREFIX + '-intro';
  root.append(title, intro);

  /* E090-07 : choix unique modélisé par un radiogroup (pas d'aria-pressed). */
  const notation = el('div', PREFIX + '-notation');
  notation.id = PREFIX + '-notation';
  notation.setAttribute('role', 'radiogroup');
  notation.setAttribute('aria-label', 'Notation des années');
  const radios = NOTATIONS.map((item, index) => {
    const button = el('button', PREFIX + '-radio', item.label);
    button.type = 'button';
    button.id = PREFIX + '-radio-' + item.style;
    button.dataset.style = item.style;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', index === 0 ? 'true' : 'false');
    button.tabIndex = index === 0 ? 0 : -1;
    notation.appendChild(button);
    return button;
  });
  root.appendChild(notation);

  /* E090-08 : région de statut unique, annoncée poliment. */
  const status = el('p', PREFIX + '-status', 'Notation : année seule.');
  status.id = PREFIX + '-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.appendChild(status);

  /* E090-09 : le détail peut être replié ; titre, commandes et statut restent. */
  const detail = el('div', PREFIX + '-detail');
  detail.id = PREFIX + '-detail';

  detail.appendChild(el('h3', PREFIX + '-subtitle', 'Tableau des ères et de leurs bornes'));
  detail.appendChild(buildTable(data));

  detail.appendChild(el('h3', PREFIX + '-subtitle', 'Repères datés : millésime et ère'));
  detail.appendChild(buildReperes(data));

  detail.appendChild(el('h3', PREFIX + '-subtitle', 'Frise proportionnelle des ères'));
  const frise = buildFrise(model, data);
  detail.appendChild(frise.wrap);
  const friseText = el('p', PREFIX + '-frise-text',
    model && model.segments.length
      ? 'Lecture de la frise : ' + model.segments.map((seg) =>
        `${seg.era.name || 'Ère'} de ${formatYear(seg.era.start, 'ere')} à ${formatYear(seg.era.end, 'ere')}`).join(' ; ') + '.'
      : 'Aucune ère bornée n’est disponible pour ce pays.');
  friseText.id = PREFIX + '-frise-text';
  detail.appendChild(friseText);

  /* E090-02 / E090-03 / E090-06 : jalons réels, avec siècle en toutes lettres. */
  detail.appendChild(el('h3', PREFIX + '-subtitle', 'Jalons chiffrés du jeu de données'));
  const years = pickYears(data.events);
  const samples = el('ul', PREFIX + '-samples');
  samples.id = PREFIX + '-samples';
  if (years.length) {
    years.forEach((year) => {
      const li = el('li', PREFIX + '-sample');
      const value = el('span', PREFIX + '-sample-year');
      value.setAttribute('data-year', String(year));
      value.textContent = formatYear(year, 'simple');
      li.append(value, el('span', PREFIX + '-sample-century', ' — ' + centuryLabel(year)));
      samples.appendChild(li);
    });
  } else {
    samples.appendChild(el('li', PREFIX + '-sample', 'Aucune année renseignée dans ce périmètre.'));
  }
  detail.appendChild(samples);
  root.appendChild(detail);

  /* E090-10 : commandes de parcours et repli, cibles tactiles portées à 36 px. */
  const actions = el('div', PREFIX + '-actions');
  const play = el('button', PREFIX + '-play', 'Lire la frise');
  play.type = 'button';
  play.id = PREFIX + '-play';
  const stop = el('button', PREFIX + '-stop', 'Arrêter');
  stop.type = 'button';
  stop.id = PREFIX + '-stop';
  const collapse = el('button', PREFIX + '-collapse', 'Masquer le détail');
  collapse.type = 'button';
  collapse.id = PREFIX + '-collapse';
  collapse.setAttribute('aria-controls', detail.id);
  collapse.setAttribute('aria-expanded', 'true');
  const progress = el('p', PREFIX + '-progress', 'Frise prête.');
  progress.id = PREFIX + '-progress';
  progress.setAttribute('role', 'status');
  progress.setAttribute('aria-live', 'polite');
  actions.append(play, stop, collapse, progress);
  root.appendChild(actions);

  host.appendChild(root);
  return { root, detail, frise, status, progress, radios, play, stop, collapse };
}

/* ------------------------------------------------------------------ */
/* Interactions — notation, repli, année courante.                     */
/* ------------------------------------------------------------------ */

/* E090-02 / E090-07 : reformattage réel de chaque year stockée en data-year. */
function applyNotation(root, style, announce) {
  root.querySelectorAll('[data-year]').forEach((node) => {
    const year = Number(node.getAttribute('data-year'));
    node.textContent = formatYear(year, style);
  });
  const item = NOTATIONS.find((entry) => entry.style === style);
  announce('Notation : ' + (item ? item.label : style) + '.');
}

function wireRadios(refs, status) {
  const list = refs.radios;
  const select = (index, focus) => {
    list.forEach((button, i) => {
      const on = i === index;
      button.setAttribute('aria-checked', on ? 'true' : 'false');
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
    });
    applyNotation(refs.root, list[index].dataset.style, (message) => { status.textContent = message; });
  };
  list.forEach((button, index) => {
    button.addEventListener('click', () => select(index, false));
    button.addEventListener('keydown', (event) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      let next = index;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = list.length - 1;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        next = (index - 1 + list.length) % list.length;
      } else {
        next = (index + 1) % list.length;
      }
      select(next, true);
    });
  });
}

/* E090-09 : survol / focus d'une ligne met en évidence son segment sur la frise. */
function wireHighlight(refs) {
  const rows = Array.from(refs.root.querySelectorAll('.' + PREFIX + '-row'));
  const segments = Array.from(refs.frise.band.querySelectorAll('.' + PREFIX + '-seg'));
  rows.forEach((row, index) => {
    const set = (on) => {
      if (segments[index]) segments[index].classList.toggle(PREFIX + '-seg-play', on);
    };
    row.addEventListener('mouseenter', () => set(true));
    row.addEventListener('mouseleave', () => set(false));
  });
}

/* ------------------------------------------------------------------ */
/* E090-10 : une seule boucle rAF, déterministe, suspendue si masqué.   */
/* ------------------------------------------------------------------ */

function stopAnimation(silent = false) {
  if (!anim) return;
  const current = anim;
  if (current.rafId) cancelAnimationFrame(current.rafId);
  anim = null;
  current.band.querySelectorAll('.' + PREFIX + '-seg').forEach((node) => {
    node.classList.remove(PREFIX + '-seg-play');
  });
  if (!silent) current.progress.textContent = 'Lecture arrêtée.';
}

function frame(timestamp) {
  if (!anim) return;
  anim.rafId = 0;
  /* Pause explicite : on ne reprogramme pas de frame quand l'onglet est masqué. */
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!anim.last) anim.last = timestamp;
  anim.elapsed += timestamp - anim.last;
  anim.last = timestamp;
  const next = Math.min(anim.segments.length - 1, Math.floor(anim.elapsed / anim.step));
  if (next !== anim.index) {
    anim.index = next;
    anim.paint(next);
  }
  if (anim.elapsed >= SWEEP_MS) {
    anim.progress.textContent = `Parcours terminé : ${anim.segments.length} ères.`;
    anim = null;
    return;
  }
  anim.rafId = requestAnimationFrame(frame);
}

function startAnimation(refs, model, reduced) {
  stopAnimation(true);
  if (!model || !model.segments.length) {
    refs.progress.textContent = 'Aucune ère à parcourir sur cette frise.';
    return;
  }
  const segments = model.segments;
  const band = refs.frise.band;
  const nodes = Array.from(band.querySelectorAll('.' + PREFIX + '-seg'));
  const paint = (index) => {
    const seg = segments[index];
    if (!seg) return;
    refs.frise.cursor.style.left = (seg.left + seg.width / 2).toFixed(3) + '%';
    nodes.forEach((node, i) => node.classList.toggle(PREFIX + '-seg-play', i === index));
    refs.progress.textContent = `Ère ${index + 1} sur ${segments.length} — ${seg.era.name || 'Ère'} : `
      + `${formatYear(seg.era.start, 'ere')} à ${formatYear(seg.era.end, 'ere')}.`;
  };
  if (reduced) {
    paint(segments.length - 1);
    refs.progress.textContent = `Lecture instantanée (mouvement réduit) — ${segments.length} ères.`;
    return;
  }
  anim = {
    rafId: 0, last: 0, elapsed: 0, index: -1,
    segments, band, cursor: refs.frise.cursor, progress: refs.progress, paint,
    step: SWEEP_MS / segments.length,
  };
  refs.progress.textContent = `Lecture de la frise — ${segments.length} ères.`;
  anim.rafId = requestAnimationFrame(frame);
}

/* Garde-fou de visibilité installé une seule fois pour toute la lentille. */
function installVisibilityWatch() {
  if (visibilityBound || typeof document === 'undefined') return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!anim) return;
    if (document.hidden) {
      if (anim.rafId) { cancelAnimationFrame(anim.rafId); anim.rafId = 0; }
    } else if (!anim.rafId) {
      anim.last = 0; /* le temps masqué ne compte pas dans le parcours. */
      anim.rafId = requestAnimationFrame(frame);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Point d'entrée.                                                     */
/* ------------------------------------------------------------------ */

register('E090', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  A = ctx;

  /* Une seule animation même si la vue est redessinée plusieurs fois. */
  stopAnimation(true);
  ctx.css('geography-e090', CSS);

  const data = collectData();
  const model = buildFriseModel(data.eras);
  const refs = buildPanel(ctx, data, model);
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  wireRadios(refs, refs.status);
  wireHighlight(refs);

  refs.collapse.addEventListener('click', () => {
    const collapsed = refs.root.classList.toggle(PREFIX + '-collapsed');
    refs.collapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    refs.collapse.textContent = collapsed ? 'Afficher le détail' : 'Masquer le détail';
    refs.status.textContent = collapsed ? 'Détail masqué.' : 'Détail affiché.';
  });
  refs.play.addEventListener('click', () => startAnimation(refs, model, reduced));
  refs.stop.addEventListener('click', () => stopAnimation(false));

  installVisibilityWatch();
});
