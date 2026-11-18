/* E044 — provenance des sources et lisibilité des références, point par point.
   Lentille de la vue « chronologie » (src/views/chronology.js:539). Lecture seule
   du DOM produit par la vue : aucun import du store, aucun fichier partagé
   modifié, aucun réseau, aucun Math.random, aucun console.*, aucune boucle
   requestAnimationFrame. Toutes les chaînes visibles sont en français. */
import { register } from './registry.js';

const PANEL_ID = 'e044-provenance-panel';
const TITLE_ID = 'e044-panel-title';
const REGISTER_ID = 'e044-register';
const SUMMARY_ID = 'e044-provenance-summary';
const NOTE_ID = 'e044-provenance-note';
const TOGGLE_ID = 'e044-register-toggle';
const ANNOUNCE_ID = 'e044-announce';

/* Réinitialisé à chaque application : les identifiants sont stables pendant un
   rendu, mais ne grossissent pas d'une session à l'autre. */
const usedIds = new Set();

function slug(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48) || 'x';
}

function makeId(base) {
  let id = `e044-${base}`;
  let suffix = 1;
  while (usedIds.has(id) || document.getElementById(id)) {
    suffix += 1;
    id = `e044-${base}-${suffix}`;
  }
  usedIds.add(id);
  return id;
}

function makeNode(id, tag, className, text) {
  const item = document.createElement(tag);
  if (id) item.id = id;
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

/* Réutilise un nœud déjà présent (garde d'existence) et le déplace dans le
   parent courant : la coque reconstruisant le stage, un ancien nœud peut encore
   être rattaché ailleurs au moment du déplacement. */
function place(parent, id, tag, className, text) {
  let item = document.getElementById(id);
  if (!item) item = makeNode(id, tag, className, text);
  else {
    if (className && item.className !== className) item.className = className;
    if (text !== undefined && item.textContent !== text) item.textContent = text;
  }
  if (item.parentNode !== parent) parent.appendChild(item);
  return item;
}

/* L'attribut `title` des sources est construit en chronology.js:496 par
   `[source.authors, source.year].filter(Boolean).join(' · ')`. On ne devine
   jamais un auteur ou une année absents du texte réel. */
function splitTooltip(tooltip) {
  const parts = String(tooltip || '').split('·').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { authors: parts[0], year: parts.slice(1).join(' ') };
  if (parts.length === 1) {
    return /^\d{4}$/.test(parts[0]) ? { authors: '', year: parts[0] } : { authors: parts[0], year: '' };
  }
  return { authors: '', year: '' };
}

function metaLabel(source) {
  if (source.authors && source.year) return `${source.authors} · ${source.year}`;
  if (source.authors) return `Auteurs : ${source.authors}`;
  if (source.year) return `Année : ${source.year}`;
  return '';
}

/* chronology.js:494-497 : le texte de la ligne vaut `${sourceId} — ${title}`
   quand la source est résolue, et `sourceId` seul sinon (:493). */
function readSources(pointItem) {
  const list = pointItem.querySelector('ul.point-sources');
  if (!list) return { list: null, sources: [] };
  const sources = Array.from(list.children)
    .filter((child) => child.tagName === 'LI')
    .map((line, position) => {
      const raw = String(line.textContent || '').trim();
      const dash = raw.indexOf('—');
      const meta = splitTooltip(line.getAttribute('title'));
      return {
        line,
        position,
        id: line.dataset.sourceId || '',
        title: dash >= 0 ? raw.slice(dash + 1).trim() : '',
        authors: meta.authors,
        year: meta.year,
        unresolved: dash < 0,
      };
    });
  return { list, sources };
}

function decorateSources(pointItem, pointNumber, totalPoints, sources, list) {
  const seen = new Map();
  sources.forEach((source) => {
    const count = (seen.get(source.id) || 0) + 1;
    seen.set(source.id, count);
    source.repeat = count;

    source.anchorId = makeId(`src-${pointNumber}-${slug(source.id)}`);
    if (!document.getElementById(source.anchorId)) source.line.id = source.anchorId;
    source.line.dataset.e044Unresolved = source.unresolved ? '1' : '0';
    if (count > 1) source.line.dataset.e044Repeat = String(count);

    const index = makeNode(null, 'span', 'e044-src-index', `[${source.position + 1}]`);
    source.line.insertBefore(index, source.line.firstChild);

    if (!source.unresolved) {
      const label = metaLabel(source);
      if (label) {
        const meta = makeNode(null, 'span', 'e044-src-meta', label);
        source.line.appendChild(meta);
      }
    } else {
      source.line.appendChild(makeNode(null, 'span', 'e044-unresolved', 'référence non résolue'));
    }
    if (count > 1) {
      source.line.appendChild(makeNode(null, 'span', 'e044-repeat', `citée ${count}×`));
    }
  });

  if (list) {
    list.setAttribute('aria-label', `Sources du point ${pointNumber} sur ${totalPoints}`);
    const caption = makeNode(
      makeId(`caption-${pointNumber}`),
      'p',
      'e044-source-caption',
      `Provenance — ${sources.length} référence${sources.length > 1 ? 's' : ''} déclarée${sources.length > 1 ? 's' : ''}`
    );
    pointItem.insertBefore(caption, list);

    const markers = makeNode(makeId(`markers-${pointNumber}`), 'p', 'e044-ref-markers');
    markers.appendChild(document.createTextNode('Aller à la référence : '));
    sources.forEach((source) => {
      const link = makeNode(null, 'a', 'e044-ref', `[${source.position + 1}]`);
      link.href = `#${source.line.id}`;
      const name = source.unresolved ? source.id : `${source.id} — ${source.title}`;
      link.setAttribute('aria-label', `Voir la référence ${source.position + 1} : ${name}`);
      markers.appendChild(link);
    });
    pointItem.insertBefore(markers, caption);
  }
  pointItem.dataset.e044Sources = String(sources.length);
  pointItem.dataset.e044Unresolved = String(sources.filter((source) => source.unresolved).length);
}

function ensurePointAnchor(pointItem, pointNumber) {
  if (!pointItem.id) pointItem.id = makeId(`point-${pointNumber}`);
  return pointItem.id;
}

function buildRegister(entries, registerId) {
  const list = makeNode(registerId, 'ol', 'e044-register');
  entries.forEach((entry, index) => {
    const item = makeNode(null, 'li');
    item.append(
      makeNode(null, 'span', 'e044-num', `[${index + 1}]`),
      makeNode(null, 'span', 'e044-id', entry.id || 'identifiant absent')
    );
    if (!entry.unresolved) {
      item.append(document.createTextNode(` — ${entry.title || 'titre non renseigné'}`));
    } else {
      item.appendChild(makeNode(null, 'span', 'e044-unresolved', 'référence non résolue'));
    }
    const label = metaLabel(entry);
    if (label) item.appendChild(makeNode(null, 'span', 'e044-register-meta', label));

    const links = makeNode(null, 'span', 'e044-register-points');
    links.appendChild(document.createTextNode('Cite '));
    entry.points.forEach((point, position) => {
      if (position) links.appendChild(document.createTextNode(', '));
      const link = makeNode(null, 'a', 'e044-ref', `point ${point.number}`);
      link.href = `#${point.anchor}`;
      link.setAttribute('aria-label', `Voir le point ${point.number}`);
      links.appendChild(link);
    });
    item.appendChild(links);
    list.appendChild(item);
  });
  return list;
}

function buildPanel(aside, metrics) {
  const panel = place(aside, PANEL_ID, 'section', 'e044-panel');
  place(panel, TITLE_ID, 'h3', 'e044-panel-title', 'Provenance des sources');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  place(
    panel,
    SUMMARY_ID,
    'p',
    'e044-summary',
    `${metrics.points} point${metrics.points > 1 ? 's' : ''} · ${metrics.withSources} avec source · ${metrics.withoutSources} sans source · ${metrics.distinct} référence${metrics.distinct > 1 ? 's' : ''} distincte${metrics.distinct > 1 ? 's' : ''} · ${metrics.unresolved} non résolue${metrics.unresolved > 1 ? 's' : ''}`
  );

  const toggle = place(panel, TOGGLE_ID, 'button', 'e044-toggle', 'Afficher le registre des références');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', REGISTER_ID);
  toggle.setAttribute('aria-expanded', 'false');

  let register = document.getElementById(REGISTER_ID);
  if (!register) {
    register = buildRegister(metrics.entries, REGISTER_ID);
    panel.appendChild(register);
  } else {
    if (register.parentNode !== panel) panel.appendChild(register);
  }
  register.hidden = true;
  register.setAttribute('aria-label', 'Registre des références citées par les points de ce repère');

  place(
    panel,
    NOTE_ID,
    'p',
    'e044-note',
    'Provenance relevée telle que publiée par la vue : aucune référence n’est créée, aucun lien réseau n’est ajouté. Les nombres comptent les références déclarées, pas les faits.'
  );
  place(panel, ANNOUNCE_ID, 'p', 'e044-sr-only', '');
  const announce = document.getElementById(ANNOUNCE_ID);
  announce.setAttribute('role', 'status');
  announce.setAttribute('aria-live', 'polite');
  announce.setAttribute('aria-atomic', 'true');

  if (toggle.dataset.e044Bound !== '1') {
    toggle.dataset.e044Bound = '1';
    toggle.addEventListener('click', () => {
      const open = register.hidden;
      register.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Masquer le registre des références' : 'Afficher le registre des références';
      announce.textContent = open
        ? `Registre ouvert : ${metrics.distinct} référence${metrics.distinct > 1 ? 's' : ''} distincte${metrics.distinct > 1 ? 's' : ''} pour ${metrics.points} point${metrics.points > 1 ? 's' : ''}.`
        : 'Registre des références masqué.';
    });
  }

  const actions = aside.querySelector('.aside-actions');
  if (actions && panel.nextElementSibling !== actions) aside.insertBefore(panel, actions);
}

const STYLES = `
.e044-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.chronology-aside .e044-panel{margin:18px 0 0;padding:12px;border:1px solid var(--line-strong);border-radius:10px;background:rgba(230,185,111,.04);font-size:11px;line-height:1.5}
.chronology-aside .e044-panel-title{margin:0 0 6px;color:var(--gold-bright);font-family:var(--serif);font-size:15px;font-weight:450}
.chronology-aside .e044-summary{margin:0 0 9px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.chronology-aside .e044-note{margin:8px 0 0;color:var(--muted-2);font-size:10px;line-height:1.45}
.chronology-aside .e044-toggle{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer}
.chronology-aside .e044-toggle:hover{border-color:var(--gold)}
.chronology-aside .e044-toggle:focus-visible,.chronology-aside .e044-ref:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-aside .e044-register{margin:10px 0 0;padding-left:18px}
.chronology-aside .e044-register[hidden]{display:none}
.chronology-aside .e044-register>li{margin:0 0 9px;color:var(--ink-soft);overflow-wrap:anywhere}
.chronology-aside .e044-num{margin-right:5px;color:var(--gold);font-variant-numeric:tabular-nums}
.chronology-aside .e044-id{color:var(--gold-bright)}
.chronology-aside .e044-register-meta,.chronology-aside .e044-register-points{display:block;color:var(--muted-2);font-size:10px}
.chronology-aside .e044-ref{display:inline-block;min-width:20px;min-height:24px;padding:1px 4px;border:1px solid var(--line);border-radius:5px;color:var(--gold-bright);font-size:10px;text-align:center;text-decoration:none}
.chronology-aside .e044-ref:hover{border-color:var(--gold)}
.chronology-aside .e044-ref-markers{margin:5px 0 0;color:var(--muted-2);font-size:10px;line-height:1.8}
.chronology-aside .e044-source-caption{margin:6px 0 0;color:var(--gold);font-size:10px;font-weight:600;letter-spacing:.04em}
.chronology-aside .e044-src-index{margin-right:5px;color:var(--gold);font-variant-numeric:tabular-nums}
.chronology-aside .e044-src-meta{display:block;margin-left:18px;color:var(--muted);font-size:10px}
.chronology-aside .e044-unresolved{display:inline-block;margin-left:5px;padding:1px 5px;border:1px solid var(--red);border-radius:999px;color:var(--red);font-size:9px}
.chronology-aside .e044-repeat{margin-left:5px;color:var(--muted-2);font-size:9px}
.chronology-aside .e044-no-source{margin:6px 0 0;color:var(--muted-2);font-size:10px;font-style:italic}
.chronology-aside[data-e044-reduced="0"] .e044-ref{transition:border-color .15s ease}
@media (max-width:620px){.chronology-aside .e044-panel{padding:9px}}
@media (prefers-reduced-motion:reduce){.chronology-aside .e044-ref{transition:none!important}}
`;

register('E044', (ctx) => {
  if (!ctx || ctx.viewId !== 'chronology') return;
  usedIds.clear();
  ctx.css('chronology-e044', STYLES);

  const stage = ctx.stage;
  const layout = ctx.layout || (stage && stage.querySelector('.chronology-layout'));
  if (!stage || !layout) return;
  const aside = layout.querySelector('#atlas-chrono-aside') || layout.querySelector('.chronology-aside');
  if (!aside) return;
  /* Une seconde invocation sur le même DOM (sans reconstruction par la coque)
     ne doit pas ajouter deux fois marqueurs, ancres et légendes. */
  if (aside.dataset.e044Applied === '1') return;

  aside.dataset.e044Reduced = ctx.reducedMotion() ? '1' : '0';

  const pointItems = Array.from(aside.querySelectorAll('ol.points > li.point'));
  const stalePanel = document.getElementById(PANEL_ID);
  if (!pointItems.length) {
    if (stalePanel && stalePanel.parentNode) stalePanel.parentNode.removeChild(stalePanel);
    return;
  }

  const registry = new Map();
  const metrics = {
    points: pointItems.length,
    withSources: 0,
    withoutSources: 0,
    distinct: 0,
    unresolved: 0,
    entries: [],
  };

  pointItems.forEach((pointItem, index) => {
    const pointNumber = index + 1;
    const anchor = ensurePointAnchor(pointItem, pointNumber);
    const { list, sources } = readSources(pointItem);

    if (!sources.length) {
      metrics.withoutSources += 1;
      pointItem.dataset.e044Sources = '0';
      if (!pointItem.querySelector('.e044-no-source')) {
        pointItem.appendChild(makeNode(null, 'p', 'e044-no-source', 'Aucune source déclarée pour ce point.'));
      }
      return;
    }

    metrics.withSources += 1;
    decorateSources(pointItem, pointNumber, pointItems.length, sources, list);

    sources.forEach((source) => {
      let entry = registry.get(source.id);
      if (!entry) {
        entry = { id: source.id, title: source.title, authors: source.authors, year: source.year, unresolved: source.unresolved, points: [] };
        registry.set(source.id, entry);
      }
      entry.unresolved = entry.unresolved || source.unresolved;
      entry.points.push({ number: pointNumber, anchor });
    });
  });

  metrics.distinct = registry.size;
  metrics.entries = Array.from(registry.values());
  metrics.unresolved = metrics.entries.filter((entry) => entry.unresolved).length;
  buildPanel(aside, metrics);
  aside.dataset.e044Applied = '1';
});
