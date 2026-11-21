import { register } from './registry.js';

/*
 * Lentille E071 — SECONDE PASSE (V2) : état de chargement et squelette, sans réseau.
 *
 * Thème : annoncer une attente sans rien charger, et dessiner une maquette qui
 * ne trompe pas l'œil. Le laboratoire compare la latence simulée aux quatre
 * seuils de réponse (100 ms, 400 ms, 1 s, 10 s), mesure le déplacement de mise
 * en page (CLS) quand le squelette est mal aligné, et illustre trois animations
 * déterministes (miroitement, pulsation, statique) avant la promotion vers le
 * contenu réel.
 *
 * Les dix chantiers (E071-01 … E071-10) sont réellement implémentés ci-dessous.
 * La V2 ajoute à la passe 1 : un badge de statut explicite sur la carte, un
 * tableau de mesures recalculées à chaque réglage, une fiche de vérité à trois
 * faits sourcés, un défi falsifiable en cinq temps aligné sur la formule de CLS,
 * un bouton de remise à zéro, des `aria-valuetext` sur les curseurs, un
 * `role="radiogroup"` explicite et une boucle rAF unique suspendue à la fois sur
 * document.hidden, hors champ (IntersectionObserver) et en mouvement réduit.
 * Tout le contenu pédagogique est du texte sémantique indexable
 * (h2/h3/p/ol/li/table/caption/th/td) présent dans le DOM ; le canvas n'est
 * qu'un laboratoire qui illustre des formules déterministes calculées localement.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e071-` (aucune collision avec la passe 1 `geography-e071-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e071';

const ID = {
  panel: 'geography-v2-e071-panel',
  title: 'geography-v2-e071-title',
  lead: 'geography-v2-e071-lead',
  facts: 'geography-v2-e071-facts',
  classTable: 'geography-v2-e071-comparaison',
  mode: 'geography-v2-e071-mode',
  latence: 'geography-v2-e071-latence',
  latenceValue: 'geography-v2-e071-latence-value',
  blocs: 'geography-v2-e071-blocs',
  blocsValue: 'geography-v2-e071-blocs-value',
  periode: 'geography-v2-e071-periode',
  periodeValue: 'geography-v2-e071-periode-value',
  ecart: 'geography-v2-e071-ecart',
  ecartValue: 'geography-v2-e071-ecart-value',
  canvas: 'geography-v2-e071-canvas',
  canvasDesc: 'geography-v2-e071-canvas-desc',
  measuresTitle: 'geography-v2-e071-mesures-title',
  measures: 'geography-v2-e071-mesures',
  defiTitle: 'geography-v2-e071-defi-title',
  defi: 'geography-v2-e071-defi',
  readout: 'geography-v2-e071-readout',
  play: 'geography-v2-e071-play',
  reset: 'geography-v2-e071-reset',
  note: 'geography-v2-e071-note',
  badge: 'geography-v2-e071-badge',
};

const MODE_ORDER = ['shimmer', 'pulse', 'statique'];

/* E071-04 / E071-05 : trois animations, libellées sans dépendre de la couleur. */
const MODES = {
  shimmer: {
    label: 'Miroitement — bande lumineuse gaussienne',
    detail: 'Une bande claire balaie le squelette : L(t) = 0,08 + 0,30 × e^(-((x−0,5)/0,12)²).',
  },
  pulse: {
    label: 'Pulsation — opacité triangulaire',
    detail: 'L’opacité monte puis descend : L(t) = 0,10 + 0,22 × (1 − |2x − 1|).',
  },
  statique: {
    label: 'Statique — gris fixe',
    detail: 'Aucune animation : la luminosité reste à 0,12, même hors mouvement réduit.',
  },
};

/* Seuils de réponse admis (valeurs de référence, en millisecondes). */
const SEUILS = [
  { signal: 'Instantané', ms: 100 },
  { signal: 'Seuil de Doherty', ms: 400 },
  { signal: 'Flux de pensée continu', ms: 1000 },
  { signal: 'Limite d’attention', ms: 10000 },
];

/* E071-09 : défi falsifiable en cinq temps, aligné sur la formule de CLS. */
const DEFI = {
  prediction: 'Avec 0 % d’écart, le CLS estimé vaut 0,02 (bon) ; à 40 % d’écart, il monte à 0,26 (mauvais).',
  reglage: 'Fixez la latence à 1 800 ms et quatre blocs, puis faites passer le curseur « écart » de 0 à 40 %.',
  attendu: 'Le verdict CLS passe de « bon » à « mauvais » dans la région live et le décalage devient visible dans le canvas (contour pointillé).',
  falsification: 'Si le verdict reste « bon » à 40 % ou si le décalage n’apparaît pas, alors clsEstime() ou la promotion est fausse.',
  debrief: 'Un squelette mal aligné peut être pire qu’un fond neutre : l’angle mort est la confiance accordée à une maquette qui ne correspond pas au contenu final.',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  latence: 1800,
  blocs: 4,
  periode: 1200,
  ecart: 0,
  mode: 'shimmer',
  playing: false,
  elapsed: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: null,
};

const QUEUE_CONTENT_MS = 1500; /* durée d'affichage du contenu après chargement */

const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '—';
  const f = Math.pow(10, d);
  return (Math.round(n * f) / f).toFixed(d).replace('.', ',');
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

function verdictLatence(ms) {
  if (ms <= 100) return 'Instantané — aucune attente perceptible';
  if (ms <= 400) return 'Seuil de Doherty respecté — attention maintenue';
  if (ms <= 1000) return 'Doherty dépassé — flux de pensée encore continu';
  if (ms <= 10000) return 'Flux de pensée rompu — attente consciente';
  return 'Limite d’attention atteinte — l’utilisateur décroche';
}

/* CLS estimé du décalage entre squelette et contenu réel.
   Référence : un CLS inférieur à 0,1 est considéré comme « bon ». */
function clsEstime(ecart) {
  return 0.02 + 0.006 * Math.max(0, Math.min(100, ecart));
}

function verdictCLS(cls) {
  if (cls < 0.1) return 'bon';
  if (cls < 0.25) return 'à améliorer';
  return 'mauvais';
}

/* Luminosité déterministe d'un bloc, comprise entre 0 et 1.
   Aucune graine aléatoire : la phase dépend seulement du rang du bloc. */
function luminosite(t, periode, mode, phase) {
  const x = (((t / periode) + phase) % 1 + 1) % 1;
  if (mode === 'statique') return 0.12;
  if (mode === 'pulse') return 0.10 + 0.22 * (1 - Math.abs(2 * x - 1));
  return 0.08 + 0.30 * Math.exp(-Math.pow((x - 0.5) / 0.12, 2));
}

/* Disposition déterministe des blocs, normalisée entre 0 et 1. */
function blocPositions(n) {
  const out = [{ x: 0.04, y: 0.05, w: 0.46, h: 0.12 }];
  const restants = Math.max(0, n - 1);
  const lignes = Math.max(1, Math.ceil(restants / 2));
  const pas = Math.min(0.17, 0.70 / lignes);
  for (let i = 0; i < restants; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    out.push({
      x: 0.04 + col * 0.48,
      y: 0.22 + row * pas,
      w: 0.44,
      h: pas * 0.72,
    });
  }
  return out;
}

/* E071-06 : grandeurs recalculées depuis les formules et les réglages. */
function measures() {
  const cls = clsEstime(S.ecart);
  return {
    cls,
    verdictCls: verdictCLS(cls),
    decal: (S.ecart / 100) * 0.10,
    cycle: S.latence + QUEUE_CONTENT_MS,
  };
}

function badgeText() {
  return 'État de chargement : squelette déterministe · seuils 100 / 400 / 1 000 / 10 000 ms · zéro réseau.';
}

/* ---------- E071-01 / E071-02 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Un état de chargement indique à la personne que le travail est en cours. Un squelette (ou « skeleton screen », écran-squelette) est une maquette grise qui reprend la forme du contenu à venir, sans charger la moindre donnée : il ne s’agit jamais d’un réseau, seulement d’une mise en page attendue.',
    'Un squelette efficace épouse la mise en page définitive : mêmes dimensions, mêmes positions. Sinon le contenu réel « saute » à son arrivée et provoque un déplacement de mise en page, mesuré par le CLS (cumulative layout shift), considéré comme « bon » sous 0,1 et « à améliorer » sous 0,25.',
    'L’animation de miroitement (shimmer) doit rester discrète et s’arrêter lorsque la personne préfère un mouvement réduit. La latence perçue dépend de seuils de réponse — 100 ms (instantané), 400 ms (Doherty), 1 s (flux continu), 10 s (limite d’attention) — et non de la seule durée réelle. Aucun tirage aléatoire n’intervient.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e071-fait', texte));
  });
  return wrap;
}

function staticComparison(ctx) {
  const table = ctx.el('table', 'geography-v2-e071-table');
  table.id = ID.classTable;
  table.appendChild(ctx.el('caption', '',
    'Seuils de réponse et verdicts de référence. Le verdict est recalculé par la même fonction verdictLatence() que le laboratoire.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Signal', 'Seuil', 'Verdict'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  SEUILS.forEach(({ signal, ms }) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = signal;
    const tdMs = document.createElement('td');
    tdMs.textContent = ms >= 1000 ? `${fmt(ms / 1000)} s` : `${ms} ms`;
    const tdVerdict = document.createElement('td');
    tdVerdict.textContent = verdictLatence(ms);
    tr.append(th, tdMs, tdVerdict);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E071-06 : tableau des mesures recalculées (texte réel, mis à jour). */
const MODEL_ROWS = [
  ['latence', 'Latence simulée', 'curseur de 0 à 8 000 ms'],
  ['verdict', 'Verdict de latence', 'réf. 100 / 400 / 1 000 / 10 000 ms'],
  ['cls', 'CLS estimé', '0,02 + 0,006 × écart'],
  ['decal', 'Décalage squelette → contenu', '(écart / 100) × 0,10 de largeur'],
  ['cycle', 'Cycle complet', 'latence + 1 500 ms'],
];

function buildMeasuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e071-table');
  table.id = ID.measures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les formules et les réglages courants ; les repères sont rappelés dans le tableau comparatif.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule / référence', 'Résultat courant'].forEach((h) => {
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

function fillMeasuresTable() {
  const c = S.cells;
  const m = measures();
  if (c.latence) c.latence.textContent = `${S.latence} ms`;
  if (c.verdict) c.verdict.textContent = verdictLatence(S.latence);
  if (c.cls) c.cls.textContent = `${fmt(m.cls)} — ${m.verdictCls} (réf. 0,1)`;
  if (c.decal) c.decal.textContent = `${fmt(m.decal)} de largeur (${S.ecart} %) ; contour pointillé si > 0`;
  if (c.cycle) c.cycle.textContent = `${m.cycle} ms`;
}

/* E071-09 : défi falsifiable en cinq temps (texte réel). */
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e071-defi');
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

/* ---------- E071-03 / E071-04 / E071-05 : panneau et contrôles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function sliderRow(ctx, id, valueId, libelle, min, max, step, valeur, unite, aria) {
  const row = ctx.el('div', 'geography-v2-e071-slider-row');
  const label = document.createElement('label');
  label.id = id + '-label';
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(libelle + ' : '));
  const out = ctx.el('span', 'geography-v2-e071-valeur', unite(valeur));
  out.id = valueId;
  label.appendChild(out);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(valeur);
  input.setAttribute('aria-label', aria);
  input.setAttribute('aria-describedby', valueId);
  row.append(label, input);
  return { row, input, out, unite, aria };
}

const SLIDERS = {
  latence: (v) => `${v} ms`,
  blocs: (v) => `${v}`,
  periode: (v) => `${v} ms`,
  ecart: (v) => `${v} %`,
};

function valuetext(key, v) {
  if (key === 'latence') return `${v} millisecondes`;
  if (key === 'blocs') return `${v} blocs`;
  if (key === 'periode') return `${v} millisecondes`;
  return `${v} pour cent`;
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
      latence: document.getElementById(ID.latence),
      blocs: document.getElementById(ID.blocs),
      periode: document.getElementById(ID.periode),
      ecart: document.getElementById(ID.ecart),
      canvas: document.getElementById(ID.canvas),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e071-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'État de chargement et squelette, sans réseau — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Un squelette est une maquette grise qui annonce la forme du contenu à venir. Ce laboratoire montre, sans aucune requête, '
    + 'comment la latence, l’alignement du squelette et son animation changent la perception de l’attente. '
    + 'Les grandeurs sont écrites en toutes lettres dans le bandeau de lecture et dans les tableaux : le dessin ne fait qu’illustrer le calcul.');
  lead.id = ID.lead;

  /* E071-04 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.mode;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Animation du squelette (choix unique)');
  fieldset.appendChild(ctx.el('legend', '', 'Animation du squelette (choix unique)'));
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e071-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e071-mode';
    radio.id = ID.mode + '-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value].label.split(' — ')[0]));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Réglages déterministes');

  /* E071-05 : quatre curseurs natifs avec valeur et aria-valuetext. */
  const lat = sliderRow(ctx, ID.latence, ID.latenceValue, 'Latence simulée', 0, 8000, 200,
    S.latence, SLIDERS.latence, 'Latence simulée, de 0 à 8 000 millisecondes, par pas de 200');
  const blocs = sliderRow(ctx, ID.blocs, ID.blocsValue, 'Nombre de blocs', 2, 6, 1,
    S.blocs, SLIDERS.blocs, 'Nombre de blocs du squelette, de 2 à 6');
  const per = sliderRow(ctx, ID.periode, ID.periodeValue, 'Période d’animation', 600, 2000, 100,
    S.periode, SLIDERS.periode, 'Période de l’animation, de 600 à 2 000 millisecondes, par pas de 100');
  const ecart = sliderRow(ctx, ID.ecart, ID.ecartValue, 'Écart squelette / contenu', 0, 100, 5,
    S.ecart, SLIDERS.ecart, 'Écart entre le squelette et le contenu final, de 0 à 100 pour cent, par pas de 5');
  S.sliders = { latence: lat, blocs: blocs, periode: per, ecart: ecart };

  /* E071-03 : laboratoire canvas, surface de dessin unique. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Squelette de chargement puis contenu réel. Flèche gauche ou droite : latence ; '
    + 'flèche haut ou bas : écart ; touches 1, 2, 3 : miroitement, pulsation ou statique ; '
    + 'Origine : valeurs par défaut ; Entrée : réénoncer le bandeau.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite règlent la latence par pas de 200 ms, '
    + 'les flèches haut et bas l’écart par pas de 5, les touches 1/2/3 choisissent l’animation, '
    + 'Origine restaure les valeurs par défaut et Entrée réénonce le bandeau. '
    + 'Chaque valeur est aussi écrite dans le tableau des mesures.');
  canvasDesc.id = ID.canvasDesc;

  const measuresTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  measuresTitle.id = ID.measuresTitle;
  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  /* E071-08 : bandeau de lecture, annoncé aux technologies d'assistance. */
  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Le modèle de squelette est prêt.';

  /* E071-10 : boutons ≥ 36 px (ici 44 px) ; aria-pressed pour la bascule. */
  const play = ctx.el('button', 'geography-v2-e071-btn', '▶ Lancer la simulation');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e071-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucune donnée, police ou image n’est chargée, aucune requête réseau '
    + 'et aucun tirage aléatoire n’interviennent. Les grandeurs ci-dessus sont des textes réels, lisibles et indexables '
    + 'même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(
    title, lead, staticFacts(ctx), staticComparison(ctx), fieldset, sub,
    lat.row, lat.input, blocs.row, blocs.input, per.row, per.input, ecart.row, ecart.input,
    canvas, canvasDesc, measuresTitle, buildMeasuresTable(ctx),
    defiTitle, buildDefi(ctx), readout, play, reset, note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
    latence: lat.input, blocs: blocs.input, periode: per.input, ecart: ecart.input,
    canvas, canvasDesc, readout, play, reset,
    fresh: true,
  };
}

/* ---------- E071-08 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e071-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E071-03 / E071-06 / E071-07 : rendu du laboratoire ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 24;
  const barH = 12;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - barH - 12);
  const m = measures();

  /* Cadre et graticule : repères non chromatiques (tirets). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.18)';
  g.setLineDash([2, 5]);
  for (let k = 1; k < 4; k += 1) {
    const gy = pad + (ih * k) / 4;
    g.beginPath(); g.moveTo(pad, gy); g.lineTo(pad + iw, gy); g.stroke();
  }
  g.setLineDash([]);

  const charge = S.elapsed < S.latence;
  const p = S.latence > 0 ? Math.min(1, S.elapsed / S.latence) : 1;
  const positions = blocPositions(S.blocs);
  const decal = m.decal;

  positions.forEach((b, i) => {
    const x = pad + (b.x + (charge ? 0 : decal)) * iw;
    const y = pad + b.y * ih;
    const w = b.w * iw;
    const h = b.h * ih;
    if (charge) {
      const lum = S.reduced ? 0.12 : luminosite(S.elapsed, S.periode, S.mode, i / Math.max(1, S.blocs));
      const gris = Math.round(150 + lum * 90);
      g.fillStyle = `rgba(${gris},${gris},${gris},.55)`;
      g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(244,214,158,.28)';
      g.lineWidth = 1;
      g.strokeRect(x, y, w, h);
    } else {
      /* Contenu réel : barres de texte, décalées de `decal` si écart > 0. */
      g.fillStyle = 'rgba(244,214,158,.75)';
      g.fillRect(x, y, w * (i === 0 ? 0.62 : 1), Math.max(2, h * 0.30));
      g.fillStyle = 'rgba(214,207,193,.55)';
      const lignes = i === 0 ? 1 : 2;
      for (let l = 0; l < lignes; l += 1) {
        g.fillRect(x, y + h * 0.42 + l * h * 0.22, w * (0.92 - l * 0.18), Math.max(1, h * 0.10));
      }
      if (S.ecart > 0) {
        g.strokeStyle = 'rgba(230,185,111,.65)';
        g.setLineDash([3, 3]);
        g.strokeRect(x - decal * iw, y, w, h);
        g.setLineDash([]);
      }
    }
  });

  /* Bandeau d'état, lu directement et repris dans la région live. */
  const phase = charge
    ? `Chargement · ${Math.round(p * 100)} %`
    : 'Contenu affiché';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`${phase} · latence ${S.latence} ms · ${MODES[S.mode].label.split(' — ')[0]}`, pad + 2, pad + 13);
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(`CLS estimé ${fmt(m.cls)} (${m.verdictCls}) · écart ${S.ecart} %`, pad + 2, pad + 26);

  /* Barre de progression alimentée par la même horloge. */
  const barY = cssH - pad - barH + 6;
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(pad, barY, iw, barH);
  g.fillStyle = 'rgba(244,214,158,.55)';
  g.fillRect(pad + 1, barY + 1, (iw - 2) * Math.min(1, S.elapsed / Math.max(1, m.cycle)), barH - 2);
}

/* ---------- E071-08 : bandeau de lecture (role=status, aria-live) ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const m = measures();
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  const pctCycle = Math.round((S.elapsed / Math.max(1, m.cycle)) * 100);
  const charge = S.elapsed < S.latence;
  n.textContent = '';
  add(charge ? 'Phase chargement · ' : 'Phase contenu · ');
  put(`${pctCycle} %`);
  add(' du cycle · latence ');
  put(`${S.latence} ms`);
  add(` (référence : ${verdictLatence(S.latence)}) · CLS estimé `);
  put(fmt(m.cls));
  add(` — ${m.verdictCls} (référence : 0,1) · écart ${S.ecart} % · ${MODES[S.mode].label}.`);
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.latence) return;

  n.radios.forEach((r) => {
    if (r) r.checked = r.value === S.mode;
  });

  const sl = S.sliders;
  if (sl) {
    Object.keys(sl).forEach((key) => {
      const s = sl[key];
      const v = S[key];
      if (!s) return;
      if (s.input) {
        s.input.value = String(v);
        s.input.setAttribute('aria-valuetext', valuetext(key, v));
      }
      if (s.out) s.out.textContent = s.unite(v);
    });
  }

  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la simulation' : '▶ Lancer la simulation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E071Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) {
    DEFI_ETAPES.forEach(([key]) => {
      const span = S.defiSpans[key];
      if (span) span.textContent = DEFI[key];
    });
  }
  fillMeasuresTable();
  updateReadout();
  drawLab();
}

function resetState() {
  S.latence = 1800;
  S.blocs = 4;
  S.periode = 1200;
  S.ecart = 0;
  S.mode = 'shimmer';
  S.playing = false;
  S.elapsed = 0;
  stopLoop();
  applyState();
}

/* ---------- E071-10 : boucle rAF unique, pauses multiples ---------- */

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

/* Horloge unique : une seule fonction tick, un seul identifiant rafId.
   Tous les éléments animés lisent la même valeur de elapsed. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.playing) { stopLoop(); return; }
  if (S.lastTs) {
    /* dt plafonné : un retour d'onglet ne provoque pas de saut. */
    const dt = Math.min(64, Math.max(0, ts - S.lastTs));
    const cycle = S.latence + QUEUE_CONTENT_MS;
    S.elapsed = (S.elapsed + dt) % cycle;
  }
  S.lastTs = ts;
  drawLab();
  updateReadout();
  S.rafId = requestAnimationFrame(tick);
}

/* ---------- E071-10 : accessibilité, mouvement réduit, robustesse ---------- */

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
        if (S.reduced) {
          S.playing = false;
          S.elapsed = S.latence + QUEUE_CONTENT_MS / 2;
          stopLoop();
          applyState();
        } else {
          startLoop();
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

function setMode(value) {
  if (MODE_ORDER.indexOf(value) === -1) return;
  S.mode = value;
  S.elapsed = 0;
  applyState();
}

function setLatence(value) {
  S.latence = Math.max(0, Math.min(8000, Math.round(value / 200) * 200));
  S.elapsed = 0;
  applyState();
}

function setBlocs(value) {
  S.blocs = Math.max(2, Math.min(6, Math.round(value)));
  applyState();
}

function setPeriode(value) {
  S.periode = Math.max(600, Math.min(2000, Math.round(value / 100) * 100));
  applyState();
}

function setEcart(value) {
  S.ecart = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
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

  n.latence.addEventListener('input', () => setLatence(Number(n.latence.value)));
  n.blocs.addEventListener('input', () => setBlocs(Number(n.blocs.value)));
  n.periode.addEventListener('input', () => setPeriode(Number(n.periode.value)));
  n.ecart.addEventListener('input', () => setEcart(Number(n.ecart.value)));

  n.play.addEventListener('click', () => {
    if (S.reduced) {
      S.playing = false;
      S.elapsed = S.latence + QUEUE_CONTENT_MS / 2;
      stopLoop();
      applyState();
      return;
    }
    S.playing = !S.playing;
    if (!S.playing) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', resetState);

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      setLatence(S.latence + (event.key === 'ArrowRight' ? 200 : -200));
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      setEcart(S.ecart + (event.key === 'ArrowUp' ? 5 : -5));
    } else if (event.key === '1' || event.key === '2' || event.key === '3') {
      setMode(MODE_ORDER[Number(event.key) - 1]);
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
.geography-v2-e071-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e071-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e071-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e071-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e071-panel .geography-v2-e071-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e071-panel .geography-v2-e071-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e071-panel .geography-v2-e071-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e071-panel .geography-v2-e071-table th,
.geography-v2-e071-panel .geography-v2-e071-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e071-panel .geography-v2-e071-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e071-panel .geography-v2-e071-table td{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e071-mode{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e071-mode legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e071-panel .geography-v2-e071-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e071-panel .geography-v2-e071-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e071-slider-row{margin:7px 0}
.geography-v2-e071-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e071-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e071-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e071-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.32);touch-action:manipulation;
}
.geography-v2-e071-panel .geography-v2-e071-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e071-panel .geography-v2-e071-defi li{margin:3px 0}
.geography-v2-e071-panel .geography-v2-e071-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e071-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e071-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e071-panel .geography-v2-e071-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e071-panel .geography-v2-e071-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e071-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e071-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e071-panel[data-geography-v2-e071-reduced="1"] .geography-v2-e071-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e071-panel .geography-v2-e071-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e071-panel{font-size:10px;padding:9px}
  #geography-v2-e071-canvas{height:200px}
  .geography-v2-e071-panel .geography-v2-e071-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e071-panel{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E071', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) {
    S.playing = false;
    S.elapsed = S.latence + QUEUE_CONTENT_MS / 2;
  }

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
