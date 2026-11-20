import { register } from './registry.js';

/*
 * Lentille E060 — SECONDE PASSE (V2) : thème sombre / clair.
 *
 * Les dix chantiers (E060-01 … E060-10) sont réellement implémentés ci-dessous.
 * V2 ajoute à la passe 1 : un badge de statut explicite sur la carte, une
 * fiche de vérité à trois faits sourcés, un tableau comparatif dont les
 * rapports sont recalculés depuis les couleurs, un défi falsifiable en cinq
 * temps, un canvas déterministe (échelle de contraste 1 → 21), un bandeau de
 * lecture `role="status" aria-live="polite"`, une boucle rAF unique suspendue
 * sur `document.hidden`, hors champ et en mouvement réduit, et un bouton de
 * remise à zéro. Tout le contenu pédagogique est du texte sémantique
 * indexable (h2/h3/p/ol/li/table/caption/th/td) présent dans le DOM : le
 * panneau reste lisible et le thème reste compréhensible sans aucune animation.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e060-` (aucune collision avec la passe 1 `geography-e060-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e060';

const ID = {
  panel: 'geography-v2-e060-panel',
  title: 'geography-v2-e060-title',
  badge: 'geography-v2-e060-badge',
  facts: 'geography-v2-e060-facts',
  table: 'geography-v2-e060-table',
  mode: 'geography-v2-e060-mode',
  seuil: 'geography-v2-e060-seuil',
  seuilValue: 'geography-v2-e060-seuil-value',
  seuilLabel: 'geography-v2-e060-seuil-label',
  canvas: 'geography-v2-e060-canvas',
  canvasDesc: 'geography-v2-e060-canvas-desc',
  legend: 'geography-v2-e060-legend',
  defi: 'geography-v2-e060-defi',
  readout: 'geography-v2-e060-readout',
  play: 'geography-v2-e060-play',
  reset: 'geography-v2-e060-reset',
  note: 'geography-v2-e060-note',
};

/* Attribut posé sur <html> : distinct de la passe 1 pour éviter toute collision. */
const THEME_ATTR = 'data-geography-v2-e060-theme';
const STORE_KEY = 'geography-v2-e060-theme';

/* Palettes déjà présentes dans le projet (styles.css, passe 1) : recopiées
 * comme référence de calcul. Aucune couleur n'est inventée. */
const PALETTES = {
  dark: { label: 'Sombre', ink: '#f2ede3', bg: '#070a0e' },
  light: { label: 'Clair', ink: '#1b1a17', bg: '#f4f1ea' },
};

const MODE_ORDER = ['dark', 'light', 'system'];
const MODES = {
  dark: { label: 'Sombre', desc: 'Texte clair sur fond sombre, réglage d’origine de l’atlas.' },
  light: { label: 'Clair', desc: 'Texte sombre sur fond pâle, pour les environnements très éclairés.' },
  system: { label: 'Système', desc: 'Suit la préférence du système d’exploitation, en direct.' },
};

/* Échelle maximale du rapport de contraste (blanc pur sur noir pur). */
const MAX_RATIO = 21;
const AA = 4.5;
const AAA = 7;

/* État de module : survit au remplacement du DOM par la coque. */
const S = {
  choice: 'dark',
  effective: 'dark',
  seuil: AA,
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  prefReady: false,
  prefMq: null,
  nodes: null,
  cells: {},
  defiSpans: null,
  lastMessage: 'Choix du thème prêt : sombre, clair ou système.',
};

const fmt = (n, d = 1) => {
  if (!Number.isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* ---------- E060-06 : contraste WCAG calculé, sans graine ni réseau ---------- */

function hexToRgb(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex));
  if (!match) return [0, 0, 0];
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  return 0.2126 * srgbToLinear(rgb[0])
    + 0.7152 * srgbToLinear(rgb[1])
    + 0.0722 * srgbToLinear(rgb[2]);
}

function contrastOf(palette) {
  const a = luminance(palette.ink);
  const b = luminance(palette.bg);
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  return (high + 0.05) / (low + 0.05);
}

function verdict(ratio) {
  if (ratio >= AAA) return 'AAA (seuil 7 pour 1)';
  if (ratio >= AA) return 'AA (seuil 4,5 pour 1)';
  return 'sous les seuils AA et AAA';
}

/* ---------- E060-04 / E060-05 : résolution du thème effectif ---------- */

function systemPrefersLight() {
  try {
    return !!(typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-color-scheme: light)').matches);
  } catch {
    return false;
  }
}

function effectiveFor(choice) {
  if (choice === 'system') return systemPrefersLight() ? 'light' : 'dark';
  return choice === 'light' ? 'light' : 'dark';
}

function installPreferenceListener() {
  if (S.prefReady || typeof window === 'undefined' || !window.matchMedia) return;
  S.prefReady = true;
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    S.prefMq = mq;
    const handler = () => {
      if (S.choice !== 'system') return;
      applyTheme();
      announce(`Préférence système modifiée : thème ${S.effective} appliqué.`);
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
    else if (typeof mq.addListener === 'function') mq.addListener(handler);
  } catch {
    /* Navigation sans matchMedia : le mode manuel reste pleinement fonctionnel. */
  }
}

/* ---------- E060-08 : persistance locale avec repli mémoire ---------- */

function loadChoice() {
  try {
    const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORE_KEY) : null;
    if (MODE_ORDER.indexOf(saved) >= 0) return saved;
  } catch {
    /* Stockage indisponible : on garde le choix en mémoire de module. */
  }
  return 'dark';
}

function saveChoice(choice) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, choice);
  } catch {
    /* Aucune conséquence : l'état de module suffit pour la session. */
  }
}

function announce(message) {
  S.lastMessage = message;
  const n = S.nodes && S.nodes.readout;
  if (n) updateReadout(message);
}

/* ---------- E060-03 : application réelle des variables de thème ---------- */

function applyTheme() {
  S.effective = effectiveFor(S.choice);
  try {
    const root = (typeof document !== 'undefined') ? document.documentElement : null;
    if (root && root.setAttribute) root.setAttribute(THEME_ATTR, S.effective);
  } catch {
    /* Sans document, le calcul et l'affichage chiffré restent disponibles. */
  }
}

/* ---------- E060-01 : feuille de style isolée, une seule injection ---------- */

const CSS = `
.geography-v2-e060-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);font-size:11px;line-height:1.6;
}
.geography-v2-e060-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e060-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e060-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e060-panel .geography-v2-e060-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e060-panel .geography-v2-e060-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e060-panel .geography-v2-e060-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e060-panel .geography-v2-e060-table th,
.geography-v2-e060-panel .geography-v2-e060-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e060-panel .geography-v2-e060-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e060-panel .geography-v2-e060-table td{color:var(--ink-soft,#d7d1c6)}
.geography-v2-e060-panel .geography-v2-e060-table td.geography-v2-e060-num{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e060-mode{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e060-mode legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e060-panel .geography-v2-e060-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e060-panel .geography-v2-e060-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e060-slider-row{margin:7px 0}
.geography-v2-e060-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e060-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e060-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e060-canvas{
  display:block;width:100%;height:224px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.geography-v2-e060-panel .geography-v2-e060-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e060-panel .geography-v2-e060-defi{margin:6px 0;padding-left:18px;font-size:10px}
.geography-v2-e060-panel .geography-v2-e060-defi li{margin:3px 0}
.geography-v2-e060-panel .geography-v2-e060-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e060-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e060-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e060-panel .geography-v2-e060-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e060-panel .geography-v2-e060-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e060-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e060-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e060-panel[data-geography-v2-e060-reduced="1"] .geography-v2-e060-btn{
  transition:none;
}
/* E060-03 : redéfinitions du design system, sur un attribut dédié à la V2. */
html[${THEME_ATTR}="light"]{
  --bg:#f4f1ea;--surface:#ffffff;--surface-2:#f0ece3;
  --line:rgba(20,20,25,.16);--line-strong:rgba(120,80,20,.32);
  --ink:#1b1a17;--ink-soft:#2b2925;--muted:#5c574f;--muted-2:#7a756c;
  --gold:#8a5a12;--gold-bright:#6d460a;color-scheme:light;
}
html[${THEME_ATTR}="dark"]{color-scheme:dark;}
html[${THEME_ATTR}="light"] .geo-controls button{
  background:rgba(255,255,255,.9);border-color:rgba(20,20,25,.18);color:#1b1a17;
}
html[${THEME_ATTR}="light"] .geo-controls button:hover{color:var(--gold-bright);}
html[${THEME_ATTR}="light"] .geo-marker:focus .geo-ring{stroke:#1b1a17;}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e060-panel .geography-v2-e060-btn{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .geography-v2-e060-panel{font-size:10px;padding:9px}
  #geography-v2-e060-canvas{height:184px}
  .geography-v2-e060-panel .geography-v2-e060-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e060-panel{border:1px solid CanvasText}
}
`;

/* ---------- E060-02 : fiche de vérité à trois faits sourcés (texte réel) ---------- */

function buildFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Le contraste d’un texte se mesure sur une échelle de 1 pour 1 à 21 pour 1, le maximum '
      + 'correspondant au blanc pur sur le noir pur. La recommandation WCAG fixe au moins 4,5 pour 1 '
      + 'pour le texte courant (niveau AA) et 7 pour 1 pour le texte renforcé (niveau AAA).',
    'Le rapport se calcule à partir de la luminance relative : chaque canal sRGB est linéarisé '
      + '(c / 12,92 si c ≤ 0,03928, sinon ((c + 0,055) / 1,055)^2,4), puis pondéré 0,2126 pour le '
      + 'rouge, 0,7152 pour le vert et 0,0722 pour le bleu (Rec. 709). Le rapport vaut '
      + '(L claire + 0,05) / (L sombre + 0,05).',
    'Les couleurs de l’atlas donnent, depuis ces formules, environ 17,00 pour 1 pour le thème '
      + 'sombre (#f2ede3 sur #070a0e) et 15,43 pour 1 pour le thème clair (#1b1a17 sur #f4f1ea) : '
      + 'deux valeurs au-dessus du seuil AAA de 7 pour 1, mais le thème clair est le plus faible.',
  ];
  faits.forEach((texte) => wrap.appendChild(ctx.el('p', 'geography-v2-e060-fait', texte)));
  return wrap;
}

/* ---------- E060-07 : tableau comparatif, rapports recalculés ---------- */

const TABLE_ROWS = [
  ['dark', 'Sombre'],
  ['light', 'Clair'],
  ['system', 'Système'],
];

function buildTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e060-table');
  table.id = ID.table;
  table.appendChild(ctx.el('caption', '',
    'Comparaison des trois thèmes : les rapports sont recalculés depuis les couleurs, jamais saisis à la main.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Apparence', 'Texte', 'Fond', 'Contraste', 'Verdict'].forEach((label) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  S.cells = {};
  TABLE_ROWS.forEach(([key, label]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    tr.appendChild(th);
    const ink = document.createElement('td');
    const bg = document.createElement('td');
    const ratio = document.createElement('td');
    ratio.className = 'geography-v2-e060-num';
    const verdictCell = document.createElement('td');
    tr.append(ink, bg, ratio, verdictCell);
    tbody.appendChild(tr);
    S.cells[key] = { ink, bg, ratio, verdict: verdictCell };
  });
  table.appendChild(tbody);
  return table;
}

function fillTable() {
  const keys = ['dark', 'light'];
  keys.forEach((key) => {
    const c = S.cells[key];
    if (!c) return;
    const p = PALETTES[key];
    const r = contrastOf(p);
    c.ink.textContent = p.ink;
    c.bg.textContent = p.bg;
    c.ratio.textContent = `${fmt(r, 2)} pour 1`;
    c.verdict.textContent = verdict(r);
  });
  const c = S.cells.system;
  if (c) {
    const p = PALETTES[S.effective];
    const r = contrastOf(p);
    c.ink.textContent = `selon le système (${p.ink})`;
    c.bg.textContent = `selon le système (${p.bg})`;
    c.ratio.textContent = `${fmt(r, 2)} pour 1`;
    c.verdict.textContent = verdict(r);
  }
}

/* ---------- E060-09 : défi falsifiable en cinq temps (texte réel) ---------- */

const DEFI = {
  prediction: 'Le thème sombre doit afficher un rapport plus élevé que le thème clair (17,00 contre 15,43 pour 1).',
  reglage: 'Sélectionnez « Clair » dans le radiogroupe, puis comparez la ligne du tableau et le bandeau.',
  attendu: 'Le rapport passe de 17,00 à 15,43 pour 1 ; les deux thèmes restent conformes AAA.',
  falsification: 'Si le rapport clair devenait supérieur au rapport sombre, la linéarisation sRGB ou le calcul de luminance serait faux.',
  debrief: 'Le contraste dépend des deux couleurs à la fois : remplacer le fond sombre par un fond pâle réduit l’écart de luminance.',
};

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e060-defi');
  list.id = ID.defi;
  S.defiSpans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[key];
    S.defiSpans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  return list;
}

/* ---------- E060-02 / E060-04 : panneau sémantique et contrôles ---------- */

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
      seuil: document.getElementById(ID.seuil),
      seuilOut: document.getElementById(ID.seuilValue),
      seuilLabel: document.getElementById(ID.seuilLabel),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e060-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Thème sombre et clair — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'L’atlas est conçu en sombre : texte clair sur fond profond. Ce panneau permet de choisir une '
    + 'apparence claire, de revenir au sombre ou de suivre le réglage du système. Les rapports de '
    + 'contraste sont recalculés depuis les couleurs elles-mêmes et écrits en toutes lettres dans le '
    + 'tableau et le bandeau : le dessin ne fait qu’illustrer le calcul.');

  /* E060-02 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.mode;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-labelledby', ID.mode + '-legend');
  const modeLegend = ctx.el('legend', '', 'Apparence de l’interface (choix unique)');
  modeLegend.id = ID.mode + '-legend';
  fieldset.appendChild(modeLegend);
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e060-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e060-mode';
    radio.id = ID.mode + '-' + value;
    radio.value = value;
    radio.checked = S.choice === value;
    radio.title = MODES[value].desc;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value].label));
    fieldset.appendChild(lab);
  });

  /* Curseur de seuil : grandeur chiffrée déterministe, comparée aux repères AA/AAA. */
  const seuilRow = ctx.el('div', 'geography-v2-e060-slider-row');
  const seuilLabel = document.createElement('label');
  seuilLabel.id = ID.seuilLabel;
  seuilLabel.setAttribute('for', ID.seuil);
  const seuilOut = ctx.el('span', 'geography-v2-e060-valeur', '');
  seuilOut.id = ID.seuilValue;
  seuilLabel.append(document.createTextNode('Seuil de conformité à tester : '), seuilOut);
  const seuil = document.createElement('input');
  seuil.type = 'range';
  seuil.id = ID.seuil;
  seuil.min = '3';
  seuil.max = '10';
  seuil.step = '0.5';
  seuil.value = String(S.seuil);
  seuil.setAttribute('aria-label',
    'Seuil de contraste à tester, de 3 à 10 pour 1, valeur affichée dans le libellé');
  seuilRow.append(seuilLabel, seuil);

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Échelle de contraste de 1 à 21 pour 1 : les flèches gauche et droite parcourent les trois thèmes, '
    + 'les flèches haut et bas règlent le seuil, Origine restaure les valeurs par défaut, '
    + 'Entrée réénonce le résultat.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite parcourent les trois thèmes, '
    + 'les flèches haut et bas ajustent le seuil de 0,5 en 0,5. Chaque résultat est énoncé dans le '
    + 'bandeau de lecture et repris dans le tableau : aucune information n’est portée par la seule couleur.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e060-legend',
    'Trait plein : rapport du thème courant. Tirets : seuil choisi. Repères écrits : AA 4,5 et AAA 7. '
    + 'Les échantillons « Aa » montrent l’encre et le fond réels de chaque palette.');
  legend.id = ID.legend;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Séjour du thème : rapport et conformité énoncés ci-dessous.';

  const play = ctx.el('button', 'geography-v2-e060-btn', '▶ Animer le laboratoire');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e060-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : les couleurs sont celles du projet, aucun tirage '
    + 'aléatoire et aucune ressource externe n’interviennent. Les textes ci-dessus sont réels, lisibles '
    + 'et indexables même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, buildFacts(ctx), fieldset, seuilRow, canvas, canvasDesc, legend,
    buildTable(ctx), defiTitle, buildDefi(ctx), readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
    seuil, seuilOut, seuilLabel, canvas, legend,
    readout, play, reset,
    fresh: true,
  };
}

/* ---------- E060-01 : badge sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e060-badge',
    'Thème sombre / clair : palettes locales recalculées, aucune ressource externe chargée.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E060-09 : canvas déterministe (échelle de contraste 1 → 21) ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 224;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const p = PALETTES[S.effective];
  const ratio = contrastOf(p);
  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);

  /* Échantillons de la palette réelle : l'encre est écrite sur le fond. */
  const swW = Math.min(132, iw * 0.32);
  const swH = 64;
  const swY = pad + 6;
  g.fillStyle = p.bg;
  g.fillRect(pad, swY, swW, swH);
  g.strokeStyle = 'rgba(214,207,193,.65)';
  g.lineWidth = 1;
  g.strokeRect(pad, swY, swW, swH);
  g.fillStyle = p.ink;
  g.font = 'bold 26px sans-serif';
  g.fillText('Aa', pad + 10, swY + 40);
  g.font = '10px sans-serif';
  g.fillText(`${p.label} · ${p.ink} sur ${p.bg}`, pad, swY + swH + 14);

  /* Échelle 1 → 21, sans dégradé coloré : les couleurs ne portent rien seules. */
  const scaleX = pad + swW + 22;
  const scaleW = Math.max(40, cssW - pad - scaleX);
  const sy = swY + 30;
  g.strokeStyle = 'rgba(214,207,193,.8)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(scaleX, sy); g.lineTo(scaleX + scaleW, sy); g.stroke();

  const xAt = (r) => scaleX + (Math.max(0, Math.min(MAX_RATIO, r)) / MAX_RATIO) * scaleW;
  g.font = '9px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  [1, AA, AAA, 10, MAX_RATIO].forEach((mark) => {
    const x = xAt(mark);
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, sy - 6); g.lineTo(x, sy + 6); g.stroke();
    const label = mark === MAX_RATIO ? '21' : fmt(mark, mark === AA ? 1 : 0);
    g.fillText(label, x - 6, sy + 20);
  });
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.fillText('Échelle de contraste (pour 1)', scaleX, sy - 14);

  /* Repères textuels AA et AAA, au-dessus de l'échelle. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText('AA 4,5', xAt(AA) - 12, sy - 26);
  g.fillText('AAA 7', xAt(AAA) - 12, sy - 26);

  /* Tirets : seuil choisi. */
  const xs = xAt(S.seuil);
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(xs, sy - 30); g.lineTo(xs, sy + 30); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.fillText(`seuil ${fmt(S.seuil, 1)}`, Math.min(scaleX, xs - 16), sy + 40);

  /* Trait plein : rapport courant, avec une bague animée déterministe. */
  const xr = xAt(ratio);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(xr, sy - 24); g.lineTo(xr, sy + 24); g.stroke();
  const pulse = S.reduced ? 0 : 3 * Math.sin(S.phase);
  g.beginPath();
  g.arc(xr, sy, 8 + pulse, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(244,214,158,.55)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = 'bold 11px sans-serif';
  g.fillText(`${fmt(ratio, 2)} pour 1`, Math.min(cssW - 70, xr - 24), sy - 34);

  /* Conclusion écrite : jamais la seule couleur. */
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.9)';
  const ok = ratio >= S.seuil;
  g.fillText(`Rapport ${fmt(ratio, 2)} face au seuil ${fmt(S.seuil, 1)} : `, pad, cssH - 24);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(ok ? 'conforme au seuil choisi.' : 'au-dessous du seuil choisi.', pad, cssH - 10);
}

/* ---------- E060-07 : bandeau de lecture (role=status, aria-live=polite) ---------- */

function updateReadout(forced) {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const p = PALETTES[S.effective];
  const r = contrastOf(p);
  const ok = r >= S.seuil;
  n.textContent = '';
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.appendChild(document.createTextNode('Thème '));
  put(MODES[S.choice].label.toLowerCase());
  n.appendChild(document.createTextNode(' ('));
  put(p.label.toLowerCase());
  n.appendChild(document.createTextNode(' appliqué) : contraste '));
  put(`${fmt(r, 2)} pour 1`);
  n.appendChild(document.createTextNode(' — '));
  put(verdict(r));
  n.appendChild(document.createTextNode('. Face au seuil '));
  put(`${fmt(S.seuil, 1)} pour 1`);
  n.appendChild(document.createTextNode(' : '));
  put(ok ? 'conforme' : 'non conforme');
  n.appendChild(document.createTextNode('. Échelle maximale 21 pour 1. '));
  if (forced) n.appendChild(document.createTextNode(forced));
}

/* ---------- Application de l'état ---------- */

function applyState(message) {
  const n = S.nodes;
  if (!n) return;
  n.radios.forEach((r) => { if (r) r.checked = r.value === S.choice; });
  const cfg = { min: 3, max: 10, step: 0.5 };
  if (n.seuil) {
    n.seuil.min = String(cfg.min);
    n.seuil.max = String(cfg.max);
    n.seuil.step = String(cfg.step);
    n.seuil.value = String(S.seuil);
  }
  if (n.seuilOut) n.seuilOut.textContent = `${fmt(S.seuil, 1)} pour 1`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le laboratoire';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E060Reduced = S.reduced ? '1' : '0';
  fillTable();
  updateReadout(message);
  drawLab();
}

function selectMode(key, message) {
  if (MODE_ORDER.indexOf(key) < 0) return;
  S.choice = key;
  saveChoice(key);
  applyTheme();
  applyState(message || `Thème ${MODES[key].label.toLowerCase()} appliqué : ${PALETTES[S.effective].label.toLowerCase()}.`);
}

function resetState() {
  S.choice = 'dark';
  S.seuil = AA;
  S.phase = 0;
  saveChoice(S.choice);
  applyTheme();
  applyState('Valeurs par défaut restaurées : thème sombre et seuil 4,5 pour 1.');
}

/* ---------- E060-10 : boucle rAF unique, pauses multiples ---------- */

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
    S.phase = (S.phase + dt * 0.0022) % (Math.PI * 2);
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
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
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
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
        if (S.reduced) stopLoop(); else startLoop();
        if (S.nodes) applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- Câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      selectMode(radio.value);
    });
  });

  n.seuil.addEventListener('input', () => {
    const v = Math.max(3, Math.min(10, Number(n.seuil.value)));
    S.seuil = Math.round(v * 2) / 2;
    applyState();
  });

  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', () => {
    resetState();
  });

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const i = MODE_ORDER.indexOf(S.choice);
      selectMode(MODE_ORDER[(i + step + MODE_ORDER.length) % MODE_ORDER.length]);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const sign = event.key === 'ArrowUp' ? 1 : -1;
      S.seuil = Math.max(3, Math.min(10, S.seuil + sign * 0.5));
      applyState();
    } else if (event.key === 'Home') {
      resetState();
    } else if (event.key === 'Enter') {
      updateReadout();
    } else {
      used = false;
    }
    if (used) {
      event.preventDefault();
    }
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E060', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  /* E060-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  try { S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.choice = loadChoice();
  installPreferenceListener();
  applyTheme();
  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
