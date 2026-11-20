import { register } from './registry.js';

/*
 * Lentille E098 — drapeaux et symboles nationaux (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E098-01 … E098-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E098', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e098`.
 * Tous les identifiants DOM sont préfixés `geography-e098-*`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué). Tout le contenu est du texte DOM
 * lisible sans script ; le SVG ne détient aucune information exclusive.
 *
 * Thème : un drapeau est une construction géométrique — des proportions
 * (rapport largeur/hauteur), une partition (bandes, croix, diagonale, canton)
 * et une palette dont le symbolisme est une convention, jamais une loi. La
 * lentille enseigne à lire ces trois couches et à reconstruire un drapeau
 * schématique en SVG **local** (aucune image, aucune police, aucune tuile
 * distante). Le namespace XML « http://www.w3.org/2000/svg » est un identifiant
 * normalisé : il n'est jamais téléchargé. Les drapeaux présentés sont des
 * exemples pédagogiques schématiques, non des reproductions officielles.
 */

const CSS_ID = 'geography-e098';
const SECTION_ID = 'geography-e098-section';
const SVG_NS = 'http://www.w3.org/2000/svg'; // identifiant XML, pas une requête réseau

const VIEW_W = 600;                 // largeur du cadre de dessin, unités de vue
const VIEW_H = 400;                 // hauteur du cadre de dessin, unités de vue
const FLAG_H = 280;                 // hauteur du drapeau dans le cadre, unités
const REF_RATIO = 1.5;              // proportion de référence : 3 pour 2
const CANTON_W_FRAC = 0.4;          // le canton couvre 40 % de la largeur
const CANTON_H_FRAC = 0.5;          // et 50 % de la hauteur
const SWEEP_MS = 6000;              // période du flottement continu
const FLUTTER_DEG = 3;              // amplitude angulaire du flottement, degrés
const NARROW = '\u202f';            // espace insécable fine (typographie française)

/* Proportions disponibles. La surface à hauteur égale se calcule comme le
   rapport entre le ratio choisi et le ratio de référence 3:2. */
const RATIOS = [
  { key: 'carre', nom: '1:1', value: 1 },
  { key: 'trois-deux', nom: '3:2', value: 1.5 },
  { key: 'cinq-trois', nom: '5:3', value: 5 / 3 },
  { key: 'deux-un', nom: '2:1', value: 2 },
];
const REF_RATIO_INDEX = 1;

/* Types de partition. Le nom, jamais la seule couleur, identifie le motif. */
const PARTITIONS = [
  { key: 'vertical', nom: 'Bandes verticales' },
  { key: 'horizontal', nom: 'Bandes horizontales' },
  { key: 'croix', nom: 'Croix' },
  { key: 'diagonale', nom: 'Diagonale' },
];

/* Palette locale, définie une fois, sans ressource externe. Chaque couleur
   porte un nom français : c'est le nom et la position qui identifient une
   bande, pas la teinte seule. */
const COLORS = {
  bleu: '#2f5fa8',
  blanc: '#f2efe6',
  rouge: '#c8443b',
  or: '#d6ae5f',
  vert: '#2f7a4f',
};

const COLOR_FACTS = [
  { nom: 'Bleu', hex: COLORS.bleu, sens: 'ciel, mer ou liberté', repere: 'bande de gauche ou champ' },
  { nom: 'Blanc', hex: COLORS.blanc, sens: 'paix ou pureté', repere: 'bande centrale ou croix' },
  { nom: 'Rouge', hex: COLORS.rouge, sens: 'courage ou sang versé', repere: 'bande de droite' },
  { nom: 'Or', hex: COLORS.or, sens: 'soleil ou richesse', repere: 'canton ou symbole' },
  { nom: 'Vert', hex: COLORS.vert, sens: 'nature ou espérance', repere: 'champ alternatif' },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let ratioIndex = REF_RATIO_INDEX;   // 3:2 par défaut
let partitionIndex = 0;             // bandes verticales par défaut
let cantonOn = false;               // bascule indépendante (aria-pressed)
let playing = false;
let renders = 0;

const clampIndex = (index, length) => Math.max(0, Math.min(length - 1, index));

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(value, digits) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? '\u2212' : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* E098-03 / E098-05 — géométrie entièrement dérivée des constantes. */
function flagWidth(index) { return FLAG_H * RATIOS[index].value; }
function flagArea(index) { return flagWidth(index) * FLAG_H; }
function bandeAreaVerticale(index) { return flagArea(index) / 3; }
function croixArea(index) { return flagArea(index) * (9 / 25); }
function diagonaleArea(index) { return flagArea(index) / 2; }
function cantonArea(index) { return flagArea(index) * CANTON_W_FRAC * CANTON_H_FRAC; }
function areaRelative(index) { return RATIOS[index].value / REF_RATIO; }

/* E098-02 — contrôle de l'aire : la somme des parties doit retomber sur
   l'aire totale. Sert de vérification falsifiable (E098-10). */
function partitionAreas(index) {
  const key = PARTITIONS[partitionIndex].key;
  if (key === 'vertical' || key === 'horizontal') return [flagArea(index) / 3, flagArea(index) / 3, flagArea(index) / 3];
  if (key === 'croix') return [croixArea(index), flagArea(index) - croixArea(index)];
  return [diagonaleArea(index), diagonaleArea(index)];
}

/* E098-02 — nœud SVG local. Aucun attribut n'appelle une ressource distante. */
function svgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) Object.keys(attrs).forEach((key) => node.setAttribute(key, String(attrs[key])));
  return node;
}

/* E098-02 — feuille de styles unique et identifiants préfixés. Cadrée par
   [data-geography-e098="on"] posé sur .geo-layout. Aucune information n'est
   portée par la seule couleur, cibles tactiles ≥ 44 px, focus visible. */
const RULES = `
.geo-layout[data-geography-e098="on"] .geography-e098-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-e098="on"] .geography-e098-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e098="on"] .geography-e098-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e098="on"] .geography-e098-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e098="on"] .geography-e098-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-e098="on"] .geography-e098-value { color: var(--ink); }
.geo-layout[data-geography-e098="on"] .geography-e098-list { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-e098="on"] .geography-e098-list li { margin: 0 0 4px; }
.geo-layout[data-geography-e098="on"] .geography-e098-group {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 8px 0;
}
.geo-layout[data-geography-e098="on"] .geography-e098-choice {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-e098="on"] .geography-e098-choice:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-e098="on"] .geography-e098-choice[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-e098="on"] .geography-e098-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e098="on"] .geography-e098-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-e098="on"] .geography-e098-svg {
  display: block; width: 100%; max-width: 340px; height: auto; aspect-ratio: 600 / 400;
  margin: 0 auto; border: 1px solid var(--line); border-radius: 6px; background: rgba(8,12,18,.4);
}
.geo-layout[data-geography-e098="on"] .geography-e098-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-e098="on"] .geography-e098-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-e098="on"] .geography-e098-toggle,
.geo-layout[data-geography-e098="on"] .geography-e098-play {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-e098="on"] .geography-e098-toggle:hover,
.geo-layout[data-geography-e098="on"] .geography-e098-play:hover { border-color: var(--gold); }
.geo-layout[data-geography-e098="on"] .geography-e098-toggle[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-e098="on"] .geography-e098-choice:focus-visible,
.geo-layout[data-geography-e098="on"] .geography-e098-svg:focus-visible,
.geo-layout[data-geography-e098="on"] .geography-e098-toggle:focus-visible,
.geo-layout[data-geography-e098="on"] .geography-e098-play:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-e098="on"] .geography-e098-table {
  width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px;
}
.geo-layout[data-geography-e098="on"] .geography-e098-table caption {
  caption-side: top; text-align: left; color: var(--gold-bright); font-size: 11px; margin-bottom: 4px;
}
.geo-layout[data-geography-e098="on"] .geography-e098-table th,
.geo-layout[data-geography-e098="on"] .geography-e098-table td {
  border: 1px solid var(--line); padding: 4px 6px; text-align: left; font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e098="on"] .geography-e098-table thead th { color: var(--gold-bright); }
.geo-layout[data-geography-e098="on"] .geography-e098-swatch {
  display: inline-block; width: 9px; height: 9px; margin-right: 5px;
  border: 1px solid var(--line); vertical-align: -1px;
}
@media (max-width: 620px) {
  .geo-layout[data-geography-e098="on"] .geography-e098-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-e098="on"] .geography-e098-group { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .geo-layout[data-geography-e098="on"] .geography-e098-svg { max-width: 280px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e098="on"] .geography-e098-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E098-05 — dessin du drapeau en SVG local. Le groupe est reconstruit à chaque
   changement d'état ; les transformations animées ne touchent que son attribut
   `transform`, jamais le contenu. Aucune information n'est exclusive au dessin. */
function drawFlag(scene) {
  if (!scene || !scene.flagGroup) return;
  const group = scene.flagGroup;
  while (group.firstChild) group.removeChild(group.firstChild);

  const w = flagWidth(scene.ratioIndex);
  const h = FLAG_H;
  const x0 = (VIEW_W - w) / 2;
  const y0 = (VIEW_H - h) / 2;

  /* Cadre de référence (trait fin, distinct par la forme). */
  group.appendChild(svgNode('rect', {
    x: x0 - 4, y: y0 - 4, width: w + 8, height: h + 8,
    fill: 'none', stroke: '#6b7078', 'stroke-width': 1, 'stroke-dasharray': '4 4',
  }));

  const key = PARTITIONS[scene.partitionIndex].key;
  const third = w / 3;
  const hThird = h / 3;

  if (key === 'vertical') {
    [COLORS.bleu, COLORS.blanc, COLORS.rouge].forEach((fill, i) => {
      group.appendChild(svgNode('rect', { x: x0 + i * third, y: y0, width: third, height: h, fill }));
    });
  } else if (key === 'horizontal') {
    [COLORS.rouge, COLORS.blanc, COLORS.bleu].forEach((fill, i) => {
      group.appendChild(svgNode('rect', { x: x0, y: y0 + i * hThird, width: w, height: hThird, fill }));
    });
  } else if (key === 'croix') {
    group.appendChild(svgNode('rect', { x: x0, y: y0, width: w, height: h, fill: COLORS.bleu }));
    group.appendChild(svgNode('rect', { x: x0 + w * 0.4, y: y0, width: w * 0.2, height: h, fill: COLORS.blanc }));
    group.appendChild(svgNode('rect', { x: x0, y: y0 + h * 0.4, width: w, height: h * 0.2, fill: COLORS.blanc }));
  } else { /* diagonale : deux triangles égaux, chacun la moitié de l'aire */
    group.appendChild(svgNode('polygon', {
      points: `${x0},${y0} ${x0 + w},${y0} ${x0},${y0 + h}`, fill: COLORS.or,
    }));
    group.appendChild(svgNode('polygon', {
      points: `${x0 + w},${y0} ${x0 + w},${y0 + h} ${x0},${y0 + h}`, fill: COLORS.vert,
    }));
  }

  /* E098-04 — canton + symbole : un carré de proportion fixe et une croix
     dessinée par deux minces rectangles, jamais une image distante. */
  if (scene.cantonOn) {
    const cw = w * CANTON_W_FRAC;
    const ch = h * CANTON_H_FRAC;
    group.appendChild(svgNode('rect', { x: x0, y: y0, width: cw, height: ch, fill: COLORS.or }));
    const t = Math.max(2, cw * 0.04);
    group.appendChild(svgNode('rect', {
      x: x0 + cw / 2 - t / 2, y: y0 + ch * 0.2, width: t, height: ch * 0.6, fill: COLORS.rouge,
    }));
    group.appendChild(svgNode('rect', {
      x: x0 + cw * 0.2, y: y0 + ch / 2 - t / 2, width: cw * 0.6, height: t, fill: COLORS.rouge,
    }));
  }

  applyTransform(scene);
}

/* E098-09 — flottement déterministe : une skewX autour du centre du cadre. */
function applyTransform(scene) {
  if (!scene || !scene.flagGroup) return;
  const angle = scene.reduced() ? 0 : (scene.angle || 0);
  const cx = VIEW_W / 2;
  scene.flagGroup.setAttribute('transform',
    `translate(${cx} 0) skewX(${angle.toFixed(3)}) translate(${-cx} 0)`);
}

/* E098-06 / E098-07 / E098-08 — toutes les grandeurs du panneau, recalculées. */
function writeReadout(scene, cause) {
  if (!scene || !scene.readout) return;
  const ratio = RATIOS[scene.ratioIndex];
  const partition = PARTITIONS[scene.partitionIndex];
  const w = flagWidth(scene.ratioIndex);
  const area = flagArea(scene.ratioIndex);
  const parts = partitionAreas(scene.ratioIndex);
  const cantonSurface = scene.cantonOn ? cantonArea(scene.ratioIndex) : 0;
  const verbs = {
    ratio: 'Proportion modifiée',
    partition: 'Partition modifiée',
    canton: 'Canton modifié',
    clavier: 'Lecture au clavier',
    demarrage: 'Flottement lancé',
    arret: 'Flottement arrêté',
    initial: 'Lecture initiale',
  };
  const somme = parts.reduce((acc, v) => acc + v, 0);
  scene.readout.textContent =
    `${verbs[cause] || 'Lecture'} · drapeau ${ratio.nom} : largeur ${num(w, 0)} unités, ` +
    `hauteur ${num(FLAG_H, 0)} unités, ratio ${num(ratio.value, 2)} · ` +
    `surface ${num(area, 0)} unités² · partition ${partition.nom} en ${parts.length} parties ` +
    `(somme ${num(somme, 0)} unités² = aire totale) · ` +
    `canton ${scene.cantonOn ? `présent, ${num(cantonSurface, 0)} unités² soit ${num(100 * CANTON_W_FRAC * CANTON_H_FRAC, 0)} %` : 'absent'} · ` +
    `à hauteur égale, 2:1 couvre ${num(areaRelative(3), 2)}× la surface du 3:2 de référence.`;

  if (scene.bandeValue) {
    scene.bandeValue.textContent =
      `Avec le ${ratio.nom}, chaque bande verticale mesure ${num(w / 3, 0)} × ${num(FLAG_H, 0)} = ` +
      `${num(bandeAreaVerticale(scene.ratioIndex), 0)} unités², soit un tiers de ${num(area, 0)} unités².`;
  }
}

/* E098-06 — choix unique de proportion (radiogroupe, pas d'aria-pressed). */
function setRatio(index, scene) {
  const s = scene || latest;
  if (!s) return;
  ratioIndex = clampIndex(index, RATIOS.length);
  s.ratioIndex = ratioIndex;
  s.ratioRadios.forEach((radio, i) => {
    const on = i === ratioIndex;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });
  s.layout.setAttribute('data-geography-e098-ratio', RATIOS[ratioIndex].nom);
  drawFlag(s);
  writeReadout(s, 'ratio');
}

/* E098-04 — choix unique de partition (radiogroupe). */
function setPartition(index, scene) {
  const s = scene || latest;
  if (!s) return;
  partitionIndex = clampIndex(index, PARTITIONS.length);
  s.partitionIndex = partitionIndex;
  s.partitionRadios.forEach((radio, i) => {
    const on = i === partitionIndex;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });
  s.layout.setAttribute('data-geography-e098-partition', PARTITIONS[partitionIndex].key);
  drawFlag(s);
  writeReadout(s, 'partition');
}

/* E098-04 — bascule indépendante du canton (aria-pressed légitime). */
function toggleCanton(scene) {
  const s = scene || latest;
  if (!s) return;
  cantonOn = !cantonOn;
  s.cantonOn = cantonOn;
  s.cantonBtn.setAttribute('aria-pressed', cantonOn ? 'true' : 'false');
  s.cantonBtn.textContent = cantonOn ? 'Canton : présent' : 'Canton : absent';
  drawFlag(s);
  writeReadout(s, 'canton');
}

/* E098-09 — une seule frame, court-circuitée quand l'onglet est masqué. */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.svg || !scene.svg.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (scene.playing && !scene.reduced()) {
    if (scene.last === null) scene.last = timestamp;
    scene.elapsed += timestamp - scene.last;
    scene.last = timestamp;
    const angle = FLUTTER_DEG * Math.sin((scene.elapsed / SWEEP_MS) * Math.PI * 2);
    scene.angle = angle;
    applyTransform(scene);
    ensureLoop();
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) stopPlay(scene);
  }
}

function ensureLoop() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { loop(0); return; }
  frame = requestAnimationFrame(loop);
}

function stopPlay(scene) {
  playing = false;
  scene.playing = false;
  scene.angle = 0;
  applyTransform(scene);
  if (scene.play) scene.play.textContent = 'Lancer le flottement';
  if (frame && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

/* E098-10 — installation unique et silencieuse des écouteurs globaux. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (latest && latest.playing && !latest.reduced()) ensureLoop();
    } else if (frame) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
      frame = 0;
      if (latest) latest.last = null;
    }
  });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') query.addEventListener('change', () => {
        if (latest) {
          if (latest.reduced() && latest.playing) stopPlay(latest);
          else if (!latest.reduced()) applyTransform(latest);
        }
      });
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

function line(ctx, parent, index, label, text, valueId, lineId) {
  const paragraph = ctx.el('p', 'geography-e098-line');
  /* Un identifiant explicite évite les doublons quand deux paragraphes
     partagent le même numéro de chantier (ici E098-03). */
  paragraph.id = lineId || `geography-e098-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(ctx.el('strong', '', `E098-${String(index).padStart(2, '0')} · ${label}. `));
  const value = ctx.el('span', 'geography-e098-value', text);
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
  const section = ctx.el('section', 'geography-e098-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Drapeaux et symboles nationaux — lire la géométrie d’un drapeau');
  section.setAttribute('data-sim', 'drapeaux-symboles-nationaux');

  section.appendChild(ctx.el('h2', '', 'Drapeaux et symboles nationaux — lire la géométrie d’un drapeau'));

  /* E098-01 — amorce textuelle, lisible sans aucune interaction. */
  const intro = ctx.el('p', 'geography-e098-line');
  intro.id = 'geography-e098-intro';
  intro.appendChild(ctx.el('strong', '', 'E098-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'Un drapeau est une construction géométrique : des proportions (le rapport entre sa largeur ' +
    'et sa hauteur), une partition (bandes, croix, diagonale, canton) et une palette. ' +
    'La vexillologie est l’étude de ces signes. Le dessin ci-dessous est un exemple schématique ' +
    'à but pédagogique, tracé en SVG local : ni image, ni police, ni tuile distante. ' +
    'Toutes les grandeurs sont aussi écrites en texte, et la couleur n’est jamais le seul indice.'
  ));
  section.appendChild(intro);

  /* E098-03 — géométrie des bandes, formules explicites et valeur dynamique. */
  line(ctx, section, 3, 'Bandes et proportions',
    `Dans un drapeau à trois bandes verticales, chaque bande vaut un tiers de la largeur : ` +
    `largeur ${num(flagWidth(REF_RATIO_INDEX), 0)} / 3 = ${num(flagWidth(REF_RATIO_INDEX) / 3, 0)} unités. ` +
    `Le méridien et le parallèle ne sont pas en cause ici : seule compte la géométrie du rectangle.`);
  line(ctx, section, 3, 'Bande courante',
    `Avec le 3:2, chaque bande verticale mesure ${num(flagWidth(REF_RATIO_INDEX) / 3, 0)} × ${num(FLAG_H, 0)} = ` +
    `${num(bandeAreaVerticale(REF_RATIO_INDEX), 0)} unités², soit un tiers de ${num(flagArea(REF_RATIO_INDEX), 0)} unités².`,
    'geography-e098-bande-value', 'geography-e098-line-03b');

  /* E098-02 — tableau des proportions, référence 3:2 = 1,00×. */
  const tableRatios = ctx.el('table', 'geography-e098-table');
  tableRatios.id = 'geography-e098-ratios';
  tableRatios.appendChild(ctx.el('caption', '', 'E098-02 · Proportions courantes (référence : 3:2)'));
  const theadR = ctx.el('thead');
  const headR = ctx.el('tr');
  ['Proportion', 'Ratio largeur/hauteur', 'Surface à hauteur égale', 'Remarque'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.scope = 'col';
    headR.appendChild(th);
  });
  theadR.appendChild(headR);
  tableRatios.appendChild(theadR);
  const tbodyR = ctx.el('tbody');
  RATIOS.forEach((ratio, i) => {
    const tr = ctx.el('tr');
    tr.id = `geography-e098-ratio-row-${i}`;
    tr.appendChild(ctx.el('th', '', ratio.nom));
    tr.firstChild.scope = 'row';
    tr.appendChild(ctx.el('td', '', num(ratio.value, 2)));
    tr.appendChild(ctx.el('td', '', `${num(areaRelative(i), 2)}×`));
    tr.appendChild(ctx.el('td', '', i === REF_RATIO_INDEX ? 'référence du panneau' : 'proportion alternative'));
    tbodyR.appendChild(tr);
  });
  tableRatios.appendChild(tbodyR);
  section.appendChild(tableRatios);

  /* E098-04 — typologie des partitions et codes non chromatiques. */
  const legend = ctx.el('p', 'geography-e098-line',
    'E098-04 · Partitions : ▥ bandes verticales · ▤ bandes horizontales · ✚ croix · ' +
    '◩ diagonale · ▣ canton. Chaque motif se reconnaît à sa forme et à son nom, ' +
    'jamais à la seule couleur.');
  legend.id = 'geography-e098-legend';
  section.appendChild(legend);

  /* E098-05 — dessin SVG local, redondant avec le texte. */
  const figure = ctx.el('figure', 'geography-e098-figure');
  figure.id = 'geography-e098-figure';
  const svg = svgNode('svg', {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    class: 'geography-e098-svg',
    role: 'img',
    tabindex: 0,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-labelledby': 'geography-e098-svg-title geography-e098-svg-desc',
    'aria-describedby': 'geography-e098-clavier',
  });
  svg.id = 'geography-e098-svg';
  const title = svgNode('title', { id: 'geography-e098-svg-title' });
  title.textContent = 'Drapeau schématique construit en SVG local';
  const desc = svgNode('desc', { id: 'geography-e098-svg-desc' });
  desc.textContent = 'Un rectangle partagé en bandes, en croix ou en diagonale, avec un canton optionnel portant un symbole en croix. Toutes les mesures sont écrites en texte dans le panneau.';
  const flagGroup = svgNode('g', { class: 'geography-e098-flag' });
  flagGroup.id = 'geography-e098-flag';
  svg.append(title, desc, flagGroup);
  const caption = ctx.el('figcaption', 'geography-e098-caption',
    'Exemple schématique, non une reproduction officielle. Le tiret marque le cadre de référence ; ' +
    'la forme du motif et son nom le distinguent, pas la couleur.');
  caption.id = 'geography-e098-caption';
  figure.append(svg, caption);
  section.appendChild(figure);

  /* E098-06 — radiogroupe des proportions (choix unique). */
  const groupR = ctx.el('div', 'geography-e098-group');
  groupR.id = 'geography-e098-ratios-group';
  groupR.setAttribute('role', 'radiogroup');
  groupR.setAttribute('aria-label', 'Choisir la proportion du drapeau');
  RATIOS.forEach((ratio, i) => {
    const radio = ctx.el('button', 'geography-e098-choice',
      `${ratio.nom} — ${num(ratio.value, 2)}`);
    radio.type = 'button';
    radio.id = `geography-e098-ratio-${i}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === ratioIndex ? 'true' : 'false');
    radio.tabIndex = i === ratioIndex ? 0 : -1;
    groupR.appendChild(radio);
  });
  section.appendChild(groupR);

  /* E098-04 — radiogroupe des partitions (choix unique). */
  const groupP = ctx.el('div', 'geography-e098-group');
  groupP.id = 'geography-e098-partitions-group';
  groupP.setAttribute('role', 'radiogroup');
  groupP.setAttribute('aria-label', 'Choisir la partition du drapeau');
  PARTITIONS.forEach((partition, i) => {
    const radio = ctx.el('button', 'geography-e098-choice', partition.nom);
    radio.type = 'button';
    radio.id = `geography-e098-partition-${i}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === partitionIndex ? 'true' : 'false');
    radio.tabIndex = i === partitionIndex ? 0 : -1;
    groupP.appendChild(radio);
  });
  section.appendChild(groupP);

  /* E098-07 — symbolisme des couleurs, avec réserve et repère textuel. */
  line(ctx, section, 7, 'Symbolisme des couleurs',
    'Les sens ci-dessous sont des conventions fréquentes, pas des règles universelles : ' +
    'une même teinte peut signifier des choses différentes selon le pays et l’époque. ' +
    'C’est le nom et la position de la bande qui l’identifient, jamais la couleur seule.');
  const tableColors = ctx.el('table', 'geography-e098-table');
  tableColors.id = 'geography-e098-couleurs';
  tableColors.appendChild(ctx.el('caption', '', 'E098-07 · Conventions fréquentes et repère textuel'));
  const theadC = ctx.el('thead');
  const headC = ctx.el('tr');
  ['Couleur', 'Convention fréquente', 'Repère textuel'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.scope = 'col';
    headC.appendChild(th);
  });
  theadC.appendChild(headC);
  tableColors.appendChild(theadC);
  const tbodyC = ctx.el('tbody');
  COLOR_FACTS.forEach((fact, i) => {
    const tr = ctx.el('tr');
    tr.id = `geography-e098-couleur-${i}`;
    const th = ctx.el('th');
    th.scope = 'row';
    const swatch = ctx.el('span', 'geography-e098-swatch');
    swatch.style.background = fact.hex;
    swatch.setAttribute('aria-hidden', 'true');
    th.appendChild(swatch);
    th.appendChild(document.createTextNode(fact.nom));
    tr.appendChild(th);
    tr.appendChild(ctx.el('td', '', fact.sens));
    tr.appendChild(ctx.el('td', '', fact.repere));
    tbodyC.appendChild(tr);
  });
  tableColors.appendChild(tbodyC);
  section.appendChild(tableColors);

  /* E098-08 — région live unique. */
  const readout = ctx.el('p', 'geography-e098-readout', '');
  readout.id = 'geography-e098-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E098-04 / E098-09 — bascule du canton et flottement. */
  const actions = ctx.el('div', 'geography-e098-actions');
  const cantonBtn = ctx.el('button', 'geography-e098-toggle',
    cantonOn ? 'Canton : présent' : 'Canton : absent');
  cantonBtn.type = 'button';
  cantonBtn.id = 'geography-e098-canton';
  cantonBtn.setAttribute('aria-pressed', cantonOn ? 'true' : 'false');
  cantonBtn.setAttribute('aria-controls', 'geography-e098-flag');
  actions.appendChild(cantonBtn);

  const play = ctx.el('button', 'geography-e098-play', playing ? 'Arrêter le flottement' : 'Lancer le flottement');
  play.type = 'button';
  play.id = 'geography-e098-play';
  play.setAttribute('aria-controls', 'geography-e098-flag');
  actions.appendChild(play);
  section.appendChild(actions);

  /* E098-10 — aide clavier. */
  const clavier = ctx.el('p', 'geography-e098-line',
    'E098-10 · Clavier : Tab atteint les proportions, les partitions, le dessin, le canton puis le flottement. ' +
    'Sur un groupe de choix, ← → parcourent les options. Sur le dessin, ← → changent de proportion, ' +
    '↑ ↓ changent de partition, C bascule le canton, Espace lance ou arrête le flottement. ' +
    'Le pointeur n’est pas nécessaire.');
  clavier.id = 'geography-e098-clavier';
  section.appendChild(clavier);

  /* E098-10 — limite falsifiable en cinq temps, alignée sur l'angle mort. */
  const limite = ctx.el('p', 'geography-e098-line',
    'E098-10 · Limite et vérification : 1) prédire qu’au 3:2 chaque bande verticale occupe exactement ' +
    `un tiers de l’aire, soit ${num(bandeAreaVerticale(REF_RATIO_INDEX), 0)} unités² ; ` +
    '2) régler la proportion 3:2 et la partition en bandes verticales ; ' +
    `3) attendre trois bandes de ${num(flagWidth(REF_RATIO_INDEX) / 3, 0)} unités de large ` +
    `et une somme de ${num(flagArea(REF_RATIO_INDEX), 0)} unités² ; ` +
    '4) falsifier si la somme des parties ne retombe pas sur l’aire totale annoncée ; ' +
    '5) débrief : angle mort — les drapeaux réels varient de 1:1 à 2:1 et au-delà, et le symbolisme ' +
    'des couleurs est une convention, pas une loi ; un seul canevas schématique ne représente pas ' +
    'toutes les traditions, et la couleur n’est jamais le seul indice.');
  limite.id = 'geography-e098-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  return {
    section, layout, svg, flagGroup, cantonBtn, play, readout, bandeValue: section.querySelector('#geography-e098-bande-value'),
    ratioRadios: Array.from(groupR.querySelectorAll('.geography-e098-choice')),
    partitionRadios: Array.from(groupP.querySelectorAll('.geography-e098-choice')),
    ratioIndex,
    partitionIndex,
    cantonOn,
  };
}

register('E098', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e098', 'on');

  const scene = buildSection(ctx, layout);
  layout.setAttribute('data-geography-e098-render', String(renders));
  layout.setAttribute('data-geography-e098-ratio', RATIOS[scene.ratioIndex].nom);
  layout.setAttribute('data-geography-e098-partition', PARTITIONS[scene.partitionIndex].key);

  scene.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;
  scene.playing = playing;
  scene.elapsed = 0;
  scene.last = null;
  scene.angle = 0;

  /* E098-06 / E098-04 — navigation dans les radiogroupes. */
  const wireRadios = (radios, current, apply) => {
    radios.forEach((radio, i) => radio.addEventListener('click', () => apply(i, scene)));
    radios[0].parentNode.addEventListener('keydown', (event) => {
      const radiosList = radios;
      if (!radiosList.includes(event.target)) return;
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
      const next = (current() + dir + radiosList.length) % radiosList.length;
      apply(next, scene);
      radiosList[next].focus();
      event.preventDefault();
      event.stopPropagation();
    });
  };
  wireRadios(scene.ratioRadios, () => ratioIndex, setRatio);
  wireRadios(scene.partitionRadios, () => partitionIndex, setPartition);

  /* E098-10 — clavier sur le dessin. */
  scene.svg.addEventListener('keydown', (event) => {
    const key = event.key;
    if (key === 'ArrowRight') setRatio(ratioIndex + 1, scene);
    else if (key === 'ArrowLeft') setRatio(ratioIndex - 1, scene);
    else if (key === 'ArrowDown') setPartition(partitionIndex + 1, scene);
    else if (key === 'ArrowUp') setPartition(partitionIndex - 1, scene);
    else if (key === 'c' || key === 'C') toggleCanton(scene);
    else if (key === ' ' || key === 'Spacebar') togglePlay(scene);
    else return;
    event.preventDefault();
    event.stopPropagation();
  });

  scene.cantonBtn.addEventListener('click', () => toggleCanton(scene));
  scene.play.addEventListener('click', () => togglePlay(scene));

  function togglePlay(target) {
    if (target.reduced()) {
      stopPlay(target);
      target.play.textContent = 'Flottement indisponible (mouvement réduit)';
      return;
    }
    if (target.playing) {
      stopPlay(target);
      writeReadout(target, 'arret');
    } else {
      playing = true;
      target.playing = true;
      target.play.textContent = 'Arrêter le flottement';
      target.last = null;
      target.elapsed = 0;
      ensureLoop();
      writeReadout(target, 'demarrage');
    }
  }

  latest = scene;
  install();
  setRatio(ratioIndex, scene);
  setPartition(partitionIndex, scene);
  drawFlag(scene);
  writeReadout(scene, 'initial');
});
