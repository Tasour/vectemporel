import { register } from './registry.js';

/* Lentille E086 — vue GEOGRAPHIE.
 * Thème : cache de projection (mémoïsation) et sobriété des calculs.
 *
 * Les dix chantiers E086-01 … E086-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E086.md. Tout est local : aucune requête
 * réseau, aucune valeur aléatoire, aucun appel de journalisation, aucun
 * fichier partagé modifié. Une seule horloge requestAnimationFrame pilote le
 * laboratoire ; le savoir est du texte sémantique réel (titres, paragraphes,
 * tableau captioné, défi en cinq temps) présent dans le DOM même sans
 * animation ; le canvas ne fait qu'illustrer une charge de travail calculée
 * localement et réellement passée à travers un cache LRU.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PANEL_ID = 'geography-e086-panel';
const TITLE_ID = 'geography-e086-title';
const POINTS_ID = 'geography-e086-points';
const POINTS_OUT_ID = 'geography-e086-points-value';
const FRAMES_ID = 'geography-e086-frames';
const FRAMES_OUT_ID = 'geography-e086-frames-value';
const CAP_ID = 'geography-e086-capacite';
const CAP_OUT_ID = 'geography-e086-capacite-value';
const INVALID_ID = 'geography-e086-invalidation';
const CANVAS_ID = 'geography-e086-canvas';
const READOUT_ID = 'geography-e086-readout';
const PLAY_ID = 'geography-e086-play';
const TABLE_ID = 'geography-e086-table';
const LIMITE_ID = 'geography-e086-limite';
const NOTE_ID = 'geography-e086-note';

/* Dimensions de référence, identiques à celles de geography.js (MAP_W/MAP_H).
   Les deux cadres sont des bornes réelles du jeu de données, arrondies : le
   cadre « large » est celui de la France, le cadre « serré » en est un
   sous-ensemble. Aucune coordonnée n'est inventée. */
const MAP_W = 900;
const MAP_H = 620;
const BOUNDS_LARGE = Object.freeze({ minLon: -4.6, maxLon: 8.1, minLat: 42.3, maxLat: 50.9 });
const BOUNDS_SERRÉ = Object.freeze({ minLon: -1.0, maxLon: 5.0, minLat: 44.0, maxLat: 49.0 });

/* Durée d'un balayage complet de la trace, en millisecondes. */
const CYCLE_MS = 6000;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  points: 12,
  frames: 16,
  capacite: 32,
  invalidation: false,
  playing: false,
  progress: 0,
  cursorMs: 0,
  lastTs: 0,
  rafId: 0,
  inView: true,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
  resultat: null,
  trace: [],
};

/* ---------- Formules et machine à projections déterministe ---------- */

const fmt = (n, d = 0) => {
  const f = Math.pow(10, d);
  return (Math.round(n * f) / f).toFixed(d).replace('.', ',');
};

const pct = (n) => `${fmt(n * 100, 1)} %`;

const arrondi = (v) => Math.round(v * 100) / 100;

/* Jeu de points déterministe, réparti sur une grille régulière du cadre
   large. Aucun tirage aléatoire : la position dépend seulement du rang. */
function genererPoints(n) {
  const cols = Math.max(2, Math.ceil(Math.sqrt(n * 1.5)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const lon = BOUNDS_LARGE.minLon + (c / Math.max(1, cols - 1)) * (BOUNDS_LARGE.maxLon - BOUNDS_LARGE.minLon);
    const lat = BOUNDS_LARGE.maxLat - (r / Math.max(1, rows - 1)) * (BOUNDS_LARGE.maxLat - BOUNDS_LARGE.minLat);
    out.push({ i, lon: arrondi(lon), lat: arrondi(lat) });
  }
  return out;
}

/* Projection affine identique à celle de geography.js. Fonction pure. */
function projeter(p, b) {
  const spanLon = b.maxLon - b.minLon;
  const spanLat = b.maxLat - b.minLat;
  return {
    nx: (p.lon - b.minLon) / spanLon,
    ny: (b.maxLat - p.lat) / spanLat,
  };
}

/* Clé de cache : elle doit contenir TOUTES les entrées de la fonction,
   bornes comprises, sinon un changement de cadre renvoie une valeur périmée. */
function cleProjection(p, b) {
  return [p.lon, p.lat, b.minLon, b.maxLon, b.minLat, b.maxLat, MAP_W, MAP_H].join('|');
}

/* Cache LRU à capacité bornée. Une capacité de 0 signifie « cache éteint ». */
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

/* Charge de travail réelle : `frames` passes successives sur les mêmes
   points. Avec invalidation, les bornes changent à mi-parcours et le cache
   est vidé — on paie alors une seconde passe complète. */
function runWorkload(n, frames, capacite, invalidation) {
  const points = genererPoints(n);
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

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e086-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e086-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e086-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e086-panel p{margin:5px 0;max-width:68ch}
#geography-e086-panel .geography-e086-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e086-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e086-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e086-table th,#geography-e086-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e086-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e086-limite{
  margin:8px 0;padding:8px 9px;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.04);
}
#geography-e086-limite ol{margin:4px 0 0;padding-left:20px}
#geography-e086-limite li{margin:2px 0}
#geography-e086-curseurs{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e086-panel .geography-e086-curseur{
  display:block;width:100%;min-height:36px;margin:2px 0 6px;accent-color:var(--gold,#e6b96f);
}
.geography-e086-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e086-canvas{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e086-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e086-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e086-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e086-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e086-panel button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16);
}
#geography-e086-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e086-note{font-size:10px;color:var(--muted);margin:6px 0 0}
#geography-e086-panel[data-geography-e086-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e086-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e086-panel{font-size:10px;padding:9px}
  #geography-e086-canvas{height:210px}
}
`;

/* ---------- Construction du panneau (texte sémantique) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une projection est une fonction pure : à des coordonnées et un cadre donnés, elle renvoie toujours le même point écran. La mémoïsation (ou cache de projection) consistait à stocker ce résultat pour ne pas le recalculer. Le coût d’une passe est le nombre de projections effectivement calculées, pas le nombre de demandes.',
    'La clé d’un cache doit contenir toutes les entrées de la fonction : longitude, latitude, mais aussi les bornes du cadre et les dimensions. Omettre les bornes et le cache renvoie une position périmée dès que la carte change de cadre : c’est l’invalidation manquée.',
    'Un cache à capacité bornée évince l’entrée la plus anciennement utilisée (LRU, least recently used). Trop petit, il évince trop tôt et retombe au coût d’un recalcul intégral ; la sobriété des calculs est donc un compromis entre mémoire et nombre d’opérations.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e086-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticFormules() {
  const wrap = document.createElement('div');
  const formules = [
    'Coût sans cache = points × passes. Coût avec cache = nombre de calculs réellement effectués par le cache LRU (première passe, puis évictions et invalidations). Opérations évitées = coût sans cache − coût avec cache.',
    'Taux de réussite = réussites / demandes, où une réussite (hit) est une clé déjà présente et un échec (miss) un calcul neuf. Référence : 0 % sans cache, 100 % si chaque demande après la première est servie depuis le cache.',
    'Une invalidation vide le cache : les bornes changant, les clés changent aussi. Le laboratoire place un changement de cadre à mi-parcours, ce qui ajoute exactement une passe complète au coût avec cache.',
    'La clé est construite comme longitude | latitude | minLon | maxLon | minLat | maxLat | largeur | hauteur. Toute entrée omise de cette clé est une source d’erreur silencieuse ; aucune valeur n’est tirée au hasard.',
  ];
  formules.forEach((texte) => {
    const p = document.createElement('p');
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Coût de la même charge de travail (12 points, 20 passes) selon la stratégie. Référence : le recalcul intégral de 240 projections. Tous les chiffres sont recalculés par runWorkload() et non mémorisés.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Stratégie', 'Projections calculées', 'Opérations évitées', 'Taux de réussite'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const scenarios = [
    ['Sans cache (référence)', runWorkload(12, 20, 0, false)],
    ['Cache LRU, capacité 32', runWorkload(12, 20, 32, false)],
    ['Cache LRU, capacité 4', runWorkload(12, 20, 4, false)],
    ['Cache 32 + 1 invalidation', runWorkload(12, 20, 32, true)],
  ];

  const tbody = document.createElement('tbody');
  scenarios.forEach(([libelle, r]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = libelle;
    const tdCalcul = document.createElement('td');
    tdCalcul.textContent = `${fmt(r.avecCache)} / ${fmt(r.sansCache)}`;
    const tdEvitees = document.createElement('td');
    tdEvitees.textContent = fmt(r.evitees);
    const tdTaux = document.createElement('td');
    tdTaux.textContent = pct(r.taux);
    tr.append(th, tdCalcul, tdEvitees, tdTaux);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function staticLimite() {
  const box = document.createElement('div');
  box.id = LIMITE_ID;
  const h = document.createElement('h3');
  h.textContent = 'Limite falsifiable — défi en cinq temps';
  const p = document.createElement('p');
  p.textContent = 'Un cache économise des calculs, jamais de la justesse : s’il est mal invalidé, il économise des calculs faux. Voici comment tenter de le faire échouer.';
  const ol = document.createElement('ol');
  const etapes = [
    'Prédiction : avec 12 points, 20 passes et un cache de capacité 32, le coût passe de 240 à 12 projections (taux de réussite 95 %) ; avec une invalidation à mi-parcours, il remonte à 24.',
    'Réglage : placer la capacité à 32, les passes à 20, puis activer et désactiver « Invalider à mi-parcours ».',
    'Résultat attendu : le coût avec cache double (12 puis 24) et la case « Invalidation » du tableau donne le même ordre de grandeur.',
    'Falsification : éteindre le cache (capacité 0) doit ramener le coût avec cache à 240 et le taux à 0 %. Si le chiffre ne bouge pas, le cache n’est pas réellement traversé. Si une invalidation ne change rien, la clé n’inclut pas les bornes.',
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

function curseur(id, valeurId, libelle, min, max, step, valeur, format, aria) {
  const row = document.createElement('p');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(`${libelle} : `));
  const out = document.createElement('span');
  out.id = valeurId;
  out.className = 'geography-e086-valeur';
  out.textContent = format(valeur);
  label.appendChild(out);
  row.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.className = 'geography-e086-curseur';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(valeur);
  input.setAttribute('aria-label', aria);
  return { row, input };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      points: document.getElementById(POINTS_ID),
      pointsOut: document.getElementById(POINTS_OUT_ID),
      frames: document.getElementById(FRAMES_ID),
      framesOut: document.getElementById(FRAMES_OUT_ID),
      capacite: document.getElementById(CAP_ID),
      capaciteOut: document.getElementById(CAP_OUT_ID),
      invalidation: document.getElementById(INVALID_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      note: document.getElementById(NOTE_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e086-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Cache de projection et sobriété des calculs');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une projection est une fonction pure : on peut mémoriser son résultat. Le laboratoire ci-dessous fait réellement passer une charge de travail dans un cache LRU et compare le nombre de projections calculées au recalcul intégral, sans aucune requête réseau.');

  const reglages = ctx.el('h3', '', 'Réglages déterministes');
  const boite = ctx.el('div');
  boite.id = 'geography-e086-curseurs';

  const pts = curseur(POINTS_ID, POINTS_OUT_ID, 'Nombre de points', 6, 24, 2, S.points,
    (v) => `${v}`, 'Nombre de points à projeter, de 6 à 24 par pas de 2');
  const fr = curseur(FRAMES_ID, FRAMES_OUT_ID, 'Passes de rendu', 2, 30, 1, S.frames,
    (v) => `${v}`, 'Nombre de passes successives, de 2 à 30');
  const cap = curseur(CAP_ID, CAP_OUT_ID, 'Capacité du cache', 0, 64, 4, S.capacite,
    (v) => v === 0 ? 'éteint' : `${v} entrées`, 'Capacité du cache LRU, de 0 (éteint) à 64 entrées');

  const invalid = ctx.el('button', '', S.invalidation ? '■ Invalidation : active' : '□ Invalidation : inactive');
  invalid.type = 'button';
  invalid.id = INVALID_ID;
  invalid.setAttribute('aria-pressed', S.invalidation ? 'true' : 'false');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Comparaison du coût avec et sans cache de projection. Flèche gauche ou droite : nombre de points ; flèche haut ou bas : passes de rendu ; touches 1, 2, 3 : capacité éteinte, 16 ou 64 entrées ; touche i : invalider à mi-parcours ; Entrée : lancer ou arrêter le balayage.');

  const readout = ctx.el('p', 'geography-e086-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter' : '▶ Lancer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const note = ctx.el('p', 'geography-e086-note', 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; en mouvement réduit l’image se fige, sans balayage.');
  note.id = NOTE_ID;

  boite.append(pts.row, pts.input, fr.row, fr.input, cap.row, cap.input, invalid);
  panel.append(
    title, lead, staticFacts(), staticFormules(), staticTable(), staticLimite(),
    reglages, boite, canvas, readout, play, note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    points: pts.input, pointsOut: pts.out,
    frames: fr.input, framesOut: fr.out,
    capacite: cap.input, capaciteOut: cap.out,
    invalidation: invalid,
    canvas, readout, play, note,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule passe) ---------- */

function reducedNow() {
  if (typeof reducedMotionFn === 'function') {
    try { return !!reducedMotionFn(); } catch { return false; }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }
  return false;
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 260;
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
  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - 14);
  const mapW = Math.round(iw * 0.52);
  const barX = pad + mapW + 14;
  const barW = Math.max(10, iw - mapW - 14);

  /* Zone gauche : cadre projeté, points et requête courante. */
  const mx = pad;
  const my = pad + 16;
  const mh = ih - 16;
  g.font = '9px sans-serif';
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillText('Cadre projeté', mx, pad + 8);

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
    : Math.min(r.trace.length - 1, Math.floor(S.progress * r.trace.length));
  const courant = r.trace[idx] || r.trace[r.trace.length - 1];

  /* On dessine une seule passe (les positions sont identiques d'une passe à
     l'autre) : c'est précisément ce que le cache évite de recalculer. */
  const passe = courant.frame;
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
  g.fillText('Projections calculées', barX, pad + 8);
  const labelY = my + 6;
  const barH = 14;
  const maxCost = Math.max(1, r.sansCache);

  g.fillStyle = 'rgba(214,207,193,.95)';
  g.fillText(`Sans cache : ${fmt(r.sansCache)}`, barX, labelY);
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(barX, labelY + 6, barW, barH);
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.fillRect(barX + 1, labelY + 7, barW - 2, barH - 2);

  const withY = labelY + 48;
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Avec cache : ${fmt(r.avecCache)}`, barX, withY);
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.strokeRect(barX, withY + 6, barW, barH);
  g.fillStyle = 'rgba(244,214,158,.7)';
  g.fillRect(barX + 1, withY + 7, Math.max(0, (barW - 2) * (r.avecCache / maxCost)), barH - 2);

  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(`Évitées ${fmt(r.evitees)} · réussite ${pct(r.taux)}`, barX, withY + 44);
  g.fillText(`Évictions ${fmt(r.evictions)} · taille ${fmt(r.taille)}`, barX, withY + 58);
  g.fillText(courant.disabled ? 'Cache éteint'
    : courant.hit ? 'Requête courante : réussite' : 'Requête courante : échec', barX, withY + 72);
  g.fillText(r.bornesChangees && passe >= Math.floor(r.frames / 2)
    ? 'Bornes serrées après invalidation' : 'Bornes larges', barX, withY + 86);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const r = S.resultat;
  if (!r) return;
  const idx = reducedNow()
    ? r.trace.length - 1
    : Math.min(r.trace.length - 1, Math.floor(S.progress * r.trace.length));
  const courant = r.trace[idx] || r.trace[0];
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Projections calculées : '));
  n.appendChild(fort(`${fmt(r.avecCache)}`));
  n.appendChild(document.createTextNode(` sur ${fmt(r.sansCache)} demandes (recalcul intégral) · évitées ${fmt(r.evitees)} · réussite `));
  n.appendChild(fort(pct(r.taux)));
  n.appendChild(document.createTextNode(` (référence : 0 % sans cache, 100 % parfait) · évictions ${fmt(r.evictions)} · taille ${fmt(r.taille)}/${r.capacite === 0 ? 'éteinte' : `${r.capacite}`} · requête courante : `));
  n.appendChild(fort(courant.disabled ? 'cache éteint' : courant.hit ? 'réussite' : 'échec'));
  n.appendChild(document.createTextNode(r.bornesChangees ? ' · une invalidation à mi-parcours' : ' · aucune invalidation'));
  n.appendChild(document.createTextNode('.'));
}

function updateNote() {
  const n = S.nodes.note;
  if (!n) return;
  n.textContent = reducedNow()
    ? 'Mouvement réduit actif : une seule image est dessinée et aucune boucle rAF ne tourne ; les chiffres restent identiques.'
    : 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; le coût n’est recalculé qu’au changement de réglage, pas à chaque image.';
}

function recompute() {
  S.resultat = runWorkload(S.points, S.frames, S.capacite, S.invalidation);
  S.trace = S.resultat.trace;
  S.progress = 0;
  S.cursorMs = 0;
  syncControls();
}

function syncControls() {
  const n = S.nodes;
  if (n.points) n.points.value = String(S.points);
  if (n.pointsOut) n.pointsOut.textContent = `${S.points}`;
  if (n.frames) n.frames.value = String(S.frames);
  if (n.framesOut) n.framesOut.textContent = `${S.frames}`;
  if (n.capacite) n.capacite.value = String(S.capacite);
  if (n.capaciteOut) n.capaciteOut.textContent = S.capacite === 0 ? 'éteint' : `${S.capacite} entrées`;
  if (n.invalidation) {
    n.invalidation.textContent = S.invalidation ? '■ Invalidation : active' : '□ Invalidation : inactive';
    n.invalidation.setAttribute('aria-pressed', S.invalidation ? 'true' : 'false');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter' : '▶ Lancer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyE086Reduced = reducedNow() ? '1' : '0';
  updateNote();
  updateReadout();
  drawLab();
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
  if (!S.inView) return;
  if (reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Horloge unique : une seule fonction tick, un seul identifiant rafId. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || reducedNow()) return;
  if (S.lastTs) {
    const dt = Math.min(64, Math.max(0, ts - S.lastTs));
    S.cursorMs += dt;
    S.progress = (S.cursorMs % CYCLE_MS) / CYCLE_MS;
  }
  S.lastTs = ts;
  drawLab();
  updateReadout();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

let reducedMotionFn = null;

function applyReduced(reduced) {
  if (reduced) {
    stopLoop();
    S.playing = false;
    S.progress = 1;
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
      const onChange = () => applyReduced(mq.matches);
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

  if (typeof ctx.reducedMotion === 'function') reducedMotionFn = ctx.reducedMotion;

  ctx.css('geography-e086', CSS);

  S.nodes = ensurePanel(ctx);
  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.progress = 1;
  }

  recompute();

  if (S.nodes.fresh) {
    const n = S.nodes;
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
    n.invalidation.addEventListener('click', () => {
      S.invalidation = !S.invalidation;
      recompute();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow()) {
        S.playing = false;
        S.progress = 1;
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 2 : -2;
        S.points = Math.max(6, Math.min(24, S.points + step));
        recompute();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.frames = Math.max(2, Math.min(30, S.frames + step));
        recompute();
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        S.capacite = [0, 16, 64][Number(event.key) - 1];
        recompute();
      } else if (event.key === 'i' || event.key === 'I') {
        S.invalidation = !S.invalidation;
        recompute();
      } else if (event.key === 'Enter' || event.key === ' ') {
        n.play.click();
      } else {
        used = false;
      }
      if (used) event.preventDefault();
    });
  }

  installGlobalListeners();
  if (S.playing && S.inView && !reducedNow()) startLoop();
});
