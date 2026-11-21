import { register } from './registry.js';

/* Lentille E047 — vue GEOGRAPHIE.
 * Thème : états de survol des marqueurs.
 *
 * Les dix chantiers E047-01 … E047-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E047.md. Tout est local : aucune requête
 * réseau, aucune valeur aléatoire, aucune sortie console, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (titres, paragraphes, tableau, définitions) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre des états de
 * marqueurs et des formules déterministes tirées de la vue réelle.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e047';
const PANEL_ID = 'geography-e047-panel';
const TITLE_ID = 'geography-e047-title';
const TABLE_ID = 'geography-e047-table';
const MODAL_ID = 'geography-e047-modal';
const MODAL_SOURIS_ID = 'geography-e047-modal-souris';
const MODAL_CLAVIER_ID = 'geography-e047-modal-clavier';
const MODAL_TACTILE_ID = 'geography-e047-modal-tactile';
const BASE_ID = 'geography-e047-base';
const BASE_OUT_ID = 'geography-e047-base-value';
const HOVER_ID = 'geography-e047-hover';
const HOVER_OUT_ID = 'geography-e047-hover-value';
const CANVAS_ID = 'geography-e047-canvas';
const LEGEND_ID = 'geography-e047-legend';
const BADGE_ID = 'geography-e047-badge';
const READOUT_ID = 'geography-e047-readout';
const PLAY_ID = 'geography-e047-play';
const DEFI_ID = 'geography-e047-defi';
const DEBRIEF_ID = 'geography-e047-debrief';
const DEBRIEF_BTN_ID = 'geography-e047-debrief-btn';

/* Grandeurs de référence, toutes traçables dans la vue réelle.
 * geography.js : rayon visible 4 (repos) / 7 (actif), rayon de capture 14 ;
 * styles.css + geography.js : trait 1,4 (repos), 2,5 (focus), remplissage or
 * pour l'actif. WCAG 2.2 : 24 px minimum (2.5.8), 44 px recommandé (2.5.5). */
const R_REPOS_REF = 4;
const R_ACTIF_REF = 7;
const R_HIT = 14;
const TRAIT_REPOS = 1.4;
const TRAIT_FOCUS = 2.5;
const CIBLE_MIN = 24;
const CIBLE_RECO = 44;
const BASE_MIN = 2;
const BASE_MAX = 8;
const HOVER_MIN = 3;
const HOVER_MAX = 12;

/* Positions écran fixes des marqueurs du laboratoire (aucun aléa). */
const MARQUEURS = [
  { x: 0.24, y: 0.34, nom: 'A' },
  { x: 0.58, y: 0.26, nom: 'B' },
  { x: 0.40, y: 0.62, nom: 'C' },
  { x: 0.76, y: 0.58, nom: 'D' },
];
const ACTIF_INDEX = 1;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  base: R_REPOS_REF,
  hover: R_ACTIF_REF,
  modalite: 'souris',
  indexSurvol: 0,
  playing: false,
  debriefOuvert: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const carre = (n) => n * n;

/* E047-04 — le rayon de survol ne peut pas être plus petit que le repos. */
function rayonsCoherents(base, hover) {
  return { base: clamp(base, BASE_MIN, BASE_MAX), hover: clamp(Math.max(hover, base), HOVER_MIN, HOVER_MAX) };
}

/* E047-06 — rapports de surfaces : (rayon/rayon)², références traçables. */
function surfaces(base, hover) {
  return {
    survolSurRepos: carre(hover) / carre(base),
    refSurvolSurRepos: carre(R_ACTIF_REF) / carre(R_REPOS_REF),
    captureSurVisible: carre(R_HIT) / carre(base),
    refCaptureSurVisible: carre(R_HIT) / carre(R_REPOS_REF),
    diametreCapture: 2 * R_HIT,
    traitFocusSurRepos: TRAIT_FOCUS / TRAIT_REPOS,
  };
}

/* E047-02 / E047-05 — l'état d'un marqueur dépend de la modalité de pointage.
 * `index` parcourt les marqueurs ; `courant` est l'index désigné (survol à la
 * souris, focus au clavier) ; au tactile, survol et focus ne persistent pas. */
function etatMarqueur(index, courant, modalite) {
  const actif = index === ACTIF_INDEX;
  const designe = index === courant;
  if (modalite === 'souris') {
    if (actif && designe) return 'actif-survol';
    if (designe) return 'survol';
    if (actif) return 'actif';
    return 'repos';
  }
  if (modalite === 'clavier') {
    if (actif && designe) return 'actif-focus';
    if (designe) return 'focus';
    if (actif) return 'actif';
    return 'repos';
  }
  return actif ? 'actif' : 'repos';
}

/* Propriétés visuelles d'un état — le style et le glyphe, pas la seule
 * couleur, portent l'information (E047-08). */
function visuelEtat(etat, base, hover) {
  switch (etat) {
    case 'repos':
      return { r: base, trait: TRAIT_REPOS, plein: false, halo: false, glyphe: '' };
    case 'survol':
      return { r: hover, trait: TRAIT_REPOS + 1.2, plein: false, halo: true, glyphe: '▸' };
    case 'focus':
      return { r: base, trait: TRAIT_FOCUS, plein: false, halo: true, glyphe: '⊕' };
    case 'actif':
      return { r: Math.max(base, hover), trait: TRAIT_FOCUS, plein: true, halo: false, glyphe: '' };
    case 'actif-survol':
      return { r: hover + 2, trait: TRAIT_FOCUS + 0.3, plein: true, halo: true, glyphe: '▸' };
    case 'actif-focus':
      return { r: Math.max(base, hover) + 1, trait: TRAIT_FOCUS + 0.5, plein: true, halo: true, glyphe: '⊕' };
    default:
      return { r: base, trait: TRAIT_REPOS, plein: false, halo: false, glyphe: '' };
  }
}

const LIBELLE_ETAT = {
  repos: 'repos',
  survol: 'survol',
  focus: 'focus clavier',
  actif: 'actif',
  'actif-survol': 'actif et survolé',
  'actif-focus': 'actif et focalisé',
};

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e047-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e047-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e047-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e047-panel p{margin:5px 0;max-width:68ch}
#geography-e047-panel .geography-e047-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e047-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e047-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e047-table th,#geography-e047-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e047-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e047-modal{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e047-modal legend{padding:0 4px;color:var(--muted)}
#geography-e047-panel .geography-e047-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:44px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e047-panel .geography-e047-choix input{min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f)}
#geography-e047-panel input[type="range"]{width:100%;min-height:44px;accent-color:var(--gold,#e6b96f)}
.geography-e047-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e047-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e047-legend{font-size:10px;color:var(--muted)}
#geography-e047-readout,#geography-e047-badge,#geography-e047-debrief{
  min-height:30px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e047-badge[data-modalite="souris"]{border-left:4px solid var(--gold,#e6b96f)}
#geography-e047-badge[data-modalite="clavier"]{border-left:4px solid var(--muted,#9a9386)}
#geography-e047-badge[data-modalite="tactile"]{border-left:4px dashed var(--muted,#9a9386)}
#geography-e047-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e047-debrief[hidden]{display:none}
#geography-e047-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e047-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e047-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e047-panel[data-geography-e047-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e047-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e047-panel{font-size:10px;padding:9px}
  #geography-e047-canvas{height:210px}
  #geography-e047-panel .geography-e047-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans animation ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un marqueur de carte n’a pas un aspect unique : il passe par plusieurs états — repos, survol, focus clavier et actif — qui se combinent. Chaque état est défini par un déclencheur, un trait, un rayon et un attribut ARIA, jamais par la seule couleur.',
    'Dans la vue GEOGRAPHIE, le disque visible mesure 4 pixels de rayon au repos et 7 pixels quand le lieu est actif ; un cercle transparent de 14 pixels de rayon élargit la zone de capture. La surface cliquable est donc (14/4)² ≈ 12,25 fois la surface visible.',
    'Le survol n’existe pas au doigt : sur tactile, ce sont le focus et l’état actif qui portent l’information. Une cible doit mesurer au moins 24 px (WCAG 2.2) et, idéalement, 44 px ; ici le diamètre de capture vaut 28 px.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e047-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'États d’un marqueur — valeurs relevées dans geography.js et styles.css de la vue réelle.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['État', 'Déclencheur', 'Rayon visible', 'Trait', 'Repère sans couleur'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Repos', 'Aucun pointeur', '4 px', '1,4 px plein', 'disque fin'],
    ['Survol', 'Pointeur dessus', '7 px', '2,6 px + halo', 'triangle ▸'],
    ['Focus clavier', 'Tabulation', '4 px', '2,5 px + halo', 'croix ⊕'],
    ['Actif', 'Lieu sélectionné', '7 px', '2,5 px plein', 'disque plein'],
    ['Capture', 'Zone de clic', '14 px', 'tirets', 'cercle en pointillé'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
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

/* ---------- E047-01 / E047-05 / E047-09 : panneau et contrôles ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      souris: document.getElementById(MODAL_SOURIS_ID),
      clavier: document.getElementById(MODAL_CLAVIER_ID),
      tactile: document.getElementById(MODAL_TACTILE_ID),
      base: document.getElementById(BASE_ID),
      hover: document.getElementById(HOVER_ID),
      baseOut: document.getElementById(BASE_OUT_ID),
      hoverOut: document.getElementById(HOVER_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      badge: document.getElementById(BADGE_ID),
      play: document.getElementById(PLAY_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e047-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Anatomie d’un survol : les états du marqueur');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un marqueur réagit au pointeur, au clavier et à la sélection. Ce laboratoire isole chaque état, montre la zone de capture et recalcule les surfaces depuis le rayon, afin de distinguer ce qui change vraiment d’un simple effet de couleur.');

  /* E047-05 : choix unique -> fieldset/legend + radios de même nom. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = MODAL_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Modalité de pointage (choix unique)';
  fieldset.appendChild(legend);
  [
    ['souris', 'Souris — survol', MODAL_SOURIS_ID],
    ['clavier', 'Clavier — focus', MODAL_CLAVIER_ID],
    ['tactile', 'Tactile — pas de survol', MODAL_TACTILE_ID],
  ].forEach(([value, label, id]) => {
    const lab = ctx.el('label', 'geography-e047-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e047-modal';
    radio.id = id;
    radio.value = value;
    radio.checked = S.modalite === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  /* E047-03 / E047-04 : curseurs de rayon (repos et survol). */
  const baseRow = ctx.el('p', '');
  const baseLabel = document.createElement('label');
  baseLabel.setAttribute('for', BASE_ID);
  baseLabel.appendChild(document.createTextNode('Rayon au repos : '));
  const baseOut = ctx.el('span', 'geography-e047-value');
  baseOut.id = BASE_OUT_ID;
  baseLabel.appendChild(baseOut);
  baseRow.appendChild(baseLabel);
  const base = document.createElement('input');
  base.type = 'range';
  base.id = BASE_ID;
  base.min = String(BASE_MIN);
  base.max = String(BASE_MAX);
  base.step = '1';
  base.value = String(S.base);
  base.setAttribute('aria-label', `Rayon visible au repos, de ${BASE_MIN} à ${BASE_MAX} pixels`);

  const hoverRow = ctx.el('p', '');
  const hoverLabel = document.createElement('label');
  hoverLabel.setAttribute('for', HOVER_ID);
  hoverLabel.appendChild(document.createTextNode('Rayon au survol : '));
  const hoverOut = ctx.el('span', 'geography-e047-value');
  hoverOut.id = HOVER_OUT_ID;
  hoverLabel.appendChild(hoverOut);
  hoverRow.appendChild(hoverLabel);
  const hover = document.createElement('input');
  hover.type = 'range';
  hover.id = HOVER_ID;
  hover.min = String(HOVER_MIN);
  hover.max = String(HOVER_MAX);
  hover.step = '1';
  hover.value = String(S.hover);
  hover.setAttribute('aria-label', `Rayon visible au survol, de ${HOVER_MIN} à ${HOVER_MAX} pixels`);

  /* E047-08 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire des états de marqueurs : quatre pastilles A, B, C et D sur un fond de carte. La pastille B est active (disque plein). Flèche droite ou bas : désigner le marqueur suivant ; Flèche gauche ou haut : le précédent ; Entrée : basculer la modalité de pointage ; Origine : revenir au premier marqueur. Le rayon, le trait et le glyphe distinguent repos, survol, focus et actif, indépendamment de la couleur.');

  const legendText = ctx.el('p', 'geography-e047-legend', 'Repères : cercle en tirets = zone de capture (rayon 14) ; disque fin = repos ; triangle ▸ = survol ; croix ⊕ = focus ; disque plein = actif. Le style de trait et le glyphe portent l’information, pas la couleur.');
  legendText.id = LEGEND_ID;

  const badge = ctx.el('p', '', '');
  badge.id = BADGE_ID;
  const readout = ctx.el('p', 'geography-e047-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E047-09 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter la visite' : '▶ Animer la visite');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  /* E047-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer : prédiction — en passant du rayon 4 au rayon 7, la surface visible est-elle multipliée par 1,75 ou par 3,06 ? Réglage — placez les curseurs sur 4 et 7. Résultat attendu — le rapport (7/4)² vaut environ 3,06. Falsification — si votre calcul donne 1,75, vous avez multiplié les rayons au lieu des surfaces.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : la surface d’un disque est πr², donc le rapport est (7/4)² = 3,0625 ≈ 3,06, pas 7/4 = 1,75. Le rayon de capture 14 donne (14/4)² = 12,25 : la zone cliquable est plus de douze fois la zone visible. C’est cette marge, et non la couleur, qui rend le marqueur attrapable.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, baseRow, base, hoverRow, hover, canvas, legendText, badge, readout, play, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  S.scope = host;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    souris: document.getElementById(MODAL_SOURIS_ID),
    clavier: document.getElementById(MODAL_CLAVIER_ID),
    tactile: document.getElementById(MODAL_TACTILE_ID),
    base, hover, baseOut, hoverOut,
    canvas, readout, badge, play, debriefBtn, debrief, legend: legendText,
  };
}

/* ---------- E047-03 / E047-06 / E047-08 : laboratoire sur canvas ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  /* DPR plafonné à 2 (E047-09). */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 12;
  const w = Math.max(10, cssW - pad * 2);
  const h = Math.max(10, cssH - pad * 2);

  /* Fond de carte : quadrillage déterministe, jamais de coordonnée fabriquée. */
  g.fillStyle = 'rgba(214,207,193,.035)';
  g.fillRect(pad, pad, w, h);
  g.strokeStyle = 'rgba(214,207,193,.12)';
  g.lineWidth = 1;
  for (let k = 1; k < 6; k += 1) {
    const gx = pad + (w * k) / 6;
    g.beginPath(); g.moveTo(gx, pad); g.lineTo(gx, pad + h); g.stroke();
  }
  for (let k = 1; k < 4; k += 1) {
    const gy = pad + (h * k) / 4;
    g.beginPath(); g.moveTo(pad, gy); g.lineTo(pad + w, gy); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.25)';
  g.strokeRect(pad, pad, w, h);

  MARQUEURS.forEach((m, index) => {
    const cx = pad + m.x * w;
    const cy = pad + m.y * h;
    const etat = etatMarqueur(index, S.indexSurvol, S.modalite);
    const v = visuelEtat(etat, S.base, S.hover);
    const echelle = Math.min(1, w / 320);
    const rayon = v.r * (0.85 + echelle * 0.5);

    /* Zone de capture : cercle en tirets, même rayon relatif pour tous. */
    g.save();
    g.strokeStyle = 'rgba(154,147,134,.55)';
    g.lineWidth = 1;
    if (g.setLineDash) g.setLineDash([3, 3]);
    g.beginPath(); g.arc(cx, cy, R_HIT * (0.85 + echelle * 0.5), 0, Math.PI * 2); g.stroke();
    g.restore();

    /* Halo de survol/focus : anneau extérieur distinct du trait. */
    if (v.halo) {
      g.save();
      g.strokeStyle = 'rgba(244,214,158,.5)';
      g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, rayon + 6, 0, Math.PI * 2); g.stroke();
      g.restore();
    }

    /* Disque principal : plein pour l'actif, creux sinon. */
    g.beginPath(); g.arc(cx, cy, rayon, 0, Math.PI * 2);
    g.fillStyle = v.plein ? 'rgba(244,214,158,.95)' : 'rgba(11,15,21,.95)';
    g.fill();
    g.lineWidth = v.trait;
    g.strokeStyle = v.plein ? '#ffffff' : 'rgba(244,214,158,.85)';
    g.stroke();

    /* Glyphe de modalité, au-dessus du disque. */
    if (v.glyphe) {
      g.fillStyle = '#ffffff';
      g.font = 'bold 11px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(v.glyphe, cx, cy + 0.5);
    }

    /* Étiquette du marqueur. */
    g.fillStyle = 'rgba(215,209,198,.9)';
    g.font = '10px sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillText(`${m.nom} · ${LIBELLE_ETAT[etat]}`, cx + R_HIT * (0.85 + echelle * 0.5) + 4, cy + 3);
  });
}

/* ---------- E047-06 / E047-07 : lectures et région de statut ---------- */

function updateBadge() {
  const n = S.nodes.badge;
  if (!n) return;
  n.dataset.modalite = S.modalite;
  if (S.modalite === 'souris') {
    n.textContent = 'Modalité souris : le survol est transitoire — il suit le pointeur et disparaît quand il s’éloigne. Le marqueur actif garde son disque plein.';
  } else if (S.modalite === 'clavier') {
    n.textContent = 'Modalité clavier : le focus remplace le survol. Un anneau plus épais (trait 2,5) et la croix ⊕ signalent le marqueur désigné, même sans pointeur.';
  } else {
    n.textContent = 'Modalité tactile : ni survol ni focus ne persistent. Seul l’état actif (disque plein) porte l’information ; la zone de capture élargie rend le toucher fiable.';
  }
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const r = rayonsCoherents(S.base, S.hover);
  const s = surfaces(r.base, r.hover);
  const etat = etatMarqueur(S.indexSurvol, S.indexSurvol, S.modalite);
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Marqueur désigné '));
  n.appendChild(fort(MARQUEURS[S.indexSurvol].nom));
  n.appendChild(document.createTextNode(' · état '));
  n.appendChild(fort(LIBELLE_ETAT[etat]));
  n.appendChild(document.createTextNode('. Rayons '));
  n.appendChild(fort(`${fmt(r.base)} px`));
  n.appendChild(document.createTextNode(' (repos) et '));
  n.appendChild(fort(`${fmt(r.hover)} px`));
  n.appendChild(document.createTextNode(' (survol). Surface survol/repos = '));
  n.appendChild(fort(fmt(s.survolSurRepos, 2)));
  n.appendChild(document.createTextNode(` , contre ${fmt(s.refSurvolSurRepos, 2)} pour la référence 4→7 px. Capture/visible = `));
  n.appendChild(fort(fmt(s.captureSurVisible, 2)));
  n.appendChild(document.createTextNode(` , référence ${fmt(s.refCaptureSurVisible, 2)}. Diamètre de capture ${fmt(s.diametreCapture)} px : `));
  n.appendChild(fort(s.diametreCapture >= CIBLE_RECO ? '≥ 44 px recommandés' : (s.diametreCapture >= CIBLE_MIN ? '≥ 24 px minimum' : 'sous le minimum')));
  n.appendChild(document.createTextNode(`. Trait focus/repos = ${fmt(s.traitFocusSurRepos, 2)}.`));
}

function syncControls() {
  const n = S.nodes;
  const r = rayonsCoherents(S.base, S.hover);
  S.base = r.base;
  S.hover = r.hover;
  if (n.base) n.base.value = String(Math.round(S.base));
  if (n.hover) n.hover.value = String(Math.round(S.hover));
  if (n.baseOut) n.baseOut.textContent = `${fmt(S.base)} px`;
  if (n.hoverOut) n.hoverOut.textContent = `${fmt(S.hover)} px`;
  if (n.souris) n.souris.checked = S.modalite === 'souris';
  if (n.clavier) n.clavier.checked = S.modalite === 'clavier';
  if (n.tactile) n.tactile.checked = S.modalite === 'tactile';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la visite' : '▶ Animer la visite';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
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

/* ---------- E047-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (!S.onScreen || S.reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || S.reduced) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) {
      /* Progression déterministe, aucune valeur aléatoire. */
      S.sweep = (S.sweep + dt * 0.00028) % 1;
      S.indexSurvol = Math.floor(S.sweep * MARQUEURS.length) % MARQUEURS.length;
    }
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
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
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE047Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); syncControls(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E047-10 : IntersectionObserver, sobriété, reproductibilité ---------- */

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

/* ---------- Point d'entrée ---------- */

register('E047', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function'
    ? !!ctx.reducedMotion()
    : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.dataset.geographyE047Reduced = S.reduced ? '1' : '0';
  if (S.reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.souris, n.clavier, n.tactile].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.modalite = radio.value;
        syncControls();
      });
    });
    n.base.addEventListener('input', () => {
      S.base = clamp(Number(n.base.value), BASE_MIN, BASE_MAX);
      syncControls();
    });
    n.hover.addEventListener('input', () => {
      S.hover = clamp(Number(n.hover.value), HOVER_MIN, HOVER_MAX);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        S.indexSurvol = (S.indexSurvol + 1) % MARQUEURS.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        S.indexSurvol = (S.indexSurvol - 1 + MARQUEURS.length) % MARQUEURS.length;
      } else if (event.key === 'Home') {
        S.indexSurvol = 0;
      } else if (event.key === 'Enter' || event.key === ' ') {
        S.modalite = S.modalite === 'souris' ? 'clavier' : (S.modalite === 'clavier' ? 'tactile' : 'souris');
      } else used = false;
      if (used) {
        S.sweep = S.indexSurvol / MARQUEURS.length;
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
