import { register } from './registry.js';

/* Lentille M03 — fidélité du picking et de la découpe (domaine A : rendu & moteur WebGL).
 *
 * Sources lues, toutes locales :
 *   public/globe-palette.json   — 196 codes, 6 niveaux RVB (24, 64, 104, 144, 184, 224), 2048×1024 ;
 *   public/globe-pick.png       — texture équirectangulaire RGBA, 2048×1024, alpha 255 partout ;
 *   public/globe-engine.js      — lecture de la palette, codeAtLocalPoint(), debugPick(), shader ;
 *   src/views/globe-reveal.js   — PALETTE de 10 codes, TOLERANCE = 18, masque de découpe.
 *
 * Le moteur et le module de révélation ne sont pas possédés par cette lentille :
 * aucun seuil n'est modifié ici. Le module installe un banc de contrôle de fidélité
 * (sondes déterministes via debugPick, garde d'identité reveal/courant, observateurs
 * pointeur et sélection) et affiche son résultat dans un panneau local. Tout est figé,
 * rien n'est aléatoire, aucun appel réseau n'est ajouté.
 */

const STYLE_ID = 'monde-m03';
const PANEL_ID = 'monde-m03-panel';
const LINE_COUNT = 10;

const lineId = (n) => `monde-m03-line-${String(n).padStart(2, '0')}`;

/* Référence figée depuis public/globe-palette.json (196 codes, ordre d'origine). */
const PALETTE_CODES = Object.freeze([
  'ZA', 'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'ER', 'ET',
  'GA', 'GM', 'GH', 'GN', 'GQ', 'GW', 'MU', 'CV', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MA',
  'MR', 'MZ', 'NA', 'NE', 'NG', 'UG', 'CF', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'SD', 'SS', 'SZ',
  'TZ', 'TD', 'TG', 'TN', 'ZM', 'ZW', 'BZ', 'CR', 'GT', 'HN', 'NI', 'PA', 'SV', 'CA', 'US', 'MX',
  'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE', 'AF', 'SA', 'AM', 'AZ',
  'BH', 'BD', 'BT', 'MM', 'BN', 'KH', 'CN', 'KP', 'KR', 'AE', 'GE', 'IN', 'ID', 'IQ', 'IR', 'IL',
  'JP', 'JO', 'KZ', 'KG', 'KW', 'LA', 'LB', 'MY', 'MV', 'MN', 'NP', 'OM', 'UZ', 'PK', 'PS', 'PH',
  'QA', 'SG', 'LK', 'SY', 'TJ', 'TW', 'TH', 'TL', 'TM', 'TR', 'VN', 'YE', 'AG', 'BS', 'BB', 'CU',
  'DM', 'GD', 'HT', 'JM', 'DO', 'KN', 'VC', 'LC', 'TT', 'AL', 'DE', 'AD', 'AT', 'BE', 'BY', 'BA',
  'BG', 'CY', 'VA', 'HR', 'DK', 'ES', 'EE', 'FI', 'FR', 'GR', 'HU', 'IE', 'IS', 'IT', 'LV', 'LI',
  'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NO', 'NL', 'PL', 'PT', 'RO', 'GB', 'RU', 'SM', 'RS',
  'SK', 'SI', 'SE', 'CH', 'CZ', 'UA', 'AU', 'FJ', 'MH', 'SB', 'KI', 'FM', 'NR', 'NZ', 'PW', 'PG',
  'WS', 'TO', 'TV', 'VU',
]);
const PALETTE_SET = new Set(PALETTE_CODES);

/* Les 10 seuls pays documentés : codes et RVB exacts du JSON, identiques à la
 * table PALETTE de src/views/globe-reveal.js et à src/data/dataset.js. */
const DOC_RGB = Object.freeze({
  FR: [184, 64, 104],
  GB: [184, 184, 184],
  US: [64, 184, 104],
  DE: [144, 224, 24],
  IT: [184, 104, 64],
  ES: [184, 24, 224],
  CN: [104, 104, 104],
  IN: [104, 144, 64],
  JP: [104, 184, 24],
  EG: [24, 104, 64],
});
const DOC_CODES = Object.freeze(Object.keys(DOC_RGB));
const DOC_SET = new Set(DOC_CODES);

/* Mesuré sur public/globe-pick.png livré : 26 codes de la palette n'ont aucune
 * occurrence exacte de leur triplet RVB dans la texture (micro-États surtout). */
const ABSENT_CODES = Object.freeze([
  'KM', 'CV', 'ST', 'SC', 'BH', 'MV', 'SG', 'AG', 'BB', 'DM', 'KN', 'VC', 'LC',
  'AD', 'VA', 'LI', 'MT', 'MC', 'SM', 'MH', 'KI', 'FM', 'NR', 'PW', 'TO', 'TV',
]);
const ABSENT_SET = new Set(ABSENT_CODES);

/* Fiches chiffrées, mesurées sur les fichiers livrés (aucune estimation inventée). */
const FACTS = Object.freeze({
  codes: 196,
  absent: 26,
  present: 170,
  pickWidth: 2048,
  pickHeight: 1024,
  oceanPx: 1605986,
  oceanPct: '76,58',
  darkCoastPx: 1901,
  blendPx: 42840,
  ambiguousPx: 21047,
  revealTolerance: 18,
  shaderThreshold: 0.018,
  throttleMs: 45,
  segments: 64,
  sagitta: 0.0012,
  /* Pixels supplémentaires intégrés au masque TOLERANCE=18 par rapport aux
   * pixels de couleur exacte : mesure sur globe-pick.png. */
  maskGain: Object.freeze({ FR: 89, GB: 72, US: 328, DE: 10, IT: 34, ES: 15, CN: 1045, IN: 140, JP: 72, EG: 769 }),
});

const RULES = `
#${PANEL_ID}{position:absolute;right:8px;bottom:8px;z-index:6;max-width:272px;
  padding:6px 9px;border:1px solid rgba(214,178,110,.34);border-radius:8px;
  background:rgba(6,10,16,.82);color:#cfd8e6;pointer-events:none;text-align:right;
  font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
#${PANEL_ID} .m03-title{margin:0 0 3px;color:#e6c98a;font-weight:600;letter-spacing:.03em}
#${PANEL_ID} .m03-line{margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#${PANEL_ID} .m03-line[data-state="warn"]{color:#ffce88}
@media(max-width:700px){#${PANEL_ID}{max-width:196px;font-size:10px}}
`;

/* État du module : un seul panneau ; les abonnements sont réarmés à chaque
 * rendu car le registre vide ses tableaux, les observateurs sont déplacés sur
 * le host courant plutôt que perdus sur un nœud déconnecté. */
let engine = null;
let hostNode = null;
let nodeFactory = null;
let announce = null;
let revealApi = null;
let selectionObserver = null;
let selectionHost = null;
let pointerHost = null;
let lastPointer = null;
let staleCount = 0;
let cycleCount = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isUnit(local) {
  if (!Array.isArray(local) || local.length < 3) return false;
  const norm = Math.hypot(local[0], local[1], local[2]);
  return Number.isFinite(norm) && Math.abs(norm - 1) <= 0.02;
}

function setLine(n, text, warn) {
  const node = document.getElementById(lineId(n));
  if (!node) return;
  if (node.textContent !== text) node.textContent = text;
  if (warn) node.dataset.state = 'warn';
  else if (node.dataset.state) delete node.dataset.state;
}

function ensurePanel(host) {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = nodeFactory ? nodeFactory('aside') : document.createElement('aside');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-label', 'Diagnostic de fidélité du picking M03');
    const title = nodeFactory ? nodeFactory('p', 'm03-title', 'M03 · fidélité du picking')
      : document.createElement('p');
    if (!title.className) title.className = 'm03-title';
    if (!title.textContent) title.textContent = 'M03 · fidélité du picking';
    panel.appendChild(title);
    for (let n = 1; n <= LINE_COUNT; n += 1) {
      const line = nodeFactory ? nodeFactory('p', 'm03-line') : document.createElement('p');
      if (!line.className) line.className = 'm03-line';
      line.id = lineId(n);
      panel.appendChild(line);
    }
  }
  if (panel.parentNode !== host) host.appendChild(panel);
  return panel;
}

/* Remet les dix lignes dans leur état de référence à chaque rendu de la vue. */
function paintFacts() {
  setLine(1, `palette ${FACTS.codes} codes · ${DOC_CODES.length} pays documentés`);
  setLine(2, 'UV : sonde en attente');
  setLine(3, `palette : ${FACTS.absent} codes sans pixel exact`);
  setLine(4, `frange océan : ${FACTS.darkCoastPx} px rejetés`);
  setLine(5, `blends ${FACTS.blendPx} px · ${FACTS.ambiguousPx} ambigus`);
  setLine(6, `découpe T${FACTS.revealTolerance} : EG +${FACTS.maskGain.EG} px · CN +${FACTS.maskGain.CN} px`);
  setLine(7, `limbe : marge 15 % · r=1 vs ${FACTS.segments} segments`);
  setLine(8, `survol périmé : ${staleCount}`);
  setLine(9, 'tactile : découpe absente (moteur)');
  setLine(10, `cycle ${cycleCount} · grille déterministe`);
}

function pickAt(clientX, clientY) {
  if (!engine || typeof engine.debugPick !== 'function') return null;
  try {
    return engine.debugPick(clientX, clientY);
  } catch {
    return null;
  }
}

/* Sondes reproductibles : grille 3×3 dans la zone centrale (marge de 15 % par
 * rapport au limbe, cf. M03-07) et colonne verticale pour la convention UV. */
function probeCycle() {
  if (!hostNode || !engine) return;
  const canvas = hostNode.querySelector('canvas') || hostNode;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 20) return;
  const at = (nx, ny) => ({ x: rect.left + rect.width * nx, y: rect.top + rect.height * ny });

  let sampled = 0;
  let conform = 0;
  let unknown = 0;
  let absent = 0;
  let nonUnit = 0;
  let unstable = 0;
  let discarded = 0;
  for (const nx of [0.4, 0.5, 0.6]) {
    for (const ny of [0.4, 0.5, 0.6]) {
      const point = at(nx, ny);
      const result = pickAt(point.x, point.y);
      if (!result || !result.code) { discarded += 1; continue; }
      sampled += 1;
      if (PALETTE_SET.has(result.code)) conform += 1;
      else unknown += 1;
      if (ABSENT_SET.has(result.code)) absent += 1;
      if (!isUnit(result.local)) nonUnit += 1;

      /* Sondes jumelles à +2 px : un changement de code à cette distance
       * matérialise l'absence de plafond sur la distance de couleur (M03-05). */
      const right = pickAt(point.x + 2, point.y);
      const below = pickAt(point.x, point.y + 2);
      const flipped = (right && right.code && right.code !== result.code)
        || (below && below.code && below.code !== result.code)
        || (!right && result.code)
        || (!below && result.code);
      if (flipped) unstable += 1;
    }
  }

  let inversions = 0;
  let previous = null;
  for (const ny of [0.4, 0.45, 0.5, 0.55, 0.6]) {
    const point = at(0.5, ny);
    const result = pickAt(point.x, point.y);
    if (!result || !isUnit(result.local)) { previous = null; continue; }
    const latitudeAxis = result.local[1];
    if (previous !== null && latitudeAxis > previous + 1e-6) inversions += 1;
    previous = latitudeAxis;
  }

  cycleCount += 1;
  setLine(1, `palette ${conform}/${sampled} codes conformes`, unknown > 0);
  setLine(2, `UV : ${inversions} inversion${inversions > 1 ? 's' : ''} · ${nonUnit} hors unité`,
    inversions > 0 || nonUnit > 0);
  setLine(4, `frange océan ${FACTS.darkCoastPx} px · rejets sonde ${discarded}`);
  setLine(5, `blends ${FACTS.blendPx} · ambigus ${FACTS.ambiguousPx} · inst. ${unstable}`, unstable > 0);
  if (absent > 0) setLine(3, `code sans pixel exact rencontré : ${absent}`, true);
  setLine(7, `limbe : ${nonUnit} pick hors unité`, nonUnit > 0);
  setLine(10, `cycle ${cycleCount} · 1 grille de 9 sondes`);
}

function onPointerMove(event) {
  if (!event || event.pointerType === 'touch') return;
  lastPointer = { x: event.clientX, y: event.clientY };
}

function onPointerDown(event) {
  if (!event || event.pointerType !== 'touch') return;
  const result = pickAt(event.clientX, event.clientY);
  const code = result && result.code ? result.code : 'hors globe';
  setLine(9, `tactile : ${code} · découpe absente`, true);
}

function onHover(payload) {
  const code = payload && payload.code ? payload.code : null;

  /* Un code annoncé qui ne correspond plus au pixel courant signale un survol
   * périmé (throttle du moteur + rotation automatique). */
  if (code && lastPointer) {
    const fresh = pickAt(lastPointer.x, lastPointer.y);
    if (fresh && fresh.code && fresh.code !== code) {
      staleCount += 1;
      setLine(8, `survol périmé : ${staleCount} (${code} → ${fresh.code})`, true);
      if (staleCount === 1 && typeof announce === 'function') {
        announce('Picking : survol périmé détecté pendant la rotation.');
      }
    }
  }

  /* Le pays que la révélation découpe doit être le même que celui que le
   * picking a désigné (identité seulement : les pixels du masque ne sont pas
   * exposés par le module de révélation). */
  let current = null;
  try {
    current = revealApi && typeof revealApi.current === 'function' ? revealApi.current() : null;
  } catch {
    current = null;
  }
  if (code && current && current.code && current.code !== code) {
    setLine(6, `découpe : écart ${code} ≠ ${current.code}`, true);
  }
}

function onLeave() {
  lastPointer = null;
}

function bindPointer(host) {
  if (!host || pointerHost === host) return;
  if (pointerHost) {
    pointerHost.removeEventListener('pointermove', onPointerMove);
    pointerHost.removeEventListener('pointerdown', onPointerDown);
  }
  pointerHost = host;
  host.addEventListener('pointermove', onPointerMove, { passive: true });
  host.addEventListener('pointerdown', onPointerDown, { passive: true });
}

function watchSelection(host) {
  if (typeof MutationObserver !== 'function' || !host || selectionHost === host) return;
  if (selectionObserver) selectionObserver.disconnect();
  selectionHost = host;
  selectionObserver = new MutationObserver(() => {
    const code = host.getAttribute('data-globe-selected') || '';
    if (!code) return;
    if (ABSENT_SET.has(code)) {
      setLine(3, `sélection ${code} : aucun pixel exact`, true);
    } else if (!PALETTE_SET.has(code)) {
      setLine(1, `sélection ${code} : code hors palette`, true);
    } else if (!DOC_SET.has(code)) {
      setLine(6, `découpe indisponible pour ${code}`, true);
    }
  });
  selectionObserver.observe(host, { attributes: true, attributeFilter: ['data-globe-selected'] });
}

register('M03', (ctx) => {
  hostNode = ctx.host || null;
  nodeFactory = typeof ctx.el === 'function' ? ctx.el : null;
  announce = typeof ctx.say === 'function' ? ctx.say : null;
  revealApi = ctx.reveal || null;

  if (!ctx.css || typeof ctx.css !== 'function') return;
  ctx.css(STYLE_ID, RULES);
  if (!hostNode) return;

  ensurePanel(hostNode);
  paintFacts();

  /* runMondeEnhancements() vide les trois tableaux à chaque rendu : on réarme
   * un onReady/onHover/onLeave par appel, sans accumulation ni verrou muet. */
  if (typeof ctx.onReady === 'function') {
    ctx.onReady((payload) => {
      if (payload && payload.engine) engine = payload.engine;
      else if (typeof window !== 'undefined' && window.VECTEMPOREL_GLOBE) engine = window.VECTEMPOREL_GLOBE;
      probeCycle();
    });
  }
  if (typeof ctx.onHover === 'function') ctx.onHover(onHover);
  if (typeof ctx.onLeave === 'function') ctx.onLeave(onLeave);

  /* Le host peut être remplacé par un rendu : on déplace les observateurs et
   * les écouteurs au lieu de les laisser sur un nœud déconnecté. */
  bindPointer(hostNode);
  watchSelection(hostNode);
  if (engine) probeCycle();
});
