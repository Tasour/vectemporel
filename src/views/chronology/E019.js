import { register } from './registry.js';

/* Lentille E019 — Densité d'information.
   Dix chantiers (E19-01 … E19-10) appliqués à la vue chronologie sans toucher
   à chronology.js : un panneau de synthèse unique, des métriques recalculées
   depuis le DOM réel, un sommaire d'ancres internes, une bascule de
   compacité et un témoin auditable. Zéro donnée inventée, zéro réseau,
   zéro console, zéro aléa, zéro minuteur, zéro boucle rAF. */

let compact = false;
let renders = 0;
let clickBound = false;

const IDS = [
  'densite19-panel', 'densite19-title', 'densite19-compact', 'densite19-metrics',
  'densite19-era', 'densite19-sources', 'densite19-kinds-wrap', 'densite19-kinds',
  'densite19-confidence-wrap', 'densite19-confidence', 'densite19-index-wrap',
  'densite19-index', 'densite19-legend',
];

const q = (root, selector) => root.querySelector(selector);
const qa = (root, selector) => Array.from(root.querySelectorAll(selector));

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function decimal(value) {
  return (Math.round(value * 10) / 10).toString().replace('.', ',');
}

function share(part, total) {
  return total > 0 ? Math.round((part * 100) / total) : 0;
}

function countBy(nodes, keyOf) {
  const counts = new Map();
  nodes.forEach((node) => {
    const key = keyOf(node);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
}

/* Un seul nœud par ID : au rendu suivant la coque reconstruit le stage, mais
   si un appelant rejoue les greffons sur le même DOM, on réutilise le nœud
   existant et on retire tout doublon éventuel (contrat « IDs uniques »). */
function node(el, id, tag, className, parent, before) {
  const found = qa(document, `[id="${id}"]`);
  for (let i = 1; i < found.length; i += 1) found[i].remove();
  let target = found[0];
  if (!target) {
    target = el(tag, className);
    target.id = id;
    if (before && before.parentNode) before.parentNode.insertBefore(target, before);
    else parent.appendChild(target);
  }
  return target;
}

const CSS = `
.densite19-panel{margin:0 0 16px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:9px;background:rgba(230,185,111,.035)}
.densite19-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.densite19-title{margin:0;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:600;letter-spacing:.06em}
.densite19-toggle{min-height:36px;padding:5px 11px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--ink-soft);font:inherit;font-size:9px;cursor:pointer}
.densite19-toggle:hover{border-color:var(--gold)}
.densite19-toggle[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright)}
.densite19-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.densite19-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:4px 12px;margin:9px 0 6px}
.densite19-metrics > div{min-width:0}
.densite19-metrics dt{margin:0;color:var(--muted-2);font-size:8px;letter-spacing:.04em;text-transform:uppercase}
.densite19-metrics dd{margin:1px 0 0;color:var(--ink-soft);font-size:10px;font-variant-numeric:tabular-nums;line-height:1.35}
.densite19-line{margin:3px 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.densite19-panel details{margin-top:5px;border-top:1px solid var(--line);padding-top:4px}
.densite19-panel summary{min-height:24px;padding:2px 0;color:var(--gold-bright);font-size:9px;cursor:pointer}
.densite19-panel summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.densite19-list{list-style:none;margin:4px 0 0;padding:0}
.densite19-list > li{margin:2px 0;color:var(--ink-soft);font-size:9px;line-height:1.5}
.densite19-meter{display:inline-block;width:64px;height:5px;margin:0 6px 0 4px;border:1px solid var(--line);border-radius:3px;vertical-align:middle}
.densite19-meter > span{display:block;height:100%;background:var(--gold);border-radius:2px}
.densite19-link{color:var(--gold-bright);text-decoration:none}
.densite19-link:hover,.densite19-link:focus-visible{text-decoration:underline}
.densite19-legend div{margin:4px 0}
.densite19-legend dt{margin:0;color:var(--gold);font-size:9px}
.densite19-legend dd{margin:1px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
.densite19-is-compact .event-list.atlas-chrono-events > li + li{margin-top:2px}
.densite19-is-compact .event-card{padding:5px 9px}
.densite19-is-compact .event-subtitle{max-height:1.4em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.densite19-is-compact .points.atlas-chrono-points .point{padding:4px 0}
.densite19-is-compact .point-sources{gap:2px 8px}
@media (max-width:620px){.densite19-metrics{grid-template-columns:repeat(auto-fit,minmax(110px,1fr))}.densite19-panel{padding:8px 9px}}
@media (prefers-reduced-motion:reduce){.densite19-panel *{transition:none!important;animation:none!important}}`;

export function applyDensity(el, ctx) {
  const { layout } = ctx;
  if (!layout) return;

  /* E19-01 — une seule section, insérée avant la navigation d'ères, sans
     supprimer ni modifier les lignes de statut existantes de chronology.js. */
  const main = q(layout, '#atlas-chrono-main') || layout;
  const before = q(main, '#atlas-chrono-eras');
  const panel = node(el, 'densite19-panel', 'section', 'densite19-panel', main, before);
  panel.textContent = '';
  panel.setAttribute('aria-labelledby', 'densite19-title');
  const head = el('div', 'densite19-head');
  const title = node(el, 'densite19-title', 'h2', 'densite19-title', panel);
  title.textContent = "Densité d'information";
  const toggle = node(el, 'densite19-compact', 'button', 'densite19-toggle', head);
  toggle.type = 'button';
  toggle.textContent = 'Vue compacte';
  toggle.setAttribute('aria-controls', 'atlas-chrono-events');
  toggle.setAttribute('aria-pressed', String(compact));
  /* E19-08 : un seul écouteur délégué, enregistré une fois sur document.
     Il survit au remplacement du bouton par une autre lentille et au
     innerHTML de la coque ; le nœud courant est retrouvé au moment du clic. */
  if (!clickBound) {
    clickBound = true;
    document.addEventListener('click', (event) => {
      const source = event.target;
      if (!source || typeof source.closest !== 'function') return;
      const button = source.closest('#densite19-compact');
      if (!button) return;
      compact = !compact;
      document.querySelectorAll('#densite19-compact').forEach((node) => {
        node.setAttribute('aria-pressed', String(compact));
      });
      document.querySelectorAll('.chronology-layout').forEach((root) => {
        root.classList.toggle('densite19-is-compact', compact);
        root.setAttribute('data-densite19-compact', String(compact));
      });
    });
  }
  head.appendChild(title);
  head.appendChild(toggle);
  panel.appendChild(head);
  layout.classList.toggle('densite19-is-compact', compact);

  /* E19-02 — compteurs dérivés du DOM rendu, jamais du dataset ni de mémoire. */
  const eventLis = qa(layout, '#atlas-chrono-events > li[data-event-id]');
  const pointsList = q(layout, '.atlas-chrono-points');
  const points = pointsList
    ? Array.from(pointsList.children).filter((child) => child.classList.contains('point') && child.dataset.kind)
    : [];
  const sourceIds = new Set();
  let sourced = 0;
  points.forEach((point) => {
    const refs = qa(point, '.point-sources li[data-source-id]');
    refs.forEach((ref) => sourceIds.add(ref.dataset.sourceId));
    if (refs.length) sourced += 1;
  });

  const countLabel = q(layout, '.atlas-chrono-count')?.textContent || '';
  const countParts = countLabel.match(/(\d+)\s*\/\s*(\d+)/);
  const totalEvents = countParts ? Number(countParts[2]) : eventLis.length;
  const years = eventLis.map((li) => Number(li.dataset.year)).filter((year) => Number.isFinite(year));
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;

  const metrics = node(el, 'densite19-metrics', 'dl', 'densite19-metrics', panel);
  metrics.textContent = '';
  const facts = [
    ['Repères affichés', `${eventLis.length} / ${totalEvents}`],
    ['Points du repère', String(points.length)],
    ['Sources distinctes', String(sourceIds.size)],
    ['Étendue affichée', minYear === null ? '—' : `${formatYear(minYear)} → ${formatYear(maxYear)}`],
  ];
  facts.forEach(([label, value]) => {
    const row = el('div', '');
    row.appendChild(el('dt', '', label));
    row.appendChild(el('dd', '', value));
    metrics.appendChild(row);
  });

  /* E19-03 — densité temporelle de l'ère courante, recalculée depuis les
     attributs data-start / data-end posés par chronology.js:288-289. */
  const eraBand = q(layout, '.atlas-chrono-band[aria-current="true"]');
  const eraStart = eraBand ? Number(eraBand.dataset.start) : NaN;
  const eraEnd = eraBand ? Number(eraBand.dataset.end) : NaN;
  const eraId = eraBand?.dataset.eraId;
  const eraEvents = Number.isFinite(eraStart) && Number.isFinite(eraEnd)
    ? eventLis.filter((li) => li.dataset.eraId === eraId).length
    : 0;
  const span = Number.isFinite(eraStart) && Number.isFinite(eraEnd) ? eraEnd - eraStart : 0;
  const eraLine = node(el, 'densite19-era', 'p', 'densite19-line', panel);
  eraLine.textContent = span > 0
    ? `Ère courante : ${eraEvents} repère(s) sur ${span} ans, soit ${decimal((eraEvents * 100) / span)} repère(s) par siècle.`
    : 'Densité de l’ère : durée non calculable pour la sélection courante.';

  /* E19-05 — traçabilité : couverture des points par au moins une source. */
  const sourcesLine = node(el, 'densite19-sources', 'p', 'densite19-line', panel);
  sourcesLine.textContent = `Traçabilité : ${sourced}/${points.length} point(s) sourcé(s), soit ${share(sourced, points.length)} % ; ${sourceIds.size} source(s) distincte(s).`;

  /* E19-04 — répartition des natures de point : barre textuelle + valeur,
     aucune information portée par la seule couleur. */
  const kindsWrap = node(el, 'densite19-kinds-wrap', 'details', '', panel);
  const kindsSummary = el('summary', '', 'Natures des points');
  kindsWrap.appendChild(kindsSummary);
  const kinds = node(el, 'densite19-kinds', 'ul', 'densite19-list', kindsWrap);
  kinds.textContent = '';
  const kindCounts = countBy(points, (point) => point.dataset.kind);
  if (!kindCounts.length) kinds.appendChild(el('li', '', 'Aucun point documenté pour ce repère.'));
  kindCounts.forEach(([label, count]) => {
    const li = el('li', '');
    li.appendChild(document.createTextNode(`${label} — ${count} (${share(count, points.length)} %)`));
    const meter = el('span', 'densite19-meter');
    meter.setAttribute('aria-hidden', 'true');
    const fill = el('span', '');
    fill.style.width = `${share(count, points.length)}%`;
    meter.appendChild(fill);
    li.appendChild(meter);
    kinds.appendChild(li);
  });

  /* E19-06 — profil de confiance : libellés bruts des données, sans
     harmonisation ni interprétation inventée. */
  const confWrap = node(el, 'densite19-confidence-wrap', 'details', '', panel);
  confWrap.appendChild(el('summary', '', 'Niveaux de confiance'));
  const conf = node(el, 'densite19-confidence', 'ul', 'densite19-list', confWrap);
  conf.textContent = '';
  const confCounts = countBy(points, (point) => point.dataset.confidence);
  if (!confCounts.length) conf.appendChild(el('li', '', 'Aucun niveau de confiance renseigné.'));
  confCounts.forEach(([label, count]) => {
    conf.appendChild(el('li', '', `${label} — ${count} (${share(count, points.length)} %)`));
  });

  /* E19-07 — sommaire dense : ancres internes uniquement (href="#event-…"),
     repliées par défaut pour ne pas noyer le récit. */
  const indexWrap = node(el, 'densite19-index-wrap', 'details', '', panel);
  indexWrap.appendChild(el('summary', '', `Sommaire des ${eventLis.length} repère(s) affiché(s)`));
  const index = node(el, 'densite19-index', 'ol', 'densite19-list', indexWrap);
  index.textContent = '';
  eventLis.forEach((li) => {
    const item = el('li', '');
    const link = el('a', 'densite19-link');
    link.href = `#${li.id}`;
    const heading = q(li, '.event-card strong')?.textContent || li.dataset.eventId;
    link.textContent = `${formatYear(Number(li.dataset.year))} — ${heading}`;
    link.setAttribute('aria-label', `Aller au repère ${heading}, ${formatYear(Number(li.dataset.year))}`);
    item.appendChild(link);
    index.appendChild(item);
  });

  /* E19-09 — légende : chaque chiffre est défini par sa formule ou par le
     libellé déjà affiché par la vue, sans ajout de fait historique. */
  const legend = node(el, 'densite19-legend', 'details', 'densite19-legend', panel);
  legend.appendChild(el('summary', '', 'Comprendre ces chiffres'));
  const definitions = [
    ['Repère', 'Entrée datée de la chronologie du pays, affichée comme carte dans la liste.'],
    ['Point', 'Énoncé rattaché au repère courant et listé dans sa fiche.'],
    ['Repères par siècle', 'Nombre de repères de l’ère courante multiplié par 100, divisé par la durée de l’ère en années.'],
    ['Couverture des sources', 'Part des points du repère portant au moins une référence, ramenée à 100 %.'],
    ['Nature / confiance', 'Libellés présents dans les données et repris tels quels, sans interprétation.'],
    ['av. J.-C.', 'Année avant Jésus-Christ : les années négatives sont affichées en valeur absolue.'],
  ];
  definitions.forEach(([label, text]) => {
    const row = el('div', '');
    row.appendChild(el('dt', '', label));
    row.appendChild(el('dd', '', text));
    legend.appendChild(row);
  });

  /* E19-10 — témoin auditable : un état lisible par attribut, sans journal,
     sans réseau, sans aléa et sans minuteur. */
  renders += 1;
  layout.setAttribute('data-densite19-events', String(eventLis.length));
  layout.setAttribute('data-densite19-points', String(points.length));
  layout.setAttribute('data-densite19-sources', String(sourceIds.size));
  layout.setAttribute('data-densite19-index-links', String(index.children.length));
  layout.setAttribute('data-densite19-compact', String(compact));
  layout.setAttribute('data-densite19-render', String(renders));
  layout.setAttribute('data-densite19-panel', panel.isConnected ? '1' : '0');
  layout.setAttribute('data-densite19-reduced', String(Boolean(ctx.reducedMotion?.())));
  const unique = IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1);
  layout.setAttribute('data-densite19-unique', String(unique));
}

register('E019', (ctx) => {
  if (!ctx || !ctx.layout) return;
  ctx.css('chronology-e19', CSS);
  applyDensity(ctx.el, ctx);
});
