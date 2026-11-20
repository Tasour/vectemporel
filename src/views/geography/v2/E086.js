import { register } from './registry.js';

/* Lentille E086 — seconde passe V2 de la vue GEOGRAPHIE.
 * Thème : cache de projection (mémoïsation) et sobriété des calculs.
 *
 * Les dix chantiers E086-01 … E086-10 de cette passe V2 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E086.md (la passe 1 reste intacte). Une
 * seule clé CSS `geography-v2-e086` via ctx.css(), tous les identifiants,
 * classes, groupes et attributs préfixés `geography-v2-e086-*`. Tout est local :
 * aucune requête réseau, aucune valeur aléatoire (générateur mulberry32 à
 * graine affichée), aucun appel de journalisation, aucun fichier partagé
 * (registry, index, passe 1) modifié. Une seule horloge requestAnimationFrame
 * pilote le laboratoire, avec pause sur document.hidden et hors écran ; le
 * savoir est du texte sémantique réel (titres, paragraphes, tableau captioné,
 * défi en cinq temps) présent dans le DOM même sans animation ; le canvas ne
 * fait qu'illustrer une charge de travail réellement passée dans un cache LRU.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e086';
const P = 'geography-v2-e086';

const PANEL_ID = `${P}-panel`;
const TITLE_ID = `${P}-title`;
const TABLE_ID = `${P}-table`;
const TABLE_BODY_ID = `${P}-table-body`;
const STRAT_ID = `${P}-strategie`;
const POINTS_ID = `${P}-points`;
const POINTS_OUT_ID = `${P}-points-value`;
const FRAMES_ID = `${P}-passes`;
const FRAMES_OUT_ID = `${P}-passes-value`;
const CAP_ID = `${P}-capacite`;
const CAP_OUT_ID = `${P}-capacite-value`;
const GRAINE_ID = `${P}-graine`;
const GRAINE_BOUTON_ID = `${P}-graine-suivante`;
const RESET_ID = `${P}-reset`;
const CANVAS_ID = `${P}-canvas`;
const READOUT_ID = `${P}-readout`;
const PLAY_ID = `${P}-play`;
const NOTE_ID = `${P}-note`;

/* Dimensions et bornes réelles du cadre France, arrondies (identiques à la
   passe 1 et à geography.js). Aucune coordonnée n'est inventée. */
const MAP_W = 900;
const MAP_H = 620;
const BOUNDS_LARGE = Object.freeze({ minLon: -4.6, maxLon: 8.1, minLat: 42.3, maxLat: 50.9 });
const BOUNDS_SERRÉ = Object.freeze({ minLon: -1.0, maxLon: 5.0, minLat: 44.0, maxLat: 49.0 });

/* Durée d'un balayage complet de la trace, en millisecondes. */
const CYCLE_MS = 6000;

const STRATEGIES = ['sans-cache', 'lru', 'invalidation'];
const STRAT_LABELS = {
  'sans-cache': 'Recalcul intégral — aucun cache (référence)',
  lru: 'Cache LRU — capacité bornée',
  invalidation: 'Cache LRU + invalidation à mi-parcours',
};
const STRAT_COURT = {
  'sans-cache': 'Sans cache',
  lru: 'LRU',
  invalidation: 'LRU + invalidation',
};

/* Paramètres effectifs d'une stratégie. Le choix unique est la source de
   vérité ; la capacité ne sert qu'aux stratégies avec cache. */
function paramsStrategie(nom, capacite) {
  if (nom === 'sans-cache') return { capacite: 0, invalidation: false };
  if (nom === 'invalidation') return { capacite, invalidation: true };
  return { capacite, invalidation: false };
}

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  strategie: 'lru',
  points: 12,
  frames: 20,
  capacite: 32,
  graine: 86026,
  playing: false,
  elapsed: CYCLE_MS,
  lastPct: -1,
  lastTs: 0,
  rafId: 0,
  inView: true,
  visibilityBound: false,
  motionBound: false,
  motionFn: null,
  observer: null,
  resultat: null,
  nodes: {},
};

/* ---------- Outils déterministes ---------- */

const fmt = (v, d = 0) => {
  const f = Math.pow(10, d);
  return (Math.round(v * f) / f).toFixed(d).replace('.', ',');
};

const pct = (v, d = 1) => `${fmt(v * 100, d)} %`;

const arrondi = (v) => Math.round(v * 10000) / 10000;

/* Générateur congruentiel mulberry32 : aucune valeur tirée au hasard,
 * la graine est affichée dans le panneau et peut être incrémentée d'un pas. */
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

/* Points répartis sur une grille régulière du cadre large, avec un léger
 * décalage déterministe issu de la graine affichée, sans aucun tirage aléatoire. */
function genererPoints(n, graine) {
  const suivant = mulberry32(graine);
  const cols = Math.max(2, Math.ceil(Math.sqrt(n * 1.5)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const spanLon = BOUNDS_LARGE.maxLon - BOUNDS_LARGE.minLon;
  const spanLat = BOUNDS_LARGE.maxLat - BOUNDS_LARGE.minLat;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const fc = cols > 1 ? c / (cols - 1) : 0.5;
    const fr = rows > 1 ? r / (rows - 1) : 0.5;
    const jx = (suivant() - 0.5) * 0.5 / cols;
    const jy = (suivant() - 0.5) * 0.5 / rows;
    const u = Math.max(0, Math.min(1, fc + jx));
    const v = Math.max(0, Math.min(1, fr + jy));
    const lon = BOUNDS_LARGE.minLon + u * spanLon;
    const lat = BOUNDS_LARGE.maxLat - v * spanLat;
    out.push({ i, lon: arrondi(lon), lat: arrondi(lat) });
  }
  return out;
}

/* Projection affine pure, identique à celle de geography.js. */
function projeter(p, b) {
  const spanLon = b.maxLon - b.minLon;
  const spanLat = b.maxLat - b.minLat;
  return {
    nx: (p.lon - b.minLon) / spanLon,
    ny: (b.maxLat - p.lat) / spanLat,
  };
}

/* La clé contient TOUTES les entrées : bornes et dimensions comprises. */
function cleProjection(p, b) {
  return [p.lon, p.lat, b.minLon, b.maxLon, b.minLat, b.maxLat, MAP_W, MAP_H].join('|');
}

/* Cache LRU à capacité bornée ; capacité 0 = cache éteint. */
function creerCache(capacite) {
  const table = new Map();
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  let calculs = 0;

  function get(key, compute) {
    if (capacite <= 0) {
      calculs += 1;
      return { value: compute(), hit: false, disabled: true };
    }
    if (table.has(key)) {
      hits += 1;
      const value = table.get(key);
      table.delete(key);
      table.set(key, value); /* touch LRU : le plus récent est à la fin */
      return { value, hit: true, disabled: false };
    }
    misses += 1;
    calculs += 1;
    const value = compute();
    table.set(key, value);
    if (table.size > capacite) {
      const plusAncien = table.keys().next().value;
      table.delete(plusAncien);
      evictions += 1;
    }
    return { value, hit: false, disabled: false };
  }

  function vider() {
    table.clear();
  }

  function stats() {
    return {
      hits, misses, evictions, calculs, taille: table.size,
      demandes: hits + misses,
      taux: hits + misses > 0 ? hits / (hits + misses) : 0,
    };
  }

  return { get, vider, stats };
}

/* Charge de travail réelle : `frames` passes sur les mêmes points. Avec
   invalidation, les bornes changent à mi-parcours et le cache est vidé. */
function runWorkload(n, frames, graine, capacite, invalidation) {
  const points = genererPoints(n, graine);
  const cache = creerCache(capacite);
  const demi = Math.floor(frames / 2);
  const trace = [];
  let bornesChangees = false;

  for (let frame = 0; frame < frames; frame += 1) {
    if (invalidation && frame === demi) {
      cache.vider();
      bornesChangees = true;
    }
    const bornes = invalidation && frame >= demi ? BOUNDS_SERRÉ : BOUNDS_LARGE;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const rep = cache.get(cleProjection(p, bornes), () => projeter(p, bornes));
      trace.push({
        i, frame, hit: rep.hit, disabled: rep.disabled,
        nx: rep.value.nx, ny: rep.value.ny,
      });
    }
  }

  const st = cache.stats();
  const sansCache = points.length * frames;
  return {
    points: points.length,
    frames,
    capacite,
    invalidation,
    bornesChangees,
    sansCache,
    avecCache: st.calculs,
    evitees: sansCache - st.calculs,
    taux: st.taux,
    hits: st.hits,
    misses: st.misses,
    evictions: st.evictions,
    taille: st.taille,
    trace,
  };
}

/* ---------- Feuille de style unique et préfixée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-limite{
  margin:8px 0;padding:8px 9px;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.04);
}
#${P}-limite ol{margin:4px 0 0;padding-left:20px}
#${P}-limite li{margin:2px 0}
#${STRAT_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${STRAT_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
#${P}-curseurs{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PANEL_ID} .${P}-curseur{
  display:block;width:100%;min-height:36px;margin:2px 0 6px;accent-color:var(--gold,#e6b96f);
}
.${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${GRAINE_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:300px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
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
#${P}-note{font-size:10px;color:var(--muted);margin:6px 0 0}
#${PANEL_ID}[data-${P}-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:240px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- Texte sémantique, lisible sans laboratoire ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une projection est une fonction pure : à des coordonnées et un cadre donnés, elle renvoie toujours le même point écran. La mémoïsation (cache de projection) stocke ce résultat pour ne pas le recalculer. Le coût d’une passe est le nombre de projections effectivement calculées, pas le nombre de demandes.',
    'La clé d’un cache doit contenir toutes les entrées de la fonction : longitude, latitude, mais aussi les quatre bornes du cadre et les dimensions. Omettre les bornes et le cache renvoie une position périmée dès que la carte change de cadre : c’est l’invalidation manquée.',
    'Un cache à capacité bornée évince l’entrée la plus anciennement utilisée (LRU, least recently used). Trop petit, il évince trop tôt et retombe au coût d’un recalcul intégral ; la sobriété des calculs est donc un compromis entre mémoire et opérations, pas un gain automatique.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = `${P}-fait`;
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticFormules() {
  const wrap = document.createElement('div');
  const formules = [
    'Coût sans cache = points × passes. Coût avec cache = nombre de calculs réellement effectués par le cache LRU. Opérations évitées = coût sans cache − coût avec cache. La référence est le recalcul intégral.',
    'Taux de réussite = réussites / demandes, où une réussite (hit) est une clé déjà présente et un échec (miss) un calcul neuf. Référence : 0 % sans cache, 100 % si chaque demande après la première est servie depuis le cache.',
    'Une invalidation vide le cache : les bornes changeant, les clés changent aussi. Le laboratoire place un changement de cadre (large → serré) à mi-parcours, ce qui ajoute exactement une passe complète au coût avec cache.',
    'La clé est construite comme longitude | latitude | minLon | maxLon | minLat | maxLat | largeur | hauteur. Les points viennent du générateur déterministe mulberry32 dont la graine est affichée : aucune valeur n’est tirée au hasard.',
  ];
  formules.forEach((texte) => {
    const p = document.createElement('p');
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function celluleTexte(tag, texte, portee) {
  const n = document.createElement(tag);
  if (portee) n.scope = portee;
  n.textContent = texte;
  return n;
}

/* Quatre stratégies comparées sur la même charge. Chaque ligne est produite
   par runWorkload(), la même fonction que le laboratoire. */
const SCENARIOS = [
  ['Recalcul intégral', 'sans-cache', 32],
  ['Cache LRU, 32 entrées', 'lru', 32],
  ['Cache LRU, 4 entrées', 'lru', 4],
  ['Cache 32 + invalidation', 'invalidation', 32],
];

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Coût de la même charge de travail (12 points, 20 passes, graine 86026) selon la stratégie. Référence : le recalcul intégral de 240 projections. Tous les chiffres sont recalculés par runWorkload(), jamais mémorisés.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Stratégie', 'Calculées / demandées', 'Évitées', 'Réussite', 'Évictions'].forEach((h) => {
    hr.appendChild(celluleTexte('th', h, 'col'));
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.id = TABLE_BODY_ID;
  table.appendChild(tbody);
  return table;
}

function majTable() {
  const tbody = document.getElementById(TABLE_BODY_ID);
  if (!tbody) return;
  tbody.textContent = '';
  SCENARIOS.forEach(([libelle, nom, capacite]) => {
    const param = paramsStrategie(nom, capacite);
    const r = runWorkload(12, 20, 86026, param.capacite, param.invalidation);
    const tr = document.createElement('tr');
    tr.appendChild(celluleTexte('th', libelle, 'row'));
    tr.appendChild(celluleTexte('td', `${fmt(r.avecCache)} / ${fmt(r.sansCache)}`));
    tr.appendChild(celluleTexte('td', fmt(r.evitees)));
    tr.appendChild(celluleTexte('td', pct(r.taux)));
    tr.appendChild(celluleTexte('td', fmt(r.evictions)));
    tbody.appendChild(tr);
  });
}

function staticLimite() {
  const box = document.createElement('div');
  box.id = `${P}-limite`;
  const h = document.createElement('h3');
  h.textContent = 'Limite falsifiable — défi en cinq temps';
  const p = document.createElement('p');
  p.textContent = 'Un cache économise des calculs, jamais de la justesse : s’il est mal invalidé, il économise des calculs faux. Voici comment tenter de le faire échouer.';
  const ol = document.createElement('ol');
  const etapes = [
    'Prédiction : avec 12 points, 20 passes et un cache de capacité 32, le coût passe de 240 à 12 projections (taux de réussite 95 %) ; avec une invalidation à mi-parcours, il remonte à 24 (90 %).',
    'Réglage : choisir « LRU », placer la capacité à 32, les passes à 20, puis comparer avec « LRU + invalidation » et avec « Sans cache ».',
    'Résultat attendu : le coût avec cache double (12 puis 24) et le tableau donne le même ordre de grandeur ; la région live annonce chaque chiffre en toutes lettres.',
    'Falsification : choisir « Sans cache » doit ramener le coût à 240 et le taux à 0 %. Si le chiffre ne bouge pas, le cache n’est pas réellement traversé. Si l’invalidation ne change rien, la clé n’inclut pas les bornes.',
    'Débrief : retenir que l’angle mort n’est pas le gain de vitesse mais la fraîcheur — mieux vaut recalculer souvent que servir une projection périmée après un changement de cadre.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  box.append(h, p, ol);
  return box;
}

/* ---------- Contrôles et construction du panneau ---------- */

function curseur(id, valeurId, libelle, min, max, step, valeur, format, aria, valuetext) {
  const row = document.createElement('p');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(`${libelle} : `));
  const out = document.createElement('span');
  out.id = valeurId;
  out.className = `${P}-valeur`;
  out.textContent = format(valeur);
  label.appendChild(out);
  row.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.className = `${P}-curseur`;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(valeur);
  input.setAttribute('aria-label', aria);
  input.setAttribute('aria-valuetext', valuetext(valeur));
  return { row, input, out, valuetext };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: STRATEGIES.map((s) => document.getElementById(`${STRAT_ID}-${s}`)),
      points: document.getElementById(POINTS_ID),
      pointsOut: document.getElementById(POINTS_OUT_ID),
      frames: document.getElementById(FRAMES_ID),
      framesOut: document.getElementById(FRAMES_OUT_ID),
      capacite: document.getElementById(CAP_ID),
      capaciteOut: document.getElementById(CAP_OUT_ID),
      graine: document.getElementById(GRAINE_ID),
      graineBouton: document.getElementById(GRAINE_BOUTON_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      note: document.getElementById(NOTE_ID),
    };
  }

  const panel = ctx.el('section', `${P}-panel`);
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Cache de projection et sobriété des calculs');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une projection est une fonction pure : on peut mémoriser son résultat. Le laboratoire fait réellement passer une charge de travail dans un cache LRU et compare le nombre de projections calculées au recalcul intégral, sans aucune requête réseau ni valeur aléatoire.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = STRAT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  const legend = document.createElement('legend');
  legend.id = `${STRAT_ID}-legend`;
  legend.textContent = 'Stratégie de cache (choix unique)';
  fieldset.setAttribute('aria-labelledby', legend.id);
  fieldset.appendChild(legend);
  STRATEGIES.forEach((s) => {
    const lab = ctx.el('label', `${P}-choix`);
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${P}-strategie-groupe`;
    radio.id = `${STRAT_ID}-${s}`;
    radio.value = s;
    radio.checked = S.strategie === s;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(STRAT_COURT[s]));
    fieldset.appendChild(lab);
  });

  const reglages = ctx.el('h3', '', 'Réglages déterministes');
  const boite = ctx.el('div');
  boite.id = `${P}-curseurs`;

  const pts = curseur(POINTS_ID, POINTS_OUT_ID, 'Nombre de points', 6, 24, 2, S.points,
    (v) => `${v}`, 'Nombre de points à projeter, de 6 à 24 par pas de 2',
    (v) => `${v} points`);
  const fr = curseur(FRAMES_ID, FRAMES_OUT_ID, 'Passes de rendu', 2, 30, 1, S.frames,
    (v) => `${v}`, 'Nombre de passes successives, de 2 à 30',
    (v) => `${v} passes`);
  const cap = curseur(CAP_ID, CAP_OUT_ID, 'Capacité du cache', 0, 64, 4, S.capacite,
    (v) => v === 0 ? 'éteint' : `${v} entrées`,
    'Capacité du cache LRU, de 0 (éteint) à 64 entrées',
    (v) => v === 0 ? 'cache éteint' : `${v} entrées`);

  const graineP = document.createElement('p');
  const graineTexte = document.createElement('span');
  graineTexte.id = GRAINE_ID;
  graineTexte.textContent = String(S.graine);
  graineP.appendChild(document.createTextNode('Graine du générateur (affichée, jamais aléatoire) : '));
  graineP.appendChild(graineTexte);
  const graineBouton = ctx.el('button', '', 'Graine suivante');
  graineBouton.type = 'button';
  graineBouton.id = GRAINE_BOUTON_ID;
  graineBouton.setAttribute('aria-label', 'Incrémenter la graine déterministe d’une unité');
  graineP.appendChild(graineBouton);

  const reset = ctx.el('button', '', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = RESET_ID;
  reset.setAttribute('aria-label', 'Restaurer les réglages par défaut du laboratoire');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Comparaison du coût avec et sans cache de projection. Flèche gauche ou droite : nombre de points ; flèche haut ou bas : passes de rendu ; touches 1, 2, 3 : sans cache, LRU, LRU avec invalidation ; touche g : graine suivante ; Entrée : lancer ou arrêter le balayage.');

  const readout = ctx.el('p', `${P}-readout`);
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter' : '▶ Lancer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const note = ctx.el('p', `${P}-note`, 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; en mouvement réduit une seule image est dessinée, sans balayage.');
  note.id = NOTE_ID;

  boite.append(pts.row, pts.input, fr.row, fr.input, cap.row, cap.input, graineP, reset);
  panel.append(
    title, lead, staticFacts(), staticFormules(), staticTable(), staticLimite(),
    fieldset, reglages, boite, canvas, readout, play, note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: STRATEGIES.map((s) => document.getElementById(`${STRAT_ID}-${s}`)),
    points: pts.input, pointsOut: pts.out,
    frames: fr.input, framesOut: fr.out,
    capacite: cap.input, capaciteOut: cap.out,
    graine: graineTexte, graineBouton, reset,
    canvas, readout, play, note,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule passe) ---------- */

function progressionFinale() {
  return reducedNow() ? 1 : Math.min(1, S.elapsed / CYCLE_MS);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 420;
  const cssH = cv.clientHeight || 300;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const r = S.resultat;
  if (!r || r.trace.length === 0) return;

  const pad = 10;
  const bandeauY = 30;
  const mapW = Math.round((cssW - pad * 2) * 0.5);
  const barX = pad + mapW + 12;
  const barW = Math.max(10, cssW - pad - barX);

  /* Bandeau d'état : valeurs lues directement, reprises dans la région live. */
  g.font = '10px sans-serif';
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`${STRAT_COURT[S.strategie]} · ${S.points} points · ${S.frames} passes · ${S.capacite === 0 ? 'cache éteint' : `${S.capacite} entrées`} · graine ${S.graine}`, pad, 14);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText(`Référence : recalcul intégral · carré plein = réussite, cercle vide = échec`, pad, bandeauY);

  /* Zone gauche : cadre projeté, points de la passe courante et requête. */
  const mx = pad;
  const my = bandeauY + 12;
  const mh = Math.max(10, cssH - my - pad - 14);
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(mx, my, mapW, mh);
  g.strokeStyle = 'rgba(214,207,193,.16)';
  g.setLineDash([2, 5]);
  for (let k = 1; k < 4; k += 1) {
    const gx = mx + (mapW * k) / 4;
    const gy = my + (mh * k) / 4;
    g.beginPath(); g.moveTo(gx, my); g.lineTo(gx, my + mh); g.stroke();
    g.beginPath(); g.moveTo(mx, gy); g.lineTo(mx + mapW, gy); g.stroke();
  }
  g.setLineDash([]);

  const idx = reducedNow()
    ? r.trace.length - 1
    : Math.min(r.trace.length - 1, Math.floor(progressionFinale() * r.trace.length));
  const courant = r.trace[idx] || r.trace[r.trace.length - 1];
  const passe = courant.frame;

  /* Une seule passe est dessinée : les positions sont identiques d'une passe
     à l'autre, c'est précisément ce que le cache évite de recalculer. */
  r.trace.forEach((t) => {
    if (t.frame !== passe) return;
    const px = mx + t.nx * mapW;
    const py = my + t.ny * mh;
    g.fillStyle = 'rgba(214,207,193,.55)';
    g.fillRect(px - 1.5, py - 1.5, 3, 3);
  });

  const cx = mx + courant.nx * mapW;
  const cy = my + courant.ny * mh;
  /* Forme distincte pour hit / miss : l'information ne repose pas sur la
     seule couleur (carré plein = réussite, cercle vide = échec). */
  if (courant.hit) {
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillRect(cx - 4, cy - 4, 8, 8);
  } else {
    g.strokeStyle = 'rgba(230,185,111,.95)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 4.5, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Passe ${passe + 1}/${r.frames}`, mx, my + mh + 12);

  /* Zone droite : deux barres de coût, mesurées sur la même échelle. */
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillText('Projections calculées', barX, my + 6);
  const maxCost = Math.max(1, r.sansCache);
  const barH = 14;
  const y1 = my + 14;
  g.fillStyle = 'rgba(214,207,193,.95)';
  g.fillText(`Sans cache : ${fmt(r.sansCache)}`, barX, y1);
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(barX, y1 + 6, barW, barH);
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.fillRect(barX + 1, y1 + 7, barW - 2, barH - 2);

  const y2 = y1 + 50;
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Avec cache : ${fmt(r.avecCache)}`, barX, y2);
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.strokeRect(barX, y2 + 6, barW, barH);
  g.fillStyle = 'rgba(244,214,158,.7)';
  g.fillRect(barX + 1, y2 + 7, Math.max(0, (barW - 2) * (r.avecCache / maxCost)), barH - 2);

  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(`Évitées ${fmt(r.evitees)} · réussite ${pct(r.taux)}`, barX, y2 + 44);
  g.fillText(`Évictions ${fmt(r.evictions)} · taille ${fmt(r.taille)}`, barX, y2 + 58);
  g.fillText(courant.disabled ? 'Cache éteint'
    : courant.hit ? 'Requête courante : réussite' : 'Requête courante : échec', barX, y2 + 72);
  g.fillText(r.bornesChangees && passe >= Math.floor(r.frames / 2)
    ? 'Bornes serrées après invalidation' : 'Bornes larges', barX, y2 + 86);

  /* Barre de progression alimentée par l'unique horloge. */
  const barY = cssH - 8;
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(8, barY, cssW - 16, 5);
  g.fillStyle = 'rgba(244,214,158,.55)';
  g.fillRect(9, barY + 1, (cssW - 18) * progressionFinale(), 3);
}

function updateReadout() {
  const n = S.nodes.readout;
  const r = S.resultat;
  if (!n || !r) return;
  const idx = reducedNow()
    ? r.trace.length - 1
    : Math.min(r.trace.length - 1, Math.floor(progressionFinale() * r.trace.length));
  const courant = r.trace[idx] || r.trace[0];
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.append(
    document.createTextNode(`${STRAT_COURT[S.strategie]} — projections calculées : `),
    fort(String(r.avecCache)),
    document.createTextNode(` sur ${fmt(r.sansCache)} demandes (recalcul intégral) · évitées ${fmt(r.evitees)} · réussite `),
    fort(pct(r.taux)),
    document.createTextNode(` (référence : 0 % sans cache, 100 % parfait) · évictions ${fmt(r.evictions)} · taille ${fmt(r.taille)}/${r.capacite === 0 ? 'éteinte' : String(r.capacite)} · requête courante : `),
    fort(courant.disabled ? 'cache éteint' : courant.hit ? 'réussite' : 'échec'),
    document.createTextNode(r.bornesChangees ? ' · une invalidation à mi-parcours' : ' · aucune invalidation'),
    document.createTextNode(` · graine ${S.graine}.`),
  );
}

function updateNote() {
  const n = S.nodes.note;
  if (!n) return;
  n.textContent = reducedNow()
    ? 'Mouvement réduit actif : une seule image est dessinée sur l’état final, sans boucle rAF ni balayage ; les chiffres restent identiques.'
    : 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; le coût n’est recalculé qu’au changement de réglage, pas à chaque image.';
}

function syncControls() {
  const n = S.nodes;
  if (n.points) n.points.value = String(S.points);
  if (n.pointsOut) n.pointsOut.textContent = String(S.points);
  if (n.points) n.points.setAttribute('aria-valuetext', `${S.points} points`);
  if (n.frames) n.frames.value = String(S.frames);
  if (n.framesOut) n.framesOut.textContent = String(S.frames);
  if (n.frames) n.frames.setAttribute('aria-valuetext', `${S.frames} passes`);
  if (n.capacite) n.capacite.value = String(S.capacite);
  if (n.capaciteOut) n.capaciteOut.textContent = S.capacite === 0 ? 'éteint' : `${S.capacite} entrées`;
  if (n.capacite) n.capacite.setAttribute('aria-valuetext', S.capacite === 0 ? 'cache éteint' : `${S.capacite} entrées`);
  if (n.radios) n.radios.forEach((radio) => { if (radio) radio.checked = radio.value === S.strategie; });
  if (n.graine) n.graine.textContent = String(S.graine);
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter' : '▶ Lancer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.setAttribute(`data-${P}-reduced`, reducedNow() ? '1' : '0');
  majTable();
  updateReadout();
  updateNote();
  drawLab();
}

function recompute() {
  const param = paramsStrategie(S.strategie, S.capacite);
  S.resultat = runWorkload(S.points, S.frames, S.graine, param.capacite, param.invalidation);
  syncControls();
}

function resetState() {
  S.strategie = 'lru';
  S.points = 12;
  S.frames = 20;
  S.capacite = 32;
  S.graine = 86026;
  stopLoop();
  S.playing = false;
  S.elapsed = CYCLE_MS;
  recompute();
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
  if (!S.inView || reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Horloge unique : une seule fonction tick, un seul identifiant rafId. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || reducedNow()) return;
  if (S.lastTs) {
    /* Pas plafonné : un retour d'onglet ne provoque pas de saut. */
    const dt = Math.min(64, Math.max(0, ts - S.lastTs));
    S.elapsed = (S.elapsed + dt) % CYCLE_MS;
  }
  S.lastTs = ts;
  const pctNow = S.elapsed / CYCLE_MS;
  drawLab();
  if (Math.abs(pctNow - S.lastPct) > 0.01) {
    updateReadout();
    S.lastPct = pctNow;
  }
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

/* Source de vérité de la préférence de mouvement, fournie par la coque. */
function reducedNow() {
  if (typeof S.motionFn === 'function') {
    try { return !!S.motionFn(); } catch { return false; }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }
  return false;
}

function applyReduced() {
  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.elapsed = CYCLE_MS;
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
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
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

/* ---------- Point d'entrée ---------- */

register('E086', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  if (typeof ctx.reducedMotion === 'function') S.motionFn = ctx.reducedMotion;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  recompute();

  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.elapsed = CYCLE_MS;
    S.lastPct = -1;
  }
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        S.strategie = radio.value;
        recompute();
      });
    });
    n.points.addEventListener('input', () => {
      S.points = Math.max(6, Math.min(24, Math.round(Number(n.points.value) / 2) * 2));
      recompute();
    });
    n.frames.addEventListener('input', () => {
      S.frames = Math.max(2, Math.min(30, Math.round(Number(n.frames.value))));
      recompute();
    });
    n.capacite.addEventListener('input', () => {
      S.capacite = Math.max(0, Math.min(64, Math.round(Number(n.capacite.value) / 4) * 4));
      recompute();
    });
    const graineSuivante = () => {
      S.graine = (S.graine + 1) >>> 0;
      recompute();
    };
    n.graineBouton.addEventListener('click', graineSuivante);
    n.reset.addEventListener('click', resetState);
    n.play.addEventListener('click', () => {
      if (reducedNow()) {
        S.playing = false;
        S.elapsed = CYCLE_MS;
        S.lastPct = -1;
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let utilise = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.points = Math.max(6, Math.min(24, S.points + (event.key === 'ArrowRight' ? 2 : -2)));
        recompute();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        S.frames = Math.max(2, Math.min(30, S.frames + (event.key === 'ArrowUp' ? 1 : -1)));
        recompute();
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        S.strategie = STRATEGIES[Number(event.key) - 1];
        recompute();
      } else if (event.key === 'g' || event.key === 'G') {
        graineSuivante();
      } else if (event.key === 'Enter' || event.key === ' ') {
        n.play.click();
      } else {
        utilise = false;
      }
      if (utilise) event.preventDefault();
    });
  }

  installGlobalListeners();
  if (S.playing && S.inView && !reducedNow()) startLoop();
});
