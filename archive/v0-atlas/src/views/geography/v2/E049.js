import { register } from './registry.js';

/* Lentille E049 (V2) — vue GEOGRAPHIE.
 * Thème : zoom et dézoom — échelle, résolution au sol, pyramide de tuiles,
 * généralisation cartographique, zoom discret et continu.
 *
 * Les dix chantiers E049-01 … E049-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E049.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune sortie console, aucun
 * fichier partagé modifié (passe 1, registry.js et index.js intacts).
 *
 * Le contenu pédagogique est du texte sémantique réel (h2, p, table, ul,
 * radiogroupe, curseur, région de statut) présent dans le DOM même sans
 * animation ni interaction ; le canvas n'est qu'un laboratoire qui illustre
 * des grandeurs recalculées par formule et déjà écrites en toutes lettres.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e049- (identifiants, classes, attributs,
 * noms de groupes et bloc CSS).
 *
 * Nouveautés V2 par rapport à la passe 1 : rôle `radiogroup` explicite sur un
 * choix unique natif (pas d'aria-pressed sur les niveaux), `aria-valuetext`
 * maintenu à jour sur le curseur, `ctx.reducedMotion()` relu à chaque tick,
 * garde-fous d'écouteurs entre rendus, IntersectionObserver suspendant le
 * balayage hors écran, cibles ≥ 36 px (boutons 44 px, pouces 24 px) et badge
 * de schématisme dans .geo-map.
 */

const P = 'geography-v2-e049';

/* Identifiants, tous préfixés geography-v2-e049-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const INTRO_ID = P + '-intro';
const LAT_ID = P + '-lat';
const RES_ID = P + '-res';
const ECHELLE_ID = P + '-echelle';
const GEN_ID = P + '-gen-intro';
const TABLE_ID = P + '-table';
const GROUP_ID = P + '-group';
const DETAIL_ID = P + '-detail';
const CURSEUR_ID = P + '-curseur';
const CURSEUR_LABEL_ID = P + '-curseur-label';
const CURSEUR_OUT_ID = P + '-curseur-value';
const READOUT_ID = P + '-readout';
const FIGURE_ID = P + '-figure';
const CANVAS_ID = P + '-canvas';
const CAPTION_ID = P + '-caption';
const MESURES_ID = P + '-mesures';
const ACTIONS_ID = P + '-actions';
const BASCULE_ID = P + '-grille';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const CLAVIER_ID = P + '-clavier';
const LIMITE_ID = P + '-limite';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Grandeurs de référence, toutes traçables et recalculées par formule. */
const RAD = Math.PI / 180;
const R_EQUATEUR = 6378137;                       // rayon équatorial WGS84, mètres
const CIRCONFERENCE = 2 * Math.PI * R_EQUATEUR;   // ≈ 40 075 016,686 m
const TUILE_PX = 256;                             // tuile cartographique standard
const DPI = 96;                                   // densité de référence, points/pouce
const POUCE_M = 0.0254;                           // pouce en mètres
const LAT_REFERENCE = 48.8566;                    // Paris, latitude de repli
const MAX_ZOOM = 5;                               // niveaux 0 … 5
const PAS_ANIM = 620;                             // ms par palier de l'animation
const NARROW = '\u202f';                          // espace insécable fine
const MINUS = '\u2212';                           // signe moins typographique

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

/* État de module : la coque reconstruit son DOM à chaque rendu, donc l'état
   survit dans S et les écouteurs globaux sont posés une seule fois. */
const S = {
  selected: 2,       // niveau discret sélectionné dans le radiogroupe
  zoom: 2,           // valeur du curseur continu
  playing: false,
  graticule: false,  // bascule indépendante (aria-pressed)
  renders: 0,
  lat: LAT_REFERENCE,
  place: '',
  rafId: 0,
  lastTs: 0,
  elapsed: 0,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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
const resolution = (z, lat) =>
  (CIRCONFERENCE * Math.cos(lat * RAD)) / (TUILE_PX * Math.pow(2, z));

/* E049-03 — dénominateur d'échelle à 96 DPI : échelle = r · DPI / 0,0254. */
const echelle = (z, lat) => (resolution(z, lat) * DPI) / POUCE_M;

/* E049-04 — nombre de tuiles d'une pyramide au niveau z : 4^z. */
const tuiles = (z) => Math.pow(4, z);

/* Formatage d'un dénominateur d'échelle entier arrondi. */
const formatEchelle = (value) => (finite(value) ? `1 : ${num(Math.round(value), 0)}` : '—');

const reduced = () => (typeof ctxReduced === 'function' && !!ctxReduced());

/* ---------- E049-01 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--muted,#9aa0a8);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;font-weight:600;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-ligne{margin:0 0 7px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#${PANEL_ID} .${P}-ligne strong,#${PANEL_ID} .${P}-value{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted,#9aa0a8)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} .${P}-liste{margin:4px 0 8px;padding-left:18px}
#${PANEL_ID} .${P}-liste li{margin:0 0 4px}
#${GROUP_ID}{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}
#${PANEL_ID} .${P}-niveau{
  min-height:44px;min-width:44px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted,#9aa0a8);font:inherit;font-size:10px;line-height:1.35;
  text-align:left;cursor:pointer;transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} .${P}-niveau:hover{border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} .${P}-niveau[aria-checked="true"]{
  border-color:var(--gold-bright,#f4d69e);color:var(--gold-bright,#f4d69e);
  background:rgba(230,185,111,.10);box-shadow:0 0 0 1px var(--gold-bright,#f4d69e) inset;
}
#${PANEL_ID} label[for="${CURSEUR_ID}"]{display:block;margin-top:6px;color:var(--ink,#e8e6e0)}
#${CURSEUR_ID}{
  width:100%;min-height:36px;accent-color:var(--gold-bright,#f4d69e);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${CURSEUR_ID}::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${CURSEUR_ID}::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${CURSEUR_ID}::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${CURSEUR_ID}::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
#${READOUT_ID}{
  min-height:46px;padding:7px 9px;margin:8px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--gold-bright,#f4d69e);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${FIGURE_ID}{margin:8px 0;text-align:center}
#${CANVAS_ID}{
  display:block;width:100%;max-width:260px;height:auto;aspect-ratio:3/2;margin:0 auto;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);
  touch-action:manipulation;cursor:default;
}
#${CAPTION_ID}{margin-top:5px;font-size:10px;color:var(--muted,#9aa0a8)}
#${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#${PANEL_ID} button.${P}-bascule,#${PANEL_ID} button.${P}-play,#${PANEL_ID} button.${P}-reset{
  min-height:44px;min-width:44px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--gold-bright,#f4d69e);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button.${P}-bascule:hover,#${PANEL_ID} button.${P}-play:hover,#${PANEL_ID} button.${P}-reset:hover{
  border-color:var(--gold,#e6b96f);
}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.10)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;transition:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] *{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} *{transition:none!important;animation:none!important;scroll-behavior:auto!important}
}
@media (max-width:620px){
  #${PANEL_ID}{padding:9px;font-size:10px}
  #${GROUP_ID}{grid-template-columns:repeat(2,minmax(0,1fr))}
  #${CANVAS_ID}{max-width:220px}
}
`;

/* ---------- E049-01 : faits sémantiques, lisibles sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Zoomer, ce n’est pas agrandir le territoire : c’est changer l’échelle de sa représentation. Un zoom avant montre moins de surface avec plus de détail ; un dézoom montre plus de surface avec moins de détail.',
    'Chaque niveau de zoom double ou divise par deux la résolution au sol : la mesure est recalculée depuis le schéma Web Mercator à tuiles de 256 px, avec une circonférence équatoriale de 2πR et R = 6 378 137 m.',
    'Dézoomer oblige à retirer des détails pour garder une carte lisible : routes et bâtiments disparaissent avant les continents. C’est une contrainte de lisibilité (généralisation), non un défaut de donnée.',
    'Limite falsifiable : prédire que passer de z à z+1 divise la résolution par deux et multiplie les tuiles par quatre, régler z = 2 puis z = 3, vérifier les rapports, puis débrief sur les limites du modèle (projection, DPI, taille de tuile, généralisation).',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function line(ctx, parent, index, label, text, id) {
  const p = ctx.el('p', P + '-ligne');
  const strong = ctx.el('strong', '', `E049-${String(index).padStart(2, '0')} · ${label}. `);
  const span = ctx.el('span', P + '-value', text);
  if (id) span.id = id;
  p.append(strong, span);
  parent.appendChild(p);
  return span;
}

/* ---------- E049-04 : tableau sémantique des six niveaux ---------- */

function staticTable(lat) {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Niveaux de zoom — tuiles 4^z et résolution au sol à la latitude courante (référence : tuile de 256 px, 96 DPI).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Niveau z', 'Titre', 'Détail restant', 'Tuiles', 'Résolution'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  NIVEAUX.forEach((niveau) => {
    const tr = document.createElement('tr');
    const cells = [
      `z = ${niveau.z}`,
      niveau.titre,
      niveau.detail,
      num(tuiles(niveau.z), 0),
      `≈ ${num(resolution(niveau.z, lat), 2)} m/px`,
    ];
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

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx, lat) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('.' + P + '-niveau')),
      detail: document.getElementById(DETAIL_ID),
      curseur: document.getElementById(CURSEUR_ID),
      curseurOut: document.getElementById(CURSEUR_OUT_ID),
      readout: document.getElementById(READOUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      bascule: document.getElementById(BASCULE_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('data-sim', 'zoom-dezoom');

  const title = ctx.el('h2', '', 'Zoom et dézoom — grossir la carte, pas le monde (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un laboratoire autonome sur le zoom et le dézoom en cartographie numérique : résolution au sol, dénominateur d’échelle, pyramide de tuiles et généralisation. Toutes les grandeurs sont recalculées par formule et écrites en texte.');
  lead.id = LEAD_ID;

  const intro = ctx.el('p', P + '-ligne', '');
  intro.id = INTRO_ID;
  intro.append(
    ctx.el('strong', '', 'E049-01 · Principe. '),
    document.createTextNode('Le zoom change l’échelle de la représentation, jamais la taille du monde.'),
  );

  /* E049-02 / E049-03 — latitude de référence, résolution et échelle. */
  const latText = S.place
    ? `Latitude lue dans la carte (${S.place}) : ${num(S.lat, 3)}° ; les calculs l’utilisent.`
    : `Aucune coordonnée lisible pour ce lieu : les calculs utilisent la latitude de référence de Paris, ${num(LAT_REFERENCE, 4)}° (annoncée, non déduite de la carte).`;
  const latLine = line(ctx, panel, 2, 'Latitude de référence', latText, LAT_ID);

  const resText =
    `À cette latitude, r(z) = 2πR · cos φ / (256 · 2^z), avec R = ${num(R_EQUATEUR, 0)} m. ` +
    `À z = 0 : r ≈ ${num(resolution(0, S.lat), 2)} m/pixel ; à z = 5 : r ≈ ${num(resolution(5, S.lat), 2)} m/pixel, soit ${num(Math.pow(2, 5), 0)} fois plus fin.`;
  line(ctx, panel, 2, 'Résolution au sol', resText, RES_ID);

  const scaleText =
    `Échelle à 96 DPI : E = r · 96 / 0,0254. À l’équateur et z = 0, r ≈ ${num(resolution(0, 0), 2)} m/pixel, soit ${formatEchelle(echelle(0, 0))} (référence nominale). Ici à z = 2 : ${formatEchelle(echelle(2, S.lat))}.`;
  line(ctx, panel, 3, 'Dénominateur d’échelle', scaleText, ECHELLE_ID);

  const gen = ctx.el('p', P + '-ligne', '');
  gen.id = GEN_ID;
  gen.append(
    ctx.el('strong', '', 'E049-04 · Généralisation. '),
    document.createTextNode('Le tableau ci-dessous donne, pour chaque niveau, le détail subsistant, le nombre de tuiles et la résolution.'),
  );
  panel.appendChild(gen);
  panel.appendChild(staticTable(lat));

  /* E049-05 — radiogroupe (choix unique : aucun aria-pressed ici). */
  const group = ctx.el('div', P + '-group');
  group.id = GROUP_ID;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir un niveau de zoom (choix unique)');
  const radios = [];
  NIVEAUX.forEach((niveau, i) => {
    const radio = ctx.el('button', P + '-niveau', `z ${niveau.z} — ${niveau.titre}`);
    radio.type = 'button';
    radio.id = P + '-radio-' + niveau.z;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === S.selected ? 'true' : 'false');
    radio.tabIndex = i === S.selected ? 0 : -1;
    radios.push(radio);
    group.appendChild(radio);
  });
  panel.appendChild(group);

  const detail = ctx.el('p', P + '-ligne', '');
  detail.id = DETAIL_ID;
  panel.appendChild(detail);

  /* E049-05 — curseur continu, avec libellé et valeur vocalisée. */
  const curseurLabel = document.createElement('label');
  curseurLabel.id = CURSEUR_LABEL_ID;
  curseurLabel.setAttribute('for', CURSEUR_ID);
  curseurLabel.appendChild(document.createTextNode('Zoom continu z : '));
  const curseurOut = ctx.el('span', P + '-value', '');
  curseurOut.id = CURSEUR_OUT_ID;
  curseurLabel.appendChild(curseurOut);
  panel.appendChild(curseurLabel);
  const curseur = document.createElement('input');
  curseur.type = 'range';
  curseur.id = CURSEUR_ID;
  curseur.min = '0';
  curseur.max = String(MAX_ZOOM);
  curseur.step = '1';
  curseur.value = String(S.selected);
  curseur.setAttribute('aria-labelledby', CURSEUR_LABEL_ID);
  curseur.setAttribute('aria-label', `Niveau de zoom continu, de 0 à ${MAX_ZOOM}`);
  panel.appendChild(curseur);

  /* E049-07 — unique région live. */
  const readout = ctx.el('p', P + '-readout', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  panel.appendChild(readout);

  /* E049-06 — laboratoire canvas, redondant avec le texte. */
  const figure = ctx.el('figure', P + '-figure');
  figure.id = FIGURE_ID;
  const canvas = ctx.el('canvas', P + '-canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Schéma de zoom : une fenêtre centrale fixe, des îlots de détail qui apparaissent au zoom avant et une grille dont les mailles grandissent. Flèches pour zoomer, Début pour le niveau 0, Fin pour le niveau ' + MAX_ZOOM + '.');
  canvas.setAttribute('aria-describedby', CAPTION_ID);
  const caption = ctx.el('figcaption', P + '-caption', 'Schéma non à l’échelle : la fenêtre reste fixe, les mailles et les îlots changent ; les nombres sont donnés en texte et dans le tableau.');
  caption.id = CAPTION_ID;
  figure.append(canvas, caption);
  panel.appendChild(figure);

  /* E049-08 — repères chiffrés, dont des comparaisons à une référence. */
  const mesures = ctx.el('ul', P + '-liste');
  mesures.id = MESURES_ID;
  const items = [
    `Circonférence équatoriale 2πR ≈ ${num(CIRCONFERENCE, 0)} m ; tuile de ${TUILE_PX} px : à l’équateur et z = 0, r ≈ ${num(resolution(0, 0), 2)} m/pixel.`,
    `Référence : chaque niveau +1 divise r par deux et double le dénominateur d’échelle ; il multiplie le nombre de tuiles par quatre (4^z).`,
    `Référence : ${formatEchelle(echelle(0, 0))} à l’équateur z = 0, contre ${formatEchelle(echelle(5, 0))} à z = 5, soit un facteur ${num(Math.pow(2, 5), 0)}.`,
    `192 DPI (écran haute densité) donnerait une échelle ${num(192 / DPI, 1)} fois plus grande qu’à 96 DPI à résolution égale : la référence de densité change tout.`,
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = P + '-mesure-' + i;
    mesures.appendChild(item);
  });
  panel.appendChild(mesures);

  /* E049-08 / E049-09 — bascule et commandes (aria-pressed réservé aux bascules). */
  const actions = ctx.el('div', P + '-actions');
  actions.id = ACTIONS_ID;
  const bascule = ctx.el('button', P + '-bascule', 'Afficher la grille : non');
  bascule.type = 'button';
  bascule.id = BASCULE_ID;
  bascule.setAttribute('aria-pressed', 'false');
  bascule.setAttribute('aria-controls', CANVAS_ID);
  const play = ctx.el('button', P + '-play', S.playing ? 'Arrêter le zoom animé' : 'Lancer le zoom animé');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', READOUT_ID);
  const reset = ctx.el('button', P + '-reset', 'Réinitialiser (z = 2)');
  reset.type = 'button';
  reset.id = RESET_ID;
  actions.append(bascule, play, reset);
  panel.appendChild(actions);

  const clavier = ctx.el('p', P + '-ligne',
    'E049-09 · Clavier : Tab atteint les six niveaux, le curseur, la grille, l’animation, la réinitialisation puis le schéma. ' +
    '← → (ou ↑ ↓) change d’un niveau, Début place z = 0, Fin place z = ' + MAX_ZOOM + '. Le schéma accepte les mêmes touches.');
  clavier.id = CLAVIER_ID;
  panel.appendChild(clavier);

  const limite = ctx.el('p', P + '-ligne',
    'E049-10 · Limite et vérification : 1) prédire que passer de z à z+1 divise la résolution au sol par deux et multiplie le nombre de tuiles par quatre ; ' +
    '2) régler le curseur sur z = 2 puis z = 3 ; 3) attendre r(z3) = r(z2)/2 et 4^3 / 4^2 = 4 ; ' +
    '4) falsifier si le rapport n’est pas 2 (et 4 pour les tuiles) : l’hypothèse est réfutée ; ' +
    '5) débrief : ce modèle Web Mercator à tuiles de 256 px et 96 DPI est une référence nominale — une vraie carte peut changer de projection, de densité d’écran ou de taille de tuile, et le dézoom implique aussi une généralisation que la simple division par deux ne décrit pas.');
  limite.id = LIMITE_ID;
  panel.appendChild(limite);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios, detail, curseur, curseurOut,
    readout, canvas, bascule, play, reset, latLine,
  };
}

/* ---------- E049-06 : dessin déterministe (un seul canvas, DPR ≤ 2) ---------- */

function drawMap() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const painter = cv.getContext('2d');
  if (!painter) return;
  const width = Math.max(160, Math.min(260, cv.clientWidth || 260));
  const height = Math.round(width * 0.66);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(width * dpr);
  const pxH = Math.round(height * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, width, height);

  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(cv) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const value = theme ? theme.getPropertyValue(name).trim() : '';
    return value || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const gold = color('--gold', '#d9b166');
  const bright = color('--gold-bright', '#f4d69e');
  const muted = color('--muted', '#9aa0a8');

  const cx = width / 2;
  const cy = height / 2;
  const facteur = Math.pow(2, S.zoom - S.selected); // grossissement relatif au niveau choisi
  const maille = 14 * facteur;

  /* Fond schématique. */
  painter.fillStyle = 'rgba(255,255,255,.03)';
  painter.fillRect(0, 0, width, height);

  /* Grille : tracée seulement si la bascule est active ; son état est toujours
     annoncé en texte par le bouton aria-pressed. */
  if (S.graticule && maille > 2 && maille < width * 3) {
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

  /* Îlots de détail : plus le zoom est faible, plus ils sont rares. */
  const lots = [
    [-0.5, -0.3], [0.4, -0.35], [0.15, 0.2], [-0.35, 0.4], [0.55, 0.45], [-0.6, 0.1],
  ];
  const visibles = clamp(Math.round(1 + S.zoom), 1, lots.length);
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
  painter.fillText(`z = ${num(S.zoom, 1)}`, barX + 50, barY + 3);
}

/* ---------- E049-07 : region live unique ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const r = resolution(S.zoom, S.lat);
  const e = echelle(S.zoom, S.lat);
  const t = tuiles(Math.round(S.zoom));
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const text =
    `Zoom z = ${num(S.zoom, 1)} · résolution au sol ${num(r, 2)} m/pixel · ` +
    `échelle ${formatEchelle(e)} · ${num(t, 0)} tuile(s) au niveau ${num(Math.round(S.zoom), 0)}. ` +
    `Référence à l’équateur z = 0 : ${num(resolution(0, 0), 2)} m/pixel (${formatEchelle(echelle(0, 0))}).`;
  if (n.textContent !== text) {
    n.textContent = '';
    n.appendChild(document.createTextNode('Zoom z = '));
    n.appendChild(fort(num(S.zoom, 1)));
    n.appendChild(document.createTextNode(' · résolution au sol '));
    n.appendChild(fort(`${num(r, 2)} m/pixel`));
    n.appendChild(document.createTextNode(' · échelle '));
    n.appendChild(fort(formatEchelle(e)));
    n.appendChild(document.createTextNode(' · '));
    n.appendChild(fort(`${num(t, 0)} tuile(s)`));
    n.appendChild(document.createTextNode(` au niveau ${num(Math.round(S.zoom), 0)}. Référence à l’équateur z = 0 : ${num(resolution(0, 0), 2)} m/pixel (${formatEchelle(echelle(0, 0))}).`));
  }
}

/* Met à jour curseur, détail, radios, lecture et dessin après une action. */
function applyZoom(value, fromAnimation) {
  S.zoom = clamp(value, 0, MAX_ZOOM);
  S.selected = Math.round(S.zoom);
  const niveau = NIVEAUX[S.selected];
  const n = S.nodes;
  if (n.radios) {
    n.radios.forEach((radio, i) => {
      const on = i === S.selected;
      radio.setAttribute('aria-checked', on ? 'true' : 'false');
      radio.tabIndex = on ? 0 : -1;
    });
  }
  if (n.detail) n.detail.textContent = `${niveau.titre} — détail visible : ${niveau.detail}.`;
  if (n.curseur) {
    n.curseur.value = String(S.zoom);
    n.curseur.setAttribute('aria-valuetext', `${num(S.zoom, 1)} — ${niveau.titre}`);
  }
  if (n.curseurOut) n.curseurOut.textContent = `${num(S.zoom, 1)} / ${MAX_ZOOM} — ${niveau.titre}`;
  updateReadout();
  drawMap();
  if (!fromAnimation && n.readout) n.readout.setAttribute('data-' + P + '-announce', String(S.zoom));
}

/* ---------- E049-10 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (reduced()) return;
  S.lastTs = 0;
  if (typeof requestAnimationFrame !== 'function') { tick(0); return; }
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (reduced()) { S.playing = false; syncControls(); return; }
  if (S.lastTs && S.playing) {
    /* Balayage aller-retour entre z = 0 et z = MAX_ZOOM, sans aléa. */
    S.elapsed += Math.min(80, ts - S.lastTs);
    const step = Math.floor(S.elapsed / PAS_ANIM);
    const span = MAX_ZOOM * 2;
    const phase = step % span;
    applyZoom(phase <= MAX_ZOOM ? phase : span - phase, true);
  }
  S.lastTs = ts;
  if (S.playing && !reduced()) S.rafId = requestAnimationFrame(tick);
}

/* ---------- Synchronisation et garde-fous d'écouteurs ---------- */

function syncControls() {
  const n = S.nodes;
  if (n.bascule) {
    n.bascule.setAttribute('aria-pressed', S.graticule ? 'true' : 'false');
    n.bascule.textContent = `Afficher la grille : ${S.graticule ? 'oui' : 'non'}`;
  }
  if (n.play) {
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    n.play.textContent = S.playing ? 'Arrêter le zoom animé' : 'Lancer le zoom animé';
  }
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.setAttribute(REDUCED_ATTR, reduced() ? '1' : '0');
  applyZoom(S.zoom, true);
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', '');
  badge.id = BADGE_ID;
  badge.textContent = 'Schéma de zoom pédagogique — échelle et résolution données en texte, non à l’échelle du dessin.';
  map.appendChild(badge);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !reduced()) startLoop();
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
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source vivante. */ }
  }
}

/* E049-10 — IntersectionObserver : suspend le balayage hors écran. */
function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.playing) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- E049-09 : clavier ---------- */

function onKey(event) {
  const target = event.target;
  const isRadio = target && target.classList && target.classList.contains(P + '-niveau');
  const isCanvas = target === S.nodes.canvas;
  if (!isRadio && !isCanvas) return;
  let next = S.selected;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(MAX_ZOOM, S.selected + 1);
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, S.selected - 1);
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = MAX_ZOOM;
  else return;
  event.preventDefault();
  event.stopPropagation();
  applyZoom(next, false);
  if (isCanvas) S.nodes.canvas.focus();
  else if (S.nodes.radios[next]) S.nodes.radios[next].focus();
}

/* ---------- Point d'entrée ---------- */

register('E049', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E049-01 — bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css('geography-v2-e049', CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  const layout = ctx.layout || ctx.stage;
  S.renders += 1;

  /* Instantané déterministe du DOM produit par la vue. */
  const pair = readCoords(layout);
  S.lat = pair ? pair.lat : LAT_REFERENCE;
  S.place = readPlace(layout);
  layout.setAttribute('data-' + P + '-lat', pair ? String(pair.lat) : 'reference');
  layout.setAttribute('data-' + P + '-niveaux', String(NIVEAUX.length));
  layout.setAttribute('data-' + P + '-render', String(S.renders));

  S.nodes = ensurePanel(ctx, S.lat);
  addMapBadge(ctx);
  if (reduced()) { S.playing = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.panel.addEventListener('keydown', onKey);
    n.radios.forEach((radio, i) => {
      radio.addEventListener('click', () => applyZoom(i, false));
    });
    n.curseur.addEventListener('input', () => {
      applyZoom(clamp(Number(n.curseur.value) || 0, 0, MAX_ZOOM), false);
    });
    n.bascule.addEventListener('click', () => {
      S.graticule = !S.graticule;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (reduced()) {
        S.playing = false;
        applyZoom((S.selected + 1) % NIVEAUX.length, false);
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop();
      else { S.elapsed = S.zoom * PAS_ANIM; startLoop(); }
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.playing = false;
      stopLoop();
      applyZoom(2, false);
      syncControls();
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reduced()) startLoop();
});
