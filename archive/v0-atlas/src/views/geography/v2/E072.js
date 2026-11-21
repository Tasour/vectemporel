import { register } from './registry.js';

/*
 * Lentille E072 — SECONDE PASSE (V2) : messages d'erreur et repli accessible.
 *
 * Thème : une erreur ne doit jamais être un silence. Quatre scénarios
 * déterministes — succès (code 200), erreur réseau (code 503), données
 * inexploitables (code 422), état vide (code 204) — sont annoncés dans une
 * région live adaptée, puis un repli textuel prend le relais après un délai
 * réglable de 1 à 5 secondes autour d'une référence de 3 secondes.
 *
 * Les dix chantiers (E072-01 … E072-10) sont réellement implémentés ci-dessous.
 * La V2 ajoute à la passe 1 : une fiche de vérité à trois faits sourcés, un
 * tableau de mesures recalculées à chaque réglage, un défi falsifiable en cinq
 * temps aligné sur le modèle de délai, un `aria-valuetext` sur le curseur, un
 * `radiogroup` explicite, un `IntersectionObserver` qui suspend la boucle hors
 * champ et une lecture continue de `ctx.reducedMotion()`. Tout le contenu
 * pédagogique est du texte sémantique indexable (h2/h3/p/ol/li/table/caption/
 * th/td/fieldset/legend) présent dans le DOM ; le canvas n'est qu'un
 * laboratoire qui illustre une chronologie déterministe.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e072-` (aucune collision avec la passe 1 `geography-e072-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e072';

const ID = {
  panel: 'geography-v2-e072-panel',
  title: 'geography-v2-e072-title',
  lead: 'geography-v2-e072-lead',
  facts: 'geography-v2-e072-facts',
  table: 'geography-v2-e072-table',
  scenario: 'geography-v2-e072-scenarios',
  force: 'geography-v2-e072-force',
  note: 'geography-v2-e072-note',
  delay: 'geography-v2-e072-delay',
  delayValue: 'geography-v2-e072-delay-value',
  delayLabel: 'geography-v2-e072-delay-label',
  canvas: 'geography-v2-e072-canvas',
  canvasDesc: 'geography-v2-e072-canvas-desc',
  legend: 'geography-v2-e072-legend',
  alert: 'geography-v2-e072-alert',
  notice: 'geography-v2-e072-notice',
  fallback: 'geography-v2-e072-fallback',
  modelsTitle: 'geography-v2-e072-models-title',
  models: 'geography-v2-e072-models',
  readout: 'geography-v2-e072-readout',
  defiTitle: 'geography-v2-e072-defi-title',
  defi: 'geography-v2-e072-defi',
  launch: 'geography-v2-e072-launch',
  reset: 'geography-v2-e072-reset',
  noteEnd: 'geography-v2-e072-note-end',
  badge: 'geography-v2-e072-badge',
};

const SCENARIO_KEYS = ['succes', 'reseau', 'donnees', 'vide'];
const scenarioId = (key) => `${ID.scenario}-${key}`;

/* Constantes canoniques : aucun chiffre n'est inventé. */
const DELAI_MIN = 1;   /* s, borne basse du délai de repli */
const DELAI_MAX = 5;   /* s, borne haute du délai de repli */
const DELAI_REF = 3;   /* s, délai de référence (comparaison) */

/* Quatre scénarios déterministes. code : référence HTTP ; role : région live ;
   forme : repère non chromatique du canvas. */
const LISTE_SCENARIOS = [
  {
    key: 'succes', code: 200, role: 'status', besoinRepli: false,
    titre: 'Chargement réussi',
    message: 'Les lieux du périmètre sont disponibles et vérifiés.',
    repli: '',
    forme: 'croix',
    libelle: 'Succès — données disponibles (code 200)',
  },
  {
    key: 'reseau', code: 503, role: 'alert', besoinRepli: true,
    titre: 'Service injoignable',
    message: 'Impossible de contacter le service de données de la carte.',
    repli: 'Repli : affichage des dernières données mises en cache pour le pays sélectionné.',
    forme: 'triangle',
    libelle: 'Erreur réseau — service injoignable (code 503)',
  },
  {
    key: 'donnees', code: 422, role: 'alert', besoinRepli: true,
    titre: 'Données inexploitables',
    message: 'La réponse reçue ne peut pas être interprétée.',
    repli: 'Repli : masquage des lieux non vérifiés et message « Aucun lieu vérifiable ».',
    forme: 'triangle',
    libelle: 'Données invalides — réponse inexploitable (code 422)',
  },
  {
    key: 'vide', code: 204, role: 'status', besoinRepli: true,
    titre: 'Aucun lieu',
    message: 'Aucun lieu ne correspond au périmètre demandé.',
    repli: 'Repli : invitation à élargir la recherche et à choisir un autre pays.',
    forme: 'carre',
    libelle: 'État vide — aucun lieu (code 204)',
  },
];

const parScenario = (key) => LISTE_SCENARIOS.find((s) => s.key === key) || LISTE_SCENARIOS[0];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  scenario: 'reseau',
  delai: DELAI_REF,
  progression: 0,
  tentativeEnCours: false,
  forceRepli: false,
  tentatives: 0,
  repliActif: false,
  lastPct: -1,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: null,
};

/* ---------- Formules déterministes et formatage français ---------- */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};
const scenario = () => parScenario(S.scenario);

/* Temps écoulé ajouté à la progression : avancement = dt / (délai × 1000). */
const avancement = (dt) => clamp(dt / (S.delai * 1000), 0, 1);

/* Délai restant avant le repli, en secondes, calculé depuis la progression. */
const restant = () => S.delai * (1 - S.progression);

/* Temps écoulé, en secondes, calculé depuis la progression. */
const ecoule = () => S.delai * S.progression;

/* Le repli est actif dès qu'une tentative aboutie le demande, ou dès que
   l'utilisateur force le repli (bascule indépendante). */
const doitAfficherRepli = () => S.tentatives > 0 && (scenario().besoinRepli || S.forceRepli);

function badgeText() {
  const sc = scenario();
  if (S.tentativeEnCours) {
    return 'Tentative en cours — code de référence ' + sc.code
      + ' : annonce et repli à l’échéance du délai.';
  }
  if (S.tentatives === 0) {
    return 'Repli accessible : un message annonce l’état, un rôle live le diffuse, '
      + 'un repli texte le remplace. Choisissez un scénario et lancez la tentative.';
  }
  if (S.repliActif) {
    return 'Repli ' + (S.forceRepli ? 'forcé' : 'actif') + ' — code ' + sc.code + ' : ' + sc.repli;
  }
  return 'Aucun repli — code ' + sc.code + ' : ' + sc.message;
}

/* ---------- E072-01 / E072-02 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  /* Fiche de vérité : trois faits sourcés, lisibles sans JS ni animation. */
  const faits = [
    'Un message d’erreur n’est pas un décor : c’est une information. Dans la vue GEOGRAPHIE, '
      + 'un état vide explicite (.geo-empty, role="status") remplace une carte muette et la '
      + 'recherche sans résultat affiche un message .c3b-empty. Le message dit ce qui s’est passé, '
      + 'pourquoi et quoi faire ensuite.',
    'Le rôle ARIA commande l’urgence de l’annonce. role="alert" est assertif : il interrompt la '
      + 'lecture pour une vraie erreur (codes 503 et 422). role="status" avec aria-live="polite" '
      + 'attend une pause : il convient à un chargement, à un succès (200) ou à un état vide (204). '
      + 'Une même information n’est jamais portée par la seule couleur : un libellé et une forme '
      + 'l’accompagnent.',
    'Un repli accessible est un chemin de sortie, pas un silence. Quand le service de données '
      + 'échoue (code 503) ou que la réponse est inexploitable (code 422), l’interface affiche un '
      + 'dernier état connu ou une consigne claire. Le délai de repli est une grandeur mesurable : '
      + 'ce laboratoire le fait varier de 1 à 5 secondes autour d’une référence de 3 secondes.',
  ];
  faits.forEach((texte) => wrap.appendChild(ctx.el('p', 'geography-v2-e072-fait', texte)));
  return wrap;
}

function staticTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e072-table');
  table.id = ID.table;
  table.appendChild(ctx.el('caption', '',
    'Les quatre états du laboratoire, leur code HTTP de référence, leur région live et leur repli.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['État', 'Code', 'Rôle live', 'Repli prévu'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  LISTE_SCENARIOS.forEach((sc) => {
    const tr = document.createElement('tr');
    const cells = [sc.titre, String(sc.code), sc.role, sc.besoinRepli ? 'Oui' : 'Non'];
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

/* E072-02 (V2) : tableau des mesures recalculées à chaque réglage. */
const MODEL_ROWS = [
  ['delai', 'Délai réglé', 'DELAI (référence 3 s)'],
  ['ecoule', 'Temps écoulé', 'délai × progression'],
  ['reste', 'Délai restant', 'délai × (1 − progression)'],
  ['progression', 'Progression', 'temps écoulé ÷ (délai × 1000)'],
  ['ratio', 'Ratio / référence', 'délai ÷ 3 s'],
];

function buildModelsTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e072-table');
  table.id = ID.models;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les formules et l’état courant ; les codes de référence sont rappelés dans le tableau des états.'));

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
    const form = ctx.el('td', '', formule);
    const value = ctx.el('td', '', '—');
    S.cells[key] = value;
    tr.append(th, form, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillModelsTable() {
  const c = S.cells;
  c.delai.textContent = fmt(S.delai, 0) + ' s (référence ' + fmt(DELAI_REF, 0) + ' s)';
  c.ecoule.textContent = fmt(ecoule(), 2) + ' s';
  c.reste.textContent = fmt(restant(), 2) + ' s';
  c.progression.textContent = fmt(S.progression * 100, 0) + ' %';
  c.ratio.textContent = fmt(S.delai / DELAI_REF, 2) + ' ×';
}

/* E072-09 (V2) : défi falsifiable en cinq temps, aligné sur le modèle de délai. */
const DEFI = {
  prediction: 'Passer le délai de 3 s à 5 s doit porter le temps écoulé à mi-parcours de 1,5 s à 2,5 s, soit 1,67 × la référence de 3 s.',
  reglage: 'Réglez le délai sur 5 s, choisissez le scénario « erreur réseau » puis lancez la tentative.',
  attendu: 'À progression 50 %, le reste vaut 2,5 s et le bandeau annonce « 5 s (référence 3 s, soit 1,67 ×) » ; la région assertive cite le code 503.',
  falsification: 'Si le temps écoulé ne vaut pas délai × progression ou si l’alerte apparaît avant l’échéance, le modèle est contredit.',
  debrief: 'Le délai est une grandeur mesurable : l’annonce et le repli ne dépendent pas de la couleur mais d’un texte et d’un rôle live choisis. Le repli reste lisible sans animation.',
};

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e072-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = ctx.el('span', '', DEFI[key]);
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

/* ---------- E072-03 / E072-04 / E072-05 / E072-06 / E072-07 : panneau ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      fresh: false,
      radios: SCENARIO_KEYS.map((k) => document.getElementById(scenarioId(k))),
      force: document.getElementById(ID.force),
      delay: document.getElementById(ID.delay),
      delayOut: document.getElementById(ID.delayValue),
      canvas: document.getElementById(ID.canvas),
      alert: document.getElementById(ID.alert),
      notice: document.getElementById(ID.notice),
      fallback: document.getElementById(ID.fallback),
      readout: document.getElementById(ID.readout),
      launch: document.getElementById(ID.launch),
      reset: document.getElementById(ID.reset),
    };
  }

  panel = ctx.el('section', 'geography-v2-e072-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Messages d’erreur et repli accessible — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Une erreur se annonce, un repli se explique. Ce laboratoire simule quatre états de chargement '
    + 'sur la carte locale et montre comment le rôle live, le message texte et le délai de repli '
    + 'coopèrent, sans jamais confier l’information à la seule couleur.');
  lead.id = ID.lead;

  /* E072-03 : choix unique → fieldset/radiogroup explicite, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.scenario;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Scénario de chargement, choix unique');
  fieldset.appendChild(ctx.el('legend', '', 'Scénario de chargement (choix unique)'));
  LISTE_SCENARIOS.forEach((sc) => {
    const lab = ctx.el('label', 'geography-v2-e072-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e072-scenario';
    radio.id = scenarioId(sc.key);
    radio.value = sc.key;
    radio.checked = S.scenario === sc.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(sc.libelle));
    fieldset.appendChild(lab);
  });

  /* E072-06 : bascule indépendante, seul contrôle à aria-pressed. */
  const force = ctx.el('button', 'geography-v2-e072-btn', 'Forcer le repli (bascule indépendante)');
  force.type = 'button';
  force.id = ID.force;
  force.setAttribute('aria-pressed', S.forceRepli ? 'true' : 'false');

  const note = ctx.el('p', '',
    'Le scénario est un choix unique (groupe de cases radio natives) ; « Forcer le repli » est une '
    + 'bascule indépendante. L’erreur est annoncée dans une région role="alert" assertive, les états '
    + 'neutres dans une région role="status" polie : deux rôles, deux usages distincts.');
  note.id = ID.note;

  /* E072-07 (V2) : curseur de délai avec aria-valuetext maintenu à jour. */
  const sliderRow = ctx.el('div', 'geography-v2-e072-slider-row');
  const delayLabel = document.createElement('label');
  delayLabel.id = ID.delayLabel;
  delayLabel.setAttribute('for', ID.delay);
  delayLabel.appendChild(document.createTextNode('Délai avant repli : '));
  const delayOut = ctx.el('span', 'geography-v2-e072-valeur', '');
  delayOut.id = ID.delayValue;
  delayLabel.appendChild(delayOut);
  const delay = document.createElement('input');
  delay.type = 'range';
  delay.id = ID.delay;
  delay.min = String(DELAI_MIN);
  delay.max = String(DELAI_MAX);
  delay.step = '1';
  delay.value = String(S.delai);
  delay.setAttribute('aria-label', 'Délai avant repli, de 1 à 5 secondes, référence 3 secondes');
  sliderRow.append(delayLabel, delay);

  /* Laboratoire canvas, surface de dessin unique. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Chronologie d’une tentative de chargement jusqu’au repli. Flèches gauche et droite : régler '
    + 'le délai d’une seconde. Entrée ou barre d’espace : relancer la tentative. Origine : '
    + 'réinitialiser. Les grandeurs chiffrées sont données en toutes lettres dans le bandeau et '
    + 'le tableau de mesures.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);
  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite règlent le délai par pas d’une '
    + 'seconde, Entrée ou la barre d’espace relance la tentative et Origine restaure les valeurs '
    + 'par défaut. Chaque valeur est aussi écrite dans le bandeau et le tableau de mesures.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e072-legend',
    'Croix : succès · triangle : erreur · carré : état vide · trait plein : temps écoulé · '
    + 'hachures : zone de repli · losange : pointeur de progression. La forme et le libellé '
    + 'accompagnent toujours la teinte : aucune information n’est portée par la seule couleur.');
  legend.id = ID.legend;

  /* E072-04 : annonce assertive réservée aux vraies erreurs. */
  const alert = ctx.el('p', 'geography-v2-e072-live', '');
  alert.id = ID.alert;
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'assertive');

  /* E072-05 : annonces polies et texte de repli explicite. */
  const notice = ctx.el('p', 'geography-v2-e072-live', '');
  notice.id = ID.notice;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  const fallback = ctx.el('p', 'geography-v2-e072-live', '');
  fallback.id = ID.fallback;
  fallback.setAttribute('role', 'status');
  fallback.setAttribute('aria-live', 'polite');

  /* Bandeau de lecture (readout) : role=status, aria-live=polite. */
  const readout = ctx.el('p', 'geography-v2-e072-readout', 'Le laboratoire est prêt.');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const modelsTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  modelsTitle.id = ID.modelsTitle;
  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  /* Boutons ≥ 36 px (ici 44 px) ; aria-pressed uniquement sur la bascule. */
  const launch = ctx.el('button', 'geography-v2-e072-btn', '▶ Relancer la tentative');
  launch.type = 'button';
  launch.id = ID.launch;
  const reset = ctx.el('button', 'geography-v2-e072-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const noteEnd = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucun fond de carte réel n’est chargé, aucune '
    + 'requête réseau et aucun tirage aléatoire n’interviennent. Les grandeurs ci-dessus sont des '
    + 'textes réels, lisibles et indexables même sans animation ; la carte d’origine reste '
    + 'utilisable sans ce panneau.');
  noteEnd.id = ID.noteEnd;

  panel.append(title, lead, staticFacts(ctx), staticTable(ctx), fieldset, force, note,
    sliderRow, canvas, canvasDesc, legend, alert, notice, fallback, readout,
    modelsTitle, buildModelsTable(ctx), defiTitle, buildDefi(ctx),
    launch, reset, noteEnd);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    radios: SCENARIO_KEYS.map((k) => document.getElementById(scenarioId(k))),
    force, delay, delayOut, canvas, alert, notice, fallback, readout, launch, reset,
  };
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e072-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

function updateMapBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) badge.textContent = badgeText();
}

/* ---------- E072-10 : rendu du laboratoire (un seul canvas, une passe) ---------- */

/* Contour arrondi compatible :roundRect natif et navigateurs plus anciens. */
function cheminArrondi(g, x, y, w, h, r) {
  const rayon = Math.min(r, w / 2, h / 2);
  g.beginPath();
  if (typeof g.roundRect === 'function') {
    g.roundRect(x, y, w, h, rayon);
    return;
  }
  g.moveTo(x + rayon, y);
  g.lineTo(x + w - rayon, y);
  g.arcTo(x + w, y, x + w, y + rayon, rayon);
  g.lineTo(x + w, y + h - rayon);
  g.arcTo(x + w, y + h, x + w - rayon, y + h, rayon);
  g.lineTo(x + rayon, y + h);
  g.arcTo(x, y + h, x, y + h - rayon, rayon);
  g.lineTo(x, y + rayon);
  g.arcTo(x, y, x + rayon, y, rayon);
  g.closePath();
}

/* Symbole non chromatique de l'état courant : croix, triangle ou carré. */
function dessinerForme(g, forme, cx, cy, taille) {
  g.lineWidth = 2;
  g.beginPath();
  if (forme === 'croix') {
    g.moveTo(cx - taille, cy);
    g.lineTo(cx + taille, cy);
    g.moveTo(cx, cy - taille);
    g.lineTo(cx, cy + taille);
    g.stroke();
    return;
  }
  if (forme === 'triangle') {
    g.moveTo(cx, cy - taille);
    g.lineTo(cx + taille, cy + taille);
    g.lineTo(cx - taille, cy + taille);
    g.closePath();
    g.stroke();
    return;
  }
  g.rect(cx - taille, cy - taille, taille * 2, taille * 2);
  g.stroke();
}

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  /* DPR plafonné à 2 : coût de rendu maîtrisé. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const sc = scenario();
  const x0 = 20;
  const x1 = cssW - 20;
  const largeur = Math.max(1, x1 - x0);
  const yBarre = cssH * 0.58;

  g.fillStyle = 'rgba(8,11,16,.96)';
  g.fillRect(0, 0, cssW, cssH);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Chronologie de la tentative — ' + sc.titre, x0, 22);

  /* Zone de repli en fin de barre : hachures, jamais une couleur seule. */
  const zoneX = x1 - 46;
  cheminArrondi(g, zoneX, yBarre - 16, 46, 32, 4);
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fill();
  g.save();
  cheminArrondi(g, zoneX, yBarre - 16, 46, 32, 4);
  g.clip();
  g.strokeStyle = 'rgba(244,214,158,.45)';
  g.lineWidth = 1;
  for (let hx = zoneX - 32; hx < x1 + 32; hx += 7) {
    g.beginPath();
    g.moveTo(hx, yBarre + 16);
    g.lineTo(hx + 32, yBarre - 16);
    g.stroke();
  }
  g.restore();
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.font = '9px sans-serif';
  g.fillText('REPLI', zoneX + 6, yBarre + 30);

  /* Barre de délai : contour puis portion écoulée en trait plein. */
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x0, yBarre);
  g.lineTo(x1, yBarre);
  g.stroke();
  const cur = x0 + largeur * S.progression;
  g.strokeStyle = 'rgba(230,185,111,.95)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x0, yBarre);
  g.lineTo(cur, yBarre);
  g.stroke();

  /* Graduations 0 / 25 / 50 / 75 / 100 %, étiquetées. */
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.font = '8px sans-serif';
  [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
    const gx = x0 + largeur * p;
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(gx, yBarre - 6);
    g.lineTo(gx, yBarre + 6);
    g.stroke();
    g.fillText(fmt(p * 100, 0) + ' %', gx - 8, yBarre - 12);
  });

  /* Pointeur de progression : losange cerclé, indépendant de la teinte. */
  g.save();
  g.translate(cur, yBarre);
  g.rotate(Math.PI / 4);
  g.fillStyle = 'rgba(8,12,18,.95)';
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.5;
  g.fillRect(-5, -5, 10, 10);
  g.strokeRect(-5, -5, 10, 10);
  g.restore();

  /* Symbole d'état et code, en haut à droite. */
  const symbX = cssW - 34;
  const symbY = 22;
  g.strokeStyle = 'rgba(244,214,158,.95)';
  dessinerForme(g, sc.forme, symbX, symbY, 7);
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '9px sans-serif';
  g.fillText('code ' + sc.code, symbX - 60, symbY + 3);

  /* Temps écoulé et reste, écrits en toutes lettres. */
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText('écoulé ' + fmt(ecoule(), 2) + ' s · reste ' + fmt(restant(), 2) + ' s',
    x0, cssH - 32);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText('repli ' + (S.repliActif ? 'ACTIF' : 'inactif') + ' · tentative ' + S.tentatives,
    x0, cssH - 16);
}

/* ---------- E072-04 / E072-05 : messages live et repli textuel ---------- */

function appliquerMessages() {
  const n = S.nodes;
  if (!n || !n.alert || !n.notice || !n.fallback) return;
  n.alert.textContent = '';
  n.notice.textContent = '';
  S.repliActif = S.tentativeEnCours ? false : doitAfficherRepli();

  if (S.tentativeEnCours) {
    /* L'erreur n'est annoncée qu'à l'échéance, jamais au lancement. */
    n.notice.textContent = 'Tentative en cours… chargement du périmètre.';
    n.fallback.textContent = 'Repli en attente : il sera affiché à l’échéance du délai si le scénario le demande.';
    return;
  }

  if (S.tentatives === 0) {
    n.notice.textContent = 'Choisissez un scénario puis lancez une tentative pour entendre l’annonce '
      + 'et voir le repli. Le tableau ci-dessus donne les valeurs de référence.';
    n.fallback.textContent = 'Repli de référence : afficher le dernier état connu ou une consigne '
      + 'claire, jamais une carte silencieuse.';
    return;
  }

  const sc = scenario();
  const fil = document.createElement('strong');
  fil.textContent = sc.titre + ' (code ' + sc.code + ') — ';
  const cible = sc.role === 'alert' ? n.alert : n.notice;
  cible.appendChild(fil);
  cible.appendChild(document.createTextNode(sc.message));

  if (S.forceRepli && !sc.besoinRepli) {
    n.fallback.textContent = 'Repli forcé : ' + (sc.repli || 'affichage du dernier état connu, '
      + 'bien que les données soient disponibles.');
  } else if (S.repliActif) {
    n.fallback.textContent = sc.repli;
  } else {
    n.fallback.textContent = 'Aucun repli nécessaire : les données sont disponibles et vérifiées.';
  }
}

/* E072-07 (V2) : bandeau de lecture, au moins trois grandeurs dont une
   comparée à une référence. */
function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const sc = scenario();
  const pct = Math.round(S.progression * 100);
  const ratio = fmt(S.delai / DELAI_REF, 2);
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';
  add('Code de référence ');
  put(String(sc.code));
  add(' · délai ');
  put(fmt(S.delai, 0) + ' s');
  add(' (référence ' + fmt(DELAI_REF, 0) + ' s, soit ');
  put(ratio + ' ×');
  add(') · temps écoulé ');
  put(fmt(ecoule(), 2) + ' s');
  add(' · progression ');
  put(fmt(pct, 0) + ' %');
  add(' · reste ');
  put(fmt(restant(), 2) + ' s');
  add(' · annonce ');
  put(sc.role === 'alert' ? 'assertive (alert)' : 'polie (status)');
  add(' · repli ');
  put(S.repliActif ? 'actif' : 'inactif');
  add('. Bascule repli forcé : ' + (S.forceRepli ? 'activée' : 'désactivée') + '.');
  S.lastPct = pct;
}

function delayValuetext() {
  return fmt(S.delai, 0) + ' secondes (référence ' + fmt(DELAI_REF, 0) + ' secondes)';
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.delay) return;

  n.radios.forEach((r) => {
    if (r) r.checked = r.value === S.scenario;
  });
  n.delay.value = String(S.delai);
  n.delay.setAttribute('aria-valuetext', delayValuetext());
  if (n.delayOut) n.delayOut.textContent = fmt(S.delai, 0) + ' s / référence ' + fmt(DELAI_REF, 0) + ' s';
  if (n.force) n.force.setAttribute('aria-pressed', S.forceRepli ? 'true' : 'false');
  if (n.panel) n.panel.dataset.geographyV2E072Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) {
    DEFI_ETAPES.forEach(([key]) => {
      const span = S.defiSpans[key];
      if (span) span.textContent = DEFI[key];
    });
  }
  appliquerMessages();
  updateReadout();
  fillModelsTable();
  drawLab();
  updateMapBadge();
}

function resetState() {
  S.scenario = 'reseau';
  S.delai = DELAI_REF;
  S.progression = 0;
  S.tentativeEnCours = false;
  S.forceRepli = false;
  S.tentatives = 0;
  S.repliActif = false;
  stopLoop();
  applyState();
}

/* ---------- E072-08 : boucle rAF unique, pauses multiples ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

/* Une tentative se termine : l'annonce et le repli sont figés, la boucle
   s'arrête. Le résultat reste lisible sans aucune animation. */
function terminerTentative() {
  S.progression = 1;
  S.tentativeEnCours = false;
  stopLoop();
  applyState();
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || S.reduced || !S.tentativeEnCours) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Une seule horloge rAF, avancement déterministe, une image par tick.
   ctx.reducedMotion() est relu à chaque image. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.tentativeEnCours) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = Math.min(80, Math.max(0, ts - S.lastTs));
    S.progression = clamp(S.progression + avancement(dt), 0, 1);
    if (S.progression >= 1) {
      terminerTentative();
      return;
    }
  }
  S.lastTs = ts;
  drawLab();
  /* Une seule mise à jour par point de pourcentage : la région live n'est
     pas inondée d'annonces à chaque image. */
  if (Math.round(S.progression * 100) !== S.lastPct) {
    updateReadout();
    fillModelsTable();
  }
  S.rafId = requestAnimationFrame(tick);
}

function relancer() {
  S.tentatives += 1;
  S.progression = 0;
  S.repliActif = false;
  if (S.reduced) {
    /* Mouvement réduit : aucun défilement, le résultat est livré d'un coup. */
    S.tentativeEnCours = false;
    stopLoop();
    S.progression = 1;
    applyState();
    return;
  }
  S.tentativeEnCours = true;
  applyState();
  startLoop();
}

/* ---------- E072-10 : accessibilité, mouvement réduit, sobriété ---------- */

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
          S.tentativeEnCours = false;
          stopLoop();
          if (S.tentatives > 0) S.progression = 1;
        }
        applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

function setScenario(value) {
  if (SCENARIO_KEYS.indexOf(value) === -1) return;
  S.scenario = value;
  S.progression = 0;
  S.tentativeEnCours = false;
  stopLoop();
  applyState();
}

function setDelai(value) {
  S.delai = clamp(Math.round(Number(value) || DELAI_REF), DELAI_MIN, DELAI_MAX);
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
      setScenario(radio.value);
    });
  });

  n.force.addEventListener('click', () => {
    S.forceRepli = !S.forceRepli;
    applyState();
  });

  n.delay.addEventListener('input', () => { setDelai(n.delay.value); });
  n.launch.addEventListener('click', relancer);
  n.reset.addEventListener('click', resetState);

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      setDelai(S.delai + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      relancer();
    } else if (event.key === 'Home') {
      resetState();
    } else {
      used = false;
    }
    if (used) event.preventDefault();
  });
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e072-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:#080b10;color:var(--ink-soft,#d7d1c6);font-size:11px;line-height:1.6;
}
.geography-v2-e072-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e072-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e072-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e072-panel .geography-v2-e072-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e072-panel .geography-v2-e072-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e072-panel .geography-v2-e072-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e072-panel .geography-v2-e072-table th,
.geography-v2-e072-panel .geography-v2-e072-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e072-panel .geography-v2-e072-table thead th{color:var(--gold-bright,#f4d69e)}
#geography-v2-e072-scenarios{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e072-scenarios legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e072-panel .geography-v2-e072-choix{
  display:flex;align-items:center;gap:6px;min-height:36px;margin:2px 0;cursor:pointer;
}
.geography-v2-e072-panel .geography-v2-e072-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e072-slider-row{margin:7px 0}
.geography-v2-e072-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e072-valeur{
  color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums;
}
.geography-v2-e072-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e072-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:#080b10;touch-action:manipulation;
}
.geography-v2-e072-panel .geography-v2-e072-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e072-panel .geography-v2-e072-live{
  min-height:34px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e072-alert{border-left:3px solid var(--gold,#e6b96f);background:rgba(230,185,111,.07)}
#geography-v2-e072-alert:empty::before{content:'Aucune erreur en cours.';color:var(--muted,#a8a198)}
#geography-v2-e072-notice{background:rgba(255,255,255,.03)}
#geography-v2-e072-notice:empty::before{content:'Aucune annonce récente.';color:var(--muted,#a8a198)}
#geography-v2-e072-fallback{border-style:dashed;background:rgba(0,0,0,.18)}
.geography-v2-e072-live strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e072-readout{
  min-height:36px;margin:8px 0;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:10px;font-variant-numeric:tabular-nums;
}
#geography-v2-e072-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e072-panel .geography-v2-e072-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e072-panel .geography-v2-e072-defi li{margin:3px 0}
.geography-v2-e072-panel .geography-v2-e072-defi strong{color:var(--gold,#e6b96f)}
.geography-v2-e072-panel .geography-v2-e072-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  touch-action:manipulation;transition:border-color .18s,background-color .18s;
}
.geography-v2-e072-panel .geography-v2-e072-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14);
}
.geography-v2-e072-panel .geography-v2-e072-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e072-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e072-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e072-panel[data-geography-v2-e072-reduced="1"] .geography-v2-e072-btn,
.geography-v2-e072-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e072-panel .geography-v2-e072-btn,
  .geography-v2-e072-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .geography-v2-e072-panel{font-size:10px;padding:9px}
  #geography-v2-e072-canvas{height:200px}
}
@media (forced-colors:active){
  .geography-v2-e072-panel{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E072', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) {
    S.tentativeEnCours = false;
    stopLoop();
  }

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.tentativeEnCours && !S.reduced) startLoop();
});
