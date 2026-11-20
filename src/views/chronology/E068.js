import { register } from './registry.js';

/* Lentille E068 — zoom et dézoom temporels, navigation dans la densité
   d'événements. Lecture seule : aucun fichier partagé n'est modifié, aucune
   donnée historique n'est inventée. L'échelle est reconstruite depuis les
   attributs réels posés par chronology.js (data-year, data-start, data-end)
   et depuis les cartes effectivement affichées. Le zoom est analytique : il
   met en avant une fenêtre de years sans retirer aucun repère du DOM. */

const CSS_ID = 'chronology-e068';
const LEVELS = [1, 2, 4, 8];
const BUCKET_WIDTHS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
const MAX_BUCKETS = 10;

/* État local persistant entre deux rendus de la coque. Les nœuds, eux, sont
   toujours reconstruits depuis le layout courant. */
const view = { level: 1, anchor: null, bucket: null };

const CSS = `
.chronology-e068 { margin:12px 0 16px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:rgba(255,255,255,.02); }
.e068-title { margin:0 0 4px; font-family:var(--serif); font-size:14px; font-weight:450; color:var(--ink); }
.e068-summary { margin:0 0 8px; color:var(--muted); font-size:9px; line-height:1.5; }
.e068-controls { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
.e068-controls button { min-height:36px; padding:5px 10px; border:1px solid var(--line); border-radius:8px; background:transparent; color:var(--gold-bright); font-size:10px; cursor:pointer; }
.e068-controls button:hover:not(:disabled) { border-color:var(--gold); }
.e068-controls button:disabled { opacity:.45; cursor:not-allowed; }
.e068-anchor { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:8px; }
.e068-anchor label { color:var(--muted); font-size:9px; }
#e068-anchor-range { flex:1 1 160px; min-width:120px; accent-color:var(--gold); }
#e068-anchor-value { min-width:110px; color:var(--gold-bright); font-size:9px; font-variant-numeric:tabular-nums; }
.e068-window { margin:0 0 8px; color:var(--ink-soft); font-size:10px; line-height:1.5; font-variant-numeric:tabular-nums; }
.e068-buckets { list-style:none; margin:0; padding:0; display:grid; gap:3px; }
.e068-bucket { display:grid; grid-template-columns:minmax(120px,auto) 1fr auto; gap:8px; align-items:center; min-width:0; }
.e068-bucket-btn { min-height:36px; padding:3px 7px; border:1px solid transparent; border-radius:7px; background:transparent; color:var(--muted); font-size:9px; font-variant-numeric:tabular-nums; text-align:left; cursor:pointer; }
.e068-bucket-btn:hover { border-color:var(--line); color:var(--ink); }
.e068-bucket.is-selected .e068-bucket-btn { border-color:var(--gold); color:var(--gold-bright); }
.e068-bucket-bar { color:var(--gold); font-size:9px; letter-spacing:1px; white-space:nowrap; overflow:hidden; }
.e068-bucket-count { color:var(--ink-soft); font-size:9px; font-variant-numeric:tabular-nums; }
.e068-empty { color:var(--muted-2); font-size:9px; line-height:1.5; }
.e068-note { margin:8px 0 0; color:var(--muted-2); font-size:8px; line-height:1.5; }
.e068-controls button:focus-visible, .e068-bucket-btn:focus-visible, #e068-anchor-range:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
.event-list > li.e068-out-window > .event-card { border-style:dashed; }
.event-list > li.e068-in-window > .event-card { border-color:var(--gold); border-style:solid; }
.event-list > li.e068-in-bucket > .event-card { box-shadow:inset 0 0 0 1px var(--gold-bright); }
@media (max-width:620px) {
  .chronology-e068 { padding:9px 10px; }
  .e068-bucket { grid-template-columns:1fr auto; }
  .e068-bucket-bar { display:none; }
}
@media (prefers-reduced-motion:reduce) {
  .chronology-e068 * { transition:none !important; }
}
[data-e068-reduced="1"] .chronology-e068 * { transition:none !important; }`;

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function windowFor(min, max, anchor, level) {
  if (level <= 1) return { from: min, to: max, level: 1 };
  const span = Math.max(1, max - min);
  const half = span / (2 * level);
  const middle = (min + max) / 2;
  let center = anchor == null ? middle : anchor;
  center = Math.min(max - half, Math.max(min + half, center));
  let from = Math.floor(center - half);
  let to = Math.ceil(center + half);
  if (from < min) from = min;
  if (to > max) to = max;
  if (to < from) return { from: min, to: max, level };
  return { from, to, level };
}

function pickWidth(span) {
  const target = Math.max(1, span);
  for (let i = 0; i < BUCKET_WIDTHS.length; i += 1) {
    if (target / BUCKET_WIDTHS[i] <= MAX_BUCKETS) return BUCKET_WIDTHS[i];
  }
  return BUCKET_WIDTHS[BUCKET_WIDTHS.length - 1];
}

function buildBuckets(from, to, width, events) {
  const out = [];
  let start = Math.floor(from / width) * width;
  while (start <= to && out.length < MAX_BUCKETS + 2) {
    const rawEnd = start + width - 1;
    if (rawEnd >= from) {
      const bFrom = Math.max(start, from);
      const bTo = Math.min(rawEnd, to);
      const count = events.reduce((total, item) => (
        total + (item.year >= bFrom && item.year <= bTo ? 1 : 0)
      ), 0);
      out.push({ from: bFrom, to: bTo, count });
    }
    start += width;
  }
  return out;
}

register('E068', (ctx) => {
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  ctx.css(CSS_ID, CSS);
  layout.dataset.e068 = '1';
  layout.dataset.e068Reduced = ctx.reducedMotion() ? '1' : '0';

  /* Gardes d'existence : un nœud déjà présent est réutilisé et vidé, jamais
     dupliqué. Les gestionnaires sont assignés par propriété (onclick/oninput)
     pour écraser tout auditeur précédent sur un nœud réutilisé. */
  function ensure(id, tag, className, parent) {
    let node = document.getElementById(id);
    if (!node) {
      node = ctx.el(tag, className);
      node.id = id;
    } else {
      node.className = className || '';
      node.replaceChildren();
    }
    parent.appendChild(node);
    return node;
  }

  const main = layout.querySelector('#atlas-chrono-main') || layout;
  const status = layout.querySelector('#atlas-chrono-status');
  const panel = ensure('e068-panel', 'section', 'chronology-e068', main);
  panel.setAttribute('aria-labelledby', 'e068-title');
  if (status && status.parentNode === main && status.nextSibling) {
    main.insertBefore(panel, status.nextSibling);
  } else if (main.firstChild) {
    main.insertBefore(panel, main.firstChild);
  }

  const title = ensure('e068-title', 'h2', 'e068-title', panel);
  title.textContent = 'Zoom et dézoom temporels';
  const summary = ensure('e068-summary', 'p', 'e068-summary', panel);

  const controls = ensure('e068-controls', 'div', 'e068-controls', panel);
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Commandes du zoom temporel');
  const zoomOut = ensure('e068-zoom-out', 'button', '', controls);
  zoomOut.type = 'button';
  zoomOut.textContent = 'Zoom arrière';
  zoomOut.setAttribute('aria-controls', 'e068-window e068-buckets');
  const zoomIn = ensure('e068-zoom-in', 'button', '', controls);
  zoomIn.type = 'button';
  zoomIn.textContent = 'Zoom avant';
  zoomIn.setAttribute('aria-controls', 'e068-window e068-buckets');
  const reset = ensure('e068-reset', 'button', '', controls);
  reset.type = 'button';
  reset.textContent = 'Vue d’ensemble';
  reset.setAttribute('aria-controls', 'e068-window e068-buckets');

  const anchorRow = ensure('e068-anchor', 'div', 'e068-anchor', panel);
  const label = ensure('e068-anchor-label', 'label', '', anchorRow);
  label.textContent = 'Centre de la fenêtre';
  label.htmlFor = 'e068-anchor-range';
  const range = ensure('e068-anchor-range', 'input', '', anchorRow);
  range.type = 'range';
  range.setAttribute('aria-controls', 'e068-window e068-buckets');
  const anchorValue = ensure('e068-anchor-value', 'output', '', anchorRow);
  anchorValue.htmlFor = 'e068-anchor-range';

  const windowLine = ensure('e068-window', 'p', 'e068-window', panel);
  const bucketsList = ensure('e068-buckets', 'ol', 'e068-buckets', panel);
  bucketsList.setAttribute('aria-label', 'Répartition des repères dans la fenêtre temporelle');
  const note = ensure('e068-note', 'p', 'e068-note', panel);

  function collect() {
    const list = layout.querySelector('#atlas-chrono-events');
    const items = list
      ? Array.prototype.slice.call(list.querySelectorAll(':scope > li'))
      : [];
    items.forEach((item) => {
      item.classList.remove('e068-in-window', 'e068-out-window', 'e068-in-bucket');
    });
    const events = [];
    items.forEach((li) => {
      if (li.hasAttribute('hidden') || !li.dataset.eventId) return;
      const year = Number(li.dataset.year);
      if (!Number.isFinite(year)) return;
      events.push({ li, year, card: li.querySelector(':scope > .event-card') });
    });
    const bands = Array.prototype.slice.call(
      layout.querySelectorAll('.era-band[data-start][data-end]')
    );
    const bounds = [];
    bands.forEach((band) => {
      const start = Number(band.dataset.start);
      const end = Number(band.dataset.end);
      if (Number.isFinite(start)) bounds.push(start);
      if (Number.isFinite(end)) bounds.push(end);
    });
    const years = events.map((item) => item.year);
    let min = years.length ? years[0] : (bounds.length ? bounds[0] : 0);
    let max = min;
    years.forEach((year) => {
      if (year < min) min = year;
      if (year > max) max = year;
    });
    bounds.forEach((year) => {
      if (year < min) min = year;
      if (year > max) max = year;
    });
    const active = events.find((item) => item.card && (
      item.card.getAttribute('aria-current') === 'true'
      || item.card.classList.contains('is-active')
    ));
    return {
      events,
      min,
      max,
      eraCount: bands.length,
      activeYear: active ? active.year : (events.length ? events[0].year : null),
    };
  }

  function render() {
    const data = collect();
    const hasData = data.events.length > 0;
    const levelIndex = LEVELS.indexOf(view.level);
    const anchor = view.anchor == null ? data.activeYear : view.anchor;
    const win = windowFor(data.min, data.max, anchor, view.level);
    const buckets = hasData
      ? buildBuckets(win.from, win.to, pickWidth(win.to - win.from + 1), data.events)
      : [];
    if (view.bucket !== null && !buckets.some((item) => item.from === view.bucket)) {
      view.bucket = null;
    }
    const inWindow = data.events.filter((item) => (
      item.year >= win.from && item.year <= win.to
    ));
    const maxCount = buckets.reduce((memo, item) => Math.max(memo, item.count), 0) || 1;
    const centerValue = Math.round((win.from + win.to) / 2);

    layout.dataset.e068Level = String(view.level);
    layout.dataset.e068Reduced = ctx.reducedMotion() ? '1' : '0';
    panel.dataset.e068Level = String(view.level);
    panel.dataset.e068From = String(win.from);
    panel.dataset.e068To = String(win.to);
    panel.dataset.e068Count = String(inWindow.length);

    summary.textContent = hasData
      ? `Échelle reconstruite depuis ${data.events.length} repère(s) affiché(s) et ${data.eraCount} bande(s) d’ère : bornes ${formatYear(data.min)} → ${formatYear(data.max)}. Aucune date n’est inventée.`
      : 'Aucun repère affiché : la fenêtre temporelle ne peut pas être calculée.';

    windowLine.textContent = hasData
      ? `Fenêtre ${formatYear(win.from)} → ${formatYear(win.to)} (niveau ×${view.level}) : ${inWindow.length} repère(s) sur ${data.events.length} affiché(s), ${data.events.length - inWindow.length} hors fenêtre.`
      : `Fenêtre indisponible (niveau ×${view.level}).`;

    zoomOut.disabled = !hasData || levelIndex <= 0;
    zoomIn.disabled = !hasData || levelIndex >= LEVELS.length - 1;
    reset.disabled = !hasData;

    range.min = String(Math.floor(data.min));
    range.max = String(Math.ceil(data.max));
    range.step = '1';
    range.disabled = !hasData || view.level <= 1 || range.min === range.max;
    range.value = String(centerValue);
    range.setAttribute(
      'aria-valuetext',
      `${formatYear(centerValue)} — centre de la fenêtre, niveau ×${view.level}`
    );
    anchorValue.textContent = `Centre : ${formatYear(centerValue)}`;

    bucketsList.replaceChildren();
    if (!buckets.length) {
      bucketsList.appendChild(ctx.el('li', 'e068-empty', 'Aucune répartition à afficher.'));
    } else {
      buckets.forEach((bucket, index) => {
        const li = ctx.el(
          'li',
          `e068-bucket${view.bucket === bucket.from ? ' is-selected' : ''}`
        );
        const button = ctx.el(
          'button',
          'e068-bucket-btn',
          `${formatYear(bucket.from)} → ${formatYear(bucket.to)}`
        );
        button.type = 'button';
        button.id = `e068-bucket-${index}`;
        if (view.bucket === bucket.from) button.setAttribute('aria-current', 'true');
        button.setAttribute(
          'aria-label',
          `Centrer la fenêtre sur ${formatYear(bucket.from)} à ${formatYear(bucket.to)} : ${bucket.count} repère(s)`
        );
        button.onclick = () => {
          view.anchor = Math.round((bucket.from + bucket.to) / 2);
          view.bucket = bucket.from;
          render();
        };
        const bar = ctx.el(
          'span',
          'e068-bucket-bar',
          bucket.count
            ? '■'.repeat(Math.max(1, Math.round((bucket.count / maxCount) * 10)))
            : '·'
        );
        bar.setAttribute('aria-hidden', 'true');
        const count = ctx.el('span', 'e068-bucket-count', String(bucket.count));
        li.append(button, bar, count);
        bucketsList.appendChild(li);
      });
    }

    data.events.forEach((item) => {
      const inside = item.year >= win.from && item.year <= win.to;
      item.li.classList.toggle('e068-in-window', view.level > 1 && inside);
      item.li.classList.toggle('e068-out-window', view.level > 1 && !inside);
      const selected = view.bucket !== null && buckets.some((bucket) => (
        bucket.from === view.bucket && item.year >= bucket.from && item.year <= bucket.to
      ));
      item.li.classList.toggle('e068-in-bucket', selected);
    });

    note.textContent = view.level > 1
      ? 'La fenêtre ne masque aucun repère : les cartes hors fenêtre restent dans la liste et dans le lecteur d’écran. Le zoom est une lecture analytique, pas un filtre.'
      : 'Vue d’ensemble : tous les repères affichés sont dans la fenêtre. « Zoom avant » resserre l’échelle.';
  }

  zoomOut.onclick = () => {
    view.level = LEVELS[Math.max(0, LEVELS.indexOf(view.level) - 1)];
    view.anchor = collect().activeYear;
    view.bucket = null;
    render();
  };
  zoomIn.onclick = () => {
    view.level = LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(view.level) + 1)];
    view.anchor = collect().activeYear;
    view.bucket = null;
    render();
  };
  reset.onclick = () => {
    view.level = 1;
    view.anchor = null;
    view.bucket = null;
    render();
  };
  range.oninput = () => {
    const value = Number(range.value);
    if (Number.isFinite(value)) {
      view.anchor = value;
      view.bucket = null;
      render();
    }
  };

  render();
});
