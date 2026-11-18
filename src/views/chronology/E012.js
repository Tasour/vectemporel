import { register } from './registry.js';
import { DATASET } from '../../data/dataset.js';

/* Lentille E012 — Sémantique des données (vague CHRONOLOGIE).
 *
 * Dix chantiers, tous implémentés ici. Aucune donnée n'est inventée : chaque
 * annotation est dérivée soit du DOM rendu par chronology.js, soit du DATASET
 * local (unique source des rangs globaux). Aucun appel réseau, aucun aléa,
 * aucune journalisation, aucun écouteur, aucune boucle rAF, aucun fichier
 * partagé modifié. Le seul style est injecté une fois via ctx.css('chronology-e12', …).
 *
 * Vocabulaire local : « vectemporel:chronology:1 ». Il est volontairement
 * local (aucune URI distante, donc aucun chargement, même passif) et exposé
 * dans un dictionnaire visible en fin de colonne principale. Aucune
 * journalisation, aucun appel réseau.
 */

const CSS_ID = 'chronology-e12';
const DICT_ID = 'chronology-e12-dictionary';
const COVERAGE_ID = 'chronology-e12-coverage';
const VOCAB = 'vectemporel:chronology:1';

const KIND_LABELS = Object.freeze({
  audit: "Point d'audit",
  figure: 'Figure historique',
  lieu: 'Lieu',
  récit: 'Récit',
});

const CONFIDENCE_LABELS = Object.freeze({
  certain: 'Certain',
  disputed: 'Contesté',
  probable: 'Probable',
  vérifié: 'Vérifié',
});

const CSS = `
#${DICT_ID} { margin: 16px 0 0; padding: 8px 10px; border: 1px solid var(--line);
  border-radius: 8px; background: rgba(255,255,255,.02); }
#${DICT_ID} > summary { min-height: 30px; padding: 4px 0; color: var(--gold);
  font-size: 10px; font-weight: 600; letter-spacing: .06em; cursor: pointer; }
#${DICT_ID} > summary:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
#${DICT_ID} dl { display: grid; grid-template-columns: minmax(112px, max-content) minmax(0, 1fr);
  gap: 4px 10px; margin: 8px 0 0; font-size: 9px; line-height: 1.5; }
#${DICT_ID} dt { color: var(--ink-soft); font-weight: 600; }
#${DICT_ID} dd { margin: 0; color: var(--muted); overflow-wrap: anywhere; }
#${COVERAGE_ID} { margin: 8px 0 0; color: var(--muted-2); font-size: 9px;
  line-height: 1.5; font-variant-numeric: tabular-nums; }
@media (max-width: 620px) {
  #${DICT_ID} dl { grid-template-columns: 1fr; gap: 2px; }
  #${DICT_ID} dt { margin-top: 5px; }
}`;

/* E12-01 : année ordinaire → année ISO 8601 étendue. Le jeu de données ne
   porte ni mois ni jour : le datetime est donc une année, pas une date civile.
   Les années avant J.-C. sont paddées sur 4 chiffres (« -0044 »). */
function isoYear(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const integer = Math.trunc(number);
  return integer < 0
    ? `-${String(Math.abs(integer)).padStart(4, '0')}`
    : String(integer);
}

function makeTime(ctx, visible, iso, field) {
  const time = ctx.el('time', '', visible);
  time.setAttribute('datetime', iso);
  time.dataset.semField = field;
  return time;
}

function addId(existing, id) {
  const values = String(existing || '').split(/\s+/).filter(Boolean);
  if (!values.includes(id)) values.push(id);
  return values.join(' ');
}

function slug(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'x';
}

function label(map, token) {
  return map[token] || token || 'non renseigné';
}

function sortTokens(tokens) {
  return [...new Set(tokens.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/* E12-06 : table des rangs globaux, construite depuis le pays rendu et non
   depuis la liste filtrée (qui ne montre qu'une ère, ou un sous-ensemble). */
function eventIndex(country) {
  const map = new Map();
  (country?.events || []).forEach((event, position) => {
    map.set(event.id, { ordinal: position + 1, eraId: event.eraId, importance: event.importance });
  });
  return map;
}

/* E12-01 / E12-02 : habiller le texte visible existant, sans le remplacer.
   Le texte français reste strictement identique ; seul le machine-readable
   change. Aucune annotation n'est ajoutée deux fois sur le même nœud. */
function stampEventYears(ctx, events, years, byId) {
  events.forEach((li) => {
    const iso = isoYear(li.dataset.year);
    const target = li.querySelector('.event-year');
    if (!iso || !target || target.querySelector('time')) return;
    const visible = target.textContent || '';
    target.textContent = '';
    target.appendChild(makeTime(ctx, visible, iso, 'year'));
    years.done += 1;
    const meta = byId.get(li.dataset.eventId);
    if (meta) li.dataset.semYearIso = iso;
  });
}

function stampEraRanges(ctx, eras) {
  eras.forEach((button) => {
    if (button.dataset.semType === 'era') return;
    const start = isoYear(button.dataset.start);
    const end = isoYear(button.dataset.end);
    if (!start || !end) return;
    button.dataset.semType = 'era';
    button.dataset.semStart = start;
    button.dataset.semEnd = end;
    const range = button.querySelector('.atlas-chrono-era-range');
    const raw = range?.textContent || '';
    const sep = ' → ';
    const at = raw.indexOf(sep);
    if (range && !range.querySelector('time') && at >= 0) {
      const left = raw.slice(0, at);
      const right = raw.slice(at + sep.length);
      range.textContent = '';
      range.append(
        makeTime(ctx, left, start, 'start'),
        document.createTextNode(sep),
        makeTime(ctx, right, end, 'end')
      );
    }
  });
}

function stampAsideYear(ctx, aside, iso) {
  const node = aside.querySelector('.aside-year');
  if (!iso || !node || node.querySelector('time')) return;
  const raw = node.textContent || '';
  const at = raw.indexOf(' · ');
  const visible = at >= 0 ? raw.slice(0, at) : raw;
  const rest = at >= 0 ? raw.slice(at) : '';
  if (!visible) return;
  node.textContent = '';
  node.appendChild(makeTime(ctx, visible, iso, 'year'));
  if (rest) node.appendChild(document.createTextNode(rest));
}

/* E12-05 : la provenance devient une relation explicite. Le texte du point
   référence la liste de ses sources via aria-describedby ; chaque source
   porte son identifiant sémantique. Aucune URL de source n'est émise. */
function stampSources(ctx, item, eventId, position) {
  const list = item.querySelector('ul.point-sources');
  if (!list) return 0;
  const id = `chronology-sem-src-${slug(eventId)}-${position}`;
  if (!list.id) list.id = id;
  list.dataset.semRole = 'source-list';
  const text = [...item.children].find((node) => node.tagName === 'P');
  if (text) text.setAttribute('aria-describedby', addId(text.getAttribute('aria-describedby'), id));
  let linked = 0;
  list.querySelectorAll('li[data-source-id]').forEach((source) => {
    source.dataset.semType = 'source';
    source.dataset.semSourceId = source.dataset.sourceId;
    linked += 1;
  });
  return linked;
}

/* E12-04 : le type et la confiance restent visibles tels quels ; on ajoute
   seulement leur libellé français (title + data-*), jamais une couleur
   supplémentaire comme unique porteur d'information. */
function stampPoints(ctx, points, counts, eventId) {
  points.forEach((item, position) => {
    if (item.dataset.semType === 'point') return;
    const kind = item.dataset.kind || '';
    const confidence = item.dataset.confidence || '';
    item.dataset.semType = 'point';
    item.dataset.semId = item.dataset.pointId || '';
    item.dataset.semKind = kind;
    item.dataset.semKindLabel = label(KIND_LABELS, kind);
    item.dataset.semConfidence = confidence;
    item.dataset.semConfidenceLabel = label(CONFIDENCE_LABELS, confidence);
    item.dataset.semOrdinal = String(position + 1);

    const kindNode = item.querySelector('.point-kind');
    if (kindNode) kindNode.title = `Type : ${item.dataset.semKindLabel}`;
    const confidenceNode = item.querySelector('.confidence');
    if (confidenceNode) confidenceNode.title = `Confiance : ${item.dataset.semConfidenceLabel}`;

    counts.sources += stampSources(ctx, item, eventId, position);
  });
}

/* E12-08 : le dictionnaire est plié par défaut. Son contenu est du texte réel
   dans le DOM (aucun sr-only, aucun texte généré par une région live). */
function buildDictionary(ctx, main, points, years) {
  if (main.querySelector(`#${DICT_ID}`)) return;
  const details = ctx.el('details', 'chronology-e12-dictionary');
  details.id = DICT_ID;
  details.dataset.semType = 'dictionary';
  details.appendChild(ctx.el('summary', '', 'Dictionnaire des données — vocabulaire local'));

  const kinds = sortTokens(points.map((item) => item.dataset.semKind));
  const confidences = sortTokens(points.map((item) => item.dataset.semConfidence));
  const definitions = [
    ['Vocabulaire', `${VOCAB} — identifiant local du schéma, aucune URI distante chargée.`],
    ['Ère (era)', 'Intervalle temporel : bornes ISO dans data-sem-start / data-sem-end, texte visible dans deux <time>.'],
    ['Repère (event)', `Point de la chronologie, identifié par data-sem-id et par la clé composée data-sem-key. Rang global : data-sem-ordinal (${years.events} repère(s) affiché(s)).`],
    ['Année ISO', 'Année positive « 1789 » ; avant J.-C. « -0044 ». Ni mois ni jour : le datetime n’est pas une date civile.'],
    ['Importance', 'Rang ordinal du jeu de données (valeurs observées : 1, 2, 3) ; l’échelle n’est pas définie plus finement.'],
    ['Point (point)', 'Énoncé vérifié rattaché à un repère : data-sem-kind, data-sem-confidence, data-sem-ordinal.'],
    ['Type (kind)', `${kinds.map((token) => `${token} = ${label(KIND_LABELS, token)}`).join(' · ') || 'aucun point affiché'}.`],
    ['Confiance', `${confidences.map((token) => `${token} = ${label(CONFIDENCE_LABELS, token)}`).join(' · ') || 'aucun point affiché'}.`],
    ['Source', 'Référence citée par un point : data-sem-source-id ; la source est reliée au texte du point par aria-describedby. Aucune URL n’est rendue.'],
  ];
  const dl = ctx.el('dl', 'chronology-e12-definitions');
  definitions.forEach(([term, definition]) => {
    dl.appendChild(ctx.el('dt', '', term));
    dl.appendChild(ctx.el('dd', '', definition));
  });
  details.appendChild(dl);
  main.appendChild(details);
}

/* E12-09 : surface d'audit lisible, sans région live supplémentaire (le fil
   change à chaque frappe : une annonce supplémentaire serait du bavardage). */
function buildCoverage(ctx, main, layout, counts, years) {
  let node = main.querySelector(`#${COVERAGE_ID}`);
  if (!node) {
    node = ctx.el('p', 'chronology-e12-coverage');
    node.id = COVERAGE_ID;
    node.dataset.semRole = 'coverage';
    main.appendChild(node);
  }
  const coverage = [
    `${counts.typedEvents}/${years.events} repères typés`,
    `${counts.typedPoints}/${years.points} points typés`,
    `${years.done}/${years.events} années datées`,
    `${counts.sources}/${years.sources} sources reliées`,
  ].join(' · ');
  node.textContent = `Sémantique appliquée : ${coverage} · vocabulaire ${VOCAB}.`;
  layout.dataset.semCoverageEvents = `${counts.typedEvents}/${years.events}`;
  layout.dataset.semCoveragePoints = `${counts.typedPoints}/${years.points}`;
  layout.dataset.semCoverageYears = `${years.done}/${years.events}`;
  layout.dataset.semCoverageSources = `${counts.sources}/${years.sources}`;
}

register('E012', (ctx) => {
  const { stage, layout, css, el } = ctx;
  if (!stage || !layout || typeof el !== 'function') return;
  css(CSS_ID, CSS);

  /* E12-10 : la coque reconstruit #atlas-stage à chaque rendu. Le marqueur
     rend une éventuelle seconde application sur le même DOM inoffensive. */
  if (layout.dataset.semAnnotated === VOCAB) return;

  const main = layout.querySelector('#atlas-chrono-main');
  const aside = layout.querySelector('#atlas-chrono-aside');
  if (!main) return;

  const country = DATASET.countries.find((item) => item.id === layout.dataset.countryId) || null;
  const byId = eventIndex(country);

  /* E12-03 : vocabulaire local posé sur les trois niveaux de la vue. */
  layout.dataset.semNamespace = VOCAB;
  main.dataset.semType = 'event-list-view';
  if (aside) aside.dataset.semType = 'event-detail';

  /* E12-02 : les ères, avant les repères, pour que le contexte existe même
     quand aucune ère n'est active. */
  const eras = [...layout.querySelectorAll('#atlas-chrono-eras button[data-era-id]')];
  stampEraRanges(ctx, eras);

  /* E12-01 + E12-06 : identité, clé composée et rang global des repères. */
  const events = [...layout.querySelectorAll('#atlas-chrono-events > li[data-event-id]')];
  const years = { events: events.length, points: 0, sources: 0, done: 0 };
  const counts = { typedEvents: 0, typedPoints: 0, sources: 0 };
  events.forEach((li, position) => {
    const eventId = li.dataset.eventId || '';
    const meta = byId.get(eventId);
    li.dataset.semType = 'event';
    li.dataset.semId = eventId;
    li.dataset.semEraRef = li.dataset.eraId || meta?.eraId || '';
    li.dataset.semOrdinal = String(meta ? meta.ordinal : position + 1);
    li.dataset.semImportance = li.dataset.importance || String(meta?.importance ?? '');
    li.dataset.semKey = [country?.id, li.dataset.semEraRef, eventId].filter(Boolean).join('/');
    if (li.dataset.tags) li.dataset.semTags = li.dataset.tags;
    const card = li.querySelector('button.event-card');
    if (card) {
      card.dataset.semType = 'event-control';
      card.dataset.semRef = eventId;
    }
    counts.typedEvents += 1;
  });
  stampEventYears(ctx, events, years, byId);

  /* E12-01 (suite) : l'année de la fiche est la même que celle de la carte
     active ; on la lit dans le DOM plutôt que dans le store, pour rester
     autonome et ne dépendre d'aucun état partagé. */
  const activeCard = layout.querySelector('#atlas-chrono-events button.event-card[aria-current="true"]');
  const activeLi = activeCard?.closest('li[data-event-id]') || null;
  if (aside && activeLi) stampAsideYear(ctx, aside, isoYear(activeLi.dataset.year));

  /* E12-04 + E12-05 : points et provenance. */
  const points = aside ? [...aside.querySelectorAll('li.point[data-point-id]')] : [];
  years.points = points.length;
  years.sources = aside ? aside.querySelectorAll('ul.point-sources li[data-source-id]').length : 0;
  stampPoints(ctx, points, counts, activeLi?.dataset.eventId || '');
  counts.typedPoints = points.filter((item) => item.dataset.semType === 'point').length;

  /* E12-07 : contexte de la photographie courante, dérivé des états ARIA
     déjà posés par chronology.js (aucune écriture dans le store). */
  const activeEra = layout.querySelector('#atlas-chrono-eras button[aria-current="true"]');
  layout.dataset.semScope = 'chronology';
  layout.dataset.semCountryId = country?.id || layout.dataset.countryId || '';
  layout.dataset.semEraId = activeEra?.dataset.eraId || '';
  layout.dataset.semEventId = activeLi?.dataset.eventId || '';
  layout.dataset.semKey = [country?.id, layout.dataset.semEraId, layout.dataset.semEventId]
    .filter(Boolean).join('/');

  buildDictionary(ctx, main, points, years);
  buildCoverage(ctx, main, layout, counts, years);

  layout.dataset.semAnnotated = VOCAB;
});
