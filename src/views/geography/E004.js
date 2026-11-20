import { register } from './registry.js';

/* Lentille E004 — vue GEOGRAPHIE : rose des vents et orientation cardinale.
 *
 * Dix chantiers (E004-01 à E004-10) appliqués après le rendu de geography.js,
 * qui appelle runEnhancements({ viewId, stage, layout }) en fin de fonction.
 * Aucune ligne de la vue, du registre, de styles.css ou du jeu de données
 * n'est modifiée. La lentille est une surcouche : la carte et le panneau
 * restent lisibles et utilisables sans elle.
 *
 * Rigueur des contenus : aucun azimut géographique n'est inventé. Le cap
 * affiché est une direction SCHÉMATIQUE calculée depuis le viewBox réel et la
 * position réelle du marqueur actif ; le nord magnétique et la déclinaison ne
 * sont pas fournis par le jeu de données et sont signalés comme tels.
 *
 * Contrat : un seul register('E004', …), CSS via ctx.css('geography-e004', …),
 * identifiants préfixés geography-e004-*, français partout, zéro journalisation,
 * zéro réseau, zéro aléa, une seule boucle rAF suspendue sur
 * document.hidden et respectueuse de ctx.reducedMotion().
 */

const PREFIX = 'geography-e004';

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
  anim.raf = requestAnimationFrame(tick);
}

function tick() {
  anim.raf = 0;
  if (!anim.canvas || !anim.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return;

  /* Le mouvement réduit est relu à chaque image : un changement de
     préférence à chaud est honoré sans reconstruire la lentille. */
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
 * une seule écriture par image. Les lettres sont aussi dans la liste
 * textuelle E004-07 : l'information ne dépend pas du canvas. */
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
  } catch { /* environnement sans getComputedStyle : couleurs de repli */ }

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

  painter.fillStyle = gold;
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

/* E004-05 / E004-07 / E004-09 — une seule fonction de mise à jour de l'état
 * sélectionné : radiogroupe, rose textuelle, aiguille et annonce live. */
function applyDirection(index, focus) {
  if (!scene) return;
  const position = ((index % 8) + 8) % 8;
  selected = position;
  const dir = DIRECTIONS[position];

  scene.buttons.forEach((button, i) => {
    const isCurrent = i === position;
    button.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
    button.tabIndex = isCurrent ? 0 : -1;
  });
  scene.points.forEach((point, i) => {
    const isCurrent = i === position;
    point.classList.toggle('is-active', isCurrent);
    if (isCurrent) point.setAttribute('aria-current', 'true');
    else point.removeAttribute('aria-current');
  });

  scene.readout.textContent = `Cap sélectionné : ${dir.nom} (${dir.deg}° dans le sens horaire depuis le nord).`;
  anim.target = dir.deg * Math.PI / 180;
  if (anim.reduced()) {
    stopLoop();
    anim.angle = anim.target;
    drawRose(anim.canvas, anim.angle);
  } else {
    ensureLoop();
  }
  if (focus === 'radio' && scene.buttons[position]) scene.buttons[position].focus();
  if (focus === 'canvas' && scene.canvas) scene.canvas.focus();
}

/* E004-10 — le tiroir de diagnostic de la coque masque les éléments dont le
 * parent direct est le stage ou le layout et dont l'id suit -eNN. Tous les
 * nœuds créés ici sont donc accrochés à #c3b-map ou à .geo-panel (jamais au
 * stage ni au layout), tout en gardant des ids préfixés geography-e004-. */
function ensureNode(parent, make, id, tag, className, text) {
  let node = parent.querySelector(`[id="${id}"]`);
  if (node) return node;
  node = make(tag, className, text);
  node.id = id;
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

  /* E004-01 — feuille de style unique, dédupliquée par cssOnce, et ancrage
     de portée : aucune règle ne s'applique hors de cette vue. */
  if (typeof ctx.css === 'function') {
    ctx.css('geography-e004', `
.geography-e004 .geography-e004-rose{position:absolute;left:14px;bottom:14px;width:128px;height:128px;border:1px solid var(--line);border-radius:50%;background:rgba(8,12,18,.82);z-index:2;pointer-events:none}
.geography-e004 .geography-e004-rose-point{position:absolute;font-size:9px;font-weight:600;line-height:1;color:var(--muted);white-space:nowrap;letter-spacing:.02em}
.geography-e004 .geography-e004-rose-point.is-active{color:var(--gold-bright);font-weight:700;text-decoration:underline;text-underline-offset:2px}
.geography-e004 .geography-e004-rose-point[data-code="N"]{left:50%;top:5px;transform:translateX(-50%)}
.geography-e004 .geography-e004-rose-point[data-code="NE"]{right:9px;top:15px}
.geography-e004 .geography-e004-rose-point[data-code="E"]{right:6px;top:50%;transform:translateY(-50%)}
.geography-e004 .geography-e004-rose-point[data-code="SE"]{right:9px;bottom:15px}
.geography-e004 .geography-e004-rose-point[data-code="S"]{left:50%;bottom:5px;transform:translateX(-50%)}
.geography-e004 .geography-e004-rose-point[data-code="SO"]{left:9px;bottom:15px}
.geography-e004 .geography-e004-rose-point[data-code="O"]{left:6px;top:50%;transform:translateY(-50%)}
.geography-e004 .geography-e004-rose-point[data-code="NO"]{left:9px;top:15px}
.geography-e004 .geography-e004-rose-centre{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border:1px solid var(--gold-bright);border-radius:50%;background:rgba(230,185,111,.35)}
.geography-e004 .geography-e004-axe{position:absolute;left:16px;top:14px;z-index:2;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--gold-bright);font-size:9px;letter-spacing:.04em;pointer-events:none}
.geography-e004 .geography-e004-axe-trait{width:1px;height:26px;background:linear-gradient(to bottom,var(--gold-bright),transparent)}
.geography-e004 .geography-e004-cap{position:absolute;left:14px;bottom:150px;z-index:2;max-width:210px;margin:0;padding:5px 7px;border:1px solid var(--line);border-radius:6px;background:rgba(8,12,18,.86);color:var(--ink-soft);font-size:9px;line-height:1.4}
.geography-e004 .geography-e004-bloc{margin:18px 0 0;padding-top:14px;border-top:1px solid var(--line)}
.geography-e004 .geography-e004-titre{margin:0 0 7px;color:var(--gold-bright);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.geography-e004 .geography-e004-note{margin:6px 0;color:var(--muted);font-size:9px;line-height:1.6}
.geography-e004 .geography-e004-groupe{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:8px 0 10px}
.geography-e004 .geography-e004-dir{display:inline-flex;align-items:center;justify-content:center;width:auto;min-width:0;min-height:44px;margin:0;padding:4px 2px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--muted);font:inherit;font-size:10px;font-weight:600;cursor:pointer}
.geography-e004 .geography-e004-dir[aria-checked="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright)}
.geography-e004 .geography-e004-dir:hover{border-color:var(--gold);color:var(--gold-bright)}
.geography-e004 .geography-e004-dir:focus-visible,.geography-e004 .geography-e004-canvas:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;box-shadow:0 0 0 3px rgba(230,185,111,.14)}
.geography-e004 .geography-e004-figure{margin:10px 0;padding:8px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.geography-e004 .geography-e004-canvas{display:block;width:100%;max-width:196px;height:auto;aspect-ratio:1;margin:0 auto;touch-action:manipulation;cursor:default}
.geography-e004 .geography-e004-legende{margin:6px 0 0;padding:0;list-style:none;font-size:9px;line-height:1.7;color:var(--muted);font-variant-numeric:tabular-nums}
.geography-e004 .geography-e004-legende li{display:flex;justify-content:space-between;gap:8px;border-bottom:1px dotted var(--line)}
.geography-e004 .geography-e004-legende li:last-child{border-bottom:0}
.geography-e004 .geography-e004-mesures{margin:6px 0;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(255,255,255,.02);color:var(--ink-soft);font-size:9px;line-height:1.7;font-variant-numeric:tabular-nums}
.geography-e004 .geography-e004-limite{margin:8px 0 0;padding:8px 10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:9px;line-height:1.7}
.geography-e004 .geography-e004-readout{min-height:14px;margin:6px 0;color:var(--gold-bright);font-size:10px;font-weight:600;line-height:1.5}
@media (max-width:620px){
.geography-e004 .geography-e004-rose{width:100px;height:100px;left:8px;bottom:8px}
.geography-e004 .geography-e004-cap{left:8px;bottom:116px;max-width:160px}
.geography-e004 .geography-e004-axe{left:8px;top:8px}
.geography-e004 .geography-e004-groupe{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){
.geography-e004 .geography-e004-dir,.geography-e004 .geography-e004-rose-point{transition:none!important}
}
`);
  }
  layout.classList.add('geography-e004');
  layout.setAttribute('data-e004', '1');

  /* E004-02 — rose des vents textuelle dans le coin inférieur gauche de la
     carte. Les huit libellés sont de vrais nœuds de texte, pas des pixels. */
  const rose = ensureNode(map, make, 'geography-e004-rose', 'div',
    'geography-e004-rose');
  rose.setAttribute('role', 'group');
  rose.setAttribute('aria-label', 'Rose des vents : huit directions, Nord en haut du cadre, sens horaire.');
  DIRECTIONS.forEach((dir) => {
    const point = ensureNode(rose, make, `geography-e004-point-${dir.code}`, 'span',
      'geography-e004-rose-point', dir.code);
    point.dataset.code = dir.code;
    point.title = `${dir.nom} — ${dir.deg}°`;
    point.setAttribute('aria-label', `${dir.nom}, ${dir.deg} degrés`);
  });
  ensureNode(rose, make, 'geography-e004-centre', 'span', 'geography-e004-rose-centre');

  /* E004-03 — axe du nord géographique et mise en garde explicite : la
     projection place les latitudes croissantes vers le haut, donc le nord est
     en haut ; aucune déclinaison magnétique n'est disponible dans le jeu. */
  const axe = ensureNode(map, make, 'geography-e004-axe', 'div', 'geography-e004-axe');
  ensureNode(axe, make, 'geography-e004-axe-trait', 'span', 'geography-e004-axe-trait');
  const axeLabel = ensureNode(axe, make, 'geography-e004-axe-label', 'span', '', 'Nord géographique · haut du cadre');
  axeLabel.setAttribute('aria-label', 'Le haut du cadre correspond au nord géographique, latitudes croissantes.');

  const cap = ensureNode(map, make, 'geography-e004-cap', 'p', 'geography-e004-cap');

  /* E004-05 à E004-09 — bloc du panneau : Contrôles, laboratoire, légende,
     mesures et limite. Accroché à .geo-panel, jamais au stage ni au layout. */
  const bloc = ensureNode(panel, make, 'geography-e004-bloc', 'section', 'geography-e004-bloc');
  bloc.setAttribute('aria-labelledby', 'geography-e004-titre');
  const titre = ensureNode(bloc, make, 'geography-e004-titre', 'h3',
    'geography-e004-titre', 'Orientation cardinale · rose des vents');

  const noteNord = ensureNode(bloc, make, 'geography-e004-note-nord', 'p',
    'geography-e004-note',
    'Le nord affiché est le nord géographique de la projection : les latitudes croissantes vont vers le haut du cadre. Le jeu de données ne fournit ni déclinaison ni nord magnétique : aucune valeur de ce type n’est affichée.');
  noteNord.setAttribute('role', 'note');

  /* E004-05 — selecteur de cap en radiogroupe : choix unique, donc
     role="radio" + aria-checked, et non aria-pressed. Roving tabindex. */
  const groupe = ensureNode(bloc, make, 'geography-e004-groupe', 'div',
    'geography-e004-groupe');
  groupe.setAttribute('role', 'radiogroup');
  groupe.setAttribute('aria-label', 'Choisir un point cardinal pour orienter l’aiguille');
  const buttons = DIRECTIONS.map((dir, index) => {
    const button = ensureNode(groupe, make, `geography-e004-dir-${dir.code}`, 'button',
      'geography-e004-dir', `${dir.code} · ${dir.nom}`);
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('aria-label', `${dir.nom}, ${dir.deg} degrés`);
    button.dataset.dir = String(index);
    return button;
  });

  /* E004-06 — laboratoire canvas : une seule figure, un seul canvas. */
  const figure = ensureNode(bloc, make, 'geography-e004-figure', 'figure',
    'geography-e004-figure');
  const canvas = ensureNode(figure, make, 'geography-e004-canvas', 'canvas',
    'geography-e004-canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Rose des vents interactive : aiguille pointant le cap sélectionné. Flèches gauche et droite pour changer de cap, Début pour le Nord, Fin pour le Nord-Ouest.');
  canvas.setAttribute('aria-describedby', 'geography-e004-clavier');
  const caption = ensureNode(figure, make, 'geography-e004-figcaption', 'figcaption',
    'geography-e004-note', 'Rose schématique : l’aiguille indique le cap choisi, mesuré dans le sens horaire depuis le Nord.');
  caption.setAttribute('role', 'note');

  /* E004-07 — annonce live et légende textuelle des huit angles. */
  const readout = ensureNode(bloc, make, 'geography-e004-readout', 'p',
    'geography-e004-readout');
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  const legend = ensureNode(bloc, make, 'geography-e004-legende', 'ul',
    'geography-e004-legende');
  DIRECTIONS.forEach((dir) => {
    const li = ensureNode(legend, make, `geography-e004-legende-${dir.code}`, 'li', '');
    ensureNode(li, make, `geography-e004-legende-nom-${dir.code}`, 'span', '', dir.nom);
    ensureNode(li, make, `geography-e004-legende-deg-${dir.code}`, 'span', '', `${dir.deg}°`);
  });
  const legendNote = ensureNode(bloc, make, 'geography-e004-legende-note', 'p',
    'geography-e004-note', 'Angles mesurés dans le sens horaire depuis le Nord ; un point intercardinal se situe à mi-chemin de deux points cardinaux.');
  legendNote.setAttribute('role', 'note');

  /* E004-08 — mesures référencées, toutes recalculées depuis la géométrie de
     la rose : 8 points, 360° ÷ 8 = 45°, un quart de tour = 90°, soit le double
     d'un octant. Aucune mesure n'est empruntée au jeu de données. */
  const mesures = ensureNode(bloc, make, 'geography-e004-mesures', 'p',
    'geography-e004-mesures',
    'Mesures de référence : 360° pour un tour complet, 8 points cardinaux, soit 360° ÷ 8 = 45° entre deux points consécutifs. Un quart de tour vaut 90°, c’est-à-dire deux octants de 45° : l’axe Nord–Sud et l’axe Est–Ouest se croisent à angle droit.');
  mesures.setAttribute('role', 'note');

  /* E004-09 — clavier : mêmes flèches pour le radiogroupe et le canvas,
     Début/Fin aux extrémités. Un seul écouteur délégué sur le bloc. */
  const clavier = ensureNode(bloc, make, 'geography-e004-clavier', 'p',
    'geography-e004-note',
    'Clavier : Tab atteint les huit directions ; ← et → parcourent le cadran, Début place l’aiguille au Nord, Fin au Nord-Ouest. Le canvas accepte les mêmes touches.');
  clavier.setAttribute('role', 'note');

  /* E004-10 — limite falsifiable. La phrase dit précisément ce qui pourrait
     contredire l'outil et invite à une vérification reproductible. */
  const limite = ensureNode(bloc, make, 'geography-e004-limite', 'p',
    'geography-e004-limite',
    'Limite et angle mort : le cap du lieu actif décrit une direction dans le cadre schématique, pas un azimut géographique. Falsification : zoomez ou déplacez la carte ; le cap affiché peut changer alors que les coordonnées du lieu restent identiques. Si le cap changeait sans que le viewBox change, ou si un azimut réel était annoncé, l’outil serait en défaut. Le nord magnétique n’est pas traité.');
  limite.setAttribute('role', 'note');

  scene = {
    svg, map, cap, bloc, buttons,
    points: DIRECTIONS.map((dir) => rose.querySelector(`#geography-e004-point-${dir.code}`)),
    readout, canvas,
  };

  /* Reconfiguration de l'animation à chaque rendu : l'ancien canvas n'est plus
     dans le document, on annule son unique boucle avant d'en reprendre une. */
  stopLoop();
  anim.canvas = canvas;
  anim.target = DIRECTIONS[selected].deg * Math.PI / 180;
  anim.angle = reduced() ? anim.target : anim.angle;
  applyDirection(selected, null);
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
  if (!map.dataset.e004Cap) {
    map.dataset.e004Cap = '1';
    svg.addEventListener('wheel', updateCapText, { passive: true });
    map.addEventListener('pointerup', updateCapText);
    map.addEventListener('keydown', (event) => {
      if (['+', '=', '-', '_', '0'].includes(event.key)) updateCapText();
    });
  }

  if (!bloc.dataset.e004Keys) {
    bloc.dataset.e004Keys = '1';
    bloc.addEventListener('click', (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const button = target.closest('.geography-e004-dir');
      if (!button || !groupe.contains(button)) return;
      applyDirection(Number(button.dataset.dir), null);
    });
    bloc.addEventListener('keydown', (event) => {
      const target = event.target;
      const isRadio = target && typeof target.classList === 'object'
        && target.classList.contains('geography-e004-dir');
      const isCanvas = target === canvas;
      if (!isRadio && !isCanvas) return;
      let next = selected;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (selected + 1) % 8;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (selected + 7) % 8;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = 7;
      else return;
      event.preventDefault();
      event.stopPropagation();
      applyDirection(next, isRadio ? 'radio' : 'canvas');
    });
  }
});
