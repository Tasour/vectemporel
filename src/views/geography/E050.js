import { register } from './registry.js';

/*
 * Lentille E050 — panoramique : le déplacement de la carte (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E050-01 … E050-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E050', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e050`.
 * Tous les identifiants DOM sont préfixés `geography-e050-`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué). Tout le contenu est du texte DOM
 * lisible sans script ; le canvas ne détient aucune information exclusive.
 *
 * Le thème est la mécanique du « panoramique » : la carte de la vue est un
 * <svg> dont l'attribut viewBox (x, y, largeur, hauteur) définit la fenêtre
 * visible. Déplacer la carte, c'est traduire cette fenêtre dans le cadre
 * 900 × 620 ; zoomer, c'est en réduire la largeur. Toutes les grandeurs
 * affichées (bornes, échelle, déplacement écran → carte) sont recalculées
 * depuis leur formule et depuis le viewBox RÉEL lu dans le DOM.
 */

const CSS_ID = 'geography-e050';
const SECTION_ID = 'geography-e050-section';
const MAP_W = 900;                 // largeur du cadre carte, unités SVG (vue)
const MAP_H = 620;                 // hauteur du cadre carte, unités SVG (vue)
const MIN_W = MAP_W / 8;           // zoom maximal de la vue (112,5 unités)
const STEP_MS = 1100;              // pas de lecture en mouvement réduit
const SWEEP_MS = 9000;             // période du balayage panoramique continu
const NARROW = '\u202f';           // espace insécable fine (typographie française)
const MINUS = '\u2212';            // signe moins typographique
const RAD = Math.PI / 180;

/* Quatre fenêtres de référence. Les valeurs sont recalculées et bornées par
   clampBox() au moment de l'usage : rien n'est présenté comme une mesure
   de terrain, ce sont des positions de la fenêtre de visualisation. */
const PRESETS = [
  { key: 'plein', nom: 'Plein cadre', x: 0, y: 0, w: MAP_W },
  { key: 'nord-ouest', nom: 'Nord-ouest', x: 0, y: 0, w: 300 },
  { key: 'centre', nom: 'Centre', x: 300, y: 206.6667, w: 300 },
  { key: 'sud-est', nom: 'Sud-est', x: 600, y: 413.3333, w: 300 },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let selected = 0;   // presets[0] : plein cadre, par défaut
let playing = false;
let renders = 0;
let grid = false;   // bascule indépendante (aria-pressed)

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* E050-04 — bornage de la fenêtre, identique à la règle de la vue :
   w ∈ [MAP_W/8, MAP_W] ; h = w · MAP_H/MAP_W ; x ∈ [0, MAP_W−w] ;
   y ∈ [0, MAP_H−h]. C'est cette fonction qui fait foi pour chaque déplacement. */
function clampBox(x, y, w) {
  const fw = Math.max(MIN_W, Math.min(MAP_W, finite(w) ? w : MAP_W));
  const fh = fw * (MAP_H / MAP_W);
  return {
    w: fw,
    h: fh,
    x: Math.max(0, Math.min(MAP_W - fw, finite(x) ? x : 0)),
    y: Math.max(0, Math.min(MAP_H - fh, finite(y) ? y : 0)),
  };
}

/* E050-05 — échelle relative au cadre complet : 1 au plein cadre,
   MAP_W/w quand on zoome (8 au zoom maximal de la vue). */
function scaleOf(box) {
  return box && box.w > 0 ? MAP_W / box.w : 1;
}

/* E050-03 — traduction d'un déplacement d'écran en unités carte :
   dx_carte = dx_écran · w / largeur_écran (même relation que le glisser de
   la vue). Le signe est inversé dans panBy() : glisser la carte à droite
   déplace la fenêtre vers la gauche. */
function screenToMap(dxPx, dyPx, box, rectW, rectH) {
  if (!box) return { dx: 0, dy: 0 };
  const rw = finite(rectW) && rectW > 0 ? rectW : 1;
  const rh = finite(rectH) && rectH > 0 ? rectH : 1;
  return { dx: (dxPx * box.w) / rw, dy: (dyPx * box.h) / rh };
}

function panBy(box, dxMap, dyMap) {
  return clampBox(box.x - dxMap, box.y - dyMap, box.w);
}

/* E050-02 — lecture du viewBox réellement affiché par la vue (.geo-svg).
   Quatre nombres attendus ; repli explicite sur null si le document n'a pas
   encore de carte (état vide) ou si l'attribut est illisible. */
function readViewBox(layout) {
  const svg = layout && layout.querySelector('.geo-svg');
  const raw = svg ? svg.getAttribute('viewBox') : null;
  if (!raw) return null;
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !finite(n))) return null;
  return clampBox(parts[0], parts[1], parts[2]);
}

/* E050-03 — exemple chiffré déterministe : un glisser de 40 px sur une carte
   de 480 px de large à l'échelle courante. Aucune mesure inventée : le
   résultat est recalculé depuis la largeur de la fenêtre. */
function displacementExample(box) {
  const rectW = 480;
  const rectH = Math.round((rectW * MAP_H) / MAP_W);
  return { rectW, rectH, ...screenToMap(40, 0, box, rectW, rectH) };
}

/* Feuille de styles E050 : cadrée par [data-geography-e050="on"] posé sur
   .geo-layout. Aucune règle ne déborde, aucune information n'est portée par
   la seule couleur, cibles tactiles ≥ 44 px, focus visible. */
const RULES = `
.geo-layout[data-geography-e050="on"] .geography-e050-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-e050="on"] .geography-e050-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e050="on"] .geography-e050-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e050="on"] .geography-e050-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e050="on"] .geography-e050-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-e050="on"] .geography-e050-value { color: var(--ink); }
.geo-layout[data-geography-e050="on"] .geography-e050-list { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-e050="on"] .geography-e050-list li { margin: 0 0 4px; }
.geo-layout[data-geography-e050="on"] .geography-e050-group {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 8px 0;
}
.geo-layout[data-geography-e050="on"] .geography-e050-preset {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-e050="on"] .geography-e050-preset:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-e050="on"] .geography-e050-preset[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-e050="on"] .geography-e050-preset:focus-visible,
.geo-layout[data-geography-e050="on"] .geography-e050-canvas:focus-visible,
.geo-layout[data-geography-e050="on"] .geography-e050-play:focus-visible,
.geo-layout[data-geography-e050="on"] .geography-e050-grid:focus-visible,
.geo-layout[data-geography-e050="on"] .geography-e050-step:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-e050="on"] .geography-e050-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e050="on"] .geography-e050-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-e050="on"] .geography-e050-canvas {
  display: block; width: 100%; max-width: 320px; height: auto; aspect-ratio: 900 / 620;
  margin: 0 auto; touch-action: none; cursor: grab;
}
.geo-layout[data-geography-e050="on"] .geography-e050-canvas:active { cursor: grabbing; }
.geo-layout[data-geography-e050="on"] .geography-e050-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-e050="on"] .geography-e050-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-e050="on"] .geography-e050-play,
.geo-layout[data-geography-e050="on"] .geography-e050-grid,
.geo-layout[data-geography-e050="on"] .geography-e050-step {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-e050="on"] .geography-e050-play:hover,
.geo-layout[data-geography-e050="on"] .geography-e050-grid:hover,
.geo-layout[data-geography-e050="on"] .geography-e050-step:hover { border-color: var(--gold); }
.geo-layout[data-geography-e050="on"] .geography-e050-grid[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
@media (max-width: 620px) {
  .geo-layout[data-geography-e050="on"] .geography-e050-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-e050="on"] .geography-e050-group { grid-template-columns: 1fr; }
  .geo-layout[data-geography-e050="on"] .geography-e050-canvas { max-width: 280px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e050="on"] .geography-e050-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E050-06 — dessin déterministe du schéma de la fenêtre. Un seul canvas,
   DPR plafonné à 2, couleurs lues dans les variables de thème avec repli.
   Le rectangle clair représente la fenêtre (viewBox) dans le cadre 900 × 620 ;
   l'aire hachurée hors fenêtre n'est PAS une information portée par la seule
   couleur : bornes et échelle sont données en texte. */
function drawScene(canvas, box, withGrid) {
  if (!canvas || typeof canvas.getContext !== 'function' || !box) return;
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

  /* Cadre complet. */
  painter.strokeStyle = muted;
  painter.lineWidth = 1;
  painter.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  /* E050-08 — grille de repérage, activée par la bascule indépendante. */
  if (withGrid) {
    painter.strokeStyle = muted;
    painter.globalAlpha = 0.35;
    painter.lineWidth = 1;
    painter.setLineDash([2, 4]);
    for (let i = 1; i < 6; i += 1) {
      const gx = (i * cssW) / 6;
      const gy = (i * cssH) / 6;
      painter.beginPath();
      painter.moveTo(gx, 0);
      painter.lineTo(gx, cssH);
      painter.moveTo(0, gy);
      painter.lineTo(cssW, gy);
      painter.stroke();
    }
    painter.setLineDash([]);
    painter.globalAlpha = 1;
  }

  /* Fenêtre visible (viewBox). */
  const wx = box.x * sx;
  const wy = box.y * sy;
  const ww = box.w * sx;
  const wh = box.h * sy;
  painter.fillStyle = 'rgba(230,185,111,.10)';
  painter.fillRect(wx, wy, ww, wh);
  painter.strokeStyle = bright;
  painter.lineWidth = 2;
  painter.strokeRect(wx + 1, wy + 1, Math.max(1, ww - 2), Math.max(1, wh - 2));

  /* Poignées de coin : la forme, pas la couleur, signale la fenêtre. */
  painter.fillStyle = bright;
  const handles = [[wx, wy], [wx + ww, wy], [wx, wy + wh], [wx + ww, wy + wh]];
  handles.forEach(([hx, hy]) => {
    painter.beginPath();
    painter.rect(hx - 2.5, hy - 2.5, 5, 5);
    painter.fill();
  });

  /* Centre de la fenêtre : repère de déplacement. */
  const cx = (box.x + box.w / 2) * sx;
  const cy = (box.y + box.h / 2) * sy;
  painter.strokeStyle = gold;
  painter.lineWidth = 1;
  painter.beginPath();
  painter.moveTo(cx - 5, cy);
  painter.lineTo(cx + 5, cy);
  painter.moveTo(cx, cy - 5);
  painter.lineTo(cx, cy + 5);
  painter.stroke();

  /* Étiquette d'échelle, redondée en texte sous le canvas. */
  painter.fillStyle = ink;
  painter.font = `${Math.max(9, Math.round(cssW * 0.045))}px sans-serif`;
  painter.fillText(`×${num(scaleOf(box), 1)}`, 6, cssH - 6);
}

/* E050-10 — une seule frame, court-circuitée quand l'onglet est masqué.
   Le balayage est une courbe déterministe (sin/cos de l'horodatage rAF), sans
   aucune source d'aléa : la fenêtre reste toujours dans le cadre par clampBox(). */
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
    const spanX = (MAP_W - scene.box.w) / 2;
    const spanY = (MAP_H - scene.box.h) / 2;
    const cx = MAP_W / 2 + spanX * Math.sin(phase);
    const cy = MAP_H / 2 + spanY * Math.sin(phase * 0.7 + RAD);
    scene.box = clampBox(cx - scene.box.w / 2, cy - scene.box.h / 2, scene.box.w);
    drawScene(scene.canvas, scene.box, scene.grid);
    /* Une annonce toutes les ~15 frames : la région live reste lisible. */
    scene.tick = (scene.tick || 0) + 1;
    if (scene.tick >= 15) { scene.tick = 0; writeReadout(scene, 'balayage'); }
    ensureLoop();
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      if (scene.play) scene.play.textContent = 'Lancer le panoramique';
    }
  }
}

function ensureLoop() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { loop(0); return; }
  frame = requestAnimationFrame(loop);
}

/* E050-07 — région live unique : toute action est annoncée en toutes lettres. */
function writeReadout(scene, cause) {
  if (!scene || !scene.readout) return;
  const box = scene.box;
  const ex = displacementExample(box);
  const preset = PRESETS[selected];
  const verbs = {
    balayage: 'Balayage en cours',
    preset: `Fenêtre « ${preset.nom} »`,
    clavier: 'Déplacement au clavier',
    glisser: 'Déplacement par glisser',
    grille: 'Grille de repérage',
    demarrage: 'Panoramique lancé',
    arret: 'Panoramique arrêté',
  };
  scene.readout.textContent =
    `${verbs[cause] || 'Fenêtre'} · viewBox x ${num(box.x, 1)}, y ${num(box.y, 1)}, ` +
    `largeur ${num(box.w, 1)}, hauteur ${num(box.h, 1)} · échelle ×${num(scaleOf(box), 2)} ` +
    `par rapport au cadre complet · bornes x [0 ; ${num(MAP_W - box.w, 1)}], ` +
    `y [0 ; ${num(MAP_H - box.h, 1)}] · un glisser de 40 px déplace la fenêtre de ` +
    `${num(ex.dx, 1)} unité(s) carte.`;
}

/* E050-09 — sélection d'une fenêtre prédéfinie : textes, aria-checked,
   roving tabindex, annonce. Choix unique : pas d'aria-pressed ici. */
function applyPreset(index, scene, fromAnimation) {
  const sceneRef = scene || latest;
  if (!sceneRef) return;
  selected = Math.max(0, Math.min(PRESETS.length - 1, index));
  const preset = PRESETS[selected];
  sceneRef.box = clampBox(preset.x, preset.y, preset.w);

  sceneRef.radios.forEach((radio, i) => {
    const on = i === selected;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });

  drawScene(sceneRef.canvas, sceneRef.box, sceneRef.grid);
  writeReadout(sceneRef, fromAnimation ? 'balayage' : 'preset');
  if (sceneRef.boxText) {
    const b = sceneRef.box;
    sceneRef.boxText.textContent =
      `viewBox lue : x ${num(b.x, 1)}, y ${num(b.y, 1)}, largeur ${num(b.w, 1)}, hauteur ${num(b.h, 1)} ` +
      `(unités SVG d'un cadre ${MAP_W} × ${MAP_H}).`;
  }
}

/* E050-10 — installation unique et silencieuse des écouteurs globaux. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (latest && latest.playing && !latest.reduced()) ensureLoop();
      else if (latest) { drawScene(latest.canvas, latest.box, latest.grid); }
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
          if (latest.play) latest.play.textContent = 'Lancer le panoramique';
        }
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        if (latest) drawScene(latest.canvas, latest.box, latest.grid);
      });
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

function line(ctx, parent, index, label, text, valueId) {
  const paragraph = ctx.el('p', 'geography-e050-line');
  paragraph.id = `geography-e050-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(ctx.el('strong', '', `E050-${String(index).padStart(2, '0')} · ${label}. `));
  const value = ctx.el('span', 'geography-e050-value', text);
  if (valueId) value.id = valueId;
  paragraph.appendChild(value);
  parent.appendChild(paragraph);
  return value;
}

/* Construction de la fiche sémantique complète (texte lisible sans JS). */
function buildSection(ctx, layout, initial) {
  const previous = layout.querySelector(`#${SECTION_ID}`);
  if (previous && previous.parentNode) previous.parentNode.removeChild(previous);

  const panel = layout.querySelector('.geo-panel') || layout;
  const section = ctx.el('section', 'geography-e050-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Panoramique — déplacement de la carte');
  section.setAttribute('data-sim', 'panoramique-deplacement-carte');

  section.appendChild(ctx.el('h2', '', 'Panoramique — comprendre le déplacement de la carte'));

  /* E050-01 — amorce textuelle, lisible sans aucune interaction. */
  const intro = ctx.el('p', 'geography-e050-line');
  intro.id = 'geography-e050-intro';
  intro.appendChild(ctx.el('strong', '', 'E050-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'La carte est un dessin vectoriel cadré par un viewBox (x, y, largeur, hauteur). ' +
    'Déplacer la carte revient à translater cette fenêtre dans un cadre fixe de ' +
    `${MAP_W} × ${MAP_H} unités ; zoomer revient à réduire sa largeur. Le schéma ci-dessous ` +
    'est une maquette de cette fenêtre : toutes les valeurs sont aussi écrites en texte.'
  ));
  section.appendChild(intro);

  /* E050-02 — viewBox réellement affichée, lue dans le DOM. */
  const box = initial || clampBox(0, 0, MAP_W);
  line(ctx, section, 2, 'Fenêtre observée',
    initial
      ? `viewBox lue sur la carte : x ${num(box.x, 1)}, y ${num(box.y, 1)}, largeur ${num(box.w, 1)}, hauteur ${num(box.h, 1)} (unités SVG).`
      : `Aucun viewBox lisible sur la carte (état vide) : maquette initialisée au plein cadre, x 0, y 0, largeur ${MAP_W}, hauteur ${MAP_H}.`,
    'geography-e050-box-text');
  if (!initial) selected = 0;

  /* E050-03 — relation écran → carte, recalculée depuis la largeur courante. */
  const ex = displacementExample(box);
  line(ctx, section, 3, 'Du geste à l’unité carte',
    `dx_carte = dx_écran × largeur / largeur_écran. Un glisser de 40 px sur une carte de ` +
    `${ex.rectW} px déplace la fenêtre de ${num(ex.dx, 1)} unité(s) vers la gauche ` +
    `(signe inversé : on tire le dessin, pas la fenêtre).`);

  /* E050-04 — bornes, recalculées depuis la largeur courante. */
  line(ctx, section, 4, 'Bornes de la fenêtre',
    `w est borné entre ${num(MIN_W, 1)} et ${MAP_W} ; h = w × ${num(MAP_H / MAP_W, 4)} ; ` +
    `x ∈ [0 ; ${num(MAP_W - box.w, 1)}] et y ∈ [0 ; ${num(MAP_H - box.h, 1)}]. ` +
    `La fenêtre ne peut donc jamais sortir du cadre.`);

  /* E050-09 — radiogroupe de quatre fenêtres (choix unique). */
  const group = ctx.el('div', 'geography-e050-group');
  group.id = 'geography-e050-group';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir une fenêtre de visualisation');
  PRESETS.forEach((preset, i) => {
    const radio = ctx.el('button', 'geography-e050-preset', `${preset.nom} — largeur ${num(preset.w, 0)}`);
    radio.type = 'button';
    radio.id = `geography-e050-radio-${i}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === selected ? 'true' : 'false');
    radio.tabIndex = i === selected ? 0 : -1;
    group.appendChild(radio);
  });
  section.appendChild(group);

  /* E050-07 — région live unique. */
  const readout = ctx.el('p', 'geography-e050-readout', '');
  readout.id = 'geography-e050-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E050-06 — laboratoire canvas, redondant avec le texte. */
  const figure = ctx.el('figure', 'geography-e050-figure');
  figure.id = 'geography-e050-figure';
  const canvas = ctx.el('canvas', 'geography-e050-canvas');
  canvas.id = 'geography-e050-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Maquette du viewBox : un rectangle clair se déplace dans le cadre 900 sur 620. ' +
    'Flèches pour déplacer la fenêtre, Plus et Moins pour zoomer, zéro pour le plein cadre.');
  canvas.setAttribute('aria-describedby', 'geography-e050-clavier');
  const caption = ctx.el('figcaption', 'geography-e050-caption',
    'Maquette non à l’échelle du terrain : le rectangle clair est la fenêtre visible, les croix sont ses poignées, ' +
    'le trait central son centre. Bornes et échelle sont écrites en texte ci-dessus et ci-dessous.');
  caption.id = 'geography-e050-caption';
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E050-08 — légende en glyphes, jamais la seule couleur, et bascule autonome. */
  const legend = ctx.el('p', 'geography-e050-line',
    'E050-08 · Repères : ▭ fenêtre visible · ✛ centre de la fenêtre · ┄ grille de repérage (bouton ci-dessous). ' +
    'Le contraste et les poignées distinguent la fenêtre, même en niveaux de gris.'
  );
  legend.id = 'geography-e050-legend';
  section.appendChild(legend);

  /* E050-05 — mesures référencées, dont une comparée à une référence. */
  const measures = ctx.el('ul', 'geography-e050-list');
  measures.id = 'geography-e050-mesures';
  const items = [
    `Cadre de référence : ${MAP_W} × ${MAP_H} unités SVG, échelle ×1 : c’est la fenêtre « Plein cadre ».`,
    `Zoom maximal de la vue : largeur ${num(MIN_W, 1)} unités, soit une échelle ×${num(MAP_W / MIN_W, 0)} ` +
    `par rapport au cadre complet (${num(MAP_W / MIN_W, 0)} fois plus grand).`,
    `Fenêtre courante : largeur ${num(box.w, 1)} → échelle ×${num(scaleOf(box), 2)} ; ` +
    `1 px écran vaut ${num(box.w / ex.rectW, 3)} unité(s) carte sur une carte de ${ex.rectW} px.`,
    `Référence : au plein cadre, ${num(40 * (MAP_W / ex.rectW), 1)} unités carte pour 40 px ; ` +
    `ici ${num(ex.dx, 1)} unité(s), soit un rapport de ${num(scaleOf(box), 2)}.`,
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e050-mesure-${i}`;
    measures.appendChild(item);
  });
  section.appendChild(measures);

  /* E050-08 (suite) — bascule indépendante : aria-pressed légitime ici,
     car elle agit sur un affichage indépendant du choix de fenêtre. */
  const actions = ctx.el('div', 'geography-e050-actions');
  const gridBtn = ctx.el('button', 'geography-e050-grid', 'Grille : masquée');
  gridBtn.type = 'button';
  gridBtn.id = 'geography-e050-grid';
  gridBtn.setAttribute('aria-pressed', grid ? 'true' : 'false');
  gridBtn.setAttribute('aria-controls', 'geography-e050-canvas');
  actions.appendChild(gridBtn);

  const stepBtn = ctx.el('button', 'geography-e050-step', 'Fenêtre suivante');
  stepBtn.type = 'button';
  stepBtn.id = 'geography-e050-step';
  stepBtn.setAttribute('aria-controls', 'geography-e050-canvas');
  actions.appendChild(stepBtn);

  /* E050-10 — commande de balayage (une seule boucle rAF). */
  const play = ctx.el('button', 'geography-e050-play', playing ? 'Arrêter le panoramique' : 'Lancer le panoramique');
  play.type = 'button';
  play.id = 'geography-e050-play';
  play.setAttribute('aria-controls', 'geography-e050-readout');
  actions.appendChild(play);
  section.appendChild(actions);

  /* E050-09 — equipement clavier du schéma. */
  const clavier = ctx.el('p', 'geography-e050-line',
    'E050-09 · Clavier : Tab atteint les quatre fenêtres, la maquette, puis les boutons. ' +
    '← → déplacent la fenêtre de 40 unités carte, ↑ ↓ de 30, + et − zooment, 0 revient au plein cadre. ' +
    'La maquette accepte les mêmes touches. Le glisser à la souris fait le même travail.'
  );
  clavier.id = 'geography-e050-clavier';
  section.appendChild(clavier);

  /* E050-10 — limite falsifiable en cinq temps, alignée sur les angles morts. */
  const limite = ctx.el('p', 'geography-e050-line',
    'E050-10 · Limite et vérification : 1) prédire qu’un glisser de 40 px vers la droite recule la fenêtre de ' +
    `${num(ex.dx, 1)} unité(s) carte ; 2) régler la fenêtre « Centre » ; 3) attendre la valeur annoncée dans le statut ; ` +
    '4) falsifier si le déplacement mesuré diffère de dx_écran × largeur / largeur_écran ; ' +
    '5) débrief : la maquette ignore preserveAspectRatio (des marges peuvent apparaître si le conteneur n’a pas le ratio 900/620), ' +
    'l’inertie, la capture du pointeur et l’état propre de la vue : elle modélise la géométrie du viewBox, pas le rendu réel.'
  );
  limite.id = 'geography-e050-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  const radios = Array.from(group.querySelectorAll('.geography-e050-preset'));
  return {
    section, radios, readout, canvas, play, gridBtn, stepBtn,
    boxText: section.querySelector('#geography-e050-box-text'),
    box,
  };
}

register('E050', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e050', 'on');

  /* Instantané déterministe du DOM produit par la vue. */
  const initial = readViewBox(layout);
  const scene = buildSection(ctx, layout, initial);

  layout.setAttribute('data-geography-e050-viewbox', initial
    ? `${initial.x},${initial.y},${initial.w},${initial.h}` : 'none');
  layout.setAttribute('data-geography-e050-presets', String(PRESETS.length));
  layout.setAttribute('data-geography-e050-render', String(renders));

  scene.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;
  scene.box = initial ? clampBox(initial.x, initial.y, initial.w) : clampBox(0, 0, MAP_W);
  scene.grid = grid;
  scene.playing = playing;
  scene.elapsed = 0;
  scene.last = null;
  scene.tick = 0;

  /* E050-06 / E050-09 — clavier : déplacement, zoom, fenêtres. */
  const onKey = (event) => {
    const target = event.target;
    const isRadio = target && target.classList && target.classList.contains('geography-e050-preset');
    const isCanvas = target === scene.canvas;
    if (!isRadio && !isCanvas) return;
    const b = scene.box;
    if (event.key === 'ArrowRight') scene.box = panBy(b, -40, 0);
    else if (event.key === 'ArrowLeft') scene.box = panBy(b, 40, 0);
    else if (event.key === 'ArrowDown') scene.box = panBy(b, 0, -30);
    else if (event.key === 'ArrowUp') scene.box = panBy(b, 0, 30);
    else if (event.key === '+' || event.key === '=') {
      scene.box = clampBox(b.x + b.w * 0.1, b.y + b.h * 0.1, b.w * 0.8);
    } else if (event.key === '-' || event.key === '_') {
      scene.box = clampBox(b.x - b.w * 0.125, b.y - b.h * 0.125, b.w * 1.25);
    } else if (event.key === '0') {
      applyPreset(0, scene, false);
      return;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    drawScene(scene.canvas, scene.box, scene.grid);
    writeReadout(scene, 'clavier');
    if (scene.boxText) {
      const nb = scene.box;
      scene.boxText.textContent =
        `viewBox lue : x ${num(nb.x, 1)}, y ${num(nb.y, 1)}, largeur ${num(nb.w, 1)}, hauteur ${num(nb.h, 1)} (unités SVG).`;
    }
  };
  scene.section.addEventListener('keydown', (event) => {
    /* Sur un radio, ← → changent de fenêtre (convention radiogroupe). */
    const isRadio = event.target && event.target.classList
      && event.target.classList.contains('geography-e050-preset');
    if (isRadio && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
      applyPreset((selected + dir + PRESETS.length) % PRESETS.length, scene, false);
      scene.radios[selected].focus();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onKey(event);
  });

  scene.radios.forEach((radio, i) => {
    radio.addEventListener('click', () => applyPreset(i, scene, false));
  });

  /* E050-08 — bascule de grille, indépendante du choix de fenêtre. */
  scene.gridBtn.addEventListener('click', () => {
    grid = !grid;
    scene.grid = grid;
    scene.gridBtn.setAttribute('aria-pressed', grid ? 'true' : 'false');
    scene.gridBtn.textContent = grid ? 'Grille : affichée' : 'Grille : masquée';
    drawScene(scene.canvas, scene.box, scene.grid);
    writeReadout(scene, 'grille');
  });

  /* Bouton « fenêtre suivante » : utile en mouvement réduit. */
  scene.stepBtn.addEventListener('click', () => {
    applyPreset((selected + 1) % PRESETS.length, scene, false);
  });

  /* E050-03 / E050-06 — glisser sur la maquette, même relation que la vue. */
  let drag = null;
  scene.canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, box: scene.box };
    try { scene.canvas.setPointerCapture(event.pointerId); } catch { /* capture indisponible */ }
  });
  scene.canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = scene.canvas.getBoundingClientRect();
    const moved = screenToMap(event.clientX - drag.x, event.clientY - drag.y, drag.box, rect.width, rect.height);
    scene.box = panBy(drag.box, moved.dx, moved.dy);
    drawScene(scene.canvas, scene.box, scene.grid);
    writeReadout(scene, 'glisser');
  });
  const endDrag = () => { drag = null; };
  scene.canvas.addEventListener('pointerup', endDrag);
  scene.canvas.addEventListener('pointercancel', endDrag);

  /* E050-10 — lecture du panoramique, avec repli déterministe en mouvement réduit. */
  scene.play.addEventListener('click', () => {
    if (scene.reduced()) {
      applyPreset((selected + 1) % PRESETS.length, scene, false);
      writeReadout(scene, 'arret');
      scene.play.textContent = 'Lancer le panoramique';
      return;
    }
    playing = !playing;
    scene.playing = playing;
    scene.play.textContent = playing ? 'Arrêter le panoramique' : 'Lancer le panoramique';
    if (playing) {
      scene.last = null;
      scene.elapsed = selected * STEP_MS;
      ensureLoop();
      writeReadout(scene, 'demarrage');
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      scene.last = null;
      writeReadout(scene, 'arret');
    }
  });

  latest = scene;
  install();
  applyPreset(selected, scene, true);
  drawScene(scene.canvas, scene.box, scene.grid);
  ensureLoop();
});
