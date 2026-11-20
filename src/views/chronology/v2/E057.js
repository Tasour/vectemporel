import { register } from './registry.js';

/* Lentille E057 — Passe V2, domaine F (Sémantique & données).
 * Thème : « silences de la frise traités comme données » (themes.json:63).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E057.md — chantiers E057-01 à E057-10.
 * Fichier possédé : src/views/chronology/v2/E057.js uniquement. Lectures seules :
 * src/views/chronology.js, src/views/chronology/v2/registry.js, themes.json.
 * Aucun fichier partagé n'est modifié.
 *
 * Le « silence » désigne ici toute absence observable dans la frise rendue :
 * un intervalle sans repère, une ère sans carte, un repère sans thème ni image,
 * un point sans source. La lentille ne invente aucune donnée : elle dérive
 * chaque nombre des attributs dataset et du texte réellement présents dans le
 * DOM (chronology.js:283-305, 376-413, 467-505). Un vide est une absence de
 * documentation, jamais la preuve qu'il ne s'est rien passé (E057-09).
 *
 * Invariants :
 * - un seul register('E057', …), un seul ctx.css('chronology-v2-e057', …) ;
 * - IDs tous préfixés chronology-v2-e057-, gardés par ensureNode (idempotence) ;
 * - aucune journalisation, aucun réseau, aucun aléa, aucun HTML brut, aucun
 *   timer, aucune animation, aucun écouteur d'événement ;
 * - CSS en flux normal, non modal, aucun tabindex ajouté, aucune région live.
 */

const CSS_ID = 'chronology-v2-e057';
const PANEL_ID = 'chronology-v2-e057-panel';
const TITLE_ID = 'chronology-v2-e057-title';
const GAPS_ID = 'chronology-v2-e057-gaps';
const ERA_GAPS_ID = 'chronology-v2-e057-era-gaps';
const EDGE_ID = 'chronology-v2-e057-edge';
const LONGEST_ID = 'chronology-v2-e057-longest';
const DENSITY_ID = 'chronology-v2-e057-density';
const UNTAGGED_ID = 'chronology-v2-e057-untagged';
const NOIMAGE_ID = 'chronology-v2-e057-noimage';
const UNSOURCED_ID = 'chronology-v2-e057-unsourced';
const CHARTER_ID = 'chronology-v2-e057-charter';
const METRIC_ID = 'chronology-v2-e057-metric';
const MAIN_ID = 'atlas-chrono-main';

/* E057-06, -07, -09, -10 : une seule feuille, injectée une fois par ctx.css.
   Le registre est un bloc en flux normal en fin de colonne : jamais de modale,
   jamais de superposition, jamais de point de tabulation supplémentaire. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .c2e057-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .c2e057-lede { margin: 0 0 9px; color: var(--muted); }
  #${PANEL_ID} .c2e057-block { margin: 0 0 9px; }
  #${PANEL_ID} .c2e057-label {
    margin: 0 0 3px; color: var(--gold);
    font-size: 9px; font-weight: 600; letter-spacing: .04em;
  }
  #${PANEL_ID} .c2e057-body { margin: 0; color: var(--ink-soft); }
  #${PANEL_ID} .c2e057-list { margin: 0; padding-left: 16px; }
  #${PANEL_ID} .c2e057-list li { margin: 0 0 2px; }
  #${PANEL_ID} .c2e057-none { color: var(--muted-2); }
  #${PANEL_ID} .c2e057-record { color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .c2e057-charter { margin: 0; padding: 7px 9px; border-left: 2px solid var(--line-strong); color: var(--muted); }
  #${PANEL_ID} .c2e057-metric { margin: 6px 0 0; color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${PANEL_ID} .c2e057-list { padding-left: 13px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .c2e057-title, #${PANEL_ID} .c2e057-label,
    #${PANEL_ID} .c2e057-record { color: CanvasText; }
  }
`;

let renderCount = 0;
let refs = {
  panel: null, gaps: null, eraGaps: null, edge: null, longest: null,
  density: null, untagged: null, noimage: null, unsourced: null, metric: null,
  reduced: false,
};

/* E057-10 : garde d'existence pour toute ID préfixée chronology-v2-e057-.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la
   coque reconstruisant #app, un nœud du rendu précédent est détaché et n'est
   donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* Formattage d'année fidèle à chronology.js:27-29 — aucune date codée en dur
   dans la lentille, seulement les valeurs lues dans data-year / data-start. */
function fmtYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function asInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/* Lecture en lecture seule de la frise déjà rendue. Tout provient du DOM. */
function collect() {
  const bands = Array.from(document.querySelectorAll('#atlas-chrono-eras .era-band')).map((band) => ({
    id: band.dataset.eraId || '',
    start: asInt(band.dataset.start, 0),
    end: asInt(band.dataset.end, 0),
    name: (band.querySelector('span')?.textContent || '').trim(),
    current: band.getAttribute('aria-current') === 'true' || band.classList.contains('is-active'),
  }));
  const events = Array.from(document.querySelectorAll('#atlas-chrono-events li[data-event-id]')).map((li) => {
    const card = li.querySelector('.event-card');
    return {
      id: li.dataset.eventId || '',
      year: asInt(li.dataset.year, 0),
      eraId: li.dataset.eraId || '',
      tags: (li.dataset.tags || '').trim(),
      importance: asInt(li.dataset.importance, 0),
      illustrated: Boolean(card && card.querySelector('img')),
      title: (card?.querySelector('strong')?.textContent || '').trim(),
    };
  });
  const points = Array.from(document.querySelectorAll('#atlas-chrono-aside .point')).map((point) => ({
    id: point.dataset.pointId || '',
    sourced: Boolean(point.querySelector('.point-sources li')),
  }));
  return { bands, events, points, currentBand: bands.find((band) => band.current) || null };
}

/* E057-01 : lacunes entre repères consécutifs d'une même ère. */
function innerGaps(events) {
  const byEra = new Map();
  events.forEach((event) => {
    if (!byEra.has(event.eraId)) byEra.set(event.eraId, []);
    byEra.get(event.eraId).push(event);
  });
  const result = [];
  byEra.forEach((list, eraId) => {
    const sorted = list.slice().sort((a, b) => a.year - b.year);
    for (let i = 1; i < sorted.length; i += 1) {
      const span = sorted[i].year - sorted[i - 1].year;
      if (span > 0) result.push({ from: sorted[i - 1].year, to: sorted[i].year, span, eraId, kind: 'repères' });
    }
  });
  return result;
}

/* E057-02 : périodes non couvertes entre la fin d'une ère et le début de la suivante. */
function eraGaps(bands) {
  const sorted = bands.slice().sort((a, b) => a.start - b.start);
  const result = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const span = sorted[i].start - sorted[i - 1].end;
    if (span > 0) result.push({ from: sorted[i - 1].end, to: sorted[i].start, span, kind: 'ères' });
  }
  return result;
}

/* E057-03 : silences aux deux bornes de l'ère courante. */
function edgeSilences(band, events) {
  if (!band) return [];
  const scoped = events.filter((event) => event.eraId === band.id);
  if (!scoped.length) return [{ from: band.start, to: band.end, span: band.end - band.start, side: 'ère entière' }];
  const years = scoped.map((event) => event.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const result = [];
  if (first > band.start) result.push({ from: band.start, to: first, span: first - band.start, side: 'avant le premier repère' });
  if (band.end > last) result.push({ from: last, to: band.end, span: band.end - last, side: 'après le dernier repère' });
  return result;
}

function listOf(make, className, lines) {
  const list = make('ul', className);
  lines.forEach((text) => list.appendChild(make('li', '', text)));
  return list;
}

function setBody(make, node, children) {
  if (!node) return;
  node.replaceChildren(...children);
}

/* E057-01 à E057-10 : rafraîchissement complet, sans écriture redondante
   (write() et replaceChildren ne touchent au DOM que si le contenu change). */
function refresh() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;
  const data = collect();
  const gaps = innerGaps(data.events);
  const betweenEras = eraGaps(data.bands);
  const edges = edgeSilences(data.currentBand, data.events);
  const all = gaps.concat(betweenEras, edges).filter((gap) => gap.span > 0);

  const eraName = data.currentBand ? `« ${data.currentBand.name} »` : 'courante';
  const eraNames = new Map(data.bands.map((band) => [band.id, band.name]));

  /* E057-01 */
  setBody(r.make, r.gaps, gaps.length
    ? [listOf(r.make, 'c2e057-list', gaps.map((gap) => {
        const name = eraNames.get(gap.eraId) || 'ère non identifiée';
        return `Ère « ${name} » : de ${fmtYear(gap.from)} à ${fmtYear(gap.to)} — ${gap.span} ans sans repère.`;
      }))]
    : [r.make('p', 'c2e057-none', 'Aucune lacune interne : les repères visibles se succèdent sans vide daté.')]);

  /* E057-02 */
  setBody(r.make, r.eraGaps, betweenEras.length
    ? [listOf(r.make, 'c2e057-list', betweenEras.map((gap) => `De la fin d'une ère (${fmtYear(gap.from)}) au début de la suivante (${fmtYear(gap.to)}) : ${gap.span} ans non couverts.`))]
    : [r.make('p', 'c2e057-none', 'Les ères se joignent sans période non couverte.')]);

  /* E057-03 */
  setBody(r.make, r.edge, edges.length
    ? [listOf(r.make, 'c2e057-list', edges.map((gap) => `${eraName} — ${gap.side} : ${gap.span} ans (${fmtYear(gap.from)} → ${fmtYear(gap.to)}).`))]
    : [r.make('p', 'c2e057-none', `L'ère courante est couverte jusqu'à ses bornes : aucun silence en tête ni en queue.`)]);

  /* E057-04 — comparaison chiffrée à une référence (moyenne des silences). */
  if (all.length) {
    const longest = all.reduce((best, gap) => (gap.span > best.span ? gap : best), all[0]);
    const total = all.reduce((sum, gap) => sum + gap.span, 0);
    const average = Math.round(total / all.length);
    const ratio = average > 0 ? (longest.span / average).toFixed(1) : '—';
    const record = r.make('p', 'c2e057-record', `Plus long silence : ${longest.span} ans (${fmtYear(longest.from)} → ${fmtYear(longest.to)}).`);
    const compare = r.make('p', '', `Référence : moyenne des ${all.length} silences mesurés = ${average} ans, soit ${ratio}× ce record.`);
    setBody(r.make, r.longest, [record, compare]);
  } else {
    setBody(r.make, r.longest, [r.make('p', 'c2e057-none', 'Aucun silence daté à comparer : la frise ne présente aucun vide mesurable.')]);
  }

  /* E057-05 — densité : le temps vide est converti en repères par siècle. */
  if (data.currentBand) {
    const span = data.currentBand.end - data.currentBand.start;
    const count = data.events.filter((event) => event.eraId === data.currentBand.id).length;
    if (span > 0) {
      const perCentury = ((count / span) * 100).toFixed(2);
      const oneEvery = count > 0 ? Math.round(span / count) : null;
      const text = `${eraName} : ${count} repère(s) sur ${span} ans, soit ${perCentury} repère(s) par siècle`
        + (oneEvery ? ` — un repère tous les ${oneEvery} ans en moyenne.` : ' — aucun repère visible dans cette amplitude.');
      setBody(r.make, r.density, [r.make('p', '', text)]);
    } else {
      setBody(r.make, r.density, [r.make('p', 'c2e057-none', `Amplitude de l'ère nulle ou invalide : densité non calculable.`)]);
    }
  } else {
    setBody(r.make, r.density, [r.make('p', 'c2e057-none', 'Aucune ère courante identifiable : densité non calculable.')]);
  }

  /* E057-06 — repères sans thème déclaré. */
  const untagged = data.events.filter((event) => !event.tags);
  setBody(r.make, r.untagged, untagged.length
    ? [r.make('p', '', `${untagged.length} repère(s) sans thème sur ${data.events.length} :`),
       listOf(r.make, 'c2e057-list', untagged.map((event) => event.title || fmtYear(event.year)))]
    : [r.make('p', 'c2e057-none', `Tous les repères visibles (${data.events.length}) portent au moins un thème.`)]);

  /* E057-07 — repères sans illustration. */
  const plain = data.events.filter((event) => !event.illustrated);
  setBody(r.make, r.noimage, plain.length
    ? [r.make('p', '', `${plain.length} repère(s) sans illustration sur ${data.events.length} :`),
       listOf(r.make, 'c2e057-list', plain.map((event) => event.title || fmtYear(event.year)))]
    : [r.make('p', 'c2e057-none', `Tous les repères visibles (${data.events.length}) sont illustrés.`)]);

  /* E057-08 — couverture de provenance du repère affiché (mesure du silence). */
  const sourced = data.points.filter((point) => point.sourced).length;
  if (data.points.length) {
    const percent = Math.round((sourced / data.points.length) * 100);
    setBody(r.make, r.unsourced, [r.make('p', '',
      `Repère affiché : ${sourced} point(s) sur ${data.points.length} portent au moins une source (${percent} % de couverture) ; ${data.points.length - sourced} sans source.`)]);
  } else {
    setBody(r.make, r.unsourced, [r.make('p', 'c2e057-none', 'Aucun point affiché : couverture de provenance non mesurable.')]);
  }

  /* E057-10 — état du greffon, visible et non annoncé. */
  write(r.metric, `Rendus : ${renderCount} · silences catalogués : ${all.length} · mouvement réduit : ${r.reduced ? 'oui' : 'non'}.`);
  r.panel.dataset.e057Renders = String(renderCount);
  r.panel.dataset.e057Silences = String(all.length);
  r.panel.dataset.e057Reduced = r.reduced ? '1' : '0';
}

register('E057', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'c2e057-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'c2e057-title', panel);
  write(title, 'Registre des silences de la frise');
  const lede = make('p', 'c2e057-lede',
    'Ce registre mesure les vides réellement visibles dans la frise : aucun chiffre n\'est inventé, tout est dérivé des repères et des ères affichés.');

  /* Le panneau est reconstruit à chaque rendu (replaceChildren) pour éviter
     tout doublon de corps, tout en réutilisant le nœud racine via ensureNode. */
  const gaps = make('div', 'c2e057-body');
  gaps.id = GAPS_ID;
  const eraGaps = make('div', 'c2e057-body');
  eraGaps.id = ERA_GAPS_ID;
  const edge = make('div', 'c2e057-body');
  edge.id = EDGE_ID;
  const longest = make('div', 'c2e057-body');
  longest.id = LONGEST_ID;
  const density = make('div', 'c2e057-body');
  density.id = DENSITY_ID;
  const untagged = make('div', 'c2e057-body');
  untagged.id = UNTAGGED_ID;
  const noimage = make('div', 'c2e057-body');
  noimage.id = NOIMAGE_ID;
  const unsourced = make('div', 'c2e057-body');
  unsourced.id = UNSOURCED_ID;
  const charter = make('div', 'c2e057-body');
  charter.id = CHARTER_ID;
  const metric = make('p', 'c2e057-metric');
  metric.id = METRIC_ID;

  const blocks = [
    ['E057-01 · Lacunes entre repères', gaps],
    ['E057-02 · Périodes non couvertes entre ères', eraGaps],
    ['E057-03 · Silences aux bornes de l\'ère', edge],
    ['E057-04 · Plus long silence (référence)', longest],
    ['E057-05 · Densité de repères', density],
    ['E057-06 · Repères sans thème', untagged],
    ['E057-07 · Repères sans illustration', noimage],
    ['E057-08 · Couverture de provenance', unsourced],
    ['E057-09 · Charte d\'interprétation', charter],
  ];
  const children = [title, lede];
  blocks.forEach(([label, body]) => {
    const block = make('div', 'c2e057-block');
    block.append(make('h3', 'c2e057-label', label), body);
    children.push(block);
  });
  children.push(metric);
  panel.replaceChildren(...children);

  /* E057-09 : un vide est une absence de documentation, jamais un fait négatif. */
  charter.replaceChildren(make('blockquote', 'c2e057-charter',
    'Un vide entre deux repères, une ère sans carte ou un point sans source est une absence de documentation — jamais la preuve qu\'il ne s\'est rien passé. La frise ne masque pas ces silences : elle les nomme et les mesure.'));

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    make, panel, gaps, eraGaps, edge, longest, density, untagged, noimage,
    unsourced, metric, reduced,
  };
  refresh();
});
