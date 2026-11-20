import { register } from './registry.js';
import { currentCountry, currentEvent } from '../../domain/store.js';

/* Lentille E33 — Provenance des sources du repère (vague CHRONOLOGIE).
 *
 * La vue chronologie affiche déjà les sources des points sous forme de
 * `SRC-… — titre` (chronology.js:ATLAS-CHRONO-05), mais le registre riche du
 * pays (type, auteurs, année, éditeur, DOI, fiabilité, indépendance) reste
 * invisible et les citations ne sont pas agrégées. E33 ajoute un panneau
 * « Provenance des sources » dans l'aside du repère courant, dérivé de
 * l'état réel du store (store.js:399-412) : aucune donnée historique n'est
 * inventée, aucun lien externe n'est créé (url/doi en texte seul), aucune
 * écriture console, aucune source d'aléa. Les dix chantiers sont décrits dans
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E33.md.
 *
 * Seul ce fichier est possédé ; E033.js se contente de l'importer pour que
 * l'agrégateur index.js continue de charger la lentille.
 */

const PANEL_ID = 'chronology-e33-panel';
const HEAD_TITLE_ID = 'chronology-e33-title';
const TOGGLE_ID = 'chronology-e33-toggle';
const SUMMARY_ID = 'chronology-e33-summary';
const LIST_ID = 'chronology-e33-list';
const STATUS_ID = 'chronology-e33-status';
const SRC_PREFIX = 'chronology-e33-src-';

/* État de présentation stable d'un rendu à l'autre : la coque reconstruit le
 * DOM (#atlas-stage) mais pas ce module. Le panneau, lui, est recréé à chaque
 * rendu ; les gardes ci-dessous empêchent doublons et doubles écouteurs. */
let expanded = true;

const CSS = `
.chronology-e33-panel{box-sizing:border-box;max-width:100%;margin:16px 0 0;
  padding:10px 12px;border:1px solid rgba(230,185,111,.38);border-radius:8px;
  background:rgba(0,0,0,.24);font-size:12px;line-height:1.45}
.chronology-e33-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 6px}
.chronology-e33-title{margin:0;flex:1 1 auto;font-family:var(--serif);font-size:14px;
  font-weight:500;color:var(--gold-bright,#e6b96f)}
.chronology-e33-toggle{min-height:36px;min-width:36px;padding:6px 12px;
  border:1px solid var(--line,rgba(255,255,255,.2));border-radius:7px;
  background:transparent;color:var(--gold-bright,#e6b96f);font:inherit;font-size:11px;
  cursor:pointer}
.chronology-e33-toggle:hover{border-color:var(--gold,#e6b96f)}
.chronology-e33-toggle:focus-visible{outline:3px solid var(--gold-bright,#e6b96f);
  outline-offset:2px}
.chronology-e33-summary{margin:0;color:var(--muted,#9aa3b2);font-size:11px}
.chronology-e33-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}
.chronology-e33-src{border-left:2px solid rgba(230,185,111,.45);padding-left:8px}
.chronology-e33-src-head{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline}
.chronology-e33-src-title{font-weight:600;font-size:11px;color:var(--ink,#e8e9ee)}
.chronology-e33-id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;color:var(--gold,#e6b96f)}
.chronology-e33-count{font-size:10px;color:var(--muted,#9aa3b2)}
.chronology-e33-badges{margin-top:3px}
.chronology-e33-badge{display:inline-block;margin:0 6px 3px 0;padding:1px 6px;
  border:1px solid var(--line,rgba(255,255,255,.2));border-radius:999px;
  font-size:9px;color:var(--muted,#9aa3b2)}
.chronology-e33-detail{margin:3px 0 0;font-size:10px;
  color:var(--muted-2,rgba(255,255,255,.55));overflow-wrap:anywhere}
.chronology-e33-panel[data-expanded="0"] .chronology-e33-detail{display:none}
.chronology-e33-empty{margin:0;color:var(--muted,#9aa3b2);font-size:11px}
.chronology-e33-status{margin:6px 0 0;min-height:1em;font-size:10px;
  color:var(--muted,#9aa3b2)}
@media (max-width:620px){.chronology-e33-panel{padding:8px}
  .chronology-e33-toggle{width:100%}}
@media (prefers-reduced-motion:reduce){.chronology-e33-toggle{transition:none}}
`;

function byId(id) {
  return document.getElementById(id);
}

function makeEl(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* E33-05 : agrégation déterministe. Une citation = (point, source id).
   Les positions des points sont celles de event.points (1-based), jamais
   l'identifiant d'un point, qui se répète entre repères. */
function collectSources(country, event) {
  const byIdMap = new Map();
  if (!event || !Array.isArray(event.points)) return [];
  event.points.forEach((point, index) => {
    const ids = Array.isArray(point.sources) ? point.sources : [];
    ids.forEach((rawId) => {
      const key = String(rawId);
      if (!byIdMap.has(key)) {
        byIdMap.set(key, { id: key, meta: null, count: 0, positions: [] });
      }
      const record = byIdMap.get(key);
      record.count += 1;
      record.positions.push(index + 1);
    });
  });
  if (country && Array.isArray(country.sources)) {
    byIdMap.forEach((record) => {
      record.meta = country.sources.find((source) => source && source.id === record.id) || null;
    });
  }
  return [...byIdMap.values()];
}

/* E33-02 / E33-06 : l'identifiant est résolu vers le registre réel du pays.
   Un id absent reste affiché tel quel, sans titre ni champ fabriqué. */
function sourceTitle(record) {
  return record.meta && record.meta.title
    ? record.meta.title
    : `${record.id} — référence non cataloguée dans le registre du pays`;
}

function detailText(record) {
  const meta = record.meta;
  if (!meta) return 'Référence non cataloguée dans le registre du pays : seul l’identifiant est connu.';
  const parts = [];
  if (meta.type) parts.push(`Type : ${meta.type}`);
  if (meta.authors) parts.push(`Auteurs : ${meta.authors}`);
  if (meta.year) parts.push(`Année : ${meta.year}`);
  if (meta.publisher) parts.push(`Éditeur : ${meta.publisher}`);
  /* E33-03 : DOI en texte brut, jamais un href ni une requête réseau. */
  if (meta.doi) parts.push(`DOI : ${meta.doi}`);
  return parts.join(' · ') || 'Référence cataloguée sans métadonnée détaillée.';
}

/* E33-04 : fiabilité et indépendance sont des mots, pas une couleur seule. */
function badges(record) {
  const meta = record.meta;
  if (!meta) return [];
  const result = [];
  if (meta.reliability) result.push(`Fiabilité : ${meta.reliability}`);
  if (meta.independence) result.push(`Indépendance : ${meta.independence}`);
  return result;
}

function buildPanel(ctx) {
  const existing = byId(PANEL_ID);
  if (existing && existing.isConnected) return existing;

  const panel = makeEl(ctx, 'section', 'chronology-e33-panel');
  panel.id = PANEL_ID;
  panel.dataset.expanded = expanded ? '1' : '0';
  panel.setAttribute('aria-label', 'Provenance des sources du repère');

  const head = makeEl(ctx, 'div', 'chronology-e33-head');
  const title = makeEl(ctx, 'h2', 'chronology-e33-title', 'Provenance des sources');
  title.id = HEAD_TITLE_ID;
  head.appendChild(title);
  const toggle = makeEl(ctx, 'button', 'chronology-e33-toggle',
    expanded ? 'Masquer le détail' : 'Afficher le détail');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggle.setAttribute('aria-controls', LIST_ID);
  head.appendChild(toggle);
  panel.appendChild(head);

  const summary = makeEl(ctx, 'p', 'chronology-e33-summary');
  summary.id = SUMMARY_ID;
  panel.appendChild(summary);

  const list = makeEl(ctx, 'ul', 'chronology-e33-list');
  list.id = LIST_ID;
  list.setAttribute('aria-labelledby', HEAD_TITLE_ID);
  panel.appendChild(list);

  /* E33-09 : une seule région live locale, dédiée à la bascule, pour ne pas
     doubler les régions de la coque (#nav-c2a-live, shell.js:73). */
  const status = makeEl(ctx, 'p', 'chronology-e33-status');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);
  return panel;
}

/* E33-07 : un seul geste attaché au bouton frais, état textuel et aria. */
function bindToggle(ctx) {
  const toggle = byId(TOGGLE_ID);
  if (!toggle || toggle.dataset.e33Bound === '1') return;
  toggle.dataset.e33Bound = '1';
  toggle.addEventListener('click', () => {
    expanded = !expanded;
    const panel = byId(PANEL_ID);
    if (panel) panel.dataset.expanded = expanded ? '1' : '0';
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.textContent = expanded ? 'Masquer le détail' : 'Afficher le détail';
    const status = byId(STATUS_ID);
    if (status) status.textContent = expanded
      ? 'Détail des sources affiché.'
      : 'Détail des sources masqué.';
  });
}

function renderPanel(ctx, country, event) {
  const panel = byId(PANEL_ID);
  const summary = byId(SUMMARY_ID);
  const list = byId(LIST_ID);
  if (!panel || !summary || !list) return;

  panel.dataset.expanded = expanded ? '1' : '0';
  bindToggle(ctx);
  const toggle = byId(TOGGLE_ID);
  if (toggle) {
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.textContent = expanded ? 'Masquer le détail' : 'Afficher le détail';
  }

  const records = collectSources(country, event);
  const citations = records.reduce((total, record) => total + record.count, 0);
  const catalogued = records.filter((record) => record.meta).length;
  if (!event) {
    summary.textContent = 'Aucun repère sélectionné : la provenance des sources n’est pas disponible.';
  } else {
    summary.textContent = `${records.length} source(s) distincte(s), ${citations} citation(s) sur `
      + `${event.points.length} point(s) du repère « ${event.title} ». `
      + `${catalogued} référence(s) cataloguée(s) dans le registre du pays.`;
  }

  list.replaceChildren();
  if (!records.length) {
    list.appendChild(makeEl(ctx, 'li', 'chronology-e33-empty',
      'Aucune source renseignée pour ce repère.'));
    return;
  }
  records.forEach((record) => {
    const item = makeEl(ctx, 'li', 'chronology-e33-src');
    item.id = `${SRC_PREFIX}${record.id}`;
    item.dataset.sourceId = record.id;
    if (record.meta && record.meta.type) item.dataset.sourceType = record.meta.type;
    if (record.meta && record.meta.reliability) item.dataset.reliability = record.meta.reliability;
    if (record.meta && record.meta.independence) item.dataset.independence = record.meta.independence;

    const head = makeEl(ctx, 'div', 'chronology-e33-src-head');
    head.append(
      makeEl(ctx, 'span', 'chronology-e33-src-title', sourceTitle(record)),
      makeEl(ctx, 'span', 'chronology-e33-id', record.id),
      makeEl(ctx, 'span', 'chronology-e33-count',
        `Cité par ${record.count} point(s) · positions ${record.positions.join(', ')}`)
    );
    item.appendChild(head);

    const badgeRow = makeEl(ctx, 'div', 'chronology-e33-badges');
    badges(record).forEach((text) => badgeRow.appendChild(
      makeEl(ctx, 'span', 'chronology-e33-badge', text)
    ));
    if (badgeRow.childElementCount) item.appendChild(badgeRow);

    item.appendChild(makeEl(ctx, 'p', 'chronology-e33-detail', detailText(record)));
    list.appendChild(item);
  });
}

register('E33', (ctx) => {
  if (!ctx || !ctx.stage) return;
  ctx.css('chronology-e33', CSS);

  const country = currentCountry();
  const event = currentEvent();
  const panel = buildPanel(ctx);

  /* E33-08 : l'aside est reconstruit à chaque rendu ; on y réaccroche le
     panneau frais, avec repli sur le layout si l'aside est absent. */
  const aside = byId('atlas-chrono-aside');
  const host = aside || ctx.layout || ctx.stage;
  if (host && panel.parentElement !== host) host.appendChild(panel);

  renderPanel(ctx, country, event);
});
