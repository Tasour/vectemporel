import { register } from './registry.js';

/*
 * Lentille E089 — SECONDE PASSE (V2) : unités de distance et conversions.
 *
 * Thème : la vue GEOGRAPHIE projette des lieux dans un cadre schématique
 * lat/lon sans jamais dire ce que vaut une distance à l'écran, ni comment le
 * kilomètre, le mille terrestre et le mille marin se convertissent. La V2
 * ajoute à la passe 1 une fiche de vérité à trois faits sourcés, un tableau de
 * mesures recalculé à chaque réglage, un défi falsifiable en cinq temps, un
 * bouton de remise à zéro, un badge de statut sur la carte et une boucle rAF
 * unique suspendue à trois garde-fous (onglet masqué, hors champ, mouvement
 * réduit).
 *
 * Les dix chantiers (E089-01 … E089-10) sont réellement implémentés ci-dessous.
 * Tout le contenu pédagogique est du texte sémantique indexable (h2/h3/p/ol/
 * li/table/caption/th/td/fieldset/legend/label) présent dans le DOM : il reste
 * lisible sans animation ni interaction. Le canvas n'est qu'un laboratoire
 * déterministe qui illustre des définitions exactes, jamais leur seul support.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e089-` (aucune collision avec la passe 1 `geography-e089-`).
 * Zéro sortie de débogage, zéro appel réseau, zéro tirage aléatoire.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e089';

const ID = {
  panel: 'geography-v2-e089-panel',
  title: 'geography-v2-e089-title',
  lead: 'geography-v2-e089-lead',
  facts: 'geography-v2-e089-facts',
  equivalences: 'geography-v2-e089-equivalences',
  source: 'geography-v2-e089-source',
  target: 'geography-v2-e089-target',
  distance: 'geography-v2-e089-distance',
  distanceLabel: 'geography-v2-e089-distance-label',
  distanceValue: 'geography-v2-e089-distance-value',
  canvas: 'geography-v2-e089-canvas',
  canvasDesc: 'geography-v2-e089-canvas-desc',
  legend: 'geography-v2-e089-legend',
  mesuresTitle: 'geography-v2-e089-mesures-title',
  mesures: 'geography-v2-e089-mesures',
  defiTitle: 'geography-v2-e089-defi-title',
  defi: 'geography-v2-e089-defi',
  readout: 'geography-v2-e089-readout',
  badgeText: 'geography-v2-e089-badge-text',
  play: 'geography-v2-e089-play',
  reset: 'geography-v2-e089-reset',
  note: 'geography-v2-e089-note',
  badge: 'geography-v2-e089-badge',
};

/* Définitions internationales exactes (aucune valeur inventée). */
const MI_KM = 1.609344;  /* 1 mille terrestre international = 1 609,344 m */
const NM_KM = 1.852;     /* 1 mille marin international = 1 852 m */
const UNITS = {
  km: { short: 'km', nom: 'kilomètre', auKm: 1, dash: [] },
  mi: { short: 'mi', nom: 'mille terrestre', auKm: MI_KM, dash: [7, 4] },
  nm: { short: 'M', nom: 'mille marin', auKm: NM_KM, dash: [2, 3] },
};
const ORDER = ['km', 'mi', 'nm'];
const DIST_MIN = 1;
const DIST_MAX = 500;
const DIST_DEF = 100;

/* E089-10 : défi falsifiable en cinq temps, aligné sur les définitions exactes. */
const DEFI = {
  prediction: 'Un mille marin et un mille terrestre : lequel est le plus long, et de combien environ — 1 %, 15 % ou 50 % ? D’autre part, 100 km valent-ils plus ou moins de 100 milles ?',
  reglage: 'Réglez source = kilomètre, cible = mille terrestre et distance = 100 ; relevez le facteur et la conversion. Puis passez la cible sur mille marin sans toucher au reste.',
  attendu: '1 km = 0,6214 mi et 100 km = 62,1371 mi. Le mille marin (1 852 m) dépasse le mille terrestre (1 609,344 m) de 15,08 % ; une unité plus longue étant plus rare, 100 km = 53,9957 milles marins : moins de milles marins que de milles terrestres.',
  falsification: 'Si vous lisez 100 km ≈ 100 milles, vous avez ignoré le facteur 1,609344. Si vous annoncez un écart de 1 % entre les deux milles, vous confondez mille et millier. Si vous dites le mille marin plus court, vous avez inversé la division 1 852 / 1 609,344.',
  debrief: 'Les facteurs sont des définitions, pas des mesures : 1 mi = 1 609,344 m exactement, 1 M = 1 852 m exactement. Le nombre d’unités cible pour une distance donnée vaut la distance en km divisée par la longueur de l’unité cible en km : plus l’unité est longue, moins il en faut. Le badge rappelle que la carte schématique n’est pas à l’échelle métrique.',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  source: 'km',
  target: 'mi',
  distance: DIST_DEF,
  sweep: 0.5,
  playing: false,
  rafId: 0,
  lastTs: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: null,
};

/* ---------- utilitaires et formules déterministes (aucun aléa) ---------- */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const fmt = (n, d = 0) => {
  if (!Number.isFinite(n)) return '—';
  const p = 10 ** d;
  const v = Math.abs(n) < 0.5 / p ? 0 : n;
  const fixed = (Math.round(v * p) / p).toFixed(d);
  const parts = fixed.split('.');
  const groupe = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return parts[1] ? `${groupe},${parts[1]}` : groupe;
};

function versKm(valeur, unite) {
  return valeur * (UNITS[unite] ? UNITS[unite].auKm : 1);
}

function depuisKm(km, unite) {
  return km / (UNITS[unite] ? UNITS[unite].auKm : 1);
}

/* Combien d'unités `cible` pour une unité `source` ? */
function facteur(source, cible) {
  return depuisKm(versKm(1, source), cible);
}

function conversion(distance, source, cible) {
  return depuisKm(versKm(distance, source), cible);
}

function ecartMilles() {
  return (NM_KM / MI_KM - 1) * 100;
}

function pasAimable(valeur) {
  const brut = Math.max(0.2, valeur / 5);
  const mag = 10 ** Math.floor(Math.log10(brut));
  const r = brut / mag;
  const mul = r <= 1 ? 1 : (r <= 2 ? 2 : (r <= 5 ? 5 : 10));
  return mul * mag;
}

function libelleUnite(unite) {
  return UNITS[unite] ? UNITS[unite].nom : 'kilomètre';
}

function badgeText() {
  return `Conversion : ${fmt(S.distance)} ${libelleUnite(S.source)} = ${fmt(conversion(S.distance, S.source, S.target))} ${libelleUnite(S.target)}. Repère schématique : les distances à l’écran ne sont pas à l’échelle métrique.`;
}

/* ---------- E089-01 / E089-02 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Le mètre est l’unité de base de longueur du système international (définition du BIPM) ; le kilomètre vaut exactement 1 000 mètres. C’est la référence à laquelle toutes les conversions ci-dessous sont ramenées.',
    'Le mille terrestre international (statute mile) vaut exactement 1 609,344 mètres, soit 1,609344 km ; un kilomètre vaut donc 1 / 1,609344 ≈ 0,621371 mille. Ce facteur est une définition, pas une approximation de mesure.',
    `Le mille marin international vaut exactement 1 852 mètres, soit 1,852 km. Il ne faut pas le confondre avec le mille terrestre : il est plus long de ${fmt(ecartMilles(), 2)} % (1 852 / 1 609,344 − 1). Le laboratoire ne superpose jamais ces deux unités sans le dire.`,
  ];
  faits.forEach((texte) => wrap.appendChild(ctx.el('p', 'geography-v2-e089-fait', texte)));
  return wrap;
}

/* Tableau d'équivalences : toutes les cellules dérivées des définitions. */
function staticComparison(ctx) {
  const table = ctx.el('table', 'geography-v2-e089-table');
  table.id = ID.equivalences;
  table.appendChild(ctx.el('caption', '',
    'Équivalences de référence — facteurs exacts : 1 mille = 1 609,344 m, 1 mille marin = 1 852 m, 1 km = 1 000 m. Chaque cellule est recalculée par les formules du laboratoire.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Quantité', 'En kilomètres', 'En milles terrestres', 'En milles marins'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['1 kilomètre', 1, 'km'],
    ['1 mille terrestre', 1, 'mi'],
    ['1 mille marin', 1, 'nm'],
    ['100 kilomètres', 100, 'km'],
  ];
  lignes.forEach(([libelle, valeur, unite]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = libelle;
    tr.appendChild(th);
    const km = versKm(valeur, unite);
    ORDER.forEach((u) => {
      const td = document.createElement('td');
      td.textContent = fmt(depuisKm(km, u), 6);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E089-02 : second tableau, recalculé à chaque réglage. */
const MODEL_ROWS = [
  ['conversion', 'Conversion courante',
    'depuisKm(versKm(distance ; source) ; cible)',
    () => `${fmt(S.distance)} ${libelleUnite(S.source)} = ${fmt(conversion(S.distance, S.source, S.target))} ${libelleUnite(S.target)}`],
  ['facteur', 'Facteur source → cible',
    'depuisKm(versKm(1 ; source) ; cible)',
    () => `1 ${UNITS[S.source].short} = ${fmt(facteur(S.source, S.target))} ${UNITS[S.target].short}`],
  ['km', 'Distance en kilomètres',
    'versKm(distance ; source)',
    () => `${fmt(versKm(S.distance, S.source), 6)} km`],
  ['refMi', 'Référence mille terrestre',
    'définition exacte : 1 mi = 1 609,344 m',
    () => '1 mi = 1,609344 km · 1 km = 0,621371 mi'],
  ['refNm', 'Référence mille marin',
    'définition exacte : 1 M = 1 852 m',
    () => '1 M = 1,852 km · 1 km = 0,539957 M'],
  ['ecart', 'Écart des deux milles',
    '(1 852 / 1 609,344 − 1) × 100',
    () => `${fmt(ecartMilles(), 2)} %`],
  ['pas', 'Pas de graduation du repère',
    'pasAimable(distance)',
    () => fmt(pasAimable(S.distance), pasAimable(S.distance) < 1 ? 1 : 0)],
];

function buildMesuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e089-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les définitions exactes et le réglage courant ; les repères sont rappelés dans le tableau d’équivalences.'));

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

function fillMesuresTable() {
  MODEL_ROWS.forEach(([key, , , compute]) => {
    const cellule = S.cells[key];
    if (cellule) cellule.textContent = compute();
  });
}

/* E089-10 : défi falsifiable en cinq temps (texte réel). */
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e089-defi');
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

/* ---------- E089-04 / E089-05 / E089-08 : panneau et contrôles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function radioGroup(ctx, nom, id, legende, etatKey) {
  const fieldset = document.createElement('fieldset');
  fieldset.id = id;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.appendChild(ctx.el('legend', '', legende));
  ORDER.forEach((u) => {
    const lab = ctx.el('label', 'geography-v2-e089-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = nom;
    radio.id = `${id}-${u}`;
    radio.value = u;
    radio.checked = S[etatKey] === u;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(UNITS[u].nom));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      fresh: false,
      src: ORDER.map((u) => document.getElementById(ID.source + '-' + u)),
      tgt: ORDER.map((u) => document.getElementById(ID.target + '-' + u)),
      distance: document.getElementById(ID.distance),
      distanceOut: document.getElementById(ID.distanceValue),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      badgeText: document.getElementById(ID.badgeText),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
    };
  }

  panel = ctx.el('section', 'geography-v2-e089-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Unités de distance et conversions — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Le kilomètre, le mille terrestre et le mille marin ne mesurent pas la même réalité : connaître leur facteur exact permet de convertir sans approximation. '
    + 'Ce laboratoire superpose deux échelles d’une même distance et écrit chaque grandeur en toutes lettres dans les tableaux et le bandeau de lecture.');
  lead.id = ID.lead;

  /* E089-05 : deux choix exclusifs → fieldset/radiogroup, jamais aria-pressed. */
  const source = radioGroup(ctx, 'geography-v2-e089-source', ID.source,
    'Unité de la distance saisie (choix unique)', 'source');
  const target = radioGroup(ctx, 'geography-v2-e089-target', ID.target,
    'Unité de conversion affichée (choix unique)', 'target');

  const sub = ctx.el('h3', '', 'Régler la distance à convertir');

  /* E089-04 : curseur de distance avec valeur annoncée. */
  const distanceRow = ctx.el('div', 'geography-v2-e089-slider-row');
  const distanceLabel = document.createElement('label');
  distanceLabel.id = ID.distanceLabel;
  distanceLabel.setAttribute('for', ID.distance);
  distanceLabel.appendChild(document.createTextNode('Distance mesurée : '));
  const distanceOut = ctx.el('span', 'geography-v2-e089-valeur', '');
  distanceOut.id = ID.distanceValue;
  distanceLabel.appendChild(distanceOut);
  const distance = document.createElement('input');
  distance.type = 'range';
  distance.id = ID.distance;
  distance.min = String(DIST_MIN);
  distance.max = String(DIST_MAX);
  distance.step = '1';
  distance.value = String(S.distance);
  distance.setAttribute('aria-label', `Distance dans l’unité source, de ${fmt(DIST_MIN)} à ${fmt(DIST_MAX)}`);
  distanceRow.append(distanceLabel, distance);

  /* E089-03 / E089-08 : canvas focalisable, étiqueté, équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Deux règles graduées superposées représentant la même distance : l’échelle haute est l’unité source, l’échelle basse l’unité cible. '
    + 'Flèche gauche ou droite : déplacer le repère ; flèche haut ou bas : changer la distance ; '
    + 'Entrée : faire défiler les unités cibles ; Origine : revenir à 100 kilomètres vers milles terrestres ; '
    + 'Espace : lancer ou arrêter le déplacement du repère. '
    + 'Trait plein, tirets et pointillés distinguent les unités indépendamment de la couleur.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite déplacent le repère par pas de 0,05, '
    + 'les flèches haut et bas changent la distance par pas de 10, Entrée fait défiler les unités cibles, '
    + 'Origine restaure 100 kilomètres vers milles terrestres, Espace lance ou arrête l’animation. '
    + 'Chaque valeur est aussi écrite dans le tableau de mesures et dans le bandeau.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e089-legend', '');
  legend.id = ID.legend;

  const mesuresTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  mesuresTitle.id = ID.mesuresTitle;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  /* E089-07 : bandeau de lecture, annoncé aux technologies d'assistance. */
  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Le modèle de conversion est prêt.';

  const badgeText = ctx.el('p', 'geography-v2-e089-badge-text', badgeText());
  badgeText.id = ID.badgeText;

  /* E089-10 : boutons ≥ 36 px (ici 44 px) ; aria-pressed pour la bascule. */
  const play = ctx.el('button', 'geography-v2-e089-btn', '▶ Animer le repère');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e089-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : les deux règles dessinées découlent uniquement de définitions exactes, '
    + 'aucune donnée géographique n’est chargée, aucune requête réseau et aucun tirage aléatoire n’interviennent. '
    + 'Les grandeurs ci-dessus sont des textes réels, lisibles et indexables même sans animation ; '
    + 'la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(ctx), staticComparison(ctx), source, target, sub,
    distanceRow, distance, canvas, canvasDesc, legend,
    mesuresTitle, buildMesuresTable(ctx), defiTitle, buildDefi(ctx),
    readout, badgeText, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    src: ORDER.map((u) => document.getElementById(ID.source + '-' + u)),
    tgt: ORDER.map((u) => document.getElementById(ID.target + '-' + u)),
    distance, distanceOut, canvas, legend, readout, badgeText, play, reset,
  };
}

/* ---------- E089-07 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e089-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

function updateMapBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) badge.textContent = badgeText();
}

/* ---------- E089-03 / E089-08 : rendu du laboratoire ---------- */

function drawScale(g, y, left, width, unite, titre) {
  const dash = UNITS[unite].dash || [];
  if (g.setLineDash) g.setLineDash(dash);
  g.strokeStyle = 'rgba(214,207,193,.75)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(left, y);
  g.lineTo(left + width, y);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  const pas = pasAimable(S.distance);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.textAlign = 'center';
  for (let v = 0; v <= S.distance + 1e-9; v += pas) {
    const x = left + (v / S.distance) * width;
    g.beginPath();
    g.moveTo(x, y - 5);
    g.lineTo(x, y + 5);
    g.strokeStyle = 'rgba(214,207,193,.75)';
    g.lineWidth = 1;
    g.stroke();
    g.fillText(fmt(v, pas < 1 ? 1 : 0), x, y + (y < 110 ? -9 : 16));
  }
  g.textAlign = 'left';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(titre, left, y + (y < 110 ? -22 : 28));
}

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
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

  const left = 24;
  const right = cssW - 24;
  const width = Math.max(10, right - left);
  const yA = Math.round(cssH * 0.34);
  const yB = Math.round(cssH * 0.74);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.textAlign = 'left';
  g.fillText(`1 ${UNITS[S.source].short} = ${fmt(facteur(S.source, S.target))} ${UNITS[S.target].short}`, left, 17);

  drawScale(g, yA, left, width, S.source, `Échelle source · ${libelleUnite(S.source)}`);
  drawScale(g, yB, left, width, S.target, `Échelle cible · ${libelleUnite(S.target)}`);

  /* Repère mobile : position déterministe = f(S.sweep), jamais aléatoire. */
  const x = left + S.sweep * width;
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(x, yA - 14);
  g.lineTo(x, yB + 14);
  g.stroke();

  const valeurSource = S.sweep * S.distance;
  const valeurCible = conversion(valeurSource, S.source, S.target);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.textAlign = x > (left + width) * 0.78 ? 'right' : 'left';
  const dx = x > (left + width) * 0.78 ? -5 : 5;
  g.fillText(`${fmt(valeurSource, 1)} ${UNITS[S.source].short}`, x + dx, yA - 32);
  g.fillText(`${fmt(valeurCible, 1)} ${UNITS[S.target].short}`, x + dx, yB + 26);
  g.textAlign = 'left';
}

/* ---------- E089-06 / E089-07 : lectures et région de statut ---------- */

function updateBadgeText() {
  const n = S.nodes && S.nodes.badgeText;
  if (n) n.textContent = badgeText();
}

function updateLegend() {
  const n = S.nodes && S.nodes.legend;
  if (!n) return;
  n.textContent = `Trait plein : kilomètre · tirets : mille terrestre · pointillés : mille marin. Échelle haute en ${libelleUnite(S.source)}, échelle basse en ${libelleUnite(S.target)} : le style de trait distingue l’unité, indépendamment de la couleur.`;
}

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const out = conversion(S.distance, S.source, S.target);
  const ratio = facteur(S.source, S.target);
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';
  add('Conversion : ');
  put(`${fmt(S.distance)} ${libelleUnite(S.source)}`);
  add(' = ');
  put(`${fmt(out)} ${libelleUnite(S.target)}`);
  add('. Facteur : 1 ');
  put(UNITS[S.source].short);
  add(' = ');
  put(fmt(ratio));
  add(' ');
  put(UNITS[S.target].short);
  add('. Référence : 1 mille = 1,609344 km, 1 mille marin = 1,852 km ; écart mille marin / mille terrestre : ');
  put(`${fmt(ecartMilles(), 2)} %`);
  add('.');
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.distance) return;

  n.src.forEach((radio, i) => { if (radio) radio.checked = S.source === ORDER[i]; });
  n.tgt.forEach((radio, i) => { if (radio) radio.checked = S.target === ORDER[i]; });

  n.distance.value = String(Math.round(S.distance));
  if (n.distanceOut) n.distanceOut.textContent = `${fmt(S.distance)} ${libelleUnite(S.source)}`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le déplacement' : '▶ Animer le repère';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E089Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) {
    DEFI_ETAPES.forEach(([key]) => {
      const span = S.defiSpans[key];
      if (span) span.textContent = DEFI[key];
    });
  }
  updateMapBadge();
  updateBadgeText();
  updateLegend();
  fillMesuresTable();
  updateReadout();
  drawLab();
}

/* ---------- E089-09 : boucle rAF unique, pauses multiples ---------- */

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
  /* Progression déterministe : aucune valeur aléatoire, horodatage seul. */
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * 0.00009) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E089-05 / E089-08 / E089-10 : pilotes et robustesse ---------- */

function setSource(value) {
  if (ORDER.indexOf(value) === -1) return;
  S.source = value;
  applyState();
}

function setTarget(value) {
  if (ORDER.indexOf(value) === -1) return;
  S.target = value;
  applyState();
}

function setDistance(value) {
  S.distance = clamp(Math.round(Number(value) || DIST_DEF), DIST_MIN, DIST_MAX);
  applyState();
}

function setSweep(value) {
  S.sweep = clamp(Number(value), 0, 1);
  applyState();
}

function togglePlay() {
  S.playing = !S.playing;
  if (!S.playing || S.reduced) stopLoop(); else startLoop();
  applyState();
}

function resetState() {
  S.source = 'km';
  S.target = 'mi';
  S.distance = DIST_DEF;
  S.sweep = 0.5;
  S.playing = false;
  stopLoop();
  applyState();
}

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
        const entry = entries[entries.length - 1];
        S.inView = entry ? !!entry.isIntersecting : true;
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité de l'onglet reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) { S.playing = false; stopLoop(); }
        applyState();
        if (!S.reduced) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.src.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (radio.checked) setSource(radio.value);
    });
  });
  n.tgt.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (radio.checked) setTarget(radio.value);
    });
  });
  n.distance.addEventListener('input', () => setDistance(n.distance.value));
  n.play.addEventListener('click', togglePlay);
  n.reset.addEventListener('click', resetState);

  /* E089-08 : équivalent clavier complet du laboratoire. */
  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowRight') setSweep(S.sweep + 0.05);
    else if (event.key === 'ArrowLeft') setSweep(S.sweep - 0.05);
    else if (event.key === 'ArrowDown') setDistance(S.distance + 10);
    else if (event.key === 'ArrowUp') setDistance(S.distance - 10);
    else if (event.key === 'Home') resetState();
    else if (event.key === 'Enter') {
      const i = ORDER.indexOf(S.target);
      setTarget(ORDER[(i + 1) % ORDER.length]);
    } else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
    else used = false;
    if (used) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

/* ---------- E089-01 : feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e089-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e089-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e089-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e089-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e089-panel .geography-v2-e089-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e089-panel .geography-v2-e089-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e089-panel .geography-v2-e089-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e089-panel .geography-v2-e089-table th,
.geography-v2-e089-panel .geography-v2-e089-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e089-panel .geography-v2-e089-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e089-panel .geography-v2-e089-table td{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e089-source,#geography-v2-e089-target{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e089-source legend,#geography-v2-e089-target legend{
  padding:0 4px;color:var(--gold,#e6b96f);
}
.geography-v2-e089-panel .geography-v2-e089-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e089-panel .geography-v2-e089-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e089-slider-row{margin:7px 0}
.geography-v2-e089-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e089-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e089-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e089-canvas{
  display:block;width:100%;height:270px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.3);touch-action:manipulation;
}
.geography-v2-e089-panel .geography-v2-e089-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e089-panel .geography-v2-e089-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e089-panel .geography-v2-e089-defi li{margin:3px 0}
.geography-v2-e089-panel .geography-v2-e089-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e089-readout{
  min-height:36px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);
  color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums;
}
#geography-v2-e089-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e089-panel .geography-v2-e089-badge-text{
  min-height:30px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-left:4px solid var(--gold,#e6b96f);border-radius:8px;
  background:rgba(230,185,111,.06);font-size:10px;
}
.geography-v2-e089-panel .geography-v2-e089-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e089-panel .geography-v2-e089-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e089-panel .geography-v2-e089-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14);
}
.geography-v2-e089-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e089-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e089-panel[data-geography-v2-e089-reduced="1"] .geography-v2-e089-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e089-panel .geography-v2-e089-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e089-panel{font-size:10px;padding:9px}
  #geography-v2-e089-canvas{height:224px}
  .geography-v2-e089-panel .geography-v2-e089-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e089-panel{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E089', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) { S.playing = false; stopLoop(); }

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
