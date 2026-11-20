import { register } from './registry.js';
import { state, currentCountry, currentPlaces, stepPlace } from '../../domain/store.js';

/* Lentille E069 — vue GEOGRAPHIE.
 * Thème : information détaillée au clic sur un lieu.
 *
 * Les dix chantiers E069-01 … E069-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E069.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu substantiel est du texte sémantique réel (h2, h3, p, dl,
 * ul) inséré dans le DOM : il reste lisible et indexable même sans animation.
 * Le canvas de localisation n'est qu'un laboratoire déterministe dont chaque
 * information est aussi écrite en toutes lettres dans le panneau.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e069';
const FICHE_ID = 'geography-e069-fiche';
const TITLE_ID = 'geography-e069-title';
const IDENTITY_ID = 'geography-e069-identity';
const COORDS_ID = 'geography-e069-coords';
const FUNCS_ID = 'geography-e069-functions';
const MEMO_ID = 'geography-e069-memo';
const CANVAS_ID = 'geography-e069-minimap';
const MEASURES_ID = 'geography-e069-measures';
const COUNT_ID = 'geography-e069-count';
const PREV_ID = 'geography-e069-prev';
const NEXT_ID = 'geography-e069-next';

/* Constantes de la projection affine de la vue (geography.js:10-11, 34-44). */
const MAP_W = 900;
const MAP_H = 620;

const HIERARCHY = {
  regional: 'Portée régionale',
  local: 'Portée locale',
  national: 'Portée nationale',
  continental: 'Portée continentale',
  global: 'Portée globale',
};

/* API d'injection, mémorisée à l'entrée pour rester disponible dans les helpers. */
let API = null;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  nodes: {},
  reveal: 1,
  revealFrom: 0.55,
  revealStart: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  escapeBound: false,
};

/* ---------- Utilitaires déterministes (aucune donnée fabriquée) ---------- */

const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const fmt3 = (n) => (Math.round(n * 1000) / 1000).toFixed(3).replace('.', ',');

const el = (tag, cls, text) => API.el(tag, cls, text);

/* E069-04 — conversion décimal → degrés/minutes/secondes avec hémisphère. */
function toDMS(value, isLat) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'non renseignée';
  const abs = Math.abs(num);
  let deg = Math.floor(abs);
  let min = Math.floor((abs - deg) * 60);
  let sec = Math.round((((abs - deg) * 60) - min) * 60);
  if (sec === 60) { sec = 0; min += 1; }
  if (min === 60) { min = 0; deg += 1; }
  const hemi = isLat ? (num < 0 ? 'S' : 'N') : (num < 0 ? 'O' : 'E');
  return `${deg}° ${String(min).padStart(2, '0')}′ ${String(sec).padStart(2, '0')}″ ${hemi}`;
}

function hierarchyLabel(value) {
  if (!value) return 'Hiérarchie non renseignée';
  return HIERARCHY[value] || `Hiérarchie : ${value}`;
}

function activeSelection() {
  const places = currentPlaces();
  const total = places.length;
  const index = total ? Math.max(0, Math.min(total - 1, Number(state.placeIndex) || 0)) : 0;
  return { places, total, index, place: places[index] || null, country: currentCountry() };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e069-fiche{
  margin:12px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
  opacity:var(--geography-e069-reveal,1);
}
#geography-e069-fiche h2{margin:0 0 4px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e069-fiche h3{margin:11px 0 3px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#geography-e069-fiche p{margin:4px 0;max-width:68ch}
#geography-e069-fiche .geography-e069-lead{color:var(--muted)}
#geography-e069-fiche dl{margin:4px 0}
#geography-e069-fiche dt{font-weight:600;color:var(--ink-soft,#d7d1c6)}
#geography-e069-fiche dd{margin:0 0 3px 10px}
#geography-e069-fiche ul{margin:3px 0;padding-left:18px}
#geography-e069-fiche li{margin:1px 0}
#geography-e069-fiche .geography-e069-none{color:var(--muted);font-style:italic}
#geography-e069-coords{font-variant-numeric:tabular-nums}
#geography-e069-minimap{
  display:block;width:100%;height:200px;margin:6px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e069-measures{
  min-height:34px;margin:8px 0 4px;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-variant-numeric:tabular-nums;
}
#geography-e069-measures strong{color:var(--gold-bright,#f4d69e)}
#geography-e069-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
#geography-e069-fiche button{
  min-height:44px;min-width:44px;padding:6px 12px;border:1px solid var(--line);
  border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;
}
#geography-e069-fiche button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e069-fiche button:disabled{opacity:.45;cursor:not-allowed}
#geography-e069-count{font-variant-numeric:tabular-nums;color:var(--muted)}
#geography-e069-fiche :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  #geography-e069-fiche{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e069-fiche{font-size:10px;padding:9px}
  #geography-e069-minimap{height:170px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

/* E069-01 — section sémantique de la fiche, complète et lisible sans JS. */
function buildFiche(ctx) {
  /* Garde anti-doublon : un seul panneau, même si la coque ne vide pas le stage. */
  const old = document.getElementById(FICHE_ID);
  if (old && old.parentNode) old.parentNode.removeChild(old);

  const fiche = el('section', 'geography-e069-fiche');
  fiche.id = FICHE_ID;
  fiche.setAttribute('role', 'region');
  fiche.setAttribute('aria-labelledby', TITLE_ID);

  const title = el('h2', '', 'Fiche détaillée du lieu');
  title.id = TITLE_ID;
  const lead = el('p', 'geography-e069-lead',
    'Cette fiche décrit le lieu actuellement sélectionné. Cliquez un marqueur de la carte ou un lieu de la liste pour l’actualiser : chaque champ provient du jeu de données vérifié de l’atlas, aucune valeur n’est inventée.');

  const identityTitle = el('h3', '', 'Identité');
  const identity = el('dl', '');
  identity.id = IDENTITY_ID;

  const coordsTitle = el('h3', '', 'Coordonnées');
  const coords = el('p', '');
  coords.id = COORDS_ID;

  const funcsTitle = el('h3', '', 'Fonctions attestées');
  const funcs = el('ul', '');
  funcs.id = FUNCS_ID;

  const memoTitle = el('h3', '', 'Mémoires et débats');
  const memo = el('ul', '');
  memo.id = MEMO_ID;

  const mapTitle = el('h3', '', 'Localisation dans le cadre');
  const canvas = el('canvas', '');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Mini-carte de localisation : contour du pays et position du lieu actif dans le cadre, sans tuile ni ressource distante.');
  const mapNote = el('p', 'geography-e069-lead',
    'Le contour et le point sont projetés par la même transformation affine lat/lon que la carte principale ; la position du lieu est aussi donnée en chiffres ci-dessus.');

  const measures = el('p', '');
  measures.id = MEASURES_ID;
  measures.setAttribute('role', 'status');
  measures.setAttribute('aria-live', 'polite');

  const nav = el('div', '');
  nav.id = 'geography-e069-nav';
  const prev = el('button', '', '← Lieu précédent');
  prev.type = 'button';
  prev.id = PREV_ID;
  prev.setAttribute('aria-label', 'Afficher la fiche du lieu précédent');
  const count = el('span', '');
  count.id = COUNT_ID;
  const next = el('button', '', 'Lieu suivant →');
  next.type = 'button';
  next.id = NEXT_ID;
  next.setAttribute('aria-label', 'Afficher la fiche du lieu suivant');
  nav.append(prev, count, next);

  fiche.append(title, lead, identityTitle, identity, coordsTitle, coords,
    funcsTitle, funcs, memoTitle, memo, mapTitle, canvas, mapNote, measures, nav);

  const host = ctx.layout || ctx.stage;
  const panel = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  panel.insertBefore(fiche, panel.firstChild);
  return fiche;
}

function collect() {
  return {
    fiche: document.getElementById(FICHE_ID),
    identity: document.getElementById(IDENTITY_ID),
    coords: document.getElementById(COORDS_ID),
    funcs: document.getElementById(FUNCS_ID),
    memo: document.getElementById(MEMO_ID),
    canvas: document.getElementById(CANVAS_ID),
    measures: document.getElementById(MEASURES_ID),
    count: document.getElementById(COUNT_ID),
    prev: document.getElementById(PREV_ID),
    next: document.getElementById(NEXT_ID),
  };
}

/* ---------- Remplissage sémantique de la fiche ---------- */

function fillDefinitionList(node, rows) {
  node.textContent = '';
  rows.forEach(([term, value]) => {
    const dt = el('dt', '', term);
    const dd = el('dd', '', value);
    node.append(dt, dd);
  });
}

/* E069-05 — listes structurées des fonctions et mémoires du lieu. */
function fillList(node, values, emptyText) {
  node.textContent = '';
  const items = Array.isArray(values) ? values.filter(Boolean) : [];
  if (!items.length) {
    const li = el('li', 'geography-e069-none', emptyText);
    node.appendChild(li);
    return;
  }
  items.forEach((value) => node.appendChild(el('li', '', String(value))));
}

/* E069-03 — en-tête d'identité : nom, rang hiérarchique, noms historiques. */
function renderIdentity(place) {
  const historical = Array.isArray(place.historical) ? place.historical.filter(Boolean) : [];
  fillDefinitionList(S.nodes.identity, [
    ['Nom', place.label || 'Lieu sans nom'],
    ['Rang', hierarchyLabel(place.hierarchy)],
    ['Noms historiques', historical.length ? historical.join(' · ') : 'Aucun nom historique renseigné'],
  ]);
}

/* E069-04 — coordonnées décimales et sexagésimales depuis les valeurs réelles. */
function renderCoords(place) {
  const n = S.nodes.coords;
  n.textContent = '';
  if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon))) {
    n.appendChild(document.createTextNode('Coordonnées non renseignées pour ce lieu.'));
    return;
  }
  n.appendChild(document.createTextNode(
    `Décimales : latitude ${fmt3(place.lat)}, longitude ${fmt3(place.lon)}. Sexagésimales : `));
  const dms = document.createElement('strong');
  dms.textContent = `${toDMS(place.lat, true)} · ${toDMS(place.lon, false)}.`;
  n.appendChild(dms);
}

/* E069-07 — mesures chiffrées comparées à la diagonale du cadre (référence). */
function renderMeasures(place, country) {
  const n = S.nodes.measures;
  if (!n || !place || !country || !country.bounds) {
    if (n) n.textContent = 'Mesures indisponibles : emprise du pays non renseignée.';
    return;
  }
  const b = country.bounds;
  const spanLon = b.maxLon - b.minLon;
  const spanLat = b.maxLat - b.minLat;
  if (!(spanLon > 0) || !(spanLat > 0)) {
    n.textContent = 'Mesures indisponibles : emprise du pays invalide.';
    return;
  }
  const midLon = (b.minLon + b.maxLon) / 2;
  const midLat = (b.minLat + b.maxLat) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180);
  const kmX = (lon) => lon * cos * 111.32;
  const kmY = (lat) => lat * 110.57;
  const dx = kmX(place.lon - midLon);
  const dy = kmY(place.lat - midLat);
  const dist = Math.hypot(dx, dy);
  const diag = Math.hypot(kmX(spanLon), kmY(spanLat));
  const ratio = diag > 0 ? dist / diag : 0;

  const strong = (text) => {
    const s = document.createElement('strong');
    s.textContent = text;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Mesures vérifiables · latitude '));
  n.appendChild(strong(`${fmt3(place.lat)}°`));
  n.appendChild(document.createTextNode(' · longitude '));
  n.appendChild(strong(`${fmt3(place.lon)}°`));
  n.appendChild(document.createTextNode(' · écart au centre du cadre ≈ '));
  n.appendChild(strong(`${fmt2(dist)} km`));
  n.appendChild(document.createTextNode(' (référence : diagonale du cadre ≈ '));
  n.appendChild(strong(`${fmt2(diag)} km`));
  n.appendChild(document.createTextNode('), soit '));
  n.appendChild(strong(`${fmt2(ratio)}×`));
  n.appendChild(document.createTextNode(' la diagonale. Ordres de grandeur calculés par approximation équirectangulaire, sans donnée distante.'));
}

/* ---------- Laboratoire canvas : mini-carte déterministe ---------- */

/* E069-06 — mini-carte canvas de localisation dans le cadre (affine, DPR ≤ 2). */
function drawMiniMap(place, country) {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 200;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const b = country && country.bounds;
  if (!b || !(b.maxLon - b.minLon > 0) || !(b.maxLat - b.minLat > 0)) {
    g.fillStyle = 'rgba(214,207,193,.6)';
    g.font = '11px sans-serif';
    g.fillText('Emprise du pays indisponible.', 10, 20);
    return;
  }

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const project = (lon, lat) => [
    pad + ((lon - b.minLon) / (b.maxLon - b.minLon)) * iw,
    pad + ((b.maxLat - lat) / (b.maxLat - b.minLat)) * ih,
  ];

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad, iw, ih);

  const outline = (country.outline || []).map(([lon, lat]) => project(lon, lat));
  if (outline.length > 2) {
    g.beginPath();
    outline.forEach(([x, y], i) => { if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
    g.closePath();
    g.strokeStyle = 'rgba(230,185,111,.8)';
    g.lineWidth = 1.2;
    g.stroke();
  }

  if (place && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon))) {
    const [x, y] = project(place.lon, place.lat);
    g.strokeStyle = 'rgba(244,214,158,.95)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, 6, 0, Math.PI * 2);
    g.moveTo(x - 10, y); g.lineTo(x + 10, y);
    g.moveTo(x, y - 10); g.lineTo(x, y + 10);
    g.stroke();
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText(place.label || 'Lieu', Math.min(x + 9, cssW - 70), Math.max(y - 8, 12));
  }

  /* Nord : repère textuel, jamais la couleur seule. */
  g.strokeStyle = 'rgba(255,255,255,.75)';
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1;
  const nx = cssW - pad - 6;
  const ny = pad + 6;
  g.beginPath();
  g.moveTo(nx, ny); g.lineTo(nx, ny + 16);
  g.moveTo(nx - 4, ny + 5); g.lineTo(nx, ny); g.lineTo(nx + 4, ny + 5);
  g.stroke();
  g.font = '10px sans-serif';
  g.fillText('N', nx - 4, ny + 28);

  g.fillStyle = 'rgba(214,207,193,.75)';
  g.font = '10px sans-serif';
  g.fillText(country.name || '', pad + 2, cssH - 4);
}

/* ---------- Rendu complet ---------- */

function renderFiche() {
  const { place, country, index, total } = activeSelection();
  if (!place) {
    fillDefinitionList(S.nodes.identity, [['Nom', 'Aucun lieu sélectionné'], ['Rang', '—'], ['Noms historiques', '—']]);
    S.nodes.coords.textContent = 'Aucun lieu à décrire pour ce périmètre.';
    fillList(S.nodes.funcs, [], 'Aucune fonction renseignée.');
    fillList(S.nodes.memo, [], 'Aucune mémoire renseignée.');
    S.nodes.measures.textContent = 'Mesures indisponibles : aucun lieu sélectionné.';
    drawMiniMap(null, country);
  } else {
    renderIdentity(place);
    renderCoords(place);
    fillList(S.nodes.funcs, place.functions, 'Aucune fonction renseignée.');
    fillList(S.nodes.memo, place.contestations, 'Aucune mémoire renseignée.');
    renderMeasures(place, country);
    drawMiniMap(place, country);
  }

  S.nodes.count.textContent = total ? `Lieu ${index + 1} / ${total}` : 'Aucun lieu';
  S.nodes.prev.disabled = total === 0 || index <= 0;
  S.nodes.next.disabled = total === 0 || index >= total - 1;
  applyReveal();
}

/* ---------- Animation d'ouverture unique ---------- */

/* E069-09 — une seule boucle rAF, pause sur document.hidden, valeur deterministe. */
function applyReveal() {
  const fiche = S.nodes.fiche;
  if (fiche) fiche.style.setProperty('--geography-e069-reveal', String(S.reveal));
}

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.revealStart = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if ((typeof document !== 'undefined' && document.hidden) || S.reduced) {
    S.reveal = 1;
    applyReveal();
    return;
  }
  if (!S.revealStart) S.revealStart = ts;
  const t = Math.min(1, (ts - S.revealStart) / 320);
  const eased = 1 - (1 - t) * (1 - t);
  S.reveal = S.revealFrom + (1 - S.revealFrom) * eased;
  applyReveal();
  if (t < 1) S.rafId = requestAnimationFrame(tick);
}

function startReveal() {
  if (S.reduced) {
    stopLoop();
    S.reveal = 1;
    applyReveal();
    return;
  }
  stopLoop();
  S.revealFrom = 0.55;
  S.reveal = S.revealFrom;
  applyReveal();
  startLoop();
}

/* ---------- Observation des clics sur les sources de sélection ---------- */

/* E069-02 — observateur de clic sur marqueurs et liste, sans double navigation. */
function wireSources(ctx) {
  const scope = ctx.layout || ctx.stage;
  if (!scope || typeof scope.querySelectorAll !== 'function') return;
  const sources = [
    ...Array.from(scope.querySelectorAll('.geo-marker')),
    ...Array.from(scope.querySelectorAll('.c3b-place-item')),
  ];
  sources.forEach((node) => {
    if (!node || node.dataset.geographyE069Wired === '1') return;
    node.dataset.geographyE069Wired = '1';
    /* La navigation reste gérée par la vue (set({ placeIndex }) ; on borne ici
       seulement l'animation d'ouverture, sans écrire dans le store. */
    node.addEventListener('click', () => startReveal());
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') startReveal();
    });
  });
}

/* ---------- Écouteurs globaux (une seule fois) ---------- */

/* E069-10 — visibilité, mouvement réduit et touche Échap, installés une seule fois. */
function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.reveal < 1 && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        if (S.reduced) {
          stopLoop();
          S.reveal = 1;
          applyReveal();
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (typeof document !== 'undefined' && !S.escapeBound) {
    S.escapeBound = true;
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const fiche = S.nodes.fiche;
      if (!fiche || typeof document.activeElement !== 'object' || !document.activeElement) return;
      if (!fiche.contains(document.activeElement)) return;
      stopLoop();
      S.reveal = 1;
      applyReveal();
    });
  }
}

/* ---------- Point d'entrée ---------- */

register('E069', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  API = ctx;

  ctx.css(CSS_ID, CSS);
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  buildFiche(ctx);
  S.nodes = collect();

  /* E069-08 — navigation entre fiches via l'action canonique stepPlace. */
  const { index, total } = activeSelection();
  const nav = S.nodes;
  nav.prev.addEventListener('click', () => {
    if (index > 0) { stepPlace(-1); startReveal(); }
  });
  nav.next.addEventListener('click', () => {
    if (index < total - 1) { stepPlace(1); startReveal(); }
  });

  renderFiche();
  wireSources(ctx);
  installGlobalListeners();

  if (S.reduced) {
    stopLoop();
    S.reveal = 1;
    applyReveal();
  }
});
