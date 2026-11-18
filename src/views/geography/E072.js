import { register } from './registry.js';

/* Lentille E072 — vue GEOGRAPHIE.
 * Thème : messages d'erreur et repli accessible.
 *
 * Les dix chantiers E072-01 … E072-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E072.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset, légendes, régions live) présent dans le DOM
 * même sans animation ; le canvas n'est qu'un laboratoire qui illustre une
 * chronologie déterministe.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e072';
const PANEL_ID = 'geography-e072-panel';
const TITLE_ID = 'geography-e072-title';
const FIELD_ID = 'geography-e072-scenarios';
const SCENARIO_IDS = {
  succes: 'geography-e072-sc-succes',
  reseau: 'geography-e072-sc-reseau',
  donnees: 'geography-e072-sc-donnees',
  vide: 'geography-e072-sc-vide',
};
const FORCE_ID = 'geography-e072-force';
const DELAY_ID = 'geography-e072-delay';
const DELAY_OUT_ID = 'geography-e072-delay-value';
const LAUNCH_ID = 'geography-e072-launch';
const ALERT_ID = 'geography-e072-alert';
const NOTICE_ID = 'geography-e072-notice';
const FALLBACK_ID = 'geography-e072-fallback';
const CANVAS_ID = 'geography-e072-canvas';
const LEGEND_ID = 'geography-e072-legend';
const READOUT_ID = 'geography-e072-readout';
const TABLE_ID = 'geography-e072-table';
const BADGE_ID = 'geography-e072-badge';

/* Constantes canoniques : aucun chiffre n'est inventé, toutes les grandeurs
   du laboratoire sont recalculées depuis ces définitions. */
const DELAI_MIN = 1;            /* s, borne basse du délai de repli */
const DELAI_MAX = 5;            /* s, borne haute du délai de repli */
const DELAI_REF = 3;            /* s, délai de référence (comparaison) */

/* Quatre scénarios déterministes. code est un code HTTP de référence, role
   désigne la région live qui annonce le résultat (alert = assertif pour les
   erreurs, status = poli pour les états neutres). */
const LISTE_SCENARIOS = [
  {
    key: 'succes', code: 200, role: 'status', besoinRepli: false,
    titre: 'Chargement réussi',
    message: 'Les lieux du périmètre sont disponibles et vérifiés.',
    repli: '',
    forme: 'croix',
  },
  {
    key: 'reseau', code: 503, role: 'alert', besoinRepli: true,
    titre: 'Service injoignable',
    message: 'Impossible de contacter le service de données de la carte.',
    repli: 'Repli : affichage des dernières données mises en cache pour le pays sélectionné.',
    forme: 'triangle',
  },
  {
    key: 'donnees', code: 422, role: 'alert', besoinRepli: true,
    titre: 'Données inexploitables',
    message: 'La réponse reçue ne peut pas être interprétée.',
    repli: 'Repli : masquage des lieux non vérifiés et message « Aucun lieu vérifiable ».',
    forme: 'triangle',
  },
  {
    key: 'vide', code: 204, role: 'status', besoinRepli: true,
    titre: 'Aucun lieu',
    message: 'Aucun lieu ne correspond au périmètre demandé.',
    repli: 'Repli : invitation à élargir la recherche et à choisir un autre pays.',
    forme: 'carre',
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
  visibilityBound: false,
  motionBound: false,
  nodes: {},
  scope: null,
};

/* ---------- Formules déterministes et formatage français ---------- */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};
const scenario = () => parScenario(S.scenario);

/* Temps écoulé ajouté à la progression : avancement = dt / (délai × 1000). */
const avancement = (dt) => clamp(dt / (S.delai * 1000), 0, 1);

/* Délai restant avant le repli, en secondes, calculé depuis la progression. */
const restant = () => S.delai * (1 - S.progression);

/* Le repli est actif dès qu'une tentative aboutie le demande, ou dès que
   l'utilisateur force le repli (bascule indépendante). */
const doitAfficherRepli = () => S.tentatives > 0 && (scenario().besoinRepli || S.forceRepli);

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e072-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e072-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e072-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e072-panel p{margin:5px 0;max-width:68ch}
#geography-e072-panel .geography-e072-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e072-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e072-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e072-table th,#geography-e072-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e072-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e072-scenarios{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e072-scenarios legend{padding:0 4px;color:var(--muted)}
#geography-e072-panel .geography-e072-choix{
  display:flex;align-items:center;gap:6px;min-height:36px;margin:2px 0;cursor:pointer;
}
#geography-e072-panel .geography-e072-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e072-delay{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e072-delay-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e072-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e072-legend{font-size:10px;color:var(--muted)}
.geography-e072-live{
  min-height:34px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e072-alert{border-left:3px solid var(--gold,#e6b96f);background:rgba(230,185,111,.07)}
#geography-e072-alert:empty::before{content:'Aucune erreur en cours.';color:var(--muted)}
#geography-e072-notice{background:rgba(255,255,255,.03)}
#geography-e072-notice:empty::before{content:'Aucune annonce récente.';color:var(--muted)}
#geography-e072-fallback{border-style:dashed;background:rgba(0,0,0,.18)}
.geography-e072-live strong{color:var(--gold-bright,#f4d69e)}
#geography-e072-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e072-panel button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14);
}
#geography-e072-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e072-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e072-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e072-panel[data-geography-e072-reduced="1"] button,
.geography-e072-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e072-panel button,.geography-e072-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e072-panel{font-size:10px;padding:9px}
  #geography-e072-canvas{height:200px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

/* E072-01 — texte sémantique d'introduction, lisible sans animation. */
function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un message d’erreur n’est pas un décor : c’est une information. Dans la vue GEOGRAPHIE, un état vide explicite (.geo-empty, role="status") remplace une carte muette, et la recherche sans résultat affiche un message .c3b-empty. Le message dit ce qui s’est passé, pourquoi et quoi faire ensuite.',
    'Le rôle ARIA commande l’urgence de l’annonce. role="alert" est assertif : il interrompt la lecture pour une vraie erreur. role="status" avec aria-live="polite" attend une pause : il convient à un chargement, à un succès ou à un état vide. Une même information n’est jamais portée par la seule couleur : un libellé et une forme l’accompagnent.',
    'Un repli accessible est un chemin de sortie, pas un silence. Quand le service de données échoue (code 503) ou que la réponse est inexploitable (code 422), l’interface doit afficher un dernier état connu ou une consigne claire. Le délai de repli est une grandeur mesurable : ce laboratoire le fait varier de 1 à 5 secondes autour d’une référence de 3 secondes.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e072-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* E072-02 — tableau de référence des états, codes et rôles live. */
function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Les quatre états du laboratoire, leur code de référence, leur région live et leur repli.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['État', 'Code', 'Rôle live', 'Repli prévu'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
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
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const nodes = { panel: existant, fresh: false };
    nodes.force = document.getElementById(FORCE_ID);
    nodes.delay = document.getElementById(DELAY_ID);
    nodes.delayOut = document.getElementById(DELAY_OUT_ID);
    nodes.launch = document.getElementById(LAUNCH_ID);
    nodes.alert = document.getElementById(ALERT_ID);
    nodes.notice = document.getElementById(NOTICE_ID);
    nodes.fallback = document.getElementById(FALLBACK_ID);
    nodes.canvas = document.getElementById(CANVAS_ID);
    nodes.readout = document.getElementById(READOUT_ID);
    nodes.scenarios = {};
    Object.keys(SCENARIO_IDS).forEach((k) => {
      nodes.scenarios[k] = document.getElementById(SCENARIO_IDS[k]);
    });
    return nodes;
  }

  const panel = ctx.el('section', 'geography-e072-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Messages d’erreur et repli accessible');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une erreur se annonce, un repli se explique. Ce laboratoire simulate quatre états de chargement sur la carte locale et montre comment le rôle live, le message texte et le délai de repli coopèrent, sans jamais confier l’information à la seule couleur.');

  /* E072-03 — scénarios en groupe radio natif (choix unique). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = FIELD_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Scénario de chargement (choix unique)';
  fieldset.appendChild(legend);
  const libelles = {
    succes: 'Succès — données disponibles (code 200)',
    reseau: 'Erreur réseau — service injoignable (code 503)',
    donnees: 'Données invalides — réponse inexploitable (code 422)',
    vide: 'État vide — aucun lieu (code 204)',
  };
  LISTE_SCENARIOS.forEach((sc) => {
    const lab = ctx.el('label', 'geography-e072-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e072-scenario';
    radio.id = SCENARIO_IDS[sc.key];
    radio.value = sc.key;
    radio.checked = S.scenario === sc.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelles[sc.key]));
    fieldset.appendChild(lab);
  });

  /* E072-06 — bascule indépendante, seul contrôle à aria-pressed. */
  const forceBtn = ctx.el('button', '', 'Forcer le repli (bascule indépendante)');
  forceBtn.type = 'button';
  forceBtn.id = FORCE_ID;
  forceBtn.setAttribute('aria-pressed', S.forceRepli ? 'true' : 'false');

  const note = ctx.el('p', '', 'Le scénario est un choix unique (groupe de cases radio natives) ; « Forcer le repli » est une bascule indépendante. L’erreur est annoncée dans une région role="alert" assertive, les états neutres dans une région role="status" polie : deux rôles, deux usages distincts.');

  const delayP = ctx.el('p', '');
  const delayLabel = document.createElement('label');
  delayLabel.setAttribute('for', DELAY_ID);
  delayLabel.appendChild(document.createTextNode('Délai avant repli : '));
  const delayOut = document.createElement('span');
  delayOut.id = DELAY_OUT_ID;
  delayLabel.appendChild(delayOut);
  delayP.appendChild(delayLabel);

  const delay = document.createElement('input');
  delay.type = 'range';
  delay.id = DELAY_ID;
  delay.min = String(DELAI_MIN);
  delay.max = String(DELAI_MAX);
  delay.step = '1';
  delay.value = String(S.delai);
  delay.setAttribute('aria-label', 'Délai avant repli, de 1 à 5 secondes, référence 3 secondes');

  const sub = ctx.el('h3', '', 'Ce que mesure le laboratoire');
  const formule = ctx.el('p', '', 'La tentative couvre le délai choisi : progression = temps écoulé ÷ (délai × 1000), reste = délai × (1 − progression). Le délai de référence est 3 s. Le code de référence est 200 pour un succès, 503 pour une panne réseau, 422 pour des données inexploitables et 204 pour un état vide.');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Chronologie d’une tentative de chargement jusqu’au repli. Flèches gauche et droite : régler le délai d’une seconde. Entrée ou barre d’espace : relancer la tentative. Les grandeurs chiffrées sont données en toutes lettres dans le paragraphe d’état.');

  const legendText = ctx.el('p', 'geography-e072-legend', 'Croix : succès · triangle : erreur · carré : état vide · trait plein : temps écoulé · hachures : zone de repli · losange : pointeur de progression. La forme et le libellé accompagnent toujours la teinte : aucune information n’est portée par la seule couleur.');
  legendText.id = LEGEND_ID;

  /* E072-04 — annonce assertive réservée aux vraies erreurs. */
  const alertBox = ctx.el('p', 'geography-e072-live');
  alertBox.id = ALERT_ID;
  alertBox.setAttribute('role', 'alert');
  alertBox.setAttribute('aria-live', 'assertive');

  /* E072-05 — annonces polies et texte de repli explicite. */
  const notice = ctx.el('p', 'geography-e072-live');
  notice.id = NOTICE_ID;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');

  const fallback = ctx.el('p', 'geography-e072-live');
  fallback.id = FALLBACK_ID;
  fallback.setAttribute('role', 'status');
  fallback.setAttribute('aria-live', 'polite');

  const readout = ctx.el('p', 'geography-e072-live');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const launch = ctx.el('button', '', '▶ Relancer la tentative');
  launch.type = 'button';
  launch.id = LAUNCH_ID;

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, forceBtn, note,
    delayP, delay, sub, formule, canvas, legendText, alertBox, notice, fallback,
    readout, launch);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  const nodes = { panel, fresh: true };
  nodes.force = forceBtn;
  nodes.delay = delay;
  nodes.delayOut = delayOut;
  nodes.launch = launch;
  nodes.alert = alertBox;
  nodes.notice = notice;
  nodes.fallback = fallback;
  nodes.canvas = canvas;
  nodes.readout = readout;
  nodes.scenarios = {};
  LISTE_SCENARIOS.forEach((sc) => {
    nodes.scenarios[sc.key] = document.getElementById(SCENARIO_IDS[sc.key]);
  });
  return nodes;
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule passe) ---------- */

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

/* E072-10 — chronologie non chromatique, un seul canvas, DPR plafonné. */
function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
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

  const sc = scenario();
  const x0 = 20;
  const x1 = cssW - 20;
  const largeur = x1 - x0;
  const yBarre = cssH * 0.58;

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Chronologie de la tentative — ' + sc.titre, x0, 22);

  /* Zone de repli en fin de barre : hachures, jamais une couleur seule. */
  const zoneX = x1 - 46;
  g.save();
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fillRect(zoneX, yBarre - 16, 46, 32);
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
  const ecoule = S.delai * S.progression;
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText('écoulé ' + fmt(ecoule, 2) + ' s · reste ' + fmt(restant(), 2) + ' s', x0, cssH - 32);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText('repli ' + (S.repliActif ? 'ACTIF' : 'inactif') + ' · tentative ' + S.tentatives, x0, cssH - 16);
}

/* ---------- Messages live, repli et grandeurs chiffrées ---------- */

function appliquerMessages() {
  const n = S.nodes;
  if (!n.alert || !n.notice || !n.fallback) return;
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
    n.notice.textContent = 'Choisissez un scénario puis lancez une tentative pour entendre l’annonce et voir le repli. Le tableau ci-dessus donne les valeurs de référence.';
    n.fallback.textContent = 'Repli de référence : afficher le dernier état connu ou une consigne claire, jamais une carte silencieuse.';
    return;
  }

  const sc = scenario();
  const fil = document.createElement('strong');
  fil.textContent = sc.titre + ' (code ' + sc.code + ') — ';
  const cible = sc.role === 'alert' ? n.alert : n.notice;
  cible.appendChild(fil);
  cible.appendChild(document.createTextNode(sc.message));

  if (S.forceRepli && !sc.besoinRepli) {
    n.fallback.textContent = 'Repli forcé : ' + (sc.repli || 'affichage du dernier état connu, bien que les données soient disponibles.');
  } else if (S.repliActif) {
    n.fallback.textContent = sc.repli;
  } else {
    n.fallback.textContent = 'Aucun repli nécessaire : les données sont disponibles et vérifiées.';
  }
}

/* E072-09 — grandeurs chiffrées, dont une comparée à une référence. */
function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const sc = scenario();
  const pct = Math.round(S.progression * 100);
  const ratio = fmt(S.delai / DELAI_REF, 2);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Code '));
  n.appendChild(fort(String(sc.code)));
  n.appendChild(document.createTextNode(' · délai '));
  n.appendChild(fort(fmt(S.delai, 0) + ' s'));
  n.appendChild(document.createTextNode(' (référence ' + fmt(DELAI_REF, 0) + ' s, soit '));
  n.appendChild(fort(ratio + ' ×'));
  n.appendChild(document.createTextNode(') · progression '));
  n.appendChild(fort(fmt(pct, 0) + ' %'));
  n.appendChild(document.createTextNode(' · reste ' + fmt(restant(), 2) + ' s · annonce '));
  n.appendChild(fort(sc.role === 'alert' ? 'assertive (alert)' : 'polie (status)'));
  n.appendChild(document.createTextNode(' · repli '));
  n.appendChild(fort(S.repliActif ? 'actif' : 'inactif'));
  n.appendChild(document.createTextNode('. Bascule repli forcé : ' + (S.forceRepli ? 'activée' : 'désactivée') + '.'));
  S.lastPct = pct;
}

function syncControls() {
  const n = S.nodes;
  if (n.delay) n.delay.value = String(S.delai);
  if (n.delayOut) n.delayOut.textContent = fmt(S.delai, 0) + ' s / référence ' + fmt(DELAI_REF, 0) + ' s';
  Object.keys(n.scenarios || {}).forEach((k) => {
    if (n.scenarios[k]) n.scenarios[k].checked = k === S.scenario;
  });
  if (n.force) n.force.setAttribute('aria-pressed', S.forceRepli ? 'true' : 'false');
  if (n.panel) n.panel.dataset.geographyE072Reduced = S.reduced ? '1' : '0';
  appliquerMessages();
  updateReadout();
  drawLab();
  updateBadge();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

/* Une tentative se termine : l'annonce et le repli sont figés, la boucle
   s'arrête. Le resultat reste lisible sans aucune animation. */
function terminerTentative() {
  S.progression = 1;
  S.tentativeEnCours = false;
  stopLoop();
  syncControls();
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || !S.tentativeEnCours) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* E072-07 — unique horloge rAF, avancement déterministe, une image par tick. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.lastTs && S.tentativeEnCours && !S.reduced) {
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
  if (Math.round(S.progression * 100) !== S.lastPct) updateReadout();
  if (S.tentativeEnCours && !S.reduced) S.rafId = requestAnimationFrame(tick);
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
    syncControls();
    return;
  }
  S.tentativeEnCours = true;
  syncControls();
  startLoop();
}

/* E072-08 — pause sur document.hidden, reprise et mouvement réduit. */
function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.tentativeEnCours && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      S.reduced = mq.matches;
      const onChange = () => {
        S.reduced = mq.matches;
        if (mq.matches) {
          S.tentativeEnCours = false;
          stopLoop();
          if (S.tentatives > 0) S.progression = 1;
        }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge textuel sur la carte existante ---------- */

function updateBadge() {
  let badge = document.getElementById(BADGE_ID);
  if (!badge) {
    const scope = S.scope || document;
    const map = scope && typeof scope.querySelector === 'function'
      ? (scope.querySelector('.geo-map') || null) : null;
    if (!map) return;
    badge = document.createElement('div');
    badge.className = 'geography-e072-badge';
    badge.id = BADGE_ID;
    map.appendChild(badge);
  }
  const sc = scenario();
  badge.textContent = S.tentativeEnCours
    ? 'Tentative en cours — code de référence ' + sc.code + ' : annonce et repli à l’échéance du délai.'
    : (S.tentatives === 0
      ? 'Repli accessible : un message d’erreur annonce l’état, un rôle live le diffuse, un repli texte le remplace. Choisissez un scénario et lancez la tentative.'
      : (S.repliActif
        ? 'Repli ' + (S.forceRepli ? 'forcé' : 'actif') + ' — code ' + sc.code + ' : ' + sc.repli
        : 'Aucun repli — code ' + sc.code + ' : ' + sc.message));
}

/* ---------- Point d'entrée ---------- */

register('E072', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.scope = ctx.layout || ctx.stage;
  S.nodes = ensurePanel(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) {
    S.tentativeEnCours = false;
    stopLoop();
  }

  syncControls();

  {
    Object.keys(S.nodes.scenarios || {}).forEach((k) => {
      const radio = S.nodes.scenarios[k];
      if (!radio || radio.dataset.geographyE072Bound === '1') return;
      radio.dataset.geographyE072Bound = '1';
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.scenario = k;
        S.progression = 0;
        S.tentativeEnCours = false;
        stopLoop();
        syncControls();
      });
    });
    const force = S.nodes.force;
    if (force && force.dataset.geographyE072Bound !== '1') {
      force.dataset.geographyE072Bound = '1';
      force.addEventListener('click', () => {
        S.forceRepli = !S.forceRepli;
        syncControls();
      });
    }
    const delay = S.nodes.delay;
    if (delay && delay.dataset.geographyE072Bound !== '1') {
      delay.dataset.geographyE072Bound = '1';
      delay.addEventListener('input', () => {
        S.delai = clamp(Math.round(Number(S.nodes.delay.value)), DELAI_MIN, DELAI_MAX);
        syncControls();
      });
    }
    const launch = S.nodes.launch;
    if (launch && launch.dataset.geographyE072Bound !== '1') {
      launch.dataset.geographyE072Bound = '1';
      launch.addEventListener('click', relancer);
    }
    const canvas = S.nodes.canvas;
    if (canvas && canvas.dataset.geographyE072Bound !== '1') {
      canvas.dataset.geographyE072Bound = '1';
      canvas.addEventListener('keydown', (event) => {
        let used = true;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const step = event.key === 'ArrowRight' ? 1 : -1;
          S.delai = clamp(S.delai + step, DELAI_MIN, DELAI_MAX);
          syncControls();
        } else if (event.key === 'Enter' || event.key === ' ') {
          relancer();
        } else {
          used = false;
        }
        if (used) event.preventDefault();
      });
    }
  }

  installGlobalListeners();
  if (S.tentativeEnCours && !S.reduced) startLoop();
});
