import { register } from './registry.js';

/* Lentille E099 — seconde passe V2 de la vue GEOGRAPHIE.
 * Thème : discrétiser une grandeur cartographique — intervalles égaux,
 * quantiles et ruptures naturelles (Jenks).
 *
 * La passe 1 (src/views/geography/E099.js, lecture seule) enseigne comment
 * coder une grandeur PAR UNE COULEUR CONTINUE (interpolation Oklab, luminance,
 * ΔE, niveaux de gris). Cette passe V2 s'attaque à la question suivante, que
 * la passe 1 effleure à peine : OÙ placer les frontières quand on PASSE D'UNE
 * GRANDEUR CONTINUE À DES CLASSES ? Le même jeu de valeurs, classé de trois
 * manières, donne trois cartes différentes — c'est le cœur du sujet.
 *
 * Les dix chantiers E099-01 … E099-10 de cette passe V2 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E099.md (la passe 1 reste intacte) :
 *  E099-01  staticDefinitions/Formules/Glossaire/Table/Mesures/Limite ;
 *  E099-02  CSS_ID + CSS + préfixe P ;
 *  E099-03  mulberry32 + genererValeurs + graine affichée ;
 *  E099-04  classer + classesIntervalles + startsQuantiles + startsJenks ;
 *  E099-05  fieldset radiogroup + curseurK + recompute ;
 *  E099-06  draw (histogramme, frontières, tuiles, DPR ≤ 2) ;
 *  E099-07  staticTable + majTable ;
 *  E099-08  majMesures + majReadout (SSE vs référence, contraste AA) ;
 *  E099-09  contrôles clavier/pointeur, cibles ≥ 36 px, focus, région live ;
 *  E099-10  tick/startLoop/stopLoop, pause, mouvement réduit, défi en 5 temps.
 * Une
 * seule clé CSS `geography-v2-e099` via ctx.css(), tous les identifiants,
 * classes, noms de groupe et attributs préfixés `geography-v2-e099-*`. Tout
 * est local : aucune requête réseau, aucune valeur tirée au sort (générateur
 * congruentiel mulberry32 à graine affichée), aucun appel de journalisation,
 * aucun fichier partagé (registry, index, passe 1) modifié. Une seule horloge
 * requestAnimationFrame pilote le laboratoire, avec pause sur document.hidden
 * et hors écran ; le savoir est du texte sémantique réel (titres, paragraphes,
 * tableau captioné, liste de mesures, défi en cinq temps) présent dans le DOM
 * même sans animation ; le canvas ne fait qu'illustrer trois classifications
 * réellement calculées sur un jeu de valeurs déterministe.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e099';
const P = 'geography-v2-e099';

const PANEL_ID = `${P}-panel`;
const TITLE_ID = `${P}-title`;
const DEFS_ID = `${P}-defs`;
const FORM_ID = `${P}-formules`;
const GLOSS_ID = `${P}-glossaire`;
const TABLE_ID = `${P}-table`;
const TABLE_BODY_ID = `${P}-table-body`;
const MESURES_ID = `${P}-mesures`;
const LIMITE_ID = `${P}-limite`;
const METHODES_ID = `${P}-methodes`;
const LEGENDE_ID = `${P}-legende`;
const K_ID = `${P}-k`;
const K_OUT_ID = `${P}-k-value`;
const GRAINE_ID = `${P}-graine`;
const GRAINE_BOUTON_ID = `${P}-graine-suivante`;
const RESET_ID = `${P}-reset`;
const FRONT_ID = `${P}-frontieres`;
const CANVAS_ID = `${P}-canvas`;
const CLAVIER_ID = `${P}-clavier`;
const READOUT_ID = `${P}-readout`;
const PLAY_ID = `${P}-play`;
const NOTE_ID = `${P}-note`;

/* Feuille unique, identifiants et classes tous préfixés. Aucun sélecteur ne
   sort du panneau ; repli mobile et mouvement réduit pris en charge. */
const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} dl{margin:5px 0;padding-left:2px}
#${PANEL_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} dd{margin:0 0 4px 12px;color:var(--muted)}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${LIMITE_ID}{
  margin:8px 0;padding:8px 9px;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.04);
}
#${LIMITE_ID} ol{margin:4px 0 0;padding-left:20px}
#${LIMITE_ID} li{margin:2px 0}
#${METHODES_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${METHODES_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{
  min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f);
}
#${P}-curseurs{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PANEL_ID} .${P}-curseur{
  display:block;width:100%;min-height:36px;margin:2px 0 6px;accent-color:var(--gold,#e6b96f);
}
.${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${GRAINE_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:330px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16);
}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${CANVAS_ID}:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${P}-note{font-size:10px;color:var(--muted);margin:6px 0 0}
#${PANEL_ID}[data-${P}-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:270px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* Domaine fixe de la grandeur schématique, identique à la passe 1 pour que
   les couleurs soient comparables d'une méthode à l'autre. Aucune mesure de
   terrain n'est inventée : les valeurs sont générées par la graine affichée. */
const V_MIN = 0;
const V_MAX = 1000;
const N_VALEURS = 60;
const N_BINS = 24;
const SWEEP_MS = 7000;
const SEUIL_AA = 4.5;

const METHODES = [
  { key: 'intervalles', court: 'Intervalles égaux' },
  { key: 'quantiles', court: 'Quantiles' },
  { key: 'jenks', court: 'Ruptures naturelles' },
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  graine: 99099,
  k: 5,
  methode: 'intervalles',
  frontieres: true,
  playing: false,
  elapsed: SWEEP_MS,
  lastTs: 0,
  lastPct: -1,
  rafId: 0,
  inView: true,
  visibilityBound: false,
  motionBound: false,
  motionFn: null,
  observer: null,
  valeurs: [],
  classes: [],
  sse: 0,
  sseRef: 0,
  surbrillance: -1,
  resultat: null,
  nodes: {},
};

/* ---------- Outils déterministes ---------- */

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp01 = (v) => (finite(v) ? Math.max(0, Math.min(1, v)) : 0);

/* Formatage décimal déterministe, virgule française, aucun service externe. */
function fmt(v, d = 0) {
  if (!finite(v)) return '—';
  const f = Math.pow(10, d);
  const n = Math.round(v * f) / f;
  return n.toFixed(d).replace('.', ',');
}

function pct(v, d = 1) {
  return `${fmt(v * 100, d)} %`;
}

/* Générateur congruentiel mulberry32 : valeurs reproductibles à l'octet près,
   graine affichée dans le panneau et modifiable d'un pas. */
function mulberry32(graine) {
  let a = graine >>> 0;
  return function suivant() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Distribution bimodale choisie (70 % de valeurs basses, 30 % de valeurs
   hautes) : elle crée un vide naturel entre 400 et 600 où les méthodes ne
   se comportent pas du tout de la même manière. */
function genererValeurs(n, graine) {
  const rnd = mulberry32(graine);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const u = rnd();
    const v = u < 0.7 ? 20 + rnd() * 380 : 620 + rnd() * 360;
    out.push(Math.max(V_MIN, Math.min(V_MAX, Math.round(v))));
  }
  return out;
}

/* ---------- Couleur Oklab, réutilisée comme simple outil de dessin ---------- */

function srgbToLinear(c) {
  const x = clamp01(c);
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  const x = clamp01(c);
  return x <= 0.0031308 ? 12.92 * x : 1.055 * (x ** (1 / 2.4)) - 0.055;
}

function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

/* Rampe séquentielle en Oklab, ancrages choisis (jamais de hasard). */
function rampeRgb(t) {
  const u = clamp01(t);
  const a0 = { L: 0.30, a: -0.03, b: -0.11 };
  const a1 = { L: 0.58, a: -0.05, b: -0.06 };
  const a2 = { L: 0.90, a: -0.01, b: 0.02 };
  const s0 = u <= 0.5 ? a0 : a1;
  const s1 = u <= 0.5 ? a1 : a2;
  const k = u <= 0.5 ? u / 0.5 : (u - 0.5) / 0.5;
  const L = s0.L + (s1.L - s0.L) * k;
  const a = s0.a + (s1.a - s0.a) * k;
  const b = s0.b + (s1.b - s0.b) * k;
  return oklabToRgb(L, a, b);
}

function rgbCss(rgb, alpha) {
  const c = rgb.map((x) => Math.round(clamp01(x) * 255));
  return alpha === undefined
    ? `rgb(${c[0]}, ${c[1]}, ${c[2]})`
    : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

function rgbTriplet(rgb) {
  return rgb.map((x) => Math.round(clamp01(x) * 255)).join(', ');
}

function relLuminance(rgb) {
  return 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]);
}

function contraste(rgbA, rgbB) {
  const a = relLuminance(rgbA);
  const b = relLuminance(rgbB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* ---------- E099-04 — les trois classifications, réellement calculées ---------- */

function classe(sorted, debut, fin, centre) {
  const n = fin - debut;
  if (n <= 0) return { min: centre, max: centre, centre, effectif: 0, moyenne: 0, sse: 0 };
  let somme = 0;
  for (let i = debut; i < fin; i += 1) somme += sorted[i];
  const moyenne = somme / n;
  let sse = 0;
  for (let i = debut; i < fin; i += 1) sse += (sorted[i] - moyenne) ** 2;
  return {
    min: sorted[debut],
    max: sorted[fin - 1],
    centre: finite(centre) ? centre : (sorted[debut] + sorted[fin - 1]) / 2,
    effectif: n,
    moyenne,
    sse,
  };
}

function classesDepuisIndices(sorted, starts) {
  return starts.map((s, i) => {
    const e = i + 1 < starts.length ? starts[i + 1] : sorted.length;
    return classe(sorted, s, e, (sorted[s] + sorted[e - 1]) / 2);
  });
}

/* Intervalles égaux : seuils réguliers sur le domaine fixe [0, 1000]. Les
   classes vides sont conservées et signalées (effetif 0) : le vide 400–600
   du jeu de données les rend visibles. */
function classesIntervalles(sorted, k) {
  const pas = (V_MAX - V_MIN) / k;
  const groupes = Array.from({ length: k }, () => []);
  sorted.forEach((v) => {
    let idx = Math.floor((v - V_MIN) / pas);
    if (idx < 0) idx = 0;
    if (idx >= k) idx = k - 1;
    groupes[idx].push(v);
  });
  return groupes.map((g, i) => {
    const centre = V_MIN + (i + 0.5) * pas;
    if (g.length === 0) return classe([], 0, 0, centre);
    return classe(g, 0, g.length, centre);
  });
}

/* Quantiles : des effectifs aussi égaux que possible, donc des frontières
   qui se déplacent là où les valeurs se densifient. */
function startsQuantiles(sorted, k) {
  const n = sorted.length;
  const starts = [0];
  for (let m = 1; m < k; m += 1) {
    let idx = Math.floor((m * n) / k);
    if (idx <= starts[starts.length - 1]) idx = starts[starts.length - 1] + 1;
    if (idx >= n) idx = n - 1;
    starts.push(idx);
  }
  return starts;
}

/* Ruptures naturelles de Jenks : programmation dynamique 1D déterministe
   qui minimise la somme des carrés des écarts à la moyenne de classe (SSE).
   Aucune itération aléatoire, aucun point de départ tiré au sort. */
function startsJenks(sorted, k) {
  const n = sorted.length;
  const borne = Math.min(k, n);
  if (borne >= n) return sorted.map((_, i) => i);
  const cout = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    let somme = 0;
    let carres = 0;
    for (let j = i; j < n; j += 1) {
      somme += sorted[j];
      carres += sorted[j] * sorted[j];
      const m = j - i + 1;
      cout[i][j] = Math.max(0, carres - (somme * somme) / m);
    }
  }
  const INF = Number.POSITIVE_INFINITY;
  const dp = Array.from({ length: borne + 1 }, () => new Array(n + 1).fill(INF));
  const coupe = Array.from({ length: borne + 1 }, () => new Array(n + 1).fill(0));
  dp[0][0] = 0;
  for (let c = 1; c <= borne; c += 1) {
    for (let j = c; j <= n; j += 1) {
      for (let i = c - 1; i < j; i += 1) {
        if (dp[c - 1][i] === INF) continue;
        const valeur = dp[c - 1][i] + cout[i][j - 1];
        if (valeur < dp[c][j]) {
          dp[c][j] = valeur;
          coupe[c][j] = i;
        }
      }
    }
  }
  const starts = [];
  let j = n;
  for (let c = borne; c >= 1; c -= 1) {
    const i = coupe[c][j];
    starts.unshift(i);
    j = i;
  }
  return starts.length ? starts : [0];
}

function classer(valeurs, methode, k) {
  const sorted = valeurs.slice().sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const nb = Math.max(2, Math.min(k, sorted.length));
  if (methode === 'intervalles') return classesIntervalles(sorted, nb);
  const starts = methode === 'quantiles' ? startsQuantiles(sorted, nb) : startsJenks(sorted, nb);
  return classesDepuisIndices(sorted, starts);
}

function sseTotal(classes) {
  return classes.reduce((acc, c) => acc + c.sse, 0);
}

/* ---------- E099-01 — texte sémantique, lisible sans laboratoire ---------- */

function blocParagraphes(ids, textes, className) {
  const wrap = document.createElement('div');
  textes.forEach((texte) => {
    const p = document.createElement('p');
    if (className) p.className = className;
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticDefinitions() {
  const defs = [
    'Une grandeur cartographique est une valeur numérique associée à une unité spatiale (densité, revenu, altitude). La classer consiste à remplacer cette valeur continue par l’étiquette d’une classe : on échange de la précision contre de la lisibilité.',
    'Une frontière de classe est un seuil qui sépare deux étiquettes. Deux valeurs très proches mais situées de part et d’autre du seuil reçoivent des couleurs très différentes : c’est l’effet de seuil, et c’est précisément ce que le laboratoire rend visible.',
    'Les intervalles égaux découpent le domaine en tranches de même largeur. Les quantiles visent des classes de même effectif. Les ruptures naturelles (Jenks) cherchent les seuils qui minimisent la dispersion interne des classes.',
  ];
  const wrap = document.createElement('div');
  wrap.id = DEFS_ID;
  const h = document.createElement('h3');
  h.textContent = 'Définitions';
  wrap.appendChild(h);
  wrap.appendChild(blocParagraphes(null, defs, `${P}-fait`));
  return wrap;
}

function staticFormules() {
  const textes = [
    'Intervalles égaux : seuil m = minimum + m × (maximum − minimum) / k, pour m = 1 … k−1. La largeur de chaque tranche est constante, pas l’effectif.',
    'Quantiles : la frontière m tombe au rang ⌊m × n / k⌋ de la liste triée. Chaque classe contient n/k valeurs environ, mais les largeurs varient avec la densité.',
    'Jenks : on minimise S = Σⱼ Σᵢ∈ⱼ (xᵢ − moyenneⱼ)². La programmation dynamique explore toutes les découpes possibles et conserve la meilleure ; le résultat est unique pour un jeu trié donné.',
    'Somme des carrés internes (SSE) : c’est la mesure de référence. Plus elle est basse, plus les valeurs d’une même classe se ressemblent. On la compare à celle des intervalles égaux, prise comme référence 100 %.',
  ];
  const wrap = document.createElement('div');
  wrap.id = FORM_ID;
  const h = document.createElement('h3');
  h.textContent = 'Formules du laboratoire';
  wrap.appendChild(h);
  wrap.appendChild(blocParagraphes(null, textes));
  return wrap;
}

function staticGlossaire() {
  const termes = [
    ['Classe', 'Ensemble de valeurs recevant la même couleur et la même étiquette.'],
    ['SSE', 'Somme des carrés des écarts à la moyenne de classe ; mesure la dispersion interne.'],
    ['Effet de seuil', 'Saut de couleur entre deux valeurs voisines placées de part et d’autre d’une frontière.'],
    ['Graine', 'Entier affiché qui alimente le générateur déterministe : la même graine donne toujours le même jeu.'],
  ];
  const wrap = document.createElement('div');
  wrap.id = GLOSS_ID;
  const h = document.createElement('h3');
  h.textContent = 'Glossaire';
  const dl = document.createElement('dl');
  termes.forEach(([terme, definition]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = definition;
    dl.append(dt, dd);
  });
  wrap.append(h, dl);
  return wrap;
}

function cellule(tag, texte, portee) {
  const n = document.createElement(tag);
  if (portee) n.scope = portee;
  n.textContent = texte;
  return n;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Classes de la méthode courante sur le jeu de graine 99099 (60 valeurs). Bornes, effectifs, parts et couleurs sont recalculés à chaque changement de réglage.';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Classe', 'Bornes', 'Effectif', 'Part', 'RVB (sRGB)'].forEach((t) => hr.appendChild(cellule('th', t, 'col')));
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  tbody.id = TABLE_BODY_ID;
  table.appendChild(tbody);
  return table;
}

function staticMesures() {
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = 'Grandeurs chiffrées et références';
  const ul = document.createElement('ul');
  ul.id = MESURES_ID;
  for (let i = 0; i < 5; i += 1) {
    const li = document.createElement('li');
    li.id = `${MESURES_ID}-${i}`;
    ul.appendChild(li);
  }
  wrap.append(h, ul);
  return wrap;
}

function staticLimite() {
  const box = document.createElement('div');
  box.id = LIMITE_ID;
  const h = document.createElement('h3');
  h.textContent = 'Limite falsifiable — défi en cinq temps';
  const p = document.createElement('p');
  p.textContent = 'Changer la méthode de classement change la carte sans changer une seule valeur. Voici comment tenter de réfuter cette affirmation.';
  const ol = document.createElement('ol');
  const etapes = [
    'Prédiction : sur un jeu à deux populations séparées par un vide, les ruptures naturelles doivent placer une frontière dans le vide et obtenir la SSE la plus basse ; les intervalles égaux doivent laisser une classe vide au milieu.',
    'Réglage : choisir « Ruptures naturelles », 5 classes, puis comparer avec « Intervalles égaux » et « Quantiles » en gardant la même graine et le même nombre de classes.',
    'Résultat attendu : la SSE de Jenks est inférieure à celle des intervalles égaux (référence 100 %) ; la région live annonce la réduction en toutes lettres et le tableau montre des bornes différentes.',
    'Falsification : si les trois méthodes donnaient des SSE égales et des bornes identiques, l’affirmation serait réfutée ; de même si une classe quantile avait un effectif très éloigné de n/k sans raison de tri.',
    'Débrief : l’angle mort n’est pas la couleur mais le découpage. Une carte « objective » cache un choix de frontières : la légende et le texte doivent toujours dire quelle méthode a produit les classes.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  box.append(h, p, ol);
  return box;
}

/* ---------- E099-05 / E099-09 — contrôles ---------- */

function curseurK() {
  const row = document.createElement('p');
  const label = document.createElement('label');
  label.setAttribute('for', K_ID);
  label.appendChild(document.createTextNode('Nombre de classes : '));
  const out = document.createElement('span');
  out.id = K_OUT_ID;
  out.className = `${P}-valeur`;
  out.textContent = `${S.k}`;
  label.appendChild(out);
  row.appendChild(label);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = K_ID;
  input.className = `${P}-curseur`;
  input.min = '3';
  input.max = '9';
  input.step = '1';
  input.value = String(S.k);
  input.setAttribute('aria-label', 'Nombre de classes, de 3 à 9');
  input.setAttribute('aria-valuetext', `${S.k} classes`);
  return { row, input, out };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: METHODES.map((m) => document.getElementById(`${METHODES_ID}-${m.key}`)),
      k: document.getElementById(K_ID),
      kOut: document.getElementById(K_OUT_ID),
      graine: document.getElementById(GRAINE_ID),
      graineBouton: document.getElementById(GRAINE_BOUTON_ID),
      reset: document.getElementById(RESET_ID),
      frontieres: document.getElementById(FRONT_ID),
      canvas: document.getElementById(CANVAS_ID),
      mesures: Array.from({ length: 5 }, (_, i) => document.getElementById(`${MESURES_ID}-${i}`)),
      tbody: document.getElementById(TABLE_BODY_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      note: document.getElementById(NOTE_ID),
    };
  }

  const panel = ctx.el('section', `${P}-panel`);
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Discrétiser une grandeur : où placer les frontières de classes');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'La passe 1 expliquait comment coder une valeur continue par une couleur. Celle-ci montre que la difficulté commence quand on découpe la valeur en classes : trois méthodes raisonnables, trois cartes différentes, pour un même jeu de valeurs. Tout est calculé localement, sans réseau ni valeur tirée au sort.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = METHODES_ID;
  fieldset.setAttribute('role', 'radiogroup');
  const legend = document.createElement('legend');
  legend.id = LEGENDE_ID;
  legend.textContent = 'Méthode de classement (choix unique)';
  fieldset.setAttribute('aria-labelledby', legend.id);
  fieldset.appendChild(legend);
  METHODES.forEach((m) => {
    const lab = ctx.el('label', `${P}-choix`);
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${P}-methode-groupe`;
    radio.id = `${METHODES_ID}-${m.key}`;
    radio.value = m.key;
    radio.checked = S.methode === m.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(m.court));
    fieldset.appendChild(lab);
  });

  const reglages = ctx.el('h3', '', 'Réglages déterministes');
  const boite = ctx.el('div');
  boite.id = `${P}-curseurs`;
  const kv = curseurK();

  const graineP = document.createElement('p');
  const graineTexte = document.createElement('span');
  graineTexte.id = GRAINE_ID;
  graineTexte.textContent = String(S.graine);
  graineP.appendChild(document.createTextNode('Graine du générateur (affichée, jamais tirée au sort) : '));
  graineP.appendChild(graineTexte);
  const graineBouton = ctx.el('button', '', 'Graine suivante');
  graineBouton.type = 'button';
  graineBouton.id = GRAINE_BOUTON_ID;
  graineBouton.setAttribute('aria-label', 'Incrémenter la graine déterministe d’une unité');
  graineP.appendChild(graineBouton);

  const front = ctx.el('button', '', S.frontieres ? 'Masquer les frontières' : 'Afficher les frontières');
  front.type = 'button';
  front.id = FRONT_ID;
  front.setAttribute('aria-pressed', S.frontieres ? 'true' : 'false');
  front.setAttribute('aria-controls', CANVAS_ID);

  const reset = ctx.el('button', '', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = RESET_ID;
  reset.setAttribute('aria-label', 'Restaurer les réglages par défaut du laboratoire');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Histogramme de 60 valeurs et classes colorées. Flèche gauche ou droite : nombre de classes ; flèche haut ou bas : méthode de classement ; touches 1, 2, 3 : intervalles égaux, quantiles, ruptures naturelles ; touche f : afficher ou masquer les frontières ; Entrée : lancer ou arrêter le balayage. Toutes les valeurs sont aussi écrites en texte dans le panneau.');
  canvas.setAttribute('aria-describedby', CLAVIER_ID);

  const clavier = ctx.el('p', `${P}-note`,
    'Clavier : les flèches gauche/droite règlent le nombre de classes, haut/bas changent de méthode, 1/2/3 choisissent directement une méthode, F bascule les frontières, Entrée lance le balayage. Cliquer sur l’histogramme met en surbrillance la classe pointée.');
  clavier.id = CLAVIER_ID;

  const readout = ctx.el('p', `${P}-readout`);
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter' : '▶ Lancer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', READOUT_ID);

  const note = ctx.el('p', `${P}-note`,
    'Une seule boucle rAF, pause sur onglet masqué et hors écran ; en mouvement réduit une seule image est dessinée, sans balayage.');
  note.id = NOTE_ID;

  boite.append(kv.row, kv.input, graineP, front, reset);
  panel.append(
    title, lead,
    staticDefinitions(), staticFormules(), staticGlossaire(),
    staticTable(), staticMesures(), staticLimite(),
    fieldset, reglages, boite, canvas, clavier, readout, play, note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: METHODES.map((m) => document.getElementById(`${METHODES_ID}-${m.key}`)),
    k: kv.input, kOut: kv.out,
    graine: graineTexte, graineBouton, reset, front,
    canvas, readout, play, note,
    mesures: Array.from({ length: 5 }, (_, i) => document.getElementById(`${MESURES_ID}-${i}`)),
    tbody: document.getElementById(TABLE_BODY_ID),
  };
}

/* ---------- E099-06 — canvas déterministe, un seul dessin par image ---------- */

function progressionFinale() {
  return reducedNow() ? 1 : Math.min(1, S.elapsed / SWEEP_MS);
}

function draw() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function' || !S.classes.length) return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 560;
  const cssH = cv.clientHeight || 330;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);
  g.font = '10px sans-serif';
  g.textBaseline = 'alphabetic';

  const pad = 12;
  const methode = METHODES.find((m) => m.key === S.methode) || METHODES[0];
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`${methode.court} · ${S.classes.length} classes · graine ${S.graine}`, pad, 15);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Référence : la même grandeur, classée autrement — les valeurs ne changent pas.', pad, 28);

  /* Histogramme : 24 bacs réguliers sur [0, 1000], déterministes. */
  const hX = pad;
  const hY = 38;
  const hW = cssW - pad * 2;
  const hH = Math.max(60, cssH * 0.52);
  const bins = new Array(N_BINS).fill(0);
  S.valeurs.forEach((v) => {
    let i = Math.floor((v - V_MIN) / (V_MAX - V_MIN) * N_BINS);
    if (i < 0) i = 0;
    if (i >= N_BINS) i = N_BINS - 1;
    bins[i] += 1;
  });
  const maxBin = Math.max(1, ...bins);
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.strokeRect(hX + 0.5, hY + 0.5, hW - 1, hH - 1);
  bins.forEach((count, i) => {
    const largeur = hW / N_BINS;
    const hauteur = (count / maxBin) * (hH - 4);
    const t = (i + 0.5) / N_BINS;
    g.fillStyle = rgbCss(rampeRgb(t), 0.72);
    g.fillRect(hX + i * largeur + 0.5, hY + hH - hauteur, largeur - 1, hauteur);
  });

  /* Surbrillance du balayage : une seule classe mise en avant par image. */
  const idx = reducedNow()
    ? S.classes.length - 1
    : Math.min(S.classes.length - 1, Math.floor(progressionFinale() * S.classes.length));
  S.surbrillance = idx;

  /* Frontières de classes : traits visibles, pas une information portée par
     la seule couleur. Chaque trait porte son numéro de classe en texte. */
  if (S.frontieres) {
    S.classes.forEach((c, i) => {
      if (i === 0) return;
      const x = hX + ((c.min - V_MIN) / (V_MAX - V_MIN)) * hW;
      g.strokeStyle = 'rgba(244,214,158,.95)';
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(x, hY);
      g.lineTo(x, hY + hH);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(244,214,158,.95)';
      g.fillText(`C${i + 1}`, Math.min(x + 2, hX + hW - 22), hY + 11);
    });
  }

  /* Bande d'échantillons : une tuile par classe, largeur proportionnelle à
     l'effectif — la classe est thus lisible même sans le dégradé. */
  const sY = hY + hH + 16;
  const sH = Math.max(20, cssH - sY - 26);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Tuiles : largeur = effectif de la classe', hX, sY - 4);
  let curseurX = hX;
  S.classes.forEach((c, i) => {
    const largeur = (c.effectif / Math.max(1, S.valeurs.length)) * hW;
    const t = (c.centre - V_MIN) / (V_MAX - V_MIN);
    g.fillStyle = rgbCss(rampeRgb(t), 1);
    g.fillRect(curseurX, sY, Math.max(1, largeur - 1), sH);
    if (i === idx) {
      g.strokeStyle = 'rgba(244,214,158,1)';
      g.lineWidth = 2;
      g.strokeRect(curseurX + 1, sY + 1, Math.max(1, largeur - 3), sH - 2);
    }
    curseurX += largeur;
  });
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.strokeRect(hX + 0.5, sY + 0.5, hW - 1, sH - 1);

  /* Étiquette de la classe courante, en texte. */
  const cour = S.classes[idx];
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(
    `Classe ${idx + 1}/${S.classes.length} · ${fmt(cour.effectif)} valeurs · bornes ${fmt(cour.min)}–${fmt(cour.max)}`,
    hX,
    sY + sH + 14,
  );
}

/* ---------- E099-07 / E099-08 — tableau, mesures, région live ---------- */

function majTable() {
  const n = S.nodes.tbody;
  if (!n) return;
  n.textContent = '';
  S.classes.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.appendChild(cellule('th', `C${i + 1}`, 'row'));
    tr.appendChild(cellule('td', `${fmt(c.min)} – ${fmt(c.max)}`));
    tr.appendChild(cellule('td', fmt(c.effectif)));
    tr.appendChild(cellule('td', pct(c.effectif / Math.max(1, S.valeurs.length))));
    tr.appendChild(cellule('td', rgbTriplet(rampeRgb((c.centre - V_MIN) / (V_MAX - V_MIN)))));
    n.appendChild(tr);
  });
}

function majMesures() {
  const n = S.nodes.mesures;
  if (!n || n.length < 5) return;
  const reduction = S.sseRef > 0 ? 1 - S.sse / S.sseRef : 0;
  const cible = Math.max(1, Math.round(S.valeurs.length / Math.max(1, S.classes.length)));
  const ecarts = S.classes.map((c) => Math.abs(c.effectif - cible));
  const worst = Math.max(0, ...ecarts);
  const c0 = rampeRgb(0);
  const c1 = rampeRgb(1);
  const contrasteExtremes = contraste(c0, c1);
  const textes = [
    `Jeu de référence : ${fmt(S.valeurs.length)} valeurs déterministes de graine ${fmt(S.graine)}, comprises entre ${fmt(Math.min(...S.valeurs))} et ${fmt(Math.max(...S.valeurs))} sur le domaine ${fmt(V_MIN)}–${fmt(V_MAX)}.`,
    `Dispersion interne (SSE) de la méthode « ${METHODES.find((m) => m.key === S.methode).court} » : ${fmt(S.sse, 1)} ; référence intervalles égaux : ${fmt(S.sseRef, 1)} (100 %), soit une réduction de ${pct(reduction)}.`,
    `Effectif cible par classe : ${fmt(cible)} valeurs ; plus grand écart observé : ${fmt(worst)} valeurs (référence : 0 pour des quantiles parfaits).`,
    `Nombre de classes : ${fmt(S.classes.length)} ; valeur maximale d’une classe : ${fmt(Math.max(0, ...S.classes.map((c) => c.effectif)))} valeurs.`,
    `Contraste de la rampe borne à borne : ${fmt(contrasteExtremes, 1)}:1, comparé au seuil d’accessibilité AA de ${fmt(SEUIL_AA, 1)}:1 pour le texte normal (${contrasteExtremes >= SEUIL_AA ? 'seuil franchi' : 'seuil non franchi'}).`,
  ];
  textes.forEach((texte, i) => {
    if (n[i]) n[i].textContent = texte;
  });
}

function majReadout(cause) {
  const rd = S.nodes.readout;
  if (!rd) return;
  const methode = METHODES.find((m) => m.key === S.methode) || METHODES[0];
  const cour = S.classes[S.surbrillance] || S.classes[0];
  const reduction = S.sseRef > 0 ? 1 - S.sse / S.sseRef : 0;
  const verbes = {
    initial: 'Lecture initiale', methode: 'Méthode modifiée', classes: 'Nombre de classes modifié',
    graine: 'Graine modifiée', frontieres: 'Frontières modifiées', balayage: 'Balayage en cours',
    clavier: 'Lecture au clavier', pointeur: 'Lecture au pointeur', reset: 'Réglages restaurés',
  };
  rd.textContent =
    `${verbes[cause] || 'Lecture'} · méthode ${methode.court} · ${fmt(S.classes.length)} classes · ` +
    `SSE ${fmt(S.sse, 1)} (référence intervalles égaux ${fmt(S.sseRef, 1)}, réduction ${pct(reduction)}) · ` +
    `graine ${fmt(S.graine)} · classe en surbrillance ${fmt((S.surbrillance < 0 ? 0 : S.surbrillance) + 1)} sur ${fmt(S.classes.length)} : ` +
    `${fmt(cour ? cour.effectif : 0)} valeurs, bornes ${fmt(cour ? cour.min : 0)}–${fmt(cour ? cour.max : 0)}.`;
}

/* ---------- Recalcul complet, cohérent entre texte et canvas ---------- */

function recompute(cause) {
  S.valeurs = genererValeurs(N_VALEURS, S.graine);
  S.classes = classer(S.valeurs, S.methode, S.k);
  S.sse = sseTotal(S.classes);
  const ref = classer(S.valeurs, 'intervalles', S.k);
  S.sseRef = sseTotal(ref);
  S.resultat = { methode: S.methode, k: S.k, graine: S.graine, sse: S.sse, sseRef: S.sseRef };
  S.surbrillance = reducedNow()
    ? S.classes.length - 1
    : Math.min(S.classes.length - 1, Math.floor(progressionFinale() * S.classes.length));

  const n = S.nodes;
  if (n.kOut) n.kOut.textContent = `${S.k}`;
  if (n.k) n.k.setAttribute('aria-valuetext', `${S.k} classes`);
  if (n.graine) n.graine.textContent = String(S.graine);
  if (n.front) {
    n.front.setAttribute('aria-pressed', S.frontieres ? 'true' : 'false');
    n.front.textContent = S.frontieres ? 'Masquer les frontières' : 'Afficher les frontières';
  }
  n.radios.forEach((r) => {
    if (r && r.checked !== (r.value === S.methode)) r.checked = r.value === S.methode;
  });
  majTable();
  majMesures();
  draw();
  majReadout(cause || 'initial');
  if (S.nodes.panel) {
    S.nodes.panel.setAttribute('data-geography-v2-e099-methode', S.methode);
    S.nodes.panel.setAttribute('data-geography-v2-e099-k', String(S.k));
  }
}

function syncControls() {
  const n = S.nodes;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter' : '▶ Lancer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.setAttribute('data-geography-v2-e099-reduced', reducedNow() ? '1' : '0');
}

/* ---------- E099-10 — horloge unique, pause, mouvement réduit ---------- */

function reducedNow() {
  if (typeof S.motionFn === 'function') {
    try { return !!S.motionFn(); } catch { return false; }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }
  return false;
}

function stopLoop() {
  if (S.rafId) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || reducedNow() || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') return;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.nodes.canvas || !S.nodes.canvas.isConnected) return;
  if (!S.playing || reducedNow()) return;
  if (!S.lastTs) S.lastTs = ts;
  S.elapsed += ts - S.lastTs;
  S.lastTs = ts;
  if (S.elapsed > SWEEP_MS) S.elapsed = 0;
  draw();
  const pctNow = S.elapsed / SWEEP_MS;
  if (Math.abs(pctNow - (S.lastPct || 0)) > 0.02) {
    majReadout('balayage');
    S.lastPct = pctNow;
  }
  S.rafId = requestAnimationFrame(tick);
}

function applyReduced() {
  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.elapsed = SWEEP_MS;
    S.lastPct = -1;
    recompute('initial');
  } else if (S.playing) {
    startLoop();
  }
  syncControls();
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && S.inView && !reducedNow()) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => applyReduced();
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source vivante. */ }
  }
  if (typeof IntersectionObserver === 'function' && !S.observer && S.nodes.canvas) {
    try {
      S.observer = new IntersectionObserver((entries) => {
        const ent = entries[0];
        S.inView = !!(ent && ent.isIntersecting);
        if (!S.inView) stopLoop();
        else if (S.playing && !reducedNow()) startLoop();
      }, { threshold: 0.05 });
      S.observer.observe(S.nodes.canvas);
    } catch { /* Observateur indisponible : la pause sur onglet masqué suffit. */ }
  }
}

/* ---------- E099-09 — point d'entrée ---------- */

register('E099', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof ctx.reducedMotion === 'function') S.motionFn = ctx.reducedMotion;
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);

  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.elapsed = SWEEP_MS;
    S.lastPct = -1;
  }
  recompute('initial');
  syncControls();

  const n = S.nodes;
  if (n.fresh) {
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.methode = radio.value;
        recompute('methode');
      });
    });
    n.k.addEventListener('input', () => {
      S.k = Math.max(3, Math.min(9, Math.round(Number(n.k.value))));
      recompute('classes');
    });
    const graineSuivante = () => {
      S.graine = (S.graine + 1) >>> 0;
      recompute('graine');
    };
    n.graineBouton.addEventListener('click', graineSuivante);
    n.front.addEventListener('click', () => {
      S.frontieres = !S.frontieres;
      recompute('frontieres');
    });
    n.reset.addEventListener('click', () => {
      S.graine = 99099;
      S.k = 5;
      S.methode = 'intervalles';
      S.frontieres = true;
      S.elapsed = SWEEP_MS;
      S.lastPct = -1;
      recompute('reset');
    });
    n.play.addEventListener('click', () => {
      if (reducedNow()) {
        S.playing = false;
        S.elapsed = SWEEP_MS;
        S.lastPct = -1;
        syncControls();
        recompute('clavier');
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop();
      else { S.lastTs = 0; startLoop(); }
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let utilise = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.k = Math.max(3, Math.min(9, S.k + (event.key === 'ArrowRight' ? 1 : -1)));
        recompute('clavier');
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const i = METHODES.findIndex((m) => m.key === S.methode);
        const dir = event.key === 'ArrowDown' ? 1 : -1;
        S.methode = METHODES[(i + dir + METHODES.length) % METHODES.length].key;
        recompute('clavier');
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        S.methode = METHODES[Number(event.key) - 1].key;
        recompute('clavier');
      } else if (event.key === 'f' || event.key === 'F') {
        S.frontieres = !S.frontieres;
        recompute('clavier');
      } else if (event.key === 'Home') {
        S.surbrillance = 0;
        draw(); majReadout('clavier');
      } else if (event.key === 'End') {
        S.surbrillance = S.classes.length - 1;
        draw(); majReadout('clavier');
      } else if (event.key === 'Enter' || event.key === ' ') {
        n.play.click();
      } else {
        utilise = false;
      }
      if (utilise) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    /* Pointeur : mettre en surbrillance la classe pointée ; même relation que
       les flèches, aucune information n'est réservée à la souris. */
    const pointerClasse = (event) => {
      const rect = n.canvas.getBoundingClientRect();
      if (!rect.width) return;
      const x = (event.clientX - rect.left) / rect.width;
      if (x < 0 || x > 1) return;
      const v = V_MIN + x * (V_MAX - V_MIN);
      let idx = S.classes.findIndex((c) => v >= c.min && v <= c.max);
      if (idx < 0) {
        idx = S.classes.reduce((best, c, i) => (
          Math.abs(c.centre - v) < Math.abs(S.classes[best].centre - v) ? i : best
        ), 0);
      }
      S.surbrillance = Math.max(0, idx);
      draw();
      majReadout('pointeur');
    };
    n.canvas.addEventListener('pointerdown', pointerClasse);
  }

  installGlobalListeners();
  if (S.playing && S.inView && !reducedNow()) startLoop();
});
