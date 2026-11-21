import { register } from './registry.js';

/* Lentille E080 — passe V2, domaine H (responsive & mobile).
 * Thème canonique : « polices système et mesure 60–75 caractères/ligne ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E080.md — chantiers E080-01 à E080-10.
 * Fichier possédé : src/views/chronology/v2/E080.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e080', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e080- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E080', …) ;
 * - aucune police distante, aucun @import, aucune mesure aléatoire, aucun
 *   minuteur, aucune boucle rAF, aucun réseau, aucune journalisation, aucun
 *   HTML brut, aucune région live supplémentaire ;
 * - l'état est porté par le texte visible et par des attributs data-, jamais
 *   par la seule couleur ni par un mouvement.
 */

const CSS_ID = 'chronology-v2-e080';
const PANEL_ID = 'chronology-v2-e080-panel';
const TITLE_ID = 'chronology-v2-e080-title';
const ROWS_ID = 'chronology-v2-e080-rows';
const FONT_ID = 'chronology-v2-e080-font';
const SIZE_ID = 'chronology-v2-e080-size';
const WIDTH_ID = 'chronology-v2-e080-width';
const MEASURE_ID = 'chronology-v2-e080-measure';
const TARGET_ID = 'chronology-v2-e080-target';
const NARROW_ID = 'chronology-v2-e080-narrow';
const WRAP_ID = 'chronology-v2-e080-wrap';
const DIGITS_ID = 'chronology-v2-e080-digits';
const RESIZES_ID = 'chronology-v2-e080-resizes';
const SCALE_ID = 'chronology-v2-e080-scale';
const MARKER_ID = 'chronology-v2-e080-marker';
const PROBE_ID = 'chronology-v2-e080-probe';
const GLYPHS_ID = 'chronology-v2-e080-glyphs';
const BILAN_ID = 'chronology-v2-e080-bilan';
const HOST_ID = 'atlas-chrono-main';

const NARROW_QUERY = '(max-width: 620px)';
const TARGET_MIN = 60;
const TARGET_MAX = 75;
const MEASURE_CH = 72;
const SCALE_MIN = 40;
const SCALE_MAX = 90;
const PROBE_GLYPHS = 100;

/* E080-01 à E080-03, E080-05, E080-07, E080-08 : feuille unique. La police
   système est déclarée explicitement (var(--sans), styles.css:17), la taille
   passe de 8–9 px à 13 px, la mesure est bornée en ch, les mots longs cassent
   et les chiffres sont tabulaires. Aucune règle ne charge de police distante. */
const CSS = `
  #${PANEL_ID} {
    position: relative;
    max-width: ${MEASURE_CH}ch;
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft);
    font-family: var(--sans);
    font-size: 13px; line-height: 1.55;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    hyphens: auto;
  }
  #${PANEL_ID} .v2e080-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--sans); font-size: 15px; font-weight: 600;
  }
  #${PANEL_ID} .v2e080-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e080-rows { margin: 0; }
  #${PANEL_ID} .v2e080-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e080-key { flex: 0 0 132px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e080-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e080-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 11px;
  }
  /* E080-05 : règle de mesure. La zone 60–75 est délimitée en texte dans le
     panneau ; le repère mobile ne porte jamais seul le verdict. */
  #${PANEL_ID} .v2e080-scale {
    position: relative; height: 10px; margin: 10px 0 6px;
    border: 1px solid var(--line); border-radius: 6px;
    background: rgba(255,255,255,.02);
  }
  #${PANEL_ID} .v2e080-zone {
    position: absolute; top: 0; bottom: 0; left: 40%; width: 30%;
    border-inline: 1px solid var(--gold); background: rgba(230,185,111,.18);
  }
  #${PANEL_ID} .v2e080-marker {
    position: absolute; top: -3px; bottom: -3px; left: 50%;
    width: 2px; background: var(--gold-bright);
  }
  /* E080-04 : sonde invisible mais mise en page, donc mesurable. */
  #${PANEL_ID} .v2e080-probe {
    position: absolute; top: 0; left: 0; right: 0;
    width: auto; max-width: ${MEASURE_CH}ch;
    visibility: hidden; pointer-events: none;
    font: inherit; line-height: inherit; white-space: pre;
  }
  #${PANEL_ID} .v2e080-glyphs { white-space: pre; }
  /* E080-06 : sous 620 px, la mesure cède la priorité au zoom et au tactile. */
  @media (max-width: 620px) {
    #${PANEL_ID} { max-width: 100%; padding: 8px 10px; font-size: 12px; }
    #${PANEL_ID} .v2e080-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e080-key { flex-basis: 100%; }
  }
  /* E080-05 : en couleurs forcées, le verdict reste lisible par le texte et
     par les bordures, sans dépendre de la teinte dorée. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e080-title,
    #${PANEL_ID} .v2e080-key,
    #${PANEL_ID} .v2e080-val,
    #${PANEL_ID} .v2e080-bilan { color: CanvasText; }
    #${PANEL_ID} .v2e080-zone { border-color: CanvasText; background: Canvas; }
    #${PANEL_ID} .v2e080-marker { background: CanvasText; }
  }
`;

let installs = 0;
let narrowBound = false;
let resizeBound = false;
let narrow = false;
let resizes = 0;
let refs = {
  panel: null, font: null, size: null, width: null, measure: null,
  target: null, narrow: null, wrap: null, digits: null, resizes: null,
  marker: null, probe: null, glyphs: null, bilan: null,
};

/* E080-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. */
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

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

function addRow(list, make, label, id) {
  const row = make('div', 'v2e080-row');
  const key = make('dt', 'v2e080-key', label);
  const val = make('dd', 'v2e080-val');
  val.id = id;
  row.append(key, val);
  list.appendChild(row);
  return val;
}

/* E080-04 : la largeur d'un « 0 » donne l'unité ch ; on la mesure sur 100
   glyphes pour réduire l'erreur d'arrondi, puis on la compare à la largeur
   réelle de la sonde. Aucune valeur n'est codée en dur dans le libellé. */
function measure() {
  const probe = refs.probe;
  const glyphs = refs.glyphs;
  if (!probe || !glyphs || !probe.isConnected || !glyphs.isConnected) return null;
  const sample = '0'.repeat(PROBE_GLYPHS);
  if (glyphs.textContent !== sample) glyphs.textContent = sample;
  const glyph = glyphs.getBoundingClientRect().width / PROBE_GLYPHS;
  const width = probe.getBoundingClientRect().width;
  if (!(glyph > 0) || !(width > 0)) return null;
  return { glyph, width, chars: Math.round(width / glyph) };
}

/* E080-01, E080-02, E080-03, E080-04, E080-05, E080-06, E080-07, E080-08 :
   tout l'état est écrit en texte visible dédupliqué et publié en attributs
   data-. Aucune région live n'est ajoutée, aucune information ne repose sur
   la seule couleur. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  const style = typeof window !== 'undefined' && window.getComputedStyle
    ? window.getComputedStyle(r.panel)
    : null;
  const family = style && style.fontFamily ? style.fontFamily : 'police système déclarée';
  const size = style && style.fontSize ? style.fontSize : '—';
  const leading = style && style.lineHeight ? style.lineHeight : '—';
  const m = measure();
  const chars = m ? m.chars : null;
  const inTarget = chars !== null && chars >= TARGET_MIN && chars <= TARGET_MAX;

  write(r.font, family);
  write(r.size, `${size} · interligne ${leading}`);
  write(r.width, `max-width ${MEASURE_CH} ch (feuille unique)`);
  write(r.measure, chars === null
    ? 'Mesure indisponible : la sonde n’est pas mesurable.'
    : `${chars} caractères/ligne estimés sur ${Math.round(m.width)} px (glyphe « 0 » : ${m.glyph.toFixed(2)} px).`);
  write(r.target, chars === null
    ? `Cible ${TARGET_MIN}–${TARGET_MAX} : non évaluable.`
    : `Cible ${TARGET_MIN}–${TARGET_MAX} : ${inTarget ? 'atteinte' : 'non atteinte'}${narrow ? ' — repli écran étroit actif' : ''}.`);
  write(r.narrow, narrow
    ? `Repli ${NARROW_QUERY} : actif, largeur libre pour préserver le zoom.`
    : `Repli ${NARROW_QUERY} : inactif, mesure bornée.`);
  write(r.wrap, 'Mots longs : retour à la ligne autorisé (overflow-wrap: anywhere, hyphens: auto, langue fr).');
  write(r.digits, 'Chiffres : tabulaires (font-variant-numeric: tabular-nums) pour une lecture stable.');
  write(r.resizes, String(resizes));
  write(r.bilan, `Bilan : police système déclarée, cible ${TARGET_MIN}–${TARGET_MAX} caractères, ${installs} rendu(s), ${resizes} redimensionnement(s). Aucune police distante, aucun aléa, aucun minuteur.`);

  if (r.marker && chars !== null) {
    const ratio = (chars - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);
    const percent = Math.max(0, Math.min(100, ratio * 100));
    r.marker.style.left = `${percent.toFixed(1)}%`;
  }

  setData(r.panel, 'e080Font', family.indexOf('system-ui') >= 0 ? 'system' : 'declared');
  setData(r.panel, 'e080FontSize', size);
  setData(r.panel, 'e080MaxWidth', `${MEASURE_CH}ch`);
  setData(r.panel, 'e080Chars', chars === null ? '' : String(chars));
  setData(r.panel, 'e080Target', chars === null ? '' : (inTarget ? '1' : '0'));
  setData(r.panel, 'e080Narrow', narrow ? '1' : '0');
  setData(r.panel, 'e080Wrap', 'anywhere');
  setData(r.panel, 'e080Digits', 'tabular');
  setData(r.panel, 'e080Resizes', String(resizes));
}

/* E080-06 : suivi réactif du basculement étroit par un unique écouteur
   « change » de media query, sans sondage ni minuteur. */
function bindNarrow() {
  if (narrowBound) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const query = window.matchMedia(NARROW_QUERY);
  narrow = Boolean(query.matches);
  const onChange = (event) => {
    narrow = Boolean(event && typeof event.matches === 'boolean' ? event.matches : query.matches);
    paint();
  };
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
  else return false;
  narrowBound = true;
  return true;
}

/* E080-09 : la mesure est recalculée au redimensionnement. Un seul écouteur,
   passif et module-scopé : aucune fuite sur les rendus successifs. */
function bindResize() {
  if (resizeBound) return true;
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return false;
  window.addEventListener('resize', () => {
    resizes += 1;
    paint();
  }, { passive: true });
  resizeBound = true;
  return true;
}

register('E080', (ctx) => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e080-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('lang', 'fr');

  const title = make('h2', 'v2e080-title', 'Polices système et mesure 60–75 caractères');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e080-lede', 'Panneau de lecture : il déclare la police système, borne la mesure à 72 caractères et mesure la largeur réelle. Il ne modifie ni la frise ni la fiche et ne crée aucun mouvement.');

  const list = make('dl', 'v2e080-rows');
  list.id = ROWS_ID;
  const font = addRow(list, make, 'Police', FONT_ID);
  const size = addRow(list, make, 'Taille / interligne', SIZE_ID);
  const width = addRow(list, make, 'Borne CSS', WIDTH_ID);
  const measureRow = addRow(list, make, 'Mesure observée', MEASURE_ID);
  const target = addRow(list, make, 'Cible 60–75', TARGET_ID);
  const narrowRow = addRow(list, make, 'Repli étroit', NARROW_ID);
  const wrap = addRow(list, make, 'Mots longs', WRAP_ID);
  const digits = addRow(list, make, 'Chiffres', DIGITS_ID);
  const resizesRow = addRow(list, make, 'Redimensionnements', RESIZES_ID);

  const scale = make('div', 'v2e080-scale');
  scale.id = SCALE_ID;
  const zone = make('span', 'v2e080-zone');
  const marker = make('span', 'v2e080-marker');
  marker.id = MARKER_ID;
  scale.append(zone, marker);

  const probe = make('div', 'v2e080-probe');
  probe.id = PROBE_ID;
  probe.setAttribute('aria-hidden', 'true');
  const glyphs = make('span', 'v2e080-glyphs');
  glyphs.id = GLYPHS_ID;
  probe.appendChild(glyphs);

  const bilan = make('p', 'v2e080-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, scale, probe, bilan);

  refs = {
    panel, font, size, width, measure: measureRow, target,
    narrow: narrowRow, wrap, digits, resizes: resizesRow,
    marker, probe, glyphs, bilan,
  };

  if (!bindNarrow()) narrow = false;
  bindResize();
  paint();
});
