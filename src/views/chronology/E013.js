import { register } from './registry.js';
import { DATASET } from '../../data/dataset.js';

/* Lentille E13 — Provenance des sources (vue Chronologie).
 * Dix chantiers décrits dans UNIFIED_AUDIT/CHRONOLOGIE/views/E13.md.
 *
 * La vue de base (chronology.js:489-500) affiche déjà, pour chaque point, la
 * liste « SRC-… — titre » des sources déclarées. E13 ne réécrit pas ce balisage
 * et n'ajoute aucun lien externe : il rend lisibles, indexables et annonçables
 * les champs de provenance qui restent enfouis dans DATASET (type, éditeur,
 * DOI, fiabilité, indépendance, notes de vérification) et il signale les points
 * sans source.
 *
 * Toutes les valeurs sont dérivées du DOM rendu et de DATASET : aucune donnée
 * inventée, aucun réseau, aucun aléa, aucune console, et fournit un registre
 * adressable du repère courant. */

const CSS_ID = 'chronology-e13';
const LIVE_ID = 'chronology-e13-live';
const REGISTER_ID = 'chronology-e13-register';
const SUMMARY_ID = 'chronology-e13-summary';

const TYPE_LABELS = {
  academic_book: 'ouvrage académique',
  peer_reviewed: 'article évalué par les pairs',
  institutional: 'source institutionnelle',
  institution: 'source institutionnelle',
  primary: 'source primaire',
  reference_work: 'ouvrage de référence',
  encyclopedia: 'encyclopédie',
  collective: 'ouvrage collectif',
  individual: 'ouvrage individuel',
};
const RELIABILITY_LABELS = {
  high: 'fiabilité élevée',
  medium: 'fiabilité moyenne',
  low: 'fiabilité faible',
};
const INDEPENDENCE_LABELS = {
  independent: 'source indépendante',
  primary: 'source primaire',
  same_institution: 'même institution',
  dependent: 'source dépendante',
};

/* État module : survit aux re-renders de la coque (shell.js reconstruit #app).
 * Un seul écouteur document est installé ; les callbacks lisent ce pointeur
 * courant plutôt qu'une closure éphémère, afin de ne jamais toucher un nœud
 * déconnecté. */
const current = { stage: null, byId: new Map(), ids: [] };
let liveNode = null;
let focusBound = false;
let lastMessage = '';

function byIdNode(id, root) {
  return (root || document).getElementById ? (root || document).getElementById(id) : null;
}

/* Région live dédiée, créée une seule fois hors de #app (qui est reconstruit à
 * chaque rendu) pour rester annonçable. Canal distinct de #nav-c2a-live. */
function ensureLive() {
  if (liveNode && liveNode.isConnected) return liveNode;
  liveNode = byIdNode(LIVE_ID);
  if (!liveNode) {
    liveNode = document.createElement('p');
    liveNode.id = LIVE_ID;
    liveNode.className = 'e13-sr';
    liveNode.setAttribute('role', 'status');
    liveNode.setAttribute('aria-live', 'polite');
    liveNode.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveNode);
  }
  return liveNode;
}

function announce(node, message) {
  if (!node || !node.isConnected || !message) return;
  if (message === lastMessage) return;
  lastMessage = message;
  node.textContent = message;
}

function label(map, value) {
  if (value === undefined || value === null || value === '') return 'non renseigné';
  return map[value] || String(value);
}

function countryFor(layout) {
  const id = layout && layout.dataset ? layout.dataset.countryId : null;
  const list = DATASET && Array.isArray(DATASET.countries) ? DATASET.countries : [];
  return list.find((item) => item && item.id === id) || null;
}

/* Identifiants de sources réellement cités par les points du repère rendu,
 * déduits du DOM (texte sémantique produit par chronology.js:489-500). */
function collectSourceIds(stage) {
  const nodes = stage.querySelectorAll('.point-sources li[data-source-id]');
  const ids = [];
  const seen = new Set();
  nodes.forEach((node) => {
    const id = node.getAttribute('data-source-id');
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
      node.setAttribute('data-e13-source', id);
    }
  });
  return ids;
}

function typeCounts(ids, byId) {
  const counts = new Map();
  ids.forEach((id) => {
    const source = byId.get(id);
    const type = source && source.type ? source.type : 'non renseigné';
    counts.set(type, (counts.get(type) || 0) + 1);
  });
  return counts;
}

function addRow(el, body, labelText, valueText) {
  const row = el('tr', 'e13-row');
  const th = el('th', 'e13-th', labelText);
  th.scope = 'row';
  row.append(th, el('td', 'e13-td', valueText || 'non renseigné'));
  body.appendChild(row);
}

/* E13-02/-03/-05/-08 : un <details> par source distincte, avec ancre unique
 * adressable, étiquettes textuelles de type / fiabilité / indépendance et note
 * de vérification. Aucun <a href> : DOI et URL restent du texte. */
function buildSourceEntry(el, source, id) {
  const details = el('details', 'e13-source');
  details.id = `chronology-e13-src-${id}`;
  details.setAttribute('data-e13-source', id);
  const summary = el('summary', 'e13-source-summary', `${id} — ${source.title || id}`);
  summary.setAttribute('data-e13-src', id);
  details.appendChild(summary);

  const body = el('dl', 'e13-source-body');
  const fields = [
    ['Type', label(TYPE_LABELS, source.type)],
    ['Auteurs', source.authors],
    ['Année', source.year],
    ['Éditeur / revue', source.publisher],
    ['Fiabilité', label(RELIABILITY_LABELS, source.reliability)],
    ['Indépendance', label(INDEPENDENCE_LABELS, source.independence)],
  ];
  fields.forEach(([key, value]) => {
    body.appendChild(el('dt', 'e13-dt', key));
    body.appendChild(el('dd', 'e13-dd', value || 'non renseigné'));
  });
  if (source.doi) {
    body.appendChild(el('dt', 'e13-dt', 'DOI'));
    body.appendChild(el('dd', 'e13-dd', `doi:${source.doi}`));
  }
  if (source.notes) {
    body.appendChild(el('dt', 'e13-dt', 'Note de vérification'));
    body.appendChild(el('dd', 'e13-dd', source.notes));
  }
  details.appendChild(body);
  return details;
}

/* E13-04 : marqueur textuel des points sans source déclarée. Le DOM de base ne
 * crée pas de <ul class="point-sources"> pour ces points : le signalement est
 * donc dérivé de la structure réelle, jamais d'une hypothèse sur les données. */
function markUnsourced(el, stage) {
  const points = stage.querySelectorAll('.atlas-chrono-points > li.point');
  let count = 0;
  points.forEach((point) => {
    if (point.querySelector('.point-sources')) return;
    if (point.querySelector('.e13-unsourced')) return;
    count += 1;
    point.appendChild(el('p', 'e13-unsourced', 'Sans source déclarée dans le registre du pays.'));
  });
  return { total: points.length, unsourced: count };
}

function buildRegister(el, live, country, ids, byId, coverage) {
  const old = byIdNode(REGISTER_ID);
  if (old && old.parentNode) old.parentNode.removeChild(old);

  const section = el('section', 'e13-register');
  section.id = REGISTER_ID;
  section.setAttribute('aria-labelledby', `${SUMMARY_ID}-title`);

  const heading = el('h3', 'e13-title', 'Registre de provenance du repère');
  heading.id = `${SUMMARY_ID}-title`;
  section.appendChild(heading);

  const sourced = Math.max(0, coverage.total - coverage.unsourced);
  const summaryText = coverage.total
    ? `Provenance du repère : ${sourced} point(s) sur ${coverage.total} documenté(s) par ${ids.length} source(s) distincte(s) ; ${coverage.unsourced} point(s) sans source déclarée.`
    : `Aucun point à documenter pour ce repère ; aucune source à afficher.`;
  const summary = el('p', 'e13-summary', summaryText);
  summary.id = SUMMARY_ID;
  section.appendChild(summary);

  /* E13-07 : récapitulatif par type, entièrement dérivé des sources citées. */
  const counts = typeCounts(ids, byId);
  if (ids.length) {
    const table = el('table', 'e13-types');
    const caption = el('caption', 'e13-sr',
      `Répartition des ${ids.length} sources distinctes du repère par type documenté.`);
    table.appendChild(caption);
    const body = el('tbody');
    counts.forEach((value, key) => {
      addRow(el, body, label(TYPE_LABELS, key), `${value} source(s)`);
    });
    table.appendChild(body);
    section.appendChild(table);
  }

  /* E13-02/-03/-05/-08 : notices détaillées, une par source distincte. */
  if (ids.length) {
    const list = el('ol', 'e13-source-list');
    list.setAttribute('aria-label', 'Notices des sources citées par ce repère');
    ids.forEach((id) => {
      const item = el('li', 'e13-source-item');
      const source = byId.get(id) || { id };
      item.appendChild(buildSourceEntry(el, source, id));
      list.appendChild(item);
    });
    section.appendChild(list);
  } else {
    section.appendChild(el('p', 'e13-empty',
      'Aucune source n’est déclarée pour les points de ce repère dans le registre du pays.'));
  }

  const aside = byIdNode('atlas-chrono-aside');
  if (aside) aside.appendChild(section);
  else if (current.stage) current.stage.appendChild(section);

  /* E13-06 : annonce du récapitulatif une seule fois par changement de repère. */
  if (country) announce(live, `${country.name}. ${summaryText}`);
  return section;
}

/* E13-09 : annonce dédiée au focus d'une notice source, dédupliquée, sans
 * toucher au routeur ni aux autres régions live de la vue. */
function onFocusIn(event) {
  const node = event && event.target;
  if (!node || typeof node.getAttribute !== 'function') return;
  const id = node.getAttribute('data-e13-src');
  if (!id) return;
  const source = current.byId.get(id);
  if (!source) return;
  const message = `${id}. ${source.title || id}. ${label(TYPE_LABELS, source.type)}, `
    + `${label(RELIABILITY_LABELS, source.reliability)}, ${label(INDEPENDENCE_LABELS, source.independence)}.`;
  announce(liveNode, message);
}

function bindFocus() {
  if (focusBound) return;
  document.addEventListener('focusin', onFocusIn);
  focusBound = true;
}

register('E13', (ctx) => {
  const { stage, layout, css, el } = ctx || {};
  if (!stage || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E13-10 : CSS isolé, injecté une seule fois, aucun url()/réseau, aucune
   * transition (donc aucun conflit avec prefers-reduced-motion). */
  css(CSS_ID, `
    #chronology-e13-register{margin:14px 0 4px;padding:8px 10px;
      border:1px solid var(--line,#334);border-radius:8px;background:rgba(255,255,255,.02)}
    #chronology-e13-register .e13-title{margin:0 0 5px;color:var(--ink-soft,#cbd5e1);
      font-family:var(--serif);font-size:12px;font-weight:450}
    #chronology-e13-register .e13-summary{margin:0 0 7px;color:var(--muted,#8aa);font-size:9px;line-height:1.5}
    #chronology-e13-register .e13-types{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:9px}
    #chronology-e13-register .e13-row{border-top:1px solid var(--line,#334)}
    #chronology-e13-register .e13-th,#chronology-e13-register .e13-td{padding:2px 4px;text-align:left;vertical-align:top}
    #chronology-e13-register .e13-th{color:var(--muted,#8aa);font-weight:400}
    #chronology-e13-register .e13-td{color:var(--ink-soft,#cbd5e1);font-variant-numeric:tabular-nums}
    #chronology-e13-register .e13-source-list{margin:0;padding-left:16px}
    #chronology-e13-register .e13-source-item{margin-bottom:5px}
    #chronology-e13-register .e13-source{border-left:2px solid var(--line,#334);padding-left:6px}
    #chronology-e13-register .e13-source-summary{cursor:pointer;color:var(--gold-bright,#f5d99a);
      font-size:9px;line-height:1.4;min-height:24px}
    #chronology-e13-register .e13-source-summary:focus-visible{outline:2px solid var(--gold-bright,#f5d99a);outline-offset:2px}
    #chronology-e13-register .e13-source-body{margin:5px 0 6px;font-size:8px;line-height:1.45}
    #chronology-e13-register .e13-dt{margin:0;color:var(--muted,#8aa)}
    #chronology-e13-register .e13-dd{margin:0 0 3px 8px;color:var(--ink-soft,#cbd5e1);
      overflow-wrap:anywhere}
    #atlas-chrono-aside .e13-unsourced{margin:4px 0 0;color:var(--muted,#8aa);
      font-size:8px;font-style:italic}
    #chronology-e13-register .e13-empty{margin:0;color:var(--muted,#8aa);font-size:9px}
    .e13-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
      overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  `);

  /* E13-10 : le pointeur module est rafraîchi à chaque rendu ; les gardes
   * isConnected empêchent toute écriture dans un DOM mort. */
  const country = countryFor(layout);
  const sources = (country && Array.isArray(country.sources)) ? country.sources : [];
  const byId = new Map();
  sources.forEach((source) => {
    if (source && source.id) byId.set(source.id, source);
  });
  const ids = collectSourceIds(stage);
  const coverage = markUnsourced(el, stage);

  current.stage = stage;
  current.byId = byId;
  current.ids = ids;

  buildRegister(el, ensureLive(), country, ids, byId, coverage);
  bindFocus();
});
