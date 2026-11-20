import { register } from './registry.js';

/*
 * Lentille E059 — SECONDE PASSE (V2) : styles d'impression (print).
 *
 * Thème : passer d'un média continu (écran, pixels émis, défilement sans fin)
 * à un média paginé et fini (feuille de papier, bords, zone imprimable, trame).
 * Trois modes de sortie sont comparés : écran (tons continus), impression
 * couleur (repères en losange) et impression N&B (trame de points).
 *
 * Les dix chantiers (E059-01 … E059-10) sont réellement implémentés ci-dessous.
 * La V2 ajoute à la passe 1 : un badge de statut explicite sur la carte, un
 * tableau de mesures recalculées à chaque réglage, une fiche de vérité à trois
 * faits sourcés, un défi falsifiable en cinq temps aligné sur le modèle de
 * trame, un bouton de remise à zéro et une boucle rAF unique suspendue à la
 * fois sur document.hidden, hors champ (IntersectionObserver) et en mouvement
 * réduit. Tout le contenu pédagogique est du texte sémantique indexable
 * (h2/h3/p/ol/li/table/caption/th/td) présent dans le DOM ; le canvas n'est
 * qu'un laboratoire qui illustre des formules déterministes.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e059-` (aucune collision avec la passe 1 `geography-e059-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e059';

const ID = {
  panel: 'geography-v2-e059-panel',
  title: 'geography-v2-e059-title',
  lead: 'geography-v2-e059-lead',
  facts: 'geography-v2-e059-facts',
  classTable: 'geography-v2-e059-comparaison',
  mode: 'geography-v2-e059-mode',
  density: 'geography-v2-e059-density',
  densityValue: 'geography-v2-e059-density-value',
  densityLabel: 'geography-v2-e059-density-label',
  canvas: 'geography-v2-e059-canvas',
  canvasDesc: 'geography-v2-e059-canvas-desc',
  legend: 'geography-v2-e059-legend',
  modelsTitle: 'geography-v2-e059-models-title',
  models: 'geography-v2-e059-models',
  defiTitle: 'geography-v2-e059-defi-title',
  defi: 'geography-v2-e059-defi',
  readout: 'geography-v2-e059-readout',
  play: 'geography-v2-e059-play',
  reset: 'geography-v2-e059-reset',
  note: 'geography-v2-e059-note',
  badge: 'geography-v2-e059-badge',
};

const MODE_ORDER = ['ecran', 'couleur', 'nb'];

/* E059-03 / E059-06 : trois modes de sortie, code non chromatique distinct. */
const MODES = {
  ecran: {
    label: 'Écran — tons continus',
    detail: 'À l’écran, le pixel émet la couleur : le dégradé est continu, sans trame. Forme : un rectangle plein.',
  },
  couleur: {
    label: 'Impression couleur — repères en losange',
    detail: 'En couleur, des repères en losange figurent la séparation des encres ; le ton reste lisible en gris. Forme : un losange à 45°.',
  },
  nb: {
    label: 'Impression N&B — trame de points',
    detail: 'En noir et blanc, un disque plus ou moins gros code le ton : c’est le modèle de référence. Forme : un disque.',
  },
};

const LEGENDES = {
  ecran: 'Rectangle plein : ton continu émis par le pixel. Aucune trame, aucune pagination : le flux défile sans limite.',
  couleur: 'Losange à 45° : repère de séparation des encres. La forme distingue le mode sans dépendre de la couleur.',
  nb: 'Disque de rayon r = (p/2)·√ton : son aire est (π/4)·p²·ton, donc la couverture vaut (π/4)·ton. Tirets : zone imprimable ; trait de tête et flèche : progression de l’impression.',
};

/* E059-09 : défi falsifiable en cinq temps, aligné sur le modèle de trame. */
const DEFI = {
  prediction: 'Passer la tonalité de 60 % à 100 % doit porter la couverture d’encre de 47,1 % à 78,5 %.',
  reglage: 'Réglez le curseur de densité de 60 % à 100 %, mode Impression N&B.',
  attendu: 'La couverture atteint π/4 ≈ 78,5 % et le contraste du gris sur blanc passe sous le seuil 4,5:1.',
  falsification: 'Si la couverture ne suit pas C = (π/4)·t quand le ton monte, le modèle de disque inscrit est contredit.',
  debrief: 'Le ton est codé par l’aire du point, non par une couleur : plus l’encre couvre, plus le gris est sombre et le contraste faible.',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'nb',
  density: 0.6,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: null,
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};
const pct = (n, d = 1) => `${fmt(n * 100, d)} %`;

/* E059-05 : couverture maximale du modèle à points : un disque inscrit dans
 * une cellule carrée, soit π·(p/2)²/p² = π/4 ≈ 0,7854. */
const COUV_MAX = Math.PI / 4;
const PAGE_CONTENU = 1800; /* px de contenu simulé */
const PAGE_UTILE = 1000;   /* px imprimables par feuille */

/* ---------- Modèles déterministes (E059-05 à E059-08) ---------- */

/* E059-05 : ton local sur la feuille, fonction de la position uniquement —
 * une tache gaussienne et une bande sinusoïdale, jamais de hasard. */
function toneAt(u, v, base) {
  const du = u - 0.48;
  const dv = v - 0.55;
  const blob = Math.exp(-((du * du) / 0.045 + (dv * dv) / 0.075));
  const band = 0.5 + 0.5 * Math.sin((u * 2.6 + v * 1.7) * Math.PI);
  return clamp01(base * (0.30 + 0.70 * blob) + 0.12 * band * (1 - base));
}

/* E059-08 : grandeurs recalculées depuis les formules. */
function measures(density) {
  const t = clamp01(density);
  const couverture = COUV_MAX * t;
  const gris = 1 - couverture;                  /* réflectance perçue, papier blanc = 1 */
  const contraste = 1.05 / (gris + 0.05);       /* gris imprimé sur blanc, réf. 21:1 */
  const pages = Math.ceil(PAGE_CONTENU / PAGE_UTILE);
  return { t, couverture, gris, contraste, pages, couvMax: COUV_MAX };
}

function badgeText() {
  return 'Aperçu d’impression : ' + MODES[S.mode].label.toLowerCase()
    + ' — fond paginé, trame déterministe, aucune ressource distante.';
}

/* ---------- E059-01 / E059-02 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Une feuille imprimée est un média paginé et fini : la feuille a des bords et une zone imprimable, alors que l’écran défile sans limite. La feuille de style doit prévoir les ruptures avec @page et break-inside.',
    'Par défaut, les navigateurs n’impriment pas les fonds colorés : print-color-adjust: economy économise l’encre, exact conserve les couleurs quand elles portent une information.',
    'Un ton imprimé n’est pas un dégradé continu : une trame module la densité pour donner l’illusion du gris. En noir et blanc, un disque de rayon (p/2)·√ton dans une cellule de pas p couvre (π/4)·ton, au plus π/4 ≈ 78,5 %. Le noir sur blanc atteint 21:1, le seuil de lisibilité WCAG AA est 4,5:1.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e059-fait', texte));
  });
  return wrap;
}

function staticComparison(ctx) {
  const table = ctx.el('table', 'geography-v2-e059-table');
  table.id = ID.classTable;
  table.appendChild(ctx.el('caption', '',
    'Écran et papier : grandeurs de référence (valeurs déterministes, sans mesure matérielle).'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Propriété', 'Écran', 'Impression N&B', 'Remarque'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Couverture d’encre maximale', 'sans objet (pixel émis)', 'π/4 ≈ 78,5 %', 'disque inscrit dans une cellule carrée'],
    ['Contraste noir sur blanc', '21:1', '21:1', 'référence WCAG, papier vierge'],
    ['Seuil de lisibilité du texte', '4,5:1', '4,5:1', 'WCAG AA, à comparer à 21:1'],
    ['Fond coloré', 'conservé', 'souvent supprimé', 'print-color-adjust : economy / exact'],
    ['Découpe du contenu', 'défilement continu', 'pagination (2 feuilles)', '1 800 px / 1 000 px par feuille'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.setAttribute('scope', 'row');
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E059-08 : tableau des mesures recalculées (texte réel, mis à jour). */
const MODEL_ROWS = [
  ['couverture', 'Couverture d’encre', 'C = (π/4)·t'],
  ['gris', 'Gris perçu', 'G = 1 − C (papier blanc = 1)'],
  ['contraste', 'Contraste du gris', '1,05 / (G + 0,05)'],
  ['pages', 'Pagination', 'ceil(1 800 / 1 000)'],
];

function buildModelsTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e059-table');
  table.id = ID.models;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les formules et la tonalité courante ; les repères sont rappelés dans le tableau comparatif.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule déterministe', 'Résultat courant'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MODEL_ROWS.forEach(([key, label, formule]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const form = document.createElement('td');
    form.style.fontWeight = '400';
    form.textContent = formule;
    const value = document.createElement('td');
    value.textContent = '—';
    S.cells[key] = value;
    tr.append(th, form, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillModelsTable() {
  const c = S.cells;
  const m = measures(S.density);
  if (c.couverture) c.couverture.textContent = `${pct(m.couverture)} (repère π/4 = ${pct(m.couvMax)})`;
  if (c.gris) c.gris.textContent = `${fmt(m.gris)} sur 1,00`;
  if (c.contraste) c.contraste.textContent = `${fmt(m.contraste)}:1 (repères 21:1 et 4,5:1)`;
  if (c.pages) c.pages.textContent = `${m.pages} feuilles (flux continu à l’écran)`;
}

/* E059-09 : défi falsifiable en cinq temps (texte réel). */
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e059-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[key];
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

/* ---------- E059-03 / E059-04 : panneau et contrôles accessibles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
      density: document.getElementById(ID.density),
      densityOut: document.getElementById(ID.densityValue),
      densityLabel: document.getElementById(ID.densityLabel),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e059-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Styles d’impression : de l’écran à la feuille — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Imprimer une carte ne se limite pas à changer de couleur : le média paginé, l’économie d’encre et la trame transforment le rendu. '
    + 'Ce laboratoire compare trois modes de sortie à partir de formules déterministes. Les grandeurs sont écrites en toutes lettres '
    + 'dans le bandeau de lecture et dans les tableaux : le dessin ne fait qu’illustrer le calcul.');
  lead.id = ID.lead;

  /* E059-03 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.mode;
  fieldset.appendChild(ctx.el('legend', '', 'Mode de sortie (choix unique)'));
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e059-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e059-mode';
    radio.id = ID.mode + '-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value].label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Régler la densité d’encre');

  const densRow = ctx.el('div', 'geography-v2-e059-slider-row');
  const densLabel = document.createElement('label');
  densLabel.id = ID.densityLabel;
  densLabel.setAttribute('for', ID.density);
  densLabel.appendChild(document.createTextNode('Tonalité du fond : '));
  const densityOut = ctx.el('span', 'geography-v2-e059-valeur', '');
  densityOut.id = ID.densityValue;
  densLabel.appendChild(densityOut);
  const density = document.createElement('input');
  density.type = 'range';
  density.id = ID.density;
  density.min = '0';
  density.max = '100';
  density.step = '5';
  density.value = String(Math.round(S.density * 100));
  density.setAttribute('aria-label', 'Tonalité du fond, de 0 à 100 pour cent, par pas de 5');
  densRow.append(densLabel, density);

  /* E059-05 : laboratoire canvas, surface de dessin unique. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Aperçu d’une feuille imprimée. Flèches gauche et droite : changer de mode de sortie ; '
    + 'flèches haut et bas : régler la densité d’encre ; Origine : valeurs par défaut ; '
    + 'Entrée : réénoncer le résultat dans le bandeau.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite parcourent les trois modes, '
    + 'les flèches haut et bas règlent la densité par pas de 5, Origine restaure les valeurs par défaut '
    + 'et Entrée réénonce le bandeau. Chaque valeur est aussi écrite dans le tableau de mesures.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e059-legend', LEGENDES[S.mode]);
  legend.id = ID.legend;

  const modelsTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  modelsTitle.id = ID.modelsTitle;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  /* E059-08 : bandeau de lecture, annoncé aux technologies d’assistance. */
  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Le modèle de trame est prêt.';

  /* E059-10 : boutons ≥ 36 px (ici 44 px) ; aria-pressed pour la bascule. */
  const play = ctx.el('button', 'geography-v2-e059-btn', '▶ Animer la tête d’impression');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e059-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucun fond de carte réel n’est chargé, aucune requête réseau '
    + 'et aucun tirage aléatoire n’interviennent. Les grandeurs ci-dessus sont des textes réels, lisibles '
    + 'et indexables même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(ctx), staticComparison(ctx), fieldset, sub,
    densRow, canvas, canvasDesc, legend, modelsTitle, buildModelsTable(ctx),
    defiTitle, buildDefi(ctx), readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
    density, densityOut, densityLabel, canvas, legend,
    readout, play, reset,
    fresh: true,
  };
}

/* ---------- E059-04 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e059-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

function updateMapBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) badge.textContent = badgeText();
}

/* ---------- E059-05 / E059-06 / E059-07 : rendu du laboratoire ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 224;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* Papier : fond clair, bord de feuille et zone imprimable pointillée. */
  g.fillStyle = '#f6f2ea';
  g.fillRect(0, 0, cssW, cssH);
  const pad = 16;
  const pw = Math.max(10, cssW - pad * 2);
  const ph = Math.max(10, cssH - pad * 2);
  g.strokeStyle = 'rgba(40,34,28,.45)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, pw, ph);
  g.save();
  if (g.setLineDash) g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(40,34,28,.28)';
  g.strokeRect(pad + 8, pad + 8, pw - 16, ph - 16);
  g.restore();

  const ix = pad + 8;
  const iy = pad + 8;
  const iw = Math.max(4, pw - 16);
  const ih = Math.max(4, ph - 16);
  const pitch = 14;
  const cols = Math.max(1, Math.floor(iw / pitch));
  const rows = Math.max(1, Math.floor(ih / pitch));

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cx = ix + (c + 0.5) * pitch;
      const cy = iy + (r + 0.5) * pitch;
      const tone = toneAt((c + 0.5) / cols, (r + 0.5) / rows, S.density);
      if (S.mode === 'ecran') {
        /* Tons continus : le pixel émet un niveau de gris pleine cellule. */
        const gray = Math.round(255 * (1 - tone));
        g.fillStyle = `rgb(${gray},${gray},${gray})`;
        g.fillRect(cx - pitch / 2 + 1, cy - pitch / 2 + 1, pitch - 2, pitch - 2);
      } else if (S.mode === 'couleur') {
        /* Repère en losange (orientation 45°) : code non chromatique. */
        const rad = (pitch / 2) * Math.sqrt(tone);
        g.fillStyle = 'rgba(30,26,22,.82)';
        g.beginPath();
        g.moveTo(cx, cy - rad * 1.25);
        g.lineTo(cx + rad * 1.25, cy);
        g.lineTo(cx, cy + rad * 1.25);
        g.lineTo(cx - rad * 1.25, cy);
        g.closePath();
        g.fill();
      } else {
        /* Trame à points : rayon = (p/2)·√ton,aire = (π/4)·p²·ton. */
        const rad = (pitch / 2) * Math.sqrt(tone);
        g.fillStyle = 'rgba(24,20,16,.9)';
        g.beginPath();
        g.arc(cx, cy, rad, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  /* E059-07 — tête d'impression : position déterministe = f(S.sweep). */
  const headY = iy + S.sweep * ih;
  g.save();
  if (g.setLineDash) g.setLineDash([6, 4]);
  g.strokeStyle = 'rgba(120,74,20,.9)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(ix, headY);
  g.lineTo(ix + iw, headY);
  g.stroke();
  g.restore();
  g.fillStyle = 'rgba(120,74,20,.95)';
  g.beginPath();
  g.moveTo(ix - 2, headY - 5);
  g.lineTo(ix + 6, headY);
  g.lineTo(ix - 2, headY + 5);
  g.closePath();
  g.fill();
  g.font = '9px sans-serif';
  g.fillStyle = '#4a3a24';
  g.fillText('tête d’impression', ix + 8, Math.max(iy + 9, Math.min(iy + ih - 3, headY - 5)));
  g.fillText(MODES[S.mode].label, ix + 2, iy + ih - 3);
  g.fillText('page 1/2', ix + iw - 40, iy + ih - 3);
}

/* ---------- E059-08 : bandeau de lecture (role=status, aria-live) ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const m = measures(S.density);
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';
  add('À tonalité ');
  put(pct(m.t));
  add(' — couverture d’encre (modèle à points) : ');
  put(pct(m.couverture));
  add(', soit ');
  put(pct(m.couverture / m.couvMax));
  add(' de la référence π/4 = ');
  put(pct(m.couvMax));
  add(' à ton plein ; gris perçu : ');
  put(fmt(m.gris));
  add(' sur 1,00 (papier blanc) ; contraste du gris sur blanc : ');
  put(`${fmt(m.contraste)}:1`);
  add(', à comparer à 21:1 (noir sur blanc) et au seuil 4,5:1 ; pagination : ');
  put(`${m.pages} feuilles`);
  add(` pour ${PAGE_CONTENU} px de contenu à ${PAGE_UTILE} px par feuille, contre un flux continu à l’écran.`);
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.density) return;

  n.radios.forEach((r) => {
    if (r) r.checked = r.value === S.mode;
  });

  n.density.value = String(Math.round(S.density * 100));
  if (n.densityOut) n.densityOut.textContent = pct(S.density);

  if (n.legend) n.legend.textContent = LEGENDES[S.mode];
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’impression' : '▶ Animer la tête d’impression';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E059Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) {
    DEFI_ETAPES.forEach(([key]) => {
      const span = S.defiSpans[key];
      if (span) span.textContent = DEFI[key];
    });
  }
  updateMapBadge();
  fillModelsTable();
  updateReadout();
  drawLab();
}

function resetState() {
  S.mode = 'nb';
  S.density = 0.6;
  S.sweep = 0;
  S.playing = false;
  stopLoop();
  applyState();
}

/* ---------- E059-07 : boucle rAF unique, pauses multiples ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.playing) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

/* ---------- E059-10 : accessibilité, mouvement réduit, robustesse ---------- */

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l'écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) stopLoop(); else startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

function setMode(value) {
  if (MODE_ORDER.indexOf(value) === -1) return;
  S.mode = value;
  applyState();
}

function setDensity(value) {
  S.density = clamp01(Math.round(value / 5) * 5 / 100);
  applyState();
}

/* Câblage des contrôles (une seule fois sur un panneau fraîchement créé). */
function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      setMode(radio.value);
    });
  });

  n.density.addEventListener('input', () => {
    setDensity(Number(n.density.value));
  });

  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', resetState);

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const i = MODE_ORDER.indexOf(S.mode);
      setMode(MODE_ORDER[(i + step + MODE_ORDER.length) % MODE_ORDER.length]);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const step = event.key === 'ArrowUp' ? 5 : -5;
      setDensity(S.density * 100 + step);
    } else if (event.key === 'Home') {
      resetState();
    } else if (event.key === 'Enter') {
      updateReadout();
    } else {
      used = false;
    }
    if (used) event.preventDefault();
  });
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e059-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e059-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e059-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e059-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e059-panel .geography-v2-e059-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e059-panel .geography-v2-e059-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e059-panel .geography-v2-e059-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e059-panel .geography-v2-e059-table th,
.geography-v2-e059-panel .geography-v2-e059-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e059-panel .geography-v2-e059-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e059-panel .geography-v2-e059-table td{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e059-mode{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e059-mode legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e059-panel .geography-v2-e059-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e059-panel .geography-v2-e059-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e059-slider-row{margin:7px 0}
.geography-v2-e059-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e059-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e059-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e059-canvas{
  display:block;width:100%;height:224px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:#f6f2ea;touch-action:manipulation;
}
.geography-v2-e059-panel .geography-v2-e059-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e059-panel .geography-v2-e059-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e059-panel .geography-v2-e059-defi li{margin:3px 0}
.geography-v2-e059-panel .geography-v2-e059-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e059-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e059-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e059-panel .geography-v2-e059-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e059-panel .geography-v2-e059-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e059-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e059-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e059-panel[data-geography-v2-e059-reduced="1"] .geography-v2-e059-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e059-panel .geography-v2-e059-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e059-panel{font-size:10px;padding:9px}
  #geography-v2-e059-canvas{height:184px}
  .geography-v2-e059-panel .geography-v2-e059-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e059-panel{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E059', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
