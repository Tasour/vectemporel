import { register } from './registry.js';

/*
 * Lentille E049 — zoom et dézoom (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E049-01 … E049-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E049', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e049`.
 * Tous les identifiants DOM sont préfixés `geography-e049-`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué). Tout le contenu est du texte DOM
 * lisible sans script ; le canvas ne détient aucune information exclusive.
 *
 * Les grandeurs (résolution au sol, dénominateur d'échelle, nombre de tuiles)
 * sont recalculées depuis le schéma Web Mercator à tuiles de 256 px, et
 * confrontées à des références explicites (circonférence équatoriale, 96 DPI,
 * division par deux à chaque niveau). La latitude est lue dans .geo-coords
 * quand la vue l'affiche ; sinon un latitude de référence est annoncée.
 */

const CSS_ID = 'geography-e049';
const SECTION_ID = 'geography-e049-section';
const RAD = Math.PI / 180;
const R_EQUATEUR = 6378137;                       // rayon équatorial WGS84, mètres
const CIRCONFERENCE = 2 * Math.PI * R_EQUATEUR;   // ≈ 40 075 016,686 m
const TUILE_PX = 256;                              // tuile cartographique standard
const DPI = 96;                                    // densité de référence, points/pouce
const POUCE_M = 0.0254;                            // pouce en mètres
const LAT_REFERENCE = 48.8566;                     // Paris, latitude de repli
const MAX_ZOOM = 5;                                // niveaux 0 … 5
const PAS_ANIM = 620;                              // ms par palier de l'animation
const NARROW = '\u202f';                           // espace insécable fine
const MINUS = '\u2212';                            // signe moins typographique

/* Six niveaux de zoom. `detail` décrit la généralisation attendue : plus on
   dézoome, plus on retire de détail (généralisation cartographique). */
const NIVEAUX = [
  { z: 0, titre: 'Monde entier', detail: 'continents et océans seulement' },
  { z: 1, titre: 'Hémisphères', detail: 'grands pays, masses continentales' },
  { z: 2, titre: 'Continents', detail: 'pays, capitales, mers' },
  { z: 3, titre: 'Régions', detail: 'grandes villes, axes principaux' },
  { z: 4, titre: 'Pays', detail: 'villes secondaires, routes nationales' },
  { z: 5, titre: 'Agglomération', detail: 'rues, quartiers, bâtiments' },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let selected = 2;        // niveau de zoom sélectionné dans le radiogroupe
let zoomContinu = 2;     // valeur du curseur continu
let playing = false;
let graticule = false;   // bascule indépendante (aria-pressed)
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

/* Lecture de la latitude réellement affichée dans .geo-coords (3 décimales). */
function readCoords(layout) {
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

/* E049-02 — résolution au sol (mètres par pixel) du schéma à tuiles :
   r(z, φ) = 2πR · cos φ / (256 · 2^z). */
function resolution(z, lat) {
  return (CIRCONFERENCE * Math.cos(lat * RAD)) / (TUILE_PX * Math.pow(2, z));
}

/* E049-03 — dénominateur d'échelle à 96 DPI : échelle = r · DPI / 0,0254. */
function echelle(z, lat) {
  return (resolution(z, lat) * DPI) / POUCE_M;
}

/* E049-04 — nombre de tuiles d'une pyramide au niveau z : 4^z. */
function tuiles(z) {
  return Math.pow(4, z);
}

/* Formatage d'un dénominateur d'échelle entier arrondi, en notations courtes. */
function formatEchelle(value) {
  if (!finite(value)) return '—';
  return `1 : ${num(Math.round(value), 0)}`;
}

/* Feuille de styles E049 : cadrée par [data-geography-e049="on"] posé sur
   .geo-layout. Aucune règle ne déborde, aucune information n'est portée par
   la seule couleur, cibles tactiles ≥ 44 px, focus visible. */
const RULES = `
.geo-layout[data-geography-e049="on"] .geography-e049-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-e049="on"] .geography-e049-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e049="on"] .geography-e049-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e049="on"] .geography-e049-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e049="on"] .geography-e049-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-e049="on"] .geography-e049-value { color: var(--ink); }
.geo-layout[data-geography-e049="on"] .geography-e049-liste { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-e049="on"] .geography-e049-liste li { margin: 0 0 4px; }
.geo-layout[data-geography-e049="on"] .geography-e049-group {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0;
}
.geo-layout[data-geography-e049="on"] .geography-e049-niveau {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-e049="on"] .geography-e049-niveau:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-e049="on"] .geography-e049-niveau[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-e049="on"] .geography-e049-niveau:focus-visible,
.geo-layout[data-geography-e049="on"] .geography-e049-canvas:focus-visible,
.geo-layout[data-geography-e049="on"] .geography-e049-curseur:focus-visible,
.geo-layout[data-geography-e049="on"] .geography-e049-bascule:focus-visible,
.geo-layout[data-geography-e049="on"] .geography-e049-play:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-e049="on"] .geography-e049-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e049="on"] .geography-e049-curseur-ligne {
  display: flex; align-items: center; gap: 8px; margin: 8px 0; flex-wrap: wrap;
}
.geo-layout[data-geography-e049="on"] .geography-e049-curseur {
  flex: 1 1 160px; min-height: 36px; accent-color: var(--gold-bright);
}
.geo-layout[data-geography-e049="on"] .geography-e049-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-e049="on"] .geography-e049-canvas {
  display: block; width: 100%; max-width: 240px; height: auto; aspect-ratio: 3 / 2;
  margin: 0 auto; touch-action: manipulation; cursor: default;
  border: 1px solid var(--line); border-radius: 6px;
}
.geo-layout[data-geography-e049="on"] .geography-e049-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-e049="on"] .geography-e049-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-e049="on"] .geography-e049-bascule,
.geo-layout[data-geography-e049="on"] .geography-e049-play {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-e049="on"] .geography-e049-bascule[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-e049="on"] .geography-e049-bascule:hover,
.geo-layout[data-geography-e049="on"] .geography-e049-play:hover { border-color: var(--gold); }
@media (max-width: 620px) {
  .geo-layout[data-geography-e049="on"] .geography-e049-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-e049="on"] .geography-e049-group { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .geo-layout[data-geography-e049="on"] .geography-e049-canvas { max-width: 220px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e049="on"] .geography-e049-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E049-06 — dessin déterministe du laboratoire. Un seul canvas, DPR plafonné
   à 2, couleurs lues dans les variables de thème avec repli. Une grille
   concentrique matérialise le « zoom » : multiplier l'échelle agrandit les
   mailles et en fait sortir certaines du cadre. Le dessin est une redondance
   visuelle : les nombres sont déjà en texte. */
function drawMap(canvas, zoom, withGraticule) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const painter = canvas.getContext('2d');
  if (!painter) return;
  const width = Math.max(160, Math.min(240, canvas.clientWidth || 240));
  const height = Math.round(width * 0.66);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(width * dpr);
  const pxH = Math.round(height * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, width, height);

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

  const cx = width / 2;
  const cy = height / 2;
  const facteur = Math.pow(2, zoom - selected); // grossissement relatif au niveau choisi
  const maille = 14 * facteur;

  /* Fond : « territoire » schématique. */
  painter.fillStyle = 'rgba(255,255,255,.03)';
  painter.fillRect(0, 0, width, height);

  /* Grille / canevas : tracée seulement quand la bascule est active ; son
     état est toujours annoncé en texte par le bouton aria-pressed. */
  if (withGraticule && maille > 2 && maille < width * 3) {
    painter.strokeStyle = muted;
    painter.globalAlpha = 0.35;
    painter.lineWidth = 1;
    painter.beginPath();
    for (let x = cx % maille; x <= width; x += maille) {
      painter.moveTo(x, 0);
      painter.lineTo(x, height);
    }
    for (let y = cy % maille; y <= height; y += maille) {
      painter.moveTo(0, y);
      painter.lineTo(width, y);
    }
    painter.stroke();
    painter.globalAlpha = 1;
  }

  /* Îlots de « détail » : plus le zoom est faible, plus ils sont rares. */
  const lots = [
    [-0.5, -0.3], [0.4, -0.35], [0.15, 0.2], [-0.35, 0.4], [0.55, 0.45], [-0.6, 0.1],
  ];
  const visibles = Math.max(1, Math.min(lots.length, Math.round(1 + zoom)));
  painter.fillStyle = gold;
  lots.slice(0, visibles).forEach(([dx, dy]) => {
    const x = cx + dx * width * Math.min(1, facteur);
    const y = cy + dy * height * Math.min(1, facteur);
    painter.beginPath();
    painter.arc(x, y, 3, 0, Math.PI * 2);
    painter.fill();
  });

  /* Cadre central : la « fenêtre » de la carte, fixe quel que soit le zoom. */
  painter.strokeStyle = bright;
  painter.lineWidth = 1.6;
  painter.strokeRect(cx - width * 0.18, cy - height * 0.24, width * 0.36, height * 0.48);

  /* Échelle graphique : double trait dont la légende est donnée en texte. */
  const barX = 10;
  const barY = height - 12;
  painter.strokeStyle = ink;
  painter.lineWidth = 2;
  painter.beginPath();
  painter.moveTo(barX, barY);
  painter.lineTo(barX + 40, barY);
  painter.moveTo(barX, barY - 4);
  painter.lineTo(barX, barY + 4);
  painter.moveTo(barX + 40, barY - 4);
  painter.lineTo(barX + 40, barY + 4);
  painter.stroke();

  /* Repère de zoom en toutes lettres, jamais porté par la seule couleur. */
  painter.fillStyle = bright;
  painter.font = `${Math.max(9, Math.round(width * 0.045))}px sans-serif`;
  painter.fillText(`z = ${num(zoom, 1)}`, barX + 50, barY + 3);
}

/* E049-10 — une seule frame, court-circuitée quand l'onglet est masqué. */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.canvas || !scene.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return; // pause hors écran

  if (scene.playing && !scene.reduced()) {
    if (scene.last === null) scene.last = timestamp;
    scene.elapsed += timestamp - scene.last;
    scene.last = timestamp;
    const step = Math.floor(scene.elapsed / PAS_ANIM);
    /* Balayage aller-retour entre z = 0 et z = MAX_ZOOM. */
    const span = MAX_ZOOM * 2;
    const phase = step % span;
    const next = phase <= MAX_ZOOM ? phase : span - phase;
    zoomContinu = next;
    if (scene.curseur) scene.curseur.value = String(next);
    updateLive(scene, true);
    drawMap(scene.canvas, zoomContinu, scene.graticule());
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      if (scene.play) scene.play.textContent = 'Lancer le zoom animé';
    }
  }
  if (scene.playing && !scene.reduced()) ensureLoop();
}

function ensureLoop() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { loop(0); return; }
  frame = requestAnimationFrame(loop);
}

/* Met à jour la région live et le dessin après une action. */
function updateLive(scene, fromAnimation) {
  if (!scene) return;
  const lat = scene.lat;
  const r = resolution(zoomContinu, lat);
  const e = echelle(zoomContinu, lat);
  const t = tuiles(Math.round(zoomContinu));
  if (scene.readout) {
    scene.readout.textContent =
      `Zoom z = ${num(zoomContinu, 1)} · résolution au sol ${num(r, 2)} m/pixel ` +
      `· échelle ${formatEchelle(e)} · ${num(t, 0)} tuile(s) pour la pyramide au niveau ${num(Math.round(zoomContinu), 0)}.`;
  }
  if (!fromAnimation && scene.readout) {
    scene.readout.setAttribute('data-geography-e049-announce', String(zoomContinu));
  }
  if (scene.canvas) drawMap(scene.canvas, zoomContinu, scene.graticule());
}

/* Sélection d'un niveau dans le radiogroupe : textes, aria-checked, focus, annonce. */
function applyNiveau(index, scene, fromAnimation) {
  const sceneRef = scene || latest;
  if (!sceneRef) return;
  selected = Math.max(0, Math.min(NIVEAUX.length - 1, index));
  zoomContinu = selected;
  const niveau = NIVEAUX[selected];

  sceneRef.radios.forEach((radio, i) => {
    const on = i === selected;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });
  if (sceneRef.curseur) sceneRef.curseur.value = String(selected);
  if (sceneRef.detailNode) sceneRef.detailNode.textContent = `${niveau.titre} — détail visible : ${niveau.detail}.`;

  updateLive(sceneRef, fromAnimation);
}

/* E049-10 — installation unique et silencieuse des écouteurs globaux. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureLoop();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') query.addEventListener('change', ensureLoop);
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

function line(ctx, parent, index, label, text, valueId) {
  const paragraph = ctx.el('p', 'geography-e049-line');
  paragraph.id = `geography-e049-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(ctx.el('strong', '', `E049-${String(index).padStart(2, '0')} · ${label}. `));
  const value = ctx.el('span', 'geography-e049-value', text);
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
  const section = ctx.el('section', 'geography-e049-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Zoom et dézoom : échelle, résolution et détail');
  section.setAttribute('data-sim', 'zoom-dezoom');

  section.appendChild(ctx.el('h2', '', 'Zoom et dézoom — grossir la carte, pas le monde'));

  /* E049-01 — paragraphe introductif indexable. */
  const intro = ctx.el('p', 'geography-e049-line');
  intro.id = 'geography-e049-intro';
  intro.appendChild(ctx.el('strong', '', 'E049-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'Zoomer, ce n’est pas agrandir le territoire : c’est changer l’échelle de sa représentation. ' +
    'Un zoom avant montre moins de surface avec plus de détail ; un dézoom montre plus de surface ' +
    'avec moins de détail. Chaque niveau double ou divise par deux la résolution au sol.'
  ));
  section.appendChild(intro);

  /* E049-02 — latitude de référence et résolution au sol. */
  const lat = pair ? pair.lat : LAT_REFERENCE;
  const latText = pair
    ? `Latitude lue dans la carte${place ? ` (${place})` : ''} : ${num(pair.lat, 3)}° ; longitude ${num(pair.lon, 3)}°.`
    : `Aucune coordonnée affichée pour ce lieu : les calculs utilisent la latitude de référence de Paris, ${num(LAT_REFERENCE, 4)}° (annoncée, non déduite de la carte).`;
  line(ctx, section, 2, 'Latitude de référence', latText);

  /* E049-02 — formule de résolution, recalculée. */
  const resText =
    `À cette latitude, r(z) = 2πR · cos φ / (256 · 2^z), avec R = ${num(R_EQUATEUR, 0)} m. ` +
    `Au niveau z = 0 : r ≈ ${num(resolution(0, lat), 2)} m/pixel ; à z = 5 : ` +
    `r ≈ ${num(resolution(5, lat), 2)} m/pixel, soit ${num(Math.pow(2, 5), 0)} fois plus fin.`;
  line(ctx, section, 2, 'Résolution au sol', resText, 'geography-e049-res');

  /* E049-03 — dénominateur d'échelle, recalculé et comparé à une référence. */
  const scaleText =
    `Échelle à 96 DPI : E = r · 96 / 0,0254. À l’équateur et z = 0, ` +
    `r ≈ ${num(resolution(0, 0), 2)} m/pixel, soit ${formatEchelle(echelle(0, 0))} (référence nominale). ` +
    `Ici à z = 2 : ${formatEchelle(echelle(2, lat))}.`;
  line(ctx, section, 3, 'Dénominateur d’échelle', scaleText);

  /* E049-04 — généralisation : table des niveaux, texte indexable. */
  const genIntro = ctx.el('p', 'geography-e049-line');
  genIntro.id = 'geography-e049-gen-intro';
  genIntro.appendChild(ctx.el('strong', '', 'E049-04 · Généralisation. '));
  genIntro.appendChild(document.createTextNode(
    'Dézoomer oblige à retirer des détails pour garder une carte lisible : ' +
    'les routes et les bâtiments disparaissent avant les continents.'
  ));
  section.appendChild(genIntro);

  const levels = ctx.el('ul', 'geography-e049-liste');
  levels.id = 'geography-e049-niveaux-texte';
  NIVEAUX.forEach((niveau) => {
    const item = ctx.el('li', '',
      `z = ${niveau.z} — ${niveau.titre} : ${niveau.detail} ; ${num(tuiles(niveau.z), 0)} tuile(s), ` +
      `≈ ${num(resolution(niveau.z, lat), 2)} m/pixel à cette latitude.`);
    item.id = `geography-e049-niveau-texte-${niveau.z}`;
    levels.appendChild(item);
  });
  section.appendChild(levels);

  /* E049-05 — radiogroupe des six niveaux (choix unique : pas d'aria-pressed). */
  const group = ctx.el('div', 'geography-e049-group');
  group.id = 'geography-e049-group';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir un niveau de zoom');
  NIVEAUX.forEach((niveau, i) => {
    const radio = ctx.el('button', 'geography-e049-niveau', `z ${niveau.z} — ${niveau.titre}`);
    radio.type = 'button';
    radio.id = `geography-e049-radio-${niveau.z}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === selected ? 'true' : 'false');
    radio.tabIndex = i === selected ? 0 : -1;
    group.appendChild(radio);
  });
  section.appendChild(group);

  const detail = ctx.el('p', 'geography-e049-line', '');
  detail.id = 'geography-e049-detail';
  section.appendChild(detail);

  /* E049-05 — curseur de zoom continu, avec libellé associé. */
  const ligne = ctx.el('div', 'geography-e049-curseur-ligne');
  ligne.id = 'geography-e049-curseur-ligne';
  const label = ctx.el('label', '', 'Zoom continu z :');
  label.id = 'geography-e049-curseur-label';
  label.htmlFor = 'geography-e049-curseur';
  const curseur = document.createElement('input');
  curseur.type = 'range';
  curseur.min = '0';
  curseur.max = String(MAX_ZOOM);
  curseur.step = '1';
  curseur.value = String(selected);
  curseur.id = 'geography-e049-curseur';
  curseur.className = 'geography-e049-curseur';
  curseur.setAttribute('aria-label', 'Niveau de zoom continu, de 0 à ' + MAX_ZOOM);
  ligne.append(label, curseur);
  section.appendChild(ligne);

  /* E049-07 — région live unique. */
  const readout = ctx.el('p', 'geography-e049-readout', '');
  readout.id = 'geography-e049-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E049-06 — laboratoire canvas, redondant avec le texte. */
  const figure = ctx.el('figure', 'geography-e049-figure');
  figure.id = 'geography-e049-figure';
  const canvas = ctx.el('canvas', 'geography-e049-canvas');
  canvas.id = 'geography-e049-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Schéma de zoom : une fenêtre centrale fixe, des îlots de détail qui apparaissent ' +
    'au zoom avant et une grille dont les mailles grandissent. Flèches pour zoomer, ' +
    'Début pour le niveau 0, Fin pour le niveau ' + MAX_ZOOM + '.');
  canvas.setAttribute('aria-describedby', 'geography-e049-clavier');
  const caption = ctx.el('figcaption', 'geography-e049-caption',
    'Schéma non à l’échelle : la fenêtre reste fixe, les mailles et les îlots changent ; les nombres sont donnés en texte.');
  caption.id = 'geography-e049-caption';
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E049-08 — repères chiffrés, dont une comparaison à une référence. */
  const mesures = ctx.el('ul', 'geography-e049-liste');
  mesures.id = 'geography-e049-mesures';
  const items = [
    `Circonférence équatoriale 2πR ≈ ${num(CIRCONFERENCE, 0)} m ; tuile de ${TUILE_PX} px : à l’équateur et z = 0, r ≈ ${num(resolution(0, 0), 2)} m/pixel.`,
    `Référence : chaque niveau +1 divise r par 2 et double le dénominateur d’échelle ; chaque niveau multiplie le nombre de tuiles par 4 (4^z).`,
    `Référence : ${formatEchelle(echelle(0, 0))} à l’équateur z = 0, contre ${formatEchelle(echelle(5, 0))} à z = 5, soit un facteur ${num(Math.pow(2, 5), 0)}.`,
    `192 DPI (écran haute densité) donnerait une échelle ${num(192 / DPI, 1)} fois plus grande qu’à 96 DPI à résolution égale : la référence de densité change tout.`,
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e049-mesure-${i}`;
    mesures.appendChild(item);
  });
  section.appendChild(mesures);

  /* E049-08 — bascule indépendante (aria-pressed légitime) du canevas. */
  const actions = ctx.el('div', 'geography-e049-actions');
  actions.id = 'geography-e049-actions';
  const bascule = ctx.el('button', 'geography-e049-bascule', 'Afficher la grille : non');
  bascule.type = 'button';
  bascule.id = 'geography-e049-bascule';
  bascule.setAttribute('aria-pressed', 'false');
  bascule.setAttribute('aria-controls', 'geography-e049-canvas');
  const play = ctx.el('button', 'geography-e049-play', playing ? 'Arrêter le zoom animé' : 'Lancer le zoom animé');
  play.type = 'button';
  play.id = 'geography-e049-play';
  play.setAttribute('aria-controls', 'geography-e049-readout');
  actions.append(bascule, play);
  section.appendChild(actions);

  /* E049-09 — équivalent clavier du schéma et du curseur. */
  const clavier = ctx.el('p', 'geography-e049-line',
    'E049-09 · Clavier : Tab atteint les six niveaux, le curseur, la grille, l’animation puis le schéma. ' +
    '← → augmente ou réduit le zoom d’un niveau, Début place z = 0, Fin place z = ' + MAX_ZOOM + '. ' +
    'Le schéma accepte les mêmes touches.');
  clavier.id = 'geography-e049-clavier';
  section.appendChild(clavier);

  /* E049-10 — limite falsifiable en cinq temps. */
  const limite = ctx.el('p', 'geography-e049-line',
    'E049-10 · Limite et vérification : 1) prédire que passer de z à z+1 divise la résolution au sol par 2 ' +
    'et multiplie le nombre de tuiles par 4 ; 2) régler le curseur sur z = 2 puis z = 3 ; ' +
    '3) attendre r(z3) = r(z2)/2 et 4^3 / 4^2 = 4 ; 4) falsifier si le rapport n’est pas 2 (et 4 pour les tuiles), ' +
    'l’hypothèse est réfutée ; 5) débrief : ce modèle Web Mercator à tuiles de 256 px et 96 DPI est une référence ' +
    'nominale — une vraie carte peut changer de projection, de densité d’écran ou de taille de tuile, et le dézoom ' +
    'implique aussi une généralisation que la simple division par deux ne décrit pas.');
  limite.id = 'geography-e049-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  const radios = Array.from(group.querySelectorAll('.geography-e049-niveau'));
  return {
    section, radios, readout, canvas, curseur, bascule, play, detailNode: detail,
    lat: lat,
    reduced: typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false,
    graticule: () => graticule,
    playing,
    last: null,
    elapsed: 0,
  };
}

register('E049', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e049', 'on');

  /* Instantané déterministe du DOM produit par la vue. */
  const pair = readCoords(layout);
  const place = readPlace(layout);
  const scene = buildSection(ctx, layout, pair, place);

  layout.setAttribute('data-geography-e049-lat', pair ? String(pair.lat) : 'reference');
  layout.setAttribute('data-geography-e049-niveaux', String(NIVEAUX.length));
  layout.setAttribute('data-geography-e049-render', String(renders));

  /* Écouteur local délégué : radiogroupe, curseur, bascule, lecture et schéma. */
  const onKey = (event) => {
    const target = event.target;
    const isRadio = target && target.classList && target.classList.contains('geography-e049-niveau');
    const isCanvas = target === scene.canvas;
    if (!isRadio && !isCanvas) return;
    let next = selected;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(MAX_ZOOM, selected + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, selected - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = MAX_ZOOM;
    else return;
    event.preventDefault();
    event.stopPropagation();
    applyNiveau(next, scene, false);
    (isCanvas ? scene.canvas : scene.radios[next]).focus();
  };
  scene.section.addEventListener('keydown', onKey);

  scene.radios.forEach((radio, i) => {
    radio.addEventListener('click', () => applyNiveau(i, scene, false));
  });

  scene.curseur.addEventListener('input', () => {
    zoomContinu = Math.max(0, Math.min(MAX_ZOOM, Number(scene.curseur.value) || 0));
    updateLive(scene, false);
  });

  scene.bascule.addEventListener('click', () => {
    graticule = !graticule;
    scene.bascule.setAttribute('aria-pressed', graticule ? 'true' : 'false');
    scene.bascule.textContent = `Afficher la grille : ${graticule ? 'oui' : 'non'}`;
    updateLive(scene, false);
  });

  scene.play.addEventListener('click', () => {
    if (scene.reduced()) {
      scene.playing = false;
      playing = false;
      applyNiveau((selected + 1) % NIVEAUX.length, scene, false);
      scene.play.textContent = 'Lancer le zoom animé';
      return;
    }
    scene.playing = !scene.playing;
    playing = scene.playing;
    scene.play.textContent = scene.playing ? 'Arrêter le zoom animé' : 'Lancer le zoom animé';
    if (scene.playing) {
      scene.last = null;
      scene.elapsed = zoomContinu * PAS_ANIM;
      ensureLoop();
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });

  latest = scene;
  install();
  applyNiveau(selected, latest, true);
  ensureLoop();
});
