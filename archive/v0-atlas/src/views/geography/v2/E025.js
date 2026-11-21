import { register } from './registry.js';

/* V2 — lentille E025 de la vue GEOGRAPHIE.
 * Thème : volcans et points chauds.
 *
 * Seconde passe : les dix chantiers E025-01 … E025-10 sont réellement
 * implémentés ci-dessous et décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E025.md. La chaîne d'îles reste un modèle
 * déterministe (âge = distance / vitesse), jamais une donnée de terrain réelle :
 * le badge E025-09 et le paragraphe de limite falsifiable le disent explicitement.
 *
 * Contrat : register('E025', ctx => {...}), ctx = { viewId, stage, layout,
 * css, el, reducedMotion() }. Un seul appel à ctx.css('geography-v2-e025', …),
 * des identifiants préfixés geography-v2-e025-*, aucun appel réseau, aucune
 * graine aléatoire, aucune console, une seule boucle rAF mise en pause sur
 * document.hidden (et, nouveauté V2, hors écran via IntersectionObserver).
 * Le texte pédagogique est du HTML sémantique réel, lisible sans animation ;
 * le canvas n'est qu'un laboratoire.
 */

const CSS_ID = 'geography-v2-e025';
const PANEL_ID = 'geography-v2-e025-panel';
const TITLE_ID = 'geography-v2-e025-title';
const CONTEXT_ID = 'geography-v2-e025-context';
const SPEED_ID = 'geography-v2-e025-speed';
const SPEED_OUT_ID = 'geography-v2-e025-speed-value';
const CANVAS_ID = 'geography-v2-e025-canvas';
const READOUT_ID = 'geography-v2-e025-readout';
const PLAY_ID = 'geography-v2-e025-play';
const LEGEND_ID = 'geography-v2-e025-legend';
const HELP_ID = 'geography-v2-e025-help';
const BADGE_ID = 'geography-v2-e025-badge';
const TABLE_ID = 'geography-v2-e025-table';

const SPEED_DEFAULT = 8.2;  /* cm/an : plaque Pacifique près de Hawaï (référence). */
const SPEED_REF = 8.2;      /* vitesse de référence explicitement affichée. */
const SPEED_MIN = 2;
const SPEED_MAX = 16;
const SEED = 0xE025;        /* graine fixe et affichée, zéro tirage aléatoire. */
const SWEEP_MS = 14000;     /* durée d'une dérive complète du traceur. */

/* 1 cm/an = 10 km/Ma. Une plaque à 8,2 cm/an recouvre 82 km par million d'années. */
const KM_PAR_MA_PAR_CM_AN = 10;

/* Les trois contextes volcaniques, avec des valeurs de référence réelles. */
const ORDER = ['dorsale', 'subduction', 'pointchaud'];
const CONTEXTS = {
  dorsale: {
    label: 'Dorsale océanique', sio2: '≈ 50 %', vei: '0 – 1',
    style: 'Effusif, basalte fluide', cadre: 'Divergence des plaques',
  },
  subduction: {
    label: 'Subduction', sio2: '52 – 63 %', vei: '3 – 6',
    style: 'Explosif, lave visqueuse', cadre: 'Convergence des plaques',
  },
  pointchaud: {
    label: 'Point chaud', sio2: '45 – 50 %', vei: '0 – 2',
    style: 'Effusif, basanite et basalte', cadre: 'Volcanisme intraplaque',
  },
};

/* Chaîne hawaïenne schématique : distance au point chaud actif (km), arrondie.
   Les âges affichés sont des estimations de modèle, pas des mesures de terrain. */
const ISLANDS = [
  { name: 'Hawaï (Big Island)', short: 'Hawaï', dist: 0 },
  { name: 'Maui', short: 'Maui', dist: 160 },
  { name: 'Molokaʻi', short: 'Molokaʻi', dist: 240 },
  { name: 'Oʻahu', short: 'Oʻahu', dist: 370 },
  { name: 'Kauaʻi', short: 'Kauaʻi', dist: 520 },
  { name: 'Niʻihau', short: 'Niʻihau', dist: 620 },
];
const MAX_DIST = 700;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  context: 'pointchaud',
  speed: SPEED_DEFAULT,
  selected: 0,
  playing: false,
  reduced: false,
  visible: true,
  sweep: 0,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observerBound: false,
  nodes: {},
};

/* ---------- Générateur déterministe (mulberry32, graine affichée) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Positions fixes des petites irrégularités du trait : jamais tirées au hasard. */
const RIPPLE = (() => {
  const r = mulberry32(SEED);
  return Array.from({ length: 9 }, () => 0.4 + r() * 0.5);
})();

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, digits = 1) => n.toFixed(digits).replace('.', ',');

/* Âge modèle (Ma) = distance (km) / vitesse (km/Ma). */
function ageOf(distKm, speedCmAn = S.speed) {
  return distKm / (speedCmAn * KM_PAR_MA_PAR_CM_AN);
}

/* Vitesse en km/Ma, comparée à la référence de 8,2 cm/an. */
function kmParMa(speedCmAn = S.speed) {
  return speedCmAn * KM_PAR_MA_PAR_CM_AN;
}

function measures() {
  const isl = ISLANDS[S.selected];
  const age = ageOf(isl.dist);
  const ref = ISLANDS[ISLANDS.length - 1];
  return {
    nom: isl.name,
    distance: isl.dist,
    age: age,
    ageRef: ageOf(ref.dist),
    ratio: ageOf(ref.dist) > 0 ? age / ageOf(ref.dist) : 0,
    vitesseKmMa: kmParMa(),
    vitessePct: Math.round((S.speed / SPEED_REF) * 100),
    contexte: CONTEXTS[S.context],
  };
}

function legendText() {
  const c = CONTEXTS[S.context];
  return `Contexte : ${c.label} · ${c.cadre} · SiO₂ ${c.sio2} · VEI ${c.vei}. `
    + 'Un triangle marque le volcan actif, un cercle une île ancienne ; '
    + 'le trait tireté est la trace du point chaud, indépendamment de la couleur. '
    + `Graine ${SEED} (${SEED.toString(16)}).`;
}

/* ---------- Feuille de style unique, injectée une seule fois (E025-01) ---------- */

const CSS = `
#geography-v2-e025-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e025-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e025-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e025-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e025-panel .geography-v2-e025-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-v2-e025-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-v2-e025-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-v2-e025-table th,#geography-v2-e025-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-v2-e025-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e025-context{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e025-context legend{padding:0 4px;color:var(--muted)}
#geography-v2-e025-panel .geography-v2-e025-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-v2-e025-panel .geography-v2-e025-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e025-speed{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e025-speed-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e025-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-v2-e025-legend,#geography-v2-e025-help{font-size:10px;color:var(--muted)}
#geography-v2-e025-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e025-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e025-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-v2-e025-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e025-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e025-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-v2-e025-panel[data-geography-v2-e025-reduced="1"] button,
#geography-v2-e025-panel[data-geography-v2-e025-reduced="1"] .geography-v2-e025-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e025-panel button,.geography-v2-e025-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-v2-e025-panel{font-size:10px;padding:9px}
  #geography-v2-e025-canvas{height:190px}
  #geography-v2-e025-panel .geography-v2-e025-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans animation) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un point chaud est une zone de remontée de magma — une « plume » — indépendante des frontières de plaques. À la différence d’un volcan de subduction, il peut percer le milieu d’une plaque : c’est le volcanisme intraplaque, comme à Hawaï ou à La Réunion.',
    'La plaque se déplace au-dessus d’un point chaud resté presque fixe. Il en résulte une chaîne d’îles dont l’âge croît avec la distance au volcan actif : à Hawaï, la plaque Pacifique avance d’environ 8,2 cm/an, soit 82 km par million d’années.',
    'Trois contextes produisent l’essentiel du volcanisme mondial : les dorsales (divergence), les subductions (convergence) et les points chauds (intraplaque). La teneur en silice (SiO₂) commande la viscosité : un basalte pauvre en silice coule en lave fluide, une andésite visqueuse piège les gaz et explose.',
    'Limite falsifiable : si les âges mesurés sur la chaîne ne croissaient pas linéairement avec la distance au volcan actif, l’hypothèse d’un point chaud fixe sous une plaque en mouvement serait infirmée. Le modèle « âge = distance / vitesse » est donc une prédiction réfutable, pas une simple description.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e025-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* E025-02 : tableau comparatif statique, lisible et indexable sans JS. */
function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Trois contextes volcaniques — valeurs de référence (SiO₂ et indice d’explosivité VEI de 0 à 8).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Contexte', 'SiO₂', 'VEI typique', 'Style éruptif'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ORDER.forEach((key) => {
    const c = CONTEXTS[key];
    const tr = document.createElement('tr');
    [c.label, c.sio2, c.vei, c.style].forEach((value, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = value;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radioByKey: {
        dorsale: document.getElementById('geography-v2-e025-context-dorsale'),
        subduction: document.getElementById('geography-v2-e025-context-subduction'),
        pointchaud: document.getElementById('geography-v2-e025-context-pointchaud'),
      },
      speed: document.getElementById(SPEED_ID),
      speedOut: document.getElementById(SPEED_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e025-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Volcans et points chauds (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Pourquoi une chaîne d’îles se fait-elle plus ancienne à mesure qu’on s’éloigne du volcan actif ? Le point chaud restant fixe tandis que la plaque glisse dessus transforme la dérive en horloge géologique. Seconde passe : le modèle reste réfutable et chiffré.');

  /* E025-03 : choix unique natif, avec rôle `radiogroup` explicite (V2). Pas d'aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = CONTEXT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Contexte volcanique observé — choix unique');
  const legendElt = document.createElement('legend');
  legendElt.textContent = 'Contexte volcanique observé (choix unique)';
  fieldset.appendChild(legendElt);
  const radioByKey = {};
  ORDER.forEach((key) => {
    const lab = ctx.el('label', 'geography-v2-e025-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e025-context';
    radio.id = 'geography-v2-e025-context-' + key;
    radio.value = key;
    radio.checked = S.context === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(CONTEXTS[key].label));
    fieldset.appendChild(lab);
    radioByKey[key] = radio;
  });

  const sub = ctx.el('h3', '', 'Explorer la vitesse de la plaque');
  const speedRow = ctx.el('p', '');
  const speedLabel = document.createElement('label');
  speedLabel.setAttribute('for', SPEED_ID);
  speedLabel.appendChild(document.createTextNode('Vitesse de dérive : '));
  const speedOut = document.createElement('span');
  speedOut.id = SPEED_OUT_ID;
  speedOut.className = 'geography-v2-e025-valeur';
  speedLabel.appendChild(speedOut);
  speedRow.appendChild(speedLabel);

  /* E025-04 : curseur borné au domaine des vitesses de plaques (cm/an). */
  const speed = document.createElement('input');
  speed.type = 'range';
  speed.id = SPEED_ID;
  speed.min = String(SPEED_MIN);
  speed.max = String(SPEED_MAX);
  speed.step = '0.1';
  speed.value = String(SPEED_DEFAULT);
  speed.setAttribute('aria-label', 'Vitesse de dérive de la plaque, de 2 à 16 centimètres par an');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  /* E025-10 : raccourcis et description annoncés aux technologies d'assistance. */
  canvas.setAttribute('aria-describedby', HELP_ID);
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End');
  canvas.setAttribute('aria-label', 'Chaîne de points chauds schématique (V2) : un point chaud fixe à gauche et des îles dont l’âge croît vers la droite. Flèches gauche et droite : changer d’île ; flèches haut et bas : modifier la vitesse ; Début et Fin : première ou dernière île.');

  const legendTextNode = ctx.el('p', 'geography-v2-e025-legend', legendText());
  legendTextNode.id = LEGEND_ID;
  const help = ctx.el('p', 'geography-v2-e025-help', 'Clavier : ← → changer d’île, ↑ ↓ ajuster la vitesse, Début/Fin extrémités de la chaîne ; le bouton anime la dérive de la plaque.');
  help.id = HELP_ID;

  const readout = ctx.el('p', 'geography-v2-e025-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la dérive' : '▶ Animer la dérive');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, speedRow, speed,
    canvas, legendTextNode, help, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radioByKey, speed, speedOut, canvas, readout, play, legend: legendTextNode };
}

/* ---------- Rendu du laboratoire (un seul canvas, un seul dessin/frame) ---------- */

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

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (xn) => pad + xn * iw;
  const py = (yn) => pad + yn * ih;
  const midY = py(0.54);

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* E025-08 : trace tireté du point chaud — repère non chromatique. */
  g.strokeStyle = 'rgba(214,207,193,.55)';
  g.lineWidth = 1.4;
  if (g.setLineDash) g.setLineDash([6, 5]);
  g.beginPath();
  g.moveTo(px(0.1), midY);
  g.lineTo(px(0.92), midY);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  /* Point chaud fixe, halo pulsé de façon déterministe (phase, jamais d'aléa). */
  const hx = px(0.1);
  const pulse = 5 + 2 * (0.5 + 0.5 * Math.sin(S.phase * 2 * Math.PI));
  g.strokeStyle = 'rgba(244,214,158,.5)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(hx, midY, pulse + 3, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.arc(hx, midY, 3.5, 0, Math.PI * 2);
  g.fill();
  g.font = '9px sans-serif';
  g.fillText('point chaud actif', hx + 6, midY - 10);

  /* E025-05 / E025-08 : îles d'âge croissant, triangle actif puis cercles. */
  ISLANDS.forEach((isl, i) => {
    if (isl.dist <= 0) return;
    const xn = 0.1 + (isl.dist / MAX_DIST) * 0.82;
    const x = px(xn);
    const age = ageOf(isl.dist);
    const shrink = Math.max(0.35, 1 - age / 14);
    if (i === S.selected) {
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, midY, 10, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.strokeStyle = 'rgba(255,255,255,.75)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(x, midY, 5 * shrink, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.fillText(isl.short, x - 15, midY + 18);
  });

  /* Ondulations du trait, position fixe issue de la graine (E025-05). */
  g.strokeStyle = 'rgba(230,185,111,.55)';
  g.lineWidth = 1;
  RIPPLE.forEach((v, i) => {
    const x = px(0.14 + i * 0.085);
    const y = midY - 4 - v * 5;
    g.beginPath();
    g.moveTo(x - 3, y);
    g.lineTo(x, y - 4);
    g.lineTo(x + 3, y);
    g.stroke();
  });

  /* Traceur animé : la plaque emporte une île loin du point chaud (E025-07). */
  const tx = px(0.1 + S.sweep * 0.82);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath();
  g.arc(tx, midY - 22, 3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)';
  g.fillText('dérive de la plaque', Math.min(tx - 18, cssW - 90), midY - 28);

  /* Échelle et graine affichée (reproductibilité). */
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.font = '10px sans-serif';
  g.fillText('V2 · âge = distance / vitesse', pad + 2, pad + 12);
  g.fillText('graine ' + SEED, pad + 2, cssH - pad - 4);
}

/* ---------- Grandeurs chiffrées comparées à une référence (E025-06) ---------- */

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
  n.appendChild(document.createTextNode('Île sélectionnée : '));
  n.appendChild(fort(m.nom));
  n.appendChild(document.createTextNode('. Distance au point chaud : '));
  n.appendChild(fort(m.distance + ' km'));
  n.appendChild(document.createTextNode(' · âge modèle = distance / vitesse = '));
  n.appendChild(fort(fmt(m.age) + ' Ma'));
  n.appendChild(document.createTextNode('. Vitesse '));
  n.appendChild(fort(fmt(S.speed) + ' cm/an'));
  n.appendChild(document.createTextNode(' = '));
  n.appendChild(fort(m.vitesseKmMa + ' km/Ma'));
  n.appendChild(document.createTextNode(', soit '));
  n.appendChild(fort(m.vitessePct + ' %'));
  n.appendChild(document.createTextNode(' de la référence de 8,2 cm/an. L’île la plus ancienne (Niʻihau) atteint '));
  n.appendChild(fort(fmt(m.ageRef) + ' Ma'));
  n.appendChild(document.createTextNode(' : '));
  n.appendChild(fort(fmt(m.ratio * 100) + ' %'));
  n.appendChild(document.createTextNode(' de cet âge maximum. Contexte '));
  n.appendChild(fort(m.contexte.label));
  n.appendChild(document.createTextNode(' : VEI typique ' + m.contexte.vei + ' sur 8.'));
}

function syncControls() {
  const n = S.nodes;
  const m = measures();
  ORDER.forEach((key) => {
    const radio = n.radioByKey && n.radioByKey[key];
    if (radio) radio.checked = key === S.context;
  });
  if (n.speed) n.speed.value = String(S.speed);
  if (n.speedOut) n.speedOut.textContent = fmt(S.speed) + ' cm/an (' + m.vitesseKmMa + ' km/Ma)';
  if (n.legend) n.legend.textContent = legendText();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la dérive' : '▶ Animer la dérive';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden et hors écran (E025-07) ---------- */

function estReduit(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') return !!ctx.reducedMotion();
  return false;
}

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop(ctx) {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible) return;
  if (estReduit(ctx)) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame((ts) => tick(ts, ctx));
}

function tick(ts, ctx) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible) return;
  const reduced = estReduit(ctx);
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) {
      S.sweep = (S.sweep + dt / SWEEP_MS) % 1;
      S.phase = (S.phase + dt / 2200) % 1;
    }
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced && S.visible) S.rafId = requestAnimationFrame((next) => tick(next, ctx));
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop(ctx);
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyV2E025Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); } else if (S.playing) startLoop(ctx);
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  /* Nouveauté V2 : pause aussi hors écran, si IntersectionObserver existe. */
  if (!S.observerBound && typeof IntersectionObserver === 'function' && S.nodes.panel) {
    S.observerBound = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        S.visible = entry.isIntersecting;
        if (!S.visible) stopLoop();
        else if (S.playing) startLoop(ctx);
      });
    }, { root: null, threshold: 0.01 });
    io.observe(S.nodes.panel);
  }
  void ctx;
}

/* ---------- Badge textuel sur la carte existante (E025-09) ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-v2-e025-badge', 'Chaîne de points chauds schématique (V2) : les âges sont calculés par âge = distance / vitesse, ce ne sont pas des mesures de terrain.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E025', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = estReduit(ctx);
  S.reduced = reduced;
  S.nodes.panel.dataset.geographyV2E025Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDER.forEach((key) => {
      const radio = n.radioByKey[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.context = key;
        syncControls();
      });
    });
    n.speed.addEventListener('input', () => {
      S.speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(Number(n.speed.value) * 10) / 10));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop(ctx);
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        S.selected = (S.selected + step + ISLANDS.length) % ISLANDS.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 0.5 : -0.5;
        S.speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round((S.speed + step) * 10) / 10));
      } else if (event.key === 'Home') {
        S.selected = 0;
      } else if (event.key === 'End') {
        S.selected = ISLANDS.length - 1;
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
  if (S.playing && !S.reduced) startLoop(ctx);
});
