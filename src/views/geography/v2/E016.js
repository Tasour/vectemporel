import { register } from './registry.js';

/* Lentille E016 — passe V2, vue GEOGRAPHIE.
 * Thème : climats et classification de Köppen–Geiger (groupes A, B, C, D, E).
 *
 * Les dix chantiers E016-01 … E016-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E016.md. Tout est
 * local : zéro réseau, zéro journalisation, aucun générateur aléatoire, aucun
 * fichier partagé ni module de la passe 1 modifié. Le contenu pédagogique est du
 * texte sémantique réel (h2, h3, p, dl, table, fieldset, label, ol) inséré dans
 * le DOM : il reste lisible et indexable même sans animation ni interaction. Le
 * canvas n'est qu'un laboratoire qui illustre des règles de classification
 * déterministes (deux cosinus de période 12, aucune donnée fabriquée au hasard).
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e016';
const P = 'geography-v2-e016-';
const PANEL_ID = P + 'panel';
const TITLE_ID = P + 'title';
const GLOSSARY_ID = P + 'glossary';
const TABLE_ID = P + 'table';
const DEFI_ID = P + 'defi';
const REGIME_ID = P + 'regime';
const HEMI_ID = P + 'hemi';
const TEMP_ID = P + 'temp';
const TEMP_OUT_ID = P + 'temp-value';
const AMPT_ID = P + 'amp-t';
const AMPT_OUT_ID = P + 'amp-t-value';
const PLUIE_ID = P + 'pluie';
const PLUIE_OUT_ID = P + 'pluie-value';
const AMPP_ID = P + 'amp-p';
const AMPP_OUT_ID = P + 'amp-p-value';
const CANVAS_ID = P + 'canvas';
const LEGEND_ID = P + 'legend';
const READOUT_ID = P + 'readout';
const CODE_ID = P + 'code';
const PLAY_ID = P + 'play';
const BADGE_ID = P + 'badge';

const REGIMES = {
  ete: 'Pluies d’été',
  hiver: 'Pluies d’hiver',
  egal: 'Pluies réparties',
};
const REGIME_ORDER = ['ete', 'hiver', 'egal'];
const HEMIS = { nord: 'Hémisphère nord', sud: 'Hémisphère sud' };
const HEMI_ORDER = ['nord', 'sud'];

/* Chantier E016-08 — villes de référence : normales approximatives et code
   attendu d'après les atlas climatiques. Les codes affichés sont recalculés
   par classer(), jamais recopiés. */
const VILLES_REFERENCE = [
  { nom: 'Manaus', t: 27, ampT: 2, p: 2300, ampP: 0.45, regime: 'egal', hemi: 'sud', attendu: 'Af' },
  { nom: 'Le Caire', t: 21, ampT: 7.5, p: 25, ampP: 0.5, regime: 'hiver', hemi: 'nord', attendu: 'BWh' },
  { nom: 'Marseille', t: 15.5, ampT: 8.5, p: 620, ampP: 0.7, regime: 'hiver', hemi: 'nord', attendu: 'Csa' },
  { nom: 'Paris', t: 12, ampT: 7.5, p: 640, ampP: 0.15, regime: 'egal', hemi: 'nord', attendu: 'Cfb' },
  { nom: 'Moscou', t: 5.5, ampT: 13.5, p: 700, ampP: 0.4, regime: 'ete', hemi: 'nord', attendu: 'Dfb' },
  { nom: 'Longyearbyen', t: -6, ampT: 11, p: 220, ampP: 0.3, regime: 'ete', hemi: 'nord', attendu: 'ET' },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  temp: 12,
  ampT: 7.5,
  pluie: 640,
  ampP: 0.15,
  regime: 'egal',
  hemi: 'nord',
  sweep: 0,
  playing: false,
  inView: true,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  observersInstalled: false,
  observedCanvas: null,
  intersection: null,
  nodes: {},
  lecture: null,
  comparaison: null,
};

/* Alias de ctx.el, initialisé au point d'entrée (les helpers l'utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};
/* Source unique du mouvement réduit, fournie par la coque. */
let R = () => false;
let ctxLayout = null;
let ctxStage = null;

/* ---------- Utilitaires déterministes ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function fmt0(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}
function fmt1(n) {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}
function fmt2(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}
function somme(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i += 1) s += arr[i];
  return s;
}
function moyenne(arr) {
  return arr.length ? somme(arr) / arr.length : 0;
}

/* Chantier E016-01 — série mensuelle déterministe : deux cosinus de période 12.
   La moyenne des douze températures vaut exactement T et la somme des douze
   précipitations vaut exactement P (la somme d'un cosinus complet est nulle).
   Aucune donnée n'est inventée au hasard, aucune graine n'est nécessaire. */
function serieMensuelle(T, ampT, P, ampP, regime, hemi) {
  const moisChaud = hemi === 'sud' ? 1 : 7;
  const moisFroid = ((moisChaud + 5) % 12) + 1;
  const moisPluvieux = regime === 'hiver' ? moisFroid : moisChaud;
  const a = regime === 'egal' ? 0 : clamp(ampP, 0, 1);
  const Tm = [];
  const Pm = [];
  for (let m = 1; m <= 12; m += 1) {
    const angleT = (2 * Math.PI * (m - moisChaud)) / 12;
    const angleP = (2 * Math.PI * (m - moisPluvieux)) / 12;
    Tm.push(T + ampT * Math.cos(angleT));
    Pm.push((P / 12) * (1 + a * Math.cos(angleP)));
  }
  return { Tm, Pm, moisChaud, moisFroid };
}

/* Chantiers E016-02 … E016-06 — clé de détermination de Köppen–Geiger.
   L'ordre des tests est celui de la clé officielle : B d'abord (l'aridité
   prime), puis A, puis E, puis C ou D. Le paramètre `seuilFroid` vaut −3
   pour Köppen–Geiger et 0 pour la convention historique de Köppen. */
function classer(Tm, Pm, seuilFroid) {
  const indices = [];
  let tMin = Infinity;
  let tMax = -Infinity;
  let pMin = Infinity;
  let pMax = -Infinity;
  let moisSec = 1;
  for (let i = 0; i < 12; i += 1) {
    const t = Tm[i];
    const p = Pm[i];
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
    if (p < pMin) { pMin = p; moisSec = i + 1; }
    if (p > pMax) pMax = p;
    indices.push(i);
  }
  const tMoy = moyenne(Tm);
  const pTot = somme(Pm);

  /* Chantier E016-03 — seuil d'aridité P_limite = 20·T + f, avec f = 0 si au
     moins 70 % des pluies tombent pendant les six mois les plus chauds, f = 280
     si au moins 70 % tombent pendant les six mois les plus froids, sinon 140. */
  const chauds = indices.slice().sort((a, b) => Tm[b] - Tm[a]).slice(0, 6);
  const pChaud = somme(chauds.map((i) => Pm[i]));
  const partChaude = pTot > 0 ? pChaud / pTot : 0;
  const f = partChaude >= 0.7 ? 0 : (partChaude <= 0.3 ? 280 : 140);
  const seuilB = 20 * tMoy + f;

  let code;
  let groupe;
  let raison;

  if (pTot < seuilB) {
    /* Chantier E016-03 — BW (désert) sous la moitié du seuil, BS (steppe)
       au-dessus ; h si la moyenne atteint 18 °C, k sinon. */
    groupe = 'B';
    code = (pTot < seuilB / 2 ? 'BW' : 'BS') + (tMoy >= 18 ? 'h' : 'k');
    raison = 'précipitations ' + fmt0(pTot) + ' mm sous le seuil ' + fmt0(seuilB) + ' mm';
  } else if (tMin >= 18) {
    /* Chantier E016-04 — isotherme tropical 18 °C ; Af si le mois sec ≥ 60 mm,
       Am s'il reste ≥ 100 − P/25, sinon Aw/As selon la saison du mois sec. */
    groupe = 'A';
    const troisieme = pMin >= 60
      ? 'f'
      : (pMin >= 100 - pTot / 25 ? 'm' : (Tm[moisSec - 1] < tMoy ? 'w' : 's'));
    code = 'A' + troisieme;
    raison = 'mois le plus froid ' + fmt1(tMin) + ' °C ≥ 18 °C';
  } else if (tMax < 10) {
    /* Chantier E016-02 — isotherme de 10 °C : ET (toundra) au-dessus de 0 °C
       pour le mois le plus chaud, EF (glace perpétuelle) au-dessous. */
    groupe = 'E';
    code = tMax < 0 ? 'EF' : 'ET';
    raison = 'mois le plus chaud ' + fmt1(tMax) + ' °C < 10 °C';
  } else {
    /* Chantier E016-05 — C si le mois le plus froid est au-dessus du seuil
       (0 ou −3 °C), D sinon ; à condition qu'au moins un mois dépasse 10 °C. */
    const estC = tMin > seuilFroid;
    groupe = estC ? 'C' : 'D';

    /* Chantier E016-05 — suffixe thermique : a ≥ 22 °C, b ≥ 4 mois à 10 °C,
       c > −38 °C, d sinon (réservé aux climats D). */
    const nbMoisChauds = Tm.filter((t) => t >= 10).length;
    let deux;
    if (tMax >= 22) deux = 'a';
    else if (nbMoisChauds >= 4) deux = 'b';
    else if (tMin > -38) deux = 'c';
    else deux = 'd';

    /* Chantier E016-06 — suffixe hygrique : s (été sec) si le mois sec d'été
       est sous 40 mm et sous le tiers du mois le plus humide d'hiver ; w (hiver
       sec) si le mois sec d'hiver est sous le dixième du mois humide d'été ;
       f sinon (aucune saison sèche). */
    const idxChauds = indices.filter((i) => Tm[i] >= tMoy);
    const idxFroids = indices.filter((i) => Tm[i] < tMoy);
    const pSecChaud = idxChauds.length ? Math.min(...idxChauds.map((i) => Pm[i])) : Infinity;
    const pMaxFroid = idxFroids.length ? Math.max(...idxFroids.map((i) => Pm[i])) : -Infinity;
    const pSecFroid = idxFroids.length ? Math.min(...idxFroids.map((i) => Pm[i])) : Infinity;
    const pMaxChaud = idxChauds.length ? Math.max(...idxChauds.map((i) => Pm[i])) : -Infinity;
    let trois;
    if (pSecChaud < 40 && pSecChaud < pMaxFroid / 3) trois = 's';
    else if (pSecFroid < pMaxChaud / 10) trois = 'w';
    else trois = 'f';

    /* Ordre des lettres pour C et D : groupe, saison sèche (f/s/w), chaleur
       (a/b/c/d). Cfb = tempéré, sans saison sèche, été tempéré. */
    code = groupe + trois + deux;
    raison = estC
      ? 'mois le plus froid ' + fmt1(tMin) + ' °C > ' + fmt0(seuilFroid) + ' °C'
      : 'mois le plus froid ' + fmt1(tMin) + ' °C ≤ ' + fmt0(seuilFroid) + ' °C';
  }

  return {
    code, groupe, raison, f, seuilB, tMoy, pTot, tMin, tMax, pMin, pMax,
    partChaude, moisSec,
  };
}

/* Chantier E016-07 — variante de convention : Köppen–Geiger (−3 °C) contre
   Köppen historique (0 °C). Seuls les climats dont le mois le plus froid
   tombe dans l'intervalle ]−3 ; 0] changent de groupe ; le calcul le montre. */
function comparerConventions(Tm, Pm) {
  const kg = classer(Tm, Pm, -3);
  const historique = classer(Tm, Pm, 0);
  return { kg, historique, diff: kg.code !== historique.code };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-v2-e016-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e016-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e016-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e016-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e016-panel .geography-v2-e016-groupe{margin:8px 0}
#geography-v2-e016-panel .geography-v2-e016-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-v2-e016-panel dl{margin:6px 0}
#geography-v2-e016-panel dt{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e016-panel dd{margin:0 0 5px 12px;max-width:64ch}
#geography-v2-e016-panel ol{margin:6px 0;padding-left:20px}
#geography-v2-e016-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-v2-e016-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-v2-e016-table th,#geography-v2-e016-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-v2-e016-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e016-field{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e016-field legend{padding:0 4px;color:var(--muted)}
#geography-v2-e016-panel .geography-v2-e016-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-v2-e016-panel .geography-v2-e016-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e016-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e016-panel input[type="range"]:disabled{opacity:.5;cursor:not-allowed}
#geography-v2-e016-panel .geography-v2-e016-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e016-temp,#geography-v2-e016-amp-t,#geography-v2-e016-pluie,#geography-v2-e016-amp-p{display:block}
#geography-v2-e016-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-v2-e016-legend{font-size:10px;color:var(--muted)}
#geography-v2-e016-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e016-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e016-code{
  display:inline-block;margin:6px 0;padding:5px 9px;border:1px solid var(--gold,#e6b96f);
  border-radius:6px;color:var(--gold-bright,#f4d69e);font-size:14px;font-weight:700;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e016-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-v2-e016-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e016-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-v2-e016-panel .geography-v2-e016-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.geography-v2-e016-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-v2-e016-panel[data-geography-v2-e016-reduced="1"] button,
#geography-v2-e016-panel[data-geography-v2-e016-reduced="1"] .geography-v2-e016-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e016-panel button,.geography-v2-e016-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-v2-e016-panel{font-size:10px;padding:9px}
  #geography-v2-e016-canvas{height:200px}
  #geography-v2-e016-panel .geography-v2-e016-choix{margin-right:4px}
}
`;

/* ---------- Chantier E016-10 — texte sémantique, lisible sans animation ---------- */

function staticFacts() {
  const wrap = E('div', 'geography-v2-e016-groupe');
  wrap.appendChild(E('h3', '', 'Trois faits sur la clé de Köppen'));
  const faits = [
    'La classification de Köppen range les climats selon deux seules entrées : les températures et les précipitations moyennes de chaque mois. Elle compte cinq groupes : A tropicaux, B arides, C tempérés, D continentaux et E polaires.',
    'Les seuils sont des isothermes et un bilan d’eau : le groupe A exige douze mois à au moins 18 °C, le groupe E un mois le plus chaud sous 10 °C, et le groupe B des précipitations annuelles inférieures à 20 × T + f millimètres.',
    'Les lettres qui suivent la lettre de groupe sont des règles, pas des noms : f signifie aucune saison sèche, s un été sec, w un hiver sec, m une mousson ; a, b, c et d décrivent la chaleur et la rigueur des mois.',
  ];
  faits.forEach((texte) => wrap.appendChild(E('p', 'geography-v2-e016-fait', texte)));
  return wrap;
}

/* Lexique — définitions données à la première occurrence. */
function staticGlossary() {
  const wrap = E('div', 'geography-v2-e016-groupe');
  wrap.appendChild(E('h3', '', 'Lexique — définitions à la première occurrence'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Isotherme', 'Courbe reliant les points de même température ; ici 18 °C sépare le groupe A et 10 °C limite le groupe E.'],
    ['Aridité', 'Déficit d’eau mesuré par le rapport entre précipitations annuelles et le seuil 20 × T + f millimètres.'],
    ['Saison sèche', 'Période dont le mois le plus sec satisfait aux critères chiffrés 40 mm, 1/3 ou 1/10, d’où les suffixes s et w.'],
    ['Convention', 'Choix de seuil (ici −3 °C ou 0 °C pour la frontière C/D), distinct d’une propriété physique du climat.'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', definition));
  });
  wrap.appendChild(dl);
  return wrap;
}

/* Chantier E016-08 — tableau indexable : codes recalculés, jamais codés en dur. */
function staticTable() {
  const table = E('table');
  table.id = TABLE_ID;
  table.appendChild(E('caption', '', 'Villes de référence — normales approximatives et code de Köppen recalculé par la même clé que le laboratoire.'));

  const thead = E('thead');
  const hr = E('tr');
  ['Ville', 'T moyenne (°C)', 'Pluies (mm/an)', 'Code calculé', 'Code de référence'].forEach((h) => {
    const th = E('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = E('tbody');
  VILLES_REFERENCE.forEach((ville) => {
    const serie = serieMensuelle(ville.t, ville.ampT, ville.p, ville.ampP, ville.regime, ville.hemi);
    const resultat = classer(serie.Tm, serie.Pm, -3);
    const tr = E('tr');
    const cellules = [
      ville.nom,
      fmt0(ville.t),
      fmt0(ville.p),
      resultat.code,
      ville.attendu + (resultat.code === ville.attendu ? ' (conforme)' : ' (à discuter)'),
    ];
    cellules.forEach((c, i) => {
      const cell = E(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* Défi falsifiable en cinq temps, aligné sur la limite de convention. */
function staticDefi() {
  const wrap = E('section', 'geography-v2-e016-groupe');
  wrap.id = DEFI_ID;
  wrap.appendChild(E('h3', '', 'Défi falsifiable — la frontière C/D est-elle physique ?'));
  const ol = E('ol');
  const etapes = [
    'Prédiction : un climat dont le mois le plus froid vaut −1 °C change-t-il de groupe quand on remplace la convention −3 °C par 0 °C ?',
    'Réglage : placer la température moyenne à 5 °C et l’amplitude thermique à 6 °C, puis lire les deux codes dans le readout.',
    'Résultat attendu : Köppen–Geiger donne un groupe C, la convention historique un groupe D : la lettre change sans que le climat bouge.',
    'Falsification : si les deux codes restent identiques alors que le mois le plus froid tombe dans ]−3 ; 0], la comparaison est fausse.',
    'Débrief : le climat est un modèle à deux cosinus, pas un relevé ; la limite est une convention, et le tableau donne des ordres de grandeur.',
  ];
  etapes.forEach((t) => ol.appendChild(E('li', '', t)));
  wrap.appendChild(ol);
  return wrap;
}

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = E('p', '');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = E('span', 'geography-v2-e016-valeur');
  out.id = outId;
  label.appendChild(out);
  row.appendChild(label);

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

function radioFieldset(id, legendText, choices, state, name) {
  const fieldset = E('fieldset');
  fieldset.id = id;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', legendText + ' (choix unique)');
  const legend = E('legend', '', legendText + ' (choix unique)');
  fieldset.appendChild(legend);
  choices.forEach((value) => {
    const lab = E('label', 'geography-v2-e016-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.id = id + '-' + value;
    radio.value = value;
    radio.checked = state === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(
      name === P + 'regime' ? REGIMES[value] : HEMIS[value],
    ));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      regime: REGIME_ORDER.map((m) => document.getElementById(REGIME_ID + '-' + m)),
      hemi: HEMI_ORDER.map((m) => document.getElementById(HEMI_ID + '-' + m)),
      temp: document.getElementById(TEMP_ID),
      tempOut: document.getElementById(TEMP_OUT_ID),
      ampT: document.getElementById(AMPT_ID),
      ampTOut: document.getElementById(AMPT_OUT_ID),
      pluie: document.getElementById(PLUIE_ID),
      pluieOut: document.getElementById(PLUIE_OUT_ID),
      ampP: document.getElementById(AMPP_ID),
      ampPOut: document.getElementById(AMPP_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      code: document.getElementById(CODE_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = E('section', 'geography-v2-e016-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Climats et classification de Köppen — V2');
  title.id = TITLE_ID;
  const lead = E('p', '', 'Le laboratoire applique la clé de Köppen–Geiger à un climat schématique : douze températures et douze précipitations engendrées par deux courbes déterministes. Changez les réglages et lisez le code obtenu, recalculé par la même clé que le tableau de villes.');

  const regime = radioFieldset(REGIME_ID, 'Régime des pluies', REGIME_ORDER, S.regime, P + 'regime');
  const hemi = radioFieldset(HEMI_ID, 'Hémisphère', HEMI_ORDER, S.hemi, P + 'hemi');

  const temp = rangeRow('Température moyenne annuelle', TEMP_ID, TEMP_OUT_ID, -25, 32, 0.5, S.temp, 'Température moyenne annuelle, de moins 25 à 32 degrés Celsius');
  const ampT = rangeRow('Amplitude thermique annuelle', AMPT_ID, AMPT_OUT_ID, 0, 32, 0.5, S.ampT, 'Écart entre le mois le plus chaud et le mois le plus froid, en degrés Celsius');
  const pluie = rangeRow('Précipitations annuelles', PLUIE_ID, PLUIE_OUT_ID, 0, 3000, 25, S.pluie, 'Précipitations totales sur l’année, de 0 à 3 000 millimètres');
  const ampP = rangeRow('Contraste saisonnier des pluies', AMPP_ID, AMPP_OUT_ID, 0, 1, 0.05, S.ampP, 'Amplitude relative du cycle annuel des précipitations, de 0 à 1');

  const code = E('strong', '', '');
  code.id = CODE_ID;
  const codeLine = E('p', '', 'Code obtenu : ');
  codeLine.appendChild(code);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Diagramme climatique : barres hachées pour les précipitations, trait plein pour les températures, repères 0, 10 et 18 degrés. Flèches gauche et droite : déplacer le mois ; flèches haut et bas : changer la température moyenne.');

  const legendText = E('p', 'geography-v2-e016-legend');
  legendText.id = LEGEND_ID;

  const readout = E('p', 'geography-v2-e016-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = E('p', 'geography-v2-e016-sr');
  help.id = P + 'help';
  help.textContent = 'Commandes du laboratoire : deux choix uniques (régime des pluies et hémisphère) ; quatre curseurs pour la température, l’amplitude thermique, les précipitations et leur contraste ; flèches gauche et droite sur le diagramme pour parcourir les mois, flèches haut et bas pour la température moyenne ; le bouton Animer lance ou arrête le balayage de l’année.';
  panel.setAttribute('aria-describedby', help.id);

  const play = E('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer l’année');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  panel.append(
    title, lead, staticFacts(), staticGlossary(), staticTable(), regime, hemi,
    temp.row, ampT.row, pluie.row, ampP.row, codeLine, canvas, legendText,
    readout, play, staticDefi(), help,
  );

  const host = ctx.layout || ctx.stage;
  const cible = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  cible.insertBefore(panel, cible.firstChild);

  return {
    panel, fresh: true,
    regime: REGIME_ORDER.map((m) => document.getElementById(REGIME_ID + '-' + m)),
    hemi: HEMI_ORDER.map((m) => document.getElementById(HEMI_ID + '-' + m)),
    temp: document.getElementById(TEMP_ID),
    tempOut: document.getElementById(TEMP_OUT_ID),
    ampT: document.getElementById(AMPT_ID),
    ampTOut: document.getElementById(AMPT_OUT_ID),
    pluie: document.getElementById(PLUIE_ID),
    pluieOut: document.getElementById(PLUIE_OUT_ID),
    ampP: document.getElementById(AMPP_ID),
    ampPOut: document.getElementById(AMPP_OUT_ID),
    canvas, readout, code, legend: legendText, play,
  };
}

/* ---------- Chantier E016-09 — diagramme climatique sur un seul canvas ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof cv.getContext !== 'function') return;
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

  const serie = serieMensuelle(S.temp, S.ampT, S.pluie, S.ampP, S.regime, S.hemi);
  const tMin = Math.min(...serie.Tm);
  const tMax = Math.max(...serie.Tm);
  const pMax = Math.max(...serie.Pm);
  const tLo = Math.min(-10, Math.floor(tMin / 10) * 10);
  const tHi = Math.max(30, Math.ceil(tMax / 10) * 10);
  const pTop = Math.max(50, pMax * 1.15);

  const pad = 22;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - 14);
  const X = (u) => pad + ((u + 0.5) / 12) * iw;
  const YT = (t) => pad + (1 - (t - tLo) / (tHi - tLo)) * ih;
  const YP = (p) => pad + (1 - p / pTop) * ih;

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Barres de pluie : contour plein, hachure verticale — jamais la couleur seule. */
  const largeur = (iw / 12) * 0.55;
  for (let i = 0; i < 12; i += 1) {
    const x = X(i) - largeur / 2;
    const y = YP(serie.Pm[i]);
    g.fillStyle = 'rgba(120,170,210,.20)';
    g.fillRect(x, y, largeur, pad + ih - y);
    g.strokeStyle = 'rgba(150,195,230,.85)';
    g.setLineDash([]);
    g.strokeRect(x, y, largeur, pad + ih - y);
    g.beginPath();
    g.moveTo(x + largeur / 2, y);
    g.lineTo(x + largeur / 2, pad + ih);
    g.stroke();
  }

  /* Chantiers E016-02/04 — repères non colorés : 0 °C tireté, 10 °C pointillé,
     18 °C trait long. Le sens est donné par les étiquettes, pas par la teinte. */
  const repere = (t, dash, label) => {
    const y = YT(t);
    if (y < pad || y > pad + ih) return;
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.setLineDash(dash);
    g.beginPath();
    g.moveTo(pad, y); g.lineTo(pad + iw, y);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.font = '9px sans-serif';
    g.fillText(label, pad + 2, y - 3);
  };
  repere(0, [3, 3], '0 °C');
  repere(10, [1, 3], '10 °C');
  repere(18, [6, 3], '18 °C');

  /* Trait plein des températures : distinct des barres hachées. */
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.lineWidth = 2;
  g.setLineDash([]);
  g.beginPath();
  for (let i = 0; i < 12; i += 1) {
    if (i === 0) g.moveTo(X(i), YT(serie.Tm[i]));
    else g.lineTo(X(i), YT(serie.Tm[i]));
  }
  g.stroke();

  /* Curseur de mois : croix, donc identifiable sans couleur. */
  const mois = 1 + Math.floor(S.sweep * 12);
  const cx = X(mois - 1);
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.setLineDash([2, 3]);
  g.beginPath(); g.moveTo(cx, pad); g.lineTo(cx, pad + ih); g.stroke();
  g.setLineDash([]);
  const cy = YT(serie.Tm[mois - 1]);
  g.beginPath();
  g.moveTo(cx - 6, cy); g.lineTo(cx + 6, cy);
  g.moveTo(cx, cy - 6); g.lineTo(cx, cy + 6);
  g.stroke();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('Températures : trait plein', pad + 2, cssH - 4);
  g.fillStyle = 'rgba(150,195,230,.95)';
  g.fillText('Pluies : barres hachées — mois ' + mois, pad + 118, cssH - 4);
}

/* ---------- Chantier E016-07 — mesures annoncées, pas seulement dessinées ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const l = S.lecture;
  const c = S.comparaison;
  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  add('Température moyenne ' + fmt1(l.tMoy) + ' °C (référence Paris ≈ 12 °C) ; précipitations ' + fmt0(l.pTot) + ' mm (Paris ≈ 640 mm) ; seuil d’aridité 20×T + ' + fmt0(l.f) + ' = ' + fmt0(l.seuilB) + ' mm, soit un rapport P/seuil de ' + fmt2(l.pTot / l.seuilB) + '. ');
  add('Code : ');
  n.appendChild(strong(l.code));
  add(' — ' + l.raison + '. Mois le plus froid ' + fmt1(l.tMin) + ' °C, mois le plus chaud ' + fmt1(l.tMax) + ' °C, mois le plus sec ' + fmt0(l.pMin) + ' mm. ');
  add('Convention −3 °C : ');
  n.appendChild(strong(c.kg.code));
  add(' ; convention 0 °C : ');
  n.appendChild(strong(c.historique.code));
  add(c.diff ? '. Les deux conventions donnent des groupes différents.' : '. Les deux conventions concordent.');
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Trait plein : températures (échelle de gauche, repères 0/10/18 °C en tirets distincts). Barres hachées : précipitations. Croix : mois courant. La forme des traits distingue les séries, indépendamment de la couleur.';
}

function syncControls() {
  const n = S.nodes;
  if (n.regime) n.regime.forEach((radio, i) => {
    if (radio) radio.checked = REGIME_ORDER[i] === S.regime;
  });
  if (n.hemi) n.hemi.forEach((radio, i) => {
    if (radio) radio.checked = HEMI_ORDER[i] === S.hemi;
  });
  if (n.temp) n.temp.value = String(S.temp);
  if (n.tempOut) n.tempOut.textContent = fmt1(S.temp) + ' °C';
  if (n.ampT) n.ampT.value = String(S.ampT);
  if (n.ampTOut) n.ampTOut.textContent = fmt1(S.ampT) + ' °C';
  if (n.pluie) n.pluie.value = String(S.pluie);
  if (n.pluieOut) n.pluieOut.textContent = fmt0(S.pluie) + ' mm';
  if (n.ampP) {
    n.ampP.value = String(S.ampP);
    n.ampP.disabled = S.regime === 'egal';
    n.ampPOut.textContent = S.regime === 'egal' ? '0 (pluies réparties)' : fmt2(S.ampP);
  }
  const serie = serieMensuelle(S.temp, S.ampT, S.pluie, S.ampP, S.regime, S.hemi);
  S.lecture = classer(serie.Tm, serie.Pm, -3);
  S.comparaison = comparerConventions(serie.Tm, serie.Pm);
  if (n.code) n.code.textContent = S.lecture.code;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer l’année';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E016Reduced = S.reduced ? '1' : '0';
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- Chantier E016-09 — boucle rAF unique, pause sur document.hidden et hors écran ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function canRun() {
  return typeof document === 'undefined' ? false : (!document.hidden && !S.reduced && S.inView);
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (!canRun()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (!canRun()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !R()) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !R()) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
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
        S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : mq.matches;
        if (S.reduced) { S.playing = false; stopLoop(); }
        else if (S.playing) startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function installObservers() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof IntersectionObserver !== 'function') return;
  if (!S.observersInstalled) {
    S.observersInstalled = true;
    S.intersection = new IntersectionObserver((entrees) => {
      const e = entrees[entrees.length - 1];
      S.inView = !e || e.isIntersecting;
      if (!S.inView) stopLoop();
      else if (S.playing) startLoop();
    }, { rootMargin: '40px' });
  }
  if (S.observedCanvas !== cv) {
    if (S.observedCanvas && S.intersection) S.intersection.unobserve(S.observedCanvas);
    S.observedCanvas = cv;
    S.intersection.observe(cv);
  }
}

/* Chantier E016-10 — badge d'honnêteté : le climat affiché est un modèle. */
function addMapBadge() {
  const scope = ctxLayout || ctxStage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = E('div', 'geography-v2-e016-badge', 'Climat schématique V2 : deux cosinus déterministes, classification de Köppen calculée. Le tableau donne des normales approximatives, pas des relevés de station.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E016', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  E = typeof ctx.el === 'function' ? ctx.el : E;
  R = typeof ctx.reducedMotion === 'function' ? () => !!ctx.reducedMotion() : () => false;
  ctxStage = ctx.stage;
  ctxLayout = ctx.layout || ctx.stage;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge();
  installObservers();

  S.reduced = R();
  if (S.reduced) { S.playing = false; stopLoop(); }
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.regime.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.regime = radio.value;
        syncControls();
      });
    });
    n.hemi.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.hemi = radio.value;
        syncControls();
      });
    });
    n.temp.addEventListener('input', () => {
      S.temp = clamp(Math.round(Number(n.temp.value) * 2) / 2, -25, 32);
      syncControls();
    });
    n.ampT.addEventListener('input', () => {
      S.ampT = clamp(Math.round(Number(n.ampT.value) * 2) / 2, 0, 32);
      syncControls();
    });
    n.pluie.addEventListener('input', () => {
      S.pluie = clamp(Math.round(Number(n.pluie.value) / 25) * 25, 0, 3000);
      syncControls();
    });
    n.ampP.addEventListener('input', () => {
      S.ampP = clamp(Math.round(Number(n.ampP.value) * 20) / 20, 0, 1);
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
        const step = event.key === 'ArrowRight' ? 1 : -1;
        S.sweep = (S.sweep + step / 12 + 1) % 1;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 0.5 : -0.5;
        S.temp = clamp(S.temp + step, -25, 32);
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
  if (S.playing) startLoop();
});
