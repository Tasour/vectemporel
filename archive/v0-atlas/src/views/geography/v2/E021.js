import { register } from './registry.js';

/* Lentille V2 E021 — vue GEOGRAPHIE.
 * Thème : îles et archipels (formation, classification, biogéographie insulaire).
 *
 * Les dix chantiers E021-01 … E021-10 sont réellement implémentés ci-dessous :
 *  01 texte sémantique d'introduction  02 tableau comparatif des quatre types
 *  03 radiogroup de type d'île         04 curseurs de surface et d'isolement
 *  05 coupe canvas déterministe        06 grandeurs chiffrées / référence
 *  07 séquence de Darwin : rAF unique  08 codes visuels non chromatiques
 *  09 badge textuel sur la carte       10 accessibilité / mouvement réduit
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire (mulberry32,
 * graine fixe affichée), aucune sortie console, aucun fichier partagé modifié.
 * Le contenu pédagogique est du texte sémantique inséré dans le DOM : il reste
 * lisible et indexable même sans animation ni interaction. Le canvas n'est
 * qu'un laboratoire dont chaque grandeur est aussi écrite en toutes lettres.
 *
 * Nouveautés V2 : `role="radiogroup"` explicite, `aria-keyshortcuts` et
 * `aria-describedby` sur le canvas, `IntersectionObserver` (pause hors écran),
 * limite falsifiable énoncée dans le panneau, graine déterministe affichée.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e021';
const P = 'geography-v2-e021';
const SEED = 0xE021; /* graine fixe et affichée, zéro tirage aléatoire. */

/* Valeurs canoniques discrètes : aucune grandeur flottante instable. */
const AREAS = [10, 30, 100, 300, 1000, 3000, 10000];   /* km² */
const DISTANCES = [1, 5, 20, 100, 500, 1000];          /* km */
const TYPES = [
  { id: 'continentale', label: 'Continentale' },
  { id: 'volcanique', label: 'Volcanique' },
  { id: 'atoll', label: 'Atoll corallien' },
  { id: 'barriere', label: 'Île barrière' },
];

/* Modèle de MacArthur–Wilson (relation aire–espèces) et décroissance de
 * l'immigration avec l'isolement. Références explicites, aucun nombre fabriqué. */
const S_REF = 100;   /* espèces pour A_REF km² */
const A_REF = 100;   /* km² */
const Z_EXP = 0.25;  /* exposant z classique de la relation S = c·A^z */
const D0 = 100;      /* km, distance caractéristique de décroissance */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  type: 'atoll',
  areaIdx: 2,
  distIdx: 2,
  playing: false,
  reduced: false,
  sweep: 0,
  dir: 1,
  lastTs: 0,
  rafId: 0,
  visBound: false,
  motionBound: false,
  onScreen: true,
  io: null,
  ioCanvas: null,
  nodes: {},
};

/* ---------- E021-05 : générateur déterministe (mulberry32, graine affichée) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAINS = (() => {
  const r = mulberry32(SEED);
  return Array.from({ length: 26 }, () => ({ x: r(), y: r(), s: 0.7 + r() * 1.3 }));
})();

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const gauss = (u, c, w) => Math.exp(-(((u - c) / w) ** 2));

function measures() {
  const A = AREAS[S.areaIdx];
  const D = DISTANCES[S.distIdx];
  const richness = S_REF * ((A / A_REF) ** Z_EXP);
  return {
    A,
    D,
    richness,
    ratio: richness / S_REF,
    immigration: Math.exp(-D / D0),
    perte: 1 - Math.exp(-D / D0),
  };
}

/* Coupe schématique : élévation du sol z(u) pour un type d'île et une
 * submersion relative s ∈ [0,1]. z > 0 = émergé, z = 0 = niveau de la mer. */
function groundZ(type, u, s) {
  const d = u - 0.5;
  if (type === 'continentale') {
    const shelf = -0.18 - 0.12 * Math.min(1, Math.abs(d) * 2.2);
    return shelf + 0.55 * gauss(u, 0.5, 0.16) - 0.32 * s;
  }
  if (type === 'volcanique') {
    return -0.30 + 1.05 * gauss(u, 0.5, 0.11) - 0.95 * s;
  }
  if (type === 'atoll') {
    return -0.55 + 1.15 * gauss(u, 0.5, 0.13) - 1.05 * s;
  }
  /* barrière : continent à gauche, lagon au centre, cordon sableux à droite. */
  const stepRight = u > 0.82 ? 0.12 * Math.min(1, (u - 0.82) / 0.18) : 0;
  return -0.18 + 0.42 * gauss(u, 0.16, 0.13) + 0.22 * gauss(u, 0.72, 0.05)
    - 0.20 * gauss(u, 0.48, 0.10) - stepRight - 0.22 * s;
}

function atollStage(s) {
  if (s < 0.34) return 'Stade 1 — récif frangeant : le corail adhère à la côte du volcan.';
  if (s < 0.68) return 'Stade 2 — récif barrière : un lagon sépare le récif du volcan qui s’enfonce.';
  return 'Stade 3 — atoll : le volcan a disparu sous la mer ; seul l’anneau corallien subsiste.';
}

function seedText() {
  return `graine ${SEED} (${SEED.toString(16)}, ${SEED.toString(10)})`;
}

/* ---------- E021-03 / 04 / 08 / 10 : feuille de style unique ---------- */

const CSS = `
#${P}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${P}-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${P}-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${P}-panel p{margin:5px 0;max-width:68ch}
#${P}-panel .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${P}-panel .${P}-limite{
  margin:6px 0;padding-left:9px;border-left:2px dashed var(--muted,#9a938a);
}
#${P}-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${P}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${P}-table th,#${P}-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${P}-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-set{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${P}-set legend{padding:0 4px;color:var(--muted)}
#${P}-panel .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${P}-panel .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${P}-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${P}-legend{font-size:10px;color:var(--muted)}
#${P}-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${P}-readout strong{color:var(--gold-bright,#f4d69e)}
#${P}-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${P}-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${P}-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${P}-panel[data-${P}-reduced="1"] button,
#${P}-panel[data-${P}-reduced="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${P}-panel button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${P}-panel{font-size:10px;padding:9px}
  #${P}-canvas{height:190px}
  #${P}-panel .${P}-choix{margin-right:4px}
}
`;

/* ---------- E021-01 / 02 : construction du panneau (texte sémantique) ---------- */

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* E021-01 : trois faits sourcés + une limite falsifiable, texte réel au DOM. */
function staticFacts() {
  const wrap = mk('div');
  const faits = [
    'Une île est une terre émergée entourée d’eau ; un archipel est un ensemble d’îles proches, souvent issues de la même structure géologique. Aucune carte n’est neutre : le trait de côte dépend du niveau marin retenu.',
    'Darwin a expliqué l’atoll par la subsidence d’un volcan : le récif frangeant devient récif barrière quand un lagon s’ouvre, puis atoll lorsque le volcan disparaît sous la mer et que seul l’anneau corallien subsiste.',
    'La théorie de l’équilibre biogéographique de MacArthur et Wilson relie le nombre d’espèces à l’aire et à l’isolement : S = c · A^z, avec un taux d’immigration qui décroît avec la distance à la source.',
  ];
  faits.forEach((texte) => wrap.appendChild(mk('p', P + '-fait', texte)));
  wrap.appendChild(mk('p', P + '-limite',
    'Limite falsifiable : S = c · A^z est une relation statistique simplifiée. Elle ne prédit ni la composition des espèces, ni l’effet de l’âge de l’île, des perturbations humaines ou de la connectivité entre îles ; la submersion dessinée est relative, pas une mesure réelle de subsidence.'));
  return wrap;
}

/* E021-02 : tableau comparatif, référence chiffrée explicite dans le caption. */
function staticTable() {
  const table = mk('table');
  table.id = P + '-table';
  table.appendChild(mk('caption', '',
    'Modèle de référence : S = 100 · (A/100)^0,25 espèces (A en km²) ; immigration relative I = e^(−D/100), avec I(0) = 1,00 (D en km).'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Type d’île', 'Origine', 'Structure', 'Repère'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  const lignes = [
    ['Continentale', 'Fragmentation d’un continent (transgression)', 'Plateau continental peu profond', 'Aire vaste, isolement faible'],
    ['Volcanique', 'Éruption sous-marine, point chaud', 'Cône abrupt, sols jeunes', 'Colonisation rapide, isolement fort'],
    ['Atoll corallien', 'Subsidence d’un volcan + croissance du corail (Darwin)', 'Anneau calcaire et lagon', 'Frangeant → barrière → atoll'],
    ['Île barrière', 'Accumulation de sable par vagues et courants', 'Cordon sableux et lagon', 'Jeune, mobile, fragile'],
  ];
  lignes.forEach((cells) => {
    const tr = mk('tr');
    cells.forEach((c, i) => {
      const cell = mk(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function legendText() {
  return 'Hatchures obliques = socle ou cône ; quadrillage = calcaire corallien ; '
    + 'pointillé = sable ; trait tireté = niveau de la mer. '
    + 'Aucune information n’est portée par la seule couleur. ' + seedText() + '.';
}

function ensurePanel(ctx) {
  const idPanel = P + '-panel';
  const existant = document.getElementById(idPanel);
  if (existant && existant.isConnected) {
    const radioByKey = {};
    TYPES.forEach((t) => { radioByKey[t.id] = document.getElementById(P + '-type-' + t.id); });
    return {
      panel: existant,
      fresh: false,
      radioByKey,
      area: document.getElementById(P + '-area'),
      areaOut: document.getElementById(P + '-area-value'),
      dist: document.getElementById(P + '-distance'),
      distOut: document.getElementById(P + '-distance-value'),
      canvas: document.getElementById(P + '-canvas'),
      readout: document.getElementById(P + '-readout'),
      play: document.getElementById(P + '-play'),
      legend: document.getElementById(P + '-legend'),
    };
  }

  const panel = mk('section', P + '-panel');
  panel.id = idPanel;
  panel.setAttribute('aria-labelledby', P + '-title');

  const title = mk('h2', '', 'Îles et archipels');
  title.id = P + '-title';
  const lead = mk('p', '', 'Comparer les modes de formation des îles et la théorie biogéographique de MacArthur et Wilson permet de voir qu’une île n’est pas un décor figé : sa surface et son isolement commandent sa richesse en espèces.');

  /* E021-03 : radiogroup natif + role explicite, pas d'aria-pressed. */
  const fieldset = mk('fieldset');
  fieldset.id = P + '-set';
  fieldset.setAttribute('role', 'radiogroup');
  const legendElt = mk('legend', '', 'Type d’île observé (choix unique)');
  fieldset.appendChild(legendElt);
  const radioByKey = {};
  TYPES.forEach((t) => {
    const lab = mk('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-type';
    radio.id = P + '-type-' + t.id;
    radio.value = t.id;
    radio.checked = S.type === t.id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(t.label));
    fieldset.appendChild(lab);
    radioByKey[t.id] = radio;
  });

  const sub = mk('h3', '', 'Explorer les grandeurs');

  /* E021-04 : deux curseurs étiquetés, valeurs discrètes bornées. */
  const areaRow = mk('p');
  const areaLabel = document.createElement('label');
  areaLabel.setAttribute('for', P + '-area');
  areaLabel.appendChild(document.createTextNode('Surface de l’île : '));
  const areaOut = mk('span', P + '-value');
  areaOut.id = P + '-area-value';
  areaLabel.appendChild(areaOut);
  areaRow.appendChild(areaLabel);
  const area = document.createElement('input');
  area.type = 'range';
  area.id = P + '-area';
  area.min = '0';
  area.max = String(AREAS.length - 1);
  area.step = '1';
  area.value = String(S.areaIdx);
  area.setAttribute('aria-label', 'Surface de l’île, de 10 à 10 000 kilomètres carrés');

  const distRow = mk('p');
  const distLabel = document.createElement('label');
  distLabel.setAttribute('for', P + '-distance');
  distLabel.appendChild(document.createTextNode('Isolement (distance à la source) : '));
  const distOut = mk('span', P + '-value');
  distOut.id = P + '-distance-value';
  distLabel.appendChild(distOut);
  distRow.appendChild(distLabel);
  const dist = document.createElement('input');
  dist.type = 'range';
  dist.id = P + '-distance';
  dist.min = '0';
  dist.max = String(DISTANCES.length - 1);
  dist.step = '1';
  dist.value = String(S.distIdx);
  dist.setAttribute('aria-label', 'Distance à la source, de 1 à 1 000 kilomètres');

  /* E021-05 / 08 / 10 : canvas accessible au clavier et décrit par la légende. */
  const canvas = document.createElement('canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe schématique de l’île choisie et de son niveau marin. '
    + 'Flèches gauche et droite : changer de type ; flèches haut et bas : changer la surface ; '
    + 'Page précédente et Page suivante : changer l’isolement.');
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown');
  canvas.setAttribute('aria-describedby', P + '-legend');

  const legendTextNode = mk('p', P + '-legend', legendText());
  legendTextNode.id = P + '-legend';

  /* E021-06 : grandeur textuelle annoncée, avec texte de repli déjà au DOM. */
  const readout = mk('p', P + '-readout',
    'Modèle de référence : 100 espèces pour 100 km² (z = 0,25) ; immigration relative 1,00 à la source.');
  readout.id = P + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = mk('button', '', S.playing ? '■ Arrêter la submersion' : '▶ Animer la submersion');
  play.type = 'button';
  play.id = P + '-play';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); /* bascule indépendante. */

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub,
    areaRow, area, distRow, dist, canvas, legendTextNode, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radioByKey, area, areaOut, dist, distOut, canvas, readout, play, legend: legendTextNode };
}

/* ---------- E021-05 / 08 : rendu du laboratoire (un seul canvas / frame) ---------- */

function hatch(g, w, h, spacing, color, cross) {
  g.strokeStyle = color;
  g.lineWidth = 1;
  const family = (sign) => {
    for (let k = -h; k <= w + h; k += spacing) {
      g.beginPath();
      g.moveTo(k, 0);
      g.lineTo(k + sign * h, h);
      g.stroke();
    }
  };
  family(1);
  if (cross) family(-1);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const seaY = pad + ih * 0.44;
  const zScale = ih * 0.40;
  const X = (u) => pad + u * iw;
  const Y = (z) => seaY - z * zScale;
  const bottom = Y(-1.1);
  const s = S.sweep;
  const ground = (u) => groundZ(S.type, u, s);

  /* Eau sous le niveau de référence. */
  g.fillStyle = 'rgba(120,170,210,.07)';
  g.fillRect(pad, seaY, iw, Math.max(0, bottom - seaY));

  /* Niveau de la mer : trait tireté, indépendant de la couleur. */
  g.setLineDash([6, 4]);
  g.strokeStyle = 'rgba(150,195,225,.85)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(pad, seaY);
  g.lineTo(pad + iw, seaY);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(170,205,230,.9)';
  g.font = '10px sans-serif';
  g.fillText('Niveau de la mer (référence z = 0)', pad + 2, seaY - 4);

  /* Sol : remplissage + hachures dont le motif distingue la matière. */
  const buildGround = (gg) => {
    gg.moveTo(X(0), bottom);
    gg.lineTo(X(0), Y(ground(0)));
    for (let i = 1; i <= 120; i += 1) {
      const u = i / 120;
      gg.lineTo(X(u), Y(ground(u)));
    }
    gg.lineTo(X(1), bottom);
    gg.closePath();
  };
  const mat = {
    continentale: { color: 'rgba(230,185,111,.55)', spacing: 7, cross: false, label: 'Socle continental (hachures /)' },
    volcanique: { color: 'rgba(244,214,158,.55)', spacing: 5, cross: false, label: 'Cône volcanique (hachures /)' },
    atoll: { color: 'rgba(244,214,158,.50)', spacing: 6, cross: false, label: 'Volcan en subsidence (hachures /)' },
    barriere: { color: 'rgba(214,207,193,.50)', spacing: 9, cross: false, label: 'Sédiment sableux (hachures espacées /)' },
  }[S.type];

  g.save();
  g.beginPath();
  buildGround(g);
  g.fillStyle = 'rgba(214,207,193,.10)';
  g.fill();
  g.clip();
  hatch(g, cssW, cssH, mat.spacing, mat.color, mat.cross);

  /* Grains de sable : position déterministe = f(graine, sweep). */
  g.fillStyle = 'rgba(244,214,158,.75)';
  GRAINS.forEach((p) => {
    const u = (p.x + s * p.s) % 1;
    g.fillRect(X(u), Y(-0.16 - 0.20 * p.y), 1.4, 1.4);
  });
  g.restore();

  /* Atoll : anneau corallien à quadrillage, lagon au centre (Darwin). */
  if (S.type === 'atoll') {
    const r = 0.10 + 0.10 * s;
    const wR = 0.032;
    [0.5 - r, 0.5 + r].forEach((c) => {
      const x0 = X(c - wR);
      const x1 = X(c + wR);
      g.save();
      g.beginPath();
      for (let i = 0; i <= 12; i += 1) {
        const u = c - wR + (2 * wR) * i / 12;
        const px = X(u);
        const py = Y(ground(u));
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.lineTo(x1, Y(-0.01));
      g.lineTo(x0, Y(-0.01));
      g.closePath();
      g.fillStyle = 'rgba(170,220,205,.14)';
      g.fill();
      g.clip();
      hatch(g, cssW, cssH, 4, 'rgba(170,220,205,.60)', true);
      g.restore();
      g.strokeStyle = 'rgba(200,235,220,.9)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x0, Y(-0.01));
      g.lineTo(x1, Y(-0.01));
      g.stroke();
    });
    g.fillStyle = 'rgba(170,205,230,.9)';
    g.fillText('Lagon', X(0.5) - 12, Y(-0.16));
  }

  /* Sommet : croix + libellé, jamais la seule couleur. */
  let uMax = 0.5;
  let zMax = -Infinity;
  for (let i = 1; i <= 120; i += 1) {
    const u = i / 120;
    const z = ground(u);
    if (z > zMax) { zMax = z; uMax = u; }
  }
  const mx = X(uMax);
  const my = Y(zMax);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(mx - 6, my); g.lineTo(mx + 6, my);
  g.moveTo(mx, my - 6); g.lineTo(mx, my + 6);
  g.stroke();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(zMax > 0 ? 'Sommet émergé' : 'Sommet immergé', clamp(mx + 8, pad + 2, cssW - 96), clamp(my - 6, pad + 12, cssH - pad - 30));

  /* Légende graphique et état de la submersion. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(mat.label, pad + 2, cssH - pad - 4);
  g.textAlign = 'right';
  g.fillText('Submersion relative : ' + fmt(s * 100, 0) + ' %', cssW - pad - 2, cssH - pad - 4);
  g.textAlign = 'left';
  if (S.type === 'atoll') {
    g.fillStyle = 'rgba(200,235,220,.95)';
    g.fillText(atollStage(s), pad + 2, cssH - pad - 18);
  }
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText(seedText(), pad + 2, pad + 12);
}

/* ---------- E021-06 : grandeurs chiffrées comparées à une référence ---------- */

function updateReadout() {
  const m = measures();
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Surface A = ${m.A} km² (référence : ${S_REF} espèces pour ${A_REF} km², z = ${fmt(Z_EXP, 2)}) — richesse estimée S = `));
  n.appendChild(fort(`${fmt(m.richness, 1)} espèces`));
  n.appendChild(document.createTextNode(`, soit `));
  n.appendChild(fort(`${fmt(m.ratio)}×`));
  n.appendChild(document.createTextNode(` la référence. Isolement D = ${m.D} km (référence : immigration 1,00 à la source) — immigration relative e^(−D/${D0}) = `));
  n.appendChild(fort(`${fmt(m.immigration)}×`));
  n.appendChild(document.createTextNode(`, perte `));
  n.appendChild(fort(`${fmt(m.perte * 100, 0)} %`));
  n.appendChild(document.createTextNode('. Modèle simplifié de MacArthur–Wilson : plus l’aire est grande, plus la richesse est forte ; plus l’isolement est grand, plus l’arrivée d’espèces faiblit.'));
}

function syncControls() {
  const n = S.nodes;
  TYPES.forEach((t) => {
    const radio = n.radioByKey && n.radioByKey[t.id];
    if (radio) radio.checked = S.type === t.id;
  });
  if (n.area) n.area.value = String(S.areaIdx);
  if (n.areaOut) n.areaOut.textContent = `${AREAS[S.areaIdx]} km²`;
  if (n.dist) n.dist.value = String(S.distIdx);
  if (n.distOut) n.distOut.textContent = `${DISTANCES[S.distIdx]} km`;
  if (n.legend) n.legend.textContent = legendText();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la submersion' : '▶ Animer la submersion';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E021-07 : boucle rAF unique, pause document.hidden + hors écran ---------- */

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
  if (!S.onScreen) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (S.lastTs && S.playing && !S.reduced) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep += dt * 0.00012 * S.dir;
    if (S.sweep >= 1) { S.sweep = 1; S.dir = -1; }
    if (S.sweep <= 0) { S.sweep = 0; S.dir = 1; }
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E021-10 : écouteurs globaux installés une seule fois ---------- */

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(P + '-panel');
        if (panel) panel.setAttribute('data-' + P + '-reduced', S.reduced ? '1' : '0');
        if (S.reduced) {
          S.playing = false;
          stopLoop();
        } else if (S.playing) startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  const cv = S.nodes.canvas;
  if (cv && typeof IntersectionObserver === 'function') {
    if (!S.io) {
      S.io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        S.onScreen = !entry || entry.isIntersecting;
        if (!S.onScreen) stopLoop();
        else if (S.playing && !S.reduced) startLoop();
      }, { threshold: 0.01 });
    }
    if (S.ioCanvas !== cv) {
      if (S.ioCanvas && typeof S.io.unobserve === 'function') S.io.unobserve(S.ioCanvas);
      S.io.observe(cv);
      S.ioCanvas = cv;
      S.onScreen = true;
    }
  }
  void ctx;
}

/* ---------- E021-09 : badge textuel de modèle sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  const idBadge = P + '-badge';
  if (!map || document.getElementById(idBadge)) return;
  const badge = mk('div', P + '-badge',
    'Coupe pédagogique : modèle aire–espèces S = c · A^z (MacArthur–Wilson) et submersion relative schématique, pas une donnée de terrain.');
  badge.id = idBadge;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E021', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.dataset[P + 'Reduced'] = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    TYPES.forEach((t) => {
      const radio = n.radioByKey[t.id];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.type = radio.value;
        syncControls();
      });
    });
    n.area.addEventListener('input', () => {
      S.areaIdx = clamp(Math.round(Number(n.area.value)), 0, AREAS.length - 1);
      syncControls();
    });
    n.dist.addEventListener('input', () => {
      S.distIdx = clamp(Math.round(Number(n.dist.value)), 0, DISTANCES.length - 1);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing || S.reduced) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = TYPES.findIndex((t) => t.id === S.type);
        S.type = TYPES[(i + step + TYPES.length) % TYPES.length].id;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.areaIdx = clamp(S.areaIdx + step, 0, AREAS.length - 1);
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const step = event.key === 'PageUp' ? 1 : -1;
        S.distIdx = clamp(S.distIdx + step, 0, DISTANCES.length - 1);
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing && !S.reduced) startLoop();
});
