import { register } from './registry.js';

/* Lentille E076 — vue GEOGRAPHIE.
 * Thème : mode plein écran de la carte.
 *
 * Les dix chantiers E076-01 … E076-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E076.md. Tout est local : aucune requête
 * réseau, aucune valeur aléatoire, aucune sortie console, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (section, titres, paragraphes, tableau, fieldset, légendes, région de
 * statut), lisible et structuré sans animation ; le canvas n'est qu'un
 * laboratoire qui illustre le passage du cadre intégré au cadre plein écran.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e076';
const PFX = 'geography-e076';
const PANEL_ID = `${PFX}-panel`;
const TITLE_ID = `${PFX}-title`;
const TABLE_ID = `${PFX}-table`;
const MODE_ID = `${PFX}-mode`;
const MODE_INTEGRE_ID = `${PFX}-mode-integre`;
const MODE_PLEIN_ID = `${PFX}-mode-plein`;
const MODE_OUTILS_ID = `${PFX}-mode-outils`;
const LARGEUR_ID = `${PFX}-largeur`;
const LARGEUR_OUT_ID = `${PFX}-largeur-valeur`;
const HAUTEUR_ID = `${PFX}-hauteur`;
const HAUTEUR_OUT_ID = `${PFX}-hauteur-valeur`;
const CANVAS_ID = `${PFX}-canvas`;
const LEGENDE_ID = `${PFX}-legende`;
const BADGE_ID = `${PFX}-badge`;
const READOUT_ID = `${PFX}-readout`;
const PLAY_ID = `${PFX}-play`;
const FS_ID = `${PFX}-fs`;
const EXIT_ID = `${PFX}-exit`;
const DEFI_ID = `${PFX}-defi`;
const DEBRIEF_ID = `${PFX}-debrief`;
const DEBRIEF_BTN_ID = `${PFX}-debrief-btn`;

/* Constantes miroir, documentées comme telles (risque de dérive) :
 * MAP_W / MAP_H = geography.js:10-11 ; viewBox et preserveAspectRatio =
 * geography.js:200-202 ; commandes de zoom et glisser = geography.js:323-358. */
const MAP_W = 900;
const MAP_H = 620;
const VIEW_AREA = MAP_W * MAP_H;       // 558 000 unités² de la vue de base
const OUTILS_H = 44;                   // hauteur de la barre d'outils, px
const CIBLE_MIN = 24;                  // WCAG 2.2 — 2.5.8
const CIBLE_RECO = 44;                 // WCAG 2.2 — 2.5.5
const SIM_W = 0.62;                    // hypothèse de laboratoire : cadre intégré
const SIM_H = 0.58;                    // hypothèse de laboratoire : cadre intégré
const LARGEUR_MIN = 320;
const LARGEUR_MAX = 2560;
const HAUTEUR_MIN = 240;
const HAUTEUR_MAX = 1440;
const REF_W = 1280;
const REF_H = 720;
const REF_SCALE = Math.min(REF_W / MAP_W, REF_H / MAP_H);
const SVG_NS = 'http://www.w3.org/2000/svg';

/* Contour schématique déterministe du laboratoire (non issu du jeu de données,
 * présenté comme tel) et trois repères textuels. */
const CONTOUR = [
  [0.18, 0.30], [0.34, 0.17], [0.58, 0.14], [0.78, 0.28],
  [0.84, 0.50], [0.70, 0.76], [0.46, 0.86], [0.24, 0.72],
];
const REPERES = [
  { x: 0.34, y: 0.42, nom: 'A' },
  { x: 0.60, y: 0.35, nom: 'B' },
  { x: 0.50, y: 0.68, nom: 'C' },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'integre',
  largeur: REF_W,
  hauteur: REF_H,
  t: 0,               // interpolation réelle du cadre (0 = intégré, 1 = plein)
  cible: 0,
  phase: 0,           // phase de la visite, uniquement dérivée du temps rAF
  playing: false,
  debriefOuvert: false,
  fsActif: false,
  rafId: 0,
  lastTs: 0,
  reduced: false,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  fsBound: false,
  mapRef: null,
  nodes: {},
};

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

function fmt(n, d = 0) {
  if (!Number.isFinite(n)) return '—';
  const v = Math.abs(n) < 0.5 * 10 ** -d ? 0 : n;
  const fixed = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
  const parts = fixed.split('.');
  const groupe = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return parts[1] ? `${groupe},${parts[1]}` : groupe;
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* E076-06 : toutes les grandeurs dérivent du viewBox et du cadre courant. */
function fitView(vw, vh) {
  const scale = Math.min(vw / MAP_W, vh / MAP_H);
  const w = MAP_W * scale;
  const h = MAP_H * scale;
  return {
    scale, w, h,
    barX: Math.max(0, (vw - w) / 2),
    barY: Math.max(0, (vh - h) / 2),
    utile: w * h,
    occupation: (w * h) / (vw * vh),
  };
}

/* E076-06 : le cadre intégré est une hypothèse explicite de laboratoire,
 * jamais une affirmation sur la mise en page réelle de l'hôte. */
function cadreIntegre(vw, vh) {
  return { x: vw * (1 - SIM_W) / 2, y: vh * (1 - SIM_H) / 2, w: vw * SIM_W, h: vh * SIM_H };
}

function cadreCourant(vw, vh) {
  const integre = cadreIntegre(vw, vh);
  const t = S.t;
  const cadre = {
    x: lerp(integre.x, 0, t),
    y: lerp(integre.y, 0, t),
    w: lerp(integre.w, vw, t),
    h: lerp(integre.h, vh, t),
  };
  if (S.mode === 'outils' && t > 0) {
    const barre = OUTILS_H * t;
    cadre.y += barre;
    cadre.h = Math.max(1, cadre.h - barre);
  }
  return cadre;
}

function libelleMode(mode) {
  if (mode === 'plein') return 'plein écran';
  if (mode === 'outils') return 'plein écran avec barre d’outils';
  return 'cadre intégré';
}

/* ---------- E076-01 : feuille de style unique et préfixée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:14px}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${PFX}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${MODE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${MODE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${PFX}-choix{display:inline-flex;align-items:center;gap:5px;min-height:44px;margin-right:8px;padding:2px 6px;cursor:pointer}
#${PANEL_ID} .${PFX}-choix input{min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${PFX}-curseur{width:100%;min-height:44px;accent-color:var(--gold,#e6b96f)}
.${PFX}-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#${CANVAS_ID}{display:block;width:100%;height:270px;margin:8px 0;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.3);touch-action:none}
#${LEGENDE_ID}{font-size:10px;color:var(--muted)}
#${BADGE_ID},#${READOUT_ID}{min-height:30px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums}
#${BADGE_ID}{border-left:4px solid var(--gold,#e6b96f)}
#${BADGE_ID}[data-mode="plein"],#${BADGE_ID}[data-mode="outils"]{border-left-style:dashed}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEBRIEF_ID}[hidden]{display:none}
#${PANEL_ID} button{display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;transition:border-color .18s,background-color .18s}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID}[data-${PFX}-reduced="1"] button{transition:none}

/* E076-05 : sortie de secours quand l'API Fullscreen n'est pas disponible. */
.geo-map.${PFX}-sim-plein{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;z-index:2147483000!important;border-radius:0!important;background:#070a0e!important;overflow:hidden!important}
.geo-map.${PFX}-sim-plein .geo-svg,
.geo-map:fullscreen .geo-svg{width:100%;height:100%;display:block}
#${EXIT_ID}{position:absolute;right:12px;top:12px;z-index:6;min-width:44px;min-height:44px;padding:6px 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(8,12,18,.92);color:var(--gold-bright,#f4d69e);font:inherit;font-size:12px;cursor:pointer}
#${EXIT_ID}:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
@media (prefers-reduced-motion:reduce){#${PANEL_ID} button{transition:none!important;animation:none!important}}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:220px}
  #${PANEL_ID} .${PFX}-choix{margin-right:4px}
}
`;

/* ---------- E076-01 / E076-02 : contenu sémantique, lisible sans animation ---------- */

function faitsStatiques() {
  const wrap = document.createElement('div');
  const textes = [
    'Le plein écran ne change pas la projection : la vue GEOGRAPHIE dessine toujours dans un viewBox de 900 × 620 unités (geography.js:10-11) avec preserveAspectRatio « xMidYMid meet » (geography.js:202). Seul le cadre CSS change ; l’échelle en pixels suit donc le minimum des deux rapports largeur/900 et hauteur/620.',
    `Sur un écran de référence ${fmt(REF_W)} × ${fmt(REF_H)} px, l’échelle vaut ${fmt(720 / MAP_H, 2)} px par unité : la carte occupe ${fmt(MAP_W * REF_SCALE)} × ${fmt(720)} px et il reste ${fmt((REF_W - MAP_W * REF_SCALE) / 2)} px de barre de chaque côté, soit ${fmt(((REF_W - MAP_W * REF_SCALE) / REF_W) * 100, 1)} % de la largeur. La surface utile atteint ${fmt(MAP_W * REF_SCALE * MAP_H * REF_SCALE)} px².`,
    `La vue de base propose déjà des commandes de zoom de ${fmt(CIBLE_RECO)} px et un glisser sur le SVG (geography.js:323-358). Le plein écran doit les conserver : cibles d’au moins ${fmt(CIBLE_MIN)} px (WCAG 2.2 — 2.5.8), idéalement ${fmt(CIBLE_RECO)} px (2.5.5), et sortie au clavier par Échap, sans confier l’information à la seule couleur.`,
  ];
  textes.forEach((texte) => {
    const p = document.createElement('p');
    p.className = `${PFX}-fait`;
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function tableauStatique() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Géométrie du cadre — valeurs calculées depuis le viewBox 900 × 620 et « xMidYMid meet » ; le cadre intégré est une hypothèse de laboratoire (62 % × 58 %), pas une mesure de la page hôte.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Mode', 'Cadre (px)', 'Échelle (px/u)', 'Barres', 'Occupation'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const modes = [
    ['Intégré (hypothèse)', 1280, 720, SIM_W, SIM_H],
    ['Plein écran 16:9', 1280, 720, 1, 1],
    ['Plein écran 16:10', 1280, 800, 1, 1],
    ['Plein écran 1:1', 800, 800, 1, 1],
  ];
  modes.forEach(([nom, vw, vh, fw, fh]) => {
    const f = fitView(vw * fw, vh * fh);
    const barres = f.barX > 0
      ? `${fmt(f.barX)} de chaque côté`
      : (f.barY > 0 ? `${fmt(f.barY)} haut et bas` : 'aucune');
    const cells = [
      nom,
      `${fmt(vw * fw)} × ${fmt(vh * fh)}`,
      fmt(f.scale, 2),
      barres,
      `${fmt(f.occupation * 100, 1)} %`,
    ];
    const tr = document.createElement('tr');
    cells.forEach((valeur, i) => {
      const cellule = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cellule.scope = 'row';
      cellule.textContent = valeur;
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E076-03 / E076-04 / E076-05 / E076-10 : panneau et contrôles ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      integre: document.getElementById(MODE_INTEGRE_ID),
      plein: document.getElementById(MODE_PLEIN_ID),
      outils: document.getElementById(MODE_OUTILS_ID),
      largeur: document.getElementById(LARGEUR_ID),
      largeurOut: document.getElementById(LARGEUR_OUT_ID),
      hauteur: document.getElementById(HAUTEUR_ID),
      hauteurOut: document.getElementById(HAUTEUR_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      badge: document.getElementById(BADGE_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      fs: document.getElementById(FS_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', '');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = ctx.el('h2', '', 'Plein écran de la carte : ce qui change vraiment');
  titre.id = TITLE_ID;
  const intro = ctx.el('p', '', 'Agrandir la carte ne modifie ni la projection ni les données. Ce laboratoire sépare le cadre intégré du cadre plein écran, calcule l’échelle et les barres mortes, et montre comment conserver une sortie et des commandes accessibles.');

  /* E076-05 : choix unique -> fieldset/legend + radios de même nom. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Mode d’affichage (choix unique)';
  fieldset.appendChild(legend);
  [
    ['integre', 'Cadre intégré', MODE_INTEGRE_ID],
    ['plein', 'Plein écran', MODE_PLEIN_ID],
    ['outils', 'Plein écran + outils', MODE_OUTILS_ID],
  ].forEach(([valeur, libelle, id]) => {
    const lab = ctx.el('label', `${PFX}-choix`);
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${PFX}-mode`;
    radio.id = id;
    radio.value = valeur;
    radio.checked = S.mode === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
  });

  /* E076-04 : deux curseurs de viewport, avec valeurs annoncées. */
  const largeurRangee = ctx.el('p', '');
  const largeurLabel = document.createElement('label');
  largeurLabel.setAttribute('for', LARGEUR_ID);
  largeurLabel.appendChild(document.createTextNode('Largeur du cadre : '));
  const largeurOut = ctx.el('span', `${PFX}-valeur`);
  largeurOut.id = LARGEUR_OUT_ID;
  largeurLabel.appendChild(largeurOut);
  largeurRangee.appendChild(largeurLabel);
  const largeur = document.createElement('input');
  largeur.type = 'range';
  largeur.id = LARGEUR_ID;
  largeur.className = `${PFX}-curseur`;
  largeur.min = String(LARGEUR_MIN);
  largeur.max = String(LARGEUR_MAX);
  largeur.step = '8';
  largeur.value = String(S.largeur);
  largeur.setAttribute('aria-label', `Largeur du cadre, de ${LARGEUR_MIN} à ${LARGEUR_MAX} pixels`);

  const hauteurRangee = ctx.el('p', '');
  const hauteurLabel = document.createElement('label');
  hauteurLabel.setAttribute('for', HAUTEUR_ID);
  hauteurLabel.appendChild(document.createTextNode('Hauteur du cadre : '));
  const hauteurOut = ctx.el('span', `${PFX}-valeur`);
  hauteurOut.id = HAUTEUR_OUT_ID;
  hauteurLabel.appendChild(hauteurOut);
  hauteurRangee.appendChild(hauteurLabel);
  const hauteur = document.createElement('input');
  hauteur.type = 'range';
  hauteur.id = HAUTEUR_ID;
  hauteur.className = `${PFX}-curseur`;
  hauteur.min = String(HAUTEUR_MIN);
  hauteur.max = String(HAUTEUR_MAX);
  hauteur.step = '8';
  hauteur.value = String(S.hauteur);
  hauteur.setAttribute('aria-label', `Hauteur du cadre, de ${HAUTEUR_MIN} à ${HAUTEUR_MAX} pixels`);

  /* E076-08 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire du mode plein écran : un cadre de page contient une carte schématique. Flèche droite ou gauche : largeur du cadre ; flèche haut ou bas : hauteur ; Entrée : faire défiler les trois modes ; Origine : revenir à 1280 par 720 pixels et au cadre intégré ; Échap : quitter le plein écran ; Espace : lancer ou arrêter la transition animée. Les hachures et les tirets distinguent les barres mortes et le cadre intégré, indépendamment de la couleur.');

  const legende = ctx.el('p', `${PFX}-legende`, 'Repères sans couleur : hachures = barres mortes ; trait continu = zone de carte utile ; tirets = contour du cadre intégré ; bandeau supérieur = barre d’outils de 44 px. Les valeurs sont aussi écrites en toutes lettres dans le statut.');
  legende.id = LEGENDE_ID;

  const badge = ctx.el('p', '');
  badge.id = BADGE_ID;
  const readout = ctx.el('p', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E076-09 : deux bascules indépendantes -> aria-pressed autorisé. */
  const play = ctx.el('button', '', '▶ Animer la transition');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  const fs = ctx.el('button', '', '⛶ Demander le plein écran réel');
  fs.type = 'button';
  fs.id = FS_ID;
  fs.setAttribute('aria-pressed', 'false');

  /* E076-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer — prédiction : en passant d’un cadre de 1280 × 720 à 2560 × 1440 px, la surface utile de la carte est-elle multipliée par 2 ou par 4 ? Réglage : placez les curseurs sur 1280 × 720, puis sur 2560 × 1440. Résultat attendu : l’échelle double (1,16 → 2,32 px/u) et l’aire est multipliée par 4,00 (752 516 → 3 010 065 px²). Falsification : si vous lisez 2, vous avez multiplié l’échelle au lieu de l’élever au carré.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : l’échelle vaut min(largeur/900 ; hauteur/620). Doubler les deux dimensions du cadre double cette échelle ; la surface étant proportionnelle à l’échelle au carré, elle est multipliée par 2² = 4. Le rapport reste exactement 4,00 ici car le même côté (la hauteur) limite l’ajustement dans les deux cadres. En revanche, passer du cadre intégré hypothétique au plein écran ne multiplie pas l’aire par 4 : à 1280 × 720, le rapport calculé est d’environ 2,97.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(titre, intro, faitsStatiques(), tableauStatique(), fieldset,
    largeurRangee, largeur, hauteurRangee, hauteur, canvas, legende, badge,
    readout, play, fs, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    integre: document.getElementById(MODE_INTEGRE_ID),
    plein: document.getElementById(MODE_PLEIN_ID),
    outils: document.getElementById(MODE_OUTILS_ID),
    largeur, largeurOut, hauteur, hauteurOut,
    canvas, badge, readout, play, fs, debriefBtn, debrief,
  };
}

/* ---------- E076-03 / E076-08 : laboratoire canvas déterministe ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 360;
  const cssH = cv.clientHeight || 270;
  /* DPR plafonné à 2, tampon redimensionné seulement quand c'est nécessaire. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 10;
  const innerW = Math.max(10, cssW - pad * 2 - 56);
  const innerH = Math.max(10, cssH - pad * 2 - 18);
  const k = Math.min(innerW / S.largeur, innerH / S.hauteur);
  const vw = S.largeur * k;
  const vh = S.hauteur * k;
  const vx = pad + 56 + (innerW - vw) / 2;
  const vy = pad + (innerH - vh) / 2;

  /* Espace hors cadre : hachures, jamais une couleur seule. */
  g.save();
  g.strokeStyle = 'rgba(154,147,134,.22)';
  g.lineWidth = 1;
  for (let x = -cssH; x < cssW; x += 9) {
    g.beginPath(); g.moveTo(x, cssH); g.lineTo(x + cssH, 0); g.stroke();
  }
  g.restore();

  /* Cadre intégré en pointillés : repère de départ, visible même en plein écran. */
  const integre = cadreIntegre(S.largeur, S.hauteur);
  g.save();
  g.strokeStyle = 'rgba(154,147,134,.75)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([4, 3]);
  g.strokeRect(vx + integre.x * k, vy + integre.y * k, integre.w * k, integre.h * k);
  g.restore();

  /* Cadre courant (interpolé) : la zone effectivement occupée par la carte. */
  const c = cadreCourant(S.largeur, S.hauteur);
  const cx = vx + c.x * k;
  const cy = vy + c.y * k;
  const cw = Math.max(1, c.w * k);
  const ch = Math.max(1, c.h * k);
  g.fillStyle = 'rgba(8,12,18,.96)';
  g.fillRect(cx, cy, cw, ch);
  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.lineWidth = 1.4;
  g.strokeRect(cx, cy, cw, ch);

  /* Ajuster le viewBox 900 × 620 dans le cadre : barres mortes hachées. */
  const mapScale = Math.min(c.w / MAP_W, c.h / MAP_H);
  const dw = MAP_W * mapScale * k;
  const dh = MAP_H * mapScale * k;
  const dx = cx + (cw - dw) / 2;
  const dy = cy + (ch - dh) / 2;
  const hachure = (x, y, w, h) => {
    if (w < 1 || h < 1) return;
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = 'rgba(230,185,111,.55)';
    g.lineWidth = 1;
    for (let s = -h; s < w + h; s += 7) {
      g.beginPath(); g.moveTo(x + s, y + h); g.lineTo(x + s + h, y); g.stroke();
    }
    g.restore();
  };
  hachure(cx, cy, cw, Math.max(0, dy - cy));
  hachure(cx, dy + dh, cw, Math.max(0, cy + ch - dy - dh));
  hachure(cx, dy, Math.max(0, dx - cx), dh);
  hachure(dx + dw, dy, Math.max(0, cx + cw - dx - dw), dh);

  /* Carte schématique du laboratoire, explicitement non géographique. */
  g.save();
  g.beginPath(); g.rect(dx, dy, dw, dh); g.clip();
  g.fillStyle = 'rgba(214,207,193,.045)';
  g.fillRect(dx, dy, dw, dh);
  g.beginPath();
  CONTOUR.forEach(([px, py], i) => {
    const X = dx + px * dw;
    const Y = dy + py * dh;
    if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
  });
  g.closePath();
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fill();
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.2;
  g.stroke();
  REPERES.forEach((rep) => {
    const X = dx + rep.x * dw;
    const Y = dy + rep.y * dh;
    g.beginPath(); g.arc(X, Y, 4, 0, Math.PI * 2);
    g.fillStyle = '#0b0f15'; g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#fff';
    g.font = 'bold 10px sans-serif';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(rep.nom, X + 7, Y);
  });
  g.restore();

  /* Barre d'outils du mode « outils » : hauteur réelle de 44 px de vue. */
  if (S.mode === 'outils' && S.t > 0.05) {
    const bh2 = OUTILS_H * k * S.t;
    const by = vy + c.y * k;
    g.fillStyle = 'rgba(8,12,18,.98)';
    g.fillRect(cx, by, cw, bh2);
    g.strokeStyle = 'rgba(244,214,158,.9)';
    g.lineWidth = 1;
    g.strokeRect(cx, by, cw, bh2);
    for (let i = 0; i < 3; i += 1) {
      const bx = cx + 8 + i * 16;
      g.strokeStyle = 'rgba(215,209,198,.85)';
      g.strokeRect(bx, by + bh2 / 2 - 4, 9, 8);
    }
    if (cw > 150) {
      g.fillStyle = 'rgba(215,209,198,.9)';
      g.font = '9px sans-serif';
      g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(`Outils ${fmt(OUTILS_H)} px`, cx + cw - 7, by + bh2 / 2);
    }
  }

  /* Étiquettes de mesure : les nombres sont écrits, pas seulement dessinés. */
  g.fillStyle = 'rgba(215,209,198,.92)';
  g.font = '10px sans-serif';
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(`${fmt(S.largeur)} × ${fmt(S.hauteur)} px`, vx, Math.max(11, vy - 4));
  if (cw > 120 && ch > 28) {
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillText(`${libelleMode(S.mode)} — ${fmt(c.w)} × ${fmt(c.h)} px`, cx + 5, cy + ch - 6);
  }
}

/* ---------- E076-06 / E076-07 : lectures et région de statut ---------- */

function mesureReelle() {
  const map = S.mapRef;
  if (!map || typeof map.getBoundingClientRect !== 'function') return '';
  const r = map.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return '';
  return ` Cadre réel mesuré dans la page : ${fmt(r.width)} × ${fmt(r.height)} px (hypothèse 62 % × 58 % non appliquée au rendu).`;
}

function updateBadge() {
  const n = S.nodes.badge;
  if (!n) return;
  n.dataset.mode = S.mode;
  if (S.mode === 'integre') {
    n.textContent = 'Mode intégré : la carte partage la page avec le panneau ; le contour en pointillés du laboratoire montre le cadre de départ (hypothèse 62 % × 58 % de la largeur et de la hauteur).';
  } else if (S.mode === 'plein') {
    n.textContent = 'Mode plein écran : le cadre occupe tout le viewport ; les hachures latérales sont les barres mortes imposées par le viewBox 900 × 620 et l’ajustement « meet ».';
  } else {
    n.textContent = 'Mode plein écran avec outils : une bande de 44 px est réservée aux commandes ; la surface de dessin perd exactement cette hauteur, soit une réduction de ' + fmt(OUTILS_H / S.hauteur * 100, 1) + ' % à la hauteur courante.';
  }
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const plein = fitView(S.largeur, S.hauteur);
  const integre = fitView(S.largeur * SIM_W, S.hauteur * SIM_H);
  const rapport = plein.utile / integre.utile;
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Cadre ${fmt(S.largeur)} × ${fmt(S.hauteur)} px · échelle `));
  n.appendChild(fort(`${fmt(plein.scale, 2)} px/u`));
  n.appendChild(document.createTextNode(' · carte '));
  n.appendChild(fort(`${fmt(plein.w)} × ${fmt(plein.h)} px`));
  n.appendChild(document.createTextNode(' · barres '));
  n.appendChild(fort(plein.barX > 0 ? `${fmt(plein.barX)} px de chaque côté` : (plein.barY > 0 ? `${fmt(plein.barY)} px haut et bas` : 'nulles')));
  n.appendChild(document.createTextNode(' · surface utile '));
  n.appendChild(fort(`${fmt(plein.utile)} px²`));
  n.appendChild(document.createTextNode(` · occupation ${fmt(plein.occupation * 100, 1)} % · plein/intégré = `));
  n.appendChild(fort(fmt(rapport, 2)));
  n.appendChild(document.createTextNode(` · référence 1280 × 720 : ${fmt(REF_SCALE, 2)} px/u et ${fmt(VIEW_AREA * REF_SCALE * REF_SCALE)} px².`));
  n.appendChild(document.createTextNode(mesureReelle()));
}

function syncControls() {
  const n = S.nodes;
  if (n.largeur) n.largeur.value = String(Math.round(S.largeur));
  if (n.hauteur) n.hauteur.value = String(Math.round(S.hauteur));
  if (n.largeurOut) n.largeurOut.textContent = `${fmt(S.largeur)} px`;
  if (n.hauteurOut) n.hauteurOut.textContent = `${fmt(S.hauteur)} px`;
  if (n.integre) n.integre.checked = S.mode === 'integre';
  if (n.plein) n.plein.checked = S.mode === 'plein';
  if (n.outils) n.outils.checked = S.mode === 'outils';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la transition' : '▶ Animer la transition';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.fs) {
    n.fs.textContent = S.fsActif ? '↩ Quitter le plein écran' : '⛶ Demander le plein écran réel';
    n.fs.setAttribute('aria-pressed', S.fsActif ? 'true' : 'false');
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  updateBadge();
  updateReadout();
  drawLab();
}

/* ---------- E076-09 : une seule boucle rAF, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) { cancelAnimationFrame(S.rafId); S.rafId = 0; }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || S.reduced) return;
  if (!S.playing && Math.abs(S.t - S.cible) < 0.002) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || S.reduced) return;
  const dt = S.lastTs ? Math.min(80, ts - S.lastTs) : 16;
  S.lastTs = ts;
  if (S.playing) {
    /* Progression déterministe : aucune valeur aléatoire, horodatage seul. */
    S.phase = (S.phase + dt * 0.00024) % 1;
    S.t = 0.5 - 0.5 * Math.cos(2 * Math.PI * S.phase);
  } else {
    S.t += (S.cible - S.t) * (1 - Math.exp(-dt / 160));
    if (Math.abs(S.cible - S.t) < 0.002) S.t = S.cible;
  }
  syncControls();
  if (S.playing || Math.abs(S.t - S.cible) >= 0.002) S.rafId = requestAnimationFrame(tick);
  else S.lastTs = 0;
}

function changerMode(mode) {
  S.mode = mode;
  S.cible = mode === 'integre' ? 0 : 1;
  if (S.reduced) { S.t = S.cible; syncControls(); }
  else { syncControls(); startLoop(); }
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(`data-${PFX}-reduced`, mq.matches ? '1' : '0');
        if (mq.matches) { S.playing = false; S.t = S.cible; stopLoop(); syncControls(); }
        else startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (typeof document !== 'undefined' && !S.fsBound) {
    S.fsBound = true;
    document.addEventListener('fullscreenchange', () => {
      const plein = !!(typeof document.fullscreenElement !== 'undefined'
        && document.fullscreenElement === S.mapRef);
      S.fsActif = plein;
      S.cible = plein ? 1 : (S.mode === 'integre' ? 0 : 1);
      syncControls();
      if (!S.reduced) startLoop();
    });
  }
}

/* ---------- E076-08 / E076-10 : IntersectionObserver et sobriété ---------- */

function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- E076-05 : plein écran réel, avec repli CSS sans réseau ---------- */

function retirerSortie() {
  const sortie = document.getElementById(EXIT_ID);
  if (sortie && sortie.parentNode) sortie.parentNode.removeChild(sortie);
}

function nettoyerCarte() {
  const map = S.mapRef;
  if (map) {
    map.classList.remove(`${PFX}-sim-plein`);
    retirerSortie();
  }
  if (typeof document !== 'undefined' && document.fullscreenElement
      && document.fullscreenElement === map
      && typeof document.exitFullscreen === 'function') {
    try {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => { /* repli silence */ });
    } catch { /* sortie indisponible : le simple retrait de classe suffit */ }
  }
  S.mapRef = null;
  S.fsActif = false;
}

function poserSortie(map) {
  const sortie = document.getElementById(EXIT_ID);
  if (sortie && sortie.parentNode === map) return;
  retirerSortie();
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.id = EXIT_ID;
  bouton.textContent = '↩ Quitter le plein écran (Échap)';
  bouton.addEventListener('click', () => quitterPleinEcran());
  map.appendChild(bouton);
}

function activerPleinEcran(map) {
  S.mode = 'plein';
  S.cible = 1;
  changerMode(S.mode);
  if (map && typeof map.requestFullscreen === 'function') {
    try {
      const p = map.requestFullscreen();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          /* Refus du navigateur : repli CSS local, aucune ressource externe. */
          if (map) {
            map.classList.add(`${PFX}-sim-plein`);
            poserSortie(map);
            S.fsActif = true;
            syncControls();
          }
        });
      }
      return;
    } catch { /* repli ci-dessous */ }
  }
  if (map) {
    map.classList.add(`${PFX}-sim-plein`);
    poserSortie(map);
    S.fsActif = true;
    syncControls();
  }
}

function quitterPleinEcran() {
  const map = S.mapRef;
  if (map) {
    map.classList.remove(`${PFX}-sim-plein`);
    retirerSortie();
  }
  if (typeof document !== 'undefined' && document.fullscreenElement
      && typeof document.exitFullscreen === 'function') {
    try {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => { /* repli silence */ });
    } catch { /* rien à quitter */ }
  }
  S.fsActif = false;
  changerMode('integre');
}

/* ---------- Point d'entrée ---------- */

register('E076', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function'
    ? !!ctx.reducedMotion()
    : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);

  nettoyerCarte();
  const map = typeof ctx.layout !== 'undefined' && ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout.querySelector('.geo-map')
    : (typeof ctx.stage.querySelector === 'function' ? ctx.stage.querySelector('.geo-map') : null);
  S.mapRef = map || null;

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.setAttribute(`data-${PFX}-reduced`, S.reduced ? '1' : '0');
  if (S.reduced) { S.playing = false; S.t = S.cible; stopLoop(); }
  S.cible = S.mode === 'integre' ? 0 : 1;
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.integre, n.plein, n.outils].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        changerMode(radio.value);
      });
    });
    n.largeur.addEventListener('input', () => {
      S.largeur = clamp(Number(n.largeur.value), LARGEUR_MIN, LARGEUR_MAX);
      syncControls();
    });
    n.hauteur.addEventListener('input', () => {
      S.hauteur = clamp(Number(n.hauteur.value), HAUTEUR_MIN, HAUTEUR_MAX);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) { stopLoop(); S.t = S.cible; }
      else startLoop();
      syncControls();
    });
    n.fs.addEventListener('click', () => {
      if (S.fsActif) quitterPleinEcran();
      else activerPleinEcran(S.mapRef);
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    /* E076-08 : équivalent clavier complet du laboratoire. */
    n.canvas.addEventListener('keydown', (event) => {
      let utilise = true;
      if (event.key === 'ArrowRight') S.largeur = clamp(S.largeur + 64, LARGEUR_MIN, LARGEUR_MAX);
      else if (event.key === 'ArrowLeft') S.largeur = clamp(S.largeur - 64, LARGEUR_MIN, LARGEUR_MAX);
      else if (event.key === 'ArrowDown') S.hauteur = clamp(S.hauteur + 48, HAUTEUR_MIN, HAUTEUR_MAX);
      else if (event.key === 'ArrowUp') S.hauteur = clamp(S.hauteur - 48, HAUTEUR_MIN, HAUTEUR_MAX);
      else if (event.key === 'Home') {
        S.largeur = REF_W; S.hauteur = REF_H; changerMode('integre');
      } else if (event.key === 'Enter') {
        const ordre = ['integre', 'plein', 'outils'];
        changerMode(ordre[(ordre.indexOf(S.mode) + 1) % ordre.length]);
      } else if (event.key === 'Escape') {
        if (S.fsActif) quitterPleinEcran(); else changerMode('integre');
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        S.playing = !S.playing;
        if (!S.playing) { stopLoop(); S.t = S.cible; }
        else startLoop();
      } else utilise = false;
      if (utilise) { event.preventDefault(); event.stopPropagation(); syncControls(); }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing || Math.abs(S.t - S.cible) >= 0.002) startLoop();
});
