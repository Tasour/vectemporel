import { register } from './registry.js';

/*
 * Lentille V2 E038 — solstices et équinoxes (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E038-01 … E038-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E038', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-v2-e038`.
 * Tous les identifiants DOM sont préfixés `geography-v2-e038-`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué ou le canvas hors écran). Tout le
 * contenu est du texte DOM lisible sans script ; le canvas ne détient aucune
 * information exclusive.
 *
 * Les grandeurs (obliquité, déclinaison, hauteur méridienne, durée du jour)
 * sont recalculées depuis leur formule et depuis la latitude RÉELLE affichée
 * par la vue (.geo-coords). Aucune date n'est présentée comme exacte : les
 * jalons sont donnés en « vers le … », avec la variabilité d'un ou deux jours.
 *
 * Le fond étoilé du schéma est déterministe : graine fixe 0xE038 passée à
 * mulberry32, affichée en clair dans le texte — aucun tirage natif.
 */

const P = 'geography-v2-e038';
const CSS_ID = P;
const SECTION_ID = `${P}-section`;
const EPS = 23.44;                 // obliquité moyenne de l'écliptique, degrés (≈ 23°26′)
const YEAR_DAYS = 365.2422;        // année tropique moyenne, jours
const STEP_MS = 900;               // pas de la lecture animée de l'année
const SEED = 0xE038;               // graine fixe et affichée, zéro tirage aléatoire
const NARROW = '\u202f';           // espace insécable fine (typographie française)
const MINUS = '\u2212';            // signe moins typographique

const RAD = Math.PI / 180;
const ARC = 180 / Math.PI;

/* Quatre jalons, ordre chronologique. L'angle sert uniquement au schéma :
   été à droite (pôle nord penché vers le Soleil), hiver à gauche, printemps
   en bas, automne en haut ; l'axe des pôles reste parallèle partout. */
const JALONS = [
  { key: 'printemps', nom: 'Équinoxe de printemps', date: 'vers le 20–21 mars', longitude: 0, angle: 270 },
  { key: 'ete', nom: 'Solstice d’été', date: 'vers le 21 juin', longitude: 90, angle: 0 },
  { key: 'automne', nom: 'Équinoxe d’automne', date: 'vers le 22–23 septembre', longitude: 180, angle: 90 },
  { key: 'hiver', nom: 'Solstice d’hiver', date: 'vers le 21 décembre', longitude: 270, angle: 180 },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let observerBound = false;
let frame = 0;
let selected = 1; // solstice d'été par défaut
let playing = false;
let visible = true;
let renders = 0;
let EL = null;

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/* Fabrique d'éléments : ctx.el est la source, repli local si besoin. */
function mk(tag, className, text) {
  if (EL && typeof EL === 'function') return EL(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* δ = arcsin(sin ε · sin λ), λ = longitude écliptique comptée depuis
   l'équinoxe de printemps (0° printemps, 90° été, 180° automne, 270° hiver). */
function declinaison(longitude) {
  return Math.asin(Math.sin(EPS * RAD) * Math.sin(longitude * RAD)) * ARC;
}

/* Hauteur du Soleil à midi solaire vrai : h = 90° − |φ − δ|. */
function hauteurMidi(lat, dec) {
  return 90 - Math.abs(lat - dec);
}

/* Demi-journée H₀ : cos H₀ = −tan φ · tan δ ; durée = 24 · H₀ / π.
   Les dépassements de [-1, 1] correspondent au jour ou à la nuit polaire. */
function dureeJour(lat, dec) {
  const cosine = -Math.tan(lat * RAD) * Math.tan(dec * RAD);
  if (cosine >= 1) return 0;    // nuit polaire
  if (cosine <= -1) return 24;  // jour polaire
  return (24 * Math.acos(cosine)) / Math.PI;
}

/* Lecture de la latitude réellement affichée dans .geo-coords (3 décimales). */
function readLatitude(layout) {
  const node = layout.querySelector('.geo-coords');
  const match = node ? (node.textContent || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/) : null;
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!finite(lat) || !finite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function readPlace(layout) {
  const title = layout.querySelector('.geo-title');
  return title ? (title.textContent || '').trim() : '';
}

/* E038-06 — fond étoilé déterministe (graine affichée, aucun tirage natif). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ETOILES = (() => {
  const r = mulberry32(SEED);
  return Array.from({ length: 22 }, () => ({ x: r(), y: r(), a: 0.25 + r() * 0.5 }));
})();

/* E038-01 — feuille de styles unique, isolée et idempotente. Cadrée par
   [data-geography-v2-e038="on"] posé sur .geo-layout. Aucune règle ne déborde,
   aucune information n'est portée par la seule couleur, cibles tactiles ≥ 44 px,
   focus visible. */
const RULES = `
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-value { color: var(--ink); }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-jalons,
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-mesures { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-jalons li,
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-mesures li { margin: 0 0 4px; }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-jalon {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-jalon:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-jalon[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-jalon:focus-visible,
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-canvas:focus-visible,
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-play:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-canvas {
  display: block; width: 100%; max-width: 220px; height: auto; aspect-ratio: 1;
  margin: 0 auto; touch-action: manipulation; cursor: default;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-play {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-play:hover { border-color: var(--gold); }
@media (max-width: 620px) {
  .geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-group { grid-template-columns: 1fr; }
  .geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-canvas { max-width: 200px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-v2-e038="on"] .geography-v2-e038-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E038-06 — dessin déterministe du schéma. Un seul canvas, DPR plafonné à 2,
   couleurs lues dans les variables de thème avec repli. Le schéma est une
   redondance visuelle : les quatre jalons et leurs nombres sont déjà en texte. */
function drawOrbit(canvas, index) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const painter = canvas.getContext('2d');
  if (!painter) return;
  const size = Math.max(140, Math.min(220, canvas.clientWidth || 200));
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pixels = Math.round(size * dpr);
  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, size, size);

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

  /* Fond étoilé déterministe (graine 0xE038, jamais aléatoire). */
  painter.fillStyle = muted;
  ETOILES.forEach((star) => {
    painter.globalAlpha = star.a;
    painter.fillRect(star.x * size, star.y * size, 1, 1);
  });
  painter.globalAlpha = 1;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.33;

  /* Orbite et Soleil. */
  painter.strokeStyle = muted;
  painter.lineWidth = 1;
  painter.setLineDash([3, 4]);
  painter.beginPath();
  painter.arc(cx, cy, radius, 0, Math.PI * 2);
  painter.stroke();
  painter.setLineDash([]);
  painter.fillStyle = bright;
  painter.beginPath();
  painter.arc(cx, cy, size * 0.055, 0, Math.PI * 2);
  painter.fill();

  /* Rayon vers la Terre sélectionnée. */
  const active = JALONS[index];
  const ax = cx + radius * Math.cos(active.angle * RAD);
  const ay = cy - radius * Math.sin(active.angle * RAD);
  painter.strokeStyle = gold;
  painter.lineWidth = 1;
  painter.beginPath();
  painter.moveTo(cx, cy);
  painter.lineTo(ax, ay);
  painter.stroke();

  /* Quatre Terres, axe des pôles toujours parallèle (vers le haut à gauche). */
  const tiltX = -0.42;
  const tiltY = -0.91;
  JALONS.forEach((jalon, i) => {
    const x = cx + radius * Math.cos(jalon.angle * RAD);
    const y = cy - radius * Math.sin(jalon.angle * RAD);
    const isActive = i === index;
    const earthR = isActive ? size * 0.052 : size * 0.038;

    painter.strokeStyle = isActive ? bright : muted;
    painter.lineWidth = isActive ? 2.4 : 1.4;
    painter.beginPath();
    painter.moveTo(x - tiltX * size * 0.09, y - tiltY * size * 0.09);
    painter.lineTo(x + tiltX * size * 0.09, y + tiltY * size * 0.09);
    painter.stroke();

    painter.fillStyle = isActive ? bright : gold;
    painter.beginPath();
    painter.arc(x, y, earthR, 0, Math.PI * 2);
    painter.fill();

    if (isActive) {
      painter.strokeStyle = ink;
      painter.lineWidth = 1.4;
      painter.beginPath();
      painter.arc(x, y, earthR + 4, 0, Math.PI * 2);
      painter.stroke();
    }
  });

  /* N : extrémité nord de l'axe de la Terre sélectionnée. */
  const nx = cx + radius * Math.cos(active.angle * RAD) + tiltX * size * 0.09;
  const ny = cy - radius * Math.sin(active.angle * RAD) + tiltY * size * 0.09;
  painter.fillStyle = bright;
  painter.font = `${Math.max(9, Math.round(size * 0.06))}px sans-serif`;
  painter.fillText('N', nx - 3, ny - 5);
}

/* E038-10 — une seule frame, court-circuitée quand l'onglet est masqué. */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.canvas || !scene.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return; // pause hors écran

  if (scene.playing && !scene.reduced() && visible) {
    if (scene.last === null) scene.last = timestamp;
    scene.elapsed += timestamp - scene.last;
    scene.last = timestamp;
    const next = Math.floor(scene.elapsed / STEP_MS) % JALONS.length;
    if (next !== selected) applySelection(next, scene, true);
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      if (scene.play) scene.play.textContent = 'Lancer l’année';
    }
  }
  drawOrbit(scene.canvas, selected);
  if (scene.playing && !scene.reduced() && visible) ensureLoop();
}

function ensureLoop() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (!visible) return;
  if (typeof requestAnimationFrame !== 'function') { loop(0); return; }
  frame = requestAnimationFrame(loop);
}

function stopLoop() {
  if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
  frame = 0;
  if (latest) latest.last = null;
}

/* Sélection d'un jalon : textes, aria-checked, roving tabindex, annonce. */
function applySelection(index, scene, fromAnimation) {
  const sceneRef = scene || latest;
  if (!sceneRef) return;
  selected = Math.max(0, Math.min(JALONS.length - 1, index));
  const jalon = JALONS[selected];
  const values = sceneRef.values[selected];

  sceneRef.radios.forEach((radio, i) => {
    const on = i === selected;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });

  if (sceneRef.readout) {
    const dec = values ? values.dec : declinaison(jalon.longitude);
    if (sceneRef.lat !== null && finite(sceneRef.lat) && values) {
      sceneRef.readout.textContent =
        `${jalon.nom} · ${jalon.date} · déclinaison ${num(dec, 2)}° ` +
        `· hauteur à midi ${num(values.midi, 1)}° · jour ${num(values.jour, 1)} h ` +
        `à latitude ${num(sceneRef.lat, 3)}°.`;
    } else {
      sceneRef.readout.textContent =
        `${jalon.nom} · ${jalon.date} · déclinaison ${num(dec, 2)}° ` +
        `· hauteur et durée du jour non calculables (aucune latitude affichée).`;
    }
  }

  if (!fromAnimation && sceneRef.readout) {
    sceneRef.readout.setAttribute(`data-${P}-announce`, jalon.key);
  }
  if (sceneRef.canvas) drawOrbit(sceneRef.canvas, selected);
}

/* E038-10 — installation unique et silencieuse des écouteurs globaux. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (latest && latest.playing && !latest.reduced() && visible) ensureLoop();
  });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') {
        query.addEventListener('change', () => {
          if (!latest) return;
          if (latest.reduced()) { stopLoop(); drawOrbit(latest.canvas, selected); }
          else if (latest.playing && visible) ensureLoop();
        });
      }
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

/* E038-10 — suspension du dessin hors écran (une seule fois). */
function installObserver() {
  const canvas = latest && latest.canvas;
  if (observerBound || !canvas || typeof IntersectionObserver !== 'function') return;
  observerBound = true;
  try {
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      visible = !entry || entry.isIntersecting;
      if (!visible) stopLoop();
      else if (latest && latest.playing && !latest.reduced()) ensureLoop();
      else if (latest && latest.canvas) drawOrbit(latest.canvas, selected);
    }, { threshold: 0.01 });
    obs.observe(canvas);
  } catch { /* observateur indisponible : le dessin reste actif, sans aléa. */ }
}

function line(ctx, parent, index, label, text, valueId) {
  const paragraph = mk('p', `${P}-line`);
  paragraph.id = `${P}-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(mk('strong', '', `E038-${String(index).padStart(2, '0')} · ${label}. `));
  const value = mk('span', `${P}-value`, text);
  if (valueId) value.id = valueId;
  paragraph.appendChild(value);
  parent.appendChild(paragraph);
  return value;
}

/* Construction de la fiche sémantique complète (texte lisible sans JS). */
function buildSection(ctx, layout, pair, place) {
  const previous = layout.querySelector(`#${SECTION_ID}`);
  if (previous && previous.parentNode) previous.parentNode.removeChild(previous);

  const panel = layout.querySelector('.geo-panel') || layout;
  const section = mk('section', `${P}-section`);
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Solstices et équinoxes');
  section.setAttribute('data-sim', 'solstices-equinoxes-v2');

  section.appendChild(mk('h2', '', 'Solstices et équinoxes — lire l’inclinaison du Soleil'));

  /* E038-02 — quatre jalons en texte indexable. */
  const intro = mk('p', `${P}-line`);
  intro.id = `${P}-intro`;
  intro.appendChild(mk('strong', '', 'E038-02 · Quatre jalons. '));
  intro.appendChild(document.createTextNode(
    'L’année solaire est marquée par deux solstices (déclinaison solaire maximale) ' +
    'et deux équinoxes (déclinaison nulle). Dates approximatives, variables d’un ou deux jours :'
  ));
  section.appendChild(intro);

  const list = mk('ul', `${P}-jalons`);
  list.id = `${P}-jalons`;
  JALONS.forEach((jalon, i) => {
    const dec = declinaison(jalon.longitude);
    const item = mk('li', '', `${jalon.nom} — ${jalon.date} : déclinaison ${num(dec, 2)}°.`);
    item.id = `${P}-jalon-texte-${i}`;
    list.appendChild(item);
  });
  section.appendChild(list);

  /* E038-03 — latitude réellement affichée. */
  const latText = pair
    ? `Latitude lue dans la carte${place ? ` (${place})` : ''} : ${num(pair.lat, 3)}° ; longitude ${num(pair.lon, 3)}°.`
    : 'Aucune paire de coordonnées affichée pour ce lieu : la hauteur du Soleil et la durée du jour ne sont pas calculables ici.';
  line(ctx, section, 3, 'Latitude de référence', latText);

  const values = JALONS.map((jalon) => {
    const dec = declinaison(jalon.longitude);
    if (!pair) return { dec, midi: null, jour: null };
    return { dec, midi: hauteurMidi(pair.lat, dec), jour: dureeJour(pair.lat, dec) };
  });

  /* E038-04 — hauteur méridienne, recalculée. */
  const midiText = pair
    ? `À ${num(pair.lat, 3)}° de latitude, h = 90° − |φ − δ| donne ` +
      `≈ ${num(values[1].midi, 1)}° au solstice d’été et ≈ ${num(values[3].midi, 1)}° au solstice d’hiver.`
    : 'Formule : h = 90° − |φ − δ|, avec φ la latitude du lieu et δ la déclinaison du jour.';
  line(ctx, section, 4, 'Hauteur à midi', midiText);

  /* E038-05 — durée du jour, recalculée. */
  const jourText = pair
    ? `cos H₀ = −tan φ · tan δ, durée = 24 · H₀ / π : ` +
      `≈ ${num(values[1].jour, 1)} h en été, ${num(values[0].jour, 1)} h aux équinoxes, ` +
      `${num(values[3].jour, 1)} h en hiver (hors réfraction atmosphérique).`
    : 'cos H₀ = −tan φ · tan δ et durée = 24 · H₀ / π ; aux équinoxes (δ = 0°), la durée vaut 12 h en toute latitude.';
  line(ctx, section, 5, 'Durée du jour', jourText);

  /* E038-09 — radiogroupe de quatre jalons (choix unique : pas d'aria-pressed). */
  const group = mk('div', `${P}-group`);
  group.id = `${P}-group`;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir un jalon solaire');
  JALONS.forEach((jalon, i) => {
    const radio = mk('button', `${P}-jalon`, `${jalon.nom} — ${jalon.date}`);
    radio.type = 'button';
    radio.id = `${P}-radio-${i}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === selected ? 'true' : 'false');
    radio.tabIndex = i === selected ? 0 : -1;
    group.appendChild(radio);
  });
  section.appendChild(group);

  /* E038-07 — région live unique. */
  const readout = mk('p', `${P}-readout`, '');
  readout.id = `${P}-readout`;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E038-06 — laboratoire canvas, redondant avec le texte. */
  const figure = mk('figure', `${P}-figure`);
  figure.id = `${P}-figure`;
  const canvas = mk('canvas', `${P}-canvas`);
  canvas.id = `${P}-canvas`;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Schéma non à l’échelle : Terre en quatre positions autour du Soleil, axe des pôles ' +
    'toujours parallèle. Flèches pour changer de jalon, Début pour le printemps, Fin pour l’hiver.');
  canvas.setAttribute('aria-describedby', `${P}-clavier`);
  const caption = mk('figcaption', `${P}-caption`,
    'Schéma non à l’échelle : l’axe des pôles reste parallèle ; les nombres sont donnés en texte ci-dessus.');
  caption.id = `${P}-caption`;
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E038-06 — graine déterministe du fond étoilé, affichée. */
  const graine = mk('p', `${P}-line`,
    `E038-06 · Fond étoilé déterministe : graine 0x${SEED.toString(16).toUpperCase()} ` +
    `(${SEED}) via mulberry32 ; aucun tirage aléatoire, aucun appel réseau.`);
  graine.id = `${P}-graine`;
  section.appendChild(graine);

  /* E038-08 — mesures référencées, dont une comparée à une référence. */
  const measures = mk('ul', `${P}-mesures`);
  measures.id = `${P}-mesures`;
  const items = [
    `Obliquité moyenne ε = ${num(EPS, 2)}° (≈ 23°26′) : écart de ${num(2 * EPS, 2)}° entre les deux solstices (−${num(EPS, 2)}° à +${num(EPS, 2)}°).`,
    `Année tropique ≈ ${num(YEAR_DAYS, 4)} jours (365 j 5 h 48 min 46 s) : quatre jalons la découpent en tranches d’environ ${num(YEAR_DAYS / 4, 1)} jours.`,
    `Référence : aux équinoxes, δ = 0° et le jour dure 12 h en toute latitude (hors réfraction).`,
  ];
  if (pair) {
    items.push(
      `À ${num(pair.lat, 3)}° : ${num(values[1].jour, 1)} h en été contre ${num(values[3].jour, 1)} h en hiver, ` +
      `soit ${num(values[1].jour - values[3].jour, 1)} h d’écart ; à l’équateur (0°), cet écart serait de 0 h.`
    );
  }
  items.forEach((text, i) => {
    const item = mk('li', '', text);
    item.id = `${P}-mesure-${i}`;
    measures.appendChild(item);
  });
  section.appendChild(measures);

  /* E038-10 — commande de lecture de l'année (une seule boucle rAF). */
  const actions = mk('div', `${P}-actions`);
  const play = mk('button', `${P}-play`, playing ? 'Arrêter l’année' : 'Lancer l’année');
  play.type = 'button';
  play.id = `${P}-play`;
  play.setAttribute('aria-controls', `${P}-readout`);
  actions.appendChild(play);
  section.appendChild(actions);

  const clavier = mk('p', `${P}-line`,
    'E038-09 · Clavier : Tab atteint les quatre jalons puis le schéma ; ← → et ↑ ↓ changent de jalon, ' +
    'Début place le printemps, Fin place l’hiver. Le schéma accepte les mêmes touches.');
  clavier.id = `${P}-clavier`;
  section.appendChild(clavier);

  /* E038-10 — limite falsifiable en cinq temps. */
  const limite = mk('p', `${P}-line`,
    'E038-10 · Limite et vérification : 1) prédire qu’à l’équateur le jour reste de 12 h toute l’année ; ' +
    '2) régler la latitude du lieu sélectionné sur 0° ; 3) attendre 12,0 h aux quatre jalons ; ' +
    '4) falsifier si une différence apparaît malgré δ = 0° aux équinoxes ; ' +
    '5) débrief : ce modèle géométrique ignore la réfraction, la parallaxe et la durée inégale des saisons. ' +
    'Les dates « vers le … » ne sont pas des éphémérides : un résultat annoncé à l’heure près serait un défaut.');
  limite.id = `${P}-limite`;
  section.appendChild(limite);

  panel.appendChild(section);

  const radios = Array.from(group.querySelectorAll(`.${P}-jalon`));
  return { section, radios, readout, canvas, play, values, lat: pair ? pair.lat : null };
}

register('E038', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout || typeof ctx.css !== 'function') return;
  EL = typeof ctx.el === 'function' ? ctx.el : null;

  /* E038-01 : feuille de styles unique, isolée et idempotente. */
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute(`data-${P}`, 'on');

  /* Instantané déterministe du DOM produit par la vue. */
  const pair = readLatitude(layout);
  const place = readPlace(layout);
  const scene = buildSection(ctx, layout, pair, place);

  layout.setAttribute(`data-${P}-lat`, pair ? String(pair.lat) : 'none');
  layout.setAttribute(`data-${P}-jalons`, String(JALONS.length));
  layout.setAttribute(`data-${P}-render`, String(renders));

  scene.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;

  /* Écouteur local délégué : radiogroupe, canvas et bouton de lecture. */
  const onKey = (event) => {
    const target = event.target;
    const isRadio = target && target.classList && target.classList.contains(`${P}-jalon`);
    const isCanvas = target === scene.canvas;
    if (!isRadio && !isCanvas) return;
    let next = selected;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (selected + 1) % JALONS.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (selected - 1 + JALONS.length) % JALONS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = JALONS.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    applySelection(next, scene, false);
    (isCanvas ? scene.canvas : scene.radios[next]).focus();
  };
  scene.section.addEventListener('keydown', onKey);

  scene.radios.forEach((radio, i) => {
    radio.addEventListener('click', () => applySelection(i, scene, false));
  });

  scene.play.addEventListener('click', () => {
    if (scene.reduced()) {
      playing = false;
      scene.playing = false;
      applySelection((selected + 1) % JALONS.length, scene, false);
      scene.play.textContent = 'Lancer l’année';
      stopLoop();
      return;
    }
    playing = !playing;
    scene.playing = playing;
    scene.play.textContent = playing ? 'Arrêter l’année' : 'Lancer l’année';
    if (scene.playing) ensureLoop();
    else stopLoop();
  });

  latest = {
    canvas: scene.canvas,
    radios: scene.radios,
    readout: scene.readout,
    play: scene.play,
    values: scene.values,
    lat: scene.lat,
    reduced: scene.reduced,
    playing,
    last: null,
    elapsed: selected * STEP_MS,
  };
  install();
  applySelection(selected, latest, true);
  installObserver();
  if (latest.playing && !latest.reduced() && visible) ensureLoop();
});
