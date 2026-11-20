import { register } from './registry.js';

/* Lentille E085 — compteurs et statistiques de la frise, mesures chiffrées.
   Chaque grandeur est recalculée depuis le DOM réellement rendu : aucun nombre
   historique n'est codé en dur, aucune donnée n'est inventée, aucune annonce
   n'est portée par la seule couleur. Zéro réseau, zéro aléa, zéro
   journalisation, aucune boucle d'animation propre. */

const PANEL_ID = 'e085-panel';

/* Choix unique : la référence de comparaison vit dans la lentille, jamais
   dans aria-pressed (réservé aux bascules indépendantes). */
let reference = 'moyenne';

const REFERENCES = [
  ['moyenne', 'moyenne par ère'],
  ['mediane', 'médiane par ère'],
  ['maximum', 'ère la plus dense'],
];

/* ---- Utilitaires de lecture du DOM ------------------------------------- */

function scope(root) {
  return root && typeof root.querySelector === 'function' ? root : document;
}

function one(root, selector) {
  const base = scope(root);
  return base.querySelector(selector) || document.querySelector(selector);
}

function all(root, selector) {
  const base = scope(root);
  const found = base.querySelectorAll(selector);
  return Array.from(found && found.length ? found : document.querySelectorAll(selector));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function decimal(value) {
  return Number.isFinite(value) ? value.toFixed(2).replace('.', ',') : '0';
}

function integer(value) {
  return Number.isFinite(value) ? String(value) : '0';
}

function percent(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function ordinal(value) {
  return Math.abs(value) === 1 ? 'Ier' : `${Math.abs(value)}e`;
}

function centuryLabel(year) {
  const century = Math.ceil(year / 100);
  if (century > 0) return `${ordinal(century)} siècle`;
  if (century < 0) return `${ordinal(century)} siècle av. J.-C.`;
  return 'Ier siècle av. J.-C.';
}

function tally(nodes, attribute) {
  const counts = new Map();
  nodes.forEach((node) => {
    const key = node.dataset && node.dataset[attribute];
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')
  );
}

/* ---- Collecte : tout vient des attributs posés par chronology.js -------- */

function collect(root) {
  const bands = all(root, '#atlas-chrono-eras .era-band');
  const events = all(root, '#atlas-chrono-events > li[data-event-id]')
    .filter((node) => !node.hidden);
  const points = all(root, '#atlas-chrono-aside .points > li.point');
  const referencesCited = all(root, '#atlas-chrono-aside .points [data-source-id]');

  const eras = bands.map((band) => {
    const id = (band.dataset && band.dataset.eraId) || '';
    const firstSpan = band.querySelector('span');
    const label = firstSpan ? firstSpan.textContent.trim() : '';
    return {
      id,
      name: label || 'Ère sans nom',
      count: events.filter((event) => (event.dataset.eraId || '') === id).length,
    };
  });

  const years = events
    .map((event) => finite(event.dataset.year, NaN))
    .filter((value) => Number.isFinite(value));
  const min = years.length ? Math.min(...years) : null;
  const max = years.length ? Math.max(...years) : null;

  const centuries = new Map();
  years.forEach((year) => {
    const label = centuryLabel(year);
    centuries.set(label, (centuries.get(label) || 0) + 1);
  });
  const centuryRows = Array.from(centuries.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')
  );

  const counts = eras.map((era) => era.count);
  const ordered = counts.slice().sort((a, b) => a - b);
  const median = ordered.length
    ? (ordered.length % 2
      ? ordered[(ordered.length - 1) / 2]
      : (ordered[ordered.length / 2 - 1] + ordered[ordered.length / 2]) / 2)
    : 0;
  const means = {
    moyenne: eras.length ? events.length / eras.length : 0,
    mediane: median,
    maximum: counts.length ? Math.max(...counts) : 0,
  };

  return {
    events: events.length,
    eras,
    points: points.length,
    cited: referencesCited.length,
    sourced: points.filter((point) => point.querySelector('[data-source-id]')).length,
    min,
    max,
    span: min !== null ? max - min : 0,
    centuryRows,
    importance: tally(events, 'importance'),
    referenceValue: means[reference] || 0,
  };
}

/* ---- Rendu de la statistique -------------------------------------------- */

function addRow(ctx, list, label, value) {
  const wrap = ctx.el('div', 'e085-row');
  wrap.appendChild(ctx.el('dt', '', label));
  const cell = ctx.el('dd', '');
  if (typeof value === 'string' || typeof value === 'number') cell.textContent = String(value);
  else if (value) cell.appendChild(value);
  wrap.appendChild(cell);
  list.appendChild(wrap);
  return cell;
}

function bars(ctx, rows, maximum, noun) {
  const list = ctx.el('ul', 'e085-bars');
  const scale = maximum > 0 ? maximum : 1;
  rows.slice(0, 6).forEach(([name, count]) => {
    const line = ctx.el('li', 'e085-bar');
    line.appendChild(ctx.el('span', 'e085-bar-name', name));
    const track = ctx.el('span', 'e085-bar-track');
    const fill = ctx.el('span', 'e085-bar-fill');
    fill.style.width = `${Math.round((count / scale) * 100)}%`;
    track.setAttribute('aria-hidden', 'true');
    fill.setAttribute('aria-hidden', 'true');
    track.appendChild(fill);
    line.appendChild(track);
    line.appendChild(ctx.el('span', 'e085-bar-val', integer(count)));
    list.appendChild(line);
  });
  if (rows.length > 6) {
    list.appendChild(ctx.el('li', 'e085-more', `+ ${rows.length - 6} autre(s) ${noun}(s)`));
  }
  if (!rows.length) list.appendChild(ctx.el('li', 'e085-empty', 'aucune donnée mesurée'));
  return list;
}

function inlineTally(ctx, pairs) {
  if (!pairs.length) return ctx.el('span', 'e085-empty', 'non renseignée');
  return ctx.el('span', '', pairs.map(([key, count]) => `${key} : ${count}`).join(' · '));
}

function comparison(ctx, data) {
  const line = ctx.el('span', '');
  const label = REFERENCES.find(([key]) => key === reference);
  const name = label ? label[1] : 'moyenne';
  if (!data.eras.length) {
    line.textContent = 'Aucune ère rendue : comparaison indisponible.';
    return line;
  }
  if (data.referenceValue <= 0) {
    line.textContent = `Référence : ${name} = 0 repère par ère ; aucun ratio significatif.`;
    return line;
  }
  const ranked = data.eras.slice().sort((a, b) => b.count - a.count);
  const top = ranked[0];
  const low = ranked[ranked.length - 1];
  const ratio = top.count / data.referenceValue;
  line.textContent = `Référence : ${name} = ${decimal(data.referenceValue)} repère(s) par ère. `
    + `L'ère la plus dense (${top.name}) en compte ${top.count}, soit ${decimal(ratio)}× la référence ; `
    + `la moins dense (${low.name}) en compte ${low.count}.`;
  return line;
}

function referenceGroup(ctx, onChange) {
  const fieldset = ctx.el('fieldset', 'e085-fieldset');
  const legend = ctx.el('legend', 'e085-legend', 'Référence de comparaison');
  legend.id = 'e085-ref-legend';
  fieldset.appendChild(legend);

  const group = ctx.el('div', 'e085-radios');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', legend.id);
  REFERENCES.forEach(([key, label]) => {
    const choice = ctx.el('label', 'e085-choice');
    const input = ctx.el('input', 'e085-radio');
    input.type = 'radio';
    input.name = 'e085-reference';
    input.id = `e085-ref-${key}`;
    input.value = key;
    input.checked = reference === key;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      reference = key;
      onChange();
    });
    choice.appendChild(input);
    choice.appendChild(ctx.el('span', 'e085-choice-label', label));
    group.appendChild(choice);
  });
  fieldset.appendChild(group);
  return fieldset;
}

function limitNote(ctx, data) {
  return ctx.el(
    'p',
    'e085-limit',
    `Limite falsifiable — ces mesures décrivent uniquement le DOM rendu : ${data.events} repère(s) affiché(s)`
    + ` et ${data.points} point(s) du repère courant. Elles ne couvrent ni les repères masqués par un filtre,`
    + ` ni les points des autres repères. Prédiction : masquer un repère doit faire baisser le compte d'une unité.`
    + ` Résultat attendu : ${integer(Math.max(0, data.events - 1))} repère(s). Falsification : si le chiffre reste`
    + ` à ${data.events} après masquage effectif, la mesure est fausse. Débrief : le comptage est refait à chaque`
    + ` rendu depuis les seuls nœuds visibles.`
  );
}

function paint(panel, ctx) {
  const data = collect(ctx.layout);
  const title = ctx.el('p', 'e085-title', 'Statistiques de la frise — mesures relevées sur le rendu');
  const list = ctx.el('dl', 'e085-list');

  addRow(ctx, list, 'Repères affichés', `${data.events} repère(s) dans le périmètre courant`);
  addRow(ctx, list, 'Ères rendues', `${data.eras.length} bande(s), une seule ère développée à la fois`);
  addRow(ctx, list, 'Étendue temporelle', data.min !== null
    ? `de ${formatYear(data.min)} à ${formatYear(data.max)}, soit ${integer(data.span)} années couvertes`
    : 'aucune année renseignée sur les repères affichés');
  addRow(ctx, list, 'Répartition par ère', bars(
    ctx,
    data.eras.map((era) => [era.name, era.count]),
    Math.max(1, ...data.eras.map((era) => era.count)),
    'ère'
  ));
  addRow(ctx, list, 'Densité par siècle', bars(
    ctx,
    data.centuryRows,
    Math.max(1, ...data.centuryRows.map(([, count]) => count)),
    'siècle'
  ));
  addRow(ctx, list, 'Importances déclarées', inlineTally(ctx, data.importance));
  addRow(ctx, list, 'Provenance du repère courant',
    `${data.sourced}/${data.points} point(s) sourcé(s) (${percent(data.sourced, data.points)} %), `
    + `${data.cited} référence(s) citée(s)`);
  addRow(ctx, list, 'Comparaison à la référence', comparison(ctx, data));

  panel.replaceChildren(
    title,
    list,
    referenceGroup(ctx, () => paint(panel, ctx)),
    limitNote(ctx, data)
  );

  panel.dataset.e085Events = String(data.events);
  panel.dataset.e085Eras = String(data.eras.length);
  panel.dataset.e085Span = String(data.span);
  panel.dataset.e085Reference = reference;
  panel.dataset.e085Reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '1' : '0';
}

/* ---- Enregistrement ----------------------------------------------------- */

register('E085', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css('chronology-e085', `
.chronology-e085{margin:10px 0 4px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.5}
.chronology-e085 *{box-sizing:border-box}
.chronology-e085 .e085-title{margin:0 0 8px;color:var(--gold);font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.chronology-e085 .e085-list{margin:0}
.chronology-e085 .e085-row{display:flex;flex-wrap:wrap;gap:2px 8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.chronology-e085 .e085-row:last-child{border-bottom:0}
.chronology-e085 dt{flex:0 0 152px;min-width:0;color:var(--muted-2);font-size:9px}
.chronology-e085 dd{margin:0;flex:1 1 180px;min-width:0;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.chronology-e085 .e085-empty{color:var(--muted-2);font-style:italic}
.chronology-e085 .e085-bars{list-style:none;margin:0;padding:0;display:grid;gap:3px}
.chronology-e085 .e085-bar{display:flex;align-items:center;gap:6px;min-width:0}
.chronology-e085 .e085-bar-name{flex:0 0 96px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}
.chronology-e085 .e085-bar-track{flex:1 1 40px;min-width:20px;height:6px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden}
.chronology-e085 .e085-bar-fill{display:block;height:100%;background:var(--gold);opacity:.55}
.chronology-e085 .e085-bar-val{flex:0 0 48px;text-align:right;font-variant-numeric:tabular-nums}
.chronology-e085 .e085-more{padding-left:96px;color:var(--muted-2);font-size:9px;font-style:italic}
.chronology-e085 .e085-fieldset{margin:8px 0 0;padding:5px 8px 7px;border:1px solid var(--line);border-radius:7px}
.chronology-e085 .e085-legend{padding:0 4px;color:var(--muted-2);font-size:9px}
.chronology-e085 .e085-radios{display:flex;flex-wrap:wrap;gap:2px 10px;margin-top:3px}
.chronology-e085 .e085-choice{display:flex;align-items:center;gap:5px;min-height:24px;cursor:pointer;font-size:9px}
.chronology-e085 .e085-radio{width:14px;height:14px;margin:0;accent-color:var(--gold);cursor:pointer}
.chronology-e085 .e085-choice:focus-within{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e085 .e085-limit{margin:8px 0 0;padding-top:6px;border-top:1px solid rgba(255,255,255,.05);color:var(--muted-2);font-size:9px;font-style:italic}
@media (max-width:620px){
  .chronology-e085{padding:8px}
  .chronology-e085 dt{flex-basis:100%}
  .chronology-e085 dd{flex-basis:100%}
  .chronology-e085 .e085-bar-name{flex-basis:80px}
  .chronology-e085 .e085-more{padding-left:0}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e085,.chronology-e085 *{transition:none!important;animation:none!important}
}`);

  const main = one(ctx.layout, '#atlas-chrono-main') || one(ctx.layout, '.chronology-main');
  if (!main) return;

  /* Garde d'existence : une seule lentille, même si le diagnostic rejoue
     l'application sur le même rendu. */
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'chronology-e085');
    panel.id = PANEL_ID;
  }
  panel.className = 'chronology-e085';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Statistiques de la frise et mesures chiffrées');

  const anchor = one(ctx.layout, '#atlas-chrono-status') || one(ctx.layout, '#atlas-chrono-tools');
  if (anchor && anchor.parentNode) anchor.insertAdjacentElement('afterend', panel);
  else main.appendChild(panel);

  paint(panel, ctx);
});
