import { register } from './registry.js';

/* Lentille E097 — export et copie du contenu de la frise, formats texte.
   Domaine : sortie / portabilité. Dix chantiers E097-01..E097-10, tous
   implémentés ici. Aucune donnée n'est inventée : la source unique est le DOM
   rendu par chronology.js. Zéro réseau, zéro Math.random, zéro console.*,
   aucune boucle requestAnimationFrame, aucun timer d'arrière-plan. */

const STYLE_ID = 'chronology-e097';
const PANEL_ID = 'e097-export-panel';

/* Les identifiants sont préfixés « e097 » mais ne se terminent pas par
   -e\\d\\d : le panneau n'est donc pas confondu avec un panneau de diagnostic. */
const FORMATS = [
  ['brut', 'Texte brut'],
  ['markdown', 'Markdown'],
  ['csv', 'CSV (séparateur ;)'],
  ['tsv', 'TSV (tabulations)'],
];
const SCOPES = [
  ['affiches', 'Repères affichés'],
  ['ere', 'Ère courante'],
  ['selection', 'Repère sélectionné (fiche détaillée)'],
];

const CSS = `
#e097-export-panel{margin:18px 0 0;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
#e097-export-title{margin:0 0 3px;color:var(--ink);font-family:var(--serif);font-size:14px;font-weight:450}
#e097-export-lede{margin:0 0 12px;color:var(--muted-2);font-size:9px;line-height:1.5}
.e097-fieldset{min-width:0;margin:0 0 10px;padding:0;border:0}
.e097-legend{margin:0 0 5px;padding:0;color:var(--gold);font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.e097-radios{display:flex;flex-wrap:wrap;gap:5px 16px}
.e097-radio{display:inline-flex;align-items:center;gap:5px;min-height:24px;color:var(--muted);font-size:10px;cursor:pointer}
.e097-radio input{margin:0;accent-color:var(--gold);cursor:pointer}
.e097-actions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.e097-btn{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.e097-btn:hover{border-color:var(--gold)}
.e097-btn:focus-visible,.e097-radio input:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#e097-preview{max-height:230px;overflow:auto;margin:0;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink-soft);font-size:10px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2}
#e097-count{margin:7px 0 0;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
#e097-readout{min-height:14px;margin:5px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
#e097-fallback{display:block;width:100%;min-height:88px;margin:8px 0 0;padding:8px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--ink);font:inherit;font-size:10px}
[hidden]{display:none!important}
@media (max-width:620px){#e097-export-panel{padding:10px}.e097-actions{flex-direction:column}.e097-btn{width:100%}}
@media (prefers-reduced-motion:reduce){#e097-export-panel,#e097-export-panel *{transition:none!important;animation:none!important}}
`;

/* État propre à la lentille : survit aux reconstructions du DOM mais n'est
   jamais écrit dans le store partagé (registry.js:39-42). */
const settings = { format: 'brut', scope: 'affiches' };
let EL = null;
let panelNode = null;
let currentStage = null;
let lastText = '';
let copyCount = 0;
let downloadCount = 0;
let fallbackCount = 0;
let lastObjectUrl = null;

/* ---------- lecture seule du DOM (E097-02) ---------- */

function node(tag, className, textValue) {
  return EL(tag, className, textValue);
}

function clean(value) {
  return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function at(stage, selector) {
  return clean(stage.querySelector(selector)?.textContent);
}

function readEras(stage) {
  const names = Object.create(null);
  stage.querySelectorAll('.era-band[data-era-id]').forEach((band) => {
    names[band.dataset.eraId] = clean(band.querySelector('span')?.textContent);
  });
  const active = stage.querySelector('.era-band[aria-current="true"]');
  return {
    names,
    active: active ? {
      id: active.dataset.eraId || '',
      name: clean(active.querySelector('span')?.textContent),
      range: clean(active.querySelectorAll('span')[1]?.textContent),
    } : null,
  };
}

function readEvents(stage, eras) {
  return Array.from(stage.querySelectorAll('#atlas-chrono-events > li[data-event-id]')).map((li) => {
    const card = li.querySelector('.event-card');
    const eraId = li.dataset.eraId || '';
    const tags = (li.dataset.tags || '').split(/\s+/).filter(Boolean);
    return {
      id: li.dataset.eventId || '',
      yearRaw: li.dataset.year || '',
      yearText: at(li, '.event-year'),
      title: clean(card?.querySelector('strong')?.textContent),
      subtitle: at(li, '.event-subtitle'),
      eraId,
      eraName: at(li, '.atlas-chrono-card-era') || eras.names[eraId] || eraId,
      importance: li.dataset.importance || '',
      tags,
      selected: Boolean(card && card.getAttribute('aria-current') === 'true'),
    };
  });
}

function readDetail(stage) {
  return {
    title: at(stage, '#atlas-chrono-event-title'),
    stamp: at(stage, '.aside-year'),
    summary: at(stage, '.aside-summary'),
    tags: Array.from(stage.querySelectorAll('.atlas-chrono-tags .atlas-chrono-tag'))
      .map((chip) => clean(chip.textContent)),
    points: Array.from(stage.querySelectorAll('.points > li.point')).map((li) => ({
      kind: li.dataset.kind || '',
      confidence: li.dataset.confidence || '',
      text: at(li, 'p'),
      sources: Array.from(li.querySelectorAll('.point-sources > li')).map((src) => ({
        id: src.dataset.sourceId || '',
        text: clean(src.textContent),
      })),
    })),
  };
}

function collect(stage) {
  const title = at(stage, '#atlas-chrono-title');
  const eras = readEras(stage);
  const events = readEvents(stage, eras);
  return {
    country: title.replace(/^Chronologie\s*·\s*/, '') || 'Pays inconnu',
    eras,
    events,
    detail: readDetail(stage),
  };
}

function chosenEvents(data) {
  if (settings.scope === 'ere') {
    return data.eras.active
      ? data.events.filter((event) => event.eraId === data.eras.active.id)
      : [];
  }
  if (settings.scope === 'selection') {
    return data.events.filter((event) => event.selected);
  }
  return data.events;
}

function scopeLabel(data) {
  if (settings.scope === 'ere') {
    return data.eras.active
      ? `Ère courante — ${data.eras.active.name} (${data.eras.active.range || 'plage inconnue'})`
      : 'Ère courante — aucune ère active';
  }
  if (settings.scope === 'selection') {
    return `Repère sélectionné — ${data.detail.title || 'aucun repère actif'}`;
  }
  return 'Repères actuellement affichés dans la frise';
}

function formatLabel() {
  return FORMATS.find(([key]) => key === settings.format)?.[1] || 'Texte brut';
}

/* ---------- composition des quatre formats texte (E097-03) ---------- */

function pointLines(detail) {
  if (!detail.title || !detail.points.length) return [];
  const lines = [`Détail du repère (${detail.points.length} point(s)) :`];
  detail.points.forEach((point, index) => {
    const prefix = [point.confidence, point.kind].filter(Boolean).join(' · ');
    lines.push(`  ${index + 1}. ${prefix ? `[${prefix}] ` : ''}${point.text || '—'}`);
    const sources = point.sources.map((source) => source.text || source.id).filter(Boolean);
    if (sources.length) lines.push(`     Sources : ${sources.join(' | ')}`);
  });
  return lines;
}

function buildPlain(data, events) {
  const lines = [
    `CHRONOLOGIE · ${data.country}`,
    `Périmètre : ${scopeLabel(data)}`,
  ];
  if (data.eras.active) lines.push(`Ère active : ${data.eras.active.name} (${data.eras.active.range || 'plage inconnue'}).`);
  lines.push(`${events.length} repère(s) exporté(s).`, '');
  events.forEach((event) => {
    lines.push(`- ${event.yearText || event.yearRaw || 'année inconnue'} — ${event.title || 'repère sans titre'}`);
    lines.push(`  Sous-titre : ${event.subtitle || '—'}`);
    lines.push(`  Ère : ${event.eraName || '—'}`);
    lines.push(`  Thèmes : ${event.tags.length ? event.tags.join(', ') : '—'}`);
    lines.push(`  Importance : ${event.importance || '—'}`);
    if (settings.scope === 'selection') {
      lines.push(`  Résumé : ${data.detail.summary || '—'}`);
    }
    lines.push('');
  });
  lines.push(...pointLines(data.detail));
  return lines.join('\n').trimEnd() + '\n';
}

function buildMarkdown(data, events) {
  const lines = [
    `# Chronologie · ${data.country}`,
    '',
    `Périmètre : ${scopeLabel(data)}.`,
    '',
    `${events.length} repère(s) exporté(s).`,
    '',
  ];
  events.forEach((event) => {
    lines.push(`## ${event.yearText || event.yearRaw || 'année inconnue'} — ${event.title || 'repère sans titre'}`);
    lines.push('');
    lines.push(`- **Sous-titre** : ${event.subtitle || '—'}`);
    lines.push(`- **Ère** : ${event.eraName || '—'}`);
    lines.push(`- **Thèmes** : ${event.tags.length ? event.tags.join(', ') : '—'}`);
    lines.push(`- **Importance** : ${event.importance || '—'}`);
    if (settings.scope === 'selection') {
      lines.push(`- **Résumé** : ${data.detail.summary || '—'}`);
    }
    lines.push('');
  });
  const detail = pointLines(data.detail);
  if (detail.length) lines.push(...detail, '');
  return lines.join('\n').trimEnd() + '\n';
}

function tableRows(data, events) {
  const rows = [[
    'Millésime', 'Année brute', 'Titre', 'Sous-titre', 'Ère',
    'Importance', 'Thèmes', 'Résumé', 'Points', 'Sources',
  ]];
  const points = data.detail.points;
  const pointText = points.map((point) => {
    const prefix = [point.confidence, point.kind].filter(Boolean).join(' · ');
    return `${prefix ? `[${prefix}] ` : ''}${point.text || ''}`.trim();
  }).filter(Boolean).join(' | ');
  const sources = Array.from(new Set(points.flatMap((point) =>
    point.sources.map((source) => source.text || source.id).filter(Boolean)))).join(' | ');
  events.forEach((event) => {
    rows.push([
      event.yearText || event.yearRaw || '',
      event.yearRaw || '',
      event.title || '',
      event.subtitle || '',
      event.eraName || '',
      event.importance || '',
      event.tags.join(', '),
      settings.scope === 'selection' ? data.detail.summary || '' : '',
      settings.scope === 'selection' ? pointText : '',
      settings.scope === 'selection' ? sources : '',
    ]);
  });
  return rows;
}

function escapeField(value, separator) {
  const flat = String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ');
  if (separator === '\t') return flat.replace(/"/g, '""');
  return `"${flat.replace(/"/g, '""')}"`;
}

function buildDelimited(data, events, separator) {
  const rows = tableRows(data, events).map((row) =>
    row.map((field) => escapeField(field, separator)).join(separator));
  const body = rows.join('\n') + '\n';
  return separator === ';' ? '\uFEFF' + body : body;
}

function compose(data) {
  const events = chosenEvents(data);
  if (settings.format === 'markdown') return buildMarkdown(data, events);
  if (settings.format === 'csv') return buildDelimited(data, events, ';');
  if (settings.format === 'tsv') return buildDelimited(data, events, '\t');
  return buildPlain(data, events);
}

/* ---------- panneau, annonces et idempotence (E097-01, E097-10) ---------- */

function say(message) {
  const readout = panelNode?.querySelector('#e097-readout');
  if (readout) readout.textContent = message;
}

function radioGroup(legendText, name, options, current) {
  const fieldset = node('fieldset', 'e097-fieldset');
  const legend = node('legend', 'e097-legend', legendText);
  fieldset.appendChild(legend);
  const wrap = node('div', 'e097-radios');
  options.forEach(([value, label]) => {
    const id = `e097-${name}-${value}`;
    const input = node('input');
    input.type = 'radio';
    input.name = `e097-${name}`;
    input.id = id;
    input.value = value;
    input.checked = value === current;
    const labelNode = node('label', 'e097-radio', label);
    labelNode.setAttribute('for', id);
    wrap.appendChild(labelNode);
    wrap.appendChild(input);
  });
  fieldset.appendChild(wrap);
  return fieldset;
}

function buildPanel(ctx) {
  const panel = node('section', '', '');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', 'e097-export-title');

  const heading = node('h2', '', 'Exporter la frise');
  heading.id = 'e097-export-title';
  panel.appendChild(heading);
  const lede = node('p', '',
    'Choisissez un format et un périmètre, puis copiez ou téléchargez. Le contenu est lu dans la frise affichée, sans donnée ajoutée.');
  lede.id = 'e097-export-lede';
  panel.appendChild(lede);

  panel.appendChild(radioGroup('Format de sortie', 'format', FORMATS, settings.format));
  panel.appendChild(radioGroup('Périmètre', 'scope', SCOPES, settings.scope));

  const actions = node('div', 'e097-actions');
  const copy = node('button', 'e097-btn', 'Copier le texte');
  copy.type = 'button';
  copy.id = 'e097-copy-btn';
  copy.dataset.e097Action = 'copy';
  const download = node('button', 'e097-btn', 'Télécharger le fichier .txt');
  download.type = 'button';
  download.id = 'e097-download-btn';
  download.dataset.e097Action = 'download';
  actions.append(copy, download);
  panel.appendChild(actions);

  const preview = node('pre', '', '');
  preview.id = 'e097-preview';
  preview.setAttribute('aria-label', 'Aperçu du texte exporté');
  panel.appendChild(preview);

  const count = node('p', '', '');
  count.id = 'e097-count';
  panel.appendChild(count);

  const readout = node('p', '', '');
  readout.id = 'e097-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  panel.appendChild(readout);

  const fallback = node('textarea', '', '');
  fallback.id = 'e097-fallback';
  fallback.readOnly = true;
  fallback.hidden = true;
  fallback.setAttribute('aria-label', 'Repli de copie : texte sélectionné');
  panel.appendChild(fallback);

  ctx.layout.appendChild(panel);
  return panel;
}

function ensurePanel(ctx) {
  const existing = document.getElementById(PANEL_ID);
  panelNode = existing || buildPanel(ctx);
  if (panelNode.parentElement !== ctx.layout) ctx.layout.appendChild(panelNode);
  /* Un seul couple d'écouteurs délégués par panneau, même après re-render. */
  if (panelNode.dataset.e097Wired !== '1') {
    panelNode.dataset.e097Wired = '1';
    panelNode.addEventListener('change', handleChange);
    panelNode.addEventListener('click', handleClick);
  }
  panelNode.dataset.e097Reduced = ctx.reducedMotion() ? '1' : '0';
  return panelNode;
}

function refreshPreview(announce) {
  if (!panelNode || !currentStage) return;
  const data = collect(currentStage);
  lastText = compose(data);
  const preview = panelNode.querySelector('#e097-preview');
  if (preview) preview.textContent = lastText || 'Aucun contenu à exporter pour ce périmètre.';
  const lines = lastText ? lastText.split('\n').length : 0;
  const count = panelNode.querySelector('#e097-count');
  if (count) count.textContent = `${chosenEvents(data).length} repère(s) · ${lastText.length} caractère(s) · ${lines} ligne(s)`;
  panelNode.dataset.e097Format = settings.format;
  panelNode.dataset.e097Scope = settings.scope;
  panelNode.dataset.e097Chars = String(lastText.length);
  panelNode.dataset.e097Lines = String(lines);
  panelNode.dataset.e097Events = String(chosenEvents(data).length);
  if (announce) say(`Aperçu ${formatLabel().toLowerCase()} — ${chosenEvents(data).length} repère(s), ${lastText.length} caractère(s).`);
}

function handleChange(event) {
  const input = event.target;
  if (!input || !input.name) return;
  if (input.name === 'e097-format' && FORMATS.some(([key]) => key === input.value)) {
    settings.format = input.value;
  } else if (input.name === 'e097-scope' && SCOPES.some(([key]) => key === input.value)) {
    settings.scope = input.value;
  } else {
    return;
  }
  refreshPreview(true);
}

/* ---------- copie et téléchargement (E097-06, E097-07) ---------- */

function revealFallback() {
  const field = panelNode?.querySelector('#e097-fallback');
  if (!field) return;
  field.hidden = false;
  field.value = lastText;
  field.focus();
  try { field.select(); } catch { /* sélection non supportée */ }
  fallbackCount += 1;
  if (panelNode) panelNode.dataset.e097Fallbacks = String(fallbackCount);
  say('Presse-papiers indisponible : le texte est affiché et sélectionné, copiez-le avec Ctrl+C.');
}

function copyText() {
  if (!lastText) { say('Aucun texte à copier pour ce périmètre.'); return; }
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null;
  if (!clipboard || typeof clipboard.writeText !== 'function') { revealFallback(); return; }
  let settled = false;
  try {
    const result = clipboard.writeText(lastText);
    if (result && typeof result.then === 'function') {
      settled = true;
      result.then(() => {
        copyCount += 1;
        if (panelNode) {
          panelNode.dataset.e097Copies = String(copyCount);
          panelNode.querySelector('#e097-copy-btn')?.setAttribute('data-e097-state', 'copié');
        }
        say('Texte copié dans le presse-papiers.');
      }, () => revealFallback());
      return;
    }
  } catch { /* contexte non sécurisé : repli visible */ }
  if (settled) return;
  copyCount += 1;
  if (panelNode) {
    panelNode.dataset.e097Copies = String(copyCount);
    panelNode.querySelector('#e097-copy-btn')?.setAttribute('data-e097-state', 'copié');
  }
  say('Texte copié dans le presse-papiers.');
}

function safeFileName() {
  const country = currentStage ? collect(currentStage).country : 'pays';
  const base = `${country}-${settings.scope}-${settings.format}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'frise';
  return `chronologie-${base}.txt`;
}

function downloadText() {
  if (!lastText) { say('Aucun texte à télécharger pour ce périmètre.'); return; }
  if (lastObjectUrl) {
    try { URL.revokeObjectURL(lastObjectUrl); } catch { /* URL déjà libérée */ }
    lastObjectUrl = null;
  }
  let url;
  let anchor;
  try {
    url = URL.createObjectURL(new Blob([lastText], { type: 'text/plain;charset=utf-8' }));
    lastObjectUrl = url;
    anchor = node('a');
    anchor.href = url;
    anchor.download = safeFileName();
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    downloadCount += 1;
    if (panelNode) panelNode.dataset.e097Downloads = String(downloadCount);
    say(`Fichier « ${anchor.download} » téléchargé (${lastText.length} caractère(s)).`);
    if (typeof queueMicrotask === 'function') queueMicrotask(() => {
      try { URL.revokeObjectURL(url); } catch { /* noop */ }
      if (lastObjectUrl === url) lastObjectUrl = null;
    });
  } catch {
    if (anchor && anchor.isConnected) anchor.remove();
    if (url) { try { URL.revokeObjectURL(url); } catch { /* noop */ } }
    revealFallback();
  }
}

function handleClick(event) {
  const button = event.target?.closest?.('[data-e097-action]');
  if (!button || !panelNode || !panelNode.contains(button)) return;
  if (button.dataset.e097Action === 'copy') copyText();
  else if (button.dataset.e097Action === 'download') downloadText();
}

/* ---------- point d'entrée du registre ---------- */

register('E097', (ctx) => {
  if (!ctx || !ctx.layout || !ctx.stage) return;
  EL = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, textValue) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (textValue !== undefined) element.textContent = textValue;
      return element;
    };
  ctx.css(STYLE_ID, CSS);
  currentStage = ctx.stage;
  ensurePanel(ctx);
  refreshPreview(false);
});
