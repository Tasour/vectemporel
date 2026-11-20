import { register } from './registry.js';

/*
 * Lentille E077 — vue GEOGRAPHIE.
 * Thème : export local de la carte (SVG/PNG), sans réseau.
 *
 * Les dix chantiers E077-01 … E077-10 sont réellement implémentés dans CE seul
 * module : aucun stub, aucun fichier partagé modifié. Tout le savoir est du
 * texte DOM sémantique lisible sans interaction ; le canvas n'est qu'un
 * laboratoire redondant, jamais la source exclusive d'une information.
 *
 * Contrat : register('E077', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille unique injectée sous l'identifiant `geography-e077`, tous les ids
 * préfixés `geography-e077-*`. Zéro journalisation, zéro réseau, zéro aléa,
 * au plus une requête d'animation en vol (suspendue sur document.hidden).
 *
 * L'export produit de vrais fichiers locaux : un SVG autonome (styles inlinés,
 * aucun appel distant) et un PNG rastérisé via canvas, tous deux téléchargés
 * par un Blob et une URL d'objet révoquée. Aucune ressource n'est requise
 * depuis le réseau. Le namespace SVG « http://www.w3.org/2000/svg » est un
 * identifiant de namespace XML, pas une requête : il n'est jamais résolu.
 */

const CSS_ID = 'geography-e077';
const SECTION_ID = 'geography-e077-section';
const MAP_W = 900;
const MAP_H = 620;
const BALAYAGE_MS = 2400; // ms pour un balayage complet de la tête d'export
const NARROW = '\u202f';
const MINUS = '\u2212';

/* Géométrie schématique, déterministe, explicitement présentée comme telle :
   il ne s'agit pas de coordonnées géographiques réelles (E077-01). */
const CONTOUR = [
  [118, 176], [226, 96], [368, 118], [508, 72], [660, 112],
  [752, 226], [730, 358], [638, 470], [470, 528], [300, 498], [176, 396],
];
const CHEMIN = [[250, 300], [380, 252], [520, 330], [650, 272]];
const NOEUDS = [
  { x: 250, y: 300, l: 'Nœud A' },
  { x: 380, y: 252, l: 'Nœud B' },
  { x: 520, y: 330, l: 'Nœud C' },
  { x: 650, y: 272, l: 'Nœud D' },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let format = 'svg';       // choix unique : radiogroupe, pas d'aria-pressed
let echelle = 1;          // facteur d'export 1..4
let playing = false;      // bascule indépendante de l'animation (aria-pressed)
let renders = 0;
let svgSource = '';       // cache du SVG autonome (indépendant de l'échelle)

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

const ko = (bytes) => num(bytes / 1024, 1);

function dprCap() {
  const raw = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  return Math.min(2, Math.max(1, raw));
}

/* E077-05 — nombre d'octets UTF-8 réels du SVG sérialisé (sans dépendance). */
function utf8Bytes(str) {
  let n = 0;
  for (let i = 0; i < str.length; i += 1) {
    const c = str.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i += 1; }
    else n += 3;
  }
  return n;
}

/* E077-05 — sérialisation d'un SVG autonome : tout est inline, aucun lien,
   aucune image, aucune police distante. Le seul « http » est le namespace XML. */
function buildStandaloneSvg() {
  if (svgSource) return svgSource;
  const pts = CONTOUR.map((p) => `${p[0]},${p[1]}`).join(' ');
  const line = CHEMIN.map((p) => `${p[0]},${p[1]}`).join(' ');
  let noeuds = '';
  NOEUDS.forEach((n, i) => {
    noeuds += `<circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 7 : 4}" fill="#e6b96f" stroke="#141414" stroke-width="1"/>`
      + `<text x="${n.x + 9}" y="${n.y + 3}" fill="#f4ead6" font-family="sans-serif" font-size="12">${n.l}</text>`;
  });
  const style = '.cadre{fill:#0b1017;stroke:#6b7280;stroke-width:2}'
    + '.contour{fill:none;stroke:#e6b96f;stroke-width:2;stroke-dasharray:7 5}'
    + '.chemin{fill:none;stroke:#f4d69e;stroke-width:2}';
  svgSource = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" role="img" aria-labelledby="geography-e077-export-title geography-e077-export-desc">',
    '<title id="geography-e077-export-title">Carte schématique — export local</title>',
    '<desc id="geography-e077-export-desc">Aperçu schématique autonome : contour, chemin et quatre nœuds. Aucune donnée géographique réelle, aucune ressource distante.</desc>',
    `<style>${style}</style>`,
    '<rect class="cadre" x="2" y="2" width="896" height="616" rx="8"/>',
    `<polygon class="contour" points="${pts}"/>`,
    `<polyline class="chemin" points="${line}"/>`,
    `<g>${noeuds}</g>`,
    '</svg>',
  ].join('\n');
  return svgSource;
}

/* E077-04 — grandeurs recalculées depuis leur formule, jamais fabriquées.
   Le viewBox reste 900×620 (référence issue de geography.js : MAP_W/MAP_H). */
function measureAt(s, dprOverride) {
  const dpr = finite(dprOverride) ? Math.min(2, Math.max(1, dprOverride)) : dprCap();
  const Wpx = Math.round(MAP_W * s * dpr);
  const Hpx = Math.round(MAP_H * s * dpr);
  const pixels = Wpx * Hpx;
  const rawBytes = pixels * 4;                 // RGBA non compressé
  const estPng = Math.round(rawBytes / 12);    // ordre de grandeur : compression 12:1
  const linear = s * dpr;
  return {
    s, dpr, Wpx, Hpx, pixels, rawBytes, estPng,
    linear, pixelFactor: linear * linear,
    svgBytes: utf8Bytes(buildStandaloneSvg()),
  };
}

const measures = () => measureAt(echelle);

/* Feuille de styles E077 : cadrée par l'id de section. Aucune règle ne déborde ;
   cibles ≥ 44 px, focus visible, aucune info portée par la seule couleur. */
const RULES = `
#geography-e077-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
#geography-e077-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
#geography-e077-section h3 {
  margin: 12px 0 5px; color: var(--gold-bright); font-size: 11px; font-weight: 600;
}
.geography-e077-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geography-e077-line:last-child { margin-bottom: 0; }
.geography-e077-line strong { color: var(--gold-bright); font-weight: 600; }
.geography-e077-value { color: var(--ink); }
.geography-e077-liste { margin: 4px 0 8px; padding-left: 18px; }
.geography-e077-liste li { margin: 0 0 4px; }
#geography-e077-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-variant-numeric: tabular-nums; font-size: 10px; }
#geography-e077-table caption { text-align: left; margin-bottom: 4px; color: var(--muted); }
#geography-e077-table th, #geography-e077-table td { border: 1px solid var(--line); padding: 4px 5px; text-align: left; vertical-align: top; }
#geography-e077-table th { color: var(--gold-bright); font-weight: 600; }
#geography-e077-format { margin: 8px 0; padding: 7px 8px; border: 1px solid var(--line); border-radius: 8px; }
#geography-e077-format legend { padding: 0 4px; color: var(--muted); }
.geography-e077-choix {
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px;
  margin-right: 10px; cursor: pointer;
}
.geography-e077-choix input { min-width: 20px; min-height: 20px; accent-color: var(--gold); }
#geography-e077-echelle { width: 100%; min-height: 36px; accent-color: var(--gold); }
#geography-e077-echelle-value { color: var(--gold-bright); font-weight: 600; font-variant-numeric: tabular-nums; }
#geography-e077-figure { margin: 8px 0; text-align: center; }
#geography-e077-canvas {
  display: block; width: 100%; max-width: 320px; height: auto; aspect-ratio: 900 / 620;
  margin: 0 auto; touch-action: manipulation; cursor: default;
  border: 1px solid var(--line); border-radius: 6px; background: rgba(0,0,0,.28);
}
.geography-e077-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
#geography-e077-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
#geography-e077-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
#geography-e077-actions button {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
#geography-e077-actions button:hover { border-color: var(--gold); background: rgba(230,185,111,.08); }
#geography-e077-play[aria-pressed="true"] { border-color: var(--gold-bright); background: rgba(230,185,111,.12); }
#geography-e077-section :focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
.geography-e077-badge {
  position: absolute; left: 16px; bottom: 14px; z-index: 3; max-width: 64%;
  padding: 4px 8px; border: 1px solid var(--gold); border-radius: 6px;
  background: rgba(8,12,18,.9); color: var(--gold-bright);
  font-size: 10px; line-height: 1.4; pointer-events: none;
}
#geography-e077-section[data-geography-e077-reduced="1"] * { transition: none !important; animation: none !important; }
@media (max-width: 620px) {
  #geography-e077-section { padding: 9px 10px; font-size: 10px; }
  .geography-e077-choix { margin-right: 4px; }
  #geography-e077-canvas { max-width: 240px; }
}
@media (prefers-reduced-motion: reduce) {
  #geography-e077-section *, .geography-e077-badge { transition: none !important; animation: none !important; }
}
`;

/* E077-07 — aperçu déterministe dessiné dans un seul canvas. La même
   géométrie sert à l'aperçu, au SVG sérialisé et au PNG rastérisé. */
function drawScene(painter, X, Y, sc) {
  painter.lineJoin = 'round';
  painter.strokeStyle = '#6b7280';
  painter.lineWidth = 1.5;
  painter.setLineDash([]);
  painter.strokeRect(X(2), Y(2), MAP_W * sc - 4, MAP_H * sc - 4);

  painter.strokeStyle = '#e6b96f';
  painter.lineWidth = 1.6;
  painter.setLineDash([7, 5]);
  painter.beginPath();
  CONTOUR.forEach((p, i) => { if (i === 0) painter.moveTo(X(p[0]), Y(p[1])); else painter.lineTo(X(p[0]), Y(p[1])); });
  painter.closePath();
  painter.stroke();

  painter.strokeStyle = '#f4d69e';
  painter.setLineDash([]);
  painter.beginPath();
  CHEMIN.forEach((p, i) => { if (i === 0) painter.moveTo(X(p[0]), Y(p[1])); else painter.lineTo(X(p[0]), Y(p[1])); });
  painter.stroke();

  NOEUDS.forEach((n, i) => {
    painter.fillStyle = '#e6b96f';
    painter.beginPath();
    painter.arc(X(n.x), Y(n.y), i === 0 ? 5 : 3.2, 0, Math.PI * 2);
    painter.fill();
    painter.fillStyle = '#f4ead6';
    painter.font = '10px sans-serif';
    painter.fillText(n.l, X(n.x) + 8, Y(n.y) + 3);
  });
}

/* E077-05 / E077-07 / E077-08 — aperçu du format : vecteur (contour net) ou
   matrice (trame de points). Le code est redondé par une étiquette texte. */
function drawPreview(canvas, scene) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const painter = canvas.getContext('2d');
  if (!painter) return;

  const cssW = Math.max(180, Math.min(320, canvas.clientWidth || 280));
  const cssH = Math.round(cssW * (MAP_H / MAP_W));
  const dpr = dprCap();
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);
  painter.fillStyle = '#0b1017';
  painter.fillRect(0, 0, cssW, cssH);

  const sc = Math.min((cssW - 14) / MAP_W, (cssH - 14) / MAP_H);
  const ox = (cssW - MAP_W * sc) / 2;
  const oy = (cssH - MAP_H * sc) / 2;
  const X = (x) => ox + x * sc;
  const Y = (y) => oy + y * sc;

  drawScene(painter, X, Y, sc);

  if (scene.format() === 'png') {
    painter.fillStyle = 'rgba(244,214,158,.55)';
    for (let gx = 24; gx < MAP_W - 10; gx += 36) {
      for (let gy = 24; gy < MAP_H - 10; gy += 36) {
        painter.fillRect(X(gx), Y(gy), 1.5, 1.5);
      }
    }
    painter.fillStyle = '#f4ead6';
    painter.font = '9px sans-serif';
    painter.fillText('Matrice · points', 8, cssH - 7);
  } else {
    painter.fillStyle = '#f4ead6';
    painter.font = '9px sans-serif';
    painter.fillText('Vecteur · contour', 8, cssH - 7);
  }

  if (scene.playing) {
    painter.strokeStyle = '#ffffff';
    painter.lineWidth = 1.4;
    painter.setLineDash([3, 3]);
    const sx = ox + scene.scan * MAP_W * sc;
    painter.beginPath();
    painter.moveTo(sx, oy);
    painter.lineTo(sx, oy + MAP_H * sc);
    painter.stroke();
    painter.setLineDash([]);
  }
}

/* E077-10 — une seule frame, court-circuitée quand l'onglet est masqué. */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.canvas || !scene.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return; // pause hors écran
  if (scene.playing && !scene.reduced()) {
    if (scene.last === null) scene.last = timestamp;
    const dt = Math.min(80, timestamp - scene.last);
    scene.last = timestamp;
    scene.scan = (scene.scan + dt / BALAYAGE_MS) % 1;
    drawPreview(scene.canvas, scene);
    ensureLoop();
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      scene.play.textContent = 'Lancer le balayage d’export';
      scene.play.setAttribute('aria-pressed', 'false');
    }
  }
}

function ensureLoop() {
  if (typeof requestAnimationFrame !== 'function') return; // pas de boucle sans rAF
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  frame = requestAnimationFrame(loop);
}

/* ---------- Téléchargement local (Blob + URL d'objet, jamais le réseau) ---------- */

function downloadBlob(blob, filename) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  if (a.parentNode) a.parentNode.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function exportSvg(scene) {
  if (typeof Blob === 'undefined') {
    updateLive(scene, 'export SVG indisponible (Blob absent)');
    return;
  }
  const text = buildStandaloneSvg();
  const ok = downloadBlob(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }), 'carte-schematique-export.svg');
  updateLive(scene, ok
    ? `SVG téléchargé : ${num(utf8Bytes(text), 0)} octets, styles inlinés, zéro ressource distante`
    : 'export SVG indisponible dans ce contexte');
}

/* E077-06 — rastérisation PNG : la géométrie est redessinée sur un canvas
   hors écran aux dimensions calculées, puis convertie en Blob local. */
function exportPng(scene) {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') {
    updateLive(scene, 'export PNG indisponible (contexte inadapté)');
    return;
  }
  const m = measures();
  const off = document.createElement('canvas');
  off.width = m.Wpx;
  off.height = m.Hpx;
  const painter = off.getContext('2d');
  if (!painter) {
    updateLive(scene, 'export PNG indisponible (canvas 2D absent)');
    return;
  }
  painter.fillStyle = '#0b1017';
  painter.fillRect(0, 0, m.Wpx, m.Hpx);
  const sc = Math.min(m.Wpx / MAP_W, m.Hpx / MAP_H);
  const X = (x) => x * sc;
  const Y = (y) => y * sc;
  drawScene(painter, X, Y, sc);

  const finish = (blob) => {
    const ok = blob && downloadBlob(blob, 'carte-schematique-export.png');
    updateLive(scene, ok
      ? `PNG téléchargé : ${m.Wpx}×${m.Hpx} px, ${num(m.pixels, 0)} pixels, ${ko(m.estPng)} Ko estimés`
      : 'export PNG indisponible dans ce contexte');
  };
  if (typeof off.toBlob === 'function') {
    off.toBlob(finish, 'image/png');
  } else if (typeof off.toDataURL === 'function') {
    try {
      const bytes = Math.round((off.toDataURL('image/png').length * 3) / 4);
      const ok = downloadBlob(new Blob([off.toDataURL('image/png')], { type: 'image/png' }), 'carte-schematique-export.png');
      updateLive(scene, ok
        ? `PNG téléchargé : ${m.Wpx}×${m.Hpx} px, ${num(bytes, 0)} octets (repli data URL)`
        : 'export PNG indisponible dans ce contexte');
    } catch {
      updateLive(scene, 'export PNG indisponible (échec du repli)');
    }
  } else {
    updateLive(scene, 'export PNG indisponible (aucun encodeur)');
  }
}

/* E077-09 — région live unique, relatée en texte, jamais par la couleur. */
function updateLive(scene, lastAction) {
  if (!scene) return;
  const m = measures();
  const nom = scene.format() === 'svg' ? 'SVG (vecteur)' : 'PNG (matrice)';
  scene.readout.textContent =
    `Format ${nom} · échelle ×${m.s} · DPR ${num(m.dpr, 0)}. `
    + `PNG : ${num(m.Wpx, 0)}×${num(m.Hpx, 0)} px (référence native ${MAP_W}×${MAP_H} px ; `
    + `facteur linéaire ×${num(m.linear, 2)}, surface ×${num(m.pixelFactor, 2)}). `
    + `Taille PNG estimée ≈ ${ko(m.estPng)} Ko (brut non compressé ${ko(m.rawBytes)} Ko, hypothèse 12:1). `
    + `SVG : viewBox ${MAP_W}×${MAP_H} constant, ${num(m.svgBytes, 0)} octets sérialisés, net à tout zoom.`
    + (lastAction ? ` Dernière action : ${lastAction}.` : '');
  scene.readout.setAttribute('data-geography-e077-action', lastAction ? 'oui' : 'non');
}

function refresh(scene) {
  if (!scene) return;
  scene.echelleOut.textContent = `×${echelle}`;
  scene.download.textContent = format === 'svg'
    ? '⬇ Télécharger le SVG autonome'
    : '⬇ Télécharger le PNG raster';
  scene.download.setAttribute('aria-label', format === 'svg'
    ? 'Télécharger la carte au format SVG vectoriel autonome, sans réseau'
    : 'Télécharger la carte au format PNG matriciel, sans réseau');
  scene.radios.forEach((radio) => {
    radio.checked = radio.value === format;
  });
  scene.layout.setAttribute('data-geography-e077-format', format);
  scene.layout.setAttribute('data-geography-e077-echelle', String(echelle));
  updateLive(scene, null);
  drawPreview(scene.canvas, scene);
}

/* E077-10 — installation unique et silencieuse des écouteurs globaux. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
    } else if (latest && latest.playing) {
      ensureLoop();
    }
  });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') query.addEventListener('change', ensureLoop);
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

function line(ctx, parent, index, label, text, valueId) {
  const paragraph = ctx.el('p', 'geography-e077-line');
  paragraph.id = `geography-e077-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(ctx.el('strong', '', `E077-${String(index).padStart(2, '0')} · ${label}. `));
  const value = ctx.el('span', 'geography-e077-value', text);
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
  const section = ctx.el('section', 'geography-e077-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Export local de la carte : SVG et PNG sans réseau');
  section.setAttribute('data-sim', 'export-local-carte');
  section.appendChild(ctx.el('h2', '', 'Exporter la carte localement — SVG et PNG, sans réseau'));

  /* E077-01 — principe, énoncé en toutes lettres. */
  const intro = ctx.el('p', 'geography-e077-line');
  intro.id = 'geography-e077-intro';
  intro.appendChild(ctx.el('strong', '', 'E077-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'Exporter une carte revient à sérialiser sa géométrie dans un format autonome. '
    + 'Le SVG décrit des formes vectorielles (net à tout zoom) ; le PNG décrit une matrice de pixels '
    + '(taille fixe). Ici, tout se fabrique dans le navigateur : aucun tuile, aucun service, aucun appel réseau. '
    + 'L’aperçu est schématique et ne prétend pas représenter des coordonnées réelles.'
  ));
  section.appendChild(intro);

  const faits = ctx.el('ul', 'geography-e077-liste');
  faits.id = 'geography-e077-faits';
  [
    'Un SVG autonome inliningue son style et ne référence aucune image, police ou feuille distante : il s’ouvre hors ligne.',
    'Un PNG est rastérisé sur un canvas puis encodé localement en Blob ; sa netteté dépend du nombre de pixels à l’export.',
    'Le téléchargement passe par une URL d’objet révoquée après usage : aucun octet ne quitte l’appareil.',
  ].forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e077-fait-${i}`;
    faits.appendChild(item);
  });
  section.appendChild(faits);

  /* E077-02 — tableau comparatif avec grandeurs chiffrées et références. */
  const table = document.createElement('table');
  table.id = 'geography-e077-table';
  const tableCaption = document.createElement('caption');
  tableCaption.textContent = 'Comparaison à référence égale : viewBox natif 900×620 (geography.js, MAP_W/MAP_H).';
  table.appendChild(tableCaption);
  const ref = measureAt(2, 2);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Propriété', 'SVG (vecteur)', 'PNG (matrice)', 'Remarque'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const svgInit = utf8Bytes(buildStandaloneSvg());
  [
    ['Cadre natif', 'viewBox 900×620', '900×620 px', 'référence commune'],
    ['Échelle ×2, DPR 2', 'viewBox inchangé', `${num(ref.Wpx, 0)}×${num(ref.Hpx, 0)} px`, '×4 linéaire, ×16 surface'],
    ['Taille estimée', `${num(svgInit, 0)} octets`, `≈ ${ko(ref.estPng)} Ko`, 'PNG = brut RGBA / 12'],
    ['Zoom après export', 'net à tout zoom', 'pixellise au-delà de 100 %', 'matrice figée'],
  ].forEach((cells) => {
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
  section.appendChild(table);

  /* E077-03 — choix du format en radiogroupe (pas d'aria-pressed). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = 'geography-e077-format';
  const legend = document.createElement('legend');
  legend.textContent = 'Format d’export (choix unique)';
  fieldset.appendChild(legend);
  [['svg', 'SVG — vecteur'], ['png', 'PNG — matrice']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e077-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e077-format-radio';
    radio.id = `geography-e077-format-${value}`;
    radio.value = value;
    radio.checked = value === format;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });
  section.appendChild(fieldset);

  /* E077-04 — curseur d'échelle et mesures recalculées. */
  const echelleRow = ctx.el('p', 'geography-e077-line');
  const echelleLabel = document.createElement('label');
  echelleLabel.setAttribute('for', 'geography-e077-echelle');
  echelleLabel.appendChild(document.createTextNode('Échelle d’export : '));
  const echelleOut = document.createElement('span');
  echelleOut.id = 'geography-e077-echelle-value';
  echelleLabel.appendChild(echelleOut);
  echelleRow.appendChild(echelleLabel);
  section.appendChild(echelleRow);
  const echelleInput = document.createElement('input');
  echelleInput.type = 'range';
  echelleInput.id = 'geography-e077-echelle';
  echelleInput.min = '1';
  echelleInput.max = '4';
  echelleInput.step = '1';
  echelleInput.value = String(echelle);
  echelleInput.setAttribute('aria-label', 'Échelle d’export, de 1 à 4');
  section.appendChild(echelleInput);

  /* E077-07 — figure et canvas, redondants avec le texte. */
  const figure = ctx.el('figure', 'geography-e077-figure');
  figure.id = 'geography-e077-figure';
  const canvas = ctx.el('canvas', 'geography-e077-canvas');
  canvas.id = 'geography-e077-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Aperçu de l’export : contour, chemin et quatre nœuds. '
    + 'Le contour net signale le vecteur, la trame de points signale la matrice. '
    + 'Flèches gauche et droite : changer de format ; flèches haut et bas : changer l’échelle.');
  canvas.setAttribute('aria-describedby', 'geography-e077-clavier');
  const caption = ctx.el('figcaption', 'geography-e077-caption',
    'Aperçu schématique déterministe : aucune donnée géographique réelle. Toutes les grandeurs sont aussi écrites en texte.');
  caption.id = 'geography-e077-caption';
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E077-09 — région live unique. */
  const readout = ctx.el('p', 'geography-e077-readout', '');
  readout.id = 'geography-e077-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E077-05 / E077-06 — actions d'export local. */
  const actions = ctx.el('div', 'geography-e077-actions');
  actions.id = 'geography-e077-actions';
  const download = ctx.el('button', '', '');
  download.type = 'button';
  download.id = 'geography-e077-download';
  const play = ctx.el('button', '', playing ? 'Arrêter le balayage d’export' : 'Lancer le balayage d’export');
  play.type = 'button';
  play.id = 'geography-e077-play';
  play.setAttribute('aria-pressed', playing ? 'true' : 'false');
  play.setAttribute('aria-controls', 'geography-e077-readout');
  actions.append(download, play);
  section.appendChild(actions);

  /* E077-09 — équivalent clavier explicite. */
  const clavier = ctx.el('p', 'geography-e077-line',
    'E077-09 · Clavier : Tab atteint le choix du format, l’échelle, l’aperçu puis les deux actions. '
    + '← → changent de format, ↑ ↓ changent l’échelle, Début et Fin bornent l’échelle. '
    + 'Le balayage est une bascule indépendante : son état est dit « en cours / arrêté », jamais porté par le seul pixel.'
  );
  clavier.id = 'geography-e077-clavier';
  section.appendChild(clavier);

  /* E077-10 — limite falsifiable en cinq temps, alignée sur les angles morts. */
  const limite = ctx.el('p', 'geography-e077-line',
    'E077-10 · Limite et vérification : 1) prédire qu’à données égales, le SVG reste net et de taille constante '
    + 'quand on augmente l’échelle, alors que le PNG grossit en surface et finit par pixelliser ; '
    + '2) régler l’échelle de ×1 à ×4 et lire les grandeurs ; 3) attendre que le viewBox et les octets SVG '
    + 'restent identiques tandis que les pixels PNG suivent ×(échelle·DPR)² ; 4) falsifier en exportant le PNG '
    + 'à ×4 puis en le zoomant : si aucun pixel n’apparaît, ou si le SVG change de taille avec l’échelle, '
    + 'l’hypothèse est réfutée ; 5) débrief : le « brut/12 » n’est qu’un ordre de grandeur du compresseur PNG, '
    + 'le SVG autonome n’embarque ni polices ni images de la vraie carte, et l’aperçu reste schématique.'
  );
  limite.id = 'geography-e077-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  return {
    section, canvas, layout, echelleInput, echelleOut, download, play, readout,
    radios: Array.from(fieldset.querySelectorAll('input[type="radio"]')),
    format: () => format,
    reduced: typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false,
    playing,
    last: null,
    scan: 0,
  };
}

/* E077-08 — badge textuel sur la carte existante, garde anti-doublon par id. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById('geography-e077-badge')) return;
  const badge = ctx.el('div', 'geography-e077-badge',
    'Export local — SVG autonome ou PNG rastérisé, sans réseau. Aperçu schématique.');
  badge.id = 'geography-e077-badge';
  map.appendChild(badge);
}

register('E077', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css('geography-e077', RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e077', 'on');
  layout.setAttribute('data-geography-e077-render', String(renders));

  const scene = buildSection(ctx, layout);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (reduced) {
    playing = false;
    scene.playing = false;
    scene.play.textContent = 'Lancer le balayage d’export';
    scene.play.setAttribute('aria-pressed', 'false');
  }
  scene.section.setAttribute('data-geography-e077-reduced', reduced ? '1' : '0');
  refresh(scene);

  /* Écouteur local délégué : le canvas et la fiche partagent les mêmes touches. */
  const onKey = (event) => {
    const target = event.target;
    const isCanvas = target === scene.canvas;
    if (!isCanvas) return;
    let next = null;
    if (event.key === 'ArrowRight') next = { format: format === 'svg' ? 'png' : 'svg' };
    else if (event.key === 'ArrowLeft') next = { format: format === 'svg' ? 'png' : 'svg' };
    else if (event.key === 'ArrowUp') next = { echelle: Math.min(4, echelle + 1) };
    else if (event.key === 'ArrowDown') next = { echelle: Math.max(1, echelle - 1) };
    else if (event.key === 'Home') next = { echelle: 1 };
    else if (event.key === 'End') next = { echelle: 4 };
    else return;
    event.preventDefault();
    event.stopPropagation();
    if (next.format) format = next.format;
    if (next.echelle) echelle = next.echelle;
    refresh(scene);
  };
  scene.section.addEventListener('keydown', onKey);

  scene.radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      format = radio.value;
      refresh(scene);
    });
  });

  scene.echelleInput.addEventListener('input', () => {
    echelle = Math.max(1, Math.min(4, Math.round(Number(scene.echelleInput.value))));
    refresh(scene);
  });

  scene.download.addEventListener('click', () => {
    if (format === 'svg') exportSvg(scene);
    else exportPng(scene);
  });

  scene.play.addEventListener('click', () => {
    if (scene.reduced() || typeof requestAnimationFrame !== 'function') {
      playing = false;
      scene.playing = false;
      scene.play.textContent = 'Lancer le balayage d’export';
      scene.play.setAttribute('aria-pressed', 'false');
      scene.scan = (scene.scan + 0.25) % 1;
      refresh(scene);
      return;
    }
    scene.playing = !scene.playing;
    playing = scene.playing;
    scene.play.textContent = scene.playing ? 'Arrêter le balayage d’export' : 'Lancer le balayage d’export';
    scene.play.setAttribute('aria-pressed', scene.playing ? 'true' : 'false');
    if (scene.playing) {
      scene.last = null;
      ensureLoop();
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      drawPreview(scene.canvas, scene);
    }
  });

  latest = scene;
  install();
  refresh(latest);
});
