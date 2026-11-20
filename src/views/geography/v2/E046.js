import { register } from './registry.js';

/* Lentille E046 (V2) — vue GEOGRAPHIE.
 * Thème : infobulles (tooltips) de lieux — ancrage d'un repère cartographique,
 * quatre placements, bascule anti-collision avec les bords, délai
 * d'apparition (dwell), délai de disparition et maintien au survol,
 * accessibilité clavier (focus, role="tooltip", aria-describedby).
 *
 * Les dix chantiers E046-01 … E046-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E046.md. Les dix sont réellement implémentés :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau, aucune
 * graine aléatoire, aucune journalisation, aucun fichier partagé modifié. Le contenu
 * pédagogique est du texte sémantique réel (titres, paragraphes, tableau captioné,
 * radiogroupe, légendes) présent dans le DOM même sans animation ; le canvas n'est
 * qu'un laboratoire qui illustre des règles déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e046- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e046';

/* Identifiants, tous préfixés geography-v2-e046-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const PLACEMENT_ID = P + '-placement';
const DWELL_ID = P + '-dwell';
const DWELL_OUT_ID = P + '-dwell-value';
const PLACE_ID = P + '-place';
const PLACE_OUT_ID = P + '-place-value';
const CANVAS_ID = P + '-canvas';
const READOUT_ID = P + '-readout';
const LEGEND_ID = P + '-legend';
const HELP_ID = P + '-help';
const LIMITE_ID = P + '-limite';
const FLIP_ID = P + '-flip';
const PERSIST_ID = P + '-persist';
const PLAY_ID = P + '-play';
const TABLE_ID = P + '-table';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Jeu de lieux schématiques, choisis une fois pour toutes (aucun tirage). */
const LIEUX = [
  { nom: 'Phare de la Pointe', cat: 'Repère maritime', x: 0.18, y: 0.24 },
  { nom: 'Vieux Clocher', cat: 'Patrimoine', x: 0.42, y: 0.18 },
  { nom: 'Halle aux Grains', cat: 'Commerce', x: 0.70, y: 0.30 },
  { nom: 'Pont de Fer', cat: 'Infrastructure', x: 0.30, y: 0.55 },
  { nom: 'Observatoire', cat: 'Science', x: 0.62, y: 0.62 },
  { nom: 'Maison du Val', cat: 'Habitat', x: 0.84, y: 0.74 },
  { nom: 'Chapelle Blanche', cat: 'Patrimoine', x: 0.12, y: 0.80 },
  { nom: 'Porte Nord', cat: 'Infrastructure', x: 0.50, y: 0.88 },
];

const PLACEMENTS = {
  haut: 'Haut',
  bas: 'Bas',
  gauche: 'Gauche',
  droite: 'Droite',
};
const PLACEMENT_ORDER = ['haut', 'bas', 'gauche', 'droite'];
const OPPOSITE = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };

const CARTE_KM = 12;        // largeur schématique représentée, en kilomètres
const DIST_REF = 5;         // repère de distance affiché dans la lecture (km)
const DWELL_MIN = 0;
const DWELL_MAX = 1000;
const DWELL_STEP = 50;
const DWELL_DEF = 500;      // délai d'apparition courant, sert de repère
const VISITE_MS = 1400;     // durée d'une visite d'un lieu pendant l'animation
const ECART = 12;           // écart entre le repère et l'infobulle, en px
const BOX_H = 46;           // hauteur de l'infobulle, en px

/* État de module : survit au stage.replaceChildren() de la coque. */
const S = {
  placement: 'droite',
  dwell: DWELL_DEF,
  place: 0,
  flip: true,
  persist: true,
  playing: false,
  sweep: 0,
  inView: true,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function fmtInt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}
function fmt1(n) {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}

/* E046-03 : distance d'un lieu au centre de la carte, en kilomètres.
 * Même lieu → même distance : aucune graine, aucune donnée réseau. */
function distanceKm(lieu) {
  const dx = lieu.x - 0.5;
  const dy = lieu.y - 0.5;
  return Math.sqrt(dx * dx + dy * dy) * CARTE_KM;
}

/* Largeur de l'infobulle : fonction déterministe de la longueur du nom. */
function boxWidth(lieu) {
  return 66 + lieu.nom.length * 6.2;
}

/* E046-05 : rectangle de l'infobulle pour un côté donné, puis test de
 * débordement par rapport à la zone de tracé [x0,y0,x1,y1]. */
function rectFor(cx, cy, cote, w, h, bounds) {
  let x;
  let y;
  if (cote === 'haut') { x = cx - w / 2; y = cy - ECART - h; }
  else if (cote === 'bas') { x = cx - w / 2; y = cy + ECART; }
  else if (cote === 'gauche') { x = cx - ECART - w; y = cy - h / 2; }
  else { x = cx + ECART; y = cy - h / 2; }
  const deborde = x < bounds.x0 || y < bounds.y0 ||
    x + w > bounds.x1 || y + h > bounds.y1;
  return { x, y, w, h, cote, deborde };
}

/* Choix du côté : bascule vers le côté opposé en cas de débordement. */
function choosePlacement(cx, cy, cote, w, bounds) {
  let r = rectFor(cx, cy, cote, w, BOX_H, bounds);
  let bascule = false;
  if (S.flip && r.deborde) {
    const inverse = rectFor(cx, cy, OPPOSITE[cote], w, BOX_H, bounds);
    if (!inverse.deborde) {
      r = inverse;
      bascule = true;
    }
  }
  /* Dernier recours : ramener la boîte dans la zone, sans inventer de donnée. */
  r.x = clamp(r.x, bounds.x0, Math.max(bounds.x0, bounds.x1 - r.w));
  r.y = clamp(r.y, bounds.y0, Math.max(bounds.y0, bounds.y1 - r.h));
  return { rect: r, bascule, debordeResiduel: r.deborde };
}

/* E046-06 : lieu survolé et état du délai. En pause, le délai est écoulé
 * (infobulle visible) ; pendant l'animation, il dépend du temps écoulé. */
function currentHover() {
  if (S.playing) {
    const brut = S.sweep * LIEUX.length;
    const idx = Math.min(LIEUX.length - 1, Math.floor(brut));
    const frac = brut - Math.floor(brut);
    const ecoule = frac * VISITE_MS;
    const progres = S.dwell > 0 ? clamp(ecoule / S.dwell, 0, 1) : 1;
    return { idx, frac, ecoule, progres, affiche: ecoule >= S.dwell };
  }
  const idx = clamp(S.place, 0, LIEUX.length - 1);
  return { idx, frac: 1, ecoule: VISITE_MS, progres: 1, affiche: true };
}

/* ---------- E046-02 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-limite{
  margin:7px 0;padding:7px 9px;border:1px dashed var(--gold,#e6b96f);border-radius:7px;
  color:var(--ink-soft,#d7d1c6);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PLACEMENT_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PLACEMENT_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${PANEL_ID} input[type="range"]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} input[type="range"]::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${DWELL_ID},#${PLACE_ID}{display:block}
#${CANVAS_ID}{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:46px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID} .${P}-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
.${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:220px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E046-01 : contenu sémantique, lisible sans le laboratoire ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une infobulle de lieu est un petit panneau contextuel qui apparaît à proximité d’un repère cartographique pour en donner le nom, la catégorie et une mesure. Elle reste attachée à son point d’ancrage par une patte, ou trait de rappel : le lecteur voit immédiatement à quel lieu elle se rapporte.',
    'L’ancrage est le point du repère auquel l’infobulle est reliée. Sa position se choisit parmi quatre côtés — haut, bas, gauche ou droite. Si le panneau déborde de la zone disponible, une bascule le place du côté opposé : la règle est déterministe et ne dépend d’aucun hasard.',
    'Le délai d’apparition (dwell) est le temps pendant lequel le pointeur ou le focus doit rester sur le repère avant que l’infobulle s’affiche : une valeur courante est de 500 ms. Un délai de disparition évite les clignotements, et le maintien au survol permet de lire le contenu quand le pointeur entre dans le panneau. Pour l’accessibilité, le panneau porte role="tooltip" et est relié au repère par aria-describedby ; le clavier doit pouvoir l’atteindre et le parcourir.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* Limite falsifiable : elle peut être infirmée par une mesure, et elle est
 * alignée avec la rubrique « Limites et angles morts » du rapport d'audit. */
function staticLimit() {
  const p = document.createElement('p');
  p.id = LIMITE_ID;
  p.className = P + '-limite';
  p.textContent = 'Limite falsifiable : le modèle prédit qu’avec la bascule activée un repère proche d’un bord voit son infobulle basculer du côté opposé, sans jamais déborder. Si, à réglage identique, on observait un panneau encore à cheval sur la zone, c’est la règle de bascule qui serait invalide, non la mesure. La carte reste schématique : elle n’invente aucune géographie réelle.';
  return p;
}

/* E046-09 : tableau captioné, rapports recalculés par division. */
function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Repères de délai d’affichage (ordres de grandeur, millisecondes) comparés au délai courant de 500 ms.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Convention', 'Délai (ms)', 'Rapport à 500 ms'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Infobulle au survol (repère)', 500],
    ['Infobulle au focus clavier', 300],
    ['Aide contextuelle détaillée', 1000],
    ['Infobulle instantanée', 0],
    ['Notre réglage par défaut', DWELL_DEF],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = cells[0];
    tr.appendChild(th);
    const td1 = document.createElement('td');
    td1.textContent = fmtInt(cells[1]) + ' ms';
    tr.appendChild(td1);
    const td2 = document.createElement('td');
    td2.textContent = cells[1] === 0 ? '—' : fmt1(cells[1] / DWELL_DEF) + ' ×';
    tr.appendChild(td2);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.className = P + '-valeur';
  out.id = outId;
  label.appendChild(out);
  row.appendChild(label);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', aria);
  row.appendChild(input);
  return { row, input, out };
}

function toggleButton(label, id, pressed) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.textContent = label;
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  return button;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: PLACEMENT_ORDER.map((m) => document.getElementById(P + '-placement-' + m)),
      dwell: document.getElementById(DWELL_ID),
      dwellOut: document.getElementById(DWELL_OUT_ID),
      place: document.getElementById(PLACE_ID),
      placeOut: document.getElementById(PLACE_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      flip: document.getElementById(FLIP_ID),
      persist: document.getElementById(PERSIST_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Infobulles de lieux');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Ce laboratoire montre comment une infobulle reste attachée à un repère : quatre placements possibles, une bascule quand le panneau déborde, un délai d’apparition mesuré et comparé à une convention, puis l’accès au clavier. Le savoir est dans le texte ; le graphique ne fait qu’illustrer des règles déterministes.');

  /* E046-03 : la formule est du texte explicite, pas une image. */
  const formule = ctx.el('p', P + '-fait',
    'Modèle déterministe : la distance d’un lieu au centre vaut d = 12·√((x−0,5)² + (y−0,5)²) km, et la largeur de l’infobulle vaut 66 + 6,2·longueur_du_nom pixels. Aucun nombre n’est tiré au hasard : le même lieu donne toujours la même mesure et la même géométrie.');

  /* E046-04 : radiogroupe natif complété par un rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = PLACEMENT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Côté d’ancrage de l’infobulle (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Côté d’ancrage de l’infobulle (choix unique)';
  fieldset.appendChild(legend);
  PLACEMENT_ORDER.forEach((value) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-placement';
    radio.id = P + '-placement-' + value;
    radio.value = value;
    radio.checked = S.placement === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(PLACEMENTS[value]));
    fieldset.appendChild(lab);
  });

  const dwell = rangeRow('Délai d’apparition', DWELL_ID, DWELL_OUT_ID,
    DWELL_MIN, DWELL_MAX, DWELL_STEP, S.dwell,
    'Délai d’apparition de l’infobulle, de 0 à 1000 millisecondes, par pas de 50');
  dwell.input.setAttribute('aria-valuetext', fmtInt(S.dwell) + ' millisecondes');
  const place = rangeRow('Lieu observé', PLACE_ID, PLACE_OUT_ID,
    0, LIEUX.length - 1, 1, S.place,
    'Index du lieu observé, de 0 à ' + (LIEUX.length - 1));
  place.input.setAttribute('aria-valuetext', LIEUX[S.place].nom);

  /* E046-08 : canvas lab, focalisable et doublé en texte. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire d’infobulles de lieux. Flèches gauche et droite : changer de lieu ; flèches haut et bas : changer le côté d’ancrage ; plus et moins : régler le délai d’apparition ; B : bascule anti-bord ; M : maintien au survol ; Espace : lancer ou arrêter l’animation.');

  const legendText = ctx.el('p', P + '-legend', '');
  legendText.id = LEGEND_ID;

  /* E046-06 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', P + '-sr',
    'Commandes du laboratoire : boutons radio pour choisir le côté d’ancrage ; curseurs pour le délai d’apparition et le lieu observé ; boutons bascule anti-bord, maintien au survol et animation ; flèches gauche et droite sur le graphique pour changer de lieu, flèches haut et bas pour changer de côté, plus et moins pour le délai, B pour la bascule, M pour le maintien, Espace pour lancer ou arrêter l’animation.');
  help.id = HELP_ID;
  panel.setAttribute('aria-describedby', help.id);

  /* E046-05, E046-07, E046-10 : bascules indépendantes → aria-pressed. */
  const flip = toggleButton('Bascule anti-bord : activée', FLIP_ID, S.flip);
  const persist = toggleButton('Maintien au survol : activé', PERSIST_ID, S.persist);
  const play = toggleButton('▶ Animer la visite des lieux', PLAY_ID, S.playing);
  play.setAttribute('aria-controls', CANVAS_ID);

  panel.append(title, lead, staticFacts(), staticLimit(), formule, staticTable(),
    fieldset, dwell.row, place.row, canvas, legendText, readout, help,
    flip, persist, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: PLACEMENT_ORDER.map((m) => document.getElementById(P + '-placement-' + m)),
    dwell: dwell.input, dwellOut: dwell.out,
    place: place.input, placeOut: place.out,
    canvas, readout, legend: legendText, flip, persist, play,
  };
}

/* ---------- E046-03 / E046-04 / E046-05 : rendu du laboratoire ---------- */

/* Géométrie réelle du canvas, partagée entre le dessin et la lecture pour
 * que l'annonce de bascule corresponde exactement au panneau affiché. */
function placementFor(lieu) {
  const cv = S.nodes.canvas;
  const cssW = cv ? (cv.clientWidth || 320) : 320;
  const cssH = cv ? (cv.clientHeight || 260) : 260;
  const pad = 22;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const cx = pad + lieu.x * iw;
  const cy = pad + lieu.y * ih;
  return choosePlacement(cx, cy, S.placement, boxWidth(lieu),
    { x0: pad, y0: pad, x1: pad + iw, y1: pad + ih });
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  /* DPR plafonné à 2 (aucun dépassement de budget de pixels). */
  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 260;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 22;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const X = (v) => pad + v * iw;
  const Y = (v) => pad + v * ih;

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Grille de repérage, en tirets discrets. */
  g.strokeStyle = 'rgba(255,255,255,.06)';
  g.setLineDash([2, 4]);
  for (let k = 1; k < 4; k += 1) {
    g.beginPath(); g.moveTo(pad + (iw * k) / 4, pad); g.lineTo(pad + (iw * k) / 4, pad + ih); g.stroke();
    g.beginPath(); g.moveTo(pad, pad + (ih * k) / 4); g.lineTo(pad + iw, pad + (ih * k) / 4); g.stroke();
  }
  g.setLineDash([]);

  const hover = currentHover();
  const lieu = LIEUX[hover.idx];
  const cx = X(lieu.x);
  const cy = Y(lieu.y);

  /* Tous les repères : cercle numéroté + chiffre (jamais la seule couleur). */
  LIEUX.forEach((l, i) => {
    const actif = i === hover.idx;
    g.beginPath();
    g.arc(X(l.x), Y(l.y), actif ? 5.5 : 3.2, 0, Math.PI * 2);
    g.strokeStyle = actif ? 'rgba(255,255,255,.95)' : 'rgba(214,207,193,.55)';
    g.lineWidth = actif ? 2 : 1;
    g.stroke();
    g.fillStyle = actif ? 'rgba(255,255,255,.95)' : 'rgba(214,207,193,.7)';
    g.font = '9px sans-serif';
    g.fillText(String(i + 1), X(l.x) + 6, Y(l.y) - 6);
  });

  /* Choix du côté et bascule anti-collision (E046-04, E046-05). */
  const choix = placementFor(lieu);

  /* Trait de rappel : il distingue l'ancrage même sans couleur. */
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.6;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(cx, cy);
  const r = choix.rect;
  const anchorX = clamp(cx, r.x + 6, r.x + r.w - 6);
  const anchorY = clamp(cy, r.y + 6, r.y + r.h - 6);
  g.lineTo(anchorX, anchorY);
  g.stroke();

  /* Barre de progression du délai (E046-06). */
  const barW = 54;
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.fillRect(cx - barW / 2, cy + 9, barW, 4);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillRect(cx - barW / 2, cy + 9, barW * hover.progres, 4);

  /* Infobulle : cadre, nom, catégorie, distance. */
  g.fillStyle = 'rgba(8,12,18,.96)';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = hover.affiche ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)';
  g.lineWidth = 1.4;
  g.setLineDash(hover.affiche ? [] : [4, 3]);
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.font = 'bold 11px sans-serif';
  g.fillText(lieu.nom, r.x + 7, r.y + 15);
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText(lieu.cat, r.x + 7, r.y + 29);
  g.fillStyle = 'rgba(255,255,255,.8)';
  g.fillText(fmt1(distanceKm(lieu)) + ' km du centre', r.x + 7, r.y + 41);

  /* Étiquettes d'état, en texte jamais par la seule couleur (E046-05, 07). */
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.font = '11px sans-serif';
  g.fillText('Infobulle · ' + PLACEMENTS[choix.rect.cote] +
    (choix.bascule ? ' · bascule vers ' + PLACEMENTS[choix.rect.cote] : ''),
  pad + 2, pad + 13);
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.9)';
  const etatAttente = hover.affiche
    ? 'Affichée après ' + fmtInt(hover.ecoule) + ' ms'
    : 'En attente : ' + fmtInt(hover.ecoule) + ' / ' + fmtInt(S.dwell) + ' ms';
  g.fillText(etatAttente, pad + 2, cssH - pad - 5);
  if (choix.debordeResiduel || (!S.flip && choix.rect.deborde)) {
    g.fillText('Débordement : la boîte est ramenée dans la zone.', pad + 2, cssH - pad - 18);
  }
  if (S.persist) {
    g.fillText('Maintien au survol : le panneau reste lisible.', pad + 2, cssH - pad - 31);
  }
}

/* ---------- E046-06 / E046-09 : lecture chiffrée (région live unique) ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const hover = currentHover();
  const lieu = LIEUX[hover.idx];
  const dist = distanceKm(lieu);
  const choix = placementFor(lieu); /* même géométrie que le dessin */
  const cote = choix.rect.cote;
  const distComp = dist > DIST_REF ? 'au-delà' : (dist < DIST_REF ? 'en deçà' : 'égal');
  const dwellComp = S.dwell > DWELL_DEF ? 'au-dessus' : (S.dwell < DWELL_DEF ? 'en dessous' : 'égal au');

  const debut = 'Lieu ';
  const apresNom = ' (' + lieu.cat + '), distance au centre ';
  const apresDist = ' km — repère ' + fmtInt(DIST_REF) + ' km : ' + distComp + '. Délai d’apparition ';
  const apresDwell = ' ms, repère ' + fmtInt(DWELL_DEF) + ' ms : ' + dwellComp + ' du repère. ';
  const fin = 'Ancrage ' + PLACEMENTS[cote] + (choix.bascule ? ' après bascule' : '') +
    ' ; maintien au survol ' + (S.persist ? 'activé' : 'désactivé') +
    '. ' + (hover.affiche ? 'Infobulle affichée.' : 'Infobulle en attente du délai.');
  const plain = debut + lieu.nom + apresNom + fmt1(dist) + apresDist +
    fmtInt(S.dwell) + apresDwell + fin;
  if (n.textContent === plain) return; /* évite de réannoncer une valeur stable */

  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  add(debut);
  n.appendChild(strong(lieu.nom));
  add(apresNom);
  n.appendChild(strong(fmt1(dist) + ' km'));
  add(apresDist);
  n.appendChild(strong(fmtInt(S.dwell) + ' ms'));
  add(apresDwell + fin);
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Cercle numéroté : repère du lieu. Trait de rappel doré : ancrage de l’infobulle. Cadre plein : infobulle affichée ; cadre tireté : délai en cours. Barre sous le repère : progression du délai. Le côté d’ancrage et la bascule sont écrits en toutes lettres, jamais seulement par la couleur.';
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio, i) => { if (radio) radio.checked = PLACEMENT_ORDER[i] === S.placement; });
  if (n.dwell) {
    n.dwell.value = String(S.dwell);
    n.dwell.setAttribute('aria-valuetext', fmtInt(S.dwell) + ' millisecondes');
  }
  if (n.dwellOut) n.dwellOut.textContent = fmtInt(S.dwell) + ' ms';
  if (n.place) {
    const idx = clamp(S.place, 0, LIEUX.length - 1);
    n.place.value = String(idx);
    n.place.setAttribute('aria-valuetext', LIEUX[idx].nom);
  }
  if (n.placeOut) n.placeOut.textContent = (clamp(S.place, 0, LIEUX.length - 1) + 1) + ' / ' + LIEUX.length;
  if (n.flip) {
    n.flip.textContent = 'Bascule anti-bord : ' + (S.flip ? 'activée' : 'désactivée');
    n.flip.setAttribute('aria-pressed', S.flip ? 'true' : 'false');
  }
  if (n.persist) {
    n.persist.textContent = 'Maintien au survol : ' + (S.persist ? 'activé' : 'désactivé');
    n.persist.setAttribute('aria-pressed', S.persist ? 'true' : 'false');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la visite des lieux';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- E046-10 : boucle rAF unique, pause et robustesse ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function canRun() {
  return typeof document === 'undefined' ? false : (!document.hidden && S.inView);
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (!canRun()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (!canRun()) return;
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (!reduced) {
      S.sweep = (S.sweep + dt / (VISITE_MS * LIEUX.length)) % 1;
    }
  }
  S.lastTs = ts;
  S.place = Math.floor(S.sweep * LIEUX.length) % LIEUX.length;
  drawLab();
  updateReadout();
  if (!reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
      if (document.hidden) stopLoop();
      else if (S.playing && !reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.playing = false; stopLoop(); syncControls(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (!S.observer && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      S.observer = new IntersectionObserver((entries) => {
        const e = entries[0];
        S.inView = !e || e.isIntersecting;
        if (!S.inView) stopLoop();
        else if (S.playing) startLoop();
      });
      S.observer.observe(S.nodes.panel);
    } catch { /* observation indisponible : la boucle reste active. */ }
  }
}

/* Badge textuel posé sur la carte sans toucher à la donnée. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge',
    'Infobulles schématiques : lieux choisis, ancrage en quatre côtés, bascule anti-bord, délai d’apparition comparé à 500 ms et accès clavier.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E046', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E046-02 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) { S.playing = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.placement = radio.value;
        syncControls();
      });
    });
    n.dwell.addEventListener('input', () => {
      S.dwell = clamp(Math.round(Number(n.dwell.value) / DWELL_STEP) * DWELL_STEP, DWELL_MIN, DWELL_MAX);
      syncControls();
    });
    n.place.addEventListener('input', () => {
      S.place = clamp(Math.round(Number(n.place.value)), 0, LIEUX.length - 1);
      if (S.playing) S.sweep = (S.place + 0.5) / LIEUX.length;
      syncControls();
    });
    n.flip.addEventListener('click', () => { S.flip = !S.flip; syncControls(); });
    n.persist.addEventListener('click', () => { S.persist = !S.persist; syncControls(); });
    n.play.addEventListener('click', () => {
      if (typeof ctxReduced === 'function' && ctxReduced()) {
        S.playing = false;
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) {
        S.place = Math.floor(S.sweep * LIEUX.length) % LIEUX.length;
        stopLoop();
      } else {
        startLoop();
      }
      syncControls();
    });
    /* E046-08 : équivalent clavier complet du laboratoire. */
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        S.place = (S.place + step + LIEUX.length) % LIEUX.length;
        if (S.playing) S.sweep = (S.place + 0.5) / LIEUX.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? -1 : 1;
        const i = PLACEMENT_ORDER.indexOf(S.placement);
        S.placement = PLACEMENT_ORDER[(i + step + PLACEMENT_ORDER.length) % PLACEMENT_ORDER.length];
      } else if (event.key === '+' || event.key === '=') {
        S.dwell = clamp(S.dwell + DWELL_STEP, DWELL_MIN, DWELL_MAX);
      } else if (event.key === '-' || event.key === '−') {
        S.dwell = clamp(S.dwell - DWELL_STEP, DWELL_MIN, DWELL_MAX);
      } else if (event.key === 'Home' || event.key === 'End') {
        S.place = event.key === 'Home' ? 0 : LIEUX.length - 1;
        if (S.playing) S.sweep = (S.place + 0.5) / LIEUX.length;
      } else if (event.key === 'b' || event.key === 'B') {
        S.flip = !S.flip;
      } else if (event.key === 'm' || event.key === 'M') {
        S.persist = !S.persist;
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (typeof ctxReduced === 'function' && ctxReduced()) {
          S.playing = false;
          stopLoop();
        } else {
          S.playing = !S.playing;
          if (!S.playing) {
            S.place = Math.floor(S.sweep * LIEUX.length) % LIEUX.length;
            stopLoop();
          } else {
            startLoop();
          }
        }
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
  if (S.playing && !reduced) startLoop();
});
