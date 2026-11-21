import { register } from './registry.js';

/* Lentille E048 — vue GEOGRAPHIE.
 * Thème : sélection active d’un lieu.
 *
 * Les dix chantiers E048-01 … E048-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E048.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n’est qu’un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e048';
const PANEL_ID = 'geography-e048-panel';
const TITLE_ID = 'geography-e048-title';
const PLACE_ID = 'geography-e048-place';
const VISIBLE_ID = 'geography-e048-visible';
const VISIBLE_OUT_ID = 'geography-e048-visible-value';
const INDEX_OUT_ID = 'geography-e048-index-value';
const CANVAS_ID = 'geography-e048-canvas';
const READOUT_ID = 'geography-e048-readout';
const PLAY_ID = 'geography-e048-play';
const LEGEND_ID = 'geography-e048-legend';
const BADGE_ID = 'geography-e048-badge';
const TABLE_ID = 'geography-e048-table';

/* Lieux réels, relevés dans src/data/dataset.js (aucune coordonnée fabriquée).
   Le laboratoire est un miroir schématique : il n’écrit pas state.placeIndex. */
const PLACES = [
  { key: 'marseille', label: 'Marseille', lat: 43.296346, lon: 5.369889 },
  { key: 'alise', label: 'Alise-Sainte-Reine', lat: 47.5375, lon: 4.49083333 },
  { key: 'lyon', label: 'Lyon', lat: 45.7578, lon: 4.8322 },
  { key: 'versailles', label: 'Versailles', lat: 48.8053, lon: 2.135 },
  { key: 'paris', label: 'Paris', lat: 48.856578, lon: 2.351828 },
];

/* Constantes canoniques. */
const R_TERRE = 6371;                 /* rayon moyen de la Terre, km */
const RAD = Math.PI / 180;
const RAYON_ACTIF = 7;                /* geography.js : rayon du marqueur actif */
const RAYON_INACTIF = 4;              /* geography.js : rayon des autres marqueurs */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  index: 0,
  visible: PLACES.length,
  playing: false,
  phase: 0,
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

/* Voisin le plus proche du lieu actif parmi un sous-ensemble de lieux. */
function nearestDistance(index, count) {
  let best = Infinity;
  for (let j = 0; j < count; j += 1) {
    if (j === index) continue;
    const d = haversine(PLACES[index], PLACES[j]);
    if (d < best) best = d;
  }
  return best === Infinity ? null : best;
}

/* Le lieu actif est-il dans le cadre affiché par le filtre schématique ? */
function dansLeCadre(index, count) {
  return index >= 0 && index < count;
}

/* Part d’un lieu actif parmi les lieux affichés. */
function partSelection(count) {
  return 1 / count;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e048-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e048-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e048-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e048-panel p{margin:5px 0;max-width:68ch}
#geography-e048-panel .geography-e048-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e048-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e048-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e048-table th,#geography-e048-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e048-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e048-place{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e048-place legend{padding:0 4px;color:var(--muted)}
#geography-e048-panel .geography-e048-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e048-panel .geography-e048-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e048-visible{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e048-visible-value,#geography-e048-index-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e048-canvas{
  display:block;width:100%;height:210px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e048-legend{font-size:10px;color:var(--muted)}
#geography-e048-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e048-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e048-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e048-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e048-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e048-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e048-panel[data-geography-e048-reduced="1"] button,
#geography-e048-panel[data-geography-e048-reduced="1"] .geography-e048-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e048-panel button,.geography-e048-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e048-panel{font-size:10px;padding:9px}
  #geography-e048-canvas{height:180px}
  #geography-e048-panel .geography-e048-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une vue géographique ne retient qu’un seul lieu actif à la fois. Dans la coque, state.placeIndex est la source unique de vérité : le store le born entre 0 et le nombre de lieux, et stepPlace(delta) le décale d’un pas. Changer de sélection ne déplace aucun lieu sur la carte.',
    'Trois représentations restent synchronisées par ce seul indice : le marqueur SVG porteur de la classe is-active (rayon 7 contre 4 pour les autres, aria-pressed à « true »), l’élément de liste marqué aria-current à « true », et le panneau de détail qui affiche nom, coordonnées et source du lieu courant, précédés du compteur « Lieu N / M ».',
    'Sélection et visibilité sont deux états distincts. La recherche et le périmètre décident combien de lieux sont affichés ; parmi eux, un seul est actif. Si le lieu actif sort du cadre, le focus clavier du marqueur revient au premier lieu encore visible, mais le détail continue de décrire la sélection.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e048-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Les représentations de l’état actif, telles que les produit la vue GEOGRAPHIE.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Représentation', 'Signal technique', 'Valeur quand le lieu est actif'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Marqueur SVG', '.geo-marker.is-active · aria-pressed="true"', 'Un seul marqueur agrandi : rayon 7, contre 4 pour les marqueurs inactifs.'],
    ['Liste filtrée', '.c3b-place-item[aria-current="true"]', 'Un seul élément courant, quel que soit le nombre de lieux affichés.'],
    ['Panneau de détail', '.geo-title · .geo-coords · .geo-source', 'Nom, coordonnées et source du lieu sélectionné, et lui seul.'],
    ['Compteur', '.view-kicker « Lieu N / M »', 'Rang 1 à M du lieu actif sur l’effectif total.'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const nodes = { panel: existant, fresh: false };
    for (const p of PLACES) nodes[p.key] = document.getElementById(`geography-e048-place-${p.key}`);
    nodes.visible = document.getElementById(VISIBLE_ID);
    nodes.visibleOut = document.getElementById(VISIBLE_OUT_ID);
    nodes.indexOut = document.getElementById(INDEX_OUT_ID);
    nodes.canvas = document.getElementById(CANVAS_ID);
    nodes.readout = document.getElementById(READOUT_ID);
    nodes.play = document.getElementById(PLAY_ID);
    nodes.legend = document.getElementById(LEGEND_ID);
    return nodes;
  }

  const panel = ctx.el('section', 'geography-e048-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'La sélection active d’un lieu');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un seul lieu est actif à la fois. Ce laboratoire montre comment un indice unique commande le marqueur, la liste et le panneau de détail, et comment il se distingue du simple fait d’être affiché.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = PLACE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Lieu actif (choix unique)';
  fieldset.appendChild(legend);
  PLACES.forEach((place) => {
    const lab = ctx.el('label', 'geography-e048-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e048-place';
    radio.id = `geography-e048-place-${place.key}`;
    radio.value = place.key;
    radio.checked = S.index === PLACES.indexOf(place);
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(place.label));
    fieldset.appendChild(lab);
  });

  const note = ctx.el('p', '', 'Lieux relevés dans le jeu de données local (dataset.js). Ce laboratoire est un miroir schématique : il illustre le mécanisme sans modifier la sélection de la vue.');

  const indexP = ctx.el('p', '');
  indexP.appendChild(document.createTextNode('Lieu actif : '));
  const indexOut = document.createElement('span');
  indexOut.id = INDEX_OUT_ID;
  indexP.appendChild(indexOut);

  const sub = ctx.el('h3', '', 'Sélection et visibilité ne sont pas la même chose');
  const visibleRow = ctx.el('p', '');
  const visibleLabel = document.createElement('label');
  visibleLabel.setAttribute('for', VISIBLE_ID);
  visibleLabel.appendChild(document.createTextNode('Lieux affichés par le filtre : '));
  const visibleOut = document.createElement('span');
  visibleOut.id = VISIBLE_OUT_ID;
  visibleLabel.appendChild(visibleOut);
  visibleRow.appendChild(visibleLabel);

  const visible = document.createElement('input');
  visible.type = 'range';
  visible.id = VISIBLE_ID;
  visible.min = '1';
  visible.max = String(PLACES.length);
  visible.step = '1';
  visible.value = String(S.visible);
  visible.setAttribute('aria-label', 'Nombre de lieux affichés par le filtre, de 1 à 5');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Bande de lieux : le lieu actif porte un anneau, une croix et un rayon agrandi ; les autres sont de simples points. Flèches gauche et droite : changer de lieu actif ; flèches haut et bas : changer le nombre de lieux affichés.');

  const legendText = ctx.el('p', 'geography-e048-legend', 'Anneau plein, croix et rayon 7 : lieu actif · point simple de rayon 4 : lieu inactif · point creux grisé : lieu filtré hors cadre · halo pulsé : seul élément animé. Le libellé « ACTIF » accompagne toujours l’anneau : la forme, pas la couleur, porte l’information.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e048-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la pulsation' : '▶ Animer la pulsation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, note, indexP, sub, visibleRow, visible, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  const nodes = { panel, fresh: true };
  for (const p of PLACES) nodes[p.key] = document.getElementById(`geography-e048-place-${p.key}`);
  nodes.visible = visible;
  nodes.visibleOut = visibleOut;
  nodes.indexOut = indexOut;
  nodes.canvas = canvas;
  nodes.readout = readout;
  nodes.play = play;
  nodes.legend = legendText;
  return nodes;
}

/* ---------- Rendu du laboratoire (une seule grille, un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 210;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const padX = 30;
  const ligneY = cssH * 0.56;
  const iw = Math.max(10, cssW - padX * 2);
  const pas = iw / Math.max(1, PLACES.length - 1);
  const toX = (i) => padX + i * pas;

  /* Axe schématique : les lieux sont régulièrement espacés, position
     illustrative et non projection géographique (les distances réelles sont
     données en toutes lettres dans le readout). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(padX, ligneY);
  g.lineTo(padX + iw, ligneY);
  g.stroke();

  PLACES.forEach((place, i) => {
    const x = toX(i);
    const actif = i === S.index;
    const affiche = dansLeCadre(i, S.visible);

    /* Halo pulsé : seul élément animé, phase purement déterministe. */
    if (actif) {
      const rayon = 12 + S.phase * 12;
      g.strokeStyle = 'rgba(244,214,158,' + fmt(0.55 * (1 - S.phase), 2) + ')';
      g.lineWidth = 1.5;
      g.setLineDash([]);
      g.beginPath();
      g.arc(x, ligneY, rayon, 0, Math.PI * 2);
      g.stroke();
    }

    if (!affiche) {
      /* Lieu filtré : cercle creux en tirets, jamais une couleur seule. */
      g.strokeStyle = 'rgba(214,207,193,.5)';
      g.lineWidth = 1;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.arc(x, ligneY, RAYON_INACTIF, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    } else if (actif) {
      /* Marqueur actif : anneau plein + croix + rayon agrandi. */
      g.fillStyle = 'rgba(244,214,158,.18)';
      g.strokeStyle = 'rgba(244,214,158,1)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(x, ligneY, RAYON_ACTIF, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(244,214,158,1)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x - 5, ligneY); g.lineTo(x + 5, ligneY);
      g.moveTo(x, ligneY - 5); g.lineTo(x, ligneY + 5);
      g.stroke();
    } else {
      /* Marqueur inactif : point plein de rayon 4. */
      g.fillStyle = 'rgba(214,207,193,.85)';
      g.beginPath();
      g.arc(x, ligneY, RAYON_INACTIF, 0, Math.PI * 2);
      g.fill();
    }

    /* Libellé : le mot « ACTIF » accompagne l’anneau, indépendamment de la
       couleur et de la taille. */
    g.fillStyle = actif && affiche ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.8)';
    g.font = '10px sans-serif';
    const court = place.label.length > 13 ? place.label.slice(0, 12) + '…' : place.label;
    g.fillText(court, x - 22, ligneY + 30);
    if (actif && affiche) g.fillText('ACTIF', x - 13, ligneY - 20);
  });
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const actif = PLACES[S.index];
  const part = partSelection(S.visible);
  const proche = nearestDistance(S.index, S.visible);
  const plein = nearestDistance(S.index, PLACES.length);
  const cadre = dansLeCadre(S.index, S.visible);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Lieu actif : '));
  n.appendChild(fort(actif.label + ' (' + (S.index + 1) + '/' + PLACES.length + ')'));
  n.appendChild(document.createTextNode('. Un seul lieu est actif sur ' + S.visible + ' affiché(s), soit '));
  n.appendChild(fort(fmt(part * 100, 1) + ' %'));
  n.appendChild(document.createTextNode(' de sélection (référence sans filtre : ' + fmt(partSelection(PLACES.length) * 100, 1) + ' %). Voisin le plus proche : '));
  n.appendChild(fort(proche === null ? 'aucun' : fmt(proche, 1) + ' km'));
  n.appendChild(document.createTextNode(' (jeu complet : ' + fmt(plein, 1) + ' km, formule haversine, R = 6371 km). '));
  n.appendChild(document.createTextNode(cadre
    ? 'Le lieu actif est dans le cadre filtré : son marqueur porte le rayon 7 et aria-pressed à « true ».'
    : 'Le lieu actif est hors du cadre filtré : le détail le décrit encore, mais le focus clavier revient au premier marqueur visible.'));
}

function syncControls() {
  const n = S.nodes;
  for (const p of PLACES) {
    const radio = n[p.key];
    if (radio) radio.checked = S.index === PLACES.indexOf(p);
  }
  if (n.visible) n.visible.value = String(S.visible);
  if (n.visibleOut) n.visibleOut.textContent = String(S.visible) + ' / ' + PLACES.length;
  if (n.indexOut) n.indexOut.textContent = PLACES[S.index].label + ' — rang ' + (S.index + 1) + ' sur ' + PLACES.length;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la pulsation' : '▶ Animer la pulsation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
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
    if (S.playing && !reduced) S.phase = (S.phase + dt * 0.0009) % 1;
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
        if (panel) panel.dataset.geographyE048Reduced = mq.matches ? '1' : '0';
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
  const badge = ctx.el('div', 'geography-e048-badge', 'Un seul lieu est actif à la fois : state.placeIndex. Un marqueur agrandi (rayon 7, aria-pressed), un élément de liste courant (aria-current), un panneau de détail synchronisé — la visibilité est un autre état.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E048', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE048Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    for (const place of PLACES) {
      const radio = S.nodes[place.key];
      if (!radio) continue;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.index = PLACES.indexOf(place);
        syncControls();
      });
    }
    S.nodes.visible.addEventListener('input', () => {
      S.visible = Math.max(1, Math.min(PLACES.length, Math.round(Number(S.nodes.visible.value))));
      syncControls();
    });
    S.nodes.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    S.nodes.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        S.index = (S.index + step + PLACES.length) % PLACES.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.visible = Math.max(1, Math.min(PLACES.length, S.visible + step));
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
  if (S.playing) startLoop();
});
