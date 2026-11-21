import { register } from './registry.js';

/* Lentille E004 — seconde passe — vue GEOGRAPHIE : rose des vents et
 * orientation cardinale, enrichie d'un laboratoire continu et d'un tableau
 * indexable. Dix chantiers E004-01 à E004-10, tous effectifs.
 *
 * Rigueur des contenus : aucun azimut géographique n'est inventé. Le cap du
 * lieu actif est une direction SCHÉMATIQUE calculée depuis le viewBox réel du
 * SVG et la position réelle du marqueur actif. Le jeu de données ne fournit ni
 * déclinaison magnétique ni nord magnétique : aucune valeur de ce type n'est
 * affichée et la limite est énoncée explicitement.
 *
 * Contrat : un seul point d'enregistrement de la lentille, CSS via
 * ctx.css('geography-v2-e004', …),
 * identifiants tous préfixés geography-v2-e004-, français partout, zéro
 * journalisation, zéro réseau, zéro aléa, une seule boucle rAF suspendue sur
 * document.hidden et respectueuse de ctx.reducedMotion(). La vue de base reste
 * intacte et lisible sans cette lentille.
 */

const PREFIX = 'geography-v2-e004';
const ident = (nom) => `${PREFIX}-${nom}`;

/* Huit points cardinaux. L'angle est mesuré dans le sens horaire depuis le
 * nord (0°), comme sur une rose des vents ; dy négatif = haut de l'écran. */
const DIRECTIONS = [
  { code: 'N', nom: 'Nord', deg: 0, dx: 0, dy: -1 },
  { code: 'NE', nom: 'Nord-Est', deg: 45, dx: 1, dy: -1 },
  { code: 'E', nom: 'Est', deg: 90, dx: 1, dy: 0 },
  { code: 'SE', nom: 'Sud-Est', deg: 135, dx: 1, dy: 1 },
  { code: 'S', nom: 'Sud', deg: 180, dx: 0, dy: 1 },
  { code: 'SO', nom: 'Sud-Ouest', deg: 225, dx: -1, dy: 1 },
  { code: 'O', nom: 'Ouest', deg: 270, dx: -1, dy: 0 },
  { code: 'NO', nom: 'Nord-Ouest', deg: 315, dx: -1, dy: -1 },
];

/* État conservé entre deux reconstructions complètes du DOM par la coque,
 * exactement comme les états locaux de geography.js. */
let selected = 0;

/* Une seule animation pour toute la lentille, quel que soit le nombre de
 * rendus : une boucle rAF au plus, jamais deux. */
const anim = {
  raf: 0,
  canvas: null,
  angle: 0,
  target: 0,
  visibilityHooked: false,
  reduced: () => false,
};

/* Références du rendu courant, rafraîchies à chaque passage. */
let scene = null;

function stopLoop() {
  if (anim.raf) {
    cancelAnimationFrame(anim.raf);
    anim.raf = 0;
  }
}

function ensureLoop() {
  if (anim.raf) return;
  if (!anim.canvas || !anim.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  /* Unique amorce de la boucle d'animation de tout le module. */
  anim.raf = requestAnimationFrame(tick);
}

function tick() {
  anim.raf = 0;
  if (!anim.canvas || !anim.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return;

  /* La préférence de mouvement réduit est relue à chaque image : un
   * changement à chaud est honoré sans reconstruire la lentille. */
  if (anim.reduced()) {
    anim.angle = anim.target;
    drawRose(anim.canvas, anim.angle);
    return;
  }

  const delta = anim.target - anim.angle;
  if (Math.abs(delta) < 0.003) {
    anim.angle = anim.target;
    drawRose(anim.canvas, anim.angle);
    return;
  }
  anim.angle += delta * 0.24;
  drawRose(anim.canvas, anim.angle);
  ensureLoop();
}

/* E004-06 — dessin déterministe de la rose. Un seul canvas, DPR plafonné à 2,
 * une seule écriture par image. Les lettres sont aussi dans le tableau
 * E004-07 : l'information ne dépend jamais du canvas. */
function drawRose(canvas, angle) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const painter = canvas.getContext('2d');
  if (!painter) return;

  const cssSize = Math.max(112, Math.min(196, canvas.clientWidth || 156));
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pixels = Math.round(cssSize * dpr);
  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssSize, cssSize);

  let gold = '#e6b96f';
  let muted = '#9aa4b2';
  try {
    const theme = getComputedStyle(canvas);
    gold = theme.getPropertyValue('--gold-bright').trim() || gold;
    muted = theme.getPropertyValue('--muted').trim() || muted;
  } catch { /* environnement sans getComputedStyle : couleurs de repli. */ }

  const centre = cssSize / 2;
  const rayon = cssSize * 0.3;
  const rayonLettre = cssSize * 0.44;

  painter.lineWidth = 1;
  painter.strokeStyle = muted;
  painter.globalAlpha = 0.55;
  painter.beginPath();
  painter.arc(centre, centre, rayon, 0, Math.PI * 2);
  painter.stroke();
  painter.globalAlpha = 1;

  /* Huit rayons : les points cardinaux sont plus longs que les intercardinaux. */
  DIRECTIONS.forEach((dir, index) => {
    const a = dir.deg * Math.PI / 180;
    const long = index % 2 === 0;
    const r = long ? rayon : rayon * 0.72;
    painter.strokeStyle = long ? gold : muted;
    painter.globalAlpha = long ? 0.85 : 0.5;
    painter.beginPath();
    painter.moveTo(centre, centre);
    painter.lineTo(centre + Math.sin(a) * r, centre - Math.cos(a) * r);
    painter.stroke();

    const lx = centre + Math.sin(a) * rayonLettre;
    const ly = centre - Math.cos(a) * rayonLettre;
    painter.globalAlpha = 1;
    painter.fillStyle = long ? gold : muted;
    painter.font = `600 ${long ? 11 : 9}px system-ui, sans-serif`;
    painter.textAlign = 'center';
    painter.textBaseline = 'middle';
    painter.fillText(dir.code, lx, ly);
  });
  painter.globalAlpha = 1;

  /* Aiguille : l'angle 0 pointe vers le haut, sens horaire. */
  const nx = Math.sin(angle);
  const ny = -Math.cos(angle);
  const pointeX = centre + nx * rayon * 1.02;
  const pointeY = centre + ny * rayon * 1.02;
  const px = -ny;
  const py = nx;
  painter.fillStyle = gold;
  painter.beginPath();
  painter.moveTo(pointeX, pointeY);
  painter.lineTo(centre + px * 5 - nx * rayon * 0.28, centre + py * 5 - ny * rayon * 0.28);
  painter.lineTo(centre - px * 5 - nx * rayon * 0.28, centre - py * 5 - ny * rayon * 0.28);
  painter.closePath();
  painter.fill();
  painter.beginPath();
  painter.arc(centre, centre, 3.2, 0, Math.PI * 2);
  painter.fill();
}

/* E004-04 — lecture du viewBox réel et du marqueur réellement rendu. Aucune
 * coordonnée n'est fabriquée : si le marqueur manque, le cap n'est pas calculé. */
function parseViewBox(svg) {
  const raw = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (raw.length !== 4 || raw.some((value) => !Number.isFinite(value))) return null;
  if (raw[2] <= 0 || raw[3] <= 0) return null;
  return { x: raw[0], y: raw[1], w: raw[2], h: raw[3] };
}

function capFromScene(svg) {
  const box = parseViewBox(svg);
  if (!box) return null;
  const ring = svg.querySelector('.geo-marker[aria-pressed="true"] .geo-ring')
    || svg.querySelector('.geo-marker.is-active .geo-ring')
    || svg.querySelector('.geo-ring');
  if (!ring) return null;
  const mx = Number(ring.getAttribute('cx'));
  const my = Number(ring.getAttribute('cy'));
  if (!Number.isFinite(mx) || !Number.isFinite(my)) return null;

  const dx = mx - (box.x + box.w / 2);
  const dy = my - (box.y + box.h / 2);
  if (Math.hypot(dx, dy) < Math.min(box.w, box.h) * 0.015) {
    return { code: 'C', nom: 'au centre du cadre', deg: null };
  }
  let deg = Math.atan2(dx, -dy) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  const index = Math.floor(((deg + 22.5) % 360) / 45) % 8;
  return { ...DIRECTIONS[index], deg: Math.round(deg) % 360 };
}

function updateCapText() {
  if (!scene) return;
  const cap = capFromScene(scene.svg);
  if (!cap) {
    scene.cap.textContent = 'Cap du lieu actif : aucun marqueur affiché, direction non calculable.';
    return;
  }
  if (cap.deg === null) {
    scene.cap.textContent = `Cap du lieu actif : ${cap.nom} (direction non définie).`;
    return;
  }
  scene.cap.textContent = `Cap du lieu actif dans le cadre : ${cap.nom} (${cap.deg}° mesurés dans le sens horaire depuis le haut). Direction schématique, pas un azimut géographique.`;
}

/* E004-05 / E004-07 / E004-08 / E004-09 — une seule fonction de mise à jour
 * de l'état : radiogroupe, rose textuelle, tableau, curseur, aiguille et
 * annonce live restent synchronisés par une unique source de vérité. */
function applyAngle(deg, label, focus) {
  if (!scene) return;
  const angle = ((deg % 360) + 360) % 360;
  const nearest = Math.round(angle / 45) % 8;
  selected = nearest;
  const dir = DIRECTIONS[nearest];

  scene.buttons.forEach((button, i) => {
    const isCurrent = i === nearest;
    button.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
    button.tabIndex = isCurrent ? 0 : -1;
  });
  scene.points.forEach((point, i) => {
    const isCurrent = i === nearest;
    point.classList.toggle('is-active', isCurrent);
    if (isCurrent) point.setAttribute('aria-current', 'true');
    else point.removeAttribute('aria-current');
  });
  scene.rows.forEach((row, i) => {
    const isCurrent = i === nearest;
    row.tr.classList.toggle('is-active', isCurrent);
    if (isCurrent) row.th.setAttribute('aria-current', 'true');
    else row.th.removeAttribute('aria-current');
  });

  const entier = Math.round(angle);
  scene.slider.value = String(entier);
  scene.sliderValue.textContent = `${entier}°`;
  const message = label || `Cap sélectionné : ${dir.nom} (${dir.deg}° dans le sens horaire depuis le nord).`;
  scene.readout.textContent = message;
  scene.lastLabel = message;

  anim.target = angle * Math.PI / 180;
  if (anim.reduced()) {
    stopLoop();
    anim.angle = anim.target;
    drawRose(anim.canvas, anim.angle);
  } else {
    ensureLoop();
  }

  if (focus === 'radio' && scene.buttons[nearest]) scene.buttons[nearest].focus();
  if (focus === 'canvas' && scene.canvas) scene.canvas.focus();
}

/* E004-10 — le tiroir de diagnostic de la coque masque les éléments dont le
 * parent direct est le stage ou le layout et dont l'id suit -eNN. Tous les
 * nœuds créés ici sont donc accrochés à #c3b-map ou à .geo-panel (jamais au
 * stage ni au layout), tout en gardant des ids préfixés geography-v2-e004-. */
function ensureNode(parent, make, idValue, tag, className, text) {
  let node = parent.querySelector(`[id="${idValue}"]`);
  if (node) return node;
  node = make(tag, className, text);
  node.id = idValue;
  parent.appendChild(node);
  return node;
}

register('E004', (ctx) => {
  const stage = ctx && ctx.stage;
  const layout = ctx && ctx.layout;
  if (!stage || !layout || typeof stage.querySelector !== 'function') return;
  const map = layout.querySelector('#c3b-map') || stage.querySelector('#c3b-map');
  const panel = layout.querySelector('.geo-panel') || stage.querySelector('.geo-panel');
  const svg = map && map.querySelector('svg.geo-svg');
  if (!map || !panel || !svg) return;

  const make = (tag, className, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const reduced = () => (typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false);
  anim.reduced = reduced;

  /* E004-01 — feuille de style unique, dédupliquée par cssOnce, et ancrage de
     portée : aucune règle ne s'applique hors de cette vue. */
  if (typeof ctx.css === 'function') {
    ctx.css('geography-v2-e004', `
.geography-v2-e004 .geography-v2-e004-rose{position:absolute;left:14px;bottom:14px;width:132px;height:132px;border:1px solid var(--line);border-radius:50%;background:rgba(8,12,18,.82);z-index:2;pointer-events:none}
.geography-v2-e004 .geography-v2-e004-rose-point{position:absolute;font-size:9px;font-weight:600;line-height:1;color:var(--muted);white-space:nowrap;letter-spacing:.02em}
.geography-v2-e004 .geography-v2-e004-rose-point.is-active{color:var(--gold-bright);font-weight:700;text-decoration:underline;text-underline-offset:2px}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="N"]{left:50%;top:5px;transform:translateX(-50%)}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="NE"]{right:9px;top:15px}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="E"]{right:6px;top:50%;transform:translateY(-50%)}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="SE"]{right:9px;bottom:15px}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="S"]{left:50%;bottom:5px;transform:translateX(-50%)}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="SO"]{left:9px;bottom:15px}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="O"]{left:6px;top:50%;transform:translateY(-50%)}
.geography-v2-e004 .geography-v2-e004-rose-point[data-code="NO"]{left:9px;top:15px}
.geography-v2-e004 .geography-v2-e004-rose-centre{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border:1px solid var(--gold-bright);border-radius:50%;background:rgba(230,185,111,.35)}
.geography-v2-e004 .geography-v2-e004-axe{position:absolute;left:16px;top:14px;z-index:2;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--gold-bright);font-size:9px;letter-spacing:.04em;pointer-events:none}
.geography-v2-e004 .geography-v2-e004-axe-trait{width:1px;height:26px;background:linear-gradient(to bottom,var(--gold-bright),transparent)}
.geography-v2-e004 .geography-v2-e004-cap{position:absolute;left:14px;bottom:154px;z-index:2;max-width:220px;margin:0;padding:5px 7px;border:1px solid var(--line);border-radius:6px;background:rgba(8,12,18,.86);color:var(--ink-soft);font-size:9px;line-height:1.4}
.geography-v2-e004 .geography-v2-e004-bloc{margin:18px 0 0;padding-top:14px;border-top:1px solid var(--line)}
.geography-v2-e004 .geography-v2-e004-titre{margin:0 0 7px;color:var(--gold-bright);font-size:12px;font-weight:700;letter-spacing:.04em}
.geography-v2-e004 .geography-v2-e004-note{margin:6px 0;color:var(--muted);font-size:9px;line-height:1.6}
.geography-v2-e004 .geography-v2-e004-fieldset{margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px}
.geography-v2-e004 .geography-v2-e004-legend{padding:0 4px;color:var(--gold-bright);font-size:9px;font-weight:700}
.geography-v2-e004 .geography-v2-e004-groupe{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:6px 0}
.geography-v2-e004 .geography-v2-e004-dir{display:inline-flex;align-items:center;justify-content:center;width:auto;min-width:0;min-height:44px;margin:0;padding:4px 2px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--muted);font:inherit;font-size:10px;font-weight:600;cursor:pointer}
.geography-v2-e004 .geography-v2-e004-dir[aria-checked="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright)}
.geography-v2-e004 .geography-v2-e004-dir:hover{border-color:var(--gold);color:var(--gold-bright)}
.geography-v2-e004 .geography-v2-e004-figure{margin:10px 0;padding:8px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.geography-v2-e004 .geography-v2-e004-canvas{display:block;width:100%;max-width:196px;height:auto;aspect-ratio:1;margin:0 auto;touch-action:manipulation;cursor:default}
.geography-v2-e004 .geography-v2-e004-slider-bloc{margin:8px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px}
.geography-v2-e004 .geography-v2-e004-slider-label{display:block;margin-bottom:4px;color:var(--ink-soft);font-size:9px;font-weight:600}
.geography-v2-e004 .geography-v2-e004-slider{display:block;width:100%;min-height:44px;margin:0;accent-color:var(--gold);cursor:pointer}
.geography-v2-e004 .geography-v2-e004-slider-valeur{margin:2px 0 0;color:var(--gold-bright);font-size:10px;font-weight:700;font-variant-numeric:tabular-nums}
.geography-v2-e004 .geography-v2-e004-tableau{width:100%;border-collapse:collapse;margin:8px 0;font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.geography-v2-e004 .geography-v2-e004-tableau caption{margin-bottom:4px;color:var(--muted);font-size:9px;text-align:left}
.geography-v2-e004 .geography-v2-e004-tableau th,.geography-v2-e004 .geography-v2-e004-tableau td{padding:3px 5px;border-bottom:1px dotted var(--line);text-align:left}
.geography-v2-e004 .geography-v2-e004-tableau thead th{color:var(--gold-bright);font-weight:700}
.geography-v2-e004 .geography-v2-e004-tableau tbody tr.is-active{background:rgba(230,185,111,.12)}
.geography-v2-e004 .geography-v2-e004-tableau tbody tr.is-active th{color:var(--gold-bright);font-weight:700;text-decoration:underline;text-underline-offset:2px}
.geography-v2-e004 .geography-v2-e004-mesures{margin:6px 0;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(255,255,255,.02);color:var(--ink-soft);font-size:9px;line-height:1.7;font-variant-numeric:tabular-nums}
.geography-v2-e004 .geography-v2-e004-limite{margin:8px 0 0;padding:8px 10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:9px;line-height:1.7}
.geography-v2-e004 .geography-v2-e004-readout{min-height:14px;margin:6px 0;color:var(--gold-bright);font-size:10px;font-weight:600;line-height:1.5}
.geography-v2-e004 .geography-v2-e004-dir:focus-visible,.geography-v2-e004 .geography-v2-e004-slider:focus-visible,.geography-v2-e004 .geography-v2-e004-canvas:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;box-shadow:0 0 0 3px rgba(230,185,111,.14)}
@media (max-width:620px){
.geography-v2-e004 .geography-v2-e004-rose{width:104px;height:104px;left:8px;bottom:8px}
.geography-v2-e004 .geography-v2-e004-cap{left:8px;bottom:120px;max-width:170px}
.geography-v2-e004 .geography-v2-e004-axe{left:8px;top:8px}
.geography-v2-e004 .geography-v2-e004-groupe{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){
.geography-v2-e004 .geography-v2-e004-dir,.geography-v2-e004 .geography-v2-e004-rose-point{transition:none!important}
}
`);
  }
  layout.classList.add(PREFIX);
  layout.setAttribute('data-v2-e004', '1');

  /* E004-02 — rose des vents textuelle dans le coin inférieur gauche de la
     carte. Les huit libellés sont de vrais nœuds de texte, pas des pixels. */
  const rose = ensureNode(map, make, ident('rose'), 'div', 'geography-v2-e004-rose');
  rose.setAttribute('role', 'group');
  rose.setAttribute('aria-label', 'Rose des vents : huit directions, Nord en haut du cadre, sens horaire.');
  DIRECTIONS.forEach((dir) => {
    const point = ensureNode(rose, make, ident(`point-${dir.code}`), 'span',
      'geography-v2-e004-rose-point', dir.code);
    point.dataset.code = dir.code;
    point.title = `${dir.nom} — ${dir.deg}°`;
    point.setAttribute('aria-label', `${dir.nom}, ${dir.deg} degrés`);
  });
  ensureNode(rose, make, ident('centre'), 'span', 'geography-v2-e004-rose-centre');

  /* E004-03 — axe du nord géographique et mise en garde explicite : la
     projection place les latitudes croissantes vers le haut, donc le nord est
     en haut ; aucune déclinaison magnétique n'est disponible dans le jeu. */
  const axe = ensureNode(map, make, ident('axe'), 'div', 'geography-v2-e004-axe');
  ensureNode(axe, make, ident('axe-trait'), 'span', 'geography-v2-e004-axe-trait');
  const axeLabel = ensureNode(axe, make, ident('axe-label'), 'span', '', 'Nord géographique · haut du cadre');
  axeLabel.setAttribute('aria-label', 'Le haut du cadre correspond au nord géographique, latitudes croissantes.');

  const cap = ensureNode(map, make, ident('cap'), 'p', 'geography-v2-e004-cap');

  /* E004-05 à E004-09 — bloc du panneau : titre, note, fieldset radiogroupe,
     laboratoire canvas, curseur continu, tableau, mesures, clavier et limite.
     Accroché à .geo-panel, jamais au stage ni au layout. */
  const bloc = ensureNode(panel, make, ident('bloc'), 'section', 'geography-v2-e004-bloc');
  bloc.setAttribute('aria-labelledby', ident('titre'));
  ensureNode(bloc, make, ident('titre'), 'h2', 'geography-v2-e004-titre', 'Orientation cardinale · rose des vents');

  const noteNord = ensureNode(bloc, make, ident('note-nord'), 'p', 'geography-v2-e004-note',
    'Le nord affiché est le nord géographique de la projection : les latitudes croissantes vont vers le haut du cadre. Le jeu de données ne fournit ni déclinaison ni nord magnétique : aucune valeur de ce type n’est affichée.');
  noteNord.setAttribute('role', 'note');

  /* E004-05 — fieldset / legend et radiogroupe : choix unique, donc role="radio"
     + aria-checked, et non aria-pressed. Roving tabindex, cibles ≥ 44 px. */
  const fieldset = ensureNode(bloc, make, ident('fieldset'), 'fieldset', 'geography-v2-e004-fieldset');
  ensureNode(fieldset, make, ident('legend'), 'legend', 'geography-v2-e004-legend', 'Cap cardinal — choix unique');
  const groupe = ensureNode(fieldset, make, ident('groupe'), 'div', 'geography-v2-e004-groupe');
  groupe.setAttribute('role', 'radiogroup');
  groupe.setAttribute('aria-labelledby', ident('legend'));
  const buttons = DIRECTIONS.map((dir, index) => {
    const button = ensureNode(groupe, make, ident(`dir-${dir.code}`), 'button',
      'geography-v2-e004-dir', `${dir.code} · ${dir.nom}`);
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('aria-label', `${dir.nom}, ${dir.deg} degrés`);
    button.dataset.dir = String(index);
    return button;
  });

  /* E004-06 — laboratoire canvas : une seule figure, un seul canvas. */
  const figure = ensureNode(bloc, make, ident('figure'), 'figure', 'geography-v2-e004-figure');
  const canvas = ensureNode(figure, make, ident('canvas'), 'canvas', 'geography-v2-e004-canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Rose des vents interactive : aiguille pointant le cap sélectionné. Flèches gauche et droite pour changer de cap, Début pour le Nord, Fin pour le Nord-Ouest.');
  canvas.setAttribute('aria-describedby', ident('clavier'));
  const caption = ensureNode(figure, make, ident('figcaption'), 'figcaption',
    'geography-v2-e004-note', 'Rose schématique : l’aiguille indique le cap choisi, mesuré dans le sens horaire depuis le Nord.');
  caption.setAttribute('role', 'note');

  /* E004-08 — curseur continu et son étiquette : l'angle se règle de 1° en 1°
     entre 0° et 360°, avec une valeur affichée en texte indexable. */
  const sliderBloc = ensureNode(bloc, make, ident('slider-bloc'), 'div', 'geography-v2-e004-slider-bloc');
  const sliderLabel = ensureNode(sliderBloc, make, ident('slider-label'), 'label',
    'geography-v2-e004-slider-label', 'Angle continu — de 0° à 360°');
  const slider = ensureNode(sliderBloc, make, ident('slider'), 'input', 'geography-v2-e004-slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '360';
  slider.step = '1';
  slider.value = '0';
  sliderLabel.htmlFor = slider.id;
  slider.setAttribute('aria-describedby', ident('slider-note'));
  const sliderValue = ensureNode(sliderBloc, make, ident('slider-valeur'), 'p',
    'geography-v2-e004-slider-valeur', '0°');
  const sliderNote = ensureNode(sliderBloc, make, ident('slider-note'), 'p',
    'geography-v2-e004-note', 'Le curseur règle un angle continu ; les flèches du clavier le font varier d’un degré. Le point cardinal le plus proche est mis à jour automatiquement.');
  sliderNote.setAttribute('role', 'note');

  /* E004-07 — annonce live et tableau textuel des huit angles. */
  const readout = ensureNode(bloc, make, ident('readout'), 'p', 'geography-v2-e004-readout');
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  const tableau = ensureNode(bloc, make, ident('tableau'), 'table', 'geography-v2-e004-tableau');
  ensureNode(tableau, make, ident('tableau-caption'), 'caption', '',
    'Huit points cardinaux : code, nom, angle mesuré dans le sens horaire depuis le Nord, type.');
  const thead = ensureNode(tableau, make, ident('tableau-head'), 'thead', '');
  const headRow = ensureNode(thead, make, ident('tableau-head-row'), 'tr', '');
  ['Code', 'Nom', 'Angle', 'Type'].forEach((libelle) => {
    const th = ensureNode(headRow, make, ident(`tableau-th-${libelle.toLowerCase()}`), 'th', '', libelle);
    th.setAttribute('scope', 'col');
  });
  const tbody = ensureNode(tableau, make, ident('tableau-body'), 'tbody', '');
  const rows = DIRECTIONS.map((dir) => {
    const tr = ensureNode(tbody, make, ident(`tableau-row-${dir.code}`), 'tr', '');
    const th = ensureNode(tr, make, ident(`tableau-row-th-${dir.code}`), 'th', '', dir.code);
    th.setAttribute('scope', 'row');
    ensureNode(tr, make, ident(`tableau-nom-${dir.code}`), 'td', '', dir.nom);
    ensureNode(tr, make, ident(`tableau-deg-${dir.code}`), 'td', '', `${dir.deg}°`);
    ensureNode(tr, make, ident(`tableau-type-${dir.code}`), 'td', '', indexPair(dir.code));
    return { tr, th };
  });

  /* E004-08 — mesures référencées, toutes recalculées depuis la géométrie de
     la rose : 8 points, 360° ÷ 8 = 45°, un quart de tour = 90°, soit le double
     d'un octant. Aucune mesure n'est empruntée au jeu de données. */
  const mesures = ensureNode(bloc, make, ident('mesures'), 'p', 'geography-v2-e004-mesures',
    'Mesures de référence : 360° pour un tour complet, 8 points cardinaux, soit 360° ÷ 8 = 45° entre deux points consécutifs. Un quart de tour vaut 90°, c’est-à-dire deux octants de 45° : l’axe Nord–Sud et l’axe Est–Ouest se croisent à angle droit.');
  mesures.setAttribute('role', 'note');

  /* E004-09 — clavier : mêmes flèches pour le radiogroupe et le canvas,
     Début/Fin aux extrémités. Un seul écouteur délégué sur le bloc. */
  const clavier = ensureNode(bloc, make, ident('clavier'), 'p', 'geography-v2-e004-note',
    'Clavier : Tab atteint les huit directions ; ← et → parcourent le cadran par pas de 45°, Début place l’aiguille au Nord, Fin au Nord-Ouest. Le canvas accepte les mêmes touches ; le curseur avance d’un degré par flèche.');
  clavier.setAttribute('role', 'note');

  /* E004-10 — limite falsifiable. La phrase dit précisément ce qui pourrait
     contredire l'outil et invite à une vérification reproductible. */
  const limite = ensureNode(bloc, make, ident('limite'), 'p', 'geography-v2-e004-limite',
    'Limite et angle mort : le cap du lieu actif décrit une direction dans le cadre schématique, pas un azimut géographique. Falsification : zoomez ou déplacez la carte ; le cap affiché peut changer alors que les coordonnées du lieu restent identiques. Si le cap changeait sans que le viewBox change, ou si un azimut réel était annoncé, l’outil serait en défaut. Le nord magnétique n’est pas traité.');
  limite.setAttribute('role', 'note');

  scene = {
    svg, map, cap, bloc, buttons,
    points: DIRECTIONS.map((dir) => rose.querySelector(`[id="${ident(`point-${dir.code}`)}"]`)),
    rows, slider, sliderValue, readout, canvas, lastLabel: '',
  };

  /* Reconfiguration de l'animation à chaque rendu : l'ancien canvas n'est plus
     dans le document, on annule son unique boucle avant d'en reprendre une. */
  stopLoop();
  anim.canvas = canvas;
  anim.target = DIRECTIONS[selected].deg * Math.PI / 180;
  anim.angle = reduced() ? anim.target : anim.angle;
  applyAngle(DIRECTIONS[selected].deg, null, null);
  if (reduced()) {
    stopLoop();
    drawRose(canvas, anim.angle);
  }
  updateCapText();

  /* Pause sur onglet masqué, reprise explicitement pilotée. Installé une
     seule fois pour toute la durée de vie du module. */
  if (!anim.visibilityHooked && typeof document !== 'undefined') {
    anim.visibilityHooked = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else ensureLoop();
    });
  }

  /* Écouteurs locaux, posés une seule fois par nœud rendu. */
  if (!map.dataset.v2e004Cap) {
    map.dataset.v2e004Cap = '1';
    svg.addEventListener('wheel', updateCapText, { passive: true });
    map.addEventListener('pointerup', updateCapText);
    map.addEventListener('keydown', (event) => {
      if (['+', '=', '-', '_', '0'].includes(event.key)) updateCapText();
    });
  }

  if (!bloc.dataset.v2e004Keys) {
    bloc.dataset.v2e004Keys = '1';
    bloc.addEventListener('click', (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const button = target.closest('.geography-v2-e004-dir');
      if (!button || !groupe.contains(button)) return;
      const dir = DIRECTIONS[Number(button.dataset.dir)];
      applyAngle(dir.deg, `Cap sélectionné : ${dir.nom} (${dir.deg}° dans le sens horaire depuis le nord).`, null);
    });
    bloc.addEventListener('input', (event) => {
      if (event.target !== slider) return;
      const valeur = Number(slider.value);
      const proche = DIRECTIONS[Math.round(valeur / 45) % 8];
      applyAngle(valeur, `Cap continu : ${valeur}° dans le sens horaire depuis le nord ; point cardinal le plus proche : ${proche.nom} (${proche.deg}°).`, null);
    });
    bloc.addEventListener('keydown', (event) => {
      const target = event.target;
      const isRadio = target && typeof target.classList === 'object'
        && target.classList.contains('geography-v2-e004-dir');
      const isCanvas = target === canvas;
      if (!isRadio && !isCanvas) return;
      const courant = Math.round(anim.target * 180 / Math.PI);
      let next = courant;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = courant + 45;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = courant - 45;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = 315;
      else return;
      event.preventDefault();
      event.stopPropagation();
      const dir = DIRECTIONS[Math.round(((next % 360) + 360) % 360 / 45) % 8];
      applyAngle(next, `Cap ajusté au clavier : ${dir.nom} (${dir.deg}° dans le sens horaire depuis le nord).`, isRadio ? 'radio' : 'canvas');
    });
  }
});

/* Type d'un point : cardinal (axe principal) ou intercardinal (entre deux
 * axes). Fonction pure, déterministe, utilisée pour la colonne du tableau. */
function indexPair(code) {
  return code.length === 1 ? 'Cardinal' : 'Intercardinal';
}
