import { register } from './registry.js';

/* Lentille E067 (V2) — vue GEOGRAPHIE.
 * Thème : couleurs sémantiques — la signification sans la seule couleur.
 *
 * Les dix chantiers E067-01 … E067-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E067.md. Les dix sont réellement implémentés :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau, aucune
 * graine aléatoire, aucune journalisation, aucun fichier partagé modifié. Le contenu
 * pédagogique est du texte sémantique réel (titre, paragraphes, listes, tableau,
 * radiogroupe, défi) présent dans le DOM même sans animation ; le canvas n'est qu'un
 * laboratoire qui illustre le double codage et des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e067- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e067';

/* Identifiants, tous préfixés geography-v2-e067-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const CANAUX_ID = P + '-canaux';
const ECHELLES_ID = P + '-echelles';
const CONVENTIONS_NOTE_ID = P + '-conventions-note';
const PREVALENCE_ID = P + '-prevalence';
const CAT_ID = P + '-cat';
const CAT_PREFIX = P + '-cat-';
const SIMUL_ID = P + '-simul';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const MESURES_ID = P + '-mesures';
const CLAVIER_ID = P + '-clavier';
const PLAY_ID = P + '-play';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const NARROW = '\u202f';
const MINUS = '\u2212';
const PAS_BALAYAGE = 700; // ms par catégorie dans le balayage animé

/* Cinq catégories sémantiques : chacune porte un sens ET un codage redondant
 * (forme, motif, étiquette) — la teinte n'est jamais le seul canal. */
const CATEGORIES = [
  {
    cle: 'eau', label: 'Eau / océan', sens: 'Milieu aquatique, eau douce ou salée',
    couleur: '#2e6fb7', forme: 'cercle', motif: 'points',
    convention: 'Le bleu signifie l’eau sur les cartes météo et topographiques : convention apprise, pas propriété de l’eau.',
  },
  {
    cle: 'vegetation', label: 'Végétation / forêt', sens: 'Couvert végétal, forêt, prairie',
    couleur: '#2f8f4e', forme: 'triangle', motif: 'hachures',
    convention: 'Le vert évoque la végétation et l’état « sain » dans de nombreuses légendes occidentales.',
  },
  {
    cle: 'relief', label: 'Relief / sol', sens: 'Montagne, altitude, sols et roches',
    couleur: '#9a5b2f', forme: 'carré', motif: 'croix',
    convention: 'Le brun et l’ocre désignent le relief et les sols sur les cartes physiques.',
  },
  {
    cle: 'chaleur', label: 'Chaleur / alerte', sens: 'Température élevée, danger, seuil dépassé',
    couleur: '#b5342a', forme: 'losange', motif: 'rayures',
    convention: 'Le rouge marque la chaleur, l’alerte ou le danger : à lire avec son étiquette, car le sens varie selon le contexte.',
  },
  {
    cle: 'neutre', label: 'Neutre / non documenté', sens: 'Absence de donnée, catégorie neutre',
    couleur: '#7a7f86', forme: 'anneau', motif: 'vide',
    convention: 'Le gris marque l’absence de donnée : sa signification doit être écrite, sinon il passe pour une donnée.',
  },
];

/* Approximation schématique (illustrative) d'une vision deutéranope : on réduit
 * l'apport du canal vert. Ce n'est pas une simulation colorimétrique certifiée ;
 * elle sert uniquement à montrer que le sens survit quand les teintes se rapprochent. */
const MATRICE_DEUTAN = [
  [0.625, 0.375, 0.000],
  [0.700, 0.300, 0.000],
  [0.000, 0.300, 0.700],
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  index: 0,
  simuler: false,
  playing: false,
  debriefOuvert: false,
  lastTs: 0,
  elapsed: 0,
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

function num(value, digits) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? ',' + parts[1] : ''}`;
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

function rgb2hex(r, g, b) {
  const part = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + part(r) + part(g) + part(b);
}

/* Simulation deutéranope schématique, matrice fixe, sans aléa. */
function simulate(hex) {
  const rgb = hex2rgb(hex);
  const out = MATRICE_DEUTAN.map((row) => row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]);
  return rgb2hex(out[0], out[1], out[2]);
}

/* E067-08 — luminance relative WCAG, avec linéarisation sRGB. */
function luminance(hex) {
  const canaux = hex2rgb(hex).map((byte) => {
    const c = byte / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2];
}

/* E067-08 — ratio de contraste WCAG : (L clair + 0,05) / (L sombre + 0,05). */
function contraste(hexA, hexB) {
  const la = luminance(hexA);
  const lb = luminance(hexB);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* Encre de motif adaptée à la clarté de la teinte. */
function encreMotif(hex) {
  return luminance(hex) < 0.35 ? '#ffffff' : '#141414';
}

/* Prévalence recalculée depuis sa formule : 1 / 0,08. */
const PREVALENCE_HOMMES = 1 / 0.08; // 12,5

/* ---------- E067-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une couleur sémantique porte une signification : bleu pour l’eau, vert pour la végétation, brun pour le relief, rouge pour l’alerte, gris pour l’absence de donnée. Mais la couleur seule ne doit jamais porter l’information : on ajoute une forme, un motif, une étiquette ou une position. C’est le double codage : si un canal fait défaut, un autre transmet encore le sens.',
    'Une même information peut être portée par quatre canaux visuels indépendants : la teinte (repère rapide mais fragile), la forme (cercle, triangle, carré, losange, anneau), le motif (points, hachures, croix, rayures, vide) et l’étiquette numérotée — le canal le plus sûr, car il ne dépend d’aucune perception des couleurs.',
    'Environ 8 % des hommes et 0,5 % des femmes d’origine européenne ont une déficience des cônes : 1/0,08 = ' + num(PREVALENCE_HOMMES, 1) + ', soit environ un homme sur douze. Le rouge et le vert deviennent difficiles à distinguer : c’est précisément pour cela que le double codage est obligatoire. (Référence : prévalence des déficiences des cônes.)',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E067-03 : tableau sémantique des conventions (valeurs relevées) ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Conventions des couleurs sémantiques — cinq catégories, leur sens et leur codage redondant.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Catégorie', 'Teinte', 'Forme', 'Motif', 'Convention (sens appris)'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  CATEGORIES.forEach((cat) => {
    const tr = document.createElement('tr');
    const cells = [
      cat.label + ' — ' + cat.sens, cat.couleur, cat.forme, cat.motif, cat.convention,
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

/* ---------- Listes sémantiques : canaux, échelles, mesures ---------- */

function staticList(id, entrees) {
  const list = document.createElement('ul');
  list.id = id;
  entrees.forEach((texte) => {
    const item = document.createElement('li');
    item.textContent = texte;
    list.appendChild(item);
  });
  return list;
}

/* E067-08 — grandeurs recalculées depuis leur formule, confrontées aux références. */
function staticMesures() {
  const alerte = CATEGORIES[3];
  const surBlanc = contraste(alerte.couleur, '#ffffff');
  const surNoir = contraste(alerte.couleur, '#000000');
  return staticList(MESURES_ID, [
    'Luminance relative WCAG : L = 0,2126 R + 0,7152 V + 0,0722 B, avec composantes sRGB linéarisées.',
    'Contraste : (L clair + 0,05)/(L sombre + 0,05). Pour « ' + alerte.label + ' » (' + alerte.couleur + ') : ' +
      num(surBlanc, 2) + ':1 sur blanc et ' + num(surNoir, 2) + ':1 sur noir, contre les références AA 4,5:1 (texte normal) et 3:1 (grands textes et composants).',
    'Prévalence : 8 % des hommes et 0,5 % des femmes, soit environ 1 sur ' + num(PREVALENCE_HOMMES, 1) +
      ' contre une référence de 1 sur 200 chez les femmes (0,5 %).',
    'Un canal déficient réduit l’espace utile de 3 dimensions (rouge, vert, bleu) à 2 ; les 4 canaux redondants restent, eux, intacts.',
  ]);
}

/* ---------- Feuille de style unique, injectée une seule fois via ctx.css ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p,#${PANEL_ID} ul{margin:5px 0;max-width:68ch}
#${PANEL_ID} ul{padding-left:18px}
#${PANEL_ID} li{margin:3px 0}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${CAT_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${CAT_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;max-width:300px;height:auto;aspect-ratio:14 / 10;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;background:#f4f1ea;touch-action:manipulation;
}
#${LEGEND_ID},#${CLAVIER_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID},#${DEBRIEF_ID}{
  min-height:34px;padding:7px 8px;margin:6px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEBRIEF_ID}[hidden]{display:none}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.14)}
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
  #${CANVAS_ID}{max-width:240px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E067-02 / E067-06 : tracé des canaux redondants ---------- */

function traceForme(g, forme, x, y, rayon) {
  g.beginPath();
  if (forme === 'cercle') {
    g.arc(x, y, rayon, 0, Math.PI * 2);
  } else if (forme === 'triangle') {
    g.moveTo(x, y - rayon);
    g.lineTo(x + rayon, y + rayon * 0.8);
    g.lineTo(x - rayon, y + rayon * 0.8);
    g.closePath();
  } else if (forme === 'carré') {
    g.rect(x - rayon, y - rayon, rayon * 2, rayon * 2);
  } else if (forme === 'losange') {
    g.moveTo(x, y - rayon * 1.15);
    g.lineTo(x + rayon, y);
    g.lineTo(x, y + rayon * 1.15);
    g.lineTo(x - rayon, y);
    g.closePath();
  } else { /* anneau */
    g.arc(x, y, rayon, 0, Math.PI * 2);
  }
  if (forme === 'anneau') {
    g.lineWidth = 3;
    g.stroke();
  } else {
    g.fill();
  }
}

function traceMotif(g, motif, x, y, couleur) {
  if (motif === 'vide') return;
  g.save();
  g.strokeStyle = couleur;
  g.fillStyle = couleur;
  g.lineWidth = 1.2;
  if (motif === 'points') {
    [[-3, -3], [3, -3], [0, 3]].forEach(([dx, dy]) => {
      g.beginPath(); g.arc(x + dx, y + dy, 1.2, 0, Math.PI * 2); g.fill();
    });
  } else if (motif === 'hachures') {
    for (let k = -1; k <= 1; k += 1) {
      g.beginPath(); g.moveTo(x - 4 + k * 3, y + 4); g.lineTo(x + k * 3, y - 4); g.stroke();
    }
  } else if (motif === 'croix') {
    g.beginPath();
    g.moveTo(x - 4, y); g.lineTo(x + 4, y);
    g.moveTo(x, y - 4); g.lineTo(x, y + 4);
    g.stroke();
  } else if (motif === 'rayures') {
    for (let k = -1; k <= 1; k += 1) {
      g.beginPath(); g.moveTo(x + k * 3, y - 4); g.lineTo(x + k * 3, y + 4); g.stroke();
    }
  }
  g.restore();
}

/* ---------- E067-06 : laboratoire canvas unique et déterministe ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const largeur = Math.max(180, Math.min(300, cv.clientWidth || 300));
  const hauteur = Math.round(largeur * 0.72);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(largeur * dpr);
  const pxH = Math.round(hauteur * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, largeur, hauteur);

  g.fillStyle = '#f4f1ea';
  g.fillRect(0, 0, largeur, hauteur);
  const encre = '#1a1a1a';
  g.fillStyle = encre;
  g.textAlign = 'left';
  g.font = Math.max(8, Math.round(largeur * 0.036)) + 'px sans-serif';
  g.fillText('Couleur seule — quel sens ?', 6, 14);

  const slots = CATEGORIES.length;
  const slot = largeur / slots;
  CATEGORIES.forEach((cat, i) => {
    const x = slot * i + slot / 2;
    const teinte = S.simuler ? simulate(cat.couleur) : cat.couleur;
    g.fillStyle = teinte;
    g.beginPath(); g.arc(x, 32, 10, 0, Math.PI * 2); g.fill();
  });

  g.strokeStyle = '#c9c2b4';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(6, 52); g.lineTo(largeur - 6, 52); g.stroke();

  g.fillStyle = encre;
  g.fillText('+ forme, motif, étiquette — sens certain', 6, 66);

  CATEGORIES.forEach((cat, i) => {
    const x = slot * i + slot / 2;
    const y = 92;
    const teinte = S.simuler ? simulate(cat.couleur) : cat.couleur;
    g.fillStyle = teinte;
    g.strokeStyle = teinte;
    traceForme(g, cat.forme, x, y, 9);
    traceMotif(g, cat.motif, x, y, encreMotif(teinte));
    g.fillStyle = encre;
    g.font = Math.max(9, Math.round(largeur * 0.042)) + 'px sans-serif';
    g.textAlign = 'center';
    g.fillText(String(i + 1), x, 120);
    if (i === S.index) {
      g.strokeStyle = encre;
      g.lineWidth = 1.6;
      g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.stroke();
    }
  });

  g.textAlign = 'left';
  g.font = Math.max(7, Math.round(largeur * 0.03)) + 'px sans-serif';
  g.fillStyle = encre;
  g.fillText('1 eau · 2 végétation · 3 relief · 4 chaleur · 5 neutre', 6, hauteur - 7);
}

/* ---------- E067-07 : région de statut unique, relatée en texte ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const cat = CATEGORIES[S.index];
  const affiche = S.simuler ? simulate(cat.couleur) : cat.couleur;
  const surBlanc = contraste(cat.couleur, '#ffffff');
  const surNoir = contraste(cat.couleur, '#000000');
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode('Catégorie '));
  frag.appendChild(fort((S.index + 1) + '/' + CATEGORIES.length));
  frag.appendChild(document.createTextNode(' : '));
  frag.appendChild(fort(cat.label));
  frag.appendChild(document.createTextNode(' — sens : ' + cat.sens + '. Canaux redondants : forme (' + cat.forme +
    '), motif (' + cat.motif + '), étiquette « ' + cat.label + ' » et numéro ' + (S.index + 1) + '. Teinte ' + cat.couleur));
  if (S.simuler) frag.appendChild(document.createTextNode(', rendu deutéranope simulé ' + affiche));
  frag.appendChild(document.createTextNode('. Contraste '));
  frag.appendChild(fort(num(surBlanc, 2) + ':1'));
  frag.appendChild(document.createTextNode(' sur blanc et '));
  frag.appendChild(fort(num(surNoir, 2) + ':1'));
  frag.appendChild(document.createTextNode(' sur noir (référence AA : 4,5:1).'));
  const texte = frag.textContent;
  if (texte === S.readoutText) return; // évite de saturer la région live.
  S.readoutText = texte;
  n.textContent = '';
  n.appendChild(frag);
}

/* ---------- Construction du panneau (texte sémantique) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radios: CATEGORIES.map((_, i) => document.getElementById(CAT_PREFIX + i)),
      simul: document.getElementById(SIMUL_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Couleurs sémantiques — la signification sans la seule couleur');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une couleur sémantique porte un sens, mais une carte doit rester lisible quand la teinte disparaît. Ce laboratoire isole les quatre canaux redondants, montre une simulation deutéranope schématique et recalcule la luminance et le contraste depuis leur formule.');

  /* E067-01, E067-02, E067-05 : faits sourcés. */
  const faits = staticFacts();

  /* E067-03 : tableau des conventions, lisible sans canvas. */
  const table = staticTable();

  /* E067-04 : trois types d'échelles, avec des nombres réels. */
  const echelles = staticList(ECHELLES_ID, [
    'Catégorielle : ' + CATEGORIES.length + ' teintes sans ordre entre elles (eau, végétation, relief, chaleur, neutre) ; aucune n’est « plus grande » qu’une autre.',
    'Séquentielle : du clair au foncé pour un ordre ; 5 niveaux d’intensité répartissent 100 % de la plage en pas de 20 %.',
    'Divergente : deux pôles autour d’un neutre, par exemple −2, −1, 0, +1, +2 autour du gris (« froid » contre « chaud »).',
  ]);
  const echelleNote = ctx.el('p', '', 'Une échelle catégorielle sépare des noms, une échelle séquentielle range des quantités, une échelle divergente montre un écart autour d’un zéro. Utiliser la mauvaise échelle invente un ordre qui n’existe pas dans les données.');

  /* E067-03 : relativité culturelle. */
  const conventionNote = ctx.el('p', '', 'Ces associations — rouge = chaleur ou danger, vert = végétation, bleu = eau — sont des conventions apprises, pas des lois de la nature. Elles varient selon les cultures : le deuil est blanc ailleurs, noir ici. Une légende explicite prime toujours sur la couleur supposée.');
  conventionNote.id = CONVENTIONS_NOTE_ID;

  /* E067-05 : prévalence recalculée. */
  const prevalence = ctx.el('p', '', 'Prévalence : environ 8 % des hommes et 0,5 % des femmes d’origine européenne ont une déficience des cônes ; 1/0,08 = ' + num(PREVALENCE_HOMMES, 1) + ', soit environ un homme sur douze. Les formes courantes sont la protanopie (rouge), la deutéranopie (vert) et la tritanopie (bleu).');
  prevalence.id = PREVALENCE_ID;

  /* E067-02 : canaux redondants, liste indexable. */
  const canaux = staticList(CANAUX_ID, [
    'Teinte : repère rapide, mais illisible pour une vision déficiente et sans légende.',
    'Forme : cercle, triangle, carré, losange, anneau — distinguable même en niveaux de gris.',
    'Motif : points, hachures, croix, rayures, vide — lisible à l’impression.',
    'Étiquette et numéro : le canal le plus sûr, car il ne dépend d’aucune perception des couleurs.',
  ]);

  /* E067-09 : choix unique -> fieldset/radiogroup + radios de même nom. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = CAT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Choisir une catégorie sémantique, choix unique');
  const legend = document.createElement('legend');
  legend.textContent = 'Catégorie sémantique (choix unique)';
  fieldset.appendChild(legend);
  const radios = CATEGORIES.map((cat, i) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-cat';
    radio.id = CAT_PREFIX + i;
    radio.value = String(i);
    radio.checked = S.index === i;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode((i + 1) + ' · ' + cat.label + ' (' + cat.forme + ')'));
    fieldset.appendChild(lab);
    return radio;
  });

  /* E067-05 : bascule indépendante de simulation -> aria-pressed autorisé. */
  const simul = ctx.el('button', '', S.simuler ? 'Simuler une vision deutéranope : oui' : 'Simuler une vision deutéranope : non');
  simul.type = 'button';
  simul.id = SIMUL_ID;
  simul.setAttribute('aria-pressed', S.simuler ? 'true' : 'false');
  simul.setAttribute('aria-controls', CANVAS_ID);

  /* E067-06 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire de codage sémantique : la bande haute montre cinq pastilles de couleur seule, la bande basse ajoute à chaque catégorie une forme, un motif et un numéro de 1 à 5. Flèche droite ou bas : catégorie suivante ; flèche gauche ou haut : précédente ; Origine : première ; Fin : cinquième.');
  canvas.setAttribute('aria-describedby', CLAVIER_ID);

  /* E067-08 : légende des repères sans couleur. */
  const legendText = ctx.el('p', '', 'Repères sans couleur : cercle = eau, triangle = végétation, carré = relief, losange = chaleur, anneau = neutre ; motifs points, hachures, croix, rayures, vide ; numéro 1 à 5 et étiquette écrite. Le sens ne dépend jamais de la seule teinte.');
  legendText.id = LEGEND_ID;

  /* E067-07 : région de statut unique, annoncée aux technologies d'assistance. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E067-08 : repères chiffrés recalculés depuis leur formule. */
  const mesures = staticMesures();

  /* E067-09 : équivalent clavier explicite. */
  const clavier = ctx.el('p', '', 'Clavier : Tab atteint les cinq catégories, la simulation, le balayage puis le schéma. ← → (ou ↑ ↓) changent de catégorie, Début place la première, Fin la cinquième. Le schéma accepte les mêmes touches. La simulation est une bascule indépendante : son état est toujours écrit « oui / non », jamais porté par le seul pixel.');
  clavier.id = CLAVIER_ID;

  /* E067-10 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Lancer le balayage animé');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  /* E067-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer — 1) Prédire : en simulant une vision deutéranope, le sens des cinq catégories reste-t-il lisible ? 2) Réglage : activez la simulation et parcourez les catégories. 3) Résultat attendu : chaque lecture nomme encore la bonne catégorie. 4) Falsification : masquez mentalement forme, motif et étiquette — si le sens disparaît, le double codage est incomplet et l’hypothèse est réfutée. 5) Débrief : vérifiez votre raisonnement ci-dessous.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : la matrice de simulation est schématique (pas une mesure colorimétrique), les conventions de couleur sont culturelles et changeantes, et les seuils AA 4,5:1 / 3:1 mesurent le contraste, pas la signification. Ce qui sauve le sens, ce sont les quatre canaux redondants — forme, motif, étiquette et position — pas la teinte.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, faits, table, echelles, echelleNote, conventionNote, prevalence, canaux,
    fieldset, simul, canvas, legendText, readout, mesures, clavier, play, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios, simul, canvas, readout, play, debriefBtn, debrief,
  };
}

/* ---------- Synchronisation de tous les contrôles et du dessin ---------- */

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio, i) => {
    if (!radio) return;
    radio.checked = S.index === i;
  });
  if (n.simul) {
    n.simul.textContent = 'Simuler une vision deutéranope : ' + (S.simuler ? 'oui' : 'non');
    n.simul.setAttribute('aria-pressed', S.simuler ? 'true' : 'false');
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Lancer le balayage animé';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reducedNow() ? '1' : '0');
  updateReadout();
  drawLab();
}

/* ---------- E067-10 : boucle rAF unique, pause sur document.hidden ---------- */

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

/* Un seul pas discret, utilisé en mouvement réduit. */
function stepCategory() {
  S.index = (S.index + 1) % CATEGORIES.length;
  syncControls();
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reducedNow()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) {
      S.elapsed += dt;
      const index = Math.floor(S.elapsed / PAS_BALAYAGE) % CATEGORIES.length;
      if (index !== S.index) S.index = index;
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
        if (mq.matches) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* ---------- E067-10 : IntersectionObserver et badge sur la carte ---------- */

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
  const badge = ctx.el('div', P + '-map-badge', 'Couleurs sémantiques pédagogiques : teintes schématiques, le sens est toujours écrit en texte.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E067', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(P, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  if (reducedNow()) S.playing = false;
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.index = i;
        syncControls();
      });
    });
    n.simul.addEventListener('click', () => {
      S.simuler = !S.simuler;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow() || typeof requestAnimationFrame !== 'function') {
        S.playing = false;
        stopLoop();
        stepCategory(); // palier discret : jamais d'animation en mouvement réduit.
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) {
        stopLoop();
      } else {
        S.elapsed = S.index * PAS_BALAYAGE;
        startLoop();
      }
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        S.index = (S.index + 1) % CATEGORIES.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        S.index = (S.index - 1 + CATEGORIES.length) % CATEGORIES.length;
      } else if (event.key === 'Home') {
        S.index = 0;
      } else if (event.key === 'End') {
        S.index = CATEGORIES.length - 1;
      } else used = false;
      if (used) {
        S.elapsed = S.index * PAS_BALAYAGE;
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reducedNow()) startLoop();
});
