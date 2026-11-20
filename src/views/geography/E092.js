import { register } from './registry.js';

/*
 * Lentille E092 — altitude des lieux (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E092-01 … E092-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E092', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e092`.
 * Tous les identifiants DOM sont préfixés `geography-e092-*`.
 * Zéro console, zéro réseau, zéro tirage aléatoire, au plus une requête
 * d'animation en vol (suspendue quand le document est masqué). Tout le
 * contenu substantiel est du texte DOM lisible sans script ; le canvas ne
 * détient aucune information exclusive.
 *
 * Rigueur des chiffres : aucune altitude de lieu réel n'est inventée. Les
 * repères proposés sont explicitement des « valeurs de démonstration ».
 * Les grandeurs affichées (température, pression, dénivelé, pente) sont
 * recalculées depuis les formules de l'atmosphère standard, avec des
 * constantes publiques, et comparées à la référence 0 m (niveau de la mer).
 */

const CSS_ID = 'geography-e092';
const SECTION_ID = 'geography-e092-section';
const TITLE_ID = 'geography-e092-title';
const GLOSSARY_ID = 'geography-e092-glossary';
const REFS_ID = 'geography-e092-references';
const MODELS_ID = 'geography-e092-models';
const PRESET_ID = 'geography-e092-preset';
const ALT_A_ID = 'geography-e092-alt-a';
const ALT_B_ID = 'geography-e092-alt-b';
const DIST_ID = 'geography-e092-distance';
const ALT_A_OUT_ID = 'geography-e092-alt-a-value';
const ALT_B_OUT_ID = 'geography-e092-alt-b-value';
const DIST_OUT_ID = 'geography-e092-distance-value';
const CANVAS_ID = 'geography-e092-canvas';
const READOUT_ID = 'geography-e092-readout';
const PROGRESS_ID = 'geography-e092-progress';
const PLAY_ID = 'geography-e092-play';
const STEPS_ID = 'geography-e092-steps';
const KEYS_ID = 'geography-e092-keys';
const BADGE_ID = 'geography-e092-badge';
const LEGEND_ID = 'geography-e092-legend';

/* Constantes de l'atmosphère standard (modèle de référence, pas une mesure locale). */
const P0 = 1013.25;          // hPa : pression au niveau de la mer
const T0 = 15;               // °C  : température au niveau de la mer
const LAPSE = 0.0065;        // °C/m : gradient thermique standard
const P_COEF = 2.25577e-5;   // 1/m : LAPSE / 288,15 K
const P_EXP = 5.25588;       // exposant g·M/(R·L) de la formule barométrique
const H_SCALE = 8400;        // m : hauteur d'échelle de l'approximation exponentielle
const H_MIN = -600;          // m :borne basse de l'échelle du profil
const H_MAX = 9200;          // m :borne haute de l'échelle du profil
const NARROW = '\u202f';     // espace insécable fine (typographie française)
const RAD = Math.PI / 180;

/* Quatre repères de démonstration (choix unique) : jamais des lieux réels. */
const PRESETS = [
  { key: 'mer', label: 'Niveau de la mer (0 m)', altitude: 0 },
  { key: 'plaine', label: 'Plaine de démonstration (200 m)', altitude: 200 },
  { key: 'col', label: 'Col de démonstration (1 500 m)', altitude: 1500 },
  { key: 'sommet', label: 'Sommet de démonstration (4 000 m)', altitude: 4000 },
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  hA: 1200,
  hB: 3000,
  distance: 20,
  preset: '',
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

function groupe(n) {
  const s = String(Math.round(Math.abs(n)));
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    if (i && (s.length - i) % 3 === 0) out += NARROW;
    out += s[i];
  }
  return (n < 0 ? '−' : '') + out;
}

const fmt = (n, d = 1) => (Math.round(n * (10 ** d)) / (10 ** d)).toFixed(d).replace('.', ',');

/* Température ISA : T(h) = T0 − LAPSE·h, valable dans la troposphère. */
function temperature(h) {
  return T0 - LAPSE * h;
}

/* Pression standard : P(h) = P0·(1 − LAPSE·h/T0)^5,25588 (h ≤ 11 000 m). */
function pressureStd(h) {
  return P0 * Math.pow(1 - P_COEF * h, P_EXP);
}

/* Approximation exponentielle : P(h) ≈ P0·exp(−h/H_SCALE). */
function pressureExp(h) {
  return P0 * Math.exp(-h / H_SCALE);
}

/* Hauteur du profil schématique au paramètre t ∈ [0, 1]. Cette formule est
   partagée par le dessin du curseur et par le message d'état : le point animé
   et l'altitude annoncée ne peuvent donc jamais diverger. Aucun aléa. */
function profileHeight(t, m) {
  const amp = Math.min(220, Math.abs(m.delta) * 0.08);
  return m.hA + m.delta * t + amp * Math.sin(6 * Math.PI * t);
}

function measures() {
  const delta = S.hB - S.hA;
  const tA = temperature(S.hA);
  const tB = temperature(S.hB);
  const pA = pressureStd(S.hA);
  const pExpA = pressureExp(S.hA);
  const pente = S.distance > 0 ? (delta / (1000 * S.distance)) * 100 : 0;
  const angle = S.distance > 0 ? Math.atan(delta / (1000 * S.distance)) / RAD : 0;
  return {
    hA: S.hA,
    hB: S.hB,
    delta,
    distance: S.distance,
    tA,
    tB,
    dT: tB - tA,
    pA,
    pExpA,
    ecartModeles: pExpA - pA,
    partP0: (pA / P0) * 100,
    pente,
    angle,
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e092-section{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e092-section h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e092-section h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e092-section p{margin:5px 0;max-width:68ch}
#geography-e092-section dl{margin:6px 0}
#geography-e092-section dt{margin-top:7px;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e092-section dd{margin:1px 0 0 10px;color:var(--ink-soft,#d7d1c6)}
#geography-e092-section .geography-e092-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e092-section table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e092-section table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e092-section table th,#geography-e092-section table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e092-section table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e092-section table td.geography-e092-num{text-align:right;font-variant-numeric:tabular-nums}
#geography-e092-preset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e092-preset legend{padding:0 4px;color:var(--muted)}
#geography-e092-section .geography-e092-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e092-section .geography-e092-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e092-section .geography-e092-curseur{display:block;margin:6px 0;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e092-section .geography-e092-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e092-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e092-legend{font-size:10px;color:var(--muted)}
#geography-e092-readout{
  min-height:40px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e092-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e092-progress{min-height:16px;margin:4px 0;color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums}
#geography-e092-section button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e092-section button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e092-section :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e092-canvas:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e092-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e092-section[data-geography-e092-reduced="1"] button,
#geography-e092-section[data-geography-e092-reduced="1"] .geography-e092-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e092-section button,.geography-e092-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e092-section{font-size:10px;padding:9px}
  #geography-e092-canvas{height:210px}
  #geography-e092-section .geography-e092-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique statique (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'L’altitude d’un lieu est sa distance verticale signée à un niveau de référence, par convention le niveau moyen des mers. Un lieu peut être au-dessus (altitude positive) ou au-dessous (altitude négative) de ce zéro.',
    'Le chiffre dépend de la surface choisie : la hauteur orthométrique est comptée depuis le géoïde, la hauteur ellipsoïdale depuis l’ellipsoïde. L’écart entre ces deux surfaces peut atteindre une centaine de mètres selon l’endroit.',
    'Dans la troposphère, l’atmosphère standard fait baisser la température de 0,0065 °C par mètre : à 1 000 m, la pression n’est plus qu’environ 89 % de sa valeur au niveau de la mer (1 013,25 hPa).',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e092-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticGlossary(ctx) {
  const dl = ctx.el('dl', 'geography-e092-glossaire');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Altitude', 'Distance verticale signée d’un point à un niveau de référence, en général le niveau moyen des mers ; elle se mesure en mètres.'],
    ['Niveau de référence', 'Surface de départ à partir de laquelle on compte l’altitude : c’est le zéro conventionnel d’un système de hauteurs.'],
    ['Géoïde', 'Surface de gravité constante qui prolonge le niveau moyen des mers sous les continents ; elle sert de référence aux altitudes orthométriques.'],
    ['Ellipsoïde', 'Surface mathématique de révolution (WGS84 pour le GPS) utilisée pour les coordonnées ; elle sert de référence aux altitudes ellipsoïdales.'],
    ['Hauteur orthométrique', 'Altitude comptée depuis le géoïde : c’est celle que fournit un nivellement et que portent les cartes terrestres.'],
    ['Hauteur ellipsoïdale', 'Altitude comptée depuis l’ellipsoïde : c’est celle que calcule directement un récepteur GPS avant conversion.'],
    ['Dénivelé', 'Différence d’altitude entre deux lieux : Δh = h₂ − h₁. Son signe indique si l’on monte ou si l’on descend.'],
    ['Isohypse', 'Courbe reliant, sur une carte, tous les points de même altitude : c’est l’équivalent d’une courbe de niveau.'],
  ];
  termes.forEach(([terme, definition]) => {
    const dt = ctx.el('dt', '', terme);
    const dd = ctx.el('dd', '', definition);
    dl.append(dt, dd);
  });
  return dl;
}

function staticReferenceTable(ctx) {
  const table = ctx.el('table');
  table.id = REFS_ID;
  const caption = ctx.el('caption', '', 'Surfaces de référence : une altitude n’a de sens que si l’on nomme la surface depuis laquelle elle est comptée.');
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Surface ou modèle', 'Rôle', 'Valeur de référence'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const lignes = [
    ['Niveau moyen des mers', 'Zéro conventionnel des cartes terrestres', '0 m, par définition'],
    ['Géoïde', 'Prolonge le niveau des mers sous les continents', 'Zéro sur l’océan, variable ailleurs'],
    ['Ellipsoïde WGS84', 'Référence des coordonnées GPS', 'Écart au géoïde : jusqu’à environ 100 m'],
    ['Atmosphère standard', 'Modèle de température et de pression', '15 °C et 1 013,25 hPa à 0 m'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = ctx.el(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildModelsTable(ctx) {
  const table = ctx.el('table');
  table.id = MODELS_ID;
  const caption = ctx.el('caption', '', 'Modèles standards recalculés depuis les formules : référence = 0 m, 15 °C et 1 013,25 hPa.');
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Altitude (m)', 'Écart à 0 m (m)', 'Température ISA (°C)', 'Pression standard (hPa)', 'Part de P0 (%)'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  [0, 1000, 2000, 3000, 4000].forEach((h) => {
    const tr = document.createElement('tr');
    const valeurs = [
      groupe(h), (h === 0 ? '0' : '+' + groupe(h)),
      fmt(temperature(h)), fmt(pressureStd(h)), fmt((pressureStd(h) / P0) * 100),
    ];
    valeurs.forEach((v, i) => {
      const cell = ctx.el('td', i === 0 ? '' : 'geography-e092-num', v);
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function staticSteps(ctx) {
  const ol = ctx.el('ol', 'geography-e092-etapes');
  ol.id = STEPS_ID;
  const etapes = [
    'Repérer la surface de référence indiquée par la source : le plus souvent le niveau moyen des mers.',
    'Lire l’altitude du lieu A et la comparer au zéro conventionnel de 0 m (niveau de la mer).',
    'Calculer le dénivelé vers le lieu B : Δh = h₂ − h₁, en conservant le signe.',
    'En déduire l’écart de température standard : ΔT = −0,0065 × Δh, exprimé en degrés Celsius.',
    'Vérifier la source de l’altitude avant de citer le chiffre : hauteur orthométrique et hauteur ellipsoïdale ne sont pas interchangeables.',
  ];
  etapes.forEach((texte) => ol.appendChild(ctx.el('li', '', texte)));
  return ol;
}

function staticKeysTable(ctx) {
  const table = ctx.el('table');
  table.id = KEYS_ID;
  table.appendChild(ctx.el('caption', '', 'Clavier du profil : le canevas est focalisable et chaque action a un équivalent textuel.'));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Touche', 'Action'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const lignes = [
    ['← / →', 'Diminuer / augmenter l’altitude A de 100 m'],
    ['↑ / ↓', 'Diminuer / augmenter l’altitude B de 100 m'],
    ['Début', 'Ramener l’altitude A au niveau de la mer (0 m)'],
    ['Fin', 'Porter l’altitude A à 9 000 m'],
  ];
  lignes.forEach(([touche, action]) => {
    const tr = document.createElement('tr');
    tr.appendChild(ctx.el('th', '', touche)).scope = 'row';
    const td = ctx.el('td', '', action);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function makeSlider(ctx, id, label, min, max, step, value, ariaLabel) {
  const row = document.createElement('p');
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(label + ' : '));
  const out = ctx.el('span', 'geography-e092-valeur');
  out.id = id + '-value';
  lab.appendChild(out);
  row.appendChild(lab);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.className = 'geography-e092-curseur';
  input.setAttribute('aria-label', ariaLabel);
  return { row, out, input };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(SECTION_ID);
  if (existant && existant.isConnected) {
    return {
      section: existant,
      fresh: false,
      presets: PRESETS.map((p) => document.getElementById(`geography-e092-preset-${p.key}`)),
      altA: document.getElementById(ALT_A_ID),
      altB: document.getElementById(ALT_B_ID),
      distance: document.getElementById(DIST_ID),
      altAOut: document.getElementById(ALT_A_OUT_ID),
      altBOut: document.getElementById(ALT_B_OUT_ID),
      distOut: document.getElementById(DIST_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      progress: document.getElementById(PROGRESS_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const section = ctx.el('section', 'geography-e092-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Altitude des lieux : lire une hauteur, la comparer, la corriger');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une altitude n’est jamais un nombre isolé : elle se compte depuis une surface de référence et se corrige selon le modèle employé. Ce laboratoire sépare la hauteur du lieu, son dénivelé et les grandeurs atmosphériques qui en découlent.');

  const hFait = ctx.el('h3', '', 'Trois faits de départ');
  const faits = staticFacts();

  const hGloss = ctx.el('h3', '', 'Vocabulaire de l’altitude');
  const glossaire = staticGlossary(ctx);

  const hRefs = ctx.el('h3', '', 'Les surfaces de référence');
  const refs = staticReferenceTable(ctx);

  const fieldset = document.createElement('fieldset');
  fieldset.id = PRESET_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Repère d’altitude (choix unique, valeurs de démonstration)';
  fieldset.appendChild(legend);
  PRESETS.forEach((p) => {
    const lab = ctx.el('label', 'geography-e092-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e092-preset';
    radio.id = `geography-e092-preset-${p.key}`;
    radio.value = p.key;
    radio.checked = S.preset === p.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(p.label));
    fieldset.appendChild(lab);
  });

  const hLab = ctx.el('h3', '', 'Laboratoire : profil vertical et grandeurs dérivées');
  const a = makeSlider(ctx, ALT_A_ID, 'Altitude du lieu A', -500, 9000, 100, S.hA,
    'Altitude du lieu A, de moins cinq cents à neuf mille mètres, pas de cent mètres');
  const b = makeSlider(ctx, ALT_B_ID, 'Altitude du lieu B', -500, 9000, 100, S.hB,
    'Altitude du lieu B, de moins cinq cents à neuf mille mètres, pas de cent mètres');
  const d = makeSlider(ctx, DIST_ID, 'Distance horizontale A → B', 1, 100, 1, S.distance,
    'Distance horizontale entre les lieux A et B, de un à cent kilomètres');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Profil schématique d’altitude entre les lieux A et B. Le trait pointillé marque le niveau de la mer à zéro mètre. Le triangle est le lieu A, le carré le lieu B. Flèches gauche et droite : altitude A ; haut et bas : altitude B ; Début : zéro mètre ; Fin : neuf mille mètres. Toutes les valeurs chiffrées sont données dans le message d’état et les tableaux.');

  const legendText = ctx.el('p', 'geography-e092-legend', 'Le triangle (A) et le carré (B), accompagnés de leur lettre, distinguent les lieux indépendamment de la couleur. Le trait pointillé est le zéro de référence.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e092-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const progress = ctx.el('p', '', '');
  progress.id = PROGRESS_ID;

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’ascension' : '▶ Animer l’ascension');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const hModels = ctx.el('h3', '', 'Tableau des modèles standards');
  const models = buildModelsTable(ctx);

  const hSteps = ctx.el('h3', '', 'Procédure de lecture en cinq temps');
  const steps = staticSteps(ctx);

  const hKeys = ctx.el('h3', '', 'Raccourcis clavier du profil');
  const keys = staticKeysTable(ctx);

  section.append(
    title, lead, hFait, faits, hGloss, glossaire, hRefs, refs,
    fieldset, hLab, a.row, a.input, b.row, b.input, d.row, d.input,
    canvas, legendText, readout, progress, play,
    hModels, models, hSteps, steps, hKeys, keys,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(section, aside.firstChild);

  return {
    section, fresh: true,
    presets: PRESETS.map((p) => document.getElementById(`geography-e092-preset-${p.key}`)),
    altA: a.input, altB: b.input, distance: d.input,
    altAOut: a.out, altBOut: b.out, distOut: d.out,
    canvas, readout, progress, play,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, dessin déterministe) ---------- */

function marker(g, x, y, forme, lettre) {
  g.fillStyle = 'rgba(244,214,158,.98)';
  if (forme === 'triangle') {
    g.beginPath();
    g.moveTo(x, y - 7);
    g.lineTo(x - 6, y + 5);
    g.lineTo(x + 6, y + 5);
    g.closePath();
    g.fill();
  } else {
    g.fillRect(x - 6, y - 6, 12, 12);
  }
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = 'bold 9px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(lettre, x, y - 14);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const plotW = Math.max(40, cssW - padL - padR);
  const plotH = Math.max(40, cssH - padT - padB);
  const yOf = (h) => padT + (1 - (h - H_MIN) / (H_MAX - H_MIN)) * plotH;
  const xOf = (t) => padL + t * plotW;

  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.strokeRect(padL, padT, plotW, plotH);

  /* Graduations d'altitude : le trait à 0 m est la référence. */
  g.font = '9px sans-serif';
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (let h = 0; h <= 9000; h += 1000) {
    const y = yOf(h);
    g.strokeStyle = h === 0 ? 'rgba(244,214,158,.75)' : 'rgba(255,255,255,.10)';
    g.setLineDash(h === 0 ? [5, 4] : []);
    g.beginPath();
    g.moveTo(padL, y);
    g.lineTo(padL + plotW, y);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = h === 0 ? 'rgba(244,214,158,.95)' : 'rgba(214,207,193,.75)';
    g.fillText(groupe(h), padL - 5, y);
  }

  /* Profil schématique : fonction périodique déterministe, aucun aléa. */
  const m = measures();
  const steps = 60;
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    pts.push({ x: xOf(t), y: yOf(profileHeight(t, m)) });
  }
  g.beginPath();
  g.moveTo(pts[0].x, yOf(H_MIN));
  pts.forEach((p) => g.lineTo(p.x, p.y));
  g.lineTo(pts[pts.length - 1].x, yOf(H_MIN));
  g.closePath();
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fill();

  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.stroke();

  marker(g, pts[0].x, pts[0].y, 'triangle', 'A');
  marker(g, pts[pts.length - 1].x, pts[pts.length - 1].y, 'carre', 'B');

  /* Curseur d'ascension : même formule que le readout, sans quantification. */
  const cpX = xOf(S.phase);
  const cpY = yOf(profileHeight(S.phase, m));
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath();
  g.arc(cpX, cpY, 4, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(8,12,18,.9)';
  g.lineWidth = 1;
  g.stroke();

  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('Profil schématique · A → B sur ' + fmt(S.distance, 0) + ' km', padL, cssH - 8);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(214,207,193,.8)';
  g.fillText('0 m = niveau de la mer', padL + plotW, cssH - 8);
}

/* ---------- Grandeurs chiffrées et message d'état ---------- */

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
  n.appendChild(document.createTextNode('Altitude A = '));
  n.appendChild(fort(`${groupe(m.hA)} m`));
  n.appendChild(document.createTextNode(' ; écart à la référence 0 m (niveau de la mer) = '));
  n.appendChild(fort(`${m.hA >= 0 ? '+' : '−'}${groupe(Math.abs(m.hA))} m`));
  n.appendChild(document.createTextNode('. Dénivelé A → B : Δh = '));
  n.appendChild(fort(`${m.delta >= 0 ? '+' : '−'}${groupe(Math.abs(m.delta))} m`));
  n.appendChild(document.createTextNode('. Température ISA : '));
  n.appendChild(fort(`${fmt(m.tA)} °C`));
  n.appendChild(document.createTextNode(' en A, soit '));
  n.appendChild(fort(`${m.dT >= 0 ? '+' : '−'}${fmt(Math.abs(m.dT))} °C`));
  n.appendChild(document.createTextNode(' en B (référence 15 °C à 0 m). Pression standard : '));
  n.appendChild(fort(`${fmt(m.pA)} hPa`));
  n.appendChild(document.createTextNode(' en A, soit '));
  n.appendChild(fort(`${fmt(m.partP0)} %`));
  n.appendChild(document.createTextNode(' de P0 = 1 013,25 hPa ; l’approximation exponentielle donne '));
  n.appendChild(fort(`${fmt(m.pExpA)} hPa`));
  n.appendChild(document.createTextNode(' (écart '));
  n.appendChild(fort(`${m.ecartModeles >= 0 ? '+' : '−'}${fmt(Math.abs(m.ecartModeles))} hPa`));
  n.appendChild(document.createTextNode('). Pente moyenne sur '));
  n.appendChild(fort(`${fmt(S.distance, 0)} km`));
  n.appendChild(document.createTextNode(' : '));
  n.appendChild(fort(`${fmt(m.pente)} %`));
  n.appendChild(document.createTextNode(' (angle '));
  n.appendChild(fort(`${fmt(m.angle)}°`));
  n.appendChild(document.createTextNode(').'));
}

function updateProgress() {
  const n = S.nodes.progress;
  if (!n) return;
  const m = measures();
  const hCourant = profileHeight(S.phase, m);
  n.textContent = `Ascension : ${fmt(S.phase * 100, 0)} % du parcours · altitude courante ${groupe(hCourant)} m · température ${fmt(temperature(hCourant))} °C.`;
}

function updateBadge() {
  const badge = document.getElementById(BADGE_ID);
  if (badge) badge.textContent = `Altitude A : ${groupe(S.hA)} m · référence : niveau de la mer (0 m)`;
}

function syncControls() {
  const n = S.nodes;
  n.presets.forEach((radio, i) => {
    if (radio) radio.checked = S.preset === PRESETS[i].key;
  });
  if (n.altA) n.altA.value = String(S.hA);
  if (n.altB) n.altB.value = String(S.hB);
  if (n.distance) n.distance.value = String(S.distance);
  if (n.altAOut) n.altAOut.textContent = `${groupe(S.hA)} m`;
  if (n.altBOut) n.altBOut.textContent = `${groupe(S.hB)} m`;
  if (n.distOut) n.distOut.textContent = `${fmt(S.distance, 0)} km`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’ascension' : '▶ Animer l’ascension';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  updateProgress();
  drawLab();
  updateBadge();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

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
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof ctxReduced() === 'boolean' ? ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) {
      S.phase += dt * 0.00016;
      if (S.phase > 1) S.phase -= 1;
    }
  }
  S.lastTs = ts;
  updateProgress();
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* Mémoire de la préférence fournie par la coque, avec repli matchMedia. */
let ctxMotion = null;
function ctxReduced() {
  if (typeof ctxMotion === 'function') return !!ctxMotion();
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  }
  return false;
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const section = document.getElementById(SECTION_ID);
        if (section) section.dataset.geographyE092Reduced = mq.matches ? '1' : '0';
        if (mq.matches) {
          S.playing = false;
          stopLoop();
          if (S.nodes.play) {
            S.nodes.play.textContent = '▶ Animer l’ascension';
            S.nodes.play.setAttribute('aria-pressed', 'false');
          }
        }
        updateProgress();
        drawLab();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null)
    : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e092-badge');
  badge.id = BADGE_ID;
  badge.textContent = `Altitude A : ${groupe(S.hA)} m · référence : niveau de la mer (0 m)`;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E092', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  ctxMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.section.dataset.geographyE092Reduced = reduced ? '1' : '0';
  if (reduced) {
    S.playing = false;
    stopLoop();
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.presets.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.preset = PRESETS[i].key;
        S.hA = PRESETS[i].altitude;
        S.phase = 0;
        syncControls();
      });
    });
    n.altA.addEventListener('input', () => {
      S.hA = Math.max(-500, Math.min(9000, Math.round(Number(n.altA.value) / 100) * 100));
      S.preset = PRESETS.find((p) => p.altitude === S.hA)?.key || '';
      syncControls();
    });
    n.altB.addEventListener('input', () => {
      S.hB = Math.max(-500, Math.min(9000, Math.round(Number(n.altB.value) / 100) * 100));
      syncControls();
    });
    n.distance.addEventListener('input', () => {
      S.distance = Math.max(1, Math.min(100, Math.round(Number(n.distance.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.hA = Math.max(-500, Math.min(9000, S.hA + (event.key === 'ArrowRight' ? 100 : -100)));
        S.preset = PRESETS.find((p) => p.altitude === S.hA)?.key || '';
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        S.hB = Math.max(-500, Math.min(9000, S.hB + (event.key === 'ArrowUp' ? 100 : -100)));
      } else if (event.key === 'Home') {
        S.hA = 0;
        S.preset = 'mer';
      } else if (event.key === 'End') {
        S.hA = 9000;
        S.preset = '';
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        S.phase = 0;
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing && !reduced) startLoop();
});
