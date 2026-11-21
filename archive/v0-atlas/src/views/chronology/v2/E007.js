import { register } from './registry.js';

/* Lentille E007 — proportion visuelle des durées d'ère (domaine A : frise & ères).
 *
 * Thème : « A. Frise & ères — proportion visuelle des durées d'ère ».
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E007.md — chantiers E007-01 à E007-10.
 * Fichier possédé : src/views/chronology/v2/E007.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css et la passe 1 intactes).
 *
 * Contrat exploité : ctx = { viewId: 'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 *
 * Invariants : un seul register, une seule feuille CSS 'chronology-v2-e007',
 * tous les IDs préfixés chronology-v2-e007- et gardés par ensureNode, aucune
 * écriture répétée inutile (write), aucun timer, aucune boucle rAF, aucun aléa,
 * aucun réseau, aucune journalisation, aucun innerHTML. Toutes les durées sont
 * dérivées des bornes portées par le DOM : aucune date n'est codée en dur.
 */

const CSS_ID = 'chronology-v2-e007';
const PREFIX = 'chronology-v2-e007-';

/* E007-01 à E007-10 : chaque identifiant est préfixé et unique. */
const IDS = {
  panel: PREFIX + 'panel',
  title: PREFIX + 'title',
  lede: PREFIX + 'lede',
  controls: PREFIX + 'controls',
  linear: PREFIX + 'scale-linear',
  linearLabel: PREFIX + 'scale-linear-label',
  sqrt: PREFIX + 'scale-sqrt',
  sqrtLabel: PREFIX + 'scale-sqrt-label',
  modeNote: PREFIX + 'mode-note',
  ruler: PREFIX + 'ruler',
  ticks: PREFIX + 'ticks',
  track: PREFIX + 'track',
  reference: PREFIX + 'reference',
  list: PREFIX + 'list',
  metric: PREFIX + 'metric',
  unavailable: PREFIX + 'unavailable',
};

/* E007-09 : une seule feuille, imprimable, sans dépendance de couleur seule. */
const CSS = `
  #${IDS.panel} {
    margin: 18px 0 0; padding: 11px 13px 14px;
    border: 1px solid var(--line, #3a3a3a);
    border-left: 3px solid var(--gold, #c8a24a);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #d6d6d6); font: inherit; font-size: 11px;
    line-height: 1.5; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  #${IDS.panel} .e007-title {
    margin: 0 0 6px; color: var(--gold-bright, #f0d27a);
    font-family: var(--serif, Georgia, serif); font-size: 14px; font-weight: 600;
  }
  #${IDS.panel} .e007-lede { margin: 0 0 9px; color: var(--muted, #9b9b9b); }
  #${IDS.panel} .e007-controls {
    display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 0 0 8px;
    padding: 6px 8px; border: 1px solid var(--line, #3a3a3a); border-radius: 6px;
  }
  #${IDS.panel} .e007-choice { display: inline-flex; align-items: center; gap: 6px; }
  #${IDS.panel} .e007-radio { width: 16px; height: 16px; margin: 0; accent-color: var(--gold, #c8a24a); }
  #${IDS.panel} .e007-label { cursor: pointer; color: var(--ink-soft, #d6d6d6); }
  #${IDS.panel} .e007-mode-note {
    margin: 0 0 6px; padding: 4px 7px; border-left: 3px solid var(--gold, #c8a24a);
    color: var(--muted, #9b9b9b);
  }
  #${IDS.panel}[data-e007-linear="0"] .e007-mode-note {
    border-left-color: #e08d3c; color: var(--ink, #f2f2f2); font-weight: 600;
  }
  #${IDS.panel} .e007-ruler {
    position: relative; height: 72px; margin: 12px 0 8px;
    border-bottom: 1px solid var(--line, #3a3a3a);
  }
  #${IDS.panel} .e007-ticks { position: absolute; inset: 0; pointer-events: none; }
  #${IDS.panel} .e007-tick {
    position: absolute; top: 28px; height: 8px;
    border-left: 1px solid var(--line-strong, #6a6a6a);
  }
  #${IDS.panel} .e007-tick-label {
    position: absolute; left: 2px; top: 9px; color: var(--muted-2, #8a8a8a);
    font-size: 8px; white-space: nowrap;
  }
  #${IDS.panel} .e007-track {
    position: absolute; left: 0; right: 0; top: 0; height: 26px;
    display: flex; overflow: hidden; border-radius: 4px;
  }
  #${IDS.panel} .e007-segment {
    position: relative; flex-grow: 0; flex-shrink: 0; min-width: 2px;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background-color: rgba(200,162,74,.18);
    border-right: 1px solid var(--line-strong, #6a6a6a);
  }
  #${IDS.panel} .e007-seg-label {
    padding: 0 2px; font-size: 9px; white-space: nowrap;
    text-overflow: ellipsis; overflow: hidden;
  }
  #${IDS.panel} .e007-reference {
    position: absolute; left: 0; bottom: 3px; height: 5px;
    background: repeating-linear-gradient(90deg, var(--gold, #c8a24a) 0 4px, transparent 4px 7px);
  }
  #${IDS.panel} .e007-ref-label {
    position: absolute; left: 0; bottom: 9px; font-size: 8px;
    color: var(--gold-bright, #f0d27a); white-space: nowrap;
  }
  #${IDS.panel} .e007-list {
    margin: 6px 0; padding-left: 20px; color: var(--ink-soft, #d6d6d6);
  }
  #${IDS.panel} .e007-item { margin: 0 0 3px; }
  #${IDS.panel} .e007-item-name { font-weight: 600; }
  #${IDS.panel} .e007-item-value { color: var(--muted, #9b9b9b); }
  #${IDS.panel} .e007-metric { margin: 7px 0 0; color: var(--muted-2, #8a8a8a); font-size: 9px; }
  #${IDS.panel} .e007-unavailable {
    margin: 6px 0; padding: 5px 7px; border: 1px dashed var(--line-strong, #6a6a6a);
    color: var(--ink, #f2f2f2);
  }
  #${IDS.panel} .e007-unavailable[hidden] { display: none; }
  #${IDS.panel} :focus-visible { outline: 2px solid var(--gold-bright, #f0d27a); outline-offset: 2px; }
  @media (max-width: 620px) {
    #${IDS.panel} .e007-ruler { height: 62px; }
    #${IDS.panel} .e007-tick:nth-child(even) .e007-tick-label { display: none; }
    #${IDS.panel} .e007-controls { gap: 4px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${IDS.panel}, #${IDS.panel} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${IDS.panel} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${IDS.panel} .e007-title, #${IDS.panel} .e007-seg-label,
    #${IDS.panel} .e007-ref-label, #${IDS.panel} .e007-mode-note { color: CanvasText; }
    #${IDS.panel} .e007-segment { border: 1px solid CanvasText; background: Canvas; }
    #${IDS.panel} .e007-reference { background: repeating-linear-gradient(90deg, CanvasText 0 4px, transparent 4px 7px); }
  }
  @media print {
    #${IDS.panel} { border: 1px solid #000; background: #fff; color: #000; break-inside: avoid; }
    #${IDS.panel} .e007-title, #${IDS.panel} .e007-seg-label,
    #${IDS.panel} .e007-ref-label, #${IDS.panel} .e007-mode-note,
    #${IDS.panel} .e007-item-value, #${IDS.panel} .e007-metric { color: #000; }
    #${IDS.panel} .e007-segment {
      background-image: repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 5px) !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    #${IDS.panel} .e007-segment:nth-child(even) {
      background-image: repeating-linear-gradient(135deg, #000 0 1px, transparent 1px 5px) !important;
    }
    #${IDS.panel} .e007-reference { background: repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 6px) !important; }
    #${IDS.panel} .e007-list, #${IDS.panel} .e007-metric { break-inside: avoid; }
  }
`;

const ANGLES = [0, 45, 90, 135];
const BOUND_KEYS = ['eraStart', 'start', 'from', 'begin', 'yearStart', 'dateStart', 'min'];
const END_KEYS = ['eraEnd', 'end', 'to', 'finish', 'yearEnd', 'dateEnd', 'max'];
const DURATION_KEYS = ['eraDuration', 'duration', 'span', 'amplitude'];
const UNIT_KEYS = ['eraUnit', 'unit', 'timeUnit', 'scaleUnit'];
const NAME_KEYS = ['eraLabel', 'eraName', 'label', 'name', 'title'];

let installCount = 0;
let scaleMode = 'linear';
let boundGroup = null;
let refs = null;

/* E007-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   le stage, un nœud de la rendu précédent est détaché et n'est pas retrouvé :
   on le crée, sinon on réutilise celui trouvé et on le déplace dans le parent
   courant. Jamais de clone, jamais de doublon d'ID. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E007-10 : déduplication des écritures : deux rendus sans changement ne
   touchent pas le DOM texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E007-08 : lecture tolérante d'un nombre, sans date codée en dur. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  const cleaned = value.trim().replace(/\s+/g, '').replace(/\u2212/g, '-').replace(',', '.');
  const found = cleaned.match(/[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?/i);
  return found ? Number(found[0]) : NaN;
}

function unitFactor(raw) {
  const value = String(raw || '').toLowerCase();
  if (/\bga\b|milliard/.test(value)) return 1000;
  if (/\bka\b|millenaire|millénaire/.test(value)) return 0.001;
  if (/\ban\b|annee|année/.test(value)) return 0.000001;
  return 1;
}

function pickData(dataset, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const value = dataset[keys[i]];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

/* E007-01, E007-02, E007-08 : ère lue depuis les attributs de la
   frise ; l'unité est ramenée en Ma pour que les largeurs soient comparables.
   Une ère sans bornes exploitables est conservée avec duration = NaN. */
function readEra(node) {
  const dataset = node.dataset || {};
  const start = toNumber(pickData(dataset, BOUND_KEYS));
  const end = toNumber(pickData(dataset, END_KEYS));
  const given = toNumber(pickData(dataset, DURATION_KEYS));
  const unitRaw = pickData(dataset, UNIT_KEYS);
  const factor = unitFactor(unitRaw || node.getAttribute('aria-label'));
  const text = (node.textContent || '').trim();
  const nameRaw = pickData(dataset, NAME_KEYS) || node.getAttribute('aria-label');
  const name = nameRaw ? String(nameRaw).trim() : (text.split('\n')[0] || '').slice(0, 70) || 'Ère sans nom';
  let duration = NaN;
  if (Number.isFinite(given)) duration = Math.abs(given) * factor;
  else if (Number.isFinite(start) && Number.isFinite(end)) duration = Math.abs(end - start) * factor;
  return {
    name,
    duration,
    unit: unitRaw ? String(unitRaw) : 'Ma',
    hasBounds: Number.isFinite(start) && Number.isFinite(end),
  };
}

/* E007-01 : collecte non chevauchante des bandes d'ère du stage courant. */
function collectEras(host) {
  const selector = '[data-era-start], [data-era-end], [data-start], [data-end], [data-era], .era-band, [class*="era-band"]';
  const found = host.querySelectorAll(selector);
  const seen = new Set();
  const eras = [];
  Array.prototype.forEach.call(found, (node) => {
    const era = readEra(node);
    const key = era.name + '|' + (Number.isFinite(era.duration) ? era.duration.toFixed(3) : 'nd');
    if (seen.has(key)) return;
    seen.add(key);
    eras.push(era);
  });
  return eras;
}

/* E007-04, E007-05 : pas de graduation « rond » dérivé de la durée totale. */
function niceStep(value) {
  if (!(value > 0)) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const ratio = value / base;
  const multiplier = ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10;
  return multiplier * base;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return (value / 1000).toFixed(2).replace('.', ',') + ' Ga';
  if (value >= 1) return (value < 10 ? value.toFixed(1) : value.toFixed(0)).replace('.', ',') + ' Ma';
  return Math.round(value * 1000) + ' ka';
}

function pattern(index) {
  const angle = ANGLES[index % ANGLES.length];
  return 'repeating-linear-gradient(' + angle + 'deg, transparent 0 6px, rgba(0,0,0,.30) 6px 7px)';
}

/* E007-03 : largeurs recalculées selon l'échelle choisie. La racine carrée
   comprime les écarts mais n'est jamais présentée comme comparable. */
function shares(eras, total) {
  if (!(total > 0)) return [];
  if (scaleMode === 'sqrt') {
    const weights = eras.map((era) => (Number.isFinite(era.duration) ? Math.sqrt(era.duration) : 0));
    const sum = weights.reduce((acc, value) => acc + value, 0);
    return sum > 0 ? weights.map((value) => value / sum) : [];
  }
  return eras.map((era) => (Number.isFinite(era.duration) ? era.duration / total : 0));
}

function render() {
  const r = refs;
  if (!r || !r.panel || !r.panel.isConnected) return;

  const eras = collectEras(r.host);
  const usable = eras.filter((era) => Number.isFinite(era.duration) && era.duration > 0);
  const total = usable.reduce((acc, era) => acc + era.duration, 0);
  const step = niceStep(total / 6);
  const reference = total > 0 ? Math.min(step, total) : 1;
  const parts = shares(usable, total);
  const linear = scaleMode === 'linear';

  r.panel.dataset.e007Linear = linear ? '1' : '0';
  r.panel.dataset.e007Scale = scaleMode;
  r.panel.dataset.e007Eras = String(usable.length);
  r.panel.dataset.e007Total = total.toFixed(2);
  r.panel.dataset.e007Reference = reference.toFixed(2);
  r.panel.dataset.e007Reduced = r.reduced ? '1' : '0';
  r.panel.dataset.e007Renders = String(installCount);
  r.panel.dataset.e007State = usable.length ? 'disponible' : 'indisponible';

  write(r.modeNote, linear
    ? 'Échelle linéaire : la largeur de chaque segment est proportionnelle à la durée de l’ère.'
    : 'Échelle non linéaire (racine carrée) : les largeurs ne sont PAS comparables entre elles. Revenir au mode linéaire pour comparer les durées.');

  r.linear.checked = linear;
  r.sqrt.checked = !linear;

  /* E007-01, E007-03, E007-07 : segments à largeur proportionnelle, motifs
     déterministes, étiquette textuelle et attributs de mesure consultables. */
  r.track.replaceChildren();
  usable.forEach((era, index) => {
    const segment = r.make('div', 'e007-segment');
    const percent = parts[index] * 100;
    segment.style.width = percent.toFixed(3) + '%';
    segment.style.flexBasis = percent.toFixed(3) + '%';
    segment.style.backgroundImage = pattern(index);
    segment.setAttribute('data-e007-era', era.name);
    segment.setAttribute('data-e007-duration', era.duration.toFixed(3));
    segment.setAttribute('data-e007-share', percent.toFixed(2));
    segment.appendChild(r.make('span', 'e007-seg-label', era.name + ' · ' + formatDuration(era.duration)));
    r.track.appendChild(segment);
  });

  /* E007-05 : graduations de durée cumulée, calculées depuis le total. */
  r.ticks.replaceChildren();
  if (usable.length) {
    for (let value = 0, index = 0; value <= total + 1e-9 && index < 24; value += step, index += 1) {
      const tick = r.make('span', 'e007-tick');
      tick.style.left = ((value / total) * 100).toFixed(3) + '%';
      tick.appendChild(r.make('span', 'e007-tick-label', formatDuration(value)));
      r.ticks.appendChild(tick);
    }
  }

  /* E007-04 : référence visuelle, largeur égale à une grandeur « ronde ». */
  r.reference.replaceChildren();
  if (usable.length) {
    r.reference.style.width = ((reference / total) * 100).toFixed(3) + '%';
    r.reference.appendChild(r.make('span', 'e007-ref-label', 'référence : ' + formatDuration(reference)));
  }

  /* E007-07, E007-08 : liste de repli toujours lisible, y compris pour une
     ère dont la durée n'est pas calculable. Aucune information par couleur seule. */
  r.list.replaceChildren();
  eras.forEach((era) => {
    const item = r.make('li', 'e007-item');
    const detail = Number.isFinite(era.duration)
      ? formatDuration(era.duration)
        + ' · ' + (total > 0 ? ((era.duration / total) * 100).toFixed(1).replace('.', ',') : '0') + ' % du total'
        + ' · ' + (reference > 0 ? (era.duration / reference).toFixed(2).replace('.', ',') : '0') + ' × référence'
      : 'durée non calculable (bornes absentes)';
    item.append(r.make('span', 'e007-item-name', era.name + ' — '), r.make('span', 'e007-item-value', detail));
    r.list.appendChild(item);
  });

  r.unavailable.hidden = usable.length > 0;
  write(r.unavailable, 'Durées non calculables : la frise ne porte pas de bornes exploitables. Aucune date n’est inventée.');

  /* E007-10 : équivalent textuel de la règle pour les technologies d'assistance. */
  r.ruler.setAttribute('aria-label', usable.length
    ? 'Règle proportionnelle : ' + usable.length + ' ères, durée totale ' + formatDuration(total)
      + ', échelle ' + (linear ? 'linéaire' : 'non linéaire') + '. Le détail chiffré figure dans la liste qui suit.'
    : 'Règle proportionnelle indisponible : aucune durée d’ère calculable.');

  write(r.metric, 'Rendus : ' + installCount + ' · ères exploitables : ' + usable.length + '/' + eras.length
    + ' · durée totale : ' + formatDuration(total) + ' · référence : ' + formatDuration(reference)
    + ' · échelle : ' + (linear ? 'linéaire' : 'racine carrée')
    + ' · mouvement réduit : ' + (r.reduced ? 'oui' : 'non') + '.');
}

/* E007-03 : un seul écouteur, attaché au groupe et réattaché si la coque
   reconstruit le nœud. Aucun timer, aucun preventDefault, aucun focus volé. */
function onScaleChange(event) {
  const target = event.target;
  if (!target || target.getAttribute('name') !== 'e007-scale') return;
  const next = target.getAttribute('value') === 'sqrt' ? 'sqrt' : 'linear';
  if (next === scaleMode) return;
  scaleMode = next;
  render();
}

function install(ctx) {
  const make = ctx && typeof ctx.el === 'function' ? ctx.el : null;
  if (!make) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = (ctx.stage && typeof ctx.stage.appendChild === 'function' ? ctx.stage : null)
    || (ctx.layout && typeof ctx.layout.appendChild === 'function' ? ctx.layout : null)
    || document.getElementById('atlas-chrono-main')
    || document.body;

  const panel = ensureNode(make, IDS.panel, 'section', 'e007-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', IDS.title);

  const title = ensureNode(make, IDS.title, 'h2', 'e007-title', panel);
  write(title, 'Proportion des durées d’ère');
  const lede = ensureNode(make, IDS.lede, 'p', 'e007-lede', panel);
  write(lede, 'Règle de lecture : chaque segment représente la durée d’une ère, calculée depuis les bornes portées par la frise. Elle complète la frise sans la remplacer ; la liste ci-dessous donne les mêmes valeurs en texte.');

  const controls = ensureNode(make, IDS.controls, 'div', 'e007-controls', panel);
  controls.setAttribute('role', 'radiogroup');
  controls.setAttribute('aria-label', 'Échelle de la règle proportionnelle');
  controls.replaceChildren();

  const linearChoice = make('span', 'e007-choice');
  const linear = ensureNode(make, IDS.linear, 'input', 'e007-radio', linearChoice);
  linear.setAttribute('type', 'radio');
  linear.setAttribute('name', 'e007-scale');
  linear.setAttribute('value', 'linear');
  const linearLabel = ensureNode(make, IDS.linearLabel, 'label', 'e007-label', linearChoice);
  linearLabel.setAttribute('for', IDS.linear);
  write(linearLabel, 'linéaire (comparable)');

  const sqrtChoice = make('span', 'e007-choice');
  const sqrt = ensureNode(make, IDS.sqrt, 'input', 'e007-radio', sqrtChoice);
  sqrt.setAttribute('type', 'radio');
  sqrt.setAttribute('name', 'e007-scale');
  sqrt.setAttribute('value', 'sqrt');
  const sqrtLabel = ensureNode(make, IDS.sqrtLabel, 'label', 'e007-label', sqrtChoice);
  sqrtLabel.setAttribute('for', IDS.sqrt);
  write(sqrtLabel, 'racine carrée (illustrative)');
  controls.append(linearChoice, sqrtChoice);

  const modeNote = ensureNode(make, IDS.modeNote, 'p', 'e007-mode-note', panel);

  const ruler = ensureNode(make, IDS.ruler, 'div', 'e007-ruler', panel);
  /* E007-10 : role=img rend l'aria-label de la règle audible ; les valeurs
     chiffrées restent dans la liste textuelle qui suit, jamais dans la couleur. */
  ruler.setAttribute('role', 'img');
  const ticks = ensureNode(make, IDS.ticks, 'div', 'e007-ticks', ruler);
  const track = ensureNode(make, IDS.track, 'div', 'e007-track', ruler);
  const reference = ensureNode(make, IDS.reference, 'div', 'e007-reference', ruler);
  ruler.replaceChildren(ticks, track, reference);

  const list = ensureNode(make, IDS.list, 'ol', 'e007-list', panel);
  const metric = ensureNode(make, IDS.metric, 'p', 'e007-metric', panel);
  const unavailable = ensureNode(make, IDS.unavailable, 'p', 'e007-unavailable', panel);

  panel.replaceChildren(title, lede, controls, modeNote, ruler, list, metric, unavailable);

  if (boundGroup !== controls) {
    controls.addEventListener('change', onScaleChange);
    boundGroup = controls;
  }

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { make, host, panel, ruler, ticks, track, reference, linear, sqrt, modeNote, list, metric, unavailable, reduced };
  render();
}

register('E007', install);
