import { register } from './registry.js';

/*
 * Lentille E067 — vue GEOGRAPHIE.
 * Thème : couleurs sémantiques (signification, non portées par la seule couleur).
 *
 * Les dix chantiers E067-01 … E067-10 sont réellement implémentés dans CE seul
 * module : aucun stub, aucun fichier partagé modifié. Tout le savoir est du
 * texte DOM sémantique lisible sans interaction ; le canvas n'est qu'un
 * laboratoire redondant, jamais la source exclusive d'une information.
 *
 * Contrat : register('E067', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille unique injectée sous l'identifiant `geography-e067`, tous les ids
 * préfixés `geography-e067-*`. Zéro journalisation, zéro réseau, zéro aléa,
 * au plus une requête d'animation en vol (suspendue sur document.hidden).
 *
 * Les grandeurs (luminance WCAG, ratio de contraste, prévalence) sont
 * recalculées depuis leur formule et confrontées à des références explicites
 * (seuils AA 4,5:1 et 3:1 ; 8 % / 0,5 % de déficience des cônes).
 */

const CSS_ID = 'geography-e067';
const SECTION_ID = 'geography-e067-section';
const PAS_BALAYAGE = 700; // ms par catégorie dans le balayage animé
const NARROW = '\u202f';
const MINUS = '\u2212';

/* Cinq catégories sémantiques. Chacune porte un sens ET un codage redondant
   (forme, motif, étiquette) : la couleur n'est jamais le seul canal. */
const CATEGORIES = [
  {
    cle: 'eau',
    label: 'Eau / océan',
    sens: 'Milieu aquatique, eau douce ou salée',
    couleur: '#2e6fb7',
    forme: 'cercle',
    motif: 'points',
    convention: 'Le bleu signifie l’eau sur les cartes météo et topographiques : convention apprise, pas propriété de l’eau.',
  },
  {
    cle: 'vegetation',
    label: 'Végétation / forêt',
    sens: 'Couvert végétal, forêt, prairie',
    couleur: '#2f8f4e',
    forme: 'triangle',
    motif: 'hachures',
    convention: 'Le vert évoque la végétation et l’état « sain » dans de nombreuses légendes occidentales.',
  },
  {
    cle: 'relief',
    label: 'Relief / sol',
    sens: 'Montagne, altitude, sols et roches',
    couleur: '#9a5b2f',
    forme: 'carré',
    motif: 'croix',
    convention: 'Le brun et l’ocre désignent le relief et les sols sur les cartes physiques.',
  },
  {
    cle: 'chaleur',
    label: 'Chaleur / alerte',
    sens: 'Température élevée, danger, seuil dépassé',
    couleur: '#b5342a',
    forme: 'losange',
    motif: 'rayures',
    convention: 'Le rouge marque la chaleur, l’alerte ou le danger : à lire avec son étiquette, car le sens varie selon le contexte.',
  },
  {
    cle: 'neutre',
    label: 'Neutre / non documenté',
    sens: 'Absence de donnée, catégorie neutre',
    couleur: '#7a7f86',
    forme: 'anneau',
    motif: 'vide',
    convention: 'Le gris marque l’absence de donnée : sa signification doit être écrite, sinon il passe pour une donnée.',
  },
];

/* Approximation schématique (illustrative) d'une vision deutéranope : on
   réduit l'apport du canal vert. Ce n'est pas une simulation colorimétrique
   certifiée ; elle sert uniquement à montrer que le sens survit quand les
   teintes se rapprochent. */
const MATRICE_DEUTAN = [
  [0.625, 0.375, 0.000],
  [0.700, 0.300, 0.000],
  [0.000, 0.300, 0.700],
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let selected = 0;
let simuler = false;  // bascule indépendante (aria-pressed légitime)
let playing = false;
let renders = 0;

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

function hex2rgb(hex) {
  const clean = String(hex).replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [0, 0, 0];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgb2hex(r, g, b) {
  const part = (v) => clampByte(v).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function simulate(hex) {
  const [r, g, b] = hex2rgb(hex);
  const out = MATRICE_DEUTAN.map((row) => row[0] * r + row[1] * g + row[2] * b);
  return rgb2hex(out[0], out[1], out[2]);
}

/* E067-08 — luminance relative WCAG, avec linéarisation sRGB. */
function luminance(hex) {
  const channels = hex2rgb(hex).map((byte) => {
    const c = byte / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/* E067-08 — ratio de contraste WCAG : (L clair + 0,05) / (L sombre + 0,05). */
function contraste(hexA, hexB) {
  const la = luminance(hexA);
  const lb = luminance(hexB);
  const clair = Math.max(la, lb);
  const sombre = Math.min(la, lb);
  return (clair + 0.05) / (sombre + 0.05);
}

/* Encre de motif adaptée à la clarté de la teinte. */
function encreMotif(hex) {
  return luminance(hex) < 0.35 ? '#ffffff' : '#141414';
}

/* Feuille de styles E067 : cadrée par [data-geography-e067="on"] posé sur
   .geo-layout. Aucune règle ne déborde ; cibles ≥ 44 px, focus visible, et
   aucune information portée par la seule couleur (bordures, formes, textes). */
const RULES = `
.geo-layout[data-geography-e067="on"] .geography-e067-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-e067="on"] .geography-e067-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e067="on"] .geography-e067-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e067="on"] .geography-e067-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e067="on"] .geography-e067-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-e067="on"] .geography-e067-value { color: var(--ink); }
.geo-layout[data-geography-e067="on"] .geography-e067-liste { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-e067="on"] .geography-e067-liste li { margin: 0 0 4px; }
.geo-layout[data-geography-e067="on"] .geography-e067-group {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 8px 0;
}
.geo-layout[data-geography-e067="on"] .geography-e067-choice {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-e067="on"] .geography-e067-choice:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-e067="on"] .geography-e067-choice[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-e067="on"] .geography-e067-choice:focus-visible,
.geo-layout[data-geography-e067="on"] .geography-e067-canvas:focus-visible,
.geo-layout[data-geography-e067="on"] .geography-e067-bascule:focus-visible,
.geo-layout[data-geography-e067="on"] .geography-e067-play:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-e067="on"] .geography-e067-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e067="on"] .geography-e067-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-e067="on"] .geography-e067-canvas {
  display: block; width: 100%; max-width: 280px; height: auto; aspect-ratio: 14 / 10;
  margin: 0 auto; touch-action: manipulation; cursor: default;
  border: 1px solid var(--line); border-radius: 6px;
}
.geo-layout[data-geography-e067="on"] .geography-e067-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-e067="on"] .geography-e067-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-e067="on"] .geography-e067-bascule,
.geo-layout[data-geography-e067="on"] .geography-e067-play {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-e067="on"] .geography-e067-bascule[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-e067="on"] .geography-e067-bascule:hover,
.geo-layout[data-geography-e067="on"] .geography-e067-play:hover { border-color: var(--gold); }
@media (max-width: 620px) {
  .geo-layout[data-geography-e067="on"] .geography-e067-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-e067="on"] .geography-e067-group { grid-template-columns: minmax(0, 1fr); }
  .geo-layout[data-geography-e067="on"] .geography-e067-canvas { max-width: 240px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e067="on"] .geography-e067-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E067-02 / E067-06 — tracé d'une forme redondante. */
function traceForme(painter, forme, x, y, rayon) {
  painter.beginPath();
  if (forme === 'cercle') {
    painter.arc(x, y, rayon, 0, Math.PI * 2);
  } else if (forme === 'triangle') {
    painter.moveTo(x, y - rayon);
    painter.lineTo(x + rayon, y + rayon * 0.8);
    painter.lineTo(x - rayon, y + rayon * 0.8);
    painter.closePath();
  } else if (forme === 'carré') {
    painter.rect(x - rayon, y - rayon, rayon * 2, rayon * 2);
  } else if (forme === 'losange') {
    painter.moveTo(x, y - rayon * 1.15);
    painter.lineTo(x + rayon, y);
    painter.lineTo(x, y + rayon * 1.15);
    painter.lineTo(x - rayon, y);
    painter.closePath();
  } else { /* anneau */
    painter.arc(x, y, rayon, 0, Math.PI * 2);
  }
  if (forme === 'anneau') {
    painter.lineWidth = 3;
    painter.stroke();
  } else {
    painter.fill();
  }
}

/* E067-02 — motif redondant, surimposé à la forme. */
function traceMotif(painter, motif, x, y, rayon, couleur) {
  if (motif === 'vide') return;
  painter.save();
  painter.strokeStyle = couleur;
  painter.fillStyle = couleur;
  painter.lineWidth = 1.2;
  if (motif === 'points') {
    [[-3, -3], [3, -3], [0, 3]].forEach(([dx, dy]) => {
      painter.beginPath();
      painter.arc(x + dx, y + dy, 1.2, 0, Math.PI * 2);
      painter.fill();
    });
  } else if (motif === 'hachures') {
    for (let k = -1; k <= 1; k += 1) {
      painter.beginPath();
      painter.moveTo(x - 4 + k * 3, y + 4);
      painter.lineTo(x + k * 3, y - 4);
      painter.stroke();
    }
  } else if (motif === 'croix') {
    painter.beginPath();
    painter.moveTo(x - 4, y); painter.lineTo(x + 4, y);
    painter.moveTo(x, y - 4); painter.lineTo(x, y + 4);
    painter.stroke();
  } else if (motif === 'rayures') {
    for (let k = -1; k <= 1; k += 1) {
      painter.beginPath();
      painter.moveTo(x + k * 3, y - 4);
      painter.lineTo(x + k * 3, y + 4);
      painter.stroke();
    }
  }
  painter.restore();
}

/* E067-06 — laboratoire déterministe : deux bandes. La première montre des
   pastilles de couleur seule (sens ambigu) ; la seconde ajoute forme, motif
   et numéro d'étiquette (sens conservé même si la couleur change). */
function draw(canvas, scene) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const painter = canvas.getContext('2d');
  if (!painter) return;
  const width = Math.max(180, Math.min(280, canvas.clientWidth || 280));
  const height = Math.round(width * 0.72);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(width * dpr);
  const pxH = Math.round(height * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, width, height);

  painter.fillStyle = '#f4f1ea';
  painter.fillRect(0, 0, width, height);
  const ink = '#1a1a1a';
  painter.fillStyle = ink;
  painter.textAlign = 'left';
  painter.font = `${Math.max(8, Math.round(width * 0.036))}px sans-serif`;
  painter.fillText('Couleur seule — quel sens ?', 6, 14);

  const slots = CATEGORIES.length;
  const slot = width / slots;
  CATEGORIES.forEach((cat, i) => {
    const x = slot * i + slot / 2;
    const teinte = scene.simuler() ? simulate(cat.couleur) : cat.couleur;
    painter.fillStyle = teinte;
    painter.beginPath();
    painter.arc(x, 32, 10, 0, Math.PI * 2);
    painter.fill();
  });

  painter.strokeStyle = '#c9c2b4';
  painter.lineWidth = 1;
  painter.beginPath();
  painter.moveTo(6, 52);
  painter.lineTo(width - 6, 52);
  painter.stroke();

  painter.fillStyle = ink;
  painter.fillText('+ forme, motif, étiquette — sens certain', 6, 66);

  CATEGORIES.forEach((cat, i) => {
    const x = slot * i + slot / 2;
    const y = 92;
    const teinte = scene.simuler() ? simulate(cat.couleur) : cat.couleur;
    painter.fillStyle = teinte;
    painter.strokeStyle = teinte;
    traceForme(painter, cat.forme, x, y, 9);
    traceMotif(painter, cat.motif, x, y, 9, encreMotif(teinte));
    painter.fillStyle = ink;
    painter.font = `${Math.max(9, Math.round(width * 0.042))}px sans-serif`;
    painter.textAlign = 'center';
    painter.fillText(String(i + 1), x, 120);
    if (i === scene.selected) {
      painter.strokeStyle = ink;
      painter.lineWidth = 1.6;
      painter.beginPath();
      painter.arc(x, y, 14, 0, Math.PI * 2);
      painter.stroke();
    }
  });

  painter.textAlign = 'left';
  painter.font = `${Math.max(7, Math.round(width * 0.03))}px sans-serif`;
  painter.fillStyle = ink;
  painter.fillText('1 eau · 2 végétation · 3 relief · 4 chaleur · 5 neutre', 6, height - 7);
}

/* E067-10 — une seule frame, court-circuitée quand l'onglet est masqué. */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.canvas || !scene.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return; // pause hors écran
  if (scene.playing && !scene.reduced()) {
    if (scene.last === null) scene.last = timestamp;
    scene.elapsed += timestamp - scene.last;
    scene.last = timestamp;
    const step = Math.floor(scene.elapsed / PAS_BALAYAGE);
    const index = step % CATEGORIES.length;
    if (index !== scene.selected) applyCategory(index, scene, true);
    ensureLoop();
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      scene.play.textContent = 'Lancer le balayage animé';
    }
  }
}

function ensureLoop() {
  if (typeof requestAnimationFrame !== 'function') return; // pas de boucle sans rAF
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  frame = requestAnimationFrame(loop);
}

/* E067-07 — région live unique, relatée en texte, jamais par la couleur. */
function updateLive(scene, fromAnimation) {
  if (!scene) return;
  const cat = CATEGORIES[scene.selected];
  const affiche = scene.simuler() ? simulate(cat.couleur) : cat.couleur;
  const surBlanc = contraste(cat.couleur, '#ffffff');
  const surNoir = contraste(cat.couleur, '#000000');
  if (scene.readout) {
    scene.readout.textContent =
      `Catégorie ${scene.selected + 1}/${CATEGORIES.length} : ${cat.label} — sens : ${cat.sens}. ` +
      `Canaux redondants : forme (${cat.forme}), motif (${cat.motif}), étiquette « ${cat.label} » et numéro ${scene.selected + 1}. ` +
      `Teinte ${cat.couleur}${scene.simuler() ? `, rendu deutéranope simulé ${affiche}` : ''}. ` +
      `Contraste ${num(surBlanc, 2)}:1 sur blanc et ${num(surNoir, 2)}:1 sur noir (référence AA : 4,5:1).`;
    if (!fromAnimation) scene.readout.setAttribute('data-geography-e067-announce', String(scene.selected));
  }
  if (scene.canvas) draw(scene.canvas, scene);
}

/* Sélection d'une catégorie (choix unique : radiogroupe, pas d'aria-pressed). */
function applyCategory(index, scene, fromAnimation) {
  const ref = scene || latest;
  if (!ref) return;
  selected = Math.max(0, Math.min(CATEGORIES.length - 1, index));
  ref.choices.forEach((choice, i) => {
    const on = i === selected;
    choice.setAttribute('aria-checked', on ? 'true' : 'false');
    choice.tabIndex = on ? 0 : -1;
  });
  updateLive(ref, fromAnimation);
}

/* E067-10 — installation unique et silencieuse des écouteurs globaux. */
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
  const paragraph = ctx.el('p', 'geography-e067-line');
  paragraph.id = `geography-e067-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(ctx.el('strong', '', `E067-${String(index).padStart(2, '0')} · ${label}. `));
  const value = ctx.el('span', 'geography-e067-value', text);
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
  const section = ctx.el('section', 'geography-e067-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Couleurs sémantiques : la signification ne doit pas reposer sur la seule couleur');
  section.setAttribute('data-sim', 'couleurs-semantiques');
  section.appendChild(ctx.el('h2', '', 'Couleurs sémantiques — donner un sens sans compter sur la teinte'));

  /* E067-01 — principe, énoncé en toutes lettres. */
  const intro = ctx.el('p', 'geography-e067-line');
  intro.id = 'geography-e067-intro';
  intro.appendChild(ctx.el('strong', '', 'E067-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'Une couleur sémantique porte une signification : bleu pour l’eau, vert pour la végétation, rouge pour l’alerte. ' +
    'Mais la couleur seule ne doit jamais porter l’information : on ajoute une forme, un motif, une étiquette ou une position. ' +
    'C’est le double codage : si un canal fait défaut, un autre transmet encore le sens.'
  ));
  section.appendChild(intro);

  /* E067-02 — canaux redondants, liste indexable. */
  const canauxIntro = ctx.el('p', 'geography-e067-line');
  canauxIntro.id = 'geography-e067-canaux-intro';
  canauxIntro.appendChild(ctx.el('strong', '', 'E067-02 · Canaux redondants. '));
  canauxIntro.appendChild(document.createTextNode(
    'Une même information peut être portée par plusieurs canaux visuels indépendants. ' +
    'La redondance est ce qui survit au daltonisme, à une impression en noir et blanc ou à un écran mal calibré.'
  ));
  section.appendChild(canauxIntro);
  const canaux = ctx.el('ul', 'geography-e067-liste');
  canaux.id = 'geography-e067-canaux';
  [
    'Teinte : repère rapide, mais illisible pour une vision déficiente et sans légende.',
    'Forme : cercle, triangle, carré, losange, anneau — distinguable même en niveaux de gris.',
    'Motif : points, hachures, croix, rayures, vide — lisible à l’impression.',
    'Étiquette et numéro : le canal le plus sûr, car il ne dépend d’aucune perception des couleurs.',
  ].forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e067-canal-${i}`;
    canaux.appendChild(item);
  });
  section.appendChild(canaux);

  /* E067-03 — conventions et relativité culturelle. */
  const conventions = ctx.el('ul', 'geography-e067-liste');
  conventions.id = 'geography-e067-conventions';
  CATEGORIES.forEach((cat, i) => {
    const item = ctx.el('li', '', `${cat.label} (${cat.couleur}, ${cat.forme}) : ${cat.convention}`);
    item.id = `geography-e067-convention-${i}`;
    conventions.appendChild(item);
  });
  line(ctx, section, 3, 'Conventions et relativité',
    'Rouge = chaleur ou danger, vert = végétation, bleu = eau : ces associations sont des conventions apprises, ' +
    'pas des lois de la nature. Elles varient selon les cultures — le deuil est blanc ailleurs, noir ici. ' +
    'Une légende explicite prime toujours sur la couleur supposée.', 'geography-e067-conventions-note');

  /* E067-04 — trois types d'échelles, avec des nombres réels. */
  const echelles = ctx.el('ul', 'geography-e067-liste');
  echelles.id = 'geography-e067-echelles';
  [
    `Catégorielle : ${CATEGORIES.length} teintes sans ordre entre elles (eau, végétation, relief, chaleur, neutre) ; aucune n’est « plus grande » qu’une autre.`,
    'Séquentielle : du clair au foncé pour un ordre ; 5 niveaux d’intensité répartissent 100 % de la plage en pas de 20 %.',
    'Divergente : deux pôles autour d’un neutre, par exemple −2, −1, 0, +1, +2 autour du gris (« froid » contre « chaud »).',
  ].forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e067-echelle-${i}`;
    echelles.appendChild(item);
  });
  line(ctx, section, 4, 'Choisir l’échelle',
    'Une échelle catégorielle sépare des noms, une échelle séquentielle range des quantités, ' +
    'une échelle divergente montre un écart autour d’un zéro. Utiliser la mauvaise échelle ' +
    'invente un ordre qui n’existe pas dans les données.');

  /* E067-05 — vision des couleurs, prévalence recalculée. */
  const prevalence = (1 / 0.08);
  line(ctx, section, 5, 'Vision des couleurs',
    `Environ 8 % des hommes et 0,5 % des femmes d’origine européenne ont une déficience des cônes : ` +
    `1/0,08 = ${num(prevalence, 1)}, soit environ 1 homme sur 12. ` +
    `Les formes courantes sont la protanopie (rouge), la deutéranopie (vert) et la tritanopie (bleu). ` +
    `Le rouge et le vert deviennent difficiles à distinguer : c’est précisément pour cela que le double codage est obligatoire.`,
    'geography-e067-prevalence');

  /* E067-06 — figure et canvas, redondants avec le texte. */
  const figure = ctx.el('figure', 'geography-e067-figure');
  figure.id = 'geography-e067-figure';
  const canvas = ctx.el('canvas', 'geography-e067-canvas');
  canvas.id = 'geography-e067-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de codage sémantique : la bande haute montre cinq pastilles de couleur seule, ' +
    'la bande basse ajoute à chaque catégorie une forme, un motif et un numéro de 1 à 5. ' +
    'Flèches pour changer de catégorie, Début pour la première, Fin pour la cinquième.');
  canvas.setAttribute('aria-describedby', 'geography-e067-clavier');
  const caption = ctx.el('figcaption', 'geography-e067-caption',
    'Schéma non colorimétrique : la simulation deutéranope est illustrative. Toutes les significations sont données en texte.');
  caption.id = 'geography-e067-caption';
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E067-07 — région live unique. */
  const readout = ctx.el('p', 'geography-e067-readout', '');
  readout.id = 'geography-e067-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E067-08 — repères chiffrés, dont une comparaison aux références AA. */
  const mesures = ctx.el('ul', 'geography-e067-liste');
  mesures.id = 'geography-e067-mesures';
  const items = [
    'Luminance relative WCAG : L = 0,2126 R + 0,7152 V + 0,0722 B, avec composantes sRGB linéarisées.',
    `Contraste : (L clair + 0,05)/(L sombre + 0,05). Pour « ${CATEGORIES[3].label} » (${CATEGORIES[3].couleur}) : ` +
      `${num(contraste(CATEGORIES[3].couleur, '#ffffff'), 2)}:1 sur blanc et ` +
      `${num(contraste(CATEGORIES[3].couleur, '#000000'), 2)}:1 sur noir, contre les références AA 4,5:1 (texte normal) et 3:1 (grands textes et composants).`,
    `Prévalence : 8 % des hommes et 0,5 % des femmes, soit environ 1 sur ${num(prevalence, 1)} contre une référence de 1 sur 200 chez les femmes (0,5 %).`,
    'Un canal déficient réduit l’espace utile de 3 dimensions (rouge, vert, bleu) à 2 ; les 4 canaux redondants restent, eux, intacts.',
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e067-mesure-${i}`;
    mesures.appendChild(item);
  });
  section.appendChild(mesures);

  /* E067-05 / E067-09 — radiogroupe des cinq catégories (choix unique). */
  const group = ctx.el('div', 'geography-e067-group');
  group.id = 'geography-e067-group';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir une catégorie sémantique');
  CATEGORIES.forEach((cat, i) => {
    const choice = ctx.el('button', 'geography-e067-choice', `${i + 1} · ${cat.label} (${cat.forme})`);
    choice.type = 'button';
    choice.id = `geography-e067-choice-${i}`;
    choice.setAttribute('role', 'radio');
    choice.setAttribute('aria-checked', i === selected ? 'true' : 'false');
    choice.tabIndex = i === selected ? 0 : -1;
    group.appendChild(choice);
  });
  section.appendChild(group);

  /* E067-05 — bascule indépendante de simulation (aria-pressed légitime). */
  const actions = ctx.el('div', 'geography-e067-actions');
  actions.id = 'geography-e067-actions';
  const bascule = ctx.el('button', 'geography-e067-bascule',
    simuler ? 'Simuler une vision deutéranope : oui' : 'Simuler une vision deutéranope : non');
  bascule.type = 'button';
  bascule.id = 'geography-e067-bascule';
  bascule.setAttribute('aria-pressed', simuler ? 'true' : 'false');
  bascule.setAttribute('aria-controls', 'geography-e067-canvas');
  const play = ctx.el('button', 'geography-e067-play', playing ? 'Arrêter le balayage animé' : 'Lancer le balayage animé');
  play.type = 'button';
  play.id = 'geography-e067-play';
  play.setAttribute('aria-controls', 'geography-e067-readout');
  actions.append(bascule, play);
  section.appendChild(actions);

  /* E067-09 — équivalent clavier explicite. */
  const clavier = ctx.el('p', 'geography-e067-line',
    'E067-09 · Clavier : Tab atteint les cinq catégories, la bascule, le balayage puis le schéma. ' +
    '← → (ou ↑ ↓) changent de catégorie, Début place la première, Fin la cinquième. ' +
    'Le schéma accepte les mêmes touches. La simulation est une bascule indépendante : ' +
    'son état est toujours écrit « oui / non », jamais porté par le seul pixel.');
  clavier.id = 'geography-e067-clavier';
  section.appendChild(clavier);

  /* E067-10 — limite falsifiable en cinq temps, alignée sur les angles morts. */
  const limite = ctx.el('p', 'geography-e067-line',
    'E067-10 · Limite et vérification : 1) prédire qu’en simulant une vision deutéranope, le sens des cinq catégories ' +
    'reste lisible grâce aux formes, motifs et étiquettes ; 2) activer la simulation et parcourir les catégories ; ' +
    '3) attendre que chaque lecture nomme encore la catégorie correcte ; 4) falsifier en masquant mentalement ' +
    'forme, motif et étiquette : si le sens disparaît, le double codage est incomplet et l’hypothèse est réfutée ; ' +
    '5) débrief : la matrice de simulation est schématique (pas une mesure colorimétrique), les conventions de couleur ' +
    'sont culturelles et changeantes, et les seuils AA 4,5:1 / 3:1 concernent le contraste, pas la signification.');
  limite.id = 'geography-e067-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  return {
    section, canvas, readout, bascule, play,
    choices: Array.from(group.querySelectorAll('.geography-e067-choice')),
    simuler: () => simuler,
    reduced: typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false,
    playing,
    last: null,
    elapsed: 0,
  };
}

register('E067', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e067', 'on');

  const scene = buildSection(ctx, layout);

  layout.setAttribute('data-geography-e067-render', String(renders));
  layout.setAttribute('data-geography-e067-categories', String(CATEGORIES.length));
  layout.setAttribute('data-geography-e067-simulation', simuler ? 'deutan' : 'normale');

  /* Écouteur local délégué : radiogroupe et schéma partagent les mêmes touches. */
  const onKey = (event) => {
    const target = event.target;
    const isChoice = target && target.classList && target.classList.contains('geography-e067-choice');
    const isCanvas = target === scene.canvas;
    if (!isChoice && !isCanvas) return;
    let next = selected;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(CATEGORIES.length - 1, selected + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(0, selected - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = CATEGORIES.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    applyCategory(next, scene, false);
    (isCanvas ? scene.canvas : scene.choices[next]).focus();
  };
  scene.section.addEventListener('keydown', onKey);

  scene.choices.forEach((choice, i) => {
    choice.addEventListener('click', () => applyCategory(i, scene, false));
  });

  scene.bascule.addEventListener('click', () => {
    simuler = !simuler;
    scene.bascule.setAttribute('aria-pressed', simuler ? 'true' : 'false');
    scene.bascule.textContent = `Simuler une vision deutéranope : ${simuler ? 'oui' : 'non'}`;
    layout.setAttribute('data-geography-e067-simulation', simuler ? 'deutan' : 'normale');
    updateLive(scene, false);
  });

  scene.play.addEventListener('click', () => {
    if (scene.reduced() || typeof requestAnimationFrame !== 'function') {
      playing = false;
      scene.playing = false;
      scene.play.textContent = 'Lancer le balayage animé';
      applyCategory((scene.selected + 1) % CATEGORIES.length, scene, false);
      return;
    }
    scene.playing = !scene.playing;
    playing = scene.playing;
    scene.play.textContent = scene.playing ? 'Arrêter le balayage animé' : 'Lancer le balayage animé';
    if (scene.playing) {
      scene.last = null;
      scene.elapsed = scene.selected * PAS_BALAYAGE;
      ensureLoop();
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });

  latest = scene;
  install();
  applyCategory(selected, latest, true);
});
