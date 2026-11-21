import { register } from './registry.js';

/* Lentille E011 — vue GEOGRAPHIE.
 * Thème : relief et montagnes — représenter le relief sur une carte.
 *
 * Les dix chantiers E011-01 … E011-10 sont réellement implémentés ci-dessous
 * et décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E011.md. Le terrain est un
 * modèle mathématique déterministe (somme de collines gaussiennes), jamais
 * une donnée d'altitude réelle : le badge E011-10 le dit explicitement.
 *
 * Contrat : register('E011', ctx => {...}), ctx = { viewId, stage, layout,
 * css, el, reducedMotion() }. Un seul appel à ctx.css('geography-e011', …),
 * des identifiants préfixés geography-e011-*, aucun appel réseau, aucune
 * graine aléatoire, aucune console, une seule boucle rAF mise en pause sur
 * document.hidden. Le texte pédagogique est du HTML sémantique réel, lisible
 * sans animation ; le canvas n'est qu'un laboratoire.
 */

const CSS_ID = 'geography-e011';
const PANEL_ID = 'geography-e011-panel';
const TITLE_ID = 'geography-e011-title';
const MODE_ID = 'geography-e011-mode';
const INTERVAL_ID = 'geography-e011-interval';
const INTERVAL_OUT_ID = 'geography-e011-interval-value';
const VE_ID = 'geography-e011-ve';
const VE_OUT_ID = 'geography-e011-ve-value';
const CANVAS_ID = 'geography-e011-canvas';
const READOUT_ID = 'geography-e011-readout';
const PLAY_ID = 'geography-e011-play';
const LEGEND_ID = 'geography-e011-legend';
const HELP_ID = 'geography-e011-help';
const BADGE_ID = 'geography-e011-badge';

const N = 41;                 /* grille carrée déterministe 41 × 41 */
const LARGEUR_M = 30000;      /* le laboratoire représente 30 km de large */
const BASE_M = 300;           /* altitude de référence, en mètres */
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const INTERVALLES = [250, 500, 1000]; /* équidischoices, en mètres */

/* E011-02 : six bandes hypsométriques, chacune avec un remplissage et une
 * hachure distincts — l'information n'est jamais portée par la seule couleur. */
const BANDES = [
  { fin: 900, remplissage: 'rgba(110,140,110,.30)', trait: 'rgba(180,205,180,.55)' },
  { fin: 1400, remplissage: 'rgba(140,165,110,.34)', trait: 'rgba(205,215,170,.55)' },
  { fin: 1900, remplissage: 'rgba(180,175,120,.36)', trait: 'rgba(230,220,175,.60)' },
  { fin: 2400, remplissage: 'rgba(190,150,110,.38)', trait: 'rgba(235,205,170,.60)' },
  { fin: 2900, remplissage: 'rgba(175,130,130,.40)', trait: 'rgba(240,195,195,.65)' },
  { fin: Infinity, remplissage: 'rgba(200,180,210,.42)', trait: 'rgba(245,230,245,.70)' },
];

const MODES = {
  contours: 'Courbes de niveau — traits pleins',
  teintes: 'Teintes hypsométriques — hachures',
  ombrage: 'Ombrage — éclairement nord-ouest',
};
const REPERES = {
  contours: 'traits pleins = même altitude ; tirets = ligne de crête',
  teintes: 'hachures horizontales, obliques ou croisées = bande d’altitude',
  ombrage: 'clair = face éclairée, sombre = face à l’ombre ; pas de couleur porteuse',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'contours',
  intervalle: 500,
  ve: 1,
  sweep: 0.35,
  playing: false,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  grille: [],
  hMin: 0,
  hMax: 1,
  penteMax: 0,
  nodes: {},
};

/* ---------- E011-01 à E011-05 : terrain déterministe et mesures ---------- */

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const entier = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* Trois collines et une échancrure : aucune valeur n'est tirée au hasard. */
function relief(nx, ny) {
  const colline = (cx, cy, sx, sy, amp) => amp * Math.exp(
    -(((nx - cx) * (nx - cx)) / (2 * sx * sx) + ((ny - cy) * (ny - cy)) / (2 * sy * sy))
  );
  return BASE_M
    + colline(0.32, 0.38, 0.16, 0.20, 2200)
    + colline(0.68, 0.56, 0.13, 0.17, 1600)
    + colline(0.52, 0.79, 0.10, 0.10, 900)
    - 450 * Math.exp(-((nx - 0.52) * (nx - 0.52)) / (2 * 0.05 * 0.05));
}

function construireGrille() {
  S.grille = [];
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < N; j += 1) {
    const ligne = [];
    for (let i = 0; i < N; i += 1) {
      const h = relief(i / (N - 1), j / (N - 1));
      ligne.push(h);
      if (h < min) min = h;
      if (h > max) max = h;
    }
    S.grille.push(ligne);
  }
  S.hMin = min;
  S.hMax = max;
}

/* Altitude interpolée bilinéairement : sert au profil E011-03. */
function altAt(nx, ny) {
  const px = Math.max(0, Math.min(N - 1.0001, nx * (N - 1)));
  const py = Math.max(0, Math.min(N - 1.0001, ny * (N - 1)));
  const i = Math.floor(px);
  const j = Math.floor(py);
  const tx = px - i;
  const ty = py - j;
  const a = S.grille[j][i];
  const b = S.grille[j][i + 1];
  const c = S.grille[j + 1][i];
  const d = S.grille[j + 1][i + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

/* E011-06 : pente réelle = |∇h|, calculée par différences centrales. */
function gradientAt(nx, ny) {
  const e = 1 / (N - 1);
  const xa = Math.max(0, nx - e);
  const xb = Math.min(1, nx + e);
  const ya = Math.max(0, ny - e);
  const yb = Math.min(1, ny + e);
  const dx = (altAt(xb, ny) - altAt(xa, ny)) / ((xb - xa) * LARGEUR_M);
  const dy = (altAt(nx, yb) - altAt(nx, ya)) / ((yb - ya) * LARGEUR_M);
  return { dx, dy, mag: Math.hypot(dx, dy) };
}

function calculerPenteMax() {
  let max = 0;
  for (let j = 1; j < N - 1; j += 1) {
    for (let i = 1; i < N - 1; i += 1) {
      const g = gradientAt(i / (N - 1), j / (N - 1));
      if (g.mag > max) max = g.mag;
    }
  }
  S.penteMax = Math.atan(max) * DEG;
}

/* E011-05 : ombrage de Lambert, lumière d'azimut 315° à 45° de hauteur. */
function eclairement(nx, ny) {
  const { dx, dy } = gradientAt(nx, ny);
  const norme = Math.hypot(dx, dy, 1);
  const nX = -dx / norme;
  const nY = -dy / norme;
  const nZ = 1 / norme;
  const az = 315 * RAD;
  const ha = 45 * RAD;
  const lX = -Math.cos(az) * Math.cos(ha);
  const lY = Math.sin(az) * Math.cos(ha);
  const lZ = Math.sin(ha);
  const valeur = Math.max(0, Math.min(1, nX * lX + nY * lY + nZ * lZ));
  return 0.24 + 0.76 * valeur;
}

/* E011-07 : nombre de courbes pour une équidistance donnée. */
function nombreCourbes(intervalle) {
  let compte = 0;
  const premiere = Math.ceil(S.hMin / intervalle) * intervalle;
  for (let niveau = premiere; niveau < S.hMax; niveau += intervalle) compte += 1;
  return compte;
}

/* E011-01 : segmentation « marching squares » des isolignes. */
function segmentsDeNiveau(niveau) {
  const segments = [];
  const pas = 1 / (N - 1);
  for (let j = 0; j < N - 1; j += 1) {
    for (let i = 0; i < N - 1; i += 1) {
      const x0 = i * pas;
      const x1 = (i + 1) * pas;
      const y0 = j * pas;
      const y1 = (j + 1) * pas;
      const v = [S.grille[j][i], S.grille[j][i + 1], S.grille[j + 1][i + 1], S.grille[j + 1][i]];
      const pos = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const croisements = [];
      for (let e = 0; e < 4; e += 1) {
        const a = v[e];
        const b = v[(e + 1) % 4];
        if ((a < niveau && b >= niveau) || (b < niveau && a >= niveau)) {
          const t = (niveau - a) / (b - a);
          croisements.push([
            pos[e][0] + (pos[(e + 1) % 4][0] - pos[e][0]) * t,
            pos[e][1] + (pos[(e + 1) % 4][1] - pos[e][1]) * t,
          ]);
        }
      }
      if (croisements.length === 2) segments.push([croisements[0], croisements[1]]);
      else if (croisements.length === 4) {
        segments.push([croisements[0], croisements[1]]);
        segments.push([croisements[2], croisements[3]]);
      }
    }
  }
  return segments;
}

/* E011-08 : une cellule est une crête si son altitude dépasse ses quatre
 * voisins ; un thalweg si elle est plus basse. Test déterministe, sans hasard. */
function estCrete(i, j) {
  if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) return false;
  const h = S.grille[j][i];
  return h > S.grille[j][i - 1] && h > S.grille[j][i + 1]
    && h > S.grille[j - 1][i] && h > S.grille[j + 1][i];
}

/* ---------- Feuille de style unique ---------- */

const CSS = `
#geography-e011-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e011-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e011-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e011-panel p{margin:5px 0;max-width:68ch}
#geography-e011-panel .geography-e011-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e011-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#geography-e011-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e011-table th,#geography-e011-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e011-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e011-mode{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e011-mode legend{padding:0 4px;color:var(--muted)}
#geography-e011-panel .geography-e011-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e011-panel .geography-e011-choix input{
  min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f);
}
#geography-e011-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
.geography-e011-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e011-canvas{
  display:block;width:100%;height:300px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e011-legend,#geography-e011-help{font-size:10px;color:var(--muted)}
#geography-e011-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e011-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e011-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e011-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e011-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e011-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e011-panel[data-geography-e011-reduced="1"] button,
.geography-e011-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e011-panel button,.geography-e011-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e011-panel{font-size:10px;padding:9px}
  #geography-e011-canvas{height:260px}
  #geography-e011-panel .geography-e011-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau : texte sémantique, lisible sans JS ---------- */

function faitsStatiques() {
  const conteneur = document.createElement('div');
  const textes = [
    'Une courbe de niveau relie les points de même altitude ; l’écart vertical entre deux courbes consécutives est l’équidistance.',
    'Les teintes hypsométriques colorent des bandes d’altitude ; la convention cartographique veut qu’un repère non coloré (hachures ou courbes) accompagne toujours la couleur.',
    'Un ombrage suit l’angle entre la normale du terrain et la direction de la lumière ; l’exagération verticale V d’un profil transforme la pente apparente en atan(V × tan(pente réelle)).',
  ];
  textes.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e011-fait';
    p.textContent = texte;
    conteneur.appendChild(p);
  });
  return conteneur;
}

function tableauStatique() {
  const table = document.createElement('table');
  table.id = 'geography-e011-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Trois représentations du relief : aucune ne suffit seule (référence : la carte topographique).';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Mode', 'Ce qu’il montre', 'Repère non coloré'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  [
    ['Courbes de niveau', 'Altitude exacte et forme des pentes', 'Traits pleins, crêtes en tirets'],
    ['Teintes hypsométriques', 'Bandes d’altitude d’un coup d’œil', 'Hachures horizontales, obliques, croisées'],
    ['Ombrage', 'Orientation des versants et relief visuel', 'Clair/sombre, sans dépendre d’une teinte'],
  ].forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((texte, index) => {
      const cellule = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cellule.scope = 'row';
      cellule.textContent = texte;
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: [
        document.getElementById('geography-e011-mode-contours'),
        document.getElementById('geography-e011-mode-teintes'),
        document.getElementById('geography-e011-mode-ombrage'),
      ],
      intervalle: document.getElementById(INTERVAL_ID),
      intervalOut: document.getElementById(INTERVAL_OUT_ID),
      ve: document.getElementById(VE_ID),
      veOut: document.getElementById(VE_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e011-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = ctx.el('h2', '', 'Relief et montagnes : représenter l’altitude');
  titre.id = TITLE_ID;
  const intro = ctx.el('p', '', 'Une carte ne montre jamais le relief tel quel : elle choisit des courbes, des bandes de couleur ou un ombrage. Ce laboratoire compare ces trois choix sur un terrain mathématique déterministe.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  const legende = document.createElement('legend');
  legende.textContent = 'Représentation du relief (choix unique)';
  fieldset.appendChild(legende);
  [['contours', 'Courbes de niveau'], ['teintes', 'Teintes hypsométriques'], ['ombrage', 'Ombrage']].forEach(([valeur, libelle]) => {
    const lab = ctx.el('label', 'geography-e011-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e011-mode';
    radio.id = `geography-e011-mode-${valeur}`;
    radio.value = valeur;
    radio.checked = S.mode === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
  });

  const sousTitre = ctx.el('h3', '', 'Observer les mesures');
  const intervalRow = ctx.el('p', '');
  const intervalLabel = document.createElement('label');
  intervalLabel.setAttribute('for', INTERVAL_ID);
  intervalLabel.appendChild(document.createTextNode('Équidistance : '));
  const intervalOut = document.createElement('span');
  intervalOut.id = INTERVAL_OUT_ID;
  intervalOut.className = 'geography-e011-valeur';
  intervalLabel.appendChild(intervalOut);
  intervalRow.appendChild(intervalLabel);
  const intervalle = document.createElement('input');
  intervalle.type = 'range';
  intervalle.id = INTERVAL_ID;
  intervalle.min = '1';
  intervalle.max = '3';
  intervalle.step = '1';
  intervalle.value = String(INTERVALLES.indexOf(S.intervalle) + 1);
  intervalle.setAttribute('aria-label', 'Équidistance des courbes : 1 pour 250 mètres, 2 pour 500 mètres, 3 pour 1000 mètres');
  intervalRow.appendChild(intervalle);

  const veRow = ctx.el('p', '');
  const veLabel = document.createElement('label');
  veLabel.setAttribute('for', VE_ID);
  veLabel.appendChild(document.createTextNode('Exagération verticale du profil : '));
  const veOut = document.createElement('span');
  veOut.id = VE_OUT_ID;
  veOut.className = 'geography-e011-valeur';
  veLabel.appendChild(veOut);
  veRow.appendChild(veLabel);
  const ve = document.createElement('input');
  ve.type = 'range';
  ve.id = VE_ID;
  ve.min = '1';
  ve.max = '3';
  ve.step = '1';
  ve.value = String(S.ve);
  ve.setAttribute('aria-label', 'Exagération verticale du profil, de 1 à 3');
  veRow.appendChild(ve);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', HELP_ID);
  canvas.setAttribute('aria-label', 'Laboratoire de relief : terrain, courbes de niveau et profil. Flèches gauche et droite : changer de representation ; flèches haut et bas : changer l’équidistance ; PageUp et PageDown : changer l’exagération verticale.');

  const legendeTexte = ctx.el('p', 'geography-e011-legend', REPERES[S.mode]);
  legendeTexte.id = LEGEND_ID;
  const aide = ctx.el('p', 'geography-e011-help', 'Clavier : ← → representation, ↑ ↓ équidistance, PageUp/PageDown exagération verticale ; le bouton anime le balayage du profil.');
  aide.id = HELP_ID;

  const readout = ctx.el('p', 'geography-e011-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(titre, intro, faitsStatiques(), tableauStatique(), fieldset, sousTitre, intervalRow, veRow, canvas, legendeTexte, aide, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host) : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    radios: [
      document.getElementById('geography-e011-mode-contours'),
      document.getElementById('geography-e011-mode-teintes'),
      document.getElementById('geography-e011-mode-ombrage'),
    ],
    intervalle,
    intervalOut,
    ve,
    veOut,
    canvas,
    readout,
    play,
    legend: legendeTexte,
  };
}

/* ---------- E011-01/02/03/05/08 : dessin du laboratoire ---------- */

function dessinerTerrain(g, x, y, w, h) {
  const px = (nx, ny) => [x + nx * w, y + ny * h];
  const pasI = w / (N - 1);
  const pasJ = h / (N - 1);

  if (S.mode === 'ombrage') {
    for (let j = 0; j < N - 1; j += 1) {
      for (let i = 0; i < N - 1; i += 1) {
        const v = eclairement((i + 0.5) / (N - 1), (j + 0.5) / (N - 1));
        const c = Math.round(40 + v * 190);
        g.fillStyle = `rgb(${c},${c},${Math.min(255, c + 12)})`;
        g.fillRect(x + i * pasI, y + j * pasJ, pasI + 1, pasJ + 1);
      }
    }
    return;
  }

  if (S.mode === 'teintes') {
    for (let j = 0; j < N - 1; j += 1) {
      for (let i = 0; i < N - 1; i += 1) {
        const alt = S.grille[j][i];
        let bande = 0;
        while (bande < BANDES.length - 1 && alt >= BANDES[bande].fin) bande += 1;
        const cx = x + i * pasI;
        const cy = y + j * pasJ;
        g.fillStyle = BANDES[bande].remplissage;
        g.fillRect(cx, cy, pasI + 1, pasJ + 1);
        /* Hachure distinctive par bande : l'altitude ne dépend pas de la couleur. */
        if (bande > 0) {
          g.strokeStyle = BANDES[bande].trait;
          g.lineWidth = 1;
          g.beginPath();
          if (bande % 3 === 1) { g.moveTo(cx, cy + pasJ / 2); g.lineTo(cx + pasI, cy + pasJ / 2); }
          else if (bande % 3 === 2) { g.moveTo(cx, cy + pasJ); g.lineTo(cx + pasI, cy); }
          else { g.moveTo(cx, cy); g.lineTo(cx + pasI, cy + pasJ); g.moveTo(cx, cy + pasJ); g.lineTo(cx + pasI, cy); }
          g.stroke();
        }
      }
    }
    /* E011-02 : repères de bandes écrits, indépendants de la teinte. */
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '9px sans-serif';
    BANDES.forEach((bande, index) => {
      const bas = index === 0 ? S.hMin : bande.fin;
      if (bas > S.hMax) return;
      const ny = 1 - (bas - S.hMin) / (S.hMax - S.hMin);
      if (ny >= 0 && ny <= 1) g.fillText(`${entier(bas)} m`, x + 2, y + Math.max(9, ny * h - 2));
    });
    return;
  }

  /* E011-01 : courbes de niveau, traits pleins. */
  g.fillStyle = 'rgba(120,150,135,.18)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(214,207,193,.78)';
  g.lineWidth = 1;
  g.setLineDash([]);
  const premiere = Math.ceil(S.hMin / S.intervalle) * S.intervalle;
  for (let niveau = premiere; niveau < S.hMax; niveau += S.intervalle) {
    const segments = segmentsDeNiveau(niveau);
    g.beginPath();
    segments.forEach((seg) => {
      const a = px(seg[0][0], seg[0][1]);
      const b = px(seg[1][0], seg[1][1]);
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
    });
    g.stroke();
  }
  /* E011-08 : crêtes repérées en tirets, distinctes des courbes pleines. */
  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.setLineDash([4, 3]);
  g.beginPath();
  for (let j = 1; j < N - 1; j += 1) {
    for (let i = 1; i < N - 1; i += 1) {
      if (!estCrete(i, j)) continue;
      const c = px(i / (N - 1), j / (N - 1));
      g.moveTo(c[0] - 4, c[1] - 4);
      g.lineTo(c[0] + 4, c[1] + 4);
      g.moveTo(c[0] - 4, c[1] + 4);
      g.lineTo(c[0] + 4, c[1] - 4);
    }
  }
  g.stroke();
  g.setLineDash([]);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 340;
  const cssH = cv.clientHeight || 300;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const terrainH = Math.round((cssH - pad * 2) * 0.58);
  const profTop = pad + terrainH + 12;
  const profH = Math.max(24, cssH - pad - profTop);

  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad, iw, terrainH);

  dessinerTerrain(g, pad, pad, iw, terrainH);

  /* E011-09 : ligne de balayage, position déterministe = f(S.sweep). */
  const ny = 0.12 + S.sweep * 0.76;
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(pad, pad + ny * terrainH);
  g.lineTo(pad + iw, pad + ny * terrainH);
  g.stroke();
  g.setLineDash([]);

  /* E011-03 : profil transversal, échelle horizontale réelle × exagération. */
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.strokeRect(pad, profTop, iw, profH);
  const ligne = profTop + profH - 6;
  const pxParM = iw / LARGEUR_M;
  g.strokeStyle = 'rgba(255,255,255,.28)';
  g.beginPath();
  g.moveTo(pad, ligne);
  g.lineTo(pad + iw, ligne);
  g.stroke();
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  let sommetX = pad;
  let sommetY = ligne;
  for (let i = 0; i <= 80; i += 1) {
    const nx = i / 80;
    const alt = altAt(nx, ny);
    const yy = ligne - (alt - S.hMin) * pxParM * S.ve;
    const xx = pad + nx * iw;
    if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    if (yy < sommetY) { sommetY = yy; sommetX = xx; }
  }
  g.stroke();
  g.beginPath();
  g.moveTo(sommetX - 5, sommetY);
  g.lineTo(sommetX + 5, sommetY);
  g.moveTo(sommetX, sommetY - 5);
  g.lineTo(sommetX, sommetY + 5);
  g.stroke();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(MODES[S.mode], pad + 2, pad + 12);
  g.fillText(`Profil · exagération ×${S.ve}`, pad + 2, profTop + 12);
  g.fillStyle = 'rgba(214,207,193,.8)';
  g.font = '9px sans-serif';
  g.fillText(`référence : ${entier(S.hMin)} m (point le plus bas)`, pad + 2, cssH - pad - 2);
}

/* ---------- E011-04/06/07 : mesure lisible et annoncée ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const apparent = Math.atan(S.ve * Math.tan(S.penteMax * RAD)) * DEG;
  const reference = Math.atan(S.ve * Math.tan(30 * RAD)) * DEG;
  const relief = S.hMax - S.hMin;
  n.textContent = '';
  n.appendChild(document.createTextNode(`Équidistance ${entier(S.intervalle)} m · `));
  n.appendChild(fort(`${nombreCourbes(S.intervalle)} courbes`));
  n.appendChild(document.createTextNode(` visibles ; relief total ${entier(relief)} m (référence : 0 m au point le plus bas). Pente maximale `));
  n.appendChild(fort(`${fmt(S.penteMax)}°`));
  n.appendChild(document.createTextNode(`, soit en apparent avec une exagération ×${S.ve} : `));
  n.appendChild(fort(`${fmt(apparent)}°`));
  n.appendChild(document.createTextNode(`. À titre de comparaison, une pente réelle de 30° donne ${fmt(reference)}° à cette même exagération.`));
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio) => {
    if (radio) radio.checked = radio.value === S.mode;
  });
  if (n.intervalle) n.intervalle.value = String(INTERVALLES.indexOf(S.intervalle) + 1);
  if (n.intervalOut) n.intervalOut.textContent = `${entier(S.intervalle)} m`;
  if (n.ve) n.ve.value = String(S.ve);
  if (n.veOut) n.veOut.textContent = `×${S.ve}`;
  if (n.legend) n.legend.textContent = `${MODES[S.mode]} · ${REPERES[S.mode]}`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E011-09 : une seule boucle rAF, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00009) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE011Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- E011-10 : honnêteté du badge sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e011-badge', 'Relief schématique : terrain mathématique déterministe, aucune altitude réelle. Le laboratoire illustre les méthodes de représentation.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

construireGrille();
calculerPenteMax();

register('E011', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE011Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.mode = radio.value;
        syncControls();
      });
    });
    n.intervalle.addEventListener('input', () => {
      const i = Math.max(1, Math.min(3, Math.round(Number(n.intervalle.value))));
      S.intervalle = INTERVALLES[i - 1];
      syncControls();
    });
    n.ve.addEventListener('input', () => {
      S.ve = Math.max(1, Math.min(3, Math.round(Number(n.ve.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let utilise = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const ordre = ['contours', 'teintes', 'ombrage'];
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        const i = ordre.indexOf(S.mode);
        S.mode = ordre[(i + pas + ordre.length) % ordre.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 1 : -1;
        const i = INTERVALLES.indexOf(S.intervalle);
        S.intervalle = INTERVALLES[Math.max(0, Math.min(INTERVALLES.length - 1, i + pas))];
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        S.ve = Math.max(1, Math.min(3, S.ve + (event.key === 'PageUp' ? 1 : -1)));
      } else {
        utilise = false;
      }
      if (utilise) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing) startLoop();
});
