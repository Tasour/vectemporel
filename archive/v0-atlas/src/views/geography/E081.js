import { register } from './registry.js';

/*
 * Lentille E081 — regroupement de marqueurs (clustering) déterministe (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E081-01 … E081-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E081', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e081`.
 * Tous les identifiants DOM sont préfixés `geography-e081-*`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué). Tout le contenu est du texte DOM
 * lisible sans script ; le canvas ne détient aucune information exclusive.
 *
 * Thème : comment regrouper des marqueurs proches en « groupes » (clusters)
 * sans jamais tirer au hasard ? La lentille greffe à la vue GEOGRAPHIE un
 * panneau qui enseigne une chaîne déterministe complète : une métrique de
 * distance (E081-03), une partition en cellules de grille (E081-04), le
 * centroïde et la compression (E081-05), une fusion par union-find réglée par
 * un rayon (E081-06), et l'effet du pas de cellule sur le nombre de groupes
 * (E081-07). Toutes les grandeurs sont recalculées depuis des constantes
 * choisies et depuis la formule de chaque étape — aucune mesure n'est inventée
 * et aucune donnée géographique réelle n'est simulée.
 */

const CSS_ID = 'geography-e081';
const SECTION_ID = 'geography-e081-section';
const MAP_W = 900;                  // largeur du cadre schématique, unités
const MAP_H = 600;                  // hauteur du cadre schématique, unités
const SWEEP_MS = 9000;              // période du balayage continu
const FUSION_FACTOR = 1.8;          // rayon de fusion = taille de cellule × 1,8
const NARROW = '\u202f';            // espace insécable fine (typographie française)
const MINUS = '\u2212';             // signe moins typographique

/* E081-03 — jeu de marqueurs choisi, jamais tiré au hasard. Les coordonnées
   forment quelques amas naturels (A–D) et quatre points isolés : le regroupement
   a donc une réponse attendue que l'on peut prédire puis vérifier. */
const MARQUEURS = [
  { nom: 'M01', x: 110, y: 118 }, { nom: 'M02', x: 130, y: 125 },
  { nom: 'M03', x: 118, y: 140 }, { nom: 'M04', x: 135, y: 110 },
  { nom: 'M05', x: 445, y: 175 }, { nom: 'M06', x: 460, y: 185 },
  { nom: 'M07', x: 455, y: 165 },
  { nom: 'M08', x: 735, y: 425 }, { nom: 'M09', x: 750, y: 440 },
  { nom: 'M10', x: 745, y: 415 }, { nom: 'M11', x: 760, y: 435 },
  { nom: 'M12', x: 730, y: 445 },
  { nom: 'M13', x: 245, y: 465 }, { nom: 'M14', x: 260, y: 475 },
  { nom: 'M15', x: 600, y: 320 }, { nom: 'M16', x: 820, y: 120 },
  { nom: 'M17', x: 80,  y: 520 }, { nom: 'M18', x: 500, y: 520 },
];

/* E081-04 / E081-07 — tailles de cellule disponibles (unités du cadre).
   Une cellule plus fine produit plus de groupes ; le facteur est recalculé. */
const PASSES = [
  { key: 'fin',     nom: 'Fine',     cell: 60 },
  { key: 'moyen',   nom: 'Moyenne',  cell: 100 },
  { key: 'grossier', nom: 'Grossière', cell: 160 },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let selectedPas = 1;   // PASSES[1] : cellule moyenne 100, par défaut
let fusionOn = false;  // bascule indépendante (aria-pressed)
let playing = false;
let renders = 0;

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* E081-03 — distance euclidienne dans le cadre schématique. Même paire de
   points → même distance : aucune graine aléatoire. */
function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampCoord(x, y) {
  return {
    x: Math.max(0, Math.min(MAP_W, finite(x) ? x : MAP_W / 2)),
    y: Math.max(0, Math.min(MAP_H, finite(y) ? y : MAP_H / 2)),
  };
}

/* E081-04 — clé de cellule : (⌊x/cell⌋ ; ⌊y/cell⌋). Deux marqueurs dans la
   même cellule ont la même clé et tombent donc dans le même groupe, sans
   dépendre de l'ordre de parcours. */
function cellKey(x, y, cell) {
  return `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
}

/* E081-04 / E081-05 — partition brute en cellules. Chaque groupe porte sa
   clé, son effectif, son centroïde arithmétique et la liste de ses membres.
   Les groupes sont triés par clé pour garantir un ordre stable. */
function rawClusters(cell) {
  const buckets = new Map();
  MARQUEURS.forEach((marker) => {
    const key = cellKey(marker.x, marker.y, cell);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(marker);
  });
  const groups = [];
  buckets.forEach((members, key) => {
    let sx = 0;
    let sy = 0;
    members.forEach((m) => { sx += m.x; sy += m.y; });
    groups.push({
      key,
      count: members.length,
      cx: sx / members.length,
      cy: sy / members.length,
      membres: members.map((m) => m.nom),
      mergedFrom: 1,
    });
  });
  groups.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return groups;
}

/* E081-06 — fusion déterministe par union-find. On parcourt les groupes dans
   l'ordre de leur clé et on réunit ceux dont les centroïdes sont à une distance
   ≤ rayon. La racine retenue est toujours le plus petit index : le résultat est
   indépendant de l'ordre d'insertion, donc reproductible. */
function clusterGroups(cell, fusion, radius) {
  const groups = rawClusters(cell);
  if (!fusion) return groups;
  const parent = groups.map((_, i) => i);
  function find(i) {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    while (parent[i] !== i) { const next = parent[i]; parent[i] = r; i = next; }
    return r;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const lo = Math.min(ra, rb);
    const hi = Math.max(ra, rb);
    parent[hi] = lo;
  }
  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      if (distance(groups[i].cx, groups[i].cy, groups[j].cx, groups[j].cy) <= radius) union(i, j);
    }
  }
  const byRoot = new Map();
  groups.forEach((g, i) => {
    const root = find(i);
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(g);
  });
  const merged = [];
  byRoot.forEach((list) => {
    let sx = 0;
    let sy = 0;
    let count = 0;
    const membres = [];
    const keys = [];
    list.forEach((g) => {
      g.membres.forEach((nom) => {
        const marker = MARQUEURS.find((m) => m.nom === nom);
        sx += marker.x; sy += marker.y; count += 1; membres.push(nom);
      });
      keys.push(g.key);
    });
    keys.sort();
    merged.push({ key: keys[0], count, cx: sx / count, cy: sy / count, membres, mergedFrom: list.length });
  });
  merged.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return merged;
}

/* E081-05 — compression : combien de marqueurs en moyenne par groupe. */
function compression(groupCount) {
  return groupCount > 0 ? MARQUEURS.length / groupCount : 0;
}

/* E081-06 — rayon de fusion, fonction déterministe de la taille de cellule. */
function fusionRadius(cell) { return cell * FUSION_FACTOR; }

/* E081-07 — synthèse chiffrée pour chaque pas (avec et sans fusion). */
function summary(cell, fusion) {
  const groups = clusterGroups(cell, fusion, fusionRadius(cell));
  return {
    cell,
    groups: groups.length,
    singletons: groups.filter((g) => g.count === 1).length,
    maxCount: groups.reduce((m, g) => Math.max(m, g.count), 0),
    compression: compression(groups.length),
  };
}

/* E081-09 — annonce unique de toute action, en toutes lettres. */
function writeReadout(scene, cause) {
  if (!scene || !scene.readout) return;
  const groups = scene.groups;
  const near = nearestGroup(groups, scene.focus.x, scene.focus.y);
  const verbs = {
    balayage: 'Balayage en cours',
    clavier: 'Lecture au clavier',
    pointeur: 'Lecture au pointeur',
    pas: 'Taille de cellule modifiée',
    fusion: 'Fusion modifiée',
    demarrage: 'Balayage lancé',
    arret: 'Balayage arrêté',
    initial: 'Regroupement initial',
  };
  const centre = near.group
    ? `groupe ${near.group.key} (${num(near.group.count, 0)} marqueur${near.group.count > 1 ? 's' : ''}, ` +
      `centre ${num(near.group.cx, 0)} ; ${num(near.group.cy, 0)})`
    : 'aucun groupe';
  scene.readout.textContent =
    `${verbs[cause] || 'Regroupement'} · ${num(MARQUEURS.length, 0)} marqueurs, ` +
    `${num(groups.length, 0)} groupes, ${num(compression(groups.length), 2)} marqueurs par groupe · ` +
    `cellule ${num(PASSES[scene.pasIndex].cell, 0)} unités, fusion ${scene.fusion ? 'activée' : 'désactivée'}` +
    `${scene.fusion ? ` (rayon ${num(fusionRadius(PASSES[scene.pasIndex].cell), 0)} unités)` : ''} · ` +
    `groupe le plus proche du point de lecture : ${centre}.`;
}

/* E081-09 — groupe le plus proche du point de lecture. Déterministe. */
function nearestGroup(groups, x, y) {
  if (!groups || !groups.length) return { group: null, distance: 0 };
  let best = groups[0];
  let bestD = Infinity;
  groups.forEach((g) => {
    const d = distance(g.cx, g.cy, x, y);
    if (d < bestD) { bestD = d; best = g; }
  });
  return { group: best, distance: bestD };
}

/* E081-02 — feuille de styles unique, identifiants préfixés, cadrée par
   [data-geography-e081="on"] posé sur .geo-layout. Cibles tactiles ≥ 44 px,
   focus visible, aucune information portée par la seule couleur. */
const RULES = `
.geo-layout[data-geography-e081="on"] .geography-e081-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-e081="on"] .geography-e081-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e081="on"] .geography-e081-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e081="on"] .geography-e081-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e081="on"] .geography-e081-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-e081="on"] .geography-e081-value { color: var(--ink); }
.geo-layout[data-geography-e081="on"] .geography-e081-list { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-e081="on"] .geography-e081-list li { margin: 0 0 4px; }
.geo-layout[data-geography-e081="on"] .geography-e081-group {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0;
}
.geo-layout[data-geography-e081="on"] .geography-e081-pas {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-e081="on"] .geography-e081-pas:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-e081="on"] .geography-e081-pas[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-e081="on"] .geography-e081-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e081="on"] .geography-e081-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-e081="on"] .geography-e081-canvas {
  display: block; width: 100%; max-width: 320px; height: auto; aspect-ratio: 900 / 600;
  margin: 0 auto; touch-action: none; cursor: crosshair;
}
.geo-layout[data-geography-e081="on"] .geography-e081-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-e081="on"] .geography-e081-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-e081="on"] .geography-e081-toggle,
.geo-layout[data-geography-e081="on"] .geography-e081-play {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-e081="on"] .geography-e081-toggle:hover,
.geo-layout[data-geography-e081="on"] .geography-e081-play:hover { border-color: var(--gold); }
.geo-layout[data-geography-e081="on"] .geography-e081-toggle[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-e081="on"] .geography-e081-pas:focus-visible,
.geo-layout[data-geography-e081="on"] .geography-e081-canvas:focus-visible,
.geo-layout[data-geography-e081="on"] .geography-e081-toggle:focus-visible,
.geo-layout[data-geography-e081="on"] .geography-e081-play:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-e081="on"] .geography-e081-table {
  width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px;
}
.geo-layout[data-geography-e081="on"] .geography-e081-table caption {
  caption-side: top; text-align: left; color: var(--gold-bright); font-size: 11px; margin-bottom: 4px;
}
.geo-layout[data-geography-e081="on"] .geography-e081-table th,
.geo-layout[data-geography-e081="on"] .geography-e081-table td {
  border: 1px solid var(--line); padding: 4px 6px; text-align: left; font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e081="on"] .geography-e081-table thead th { color: var(--gold-bright); }
@media (max-width: 620px) {
  .geo-layout[data-geography-e081="on"] .geography-e081-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-e081="on"] .geography-e081-group { grid-template-columns: 1fr; }
  .geo-layout[data-geography-e081="on"] .geography-e081-canvas { max-width: 280px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e081="on"] .geography-e081-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E081-08 — glyphe distinct selon l'effectif : jamais la seule couleur. */
function glyphOf(count) {
  if (count >= 4) return '●';
  if (count >= 2) return '◆';
  return '·';
}

/* E081-04 / E081-05 / E081-06 / E081-08 / E081-09 — dessin déterministe du
   laboratoire. Un seul canvas, DPR plafonné à 2, couleurs lues dans les variables
   de thème avec repli. Canevas, grille, cercles et point de lecture ne détiennent
   aucune information exclusive : tout est aussi écrit en texte dans le panneau. */
function drawScene(canvas, scene) {
  if (!canvas || typeof canvas.getContext !== 'function' || !scene) return;
  const painter = canvas.getContext('2d');
  if (!painter) return;
  const cssW = Math.max(160, Math.min(320, canvas.clientWidth || 320));
  const cssH = cssW * (MAP_H / MAP_W);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);

  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(canvas) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const value = theme ? theme.getPropertyValue(name).trim() : '';
    return value || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const gold = color('--gold', '#d9b166');
  const bright = color('--gold-bright', '#f0d18c');
  const muted = color('--muted', '#9aa0a8');
  const sx = cssW / MAP_W;
  const sy = cssH / MAP_H;
  const cell = PASSES[scene.pasIndex].cell;

  /* Cadre. */
  painter.lineWidth = 1;
  painter.strokeStyle = muted;
  painter.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  /* E081-04 — grille de cellules : traits fins, distincts des groupes. */
  painter.strokeStyle = muted;
  painter.globalAlpha = 0.30;
  painter.lineWidth = 1;
  painter.setLineDash([2, 4]);
  for (let x = 0; x <= MAP_W; x += cell) {
    const gx = x * sx;
    painter.beginPath(); painter.moveTo(gx, 0); painter.lineTo(gx, cssH); painter.stroke();
  }
  for (let y = 0; y <= MAP_H; y += cell) {
    const gy = y * sy;
    painter.beginPath(); painter.moveTo(0, gy); painter.lineTo(cssW, gy); painter.stroke();
  }
  painter.setLineDash([]);
  painter.globalAlpha = 1;

  /* E081-06 — rayon de fusion, dessiné comme une circonférence en pointillés
     longs autour du groupe sélectionné : distinct par la forme du trait. */
  const near = nearestGroup(scene.groups, scene.focus.x, scene.focus.y);
  if (scene.fusion && near.group) {
    painter.strokeStyle = gold;
    painter.globalAlpha = 0.55;
    painter.setLineDash([5, 3]);
    painter.beginPath();
    painter.arc(near.group.cx * sx, near.group.cy * sy, fusionRadius(cell) * sx, 0, Math.PI * 2);
    painter.stroke();
    painter.setLineDash([]);
    painter.globalAlpha = 1;
  }

  /* E081-03 — marqueurs individuels, points fins : ils restent visibles pour
     montrer qu'un groupe est bien une collection de marqueurs. */
  painter.fillStyle = ink;
  painter.globalAlpha = 0.55;
  MARQUEURS.forEach((m) => {
    painter.beginPath();
    painter.arc(m.x * sx, m.y * sy, Math.max(1.4, cssW * 0.005), 0, Math.PI * 2);
    painter.fill();
  });
  painter.globalAlpha = 1;

  /* E081-05 — un cercle par groupe, rayon fonction de l'effectif, avec le
     nombre écrit à l'intérieur. Les groupes d'un seul marqueur sont une croix :
     la forme distingue l'effectif, même en niveaux de gris. */
  scene.groups.forEach((g) => {
    const gx = g.cx * sx;
    const gy = g.cy * sy;
    if (g.count === 1) {
      const r = Math.max(3, cssW * 0.012);
      painter.strokeStyle = bright;
      painter.lineWidth = 1.4;
      painter.beginPath();
      painter.moveTo(gx - r, gy); painter.lineTo(gx + r, gy);
      painter.moveTo(gx, gy - r); painter.lineTo(gx, gy + r);
      painter.stroke();
      return;
    }
    const r = Math.max(6, Math.min(cssW * 0.16, cssW * (0.028 + g.count * 0.012)));
    painter.strokeStyle = g === near.group ? bright : gold;
    painter.lineWidth = g === near.group ? 2.4 : 1.5;
    painter.beginPath();
    painter.arc(gx, gy, r, 0, Math.PI * 2);
    painter.stroke();
    painter.fillStyle = g === near.group ? bright : gold;
    painter.font = `bold ${Math.max(8, Math.round(cssW * 0.034))}px sans-serif`;
    painter.textAlign = 'center';
    painter.textBaseline = 'middle';
    painter.fillText(String(g.count), gx, gy + 0.5);
    painter.textAlign = 'start';
    painter.textBaseline = 'alphabetic';
  });

  /* Point de lecture : une croix, dont l'information est redondée en texte. */
  const fx = scene.focus.x * sx;
  const fy = scene.focus.y * sy;
  painter.strokeStyle = gold;
  painter.lineWidth = 1.4;
  painter.beginPath();
  painter.moveTo(fx - 7, fy); painter.lineTo(fx + 7, fy);
  painter.moveTo(fx, fy - 7); painter.lineTo(fx, fy + 7);
  painter.stroke();
  painter.beginPath();
  painter.arc(fx, fy, 3, 0, Math.PI * 2);
  painter.stroke();
}

function line(ctx, parent, index, label, text, valueId) {
  const paragraph = ctx.el('p', 'geography-e081-line');
  paragraph.id = `geography-e081-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(ctx.el('strong', '', `E081-${String(index).padStart(2, '0')} · ${label}. `));
  const value = ctx.el('span', 'geography-e081-value', text);
  if (valueId) value.id = valueId;
  paragraph.appendChild(value);
  parent.appendChild(paragraph);
  return value;
}

/* Construction de la fiche sémantique complète (texte lisible sans JS). */
function buildSection(ctx, layout) {
  const previous = layout.querySelector(`#${SECTION_ID}`);
  if (previous && previous.parentNode) previous.parentNode.removeChild(previous);

  const panel = layout.querySelector('.geo-panel') || layout;
  const section = ctx.el('section', 'geography-e081-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Regroupement de marqueurs déterministe');
  section.setAttribute('data-sim', 'clustering-marqueurs-deterministe');

  section.appendChild(ctx.el('h2', '', 'Regroupement de marqueurs — un clustering déterministe'));

  /* E081-01 — amorce textuelle, lisible sans aucune interaction. */
  const intro = ctx.el('p', 'geography-e081-line');
  intro.id = 'geography-e081-intro';
  intro.appendChild(ctx.el('strong', '', 'E081-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'Regrouper des marqueurs consiste à remplacer une foule de points par quelques groupes ' +
    'représentatifs. La chaîne utilisée ici est entièrement déterministe : on mesure une distance, ' +
    'on découpe le cadre en cellules, on compte et on calcule le centre de chaque cellule, puis on ' +
    'fusionne les centres proches. Même jeu de marqueurs, mêmes réglages → mêmes groupes. ' +
    'Le schéma ci-dessous est un canevas schématique : toutes les valeurs sont aussi écrites ' +
    'en texte, la couleur n\'est jamais le seul support d\'information.'
  ));
  section.appendChild(intro);

  /* E081-03 — distance et jeu de marqueurs. */
  line(ctx, section, 3, 'Métrique de distance',
    `d(A,B) = √((xA − xB)² + (yA − yB)²), dans un cadre de ${MAP_W} × ${MAP_H} unités. ` +
    `${num(MARQUEURS.length, 0)} marqueurs sont disposés en quatre amas et quatre points isolés, ` +
    `tous choisis : la distance entre deux marqueurs est donc une fonction déterministe de leurs coordonnées.`);

  /* E081-04 — partition en cellules. */
  const cellDefault = PASSES[selectedPas].cell;
  line(ctx, section, 4, 'Partition en cellules',
    `Clé d’un marqueur : (⌊x / ${num(cellDefault, 0)}⌋ ; ⌊y / ${num(cellDefault, 0)}⌋). ` +
    `Deux marqueurs partageant la même clé appartiennent au même groupe, quel que soit l’ordre de lecture.`,
    'geography-e081-cell-text');

  /* E081-05 — centroïde et compression. */
  line(ctx, section, 5, 'Centroïde et compression',
    `Le centre d’un groupe est la moyenne des coordonnées de ses membres : ` +
    `cx = Σx / n, cy = Σy / n. La compression vaut ${num(MARQUEURS.length, 0)} / nombre de groupes.`,
    'geography-e081-centre-text');

  /* E081-06 — fusion par union-find. */
  line(ctx, section, 6, 'Fusion déterministe',
    `Deux groupes sont réunis si la distance entre leurs centroïdes est ≤ rayon = cellule × ` +
    `${num(FUSION_FACTOR, 1)} = ${num(fusionRadius(cellDefault), 0)} unités à la cellule moyenne. ` +
    `Les paires sont parcourues dans l’ordre des clés et la racine retenue est toujours la plus petite : ` +
    `le résultat ne dépend d’aucun tirage.`,
    'geography-e081-fusion-text');

  /* E081-07 — mesures chiffrées, dont une comparée à une référence. */
  const measures = ctx.el('ul', 'geography-e081-list');
  measures.id = 'geography-e081-mesures';
  const sFin = summary(PASSES[0].cell, false);
  const sMoy = summary(PASSES[1].cell, false);
  const sGros = summary(PASSES[2].cell, false);
  const sMoyFusion = summary(PASSES[1].cell, true);
  const items = [
    `Référence : ${num(MARQUEURS.length, 0)} marqueurs, donc au plus ${num(MARQUEURS.length, 0)} groupes ` +
    `si chacun est isolé (compression maximale ${num(MARQUEURS.length, 0)} marqueur par groupe).`,
    `Cellule fine ${num(PASSES[0].cell, 0)} : ${num(sFin.groups, 0)} groupes, ` +
    `compression ${num(sFin.compression, 2)} ; cellule moyenne ${num(PASSES[1].cell, 0)} : ` +
    `${num(sMoy.groups, 0)} groupes.`,
    `Cellule grossière ${num(PASSES[2].cell, 0)} : ${num(sGros.groups, 0)} groupes — ` +
    `facteur ${num(sGros.groups / sFin.groups, 2)} par rapport à la cellule fine (${num(sFin.groups, 0)}).`,
    `Fusion à la cellule moyenne : rayon ${num(fusionRadius(PASSES[1].cell), 0)} unités, ` +
    `${num(sMoy.groups, 0)} groupes deviennent ${num(sMoyFusion.groups, 0)} ` +
    `(gain ${num(sMoy.groups - sMoyFusion.groups, 0)} groupes).`,
    `Groupe le plus peuplé à la cellule moyenne : ${num(sMoy.maxCount, 0)} marqueurs, ` +
    `soit ${num((sMoy.maxCount / MARQUEURS.length) * 100, 1)} % de l’ensemble.`,
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e081-mesure-${i}`;
    measures.appendChild(item);
  });
  section.appendChild(measures);

  /* E081-04 / E081-07 — radiogroupe de trois tailles de cellule (choix unique). */
  const group = ctx.el('div', 'geography-e081-group');
  group.id = 'geography-e081-group';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir la taille de cellule du regroupement');
  PASSES.forEach((preset, i) => {
    const radio = ctx.el('button', 'geography-e081-pas',
      `${preset.nom} — ${num(preset.cell, 0)} unités`);
    radio.type = 'button';
    radio.id = `geography-e081-radio-${i}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === selectedPas ? 'true' : 'false');
    radio.tabIndex = i === selectedPas ? 0 : -1;
    group.appendChild(radio);
  });
  section.appendChild(group);

  /* E081-09 — région live unique. */
  const readout = ctx.el('p', 'geography-e081-readout', '');
  readout.id = 'geography-e081-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E081-04 / E081-05 / E081-08 / E081-09 — laboratoire canvas, redondé en texte. */
  const figure = ctx.el('figure', 'geography-e081-figure');
  figure.id = 'geography-e081-figure';
  const canvas = ctx.el('canvas', 'geography-e081-canvas');
  canvas.id = 'geography-e081-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Canevas schématique de regroupement : une grille de cellules, des marqueurs individuels, ' +
    'un cercle par groupe portant son effectif et un point de lecture. ' +
    'Flèches pour déplacer le point, Plus et Moins pour changer la taille de cellule, ' +
    'F pour la fusion, zéro pour le centre, Espace pour le balayage.');
  canvas.setAttribute('aria-describedby', 'geography-e081-clavier');
  const caption = ctx.el('figcaption', 'geography-e081-caption',
    'Canevas schématique, non à l’échelle du terrain : les traits fins sont les cellules, ' +
    'les points sont les marqueurs, le cercle porte l’effectif du groupe et la croix est le point de lecture. ' +
    'Nombres, centres et membres sont écrits en texte dans le tableau.');
  caption.id = 'geography-e081-caption';
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E081-08 — légende en glyphes, jamais la seule couleur. */
  const legend = ctx.el('p', 'geography-e081-line',
    'E081-08 · Légende : ● groupe de 4 marqueurs ou plus · ◆ groupe de 2 ou 3 · ' +
    '· marqueur seul (croix sur le canevas) ; le nombre est toujours écrit au centre du cercle. ' +
    'La forme distingue l’effectif, même en niveaux de gris.');
  legend.id = 'geography-e081-legend';
  section.appendChild(legend);

  /* E081-08 — tableau captioné décodant les groupes (texte sémantique). */
  const table = ctx.el('table', 'geography-e081-table');
  table.id = 'geography-e081-table';
  table.appendChild(ctx.el('caption', '', 'Groupes déterministes : effectif, centre et membres'));
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Glyphe', 'Groupe', 'Marqueurs', 'Centre (x ; y)', 'Membres'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.scope = 'col';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = ctx.el('tbody');
  tbody.id = 'geography-e081-tbody';
  table.appendChild(tbody);
  section.appendChild(table);

  /* E081-09 — bascule indépendante (aria-pressed légitime) et balayage. */
  const actions = ctx.el('div', 'geography-e081-actions');
  const fusionBtn = ctx.el('button', 'geography-e081-toggle',
    fusionOn ? 'Fusion : activée' : 'Fusion : désactivée');
  fusionBtn.type = 'button';
  fusionBtn.id = 'geography-e081-fusion';
  fusionBtn.setAttribute('aria-pressed', fusionOn ? 'true' : 'false');
  fusionBtn.setAttribute('aria-controls', 'geography-e081-canvas');
  actions.appendChild(fusionBtn);

  const play = ctx.el('button', 'geography-e081-play', playing ? 'Arrêter le balayage' : 'Lancer le balayage');
  play.type = 'button';
  play.id = 'geography-e081-play';
  play.setAttribute('aria-controls', 'geography-e081-readout');
  actions.appendChild(play);
  section.appendChild(actions);

  /* E081-09 — aide clavier. */
  const clavier = ctx.el('p', 'geography-e081-line',
    'E081-09 · Clavier : Tab atteint les trois tailles de cellule, la bascule de fusion, ' +
    'le canevas, puis le balayage. Sur le canevas, ← → et ↑ ↓ déplacent le point de lecture, ' +
    '+ et − changent la taille de cellule, F bascule la fusion, 0 revient au centre, ' +
    'Espace lance ou arrête le balayage. Le pointeur fait le même travail que les flèches.');
  clavier.id = 'geography-e081-clavier';
  section.appendChild(clavier);

  /* E081-10 — limite falsifiable en cinq temps, alignée sur l'angle mort. */
  const limite = ctx.el('p', 'geography-e081-line',
    'E081-10 · Limite et vérification : 1) prédire qu’à la cellule moyenne les quatre amas ' +
    `donnent au plus ${num(summary(PASSES[1].cell, false).groups, 0)} groupes et que la cellule fine en donne plus ; ` +
    `2) régler la cellule fine (${num(PASSES[0].cell, 0)} unités) ; ` +
    `3) attendre ${num(summary(PASSES[0].cell, false).groups, 0)} groupes contre ` +
    `${num(summary(PASSES[2].cell, false).groups, 0)} à la cellule grossière de ${num(PASSES[2].cell, 0)} ; ` +
    '4) falsifier si deux marqueurs du même groupe sont à plus d’une cellule l’un de l’autre, ' +
    'ou si un même réglage produit deux résultats différents ; ' +
    '5) débrief : le découpage en cellules est une grille arbitraire — deux marqueurs très proches ' +
    'mais de part et d’autre d’une frontière tombent dans deux groupes, et la fusion par rayon ' +
    'répare certains voisins mais dépend du choix du rayon. Le clustering est déterministe, ' +
    'pas neutre : le réglage crée le résultat.');
  limite.id = 'geography-e081-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  const radios = Array.from(group.querySelectorAll('.geography-e081-pas'));
  const scene = {
    section, radios, readout, canvas, fusionBtn, play, tbody,
    focus: clampCoord(MAP_W / 2, MAP_H / 2),
    pasIndex: selectedPas,
    fusion: fusionOn,
    groups: [],
  };
  refreshGroups(scene);
  return scene;
}

/* E081-04 / E081-05 / E081-06 / E081-08 — recalcul de la synthèse puis
   réécriture du tableau. Toutes les valeurs viennent de clusterGroups(). */
function refreshGroups(scene) {
  if (!scene) return;
  const cell = PASSES[scene.pasIndex].cell;
  scene.groups = clusterGroups(cell, scene.fusion, fusionRadius(cell));
  if (scene.tbody) {
    while (scene.tbody.firstChild) scene.tbody.removeChild(scene.tbody.firstChild);
    scene.groups.forEach((g, i) => {
      const tr = ctxElRow(g, i);
      scene.tbody.appendChild(tr);
    });
  }
  const layout = scene.section ? scene.section.closest('.geo-layout') : null;
  if (layout) {
    layout.setAttribute('data-geography-e081-groupes', String(scene.groups.length));
    layout.setAttribute('data-geography-e081-cellule', String(cell));
    layout.setAttribute('data-geography-e081-fusion', scene.fusion ? 'true' : 'false');
  }
}

/* Fabrique une ligne du tableau sans dépendre du ctx du rendu : on utilise
   document.createElement directement (même contrat que ctx.el). */
function ctxElRow(g, i) {
  const make = (tag, text, scope) => {
    const node = document.createElement(tag);
    if (scope) node.scope = scope;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const tr = make('tr');
  tr.id = `geography-e081-groupe-${i}`;
  tr.appendChild(make('th', glyphOf(g.count), 'row'));
  tr.appendChild(make('td', g.key));
  tr.appendChild(make('td', String(g.count)));
  tr.appendChild(make('td', `${num(g.cx, 0)} ; ${num(g.cy, 0)}`));
  tr.appendChild(make('td', g.membres.join(', ')));
  return tr;
}

/* E081-04 / E081-07 — changement de taille de cellule (choix unique). */
function applyPas(index, scene, fromAnimation) {
  const sceneRef = scene || latest;
  if (!sceneRef) return;
  selectedPas = Math.max(0, Math.min(PASSES.length - 1, index));
  sceneRef.pasIndex = selectedPas;
  const cell = PASSES[selectedPas].cell;
  sceneRef.radios.forEach((radio, i) => {
    const on = i === selectedPas;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });
  if (sceneRef.cellText) {
    sceneRef.cellText.textContent =
      `Clé (⌊x / ${num(cell, 0)}⌋ ; ⌊y / ${num(cell, 0)}⌋) : ` +
      `${num(Math.ceil(MAP_W / cell), 0)} colonnes × ${num(Math.ceil(MAP_H / cell), 0)} lignes de cellules.`;
  }
  refreshGroups(sceneRef);
  drawScene(sceneRef.canvas, sceneRef);
  writeReadout(sceneRef, fromAnimation ? 'balayage' : 'pas');
}

/* E081-06 — bascule de fusion indépendante. */
function toggleFusion(scene) {
  if (!scene) return;
  fusionOn = !fusionOn;
  scene.fusion = fusionOn;
  scene.fusionBtn.setAttribute('aria-pressed', fusionOn ? 'true' : 'false');
  scene.fusionBtn.textContent = fusionOn ? 'Fusion : activée' : 'Fusion : désactivée';
  refreshGroups(scene);
  drawScene(scene.canvas, scene);
  writeReadout(scene, 'fusion');
}

/* E081-10 — une seule frame, court-circuitée quand l'onglet est masqué. Le
   point suit une courbe déterministe (sin de l'horodatage rAF), sans aucun
   tirage aléatoire : il reste toujours dans le cadre par clampCoord(). */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.canvas || !scene.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return; // pause hors écran

  if (scene.playing && !scene.reduced()) {
    if (scene.last === null) scene.last = timestamp;
    scene.elapsed += timestamp - scene.last;
    scene.last = timestamp;
    const phase = (scene.elapsed / SWEEP_MS) * Math.PI * 2;
    const fx = MAP_W / 2 + (MAP_W / 2 - 20) * Math.sin(phase);
    const fy = MAP_H / 2 + (MAP_H / 2 - 20) * Math.sin(phase * 0.75 + 0.5);
    scene.focus = clampCoord(fx, fy);
    drawScene(scene.canvas, scene);
    writeReadout(scene, 'balayage');
    ensureLoop();
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      if (scene.play) scene.play.textContent = 'Lancer le balayage';
    }
  }
}

function ensureLoop() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { loop(0); return; }
  frame = requestAnimationFrame(loop);
}

/* E081-10 — installation unique et silencieuse des écouteurs globaux. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (latest && latest.playing && !latest.reduced()) ensureLoop();
      else if (latest) drawScene(latest.canvas, latest);
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      if (latest) latest.last = null;
    }
  });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') query.addEventListener('change', () => {
        if (latest && latest.playing && latest.reduced()) {
          playing = false;
          latest.playing = false;
          if (latest.play) latest.play.textContent = 'Lancer le balayage';
        }
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        if (latest) drawScene(latest.canvas, latest);
      });
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

register('E081', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e081', 'on');

  const scene = buildSection(ctx, layout);
  layout.setAttribute('data-geography-e081-render', String(renders));

  scene.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;
  scene.playing = playing;
  scene.elapsed = 0;
  scene.last = null;
  scene.cellText = scene.section.querySelector('#geography-e081-cell-text');

  /* E081-09 — clavier : point de lecture, taille de cellule, fusion, balayage. */
  const onKey = (event) => {
    const target = event.target;
    const isRadio = target && target.classList && target.classList.contains('geography-e081-pas');
    const isCanvas = target === scene.canvas;
    if (!isRadio && !isCanvas) return;
    const step = PASSES[scene.pasIndex].cell / 2;
    const c = scene.focus;
    if (event.key === 'ArrowRight') scene.focus = clampCoord(c.x + step, c.y);
    else if (event.key === 'ArrowLeft') scene.focus = clampCoord(c.x - step, c.y);
    else if (event.key === 'ArrowDown') scene.focus = clampCoord(c.x, c.y + step);
    else if (event.key === 'ArrowUp') scene.focus = clampCoord(c.x, c.y - step);
    else if (event.key === '+' || event.key === '=') {
      applyPas(scene.pasIndex + 1, scene, false);
      return;
    } else if (event.key === '-' || event.key === '_') {
      applyPas(scene.pasIndex - 1, scene, false);
      return;
    } else if (event.key === 'f' || event.key === 'F') {
      toggleFusion(scene);
      return;
    } else if (event.key === '0') {
      scene.focus = clampCoord(MAP_W / 2, MAP_H / 2);
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      togglePlay(scene);
      return;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    drawScene(scene.canvas, scene);
    writeReadout(scene, 'clavier');
  };
  scene.section.addEventListener('keydown', (event) => {
    /* Sur un radio, ← → changent de taille (convention radiogroupe). */
    const isRadio = event.target && event.target.classList
      && event.target.classList.contains('geography-e081-pas');
    if (isRadio && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
      applyPas((selectedPas + dir + PASSES.length) % PASSES.length, scene, false);
      scene.radios[selectedPas].focus();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onKey(event);
  });

  scene.radios.forEach((radio, i) => {
    radio.addEventListener('click', () => applyPas(i, scene, false));
  });
  scene.fusionBtn.addEventListener('click', () => toggleFusion(scene));
  scene.play.addEventListener('click', () => togglePlay(scene));

  /* E081-09 — glisser sur le canevas : même relation que les flèches. */
  let drag = null;
  scene.canvas.addEventListener('pointerdown', (event) => {
    drag = true;
    try { scene.canvas.setPointerCapture(event.pointerId); } catch { /* capture indisponible */ }
    movePointer(event);
  });
  const movePointer = (event) => {
    if (!drag) return;
    const rect = scene.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * MAP_W;
    const y = ((event.clientY - rect.top) / rect.height) * MAP_H;
    scene.focus = clampCoord(x, y);
    drawScene(scene.canvas, scene);
    writeReadout(scene, 'pointeur');
  };
  scene.canvas.addEventListener('pointermove', movePointer);
  const endDrag = () => { drag = false; };
  scene.canvas.addEventListener('pointerup', endDrag);
  scene.canvas.addEventListener('pointercancel', endDrag);

  function togglePlay(target) {
    if (target.reduced()) {
      target.focus = clampCoord(
        target.focus.x < MAP_W / 2 ? MAP_W * 0.75 : MAP_W * 0.25,
        target.focus.y
      );
      drawScene(target.canvas, target);
      writeReadout(target, 'clavier');
      return;
    }
    playing = !playing;
    target.playing = playing;
    target.play.textContent = playing ? 'Arrêter le balayage' : 'Lancer le balayage';
    if (playing) {
      target.last = null;
      target.elapsed = 0;
      ensureLoop();
      writeReadout(target, 'demarrage');
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      target.last = null;
      writeReadout(target, 'arret');
    }
  }

  latest = scene;
  install();
  applyPas(selectedPas, scene, true);
  drawScene(scene.canvas, scene);
  writeReadout(scene, 'initial');
});
