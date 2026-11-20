import { register } from './registry.js';

/* Lentille V2 E031 — vue GEOGRAPHIE.
 * Thème : courants océaniques — dérive de surface, paramètre de Coriolis,
 * transport et spirale d'Ekman, gyres subtropicaux, circulation thermohaline.
 *
 * Les dix chantiers E031-01 … E031-10 sont réellement implémentés ci-dessous :
 *  01 section sémantique autonome, limite falsifiable et glossaire (sans JS) ;
 *  02 feuille de style unique et identifiants préfixés geography-v2-e031- ;
 *  03 paramètre de Coriolis f = 2Ω sin φ (référence polaire 2Ω) ;
 *  04 dérive de surface et contrainte du vent τ = ρ_air·C_d·U² ;
 *  05 transport d'Ekman M = τ/(ρ f) (référence : vent fixe, latitude variable) ;
 *  06 épaisseur de la couche d'Ekman δ = π√(2K/|f|) ;
 *  07 spirale d'Ekman (vue canvas déterministe) ;
 *  08 gyre subtropical et sens de rotation lié au signe de f ;
 *  09 densité thermohaline ρ = ρ₀[1 − α(T−T₀) + β(S−S₀)] et plongée ;
 *  10 laboratoire accessible : rAF unique, pauses, mouvement réduit, live.
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire (mulberry32,
 * graine fixe SEED = 0xE031 affichée), aucune sortie console, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique inséré dans
 * le DOM : il reste lisible et indexable même sans animation ni interaction.
 * Le canvas n'est qu'un laboratoire dont chaque grandeur est aussi écrite en
 * toutes lettres dans le readout et le tableau.
 *
 * Nouveautés V2 : role="radiogroup" explicite, aria-keyshortcuts et
 * aria-describedby sur le canvas, IntersectionObserver (pause hors écran),
 * limite falsifiable et défi en 5 temps énoncés dans le panneau, graine
 * déterministe affichée, garde ferme du mouvement réduit sur la boucle rAF.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e031';
const P = 'geography-v2-e031';
const SEED = 0xE031; /* graine fixe et affichée, zéro tirage aléatoire. */

/* Constantes physiques (valeurs canoniques, aucune donnée fabriquée). */
const RAD = Math.PI / 180;
const OMEGA = 7.2921159e-5;   /* vitesse angulaire de la Terre (rad/s) */
const RHO_SEA = 1025;         /* masse volumique de l'eau de mer (kg/m³) */
const RHO_AIR = 1.225;        /* masse volumique de l'air (kg/m³) */
const CD = 1.3e-3;            /* coefficient de traînée surface-air */
const KM = 0.05;              /* viscosité tourbillonnaire verticale (m²/s) */
const SURF_FRACTION = 0.025;  /* dérive de surface ≈ 2,5 % du vent */
const RHO0 = 1027;            /* densité de référence (kg/m³) */
const T0 = 10;                /* température de référence (°C) */
const S0 = 35;                /* salinité de référence (psu) */
const ALPHA = 2.0e-4;         /* dilatation thermique (1/°C) */
const BETA = 7.6e-4;          /* contraction haline (1/psu) */
const LAT_FLOOR = 5;          /* plancher de latitude pour les formules à 1/f */
const POLE_F = 2 * OMEGA;     /* référence polaire f = 2Ω */

const VIEWS = {
  ekman: 'Spirale d’Ekman',
  gyre: 'Gyre subtropical',
  thermo: 'Circulation thermohaline',
};
const VIEW_ORDER = ['ekman', 'gyre', 'thermo'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  view: 'ekman',
  lat: 45,
  wind: 10,
  temp: 10,
  sal: 35,
  playing: false,
  reduced: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  visBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  nodes: {},
};

/* ---------- E031-05 / graine : générateur déterministe (mulberry32) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Points de courant décoratifs, reproductibles, jamais tirés au hasard. */
const GRAINS = (() => {
  const r = mulberry32(SEED);
  return Array.from({ length: 30 }, () => ({ x: r(), y: r(), s: 0.5 + r() * 1.2 }));
})();

function seedText() {
  return `graine ${SEED} (0x${SEED.toString(16)}, ${SEED.toString(10)})`;
}

/* ---------- Formules déterministes ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const nf = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

function coriolis(lat) {
  return 2 * OMEGA * Math.sin(clamp(lat, -85, 85) * RAD);
}

function fSafe(lat) {
  return Math.max(Math.abs(coriolis(lat)), Math.abs(coriolis(LAT_FLOOR)));
}

function inertialHours(lat) {
  return (2 * Math.PI) / fSafe(lat) / 3600;
}

function windStress(u) {
  return RHO_AIR * CD * u * u;
}

function surfaceDrift(u) {
  return SURF_FRACTION * u;
}

function ekmanTransport(u, lat) {
  return windStress(u) / (RHO_SEA * fSafe(lat));
}

function ekmanDepth(lat) {
  return Math.PI * Math.sqrt((2 * KM) / fSafe(lat));
}

function ekmanScale(lat) {
  return Math.sqrt((2 * KM) / fSafe(lat));
}

function density(t, s) {
  return RHO0 * (1 - ALPHA * (t - T0) + BETA * (s - S0));
}

/* ---------- E031-02 : feuille de style unique, injectée une seule fois ---------- */

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
#${P}-panel .${P}-defi{margin:6px 0 2px;padding-left:9px;border-left:2px solid var(--muted,#9a938a)}
#${P}-panel ol.${P}-etapes{margin:4px 0 6px;padding-left:22px}
#${P}-panel ol.${P}-etapes li{margin:2px 0}
#${P}-glossaire{margin:7px 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px}
#${P}-glossaire dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:4px}
#${P}-glossaire dd{margin:0 0 2px 12px;color:var(--ink-soft,#d7d1c6)}
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
#${P}-panel .${P}-cursor{margin:7px 0}
#${P}-panel .${P}-cursor label{display:block;margin-bottom:2px}
#${P}-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${P}-panel .${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
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
  #${P}-canvas{height:200px}
  #${P}-panel .${P}-choix{margin-right:4px}
}
`;

/* ---------- E031-01 / 02 : construction du panneau (texte sémantique) ---------- */

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* E031-01 : trois faits sourcés, une limite falsifiable, un défi en 5 temps
 * et un glossaire — tout en texte réel au DOM, lisible sans JS. Les termes
 * (Coriolis, Ekman, gyre, thermohaline, sverdrup) sont définis à leur
 * première occurrence dans les paragraphes ci-dessous. */
function staticFacts() {
  const wrap = mk('div');
  const faits = [
    'Un courant océanique est un mouvement d’eau de mer, horizontal ou vertical, entretenu par le vent, par les différences de densité et par la rotation de la Terre. Le sverdrup (Sv) est l’unité de transport : 1 Sv = 10⁶ m³/s.',
    'La force de Coriolis (du nom du physicien Gaspard-Gustave de Coriolis) dévie tout mouvement sur la Terre : vers la droite dans l’hémisphère nord, vers la gauche dans l’hémisphère sud. Près de la surface, le vent entraîne l’eau ; en profondeur, ce mouvement s’affaiblit et tourne : c’est la spirale d’Ekman, nommée d’après le physicien Vagn Walfrid Ekman.',
    'Un gyre subtropical est une vaste boucle de courants, horaire au nord et antihoraire au sud, refermée par les vents et la Coriolis. La circulation thermohaline est, elle, portée par la densité : une eau froide et salée est plus dense, coule, puis remonte lentement ailleurs, formant un « tapis roulant » mondial.',
  ];
  faits.forEach((texte) => wrap.appendChild(mk('p', P + '-fait', texte)));
  wrap.appendChild(mk('p', P + '-limite',
    'Limite falsifiable : les formules affichées sont un modèle idéalisé (vent uniforme, viscosité constante, plancher de 5° près de l’équateur). Elles ne prédisent ni la position réelle des courants, ni les effets du relief des fonds, des marées ou de la stratification saisonnière ; les flèches du canvas sont schématiques, pas une mesure sur le terrain.'));
  wrap.appendChild(mk('p', P + '-defi',
    'Défi — le transport d’Ekman dépend-il de la latitude ? (1) Prédiction : à vent constant, le transport doit augmenter vers l’équateur. (2) Réglage : fixer le vent à 10 m/s puis comparer 15° et 75°. (3) Résultat attendu : M = τ/(ρf) croît quand |f| diminue. (4) Falsification : si M restait identique en changeant la latitude, le modèle serait réfuté. (5) Débrief : le modèle tient hors de l’équateur, où le plancher à 5° empêche la division par zéro et limite la prédiction.'));
  return wrap;
}

/* E031-02 : tableau des grands courants, référence chiffrée dans le caption. */
function staticTable() {
  const table = mk('table');
  table.id = P + '-table';
  table.appendChild(mk('caption', '',
    'Grands courants et transports approximatifs (1 Sv = 10⁶ m³/s) — ordres de grandeur de référence, pas des mesures du jour.'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Courant', 'Type', 'Transport (Sv)', 'Vitesse (m/s)'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  const lignes = [
    ['Courant circumpolaire antarctique', 'Vent / gyre', '137', '0,3–0,5'],
    ['Gulf Stream', 'Vent / gyre', '30', '1,0–2,5'],
    ['Kuroshio', 'Vent / gyre', '20', '1,0–2,0'],
    ['Courant de Humboldt', 'Remontée', '10–15', '0,2–0,4'],
    ['Tapis roulant thermohalin', 'Densité', '15–20', '0,01–0,05'],
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

/* Glossaire : définitions courtes, doublant la première occurrence du texte. */
function staticGlossary() {
  const dl = mk('dl');
  dl.id = P + '-glossaire';
  const entrees = [
    ['Coriolis', 'Force d’inertie due à la rotation terrestre : f = 2Ω sin φ, nulle à l’équateur et maximale aux pôles.'],
    ['Spirale d’Ekman', 'Décroissance et rotation du courant avec la profondeur sous l’effet du vent et de la Coriolis.'],
    ['Gyre', 'Boucle de courants à l’échelle d’un bassin océanique, fermée par les vents et la rotation.'],
    ['Transport d’Ekman', 'Volume d’eau déplacé par unité de largeur : M = τ/(ρf), en m²/s.'],
    ['Thermohaline', 'Relatif à la densité (« thermo » = température, « haline » = salinité) : boucle portée par la plongée d’eau dense.'],
    ['Sverdrup (Sv)', 'Unité de débit océanique : 1 Sv = 10⁶ m³/s.'],
  ];
  entrees.forEach(([terme, def]) => {
    dl.appendChild(mk('dt', '', terme));
    dl.appendChild(mk('dd', '', def));
  });
  return dl;
}

function legendText() {
  return VIEWS[S.view] + ' · la forme des flèches, l’épaisseur des traits et les libellés distinguent les phénomènes, indépendamment de la couleur. '
    + 'Points de courant reproductibles, ' + seedText() + '.';
}

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = mk('p', P + '-cursor');
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(labelText + ' : '));
  const out = mk('span', P + '-value');
  out.id = outId;
  lab.appendChild(out);
  row.appendChild(lab);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', aria);
  row.appendChild(input);
  return { row, input, out };
}

function ensurePanel(ctx) {
  const idPanel = P + '-panel';
  const existant = document.getElementById(idPanel);
  if (existant && existant.isConnected) {
    const radioByKey = {};
    VIEW_ORDER.forEach((v) => { radioByKey[v] = document.getElementById(P + '-view-' + v); });
    return {
      panel: existant,
      fresh: false,
      radioByKey,
      lat: document.getElementById(P + '-lat'),
      latOut: document.getElementById(P + '-lat-value'),
      wind: document.getElementById(P + '-vent'),
      windOut: document.getElementById(P + '-vent-value'),
      temp: document.getElementById(P + '-temp'),
      tempOut: document.getElementById(P + '-temp-value'),
      sal: document.getElementById(P + '-sal'),
      salOut: document.getElementById(P + '-sal-value'),
      canvas: document.getElementById(P + '-canvas'),
      readout: document.getElementById(P + '-readout'),
      play: document.getElementById(P + '-play'),
      legend: document.getElementById(P + '-legend'),
    };
  }

  const panel = mk('section', P + '-panel');
  panel.id = idPanel;
  panel.setAttribute('aria-labelledby', P + '-title');

  const title = mk('h2', '', 'Courants océaniques');
  title.id = P + '-title';
  const lead = ctx.el('p', '', 'Du vent à la densité : ce laboratoire relie la force de Coriolis, le transport d’Ekman et la circulation thermohaline à quelques formules que l’on peut manipuler.');

  /* E031-03 / 08 / 09 : radiogroup natif + role explicite, pas d'aria-pressed. */
  const fieldset = mk('fieldset');
  fieldset.id = P + '-set';
  fieldset.setAttribute('role', 'radiogroup');
  const legendElt = mk('legend', '', 'Vue du laboratoire (choix unique)');
  fieldset.appendChild(legendElt);
  const radioByKey = {};
  VIEW_ORDER.forEach((value) => {
    const lab = mk('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-view';
    radio.id = P + '-view-' + value;
    radio.value = value;
    radio.checked = S.view === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(VIEWS[value]));
    fieldset.appendChild(lab);
    radioByKey[value] = radio;
  });

  const sub = mk('h3', '', 'Explorer les grandeurs');

  /* E031-03 / 04 / 06 / 09 : quatre curseurs étiquetés. */
  const lat = rangeRow('Latitude', P + '-lat', P + '-lat-value', -80, 80, 5, S.lat, 'Latitude observée, de moins 80 à plus 80 degrés');
  const wind = rangeRow('Vent', P + '-vent', P + '-vent-value', 0, 30, 1, S.wind, 'Vitesse du vent, de 0 à 30 mètres par seconde');
  const temp = rangeRow('Température', P + '-temp', P + '-temp-value', -2, 30, 1, S.temp, 'Température de l’eau, de moins 2 à 30 degrés Celsius');
  const sal = rangeRow('Salinité', P + '-sal', P + '-sal-value', 30, 38, 0.5, S.sal, 'Salinité, de 30 à 38 unités pratiques');

  /* E031-07 / 10 : canvas accessible au clavier et décrit par la légende. */
  const canvas = document.createElement('canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire des courants océaniques. '
    + 'Flèches gauche et droite : changer de vue ; flèches haut et bas : changer la latitude par pas de 5 degrés.');
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown');
  canvas.setAttribute('aria-describedby', P + '-legend');

  const legendTextNode = mk('p', P + '-legend', legendText());
  legendTextNode.id = P + '-legend';

  /* E031-06 / 10 : grandeur textuelle annoncée, avec texte de repli au DOM. */
  const readout = mk('p', P + '-readout',
    'Modèle de référence : f = 2Ω sin φ (pôle 14,584×10⁻⁵ s⁻¹), dérive de surface ≈ 0,30 m/s en océan ouvert, densité ρ₀ = 1 027 kg/m³.');
  readout.id = P + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = mk('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer le courant');
  play.type = 'button';
  play.id = P + '-play';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); /* bascule indépendante. */

  panel.append(title, lead, staticFacts(), staticTable(), staticGlossary(), fieldset, sub,
    lat.row, lat.input, wind.row, wind.input, temp.row, temp.input, sal.row, sal.input,
    canvas, legendTextNode, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radioByKey,
    lat: lat.input, latOut: lat.out,
    wind: wind.input, windOut: wind.out,
    temp: temp.input, tempOut: temp.out,
    sal: sal.input, salOut: sal.out,
    canvas, readout, play, legend: legendTextNode,
  };
}

/* ---------- E031-07 / 08 / 09 : rendu du laboratoire (un seul canvas / frame) ---------- */

function arrow(g, x1, y1, x2, y2, head = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.moveTo(x2, y2);
  g.lineTo(x2 - head * Math.cos(a - 0.5), y2 - head * Math.sin(a - 0.5));
  g.moveTo(x2, y2);
  g.lineTo(x2 - head * Math.cos(a + 0.5), y2 - head * Math.sin(a + 0.5));
  g.stroke();
}

/* Points de courant déterministes, doublés par le texte de la légende. */
function drawFlowDots(g, cssW, cssH, pad, iw, ih, dir) {
  const s = S.sweep;
  g.fillStyle = 'rgba(214,207,193,.35)';
  GRAINS.forEach((p) => {
    const u = (p.x + dir * s * p.s + 1) % 1;
    const x = pad + u * iw;
    const y = pad + (0.15 + 0.7 * p.y) * ih;
    g.fillRect(x, y, 1.4, 1.4);
  });
  void cssW; void cssH;
}

function drawEkman(g, cssW, cssH, pad, iw, ih) {
  const cx = pad + iw * 0.5;
  const cy = pad + ih * 0.58;
  const scale = Math.min(iw, ih) * 0.34;
  const north = coriolis(S.lat) >= 0;
  const sens = north ? -1 : 1; // déviation à droite (N) / à gauche (S)

  /* Vent vers l'est. */
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2.5;
  arrow(g, cx - scale * 0.9, pad + 24, cx + scale * 0.55, pad + 24, 10);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('Vent', cx + scale * 0.6, pad + 27);

  /* Spirale : longueur décroissante, rotation avec la profondeur. */
  g.lineWidth = 2;
  for (let k = 0; k <= 4; k += 1) {
    const z = k; // profondeur en unités d'échelle e
    const mag = Math.exp(-z);
    const ang = sens * (Math.PI / 4 + z);
    const ex = cx + Math.cos(ang) * scale * 0.8 * mag;
    const ey = cy - Math.sin(ang) * scale * 0.8 * mag;
    g.strokeStyle = `rgba(214,207,193,${(0.95 - k * 0.16).toFixed(2)})`;
    arrow(g, cx, cy, ex, ey, 7);
    g.fillStyle = 'rgba(214,207,193,.65)';
    g.fillText(`−${nf(z * ekmanScale(S.lat), 0)} m`, 4 + pad, cy + 4 + z * 16);
  }

  /* Marqueur animé : suit la spirale, position déterministe = f(S.sweep). */
  const z = S.sweep * 4;
  const mag = Math.exp(-z);
  const ang = sens * (Math.PI / 4 + z);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx + Math.cos(ang) * scale * 0.8 * mag, cy - Math.sin(ang) * scale * 0.8 * mag, 4, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(north ? 'Hémisphère nord : dévie à droite' : 'Hémisphère sud : dévie à gauche', pad + 2, cssH - pad - 18);
  g.fillText(`Épaisseur d’Ekman ≈ ${nf(ekmanDepth(S.lat), 0)} m`, pad + 2, cssH - pad - 4);
}

function drawGyre(g, cssW, cssH, pad, iw, ih) {
  const cx = pad + iw * 0.5;
  const cy = pad + ih * 0.5;
  const rx = iw * 0.33;
  const ry = ih * 0.3;
  const north = coriolis(S.lat) >= 0;
  const dir = north ? 1 : -1; // horaire (N) / antihoraire (S)

  /* Bassin schématique. */
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();

  /* Flèches de circulation le long du gyre. */
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(214,207,193,.85)';
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    const a2 = a + dir * 0.42;
    const x1 = cx + Math.cos(a) * rx;
    const y1 = cy + Math.sin(a) * ry;
    const x2 = cx + Math.cos(a2) * rx;
    const y2 = cy + Math.sin(a2) * ry;
    arrow(g, x1, y1, x2, y2, 7);
  }

  /* Marqueur animé sur le pourtour. */
  const a = S.sweep * Math.PI * 2 * dir;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 4.5, 0, Math.PI * 2);
  g.fill();

  /* Vents alignés : alizés à l'équateur, westerlies au pôle. */
  g.strokeStyle = 'rgba(244,214,158,.8)';
  g.lineWidth = 1.5;
  arrow(g, cx - rx, cy + ry + 16, cx + rx * 0.2, cy + ry + 16, 6);
  arrow(g, cx + rx, cy - ry - 16, cx - rx * 0.2, cy - ry - 16, 6);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(north ? 'Hémisphère nord : sens horaire' : 'Hémisphère sud : sens antihoraire', pad + 2, cssH - pad - 4);
}

function drawThermo(g, cssW, cssH, pad, iw, ih) {
  const left = pad + iw * 0.16;
  const right = pad + iw * 0.84;
  const top = pad + ih * 0.28;
  const bot = pad + ih * 0.78;
  const rho = density(S.temp, S.sal);
  const dense = rho >= RHO0;

  /* Couche de surface (chaude) et fond (froid). */
  g.setLineDash([]);
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(244,214,158,.9)';
  arrow(g, left, top, right, top, 8);
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.font = '10px sans-serif';
  g.fillText('Surface : eau chaude vers le pôle', left, top - 8);

  g.strokeStyle = 'rgba(170,205,235,.9)';
  arrow(g, right - 8, bot, left + 8, bot, 8);
  g.fillStyle = 'rgba(170,205,235,.9)';
  g.fillText('Profondeur : retour d’eau froide', left, bot + 16);

  /* Plongée / remontée : l'épaisseur du trait porte l'état de densité. */
  g.lineWidth = dense ? 4 : 1.5;
  g.strokeStyle = 'rgba(214,207,193,.95)';
  if (dense) {
    arrow(g, right, top, right, bot, 9);
    g.fillText('Plongée (eau dense)', right - 96, (top + bot) / 2);
  } else {
    arrow(g, right, bot, right, top, 9);
    g.fillText('Pas de plongée (eau légère)', right - 120, (top + bot) / 2);
  }
  g.lineWidth = 1.5;
  arrow(g, left, bot, left, top, 7);

  /* Marqueur animé sur la boucle. */
  const t = S.sweep;
  let mx;
  let my;
  if (t < 0.4) { mx = left + (t / 0.4) * (right - left); my = top; }
  else if (t < 0.65) { mx = right; my = top + ((t - 0.4) / 0.25) * (bot - top); }
  else if (t < 0.9) { mx = right - ((t - 0.65) / 0.25) * (right - left); my = bot; }
  else { mx = left; my = bot - ((t - 0.9) / 0.1) * (bot - top); }
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(mx, my, 4.5, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Densité ρ ≈ ${nf(rho, 2)} kg/m³ (réf. ${nf(RHO0, 0)} à ${T0} °C / ${S0} psu)`, pad + 2, cssH - pad - 4);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);

  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Points de courant reproductibles (graine affichée, aucun tirage au hasard). */
  if (S.view !== 'thermo') {
    const dir = coriolis(S.lat) >= 0 ? 1 : -1;
    drawFlowDots(g, cssW, cssH, pad, iw, ih, dir);
  }

  if (S.view === 'ekman') drawEkman(g, cssW, cssH, pad, iw, ih);
  else if (S.view === 'gyre') drawGyre(g, cssW, cssH, pad, iw, ih);
  else drawThermo(g, cssW, cssH, pad, iw, ih);

  g.fillStyle = 'rgba(214,207,193,.7)';
  g.font = '9px sans-serif';
  g.fillText(seedText(), pad + 2, pad + 10);
}

/* ---------- E031-03 / 04 / 06 / 10 : grandeurs chiffrées comparées ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const f = coriolis(S.lat);
  const drift = surfaceDrift(S.wind);
  const transport = ekmanTransport(S.wind, S.lat);
  const prof = ekmanDepth(S.lat);
  const rho = density(S.temp, S.sal);

  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const ligne = (texte) => {
    const p = document.createElement('span');
    p.style.display = 'block';
    p.textContent = texte;
    return p;
  };

  n.textContent = '';
  const l1 = document.createElement('span');
  l1.style.display = 'block';
  l1.appendChild(document.createTextNode(`Coriolis f = ${nf(f * 1e5, 3)}×10⁻⁵ s⁻¹ (réf. pôle 2Ω = ${nf(POLE_F * 1e5, 3)}×10⁻⁵) ; période d’inertie `));
  l1.appendChild(fort(`${nf(inertialHours(S.lat), 1)} h`));
  n.appendChild(l1);

  const l2 = document.createElement('span');
  l2.style.display = 'block';
  l2.appendChild(document.createTextNode(`Contrainte du vent ${nf(windStress(S.wind), 3)} N/m² ; dérive de surface `));
  l2.appendChild(fort(`${nf(drift, 2)} m/s`));
  l2.appendChild(document.createTextNode(` (≈ 2,5 % du vent, réf. 0,30 m/s en océan ouvert) ; transport d’Ekman `));
  l2.appendChild(fort(`${nf(transport, 2)} m²/s`));
  n.appendChild(l2);

  n.appendChild(ligne(`Couche d’Ekman ≈ ${nf(prof, 0)} m (K = ${nf(KM, 2)} m²/s) ; ` +
    `densité ${nf(rho, 2)} kg/m³ (réf. ρ₀ = ${nf(RHO0, 0)}), ` +
    (rho >= RHO0 ? 'eau dense : plongée possible.' : 'eau légère : pas de plongée.')));
}

function syncControls() {
  const n = S.nodes;
  VIEW_ORDER.forEach((v) => {
    const radio = n.radioByKey && n.radioByKey[v];
    if (radio) radio.checked = S.view === v;
  });
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = `${S.lat}°`;
  if (n.wind) n.wind.value = String(S.wind);
  if (n.windOut) n.windOut.textContent = `${S.wind} m/s`;
  if (n.temp) n.temp.value = String(S.temp);
  if (n.tempOut) n.tempOut.textContent = `${S.temp} °C`;
  if (n.sal) n.sal.value = String(S.sal);
  if (n.salOut) n.salOut.textContent = `${nf(S.sal, 1)} psu`;
  if (n.legend) n.legend.textContent = legendText();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le courant';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E031-10 : boucle rAF unique, pause document.hidden + hors écran ---------- */

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
  if (S.reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || S.reduced) return;
  if (S.lastTs && S.playing) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * 0.00008) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

/* Écouteurs globaux installés une seule fois. */
function installGlobalListeners() {
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
}

/* ---------- Badge textuel sur la carte existante (idempotent) ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  const idBadge = P + '-badge';
  if (!map || document.getElementById(idBadge)) return;
  const badge = mk('div', P + '-badge',
    'Flèches schématiques issues de formules déterministes (Coriolis, Ekman, densité) — ' + seedText() + ', pas une donnée de terrain.');
  badge.id = idBadge;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E031', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.setAttribute('data-' + P + '-reduced', reduced ? '1' : '0');
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    VIEW_ORDER.forEach((v) => {
      const radio = n.radioByKey[v];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.view = radio.value;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(n.lat.value) / 5) * 5, -80, 80);
      syncControls();
    });
    n.wind.addEventListener('input', () => {
      S.wind = clamp(Math.round(Number(n.wind.value)), 0, 30);
      syncControls();
    });
    n.temp.addEventListener('input', () => {
      S.temp = clamp(Math.round(Number(n.temp.value)), -2, 30);
      syncControls();
    });
    n.sal.addEventListener('input', () => {
      S.sal = clamp(Math.round(Number(n.sal.value) * 2) / 2, 30, 38);
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
        const i = VIEW_ORDER.indexOf(S.view);
        S.view = VIEW_ORDER[(i + step + VIEW_ORDER.length) % VIEW_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = clamp(S.lat + step, -80, 80);
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
