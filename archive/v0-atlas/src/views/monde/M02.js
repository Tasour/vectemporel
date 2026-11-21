import { register } from './registry.js';

/* Lentille M02 — Textures du globe (domaine A : rendu & moteur WebGL).
 * Dix chantiers M02-01 … M02-10, tous implémentés dans ce module.
 *
 * Faits relevés dans les fichiers locaux (aucune valeur inventée) :
 *  - globe-map.png      : 4096×2048, PNG 8 bits RGBA (colortype 6), 1 285 223 o
 *  - globe-map-2k.png   : 2048×1024, PNG 8 bits RGBA (colortype 6),   416 624 o
 *  - globe-pick.png     : 2048×1024, PNG 8 bits RGBA (colortype 6),   269 592 o
 *  - globe-palette.json : grille 2048×1024, 196 couleurs,              18 271 o
 *  - globe-engine.js    : chooseMapUrl() 562-570, Promise.all() 611-618,
 *                         réglages de texture 620-629, copie pick 638-643,
 *                         budget framebuffer 2 200 000 px (202-204),
 *                         alpha fragment forcé à 1.0 (183), getInfo() 691-703.
 *
 * Aucun réseau ajouté : les durées et l'URL réellement chargée sont lues dans
 * le Resource Timing déjà produit par le moteur. Aucun appel de
 * journalisation, aucun aléa, aucun fichier partagé modifié.
 */

const CSS_ID = 'monde-m02';
const PANEL_ID = 'monde-m02-quality';
const LIVE_ID = 'monde-m02-live';
const ROWS_ID = 'monde-m02-rows';
const FALLBACK_ID = 'monde-m02-fallback';
const ALERT_ID = 'monde-m02-alert';

const FILES = Object.freeze({
  map4k: Object.freeze({ name: 'globe-map.png', w: 4096, h: 2048, bytes: 1285223 }),
  map2k: Object.freeze({ name: 'globe-map-2k.png', w: 2048, h: 1024, bytes: 416624 }),
  pick: Object.freeze({ name: 'globe-pick.png', w: 2048, h: 1024, bytes: 269592 }),
  palette: Object.freeze({ name: 'globe-palette.json', w: 2048, h: 1024, colors: 196, bytes: 18271 }),
});

const CHANNELS = 4;              // PNG colortype 6 : RGBA 8 bits
const MIP_FACTOR = 4 / 3;        // pyramide de mipmaps complète
const PIXEL_BUDGET = 2200000;    // globe-engine.js:202
const LATENCY_THRESHOLD_MS = 1500;
const FALLBACK_DELAY_MS = 5000;

const cssText = `
#monde-m02-quality {
  position: absolute; right: 16px; bottom: 16px; z-index: 6;
  max-width: 320px; max-height: 44%; overflow: auto;
  border: 1px solid var(--line); border-radius: 9px;
  background: rgba(8,11,16,.93); color: var(--ink-soft);
  font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
}
#monde-m02-quality > summary {
  min-height: 28px; padding: 7px 10px; cursor: pointer; color: var(--gold);
}
#monde-m02-quality[open] > summary { border-bottom: 1px solid var(--line); }
.monde-m02-body { padding: 8px 10px 10px; }
#monde-m02-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
#monde-m02-table caption { padding: 0 0 6px; text-align: left; color: var(--muted); }
#monde-m02-table th, #monde-m02-table td {
  padding: 4px 2px; border-top: 1px solid var(--line);
  vertical-align: top; overflow-wrap: anywhere;
}
#monde-m02-table th { width: 36%; text-align: left; color: var(--muted); font-weight: 600; }
.monde-m02-note { margin: 6px 0 0; color: var(--muted); }
.monde-m02-alert {
  margin: 6px 0 0; padding: 6px 8px; border: 1px solid var(--gold);
  border-radius: 6px; color: var(--gold-bright);
}
.monde-m02-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (max-width: 900px) {
  #monde-m02-quality { right: 8px; bottom: 8px; max-width: min(300px, calc(100% - 16px)); max-height: 38%; }
}
`;

let lastEngine = null;

function formatInt(value) {
  return Number(value).toLocaleString('fr-FR');
}

function formatFloat(value, digits) {
  return Number(value).toFixed(digits).replace('.', ',');
}

function mib(bytes) {
  return formatFloat(bytes / 1048576, 1) + ' Mio';
}

function kib(bytes) {
  return formatFloat(bytes / 1024, 1) + ' Kio';
}

function vramBytes(width, height, mipmaps) {
  return Math.round(width * height * CHANNELS * (mipmaps ? MIP_FACTOR : 1));
}

/* Resource Timing : aucune requête supplémentaire, aucun aléa. */
function resourceEntry(name) {
  try {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return null;
    const entries = performance.getEntriesByType('resource');
    for (const entry of entries) {
      if (entry.name === name || entry.name.endsWith('/' + name)) return entry;
    }
    return null;
  } catch {
    return null;
  }
}

function mapChoice() {
  const high = resourceEntry(FILES.map4k.name);
  const low = resourceEntry(FILES.map2k.name);
  if (high && low) return { kind: 'ambiguous' };
  if (high) return { kind: 'high', file: FILES.map4k, entry: high };
  if (low) return { kind: 'low', file: FILES.map2k, entry: low };
  return { kind: 'unknown' };
}

function readInfo(engine) {
  if (!engine || typeof engine.getInfo !== 'function') return null;
  try {
    return engine.getInfo();
  } catch {
    return null;
  }
}

function decisionInputs() {
  let connection = null;
  try {
    connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  } catch {
    connection = null;
  }
  const memory = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null;
  const width = window.innerWidth;
  return {
    width,
    saveData: !!(connection && connection.saveData),
    memory,
    smallScreen: width < 700,
  };
}

function loadTimes() {
  const result = [];
  [FILES.map4k, FILES.map2k, FILES.pick, FILES.palette].forEach((file) => {
    const entry = resourceEntry(file.name);
    if (!entry) return;
    result.push({
      name: file.name.replace(/^globe-/, '').replace(/\.(png|json)$/, ''),
      ms: Math.round(entry.duration),
    });
  });
  return result;
}

function addRow(el, tbody, label, value, id) {
  const tr = el('tr');
  const th = el('th', null, label);
  th.scope = 'row';
  const td = el('td', null, value);
  if (id) td.id = id;
  tr.append(th, td);
  tbody.appendChild(tr);
}

function buildPanel(el) {
  const panel = el('details', 'monde-m02-panel');
  panel.id = PANEL_ID;
  panel.dataset.monde = 'M02';

  const summary = el('summary');
  summary.appendChild(el('span', null, 'Textures · '));
  const summaryRes = el('span', null, 'non mesuré');
  summaryRes.id = 'monde-m02-summary-res';
  summary.appendChild(summaryRes);

  const body = el('div', 'monde-m02-body');
  const table = el('table');
  table.id = 'monde-m02-table';
  const caption = el('caption', null, 'Qualité des textures locales — mesures Resource Timing et estimations théoriques');
  const tbody = el('tbody');
  tbody.id = ROWS_ID;
  table.append(caption, tbody);

  const fallback = el('p', 'monde-m02-note');
  fallback.id = FALLBACK_ID;
  fallback.hidden = true;
  const alert = el('p', 'monde-m02-alert');
  alert.id = ALERT_ID;
  alert.hidden = true;
  const note = el('p', 'monde-m02-note',
    'Estimations : 4 canaux × 8 bits, mipmaps complets (×4/3). getInfo() n’expose aucun compteur de VRAM : aucune mesure GPU directe n’est affirmée.');

  body.append(table, fallback, alert, note);
  panel.append(summary, body);
  return panel;
}

function collectRefs(panel, live) {
  return {
    panel,
    live,
    summaryRes: panel.querySelector('#monde-m02-summary-res'),
    tbody: panel.querySelector('#' + ROWS_ID),
    fallback: panel.querySelector('#' + FALLBACK_ID),
    alert: panel.querySelector('#' + ALERT_ID),
    filled: false,
    fallbackShown: false,
    cancelWatch: null,
    observer: null,
    timer: null,
  };
}

function fill(refs, el, engine) {
  if (refs.filled || !refs.panel.isConnected) return;
  refs.filled = true;

  const choice = mapChoice();
  const info = readInfo(engine);
  const inputs = decisionInputs();
  const times = loadTimes();
  const file = choice.file || FILES.map4k;
  const warnings = [];

  /* M02-01 : résolution réellement demandée, d'après le Resource Timing. */
  const mapLabel = choice.kind === 'high'
    ? `${choice.file.w}×${choice.file.h} · ${choice.file.name} (${formatInt(choice.file.bytes)} o)`
    : choice.kind === 'low'
      ? `${choice.file.w}×${choice.file.h} · ${choice.file.name} (${formatInt(choice.file.bytes)} o)`
      : choice.kind === 'ambiguous'
        ? 'deux cartes relevées — résolution non déterminée'
        : 'non mesuré (Resource Timing vide)';
  if (choice.kind === 'unknown' || choice.kind === 'ambiguous') warnings.push('Résolution de la carte non vérifiable.');
  refs.summaryRes.textContent = mapLabel;

  /* M02-02 : le repli 2k existe localement, même s'il n'est pas utilisé. */
  const fallbackState = choice.kind === 'high' ? 'présent, non utilisé'
    : choice.kind === 'low' ? 'utilisé' : 'présent, statut non mesuré';
  refs.fallback.hidden = true;
  refs.fallbackShown = false;

  /* M02-03 : durées réelles des trois ressources, seuil annoncé 1500 ms. */
  const latencyText = times.length
    ? times.map((item) => `${item.name} ${item.ms} ms`).join(' · ')
    : 'durées non exposées (Resource Timing vide)';
  const slow = times.filter((item) => item.ms > LATENCY_THRESHOLD_MS);
  if (slow.length) {
    warnings.push(`Chargement > ${LATENCY_THRESHOLD_MS} ms : ${slow.map((item) => item.name + ' ' + item.ms + ' ms').join(', ')}.`);
  }

  /* M02-04 : les conditions lisibles du choix binaire, sans inventer maxTextureSize. */
  const criteriaText = [
    `largeur ${inputs.width} px (seuil 700) : ${inputs.smallScreen ? 'écran étroit' : 'écran large'}`,
    `deviceMemory : ${inputs.memory === null ? 'non exposé' : inputs.memory + ' Go (seuil > 4)'}`,
    `saveData : ${inputs.saveData ? 'actif' : 'inactif'}`,
    'maxTextureSize : non exposé par getInfo()',
  ].join(' · ');

  /* M02-05 : framebuffer réel contre taille de la carte. */
  const width = info && info.width ? info.width : 0;
  const height = info && info.height ? info.height : 0;
  let frameText;
  if (width && height) {
    const pixels = width * height;
    const ratio = typeof info.pixelRatio === 'number' ? info.pixelRatio : null;
    const frameMpx = pixels / 1000000;
    frameText = `${width}×${height} · DPR ${ratio === null ? '?' : formatFloat(ratio, 2)} · ${formatFloat(frameMpx, 2)} Mpx`;
    if (choice.file) {
      const textureMpx = choice.file.w * choice.file.h / 1000000;
      frameText += ` · carte ${formatFloat(textureMpx, 2)} Mpx (${formatFloat(textureMpx / frameMpx, 1)}× le framebuffer)`;
      if (textureMpx / frameMpx > 4) warnings.push('Carte très supérieure au framebuffer : sur-échantillonnage théorique.');
    }
    frameText += ` · budget moteur ${formatFloat(PIXEL_BUDGET / 1000000, 2)} Mpx`;
  } else {
    frameText = 'compteurs non exposés avant ouverture du moteur';
  }

  /* M02-06 : le canal alpha est transporté puis ignoré par le fragment shader. */
  const alphaWasted = vramBytes(file.w, file.h, false) / CHANNELS;
  const alphaText = `${CHANNELS} canaux PNG (type 6) · alpha forcé à 1.0 (globe-engine.js:183) · ${mib(alphaWasted)} de canal alpha sans effet sur ${file.name}`;

  /* M02-07 : coût théorique des mipmaps de la carte. */
  const base = vramBytes(file.w, file.h, false);
  const mipped = vramBytes(file.w, file.h, true);
  const mipText = `${mib(base)} en base → ${mib(mipped)} avec mipmaps (+33 %) sur ${file.name}`;

  /* M02-08 : contrôle de cohérence du compteur de textures du moteur. */
  const textures = info && typeof info.textures === 'number' ? info.textures : null;
  const textureText = textures === null
    ? 'compteur non exposé par getInfo()'
    : `${textures} texture(s) GPU déclarée(s) · attendu 2 (carte + picking)`;
  if (textures !== null && textures !== 2) warnings.push(`Compteur de textures inattendu : ${textures}.`);

  /* M02-09 : filtres déclarés, lisibles sans ouvrir le moteur. */
  const samplingText = 'carte : min LinearMipmapLinearFilter / mag LinearFilter / anisotropie ≤ 4 · picking : NearestFilter, mipmaps désactivés (globe-engine.js:620-629)';

  /* M02-10 : grille de picking et copie CPU, exposées sous forme de tableau. */
  const pickingText = `${FILES.pick.name} ${FILES.pick.w}×${FILES.pick.h} · copie CPU ${mib(FILES.pick.w * FILES.pick.h * CHANNELS)} (globe-engine.js:638-643) · palette ${FILES.palette.colors} couleurs · grille ${FILES.palette.w}×${FILES.palette.h}`;

  const tbody = refs.tbody;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  addRow(el, tbody, 'Carte chargée', mapLabel);
  addRow(el, tbody, 'Repli local', `${FILES.map2k.name} · ${FILES.map2k.w}×${FILES.map2k.h} · ${kib(FILES.map2k.bytes)} · ${fallbackState}`);
  addRow(el, tbody, 'Latence des ressources', latencyText);
  addRow(el, tbody, 'Critère 4k', criteriaText);
  addRow(el, tbody, 'Framebuffer', frameText);
  addRow(el, tbody, 'Canal alpha', alphaText);
  addRow(el, tbody, 'Mipmaps', mipText);
  addRow(el, tbody, 'Textures GPU', textureText);
  addRow(el, tbody, 'Échantillonnage', samplingText);
  addRow(el, tbody, 'Grille de picking', pickingText);

  if (warnings.length) {
    refs.alert.hidden = false;
    refs.alert.textContent = warnings.join(' ');
  } else {
    refs.alert.hidden = true;
    refs.alert.textContent = '';
  }
  refs.live.textContent = `Textures : ${mapLabel}.` + (warnings.length ? ' ' + warnings.join(' ') : '');
}

/* M02-02 : détection d'un chargement non confirmé, sans timer répété. */
function watchCanvas(ctx, refs) {
  const hasCanvas = () => !!(ctx.host && ctx.host.querySelector('canvas.globe-webgl'));
  const stop = () => {
    if (refs.timer !== null) {
      clearTimeout(refs.timer);
      refs.timer = null;
    }
    if (refs.observer) {
      refs.observer.disconnect();
      refs.observer = null;
    }
    refs.cancelWatch = null;
  };
  refs.cancelWatch = stop;
  if (hasCanvas()) return;
  if (typeof MutationObserver !== 'undefined' && ctx.host) {
    refs.observer = new MutationObserver(() => { if (hasCanvas()) stop(); });
    refs.observer.observe(ctx.host, { childList: true });
  }
  refs.timer = setTimeout(() => {
    const status = document.getElementById('globe-status');
    const ready = !!(status && status.dataset.kind === 'ready');
    if (hasCanvas() || ready) {
      stop();
      return;
    }
    if (refs.fallbackShown) return;
    refs.fallbackShown = true;
    refs.fallback.hidden = false;
    refs.fallback.textContent = `Carte non confirmée après ${FALLBACK_DELAY_MS / 1000} s : ${FILES.map2k.name} (${FILES.map2k.w}×${FILES.map2k.h}, ${kib(FILES.map2k.bytes)}) reste disponible localement ; la liste des pays permet de continuer. Un repli automatique exige globe-engine.js:611-618 (fichier interdit).`;
    ctx.say('Chargement de la carte non confirmé : le fichier 2048×1024 local reste disponible et la liste des pays est utilisable.');
  }, FALLBACK_DELAY_MS);
}

register('M02', (ctx) => {
  ctx.css(CSS_ID, cssText);
  if (!ctx.scene) return;
  const el = ctx.el;

  let panel = document.getElementById(PANEL_ID);
  if (!panel || !panel.isConnected || panel.dataset.monde !== 'M02') {
    panel = buildPanel(el);
    ctx.scene.appendChild(panel);
  }

  let live = document.getElementById(LIVE_ID);
  if (!live) {
    live = el('p', 'monde-m02-sr');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
  }

  const refs = collectRefs(panel, live);
  const maybeFill = (payload) => {
    const engine = payload && payload.engine ? payload.engine : lastEngine;
    if (engine) lastEngine = engine;
    if (refs.cancelWatch) refs.cancelWatch();
    fill(refs, el, engine || lastEngine);
  };
  ctx.onReady(maybeFill);

  const canvas = ctx.host && ctx.host.querySelector('canvas.globe-webgl');
  if (lastEngine && lastEngine.ready && canvas) maybeFill({ engine: lastEngine });
  else watchCanvas(ctx, refs);
});
