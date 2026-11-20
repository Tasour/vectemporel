import { register } from './registry.js';

/* Lentille E069 — sélection multiple de repères et comparaison côte à côte.
 *
 * Dix chantiers (E069-01 à E069-10) appliqués après le rendu de
 * chronology.js, qui appelle runEnhancements({ viewId, stage, layout }) en fin
 * de fonction (chronology.js:539). Aucune ligne de la vue, du store ou du
 * dataset n'est modifiée : la lentille lit le DOM réel et n'invente aucune
 * donnée (chronology.js:441 interdit toute relation causale fabriquée).
 *
 * Contrat respecté : un seul enregistrement E069 auprès du registre, un seul appel à
 * ctx.css('chronology-e069', …), des identifiants tous préfixés « e069- » avec
 * gardes d'existence (re-render safe), français partout, aucune journalisation,
 * aucun appel réseau, aucun aléa, aucune boucle d'animation image par image ni
 * minuteur. Le préfixe « e069- » évite le motif « -e\d\d » masqué par défaut
 * par les diagnostics de la coque.
 */

const CSS_ID = 'chronology-e069';
const PANEL_ID = 'e069-compare';
const TITLE_ID = 'e069-compare-title';
const SUMMARY_ID = 'e069-summary';
const COLUMNS_ID = 'e069-compare-columns';
const CLEAR_ID = 'e069-clear';
const MAX_SELECTED = 4;

const CSS = `
.e069-panel{margin:16px 0 0;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
.e069-title{margin:0 0 6px;color:var(--gold-bright);font-family:var(--serif);font-size:14px;font-weight:500}
.e069-summary{min-height:16px;margin:0 0 10px;color:var(--muted);font-size:10px;line-height:1.5}
.e069-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;max-height:min(70vh,520px);overflow:auto;contain:paint;padding:2px}
.e069-column{min-width:0;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)}
.e069-column.is-hidden{opacity:.7;border-style:dashed}
.e069-col-title{margin:0 0 8px;color:var(--ink);font-family:var(--serif);font-size:12px;font-weight:500}
.e069-facts{margin:0 0 8px}
.e069-facts div{display:flex;flex-direction:column;gap:1px;padding:4px 0;border-bottom:1px solid var(--line)}
.e069-facts dt{color:var(--muted-2);font-size:8px;letter-spacing:.06em;text-transform:uppercase}
.e069-facts dd{margin:0;color:var(--ink-soft);font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums}
.e069-points{margin:0;padding-left:14px}
.e069-point{margin:0 0 6px;color:var(--ink-soft);font-size:10px;line-height:1.45}
.e069-point p{margin:0 0 2px}
.e069-meta,.e069-sources,.e069-note{margin:0;color:var(--muted-2);font-size:9px;line-height:1.4}
.e069-toggle,.e069-remove,.e069-open,.e069-clear{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:9px;cursor:pointer}
.e069-toggle{flex:0 0 auto;white-space:nowrap}
.event-list.atlas-chrono-events > li[data-event-id] .event-card{flex:1 1 auto;width:auto;min-width:0}
.e069-toggle[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12)}
.e069-remove,.e069-open{margin-top:6px}
.e069-clear{display:block;margin:10px 0 0 auto}
.e069-panel :focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (max-width:1000px){.e069-columns{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:620px){.e069-panel{padding:9px}.e069-columns{grid-template-columns:1fr;max-height:none;overflow:visible;contain:none}}
.e069-panel[data-reduced="1"] *{animation:none!important;transition:none!important}`;

let api = null;
/* État de sélection, indépendant du store partagé (chronology.js:6) : il
   survit aux reconstructions du DOM et aux changements de filtre local. */
const selected = new Map();
const boundStages = new WeakSet();
let countryId = null;
let currentStage = null;
let currentLayout = null;
let pendingFocus = null;
let limitNotice = false;

function prefersReduced() {
  return typeof api?.reducedMotion === 'function' ? api.reducedMotion() : false;
}

function clean(node) {
  return node ? (node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

/* Recherche d'identifiant sans sélecteur interpolé : les identifiants des
   repères viennent du dataset et ne sont jamais interprétés comme du CSS. */
function byId(parent, id) {
  if (!parent || !id) return null;
  const nodes = parent.querySelectorAll('[id]');
  for (let i = 0; i < nodes.length; i += 1) if (nodes[i].id === id) return nodes[i];
  return null;
}

function ensureNode(parent, id, tag, className) {
  let node = byId(parent, id);
  if (node) {
    node.className = className;
    return node;
  }
  const stray = document.getElementById(id);
  if (stray && stray.parentNode) stray.parentNode.removeChild(stray);
  node = api.el(tag, className);
  node.id = id;
  parent.appendChild(node);
  return node;
}

function listItems(stage) {
  return stage.querySelectorAll('li[data-event-id]');
}

function findItem(stage, id) {
  const items = listItems(stage);
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].dataset.eventId === id) return items[i];
  }
  return null;
}

function eraNameFromDom(eraId) {
  if (!eraId) return '';
  const bands = document.querySelectorAll('.era-band[data-era-id]');
  for (let i = 0; i < bands.length; i += 1) {
    if (bands[i].dataset.eraId === eraId) return clean(bands[i].querySelector('span'));
  }
  return '';
}

/* Les points et leurs sources ne sont dans le DOM que pour le repère courant
   (chronology.js:416-504). Pour les autres, on conserve l'instantané pris au
   moment de la sélection plutôt que d'imaginer un contenu (E069-05/-07). */
function capturePoints(item) {
  const card = item.querySelector('.event-card');
  if (!card || card.getAttribute('aria-current') !== 'true') return null;
  const aside = document.getElementById('atlas-chrono-aside');
  if (!aside) return null;
  const points = [];
  aside.querySelectorAll('#atlas-chrono-points > li.point').forEach((point) => {
    const sources = [];
    point.querySelectorAll('.point-sources li[data-source-id]').forEach((source) => {
      sources.push(clean(source) || source.dataset.sourceId || '');
    });
    points.push({
      text: clean(point.querySelector('p')),
      kind: point.dataset.kind || '',
      confidence: point.dataset.confidence || '',
      sources,
    });
  });
  return points;
}

function capture(item) {
  const id = item.dataset.eventId || '';
  const card = item.querySelector('.event-card');
  const title = clean(card && card.querySelector('strong')) || 'Repère sans titre';
  const rawYear = item.dataset.year;
  const year = rawYear !== undefined && rawYear !== '' && Number.isFinite(Number(rawYear))
    ? Number(rawYear)
    : null;
  const points = capturePoints(item);
  const previous = selected.get(id);
  const keepCache = !points && previous && previous.points;
  return {
    id,
    title,
    year,
    yearLabel: clean(item.querySelector('.event-year'))
      || (year !== null ? String(year) : 'Année non renseignée'),
    subtitle: clean(item.querySelector('.event-subtitle')),
    eraId: item.dataset.eraId || '',
    eraName: eraNameFromDom(item.dataset.eraId || ''),
    tags: (item.dataset.tags || '').split(/\s+/).filter(Boolean),
    importance: item.dataset.importance || '',
    points: keepCache ? previous.points : points,
    detailAvailable: Boolean(points || keepCache),
    cached: Boolean(keepCache || (previous && previous.cached && !points)),
    hidden: false,
  };
}

/* Écart calculé depuis data-year (chronology.js:380) et le même vocabulaire
   que formatYear() (chronology.js:26-28) : aucune estimation (E069-08). */
function formatDelta(delta) {
  if (delta === 0) return 'référence (premier repère)';
  const absolute = delta < 0 ? -delta : delta;
  const unit = absolute > 1 ? 'ans' : 'an';
  return `${delta > 0 ? '+' : '−'}${absolute} ${unit} par rapport au premier repère`;
}

function addFact(list, label, value) {
  const row = api.el('div');
  row.appendChild(api.el('dt', '', label));
  row.appendChild(api.el('dd', '', value || 'non renseigné'));
  list.appendChild(row);
}

function buildColumn(snapshot, index, referenceYear) {
  const column = api.el('article', 'e069-column');
  column.dataset.eventId = snapshot.id;
  if (snapshot.hidden) column.classList.add('is-hidden');

  const heading = api.el('h3', 'e069-col-title', snapshot.title);
  heading.id = `e069-col-title-${snapshot.id}`;
  heading.tabIndex = -1;
  column.appendChild(heading);

  const facts = api.el('dl', 'e069-facts');
  addFact(facts, 'Année', snapshot.yearLabel);
  addFact(facts, 'Ère', snapshot.eraName || snapshot.eraId);
  addFact(facts, 'Sous-titre', snapshot.subtitle);
  addFact(facts, 'Thèmes', snapshot.tags.length ? snapshot.tags.join(' · ') : '');
  addFact(facts, 'Importance', snapshot.importance);
  let deltaLabel = 'année non renseignée';
  if (index === 0) deltaLabel = 'référence (premier repère)';
  else if (snapshot.year !== null && referenceYear !== null) {
    deltaLabel = formatDelta(snapshot.year - referenceYear);
  }
  column.dataset.e069Delta = deltaLabel;
  addFact(facts, 'Écart temporel', deltaLabel);
  column.appendChild(facts);

  if (snapshot.detailAvailable && snapshot.points) {
    if (!snapshot.points.length) {
      column.appendChild(api.el('p', 'e069-note', 'Aucun point documenté pour ce repère.'));
    } else {
      const points = api.el('ul', 'e069-points');
      snapshot.points.forEach((point) => {
        const line = api.el('li', 'e069-point');
        line.appendChild(api.el('p', '', point.text || 'Texte non renseigné'));
        const meta = [
          point.kind ? `Nature : ${point.kind}` : '',
          point.confidence ? `Confiance : ${point.confidence}` : '',
        ].filter(Boolean).join(' · ');
        line.appendChild(api.el('p', 'e069-meta', meta || 'Nature et confiance non renseignées'));
        if (point.sources.length) {
          line.appendChild(api.el('p', 'e069-sources', `Sources : ${point.sources.join(' · ')}`));
        }
        points.appendChild(line);
      });
      column.appendChild(points);
    }
  } else {
    column.appendChild(api.el(
      'p',
      'e069-note',
      snapshot.hidden
        ? 'Repère masqué par le filtre : sa fiche détaillée est absente du DOM. Réinitialisez le filtre pour la charger.'
        : 'Instantané pris à la sélection : ouvrez ce repère pour charger ses points, sa confiance et ses sources.'
    ));
    if (!snapshot.hidden) {
      const open = api.el('button', 'e069-open', 'Ouvrir la fiche');
      open.id = `e069-open-${snapshot.id}`;
      open.type = 'button';
      open.dataset.eventId = snapshot.id;
      open.setAttribute('aria-controls', 'atlas-chrono-aside');
      column.appendChild(open);
    }
  }
  if (snapshot.cached) {
    column.appendChild(api.el('p', 'e069-note', 'Données mises en cache lors de la sélection.'));
  }

  const remove = api.el('button', 'e069-remove', 'Retirer de la comparaison');
  remove.id = `e069-remove-${snapshot.id}`;
  remove.type = 'button';
  remove.dataset.eventId = snapshot.id;
  remove.setAttribute('aria-label', `Retirer « ${snapshot.title} » de la comparaison`);
  column.appendChild(remove);
  return column;
}

function summaryText(count) {
  if (limitNotice) {
    return `Quatre repères au maximum : retirez-en un avant d'en ajouter un autre (${count} sélectionné(s)).`;
  }
  if (!count) return 'Aucun repère sélectionné. Utilisez « Comparer » sur une carte pour épingler un repère.';
  if (count === 1) return '1 repère sélectionné. Sélectionnez au moins deux repères pour les comparer.';
  return `${count} repères sélectionnés sur ${MAX_SELECTED} au maximum. La comparaison est prête.`;
}

/* E069-03 : réapplication complète et idempotente à chaque rendu. */
function apply(stage, layout) {
  if (!stage || !layout || typeof stage.querySelectorAll !== 'function') return;
  currentStage = stage;
  currentLayout = layout;

  const nextCountry = layout.dataset.countryId || '';
  if (countryId !== null && nextCountry !== countryId) {
    selected.clear();
    limitNotice = false;
  }
  countryId = nextCountry;

  /* Rafraîchit les instantanés encore présents à l'écran, en particulier les
     points du repère courant dès que sa fiche devient visible. */
  listItems(stage).forEach((item) => {
    const id = item.dataset.eventId;
    if (id && selected.has(id)) selected.set(id, capture(item));
  });
  selected.forEach((snapshot, id) => {
    const item = findItem(stage, id);
    snapshot.hidden = !item;
  });

  /* E069-01/-04 : une bascule par carte, frère de .event-card pour ne pas
     déclencher selectEvent() (chronology.js:406-409). */
  listItems(stage).forEach((item) => {
    const id = item.dataset.eventId;
    if (!id || item.querySelector('.e069-toggle')) return;
    const card = item.querySelector('.event-card');
    const title = clean(card && card.querySelector('strong')) || 'ce repère';
    const toggle = api.el('button', 'e069-toggle', '+ Comparer');
    toggle.id = `e069-toggle-${id}`;
    toggle.type = 'button';
    toggle.dataset.eventId = id;
    toggle.dataset.title = title;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', `Ajouter « ${title} » à la comparaison`);
    toggle.setAttribute('aria-controls', COLUMNS_ID);
    item.appendChild(toggle);
  });

  listItems(stage).forEach((item) => {
    const id = item.dataset.eventId;
    const toggle = item.querySelector('.e069-toggle');
    if (!toggle || !id) return;
    const on = selected.has(id);
    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    toggle.textContent = on ? '✓ Comparer' : '+ Comparer';
    toggle.setAttribute(
      'aria-label',
      `${on ? 'Retirer' : 'Ajouter'} « ${toggle.dataset.title || 'ce repère'} » ${on ? 'de' : 'à'} la comparaison`
    );
    if (on) item.setAttribute('data-e069-selected', 'true');
    else item.removeAttribute('data-e069-selected');
  });

  /* E069-02/-06/-07/-08/-09 : un seul panneau, une seule région live. */
  const panel = ensureNode(layout, PANEL_ID, 'section', 'e069-panel');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.dataset.reduced = prefersReduced() ? '1' : '0';
  const heading = ensureNode(panel, TITLE_ID, 'h2', 'e069-title');
  heading.textContent = 'Comparaison côte à côte';
  const summary = ensureNode(panel, SUMMARY_ID, 'p', 'e069-summary');
  summary.setAttribute('role', 'status');
  summary.setAttribute('aria-live', 'polite');
  summary.setAttribute('aria-atomic', 'true');
  const nextSummary = summaryText(selected.size);
  if (summary.textContent !== nextSummary) summary.textContent = nextSummary;
  const columns = ensureNode(panel, COLUMNS_ID, 'div', 'e069-columns');
  while (columns.firstChild) columns.removeChild(columns.firstChild);

  const snapshots = Array.from(selected.values());
  const referenceYear = snapshots.length ? snapshots[0].year : null;
  snapshots.forEach((snapshot, index) => {
    columns.appendChild(buildColumn(snapshot, index, referenceYear));
  });

  let clear = byId(panel, CLEAR_ID);
  if (selected.size) {
    if (!clear) {
      clear = api.el('button', 'e069-clear', 'Tout effacer');
      clear.id = CLEAR_ID;
      clear.type = 'button';
      clear.setAttribute('aria-controls', COLUMNS_ID);
      panel.appendChild(clear);
    }
  } else if (clear) {
    clear.parentNode.removeChild(clear);
  }

  if (pendingFocus) {
    const target = pendingFocus.id
      ? byId(stage, `e069-toggle-${pendingFocus.id}`)
      : byId(panel, TITLE_ID);
    pendingFocus = null;
    if (target && typeof target.focus === 'function') target.focus();
  }
}

function toggleSelection(id, item) {
  if (!id || !item) return;
  if (selected.has(id)) {
    selected.delete(id);
    limitNotice = false;
    pendingFocus = { id };
  } else {
    if (selected.size >= MAX_SELECTED) {
      limitNotice = true;
      pendingFocus = { id };
      apply(currentStage, currentLayout);
      return;
    }
    selected.set(id, capture(item));
    limitNotice = false;
  }
  apply(currentStage, currentLayout);
}

/* Un seul écouteur délégué par stage : la coque reconstruisant le stage à
   chaque rendu, le WeakSet évite un double abonnement sur un stage réutilisé. */
function bind(stage) {
  if (boundStages.has(stage)) return;
  boundStages.add(stage);
  stage.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const toggle = target.closest('.e069-toggle');
    if (toggle && stage.contains(toggle)) {
      event.preventDefault();
      event.stopPropagation();
      const item = toggle.closest('li[data-event-id]');
      toggleSelection(toggle.dataset.eventId, item);
      return;
    }

    const remove = target.closest('.e069-remove');
    if (remove && stage.contains(remove)) {
      event.preventDefault();
      selected.delete(remove.dataset.eventId);
      limitNotice = false;
      pendingFocus = { id: remove.dataset.eventId };
      apply(currentStage, currentLayout);
      return;
    }

    if (target.closest(`#${CLEAR_ID}`)) {
      event.preventDefault();
      selected.clear();
      limitNotice = false;
      pendingFocus = { id: null };
      apply(currentStage, currentLayout);
      return;
    }

    const open = target.closest('.e069-open');
    if (open && stage.contains(open)) {
      event.preventDefault();
      const cards = document.querySelectorAll('.event-card[data-event-id]');
      for (let i = 0; i < cards.length; i += 1) {
        if (cards[i].dataset.eventId === open.dataset.eventId) {
          cards[i].click();
          return;
        }
      }
    }
  });
}

register('E069', (ctx) => {
  api = ctx;
  if (!ctx || typeof ctx.css !== 'function') return;
  ctx.css(CSS_ID, CSS);
  const stage = ctx.stage;
  const layout = ctx.layout;
  if (!stage || !layout) return;
  bind(stage);
  apply(stage, layout);
});
