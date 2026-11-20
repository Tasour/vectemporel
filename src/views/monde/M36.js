import { register } from './registry.js';

/* Lentille M36 — Provenance des sources (domaine D : données & sémantique).
 *
 * Fichier seul, zéro réseau, zéro aléa, zéro console, aucun lien externe.
 * Toute la provenance affichée est dérivée des objets pays reçus dans ctx
 * (ctx.countries = DATASET.countries, ctx.selected = pays courant) : champs
 * `sources`, `claims`, `points`, `events[].points`, `omissions` et `audit`.
 * Les URL/DOI présents dans `sources` ne sont jamais rendus : seules des
 * mentions locales (identifiant, type, année, auteur, titre) sont affichées,
 * conformément à meta.externalLinks = false (dataset.js:9).
 *
 * Chantiers M36-01 à M36-10 : voir UNIFIED_AUDIT/MONDE/views/M36.md.
 */

const CSS_ID = 'monde-m36';
const PANEL_ID = 'monde-m36-provenance';
const NAME_ID = 'monde-m36-name';
const STATUS_ID = 'monde-m36-status';
const LIST_ID = 'monde-m36-list';
const MAX_LIST = 6;

/* Libellés français des valeurs énumérées du dataset (presentation only). */
const REL_LABEL = {
  high: 'élevée', medium: 'moyenne', low: 'faible',
};
const IND_LABEL = {
  independent: 'indépendante', primary: 'primaire',
  same_institution: 'même institution',
};
const TYPE_LABEL = {
  academic_book: 'ouvrage académique', institutional: 'institutionnelle',
  peer_reviewed: 'évaluée par les pairs', reference_work: 'ouvrage de référence',
  primary: 'source primaire', encyclopedia: 'encyclopédie',
};

/* État module : survit aux re-renders de la coque (shell.js). */
let latest = null;
let hostRef = null;
let nodes = null;
let registered = false;
let hoverCountry = null;

const CSS = `
  #${PANEL_ID}{
    position:absolute;right:16px;bottom:16px;z-index:5;
    max-width:min(320px,42vw);padding:9px 11px;pointer-events:none;
    border:1px solid var(--line);border-radius:8px;
    background:rgba(8,11,16,.9);color:var(--muted);
    font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums;
  }
  #${PANEL_ID} .m36-kicker{
    display:block;margin:0 0 3px;color:var(--gold);
    font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .m36-name{
    display:block;margin:0;color:var(--ink);
    font-family:var(--serif);font-size:15px;font-weight:600;line-height:1.2;
  }
  #${STATUS_ID}{margin:5px 0 0;color:var(--ink-soft);white-space:normal}
  #${LIST_ID}{
    margin:5px 0 0;padding-left:16px;
    max-height:118px;overflow:hidden;color:var(--muted);
  }
  #${LIST_ID} li{margin:0 0 2px}
  @media (max-width:700px){
    #${PANEL_ID}{left:8px;right:8px;bottom:78px;max-width:none;font-size:10px}
  }
  @media (prefers-reduced-motion:reduce){
    #${PANEL_ID}{box-shadow:none}
  }
`;

function list(value) {
  return Array.isArray(value) ? value : [];
}

function label(map, value) {
  if (value === undefined || value === null || value === '') return 'non renseigné';
  return map[value] || value;
}

function make(ctx, tag, className, text) {
  let node;
  if (ctx && typeof ctx.el === 'function') node = ctx.el(tag, className, text);
  else {
    node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
  }
  return node;
}

/* M36-01/02/03/04/06/07 : une seule passe de calcul, sans allocation en boucle
 * et sans jamais lire url/doi (aucun lien externe). */
function computeStats(country) {
  const sources = list(country && country.sources);
  const claims = list(country && country.claims);
  const omissions = list(country && country.omissions);
  const countryPoints = list(country && country.points);
  const events = list(country && country.events);

  const cited = new Set();
  for (const claim of claims) {
    for (const id of list(claim && claim.sources)) cited.add(id);
  }
  for (const point of countryPoints) {
    for (const id of list(point && point.sources)) cited.add(id);
  }
  for (const event of events) {
    for (const point of list(event && event.points)) {
      for (const id of list(point && point.sources)) cited.add(id);
    }
  }

  const rel = Object.create(null);
  const indep = Object.create(null);
  for (const source of sources) {
    if (!source) continue;
    const r = label(REL_LABEL, source.reliability);
    const i = label(IND_LABEL, source.independence);
    rel[r] = (rel[r] || 0) + 1;
    indep[i] = (indep[i] || 0) + 1;
  }

  const orphan = sources.filter((source) => source && source.id && !cited.has(source.id));

  let epTotal = 0;
  let epCited = 0;
  for (const event of events) {
    for (const point of list(event && event.points)) {
      epTotal += 1;
      if (list(point && point.sources).length > 0) epCited += 1;
    }
  }

  const cc = Object.create(null);
  for (const claim of claims) {
    const c = label({}, claim && claim.confidence);
    cc[c] = (cc[c] || 0) + 1;
  }

  const audit = country && country.audit && typeof country.audit === 'object'
    ? country.audit : {};
  const signoff = audit.signoff && typeof audit.signoff === 'object'
    ? audit.signoff : {};
  const signed = !!signoff.date && list(signoff.signed_by).length > 0;

  return { sources, claims, omissions, cited, orphan, rel, indep,
    epTotal, epCited, cc, audit, signoff, signed };
}

function pairs(map) {
  const keys = Object.keys(map).sort();
  if (keys.length === 0) return 'non renseigné';
  return keys.map((key) => `${key} ${map[key]}`).join(' · ');
}

/* M36-02/03/05/06/09 : toutes les phrases sont dérivées du pays courant.
 * Le verdict d'audit n'est jamais présenté comme validé (verdict: pending). */
function statusText(stats, country) {
  if (!country) {
    return 'Aucun pays actif. Survolez le globe ou choisissez un pays dans la liste pour lire sa provenance.';
  }
  const unsourced = stats.epTotal - stats.epCited;
  const verdict = stats.audit.verdict || 'non renseigné';
  const signature = stats.signed ? 'signé' : 'non signé';
  return [
    `Sources enregistrées : ${stats.sources.length} · fiabilité : ${pairs(stats.rel)}.`,
    `Indépendance : ${pairs(stats.indep)}.`,
    `Repères appuyés : ${stats.epCited}/${stats.epTotal} · sans source : ${unsourced}.`,
    `Claims sourcés : ${stats.claims.length} · confiance : ${pairs(stats.cc)}.`,
    `Citations distinctes : ${stats.cited.size} · sources non citées : ${stats.orphan.length}.`,
    `Dettes documentaires : ${stats.omissions.length} omission(s).`,
    `Audit : ${verdict} · ${signature}.`,
  ].join(' ');
}

/* M36-01/04 : mentions locales uniquement — pas de <a>, jamais d'URL/DOI.
 * La liste est bornée pour rester lisible ; le reste est compté, non tronqué
 * silencieusement. */
function renderSources(stats) {
  const node = nodes && nodes.list;
  if (!node) return;
  node.replaceChildren();
  const shown = stats.sources.slice(0, MAX_LIST);
  for (const source of shown) {
    if (!source) continue;
    const line = [
      source.id || 'id non renseigné',
      label(TYPE_LABEL, source.type),
      source.year || 'année non renseignée',
      source.authors || 'auteur non renseigné',
      source.title || 'titre non renseigné',
    ].join(' · ');
    node.appendChild(make(null, 'li', '', line));
  }
  const rest = stats.sources.length - shown.length;
  if (rest > 0) {
    node.appendChild(make(null, 'li', '', `+ ${rest} autre(s) source(s) — mentions locales.`));
  }
  if (stats.sources.length === 0) {
    node.appendChild(make(null, 'li', '', 'Aucune source enregistrée pour ce pays.'));
  }
}

/* M36-08 : miroir d'état auditable sur le host, sans console. */
function mirror(stats, country) {
  const host = hostRef;
  if (!host) return;
  host.dataset.m36Country = (country && country.code) || '';
  host.dataset.m36SourceCount = String(stats.sources.length);
  host.dataset.m36Cited = String(stats.cited.size);
  host.dataset.m36Orphan = String(stats.orphan.length);
  host.dataset.m36Omissions = String(stats.omissions.length);
  host.dataset.m36Verdict = String(stats.audit.verdict || 'non renseigné');
}

function activeCountry(ctx) {
  if (hoverCountry) return hoverCountry;
  return (ctx && ctx.selected) || null;
}

function update() {
  const ctx = latest;
  const country = activeCountry(ctx);
  const stats = computeStats(country);
  mirror(stats, country);
  if (!nodes) return;
  nodes.name.textContent = country
    ? `${country.name || 'pays sans nom'}${country.code ? ' · ' + country.code : ''}`
    : 'Aucun pays actif';
  nodes.status.textContent = statusText(stats, country);
  renderSources(stats);
}

function ensureDom(ctx) {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    nodes = {
      panel: existing,
      name: document.getElementById(NAME_ID),
      status: document.getElementById(STATUS_ID),
      list: document.getElementById(LIST_ID),
    };
    return;
  }
  if (!ctx || !ctx.scene) return;
  const panel = make(ctx, 'div', 'm36-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Provenance des sources du pays affiché');

  const kicker = make(ctx, 'p', 'm36-kicker', 'Provenance des sources');
  const name = make(ctx, 'p', 'm36-name', 'Aucun pays actif');
  name.id = NAME_ID;
  const status = make(ctx, 'p', 'm36-status', '');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const list = make(ctx, 'ul', 'm36-list');
  list.id = LIST_ID;

  panel.append(kicker, name, status, list);
  ctx.scene.appendChild(panel);
  nodes = { panel, name, status, list };
}

register('M36', (ctx) => {
  latest = ctx || null;
  if (!ctx || typeof ctx.css !== 'function') return;
  ctx.css(CSS_ID, CSS);
  if (ctx.host && ctx.host.isConnected) hostRef = ctx.host;
  ensureDom(ctx);

  /* M36-09/10 : un seul jeu de callbacks dans le registre (les tableaux
   * vivent hors du rendu). Ils relisent `latest` pour rester frais. */
  if (!registered) {
    registered = true;
    if (typeof ctx.onHover === 'function') {
      ctx.onHover((payload) => {
        hoverCountry = (payload && payload.country) || null;
        update();
      });
    }
    if (typeof ctx.onLeave === 'function') {
      ctx.onLeave(() => {
        hoverCountry = null;
        update();
      });
    }
    if (typeof ctx.onReady === 'function') {
      ctx.onReady((payload) => {
        const selected = payload && payload.selected;
        if (selected && typeof selected === 'object') update();
      });
    }
  }

  /* M36-10 : état lisible dès le premier rendu, même sans moteur WebGL. */
  update();
});
