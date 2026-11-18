import { register } from './registry.js';

/* Lentille E070 — vue GEOGRAPHIE.
 * Thème : état vide (aucun lieu à afficher).
 *
 * Les dix chantiers E070-01 … E070-10 sont réellement implémentés ci-dessous
 * et décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E070.md. Le laboratoire
 * manipule un petit jeu de lieux déterministe (huit lieux, jamais tirés au
 * hasard) pour montrer la différence entre un vide structurel (jeu sans
 * aucun lieu) et un vide accidentel (filtres trop stricts), et les bonnes
 * réponses à y apporter : dénominateur, raison, rattrapage, annonce
 * accessible, repère non coloré.
 *
 * Contrat : register('E070', ctx => {...}), ctx = { viewId, stage, layout,
 * css, el, reducedMotion() }. Un seul appel à ctx.css('geography-e070', …),
 * des identifiants préfixés geography-e070-*, aucun appel réseau, aucune
 * graine aléatoire, aucune console, une seule boucle rAF mise en pause sur
 * document.hidden. Le texte pédagogique est du HTML sémantique réel, lisible
 * et indexable sans animation ; le canvas n'est qu'un laboratoire.
 */

const CSS_ID = 'geography-e070';
const PANEL_ID = 'geography-e070-panel';
const TITLE_ID = 'geography-e070-title';
const Q_ID = 'geography-e070-query';
const REGION_ID = 'geography-e070-region';
const EPOQUE_ID = 'geography-e070-epoque';
const VIDE_ID = 'geography-e070-jeu-vide';
const CANVAS_ID = 'geography-e070-canvas';
const HELP_ID = 'geography-e070-help';
const LEGEND_ID = 'geography-e070-legend';
const READOUT_ID = 'geography-e070-readout';
const SUG_ID = 'geography-e070-suggestions';
const RESET_ID = 'geography-e070-reset';
const BADGE_ID = 'geography-e070-badge';
const TABLE_ID = 'geography-e070-table';

const PREFIX_ID = 'geography-e070-epoque-';
const REGIONS = ['Nord', 'Sud', 'Est', 'Ouest'];
const EPOQUES = ['antique', 'moderne'];

/* Jeu témoin déterministe : huit lieux, trois critères chacun. Aucune
 * coordonnée réelle n'est inventée : ce jeu sert uniquement d'illustration. */
const LIEUX = [
  { nom: 'Marseille', region: 'Sud', epoque: 'moderne', theme: 'port' },
  { nom: 'Lyon', region: 'Est', epoque: 'moderne', theme: 'ville' },
  { nom: 'Nantes', region: 'Ouest', epoque: 'moderne', theme: 'port' },
  { nom: 'Grenoble', region: 'Est', epoque: 'moderne', theme: 'montagne' },
  { nom: 'Bordeaux', region: 'Ouest', epoque: 'antique', theme: 'port' },
  { nom: 'Strasbourg', region: 'Est', epoque: 'antique', theme: 'ville' },
  { nom: 'Nice', region: 'Sud', epoque: 'moderne', theme: 'port' },
  { nom: 'Annecy', region: 'Est', epoque: 'moderne', theme: 'montagne' },
];

const NEUTRE = Object.freeze({ q: '', region: 'toutes', epoque: 'toutes' });

const TYPES = {
  structurel: 'vide structurel',
  accidentel: 'vide accidentel',
  'non-vide': 'résultats affichés',
};

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  q: '',
  region: 'toutes',
  epoque: 'toutes',
  jeuVide: false,
  phase: 0,
  playing: false,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- E070-01 à E070-06 : moteur déterministe du laboratoire ---------- */

const norm = (texte) => String(texte || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const entier = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function criteresActuels() {
  return { q: S.q, region: S.region, epoque: S.epoque };
}

function correspond(lieu, c) {
  if (c.q && !norm(lieu.nom).includes(norm(c.q))) return false;
  if (c.region !== 'toutes' && lieu.region !== c.region) return false;
  if (c.epoque !== 'toutes' && lieu.epoque !== c.epoque) return false;
  return true;
}

/* E070-01 : le jeu simulé vide ne contient aucun lieu ; sinon on filtre. */
function listeActive() {
  if (S.jeuVide) return [];
  return LIEUX.filter((lieu) => correspond(lieu, criteresActuels()));
}

/* E070-01 : trois situations distinctes, jamais confondues. */
function classerVide() {
  if (S.jeuVide || LIEUX.length === 0) return 'structurel';
  if (listeActive().length === 0) return 'accidentel';
  return 'non-vide';
}

/* E070-06 : distance minimale au résultat — nombre de critères à neutraliser
 * pour qu'au moins un lieu réapparaisse. Balayage exhaustif de 2^3 subsets. */
function relaxationMin(c) {
  const cles = ['q', 'region', 'epoque'];
  for (let masque = 0; masque < 8; masque += 1) {
    const essai = { q: c.q, region: c.region, epoque: c.epoque };
    let neutralises = 0;
    cles.forEach((cle, index) => {
      if (masque & (1 << index)) {
        essai[cle] = NEUTRE[cle];
        neutralises += 1;
      }
    });
    if (LIEUX.some((lieu) => correspond(lieu, essai))) return neutralises;
  }
  return cles.length;
}

/* E070-05 : pistes de rattrapage dérivées du jeu, triées par efficacité. */
function pistes() {
  const c = criteresActuels();
  const candidats = [];
  const ajouter = (label, essai) => {
    const compte = LIEUX.filter((lieu) => correspond(lieu, essai)).length;
    if (compte > 0) candidats.push({ label: `${label} → ${compte} lieu(s)`, essai, compte });
  };
  if (c.q) ajouter(`Effacer la recherche « ${S.q} »`, { ...c, q: '' });
  if (c.region !== 'toutes') {
    ajouter('Toutes les régions', { ...c, region: 'toutes' });
    REGIONS.filter((r) => r !== c.region).forEach((r) => ajouter(`Région ${r}`, { ...c, region: r }));
  }
  if (c.epoque !== 'toutes') {
    ajouter('Toutes les époques', { ...c, epoque: 'toutes' });
    EPOQUES.filter((e) => e !== c.epoque).forEach((e) => ajouter(`Époque ${e}`, { ...c, epoque: e }));
  }
  candidats.sort((a, b) => b.compte - a.compte || a.label.localeCompare(b.label, 'fr'));
  return candidats.slice(0, 3);
}

/* ---------- Feuille de style unique ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .geography-e070-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} .geography-e070-lexique{margin:8px 0;font-size:10px}
#${PANEL_ID} .geography-e070-lexique dt{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} .geography-e070-lexique dd{margin:0 0 4px 10px;color:var(--muted)}
#${PANEL_ID} .geography-e070-ligne{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:7px 0;
}
#${PANEL_ID} label.geography-e070-label{min-width:96px;color:var(--muted)}
#${PANEL_ID} input[type="search"],#${PANEL_ID} select{
  min-height:36px;padding:5px 7px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink);font:inherit;font-size:11px;
}
#${PANEL_ID} input[type="search"]{flex:1 1 150px;min-width:130px}
#${EPOQUE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${EPOQUE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-e070-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-e070-choix input{
  min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f);
}
#${CANVAS_ID}{
  display:block;width:100%;height:230px;margin:8px 0;border:1px dashed var(--line);
  border-radius:8px;background:rgba(0,0,0,.26);touch-action:none;
}
#${LEGEND_ID},#${HELP_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${SUG_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}
#${SUG_ID} .geography-e070-vide{color:var(--muted);font-size:10px}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:6px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button.geography-e070-piste{min-height:36px;font-size:10px}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e070-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-e070-reduced="1"] button,.geography-e070-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-e070-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:210px}
  #${PANEL_ID} label.geography-e070-label{min-width:100%}
}
`;

/* ---------- Texte sémantique, lisible et indexable sans animation ---------- */

function faitsStatiques() {
  const conteneur = document.createElement('div');
  const textes = [
    'Un état vide structurel signale l’absence de données : aucun lieu n’existe pour ce périmètre. Un état vide accidentel vient d’un filtre ou d’une recherche trop stricts : les lieux existent, mais aucun ne passe le crible.',
    'Un bon état vide dit pourquoi il est vide, donne le dénominateur (zéro lieu affiché sur le total) et propose une action de rattrapage : réinitialiser, élargir le périmètre ou assouplir un critère.',
    'L’annonce doit rester accessible : role="status" et aria-live="polite", un libellé textuel et un repère non coloré (icône, tirets), jamais une couleur seule. Le message est lu même quand le canvas est absent.',
  ];
  textes.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e070-fait';
    p.textContent = texte;
    conteneur.appendChild(p);
  });
  return conteneur;
}

function tableauStatique() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Trois réponses à un état vide (référence : zéro résultat affiché).';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Situation', 'Cause', 'Action de rattrapage'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  [
    ['Vide structurel', 'Le jeu ne contient aucun lieu', 'Changer de source ou de repère, expliquer l’absence'],
    ['Vide accidentel', 'Les filtres excluent tous les lieux', 'Réinitialiser, élargir, proposer des pistes'],
    ['Résultats', 'Au moins un lieu correspond', 'Afficher le dénominateur et la couverture'],
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

function lexiqueStatique() {
  const dl = document.createElement('dl');
  dl.className = 'geography-e070-lexique';
  [
    ['Vide structurel', 'aucune donnée n’existe : le vide est la réalité du jeu.'],
    ['Vide accidentel', 'des données existent, mais le crible utilisé n’en laisse passer aucune.'],
    ['Couverture', 'part du jeu témoin affichée : nombre affiché divisé par le total, en pourcentage.'],
    ['Distance de relaxation', 'plus petit nombre de critères à assouplir pour retrouver au moins un résultat.'],
  ].forEach(([terme, definition]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = definition;
    dl.append(dt, dd);
  });
  return dl;
}

/* ---------- E070-08 / E070-10 : panneau accessible et idempotent ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      q: document.getElementById(Q_ID),
      region: document.getElementById(REGION_ID),
      radios: EPOQUES.concat(['toutes']).map((v) => document.getElementById(PREFIX_ID + v)),
      jeuVide: document.getElementById(VIDE_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      sug: document.getElementById(SUG_ID),
      reset: document.getElementById(RESET_ID),
      anim: document.getElementById('geography-e070-anim'),
    };
  }

  const panel = ctx.el('section', 'geography-e070-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = ctx.el('h2', '', 'État vide : quand la carte n’a aucun lieu à montrer');
  titre.id = TITLE_ID;
  const intro = ctx.el('p', '', 'Une recherche ou un filtre peut ne rien donner. Ce laboratoire compare un jeu réellement vide à un jeu trop fortement filtré, et montre comment répondre sans laisser l’utilisateur dans une impasse.');

  const filtresTitre = ctx.el('h3', '', 'Filtres du laboratoire');

  const qLigne = ctx.el('p', 'geography-e070-ligne');
  const qLabel = document.createElement('label');
  qLabel.className = 'geography-e070-label';
  qLabel.setAttribute('for', Q_ID);
  qLabel.appendChild(document.createTextNode('Recherche : '));
  const q = document.createElement('input');
  q.type = 'search';
  q.id = Q_ID;
  q.value = S.q;
  q.setAttribute('aria-label', 'Rechercher un lieu du jeu témoin');
  qLigne.append(qLabel, q);

  const regionLigne = ctx.el('p', 'geography-e070-ligne');
  const regionLabel = document.createElement('label');
  regionLabel.className = 'geography-e070-label';
  regionLabel.setAttribute('for', REGION_ID);
  regionLabel.appendChild(document.createTextNode('Région : '));
  const region = document.createElement('select');
  region.id = REGION_ID;
  [['toutes', 'Toutes'], ...REGIONS.map((r) => [r, r])].forEach(([valeur, libelle]) => {
    const option = document.createElement('option');
    option.value = valeur;
    option.textContent = libelle;
    region.appendChild(option);
  });
  region.value = S.region;
  region.setAttribute('aria-label', 'Filtrer par région (choix unique)');
  regionLigne.append(regionLabel, region);

  const fieldset = document.createElement('fieldset');
  fieldset.id = EPOQUE_ID;
  const legende = document.createElement('legend');
  legende.textContent = 'Époque (choix unique)';
  fieldset.appendChild(legende);
  [['toutes', 'Toutes'], ['antique', 'Antique'], ['moderne', 'Moderne']].forEach(([valeur, libelle]) => {
    const lab = ctx.el('label', 'geography-e070-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e070-epoque';
    radio.id = PREFIX_ID + valeur;
    radio.value = valeur;
    radio.checked = S.epoque === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
  });

  const videLigne = ctx.el('p', 'geography-e070-ligne');
  const videLabel = ctx.el('label', 'geography-e070-choix');
  videLabel.setAttribute('for', VIDE_ID);
  const vide = document.createElement('input');
  vide.type = 'checkbox';
  vide.id = VIDE_ID;
  vide.checked = S.jeuVide;
  videLabel.append(vide, document.createTextNode('Simuler un jeu sans aucun lieu (vide structurel)'));
  videLigne.appendChild(videLabel);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', HELP_ID);
  canvas.setAttribute('aria-label', 'Laboratoire d’état vide : cadre de carte, piste de recherche et compte de lieux. Flèches gauche et droite : changer de région ; flèches haut et bas : changer d’époque ; Début : réinitialiser.');

  const legendeTexte = ctx.el('p', 'geography-e070-legend', 'Repère non coloré : cadre en tirets et icône de loupe = aucun résultat ; point plein cerclé = lieu affiché ; le message écrit reste la source du sens.');
  legendeTexte.id = LEGEND_ID;
  const aide = ctx.el('p', 'geography-e070-help', 'Clavier : ← → région, ↑ ↓ époque, Début réinitialise. Le bouton « Animer » fait pulser la loupe : la pause est automatique si l’onglet est masqué ou si le mouvement réduit est demandé.');
  aide.id = HELP_ID;

  const readout = ctx.el('p', 'geography-e070-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const pisteTitre = ctx.el('h3', '', 'Pistes de rattrapage (calculées depuis le jeu)');
  const sug = document.createElement('div');
  sug.id = SUG_ID;

  const reset = ctx.el('button', '', '↺ Réinitialiser tous les filtres');
  reset.type = 'button';
  reset.id = RESET_ID;

  const anim = ctx.el('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer la loupe');
  anim.type = 'button';
  anim.id = 'geography-e070-anim';
  anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(
    titre, intro, faitsStatiques(), tableauStatique(), lexiqueStatique(),
    filtresTitre, qLigne, regionLigne, fieldset, videLigne,
    canvas, legendeTexte, aide, readout, pisteTitre, sug, reset, anim,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host) : ctx.stage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (aside && typeof aside.appendChild === 'function') aside.appendChild(panel);

  return {
    panel,
    fresh: true,
    q,
    region,
    radios: EPOQUES.concat(['toutes']).map((v) => document.getElementById(PREFIX_ID + v)),
    jeuVide: vide,
    canvas,
    readout,
    sug,
    reset,
    anim,
  };
}

/* ---------- E070-07 : dessin déterministe de l'état vide ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 340;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const type = classerVide();
  const visibles = listeActive();

  /* Cadre de carte en tirets : le vide est un repère, pas une absence de repère. */
  const fx = 16;
  const fy = 26;
  const fw = Math.max(40, cssW - 32);
  const fh = Math.max(40, cssH - 58);
  g.strokeStyle = 'rgba(214,207,193,.45)';
  g.lineWidth = 1;
  g.setLineDash([6, 5]);
  g.strokeRect(fx, fy, fw, fh);
  g.setLineDash([]);

  /* Squelette de trois lignes de résultats absents. */
  g.strokeStyle = 'rgba(214,207,193,.16)';
  for (let i = 0; i < 3; i += 1) {
    const y = fy + 18 + i * 20;
    g.beginPath();
    g.moveTo(fx + 14, y);
    g.lineTo(fx + 14 + fw * (0.62 - i * 0.14), y);
    g.stroke();
  }

  if (visibles.length) {
    /* Résultats : pastilles pleines et cerclées, position déterministe. */
    visibles.slice(0, 8).forEach((lieu, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = fx + fw * ((col + 0.5) / 4);
      const y = fy + fh * ((row + 0.5) / 3);
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fillStyle = 'rgba(244,214,158,.85)';
      g.fill();
      g.strokeStyle = 'rgba(244,214,158,.95)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, 8, 0, Math.PI * 2);
      g.stroke();
    });
  } else {
    /* E070-09 : loupe dessinée, halo pulsé deterministic en f(phase). */
    const cx = fx + fw / 2;
    const cy = fy + fh / 2;
    const halo = 26 + S.phase * 16;
    g.strokeStyle = `rgba(244,214,158,${(0.30 * (1 - S.phase)).toFixed(3)})`;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, halo, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(244,214,158,.9)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(cx - 3, cy - 3, 13, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + 6, cy + 6);
    g.lineTo(cx + 20, cy + 20);
    g.stroke();
  }

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`${visibles.length} lieu(s) · ${TYPES[type]}`, fx + 2, fy - 8);
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.font = '9px sans-serif';
  g.fillText('Jeu témoin : 8 lieux (référence 100 %)', fx + 2, cssH - 8);
}

/* ---------- E070-02/03/05/06 : mesure lisible et annoncée ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const visibles = listeActive();
  const total = S.jeuVide ? 0 : LIEUX.length;
  const couverture = LIEUX.length ? Math.round((visibles.length / LIEUX.length) * 100) : 0;
  const distance = visibles.length === 0 && !S.jeuVide
    ? relaxationMin(criteresActuels()) : 0;
  const type = classerVide();

  n.textContent = '';
  n.appendChild(document.createTextNode(`État : ${TYPES[type]} · `));
  n.appendChild(fort(`${visibles.length} lieu(x) affiché(s) sur ${total}`));
  n.appendChild(document.createTextNode(` · couverture ${couverture} %. Critères : recherche « ${S.q || '—'} », région ${S.region}, époque ${S.epoque}. `));
  n.appendChild(fort(`Distance de relaxation : ${distance} critère(s)`));
  n.appendChild(document.createTextNode('. Référence : sans filtre, le jeu témoin montre 8 lieux, soit 100 %.'));
}

function renderSuggestions() {
  const boite = S.nodes.sug;
  if (!boite) return;
  boite.replaceChildren();
  const type = classerVide();
  const liste = pistes();
  if (type === 'structurel') {
    const p = document.createElement('p');
    p.className = 'geography-e070-vide';
    p.textContent = 'Jeu simulé sans aucun lieu : aucune piste ne peut créer de résultat. Décochez la simulation pour retrouver le jeu témoin.';
    boite.appendChild(p);
    return;
  }
  if (!liste.length) {
    const p = document.createElement('p');
    p.className = 'geography-e070-vide';
    p.textContent = 'Aucun ajustement simple ne donne de résultat.';
    boite.appendChild(p);
    return;
  }
  liste.forEach((piste) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'geography-e070-piste';
    bouton.dataset.fk = 'geography-e070-piste';
    bouton.textContent = piste.label;
    bouton.addEventListener('click', () => {
      S.q = piste.essai.q;
      S.region = piste.essai.region;
      S.epoque = piste.essai.epoque;
      syncControls();
    });
    boite.appendChild(bouton);
  });
}

function syncControls() {
  const n = S.nodes;
  if (n.q) n.q.value = S.q;
  if (n.region) n.region.value = S.region;
  if (n.jeuVide) n.jeuVide.checked = S.jeuVide;
  n.radios.forEach((radio) => {
    if (radio) radio.checked = radio.value === S.epoque;
  });
  if (n.anim) {
    n.anim.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la loupe';
    n.anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyE070Reduced = S.reduced ? '1' : '0';
  renderSuggestions();
  updateReadout();
  drawLab();
}

/* ---------- E070-08 : une seule boucle rAF, pause et mouvement réduit ---------- */

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
  if (S.reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) S.phase = (S.phase + dt * 0.0007) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
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
        const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : mq.matches;
        S.reduced = reduced;
        if (reduced) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- E070-10 : badge d'honnêteté sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e070-badge', 'États vides : laboratoire pédagogique sur un jeu témoin de 8 lieux, sans lien avec les filtres réels de l’atlas.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E070', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) S.playing = false;

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.q.addEventListener('input', () => { S.q = n.q.value; syncControls(); });
    n.region.addEventListener('change', () => { S.region = n.region.value; syncControls(); });
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.epoque = radio.value;
        syncControls();
      });
    });
    n.jeuVide.addEventListener('change', () => { S.jeuVide = n.jeuVide.checked; syncControls(); });
    n.canvas.addEventListener('keydown', (event) => {
      let utilise = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        const ordre = ['toutes', ...REGIONS];
        S.region = ordre[(ordre.indexOf(S.region) + pas + ordre.length) % ordre.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 1 : -1;
        const ordre = ['toutes', ...EPOQUES];
        S.epoque = ordre[(ordre.indexOf(S.epoque) + pas + ordre.length) % ordre.length];
      } else if (event.key === 'Home') {
        S.q = '';
        S.region = 'toutes';
        S.epoque = 'toutes';
        S.jeuVide = false;
      } else {
        utilise = false;
      }
      if (utilise) {
        event.preventDefault();
        syncControls();
      }
    });
    n.reset.addEventListener('click', () => {
      S.q = '';
      S.region = 'toutes';
      S.epoque = 'toutes';
      S.jeuVide = false;
      syncControls();
    });
    n.anim.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
  }

  installGlobalListeners(ctx);
  if (S.playing) startLoop();
});
