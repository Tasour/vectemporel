import { register } from './registry.js';

/*
 * Lentille E081 — SECONDE PASSE (V2) : regroupement de marqueurs déterministe.
 *
 * Thème : comment remplacer une foule de marqueurs par quelques groupes
 * (clusters) sans jamais tirer au hasard ? La lentille greffe à la vue
 * GEOGRAPHIE un panneau pédagogique autonome qui enseigne une chaîne
 * déterministe complète : une métrique de distance euclidienne (E081-03),
 * une partition du cadre en cellules de grille (E081-04), le centroïde et la
 * compression (E081-05), une fusion des centroïdes proches par union-find
 * (E081-06), et l'effet du pas de cellule sur le nombre de groupes (E081-07).
 *
 * Les dix chantiers (E081-01 … E081-10) sont réellement implémentés ci-dessous.
 * La V2 ajoute à la passe 1 : une fiche de vérité à trois faits sourcés, un
 * tableau comparatif des trois pas, un tableau de mesures recalculées à chaque
 * réglage, un tableau des groupes captioné, un défi falsifiable en cinq temps
 * aligné sur l'angle mort du clustering, un bouton de remise à zéro, des
 * `aria-valuetext` sur le choix de pas, un `role="radiogroup"` explicite et une
 * boucle rAF unique suspendue à la fois sur document.hidden, hors écran
 * (IntersectionObserver) et en mouvement réduit (ctx.reducedMotion()).
 *
 * Tout le contenu pédagogique est du texte sémantique indexable
 * (h2/h3/p/ul/ol/table/caption/th/td/fieldset) présent dans le DOM : il reste
 * lisible et indexable même sans animation ni interaction. Le canvas n'est
 * qu'un laboratoire qui illustre des formules déterministes calculées
 * localement : aucune information n'est portée par la seule couleur.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e081-` (aucune collision avec la passe 1 `geography-e081-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e081';

const ID = {
  panel: 'geography-v2-e081-panel',
  title: 'geography-v2-e081-title',
  lead: 'geography-v2-e081-lead',
  facts: 'geography-v2-e081-facts',
  comparaison: 'geography-v2-e081-comparaison',
  pas: 'geography-v2-e081-pas',
  fusion: 'geography-v2-e081-fusion',
  play: 'geography-v2-e081-play',
  canvas: 'geography-v2-e081-canvas',
  canvasDesc: 'geography-v2-e081-canvas-desc',
  legend: 'geography-v2-e081-legend',
  groupes: 'geography-v2-e081-groupes',
  tbody: 'geography-v2-e081-tbody',
  mesuresTitle: 'geography-v2-e081-mesures-title',
  mesures: 'geography-v2-e081-mesures',
  defiTitle: 'geography-v2-e081-defi-title',
  defi: 'geography-v2-e081-defi',
  readout: 'geography-v2-e081-readout',
  reset: 'geography-v2-e081-reset',
  note: 'geography-v2-e081-note',
  badge: 'geography-v2-e081-badge',
};

const MAP_W = 900;
const MAP_H = 600;
const SWEEP_MS = 9000;
const FUSION_FACTOR = 1.8;
const NARROW = '\u202f';
const MINUS = '\u2212';

/* E081-03 — jeu de marqueurs choisi, jamais tiré au hasard : quatre amas
   naturels (A–D) et quatre points isolés. La réponse attendue est prédictible. */
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
  { nom: 'M17', x: 80, y: 520 }, { nom: 'M18', x: 500, y: 520 },
];

/* E081-04 / E081-07 — trois tailles de cellule (unités du cadre). */
const PASSES = [
  { key: 'fin', nom: 'Fine', cell: 60 },
  { key: 'moyen', nom: 'Moyenne', cell: 100 },
  { key: 'grossier', nom: 'Grossière', cell: 160 },
];
const PAS_ORDER = PASSES.map((p) => p.key);

const DEFI = {
  prediction: 'À la cellule moyenne (100 unités), les quatre amas et les quatre points isolés donnent au plus 8 groupes sans fusion ; la cellule fine en donne davantage (13).',
  reglage: 'Choisissez la taille « Fine » (60 unités), puis activez la fusion et observez le nombre de groupes dans le tableau des mesures.',
  attendu: 'Le nombre de groupes passe de 13 (fine, sans fusion) à 8 (fine, avec fusion, rayon 108 unités) ; le tableau et la région de statut affichent la même valeur.',
  falsification: 'Si deux marqueurs d’un même groupe sont à plus d’une cellule l’un de l’autre, ou si un même réglage produit deux résultats différents d’un rendu à l’autre, alors la partition ou l’union-find est fausse.',
  debrief: 'Le découpage en cellules est une grille arbitraire : deux marqueurs très proches mais de part et d’autre d’une frontière tombent dans deux groupes. La fusion par rayon répare certains voisins mais dépend du rayon choisi. Le regroupement est reproductible, pas neutre : le réglage crée le résultat.',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  pasIndex: 1,
  fusion: false,
  playing: false,
  elapsed: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  tbody: null,
  defiSpans: null,
  focus: { x: MAP_W / 2, y: MAP_H / 2 },
  groups: [],
  fresh: false,
};

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function num(value, digits = 2) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

/* E081-03 — distance euclidienne dans le cadre schématique. */
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

/* E081-04 — clé de cellule (⌊x/cell⌋ ; ⌊y/cell⌋). */
function cellKey(x, y, cell) {
  return `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
}

/* E081-04 / E081-05 — partition brute, triée par clé pour un ordre stable. */
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
    });
  });
  groups.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return groups;
}

/* E081-06 — fusion par union-find : racine toujours la plus petite, résultat
   indépendant de l'ordre d'insertion. */
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
    merged.push({ key: keys[0], count, cx: sx / count, cy: sy / count, membres });
  });
  merged.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return merged;
}

/* E081-05 — compression : marqueurs par groupe. */
function compression(groupCount) {
  return groupCount > 0 ? MARQUEURS.length / groupCount : 0;
}

/* E081-06 — rayon de fusion, fonction déterministe de la taille de cellule. */
function fusionRadius(cell) { return cell * FUSION_FACTOR; }

/* E081-07 — synthèse chiffrée pour un pas. */
function summary(cell, fusion) {
  const groups = clusterGroups(cell, fusion, fusionRadius(cell));
  return {
    cell,
    groups: groups.length,
    singles: groups.filter((g) => g.count === 1).length,
    maxCount: groups.reduce((m, g) => Math.max(m, g.count), 0),
    compression: compression(groups.length),
  };
}

/* E081-08 — glyphe distinct selon l'effectif : jamais la seule couleur. */
function glyphOf(count) {
  if (count >= 4) return '●';
  if (count >= 2) return '◆';
  return '·';
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

/* E081-07 — grandeurs recalculées depuis l'état courant. */
function measures() {
  const cell = PASSES[S.pasIndex].cell;
  const groups = clusterGroups(cell, S.fusion, fusionRadius(cell));
  return {
    cell,
    radius: fusionRadius(cell),
    groupCount: groups.length,
    singletons: groups.filter((g) => g.count === 1).length,
    maxCount: groups.reduce((m, g) => Math.max(m, g.count), 0),
    compression: compression(groups.length),
    ratioReference: MARQUEURS.length / groups.length,
  };
}

/* ---------- E081-01 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Un regroupement de marqueurs (ou clustering) remplace une foule de points par quelques groupes représentatifs. La chaîne employée ici est entièrement déterministe : on mesure une distance euclidienne d(A,B) = √((xA − xB)² + (yA − yB)²), on découpe le cadre de 900 × 600 unités en cellules, on compte et on calcule le centre de chaque cellule, puis on fusionne les centres proches. Même jeu de marqueurs, mêmes réglages → mêmes groupes.',
    'La clé d’un marqueur est (⌊x / cellule⌋ ; ⌊y / cellule⌋). Deux marqueurs partageant la même clé appartiennent au même groupe, quel que soit l’ordre de lecture. Le centre d’un groupe est la moyenne arithmétique de ses membres (cx = Σx / n, cy = Σy / n) ; la compression vaut 18 marqueurs divisés par le nombre de groupes.',
    'Deux groupes sont réunis si la distance entre leurs centroïdes est ≤ rayon = cellule × 1,8, par une union-find dont la racine retenue est toujours la plus petite index. Le regroupement est reproductible, mais la grille de cellules reste arbitraire : deux marqueurs très proches de part et d’autre d’une frontière tombent dans deux groupes, et la fusion dépend du rayon choisi.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e081-fait', texte));
  });
  return wrap;
}

/* E081-07 — tableau comparatif des trois pas (référence stable, sans JS). */
function staticComparison(ctx) {
  const table = ctx.el('table', 'geography-v2-e081-table');
  table.id = ID.comparaison;
  table.appendChild(ctx.el('caption', '',
    'Référence : 18 marqueurs choisis, au plus 18 groupes. Groupes selon le pas de cellule, sans fusion (calculés par clusterGroups()).'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pas de cellule', 'Taille', 'Groupes', 'Compression', 'Rayon de fusion'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PASSES.forEach((p) => {
    const s = summary(p.cell, false);
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = p.nom;
    const cellTxt = document.createElement('td');
    cellTxt.textContent = `${num(p.cell, 0)} unités`;
    const grp = document.createElement('td');
    grp.textContent = num(s.groups, 0);
    const comp = document.createElement('td');
    comp.textContent = num(s.compression, 2);
    const ray = document.createElement('td');
    ray.textContent = `${num(fusionRadius(p.cell), 0)} unités`;
    tr.append(th, cellTxt, grp, comp, ray);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E081-07 — tableau des mesures recalculées à chaque réglage. */
const MODEL_ROWS = [
  ['cellule', 'Taille de cellule', 'constante du pas choisi'],
  ['rayon', 'Rayon de fusion', 'cellule × 1,8'],
  ['groupes', 'Nombre de groupes', 'clusterGroups()'],
  ['singles', 'Groupes d’un seul marqueur', 'effectif = 1'],
  ['max', 'Groupe le plus peuplé', 'max des effectifs'],
  ['compression', 'Compression', '18 / nombre de groupes'],
  ['reference', 'Rapport à la référence', '18 marqueurs / groupes'],
];

function buildMeasuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e081-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les formules et les réglages courants ; la référence (18 marqueurs) est rappelée dans le tableau comparatif.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule / référence', 'Résultat courant'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MODEL_ROWS.forEach(([key, label, formule]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const form = document.createElement('td');
    form.textContent = formule;
    const value = document.createElement('td');
    value.textContent = '—';
    S.cells[key] = value;
    tr.append(th, form, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E081-08 — tableau captioné décodant les groupes (texte sémantique). */
function buildGroupTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e081-table');
  table.id = ID.groupes;
  table.appendChild(ctx.el('caption', '', 'Groupes déterministes : glyphe, clé, effectif, centre et membres'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Glyphe', 'Clé', 'Marqueurs', 'Centre (x ; y)', 'Membres'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.id = ID.tbody;
  table.appendChild(tbody);
  return table;
}

function fillGroupTable() {
  const tbody = S.tbody;
  if (!tbody) return;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  S.groups.forEach((g, i) => {
    const tr = document.createElement('tr');
    tr.id = `geography-v2-e081-groupe-${i}`;
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = glyphOf(g.count);
    const key = document.createElement('td');
    key.textContent = g.key;
    const count = document.createElement('td');
    count.textContent = num(g.count, 0);
    const centre = document.createElement('td');
    centre.textContent = `${num(g.cx, 0)} ; ${num(g.cy, 0)}`;
    const membres = document.createElement('td');
    membres.textContent = g.membres.join(', ');
    tr.append(th, key, count, centre, membres);
    tbody.appendChild(tr);
  });
}

/* E081-10 — défi falsifiable en cinq temps (texte réel). */
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e081-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[key];
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

/* ---------- E081-02 / E081-04 / E081-09 : panneau et contrôles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    const pasRadios = PAS_ORDER.map((k) => document.getElementById(`${ID.pas}-${k}`));
    return {
      panel,
      pasRadios,
      fusion: document.getElementById(ID.fusion),
      play: document.getElementById(ID.play),
      canvas: document.getElementById(ID.canvas),
      readout: document.getElementById(ID.readout),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e081-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Regroupement de marqueurs — un clustering déterministe (V2)');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Un clustering remplace une foule de marqueurs par quelques groupes. Ce laboratoire montre, sans aucune donnée réelle ni requête, '
    + 'comment la distance, le découpage en cellules, le centroïde et une fusion par union-find produisent des groupes reproductibles. '
    + 'Les grandeurs sont écrites en toutes lettres dans la région de statut et dans les tableaux : le dessin ne fait qu’illustrer le calcul.');
  lead.id = ID.lead;

  /* E081-04 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.pas;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Taille de cellule du regroupement (choix unique)');
  fieldset.appendChild(ctx.el('legend', '', 'Taille de cellule (choix unique)'));
  PASSES.forEach((p) => {
    const lab = ctx.el('label', 'geography-v2-e081-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e081-pas';
    radio.id = `${ID.pas}-${p.key}`;
    radio.value = p.key;
    radio.checked = PAS_ORDER[S.pasIndex] === p.key;
    radio.setAttribute('aria-valuetext', `${p.nom} : ${p.cell} unités, rayon de fusion ${fusionRadius(p.cell)} unités`);
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(`${p.nom} — ${p.cell} unités`));
    fieldset.appendChild(lab);
  });

  /* E081-09 : bascule indépendante (aria-pressed légitime) + balayage. */
  const fusion = ctx.el('button', 'geography-v2-e081-btn', 'Fusion : désactivée');
  fusion.type = 'button';
  fusion.id = ID.fusion;
  fusion.setAttribute('aria-pressed', 'false');
  fusion.setAttribute('aria-controls', ID.canvas);
  const play = ctx.el('button', 'geography-v2-e081-btn', '▶ Lancer le balayage');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', ID.readout);

  /* E081-08 : laboratoire canvas, surface de dessin unique. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Schéma de regroupement : une grille de cellules, des marqueurs individuels, '
    + 'un cercle par groupe portant son effectif, un point de lecture et, si la fusion est active, le rayon de fusion en pointillés. '
    + 'Flèches pour déplacer le point de lecture, Page précédente ou suivante pour changer le pas, '
    + 'F pour la fusion, Origine pour recentrer, Espace pour le balayage.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches déplacent le point de lecture d’un demi-pas, '
    + 'Page précédente et Page suivante changent la taille de cellule, F bascule la fusion, '
    + 'Origine recentre le point et Espace lance ou arrête le balayage. '
    + 'Le pointeur fait le même travail que les flèches. Chaque valeur est aussi écrite dans les tableaux.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e081-legend',
    'Légende : ● groupe de 4 marqueurs ou plus · ◆ groupe de 2 ou 3 · · marqueur seul (croix sur le canevas). '
    + 'Le nombre est toujours écrit au centre du cercle et la forme distingue l’effectif, même en niveaux de gris.');
  legend.id = ID.legend;

  const mesuresTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  mesuresTitle.id = ID.mesuresTitle;
  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  /* E081-09 : bandeau de lecture, annoncé aux technologies d'assistance. */
  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  readout.textContent = 'Le modèle de regroupement est prêt.';

  const reset = ctx.el('button', 'geography-v2-e081-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucune donnée, police ou image n’est chargée, aucune requête réseau '
    + 'et aucun tirage aléatoire n’interviennent. Les grandeurs ci-dessus sont des textes réels, lisibles et indexables '
    + 'même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(
    title, lead, staticFacts(ctx), staticComparison(ctx), fieldset, fusion, play,
    canvas, canvasDesc, legend, buildGroupTable(ctx),
    mesuresTitle, buildMeasuresTable(ctx),
    defiTitle, buildDefi(ctx), readout, reset, note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  const pasRadios = PAS_ORDER.map((k) => document.getElementById(`${ID.pas}-${k}`));
  S.tbody = document.getElementById(ID.tbody);
  return {
    panel,
    pasRadios,
    fusion, play, canvas, readout, reset,
    fresh: true,
  };
}

/* ---------- E081-02 : badge de statut sur la carte existante ---------- */

function badgeText() {
  return 'Regroupement déterministe · distance euclidienne · cellules 60 / 100 / 160 · union-find × 1,8 · zéro réseau, zéro aléa.';
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e081-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E081-03 / E081-05 / E081-06 / E081-08 : rendu du laboratoire ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = Math.max(160, cv.clientWidth || 320);
  const cssH = cssW * (MAP_H / MAP_W);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const sx = cssW / MAP_W;
  const sy = cssH / MAP_H;
  const cell = PASSES[S.pasIndex].cell;
  const near = nearestGroup(S.groups, S.focus.x, S.focus.y);

  /* Cadre. */
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  /* E081-04 — grille de cellules : traits fins en pointillés. */
  g.strokeStyle = 'rgba(214,207,193,.18)';
  g.lineWidth = 1;
  g.setLineDash([2, 4]);
  for (let x = 0; x <= MAP_W; x += cell) {
    const gx = x * sx;
    g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, cssH); g.stroke();
  }
  for (let y = 0; y <= MAP_H; y += cell) {
    const gy = y * sy;
    g.beginPath(); g.moveTo(0, gy); g.lineTo(cssW, gy); g.stroke();
  }
  g.setLineDash([]);

  /* E081-06 — rayon de fusion, cercle en pointillés longs autour du groupe proche. */
  if (S.fusion && near.group) {
    g.strokeStyle = 'rgba(230,185,111,.55)';
    g.setLineDash([5, 3]);
    g.beginPath();
    g.arc(near.group.cx * sx, near.group.cy * sy, fusionRadius(cell) * sx, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }

  /* E081-03 — marqueurs individuels, points fins : le groupe est une collection. */
  g.fillStyle = 'rgba(232,230,224,.55)';
  MARQUEURS.forEach((m) => {
    g.beginPath();
    g.arc(m.x * sx, m.y * sy, Math.max(1.4, cssW * 0.005), 0, Math.PI * 2);
    g.fill();
  });

  /* E081-05 / E081-08 — un cercle par groupe, rayon = fonction de l'effectif,
     nombre écrit au centre ; un marqueur seul est une croix (forme, pas couleur). */
  S.groups.forEach((grp) => {
    const gx = grp.cx * sx;
    const gy = grp.cy * sy;
    if (grp.count === 1) {
      const r = Math.max(3, cssW * 0.012);
      g.strokeStyle = 'rgba(244,214,158,.95)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(gx - r, gy); g.lineTo(gx + r, gy);
      g.moveTo(gx, gy - r); g.lineTo(gx, gy + r);
      g.stroke();
      return;
    }
    const r = Math.max(6, Math.min(cssW * 0.16, cssW * (0.028 + grp.count * 0.012)));
    const active = grp === near.group;
    g.strokeStyle = active ? 'rgba(244,214,158,.98)' : 'rgba(217,177,102,.9)';
    g.lineWidth = active ? 2.4 : 1.5;
    g.beginPath();
    g.arc(gx, gy, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = active ? 'rgba(244,214,158,.98)' : 'rgba(217,177,102,.9)';
    g.font = `bold ${Math.max(8, Math.round(cssW * 0.034))}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(grp.count), gx, gy + 0.5);
    g.textAlign = 'start';
    g.textBaseline = 'alphabetic';
  });

  /* Point de lecture : une croix, redondée en texte dans la région de statut. */
  const fx = S.focus.x * sx;
  const fy = S.focus.y * sy;
  g.strokeStyle = 'rgba(230,185,111,.95)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(fx - 7, fy); g.lineTo(fx + 7, fy);
  g.moveTo(fx, fy - 7); g.lineTo(fx, fy + 7);
  g.stroke();
  g.beginPath();
  g.arc(fx, fy, 3, 0, Math.PI * 2);
  g.stroke();
}

/* ---------- E081-07 / E081-09 : tableaux et bandeau de lecture ---------- */

function fillMeasuresTable() {
  const c = S.cells;
  const m = measures();
  if (c.cellule) c.cellule.textContent = `${num(m.cell, 0)} unités`;
  if (c.rayon) c.rayon.textContent = `${num(m.radius, 0)} unités${S.fusion ? '' : ' (fusion inactive)'}`;
  if (c.groupes) c.groupes.textContent = num(m.groupCount, 0);
  if (c.singles) c.singles.textContent = num(m.singletons, 0);
  if (c.max) c.max.textContent = `${num(m.maxCount, 0)} marqueurs (${num((m.maxCount / MARQUEURS.length) * 100, 1)} %)`;
  if (c.compression) c.compression.textContent = num(m.compression, 2);
  if (c.reference) c.reference.textContent = `${num(m.ratioReference, 2)} × plus de marqueurs que de groupes (réf. 18)`;
}

/* E081-09 : annonce unique de toute action, en toutes lettres. */
function updateReadout(cause = 'initial') {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const m = measures();
  const near = nearestGroup(S.groups, S.focus.x, S.focus.y);
  const verbs = {
    balayage: 'Balayage en cours',
    clavier: 'Lecture au clavier',
    pointeur: 'Lecture au pointeur',
    pas: 'Taille de cellule modifiée',
    fusion: 'Fusion modifiée',
    demarrage: 'Balayage lancé',
    arret: 'Balayage arrêté',
    initial: 'Regroupement initial',
    reset: 'Valeurs par défaut',
  };
  const centre = near.group
    ? `groupe de ${num(near.group.count, 0)} marqueur${near.group.count > 1 ? 's' : ''} centré en ${num(near.group.cx, 0)} ; ${num(near.group.cy, 0)}`
    : 'aucun groupe';
  const text = `${verbs[cause] || 'Regroupement'} · ${num(MARQUEURS.length, 0)} marqueurs, `
    + `${num(m.groupCount, 0)} groupes, compression ${num(m.compression, 2)} · cellule ${num(m.cell, 0)} unités, `
    + `fusion ${S.fusion ? `activée (rayon ${num(m.radius, 0)} unités)` : 'désactivée'} · `
    + `groupe le plus proche du point de lecture : ${centre}.`;
  if (n.textContent !== text) n.textContent = text;
}

/* ---------- Application de l'état ---------- */

function refreshGroups() {
  const cell = PASSES[S.pasIndex].cell;
  S.groups = clusterGroups(cell, S.fusion, fusionRadius(cell));
  fillGroupTable();
}

function applyState(cause = 'initial') {
  const n = S.nodes;
  if (!n || !n.canvas) return;

  n.pasRadios.forEach((r) => {
    if (!r) return;
    r.checked = r.value === PAS_ORDER[S.pasIndex];
  });

  if (n.fusion) {
    n.fusion.textContent = S.fusion ? 'Fusion : activée' : 'Fusion : désactivée';
    n.fusion.setAttribute('aria-pressed', S.fusion ? 'true' : 'false');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Lancer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E081Reduced = S.reduced ? '1' : '0';

  if (S.defiSpans) {
    DEFI_ETAPES.forEach(([key]) => {
      const span = S.defiSpans[key];
      if (span) span.textContent = DEFI[key];
    });
  }

  refreshGroups();
  fillMeasuresTable();
  updateReadout(cause);
  drawLab();
}

function resetState() {
  S.pasIndex = 1;
  S.fusion = false;
  S.playing = false;
  S.elapsed = 0;
  S.focus = clampCoord(MAP_W / 2, MAP_H / 2);
  stopLoop();
  applyState('reset');
}

function setPas(index) {
  S.pasIndex = Math.max(0, Math.min(PASSES.length - 1, index));
  applyState('pas');
}

function toggleFusion() {
  S.fusion = !S.fusion;
  applyState('fusion');
}

/* ---------- E081-10 : boucle rAF unique, pauses multiples ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Horloge unique : une seule fonction tick, un seul identifiant rafId.
   Le point suit une courbe déterministe (sin de l'horodatage), sans aléa. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.playing) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = Math.min(64, Math.max(0, ts - S.lastTs));
    S.elapsed = (S.elapsed + dt) % SWEEP_MS;
    const phase = (S.elapsed / SWEEP_MS) * Math.PI * 2;
    S.focus = clampCoord(
      MAP_W / 2 + (MAP_W / 2 - 20) * Math.sin(phase),
      MAP_H / 2 + (MAP_H / 2 - 20) * Math.sin(phase * 0.75 + 0.5),
    );
  }
  S.lastTs = ts;
  drawLab();
  updateReadout('balayage');
  S.rafId = requestAnimationFrame(tick);
}

/* ---------- E081-09 / E081-10 : accessibilité, mouvement réduit, robustesse ---------- */

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l'écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) {
          S.playing = false;
          stopLoop();
          applyState('arret');
        } else {
          startLoop();
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

function togglePlay() {
  if (S.reduced) {
    S.focus = clampCoord(
      S.focus.x < MAP_W / 2 ? MAP_W * 0.75 : MAP_W * 0.25,
      S.focus.y,
    );
    applyState('clavier');
    return;
  }
  S.playing = !S.playing;
  if (!S.playing) stopLoop(); else startLoop();
  applyState(S.playing ? 'demarrage' : 'arret');
}

/* Câblage des contrôles (une seule fois sur un panneau fraîchement créé). */
function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.pasRadios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      setPas(PAS_ORDER.indexOf(radio.value));
    });
  });

  n.fusion.addEventListener('click', toggleFusion);
  n.play.addEventListener('click', togglePlay);
  n.reset.addEventListener('click', resetState);

  n.canvas.addEventListener('keydown', (event) => {
    const step = PASSES[S.pasIndex].cell / 2;
    const c = S.focus;
    let used = true;
    if (event.key === 'ArrowRight') S.focus = clampCoord(c.x + step, c.y);
    else if (event.key === 'ArrowLeft') S.focus = clampCoord(c.x - step, c.y);
    else if (event.key === 'ArrowDown') S.focus = clampCoord(c.x, c.y + step);
    else if (event.key === 'ArrowUp') S.focus = clampCoord(c.x, c.y - step);
    else if (event.key === 'PageNext' || event.key === 'PageDown') setPas(S.pasIndex + 1);
    else if (event.key === 'PagePrevious' || event.key === 'PageUp') setPas(S.pasIndex - 1);
    else if (event.key === 'f' || event.key === 'F') toggleFusion();
    else if (event.key === 'Home') S.focus = clampCoord(MAP_W / 2, MAP_H / 2);
    else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
    else used = false;
    if (used) {
      event.preventDefault();
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home'].includes(event.key)) {
        drawLab();
        updateReadout('clavier');
      }
    }
  });

  /* E081-09 — glisser sur le canevas : même relation que les flèches. */
  let drag = false;
  n.canvas.addEventListener('pointerdown', (event) => {
    drag = true;
    try { n.canvas.setPointerCapture(event.pointerId); } catch { /* capture indisponible */ }
    movePointer(event);
  });
  const movePointer = (event) => {
    if (!drag) return;
    const rect = n.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    S.focus = clampCoord(
      ((event.clientX - rect.left) / rect.width) * MAP_W,
      ((event.clientY - rect.top) / rect.height) * MAP_H,
    );
    drawLab();
    updateReadout('pointeur');
  };
  n.canvas.addEventListener('pointermove', movePointer);
  const endDrag = () => { drag = false; };
  n.canvas.addEventListener('pointerup', endDrag);
  n.canvas.addEventListener('pointercancel', endDrag);
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e081-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e081-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e081-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e081-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e081-panel .geography-v2-e081-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e081-panel .geography-v2-e081-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e081-panel .geography-v2-e081-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e081-panel .geography-v2-e081-table th,
.geography-v2-e081-panel .geography-v2-e081-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e081-panel .geography-v2-e081-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e081-panel .geography-v2-e081-table tbody th{color:var(--gold,#e6b96f)}
#geography-v2-e081-pas{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e081-pas legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e081-panel .geography-v2-e081-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e081-panel .geography-v2-e081-choix input{
  min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e081-canvas{
  display:block;width:100%;max-width:360px;height:auto;aspect-ratio:3/2;
  margin:8px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.32);touch-action:none;
}
.geography-v2-e081-panel .geography-v2-e081-legend{
  color:var(--gold,#e6b96f);font-variant-numeric:tabular-nums;
}
.geography-v2-e081-panel .geography-v2-e081-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e081-panel .geography-v2-e081-defi li{margin:3px 0}
.geography-v2-e081-panel .geography-v2-e081-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e081-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e081-panel .geography-v2-e081-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e081-panel .geography-v2-e081-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e081-panel .geography-v2-e081-btn[aria-pressed="true"]{
  border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.16);
}
.geography-v2-e081-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e081-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e081-panel[data-geography-v2-e081-reduced="1"] .geography-v2-e081-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e081-panel .geography-v2-e081-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e081-panel{font-size:10px;padding:9px}
  .geography-v2-e081-panel .geography-v2-e081-choix{margin-right:4px}
  #geography-v2-e081-canvas{max-width:100%}
}
@media (forced-colors:active){
  .geography-v2-e081-panel{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E081', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState('initial');
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
