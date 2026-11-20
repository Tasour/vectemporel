import { register } from './registry.js';

/* Lentille E047 (V2) — vue GEOGRAPHIE.
 * Thème : états de survol des marqueurs.
 *
 * Les dix chantiers E047-01 … E047-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E047.md. Les dix sont réellement implémentés :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau, aucune
 * graine aléatoire, aucune journalisation, aucun fichier partagé modifié. Le contenu
 * pédagogique est du texte sémantique réel (titres, paragraphes, tableau,
 * radiogroupe, défi) présent dans le DOM même sans animation ; le canvas n'est qu'un
 * laboratoire qui illustre des états de marqueurs et des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e047- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e047';

/* Identifiants, tous préfixés geography-v2-e047-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const MODAL_ID = P + '-modal';
const MODAL_SOURIS_ID = P + '-modal-souris';
const MODAL_CLAVIER_ID = P + '-modal-clavier';
const MODAL_TACTILE_ID = P + '-modal-tactile';
const BASE_ID = P + '-base';
const BASE_OUT_ID = P + '-base-value';
const HOVER_ID = P + '-hover';
const HOVER_OUT_ID = P + '-hover-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const BADGE_ID = P + '-badge';
const MAP_BADGE_ID = P + '-map-badge';
const READOUT_ID = P + '-readout';
const PLAY_ID = P + '-play';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const REDUCED_ATTR = 'data-' + P + '-reduced';

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
  onScreen: true,
  visibilityBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  readoutText: '',
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const carre = (n) => n * n;

/* E047-04 — le rayon de survol ne peut pas être plus petit que le repos. */
function rayonsCoherents(base, hover) {
  return {
    base: clamp(base, BASE_MIN, BASE_MAX),
    hover: clamp(Math.max(hover, base), HOVER_MIN, HOVER_MAX),
  };
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

/* E047-05 — l'état d'un marqueur dépend de la modalité de pointage.
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

/* E047-08 — propriétés visuelles d'un état : le style et le glyphe, pas la seule
 * couleur, portent l'information. */
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

/* ---------- E047-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un marqueur de carte n’a pas un aspect unique : il passe par plusieurs états — repos, survol, focus clavier et actif — qui se combinent. Chaque état est défini par un déclencheur, un trait, un rayon et un attribut ARIA, jamais par la seule couleur. (Référence : geography.js et styles.css de la vue réelle.)',
    'Dans la vue GEOGRAPHIE, le disque visible mesure 4 pixels de rayon au repos et 7 pixels quand le lieu est actif ; un cercle transparent de 14 pixels de rayon élargit la zone de capture. La surface cliquable est donc (14/4)² ≈ 12,25 fois la surface visible. (Référence : géométrie des marqueurs de geography.js.)',
    'Le survol n’existe pas au doigt : sur tactile, ce sont le focus et l’état actif qui portent l’information. Une cible doit mesurer au moins 24 px (WCAG 2.2, critère 2.5.8) et, idéalement, 44 px (critère 2.5.5) ; ici le diamètre de capture vaut 28 px. (Référence : WCAG 2.2.)',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E047-02 : tableau sémantique des états et de leurs déclencheurs ---------- */

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

/* ---------- Feuille de style unique, injectée une seule fois via ctx.css ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${MODAL_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${MODAL_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="range"]::-webkit-slider-thumb{min-width:24px;min-height:24px}
#${PANEL_ID} input[type="range"]::-moz-range-thumb{min-width:24px;min-height:24px}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID},#${BADGE_ID},#${DEBRIEF_ID}{
  min-height:34px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${BADGE_ID}[data-${P}-modalite="souris"]{border-left:4px solid var(--gold,#e6b96f)}
#${BADGE_ID}[data-${P}-modalite="clavier"]{border-left:4px solid var(--muted,#9a9386)}
#${BADGE_ID}[data-${P}-modalite="tactile"]{border-left:4px dashed var(--muted,#9a9386)}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEBRIEF_ID}[hidden]{display:none}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-map-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-map-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-map-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique) ---------- */

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
      table: document.getElementById(TABLE_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Anatomie d’un survol : les états du marqueur');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un marqueur réagit au pointeur, au clavier et à la sélection. Ce laboratoire isole chaque état, montre la zone de capture et recalcule les surfaces depuis le rayon, afin de distinguer ce qui change vraiment d’un simple effet de couleur.');

  /* E047-05 : choix unique -> fieldset/radiogroup + radios de même nom. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = MODAL_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Modalité de pointage, choix unique');
  const legend = document.createElement('legend');
  legend.textContent = 'Modalité de pointage (choix unique)';
  fieldset.appendChild(legend);
  [
    ['souris', 'Souris — survol', MODAL_SOURIS_ID],
    ['clavier', 'Clavier — focus', MODAL_CLAVIER_ID],
    ['tactile', 'Tactile — pas de survol', MODAL_TACTILE_ID],
  ].forEach(([value, label, id]) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-modal';
    radio.id = id;
    radio.value = value;
    radio.checked = S.modalite === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  /* E047-04 : curseurs de rayon (repos et survol), libellés et valeurs. */
  const baseRow = ctx.el('p', '');
  const baseLabel = document.createElement('label');
  baseLabel.setAttribute('for', BASE_ID);
  baseLabel.appendChild(document.createTextNode('Rayon au repos : '));
  const baseOut = ctx.el('span', P + '-value');
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
  const hoverOut = ctx.el('span', P + '-value');
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
  canvas.setAttribute('aria-label', 'Laboratoire des états de marqueurs : quatre pastilles A, B, C et D sur un fond de carte. La pastille B est active (disque plein). Flèche droite ou bas : désigner le marqueur suivant ; Flèche gauche ou haut : le précédent ; Origine : revenir au premier marqueur ; Entrée : basculer la modalité de pointage. Le rayon, le trait et le glyphe distinguent repos, survol, focus et actif, indépendamment de la couleur.');

  const legendText = ctx.el('p', P + '-legend', 'Repères : cercle en tirets = zone de capture (rayon 14) ; disque fin = repos ; triangle ▸ = survol ; croix ⊕ = focus ; disque plein = actif ; halo extérieur = survol ou focus. Le style de trait et le glyphe portent l’information, pas la couleur.');
  legendText.id = LEGEND_ID;

  /* E047-07 : badge de modalité, décrit en toutes lettres. */
  const badge = ctx.el('p', '', '');
  badge.id = BADGE_ID;

  /* E047-07 : région de statut unique, annoncée aux technologies d'assistance. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E047-09 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter la visite' : '▶ Animer la visite');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  /* E047-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer — Prédiction : en passant du rayon 4 au rayon 7, la surface visible est-elle multipliée par 1,75 ou par 3,06 ? Réglage : placez les curseurs sur 4 et 7. Résultat attendu : le rapport (7/4)² vaut environ 3,06. Falsification : si votre calcul donne 1,75, vous avez multiplié les rayons au lieu des surfaces. Débrief : vérifiez votre raisonnement ci-dessous.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : la surface d’un disque est πr², donc le rapport est (7/4)² = 3,0625 ≈ 3,06, pas 7/4 = 1,75. Le rayon de capture 14 donne (14/4)² = 12,25 : la zone cliquable est plus de douze fois la zone visible. C’est cette marge, et non la couleur, qui rend le marqueur attrapable.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, baseRow, base, hoverRow, hover,
    canvas, legendText, badge, readout, play, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
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
    canvas, readout, badge, play, debriefBtn, debrief,
    legend: legendText, table: document.getElementById(TABLE_ID),
  };
}

/* ---------- E047-03 : laboratoire sur canvas (un seul, déterministe) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  /* DPR plafonné à 2. */
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

/* ---------- E047-07 : badge de modalité et région de statut ---------- */

function updateBadge() {
  const n = S.nodes.badge;
  if (!n) return;
  n.setAttribute('data-' + P + '-modalite', S.modalite);
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
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode('Marqueur désigné '));
  frag.appendChild(fort(MARQUEURS[S.indexSurvol].nom));
  frag.appendChild(document.createTextNode(' · état '));
  frag.appendChild(fort(LIBELLE_ETAT[etat]));
  frag.appendChild(document.createTextNode('. Rayons '));
  frag.appendChild(fort(`${fmt(r.base)} px`));
  frag.appendChild(document.createTextNode(' (repos) et '));
  frag.appendChild(fort(`${fmt(r.hover)} px`));
  frag.appendChild(document.createTextNode(' (survol). Surface survol/repos = '));
  frag.appendChild(fort(fmt(s.survolSurRepos, 2)));
  frag.appendChild(document.createTextNode(` , contre ${fmt(s.refSurvolSurRepos, 2)} pour la référence 4→7 px. Capture/visible = `));
  frag.appendChild(fort(fmt(s.captureSurVisible, 2)));
  frag.appendChild(document.createTextNode(` , référence ${fmt(s.refCaptureSurVisible, 2)}. Diamètre de capture ${fmt(s.diametreCapture)} px : `));
  frag.appendChild(fort(s.diametreCapture >= CIBLE_RECO ? '≥ 44 px recommandés' : (s.diametreCapture >= CIBLE_MIN ? '≥ 24 px minimum' : 'sous le minimum')));
  frag.appendChild(document.createTextNode(`. Trait focus/repos = ${fmt(s.traitFocusSurRepos, 2)}.`));
  const texte = frag.textContent;
  if (texte === S.readoutText) return; // évite de saturer la région live.
  S.readoutText = texte;
  n.textContent = '';
  n.appendChild(frag);
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
  if (!S.onScreen || reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reducedNow()) return;
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
  if (S.playing && !reducedNow()) S.rafId = requestAnimationFrame(tick);
}

/* Source unique de la préférence de mouvement (ctx.reducedMotion + repli). */
let reducedProvider = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};
function reducedNow() { return !!reducedProvider(); }

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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.playing = false; stopLoop(); }
        const bouton = document.getElementById(PLAY_ID);
        if (bouton) {
          bouton.textContent = S.playing ? '■ Arrêter la visite' : '▶ Animer la visite';
          bouton.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* ---------- E047-09 / E047-10 : IntersectionObserver et badge sur la carte ---------- */

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

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(MAP_BADGE_ID)) return;
  const badge = ctx.el('div', P + '-map-badge', 'États de marqueurs pédagogiques : rayons et traits schématiques, non des relevés cartographiques.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E047', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(P, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = reducedNow();
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) S.playing = false;

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
  if (S.playing && !reduced) startLoop();
});
