import { register } from './registry.js';

/* Lentille V2 E096 — J. Pédagogie & narration : comparaison chiffrée
 * (amplitude vs référence).
 *
 * Thème canonique : « J. Pédagogie & narration — comparaison chiffrée
 * (amplitude vs référence) » (themes.json, clé E096).
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E096.md — chantiers E096-01 à
 * E096-10. Fichier possédé : src/views/chronology/v2/E096.js uniquement.
 * Lectures seules : src/views/chronology.js, registry.js, index.js et les
 * modèles de qualité src/views/chronology/E049.js et
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md. Aucun fichier partagé n'est modifié ;
 * la passe 1, les autres lentilles V2, registry.js, index.js et styles.css
 * restent intacts.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, n'écrit dans aucune région existante et affiche son état en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Périmètre strict : expliciter en nombre l'amplitude d'une ère par rapport à
 * une référence nommée. Toute amplitude est dérivée des bornes data-start /
 * data-end portées par la frise (chronology.js:289-290) : aucune date n'est
 * codée en dur. Les valeurs de référence (siècle, millénaire, vie humaine)
 * sont des conventions pédagogiques de conversion, pas des dates.
 *
 * Invariants :
 * - exactement un register('E096', ctx => { … }) ;
 * - exactement un ctx.css('chronology-v2-e096', …) ;
 * - tous les IDs DOM préfixés chronology-v2-e096- et gardés par ensureNode ;
 * - zéro console.*, zéro fetch/XHR/import distant, zéro Math.random, zéro
 *   innerHTML, zéro timer, zéro animation, zéro boucle rAF.
 */

const CSS_ID = 'chronology-v2-e096';
const PREFIX = 'chronology-v2-e096-';

/* E096-01 à E096-10 : un identifiant par effet observable, tous préfixés. */
const IDS = {
  panel: PREFIX + 'panel',
  title: PREFIX + 'title',
  lede: PREFIX + 'lede',
  refs: PREFIX + 'refs',
  note: PREFIX + 'note',
  amp: PREFIX + 'amplitude',
  refval: PREFIX + 'reference',
  ratio: PREFIX + 'ratio',
  extremes: PREFIX + 'extremes',
  dispro: PREFIX + 'disproportion',
  echelle: PREFIX + 'echelle',
  part: PREFIX + 'part',
  bar: PREFIX + 'bar',
  barTrack: PREFIX + 'bar-track',
  barDesc: PREFIX + 'bar-description',
  bilan: PREFIX + 'bilan',
  metric: PREFIX + 'metric',
};

/* Sources de dérivation : exclusivement la frise produite par la vue. */
const HOST_ID = 'atlas-chrono-main';
const ERAS_SELECTOR = '#atlas-chrono-eras button[data-era-id]';
const CURRENT_ERA_SELECTOR = '#atlas-chrono-eras button[data-era-id][aria-current="true"]';

/* E096-02 : références nommées. Leurs valeurs sont des unités de conversion
   pédagogiques, jamais des dates de l'atlas. La clé « vie » est une convention
   approximative explicitement présentée comme telle au lecteur. */
const REFERENCES = Object.freeze([
  { key: 'siecle', inputId: PREFIX + 'ref-siecle', labelId: PREFIX + 'ref-siecle-label', label: 'un siècle', years: 100 },
  { key: 'millenaire', inputId: PREFIX + 'ref-millenaire', labelId: PREFIX + 'ref-millenaire-label', label: 'un millénaire', years: 1000 },
  { key: 'vie', inputId: PREFIX + 'ref-vie', labelId: PREFIX + 'ref-vie-label', label: 'une vie humaine (≈ 80 ans)', years: 80 },
]);
const RADIO_NAME = 'e096-reference';

/* E096-05 : seuil au-delà duquel l'écart entre ères est qualifié de fort. */
const DISPROPORTION_SEUIL = 10;

/* E096-03, E096-06, E096-08 : une seule feuille. Les largeurs de barres et
   l'état « disproportion » sont doublés par du texte et des attributs de
   données : aucune information n'est confiée à la seule couleur. */
const CSS = `
  #${IDS.panel} {
    margin: 18px 0 0; padding: 11px 13px 13px;
    border: 1px solid var(--line, #3a3a3a);
    border-left: 4px solid var(--gold, #c8a24a);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #d6d6d6); font: inherit; font-size: 11px;
    line-height: 1.55; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  #${IDS.panel} .e096-title {
    margin: 0 0 5px; color: var(--gold-bright, #f0d27a);
    font-family: var(--serif, Georgia, serif); font-size: 15px;
    font-weight: 600; line-height: 1.3; letter-spacing: 0;
    text-transform: none;
  }
  #${IDS.panel} .e096-lede { margin: 0 0 9px; color: var(--muted, #9b9b9b); }
  #${IDS.panel} .e096-refs {
    display: flex; flex-wrap: wrap; gap: 5px 14px; margin: 0 0 6px;
    padding: 6px 8px; border: 1px solid var(--line, #3a3a3a); border-radius: 6px;
  }
  #${IDS.panel} .e096-choice { display: inline-flex; align-items: center; gap: 6px; }
  #${IDS.panel} .e096-radio {
    width: 18px; height: 18px; margin: 0;
    accent-color: var(--gold, #c8a24a);
  }
  #${IDS.panel} .e096-label { cursor: pointer; color: var(--ink-soft, #d6d6d6); font-size: 10px; }
  #${IDS.panel} .e096-note {
    margin: 0 0 8px; color: var(--muted-2, #8a8a8a); font-size: 9px;
  }
  #${IDS.panel} .e096-rows { margin: 0; }
  #${IDS.panel} .e096-row {
    display: flex; gap: 10px; margin: 0 0 4px; padding: 0 0 4px;
    border-bottom: 1px solid var(--line, #3a3a3a);
  }
  #${IDS.panel} .e096-key {
    flex: 0 0 132px; margin: 0; color: var(--muted, #9b9b9b); font-size: 10px;
  }
  #${IDS.panel} .e096-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--ink, #f2f2f2); }
  /* E096-05 : l'état est porté par le texte « DISPROPORTION FORTE » et par
     l'attribut data-e096-dispro, jamais par la seule teinte. */
  #${IDS.panel}[data-e096-dispro="alerte"] .e096-val-e096dispro {
    color: var(--gold-bright, #f0d27a); font-weight: 600;
  }
  /* E096-08 : barre de références empilées ; chaque bloc porte son numéro. */
  #${IDS.panel} .e096-bar {
    display: flex; min-height: 24px; margin: 6px 0 3px;
    overflow: hidden; border: 1px solid var(--line-strong, #6a6a6a); border-radius: 4px;
  }
  #${IDS.panel} .e096-block {
    display: flex; align-items: center; justify-content: center;
    min-width: 0; border-right: 1px solid var(--line-strong, #6a6a6a);
    background: repeating-linear-gradient(45deg, rgba(200,162,74,.22) 0 5px, rgba(200,162,74,.05) 5px 10px);
    font-size: 9px; color: var(--ink, #f2f2f2);
  }
  #${IDS.panel} .e096-block:last-child { border-right: 0; }
  #${IDS.panel} .e096-bar-desc { margin: 0 0 8px; color: var(--muted, #9b9b9b); font-size: 9px; }
  #${IDS.panel} .e096-bilan {
    margin: 9px 0 0; padding-top: 7px; border-top: 1px solid var(--line, #3a3a3a);
    color: var(--ink-soft, #d6d6d6);
  }
  #${IDS.panel} .e096-metric { margin: 7px 0 0; color: var(--muted-2, #8a8a8a); font-size: 9px; }
  #${IDS.panel} :focus-visible { outline: 2px solid var(--gold-bright, #f0d27a); outline-offset: 2px; }
  @media (max-width: 620px) {
    #${IDS.panel} .e096-row { flex-wrap: wrap; gap: 1px 8px; }
    #${IDS.panel} .e096-key { flex-basis: 100%; }
    #${IDS.panel} .e096-refs { gap: 4px 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${IDS.panel}, #${IDS.panel} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${IDS.panel} { border: 1px solid CanvasText; border-left: 4px solid CanvasText; background: Canvas; color: CanvasText; }
    #${IDS.panel} .e096-title, #${IDS.panel} .e096-val,
    #${IDS.panel} .e096-bilan, #${IDS.panel} .e096-block { color: CanvasText; }
    #${IDS.panel} .e096-block { background: Canvas; border: 1px solid CanvasText; }
  }
  @media print {
    #${IDS.panel} { border: 1px solid #000; background: #fff; color: #000; break-inside: avoid; }
    #${IDS.panel} .e096-title, #${IDS.panel} .e096-val, #${IDS.panel} .e096-key,
    #${IDS.panel} .e096-bilan, #${IDS.panel} .e096-metric,
    #${IDS.panel} .e096-block { color: #000; }
    #${IDS.panel} .e096-block {
      background-image: repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 5px) !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
  }
`;

let installCount = 0;
let referenceKey = 'siecle';
let boundGroup = null;
let refs = null;

/* E096-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché : on le réutilise et on
   le déplace dans le parent courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écritures dédupliquées : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

/* Lecture tolérante d'un nombre, sans date codée en dur. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  const cleaned = value.trim().replace(/\s+/g, '').replace(/\u2212/g, '-').replace(',', '.');
  const found = cleaned.match(/[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?/i);
  return found ? Number(found[0]) : NaN;
}

/* Formatage français déterministe (espace comme séparateur de milliers). */
function formatEntier(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded));
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ' ';
    out += digits[i];
  }
  return sign + out;
}

function formatDecimal(value, places) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(places).replace('.', ',');
}

/* E096-01 : amplitude d'une ère = |fin − début|, lue sur la bande courante. */
function readEra(node) {
  const start = toNumber(node.getAttribute('data-start'));
  const end = toNumber(node.getAttribute('data-end'));
  const firstSpan = node.querySelector('span');
  const title = (node.getAttribute('title') || '').trim();
  const name = (firstSpan && firstSpan.textContent || '').trim() || title || 'Ère sans nom';
  const amplitude = Number.isFinite(start) && Number.isFinite(end) ? Math.abs(end - start) : NaN;
  return { name, start, end, amplitude };
}

/* E096-01, E096-04 : collecte non chevauchante des bandes d'ère du stage. */
function collectEras(host) {
  if (!host || typeof host.querySelectorAll !== 'function') return [];
  const nodes = host.querySelectorAll(ERAS_SELECTOR);
  const eras = [];
  Array.prototype.forEach.call(nodes, (node) => eras.push(readEra(node)));
  return eras;
}

function currentReference() {
  return REFERENCES.find((item) => item.key === referenceKey) || REFERENCES[0];
}

/* Toutes les grandeurs affichées sont recalculées ici depuis le DOM ; aucune
   valeur chiffrée n'est figée dans les libellés du panneau. */
function derive(host) {
  const eras = collectEras(host);
  const usable = eras.filter((era) => Number.isFinite(era.amplitude) && era.amplitude > 0);
  const total = usable.reduce((sum, era) => sum + era.amplitude, 0);

  let current = null;
  if (host && typeof host.querySelector === 'function') {
    const node = host.querySelector(CURRENT_ERA_SELECTOR);
    if (node) current = readEra(node);
  }

  let max = null;
  let min = null;
  usable.forEach((era) => {
    if (!max || era.amplitude > max.amplitude) max = era;
    if (!min || era.amplitude < min.amplitude) min = era;
  });

  const ref = currentReference();
  const amp = current ? current.amplitude : NaN;
  const factor = min && max && min.amplitude > 0 ? max.amplitude / min.amplitude : NaN;
  const ratio = Number.isFinite(amp) ? amp / ref.years : NaN;
  const share = total > 0 && Number.isFinite(amp) ? (amp / total) * 100 : NaN;
  const cmParAn = total > 0 ? 100 / total : NaN;
  const currentCm = Number.isFinite(amp) ? amp * cmParAn : NaN;

  return {
    eras, usable, total, current, ref, amp, max, min, factor,
    ratio, share, cmParAn, currentCm,
    units: Number.isFinite(ratio) && ratio > 0 ? ratio : NaN,
  };
}

/* Montage du panneau : un laboratoire, dix lignes, une par chantier. Chaque
   chantier possède son propre nœud et son propre attribut de données. */
function mountPanel(make, parent) {
  const panel = ensureNode(make, IDS.panel, 'section', 'e096-panel', parent);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', IDS.title);

  const title = ensureNode(make, IDS.title, 'h2', 'e096-title', panel);
  write(title, 'Amplitude vs référence — comparaison chiffrée');
  const lede = ensureNode(make, IDS.lede, 'p', 'e096-lede', panel);
  write(lede, 'Laboratoire de lecture : l’amplitude de l’ère courante est comparée à une référence nommée. Chaque nombre est recalculé depuis les bornes portées par la frise ; le panneau décrit, il ne modifie aucune donnée.');

  const refsGroup = ensureNode(make, IDS.refs, 'div', 'e096-refs', panel);
  refsGroup.setAttribute('role', 'radiogroup');
  refsGroup.setAttribute('aria-label', 'Référence de comparaison');
  refsGroup.replaceChildren();
  REFERENCES.forEach((item) => {
    const choice = make('span', 'e096-choice');
    const input = ensureNode(make, item.inputId, 'input', 'e096-radio', choice);
    input.setAttribute('type', 'radio');
    input.setAttribute('name', RADIO_NAME);
    input.setAttribute('value', item.key);
    const label = ensureNode(make, item.labelId, 'label', 'e096-label', choice);
    label.setAttribute('for', item.inputId);
    write(label, item.label + ' (' + formatEntier(item.years) + ' ans)');
    refsGroup.appendChild(choice);
  });

  const note = ensureNode(make, IDS.note, 'p', 'e096-note', panel);
  write(note, 'La référence est une convention de mesure pédagogique, pas une date de l’atlas : « une vie humaine » est une approximation assumée.');

  const rows = make('dl', 'e096-rows');
  const definitions = [
    ['amp', 'E096-01 · Amplitude', 'val'],
    ['refval', 'E096-02 · Référence', 'val'],
    ['ratio', 'E096-03 · Rapport A ÷ R', 'val'],
    ['extremes', 'E096-04 · Ères comparées', 'val'],
    ['dispro', 'E096-05 · Facteur long/court', 'val-e096dispro'],
    ['echelle', 'E096-06 · Échelle 1 mètre', 'val'],
    ['part', 'E096-07 · Part du total', 'val'],
  ];
  const cells = {};
  definitions.forEach(([id, label, valueClass]) => {
    const row = make('div', 'e096-row');
    row.append(make('dt', 'e096-key', label));
    const value = make('dd', 'e096-' + valueClass);
    value.id = IDS[id];
    row.appendChild(value);
    rows.appendChild(row);
    cells[id] = value;
  });

  const bar = ensureNode(make, IDS.bar, 'div', 'e096-bar', panel);
  bar.setAttribute('role', 'img');
  const barTrack = ensureNode(make, IDS.barTrack, 'div', 'e096-bar-track', bar);
  const barDesc = ensureNode(make, IDS.barDesc, 'p', 'e096-bar-desc', panel);
  const bilan = ensureNode(make, IDS.bilan, 'p', 'e096-bilan', panel);
  const metric = ensureNode(make, IDS.metric, 'p', 'e096-metric', panel);

  panel.replaceChildren(title, lede, refsGroup, note, rows, bar, barDesc, bilan, metric);
  return { panel, refsGroup, bar, barTrack, barDesc, bilan, metric, cells };
}

/* E096-08 : blocs de référence empilés, déterministes, sans aléa. Le nombre
   de blocs est plafonné pour rester lisible ; le rapport exact reste en texte. */
function paintBar(make, track, d) {
  track.replaceChildren();
  if (!Number.isFinite(d.units) || !(d.total > 0) || !Number.isFinite(d.amp)) {
    setData(track, 'e096Blocks', '0');
    return 0;
  }
  const rawUnits = d.units;
  const count = Math.max(1, Math.min(24, Math.round(rawUnits)));
  for (let i = 0; i < count; i += 1) {
    const block = make('div', 'e096-block');
    block.style.width = (100 / count).toFixed(3) + '%';
    block.style.flexBasis = (100 / count).toFixed(3) + '%';
    block.textContent = String(i + 1);
    block.setAttribute('data-e096-bloc', String(i + 1));
    track.appendChild(block);
  }
  setData(track, 'e096Blocks', String(count));
  return count;
}

function paint() {
  const r = refs;
  if (!r || !r.panel || !r.panel.isConnected) return;

  const d = derive(r.host);
  const ampLabel = Number.isFinite(d.amp) ? formatEntier(d.amp) + ' ans' : 'amplitude non calculable';
  const currentName = d.current ? d.current.name : 'ère courante';

  /* E096-01 — amplitude de l'ère courante dérivée des bornes du DOM. */
  write(r.cells.amp, Number.isFinite(d.amp)
    ? `« ${currentName} » : ${ampLabel} — amplitude = |fin − début| = |${formatEntier(d.current.end)} − ${formatEntier(d.current.start)}|.`
    : `« ${currentName} » : ${ampLabel} (bornes absentes de la frise).`);

  /* E096-02 — référence nommée, valeur et nature de convention. */
  write(r.cells.refval, `Référence R = ${d.ref.label} : ${formatEntier(d.ref.years)} ans (unité de comparaison, pas une date).`);

  /* E096-03 — rapport explicite avec sa formule. */
  write(r.cells.ratio, Number.isFinite(d.ratio)
    ? `A ÷ R = ${formatEntier(d.amp)} ÷ ${formatEntier(d.ref.years)} ≈ ${formatDecimal(d.ratio, 2)} fois la référence.`
    : 'Rapport indisponible : amplitude de l’ère courante non calculable.');

  /* E096-04 — ère la plus longue et ère la plus courte, dérivées du DOM. */
  write(r.cells.extremes, d.max && d.min
    ? `${d.usable.length} ère(s) exploitable(s) sur ${d.eras.length} : la plus longue est « ${d.max.name} » (${formatEntier(d.max.amplitude)} ans), la plus courte « ${d.min.name} » (${formatEntier(d.min.amplitude)} ans).`
    : 'Aucune ère exploitable : la frise ne porte pas de bornes numériques.');

  /* E096-05 — facteur de disproportion, état doublé en texte et en attribut. */
  const dispro = Number.isFinite(d.factor) && d.factor >= DISPROPORTION_SEUIL;
  write(r.cells.dispro, Number.isFinite(d.factor)
    ? `Facteur long ÷ court = ${formatDecimal(d.factor, 1)} — ${dispro ? 'DISPROPORTION FORTE (≥ ' + DISPROPORTION_SEUIL + ')' : 'écart modéré'}.`
    : 'Facteur indisponible : aucune paire d’ères comparables.');

  /* E096-06 — mise à l'échelle fictive 1 mètre = durée cumulée. */
  write(r.cells.echelle, Number.isFinite(d.cmParAn) && Number.isFinite(d.currentCm)
    ? `Si les ères mises bout à bout occupaient 1 mètre (100 cm), 1 an vaudrait ${formatDecimal(d.cmParAn, 3)} cm et « ${currentName} » mesurerait ${formatDecimal(d.currentCm, 1)} cm.`
    : 'Échelle indisponible : durée cumulée des ères non calculable.');

  /* E096-07 — part de l'ère courante dans la durée cumulée. */
  write(r.cells.part, Number.isFinite(d.share)
    ? `${formatDecimal(d.share, 1)} % de la durée cumulée (${formatEntier(d.amp)} / ${formatEntier(d.total)} ans).`
    : 'Part indisponible : durée cumulée non calculable.');

  /* E096-08 — repère visuel en blocs de référence, toujours légendé en texte. */
  const count = paintBar(r.make, r.barTrack, d);
  write(r.barDesc, count > 0
    ? `Repère visuel : ${count} bloc(s) de ${d.ref.label} (${formatEntier(d.ref.years)} ans) représentent ${ampLabel}. Le texte ci-dessus donne le rapport exact ; la barre n’est qu’une illustration.`
    : 'Repère visuel indisponible : le rapport exact figure dans la ligne E096-03.');
  r.bar.setAttribute('aria-label', count > 0
    ? `Barre de ${count} blocs, chacun valant ${d.ref.label} (${formatEntier(d.ref.years)} ans), pour une amplitude de ${ampLabel}. Le détail chiffré figure dans la liste.`
    : 'Barre de comparaison indisponible ; voir la ligne E096-03.');

  /* E096-09 — synthèse pédagogique en une phrase, toutes grandeurs comprises. */
  write(r.bilan, Number.isFinite(d.ratio) && Number.isFinite(d.share) && d.max && d.min
    ? `À retenir : l’amplitude de « ${currentName} » (${ampLabel}) vaut ${formatDecimal(d.ratio, 2)} × ${d.ref.label}, soit ${formatDecimal(d.share, 1)} % de la durée cumulée des ères ; « ${d.max.name} » est ${formatDecimal(d.factor, 1)} fois plus long que « ${d.min.name} ». Ces nombres sont recalculés depuis le DOM, jamais figés.`
    : 'À retenir : les grandeurs nécessaires à la comparaison ne sont pas toutes disponibles dans la frise courante ; aucun chiffre n’est inventé pour combler le vide.');

  /* E096-10 — diagnostic de rendu, témoin d'idempotence. */
  write(r.metric, `Rendus : ${installCount} · ères : ${d.usable.length}/${d.eras.length} · référence : ${d.ref.key} · durée cumulée : ${formatEntier(d.total)} ans · mouvement réduit : ${r.reduced ? 'oui' : 'non'}.`);

  /* Attributs de données : preuves mécaniques, consultables sans la couleur. */
  setData(r.panel, 'e096Amplitude', Number.isFinite(d.amp) ? String(Math.round(d.amp)) : '');
  setData(r.panel, 'e096Reference', d.ref.key);
  setData(r.panel, 'e096ReferenceYears', String(d.ref.years));
  setData(r.panel, 'e096Ratio', Number.isFinite(d.ratio) ? d.ratio.toFixed(4) : '');
  setData(r.panel, 'e096Eras', String(d.usable.length));
  setData(r.panel, 'e096Max', d.max ? String(Math.round(d.max.amplitude)) : '');
  setData(r.panel, 'e096Min', d.min ? String(Math.round(d.min.amplitude)) : '');
  setData(r.panel, 'e096Factor', Number.isFinite(d.factor) ? d.factor.toFixed(3) : '');
  setData(r.panel, 'e096Dispro', dispro ? 'alerte' : 'ok');
  setData(r.panel, 'e096Share', Number.isFinite(d.share) ? d.share.toFixed(2) : '');
  setData(r.panel, 'e096CmParAn', Number.isFinite(d.cmParAn) ? d.cmParAn.toFixed(5) : '');
  setData(r.panel, 'e096Blocks', String(count));
  setData(r.panel, 'e096Reduced', r.reduced ? '1' : '0');
  setData(r.panel, 'e096Renders', String(installCount));
}

/* E096-02 : un seul écouteur « change » sur le groupe de références, réattaché
   uniquement si la coque a reconstruit le nœud. Aucun timer, aucun aléa. */
function onReferenceChange(event) {
  const target = event.target;
  if (!target || target.getAttribute('name') !== RADIO_NAME) return;
  if (!REFERENCES.some((item) => item.key === target.value)) return;
  if (target.value === referenceKey) return;
  referenceKey = target.value;
  paint();
}

register('E096', ctx => {
  const make = ctx && typeof ctx.el === 'function' ? ctx.el : null;
  if (!make || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const mounted = mountPanel(make, host);

  if (boundGroup !== mounted.refsGroup) {
    mounted.refsGroup.addEventListener('change', onReferenceChange);
    boundGroup = mounted.refsGroup;
  }
  REFERENCES.forEach((item) => {
    const input = document.getElementById(item.inputId);
    if (input) input.checked = item.key === referenceKey;
  });

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    make, host, reduced,
    panel: mounted.panel, refsGroup: mounted.refsGroup, bar: mounted.bar,
    barTrack: mounted.barTrack, barDesc: mounted.barDesc,
    bilan: mounted.bilan, metric: mounted.metric, cells: mounted.cells,
  };
  paint();
});
