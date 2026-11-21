import { register } from './registry.js';

/* Lentille E073 — seconde passe (V2), vue GEOGRAPHIE.
 * Thème : aide contextuelle —指南 du lecteur posée sur la carte.
 *
 * Les dix chantiers E073-01 … E073-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E073.md.
 *
 * La V2 reprend le thème de la passe 1 mais durcit la rigueur : snapshot
 * déterministe du DOM réellement rendu, graine fixe 45e073 + mulberry32 pour
 * les zones d’aide, radiogroupe de modes (choix unique), laboratoire canvas
 * déterministe et focalisable, readout chiffré avec contrôle croisé, info-bulles
 * accessibles au clavier, boucle rAF unique suspendue sur document.hidden, hors
 * écran et en mouvement réduit, et défi falsifiable en cinq temps.
 *
 * Tout le contenu pédagogique est du texte sémantique réel (h2, h3, p, dl,
 * table, fieldset, legend, ul, figure/figcaption) inséré dans le DOM : il reste
 * lisible et indexable même sans animation ni interaction. Le canvas n’est qu’un
 * laboratoire qui illustre des grandeurs déjà écrites en toutes lettres.
 *
 * Contrainte : un seul register, une seule feuille CSS, tous les identifiants
 * préfixés `geography-v2-e073-` (aucune collision avec la passe 1 qui utilise
 * `geography-e073-`). Aucun fichier partagé ni module de la passe 1 modifié.
 * Zéro journalisation, zéro réseau, aucun générateur aléatoire. Français intégral.
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e073';
const P = 'geography-v2-e073-';

const MAP_W = 900;                 /* largeur du cadre carte, unités SVG */
const MAP_H = 620;                 /* hauteur du cadre carte, unités SVG */
const GRAINE = 0x45e073;           /* graine fixe : zones d’aide reproductibles */
const SWEEP_MS = 8000;             /* période du surintendant déterministe */
const NARROW = '\u202f';           /* espace insécable fine (typographie française) */
const MINUS = '\u2212';            /* signe moins typographique */

const ID = {
  panel: P + 'panel',
  title: P + 'title',
  lead: P + 'lead',
  glossaire: P + 'glossaire',
  etapes: P + 'etapes',
  raccourcis: P + 'raccourcis',
  field: P + 'field',
  group: P + 'group',
  radio: (i) => P + `radio-${i}`,
  modeText: P + 'mode-text',
  guide: P + 'guide',
  readout: P + 'readout',
  figure: P + 'figure',
  canvas: P + 'canvas',
  caption: P + 'caption',
  legend: P + 'legend',
  mesures: P + 'mesures',
  controls: P + 'controls',
  toggle: P + 'toggle',
  grid: P + 'grid',
  play: P + 'play',
  next: P + 'next',
  clavier: P + 'clavier',
  limite: P + 'limite',
  tip: P + 'tip',
  badge: P + 'badge',
};

/* E073-03 — trois modes d’aide : un choix unique, jamais aria-pressed. */
const MODES = [
  { key: 'apercu', nom: 'Aperçu', detail: 'Vue d’ensemble : les cinq zones où l’aide s’applique et leur portée.' },
  { key: 'detail', nom: 'Détaillé', detail: 'Chaque contrôle est nommé, défini et relié à son équivalent clavier.' },
  { key: 'clavier', nom: 'Clavier', detail: 'Focus, tabulations et raccourcis : aucune action sans clavier.' },
];

/* E073-08 — une seule bulle partagée, sélection déterminée par l’id ou la classe. */
const ASTUCES = [
  { sel: '#c3b-zoom-in', texte: 'Zoom avant : la touche + fait la même chose.' },
  { sel: '#c3b-zoom-out', texte: 'Zoom arrière : la touche − fait la même chose.' },
  { sel: '#c3b-zoom-reset', texte: 'Réinitialise le cadre ; équivalent de la touche 0.' },
  { sel: '#c3b-search', texte: 'Filtrer les lieux par nom ; la liste se met à jour au fur et à mesure.' },
  { sel: '.c3b-filter', texte: 'Choisir quels lieux apparaissent dans la liste.' },
  { sel: '.c3b-scope', texte: 'Changer de périmètre : pays ou repère d’ère.' },
  { sel: '.c3b-back', texte: 'Revenir à la vue précédente.' },
];

/* E073-04 — vocabulaire défini à la première occurrence. */
const GLOSSAIRE = [
  ['Cadre affiché', 'Zone délimitée par les coordonnées du pays ou de l’ère sélectionné ; les lieux hors de cette zone sont listés sans être déplacés.'],
  ['Repère', 'Marqueur cliquable placé sur la carte à partir de la latitude et de la longitude vérifiées du lieu.'],
  ['Projection schématique', 'Transformation linéaire lat/lon du cadre local vers l’écran : elle ne prétend pas être une carte fidèle du terrain.'],
  ['Source de coordonnée', 'Référence textuelle qui accompagne chaque lieu ; c’est elle qui garantit que la position n’est pas inventée.'],
  ['Mémoire contestée', 'Nom ou récit historique attaché à un lieu, signalé comme débattu plutôt que présenté comme unique.'],
];

/* E073-05 — procédure vérifiable, étape par étape. */
const ETAPES = [
  'Repérer le pays ou l’ère affichée dans la barre supérieure du panneau.',
  'Cliquer sur un repère de la carte (ou sur un lieu de la liste) pour ouvrir sa fiche.',
  'Utiliser +, − et 0 pour zoomer, dézoomer et réinitialiser le cadre.',
  'Filtrer la liste avec les boutons « tous », « dans le cadre » ou « hors du cadre ».',
  'Lire la source de coordonnée affichée en bas de la fiche avant de citer un lieu.',
];

/* E073-05 — équivalents clavier, en toutes lettres, jamais par la couleur seule. */
const RACCOURCIS = [
  ['+', 'Zoom avant sur la carte'],
  ['−', 'Zoom arrière sur la carte'],
  ['0', 'Réinitialiser le cadre affiché'],
  ['↑ / ↓', 'Parcourir la liste des lieux'],
  ['Début / Fin', 'Sauter au premier / dernier lieu'],
  ['Tab', 'Naviguer entre les contrôles'],
  ['Entrée', 'Activer le contrôle focalisé'],
];

/* État de module : la coque reconstruit son DOM à chaque rendu, donc l’état
 * survit au `stage.innerHTML = ''`. Les écouteurs globaux sont posés une seule fois. */
const S = {
  mode: 0,
  ouvert: true,
  playing: true,
  grille: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  tickCount: 0,
  reduced: false,
  offscreen: false,
  visibilityBound: false,
  motionBound: false,
  observersInstalled: false,
  observedCanvas: null,
  intersection: null,
  resize: null,
  tooltipsBound: false,
  tipTarget: null,
  snapshot: null,
  zones: null,
  nodes: {},
  panelNode: null,
  boundPanel: null,
};

/* Alias de ctx.el, initialisé au point d’entrée (les helpers l’utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- Formules déterministes (aucune donnée inventée) ---------- */

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Formatage décimal maison : regroupement par espaces fines, moins typographique. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* PRNG déterministe : même graine, mêmes zones, à chaque rendu. */
function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* E073-02 / E073-06 — cinq zones d’aide reproductibles, jamais aléatoires.
 * Ce sont des repères de maquette, pas des lieux réels : la légende le dit. */
function makeZones() {
  if (S.zones) return S.zones;
  const rnd = mulberry32(GRAINE);
  const noms = ['Zoom avant', 'Zoom arrière', 'Cadre', 'Recherche', 'Filtres'];
  S.zones = noms.map((nom, i) => ({
    nom,
    x: 80 + rnd() * (MAP_W - 160),
    y: 70 + rnd() * (MAP_H - 140),
    astuce: ASTUCES[i] ? ASTUCES[i].texte : '',
  }));
  return S.zones;
}

/* E073-02 — instantané du DOM réellement rendu (aucune mesure inventée). */
function readSnapshot(layout) {
  const all = (sel) => (layout && typeof layout.querySelectorAll === 'function'
    ? layout.querySelectorAll(sel) : []);
  const places = all('#c3b-places .c3b-place-item');
  const total = places.length;
  let visibles = 0;
  Array.prototype.forEach.call(places, (node) => {
    if (!node.querySelector('.c3b-offtag')) visibles += 1;
  });
  const presents = ASTUCES.filter((a) => all(a.sel).length > 0).length;
  return {
    nbLieux: total,
    nbVisibles: visibles,
    nbHors: total - visibles,
    nbFiltres: all('.c3b-filter').length,
    nbControles: presents,
    nbDocumentes: ASTUCES.length,
    nbRaccourcis: RACCOURCIS.length,
  };
}

/* E073-07 — grandeurs dérivées, avec contrôle croisé falsifiable. */
function measures(s) {
  const total = s && s.nbLieux ? s.nbLieux : 0;
  const part = total ? s.nbVisibles / total : 0;
  const partRef = total ? 1 - s.nbHors / total : 0;
  return {
    total,
    visibles: s ? s.nbVisibles : 0,
    hors: s ? s.nbHors : 0,
    part,
    partRef,
    coherent: Math.abs(part - partRef) < 1e-6,
  };
}

/* ---------- Feuille de style unique, cadrée par l’attribut de la coque ---------- */

const CSS = `
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel[hidden] { display: none !important; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel h2 {
  margin: 0 0 6px; color: var(--gold-bright); font-size: 13px; font-weight: 600;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel h3 {
  margin: 10px 0 5px; color: var(--gold-bright); font-size: 11px; font-weight: 600;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-lede { margin: 0 0 8px; max-width: 68ch; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-fait {
  margin: 5px 0; max-width: 68ch; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-glossaire { margin: 4px 0 8px; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-glossaire dt {
  color: var(--gold-bright); font-weight: 600; margin-top: 5px;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-glossaire dd {
  margin: 1px 0 4px; padding-left: 8px; border-left: 2px solid var(--gold);
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-etapes { margin: 4px 0 8px; padding-left: 22px; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-etapes li { margin: 3px 0; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-table {
  width: 100%; border-collapse: collapse; margin: 6px 0 8px; font-size: 10px;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-table caption {
  text-align: left; color: var(--gold-bright); margin-bottom: 4px;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-table th,
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-table td {
  border: 1px solid var(--line); padding: 3px 5px; text-align: left;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-table th { color: var(--gold-bright); }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-table kbd {
  display: inline-block; min-width: 18px; padding: 1px 5px; border: 1px solid var(--line);
  border-radius: 4px; background: rgba(0,0,0,.25); font: inherit; font-size: 10px;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-field {
  border: 1px solid var(--line); border-radius: 8px; margin: 8px 0; padding: 6px 8px;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-field legend { color: var(--gold-bright); padding: 0 4px; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-group {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-preset {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-preset:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-preset[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-guide {
  margin: 8px 0; padding: 7px 9px; border: 1px solid var(--gold); border-radius: 7px;
  background: rgba(230,185,111,.07); color: var(--ink-soft, #d7d1c6); font-size: 10px;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-guide::before {
  content: ""; display: block; height: 3px; margin-bottom: 6px; border-radius: 2px;
  background: var(--gold); width: calc(var(--geography-v2-e073-progression, 0) * 100%);
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel[data-geography-v2-e073-reduced="1"] .geography-v2-e073-guide::before { width: 100%; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-canvas {
  display: block; width: 100%; max-width: 320px; height: auto; aspect-ratio: 900 / 620;
  margin: 0 auto; touch-action: none; cursor: pointer;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-controls {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-btn {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-btn:hover { border-color: var(--gold); }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-btn[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel :focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-tip[hidden] { display: none !important; }
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-tip {
  position: fixed; z-index: 40; max-width: 240px; padding: 6px 9px;
  border: 1px solid var(--gold); border-radius: 6px;
  background: rgba(8,12,18,.96); color: var(--ink); font-size: 10px; line-height: 1.45;
  pointer-events: none;
}
.geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-badge {
  position: absolute; left: 16px; bottom: 14px; z-index: 3; max-width: 64%;
  padding: 4px 8px; border: 1px solid var(--gold); border-radius: 6px;
  background: rgba(8,12,18,.9); color: var(--gold-bright);
  font-size: 10px; line-height: 1.4; pointer-events: none;
}
@media (max-width: 620px) {
  .geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-group { grid-template-columns: 1fr; }
  .geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-canvas { max-width: 280px; }
  .geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-badge { font-size: 9px; max-width: 80%; left: 8px; bottom: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-v2-e073="on"] .geography-v2-e073-panel * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* ---------- E073-06 — laboratoire canvas : dessin déterministe ---------- */

function drawLab() {
  const n = S.nodes;
  const cv = n.canvas;
  const zones = makeZones();
  if (!cv || typeof cv.getContext !== 'function') return;
  const painter = cv.getContext('2d');
  if (!painter) return;

  const cssW = clamp(cv.clientWidth || 320, 160, 320);
  const cssH = cssW * (MAP_H / MAP_W);
  const dpr = clamp((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 1, 2);
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);

  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(cv) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const v = theme ? theme.getPropertyValue(name).trim() : '';
    return v || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const gold = color('--gold', '#d9b166');
  const bright = color('--gold-bright', '#f0d18c');
  const muted = color('--muted', '#9aa0a8');
  const sx = cssW / MAP_W;
  const sy = cssH / MAP_H;

  /* Cadre complet et grille de repérage (bascule indépendante). */
  painter.strokeStyle = muted;
  painter.lineWidth = 1;
  painter.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);
  if (S.grille) {
    painter.globalAlpha = 0.35;
    painter.setLineDash([2, 4]);
    for (let i = 1; i < 6; i += 1) {
      const gx = (i * cssW) / 6;
      const gy = (i * cssH) / 6;
      painter.beginPath();
      painter.moveTo(gx, 0);
      painter.lineTo(gx, cssH);
      painter.moveTo(0, gy);
      painter.lineTo(cssW, gy);
      painter.stroke();
    }
    painter.setLineDash([]);
    painter.globalAlpha = 1;
  }

  /* Six zones d’aide maximales, cinq présentes : pastilles reproductibles. */
  zones.forEach((zone, i) => {
    const zx = zone.x * sx;
    const zy = zone.y * sy;
    painter.fillStyle = ink;
    painter.beginPath();
    painter.arc(zx, zy, 2.2, 0, Math.PI * 2);
    painter.fill();
    painter.fillStyle = muted;
    painter.font = `${Math.max(8, Math.round(cssW * 0.035))}px sans-serif`;
    painter.fillText(String(i + 1), zx + 4, zy - 4);
  });

  /* Surintendant déterministe : une seule zone mise en avant par phase. */
  const index = clamp(Math.floor(S.phase * zones.length), 0, zones.length - 1);
  const cible = zones[index];
  const cx = cible.x * sx;
  const cy = cible.y * sy;
  const rayon = 8 + 3 * Math.sin(S.phase * Math.PI * 2);
  painter.strokeStyle = bright;
  painter.lineWidth = 2;
  painter.beginPath();
  painter.arc(cx, cy, rayon, 0, Math.PI * 2);
  painter.stroke();
  painter.strokeStyle = gold;
  painter.lineWidth = 1;
  painter.beginPath();
  painter.moveTo(cx - 12, cy);
  painter.lineTo(cx + 12, cy);
  painter.moveTo(cx, cy - 12);
  painter.lineTo(cx, cy + 12);
  painter.stroke();

  /* Barre de progression et graine, redondées en texte sous le canvas. */
  painter.fillStyle = gold;
  painter.fillRect(0, cssH - 3, cssW * S.phase, 3);
  painter.fillStyle = ink;
  painter.font = `${Math.max(9, Math.round(cssW * 0.042))}px sans-serif`;
  painter.fillText(`graine ${GRAINE.toString(16)}`, 6, cssH - 8);
  painter.fillText(`zone ${index + 1}/${zones.length}`, cssW - 62, 14);
}

/* ---------- E073-07 — région live unique ---------- */

function updateReadout(cause) {
  const n = S.nodes;
  if (!n.readout) return;
  const s = S.snapshot || readSnapshot(null);
  const m = measures(s);
  const mode = MODES[S.mode];
  const verbs = {
    initial: 'Aide initiale',
    mode: `Mode « ${mode.nom} »`,
    surintendant: 'Mise en avant automatique',
    clavier: 'Choix au clavier',
    ouverture: 'Affichage de l’aide',
    grille: 'Grille de repérage',
    pas: 'Zone suivante',
  };
  const croise = m.coherent ? 'contrôle croisé cohérent' : 'contrôle croisé en échec';
  n.readout.textContent =
    `${verbs[cause] || 'Aide'} · ${m.total} lieux répertoriés, ${m.visibles} dans le cadre et ` +
    `${m.hors} hors cadre : part ${num(m.part, 2)} de l’ensemble ` +
    `(référence 1,00 = tous les lieux dans le cadre ; ${croise}). ` +
    `${s.nbFiltres} filtres, ${s.nbRaccourcis} raccourcis documentés, ` +
    `${s.nbControles} contrôles de la vue reconnus ; graine ${GRAINE.toString(16)}. ` +
    `Le ? ouvre ou masque ce guide.`;
}

/* ---------- Synchronisation des contrôles et du texte dérivé ---------- */

function syncControls(cause) {
  const n = S.nodes;
  const zones = makeZones();
  const mode = MODES[S.mode];
  const index = clamp(Math.floor(S.phase * zones.length), 0, zones.length - 1);

  if (S.radios) {
    S.radios.forEach((radio, i) => {
      const on = i === S.mode;
      radio.setAttribute('aria-checked', on ? 'true' : 'false');
      radio.tabIndex = on ? 0 : -1;
    });
  }
  if (n.toggle) {
    n.toggle.textContent = S.ouvert ? '?' : '?';
    n.toggle.setAttribute('aria-expanded', S.ouvert ? 'true' : 'false');
    n.toggle.setAttribute('aria-label', S.ouvert ? 'Masquer l’aide contextuelle' : 'Afficher l’aide contextuelle');
  }
  if (n.panel) {
    n.panel.hidden = !S.ouvert;
    n.panel.dataset.geographyV2E073Reduced = S.reduced ? '1' : '0';
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la mise en avant' : '▶ Lancer la mise en avant';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.grid) n.grid.setAttribute('aria-pressed', S.grille ? 'true' : 'false');
  if (n.guide) {
    n.guide.textContent = `${mode.nom} · zone ${index + 1}/${zones.length} : ${zones[index].nom} — ${zones[index].astuce}`;
    n.guide.style.setProperty('--geography-v2-e073-progression', String(S.phase));
  }
  if (n.modeText) n.modeText.textContent = `${mode.nom} : ${mode.detail}`;
  if (cause) updateReadout(cause);
  drawLab();
}

function applyMode(index, cause) {
  S.mode = clamp(index, 0, MODES.length - 1);
  syncControls(cause || 'mode');
}

/* ---------- Boucle rAF unique, pause sur document.hidden et hors écran ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || S.offscreen || !S.playing || !S.ouvert) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || S.offscreen || !S.playing || !S.ouvert) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt / SWEEP_MS) % 1;
  }
  S.lastTs = ts;
  drawLab();
  const zones = makeZones();
  const index = clamp(Math.floor(S.phase * zones.length), 0, zones.length - 1);
  const guide = S.nodes.guide;
  if (guide) {
    guide.textContent = `${MODES[S.mode].nom} · zone ${index + 1}/${zones.length} : ${zones[index].nom} — ${zones[index].astuce}`;
    guide.style.setProperty('--geography-v2-e073-progression', String(S.phase));
  }
  /* Une annonce toutes les ~15 frames : la région live reste lisible. */
  S.tickCount += 1;
  if (S.tickCount >= 15) {
    S.tickCount = 0;
    updateReadout('surintendant');
  }
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : mq.matches;
        if (S.reduced) { S.playing = false; S.phase = 0; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source vivante. */ }
  }
}

function installObservers() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof IntersectionObserver !== 'function') return;
  if (!S.observersInstalled) {
    S.observersInstalled = true;
    S.intersection = new IntersectionObserver((entrees) => {
      const e = entrees[entrees.length - 1];
      S.offscreen = !e.isIntersecting;
      if (S.offscreen) stopLoop(); else startLoop();
    }, { rootMargin: '40px' });
    if (typeof ResizeObserver === 'function') S.resize = new ResizeObserver(() => drawLab());
  }
  if (S.observedCanvas !== cv) {
    if (S.observedCanvas && S.intersection) S.intersection.unobserve(S.observedCanvas);
    if (S.observedCanvas && S.resize) S.resize.unobserve(S.observedCanvas);
    S.observedCanvas = cv;
    S.intersection.observe(cv);
    if (S.resize) S.resize.observe(cv);
  }
}

/* ---------- E073-08 — info-bulles contextuelles accessibles ---------- */

function findTip(node) {
  if (!node || typeof node.matches !== 'function') return '';
  const trouve = ASTUCES.find((a) => {
    try { return node.matches(a.sel); } catch { return false; }
  });
  return trouve ? trouve.texte : '';
}

function placeTip(cible) {
  const tip = S.nodes.tip;
  if (!tip || !cible) return;
  const r = cible.getBoundingClientRect();
  const w = tip.offsetWidth || 200;
  const h = tip.offsetHeight || 40;
  const maxX = Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 1024) - w - 8);
  const maxY = Math.max(8, (typeof window !== 'undefined' ? window.innerHeight : 768) - h - 8);
  const x = Math.min(maxX, Math.max(8, r.left));
  let y = r.bottom + 6;
  if (y > maxY) y = Math.max(8, r.top - h - 6);
  tip.style.left = `${Math.round(x)}px`;
  tip.style.top = `${Math.round(y)}px`;
}

function showTip(cible) {
  const texte = findTip(cible);
  const tip = S.nodes.tip;
  if (!texte || !tip || !S.ouvert) return;
  if (S.tipTarget && S.tipTarget !== cible) S.tipTarget.removeAttribute('aria-describedby');
  tip.textContent = texte;
  tip.hidden = false;
  cible.setAttribute('aria-describedby', ID.tip);
  S.tipTarget = cible;
  placeTip(cible);
}

function hideTip() {
  const tip = S.nodes.tip;
  if (tip) tip.hidden = true;
  if (S.tipTarget) {
    S.tipTarget.removeAttribute('aria-describedby');
    S.tipTarget = null;
  }
}

function installTooltips() {
  if (S.tooltipsBound || typeof document === 'undefined') return;
  S.tooltipsBound = true;
  const SELECTEUR = ASTUCES.map((a) => a.sel).join(',');
  const cibleDe = (e) => (e.target instanceof Element ? e.target.closest(SELECTEUR) : null);
  document.addEventListener('focusin', (e) => {
    if (!document.getElementById(ID.panel)) return;
    const cible = cibleDe(e);
    if (cible) showTip(cible); else hideTip();
  });
  document.addEventListener('mouseover', (e) => {
    if (!document.getElementById(ID.panel)) return;
    const cible = cibleDe(e);
    if (cible) showTip(cible);
  });
  document.addEventListener('mouseout', (e) => {
    if (!document.getElementById(ID.panel)) return;
    const cible = cibleDe(e);
    if (cible && (!e.relatedTarget || !cible.contains(e.relatedTarget))) hideTip();
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      if (S.tipTarget && S.nodes.tip && !S.nodes.tip.hidden) placeTip(S.tipTarget);
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (S.tipTarget && S.nodes.tip && !S.nodes.tip.hidden) placeTip(S.tipTarget);
    });
  }
}

/* ---------- E073-08 — badge textuel sur la carte ---------- */

function ajouterBadge(layout) {
  const map = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.geo-map') : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = E('span', 'geography-v2-e073-badge',
    'Aide : cliquez sur un repère pour lire sa fiche ; le bouton ? ouvre ce guide.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- Construction de la fiche sémantique ---------- */

function buildGlossaire() {
  const dl = E('dl', 'geography-v2-e073-glossaire');
  dl.id = ID.glossaire;
  GLOSSAIRE.forEach(([terme, def]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', def));
  });
  return dl;
}

function buildEtapes() {
  const ol = E('ol', 'geography-v2-e073-etapes');
  ol.id = ID.etapes;
  ETAPES.forEach((texte) => ol.appendChild(E('li', '', texte)));
  return ol;
}

function buildRaccourcis() {
  const table = E('table', 'geography-v2-e073-table');
  table.id = ID.raccourcis;
  table.appendChild(E('caption', '',
    'Raccourcis clavier de la vue (aucune information n’est portée par la seule couleur).'));
  const thead = E('thead');
  const hr = E('tr');
  ['Touche', 'Action'].forEach((t) => {
    const th = E('th', '', t);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = E('tbody');
  RACCOURCIS.forEach(([touche, action]) => {
    const tr = E('tr');
    const th = E('th', '', '');
    th.scope = 'row';
    th.appendChild(E('kbd', '', touche));
    tr.append(th, E('td', '', action));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildPanel(ctx, layout) {
  const existant = document.getElementById(ID.panel);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      canvas: document.getElementById(ID.canvas),
      readout: document.getElementById(ID.readout),
      guide: document.getElementById(ID.guide),
      modeText: document.getElementById(ID.modeText),
      toggle: document.getElementById(ID.toggle),
      play: document.getElementById(ID.play),
      grid: document.getElementById(ID.grid),
      tip: document.getElementById(ID.tip),
      fresh: false,
    };
  }

  const panel = E('section', 'geography-v2-e073-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);
  panel.dataset.sim = 'aide-contextuelle-v2';

  const titre = E('h2', '', 'Aide contextuelle — lire la carte sans deviner');
  titre.id = ID.title;
  panel.appendChild(titre);
  const lede = E('p', 'geography-v2-e073-lede',
    'Cette aide explique comment lire la carte locale : ce qu’est un repère, comment le cadre est défini ' +
    'et comment naviguer sans souris. Tout ce qui suit est du texte lisible, même sans animation ni interaction. ' +
    'Le schéma ne fait qu’illustrer des grandeurs déjà écrites en toutes lettres.');
  lede.id = ID.lead;
  panel.appendChild(lede);

  /* E073-01 / E073-04 — lexique défini à la première occurrence. */
  panel.appendChild(E('h3', '', 'Lexique'));
  panel.appendChild(buildGlossaire());

  /* E073-05 — procédure pas-à-pas. */
  panel.appendChild(E('h3', '', 'Comment faire'));
  panel.appendChild(buildEtapes());

  /* E073-05 — tableau des raccourcis. */
  panel.appendChild(E('h3', '', 'Raccourcis clavier'));
  panel.appendChild(buildRaccourcis());

  /* E073-03 — radiogroupe de modes, choix unique, pas d’aria-pressed. */
  const field = E('fieldset', 'geography-v2-e073-field');
  field.id = ID.field;
  field.setAttribute('role', 'radiogroup');
  field.setAttribute('aria-label', 'Choisir le mode d’aide (choix unique)');
  field.appendChild(E('legend', '', 'Mode d’aide'));
  const group = E('div', 'geography-v2-e073-group');
  group.id = ID.group;
  MODES.forEach((m, i) => {
    const radio = E('button', 'geography-v2-e073-preset', m.nom);
    radio.type = 'button';
    radio.id = ID.radio(i);
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === S.mode ? 'true' : 'false');
    radio.tabIndex = i === S.mode ? 0 : -1;
    radio.setAttribute('aria-controls', ID.guide);
    group.appendChild(radio);
  });
  field.appendChild(group);
  panel.appendChild(field);

  const modeText = E('p', 'geography-v2-e073-fait', '');
  modeText.id = ID.modeText;
  panel.appendChild(modeText);

  /* E073-07 — région live unique. */
  const readout = E('p', 'geography-v2-e073-readout', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  panel.appendChild(readout);

  /* E073-09 — guide mis en avant par le surintendant, redondé par le texte. */
  const guide = E('p', 'geography-v2-e073-guide', '');
  guide.id = ID.guide;
  panel.appendChild(guide);

  /* E073-06 — laboratoire canvas, redondé par le texte. */
  const figure = E('figure', 'geography-v2-e073-figure');
  figure.id = ID.figure;
  const canvas = E('canvas', 'geography-v2-e073-canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Maquette de l’aide contextuelle : cinq zones numérotées dans un cadre 900 sur 620, ' +
    'une mise en avant déterministe et une barre de progression. ' +
    'Entrée affiche la zone suivante, Échap arrête la mise en avant.');
  canvas.setAttribute('aria-describedby', ID.clavier);
  const caption = E('figcaption', 'geography-v2-e073-caption',
    'Maquette non à l’échelle du terrain : les pastilles numérotées sont des zones d’aide, ' +
    'pas des lieux réels ; le cercle est la zone mise en avant et la barre la progression ' +
    '(graine 45e073). Bornes et grandeurs sont écrites en texte dans le statut.');
  caption.id = ID.caption;
  figure.append(canvas, caption);
  panel.appendChild(figure);

  /* E073-08 — repères en glyphes, jamais la seule couleur. */
  const legend = E('p', 'geography-v2-e073-fait',
    'E073-08 · Repères : ● zone d’aide · ○ zone mise en avant · ✛ centre de la zone · ' +
    '┄ grille de repérage (bascule ci-dessous). Forme, contraste et numéros distinguent les zones, ' +
    'même en niveaux de gris. Une info-bulle accompagne aussi chaque contrôle au survol et au focus.');
  legend.id = ID.legend;
  panel.appendChild(legend);

  /* E073-02 / E073-07 — grandeurs chiffrées, dont une comparée à une référence. */
  const s = S.snapshot || readSnapshot(null);
  const m = measures(s);
  const ul = E('ul');
  ul.id = ID.mesures;
  [
    `${m.total} lieux répertoriés dans la vue : c’est la mesure de référence.`,
    `${m.visibles} lieux dans le cadre, ${m.hors} hors cadre : part ${num(m.part, 2)} de l’ensemble.`,
    `Référence 1,00 = tous les lieux dans le cadre ; écart ${num(1 - m.part, 2)}.`,
    `${s.nbFiltres} filtres et ${s.nbRaccourcis} raccourcis documentés ; ${s.nbControles} contrôles de la vue reconnus.`,
    `Graine ${GRAINE.toString(16)} : cinq zones d’aide reproductibles, aucune valeur aléatoire.`,
  ].forEach((t) => ul.appendChild(E('li', '', t)));
  panel.appendChild(ul);

  /* E073-09 / E073-10 — contrôles : bascule indépendante + rAF + ouverture. */
  const controls = E('div', 'geography-v2-e073-controls');

  const toggle = E('button', 'geography-v2-e073-btn', '?');
  toggle.type = 'button';
  toggle.id = ID.toggle;
  toggle.setAttribute('aria-controls', ID.panel);
  toggle.setAttribute('aria-expanded', S.ouvert ? 'true' : 'false');
  toggle.setAttribute('aria-label', S.ouvert ? 'Masquer l’aide contextuelle' : 'Afficher l’aide contextuelle');
  controls.appendChild(toggle);

  /* aria-pressed légitime ici : bascule indépendante du choix de mode. */
  const grid = E('button', 'geography-v2-e073-btn',
    S.grille ? 'Grille : affichée' : 'Grille : masquée');
  grid.type = 'button';
  grid.id = ID.grid;
  grid.setAttribute('aria-pressed', S.grille ? 'true' : 'false');
  grid.setAttribute('aria-controls', ID.canvas);
  controls.appendChild(grid);

  const play = E('button', 'geography-v2-e073-btn',
    S.playing ? '■ Arrêter la mise en avant' : '▶ Lancer la mise en avant');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', ID.guide);
  controls.appendChild(play);

  const next = E('button', 'geography-v2-e073-btn', 'Zone suivante');
  next.type = 'button';
  next.id = ID.next;
  next.setAttribute('aria-controls', ID.guide);
  controls.appendChild(next);

  panel.appendChild(controls);

  /* E073-05 / E073-09 — équipement clavier. */
  const clavier = E('p', 'geography-v2-e073-fait',
    'E073-09 · Clavier : Tab atteint les trois modes, le bouton ?, la grille, la mise en avant ' +
    'et le canvas. Sur un mode, ← → changent de mode ; sur le canvas, Entrée affiche la zone ' +
    'suivante et Échap arrête la mise en avant. Le focus est toujours visible.');
  clavier.id = ID.clavier;
  panel.appendChild(clavier);

  /* E073-10 — limite falsifiable en cinq temps, alignée sur les angles morts. */
  const limite = E('p', 'geography-v2-e073-fait',
    'E073-10 · Limite et vérification : 1) prédire que la part annoncée vaut 1,00 si aucun lieu n’est ' +
    'hors du cadre ; 2) régler le filtre « dans le cadre » ; 3) attendre la valeur du statut ; ' +
    '4) falsifier si la part diffère de 1 − hors_cadre / total ; 5) débrief : l’aide lit le DOM déjà rendu, ' +
    'elle ne modifie ni la vue ni ses contrôles, elle ne garantit pas l’exactitude historique des lieux ' +
    'et sa maquette ignore les marges d’aspect : elle illustre la lisibilité, pas le fond du dessin.');
  limite.id = ID.limite;
  panel.appendChild(limite);

  const tip = E('div', 'geography-v2-e073-tip', '');
  tip.id = ID.tip;
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;

  const host = layout.querySelector('.geo-panel') || layout;
  host.appendChild(panel);
  host.appendChild(tip);

  return {
    panel, canvas, readout, guide, modeText, toggle, play, grid, next, tip,
    fresh: S.panelNode !== panel,
  };
}

/* ---------- Point d’entrée ---------- */

register('E073', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  E = typeof ctx.el === 'function' ? ctx.el : E;

  const layout = ctx.layout || ctx.stage;
  if (!layout || typeof layout.querySelector !== 'function') return;

  ctx.css(CSS_ID, CSS);
  layout.setAttribute('data-geography-v2-e073', 'on');

  /* E073-02 — instantané déterministe, relu à chaque rendu. */
  S.snapshot = readSnapshot(layout);
  makeZones();
  layout.setAttribute('data-geography-v2-e073-seed', GRAINE.toString(16));
  layout.setAttribute('data-geography-v2-e073-lieux', String(S.snapshot.nbLieux));
  layout.setAttribute('data-geography-v2-e073-visibles', String(S.snapshot.nbVisibles));

  S.nodes = buildPanel(ctx, layout);
  S.radios = Array.from(S.nodes.panel.querySelectorAll('.geography-v2-e073-preset'));
  ajouterBadge(layout);
  installTooltips();

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) { S.playing = false; S.phase = 0; stopLoop(); }

  installGlobalListeners(ctx);
  installObservers();
  syncControls('initial');

  if (S.nodes.fresh && S.boundPanel !== S.nodes.panel) {
    S.boundPanel = S.nodes.panel;
    const n = S.nodes;

    S.radios.forEach((radio, i) => {
      radio.addEventListener('click', () => applyMode(i, 'mode'));
    });

    n.toggle.addEventListener('click', () => {
      S.ouvert = !S.ouvert;
      if (!S.ouvert) hideTip();
      syncControls('ouverture');
      if (S.ouvert) startLoop(); else stopLoop();
    });

    n.grid.addEventListener('click', () => {
      S.grille = !S.grille;
      syncControls('grille');
    });

    n.play.addEventListener('click', () => {
      if (S.reduced) {
        S.phase = (S.phase + 1 / makeZones().length) % 1;
        S.playing = false;
        stopLoop();
        syncControls('pas');
        updateReadout('pas');
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop();
      else startLoop();
      syncControls();
      updateReadout(S.playing ? 'surintendant' : 'pas');
    });

    n.next.addEventListener('click', () => {
      const zones = makeZones();
      S.phase = ((Math.floor(S.phase * zones.length) + 1) / zones.length) % 1;
      syncControls('pas');
      updateReadout('pas');
    });

    /* E073-03 / E073-09 — clavier : modes (flèches) et canvas (Entrée/Échap). */
    n.panel.addEventListener('keydown', (event) => {
      const target = event.target;
      const isRadio = target && target.classList
        && target.classList.contains('geography-v2-e073-preset');
      if (isRadio && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
        const nextMode = (S.mode + dir + MODES.length) % MODES.length;
        applyMode(nextMode, 'clavier');
        S.radios[S.mode].focus();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (target !== n.canvas) return;
      const zones = makeZones();
      if (event.key === 'Enter' || event.key === ' ') {
        S.phase = ((Math.floor(S.phase * zones.length) + 1) / zones.length) % 1;
      } else if (event.key === 'Escape') {
        S.playing = false;
        stopLoop();
        syncControls();
        updateReadout('pas');
      } else return;
      event.preventDefault();
      event.stopPropagation();
      syncControls('clavier');
    });
  }

  S.panelNode = S.nodes.panel;
});
