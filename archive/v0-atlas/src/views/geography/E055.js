import { register } from './registry.js';

/* Lentille E055 — vue GEOGRAPHIE.
 * Thème : tableau accessible des lieux et navigation séquentielle.
 *
 * Les dix chantiers E055-01 … E055-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E055.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau avec en-têtes de colonnes et de lignes) présent dans
 * le DOM même sans animation ; le canvas n'est qu'un laboratoire qui
 * illustre un chemin de navigation déterministe.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e055';
const PANEL_ID = 'geography-e055-panel';
const TITLE_ID = 'geography-e055-title';
const TABLE_ID = 'geography-e055-table';
const NAV_ID = 'geography-e055-nav';
const ROW_ID_PREFIX = 'geography-e055-row-';
const CANVAS_ID = 'geography-e055-canvas';
const READOUT_ID = 'geography-e055-readout';
const KEYS_ID = 'geography-e055-keys';
const BADGE_ID = 'geography-e055-badge';

/* Lieux réels, relevés dans src/data/dataset.js (aucune coordonnée fabriquée). */
const PLACES = [
  { key: 'marseille', label: 'Marseille', lat: 43.296346, lon: 5.369889, role: 'Port, cité marchande' },
  { key: 'lyon', label: 'Lyon', lat: 45.7578, lon: 4.8322, role: 'Capitale provinciale' },
  { key: 'alise', label: 'Alise-Sainte-Reine', lat: 47.5375, lon: 4.49083333, role: 'Oppidum, site de bataille' },
  { key: 'versailles', label: 'Versailles', lat: 48.8053, lon: 2.135, role: 'Résidence royale' },
  { key: 'paris', label: 'Paris', lat: 48.856578, lon: 2.351828, role: 'Chef-lieu, centre politique' },
];

/* Constantes canoniques. */
const R_TERRE = 6371;                 /* rayon moyen de la Terre, km */
const RAD = Math.PI / 180;
const PAS_UNIQUE = 1;                 /* une touche = une ligne franchie */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  index: 0,            /* ligne courante du tableau / de la navigation */
  playing: false,
  phase: 0,            /* position du curseur animé, entre 0 et 1 */
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* Distance du grand cercle (haversine) entre deux lieux, en km. */
function haversine(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* Nombre de pas séquentiels entre deux rangs : |écart| (une touche = un pas). */
function pasSequentiels(depart, arrivee) {
  return Math.abs(arrivee - depart);
}

/* Voisin le plus proche d'un lieu, en km, sur l'effectif complet. */
function nearestDistance(index) {
  let best = Infinity;
  for (let j = 0; j < PLACES.length; j += 1) {
    if (j === index) continue;
    const d = haversine(PLACES[index], PLACES[j]);
    if (d < best) best = d;
  }
  return best === Infinity ? null : best;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e055-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e055-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e055-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e055-panel p{margin:5px 0;max-width:68ch}
#geography-e055-panel .geography-e055-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e055-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e055-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e055-table th,#geography-e055-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e055-table thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e055-table tbody th{color:var(--ink);font-weight:600;width:3em}
#geography-e055-table tr[data-geography-e055-courant="1"]{background:rgba(230,185,111,.1)}
#geography-e055-nav{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e055-nav legend{padding:0 4px;color:var(--muted)}
#geography-e055-panel .geography-e055-row-btn{
  display:block;width:100%;min-height:36px;margin:3px 0;padding:5px 8px;
  border:1px solid var(--line);border-radius:7px;background:transparent;
  color:var(--muted);font:inherit;font-size:10px;text-align:left;cursor:pointer;
}
#geography-e055-panel .geography-e055-row-btn[aria-current="true"]{
  border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e);
  background:rgba(230,185,111,.1);
}
#geography-e055-panel .geography-e055-row-btn .geography-e055-courant{
  margin-left:6px;color:var(--gold-bright,#f4d69e);font-weight:700;
}
#geography-e055-keys{margin:5px 0;font-size:10px;color:var(--muted)}
#geography-e055-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e055-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e055-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e055-panel button.geography-e055-ctrl{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e055-panel button.geography-e055-ctrl:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
#geography-e055-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e055-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e055-panel[data-geography-e055-reduced="1"] button,
#geography-e055-panel[data-geography-e055-reduced="1"] .geography-e055-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e055-panel button,.geography-e055-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e055-panel{font-size:10px;padding:9px}
  #geography-e055-canvas{height:210px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'La liste de lieux de la vue GEOGRAPHIE est une liste ordonnée (<ol id="c3b-places">) dont chaque entrée est un bouton .c3b-place-item. Le bouton courant porte aria-current à « true » et les boutons utilisent un tabindex mobile : un seul élément a tabindex 0, tous les autres ont tabindex -1. C’est le motif du « focus mobile » (roving tabindex).',
    'La navigation séquentielle avance d’une ligne par touche. Le garde-clavier de la vue (installListKeyGuard) intercepte Flèche bas, Flèche haut, Début et Fin en capture, puis déplace le focus sur le bouton visé. Chaque touche franchit exactement un rang, sauf Début et Fin qui vont respectivement au premier et au dernier rang visible.',
    'Un tableau accessible se distingue d’une simple liste par ses en-têtes : une légende (caption), des en-têtes de colonne (th scope="col") et un en-tête de ligne par rang (th scope="row"). Le rang courant est signalé par du texte explicite, jamais par la seule couleur, afin que la ligne active soit identifiable au lecteur d’écran comme à la vue.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e055-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Les lieux du jeu de données local, présentés en tableau accessible (en-têtes de colonnes et de lignes).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Rang', 'Lieu', 'Latitude', 'Longitude', 'Rôle'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PLACES.forEach((place, i) => {
    const tr = document.createElement('tr');
    tr.id = `geography-e055-ligne-${place.key}`;
    tr.setAttribute('data-geography-e055-courant', i === S.index ? '1' : '0');

    const rang = document.createElement('th');
    rang.scope = 'row';
    rang.textContent = String(i + 1);
    tr.appendChild(rang);

    const nom = document.createElement('td');
    nom.textContent = place.label + (i === S.index ? ' — actif' : '');
    tr.appendChild(nom);

    const lat = document.createElement('td');
    lat.textContent = fmt(place.lat, 4);
    tr.appendChild(lat);

    const lon = document.createElement('td');
    lon.textContent = fmt(place.lon, 4);
    tr.appendChild(lon);

    const role = document.createElement('td');
    role.textContent = place.role;
    tr.appendChild(role);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const nodes = { panel: existant, fresh: false };
    for (const p of PLACES) nodes[p.key] = document.getElementById(ROW_ID_PREFIX + p.key);
    nodes.nav = document.getElementById(NAV_ID);
    nodes.canvas = document.getElementById(CANVAS_ID);
    nodes.readout = document.getElementById(READOUT_ID);
    nodes.anim = document.getElementById('geography-e055-anim');
    nodes.keys = document.getElementById(KEYS_ID);
    nodes.table = document.getElementById(TABLE_ID);
    return nodes;
  }

  const panel = ctx.el('section', 'geography-e055-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Tableau accessible des lieux et navigation séquentielle');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un tableau annonce ses en-têtes et sa ligne courante au lecteur d’écran ; la navigation séquentielle déplace le focus d’une ligne par touche. Ce laboratoire montre les deux mécanismes côte à côte.');

  /* Fieldset de navigation : un bouton par ligne, tabindex mobile. */
  const nav = document.createElement('fieldset');
  nav.id = NAV_ID;
  const navLegend = document.createElement('legend');
  navLegend.textContent = 'Navigation séquentielle (choix d’une ligne)';
  nav.appendChild(navLegend);
  PLACES.forEach((place, i) => {
    const btn = ctx.el('button', 'geography-e055-row-btn');
    btn.type = 'button';
    btn.id = ROW_ID_PREFIX + place.key;
    btn.tabIndex = i === S.index ? 0 : -1;
    if (i === S.index) btn.setAttribute('aria-current', 'true');
    btn.appendChild(document.createTextNode('Rang ' + (i + 1) + ' — ' + place.label));
    const marqueur = ctx.el('span', 'geography-e055-courant', i === S.index ? '◀ COURANT' : '');
    btn.appendChild(marqueur);
    nav.appendChild(btn);
  });

  const keys = ctx.el('p', 'geography-e055-keys', 'Clavier : Flèche bas / Flèche haut avancent ou reculent d’une ligne ; Début va au premier rang, Fin au dernier. Une touche = un pas.');
  keys.id = KEYS_ID;

  const anim = ctx.el('button', 'geography-e055-ctrl', S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours');
  anim.type = 'button';
  anim.id = 'geography-e055-anim';
  anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Tableau schématique de cinq lignes : un triangle et le mot COURANT marquent la ligne courante, une ligne en pointillés montre le chemin séquentiel. Flèche bas et flèche haut : changer de ligne ; Début et Fin : sauter à la première ou à la dernière ligne.');

  const legendText = ctx.el('p', 'geography-e055-keys', 'Triangle et libellé « COURANT » : ligne courante · trait en pointillés : chemin séquentiel (un pas par touche) · carré vide : ligne ordinaire. La forme et le texte portent l’information, pas la couleur.');

  const readout = ctx.el('p', 'geography-e055-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  panel.append(title, lead, staticFacts(), staticTable(), nav, keys, anim, canvas, legendText, readout);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  const nodes = { panel, fresh: true };
  for (const p of PLACES) nodes[p.key] = document.getElementById(ROW_ID_PREFIX + p.key);
  nodes.nav = nav;
  nodes.canvas = canvas;
  nodes.readout = readout;
  nodes.anim = anim;
  nodes.keys = keys;
  nodes.table = document.getElementById(TABLE_ID);
  return nodes;
}

/* ---------- Rendu du laboratoire (une seule grille, un seul canvas) ---------- */

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

  const padX = 16;
  const padTop = 24;
  const bas = cssH - 24;
  const haut = padTop;
  const pas = (bas - haut) / Math.max(1, PLACES.length - 1);
  const yOf = (i) => haut + i * pas;

  /* Chemin séquentiel : une ligne en pointillés relie les rangs dans l'ordre. */
  g.strokeStyle = 'rgba(244,214,158,.35)';
  g.lineWidth = 1.5;
  g.setLineDash([4, 4]);
  g.beginPath();
  g.moveTo(padX + 6, yOf(0));
  g.lineTo(padX + 6, yOf(PLACES.length - 1));
  g.stroke();
  g.setLineDash([]);

  PLACES.forEach((place, i) => {
    const y = yOf(i);
    const courant = i === S.index;

    /* Ligne du tableau : rectangle plein pour la ligne courante, vide sinon. */
    g.strokeStyle = courant ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.45)';
    g.lineWidth = courant ? 2 : 1;
    g.strokeRect(padX, y - 11, cssW - padX * 2, 22);

    /* Case du rang : la forme distingue la ligne courante. */
    g.strokeStyle = courant ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.5)';
    if (courant) {
      g.fillStyle = 'rgba(244,214,158,.2)';
      g.fillRect(padX + 3, y - 8, 16, 16);
    }
    g.strokeRect(padX + 3, y - 8, 16, 16);

    /* Libellé : le mot COURANT accompagne toujours le triangle. */
    g.fillStyle = courant ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.82)';
    g.font = '11px sans-serif';
    const court = place.label.length > 18 ? place.label.slice(0, 17) + '…' : place.label;
    g.fillText(court, padX + 28, y + 4);
    if (courant) g.fillText('◀ COURANT', cssW - padX - 78, y + 4);

    /* Numéro de rang. */
    g.fillStyle = 'rgba(214,207,193,.6)';
    g.font = '10px sans-serif';
    g.fillText(String(i + 1), padX - 8, y + 4);
  });

  /* Curseur animé : position déterministe, entre le rang courant et le suivant. */
  if (S.playing && S.phase > 0 && S.index < PLACES.length - 1) {
    const y = yOf(S.index) + (yOf(S.index + 1) - yOf(S.index)) * S.phase;
    g.fillStyle = 'rgba(244,214,158,.9)';
    g.beginPath();
    g.moveTo(padX + 6, y - 5);
    g.lineTo(padX + 14, y);
    g.lineTo(padX + 6, y + 5);
    g.closePath();
    g.fill();
  }
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const actif = PLACES[S.index];
  const pasDepuisDebut = pasSequentiels(0, S.index);
  const pasJusquFin = pasSequentiels(S.index, PLACES.length - 1);
  const proche = nearestDistance(S.index);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Ligne courante : '));
  n.appendChild(fort('rang ' + (S.index + 1) + ' / ' + PLACES.length + ' — ' + actif.label));
  n.appendChild(document.createTextNode('. Depuis la première ligne : '));
  n.appendChild(fort(String(pasDepuisDebut) + ' pas'));
  n.appendChild(document.createTextNode(' ; jusqu’à la dernière : '));
  n.appendChild(fort(String(pasJusquFin) + ' pas'));
  n.appendChild(document.createTextNode(' (référence : un saut direct = ' + PAS_UNIQUE + ' pas, une touche = ' + PAS_UNIQUE + ' ligne). Voisin le plus proche : '));
  n.appendChild(fort(proche === null ? 'aucun' : fmt(proche, 1) + ' km'));
  n.appendChild(document.createTextNode(' (formule haversine, R = 6371 km). Le rang courant est écrit « actif » dans le tableau et marqué ◀ COURANT sur le canvas : jamais une couleur seule.'));
}

function markTableRow() {
  const table = S.nodes.table;
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach((tr, i) => {
    tr.setAttribute('data-geography-e055-courant', i === S.index ? '1' : '0');
    const cell = tr.querySelector('td');
    if (cell) {
      const label = PLACES[i] ? PLACES[i].label : '';
      cell.textContent = label + (i === S.index ? ' — actif' : '');
    }
  });
}

function syncControls() {
  const n = S.nodes;
  PLACES.forEach((place, i) => {
    const btn = n[place.key];
    if (!btn) return;
    const courant = i === S.index;
    btn.tabIndex = courant ? 0 : -1;
    if (courant) btn.setAttribute('aria-current', 'true');
    else btn.removeAttribute('aria-current');
    const marqueur = btn.querySelector('.geography-e055-courant');
    if (marqueur) marqueur.textContent = courant ? '◀ COURANT' : '';
  });
  if (n.anim) {
    n.anim.textContent = S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours';
    n.anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  markTableRow();
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
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.phase = (S.phase + dt * 0.0011) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE055Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
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
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e055-badge', 'Tableau accessible : légende, en-têtes de colonnes et de lignes. Navigation séquentielle : une touche avance d’une ligne (Flèches, Début, Fin), tabindex mobile et aria-current sur la ligne courante.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E055', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE055Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    PLACES.forEach((place, i) => {
      const btn = S.nodes[place.key];
      if (!btn) return;
      btn.addEventListener('click', () => {
        S.index = i;
        S.phase = 0;
        syncControls();
      });
      btn.addEventListener('keydown', (event) => {
        let cible = S.index;
        if (event.key === 'ArrowDown') cible = Math.min(PLACES.length - 1, S.index + 1);
        else if (event.key === 'ArrowUp') cible = Math.max(0, S.index - 1);
        else if (event.key === 'Home') cible = 0;
        else if (event.key === 'End') cible = PLACES.length - 1;
        else return;
        event.preventDefault();
        event.stopPropagation();
        S.index = cible;
        S.phase = 0;
        syncControls();
        const cibleNode = S.nodes[PLACES[S.index].key];
        if (cibleNode && typeof cibleNode.focus === 'function') cibleNode.focus();
      });
    });
    const canvas = S.nodes.canvas;
    canvas.addEventListener('keydown', (event) => {
      let cible = S.index;
      if (event.key === 'ArrowDown') cible = Math.min(PLACES.length - 1, S.index + 1);
      else if (event.key === 'ArrowUp') cible = Math.max(0, S.index - 1);
      else if (event.key === 'Home') cible = 0;
      else if (event.key === 'End') cible = PLACES.length - 1;
      else return;
      event.preventDefault();
      S.index = cible;
      S.phase = 0;
      syncControls();
    });
    S.nodes.anim.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) { S.phase = 0; stopLoop(); } else startLoop();
      syncControls();
    });
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
